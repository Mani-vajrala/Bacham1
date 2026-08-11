import React from 'react';
import { CheckCircle2, AlertCircle, Info, X } from 'lucide-react';

export default function Toast({ message, type = 'success', onClose }) {
  if (!message) return null;

  const icons = {
    success: <CheckCircle2 size={18} color="var(--success)" />,
    error: <AlertCircle size={18} color="var(--danger)" />,
    info: <Info size={18} color="var(--info)" />
  };

  return (
    <div
      style={{
        position: 'fixed',
        bottom: 24,
        right: 24,
        zIndex: 110,
        display: 'flex',
        alignItems: 'center',
        gap: 12,
        padding: '12px 18px',
        background: 'var(--bg-secondary)',
        border: '1px solid var(--border-color)',
        borderRadius: 'var(--radius-md)',
        boxShadow: 'var(--shadow-xl)',
        animation: 'slideInRight 0.3s ease-out'
      }}
    >
      {icons[type] || icons.info}
      <span style={{ fontSize: 14, fontWeight: 600 }}>{message}</span>
      {onClose && (
        <button onClick={onClose} style={{ marginLeft: 8, color: 'var(--text-muted)' }}>
          <X size={16} />
        </button>
      )}
    </div>
  );
}
