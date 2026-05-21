from . import snapshots
"""
NetOps Tower - Lab Routes
"""
from fastapi import APIRouter, Query
from datetime import date, datetime
from typing import List, Optional
from pydantic import BaseModel

router = APIRouter(prefix="/labs", tags=["Labs"])

# --- Models ---
class LabSession(BaseModel):
    id: str
    lab_id: str
    name: str
    notes: str = ""
    status: str  # active, completed, paused
    created_at: datetime
    updated_at: datetime

# --- Mock Data (replace with DB/service calls in production) ---
MOCK_SESSIONS: List[LabSession] = [
    LabSession(
        id="s1", lab_id="lab1", name="OSPF Troubleshooting Session",
        notes="Fixed area mismatch", status="completed",
        created_at=datetime(2025,3,1,10,0,0), updated_at=datetime(2025,3,1,11,0,0)
    ),
    LabSession(
        id="s2", lab_id="lab1", name="BGP Peering Lab",
        notes="Need to verify neighbor states", status="active",
        created_at=datetime(2025,3,15,9,30,0), updated_at=datetime(2025,3,15,10,0,0)
    ),
    LabSession(
        id="s3", lab_id="lab2", name="VLAN Configuration",
        notes="", status="paused",
        created_at=datetime(2025,3,10,14,0,0), updated_at=datetime(2025,3,10,14,30,0)
    ),
    LabSession(
        id="s4", lab_id="lab1", name="Firewall Rules Audit",
        notes="Completed successfully", status="completed",
        created_at=datetime(2025,2,20,8,0,0), updated_at=datetime(2025,2,20,9,0,0)
    ),
    LabSession(
        id="s5", lab_id="lab1", name="Switch Stacking Lab",
        notes="Check stack priorities", status="paused",
        created_at=datetime(2025,3,20,12,0,0), updated_at=datetime(2025,3,20,12,15,0)
    ),
]

# --- Routes ---
@router.get("/")
async def list_labs():
    """List all available labs from EVE-NG."""
    # Real implementation would call eveng_client.list_labs()
    return {"labs": []}


@router.get("/{lab_id}/info")
async def get_lab_info(lab_id: str):
    """Get lab information."""
    return {"lab_id": lab_id, "info": {}}


@router.post("/{lab_id}/open")
async def open_lab(lab_id: str):
    """Open/activate a lab."""
    return {"status": "opened", "lab_id": lab_id}


@router.get("/{lab_id}/sessions")
async def get_lab_sessions(
    lab_id: str,
    search: Optional[str] = Query(None, description="Search by name or notes (case-insensitive)"),
    date_from: Optional[date] = Query(None, description="Filter sessions on or after this date (ISO format)"),
    date_to: Optional[date] = Query(None, description="Filter sessions on or before this date (ISO format)"),
    status: Optional[str] = Query(None, description="Filter by status (active, completed, paused)"),
):
    """Get lab sessions with optional search and filters."""
    # Filter sessions for the given lab
    sessions = [s for s in MOCK_SESSIONS if s.lab_id == lab_id]

    # Apply search filter (name or notes, case-insensitive)
    if search:
        search_lower = search.lower()
        sessions = [s for s in sessions
                    if search_lower in s.name.lower() or search_lower in s.notes.lower()]

    # Apply date_from filter
    if date_from:
        sessions = [s for s in sessions if s.created_at.date() >= date_from]

    # Apply date_to filter
    if date_to:
        sessions = [s for s in sessions if s.created_at.date() <= date_to]

    # Apply status filter
    if status:
        sessions = [s for s in sessions if s.status == status]

    return {"sessions": [s.model_dump() for s in sessions]}
router.include_router(snapshots.router, prefix="/{lab_id}/snapshots", tags=["Snapshots"])
