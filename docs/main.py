"""
NetOps Tower - Main Game Server

FastAPI-based REST API server that:
- Handles player authentication
- Manages game state
- Coordinates with EVE-NG
- Provides WebSocket endpoints for terminals
"""

import asyncio
import logging
from typing import Optional, Dict, Any
from contextlib import asynccontextmanager

from fastapi import FastAPI, HTTPException, Depends, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from pydantic import BaseModel, Field
import jwt
from datetime import datetime, timedelta
import os

# Local imports
from eveng_client import EveNGClient, GameLabManager
from game_state import GameStateManager, PlayerStats
from ws_telnet_proxy import GameTerminalServer

# =============================================================================
# Configuration
# =============================================================================

class Config:
    """Server configuration"""
    # EVE-NG connection
    EVE_NG_HOST = os.getenv("EVE_NG_HOST", "localhost")
    EVE_NG_USERNAME = os.getenv("EVE_NG_USERNAME", "admin")
    EVE_NG_PASSWORD = os.getenv("EVE_NG_PASSWORD", "eve")
    EVE_NG_PORT = int(os.getenv("EVE_NG_PORT", "80"))
    EVE_NG_PROTOCOL = os.getenv("EVE_NG_PROTOCOL", "http")
    
    # JWT settings
    JWT_SECRET = os.getenv("JWT_SECRET", "your-secret-key-change-in-production")
    JWT_ALGORITHM = "HS256"
    JWT_EXPIRATION_HOURS = 24
    
    # Server settings
    API_HOST = os.getenv("API_HOST", "0.0.0.0")
    API_PORT = int(os.getenv("API_PORT", "8000"))
    WS_PORT = int(os.getenv("WS_PORT", "8765"))
    
    # CORS
    CORS_ORIGINS = os.getenv("CORS_ORIGINS", "*").split(",")


config = Config()

# =============================================================================
# Logging
# =============================================================================

logging.basicConfig(
    level=logging.DEBUG,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger("game-server")

# =============================================================================
# Global State
# =============================================================================

eve_client: Optional[EveNGClient] = None
lab_manager: Optional[GameLabManager] = None
game_state: Optional[GameStateManager] = None
terminal_server: Optional[GameTerminalServer] = None

# =============================================================================
# Lifecycle
# =============================================================================

@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application lifecycle management"""
    global eve_client, lab_manager, game_state, terminal_server
    
    logger.info("Starting NetOps Tower server...")
    
    # Initialize EVE-NG client
    eve_client = EveNGClient(
        host=config.EVE_NG_HOST,
        username=config.EVE_NG_USERNAME,
        password=config.EVE_NG_PASSWORD,
        port=config.EVE_NG_PORT,
        protocol=config.EVE_NG_PROTOCOL
    )
    
    try:
        await eve_client.connect()
        await eve_client.login()
        logger.info(f"Connected to EVE-NG at {config.EVE_NG_HOST}")
        
        status = await eve_client.get_server_status()
        logger.info(f"EVE-NG version: {status.version}")
    except Exception as e:
        logger.warning(f"Failed to connect to EVE-NG: {e}")
        logger.warning("Running in offline mode - lab features disabled")
    
    # Initialize lab manager
    lab_manager = GameLabManager(eve_client)
    
    # Initialize game state
    game_state = GameStateManager()
    
    # Start terminal WebSocket server in background
    terminal_server = GameTerminalServer(
        host=config.API_HOST,
        port=config.WS_PORT,
        eve_host=config.EVE_NG_HOST
    )
    asyncio.create_task(terminal_server.start())
    logger.info(f"Terminal WebSocket server on port {config.WS_PORT}")
    
    yield
    
    # Cleanup
    logger.info("Shutting down...")
    if eve_client:
        await eve_client.logout()
        await eve_client.close()


# =============================================================================
# FastAPI App
# =============================================================================

app = FastAPI(
    title="NetOps Tower API",
    description="Backend API for the NetOps Tower network engineering game",
    version="0.1.0",
    lifespan=lifespan
)

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=config.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Security
security = HTTPBearer()

# =============================================================================
# Request/Response Models
# =============================================================================

class LoginRequest(BaseModel):
    username: str
    password: str


class LoginResponse(BaseModel):
    token: str
    player: Dict[str, Any]


class CreatePlayerRequest(BaseModel):
    username: str


class TicketAssignRequest(BaseModel):
    template_id: str


class TicketSubmitRequest(BaseModel):
    ticket_id: str


class HintRevealRequest(BaseModel):
    ticket_id: str
    hint_id: str


class PurchaseRequest(BaseModel):
    item_type: str  # 'certification' or 'office_upgrade'
    item_id: str


class TerminalConnectRequest(BaseModel):
    node_id: int
    lab_path: str


# =============================================================================
# Authentication Helpers
# =============================================================================

def create_token(player_id: str) -> str:
    """Create JWT token for player"""
    payload = {
        "sub": player_id,
        "exp": datetime.utcnow() + timedelta(hours=config.JWT_EXPIRATION_HOURS),
        "iat": datetime.utcnow()
    }
    return jwt.encode(payload, config.JWT_SECRET, algorithm=config.JWT_ALGORITHM)


def verify_token(credentials: HTTPAuthorizationCredentials = Depends(security)) -> str:
    """Verify JWT token and return player_id"""
    try:
        payload = jwt.decode(
            credentials.credentials,
            config.JWT_SECRET,
            algorithms=[config.JWT_ALGORITHM]
        )
        return payload["sub"]
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Token expired")
    except jwt.InvalidTokenError:
        raise HTTPException(status_code=401, detail="Invalid token")


# =============================================================================
# Health & Status Endpoints
# =============================================================================

@app.get("/health")
async def health_check():
    """Health check endpoint"""
    return {"status": "ok"}


@app.get("/status")
async def server_status():
    """Get server and EVE-NG status"""
    eve_status = None
    if eve_client:
        try:
            status = await eve_client.get_server_status()
            eve_status = {
                "version": status.version,
                "cpu_usage": status.cpu_usage,
                "mem_usage": status.mem_usage,
                "connected": True
            }
        except:
            eve_status = {"connected": False}
    
    return {
        "server": "ok",
        "eve_ng": eve_status,
        "active_players": len(game_state.players) if game_state else 0,
        "active_tickets": len(game_state.active_tickets) if game_state else 0
    }


# =============================================================================
# Authentication Endpoints
# =============================================================================

@app.post("/api/auth/login", response_model=LoginResponse)
async def login(request: LoginRequest):
    """
    Login or create a player
    
    For MVP, we just create players on-the-fly.
    In production, add proper authentication.
    """
    # Simple: use username as ID (in production, use proper auth)
    player_id = f"player_{request.username.lower()}"
    
    # Get or create player
    player = game_state.get_player(player_id)
    if not player:
        player = game_state.create_player(player_id, request.username)
        
    # Create token
    token = create_token(player_id)
    
    # Get player state
    state = game_state.get_player_state(player_id)
    
    return LoginResponse(
        token=token,
        player=state["player"]
    )


@app.get("/api/auth/me")
async def get_current_player(player_id: str = Depends(verify_token)):
    """Get current player info"""
    state = game_state.get_player_state(player_id)
    if not state:
        raise HTTPException(status_code=404, detail="Player not found")
    return state


# =============================================================================
# Player Endpoints
# =============================================================================

@app.get("/api/player/stats")
async def get_player_stats(player_id: str = Depends(verify_token)):
    """Get detailed player statistics"""
    player = game_state.get_player(player_id)
    if not player:
        raise HTTPException(status_code=404, detail="Player not found")
        
    return {
        "id": player.id,
        "username": player.username,
        "level": player.level.value,
        "level_name": player.level_name,
        "floor": player.floor,
        "xp": player.xp,
        "credits": player.credits,
        "reputation": player.reputation,
        "stats": {
            "tickets_completed": player.tickets_completed,
            "tickets_failed": player.tickets_failed,
            "current_streak": player.current_streak,
            "best_streak": player.best_streak,
            "total_time_played": player.total_time_played
        },
        "unlocks": {
            "certifications": player.certifications,
            "office_upgrades": player.office_upgrades,
            "achievements": player.achievements
        },
        "available_categories": [c.value for c in player.available_categories],
        "max_difficulty": player.max_difficulty
    }


# =============================================================================
# Ticket Endpoints
# =============================================================================

@app.get("/api/tickets/available")
async def get_available_tickets(player_id: str = Depends(verify_token)):
    """Get list of tickets available to the player"""
    tickets = game_state.get_available_tickets(player_id)
    return {"tickets": tickets}


@app.get("/api/tickets/current")
async def get_current_ticket(player_id: str = Depends(verify_token)):
    """Get player's current active ticket"""
    ticket = game_state.get_active_ticket(player_id)
    if not ticket:
        return {"ticket": None}
        
    template = game_state.ticket_repo.get_template(ticket.template_id)
    
    return {
        "ticket": {
            "id": ticket.id,
            "template_id": ticket.template_id,
            "title": template.title if template else "",
            "description": template.description if template else "",
            "category": template.category.value if template else "",
            "difficulty": template.difficulty if template else 0,
            "started_at": ticket.started_at.isoformat(),
            "expires_at": ticket.expires_at.isoformat() if ticket.expires_at else None,
            "time_remaining": ticket.time_remaining.total_seconds() if ticket.time_remaining else None,
            "attempts": ticket.attempts,
            "lab_path": ticket.lab_instance_path,
            "hints": [
                {
                    "id": h.id,
                    "cost": h.cost,
                    "revealed": h.id in ticket.hints_revealed,
                    "text": h.text if h.id in ticket.hints_revealed else None
                }
                for h in (template.hints if template else [])
            ]
        }
    }


@app.post("/api/tickets/assign")
async def assign_ticket(
    request: TicketAssignRequest,
    player_id: str = Depends(verify_token)
):
    """Assign a ticket to the player"""
    # Check if already has active ticket
    existing = game_state.get_active_ticket(player_id)
    if existing:
        raise HTTPException(
            status_code=400,
            detail="Already have an active ticket. Complete or abandon it first."
        )
    
    # Assign ticket
    ticket = await game_state.assign_ticket(
        player_id=player_id,
        template_id=request.template_id,
        lab_manager=lab_manager
    )
    
    if not ticket:
        raise HTTPException(status_code=500, detail="Failed to assign ticket")
        
    # Get template for response
    template = game_state.ticket_repo.get_template(ticket.template_id)
    
    # Get node connection info
    nodes = {}
    try:
        node_list = await eve_client.list_nodes(ticket.lab_instance_path)
        for node_id, node in node_list.items():
            nodes[node_id] = {
                "name": node.name,
                "status": node.status.name,
                "console_host": node.console_host,
                "console_port": node.console_port,
                "console_type": node.console_type.value
            }
    except Exception as e:
        logger.error(f"Failed to get nodes: {e}")
    
    return {
        "ticket": {
            "id": ticket.id,
            "template_id": ticket.template_id,
            "title": template.title if template else "",
            "description": template.description if template else "",
            "time_limit": template.base_time_limit if template else 0,
            "credits": template.base_credits if template else 0,
            "xp": template.base_xp if template else 0
        },
        "lab": {
            "path": ticket.lab_instance_path,
            "nodes": nodes
        }
    }


@app.post("/api/tickets/submit")
async def submit_ticket(
    request: TicketSubmitRequest,
    player_id: str = Depends(verify_token)
):
    """Submit ticket for validation"""
    result = await game_state.submit_ticket(
        player_id=player_id,
        ticket_id=request.ticket_id,
        lab_manager=lab_manager
    )
    
    return {
        "success": result.success,
        "rewards": {
            "credits": result.credits_earned,
            "xp": result.xp_earned,
            "reputation": result.reputation_change,
            "time_bonus": result.time_bonus,
            "streak_bonus": result.streak_bonus
        },
        "validation": result.validation_results,
        "level_up": {
            "leveled_up": result.leveled_up,
            "new_level": result.new_level.value if result.new_level else None,
            "new_level_name": result.new_level.name if result.new_level else None
        },
        "achievements": result.achievements_unlocked
    }


@app.post("/api/tickets/abandon")
async def abandon_ticket(
    request: TicketSubmitRequest,
    player_id: str = Depends(verify_token)
):
    """Abandon current ticket"""
    result = await game_state.abandon_ticket(
        player_id=player_id,
        ticket_id=request.ticket_id,
        lab_manager=lab_manager
    )
    
    if not result["success"]:
        raise HTTPException(status_code=400, detail=result.get("error"))
        
    return result


@app.post("/api/tickets/hint")
async def reveal_hint(
    request: HintRevealRequest,
    player_id: str = Depends(verify_token)
):
    """Reveal a hint for the current ticket"""
    result = game_state.reveal_hint(
        player_id=player_id,
        ticket_id=request.ticket_id,
        hint_id=request.hint_id
    )
    
    if not result["success"]:
        raise HTTPException(status_code=400, detail=result.get("error"))
        
    return result


# =============================================================================
# Shop Endpoints
# =============================================================================

@app.get("/api/shop/items")
async def get_shop_items(player_id: str = Depends(verify_token)):
    """Get available shop items"""
    player = game_state.get_player(player_id)
    
    certifications = [
        {"id": "ccna", "name": "CCNA", "cost": 1000, "owned": "ccna" in player.certifications},
        {"id": "ccnp", "name": "CCNP", "cost": 2500, "owned": "ccnp" in player.certifications},
        {"id": "security+", "name": "Security+", "cost": 800, "owned": "security+" in player.certifications}
    ]
    
    upgrades = [
        {"id": "standing_desk", "name": "Standing Desk", "cost": 500, "owned": "standing_desk" in player.office_upgrades},
        {"id": "dual_monitor", "name": "Dual Monitor", "cost": 750, "owned": "dual_monitor" in player.office_upgrades},
        {"id": "mechanical_kb", "name": "Mechanical Keyboard", "cost": 300, "owned": "mechanical_kb" in player.office_upgrades},
        {"id": "plant", "name": "Office Plant", "cost": 100, "owned": "plant" in player.office_upgrades},
        {"id": "coffee_machine", "name": "Coffee Machine", "cost": 400, "owned": "coffee_machine" in player.office_upgrades}
    ]
    
    return {
        "player_credits": player.credits,
        "certifications": certifications,
        "office_upgrades": upgrades
    }


@app.post("/api/shop/purchase")
async def purchase_item(
    request: PurchaseRequest,
    player_id: str = Depends(verify_token)
):
    """Purchase an item"""
    result = game_state.purchase_item(
        player_id=player_id,
        item_type=request.item_type,
        item_id=request.item_id
    )
    
    if not result["success"]:
        raise HTTPException(status_code=400, detail=result.get("error"))
        
    return result


# =============================================================================
# Lab/Terminal Endpoints
# =============================================================================

@app.get("/api/lab/nodes")
async def get_lab_nodes(player_id: str = Depends(verify_token)):
    """Get nodes in player's current lab"""
    ticket = game_state.get_active_ticket(player_id)
    if not ticket:
        raise HTTPException(status_code=404, detail="No active ticket")
    
    try:
        nodes = await eve_client.list_nodes(ticket.lab_instance_path)
        return {
            "nodes": {
                node_id: {
                    "name": node.name,
                    "template": node.template,
                    "status": node.status.name,
                    "console_type": node.console_type.value,
                    "console_port": node.console_port
                }
                for node_id, node in nodes.items()
            }
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/api/lab/node/{node_id}/console")
async def get_node_console_info(
    node_id: int,
    player_id: str = Depends(verify_token)
):
    """Get console connection info for a node"""
    ticket = game_state.get_active_ticket(player_id)
    if not ticket:
        raise HTTPException(status_code=404, detail="No active ticket")
    
    try:
        node = await eve_client.get_node(ticket.lab_instance_path, node_id)
        return {
            "node_id": node_id,
            "name": node.name,
            "console_type": node.console_type.value,
            "console_host": node.console_host,
            "console_port": node.console_port,
            "websocket_url": f"ws://{config.API_HOST}:{config.WS_PORT}"
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/api/lab/node/{node_id}/start")
async def start_node(
    node_id: int,
    player_id: str = Depends(verify_token)
):
    """Start a specific node"""
    ticket = game_state.get_active_ticket(player_id)
    if not ticket:
        raise HTTPException(status_code=404, detail="No active ticket")
    
    try:
        await eve_client.start_node(ticket.lab_instance_path, node_id)
        return {"success": True, "node_id": node_id}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/api/lab/node/{node_id}/stop")
async def stop_node(
    node_id: int,
    player_id: str = Depends(verify_token)
):
    """Stop a specific node"""
    ticket = game_state.get_active_ticket(player_id)
    if not ticket:
        raise HTTPException(status_code=404, detail="No active ticket")
    
    try:
        await eve_client.stop_node(ticket.lab_instance_path, node_id)
        return {"success": True, "node_id": node_id}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# =============================================================================
# EVE-NG Info Endpoints (for debugging/admin)
# =============================================================================

@app.get("/api/eveng/templates")
async def get_templates():
    """List available node templates"""
    try:
        templates = await eve_client.list_node_templates()
        return {"templates": templates}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/api/eveng/networks")
async def get_network_types():
    """List available network types"""
    try:
        networks = await eve_client.list_network_types()
        return {"networks": networks}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# =============================================================================
# Entry Point
# =============================================================================

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(
        "main:app",
        host=config.API_HOST,
        port=config.API_PORT,
        reload=True,
        log_level="debug"
    )
