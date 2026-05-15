import { describe, expect, it } from 'vitest';
import { createDellCli } from './mockDellCli';

describe('createDellCli', () => {
  it('renders Dell prompts and operational show commands', () => {
    const cli = createDellCli({ hostname: 'OS10-CORE1' });

    expect(cli.getPrompt()).toBe('OS10-CORE1#');

    const help = cli.run('show ?');
    expect(help.lines).toEqual(expect.arrayContaining([
      '  running-configuration',
      '  ip interface brief',
      '  vlan',
      '  ip route',
      '  inventory',
      '  environment',
    ]));

    expect(cli.run('conf t').prompt).toBe('OS10-CORE1(conf)#');
  });

  it('updates interface, VLAN and route state in Dell config mode', () => {
    const cli = createDellCli({ hostname: 'OS10-EDGE1' });

    cli.run('configure terminal');

    cli.run('vlan 40');
    expect(cli.getPrompt()).toBe('OS10-EDGE1(conf-vlan-40)#');
    cli.run('name GUEST');
    cli.run('state active');
    cli.run('exit');

    cli.run('interface ethernet 1/1/3');
    expect(cli.getPrompt()).toBe('OS10-EDGE1(conf-if-ethernet 1/1/3)#');
    cli.run('description Guest access port');
    cli.run('switchport access vlan 40');
    cli.run('switchport mode access');
    cli.run('no shutdown');
    cli.run('exit');

    cli.run('ip route 192.168.40.0/24 10.0.0.254 5');
    cli.run('end');

    const running = cli.run('show running-configuration').lines.join('\n');
    expect(running).toContain('vlan 40');
    expect(running).toContain('name GUEST');
    expect(running).toContain('interface ethernet 1/1/3');
    expect(running).toContain('switchport access vlan 40');
    expect(running).toContain('switchport mode access');
    expect(running).toContain('ip route 192.168.40.0/24 10.0.0.254 5');

    const brief = cli.run('show ip interface brief').lines.join('\n');
    expect(brief).toContain('ethernet 1/1/3');
    expect(brief).toContain('Guest access port');
    expect(brief).toContain('40');

    const vlans = cli.run('show vlan').lines.join('\n');
    expect(vlans).toContain('40');
    expect(vlans).toContain('GUEST');

    const routes = cli.run('show ip route').lines.join('\n');
    expect(routes).toContain('192.168.40.0/24');
    expect(routes).toContain('10.0.0.254');

    expect(cli.run('show inventory').lines.join('\n')).toContain('S5148F-ON');
    expect(cli.run('show environment').lines.join('\n')).toContain('Temperature sensors: normal');
  });
});
