"""
NetOps Tower - Status Routes
"""
from fastapi import APIRouter

from ..config import settings
from ..services.eveng import eveng_client
from ..models.schemas import EVENGStatus

router = APIRouter(prefix="/status", tags=["Status"])


@router.get("/")
async def get_status():
    """Get server and EVE-NG status."""
    eveng_status = await eveng_client.get_status()

    return {
        "server": "online",
        "eveng": {
            "connected": eveng_status is not None,
            "status": eveng_status.model_dump() if eveng_status else None
        }
    }


@router.get("/health")
async def health_check():
    """Simple health check endpoint."""
    return {"status": "healthy"}


@router.get("/templates")
async def list_templates():
    """List available node templates from EVE-NG."""
    templates = await eveng_client.list_templates()
    return {"templates": templates}


@router.get("/config")
async def get_game_config():
    """Return configurable game parameters for frontend."""
    return {
        "uptimeCheckInterval": settings.uptime_check_interval,
        "uptimePointsPerMinute": settings.uptime_points_per_minute,
        "uptimeBonusThreshold": settings.uptime_bonus_threshold,
        "uptimeBonusMultiplier": settings.uptime_bonus_multiplier,
        "downtimePenaltyPerMinute": settings.downtime_penalty_per_minute,
        "reputationLossPerIncident": settings.reputation_loss_per_incident,
        "enforceTimeLimits": settings.enforce_time_limits,
        "evengTimeout": settings.eveng_timeout,
    }
