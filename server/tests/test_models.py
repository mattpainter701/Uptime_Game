"""
Tests for NetOps Tower Pydantic Models/Schemas.
"""
import pytest
from datetime import datetime
from app.models.schemas import (
    NodeStatus, NodeType, ConsoleType, TicketCategory,
    NodeInfo, LabInfo, NetworkInfo, EVENGStatus,
    NodeUptimeStats, UptimeSession, UptimeRecord, UptimeUpdate,
    UptimeStartRequest, UptimeStartResponse, UptimeStopResponse,
    Player, Ticket, TicketHint, ValidationCriteria,
    ValidationCriteriaResult, ValidationReportModel,
    ValidateTicketRequest, PreflightCheckRequest, PreflightCheckResponse,
    ConsoleConnect, ConsoleMessage, APIResponse, TicketSubmission,
)


class TestEnums:
    def test_node_status_values(self):
        assert NodeStatus.STOPPED == "stopped"
        assert NodeStatus.STARTING == "starting"
        assert NodeStatus.RUNNING == "running"
        assert NodeStatus.STOPPING == "stopping"

    def test_node_type_values(self):
        assert NodeType.ROUTER == "router"
        assert NodeType.SWITCH == "switch"
        assert NodeType.FIREWALL == "firewall"
        assert NodeType.SERVER == "server"
        assert NodeType.LINUX == "linux"
        assert NodeType.WINDOWS == "windows"
        assert NodeType.OTHER == "other"

    def test_console_type_values(self):
        assert ConsoleType.TELNET == "telnet"
        assert ConsoleType.VNC == "vnc"
        assert ConsoleType.SSH == "ssh"
        assert ConsoleType.RDP == "rdp"

    def test_ticket_category_values(self):
        assert TicketCategory.NETWORK_BASICS == "network-basics"
        assert TicketCategory.SWITCHING == "switching"
        assert TicketCategory.ROUTING == "routing"
        assert TicketCategory.SECURITY == "security"
        assert TicketCategory.SYSTEMS == "systems"
        assert TicketCategory.AUTOMATION == "automation"


class TestEVENGModels:
    def test_eveng_status_creation(self):
        status = EVENGStatus(
            version="2.0.3-112",
            cpu=80,
            mem=16000,
            disk=500000,
            qemu=35,
            iol=20,
            dynamips=5,
        )
        assert status.version == "2.0.3-112"
        assert status.cpu == 80
        assert status.mem == 16000

    def test_lab_info_minimal(self):
        lab = LabInfo(id="lab1", name="Test Lab", path="/Test Lab.unl")
        assert lab.id == "lab1"
        assert lab.name == "Test Lab"
        assert lab.description is None

    def test_lab_info_full(self):
        lab = LabInfo(
            id="lab2",
            name="Full Lab",
            path="/Full Lab.unl",
            description="A test lab",
            author="admin",
            version="1.0",
        )
        assert lab.author == "admin"
        assert lab.version == "1.0"

    def test_node_info_defaults(self):
        node = NodeInfo(id=1, name="R1", template="vios")
        assert node.type == NodeType.OTHER
        assert node.status == NodeStatus.STOPPED
        assert node.console_type == ConsoleType.TELNET
        assert node.console_host is None
        assert node.console_port is None

    def test_network_info(self):
        net = NetworkInfo(id=1, name="Net1", type="bridge")
        assert net.id == 1
        assert net.type == "bridge"

    def test_network_info_visibility(self):
        net = NetworkInfo(id=2, name="Mgmt", type="bridge", visibility=0)
        assert net.visibility == 0


class TestUptimeModels:
    def test_node_uptime_stats_default(self):
        stats = NodeUptimeStats(node_id=1, node_name="R1")
        assert stats.node_id == 1
        assert stats.node_name == "R1"
        assert stats.current_status == NodeStatus.STOPPED
        assert stats.is_responsive is False
        assert stats.uptime_seconds == 0
        assert stats.downtime_seconds == 0
        assert stats.incident_count == 0

    def test_uptime_record_creation(self):
        record = UptimeRecord(
            node_id=1,
            node_name="R1",
            lab_path="/lab.unl",
            status=NodeStatus.RUNNING,
        )
        assert record.status == NodeStatus.RUNNING
        assert record.is_responsive is False

    def test_uptime_session_default(self):
        session = UptimeSession(
            session_id="sess-123",
            lab_path="/lab.unl",
        )
        assert session.session_id == "sess-123"
        assert session.is_active is True
        assert session.nodes == {}
        assert session.uptime_percentage == 100.0
        assert session.points_earned == 0

    def test_uptime_start_request(self):
        req = UptimeStartRequest(lab_path="/lab.unl", node_ids=[1, 2, 3])
        assert len(req.node_ids) == 3
        assert req.ticket_id is None

    def test_uptime_start_response(self):
        now = datetime.now()
        resp = UptimeStartResponse(
            session_id="sess-1",
            lab_path="/lab.unl",
            nodes=[1, 2],
            started_at=now,
        )
        assert resp.session_id == "sess-1"

    def test_uptime_update_creation(self):
        update = UptimeUpdate(
            session_id="sess-1",
            nodes={},
            uptime_percentage=99.5,
            points_earned=150,
            session_duration_seconds=300,
        )
        assert update.uptime_percentage == 99.5


class TestGameModels:
    def test_player_default(self):
        p = Player(id="p1", name="TestPlayer")
        assert p.level == 1
        assert p.title == "Help Desk Tech"
        assert p.floor == 5
        assert p.credits == 500

    def test_ticket_hint(self):
        hint = TicketHint(cost=25, text="Check the config")
        assert hint.cost == 25
        assert hint.revealed is False

    def test_validation_criteria_default(self):
        criteria = ValidationCriteria(type="ping", params={"source": "R1"})
        assert criteria.weight == 1.0
        assert criteria.required is True
        assert criteria.convergence_delay_ms == 0
        assert criteria.anti_cheat is False
        assert criteria.hint_on_fail == ""

    def test_ticket_creation(self):
        ticket = Ticket(
            id="T-001",
            title="Test Ticket",
            description="A test",
            category=TicketCategory.NETWORK_BASICS,
            difficulty=3,
            time_limit=15,
            reward_credits=200,
            reward_xp=100,
            lab_template="test_lab",
        )
        assert ticket.difficulty == 3
        assert ticket.time_limit == 15
        assert ticket.status == "available"

    def test_ticket_difficulty_bounds(self):
        """Verify difficulty is clamped 1-5."""
        with pytest.raises(Exception):
            Ticket(
                id="T-BAD",
                title="Bad",
                description="x",
                category=TicketCategory.NETWORK_BASICS,
                difficulty=6,
                time_limit=10,
                reward_credits=100,
                reward_xp=50,
                lab_template="test",
            )

    def test_ticket_submission(self):
        sub = TicketSubmission(ticket_id="T-001", player_id="p1")
        assert sub.ticket_id == "T-001"


class TestValidationModels:
    def test_validation_criteria_result(self):
        result = ValidationCriteriaResult(
            criterion_id="c1",
            check_type="ping",
            status="pass",
            passed=True,
            message="OK",
        )
        assert result.passed is True

    def test_validation_report_model(self):
        report = ValidationReportModel(
            ticket_id="T-001",
            outcome="full_pass",
            success=True,
            total_criteria=3,
            passed_criteria=3,
            failed_criteria=0,
            score=1.0,
            reward_multiplier=1.0,
        )
        assert report.score == 1.0
        assert report.anti_cheat_flags == []

    def test_validate_ticket_request(self):
        req = ValidateTicketRequest(
            ticket_id="T-001",
            validation_criteria=[{"type": "ping", "params": {"source": "R1"}}],
        )
        assert req.mock_cli_state is None

    def test_preflight_check_request(self):
        req = PreflightCheckRequest(
            ticket_id="T-001",
            lab_path="/lab.unl",
            preflight_criteria=[{"type": "ping", "params": {}}],
        )
        assert req.lab_path == "/lab.unl"


class TestAPIModels:
    def test_api_response_success(self):
        resp = APIResponse(success=True, message="OK", data={"key": "value"})
        assert resp.success is True
        assert resp.data == {"key": "value"}

    def test_api_response_failure(self):
        resp = APIResponse(success=False, message="Error")
        assert resp.success is False
        assert resp.data is None

    def test_console_connect(self):
        cc = ConsoleConnect(node_id=1, lab_path="/lab.unl")
        assert cc.node_id == 1
        assert cc.lab_path == "/lab.unl"

    def test_console_message_connected(self):
        msg = ConsoleMessage(type="connected", message="Console ready")
        assert msg.type == "connected"
        assert msg.data is None

    def test_console_message_resize(self):
        msg = ConsoleMessage(type="resize", cols=120, rows=40)
        assert msg.cols == 120
        assert msg.rows == 40
