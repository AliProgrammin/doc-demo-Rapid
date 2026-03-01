from fastapi import APIRouter, Depends, Query
from sqlalchemy import func
from sqlalchemy.orm import Session

from app.db.models import Correction, Document
from app.db.session import get_db

router = APIRouter(prefix="/api", tags=["corrections"])

INVOICE_FIELD_TO_AZURE = {
    "invoiceNumber": "InvoiceId",
    "vendorName": "VendorName",
    "invoiceDate": "InvoiceDate",
    "dueDate": "DueDate",
    "totalAmount": "InvoiceTotal",
    "subtotal": "SubTotal",
    "tax": "TotalTax",
    "purchaseOrder": "PurchaseOrder",
}

TRANSACTION_FIELD_TO_AZURE = {
    "date": "TransactionDate",
    "description": "Description",
    "reference": "Reference",
    "amount": "Amount",
    "type": "TransactionType",
}


@router.get('/corrections')
def list_corrections(
    entityType: str | None = Query(default=None),
    documentId: str | None = Query(default=None),
    stats: bool = Query(default=False),
    counts: bool = Query(default=False),
    db: Session = Depends(get_db),
):
    q = db.query(Correction)
    if entityType:
        q = q.filter(Correction.entity_type == entityType)
    if documentId:
        q = q.filter(Correction.document_id == documentId)

    rows = q.order_by(Correction.created_at.desc()).all()

    if counts:
        count_rows = db.query(Correction.entity_type, func.count(Correction.id)).group_by(Correction.entity_type).all()
        return {"counts": {k: v for k, v in count_rows}}

    field_rows = db.query(Correction.field_name, func.count(Correction.id)).group_by(Correction.field_name).all()
    stats_payload = {
        "totalCorrections": db.query(func.count(Correction.id)).scalar() or 0,
        "documentsAffected": db.query(func.count(func.distinct(Correction.document_id))).scalar() or 0,
        "fieldBreakdown": {k: v for k, v in field_rows},
    }

    if stats:
        return {"stats": stats_payload}

    return {
        "corrections": [
            {
                "id": c.id,
                "entityType": c.entity_type,
                "entityId": c.entity_id,
                "documentId": c.document_id,
                "extractionRunId": c.extraction_run_id,
                "fieldName": c.field_name,
                "originalValue": c.original_value,
                "correctedValue": c.corrected_value,
                "createdAt": c.created_at.isoformat() if c.created_at else None,
            }
            for c in rows
        ],
        "stats": stats_payload,
    }


@router.get('/corrections/export')
def export_corrections(db: Session = Depends(get_db)):
    rows = db.query(Correction).order_by(Correction.created_at.asc()).all()
    field_rows = db.query(Correction.field_name, func.count(Correction.id)).group_by(Correction.field_name).all()
    total = db.query(func.count(Correction.id)).scalar() or 0
    docs_affected = db.query(func.count(func.distinct(Correction.document_id))).scalar() or 0

    grouped: dict[str, dict] = {}
    for c in rows:
        if c.document_id not in grouped:
            d = db.get(Document, c.document_id) if c.document_id else None
            grouped[c.document_id or "unknown"] = {
                "documentId": c.document_id,
                "filename": d.original_filename if d else "unknown",
                "blobName": d.blob_name if d else "",
                "corrections": [],
            }
        m = INVOICE_FIELD_TO_AZURE if c.entity_type == "invoice" else TRANSACTION_FIELD_TO_AZURE
        grouped[c.document_id or "unknown"]["corrections"].append({
            "fieldName": c.field_name,
            "azureFieldName": m.get(c.field_name, c.field_name),
            "originalExtracted": c.original_value,
            "correctedValue": c.corrected_value,
            "entityType": c.entity_type,
            "entityId": c.entity_id,
            "correctedAt": c.created_at.isoformat() if c.created_at else None,
        })

    return {
        "exportedAt": __import__('datetime').datetime.utcnow().isoformat() + 'Z',
        "format": "azure-document-intelligence-corrections-v1",
        "summary": {
            "totalCorrections": total,
            "documentsAffected": docs_affected,
            "fieldBreakdown": {k: v for k, v in field_rows},
        },
        "fieldMapping": {
            "invoice": INVOICE_FIELD_TO_AZURE,
            "transaction": TRANSACTION_FIELD_TO_AZURE,
        },
        "documents": list(grouped.values()),
    }
