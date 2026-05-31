import React, { useState, useEffect, useCallback } from 'react';
import { useLabStore } from '../../store/labStore';
import type { Snapshot } from '../../store/labStore';

const SnapshotPanel: React.FC = () => {
  const snapshots = useLabStore((s) => s.snapshots as unknown as Snapshot[]);
  const isActive = useLabStore((s) => s.isActive);
  const labId = useLabStore((s) => s.activeLabId);

  const [snapshotName, setSnapshotName] = useState('');
  const [busy, setBusy] = useState(false);
  const [localSnapshots, setLocalSnapshots] = useState<Snapshot[]>([]);
  const [error, setError] = useState<string | null>(null);

  // Load snapshots from localStorage on mount
  useEffect(() => {
    try {
      const stored = localStorage.getItem('lab-snapshots');
      if (stored) {
        setLocalSnapshots(JSON.parse(stored));
      }
    } catch {
      // Ignore parse errors
    }
  }, []);

  // Persist snapshots to localStorage
  const persistSnapshots = useCallback((snaps: Snapshot[]) => {
    localStorage.setItem('lab-snapshots', JSON.stringify(snaps));
    setLocalSnapshots(snaps);
  }, []);

  const handleCreateSnapshot = useCallback(async () => {
    if (!labId || !snapshotName.trim()) return;
    setBusy(true);
    setError(null);

    try {
      const newSnapshot: Snapshot = {
        id: `snap-${Date.now()}`,
        lab_id: labId,
        name: snapshotName.trim(),
        timestamp: new Date().toISOString(),
        data: {
          labId,
          createdAt: new Date().toISOString(),
        },
      };
      const updated = [...localSnapshots, newSnapshot];
      persistSnapshots(updated);
      setSnapshotName('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create snapshot');
    } finally {
      setBusy(false);
    }
  }, [labId, snapshotName, localSnapshots, persistSnapshots]);

  const handleRestoreSnapshot = useCallback(async (snapshot: Snapshot) => {
    setBusy(true);
    setError(null);
    try {
      // Restore logic - reload from snapshot data
      if (snapshot.data) {
        // In a real implementation, this would restore lab state from snapshot.data
        console.log('Restoring snapshot:', snapshot.name);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to restore snapshot');
    } finally {
      setBusy(false);
    }
  }, []);

  const handleDeleteSnapshot = useCallback(async (snapshotId: string) => {
    const updated = localSnapshots.filter((s) => s.id !== snapshotId);
    persistSnapshots(updated);
  }, [localSnapshots, persistSnapshots]);

  return (
    <div className="bg-gray-900 border border-gray-700 rounded-lg p-4">
      <h3 className="text-lg font-semibold text-gray-100 mb-4">Snapshots</h3>

      {!isActive && (
        <p className="text-sm text-gray-500 mb-4">
          Activate a lab session to create and manage snapshots.
        </p>
      )}

      {error && (
        <div className="bg-red-900/50 border border-red-700 rounded p-2 mb-3">
          <p className="text-red-300 text-xs">{error}</p>
        </div>
      )}

      {/* Create snapshot form */}
      {isActive && (
        <div className="flex gap-2 mb-4">
          <input
            type="text"
            value={snapshotName}
            onChange={(e) => setSnapshotName(e.target.value)}
            placeholder="Snapshot name..."
            className="flex-1 bg-gray-800 border border-gray-700 rounded px-3 py-2 text-sm text-gray-100 focus:outline-none focus:border-blue-500"
            disabled={busy}
          />
          <button
            onClick={handleCreateSnapshot}
            disabled={busy || !snapshotName.trim()}
            className="bg-blue-600 hover:bg-blue-700 disabled:bg-gray-700 disabled:text-gray-500 text-white px-4 py-2 rounded text-sm font-medium transition-colors"
          >
            {busy ? 'Saving...' : 'Save'}
          </button>
        </div>
      )}

      {/* Snapshot list */}
      {localSnapshots.length === 0 && (
        <p className="text-sm text-gray-500 text-center py-4">
          No snapshots yet. Create one to save your lab state.
        </p>
      )}

      {localSnapshots.length > 0 && (
        <div className="space-y-2 max-h-64 overflow-y-auto">
          {localSnapshots.map((snapshot) => (
            <div
              key={snapshot.id}
              className="bg-gray-800 border border-gray-700 rounded p-3 flex items-center justify-between"
            >
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium text-gray-200 truncate">{snapshot.name}</p>
                <p className="text-xs text-gray-500">
                  {new Date(snapshot.timestamp).toLocaleString()}
                </p>
              </div>
              <div className="flex gap-1 ml-3">
                <button
                  onClick={() => handleRestoreSnapshot(snapshot)}
                  disabled={busy || !isActive}
                  className="bg-green-700 hover:bg-green-600 disabled:bg-gray-700 disabled:text-gray-500 text-white px-2 py-1 rounded text-xs transition-colors"
                  title="Restore this snapshot"
                >
                  Restore
                </button>
                <button
                  onClick={() => handleDeleteSnapshot(snapshot.id)}
                  disabled={busy}
                  className="bg-red-800 hover:bg-red-700 disabled:bg-gray-700 disabled:text-gray-500 text-white px-2 py-1 rounded text-xs transition-colors"
                  title="Delete this snapshot"
                >
                  Delete
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default SnapshotPanel;
