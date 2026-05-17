"""
Tests for Console Proxy Service — TelnetProxy, SSHProxy, ConsoleManager.
"""
import pytest
import asyncio
from unittest.mock import AsyncMock, MagicMock, patch, call
from app.services.console_proxy import (
    TelnetProxy, SSHProxy, ConsoleManager, ConsoleSession,
    IAC, WILL, WONT, DO, DONT, SB, SE, NAWS, SGA, ECHO,
)


class TestTelnetConstants:
    """Verify telnet protocol constants are correct."""

    def test_iac(self):
        assert IAC == 255

    def test_will(self):
        assert WILL == 251

    def test_wont(self):
        assert WONT == 252

    def test_do(self):
        assert DO == 253

    def test_dont(self):
        assert DONT == 254

    def test_sb(self):
        assert SB == 250

    def test_se(self):
        assert SE == 240

    def test_naws(self):
        assert NAWS == 31

    def test_echo(self):
        assert ECHO == 1

    def test_sga(self):
        assert SGA == 3


class TestTelnetProxy:
    """Tests for the TelnetProxy class."""

    @pytest.fixture
    def proxy(self):
        """Create a proxy with a mock callback."""
        callback = AsyncMock()
        return TelnetProxy(host="10.0.0.1", port=32768, on_data=callback)

    def test_initial_state(self, proxy):
        assert proxy.host == "10.0.0.1"
        assert proxy.port == 32768
        assert proxy.reader is None
        assert proxy.writer is None
        assert proxy._running is False

    def test_process_telnet_data_plain_text(self, proxy):
        """Plain text passes through unchanged."""
        data = b"Hello, World!\r\n"
        result = proxy._process_telnet_data(data)
        assert result == data

    def test_process_telnet_data_empty(self, proxy):
        """Empty data returns empty."""
        assert proxy._process_telnet_data(b"") == b""

    def test_process_telnet_data_escaped_iac(self, proxy):
        """Escaped IAC (255, 255) yields a single 255."""
        data = bytes([IAC, IAC])
        result = proxy._process_telnet_data(data)
        assert result == bytes([IAC])

    def test_process_telnet_data_will_negotiation(self, proxy):
        """WILL negotiation is stripped from output."""
        data = bytes([IAC, WILL, SGA]) + b"hello"
        result = proxy._process_telnet_data(data)
        assert result == b"hello"

    def test_process_telnet_data_do_negotiation(self, proxy):
        """DO negotiation is stripped from output."""
        data = b"data" + bytes([IAC, DO, ECHO]) + b"more"
        result = proxy._process_telnet_data(data)
        assert result == b"datamore"

    def test_process_telnet_data_subnegotiation(self, proxy):
        """Subnegotiation (SB ... SE) is stripped from output."""
        data = bytes([IAC, SB, NAWS, 0, 80, 0, 24, IAC, SE]) + b"output"
        result = proxy._process_telnet_data(data)
        assert result == b"output"

    def test_process_telnet_data_truncated_iac(self, proxy):
        """Truncated IAC at end of buffer is handled."""
        data = bytes([IAC])  # IAC alone
        result = proxy._process_telnet_data(data)
        assert result == b""

    def test_process_telnet_data_mixed(self, proxy):
        """Mixed telnet commands and data."""
        data = (
            b"Welcome"
            + bytes([IAC, WILL, SGA])
            + b" to "
            + bytes([IAC, DO, ECHO])
            + b"router\r\n"
        )
        result = proxy._process_telnet_data(data)
        assert result == b"Welcome to router\r\n"

    def test_send_window_size_builds_naws(self, proxy):
        """send_window_size writes the correct NAWS subnegotiation."""
        proxy.writer = MagicMock()
        proxy.writer.drain = AsyncMock()
        proxy.writer.is_closing.return_value = False

        asyncio.run(proxy.send_window_size(132, 43))

        # Should have written NAWS with cols=132, rows=43
        proxy.writer.write.assert_called()
        written = proxy.writer.write.call_args[0][0]
        assert IAC in written
        assert proxy.cols == 132
        assert proxy.rows == 43

    @pytest.mark.asyncio
    async def test_send_data(self, proxy):
        """send writes data to the telnet writer."""
        proxy.writer = MagicMock()
        proxy.writer.drain = AsyncMock()
        proxy.writer.is_closing.return_value = False

        await proxy.send(b"show version\r\n")
        proxy.writer.write.assert_called_with(b"show version\r\n")

    @pytest.mark.asyncio
    async def test_send_when_writer_closed(self, proxy):
        """send doesn't write when writer is closing."""
        proxy.writer = MagicMock()
        proxy.writer.is_closing.return_value = True

        await proxy.send(b"data")  # should not raise or write
        proxy.writer.write.assert_not_called()

    @pytest.mark.asyncio
    async def test_send_no_writer(self, proxy):
        """send is safe when no writer exists."""
        await proxy.send(b"data")  # should not raise

    @pytest.mark.asyncio
    async def test_close(self, proxy):
        """Close properly cleans up."""
        import asyncio

        class MockTask:
            def cancel(self):
                pass

            def __await__(self):
                raise asyncio.CancelledError()
                yield  # make it a generator

        proxy.writer = MagicMock()
        proxy.writer.close = MagicMock()
        proxy.writer.wait_closed = AsyncMock()
        proxy._read_task = MockTask()
        proxy._running = True

        await proxy.close()

        assert proxy._running is False

    @pytest.mark.asyncio
    async def test_connect_timeout(self, proxy):
        """Connect returns False on timeout."""
        with patch('asyncio.wait_for', side_effect=asyncio.TimeoutError()):
            result = await proxy.connect()
            assert result is False

    @pytest.mark.asyncio
    async def test_connect_error(self, proxy):
        """Connect returns False on general error."""
        with patch('asyncio.open_connection', side_effect=OSError("Connection refused")):
            result = await proxy.connect()
            assert result is False


class TestConsoleSession:
    """Tests for the ConsoleSession dataclass."""

    def test_default_values(self):
        session = ConsoleSession(session_id="s1", host="10.0.0.1", port=23, console_type="telnet")
        assert session.cols == 80
        assert session.rows == 24
        assert session.active is False
        assert session.reader is None
        assert session.writer is None


class TestConsoleManager:
    """Tests for the ConsoleManager singleton."""

    @pytest.fixture
    def manager(self):
        return ConsoleManager()

    def test_initial_state(self, manager):
        assert manager.sessions == {}

    def test_get_session_not_found(self, manager):
        assert manager.get_session("nonexistent") is None

    def test_list_sessions_empty(self, manager):
        assert manager.list_sessions() == []

    @pytest.mark.asyncio
    async def test_close_session(self, manager):
        """Close removes session and sets inactive."""
        session = ConsoleSession(session_id="s1", host="10.0.0.1", port=23, console_type="telnet")
        manager.sessions["s1"] = session

        await manager.close_session("s1")
        assert "s1" not in manager.sessions

    @pytest.mark.asyncio
    async def test_close_session_nonexistent(self, manager):
        """Close on nonexistent session is safe."""
        await manager.close_session("nonexistent")  # should not raise


class TestSSHProxy:
    """Tests for SSHProxy class."""

    @pytest.fixture
    def ssh_proxy(self):
        callback = AsyncMock()
        return SSHProxy(
            host="10.0.0.1", port=22,
            username="admin", password="password",
            on_data=callback,
        )

    def test_initial_state(self, ssh_proxy):
        assert ssh_proxy.host == "10.0.0.1"
        assert ssh_proxy.username == "admin"
        assert ssh_proxy.conn is None
        assert ssh_proxy.channel is None
        assert ssh_proxy._running is False

    @pytest.mark.asyncio
    async def test_connect_timeout(self, ssh_proxy):
        """SSH connect returns False on timeout."""
        with patch('asyncio.wait_for', side_effect=asyncio.TimeoutError()):
            result = await ssh_proxy.connect()
            assert result is False

    @pytest.mark.asyncio
    async def test_send_no_channel(self, ssh_proxy):
        """send is safe when no channel exists."""
        await ssh_proxy.send(b"data")  # should not raise

    @pytest.mark.asyncio
    async def test_close_no_connection(self, ssh_proxy):
        """close is safe when not connected."""
        await ssh_proxy.close()  # should not raise
