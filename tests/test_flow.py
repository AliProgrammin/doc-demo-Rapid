import io
from fastapi.testclient import TestClient
from app.main import app


def test_upload_extract_and_reconcile_smoke():
    client = TestClient(app)

    file_content = b"fake image bytes"
    up_inv = client.post(
        "/api/upload",
        files={"file": ("sample.png", io.BytesIO(file_content), "image/png")},
        data={"docType": "invoice"},
    )
    assert up_inv.status_code == 200
    inv_doc_id = up_inv.json()["documentId"]

    up_bank = client.post(
        "/api/upload",
        files={"file": ("bank.png", io.BytesIO(file_content), "image/png")},
        data={"docType": "bank_statement"},
    )
    assert up_bank.status_code == 200
    bank_doc_id = up_bank.json()["documentId"]

    ex = client.post("/api/extract", json={"bankStatementDocId": bank_doc_id, "invoiceDocIds": [inv_doc_id]})
    assert ex.status_code == 200
    body = ex.json()
    assert body["success"] is True
    assert body["invoiceCount"] >= 1

    rec = client.post("/api/reconcile", json={"extractionRunId": body["extractionRunId"]})
    assert rec.status_code == 200
    rec_body = rec.json()
    assert rec_body["success"] is True
    run_id = rec_body["reconciliationRunId"]

    fetch = client.get(f"/api/reconciliation-runs/{run_id}")
    assert fetch.status_code == 200
    assert fetch.json()["success"] is True
