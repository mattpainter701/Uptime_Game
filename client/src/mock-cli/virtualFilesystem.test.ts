import { describe, expect, it } from 'vitest';
import { VirtualFilesystem } from './virtualFilesystem';

describe('VirtualFilesystem', () => {
  it('starts at root and lists initial files', () => {
    const fs = new VirtualFilesystem({ files: { '/readme.txt': 'hello' } });
    expect(fs.cwd).toBe('/');
    expect(fs.list('/')).toEqual([{ name: 'readme.txt', path: '/readme.txt', type: 'file' }]);
  });

  it('normalizes relative paths, dot segments, and duplicate slashes', () => {
    const fs = new VirtualFilesystem();
    fs.mkdir('/etc/network');
    fs.cd('/etc');
    expect(fs.resolvePath('./network/../network//')).toBe('/etc/network');
  });

  it('creates parent directories when writing a nested file', () => {
    const fs = new VirtualFilesystem();
    fs.writeFile('/etc/mock/config.txt', 'hostname edge-1');
    expect(fs.readFile('/etc/mock/config.txt')).toBe('hostname edge-1');
    expect(fs.isDirectory('/etc/mock')).toBe(true);
  });

  it('changes directories using absolute and relative paths', () => {
    const fs = new VirtualFilesystem();
    fs.mkdir('/var/log');
    fs.cd('/var');
    fs.cd('log');
    expect(fs.cwd).toBe('/var/log');
  });

  it('refuses to cd into a file', () => {
    const fs = new VirtualFilesystem({ files: { '/tmp/output.txt': 'data' } });
    expect(() => fs.cd('/tmp/output.txt')).toThrow(/not a directory/i);
  });

  it('removes files without removing siblings', () => {
    const fs = new VirtualFilesystem({ files: { '/a.txt': 'a', '/b.txt': 'b' } });
    fs.remove('/a.txt');
    expect(fs.exists('/a.txt')).toBe(false);
    expect(fs.readFile('/b.txt')).toBe('b');
  });

  it('returns stable sorted directory listings', () => {
    const fs = new VirtualFilesystem({ files: { '/z.txt': '', '/a.txt': '' } });
    fs.mkdir('/m');
    expect(fs.list('/').map((entry) => entry.name)).toEqual(['a.txt', 'm', 'z.txt']);
  });

  it('clones snapshots so callers cannot mutate internal state', () => {
    const fs = new VirtualFilesystem({ files: { '/safe.txt': 'safe' } });
    const snapshot = fs.snapshot();
    snapshot.files['/safe.txt'] = 'mutated';
    expect(fs.readFile('/safe.txt')).toBe('safe');
  });
});
