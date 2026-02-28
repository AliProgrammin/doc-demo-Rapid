import logging
from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.db.models import Document, ExtractionRun, Transaction, Invoice
from app.schemas.common import ExtractRequest
from app.services.ocr import extract_text, parse_bank_transactions, parse_invoice

router = APIRouter(prefix="/api", tags=["extract"])
logger = logging.getLogger(__name__)


@router.post("/extract")
def extract_docs(payload: ExtractRequest, db: Session = Depends(get_db)):
    if not payload.bankStatementDocId and not payload.invoiceDocIds:
        raise HTTPException(status_code=400, detail="Provide bankStatementDocId and/or invoiceDocIds")

    run = ExtractionRun(bank_document_id=payload.bankStatementDocId)
    db.add(run)
    db.commit()
    db.refresh(run)

    transactions = []
    invoices = []

    try:
        if payload.bankStatementDocId:
            doc = db.get(Document, payload.bankStatementDocId)
            if not doc:
                raise HTTPException(status_code=404, detail="Bank statement document not found")
            text, conf = extract_text(doc.blob_url)
            for tx in parse_bank_transactions(text):
                tx_obj = Transaction(
                    id=tx["id"], extraction_run_id=run.id, document_id=doc.id,
                    date=tx["date"], description=tx["description"], reference=tx["reference"],
                    amount=tx["amount"], type=tx["type"], extraction_confidence=max(conf, tx["extractionConfidence"])
                )
                db.add(tx_obj)
                transactions.append(tx)

        for inv_id in (payload.invoiceDocIds or []):
            doc = db.get(Document, inv_id)
            if not doc:
                raise HTTPException(status_code=404, detail=f"Invoice document {inv_id} not found")
            text, conf = extract_text(doc.blob_url)
            inv = parse_invoice(text, doc.original_filename, conf)
            inv_obj = Invoice(
                id=inv["id"], extraction_run_id=run.id, document_id=doc.id,
                invoice_number=inv["invoiceNumber"], vendor_name=inv["vendorName"], invoice_date=inv["invoiceDate"],
                due_date=inv["dueDate"], total_amount=inv["totalAmount"], original_filename=inv["originalFilename"],
                overall_confidence=inv["overallConfidence"]
            )
            db.add(inv_obj)
            invoices.append(inv)

        run.status = "completed"
        run.completed_at = datetime.now(timezone.utc)
        run.transaction_count = len(transactions)
        run.invoice_count = len(invoices)
        db.commit()
    except HTTPException:
        run.status = "failed"
        run.error_message = "Input validation failure"
        run.completed_at = datetime.now(timezone.utc)
        db.commit()
        raise
    except Exception as exc:
        db.rollback()
        logger.exception("Extraction failed for run_id=%s", run.id)
        run.status = "failed"
        run.error_message = str(exc)[:500]
        run.completed_at = datetime.now(timezone.utc)
        db.add(run)
        db.commit()
        raise HTTPException(status_code=500, detail="Extraction failed") from exc

    return {
        "success": True,
        "extractionRunId": run.id,
        "transactions": transactions,
        "invoices": invoices,
        "transactionCount": len(transactions),
        "invoiceCount": len(invoices),
    }
