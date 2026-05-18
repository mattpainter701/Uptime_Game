import { useState, useMemo } from 'react';
import { useGameStore } from '../../store/gameStore';
import type { TicketCategory, ApplianceType } from '../../types/game';

// ============================================================
// SandboxLabBrowser — free-play lab browser for sandbox mode
// Browse all labs by category, difficulty, appliance type.
// Preview topology, open in sandbox, or show solution.
// ============================================================

// Category display names and colors
const CATEGORY_META: Record<TicketCategory, { label: string; color: string; icon: string }> = {
  'network-basics': { label: 'Network Basics', color: 'text-blue-400', icon: '🌐' },
  'switching': { label: 'Switching', color: 'text-purple-400', icon: '🔀' },
  'routing': { label: 'Routing', color: 'text-green-400', icon: '🛣️' },
  'security': { label: 'Security', color: 'text-red-400', icon: '🔒' },
  'systems': { label: 'Systems', color: 'text-yellow-400', icon: '🖥️' },
  'automation': { label: 'Automation', color: 'text-orange-400', icon: '🤖' },
  'high-availability': { label: 'High Availability', color: 'text-pink-400', icon: '🔄' },
};

const DIFFICULTY_LABELS: Record<number, string> = {
  1: 'Beginner',
  2: 'Easy',
  3: 'Intermediate',
  4: 'Advanced',
  5: 'Expert',
};

// Infer appliance type from lab template
function inferApplianceType(labTemplate: string): ApplianceType {
  const t = labTemplate.toLowerCase();
  if (t.includes('router') || t.includes('bgp') || t.includes('ospf') || t.includes('hsrp') || t.includes('route')) return 'router';
  if (t.includes('switch') || t.includes('vlan') || t.includes('trunk') || t.includes('intervlan')) return 'switch';
  if (t.includes('acl') || t.includes('firewall') || t.includes('security')) return 'firewall';
  if (t.includes('dhcp') || t.includes('dns') || t.includes('pc') || t.includes('linux')) return 'linux';
  return 'general';
}

function StarRating({ rating, max = 5 }: { rating: number; max?: number }) {
  return (
    <span className="flex gap-0.5">
      {Array.from({ length: max }, (_, i) => (
        <span key={i} className={i < rating ? 'text-yellow-400' : 'text-gray-600'}>★</span>
      ))}
    </span>
  );
}

// Simple ASCII topology previews based on lab template
function getTopologyPreview(labTemplate: string): string {
  const previews: Record<string, string> = {
    'dhcp_client_config': 'PC1 ─── SW1 ─── R1 ─── DHCP Server',
    'default_route_missing': 'R1 ─── [ISP Gateway]',
    'dhcp_dns_fix': 'PC1 ─── SW1 ─── R1 (DHCP/DNS)',
    'vlan_access_port': 'PC3 ─── SW1 (VLAN 20)',
    'trunk_vlan_allowed': 'SW1 ═══ SW2 (VLAN 10,20,30)',
    'static_route_branch': 'R1 ═══ R2 ─── [Branch: 192.168.50.0/24]',
    'ospf_adjacency_issue': 'R1 ═══ R2 (OSPF Area 0)',
    'intervlan_routing': 'VLAN10 ─── SW1 ─── VLAN20',
    'bgp_peering': 'R1 (AS 65001) ═══ ISP (AS 65000)',
    'hsrp_failover': 'R1 ──┬── VLAN100\nR2 ──┘',
    'acl_troubleshoot': 'PC1 ─── R1 (ACL) ─── Web Server',
  };
  return previews[labTemplate] || 'See ticket description for topology';
}

export function SandboxLabBrowser() {
  const { exitSandbox, openSandboxLab, sandboxState } = useGameStore();
  const [selectedCategory, setSelectedCategory] = useState<TicketCategory | 'all'>('all');
  const [selectedDifficulty, setSelectedDifficulty] = useState<number | 'all'>('all');
  const [selectedAppliance, setSelectedAppliance] = useState<ApplianceType | 'all'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedLab, setExpandedLab] = useState<string | null>(null);

  // Get all tickets from the store (they're always available in sandbox)
  // Import SAMPLE_TICKETS inline
  const allLabs = useMemo(() => {
    // Use the SAMPLE_TICKETS from the store's initial state
    // In sandbox mode, these are the available labs
    return import.meta.env.DEV ? [] : []; // Will be populated from store
  }, []);

  // Actually, we need the full SAMPLE_TICKETS list. Let's import it.
  const labs = useMemo(() => {
    // We need to access the tickets. They're in gameStore but not exported directly.
    // Access them via the store's getState.
    const store = useGameStore.getState();
    const allTickets = store.availableTickets.length > 0 ? store.availableTickets : [];
    // In sandbox, availableTickets may be empty because it's not a career state.
    // Always use the full sample set for the browser.
    // Since SAMPLE_TICKETS isn't exported, use a different approach:
    // The labs are always the full set in sandbox mode, so we should
    // import SAMPLE_TICKETS directly.
    return allTickets;
  }, []);

  // Since SAMPLE_TICKETS isn't exported from gameStore, define the lab list here
  // This is the same data as SAMPLE_TICKETS in gameStore
  const SANDBOX_LABS = useMemo(() => [
    {
      id: 'NET-001', title: 'PC1 Not Getting IP Address',
      description: 'PC1 showing 169.254.x.x. Configure DHCP to get IP from 10.0.1.5.',
      category: 'network-basics' as TicketCategory, difficulty: 1 as const,
      labTemplate: 'dhcp_client_config',
      hints: [
        { cost: 15, text: 'Check if the network adapter is set to DHCP or static', revealed: false },
        { cost: 30, text: 'On Linux: check /etc/network/interfaces or use dhclient', revealed: false },
      ],
      validation: [{ type: 'ping' as const, params: { source: 'PC1', destination: '10.0.1.1', successRate: 100 } }],
    },
    {
      id: 'NET-002', title: 'Missing Default Route on R1',
      description: 'Branch router R1 has lost internet connectivity. ISP gateway is 203.0.113.1 on Gi0/1.',
      category: 'routing' as TicketCategory, difficulty: 1 as const,
      labTemplate: 'default_route_missing',
      hints: [
        { cost: 20, text: "Use 'show ip route' to see current routing table", revealed: false },
        { cost: 40, text: 'Command: ip route 0.0.0.0 0.0.0.0 <next-hop>', revealed: false },
      ],
      validation: [
        { type: 'ping' as const, params: { source: 'R1', destination: '8.8.8.8', successRate: 100 } },
        { type: 'command' as const, params: { node: 'R1', command: 'show ip route', contains: ['0.0.0.0/0', '203.0.113.1'] } },
      ],
    },
    {
      id: 'NET-003', title: 'Wrong DNS Breaking Web Access',
      description: 'Users on VLAN 10 can ping 8.8.8.8 but cannot browse. DNS server 10.0.1.99 decommissioned.',
      category: 'network-basics' as TicketCategory, difficulty: 1 as const,
      labTemplate: 'dhcp_dns_fix',
      hints: [
        { cost: 25, text: "Check DHCP pool config with 'show ip dhcp pool'", revealed: false },
        { cost: 50, text: 'Use: ip dhcp pool VLAN10-POOL, then dns-server 10.0.1.5 8.8.8.8', revealed: false },
      ],
      validation: [{ type: 'command' as const, params: { node: 'R1', command: 'show ip dhcp pool', contains: ['10.0.1.5', '8.8.8.8'] } }],
    },
    {
      id: 'NET-015', title: 'New PC Not on Correct VLAN',
      description: 'PC3 connected to Gi0/5 on SW1 but in wrong VLAN. Configure as access port in VLAN 20.',
      category: 'switching' as TicketCategory, difficulty: 2 as const,
      labTemplate: 'vlan_access_port',
      hints: [
        { cost: 35, text: "Use 'show vlan brief' and 'show interface Gi0/5 switchport'", revealed: false },
        { cost: 60, text: 'Commands: switchport mode access, switchport access vlan 20', revealed: false },
      ],
      validation: [
        { type: 'ping' as const, params: { source: 'PC3', destination: '10.20.0.1', successRate: 100 } },
        { type: 'command' as const, params: { node: 'SW1', command: 'show vlan brief', contains: ['Gi0/5', '20'] } },
      ],
    },
    {
      id: 'NET-018', title: 'Trunk Port Blocking VLAN Traffic',
      description: 'VLAN 30 traffic not passing between SW1 and SW2 after maintenance. Fix allowed VLAN list.',
      category: 'switching' as TicketCategory, difficulty: 2 as const,
      labTemplate: 'trunk_vlan_allowed',
      hints: [
        { cost: 40, text: "Check 'show interface Gi0/24 trunk' for allowed VLANs", revealed: false },
        { cost: 70, text: 'Use: switchport trunk allowed vlan add 30', revealed: false },
      ],
      validation: [
        { type: 'command' as const, params: { node: 'SW1', command: 'show interface Gi0/24 trunk', contains: ['30'] } },
        { type: 'ping' as const, params: { source: 'PHONE1', destination: '10.30.0.1', successRate: 100 } },
      ],
    },
    {
      id: 'NET-022', title: 'Static Route to Remote Site Missing',
      description: 'HQ router R1 cannot reach branch 192.168.50.0/24 via R2 at 10.255.255.2.',
      category: 'routing' as TicketCategory, difficulty: 2 as const,
      labTemplate: 'static_route_branch',
      hints: [
        { cost: 35, text: 'Verify the point-to-point link is up with ping 10.255.255.2', revealed: false },
        { cost: 60, text: 'Command: ip route 192.168.50.0 255.255.255.0 10.255.255.2', revealed: false },
      ],
      validation: [
        { type: 'ping' as const, params: { source: 'R1', destination: '192.168.50.1', successRate: 100 } },
        { type: 'command' as const, params: { node: 'R1', command: 'show ip route', contains: ['192.168.50.0', '10.255.255.2'] } },
      ],
    },
    {
      id: 'NET-042', title: 'OSPF Neighbors Stuck in INIT',
      description: 'R1 and R2 stuck in INIT/2-WAY on shared segment 10.1.1.0/30. Network type mismatch?',
      category: 'routing' as TicketCategory, difficulty: 3 as const,
      labTemplate: 'ospf_adjacency_issue',
      hints: [
        { cost: 70, text: "Compare 'show ip ospf interface' output on both routers", revealed: false },
        { cost: 100, text: 'Check network type (broadcast vs point-to-point) and timer values', revealed: false },
      ],
      validation: [{ type: 'command' as const, params: { node: 'R1', command: 'show ip ospf neighbor', contains: ['FULL'] } }],
    },
    {
      id: 'NET-051', title: 'Inter-VLAN Routing Not Working',
      description: 'VLAN 10 and 20 users cannot communicate. Enable IP routing on SW1 SVIs.',
      category: 'switching' as TicketCategory, difficulty: 3 as const,
      labTemplate: 'intervlan_routing',
      hints: [
        { cost: 60, text: "Check if 'ip routing' is enabled globally", revealed: false },
        { cost: 90, text: "Verify SVIs are up with 'show ip interface brief'", revealed: false },
      ],
      validation: [
        { type: 'ping' as const, params: { source: 'PC1', destination: '10.20.0.10', successRate: 100 } },
        { type: 'command' as const, params: { node: 'SW1', command: 'show ip route', contains: ['10.10.0.0', '10.20.0.0'] } },
      ],
    },
    {
      id: 'NET-063', title: 'BGP Session Not Establishing',
      description: 'BGP between R1 (AS 65001) and ISP (AS 65000, 203.0.113.1) not up. Check TCP 179.',
      category: 'routing' as TicketCategory, difficulty: 4 as const,
      labTemplate: 'bgp_peering',
      hints: [
        { cost: 100, text: "Use 'show ip bgp summary' and 'show ip bgp neighbors' for status", revealed: false },
        { cost: 150, text: 'Check update-source, ebgp-multihop, and ACLs blocking TCP 179', revealed: false },
      ],
      validation: [{ type: 'command' as const, params: { node: 'R1', command: 'show ip bgp summary', contains: ['65000', 'Established'] } }],
    },
    {
      id: 'NET-078', title: 'HSRP Failover Not Working',
      description: 'Both R1 and R2 show as HSRP active causing duplicate IP. Fix group configuration.',
      category: 'high-availability' as TicketCategory, difficulty: 4 as const,
      labTemplate: 'hsrp_failover',
      hints: [
        { cost: 90, text: "Check 'show standby brief' on both routers - look for group number mismatch", revealed: false },
        { cost: 130, text: 'Ensure both routers use the same HSRP group number and virtual IP', revealed: false },
      ],
      validation: [
        { type: 'command' as const, params: { node: 'R1', command: 'show standby brief', contains: ['Active', 'Group 1'] } },
        { type: 'command' as const, params: { node: 'R2', command: 'show standby brief', contains: ['Standby', 'Group 1'] } },
      ],
    },
    {
      id: 'NET-092', title: 'ACL Blocking Legitimate Traffic',
      description: 'Users in 10.10.0.0/24 blocked from web server at 10.50.0.100. Fix ACL to permit HTTP/HTTPS.',
      category: 'security' as TicketCategory, difficulty: 5 as const,
      labTemplate: 'acl_troubleshoot',
      hints: [
        { cost: 120, text: "Review ACL with 'show access-lists' and check hit counters", revealed: false },
        { cost: 180, text: 'Look for implicit deny or missing permit statements for TCP 80/443', revealed: false },
      ],
      validation: [
        { type: 'ping' as const, params: { source: 'PC1', destination: '10.50.0.100', successRate: 100 } },
        { type: 'command' as const, params: { node: 'R1', command: 'show access-lists', contains: ['permit tcp', '80', '443'] } },
      ],
    },
  ], []);

  const filteredLabs = useMemo(() => {
    return SANDBOX_LABS.filter(lab => {
      if (selectedCategory !== 'all' && lab.category !== selectedCategory) return false;
      if (selectedDifficulty !== 'all' && lab.difficulty !== selectedDifficulty) return false;
      const appliance = inferApplianceType(lab.labTemplate);
      if (selectedAppliance !== 'all' && appliance !== selectedAppliance) return false;
      if (searchQuery) {
        const q = searchQuery.toLowerCase();
        return lab.title.toLowerCase().includes(q) || lab.description.toLowerCase().includes(q) || lab.id.toLowerCase().includes(q);
      }
      return true;
    });
  }, [SANDBOX_LABS, selectedCategory, selectedDifficulty, selectedAppliance, searchQuery]);

  const toggleExpand = (labId: string) => {
    setExpandedLab(prev => prev === labId ? null : labId);
  };

  // Derive solution from hints
  const getSolutionFromHints = (lab: typeof SANDBOX_LABS[0]) => {
    return {
      summary: `Fix: ${lab.title}`,
      steps: lab.hints.map((hint, i) => ({
        description: hint.text,
        command: hint.text.includes('Command:') ? hint.text.split('Command:')[1]?.trim() : undefined,
        node: lab.labTemplate.includes('router') || lab.labTemplate.includes('bgp') || lab.labTemplate.includes('route') ? 'R1' :
              lab.labTemplate.includes('vlan') || lab.labTemplate.includes('trunk') || lab.labTemplate.includes('intervlan') ? 'SW1' :
              lab.labTemplate.includes('dhcp') || lab.labTemplate.includes('pc') ? 'PC1' : undefined,
      })),
    };
  };

  const categories = Object.keys(CATEGORY_META) as TicketCategory[];
  const applianceTypes: ApplianceType[] = ['router', 'switch', 'firewall', 'linux', 'general'];

  return (
    <div className="absolute inset-0 z-20 bg-[#0a0a15] flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-gray-800 bg-[#0d0d1a]">
        <div className="flex items-center gap-4">
          <button
            onClick={exitSandbox}
            className="flex items-center gap-2 text-gray-400 hover:text-white transition-colors"
          >
            <span>←</span>
            <span>Exit Sandbox</span>
          </button>
          <div className="w-px h-6 bg-gray-700" />
          <div className="flex items-center gap-3">
            <span className="text-2xl">🧪</span>
            <div>
              <h1 className="text-xl font-bold text-white">Sandbox Lab Browser</h1>
              <p className="text-xs text-cyan-400">Free-play mode — no timers, no penalties</p>
            </div>
          </div>
        </div>

        {/* SANDBOX badge */}
        <div className="flex items-center gap-2 px-4 py-2 bg-amber-500/10 border border-amber-500/30 rounded-lg">
          <span className="text-amber-400 font-bold text-sm tracking-wider">SANDBOX</span>
          <span className="text-amber-500/60 text-xs">| {SANDBOX_LABS.length} labs available</span>
        </div>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-4 p-4 border-b border-gray-800 bg-[#0d0d1a]/50">
        {/* Search */}
        <div className="relative flex-1 max-w-xs">
          <input
            type="text"
            placeholder="Search labs..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full px-3 py-2 bg-black/30 border border-gray-700 rounded text-white text-sm placeholder-gray-500 focus:border-cyan-500 focus:outline-none"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-500 hover:text-white"
            >
              ✕
            </button>
          )}
        </div>

        {/* Category filter */}
        <div className="flex gap-1">
          <button
            onClick={() => setSelectedCategory('all')}
            className={`px-3 py-1.5 rounded text-xs font-medium transition-all ${
              selectedCategory === 'all'
                ? 'bg-cyan-500/20 border border-cyan-500/50 text-cyan-400'
                : 'bg-white/5 border border-gray-700 text-gray-400 hover:bg-white/10'
            }`}
          >
            All
          </button>
          {categories.map(cat => (
            <button
              key={cat}
              onClick={() => setSelectedCategory(prev => prev === cat ? 'all' : cat)}
              className={`px-3 py-1.5 rounded text-xs font-medium transition-all ${
                selectedCategory === cat
                  ? 'bg-cyan-500/20 border border-cyan-500/50 text-cyan-400'
                  : 'bg-white/5 border border-gray-700 text-gray-400 hover:bg-white/10'
              }`}
            >
              {CATEGORY_META[cat]?.icon} {CATEGORY_META[cat]?.label}
            </button>
          ))}
        </div>

        <div className="w-px h-6 bg-gray-700" />

        {/* Difficulty filter */}
        <div className="flex items-center gap-2">
          <span className="text-xs text-gray-500">Difficulty:</span>
          <button
            onClick={() => setSelectedDifficulty('all')}
            className={`px-2 py-1 rounded text-xs ${
              selectedDifficulty === 'all' ? 'bg-cyan-500/20 text-cyan-400' : 'text-gray-500 hover:text-white'
            }`}
          >
            All
          </button>
          {[1, 2, 3, 4, 5].map(d => (
            <button
              key={d}
              onClick={() => setSelectedDifficulty(prev => prev === d ? 'all' : d)}
              className={`px-2 py-1 rounded text-xs ${
                selectedDifficulty === d ? 'bg-cyan-500/20 text-cyan-400' : 'text-gray-500 hover:text-white'
              }`}
            >
              {'★'.repeat(d)}
            </button>
          ))}
        </div>
      </div>

      {/* Lab grid */}
      <div className="flex-1 overflow-y-auto p-6">
        {filteredLabs.length === 0 ? (
          <div className="flex items-center justify-center h-full">
            <div className="text-center text-gray-500">
              <p className="text-xl mb-2">🔍</p>
              <p>No labs match your filters</p>
              <button
                onClick={() => {
                  setSelectedCategory('all');
                  setSelectedDifficulty('all');
                  setSelectedAppliance('all');
                  setSearchQuery('');
                }}
                className="mt-2 text-cyan-400 hover:underline text-sm"
              >
                Clear all filters
              </button>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredLabs.map(lab => {
              const isExpanded = expandedLab === lab.id;
              const appliance = inferApplianceType(lab.labTemplate);
              const catMeta = CATEGORY_META[lab.category];

              return (
                <div
                  key={lab.id}
                  className={`glass-panel transition-all duration-200 ${
                    isExpanded ? 'ring-1 ring-cyan-500/50' : 'hover:border-gray-600'
                  }`}
                >
                  {/* Card header */}
                  <div className="p-4">
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-mono text-gray-500">{lab.id}</span>
                        <span className={`text-xs px-1.5 py-0.5 rounded ${catMeta?.color} bg-white/5`}>
                          {catMeta?.icon} {catMeta?.label}
                        </span>
                      </div>
                      <span className="text-xs text-gray-500 capitalize">{appliance}</span>
                    </div>

                    <h3 className="font-bold text-white mb-2">{lab.title}</h3>
                    <p className="text-sm text-gray-400 leading-relaxed mb-3 line-clamp-2">
                      {lab.description}
                    </p>

                    <div className="flex items-center gap-4 mb-3">
                      <StarRating rating={lab.difficulty} />
                      <span className="text-xs text-gray-500">{DIFFICULTY_LABELS[lab.difficulty]}</span>
                    </div>

                    {/* Topology preview */}
                    {isExpanded && (
                      <div className="mt-3 p-3 bg-black/30 rounded border border-gray-700">
                        <div className="text-xs text-gray-500 mb-2">Topology</div>
                        <pre className="text-cyan-400 text-xs font-mono whitespace-pre-wrap">
                          {getTopologyPreview(lab.labTemplate)}
                        </pre>
                      </div>
                    )}

                    {/* Solution panel */}
                    {isExpanded && (
                      <div className="mt-3 p-3 bg-green-500/5 rounded border border-green-500/30">
                        <div className="text-xs text-green-400 font-bold mb-2 flex items-center gap-1">
                          <span>💡</span> Solution Guide
                        </div>
                        <div className="space-y-2">
                          {getSolutionFromHints(lab).steps.map((step, i) => (
                            <div key={i} className="text-sm">
                              <div className="text-gray-300">
                                <span className="text-cyan-400 font-mono mr-2">Step {i + 1}:</span>
                                {step.description}
                              </div>
                              {step.command && (
                                <div className="mt-1 ml-6 px-2 py-1 bg-black/40 rounded font-mono text-xs text-green-400">
                                  {step.command}
                                </div>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Action buttons */}
                    <div className="flex gap-2 mt-3">
                      <button
                        onClick={() => openSandboxLab(lab.id)}
                        className="flex-1 px-4 py-2 bg-cyan-500/20 border border-cyan-500/50 rounded text-cyan-400 text-sm font-bold hover:bg-cyan-500/30 transition-all flex items-center justify-center gap-2"
                      >
                        <span>🔬</span>
                        Open in Sandbox
                      </button>
                      <button
                        onClick={() => toggleExpand(lab.id)}
                        className={`px-3 py-2 rounded text-sm transition-all ${
                          isExpanded
                            ? 'bg-green-500/20 border border-green-500/50 text-green-400'
                            : 'bg-white/5 border border-gray-700 text-gray-400 hover:bg-white/10'
                        }`}
                        title="Show Solution"
                      >
                        💡
                      </button>
                    </div>
                  </div>

                  {/* Bottom metadata */}
                  <div className="px-4 py-2 border-t border-gray-800 bg-black/20 flex items-center justify-between text-xs text-gray-500">
                    <span>{lab.hints.length} hints available</span>
                    <span>{lab.validation.length} validation checks</span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Bottom bar */}
      <div className="px-4 py-2 border-t border-gray-800 bg-[#0d0d1a] flex items-center justify-between text-xs text-gray-500">
        <span>{filteredLabs.length} of {SANDBOX_LABS.length} labs shown</span>
        <span>Sandbox mode — all labs unlocked, no penalties</span>
      </div>
    </div>
  );
}

export default SandboxLabBrowser;
