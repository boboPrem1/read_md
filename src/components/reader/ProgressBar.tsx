'use client';

import React from 'react';

export interface ProgressBarProps {
  progressPercent: number;
  className?: string;
}

export function ProgressBar({ progressPercent, className = '' }: ProgressBarProps) {
  const clamped = Math.max(0, Math.min(100, Math.round(progressPercent)));

  return (
    <div
      className={`reading-line ${className}`.trim()}
      role="progressbar"
      aria-label="Progression de lecture"
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={clamped}
    >
      <div
        id="progressFill"
        className="reading-line-fill"
        style={{ width: `${clamped}%` }}
      />
    </div>
  );
}

export default ProgressBar;
