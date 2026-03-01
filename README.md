# doc-demo-Rapid (backend variant)

Production-oriented FastAPI backend for document upload, OCR extraction, and invoice-to-bank-transaction reconciliation.

## What this variant now includes

- RapidOCR image OCR with **PDF native text extraction first** (`pypdf`) and OCR fallback.
- Improved transaction parsing for statement-style/table-like lines.
- Improved reconciliation scoring parity (amount/date/reference blend, deterministic one-to-one matching).
- Better error handling and structured logging.
- Reconciliation run persistence in DB (not memory-only).
- Expanded unit + integration tests.

## Tech stack

- FastAPI
- SQLAlchemy
- SQLite by default (switchable via `db_url`)
- RapidOCR ONNX Runtime
- pypdf

---

## Local run (exact steps)

```bash
cd /root/.openclaw/workspace/projects/doc-demo-backend-variant
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
uvicorn app.main:app --host 0.0.0.0 --port 8000
```

Open API docs:
- Swagger: `http://127.0.0.1:8000/docs`
- ReDoc: `http://127.0.0.1:8000/redoc`

Health checks:
```bash
curl -s http://127.0.0.1:8000/health
curl -s http://127.0.0.1:8000/ready
```

---

## Docker deploy

```bash
cd /root/.openclaw/workspace/projects/doc-demo-backend-variant
docker compose up --build -d
curl -s http://127.0.0.1:8000/health
```

Stop:
```bash
docker compose down
```

---

## API verification workflow (end-to-end)

### 1) Upload invoice and bank statement

```bash
# invoice
curl -s -X POST http://127.0.0.1:8000/api/upload \
  -F "file=@/path/to/invoice.pdf" \
  -F "docType=invoice"

# bank statement
curl -s -X POST http://127.0.0.1:8000/api/upload \
  -F "file=@/path/to/statement.pdf" \
  -F "docType=bank_statement"
```

Collect `documentId` values from responses.

### 2) Extract

```bash
curl -s -X POST http://127.0.0.1:8000/api/extract \
  -H "content-type: application/json" \
  -d '{
    "bankStatementDocId": "<BANK_DOC_ID>",
    "invoiceDocIds": ["<INV_DOC_ID_1>", "<INV_DOC_ID_2>"]
  }'
```

Collect `extractionRunId`.

### 3) Reconcile

```bash
curl -s -X POST http://127.0.0.1:8000/api/reconcile \
  -H "content-type: application/json" \
  -d '{"extractionRunId":"<EXTRACTION_RUN_ID>"}'
```

Collect `reconciliationRunId`.

### 4) Fetch reconciliation result

```bash
curl -s http://127.0.0.1:8000/api/reconciliation-runs/<RECONCILIATION_RUN_ID>
```

---

## Test

Run full suite:

```bash
cd /root/.openclaw/workspace/projects/doc-demo-backend-variant
source .venv/bin/activate
pytest -q
```

---

## Main endpoints

- `GET /health`
- `GET /ready`
- `POST /api/upload`
- `POST /api/extract`
- `POST /api/reconcile`
- `GET /api/reconciliation-runs/{run_id}`
- `GET /api/documents`
- `GET /api/extraction-runs`
- `GET /api/transactions?extractionRunId=...`
- `PATCH /api/transactions/{id}`
- `GET /api/invoices?extractionRunId=...`
- `PATCH /api/invoices/{id}`

---

## Notes / caveats

- OCR quality still depends on source scan quality (rotation/noise/resolution).
- Native PDF text extraction is used when text exists in PDF; scanned-image PDFs still rely on OCR path.
- Matching is deterministic heuristic scoring (no external LLM dependency), tuned for backend parity and predictability.

---

## Final handoff (doc-demo-Rapid)

### Parity sweep completed

Compared against `/root/.openclaw/workspace/projects/doc-demo-reference` API surface and aligned backend routes with the reference contract where applicable for this Python backend variant.

Added/updated parity endpoints:

- `GET /api/documents?type=` (alias support alongside `docType`)
- `GET /api/documents/{id}/sas`
- `GET /api/corrections`
- `GET /api/corrections/export`
- `GET /api/models`
- `POST /api/models/activate`
- `POST /api/models/reset`
- `GET /api/training/runs`
- `POST /api/training/start`
- `GET /api/training/status/{id}`
- `POST /api/reconcile/full`

Also added correction tracking on invoice/transaction PATCH updates and invoice optional fields (`subtotal`, `tax`, `purchaseOrder`) persistence support.

### Verification checklist

- [x] Parity sweep vs reference repo route set completed
- [x] Remaining route-level parity gaps closed for backend variant
- [x] Full test suite executed in Dockerized Python environment
- [x] Added endpoint smoke tests for newly added parity routes
- [x] Existing flow/health/ocr/matching tests still passing

### Test evidence

Run command:

```bash
docker run --rm -v /root/.openclaw/workspace/projects/doc-demo-backend-variant:/app -w /app python:3.12-slim sh -lc "pip install -q -r requirements.txt && pytest -q"
```

Result:

- `8 passed` (no failures)
