"""
NetOps Tower - Console Proxy Service

Handles WebSocket-to-Telnet/SSH proxying for console connections.
"""
import asyncio
import logging
from typing import Optional, Callable, Awaitable
from dataclasses import dataclass
import struct

logger = logging.getLogger(__name__)

# Telnet protocol constants
IAC = 255   # Interpret As Command
DONT = 254
DO = 253
WONT = 252
WILL = 251
SB = 250    # Subnegotiation Begin
SE = 240    # Subnegotiation End
NAWS = 31   # Negotiate About Window Size
ECHO = 1
SGA = 3     # Suppress Go Ahead
TTYPE = 24  # Terminal Type


@dataclass
class ConsoleSession:
    """Represents an active console session."""
    session_id: str
    host: str
    port: int
    console_type: str
    reader: Optional[asyncio.StreamReader] = None
    writer: Optional[asyncio.StreamWriter] = None
    ssh_conn: Optional[object] = None  # asyncssh connection
    ssh_channel: Optional[object] = None
    cols: int = 80
    rows: int = 24
    active: bool = False


class TelnetProxy:
    """
    Handles Telnet protocol negotiation and data proxying.
    """

    def __init__(
        self,
        host: str,
        port: int,
        on_data: Callable[[bytes], Awaitable[None]],
        cols: int = 80,
        rows: int = 24
    ):
        self.host = host
        self.port = port
        self.on_data = on_data
        self.cols = cols
        self.rows = rows
        self.reader: Optional[asyncio.StreamReader] = None
        self.writer: Optional[asyncio.StreamWriter] = None
        self._running = False
        self._read_task: Optional[asyncio.Task] = None

    async def connect(self) -> bool:
        """Establish telnet connection."""
        try:
            self.reader, self.writer = await asyncio.wait_for(
                asyncio.open_connection(self.host, self.port),
                timeout=10.0
            )
            self._running = True

            # Send initial terminal negotiation
            await self._negotiate_terminal()

            # Start reading from telnet
            self._read_task = asyncio.create_task(self._read_loop())

            logger.info(f"Connected to {self.host}:{self.port}")
            return True

        except asyncio.TimeoutError:
            logger.error(f"Connection timeout to {self.host}:{self.port}")
            return False
        except Exception as e:
            logger.error(f"Failed to connect to {self.host}:{self.port}: {e}")
            return False

    async def _negotiate_terminal(self):
        """Send telnet negotiation options."""
        if not self.writer:
            return

        # Will negotiate about window size
        self.writer.write(bytes([IAC, WILL, NAWS]))
        # Will suppress go ahead
        self.writer.write(bytes([IAC, WILL, SGA]))
        # Will echo
        self.writer.write(bytes([IAC, WILL, ECHO]))
        # Do suppress go ahead
        self.writer.write(bytes([IAC, DO, SGA]))

        await self.writer.drain()

        # Send window size
        await self.send_window_size(self.cols, self.rows)

    async def send_window_size(self, cols: int, rows: int):
        """Send NAWS (window size) to telnet server."""
        if not self.writer:
            return

        self.cols = cols
        self.rows = rows

        # Build NAWS subnegotiation
        naws_data = bytes([
            IAC, SB, NAWS,
            (cols >> 8) & 0xff, cols & 0xff,
            (rows >> 8) & 0xff, rows & 0xff,
            IAC, SE
        ])

        self.writer.write(naws_data)
        await self.writer.drain()

    async def _read_loop(self):
        """Read data from telnet and forward to callback."""
        try:
            while self._running and self.reader:
                data = await self.reader.read(4096)
                if not data:
                    logger.info("Telnet connection closed by remote")
                    break

                # Process telnet commands, forward data
                processed = self._process_telnet_data(data)
                if processed:
                    await self.on_data(processed)

        except asyncio.CancelledError:
            pass
        except Exception as e:
            logger.error(f"Telnet read error: {e}")
        finally:
            self._running = False

    def _process_telnet_data(self, data: bytes) -> bytes:
        """
        Process telnet data, handling IAC sequences.
        Returns cleaned data without telnet commands.
        """
        result = bytearray()
        i = 0

        while i < len(data):
            if data[i] == IAC:
                if i + 1 >= len(data):
                    break

                cmd = data[i + 1]

                if cmd == IAC:
                    # Escaped IAC, output single 255
                    result.append(IAC)
                    i += 2
                elif cmd in (DO, DONT, WILL, WONT):
                    # Three-byte command
                    if i + 2 < len(data):
                        # Handle negotiation if needed
                        self._handle_negotiation(cmd, data[i + 2])
                    i += 3
                elif cmd == SB:
                    # Subnegotiation - skip until SE
                    j = i + 2
                    while j < len(data) - 1:
                        if data[j] == IAC and data[j + 1] == SE:
                            break
                        j += 1
                    i = j + 2
                else:
                    # Two-byte command
                    i += 2
            else:
                result.append(data[i])
                i += 1

        return bytes(result)

    def _handle_negotiation(self, cmd: int, option: int):
        """Handle telnet negotiation requests."""
        # For now, we just accept most things
        # In a full implementation, we'd respond appropriately
        pass

    async def send(self, data: bytes):
        """Send data to telnet server."""
        if self.writer and not self.writer.is_closing():
            self.writer.write(data)
            await self.writer.drain()

    async def close(self):
        """Close the telnet connection."""
        self._running = False

        if self._read_task:
            self._read_task.cancel()
            try:
                await self._read_task
            except asyncio.CancelledError:
                pass

        if self.writer:
            self.writer.close()
            try:
                await self.writer.wait_closed()
            except Exception:
                pass

        logger.info(f"Disconnected from {self.host}:{self.port}")


class SSHProxy:
    """
    Handles SSH connections for console access.
    """

    def __init__(
        self,
        host: str,
        port: int,
        username: str,
        password: str,
        on_data: Callable[[bytes], Awaitable[None]],
        cols: int = 80,
        rows: int = 24
    ):
        self.host = host
        self.port = port
        self.username = username
        self.password = password
        self.on_data = on_data
        self.cols = cols
        self.rows = rows
        self.conn = None
        self.channel = None
        self._running = False
        self._read_task: Optional[asyncio.Task] = None

    async def connect(self) -> bool:
        """Establish SSH connection."""
        try:
            import asyncssh

            self.conn = await asyncio.wait_for(
                asyncssh.connect(
                    self.host,
                    port=self.port,
                    username=self.username,
                    password=self.password,
                    known_hosts=None  # Skip host key verification for lab
                ),
                timeout=15.0
            )

            self.channel = await self.conn.create_session(
                term_type='xterm-256color',
                term_size=(self.cols, self.rows)
            )

            self._running = True
            self._read_task = asyncio.create_task(self._read_loop())

            logger.info(f"SSH connected to {self.host}:{self.port}")
            return True

        except asyncio.TimeoutError:
            logger.error(f"SSH connection timeout to {self.host}:{self.port}")
            return False
        except Exception as e:
            logger.error(f"SSH connection failed to {self.host}:{self.port}: {e}")
            return False

    async def _read_loop(self):
        """Read data from SSH and forward to callback."""
        try:
            while self._running and self.channel:
                data = await self.channel.read(4096)
                if not data:
                    break

                if isinstance(data, str):
                    data = data.encode('utf-8', errors='replace')

                await self.on_data(data)

        except asyncio.CancelledError:
            pass
        except Exception as e:
            logger.error(f"SSH read error: {e}")
        finally:
            self._running = False

    async def send_window_size(self, cols: int, rows: int):
        """Update terminal size."""
        self.cols = cols
        self.rows = rows

        if self.channel:
            try:
                self.channel.change_terminal_size(cols, rows)
            except Exception as e:
                logger.error(f"Failed to change terminal size: {e}")

    async def send(self, data: bytes):
        """Send data to SSH server."""
        if self.channel:
            try:
                self.channel.write(data.decode('utf-8', errors='replace'))
            except Exception as e:
                logger.error(f"SSH send error: {e}")

    async def close(self):
        """Close the SSH connection."""
        self._running = False

        if self._read_task:
            self._read_task.cancel()
            try:
                await self._read_task
            except asyncio.CancelledError:
                pass

        if self.channel:
            self.channel.close()

        if self.conn:
            self.conn.close()
            await self.conn.wait_closed()

        logger.info(f"SSH disconnected from {self.host}:{self.port}")


class ConsoleManager:
    """
    Manages console sessions for multiple users/nodes.
    """

    def __init__(self):
        self.sessions: dict[str, ConsoleSession] = {}

    async def create_telnet_session(
        self,
        session_id: str,
        host: str,
        port: int,
        on_data: Callable[[bytes], Awaitable[None]],
        cols: int = 80,
        rows: int = 24
    ) -> Optional[TelnetProxy]:
        """Create a new telnet proxy session."""
        proxy = TelnetProxy(host, port, on_data, cols, rows)

        if await proxy.connect():
            session = ConsoleSession(
                session_id=session_id,
                host=host,
                port=port,
                console_type="telnet",
                cols=cols,
                rows=rows,
                active=True
            )
            self.sessions[session_id] = session
            return proxy

        return None

    async def create_ssh_session(
        self,
        session_id: str,
        host: str,
        port: int,
        username: str,
        password: str,
        on_data: Callable[[bytes], Awaitable[None]],
        cols: int = 80,
        rows: int = 24
    ) -> Optional[SSHProxy]:
        """Create a new SSH proxy session."""
        proxy = SSHProxy(host, port, username, password, on_data, cols, rows)

        if await proxy.connect():
            session = ConsoleSession(
                session_id=session_id,
                host=host,
                port=port,
                console_type="ssh",
                cols=cols,
                rows=rows,
                active=True
            )
            self.sessions[session_id] = session
            return proxy

        return None

    def get_session(self, session_id: str) -> Optional[ConsoleSession]:
        """Get a session by ID."""
        return self.sessions.get(session_id)

    async def close_session(self, session_id: str):
        """Close and remove a session."""
        if session_id in self.sessions:
            session = self.sessions.pop(session_id)
            session.active = False

    def list_sessions(self) -> list[ConsoleSession]:
        """List all active sessions."""
        return list(self.sessions.values())


# Singleton instance
console_manager = ConsoleManager()
