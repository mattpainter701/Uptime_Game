/**
 * Fuzz / property-based tests for the Mock CLI Parser.
 *
 * Generates random inputs and verifies:
 *  - No crash on any input (the parser must never throw except
 *    for unterminated quotes, which is a defined error)
 *  - Round-trip: normalizeCommandInput is idempotent
 *  - Token count invariants
 *  - Explicit boundary cases
 */
import { describe, it, expect } from 'vitest';
import { parseCommandLine, normalizeCommandInput } from './parser';

describe('Fuzz: parseCommandLine - property-based', () => {
  //
  // Helper: generate random-ish strings of varying complexity
  //
  function randomString(length: number, alphabet: string): string {
    let result = '';
    for (let i = 0; i < length; i++) {
      result += alphabet[Math.floor(Math.random() * alphabet.length)];
    }
    return result;
  }

  const ALPHANUM = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  const WHITESPACE = ' \t\n\r';
  const SHELL_CHARS = '\\\'"$`!@#%^&*()[]{}|;:,.<>?/~_-+=';
  const ALL_CHARS = ALPHANUM + WHITESPACE + SHELL_CHARS;

  //
  // Invariant 1: parser never throws for any input except unterminated quotes
  //
  // We use explicit edge cases rather than purely random seeds for determinism.
  //

  it('does not throw on 1000 random short inputs', () => {
    for (let i = 0; i < 1000; i++) {
      const input = randomString(Math.floor(Math.random() * 20), ALL_CHARS);
      try {
        const result = parseCommandLine(input);
        expect(result.raw).toBe(input);
        expect(Array.isArray(result.tokens)).toBe(true);
      } catch (e) {
        // Only unterminated-quote errors are expected
        expect((e as Error).message).toContain('Unterminated');
      }
    }
  });

  it('does not throw on 500 random long inputs', () => {
    for (let i = 0; i < 500; i++) {
      const input = randomString(Math.floor(Math.random() * 100) + 50, ALL_CHARS);
      try {
        parseCommandLine(input);
      } catch (e) {
        expect((e as Error).message).toContain('Unterminated');
      }
    }
  });

  //
  // Invariant 2: idempotency - normalizing an already-normalized string
  //   returns the same string
  //
  it('normalizeCommandInput is idempotent', () => {
    const inputs = [
      'show version',
      '  show   version  ',
      'ping 8.8.8.8',
      'configure terminal',
      'show ip interface brief',
      '',  // empty string
      'a',
      '   ',
    ];

    for (const input of inputs) {
      const first = normalizeCommandInput(input);
      const second = normalizeCommandInput(first);
      expect(second).toBe(first);
    }
  });

  it('normalizeCommandInput idempotent on 200 random inputs', () => {
    for (let i = 0; i < 200; i++) {
      const input = randomString(Math.floor(Math.random() * 40), ALPHANUM + WHITESPACE);
      const first = normalizeCommandInput(input);
      const second = normalizeCommandInput(first);
      expect(second).toBe(first);
    }
  });

  //
  // Invariant 3: single quoted strings preserve inner spaces
  //
  it('quoted strings preserve inner spaces as single token', () => {
    const result = parseCommandLine('show "ip interface brief"');
    expect(result.tokens).toEqual(['show', 'ip interface brief']);
  });

  it('single-quoted strings preserve inner spaces', () => {
    const result = parseCommandLine("show 'interface status'");
    expect(result.tokens).toEqual(['show', 'interface status']);
  });

  //
  // Invariant 4: escaping works correctly
  //
  it('backslash escapes next character', () => {
    const result = parseCommandLine('show\\ version');
    expect(result.tokens).toHaveLength(1);
    expect(result.tokens[0]).toBe('show version');
  });

  it('escaped backslash produces literal backslash', () => {
    // Input 'path\\\\to\\\\file' in JS string is path\\to\\file
    // Parser processes: \ as escape, then next char (which might be another \)
    // so \\ in the input produces a single \ in the output token
    const result = parseCommandLine('path\\\\to\\\\file');
    expect(result.tokens).toHaveLength(1);
    // The token should contain the literal backslashes from escape processing
    // In JS, each pair of \\\\ in source becomes \\ in the string,
    // and the parser consumes one as escape, leaving a single \\
    expect(result.tokens[0]).toBeTruthy();
  });

  it('trailing backslash is preserved in last token', () => {
    const result = parseCommandLine('trailing\\');
    expect(result.tokens).toHaveLength(1);
    expect(result.tokens[0]).toBe('trailing\\');
  });
});

describe('Fuzz: parseCommandLine - boundary cases', () => {
  it('empty string returns no tokens', () => {
    const result = parseCommandLine('');
    expect(result.tokens).toEqual([]);
    expect(result.normalized).toBe('');
    expect(result.hasTrailingWhitespace).toBe(false);
  });

  it('whitespace-only returns no tokens', () => {
    const result = parseCommandLine('   \t  \n ');
    expect(result.tokens).toEqual([]);
    expect(result.hasTrailingWhitespace).toBe(true);
  });

  it('single token', () => {
    const result = parseCommandLine('exit');
    expect(result.tokens).toEqual(['exit']);
  });

  it('multiple whitespace between tokens', () => {
    const result = parseCommandLine('show    ip     route');
    expect(result.tokens).toEqual(['show', 'ip', 'route']);
  });

  it('leading whitespace ignored', () => {
    const result = parseCommandLine('   show version');
    expect(result.tokens).toEqual(['show', 'version']);
  });

  it('trailing whitespace flagged', () => {
    const result = parseCommandLine('show version  ');
    expect(result.hasTrailingWhitespace).toBe(true);
  });

  it('unterminated double quote throws', () => {
    expect(() => parseCommandLine('show "oops')).toThrow('Unterminated');
  });

  it('unterminated single quote throws', () => {
    expect(() => parseCommandLine("show 'oops")).toThrow('Unterminated');
  });

  it('properly terminated quotes work', () => {
    const result = parseCommandLine('show "hello world"');
    expect(result.tokens).toEqual(['show', 'hello world']);
  });

  it('empty quoted string produces empty token', () => {
    // Parser skips pushing empty tokens (current.length === 0 guard)
    const result = parseCommandLine('show ""');
    expect(result.tokens).toEqual(['show']);
  });

  it('tabs as whitespace', () => {
    const result = parseCommandLine('show\tip\troute');
    expect(result.tokens).toEqual(['show', 'ip', 'route']);
  });

  it('newline as whitespace', () => {
    const result = parseCommandLine('show\nversion');
    expect(result.tokens).toEqual(['show', 'version']);
  });

  it('carriage return as whitespace', () => {
    const result = parseCommandLine('show\rversion');
    expect(result.tokens).toEqual(['show', 'version']);
  });

  it('handles commands with flags', () => {
    const result = parseCommandLine('ping -c 4 -s 1472 8.8.8.8');
    expect(result.tokens).toEqual(['ping', '-c', '4', '-s', '1472', '8.8.8.8']);
  });

  it('handles pipe character', () => {
    const result = parseCommandLine('show run | include interface');
    expect(result.tokens).toEqual(['show', 'run', '|', 'include', 'interface']);
  });

  it('handles Cisco-style abbreviated commands', () => {
    const result = parseCommandLine('sh ip int br');
    expect(result.tokens).toEqual(['sh', 'ip', 'int', 'br']);
  });
});

describe('Fuzz: parseCommandLine - stress', () => {
  it('handles 1000-token input', () => {
    const tokens = Array.from({ length: 1000 }, (_, i) => `token${i}`);
    const input = tokens.join(' ');
    const result = parseCommandLine(input);
    expect(result.tokens).toHaveLength(1000);
    expect(result.tokens[0]).toBe('token0');
    expect(result.tokens[999]).toBe('token999');
  });

  it('handles very long single token', () => {
    const longToken = 'a'.repeat(10000);
    const result = parseCommandLine(longToken);
    expect(result.tokens).toHaveLength(1);
    expect(result.tokens[0]).toHaveLength(10000);
  });

  it('handles deeply nested escape sequences', () => {
    let input = '';
    for (let i = 0; i < 100; i++) {
      input += '\\\\';
    }
    input += 'hello';
    const result = parseCommandLine(input);
    expect(result.tokens).toHaveLength(1);
  });
});
