from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.db.models import ExtractionRun, Document

router = APIRouter(prefix="/api", tags=["extraction-runs"])


@router.get('/extraction-runs')
def list_extraction_runs(db: Session = Depends(get_db)):
    rows = db.query(ExtractionRun).order_by(ExtractionRun.started_at.desc()).all()
    out = []
    for r in rows:
        bank_filename = None
        if r.bank_document_id:
            doc = db.get(Document, r.bank_document_id)
            bank_filename = doc.original_filename if doc else None
        out.append(
            {
                "id": r.id,
                "startedAt": r.started_at.isoformat() if r.started_at else None,
                "completedAt": r.completed_at.isoformat() if r.completed_at else None,
                "status": r.status,
                "bankDocumentId": r.bank_document_id,
                "transactionCount": r.transaction_count,
                "invoiceCount": r.invoice_count,
                "bankFilename": bank_filename,
            }
        )
    return {"success": True, "runs": out}
