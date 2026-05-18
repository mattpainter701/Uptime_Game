import { describe, expect, it } from 'vitest';
import { createFortiCli } from './mockFortiCli';

describe('createFortiCli', () => {
  it('renders FortiOS help trees and prompt transitions', () => {
    const cli = createFortiCli({ hostname: 'FGT-A' });

    expect(cli.getPrompt()).toBe('FGT-A #');

    const execHelp = cli.run('config ?');
    expect(execHelp.lines).toEqual(expect.arrayContaining([
      '  system global                Enter global system settings',
      '  system interface             Enter interface configuration',
      '  firewall policy              Enter firewall policy configuration',
    ]));

    cli.run('config system interface');
    expect(cli.getPrompt()).toBe('FGT-A (system interface) #');

    const sectionHelp = cli.run('?');
    expect(sectionHelp.lines).toEqual(expect.arrayContaining([
      '  edit <name>                  Create or select an interface',
      '  show                         Display all interface definitions',
      '  end                          Return to the exec prompt',
    ]));
  });

  it('updates interface, policy, address, service and route state through FortiOS config mode', () => {
    const cli = createFortiCli({ hostname: 'FGT-1' });

    cli.run('config system interface');
    cli.run('edit port3');
    expect(cli.getPrompt()).toBe('FGT-1 (interface port3) #');
    cli.run('set alias guest');
    cli.run('set ip 10.10.10.1 255.255.255.0');
    cli.run('set allowaccess ping https ssh');
    cli.run('set status up');
    cli.run('next');
    expect(cli.getPrompt()).toBe('FGT-1 (system interface) #');
    cli.run('end');

    cli.run('config firewall policy');
    cli.run('edit 10');
    cli.run('set name guest-to-wan');
    cli.run('set srcintf port3');
    cli.run('set dstintf port1');
    cli.run('set action deny');
    cli.run('set service ALL');
    cli.run('set nat disable');
    cli.run('set logtraffic utm');
    cli.run('next');
    cli.run('end');

    cli.run('config firewall address');
    cli.run('edit GUEST_NET');
    cli.run('set subnet 10.10.10.0 255.255.255.0');
    cli.run('set interface port3');
    cli.run('next');
    cli.run('end');

    cli.run('config firewall service custom');
    cli.run('edit HTTPS-APP');
    cli.run('set protocol TCP');
    cli.run('set tcp-portrange 8443');
    cli.run('next');
    cli.run('end');

    cli.run('config router static');
    cli.run('edit 20');
    cli.run('set dst 192.168.50.0/24');
    cli.run('set gateway 203.0.113.254');
    cli.run('set device port1');
    cli.run('set distance 5');
    cli.run('next');
    cli.run('end');

    const interfaces = cli.run('show system interface').lines.join('\n');
    expect(interfaces).toContain('port3');
    expect(interfaces).toContain('guest');
    expect(interfaces).toContain('10.10.10.1/255.255.255.0');
    expect(interfaces).toContain('ping,https,ssh');

    const policies = cli.run('show firewall policy').lines.join('\n');
    expect(policies).toContain('10');
    expect(policies).toContain('guest-to-wan');
    expect(policies).toContain('deny');
    expect(policies).toContain('utm');

    const addresses = cli.run('show firewall address').lines.join('\n');
    expect(addresses).toContain('GUEST_NET');
    expect(addresses).toContain('10.10.10.0 255.255.255.0');

    const services = cli.run('show firewall service custom').lines.join('\n');
    expect(services).toContain('HTTPS-APP');
    expect(services).toContain('8443');

    const routes = cli.run('get router info routing-table all').lines.join('\n');
    expect(routes).toContain('192.168.50.0/24');
    expect(routes).toContain('203.0.113.254');
  });

  it('supports system status output and rejects invalid commands with FortiOS-style errors', () => {
    const cli = createFortiCli({ hostname: 'FGT-EDGE', global: { admintimeout: 12, timezone: 'PST' } });

    const status = cli.run('get system status').lines.join('\n');
    expect(status).toContain('Hostname: FGT-EDGE');
    expect(status).toContain('Admin timeout: 12 minutes');
    expect(status).toContain('Timezone: PST');

    const invalid = cli.run('nope').lines;
    expect(invalid).toEqual(['Command fail. Return code -61']);
  });
});

describe('autocomplete', () => {
  it('returns top-level exec commands on empty input', () => {
    const cli = createFortiCli();
    const completions = cli.autocomplete('');
    expect(completions).toEqual(['config', 'diagnose', 'exit', 'get', 'show']);
  });

  it('completes partial top-level command to single match', () => {
    const cli = createFortiCli();
    expect(cli.autocomplete('sh')).toEqual(['show']);
    expect(cli.autocomplete('con')).toEqual(['config']);
    expect(cli.autocomplete('g')).toEqual(['get']);
  });

  it('completes second-level after trailing space (show subcommands)', () => {
    const cli = createFortiCli();
    const completions = cli.autocomplete('show ');
    expect(completions).toEqual(['firewall', 'router', 'system']);
  });

  it('completes get subcommands', () => {
    const cli = createFortiCli();
    expect(cli.autocomplete('get ')).toEqual(['router', 'system']);
  });

  it('completes show firewall subcommands', () => {
    const cli = createFortiCli();
    const completions = cli.autocomplete('show firewall ');
    expect(completions).toEqual(['address', 'policy', 'service']);
  });

  it('completes show firewall service to custom', () => {
    const cli = createFortiCli();
    expect(cli.autocomplete('show firewall service ')).toEqual(['custom']);
  });

  it('completes config system subcommands', () => {
    const cli = createFortiCli();
    const completions = cli.autocomplete('config system ');
    expect(completions).toEqual(['global', 'interface']);
  });

  it('completes policy IDs after edit in firewall-policy section', () => {
    const cli = createFortiCli();
    cli.run('config firewall policy');
    // Default policy id=1 exists, plus we add id=5
    cli.run('edit 5');
    cli.run('next');
    // Back in section mode
    const completions = cli.autocomplete('edit ');
    expect(completions).toEqual(['1', '5']);
  });

  it('completes set subcommands in edit mode', () => {
    const cli = createFortiCli();
    cli.run('config firewall policy');
    cli.run('edit 1');
    const completions = cli.autocomplete('set ');
    expect(completions).toEqual(['action', 'dstintf', 'logtraffic', 'name', 'nat', 'service', 'srcintf']);
  });

  it('completes set action values in policy edit mode', () => {
    const cli = createFortiCli();
    cli.run('config firewall policy');
    cli.run('edit 1');
    expect(cli.autocomplete('set action ')).toEqual(['accept', 'deny']);
  });

  it('completes set nat values in policy edit mode', () => {
    const cli = createFortiCli();
    cli.run('config firewall policy');
    cli.run('edit 1');
    expect(cli.autocomplete('set nat ')).toEqual(['disable', 'enable']);
  });

  it('completes set logtraffic values in policy edit mode', () => {
    const cli = createFortiCli();
    cli.run('config firewall policy');
    cli.run('edit 1');
    expect(cli.autocomplete('set logtraffic ')).toEqual(['all', 'disable', 'utm']);
  });

  it('completes set status values in interface edit mode', () => {
    const cli = createFortiCli();
    cli.run('config system interface');
    cli.run('edit port1');
    expect(cli.autocomplete('set status ')).toEqual(['down', 'up']);
  });

  it('completes set protocol values in service edit mode', () => {
    const cli = createFortiCli();
    cli.run('config firewall service custom');
    cli.run('edit MY-SVC');
    expect(cli.autocomplete('set protocol ')).toEqual(['TCP', 'TCP/UDP', 'UDP']);
  });

  it('completes set allowaccess values in interface edit mode', () => {
    const cli = createFortiCli();
    cli.run('config system interface');
    cli.run('edit port1');
    const completions = cli.autocomplete('set allowaccess ');
    expect(completions).toEqual(['http', 'https', 'ping', 'snmp', 'ssh', 'telnet']);
  });

  it('returns empty array for unrecognized partial input', () => {
    const cli = createFortiCli();
    expect(cli.autocomplete('zzz')).toEqual([]);
  });
});

describe('policy ordering', () => {
  it('shows policies in insertion order by default', () => {
    const cli = createFortiCli();
    // Default policies have id=1
    cli.run('config firewall policy');
    cli.run('edit 5');
    cli.run('set name policy-five');
    cli.run('next');
    cli.run('end');
    // Show should list id=1 first (default), then id=5 (added later)
    const lines = cli.run('show firewall policy').lines;
    const policyLines = lines.filter((l) => /^\d/.test(l));
    expect(policyLines[0]).toContain('LAN-to-WAN'); // id=1 first
    expect(policyLines[1]).toContain('policy-five'); // id=5 second
  });

  it('move <id> before <ref-id> reorders policies', () => {
    const cli = createFortiCli();
    cli.run('config firewall policy');
    cli.run('edit 5');
    cli.run('set name policy-five');
    cli.run('next');
    cli.run('move 5 before 1');
    cli.run('end');

    const lines = cli.run('show firewall policy').lines;
    const policyLines = lines.filter((l) => /^\d/.test(l));
    expect(policyLines[0]).toContain('policy-five'); // id=5 now first
    expect(policyLines[1]).toContain('LAN-to-WAN');  // id=1 now second
  });

  it('move <id> after <ref-id> reorders policies', () => {
    const cli = createFortiCli();
    cli.run('config firewall policy');
    cli.run('edit 5');
    cli.run('set name policy-five');
    cli.run('next');
    cli.run('edit 3');
    cli.run('set name policy-three');
    cli.run('next');
    // Current order: 1, 5, 3
    cli.run('move 1 after 5');
    cli.run('end');

    const lines = cli.run('show firewall policy').lines;
    const policyLines = lines.filter((l) => /^\d/.test(l));
    // Order should be: 5, 1, 3
    expect(policyLines[0]).toContain('policy-five');
    expect(policyLines[1]).toContain('LAN-to-WAN');
    expect(policyLines[2]).toContain('policy-three');
  });

  it('move with nonexistent source ID returns error', () => {
    const cli = createFortiCli();
    cli.run('config firewall policy');
    const result = cli.run('move 99 before 1');
    expect(result.lines).toEqual(['Command fail. Return code -61']);
  });

  it('move with nonexistent reference ID returns error', () => {
    const cli = createFortiCli();
    cli.run('config firewall policy');
    const result = cli.run('move 1 before 99');
    expect(result.lines).toEqual(['Command fail. Return code -61']);
  });

  it('move with invalid relation returns error', () => {
    const cli = createFortiCli();
    cli.run('config firewall policy');
    const result = cli.run('move 1 somewhere 2');
    expect(result.lines).toEqual(['Command fail. Return code -61']);
  });

  it('multiple moves accumulate correctly', () => {
    const cli = createFortiCli();
    cli.run('config firewall policy');
    cli.run('edit 5');
    cli.run('set name policy-five');
    cli.run('next');
    cli.run('edit 3');
    cli.run('set name policy-three');
    cli.run('next');
    // Order: 1, 5, 3
    cli.run('move 3 before 1');
    // Order: 3, 1, 5
    cli.run('move 5 before 3');
    // Order: 5, 3, 1
    cli.run('end');

    const lines = cli.run('show firewall policy').lines;
    const policyLines = lines.filter((l) => /^\d/.test(l));
    expect(policyLines[0]).toContain('policy-five');
    expect(policyLines[1]).toContain('policy-three');
    expect(policyLines[2]).toContain('LAN-to-WAN');
  });
});
