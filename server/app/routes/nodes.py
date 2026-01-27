"""
NetOps Tower - Node Management Routes
"""
from fastapi import APIRouter, HTTPException
from typing import List, Optional

from ..services.eveng import eveng_client
from ..models.schemas import NodeInfo, APIResponse

router = APIRouter(prefix="/nodes", tags=["Nodes"])


@router.get("/{lab_path:path}/list", response_model=List[NodeInfo])
async def list_nodes(lab_path: str):
    """List all nodes in a lab."""
    nodes = await eveng_client.list_nodes(lab_path)
    return nodes


@router.get("/{lab_path:path}/{node_id}", response_model=NodeInfo)
async def get_node(lab_path: str, node_id: int):
    """Get node details."""
    node = await eveng_client.get_node(lab_path, node_id)
    if not node:
        raise HTTPException(status_code=404, detail="Node not found")
    return node


@router.post("/{lab_path:path}/{node_id}/start", response_model=APIResponse)
async def start_node(lab_path: str, node_id: int):
    """Start a node."""
    success = await eveng_client.start_node(lab_path, node_id)
    if not success:
        raise HTTPException(status_code=500, detail="Failed to start node")
    return APIResponse(success=True, message=f"Node {node_id} started")


@router.post("/{lab_path:path}/{node_id}/stop", response_model=APIResponse)
async def stop_node(lab_path: str, node_id: int):
    """Stop a node."""
    success = await eveng_client.stop_node(lab_path, node_id)
    if not success:
        raise HTTPException(status_code=500, detail="Failed to stop node")
    return APIResponse(success=True, message=f"Node {node_id} stopped")


@router.post("/{lab_path:path}/{node_id}/wipe", response_model=APIResponse)
async def wipe_node(lab_path: str, node_id: int):
    """Wipe/reset a node to default state."""
    success = await eveng_client.wipe_node(lab_path, node_id)
    if not success:
        raise HTTPException(status_code=500, detail="Failed to wipe node")
    return APIResponse(success=True, message=f"Node {node_id} wiped")


@router.post("/{lab_path:path}/start-all", response_model=APIResponse)
async def start_all_nodes(lab_path: str):
    """Start all nodes in a lab."""
    success = await eveng_client.start_all_nodes(lab_path)
    if not success:
        raise HTTPException(status_code=500, detail="Failed to start nodes")
    return APIResponse(success=True, message="All nodes started")


@router.post("/{lab_path:path}/stop-all", response_model=APIResponse)
async def stop_all_nodes(lab_path: str):
    """Stop all nodes in a lab."""
    success = await eveng_client.stop_all_nodes(lab_path)
    if not success:
        raise HTTPException(status_code=500, detail="Failed to stop nodes")
    return APIResponse(success=True, message="All nodes stopped")


@router.get("/{lab_path:path}/{node_id}/config")
async def get_node_config(lab_path: str, node_id: int):
    """Get node startup configuration."""
    config = await eveng_client.get_node_config(lab_path, node_id)
    if config is None:
        raise HTTPException(status_code=404, detail="Config not found")
    return {"success": True, "config": config}


@router.post("/{lab_path:path}/{node_id}/export", response_model=APIResponse)
async def export_node_config(lab_path: str, node_id: int):
    """Export running config to startup config."""
    success = await eveng_client.export_node_config(lab_path, node_id)
    if not success:
        raise HTTPException(status_code=500, detail="Failed to export config")
    return APIResponse(success=True, message=f"Config exported for node {node_id}")
