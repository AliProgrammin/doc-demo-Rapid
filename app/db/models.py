import uuid
from datetime import datetime, timezone
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
    upload_date: Mapped[datetime] = mapped_column(DateTime, default=lambda: datetime.now(timezone.utc))
    file_size: Mapped[int | None] = mapped_column(Integer)
    content_type: Mapped[str | None] = mapped_column(String)


class ExtractionRun(Base):
    __tablename__ = "extraction_runs"
    id: Mapped[str] = mapped_column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    status: Mapped[str] = mapped_column(String, default="running")
    started_at: Mapped[datetime] = mapped_column(DateTime, default=lambda: datetime.now(timezone.utc))
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
    subtotal: Mapped[float | None] = mapped_column(Float)
    tax: Mapped[float | None] = mapped_column(Float)
    purchase_order: Mapped[str | None] = mapped_column(String)
    original_filename: Mapped[str] = mapped_column(String)
    overall_confidence: Mapped[float] = mapped_column(Float, default=0.5)


class ReconciliationRun(Base):
    __tablename__ = "reconciliation_runs"
    id: Mapped[str] = mapped_column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    extraction_run_id: Mapped[str] = mapped_column(String, ForeignKey("extraction_runs.id"))
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    result_json: Mapped[str] = mapped_column(Text)


class Correction(Base):
    __tablename__ = "corrections"
    id: Mapped[str] = mapped_column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    entity_type: Mapped[str] = mapped_column(String, nullable=False)
    entity_id: Mapped[str] = mapped_column(String, nullable=False)
    document_id: Mapped[str | None] = mapped_column(String, ForeignKey("documents.id"))
    extraction_run_id: Mapped[str | None] = mapped_column(String, ForeignKey("extraction_runs.id"))
    field_name: Mapped[str] = mapped_column(String, nullable=False)
    original_value: Mapped[str | None] = mapped_column(Text)
    corrected_value: Mapped[str | None] = mapped_column(Text)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=lambda: datetime.now(timezone.utc))


class ModelConfig(Base):
    __tablename__ = "model_configs"
    entity_type: Mapped[str] = mapped_column(String, primary_key=True)
    model_id: Mapped[str] = mapped_column(String, nullable=False)
    is_custom: Mapped[int] = mapped_column(Integer, default=0)


class TrainingRun(Base):
    __tablename__ = "training_runs"
    id: Mapped[str] = mapped_column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    model_id: Mapped[str] = mapped_column(String, nullable=False)
    entity_type: Mapped[str] = mapped_column(String, nullable=False)
    status: Mapped[str] = mapped_column(String, default="preparing")
    document_count: Mapped[int] = mapped_column(Integer, default=0)
    correction_count: Mapped[int] = mapped_column(Integer, default=0)
    operation_url: Mapped[str | None] = mapped_column(String)
    error_message: Mapped[str | None] = mapped_column(Text)
    started_at: Mapped[datetime] = mapped_column(DateTime, default=lambda: datetime.now(timezone.utc))
    completed_at: Mapped[datetime | None] = mapped_column(DateTime)
