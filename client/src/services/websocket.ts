/**
 * NetOps Tower - WebSocket Services
 *
 * WebSocket clients for console and uptime connections.
 */

import type { Terminal } from '@xterm/xterm';
import type { NodeUptimeStats } from './api';

const WS_BASE = import.meta.env.VITE_WS_URL || 'ws://localhost:8000/api';

// ============================================================================
// Console WebSocket
// ============================================================================

export interface ConsoleMessage {
  type: 'connected' | 'error' | 'pong';
  node?: string;
  console_type?: string;
  session_id?: string;
  message?: string;
}

export class ConsoleWebSocket {
  private ws: WebSocket | null = null;
  private terminal: Terminal | null = null;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 3;
  private reconnectDelay = 2000;
  private labPath: string = '';
  private nodeId: number = 0;

  onConnect?: (message: ConsoleMessage) => void;
  onDisconnect?: () => void;
  onError?: (error: string) => void;

  connect(labPath: string, nodeId: number, terminal: Terminal): void {
    this.labPath = labPath;
    this.nodeId = nodeId;
    this.terminal = terminal;

    const url = `${WS_BASE}/console/ws?lab_path=${encodeURIComponent(labPath)}&node_id=${nodeId}`;
    this.ws = new WebSocket(url);

    this.ws.onopen = () => {
      this.reconnectAttempts = 0;
      console.log(`Console WebSocket connected to node ${nodeId}`);
    };

    this.ws.onmessage = (event) => {
      const data = event.data;

      // Check if it's JSON (control message)
      if (data.startsWith('{')) {
        try {
          const message = JSON.parse(data) as ConsoleMessage;

          if (message.type === 'connected') {
            this.onConnect?.(message);
          } else if (message.type === 'error') {
            this.onError?.(message.message || 'Unknown error');
          }
        } catch {
          // Not JSON, treat as terminal data
          this.terminal?.write(data);
        }
      } else {
        // Terminal output
        this.terminal?.write(data);
      }
    };

    this.ws.onclose = () => {
      console.log('Console WebSocket closed');
      this.onDisconnect?.();

      // Attempt reconnect
      if (this.reconnectAttempts < this.maxReconnectAttempts) {
        this.reconnectAttempts++;
        setTimeout(() => {
          if (this.terminal) {
            this.connect(this.labPath, this.nodeId, this.terminal);
          }
        }, this.reconnectDelay);
      }
    };

    this.ws.onerror = (event) => {
      console.error('Console WebSocket error:', event);
      this.onError?.('WebSocket connection error');
    };
  }

  send(data: string): void {
    if (this.ws?.readyState === WebSocket.OPEN) {
      this.ws.send(data);
    }
  }

  resize(cols: number, rows: number): void {
    if (this.ws?.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify({ type: 'resize', cols, rows }));
    }
  }

  ping(): void {
    if (this.ws?.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify({ type: 'ping' }));
    }
  }

  disconnect(): void {
    this.reconnectAttempts = this.maxReconnectAttempts; // Prevent reconnect
    this.ws?.close();
    this.ws = null;
    this.terminal = null;
  }

  get isConnected(): boolean {
    return this.ws?.readyState === WebSocket.OPEN;
  }
}

// ============================================================================
// SSH WebSocket (Direct SSH connection)
// ============================================================================

export class SSHWebSocket extends ConsoleWebSocket {
  connectSSH(
    host: string,
    port: number,
    username: string,
    password: string,
    terminal: Terminal
  ): void {
    this.terminal = terminal;

    const params = new URLSearchParams({
      host,
      port: port.toString(),
      username,
      password,
    });

    const url = `${WS_BASE}/console/ws/ssh?${params}`;
    this.ws = new WebSocket(url);

    // Reuse parent class handlers by calling connect logic
    this.ws.onopen = () => {
      console.log(`SSH WebSocket connected to ${host}:${port}`);
    };

    this.ws.onmessage = (event) => {
      const data = event.data;

      if (data.startsWith('{')) {
        try {
          const message = JSON.parse(data) as ConsoleMessage;
          if (message.type === 'connected') {
            this.onConnect?.(message);
          } else if (message.type === 'error') {
            this.onError?.(message.message || 'Unknown error');
          }
        } catch {
          terminal.write(data);
        }
      } else {
        terminal.write(data);
      }
    };

    this.ws.onclose = () => {
      this.onDisconnect?.();
    };

    this.ws.onerror = () => {
      this.onError?.('SSH connection error');
    };
  }
}

// ============================================================================
// Uptime WebSocket
// ============================================================================

export interface UptimeUpdate {
  session_id: string;
  timestamp: string;
  nodes: Record<string, NodeUptimeStats>;
  uptime_percentage: number;
  points_earned: number;
  session_duration_seconds: number;
}

export interface UptimeMessage {
  type: 'connected' | 'update' | 'error' | 'closed' | 'pong';
  session_id?: string;
  data?: UptimeUpdate;
  message?: string;
  reason?: string;
  uptime_percentage?: number;
  points_earned?: number;
}

export class UptimeWebSocket {
  private ws: WebSocket | null = null;
  private pingInterval: ReturnType<typeof setInterval> | null = null;

  onConnect?: (sessionId: string) => void;
  onUpdate?: (update: UptimeUpdate) => void;
  onDisconnect?: (reason?: string) => void;
  onError?: (error: string) => void;

  connect(sessionId: string): void {
    const url = `${WS_BASE}/uptime/ws/${sessionId}`;
    this.ws = new WebSocket(url);

    this.ws.onopen = () => {
      console.log(`Uptime WebSocket connected for session ${sessionId}`);

      // Start ping interval to keep connection alive
      this.pingInterval = setInterval(() => {
        this.ping();
      }, 30000);
    };

    this.ws.onmessage = (event) => {
      try {
        const message = JSON.parse(event.data) as UptimeMessage;

        switch (message.type) {
          case 'connected':
            this.onConnect?.(message.session_id || sessionId);
            break;

          case 'update':
            if (message.data) {
              this.onUpdate?.(message.data);
            }
            break;

          case 'error':
            this.onError?.(message.message || 'Unknown error');
            break;

          case 'closed':
            this.onDisconnect?.(message.reason);
            break;
        }
      } catch (e) {
        console.error('Failed to parse uptime message:', e);
      }
    };

    this.ws.onclose = () => {
      this.cleanup();
      this.onDisconnect?.();
    };

    this.ws.onerror = () => {
      this.onError?.('Uptime WebSocket connection error');
    };
  }

  ping(): void {
    if (this.ws?.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify({ type: 'ping' }));
    }
  }

  disconnect(): void {
    this.cleanup();
    this.ws?.close();
    this.ws = null;
  }

  private cleanup(): void {
    if (this.pingInterval) {
      clearInterval(this.pingInterval);
      this.pingInterval = null;
    }
  }

  get isConnected(): boolean {
    return this.ws?.readyState === WebSocket.OPEN;
  }
}

// ============================================================================
// Singleton instances for easy access
// ============================================================================

export const consoleWS = new ConsoleWebSocket();
export const uptimeWS = new UptimeWebSocket();
