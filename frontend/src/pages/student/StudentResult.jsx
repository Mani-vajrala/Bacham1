import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { Award, CheckCircle2, XCircle, Clock, Home, Zap, Loader2 } from 'lucide-react';
import { API_BASE } from '../../config';

export default function StudentResult() {
  const { id: sessionId } = useParams();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  const student = (() => {
    try {
      return JSON.parse(sessionStorage.getItem('liveclass_student') || '{}');
    } catch (_) {
      return {};
    }
  })();

  useEffect(() => {
    fetch(`${API_BASE}/sessions/${sessionId}/results`)
      .then((res) => res.json())
      .then((resData) => {
        setData(resData);
      })
      .catch((err) => console.error(err))
      .finally(() => setLoading(false));
  }, [sessionId]);

  const studentResult = data?.leaderboard?.find(
    (l) => l.studentSessionId === student.id || l.rollNumber === student.rollNumber
  );

  return (
    <div className="main-content" style={{ maxWidth: 750, padding: '30px 16px 60px 16px' }}>
      {loading ? (
        <div style={{ textAlign: 'center', padding: 80, color: 'var(--text-muted)' }}>
          <Loader2 size={32} className="animate-spin" style={{ margin: '0 auto 16px auto' }} />
          Loading your scorecard...
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
          {/* Top Score Banner */}
          <div className="card card-gradient-border" style={{ textAlign: 'center', padding: 36 }}>
            <div
              style={{
                width: 64,
                height: 64,
                borderRadius: '50%',
                background: 'rgba(251, 191, 36, 0.15)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                margin: '0 auto 16px auto'
              }}
            >
              <Award size={36} color="#fbbf24" />
            </div>

            <h2 style={{ fontSize: 26, fontWeight: 800 }}>Quiz Completed!</h2>
            <p style={{ fontSize: 14, color: 'var(--text-secondary)', marginTop: 4 }}>
              Great effort, <strong>{student.name || 'Student'}</strong> ({student.rollNumber})
            </p>

            {/* Score Stats Grid */}
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))',
                gap: 12,
                marginTop: 28
              }}
            >
              <div style={{ background: 'var(--bg-tertiary)', padding: 14, borderRadius: 'var(--radius-md)' }}>
                <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-muted)' }}>FINAL RANK</span>
                <div style={{ fontSize: 24, fontWeight: 900, color: '#fbbf24' }}>
                  {studentResult?.rank ? `#${studentResult.rank}` : 'Completed'}
                </div>
              </div>

              <div style={{ background: 'var(--bg-tertiary)', padding: 14, borderRadius: 'var(--radius-md)' }}>
                <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-muted)' }}>SCORE</span>
                <div style={{ fontSize: 24, fontWeight: 900, color: 'var(--accent-primary)' }}>
                  {studentResult?.totalScore || 0} pts
                </div>
              </div>

              <div style={{ background: 'var(--bg-tertiary)', padding: 14, borderRadius: 'var(--radius-md)' }}>
                <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-muted)' }}>CORRECT</span>
                <div style={{ fontSize: 24, fontWeight: 900, color: 'var(--success)' }}>
                  {studentResult?.totalCorrect || 0}
                </div>
              </div>

              <div style={{ background: 'var(--bg-tertiary)', padding: 14, borderRadius: 'var(--radius-md)' }}>
                <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-muted)' }}>AVG SPEED</span>
                <div style={{ fontSize: 24, fontWeight: 900, color: 'var(--text-primary)' }}>
                  ⚡ {studentResult?.avgResponseTimeSec || 0}s
                </div>
              </div>
            </div>
          </div>

          {/* Question Explanations Review */}
          <div className="card" style={{ padding: 24 }}>
            <h3 style={{ fontSize: 18, fontWeight: 800, marginBottom: 16 }}>Question Solutions & Explanations</h3>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              {data?.questionStats?.map((q, idx) => (
                <div
                  key={q.questionId || idx}
                  style={{
                    background: 'var(--bg-tertiary)',
                    borderRadius: 'var(--radius-md)',
                    padding: 16,
                    border: '1px solid var(--border-color)'
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
                    <span className="badge badge-primary">Question {q.questionIndex}</span>
                    <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>{q.accuracy}% Class Accuracy</span>
                  </div>
                  <p style={{ fontSize: 14, fontWeight: 600 }}>{q.text}</p>
                </div>
              ))}
            </div>
          </div>

          <Link to="/" className="btn btn-secondary" style={{ alignSelf: 'center', padding: '12px 24px' }}>
            <Home size={18} />
            <span>Return to Home</span>
          </Link>
        </div>
      )}
    </div>
  );
}
