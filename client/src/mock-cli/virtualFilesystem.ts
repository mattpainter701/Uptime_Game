import type { FilesystemEntry, VirtualFilesystemSnapshot } from './types';

interface VirtualFilesystemOptions {
  files?: Record<string, string>;
  directories?: string[];
  cwd?: string;
}

export class VirtualFilesystem {
  private files: Map<string, string>;
  private directories: Set<string>;
  private currentDirectory: string;

  constructor(options: VirtualFilesystemOptions = {}) {
    this.files = new Map();
    this.directories = new Set(['/']);
    this.currentDirectory = '/';

    for (const directory of options.directories ?? []) {
      this.mkdir(directory);
    }

    for (const [path, content] of Object.entries(options.files ?? {})) {
      this.writeFile(path, content);
    }

    if (options.cwd !== undefined) {
      this.cd(options.cwd);
    }
  }

  get cwd(): string {
    return this.currentDirectory;
  }

  resolvePath(path: string): string {
    const raw = path.length === 0 ? this.currentDirectory : path;
    const absolute = raw.startsWith('/') ? raw : `${this.currentDirectory}/${raw}`;
    const parts: string[] = [];

    for (const part of absolute.split('/')) {
      if (part === '' || part === '.') {
        continue;
      }
      if (part === '..') {
        parts.pop();
        continue;
      }
      parts.push(part);
    }

    return `/${parts.join('/')}`;
  }

  exists(path: string): boolean {
    const resolved = this.resolvePath(path);
    return this.directories.has(resolved) || this.files.has(resolved);
  }

  isDirectory(path: string): boolean {
    return this.directories.has(this.resolvePath(path));
  }

  mkdir(path: string): void {
    const resolved = this.resolvePath(path);
    const parts = resolved.split('/').filter(Boolean);
    let current = '';
    this.directories.add('/');
    for (const part of parts) {
      current = `${current}/${part}`;
      this.directories.add(current);
    }
  }

  cd(path: string): void {
    const resolved = this.resolvePath(path);
    if (this.files.has(resolved)) {
      throw new Error(`${resolved} is not a directory`);
    }
    if (!this.directories.has(resolved)) {
      throw new Error(`Directory not found: ${resolved}`);
    }
    this.currentDirectory = resolved;
  }

  list(path = this.currentDirectory): FilesystemEntry[] {
    const directory = this.resolvePath(path);
    if (!this.directories.has(directory)) {
      throw new Error(`Directory not found: ${directory}`);
    }

    const prefix = directory === '/' ? '/' : `${directory}/`;
    const entries = new Map<string, FilesystemEntry>();

    for (const childDirectory of this.directories) {
      if (childDirectory === directory || !childDirectory.startsWith(prefix)) {
        continue;
      }
      const remainder = childDirectory.slice(prefix.length);
      if (remainder.length === 0 || remainder.includes('/')) {
        continue;
      }
      entries.set(remainder, { name: remainder, path: childDirectory, type: 'directory' });
    }

    for (const filePath of this.files.keys()) {
      if (!filePath.startsWith(prefix)) {
        continue;
      }
      const remainder = filePath.slice(prefix.length);
      if (remainder.length === 0 || remainder.includes('/')) {
        continue;
      }
      entries.set(remainder, { name: remainder, path: filePath, type: 'file' });
    }

    return Array.from(entries.values()).sort((a, b) => a.name.localeCompare(b.name));
  }

  readFile(path: string): string {
    const resolved = this.resolvePath(path);
    const content = this.files.get(resolved);
    if (content === undefined) {
      throw new Error(`File not found: ${resolved}`);
    }
    return content;
  }

  writeFile(path: string, content: string): void {
    const resolved = this.resolvePath(path);
    const parent = parentPath(resolved);
    this.mkdir(parent);
    this.files.set(resolved, content);
  }

  remove(path: string): void {
    const resolved = this.resolvePath(path);
    if (this.files.delete(resolved)) {
      return;
    }
    if (!this.directories.has(resolved)) {
      throw new Error(`Path not found: ${resolved}`);
    }
    for (const candidate of [...this.files.keys()]) {
      if (candidate.startsWith(`${resolved}/`)) {
        this.files.delete(candidate);
      }
    }
    for (const candidate of [...this.directories]) {
      if (candidate !== '/' && (candidate === resolved || candidate.startsWith(`${resolved}/`))) {
        this.directories.delete(candidate);
      }
    }
  }

  snapshot(): VirtualFilesystemSnapshot {
    return {
      cwd: this.currentDirectory,
      files: Object.fromEntries(this.files.entries()),
      directories: [...this.directories].sort(),
    };
  }
}

function parentPath(path: string): string {
  const index = path.lastIndexOf('/');
  if (index <= 0) {
    return '/';
  }
  return path.slice(0, index);
}
