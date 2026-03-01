from fastapi import APIRouter, Depends, Query, HTTPException
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.db.models import Document

router = APIRouter(prefix="/api", tags=["documents"])


@router.get('/documents')
def list_documents(
    docType: str | None = Query(default=None),
    type: str | None = Query(default=None),
    db: Session = Depends(get_db),
):
    selected_type = docType or type
    q = db.query(Document)
    if selected_type:
        q = q.filter(Document.doc_type == selected_type)
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


@router.get('/documents/{doc_id}/sas')
def get_document_sas(doc_id: str, db: Session = Depends(get_db)):
    doc = db.get(Document, doc_id)
    if not doc:
        raise HTTPException(status_code=404, detail="Document not found")
    return {
        "success": True,
        "sasUrl": doc.blob_url,
        "documentId": doc.id,
        "originalFilename": doc.original_filename,
    }
