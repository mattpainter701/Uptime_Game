import { useLabStore } from "./store/labStore";
import { RestoreSessionModal } from "./components/ui/RestoreSessionModal";
import { useEffect, useMemo } from 'react';
import { Game } from './components/game/Game';
import { useGameStore } from './store/gameStore';
import { getAccessibilityClasses } from './lib/accessibility';
import type { ColorblindMode } from './types/game';
import './index.css';

// SVG feColorMatrix filters for each colorblind variant — injected inline
// so the CSS filter property can reference them via url(#filter-id).
const COLORBLIND_MATRICES: Record<Exclude<ColorblindMode, 'none'>, string> = {
  protanopia: `
    0.567  0.433  0      0  0
    0.558  0.442  0      0  0
    0      0.242  0.758  0  0
    0      0      0      1  0
  `,
  deuteranopia: `
    0.625  0.375  0      0  0
    0.7    0.3    0      0  0
    0      0.3    0.7    0  0
    0      0      0      1  0
  `,
  tritanopia: `
    0.95   0.05   0      0  0
    0      0.433  0.567  0  0
    0      0.475  0.525  0  0
    0      0      0      1  0
  `,
};

function AccessibilityProvider({ children }: { children: React.ReactNode }) {
  const settings = useGameStore((s) => s.settings);
  const { colorblindMode, reducedMotion, largeText, highContrast } = settings;

  // Build accessibility class string
  const a11yClasses = useMemo(
    () => getAccessibilityClasses(colorblindMode, reducedMotion, largeText, highContrast),
    [colorblindMode, reducedMotion, largeText, highContrast],
  );

  // Apply classes to root element
  useEffect(() => {
    const root = document.documentElement;
    // Clear previous a11y classes
    root.classList.remove('cb-protanopia', 'cb-deuteranopia', 'cb-tritanopia',
      'reduce-motion', 'large-text', 'high-contrast');
    // Apply new ones
    a11yClasses.split(/\s+/).filter(Boolean).forEach((cls) => root.classList.add(cls));
    root.setAttribute('data-colorblind-mode', colorblindMode);

    // Apply colorblind filter to body (using inline SVG filter)
    if (colorblindMode !== 'none') {
      document.body.style.filter = `url(#cb-${colorblindMode}-filter)`;
    } else {
      document.body.style.filter = '';
    }
  }, [a11yClasses, colorblindMode]);

  return (
    <>
      {/* Inline SVG with feColorMatrix filters for colorblind modes */}
      <svg
        xmlns="http://www.w3.org/2000/svg"
        aria-hidden="true"
        style={{ position: 'absolute', width: 0, height: 0 }}
      >
        <defs>
          {Object.entries(COLORBLIND_MATRICES).map(([mode, matrix]) => (
            <filter key={mode} id={`cb-${mode}-filter`}>
              <feColorMatrix type="matrix" values={matrix} />
            </filter>
          ))}
        </defs>
      </svg>
      {children}
    </>
  );
}

function App() {
  return (
    <div className="w-screen h-screen overflow-hidden bg-[#0a0a15]">
      <AccessibilityProvider>
        <Game />
      </AccessibilityProvider>
    </div>
  );
}

      <RestoreSessionModal
        isOpen={showRestore}
        onRestore={handleRestore}
        onDiscard={handleDiscard}
      />
export default App;
