"""
Tests for NetOps Tower Configuration.
"""
import pytest
import os
from app.config import Settings, settings


class TestSettings:
    """Tests for the application settings."""

    def test_default_values(self):
        """Verify default configuration values."""
        s = Settings()
        assert s.eveng_host == "192.168.1.100"
        assert s.eveng_username == "admin"
        assert s.eveng_password == "eve"
        assert s.eveng_protocol == "https"
        assert s.eveng_verify_ssl is False
        assert s.server_host == "0.0.0.0"
        assert s.server_port == 8000

    def test_cors_origins_list(self):
        """Verify CORS origins are properly parsed."""
        s = Settings(cors_origins="http://localhost:3000,http://localhost:3001")
        result = s.cors_origins_list
        assert isinstance(result, list)
        assert "http://localhost:3000" in result
        assert "http://localhost:3001" in result

    def test_cors_origins_list_single(self):
        """Verify single CORS origin works."""
        s = Settings(cors_origins="http://localhost:3000")
        result = s.cors_origins_list
        assert isinstance(result, list)
        assert "http://localhost:3000" in result
        assert len(result) == 1

    def test_cors_origins_list_with_whitespace(self):
        """Verify whitespace is stripped from CORS origins."""
        s = Settings(cors_origins="http://localhost:3000 , http://localhost:3001")
        result = s.cors_origins_list
        assert "http://localhost:3000" in result
        assert "http://localhost:3001" in result

    def test_eveng_base_url(self):
        """Verify EVE-NG base URL construction."""
        s = Settings(eveng_host="10.0.0.1", eveng_protocol="http")
        assert s.eveng_base_url == "http://10.0.0.1"

    def test_eveng_base_url_defaults_to_https(self):
        """Verify base URL defaults to https."""
        s = Settings(eveng_host="eve.example.com")
        assert s.eveng_base_url == "https://eve.example.com"

    def test_uptime_defaults(self):
        """Verify uptime tracking defaults."""
        s = Settings()
        assert s.uptime_check_interval > 0
        assert s.uptime_points_per_minute >= 0
        assert 0 <= s.uptime_bonus_threshold <= 100
        assert s.uptime_bonus_multiplier >= 1.0

    def test_config_override_via_env(self, monkeypatch):
        """Verify environment variables override defaults."""
        monkeypatch.setenv("SERVER_PORT", "9999")
        monkeypatch.setenv("EVENG_HOST", "custom-eve.local")
        s = Settings()
        assert s.server_port == 9999
        assert s.eveng_host == "custom-eve.local"

    def test_redis_url_default(self):
        """Verify Redis URL default."""
        s = Settings()
        assert "redis://" in s.redis_url

    def test_singleton(self):
        """Verify settings singleton is a Settings instance."""
        assert isinstance(settings, Settings)
