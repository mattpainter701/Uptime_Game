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

  it('renders all Aruba show command outputs', () => {
    const cli = createArubaCli({ hostname: 'SHOW-ALL' });

    expect(cli.run('show version').lines.join('\n')).toContain('ArubaOS-CX 10.12.1000');
    expect(cli.run('show version').lines.join('\n')).toContain('Hostname: SHOW-ALL');

    const runningConfig = cli.run('show running-config').lines.join('\n');
    expect(runningConfig).toContain('hostname SHOW-ALL');
    expect(runningConfig).toContain('vlan 1');
    expect(runningConfig).toContain('interface 1/1/1');

    const vlans = cli.run('show vlan').lines.join('\n');
    expect(vlans).toContain('1    DEFAULT_VLAN   active');
    expect(vlans).toContain('10   USERS          active');
    expect(vlans).toContain('20   VOICE          active');

    const interfaces = cli.run('show interface').lines.join('\n');
    expect(interfaces).toContain('1/1/1');
    expect(interfaces).toContain('Uplink to core');
    expect(interfaces).toContain('1/1/2');
    expect(interfaces).toContain('User access port');

    const lldp = cli.run('show lldp neighbor-info').lines.join('\n');
    expect(lldp).toContain('CORE-SW1');
    expect(lldp).toContain('ACCESS-SW2');
    expect(lldp).toContain('00:11:22:33:44:55');

    const routes = cli.run('show ip route').lines.join('\n');
    expect(routes).toContain('0.0.0.0/0');
    expect(routes).toContain('10.0.0.1');
    expect(routes).toContain('10.20.0.0/16');
  });

  it('supports conf t shortcut and end/exit mode transitions', () => {
    const cli = createArubaCli({ hostname: 'MODE-TEST' });

    // Full command
    const r1 = cli.run('configure terminal');
    expect(r1.prompt).toBe('MODE-TEST(config)#');
    expect(r1.lines).toContain('Enter configuration commands, one per line. End with CNTL/Z.');

    cli.run('end');
    expect(cli.getPrompt()).toBe('MODE-TEST#');

    // Shortcut
    cli.run('conf t');
    expect(cli.getPrompt()).toBe('MODE-TEST(config)#');

    // exit from config to exec
    cli.run('exit');
    expect(cli.getPrompt()).toBe('MODE-TEST#');

    // exit from exec disconnects
    const r2 = cli.run('exit');
    expect(r2.shouldDisconnect).toBe(true);
    expect(r2.lines).toEqual(['Logout']);

    // Sub-mode transitions
    const cli2 = createArubaCli({ hostname: 'SUB' });
    cli2.run('configure terminal');

    cli2.run('interface 1/1/1');
    expect(cli2.getPrompt()).toBe('SUB(config-if-1/1/1)#');
    cli2.run('exit');
    expect(cli2.getPrompt()).toBe('SUB(config)#');

    cli2.run('interface 1/1/2');
    cli2.run('end');
    expect(cli2.getPrompt()).toBe('SUB#');

    // vlan sub-mode transitions
    cli2.run('conf t');
    cli2.run('vlan 50');
    expect(cli2.getPrompt()).toBe('SUB(config-vlan-50)#');
    cli2.run('exit');
    expect(cli2.getPrompt()).toBe('SUB(config)#');

    cli2.run('vlan 60');
    cli2.run('end');
    expect(cli2.getPrompt()).toBe('SUB#');

    // routing sub-mode
    cli2.run('conf t');
    cli2.run('routing');
    expect(cli2.getPrompt()).toBe('SUB(config-router)#');
    cli2.run('end');
    expect(cli2.getPrompt()).toBe('SUB#');
  });

  it('handles invalid commands at all mode levels', () => {
    const cli = createArubaCli({ hostname: 'ERR-TEST' });

    // Invalid at exec
    const e1 = cli.run('garbage');
    expect(e1.lines[0]).toContain('% Invalid input');
    expect(e1.prompt).toBe('ERR-TEST#');

    // Invalid at config
    cli.run('conf t');
    const e2 = cli.run('nonsense');
    expect(e2.lines).toEqual(['% Unrecognized command']);
    expect(e2.prompt).toBe('ERR-TEST(config)#');

    // Invalid at interface sub-mode
    cli.run('interface 1/1/1');
    const e3 = cli.run('bogus');
    expect(e3.lines).toEqual(['% Unrecognized interface command']);
    expect(e3.prompt).toBe('ERR-TEST(config-if-1/1/1)#');

    // Invalid at VLAN sub-mode
    cli.run('end');
    cli.run('conf t');
    cli.run('vlan 10');
    const e4 = cli.run('invalid-vlan-cmd');
    expect(e4.lines).toEqual(['% Unrecognized VLAN command']);
    expect(e4.prompt).toBe('ERR-TEST(config-vlan-10)#');

    // Invalid at routing sub-mode
    cli.run('end');
    cli.run('conf t');
    cli.run('routing');
    const e5 = cli.run('not-a-route-cmd');
    expect(e5.lines).toEqual(['% Unrecognized routing command']);
    expect(e5.prompt).toBe('ERR-TEST(config-router)#');
  });

  it('provides contextual help at all mode levels', () => {
    const cli = createArubaCli({ hostname: 'HELP' });

    // Exec help via 'help' command
    const execHelp = cli.run('help').lines;
    expect(execHelp).toContain('  show                 Display operational information');
    expect(execHelp).toContain('  configure terminal   Enter configuration mode');
    expect(execHelp).toContain('  conf t               Enter configuration mode');
    expect(execHelp).toContain('  exit                 Leave the session');

    // Bare ? at exec returns show subcommand autocomplete
    const showAuto = cli.run('?').lines;
    expect(showAuto).toContain('  running-config');
    expect(showAuto).toContain('  vlan');
    expect(showAuto).toContain('  interface');
    expect(showAuto).toContain('  lldp neighbor-info');
    expect(showAuto).toContain('  ip route');
    expect(showAuto).toContain('  version');

    // Config help
    cli.run('conf t');
    const configHelp = cli.run('?').lines;
    expect(configHelp).toContain('  hostname <name>      Set the switch hostname');
    expect(configHelp).toContain('  interface <name>     Enter interface configuration');
    expect(configHelp).toContain('  vlan <id>            Enter VLAN configuration');
    expect(configHelp).toContain('  routing              Enter routing configuration');
    expect(configHelp).toContain('  end                  Return to exec mode');

    // Interface autocomplete
    expect(cli.run('interface ?').lines).toEqual(['  1/1/1', '  1/1/2', '  1/1/3']);
    // VLAN autocomplete
    expect(cli.run('vlan ?').lines).toEqual(['  1', '  10', '  20']);

    // Interface sub-mode help
    cli.run('interface 1/1/1');
    const ifaceHelp = cli.run('?').lines;
    expect(ifaceHelp).toContain('  description <text>   Set the interface description');
    expect(ifaceHelp).toContain('  vlan access <id>     Assign an access VLAN');
    expect(ifaceHelp).toContain('  no shutdown          Enable the interface');
    expect(ifaceHelp).toContain('  shutdown             Disable the interface');

    cli.run('end');

    // VLAN sub-mode help
    cli.run('conf t');
    cli.run('vlan 10');
    const vlanHelp = cli.run('?').lines;
    expect(vlanHelp).toContain('  name <text>          Set the VLAN name');
    expect(vlanHelp).toContain('  active               Mark the VLAN active');
    expect(vlanHelp).toContain('  shutdown             Mark the VLAN inactive');

    cli.run('end');

    // Routing sub-mode help
    cli.run('conf t');
    cli.run('routing');
    const routeHelp = cli.run('?').lines;
    expect(routeHelp).toContain('  ip route <prefix> <next-hop>  Add a static route');
    expect(routeHelp).toContain('  end                          Return to exec mode');
  });

  it('updates hostname and reflects it in prompts and running-config', () => {
    const cli = createArubaCli({ hostname: 'ORIGINAL' });

    expect(cli.getPrompt()).toBe('ORIGINAL#');

    cli.run('conf t');
    cli.run('hostname NEW-NAME');
    expect(cli.getPrompt()).toBe('NEW-NAME(config)#');

    // Check prompt in sub-modes with new hostname
    cli.run('interface 1/1/1');
    expect(cli.getPrompt()).toBe('NEW-NAME(config-if-1/1/1)#');
    cli.run('exit');

    cli.run('vlan 99');
    expect(cli.getPrompt()).toBe('NEW-NAME(config-vlan-99)#');
    cli.run('exit');

    cli.run('routing');
    expect(cli.getPrompt()).toBe('NEW-NAME(config-router)#');
    cli.run('end');

    expect(cli.getPrompt()).toBe('NEW-NAME#');

    // Running config reflects new hostname
    const running = cli.run('show running-config').lines.join('\n');
    expect(running).toContain('hostname NEW-NAME');
    expect(running).not.toContain('hostname ORIGINAL');
  });

  it('rejects invalid VLAN ids', () => {
    const cli = createArubaCli({ hostname: 'VLAN-TEST' });

    cli.run('conf t');

    // Non-numeric VLAN id
    const r1 = cli.run('vlan abc');
    expect(r1.lines).toEqual(['% Invalid VLAN id']);
    expect(r1.prompt).toBe('VLAN-TEST(config)#');

    // Non-numeric VLAN in vlan access
    cli.run('interface 1/1/1');
    const r2 = cli.run('vlan access xyz');
    expect(r2.lines).toEqual(['% Invalid VLAN id']);
    expect(r2.prompt).toBe('VLAN-TEST(config-if-1/1/1)#');
  });

  it('snapshot reflects all state mutations with isolation', () => {
    const cli = createArubaCli({ hostname: 'SNAP' });

    const snap1 = cli.snapshot();
    expect(snap1.hostname).toBe('SNAP');
    expect(snap1.mode).toBe('exec');
    expect(snap1.interfaces).toHaveLength(3);
    expect(snap1.vlans).toHaveLength(3);
    expect(snap1.routes).toHaveLength(2);

    cli.run('configure terminal');

    // Mutate hostname
    cli.run('hostname SNAP-MUTATED');

    // Mutate interface
    cli.run('interface 1/1/3');
    cli.run('description Mutated port');
    cli.run('vlan access 20');
    cli.run('no shutdown');
    cli.run('exit');

    // Mutate VLAN
    cli.run('vlan 10');
    cli.run('name MUTATED-VLAN');
    cli.run('shutdown');
    cli.run('exit');

    // Add route
    cli.run('routing');
    cli.run('ip route 172.16.0.0/12 10.0.0.99 1/1/2');
    cli.run('end');

    const snap2 = cli.snapshot();
    expect(snap2.hostname).toBe('SNAP-MUTATED');
    expect(snap2.mode).toBe('exec');

    const iface3 = snap2.interfaces.find((i) => i.name === '1/1/3');
    expect(iface3?.description).toBe('Mutated port');
    expect(iface3?.vlanId).toBe(20);
    expect(iface3?.adminState).toBe('up');

    const vlan10 = snap2.vlans.find((v) => v.id === 10);
    expect(vlan10?.name).toBe('MUTATED-VLAN');
    expect(vlan10?.active).toBe(false);

    expect(snap2.routes).toHaveLength(3);

    // Verify snapshot isolation: snap1 unchanged
    expect(snap1.hostname).toBe('SNAP');
    const origIface = snap1.interfaces.find((i) => i.name === '1/1/3');
    expect(origIface?.description).toBe('');
  });

  it('handles empty and clear commands gracefully', () => {
    const cli = createArubaCli({ hostname: 'EDGE' });

    // Empty at exec
    const r1 = cli.run('');
    expect(r1.lines).toEqual([]);
    expect(r1.prompt).toBe('EDGE#');
    expect(r1.shouldDisconnect).toBe(false);

    // Clear at exec
    const r2 = cli.run('clear');
    expect(r2.lines).toEqual([]);
    expect(r2.prompt).toBe('EDGE#');

    // Empty in config
    cli.run('conf t');
    const r3 = cli.run('');
    expect(r3.lines).toEqual([]);
    expect(r3.prompt).toBe('EDGE(config)#');

    // Empty in interface sub-mode
    cli.run('interface 1/1/1');
    const r4 = cli.run('   ');
    expect(r4.lines).toEqual([]);
    expect(r4.prompt).toBe('EDGE(config-if-1/1/1)#');

    // Clear in sub-mode
    const r5 = cli.run('clear');
    expect(r5.lines).toEqual([]);
    expect(r5.prompt).toBe('EDGE(config-if-1/1/1)#');
  });

  it('supports exec help command', () => {
    const cli = createArubaCli({ hostname: 'HLP' });

    const help = cli.run('help');
    expect(help.lines).toContain('  show                 Display operational information');
    expect(help.lines).toContain('  configure terminal   Enter configuration mode');
    expect(help.lines).toContain('  exit                 Leave the session');
    expect(help.prompt).toBe('HLP#');
    expect(help.shouldDisconnect).toBe(false);
  });
});
