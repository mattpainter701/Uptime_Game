import { useEffect } from 'react';
import { useUIStore } from '../store/uiStore';

export function useKeyboardShortcuts() {
  const toggleShortcuts = useUIStore((s) => s.toggleShortcuts);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      const isInputFocused =
        target.tagName === 'INPUT' ||
        target.tagName === 'TEXTAREA' ||
        target.isContentEditable;

      if (!isInputFocused && e.key === '?') {
        e.preventDefault();
        toggleShortcuts();
      }
    };

    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [toggleShortcuts]);
}
