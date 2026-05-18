import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { Player, Ticket, Lab, GameView, GameSettings, TimeOfDay, UptimeState, NodeUptimeStats, GameConfig, PlayerPosition, MovementState, ItemId, SessionState, SessionRecord, TutorialState, TutorialStep, SandboxState, FloorId, NPCState, NPCDialogueState, InteractiveObjectState, WeatherState, WeatherType, AmbientSoundState, DeskCustomization, CoffeeBoost } from '../types/game';
import { ITEM_DEFINITIONS, TUTORIAL_STEP_ORDER } from '../types/game';
import type { PlayerShopState, PlayerPrestigeState, DailyChallengeState, DailyChallenge, ComputedBuffs, ShopItemId, ActiveConsumable } from '../types/game';
import { getCareerLevelFromXp, getXpToNextCareerLevel } from '../lib/careerProgression';
import { getReputationLossForFailure } from '../lib/reputationProgression';
import { SHOP_ITEMS, getShopItem } from '../lib/shopData';
import { getOrGenerateChallenges } from '../lib/dailyChallenges';
import { getPrestigeCost, executePrestige, computePrestigeMultiplier } from '../lib/prestigeSystem';
import { api } from '../services/api';
import type { NodeUptimeStats as ServerNodeStats } from '../services/api';
import { UptimeWebSocket, type UptimeUpdate } from '../services/websocket';
import { TUTORIAL_TICKETS } from '../lib/tutorialTickets';

// === Sprint 7: Buff application helper ===
function applyBuff(buffs: ComputedBuffs, effect: { type: string; value: number; isFlat: boolean }): void {
  switch (effect.type) {
    case 'xp_multiplier':
      buffs.xpMultiplier *= effect.isFlat ? (1 + effect.value) : effect.value;
      break;
    case 'credit_multiplier':
      buffs.creditMultiplier *= effect.isFlat ? (1 + effect.value) : effect.value;
      break;
    case 'reputation_multiplier':
      buffs.reputationMultiplier *= effect.isFlat ? (1 + effect.value) : effect.value;
      break;
    case 'time_extension':
      buffs.timeExtensionMinutes += effect.value;
      break;
    case 'hint_discount':
      buffs.hintDiscountPercent += effect.value;
      break;
    case 'item_drop_bonus':
      buffs.itemDropBonus += effect.value;
      break;
  }
}

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
  currentFloor: FloorId;
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

  // Sprint 8: NPC system
  npcs: NPCState[];
  npcDialogue: NPCDialogueState;

  // Sprint 8: Interactive objects
  interactiveObjects: InteractiveObjectState[];

  // Sprint 8: Weather
  weather: WeatherState;

  // Sprint 8: Ambient sound
  ambientSound: AmbientSoundState;

  // Sprint 8: Desk customization
  deskCustomization: DeskCustomization;

  // Sprint 8: Coffee boost
  coffeeBoost: CoffeeBoost;

  // Sprint 7: Shop system
  shopState: PlayerShopState;

  // Sprint 7: Prestige system
  prestigeState: PlayerPrestigeState;

  // Sprint 7: Daily challenges
  dailyChallengeState: DailyChallengeState | null;

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
  setCurrentFloor: (floor: FloorId) => void;
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

  // Sprint 8: NPC actions
  startNpcDialogue: (npcId: string) => void;
  advanceNpcDialogue: (responseIndex?: number) => void;
  closeNpcDialogue: () => void;
  resetNpcDaily: () => void;

  // Sprint 8: Interactive object actions
  useInteractiveObject: (objectId: string) => string;
  canUseInteractiveObject: (objectId: string) => boolean;

  // Sprint 8: Weather actions
  updateWeather: () => void;
  setWeather: (type: WeatherType) => void;

  // Sprint 8: Ambient sound actions
  toggleAmbientSound: () => void;
  setActiveSounds: (sounds: AmbientSoundState['activeSounds']) => void;

  // Sprint 8: Desk customization actions
  setDeskDecoration: (decoration: DeskCustomization['decoration']) => void;
  setDeskColor: (color: string) => void;

  // Sprint 8: Coffee boost
  useCoffeeBoost: () => void;
  checkCoffeeBoost: () => void;

  // Sprint 7: Shop actions
  buyShopItem: (itemId: ShopItemId) => boolean;
  activateConsumable: (itemId: ShopItemId) => boolean;
  checkExpiredConsumables: () => void;
  computeBuffs: () => ComputedBuffs;

  // Sprint 7: Daily challenge actions
  claimDailyChallenge: (challengeId: string) => boolean;
  updateChallengeProgress: (type: string, amount: number) => void;
  regenerateChallenges: () => void;

  // Sprint 7: Prestige actions
  canPrestige: () => { can: boolean; nextLevel: { level: number; name: string; requiredCredits: number; multiplier: number; title: string; icon: string } | null };
  doPrestige: () => boolean;
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


// Sprint 8: NPC definitions
const NPC_DEFINITIONS: NPCState[] = [
  {
    id: 'npc-manager-1', role: 'manager', name: 'Sarah Chen', floorId: 'lobby',
    position: [3, 0, -2], rotation: -Math.PI / 2,
    currentDialogueIndex: 0, spokenToday: false,
    dialogueTree: [
      { text: "Hey! Good to see you on the floor. The CTO's been asking about uptime metrics.", responses: [
        { text: "I'm on it. Any specific numbers he wants?", action: 'give_credits', nextLineIndex: 1 },
        { text: "I'll get to it later.", action: 'none', nextLineIndex: 2 },
      ]},
      { text: "He wants to see 99.9% across the board this quarter. Here's a bonus for the initiative." },
      { text: "Don't let it slide too long - the board meeting is Friday." },
    ],
  },
  {
    id: 'npc-coworker-1', role: 'coworker', name: 'Mike Torres', floorId: 'floor1',
    position: [-2, 0, 3], rotation: Math.PI / 4,
    currentDialogueIndex: 0, spokenToday: false,
    dialogueTree: [
      { text: "Rough morning - the core switch in VLAN 20 keeps flapping. Seen anything like that?", responses: [
        { text: "Check the spanning-tree priorities. Could be a root bridge election loop.", action: 'motivate', nextLineIndex: 1 },
        { text: "Haven't seen it - good luck though.", action: 'none', nextLineIndex: 2 },
      ]},
      { text: "Good call! I'll check that now. Thanks for the tip!" },
      { text: "No worries, I'll figure it out." },
    ],
  },
  {
    id: 'npc-helpdesk-1', role: 'helpdesk', name: 'Alex Rivera', floorId: 'floor2',
    position: [1, 0, -4], rotation: 0,
    currentDialogueIndex: 0, spokenToday: false,
    dialogueTree: [
      { text: "Hey! I've got a ticket about a user who can't reach the file server. Mind if I shadow you?", responses: [
        { text: "Sure, I'll walk you through the troubleshooting steps.", action: 'give_hint', nextLineIndex: 1 },
        { text: "Maybe later - I'm swamped right now.", action: 'none', nextLineIndex: 2 },
      ]},
      { text: "Amazing! So I should first check the default gateway, then work my way up?" },
      { text: "No problem - I'll try to figure it out myself." },
    ],
  },
  {
    id: 'npc-manager-2', role: 'manager', name: 'David Park', floorId: 'floor4',
    position: [-3, 0, 0], rotation: Math.PI,
    currentDialogueIndex: 0, spokenToday: false,
    dialogueTree: [
      { text: "Welcome to the engineering floor! We're working on the new SD-WAN rollout. Want to review the architecture?", responses: [
        { text: "Absolutely - show me the topology.", action: 'give_credits', nextLineIndex: 1 },
        { text: "I'll check it out later.", action: 'none', nextLineIndex: 2 },
      ]},
      { text: "Here's a diagram of the new hub-and-spoke layout. Credits for helping with the review!" },
      { text: "The docs are on the shared drive whenever you're ready." },
    ],
  },
  {
    id: 'npc-coworker-2', role: 'coworker', name: 'Priya Patel', floorId: 'floor5',
    position: [2, 0, -1], rotation: -Math.PI / 3,
    currentDialogueIndex: 0, spokenToday: false,
    dialogueTree: [
      { text: "I'm designing the new multi-region BGP topology. Could use a second pair of eyes on the route maps.", responses: [
        { text: "Let me take a look. Route maps can be tricky with multiple AS paths.", action: 'motivate', nextLineIndex: 1 },
        { text: "I trust your judgment - you've got this.", action: 'none', nextLineIndex: 2 },
      ]},
      { text: "Thanks! That's exactly what I was worried about. I'll add the AS-path prepend." },
      { text: "Appreciate the confidence! I'll run it by the lab first." },
    ],
  },
  {
    id: 'npc-helpdesk-2', role: 'helpdesk', name: 'Jasmine Wu', floorId: 'penthouse',
    position: [-2, 0, 1], rotation: Math.PI / 2,
    currentDialogueIndex: 0, spokenToday: false,
    dialogueTree: [
      { text: "Wow, the penthouse view is incredible! The CTO asked me to set up the executive dashboard. Any tips?", responses: [
        { text: "Focus on the top-5 KPIs: uptime, MTTR, incident count, SLA compliance, and throughput.", action: 'give_hint', nextLineIndex: 1 },
        { text: "Keep it simple - the execs just want green lights.", action: 'none', nextLineIndex: 2 },
      ]},
      { text: "Great advice! I'll build the dashboard around those five metrics. Here's a coffee on me!", action: 'coffee_boost', nextLineIndex: 3 },
      { text: "Makes sense. I'll keep it at a high level.", nextLineIndex: 3 },
      { text: "See you around the tower!" },
    ],
  },
];

// Sprint 8: Interactive object definitions
const INTERACTIVE_OBJECT_DEFINITIONS: InteractiveObjectState[] = [
  { id: 'obj-coffee-lobby', type: 'coffee_machine', floorId: 'lobby', position: [-3.5, 0.7, -3.5], label: 'Coffee Machine', hint: 'Grants +2 minutes to active ticket timer', cooldownMs: 300000, lastUsedAt: null },
  { id: 'obj-coffee-floor1', type: 'coffee_machine', floorId: 'floor1', position: [3, 0.7, -3], label: 'Coffee Machine', hint: 'Grants +2 minutes to active ticket timer', cooldownMs: 300000, lastUsedAt: null },
  { id: 'obj-whiteboard-floor4', type: 'whiteboard', floorId: 'floor4', position: [-3, 1.2, -2], label: 'Engineering Whiteboard', hint: 'Review architecture diagrams - reveals a free hint', cooldownMs: 600000, lastUsedAt: null },
  { id: 'obj-serverrack-floor3', type: 'server_rack', floorId: 'floor3', position: [3.5, 1, 3], label: 'Server Rack', hint: 'Check server status - earn bonus credits if all green', cooldownMs: 600000, lastUsedAt: null },
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
        terminalFontFamily: 'jetbrains',
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

      // Sprint 8: NPC system
      npcs: NPC_DEFINITIONS,
      npcDialogue: { activeNpcId: null, currentLineIndex: 0, isOpen: false },

      // Sprint 8: Interactive objects
      interactiveObjects: INTERACTIVE_OBJECT_DEFINITIONS,

      // Sprint 8: Weather
      weather: { current: 'clear', intensity: 0, nextChangeAt: Date.now() + 300000, lightningFlash: false },

      // Sprint 8: Ambient sound
      ambientSound: { enabled: true, activeSounds: [] },

      // Sprint 8: Desk customization
      deskCustomization: { decoration: 'default', deskColor: '#f0f0f0', chairColor: '#2d2d2d', monitorCount: 3 },

      // Sprint 8: Coffee boost
      coffeeBoost: { active: false, expiresAt: null, timeAddedMinutes: 2 },

      // Sprint 7: Shop state
      shopState: {
        ownedItems: [],
        activeConsumables: [],
      },

      // Sprint 7: Prestige state
      prestigeState: {
        prestigeLevel: 0,
        prestigeMultiplier: 1.0,
        persistedUpgrades: [],
      },

      // Sprint 7: Daily challenges (generated on first access)
      dailyChallengeState: null,

      // View actions
      setView: (view) => {
        // Sprint 7: Auto-generate daily challenges when opening shop
        if (view === 'shop') {
          const current = get().dailyChallengeState;
          const fresh = getOrGenerateChallenges(current);
          if (fresh !== current) {
            set({ dailyChallengeState: fresh, currentView: view });
            return;
          }
        }
        set({ currentView: view });
      },

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

        // Consume items
        if (activeTicket.consumeItems && activeTicket.consumeItems.length > 0) {
          for (const itemId of activeTicket.consumeItems) {
            get().useItem(itemId);
          }
        }

        // Sprint 7: Clean up expired consumables and compute buffs
        get().checkExpiredConsumables();
        const buffs = get().computeBuffs();

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

        // Calculate rewards with bonus + Sprint 7 buffs
        const baseCredits = activeTicket.rewardCredits;
        const baseXp = activeTicket.rewardXp;
        const totalCredits = Math.floor(baseCredits * uptimeBonus * buffs.creditMultiplier) + uptimePoints;
        const totalXp = Math.floor(baseXp * uptimeBonus * buffs.xpMultiplier);
        const reputationGain = Math.floor(Math.max(1, 10 - uptime.totalIncidents) * buffs.reputationMultiplier);
        const validationScore = 1.0; // Successful completion = perfect score

        // Track challenge progress
        get().updateChallengeProgress('complete_tickets', 1);
        get().updateChallengeProgress('earn_credits', totalCredits);
        get().updateChallengeProgress('earn_xp', totalXp);
        if (uptime.totalIncidents === 0) get().updateChallengeProgress('fix_incidents', 1);

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

      revealHint: (hintIndex) => {
        const state = get();
        if (!state.activeTicket) return;
        const hint = state.activeTicket.hints[hintIndex];
        if (!hint || hint.revealed) return;

        // Sandbox mode: hints are free
        if (state.sandboxState.active) {
          const newHints = [...state.activeTicket.hints];
          newHints[hintIndex] = { ...hint, revealed: true };
          set({ activeTicket: { ...state.activeTicket, hints: newHints } });
          return;
        }

        // Sprint 7: Apply hint discount from buffs
        get().checkExpiredConsumables();
        const buffs = get().computeBuffs();
        const discountMultiplier = Math.max(0, 1 - buffs.hintDiscountPercent / 100);
        const actualCost = Math.floor(hint.cost * discountMultiplier);

        // Career mode: hints cost credits
        if (state.player.credits < actualCost) return;

        const newHints = [...state.activeTicket.hints];
        newHints[hintIndex] = { ...hint, revealed: true };

        set({
          activeTicket: { ...state.activeTicket, hints: newHints },
          player: { ...state.player, credits: state.player.credits - actualCost },
        });

        // Track challenge progress
        get().updateChallengeProgress('use_hints', 1);
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
        const { activeTicket, sandboxState } = get();
        if (!activeTicket?.startedAt) return;

        // Sandbox mode: no time pressure, don't auto-fail
        if (sandboxState.active) return;

        const elapsed = Date.now() - activeTicket.startedAt;

        // Sprint 7: Add time extension from buffs
        get().checkExpiredConsumables();
        const buffs = get().computeBuffs();
        const timeExtensionMs = buffs.timeExtensionMinutes * 60 * 1000;
        const totalMs = (activeTicket.timeLimit * 60 * 1000) + timeExtensionMs;
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
            npcs: state.npcs,
            interactiveObjects: state.interactiveObjects,
            weather: state.weather,
            ambientSound: state.ambientSound,
            deskCustomization: state.deskCustomization,
            coffeeBoost: state.coffeeBoost,
            _saveVersion: 5,
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
            npcs: NPC_DEFINITIONS,
            npcDialogue: { activeNpcId: null, currentLineIndex: 0, isOpen: false },
            interactiveObjects: INTERACTIVE_OBJECT_DEFINITIONS,
            weather: { current: 'clear', intensity: 0, nextChangeAt: Date.now() + 300000, lightningFlash: false },
            ambientSound: { enabled: true, activeSounds: [] },
            deskCustomization: { decoration: 'default', deskColor: '#f0f0f0', chairColor: '#2d2d2d', monitorCount: 3 },
            coffeeBoost: { active: false, expiresAt: null, timeAddedMinutes: 2 },
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
            npcs: savedState.npcs || NPC_DEFINITIONS,
            npcDialogue: savedState.npcDialogue || { activeNpcId: null, currentLineIndex: 0, isOpen: false },
            interactiveObjects: savedState.interactiveObjects || INTERACTIVE_OBJECT_DEFINITIONS,
            weather: savedState.weather || { current: 'clear', intensity: 0, nextChangeAt: Date.now() + 300000, lightningFlash: false },
            ambientSound: savedState.ambientSound || { enabled: true, activeSounds: [] },
            deskCustomization: savedState.deskCustomization || { decoration: 'default', deskColor: '#f0f0f0', chairColor: '#2d2d2d', monitorCount: 3 },
            coffeeBoost: savedState.coffeeBoost || { active: false, expiresAt: null, timeAddedMinutes: 2 },
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
        return JSON.stringify({ state: saveData, version: 5, exportedAt: new Date().toISOString() }, null, 2);
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
        const labId = sandboxState.activeLabId;
        const lab = SAMPLE_TICKETS.find(t => t.id === labId);
        if (!lab) return;
        const freshLab = { ...lab, hints: lab.hints.map(h => ({ ...h, revealed: false })) };
        get().stopTicketTimer();
        set({
          activeTicket: { ...freshLab, status: 'active', startedAt: Date.now() },
          sandboxState: { ...sandboxState, showSolution: false, showDiff: false },
        });
      },

      // === Sprint 8: NPC Actions ===
      startNpcDialogue: (npcId) => {
        const npc = get().npcs.find(n => n.id === npcId);
        if (!npc) return;
        set({ npcDialogue: { activeNpcId: npcId, currentLineIndex: npc.currentDialogueIndex, isOpen: true } });
        set((s) => ({ npcs: s.npcs.map(n => n.id === npcId ? { ...n, spokenToday: true } : n) }));
      },

      advanceNpcDialogue: (responseIndex) => {
        const { npcDialogue, npcs } = get();
        if (!npcDialogue.activeNpcId) return;
        const npc = npcs.find(n => n.id === npcDialogue.activeNpcId);
        if (!npc) return;
        const line = npc.dialogueTree[npcDialogue.currentLineIndex];
        if (!line) { get().closeNpcDialogue(); return; }
        if (responseIndex !== undefined && line.responses?.[responseIndex]) {
          const r = line.responses[responseIndex];
          if (r.action === 'give_hint') { const t = get().activeTicket; if (t) { const i = t.hints.findIndex(h => !h.revealed); if (i >= 0) get().revealHint(i); } }
          else if (r.action === 'give_credits') get().addCredits(50);
          else if (r.action === 'coffee_boost') get().useCoffeeBoost();
          else if (r.action === 'motivate') get().addXp(25);
          if (r.nextLineIndex !== undefined) set({ npcDialogue: { ...npcDialogue, currentLineIndex: r.nextLineIndex } });
          else get().closeNpcDialogue();
        } else get().closeNpcDialogue();
      },

      closeNpcDialogue: () => set({ npcDialogue: { activeNpcId: null, currentLineIndex: 0, isOpen: false } }),
      resetNpcDaily: () => set((s) => ({ npcs: s.npcs.map(n => ({ ...n, spokenToday: false })) })),

      // === Sprint 8: Interactive Objects ===
      useInteractiveObject: (objectId) => {
        const obj = get().interactiveObjects.find(o => o.id === objectId);
        if (!obj) return 'Object not found';
        const now = Date.now();
        if (obj.lastUsedAt && (now - obj.lastUsedAt) < obj.cooldownMs) {
          return 'On cooldown - ' + Math.ceil((obj.cooldownMs - (now - obj.lastUsedAt)) / 1000) + 's remaining';
        }
        set((s) => ({ interactiveObjects: s.interactiveObjects.map(o => o.id === objectId ? { ...o, lastUsedAt: now } : o) }));
        switch (obj.type) {
          case 'coffee_machine': get().useCoffeeBoost(); return 'Coffee boost active! +2 minutes added to ticket timer.';
          case 'whiteboard': {
            const t = get().activeTicket;
            if (t) { const i = t.hints.findIndex(h => !h.revealed); if (i >= 0) { get().revealHint(i); return 'Whiteboard reviewed! A hint has been revealed.'; } return 'All hints already revealed.'; }
            return 'No active ticket.';
          }
          case 'server_rack': {
            const u = get().uptime;
            const green = Object.values(u.nodes).every(n => n.isResponsive);
            if (green && Object.keys(u.nodes).length > 0) { get().addCredits(75); return 'All servers green! +75 bonus credits.'; }
            return 'Server status checked.';
          }
          default: return 'Used ' + obj.label;
        }
      },

      canUseInteractiveObject: (objectId) => {
        const obj = get().interactiveObjects.find(o => o.id === objectId);
        if (!obj || !obj.lastUsedAt) return true;
        return (Date.now() - obj.lastUsedAt) >= obj.cooldownMs;
      },

      // === Sprint 8: Weather ===
      updateWeather: () => {
        const now = Date.now();
        if (now < get().weather.nextChangeAt) return;
        const { timeOfDay } = get();
        const rand = Math.random();
        const night = timeOfDay < 6 || timeOfDay > 18;
        let w, i;
        if (night && rand < 0.3) { w = 'storm'; i = 0.5 + Math.random() * 0.5; }
        else if (rand < 0.25) { w = 'rain'; i = 0.2 + Math.random() * 0.6; }
        else { w = 'clear'; i = 0; }
        set({ weather: { current: w, intensity: i, nextChangeAt: now + 120000 + Math.random() * 300000, lightningFlash: false } });
      },

      setWeather: (type) => set((s) => ({ weather: { ...s.weather, current: type, intensity: type === 'clear' ? 0 : 0.5, nextChangeAt: Date.now() + 600000 } })),

      // === Sprint 8: Ambient Sound ===
      toggleAmbientSound: () => set((s) => ({ ambientSound: { ...s.ambientSound, enabled: !s.ambientSound.enabled } })),
      setActiveSounds: (sounds) => set((s) => ({ ambientSound: { ...s.ambientSound, activeSounds: sounds } })),

      // === Sprint 8: Desk Customization ===
      setDeskDecoration: (decoration) => set((s) => ({ deskCustomization: { ...s.deskCustomization, decoration } })),
      setDeskColor: (color) => set((s) => ({ deskCustomization: { ...s.deskCustomization, deskColor: color } })),

      // === Sprint 8: Coffee Boost ===
      useCoffeeBoost: () => {
        set({ coffeeBoost: { active: true, expiresAt: Date.now(), timeAddedMinutes: 2 } });
        const { activeTicket, ticketTimeRemaining } = get();
        if (activeTicket && ticketTimeRemaining !== null && ticketTimeRemaining > 0) {
          set({ ticketTimeRemaining: ticketTimeRemaining + 2 * 60 * 1000 });
        }
      },

      checkCoffeeBoost: () => {},

      // === Sprint 7: Buff helper ===
      // (defined inside create callback so it has access to none of the store;
      //  it's a pure function used by computeBuffs)

      // === Sprint 7: Shop System ===

      buyShopItem: (itemId) => {
        const item = getShopItem(itemId);
        if (!item) return false;

        const { player, shopState } = get();

        // Level gate
        if (player.level < item.requiredLevel) return false;

        // Already owned (non-consumables max 1)
        if (item.maxPurchases === 1 && shopState.ownedItems.includes(itemId)) return false;

        // Count purchases for multi-buy items
        const purchaseCount = shopState.ownedItems.filter(id => id === itemId).length;
        if (purchaseCount >= item.maxPurchases) return false;

        // Check credits
        if (player.credits < item.cost) return false;

        set((state) => ({
          player: { ...state.player, credits: state.player.credits - item.cost },
          shopState: {
            ...state.shopState,
            ownedItems: [...state.shopState.ownedItems, itemId],
          },
        }));

        // Track challenge progress
        get().updateChallengeProgress('buy_items', 1);
        return true;
      },

      activateConsumable: (itemId) => {
        const { shopState } = get();
        const item = getShopItem(itemId);

        if (!item || !item.consumable) return false;

        // Must own at least one
        const ownedIdx = shopState.ownedItems.indexOf(itemId);
        if (ownedIdx === -1) return false;

        // Remove one from owned items
        const newOwned = [...shopState.ownedItems];
        newOwned.splice(ownedIdx, 1);

        const now = Date.now();
        const durationMs = (item.consumable.duration || 1800) * 1000;

        const activeConsumable: ActiveConsumable = {
          itemId,
          buff: item.consumable,
          activatedAt: now,
          expiresAt: now + durationMs,
        };

        set((state) => ({
          shopState: {
            ...state.shopState,
            ownedItems: newOwned,
            activeConsumables: [...state.shopState.activeConsumables, activeConsumable],
          },
        }));

        return true;
      },

      checkExpiredConsumables: () => {
        const { shopState } = get();
        const now = Date.now();
        const stillActive = shopState.activeConsumables.filter(ac => ac.expiresAt > now);

        if (stillActive.length !== shopState.activeConsumables.length) {
          set((state) => ({
            shopState: {
              ...state.shopState,
              activeConsumables: stillActive,
            },
          }));
        }
      },

      computeBuffs: () => {
        const { shopState, prestigeState, uptime } = get();

        const buffs: ComputedBuffs = {
          xpMultiplier: 1.0,
          creditMultiplier: 1.0,
          reputationMultiplier: 1.0,
          timeExtensionMinutes: 0,
          hintDiscountPercent: 0,
          itemDropBonus: 0,
        };

        // Permanent item buffs
        const ownedSet = new Set(shopState.ownedItems);
        for (const itemId of ownedSet) {
          const item = getShopItem(itemId);
          if (item?.buff) {
            applyBuff(buffs, item.buff);
          }
        }

        // Active consumable buffs
        for (const ac of shopState.activeConsumables) {
          applyBuff(buffs, ac.buff);
        }

        // Uptime bonus
        if (uptime.uptimePercentage >= 99) {
          buffs.xpMultiplier *= 1.1;
          buffs.creditMultiplier *= 1.1;
        } else if (uptime.uptimePercentage >= 95) {
          buffs.xpMultiplier *= 1.05;
          buffs.creditMultiplier *= 1.05;
        }

        // Prestige multiplier
        const prestigeMult = prestigeState.prestigeMultiplier;
        buffs.xpMultiplier *= prestigeMult;
        buffs.creditMultiplier *= prestigeMult;
        buffs.reputationMultiplier *= prestigeMult;

        return buffs;
      },

      // === Sprint 7: Daily Challenges ===

      claimDailyChallenge: (challengeId) => {
        const { dailyChallengeState: dc } = get();
        if (!dc) return false;

        const challenge = dc.challenges.find(c => c.id === challengeId);
        if (!challenge || !challenge.completed || challenge.claimed) return false;

        set((state) => ({
          player: {
            ...state.player,
            credits: state.player.credits + challenge.rewardCredits,
            xp: state.player.xp + challenge.rewardXp,
          },
          dailyChallengeState: {
            ...dc,
            challenges: dc.challenges.map(c =>
              c.id === challengeId ? { ...c, claimed: true } : c
            ),
          },
        }));

        return true;
      },

      updateChallengeProgress: (type, amount) => {
        const { dailyChallengeState: dc } = get();
        if (!dc) return;

        const updated = dc.challenges.map(c => {
          if (c.completed || c.type !== type) return c;
          const newProgress = Math.min(c.progress + amount, c.target);
          return {
            ...c,
            progress: newProgress,
            completed: newProgress >= c.target,
          };
        });

        // Only update if something changed
        const changed = updated.some((c, i) => c.progress !== dc.challenges[i].progress);
        if (changed) {
          set({ dailyChallengeState: { ...dc, challenges: updated } });
        }
      },

      regenerateChallenges: () => {
        set({ dailyChallengeState: getOrGenerateChallenges(null) });
      },

      // === Sprint 7: Prestige System ===

      canPrestige: () => {
        const { player, prestigeState } = get();
        return canPrestige(player.credits, player.level, prestigeState.prestigeLevel);
      },

      doPrestige: () => {
        const { player, shopState, prestigeState } = get();
        const cost = getPrestigeCost(prestigeState.prestigeLevel);
        if (!cost || player.credits < cost.credits) return false;

        const { newPrestige, persistedItems } = executePrestige(
          prestigeState,
          shopState.ownedItems,
          SHOP_ITEMS,
        );

        // Reset player: level 1, 0 XP, pay cost, but keep persisted items
        set({
          player: {
            ...player,
            level: 1,
            xp: 0,
            xpToNextLevel: getXpToNextCareerLevel(0),
            title: 'Help Desk Tech',
            floor: 1,
            credits: player.credits - cost.credits,
          },
          shopState: {
            ...shopState,
            ownedItems: persistedItems,
            activeConsumables: [],
          },
          prestigeState: newPrestige,
        });

        return true;
      },
    }),
    {
      name: 'netops-tower-save',
      version: 6,
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
        // Migration v4 -> v5: add Sprint 8 fields
        if (_version < 5) {
          persistedState.npcs = NPC_DEFINITIONS;
          persistedState.npcDialogue = { activeNpcId: null, currentLineIndex: 0, isOpen: false };
          persistedState.interactiveObjects = INTERACTIVE_OBJECT_DEFINITIONS;
          persistedState.weather = { current: 'clear', intensity: 0, nextChangeAt: Date.now() + 300000, lightningFlash: false };
          persistedState.ambientSound = { enabled: true, activeSounds: [] };
          persistedState.deskCustomization = { decoration: 'default', deskColor: '#f0f0f0', chairColor: '#2d2d2d', monitorCount: 3 };
          persistedState.coffeeBoost = { active: false, expiresAt: null, timeAddedMinutes: 2 };
        }
        // Migration v5 -> v6: add Sprint 7 fields
        if (_version < 6) {
          persistedState.shopState = persistedState.shopState ?? { ownedItems: [], activeConsumables: [] };
          persistedState.prestigeState = persistedState.prestigeState ?? { prestigeLevel: 0, prestigeMultiplier: 1.0, persistedUpgrades: [] };
          persistedState.dailyChallengeState = persistedState.dailyChallengeState ?? null;
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
        uptime: { ...state.uptime, isTracking: false, sessionId: null },
        sessionHistory: state.sessionHistory,
        tutorial: state.tutorial,
        sandboxState: state.sandboxState,
        // Sprint 8 persistence
        npcs: state.npcs,
        interactiveObjects: state.interactiveObjects,
        weather: state.weather,
        ambientSound: state.ambientSound,
        deskCustomization: state.deskCustomization,
        coffeeBoost: state.coffeeBoost,
        // Sprint 7 persistence
        shopState: state.shopState,
        prestigeState: state.prestigeState,
        dailyChallengeState: state.dailyChallengeState,
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
