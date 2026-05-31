import { useState, useEffect, useCallback, useRef } from 'react';
import { useLabStore } from '../../store/labStore';

interface LabSession {
  id: string;
  lab_id: string;
  name: string;
  notes: string;
  status: string;
  created_at: string;
  updated_at: string;
}

const statusOptions = [
  { value: '', label: 'All' },
  { value: 'active', label: 'Active' },
  { value: 'completed', label: 'Completed' },
  { value: 'paused', label: 'Paused' },
];

export function LabSessionHistory() {
  const labId = useLabStore((s) => s.activeLabId);

  const [search, setSearch] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [status, setStatus] = useState('');

  const [debouncedSearch, setDebouncedSearch] = useState('');
  const debounceTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [sessions, setSessions] = useState<LabSession[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (debounceTimer.current) {
      clearTimeout(debounceTimer.current);
    }
    debounceTimer.current = setTimeout(() => {
      setDebouncedSearch(search);
    }, 300);

    return () => {
      if (debounceTimer.current) {
        clearTimeout(debounceTimer.current);
      }
    };
  }, [search]);

  const fetchSessions = useCallback(async () => {
    if (!labId) return;

    setLoading(true);
    setError(null);

    const params = new URLSearchParams();
    if (debouncedSearch) params.append('search', debouncedSearch);
    if (dateFrom) params.append('date_from', dateFrom);
    if (dateTo) params.append('date_to', dateTo);
    if (status) params.append('status', status);

    try {
      const response = await fetch(`/api/labs/${labId}/sessions?${params}`);
      if (!response.ok) {
        throw new Error(`Failed to fetch sessions (${response.status})`);
      }
      const data = await response.json();
      setSessions(data.sessions || []);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      setError(message);
    } finally {
      setLoading(false);
    }
  }, [labId, debouncedSearch, dateFrom, dateTo, status]);

  useEffect(() => {
    fetchSessions();
  }, [fetchSessions]);

  const statusBadgeClass = (sessionStatus: string) =>
    sessionStatus === 'active'
      ? 'bg-green-700 text-green-100'
      : sessionStatus === 'completed'
      ? 'bg-blue-700 text-blue-100'
      : 'bg-yellow-700 text-yellow-100';

  return (
    <div className="lab-session-history bg-gray-900 text-gray-100 p-6 rounded-lg shadow-lg">
      <h2 className="text-xl font-bold mb-4">Lab Session History</h2>

      {/* Filters */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 mb-6">
        {/* Search */}
        <div>
          <label className="block text-sm text-gray-400 mb-1">Search</label>
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search sessions..."
            className="w-full bg-gray-800 border border-gray-700 rounded px-3 py-2 text-sm focus:outline-none focus:border-blue-500"
          />
        </div>

        {/* Date From */}
        <div>
          <label className="block text-sm text-gray-400 mb-1">From</label>
          <input
            type="date"
            value={dateFrom}
            onChange={(e) => setDateFrom(e.target.value)}
            className="w-full bg-gray-800 border border-gray-700 rounded px-3 py-2 text-sm focus:outline-none focus:border-blue-500"
          />
        </div>

        {/* Date To */}
        <div>
          <label className="block text-sm text-gray-400 mb-1">To</label>
          <input
            type="date"
            value={dateTo}
            onChange={(e) => setDateTo(e.target.value)}
            className="w-full bg-gray-800 border border-gray-700 rounded px-3 py-2 text-sm focus:outline-none focus:border-blue-500"
          />
        </div>

        {/* Status */}
        <div>
          <label className="block text-sm text-gray-400 mb-1">Status</label>
          <select
            value={status}
            onChange={(e) => setStatus(e.target.value)}
            className="w-full bg-gray-800 border border-gray-700 rounded px-3 py-2 text-sm focus:outline-none focus:border-blue-500"
          >
            {statusOptions.map((opt) => (
              <option key={opt.value} value={opt.value}>{opt.label}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Loading */}
      {loading && (
        <div className="flex justify-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
        </div>
      )}

      {/* Error */}
      {error && (
        <div className="bg-red-900/50 border border-red-700 rounded p-3 mb-4">
          <p className="text-red-300 text-sm">{error}</p>
        </div>
      )}

      {/* No lab selected */}
      {!labId && !loading && (
        <div className="text-center py-8 text-gray-500">
          <p>No lab session active. Open a lab to view session history.</p>
        </div>
      )}

      {/* Sessions list */}
      {labId && !loading && !error && sessions.length === 0 && (
        <div className="text-center py-8 text-gray-500">
          <p>No sessions found matching your filters.</p>
        </div>
      )}

      {sessions.length > 0 && (
        <div className="space-y-3">
          {sessions.map((session) => (
            <div
              key={session.id}
              className="bg-gray-800 border border-gray-700 rounded-lg p-4 hover:border-gray-600 transition-colors"
            >
              <div className="flex items-start justify-between">
                <div>
                  <h3 className="font-medium text-gray-200">{session.name || 'Untitled Session'}</h3>
                  <p className="text-sm text-gray-400 mt-1">
                    {new Date(session.created_at).toLocaleString()}
                  </p>
                </div>
                <span className={`px-2 py-1 rounded text-xs font-medium ${statusBadgeClass(session.status)}`}>
                  {session.status}
                </span>
              </div>
              {session.notes && (
                <p className="text-sm text-gray-500 mt-2 line-clamp-2">{session.notes}</p>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
