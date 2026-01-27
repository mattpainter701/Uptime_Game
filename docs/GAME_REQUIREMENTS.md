# NetOps Tower - Game Requirements Document

## Executive Summary

**NetOps Tower** is a browser-based low-poly 3D simulation game where players assume the role of a system/network engineer working in a large city skyscraper. Players solve real technical problems by connecting to actual network appliances through an EVE-NG backend, earning money and reputation to advance their career.

## Game Concept

### Core Loop
1. Player receives a **ticket** from the ticket queue
2. Player reviews ticket details (problem description, affected systems, SLA)
3. Player connects to **real lab equipment** via EVE-NG
4. Player troubleshoots and resolves the issue
5. System validates the fix
6. Player earns **credits** and **reputation points**
7. Player can spend credits on office upgrades, certifications, tools
8. Higher reputation unlocks promotions and harder tickets

### Setting
- **Location**: "NetOps Tower" - a 50-story corporate skyscraper in a cyberpunk-style city
- **Player's Office**: Starts in a small cubicle on floor 5, can unlock higher floors with better views
- **Time of Day**: Dynamic day/night cycle affecting atmosphere
- **NPCs**: Coworkers, managers, help desk agents (give hints, assign special tickets)

---

## Technical Architecture

### System Components

```
┌─────────────────────────────────────────────────────────────────────┐
│                         BROWSER CLIENT                               │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────────────────┐  │
│  │  Three.js    │  │  xterm.js    │  │    React/Vue UI          │  │
│  │  3D Engine   │  │  Terminal    │  │    (Tickets, Stats)      │  │
│  └──────┬───────┘  └──────┬───────┘  └──────────┬───────────────┘  │
│         │                 │                      │                   │
│         └─────────────────┴──────────────────────┘                   │
│                           │                                          │
│                    WebSocket / REST                                  │
└───────────────────────────┼─────────────────────────────────────────┘
                            │
┌───────────────────────────┼─────────────────────────────────────────┐
│                    GAME SERVER (Node.js/Python)                      │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────────────────┐  │
│  │ Game State   │  │ Ticket       │  │  Validation              │  │
│  │ Manager      │  │ Engine       │  │  Engine                  │  │
│  └──────────────┘  └──────────────┘  └──────────────────────────┘  │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────────────────┐  │
│  │ User Auth    │  │ WebSocket    │  │  EVE-NG                  │  │
│  │ & Progress   │  │ Proxy        │  │  API Client              │  │
│  └──────────────┘  └──────────────┘  └──────────────────────────┘  │
└───────────────────────────┼─────────────────────────────────────────┘
                            │
┌───────────────────────────┼─────────────────────────────────────────┐
│                       EVE-NG SERVER                                  │
│  ┌──────────────────────────────────────────────────────────────┐   │
│  │  Labs: Pre-configured topologies for each ticket type        │   │
│  │  - Basic Router Config Lab                                   │   │
│  │  - VLAN Troubleshooting Lab                                  │   │
│  │  - Firewall ACL Lab                                          │   │
│  │  - BGP Peering Lab                                           │   │
│  │  - etc.                                                      │   │
│  └──────────────────────────────────────────────────────────────┘   │
│  ┌──────────────────────────────────────────────────────────────┐   │
│  │  Network Appliances (QEMU/Docker)                            │   │
│  │  - Cisco vIOS/IOL                                            │   │
│  │  - Arista vEOS                                               │   │
│  │  - Palo Alto VM                                              │   │
│  │  - Linux servers                                             │   │
│  │  - FortiGate                                                 │   │
│  └──────────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────────┘
```

---

## EVE-NG Integration

### API Endpoints Used

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/api/auth/login` | POST | Authenticate game server |
| `/api/auth/logout` | GET | End session |
| `/api/status` | GET | Check server health |
| `/api/labs/{path}` | GET | Get lab details |
| `/api/labs/{path}/nodes` | GET | List nodes in lab |
| `/api/labs/{path}/nodes/{id}` | GET | Get node details (console URL) |
| `/api/labs/{path}/nodes/{id}/start` | GET | Start a node |
| `/api/labs/{path}/nodes/{id}/stop` | GET | Stop a node |
| `/api/labs/{path}/nodes/{id}/wipe` | GET | Reset node to default |
| `/api/labs/{path}/configs` | GET | Get node configs |
| `/api/labs/{path}/configs/{id}` | PUT | Apply config (for validation) |
| `/api/list/templates` | GET | Available node templates |

### Console Connection Flow

```
1. Game Server requests node info from EVE-NG
2. EVE-NG returns: { "url": "telnet://eve-ng-host:32769" }
3. Game Server opens WebSocket proxy to telnet port
4. Browser's xterm.js connects to Game Server WebSocket
5. Bidirectional data flow: xterm <-> WebSocket <-> telnet
```

### Lab Templates for Tickets

Each ticket type has a pre-built lab in EVE-NG:

```yaml
ticket_labs:
  basic_router_config:
    lab_path: /game/basic_router.unl
    nodes:
      - name: R1
        template: vios
        initial_state: broken  # Missing default route
    validation:
      - type: ping
        from: R1
        to: 8.8.8.8
        expected: success
        
  vlan_troubleshooting:
    lab_path: /game/vlan_trouble.unl
    nodes:
      - name: SW1
        template: viosl2
      - name: SW2
        template: viosl2
      - name: PC1
        template: linux
      - name: PC2
        template: linux
    validation:
      - type: ping
        from: PC1
        to: PC2
        expected: success
      - type: command
        node: SW1
        command: "show vlan brief"
        contains: "VLAN0010"
```

---

## Game Features

### 1. Ticket System

**Ticket Properties:**
- `id`: Unique identifier
- `title`: Brief description
- `description`: Detailed problem statement
- `category`: Network, Security, Systems, Cloud
- `difficulty`: 1-5 stars
- `time_limit`: SLA in minutes (optional)
- `reward_credits`: Base payment
- `reward_xp`: Experience points
- `lab_template`: Associated EVE-NG lab
- `hints`: Available hints (cost credits to reveal)
- `validation_criteria`: How to verify completion

**Ticket Categories:**
| Category | Examples |
|----------|----------|
| Network Basics | Static routes, DHCP, DNS |
| Switching | VLANs, STP, EtherChannel |
| Routing | OSPF, EIGRP, BGP |
| Security | ACLs, Firewalls, VPNs |
| Systems | Linux admin, Windows Server |
| Automation | Ansible, Python scripts |

### 2. Progression System

**Career Levels:**
| Level | Title | Floor | Unlocks |
|-------|-------|-------|---------|
| 1 | Help Desk Tech | 5 | Basic tickets |
| 2 | Junior NetAdmin | 10 | Switching tickets |
| 3 | Network Admin | 15 | Routing tickets |
| 4 | Senior NetAdmin | 25 | Security tickets |
| 5 | Network Engineer | 35 | Complex multi-device tickets |
| 6 | Senior Engineer | 40 | Architecture tickets |
| 7 | Principal Engineer | 45 | Special projects |
| 8 | CTO | 50 | Everything unlocked |

**Reputation System:**
- Solving tickets on time: +rep
- Failing SLA: -rep
- Bonus for first-time completions
- Streak bonuses for consecutive solves

### 3. Economy

**Earning Credits:**
- Complete tickets (base reward)
- Time bonuses (faster = more)
- Difficulty bonuses
- Daily challenges
- Achievement unlocks

**Spending Credits:**
- Office upgrades (cosmetic)
- Certifications (unlock ticket categories)
- Tools (hints, shortcuts)
- Coffee/energy drinks (extend time limits)

### 4. 3D Environment

**Scene Elements:**
- Office space with desk, monitors, chair
- Window with city skyline view
- Interactive terminal on desk
- Whiteboard with network diagrams
- Bookshelf with technical books
- Coffee machine (refills energy)
- Coworker NPCs walking around

**Visual Style:**
- Low-poly aesthetic (performant in browser)
- Cyberpunk color palette (neon accents, dark base)
- Day/night lighting cycle
- Weather effects (rain on windows)

### 5. Terminal Integration

**xterm.js Features:**
- Full terminal emulation
- Copy/paste support
- Command history
- Split terminals (multiple nodes)
- Search in terminal output
- Session recording/playback

---

## User Interface

### Main Game View
```
┌─────────────────────────────────────────────────────────────────┐
│  [Profile] [Tickets: 3] [Credits: $5,420] [Rep: ⭐⭐⭐]  [⚙️]  │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│    ┌─────────────────────────────────────────────────────┐     │
│    │                                                     │     │
│    │              3D OFFICE VIEW                         │     │
│    │                                                     │     │
│    │         [Click desk to open terminal]               │     │
│    │                                                     │     │
│    └─────────────────────────────────────────────────────┘     │
│                                                                 │
├─────────────────────────────────────────────────────────────────┤
│  📋 Current Ticket: "Fix OSPF Neighbor Relationship"           │
│  ⏱️ Time Remaining: 14:32  |  💰 Reward: $500  |  ⭐⭐⭐        │
│  [View Details] [Get Hint: $50] [Abandon: -rep]                 │
└─────────────────────────────────────────────────────────────────┘
```

### Terminal View (when at desk)
```
┌─────────────────────────────────────────────────────────────────┐
│  Ticket: OSPF Neighbor Issue        [Back to Office] [Submit]   │
├──────────────────────────────┬──────────────────────────────────┤
│  TOPOLOGY                    │  TERMINAL                        │
│  ┌────────────────────┐     │  ┌────────────────────────────┐  │
│  │    [R1]───[R2]     │     │  │ R1#                        │  │
│  │     │       │      │     │  │ R1# show ip ospf neighbor  │  │
│  │   [SW1]   [SW2]    │     │  │                            │  │
│  └────────────────────┘     │  │ (no output)                │  │
│                              │  │                            │  │
│  Nodes:                      │  │ R1#                        │  │
│  • R1 [Connected] ●         │  │                            │  │
│  • R2 [Disconnected] ○      │  └────────────────────────────┘  │
│                              │  [R1 ▾] [R2] [SW1] [SW2]        │
├──────────────────────────────┴──────────────────────────────────┤
│  📝 Ticket Details:                                             │
│  Users report connectivity issues between sites. OSPF neighbors │
│  are not forming. Investigate R1 and R2 OSPF configuration.     │
│                                                                 │
│  Validation: Ping from R1 to R2 loopback must succeed           │
└─────────────────────────────────────────────────────────────────┘
```

---

## Validation Engine

### Validation Types

```typescript
interface ValidationCriteria {
  type: 'ping' | 'command' | 'config' | 'api';
  params: ValidationParams;
}

// Ping validation
interface PingValidation {
  type: 'ping';
  source_node: string;
  destination: string;  // IP or hostname
  count?: number;
  success_rate?: number; // 0-100%
}

// Command output validation
interface CommandValidation {
  type: 'command';
  node: string;
  command: string;
  contains?: string[];    // Must contain these strings
  not_contains?: string[];  // Must NOT contain these
  regex?: string;         // Match regex pattern
}

// Config validation
interface ConfigValidation {
  type: 'config';
  node: string;
  contains?: string[];
  not_contains?: string[];
}

// API check (for complex scenarios)
interface APIValidation {
  type: 'api';
  endpoint: string;
  method: 'GET' | 'POST';
  expected_status: number;
  body_contains?: string;
}
```

### Validation Flow

```
1. Player clicks "Submit Solution"
2. Game Server connects to EVE-NG API
3. For each validation criterion:
   a. Execute check (ping, show command, etc.)
   b. Parse output
   c. Compare against expected results
4. Calculate score:
   - All pass: Full reward
   - Partial: Reduced reward (if allowed)
   - Fail: No reward, option to retry
5. Update player stats
6. Reset lab to initial state
```

---

## Security Considerations

### Lab Isolation
- Each player gets dedicated lab instance
- Labs are sandboxed - no cross-player access
- Management network isolated from lab networks
- Session timeouts for inactive connections

### Rate Limiting
- Max concurrent lab sessions per user
- API request throttling
- Console connection limits

### Input Sanitization
- All terminal input logged and sanitized
- Block malicious commands (fork bombs, etc.)
- Network egress filtering on lab nodes

---

## Technical Requirements

### Backend (Node.js/Python)
- Express.js or FastAPI for REST API
- Socket.IO for WebSocket handling
- Redis for session management
- PostgreSQL for game state persistence
- evengsdk Python library for EVE-NG integration

### Frontend
- Three.js for 3D rendering
- xterm.js for terminal emulation
- React or Vue for UI components
- Tailwind CSS for styling
- Howler.js for audio

### Infrastructure
- EVE-NG server with sufficient resources
- Game server (can be same host or separate)
- Reverse proxy (nginx) for SSL/routing
- Database server

### Browser Requirements
- WebGL 2.0 support
- WebSocket support
- Modern browser (Chrome 80+, Firefox 75+, Safari 14+)

---

## Development Phases

### Phase 1: MVP (4 weeks)
- [ ] Basic 3D office scene
- [ ] Single ticket flow
- [ ] EVE-NG API integration
- [ ] Terminal connection
- [ ] Simple validation

### Phase 2: Core Game (4 weeks)
- [ ] Ticket queue system
- [ ] Multiple lab templates
- [ ] Progression system
- [ ] Basic UI/UX

### Phase 3: Polish (4 weeks)
- [ ] Full 3D environment
- [ ] Audio/music
- [ ] Achievements
- [ ] Leaderboards
- [ ] Tutorial

### Phase 4: Content (Ongoing)
- [ ] New ticket types
- [ ] New lab scenarios
- [ ] Community challenges
- [ ] Seasonal events

---

## Appendix: Sample Tickets

### Ticket 1: Default Route Missing
```yaml
id: NET-001
title: "Server Can't Reach Internet"
description: |
  The web server (192.168.1.100) cannot reach external sites.
  It can ping its gateway (192.168.1.1) but nothing beyond.
  Please investigate the router configuration.
category: Network Basics
difficulty: 1
time_limit: 10
reward_credits: 100
reward_xp: 50
lab_template: basic_default_route
validation:
  - type: ping
    source_node: SERVER
    destination: 8.8.8.8
    success_rate: 100
hints:
  - cost: 25
    text: "Check the routing table on the router"
  - cost: 50
    text: "Look for a default route (0.0.0.0/0)"
```

### Ticket 2: VLAN Mismatch
```yaml
id: NET-015
title: "Two PCs Can't Communicate"
description: |
  PC1 (10.10.10.10) and PC2 (10.10.10.20) are on the same switch
  but cannot ping each other. Both ports show up as connected.
  Investigate the switch configuration.
category: Switching
difficulty: 2
time_limit: 15
reward_credits: 200
reward_xp: 100
lab_template: vlan_mismatch
validation:
  - type: ping
    source_node: PC1
    destination: 10.10.10.20
    success_rate: 100
  - type: command
    node: SW1
    command: "show vlan brief"
    contains: ["Fa0/1", "Fa0/2", "10"]
hints:
  - cost: 50
    text: "Check which VLANs the ports are assigned to"
  - cost: 75
    text: "Use 'show vlan brief' and 'show interface status'"
```

---

## References

- EVE-NG API Documentation: https://www.eve-ng.net/index.php/documentation/howtos/how-to-eve-ng-api/
- evengsdk Library: https://github.com/ttafsir/evengsdk
- Three.js Documentation: https://threejs.org/docs/
- xterm.js: https://xtermjs.org/
