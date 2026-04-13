/**
 * NetOps Tower - Steam Integration
 *
 * Provides Steamworks API integration for:
 * - Steam authentication and overlay
 * - Achievement tracking
 * - Cloud saves
 * - Steam rich presence
 *
 * Uses greenworks/steamworks.js for native bindings.
 * Falls back gracefully when Steam is not available (non-Steam builds).
 */
const log = require('electron-log');

let steamClient = null;
let initialized = false;

// Steam App ID - replace with your actual App ID after Steam partner registration
const STEAM_APP_ID = '0'; // '0' means not yet registered

/**
 * Achievement definitions mapped to game progression.
 */
const ACHIEVEMENTS = {
  FIRST_TICKET: 'ACH_FIRST_TICKET',
  LEVEL_2: 'ACH_JUNIOR_NETADMIN',
  LEVEL_5: 'ACH_NETWORK_ENGINEER',
  LEVEL_8: 'ACH_CTO',
  PERFECT_UPTIME: 'ACH_PERFECT_UPTIME',
  SPEED_DEMON: 'ACH_SPEED_DEMON',       // Solve a ticket in under 2 minutes
  FULL_INVENTORY: 'ACH_FULLY_EQUIPPED',
  FIRST_LAB: 'ACH_FIRST_LAB',
  STREAK_10: 'ACH_STREAK_10',           // 10 tickets solved in a row
  NO_DOWNTIME: 'ACH_ZERO_DOWNTIME',     // Complete a session with zero downtime
};

/**
 * Initialize the Steamworks API.
 */
function init() {
  if (initialized) return true;

  try {
    // Try to load greenworks (native Steam bindings)
    // In production builds, this is bundled alongside the app
    steamClient = require('greenworks');

    if (!steamClient.init()) {
      log.warn('Steam: greenworks.init() returned false - Steam client may not be running');
      return false;
    }

    initialized = true;
    log.info(`Steam: Initialized successfully (App ID: ${STEAM_APP_ID})`);
    log.info(`Steam: User: ${steamClient.getSteamId().screenName}`);

    // Activate the Steam overlay
    steamClient.activateGameOverlay('friends');

    return true;
  } catch (err) {
    log.info(`Steam: Not available (${err.message}) - running in standalone mode`);
    initialized = false;
    return false;
  }
}

/**
 * Get current Steam status.
 */
function getStatus() {
  if (!initialized || !steamClient) {
    return { initialized: false, available: false };
  }

  try {
    const steamId = steamClient.getSteamId();
    return {
      initialized: true,
      available: true,
      user: {
        steamId: steamId.steamId,
        screenName: steamId.screenName,
      },
      appId: STEAM_APP_ID,
    };
  } catch {
    return { initialized: true, available: false };
  }
}

/**
 * Unlock a Steam achievement.
 */
function unlockAchievement(achievementId) {
  if (!initialized || !steamClient) return false;

  try {
    steamClient.activateAchievement(achievementId, () => {
      log.info(`Steam: Achievement unlocked - ${achievementId}`);
    });
    return true;
  } catch (err) {
    log.warn(`Steam: Failed to unlock achievement ${achievementId}: ${err.message}`);
    return false;
  }
}

/**
 * Set Steam rich presence (shows game status to friends).
 */
function setRichPresence(key, value) {
  if (!initialized || !steamClient) return;

  try {
    steamClient.setRichPresence(key, value);
  } catch {
    // Silently fail - rich presence is non-critical
  }
}

/**
 * Update rich presence with current game state.
 */
function updateGameStatus(playerLevel, currentActivity) {
  setRichPresence('steam_display', '#StatusFull');
  setRichPresence('level', String(playerLevel));
  setRichPresence('activity', currentActivity);
}

/**
 * Save game data to Steam Cloud.
 */
function cloudSave(filename, data) {
  if (!initialized || !steamClient) return false;

  try {
    const jsonData = JSON.stringify(data);
    steamClient.saveTextToFile(filename, jsonData);
    log.info(`Steam: Cloud save successful - ${filename}`);
    return true;
  } catch (err) {
    log.warn(`Steam: Cloud save failed - ${err.message}`);
    return false;
  }
}

/**
 * Load game data from Steam Cloud.
 */
function cloudLoad(filename) {
  if (!initialized || !steamClient) return null;

  try {
    if (!steamClient.isCloudEnabled() || !steamClient.isCloudEnabledForUser()) {
      return null;
    }

    const data = steamClient.readTextFromFile(filename);
    return JSON.parse(data);
  } catch (err) {
    log.warn(`Steam: Cloud load failed - ${err.message}`);
    return null;
  }
}

/**
 * Run Steam callbacks - must be called periodically (e.g., every 100ms).
 */
let callbackInterval = null;

function startCallbackLoop() {
  if (!initialized || !steamClient || callbackInterval) return;

  callbackInterval = setInterval(() => {
    try {
      steamClient.runCallbacks();
    } catch {
      // Ignore callback errors
    }
  }, 100);
}

function stopCallbackLoop() {
  if (callbackInterval) {
    clearInterval(callbackInterval);
    callbackInterval = null;
  }
}

/**
 * Shutdown Steam integration.
 */
function shutdown() {
  stopCallbackLoop();
  // greenworks doesn't require explicit shutdown
  initialized = false;
  steamClient = null;
  log.info('Steam: Shutdown complete');
}

module.exports = {
  ACHIEVEMENTS,
  init,
  getStatus,
  unlockAchievement,
  setRichPresence,
  updateGameStatus,
  cloudSave,
  cloudLoad,
  startCallbackLoop,
  stopCallbackLoop,
  shutdown,
};
