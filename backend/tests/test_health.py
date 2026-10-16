from fastapi.testclient import TestClient


def test_health_reports_ok(client: TestClient) -> None:
    response = client.get("/health")
    assert response.status_code == 200
    assert response.json()["status"] == "ok"


def test_api_health_alias_is_routable_through_ingress(client: TestClient) -> None:
    assert client.get("/api/health").json()["status"] == "ok"


def test_ready_checks_database(client: TestClient) -> None:
    response = client.get("/ready")
    assert response.status_code == 200
    assert response.json() == {"status": "ready", "database": "ok"}


def test_metrics_endpoint_exposes_prometheus_format(client: TestClient) -> None:
    client.get("/api/doctors")
    response = client.get("/metrics")
    assert response.status_code == 200
    assert "http_requests_total" in response.text
    assert 'handler="/api/doctors"' in response.text
