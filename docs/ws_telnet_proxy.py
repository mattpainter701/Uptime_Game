"""
WebSocket to Telnet Proxy Server

This module provides a WebSocket server that proxies connections
to EVE-NG node telnet consoles, enabling browser-based terminal access.

Flow:
1. Browser connects to WebSocket endpoint
2. Server establishes telnet connection to EVE-NG node
3. Data is bidirectionally streamed between WebSocket and telnet
"""

import asyncio
import logging
import json
from typing import Dict, Optional, Set
from dataclasses import dataclass
import telnetlib3
import websockets
from websockets.server import WebSocketServerProtocol

logger = logging.getLogger("ws-telnet-proxy")


@dataclass
class TelnetSession:
    """Represents an active telnet session"""
    node_id: int
    host: str
    port: int
    reader: Optional[asyncio.StreamReader] = None
    writer: Optional[asyncio.StreamWriter] = None
    connected: bool = False


class TelnetProxy:
    """
    Manages a single telnet connection proxied through WebSocket
    """
    
    def __init__(
        self,
        websocket: WebSocketServerProtocol,
        host: str,
        port: int,
        node_id: int
    ):
        self.websocket = websocket
        self.host = host
        self.port = port
        self.node_id = node_id
        self.reader: Optional[asyncio.StreamReader] = None
        self.writer: Optional[asyncio.StreamWriter] = None
        self.running = False
        self.logger = logging.getLogger(f"telnet-proxy-{node_id}")
        
    async def connect(self) -> bool:
        """Establish telnet connection"""
        try:
            self.reader, self.writer = await asyncio.open_connection(
                self.host,
                self.port
            )
            self.running = True
            self.logger.info(f"Connected to {self.host}:{self.port}")
            return True
        except Exception as e:
            self.logger.error(f"Connection failed: {e}")
            return False
            
    async def disconnect(self):
        """Close telnet connection"""
        self.running = False
        if self.writer:
            self.writer.close()
            try:
                await self.writer.wait_closed()
            except Exception:
                pass
        self.logger.info("Disconnected")
        
    async def telnet_to_websocket(self):
        """Forward telnet data to WebSocket"""
        try:
            while self.running:
                data = await self.reader.read(4096)
                if not data:
                    break
                    
                # Send as binary or text depending on content
                try:
                    # Try to decode as UTF-8
                    text = data.decode('utf-8', errors='replace')
                    await self.websocket.send(text)
                except Exception as e:
                    # Send as binary if decode fails
                    await self.websocket.send(data)
                    
        except asyncio.CancelledError:
            pass
        except Exception as e:
            self.logger.error(f"Telnet->WS error: {e}")
        finally:
            self.running = False
            
    async def websocket_to_telnet(self):
        """Forward WebSocket data to telnet"""
        try:
            async for message in self.websocket:
                if not self.running:
                    break
                    
                if isinstance(message, str):
                    data = message.encode('utf-8')
                else:
                    data = message
                    
                self.writer.write(data)
                await self.writer.drain()
                
        except websockets.exceptions.ConnectionClosed:
            pass
        except asyncio.CancelledError:
            pass
        except Exception as e:
            self.logger.error(f"WS->Telnet error: {e}")
        finally:
            self.running = False
            
    async def run(self):
        """Run the proxy - bidirectional data transfer"""
        if not await self.connect():
            await self.websocket.send(json.dumps({
                "type": "error",
                "message": f"Failed to connect to node {self.node_id}"
            }))
            return
            
        # Notify successful connection
        await self.websocket.send(json.dumps({
            "type": "connected",
            "node_id": self.node_id,
            "host": self.host,
            "port": self.port
        }))
        
        # Run both directions concurrently
        try:
            await asyncio.gather(
                self.telnet_to_websocket(),
                self.websocket_to_telnet()
            )
        finally:
            await self.disconnect()


class ProxyServer:
    """
    WebSocket server that manages multiple telnet proxy connections
    """
    
    def __init__(
        self,
        host: str = "0.0.0.0",
        port: int = 8765,
        eve_host: str = "localhost"
    ):
        self.host = host
        self.port = port
        self.eve_host = eve_host
        self.connections: Dict[str, TelnetProxy] = {}
        self.logger = logging.getLogger("proxy-server")
        
    async def handle_connection(
        self,
        websocket: WebSocketServerProtocol,
        path: str
    ):
        """Handle incoming WebSocket connection"""
        client_id = f"{websocket.remote_address[0]}:{websocket.remote_address[1]}"
        self.logger.info(f"New connection from {client_id}")
        
        try:
            # Wait for initial message with connection info
            init_msg = await asyncio.wait_for(
                websocket.recv(),
                timeout=10.0
            )
            
            try:
                config = json.loads(init_msg)
            except json.JSONDecodeError:
                await websocket.send(json.dumps({
                    "type": "error",
                    "message": "Invalid JSON in connection request"
                }))
                return
                
            # Validate required fields
            if "node_port" not in config:
                await websocket.send(json.dumps({
                    "type": "error",
                    "message": "Missing required field: node_port"
                }))
                return
                
            node_port = config["node_port"]
            node_id = config.get("node_id", 0)
            node_host = config.get("node_host", self.eve_host)
            
            # Create and run proxy
            proxy = TelnetProxy(
                websocket=websocket,
                host=node_host,
                port=node_port,
                node_id=node_id
            )
            
            self.connections[client_id] = proxy
            
            try:
                await proxy.run()
            finally:
                if client_id in self.connections:
                    del self.connections[client_id]
                    
        except asyncio.TimeoutError:
            await websocket.send(json.dumps({
                "type": "error",
                "message": "Connection timeout - no initialization message received"
            }))
        except websockets.exceptions.ConnectionClosed:
            self.logger.info(f"Connection closed: {client_id}")
        except Exception as e:
            self.logger.error(f"Error handling connection {client_id}: {e}")
            
    async def start(self):
        """Start the WebSocket server"""
        self.logger.info(f"Starting proxy server on {self.host}:{self.port}")
        
        async with websockets.serve(
            self.handle_connection,
            self.host,
            self.port,
            ping_interval=30,
            ping_timeout=10
        ):
            self.logger.info("Proxy server running")
            await asyncio.Future()  # Run forever


# =============================================================================
# Advanced Terminal Proxy with PTY Support
# =============================================================================

class AdvancedTelnetProxy:
    """
    Enhanced telnet proxy with:
    - Terminal emulation handling
    - ANSI escape code processing
    - Window resize support
    - Session recording
    """
    
    def __init__(
        self,
        websocket: WebSocketServerProtocol,
        host: str,
        port: int,
        node_id: int,
        cols: int = 80,
        rows: int = 24
    ):
        self.websocket = websocket
        self.host = host
        self.port = port
        self.node_id = node_id
        self.cols = cols
        self.rows = rows
        self.reader = None
        self.writer = None
        self.running = False
        self.session_log: list = []
        self.logger = logging.getLogger(f"adv-proxy-{node_id}")
        
    async def connect(self) -> bool:
        """Connect using telnetlib3 for proper terminal negotiation"""
        try:
            self.reader, self.writer = await telnetlib3.open_connection(
                host=self.host,
                port=self.port,
                cols=self.cols,
                rows=self.rows,
                encoding='utf-8',
                encoding_errors='replace'
            )
            self.running = True
            self.logger.info(f"Connected to {self.host}:{self.port}")
            return True
        except Exception as e:
            self.logger.error(f"Connection failed: {e}")
            return False
            
    async def disconnect(self):
        """Close connection"""
        self.running = False
        if self.writer:
            self.writer.close()
        self.logger.info("Disconnected")
        
    async def handle_control_message(self, message: dict):
        """Handle control messages from the client"""
        msg_type = message.get("type")
        
        if msg_type == "resize":
            # Handle terminal resize
            self.cols = message.get("cols", self.cols)
            self.rows = message.get("rows", self.rows)
            self.logger.debug(f"Terminal resized to {self.cols}x{self.rows}")
            
        elif msg_type == "ping":
            # Respond to ping
            await self.websocket.send(json.dumps({"type": "pong"}))
            
    async def telnet_to_websocket(self):
        """Forward telnet output to WebSocket"""
        try:
            while self.running:
                data = await self.reader.read(4096)
                if not data:
                    await asyncio.sleep(0.01)
                    continue
                    
                # Log session data
                self.session_log.append({
                    "direction": "output",
                    "data": data,
                    "timestamp": asyncio.get_event_loop().time()
                })
                
                # Send to WebSocket
                await self.websocket.send(data)
                
        except asyncio.CancelledError:
            pass
        except Exception as e:
            self.logger.error(f"Telnet->WS error: {e}")
        finally:
            self.running = False
            
    async def websocket_to_telnet(self):
        """Forward WebSocket input to telnet"""
        try:
            async for message in self.websocket:
                if not self.running:
                    break
                    
                # Check if it's a control message (JSON)
                if isinstance(message, str):
                    try:
                        control = json.loads(message)
                        if isinstance(control, dict) and "type" in control:
                            await self.handle_control_message(control)
                            continue
                    except json.JSONDecodeError:
                        pass
                        
                # Regular input - forward to telnet
                data = message if isinstance(message, str) else message.decode('utf-8')
                
                # Log session data
                self.session_log.append({
                    "direction": "input",
                    "data": data,
                    "timestamp": asyncio.get_event_loop().time()
                })
                
                self.writer.write(data)
                await self.writer.drain()
                
        except websockets.exceptions.ConnectionClosed:
            pass
        except asyncio.CancelledError:
            pass
        except Exception as e:
            self.logger.error(f"WS->Telnet error: {e}")
        finally:
            self.running = False
            
    async def run(self):
        """Run the proxy"""
        if not await self.connect():
            await self.websocket.send(json.dumps({
                "type": "error",
                "message": f"Failed to connect to {self.host}:{self.port}"
            }))
            return
            
        await self.websocket.send(json.dumps({
            "type": "connected",
            "node_id": self.node_id,
            "host": self.host,
            "port": self.port,
            "cols": self.cols,
            "rows": self.rows
        }))
        
        try:
            await asyncio.gather(
                self.telnet_to_websocket(),
                self.websocket_to_telnet()
            )
        finally:
            await self.disconnect()
            
    def get_session_log(self) -> list:
        """Get the recorded session log"""
        return self.session_log


# =============================================================================
# Game Integration Layer
# =============================================================================

class GameTerminalServer:
    """
    Terminal server integrated with the game
    
    Features:
    - Player session management
    - Rate limiting
    - Command filtering (optional)
    - Session recording for validation
    """
    
    def __init__(
        self,
        host: str = "0.0.0.0",
        port: int = 8765,
        eve_host: str = "localhost",
        max_connections_per_player: int = 4
    ):
        self.host = host
        self.port = port
        self.eve_host = eve_host
        self.max_connections_per_player = max_connections_per_player
        
        # Track connections per player
        self.player_connections: Dict[str, Set[str]] = {}  # player_id -> set of connection_ids
        self.connections: Dict[str, AdvancedTelnetProxy] = {}
        
        self.logger = logging.getLogger("game-terminal-server")
        
    def _get_player_id(self, websocket: WebSocketServerProtocol) -> Optional[str]:
        """
        Extract player ID from WebSocket connection
        This would typically come from authentication
        """
        # In production, extract from auth token in headers
        # For now, use a query parameter or header
        return websocket.request_headers.get("X-Player-ID", "anonymous")
        
    async def handle_connection(
        self,
        websocket: WebSocketServerProtocol,
        path: str
    ):
        """Handle incoming WebSocket connection"""
        connection_id = f"{websocket.remote_address[0]}:{websocket.remote_address[1]}"
        player_id = self._get_player_id(websocket)
        
        self.logger.info(f"New connection from player {player_id}: {connection_id}")
        
        # Check connection limits
        if player_id not in self.player_connections:
            self.player_connections[player_id] = set()
            
        if len(self.player_connections[player_id]) >= self.max_connections_per_player:
            await websocket.send(json.dumps({
                "type": "error",
                "message": f"Max connections ({self.max_connections_per_player}) reached"
            }))
            return
            
        self.player_connections[player_id].add(connection_id)
        
        try:
            # Wait for connection config
            init_msg = await asyncio.wait_for(
                websocket.recv(),
                timeout=10.0
            )
            
            try:
                config = json.loads(init_msg)
            except json.JSONDecodeError:
                await websocket.send(json.dumps({
                    "type": "error",
                    "message": "Invalid JSON"
                }))
                return
                
            # Validate access (in production, check if player has access to this node)
            node_port = config.get("node_port")
            node_id = config.get("node_id", 0)
            node_host = config.get("node_host", self.eve_host)
            cols = config.get("cols", 80)
            rows = config.get("rows", 24)
            
            if not node_port:
                await websocket.send(json.dumps({
                    "type": "error",
                    "message": "Missing node_port"
                }))
                return
                
            # Create proxy
            proxy = AdvancedTelnetProxy(
                websocket=websocket,
                host=node_host,
                port=node_port,
                node_id=node_id,
                cols=cols,
                rows=rows
            )
            
            self.connections[connection_id] = proxy
            
            try:
                await proxy.run()
            finally:
                # Save session log for validation
                session_log = proxy.get_session_log()
                await self._save_session_log(player_id, node_id, session_log)
                
                if connection_id in self.connections:
                    del self.connections[connection_id]
                    
        except asyncio.TimeoutError:
            await websocket.send(json.dumps({
                "type": "error",
                "message": "Connection timeout"
            }))
        except websockets.exceptions.ConnectionClosed:
            pass
        except Exception as e:
            self.logger.error(f"Error: {e}")
        finally:
            if player_id in self.player_connections:
                self.player_connections[player_id].discard(connection_id)
                
    async def _save_session_log(
        self,
        player_id: str,
        node_id: int,
        session_log: list
    ):
        """
        Save session log for later validation/analysis
        
        In production, this would save to a database
        """
        self.logger.debug(f"Session log for {player_id} on node {node_id}: {len(session_log)} entries")
        # TODO: Implement persistence
        
    async def start(self):
        """Start the server"""
        self.logger.info(f"Starting game terminal server on {self.host}:{self.port}")
        
        async with websockets.serve(
            self.handle_connection,
            self.host,
            self.port,
            ping_interval=30,
            ping_timeout=10,
            extra_headers={
                "Access-Control-Allow-Origin": "*"
            }
        ):
            self.logger.info("Server running")
            await asyncio.Future()


# =============================================================================
# Main Entry Point
# =============================================================================

async def main():
    """Main entry point"""
    logging.basicConfig(
        level=logging.DEBUG,
        format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
    )
    
    server = GameTerminalServer(
        host="0.0.0.0",
        port=8765,
        eve_host="localhost"
    )
    
    await server.start()


if __name__ == "__main__":
    asyncio.run(main())
