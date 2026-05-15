import { describe, expect, it } from 'vitest';
import { CommandRegistry } from './commandRegistry';
import type { CommandDefinition } from './types';

function command(id: string, pattern: string, modes = ['exec']): CommandDefinition {
  return {
    id,
    pattern,
    modes,
    description: `${id} description`,
    execute: ({ args }) => ({ output: args.join(',') || id }),
  };
}

describe('CommandRegistry', () => {
  it('registers and executes an exact command pattern', () => {
    const registry = new CommandRegistry();
    registry.register(command('show-clock', 'show clock'));
    const match = registry.resolve(['show', 'clock'], 'exec');
    expect(match.status).toBe('matched');
    expect(match.command?.id).toBe('show-clock');
  });

  it('resolves command aliases', () => {
    const registry = new CommandRegistry();
    registry.register({ ...command('configure', 'configure terminal'), aliases: ['conf t'] });
    expect(registry.resolve(['conf', 't'], 'exec').command?.id).toBe('configure');
  });

  it('filters commands by CLI mode', () => {
    const registry = new CommandRegistry();
    registry.register(command('shutdown', 'shutdown', ['interface']));
    expect(registry.resolve(['shutdown'], 'exec').status).toBe('not_found');
    expect(registry.resolve(['shutdown'], 'interface').status).toBe('matched');
  });

  it('uses the longest matching pattern and leaves remaining tokens as args', () => {
    const registry = new CommandRegistry();
    registry.register(command('show', 'show'));
    registry.register(command('show-interface', 'show interface'));
    const match = registry.resolve(['show', 'interface', 'eth0'], 'exec');
    expect(match.command?.id).toBe('show-interface');
    expect(match.args).toEqual(['eth0']);
  });

  it('supports unambiguous abbreviated tokens', () => {
    const registry = new CommandRegistry();
    registry.register(command('show-route', 'show route'));
    expect(registry.resolve(['sh', 'rou'], 'exec').command?.id).toBe('show-route');
  });

  it('reports ambiguous abbreviated commands', () => {
    const registry = new CommandRegistry();
    registry.register(command('show-route', 'show route'));
    registry.register(command('show-running', 'show running'));
    const match = registry.resolve(['sh', 'r'], 'exec');
    expect(match.status).toBe('ambiguous');
    expect(match.candidates.map((candidate) => candidate.id).sort()).toEqual(['show-route', 'show-running']);
  });

  it('returns visible help entries for a mode', () => {
    const registry = new CommandRegistry();
    registry.register(command('show-clock', 'show clock'));
    registry.register({ ...command('debug-secret', 'debug secret'), hidden: true });
    expect(registry.help('exec').map((entry) => entry.pattern)).toEqual(['show clock']);
  });

  it('autocompletes next tokens from registered command patterns', () => {
    const registry = new CommandRegistry();
    registry.register(command('show-clock', 'show clock'));
    registry.register(command('show-route', 'show route'));
    expect(registry.autocomplete(['show'], 'exec')).toEqual(['clock', 'route']);
  });

  it('autocompletes partial current token', () => {
    const registry = new CommandRegistry();
    registry.register(command('configure', 'configure terminal'));
    expect(registry.autocomplete(['conf'], 'exec')).toEqual(['configure']);
  });
});
