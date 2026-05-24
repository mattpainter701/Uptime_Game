import React, { useState, useRef, useEffect } from 'react';
import { searchReplace, findAllMatches } from '../../utils/configSearchReplace';

interface ConfigEditorProps {
  config: string;
  onChange: (newConfig: string) => void;
}

const ConfigEditor: React.FC<ConfigEditorProps> = ({ config, onChange }) => {
  const [editorValue, setEditorValue] = useState(config);
  const [showSearch, setShowSearch] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [replaceTerm, setReplaceTerm] = useState('');
  const [highlightedConfig, setHighlightedConfig] = useState('');
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Update editor value when config prop changes
  useEffect(() => {
    setEditorValue(config);
  }, [config]);

  // Handle keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'f') {
        e.preventDefault();
        setShowSearch(true);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Highlight matches in the config
  useEffect(() => {
    if (!searchTerm) {
      setHighlightedConfig(editorValue);
      return;
    }

    const matches = findAllMatches(editorValue, searchTerm);
    if (matches.length === 0) {
      setHighlightedConfig(editorValue);
      return;
    }

    let highlighted = '';
    let lastIndex = 0;

    matches.forEach(({ start, end }) => {
      highlighted += editorValue.substring(lastIndex, start);
      highlighted += `<mark>${editorValue.substring(start, end)}</mark>`;
      lastIndex = end;
    });

    highlighted += editorValue.substring(lastIndex);
    setHighlightedConfig(highlighted);
  }, [editorValue, searchTerm]);

  const handleReplaceNext = () => {
    const { result, count } = searchReplace(editorValue, searchTerm, replaceTerm, 'next');
    if (count > 0) {
      setEditorValue(result);
      onChange(result);
    }
  };

  const handleReplaceAll = () => {
    const { result, count } = searchReplace(editorValue, searchTerm, replaceTerm, 'all');
    if (count > 0) {
      setEditorValue(result);
      onChange(result);
    }
    alert(`Replaced ${count} occurrence(s).`);
  };

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchTerm(e.target.value);
  };

  const handleReplaceChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setReplaceTerm(e.target.value);
  };

  const handleTextareaChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setEditorValue(e.target.value);
    onChange(e.target.value);
  };

  return (
    <div className="config-editor">
      <div className="editor-toolbar">
        <button 
          onClick={() => setShowSearch(!showSearch)}
          className="search-toggle-btn"
        >
          {showSearch ? 'Close Search' : 'Search (Ctrl+F)'}
        </button>
      </div>

      {showSearch && (
        <div className="search-panel">
          <div className="search-inputs">
            <input
              type="text"
              placeholder="Search..."
              value={searchTerm}
              onChange={handleSearchChange}
              className="search-input"
            />
            <input
              type="text"
              placeholder="Replace..."
              value={replaceTerm}
              onChange={handleReplaceChange}
              className="replace-input"
            />
          </div>
          <div className="search-buttons">
            <button onClick={handleReplaceNext} disabled={!searchTerm}>
              Replace Next
            </button>
            <button onClick={handleReplaceAll} disabled={!searchTerm}>
              Replace All
            </button>
          </div>
        </div>
      )}

      <div className="editor-container">
        <textarea
          ref={textareaRef}
          value={editorValue}
          onChange={handleTextareaChange}
          className="config-textarea"
          spellCheck={false}
        />
        
        {/* Hidden div to show highlighted content */}
        <div 
          className="config-highlighted"
          style={{ display: 'none' }}
          dangerouslySetInnerHTML={{ __html: highlightedConfig }} 
        />
      </div>
      
      <style jsx>{`
        .config-editor {
          display: flex;
          flex-direction: column;
          height: 400px;
          border: 1px solid #ccc;
          border-radius: 4px;
          overflow: hidden;
        }
        
        .editor-toolbar {
          padding: 8px;
          background-color: #f5f5f5;
          border-bottom: 1px solid #ddd;
        }
        
        .search-toggle-btn {
          background: none;
          border: 1px solid #ccc;
          padding: 4px 8px;
          cursor: pointer;
          font-size: 12px;
        }
        
        .search-panel {
          padding: 8px;
          background-color: #eef2f7;
          border-bottom: 1px solid #ddd;
          display: flex;
          gap: 8px;
          align-items: center;
        }
        
        .search-inputs {
          display: flex;
          flex-direction: column;
          flex-grow: 1;
          gap: 4px;
        }
        
        .search-input, .replace-input {
          padding: 4px;
          border: 1px solid #ccc;
          border-radius: 2px;
          font-size: 12px;
        }
        
        .search-buttons {
          display: flex;
          gap: 4px;
        }
        
        .search-buttons button {
          padding: 4px 8px;
          font-size: 12px;
          cursor: pointer;
        }
        
        .editor-container {
          flex-grow: 1;
          position: relative;
        }
        
        .config-textarea {
          width: 100%;
          height: 100%;
          padding: 12px;
          border: none;
          resize: none;
          font-family: monospace;
          font-size: 14px;
          line-height: 1.4;
        }
        
        .config-highlighted {
          position: absolute;
          top: 0;
          left: 0;
          width: 100%;
          height: 100%;
          padding: 12px;
          font-family: monospace;
          font-size: 14px;
          line-height: 1.4;
          pointer-events: none;
          white-space: pre-wrap;
          word-wrap: break-word;
        }
        
        mark {
          background-color: yellow;
          color: black;
        }
      `}</style>
    </div>
  );
};

export default ConfigEditor;
