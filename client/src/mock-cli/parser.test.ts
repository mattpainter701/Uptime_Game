import { describe, expect, it } from 'vitest';
import { parseCommandLine, normalizeCommandInput } from './parser';

describe('mock CLI parser', () => {
  it('trims and collapses whitespace for normalized command matching', () => {
    expect(normalizeCommandInput('  show   ip   route  ')).toBe('show ip route');
  });

  it('preserves raw input while exposing normalized tokens', () => {
    const parsed = parseCommandLine('  show   ip   route  ');
    expect(parsed.raw).toBe('  show   ip   route  ');
    expect(parsed.normalized).toBe('show ip route');
    expect(parsed.tokens).toEqual(['show', 'ip', 'route']);
  });

  it('keeps quoted strings as one argument', () => {
    expect(parseCommandLine('set banner "hello world"').tokens).toEqual(['set', 'banner', 'hello world']);
  });

  it('supports single-quoted strings', () => {
    expect(parseCommandLine("set description 'uplink port'").tokens).toEqual(['set', 'description', 'uplink port']);
  });

  it('allows escaped quotes inside quoted strings', () => {
    expect(parseCommandLine('set banner "say \\"hi\\""').tokens).toEqual(['set', 'banner', 'say "hi"']);
  });

  it('keeps question mark as a help token', () => {
    expect(parseCommandLine('show ?').tokens).toEqual(['show', '?']);
  });

  it('marks trailing whitespace for autocomplete callers', () => {
    expect(parseCommandLine('show ').hasTrailingWhitespace).toBe(true);
    expect(parseCommandLine('show').hasTrailingWhitespace).toBe(false);
  });

  it('throws a useful error for unterminated quotes', () => {
    expect(() => parseCommandLine('set banner "oops')).toThrow(/unterminated/i);
  });
});
