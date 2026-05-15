import { parseCommandLine } from './parser';
import type { CommandDefinition, CommandMatch, HelpEntry } from './types';

interface RegisteredPattern {
  command: CommandDefinition;
  pattern: string;
  tokens: string[];
}

export class CommandRegistry {
  private commands: CommandDefinition[] = [];
  private patterns: RegisteredPattern[] = [];

  register(command: CommandDefinition): void {
    if (this.commands.some((existing) => existing.id === command.id)) {
      throw new Error(`Command already registered: ${command.id}`);
    }
    this.commands.push(command);
    for (const pattern of [command.pattern, ...(command.aliases ?? [])]) {
      this.patterns.push({ command, pattern, tokens: parseCommandLine(pattern).tokens.map((token) => token.toLowerCase()) });
    }
  }

  resolve(tokens: string[], modeId: string): CommandMatch {
    if (tokens.length === 0) {
      return emptyMatch('not_found');
    }

    const lowerTokens = tokens.map((token) => token.toLowerCase());
    const candidates = this.patterns
      .filter((entry) => commandAvailableInMode(entry.command, modeId))
      .filter((entry) => commandPrefixMatches(entry.tokens, lowerTokens));

    if (candidates.length === 0) {
      return emptyMatch('not_found');
    }

    const runnable = candidates.filter((entry) => lowerTokens.length >= entry.tokens.length);
    if (runnable.length === 0) {
      return {
        status: 'ambiguous',
        args: [],
        candidates: uniqueCommands(candidates),
      };
    }

    const longestLength = Math.max(...runnable.map((entry) => entry.tokens.length));
    const longest = runnable.filter((entry) => entry.tokens.length === longestLength);
    const uniqueLongestCommands = uniqueCommands(longest);

    if (uniqueLongestCommands.length > 1) {
      return {
        status: 'ambiguous',
        args: [],
        candidates: uniqueLongestCommands,
      };
    }

    const winner = longest[0];
    return {
      status: 'matched',
      command: winner.command,
      pattern: winner.pattern,
      args: tokens.slice(winner.tokens.length),
      candidates: [winner.command],
    };
  }

  help(modeId: string): HelpEntry[] {
    return this.commands
      .filter((command) => !command.hidden && commandAvailableInMode(command, modeId))
      .map((command) => ({
        id: command.id,
        pattern: command.pattern,
        description: command.description,
        usage: command.usage,
      }))
      .sort((a, b) => a.pattern.localeCompare(b.pattern));
  }

  helpForPrefix(tokens: string[], modeId: string): HelpEntry[] {
    const lowerTokens = tokens.map((token) => token.toLowerCase());
    return uniquePatternEntries(
      this.patterns
        .filter((entry) => !entry.command.hidden && commandAvailableInMode(entry.command, modeId))
        .filter((entry) => lowerTokens.every((token, index) => entry.tokens[index]?.startsWith(token)))
    ).map((entry) => ({
      id: entry.command.id,
      pattern: entry.pattern,
      description: entry.command.description,
      usage: entry.command.usage,
    }));
  }

  autocomplete(tokens: string[], modeId: string): string[] {
    const lowerTokens = tokens.map((token) => token.toLowerCase());
    const suggestions = new Set<string>();

    for (const entry of this.patterns) {
      if (entry.command.hidden || !commandAvailableInMode(entry.command, modeId)) {
        continue;
      }

      if (lowerTokens.length === 0) {
        suggestions.add(entry.tokens[0]);
        continue;
      }

      const lastIndex = lowerTokens.length - 1;
      const prefixMatchesBeforeLast = lowerTokens
        .slice(0, lastIndex)
        .every((token, index) => entry.tokens[index] === token);
      if (!prefixMatchesBeforeLast) {
        continue;
      }

      const currentToken = lowerTokens[lastIndex];
      const patternToken = entry.tokens[lastIndex];
      if (patternToken === undefined) {
        continue;
      }

      if (patternToken === currentToken) {
        const nextToken = entry.tokens[lastIndex + 1];
        if (nextToken !== undefined) {
          suggestions.add(nextToken);
        }
        continue;
      }

      if (patternToken.startsWith(currentToken)) {
        suggestions.add(patternToken);
      }
    }

    return [...suggestions].sort();
  }
}

function commandAvailableInMode(command: CommandDefinition, modeId: string): boolean {
  return command.modes === undefined || command.modes.includes(modeId);
}

function commandPrefixMatches(patternTokens: string[], inputTokens: string[]): boolean {
  if (inputTokens.length < patternTokens.length) {
    return inputTokens.every((token, index) => patternTokens[index]?.startsWith(token));
  }
  return patternTokens.every((token, index) => token.startsWith(inputTokens[index]));
}

function uniqueCommands(entries: RegisteredPattern[]): CommandDefinition[] {
  const byId = new Map<string, CommandDefinition>();
  for (const entry of entries) {
    byId.set(entry.command.id, entry.command);
  }
  return [...byId.values()].sort((a, b) => a.id.localeCompare(b.id));
}

function uniquePatternEntries(entries: RegisteredPattern[]): RegisteredPattern[] {
  const byPattern = new Map<string, RegisteredPattern>();
  for (const entry of entries) {
    byPattern.set(`${entry.command.id}:${entry.pattern}`, entry);
  }
  return [...byPattern.values()].sort((a, b) => a.pattern.localeCompare(b.pattern));
}

function emptyMatch(status: 'not_found'): CommandMatch {
  return { status, args: [], candidates: [] };
}
