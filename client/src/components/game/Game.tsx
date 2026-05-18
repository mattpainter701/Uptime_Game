import { useEffect, useCallback, useState } from 'react';
import { useGameStore } from '../../store/gameStore';
import { GameCanvas } from '../scene/GameCanvas';
import { HUD } from '../ui/HUD';
import { TicketPanel } from '../ui/TicketPanel';
import { TerminalView } from '../terminal/TerminalView';
import { ElevatorPanel } from '../ui/ElevatorPanel';
import { TicketResultScreen } from '../ui/TicketResultScreen';
import { SessionSummaryScreen } from '../ui/SessionSummaryScreen';
import { TutorialOverlay } from '../ui/TutorialOverlay';
import { SandboxLabBrowser } from '../ui/SandboxLabBrowser';
import { ShortcutReference } from '../ui/ShortcutReference';
import { FLOORS } from '../scene/Building';

function OfficeView() {
  return (
    <>
      <GameCanvas />
      <HUD />

      {/* Click hint */}
      <div className="absolute bottom-8 left-1/2 -translate-x-1/2 z-10 pointer-events-none">
        <div className="glass-panel px-4 py-2 text-sm text-gray-300 animate-pulse-glow">
          Click on the desk to open the terminal
        </div>
      </div>
    </>
  );
}

function SettingsPanel() {
  const { settings, updateSettings, setView, saveGame, loadGame, exportSave, importSave, lastSavedAt } = useGameStore();

  const handleExport = () => {
    const json = exportSave();
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `netops-tower-save-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleImport = () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json';
    input.onchange = (e: any) => {
      const file = e.target?.files?.[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = (re) => {
        const text = re.target?.result as string;
        if (!text) return;
        const success = importSave(text);
        if (success) {
          alert('Save imported successfully! Game state restored.');
        } else {
          alert('Failed to import save: invalid file format.');
        }
      };
      reader.readAsText(file);
    };
    input.click();
  };

  return (
    <div className="absolute inset-0 flex items-center justify-center z-20 bg-black/60 backdrop-blur-sm">
      <div className="w-full max-w-lg m-4 glass-panel">
        <div className="flex items-center justify-between p-4 border-b border-gray-700">
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            <span>⚙️</span>
            <span>Settings</span>
          </h2>
          <button
            onClick={() => setView('office')}
            className="w-10 h-10 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-xl"
          >
            ✕
          </button>
        </div>

        <div className="p-6 space-y-6">
          {/* Audio settings */}
          <div>
            <h3 className="text-sm font-bold text-gray-400 mb-3">AUDIO</h3>
            <div className="space-y-4">
              <div>
                <label className="flex items-center justify-between mb-2">
                  <span className="text-white">Music Volume</span>
                  <span className="text-cyan-400">{Math.round(settings.musicVolume * 100)}%</span>
                </label>
                <input
                  type="range"
                  min="0"
                  max="1"
                  step="0.1"
                  value={settings.musicVolume}
                  onChange={(e) => updateSettings({ musicVolume: parseFloat(e.target.value) })}
                  className="w-full accent-cyan-500"
                />
              </div>
              <div>
                <label className="flex items-center justify-between mb-2">
                  <span className="text-white">SFX Volume</span>
                  <span className="text-cyan-400">{Math.round(settings.sfxVolume * 100)}%</span>
                </label>
                <input
                  type="range"
                  min="0"
                  max="1"
                  step="0.1"
                  value={settings.sfxVolume}
                  onChange={(e) => updateSettings({ sfxVolume: parseFloat(e.target.value) })}
                  className="w-full accent-cyan-500"
                />
              </div>
            </div>
          </div>

          {/* Terminal settings */}
          <div>
            <h3 className="text-sm font-bold text-gray-400 mb-3">TERMINAL</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-white mb-2">Theme</label>
                <div className="flex gap-2">
                  {(['cyberpunk', 'dark', 'light'] as const).map((theme) => (
                    <button
                      key={theme}
                      onClick={() => updateSettings({ terminalTheme: theme })}
                      className={`px-4 py-2 rounded capitalize ${
                        settings.terminalTheme === theme
                          ? 'bg-cyan-500/30 border border-cyan-500 text-cyan-400'
                          : 'bg-white/5 border border-gray-600 text-gray-300 hover:bg-white/10'
                      }`}
                    >
                      {theme}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label className="flex items-center justify-between mb-2">
                  <span className="text-white">Font Size</span>
                  <span className="text-cyan-400">{settings.terminalFontSize}px</span>
                </label>
                <input
                  type="range"
                  min="10"
                  max="20"
                  step="1"
                  value={settings.terminalFontSize}
                  onChange={(e) => updateSettings({ terminalFontSize: parseInt(e.target.value) })}
                  className="w-full accent-cyan-500"
                />
              </div>
            </div>
          </div>

          {/* Accessibility settings */}
          <div>
            <h3 className="text-sm font-bold text-gray-400 mb-3">ACCESSIBILITY</h3>
            <div className="space-y-4">
              {/* Colorblind mode */}
              <div>
                <label className="block text-white mb-2">Colorblind Mode</label>
                <div className="flex gap-2 flex-wrap">
                  {(['none', 'protanopia', 'deuteranopia', 'tritanopia'] as const).map((mode) => (
                    <button
                      key={mode}
                      onClick={() => updateSettings({ colorblindMode: mode })}
                      className={`px-3 py-2 rounded capitalize text-sm ${
                        settings.colorblindMode === mode
                          ? 'bg-cyan-500/30 border border-cyan-500 text-cyan-400'
                          : 'bg-white/5 border border-gray-600 text-gray-300 hover:bg-white/10'
                      }`}
                    >
                      {mode === 'none' ? 'Off' : mode}
                    </button>
                  ))}
                </div>
              </div>

              {/* Reduced motion toggle */}
              <label className="flex items-center justify-between">
                <span className="text-white">Reduced Motion</span>
                <button
                  onClick={() => updateSettings({ reducedMotion: !settings.reducedMotion })}
                  className={`w-12 h-6 rounded-full transition-all relative ${
                    settings.reducedMotion ? 'bg-cyan-500' : 'bg-gray-600'
                  }`}
                  role="switch"
                  aria-checked={settings.reducedMotion}
                  aria-label="Reduced motion"
                >
                  <span
                    className={`absolute top-0.5 w-5 h-5 rounded-full bg-white transition-all ${
                      settings.reducedMotion ? 'left-6' : 'left-0.5'
                    }`}
                  />
                </button>
              </label>

              {/* Large text toggle */}
              <label className="flex items-center justify-between">
                <span className="text-white">Large Text</span>
                <button
                  onClick={() => updateSettings({ largeText: !settings.largeText })}
                  className={`w-12 h-6 rounded-full transition-all relative ${
                    settings.largeText ? 'bg-cyan-500' : 'bg-gray-600'
                  }`}
                  role="switch"
                  aria-checked={settings.largeText}
                  aria-label="Large text"
                >
                  <span
                    className={`absolute top-0.5 w-5 h-5 rounded-full bg-white transition-all ${
                      settings.largeText ? 'left-6' : 'left-0.5'
                    }`}
                  />
                </button>
              </label>

              {/* High contrast toggle */}
              <label className="flex items-center justify-between">
                <span className="text-white">High Contrast</span>
                <button
                  onClick={() => updateSettings({ highContrast: !settings.highContrast })}
                  className={`w-12 h-6 rounded-full transition-all relative ${
                    settings.highContrast ? 'bg-cyan-500' : 'bg-gray-600'
                  }`}
                  role="switch"
                  aria-checked={settings.highContrast}
                  aria-label="High contrast"
                >
                  <span
                    className={`absolute top-0.5 w-5 h-5 rounded-full bg-white transition-all ${
                      settings.highContrast ? 'left-6' : 'left-0.5'
                    }`}
                  />
                </button>
              </label>

              {/* Keyboard shortcuts tip */}
              <p className="text-xs text-gray-500">
                Press <kbd className="px-1.5 py-0.5 bg-white/10 border border-gray-600 rounded text-cyan-400 font-mono">?</kbd> anytime to view keyboard shortcuts
              </p>
            </div>
          </div>

          {/* Game data */}
          <div>
            <h3 className="text-sm font-bold text-gray-400 mb-3">SAVE DATA</h3>
            <div className="space-y-3">
              <div className="flex items-center gap-3">
                <button
                  onClick={saveGame}
                  className="px-4 py-2 bg-cyan-500/20 border border-cyan-500/50 rounded text-cyan-400 hover:bg-cyan-500/30 transition-all flex items-center gap-2"
                >
                  <span>💾</span>
                  Save Game
                </button>
                <button
                  onClick={() => {
                    const ok = loadGame();
                    if (ok) {
                      alert('Game loaded successfully!');
                    } else {
                      alert('No save data found.');
                    }
                  }}
                  className="px-4 py-2 bg-green-500/20 border border-green-500/50 rounded text-green-400 hover:bg-green-500/30 transition-all flex items-center gap-2"
                >
                  <span>📂</span>
                  Load Game
                </button>
              </div>

              {lastSavedAt && (
                <p className="text-xs text-gray-500">
                  Last saved: {new Date(lastSavedAt).toLocaleString()}
                </p>
              )}

              <div className="border-t border-gray-700 pt-3 mt-3">
                <h4 className="text-xs font-bold text-gray-500 mb-2">BACKUP</h4>
                <div className="flex items-center gap-3">
                  <button
                    onClick={handleExport}
                    className="px-4 py-2 bg-purple-500/20 border border-purple-500/50 rounded text-purple-400 hover:bg-purple-500/30 transition-all flex items-center gap-2"
                  >
                    <span>📤</span>
                    Export Save
                  </button>
                  <button
                    onClick={handleImport}
                    className="px-4 py-2 bg-orange-500/20 border border-orange-500/50 rounded text-orange-400 hover:bg-orange-500/30 transition-all flex items-center gap-2"
                  >
                    <span>📥</span>
                    Import Save
                  </button>
                </div>
              </div>

              <div className="border-t border-gray-700 pt-3 mt-3">
                <h4 className="text-xs font-bold text-gray-500 mb-2">TUTORIAL</h4>
                <button
                  onClick={() => {
                    useGameStore.getState().replayTutorial();
                    setView('office');
                  }}
                  className="px-4 py-2 bg-cyan-500/20 border border-cyan-500/50 rounded text-cyan-400 hover:bg-cyan-500/30 transition-all flex items-center gap-2"
                >
                  <span>📖</span>
                  Replay Tutorial
                </button>
              </div>

              <div className="border-t border-gray-700 pt-3 mt-3">
                <h4 className="text-xs font-bold text-red-500/70 mb-2">DANGER ZONE</h4>
                <button
                  onClick={() => {
                    if (confirm('Are you sure? This will reset all progress.')) {
                      localStorage.removeItem('netops-tower-save');
                      window.location.reload();
                    }
                  }}
                  className="px-4 py-2 bg-red-500/20 border border-red-500/50 rounded text-red-400 hover:bg-red-500/30"
                >
                  Reset Progress
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function ShopPanel() {
  const { setView, player, addCredits } = useGameStore();

  const shopItems = [
    { id: 'coffee', name: 'Coffee', icon: '☕', cost: 10, description: 'Extends time limit by 2 minutes' },
    { id: 'hint-pack', name: 'Hint Pack', icon: '💡', cost: 100, description: 'Reduces hint costs by 50%' },
    { id: 'cert-ccna', name: 'CCNA Certification', icon: '📜', cost: 500, description: 'Unlocks advanced routing tickets' },
    { id: 'monitor', name: 'Extra Monitor', icon: '🖥️', cost: 1000, description: 'View 2 terminals at once' },
    { id: 'standing-desk', name: 'Standing Desk', icon: '🪑', cost: 2500, description: 'Cosmetic upgrade' },
  ];

  return (
    <div className="absolute inset-0 flex items-center justify-center z-20 bg-black/60 backdrop-blur-sm">
      <div className="w-full max-w-2xl max-h-[80vh] m-4 glass-panel flex flex-col">
        <div className="flex items-center justify-between p-4 border-b border-gray-700">
          <div className="flex items-center gap-3">
            <span className="text-3xl">🛒</span>
            <div>
              <h2 className="text-xl font-bold text-white">Shop</h2>
              <p className="text-sm text-gray-400">Upgrade your equipment</p>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <div className="text-green-400 font-bold">${player.credits.toLocaleString()}</div>
            <button
              onClick={() => setView('office')}
              className="w-10 h-10 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-xl"
            >
              ✕
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-4">
          <div className="grid gap-4">
            {shopItems.map((item) => (
              <div
                key={item.id}
                className="flex items-center gap-4 p-4 glass-panel hover:border-cyan-500/50 transition-all"
              >
                <span className="text-4xl">{item.icon}</span>
                <div className="flex-1">
                  <div className="font-bold text-white">{item.name}</div>
                  <div className="text-sm text-gray-400">{item.description}</div>
                </div>
                <button
                  disabled={player.credits < item.cost}
                  className={`px-4 py-2 rounded font-bold ${
                    player.credits >= item.cost
                      ? 'bg-green-500/30 border border-green-500 text-green-400 hover:bg-green-500/50'
                      : 'bg-gray-700 border border-gray-600 text-gray-500 cursor-not-allowed'
                  }`}
                >
                  ${item.cost}
                </button>
              </div>
            ))}
          </div>
        </div>

        {/* Debug: add credits */}
        <div className="p-4 border-t border-gray-700 bg-black/20">
          <button
            onClick={() => addCredits(100)}
            className="text-xs text-gray-500 hover:text-gray-300"
          >
            [Debug] Add $100
          </button>
        </div>
      </div>
    </div>
  );
}

// Pause overlay — full-screen dark overlay with "PAUSED" text and Resume button
function PauseOverlay() {
  const resumeGame = useGameStore((state) => state.resumeGame);

  return (
    <div className="absolute inset-0 z-50 bg-black/80 backdrop-blur-md flex flex-col items-center justify-center">
      <div className="text-center space-y-8">
        {/* Paused icon */}
        <div className="text-8xl animate-pulse">⏸️</div>

        {/* Title */}
        <h1 className="text-5xl font-bold text-white tracking-widest select-none">
          PAUSED
        </h1>

        {/* Subtitle */}
        <p className="text-gray-400 text-lg">
          Press <kbd className="px-2 py-1 bg-white/10 border border-gray-600 rounded text-white font-mono">Esc</kbd> or click Resume to continue
        </p>

        {/* Resume button */}
        <button
          onClick={resumeGame}
          className="mt-4 px-8 py-3 bg-cyan-500/30 border border-cyan-500 rounded-lg text-cyan-400 text-xl font-bold hover:bg-cyan-500/50 transition-all hover:scale-105 active:scale-95"
        >
          ▶ Resume
        </button>
      </div>
    </div>
  );
}

export function Game() {
  const currentView = useGameStore((state) => state.currentView);
  const elevatorOpen = useGameStore((state) => state.elevatorOpen);
  const currentFloor = useGameStore((state) => state.currentFloor);
  const setCurrentFloor = useGameStore((state) => state.setCurrentFloor);
  const closeElevator = useGameStore((state) => state.closeElevator);
  const isPaused = useGameStore((state) => state.sessionState.isPaused);
  const activeTicket = useGameStore((state) => state.activeTicket);
  const pauseGame = useGameStore((state) => state.pauseGame);
  const resumeGame = useGameStore((state) => state.resumeGame);

  // Shortcut reference overlay state
  const [shortcutRefOpen, setShortcutRefOpen] = useState(false);
  const toggleShortcutRef = useCallback(() => setShortcutRefOpen((v) => !v), []);

  // Keyboard handler — full accessibility keyboard navigation
  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      const store = useGameStore.getState();
      const { currentView, setView, activeTicket, validateTicket, sandboxState, sessionState, pauseGame, resumeGame } = store;

      // Ignore if user is typing in an input/textarea
      const target = e.target as HTMLElement;
      const isInput = target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.tagName === 'SELECT' || target.isContentEditable;

      // Show shortcut reference (? or F1) — always works
      if ((e.key === '?' || e.key === 'F1') && !isInput) {
        e.preventDefault();
        toggleShortcutRef();
        return;
      }

      // Escape: close panels / go back / toggle pause
      if (e.key === 'Escape') {
        const menuViews: string[] = ['settings', 'shop', 'tickets', 'ticketResult', 'sessionSummary', 'sandboxLabBrowser'];
        if (menuViews.includes(currentView)) {
          e.preventDefault();
          setView('office');
          return;
        }
        // In sandbox, Escape goes to office
        if (sandboxState.active) {
          e.preventDefault();
          setView('office');
          return;
        }
        // In terminal or office with active ticket: toggle pause
        if (activeTicket && !sandboxState.active) {
          e.preventDefault();
          if (sessionState.isPaused) {
            resumeGame();
          } else {
            pauseGame();
          }
          return;
        }
        return;
      }

      // Don't process other shortcuts when in input
      if (isInput) return;

      // Single-key navigation shortcuts
      switch (e.key.toUpperCase()) {
        case 'T':
          e.preventDefault();
          setView('tickets');
          break;
        case 'E':
          e.preventDefault();
          setView('terminal');
          break;
        case 'V':
          e.preventDefault();
          // In terminal view, the terminal handles validation via CLI.
          // V shortcut navigates to terminal so user can run validate commands.
          if (currentView !== 'terminal') {
            setView('terminal');
          }
          break;
        case 'B':
          e.preventDefault();
          setView('shop');
          break;
        case 'S':
          e.preventDefault();
          setView('settings');
          break;
        case 'O':
          e.preventDefault();
          setView('office');
          break;
        case 'P':
          e.preventDefault();
          if (sessionState.isPaused) {
            resumeGame();
          } else {
            pauseGame();
          }
          break;
      }
    },
    [toggleShortcutRef],
  );

  // Auto-pause on tab blur (visibilitychange)
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.hidden) {
        // Tab lost focus — auto-pause if in-game
        const state = useGameStore.getState();
        const menuViews: string[] = ['settings', 'shop', 'tickets', 'ticketResult', 'sessionSummary', 'sandboxLabBrowser'];
        const isInMenu = menuViews.includes(state.currentView);
        if (!isInMenu && state.activeTicket && !state.sessionState.isPaused && !state.sandboxState.active) {
          state.pauseGame();
        }
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, []);

  // Register/unregister Escape key handler
  useEffect(() => {
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);

  return (
    <div className="w-full h-full relative">
      {/* Base 3D scene - always visible as background */}
      {currentView !== 'terminal' && <OfficeView />}

      {/* Overlays based on current view */}
      {currentView === 'terminal' && <TerminalView />}
      {currentView === 'tickets' && <TicketPanel />}
      {currentView === 'shop' && <ShopPanel />}
      {currentView === 'settings' && <SettingsPanel />}
      {currentView === 'ticketResult' && <TicketResultScreen />}
      {currentView === 'sessionSummary' && <SessionSummaryScreen />}
      {currentView === 'sandboxLabBrowser' && <SandboxLabBrowser />}

      {/* Elevator panel overlay */}
      <ElevatorPanel
        isOpen={elevatorOpen}
        currentFloor={currentFloor}
        floors={FLOORS}
        onSelectFloor={setCurrentFloor}
        onClose={closeElevator}
      />

      {/* Pause overlay — renders on top of everything when paused */}
      {isPaused && <PauseOverlay />}

      {/* Tutorial overlay — on top of everything when tutorial is active */}
      <TutorialOverlay />

      {/* Keyboard shortcut reference overlay */}
      <ShortcutReference isOpen={shortcutRefOpen} onClose={() => setShortcutRefOpen(false)} />
    </div>
  );
}

export default Game;
