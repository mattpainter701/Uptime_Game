"""
NetOps Tower - Game State and Ticket System

This module handles:
- Player progression and stats
- Ticket generation and management
- Lab assignment and validation
- Economy (credits, experience)
"""

import asyncio
import json
import logging
from typing import Dict, List, Optional, Any
from dataclasses import dataclass, field, asdict
from enum import Enum
from datetime import datetime, timedelta
import uuid
import random


# =============================================================================
# Enums and Constants
# =============================================================================

class TicketCategory(Enum):
    NETWORK_BASICS = "network_basics"
    SWITCHING = "switching"
    ROUTING = "routing"
    SECURITY = "security"
    SYSTEMS = "systems"
    AUTOMATION = "automation"


class TicketStatus(Enum):
    AVAILABLE = "available"
    IN_PROGRESS = "in_progress"
    COMPLETED = "completed"
    FAILED = "failed"
    EXPIRED = "expired"


class PlayerLevel(Enum):
    HELP_DESK_TECH = 1
    JUNIOR_NETADMIN = 2
    NETWORK_ADMIN = 3
    SENIOR_NETADMIN = 4
    NETWORK_ENGINEER = 5
    SENIOR_ENGINEER = 6
    PRINCIPAL_ENGINEER = 7
    CTO = 8


LEVEL_CONFIG = {
    PlayerLevel.HELP_DESK_TECH: {
        "name": "Help Desk Tech",
        "floor": 5,
        "xp_required": 0,
        "categories": [TicketCategory.NETWORK_BASICS],
        "max_difficulty": 1
    },
    PlayerLevel.JUNIOR_NETADMIN: {
        "name": "Junior NetAdmin",
        "floor": 10,
        "xp_required": 500,
        "categories": [TicketCategory.NETWORK_BASICS, TicketCategory.SWITCHING],
        "max_difficulty": 2
    },
    PlayerLevel.NETWORK_ADMIN: {
        "name": "Network Admin",
        "floor": 15,
        "xp_required": 1500,
        "categories": [TicketCategory.NETWORK_BASICS, TicketCategory.SWITCHING, TicketCategory.ROUTING],
        "max_difficulty": 3
    },
    PlayerLevel.SENIOR_NETADMIN: {
        "name": "Senior NetAdmin",
        "floor": 25,
        "xp_required": 4000,
        "categories": [TicketCategory.NETWORK_BASICS, TicketCategory.SWITCHING, TicketCategory.ROUTING, TicketCategory.SECURITY],
        "max_difficulty": 4
    },
    PlayerLevel.NETWORK_ENGINEER: {
        "name": "Network Engineer",
        "floor": 35,
        "xp_required": 8000,
        "categories": list(TicketCategory),
        "max_difficulty": 4
    },
    PlayerLevel.SENIOR_ENGINEER: {
        "name": "Senior Engineer",
        "floor": 40,
        "xp_required": 15000,
        "categories": list(TicketCategory),
        "max_difficulty": 5
    },
    PlayerLevel.PRINCIPAL_ENGINEER: {
        "name": "Principal Engineer",
        "floor": 45,
        "xp_required": 30000,
        "categories": list(TicketCategory),
        "max_difficulty": 5
    },
    PlayerLevel.CTO: {
        "name": "CTO",
        "floor": 50,
        "xp_required": 60000,
        "categories": list(TicketCategory),
        "max_difficulty": 5
    }
}


# =============================================================================
# Data Classes
# =============================================================================

@dataclass
class Hint:
    """A hint that can be purchased for a ticket"""
    id: str
    text: str
    cost: int
    revealed: bool = False


@dataclass
class ValidationCriteria:
    """Defines how to validate ticket completion"""
    type: str  # 'ping', 'command', 'config', 'api'
    params: Dict[str, Any] = field(default_factory=dict)


@dataclass
class TicketTemplate:
    """Template for generating tickets"""
    id: str
    title: str
    description: str
    category: TicketCategory
    difficulty: int  # 1-5
    base_time_limit: int  # minutes
    base_credits: int
    base_xp: int
    lab_path: str
    validation: List[ValidationCriteria]
    hints: List[Hint]
    prerequisite_tickets: List[str] = field(default_factory=list)
    tags: List[str] = field(default_factory=list)


@dataclass
class ActiveTicket:
    """An active ticket assigned to a player"""
    id: str
    template_id: str
    player_id: str
    status: TicketStatus
    started_at: datetime
    expires_at: Optional[datetime]
    lab_instance_path: str
    hints_revealed: List[str] = field(default_factory=list)
    attempts: int = 0
    
    @property
    def time_remaining(self) -> Optional[timedelta]:
        if self.expires_at:
            remaining = self.expires_at - datetime.utcnow()
            return remaining if remaining.total_seconds() > 0 else timedelta(0)
        return None
    
    @property
    def is_expired(self) -> bool:
        if self.expires_at:
            return datetime.utcnow() > self.expires_at
        return False


@dataclass
class PlayerStats:
    """Player statistics and progression"""
    id: str
    username: str
    level: PlayerLevel = PlayerLevel.HELP_DESK_TECH
    xp: int = 0
    credits: int = 1000  # Starting money
    reputation: int = 0
    tickets_completed: int = 0
    tickets_failed: int = 0
    total_time_played: int = 0  # seconds
    current_streak: int = 0
    best_streak: int = 0
    achievements: List[str] = field(default_factory=list)
    certifications: List[str] = field(default_factory=list)
    office_upgrades: List[str] = field(default_factory=list)
    created_at: datetime = field(default_factory=datetime.utcnow)
    last_active: datetime = field(default_factory=datetime.utcnow)
    
    def add_xp(self, amount: int) -> bool:
        """Add XP and check for level up. Returns True if leveled up."""
        self.xp += amount
        new_level = self._calculate_level()
        if new_level != self.level:
            self.level = new_level
            return True
        return False
        
    def _calculate_level(self) -> PlayerLevel:
        """Calculate level based on XP"""
        for level in reversed(list(PlayerLevel)):
            if self.xp >= LEVEL_CONFIG[level]["xp_required"]:
                return level
        return PlayerLevel.HELP_DESK_TECH
        
    @property
    def floor(self) -> int:
        return LEVEL_CONFIG[self.level]["floor"]
        
    @property
    def level_name(self) -> str:
        return LEVEL_CONFIG[self.level]["name"]
        
    @property
    def available_categories(self) -> List[TicketCategory]:
        return LEVEL_CONFIG[self.level]["categories"]
        
    @property
    def max_difficulty(self) -> int:
        return LEVEL_CONFIG[self.level]["max_difficulty"]


@dataclass
class CompletionResult:
    """Result of completing a ticket"""
    success: bool
    credits_earned: int
    xp_earned: int
    reputation_change: int
    time_bonus: int
    streak_bonus: int
    validation_results: List[Dict]
    leveled_up: bool = False
    new_level: Optional[PlayerLevel] = None
    achievements_unlocked: List[str] = field(default_factory=list)


# =============================================================================
# Ticket Repository
# =============================================================================

class TicketRepository:
    """
    Manages ticket templates
    
    In production, this would load from a database
    """
    
    def __init__(self):
        self.templates: Dict[str, TicketTemplate] = {}
        self._load_default_templates()
        
    def _load_default_templates(self):
        """Load built-in ticket templates"""
        
        # Network Basics - Default Route
        self.templates["NET-001"] = TicketTemplate(
            id="NET-001",
            title="Server Can't Reach Internet",
            description="""The web server (192.168.1.100) cannot reach external sites.
It can ping its gateway (192.168.1.1) but nothing beyond.
Please investigate the router configuration.

Affected Systems: Web Server (SERVER1)
Impact: High - No external connectivity
SLA: 10 minutes""",
            category=TicketCategory.NETWORK_BASICS,
            difficulty=1,
            base_time_limit=10,
            base_credits=100,
            base_xp=50,
            lab_path="/game/labs/basic_default_route.unl",
            validation=[
                ValidationCriteria(
                    type="ping",
                    params={
                        "source_node": "SERVER",
                        "destination": "8.8.8.8",
                        "success_rate": 100
                    }
                )
            ],
            hints=[
                Hint(id="h1", text="Check the routing table on the router with 'show ip route'", cost=25),
                Hint(id="h2", text="Look for a default route (0.0.0.0/0) - it might be missing", cost=50),
                Hint(id="h3", text="Add: ip route 0.0.0.0 0.0.0.0 <next-hop-ip>", cost=75)
            ],
            tags=["routing", "default-route", "beginner"]
        )
        
        # Network Basics - DHCP
        self.templates["NET-002"] = TicketTemplate(
            id="NET-002",
            title="DHCP Not Assigning IPs",
            description="""Workstations in VLAN 10 are not receiving IP addresses.
The DHCP server is configured but clients get APIPA addresses (169.254.x.x).

Affected Systems: All workstations in VLAN 10
Impact: Critical - Users cannot work""",
            category=TicketCategory.NETWORK_BASICS,
            difficulty=2,
            base_time_limit=15,
            base_credits=200,
            base_xp=100,
            lab_path="/game/labs/dhcp_troubleshoot.unl",
            validation=[
                ValidationCriteria(
                    type="command",
                    params={
                        "node": "PC1",
                        "command": "ip addr",
                        "contains": ["10.10.10."]
                    }
                )
            ],
            hints=[
                Hint(id="h1", text="Check if the DHCP server interface is up", cost=50),
                Hint(id="h2", text="DHCP relay might be needed on the router", cost=75),
                Hint(id="h3", text="Use 'ip helper-address' on the router interface", cost=100)
            ],
            tags=["dhcp", "ip-addressing", "helper-address"]
        )
        
        # Switching - VLAN Mismatch
        self.templates["SW-001"] = TicketTemplate(
            id="SW-001",
            title="Two PCs Can't Communicate",
            description="""PC1 (10.10.10.10) and PC2 (10.10.10.20) are on the same switch
but cannot ping each other. Both ports show up as connected.

Network Diagram shows both should be on VLAN 10.
Both PCs have correct static IPs configured.

Please investigate the switch configuration.""",
            category=TicketCategory.SWITCHING,
            difficulty=2,
            base_time_limit=15,
            base_credits=200,
            base_xp=100,
            lab_path="/game/labs/vlan_mismatch.unl",
            validation=[
                ValidationCriteria(
                    type="ping",
                    params={
                        "source_node": "PC1",
                        "destination": "10.10.10.20",
                        "success_rate": 100
                    }
                ),
                ValidationCriteria(
                    type="command",
                    params={
                        "node": "SW1",
                        "command": "show vlan brief",
                        "contains": ["Fa0/1", "Fa0/2", "10"]
                    }
                )
            ],
            hints=[
                Hint(id="h1", text="Use 'show vlan brief' to see port assignments", cost=50),
                Hint(id="h2", text="Check which VLANs ports Fa0/1 and Fa0/2 are in", cost=75),
                Hint(id="h3", text="Use 'switchport access vlan 10' to fix port assignment", cost=100)
            ],
            tags=["vlan", "switching", "access-ports"]
        )
        
        # Routing - OSPF Neighbor
        self.templates["RT-001"] = TicketTemplate(
            id="RT-001",
            title="OSPF Neighbors Not Forming",
            description="""R1 and R2 should form an OSPF neighbor relationship, but they aren't.
Both routers are directly connected via Gi0/0.
Users between sites report intermittent connectivity.

R1: 10.0.0.1/30 on Gi0/0
R2: 10.0.0.2/30 on Gi0/0

OSPF Area 0 is configured on both routers.""",
            category=TicketCategory.ROUTING,
            difficulty=3,
            base_time_limit=20,
            base_credits=350,
            base_xp=175,
            lab_path="/game/labs/ospf_neighbor.unl",
            validation=[
                ValidationCriteria(
                    type="command",
                    params={
                        "node": "R1",
                        "command": "show ip ospf neighbor",
                        "contains": ["FULL"]
                    }
                ),
                ValidationCriteria(
                    type="ping",
                    params={
                        "source_node": "R1",
                        "destination": "2.2.2.2",  # R2 loopback
                        "success_rate": 100
                    }
                )
            ],
            hints=[
                Hint(id="h1", text="Check 'show ip ospf interface' on both routers", cost=75),
                Hint(id="h2", text="OSPF network types must match (point-to-point vs broadcast)", cost=100),
                Hint(id="h3", text="Check hello/dead timers and area IDs match", cost=125)
            ],
            tags=["ospf", "routing", "neighbors"]
        )
        
        # Security - ACL Block
        self.templates["SEC-001"] = TicketTemplate(
            id="SEC-001",
            title="Web Traffic Blocked",
            description="""The web server (192.168.100.10) is reachable via ping but HTTP (port 80)
and HTTPS (port 443) are blocked.

The firewall was recently updated with new ACLs.
Management wants web traffic to be allowed from the internal network (10.0.0.0/8)
but blocked from other sources.

Current symptoms: Ping works, HTTP/HTTPS timeout.""",
            category=TicketCategory.SECURITY,
            difficulty=3,
            base_time_limit=20,
            base_credits=400,
            base_xp=200,
            lab_path="/game/labs/acl_web_block.unl",
            validation=[
                ValidationCriteria(
                    type="command",
                    params={
                        "node": "CLIENT",
                        "command": "curl -I http://192.168.100.10",
                        "contains": ["HTTP/1.1"]
                    }
                )
            ],
            hints=[
                Hint(id="h1", text="Review the access-list with 'show access-lists'", cost=75),
                Hint(id="h2", text="Check if TCP ports 80 and 443 are explicitly permitted", cost=100),
                Hint(id="h3", text="Remember: ACLs are processed top-down, first match wins", cost=125)
            ],
            tags=["acl", "security", "firewall", "web"]
        )
        
        # BGP - Peer Not Established
        self.templates["RT-010"] = TicketTemplate(
            id="RT-010",
            title="BGP Peer Stuck in Active State",
            description="""BGP peering between our AS (65001) and the ISP (AS 65002) is not establishing.
The peer state shows 'Active' instead of 'Established'.

Configuration was recently changed for a new IP block.
Physical connectivity is verified working.

ISP Contact confirms their side is configured correctly for:
- Neighbor: 203.0.113.1 (our side)
- Remote AS: 65001
- Their IP: 203.0.113.2""",
            category=TicketCategory.ROUTING,
            difficulty=4,
            base_time_limit=25,
            base_credits=500,
            base_xp=250,
            lab_path="/game/labs/bgp_peer_issue.unl",
            validation=[
                ValidationCriteria(
                    type="command",
                    params={
                        "node": "R1",
                        "command": "show ip bgp summary",
                        "contains": ["65002", "Established"]
                    }
                )
            ],
            hints=[
                Hint(id="h1", text="Check BGP configuration with 'show run | section bgp'", cost=100),
                Hint(id="h2", text="Verify neighbor IP and remote AS are correct", cost=125),
                Hint(id="h3", text="Check if update-source is set correctly", cost=150)
            ],
            prerequisite_tickets=["RT-001"],
            tags=["bgp", "routing", "isp", "peering"]
        )
        
    def get_template(self, template_id: str) -> Optional[TicketTemplate]:
        """Get a ticket template by ID"""
        return self.templates.get(template_id)
        
    def get_templates_for_player(self, player: PlayerStats) -> List[TicketTemplate]:
        """Get available ticket templates for a player based on their level"""
        available = []
        for template in self.templates.values():
            # Check category unlock
            if template.category not in player.available_categories:
                continue
            # Check difficulty
            if template.difficulty > player.max_difficulty:
                continue
            # Check prerequisites (simplified - just check if tickets were completed)
            # In production, you'd check actual completion records
            available.append(template)
        return available
        
    def get_random_ticket(self, player: PlayerStats) -> Optional[TicketTemplate]:
        """Get a random ticket appropriate for the player"""
        available = self.get_templates_for_player(player)
        if not available:
            return None
        return random.choice(available)


# =============================================================================
# Game State Manager
# =============================================================================

class GameStateManager:
    """
    Manages game state for all players
    
    In production, this would use a database backend
    """
    
    def __init__(self):
        self.players: Dict[str, PlayerStats] = {}
        self.active_tickets: Dict[str, ActiveTicket] = {}  # ticket_id -> ticket
        self.ticket_repo = TicketRepository()
        self.logger = logging.getLogger("game-state")
        
    # -------------------------------------------------------------------------
    # Player Management
    # -------------------------------------------------------------------------
    
    def get_player(self, player_id: str) -> Optional[PlayerStats]:
        """Get player stats"""
        return self.players.get(player_id)
        
    def create_player(self, player_id: str, username: str) -> PlayerStats:
        """Create a new player"""
        if player_id in self.players:
            return self.players[player_id]
            
        player = PlayerStats(
            id=player_id,
            username=username
        )
        self.players[player_id] = player
        self.logger.info(f"Created new player: {username} ({player_id})")
        return player
        
    def save_player(self, player: PlayerStats):
        """Save player state"""
        self.players[player.id] = player
        player.last_active = datetime.utcnow()
        
    # -------------------------------------------------------------------------
    # Ticket Management
    # -------------------------------------------------------------------------
    
    def get_available_tickets(self, player_id: str) -> List[Dict]:
        """Get list of tickets available to a player"""
        player = self.get_player(player_id)
        if not player:
            return []
            
        templates = self.ticket_repo.get_templates_for_player(player)
        return [
            {
                "id": t.id,
                "title": t.title,
                "category": t.category.value,
                "difficulty": t.difficulty,
                "credits": t.base_credits,
                "xp": t.base_xp,
                "time_limit": t.base_time_limit
            }
            for t in templates
        ]
        
    def get_active_ticket(self, player_id: str) -> Optional[ActiveTicket]:
        """Get player's currently active ticket"""
        for ticket in self.active_tickets.values():
            if ticket.player_id == player_id and ticket.status == TicketStatus.IN_PROGRESS:
                return ticket
        return None
        
    async def assign_ticket(
        self,
        player_id: str,
        template_id: str,
        lab_manager: Any  # GameLabManager from eveng_client
    ) -> Optional[ActiveTicket]:
        """
        Assign a ticket to a player
        
        Returns the active ticket or None if assignment failed
        """
        player = self.get_player(player_id)
        if not player:
            return None
            
        # Check if player already has an active ticket
        existing = self.get_active_ticket(player_id)
        if existing:
            self.logger.warning(f"Player {player_id} already has active ticket {existing.id}")
            return None
            
        # Get template
        template = self.ticket_repo.get_template(template_id)
        if not template:
            self.logger.error(f"Template not found: {template_id}")
            return None
            
        # Create lab instance
        try:
            lab_info = await lab_manager.start_lab_for_ticket(
                player_id=player_id,
                ticket_lab_path=template.lab_path
            )
        except Exception as e:
            self.logger.error(f"Failed to start lab: {e}")
            return None
            
        # Create active ticket
        ticket_id = str(uuid.uuid4())[:8]
        now = datetime.utcnow()
        
        ticket = ActiveTicket(
            id=ticket_id,
            template_id=template_id,
            player_id=player_id,
            status=TicketStatus.IN_PROGRESS,
            started_at=now,
            expires_at=now + timedelta(minutes=template.base_time_limit) if template.base_time_limit else None,
            lab_instance_path=lab_info["lab_path"]
        )
        
        self.active_tickets[ticket_id] = ticket
        self.logger.info(f"Assigned ticket {ticket_id} ({template_id}) to player {player_id}")
        
        return ticket
        
    async def submit_ticket(
        self,
        player_id: str,
        ticket_id: str,
        lab_manager: Any
    ) -> CompletionResult:
        """
        Submit a ticket for validation
        """
        ticket = self.active_tickets.get(ticket_id)
        if not ticket or ticket.player_id != player_id:
            return CompletionResult(
                success=False,
                credits_earned=0,
                xp_earned=0,
                reputation_change=0,
                time_bonus=0,
                streak_bonus=0,
                validation_results=[{"error": "Invalid ticket"}]
            )
            
        player = self.get_player(player_id)
        template = self.ticket_repo.get_template(ticket.template_id)
        
        if not player or not template:
            return CompletionResult(
                success=False,
                credits_earned=0,
                xp_earned=0,
                reputation_change=0,
                time_bonus=0,
                streak_bonus=0,
                validation_results=[{"error": "Invalid player or template"}]
            )
            
        # Increment attempt counter
        ticket.attempts += 1
        
        # Check if expired
        if ticket.is_expired:
            ticket.status = TicketStatus.EXPIRED
            player.tickets_failed += 1
            player.current_streak = 0
            player.reputation -= 5
            self.save_player(player)
            
            return CompletionResult(
                success=False,
                credits_earned=0,
                xp_earned=0,
                reputation_change=-5,
                time_bonus=0,
                streak_bonus=0,
                validation_results=[{"error": "Ticket expired"}]
            )
            
        # Run validation
        validation_result = await lab_manager.validate_ticket_completion(
            player_id=player_id,
            validations=[asdict(v) for v in template.validation]
        )
        
        if validation_result["success"]:
            # Calculate rewards
            time_remaining = ticket.time_remaining
            time_bonus = 0
            if time_remaining and ticket.expires_at:
                total_time = (ticket.expires_at - ticket.started_at).total_seconds()
                time_used = total_time - time_remaining.total_seconds()
                time_ratio = 1 - (time_used / total_time)
                time_bonus = int(template.base_credits * 0.5 * time_ratio)
                
            streak_bonus = min(player.current_streak * 10, 100)  # Max 100
            
            credits_earned = template.base_credits + time_bonus + streak_bonus
            xp_earned = template.base_xp
            reputation_change = 10 + template.difficulty * 5
            
            # Apply rewards
            leveled_up = player.add_xp(xp_earned)
            player.credits += credits_earned
            player.reputation += reputation_change
            player.tickets_completed += 1
            player.current_streak += 1
            player.best_streak = max(player.best_streak, player.current_streak)
            
            # Mark ticket completed
            ticket.status = TicketStatus.COMPLETED
            
            self.save_player(player)
            
            # Cleanup lab
            await lab_manager.cleanup_player_lab(player_id)
            
            return CompletionResult(
                success=True,
                credits_earned=credits_earned,
                xp_earned=xp_earned,
                reputation_change=reputation_change,
                time_bonus=time_bonus,
                streak_bonus=streak_bonus,
                validation_results=validation_result["results"],
                leveled_up=leveled_up,
                new_level=player.level if leveled_up else None
            )
        else:
            # Failed attempt
            return CompletionResult(
                success=False,
                credits_earned=0,
                xp_earned=0,
                reputation_change=0,
                time_bonus=0,
                streak_bonus=0,
                validation_results=validation_result["results"]
            )
            
    async def abandon_ticket(
        self,
        player_id: str,
        ticket_id: str,
        lab_manager: Any
    ) -> Dict:
        """Abandon a ticket (player gives up)"""
        ticket = self.active_tickets.get(ticket_id)
        if not ticket or ticket.player_id != player_id:
            return {"success": False, "error": "Invalid ticket"}
            
        player = self.get_player(player_id)
        if not player:
            return {"success": False, "error": "Invalid player"}
            
        # Mark as failed
        ticket.status = TicketStatus.FAILED
        player.tickets_failed += 1
        player.current_streak = 0
        player.reputation -= 10
        
        self.save_player(player)
        
        # Cleanup lab
        await lab_manager.cleanup_player_lab(player_id)
        
        return {
            "success": True,
            "reputation_change": -10
        }
        
    def reveal_hint(self, player_id: str, ticket_id: str, hint_id: str) -> Dict:
        """Reveal a hint for a ticket (costs credits)"""
        ticket = self.active_tickets.get(ticket_id)
        if not ticket or ticket.player_id != player_id:
            return {"success": False, "error": "Invalid ticket"}
            
        player = self.get_player(player_id)
        template = self.ticket_repo.get_template(ticket.template_id)
        
        if not player or not template:
            return {"success": False, "error": "Invalid player or template"}
            
        # Find hint
        hint = None
        for h in template.hints:
            if h.id == hint_id:
                hint = h
                break
                
        if not hint:
            return {"success": False, "error": "Invalid hint"}
            
        # Check if already revealed
        if hint_id in ticket.hints_revealed:
            return {"success": False, "error": "Hint already revealed"}
            
        # Check credits
        if player.credits < hint.cost:
            return {"success": False, "error": "Insufficient credits"}
            
        # Deduct credits and reveal
        player.credits -= hint.cost
        ticket.hints_revealed.append(hint_id)
        
        self.save_player(player)
        
        return {
            "success": True,
            "hint_text": hint.text,
            "cost": hint.cost,
            "credits_remaining": player.credits
        }
        
    # -------------------------------------------------------------------------
    # Economy
    # -------------------------------------------------------------------------
    
    def purchase_item(self, player_id: str, item_type: str, item_id: str) -> Dict:
        """Purchase an item (certification, upgrade, etc.)"""
        player = self.get_player(player_id)
        if not player:
            return {"success": False, "error": "Invalid player"}
            
        # Define items (in production, load from config/database)
        items = {
            "certification": {
                "ccna": {"cost": 1000, "name": "CCNA"},
                "ccnp": {"cost": 2500, "name": "CCNP"},
                "security+": {"cost": 800, "name": "Security+"}
            },
            "office_upgrade": {
                "standing_desk": {"cost": 500, "name": "Standing Desk"},
                "dual_monitor": {"cost": 750, "name": "Dual Monitor"},
                "mechanical_kb": {"cost": 300, "name": "Mechanical Keyboard"},
                "plant": {"cost": 100, "name": "Office Plant"},
                "coffee_machine": {"cost": 400, "name": "Coffee Machine"}
            }
        }
        
        if item_type not in items or item_id not in items[item_type]:
            return {"success": False, "error": "Invalid item"}
            
        item = items[item_type][item_id]
        
        if player.credits < item["cost"]:
            return {"success": False, "error": "Insufficient credits"}
            
        # Check if already owned
        if item_type == "certification" and item_id in player.certifications:
            return {"success": False, "error": "Already owned"}
        if item_type == "office_upgrade" and item_id in player.office_upgrades:
            return {"success": False, "error": "Already owned"}
            
        # Purchase
        player.credits -= item["cost"]
        
        if item_type == "certification":
            player.certifications.append(item_id)
        elif item_type == "office_upgrade":
            player.office_upgrades.append(item_id)
            
        self.save_player(player)
        
        return {
            "success": True,
            "item": item["name"],
            "cost": item["cost"],
            "credits_remaining": player.credits
        }
        
    # -------------------------------------------------------------------------
    # Serialization
    # -------------------------------------------------------------------------
    
    def get_player_state(self, player_id: str) -> Optional[Dict]:
        """Get full player state for client"""
        player = self.get_player(player_id)
        if not player:
            return None
            
        active_ticket = self.get_active_ticket(player_id)
        template = None
        if active_ticket:
            template = self.ticket_repo.get_template(active_ticket.template_id)
            
        return {
            "player": {
                "id": player.id,
                "username": player.username,
                "level": player.level.value,
                "level_name": player.level_name,
                "floor": player.floor,
                "xp": player.xp,
                "credits": player.credits,
                "reputation": player.reputation,
                "tickets_completed": player.tickets_completed,
                "tickets_failed": player.tickets_failed,
                "current_streak": player.current_streak,
                "best_streak": player.best_streak,
                "certifications": player.certifications,
                "office_upgrades": player.office_upgrades
            },
            "active_ticket": {
                "id": active_ticket.id,
                "template_id": active_ticket.template_id,
                "title": template.title if template else "",
                "description": template.description if template else "",
                "category": template.category.value if template else "",
                "difficulty": template.difficulty if template else 0,
                "time_remaining": active_ticket.time_remaining.total_seconds() if active_ticket.time_remaining else None,
                "attempts": active_ticket.attempts,
                "hints_available": len(template.hints) if template else 0,
                "hints_revealed": len(active_ticket.hints_revealed)
            } if active_ticket else None
        }


# =============================================================================
# Singleton Instance
# =============================================================================

game_state = GameStateManager()
