"""
NetOps Tower - Backend Server

FastAPI server providing:
- EVE-NG API integration
- WebSocket console proxy (telnet/SSH)
- Game state management
"""
import logging
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from .config import settings
from .services.eveng import eveng_client
from .services.uptime_tracker import uptime_tracker
from .routes import labs, nodes, console, status, uptime, validation

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s"
)
logger = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application lifespan handler."""
    # Startup
    logger.info("Starting NetOps Tower Backend...")
    logger.info(f"EVE-NG Host: {settings.eveng_host}")

    # Try to connect to EVE-NG
    try:
        connected = await eveng_client.login()
        if connected:
            logger.info("Successfully connected to EVE-NG")
        else:
            logger.warning("Could not connect to EVE-NG - check configuration")
    except Exception as e:
        logger.error(f"EVE-NG connection error: {e}")

    yield

    # Shutdown
    logger.info("Shutting down NetOps Tower Backend...")
    await uptime_tracker.cleanup()
    await eveng_client.close()


# Create FastAPI app
app = FastAPI(
    title="NetOps Tower API",
    description="Backend API for NetOps Tower - Network Engineering Training Game",
    version="1.0.0",
    lifespan=lifespan
)

# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins_list,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include routers
app.include_router(status.router, prefix="/api")
app.include_router(labs.router, prefix="/api")
app.include_router(nodes.router, prefix="/api")
app.include_router(console.router, prefix="/api")
app.include_router(uptime.router, prefix="/api")
app.include_router(validation.router, prefix="/api")


@app.get("/")
async def root():
    """Root endpoint."""
    return {
        "name": "NetOps Tower API",
        "version": "1.0.0",
        "docs": "/docs",
        "status": "/api/status"
    }


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(
        "app.main:app",
        host=settings.server_host,
        port=settings.server_port,
        reload=True
    )
