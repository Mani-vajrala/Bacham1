import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import Sidebar from '../../components/common/Sidebar';
import { useAuth } from '../../context/AuthContext';
import { API_BASE } from '../../config';
import {
  FolderKanban,
  PlusCircle,
  Play,
  Edit,
  Copy,
  Trash2,
  Search,
  Clock,
  Loader2,
  HelpCircle
} from 'lucide-react';

export default function QuizList() {
  const { token } = useAuth();
  const [quizzes, setQuizzes] = useState([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [actionLoadingId, setActionLoadingId] = useState(null);
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
      if (res.ok) setQuizzes(data.quizzes || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleLaunch = async (quizId) => {
    setActionLoadingId(quizId);
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
      alert(err.message);
    } finally {
      setActionLoadingId(null);
    }
  };

  const handleDuplicate = async (quizId) => {
    setActionLoadingId(quizId);
    try {
      const res = await fetch(`${API_BASE}/quizzes/${quizId}/duplicate`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        await fetchQuizzes();
      }
    } catch (err) {
      alert(err.message);
    } finally {
      setActionLoadingId(null);
    }
  };

  const handleDelete = async (quizId) => {
    if (!window.confirm('Are you sure you want to delete this quiz?')) return;
    setActionLoadingId(quizId);
    try {
      const res = await fetch(`${API_BASE}/quizzes/${quizId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        setQuizzes((prev) => prev.filter((q) => q.id !== quizId));
      }
    } catch (err) {
      alert(err.message);
    } finally {
      setActionLoadingId(null);
    }
  };

  const filteredQuizzes = quizzes.filter((q) =>
    q.title.toLowerCase().includes(search.toLowerCase()) ||
    (q.description && q.description.toLowerCase().includes(search.toLowerCase()))
  );

  return (
    <div style={{ display: 'flex' }}>
      <Sidebar />

      <main style={{ flex: 1, padding: '32px 36px', overflowY: 'auto' }}>
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 28, flexWrap: 'wrap', gap: 16 }}>
          <div>
            <h1 style={{ fontSize: 28, fontWeight: 800 }}>My Quizzes</h1>
            <p style={{ fontSize: 14, color: 'var(--text-secondary)', marginTop: 4 }}>
              Manage your quiz repository, edit questions, and launch live synchronized sessions.
            </p>
          </div>

          <Link to="/professor/quizzes/create" className="btn btn-primary">
            <PlusCircle size={18} />
            <span>Create New Quiz</span>
          </Link>
        </div>

        {/* Search Bar */}
        <div style={{ position: 'relative', maxWidth: 450, marginBottom: 28 }}>
          <Search size={18} color="var(--text-muted)" style={{ position: 'absolute', left: 14, top: 12 }} />
          <input
            type="text"
            placeholder="Search quizzes by title..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={{ paddingLeft: 42 }}
          />
        </div>

        {/* Quiz Grid */}
        {loading ? (
          <div style={{ padding: 60, textAlign: 'center', color: 'var(--text-muted)' }}>
            <Loader2 size={28} className="animate-spin" style={{ margin: '0 auto 12px auto' }} />
            Loading quizzes...
          </div>
        ) : filteredQuizzes.length === 0 ? (
          <div className="card" style={{ textAlign: 'center', padding: 60 }}>
            <FolderKanban size={48} color="var(--text-muted)" style={{ margin: '0 auto 16px auto' }} />
            <h3 style={{ fontSize: 18, fontWeight: 700 }}>No quizzes found</h3>
            <p style={{ fontSize: 14, color: 'var(--text-secondary)', margin: '8px 0 20px 0' }}>
              {search ? 'No quizzes match your search query.' : 'Create a quiz to get started.'}
            </p>
            {!search && (
              <Link to="/professor/quizzes/create" className="btn btn-primary">
                <PlusCircle size={18} />
                <span>Create Quiz</span>
              </Link>
            )}
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))', gap: 20 }}>
            {filteredQuizzes.map((quiz) => (
              <div
                key={quiz.id}
                className="card animate-fade-in"
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'space-between',
                  gap: 16
                }}
              >
                <div>
                  <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 10 }}>
                    <h3 style={{ fontSize: 18, fontWeight: 800 }}>{quiz.title}</h3>
                    <span className="badge badge-primary">
                      {quiz.questions?.length || 0} Qs
                    </span>
                  </div>

                  <p style={{ fontSize: 13, color: 'var(--text-secondary)', margin: '10px 0 16px 0', minHeight: 38 }}>
                    {quiz.description || 'No description provided.'}
                  </p>

                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, fontSize: 12, color: 'var(--text-muted)' }}>
                    <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                      <Clock size={14} /> {quiz.timeLimit}s timer
                    </span>
                    <span>•</span>
                    <span>{quiz.sessions?.length || 0} sessions hosted</span>
                  </div>
                </div>

                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    paddingTop: 14,
                    borderTop: '1px solid var(--border-color)'
                  }}
                >
                  <div style={{ display: 'flex', gap: 6 }}>
                    <Link
                      to={`/professor/quizzes/edit/${quiz.id}`}
                      className="btn btn-secondary btn-icon"
                      title="Edit Quiz"
                      style={{ width: 34, height: 34 }}
                    >
                      <Edit size={15} />
                    </Link>
                    <button
                      onClick={() => handleDuplicate(quiz.id)}
                      disabled={actionLoadingId === quiz.id}
                      className="btn btn-secondary btn-icon"
                      title="Duplicate Quiz"
                      style={{ width: 34, height: 34 }}
                    >
                      <Copy size={15} />
                    </button>
                    <button
                      onClick={() => handleDelete(quiz.id)}
                      disabled={actionLoadingId === quiz.id}
                      className="btn btn-secondary btn-icon"
                      title="Delete Quiz"
                      style={{ width: 34, height: 34, color: 'var(--danger)' }}
                    >
                      <Trash2 size={15} />
                    </button>
                  </div>

                  <button
                    onClick={() => handleLaunch(quiz.id)}
                    disabled={actionLoadingId === quiz.id}
                    className="btn btn-primary btn-sm"
                  >
                    {actionLoadingId === quiz.id ? (
                      <Loader2 size={15} className="animate-spin" />
                    ) : (
                      <Play size={15} fill="#ffffff" />
                    )}
                    <span>Launch Live</span>
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
