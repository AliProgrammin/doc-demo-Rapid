import os
import re
import uuid
from typing import Any

from pypdf import PdfReader

_engine = None

DATE_RE = re.compile(r"(\d{4}-\d{2}-\d{2}|\d{2}[/-]\d{2}[/-]\d{4})")
AMOUNT_RE = re.compile(r"\(?[-+]?\$?\d{1,3}(?:,\d{3})*(?:\.\d{2})\)?")
INV_RE = re.compile(r"(?:invoice\s*(?:no|number|#)?\s*[:\-]?\s*)([A-Za-z0-9\-_/]+)", re.IGNORECASE)
TOTAL_RE = re.compile(r"(?:total\s*(?:amount)?\s*[:\-]?\s*)(\(?[-+]?\$?\d{1,3}(?:,\d{3})*(?:\.\d{2})\)?)", re.IGNORECASE)
DUE_RE = re.compile(r"(?:due\s*date\s*[:\-]?\s*)(\d{4}-\d{2}-\d{2}|\d{2}[/-]\d{2}[/-]\d{4})", re.IGNORECASE)
INV_DATE_RE = re.compile(r"(?:invoice\s*date\s*[:\-]?\s*)(\d{4}-\d{2}-\d{2}|\d{2}[/-]\d{2}[/-]\d{4})", re.IGNORECASE)


def _get_engine():
    global _engine
    if _engine is None:
        from rapidocr_onnxruntime import RapidOCR  # lazy import

        _engine = RapidOCR()
    return _engine


def _to_amount(token: str | None) -> float | None:
    if not token:
        return None
    cleaned = token.replace(",", "").replace("$", "").strip()
    neg = cleaned.startswith("(") and cleaned.endswith(")")
    if neg:
        cleaned = cleaned[1:-1]
    try:
        value = float(cleaned)
        return -value if neg else value
    except Exception:
        return None


def _extract_pdf_text(file_path: str) -> tuple[str, float]:
    pages: list[str] = []
    try:
        reader = PdfReader(file_path)
        for page in reader.pages:
            pages.append((page.extract_text() or "").strip())
    except Exception:
        return "", 0.0

    text = "\n".join(p for p in pages if p)
    if text:
        return text, 0.85
    return "", 0.0


def extract_text(file_path: str) -> tuple[str, float]:
    ext = os.path.splitext(file_path)[1].lower()
    if ext == ".pdf":
        pdf_text, pdf_conf = _extract_pdf_text(file_path)
        if pdf_text:
            return pdf_text, pdf_conf

    try:
        engine = _get_engine()
        result, _ = engine(file_path)
    except Exception:
        return f"OCR fallback: {os.path.basename(file_path)}", 0.2

    if not result:
        return "", 0.0
    text = "\n".join([line[1] for line in result])
    conf = sum(line[2] for line in result) / len(result)
    return text, float(conf)


def _parse_tx_row(line: str) -> dict[str, Any] | None:
    date_match = DATE_RE.search(line)
    amount_tokens = AMOUNT_RE.findall(line)
    amount = _to_amount(amount_tokens[-1]) if amount_tokens else None
    if not (date_match or amount is not None):
        return None

    description = line
    if date_match:
        description = description.replace(date_match.group(1), "").strip(" -|")
    if amount_tokens:
        description = description.replace(amount_tokens[-1], "").strip(" -|")

    return {
        "id": str(uuid.uuid4()),
        "date": date_match.group(1) if date_match else None,
        "description": (description or line)[:255],
        "reference": None,
        "amount": abs(amount) if amount is not None else None,
        "type": "credit" if (amount is not None and amount < 0) else "debit",
        "extractionConfidence": 0.7 if (date_match and amount is not None) else 0.55,
    }


def parse_bank_transactions(text: str) -> list[dict]:
    lines = [l.strip() for l in text.splitlines() if l.strip()]
    txs: list[dict] = []

    for line in lines:
        parsed = _parse_tx_row(line)
        if parsed:
            txs.append(parsed)

    if not txs:
        txs = [
            {
                "id": str(uuid.uuid4()),
                "date": None,
                "description": (text[:120] or "OCR transaction"),
                "reference": None,
                "amount": None,
                "type": "debit",
                "extractionConfidence": 0.4,
            }
        ]

    return txs


def parse_invoice(text: str, filename: str, conf: float) -> dict:
    lines = [l.strip() for l in text.splitlines() if l.strip()]
    joined = "\n".join(lines)

    inv_num = None
    m = INV_RE.search(joined)
    if m:
        inv_num = m.group(1)

    total_amount = None
    tm = TOTAL_RE.search(joined)
    if tm:
        total_amount = _to_amount(tm.group(1))
    elif lines:
        amounts = AMOUNT_RE.findall(joined)
        if amounts:
            total_amount = _to_amount(amounts[-1])

    inv_date = None
    due_date = None
    dm = INV_DATE_RE.search(joined)
    if dm:
        inv_date = dm.group(1)
    else:
        d = DATE_RE.search(joined)
        inv_date = d.group(1) if d else None

    dum = DUE_RE.search(joined)
    if dum:
        due_date = dum.group(1)

    vendor = lines[0][:120] if lines else None

    return {
        "id": str(uuid.uuid4()),
        "invoiceNumber": inv_num,
        "vendorName": vendor,
        "invoiceDate": inv_date,
        "dueDate": due_date,
        "totalAmount": total_amount,
        "subtotal": None,
        "tax": None,
        "purchaseOrder": None,
        "originalFilename": filename,
        "fieldConfidences": {},
        "overallConfidence": conf,
    }
