"""
EVE-NG API Client for NetOps Tower Game

This module provides a comprehensive wrapper around the EVE-NG REST API,
handling authentication, lab management, node control, and console connections.

Based on the official EVE-NG API and evengsdk patterns.
"""

import asyncio
import aiohttp
import logging
from typing import Optional, Dict, List, Any, Tuple
from dataclasses import dataclass, field
from enum import Enum
from urllib.parse import quote
import json


class NodeStatus(Enum):
    """Node power states"""
    STOPPED = 0
    RUNNING = 2
    BUILDING = 1


class ConsoleType(Enum):
    """Console connection types"""
    TELNET = "telnet"
    VNC = "vnc"
    RDP = "rdp"


@dataclass
class EveNode:
    """Represents a node in an EVE-NG lab"""
    id: int
    name: str
    template: str
    status: NodeStatus
    console_type: ConsoleType
    console_host: str
    console_port: int
    image: str
    ram: int
    cpu: int
    ethernet: int
    url: Optional[str] = None
    config: Optional[str] = None

    @property
    def console_url(self) -> str:
        """Get the full console connection URL"""
        return f"{self.console_type.value}://{self.console_host}:{self.console_port}"


@dataclass
class EveLab:
    """Represents an EVE-NG lab"""
    name: str
    path: str
    description: str
    author: str
    version: str
    nodes: Dict[int, EveNode] = field(default_factory=dict)
    networks: Dict[int, Dict] = field(default_factory=dict)
    

@dataclass
class EveServerStatus:
    """EVE-NG server status information"""
    version: str
    qemu_version: str
    iol_version: str
    dynamips_version: str
    cpu_usage: float
    mem_usage: float
    swap_usage: float
    disk_usage: float


class EveNGAPIError(Exception):
    """Base exception for EVE-NG API errors"""
    def __init__(self, message: str, code: int = 0, status: str = "error"):
        self.message = message
        self.code = code
        self.status = status
        super().__init__(f"[{code}] {status}: {message}")


class EveNGAuthError(EveNGAPIError):
    """Authentication error"""
    pass


class EveNGLabError(EveNGAPIError):
    """Lab-related error"""
    pass


class EveNGNodeError(EveNGAPIError):
    """Node-related error"""
    pass


class EveNGClient:
    """
    Async EVE-NG API Client
    
    Provides methods for:
    - Authentication (login/logout)
    - Lab management (list, create, delete, open)
    - Node management (list, start, stop, wipe, connect)
    - Network management
    - Configuration management
    - System status
    
    Example:
        async with EveNGClient("192.168.1.100", "admin", "eve") as client:
            status = await client.get_server_status()
            print(f"EVE-NG Version: {status.version}")
            
            labs = await client.list_labs("/")
            for lab in labs:
                print(f"Lab: {lab}")
    """
    
    def __init__(
        self,
        host: str,
        username: str = "admin",
        password: str = "eve",
        port: int = 80,
        protocol: str = "http",
        ssl_verify: bool = True,
        timeout: int = 30,
        html5: int = -1  # -1 for native console, 1 for HTML5
    ):
        self.host = host
        self.username = username
        self.password = password
        self.port = port
        self.protocol = protocol
        self.ssl_verify = ssl_verify
        self.timeout = timeout
        self.html5 = html5
        
        self._session: Optional[aiohttp.ClientSession] = None
        self._cookie_jar: Optional[aiohttp.CookieJar] = None
        self._logged_in = False
        
        self.logger = logging.getLogger("eveng-client")
        
    @property
    def base_url(self) -> str:
        """Get the base API URL"""
        if self.port in (80, 443):
            return f"{self.protocol}://{self.host}/api"
        return f"{self.protocol}://{self.host}:{self.port}/api"
    
    async def __aenter__(self):
        """Async context manager entry"""
        await self.connect()
        await self.login()
        return self
    
    async def __aexit__(self, exc_type, exc_val, exc_tb):
        """Async context manager exit"""
        await self.logout()
        await self.close()
        
    async def connect(self):
        """Initialize the HTTP session"""
        if self._session is None:
            self._cookie_jar = aiohttp.CookieJar()
            connector = aiohttp.TCPConnector(ssl=self.ssl_verify)
            timeout = aiohttp.ClientTimeout(total=self.timeout)
            self._session = aiohttp.ClientSession(
                cookie_jar=self._cookie_jar,
                connector=connector,
                timeout=timeout,
                headers={
                    "Accept": "application/json",
                    "Content-Type": "application/json"
                }
            )
            
    async def close(self):
        """Close the HTTP session"""
        if self._session:
            await self._session.close()
            self._session = None
            self._logged_in = False
            
    async def _request(
        self,
        method: str,
        endpoint: str,
        data: Optional[Dict] = None,
        params: Optional[Dict] = None
    ) -> Dict[str, Any]:
        """
        Make an API request
        
        Returns the parsed JSON response, raising EveNGAPIError on failure.
        """
        if not self._session:
            await self.connect()
            
        url = f"{self.base_url}{endpoint}"
        self.logger.debug(f"{method} {url}")
        
        try:
            async with self._session.request(
                method,
                url,
                json=data,
                params=params
            ) as response:
                try:
                    result = await response.json()
                except aiohttp.ContentTypeError:
                    # Some endpoints return non-JSON
                    text = await response.text()
                    result = {"data": text, "status": "success", "code": response.status}
                    
                if result.get("status") == "fail" or result.get("status") == "error":
                    raise EveNGAPIError(
                        message=result.get("message", "Unknown error"),
                        code=result.get("code", response.status),
                        status=result.get("status", "error")
                    )
                    
                return result
                
        except aiohttp.ClientError as e:
            raise EveNGAPIError(f"Connection error: {str(e)}")
            
    async def get(self, endpoint: str, params: Optional[Dict] = None) -> Dict:
        """HTTP GET request"""
        return await self._request("GET", endpoint, params=params)
        
    async def post(self, endpoint: str, data: Optional[Dict] = None) -> Dict:
        """HTTP POST request"""
        return await self._request("POST", endpoint, data=data)
        
    async def put(self, endpoint: str, data: Optional[Dict] = None) -> Dict:
        """HTTP PUT request"""
        return await self._request("PUT", endpoint, data=data)
        
    async def delete(self, endpoint: str) -> Dict:
        """HTTP DELETE request"""
        return await self._request("DELETE", endpoint)
    
    # =========================================================================
    # Authentication
    # =========================================================================
    
    async def login(self) -> Dict:
        """
        Authenticate with EVE-NG
        
        Returns user info on success, raises EveNGAuthError on failure.
        """
        try:
            result = await self.post("/auth/login", {
                "username": self.username,
                "password": self.password,
                "html5": self.html5
            })
            self._logged_in = True
            self.logger.info(f"Logged in as {self.username}")
            return result
        except EveNGAPIError as e:
            raise EveNGAuthError(e.message, e.code, e.status)
            
    async def logout(self) -> Dict:
        """Log out from EVE-NG"""
        if self._logged_in:
            try:
                result = await self.get("/auth/logout")
                self._logged_in = False
                self.logger.info("Logged out")
                return result
            except EveNGAPIError:
                pass
        return {"status": "success"}
        
    async def get_auth_status(self) -> Dict:
        """Get current authentication status"""
        return await self.get("/auth")
    
    # =========================================================================
    # System Status
    # =========================================================================
    
    async def get_server_status(self) -> EveServerStatus:
        """Get EVE-NG server status and resource usage"""
        result = await self.get("/status")
        data = result.get("data", {})
        
        return EveServerStatus(
            version=data.get("version", "unknown"),
            qemu_version=data.get("qemu", "unknown"),
            iol_version=data.get("iol", "unknown"),
            dynamips_version=data.get("dynamips", "unknown"),
            cpu_usage=float(data.get("cpu", 0)),
            mem_usage=float(data.get("mem", 0)),
            swap_usage=float(data.get("swap", 0)),
            disk_usage=float(data.get("disk", 0))
        )
        
    async def list_node_templates(self) -> Dict[str, str]:
        """List available node templates"""
        result = await self.get("/list/templates/")
        return result.get("data", {})
        
    async def get_template_details(self, template: str) -> Dict:
        """Get details for a specific node template"""
        result = await self.get(f"/list/templates/{template}")
        return result.get("data", {})
        
    async def list_network_types(self) -> Dict[str, str]:
        """List available network types"""
        result = await self.get("/list/networks")
        return result.get("data", {})
        
    async def list_user_roles(self) -> Dict[str, str]:
        """List available user roles"""
        result = await self.get("/list/roles")
        return result.get("data", {})
    
    # =========================================================================
    # Folder Management
    # =========================================================================
    
    async def list_folders(self, path: str = "/") -> List[Dict]:
        """List folders at the given path"""
        encoded_path = quote(path, safe="/")
        result = await self.get(f"/folders{encoded_path}")
        folders = result.get("data", {}).get("folders", [])
        return [{"name": f["name"], "path": f["path"]} for f in folders]
        
    async def create_folder(self, path: str, name: str) -> Dict:
        """Create a new folder"""
        encoded_path = quote(path, safe="/")
        return await self.post(f"/folders{encoded_path}", {"name": name})
        
    async def delete_folder(self, path: str) -> Dict:
        """Delete a folder"""
        encoded_path = quote(path, safe="/")
        return await self.delete(f"/folders{encoded_path}")
    
    # =========================================================================
    # Lab Management
    # =========================================================================
    
    def _normalize_lab_path(self, path: str) -> str:
        """Ensure lab path ends with .unl and is properly formatted"""
        if not path.endswith(".unl"):
            path = f"{path}.unl"
        if not path.startswith("/"):
            path = f"/{path}"
        return path
        
    async def list_labs(self, path: str = "/") -> List[Dict]:
        """List labs at the given path"""
        encoded_path = quote(path, safe="/")
        result = await self.get(f"/folders{encoded_path}")
        labs = result.get("data", {}).get("labs", [])
        return labs
        
    async def get_lab(self, path: str) -> EveLab:
        """Get lab details"""
        path = self._normalize_lab_path(path)
        encoded_path = quote(path, safe="/")
        result = await self.get(f"/labs{encoded_path}")
        data = result.get("data", {})
        
        return EveLab(
            name=data.get("name", ""),
            path=path,
            description=data.get("description", ""),
            author=data.get("author", ""),
            version=data.get("version", "")
        )
        
    async def create_lab(
        self,
        name: str,
        path: str = "/",
        description: str = "",
        version: str = "1",
        author: str = "",
        body: str = ""
    ) -> Dict:
        """Create a new lab"""
        encoded_path = quote(path, safe="/")
        return await self.post(f"/labs{encoded_path}", {
            "name": name,
            "description": description,
            "version": version,
            "author": author,
            "body": body
        })
        
    async def delete_lab(self, path: str) -> Dict:
        """Delete a lab"""
        path = self._normalize_lab_path(path)
        encoded_path = quote(path, safe="/")
        return await self.delete(f"/labs{encoded_path}")
        
    async def open_lab(self, path: str) -> Dict:
        """Open a lab (required before working with nodes)"""
        path = self._normalize_lab_path(path)
        encoded_path = quote(path, safe="/")
        return await self.get(f"/labs{encoded_path}")
        
    async def close_lab(self, path: str) -> Dict:
        """Close a lab"""
        path = self._normalize_lab_path(path)
        encoded_path = quote(path, safe="/")
        return await self.delete(f"/labs{encoded_path}/close")
        
    async def export_lab(self, path: str) -> bytes:
        """Export lab as ZIP archive"""
        path = self._normalize_lab_path(path)
        encoded_path = quote(path, safe="/")
        result = await self.get(f"/labs{encoded_path}/export")
        return result.get("data", b"")
    
    # =========================================================================
    # Node Management
    # =========================================================================
    
    async def list_nodes(self, lab_path: str) -> Dict[int, EveNode]:
        """List all nodes in a lab"""
        lab_path = self._normalize_lab_path(lab_path)
        encoded_path = quote(lab_path, safe="/")
        result = await self.get(f"/labs{encoded_path}/nodes")
        
        nodes = {}
        for node_id, node_data in result.get("data", {}).items():
            node_id = int(node_id)
            nodes[node_id] = EveNode(
                id=node_id,
                name=node_data.get("name", ""),
                template=node_data.get("template", ""),
                status=NodeStatus(node_data.get("status", 0)),
                console_type=ConsoleType(node_data.get("console", "telnet")),
                console_host=self.host,
                console_port=node_data.get("url", "").split(":")[-1] if node_data.get("url") else 0,
                image=node_data.get("image", ""),
                ram=node_data.get("ram", 0),
                cpu=node_data.get("cpu", 1),
                ethernet=node_data.get("ethernet", 0),
                url=node_data.get("url", ""),
                config=node_data.get("config", None)
            )
        return nodes
        
    async def get_node(self, lab_path: str, node_id: int) -> EveNode:
        """Get details for a specific node"""
        lab_path = self._normalize_lab_path(lab_path)
        encoded_path = quote(lab_path, safe="/")
        result = await self.get(f"/labs{encoded_path}/nodes/{node_id}")
        data = result.get("data", {})
        
        # Parse console port from URL
        console_port = 0
        url = data.get("url", "")
        if url:
            try:
                console_port = int(url.split(":")[-1])
            except (ValueError, IndexError):
                pass
        
        return EveNode(
            id=node_id,
            name=data.get("name", ""),
            template=data.get("template", ""),
            status=NodeStatus(data.get("status", 0)),
            console_type=ConsoleType(data.get("console", "telnet")),
            console_host=self.host,
            console_port=console_port,
            image=data.get("image", ""),
            ram=data.get("ram", 0),
            cpu=data.get("cpu", 1),
            ethernet=data.get("ethernet", 0),
            url=url,
            config=data.get("config", None)
        )
        
    async def add_node(
        self,
        lab_path: str,
        template: str,
        name: str,
        image: str = "",
        left: int = 0,
        top: int = 0,
        ram: int = 0,
        cpu: int = 0,
        ethernet: int = 0,
        console: str = "telnet",
        config: str = "",
        delay: int = 0,
        **kwargs
    ) -> Dict:
        """Add a new node to the lab"""
        lab_path = self._normalize_lab_path(lab_path)
        encoded_path = quote(lab_path, safe="/")
        
        node_data = {
            "template": template,
            "name": name,
            "left": left,
            "top": top,
            "console": console,
            "delay": delay
        }
        
        if image:
            node_data["image"] = image
        if ram:
            node_data["ram"] = ram
        if cpu:
            node_data["cpu"] = cpu
        if ethernet:
            node_data["ethernet"] = ethernet
        if config:
            node_data["config"] = config
            
        node_data.update(kwargs)
        
        return await self.post(f"/labs{encoded_path}/nodes", node_data)
        
    async def update_node(
        self,
        lab_path: str,
        node_id: int,
        **kwargs
    ) -> Dict:
        """Update node properties"""
        lab_path = self._normalize_lab_path(lab_path)
        encoded_path = quote(lab_path, safe="/")
        return await self.put(f"/labs{encoded_path}/nodes/{node_id}", kwargs)
        
    async def delete_node(self, lab_path: str, node_id: int) -> Dict:
        """Delete a node from the lab"""
        lab_path = self._normalize_lab_path(lab_path)
        encoded_path = quote(lab_path, safe="/")
        return await self.delete(f"/labs{encoded_path}/nodes/{node_id}")
        
    async def start_node(self, lab_path: str, node_id: int) -> Dict:
        """Start a node"""
        lab_path = self._normalize_lab_path(lab_path)
        encoded_path = quote(lab_path, safe="/")
        return await self.get(f"/labs{encoded_path}/nodes/{node_id}/start")
        
    async def stop_node(self, lab_path: str, node_id: int) -> Dict:
        """Stop a node"""
        lab_path = self._normalize_lab_path(lab_path)
        encoded_path = quote(lab_path, safe="/")
        return await self.get(f"/labs{encoded_path}/nodes/{node_id}/stop")
        
    async def wipe_node(self, lab_path: str, node_id: int) -> Dict:
        """Wipe a node (reset to default state)"""
        lab_path = self._normalize_lab_path(lab_path)
        encoded_path = quote(lab_path, safe="/")
        return await self.get(f"/labs{encoded_path}/nodes/{node_id}/wipe")
        
    async def start_all_nodes(self, lab_path: str) -> Dict:
        """Start all nodes in a lab"""
        lab_path = self._normalize_lab_path(lab_path)
        encoded_path = quote(lab_path, safe="/")
        return await self.get(f"/labs{encoded_path}/nodes/start")
        
    async def stop_all_nodes(self, lab_path: str) -> Dict:
        """Stop all nodes in a lab"""
        lab_path = self._normalize_lab_path(lab_path)
        encoded_path = quote(lab_path, safe="/")
        return await self.get(f"/labs{encoded_path}/nodes/stop")
        
    async def wipe_all_nodes(self, lab_path: str) -> Dict:
        """Wipe all nodes in a lab"""
        lab_path = self._normalize_lab_path(lab_path)
        encoded_path = quote(lab_path, safe="/")
        return await self.get(f"/labs{encoded_path}/nodes/wipe")
        
    async def get_node_console_url(self, lab_path: str, node_id: int) -> Tuple[str, int]:
        """
        Get console connection info for a node
        
        Returns (host, port) tuple for telnet connection
        """
        node = await self.get_node(lab_path, node_id)
        return (node.console_host, node.console_port)
    
    # =========================================================================
    # Network Management
    # =========================================================================
    
    async def list_networks(self, lab_path: str) -> Dict[int, Dict]:
        """List all networks in a lab"""
        lab_path = self._normalize_lab_path(lab_path)
        encoded_path = quote(lab_path, safe="/")
        result = await self.get(f"/labs{encoded_path}/networks")
        return result.get("data", {})
        
    async def add_network(
        self,
        lab_path: str,
        name: str,
        network_type: str = "bridge",
        left: int = 0,
        top: int = 0,
        visibility: int = 1,
        **kwargs
    ) -> Dict:
        """Add a network to the lab"""
        lab_path = self._normalize_lab_path(lab_path)
        encoded_path = quote(lab_path, safe="/")
        
        network_data = {
            "name": name,
            "type": network_type,
            "left": left,
            "top": top,
            "visibility": visibility
        }
        network_data.update(kwargs)
        
        return await self.post(f"/labs{encoded_path}/networks", network_data)
        
    async def delete_network(self, lab_path: str, network_id: int) -> Dict:
        """Delete a network from the lab"""
        lab_path = self._normalize_lab_path(lab_path)
        encoded_path = quote(lab_path, safe="/")
        return await self.delete(f"/labs{encoded_path}/networks/{network_id}")
    
    # =========================================================================
    # Interface/Link Management
    # =========================================================================
    
    async def list_links(self, lab_path: str) -> Dict:
        """List all links/endpoints in a lab"""
        lab_path = self._normalize_lab_path(lab_path)
        encoded_path = quote(lab_path, safe="/")
        result = await self.get(f"/labs{encoded_path}/links")
        return result.get("data", {})
        
    async def get_node_interfaces(self, lab_path: str, node_id: int) -> Dict:
        """Get interfaces for a specific node"""
        lab_path = self._normalize_lab_path(lab_path)
        encoded_path = quote(lab_path, safe="/")
        result = await self.get(f"/labs{encoded_path}/nodes/{node_id}/interfaces")
        return result.get("data", {})
        
    async def connect_interface(
        self,
        lab_path: str,
        node_id: int,
        interface_id: int,
        network_id: int
    ) -> Dict:
        """Connect a node interface to a network"""
        lab_path = self._normalize_lab_path(lab_path)
        encoded_path = quote(lab_path, safe="/")
        return await self.put(
            f"/labs{encoded_path}/nodes/{node_id}/interfaces",
            {str(interface_id): str(network_id)}
        )
    
    # =========================================================================
    # Configuration Management
    # =========================================================================
    
    async def get_node_config(self, lab_path: str, node_id: int) -> str:
        """Get the startup config for a node"""
        lab_path = self._normalize_lab_path(lab_path)
        encoded_path = quote(lab_path, safe="/")
        result = await self.get(f"/labs{encoded_path}/nodes/{node_id}/config")
        return result.get("data", "")
        
    async def set_node_config(self, lab_path: str, node_id: int, config: str) -> Dict:
        """Set the startup config for a node"""
        lab_path = self._normalize_lab_path(lab_path)
        encoded_path = quote(lab_path, safe="/")
        return await self.put(
            f"/labs{encoded_path}/nodes/{node_id}/config",
            {"config": config}
        )
        
    async def export_all_configs(self, lab_path: str) -> Dict[int, str]:
        """Export configs for all nodes in a lab"""
        lab_path = self._normalize_lab_path(lab_path)
        encoded_path = quote(lab_path, safe="/")
        result = await self.get(f"/labs{encoded_path}/configs")
        return result.get("data", {})


# =============================================================================
# High-Level Game Integration Functions
# =============================================================================

class GameLabManager:
    """
    High-level manager for game-specific lab operations
    
    Handles:
    - Lab instance management per player
    - Automatic cleanup
    - Validation execution
    - State tracking
    """
    
    def __init__(self, eve_client: EveNGClient):
        self.client = eve_client
        self.active_sessions: Dict[str, Dict] = {}  # player_id -> session info
        self.logger = logging.getLogger("game-lab-manager")
        
    async def create_player_lab_instance(
        self,
        player_id: str,
        template_lab_path: str
    ) -> str:
        """
        Create a lab instance for a player by cloning a template
        
        Returns the path to the new lab instance
        """
        # Generate unique lab name
        import uuid
        instance_id = str(uuid.uuid4())[:8]
        instance_name = f"player_{player_id}_{instance_id}"
        instance_path = f"/game/instances/{instance_name}"
        
        # For now, we'll open the template lab directly
        # In production, you'd want to actually clone the lab
        await self.client.open_lab(template_lab_path)
        
        # Track the session
        self.active_sessions[player_id] = {
            "lab_path": template_lab_path,
            "instance_id": instance_id,
            "created_at": asyncio.get_event_loop().time()
        }
        
        return template_lab_path
        
    async def get_player_lab(self, player_id: str) -> Optional[str]:
        """Get the lab path for a player's active session"""
        session = self.active_sessions.get(player_id)
        return session["lab_path"] if session else None
        
    async def start_lab_for_ticket(
        self,
        player_id: str,
        ticket_lab_path: str
    ) -> Dict[str, Any]:
        """
        Start a lab environment for a ticket
        
        Returns connection info for all nodes
        """
        # Open/create lab instance
        lab_path = await self.create_player_lab_instance(player_id, ticket_lab_path)
        
        # Start all nodes
        await self.client.start_all_nodes(lab_path)
        
        # Wait a bit for nodes to boot
        await asyncio.sleep(5)
        
        # Get node info with console URLs
        nodes = await self.client.list_nodes(lab_path)
        
        return {
            "lab_path": lab_path,
            "nodes": {
                node_id: {
                    "name": node.name,
                    "status": node.status.name,
                    "console_host": node.console_host,
                    "console_port": node.console_port,
                    "console_type": node.console_type.value
                }
                for node_id, node in nodes.items()
            }
        }
        
    async def cleanup_player_lab(self, player_id: str) -> bool:
        """
        Clean up a player's lab instance
        
        Stops all nodes and resets state
        """
        session = self.active_sessions.get(player_id)
        if not session:
            return False
            
        lab_path = session["lab_path"]
        
        try:
            # Stop all nodes
            await self.client.stop_all_nodes(lab_path)
            
            # Wipe nodes to reset state
            await self.client.wipe_all_nodes(lab_path)
            
            # Remove from tracking
            del self.active_sessions[player_id]
            
            return True
        except Exception as e:
            self.logger.error(f"Error cleaning up lab for {player_id}: {e}")
            return False
            
    async def validate_ticket_completion(
        self,
        player_id: str,
        validations: List[Dict]
    ) -> Dict[str, Any]:
        """
        Run validation checks for ticket completion
        
        validations: List of validation criteria dicts
        Returns: {success: bool, results: [...], score: float}
        """
        session = self.active_sessions.get(player_id)
        if not session:
            return {"success": False, "error": "No active session"}
            
        lab_path = session["lab_path"]
        results = []
        passed = 0
        
        for validation in validations:
            result = await self._run_validation(lab_path, validation)
            results.append(result)
            if result["passed"]:
                passed += 1
                
        total = len(validations)
        score = passed / total if total > 0 else 0
        
        return {
            "success": score >= 1.0,  # All must pass
            "results": results,
            "score": score,
            "passed": passed,
            "total": total
        }
        
    async def _run_validation(
        self,
        lab_path: str,
        validation: Dict
    ) -> Dict[str, Any]:
        """Run a single validation check"""
        v_type = validation.get("type")
        
        if v_type == "ping":
            return await self._validate_ping(lab_path, validation)
        elif v_type == "command":
            return await self._validate_command(lab_path, validation)
        elif v_type == "config":
            return await self._validate_config(lab_path, validation)
        else:
            return {"passed": False, "error": f"Unknown validation type: {v_type}"}
            
    async def _validate_ping(
        self,
        lab_path: str,
        validation: Dict
    ) -> Dict[str, Any]:
        """
        Validate ping connectivity
        
        Note: This requires executing commands on nodes, which needs
        the console connection. For now, this is a placeholder.
        """
        # In production, this would:
        # 1. Connect to source node's console
        # 2. Execute ping command
        # 3. Parse output for success/failure
        
        return {
            "type": "ping",
            "passed": True,  # Placeholder
            "details": {
                "source": validation.get("source_node"),
                "destination": validation.get("destination"),
                "result": "Validation not yet implemented"
            }
        }
        
    async def _validate_command(
        self,
        lab_path: str,
        validation: Dict
    ) -> Dict[str, Any]:
        """
        Validate command output contains/excludes expected strings
        """
        return {
            "type": "command",
            "passed": True,  # Placeholder
            "details": {
                "node": validation.get("node"),
                "command": validation.get("command"),
                "result": "Validation not yet implemented"
            }
        }
        
    async def _validate_config(
        self,
        lab_path: str,
        validation: Dict
    ) -> Dict[str, Any]:
        """
        Validate node configuration contains expected elements
        """
        node_name = validation.get("node")
        contains = validation.get("contains", [])
        not_contains = validation.get("not_contains", [])
        
        # Get node ID from name
        nodes = await self.client.list_nodes(lab_path)
        node_id = None
        for nid, node in nodes.items():
            if node.name == node_name:
                node_id = nid
                break
                
        if node_id is None:
            return {
                "type": "config",
                "passed": False,
                "error": f"Node {node_name} not found"
            }
            
        # Get config
        config = await self.client.get_node_config(lab_path, node_id)
        
        # Check contains
        missing = []
        for pattern in contains:
            if pattern not in config:
                missing.append(pattern)
                
        # Check not_contains
        unwanted = []
        for pattern in not_contains:
            if pattern in config:
                unwanted.append(pattern)
                
        passed = len(missing) == 0 and len(unwanted) == 0
        
        return {
            "type": "config",
            "passed": passed,
            "details": {
                "node": node_name,
                "missing_patterns": missing,
                "unwanted_patterns": unwanted
            }
        }


# =============================================================================
# Example Usage
# =============================================================================

async def example_usage():
    """Example of using the EVE-NG client"""
    
    # Configure logging
    logging.basicConfig(level=logging.DEBUG)
    
    # Create client and connect
    async with EveNGClient(
        host="192.168.1.100",
        username="admin",
        password="eve",
        protocol="http"
    ) as client:
        
        # Get server status
        status = await client.get_server_status()
        print(f"EVE-NG Version: {status.version}")
        print(f"CPU Usage: {status.cpu_usage}%")
        print(f"Memory Usage: {status.mem_usage}%")
        
        # List available templates
        templates = await client.list_node_templates()
        print(f"\nAvailable templates: {len(templates)}")
        for name, desc in list(templates.items())[:5]:
            print(f"  - {name}: {desc}")
            
        # List labs
        labs = await client.list_labs("/")
        print(f"\nLabs in root folder: {len(labs)}")
        
        # If we have a lab, show its nodes
        if labs:
            lab_file = labs[0].get("file", "")
            if lab_file:
                lab = await client.get_lab(f"/{lab_file}")
                print(f"\nLab: {lab.name}")
                print(f"Description: {lab.description}")
                
                nodes = await client.list_nodes(f"/{lab_file}")
                print(f"Nodes: {len(nodes)}")
                for node_id, node in nodes.items():
                    print(f"  - [{node_id}] {node.name} ({node.template})")
                    print(f"    Status: {node.status.name}")
                    print(f"    Console: {node.console_url}")


if __name__ == "__main__":
    asyncio.run(example_usage())
