// Sprint 7: Daily Challenges — Seeded RNG, 10 challenge types, 3 per day
import type { DailyChallenge, ChallengeType, DailyChallengeState } from '../types/game';

const CHALLENGE_TEMPLATES: { type: ChallengeType; descriptionTemplate: (target: number) => string; targetRange: [number, number]; rewardCreditRange: [number, number]; rewardXpRange: [number, number] }[] = [
  {
    type: 'complete_tickets',
    descriptionTemplate: (t) => `Complete ${t} ticket${t > 1 ? 's' : ''}`,
    targetRange: [1, 5],
    rewardCreditRange: [100, 500],
    rewardXpRange: [50, 250],
  },
  {
    type: 'reach_uptime',
    descriptionTemplate: (t) => `Maintain ${t}% uptime across all nodes`,
    targetRange: [90, 100],
    rewardCreditRange: [150, 600],
    rewardXpRange: [75, 300],
  },
  {
    type: 'earn_credits',
    descriptionTemplate: (t) => `Earn ${t} credits from tickets`,
    targetRange: [200, 2000],
    rewardCreditRange: [100, 400],
    rewardXpRange: [50, 200],
  },
  {
    type: 'earn_xp',
    descriptionTemplate: (t) => `Earn ${t} XP from tickets`,
    targetRange: [100, 1000],
    rewardCreditRange: [100, 500],
    rewardXpRange: [75, 250],
  },
  {
    type: 'buy_items',
    descriptionTemplate: (t) => `Purchase ${t} item${t > 1 ? 's' : ''} from the shop`,
    targetRange: [1, 3],
    rewardCreditRange: [50, 300],
    rewardXpRange: [25, 150],
  },
  {
    type: 'use_hints',
    descriptionTemplate: (t) => `Use ${t} hint${t > 1 ? 's' : ''} on tickets`,
    targetRange: [1, 5],
    rewardCreditRange: [50, 200],
    rewardXpRange: [25, 100],
  },
  {
    type: 'visit_floors',
    descriptionTemplate: (t) => `Visit ${t} different floor${t > 1 ? 's' : ''}`,
    targetRange: [2, 5],
    rewardCreditRange: [75, 300],
    rewardXpRange: [40, 150],
  },
  {
    type: 'talk_to_npcs',
    descriptionTemplate: (t) => `Talk to ${t} NPC${t > 1 ? 's' : ''}`,
    targetRange: [1, 3],
    rewardCreditRange: [50, 200],
    rewardXpRange: [25, 100],
  },
  {
    type: 'fix_incidents',
    descriptionTemplate: (t) => `Resolve ${t} network incident${t > 1 ? 's' : ''}`,
    targetRange: [1, 3],
    rewardCreditRange: [200, 600],
    rewardXpRange: [100, 300],
  },
  {
    type: 'complete_category',
    descriptionTemplate: (t) => `Complete ${t} ticket${t > 1 ? 's' : ''} in a single category`,
    targetRange: [1, 3],
    rewardCreditRange: [150, 450],
    rewardXpRange: [75, 225],
  },
];

// Seeded PRNG (mulberry32)
function mulberry32(seed: number): () => number {
  return () => {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function getDateSeed(): number {
  const now = new Date();
  const dateStr = `${now.getUTCFullYear()}-${String(now.getUTCMonth() + 1).padStart(2, '0')}-${String(now.getUTCDate()).padStart(2, '0')}`;
  let hash = 0;
  for (let i = 0; i < dateStr.length; i++) {
    hash = ((hash << 5) - hash) + dateStr.charCodeAt(i);
    hash |= 0;
  }
  return hash;
}

function shuffle<T>(arr: T[], rng: () => number): T[] {
  const result = [...arr];
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}

export function generateDailyChallenges(): DailyChallengeState {
  const seed = getDateSeed();
  const rng = mulberry32(seed);
  const dateStr = new Date().toISOString().split('T')[0];

  const shuffled = shuffle(CHALLENGE_TEMPLATES, rng);
  const selected = shuffled.slice(0, 3);

  const challenges: DailyChallenge[] = selected.map((tmpl, i) => {
    const [tMin, tMax] = tmpl.targetRange;
    const [cMin, cMax] = tmpl.rewardCreditRange;
    const [xMin, xMax] = tmpl.rewardXpRange;
    const target = Math.floor(rng() * (tMax - tMin + 1)) + tMin;
    const rewardCredits = Math.floor(rng() * (cMax - cMin + 1)) + cMin;
    const rewardXp = Math.floor(rng() * (xMax - xMin + 1)) + xMin;

    return {
      id: `dc-${dateStr}-${i}`,
      type: tmpl.type,
      description: tmpl.descriptionTemplate(target),
      target,
      rewardCredits,
      rewardXp,
      progress: 0,
      completed: false,
      claimed: false,
    };
  });

  return {
    date: dateStr,
    challenges,
    lastGenerated: Date.now(),
  };
}

export function getOrGenerateChallenges(current: DailyChallengeState | null): DailyChallengeState {
  const todayStr = new Date().toISOString().split('T')[0];

  if (current && current.date === todayStr && current.challenges.length === 3) {
    return current;
  }

  return generateDailyChallenges();
}
