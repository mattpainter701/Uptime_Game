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

export type ColorblindMode = 'none' | 'protanopia' | 'deuteranopia' | 'tritanopia';

export interface GameSettings {
  musicVolume: number;
  sfxVolume: number;
  terminalTheme: 'dark' | 'light' | 'cyberpunk' | 'amber-retro' | 'solarized-dark';
  terminalFontSize: number;
  terminalFontFamily: 'jetbrains' | 'fira' | 'source' | 'ibm' | 'ubuntu';
  // Accessibility
  colorblindMode: ColorblindMode;
  reducedMotion: boolean;
  largeText: boolean;
  highContrast: boolean;
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

// === Sprint 8: 3D Office Environment Expansion ===

// Floor system expanded to 8 career-gated floors
export type FloorId =
  | 'basement'   // Career level 1: Help Desk Tech
  | 'lobby'      // Career level 2: Junior NetAdmin
  | 'floor1'     // Career level 3: Network Admin (Cubicle)
  | 'floor2'     // Career level 4: Senior NetAdmin (Cubicle)
  | 'floor3'     // Career level 5: Network Engineer (Datacenter)
  | 'floor4'     // Career level 6: Senior Engineer
  | 'floor5'     // Career level 7: Principal Engineer
  | 'penthouse'; // Career level 8: CTO

export interface FloorInfo {
  id: FloorId;
  name: string;
  label: string;
  requiredLevel: number; // Career level required to access
  theme: string;
}

export const FLOOR_DEFINITIONS: FloorInfo[] = [
  { id: 'basement',  name: 'Basement',      label: 'B - My Office',    requiredLevel: 1, theme: 'Personal office with modern desk setup' },
  { id: 'lobby',     name: 'Main Floor',    label: 'L - Lobby',        requiredLevel: 2, theme: 'Reception and security checkpoint' },
  { id: 'floor1',    name: 'Floor 1',       label: '1 - Cubicles',     requiredLevel: 3, theme: 'Open-plan cubicle farm, Network Admin' },
  { id: 'floor2',    name: 'Floor 2',       label: '2 - Cubicles',     requiredLevel: 4, theme: 'Senior cubicle section, Senior NetAdmin' },
  { id: 'floor3',    name: 'Floor 3',       label: '3 - Datacenter',   requiredLevel: 5, theme: 'Server racks and cooling, Network Engineer' },
  { id: 'floor4',    name: 'Floor 4',       label: '4 - Engineering',  requiredLevel: 6, theme: 'Engineering lab with test benches, Senior Engineer' },
  { id: 'floor5',    name: 'Floor 5',       label: '5 - Architecture', requiredLevel: 7, theme: 'Glass-walled architecture studio, Principal Engineer' },
  { id: 'penthouse', name: 'Penthouse',     label: 'PH - Penthouse',   requiredLevel: 8, theme: 'Executive suite with skyline view, CTO' },
];

// NPC System
export type NPCRole = 'manager' | 'coworker' | 'helpdesk';

export interface NPCDialogueLine {
  text: string;
  responses?: NPCDialogueResponse[];
}

export interface NPCDialogueResponse {
  text: string;
  action?: NPCAction;
  nextLineIndex?: number;
}

export type NPCAction = 'give_hint' | 'give_credits' | 'coffee_boost' | 'motivate' | 'none';

export interface NPCState {
  id: string;
  role: NPCRole;
  name: string;
  floorId: FloorId;
  position: [number, number, number];
  rotation: number;
  currentDialogueIndex: number;
  spokenToday: boolean;
  dialogueTree: NPCDialogueLine[];
}

export interface NPCDialogueState {
  activeNpcId: string | null;
  currentLineIndex: number;
  isOpen: boolean;
}

// Interactive Objects
export type InteractiveObjectType = 'coffee_machine' | 'whiteboard' | 'server_rack';

export interface InteractiveObjectState {
  id: string;
  type: InteractiveObjectType;
  floorId: FloorId;
  position: [number, number, number];
  label: string;
  hint: string;
  cooldownMs: number;
  lastUsedAt: number | null;
}

// Weather system
export type WeatherType = 'clear' | 'rain' | 'storm';

export interface WeatherState {
  current: WeatherType;
  intensity: number; // 0-1
  nextChangeAt: number; // timestamp
  lightningFlash: boolean;
}

// Ambient sound system
export type AmbientSoundType = 'office_hum' | 'rain' | 'thunder' | 'keyboard' | 'server_fans' | 'elevator_ding';

export interface AmbientSoundState {
  enabled: boolean;
  activeSounds: AmbientSoundType[];
}

// Desk customization (state only — visual integration deferred)
export type DeskDecoration =
  | 'default'
  | 'plant_small'
  | 'action_figure'
  | 'nameplate'
  | 'rgb_strip'
  | 'coffee_mug_gold'
  | 'certificate_frame'
  | 'mini_server';

export interface DeskCustomization {
  decoration: DeskDecoration;
  deskColor: string;   // hex color
  chairColor: string;  // hex color
  monitorCount: 1 | 2 | 3;
}

// Coffee boost effect
export interface CoffeeBoost {
  active: boolean;
  expiresAt: number | null; // timestamp
  timeAddedMinutes: number;
}

// === Sprint 7: Reward Economy and Upgrades ===

// Shop system
export type ShopCategory =
  | 'office-upgrade'
  | 'certification'
  | 'tool'
  | 'consumable'
  | 'cosmetic'
  | 'specialty';

export type ShopItemId = string;

export interface ShopItem {
  id: ShopItemId;
  name: string;
  description: string;
  category: ShopCategory;
  cost: number;
  requiredLevel: number;
  icon: string;
  buff?: BuffEffect;       // Permanent buff when owned
  consumable?: BuffEffect;  // Temporary buff when activated
  maxPurchases: number;     // Max times purchasable (1 for most, >1 for consumables)
  officeUpgrade?: string;   // Office upgrade key for Sprint 8 3D rendering
}

export type BuffType =
  | 'xp_multiplier'
  | 'credit_multiplier'
  | 'reputation_multiplier'
  | 'time_extension'
  | 'hint_discount'
  | 'item_drop_bonus';

export interface BuffEffect {
  type: BuffType;
  value: number;   // Multiplier (e.g. 1.25 = +25%) or flat value
  isFlat: boolean; // true = flat addition, false = multiplier
  duration?: number; // Seconds for consumable buffs; undefined = permanent
}

// Player's owned items and active buffs
export interface PlayerShopState {
  ownedItems: ShopItemId[];       // Set<string> serialized as array
  activeConsumables: ActiveConsumable[];
}

export interface ActiveConsumable {
  itemId: ShopItemId;
  buff: BuffEffect;
  activatedAt: number;   // timestamp
  expiresAt: number;     // timestamp
}

// Prestige system
export interface PrestigeLevel {
  level: number;        // 1-10
  name: string;
  requiredCredits: number;
  multiplier: number;   // Global reward multiplier
  title: string;
  icon: string;
}

export interface PlayerPrestigeState {
  prestigeLevel: number;         // Current prestige (0 = not prestiged)
  prestigeMultiplier: number;    // Current global multiplier
  persistedUpgrades: ShopItemId[]; // Upgrades that survived prestige reset
}

// Daily challenges
export type ChallengeType =
  | 'complete_tickets'
  | 'reach_uptime'
  | 'earn_credits'
  | 'earn_xp'
  | 'buy_items'
  | 'use_hints'
  | 'visit_floors'
  | 'talk_to_npcs'
  | 'fix_incidents'
  | 'complete_category';

export interface DailyChallenge {
  id: string;
  type: ChallengeType;
  description: string;
  target: number;      // How many to complete
  rewardCredits: number;
  rewardXp: number;
  progress: number;    // Current progress
  completed: boolean;
  claimed: boolean;    // Reward claimed?
}

export interface DailyChallengeState {
  date: string;              // UTC date string YYYY-MM-DD
  challenges: DailyChallenge[];
  lastGenerated: number;     // timestamp of last generation
}

// Computed buff state used in reward calculations
export interface ComputedBuffs {
  xpMultiplier: number;
  creditMultiplier: number;
  reputationMultiplier: number;
  timeExtensionMinutes: number;
  hintDiscountPercent: number;
  itemDropBonus: number;
}
