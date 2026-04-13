# -*- mode: python ; coding: utf-8 -*-
"""
PyInstaller spec for bundling the NetOps Tower FastAPI backend
into a standalone executable.

Usage:
    cd server
    pyinstaller netops-server.spec

This creates a single-folder distribution in server/dist/netops-server/
containing the executable and all dependencies.
"""
import sys
from pathlib import Path

block_cipher = None
server_dir = Path(SPECPATH)

a = Analysis(
    ['app/run_server.py'],
    pathex=[str(server_dir)],
    binaries=[],
    datas=[
        # Include .env.example as fallback config
        ('.env.example', '.'),
    ],
    hiddenimports=[
        # FastAPI and its dependencies
        'fastapi',
        'fastapi.middleware.cors',
        'uvicorn',
        'uvicorn.logging',
        'uvicorn.loops',
        'uvicorn.loops.auto',
        'uvicorn.protocols',
        'uvicorn.protocols.http',
        'uvicorn.protocols.http.auto',
        'uvicorn.protocols.http.h11_impl',
        'uvicorn.protocols.http.httptools_impl',
        'uvicorn.protocols.websockets',
        'uvicorn.protocols.websockets.auto',
        'uvicorn.protocols.websockets.websockets_impl',
        'uvicorn.lifespan',
        'uvicorn.lifespan.on',
        'uvicorn.lifespan.off',
        # Pydantic
        'pydantic',
        'pydantic_settings',
        'pydantic.deprecated.decorator',
        # Our app modules
        'app',
        'app.main',
        'app.config',
        'app.routes',
        'app.routes.labs',
        'app.routes.nodes',
        'app.routes.console',
        'app.routes.status',
        'app.routes.uptime',
        'app.services',
        'app.services.eveng',
        'app.services.console_proxy',
        'app.services.uptime_tracker',
        'app.models',
        'app.models.schemas',
        # Async libraries
        'asyncio',
        'asyncssh',
        'telnetlib3',
        'websockets',
        # HTTP
        'httpx',
        'httpx._transports',
        'httpx._transports.default',
        # Other
        'dotenv',
        'multipart',
        'email.mime.multipart',
    ],
    hookspath=[],
    hooksconfig={},
    runtime_hooks=[],
    excludes=[
        # Exclude test dependencies
        'pytest',
        'pytest_asyncio',
        # Exclude unnecessary large packages
        'tkinter',
        'matplotlib',
        'numpy',
        'pandas',
        'scipy',
    ],
    win_no_prefer_redirects=False,
    win_private_assemblies=False,
    cipher=block_cipher,
    noarchive=False,
)

pyz = PYZ(a.pure, a.zipped_data, cipher=block_cipher)

exe = EXE(
    pyz,
    a.scripts,
    [],
    exclude_binaries=True,
    name='netops-server',
    debug=False,
    bootloader_ignore_signals=False,
    strip=False,
    upx=True,
    console=True,  # Keep console for logging
    disable_windowed_traceback=False,
    argv_emulation=False,
    target_arch=None,
    codesign_identity=None,
    entitlements_file=None,
    icon=None,
)

coll = COLLECT(
    exe,
    a.binaries,
    a.zipfiles,
    a.datas,
    strip=False,
    upx=True,
    upx_exclude=[],
    name='netops-server',
)
