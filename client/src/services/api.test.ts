/**
 * Unit tests for the API client (api.ts).
 *
 * Uses vitest's mock for fetch to test request handling,
 * error states, and API method wrappers.
 */
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

// We import the module under test dynamically so we can mock fetch first
const mockFetch = vi.fn();
globalThis.fetch = mockFetch;

// Dynamic import after mocking
const apiModule = await import('../services/api');
const { api, statusApi, labsApi, nodesApi, uptimeApi, validationApi } = apiModule;

describe('API Client - request()', () => {
  beforeEach(() => {
    mockFetch.mockReset();
  });

  it('returns ok:true with data on success', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({ status: 'healthy' }),
    });

    const result = await statusApi.getHealth();
    expect(result.ok).toBe(true);
    expect(result.data).toEqual({ status: 'healthy' });
    expect(result.error).toBeUndefined();
  });

  it('returns ok:false on HTTP error', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false,
      json: () => Promise.resolve({ detail: 'Not Found' }),
    });

    const result = await statusApi.getHealth();
    expect(result.ok).toBe(false);
    expect(result.error).toBe('Not Found');
  });

  it('handles JSON parse failure in error response', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false,
      json: () => Promise.reject(new Error('Parse error')),
    });

    const result = await statusApi.getHealth();
    expect(result.ok).toBe(false);
    expect(result.error).toBe('Request failed');
  });

  it('handles network error', async () => {
    mockFetch.mockRejectedValueOnce(new Error('Network error'));

    const result = await statusApi.getHealth();
    expect(result.ok).toBe(false);
    expect(result.error).toBe('Network error');
  });

  it('handles non-Error thrown values', async () => {
    mockFetch.mockRejectedValueOnce('connection refused');

    const result = await statusApi.getHealth();
    expect(result.ok).toBe(false);
    expect(result.error).toBe('Network error');
  });
});

describe('statusApi', () => {
  beforeEach(() => {
    mockFetch.mockReset();
  });

  it('getStatus calls correct endpoint', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({ server: 'online', eveng: { connected: false, status: null } }),
    });

    const result = await statusApi.getStatus();
    expect(result.ok).toBe(true);
    expect(result.data?.server).toBe('online');
    expect(mockFetch).toHaveBeenCalledWith(
      expect.stringContaining('/status/'),
      expect.any(Object),
    );
  });

  it('getTemplates calls correct endpoint', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({ templates: ['vios', 'linux'] }),
    });

    const result = await statusApi.getTemplates();
    expect(result.ok).toBe(true);
    expect(mockFetch).toHaveBeenCalledWith(
      expect.stringContaining('/status/templates'),
      expect.any(Object),
    );
  });
});

describe('labsApi', () => {
  beforeEach(() => {
    mockFetch.mockReset();
  });

  it('list calls with folder param', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({ labs: [{ id: '1', name: 'Lab1', path: '/Lab1.unl' }] }),
    });

    const result = await labsApi.list('/');
    expect(result.ok).toBe(true);
    expect(result.data?.labs).toHaveLength(1);
  });
});

describe('nodesApi', () => {
  beforeEach(() => {
    mockFetch.mockReset();
  });

  it('list nodes for a lab', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({
        nodes: [{ id: 1, name: 'R1', template: 'vios', type: 'router', status: 'running', console_type: 'telnet' }]
      }),
    });

    const result = await nodesApi.list('/lab.unl');
    expect(result.ok).toBe(true);
    expect(result.data?.nodes).toHaveLength(1);
    expect(result.data?.nodes[0].name).toBe('R1');
  });

  it('start calls POST', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({ success: true }),
    });

    const result = await nodesApi.start('/lab.unl', 1);
    expect(result.ok).toBe(true);
    expect(mockFetch).toHaveBeenCalledWith(
      expect.stringContaining('/start'),
      expect.objectContaining({ method: 'POST' }),
    );
  });
});

describe('uptimeApi', () => {
  beforeEach(() => {
    mockFetch.mockReset();
  });

  it('start sends POST with body', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({ session_id: 'sess-1', lab_path: '/lab.unl', nodes: [1], started_at: '2025-01-01T00:00:00Z' }),
    });

    const result = await uptimeApi.start('/lab.unl', [1, 2]);
    expect(result.ok).toBe(true);
    expect(result.data?.session_id).toBe('sess-1');
    expect(mockFetch).toHaveBeenCalledWith(
      expect.stringContaining('/uptime/start'),
      expect.objectContaining({
        method: 'POST',
        body: expect.stringContaining('"node_ids":[1,2]'),
      }),
    );
  });
});

describe('validationApi', () => {
  beforeEach(() => {
    mockFetch.mockReset();
  });

  it('validate sends POST with body', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({
        ticket_id: 'T-001', outcome: 'full_pass', success: true,
        total_criteria: 3, passed_criteria: 3, failed_criteria: 0,
        score: 1.0, reward_multiplier: 1.0, criteria_results: [],
        anti_cheat_flags: [], total_duration_ms: 100, message: '', hints: [],
      }),
    });

    const result = await validationApi.validate({
      ticket_id: 'T-001',
      validation_criteria: [{ type: 'ping', params: { source: 'R1' } }],
    });

    expect(result.ok).toBe(true);
    expect(result.data?.outcome).toBe('full_pass');
  });

  it('getGradingConfig fetches config', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({
        full_pass_threshold: 1.0, partial_pass_threshold: 0.5,
        partial_reward_floor: 0.3, reward_scaling: 'stepped', reward_steps: [],
      }),
    });

    const result = await validationApi.getGradingConfig();
    expect(result.ok).toBe(true);
    expect(result.data?.reward_scaling).toBe('stepped');
  });
});
