import type { TicketTemplate } from './ticketTemplates';

/**
 * Sprint 5: Ticket Engine v2 — 45+ parameterized ticket templates.
 *
 * Coverage grid (category × tier):
 *   network-basics     T1-T2
 *   switching          T1-T5
 *   routing            T2-T5
 *   security           T2-T5
 *   systems            T2-T4
 *   automation         T3-T5
 *   high-availability  T3-T5
 *   wireless           T1-T4
 *   voice              T2-T4
 *   datacenter         T3-T5
 */

export const TICKET_TEMPLATES: TicketTemplate[] = [
  // ==================================================================
  // NETWORK-BASICS (Tier 1-2)
  // ==================================================================
  {
    id: 'NB-DHCP-010',
    title: 'DHCP Failure on {{segment}} — No IP Lease',
    description:
      'Devices on the {{segment}} segment are receiving APIPA (169.254.x.x) addresses and cannot reach the network. The DHCP server at {{dhcpServer}} should be handing out leases from pool {{poolName}}. Check the DHCP relay configuration on the default gateway {{gateway}}.',
    category: 'network-basics',
    difficulty: 1,
    timeLimit: 8,
    rewardCredits: 75,
    rewardXp: 40,
    labTemplate: 'dhcp_failure_{{segment}}',
    hints: [
      { cost: 15, text: "Check if the DHCP relay (ip helper-address) is configured on {{gateway}}'s LAN interface", revealed: false },
      { cost: 30, text: 'Use: show ip dhcp binding on {{dhcpServer}} to see active leases', revealed: false },
      { cost: 50, text: 'Add ip helper-address {{dhcpServer}} on the VLAN interface of {{gateway}}', revealed: false },
    ],
    validation: [
      { type: 'ping', params: { source: '{{host}}', destination: '{{dhcpServer}}', successRate: 100 } },
      { type: 'command', params: { node: '{{gateway}}', command: 'show running-config interface {{vlanIf}}', contains: ['helper-address', '{{dhcpServer}}'] } },
    ],
    requiredItems: ['laptop'],
  },
  {
    id: 'NB-DNS-020',
    title: 'DNS Resolution Failure — Clients on {{vlan}} Cannot Resolve',
    description:
      'Users on {{vlan}} can ping 8.8.8.8 but cannot browse the web. The DHCP server {{dhcpServer}} is handing out an old DNS server {{badDns}}. The correct DNS servers are {{dns1}} and {{dns2}}. Update the DHCP pool to fix resolution.',
    category: 'network-basics',
    difficulty: 1,
    timeLimit: 10,
    rewardCredits: 100,
    rewardXp: 50,
    labTemplate: 'dns_fix_{{vlan}}',
    hints: [
      { cost: 20, text: "Check the DHCP pool configuration with 'show ip dhcp pool {{poolName}}'", revealed: false },
      { cost: 40, text: 'Use: dns-server {{dns1}} {{dns2}} inside the DHCP pool config', revealed: false },
    ],
    validation: [
      { type: 'command', params: { node: '{{dhcpServer}}', command: 'show ip dhcp pool {{poolName}}', contains: ['{{dns1}}', '{{dns2}}'] } },
    ],
    requiredItems: ['laptop'],
  },
  {
    id: 'NB-IP-030',
    title: 'Duplicate IP Address Detected on {{subnet}}',
    description:
      'Multiple hosts on {{subnet}} are reporting duplicate IP address conflicts. The server {{suspectHost}} and workstation {{otherHost}} both have {{dupIp}}. One of them must be reconfigured to use a different address in the correct range ({{subnet}}/24, gateway {{gateway}}).',
    category: 'network-basics',
    difficulty: 1,
    timeLimit: 10,
    rewardCredits: 100,
    rewardXp: 50,
    labTemplate: 'dup_ip_{{subnet}}',
    hints: [
      { cost: 20, text: "Use 'show ip arp' or 'arp -a' to find which MACs claim {{dupIp}}", revealed: false },
      { cost: 40, text: 'Reconfigure {{otherHost}} to use a DHCP address or a unique static IP', revealed: false },
    ],
    validation: [
      { type: 'ping', params: { source: '{{suspectHost}}', destination: '{{gateway}}', successRate: 100 } },
      { type: 'ping', params: { source: '{{otherHost}}', destination: '{{gateway}}', successRate: 100 } },
    ],
    requiredItems: ['laptop'],
  },
  {
    id: 'NB-SUBNET-040',
    title: 'Incorrect Subnet Mask on {{host}} Preventing Communication',
    description:
      '{{host}} in {{subnetA}}/{{prefixA}} was misconfigured with subnet mask /{{wrongPrefix}}. It cannot reach devices in {{subnetB}}/{{prefixB}}. The default gateway is {{gateway}}. Fix the subnet mask on {{host}} and verify inter-subnet connectivity.',
    category: 'network-basics',
    difficulty: 2,
    timeLimit: 12,
    rewardCredits: 130,
    rewardXp: 65,
    labTemplate: 'subnet_mask_fix_{{host}}',
    hints: [
      { cost: 25, text: 'Compare subnet masks between {{host}} and other devices in {{subnetA}}', revealed: false },
      { cost: 45, text: 'On Cisco: interface config → ip address <ip> {{prefixA}}', revealed: false },
    ],
    validation: [
      { type: 'ping', params: { source: '{{host}}', destination: '{{gateway}}', successRate: 100 } },
      { type: 'ping', params: { source: '{{host}}', destination: '{{subnetBTarget}}', successRate: 100 } },
    ],
    requiredItems: ['laptop', 'console-cable'],
  },
  {
    id: 'NB-ARP-050',
    title: 'ARP Cache Poisoning Detected on {{segment}}',
    description:
      'Traffic on {{segment}} destined for {{gateway}} is being intercepted. An ARP poisoning attack has associated the gateway IP {{gateway}} with the wrong MAC address. Clear the ARP cache on {{switch}} and ensure port security is enabled on all access ports.',
    category: 'network-basics',
    difficulty: 2,
    timeLimit: 15,
    rewardCredits: 160,
    rewardXp: 80,
    labTemplate: 'arp_cache_{{switch}}',
    hints: [
      { cost: 30, text: "Use 'show ip arp' to identify the rogue MAC and port", revealed: false },
      { cost: 50, text: 'Clear ARP: clear ip arp {{gateway}} — then enable port-security on the affected port', revealed: false },
      { cost: 70, text: 'Port security: switchport port-security maximum 1, switchport port-security violation restrict', revealed: false },
    ],
    validation: [
      { type: 'command', params: { node: '{{switch}}', command: 'show ip arp', contains: ['{{gateway}}'] } },
      { type: 'ping', params: { source: '{{host}}', destination: '{{gateway}}', successRate: 100 } },
    ],
    requiredItems: ['laptop', 'console-cable'],
  },

  // ==================================================================
  // SWITCHING (Tier 1-5)
  // ==================================================================
  {
    id: 'SW-VLAN-110',
    title: 'New Host on Wrong VLAN — Port {{port}}',
    description:
      'A new workstation was connected to {{port}} on {{switch}}, but it cannot reach devices in {{vlan}} (VLAN {{vlanId}}). The port is currently in the default VLAN 1. Configure the port as an access port in VLAN {{vlanId}}.',
    category: 'switching',
    difficulty: 1,
    timeLimit: 8,
    rewardCredits: 90,
    rewardXp: 45,
    labTemplate: 'vlan_access_{{switch}}',
    hints: [
      { cost: 20, text: "Check current VLAN assignment with 'show vlan brief'", revealed: false },
      { cost: 35, text: 'Commands: interface {{port}} → switchport mode access → switchport access vlan {{vlanId}}', revealed: false },
    ],
    validation: [
      { type: 'ping', params: { source: '{{host}}', destination: '{{vlanGateway}}', successRate: 100 } },
      { type: 'command', params: { node: '{{switch}}', command: 'show vlan brief', contains: ['{{port}}'] } },
    ],
    requiredItems: ['laptop', 'console-cable'],
  },
  {
    id: 'SW-TRUNK-120',
    title: 'Trunk Port {{trunkPort}} Dropping VLAN {{vlanId}}',
    description:
      'After a maintenance window, VLAN {{vlanId}} traffic is no longer passing across the trunk {{trunkPort}} between {{switchA}} and {{switchB}}. The allowed VLAN list on the trunk is filtering it out. Fix the trunk configuration.',
    category: 'switching',
    difficulty: 2,
    timeLimit: 15,
    rewardCredits: 180,
    rewardXp: 90,
    labTemplate: 'trunk_fix_{{switchA}}',
    hints: [
      { cost: 35, text: "Use 'show interface {{trunkPort}} trunk' to see allowed VLANs", revealed: false },
      { cost: 55, text: 'Command: switchport trunk allowed vlan add {{vlanId}}', revealed: false },
    ],
    validation: [
      { type: 'command', params: { node: '{{switchA}}', command: 'show interface {{trunkPort}} trunk', contains: ['{{vlanId}}'] } },
      { type: 'ping', params: { source: '{{hostA}}', destination: '{{hostB}}', successRate: 100 } },
    ],
    requiredItems: ['laptop', 'console-cable'],
  },
  {
    id: 'SW-STP-130',
    title: 'STP Loop Causing Broadcast Storm on {{vlan}}',
    description:
      'A broadcast storm is saturating the {{vlan}} network. STP appears to have been disabled on {{switch}} and a redundant link on {{port}} is creating a loop. Re-enable spanning-tree and configure {{port}} as a designated blocked port using root guard.',
    category: 'switching',
    difficulty: 3,
    timeLimit: 20,
    rewardCredits: 300,
    rewardXp: 150,
    labTemplate: 'stp_loop_{{switch}}',
    hints: [
      { cost: 60, text: "Check STP status with 'show spanning-tree vlan {{vlanId}}'", revealed: false },
      { cost: 90, text: 'Re-enable: spanning-tree vlan {{vlanId}} — then set priority lower on the desired root bridge', revealed: false },
      { cost: 120, text: 'Root guard: spanning-tree guard root on the access port', revealed: false },
    ],
    validation: [
      { type: 'command', params: { node: '{{switch}}', command: 'show spanning-tree vlan {{vlanId}}', contains: ['This bridge is the root', 'Forwarding'] } },
      { type: 'ping', params: { source: '{{host}}', destination: '{{gateway}}', successRate: 100 } },
    ],
    requiredItems: ['laptop', 'console-cable'],
  },
  {
    id: 'SW-PSEC-140',
    title: 'Port Security Violation on {{port}} — MAC Flood',
    description:
      'Port {{port}} on {{switch}} has gone into err-disabled state due to a port security violation. The maximum MAC count was exceeded. Investigate the violation, clear the err-disabled state, and adjust the port security settings if this is a legitimate multi-MAC scenario (e.g. IP phone + PC).',
    category: 'switching',
    difficulty: 3,
    timeLimit: 18,
    rewardCredits: 280,
    rewardXp: 140,
    labTemplate: 'port_sec_{{switch}}',
    hints: [
      { cost: 55, text: "Check status: 'show interface {{port}} status' and 'show port-security interface {{port}}'", revealed: false },
      { cost: 85, text: 'Recover: shutdown → clear port-security sticky → no shutdown → adjust max to 2 if IP phone', revealed: false },
    ],
    validation: [
      { type: 'command', params: { node: '{{switch}}', command: 'show interface {{port}} status', contains: ['connected'] } },
      { type: 'ping', params: { source: '{{host}}', destination: '{{gateway}}', successRate: 100 } },
    ],
    requiredItems: ['laptop', 'console-cable'],
  },
  {
    id: 'SW-STACK-150',
    title: 'Stack Member {{memberId}} Not Joining — Version Mismatch',
    description:
      'The new switch {{memberId}} is not joining the stack on {{stackMaster}}. The stack ports are cabled correctly but the member shows as "Version Mismatch". The master is running version {{masterVer}} and the new member has {{memberVer}}. Upgrade the member to match the master version.',
    category: 'switching',
    difficulty: 4,
    timeLimit: 25,
    rewardCredits: 450,
    rewardXp: 225,
    labTemplate: 'stack_upgrade_{{stackMaster}}',
    hints: [
      { cost: 80, text: "Check stack status with 'show switch' and 'show switch detail'", revealed: false },
      { cost: 120, text: 'Copy the master IOS image to the new member: archive download-sw /overwrite tftp://{{tftpServer}}/ios.bin', revealed: false },
      { cost: 160, text: 'After upgrade, renumber the member if needed and reload', revealed: false },
    ],
    validation: [
      { type: 'command', params: { node: '{{stackMaster}}', command: 'show switch', contains: ['Ready'] } },
    ],
    requiredItems: ['laptop', 'console-cable', 'usb-drive'],
  },
  {
    id: 'SW-VTP-160',
    title: 'VTP Domain Mismatch — VLAN {{vlanId}} Not Propagating',
    description:
      'A new VLAN {{vlanId}} created on {{vtpServer}} is not appearing on {{vtpClient}}. Both switches are in VTP domain {{oldDomain}} but the domain name is inconsistent. Fix the VTP configuration so VLANs propagate correctly.',
    category: 'switching',
    difficulty: 2,
    timeLimit: 14,
    rewardCredits: 170,
    rewardXp: 85,
    labTemplate: 'vtp_fix_{{vtpServer}}',
    hints: [
      { cost: 35, text: "Check VTP status with 'show vtp status' on both switches", revealed: false },
      { cost: 60, text: 'Match domains: vtp domain {{domain}} on the mismatched switch', revealed: false },
    ],
    validation: [
      { type: 'command', params: { node: '{{vtpClient}}', command: 'show vlan brief', contains: ['{{vlanId}}'] } },
    ],
    requiredItems: ['laptop', 'console-cable'],
  },

  // ==================================================================
  // ROUTING (Tier 2-5)
  // ==================================================================
  {
    id: 'RT-STATIC-210',
    title: 'Missing Default Route on {{router}}',
    description:
      '{{router}} has lost internet connectivity. Internal routing works but traffic for 0.0.0.0/0 is dropped. The ISP gateway is {{ispGateway}} reachable via interface {{ispInterface}}. Add the missing default route and verify external connectivity.',
    category: 'routing',
    difficulty: 2,
    timeLimit: 10,
    rewardCredits: 120,
    rewardXp: 60,
    labTemplate: 'default_route_{{router}}',
    hints: [
      { cost: 25, text: "Check routing table: 'show ip route'", revealed: false },
      { cost: 45, text: 'Command: ip route 0.0.0.0 0.0.0.0 {{ispGateway}}', revealed: false },
    ],
    validation: [
      { type: 'ping', params: { source: '{{router}}', destination: '8.8.8.8', successRate: 100 } },
      { type: 'command', params: { node: '{{router}}', command: 'show ip route', contains: ['0.0.0.0/0', '{{ispGateway}}'] } },
    ],
    requiredItems: ['laptop', 'console-cable'],
  },
  {
    id: 'RT-OSPF-220',
    title: 'OSPF Neighbors Stuck in {{state}} on Area {{area}}',
    description:
      '{{routerA}} and {{routerB}} should form an OSPF adjacency over link {{linkNet}} in area {{area}}, but they are stuck in {{state}} state. Possible causes: mismatched hello/dead timers, mismatched network types, or authentication key mismatch. Compare configurations and fix.',
    category: 'routing',
    difficulty: 3,
    timeLimit: 20,
    rewardCredits: 350,
    rewardXp: 175,
    labTemplate: 'ospf_adj_{{routerA}}',
    hints: [
      { cost: 70, text: "Compare 'show ip ospf interface {{interface}}' on both routers", revealed: false },
      { cost: 100, text: 'Check network type (broadcast vs point-to-point), MTU, and timer values', revealed: false },
      { cost: 130, text: 'If authentication is enabled, verify keys match with show ip ospf interface', revealed: false },
    ],
    validation: [
      { type: 'command', params: { node: '{{routerA}}', command: 'show ip ospf neighbor', contains: ['FULL'] } },
    ],
    requiredItems: ['laptop', 'console-cable'],
  },
  {
    id: 'RT-BGP-230',
    title: 'BGP Session to {{peerRouter}} Not Establishing',
    description:
      'The BGP peering between {{routerA}} (AS {{asnA}}) and {{peerRouter}} (AS {{asnB}}, IP {{peerIp}}) is stuck in {{bgpState}}. Verify the neighbor statement, check TCP 179 connectivity, and ensure the update-source interface is correct.',
    category: 'routing',
    difficulty: 4,
    timeLimit: 25,
    rewardCredits: 500,
    rewardXp: 250,
    labTemplate: 'bgp_peer_{{routerA}}',
    hints: [
      { cost: 100, text: "Check BGP status: 'show ip bgp summary' and 'show ip bgp neighbors {{peerIp}}'", revealed: false },
      { cost: 150, text: 'Verify: update-source interface, ebgp-multihop (if not directly connected), and any ACLs blocking TCP 179', revealed: false },
      { cost: 200, text: 'Check if the local AS number matches and the remote AS is correctly specified', revealed: false },
    ],
    validation: [
      { type: 'command', params: { node: '{{routerA}}', command: 'show ip bgp summary', contains: ['{{peerIp}}'] } },
    ],
    requiredItems: ['laptop', 'console-cable'],
  },
  {
    id: 'RT-EIGRP-240',
    title: 'EIGRP Neighbors Not Forming on {{interface}}',
    description:
      '{{routerA}} and {{routerB}} should be EIGRP neighbors on {{interface}} (AS {{asn}}), but no adjacency is forming. Both are configured for EIGRP AS {{asn}} but the K-values or autonomous system numbers may differ. Check the EIGRP configuration.',
    category: 'routing',
    difficulty: 3,
    timeLimit: 18,
    rewardCredits: 320,
    rewardXp: 160,
    labTemplate: 'eigrp_adj_{{routerA}}',
    hints: [
      { cost: 60, text: "Use 'show ip eigrp neighbors' to confirm no adjacency exists", revealed: false },
      { cost: 90, text: "Check 'show ip protocols' for AS number and K-value mismatches", revealed: false },
    ],
    validation: [
      { type: 'command', params: { node: '{{routerA}}', command: 'show ip eigrp neighbors', contains: ['{{routerB}}'] } },
    ],
    requiredItems: ['laptop', 'console-cable'],
  },
  {
    id: 'RT-REDIST-250',
    title: 'Route Redistribution Loop Between OSPF and EIGRP',
    description:
      'Routes from EIGRP AS {{eigrpAs}} are being redistributed into OSPF process {{ospfPid}} and then fed back into EIGRP, causing a routing loop. The {{router}} is the redistribution point. Apply route tags and filtering to break the loop while preserving the intended reachability.',
    category: 'routing',
    difficulty: 5,
    timeLimit: 30,
    rewardCredits: 650,
    rewardXp: 325,
    labTemplate: 'redist_loop_{{router}}',
    hints: [
      { cost: 130, text: "Use 'show ip route <prefix>' on affected paths to trace the loop", revealed: false },
      { cost: 180, text: 'Apply route tags when redistributing: set tag {{eigrpAs}} on OSPF→EIGRP, filter with route-map on EIGRP→OSPF', revealed: false },
      { cost: 220, text: 'Use distribute-list or prefix-list to control which routes are advertised', revealed: false },
    ],
    validation: [
      { type: 'ping', params: { source: '{{source}}', destination: '{{destination}}', successRate: 100 } },
      { type: 'command', params: { node: '{{router}}', command: 'show ip route {{destination}}', contains: ['via'] } },
    ],
    requiredItems: ['laptop', 'console-cable'],
  },

  // ==================================================================
  // SECURITY (Tier 2-5)
  // ==================================================================
  {
    id: 'SEC-ACL-310',
    title: 'ACL Blocking Legitimate {{protocol}} Traffic on {{router}}',
    description:
      'After a security audit, users in {{sourceNet}} can no longer access {{service}} at {{destIp}}:{{destPort}}. An ACL on {{router}} interface {{interface}} is blocking the traffic. The ACL should permit {{protocol}} on port {{destPort}} while blocking only {{blockedService}} (port {{blockedPort}}). Fix the ACL without removing security.',
    category: 'security',
    difficulty: 2,
    timeLimit: 15,
    rewardCredits: 200,
    rewardXp: 100,
    labTemplate: 'acl_fix_{{router}}',
    hints: [
      { cost: 40, text: "View ACL: 'show access-lists' — check the hit counters to find which line is matching", revealed: false },
      { cost: 65, text: "Add: 'permit {{protocol}} {{sourceNet}} host {{destIp}} eq {{destPort}}' above the deny statement", revealed: false },
    ],
    validation: [
      { type: 'ping', params: { source: '{{testHost}}', destination: '{{destIp}}', successRate: 100 } },
      { type: 'command', params: { node: '{{router}}', command: 'show access-lists', contains: ['permit {{protocol}}'] } },
    ],
    requiredItems: ['laptop', 'console-cable'],
  },
  {
    id: 'SEC-FWPOL-320',
    title: 'Firewall Policy Blocking {{app}} — FortiGate {{fwName}}',
    description:
      'Users behind {{fwName}} are unable to reach {{app}} ({{destIp}}:{{destPort}}). A firewall policy on the {{srcIntf}}→{{dstIntf}} zone pair is incorrectly configured or missing. Create a proper security policy to allow {{srcNet}} to access {{app}} while logging traffic.',
    category: 'security',
    difficulty: 3,
    timeLimit: 20,
    rewardCredits: 350,
    rewardXp: 175,
    labTemplate: 'fw_policy_{{fwName}}',
    hints: [
      { cost: 65, text: "Check policies: 'show firewall policy' or 'get firewall policy' on FortiGate", revealed: false },
      { cost: 95, text: 'Create: config firewall policy → edit <id> → set srcintf {{srcIntf}} → set dstintf {{dstIntf}} → set srcaddr {{srcNet}} → set dstaddr {{destIp}} → set service {{app}} → set action accept', revealed: false },
    ],
    validation: [
      { type: 'ping', params: { source: '{{testHost}}', destination: '{{destIp}}', successRate: 100 } },
    ],
    requiredItems: ['laptop', 'console-cable'],
  },
  {
    id: 'SEC-VPN-330',
    title: 'Site-to-Site VPN Down — {{siteA}} ↔ {{siteB}}',
    description:
      'The IPSec VPN between {{siteA}} ({{peerA}}) and {{siteB}} ({{peerB}}) is down. Phase 1 (ISAKMP) is not completing. Check that pre-shared keys match, IKE proposals are compatible (AES-256, SHA-256, DH group 14), and that UDP 500/4500 is not blocked.',
    category: 'security',
    difficulty: 4,
    timeLimit: 25,
    rewardCredits: 480,
    rewardXp: 240,
    labTemplate: 'vpn_down_{{siteA}}',
    hints: [
      { cost: 90, text: "Check Phase 1: 'show crypto isakmp sa' — if stuck in MM_WAIT_MSG, check PSK and proposals", revealed: false },
      { cost: 130, text: 'Verify IKE policies: encryption, hash, DH group, and lifetime must match on both sides', revealed: false },
      { cost: 170, text: 'Check if any ACL or firewall is blocking UDP 500 (ISAKMP) or UDP 4500 (NAT-T)', revealed: false },
    ],
    validation: [
      { type: 'command', params: { node: '{{peerA}}', command: 'show crypto isakmp sa', contains: ['QM_IDLE'] } },
      { type: 'ping', params: { source: '{{peerA}}', destination: '{{destBehindB}}', successRate: 100 } },
    ],
    requiredItems: ['laptop', 'console-cable'],
  },
  {
    id: 'SEC-DOT1X-340',
    title: '802.1X Authentication Failing on Port {{port}}',
    description:
      'Users on port {{port}} of {{switch}} are being placed in the guest VLAN instead of the authenticated VLAN {{authVlan}}. The RADIUS server {{radiusServer}} is reachable but authentication requests are failing. Verify the 802.1X configuration and RADIUS shared secret.',
    category: 'security',
    difficulty: 3,
    timeLimit: 20,
    rewardCredits: 330,
    rewardXp: 165,
    labTemplate: 'dot1x_fail_{{switch}}',
    hints: [
      { cost: 70, text: "Check 802.1X status: 'show dot1x interface {{port}}' and 'show authentication sessions'", revealed: false },
      { cost: 100, text: 'Verify RADIUS server config: show radius server-group — test with test aaa group radius', revealed: false },
    ],
    validation: [
      { type: 'command', params: { node: '{{switch}}', command: 'show authentication sessions interface {{port}}', contains: ['Authz Success'] } },
    ],
    requiredItems: ['laptop', 'console-cable'],
  },
  {
    id: 'SEC-NAC-350',
    title: 'NAC Posture Assessment Failing — {{host}} Non-Compliant',
    description:
      '{{host}} is being denied network access by the NAC system because it fails the posture assessment ({{checkType}} check). The host needs {{required}} but currently has {{current}}. Remediate the host to pass posture assessment and regain network access.',
    category: 'security',
    difficulty: 4,
    timeLimit: 25,
    rewardCredits: 460,
    rewardXp: 230,
    labTemplate: 'nac_posture_{{host}}',
    hints: [
      { cost: 85, text: 'Check the posture report to see which specific checks failed', revealed: false },
      { cost: 125, text: 'Remediate: update {{required}} on {{host}} and re-run posture assessment', revealed: false },
      { cost: 165, text: 'Temporary bypass: some NAC systems allow a grace period — check if one is available', revealed: false },
    ],
    validation: [
      { type: 'command', params: { node: '{{host}}', command: 'show posture status', contains: ['Compliant'] } },
    ],
    requiredItems: ['laptop', 'usb-drive'],
  },

  // ==================================================================
  // SYSTEMS (Tier 2-4)
  // ==================================================================
  {
    id: 'SYS-NTP-410',
    title: 'NTP Sync Failure — {{device}} Clock Drifting',
    description:
      '{{device}} clock is {{offset}} seconds off from the network. NTP is configured to sync from {{ntpServer1}} and {{ntpServer2}} but the device shows as unsynchronized. Certificates and Kerberos auth are failing due to clock skew. Fix NTP so the clock stays in sync.',
    category: 'systems',
    difficulty: 2,
    timeLimit: 12,
    rewardCredits: 150,
    rewardXp: 75,
    labTemplate: 'ntp_sync_{{device}}',
    hints: [
      { cost: 30, text: "Check NTP status: 'show ntp status' and 'show ntp associations'", revealed: false },
      { cost: 55, text: 'If stratum is 16, NTP is not synced — check firewall allows UDP 123 to NTP servers', revealed: false },
    ],
    validation: [
      { type: 'command', params: { node: '{{device}}', command: 'show ntp status', contains: ['synchronized'] } },
    ],
    requiredItems: ['laptop', 'console-cable'],
  },
  {
    id: 'SYS-LOG-420',
    title: 'Syslog Not Forwarding from {{device}} to {{syslogServer}}',
    description:
      'Security events from {{device}} are not being sent to the central syslog server {{syslogServer}}. The logging host is configured but logs are only stored locally. The syslog facility and severity level may be misconfigured, or UDP 514 is being blocked.',
    category: 'systems',
    difficulty: 2,
    timeLimit: 12,
    rewardCredits: 140,
    rewardXp: 70,
    labTemplate: 'syslog_fix_{{device}}',
    hints: [
      { cost: 30, text: "Check: 'show logging' — see if the syslog host is configured and what severity level is set", revealed: false },
      { cost: 50, text: 'Configure: logging host {{syslogServer}} transport udp port 514 → logging trap informational', revealed: false },
    ],
    validation: [
      { type: 'command', params: { node: '{{device}}', command: 'show logging', contains: ['{{syslogServer}}'] } },
    ],
    requiredItems: ['laptop', 'console-cable'],
  },
  {
    id: 'SYS-SNMP-430',
    title: 'SNMP Polling Timeout — {{device}} Unreachable by NMS',
    description:
      'The NMS at {{nmsServer}} cannot poll {{device}} via SNMPv3. The SNMP community/credentials may have changed, or the SNMP view is restricting access. Update the SNMP configuration so the NMS can read interface counters and CPU stats.',
    category: 'systems',
    difficulty: 3,
    timeLimit: 18,
    rewardCredits: 290,
    rewardXp: 145,
    labTemplate: 'snmp_fix_{{device}}',
    hints: [
      { cost: 55, text: "Check: 'show snmp host' and 'show snmp group' to verify v3 user/group config", revealed: false },
      { cost: 85, text: 'SNMPv3: snmp-server group {{group}} v3 priv → snmp-server user {{user}} {{group}} v3 auth sha {{authPass}} priv aes 128 {{privPass}}', revealed: false },
      { cost: 115, text: 'Verify the ACL on the SNMP view is not restricting the NMS IP {{nmsServer}}', revealed: false },
    ],
    validation: [
      { type: 'command', params: { node: '{{device}}', command: 'show snmp host', contains: ['{{nmsServer}}'] } },
    ],
    requiredItems: ['laptop', 'console-cable'],
  },
  {
    id: 'SYS-AAA-440',
    title: 'AAA/TACACS+ Authentication Failure on {{device}}',
    description:
      'Admins cannot authenticate to {{device}} using TACACS+. The TACACS+ server {{tacacsServer}} is reachable but all login attempts are failing. The shared secret may have been rotated or the TACACS+ server is rejecting due to group membership.',
    category: 'systems',
    difficulty: 4,
    timeLimit: 22,
    rewardCredits: 420,
    rewardXp: 210,
    labTemplate: 'aaa_tacacs_{{device}}',
    hints: [
      { cost: 80, text: "Test TACACS+: 'test aaa group tacacs+ {{user}} {{password}} legacy'", revealed: false },
      { cost: 120, text: 'Verify shared secret: tacacs-server host {{tacacsServer}} key {{key}}', revealed: false },
      { cost: 150, text: 'Check local fallback is enabled: aaa authentication login default group tacacs+ local', revealed: false },
    ],
    validation: [
      { type: 'command', params: { node: '{{device}}', command: 'show aaa servers', contains: ['UP'] } },
    ],
    requiredItems: ['laptop', 'console-cable'],
  },

  // ==================================================================
  // AUTOMATION (Tier 3-5)
  // ==================================================================
  {
    id: 'AUTO-ANS-510',
    title: 'Ansible Playbook {{playbook}} Failing on {{target}}',
    description:
      'The Ansible playbook {{playbook}} that configures {{task}} on {{target}} is failing with error: "{{errorHint}}". The playbook should apply the configuration idempotently. Debug the playbook, fix the failing module, and re-run to confirm it succeeds.',
    category: 'automation',
    difficulty: 3,
    timeLimit: 20,
    rewardCredits: 310,
    rewardXp: 155,
    labTemplate: 'ansible_fix_{{target}}',
    hints: [
      { cost: 60, text: 'Run with verbose: ansible-playbook {{playbook}} -vvv and check the module output', revealed: false },
      { cost: 90, text: 'Check connectivity: ansible {{target}} -m ping — verify credentials in inventory', revealed: false },
    ],
    validation: [
      { type: 'command', params: { node: '{{ansibleCtrl}}', command: 'ansible-playbook {{playbook}} --check', contains: ['ok=', 'changed=0'] } },
    ],
    requiredItems: ['laptop'],
  },
  {
    id: 'AUTO-PY-520',
    title: 'Python Network Script {{script}} Timing Out',
    description:
      'The automation script {{script}} that pushes config to {{deviceCount}} devices is timing out after {{timeout}} seconds. It uses {{library}} to connect via SSH. The script should batch device connections or use async patterns. Optimize the script for concurrent connections.',
    category: 'automation',
    difficulty: 4,
    timeLimit: 25,
    rewardCredits: 470,
    rewardXp: 235,
    labTemplate: 'python_fix_script',
    hints: [
      { cost: 90, text: 'Check if the script uses sequential (for loop) or concurrent connections — sequential will time out with many devices', revealed: false },
      { cost: 130, text: 'With Netmiko, use threading or multiprocessing. With async libraries (scrapli), use asyncio.gather()', revealed: false },
      { cost: 170, text: 'Add connection timeout and retry logic: ConnectHandler(..., conn_timeout=10)', revealed: false },
    ],
    validation: [
      { type: 'command', params: { node: '{{ctrlHost}}', command: 'python3 {{script}} --check', contains: ['Success'] } },
    ],
    requiredItems: ['laptop'],
  },
  {
    id: 'AUTO-API-530',
    title: 'RESTCONF API {{method}} {{endpoint}} Returns {{statusCode}}',
    description:
      'The RESTCONF API call to {{device}} endpoint {{endpoint}} is returning HTTP {{statusCode}}. The expected response should contain {{expected}}. The API token or content-type header may be wrong. Fix the API call to retrieve/push the configuration successfully.',
    category: 'automation',
    difficulty: 4,
    timeLimit: 22,
    rewardCredits: 440,
    rewardXp: 220,
    labTemplate: 'restconf_fix_{{device}}',
    hints: [
      { cost: 85, text: 'Verify headers: Accept: application/yang-data+json and Content-Type: application/yang-data+json', revealed: false },
      { cost: 125, text: 'Check RESTCONF is enabled: restconf — and test with curl -k -u {{user}}:{{pass}} https://{{device}}/restconf/', revealed: false },
      { cost: 160, text: 'HTTP 401 = bad auth, 404 = wrong endpoint path, 405 = wrong method', revealed: false },
    ],
    validation: [
      { type: 'api', params: { url: '{{device}}', endpoint: '{{endpoint}}', expectedStatus: 200, contains: ['{{expected}}'] } },
    ],
    requiredItems: ['laptop'],
  },
  {
    id: 'AUTO-NETC-540',
    title: 'NETCONF Session Dropped — {{device}} RPC Error',
    description:
      'The NETCONF session to {{device}} is failing with RPC error: "{{rpcError}}". The YANG model for {{yangModule}} may not be supported on this firmware version {{firmware}}. Check device capabilities and use a compatible YANG model or fallback to CLI-based automation.',
    category: 'automation',
    difficulty: 5,
    timeLimit: 28,
    rewardCredits: 580,
    rewardXp: 290,
    labTemplate: 'netconf_fix_{{device}}',
    hints: [
      { cost: 110, text: "Check capabilities: 'show netconf schema' or use <get> to list supported YANG modules", revealed: false },
      { cost: 160, text: 'Fall back to CLI: use <cli-config-data> inside the NETCONF RPC if native YANG model is unsupported', revealed: false },
      { cost: 200, text: 'Upgrade device firmware or use an older revision of the YANG module', revealed: false },
    ],
    validation: [
      { type: 'command', params: { node: '{{device}}', command: 'show netconf session', contains: ['in-use'] } },
    ],
    requiredItems: ['laptop'],
  },
  {
    id: 'AUTO-CICD-550',
    title: 'CI/CD Pipeline Network Validation Step Failing',
    description:
      'The network validation stage in the CI/CD pipeline for {{project}} is failing. The validation script {{valScript}} checks for {{checkDescription}} on {{targets}}. The test {{testName}} is returning failure but the configuration appears correct on the devices. Debug the validation logic.',
    category: 'automation',
    difficulty: 5,
    timeLimit: 30,
    rewardCredits: 600,
    rewardXp: 300,
    labTemplate: 'cicd_validation_fix',
    hints: [
      { cost: 115, text: 'Check the validation script logic — it may have an incorrect expected value or timing issue', revealed: false },
      { cost: 160, text: 'Add a wait/retry loop in {{valScript}}: the config may not have converged yet', revealed: false },
      { cost: 200, text: 'Run the validation step manually with verbose output to isolate the failing assertion', revealed: false },
    ],
    validation: [
      { type: 'command', params: { node: '{{runnerHost}}', command: 'python3 {{valScript}} --target {{targets}}', contains: ['PASS'] } },
    ],
    requiredItems: ['laptop'],
  },

  // ==================================================================
  // HIGH-AVAILABILITY (Tier 3-5)
  // ==================================================================
  {
    id: 'HA-HSRP-610',
    title: 'HSRP Split-Brain — Both {{routerA}} and {{routerB}} Active',
    description:
      'Both {{routerA}} and {{routerB}} claim to be the HSRP active router for group {{group}} on VLAN {{vlan}}, causing a duplicate IP conflict. {{routerA}} should be active (priority {{priA}}) and {{routerB}} standby (priority {{priB}}). Fix the HSRP configuration.',
    category: 'high-availability',
    difficulty: 4,
    timeLimit: 22,
    rewardCredits: 450,
    rewardXp: 225,
    labTemplate: 'hsrp_split_{{routerA}}',
    hints: [
      { cost: 85, text: "Check: 'show standby brief' on both routers — compare group numbers and virtual IPs", revealed: false },
      { cost: 120, text: 'Ensure standby group {{group}} and standby ip are identical. Check preempt settings: standby {{group}} preempt', revealed: false },
      { cost: 160, text: 'If using authentication, verify the standby authentication key matches on both', revealed: false },
    ],
    validation: [
      { type: 'command', params: { node: '{{routerA}}', command: 'show standby brief', contains: ['Active'] } },
      { type: 'command', params: { node: '{{routerB}}', command: 'show standby brief', contains: ['Standby'] } },
    ],
    requiredItems: ['laptop', 'console-cable'],
  },
  {
    id: 'HA-VRRP-620',
    title: 'VRRP Master Election Failing — {{vlan}} Gateway Flapping',
    description:
      'The VRRP virtual router for VLAN {{vlan}} is flapping between {{routerA}} and {{routerB}}. The master should be {{routerA}} with priority {{priA}}. The advertisement interval or preempt delay may be too aggressive. Stabilize the VRRP election.',
    category: 'high-availability',
    difficulty: 4,
    timeLimit: 22,
    rewardCredits: 440,
    rewardXp: 220,
    labTemplate: 'vrrp_flap_{{routerA}}',
    hints: [
      { cost: 85, text: "Check: 'show vrrp brief' — look at Master Router changes over time", revealed: false },
      { cost: 120, text: 'Increase advertisement interval: vrrp {{group}} timers advertise {{sec}} — and set preempt delay: vrrp {{group}} preempt delay minimum {{delay}}', revealed: false },
    ],
    validation: [
      { type: 'command', params: { node: '{{routerA}}', command: 'show vrrp brief', contains: ['Master'] } },
    ],
    requiredItems: ['laptop', 'console-cable'],
  },
  {
    id: 'HA-MLAG-630',
    title: 'MLAG Peer Link Down — {{switchA}}/{{switchB}} Isolation',
    description:
      'The MLAG peer link between {{switchA}} and {{switchB}} has gone down. The peer-keepalive link is still up but MLAG is in a split state. Dual-active detection should fail over properly but the secondary {{switchB}} is not going into MLAG-inactive. Fix the MLAG configuration.',
    category: 'high-availability',
    difficulty: 5,
    timeLimit: 30,
    rewardCredits: 620,
    rewardXp: 310,
    labTemplate: 'mlag_peer_{{switchA}}',
    hints: [
      { cost: 120, text: "Check MLAG status: 'show mlag' — confirm peer-link and peer-keepalive status", revealed: false },
      { cost: 170, text: 'Re-establish peer-link: check LACP and VLAN consistency on the peer-link interfaces', revealed: false },
      { cost: 210, text: 'If peer-link is physically down, check fiber/SFP and reconfigure the port-channel members', revealed: false },
    ],
    validation: [
      { type: 'command', params: { node: '{{switchA}}', command: 'show mlag', contains: ['active'] } },
    ],
    requiredItems: ['laptop', 'console-cable', 'fiber-module'],
    consumeItems: ['fiber-module'],
  },
  {
    id: 'HA-LB-640',
    title: 'Load Balancer {{lbName}} Backend Pool {{pool}} Unhealthy',
    description:
      'All servers in backend pool {{pool}} on load balancer {{lbName}} are showing as DOWN. The health check for {{checkType}} is failing. The servers at {{serverList}} are actually running and responding to direct requests. Fix the health monitor configuration.',
    category: 'high-availability',
    difficulty: 3,
    timeLimit: 20,
    rewardCredits: 360,
    rewardXp: 180,
    labTemplate: 'lb_health_{{lbName}}',
    hints: [
      { cost: 70, text: "Check: 'show server pool {{pool}} detail' — see why each member is marked down", revealed: false },
      { cost: 100, text: 'Fix health monitor: adjust the HTTP method/URL path/expected status code to match the actual application', revealed: false },
    ],
    validation: [
      { type: 'command', params: { node: '{{lbName}}', command: 'show server pool {{pool}}', contains: ['up'] } },
    ],
    requiredItems: ['laptop'],
  },

  // ==================================================================
  // WIRELESS (Tier 1-4)
  // ==================================================================
  {
    id: 'WL-AP-710',
    title: 'Access Point {{apName}} Not Joining WLC {{wlcName}}',
    description:
      'The new AP {{apName}} is not joining the wireless controller {{wlcName}}. The AP receives an IP via DHCP from {{dhcpScope}} but the discovery process is failing. Check WLC discovery methods (DHCP option 43, DNS, broadcast) and verify the AP is authorized.',
    category: 'wireless',
    difficulty: 2,
    timeLimit: 15,
    rewardCredits: 190,
    rewardXp: 95,
    labTemplate: 'ap_join_{{wlcName}}',
    hints: [
      { cost: 40, text: "On WLC: 'show ap summary' — see if the AP appears with any status", revealed: false },
      { cost: 65, text: 'Check DHCP option 43 (vendor-specific) is set to the WLC management IP on {{dhcpScope}}', revealed: false },
      { cost: 90, text: 'Ensure the AP MAC address is in the WLC authorization list or auto-authorization is enabled', revealed: false },
    ],
    validation: [
      { type: 'command', params: { node: '{{wlcName}}', command: 'show ap summary', contains: ['Registered'] } },
    ],
    requiredItems: ['laptop'],
  },
  {
    id: 'WL-RF-720',
    title: 'High Channel Interference on 2.4GHz — Floor {{floor}}',
    description:
      'Users on floor {{floor}} are reporting poor Wi-Fi performance. The spectrum analysis shows severe co-channel interference on channel {{channel}}. Neighboring APs {{apList}} are all on the same channel. Reassign channels and adjust power levels using RRM or manual assignment.',
    category: 'wireless',
    difficulty: 3,
    timeLimit: 20,
    rewardCredits: 320,
    rewardXp: 160,
    labTemplate: 'rf_interference_{{wlcName}}',
    hints: [
      { cost: 65, text: "Check: 'show ap auto-rf 802.11b {{apName}}' to see channel utilization", revealed: false },
      { cost: 95, text: 'Enable DCA (Dynamic Channel Assignment) or manually set non-overlapping channels (1, 6, 11)', revealed: false },
      { cost: 125, text: 'Adjust TPC (Transmit Power Control) — lower power on APs with overlapping coverage', revealed: false },
    ],
    validation: [
      { type: 'command', params: { node: '{{wlcName}}', command: 'show ap channel', contains: ['1', '6', '11'] } },
    ],
    requiredItems: ['laptop'],
  },
  {
    id: 'WL-WLAN-730',
    title: 'WPA3 Transition Mode Not Working on SSID {{ssid}}',
    description:
      'The SSID {{ssid}} is configured for WPA3 Transition Mode but some clients (especially older IoT devices) cannot connect. WPA2-only clients should fall back to WPA2 while WPA3-capable clients use SAE. The transition mode setting may be incorrect.',
    category: 'wireless',
    difficulty: 3,
    timeLimit: 20,
    rewardCredits: 330,
    rewardXp: 165,
    labTemplate: 'wpa3_transition_{{wlcName}}',
    hints: [
      { cost: 65, text: 'Check WLAN security settings: WPA3 Transition mode requires both WPA2 (PSK) and WPA3 (SAE) to be enabled', revealed: false },
      { cost: 95, text: 'On Cisco WLC: wlan security wpa wpa2 wpa3 — and ensure PMF is set to Optional (not Required)', revealed: false },
      { cost: 125, text: 'Verify MFP (Management Frame Protection) is set correctly — Required for WPA3-only, Optional for Transition', revealed: false },
    ],
    validation: [
      { type: 'command', params: { node: '{{testHost}}', command: 'show wifi status', contains: ['{{ssid}}'] } },
    ],
    requiredItems: ['laptop'],
  },
  {
    id: 'WL-GUEST-740',
    title: 'Guest SSID {{ssid}} Clients Accessing Internal Network',
    description:
      'Clients on the guest SSID {{ssid}} are able to reach internal resources on {{internalNet}}, which is a security violation. The guest WLAN should only have internet access. Apply the correct ACL or firewall policy to isolate guest traffic at the WLC or upstream switch.',
    category: 'wireless',
    difficulty: 2,
    timeLimit: 15,
    rewardCredits: 210,
    rewardXp: 105,
    labTemplate: 'guest_isolation_{{wlcName}}',
    hints: [
      { cost: 45, text: 'On the WLC, enable peer-to-peer blocking and apply a guest ACL that denies traffic to RFC 1918 addresses', revealed: false },
      { cost: 70, text: 'Create ACL: deny ip any 10.0.0.0 0.255.255.255 → deny ip any 172.16.0.0 0.15.255.255 → deny ip any 192.168.0.0 0.0.255.255 → permit ip any any', revealed: false },
    ],
    validation: [
      { type: 'ping', params: { source: '{{guestHost}}', destination: '8.8.8.8', successRate: 100 } },
      { type: 'ping', params: { source: '{{guestHost}}', destination: '{{internalTarget}}', successRate: 0 } },
    ],
    requiredItems: ['laptop'],
  },
  {
    id: 'WL-MESH-750',
    title: 'Mesh AP {{apName}} Lost Backhaul — Hop {{hopCount}}',
    description:
      'The mesh AP {{apName}} (hop {{hopCount}} from root {{rootAp}}) has lost its wireless backhaul connection. The RSSI to its parent dropped below the threshold. The parent {{parentAp}} may have changed channels or reduced power. Re-optimize the mesh backhaul.',
    category: 'wireless',
    difficulty: 4,
    timeLimit: 25,
    rewardCredits: 460,
    rewardXp: 230,
    labTemplate: 'mesh_backhaul_{{wlcName}}',
    hints: [
      { cost: 85, text: "Check: 'show ap mesh neighbors' on {{parentAp}} and {{apName}}", revealed: false },
      { cost: 120, text: 'Option 1: increase parent AP power. Option 2: assign a dedicated backhaul channel (5GHz)', revealed: false },
      { cost: 155, text: 'If it keeps failing, consider adding an Ethernet backhaul or adding an intermediate mesh hop', revealed: false },
    ],
    validation: [
      { type: 'command', params: { node: '{{wlcName}}', command: 'show ap mesh adjacency {{apName}}', contains: ['CONNECTED'] } },
    ],
    requiredItems: ['laptop'],
  },

  // ==================================================================
  // VOICE (Tier 2-4)
  // ==================================================================
  {
    id: 'VOI-DP-810',
    title: 'Outbound Calls Failing — Dial Peer {{peerId}} on {{router}}',
    description:
      'Outbound calls from site {{site}} to PSTN via {{router}} are failing. The dial peer {{peerId}} is not matching the called number pattern {{pattern}}. The destination-pattern may be misconfigured or the voice port is administratively down. Fix the dial peer.',
    category: 'voice',
    difficulty: 2,
    timeLimit: 15,
    rewardCredits: 200,
    rewardXp: 100,
    labTemplate: 'dial_peer_fix_{{router}}',
    hints: [
      { cost: 40, text: "Check: 'show dial-peer voice summary' — see if peer {{peerId}} is operational", revealed: false },
      { cost: 65, text: "Verify: destination-pattern {{pattern}} and session target (SIP server or voice port) — ensure the voice port is 'no shutdown'", revealed: false },
      { cost: 90, text: "Debug: 'debug voip dialpeer' and 'debug ccsip messages' to trace call signaling", revealed: false },
    ],
    validation: [
      { type: 'command', params: { node: '{{router}}', command: 'show dial-peer voice {{peerId}}', contains: ['operational'] } },
    ],
    requiredItems: ['laptop', 'console-cable'],
  },
  {
    id: 'VOI-DSP-820',
    title: 'DSP Resource Exhaustion — Choppy Audio on {{router}}',
    description:
      'Calls through {{router}} have choppy audio and intermittent one-way audio. The DSP (Digital Signal Processor) resources are {{dspUsage}}% utilized with only {{dspFree}} channels free. The codec {{codec}} is using more resources than expected. Optimize DSP allocation or add transcoding resources.',
    category: 'voice',
    difficulty: 3,
    timeLimit: 20,
    rewardCredits: 340,
    rewardXp: 170,
    labTemplate: 'dsp_exhaust_{{router}}',
    hints: [
      { cost: 65, text: "Check: 'show voice dsp group all' — see current channel allocation and utilization", revealed: false },
      { cost: 95, text: 'Reduce transcoding: use codec passthrough where possible, or add DSP resources with dsp services dspfarm', revealed: false },
      { cost: 130, text: 'Consider using G.711 (no compression, no DSP needed) instead of G.729 for local calls', revealed: false },
    ],
    validation: [
      { type: 'command', params: { node: '{{router}}', command: 'show voice dsp group all', contains: ['active'] } },
    ],
    requiredItems: ['laptop', 'console-cable'],
  },
  {
    id: 'VOI-QOS-830',
    title: 'Voice Quality Degraded — QoS Policy Missing on {{interface}}',
    description:
      'VoIP calls through {{router}} (interface {{interface}}) have poor quality during peak hours. The QoS policy for voice traffic is either missing or misconfigured. Voice traffic (DSCP EF) is competing with bulk data. Apply a proper LLQ/CBWFQ policy to guarantee bandwidth for voice.',
    category: 'voice',
    difficulty: 3,
    timeLimit: 22,
    rewardCredits: 360,
    rewardXp: 180,
    labTemplate: 'qos_voice_{{router}}',
    hints: [
      { cost: 70, text: "Check: 'show policy-map interface {{interface}}' — if no policy, QoS is not applied", revealed: false },
      { cost: 100, text: 'Create: class-map match-all VOICE → match dscp ef → policy-map WAN-EDGE → class VOICE → priority {{voiceBw}} (kbps)', revealed: false },
      { cost: 135, text: 'Apply: interface {{interface}} → service-policy output WAN-EDGE', revealed: false },
    ],
    validation: [
      { type: 'command', params: { node: '{{router}}', command: 'show policy-map interface {{interface}}', contains: ['VOICE'] } },
    ],
    requiredItems: ['laptop', 'console-cable'],
  },
  {
    id: 'VOI-CODEC-840',
    title: 'Codec Mismatch — {{caller}} Cannot Call {{callee}}',
    description:
      'Calls between {{caller}} (codec {{codecA}}) and {{callee}} (codec {{codecB}}) are failing due to codec negotiation failure. The SIP SDP offer/answer is mismatched. Configure a transcoding resource or adjust the codec preference list so both endpoints can negotiate a common codec.',
    category: 'voice',
    difficulty: 4,
    timeLimit: 25,
    rewardCredits: 460,
    rewardXp: 230,
    labTemplate: 'codec_neg_{{router}}',
    hints: [
      { cost: 85, text: "Debug: 'debug ccsip messages' to see the SDP in the INVITE and 488 Not Acceptable Here response", revealed: false },
      { cost: 120, text: 'Add a transcoder profile that maps {{codecA}} ↔ {{codecB}} and assign it to the dial peer', revealed: false },
      { cost: 160, text: 'Alternatively, align codecs: use voice class codec to prefer a common codec like G.711ulaw', revealed: false },
    ],
    validation: [
      { type: 'ping', params: { source: '{{caller}}', destination: '{{callee}}', successRate: 100 } },
    ],
    requiredItems: ['laptop', 'console-cable'],
  },
  {
    id: 'VOI-SIP-850',
    title: 'SIP Registration Failure — {{phone}} to CUCM {{cucm}}',
    description:
      'IP phone {{phone}} cannot register with CUCM {{cucm}}. SIP REGISTER requests receive 403 Forbidden responses. The device pool or CSS (Calling Search Space) configuration may be wrong. Verify the phone MAC, DN, and ensure it is properly added in CUCM.',
    category: 'voice',
    difficulty: 2,
    timeLimit: 15,
    rewardCredits: 220,
    rewardXp: 110,
    labTemplate: 'sip_reg_fail_{{cucm}}',
    hints: [
      { cost: 45, text: "On CUCM: check 'Device → Phone' — ensure MAC address matches and the device is registered", revealed: false },
      { cost: 70, text: 'Verify the DN is assigned and the partition/CSS allows the phone to reach its destination', revealed: false },
    ],
    validation: [
      { type: 'command', params: { node: '{{cucm}}', command: 'show sip registration', contains: ['{{phone}}', 'Registered'] } },
    ],
    requiredItems: ['laptop'],
  },

  // ==================================================================
  // DATACENTER (Tier 3-5)
  // ==================================================================
  {
    id: 'DC-VPC-910',
    title: 'vPC Consistency Check Failing — {{nexusA}}/{{nexusB}}',
    description:
      'The vPC consistency check between {{nexusA}} and {{nexusB}} is failing for vPC domain {{domain}}. The peer-link is up but configuration is inconsistent across peers. The {{inconsistency}} parameter is mismatched. Align the vPC configuration and verify consistency.',
    category: 'datacenter',
    difficulty: 4,
    timeLimit: 25,
    rewardCredits: 500,
    rewardXp: 250,
    labTemplate: 'vpc_consistency_{{nexusA}}',
    hints: [
      { cost: 95, text: "Check: 'show vpc consistency-parameters global' to see all mismatched values", revealed: false },
      { cost: 135, text: 'Align the {{inconsistency}} on the secondary peer to match the primary: Nexus {{nexusB}} → vpc domain {{domain}} → <param>', revealed: false },
      { cost: 170, text: 'After fixing, verify: show vpc brief — both peers should show "consistency-success"', revealed: false },
    ],
    validation: [
      { type: 'command', params: { node: '{{nexusA}}', command: 'show vpc brief', contains: ['consistency-success'] } },
    ],
    requiredItems: ['laptop', 'console-cable'],
  },
  {
    id: 'DC-VXLAN-920',
    title: 'VXLAN Tunnel Not Forwarding — VTEP {{vtepA}} to {{vtepB}}',
    description:
      'Traffic between VXLAN VNI {{vni}} on VTEP {{vtepA}} and VTEP {{vtepB}} is not being forwarded. The underlay multicast group {{mcastGroup}} is reachable but the overlay is broken. The NVE interface or VNI mapping may be incorrect. Fix the VXLAN configuration.',
    category: 'datacenter',
    difficulty: 5,
    timeLimit: 30,
    rewardCredits: 650,
    rewardXp: 325,
    labTemplate: 'vxlan_fix_{{vtepA}}',
    hints: [
      { cost: 130, text: "Check: 'show nve vni {{vni}} detail' and 'show nve peers' — verify peer VTEP IP is reachable", revealed: false },
      { cost: 180, text: 'Verify the VNI-to-VLAN mapping: vlan {{vlan}} → vn-segment {{vni}} — and the NVE source-interface is correct', revealed: false },
      { cost: 220, text: 'Check underlay: ensure multicast or head-end replication is configured correctly for BUM traffic', revealed: false },
    ],
    validation: [
      { type: 'ping', params: { source: '{{hostA}}', destination: '{{hostB}}', successRate: 100 } },
      { type: 'command', params: { node: '{{vtepA}}', command: 'show nve peers', contains: ['{{vtepB}}', 'Up'] } },
    ],
    requiredItems: ['laptop', 'console-cable'],
  },
  {
    id: 'DC-FCOE-930',
    title: 'FCoE VLAN Not Passing — Storage {{storage}} Unreachable',
    description:
      'Servers on {{serverVlan}} cannot reach storage array {{storage}} via FCoE (Fibre Channel over Ethernet). The FCoE VLAN {{fcoeVlan}} is configured but the VSAN {{vsan}} binding may be wrong. Fix the FCoE/VSAN mapping on {{nexus}}.',
    category: 'datacenter',
    difficulty: 5,
    timeLimit: 28,
    rewardCredits: 620,
    rewardXp: 310,
    labTemplate: 'fcoe_fix_{{nexus}}',
    hints: [
      { cost: 120, text: "Check: 'show fcoe' and 'show vsan {{vsan}} membership' — verify VLAN-to-VSAN mapping", revealed: false },
      { cost: 170, text: 'Map VLAN to VSAN: vlan {{fcoeVlan}} → fcoe vsan {{vsan}}', revealed: false },
      { cost: 210, text: 'Verify FCoE is enabled on the interface and the QoS policy for FCoE (no-drop class) is applied', revealed: false },
    ],
    validation: [
      { type: 'command', params: { node: '{{nexus}}', command: 'show fcoe', contains: ['UP'] } },
      { type: 'ping', params: { source: '{{server}}', destination: '{{storage}}', successRate: 100 } },
    ],
    requiredItems: ['laptop', 'console-cable'],
  },
  {
    id: 'DC-ACI-940',
    title: 'ACI EPG Contract Not Enforcing Policy — {{epgA}} ↔ {{epgB}}',
    description:
      'Traffic between EPG {{epgA}} and EPG {{epgB}} in tenant {{tenant}} is being dropped despite a contract allowing {{protocol}} on port {{port}}. The contract scope or filter may be misconfigured. Fix the ACI contract so the EPGs can communicate.',
    category: 'datacenter',
    difficulty: 5,
    timeLimit: 30,
    rewardCredits: 680,
    rewardXp: 340,
    labTemplate: 'aci_contract_fix',
    hints: [
      { cost: 135, text: "Check: 'show contract {{contract}} detail' in the APIC GUI — verify subjects, filters, and scope", revealed: false },
      { cost: 180, text: 'Ensure the contract is consumed by {{epgB}} and provided by {{epgA}} (or vice versa) — and the filter allows the correct ports', revealed: false },
      { cost: 220, text: 'Check the contract scope: Application Profile, VRF, or Tenant — if it is VRF-scoped but EPGs are in different VRFs, it will not work', revealed: false },
    ],
    validation: [
      { type: 'ping', params: { source: '{{endpointA}}', destination: '{{endpointB}}', successRate: 100 } },
    ],
    requiredItems: ['laptop'],
  },
  {
    id: 'DC-N9K-950',
    title: 'Nexus {{switch}} Power Supply {{psu}} Failure',
    description:
      'The power supply {{psu}} on Nexus {{switch}} has failed. The switch is running on a single PSU and is at risk. The replacement PSU ({{psuModel}}) must be installed and the power redundancy mode must be verified. Update the environment monitoring.',
    category: 'datacenter',
    difficulty: 3,
    timeLimit: 18,
    rewardCredits: 300,
    rewardXp: 150,
    labTemplate: 'nexus_psu_fix',
    hints: [
      { cost: 60, text: "Check: 'show environment power' — confirm which PSU is failed and current power draw", revealed: false },
      { cost: 90, text: 'After replacement: power redundancy-mode combined — verify with show environment power', revealed: false },
    ],
    validation: [
      { type: 'command', params: { node: '{{switch}}', command: 'show environment power', contains: ['OK', 'OK'] } },
    ],
    requiredItems: ['laptop', 'console-cable'],
  },
];
