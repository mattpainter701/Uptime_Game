"""
Test configuration and fixtures for NetOps Tower backend tests.
"""
import pytest
import pytest_asyncio
from unittest.mock import AsyncMock, patch
from httpx import ASGITransport, AsyncClient

from app.main import app
from app.services.eveng import eveng_client


@pytest.fixture
def mock_eveng():
    """Mock the EVE-NG client for tests that don't need a real connection."""
    with patch.object(eveng_client, 'get_status', new_callable=AsyncMock) as mock_status, \
         patch.object(eveng_client, 'list_templates', new_callable=AsyncMock) as mock_templates, \
         patch.object(eveng_client, 'login', new_callable=AsyncMock) as mock_login:
        mock_status.return_value = None
        mock_templates.return_value = []
        mock_login.return_value = False
        yield {
            'get_status': mock_status,
            'list_templates': mock_templates,
            'login': mock_login,
        }


@pytest_asyncio.fixture
async def client(mock_eveng):
    """Create an async test client for the FastAPI app."""
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        yield ac
