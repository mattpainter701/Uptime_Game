import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { Player, Ticket, Lab, GameView, GameSettings, TimeOfDay, UptimeState, NodeUptimeStats, GameConfig, PlayerPosition, MovementState } from '../types/game';
import { api } from '../services/api';
import type { NodeUptimeStats as ServerNodeStats } from '../services/api';
import { UptimeWebSocket, type UptimeUpdate } from '../services/websocket';

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
  acceptTicket: (ticket: Ticket) => void;
  completeTicket: () => void;
  failTicket: () => void;
  revealHint: (hintIndex: number) => void;

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

  // Player movement actions
  setPlayerPosition: (position: Partial<PlayerPosition>) => void;
  setMovement: (movement: Partial<MovementState>) => void;
  standUp: () => void;
  sitDown: () => void;
  toggleStand: () => void;
}

// Sample tickets for demo
const SAMPLE_TICKETS: Ticket[] = [
  {
    id: 'NET-001',
    title: "Server Can't Reach Internet",
    description: 'The web server (192.168.1.100) cannot reach external sites. It can ping its gateway (192.168.1.1) but nothing beyond. Please investigate the router configuration.',
    category: 'network-basics',
    difficulty: 1,
    timeLimit: 10,
    rewardCredits: 100,
    rewardXp: 50,
    labTemplate: 'basic_default_route',
    hints: [
      { cost: 25, text: 'Check the routing table on the router', revealed: false },
      { cost: 50, text: 'Look for a default route (0.0.0.0/0)', revealed: false },
    ],
    validation: [
      { type: 'ping', params: { source: 'SERVER', destination: '8.8.8.8', successRate: 100 } },
    ],
    status: 'available',
  },
  {
    id: 'NET-015',
    title: "Two PCs Can't Communicate",
    description: 'PC1 (10.10.10.10) and PC2 (10.10.10.20) are on the same switch but cannot ping each other. Both ports show up as connected. Investigate the switch configuration.',
    category: 'switching',
    difficulty: 2,
    timeLimit: 15,
    rewardCredits: 200,
    rewardXp: 100,
    labTemplate: 'vlan_mismatch',
    hints: [
      { cost: 50, text: 'Check which VLANs the ports are assigned to', revealed: false },
      { cost: 75, text: "Use 'show vlan brief' and 'show interface status'", revealed: false },
    ],
    validation: [
      { type: 'ping', params: { source: 'PC1', destination: '10.10.10.20', successRate: 100 } },
      { type: 'command', params: { node: 'SW1', command: 'show vlan brief', contains: ['Fa0/1', 'Fa0/2', '10'] } },
    ],
    status: 'available',
  },
  {
    id: 'NET-042',
    title: 'OSPF Neighbors Not Forming',
    description: 'R1 and R2 should be OSPF neighbors but the adjacency is not forming. Both routers are configured for OSPF Area 0. Investigate and fix the issue.',
    category: 'routing',
    difficulty: 3,
    timeLimit: 20,
    rewardCredits: 350,
    rewardXp: 175,
    labTemplate: 'ospf_neighbors',
    hints: [
      { cost: 75, text: 'Check OSPF interface parameters on both routers', revealed: false },
      { cost: 100, text: 'Verify network type, hello/dead timers, and area ID match', revealed: false },
    ],
    validation: [
      { type: 'command', params: { node: 'R1', command: 'show ip ospf neighbor', contains: ['FULL'] } },
    ],
    status: 'available',
  },
];

// Calculate XP needed for next level
function getXpToNextLevel(currentXp: number): number {
  const levels = [
    { level: 1, xpRequired: 0 },
    { level: 2, xpRequired: 500 },
    { level: 3, xpRequired: 1500 },
    { level: 4, xpRequired: 3500 },
    { level: 5, xpRequired: 7000 },
    { level: 6, xpRequired: 12000 },
    { level: 7, xpRequired: 20000 },
    { level: 8, xpRequired: 35000 },
  ];

  for (let i = levels.length - 1; i >= 0; i--) {
    if (currentXp >= levels[i].xpRequired) {
      if (i === levels.length - 1) return 0; // Max level
      return levels[i + 1].xpRequired - currentXp;
    }
  }
  return levels[1].xpRequired;
}

// Get level from XP
function getLevelFromXp(xp: number): { level: number; title: string; floor: number } {
  const levels = [
    { level: 1, title: 'Help Desk Tech', floor: 5, xpRequired: 0 },
    { level: 2, title: 'Junior NetAdmin', floor: 10, xpRequired: 500 },
    { level: 3, title: 'Network Admin', floor: 15, xpRequired: 1500 },
    { level: 4, title: 'Senior NetAdmin', floor: 25, xpRequired: 3500 },
    { level: 5, title: 'Network Engineer', floor: 35, xpRequired: 7000 },
    { level: 6, title: 'Senior Engineer', floor: 40, xpRequired: 12000 },
    { level: 7, title: 'Principal Engineer', floor: 45, xpRequired: 20000 },
    { level: 8, title: 'CTO', floor: 50, xpRequired: 35000 },
  ];

  for (let i = levels.length - 1; i >= 0; i--) {
    if (xp >= levels[i].xpRequired) {
      return levels[i];
    }
  }
  return levels[0];
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
      availableTickets: SAMPLE_TICKETS,
      timeOfDay: 14, // 2 PM
      connectedNodeId: null,

      settings: {
        musicVolume: 0.5,
        sfxVolume: 0.7,
        terminalTheme: 'cyberpunk',
        terminalFontSize: 14,
      },

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
        const levelInfo = getLevelFromXp(newXp);
        return {
          player: {
            ...state.player,
            xp: newXp,
            level: levelInfo.level,
            title: levelInfo.title,
            floor: levelInfo.floor,
            xpToNextLevel: getXpToNextLevel(newXp),
          }
        };
      }),

      addReputation: (amount) => set((state) => ({
        player: { ...state.player, reputation: Math.max(0, state.player.reputation + amount) }
      })),

      // Ticket actions
      acceptTicket: (ticket) => {
        set((state) => ({
          activeTicket: { ...ticket, status: 'active', startedAt: Date.now() },
          availableTickets: state.availableTickets.filter(t => t.id !== ticket.id),
          currentView: 'terminal',
        }));

        // Start ticket timer
        get().startTicketTimer();

        // Note: Uptime tracking should be started when lab nodes are available
        // This would typically happen after lab is loaded
      },

      completeTicket: async () => {
        const { activeTicket, uptime } = get();
        if (!activeTicket) return;

        // Stop timer
        get().stopTicketTimer();

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

        // Calculate rewards with bonus
        const baseCredits = activeTicket.rewardCredits;
        const baseXp = activeTicket.rewardXp;
        const totalCredits = Math.floor(baseCredits * uptimeBonus) + uptimePoints;
        const totalXp = Math.floor(baseXp * uptimeBonus);
        const reputationGain = Math.max(1, 10 - uptime.totalIncidents);

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
            player: { ...state.player, reputation: Math.max(0, state.player.reputation - 5) },
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
    }),
    {
      name: 'netops-tower-save',
      partialize: (state) => ({
        player: state.player,
        settings: state.settings,
      }),
    }
  )
);
