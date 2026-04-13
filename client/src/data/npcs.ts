import type { NPC } from '../types/game';

export const NPCS: NPC[] = [
  {
    id: 'dana',
    name: 'Dana',
    role: 'Receptionist',
    floor: 'lobby',
    position: { x: 0, y: 0, z: -3.5 },
    color: '#e74c3c',
    dialogueTree: [
      {
        id: 'greeting',
        speaker: 'Dana',
        text: "Hey there! You must be the new hire. Welcome to NetOps Tower! I'm Dana — I keep the front desk running and make sure nobody gets lost. Which happens more often than you'd think in a five-story building full of cables.",
        responses: [
          { text: "Thanks! I'm excited to get started.", nextId: 'excited' },
          { text: 'This place is bigger than I expected.', nextId: 'building-info' },
          { text: "I'll just look around on my own.", nextId: null },
        ],
      },
      {
        id: 'excited',
        speaker: 'Dana',
        text: "That's what I like to hear! We've actually got a few tickets that need attention — simple stuff, perfect for getting your feet wet. Patch a cable here, check a DNS config there. Nothing that'll blow up the building. Probably.",
        responses: [
          { text: "I'm ready. What do I need to do?", nextId: 'offer-arc' },
          { text: 'Tell me more about the building first.', nextId: 'building-info' },
        ],
      },
      {
        id: 'building-info',
        speaker: 'Dana',
        text: "So, the basement is where your office is — cozy little setup down there with a terminal and a whiteboard. This floor is the lobby, obviously. Upstairs you've got the cubicle farm on Floor 1 where Marcus runs networking, Floor 2 is the senior engineering bullpen where Priya holds court, and Floor 3 is the datacenter — Alex's domain. Use the elevator to get around.",
        responses: [
          { text: 'Got it. Any work I can start on?', nextId: 'offer-arc' },
          { text: 'Who should I talk to first?', nextId: 'who-first' },
          { text: 'Thanks for the tour. See you around.', nextId: null },
        ],
      },
      {
        id: 'who-first',
        speaker: 'Dana',
        text: "Honestly? Start with me. I've got a short onboarding checklist — three tickets that'll teach you the ropes. After that, Marcus on Floor 1 usually has networking fires that need putting out. And keep an eye on Chen over there by the security desk — he doesn't bite, but he does audit.",
        responses: [
          { text: "Let's do the onboarding checklist.", nextId: 'offer-arc' },
          { text: "I'll go explore first.", nextId: null },
        ],
      },
      {
        id: 'offer-arc',
        speaker: 'Dana',
        text: "Alright, I'm assigning you three starter tickets. First one is a basic connectivity issue — someone on Floor 1 can't reach the intranet. Second is a DNS lookup that's acting weird. Third is a cable that needs patching in the network closet. Nothing fancy, but it'll get you in the system. Sound good?",
        responses: [
          {
            text: "Let's do it. Assign me those tickets.",
            nextId: 'accepted',
            action: 'accept-arc',
            actionParam: 'first-day',
          },
          { text: 'I need a minute. I\'ll come back.', nextId: null },
        ],
      },
      {
        id: 'accepted',
        speaker: 'Dana',
        text: "Done! Check your ticket queue — you'll see them in there. Head to the basement terminal to pull up the details and start working through them. And hey — if you get stuck, talk to the people on each floor. Everyone here knows something useful. Good luck, new kid!",
        responses: [
          { text: 'Thanks, Dana!', nextId: null },
        ],
      },
    ],
  },
  {
    id: 'marcus',
    name: 'Marcus',
    role: 'Network Admin',
    floor: 'floor1',
    position: { x: -6, y: 0, z: 2 },
    color: '#3498db',
    dialogueTree: [
      {
        id: 'greeting',
        speaker: 'Marcus',
        text: "Oh good, fresh blood. I'm Marcus — I keep the network from catching fire. Metaphorically. Usually. Look, I'll be straight with you: we've got problems. Latency spikes, dropped packets, switches that reboot themselves at 3 AM. This cubicle floor is ground zero for complaints.",
        responses: [
          { text: 'That sounds rough. What happened?', nextId: 'outage-info' },
          { text: 'Anything I can help with?', nextId: 'offer-arc' },
          { text: "I'm just passing through.", nextId: null },
        ],
      },
      {
        id: 'outage-info',
        speaker: 'Marcus',
        text: "Best I can tell, it started with a misconfigured VLAN on Floor 1 that cascaded upward. By the time I noticed, half the switches were in a spanning-tree loop and the other half were just... confused. I've been putting out fires for two days straight. My coffee is cold and my patience is colder.",
        responses: [
          { text: 'I can help track it down.', nextId: 'offer-arc' },
          { text: 'Have you tried turning it off and on again?', nextId: 'joke' },
        ],
      },
      {
        id: 'joke',
        speaker: 'Marcus',
        text: "...Yeah. Twice. The third time I almost threw a switch out the window. Look, I could actually use a hand. This is a multi-floor problem and I can't be everywhere at once.",
        responses: [
          { text: "Alright, let's fix this.", nextId: 'offer-arc' },
          { text: 'Maybe later.', nextId: null },
        ],
      },
      {
        id: 'offer-arc',
        speaker: 'Marcus',
        text: "Here's the deal: I've got five tickets that trace the outage from its source to the affected floors. Misrouted VLANs, a bad trunk port, a rogue DHCP server — the whole nightmare. Work through them in order and we might actually get this network stable again. You in?",
        responses: [
          {
            text: "Assign them to me. Let's kill this outage.",
            nextId: 'accepted',
            action: 'accept-arc',
            actionParam: 'great-outage',
          },
          { text: "I need to finish some other stuff first.", nextId: null },
        ],
      },
      {
        id: 'accepted',
        speaker: 'Marcus',
        text: "You're a lifesaver. I've pushed the tickets to your queue. Start with NET-015 — that's the VLAN misconfig I think kicked everything off. Work your way through and check back if you hit a wall. And hey — the network closets on each floor have console access to the switches. Use them.",
        responses: [
          { text: "On it. I'll report back.", nextId: null },
        ],
      },
    ],
  },
  {
    id: 'priya',
    name: 'Priya',
    role: 'Senior Engineer',
    floor: 'floor2',
    position: { x: -6, y: 0, z: 2 },
    color: '#2ecc71',
    dialogueTree: [
      {
        id: 'greeting',
        speaker: 'Priya',
        text: "Ah, you're the new tech everyone's talking about. I'm Priya. I've been here four years and I've watched this team do the same manual tasks over and over like it's 2005. Honestly, it drives me a little crazy. We should be automating half of what we do.",
        responses: [
          { text: 'What kind of things could be automated?', nextId: 'automation-info' },
          { text: 'Do you have work that needs doing?', nextId: 'offer-arc' },
          { text: 'Nice to meet you. Just exploring.', nextId: null },
        ],
      },
      {
        id: 'automation-info',
        speaker: 'Priya',
        text: "Where do I start? Config backups run manually. Health checks happen when someone remembers. Ticket routing is basically whoever yells loudest. I've been prototyping some scripts, but I need someone to actually implement them across the infrastructure. Someone who isn't buried in legacy tickets like the rest of us.",
        responses: [
          { text: "That someone could be me.", nextId: 'offer-arc' },
          { text: "Sounds like a big project. I'll think about it.", nextId: null },
        ],
      },
      {
        id: 'offer-arc',
        speaker: 'Priya',
        text: "I've scoped out three automation tasks that would save this team hours every week. First: automated config backups for the switches. Second: a health-check script that pings every critical node and alerts on failures. Third: a provisioning script for new network segments. It's not glamorous, but it'll make you a hero around here.",
        responses: [
          {
            text: "I love automating things. Sign me up.",
            nextId: 'accepted',
            action: 'accept-arc',
            actionParam: 'automate-everything',
          },
          { text: "I'll come back when I'm ready for this.", nextId: null },
        ],
      },
      {
        id: 'accepted',
        speaker: 'Priya',
        text: "Excellent. I've added the tickets to your queue with detailed specs. Fair warning — you'll need to be comfortable with the terminal and have some experience under your belt before tackling these. This isn't beginner stuff. But I think you can handle it. Prove me right.",
        responses: [
          { text: 'Challenge accepted.', nextId: null },
        ],
      },
    ],
  },
  {
    id: 'chen',
    name: 'Chen',
    role: 'Security Officer',
    floor: 'lobby',
    position: { x: -4.85, y: 0, z: -2 },
    color: '#f39c12',
    dialogueTree: [
      {
        id: 'greeting',
        speaker: 'Chen',
        text: "Stop. Badge? ...Right, new hire. I'm Chen, head of security for the building. And before you ask — no, that doesn't just mean I watch cameras. Network security, physical access, compliance audits. If it can be breached, it's my problem.",
        responses: [
          { text: 'Are there security issues right now?', nextId: 'security-info' },
          { text: 'You seem... intense.', nextId: 'intense' },
          { text: "Just saying hello. I'll be on my way.", nextId: null },
        ],
      },
      {
        id: 'intense',
        speaker: 'Chen',
        text: "Intense is how you stay secure. Last month someone plugged a personal router into the Floor 1 network jack. The month before that, three accounts had 'password123' as their password. In a building full of network engineers. So yes, I'm intense. And I have good reason to be.",
        responses: [
          { text: 'Fair point. Is there anything I can help with?', nextId: 'security-info' },
          { text: 'I promise my passwords are strong.', nextId: null },
        ],
      },
      {
        id: 'security-info',
        speaker: 'Chen',
        text: "As a matter of fact, yes. We have a compliance audit coming Friday and I've flagged four critical issues that need remediation. Open ports on the firewall that shouldn't be open, an unpatched switch with a known CVE, misconfigured ACLs leaking traffic between VLANs, and an expired SSL cert on an internal service. If the auditors find these, it's bad for all of us.",
        responses: [
          { text: 'I can help fix those before Friday.', nextId: 'offer-arc' },
          { text: "That's above my pay grade.", nextId: null },
        ],
      },
      {
        id: 'offer-arc',
        speaker: 'Chen',
        text: "Good. I've documented each issue with exact steps for remediation. Four tickets, all security-critical. Close out every one of them before the auditors walk in and I might actually crack a smile. Might. Do we have a deal?",
        responses: [
          {
            text: "Deal. I'll get it done.",
            nextId: 'accepted',
            action: 'accept-arc',
            actionParam: 'security-audit',
          },
          { text: 'Let me check my workload first.', nextId: null },
        ],
      },
      {
        id: 'accepted',
        speaker: 'Chen',
        text: "Tickets are in your queue. Prioritize them. And one more thing — document everything you change. Every port you close, every ACL you modify. The auditors want a paper trail and so do I. Now get moving. Friday waits for no one.",
        responses: [
          { text: 'Understood. Consider it done.', nextId: null },
        ],
      },
    ],
  },
  {
    id: 'alex',
    name: 'Alex',
    role: 'Datacenter Tech',
    floor: 'floor3',
    position: { x: -10, y: 0, z: 2 },
    color: '#9b59b6',
    dialogueTree: [
      {
        id: 'greeting',
        speaker: 'Alex',
        text: "Watch your step — I've got fiber runs everywhere right now. I'm Alex. I basically live up here in the datacenter. These servers are my babies, and right now about a third of them are very, very sick. We're talking failing drives, thermal alerts, and one rack that just... hums ominously.",
        responses: [
          { text: 'What happened to the servers?', nextId: 'server-info' },
          { text: 'Need a hand with anything?', nextId: 'offer-arc' },
          { text: 'Sounds like you have it covered.', nextId: null },
        ],
      },
      {
        id: 'server-info',
        speaker: 'Alex',
        text: "Age, mostly. Half this hardware should've been replaced two years ago, but the budget kept getting pushed. Now we've finally got approval for a full refresh, but I can't just rip and replace — there are live services on these machines. I need to migrate workloads, decommission old nodes, and bring up new ones without anyone downstairs noticing a blip.",
        responses: [
          { text: 'I can help with the migration.', nextId: 'offer-arc' },
          { text: 'How long have you been doing this alone?', nextId: 'alone' },
        ],
      },
      {
        id: 'alone',
        speaker: 'Alex',
        text: "About eight months. Before that there were two of us, but Jamie transferred to the downtown office. It's been... a lot. I've got a system — color-coded labels, spreadsheet tracking every chassis — but the actual hands-on migration work is more than one person can handle. Especially with the old hardware throwing tantrums every other day.",
        responses: [
          { text: "Let me take some of that load off you.", nextId: 'offer-arc' },
          { text: 'Hang in there. I might be back later.', nextId: null },
        ],
      },
      {
        id: 'offer-arc',
        speaker: 'Alex',
        text: "For real? That would be huge. I've got four tasks lined up for the migration: inventorying current hardware health, migrating VMs off the failing nodes, decommissioning the old servers cleanly, and bringing the new rack online. Each one has a ticket with full instructions. I don't cut corners up here — too much at stake.",
        responses: [
          {
            text: "I'm in. Let's save those servers.",
            nextId: 'accepted',
            action: 'accept-arc',
            actionParam: 'datacenter-migration',
          },
          { text: "I need to level up a bit first. I'll be back.", nextId: null },
        ],
      },
      {
        id: 'accepted',
        speaker: 'Alex',
        text: "You just made my week. Tickets are in your queue. Start with the hardware inventory — SYS-001 — so we know exactly what we're working with. The server rack console over there has direct access to the management interfaces. And hey, if a drive starts clicking, don't panic. Just... swap it fast.",
        responses: [
          { text: "Got it. Let's do this.", nextId: null },
        ],
      },
    ],
  },
];
