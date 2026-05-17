"""
Tests for Status, Health, and Config routes.
"""
import pytest
from unittest.mock import AsyncMock, MagicMock, patch
from fastapi.testclient import TestClient
from app.main import app
from app.models.schemas import EVENGStatus


@pytest.fixture
def client():
    """Create a test client."""
    return TestClient(app)


class TestRootEndpoint:
    """Tests for the root endpoint."""

    def test_root_returns_info(self, client):
        """Root endpoint returns API info."""
        response = client.get("/")
        assert response.status_code == 200
        data = response.json()
        assert data["name"] == "NetOps Tower API"
        assert data["version"] == "1.0.0"
        assert "/docs" in data["docs"]


class TestHealthEndpoint:
    """Tests for the health check endpoint."""

    def test_health_returns_healthy(self, client):
        """Health endpoint returns healthy status."""
        response = client.get("/api/status/health")
        assert response.status_code == 200
        data = response.json()
        assert data["status"] == "healthy"


class TestStatusEndpoint:
    """Tests for the status endpoint."""

    def test_status_with_mock_eveng(self, client):
        """Status endpoint returns server and EVE-NG info."""
        mock_status = EVENGStatus(
            version="2.0.3-112",
            cpu=50,
            mem=8000,
            disk=200000,
            qemu=10,
            iol=5,
            dynamips=2,
        )

        with patch('app.routes.status.eveng_client') as mock_eveng:
            mock_eveng.get_status = AsyncMock(return_value=mock_status)
            response = client.get("/api/status/")
            assert response.status_code == 200
            data = response.json()
            assert data["server"] == "online"
            assert data["eveng"]["connected"] is True
            assert data["eveng"]["status"]["version"] == "2.0.3-112"

    def test_status_eveng_offline(self, client):
        """Status endpoint handles EVE-NG being offline."""
        with patch('app.routes.status.eveng_client') as mock_eveng:
            mock_eveng.get_status = AsyncMock(return_value=None)
            response = client.get("/api/status/")
            assert response.status_code == 200
            data = response.json()
            assert data["eveng"]["connected"] is False
            assert data["eveng"]["status"] is None


class TestTemplatesEndpoint:
    """Tests for the templates endpoint."""

    def test_templates_list(self, client):
        """Templates endpoint returns template list."""
        mock_templates = ["vios", "viosl2", "linux", "nxosv"]

        with patch('app.routes.status.eveng_client') as mock_eveng:
            mock_eveng.list_templates = AsyncMock(return_value=mock_templates)
            response = client.get("/api/status/templates")
            assert response.status_code == 200
            data = response.json()
            assert len(data["templates"]) == 4
            assert "vios" in data["templates"]
            assert "linux" in data["templates"]

    def test_templates_empty(self, client):
        """Templates endpoint returns empty list when no templates."""
        with patch('app.routes.status.eveng_client') as mock_eveng:
            mock_eveng.list_templates = AsyncMock(return_value=[])
            response = client.get("/api/status/templates")
            assert response.status_code == 200
            data = response.json()
            assert data["templates"] == []


class TestConfigEndpoint:
    """Tests for the config endpoint."""

    def test_game_config(self, client):
        """Config endpoint returns game configuration."""
        response = client.get("/api/status/config")
        assert response.status_code == 200
        data = response.json()
        assert "uptimeCheckInterval" in data
        assert "uptimePointsPerMinute" in data
        assert "uptimeBonusThreshold" in data
        assert "uptimeBonusMultiplier" in data
        assert "downtimePenaltyPerMinute" in data
        assert "reputationLossPerIncident" in data
        assert "enforceTimeLimits" in data

    def test_game_config_values_are_json_serializable(self, client):
        """All config values are standard JSON types."""
        response = client.get("/api/status/config")
        data = response.json()
        for key, value in data.items():
            assert isinstance(value, (int, float, str, bool, type(None))), \
                f"{key} has type {type(value)}: {value}"
