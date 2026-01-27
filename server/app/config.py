"""
NetOps Tower - Configuration
"""
from pydantic_settings import BaseSettings
from typing import List
import os


class Settings(BaseSettings):
    # EVE-NG Configuration
    eveng_host: str = "192.168.1.100"
    eveng_username: str = "admin"
    eveng_password: str = "eve"
    eveng_protocol: str = "https"
    eveng_verify_ssl: bool = False

    # Server Configuration
    server_host: str = "0.0.0.0"
    server_port: int = 8000
    cors_origins: str = "http://localhost:3000,http://localhost:3001"

    # Redis
    redis_url: str = "redis://localhost:6379"

    # JWT
    jwt_secret: str = "netops-tower-secret-change-me"
    jwt_algorithm: str = "HS256"
    jwt_expiration: int = 3600  # 1 hour

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
