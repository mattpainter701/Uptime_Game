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
  // Assume labStore provides the current lab ID
  const labId = useLabStore((s) => s.labId);

  // Filters state
  const [search, setSearch] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [status, setStatus] = useState('');

  // Debounced search
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const debounceTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Data & loading
  const [sessions, setSessions] = useState<LabSession[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Debounce logic: update debounced value 300ms after user stops typing
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

  // Fetch sessions when filters or debounced search change
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
