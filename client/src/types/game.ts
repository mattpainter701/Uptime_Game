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

// Career progression
export const CAREER_LEVELS = [
  { level: 1, title: 'Help Desk Tech', floor: 5, xpRequired: 0 },
  { level: 2, title: 'Junior NetAdmin', floor: 10, xpRequired: 500 },
  { level: 3, title: 'Network Admin', floor: 15, xpRequired: 1500 },
  { level: 4, title: 'Senior NetAdmin', floor: 25, xpRequired: 3500 },
  { level: 5, title: 'Network Engineer', floor: 35, xpRequired: 7000 },
  { level: 6, title: 'Senior Engineer', floor: 40, xpRequired: 12000 },
  { level: 7, title: 'Principal Engineer', floor: 45, xpRequired: 20000 },
  { level: 8, title: 'CTO', floor: 50, xpRequired: 35000 },
] as const;
