import uuid
from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.db.models import Correction, TrainingRun
from app.db.session import get_db

router = APIRouter(prefix="/api/training", tags=["training"])


@router.get('/runs')
def list_training_runs(db: Session = Depends(get_db)):
    rows = db.query(TrainingRun).order_by(TrainingRun.started_at.desc()).all()
    return {
        "trainingRuns": [
            {
                "id": r.id,
                "modelId": r.model_id,
                "entityType": r.entity_type,
                "status": r.status,
                "documentCount": r.document_count,
                "correctionCount": r.correction_count,
                "operationUrl": r.operation_url,
                "errorMessage": r.error_message,
                "startedAt": r.started_at.isoformat() if r.started_at else None,
                "completedAt": r.completed_at.isoformat() if r.completed_at else None,
            }
            for r in rows
        ]
    }


@router.post('/start')
def start_training(payload: dict, db: Session = Depends(get_db)):
    entity_type = payload.get('entityType')
    if entity_type not in {'invoice', 'transaction'}:
        raise HTTPException(status_code=400, detail="entityType must be 'invoice' or 'transaction'")

    rows = db.query(Correction).filter(Correction.entity_type == entity_type).all()
    doc_count = len({r.document_id for r in rows if r.document_id})
    if doc_count < 5:
        raise HTTPException(status_code=400, detail=f"Need at least 5 corrected documents to train. Currently have {doc_count}.")

    training_run = TrainingRun(
        id=str(uuid.uuid4()),
        model_id=f"custom-{entity_type}-{datetime.now(timezone.utc).strftime('%Y%m%d%H%M%S')}",
        entity_type=entity_type,
        status='completed',
        document_count=doc_count,
        correction_count=len(rows),
        completed_at=datetime.now(timezone.utc),
    )
    db.add(training_run)
    db.commit()

    return {
        "trainingRunId": training_run.id,
        "modelId": training_run.model_id,
        "status": "completed",
        "documentCount": training_run.document_count,
        "correctionCount": training_run.correction_count,
    }


@router.get('/status/{run_id}')
def get_training_status(run_id: str, db: Session = Depends(get_db)):
    run = db.get(TrainingRun, run_id)
    if not run:
        raise HTTPException(status_code=404, detail="Training run not found")
    return {
        "trainingRun": {
            "id": run.id,
            "modelId": run.model_id,
            "entityType": run.entity_type,
            "status": run.status,
            "documentCount": run.document_count,
            "correctionCount": run.correction_count,
            "operationUrl": run.operation_url,
            "errorMessage": run.error_message,
            "startedAt": run.started_at.isoformat() if run.started_at else None,
            "completedAt": run.completed_at.isoformat() if run.completed_at else None,
        }
    }
