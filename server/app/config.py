"""
NetOps Tower - Configuration
"""
import sys
from pydantic_settings import BaseSettings
from typing import List
import os

# Detect if running as a PyInstaller bundle
IS_BUNDLED = getattr(sys, 'frozen', False)


class Settings(BaseSettings):
    # EVE-NG Configuration
    eveng_host: str = "192.168.1.100"
    eveng_username: str = "admin"
    eveng_password: str = "eve"
    eveng_protocol: str = "https"
    eveng_verify_ssl: bool = False

    # Server Configuration
    # When bundled (Electron), bind to localhost only for security
    server_host: str = "127.0.0.1" if IS_BUNDLED else "0.0.0.0"
    server_port: int = 8000
    cors_origins: str = "http://localhost:3000,http://localhost:3001,http://127.0.0.1:8000,file://"

    # Redis
    redis_url: str = "redis://localhost:6379"

    # JWT
    jwt_secret: str = "netops-tower-secret-change-me"
    jwt_algorithm: str = "HS256"
    jwt_expiration: int = 3600  # 1 hour

    # Uptime Tracking
    uptime_check_interval: int = 30  # seconds between status polls
    uptime_points_per_minute: int = 1  # base points earned per minute of uptime
    uptime_bonus_threshold: float = 99.0  # % uptime for bonus multiplier
    uptime_bonus_multiplier: float = 1.5  # multiplier when above threshold

    # Penalties
    downtime_penalty_per_minute: int = 5  # points lost per minute of downtime
    reputation_loss_per_incident: int = 2  # reputation hit per downtime event

    # Ticket Time Limits
    enforce_time_limits: bool = True  # enable ticket countdown timers

    # EVE-NG Timeouts
    eveng_timeout: int = 30  # seconds for API requests
    eveng_console_timeout: int = 10  # seconds for console connectivity check

    @property
    def eveng_base_url(self) -> str:
        return f"{self.eveng_protocol}://{self.eveng_host}"

    @property
    def cors_origins_list(self) -> List[str]:
        return [origin.strip() for origin in self.cors_origins.split(",")]

    class Config:
        env_file = ".env"
        env_file_encoding = "utf-8"


settings = Settings()
