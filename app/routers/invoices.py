from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.db.models import Invoice, Correction

router = APIRouter(prefix="/api", tags=["invoices"])


@router.get('/invoices')
def list_invoices(extractionRunId: str = Query(None), db: Session = Depends(get_db)):
    q = db.query(Invoice)
    if extractionRunId:
        q = q.filter(Invoice.extraction_run_id == extractionRunId)
    rows = q.all()
    return {
        "success": True,
        "invoices": [
            {
                "id": i.id,
                "documentId": i.document_id,
                "invoiceNumber": i.invoice_number,
                "vendorName": i.vendor_name,
                "invoiceDate": i.invoice_date,
                "dueDate": i.due_date,
                "totalAmount": i.total_amount,
                "subtotal": i.subtotal,
                "tax": i.tax,
                "purchaseOrder": i.purchase_order,
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
        "subtotal": "subtotal",
        "tax": "tax",
        "purchaseOrder": "purchase_order",
    }
    changed = False
    for k, mk in mapping.items():
        if k in payload:
            old_val = getattr(inv, mk)
            new_val = payload[k]
            if str(old_val if old_val is not None else "") != str(new_val if new_val is not None else ""):
                db.add(Correction(
                    entity_type="invoice",
                    entity_id=inv.id,
                    document_id=inv.document_id,
                    extraction_run_id=inv.extraction_run_id,
                    field_name=k,
                    original_value=str(old_val) if old_val is not None else None,
                    corrected_value=str(new_val) if new_val is not None else None,
                ))
                changed = True
            setattr(inv, mk, new_val)

    if not changed:
        raise HTTPException(status_code=404, detail='Invoice not found or no changes')

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
            "subtotal": inv.subtotal,
            "tax": inv.tax,
            "purchaseOrder": inv.purchase_order,
            "originalFilename": inv.original_filename,
            "fieldConfidences": {},
            "overallConfidence": inv.overall_confidence,
        },
    }
