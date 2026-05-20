import { useUIStore } from '../../store/uiStore';

const shortcuts = [
  { key: '?', description: 'Toggle help panel' },
  { key: 'Ctrl+K', description: 'Clear terminal' },
  { key: 'Ctrl+Shift+F', description: 'Command search' },
];

export function KeyboardShortcuts() {
  const showShortcuts = useUIStore((s) => s.showShortcuts);
  const toggleShortcuts = useUIStore((s) => s.toggleShortcuts);

  if (!showShortcuts) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm"
      onClick={toggleShortcuts}
    >
      <div
        className="bg-gray-900 border border-gray-700 rounded-lg shadow-xl p-6 max-w-md w-full text-gray-100"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="text-xl font-bold mb-4 text-cyan-400">Keyboard Shortcuts</h2>
        <ul className="space-y-2">
          {shortcuts.map((s) => (
            <li key={s.key} className="flex justify-between">
              <kbd className="px-2 py-1 bg-gray-800 rounded text-sm font-mono">{s.key}</kbd>
              <span className="text-gray-300">{s.description}</span>
            </li>
          ))}
        </ul>
        <p className="mt-4 text-xs text-gray-500 text-center">
          Press <kbd className="px-1 bg-gray-800 rounded">?</kbd> or click outside to close
        </p>
      </div>
    </div>
  );
}
