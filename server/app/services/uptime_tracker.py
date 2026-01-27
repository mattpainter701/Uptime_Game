"""
NetOps Tower - Uptime Tracking Service

Background service that monitors node uptime and calculates points.
"""
import asyncio
import logging
import uuid
from datetime import datetime
from typing import Dict, List, Optional, Callable, Any
from collections import defaultdict

from ..config import settings
from ..models.schemas import (
    NodeStatus, NodeUptimeStats, UptimeSession, UptimeRecord, UptimeUpdate
)
from .eveng import eveng_client

logger = logging.getLogger(__name__)


class UptimeTracker:
    """
    Manages uptime tracking sessions for labs/tickets.

    Features:
    - Background polling of node status at configurable intervals
    - Per-node uptime/downtime tracking
    - Real-time points calculation
    - WebSocket callbacks for live updates
    """

    def __init__(self):
        self.sessions: Dict[str, UptimeSession] = {}
        self.tasks: Dict[str, asyncio.Task] = {}
        self.callbacks: Dict[str, List[Callable[[UptimeUpdate], Any]]] = defaultdict(list)
        self._lock = asyncio.Lock()

    async def start_tracking(
        self,
        lab_path: str,
        node_ids: List[int],
        ticket_id: Optional[str] = None
    ) -> UptimeSession:
        """
        Start tracking uptime for specified nodes in a lab.

        Args:
            lab_path: Path to the EVE-NG lab
            node_ids: List of node IDs to track
            ticket_id: Optional associated ticket ID

        Returns:
            UptimeSession with session details
        """
        session_id = str(uuid.uuid4())

        # Initialize node stats
        nodes_stats: Dict[int, NodeUptimeStats] = {}

        # Get initial node info from EVE-NG
        all_nodes = await eveng_client.list_nodes(lab_path)

        for node in all_nodes:
            if node.id in node_ids:
                nodes_stats[node.id] = NodeUptimeStats(
                    node_id=node.id,
                    node_name=node.name,
                    current_status=node.status,
                    is_responsive=node.status == NodeStatus.RUNNING,
                    uptime_seconds=0,
                    downtime_seconds=0,
                    last_status_change=datetime.now(),
                    incident_count=0 if node.status == NodeStatus.RUNNING else 1
                )

        # Create session
        session = UptimeSession(
            session_id=session_id,
            lab_path=lab_path,
            started_at=datetime.now(),
            is_active=True,
            nodes=nodes_stats,
            total_uptime_seconds=0,
            total_downtime_seconds=0,
            uptime_percentage=100.0,
            points_earned=0,
            total_incidents=sum(n.incident_count for n in nodes_stats.values())
        )

        async with self._lock:
            self.sessions[session_id] = session

        # Start background polling task
        task = asyncio.create_task(self._polling_loop(session_id))
        self.tasks[session_id] = task

        logger.info(f"Started uptime tracking session {session_id} for lab {lab_path}")
        return session

    async def stop_tracking(self, session_id: str) -> Optional[UptimeSession]:
        """
        Stop tracking uptime for a session.

        Args:
            session_id: The session ID to stop

        Returns:
            Final UptimeSession with all stats, or None if not found
        """
        async with self._lock:
            session = self.sessions.get(session_id)
            if not session:
                return None

            session.is_active = False
            session.ended_at = datetime.now()

        # Cancel the polling task
        if session_id in self.tasks:
            self.tasks[session_id].cancel()
            try:
                await self.tasks[session_id]
            except asyncio.CancelledError:
                pass
            del self.tasks[session_id]

        # Clear callbacks
        if session_id in self.callbacks:
            del self.callbacks[session_id]

        logger.info(f"Stopped uptime tracking session {session_id}")
        return session

    def get_session(self, session_id: str) -> Optional[UptimeSession]:
        """Get current session state."""
        return self.sessions.get(session_id)

    def register_callback(
        self,
        session_id: str,
        callback: Callable[[UptimeUpdate], Any]
    ) -> None:
        """Register a callback for real-time updates."""
        self.callbacks[session_id].append(callback)

    def unregister_callback(
        self,
        session_id: str,
        callback: Callable[[UptimeUpdate], Any]
    ) -> None:
        """Unregister a callback."""
        if session_id in self.callbacks:
            try:
                self.callbacks[session_id].remove(callback)
            except ValueError:
                pass

    async def _polling_loop(self, session_id: str) -> None:
        """
        Background polling loop that checks node status.
        """
        interval = settings.uptime_check_interval

        while True:
            try:
                await asyncio.sleep(interval)

                async with self._lock:
                    session = self.sessions.get(session_id)
                    if not session or not session.is_active:
                        break

                await self._check_and_update(session_id)

            except asyncio.CancelledError:
                break
            except Exception as e:
                logger.error(f"Error in uptime polling loop for {session_id}: {e}")

    async def _check_and_update(self, session_id: str) -> None:
        """
        Check current node status and update session stats.
        """
        session = self.sessions.get(session_id)
        if not session:
            return

        now = datetime.now()
        interval = settings.uptime_check_interval

        # Get current node status from EVE-NG
        try:
            nodes = await eveng_client.list_nodes(session.lab_path)
            node_status_map = {n.id: n for n in nodes}
        except Exception as e:
            logger.error(f"Failed to get node status: {e}")
            return

        total_up = 0
        total_down = 0

        async with self._lock:
            for node_id, stats in session.nodes.items():
                current_node = node_status_map.get(node_id)

                if current_node:
                    new_status = current_node.status
                    is_running = new_status == NodeStatus.RUNNING

                    # Check if we can actually connect (optional deeper check)
                    is_responsive = is_running
                    if is_running and current_node.console_port:
                        is_responsive = await self._check_connectivity(
                            current_node.console_host or settings.eveng_host,
                            current_node.console_port
                        )

                    # Update uptime/downtime counters
                    if is_responsive:
                        stats.uptime_seconds += interval
                        total_up += interval
                    else:
                        stats.downtime_seconds += interval
                        total_down += interval

                        # Check if this is a new incident
                        if stats.is_responsive and not is_responsive:
                            stats.incident_count += 1

                    # Update status
                    if stats.current_status != new_status:
                        stats.last_status_change = now

                    stats.current_status = new_status
                    stats.is_responsive = is_responsive
                else:
                    # Node not found - count as down
                    stats.downtime_seconds += interval
                    total_down += interval
                    stats.is_responsive = False

            # Update session totals
            session.total_uptime_seconds += total_up
            session.total_downtime_seconds += total_down

            total_time = session.total_uptime_seconds + session.total_downtime_seconds
            if total_time > 0:
                session.uptime_percentage = (session.total_uptime_seconds / total_time) * 100

            session.total_incidents = sum(n.incident_count for n in session.nodes.values())

            # Calculate points
            session.points_earned = self._calculate_points(session)

        # Send update to callbacks
        update = UptimeUpdate(
            session_id=session_id,
            timestamp=now,
            nodes=session.nodes,
            uptime_percentage=session.uptime_percentage,
            points_earned=session.points_earned,
            session_duration_seconds=int((now - session.started_at).total_seconds())
        )

        await self._notify_callbacks(session_id, update)

    async def _check_connectivity(self, host: str, port: int) -> bool:
        """
        Check if we can connect to the console port.
        """
        try:
            reader, writer = await asyncio.wait_for(
                asyncio.open_connection(host, port),
                timeout=settings.eveng_console_timeout
            )
            writer.close()
            await writer.wait_closed()
            return True
        except Exception:
            return False

    def _calculate_points(self, session: UptimeSession) -> int:
        """
        Calculate points based on uptime.
        """
        # Base points per minute of uptime
        uptime_minutes = session.total_uptime_seconds / 60
        base_points = int(uptime_minutes * settings.uptime_points_per_minute)

        # Bonus for high uptime
        if session.uptime_percentage >= settings.uptime_bonus_threshold:
            base_points = int(base_points * settings.uptime_bonus_multiplier)

        # Penalty for downtime
        downtime_minutes = session.total_downtime_seconds / 60
        penalty = int(downtime_minutes * settings.downtime_penalty_per_minute)

        return max(0, base_points - penalty)

    async def _notify_callbacks(
        self,
        session_id: str,
        update: UptimeUpdate
    ) -> None:
        """
        Notify all registered callbacks of an update.
        """
        callbacks = self.callbacks.get(session_id, [])
        for callback in callbacks:
            try:
                result = callback(update)
                if asyncio.iscoroutine(result):
                    await result
            except Exception as e:
                logger.error(f"Error in uptime callback: {e}")

    async def cleanup(self) -> None:
        """
        Clean up all sessions and tasks.
        """
        for session_id in list(self.tasks.keys()):
            await self.stop_tracking(session_id)

        self.sessions.clear()
        self.callbacks.clear()


# Global singleton instance
uptime_tracker = UptimeTracker()
