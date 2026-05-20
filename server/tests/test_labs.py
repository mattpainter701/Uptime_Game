"""
Unit tests for lab routes, including validation endpoint.
"""
import pytest
from fastapi import FastAPI
from fastapi.testclient import TestClient
from unittest.mock import AsyncMock, patch

# Import only the router (avoid full app import and its side effects)
from app.routes.labs import router as labs_router

# Build a minimal app for testing
app = FastAPI()
app.include_router(labs_router, prefix="/api")
client = TestClient(app)


@pytest.fixture(autouse=True)
def clear_imported_labs():
    """Reset the in-memory imported labs set before each test."""
    from app.routes.labs import imported_labs
    imported_labs.clear()
    yield


@pytest.fixture
def mock_eveng():
    """Patch the eveng_client methods."""
    with patch('app.routes.labs.eveng_client') as mock:
        mock.get_lab = AsyncMock()
        mock.list_nodes = AsyncMock()
        yield mock


def test_validate_import_valid(mock_eveng):
    """Valid import: lab exists, nodes map correctly, not duplicate."""
    # Arrange
    mock_eveng.get_lab.return_value = {"id": "test-lab", "name": "Test Lab"}
    mock_eveng.list_nodes.return_value = [
        {"id": "node-1", "name": "Router1"},
        {"id": "node-2", "name": "Switch1"},
    ]
    payload = {
        "lab_name": "My Lab",
        "lab_path": "/test-lab.unl",
        "node_mappings": [
            {"eveng_node_id": "node-1", "game_node_id": "game-node-1"},
            {"eveng_node_id": "node-2", "game_node_id": "game-node-2"},
        ]
    }

    # Act
    response = client.post("/api/labs/validate-import", json=payload)

    # Assert
    assert response.status_code == 200
    data = response.json()
    assert data["valid"] is True
    assert len(data["errors"]) == 0
    assert len(data["warnings"]) == 0


def test_validate_import_missing_node(mock_eveng):
    """Mapped node does not exist in lab."""
    # Arrange
    mock_eveng.get_lab.return_value = {"id": "test-lab", "name": "Test Lab"}
    mock_eveng.list_nodes.return_value = [
        {"id": "node-1", "name": "Router1"},
    ]
    payload = {
        "lab_name": "My Lab",
        "lab_path": "/test-lab.unl",
        "node_mappings": [
            {"eveng_node_id": "node-1", "game_node_id": "game-node-1"},
            {"eveng_node_id": "node-2", "game_node_id": "game-node-2"},  # missing
        ]
    }

    # Act
    response = client.post("/api/labs/validate-import", json=payload)

    # Assert
    assert response.status_code == 200
    data = response.json()
    assert data["valid"] is False
    assert len(data["errors"]) == 1
    assert "node-2" in data["errors"][0]


def test_validate_import_duplicate(mock_eveng):
    """Lab path already imported; should warn but still valid."""
    # Arrange
    mock_eveng.get_lab.return_value = {"id": "test-lab", "name": "Test Lab"}
    mock_eveng.list_nodes.return_value = [
        {"id": "node-1", "name": "Router1"},
    ]
    payload = {
        "lab_name": "My Lab",
        "lab_path": "/test-lab.unl",
        "node_mappings": [
            {"eveng_node_id": "node-1", "game_node_id": "game-node-1"},
        ]
    }
    # Simulate first import
    from app.routes.labs import imported_labs
    imported_labs.add("/test-lab.unl")

    # Act
    response = client.post("/api/labs/validate-import", json=payload)

    # Assert
    assert response.status_code == 200
    data = response.json()
    assert data["valid"] is True  # still valid, just a warning
    assert len(data["errors"]) == 0
    assert len(data["warnings"]) == 1
    assert "already imported" in data["warnings"][0]


def test_validate_import_lab_not_found(mock_eveng):
    """Lab does not exist in EVE-NG."""
    # Arrange
    mock_eveng.get_lab.return_value = None
    payload = {
        "lab_name": "My Lab",
        "lab_path": "/nonexistent.unl",
        "node_mappings": [
            {"eveng_node_id": "node-1", "game_node_id": "game-node-1"},
        ]
    }

    # Act
    response = client.post("/api/labs/validate-import", json=payload)

    # Assert
    assert response.status_code == 200
    data = response.json()
    assert data["valid"] is False
    assert len(data["errors"]) == 1
    assert "not found" in data["errors"][0]
