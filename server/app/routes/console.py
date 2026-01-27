"""
NetOps Tower - Console WebSocket Routes

Handles WebSocket connections for terminal access to nodes.
"""
import json
import asyncio
import logging
from fastapi import APIRouter, WebSocket, WebSocketDisconnect, Query
from typing import Optional
import uuid

from ..services.eveng import eveng_client
from ..services.console_proxy import TelnetProxy, SSHProxy, console_manager
from ..models.schemas import ConsoleType

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/console", tags=["Console"])


@router.websocket("/ws")
async def console_websocket(
    websocket: WebSocket,
    lab_path: str = Query(..., description="Lab path"),
    node_id: int = Query(..., description="Node ID"),
):
    """
    WebSocket endpoint for console access.

    Connect to: ws://host:port/console/ws?lab_path=/path/to/lab.unl&node_id=1

    Messages:
    - Send: raw terminal input (string)
    - Send: {"type": "resize", "cols": 80, "rows": 24}
    - Receive: raw terminal output (string)
    - Receive: {"type": "connected", "node": "..."}
    - Receive: {"type": "error", "message": "..."}
    """
    await websocket.accept()

    session_id = str(uuid.uuid4())
    proxy: Optional[TelnetProxy | SSHProxy] = None

    try:
        # Get node info from EVE-NG
        node = await eveng_client.get_node(lab_path, node_id)

        if not node:
            await websocket.send_json({
                "type": "error",
                "message": f"Node {node_id} not found in lab {lab_path}"
            })
            await websocket.close()
            return

        if not node.console_port:
            await websocket.send_json({
                "type": "error",
                "message": f"Node {node.name} has no console port (is it running?)"
            })
            await websocket.close()
            return

        logger.info(f"Console request for {node.name} at {node.console_host}:{node.console_port}")

        # Callback to forward data to WebSocket
        async def on_console_data(data: bytes):
            try:
                # Send as text, handling encoding
                text = data.decode('utf-8', errors='replace')
                await websocket.send_text(text)
            except Exception as e:
                logger.error(f"Failed to send to websocket: {e}")

        # Create appropriate proxy based on console type
        if node.console_type == ConsoleType.SSH:
            # For SSH, we'd need credentials - for now, fall back to telnet
            # In production, you'd get SSH creds from config or user
            proxy = TelnetProxy(
                host=node.console_host,
                port=node.console_port,
                on_data=on_console_data
            )
        else:
            # Telnet (default for most EVE-NG nodes)
            proxy = TelnetProxy(
                host=node.console_host,
                port=node.console_port,
                on_data=on_console_data
            )

        # Connect to node console
        connected = await proxy.connect()

        if not connected:
            await websocket.send_json({
                "type": "error",
                "message": f"Failed to connect to {node.name} console"
            })
            await websocket.close()
            return

        # Send connected message
        await websocket.send_json({
            "type": "connected",
            "node": node.name,
            "console_type": node.console_type.value,
            "session_id": session_id
        })

        # Main loop - receive from WebSocket, send to console
        while True:
            try:
                message = await websocket.receive()

                if message["type"] == "websocket.disconnect":
                    break

                if "text" in message:
                    text = message["text"]

                    # Check if it's a control message (JSON)
                    if text.startswith("{"):
                        try:
                            data = json.loads(text)
                            msg_type = data.get("type")

                            if msg_type == "resize":
                                cols = data.get("cols", 80)
                                rows = data.get("rows", 24)
                                await proxy.send_window_size(cols, rows)
                                continue

                            if msg_type == "ping":
                                await websocket.send_json({"type": "pong"})
                                continue

                        except json.JSONDecodeError:
                            pass  # Not JSON, treat as terminal input

                    # Send as terminal input
                    await proxy.send(text.encode('utf-8'))

                elif "bytes" in message:
                    await proxy.send(message["bytes"])

            except WebSocketDisconnect:
                break
            except Exception as e:
                logger.error(f"WebSocket error: {e}")
                break

    except Exception as e:
        logger.error(f"Console session error: {e}")
        try:
            await websocket.send_json({
                "type": "error",
                "message": str(e)
            })
        except:
            pass

    finally:
        # Cleanup
        if proxy:
            await proxy.close()
        await console_manager.close_session(session_id)
        logger.info(f"Console session {session_id} closed")


@router.websocket("/ws/ssh")
async def ssh_console_websocket(
    websocket: WebSocket,
    host: str = Query(..., description="SSH host"),
    port: int = Query(22, description="SSH port"),
    username: str = Query(..., description="SSH username"),
    password: str = Query(..., description="SSH password"),
):
    """
    Direct SSH WebSocket endpoint.

    Connect to: ws://host:port/console/ws/ssh?host=x&port=22&username=x&password=x
    """
    await websocket.accept()

    session_id = str(uuid.uuid4())
    proxy: Optional[SSHProxy] = None

    try:
        # Callback to forward data to WebSocket
        async def on_console_data(data: bytes):
            try:
                text = data.decode('utf-8', errors='replace')
                await websocket.send_text(text)
            except Exception as e:
                logger.error(f"Failed to send to websocket: {e}")

        # Create SSH proxy
        proxy = SSHProxy(
            host=host,
            port=port,
            username=username,
            password=password,
            on_data=on_console_data
        )

        # Connect
        connected = await proxy.connect()

        if not connected:
            await websocket.send_json({
                "type": "error",
                "message": f"Failed to connect via SSH to {host}:{port}"
            })
            await websocket.close()
            return

        # Send connected message
        await websocket.send_json({
            "type": "connected",
            "host": host,
            "console_type": "ssh",
            "session_id": session_id
        })

        # Main loop
        while True:
            try:
                message = await websocket.receive()

                if message["type"] == "websocket.disconnect":
                    break

                if "text" in message:
                    text = message["text"]

                    if text.startswith("{"):
                        try:
                            data = json.loads(text)
                            msg_type = data.get("type")

                            if msg_type == "resize":
                                cols = data.get("cols", 80)
                                rows = data.get("rows", 24)
                                await proxy.send_window_size(cols, rows)
                                continue

                            if msg_type == "ping":
                                await websocket.send_json({"type": "pong"})
                                continue

                        except json.JSONDecodeError:
                            pass

                    await proxy.send(text.encode('utf-8'))

                elif "bytes" in message:
                    await proxy.send(message["bytes"])

            except WebSocketDisconnect:
                break
            except Exception as e:
                logger.error(f"SSH WebSocket error: {e}")
                break

    except Exception as e:
        logger.error(f"SSH session error: {e}")
        try:
            await websocket.send_json({
                "type": "error",
                "message": str(e)
            })
        except:
            pass

    finally:
        if proxy:
            await proxy.close()
        await console_manager.close_session(session_id)
        logger.info(f"SSH session {session_id} closed")
