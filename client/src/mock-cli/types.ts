export interface ParsedCommandLine {
  raw: string;
  normalized: string;
  tokens: string[];
  hasTrailingWhitespace: boolean;
}

export interface CliMode {
  id: string;
  promptSuffix: string;
  parentModeId?: string;
}

export interface FilesystemEntry {
  name: string;
  path: string;
  type: 'file' | 'directory';
}

export interface VirtualFilesystemSnapshot {
  cwd: string;
  files: Record<string, string>;
  directories: string[];
}

export interface VirtualDeviceState {
  hostname: string;
  currentModeId: string;
  variables: Record<string, unknown>;
}

export interface CommandExecutionResult {
  output: string;
  error?: boolean;
  nextModeId?: string;
  disconnected?: boolean;
  clearScreen?: boolean;
}

export interface CommandContext {
  rawInput: string;
  tokens: string[];
  args: string[];
  mode: CliMode;
  device: VirtualDeviceState;
  filesystem: {
    readonly cwd: string;
    resolvePath(path: string): string;
    exists(path: string): boolean;
    isDirectory(path: string): boolean;
    mkdir(path: string): void;
    cd(path: string): void;
    list(path?: string): FilesystemEntry[];
    readFile(path: string): string;
    writeFile(path: string, content: string): void;
    remove(path: string): void;
    snapshot(): VirtualFilesystemSnapshot;
  };
  registry: {
    help(modeId: string): HelpEntry[];
    autocomplete(tokens: string[], modeId: string): string[];
  };
  setMode(modeId: string): void;
}

export interface CommandDefinition {
  id: string;
  pattern: string;
  description: string;
  usage?: string;
  aliases?: string[];
  modes?: string[];
  hidden?: boolean;
  execute(context: CommandContext): CommandExecutionResult;
  autocomplete?(context: CommandContext): string[];
}

export interface HelpEntry {
  id: string;
  pattern: string;
  description: string;
  usage?: string;
}

export interface CommandMatch {
  status: 'matched' | 'ambiguous' | 'not_found';
  command?: CommandDefinition;
  pattern?: string;
  args: string[];
  candidates: CommandDefinition[];
}

export interface MockCliSessionOptions {
  hostname?: string;
  initialModeId?: string;
  filesystem?: VirtualFilesystemSnapshot | { files?: Record<string, string>; directories?: string[]; cwd?: string };
  variables?: Record<string, unknown>;
}
