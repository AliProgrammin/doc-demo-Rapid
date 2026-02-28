from pydantic import BaseModel


class UploadResponse(BaseModel):
    success: bool
    documentId: str
    blobName: str
    blobUrl: str
    sasUrl: str
    originalFilename: str
    docType: str


class ExtractRequest(BaseModel):
    bankStatementDocId: str | None = None
    invoiceDocIds: list[str] | None = None


class ReconcileRequest(BaseModel):
    extractionRunId: str
