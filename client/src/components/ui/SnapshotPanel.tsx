import React, { useState, useEffect } from 'react';
import { useLabStore } from '../../store/labStore';
import type { Snapshot } from '../../store/labStore';

const SnapshotPanel: React.FC = () => {
  const snapshots = useLabStore((s) => s.snapshots);
  const createSnapshot = useLabStore((s) => s.createSnapshot);
  const listSnapshots = useLabStore((s) => s.listSnapshots);
  const restoreSnapshot = useLabStore((s) => s.restoreSnapshot);
  const deleteSnapshot = useLabStore((s) => s.deleteSnapshot);
  const isActive = useLabStore((s) => s.isActive);
  const labId = useLabStore((s) => s.labId);

  const [snapshotName, setSnapshotName] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (isActive && labId) {
      listSnapshots().catch(console.error);
    }
  }, [isActive, labId, listSnapshots]);

  const
