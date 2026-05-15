export function tokenize(command: string): string[] {
  return command.trim().split(/\s+/).filter(Boolean);
}

export function lowerTokens(tokens: string[]): string[] {
  return tokens.map((token) => token.toLowerCase());
}

export function matchesAbbreviation(input: string[], candidate: string[]): boolean {
  if (input.length > candidate.length) {
    return false;
  }

  return input.every((token, index) => candidate[index].toLowerCase().startsWith(token.toLowerCase()));
}

export function matchesCommandStart(input: string[], candidate: string[]): boolean {
  if (input.length < candidate.length) {
    return false;
  }

  return candidate.every((token, index) => input[index].toLowerCase().startsWith(token.toLowerCase()));
}
