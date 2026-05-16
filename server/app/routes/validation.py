"""
NetOps Tower - Validation Routes

REST endpoints for the Validation Engine v2:
- POST /api/validate — run full validation
- POST /api/validate/preflight — run pre-flight checks
- POST /api/validate/fallback — validate using mock CLI fallback
"""
import logging
from fastapi import APIRouter, HTTPException
from typing import Optional

from ..models.schemas import (
    ValidateTicketRequest,
    ValidationReportModel,
    ValidationCriteriaResult,
    PreflightCheckRequest,
    PreflightCheckResponse,
)
from ..services.validation_engine import validation_engine, ValidationContext

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/validate", tags=["Validation"])


@router.post("", response_model=ValidationReportModel)
async def validate_ticket(request: ValidateTicketRequest):
    """
    Run the full validation pipeline for a ticket.

    Supports both real EVE-NG validation and mock CLI fallback.
    Returns a complete ValidationReport with per-criterion results,
    partial-success scoring, anti-cheat flags, and hints.
    """
    try:
        # Build validation context
        context = ValidationContext(
            ticket_id=request.ticket_id,
            lab_path="",
            mock_cli_state=request.mock_cli_state,
            eveng_available=request.mock_cli_state is None,
            command_history=request.command_history or [],
        )

        # Run validation
        report = await validation_engine.validate(
            ticket_id=request.ticket_id,
            validation_criteria=request.validation_criteria,
            context=context,
            script=request.script,
        )

        return ValidationReportModel(
            ticket_id=report.ticket_id,
            outcome=report.outcome.value,
            success=report.success,
            total_criteria=report.total_criteria,
            passed_criteria=report.passed_criteria,
            failed_criteria=report.failed_criteria,
            score=report.score,
            reward_multiplier=report.reward_multiplier,
            criteria_results=[
                ValidationCriteriaResult(
                    criterion_id=r.criterion_id,
                    check_type=r.check_type,
                    status=r.status.value,
                    passed=r.passed,
                    message=r.message,
                    hint=r.hint,
                    duration_ms=r.duration_ms,
                    expected=r.expected,
                    actual=r.actual,
                    params=r.params,
                )
                for r in report.criteria_results
            ],
            anti_cheat_flags=report.anti_cheat_flags,
            total_duration_ms=report.total_duration_ms,
            message=report.message,
            hints=report.hints,
        )

    except Exception as e:
        logger.error(f"Validation failed for ticket {request.ticket_id}: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/preflight", response_model=PreflightCheckResponse)
async def run_preflight(request: PreflightCheckRequest):
    """
    Run pre-flight validation to verify the lab is in the correct
    initial broken state before the player starts troubleshooting.
    """
    try:
        result = await validation_engine.run_preflight(
            ticket_id=request.ticket_id,
            lab_path=request.lab_path,
            preflight_criteria=request.preflight_criteria,
        )

        return PreflightCheckResponse(
            passed=result.passed,
            lab_correctly_broken=result.lab_correctly_broken,
            checks=[
                ValidationCriteriaResult(
                    criterion_id=r.criterion_id,
                    check_type=r.check_type,
                    status=r.status.value,
                    passed=r.passed,
                    message=r.message,
                    hint=r.hint,
                    duration_ms=r.duration_ms,
                    expected=r.expected,
                    actual=r.actual,
                    params=r.params,
                )
                for r in result.checks
            ],
            message=result.message,
        )

    except Exception as e:
        logger.error(f"Preflight check failed for ticket {request.ticket_id}: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/fallback", response_model=ValidationReportModel)
async def validate_with_fallback(request: ValidateTicketRequest):
    """
    Validate a ticket using mock CLI state as fallback when EVE-NG is unavailable.
    """
    if not request.mock_cli_state:
        raise HTTPException(
            status_code=400,
            detail="mock_cli_state is required for fallback validation",
        )

    try:
        report = await validation_engine.validate_with_fallback(
            ticket_id=request.ticket_id,
            validation_criteria=request.validation_criteria,
            mock_cli_state=request.mock_cli_state,
            command_history=request.command_history,
        )

        return ValidationReportModel(
            ticket_id=report.ticket_id,
            outcome=report.outcome.value,
            success=report.success,
            total_criteria=report.total_criteria,
            passed_criteria=report.passed_criteria,
            failed_criteria=report.failed_criteria,
            score=report.score,
            reward_multiplier=report.reward_multiplier,
            criteria_results=[
                ValidationCriteriaResult(
                    criterion_id=r.criterion_id,
                    check_type=r.check_type,
                    status=r.status.value,
                    passed=r.passed,
                    message=r.message,
                    hint=r.hint,
                    duration_ms=r.duration_ms,
                    expected=r.expected,
                    actual=r.actual,
                    params=r.params,
                )
                for r in report.criteria_results
            ],
            anti_cheat_flags=report.anti_cheat_flags,
            total_duration_ms=report.total_duration_ms,
            message=report.message,
            hints=report.hints,
        )

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Fallback validation failed: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/grading")
async def get_grading_config():
    """
    Get the current grading configuration for partial-success scoring.
    """
    gc = validation_engine.grading_config
    return {
        "full_pass_threshold": gc.full_pass_threshold,
        "partial_pass_threshold": gc.partial_pass_threshold,
        "partial_reward_floor": gc.partial_reward_floor,
        "reward_scaling": gc.reward_scaling,
        "reward_steps": gc.reward_steps,
    }
