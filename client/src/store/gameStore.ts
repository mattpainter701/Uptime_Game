import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { Player, Ticket, Lab, GameView, GameSettings, TimeOfDay, UptimeState, NodeUptimeStats, GameConfig, PlayerPosition, MovementState, ItemId, SessionState, SettingsPreset, TicketSla, SlaTier } from '../types/game';
import { ITEM_DEFINITIONS, DEFAULT_SETTINGS, SETTINGS_PRESETS } from '../types/game';
import { getCareerLevelFromXp, getXpToNextCareerLevel } from '../lib/careerProgression';
import { getReputationLossForFailure } from '../lib/reputationProgression';
import { api } from '../services/api';
import type { NodeUptimeStats as ServerNodeStats } from '../services/api';
import { UptimeWebSocket, type UptimeUpdate } from '../services/websocket';
import { getTicketEngine, calculateTimePressure, type TimePressureResult } from '../lib/ticketEngine';

interface GameState {
  // Player state
  player: Player;

  // Current view
  currentView: GameView;

  // Active ticket and lab
  activeTicket: Ticket | null;
  activeLab: Lab | null;

  // Available tickets
  availableTickets: Ticket[];

  // Time and environment
  timeOfDay: TimeOfDay;

  // Settings
  settings: GameSettings;

  // Game config (from server)
  gameConfig: GameConfig | null;

  // Connected terminal node
  connectedNodeId: number | null;

  // Uptime tracking
  uptime: UptimeState;
  uptimeWs: UptimeWebSocket | null;

  // Ticket timer
  ticketTimeRemaining: number | null;
  ticketTimerInterval: ReturnType<typeof setInterval> | null;

  // Player 3D position and movement
  playerPosition: PlayerPosition;
  movement: MovementState;

  // Building/Elevator state
  currentFloor: 'basement' | 'lobby' | 'floor1' | 'floor2' | 'floor3';
  elevatorOpen: boolean;

  // Inventory
  inventory: Record<ItemId, number>;

  // Save tracking
  lastSavedAt: number | null;

  // Session state (pause/resume)
  sessionState: SessionState;

  // Actions
  setView: (view: GameView) => void;
  setActiveTicket: (ticket: Ticket | null) => void;
  setActiveLab: (lab: Lab | null) => void;
  setTimeOfDay: (time: TimeOfDay) => void;
  setConnectedNode: (nodeId: number | null) => void;

  // Player actions
  addCredits: (amount: number) => void;
  addXp: (amount: number) => void;
  addReputation: (amount: number) => void;

  // Ticket actions
  acceptTicket: (ticket: Ticket) => boolean;
  completeTicket: () => void;
  failTicket: () => void;
  revealHint: (hintIndex: number) => void;
  refreshAvailableTickets: (count?: number) => void;

  // Uptime actions
  startUptimeTracking: (labPath: string, nodeIds: number[]) => Promise<void>;
  stopUptimeTracking: () => Promise<{ points: number; bonus: number } | null>;
  updateUptimeStats: (update: UptimeUpdate) => void;

  // Timer actions
  startTicketTimer: () => void;
  stopTicketTimer: () => void;
  tickTimer: () => void;

  // Config actions
  loadGameConfig: () => Promise<void>;

  // Settings actions
  updateSettings: (settings: Partial<GameSettings>) => void;
  exportSettings: () => string;
  importSettings: (json: string) => boolean;
  resetSettings: () => void;
  applyPreset: (preset: SettingsPreset) => void;

  // Player movement actions
  setPlayerPosition: (position: Partial<PlayerPosition>) => void;
  setMovement: (movement: Partial<MovementState>) => void;
  standUp: () => void;
  sitDown: () => void;
  toggleStand: () => void;

  // Elevator actions
  setCurrentFloor: (floor: 'basement' | 'lobby' | 'floor1' | 'floor2' | 'floor3') => void;
  openElevator: () => void;
  closeElevator: () => void;

  // Inventory actions
  collectItem: (itemId: ItemId, quantity?: number) => boolean;
  useItem: (itemId: ItemId, quantity?: number) => boolean;
  hasItem: (itemId: ItemId, quantity?: number) => boolean;
  getItemCount: (itemId: ItemId) => number;
  hasRequiredItems: (items: ItemId[]) => boolean;

  // Save/Load persistence actions
  saveGame: () => void;
  loadGame: () => boolean;
  exportSave: () => string;
  importSave: (json: string) => boolean;

  // Pause/Resume actions
  pauseGame: () => void;
  resumeGame: () => void;
}

/**
 * Generate initial ticket pool using the ticket engine.
 * Creates 12 tickets spread across difficulties for demo variety.
 */
function generateInitialTicketPool(): Ticket[] {
  const engine = getTicketEngine();
  const pool: Ticket[] = [];
  const difficulties = [1, 1, 1, 2, 2, 2, 3, 3, 3, 4, 4, 5] as Ticket['difficulty'][];
  for (const diff of difficulties) {
    pool.push(engine.generateTicket({ difficulty: diff }));
  }
  return pool;
}


export const useGameStore = create<GameState>()(
  persist(
    (set, get) => ({
      // Initial player
      player: {
        id: 'player-1',
        name: 'NetAdmin',
        level: 1,
        title: 'Help Desk Tech',
        floor: 5,
        credits: 500,
        reputation: 0,
        xp: 0,
        xpToNextLevel: 500,
      },

      currentView: 'office',
      activeTicket: null,
      activeLab: null,
      availableTickets: generateInitialTicketPool(),
      timeOfDay: 14, // 2 PM
      connectedNodeId: null,

      settings: DEFAULT_SETTINGS,

      gameConfig: null,

      // Uptime tracking initial state
      uptime: {
        sessionId: null,
        isTracking: false,
        startedAt: null,
        nodes: {},
        totalUptimeSeconds: 0,
        totalDowntimeSeconds: 0,
        uptimePercentage: 100,
        pointsEarned: 0,
        totalIncidents: 0,
      },
      uptimeWs: null,

      // Timer state
      ticketTimeRemaining: null,
      ticketTimerInterval: null,

      // Player 3D position - starts seated at desk
      playerPosition: {
        x: 0,
        y: 0,
        z: -1, // At chair position
        rotation: 0,
        pose: 'seated',
        isMoving: false,
      },

      // Movement keys state
      movement: {
        forward: false,
        backward: false,
        left: false,
        right: false,
      },

      // Building/Elevator state
      currentFloor: 'basement',
      elevatorOpen: false,

      // Inventory - start with empty, collect from office
      inventory: {
        'laptop': 0,
        'console-cable': 0,
        'patch-cable': 0,
        'fiber-module': 0,
        'ssd': 0,
        'usb-drive': 0,
        'crimping-tool': 0,
      },

      lastSavedAt: null,

      // Session state (not persisted — always unpaused on fresh load)
      sessionState: {
        isPaused: false,
        pausedAt: null,
      },

      // View actions
      setView: (view) => set({ currentView: view }),

      setActiveTicket: (ticket) => set({ activeTicket: ticket }),

      setActiveLab: (lab) => set({ activeLab: lab }),

      setTimeOfDay: (time) => set({ timeOfDay: time }),

      setConnectedNode: (nodeId) => set({ connectedNodeId: nodeId }),

      // Player actions
      addCredits: (amount) => set((state) => ({
        player: { ...state.player, credits: state.player.credits + amount }
      })),

      addXp: (amount) => set((state) => {
        const newXp = state.player.xp + amount;
        const levelInfo = getCareerLevelFromXp(newXp);
        return {
          player: {
            ...state.player,
            xp: newXp,
            level: levelInfo.level,
            title: levelInfo.title,
            floor: levelInfo.floor,
            xpToNextLevel: getXpToNextCareerLevel(newXp),
          }
        };
      }),

      addReputation: (amount) => set((state) => ({
        player: { ...state.player, reputation: Math.max(0, state.player.reputation + amount) }
      })),

      // Ticket actions
      acceptTicket: (ticket) => {
        // Check if player has required items
        if (ticket.requiredItems && ticket.requiredItems.length > 0) {
          const hasAllItems = get().hasRequiredItems(ticket.requiredItems);
          if (!hasAllItems) {
            console.warn('Cannot accept ticket: missing required items');
            return false;
          }
        }

        set((state) => ({
          activeTicket: { ...ticket, status: 'active', startedAt: Date.now() },
          availableTickets: state.availableTickets.filter(t => t.id !== ticket.id),
          currentView: 'terminal',
        }));

        // Start ticket timer
        get().startTicketTimer();

        // Note: Uptime tracking should be started when lab nodes are available
        // This would typically happen after lab is loaded
        return true;
      },

      completeTicket: async () => {
        const { activeTicket, uptime } = get();
        if (!activeTicket) return;

        // Stop timer
        get().stopTicketTimer();

        // Calculate time-pressure rewards
        const completedAt = Date.now();
        const tp = calculateTimePressure(
          activeTicket.difficulty,
          activeTicket.startedAt ?? completedAt,
          completedAt,
        );

        // Consume items that should be used when completing this ticket
        if (activeTicket.consumeItems && activeTicket.consumeItems.length > 0) {
          for (const itemId of activeTicket.consumeItems) {
            get().useItem(itemId);
          }
        }

        // Stop uptime tracking and get final stats
        let uptimeBonus = 1.0;
        let uptimePoints = 0;

        if (uptime.isTracking) {
          const result = await get().stopUptimeTracking();
          if (result) {
            uptimePoints = result.points;
            uptimeBonus = result.bonus;
          }
        } else {
          // Use local uptime stats if not connected to server
          if (uptime.uptimePercentage >= 99) uptimeBonus = 1.5;
          else if (uptime.uptimePercentage >= 95) uptimeBonus = 1.2;
          uptimePoints = uptime.pointsEarned;
        }

        // Calculate rewards with uptime bonus, speed bonus, and overtime penalty
        const baseCredits = activeTicket.rewardCredits;
        const baseXp = activeTicket.rewardXp;
        const totalCredits = Math.max(0,
          Math.floor(baseCredits * uptimeBonus * tp.speedBonus) - tp.overtimePenalty
        ) + uptimePoints;
        const totalXp = Math.floor(baseXp * uptimeBonus * tp.speedBonus);
        const reputationGain = tp.reputationChange;

        set({
          activeTicket: null,
          activeLab: null,
          currentView: 'office',
        });

        // Add rewards
        get().addCredits(totalCredits);
        get().addXp(totalXp);
        get().addReputation(reputationGain);
      },

      failTicket: () => {
        // Stop timer and uptime tracking
        get().stopTicketTimer();
        const { uptimeWs } = get();
        uptimeWs?.disconnect();

        set((state) => {
          if (!state.activeTicket) return state;
          return {
            activeTicket: null,
            activeLab: null,
            currentView: 'office',
            player: {
              ...state.player,
              reputation: Math.max(0, state.player.reputation - getReputationLossForFailure(state.uptime.totalIncidents)),
            },
            uptime: {
              sessionId: null,
              isTracking: false,
              startedAt: null,
              nodes: {},
              totalUptimeSeconds: 0,
              totalDowntimeSeconds: 0,
              uptimePercentage: 100,
              pointsEarned: 0,
              totalIncidents: 0,
            },
            uptimeWs: null,
          };
        });
      },

      revealHint: (hintIndex) => set((state) => {
        if (!state.activeTicket) return state;
        const hint = state.activeTicket.hints[hintIndex];
        if (!hint || hint.revealed || state.player.credits < hint.cost) return state;

        const newHints = [...state.activeTicket.hints];
        newHints[hintIndex] = { ...hint, revealed: true };

        return {
          activeTicket: { ...state.activeTicket, hints: newHints },
          player: { ...state.player, credits: state.player.credits - hint.cost }
        };
      }),

      refreshAvailableTickets: (count = 12) => {
        const engine = getTicketEngine();
        const { player } = get();
        const level = player.level;

        // Scale difficulty based on player level: levels 1-2 get T1-2, 3-4 get T2-3, 5-6 get T3-4, 7-8 get T4-5
        const maxDifficulty = Math.min(5, Math.ceil(level / 2) + 1);
        const minDifficulty = Math.max(1, Math.floor(level / 3));

        const pool: Ticket[] = [];
        for (let i = 0; i < count; i++) {
          const diff = Math.max(minDifficulty, Math.min(maxDifficulty,
            Math.floor(Math.random() * (maxDifficulty - minDifficulty + 1)) + minDifficulty
          )) as Ticket['difficulty'];
          pool.push(engine.generateTicket({ difficulty: diff }));
        }
        set({ availableTickets: pool });
      },

      // Uptime tracking actions
      startUptimeTracking: async (labPath, nodeIds) => {
        try {
          const response = await api.uptime.start(labPath, nodeIds, get().activeTicket?.id);

          if (!response.ok || !response.data) {
            console.error('Failed to start uptime tracking:', response.error);
            return;
          }

          const { session_id, started_at } = response.data;

          // Create WebSocket connection
          const ws = new UptimeWebSocket();
          ws.onUpdate = (update) => get().updateUptimeStats(update);
          ws.onError = (error) => console.error('Uptime WS error:', error);
          ws.connect(session_id);

          set({
            uptime: {
              sessionId: session_id,
              isTracking: true,
              startedAt: new Date(started_at).getTime(),
              nodes: {},
              totalUptimeSeconds: 0,
              totalDowntimeSeconds: 0,
              uptimePercentage: 100,
              pointsEarned: 0,
              totalIncidents: 0,
            },
            uptimeWs: ws,
          });
        } catch (error) {
          console.error('Error starting uptime tracking:', error);
        }
      },

      stopUptimeTracking: async () => {
        const { uptime, uptimeWs } = get();

        if (!uptime.sessionId) return null;

        // Disconnect WebSocket
        uptimeWs?.disconnect();

        try {
          const response = await api.uptime.stop(uptime.sessionId);

          if (!response.ok || !response.data) {
            console.error('Failed to stop uptime tracking:', response.error);
            return null;
          }

          const { final_points, bonus_multiplier } = response.data;

          // Reset uptime state
          set({
            uptime: {
              sessionId: null,
              isTracking: false,
              startedAt: null,
              nodes: {},
              totalUptimeSeconds: 0,
              totalDowntimeSeconds: 0,
              uptimePercentage: 100,
              pointsEarned: 0,
              totalIncidents: 0,
            },
            uptimeWs: null,
          });

          return { points: final_points, bonus: bonus_multiplier };
        } catch (error) {
          console.error('Error stopping uptime tracking:', error);
          return null;
        }
      },

      updateUptimeStats: (update) => set((state) => {
        // Convert server format to client format
        const nodes: Record<number, NodeUptimeStats> = {};
        for (const [id, stats] of Object.entries(update.nodes) as [string, ServerNodeStats][]) {
          const nodeId = parseInt(id);
          nodes[nodeId] = {
            nodeId: stats.node_id,
            nodeName: stats.node_name,
            status: stats.status,
            isResponsive: stats.is_responsive,
            uptimeSeconds: stats.uptime_seconds,
            downtimeSeconds: stats.downtime_seconds,
            incidentCount: stats.incident_count,
          };
        }

        return {
          uptime: {
            ...state.uptime,
            nodes,
            uptimePercentage: update.uptime_percentage,
            pointsEarned: update.points_earned,
            totalIncidents: Object.values(nodes).reduce((sum, n) => sum + n.incidentCount, 0),
          },
        };
      }),

      // Timer actions
      startTicketTimer: () => {
        const { activeTicket, gameConfig } = get();
        if (!activeTicket?.startedAt) return;

        // Clear existing timer
        const existingInterval = get().ticketTimerInterval;
        if (existingInterval) clearInterval(existingInterval);

        // Only start if time limits are enforced
        if (gameConfig && !gameConfig.enforceTimeLimits) return;

        const interval = setInterval(() => get().tickTimer(), 1000);
        set({ ticketTimerInterval: interval });
      },

      stopTicketTimer: () => {
        const interval = get().ticketTimerInterval;
        if (interval) {
          clearInterval(interval);
          set({ ticketTimerInterval: null, ticketTimeRemaining: null });
        }
      },

      tickTimer: () => {
        const { activeTicket } = get();
        if (!activeTicket?.startedAt) return;

        const elapsed = Date.now() - activeTicket.startedAt;
        const totalMs = activeTicket.timeLimit * 60 * 1000;
        const remaining = totalMs - elapsed;

        if (remaining <= 0) {
          get().stopTicketTimer();
          get().failTicket();
        } else {
          set({ ticketTimeRemaining: remaining });
        }
      },

      // Config actions
      loadGameConfig: async () => {
        try {
          const response = await api.status.getConfig();
          if (response.ok && response.data) {
            set({ gameConfig: response.data });
          }
        } catch (error) {
          console.error('Failed to load game config:', error);
        }
      },

      // Settings
      updateSettings: (newSettings) => set((state) => ({
        settings: { ...state.settings, ...newSettings }
      })),

      exportSettings: () => {
        const { settings } = get();
        return JSON.stringify({
          type: 'netops-tower-settings',
          version: 1,
          exportedAt: new Date().toISOString(),
          settings,
        }, null, 2);
      },

      importSettings: (json: string) => {
        try {
          const parsed = JSON.parse(json);
          // Accept both dedicated settings export and full save (extract settings)
          const settingsData = parsed.settings || parsed.state?.settings;
          if (!settingsData) {
            console.error('Invalid settings file: no settings found');
            return false;
          }
          // Validate structure — must have at least musicVolume
          if (typeof settingsData.musicVolume !== 'number') {
            console.error('Invalid settings file: malformed settings');
            return false;
          }
          // Merge imported settings over defaults (safe: missing fields stay default)
          const merged: GameSettings = { ...get().settings, ...settingsData };
          set({ settings: merged });
          return true;
        } catch (err) {
          console.error('Failed to import settings:', err);
          return false;
        }
      },

      resetSettings: () => {
        set({ settings: { ...DEFAULT_SETTINGS } });
      },

      applyPreset: (preset: SettingsPreset) => {
        const presetSettings = SETTINGS_PRESETS[preset];
        if (!presetSettings) return;
        set({ settings: { ...presetSettings } });
      },

      // Player movement actions
      setPlayerPosition: (position) => set((state) => ({
        playerPosition: { ...state.playerPosition, ...position }
      })),

      setMovement: (movement) => set((state) => ({
        movement: { ...state.movement, ...movement }
      })),

      standUp: () => set((state) => ({
        playerPosition: {
          ...state.playerPosition,
          pose: 'standing',
          y: 0,
        }
      })),

      sitDown: () => set(() => ({
        playerPosition: {
          x: 0,
          y: 0,
          z: -1, // Chair position
          rotation: 0,
          pose: 'seated',
          isMoving: false,
        },
        movement: { forward: false, backward: false, left: false, right: false }
      })),

      toggleStand: () => {
        const { playerPosition } = get();
        if (playerPosition.pose === 'seated') {
          get().standUp();
        } else {
          get().sitDown();
        }
      },

      // Elevator actions
      setCurrentFloor: (floor) => set({ currentFloor: floor, elevatorOpen: false }),
      openElevator: () => set({ elevatorOpen: true }),
      closeElevator: () => set({ elevatorOpen: false }),

      // Inventory actions
      collectItem: (itemId, quantity = 1) => {
        const current = get().inventory[itemId] || 0;
        const itemDef = ITEM_DEFINITIONS[itemId];
        const maxStack = itemDef?.maxStack || 1;

        // Check if we can collect more
        if (current >= maxStack) return false;

        const newQuantity = Math.min(current + quantity, maxStack);
        set((state) => ({
          inventory: { ...state.inventory, [itemId]: newQuantity }
        }));
        return true;
      },

      useItem: (itemId, quantity = 1) => {
        const current = get().inventory[itemId] || 0;
        if (current < quantity) return false;

        const itemDef = ITEM_DEFINITIONS[itemId];

        // Only reduce quantity for consumable items
        if (itemDef?.consumable) {
          set((state) => ({
            inventory: { ...state.inventory, [itemId]: current - quantity }
          }));
        }
        return true;
      },

      hasItem: (itemId, quantity = 1) => {
        return (get().inventory[itemId] || 0) >= quantity;
      },

      getItemCount: (itemId) => {
        return get().inventory[itemId] || 0;
      },

      hasRequiredItems: (items) => {
        const inventory = get().inventory;
        return items.every(itemId => (inventory[itemId] || 0) > 0);
      },

      // === Save/Load Persistence Actions ===

      saveGame: () => {
        try {
          const state = get();
          const saveData = {
            player: state.player,
            settings: state.settings,
            inventory: state.inventory,
            activeTicket: state.activeTicket,
            activeLab: state.activeLab,
            availableTickets: state.availableTickets,
            currentView: state.currentView,
            timeOfDay: state.timeOfDay,
            currentFloor: state.currentFloor,
            elevatorOpen: state.elevatorOpen,
            connectedNodeId: state.connectedNodeId,
            playerPosition: state.playerPosition,
            lastSavedAt: Date.now(),
            uptime: {
              ...state.uptime,
              isTracking: false,
              sessionId: null,
            },
            _saveVersion: 1,
          };
          localStorage.setItem('netops-tower-save', JSON.stringify({
            state: saveData,
            version: 1,
          }));
          set({ lastSavedAt: saveData.lastSavedAt });
        } catch (err) {
          console.error('Failed to save game:', err);
        }
      },

      loadGame: () => {
        try {
          const raw = localStorage.getItem('netops-tower-save');
          if (!raw) return false;

          const parsed = JSON.parse(raw);

          // Handle legacy Zustand persist format (just the partialized state object)
          let savedState: any;
          let saveVersion = 0;
          if (parsed.state && typeof parsed.version === 'number') {
            savedState = parsed.state;
            saveVersion = parsed.version;
          } else if (parsed._saveVersion) {
            savedState = parsed;
            saveVersion = parsed._saveVersion;
          } else {
            // Old Zustand format: partialize state directly stored
            savedState = parsed;
            saveVersion = 0;
          }

          // Edge case: expired ticket timer
          if (savedState.activeTicket?.startedAt && savedState.activeTicket.timeLimit) {
            const elapsed = Date.now() - savedState.activeTicket.startedAt;
            const totalMs = savedState.activeTicket.timeLimit * 60 * 1000;
            if (elapsed >= totalMs) {
              // Ticket expired — fail it
              savedState.activeTicket = null;
              savedState.activeLab = null;
              savedState.currentView = 'office';
              // Apply reputation loss
              if (savedState.player && savedState.uptime) {
                savedState.player.reputation = Math.max(0,
                  savedState.player.reputation - getReputationLossForFailure(savedState.uptime.totalIncidents || 0));
              }
              savedState.uptime = {
                sessionId: null, isTracking: false, startedAt: null,
                nodes: {}, totalUptimeSeconds: 0, totalDowntimeSeconds: 0,
                uptimePercentage: 100, pointsEarned: 0, totalIncidents: 0,
              };
            }
          }

          // Edge case: stale uptime — always reset tracking on load
          if (savedState.uptime) {
            savedState.uptime = {
              ...savedState.uptime,
              isTracking: false,
              sessionId: null,
            };
          }

          // Edge case: missing lab data
          if (!savedState.activeLab) {
            savedState.activeLab = null;
          }

          // Migration: fill in defaults for any missing fields from old saves
          const defaults: any = {
            connectedNodeId: null,
            playerPosition: { x: 0, y: 0, z: -1, rotation: 0, pose: 'seated', isMoving: false },
            elevatorOpen: false,
            currentFloor: 'basement',
            timeOfDay: 14,
            lastSavedAt: null,
          };

          for (const [key, defaultValue] of Object.entries(defaults)) {
            if (savedState[key] === undefined) {
              savedState[key] = defaultValue;
            }
          }

          // Apply the loaded state
          set({
            player: savedState.player,
            settings: savedState.settings,
            inventory: savedState.inventory,
            activeTicket: savedState.activeTicket,
            activeLab: savedState.activeLab,
            availableTickets: savedState.availableTickets,
            currentView: savedState.currentView,
            timeOfDay: savedState.timeOfDay,
            currentFloor: savedState.currentFloor,
            elevatorOpen: savedState.elevatorOpen,
            connectedNodeId: savedState.connectedNodeId,
            playerPosition: savedState.playerPosition,
            lastSavedAt: savedState.lastSavedAt,
            uptime: savedState.uptime || {
              sessionId: null, isTracking: false, startedAt: null,
              nodes: {}, totalUptimeSeconds: 0, totalDowntimeSeconds: 0,
              uptimePercentage: 100, pointsEarned: 0, totalIncidents: 0,
            },
            // Always clear transient runtime state
            uptimeWs: null,
            ticketTimerInterval: null,
            ticketTimeRemaining: null,
            movement: { forward: false, backward: false, left: false, right: false },
          });

          // If a ticket was loaded, recompute timer and restart it
          const loadedTicket = get().activeTicket;
          if (loadedTicket?.startedAt && loadedTicket.timeLimit) {
            const elapsed = Date.now() - loadedTicket.startedAt;
            const totalMs = loadedTicket.timeLimit * 60 * 1000;
            const remaining = Math.max(0, totalMs - elapsed);
            set({ ticketTimeRemaining: remaining });
            // Restart timer if time remains
            if (remaining > 0 && loadedTicket.status === 'active') {
              get().startTicketTimer();
            }
          }

          return true;
        } catch (err) {
          console.error('Failed to load game:', err);
          return false;
        }
      },

      exportSave: () => {
        const state = get();
        const saveData = {
          player: state.player,
          settings: state.settings,
          inventory: state.inventory,
          activeTicket: state.activeTicket,
          activeLab: state.activeLab,
          availableTickets: state.availableTickets,
          currentView: state.currentView,
          timeOfDay: state.timeOfDay,
          currentFloor: state.currentFloor,
          elevatorOpen: state.elevatorOpen,
          connectedNodeId: state.connectedNodeId,
          playerPosition: state.playerPosition,
          lastSavedAt: Date.now(),
          uptime: {
            ...state.uptime,
            isTracking: false,
            sessionId: null,
          },
          _saveVersion: 2,
        };
        return JSON.stringify({ state: saveData, version: 2, exportedAt: new Date().toISOString() }, null, 2);
      },

      importSave: (json: string) => {
        try {
          const parsed = JSON.parse(json);
          const savedState = parsed.state || parsed;

          // Validate minimal structure
          if (!savedState.player || !savedState.settings) {
            console.error('Invalid save file: missing required fields');
            return false;
          }

          // Store as if it were a load
          localStorage.setItem('netops-tower-save', JSON.stringify({
            state: savedState,
            version: parsed.version || 1,
          }));

          // Trigger load
          return get().loadGame();
        } catch (err) {
          console.error('Failed to import save:', err);
          return false;
        }
      },

      // === Pause/Resume Actions ===

      pauseGame: () => {
        const state = get();
        // Don't double-pause
        if (state.sessionState.isPaused) return;
        // Only pause when there's an active ticket (in-game)
        if (!state.activeTicket?.startedAt) return;

        // Stop the ticket timer interval
        state.stopTicketTimer();

        // Adjust startedAt forward by current elapsed time so the remaining
        // time is frozen. This makes saves during pause safe for rehydration.
        const now = Date.now();
        const pauseDuration = now - state.activeTicket.startedAt;
        const adjustedTicket = {
          ...state.activeTicket,
          startedAt: state.activeTicket.startedAt + pauseDuration,
        };
        set({ activeTicket: adjustedTicket });

        // Auto-save game state with adjusted ticket (safe for reloads)
        state.saveGame();

        set({
          sessionState: {
            isPaused: true,
            pausedAt: now,
          },
        });

        console.log('Game paused at', new Date().toISOString());
      },

      resumeGame: () => {
        const state = get();
        // Don't double-resume
        if (!state.sessionState.isPaused || !state.sessionState.pausedAt) return;

        const pauseDuration = Date.now() - state.sessionState.pausedAt;

        // Adjust startedAt for the pause duration so remaining time stays correct
        if (state.activeTicket?.startedAt) {
          const adjustedTicket = {
            ...state.activeTicket,
            startedAt: state.activeTicket.startedAt + pauseDuration,
          };
          set({ activeTicket: adjustedTicket });
        }

        // Clear paused state
        set({
          sessionState: {
            isPaused: false,
            pausedAt: null,
          },
        });

        // Restart the ticket timer
        if (state.activeTicket?.startedAt) {
          get().startTicketTimer();
          // Save adjusted state
          get().saveGame();
        }

        console.log('Game resumed, pause duration:', (pauseDuration / 1000).toFixed(1), 's');
      },
    }),
    {
      name: 'netops-tower-save',
      version: 2,
      migrate: (persistedState: any, _version: number) => {
        // Migration v0 → v1: old format only had player, settings, inventory
        if (_version < 1) {
          persistedState = {
            ...persistedState,
            activeTicket: persistedState.activeTicket ?? null,
            activeLab: persistedState.activeLab ?? null,
            availableTickets: persistedState.availableTickets ?? SAMPLE_TICKETS,
            currentView: persistedState.currentView ?? 'office',
            timeOfDay: persistedState.timeOfDay ?? 14,
            currentFloor: persistedState.currentFloor ?? 'basement',
            elevatorOpen: persistedState.elevatorOpen ?? false,
            connectedNodeId: persistedState.connectedNodeId ?? null,
            playerPosition: persistedState.playerPosition ?? { x: 0, y: 0, z: -1, rotation: 0, pose: 'seated', isMoving: false },
            lastSavedAt: persistedState.lastSavedAt ?? null,
            uptime: persistedState.uptime ?? {
              sessionId: null, isTracking: false, startedAt: null,
              nodes: {}, totalUptimeSeconds: 0, totalDowntimeSeconds: 0,
              uptimePercentage: 100, pointsEarned: 0, totalIncidents: 0,
            },
          };
        }
        // Migration v1 → v2: expanded game settings from 4 fields to 20
        if (_version < 2) {
          persistedState = {
            ...persistedState,
            settings: {
              ...DEFAULT_SETTINGS,         // fill in all new fields
              ...(persistedState.settings || {}), // keep user's old values
            },
          };
        }
        return persistedState;
      },
      partialize: (state) => ({
        player: state.player,
        settings: state.settings,
        inventory: state.inventory,
        activeTicket: state.activeTicket,
        activeLab: state.activeLab,
        availableTickets: state.availableTickets,
        currentView: state.currentView,
        timeOfDay: state.timeOfDay,
        currentFloor: state.currentFloor,
        elevatorOpen: state.elevatorOpen,
        connectedNodeId: state.connectedNodeId,
        playerPosition: state.playerPosition,
        lastSavedAt: Date.now(),
        // Save uptime state data but mark as not-tracking (WS reconnects on load)
        uptime: {
          ...state.uptime,
          isTracking: false,
          sessionId: null,
        },
      }),
      onRehydrateStorage: () => {
        return (hydratedState, error) => {
          if (error) {
            console.error('Failed to rehydrate game state:', error);
            return;
          }
          if (!hydratedState) return;

          const state = hydratedState as any;

          // Edge case: expired ticket timer on rehydrate
          if (state.activeTicket?.startedAt && state.activeTicket.timeLimit) {
            const elapsed = Date.now() - state.activeTicket.startedAt;
            const totalMs = state.activeTicket.timeLimit * 60 * 1000;
            if (elapsed >= totalMs) {
              // Ticket expired while away — fail it
              const store = useGameStore.getState();
              store.failTicket();
            } else {
              // Recompute remaining time
              const remaining = Math.max(0, totalMs - elapsed);
              useGameStore.setState({ ticketTimeRemaining: remaining });
              // Restart ticker if ticket is active
              if (state.activeTicket.status === 'active') {
                useGameStore.getState().startTicketTimer();
              }
            }
          }
        };
      },
    }
  )
);
