import { CommandRegistry } from './commandRegistry';
import { parseCommandLine } from './parser';
import { VirtualFilesystem } from './virtualFilesystem';
import type { CliMode, CommandContext, CommandDefinition, CommandExecutionResult, MockCliSessionOptions, VirtualDeviceState } from './types';

export class MockCliSession {
  readonly registry: CommandRegistry;
  readonly filesystem: VirtualFilesystem;
  readonly device: VirtualDeviceState;
  private modes: Map<string, CliMode>;

  constructor(options: MockCliSessionOptions = {}) {
    this.registry = new CommandRegistry();
    this.filesystem = new VirtualFilesystem(options.filesystem);
    this.modes = new Map();
    const initialModeId = options.initialModeId ?? 'exec';
    this.device = {
      hostname: options.hostname ?? 'device',
      currentModeId: initialModeId,
      variables: { ...(options.variables ?? {}) },
    };
    this.registerMode({ id: 'exec', promptSuffix: '>' });
  }

  get mode(): CliMode {
    const mode = this.modes.get(this.device.currentModeId);
    if (mode === undefined) {
      throw new Error(`Unknown CLI mode: ${this.device.currentModeId}`);
    }
    return mode;
  }

  get prompt(): string {
    return `${this.device.hostname}${this.mode.promptSuffix}`;
  }

  registerMode(mode: CliMode): void {
    this.modes.set(mode.id, mode);
  }

  setMode(modeId: string): void {
    if (!this.modes.has(modeId)) {
      throw new Error(`Cannot enter unknown mode: ${modeId}`);
    }
    this.device.currentModeId = modeId;
  }

  registerCommand(command: CommandDefinition): void {
    this.registry.register(command);
  }

  executeLine(input: string): CommandExecutionResult {
    const parsed = parseCommandLine(input);
    const tokens = parsed.tokens;

    if (tokens.length === 0) {
      return { output: '' };
    }

    if (tokens.length === 1 && tokens[0]?.toLowerCase() === 'clear') {
      return { output: '', clearScreen: true };
    }

    if (tokens.length === 1 && tokens[0]?.toLowerCase() === 'help') {
      return { output: this.renderHelp(this.registry.help(this.mode.id)) };
    }

    if (tokens[tokens.length - 1] === '?') {
      const prefix = tokens.slice(0, -1);
      return { output: this.renderHelp(this.registry.helpForPrefix(prefix, this.mode.id)) };
    }

    if (tokens.length === 1 && tokens[0]?.toLowerCase() === 'exit') {
      const parent = this.mode.parentModeId;
      if (parent !== undefined) {
        this.setMode(parent);
        return { output: '' };
      }
      return { output: 'Connection closed.', disconnected: true };
    }

    if (tokens.length === 1 && tokens[0]?.toLowerCase() === 'end') {
      this.setMode('exec');
      return { output: '' };
    }

    const match = this.registry.resolve(tokens, this.mode.id);
    if (match.status === 'not_found') {
      return { output: `Unknown command: ${input.trim()}`, error: true };
    }
    if (match.status === 'ambiguous') {
      return {
        output: `Ambiguous command: ${input.trim()}\nCandidates: ${match.candidates.map((candidate) => candidate.pattern).join(', ')}`,
        error: true,
      };
    }
    if (match.command === undefined) {
      return { output: `Unknown command: ${input.trim()}`, error: true };
    }

    const context: CommandContext = {
      rawInput: input,
      tokens,
      args: match.args,
      mode: this.mode,
      device: this.device,
      filesystem: this.filesystem,
      registry: this.registry,
      setMode: (modeId) => this.setMode(modeId),
    };

    const result = match.command.execute(context);
    if (result.nextModeId !== undefined) {
      this.setMode(result.nextModeId);
    }
    return result;
  }

  autocomplete(input: string): string[] {
    const parsed = parseCommandLine(input);
    const tokens = parsed.hasTrailingWhitespace ? [...parsed.tokens, ''] : parsed.tokens;
    return this.registry.autocomplete(tokens, this.mode.id);
  }

  private renderHelp(entries: { pattern: string; description: string }[]): string {
    if (entries.length === 0) {
      return 'No help available.';
    }
    const width = Math.max(...entries.map((entry) => entry.pattern.length));
    return entries.map((entry) => `${entry.pattern.padEnd(width)}  ${entry.description}`).join('\n');
  }
}
