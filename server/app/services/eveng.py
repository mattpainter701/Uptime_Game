"""
NetOps Tower - EVE-NG API Client

Handles all communication with the EVE-NG REST API.
"""
import httpx
import logging
from typing import Optional, Dict, Any, List
from urllib.parse import quote

from ..config import settings
from ..models.schemas import (
    NodeInfo, NodeStatus, NodeType, ConsoleType,
    LabInfo, NetworkInfo, EVENGStatus
)

logger = logging.getLogger(__name__)


class EVENGClient:
    """
    Async client for EVE-NG API.
    """

    def __init__(self):
        self.base_url = settings.eveng_base_url
        self.username = settings.eveng_username
        self.password = settings.eveng_password
        self.verify_ssl = settings.eveng_verify_ssl
        self._cookies: Dict[str, str] = {}
        self._client: Optional[httpx.AsyncClient] = None

    async def _get_client(self) -> httpx.AsyncClient:
        """Get or create HTTP client."""
        if self._client is None or self._client.is_closed:
            self._client = httpx.AsyncClient(
                base_url=self.base_url,
                verify=self.verify_ssl,
                timeout=30.0,
                cookies=self._cookies
            )
        return self._client

    async def close(self):
        """Close the HTTP client."""
        if self._client:
            await self._client.aclose()
            self._client = None

    # =========================================================================
    # Authentication
    # =========================================================================

    async def login(self) -> bool:
        """
        Authenticate with EVE-NG.
        Returns True if successful.
        """
        client = await self._get_client()

        try:
            response = await client.post(
                "/api/auth/login",
                json={
                    "username": self.username,
                    "password": self.password,
                    "html5": -1  # Use native console URLs
                }
            )

            if response.status_code == 200:
                data = response.json()
                if data.get("status") == "success":
                    # Store cookies for subsequent requests
                    self._cookies = dict(response.cookies)
                    # Update client with new cookies
                    self._client = None
                    logger.info("Successfully logged into EVE-NG")
                    return True

            logger.error(f"EVE-NG login failed: {response.text}")
            return False

        except Exception as e:
            logger.error(f"EVE-NG login error: {e}")
            return False

    async def logout(self) -> bool:
        """Logout from EVE-NG."""
        client = await self._get_client()

        try:
            response = await client.get("/api/auth/logout")
            self._cookies = {}
            return response.status_code == 200
        except Exception as e:
            logger.error(f"EVE-NG logout error: {e}")
            return False

    async def ensure_authenticated(self) -> bool:
        """Ensure we have a valid session, login if needed."""
        client = await self._get_client()

        try:
            # Check current auth status
            response = await client.get("/api/auth")
            if response.status_code == 200:
                return True

            # Need to login
            return await self.login()
        except Exception:
            return await self.login()

    # =========================================================================
    # System Status
    # =========================================================================

    async def get_status(self) -> Optional[EVENGStatus]:
        """Get EVE-NG server status."""
        await self.ensure_authenticated()
        client = await self._get_client()

        try:
            response = await client.get("/api/status")
            if response.status_code == 200:
                data = response.json().get("data", {})
                return EVENGStatus(
                    version=data.get("version", "unknown"),
                    cpu=data.get("cpu", 0),
                    mem=data.get("mem", 0),
                    disk=data.get("disk", 0),
                    qemu=data.get("qemu", 0),
                    iol=data.get("iol", 0),
                    dynamips=data.get("dynamips", 0)
                )
            return None
        except Exception as e:
            logger.error(f"Failed to get EVE-NG status: {e}")
            return None

    # =========================================================================
    # Lab Management
    # =========================================================================

    async def list_labs(self, folder: str = "/") -> List[LabInfo]:
        """List all labs in a folder."""
        await self.ensure_authenticated()
        client = await self._get_client()

        try:
            encoded_folder = quote(folder, safe="")
            response = await client.get(f"/api/folders/{encoded_folder}")

            if response.status_code == 200:
                data = response.json().get("data", {})
                labs = []

                # Get labs from the folders response
                for name, info in data.get("labs", {}).items():
                    labs.append(LabInfo(
                        id=info.get("id", ""),
                        name=name.replace(".unl", ""),
                        path=info.get("path", f"{folder}/{name}"),
                        description=info.get("description"),
                        author=info.get("author"),
                        version=info.get("version")
                    ))

                return labs
            return []
        except Exception as e:
            logger.error(f"Failed to list labs: {e}")
            return []

    async def get_lab(self, lab_path: str) -> Optional[Dict[str, Any]]:
        """Get lab details."""
        await self.ensure_authenticated()
        client = await self._get_client()

        try:
            encoded_path = quote(lab_path, safe="")
            response = await client.get(f"/api/labs/{encoded_path}")

            if response.status_code == 200:
                return response.json().get("data", {})
            return None
        except Exception as e:
            logger.error(f"Failed to get lab {lab_path}: {e}")
            return None

    async def open_lab(self, lab_path: str) -> bool:
        """Open/activate a lab."""
        await self.ensure_authenticated()
        client = await self._get_client()

        try:
            encoded_path = quote(lab_path, safe="")
            # First close any open lab
            await client.delete("/api/labs")
            # Then open the new one
            response = await client.get(f"/api/labs/{encoded_path}")
            return response.status_code == 200
        except Exception as e:
            logger.error(f"Failed to open lab {lab_path}: {e}")
            return False

    # =========================================================================
    # Node Management
    # =========================================================================

    def _determine_node_type(self, template: str) -> NodeType:
        """Determine node type from template name."""
        template_lower = template.lower()

        if any(x in template_lower for x in ["vios", "csr", "xrv", "iosv"]):
            return NodeType.ROUTER
        elif any(x in template_lower for x in ["viosl2", "nxos", "iosvl2"]):
            return NodeType.SWITCH
        elif any(x in template_lower for x in ["asa", "palo", "fortinet", "pfsense", "firewall"]):
            return NodeType.FIREWALL
        elif any(x in template_lower for x in ["linux", "ubuntu", "centos", "debian", "alpine"]):
            return NodeType.LINUX
        elif any(x in template_lower for x in ["win", "windows", "server2"]):
            return NodeType.WINDOWS
        elif any(x in template_lower for x in ["esxi", "vcenter", "server"]):
            return NodeType.SERVER
        else:
            return NodeType.OTHER

    def _determine_console_type(self, console: str) -> ConsoleType:
        """Determine console type from EVE-NG console field."""
        console_lower = console.lower() if console else ""

        if "vnc" in console_lower:
            return ConsoleType.VNC
        elif "rdp" in console_lower:
            return ConsoleType.RDP
        elif "ssh" in console_lower:
            return ConsoleType.SSH
        else:
            return ConsoleType.TELNET

    async def list_nodes(self, lab_path: str) -> List[NodeInfo]:
        """List all nodes in a lab."""
        await self.ensure_authenticated()
        client = await self._get_client()

        try:
            encoded_path = quote(lab_path, safe="")
            response = await client.get(f"/api/labs/{encoded_path}/nodes")

            if response.status_code == 200:
                data = response.json().get("data", {})
                nodes = []

                for node_id, node_data in data.items():
                    # Parse console URL
                    url = node_data.get("url", "")
                    console_host = None
                    console_port = None

                    if url and "://" in url:
                        # Parse telnet://host:port or similar
                        try:
                            parts = url.split("://")[1]
                            if ":" in parts:
                                console_host, port_str = parts.split(":")
                                console_port = int(port_str)
                            else:
                                console_host = parts
                        except (ValueError, IndexError):
                            pass

                    # If no host parsed, use EVE-NG host
                    if not console_host:
                        console_host = settings.eveng_host

                    # Determine status
                    status_code = node_data.get("status", 0)
                    if status_code == 0:
                        status = NodeStatus.STOPPED
                    elif status_code == 1:
                        status = NodeStatus.STARTING
                    elif status_code == 2:
                        status = NodeStatus.RUNNING
                    else:
                        status = NodeStatus.STOPPED

                    template = node_data.get("template", "")

                    nodes.append(NodeInfo(
                        id=int(node_id),
                        name=node_data.get("name", f"Node{node_id}"),
                        template=template,
                        type=self._determine_node_type(template),
                        status=status,
                        console_type=self._determine_console_type(node_data.get("console", "")),
                        console_host=console_host,
                        console_port=console_port,
                        url=url,
                        cpu=node_data.get("cpu"),
                        ram=node_data.get("ram"),
                        ethernet=node_data.get("ethernet"),
                        image=node_data.get("image"),
                        icon=node_data.get("icon"),
                        left=node_data.get("left"),
                        top=node_data.get("top")
                    ))

                return nodes
            return []
        except Exception as e:
            logger.error(f"Failed to list nodes for {lab_path}: {e}")
            return []

    async def get_node(self, lab_path: str, node_id: int) -> Optional[NodeInfo]:
        """Get single node details."""
        nodes = await self.list_nodes(lab_path)
        for node in nodes:
            if node.id == node_id:
                return node
        return None

    async def start_node(self, lab_path: str, node_id: int) -> bool:
        """Start a node."""
        await self.ensure_authenticated()
        client = await self._get_client()

        try:
            encoded_path = quote(lab_path, safe="")
            response = await client.get(
                f"/api/labs/{encoded_path}/nodes/{node_id}/start"
            )
            return response.status_code == 200
        except Exception as e:
            logger.error(f"Failed to start node {node_id}: {e}")
            return False

    async def stop_node(self, lab_path: str, node_id: int) -> bool:
        """Stop a node."""
        await self.ensure_authenticated()
        client = await self._get_client()

        try:
            encoded_path = quote(lab_path, safe="")
            response = await client.get(
                f"/api/labs/{encoded_path}/nodes/{node_id}/stop"
            )
            return response.status_code == 200
        except Exception as e:
            logger.error(f"Failed to stop node {node_id}: {e}")
            return False

    async def wipe_node(self, lab_path: str, node_id: int) -> bool:
        """Wipe/reset a node to default state."""
        await self.ensure_authenticated()
        client = await self._get_client()

        try:
            encoded_path = quote(lab_path, safe="")
            response = await client.get(
                f"/api/labs/{encoded_path}/nodes/{node_id}/wipe"
            )
            return response.status_code == 200
        except Exception as e:
            logger.error(f"Failed to wipe node {node_id}: {e}")
            return False

    async def start_all_nodes(self, lab_path: str) -> bool:
        """Start all nodes in a lab."""
        await self.ensure_authenticated()
        client = await self._get_client()

        try:
            encoded_path = quote(lab_path, safe="")
            response = await client.get(
                f"/api/labs/{encoded_path}/nodes/start"
            )
            return response.status_code == 200
        except Exception as e:
            logger.error(f"Failed to start all nodes: {e}")
            return False

    async def stop_all_nodes(self, lab_path: str) -> bool:
        """Stop all nodes in a lab."""
        await self.ensure_authenticated()
        client = await self._get_client()

        try:
            encoded_path = quote(lab_path, safe="")
            response = await client.get(
                f"/api/labs/{encoded_path}/nodes/stop"
            )
            return response.status_code == 200
        except Exception as e:
            logger.error(f"Failed to stop all nodes: {e}")
            return False

    # =========================================================================
    # Node Configuration
    # =========================================================================

    async def get_node_config(self, lab_path: str, node_id: int) -> Optional[str]:
        """Get node startup configuration."""
        await self.ensure_authenticated()
        client = await self._get_client()

        try:
            encoded_path = quote(lab_path, safe="")
            response = await client.get(
                f"/api/labs/{encoded_path}/configs/{node_id}"
            )

            if response.status_code == 200:
                return response.json().get("data", "")
            return None
        except Exception as e:
            logger.error(f"Failed to get config for node {node_id}: {e}")
            return None

    async def export_node_config(self, lab_path: str, node_id: int) -> bool:
        """Export running config to startup config."""
        await self.ensure_authenticated()
        client = await self._get_client()

        try:
            encoded_path = quote(lab_path, safe="")
            response = await client.get(
                f"/api/labs/{encoded_path}/nodes/{node_id}/export"
            )
            return response.status_code == 200
        except Exception as e:
            logger.error(f"Failed to export config for node {node_id}: {e}")
            return False

    # =========================================================================
    # Networks
    # =========================================================================

    async def list_networks(self, lab_path: str) -> List[NetworkInfo]:
        """List all networks in a lab."""
        await self.ensure_authenticated()
        client = await self._get_client()

        try:
            encoded_path = quote(lab_path, safe="")
            response = await client.get(f"/api/labs/{encoded_path}/networks")

            if response.status_code == 200:
                data = response.json().get("data", {})
                networks = []

                for net_id, net_data in data.items():
                    networks.append(NetworkInfo(
                        id=int(net_id),
                        name=net_data.get("name", f"Network{net_id}"),
                        type=net_data.get("type", "bridge"),
                        visibility=net_data.get("visibility")
                    ))

                return networks
            return []
        except Exception as e:
            logger.error(f"Failed to list networks for {lab_path}: {e}")
            return []

    # =========================================================================
    # Templates
    # =========================================================================

    async def list_templates(self) -> List[str]:
        """List available node templates."""
        await self.ensure_authenticated()
        client = await self._get_client()

        try:
            response = await client.get("/api/list/templates/")

            if response.status_code == 200:
                data = response.json().get("data", {})
                return list(data.keys())
            return []
        except Exception as e:
            logger.error(f"Failed to list templates: {e}")
            return []


# Singleton instance
eveng_client = EVENGClient()
