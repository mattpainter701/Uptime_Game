"""
NetOps Tower - Lab Management Routes
"""
from fastapi import APIRouter, HTTPException, Query
from typing import List, Optional

from ..services.eveng import eveng_client
from ..models.schemas import LabInfo, APIResponse

router = APIRouter(prefix="/labs", tags=["Labs"])


@router.get("/", response_model=List[LabInfo])
async def list_labs(folder: str = Query("/", description="Folder path to list labs from")):
    """List all labs in a folder."""
    labs = await eveng_client.list_labs(folder)
    return labs


@router.get("/{lab_path:path}/info")
async def get_lab_info(lab_path: str):
    """Get detailed lab information."""
    lab = await eveng_client.get_lab(lab_path)
    if not lab:
        raise HTTPException(status_code=404, detail="Lab not found")
    return {"success": True, "data": lab}


@router.post("/{lab_path:path}/open", response_model=APIResponse)
async def open_lab(lab_path: str):
    """Open/activate a lab."""
    success = await eveng_client.open_lab(lab_path)
    if not success:
        raise HTTPException(status_code=500, detail="Failed to open lab")
    return APIResponse(success=True, message=f"Lab {lab_path} opened")


@router.post("/import")
async def import_lab(data: dict):
    """Import a lab from EVE-NG. Accepts server credentials and returns lab list."""
    server_url = data.get("server_url", "")
    username = data.get("username", "")
    password = data.get("password", "")

    if not server_url or not username or not password:
        raise HTTPException(status_code=400, detail="server_url, username, and password are required")

    # Use the existing eveng_client to list labs
    # Note: In production, you'd create a temporary client with the provided credentials
    labs = await eveng_client.list_labs("/")
    return {"success": True, "labs": [lab.model_dump() for lab in labs]}
