/**
 * Type definitions for the Electron preload API.
 * These are exposed via contextBridge in electron/preload.js.
 */
interface ElectronAPI {
  getServerUrl: () => Promise<string>;
  getAppVersion: () => Promise<string>;
  getPlatform: () => Promise<{
    platform: string;
    arch: string;
    isDev: boolean;
  }>;
  openExternal: (url: string) => Promise<void>;
  getSetting: (key: string) => Promise<unknown>;
  setSetting: (key: string, value: unknown) => Promise<void>;
  getSteamStatus: () => Promise<{
    initialized: boolean;
    available: boolean;
    user?: {
      steamId: string;
      screenName: string;
    };
    appId?: string;
  }>;
  isElectron: true;
}

declare global {
  interface Window {
    electronAPI?: ElectronAPI;
  }
}

export {};
