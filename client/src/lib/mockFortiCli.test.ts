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

  describe('autocomplete', () => {
    it('completes top-level commands in exec mode', () => {
      const cli = createFortiCli({ hostname: 'FGT' });
      expect(cli.autocomplete('')).toEqual(expect.arrayContaining(['get', 'show', 'config', 'exit']));
      expect(cli.autocomplete('co')).toEqual(['config']);
      expect(cli.autocomplete('sh')).toEqual(['show']);
      expect(cli.autocomplete('g')).toEqual(['get']);
    });

    it('completes config tree progressively', () => {
      const cli = createFortiCli({ hostname: 'FGT' });
      expect(cli.autocomplete('config ')).toEqual(expect.arrayContaining(['system', 'firewall', 'router']));
      expect(cli.autocomplete('config s')).toEqual(['system']);
      expect(cli.autocomplete('config system ')).toEqual(expect.arrayContaining(['global', 'interface']));
      expect(cli.autocomplete('config firewall ')).toEqual(expect.arrayContaining(['policy', 'address', 'service']));
      expect(cli.autocomplete('config firewall service ')).toEqual(['custom']);
      expect(cli.autocomplete('config router ')).toEqual(['static']);
    });

    it('completes show commands progressively', () => {
      const cli = createFortiCli({ hostname: 'FGT' });
      expect(cli.autocomplete('show ')).toEqual(expect.arrayContaining(['system', 'firewall', 'router']));
      expect(cli.autocomplete('show f')).toEqual(['firewall']);
      expect(cli.autocomplete('show firewall ')).toEqual(expect.arrayContaining(['policy', 'address', 'service']));
    });

    it('completes get commands progressively', () => {
      const cli = createFortiCli({ hostname: 'FGT' });
      expect(cli.autocomplete('get ')).toEqual(expect.arrayContaining(['system', 'router']));
      expect(cli.autocomplete('get system ')).toEqual(expect.arrayContaining(['status', 'interface']));
      expect(cli.autocomplete('get router info ')).toEqual(['routing-table']);
      expect(cli.autocomplete('get router info routing-table ')).toEqual(['all']);
    });

    it('completes section-level commands', () => {
      const cli = createFortiCli({ hostname: 'FGT' });
      cli.run('config system interface');
      expect(cli.autocomplete('')).toEqual(expect.arrayContaining(['edit', 'show', 'end', 'exit']));
      cli.run('end');

      cli.run('config firewall policy');
      const completions = cli.autocomplete('');
      expect(completions).toEqual(expect.arrayContaining(['edit', 'show', 'end', 'exit', 'move']));
    });

    it('completes set subcommands in edit mode', () => {
      const cli = createFortiCli({ hostname: 'FGT' });
      cli.run('config system interface');
      cli.run('edit port9');
      // After typing "set "
      expect(cli.autocomplete('set ')).toEqual(expect.arrayContaining(['ip', 'alias', 'allowaccess', 'status']));

      cli.run('end');
      cli.run('config firewall policy');
      cli.run('edit 20');
      expect(cli.autocomplete('set ')).toEqual(expect.arrayContaining(['name', 'srcintf', 'dstintf', 'action', 'service', 'nat', 'logtraffic']));

      cli.run('end');
      cli.run('config router static');
      cli.run('edit 30');
      expect(cli.autocomplete('set ')).toEqual(expect.arrayContaining(['dst', 'gateway', 'device', 'distance', 'status']));
    });

    it('returns filtered empty for unknown input', () => {
      const cli = createFortiCli({ hostname: 'FGT' });
      expect(cli.autocomplete('xyz')).toEqual([]);
    });
  });

  describe('policy ordering', () => {
    it('shows policies in insertion order, not sorted by ID', () => {
      const cli = createFortiCli({ hostname: 'FGT' });
      cli.run('config firewall policy');
      // Create policies out of ID order
      cli.run('edit 10');
      cli.run('set name policy-ten');
      cli.run('next');
      cli.run('edit 5');
      cli.run('set name policy-five');
      cli.run('next');
      cli.run('end');

      const show = cli.run('show firewall policy').lines.join('\n');
      const tenIdx = show.indexOf('policy-ten');
      const fiveIdx = show.indexOf('policy-five');
      // Since 10 was created first, it should appear before 5
      expect(tenIdx).toBeLessThan(fiveIdx);
    });

    it('supports move before command to reorder policies', () => {
      const cli = createFortiCli({ hostname: 'FGT' });
      cli.run('config firewall policy');
      cli.run('edit 1');
      cli.run('set name first');
      cli.run('next');
      cli.run('edit 2');
      cli.run('set name second');
      cli.run('next');

      // move 2 before 1
      cli.run('move 2 before 1');
      cli.run('end');

      const show = cli.run('show firewall policy').lines.join('\n');
      const secondIdx = show.indexOf('second');
      const firstIdx = show.indexOf('first');
      expect(secondIdx).toBeLessThan(firstIdx);
    });

    it('supports move after command to reorder policies', () => {
      const cli = createFortiCli({ hostname: 'FGT' });
      cli.run('config firewall policy');
      cli.run('edit 1');
      cli.run('set name one');
      cli.run('next');
      cli.run('edit 2');
      cli.run('set name two');
      cli.run('next');
      cli.run('edit 3');
      cli.run('set name three');
      cli.run('next');

      // move 1 after 2
      cli.run('move 1 after 2');
      cli.run('end');

      const show = cli.run('show firewall policy').lines.join('\n');
      const twoIdx = show.indexOf('two');
      const oneIdx = show.indexOf('one');
      const threeIdx = show.indexOf('three');
      // Order should be: 2, 1, 3
      expect(twoIdx).toBeLessThan(oneIdx);
      expect(oneIdx).toBeLessThan(threeIdx);
    });

    it('rejects move with invalid IDs', () => {
      const cli = createFortiCli({ hostname: 'FGT' });
      cli.run('config firewall policy');
      cli.run('edit 1');
      cli.run('next');

      const result = cli.run('move 99 before 1');
      expect(result.lines).toEqual(['Command fail. Return code -61']);
    });

    it('rejects move with invalid direction', () => {
      const cli = createFortiCli({ hostname: 'FGT' });
      cli.run('config firewall policy');
      cli.run('edit 1');
      cli.run('next');
      cli.run('edit 2');
      cli.run('next');

      const result = cli.run('move 1 above 2');
      expect(result.lines).toEqual(['Command fail. Return code -61']);
    });

    it('is a no-op when moving a policy before/after itself', () => {
      const cli = createFortiCli({ hostname: 'FGT' });
      cli.run('config firewall policy');
      cli.run('edit 1');
      cli.run('set name solo');
      cli.run('next');

      cli.run('move 1 before 1');
      cli.run('end');

      const show = cli.run('show firewall policy').lines.join('\n');
      expect(show).toContain('solo');
    });
  });
});
