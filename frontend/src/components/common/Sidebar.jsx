import React from 'react';
import { NavLink } from 'react-router-dom';
import {
  LayoutDashboard,
  FolderKanban,
  PlusCircle,
  BarChart3,
  Users,
  Settings,
  Zap
} from 'lucide-react';

export default function Sidebar() {
  const navItems = [
    { label: 'Dashboard', path: '/professor/dashboard', icon: LayoutDashboard },
    { label: 'My Quizzes', path: '/professor/quizzes', icon: FolderKanban },
    { label: 'Create Quiz', path: '/professor/quizzes/create', icon: PlusCircle },
    { label: 'Analytics & Results', path: '/professor/results', icon: BarChart3 },
    { label: 'Settings', path: '/professor/settings', icon: Settings }
  ];

  return (
    <aside
      style={{
        width: 240,
        background: 'var(--bg-secondary)',
        borderRight: '1px solid var(--border-color)',
        padding: '24px 16px',
        display: 'flex',
        flexDirection: 'column',
        gap: 8,
        minHeight: 'calc(100vh - 65px)'
      }}
    >
      <div style={{ padding: '0 12px 16px 12px' }}>
        <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', color: 'var(--text-muted)', letterSpacing: '0.08em' }}>
          Professor Studio
        </div>
      </div>

      <nav style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        {navItems.map((item) => {
          const Icon = item.icon;
          return (
            <NavLink
              key={item.path}
              to={item.path}
              end={item.path === '/professor/dashboard'}
              style={({ isActive }) => ({
                display: 'flex',
                alignItems: 'center',
                gap: 12,
                padding: '10px 14px',
                borderRadius: 'var(--radius-md)',
                fontSize: 14,
                fontWeight: 600,
                color: isActive ? '#ffffff' : 'var(--text-secondary)',
                background: isActive ? 'var(--accent-gradient)' : 'transparent',
                boxShadow: isActive ? '0 4px 12px rgba(99, 102, 241, 0.3)' : 'none',
                transition: 'all 0.2s ease',
                textDecoration: 'none'
              })}
            >
              <Icon size={18} />
              <span>{item.label}</span>
            </NavLink>
          );
        })}
      </nav>

      <div style={{ marginTop: 'auto', padding: '16px 12px' }}>
        <div
          style={{
            background: 'var(--bg-tertiary)',
            border: '1px solid var(--border-color)',
            borderRadius: 'var(--radius-md)',
            padding: 14,
            display: 'flex',
            alignItems: 'center',
            gap: 10
          }}
        >
          <Zap size={20} color="var(--accent-primary)" />
          <div>
            <div style={{ fontSize: 12, fontWeight: 700 }}>Live Sync Mode</div>
            <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>Low latency active</div>
          </div>
        </div>
      </div>
    </aside>
  );
}
