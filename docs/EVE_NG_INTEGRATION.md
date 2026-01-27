# EVE-NG Integration Deep Dive

## Overview

This document details how NetOps Tower integrates with EVE-NG to provide real network lab experiences in a browser-based game environment.

## EVE-NG Architecture Understanding

### Core Components

EVE-NG (Emulated Virtual Environment - Next Generation) is built on:
- **Backend**: Ubuntu Linux with KVM/QEMU virtualization
- **Frontend**: Web-based HTML5 interface (PHP/JavaScript)
- **Hypervisors**: QEMU (for Cisco, Arista, etc.), Dynamips (legacy IOS), IOL (IOS on Linux), Docker
- **Networking**: Linux bridges, Open vSwitch (OVS), pnet interfaces

### API Architecture

EVE-NG uses a RESTful API built with Slim Framework (PHP):

```
/opt/unetlab/html/
├── api.php              # Main API router
├── includes/
│   ├── api_authentication.php
│   ├── api_configs.php
│   ├── api_folders.php
│   ├── api_labs.php
│   ├── api_networks.php
│   ├── api_nodes.php
│   └── api_status.php
└── templates/           # Node template definitions
    ├── vios.php
    ├── viosl2.php
    ├── linux.php
    └── ...
```

### Console Connection Flow

```
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│   Browser       │     │   EVE-NG        │     │   Virtual       │
│   (xterm.js)    │     │   Server        │     │   Appliance     │
└────────┬────────┘     └────────┬────────┘     └────────┬────────┘
         │                       │                       │
         │  1. Request node info │                       │
         │──────────────────────>│                       │
         │                       │                       │
         │  2. Return telnet URL │                       │
         │<──────────────────────│                       │
         │  (telnet://host:32769)│                       │
         │                       │                       │
         │  3. WebSocket connect │                       │
         │──────────────────────>│                       │
         │                       │  4. Telnet connect    │
         │                       │──────────────────────>│
         │                       │                       │
         │  5. Bidirectional I/O │  5. Bidirectional I/O │
         │<─────────────────────>│<─────────────────────>│
         │                       │                       │
```

---

## Windows Client Pack Analysis

The EVE-NG Windows Client Pack registers custom URL protocol handlers to enable native console access.

### Components

| Component | Purpose |
|-----------|---------|
| **PuTTY** | Telnet/SSH client (default) |
| **UltraVNC** | VNC viewer for graphical consoles |
| **Wireshark** | Packet capture with Plink |
| **Plink** | Command-line SSH for captures |
| **Registry Handlers** | URL protocol registration |

### Protocol Handler Registration

The client pack modifies Windows registry to handle these protocols:

```registry
; Telnet protocol handler
[HKEY_CLASSES_ROOT\telnet]
@="URL:Telnet Protocol"
"URL Protocol"=""

[HKEY_CLASSES_ROOT\telnet\shell\open\command]
@="\"C:\\Program Files\\EVE-NG\\putty.exe\" -telnet %1"

; VNC protocol handler  
[HKEY_CLASSES_ROOT\vnc]
@="URL:VNC Protocol"
"URL Protocol"=""

[HKEY_CLASSES_ROOT\vnc\shell\open\command]
@="\"C:\\Program Files\\EVE-NG\\vnc-wrapper.bat\" %1"

; Capture protocol handler (Wireshark)
[HKEY_CLASSES_ROOT\capture]
@="URL:Capture Protocol"
"URL Protocol"=""

[HKEY_CLASSES_ROOT\capture\shell\open\command]
@="\"C:\\Program Files\\EVE-NG\\capture-wrapper.bat\" %1"
```

### URL Format Examples

```
telnet://192.168.1.100:32769         # Node console
vnc://192.168.1.100:5901             # VNC graphical console  
capture://192.168.1.100/tap/1/0      # Packet capture
```

### Browser-Based Alternative (Our Approach)

Instead of native applications, we use:

| Native | Browser Alternative |
|--------|---------------------|
| PuTTY (telnet) | xterm.js + WebSocket proxy |
| UltraVNC | noVNC (not yet implemented) |
| Wireshark | pcap.js or server-side capture |

---

## API Endpoints Reference

### Authentication

```bash
# Login
POST /api/auth/login
Content-Type: application/json

{
    "username": "admin",
    "password": "eve",
    "html5": -1  # -1 for native console, 1 for HTML5
}

# Response
{
    "code": 200,
    "status": "success",
    "message": "User logged in (90013)."
}

# Logout
GET /api/auth/logout

# Current user info
GET /api/auth
```

### System Status

```bash
# Server status
GET /api/status

# Response
{
    "code": 200,
    "data": {
        "cached": 5,
        "cpu": 1,
        "disk": 31,
        "dynamips": 0,
        "iol": 0,
        "mem": 8,
        "qemu": 0,
        "qemu_version": "2.4.0",
        "swap": 0,
        "version": "5.0.1"
    }
}

# List node templates
GET /api/list/templates/

# Get template details
GET /api/list/templates/vios

# List network types
GET /api/list/networks
```

### Lab Management

```bash
# List labs in folder
GET /api/folders/{path}

# Get lab details
GET /api/labs/{path}.unl

# Create lab
POST /api/labs
{
    "path": "/game",
    "name": "ticket-001",
    "version": "1",
    "author": "NetOps Tower",
    "description": "Lab for ticket NET-001"
}

# Delete lab
DELETE /api/labs/{path}.unl

# Open lab (sets as active)
GET /api/labs/{path}.unl/open

# Close lab
GET /api/labs/{path}.unl/close
```

### Node Operations

```bash
# List nodes in lab
GET /api/labs/{path}.unl/nodes

# Response includes console URL
{
    "1": {
        "id": 1,
        "name": "R1",
        "template": "vios",
        "status": 0,  # 0=stopped, 2=running
        "console": "telnet",
        "url": "telnet://192.168.1.100:32769",
        "ram": 512,
        "cpu": 1,
        "ethernet": 4
    }
}

# Get single node
GET /api/labs/{path}.unl/nodes/{id}

# Start node
GET /api/labs/{path}.unl/nodes/{id}/start

# Stop node
GET /api/labs/{path}.unl/nodes/{id}/stop

# Wipe node (reset to default)
GET /api/labs/{path}.unl/nodes/{id}/wipe

# Export config (save running-config)
GET /api/labs/{path}.unl/nodes/{id}/export

# Get node interfaces
GET /api/labs/{path}.unl/nodes/{id}/interfaces
```

### Configuration Management

```bash
# Get startup config
GET /api/labs/{path}.unl/configs/{node_id}

# Set startup config
PUT /api/labs/{path}.unl/configs/{node_id}
{
    "data": "hostname R1\ninterface Gi0/0\n ip address 10.0.0.1 255.255.255.0\n"
}
```

### Network Operations

```bash
# List networks in lab
GET /api/labs/{path}.unl/networks

# Add network
POST /api/labs/{path}.unl/networks
{
    "type": "bridge",
    "name": "Management",
    "left": "35%",
    "top": "25%"
}
```

---

## Lab Template Format (.unl)

EVE-NG labs are stored as XML files with `.unl` extension:

```xml
<?xml version="1.0" encoding="UTF-8"?>
<lab name="Basic Router" id="abc123" version="1">
  <description>Basic router troubleshooting lab</description>
  <author>NetOps Tower</author>
  
  <topology>
    <nodes>
      <node id="1" name="R1" type="qemu" template="vios" 
            image="vios-adventerprisek9-m-15.5" 
            cpu="1" ram="512" ethernet="4">
        <interface id="0" name="Gi0/0" type="ethernet" network_id="1"/>
        <interface id="1" name="Gi0/1" type="ethernet" network_id="2"/>
      </node>
      
      <node id="2" name="SW1" type="qemu" template="viosl2"
            image="viosl2-adventerprisek9-m-15.2"
            cpu="1" ram="512" ethernet="16">
        <interface id="0" name="Gi0/0" type="ethernet" network_id="1"/>
      </node>
    </nodes>
    
    <networks>
      <network id="1" name="Management" type="pnet0"/>
      <network id="2" name="Internal" type="bridge"/>
    </networks>
  </topology>
  
  <configs>
    <config id="1">
      hostname R1
      interface GigabitEthernet0/0
       ip address dhcp
      !
    </config>
  </configs>
</lab>
```

---

## Ticket Lab Architecture

For each ticket type, we pre-configure labs that can be cloned per-player:

### Base Lab Strategy

```
/opt/unetlab/labs/
├── templates/                    # Base lab templates
│   ├── basic_routing.unl
│   ├── vlan_trouble.unl
│   ├── ospf_neighbors.unl
│   └── bgp_peering.unl
└── game/
    └── players/
        ├── player_abc123/       # Per-player lab instances
        │   ├── ticket_001.unl
        │   └── ticket_002.unl
        └── player_def456/
            └── ticket_001.unl
```

### Lab Lifecycle for Tickets

```
1. Player accepts ticket
   └── Game server clones template lab to player folder
   
2. Player works on lab
   └── All node interactions go through game server
   
3. Player submits solution
   └── Validation engine checks criteria
   
4. Cleanup
   └── Lab stopped, configs exported, optionally deleted
```

---

## Console Proxy Architecture

### WebSocket-to-Telnet Proxy

```python
# Simplified proxy flow
async def handle_websocket(ws, node_info):
    # Connect to EVE-NG node's telnet console
    reader, writer = await asyncio.open_connection(
        node_info.host, 
        node_info.port
    )
    
    async def ws_to_telnet():
        async for msg in ws:
            writer.write(msg.encode())
            await writer.drain()
    
    async def telnet_to_ws():
        while True:
            data = await reader.read(1024)
            if not data:
                break
            await ws.send(data.decode(errors='replace'))
    
    await asyncio.gather(ws_to_telnet(), telnet_to_ws())
```

### Terminal Negotiation

For full terminal emulation, we handle telnet negotiation:

```python
# Telnet protocol codes
IAC = 255  # Interpret As Command
DO = 253
DONT = 254
WILL = 251
WONT = 252
SB = 250   # Subnegotiation Begin
SE = 240   # Subnegotiation End

# NAWS (Negotiate About Window Size)
NAWS = 31

# Handle terminal size updates from browser
async def send_terminal_size(writer, cols, rows):
    msg = bytes([
        IAC, SB, NAWS,
        (cols >> 8) & 0xff, cols & 0xff,
        (rows >> 8) & 0xff, rows & 0xff,
        IAC, SE
    ])
    writer.write(msg)
    await writer.drain()
```

---

## Validation Strategies

### Ping Validation

```python
async def validate_ping(node_id, destination, expected_success=100):
    """
    Execute ping from node and check results.
    Uses EVE-NG console to run the command.
    """
    command = f"ping {destination} count 4"
    output = await execute_command(node_id, command)
    
    # Parse output for success rate
    # "4 packets transmitted, 4 received, 0% packet loss"
    match = re.search(r'(\d+)% packet loss', output)
    if match:
        loss = int(match.group(1))
        success_rate = 100 - loss
        return success_rate >= expected_success
    return False
```

### Command Output Validation

```python
async def validate_command(node_id, command, contains=None, not_contains=None):
    """
    Run command and check output for expected strings.
    """
    output = await execute_command(node_id, command)
    
    if contains:
        for text in contains:
            if text not in output:
                return False
    
    if not_contains:
        for text in not_contains:
            if text in output:
                return False
    
    return True
```

### Config Validation

```python
async def validate_config(node_id, required_lines):
    """
    Check startup-config contains required configuration.
    """
    config = await get_node_config(node_id)
    
    for line in required_lines:
        if line not in config:
            return False
    
    return True
```

---

## Security Considerations

### Lab Isolation

Each player gets isolated lab instances:

```python
def get_player_lab_path(player_id: str, ticket_id: str) -> str:
    """Generate unique lab path for player"""
    # Hash player ID for privacy
    player_hash = hashlib.md5(player_id.encode()).hexdigest()[:8]
    return f"/game/players/{player_hash}/{ticket_id}.unl"
```

### Rate Limiting

```python
# Per-player limits
MAX_CONCURRENT_LABS = 2
MAX_CONSOLE_CONNECTIONS = 4
API_REQUESTS_PER_MINUTE = 60
```

### Input Sanitization

Commands sent to terminals are logged and can be filtered:

```python
BLOCKED_PATTERNS = [
    r':(){ :|:& };:',  # Fork bomb
    r'rm -rf /',        # Destructive
    r'mkfs\.',          # Filesystem damage
]

def sanitize_input(data: str) -> str:
    for pattern in BLOCKED_PATTERNS:
        if re.search(pattern, data):
            raise SecurityError("Blocked command pattern detected")
    return data
```

---

## Performance Optimization

### Lab Caching

Keep frequently-used labs in "warm" state:

```python
class LabPool:
    """Pool of pre-warmed lab instances"""
    
    def __init__(self, eve_client, template_path, pool_size=5):
        self.pool = asyncio.Queue(maxsize=pool_size)
        self.template = template_path
        
    async def get_lab(self) -> str:
        """Get a ready lab or clone new one"""
        try:
            return self.pool.get_nowait()
        except asyncio.QueueEmpty:
            return await self.clone_template()
    
    async def return_lab(self, lab_path: str):
        """Reset and return lab to pool"""
        await self.reset_lab(lab_path)
        await self.pool.put(lab_path)
```

### Console Connection Pooling

Reuse connections where possible:

```python
class ConsolePool:
    """Pool of console connections"""
    
    def __init__(self, max_per_node=3):
        self.connections = {}  # node_id -> List[Connection]
        
    async def get_connection(self, node_id, host, port):
        """Get existing or create new connection"""
        if node_id in self.connections:
            for conn in self.connections[node_id]:
                if not conn.in_use:
                    conn.in_use = True
                    return conn
        
        # Create new
        conn = await self.create_connection(host, port)
        self.connections.setdefault(node_id, []).append(conn)
        return conn
```

---

## References

- [EVE-NG Official Documentation](https://www.eve-ng.net/index.php/documentation/)
- [EVE-NG API Reference](https://www.eve-ng.net/index.php/how-to-eve-ng-api/)
- [evengsdk Python Library](https://github.com/ttafsir/evengsdk)
- [xterm.js Documentation](https://xtermjs.org/)
- [Telnet Protocol RFC 854](https://www.rfc-editor.org/rfc/rfc854)
