import os
import re
import uuid

_engine = None


DATE_RE = re.compile(r"(\d{4}-\d{2}-\d{2}|\d{2}[/-]\d{2}[/-]\d{4})")
AMOUNT_RE = re.compile(r"[-+]?\d{1,3}(?:,\d{3})*(?:\.\d{2})")
INV_RE = re.compile(r"(?:invoice\s*(?:no|number|#)?\s*[:\-]?\s*)([A-Za-z0-9\-_/]+)", re.IGNORECASE)
TOTAL_RE = re.compile(r"(?:total\s*(?:amount)?\s*[:\-]?\s*)([-+]?\d{1,3}(?:,\d{3})*(?:\.\d{2}))", re.IGNORECASE)
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
    try:
        return float(token.replace(",", ""))
    except Exception:
        return None


def extract_text(file_path: str) -> tuple[str, float]:
    ext = os.path.splitext(file_path)[1].lower()
    if ext == ".pdf":
        # TODO: add page rasterization for true PDF OCR parity.
        return (f"PDF uploaded: {os.path.basename(file_path)}", 0.4)

    try:
        engine = _get_engine()
        result, _ = engine(file_path)
    except Exception:
        return (f"OCR fallback: {os.path.basename(file_path)}", 0.2)

    if not result:
        return ("", 0.0)
    text = "\n".join([line[1] for line in result])
    conf = sum(line[2] for line in result) / len(result)
    return text, float(conf)


def parse_bank_transactions(text: str) -> list[dict]:
    lines = [l.strip() for l in text.splitlines() if l.strip()]
    txs: list[dict] = []

    for line in lines:
        date_match = DATE_RE.search(line)
        amount_tokens = AMOUNT_RE.findall(line)
        amount = _to_amount(amount_tokens[-1]) if amount_tokens else None
        if date_match or amount is not None:
            txs.append(
                {
                    "id": str(uuid.uuid4()),
                    "date": date_match.group(1) if date_match else None,
                    "description": line[:255],
                    "reference": None,
                    "amount": abs(amount) if amount is not None else None,
                    "type": "debit" if (amount is None or amount >= 0) else "credit",
                    "extractionConfidence": 0.6,
                }
            )

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

    vendor = None
    if lines:
        vendor = lines[0][:120]

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
