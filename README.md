# doc-demo-backend-variant

FastAPI backend variant inspired by `doc-demo-reference` with:
- RapidOCR-based OCR (no Azure dependencies)
- SQLite default persistence (easy switch to Postgres)
- Upload, extract, and reconcile API parity baseline

## Run locally

```bash
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
uvicorn app.main:app --reload
```

OpenAPI: `http://127.0.0.1:8000/docs`

## Run tests

```bash
pytest -q
```

## Docker

```bash
docker compose up --build
```

## Current endpoints

- `GET /health`
- `GET /ready`
- `POST /api/upload` (multipart: file, docType)
- `POST /api/extract` (bankStatementDocId and/or invoiceDocIds)
- `POST /api/reconcile` (extractionRunId)
- `GET /api/reconciliation-runs/{run_id}`

## Notes

- This is the first working scaffold. Next pass will improve OCR parsing quality for PDFs/tables and add advanced matching logic.
- Zero Azure SDK/config references in this implementation.
