from __future__ import annotations

from datetime import datetime
from difflib import SequenceMatcher

WEIGHTS = {
    "amount": 0.45,
    "date": 0.2,
    "reference": 0.25,
    "ai": 0.1,
}


def _to_date(value: str | None) -> datetime | None:
    if not value:
        return None
    value = value.strip()
    fmts = ["%Y-%m-%d", "%d/%m/%Y", "%d-%m-%Y", "%m/%d/%Y", "%m-%d-%Y"]
    for fmt in fmts:
        try:
            return datetime.strptime(value[:10], fmt)
        except Exception:
            continue
    try:
        return datetime.fromisoformat(value)
    except Exception:
        return None


def _score_amount(tx_amount: float | None, inv_amount: float | None) -> float:
    if tx_amount is None or inv_amount is None or tx_amount == 0 or inv_amount == 0:
        return 0.0
    diff = abs(tx_amount - inv_amount)
    if diff < 0.01:
        return 1.0
    ratio = min(tx_amount, inv_amount) / max(tx_amount, inv_amount)
    if ratio >= 0.99:
        return 0.95
    if ratio >= 0.95:
        return 0.7
    if ratio >= 0.9:
        return 0.4
    return max(0.0, (ratio - 0.5) * 2)


def _score_date(tx_date: str | None, inv_date: str | None, due_date: str | None) -> float:
    tx = _to_date(tx_date)
    if not tx:
        return 0.0

    best = 0.0
    for raw in (inv_date, due_date):
        d = _to_date(raw)
        if not d:
            continue
        diff = abs((tx - d).days)
        if diff <= 0:
            score = 1.0
        elif diff <= 3:
            score = 0.9
        elif diff <= 7:
            score = 0.7
        elif diff <= 14:
            score = 0.5
        elif diff <= 30:
            score = 0.3
        else:
            score = 0.0
        best = max(best, score)
    return best


def _score_reference(tx: dict, inv: dict) -> float:
    desc = (tx.get("description") or "").lower()
    ref = (tx.get("reference") or "").lower()
    combined = f"{desc} {ref}".strip()

    inv_num = (inv.get("invoiceNumber") or "").lower()
    if inv_num:
        if inv_num in combined:
            return 1.0
        normalized_inv = inv_num.replace("_", "-")
        if normalized_inv in combined:
            return 0.95
        parts = [p for p in normalized_inv.split("-") if len(p) >= 3]
        if parts and any(p in combined for p in parts):
            return 0.85

    po = (inv.get("purchaseOrder") or "").lower()
    if po and po in combined:
        return 0.9

    vendor = (inv.get("vendorName") or "").lower().strip()
    if vendor:
        if vendor in combined:
            return 0.85
        vendor_words = [w for w in vendor.split() if len(w) > 2]
        if vendor_words:
            match_words = [w for w in vendor_words if w in combined]
            ratio = len(match_words) / len(vendor_words)
            if ratio >= 0.5:
                return 0.55 + ratio * 0.35
        sim = SequenceMatcher(a=combined, b=vendor).ratio()
        return max(0.0, sim * 0.7)

    return 0.0


def reconcile(transactions: list[dict], invoices: list[dict]) -> dict:
    indexed_debit_txs = [
        (idx, t)
        for idx, t in enumerate(transactions)
        if t.get("type") == "debit" and t.get("amount") not in (None, 0)
    ]

    candidates: list[dict] = []
    for debit_idx, tx in indexed_debit_txs:
        for inv_idx, inv in enumerate(invoices):
            amount = _score_amount(tx.get("amount"), inv.get("totalAmount"))
            date = _score_date(tx.get("date"), inv.get("invoiceDate"), inv.get("dueDate"))
            reference = _score_reference(tx, inv)
            ai = (amount + date + reference) / 3.0
            final = (
                WEIGHTS["amount"] * amount
                + WEIGHTS["date"] * date
                + WEIGHTS["reference"] * reference
                + WEIGHTS["ai"] * ai
            )
            factors = []
            if amount >= 0.95:
                factors.append("Exact amount match")
            elif amount >= 0.7:
                factors.append("Near amount match")
            if date >= 0.9:
                factors.append("Date within 3 days")
            elif date >= 0.7:
                factors.append("Date within 7 days")
            if reference >= 0.95:
                factors.append("Invoice/PO reference match")
            elif reference >= 0.8:
                factors.append("Vendor/reference partial match")

            candidates.append(
                {
                    "txIndex": debit_idx,
                    "invIndex": inv_idx,
                    "score": final,
                    "strategyScores": {
                        "amountMatch": amount,
                        "dateProximity": date,
                        "referenceMatch": reference,
                        "aiReasoning": ai,
                    },
                    "matchFactors": factors,
                }
            )

    candidates.sort(key=lambda x: x["score"], reverse=True)
    matched_tx_indices: set[int] = set()
    matched_inv_indices: set[int] = set()
    matched: list[dict] = []

    for c in candidates:
        if c["txIndex"] in matched_tx_indices or c["invIndex"] in matched_inv_indices:
            continue
        if c["score"] < 0.5:
            continue

        tx = transactions[c["txIndex"]]
        inv = invoices[c["invIndex"]]
        conf = c["score"]
        level = "high" if conf >= 0.85 else "medium" if conf >= 0.6 else "low"

        matched.append(
            {
                "matchId": f"match-{tx['id']}-{inv['id']}",
                "transaction": tx,
                "invoice": inv,
                "confidence": conf,
                "confidenceLevel": level,
                "strategyScores": c["strategyScores"],
                "aiReasoning": None,
                "matchFactors": c["matchFactors"],
            }
        )
        matched_tx_indices.add(c["txIndex"])
        matched_inv_indices.add(c["invIndex"])

    unmatched_transactions = [
        tx for idx, tx in enumerate(transactions) if idx not in matched_tx_indices
    ]
    unmatched_invoices = [inv for idx, inv in enumerate(invoices) if idx not in matched_inv_indices]

    summary = {
        "totalTransactions": len(transactions),
        "totalInvoices": len(invoices),
        "matchedCount": len(matched),
        "unmatchedTransactionCount": len(unmatched_transactions),
        "unmatchedInvoiceCount": len(unmatched_invoices),
        "highConfidenceCount": len([m for m in matched if m["confidenceLevel"] == "high"]),
        "mediumConfidenceCount": len([m for m in matched if m["confidenceLevel"] == "medium"]),
        "lowConfidenceCount": len([m for m in matched if m["confidenceLevel"] == "low"]),
        "totalMatchedAmount": sum((m["transaction"].get("amount") or 0) for m in matched),
        "totalUnmatchedAmount": sum((t.get("amount") or 0) for t in unmatched_transactions),
        "overallConfidence": (sum(m["confidence"] for m in matched) / len(matched)) if matched else 0,
    }

    return {
        "matched": matched,
        "unmatchedTransactions": unmatched_transactions,
        "unmatchedInvoices": unmatched_invoices,
        "summary": summary,
    }
