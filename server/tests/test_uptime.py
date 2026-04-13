"""
Tests for uptime tracking logic - point calculation and session management.
"""
import pytest
from unittest.mock import patch
from datetime import datetime

from app.services.uptime_tracker import UptimeTracker
from app.models.schemas import UptimeSession, NodeUptimeStats, NodeStatus


class TestPointCalculation:
    """Test the _calculate_points method with various uptime scenarios."""

    def _make_session(
        self,
        uptime_seconds: int = 0,
        downtime_seconds: int = 0,
        uptime_percentage: float = 100.0,
    ) -> UptimeSession:
        """Helper to create an UptimeSession for testing."""
        return UptimeSession(
            session_id="test-session",
            lab_path="/test/lab.unl",
            node_ids=[1, 2],
            started_at=datetime.now(),
            is_active=True,
            nodes={},
            total_uptime_seconds=uptime_seconds,
            total_downtime_seconds=downtime_seconds,
            uptime_percentage=uptime_percentage,
            points_earned=0,
            total_incidents=0,
        )

    def test_zero_uptime_zero_points(self):
        """No uptime means no points."""
        tracker = UptimeTracker()
        session = self._make_session(uptime_seconds=0, downtime_seconds=0)
        assert tracker._calculate_points(session) == 0

    def test_base_points_per_minute(self):
        """1 point per minute of uptime at default settings."""
        tracker = UptimeTracker()
        session = self._make_session(
            uptime_seconds=300,  # 5 minutes
            uptime_percentage=100.0,
        )
        # 5 minutes * 1 point/min * 1.5 bonus (100% >= 99%) = 7
        points = tracker._calculate_points(session)
        assert points == 7  # int(5 * 1.5) = 7

    def test_below_bonus_threshold(self):
        """No bonus when below 99% uptime."""
        tracker = UptimeTracker()
        session = self._make_session(
            uptime_seconds=300,  # 5 minutes
            downtime_seconds=60,  # 1 minute
            uptime_percentage=83.3,  # Below 99%
        )
        # 5 minutes * 1 = 5 base points, minus 1 min * 5 penalty = 0
        points = tracker._calculate_points(session)
        assert points == 0  # max(0, 5 - 5) = 0

    def test_downtime_penalty(self):
        """Downtime incurs penalty points."""
        tracker = UptimeTracker()
        session = self._make_session(
            uptime_seconds=600,  # 10 minutes
            downtime_seconds=120,  # 2 minutes
            uptime_percentage=83.3,
        )
        # 10 * 1 = 10 base (no bonus, < 99%), 2 * 5 = 10 penalty
        points = tracker._calculate_points(session)
        assert points == 0  # max(0, 10 - 10) = 0

    def test_points_never_negative(self):
        """Points are clamped to 0 minimum."""
        tracker = UptimeTracker()
        session = self._make_session(
            uptime_seconds=60,  # 1 minute
            downtime_seconds=600,  # 10 minutes
            uptime_percentage=9.0,
        )
        # 1 * 1 = 1 base, 10 * 5 = 50 penalty -> max(0, 1 - 50) = 0
        points = tracker._calculate_points(session)
        assert points == 0

    def test_high_uptime_bonus(self):
        """99%+ uptime gets 1.5x bonus."""
        tracker = UptimeTracker()
        session = self._make_session(
            uptime_seconds=600,  # 10 minutes
            downtime_seconds=0,
            uptime_percentage=100.0,
        )
        # 10 * 1 * 1.5 = 15, no penalty
        points = tracker._calculate_points(session)
        assert points == 15

    def test_exactly_at_threshold(self):
        """99.0% uptime gets bonus (>= threshold)."""
        tracker = UptimeTracker()
        session = self._make_session(
            uptime_seconds=594,  # ~9.9 minutes
            downtime_seconds=6,   # ~0.1 minutes
            uptime_percentage=99.0,
        )
        # int(9.9 * 1) = 9 base, int(9 * 1.5) = 13 with bonus, penalty int(0.1 * 5) = 0
        points = tracker._calculate_points(session)
        assert points == 13


class TestUptimeTracker:
    """Test UptimeTracker session management."""

    def test_tracker_starts_empty(self):
        """Tracker initializes with no sessions."""
        tracker = UptimeTracker()
        assert len(tracker.sessions) == 0

    def test_tracker_has_no_tasks(self):
        """Tracker initializes with no background tasks."""
        tracker = UptimeTracker()
        assert len(tracker.tasks) == 0
