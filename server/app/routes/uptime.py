"""
NetOps Tower - Uptime Tracking Routes

REST and WebSocket endpoints for uptime monitoring.
"""
import asyncio
import json
import logging
from fastapi import APIRouter, WebSocket, WebSocketDisconnect, HTTPException
from typing import Optional

from ..config import settings
from ..models.schemas import (
    UptimeStartRequest, UptimeStartResponse, UptimeStopResponse,
    UptimeSession, UptimeUpdate
)
from ..services.uptime_tracker import uptime_tracker

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/uptime", tags=["Uptime"])


@router.post("/start", response_model=UptimeStartResponse)
async def start_uptime_tracking(request: UptimeStartRequest):
    """
    Start tracking uptime for specified nodes in a lab.

    This begins a background polling task that monitors node status
    and accumulates uptime points.
    """
    try:
        session = await uptime_tracker.start_tracking(
            lab_path=request.lab_path,
            node_ids=request.node_ids,
            ticket_id=request.ticket_id
        )

        return UptimeStartResponse(
            session_id=session.session_id,
            lab_path=session.lab_path,
            nodes=list(session.nodes.keys()),
            started_at=session.started_at
        )
    except Exception as e:
        logger.error(f"Failed to start uptime tracking: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/status/{session_id}", response_model=UptimeSession)
async def get_uptime_status(session_id: str):
    """
    Get current uptime status for a tracking session.
    """
    session = uptime_tracker.get_session(session_id)

    if not session:
        raise HTTPException(status_code=404, detail="Session not found")

    return session


@router.post("/stop/{session_id}", response_model=UptimeStopResponse)
async def stop_uptime_tracking(session_id: str):
    """
    Stop tracking uptime for a session and get final results.

    Returns the final session stats with bonus calculations.
    """
    session = await uptime_tracker.stop_tracking(session_id)

    if not session:
        raise HTTPException(status_code=404, detail="Session not found")

    # Calculate bonus multiplier
    bonus_multiplier = 1.0
    if session.uptime_percentage >= settings.uptime_bonus_threshold:
        bonus_multiplier = settings.uptime_bonus_multiplier
    elif session.uptime_percentage >= 95.0:
        bonus_multiplier = 1.2

    final_points = int(session.points_earned * bonus_multiplier)

    # Generate summary
    total_time = session.total_uptime_seconds + session.total_downtime_seconds
    if total_time > 0:
        hours = total_time // 3600
        minutes = (total_time % 3600) // 60
        seconds = total_time % 60
        duration_str = f"{hours:02d}:{minutes:02d}:{seconds:02d}"
    else:
        duration_str = "00:00:00"

    summary = (
        f"Session completed. Duration: {duration_str}. "
        f"Uptime: {session.uptime_percentage:.1f}%. "
        f"Incidents: {session.total_incidents}. "
        f"Points: {final_points} (x{bonus_multiplier:.1f} bonus)"
    )

    return UptimeStopResponse(
        session=session,
        final_points=final_points,
        bonus_multiplier=bonus_multiplier,
        summary=summary
    )


@router.websocket("/ws/{session_id}")
async def uptime_websocket(websocket: WebSocket, session_id: str):
    """
    WebSocket endpoint for real-time uptime updates.

    Connect to receive live status updates for a tracking session.

    Messages sent:
    - {"type": "update", "data": {...}} - Periodic uptime update
    - {"type": "error", "message": "..."} - Error message
    - {"type": "closed", "reason": "..."} - Session closed

    Messages received:
    - {"type": "ping"} - Keep-alive ping (responds with pong)
    """
    await websocket.accept()

    session = uptime_tracker.get_session(session_id)
    if not session:
        await websocket.send_json({
            "type": "error",
            "message": f"Session {session_id} not found"
        })
        await websocket.close()
        return

    if not session.is_active:
        await websocket.send_json({
            "type": "error",
            "message": f"Session {session_id} is not active"
        })
        await websocket.close()
        return

    # Send initial status
    await websocket.send_json({
        "type": "connected",
        "session_id": session_id,
        "uptime_percentage": session.uptime_percentage,
        "points_earned": session.points_earned
    })

    # Callback for updates
    async def on_update(update: UptimeUpdate):
        try:
            await websocket.send_json({
                "type": "update",
                "data": {
                    "session_id": update.session_id,
                    "timestamp": update.timestamp.isoformat(),
                    "nodes": {
                        str(nid): {
                            "node_id": stats.node_id,
                            "node_name": stats.node_name,
                            "status": stats.current_status.value,
                            "is_responsive": stats.is_responsive,
                            "uptime_seconds": stats.uptime_seconds,
                            "downtime_seconds": stats.downtime_seconds,
                            "incident_count": stats.incident_count
                        }
                        for nid, stats in update.nodes.items()
                    },
                    "uptime_percentage": update.uptime_percentage,
                    "points_earned": update.points_earned,
                    "session_duration_seconds": update.session_duration_seconds
                }
            })
        except Exception as e:
            logger.error(f"Failed to send WebSocket update: {e}")

    # Register callback
    uptime_tracker.register_callback(session_id, on_update)

    try:
        while True:
            try:
                message = await websocket.receive()

                if message["type"] == "websocket.disconnect":
                    break

                if "text" in message:
                    try:
                        data = json.loads(message["text"])
                        msg_type = data.get("type")

                        if msg_type == "ping":
                            await websocket.send_json({"type": "pong"})

                    except json.JSONDecodeError:
                        pass

            except WebSocketDisconnect:
                break

            # Check if session is still active
            current_session = uptime_tracker.get_session(session_id)
            if not current_session or not current_session.is_active:
                await websocket.send_json({
                    "type": "closed",
                    "reason": "Session ended"
                })
                break

    except Exception as e:
        logger.error(f"Uptime WebSocket error: {e}")

    finally:
        uptime_tracker.unregister_callback(session_id, on_update)
        logger.info(f"Uptime WebSocket closed for session {session_id}")
