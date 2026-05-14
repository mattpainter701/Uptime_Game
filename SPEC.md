# NetOps Tower / Uptime_Game — Project Spec

## Purpose
Build a browser-based 3D networking simulation game where players solve realistic operations tickets, use a realistic mock CLI for hands-on troubleshooting, connect to lab equipment through EVE-NG for backend validation, and progress through a career path from help desk to senior engineer leadership.

## Product vision
The game should feel like a playable ops simulator, not just a dashboard. The player should always have:
- a clear next ticket
- a reason to use the mock CLI and the lab
- realistic vendor-specific command experiences
- meaningful rewards for progress
- visible office / career upgrades
- enough variety that the loop stays interesting over time

## Core loop
1. Receive a ticket
2. Inspect the problem and constraints
3. Use the mock CLI to troubleshoot in a realistic vendor style
4. Connect to the lab / appliance backend if needed for validation
5. Validate the fix
6. Earn credits, XP, and reputation
7. Spend rewards on upgrades / unlocks
8. Take harder tickets with better tools and more interesting scenarios

## Non-goals
- Not a general-purpose network simulator
- Not a pure idle game
- Not a generic 3D demo with no gameplay value
- Not a fake training toy that avoids real network workflows

## Current focus
Continue building out the game with more depth in:
- levels and progression
- ticket variety and value
- stronger reward loops
- more satisfying play moment-to-moment
- better vendor-specific appliance coverage
- better integration between the 3D office, mock CLI, and EVE-NG-backed lab operations

## Gameplay pillars
### 1. Ticket-driven play
Tickets should be the main source of direction and motivation.

### 2. Real technical interaction
Players should solve problems through actual lab workflows, not just click through canned prompts.

### 3. Career progression
The office, rank, and available ticket classes should evolve with the player.

### 4. Visible value
Credits, XP, reputation, and unlocks should matter and be easy to understand.

## Milestones
### Milestone A — Stronger game loop
- Improve ticket generation and pacing
- Add more ticket categories and difficulty tiers
- Make rewards more distinct and useful
- Ensure every completed ticket feels like progress

### Milestone B — Better progression
- Expand floors / office upgrades
- Improve level boundaries and unlock logic
- Add meaningful new abilities or tools at milestones
- Make progression feel earned rather than linear

### Milestone C — Richer play value
- Add more scenario types
- Add more validation styles
- Improve hints / penalties / time pressure
- Add special or rare tickets with better rewards
- Expand the mock CLI experiences across Cisco, Fortinet, Aruba, and Dell style appliances

### Milestone D — Polish and retention
- Improve HUD clarity
- Improve feedback when actions succeed/fail
- Improve scene readability and UX
- Make the game loop feel fun enough to keep playing

## Acceptance criteria
A release is healthy when:
- a new player can understand the goal within minutes
- tickets clearly lead to actions in the lab
- completing a ticket gives visible progress
- upgrades affect gameplay, not just cosmetics
- level progression unlocks new play, not only new labels
- the game has enough variety to avoid feeling repetitive too quickly

## Development setup
### Frontend
- React + TypeScript + Vite
- React Three Fiber / Three.js for the scene
- Zustand for game state
- xterm.js for terminal interactions

### Backend
- FastAPI service
- WebSocket console proxy
- EVE-NG API integration
- async support for lab / node actions

### Local run
- `cd client && npm run dev`
- `cd server && uvicorn app.main:app --reload --port 8000`

### Supported appliance styles
- Cisco-style routers / switches / firewalls
- Fortinet-style firewalls and security appliances
- Aruba-style switching / networking gear
- Dell-style networking appliances
- EVE-NG remains the intended backend for real appliance validation

## Validation
Use the Docker dev/test server for:
- frontend build verification
- backend API startup checks
- end-to-end ticket flow testing
- console connection testing
- lab integration smoke tests

Validation should answer:
- does the game boot cleanly?
- can the player receive and resolve a ticket?
- does validation work after a change?
- do rewards and progression update correctly?

## Constraints
- EVE-NG access may be unavailable in some environments, so the game should degrade gracefully
- terminal and console flows should stay stable and predictable
- the project should keep the gameplay loop ahead of visual polish

## Priorities
1. Make the core loop more fun and replayable
2. Improve the value of credits / XP / reputation
3. Expand ticket depth and difficulty curves
4. Keep the 3D office and terminal useful to gameplay
5. Keep EVE-NG integration reliable

## Success definition
This project is successful when a player can spend time in the game, solve realistic network problems, and feel like they are genuinely advancing through a technical career path.
