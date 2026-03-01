import os
import re
import uuid
from typing import Any

import numpy as np
import pypdfium2 as pdfium

DATE_RE   = re.compile(r"(\d{4}-\d{2}-\d{2}|\d{2}[/-]\d{2}[/-]\d{4})")
AMOUNT_RE = re.compile(r"\(?[-+]?\$?\d{1,3}(?:,\d{3})*(?:\.\d{2})\)?")
INV_RE    = re.compile(r"(?:invoice\s*(?:no|number|#)?\s*[:\-]?\s*)([A-Za-z0-9\-_/]+)", re.IGNORECASE)
TOTAL_RE  = re.compile(r"(?:total\s*(?:amount)?\s*[:\-]?\s*)(\(?[-+]?\$?\d{1,3}(?:,\d{3})*(?:\.\d{2})\)?)", re.IGNORECASE)
DUE_RE    = re.compile(r"(?:due\s*date\s*[:\-]?\s*)(\d{4}-\d{2}-\d{2}|\d{2}[/-]\d{2}[/-]\d{4})", re.IGNORECASE)
INV_DATE_RE = re.compile(r"(?:invoice\s*date\s*[:\-]?\s*)(\d{4}-\d{2}-\d{2}|\d{2}[/-]\d{2}[/-]\d{4})", re.IGNORECASE)

_engine = None


def _get_engine():
    global _engine
    if _engine is None:
        from rapidocr_onnxruntime import RapidOCR
        _engine = RapidOCR()
    return _engine


def _pdf_to_images(file_path: str, scale: float = 2.0) -> list[np.ndarray]:
    """Render each PDF page to an RGB numpy array via pypdfium2."""
    doc = pdfium.PdfDocument(file_path)
    images = []
    for page in doc:
        bitmap = page.render(scale=scale, rotation=0)
        pil_img = bitmap.to_pil()
        images.append(np.array(pil_img.convert("RGB")))
        page.close()
    doc.close()
    return images


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


def extract_text(file_path: str) -> tuple[str, float]:
    """
    Convert each PDF page to an image then run RapidOCR.
    Returns (full_text, avg_confidence) with real per-line confidence scores.
    """
    ext = os.path.splitext(file_path)[1].lower()

    if ext == ".pdf":
        try:
            images = _pdf_to_images(file_path)
        except Exception:
            return f"PDF render failed: {os.path.basename(file_path)}", 0.1

        engine = _get_engine()
        all_lines: list[str] = []
        all_scores: list[float] = []

        for img in images:
            try:
                result, _ = engine(img)
            except Exception:
                continue
            if not result:
                continue
            for line in result:
                all_lines.append(line[1])
                all_scores.append(float(line[2]))

        if not all_lines:
            return "", 0.0

        text = "\n".join(all_lines)
        conf = sum(all_scores) / len(all_scores)
        return text, conf

    # Non-PDF: pass directly to RapidOCR
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
    date_match    = DATE_RE.search(line)
    amount_tokens = AMOUNT_RE.findall(line)
    amount        = _to_amount(amount_tokens[-1]) if amount_tokens else None
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
        # parse-level heuristic — caller blends with OCR confidence
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
        txs = [{
            "id": str(uuid.uuid4()),
            "date": None,
            "description": (text[:120] or "OCR transaction"),
            "reference": None,
            "amount": None,
            "type": "debit",
            "extractionConfidence": 0.4,
        }]

    return txs


def parse_invoice(text: str, filename: str, conf: float) -> dict:
    lines  = [l.strip() for l in text.splitlines() if l.strip()]
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
        "overallConfidence": conf,  # real RapidOCR average
    }
