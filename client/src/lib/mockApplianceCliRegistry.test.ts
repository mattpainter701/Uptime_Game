import { describe, expect, it } from 'vitest';
import { createMockCliForHostname, detectMockApplianceKind, getMockApplianceLabel } from './mockApplianceCliRegistry';

describe('mock appliance CLI registry', () => {
  it('detects the appliance style from hostname hints', () => {
    expect(detectMockApplianceKind('FGT-EDGE1')).toBe('fortinet');
    expect(detectMockApplianceKind('AOS-CORE1')).toBe('aruba');
    expect(detectMockApplianceKind('OS10-EDGE1')).toBe('dell');
    expect(detectMockApplianceKind('R1')).toBe('cisco');
    expect(getMockApplianceLabel('AOS-CORE1')).toBe('Aruba AOS-CX');
  });

  it('creates the right mock session for Aruba and Dell hostnames', () => {
    expect(createMockCliForHostname('AOS-CORE1').getPrompt()).toBe('AOS-CORE1#');
    expect(createMockCliForHostname('OS10-EDGE1').getPrompt()).toBe('OS10-EDGE1#');
  });
});
