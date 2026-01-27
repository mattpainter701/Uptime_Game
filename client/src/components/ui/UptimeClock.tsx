/**
 * UptimeClock - Real-time uptime display component
 *
 * Shows session duration, node status, uptime percentage, and points.
 */

import { useEffect, useState } from 'react';
import type { NodeUptimeStats } from '../../services/api';

interface UptimeClockProps {
  sessionId: string | null;
  isTracking: boolean;
  startedAt: number | null;
  nodes: Record<number, NodeUptimeStats>;
  uptimePercentage: number;
  pointsEarned: number;
  totalIncidents: number;
}

export function UptimeClock({
  sessionId,
  isTracking,
  startedAt,
  nodes,
  uptimePercentage,
  pointsEarned,
  totalIncidents,
}: UptimeClockProps) {
  const [elapsedTime, setElapsedTime] = useState(0);

  // Update elapsed time every second
  useEffect(() => {
    if (!isTracking || !startedAt) {
      setElapsedTime(0);
      return;
    }

    const interval = setInterval(() => {
      setElapsedTime(Math.floor((Date.now() - startedAt) / 1000));
    }, 1000);

    return () => clearInterval(interval);
  }, [isTracking, startedAt]);

  // Format time as HH:MM:SS
  const formatTime = (seconds: number) => {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = seconds % 60;
    return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  // Get color based on uptime percentage
  const getUptimeColor = (percentage: number) => {
    if (percentage >= 99) return 'text-green-400';
    if (percentage >= 95) return 'text-yellow-400';
    return 'text-red-400';
  };

  // Get progress bar color
  const getProgressColor = (percentage: number) => {
    if (percentage >= 99) return 'bg-green-500';
    if (percentage >= 95) return 'bg-yellow-500';
    return 'bg-red-500';
  };

  if (!isTracking) {
    return null;
  }

  const nodeList = Object.values(nodes);
  const allNodesUp = nodeList.every(n => n.is_responsive);

  return (
    <div className={`
      bg-gray-900/90 border border-cyan-500/50 rounded-lg p-4
      backdrop-blur-sm shadow-lg shadow-cyan-500/20
      ${allNodesUp ? 'animate-pulse-subtle' : ''}
    `}>
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-cyan-400 text-sm font-bold tracking-wider">
          UPTIME SESSION
        </h3>
        <div className={`
          w-2 h-2 rounded-full
          ${allNodesUp ? 'bg-green-400 animate-pulse' : 'bg-red-400'}
        `} />
      </div>

      {/* Divider */}
      <div className="h-px bg-gradient-to-r from-transparent via-cyan-500 to-transparent mb-4" />

      {/* Main Clock */}
      <div className="text-center mb-4">
        <div className="text-4xl font-mono font-bold text-white tracking-widest">
          {formatTime(elapsedTime)}
        </div>
      </div>

      {/* Node Status */}
      <div className="flex flex-wrap gap-2 justify-center mb-4">
        {nodeList.map((node) => (
          <div
            key={node.node_id}
            className="flex items-center gap-1 bg-gray-800 px-2 py-1 rounded"
            title={`${node.node_name}: ${node.is_responsive ? 'UP' : 'DOWN'}`}
          >
            <div className={`
              w-2 h-2 rounded-sm
              ${node.is_responsive ? 'bg-green-400' : 'bg-gray-600'}
            `} />
            <span className="text-xs text-gray-300">{node.node_name}</span>
          </div>
        ))}
      </div>

      {/* Stats */}
      <div className="flex justify-between items-center mb-3">
        <div className="text-sm">
          <span className="text-gray-400">UPTIME: </span>
          <span className={`font-bold ${getUptimeColor(uptimePercentage)}`}>
            {uptimePercentage.toFixed(1)}%
          </span>
        </div>
        <div className="text-sm">
          <span className="text-gray-400">POINTS: </span>
          <span className="font-bold text-green-400">+{pointsEarned.toLocaleString()}</span>
        </div>
      </div>

      {/* Progress Bar */}
      <div className="h-2 bg-gray-800 rounded-full overflow-hidden">
        <div
          className={`h-full transition-all duration-500 ${getProgressColor(uptimePercentage)}`}
          style={{ width: `${uptimePercentage}%` }}
        />
      </div>

      {/* Incidents */}
      {totalIncidents > 0 && (
        <div className="mt-3 text-center">
          <span className="text-xs text-red-400">
            {totalIncidents} incident{totalIncidents > 1 ? 's' : ''} detected
          </span>
        </div>
      )}
    </div>
  );
}

// Mini version for HUD
export function UptimeClockMini({
  isTracking,
  startedAt,
  uptimePercentage,
  pointsEarned,
}: Pick<UptimeClockProps, 'isTracking' | 'startedAt' | 'uptimePercentage' | 'pointsEarned'>) {
  const [elapsedTime, setElapsedTime] = useState(0);

  useEffect(() => {
    if (!isTracking || !startedAt) {
      setElapsedTime(0);
      return;
    }

    const interval = setInterval(() => {
      setElapsedTime(Math.floor((Date.now() - startedAt) / 1000));
    }, 1000);

    return () => clearInterval(interval);
  }, [isTracking, startedAt]);

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${s.toString().padStart(2, '0')}`;
  };

  if (!isTracking) return null;

  const uptimeColor = uptimePercentage >= 99 ? 'text-green-400' : uptimePercentage >= 95 ? 'text-yellow-400' : 'text-red-400';

  return (
    <div className="flex items-center gap-3 bg-gray-900/80 px-3 py-1.5 rounded border border-cyan-500/30">
      <div className="text-sm font-mono text-white">{formatTime(elapsedTime)}</div>
      <div className="w-px h-4 bg-gray-600" />
      <div className={`text-sm font-bold ${uptimeColor}`}>{uptimePercentage.toFixed(0)}%</div>
      <div className="w-px h-4 bg-gray-600" />
      <div className="text-sm text-green-400">+{pointsEarned}</div>
    </div>
  );
}

export default UptimeClock;
