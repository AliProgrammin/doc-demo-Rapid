from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.db.models import Transaction

router = APIRouter(prefix="/api", tags=["transactions"])


@router.get('/transactions')
def list_transactions(extractionRunId: str = Query(...), db: Session = Depends(get_db)):
    txs = (
        db.query(Transaction)
        .filter(Transaction.extraction_run_id == extractionRunId)
        .order_by(Transaction.date.asc())
        .all()
    )
    return {
        "success": True,
        "transactions": [
            {
                "id": t.id,
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

    for field, model_field in {
        "date": "date",
        "description": "description",
        "reference": "reference",
        "amount": "amount",
        "type": "type",
    }.items():
        if field in payload:
            setattr(tx, model_field, payload[field])

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
