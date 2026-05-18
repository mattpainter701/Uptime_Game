// Accessibility utilities for NetOps Tower
import type { ColorblindMode } from '../types/game';

// ─── Colorblind mode filter matrices ──────────────────────────────────────
// SVG feColorMatrix values for each colorblind variant.
// These shift problematic color channels to make red/green/blue distinguishable.

export const COLORBLIND_FILTERS: Record<Exclude<ColorblindMode, 'none'>, string> = {
  protanopia: `
    <svg xmlns="http://www.w3.org/2000/svg">
      <filter id="protanopia-filter">
        <feColorMatrix type="matrix" values="
          0.567  0.433  0      0  0
          0.558  0.442  0      0  0
          0      0.242  0.758  0  0
          0      0      0      1  0
        " />
      </filter>
    </svg>
  `,
  deuteranopia: `
    <svg xmlns="http://www.w3.org/2000/svg">
      <filter id="deuteranopia-filter">
        <feColorMatrix type="matrix" values="
          0.625  0.375  0      0  0
          0.7    0.3    0      0  0
          0      0.3    0.7    0  0
          0      0      0      1  0
        " />
      </filter>
    </svg>
  `,
  tritanopia: `
    <svg xmlns="http://www.w3.org/2000/svg">
      <filter id="tritanopia-filter">
        <feColorMatrix type="matrix" values="
          0.95   0.05   0      0  0
          0      0.433  0.567  0  0
          0      0.475  0.525  0  0
          0      0      0      1  0
        " />
      </filter>
    </svg>
  `,
};

// ─── Secondary non-color status cues ─────────────────────────────────────
// CSS classes applied alongside colored status indicators so colorblind
// users can distinguish states without relying on color alone.

export const STATUS_CUE_ICONS = {
  pass: '✓',
  fail: '✗',
  warning: '⚠',
  pending: '◷',
} as const;

// ─── Keyboard shortcuts ──────────────────────────────────────────────────
// Centralized shortcut definitions for keyboard-only navigation.

export interface KeyboardShortcut {
  key: string;
  description: string;
  category: 'navigation' | 'actions' | 'system';
  /** If true, shortcut works even when focus is inside an input */
  global?: boolean;
}

export const KEYBOARD_SHORTCUTS: KeyboardShortcut[] = [
  { key: 'T', description: 'Open ticket panel', category: 'navigation' },
  { key: 'E', description: 'Open terminal / node console', category: 'navigation' },
  { key: 'V', description: 'Validate active ticket', category: 'actions' },
  { key: 'B', description: 'Open shop / buy items', category: 'navigation' },
  { key: 'S', description: 'Open settings', category: 'navigation' },
  { key: 'O', description: 'Back to office view', category: 'navigation' },
  { key: 'P', description: 'Pause / resume game', category: 'system' },
  { key: 'Esc', description: 'Close panel / go back', category: 'system', global: true },
  { key: '?', description: 'Show keyboard shortcuts', category: 'system', global: true },
  { key: 'F1', description: 'Show keyboard shortcuts', category: 'system', global: true },
  { key: 'ArrowUp', description: 'Move camera up', category: 'navigation' },
  { key: 'ArrowDown', description: 'Move camera down', category: 'navigation' },
  { key: 'ArrowLeft', description: 'Move camera left', category: 'navigation' },
  { key: 'ArrowRight', description: 'Move camera right', category: 'navigation' },
];

// ─── Accessibility class builder ─────────────────────────────────────────
// Builds the CSS class string for the root element based on current settings.

export function getAccessibilityClasses(
  colorblindMode: ColorblindMode,
  reducedMotion: boolean,
  largeText: boolean,
  highContrast: boolean,
): string {
  const classes: string[] = [];

  if (colorblindMode !== 'none') {
    classes.push(`cb-${colorblindMode}`);
  }
  if (reducedMotion) {
    classes.push('reduce-motion');
  }
  if (largeText) {
    classes.push('large-text');
  }
  if (highContrast) {
    classes.push('high-contrast');
  }

  return classes.join(' ');
}
