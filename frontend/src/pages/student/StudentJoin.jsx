import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useSocket } from '../../context/SocketContext';
import { Radio, User, Hash, ArrowRight, AlertCircle, Loader2, Zap } from 'lucide-react';

export default function StudentJoin() {
  const [searchParams] = useSearchParams();
  const [code, setCode] = useState(searchParams.get('code') || '');
  const [name, setName] = useState('');
  const [rollNumber, setRollNumber] = useState('');
  const [error, setError] = useState('');
  const [joining, setJoining] = useState(false);

  const { socket, isConnected } = useSocket();
  const navigate = useNavigate();

  useEffect(() => {
    if (searchParams.get('code')) {
      setCode(searchParams.get('code').toUpperCase());
    }
  }, [searchParams]);

  useEffect(() => {
    if (!socket) return;

    socket.on('join_success', ({ student, session, activeQuestion }) => {
      // Store student details in sessionStorage
      sessionStorage.setItem('liveclass_student', JSON.stringify(student));
      sessionStorage.setItem('liveclass_session', JSON.stringify(session));

      if (session.status === 'ACTIVE' && activeQuestion) {
        navigate(`/student/quiz/${session.id}`);
      } else {
        navigate(`/student/lobby/${session.id}`);
      }
    });

    socket.on('join_error', ({ message }) => {
      setError(message);
      setJoining(false);
    });

    return () => {
      socket.off('join_success');
      socket.off('join_error');
    };
  }, [socket, navigate]);

  const handleSubmit = (e) => {
    e.preventDefault();
    setError('');

    const cleanCode = code.trim().toUpperCase();
    const cleanName = name.trim();
    const cleanRoll = rollNumber.trim().toUpperCase();

    if (!cleanCode || !cleanName || !cleanRoll) {
      return setError('Please provide Quiz Code, Name, and Roll Number.');
    }

    if (!socket || !isConnected) {
      return setError('Connecting to live server, please wait a moment...');
    }

    setJoining(true);
    socket.emit('student:join', {
      code: cleanCode,
      name: cleanName,
      rollNumber: cleanRoll
    });
  };

  return (
    <div
      className="main-content"
      style={{
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        minHeight: 'calc(100vh - 120px)',
        padding: '20px 16px'
      }}
    >
      <div className="card card-gradient-border" style={{ width: '100%', maxWidth: 440, padding: 32 }}>
        {/* Header */}
        <div style={{ textAlign: 'center', marginBottom: 26 }}>
          <div
            style={{
              width: 52,
              height: 52,
              borderRadius: 'var(--radius-lg)',
              background: 'rgba(16, 185, 129, 0.15)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 16px auto'
            }}
          >
            <Radio size={26} color="var(--success)" />
          </div>
          <h2 style={{ fontSize: 24, fontWeight: 800 }}>Join Live Quiz</h2>
          <p style={{ fontSize: 13, color: 'var(--text-secondary)', marginTop: 4 }}>
            Enter your college credentials to connect to the live classroom
          </p>
        </div>

        {error && (
          <div
            style={{
              padding: '10px 14px',
              borderRadius: 'var(--radius-md)',
              background: 'var(--danger-bg)',
              border: '1px solid var(--danger-border)',
              color: 'var(--danger)',
              fontSize: 13,
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              marginBottom: 16
            }}
          >
            <AlertCircle size={16} />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {/* Quiz Code */}
          <div>
            <label style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-secondary)', marginBottom: 6, display: 'block' }}>
              5-LETTER QUIZ CODE *
            </label>
            <div style={{ position: 'relative' }}>
              <Zap size={18} color="var(--accent-primary)" style={{ position: 'absolute', left: 14, top: 13 }} />
              <input
                type="text"
                required
                maxLength={6}
                placeholder="e.g. X7K92"
                value={code}
                onChange={(e) => setCode(e.target.value.toUpperCase())}
                style={{
                  paddingLeft: 42,
                  fontFamily: 'var(--font-mono)',
                  fontSize: 18,
                  fontWeight: 800,
                  letterSpacing: '0.12em',
                  textTransform: 'uppercase'
                }}
              />
            </div>
          </div>

          {/* Student Name */}
          <div>
            <label style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-secondary)', marginBottom: 6, display: 'block' }}>
              YOUR FULL NAME *
            </label>
            <div style={{ position: 'relative' }}>
              <User size={18} color="var(--text-muted)" style={{ position: 'absolute', left: 14, top: 13 }} />
              <input
                type="text"
                required
                placeholder="e.g. Rahul Sharma"
                value={name}
                onChange={(e) => setName(e.target.value)}
                style={{ paddingLeft: 42, fontSize: 15 }}
              />
            </div>
          </div>

          {/* Roll Number */}
          <div>
            <label style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-secondary)', marginBottom: 6, display: 'block' }}>
              ROLL NUMBER / STUDENT ID *
            </label>
            <div style={{ position: 'relative' }}>
              <Hash size={18} color="var(--text-muted)" style={{ position: 'absolute', left: 14, top: 13 }} />
              <input
                type="text"
                required
                placeholder="e.g. 21CS042"
                value={rollNumber}
                onChange={(e) => setRollNumber(e.target.value.toUpperCase())}
                style={{
                  paddingLeft: 42,
                  fontFamily: 'var(--font-mono)',
                  fontSize: 15,
                  fontWeight: 700,
                  textTransform: 'uppercase'
                }}
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={joining}
            className="btn btn-primary btn-lg"
            style={{ width: '100%', marginTop: 8 }}
          >
            {joining ? (
              <Loader2 size={20} className="animate-spin" />
            ) : (
              <>
                <span>Enter Classroom</span>
                <ArrowRight size={18} />
              </>
            )}
          </button>
        </form>
      </div>
    </div>
  );
}
