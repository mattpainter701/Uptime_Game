import React from 'react';
import { StarRating } from './StarRating';

interface DifficultyBadgeProps {
  difficulty: number;
}

function getBadgeColor(d: number): string {
  if (d <= 2) return 'bg-green-600 text-white';
  if (d === 3) return 'bg-yellow-500 text-gray-900';
  return 'bg-red-600 text-white';
}

function getLevelRange(d: number): string {
  if (d >= 5) return 'Lvl 5';
  return `Lvl ${d}-${d + 1}`;
}

export function DifficultyBadge({ difficulty }: DifficultyBadgeProps) {
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${getBadgeColor(difficulty)}`}>
      <StarRating rating={difficulty} size="sm" />
      <span>{getLevelRange(difficulty)}</span>
    </span>
  );
}

export default DifficultyBadge;
