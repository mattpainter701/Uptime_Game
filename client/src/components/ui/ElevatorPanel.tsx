/**
 * ElevatorPanel.tsx - Sprint 8: Floor selection UI with level gating
 * Shows locked floors that require higher career levels
 */

import { FLOOR_DEFINITIONS } from '../../types/game';
import type { FloorId } from '../../types/game';
import { useGameStore } from '../../store/gameStore';

interface ElevatorPanelProps {
  isOpen: boolean;
  currentFloor: FloorId;
  onSelectFloor: (floorId: FloorId) => void;
  onClose: () => void;
}

export function ElevatorPanel({ isOpen, currentFloor, onSelectFloor, onClose }: ElevatorPanelProps) {
  const playerLevel = useGameStore((state) => state.player.level);

  if (!isOpen) return null;

  return (
    <div
      style={{
        position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        backgroundColor: 'rgba(0, 0, 0, 0.7)', zIndex: 1000,
      }}
      onClick={onClose}
    >
      <div
        style={{
          width: '340px',
          background: 'linear-gradient(180deg, #1a1a2e 0%, #16213e 100%)',
          border: '2px solid #0f4c75', borderRadius: '12px', padding: '20px',
          boxShadow: '0 0 30px rgba(15, 76, 117, 0.5), inset 0 0 20px rgba(0, 0, 0, 0.5)',
          fontFamily: "'Courier New', monospace", color: '#e0e0e0', position: 'relative',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div style={{ textAlign: 'center', marginBottom: '16px', borderBottom: '1px solid #0f4c75', paddingBottom: '12px' }}>
          <div style={{ fontSize: '12px', color: '#888', letterSpacing: '2px', marginBottom: '4px' }}>NETOPS TOWER</div>
          <div style={{ fontSize: '20px', fontWeight: 'bold', color: '#3498db', textShadow: '0 0 10px rgba(52, 152, 219, 0.5)' }}>
            ELEVATOR CONTROL
          </div>
        </div>

        {/* Current floor indicator */}
        <div style={{ background: '#0a0a14', border: '1px solid #333', borderRadius: '6px', padding: '10px', marginBottom: '16px', textAlign: 'center' }}>
          <div style={{ fontSize: '10px', color: '#666', marginBottom: '4px' }}>CURRENT FLOOR</div>
          <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#00ff88', textShadow: '0 0 15px rgba(0, 255, 136, 0.6)' }}>
            {FLOOR_DEFINITIONS.find(f => f.id === currentFloor)?.name || 'Unknown'}
          </div>
          <div style={{ fontSize: '10px', color: '#666', marginTop: '4px' }}>
            Career Level {playerLevel} — {FLOOR_DEFINITIONS.find(f => f.id === currentFloor)?.theme}
          </div>
        </div>

        {/* Floor selection buttons */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          <div style={{ fontSize: '10px', color: '#666', marginBottom: '4px' }}>SELECT DESTINATION</div>

          {FLOOR_DEFINITIONS.map((floor) => {
            const isCurrent = floor.id === currentFloor;
            const isLocked = playerLevel < floor.requiredLevel;

            return (
              <button
                key={floor.id}
                onClick={() => !isCurrent && !isLocked && onSelectFloor(floor.id)}
                disabled={isCurrent || isLocked}
                style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                  padding: '12px 16px',
                  background: isCurrent
                    ? 'linear-gradient(90deg, #1a4a1a 0%, #0a2a0a 100%)'
                    : isLocked
                    ? 'linear-gradient(90deg, #1a1a1a 0%, #2a2a2a 100%)'
                    : 'linear-gradient(90deg, #1a1a2e 0%, #252540 100%)',
                  border: isCurrent ? '2px solid #00ff88' : isLocked ? '1px solid #444' : '1px solid #333',
                  borderRadius: '6px',
                  cursor: isCurrent || isLocked ? 'not-allowed' : 'pointer',
                  color: isCurrent ? '#00ff88' : isLocked ? '#555' : '#ccc',
                  fontFamily: "'Courier New', monospace", fontSize: '14px',
                  transition: 'all 0.2s ease',
                  opacity: isLocked ? 0.5 : 1,
                }}
                onMouseEnter={(e) => {
                  if (!isCurrent && !isLocked) {
                    e.currentTarget.style.background = 'linear-gradient(90deg, #252540 0%, #353560 100%)';
                    e.currentTarget.style.borderColor = '#0f4c75';
                    e.currentTarget.style.color = '#3498db';
                  }
                }}
                onMouseLeave={(e) => {
                  if (!isCurrent && !isLocked) {
                    e.currentTarget.style.background = 'linear-gradient(90deg, #1a1a2e 0%, #252540 100%)';
                    e.currentTarget.style.borderColor = '#333';
                    e.currentTarget.style.color = '#ccc';
                  }
                }}
              >
                <span style={{ fontWeight: 'bold' }}>{floor.label}</span>
                <span style={{ fontSize: '10px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  {isLocked ? (
                    <span style={{ color: '#ff4444', fontSize: '9px' }}>🔒 Lv{floor.requiredLevel}</span>
                  ) : isCurrent ? (
                    <span style={{ fontSize: '10px', background: '#00ff88', color: '#000', padding: '2px 8px', borderRadius: '4px' }}>HERE</span>
                  ) : (
                    <span style={{ color: '#666', fontSize: '9px' }}>Lv{floor.requiredLevel}</span>
                  )}
                </span>
              </button>
            );
          })}
        </div>

        {/* Close button */}
        <button
          onClick={onClose}
          style={{
            width: '100%', marginTop: '16px', padding: '10px',
            background: 'linear-gradient(90deg, #4a1a1a 0%, #2a0a0a 100%)',
            border: '1px solid #ff4444', borderRadius: '6px',
            color: '#ff6666', fontFamily: "'Courier New', monospace", fontSize: '12px', cursor: 'pointer',
          }}
          onMouseEnter={(e) => { e.currentTarget.style.background = 'linear-gradient(90deg, #5a2a2a 0%, #3a1a1a 100%)'; e.currentTarget.style.color = '#ff8888'; }}
          onMouseLeave={(e) => { e.currentTarget.style.background = 'linear-gradient(90deg, #4a1a1a 0%, #2a0a0a 100%)'; e.currentTarget.style.color = '#ff6666'; }}
        >
          CLOSE [ESC]
        </button>

        {/* Decorative LED */}
        <div style={{ position: 'absolute', top: '10px', right: '10px', width: '8px', height: '8px', borderRadius: '50%', background: '#00ff00', boxShadow: '0 0 10px #00ff00', animation: 'pulse 2s infinite' }} />
        <style>{`@keyframes pulse { 0%,100% { opacity:1 } 50% { opacity:0.5 } }`}</style>
      </div>
    </div>
  );
}

export default ElevatorPanel;
