"""
NetOps Tower - Pydantic Schemas
"""
from pydantic import BaseModel, Field
from typing import Optional, List, Dict, Any
from enum import Enum
from datetime import datetime


# ============================================================================
# Enums
# ============================================================================

class NodeStatus(str, Enum):
    STOPPED = "stopped"
    STARTING = "starting"
    RUNNING = "running"
    STOPPING = "stopping"


class NodeType(str, Enum):
    ROUTER = "router"
    SWITCH = "switch"
    FIREWALL = "firewall"
    SERVER = "server"
    LINUX = "linux"
    WINDOWS = "windows"
    OTHER = "other"


class ConsoleType(str, Enum):
    TELNET = "telnet"
    VNC = "vnc"
    SSH = "ssh"
    RDP = "rdp"


# ============================================================================
# EVE-NG Models
# ============================================================================

class EVENGAuth(BaseModel):
    username: str
    password: str


class EVENGStatus(BaseModel):
    version: str
    cpu: int
    mem: int
    disk: int
    qemu: int
    iol: int
    dynamips: int


class LabInfo(BaseModel):
    id: str
    name: str
    path: str
    description: Optional[str] = None
    author: Optional[str] = None
    version: Optional[str] = None


class NodeInfo(BaseModel):
    id: int
    name: str
    template: str
    type: NodeType = NodeType.OTHER
    status: NodeStatus = NodeStatus.STOPPED
    console_type: ConsoleType = ConsoleType.TELNET
    console_host: Optional[str] = None
    console_port: Optional[int] = None
    url: Optional[str] = None
    cpu: Optional[int] = None
    ram: Optional[int] = None
    ethernet: Optional[int] = None
    image: Optional[str] = None
    icon: Optional[str] = None
    left: Optional[int] = None
    top: Optional[int] = None


class NetworkInfo(BaseModel):
    id: int
    name: str
    type: str
    visibility: Optional[int] = None


class LabTopology(BaseModel):
    nodes: List[NodeInfo]
    networks: List[NetworkInfo]
    connections: List[Dict[str, Any]] = []


# ============================================================================
# Console Models
# ============================================================================

class ConsoleConnect(BaseModel):
    node_id: int
    lab_path: str


class ConsoleMessage(BaseModel):
    type: str  # 'data', 'resize', 'ping', 'connected', 'error'
    data: Optional[str] = None
    cols: Optional[int] = None
    rows: Optional[int] = None
    message: Optional[str] = None


# ============================================================================
# Uptime Tracking Models
# ============================================================================

class NodeUptimeStats(BaseModel):
    """Statistics for a single node's uptime."""
    node_id: int
    node_name: str
    current_status: NodeStatus = NodeStatus.STOPPED
    is_responsive: bool = False  # actual connectivity check result
    uptime_seconds: int = 0
    downtime_seconds: int = 0
    last_status_change: datetime = Field(default_factory=datetime.now)
    incident_count: int = 0  # number of down events


class UptimeRecord(BaseModel):
    """A single point-in-time record of node status."""
    node_id: int
    node_name: str
    lab_path: str
    status: NodeStatus
    timestamp: datetime = Field(default_factory=datetime.now)
    is_responsive: bool = False


class UptimeSession(BaseModel):
    """An active uptime tracking session for a ticket/lab."""
    session_id: str
    lab_path: str
    started_at: datetime = Field(default_factory=datetime.now)
    ended_at: Optional[datetime] = None
    is_active: bool = True
    nodes: Dict[int, NodeUptimeStats] = {}  # node_id -> stats
    total_uptime_seconds: int = 0
    total_downtime_seconds: int = 0
    uptime_percentage: float = 100.0
    points_earned: int = 0
    total_incidents: int = 0


class UptimeStartRequest(BaseModel):
    """Request to start uptime tracking."""
    lab_path: str
    node_ids: List[int]
    ticket_id: Optional[str] = None


class UptimeStartResponse(BaseModel):
    """Response when uptime tracking starts."""
    session_id: str
    lab_path: str
    nodes: List[int]
    started_at: datetime


class UptimeStopResponse(BaseModel):
    """Response when uptime tracking stops."""
    session: UptimeSession
    final_points: int
    bonus_multiplier: float
    summary: str


class UptimeUpdate(BaseModel):
    """Real-time uptime update pushed via WebSocket."""
    session_id: str
    timestamp: datetime = Field(default_factory=datetime.now)
    nodes: Dict[int, NodeUptimeStats]
    uptime_percentage: float
    points_earned: int
    session_duration_seconds: int


# ============================================================================
# Game Models
# ============================================================================

class Player(BaseModel):
    id: str
    name: str
    level: int = 1
    title: str = "Help Desk Tech"
    floor: int = 5
    credits: int = 500
    reputation: int = 0
    xp: int = 0


class TicketCategory(str, Enum):
    NETWORK_BASICS = "network-basics"
    SWITCHING = "switching"
    ROUTING = "routing"
    SECURITY = "security"
    SYSTEMS = "systems"
    AUTOMATION = "automation"


class TicketHint(BaseModel):
    cost: int
    text: str
    revealed: bool = False


class ValidationCriteria(BaseModel):
    type: str  # 'ping', 'command', 'config', 'api'
    params: Dict[str, Any]
    id: Optional[str] = None  # unique criterion id for reporting
    weight: float = 1.0  # relative weight for partial scoring
    required: bool = True  # if True, failure blocks full_pass
    convergence_delay_ms: int = 0  # delay before checking (e.g., OSPF convergence)
    hint_on_fail: str = ""  # hint shown when this criterion fails
    anti_cheat: bool = False  # if True, bypassing triggers anti-cheat flag


class Ticket(BaseModel):
    id: str
    title: str
    description: str
    category: TicketCategory
    difficulty: int = Field(ge=1, le=5)
    time_limit: int  # minutes
    reward_credits: int
    reward_xp: int
    lab_template: str
    hints: List[TicketHint] = []
    validation: List[ValidationCriteria] = []
    status: str = "available"


class TicketSubmission(BaseModel):
    ticket_id: str
    player_id: str


class ValidationResult(BaseModel):
    success: bool
    passed: List[str] = []
    failed: List[str] = []
    message: str = ""


# ============================================================================
# Validation Engine v2 Models
# ============================================================================

class ValidationCriteriaResult(BaseModel):
    """Result of a single validation criterion."""
    criterion_id: str
    check_type: str  # 'ping', 'command', 'config', 'api'
    status: str  # 'pass', 'fail', 'skipped', 'timed_out', 'error'
    passed: bool
    message: str = ""
    hint: str = ""
    duration_ms: float = 0.0
    expected: Optional[Any] = None
    actual: Optional[Any] = None
    params: Dict[str, Any] = {}


class ValidationReportModel(BaseModel):
    """Complete validation report for a ticket."""
    ticket_id: str
    outcome: str  # 'full_pass', 'partial_pass', 'full_fail', 'error'
    success: bool  # true if full_pass or partial_pass
    total_criteria: int
    passed_criteria: int
    failed_criteria: int
    score: float  # 0.0 to 1.0
    reward_multiplier: float  # applied to base reward
    criteria_results: List[ValidationCriteriaResult] = []
    preflight_passed: Optional[bool] = None
    anti_cheat_flags: List[str] = []
    total_duration_ms: float = 0.0
    message: str = ""
    hints: List[str] = []


class ValidateTicketRequest(BaseModel):
    """Request to validate a ticket."""
    ticket_id: str
    validation_criteria: List[Dict[str, Any]]
    mock_cli_state: Optional[Dict[str, Any]] = None  # for fallback mode
    command_history: Optional[List[Dict[str, Any]]] = None
    script: Optional[Dict[str, Any]] = None  # multi-step validation script


class PreflightCheckRequest(BaseModel):
    """Request to run pre-flight checks."""
    ticket_id: str
    lab_path: str
    preflight_criteria: List[Dict[str, Any]]


class PreflightCheckResponse(BaseModel):
    """Response from pre-flight checks."""
    passed: bool
    lab_correctly_broken: bool
    checks: List[ValidationCriteriaResult] = []
    message: str = ""


# ============================================================================
# API Response Models
# ============================================================================

class APIResponse(BaseModel):
    success: bool
    message: str = ""
    data: Optional[Any] = None


class LabListResponse(BaseModel):
    labs: List[LabInfo]


class NodeListResponse(BaseModel):
    nodes: List[NodeInfo]
