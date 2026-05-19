import React from 'react';

interface StarRatingProps {
  rating: number; // 1-5
  size?: 'sm' | 'md' | 'lg';
}

export function StarRating({ rating, size = 'md' }: StarRatingProps) {
  const clamped = Math.max(1, Math.min(5, Math.round(rating)));
  const stars = Array.from({ length: 5 }, (_, i) => (
    <span key={i} className={i < clamped ? 'text-yellow-400' : 'text-gray-600'}>
      {i < clamped ? '\u2605' : '\u2606'}
    </span>
  ));
  const sizeClasses = { sm: 'text-xs', md: 'text-sm', lg: 'text-base' };
  return (
    <span className={`inline-flex items-center ${sizeClasses[size]}`}>
      {stars}
    </span>
  );
}

export default StarRating;
