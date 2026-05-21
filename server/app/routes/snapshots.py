"""
Snapshots: manual save/restore of lab session state.
In-memory storage (would be replaced with DB in production).
"""
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import List, Optional
from datetime import datetime
import uuid

router = APIRouter()

# In-memory store: lab_id -> list of snapshots
_snapshots_db: dict[str, list[dict]] = {}

class SnapshotCreate(BaseModel):
    name: str
    data: dict  # full lab state serialised as JSON

class SnapshotOut(BaseModel):
    id: str
    lab_id: str
    name: str
    timestamp: str
    data: dict

@router.post("/", response_model=SnapshotOut, status_code=201)
async def create_snapshot(lab_id: str, body: SnapshotCreate):
    """Take a snapshot of the current lab state."""
    snapshot = {
        "id": str(uuid.uuid4()),
        "lab_id": lab_id,
        "name": body.name,
        "timestamp": datetime.utcnow().isoformat() + "Z",
        "data": body.data,
    }
    _snapshots_db.setdefault(lab_id, []).append(snapshot)
    return snapshot

@router.get("/", response_model=List[SnapshotOut])
async def list_snapshots(lab_id: str):
    """List all snapshots for a lab."""
    return _snapshots_db.get(lab_id, [])

@router.post("/{snapshot_id}/restore", response_model=dict)
async def restore_snapshot(lab_id: str, snapshot_id: str):
    """Return the data of a snapshot so the client can apply it."""
    snaps = _snapshots_db.get(lab_id, [])
    for s in snaps:
        if s["id"] == snapshot_id:
            return {"restored": True, "data": s["data"]}
    raise HTTPException(status_code=404, detail="Snapshot not found")

@router.delete("/{snapshot_id}", status_code=204)
async def delete_snapshot(lab_id: str, snapshot_id: str):
    """Delete a snapshot."""
    snaps = _snapshots_db.get(lab_id, [])
    _snapshots_db[lab_id] = [s for s in snaps if s["id"] != snapshot_id]
    return None
