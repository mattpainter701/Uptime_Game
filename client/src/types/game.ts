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
  type: 'ping' | 'command' | 'config' | 'api';
  params: Record<string, unknown>;
  id?: string;  // unique criterion id for reporting
  weight?: number;  // relative weight for partial scoring
  required?: boolean;  // if true, failure blocks full_pass
  convergenceDelayMs?: number;  // delay before checking (e.g., OSPF convergence)
  hintOnFail?: string;  // hint shown when this criterion fails
  antiCheat?: boolean;  // if true, bypassing triggers anti-cheat flag
}

// Validation Engine v2 types

export type CriterionStatus = 'pass' | 'fail' | 'skipped' | 'timed_out' | 'error';

export interface CriterionResult {
  criterion_id: string;
  check_type: string;
  status: CriterionStatus;
  passed: boolean;
  message: string;
  hint: string;
  duration_ms: number;
  expected?: unknown;
  actual?: unknown;
  params: Record<string, unknown>;
}

export type ValidationOutcome = 'full_pass' | 'partial_pass' | 'full_fail' | 'error';

export interface ValidationReport {
  ticket_id: string;
  outcome: ValidationOutcome;
  success: boolean;
  total_criteria: number;
  passed_criteria: number;
  failed_criteria: number;
  score: number;  // 0.0 to 1.0
  reward_multiplier: number;
  criteria_results: CriterionResult[];
  preflight_passed?: boolean;
  anti_cheat_flags: string[];
  total_duration_ms: number;
  message: string;
  hints: string[];
}

export interface ValidateTicketRequest {
  ticket_id: string;
  validation_criteria: Record<string, unknown>[];
  mock_cli_state?: Record<string, unknown>;
  command_history?: Record<string, unknown>[];
  script?: Record<string, unknown>;
}

export interface PreflightCheckRequest {
  ticket_id: string;
  lab_path: string;
  preflight_criteria: Record<string, unknown>[];
}

export interface PreflightCheckResponse {
  passed: boolean;
  lab_correctly_broken: boolean;
  checks: CriterionResult[];
  message: string;
}

export interface GradingConfig {
  full_pass_threshold: number;
  partial_pass_threshold: number;
  partial_reward_floor: number;
  reward_scaling: string;
  reward_steps: Array<{ threshold: number; multiplier: number }>;
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

export type GraphicsQuality = 'low' | 'medium' | 'high';
export type ColorblindMode = 'none' | 'protanopia' | 'deuteranopia' | 'tritanopia';
export type SettingsPreset = 'performance' | 'balanced' | 'quality';

export interface GameSettings {
  // Graphics
  graphicsQuality: GraphicsQuality;
  shadows: boolean;
  antialiasing: boolean;
  renderDistance: number; // 1-10

  // Audio
  masterVolume: number; // 0-1
  musicVolume: number;
  sfxVolume: number;
  ambientSounds: boolean;
  uiSounds: boolean;

  // Gameplay
  showHints: boolean;
  autoValidate: boolean;
  confirmOnFail: boolean;
  enforceTimeLimits: boolean;

  // Terminal
  terminalTheme: 'dark' | 'light' | 'cyberpunk';
  terminalFontSize: number;
  terminalOpacity: number; // 0-1
  terminalBlinkCursor: boolean;
  terminalScrollback: number; // 500-5000

  // Accessibility (stubs — full implementation in T9)
  colorblindMode: ColorblindMode;
  reducedMotion: boolean;
  largeText: boolean;
}

/** Preset definitions for one-click settings application */
export const SETTINGS_PRESETS: Record<SettingsPreset, GameSettings> = {
  performance: {
    graphicsQuality: 'low',
    shadows: false,
    antialiasing: false,
    renderDistance: 3,
    masterVolume: 0.5,
    musicVolume: 0.3,
    sfxVolume: 0.5,
    ambientSounds: false,
    uiSounds: true,
    showHints: true,
    autoValidate: false,
    confirmOnFail: false,
    enforceTimeLimits: false,
    terminalTheme: 'dark',
    terminalFontSize: 14,
    terminalOpacity: 0.85,
    terminalBlinkCursor: false,
    terminalScrollback: 1000,
    colorblindMode: 'none',
    reducedMotion: true,
    largeText: false,
  },
  balanced: {
    graphicsQuality: 'medium',
    shadows: true,
    antialiasing: true,
    renderDistance: 5,
    masterVolume: 0.7,
    musicVolume: 0.5,
    sfxVolume: 0.7,
    ambientSounds: true,
    uiSounds: true,
    showHints: true,
    autoValidate: false,
    confirmOnFail: true,
    enforceTimeLimits: true,
    terminalTheme: 'cyberpunk',
    terminalFontSize: 14,
    terminalOpacity: 0.9,
    terminalBlinkCursor: true,
    terminalScrollback: 2000,
    colorblindMode: 'none',
    reducedMotion: false,
    largeText: false,
  },
  quality: {
    graphicsQuality: 'high',
    shadows: true,
    antialiasing: true,
    renderDistance: 8,
    masterVolume: 0.8,
    musicVolume: 0.7,
    sfxVolume: 0.8,
    ambientSounds: true,
    uiSounds: true,
    showHints: true,
    autoValidate: true,
    confirmOnFail: true,
    enforceTimeLimits: true,
    terminalTheme: 'cyberpunk',
    terminalFontSize: 16,
    terminalOpacity: 0.95,
    terminalBlinkCursor: true,
    terminalScrollback: 3000,
    colorblindMode: 'none',
    reducedMotion: false,
    largeText: false,
  },
};

export const DEFAULT_SETTINGS: GameSettings = {
  graphicsQuality: 'medium',
  shadows: true,
  antialiasing: true,
  renderDistance: 5,
  masterVolume: 0.7,
  musicVolume: 0.5,
  sfxVolume: 0.7,
  ambientSounds: true,
  uiSounds: true,
  showHints: true,
  autoValidate: false,
  confirmOnFail: true,
  enforceTimeLimits: true,
  terminalTheme: 'cyberpunk',
  terminalFontSize: 14,
  terminalOpacity: 0.9,
  terminalBlinkCursor: true,
  terminalScrollback: 2000,
  colorblindMode: 'none',
  reducedMotion: false,
  largeText: false,
};

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

// Session state (pause/resume system)
export interface SessionState {
  isPaused: boolean;
  pausedAt: number | null; // timestamp when pause started
}

// Career progression
export { CAREER_LEVELS } from '../lib/careerProgression';
