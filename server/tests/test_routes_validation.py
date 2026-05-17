"""
Tests for Validation Routes (HTTP-level).
"""
import pytest
from unittest.mock import AsyncMock, patch
from fastapi.testclient import TestClient
from app.main import app


@pytest.fixture
def client():
    return TestClient(app)


class TestGradingConfigEndpoint:
    """Tests for the grading config endpoint."""

    def test_get_grading_config(self, client):
        """Returns grading configuration."""
        response = client.get("/api/validate/grading")
        assert response.status_code == 200
        data = response.json()
        assert "full_pass_threshold" in data
        assert "partial_pass_threshold" in data
        assert "partial_reward_floor" in data
        assert "reward_scaling" in data


class TestValidateEndpoint:
    """Tests for the POST /api/validate endpoint."""

    def test_validate_with_mock_cli_state(self, client):
        """Validation with mock CLI fallback state."""
        from app.services.validation_engine import (
            ValidationReport, ValidationOutcome
        )

        mock_report = ValidationReport(
            ticket_id="T-001",
            outcome=ValidationOutcome.FULL_PASS,
            success=True,
            total_criteria=1,
            passed_criteria=1,
            failed_criteria=0,
            score=1.0,
            reward_multiplier=1.0,
        )

        with patch('app.routes.validation.validation_engine') as mock_engine:
            mock_engine.validate = AsyncMock(return_value=mock_report)
            response = client.post("/api/validate", json={
                "ticket_id": "T-001",
                "validation_criteria": [
                    {"type": "ping", "params": {"source": "R1", "destination": "8.8.8.8"}}
                ],
                "mock_cli_state": {"R1": {"interfaces": {}}}
            })
            assert response.status_code == 200
            data = response.json()
            assert data["ticket_id"] == "T-001"
            assert data["success"] is True
            assert data["outcome"] == "full_pass"
            assert data["score"] == 1.0

    def test_validate_handles_error(self, client):
        """Validation endpoint handles exceptions gracefully."""
        with patch('app.routes.validation.validation_engine') as mock_engine:
            mock_engine.validate = AsyncMock(side_effect=Exception("Boom"))
            response = client.post("/api/validate", json={
                "ticket_id": "T-001",
                "validation_criteria": [],
            })
            assert response.status_code == 500

    def test_validate_with_script(self, client):
        """Validation with multi-step script."""
        from app.services.validation_engine import (
            ValidationReport, ValidationOutcome
        )

        mock_report = ValidationReport(
            ticket_id="T-002",
            outcome=ValidationOutcome.FULL_PASS,
            success=True,
            total_criteria=2,
            passed_criteria=2,
            failed_criteria=0,
            score=1.0,
            reward_multiplier=1.0,
        )

        with patch('app.routes.validation.validation_engine') as mock_engine:
            mock_engine.validate = AsyncMock(return_value=mock_report)
            response = client.post("/api/validate", json={
                "ticket_id": "T-002",
                "validation_criteria": [
                    {"type": "ping", "params": {"source": "R1", "destination": "10.0.0.1"}}
                ],
                "script": {"steps": [{"action": "wait", "seconds": 5}, {"action": "check"}]}
            })
            assert response.status_code == 200
            data = response.json()
            assert data["ticket_id"] == "T-002"


class TestPreflightEndpoint:
    """Tests for the POST /api/validate/preflight endpoint."""

    def test_preflight(self, client):
        """Preflight endpoint returns results."""
        from app.services.validation_engine import PreflightResult

        mock_result = PreflightResult(
            passed=True,
            lab_correctly_broken=True,
            checks=[],
            message="All checks passed",
        )

        with patch('app.routes.validation.validation_engine') as mock_engine:
            mock_engine.run_preflight = AsyncMock(return_value=mock_result)
            response = client.post("/api/validate/preflight", json={
                "ticket_id": "T-001",
                "lab_path": "/lab.unl",
                "preflight_criteria": [{"type": "ping", "params": {}}],
            })
            assert response.status_code == 200
            data = response.json()
            assert data["passed"] is True
            assert data["lab_correctly_broken"] is True

    def test_preflight_error(self, client):
        """Preflight handles errors."""
        with patch('app.routes.validation.validation_engine') as mock_engine:
            mock_engine.run_preflight = AsyncMock(side_effect=Exception("Boom"))
            response = client.post("/api/validate/preflight", json={
                "ticket_id": "T-001",
                "lab_path": "/lab.unl",
                "preflight_criteria": [],
            })
            assert response.status_code == 500


class TestFallbackEndpoint:
    """Tests for the POST /api/validate/fallback endpoint."""

    def test_fallback_missing_mock_state(self, client):
        """Fallback requires mock_cli_state."""
        response = client.post("/api/validate/fallback", json={
            "ticket_id": "T-001",
            "validation_criteria": [],
        })
        assert response.status_code == 400

    def test_fallback_with_mock_state(self, client):
        """Fallback with valid mock state works."""
        from app.services.validation_engine import (
            ValidationReport, ValidationOutcome
        )

        mock_report = ValidationReport(
            ticket_id="T-001",
            outcome=ValidationOutcome.FULL_PASS,
            success=True,
            total_criteria=1,
            passed_criteria=1,
            failed_criteria=0,
            score=1.0,
            reward_multiplier=1.0,
        )

        with patch('app.routes.validation.validation_engine') as mock_engine:
            mock_engine.validate_with_fallback = AsyncMock(return_value=mock_report)
            response = client.post("/api/validate/fallback", json={
                "ticket_id": "T-001",
                "validation_criteria": [{"type": "ping", "params": {}}],
                "mock_cli_state": {"R1": {}},
            })
            assert response.status_code == 200
            data = response.json()
            assert data["ticket_id"] == "T-001"

    def test_fallback_error(self, client):
        """Fallback handles errors."""
        with patch('app.routes.validation.validation_engine') as mock_engine:
            mock_engine.validate_with_fallback = AsyncMock(side_effect=Exception("Boom"))
            response = client.post("/api/validate/fallback", json={
                "ticket_id": "T-001",
                "validation_criteria": [],
                "mock_cli_state": {"R1": {}},
            })
            assert response.status_code == 500
