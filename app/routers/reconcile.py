import uuid
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.db.models import Transaction, Invoice
from app.schemas.common import ReconcileRequest
from app.services.matching import reconcile

router = APIRouter(prefix="/api", tags=["reconcile"])

_results: dict[str, dict] = {}


@router.post("/reconcile")
def run_reconcile(payload: ReconcileRequest, db: Session = Depends(get_db)):
    tx_rows = db.query(Transaction).filter(Transaction.extraction_run_id == payload.extractionRunId).all()
    inv_rows = db.query(Invoice).filter(Invoice.extraction_run_id == payload.extractionRunId).all()
    if not tx_rows or not inv_rows:
        raise HTTPException(status_code=400, detail="No transactions or invoices to reconcile")

    txs = [{
        "id": t.id, "date": t.date, "description": t.description, "reference": t.reference,
        "amount": t.amount, "type": t.type, "extractionConfidence": t.extraction_confidence
    } for t in tx_rows]
    invs = [{
        "id": i.id, "invoiceNumber": i.invoice_number, "vendorName": i.vendor_name,
        "invoiceDate": i.invoice_date, "dueDate": i.due_date, "totalAmount": i.total_amount,
        "subtotal": None, "tax": None, "purchaseOrder": None,
        "originalFilename": i.original_filename, "fieldConfidences": {}, "overallConfidence": i.overall_confidence
    } for i in inv_rows]

    result = reconcile(txs, invs)
    rec_id = str(uuid.uuid4())
    _results[rec_id] = result
    return {"success": True, "reconciliationRunId": rec_id, **result}


@router.get("/reconciliation-runs/{run_id}")
def get_reconcile_result(run_id: str):
    data = _results.get(run_id)
    if not data:
        raise HTTPException(status_code=404, detail="Reconciliation run not found")
    return {"success": True, **data}
