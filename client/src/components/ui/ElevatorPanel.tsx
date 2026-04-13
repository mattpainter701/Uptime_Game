/**
 * ElevatorPanel.tsx - Floor selection UI overlay (React DOM)
 * Renders as HTML overlay on top of the 3D canvas
 */

import type { FloorId, FloorInfo } from '../scene/Building';

interface ElevatorPanelProps {
  isOpen: boolean;
  currentFloor: FloorId;
  floors: FloorInfo[];
  onSelectFloor: (floorId: FloorId) => void;
  onClose: () => void;
}

export function ElevatorPanel({ isOpen, currentFloor, floors, onSelectFloor, onClose }: ElevatorPanelProps) {
  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 flex items-center justify-center bg-black/70 z-[1000]"
      onClick={onClose}
    >
      <div
        className="w-80 bg-gradient-to-b from-[#1a1a2e] to-[#16213e] border-2 border-[#0f4c75] rounded-xl p-5 shadow-[0_0_30px_rgba(15,76,117,0.5),inset_0_0_20px_rgba(0,0,0,0.5)] font-mono text-gray-200 relative"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="text-center mb-4 border-b border-[#0f4c75] pb-3">
          <div className="text-xs text-gray-500 tracking-[2px] mb-1">
            NETOPS TOWER
          </div>
          <div className="text-xl font-bold text-[#3498db] [text-shadow:0_0_10px_rgba(52,152,219,0.5)]">
            ELEVATOR CONTROL
          </div>
        </div>

        {/* Current floor indicator */}
        <div className="bg-[#0a0a14] border border-gray-700 rounded-md p-2.5 mb-4 text-center">
          <div className="text-[10px] text-gray-500 mb-1">CURRENT FLOOR</div>
          <div className="text-2xl font-bold text-[#00ff88] [text-shadow:0_0_15px_rgba(0,255,136,0.6)] font-mono">
            {floors.find(f => f.id === currentFloor)?.name || 'Unknown'}
          </div>
        </div>

        {/* Floor selection buttons */}
        <div className="flex flex-col gap-2">
          <div className="text-[10px] text-gray-500 mb-1">SELECT DESTINATION</div>

          {floors.map((floor) => {
            const isCurrent = floor.id === currentFloor;
            return (
              <button
                key={floor.id}
                onClick={() => !isCurrent && onSelectFloor(floor.id)}
                disabled={isCurrent}
                className={`flex items-center justify-between px-4 py-3 rounded-md font-mono text-sm transition-all ${
                  isCurrent
                    ? 'bg-gradient-to-r from-[#1a4a1a] to-[#0a2a0a] border-2 border-[#00ff88] text-[#00ff88] cursor-default shadow-[0_0_15px_rgba(0,255,136,0.3),inset_0_0_10px_rgba(0,255,136,0.1)]'
                    : 'bg-gradient-to-r from-[#1a1a2e] to-[#252540] border border-gray-700 text-gray-300 cursor-pointer hover:from-[#252540] hover:to-[#353560] hover:border-[#0f4c75] hover:text-[#3498db]'
                }`}
              >
                <span className="font-bold">{floor.label}</span>
                {isCurrent && (
                  <span className="text-[10px] bg-[#00ff88] text-black px-2 py-0.5 rounded">
                    HERE
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* Close button */}
        <button
          onClick={onClose}
          className="w-full mt-4 px-4 py-2.5 bg-gradient-to-r from-[#4a1a1a] to-[#2a0a0a] border border-[#ff4444] rounded-md text-[#ff6666] font-mono text-xs cursor-pointer transition-all hover:from-[#5a2a2a] hover:to-[#3a1a1a] hover:text-[#ff8888]"
        >
          CLOSE [ESC]
        </button>

        {/* Decorative pulse indicator */}
        <div className="absolute top-2.5 right-2.5 w-2 h-2 rounded-full bg-[#00ff00] shadow-[0_0_10px_#00ff00] animate-pulse-glow" />
      </div>
    </div>
  );
}

export default ElevatorPanel;
