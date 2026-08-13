import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import Sidebar from '../../components/common/Sidebar';
import { useAuth } from '../../context/AuthContext';
import { API_BASE } from '../../config';
import {
  Zap,
  FolderKanban,
  Users,
  Award,
  Play,
  PlusCircle,
  Clock,
  ArrowRight,
  TrendingUp,
  Loader2,
  Radio
} from 'lucide-react';

export default function ProfessorDashboard() {
  const { professor, token } = useAuth();
  const [quizzes, setQuizzes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [startingQuizId, setStartingQuizId] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    fetchQuizzes();
  }, []);

  const fetchQuizzes = async () => {
    try {
      const res = await fetch(`${API_BASE}/quizzes`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      if (res.ok) {
        setQuizzes(data.quizzes || []);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleLaunchLive = async (quizId) => {
    setStartingQuizId(quizId);
    try {
      const res = await fetch(`${API_BASE}/sessions/start`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ quizId })
      });

      const data = await res.json();
      if (res.ok && data.session) {
        navigate(`/professor/live/${data.session.id}`);
      } else {
        alert(data.message || 'Failed to start session.');
      }
    } catch (err) {
      alert('Error launching session: ' + err.message);
    } finally {
      setStartingQuizId(null);
    }
  };

  const totalQuestions = quizzes.reduce((acc, q) => acc + (q.questions?.length || 0), 0);
  const totalSessions = quizzes.reduce((acc, q) => acc + (q.sessions?.length || 0), 0);

  return (
    <div style={{ display: 'flex' }}>
      <Sidebar />

      <main style={{ flex: 1, padding: '32px 36px', overflowY: 'auto' }}>
        {/* Welcome Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 32, flexWrap: 'wrap', gap: 16 }}>
          <div>
            <h1 style={{ fontSize: 28, fontWeight: 800 }}>
              Welcome back, {professor?.name || 'Professor'}
            </h1>
            <p style={{ fontSize: 14, color: 'var(--text-secondary)', marginTop: 4 }}>
              {professor?.department || 'Computer Science'} • Live Classroom Control Center
            </p>
          </div>

          <div style={{ display: 'flex', gap: 12 }}>
            <Link to="/professor/quizzes/create" className="btn btn-primary">
              <PlusCircle size={18} />
              <span>Create New Quiz</span>
            </Link>
          </div>
        </div>

        {/* Top Metric Cards */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
            gap: 20,
            marginBottom: 36
          }}
        >
          <div className="card">
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
              <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-muted)' }}>TOTAL QUIZZES</span>
              <div style={{ padding: 8, borderRadius: 'var(--radius-md)', background: 'rgba(99, 102, 241, 0.15)' }}>
                <FolderKanban size={20} color="var(--accent-primary)" />
              </div>
            </div>
            <div style={{ fontSize: 32, fontWeight: 900 }}>{quizzes.length}</div>
            <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginTop: 4 }}>
              {totalQuestions} total questions configured
            </div>
          </div>

          <div className="card">
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
              <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-muted)' }}>LIVE SESSIONS HOSTED</span>
              <div style={{ padding: 8, borderRadius: 'var(--radius-md)', background: 'rgba(16, 185, 129, 0.15)' }}>
                <Radio size={20} color="var(--success)" />
              </div>
            </div>
            <div style={{ fontSize: 32, fontWeight: 900 }}>{totalSessions}</div>
            <div style={{ fontSize: 12, color: 'var(--success)', marginTop: 4, fontWeight: 600 }}>
              ⚡ Real-time Socket.IO sync ready
            </div>
          </div>

          <div className="card">
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
              <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-muted)' }}>SANDBOX RUNTIMES</span>
              <div style={{ padding: 8, borderRadius: 'var(--radius-md)', background: 'rgba(245, 158, 11, 0.15)' }}>
                <Zap size={20} color="var(--warning)" />
              </div>
            </div>
            <div style={{ fontSize: 32, fontWeight: 900 }}>5 Languages</div>
            <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginTop: 4 }}>
              Python, JS, C, C++, Java
            </div>
          </div>

          <div className="card">
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
              <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-muted)' }}>ANTI-CHEAT ENGINE</span>
              <div style={{ padding: 8, borderRadius: 'var(--radius-md)', background: 'rgba(56, 189, 248, 0.15)' }}>
                <Award size={20} color="var(--info)" />
              </div>
            </div>
            <div style={{ fontSize: 32, fontWeight: 900 }}>Active</div>
            <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginTop: 4 }}>
              Tab switch & timing validation
            </div>
          </div>
        </div>

        {/* Featured Live Launch Banner */}
        {quizzes.length > 0 && (
          <div
            className="card card-gradient-border"
            style={{
              padding: 28,
              marginBottom: 36,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              flexWrap: 'wrap',
              gap: 20
            }}
          >
            <div>
              <div className="badge badge-primary" style={{ marginBottom: 10 }}>
                ⚡ Ready to Host
              </div>
              <h3 style={{ fontSize: 22, fontWeight: 800 }}>
                {quizzes[0].title}
              </h3>
              <p style={{ fontSize: 14, color: 'var(--text-secondary)', marginTop: 4, maxWidth: 650 }}>
                {quizzes[0].description || 'Conduct live interactive session with real-time response ranking.'}
              </p>
              <div style={{ display: 'flex', gap: 16, marginTop: 12, fontSize: 13, color: 'var(--text-muted)' }}>
                <span>📝 {quizzes[0].questions?.length || 0} Questions</span>
                <span>⏱️ {quizzes[0].timeLimit}s timer</span>
                <span>🏆 Live Leaderboard Enabled</span>
              </div>
            </div>

            <button
              onClick={() => handleLaunchLive(quizzes[0].id)}
              disabled={startingQuizId === quizzes[0].id}
              className="btn btn-primary btn-lg"
              style={{ boxShadow: '0 8px 24px rgba(99, 102, 241, 0.45)' }}
            >
              {startingQuizId === quizzes[0].id ? (
                <Loader2 size={20} className="animate-spin" />
              ) : (
                <Play size={20} fill="#ffffff" />
              )}
              <span>START LIVE QUIZ NOW</span>
            </button>
          </div>
        )}

        {/* Quizzes List Section */}
        <div>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
            <h3 style={{ fontSize: 20, fontWeight: 800 }}>Your Quizzes</h3>
            <Link to="/professor/quizzes" style={{ fontSize: 14, color: 'var(--accent-primary)', fontWeight: 600, display: 'flex', alignItems: 'center', gap: 4 }}>
              <span>View All</span>
              <ArrowRight size={16} />
            </Link>
          </div>

          {loading ? (
            <div style={{ padding: 40, textAlign: 'center', color: 'var(--text-muted)' }}>
              <Loader2 size={24} className="animate-spin" style={{ margin: '0 auto 10px auto' }} />
              Loading quizzes...
            </div>
          ) : quizzes.length === 0 ? (
            <div className="card" style={{ textAlign: 'center', padding: 48 }}>
              <FolderKanban size={40} color="var(--text-muted)" style={{ margin: '0 auto 16px auto' }} />
              <h4 style={{ fontSize: 18, fontWeight: 700 }}>No quizzes created yet</h4>
              <p style={{ fontSize: 14, color: 'var(--text-secondary)', margin: '8px 0 20px 0' }}>
                Create your first quiz with MCQ, Fill in Blank, True/False, and Coding questions.
              </p>
              <Link to="/professor/quizzes/create" className="btn btn-primary">
                <PlusCircle size={18} />
                <span>Create Quiz</span>
              </Link>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              {quizzes.map((quiz) => (
                <div
                  key={quiz.id}
                  className="card"
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    flexWrap: 'wrap',
                    gap: 16,
                    padding: 20
                  }}
                >
                  <div>
                    <h4 style={{ fontSize: 17, fontWeight: 700 }}>{quiz.title}</h4>
                    <p style={{ fontSize: 13, color: 'var(--text-secondary)', marginTop: 3 }}>
                      {quiz.description || 'No description provided.'}
                    </p>
                    <div style={{ display: 'flex', gap: 14, marginTop: 8, fontSize: 12, color: 'var(--text-muted)' }}>
                      <span>{quiz.questions?.length || 0} Questions</span>
                      <span>•</span>
                      <span>Default {quiz.timeLimit}s</span>
                      <span>•</span>
                      <span>Updated {new Date(quiz.updatedAt).toLocaleDateString()}</span>
                    </div>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <Link to={`/professor/quizzes/edit/${quiz.id}`} className="btn btn-secondary btn-sm">
                      Edit
                    </Link>
                    <button
                      onClick={() => handleLaunchLive(quiz.id)}
                      disabled={startingQuizId === quiz.id}
                      className="btn btn-primary btn-sm"
                    >
                      {startingQuizId === quiz.id ? (
                        <Loader2 size={16} className="animate-spin" />
                      ) : (
                        <Play size={16} fill="#ffffff" />
                      )}
                      <span>Launch Live</span>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
