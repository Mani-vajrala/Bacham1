import React, { useEffect } from 'react';
import confetti from 'canvas-confetti';
import { Trophy, Award, Medal, Zap } from 'lucide-react';

export default function Podium({ topThree = [] }) {
  const first = topThree[0];
  const second = topThree[1];
  const third = topThree[2];

  useEffect(() => {
    if (first) {
      confetti({
        particleCount: 80,
        spread: 70,
        origin: { y: 0.6 }
      });
    }
  }, [first]);

  return (
    <div className="podium-container">
      {/* 2nd Place (Silver) */}
      <div className="podium-col animate-fade-in" style={{ animationDelay: '0.1s' }}>
        {second ? (
          <div style={{ textAlign: 'center', marginBottom: 8 }}>
            <div style={{ fontSize: 24 }}>🥈</div>
            <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-primary)' }}>
              {second.name}
            </div>
            <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>
              {second.rollNumber} • {second.totalScore} pts
            </div>
          </div>
        ) : (
          <div style={{ height: 40 }} />
        )}
        <div className="podium-box podium-2">2</div>
      </div>

      {/* 1st Place (Gold) */}
      <div className="podium-col animate-fade-in" style={{ animationDelay: '0s' }}>
        {first ? (
          <div style={{ textAlign: 'center', marginBottom: 8 }}>
            <div style={{ fontSize: 32 }}>👑</div>
            <div
              style={{
                fontSize: 16,
                fontWeight: 800,
                color: '#fbbf24',
                textShadow: '0 0 12px rgba(251, 191, 36, 0.4)'
              }}
            >
              {first.name}
            </div>
            <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)' }}>
              {first.rollNumber} • {first.totalScore} pts
            </div>
            <div style={{ fontSize: 11, color: '#10b981', fontWeight: 600 }}>
              ⚡ {first.avgResponseTimeSec || 0}s avg
            </div>
          </div>
        ) : (
          <div style={{ height: 60 }} />
        )}
        <div className="podium-box podium-1">1</div>
      </div>

      {/* 3rd Place (Bronze) */}
      <div className="podium-col animate-fade-in" style={{ animationDelay: '0.2s' }}>
        {third ? (
          <div style={{ textAlign: 'center', marginBottom: 8 }}>
            <div style={{ fontSize: 24 }}>🥉</div>
            <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-primary)' }}>
              {third.name}
            </div>
            <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>
              {third.rollNumber} • {third.totalScore} pts
            </div>
          </div>
        ) : (
          <div style={{ height: 30 }} />
        )}
        <div className="podium-box podium-3">3</div>
      </div>
    </div>
  );
}
