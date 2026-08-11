import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Zap, Radio, User, CheckCircle2, ShieldAlert, Code2, Award, ArrowRight } from 'lucide-react';

export default function Home() {
  const [quizCode, setQuizCode] = useState('');
  const navigate = useNavigate();

  const handleJoin = (e) => {
    e.preventDefault();
    if (quizCode.trim()) {
      navigate(`/student/join?code=${quizCode.trim().toUpperCase()}`);
    }
  };

  return (
    <div className="main-content" style={{ paddingTop: 40, paddingBottom: 60 }}>
      {/* Hero Header */}
      <div style={{ textAlign: 'center', maxWidth: 850, margin: '0 auto 50px auto' }}>
        <div
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 8,
            padding: '6px 16px',
            borderRadius: 'var(--radius-full)',
            background: 'rgba(99, 102, 241, 0.15)',
            border: '1px solid rgba(99, 102, 241, 0.3)',
            color: '#818cf8',
            fontSize: 13,
            fontWeight: 700,
            marginBottom: 20
          }}
        >
          <Zap size={15} color="var(--accent-primary)" />
          <span>REAL-TIME CLASSROOM QUIZ & CODING PLATFORM</span>
        </div>

        <h1
          style={{
            fontSize: 'clamp(36px, 5vw, 56px)',
            fontWeight: 900,
            lineHeight: 1.15,
            marginBottom: 20,
            letterSpacing: '-0.03em'
          }}
        >
          Live Interactive Quizzes for{' '}
          <span
            style={{
              background: 'var(--accent-gradient)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent'
            }}
          >
            College Classrooms
          </span>
        </h1>

        <p
          style={{
            fontSize: 'clamp(16px, 2vw, 19px)',
            color: 'var(--text-secondary)',
            maxWidth: 680,
            margin: '0 auto 36px auto'
          }}
        >
          Conduct live interactive quizzes from any device. Millisecond-accurate answer ordering,
          sandboxed multi-language coding questions, live leaderboards, and zero lag.
        </p>

        {/* Action Cards Grid */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
            gap: 24,
            textAlign: 'left',
            marginTop: 30
          }}
        >
          {/* Student Join Card */}
          <div className="card card-gradient-border animate-fade-in" style={{ padding: 32 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 14 }}>
              <div
                style={{
                  width: 44,
                  height: 44,
                  borderRadius: 'var(--radius-md)',
                  background: 'rgba(16, 185, 129, 0.15)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}
              >
                <Radio size={24} color="var(--success)" />
              </div>
              <div>
                <h3 style={{ fontSize: 20, fontWeight: 700 }}>Students</h3>
                <p style={{ fontSize: 13, color: 'var(--text-muted)' }}>Join live session with quiz code</p>
              </div>
            </div>

            <form onSubmit={handleJoin} style={{ marginTop: 20 }}>
              <label style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-secondary)', display: 'block', marginBottom: 8 }}>
                ENTER 5-LETTER QUIZ CODE
              </label>
              <div style={{ display: 'flex', gap: 10 }}>
                <input
                  type="text"
                  placeholder="e.g. X7K92"
                  value={quizCode}
                  onChange={(e) => setQuizCode(e.target.value.toUpperCase())}
                  maxLength={6}
                  style={{
                    fontSize: 20,
                    fontWeight: 800,
                    letterSpacing: '0.15em',
                    textTransform: 'uppercase',
                    textAlign: 'center',
                    fontFamily: 'var(--font-mono)'
                  }}
                />
                <button type="submit" className="btn btn-primary" style={{ padding: '0 20px' }}>
                  <span>Join</span>
                  <ArrowRight size={18} />
                </button>
              </div>
            </form>
          </div>

          {/* Professor Portal Card */}
          <div className="card animate-fade-in" style={{ padding: 32, animationDelay: '0.1s' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 14 }}>
              <div
                style={{
                  width: 44,
                  height: 44,
                  borderRadius: 'var(--radius-md)',
                  background: 'rgba(99, 102, 241, 0.15)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}
              >
                <User size={24} color="var(--accent-primary)" />
              </div>
              <div>
                <h3 style={{ fontSize: 20, fontWeight: 700 }}>Professors</h3>
                <p style={{ fontSize: 13, color: 'var(--text-muted)' }}>Create quizzes & host live sessions</p>
              </div>
            </div>

            <p style={{ fontSize: 14, color: 'var(--text-secondary)', margin: '18px 0 24px 0' }}>
              Launch live question streams, track fastest submissions in real time, and export CSV analytics.
            </p>

            <button
              onClick={() => navigate('/professor/auth')}
              className="btn btn-secondary"
              style={{ width: '100%', padding: '12px', justifyContent: 'center' }}
            >
              <span>Professor Portal</span>
              <ArrowRight size={18} />
            </button>
          </div>
        </div>
      </div>

      {/* Feature Highlights Grid */}
      <div style={{ marginTop: 60 }}>
        <h2 style={{ textAlign: 'center', fontSize: 28, fontWeight: 800, marginBottom: 36 }}>
          Engineered for Real-Time College Classrooms
        </h2>

        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
            gap: 20
          }}
        >
          <div className="card">
            <Zap size={28} color="var(--accent-primary)" style={{ marginBottom: 14 }} />
            <h4 style={{ fontSize: 17, fontWeight: 700, marginBottom: 8 }}>Sub-Millisecond Order Tracking</h4>
            <p style={{ fontSize: 14, color: 'var(--text-secondary)' }}>
              Server-authoritative timestamps precisely distinguish who answered first vs who answered first correctly.
            </p>
          </div>

          <div className="card">
            <Code2 size={28} color="var(--success)" style={{ marginBottom: 14 }} />
            <h4 style={{ fontSize: 17, fontWeight: 700, marginBottom: 8 }}>Sandboxed Coding Questions</h4>
            <p style={{ fontSize: 14, color: 'var(--text-secondary)' }}>
              Evaluate Python, JavaScript, C, C++, and Java solutions securely against hidden test cases.
            </p>
          </div>

          <div className="card">
            <ShieldAlert size={28} color="var(--warning)" style={{ marginBottom: 14 }} />
            <h4 style={{ fontSize: 17, fontWeight: 700, marginBottom: 8 }}>Anti-Cheating Safeguards</h4>
            <p style={{ fontSize: 14, color: 'var(--text-secondary)' }}>
              One active session per roll number, live tab-switch alerts, copy protection, and instant submission locking.
            </p>
          </div>

          <div className="card">
            <Award size={28} color="#fbbf24" style={{ marginBottom: 14 }} />
            <h4 style={{ fontSize: 17, fontWeight: 700, marginBottom: 8 }}>Live Leaderboards & CSV Export</h4>
            <p style={{ fontSize: 14, color: 'var(--text-secondary)' }}>
              Dynamic live score updates, accuracy distributions, and single-click grading exports.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
