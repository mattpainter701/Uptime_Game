#!/usr/bin/env node
/**
 * NetOps Tower - Python Backend Build Script
 *
 * Builds the FastAPI backend into a standalone executable using PyInstaller.
 * Can be run independently of the main build script.
 *
 * Prerequisites:
 *   pip install pyinstaller
 *
 * Usage:
 *   node scripts/build-python.js
 */
const { execSync } = require('child_process');
const path = require('path');
const fs = require('fs');

const SERVER_DIR = path.join(__dirname, '..', 'server');

function main() {
  console.log('Building NetOps Tower Python backend...\n');

  // Verify we're in the right place
  const specFile = path.join(SERVER_DIR, 'netops-server.spec');
  if (!fs.existsSync(specFile)) {
    console.error('ERROR: netops-server.spec not found in server/');
    process.exit(1);
  }

  // Check for PyInstaller
  try {
    const version = execSync('pyinstaller --version', { stdio: 'pipe' }).toString().trim();
    console.log(`PyInstaller version: ${version}`);
  } catch {
    console.error('ERROR: PyInstaller not found.');
    console.error('Install it with: pip install pyinstaller');
    process.exit(1);
  }

  // Check for server requirements
  const reqFile = path.join(SERVER_DIR, 'requirements.txt');
  if (fs.existsSync(reqFile)) {
    console.log('Ensuring server dependencies are installed...');
    try {
      execSync('pip install -r requirements.txt', {
        cwd: SERVER_DIR,
        stdio: 'inherit',
      });
    } catch (err) {
      console.warn('Warning: Some dependencies may not have installed correctly');
    }
  }

  // Clean previous builds
  const distDir = path.join(SERVER_DIR, 'dist');
  const buildDir = path.join(SERVER_DIR, 'build');
  if (fs.existsSync(distDir)) {
    console.log('Cleaning previous dist/...');
    fs.rmSync(distDir, { recursive: true, force: true });
  }
  if (fs.existsSync(buildDir)) {
    console.log('Cleaning previous build/...');
    fs.rmSync(buildDir, { recursive: true, force: true });
  }

  // Run PyInstaller
  console.log('\nRunning PyInstaller...\n');
  execSync('pyinstaller netops-server.spec --clean --noconfirm', {
    cwd: SERVER_DIR,
    stdio: 'inherit',
  });

  // Verify output
  const platform = process.platform;
  const execName = platform === 'win32' ? 'netops-server.exe' : 'netops-server';
  const outputPath = path.join(distDir, 'netops-server', execName);

  if (fs.existsSync(outputPath)) {
    const stats = fs.statSync(outputPath);
    const sizeMB = (stats.size / 1024 / 1024).toFixed(1);
    console.log(`\nBuild successful!`);
    console.log(`  Output: ${outputPath}`);
    console.log(`  Size: ${sizeMB} MB`);
  } else {
    console.error(`\nERROR: Expected output not found: ${outputPath}`);
    process.exit(1);
  }
}

main();
