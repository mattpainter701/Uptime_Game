import type { StoryArc } from '../types/game';

export const STORY_ARCS: StoryArc[] = [
  {
    id: 'first-day',
    title: 'First Day on the Job',
    description:
      'Your first day at NetOps Tower. Dana from reception will walk you through the basics.',
    ticketIds: ['NET-001', 'NET-003', 'NET-002'],
    requiredLevel: 1,
    reward: { credits: 300, xp: 150, reputation: 10 },
  },
  {
    id: 'great-outage',
    title: 'The Great Outage',
    description:
      'A cascading failure is spreading through the network. Marcus needs your help to track it down floor by floor.',
    ticketIds: ['NET-015', 'NET-018', 'NET-042', 'NET-078', 'NET-063'],
    prerequisiteArcId: 'first-day',
    requiredLevel: 2,
    reward: { credits: 1000, xp: 500, reputation: 25 },
  },
  {
    id: 'security-audit',
    title: 'Security Audit',
    description:
      'Chen has flagged critical security issues across the building. The auditors arrive Friday.',
    ticketIds: ['NET-092', 'SEC-002', 'SEC-003', 'SEC-004'],
    prerequisiteArcId: 'first-day',
    requiredLevel: 3,
    reward: { credits: 800, xp: 400, reputation: 20 },
  },
  {
    id: 'datacenter-migration',
    title: 'Datacenter Migration',
    description:
      'Alex needs help preparing the datacenter for a major hardware refresh. Servers are failing left and right.',
    ticketIds: ['SYS-001', 'SYS-002', 'SYS-003', 'SYS-004'],
    prerequisiteArcId: 'first-day',
    requiredLevel: 3,
    reward: { credits: 900, xp: 450, reputation: 20 },
  },
  {
    id: 'automate-everything',
    title: 'Automate Everything',
    description:
      'Priya has been pushing for automation. Time to script your way out of repetitive tasks.',
    ticketIds: ['AUTO-001', 'AUTO-002', 'AUTO-003'],
    prerequisiteArcId: 'great-outage',
    requiredLevel: 4,
    reward: { credits: 700, xp: 350, reputation: 15 },
  },
];
