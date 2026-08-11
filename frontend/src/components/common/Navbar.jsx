import React from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import { useSocket } from '../../context/SocketContext';
import {
  Zap,
  Moon,
  Sun,
  LogOut,
  User,
  PlusCircle,
  LayoutDashboard,
  Radio,
  BookOpen
} from 'lucide-react';

export default function Navbar() {
  const { professor, logout, isAuthenticated } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const { isConnected } = useSocket();
  const navigate = useNavigate();
  const location = useLocation();

  const isStudentView = location.pathname.startsWith('/student');

  return (
    <nav
      style={{
        background: 'var(--bg-secondary)',
        borderBottom: '1px solid var(--border-color)',
        padding: '12px 24px',
        position: 'sticky',
        top: 0,
        zIndex: 50,
        backdropFilter: 'blur(12px)'
      }}
    >
      <div
        style={{
          maxWidth: 1300,
          margin: '0 auto',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between'
        }}
      >
        {/* Brand Logo */}
        <Link
          to="/"
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 10,
            textDecoration: 'none'
          }}
        >
          <div
            style={{
              width: 38,
              height: 38,
              borderRadius: 'var(--radius-md)',
              background: 'var(--accent-gradient)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: 'var(--accent-glow)'
            }}
          >
            <Zap size={22} color="#ffffff" />
          </div>
          <div>
            <span
              style={{
                fontFamily: 'var(--font-display)',
                fontSize: 20,
                fontWeight: 800,
                background: 'var(--accent-gradient)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent'
              }}
            >
              LiveClass
            </span>
            <span
              style={{
                fontFamily: 'var(--font-display)',
                fontSize: 20,
                fontWeight: 800,
                marginLeft: 4,
                color: 'var(--text-primary)'
              }}
            >
              Quiz
            </span>
          </div>
        </Link>

        {/* Live Status indicator */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              fontSize: 12,
              fontWeight: 600,
              padding: '4px 10px',
              borderRadius: 'var(--radius-full)',
              background: isConnected ? 'var(--success-bg)' : 'var(--danger-bg)',
              color: isConnected ? 'var(--success)' : 'var(--danger)',
              border: `1px solid ${isConnected ? 'var(--success-border)' : 'var(--danger-border)'}`
            }}
          >
            <span
              style={{
                width: 7,
                height: 7,
                borderRadius: '50%',
                backgroundColor: isConnected ? 'var(--success)' : 'var(--danger)'
              }}
            />
            {isConnected ? 'Real-Time Sync Active' : 'Connecting...'}
          </div>

          {/* Theme Toggle Button */}
          <button
            onClick={toggleTheme}
            className="btn btn-secondary btn-icon"
            title="Toggle Dark/Light Mode"
            style={{ width: 38, height: 38 }}
          >
            {theme === 'dark' ? <Sun size={18} color="#f59e0b" /> : <Moon size={18} color="#6366f1" />}
          </button>

          {/* Professor Quick Nav / Student link */}
          {isAuthenticated ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <Link to="/professor/dashboard" className="btn btn-secondary btn-sm">
                <LayoutDashboard size={16} />
                <span className="hide-mobile">Dashboard</span>
              </Link>
              <Link to="/professor/quizzes/create" className="btn btn-primary btn-sm">
                <PlusCircle size={16} />
                <span className="hide-mobile">New Quiz</span>
              </Link>
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                  padding: '4px 10px',
                  background: 'var(--bg-tertiary)',
                  borderRadius: 'var(--radius-full)',
                  border: '1px solid var(--border-color)'
                }}
              >
                <User size={15} color="var(--accent-primary)" />
                <span style={{ fontSize: 13, fontWeight: 600 }}>{professor?.name?.split(' ')[0]}</span>
                <button
                  onClick={() => {
                    logout();
                    navigate('/');
                  }}
                  title="Logout"
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    padding: 4,
                    color: 'var(--text-muted)'
                  }}
                >
                  <LogOut size={14} />
                </button>
              </div>
            </div>
          ) : !isStudentView ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <Link to="/student/join" className="btn btn-secondary btn-sm">
                <Radio size={16} color="var(--accent-primary)" />
                <span>Join Quiz</span>
              </Link>
              <Link to="/professor/auth" className="btn btn-primary btn-sm">
                <User size={16} />
                <span>Professor Login</span>
              </Link>
            </div>
          ) : (
            <Link to="/" className="btn btn-secondary btn-sm">
              <BookOpen size={16} />
              <span>Home</span>
            </Link>
          )}
        </div>
      </div>
    </nav>
  );
}
