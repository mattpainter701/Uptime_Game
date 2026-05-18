import type { Ticket, TutorialStepConfig } from '../types/game';

// ============================================================
// 5 Guided Tutorial Tickets — teach core mechanics step by step
// ============================================================

export const TUTORIAL_TICKETS: Ticket[] = [
  {
    id: 'TUT-001',
    title: 'Your First Ticket: Check Connectivity',
    description:
      'Welcome to NetOps Tower! Your first task is simple: verify that PC1 can reach the gateway at 10.0.0.1.\n\n' +
      '1. Open the terminal by clicking the desk monitor\n' +
      '2. Type: ping 10.0.0.1\n' +
      '3. Check that all 5 packets come back successfully\n' +
      '4. Click the Validate button when you are done',
    category: 'network-basics',
    difficulty: 1,
    timeLimit: 15,
    rewardCredits: 50,
    rewardXp: 25,
    labTemplate: 'tutorial_connectivity',
    hints: [
      { cost: 0, text: 'Just type "ping 10.0.0.1" in the terminal — no config needed!', revealed: false },
      { cost: 0, text: 'Look for "5 packets transmitted, 5 received" — that means success.', revealed: false },
    ],
    validation: [
      { type: 'ping', params: { source: 'PC1', destination: '10.0.0.1', successRate: 100 } },
    ],
    status: 'available',
    requiredItems: ['laptop'],
  },
  {
    id: 'TUT-002',
    title: 'Configure a VLAN',
    description:
      'A new engineer was added to VLAN 20 (Engineering) but their port Gi0/5 is stuck in VLAN 1.\n\n' +
      '1. Connect to switch SW1 via terminal\n' +
      '2. Enter configuration mode: configure terminal\n' +
      '3. Select the interface: interface Gi0/5\n' +
      '4. Set it as an access port in VLAN 20:\n' +
      '   switchport mode access\n' +
      '   switchport access vlan 20\n' +
      '5. Verify with: show vlan brief\n' +
      '6. Click Validate',
    category: 'switching',
    difficulty: 1,
    timeLimit: 15,
    rewardCredits: 75,
    rewardXp: 40,
    labTemplate: 'tutorial_vlan',
    hints: [
      { cost: 0, text: 'Start with "configure terminal" to enter config mode on SW1.', revealed: false },
      { cost: 0, text: 'After interface Gi0/5, use "switchport mode access" then "switchport access vlan 20".', revealed: false },
    ],
    validation: [
      { type: 'command', params: { node: 'SW1', command: 'show vlan brief', contains: ['Gi0/5', '20'] } },
    ],
    status: 'available',
    requiredItems: ['laptop', 'console-cable'],
  },
  {
    id: 'TUT-003',
    title: 'Fix a Routing Issue',
    description:
      'Branch router R1 lost its default route. Traffic to the internet is being dropped.\n\n' +
      '1. Connect to R1 via terminal\n' +
      '2. Check the routing table: show ip route\n' +
      '3. Notice there is no default route (0.0.0.0/0)\n' +
      '4. Add the default route in config mode:\n' +
      '   configure terminal\n' +
      '   ip route 0.0.0.0 0.0.0.0 203.0.113.1\n' +
      '5. Verify: show ip route (you should see the default route)\n' +
      '6. Click Validate',
    category: 'routing',
    difficulty: 1,
    timeLimit: 15,
    rewardCredits: 75,
    rewardXp: 40,
    labTemplate: 'tutorial_routing',
    hints: [
      { cost: 0, text: 'Use "show ip route" first to confirm the default route is missing.', revealed: false },
      { cost: 0, text: 'The static route command is: ip route 0.0.0.0 0.0.0.0 203.0.113.1', revealed: false },
    ],
    validation: [
      { type: 'command', params: { node: 'R1', command: 'show ip route', contains: ['0.0.0.0/0', '203.0.113.1'] } },
    ],
    status: 'available',
    requiredItems: ['laptop', 'console-cable'],
  },
  {
    id: 'TUT-004',
    title: 'Use the Lab Equipment',
    description:
      'Now you will learn about the lab environment. A lab has been set up with PC1, SW1, and R1.\n\n' +
      '1. Look at the lab topology (shown in the ticket panel)\n' +
      '2. Connect to PC1 via terminal\n' +
      '3. Check connectivity: ping 10.0.0.1\n' +
      '4. Connect to SW1: check VLAN status with "show vlan brief"\n' +
      '5. Connect to R1: check routing with "show ip route"\n' +
      '6. Make sure all nodes are responsive, then Validate',
    category: 'network-basics',
    difficulty: 2,
    timeLimit: 20,
    rewardCredits: 100,
    rewardXp: 50,
    labTemplate: 'tutorial_lab',
    hints: [
      { cost: 0, text: 'Use the node selector in the terminal to switch between PC1, SW1, and R1.', revealed: false },
      { cost: 0, text: 'Ping tests from PC1 will verify connectivity. Each node has different show commands.', revealed: false },
    ],
    validation: [
      { type: 'ping', params: { source: 'PC1', destination: '10.0.0.1', successRate: 100 } },
      { type: 'command', params: { node: 'SW1', command: 'show vlan brief', contains: ['1'] } },
      { type: 'command', params: { node: 'R1', command: 'show ip route', contains: ['0.0.0.0'] } },
    ],
    status: 'available',
    requiredItems: ['laptop', 'console-cable'],
  },
  {
    id: 'TUT-005',
    title: 'Your First Real Challenge',
    description:
      'This ticket is closer to what real tickets feel like. PC2 on VLAN 30 cannot reach the file server at 10.30.0.100.\n\n' +
      'Investigate and fix the issue. Here are some things to check:\n' +
      '- Is PC2 on the correct VLAN?\n' +
      '- Is the VLAN interface configured on the switch?\n' +
      '- Is routing enabled between VLANs?\n\n' +
      'No step-by-step instructions — use what you have learned! Need a hint? Click the hint button.',
    category: 'switching',
    difficulty: 2,
    timeLimit: 20,
    rewardCredits: 200,
    rewardXp: 100,
    labTemplate: 'tutorial_challenge',
    hints: [
      { cost: 0, text: 'Start by checking PC2 connectivity: ping 10.30.0.1 from PC2.', revealed: false },
      { cost: 0, text: 'Check SW1: "show vlan brief" to see if VLAN 30 exists and which ports are in it.', revealed: false },
      { cost: 0, text: 'If VLAN 30 is missing, create it: "vlan 30", assign port Gi0/10 to it as access port.', revealed: false },
    ],
    validation: [
      { type: 'ping', params: { source: 'PC2', destination: '10.30.0.100', successRate: 100 } },
    ],
    status: 'available',
    requiredItems: ['laptop', 'console-cable'],
  },
];

// ============================================================
// Step-by-step overlay configurations
// ============================================================

export const TUTORIAL_STEP_CONFIGS: TutorialStepConfig[] = [
  {
    step: 'welcome',
    title: 'Welcome to NetOps Tower! 🏢',
    body:
      "You are a new network engineer at NetOps Tower — a skyscraper where every floor is a different network domain.\n\n" +
      "Your job: take support tickets, fix network issues, and climb the career ladder.\n\n" +
      "This tutorial will guide you through your first 5 tickets. You will learn:\n" +
      "  🔌 How to accept tickets and open the terminal\n" +
      "  ⚙️ How to configure switches and routers\n" +
      "  📊 How to validate your fixes\n" +
      "  🧪 How to use the lab environment\n\n" +
      "Ready? Let's fix some networks!",
    highlights: [],
  },
  {
    step: 'ticket1',
    title: 'Ticket 1: Check Connectivity',
    body:
      "Your first ticket is in the Ticket Panel (press T or click Tickets in the HUD).\n\n" +
      "This ticket asks you to verify PC1 can reach the gateway.\n\n" +
      "👉 Open the Ticket Panel, find \"Your First Ticket: Check Connectivity\", and click Accept.\n\n" +
      "Pro tip: Look for the pulsing cyan border on the Tickets button!",
    highlights: [
      { selector: '[data-tutorial="tickets-button"]', message: 'Click here to open the Ticket Panel', pulseColor: 'cyan' },
    ],
    hint: 'Press the "T" key or click the Tickets button in the top HUD bar.',
    targetTicketId: 'TUT-001',
  },
  {
    step: 'ticket2',
    title: 'Ticket 2: Configure a VLAN',
    body:
      "Great job! Now you will learn to configure a switch.\n\n" +
      "In this ticket, you will:\n" +
      "  • Enter configuration mode on a Cisco switch\n" +
      "  • Assign a port to VLAN 20\n" +
      "  • Verify your changes with show commands\n\n" +
      "👉 Accept the \"Configure a VLAN\" ticket to continue.\n\n" +
      "Remember: switch config requires \"configure terminal\" first!",
    highlights: [
      { selector: '[data-tutorial="tickets-button"]', message: 'Accept the VLAN ticket here', pulseColor: 'cyan' },
    ],
    hint: 'Enter config mode with "configure terminal", then "interface Gi0/5" to select the port.',
    targetTicketId: 'TUT-002',
  },
  {
    step: 'ticket3',
    title: 'Ticket 3: Fix a Routing Issue',
    body:
      "Now let's tackle routing — one of the most important networking skills.\n\n" +
      "This ticket has you:\n" +
      "  • Diagnose a missing default route\n" +
      "  • Add a static route to restore internet access\n" +
      "  • Verify with show commands\n\n" +
      "👉 Accept the \"Fix a Routing Issue\" ticket.\n\n" +
      "Tip: Use \"show ip route\" to see what routes exist, then add the missing one in config mode.",
    highlights: [],
    hint: 'The default route command is: ip route 0.0.0.0 0.0.0.0 203.0.113.1',
    targetTicketId: 'TUT-003',
  },
  {
    step: 'ticket4',
    title: 'Ticket 4: Explore the Lab',
    body:
      "Time to use the lab environment! Labs let you work across multiple network devices.\n\n" +
      "In this ticket you will:\n" +
      "  • Switch between nodes (PC1, SW1, R1) in the terminal\n" +
      "  • Run different commands on each device\n" +
      "  • Verify end-to-end connectivity\n\n" +
      "👉 Accept the \"Use the Lab Equipment\" ticket.",
    highlights: [
      { selector: '[data-tutorial="node-selector"]', message: 'Switch between lab nodes here', pulseColor: 'green' },
    ],
    hint: 'Use the node selector dropdown in the terminal to connect to different devices.',
    targetTicketId: 'TUT-004',
  },
  {
    step: 'ticket5',
    title: 'Ticket 5: Your First Real Challenge',
    body:
      "You have learned the basics. Now it is time for a real ticket — no step-by-step instructions!\n\n" +
      "PC2 on VLAN 30 cannot reach the file server. You will need to:\n" +
      "  • Diagnose the problem (is it VLAN config? Routing?)\n" +
      "  • Apply the fix yourself\n" +
      "  • Validate when done\n\n" +
      "👉 Accept the \"Your First Real Challenge\" ticket.\n\n" +
      "Stuck? Use the hint button (💡) — hints are free during the tutorial!",
    highlights: [],
    hint: 'Check "show vlan brief" on SW1. Is VLAN 30 in the database? Is Gi0/10 assigned to it?',
    targetTicketId: 'TUT-005',
  },
  {
    step: 'graduation',
    title: '🎓 Tutorial Complete!',
    body:
      "Congratulations, engineer! You have completed all 5 tutorial tickets.\n\n" +
      "You now know how to:\n" +
      "  ✅ Accept and work on tickets\n" +
      "  ✅ Use the terminal to configure devices\n" +
      "  ✅ Diagnose and fix network issues\n" +
      "  ✅ Navigate the lab environment\n\n" +
      "Bonus Reward: +100 credits for completing the tutorial!\n\n" +
      "All standard tickets are now unlocked. The tower is yours — good luck climbing to the top floor!",
    highlights: [],
  },
];

/** Map tutorial step to its ticket id */
export function getTutorialTicketId(step: string): string | undefined {
  const config = TUTORIAL_STEP_CONFIGS.find((c) => c.step === step);
  return config?.targetTicketId;
}

/** Get the step config for a given step */
export function getTutorialStepConfig(step: string): TutorialStepConfig | undefined {
  return TUTORIAL_STEP_CONFIGS.find((c) => c.step === step);
}
