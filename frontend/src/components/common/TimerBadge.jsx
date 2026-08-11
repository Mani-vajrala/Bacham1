import React from 'react';
import { Clock, AlertTriangle } from 'lucide-react';

export default function TimerBadge({ remainingSec, totalSec = 30, isPaused = false }) {
  const percentage = Math.max(0, Math.min(100, (remainingSec / totalSec) * 100));

  const formatTime = (secs) => {
    const s = Math.max(0, secs);
    const mins = Math.floor(s / 60);
    const rem = s % 60;
    return `${mins.toString().padStart(2, '0')}:${rem.toString().padStart(2, '0')}`;
  };

  let color = 'var(--accent-primary)';
  let bg = 'rgba(99, 102, 241, 0.15)';
  let border = 'rgba(99, 102, 241, 0.4)';

  if (remainingSec <= 5) {
    color = 'var(--danger)';
    bg = 'var(--danger-bg)';
    border = 'var(--danger-border)';
  } else if (remainingSec <= 10) {
    color = 'var(--warning)';
    bg = 'var(--warning-bg)';
    border = 'var(--warning-border)';
  } else {
    color = 'var(--success)';
    bg = 'var(--success-bg)';
    border = 'var(--success-border)';
  }

  return (
    <div
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 10,
        padding: '8px 16px',
        borderRadius: 'var(--radius-full)',
        background: bg,
        border: `1.5px solid ${border}`,
        color: color,
        boxShadow: remainingSec <= 5 ? '0 0 16px rgba(244, 63, 94, 0.4)' : 'none',
        transition: 'all 0.3s ease',
        animation: remainingSec <= 5 && remainingSec > 0 ? 'pulse-ring 1s infinite' : 'none'
      }}
    >
      {remainingSec <= 5 ? (
        <AlertTriangle size={18} color={color} />
      ) : (
        <Clock size={18} color={color} />
      )}

      <span
        style={{
          fontFamily: 'var(--font-mono)',
          fontSize: 18,
          fontWeight: 700,
          letterSpacing: '0.05em'
        }}
      >
        {isPaused ? 'PAUSED' : formatTime(remainingSec)}
      </span>

      {/* Mini Progress Bar */}
      <div
        style={{
          width: 50,
          height: 6,
          background: 'rgba(255, 255, 255, 0.15)',
          borderRadius: 3,
          overflow: 'hidden'
        }}
      >
        <div
          style={{
            width: `${percentage}%`,
            height: '100%',
            background: color,
            transition: 'width 1s linear'
          }}
        />
      </div>
    </div>
  );
}
