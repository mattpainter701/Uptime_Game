// NetOps Tower - Game Types

export interface Player {
  id: string;
  name: string;
  level: number;
  title: string;
  floor: number;
  credits: number;
  reputation: number;
  xp: number;
  xpToNextLevel: number;
}

export interface Ticket {
  id: string;
  title: string;
  description: string;
  category: TicketCategory;
  difficulty: 1 | 2 | 3 | 4 | 5;
  timeLimit: number; // minutes
  rewardCredits: number;
  rewardXp: number;
  labTemplate: string;
  hints: TicketHint[];
  validation: ValidationCriteria[];
  status: 'available' | 'active' | 'completed' | 'failed';
  startedAt?: number;
  requiredItems?: ItemId[]; // Items needed to work on this ticket
  consumeItems?: ItemId[]; // Items consumed when completing the ticket
}

export type TicketCategory =
  | 'network-basics'
  | 'switching'
  | 'routing'
  | 'security'
  | 'systems'
  | 'automation'
  | 'high-availability';

export interface TicketHint {
  cost: number;
  text: string;
  revealed: boolean;
}

export interface ValidationCriteria {
  type: 'ping' | 'command' | 'config';
  params: Record<string, unknown>;
}

export interface LabNode {
  id: number;
  name: string;
  template: string;
  status: 'stopped' | 'starting' | 'running';
  consoleUrl: string;
  consoleType: 'telnet' | 'vnc' | 'ssh';
}

export interface Lab {
  id: string;
  name: string;
  path: string;
  nodes: LabNode[];
  topology: string; // SVG or image URL
}

export type GameView = 'office' | 'terminal' | 'tickets' | 'shop' | 'settings';

export type TimeOfDay = number; // 0-24

export interface GameSettings {
  musicVolume: number;
  sfxVolume: number;
  terminalTheme: 'dark' | 'light' | 'cyberpunk';
  terminalFontSize: number;
}

// Uptime tracking types
export interface NodeUptimeStats {
  nodeId: number;
  nodeName: string;
  status: 'stopped' | 'starting' | 'running' | 'stopping';
  isResponsive: boolean;
  uptimeSeconds: number;
  downtimeSeconds: number;
  incidentCount: number;
}

export interface UptimeState {
  sessionId: string | null;
  isTracking: boolean;
  startedAt: number | null;
  nodes: Record<number, NodeUptimeStats>;
  totalUptimeSeconds: number;
  totalDowntimeSeconds: number;
  uptimePercentage: number;
  pointsEarned: number;
  totalIncidents: number;
}

export interface GameConfig {
  uptimeCheckInterval: number;
  uptimePointsPerMinute: number;
  uptimeBonusThreshold: number;
  uptimeBonusMultiplier: number;
  downtimePenaltyPerMinute: number;
  reputationLossPerIncident: number;
  enforceTimeLimits: boolean;
}

// Player 3D position and state
export type PlayerPose = 'seated' | 'standing' | 'walking';

export interface PlayerPosition {
  x: number;
  y: number;
  z: number;
  rotation: number; // Y-axis rotation in radians
  pose: PlayerPose;
  isMoving: boolean;
}

export interface MovementState {
  forward: boolean;
  backward: boolean;
  left: boolean;
  right: boolean;
}

// Inventory Items
export type ItemId =
  | 'laptop'
  | 'console-cable'
  | 'patch-cable'
  | 'fiber-module'
  | 'ssd'
  | 'usb-drive'
  | 'crimping-tool';

export interface InventoryItem {
  id: ItemId;
  name: string;
  icon: string;
  description: string;
  consumable: boolean; // If true, item is removed after use
  maxStack: number; // Max quantity player can carry
}

export const ITEM_DEFINITIONS: Record<ItemId, InventoryItem> = {
  'laptop': {
    id: 'laptop',
    name: 'Laptop',
    icon: '💻',
    description: 'Required to connect to network devices and servers',
    consumable: false,
    maxStack: 1,
  },
  'console-cable': {
    id: 'console-cable',
    name: 'Console Cable',
    icon: '🔌',
    description: 'Required with laptop to access network device console',
    consumable: false,
    maxStack: 1,
  },
  'patch-cable': {
    id: 'patch-cable',
    name: 'Patch Cable',
    icon: '🔗',
    description: 'Cat6 ethernet cable for patching connections',
    consumable: true,
    maxStack: 5,
  },
  'fiber-module': {
    id: 'fiber-module',
    name: 'Fiber Module',
    icon: '💎',
    description: 'SFP+ transceiver for fiber connections',
    consumable: true,
    maxStack: 3,
  },
  'ssd': {
    id: 'ssd',
    name: 'SSD Drive',
    icon: '💾',
    description: 'Replacement SSD for slow or failing drives',
    consumable: true,
    maxStack: 2,
  },
  'usb-drive': {
    id: 'usb-drive',
    name: 'USB Drive',
    icon: '🔑',
    description: 'Bootable USB with recovery tools',
    consumable: false,
    maxStack: 1,
  },
  'crimping-tool': {
    id: 'crimping-tool',
    name: 'Crimping Tool',
    icon: '🔧',
    description: 'For making custom ethernet cables',
    consumable: false,
    maxStack: 1,
  },
};

// Career progression
export { CAREER_LEVELS } from '../lib/careerProgression';
