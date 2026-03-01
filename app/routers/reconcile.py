import json
import logging
import uuid

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.db.models import Transaction, Invoice, ReconciliationRun
from app.schemas.common import ReconcileRequest
from app.services.matching import reconcile
from app.services.ocr import extract_text, parse_bank_transactions, parse_invoice

router = APIRouter(prefix="/api", tags=["reconcile"])
logger = logging.getLogger(__name__)

_results: dict[str, dict] = {}


@router.post("/reconcile")
def run_reconcile(payload: ReconcileRequest, db: Session = Depends(get_db)):
    try:
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

        db_rec = ReconciliationRun(id=rec_id, extraction_run_id=payload.extractionRunId, result_json=json.dumps(result))
        db.add(db_rec)
        db.commit()
        return {"success": True, "reconciliationRunId": rec_id, **result}
    except HTTPException:
        raise
    except Exception as exc:
        db.rollback()
        logger.exception("Reconciliation failed for extraction_run_id=%s", payload.extractionRunId)
        raise HTTPException(status_code=500, detail="Reconciliation failed") from exc


@router.get("/reconciliation-runs/{run_id}")
def get_reconcile_result(run_id: str, db: Session = Depends(get_db)):
    data = _results.get(run_id)
    if data:
        return {"success": True, **data}

    db_rec = db.get(ReconciliationRun, run_id)
    if not db_rec:
        raise HTTPException(status_code=404, detail="Reconciliation run not found")

    data = json.loads(db_rec.result_json)
    return {"success": True, **data}


@router.post('/reconcile/full')
def run_reconcile_full(payload: dict):
    bank_url = payload.get('bankStatementUrl')
    invoice_urls = payload.get('invoiceUrls') or []
    if not bank_url or not invoice_urls:
        raise HTTPException(status_code=400, detail='Provide bankStatementUrl and invoiceUrls')

    text, conf = extract_text(bank_url)
    transactions = parse_bank_transactions(text)
    invoices = []
    for inv in invoice_urls:
        inv_text, inv_conf = extract_text(inv.get('url'))
        invoices.append(parse_invoice(inv_text, inv.get('filename') or 'invoice', inv_conf))

    result = reconcile(transactions, invoices)
    return {
        'success': True,
        'extraction': {
            'transactions': transactions,
            'invoices': invoices,
            'transactionCount': len(transactions),
            'invoiceCount': len(invoices),
        },
        'reconciliation': result,
    }
