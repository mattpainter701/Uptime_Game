import { useState } from 'react';
import { useGameStore } from '../../store/gameStore';

interface Article {
  id: string;
  category: string;
  title: string;
  content: string;
}

const ARTICLES: Article[] = [
  // Network Basics
  { id: 'nb-1', category: 'network-basics', title: 'DHCP Troubleshooting', content: 'DHCP assigns IP addresses automatically.\n\nKey commands:\n  show ip dhcp pool\n  show ip dhcp binding\n  dhclient (Linux)\n\nCommon issues:\n- DHCP server unreachable\n- Pool exhausted\n- Wrong DNS/gateway being assigned\n- Interface not set to DHCP mode' },
  { id: 'nb-2', category: 'network-basics', title: 'DNS Resolution', content: 'DNS translates hostnames to IP addresses.\n\nKey commands:\n  nslookup <hostname>\n  show ip dns view\n  ip name-server <IP>\n\nCommon issues:\n- Wrong DNS server configured\n- DNS server unreachable\n- Missing DNS entries' },
  { id: 'nb-3', category: 'network-basics', title: 'Default Routes', content: 'A default route (0.0.0.0/0) is the gateway of last resort.\n\nKey commands:\n  show ip route\n  ip route 0.0.0.0 0.0.0.0 <next-hop>\n\nCommon issues:\n- Missing default route\n- Wrong next-hop address\n- Interface down on gateway path' },
  // Switching
  { id: 'sw-1', category: 'switching', title: 'VLAN Configuration', content: 'VLANs segment broadcast domains.\n\nKey commands:\n  show vlan brief\n  show interface switchport\n  switchport mode access\n  switchport access vlan <ID>\n\nCommon issues:\n- Port in wrong VLAN\n- VLAN not created on switch\n- Trunk not allowing VLAN' },
  { id: 'sw-2', category: 'switching', title: 'Trunk Links', content: 'Trunks carry multiple VLANs between switches.\n\nKey commands:\n  show interface trunk\n  switchport mode trunk\n  switchport trunk allowed vlan add <ID>\n\nCommon issues:\n- VLAN not in allowed list\n- Native VLAN mismatch\n- Encapsulation mismatch (dot1q vs ISL)' },
  { id: 'sw-3', category: 'switching', title: 'Spanning Tree Protocol', content: 'STP prevents Layer 2 loops.\n\nKey commands:\n  show spanning-tree\n  spanning-tree vlan <ID> root primary\n  spanning-tree portfast\n\nCommon issues:\n- Unexpected root bridge\n- Blocked ports causing connectivity loss\n- Topology changes causing flapping' },
  // Routing
  { id: 'rt-1', category: 'routing', title: 'OSPF Fundamentals', content: 'OSPF is a link-state routing protocol.\n\nKey commands:\n  show ip ospf neighbor\n  show ip ospf interface\n  router ospf <PID>\n  network <IP> <wildcard> area <ID>\n\nCommon issues:\n- Timer mismatch (hello/dead)\n- Network type mismatch\n- Area mismatch\n- MTU mismatch' },
  { id: 'rt-2', category: 'routing', title: 'BGP Peering', content: 'BGP connects autonomous systems.\n\nKey commands:\n  show ip bgp summary\n  show ip bgp neighbors\n  neighbor <IP> remote-as <ASN>\n\nCommon issues:\n- Wrong neighbor IP\n- Wrong remote AS number\n- Missing update-source\n- ACL blocking TCP 179' },
  { id: 'rt-3', category: 'routing', title: 'Static Routes', content: 'Static routes are manually configured paths.\n\nKey commands:\n  show ip route static\n  ip route <network> <mask> <next-hop>\n\nCommon issues:\n- Wrong next-hop\n- Wrong subnet mask\n- Next-hop unreachable' },
  // Security
  { id: 'sec-1', category: 'security', title: 'Access Control Lists', content: 'ACLs filter traffic based on rules.\n\nKey commands:\n  show access-lists\n  access-list <num> permit/deny <protocol> <src> <dst>\n  ip access-group <name> in/out\n\nImportant: Implicit deny at end!\n- Order matters - first match wins\n- Remember to permit what you need' },
  { id: 'sec-2', category: 'security', title: 'SSH Configuration', content: 'SSH provides encrypted remote access.\n\nKey commands:\n  show ip ssh\n  crypto key generate rsa modulus 2048\n  line vty 0 4 / transport input ssh\n  ip ssh version 2\n\nRequirements:\n- Hostname set\n- Domain name set\n- RSA keys generated' },
  // Systems
  { id: 'sys-1', category: 'systems', title: 'Server Health Checks', content: 'Monitor server health proactively.\n\nKey commands (Linux):\n  top / htop - CPU and memory\n  df -h - disk usage\n  free -h - memory\n  dmesg | tail - kernel messages\n  smartctl -a /dev/sda - disk health\n\nWatch for:\n- High CPU (>90%)\n- Low memory\n- Disk near capacity\n- SMART errors' },
  // Automation
  { id: 'auto-1', category: 'automation', title: 'Network Automation Basics', content: 'Automate repetitive network tasks.\n\nTools:\n- Ansible: agentless, YAML playbooks\n- Python + Netmiko: SSH scripting\n- SNMP: monitoring and polling\n\nBest practices:\n- Start with read-only tasks\n- Test in lab first\n- Use version control\n- Document everything' },
  // High Availability
  { id: 'ha-1', category: 'high-availability', title: 'HSRP/VRRP', content: 'First Hop Redundancy Protocols.\n\nKey commands:\n  show standby brief (HSRP)\n  show vrrp brief (VRRP)\n  standby <group> ip <VIP>\n  standby <group> priority <value>\n\nCommon issues:\n- Group number mismatch\n- Virtual IP mismatch\n- Priority/preempt misconfiguration' },
];

const CATEGORIES = [
  { id: 'all', label: 'All' },
  { id: 'network-basics', label: 'Network Basics' },
  { id: 'switching', label: 'Switching' },
  { id: 'routing', label: 'Routing' },
  { id: 'security', label: 'Security' },
  { id: 'systems', label: 'Systems' },
  { id: 'automation', label: 'Automation' },
  { id: 'high-availability', label: 'High Availability' },
];

export function KnowledgeBasePanel() {
  const { setView } = useGameStore();
  const [filter, setFilter] = useState('all');
  const [selectedArticle, setSelectedArticle] = useState<Article | null>(null);

  const filtered = filter === 'all' ? ARTICLES : ARTICLES.filter((a) => a.category === filter);

  return (
    <div className="absolute inset-0 flex items-center justify-center z-20 bg-black/60 backdrop-blur-sm">
      <div className="w-full max-w-3xl max-h-[85vh] m-4 glass-panel flex flex-col">
        <div className="flex items-center justify-between p-4 border-b border-gray-700">
          <div className="flex items-center gap-3">
            <span className="text-3xl">📚</span>
            <div>
              <h2 className="text-xl font-bold text-white">Knowledge Base</h2>
              <p className="text-sm text-gray-400">Reference guides for network engineering</p>
            </div>
          </div>
          <button
            onClick={() => setView('office')}
            className="w-10 h-10 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-xl"
          >
            ✕
          </button>
        </div>

        {/* Category filter */}
        <div className="flex gap-2 p-3 border-b border-gray-700 overflow-x-auto">
          {CATEGORIES.map((cat) => (
            <button
              key={cat.id}
              onClick={() => { setFilter(cat.id); setSelectedArticle(null); }}
              className={`px-3 py-1.5 rounded text-xs whitespace-nowrap ${
                filter === cat.id
                  ? 'bg-cyan-500/30 border border-cyan-500 text-cyan-400'
                  : 'bg-white/5 border border-gray-600 text-gray-400 hover:bg-white/10'
              }`}
            >
              {cat.label}
            </button>
          ))}
        </div>

        <div className="flex-1 overflow-y-auto p-4">
          {selectedArticle ? (
            <div>
              <button
                onClick={() => setSelectedArticle(null)}
                className="text-cyan-400 text-sm mb-4 hover:underline"
              >
                ← Back to articles
              </button>
              <h3 className="text-lg font-bold text-white mb-4">{selectedArticle.title}</h3>
              <pre className="text-gray-300 text-sm whitespace-pre-wrap font-mono leading-relaxed bg-black/30 p-4 rounded-lg">
                {selectedArticle.content}
              </pre>
            </div>
          ) : (
            <div className="grid gap-3">
              {filtered.map((article) => (
                <button
                  key={article.id}
                  onClick={() => setSelectedArticle(article)}
                  className="text-left p-4 rounded-lg bg-white/5 border border-gray-600 hover:border-cyan-500/50 hover:bg-cyan-500/5 transition-all"
                >
                  <div className="font-bold text-white">{article.title}</div>
                  <div className="text-xs text-gray-400 mt-1">
                    {article.content.substring(0, 80)}...
                  </div>
                </button>
              ))}
              {filtered.length === 0 && (
                <p className="text-gray-500 text-center py-8">No articles in this category yet.</p>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
