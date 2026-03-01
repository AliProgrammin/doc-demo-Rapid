from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.db.models import Transaction, Correction

router = APIRouter(prefix="/api", tags=["transactions"])


@router.get('/transactions')
def list_transactions(extractionRunId: str = Query(None), db: Session = Depends(get_db)):
    q = db.query(Transaction)
    if extractionRunId:
        q = q.filter(Transaction.extraction_run_id == extractionRunId)
    txs = q.order_by(Transaction.date.asc()).all()
    return {
        "success": True,
        "transactions": [
            {
                "id": t.id,
                "documentId": t.document_id,
                "date": t.date,
                "description": t.description,
                "reference": t.reference,
                "amount": t.amount,
                "type": t.type,
                "extractionConfidence": t.extraction_confidence,
            }
            for t in txs
        ],
    }


@router.patch('/transactions/{tx_id}')
def patch_transaction(tx_id: str, payload: dict, db: Session = Depends(get_db)):
    tx = db.get(Transaction, tx_id)
    if not tx:
        raise HTTPException(status_code=404, detail='Transaction not found')

    changed = False
    for field, model_field in {
        "date": "date",
        "description": "description",
        "reference": "reference",
        "amount": "amount",
        "type": "type",
    }.items():
        if field in payload:
            old_val = getattr(tx, model_field)
            new_val = payload[field]
            if str(old_val if old_val is not None else "") != str(new_val if new_val is not None else ""):
                db.add(Correction(
                    entity_type="transaction",
                    entity_id=tx.id,
                    document_id=tx.document_id,
                    extraction_run_id=tx.extraction_run_id,
                    field_name=field,
                    original_value=str(old_val) if old_val is not None else None,
                    corrected_value=str(new_val) if new_val is not None else None,
                ))
                changed = True
            setattr(tx, model_field, new_val)

    if not changed:
        raise HTTPException(status_code=404, detail='Transaction not found or no changes')

    db.commit()
    db.refresh(tx)
    return {
        "success": True,
        "transaction": {
            "id": tx.id,
            "date": tx.date,
            "description": tx.description,
            "reference": tx.reference,
            "amount": tx.amount,
            "type": tx.type,
            "extractionConfidence": tx.extraction_confidence,
        },
    }
