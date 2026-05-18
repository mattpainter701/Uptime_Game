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

export type GameView = 'office' | 'terminal' | 'tickets' | 'shop' | 'settings' | 'ticketResult' | 'sessionSummary' | 'sandboxLabBrowser';

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

// Session state (pause/resume system)
export interface SessionState {
  isPaused: boolean;
  pausedAt: number | null; // timestamp when pause started
}

// Career progression
export { CAREER_LEVELS } from '../lib/careerProgression';

// Session summary types
export type TicketOutcome = 'completed' | 'failed';

export interface SessionRecord {
  ticketId: string;
  title: string;
  category: string;
  difficulty: number;
  outcome: TicketOutcome;
  timeTaken: number; // seconds
  creditsEarned: number;
  xpEarned: number;
  uptimeBonus: number; // multiplier
  validationScore: number; // 0-1
  hintsUsed: number;
  timestamp: number;
}

// Tutorial system types
export type TutorialStep =
  | 'welcome'
  | 'ticket1'
  | 'ticket2'
  | 'ticket3'
  | 'ticket4'
  | 'ticket5'
  | 'graduation';

export const TUTORIAL_STEP_ORDER: TutorialStep[] = [
  'welcome',
  'ticket1',
  'ticket2',
  'ticket3',
  'ticket4',
  'ticket5',
  'graduation',
];

export interface TutorialState {
  active: boolean;
  step: TutorialStep;
  skipped: boolean;
  graduationShown: boolean;
}

export interface TutorialUiHighlight {
  selector: string;  // CSS selector of the element to highlight
  message: string;   // What to say about this element
  pulseColor?: 'cyan' | 'pink' | 'green';
}

export interface TutorialStepConfig {
  step: TutorialStep;
  title: string;
  body: string;
  highlights?: TutorialUiHighlight[];
  hint?: string;         // "Need help?" hint text
  targetTicketId?: string; // If set, the tutorial ticket for this step
}

// Sandbox mode types

export interface SandboxState {
  /** Whether sandbox mode is currently active */
  active: boolean;
  /** The lab/ticket currently loaded in sandbox, if any */
  activeLabId: string | null;
  /** Show solution for current lab */
  showSolution: boolean;
  /** Current config diff for comparison */
  showDiff: boolean;
}

/** A sandbox lab — derived from a ticket, browsable in sandbox mode */
export interface SandboxLab {
  id: string;
  title: string;
  description: string;
  category: TicketCategory;
  difficulty: 1 | 2 | 3 | 4 | 5;
  labTemplate: string;
  hints: TicketHint[];
  validation: ValidationCriteria[];
  /** Derived appliance type from lab template */
  applianceType: string;
  /** Solution steps for "Show Solution" */
  solution: SandboxSolution;
}

export interface SandboxSolution {
  summary: string;
  steps: SandboxSolutionStep[];
}

export interface SandboxSolutionStep {
  /** Human-readable description of this step */
  description: string;
  /** Command to run (for command reference) */
  command?: string;
  /** Expected config snippet */
  expectedConfig?: string;
  /** Which node to run the command on */
  node?: string;
}

export type ApplianceType = 'router' | 'switch' | 'firewall' | 'linux' | 'general';
