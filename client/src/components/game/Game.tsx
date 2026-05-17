import { useEffect, useCallback, useState } from 'react';
import { useGameStore } from '../../store/gameStore';
import type { SettingsPreset } from '../../types/game';
import { GameCanvas } from '../scene/GameCanvas';
import { HUD } from '../ui/HUD';
import { TicketPanel } from '../ui/TicketPanel';
import { TerminalView } from '../terminal/TerminalView';
import { ElevatorPanel } from '../ui/ElevatorPanel';
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
  const { settings, updateSettings, setView, exportSettings, importSettings, resetSettings, applyPreset } = useGameStore();
  const [activeTab, setActiveTab] = useState<'graphics' | 'audio' | 'gameplay' | 'terminal' | 'accessibility'>('graphics');

  const tabs = [
    { id: 'graphics' as const, label: '🖥️ Graphics' },
    { id: 'audio' as const, label: '🔊 Audio' },
    { id: 'gameplay' as const, label: '🎮 Gameplay' },
    { id: 'terminal' as const, label: '💻 Terminal' },
    { id: 'accessibility' as const, label: '♿ Access' },
  ];

  const presets: { id: SettingsPreset; label: string; icon: string; desc: string }[] = [
    { id: 'performance', label: 'Performance', icon: '⚡', desc: 'Low graphics, smooth FPS' },
    { id: 'balanced', label: 'Balanced', icon: '⚖️', desc: 'Good visuals & performance' },
    { id: 'quality', label: 'Quality', icon: '✨', desc: 'Best visuals' },
  ];

  const handleExportSettings = () => {
    const json = exportSettings();
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `netops-tower-settings-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleImportSettings = () => {
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
        const success = importSettings(text);
        if (success) {
          alert('Settings imported successfully!');
        } else {
          alert('Failed to import settings: invalid file format.');
        }
      };
      reader.readAsText(file);
    };
    input.click();
  };

  const renderGraphicsTab = () => (
    <div className="space-y-4">
      <div>
        <label className="block text-sm font-bold text-gray-400 mb-2">Quality Preset</label>
        <div className="flex gap-2">
          {(['low', 'medium', 'high'] as const).map((q) => (
            <button
              key={q}
              onClick={() => updateSettings({ graphicsQuality: q })}
              className={`flex-1 px-3 py-2 rounded capitalize text-sm font-medium transition-all ${
                settings.graphicsQuality === q
                  ? 'bg-cyan-500/30 border border-cyan-500 text-cyan-400'
                  : 'bg-white/5 border border-gray-600 text-gray-400 hover:bg-white/10'
              }`}
            >
              {q}
            </button>
          ))}
        </div>
      </div>

      <div>
        <label className="flex items-center justify-between mb-3">
          <span className="text-white text-sm">Render Distance</span>
          <span className="text-cyan-400 text-sm">{settings.renderDistance}</span>
        </label>
        <input
          type="range"
          min="1"
          max="10"
          step="1"
          value={settings.renderDistance}
          onChange={(e) => updateSettings({ renderDistance: parseInt(e.target.value) })}
          className="w-full accent-cyan-500"
        />
        <div className="flex justify-between text-xs text-gray-600 mt-1">
          <span>Near</span><span>Far</span>
        </div>
      </div>

      <div className="space-y-3">
        <label className="flex items-center justify-between cursor-pointer">
          <span className="text-white text-sm">Shadows</span>
          <button
            onClick={() => updateSettings({ shadows: !settings.shadows })}
            className={`w-11 h-6 rounded-full transition-colors relative ${
              settings.shadows ? 'bg-cyan-500' : 'bg-gray-600'
            }`}
          >
            <span className={`absolute top-0.5 w-5 h-5 rounded-full bg-white transition-transform ${
              settings.shadows ? 'translate-x-5' : 'translate-x-0.5'
            }`} />
          </button>
        </label>

        <label className="flex items-center justify-between cursor-pointer">
          <span className="text-white text-sm">Anti-aliasing</span>
          <button
            onClick={() => updateSettings({ antialiasing: !settings.antialiasing })}
            className={`w-11 h-6 rounded-full transition-colors relative ${
              settings.antialiasing ? 'bg-cyan-500' : 'bg-gray-600'
            }`}
          >
            <span className={`absolute top-0.5 w-5 h-5 rounded-full bg-white transition-transform ${
              settings.antialiasing ? 'translate-x-5' : 'translate-x-0.5'
            }`} />
          </button>
        </label>
      </div>
    </div>
  );

  const renderAudioTab = () => (
    <div className="space-y-4">
      {[
        { key: 'masterVolume' as const, label: 'Master Volume' },
        { key: 'musicVolume' as const, label: 'Music Volume' },
        { key: 'sfxVolume' as const, label: 'SFX Volume' },
      ].map(({ key, label }) => (
        <div key={key}>
          <label className="flex items-center justify-between mb-2">
            <span className="text-white text-sm">{label}</span>
            <span className="text-cyan-400 text-sm">{Math.round(settings[key] * 100)}%</span>
          </label>
          <input
            type="range"
            min="0"
            max="1"
            step="0.05"
            value={settings[key]}
            onChange={(e) => updateSettings({ [key]: parseFloat(e.target.value) })}
            className="w-full accent-cyan-500"
          />
        </div>
      ))}

      <div className="space-y-3 pt-2">
        {[
          { key: 'ambientSounds' as const, label: 'Ambient Sounds', desc: 'Background office/environment audio' },
          { key: 'uiSounds' as const, label: 'UI Sounds', desc: 'Button clicks, notifications, alerts' },
        ].map(({ key, label, desc }) => (
          <label key={key} className="flex items-center justify-between cursor-pointer">
            <div>
              <span className="text-white text-sm block">{label}</span>
              <span className="text-gray-500 text-xs">{desc}</span>
            </div>
            <button
              onClick={() => updateSettings({ [key]: !settings[key] })}
              className={`w-11 h-6 rounded-full transition-colors relative flex-shrink-0 ${
                settings[key] ? 'bg-cyan-500' : 'bg-gray-600'
              }`}
            >
              <span className={`absolute top-0.5 w-5 h-5 rounded-full bg-white transition-transform ${
                settings[key] ? 'translate-x-5' : 'translate-x-0.5'
              }`} />
            </button>
          </label>
        ))}
      </div>
    </div>
  );

  const renderGameplayTab = () => (
    <div className="space-y-4">
      {[
        { key: 'showHints' as const, label: 'Show Hints', desc: 'Display hint availability during tickets' },
        { key: 'autoValidate' as const, label: 'Auto-Validate', desc: 'Automatically run validation when criteria met' },
        { key: 'confirmOnFail' as const, label: 'Confirm on Fail', desc: 'Ask for confirmation before failing a ticket' },
        { key: 'enforceTimeLimits' as const, label: 'Enforce Time Limits', desc: 'Auto-fail tickets when time runs out' },
      ].map(({ key, label, desc }) => (
        <label key={key} className="flex items-center justify-between cursor-pointer">
          <div>
            <span className="text-white text-sm block">{label}</span>
            <span className="text-gray-500 text-xs">{desc}</span>
          </div>
          <button
            onClick={() => updateSettings({ [key]: !settings[key] })}
            className={`w-11 h-6 rounded-full transition-colors relative flex-shrink-0 ${
              settings[key] ? 'bg-cyan-500' : 'bg-gray-600'
            }`}
          >
            <span className={`absolute top-0.5 w-5 h-5 rounded-full bg-white transition-transform ${
              settings[key] ? 'translate-x-5' : 'translate-x-0.5'
            }`} />
          </button>
        </label>
      ))}
    </div>
  );

  const renderTerminalTab = () => (
    <div className="space-y-4">
      <div>
        <label className="block text-white text-sm mb-2">Theme</label>
        <div className="flex gap-2">
          {(['cyberpunk', 'dark', 'light'] as const).map((theme) => (
            <button
              key={theme}
              onClick={() => updateSettings({ terminalTheme: theme })}
              className={`flex-1 px-3 py-2 rounded capitalize text-sm ${
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
          <span className="text-white text-sm">Font Size</span>
          <span className="text-cyan-400 text-sm">{settings.terminalFontSize}px</span>
        </label>
        <input
          type="range"
          min="10"
          max="24"
          step="1"
          value={settings.terminalFontSize}
          onChange={(e) => updateSettings({ terminalFontSize: parseInt(e.target.value) })}
          className="w-full accent-cyan-500"
        />
      </div>

      <div>
        <label className="flex items-center justify-between mb-2">
          <span className="text-white text-sm">Opacity</span>
          <span className="text-cyan-400 text-sm">{Math.round(settings.terminalOpacity * 100)}%</span>
        </label>
        <input
          type="range"
          min="0.5"
          max="1"
          step="0.05"
          value={settings.terminalOpacity}
          onChange={(e) => updateSettings({ terminalOpacity: parseFloat(e.target.value) })}
          className="w-full accent-cyan-500"
        />
      </div>

      <div>
        <label className="flex items-center justify-between mb-2">
          <span className="text-white text-sm">Scrollback Lines</span>
          <span className="text-cyan-400 text-sm">{settings.terminalScrollback}</span>
        </label>
        <input
          type="range"
          min="500"
          max="5000"
          step="500"
          value={settings.terminalScrollback}
          onChange={(e) => updateSettings({ terminalScrollback: parseInt(e.target.value) })}
          className="w-full accent-cyan-500"
        />
        <div className="flex justify-between text-xs text-gray-600 mt-1">
          <span>500</span><span>5000</span>
        </div>
      </div>

      <div className="space-y-3 pt-2">
        <label className="flex items-center justify-between cursor-pointer">
          <span className="text-white text-sm">Blinking Cursor</span>
          <button
            onClick={() => updateSettings({ terminalBlinkCursor: !settings.terminalBlinkCursor })}
            className={`w-11 h-6 rounded-full transition-colors relative ${
              settings.terminalBlinkCursor ? 'bg-cyan-500' : 'bg-gray-600'
            }`}
          >
            <span className={`absolute top-0.5 w-5 h-5 rounded-full bg-white transition-transform ${
              settings.terminalBlinkCursor ? 'translate-x-5' : 'translate-x-0.5'
            }`} />
          </button>
        </label>
      </div>
    </div>
  );

  const renderAccessibilityTab = () => (
    <div className="space-y-4">
      <div>
        <label className="block text-white text-sm mb-2">Colorblind Mode</label>
        <div className="flex flex-wrap gap-2">
          {([
            { value: 'none' as const, label: 'None' },
            { value: 'protanopia' as const, label: 'Protanopia (Red)' },
            { value: 'deuteranopia' as const, label: 'Deuteranopia (Green)' },
            { value: 'tritanopia' as const, label: 'Tritanopia (Blue)' },
          ]).map(({ value, label }) => (
            <button
              key={value}
              onClick={() => updateSettings({ colorblindMode: value })}
              className={`px-3 py-2 rounded text-xs font-medium transition-all ${
                settings.colorblindMode === value
                  ? 'bg-cyan-500/30 border border-cyan-500 text-cyan-400'
                  : 'bg-white/5 border border-gray-600 text-gray-400 hover:bg-white/10'
              }`}
            >
              {label}
            </button>
          ))}
        </div>
        <p className="text-xs text-gray-600 mt-2 italic">
          Stub — full colorblind pipeline coming in a future update.
        </p>
      </div>

      <div className="space-y-3 pt-2">
        {[
          { key: 'reducedMotion' as const, label: 'Reduced Motion', desc: 'Skip animations and transitions' },
          { key: 'largeText' as const, label: 'Large Text', desc: 'Increase UI text size globally' },
        ].map(({ key, label, desc }) => (
          <label key={key} className="flex items-center justify-between cursor-pointer">
            <div>
              <span className="text-white text-sm block">{label}</span>
              <span className="text-gray-500 text-xs">{desc}</span>
            </div>
            <button
              onClick={() => updateSettings({ [key]: !settings[key] })}
              className={`w-11 h-6 rounded-full transition-colors relative flex-shrink-0 ${
                settings[key] ? 'bg-cyan-500' : 'bg-gray-600'
              }`}
            >
              <span className={`absolute top-0.5 w-5 h-5 rounded-full bg-white transition-transform ${
                settings[key] ? 'translate-x-5' : 'translate-x-0.5'
              }`} />
            </button>
          </label>
        ))}
      </div>
    </div>
  );

  const tabContent: Record<string, () => JSX.Element> = {
    graphics: renderGraphicsTab,
    audio: renderAudioTab,
    gameplay: renderGameplayTab,
    terminal: renderTerminalTab,
    accessibility: renderAccessibilityTab,
  };

  return (
    <div className="absolute inset-0 flex items-center justify-center z-20 bg-black/60 backdrop-blur-sm">
      <div className="w-full max-w-lg m-4 glass-panel max-h-[85vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-700 flex-shrink-0">
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

        {/* Preset buttons */}
        <div className="px-4 pt-4 flex-shrink-0">
          <p className="text-xs font-bold text-gray-500 mb-2">PRESETS</p>
          <div className="flex gap-2">
            {presets.map((preset) => (
              <button
                key={preset.id}
                onClick={() => applyPreset(preset.id)}
                className="flex-1 px-2 py-2 rounded bg-white/5 border border-gray-600 hover:border-cyan-500/50 hover:bg-white/10 transition-all text-center"
                title={preset.desc}
              >
                <span className="text-lg block">{preset.icon}</span>
                <span className="text-xs text-gray-300">{preset.label}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Tab navigation */}
        <div className="flex px-4 pt-4 gap-1 flex-shrink-0 overflow-x-auto">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`px-2.5 py-1.5 rounded-t text-xs font-medium whitespace-nowrap transition-all ${
                activeTab === tab.id
                  ? 'bg-cyan-500/20 border border-b-0 border-cyan-500/50 text-cyan-400'
                  : 'bg-white/5 border border-transparent text-gray-500 hover:text-gray-300'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Tab content */}
        <div className="p-4 border-t border-gray-700 flex-1 overflow-y-auto">
          {tabContent[activeTab]()}
        </div>

        {/* Footer actions */}
        <div className="p-4 border-t border-gray-700 flex-shrink-0 space-y-2">
          <div className="flex gap-2">
            <button
              onClick={handleExportSettings}
              className="flex-1 px-3 py-2 bg-purple-500/20 border border-purple-500/50 rounded text-purple-400 text-sm hover:bg-purple-500/30 transition-all flex items-center justify-center gap-1"
            >
              <span>📤</span> Export
            </button>
            <button
              onClick={handleImportSettings}
              className="flex-1 px-3 py-2 bg-orange-500/20 border border-orange-500/50 rounded text-orange-400 text-sm hover:bg-orange-500/30 transition-all flex items-center justify-center gap-1"
            >
              <span>📥</span> Import
            </button>
          </div>
          <button
            onClick={() => {
              if (confirm('Reset all settings to defaults? Your game progress will not be affected.')) {
                resetSettings();
              }
            }}
            className="w-full px-3 py-2 bg-red-500/20 border border-red-500/50 rounded text-red-400 text-sm hover:bg-red-500/30 transition-all flex items-center justify-center gap-1"
          >
            <span>🔄</span> Reset to Defaults
          </button>
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

  // Escape key handler — toggles pause when in-game (terminal/office views with active ticket)
  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if (e.key === 'Escape') {
      // Don't toggle pause in menus (settings, shop, tickets)
      const menuViews: string[] = ['settings', 'shop', 'tickets'];
      const isInMenu = menuViews.includes(useGameStore.getState().currentView);
      if (isInMenu) return;

      // Toggle pause
      const { sessionState, pauseGame, resumeGame } = useGameStore.getState();
      if (sessionState.isPaused) {
        resumeGame();
      } else {
        pauseGame();
      }
    }
  }, []);

  // Auto-pause on tab blur (visibilitychange)
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.hidden) {
        // Tab lost focus — auto-pause if in-game
        const state = useGameStore.getState();
        const menuViews: string[] = ['settings', 'shop', 'tickets'];
        const isInMenu = menuViews.includes(state.currentView);
        if (!isInMenu && state.activeTicket && !state.sessionState.isPaused) {
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
    </div>
  );
}

export default Game;
