import React from 'react';

interface RestoreConfirmDialogProps {
  labName: string;
  savedTimestamp: string;
  onCancel: () => void;
  onConfirm: () => void;
}

export const RestoreConfirmDialog: React.FC<RestoreConfirmDialogProps> = ({
  labName,
  savedTimestamp,
  onCancel,
  onConfirm,
}) => {
  // Format the timestamp for display
  const formattedTime = new Date(savedTimestamp).toLocaleString();

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="bg-gray-800 border border-gray-700 rounded-lg shadow-2xl p-6 max-w-md w-full mx-4">
        <h2 className="text-xl font-bold text-white mb-4">Restore Saved Session</h2>
        
        <div className="space-y-3 mb-6">
          <p className="text-gray-300">
            Are you sure you want to restore the following session?
          </p>
          <div className="bg-gray-700/50 rounded p-3">
            <p className="text-white font-semibold">{labName}</p>
            <p className="text-gray-400 text-sm">Saved at: {formattedTime}</p>
          </div>
          <div className="bg-yellow-900/30 border border-yellow-700/50 rounded p-3 text-yellow-200 text-sm">
            <span className="font-semibold">⚠ Warning:</span> Any unsaved changes in your current session will be lost.
          </div>
        </div>

        <div className="flex justify-end gap-3">
          <button
            onClick={onCancel}
            className="px-4 py-2 bg-gray-600 hover:bg-gray-500 text-white rounded transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            className="px-4 py-2 bg-red-600 hover:bg-red-500 text-white rounded transition-colors"
          >
            Restore
          </button>
        </div>
      </div>
    </div>
  );
};

export default RestoreConfirmDialog;
