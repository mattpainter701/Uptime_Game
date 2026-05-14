# NetOps Tower / Uptime_Game — Project Spec v2

## Purpose
Build a browser-based 3D networking simulation game where players solve realistic operations tickets, use a realistic mock CLI for hands-on troubleshooting, connect to lab equipment through EVE-NG for backend validation, and progress through a career path from help desk to senior engineer leadership.

## Product vision
The game should feel like a playable ops simulator with real depth. The player should always have:
- a clear next ticket with meaningful variety
- a reason to use the mock CLI and the lab
- realistic vendor-specific command experiences across Cisco, Fortinet, Aruba, and Dell
- meaningful rewards that unlock new gameplay, not just cosmetics
- visible office / career upgrades that change the 3D environment
- enough variety that the loop stays interesting for hours of play

## Core loop
1. Receive a ticket from the queue
2. Inspect the problem, topology, and constraints
3. Use the mock CLI to troubleshoot in a vendor-realistic style
4. Connect to the EVE-NG lab backend for validation when needed
5. Validate the fix against defined criteria
6. Earn credits, XP, and reputation
7. Spend rewards on upgrades / unlocks
8. Take harder tickets with better tools and more interesting scenarios

## Technical stack
### Frontend (`/client`)
- Vite + React + TypeScript
- React Three Fiber / Three.js for the 3D scene
- Drei for 3D helper components
- Zustand for game state (persisted to localStorage)
- xterm.js for terminal emulation
- Tailwind CSS for UI styling
- WebSocket client for console proxy and real-time events

### Backend (`/server`)
- Python 3.11+ + FastAPI
- WebSocket console proxy (telnet/SSH via asyncssh/telnetlib3)
- EVE-NG API client (REST + cookie auth)
- Pydantic models for all schemas
- Uptime tracking with real-time WebSocket push
- Redis for session/cache (planned)

### Supported appliance styles
- Cisco-style (IOS/XE command patterns)
- Fortinet-style (FortiOS command patterns)
- Aruba-style (AOS-CX command patterns)
- Dell-style (OS10/FTOS command patterns)
- EVE-NG remains the backend for real appliance validation

## Non-goals
- Not a general-purpose network simulator
- Not a pure idle clicker game
- Not a generic 3D demo with no gameplay value
- Not a training toy that avoids real network workflows
- Not a multiplayer or MMO game

---

## Sprint/Epic Roadmap (13 sprints)

### Sprint 1 — Mock CLI Foundation
**Goal:** Ship a reusable mock CLI state machine that can simulate any vendor style.

**Tasks:**
- Build core mock CLI state machine (modes: exec, config, sub-config)
- Implement command parser with tokenization and context-aware completion
- Add virtual filesystem for mock device state (running-config, interfaces, routes)
- Build command registration system with autocomplete hooks
- Write 30+ unit tests covering mode transitions and parser edge cases
- Create mock CLI TypeScript types and contract interface

**Acceptance:** A developer can register a new command family in <50 lines. CLI handles unknown commands, partial matches, and mode transitions correctly.

### Sprint 2 — Cisco-Style Mock CLI
**Goal:** Full Cisco IOS-like command experience for routers and switches.

**Tasks:**
- Implement show commands: version, running-config, ip interface brief, ip route, vlan brief, mac address-table, cdp neighbors, ip ospf neighbor, ip bgp summary
- Implement config commands: hostname, interface config, ip address, no shutdown, ip route, vlan, switchport mode/access/trunk
- Implement ping command with configurable success/failure
- Build Cisco-style command tree with context-sensitive help (?)
- Add show-tech-support mock output generator
- Wire mock CLI output to ticket validation engine

**Acceptance:** A player can navigate Cisco CLI, view and modify configs, and ticket validation can read mock CLI state.

### Sprint 3 — Fortinet-Style Mock CLI
**Goal:** Full FortiOS-like command experience for firewalls.

**Tasks:**
- Implement FortiOS config tree (config system, config firewall policy, config router static)
- Implement show/get commands: system status, firewall policy, router info routing-table, system interface
- Build Fortinet-style tab-completion and context help
- Implement address object and service object management
- Add security policy ordering and hit-count visualization in mock CLI
- Wire Fortinet mock CLI to validation engine

**Acceptance:** Player can troubleshoot a FortiGate scenario with realistic show/get/edit flow.

### Sprint 4 — Aruba & Dell Mock CLIs
**Goal:** Aruba AOS-CX and Dell OS10 command coverage.

**Tasks:**
- Implement Aruba AOS-CX commands: show run, show vlan, show interface, show lldp neighbor-info, show ip route
- Implement Aruba config commands: vlan, interface, routing
- Implement Dell OS10 commands: show running-configuration, show ip interface brief, show vlan, show ip route
- Add Dell-specific show inventory and show environment
- Build shared command abstractions between all four vendors
- Create appliance-style registry for ticket/lab mapping

**Acceptance:** All four appliance styles have sufficient command coverage for Tier 1-3 tickets.

### Sprint 5 — Ticket Engine v2
**Goal:** Dynamic ticket generation with procedural difficulty scaling.

**Tasks:**
- Build ticket template system with parameter substitution
- Implement procedural ticket generator (select category, difficulty, appliances)
- Create difficulty matrix: Tier 1 (single device, simple fix), Tier 2 (2 devices, moderate complexity), Tier 3 (3+ devices, protocol troubleshooting), Tier 4 (multi-vendor, HA/security), Tier 5 (architecture design, multi-protocol)
- Add ticket categories: network-basics, switching, routing, security, systems, automation, high-availability, wireless, voice, datacenter
- Build hint economy system (cost scales with difficulty, 3 hints per ticket)
- Add ticket time-pressure mechanics (SLA tiers, bonus for speed, penalty for overtime)
- Create 40+ ticket templates across all tiers and categories

**Acceptance:** Ticket generation produces unique, parameterized tickets with appropriate difficulty.

### Sprint 6 — Progression System v2
**Goal:** Deep career progression with meaningful unlocks at each level.

**Tasks:**
- Expand career path to 8 levels with distinct unlocks:
  - L1 Help Desk: basic tickets, 1 device
  - L2 Junior NetAdmin: switching tickets, serial console
  - L3 Network Admin: routing tickets, SSH access
  - L4 Senior NetAdmin: security/firewall tickets, config diff tool
  - L5 Network Engineer: multi-device tickets, packet capture tool
  - L6 Senior Engineer: architecture tickets, automation scripts
  - L7 Principal Engineer: multi-vendor tickets, custom tool presets
  - L8 CTO: all unlocked, special architect tickets
- Implement skill tree: routing, switching, security, automation, wireless
- Add certification system (CCNA-style unlocks for each skill branch)
- Build reputation decay for abandoned/failed tickets
- Add streak bonuses (5 consecutive = 1.5x credits, 10 = 2x)
- Create achievement system (first BGP fix, first HA recovery, etc.)

**Acceptance:** Progression feels earned — each level brings new gameplay, not just a title change.

### Sprint 7 — Reward Economy & Upgrades
**Goal:** Credits, XP, and reputation drive meaningful purchase decisions.

**Tasks:**
- Build shop system with 30+ purchasable items:
  - Office upgrades (better desk, multiple monitors, RGB lighting, view floor upgrades)
  - Certifications (unlock ticket categories)
  - Tools (hint packs, time extensions, auto-documenter, config templates)
  - Consumables (coffee for time boost, energy drinks for double XP hour)
  - Cosmetics (character skins, desk themes, terminal themes)
- Implement upgrade visualization in 3D office
- Add daily challenges with bonus rewards
- Build economy balance spreadsheet and tuning parameters
- Add replay bonuses for previously solved ticket types
- Create "prestige" mechanic for replayability

**Acceptance:** Players have multiple ways to spend credits and each purchase visibly changes gameplay.

### Sprint 8 — 3D Office Environment Expansion
**Goal:** The office reflects career progress and is fun to explore.

**Tasks:**
- Add floor themes: basement (electrical/maintenance vibe), floor 5 (help desk cubicles), floor 25 (private office), floor 50 (corner penthouse)
- Implement elevator with floor selection UI
- Add interactive office objects: coffee machine, whiteboard, bookshelf, server rack
- Build NPC system: manager (gives special tickets), coworker (gives hints), help desk agent (tutorials)
- Add day/night cycle with dynamic lighting (fluorescent day, neon night)
- Implement weather effects: rain on windows, city lights at night
- Add ambient sounds: keyboard typing, server hum, city ambience
- Create desk customization (monitor count, RGB colors, decorations)

**Acceptance:** The 3D environment changes visibly with player progress and is interactive.

### Sprint 9 — Validation Engine v2
**Goal:** Robust, extensible validation that supports mock CLI and real EVE-NG.

**Tasks:**
- Strengthen validation pipeline: ping, command-output, config-check, API-check
- Add partial-success grading (80% criteria pass = 70% reward)
- Implement validation timing (some checks need device convergence delay)
- Build validation script engine for complex multi-step checks
- Add pre-flight validation (check lab is in correct initial broken state)
- Create validation report with per-criterion pass/fail and hints for what went wrong
- Build fallback: if EVE-NG unavailable, use mock CLI for validation
- Add anti-cheat: detect if player bypassed CLI and went straight to lab fix

**Acceptance:** Validation is reliable, tunable, and gives useful feedback on partial successes.

### Sprint 10 — Terminal & Console UX
**Goal:** A terminal experience that feels like a real network engineer's workspace.

**Tasks:**
- Add multi-tab terminal (one per node in lab)
- Implement split-pane terminal (topology on left, terminal on right)
- Add command history persistence per session
- Implement terminal search (Ctrl+F style)
- Add session recording and playback
- Build "quick ref" sidebar (common commands for current appliance type)
- Add paste buffer with sanitization
- Implement terminal themes: cyberpunk, dark, light, retro-green, amber
- Add font size controls and terminal resize

**Acceptance:** The terminal is a power tool that makes troubleshooting feel professional.

### Sprint 11 — End-to-End Game Loop Polish
**Goal:** The complete play session feels satisfying from boot to shutdown.

**Tasks:**
- Build onboarding tutorial (first 5 tickets guided)
- Implement save/load game state (already partially via Zustand persist)
- Add pause/resume for long sessions
- Build session summary screen (tickets solved, credits earned, uptime maintained)
- Implement difficulty curve monitoring (track win/loss rates per tier)
- Add game settings: sound, graphics quality, terminal preferences
- Build "free play" sandbox mode (no timers, all labs accessible)
- Add speedrun mode (timed challenges with leaderboard)
- Implement accessibility: colorblind mode, screen reader support, keyboard-only navigation

**Acceptance:** A new player can install, boot, and complete their first 5 tickets without external help.

### Sprint 12 — Content Expansion & Variety
**Goal:** Enough ticket variety that the game stays fresh for 20+ hours.

**Tasks:**
- Create 60+ additional ticket templates across all categories
- Add special event tickets: "outage day" (6 urgent tickets in a row), "audit week" (security-only tickets)
- Build scenario chains (3-ticket arc: simple problem → revealed complexity → architect solution)
- Add wireless tickets: Wi-Fi interference, AP placement, controller config
- Add VoIP/voice tickets: dial peers, DSP resources, codec negotiation
- Add datacenter tickets: Nexus config, vPC, VXLAN, ACI basics
- Build community ticket submission format and review process
- Add seasonal/holiday themed tickets (Halloween "zombie network", Christmas "gift-wrapped DDoS")

**Acceptance:** A player at level 8 with 20+ hours still sees novel ticket types.

### Sprint 13 — Performance, Testing & Ship Readiness
**Goal:** The game is stable, tested, and deployable.

**Tasks:**
- Build comprehensive test suite:
  - Frontend component tests (Vitest + React Testing Library)
  - Backend API tests (pytest + httpx)
  - Mock CLI unit tests (all vendors)
  - Ticket generation fuzz tests
  - Validation engine integration tests
  - End-to-end game loop smoke tests
- Performance optimization: 3D scene LOD, WebSocket batching, state diffing
- Add error boundaries and graceful degradation (no EVE-NG = show demo mode)
- Build Docker Compose dev environment (frontend + backend + mock EVE-NG)
- Write CONTRIBUTING.md and architecture docs
- Add CI/CD pipeline (GitHub Actions: lint, test, build, deploy)
- Performance budget: 60fps in 3D view, <200ms API responses, <2s initial load

**Acceptance:** Tests pass cleanly, Docker Compose boots the full stack, and a fresh clone gets a working game in <5 minutes.

---

## Acceptance criteria
A release is healthy when:
- a new player can understand the goal within minutes
- tickets clearly lead to actions in the lab
- completing a ticket gives visible progress
- upgrades affect gameplay, not just cosmetics
- level progression unlocks new play, not only new labels
- the game has enough variety to avoid feeling repetitive
- all four mock CLI styles feel authentic
- EVE-NG backend gracefully degrades when unavailable

## Validation
Use the Docker dev/test server for:
- frontend build verification
- backend API startup checks
- end-to-end ticket flow testing
- mock CLI command coverage tests
- lab integration smoke tests
- performance benchmarks

Validation should answer:
- does the game boot cleanly?
- can the player receive, troubleshoot, and resolve a ticket?
- do all mock CLI styles work correctly?
- does validation work with both mock and real EVE-NG?
- do rewards and progression update correctly?

## Constraints
- EVE-NG access may be unavailable in some environments — mock CLI must work standalone
- terminal and console flows should stay stable and predictable
- the project should keep the gameplay loop ahead of visual polish
- all four mock CLIs must share infrastructure to keep maintenance manageable

## Priorities
1. Ship the mock CLI foundation and all four vendor styles
2. Build a dynamic ticket engine with 40+ templates
3. Deepen progression and reward systems
4. Expand 3D environment interaction and polish
5. Harden validation, testing, and deployment

## Success definition
This project is successful when a player can spend 20+ hours in the game, solve realistic network problems across multiple vendors, and feel like they are genuinely advancing through a technical career path — and the game is polished enough to ship.
