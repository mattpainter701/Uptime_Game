import type { Ticket, TicketCategory, TicketHint, TicketHintEconomy, TicketSla, SlaTier } from '../types/game';
import type { TicketTemplate, TicketTemplateVariables, GenerateTicketRequest } from './ticketTemplates';
import {
  createProceduralTicketGenerator,
  createTicketTemplateCatalogSummary,
  substituteTemplateString,
} from './ticketTemplates';
import { TICKET_TEMPLATES } from './ticketTemplateData';

// =========================================================================
// Default Hint Economy Configuration
// =========================================================================

export const DEFAULT_HINT_ECONOMY: TicketHintEconomy = {
  maxHints: 3,
  baseCost: 15,
  costMultiplier: 1.8,
  freeHintsPerDay: 0,
};

/**
 * Calculate the cost of the nth hint (0-indexed).
 * Hint costs escalate multiplicatively.
 */
export function calculateHintCost(
  hintIndex: number,
  economy: TicketHintEconomy = DEFAULT_HINT_ECONOMY,
): number {
  return Math.round(economy.baseCost * Math.pow(economy.costMultiplier, hintIndex));
}

/**
 * Generate hint array from raw text hints using the hint economy.
 * Templates store hints as flat cost/text; this enriches them with economy-aware costs.
 */
export function generateHintsFromTemplate(
  hintTexts: Omit<TicketHint, 'revealed'>[],
  economy: TicketHintEconomy = DEFAULT_HINT_ECONOMY,
  variables: TicketTemplateVariables = {},
): TicketHint[] {
  return hintTexts.slice(0, economy.maxHints).map((hint, index) => ({
    cost: calculateHintCost(index, economy),
    text: substituteTemplateString(hint.text, variables),
    revealed: false,
  }));
}

// =========================================================================
// SLA Time-Pressure Configuration
// =========================================================================

export const SLA_CONFIGS: Record<SlaTier, TicketSla> = {
  platinum: {
    tier: 'platinum',
    timeLimitMinutes: 20,
    speedBonusThresholdPercent: 40,   // complete in < 40% of time = speed bonus
    speedBonusMultiplier: 2.0,        // 2x credits
    overtimePenaltyPerMinute: 15,     // -15 credits per overtime minute
    reputationBonus: 10,
  },
  gold: {
    tier: 'gold',
    timeLimitMinutes: 18,
    speedBonusThresholdPercent: 50,
    speedBonusMultiplier: 1.5,
    overtimePenaltyPerMinute: 10,
    reputationBonus: 7,
  },
  silver: {
    tier: 'silver',
    timeLimitMinutes: 15,
    speedBonusThresholdPercent: 60,
    speedBonusMultiplier: 1.25,
    overtimePenaltyPerMinute: 7,
    reputationBonus: 5,
  },
  bronze: {
    tier: 'bronze',
    timeLimitMinutes: 12,
    speedBonusThresholdPercent: 70,
    speedBonusMultiplier: 1.1,
    overtimePenaltyPerMinute: 5,
    reputationBonus: 3,
  },
};

/**
 * Map ticket difficulty to SLA tier.
 */
export function getSlaTierForDifficulty(difficulty: Ticket['difficulty']): SlaTier {
  if (difficulty >= 5) return 'platinum';
  if (difficulty === 4) return 'gold';
  if (difficulty === 3) return 'silver';
  return 'bronze';
}

/**
 * Calculate time-pressure rewards/penalties after completing a ticket.
 */
export interface TimePressureResult {
  sla: TicketSla;
  wasOnTime: boolean;
  minutesElapsed: number;
  minutesRemaining: number;
  minutesOvertime: number;
  speedBonus: number;        // multiplier applied to credits (1.0 = no bonus)
  overtimePenalty: number;    // credits deducted
  reputationChange: number;   // + for on-time, - for overtime
}

export function calculateTimePressure(
  difficulty: Ticket['difficulty'],
  startedAt: number,
  completedAt: number,
): TimePressureResult {
  const sla = SLA_CONFIGS[getSlaTierForDifficulty(difficulty)];
  const minutesElapsed = (completedAt - startedAt) / 60000;
  const timeLimit = sla.timeLimitMinutes;
  const wasOnTime = minutesElapsed <= timeLimit;
  const minutesRemaining = Math.max(0, timeLimit - minutesElapsed);
  const minutesOvertime = Math.max(0, minutesElapsed - timeLimit);

  let speedBonus = 1.0;
  if (wasOnTime && minutesElapsed <= timeLimit * (sla.speedBonusThresholdPercent / 100)) {
    speedBonus = sla.speedBonusMultiplier;
  }

  const overtimePenalty = wasOnTime
    ? 0
    : Math.floor(minutesOvertime * sla.overtimePenaltyPerMinute);

  const reputationChange = wasOnTime ? sla.reputationBonus : -Math.max(1, Math.floor(minutesOvertime / 5));

  return {
    sla,
    wasOnTime,
    minutesElapsed,
    minutesRemaining,
    minutesOvertime,
    speedBonus,
    overtimePenalty,
    reputationChange,
  };
}

// =========================================================================
// Procedural Difficulty Scaling
// =========================================================================

/**
 * Difficulty scale factors for reward tuning.
 * Higher difficulty = more credits, XP, and time.
 */
export const DIFFICULTY_SCALES: Record<number, {
  creditMultiplier: number;
  xpMultiplier: number;
  timeMultiplier: number;
}> = {
  1: { creditMultiplier: 1.0, xpMultiplier: 1.0, timeMultiplier: 1.0 },
  2: { creditMultiplier: 1.8, xpMultiplier: 1.6, timeMultiplier: 1.3 },
  3: { creditMultiplier: 3.5, xpMultiplier: 3.0, timeMultiplier: 1.8 },
  4: { creditMultiplier: 5.5, xpMultiplier: 4.5, timeMultiplier: 2.3 },
  5: { creditMultiplier: 8.0, xpMultiplier: 6.5, timeMultiplier: 3.0 },
};

/**
 * Generate procedural variable substitutions based on difficulty.
 * Higher difficulty = more complex scenarios (more devices, larger subnets, etc.)
 */
export function generateDifficultyVariables(
  difficulty: Ticket['difficulty'],
  category: TicketCategory,
  seed?: number,
): TicketTemplateVariables {
  const rng = seed !== undefined ? seededRandom(seed) : Math.random;

  const suffixes = ['A', 'B', 'C', 'D', 'E'];
  const devices = difficulty <= 2
    ? { host: 'PC1' + suffixes[Math.floor(rng() * 2)], switch: 'SW1-' + suffixes[Math.floor(rng() * 2)] }
    : difficulty <= 4
      ? {
          host: 'PC' + (Math.floor(rng() * 3) + 1) + suffixes[Math.floor(rng() * 3)],
          switch: 'SW' + (Math.floor(rng() * 3) + 1) + '-' + suffixes[Math.floor(rng() * 3)],
          routerA: 'R' + (Math.floor(rng() * 3) + 1),
          routerB: 'R' + (Math.floor(rng() * 3) + 4),
        }
      : {
          host: 'PC' + (Math.floor(rng() * 4) + 1) + suffixes[Math.floor(rng() * 4)],
          switch: 'SW' + (Math.floor(rng() * 4) + 1) + '-' + suffixes[Math.floor(rng() * 4)],
          routerA: 'R' + (Math.floor(rng() * 4) + 1),
          routerB: 'R' + (Math.floor(rng() * 4) + 5),
          nexusA: 'N9K-LEAF-' + (Math.floor(rng() * 2) + 1),
          nexusB: 'N9K-LEAF-' + (Math.floor(rng() * 2) + 3),
        };

  return {
    site: ['HQ', 'BRANCH-A', 'DR-SITE', 'COLO'][Math.floor(rng() * 4)],
    segment: ['Sales', 'Engineering', 'HR', 'Finance', 'Ops'][Math.floor(rng() * 5)],
    vlan: 'VLAN ' + ([10, 20, 30, 40, 50, 100][Math.floor(rng() * 6)]),
    vlanId: [10, 20, 30, 40, 50, 100][Math.floor(rng() * 6)],
    subnet: '10.' + (Math.floor(rng() * 254) + 1) + '.' + (Math.floor(rng() * 3) * 64) + '.0',
    gateway: '10.' + (Math.floor(rng() * 254) + 1) + '.' + (Math.floor(rng() * 3) * 64) + '.1',
    dhcpServer: '10.' + (Math.floor(rng() * 254) + 1) + '.0.5',
    ...devices,
    port: 'Gi1/0/' + (Math.floor(rng() * 24) + 1),
    hostname: 'device-' + (Math.floor(rng() * 99) + 1),
  };
}

function seededRandom(seed: number): () => number {
  let s = seed;
  return () => {
    s = (s * 16807 + 0) % 2147483647;
    return (s - 1) / 2147483646;
  };
}

// =========================================================================
// Ticket Engine — Main Public API
// =========================================================================

export interface TicketEngineConfig {
  templates?: TicketTemplate[];
  hintEconomy?: TicketHintEconomy;
  seed?: number;
  random?: () => number;
}

export interface TicketEngine {
  /** Generate a ticket from the template catalog */
  generateTicket: (request?: GenerateTicketRequest) => Ticket;
  /** Get a summary of available templates */
  getCatalogSummary: () => ReturnType<typeof createTicketTemplateCatalogSummary>;
  /** Calculate time-pressure rewards after completion */
  calculateTimePressure: (ticket: Ticket, completedAt: number) => TimePressureResult;
  /** Get hint cost for the nth hint */
  getHintCost: (hintIndex: number) => number;
  /** Get all categories */
  getCategories: () => TicketCategory[];
  /** Get SLA config for a given difficulty */
  getSla: (difficulty: Ticket['difficulty']) => TicketSla;
}

export function createTicketEngine(config: TicketEngineConfig = {}): TicketEngine {
  const templates = config.templates ?? TICKET_TEMPLATES;
  const hintEconomy = config.hintEconomy ?? DEFAULT_HINT_ECONOMY;
  const rng = config.random ?? (config.seed !== undefined ? seededRandom(config.seed) : Math.random);

  const generator = createProceduralTicketGenerator({
    templates,
    random: rng,
  });

  function generateTicket(request: GenerateTicketRequest = {}): Ticket {
    // Generate procedural variables if none provided
    const difficulty = request.difficulty ?? (Math.floor(rng() * 3) + 1) as Ticket['difficulty'];
    const category = request.category ?? getRandomCategory(rng);
    const variables = request.variables ?? generateDifficultyVariables(difficulty, category);

    return generator.generateTicket({ category, difficulty, variables });
  }

  function getCatalogSummary() {
    return createTicketTemplateCatalogSummary(templates);
  }

  return {
    generateTicket,
    getCatalogSummary,
    calculateTimePressure: (ticket, completedAt) => {
      if (!ticket.startedAt) {
        return {
          sla: SLA_CONFIGS[getSlaTierForDifficulty(ticket.difficulty)],
          wasOnTime: true,
          minutesElapsed: 0,
          minutesRemaining: ticket.timeLimit,
          minutesOvertime: 0,
          speedBonus: 1.0,
          overtimePenalty: 0,
          reputationChange: 0,
        };
      }
      return calculateTimePressure(ticket.difficulty, ticket.startedAt, completedAt);
    },
    getHintCost: (hintIndex) => calculateHintCost(hintIndex, hintEconomy),
    getCategories: () => templates.reduce<TicketCategory[]>((cats, t) => {
      if (!cats.includes(t.category)) cats.push(t.category);
      return cats;
    }, []),
    getSla: (difficulty) => SLA_CONFIGS[getSlaTierForDifficulty(difficulty)],
  };
}

function getRandomCategory(rng: () => number): TicketCategory {
  const categories = TICKET_TEMPLATES.reduce<TicketCategory[]>((cats, t) => {
    if (!cats.includes(t.category)) cats.push(t.category);
    return cats;
  }, []);
  return categories[Math.floor(rng() * categories.length)];
}

// =========================================================================
// Singleton engine instance (for convenience)
// =========================================================================

let _defaultEngine: TicketEngine | null = null;

export function getTicketEngine(): TicketEngine {
  if (!_defaultEngine) {
    _defaultEngine = createTicketEngine();
  }
  return _defaultEngine;
}

export function resetTicketEngine(): void {
  _defaultEngine = null;
}
