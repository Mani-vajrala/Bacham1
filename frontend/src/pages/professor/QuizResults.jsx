import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import Sidebar from '../../components/common/Sidebar';
import Podium from '../../components/common/Podium';
import { useAuth } from '../../context/AuthContext';
import { API_BASE } from '../../config';
import {
  Download,
  Award,
  Users,
  TrendingUp,
  Clock,
  ArrowLeft,
  CheckCircle2,
  XCircle,
  HelpCircle,
  Loader2,
  FileSpreadsheet
} from 'lucide-react';

export default function QuizResults() {
  const { id: sessionId } = useParams();
  const { token } = useAuth();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [downloading, setDownloading] = useState(false);

  useEffect(() => {
    fetchResults();
  }, [sessionId]);

  const fetchResults = async () => {
    try {
      const res = await fetch(`${API_BASE}/sessions/${sessionId}/results`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const resData = await res.json();
      if (res.ok) {
        setData(resData);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleDownloadCsv = async () => {
    setDownloading(true);
    try {
      const res = await fetch(`${API_BASE}/sessions/${sessionId}/export-csv`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `quiz_results_${sessionId}.csv`;
      document.body.appendChild(a);
      a.click();
      a.remove();
    } catch (err) {
      alert('CSV export failed: ' + err.message);
    } finally {
      setDownloading(false);
    }
  };

  const leaderboard = data?.leaderboard || [];
  const topThree = leaderboard.slice(0, 3);
  const summary = data?.summary || {};
  const questionStats = data?.questionStats || [];

  return (
    <div style={{ display: 'flex' }}>
      <Sidebar />

      <main style={{ flex: 1, padding: '32px 36px', overflowY: 'auto' }}>
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 28, flexWrap: 'wrap', gap: 16 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
            <Link to="/professor/dashboard" className="btn btn-secondary btn-icon">
              <ArrowLeft size={18} />
            </Link>
            <div>
              <h1 style={{ fontSize: 28, fontWeight: 800 }}>Quiz Results & Analytics</h1>
              <p style={{ fontSize: 14, color: 'var(--text-secondary)' }}>
                {data?.session?.quizTitle || 'Live Quiz'} • Session PIN: <strong>{data?.session?.code}</strong>
              </p>
            </div>
          </div>

          <button
            onClick={handleDownloadCsv}
            disabled={downloading || leaderboard.length === 0}
            className="btn btn-primary"
            style={{ background: '#10b981', borderColor: '#059669' }}
          >
            {downloading ? <Loader2 size={18} className="animate-spin" /> : <FileSpreadsheet size={18} />}
            <span>Export Results as CSV</span>
          </button>
        </div>

        {loading ? (
          <div style={{ padding: 80, textAlign: 'center', color: 'var(--text-muted)' }}>
            <Loader2 size={32} className="animate-spin" style={{ margin: '0 auto 16px auto' }} />
            Computing final quiz analytics...
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 32 }}>
            {/* Top 3 Podium Card */}
            {leaderboard.length > 0 && (
              <div className="card card-gradient-border" style={{ padding: 28 }}>
                <h3 style={{ textAlign: 'center', fontSize: 22, fontWeight: 800 }}>
                  🏆 Championship Podium
                </h3>
                <Podium topThree={topThree} />
              </div>
            )}

            {/* Performance Summary Metrics */}
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
                gap: 16
              }}
            >
              <div className="card">
                <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-muted)' }}>TOTAL PARTICIPANTS</span>
                <div style={{ fontSize: 28, fontWeight: 900, marginTop: 4 }}>{summary.totalStudents || 0}</div>
              </div>

              <div className="card">
                <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-muted)' }}>AVERAGE SCORE</span>
                <div style={{ fontSize: 28, fontWeight: 900, marginTop: 4, color: 'var(--accent-primary)' }}>
                  {summary.avgScore || 0} pts
                </div>
              </div>

              <div className="card">
                <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-muted)' }}>HIGHEST SCORE</span>
                <div style={{ fontSize: 28, fontWeight: 900, marginTop: 4, color: 'var(--success)' }}>
                  {summary.highestScore || 0} pts
                </div>
              </div>

              <div className="card">
                <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-muted)' }}>EASIEST QUESTION</span>
                <div style={{ fontSize: 20, fontWeight: 800, marginTop: 4, color: '#10b981' }}>
                  {summary.easiestQuestion ? `Q${summary.easiestQuestion.index} (${summary.easiestQuestion.accuracy}%)` : 'N/A'}
                </div>
              </div>

              <div className="card">
                <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-muted)' }}>HARDEST QUESTION</span>
                <div style={{ fontSize: 20, fontWeight: 800, marginTop: 4, color: '#f43f5e' }}>
                  {summary.hardestQuestion ? `Q${summary.hardestQuestion.index} (${summary.hardestQuestion.accuracy}%)` : 'N/A'}
                </div>
              </div>
            </div>

            {/* Leaderboard Table */}
            <div className="card" style={{ padding: 24 }}>
              <h3 style={{ fontSize: 20, fontWeight: 800, marginBottom: 18 }}>Full Student Leaderboard</h3>

              {leaderboard.length === 0 ? (
                <div style={{ textAlign: 'center', padding: 30, color: 'var(--text-muted)' }}>
                  No student submissions recorded for this session.
                </div>
              ) : (
                <div style={{ overflowX: 'auto' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                    <thead>
                      <tr style={{ borderBottom: '1px solid var(--border-color)', color: 'var(--text-muted)', fontSize: 12, fontWeight: 700 }}>
                        <th style={{ padding: '12px 14px' }}>RANK</th>
                        <th style={{ padding: '12px 14px' }}>STUDENT NAME</th>
                        <th style={{ padding: '12px 14px' }}>ROLL NUMBER</th>
                        <th style={{ padding: '12px 14px' }}>TOTAL SCORE</th>
                        <th style={{ padding: '12px 14px' }}>CORRECT</th>
                        <th style={{ padding: '12px 14px' }}>WRONG</th>
                        <th style={{ padding: '12px 14px' }}>AVG TIME</th>
                        <th style={{ padding: '12px 14px' }}>TAB SWITCHES</th>
                      </tr>
                    </thead>
                    <tbody>
                      {leaderboard.map((student) => {
                        const rankMedal = student.rank === 1 ? '🥇 1st' : student.rank === 2 ? '🥈 2nd' : student.rank === 3 ? '🥉 3rd' : `#${student.rank}`;
                        return (
                          <tr
                            key={student.studentSessionId}
                            style={{
                              borderBottom: '1px solid var(--border-color)',
                              fontSize: 14,
                              transition: 'background 0.2s'
                            }}
                          >
                            <td style={{ padding: '14px', fontWeight: 800 }}>{rankMedal}</td>
                            <td style={{ padding: '14px', fontWeight: 700 }}>{student.name}</td>
                            <td style={{ padding: '14px', color: 'var(--text-secondary)' }}>{student.rollNumber}</td>
                            <td style={{ padding: '14px', fontWeight: 800, color: 'var(--accent-primary)' }}>
                              {student.totalScore}
                            </td>
                            <td style={{ padding: '14px', color: 'var(--success)' }}>{student.totalCorrect}</td>
                            <td style={{ padding: '14px', color: 'var(--danger)' }}>{student.totalWrong}</td>
                            <td style={{ padding: '14px', fontFamily: 'var(--font-mono)' }}>
                              ⚡ {student.avgResponseTimeSec}s
                            </td>
                            <td style={{ padding: '14px' }}>
                              {student.tabSwitchCount > 0 ? (
                                <span className="badge badge-warning">{student.tabSwitchCount} alerts</span>
                              ) : (
                                <span style={{ color: 'var(--text-muted)' }}>0</span>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            {/* Question Accuracy Breakdown */}
            <div className="card" style={{ padding: 24 }}>
              <h3 style={{ fontSize: 20, fontWeight: 800, marginBottom: 18 }}>
                Question-Wise Accuracy & Speed Analysis
              </h3>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: 16 }}>
                {questionStats.map((q) => (
                  <div
                    key={q.questionId}
                    style={{
                      background: 'var(--bg-tertiary)',
                      borderRadius: 'var(--radius-md)',
                      padding: 18,
                      border: '1px solid var(--border-color)'
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
                      <span className="badge badge-primary">Question {q.questionIndex} ({q.type})</span>
                      <span
                        style={{
                          fontSize: 16,
                          fontWeight: 800,
                          color: q.accuracy >= 70 ? 'var(--success)' : q.accuracy >= 40 ? 'var(--warning)' : 'var(--danger)'
                        }}
                      >
                        {q.accuracy}% Accuracy
                      </span>
                    </div>

                    <p style={{ fontSize: 14, fontWeight: 600, marginBottom: 12 }}>{q.text}</p>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: 6, fontSize: 12, color: 'var(--text-secondary)' }}>
                      <div>
                        📊 Responses: <strong>{q.totalResponses}</strong> ({q.correctResponses} Correct)
                      </div>
                      <div>
                        ⏱️ Average Response Time: <strong>{q.avgTimeSec}s</strong>
                      </div>
                      {q.fastestSubmission && (
                        <div>
                          ⚡ Fastest Responder: <strong>{q.fastestSubmission.studentName}</strong> ({q.fastestSubmission.responseTimeSec}s)
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
