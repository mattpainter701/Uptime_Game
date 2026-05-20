"""
NetOps Tower - Lab Management Routes
"""
from fastapi import APIRouter, HTTPException, Query
from typing import List, Optional

from ..services.eveng import eveng_client
from ..models.schemas import LabInfo, APIResponse
from ..models.labs import LabImportValidationRequest

router = APIRouter(prefix="/labs", tags=["Labs"])

# In-memory store for imported labs (replace with DB in production)
imported_labs: set = set()


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


@router.post("/validate-import")
async def validate_lab_import(request: LabImportValidationRequest):
    """
    Validate a lab import request.
    
    Checks:
    1. EVE-NG lab exists
    2. All mapped nodes are present
    3. Lab is not already imported
    """
    errors: list[str] = []
    warnings: list[str] = []
    
    # 1. Check if lab exists in EVE-NG
    lab = await eveng_client.get_lab(request.lab_path)
    if not lab:
        errors.append(f"Lab not found at path: {request.lab_path}")
        return {"valid": False, "errors": errors, "warnings": warnings}
    
    # 2. Check all mapped nodes
    nodes = await eveng_client.list_nodes(request.lab_path)
    if nodes is None:
        errors.append(f"Could not fetch nodes for lab: {request.lab_path}")
        return {"valid": False, "errors": errors, "warnings": warnings}
    
    # Get node identifiers from EVE-NG lab (assume each node has 'id' or 'name')
    lab_node_ids = set()
    for node in nodes:
        # Support both dict and object notation
        nid = node.get('id') if isinstance(node, dict) else getattr(node, 'id', None)
        if nid is None:
            nid = node.get('name') if isinstance(node, dict) else getattr(node, 'name', None)
        if nid:
            lab_node_ids.add(nid)
    
    mapped_eve_node_ids = [m.eveng_node_id for m in request.node_mappings]
    missing_nodes = [nid for nid in mapped_eve_node_ids if nid not in lab_node_ids]
    if missing_nodes:
        errors.append(f"Mapped nodes not found in lab: {', '.join(missing_nodes)}")
    
    # 3. Check duplicate (already imported)
    if request.lab_path in imported_labs:
        warnings.append("Lab is already imported. Re-importing may overwrite existing data.")
    
    valid = len(errors) == 0
    return {"valid": valid, "errors": errors, "warnings": warnings}
