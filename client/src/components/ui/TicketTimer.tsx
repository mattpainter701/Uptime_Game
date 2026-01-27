/**
 * TicketTimer - Countdown timer for active tickets
 *
 * Shows remaining time with color-coded urgency.
 */

import { useEffect, useState, useCallback } from 'react';

interface TicketTimerProps {
  timeLimit: number; // in minutes
  startedAt: number; // timestamp in ms
  onTimeUp?: () => void;
  enforceTimeLimit?: boolean;
}

export function TicketTimer({
  timeLimit,
  startedAt,
  onTimeUp,
  enforceTimeLimit = true,
}: TicketTimerProps) {
  const totalSeconds = timeLimit * 60;
  const [remainingSeconds, setRemainingSeconds] = useState(totalSeconds);
  const [isWarning, setIsWarning] = useState(false);
  const [isCritical, setIsCritical] = useState(false);

  const calculateRemaining = useCallback(() => {
    const elapsed = Math.floor((Date.now() - startedAt) / 1000);
    return Math.max(0, totalSeconds - elapsed);
  }, [startedAt, totalSeconds]);

  useEffect(() => {
    setRemainingSeconds(calculateRemaining());

    const interval = setInterval(() => {
      const remaining = calculateRemaining();
      setRemainingSeconds(remaining);

      // Set warning states
      const percentRemaining = (remaining / totalSeconds) * 100;
      setIsWarning(percentRemaining <= 30 && percentRemaining > 10);
      setIsCritical(percentRemaining <= 10);

      // Time's up
      if (remaining <= 0 && enforceTimeLimit) {
        onTimeUp?.();
        clearInterval(interval);
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [calculateRemaining, totalSeconds, enforceTimeLimit, onTimeUp]);

  // Format as MM:SS
  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  // Get display color
  const getColorClass = () => {
    if (isCritical) return 'text-red-500';
    if (isWarning) return 'text-yellow-400';
    return 'text-green-400';
  };

  // Get background color
  const getBgColorClass = () => {
    if (isCritical) return 'bg-red-500/20 border-red-500/50';
    if (isWarning) return 'bg-yellow-500/20 border-yellow-500/50';
    return 'bg-gray-800/50 border-gray-600/50';
  };

  // Calculate progress
  const progressPercent = (remainingSeconds / totalSeconds) * 100;

  return (
    <div className={`
      relative overflow-hidden rounded-lg border p-3
      ${getBgColorClass()}
      ${isCritical ? 'animate-pulse' : ''}
    `}>
      {/* Progress bar background */}
      <div
        className={`
          absolute inset-0 opacity-20 transition-all duration-1000
          ${isCritical ? 'bg-red-500' : isWarning ? 'bg-yellow-500' : 'bg-green-500'}
        `}
        style={{ width: `${progressPercent}%` }}
      />

      {/* Content */}
      <div className="relative flex items-center justify-between">
        <div className="flex items-center gap-2">
          <svg
            className={`w-4 h-4 ${getColorClass()}`}
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
            />
          </svg>
          <span className="text-gray-400 text-sm">TIME</span>
        </div>

        <div className={`font-mono text-xl font-bold ${getColorClass()}`}>
          {formatTime(remainingSeconds)}
        </div>
      </div>

      {/* Warning text */}
      {isCritical && remainingSeconds > 0 && (
        <div className="relative mt-2 text-center text-xs text-red-400 animate-bounce">
          HURRY! Time running out!
        </div>
      )}

      {remainingSeconds <= 0 && (
        <div className="relative mt-2 text-center text-xs text-red-500 font-bold">
          TIME'S UP!
        </div>
      )}
    </div>
  );
}

// Compact version for HUD
export function TicketTimerMini({
  timeLimit,
  startedAt,
}: Pick<TicketTimerProps, 'timeLimit' | 'startedAt'>) {
  const totalSeconds = timeLimit * 60;
  const [remainingSeconds, setRemainingSeconds] = useState(totalSeconds);

  useEffect(() => {
    const elapsed = Math.floor((Date.now() - startedAt) / 1000);
    setRemainingSeconds(Math.max(0, totalSeconds - elapsed));

    const interval = setInterval(() => {
      const elapsed = Math.floor((Date.now() - startedAt) / 1000);
      setRemainingSeconds(Math.max(0, totalSeconds - elapsed));
    }, 1000);

    return () => clearInterval(interval);
  }, [startedAt, totalSeconds]);

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${s.toString().padStart(2, '0')}`;
  };

  const percentRemaining = (remainingSeconds / totalSeconds) * 100;
  const colorClass = percentRemaining <= 10 ? 'text-red-500' : percentRemaining <= 30 ? 'text-yellow-400' : 'text-gray-300';

  return (
    <div className={`font-mono text-sm ${colorClass}`}>
      {formatTime(remainingSeconds)}
    </div>
  );
}

export default TicketTimer;
