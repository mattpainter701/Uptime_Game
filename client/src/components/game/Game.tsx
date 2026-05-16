import { useGameStore } from '../../store/gameStore';
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

export function Game() {
  const currentView = useGameStore((state) => state.currentView);
  const elevatorOpen = useGameStore((state) => state.elevatorOpen);
  const currentFloor = useGameStore((state) => state.currentFloor);
  const setCurrentFloor = useGameStore((state) => state.setCurrentFloor);
  const closeElevator = useGameStore((state) => state.closeElevator);

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
    </div>
  );
}

export default Game;
