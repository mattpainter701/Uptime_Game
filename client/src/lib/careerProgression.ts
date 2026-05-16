export type CareerUnlockId =
  | 'basic-tickets'
  | 'single-device-labs'
  | 'switching-tickets'
  | 'serial-console'
  | 'routing-tickets'
  | 'ssh-access'
  | 'security-firewall-tickets'
  | 'config-diff-tool'
  | 'multi-device-tickets'
  | 'packet-capture-tool'
  | 'architecture-tickets'
  | 'automation-scripts'
  | 'multi-vendor-tickets'
  | 'custom-tool-presets'
  | 'all-career-features'
  | 'architect-tickets';

export interface CareerUnlock {
  id: CareerUnlockId;
  name: string;
  description: string;
}

export interface CareerLevelDefinition {
  level: 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8;
  title: string;
  floor: number;
  xpRequired: number;
  unlocks: readonly CareerUnlock[];
}

export const CAREER_LEVELS = [
  {
    level: 1,
    title: 'Help Desk Tech',
    floor: 5,
    xpRequired: 0,
    unlocks: [
      { id: 'basic-tickets', name: 'Basic tickets', description: 'Access to entry-level troubleshooting tickets.' },
      { id: 'single-device-labs', name: 'Single-device labs', description: 'Work on one-device scenarios while learning the core loop.' },
    ],
  },
  {
    level: 2,
    title: 'Junior NetAdmin',
    floor: 10,
    xpRequired: 500,
    unlocks: [
      { id: 'switching-tickets', name: 'Switching tickets', description: 'Unlock VLAN, trunk, and access-port troubleshooting.' },
      { id: 'serial-console', name: 'Serial console access', description: 'Use serial access for direct device recovery.' },
    ],
  },
  {
    level: 3,
    title: 'Network Admin',
    floor: 15,
    xpRequired: 1500,
    unlocks: [
      { id: 'routing-tickets', name: 'Routing tickets', description: 'Tackle OSPF, BGP, and WAN path issues.' },
      { id: 'ssh-access', name: 'SSH access', description: 'Manage devices through remote secure shell sessions.' },
    ],
  },
  {
    level: 4,
    title: 'Senior NetAdmin',
    floor: 25,
    xpRequired: 3500,
    unlocks: [
      { id: 'security-firewall-tickets', name: 'Security and firewall tickets', description: 'Handle ACLs, policy, and perimeter troubleshooting.' },
      { id: 'config-diff-tool', name: 'Config diff tool', description: 'Compare running configs to spot changes faster.' },
    ],
  },
  {
    level: 5,
    title: 'Network Engineer',
    floor: 35,
    xpRequired: 7000,
    unlocks: [
      { id: 'multi-device-tickets', name: 'Multi-device tickets', description: 'Solve incidents that span multiple interconnected devices.' },
      { id: 'packet-capture-tool', name: 'Packet capture tool', description: 'Inspect traffic flows when logs are not enough.' },
    ],
  },
  {
    level: 6,
    title: 'Senior Engineer',
    floor: 40,
    xpRequired: 12000,
    unlocks: [
      { id: 'architecture-tickets', name: 'Architecture tickets', description: 'Work on design-level problems and larger migrations.' },
      { id: 'automation-scripts', name: 'Automation scripts', description: 'Use repeatable scripts for higher-impact remediation.' },
    ],
  },
  {
    level: 7,
    title: 'Principal Engineer',
    floor: 45,
    xpRequired: 20000,
    unlocks: [
      { id: 'multi-vendor-tickets', name: 'Multi-vendor tickets', description: 'Handle environments that mix vendor ecosystems.' },
      { id: 'custom-tool-presets', name: 'Custom tool presets', description: 'Save preferred workflows for advanced problem solving.' },
    ],
  },
  {
    level: 8,
    title: 'CTO',
    floor: 50,
    xpRequired: 35000,
    unlocks: [
      { id: 'all-career-features', name: 'All gameplay unlocked', description: 'Every level-gated feature is available.' },
      { id: 'architect-tickets', name: 'Special architect tickets', description: 'Take on high-level architect and strategy scenarios.' },
    ],
  },
] as const satisfies readonly CareerLevelDefinition[];

const CAREER_LEVEL_BY_LEVEL = new Map(CAREER_LEVELS.map((definition) => [definition.level, definition] as const));

export function getCareerProgression(level: number): CareerLevelDefinition | undefined {
  return CAREER_LEVEL_BY_LEVEL.get(level as CareerLevelDefinition['level']);
}

export function getCareerLevelFromXp(xp: number): CareerLevelDefinition {
  for (let i = CAREER_LEVELS.length - 1; i >= 0; i--) {
    if (xp >= CAREER_LEVELS[i].xpRequired) {
      return CAREER_LEVELS[i];
    }
  }

  return CAREER_LEVELS[0];
}

export function getXpToNextCareerLevel(xp: number): number {
  for (let i = CAREER_LEVELS.length - 1; i >= 0; i--) {
    if (xp >= CAREER_LEVELS[i].xpRequired) {
      if (i === CAREER_LEVELS.length - 1) {
        return 0;
      }

      return CAREER_LEVELS[i + 1].xpRequired - xp;
    }
  }

  return CAREER_LEVELS[1].xpRequired;
}

export function getCareerUnlocksThroughLevel(level: number): CareerUnlock[] {
  const unlocks: CareerUnlock[] = [];

  for (const progression of CAREER_LEVELS) {
    if (progression.level > level) {
      break;
    }

    for (const unlock of progression.unlocks) {
      if (!unlocks.some((existing) => existing.id === unlock.id)) {
        unlocks.push(unlock);
      }
    }
  }

  return unlocks;
}