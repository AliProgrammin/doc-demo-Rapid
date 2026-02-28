import logging
import os

from fastapi import APIRouter, UploadFile, File, Form, Depends, HTTPException
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.db.models import Document
from app.services.storage import save_upload

router = APIRouter(prefix="/api", tags=["upload"])
logger = logging.getLogger(__name__)


@router.post("/upload")
def upload_document(
    file: UploadFile = File(...),
    docType: str = Form(...),
    db: Session = Depends(get_db),
):
    if docType not in {"bank_statement", "invoice"}:
        raise HTTPException(status_code=400, detail="docType must be 'bank_statement' or 'invoice'")

    try:
        blob_name, path = save_upload(file)
        doc = Document(
            blob_name=blob_name,
            original_filename=file.filename or blob_name,
            doc_type=docType,
            blob_url=path,
            file_size=os.path.getsize(path),
            content_type=file.content_type,
        )
        db.add(doc)
        db.commit()
        db.refresh(doc)
    except Exception as exc:
        db.rollback()
        logger.exception("Upload failed for filename=%s type=%s", file.filename, docType)
        raise HTTPException(status_code=500, detail="Failed to upload document") from exc

    return {
        "success": True,
        "documentId": doc.id,
        "blobName": blob_name,
        "blobUrl": path,
        "sasUrl": path,
        "originalFilename": doc.original_filename,
        "docType": docType,
    }
