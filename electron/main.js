/**
 * NetOps Tower - Electron Main Process
 *
 * Manages the application lifecycle:
 * 1. Spawns the bundled Python FastAPI backend
 * 2. Waits for the backend to become available
 * 3. Creates the main BrowserWindow with the React frontend
 * 4. Handles graceful shutdown of all processes
 */
const { app, BrowserWindow, ipcMain, dialog, shell } = require('electron');
const path = require('path');
const { spawn } = require('child_process');
const http = require('http');
const log = require('electron-log');

// Configure logging
log.transports.file.level = 'info';
log.transports.console.level = 'debug';

const isDev = process.env.NODE_ENV === 'development';
const SERVER_PORT = 8000;
const SERVER_HOST = '127.0.0.1';
const SERVER_URL = `http://${SERVER_HOST}:${SERVER_PORT}`;
const CLIENT_DEV_URL = 'http://localhost:3000';

let mainWindow = null;
let serverProcess = null;
let isQuitting = false;

// ============================================================================
// Python Backend Management
// ============================================================================

/**
 * Resolve the path to the Python backend executable.
 * In development: runs uvicorn directly.
 * In production: runs the PyInstaller-bundled executable.
 */
function getServerExecutablePath() {
  if (isDev) {
    return null; // In dev mode, server is started separately or via uvicorn
  }

  const platform = process.platform;
  const execName = platform === 'win32' ? 'netops-server.exe' : 'netops-server';

  // In production, the server binary is in the resources/server directory
  const serverPath = path.join(process.resourcesPath, 'server', execName);
  return serverPath;
}

/**
 * Start the Python backend server.
 */
function startServer() {
  return new Promise((resolve, reject) => {
    if (isDev) {
      log.info('Development mode: assuming backend is running externally');
      resolve();
      return;
    }

    const serverPath = getServerExecutablePath();
    log.info(`Starting backend server: ${serverPath}`);

    try {
      serverProcess = spawn(serverPath, [], {
        env: {
          ...process.env,
          SERVER_HOST: SERVER_HOST,
          SERVER_PORT: String(SERVER_PORT),
          CORS_ORIGINS: `http://localhost:${SERVER_PORT},file://`,
          // Inherit user's EVE-NG config from environment or defaults
        },
        stdio: ['pipe', 'pipe', 'pipe'],
        // Detach on non-Windows so we can kill the process group
        detached: process.platform !== 'win32',
      });

      serverProcess.stdout.on('data', (data) => {
        log.info(`[server] ${data.toString().trim()}`);
      });

      serverProcess.stderr.on('data', (data) => {
        log.warn(`[server] ${data.toString().trim()}`);
      });

      serverProcess.on('error', (err) => {
        log.error(`Failed to start server: ${err.message}`);
        reject(err);
      });

      serverProcess.on('exit', (code, signal) => {
        log.info(`Server exited with code ${code}, signal ${signal}`);
        serverProcess = null;

        if (!isQuitting) {
          log.error('Server crashed unexpectedly');
          dialog.showErrorBox(
            'Server Error',
            'The NetOps Tower backend server has stopped unexpectedly. The application will now close.'
          );
          app.quit();
        }
      });

      resolve();
    } catch (err) {
      log.error(`Failed to spawn server: ${err.message}`);
      reject(err);
    }
  });
}

/**
 * Wait for the backend server to become responsive.
 */
function waitForServer(maxAttempts = 30, intervalMs = 1000) {
  return new Promise((resolve, reject) => {
    let attempts = 0;

    const check = () => {
      attempts++;
      log.debug(`Checking server readiness (attempt ${attempts}/${maxAttempts})...`);

      const req = http.get(`${SERVER_URL}/api/status/health`, (res) => {
        if (res.statusCode === 200) {
          log.info('Backend server is ready');
          resolve();
        } else {
          retry();
        }
      });

      req.on('error', () => retry());
      req.setTimeout(2000, () => {
        req.destroy();
        retry();
      });
    };

    const retry = () => {
      if (attempts >= maxAttempts) {
        reject(new Error(`Server did not become ready after ${maxAttempts} attempts`));
      } else {
        setTimeout(check, intervalMs);
      }
    };

    check();
  });
}

/**
 * Gracefully stop the backend server.
 */
function stopServer() {
  if (!serverProcess) return;

  log.info('Stopping backend server...');

  try {
    if (process.platform === 'win32') {
      // On Windows, use taskkill to kill the process tree
      spawn('taskkill', ['/pid', String(serverProcess.pid), '/f', '/t']);
    } else {
      // On Unix, kill the process group
      process.kill(-serverProcess.pid, 'SIGTERM');
    }
  } catch (err) {
    log.warn(`Error stopping server: ${err.message}`);
    try {
      serverProcess.kill('SIGKILL');
    } catch {
      // Process may already be dead
    }
  }

  serverProcess = null;
}

// ============================================================================
// Window Management
// ============================================================================

function createMainWindow() {
  mainWindow = new BrowserWindow({
    width: 1440,
    height: 900,
    minWidth: 1024,
    minHeight: 768,
    title: 'NetOps Tower',
    icon: path.join(__dirname, 'assets', 'icon.png'),
    backgroundColor: '#0a0a1a',
    show: false, // Show after content loads
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      nodeIntegration: false,
      contextIsolation: true,
      sandbox: true,
    },
  });

  // Load the app
  if (isDev) {
    mainWindow.loadURL(CLIENT_DEV_URL);
    mainWindow.webContents.openDevTools();
  } else {
    const indexPath = path.join(__dirname, '..', 'client', 'dist', 'index.html');
    mainWindow.loadFile(indexPath);
  }

  // Show window when ready
  mainWindow.once('ready-to-show', () => {
    mainWindow.show();
    mainWindow.focus();
  });

  // Handle external links
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url);
    return { action: 'deny' };
  });

  mainWindow.on('closed', () => {
    mainWindow = null;
  });

  return mainWindow;
}

// ============================================================================
// IPC Handlers
// ============================================================================

function setupIPC() {
  // Expose server URL to renderer
  ipcMain.handle('get-server-url', () => SERVER_URL);

  // Get app version
  ipcMain.handle('get-app-version', () => app.getVersion());

  // Open external URL
  ipcMain.handle('open-external', (_, url) => shell.openExternal(url));

  // Get platform info
  ipcMain.handle('get-platform', () => ({
    platform: process.platform,
    arch: process.arch,
    isDev,
  }));

  // EVE-NG connection settings (stored in electron-store)
  let Store;
  try {
    Store = require('electron-store');
  } catch {
    Store = null;
  }
  const store = Store ? new Store() : null;

  ipcMain.handle('get-setting', (_, key) => store?.get(key));
  ipcMain.handle('set-setting', (_, key, value) => store?.set(key, value));

  // Steam integration status
  ipcMain.handle('get-steam-status', () => {
    try {
      const steamworks = require('./steam');
      return steamworks.getStatus();
    } catch {
      return { initialized: false, available: false };
    }
  });
}

// ============================================================================
// App Lifecycle
// ============================================================================

// Prevent multiple instances
const gotSingleInstanceLock = app.requestSingleInstanceLock();
if (!gotSingleInstanceLock) {
  app.quit();
} else {
  app.on('second-instance', () => {
    if (mainWindow) {
      if (mainWindow.isMinimized()) mainWindow.restore();
      mainWindow.focus();
    }
  });
}

app.on('ready', async () => {
  log.info('NetOps Tower starting...');
  log.info(`Mode: ${isDev ? 'development' : 'production'}`);
  log.info(`Platform: ${process.platform} ${process.arch}`);

  setupIPC();

  try {
    // Start the Python backend
    await startServer();

    // Wait for it to be ready
    log.info('Waiting for backend server...');
    await waitForServer();

    // Create the main window
    createMainWindow();
  } catch (err) {
    log.error(`Startup failed: ${err.message}`);
    dialog.showErrorBox(
      'Startup Error',
      `NetOps Tower failed to start:\n\n${err.message}\n\nPlease check the logs and try again.`
    );
    app.quit();
  }
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', () => {
  if (mainWindow === null) {
    createMainWindow();
  }
});

app.on('before-quit', () => {
  isQuitting = true;
  stopServer();
});

app.on('quit', () => {
  stopServer();
});

// Handle uncaught exceptions
process.on('uncaughtException', (err) => {
  log.error(`Uncaught exception: ${err.message}`);
  log.error(err.stack);
});

process.on('unhandledRejection', (reason) => {
  log.error(`Unhandled rejection: ${reason}`);
});
