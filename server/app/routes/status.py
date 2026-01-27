"""
NetOps Tower - Status Routes
"""
from fastapi import APIRouter

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
