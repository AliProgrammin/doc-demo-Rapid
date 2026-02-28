from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.db.models import Document

router = APIRouter(prefix="/api", tags=["documents"])


@router.get('/documents')
def list_documents(docType: str | None = Query(default=None), db: Session = Depends(get_db)):
    q = db.query(Document)
    if docType:
        q = q.filter(Document.doc_type == docType)
    docs = q.order_by(Document.upload_date.desc()).all()
    return {
        "success": True,
        "documents": [
            {
                "id": d.id,
                "blobName": d.blob_name,
                "originalFilename": d.original_filename,
                "docType": d.doc_type,
                "blobUrl": d.blob_url,
                "uploadDate": d.upload_date.isoformat() if d.upload_date else None,
                "fileSize": d.file_size,
                "contentType": d.content_type,
            }
            for d in docs
        ],
    }
