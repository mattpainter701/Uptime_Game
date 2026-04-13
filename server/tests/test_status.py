"""
Tests for the status API endpoints.
"""
import pytest


@pytest.mark.asyncio
async def test_health_check(client):
    """Health check returns healthy status."""
    response = await client.get("/api/status/health")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "healthy"


@pytest.mark.asyncio
async def test_root_endpoint(client):
    """Root endpoint returns API info."""
    response = await client.get("/")
    assert response.status_code == 200
    data = response.json()
    assert data["name"] == "NetOps Tower API"
    assert data["version"] == "1.0.0"
    assert "docs" in data


@pytest.mark.asyncio
async def test_get_status_eveng_disconnected(client, mock_eveng):
    """Status shows EVE-NG disconnected when not available."""
    mock_eveng['get_status'].return_value = None
    response = await client.get("/api/status/")
    assert response.status_code == 200
    data = response.json()
    assert data["server"] == "online"
    assert data["eveng"]["connected"] is False


@pytest.mark.asyncio
async def test_get_game_config(client):
    """Config endpoint returns all game parameters."""
    response = await client.get("/api/status/config")
    assert response.status_code == 200
    data = response.json()
    # Verify all expected config keys
    assert "uptimeCheckInterval" in data
    assert "uptimePointsPerMinute" in data
    assert "uptimeBonusThreshold" in data
    assert "uptimeBonusMultiplier" in data
    assert "downtimePenaltyPerMinute" in data
    assert "reputationLossPerIncident" in data
    assert "enforceTimeLimits" in data
    assert "evengTimeout" in data
    # Verify types
    assert isinstance(data["uptimeCheckInterval"], int)
    assert isinstance(data["uptimeBonusThreshold"], float)
    assert isinstance(data["enforceTimeLimits"], bool)


@pytest.mark.asyncio
async def test_list_templates_empty(client, mock_eveng):
    """Templates endpoint returns empty list when EVE-NG disconnected."""
    mock_eveng['list_templates'].return_value = []
    response = await client.get("/api/status/templates")
    assert response.status_code == 200
    data = response.json()
    assert data["templates"] == []
