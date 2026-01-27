import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { Player, Ticket, Lab, GameView, GameSettings, TimeOfDay } from '../types/game';

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

  // Connected terminal node
  connectedNodeId: number | null;

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

  // Settings actions
  updateSettings: (settings: Partial<GameSettings>) => void;
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
      acceptTicket: (ticket) => set((state) => ({
        activeTicket: { ...ticket, status: 'active', startedAt: Date.now() },
        availableTickets: state.availableTickets.filter(t => t.id !== ticket.id),
        currentView: 'terminal',
      })),

      completeTicket: () => {
        const { activeTicket } = get();
        if (!activeTicket) return;

        set({
          activeTicket: null,
          activeLab: null,
          currentView: 'office',
        });

        // Add rewards
        get().addCredits(activeTicket.rewardCredits);
        get().addXp(activeTicket.rewardXp);
        get().addReputation(10);
      },

      failTicket: () => set((state) => {
        if (!state.activeTicket) return state;
        return {
          activeTicket: null,
          activeLab: null,
          currentView: 'office',
          player: { ...state.player, reputation: Math.max(0, state.player.reputation - 5) }
        };
      }),

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

      // Settings
      updateSettings: (newSettings) => set((state) => ({
        settings: { ...state.settings, ...newSettings }
      })),
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
