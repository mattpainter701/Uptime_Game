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
