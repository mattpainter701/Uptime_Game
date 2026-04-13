/**
 * NetOps Tower - API Client
 *
 * REST API client for communicating with the backend.
 */

// In Electron, the server runs on localhost:8000 bundled alongside the app.
// In browser dev mode, use the env variable or default.
const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:8000/api';

interface ApiResponse<T> {
  data?: T;
  error?: string;
  ok: boolean;
}

async function request<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<ApiResponse<T>> {
  try {
    const response = await fetch(`${API_BASE}${endpoint}`, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ detail: 'Request failed' }));
      return { ok: false, error: error.detail || 'Request failed' };
    }

    const data = await response.json();
    return { ok: true, data };
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : 'Network error' };
  }
}

// ============================================================================
// Status API
// ============================================================================

export interface ServerStatus {
  server: string;
  eveng: {
    connected: boolean;
    status: {
      version: string;
      cpu: number;
      mem: number;
      disk: number;
    } | null;
  };
}

export interface GameConfig {
  uptimeCheckInterval: number;
  uptimePointsPerMinute: number;
  uptimeBonusThreshold: number;
  uptimeBonusMultiplier: number;
  downtimePenaltyPerMinute: number;
  reputationLossPerIncident: number;
  enforceTimeLimits: boolean;
  evengTimeout: number;
}

export const statusApi = {
  getStatus: () => request<ServerStatus>('/status/'),
  getHealth: () => request<{ status: string }>('/status/health'),
  getTemplates: () => request<{ templates: Record<string, unknown>[] }>('/status/templates'),
  getConfig: () => request<GameConfig>('/status/config'),
};

// ============================================================================
// Labs API
// ============================================================================

export interface LabInfo {
  id: string;
  name: string;
  path: string;
  description?: string;
  author?: string;
}

export const labsApi = {
  list: (folder = '/') => request<{ labs: LabInfo[] }>(`/labs/?folder=${encodeURIComponent(folder)}`),
  getInfo: (labPath: string) => request<LabInfo>(`/labs/${encodeURIComponent(labPath)}/info`),
  open: (labPath: string) => request<{ success: boolean }>(`/labs/${encodeURIComponent(labPath)}/open`, { method: 'POST' }),
};

// ============================================================================
// Nodes API
// ============================================================================

export type NodeStatus = 'stopped' | 'starting' | 'running' | 'stopping';
export type NodeType = 'router' | 'switch' | 'firewall' | 'server' | 'linux' | 'windows' | 'other';
export type ConsoleType = 'telnet' | 'vnc' | 'ssh' | 'rdp';

export interface NodeInfo {
  id: number;
  name: string;
  template: string;
  type: NodeType;
  status: NodeStatus;
  console_type: ConsoleType;
  console_host?: string;
  console_port?: number;
  cpu?: number;
  ram?: number;
  image?: string;
  icon?: string;
}

export const nodesApi = {
  list: (labPath: string) =>
    request<{ nodes: NodeInfo[] }>(`/nodes/${encodeURIComponent(labPath)}/list`),

  get: (labPath: string, nodeId: number) =>
    request<NodeInfo>(`/nodes/${encodeURIComponent(labPath)}/${nodeId}`),

  start: (labPath: string, nodeId: number) =>
    request<{ success: boolean }>(`/nodes/${encodeURIComponent(labPath)}/${nodeId}/start`, { method: 'POST' }),

  stop: (labPath: string, nodeId: number) =>
    request<{ success: boolean }>(`/nodes/${encodeURIComponent(labPath)}/${nodeId}/stop`, { method: 'POST' }),

  wipe: (labPath: string, nodeId: number) =>
    request<{ success: boolean }>(`/nodes/${encodeURIComponent(labPath)}/${nodeId}/wipe`, { method: 'POST' }),

  startAll: (labPath: string) =>
    request<{ success: boolean }>(`/nodes/${encodeURIComponent(labPath)}/start-all`, { method: 'POST' }),

  stopAll: (labPath: string) =>
    request<{ success: boolean }>(`/nodes/${encodeURIComponent(labPath)}/stop-all`, { method: 'POST' }),

  getConfig: (labPath: string, nodeId: number) =>
    request<{ config: string }>(`/nodes/${encodeURIComponent(labPath)}/${nodeId}/config`),
};

// ============================================================================
// Uptime API
// ============================================================================

export interface NodeUptimeStats {
  node_id: number;
  node_name: string;
  status: NodeStatus;
  is_responsive: boolean;
  uptime_seconds: number;
  downtime_seconds: number;
  incident_count: number;
}

export interface UptimeSession {
  session_id: string;
  lab_path: string;
  started_at: string;
  ended_at?: string;
  is_active: boolean;
  nodes: Record<number, NodeUptimeStats>;
  total_uptime_seconds: number;
  total_downtime_seconds: number;
  uptime_percentage: number;
  points_earned: number;
  total_incidents: number;
}

export interface UptimeStartResponse {
  session_id: string;
  lab_path: string;
  nodes: number[];
  started_at: string;
}

export interface UptimeStopResponse {
  session: UptimeSession;
  final_points: number;
  bonus_multiplier: number;
  summary: string;
}

export const uptimeApi = {
  start: (labPath: string, nodeIds: number[], ticketId?: string) =>
    request<UptimeStartResponse>('/uptime/start', {
      method: 'POST',
      body: JSON.stringify({ lab_path: labPath, node_ids: nodeIds, ticket_id: ticketId }),
    }),

  getStatus: (sessionId: string) =>
    request<UptimeSession>(`/uptime/status/${sessionId}`),

  stop: (sessionId: string) =>
    request<UptimeStopResponse>(`/uptime/stop/${sessionId}`, { method: 'POST' }),
};

// ============================================================================
// Export all APIs
// ============================================================================

export const api = {
  status: statusApi,
  labs: labsApi,
  nodes: nodesApi,
  uptime: uptimeApi,
};

export default api;
