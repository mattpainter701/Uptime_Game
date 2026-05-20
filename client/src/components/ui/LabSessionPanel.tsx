import React, { useState } from 'react';
import { useLabStore } from '../../store/labStore';
import RestoreConfirmDialog from './RestoreConfirmDialog';

interface SavedSession {
  id: string;
  labName: string;
  timestamp: string;
  // other properties...
}

const LabSessionPanel: React.FC = () => {
  const [sessions, setSessions] = useState<SavedSession[]>([]); // Replace with store
  const [confirmTarget, setConfirmTarget] = useState<SavedSession | null>(null);
  const restoreSession = useLabStore((state) => state.restoreSession);

  const handleRestoreClick = (session: SavedSession) => {
    setConfirmTarget(session);
  };

  const handleConfirmRestore = () => {
    if (confirmTarget) {
      restoreSession(confirmTarget.id);
      setConfirmTarget(null);
    }
  };

  const handleCancelRestore = () => {
    setConfirmTarget(null);
  };

  return (
    <>
      <div className="lab-session-panel">
        {/* existing panel content */}
        {sessions.map((session) => (
          <div key={session.id} className="session-item">
            <span>{session.labName}</span>
            <button
              onClick={() => handleRestoreClick(session)}
              className="restore-btn"
            >
              Restore
            </button>
          </div>
        ))}
      </div>
      
      {confirmTarget && (
        <RestoreConfirmDialog
          labName={confirmTarget.labName}
          savedTimestamp={confirmTarget.timestamp}
          onCancel={handleCancelRestore}
          onConfirm={handleConfirmRestore}
        />
      )}
    </>
  );
};

export default LabSessionPanel;
