import type { ParsedCommandLine } from './types';

export function normalizeCommandInput(input: string): string {
  return parseCommandLine(input).tokens.join(' ');
}

export function parseCommandLine(input: string): ParsedCommandLine {
  const tokens: string[] = [];
  let current = '';
  let quote: 'single' | 'double' | null = null;
  let escaping = false;

  for (const char of input) {
    if (escaping) {
      current += char;
      escaping = false;
      continue;
    }

    if (char === '\\') {
      escaping = true;
      continue;
    }

    if (quote === 'double') {
      if (char === '"') {
        quote = null;
      } else {
        current += char;
      }
      continue;
    }

    if (quote === 'single') {
      if (char === "'") {
        quote = null;
      } else {
        current += char;
      }
      continue;
    }

    if (char === '"') {
      quote = 'double';
      continue;
    }

    if (char === "'") {
      quote = 'single';
      continue;
    }

    if (/\s/.test(char)) {
      if (current.length > 0) {
        tokens.push(current);
        current = '';
      }
      continue;
    }

    current += char;
  }

  if (escaping) {
    current += '\\';
  }

  if (quote !== null) {
    throw new Error('Unterminated quoted string in CLI input');
  }

  if (current.length > 0) {
    tokens.push(current);
  }

  return {
    raw: input,
    normalized: tokens.join(' '),
    tokens,
    hasTrailingWhitespace: /\s$/.test(input),
  };
}
