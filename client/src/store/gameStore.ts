import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { Player, Ticket, Lab, GameView, GameSettings, TimeOfDay, UptimeState, NodeUptimeStats, GameConfig, PlayerPosition, MovementState, ItemId, SessionState, SessionRecord, TutorialState, TutorialStep, SandboxState } from '../types/game';
import { ITEM_DEFINITIONS, TUTORIAL_STEP_ORDER } from '../types/game';
import { getCareerLevelFromXp, getXpToNextCareerLevel } from '../lib/careerProgression';
import { getReputationLossForFailure } from '../lib/reputationProgression';
import { api } from '../services/api';
import type { NodeUptimeStats as ServerNodeStats } from '../services/api';
import { UptimeWebSocket, type UptimeUpdate } from '../services/websocket';
import { TUTORIAL_TICKETS } from '../lib/tutorialTickets';

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

  // Session history (for summary screen)
  sessionHistory: SessionRecord[];
  lastTicketResult: SessionRecord | null;

  // Tutorial state
  tutorial: TutorialState;

  // Sandbox state
  sandboxState: SandboxState;
  careerSnapshot: string | null; // JSON snapshot of career state when entering sandbox

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

  // Session history actions
  recordTicketResult: (record: SessionRecord) => void;
  clearLastTicketResult: () => void;

  // Tutorial actions
  startTutorial: () => void;
  skipTutorial: () => void;
  advanceTutorialStep: () => void;
  goToTutorialStep: (step: TutorialStep) => void;
  replayTutorial: () => void;
  dismissGraduation: () => void;

  // Sandbox actions
  enterSandbox: () => void;
  exitSandbox: () => void;
  openSandboxLab: (labId: string) => void;
  toggleSandboxSolution: () => void;
  toggleSandboxDiff: () => void;
  resetSandboxLab: () => void;
}

// Sample tickets for demo
const SAMPLE_TICKETS: Ticket[] = [
  // === TIER 1: Basic / Entry Level ===
  {
    id: 'NET-001',
    title: 'PC1 Not Getting IP Address',
    description: 'PC1 in the Sales department is showing a 169.254.x.x address. The user reports they cannot access any network resources. The PC should be getting an IP via DHCP from the server at 10.0.1.5. Configure PC1 to use DHCP and verify connectivity.',
    category: 'network-basics',
    difficulty: 1,
    timeLimit: 8,
    rewardCredits: 75,
    rewardXp: 40,
    labTemplate: 'dhcp_client_config',
    hints: [
      { cost: 15, text: 'Check if the network adapter is set to DHCP or static', revealed: false },
      { cost: 30, text: 'On Linux: check /etc/network/interfaces or use dhclient', revealed: false },
    ],
    validation: [
      { type: 'ping', params: { source: 'PC1', destination: '10.0.1.1', successRate: 100 } },
    ],
    status: 'available',
    requiredItems: ['laptop'],
  },
  {
    id: 'NET-002',
    title: 'Missing Default Route on R1',
    description: 'Branch office R1 has lost internet connectivity. Internal routing is working but traffic destined for external networks (0.0.0.0/0) is being dropped. The ISP gateway is 203.0.113.1 on interface GigabitEthernet0/1. Add the missing default route.',
    category: 'routing',
    difficulty: 1,
    timeLimit: 10,
    rewardCredits: 100,
    rewardXp: 50,
    labTemplate: 'default_route_missing',
    hints: [
      { cost: 20, text: "Use 'show ip route' to see current routing table", revealed: false },
      { cost: 40, text: 'Command: ip route 0.0.0.0 0.0.0.0 <next-hop>', revealed: false },
    ],
    validation: [
      { type: 'ping', params: { source: 'R1', destination: '8.8.8.8', successRate: 100 } },
      { type: 'command', params: { node: 'R1', command: 'show ip route', contains: ['0.0.0.0/0', '203.0.113.1'] } },
    ],
    status: 'available',
    requiredItems: ['laptop', 'console-cable'],
  },
  {
    id: 'NET-003',
    title: 'Wrong DNS Breaking Web Access',
    description: 'Users on VLAN 10 can ping 8.8.8.8 but cannot browse websites. Investigation shows the DHCP server is handing out 10.0.1.99 as DNS, but that server was decommissioned. Update DHCP pool "VLAN10-POOL" to use DNS servers 10.0.1.5 and 8.8.8.8.',
    category: 'network-basics',
    difficulty: 1,
    timeLimit: 10,
    rewardCredits: 100,
    rewardXp: 50,
    labTemplate: 'dhcp_dns_fix',
    hints: [
      { cost: 25, text: "Check DHCP pool config with 'show ip dhcp pool'", revealed: false },
      { cost: 50, text: 'Use: ip dhcp pool VLAN10-POOL, then dns-server 10.0.1.5 8.8.8.8', revealed: false },
    ],
    validation: [
      { type: 'command', params: { node: 'R1', command: 'show ip dhcp pool', contains: ['10.0.1.5', '8.8.8.8'] } },
    ],
    status: 'available',
  },

  // === TIER 2: Intermediate ===
  {
    id: 'NET-015',
    title: 'New PC Not on Correct VLAN',
    description: 'A new workstation PC3 was connected to port Gi0/5 on SW1, but it cannot reach other devices in VLAN 20 (Engineering). The port is currently in VLAN 1 (default). Configure the switchport as an access port in VLAN 20. You will need a patch cable to connect the new PC.',
    category: 'switching',
    difficulty: 2,
    timeLimit: 12,
    rewardCredits: 150,
    rewardXp: 75,
    labTemplate: 'vlan_access_port',
    hints: [
      { cost: 35, text: "Use 'show vlan brief' and 'show interface Gi0/5 switchport'", revealed: false },
      { cost: 60, text: 'Commands: switchport mode access, switchport access vlan 20', revealed: false },
    ],
    validation: [
      { type: 'ping', params: { source: 'PC3', destination: '10.20.0.1', successRate: 100 } },
      { type: 'command', params: { node: 'SW1', command: 'show vlan brief', contains: ['Gi0/5', '20'] } },
    ],
    status: 'available',
    requiredItems: ['laptop', 'console-cable', 'patch-cable'],
    consumeItems: ['patch-cable'],
  },
  {
    id: 'NET-018',
    title: 'Trunk Port Blocking VLAN Traffic',
    description: 'After a maintenance window, VLAN 30 (Voice) traffic is not passing between SW1 and SW2. Other VLANs work fine. The trunk link on Gi0/24 appears to be filtering VLAN 30. Fix the allowed VLAN list on the trunk.',
    category: 'switching',
    difficulty: 2,
    timeLimit: 15,
    rewardCredits: 200,
    rewardXp: 100,
    labTemplate: 'trunk_vlan_allowed',
    hints: [
      { cost: 40, text: "Check 'show interface Gi0/24 trunk' for allowed VLANs", revealed: false },
      { cost: 70, text: 'Use: switchport trunk allowed vlan add 30', revealed: false },
    ],
    validation: [
      { type: 'command', params: { node: 'SW1', command: 'show interface Gi0/24 trunk', contains: ['30'] } },
      { type: 'ping', params: { source: 'PHONE1', destination: '10.30.0.1', successRate: 100 } },
    ],
    status: 'available',
  },
  {
    id: 'NET-022',
    title: 'Static Route to Remote Site Missing',
    description: 'HQ router R1 cannot reach the remote branch network 192.168.50.0/24. The branch is connected via a point-to-point link, with R2 (branch router) reachable at 10.255.255.2. Add a static route on R1 to restore connectivity.',
    category: 'routing',
    difficulty: 2,
    timeLimit: 12,
    rewardCredits: 175,
    rewardXp: 85,
    labTemplate: 'static_route_branch',
    hints: [
      { cost: 35, text: 'Verify the point-to-point link is up with ping 10.255.255.2', revealed: false },
      { cost: 60, text: 'Command: ip route 192.168.50.0 255.255.255.0 10.255.255.2', revealed: false },
    ],
    validation: [
      { type: 'ping', params: { source: 'R1', destination: '192.168.50.1', successRate: 100 } },
      { type: 'command', params: { node: 'R1', command: 'show ip route', contains: ['192.168.50.0', '10.255.255.2'] } },
    ],
    status: 'available',
  },

  // === TIER 3: Advanced ===
  {
    id: 'NET-042',
    title: 'OSPF Neighbors Stuck in INIT',
    description: 'R1 and R2 should form an OSPF adjacency over their shared segment 10.1.1.0/30, but they are stuck in INIT/2-WAY state. Both are configured for Area 0. The network type might be mismatched. Investigate hello/dead timers and network type settings.',
    category: 'routing',
    difficulty: 3,
    timeLimit: 20,
    rewardCredits: 350,
    rewardXp: 175,
    labTemplate: 'ospf_adjacency_issue',
    hints: [
      { cost: 70, text: "Compare 'show ip ospf interface' output on both routers", revealed: false },
      { cost: 100, text: 'Check network type (broadcast vs point-to-point) and timer values', revealed: false },
    ],
    validation: [
      { type: 'command', params: { node: 'R1', command: 'show ip ospf neighbor', contains: ['FULL'] } },
    ],
    status: 'available',
  },
  {
    id: 'NET-051',
    title: 'Inter-VLAN Routing Not Working',
    description: 'VLAN 10 (10.10.0.0/24) and VLAN 20 (10.20.0.0/24) users cannot communicate. SW1 has SVIs configured but routing might be disabled. The switch should act as the Layer 3 gateway. Enable IP routing and verify SVI status.',
    category: 'switching',
    difficulty: 3,
    timeLimit: 18,
    rewardCredits: 300,
    rewardXp: 150,
    labTemplate: 'intervlan_routing',
    hints: [
      { cost: 60, text: "Check if 'ip routing' is enabled globally", revealed: false },
      { cost: 90, text: "Verify SVIs are up with 'show ip interface brief'", revealed: false },
    ],
    validation: [
      { type: 'ping', params: { source: 'PC1', destination: '10.20.0.10', successRate: 100 } },
      { type: 'command', params: { node: 'SW1', command: 'show ip route', contains: ['10.10.0.0', '10.20.0.0'] } },
    ],
    status: 'available',
  },
  {
    id: 'NET-063',
    title: 'BGP Session Not Establishing',
    description: 'The BGP peering session between R1 (AS 65001) and the ISP router (AS 65000, IP 203.0.113.1) is not coming up. Verify the neighbor configuration, check if the TCP port 179 connection is being blocked, and ensure the source interface is correct.',
    category: 'routing',
    difficulty: 4,
    timeLimit: 25,
    rewardCredits: 500,
    rewardXp: 250,
    labTemplate: 'bgp_peering',
    hints: [
      { cost: 100, text: "Use 'show ip bgp summary' and 'show ip bgp neighbors' for status", revealed: false },
      { cost: 150, text: 'Check update-source, ebgp-multihop, and ACLs blocking TCP 179', revealed: false },
    ],
    validation: [
      { type: 'command', params: { node: 'R1', command: 'show ip bgp summary', contains: ['65000', 'Established'] } },
    ],
    status: 'available',
  },

  // === TIER 4: Expert ===
  {
    id: 'NET-078',
    title: 'HSRP Failover Not Working',
    description: 'R1 and R2 are configured as HSRP pairs for gateway redundancy on VLAN 100. R1 should be active (priority 110) but both routers show as active, causing a duplicate IP conflict. Fix the HSRP group configuration to restore proper failover.',
    category: 'high-availability',
    difficulty: 4,
    timeLimit: 22,
    rewardCredits: 450,
    rewardXp: 225,
    labTemplate: 'hsrp_failover',
    hints: [
      { cost: 90, text: "Check 'show standby brief' on both routers - look for group number mismatch", revealed: false },
      { cost: 130, text: 'Ensure both routers use the same HSRP group number and virtual IP', revealed: false },
    ],
    validation: [
      { type: 'command', params: { node: 'R1', command: 'show standby brief', contains: ['Active', 'Group 1'] } },
      { type: 'command', params: { node: 'R2', command: 'show standby brief', contains: ['Standby', 'Group 1'] } },
    ],
    status: 'available',
  },
  {
    id: 'NET-092',
    title: 'ACL Blocking Legitimate Traffic',
    description: 'After a security audit, users in 10.10.0.0/24 can no longer access the web server at 10.50.0.100. An ACL was applied to R1 interface Gi0/2. The ACL should block Telnet (23) but permit HTTP (80) and HTTPS (443). Fix the ACL without removing security controls.',
    category: 'security',
    difficulty: 5,
    timeLimit: 25,
    rewardCredits: 600,
    rewardXp: 300,
    labTemplate: 'acl_troubleshoot',
    hints: [
      { cost: 120, text: "Review ACL with 'show access-lists' and check hit counters", revealed: false },
      { cost: 180, text: 'Look for implicit deny or missing permit statements for TCP 80/443', revealed: false },
    ],
    validation: [
      { type: 'ping', params: { source: 'PC1', destination: '10.50.0.100', successRate: 100 } },
      { type: 'command', params: { node: 'R1', command: 'show access-lists', contains: ['permit tcp', '80', '443'] } },
    ],
    status: 'available',
  },
];


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
        colorblindMode: 'none',
        reducedMotion: false,
        largeText: false,
        highContrast: false,
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

      // Session history
      sessionHistory: [],
      lastTicketResult: null,

      // Tutorial — starts inactive; auto-activated on fresh games
      tutorial: {
        active: false,
        step: 'welcome',
        skipped: false,
        graduationShown: false,
      },

      // Sandbox state — starts inactive
      sandboxState: {
        active: false,
        activeLabId: null,
        showSolution: false,
        showDiff: false,
      },
      careerSnapshot: null,

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
        const { sandboxState } = get();

        // Sandbox mode: skip item checks, no timer, all tickets always available
        if (sandboxState.active) {
          set({
            activeTicket: { ...ticket, status: 'active', startedAt: Date.now() },
            currentView: 'terminal',
            sandboxState: { ...sandboxState, activeLabId: ticket.id, showSolution: false, showDiff: false },
          });
          return true;
        }

        // Career mode: check if player has required items
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
        const { activeTicket, uptime, sandboxState } = get();
        if (!activeTicket) return;

        // Sandbox mode: no rewards, no session history, just close and go back to browser
        if (sandboxState.active) {
          get().stopTicketTimer();
          set({
            activeTicket: null,
            activeLab: null,
            currentView: 'sandboxLabBrowser',
            sandboxState: { ...sandboxState, activeLabId: null, showSolution: false, showDiff: false },
          });
          return;
        }

        // Career mode: capture ticket data before clearing state
        const ticketId = activeTicket.id;
        const ticketTitle = activeTicket.title;
        const ticketCategory = activeTicket.category;
        const ticketDifficulty = activeTicket.difficulty;

        // Calculate elapsed time
        const elapsedSec = activeTicket.startedAt
          ? Math.floor((Date.now() - activeTicket.startedAt) / 1000)
          : 0;

        // Count hints used
        const hintsUsed = activeTicket.hints.filter(h => h.revealed).length;

        // Stop timer
        get().stopTicketTimer();

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

        // Calculate rewards with bonus
        const baseCredits = activeTicket.rewardCredits;
        const baseXp = activeTicket.rewardXp;
        const totalCredits = Math.floor(baseCredits * uptimeBonus) + uptimePoints;
        const totalXp = Math.floor(baseXp * uptimeBonus);
        const reputationGain = Math.max(1, 10 - uptime.totalIncidents);
        const validationScore = 1.0; // Successful completion = perfect score

        // Create session record
        const record: SessionRecord = {
          ticketId,
          title: ticketTitle,
          category: ticketCategory,
          difficulty: ticketDifficulty,
          outcome: 'completed',
          timeTaken: elapsedSec,
          creditsEarned: totalCredits,
          xpEarned: totalXp,
          uptimeBonus,
          validationScore,
          hintsUsed,
          timestamp: Date.now(),
        };

        set({
          activeTicket: null,
          activeLab: null,
          currentView: 'ticketResult',
          lastTicketResult: record,
        });

        // Add rewards
        get().addCredits(totalCredits);
        get().addXp(totalXp);
        get().addReputation(reputationGain);

        // Append to session history
        get().recordTicketResult(record);

        // Tutorial progression: advance step if completing a tutorial ticket
        const { tutorial } = get();
        if (tutorial.active && ticketId.startsWith('TUT-')) {
          const currentIdx = TUTORIAL_STEP_ORDER.indexOf(tutorial.step);
          const nextIdx = currentIdx + 1;
          if (nextIdx < TUTORIAL_STEP_ORDER.length) {
            set({
              tutorial: {
                ...tutorial,
                step: TUTORIAL_STEP_ORDER[nextIdx],
              },
              availableTickets: get().availableTickets.filter(
                (t) => t.id !== ticketId,
              ),
            });
          }
        }
      },

      failTicket: () => {
        const { activeTicket, sandboxState } = get();
        if (!activeTicket) return;

        // Sandbox mode: no reputation loss, just reset to browser
        if (sandboxState.active) {
          get().stopTicketTimer();
          set({
            activeTicket: null,
            activeLab: null,
            currentView: 'sandboxLabBrowser',
            sandboxState: { ...sandboxState, activeLabId: null, showSolution: false, showDiff: false },
          });
          return;
        }

        // Career mode: capture ticket data before clearing state
        const ticketId = activeTicket.id;
        const ticketTitle = activeTicket.title;
        const ticketCategory = activeTicket.category;
        const ticketDifficulty = activeTicket.difficulty;

        // Calculate elapsed time
        const elapsedSec = activeTicket.startedAt
          ? Math.floor((Date.now() - activeTicket.startedAt) / 1000)
          : 0;

        // Count hints used
        const hintsUsed = activeTicket.hints.filter(h => h.revealed).length;

        // Stop timer and uptime tracking
        get().stopTicketTimer();
        const { uptimeWs } = get();
        uptimeWs?.disconnect();

        set((state) => {
          if (!state.activeTicket) return state;
          return {
            activeTicket: null,
            activeLab: null,
            currentView: 'ticketResult',
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

        // Create session record (use default credits/xp from ticket as "lost")
        const record: SessionRecord = {
          ticketId,
          title: ticketTitle,
          category: ticketCategory,
          difficulty: ticketDifficulty,
          outcome: 'failed',
          timeTaken: elapsedSec,
          creditsEarned: 0,
          xpEarned: 0,
          uptimeBonus: 0,
          validationScore: 0,
          hintsUsed,
          timestamp: Date.now(),
        };

        // Set lastTicketResult for the result screen
        set({ lastTicketResult: record });

        // Append to session history
        get().recordTicketResult(record);
      },

      revealHint: (hintIndex) => set((state) => {
        if (!state.activeTicket) return state;
        const hint = state.activeTicket.hints[hintIndex];
        if (!hint || hint.revealed) return state;

        // Sandbox mode: hints are free
        if (state.sandboxState.active) {
          const newHints = [...state.activeTicket.hints];
          newHints[hintIndex] = { ...hint, revealed: true };
          return { activeTicket: { ...state.activeTicket, hints: newHints } };
        }

        // Career mode: hints cost credits
        if (state.player.credits < hint.cost) return state;

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
        const { activeTicket, sandboxState } = get();
        if (!activeTicket?.startedAt) return;

        // Sandbox mode: no time pressure, don't auto-fail
        if (sandboxState.active) return;

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
            sessionHistory: state.sessionHistory,
            tutorial: state.tutorial,
            sandboxState: state.sandboxState,
            _saveVersion: 4,
          };
          localStorage.setItem('netops-tower-save', JSON.stringify({
            state: saveData,
            version: 4,
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
            sessionHistory: [],
            tutorial: { active: false, step: 'welcome', skipped: false, graduationShown: false },
            sandboxState: { active: false, activeLabId: null, showSolution: false, showDiff: false },
            careerSnapshot: null,
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
            sessionHistory: savedState.sessionHistory || [],
            tutorial: savedState.tutorial || { active: false, step: 'welcome', skipped: false, graduationShown: false },
            sandboxState: savedState.sandboxState || { active: false, activeLabId: null, showSolution: false, showDiff: false },
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
          sessionHistory: state.sessionHistory,
          tutorial: state.tutorial,
          sandboxState: state.sandboxState,
          _saveVersion: 4,
        };
        return JSON.stringify({ state: saveData, version: 4, exportedAt: new Date().toISOString() }, null, 2);
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
            version: parsed.version || 4,
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

      // === Session History Actions ===

      recordTicketResult: (record) => set((state) => ({
        sessionHistory: [...state.sessionHistory, record],
      })),

      clearLastTicketResult: () => set(() => {
        // Navigate back to office after viewing results
        return {
          lastTicketResult: null,
          currentView: 'office',
        };
      }),

      // === Tutorial Actions ===

      startTutorial: () => set({
        tutorial: { active: true, step: 'welcome', skipped: false, graduationShown: false },
        availableTickets: TUTORIAL_TICKETS,
      }),

      skipTutorial: () => set((state) => ({
        tutorial: { ...state.tutorial, active: false, skipped: true, graduationShown: false },
        availableTickets: SAMPLE_TICKETS,
      })),

      advanceTutorialStep: () => {
        const { tutorial } = get();
        if (!tutorial.active) return;
        const currentIdx = TUTORIAL_STEP_ORDER.indexOf(tutorial.step);
        const nextIdx = currentIdx + 1;
        if (nextIdx < TUTORIAL_STEP_ORDER.length) {
          set({
            tutorial: { ...tutorial, step: TUTORIAL_STEP_ORDER[nextIdx] },
          });
        }
      },

      goToTutorialStep: (step: TutorialStep) => set((state) => ({
        tutorial: { ...state.tutorial, step },
      })),

      replayTutorial: () => set({
        tutorial: { active: true, step: 'welcome', skipped: false, graduationShown: false },
        availableTickets: TUTORIAL_TICKETS,
      }),

      dismissGraduation: () => set((state) => ({
        tutorial: { active: false, step: 'graduation', skipped: false, graduationShown: true },
        availableTickets: SAMPLE_TICKETS,
        currentView: 'office',
        // Bonus credits for completing tutorial
        player: { ...state.player, credits: state.player.credits + 100 },
      })),

      // === Sandbox Actions ===

      enterSandbox: () => {
        const state = get();
        // Don't double-enter
        if (state.sandboxState.active) return;

        // Snapshot career state for restoration on exit
        const careerData = {
          player: { ...state.player },
          activeTicket: state.activeTicket ? { ...state.activeTicket } : null,
          activeLab: state.activeLab ? { ...state.activeLab } : null,
          availableTickets: [...state.availableTickets],
          currentView: state.currentView,
          timeOfDay: state.timeOfDay,
          currentFloor: state.currentFloor,
          elevatorOpen: state.elevatorOpen,
          connectedNodeId: state.connectedNodeId,
          playerPosition: { ...state.playerPosition },
          uptime: { ...state.uptime },
          sessionHistory: [...state.sessionHistory],
          tutorial: { ...state.tutorial },
          inventory: { ...state.inventory },
          settings: { ...state.settings },
          lastSavedAt: state.lastSavedAt,
        };

        // Stop any active timer
        state.stopTicketTimer();

        set({
          careerSnapshot: JSON.stringify(careerData),
          sandboxState: {
            active: true,
            activeLabId: null,
            showSolution: false,
            showDiff: false,
          },
          activeTicket: null,
          activeLab: null,
          currentView: 'sandboxLabBrowser',
          // Sandbox mode freezes uptime tracking
        });
      },

      exitSandbox: () => {
        const { sandboxState, careerSnapshot } = get();
        if (!sandboxState.active || !careerSnapshot) return;

        // Stop any timer from sandbox lab
        get().stopTicketTimer();

        try {
          const career = JSON.parse(careerSnapshot);

          set({
            sandboxState: {
              active: false,
              activeLabId: null,
              showSolution: false,
              showDiff: false,
            },
            careerSnapshot: null,
            player: career.player,
            activeTicket: career.activeTicket,
            activeLab: career.activeLab,
            availableTickets: career.availableTickets,
            currentView: career.currentView,
            timeOfDay: career.timeOfDay,
            currentFloor: career.currentFloor,
            elevatorOpen: career.elevatorOpen,
            connectedNodeId: career.connectedNodeId,
            playerPosition: career.playerPosition,
            uptime: career.uptime,
            sessionHistory: career.sessionHistory,
            tutorial: career.tutorial,
            inventory: career.inventory,
            settings: career.settings,
            lastSavedAt: career.lastSavedAt,
            // Clear transient runtime state
            uptimeWs: null,
            ticketTimerInterval: null,
            ticketTimeRemaining: null,
          });

          // Restart timer if there was an active ticket
          const restoredTicket = get().activeTicket;
          if (restoredTicket?.startedAt && restoredTicket.timeLimit && restoredTicket.status === 'active') {
            const elapsed = Date.now() - restoredTicket.startedAt;
            const totalMs = restoredTicket.timeLimit * 60 * 1000;
            const remaining = Math.max(0, totalMs - elapsed);
            set({ ticketTimeRemaining: remaining });
            if (remaining > 0) get().startTicketTimer();
          }
        } catch (err) {
          console.error('Failed to restore career state:', err);
        }
      },

      openSandboxLab: (labId) => {
        const lab = SAMPLE_TICKETS.find(t => t.id === labId);
        if (!lab) return;
        // Use acceptTicket flow which is sandbox-aware
        get().acceptTicket(lab);
      },

      toggleSandboxSolution: () => set((state) => ({
        sandboxState: {
          ...state.sandboxState,
          showSolution: !state.sandboxState.showSolution,
          showDiff: false, // mutually exclusive
        },
      })),

      toggleSandboxDiff: () => set((state) => ({
        sandboxState: {
          ...state.sandboxState,
          showDiff: !state.sandboxState.showDiff,
          showSolution: false, // mutually exclusive
        },
      })),

      resetSandboxLab: () => {
        const { sandboxState } = get();
        if (!sandboxState.activeLabId) return;

        // Reset: clear active ticket and re-open the same lab
        const labId = sandboxState.activeLabId;
        const lab = SAMPLE_TICKETS.find(t => t.id === labId);
        if (!lab) return;

        // Reset hints to unrevealed
        const freshLab = {
          ...lab,
          hints: lab.hints.map(h => ({ ...h, revealed: false })),
        };

        get().stopTicketTimer();
        set({
          activeTicket: { ...freshLab, status: 'active', startedAt: Date.now() },
          sandboxState: { ...sandboxState, showSolution: false, showDiff: false },
        });
      },
    }),
    {
      name: 'netops-tower-save',
      version: 4,
      migrate: (persistedState: any, _version: number) => {
        // Migration v0 → v1: old format only had player, settings, inventory
        // Fill in defaults for all the new fields introduced in v1
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
        // Migration v1 → v2: add sessionHistory
        if (_version < 2) {
          persistedState.sessionHistory = persistedState.sessionHistory ?? [];
        }
        // Migration v2 → v3: add tutorial state
        if (_version < 3) {
          persistedState.tutorial = persistedState.tutorial ?? {
            active: false,
            step: 'welcome',
            skipped: false,
            graduationShown: false,
          };
        }
        // Migration v3 → v4: add sandbox state
        if (_version < 4) {
          persistedState.sandboxState = persistedState.sandboxState ?? {
            active: false,
            activeLabId: null,
            showSolution: false,
            showDiff: false,
          };
          persistedState.careerSnapshot = persistedState.careerSnapshot ?? null;
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
        // Session history persistence
        sessionHistory: state.sessionHistory,
        // Tutorial state persistence
        tutorial: state.tutorial,
        // Sandbox state persistence (careerSnapshot is transient)
        sandboxState: state.sandboxState,
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

          // Auto-start tutorial on fresh games (level 1, no history, not already completed/skipped)
          const store = useGameStore.getState();

          // Exit sandbox mode on reload — career snapshot is transient
          if (state.sandboxState?.active) {
            store.exitSandbox();
            return;
          }

          if (
            state.player?.level === 1 &&
            (!state.sessionHistory || state.sessionHistory.length === 0) &&
            state.tutorial &&
            !state.tutorial.skipped &&
            !state.tutorial.graduationShown
          ) {
            store.startTutorial();
          }
        };
      },
    }
  )
);
