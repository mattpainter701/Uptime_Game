import React from 'react';
import { useLabStore } from '../../store/labStore';

interface RestoreSessionModalProps {
  isOpen: boolean;
  onRestore: () => void;
  onDiscard: () => void;
}

export const RestoreSessionModal: React.FC<RestoreSessionModalProps> = ({
  isOpen,
  onRestore,
  onDiscard,
}) => {
  if (!isOpen) return null;

  const savedSession = useLabStore((state) => state.loadSession());

  return (
    <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-50 z-50">
      <div className="bg-gray-800 text-white p-6 rounded-lg shadow-lg max-w-md w-full">
        <h2 className="text-xl font-bold mb-4">Restore Lab Session?</h2>
        <p className="mb-4 text-gray-300">
          A previous lab session was found. Do you want to restore it?
        </p>
        {savedSession && (
          <div className="mb-4 text-sm text-gray-400">
            <p>Lab ID: {savedSession.labId || 'None'}</p>
          </div>
        )}
        <div className="flex justify-end space-x-4">
          <button
            onClick={onDiscard}
            className="px-4 py-2 bg-gray-600 hover:bg-gray-700 rounded"
          >
            Discard
          </button>
          <button
            onClick={onRestore}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded"
          >
            Restore
          </button>
        </div>
      </div>
    </div>
  );
};

export default RestoreSessionModal;
