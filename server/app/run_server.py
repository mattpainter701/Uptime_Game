"""
NetOps Tower - Standalone Server Entry Point

Used by PyInstaller to create a bundled executable.
Starts the FastAPI server with uvicorn programmatically.
"""
import os
import sys
import uvicorn


def get_base_path():
    """Get the base path for bundled resources (PyInstaller or normal)."""
    if getattr(sys, 'frozen', False):
        # Running as a PyInstaller bundle
        return os.path.dirname(sys.executable)
    return os.path.dirname(os.path.dirname(os.path.abspath(__file__)))


def main():
    base_path = get_base_path()

    # Load .env from the base path if it exists
    env_path = os.path.join(base_path, '.env')
    if os.path.exists(env_path):
        from dotenv import load_dotenv
        load_dotenv(env_path)

    host = os.environ.get('SERVER_HOST', '127.0.0.1')
    port = int(os.environ.get('SERVER_PORT', '8000'))

    print(f"NetOps Tower Server starting on {host}:{port}")
    print(f"Base path: {base_path}")

    uvicorn.run(
        "app.main:app",
        host=host,
        port=port,
        log_level="info",
        # No reload in production bundle
        reload=False,
    )


if __name__ == '__main__':
    main()
