import { describe, expect, it } from 'vitest';
import { createArubaCli } from './mockArubaCli';

describe('createArubaCli', () => {
  it('renders Aruba prompts and operational show commands', () => {
    const cli = createArubaCli({ hostname: 'AOS-CORE1' });

    expect(cli.getPrompt()).toBe('AOS-CORE1#');

    const help = cli.run('show ?');
    expect(help.lines).toEqual(expect.arrayContaining([
      '  running-config',
      '  vlan',
      '  interface',
      '  lldp neighbor-info',
      '  ip route',
    ]));

    expect(cli.run('configure terminal').prompt).toBe('AOS-CORE1(config)#');
  });

  it('updates VLAN, interface and routing state in Aruba config mode', () => {
    const cli = createArubaCli({ hostname: 'AOS-EDGE1' });

    cli.run('conf t');

    cli.run('vlan 30');
    expect(cli.getPrompt()).toBe('AOS-EDGE1(config-vlan-30)#');
    cli.run('name GUEST');
    cli.run('shutdown');
    cli.run('exit');

    cli.run('interface 1/1/3');
    expect(cli.getPrompt()).toBe('AOS-EDGE1(config-if-1/1/3)#');
    cli.run('description Guest access port');
    cli.run('vlan access 30');
    cli.run('no shutdown');
    cli.run('exit');

    cli.run('routing');
    expect(cli.getPrompt()).toBe('AOS-EDGE1(config-router)#');
    cli.run('ip route 192.168.30.0/24 10.0.0.254 1/1/1');
    cli.run('end');

    const running = cli.run('show running-config').lines.join('\n');
    expect(running).toContain('vlan 30');
    expect(running).toContain('name GUEST');
    expect(running).toContain('interface 1/1/3');
    expect(running).toContain('description Guest access port');
    expect(running).toContain('vlan access 30');
    expect(running).toContain('ip route 192.168.30.0/24 10.0.0.254 1/1/1');

    const vlans = cli.run('show vlan').lines.join('\n');
    expect(vlans).toContain('30');
    expect(vlans).toContain('GUEST');

    const interfaces = cli.run('show interface').lines.join('\n');
    expect(interfaces).toContain('1/1/3');
    expect(interfaces).toContain('Guest access port');
    expect(interfaces).toContain('30');

    const routes = cli.run('show ip route').lines.join('\n');
    expect(routes).toContain('192.168.30.0/24');
    expect(routes).toContain('10.0.0.254');
  });
});
