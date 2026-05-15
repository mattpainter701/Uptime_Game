import { describe, expect, it } from 'vitest';
import { MockCliSession } from './mockCliSession';
import type { CommandDefinition } from './types';

function createSession() {
  const session = new MockCliSession({ hostname: 'edge-1' });
  session.registerMode({ id: 'exec', promptSuffix: '>' });
  session.registerMode({ id: 'privileged', promptSuffix: '#' });
  session.registerMode({ id: 'config', promptSuffix: '(config)#', parentModeId: 'privileged' });
  session.registerMode({ id: 'interface', promptSuffix: '(config-if)#', parentModeId: 'config' });
  return session;
}

function simpleCommand(overrides: Partial<CommandDefinition> & Pick<CommandDefinition, 'id' | 'pattern'>): CommandDefinition {
  return {
    description: `${overrides.id} description`,
    modes: ['exec', 'privileged', 'config', 'interface'],
    execute: () => ({ output: overrides.id }),
    ...overrides,
  };
}

describe('MockCliSession', () => {
  it('renders prompts from hostname and current mode', () => {
    const session = createSession();
    expect(session.prompt).toBe('edge-1>');
  });

  it('executes registered commands and returns output', () => {
    const session = createSession();
    session.registerCommand(simpleCommand({ id: 'show-clock', pattern: 'show clock', execute: () => ({ output: '12:00 UTC' }) }));
    expect(session.executeLine('show clock').output).toBe('12:00 UTC');
  });

  it('changes mode when a command returns nextModeId', () => {
    const session = createSession();
    session.registerCommand(simpleCommand({ id: 'enable', pattern: 'enable', modes: ['exec'], execute: () => ({ output: '', nextModeId: 'privileged' }) }));
    session.executeLine('enable');
    expect(session.mode.id).toBe('privileged');
    expect(session.prompt).toBe('edge-1#');
  });

  it('falls back to the parent mode for built-in exit', () => {
    const session = createSession();
    session.setMode('interface');
    session.executeLine('exit');
    expect(session.mode.id).toBe('config');
  });

  it('disconnects when exiting root mode', () => {
    const session = createSession();
    const result = session.executeLine('exit');
    expect(result.disconnected).toBe(true);
  });

  it('keeps blank commands quiet and preserves the mode', () => {
    const session = createSession();
    session.setMode('privileged');
    const result = session.executeLine('   ');
    expect(result.output).toBe('');
    expect(session.mode.id).toBe('privileged');
  });

  it('returns a clear unknown-command error', () => {
    const session = createSession();
    const result = session.executeLine('bogus command');
    expect(result.error).toBe(true);
    expect(result.output).toMatch(/unknown command/i);
  });

  it('returns an ambiguity error without running a command', () => {
    const session = createSession();
    session.registerCommand(simpleCommand({ id: 'show-route', pattern: 'show route' }));
    session.registerCommand(simpleCommand({ id: 'show-running', pattern: 'show running' }));
    const result = session.executeLine('sh r');
    expect(result.error).toBe(true);
    expect(result.output).toMatch(/ambiguous/i);
  });

  it('generates help from commands available in the current mode', () => {
    const session = createSession();
    session.registerCommand(simpleCommand({ id: 'show-clock', pattern: 'show clock', modes: ['exec'], description: 'Display clock' }));
    session.registerCommand(simpleCommand({ id: 'configure', pattern: 'configure terminal', modes: ['privileged'], description: 'Enter config mode' }));
    expect(session.executeLine('help').output).toContain('show clock');
    expect(session.executeLine('help').output).not.toContain('configure terminal');
  });

  it('supports question-mark help on a command prefix', () => {
    const session = createSession();
    session.registerCommand(simpleCommand({ id: 'show-clock', pattern: 'show clock' }));
    session.registerCommand(simpleCommand({ id: 'show-route', pattern: 'show route' }));
    expect(session.executeLine('show ?').output).toContain('clock');
    expect(session.executeLine('show ?').output).toContain('route');
  });

  it('delegates autocomplete to the registry', () => {
    const session = createSession();
    session.registerCommand(simpleCommand({ id: 'show-clock', pattern: 'show clock' }));
    session.registerCommand(simpleCommand({ id: 'show-route', pattern: 'show route' }));
    expect(session.autocomplete('show ')).toEqual(['clock', 'route']);
  });

  it('passes args, filesystem, and mutable device state to handlers', () => {
    const session = createSession();
    session.filesystem.writeFile('/startup.txt', 'ready');
    session.registerCommand(simpleCommand({
      id: 'set-hostname',
      pattern: 'set hostname',
      execute: ({ args, device, filesystem }) => {
        device.hostname = args[0] ?? device.hostname;
        return { output: filesystem.readFile('/startup.txt') };
      },
    }));
    const result = session.executeLine('set hostname core-1');
    expect(result.output).toBe('ready');
    expect(session.prompt).toBe('core-1>');
  });
});
