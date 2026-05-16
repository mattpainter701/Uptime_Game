import { describe, expect, it } from 'vitest';
import { createMockCliForAppliance, createMockCliForLab, createMockCliForVendor } from './mockApplianceCliRegistry';
import { MockVendorKind } from './mockCliShared';

describe('shared appliance CLI registry', () => {
  it('creates sessions by vendor kind', () => {
    const cisco = createMockCliForVendor('cisco', 'R1');
    expect(cisco.getPrompt()).toBe('R1#');

    const aruba = createMockCliForVendor('aruba', 'AOS-SW1');
    expect(aruba.getPrompt()).toBe('AOS-SW1#');

    const dell = createMockCliForVendor('dell', 'OS10-LEAF1');
    expect(dell.getPrompt()).toBe('OS10-LEAF1#');

    const forti = createMockCliForVendor('fortinet', 'FGT-CORE1');
    expect(forti.getPrompt()).toContain('FGT-CORE1');
  });

  it('creates sessions from ApplianceConfig objects', () => {
    const session = createMockCliForAppliance({
      vendor: 'aruba',
      hostname: 'AOS-LAB1',
    });
    expect(session.getPrompt()).toBe('AOS-LAB1#');
  });

  it('creates sessions for an entire lab setup', () => {
    const sessions = createMockCliForLab([
      { vendor: 'cisco', hostname: 'CORE1' },
      { vendor: 'dell', hostname: 'OS10-EDGE1' },
      { vendor: 'aruba', hostname: 'AOS-ACCESS1' },
    ]);

    expect(sessions).toHaveLength(3);
    expect(sessions[0].getPrompt()).toBe('CORE1#');
    expect(sessions[1].getPrompt()).toBe('OS10-EDGE1#');
    expect(sessions[2].getPrompt()).toBe('AOS-ACCESS1#');
  });

  it('returned sessions implement the shared MockCliSession interface', () => {
    const session = createMockCliForVendor('cisco', 'TEST-SW1');

    // getPrompt()
    expect(typeof session.getPrompt()).toBe('string');

    // run()
    const result = session.run('show version');
    expect(result).toHaveProperty('lines');
    expect(result).toHaveProperty('prompt');
    expect(result).toHaveProperty('shouldDisconnect');
    expect(Array.isArray(result.lines)).toBe(true);
    expect(typeof result.prompt).toBe('string');
    expect(typeof result.shouldDisconnect).toBe('boolean');

    // snapshot()
    const snap = session.snapshot();
    expect(snap).toHaveProperty('hostname');
    expect((snap as Record<string, unknown>).hostname).toBe('TEST-SW1');
  });

  it('all four vendors respond to show version', () => {
    const vendors: [MockVendorKind, string][] = [
      ['cisco', 'C1'],
      ['fortinet', 'F1'],
      ['aruba', 'A1'],
      ['dell', 'D1'],
    ];

    for (const [vendor, hostname] of vendors) {
      const session = createMockCliForVendor(vendor, hostname);
      const result = session.run('show version');
      expect(result.lines.length).toBeGreaterThan(0);
      expect(result.shouldDisconnect).toBe(false);
    }
  });

  it('all four vendors support configure terminal and end', () => {
    const vendors: [MockVendorKind, string][] = [
      ['cisco', 'C2'],
      ['fortinet', 'F2'],
      ['aruba', 'A2'],
      ['dell', 'D2'],
    ];

    for (const [vendor, hostname] of vendors) {
      const session = createMockCliForVendor(vendor, hostname);

      // All vendors accept configure terminal without disconnect
      const config = session.run('configure terminal');
      expect(config.shouldDisconnect).toBe(false);

      // Cisco/Aruba/Dell use '(config)' / '(conf)' style prompts;
      // FortiOS uses section prompts (e.g. 'F2 (global) #').
      // Verify prompt always ends with '#' after entering config.
      const configPrompt = session.getPrompt();
      expect(configPrompt).toContain('#');

      // All vendors support 'end' to return to exec
      session.run('end');
      const execPrompt = session.getPrompt();
      expect(execPrompt).toContain('#');
    }
  });
});
