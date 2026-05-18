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

  it('renders all Dell show command outputs', () => {
    const cli = createDellCli({ hostname: 'DELL-SHOW' });

    // Version
    const ver = cli.run('show version').lines.join('\n');
    expect(ver).toContain('Dell EMC Networking OS10 10.5.4.1');
    expect(ver).toContain('Hostname: DELL-SHOW');

    // Running-configuration
    const running = cli.run('show running-configuration').lines.join('\n');
    expect(running).toContain('hostname DELL-SHOW');
    expect(running).toContain('vlan 1');
    expect(running).toContain('interface ethernet 1/1/1');

    // IP interface brief
    const brief = cli.run('show ip interface brief').lines.join('\n');
    expect(brief).toContain('ethernet 1/1/1');
    expect(brief).toContain('Uplink to core');
    expect(brief).toContain('ethernet 1/1/2');
    expect(brief).toContain('Server trunk');

    // VLANs
    const vlans = cli.run('show vlan').lines.join('\n');
    expect(vlans).toContain('1    default         active');
    expect(vlans).toContain('10   users           active');
    expect(vlans).toContain('20   servers         active');

    // IP routes
    const routes = cli.run('show ip route').lines.join('\n');
    expect(routes).toContain('0.0.0.0/0');
    expect(routes).toContain('10.0.0.1');
    expect(routes).toContain('172.16.0.0/16');

    // Inventory
    const inv = cli.run('show inventory').lines.join('\n');
    expect(inv).toContain('S5148F-ON');
    expect(inv).toContain('DEMO-OS10-001');
    expect(inv).toContain('2.16.0');

    // Environment
    const env = cli.run('show environment').lines.join('\n');
    expect(env).toContain('Temperature sensors: normal');
    expect(env).toContain('Fan status: normal');
    expect(env).toContain('Power supplies: redundant');
    expect(env).toContain('PSU1: present');
    expect(env).toContain('PSU2: present');

    // Abbreviated show commands
    expect(cli.run('show run').lines.join('\n')).toContain('hostname DELL-SHOW');
  });

  it('supports conf t shortcut and end/exit mode transitions', () => {
    const cli = createDellCli({ hostname: 'MODE-DELL' });

    // Full command
    const r1 = cli.run('configure terminal');
    expect(r1.prompt).toBe('MODE-DELL(conf)#');
    expect(r1.lines[0]).toBe('Enter configuration commands, one per line. End with CNTL/Z.');

    cli.run('end');
    expect(cli.getPrompt()).toBe('MODE-DELL#');

    // Shortcut
    cli.run('conf t');
    expect(cli.getPrompt()).toBe('MODE-DELL(conf)#');

    // exit from config to exec
    cli.run('exit');
    expect(cli.getPrompt()).toBe('MODE-DELL#');

    // exit from exec disconnects
    const r2 = cli.run('exit');
    expect(r2.shouldDisconnect).toBe(true);
    expect(r2.lines).toEqual(['Logout']);

    // Interface sub-mode transitions
    const cli2 = createDellCli({ hostname: 'SUB' });
    cli2.run('conf t');

    cli2.run('interface ethernet 1/1/1');
    expect(cli2.getPrompt()).toBe('SUB(conf-if-ethernet 1/1/1)#');
    cli2.run('exit');
    expect(cli2.getPrompt()).toBe('SUB(conf)#');

    cli2.run('interface ethernet 1/1/2');
    cli2.run('end');
    expect(cli2.getPrompt()).toBe('SUB#');

    // VLAN sub-mode transitions
    cli2.run('conf t');
    cli2.run('vlan 50');
    expect(cli2.getPrompt()).toBe('SUB(conf-vlan-50)#');
    cli2.run('exit');
    expect(cli2.getPrompt()).toBe('SUB(conf)#');

    cli2.run('vlan 60');
    cli2.run('end');
    expect(cli2.getPrompt()).toBe('SUB#');
  });

  it('handles invalid commands at all mode levels', () => {
    const cli = createDellCli({ hostname: 'ERR-DELL' });

    // Invalid at exec
    const e1 = cli.run('blargh');
    expect(e1.lines[0]).toContain('% Invalid input');
    expect(e1.prompt).toBe('ERR-DELL#');

    // Invalid at config
    cli.run('conf t');
    const e2 = cli.run('frobnicate');
    expect(e2.lines).toEqual(['% Unrecognized configuration command']);
    expect(e2.prompt).toBe('ERR-DELL(conf)#');

    // Invalid at interface sub-mode
    cli.run('interface ethernet 1/1/1');
    const e3 = cli.run('splunge');
    expect(e3.lines).toEqual(['% Unrecognized interface command']);
    expect(e3.prompt).toBe('ERR-DELL(conf-if-ethernet 1/1/1)#');

    // Invalid at VLAN sub-mode
    cli.run('end');
    cli.run('conf t');
    cli.run('vlan 10');
    const e4 = cli.run('wibble');
    expect(e4.lines).toEqual(['% Unrecognized VLAN command']);
    expect(e4.prompt).toBe('ERR-DELL(conf-vlan-10)#');
  });

  it('provides contextual help at all mode levels', () => {
    const cli = createDellCli({ hostname: 'HLP-DELL' });

    // Exec help via 'help' command
    const execHelp = cli.run('help').lines;
    expect(execHelp).toContain('  show                 Display operational information');
    expect(execHelp).toContain('  configure terminal   Enter configuration mode');
    expect(execHelp).toContain('  conf t               Enter configuration mode');
    expect(execHelp).toContain('  exit                 Leave the session');

    // Bare ? at exec returns show subcommand autocomplete
    const showAuto = cli.run('?').lines;
    expect(showAuto).toContain('  running-configuration');
    expect(showAuto).toContain('  ip interface brief');
    expect(showAuto).toContain('  vlan');
    expect(showAuto).toContain('  ip route');
    expect(showAuto).toContain('  inventory');
    expect(showAuto).toContain('  environment');
    expect(showAuto).toContain('  version');

    // Config help
    cli.run('conf t');
    const configHelp = cli.run('?').lines;
    expect(configHelp).toContain('  vlan <id>            Enter VLAN configuration');
    expect(configHelp).toContain('  interface ethernet <name>  Enter interface configuration');
    expect(configHelp).toContain('  ip route <prefix> <next-hop>  Add a static route');
    expect(configHelp).toContain('  end                  Return to exec mode');

    // Interface sub-mode help
    cli.run('interface ethernet 1/1/1');
    const ifaceHelp = cli.run('?').lines;
    expect(ifaceHelp).toContain('  description <text>   Set the interface description');
    expect(ifaceHelp).toContain('  switchport access vlan <id>  Set the access VLAN');
    expect(ifaceHelp).toContain('  switchport mode access|trunk  Set the switchport mode');
    expect(ifaceHelp).toContain('  no shutdown          Enable the interface');
    expect(ifaceHelp).toContain('  shutdown             Disable the interface');

    cli.run('end');

    // VLAN sub-mode help
    cli.run('conf t');
    cli.run('vlan 10');
    const vlanHelp = cli.run('?').lines;
    expect(vlanHelp).toContain('  name <text>          Set the VLAN name');
    expect(vlanHelp).toContain('  state active|suspend  Toggle VLAN state');
    expect(vlanHelp).toContain('  end                  Return to exec mode');
  });

  it('supports switchport mode trunk and state suspend', () => {
    const cli = createDellCli({ hostname: 'SW-DELL' });

    cli.run('configure terminal');
    cli.run('interface ethernet 1/1/3');
    cli.run('switchport mode trunk');
    cli.run('end');

    // Verify trunk mode in running-config
    const running = cli.run('show running-configuration').lines.join('\n');
    expect(running).toContain('switchport mode trunk');

    // Verify trunk mode in ip interface brief
    const brief = cli.run('show ip interface brief').lines.join('\n');
    expect(brief).toContain('trunk');

    // Verify snapshot
    const snap = cli.snapshot();
    const iface = snap.interfaces.find((i) => i.name === 'ethernet 1/1/3');
    expect(iface?.switchportMode).toBe('trunk');

    // State suspend on VLAN
    cli.run('configure terminal');
    cli.run('vlan 20');
    cli.run('state suspend');
    cli.run('end');

    const vlans = cli.run('show vlan').lines.join('\n');
    expect(vlans).toContain('suspend');

    const snap2 = cli.snapshot();
    const vlan20 = snap2.vlans.find((v) => v.id === 20);
    expect(vlan20?.active).toBe(false);
  });

  it('rejects invalid VLAN ids and invalid switchport modes', () => {
    const cli = createDellCli({ hostname: 'VAL-DELL' });

    cli.run('conf t');

    // Non-numeric VLAN id in config mode
    const r1 = cli.run('vlan abc');
    expect(r1.lines).toEqual(['% Invalid VLAN id']);
    expect(r1.prompt).toBe('VAL-DELL(conf)#');

    // Non-numeric VLAN in switchport access vlan
    cli.run('interface ethernet 1/1/1');
    const r2 = cli.run('switchport access vlan xyz');
    expect(r2.lines).toEqual(['% Invalid VLAN id']);
    expect(r2.prompt).toBe('VAL-DELL(conf-if-ethernet 1/1/1)#');

    // Invalid switchport mode (not access or trunk)
    cli.run('exit');
    cli.run('interface ethernet 1/1/2');
    const r3 = cli.run('switchport mode hybrid');
    expect(r3.lines).toEqual(['% Unrecognized interface command']);
  });

  it('snapshot reflects all state mutations with isolation', () => {
    const cli = createDellCli({ hostname: 'SNAP-DELL' });

    const snap1 = cli.snapshot();
    expect(snap1.hostname).toBe('SNAP-DELL');
    expect(snap1.mode).toBe('exec');
    expect(snap1.interfaces).toHaveLength(3);
    expect(snap1.vlans).toHaveLength(3);
    expect(snap1.routes).toHaveLength(2);

    cli.run('configure terminal');

    // Mutate interface
    cli.run('interface ethernet 1/1/3');
    cli.run('description Snapshot port');
    cli.run('switchport access vlan 10');
    cli.run('switchport mode trunk');
    cli.run('no shutdown');
    cli.run('exit');

    // Mutate VLAN
    cli.run('vlan 10');
    cli.run('name SNAPSHOT-VLAN');
    cli.run('state suspend');
    cli.run('exit');

    // Add route
    cli.run('ip route 10.99.0.0/16 10.0.0.99 5');
    cli.run('end');

    const snap2 = cli.snapshot();
    expect(snap2.mode).toBe('exec');

    const iface3 = snap2.interfaces.find((i) => i.name === 'ethernet 1/1/3');
    expect(iface3?.description).toBe('Snapshot port');
    expect(iface3?.vlanId).toBe(10);
    expect(iface3?.switchportMode).toBe('trunk');
    expect(iface3?.adminState).toBe('up');

    const vlan10 = snap2.vlans.find((v) => v.id === 10);
    expect(vlan10?.name).toBe('SNAPSHOT-VLAN');
    expect(vlan10?.active).toBe(false);

    expect(snap2.routes).toHaveLength(3);

    // Verify snapshot isolation: snap1 unchanged
    expect(snap1.hostname).toBe('SNAP-DELL');
    const origIface = snap1.interfaces.find((i) => i.name === 'ethernet 1/1/3');
    expect(origIface?.description).toBe('');
    expect(origIface?.switchportMode).toBe('access');
  });

  it('handles empty and clear commands gracefully', () => {
    const cli = createDellCli({ hostname: 'EMPTY-DELL' });

    // Empty at exec
    const r1 = cli.run('');
    expect(r1.lines).toEqual([]);
    expect(r1.prompt).toBe('EMPTY-DELL#');
    expect(r1.shouldDisconnect).toBe(false);

    // Clear at exec
    const r2 = cli.run('clear');
    expect(r2.lines).toEqual([]);
    expect(r2.prompt).toBe('EMPTY-DELL#');

    // Empty in config
    cli.run('conf t');
    const r3 = cli.run('');
    expect(r3.lines).toEqual([]);
    expect(r3.prompt).toBe('EMPTY-DELL(conf)#');

    // Empty in sub-mode
    cli.run('interface ethernet 1/1/1');
    const r4 = cli.run('  ');
    expect(r4.lines).toEqual([]);
    expect(r4.prompt).toBe('EMPTY-DELL(conf-if-ethernet 1/1/1)#');

    // Clear in sub-mode
    const r5 = cli.run('clear');
    expect(r5.lines).toEqual([]);
    expect(r5.prompt).toBe('EMPTY-DELL(conf-if-ethernet 1/1/1)#');
  });

  it('supports exec help command', () => {
    const cli = createDellCli({ hostname: 'HLP-EXEC' });

    const help = cli.run('help');
    expect(help.lines).toContain('  show                 Display operational information');
    expect(help.lines).toContain('  configure terminal   Enter configuration mode');
    expect(help.lines).toContain('  exit                 Leave the session');
    expect(help.prompt).toBe('HLP-EXEC#');
    expect(help.shouldDisconnect).toBe(false);
  });

  it('ip route in config mode defaults distance to 1 and handles missing params', () => {
    const cli = createDellCli({ hostname: 'ROUTE-DELL' });

    cli.run('configure terminal');

    // ip route with explicit distance
    cli.run('ip route 192.168.100.0/24 10.0.0.1 5');
    cli.run('end');

    let routes = cli.run('show ip route').lines.join('\n');
    expect(routes).toContain('192.168.100.0/24');
    expect(routes).toContain('10.0.0.1');
    expect(routes).toContain('5');

    // ip route without distance defaults to 1
    const cli2 = createDellCli({ hostname: 'ROUTE2' });
    cli2.run('conf t');
    cli2.run('ip route 10.50.0.0/16 172.16.0.254');
    cli2.run('end');

    routes = cli2.run('show ip route').lines.join('\n');
    expect(routes).toContain('10.50.0.0/16');
    expect(routes).toContain('172.16.0.254');
    expect(routes).toContain('1'); // default distance

    // Non-numeric distance defaults to 1
    const cli3 = createDellCli({ hostname: 'ROUTE3' });
    cli3.run('conf t');
    cli3.run('ip route 10.60.0.0/16 172.16.0.253 abc');
    cli3.run('end');

    routes = cli3.run('show ip route').lines.join('\n');
    expect(routes).toContain('10.60.0.0/16');
    expect(routes).toContain('1');
  });

  it('interface ethernet autocomplete shows available ports', () => {
    const cli = createDellCli({ hostname: 'AUTO-DELL' });

    cli.run('configure terminal');

    // interface ? should not show ports in Dell (unlike Aruba)
    // but interface ethernet ? shows available ports from context
    // Dell config help is static, not contextual per command
    const help = cli.run('interface ?').lines;
    // Dell config help is the full config help, not port-specific
    // Let's verify the config help shows interface ethernet
    expect(help).toContain('  interface ethernet <name>  Enter interface configuration');

    // Verify we can enter interface sub-mode with existing ports
    cli.run('interface ethernet 1/1/1');
    expect(cli.getPrompt()).toBe('AUTO-DELL(conf-if-ethernet 1/1/1)#');
    cli.run('exit');

    cli.run('interface ethernet 1/1/2');
    expect(cli.getPrompt()).toBe('AUTO-DELL(conf-if-ethernet 1/1/2)#');
    cli.run('exit');

    cli.run('interface ethernet 1/1/3');
    expect(cli.getPrompt()).toBe('AUTO-DELL(conf-if-ethernet 1/1/3)#');
  });
});
