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

  it('supports configurable ping success and failure outputs', () => {
    const cli = createCiscoCli({
      pingResolver: (target) => target === '8.8.8.8',
    });

    const success = cli.run('ping 8.8.8.8').lines.join('\n');
    expect(success).toContain('Sending 5, 100-byte ICMP Echos to 8.8.8.8');
    expect(success).toContain('Success rate is 100 percent (5/5)');

    const failure = cli.run('ping 1.1.1.1').lines.join('\n');
    expect(failure).toContain('Sending 5, 100-byte ICMP Echos to 1.1.1.1');
    expect(failure).toContain('Success rate is 0 percent (0/5)');
  });
});