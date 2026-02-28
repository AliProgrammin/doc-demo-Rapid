from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.db.models import Invoice

router = APIRouter(prefix="/api", tags=["invoices"])


@router.get('/invoices')
def list_invoices(extractionRunId: str = Query(...), db: Session = Depends(get_db)):
    rows = (
        db.query(Invoice)
        .filter(Invoice.extraction_run_id == extractionRunId)
        .all()
    )
    return {
        "success": True,
        "invoices": [
            {
                "id": i.id,
                "invoiceNumber": i.invoice_number,
                "vendorName": i.vendor_name,
                "invoiceDate": i.invoice_date,
                "dueDate": i.due_date,
                "totalAmount": i.total_amount,
                "subtotal": None,
                "tax": None,
                "purchaseOrder": None,
                "originalFilename": i.original_filename,
                "fieldConfidences": {},
                "overallConfidence": i.overall_confidence,
            }
            for i in rows
        ],
    }


@router.patch('/invoices/{invoice_id}')
def patch_invoice(invoice_id: str, payload: dict, db: Session = Depends(get_db)):
    inv = db.get(Invoice, invoice_id)
    if not inv:
        raise HTTPException(status_code=404, detail='Invoice not found')

    mapping = {
        "invoiceNumber": "invoice_number",
        "vendorName": "vendor_name",
        "invoiceDate": "invoice_date",
        "dueDate": "due_date",
        "totalAmount": "total_amount",
    }
    for k, mk in mapping.items():
        if k in payload:
            setattr(inv, mk, payload[k])

    db.commit()
    db.refresh(inv)
    return {
        "success": True,
        "invoice": {
            "id": inv.id,
            "invoiceNumber": inv.invoice_number,
            "vendorName": inv.vendor_name,
            "invoiceDate": inv.invoice_date,
            "dueDate": inv.due_date,
            "totalAmount": inv.total_amount,
            "subtotal": None,
            "tax": None,
            "purchaseOrder": None,
            "originalFilename": inv.original_filename,
            "fieldConfidences": {},
            "overallConfidence": inv.overall_confidence,
        },
    }
