# NetOps Tower

A browser-based 3D simulation game where players work as network engineers, solving real technical problems by connecting to actual network appliances through EVE-NG.

## Features

- **3D Office Environment**: Low-poly cyberpunk office with interactive elements
- **Real Lab Integration**: Connect to actual routers, switches, firewalls via EVE-NG
- **Terminal Emulation**: Full xterm.js terminal with WebSocket proxy to telnet/SSH
- **Progression System**: Level up from Help Desk to CTO, earn credits and reputation
- **Ticket System**: Solve network troubleshooting tickets with real validation

## Tech Stack

### Frontend (`/client`)
- **Vite** + **React** + **TypeScript**
- **React Three Fiber** (Three.js for React)
- **Drei** (3D helper components)
- **Zustand** (state management)
- **xterm.js** (terminal emulation)
- **Tailwind CSS** (styling)

### Backend (`/server`)
- **Python 3.11+** + **FastAPI**
- **WebSocket** console proxy (telnet/SSH)
- **EVE-NG API** client
- **asyncio** for async operations

## Project Structure

```
Uptime_Game/
├── client/                 # React frontend
│   ├── src/
│   │   ├── components/
│   │   │   ├── game/       # Main game component
│   │   │   ├── scene/      # 3D scene (Office, Character, Lighting)
│   │   │   ├── terminal/   # Terminal emulator
│   │   │   └── ui/         # HUD, panels, overlays
│   │   ├── store/          # Zustand state management
│   │   ├── types/          # TypeScript types
│   │   └── App.tsx
│   └── package.json
│
├── server/                 # Python backend
│   ├── app/
│   │   ├── routes/         # API endpoints
│   │   │   ├── labs.py     # Lab management
│   │   │   ├── nodes.py    # Node operations
│   │   │   ├── console.py  # WebSocket console proxy
│   │   │   └── status.py   # Status endpoints
│   │   ├── services/
│   │   │   ├── eveng.py    # EVE-NG API client
│   │   │   └── console_proxy.py  # Telnet/SSH proxy
│   │   ├── models/         # Pydantic schemas
│   │   ├── config.py       # Configuration
│   │   └── main.py         # FastAPI app
│   ├── requirements.txt
│   └── .env.example
│
└── docs/                   # Design documents
    ├── GAME_REQUIREMENTS.md
    └── EVE_NG_INTEGRATION.md
```

## Quick Start

### Frontend

```bash
cd client
npm install
npm run dev
# Open http://localhost:3001
```

### Backend

```bash
cd server

# Create virtual environment
python -m venv venv
source venv/bin/activate  # or `venv\Scripts\activate` on Windows

# Install dependencies
pip install -r requirements.txt

# Configure EVE-NG connection
cp .env.example .env
# Edit .env with your EVE-NG credentials

# Run server
uvicorn app.main:app --reload --port 8000
```

## API Endpoints

### Status
- `GET /api/status` - Server and EVE-NG status
- `GET /api/status/health` - Health check
- `GET /api/status/templates` - Available node templates

### Labs
- `GET /api/labs/` - List labs
- `GET /api/labs/{path}/info` - Lab details
- `POST /api/labs/{path}/open` - Open/activate lab

### Nodes
- `GET /api/nodes/{lab_path}/list` - List nodes in lab
- `GET /api/nodes/{lab_path}/{node_id}` - Node details
- `POST /api/nodes/{lab_path}/{node_id}/start` - Start node
- `POST /api/nodes/{lab_path}/{node_id}/stop` - Stop node
- `POST /api/nodes/{lab_path}/{node_id}/wipe` - Reset node
- `POST /api/nodes/{lab_path}/start-all` - Start all nodes
- `POST /api/nodes/{lab_path}/stop-all` - Stop all nodes

### Console (WebSocket)
- `WS /api/console/ws?lab_path=...&node_id=...` - Node console
- `WS /api/console/ws/ssh?host=...&port=...&username=...&password=...` - Direct SSH

## Game Features

### 3D Office Scene
- L-shaped gaming desk with RGB lighting
- Triple monitor setup
- Gaming chair with racing bolsters
- Mechanical keyboard with RGB underglow
- PC tower with glass panel
- Low-poly geek character with headphones
- City skyline through window
- Neon decorations and ambient lighting

### Terminal
- Full terminal emulation via xterm.js
- WebSocket connection to EVE-NG nodes
- Cisco IOS-style mock CLI for offline practice, including `show version`, `show running-config`, `show ip interface brief`, `show ip route`, `show vlan brief`, `show mac address-table`, `show cdp neighbors`, `show ip ospf neighbor`, `show ip bgp summary`, config-mode `hostname`/`interface`/`ip route`/`vlan`/`switchport`, and configurable `ping` results
- Telnet protocol support with NAWS
- SSH support (with asyncssh)
- Multiple terminal themes (cyberpunk, dark, light)

### Progression
| Level | Title | Floor | XP Required |
|-------|-------|-------|-------------|
| 1 | Help Desk Tech | 5 | 0 |
| 2 | Junior NetAdmin | 10 | 500 |
| 3 | Network Admin | 15 | 1,500 |
| 4 | Senior NetAdmin | 25 | 3,500 |
| 5 | Network Engineer | 35 | 7,000 |
| 6 | Senior Engineer | 40 | 12,000 |
| 7 | Principal Engineer | 45 | 20,000 |
| 8 | CTO | 50 | 35,000 |

## EVE-NG Setup

1. Install EVE-NG Community or Professional
2. Import network appliance images (Cisco vIOS, Arista vEOS, etc.)
3. Create lab templates for tickets
4. Configure API access

### Supported Node Types
- Routers: Cisco vIOS, CSR1000v, XRv
- Switches: Cisco vIOS L2, Nexus 9000v
- Firewalls: Palo Alto, Fortinet, pfSense
- Servers: Linux (Ubuntu, CentOS), Windows Server
- Other: Docker containers, custom QEMU images

## Development

### Frontend Development
```bash
cd client
npm run dev     # Start dev server
npm run build   # Production build
npm run preview # Preview production build
```

### Backend Development
```bash
cd server
uvicorn app.main:app --reload --port 8000
# API docs at http://localhost:8000/docs
```

## License

MIT

## Credits

Built with:
- [Three.js](https://threejs.org/) / [React Three Fiber](https://docs.pmnd.rs/react-three-fiber)
- [FastAPI](https://fastapi.tiangolo.com/)
- [xterm.js](https://xtermjs.org/)
- [EVE-NG](https://www.eve-ng.net/)
