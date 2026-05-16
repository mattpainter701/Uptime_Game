import { describe, expect, it } from 'vitest';
import { createCiscoCli } from './mockCiscoCli';

describe('createCiscoCli', () => {
  it('renders Cisco-style help trees and prompt transitions', () => {
    const cli = createCiscoCli({ hostname: 'R1' });

    expect(cli.getPrompt()).toBe('R1#');

    const execHelp = cli.run('show ?');
    expect(execHelp.lines).toEqual(expect.arrayContaining([
      '  version                 Display software version',
      '  running-config          Display active configuration',
      '  ip interface brief      Display interface summary',
    ]));
    expect(execHelp.prompt).toBe('R1#');

    const configEntry = cli.run('conf t');
    expect(configEntry.lines).toEqual(['Enter configuration commands, one per line. End with CNTL/Z.']);
    expect(configEntry.prompt).toBe('R1(config)#');

    const interfaceHelp = cli.run('interface ?');
    expect(interfaceHelp.lines).toContain('  GigabitEthernet0/0');
    expect(interfaceHelp.lines).toContain('  GigabitEthernet0/1');
  });

  it('updates running-config and interface state through config mode', () => {
    const cli = createCiscoCli({ hostname: 'R1' });

    cli.run('conf t');
    const hostnameResult = cli.run('hostname SW1');
    expect(hostnameResult.prompt).toBe('SW1(config)#');

    const interfaceResult = cli.run('interface GigabitEthernet0/2');
    expect(interfaceResult.prompt).toBe('SW1(config-if)#');
    expect(cli.snapshot().mode).toEqual({ kind: 'interface', name: 'GigabitEthernet0/2' });

    cli.run('description uplink to core');
    cli.run('ip address 10.0.2.1 255.255.255.0');
    cli.run('no shutdown');
    cli.run('exit');
    cli.run('ip route 0.0.0.0 0.0.0.0 10.0.2.254');
    cli.run('end');

    const runningConfig = cli.run('show run').lines.join('\n');
    expect(runningConfig).toContain('hostname SW1');
    expect(runningConfig).toContain('interface GigabitEthernet0/2');
    expect(runningConfig).toContain(' description uplink to core');
    expect(runningConfig).toContain(' ip address 10.0.2.1 255.255.255.0');
    expect(runningConfig).toContain(' no shutdown');
    expect(runningConfig).toContain('ip route 0.0.0.0 0.0.0.0 10.0.2.254');

    const interfaceBrief = cli.run('show ip int bri').lines.join('\n');
    expect(interfaceBrief).toContain('GigabitEthernet0/2');
    expect(interfaceBrief).toContain('10.0.2.1');
    expect(interfaceBrief).toContain('up                    up');
  });

  it('renders the Sprint 2 Cisco show command set', () => {
    const cli = createCiscoCli({ hostname: 'CORE1' });

    expect(cli.run('show version').lines.join('\n')).toContain('Cisco IOS XE Software');
    expect(cli.run('show running-config').lines.join('\n')).toContain('hostname CORE1');
    expect(cli.run('show ip interface brief').lines.join('\n')).toContain('GigabitEthernet0/0');
    expect(cli.run('show ip route').lines.join('\n')).toContain('Codes: C - connected, S - static');
    expect(cli.run('show vlan brief').lines.join('\n')).toContain('default');
    expect(cli.run('show mac address-table').lines.join('\n')).toContain('Mac Address Table');
    expect(cli.run('show cdp neighbors').lines.join('\n')).toContain('Device ID');
    expect(cli.run('show ip ospf neighbor').lines.join('\n')).toContain('FULL/DR');
    expect(cli.run('show ip bgp summary').lines.join('\n')).toContain('State/PfxRcd');
  });

  it('persists switchport mode and access VLAN configuration', () => {
    const cli = createCiscoCli({ hostname: 'SW1' });

    cli.run('configure terminal');
    cli.run('vlan 20');
    cli.run('interface GigabitEthernet0/2');
    cli.run('switchport mode access');
    cli.run('switchport access vlan 20');
    cli.run('no shutdown');
    cli.run('end');

    const iface = cli.snapshot().interfaces.find((item) => item.name === 'GigabitEthernet0/2');
    expect(iface?.switchportMode).toBe('access');
    expect(iface?.accessVlan).toBe(20);

    const runningConfig = cli.run('show running-config').lines.join('\n');
    expect(runningConfig).toContain(' switchport mode access');
    expect(runningConfig).toContain(' switchport access vlan 20');

    const vlanBrief = cli.run('show vlan brief').lines.join('\n');
    expect(vlanBrief).toContain('20   VLAN0020                         active    GigabitEthernet0/2');
  });

  it('supports configurable ping success, failure, and partial-loss outputs', () => {
    const cli = createCiscoCli({
      pingResolver: (target) => {
        if (target === '8.8.8.8') {
          return true;
        }
        if (target === '203.0.113.10') {
          return { sent: 5, received: 3, minMs: 4, avgMs: 9, maxMs: 21, pattern: '!!.!.' };
        }
        return false;
      },
    });

    const success = cli.run('ping 8.8.8.8').lines.join('\n');
    expect(success).toContain('Sending 5, 100-byte ICMP Echos to 8.8.8.8');
    expect(success).toContain('Success rate is 100 percent (5/5)');

    const partial = cli.run('ping 203.0.113.10').lines.join('\n');
    expect(partial).toContain('!!.!.');
    expect(partial).toContain('Success rate is 60 percent (3/5), round-trip min/avg/max = 4/9/21 ms');

    const failure = cli.run('ping 1.1.1.1').lines.join('\n');
    expect(failure).toContain('Sending 5, 100-byte ICMP Echos to 1.1.1.1');
    expect(failure).toContain('Success rate is 0 percent (0/5)');
  });
});