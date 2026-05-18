import { useEffect, useCallback } from 'react';
import { KEYBOARD_SHORTCUTS } from '../../lib/accessibility';

interface ShortcutReferenceProps {
  isOpen: boolean;
  onClose: () => void;
}

export function ShortcutReference({ isOpen, onClose }: ShortcutReferenceProps) {
  // Close on Escape
  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === 'Escape' || e.key === '?' || e.key === 'F1') {
        onClose();
      }
    },
    [onClose],
  );

  useEffect(() => {
    if (isOpen) {
      document.addEventListener('keydown', handleKeyDown);
      return () => document.removeEventListener('keydown', handleKeyDown);
    }
  }, [isOpen, handleKeyDown]);

  if (!isOpen) return null;

  const byCategory = KEYBOARD_SHORTCUTS.reduce(
    (acc, s) => {
      const cat = s.category;
      if (!acc[cat]) acc[cat] = [];
      acc[cat].push(s);
      return acc;
    },
    {} as Record<string, typeof KEYBOARD_SHORTCUTS>,
  );

  return (
    <div
      className="absolute inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-label="Keyboard shortcuts reference"
    >
      <div className="glass-panel max-w-lg w-full m-4 max-h-[80vh] overflow-y-auto">
        <div className="flex items-center justify-between p-4 border-b border-gray-700">
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            <span>⌨</span>
            <span>Keyboard Shortcuts</span>
          </h2>
          <button
            onClick={onClose}
            className="w-10 h-10 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-xl text-white"
            aria-label="Close keyboard shortcuts"
          >
            ✕
          </button>
        </div>

        <div className="p-4 space-y-6" role="list" aria-label="Shortcut categories">
          {Object.entries(byCategory).map(([category, shortcuts]) => (
            <div key={category} role="listitem" aria-label={`${category} shortcuts`}>
              <h3 className="text-sm font-bold text-cyan-400 uppercase mb-3">
                {category}
              </h3>
              <div className="space-y-2">
                {shortcuts.map((shortcut) => (
                  <div
                    key={shortcut.key}
                    className="flex items-center justify-between py-1 border-b border-gray-800 last:border-0"
                  >
                    <span className="text-gray-300 text-sm">{shortcut.description}</span>
                    <kbd className="px-3 py-1 bg-white/10 border border-gray-600 rounded text-cyan-400 font-mono text-sm min-w-[2rem] text-center">
                      {shortcut.key}
                    </kbd>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>

        <div className="p-4 border-t border-gray-700 text-center">
          <p className="text-xs text-gray-500">
            Press <kbd className="px-1.5 py-0.5 bg-white/10 border border-gray-600 rounded text-cyan-400 font-mono text-xs">?</kbd> or{' '}
            <kbd className="px-1.5 py-0.5 bg-white/10 border border-gray-600 rounded text-cyan-400 font-mono text-xs">F1</kbd> to reopen
          </p>
        </div>
      </div>
    </div>
  );
}
