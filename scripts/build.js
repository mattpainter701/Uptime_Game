#!/usr/bin/env node
/**
 * NetOps Tower - Build Orchestration Script
 *
 * Builds both the React frontend and Python backend for Electron packaging.
 *
 * Steps:
 * 1. Build the React client (vite build with Electron base path)
 * 2. Build the Python server (PyInstaller bundle)
 * 3. Report results
 *
 * Usage:
 *   node scripts/build.js [--skip-client] [--skip-server]
 */
const { execSync } = require('child_process');
const path = require('path');
const fs = require('fs');

const ROOT = path.resolve(__dirname, '..');
const CLIENT_DIR = path.join(ROOT, 'client');
const SERVER_DIR = path.join(ROOT, 'server');

const args = process.argv.slice(2);
const skipClient = args.includes('--skip-client');
const skipServer = args.includes('--skip-server');

function run(cmd, cwd, env = {}) {
  console.log(`\n> ${cmd}`);
  console.log(`  (in ${cwd})\n`);

  execSync(cmd, {
    cwd,
    stdio: 'inherit',
    env: { ...process.env, ...env },
  });
}

function banner(text) {
  const line = '='.repeat(60);
  console.log(`\n${line}`);
  console.log(`  ${text}`);
  console.log(`${line}\n`);
}

async function main() {
  banner('NetOps Tower - Production Build');

  const startTime = Date.now();

  // Step 1: Build React client
  if (!skipClient) {
    banner('Step 1/2: Building React Client');

    // Ensure dependencies are installed
    if (!fs.existsSync(path.join(CLIENT_DIR, 'node_modules'))) {
      run('npm ci', CLIENT_DIR);
    }

    // Build with Electron-compatible base path
    run('npm run build', CLIENT_DIR, { BUILD_TARGET: 'electron' });

    // Verify output
    const distIndex = path.join(CLIENT_DIR, 'dist', 'index.html');
    if (!fs.existsSync(distIndex)) {
      console.error('ERROR: Client build failed - dist/index.html not found');
      process.exit(1);
    }
    console.log('Client build successful');
  } else {
    console.log('Skipping client build (--skip-client)');
  }

  // Step 2: Build Python server
  if (!skipServer) {
    banner('Step 2/2: Building Python Server (PyInstaller)');

    // Check for PyInstaller
    try {
      execSync('pyinstaller --version', { stdio: 'pipe' });
    } catch {
      console.error('ERROR: PyInstaller not found. Install with: pip install pyinstaller');
      process.exit(1);
    }

    // Run PyInstaller
    run('pyinstaller netops-server.spec --clean --noconfirm', SERVER_DIR);

    // Verify output
    const platform = process.platform;
    const execName = platform === 'win32' ? 'netops-server.exe' : 'netops-server';
    const serverExec = path.join(SERVER_DIR, 'dist', 'netops-server', execName);

    if (!fs.existsSync(serverExec)) {
      console.error(`ERROR: Server build failed - ${execName} not found`);
      process.exit(1);
    }
    console.log('Server build successful');
  } else {
    console.log('Skipping server build (--skip-server)');
  }

  // Done
  const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
  banner(`Build Complete (${elapsed}s)`);

  console.log('Next steps:');
  console.log('  npm run build:electron     - Package for current platform');
  console.log('  npm run package:steam       - Package for Steam distribution');
  console.log('');
}

main().catch((err) => {
  console.error('Build failed:', err.message);
  process.exit(1);
});
