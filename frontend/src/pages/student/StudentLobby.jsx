import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useSocket } from '../../context/SocketContext';
import { Radio, Users, CheckCircle2, Zap, Clock } from 'lucide-react';

export default function StudentLobby() {
  const { id: sessionId } = useParams();
  const { socket } = useSocket();
  const navigate = useNavigate();

  const [student, setStudent] = useState(() => {
    try {
      return JSON.parse(sessionStorage.getItem('liveclass_student') || '{}');
    } catch (_) {
      return {};
    }
  });

  const [session, setSession] = useState(() => {
    try {
      return JSON.parse(sessionStorage.getItem('liveclass_session') || '{}');
    } catch (_) {
      return {};
    }
  });

  const [totalOnline, setTotalOnline] = useState(1);

  useEffect(() => {
    if (!student.id || !sessionId) {
      navigate('/student/join');
      return;
    }

    if (!socket) return;

    socket.on('student_joined', ({ totalOnline: count }) => {
      setTotalOnline(count);
    });

    socket.on('student_left', ({ totalOnline: count }) => {
      setTotalOnline(count);
    });

    socket.on('question_started', () => {
      navigate(`/student/quiz/${sessionId}`);
    });

    return () => {
      socket.off('student_joined');
      socket.off('student_left');
      socket.off('question_started');
    };
  }, [socket, sessionId, student, navigate]);

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
      <div
        className="card card-gradient-border"
        style={{
          width: '100%',
          maxWidth: 500,
          padding: '40px 32px',
          textAlign: 'center'
        }}
      >
        {/* Animated Pulse Ring */}
        <div
          style={{
            width: 72,
            height: 72,
            borderRadius: '50%',
            background: 'rgba(99, 102, 241, 0.15)',
            border: '2px solid rgba(99, 102, 241, 0.4)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            margin: '0 auto 24px auto',
            animation: 'pulse-ring 2s infinite'
          }}
        >
          <Zap size={36} color="var(--accent-primary)" />
        </div>

        <div className="badge badge-success" style={{ marginBottom: 16 }}>
          ● Connected to Live Classroom
        </div>

        <h2 style={{ fontSize: 24, fontWeight: 800 }}>
          {session.quiz?.title || 'Live Classroom Quiz'}
        </h2>

        <p style={{ fontSize: 14, color: 'var(--text-secondary)', marginTop: 6, marginBottom: 24 }}>
          {session.quiz?.professor?.name ? `Professor ${session.quiz.professor.name}` : 'Waiting for professor to start question 1...'}
        </p>

        {/* Student Credential Badge */}
        <div
          style={{
            background: 'var(--bg-tertiary)',
            border: '1px solid var(--border-color)',
            borderRadius: 'var(--radius-md)',
            padding: 16,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            marginBottom: 24
          }}
        >
          <div style={{ textAlign: 'left' }}>
            <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-muted)' }}>CONNECTED AS:</span>
            <div style={{ fontSize: 15, fontWeight: 700 }}>{student.name}</div>
          </div>
          <div className="badge badge-primary">
            {student.rollNumber}
          </div>
        </div>

        {/* Live Lobby Count */}
        <div
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 8,
            fontSize: 13,
            fontWeight: 600,
            color: 'var(--text-secondary)'
          }}
        >
          <Users size={16} color="var(--accent-primary)" />
          <span>{totalOnline} student{totalOnline === 1 ? '' : 's'} waiting in lobby</span>
        </div>
      </div>
    </div>
  );
}
