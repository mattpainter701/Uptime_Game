/**
 * NetOps Tower - Electron Preload Script
 *
 * Securely exposes a limited API to the renderer process via contextBridge.
 * This bridges the gap between the sandboxed renderer and the Node.js main process.
 */
const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  // Server connection
  getServerUrl: () => ipcRenderer.invoke('get-server-url'),

  // App info
  getAppVersion: () => ipcRenderer.invoke('get-app-version'),
  getPlatform: () => ipcRenderer.invoke('get-platform'),

  // External links
  openExternal: (url) => ipcRenderer.invoke('open-external', url),

  // Settings persistence
  getSetting: (key) => ipcRenderer.invoke('get-setting', key),
  setSetting: (key, value) => ipcRenderer.invoke('set-setting', key, value),

  // Steam integration
  getSteamStatus: () => ipcRenderer.invoke('get-steam-status'),

  // Check if running inside Electron
  isElectron: true,
});
