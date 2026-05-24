import React, { useState, useEffect, useRef } from 'react';
import { toast } from 'react-hot-toast';

interface NodeConfigEditorProps {
  nodeId: string;
  initialConfig: string;
  onSave: (config: string) => Promise<void>;
  onClose: () => void;
}

const NodeConfigEditor: React.FC<NodeConfigEditorProps> = ({
  nodeId,
  initialConfig,
  onSave,
  onClose
}) => {
  const [config, setConfig] = useState(initialConfig);
  const [isSaving, setIsSaving] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Handle keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Check if Ctrl+S or Cmd+S is pressed
      if ((e.ctrlKey || e.metaKey) && e.key === 's') {
        e.preventDefault(); // Prevent browser's default save dialog
        handleSave();
      }
    };

    const textarea = textareaRef.current;
    if (textarea) {
      textarea.addEventListener('keydown', handleKeyDown);
      
      // Cleanup event listener
      return () => {
        textarea.removeEventListener('keydown', handleKeyDown);
      };
    }
  }, [config]);

  const handleSave = async () => {
    setIsSaving(true);
    try {
      await onSave(config);
      toast.success(`Configuration for node ${nodeId} saved successfully!`);
    } catch (error) {
      console.error('Failed to save configuration:', error);
      toast.error('Failed to save configuration');
    } finally {
      setIsSaving(false);
    }
  };

  const handleCancel = () => {
    onClose();
  };

  return (
    <div className="node-config-editor p-4 bg-gray-800 rounded-lg">
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-lg font-semibold text-white">Node Configuration - {nodeId}</h3>
        <button 
          onClick={onClose}
          className="text-gray-400 hover:text-white"
        >
          ✕
        </button>
      </div>
      
      <div className="mb-4">
        <textarea
          ref={textareaRef}
          value={config}
          onChange={(e) => setConfig(e.target.value)}
          className="w-full h-64 p-2 bg-gray-700 text-white border border-gray-600 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
          placeholder="Enter node configuration..."
        />
      </div>
      
      <div className="flex space-x-2">
        <button
          onClick={handleSave}
          disabled={isSaving}
          className={`px-4 py-2 rounded ${
            isSaving 
              ? 'bg-gray-600 cursor-not-allowed' 
              : 'bg-green-600 hover:bg-green-700'
          } text-white`}
        >
          {isSaving ? 'Saving...' : 'Save (Ctrl+S)'}
        </button>
        
        <button
          onClick={handleCancel}
          className="px-4 py-2 bg-gray-600 hover:bg-gray-700 text-white rounded"
        >
          Cancel
        </button>
      </div>
    </div>
  );
};

export default NodeConfigEditor;
