from fastapi.testclient import TestClient

from app.main import app


client = TestClient(app)


def test_models_endpoints_smoke():
    r = client.get('/api/models')
    assert r.status_code == 200
    payload = r.json()
    assert 'models' in payload

    r = client.post('/api/models/activate', json={'entityType': 'invoice', 'modelId': 'custom-invoice-demo'})
    assert r.status_code == 200
    assert r.json()['isCustom'] is True

    r = client.post('/api/models/reset', json={'entityType': 'invoice'})
    assert r.status_code == 200
    assert r.json()['modelId'] == 'prebuilt-invoice'


def test_corrections_and_training_endpoints_smoke():
    r = client.get('/api/corrections?stats=true')
    assert r.status_code == 200
    assert 'stats' in r.json()

    r = client.get('/api/corrections/export')
    assert r.status_code == 200
    assert r.json()['format'] == 'azure-document-intelligence-corrections-v1'

    r = client.get('/api/training/runs')
    assert r.status_code == 200
    assert 'trainingRuns' in r.json()
