import { MockCliSession } from './mockCliSession';
import type { CommandDefinition } from './types';

export function createDefaultMockCliSession(hostname = 'device'): MockCliSession {
  const session = new MockCliSession({ hostname });
  session.registerMode({ id: 'privileged', promptSuffix: '#' });
  session.registerMode({ id: 'config', promptSuffix: '(config)#', parentModeId: 'privileged' });

  for (const command of defaultCommands()) {
    session.registerCommand(command);
  }

  session.filesystem.writeFile('/system/info.txt', `hostname ${hostname}\nstatus ready`);
  session.filesystem.writeFile('/logs/events.log', '00:00 mock CLI initialized');
  return session;
}

export function defaultCommands(): CommandDefinition[] {
  return [
    {
      id: 'enable',
      pattern: 'enable',
      description: 'Enter privileged mode',
      modes: ['exec'],
      execute: () => ({ output: '', nextModeId: 'privileged' }),
    },
    {
      id: 'configure-terminal',
      pattern: 'configure terminal',
      aliases: ['conf t'],
      description: 'Enter configuration mode',
      modes: ['privileged'],
      execute: () => ({ output: '', nextModeId: 'config' }),
    },
    {
      id: 'set-hostname',
      pattern: 'hostname',
      description: 'Set the virtual device hostname',
      usage: 'hostname <name>',
      modes: ['config'],
      execute: ({ args, device }) => {
        if (args.length !== 1) {
          return { output: 'Usage: hostname <name>', error: true };
        }
        device.hostname = args[0] ?? device.hostname;
        return { output: '' };
      },
    },
    {
      id: 'show-system',
      pattern: 'show system',
      description: 'Display virtual device system information',
      modes: ['exec', 'privileged'],
      execute: ({ device, filesystem }) => ({ output: `${filesystem.readFile('/system/info.txt')}\ncurrent-mode ${device.currentModeId}` }),
    },
    {
      id: 'show-files',
      pattern: 'show files',
      description: 'List files in the current virtual directory',
      modes: ['exec', 'privileged'],
      execute: ({ filesystem }) => ({ output: filesystem.list().map((entry) => `${entry.type === 'directory' ? 'd' : '-'} ${entry.name}`).join('\n') }),
    },
    {
      id: 'pwd',
      pattern: 'pwd',
      description: 'Print the current virtual directory',
      execute: ({ filesystem }) => ({ output: filesystem.cwd }),
    },
    {
      id: 'cd',
      pattern: 'cd',
      description: 'Change the current virtual directory',
      usage: 'cd <path>',
      execute: ({ args, filesystem }) => {
        if (args.length !== 1) {
          return { output: 'Usage: cd <path>', error: true };
        }
        try {
          filesystem.cd(args[0] ?? '/');
          return { output: '' };
        } catch (error) {
          return { output: error instanceof Error ? error.message : 'Unable to change directory', error: true };
        }
      },
    },
    {
      id: 'cat',
      pattern: 'cat',
      description: 'Read a virtual file',
      usage: 'cat <path>',
      execute: ({ args, filesystem }) => {
        if (args.length !== 1) {
          return { output: 'Usage: cat <path>', error: true };
        }
        try {
          return { output: filesystem.readFile(args[0] ?? '') };
        } catch (error) {
          return { output: error instanceof Error ? error.message : 'Unable to read file', error: true };
        }
      },
    },
    {
      id: 'ping',
      pattern: 'ping',
      description: 'Simulate reachability to a host',
      usage: 'ping <host>',
      modes: ['exec', 'privileged'],
      execute: ({ args }) => {
        const host = args[0];
        if (host === undefined) {
          return { output: 'Usage: ping <host>', error: true };
        }
        return {
          output: [
            `Pinging ${host} with 64 bytes of data:`,
            `Reply from ${host}: bytes=64 time=12ms TTL=64`,
            `Reply from ${host}: bytes=64 time=11ms TTL=64`,
            `Reply from ${host}: bytes=64 time=13ms TTL=64`,
            `Reply from ${host}: bytes=64 time=10ms TTL=64`,
            'Packets: Sent = 4, Received = 4, Lost = 0 (0% loss)',
          ].join('\n'),
        };
      },
    },
  ];
}
