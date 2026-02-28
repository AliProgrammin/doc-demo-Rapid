import uuid
from datetime import datetime
from sqlalchemy import String, DateTime, Integer, Float, Text, ForeignKey
from sqlalchemy.orm import Mapped, mapped_column

from app.db.session import Base


class Document(Base):
    __tablename__ = "documents"
    id: Mapped[str] = mapped_column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    blob_name: Mapped[str] = mapped_column(String, nullable=False)
    original_filename: Mapped[str] = mapped_column(String, nullable=False)
    doc_type: Mapped[str] = mapped_column(String, nullable=False)
    blob_url: Mapped[str] = mapped_column(String, nullable=False)
    upload_date: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    file_size: Mapped[int | None] = mapped_column(Integer)
    content_type: Mapped[str | None] = mapped_column(String)


class ExtractionRun(Base):
    __tablename__ = "extraction_runs"
    id: Mapped[str] = mapped_column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    status: Mapped[str] = mapped_column(String, default="running")
    started_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    completed_at: Mapped[datetime | None] = mapped_column(DateTime)
    error_message: Mapped[str | None] = mapped_column(Text)
    bank_document_id: Mapped[str | None] = mapped_column(String, ForeignKey("documents.id"))
    transaction_count: Mapped[int] = mapped_column(Integer, default=0)
    invoice_count: Mapped[int] = mapped_column(Integer, default=0)


class Transaction(Base):
    __tablename__ = "transactions"
    id: Mapped[str] = mapped_column(String, primary_key=True)
    extraction_run_id: Mapped[str] = mapped_column(String, ForeignKey("extraction_runs.id"))
    document_id: Mapped[str] = mapped_column(String, ForeignKey("documents.id"))
    date: Mapped[str | None] = mapped_column(String)
    description: Mapped[str | None] = mapped_column(String)
    reference: Mapped[str | None] = mapped_column(String)
    amount: Mapped[float | None] = mapped_column(Float)
    type: Mapped[str] = mapped_column(String)
    extraction_confidence: Mapped[float] = mapped_column(Float, default=0.5)


class Invoice(Base):
    __tablename__ = "invoices"
    id: Mapped[str] = mapped_column(String, primary_key=True)
    extraction_run_id: Mapped[str] = mapped_column(String, ForeignKey("extraction_runs.id"))
    document_id: Mapped[str] = mapped_column(String, ForeignKey("documents.id"))
    invoice_number: Mapped[str | None] = mapped_column(String)
    vendor_name: Mapped[str | None] = mapped_column(String)
    invoice_date: Mapped[str | None] = mapped_column(String)
    due_date: Mapped[str | None] = mapped_column(String)
    total_amount: Mapped[float | None] = mapped_column(Float)
    original_filename: Mapped[str] = mapped_column(String)
    overall_confidence: Mapped[float] = mapped_column(Float, default=0.5)
