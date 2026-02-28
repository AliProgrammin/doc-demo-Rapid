import io
from fastapi.testclient import TestClient
from app.main import app


def test_upload_extract_smoke():
    client = TestClient(app)

    file_content = b"fake image bytes"
    up = client.post(
        "/api/upload",
        files={"file": ("sample.png", io.BytesIO(file_content), "image/png")},
        data={"docType": "invoice"},
    )
    assert up.status_code == 200
    doc_id = up.json()["documentId"]

    ex = client.post("/api/extract", json={"invoiceDocIds": [doc_id]})
    assert ex.status_code == 200
    body = ex.json()
    assert body["success"] is True
    assert body["invoiceCount"] >= 1
