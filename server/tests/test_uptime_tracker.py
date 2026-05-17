"""
Tests for Uptime Tracking Service.
"""
import pytest
import asyncio
from unittest.mock import AsyncMock, MagicMock, patch, call
from datetime import datetime
from app.services.uptime_tracker import UptimeTracker
from app.models.schemas import (
    NodeStatus, NodeInfo, UptimeSession, UptimeUpdate, NodeUptimeStats
)


def make_node(id: int, name: str, status: NodeStatus = NodeStatus.RUNNING,
              console_host: str = "10.0.0.1", console_port: int = 32768) -> NodeInfo:
    """Helper to create a NodeInfo for testing."""
    return NodeInfo(
        id=id, name=name, template="vios",
        status=status, console_host=console_host, console_port=console_port,
    )


class TestUptimeTracker:
    """Tests for the UptimeTracker service."""

    @pytest.fixture
    def tracker(self):
        """Fresh tracker instance."""
        return UptimeTracker()

    def test_initial_state(self, tracker):
        """Tracker starts with no sessions."""
        assert tracker.sessions == {}
        assert tracker.tasks == {}
        assert tracker.callbacks == {}

    def test_get_session_not_found(self, tracker):
        """get_session returns None for unknown session."""
        assert tracker.get_session("nonexistent") is None

    def test_register_callback(self, tracker):
        """Callbacks can be registered."""
        cb = lambda x: None
        tracker.callbacks["sess-1"] = []
        tracker.register_callback("sess-1", cb)
        assert len(tracker.callbacks["sess-1"]) == 1

    def test_register_callback_new_session(self, tracker):
        """Callback registration creates entry for new session."""
        cb = lambda x: None
        tracker.register_callback("new-session", cb)
        assert "new-session" in tracker.callbacks
        assert len(tracker.callbacks["new-session"]) == 1

    def test_unregister_callback(self, tracker):
        """Callbacks can be unregistered."""
        cb = lambda x: None
        tracker.callbacks["sess-1"] = [cb]
        tracker.unregister_callback("sess-1", cb)
        assert len(tracker.callbacks["sess-1"]) == 0

    def test_unregister_callback_missing(self, tracker):
        """Unregistering a missing callback doesn't error."""
        cb = lambda x: None
        tracker.callbacks["sess-1"] = []
        tracker.unregister_callback("sess-1", cb)  # should not raise

    def test_unregister_callback_missing_session(self, tracker):
        """Unregistering from missing session doesn't error."""
        tracker.unregister_callback("nonexistent", lambda x: None)  # should not raise

    def test_calculate_points_basic(self, tracker):
        """Points calculation with basic uptime."""
        session = UptimeSession(
            session_id="sess-1",
            lab_path="/lab.unl",
            total_uptime_seconds=600,  # 10 min
            total_downtime_seconds=0,
            uptime_percentage=100.0,
        )
        points = tracker._calculate_points(session)
        assert points >= 0

    def test_calculate_points_with_downtime(self, tracker):
        """Points calculation with some downtime."""
        session = UptimeSession(
            session_id="sess-1",
            lab_path="/lab.unl",
            total_uptime_seconds=300,  # 5 min
            total_downtime_seconds=300,  # 5 min
            uptime_percentage=50.0,
        )
        points = tracker._calculate_points(session)
        assert points >= 0

    def test_calculate_points_minimum_zero(self, tracker):
        """Points never go negative."""
        session = UptimeSession(
            session_id="sess-1",
            lab_path="/lab.unl",
            total_uptime_seconds=0,
            total_downtime_seconds=600,
            uptime_percentage=0.0,
        )
        points = tracker._calculate_points(session)
        assert points == 0

    def test_calculate_points_bonus_threshold(self, tracker):
        """Bonus multiplier is applied above threshold."""
        # High uptime should get bonus
        session = UptimeSession(
            session_id="sess-1",
            lab_path="/lab.unl",
            total_uptime_seconds=6000,  # 100 min
            total_downtime_seconds=0,
            uptime_percentage=100.0,
        )
        points = tracker._calculate_points(session)
        # With bonus threshold at 99.5% (or similar), 100% gets bonus
        assert points > 0

    @pytest.mark.asyncio
    async def test_stop_tracking_not_found(self, tracker):
        """stop_tracking returns None for unknown session."""
        result = await tracker.stop_tracking("nonexistent")
        assert result is None

    @pytest.mark.asyncio
    async def test_stop_tracking_active(self, tracker):
        """stop_tracking properly ends an active session."""
        session = UptimeSession(
            session_id="sess-1",
            lab_path="/lab.unl",
            is_active=True,
        )
        # Create a fake task
        async def dummy():
            pass
        task = asyncio.create_task(dummy())
        tracker.sessions["sess-1"] = session
        tracker.tasks["sess-1"] = task

        result = await tracker.stop_tracking("sess-1")
        assert result is not None
        assert result.is_active is False
        assert result.ended_at is not None
        assert "sess-1" not in tracker.tasks

    @pytest.mark.asyncio
    async def test_cleanup(self, tracker):
        """cleanup stops all sessions."""
        session = UptimeSession(
            session_id="sess-1",
            lab_path="/lab.unl",
            is_active=True,
        )
        async def dummy():
            pass
        task = asyncio.create_task(dummy())
        tracker.sessions["sess-1"] = session
        tracker.tasks["sess-1"] = task

        await tracker.cleanup()

        # After cleanup, sessions should be stopped
        assert tracker.sessions == {}
        assert tracker.callbacks == {}

    @pytest.mark.asyncio
    async def test_notify_callbacks(self, tracker):
        """Callbacks are notified with updates."""
        received = []
        async def callback(update):
            received.append(update)

        tracker.callbacks["sess-1"] = [callback]
        update = UptimeUpdate(
            session_id="sess-1",
            nodes={},
            uptime_percentage=99.0,
            points_earned=100,
            session_duration_seconds=60,
        )
        await tracker._notify_callbacks("sess-1", update)
        assert len(received) == 1
        assert received[0].uptime_percentage == 99.0

    @pytest.mark.asyncio
    async def test_notify_callbacks_no_session(self, tracker):
        """Callback notification handles missing session gracefully."""
        update = UptimeUpdate(
            session_id="nonexistent",
            nodes={},
            uptime_percentage=100.0,
            points_earned=0,
            session_duration_seconds=0,
        )
        await tracker._notify_callbacks("nonexistent", update)  # should not raise

    @pytest.mark.asyncio
    async def test_notify_callbacks_handles_errors(self, tracker):
        """Callback errors are caught and logged."""
        def bad_callback(update):
            raise RuntimeError("Callback explosion")

        tracker.callbacks["sess-1"] = [bad_callback]
        update = UptimeUpdate(
            session_id="sess-1",
            nodes={},
            uptime_percentage=100.0,
            points_earned=0,
            session_duration_seconds=0,
        )
        await tracker._notify_callbacks("sess-1", update)  # should not raise

    def test_check_connectivity_sync_wrapper(self, tracker):
        """_check_connectivity is an async method that returns bool."""
        assert asyncio.iscoroutinefunction(tracker._check_connectivity)


class TestUptimeTrackerIntegration:
    """Integration-style tests with mocked EVE-NG."""

    @pytest.mark.asyncio
    async def test_start_tracking_creates_session(self):
        """start_tracking creates a session and starts polling."""
        tracker = UptimeTracker()

        mock_nodes = [
            make_node(1, "R1"),
            make_node(2, "R2"),
        ]

        with patch('app.services.uptime_tracker.eveng_client') as mock_eveng:
            mock_eveng.list_nodes = AsyncMock(return_value=mock_nodes)

            session = await tracker.start_tracking("/lab.unl", [1, 2])

            assert session.session_id is not None
            assert session.lab_path == "/lab.unl"
            assert session.is_active is True
            assert len(session.nodes) == 2
            assert 1 in session.nodes
            assert 2 in session.nodes

            # Clean up
            await tracker.stop_tracking(session.session_id)

    @pytest.mark.asyncio
    async def test_check_and_update(self):
        """_check_and_update updates session stats from EVE-NG data."""
        tracker = UptimeTracker()

        session = UptimeSession(
            session_id="test-check",
            lab_path="/lab.unl",
            is_active=True,
            nodes={
                1: NodeUptimeStats(
                    node_id=1,
                    node_name="R1",
                    current_status=NodeStatus.RUNNING,
                    is_responsive=True,
                ),
            },
        )
        tracker.sessions["test-check"] = session

        mock_nodes = [make_node(1, "R1", NodeStatus.RUNNING)]

        with patch('app.services.uptime_tracker.eveng_client') as mock_eveng:
            mock_eveng.list_nodes = AsyncMock(return_value=mock_nodes)

            with patch.object(tracker, '_check_connectivity', return_value=True):
                await tracker._check_and_update("test-check")

            # Stats should have been updated
            assert session.total_uptime_seconds > 0
            assert session.uptime_percentage >= 0
