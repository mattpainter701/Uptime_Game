import React, { useState, useEffect, useRef } from 'react';

interface NodeConfigEditorProps {
  initialConfig: string;
  onSave: (config: string) => void;
  nodeId: string;
}

export function NodeConfigEditor({ initialConfig, onSave, nodeId }: NodeConfigEditorProps) {
  const [config, setConfig] = useState(initialConfig);
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  // Handle keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Prevent default browser behavior for these shortcuts
      if ((e.ctrlKey || e.metaKey) && (e.key === 's' || e.key === 'S')) {
        e.preventDefault();
        onSave(config);
      } else if ((e.ctrlKey || e.metaKey) && (e.key === 'f' || e.key === 'F')) {
        e.preventDefault();
        setSearchOpen(true);
        setTimeout(() => {
          if (searchInputRef.current) {
            searchInputRef.current.focus();
          }
        }, 10);
      } else if ((e.ctrlKey || e.metaKey) && (e.key === 'z' || e.key === 'Z')) {
        e.preventDefault();
        // Browser's native undo
        document.execCommand('undo', false);
      } else if ((e.ctrlKey || e.metaKey) && (e.key === 'y' || e.key === 'Y')) {
        e.preventDefault();
        // Browser's native redo
        document.execCommand('redo', false);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [config, onSave]);

  const handleSave = () => {
    onSave(config);
  };

  const handleSearch = () => {
    if (textareaRef.current && searchTerm) {
      const text = textareaRef.current.value;
      const lines = text.split('\n');
      
      for (let i = 0; i < lines.length; i++) {
        if (lines[i].toLowerCase().includes(searchTerm.toLowerCase())) {
          // Focus the textarea and scroll to the line
          textareaRef.current.focus();
          const start = text.split('\n').slice(0, i).join('\n').length + 1;
          const end = start + lines[i].length;
          
          textareaRef.current.setSelectionRange(start, end);
          textareaRef.current.scrollTop = i * 20; // Approximate line height
          break;
        }
      }
    }
  };

  return (
    <div className="node-config-editor p-4 bg-gray-800 rounded-lg">
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-lg font-semibold text-white">Node Configuration - {nodeId}</h3>
        <button 
          onClick={handleSave}
          className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-md transition-colors"
        >
          Save Config
        </button>
      </div>

      {/* Keyboard shortcuts help */}
      <div className="mb-4 p-2 bg-gray-700 rounded text-sm text-gray-300">
        <span className="font-medium">Keyboard Shortcuts:</span> 
        {' '}Ctrl+S (Save), 
        {' '}Ctrl+F (Search), 
        {' '}Ctrl+Z (Undo), 
        {' '}Ctrl+Y (Redo)
      </div>

      {/* Search bar - only shown when search is open */}
      {searchOpen && (
        <div className="mb-4 flex gap-2">
          <input
            ref={searchInputRef}
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search in config..."
            className="flex-1 px-3 py-2 bg-gray-700 text-white rounded border border-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-500"
            onBlur={() => setSearchOpen(false)}
          />
          <button 
            onClick={handleSearch}
            className="px-3 py-2 bg-green-600 hover:bg-green-700 text-white rounded"
          >
            Find
          </button>
          <button 
            onClick={() => setSearchOpen(false)}
            className="px-3 py-2 bg-red-600 hover:bg-red-700 text-white rounded"
          >
            Close
          </button>
        </div>
      )}

      <textarea
        ref={textareaRef}
        value={config}
        onChange={(e) => setConfig(e.target.value)}
        className="w-full h-96 p-3 bg-gray-900 text-green-400 font-mono text-sm rounded border border-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
        spellCheck={false}
      />
    </div>
  );
}

export default NodeConfigEditor;
