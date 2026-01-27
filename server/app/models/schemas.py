"""
NetOps Tower - Pydantic Schemas
"""
from pydantic import BaseModel, Field
from typing import Optional, List, Dict, Any
from enum import Enum


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
    type: str  # 'ping', 'command', 'config'
    params: Dict[str, Any]


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
