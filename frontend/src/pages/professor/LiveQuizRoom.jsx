import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useSocket } from '../../context/SocketContext';
import { useAuth } from '../../context/AuthContext';
import TimerBadge from '../../components/common/TimerBadge';
import Modal from '../../components/common/Modal';
import {
  Users,
  Play,
  Pause,
  SkipForward,
  SkipBack,
  Eye,
  Award,
  Radio,
  CheckCircle2,
  XCircle,
  Clock,
  ShieldAlert,
  Copy,
  Check,
  Maximize2,
  BarChart2,
  Sparkles,
  Zap,
  Flame,
  QrCode
} from 'lucide-react';

export default function LiveQuizRoom() {
  const { id: sessionId } = useParams();
  const { socket, isConnected } = useSocket();
  const { token } = useAuth();
  const navigate = useNavigate();

  const [session, setSession] = useState(null);
  const [activeQuestion, setActiveQuestion] = useState(null);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(-1);
  const [remainingSec, setRemainingSec] = useState(30);
  const [timeLimit, setTimeLimit] = useState(30);
  const [isPaused, setIsPaused] = useState(false);
  const [isAnswerRevealed, setIsAnswerRevealed] = useState(false);

  // Live incoming submissions & ordering
  const [submissions, setSubmissions] = useState([]);
  const [firstToAnswer, setFirstToAnswer] = useState(null);
  const [firstCorrectAnswer, setFirstCorrectAnswer] = useState(null);
  const [filterMode, setFilterMode] = useState('all'); // 'all', 'firstToAnswer', 'firstCorrect'

  // Connected Students
  const [students, setStudents] = useState([]);
  const [totalOnline, setTotalOnline] = useState(0);

  // Anti-cheat alert logs
  const [cheatAlerts, setCheatAlerts] = useState([]);

  // UI state
  const [copied, setCopied] = useState(false);
  const [showQrModal, setShowQrModal] = useState(false);
  const [showLeaderboardModal, setShowLeaderboardModal] = useState(false);
  const [leaderboard, setLeaderboard] = useState([]);

  // Fetch session details on mount
  useEffect(() => {
    fetchSessionDetails();
  }, [sessionId]);

  const fetchSessionDetails = async () => {
    try {
      const res = await fetch(`/api/sessions/${sessionId}/details`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      if (res.ok && data.session) {
        setSession(data.session);
        setStudents(data.session.studentSessions || []);
        setTotalOnline(data.session.studentSessions?.filter((s) => s.isOnline).length || 0);
        setCurrentQuestionIndex(data.session.currentQuestionIndex);
      }
    } catch (err) {
      console.error(err);
    }
  };

  // Socket listeners
  useEffect(() => {
    if (!socket || !sessionId) return;

    // Join room as professor
    socket.emit('professor:join', { sessionId });

    socket.on('session_state', ({ session: s, activeQuestion: aq }) => {
      setSession(s);
      if (s) {
        setStudents(s.studentSessions || []);
        setTotalOnline(s.studentSessions?.filter((st) => st.isOnline).length || 0);
        setCurrentQuestionIndex(s.currentQuestionIndex);
      }
      if (aq) {
        setActiveQuestion(aq.sanitizedQuestion);
        setRemainingSec(aq.remainingSec);
        setTimeLimit(aq.timeLimit);
        setIsPaused(aq.isPaused);
      }
    });

    socket.on('student_joined', ({ student, totalOnline: count }) => {
      setTotalOnline(count);
      setStudents((prev) => {
        const exists = prev.find((s) => s.rollNumber === student.rollNumber);
        if (exists) {
          return prev.map((s) => (s.rollNumber === student.rollNumber ? { ...s, isOnline: true } : s));
        }
        return [...prev, student];
      });
    });

    socket.on('student_left', ({ rollNumber, totalOnline: count }) => {
      setTotalOnline(count);
      setStudents((prev) =>
        prev.map((s) => (s.rollNumber === rollNumber ? { ...s, isOnline: false } : s))
      );
    });

    socket.on('question_started', ({ question, questionIndex, timeLimit: tl }) => {
      setActiveQuestion(question);
      setCurrentQuestionIndex(questionIndex);
      setRemainingSec(tl);
      setTimeLimit(tl);
      setIsPaused(false);
      setIsAnswerRevealed(false);
      setSubmissions([]);
      setFirstToAnswer(null);
      setFirstCorrectAnswer(null);
    });

    socket.on('timer_tick', ({ remainingSec: sec }) => {
      setRemainingSec(sec);
    });

    socket.on('timer_pause_toggled', ({ isPaused: paused }) => {
      setIsPaused(paused);
    });

    socket.on('student_answered', ({ submission, allSubmissions, firstToAnswer: fta, firstCorrectAnswer: fca }) => {
      setSubmissions(allSubmissions || []);
      if (fta) setFirstToAnswer(fta);
      if (fca) setFirstCorrectAnswer(fca);
    });

    socket.on('question_ended', () => {
      setIsAnswerRevealed(true);
    });

    socket.on('tab_switch_alert', (alertData) => {
      setCheatAlerts((prev) => [alertData, ...prev.slice(0, 15)]);
    });

    socket.on('leaderboard_updated', ({ leaderboard: lb }) => {
      setLeaderboard(lb);
    });

    socket.on('quiz_ended', () => {
      navigate(`/professor/results/${sessionId}`);
    });

    return () => {
      socket.off('session_state');
      socket.off('student_joined');
      socket.off('student_left');
      socket.off('question_started');
      socket.off('timer_tick');
      socket.off('timer_pause_toggled');
      socket.off('student_answered');
      socket.off('question_ended');
      socket.off('tab_switch_alert');
      socket.off('leaderboard_updated');
      socket.off('quiz_ended');
    };
  }, [socket, sessionId]);

  const handleStartQuestion = (idx) => {
    if (socket) {
      socket.emit('question:start', { sessionId, questionIndex: idx });
    }
  };

  const handleNextQuestion = () => {
    const nextIdx = currentQuestionIndex + 1;
    if (session?.quiz?.questions && nextIdx < session.quiz.questions.length) {
      handleStartQuestion(nextIdx);
    }
  };

  const handlePrevQuestion = () => {
    const prevIdx = currentQuestionIndex - 1;
    if (prevIdx >= 0) {
      handleStartQuestion(prevIdx);
    }
  };

  const handleTogglePause = () => {
    if (socket) {
      socket.emit('question:toggle_pause', { sessionId });
    }
  };

  const handleEndQuestion = () => {
    if (socket) {
      socket.emit('question:end', { sessionId });
      setIsAnswerRevealed(true);
    }
  };

  const handleEndQuiz = async () => {
    if (!window.confirm('Are you sure you want to end this live quiz? Final results will be computed.')) return;
    if (socket) {
      socket.emit('quiz:end', { sessionId });
    }
  };

  const handleCopyLink = () => {
    const url = `${window.location.origin}/student/join?code=${session?.code}`;
    navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const questionsList = session?.quiz?.questions || [];
  const currentQ = questionsList[currentQuestionIndex];

  // Filtering submissions based on tab selection
  let displayedSubmissions = [...submissions];
  if (filterMode === 'firstToAnswer') {
    displayedSubmissions = submissions.slice(0, 1);
  } else if (filterMode === 'firstCorrect') {
    displayedSubmissions = submissions.filter((s) => s.isCorrect).slice(0, 1);
  }

  // Calculate option counts for live bar distribution
  const optionCounts = {};
  if (currentQ && currentQ.options) {
    currentQ.options.forEach((opt) => {
      optionCounts[opt.id] = { text: opt.text, isCorrect: opt.isCorrect, count: 0 };
    });
    submissions.forEach((s) => {
      if (s.selectedOptionIds) {
        try {
          const ids = JSON.parse(s.selectedOptionIds);
          (Array.isArray(ids) ? ids : [ids]).forEach((id) => {
            if (optionCounts[id]) optionCounts[id].count++;
          });
        } catch (_) {}
      }
    });
  }

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg-primary)', display: 'flex', flexDirection: 'column' }}>
      {/* Top Live Bar */}
      <header
        style={{
          background: 'var(--bg-secondary)',
          borderBottom: '1px solid var(--border-color)',
          padding: '14px 28px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: 16
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <Link to="/professor/dashboard" className="btn btn-secondary btn-sm">
            ← Exit to Dashboard
          </Link>
          <div>
            <span style={{ fontSize: 13, color: 'var(--text-muted)' }}>LIVE CLASSROOM SESSION</span>
            <h2 style={{ fontSize: 18, fontWeight: 800 }}>{session?.quiz?.title || 'Live Quiz'}</h2>
          </div>
        </div>

        {/* Big Pin Box */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 12,
              padding: '6px 18px',
              background: 'rgba(99, 102, 241, 0.15)',
              border: '2px dashed rgba(99, 102, 241, 0.5)',
              borderRadius: 'var(--radius-lg)'
            }}
          >
            <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-secondary)' }}>QUIZ CODE:</span>
            <span
              style={{
                fontFamily: 'var(--font-display)',
                fontSize: 28,
                fontWeight: 900,
                letterSpacing: '0.12em',
                background: 'var(--accent-gradient)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent'
              }}
            >
              {session?.code}
            </span>
            <button
              onClick={handleCopyLink}
              className="btn btn-secondary btn-icon"
              title="Copy Student Join Link"
              style={{ width: 30, height: 30 }}
            >
              {copied ? <Check size={14} color="var(--success)" /> : <Copy size={14} />}
            </button>
            <button
              onClick={() => setShowQrModal(true)}
              className="btn btn-secondary btn-icon"
              title="Show QR Code"
              style={{ width: 30, height: 30 }}
            >
              <QrCode size={14} />
            </button>
          </div>

          {/* Online Student Counter */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              padding: '8px 16px',
              background: 'var(--bg-tertiary)',
              borderRadius: 'var(--radius-md)',
              border: '1px solid var(--border-color)',
              fontWeight: 700,
              fontSize: 14
            }}
          >
            <span className="pulse-indicator" />
            <Users size={16} color="var(--accent-primary)" />
            <span>{totalOnline} Students Online</span>
          </div>

          <button onClick={handleEndQuiz} className="btn btn-danger btn-sm">
            End Quiz
          </button>
        </div>
      </header>

      {/* Main Control Area */}
      <div style={{ flex: 1, display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: 24, padding: 24 }}>
        {/* Left Column: Live Question & Presentation Controls */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          {/* Question Stage Card */}
          <div className="card card-gradient-border" style={{ padding: 28, minHeight: 380 }}>
            {currentQuestionIndex < 0 ? (
              <div style={{ textAlign: 'center', padding: '60px 20px' }}>
                <div
                  style={{
                    width: 64,
                    height: 64,
                    borderRadius: 'var(--radius-xl)',
                    background: 'rgba(99, 102, 241, 0.15)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    margin: '0 auto 20px auto'
                  }}
                >
                  <Radio size={32} color="var(--accent-primary)" />
                </div>
                <h2 style={{ fontSize: 24, fontWeight: 800 }}>Live Session Ready in Lobby</h2>
                <p style={{ fontSize: 15, color: 'var(--text-secondary)', maxWidth: 500, margin: '10px auto 28px auto' }}>
                  {totalOnline} student{totalOnline === 1 ? '' : 's'} connected in the lobby.
                  Click below to broadcast Question 1 to all student screens simultaneously.
                </p>
                <button
                  onClick={() => handleStartQuestion(0)}
                  disabled={questionsList.length === 0}
                  className="btn btn-primary btn-lg"
                  style={{ boxShadow: '0 8px 24px rgba(99, 102, 241, 0.4)' }}
                >
                  <Play size={20} fill="#ffffff" />
                  <span>START QUESTION 1 ({questionsList[0]?.type || 'MCQ'})</span>
                </button>
              </div>
            ) : (
              <div>
                {/* Question Info Bar */}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <span className="badge badge-primary">
                      Question {currentQuestionIndex + 1} of {questionsList.length}
                    </span>
                    <span className="badge badge-info">{currentQ?.type}</span>
                    <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-muted)' }}>
                      • {currentQ?.marks} Marks
                    </span>
                  </div>

                  <TimerBadge
                    remainingSec={remainingSec}
                    totalSec={timeLimit}
                    isPaused={isPaused}
                  />
                </div>

                {/* Question Text */}
                <h3 style={{ fontSize: 22, fontWeight: 800, lineHeight: 1.4, marginBottom: 20 }}>
                  {currentQ?.text}
                </h3>

                {/* Options / Code Preview */}
                {currentQ?.type === 'CODING' ? (
                  <div style={{ background: '#0d1117', padding: 16, borderRadius: 'var(--radius-md)', marginBottom: 20 }}>
                    <div style={{ fontSize: 12, fontWeight: 700, color: '#8b949e', marginBottom: 6 }}>
                      CODING CHALLENGE ({currentQ.codingLanguage || 'Python'})
                    </div>
                    <pre style={{ fontFamily: 'var(--font-mono)', fontSize: 13, color: '#58a6ff', whiteSpace: 'pre-wrap' }}>
                      {currentQ.starterCode}
                    </pre>
                  </div>
                ) : currentQ?.options && currentQ.options.length > 0 ? (
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 12, marginBottom: 24 }}>
                    {currentQ.options.map((opt, idx) => {
                      const count = optionCounts[opt.id]?.count || 0;
                      const isCorrect = isAnswerRevealed && opt.isCorrect;
                      return (
                        <div
                          key={opt.id || idx}
                          style={{
                            padding: '14px 18px',
                            borderRadius: 'var(--radius-md)',
                            background: isCorrect
                              ? 'var(--success-bg)'
                              : 'var(--bg-tertiary)',
                            border: `1.5px solid ${
                              isCorrect ? 'var(--success)' : 'var(--border-color)'
                            }`,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            transition: 'all 0.2s ease'
                          }}
                        >
                          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                            <span
                              style={{
                                width: 26,
                                height: 26,
                                borderRadius: '50%',
                                background: isCorrect ? 'var(--success)' : 'rgba(255, 255, 255, 0.1)',
                                color: '#ffffff',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                fontSize: 13,
                                fontWeight: 800
                              }}
                            >
                              {String.fromCharCode(65 + idx)}
                            </span>
                            <span style={{ fontSize: 14, fontWeight: 600 }}>{opt.text}</span>
                          </div>

                          {/* Response vote count badge */}
                          <span className="badge badge-primary">{count} responses</span>
                        </div>
                      );
                    })}
                  </div>
                ) : currentQ?.type === 'FILL_BLANK' ? (
                  <div style={{ background: 'var(--bg-tertiary)', padding: 16, borderRadius: 'var(--radius-md)', marginBottom: 20 }}>
                    <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-muted)' }}>Accepted Answers:</span>
                    <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--success)', marginTop: 4 }}>
                      {currentQ.acceptedAnswers || 'O(log n)'}
                    </div>
                  </div>
                ) : null}

                {/* Explanation (when revealed) */}
                {isAnswerRevealed && currentQ?.explanation && (
                  <div style={{ padding: 14, background: 'rgba(99, 102, 241, 0.12)', borderRadius: 'var(--radius-md)', border: '1px solid rgba(99, 102, 241, 0.3)', marginBottom: 20 }}>
                    <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--accent-primary)' }}>EXPLANATION:</span>
                    <p style={{ fontSize: 13, color: 'var(--text-primary)', marginTop: 4 }}>{currentQ.explanation}</p>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Navigation & Controls Bar */}
          <div
            className="card"
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: 18,
              flexWrap: 'wrap',
              gap: 12
            }}
          >
            <div style={{ display: 'flex', gap: 8 }}>
              <button
                onClick={handlePrevQuestion}
                disabled={currentQuestionIndex <= 0}
                className="btn btn-secondary btn-sm"
              >
                <SkipBack size={16} />
                <span>Prev Question</span>
              </button>
              <button
                onClick={handleTogglePause}
                disabled={currentQuestionIndex < 0}
                className="btn btn-secondary btn-sm"
              >
                {isPaused ? <Play size={16} fill="currentColor" /> : <Pause size={16} />}
                <span>{isPaused ? 'Resume Timer' : 'Pause Timer'}</span>
              </button>
            </div>

            <div style={{ display: 'flex', gap: 10 }}>
              <button
                onClick={handleEndQuestion}
                disabled={currentQuestionIndex < 0 || isAnswerRevealed}
                className="btn btn-secondary btn-sm"
                style={{ color: 'var(--accent-primary)' }}
              >
                <Eye size={16} />
                <span>Reveal Correct Answer</span>
              </button>

              <button
                onClick={handleNextQuestion}
                disabled={currentQuestionIndex >= questionsList.length - 1}
                className="btn btn-primary"
              >
                <span>Next Question</span>
                <SkipForward size={16} />
              </button>
            </div>
          </div>

          {/* Anti-Cheat Feed */}
          {cheatAlerts.length > 0 && (
            <div className="card" style={{ padding: 16, borderLeft: '4px solid var(--warning)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, fontWeight: 700, color: 'var(--warning)', marginBottom: 8 }}>
                <ShieldAlert size={16} />
                <span>Classroom Anti-Cheat Alert Log ({cheatAlerts.length})</span>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6, maxHeight: 100, overflowY: 'auto' }}>
                {cheatAlerts.map((alert, idx) => (
                  <div key={idx} style={{ fontSize: 12, color: 'var(--text-secondary)', display: 'flex', justifyContent: 'space-between' }}>
                    <span>
                      ⚠️ <strong>{alert.studentName}</strong> ({alert.rollNumber}) switched browser tabs (Incident #{alert.tabSwitchCount})
                    </span>
                    <span style={{ color: 'var(--text-muted)' }}>{alert.timestamp}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Right Column: LIVE RESPONSES & FIRST-TO-ANSWER SCREEN */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          {/* Celebratory First-to-Answer Spotlight Banner */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div
              className="card animate-fade-in"
              style={{
                background: 'linear-gradient(135deg, rgba(99, 102, 241, 0.15) 0%, rgba(139, 92, 246, 0.25) 100%)',
                border: '1.5px solid rgba(99, 102, 241, 0.4)',
                padding: 16
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11, fontWeight: 800, color: '#818cf8', letterSpacing: '0.05em' }}>
                <Zap size={14} color="#818cf8" />
                <span>FIRST TO ANSWER</span>
              </div>
              {firstToAnswer ? (
                <div style={{ marginTop: 8 }}>
                  <div style={{ fontSize: 17, fontWeight: 800, color: '#ffffff' }}>
                    🥇 {firstToAnswer.studentName}
                  </div>
                  <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2 }}>
                    {firstToAnswer.rollNumber} • <strong style={{ color: '#818cf8' }}>{firstToAnswer.responseTimeSec}s</strong>
                  </div>
                </div>
              ) : (
                <div style={{ fontSize: 13, color: 'var(--text-muted)', marginTop: 8 }}>Waiting for responses...</div>
              )}
            </div>

            <div
              className="card animate-fade-in"
              style={{
                background: 'linear-gradient(135deg, rgba(16, 185, 129, 0.15) 0%, rgba(5, 150, 105, 0.25) 100%)',
                border: '1.5px solid rgba(16, 185, 129, 0.4)',
                padding: 16
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11, fontWeight: 800, color: 'var(--success)', letterSpacing: '0.05em' }}>
                <Flame size={14} color="var(--success)" />
                <span>FIRST CORRECT ANSWER</span>
              </div>
              {firstCorrectAnswer ? (
                <div style={{ marginTop: 8 }}>
                  <div style={{ fontSize: 17, fontWeight: 800, color: '#ffffff' }}>
                    👑 {firstCorrectAnswer.studentName}
                  </div>
                  <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2 }}>
                    {firstCorrectAnswer.rollNumber} • <strong style={{ color: 'var(--success)' }}>{firstCorrectAnswer.responseTimeSec}s</strong>
                  </div>
                </div>
              ) : (
                <div style={{ fontSize: 13, color: 'var(--text-muted)', marginTop: 8 }}>Waiting for correct answer...</div>
              )}
            </div>
          </div>

          {/* Submissions Feed Card */}
          <div className="card" style={{ flex: 1, display: 'flex', flexDirection: 'column', padding: 20 }}>
            {/* Feed Header & Filters */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16, flexWrap: 'wrap', gap: 10 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <h4 style={{ fontSize: 16, fontWeight: 800 }}>Live Submissions ({submissions.length})</h4>
              </div>

              {/* Toggle Buttons */}
              <div style={{ display: 'flex', background: 'var(--bg-tertiary)', borderRadius: 'var(--radius-sm)', padding: 3 }}>
                <button
                  onClick={() => setFilterMode('all')}
                  style={{
                    padding: '4px 10px',
                    fontSize: 11,
                    fontWeight: 700,
                    borderRadius: 'var(--radius-sm)',
                    background: filterMode === 'all' ? 'var(--accent-primary)' : 'transparent',
                    color: '#ffffff'
                  }}
                >
                  All ({submissions.length})
                </button>
                <button
                  onClick={() => setFilterMode('firstToAnswer')}
                  style={{
                    padding: '4px 10px',
                    fontSize: 11,
                    fontWeight: 700,
                    borderRadius: 'var(--radius-sm)',
                    background: filterMode === 'firstToAnswer' ? 'var(--accent-primary)' : 'transparent',
                    color: '#ffffff'
                  }}
                >
                  1st Fast
                </button>
                <button
                  onClick={() => setFilterMode('firstCorrect')}
                  style={{
                    padding: '4px 10px',
                    fontSize: 11,
                    fontWeight: 700,
                    borderRadius: 'var(--radius-sm)',
                    background: filterMode === 'firstCorrect' ? 'var(--accent-primary)' : 'transparent',
                    color: '#ffffff'
                  }}
                >
                  1st Correct
                </button>
              </div>
            </div>

            {/* Responses Stream List */}
            <div style={{ flex: 1, overflowY: 'auto', maxHeight: 420, display: 'flex', flexDirection: 'column', gap: 10 }}>
              {displayedSubmissions.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '40px 20px', color: 'var(--text-muted)' }}>
                  <Clock size={32} style={{ margin: '0 auto 10px auto', opacity: 0.5 }} />
                  <p style={{ fontSize: 14 }}>Waiting for student submissions...</p>
                  <span style={{ fontSize: 12 }}>Answers will appear live ordered by server arrival timestamp.</span>
                </div>
              ) : (
                displayedSubmissions.map((sub, idx) => {
                  const rankMedal = sub.orderRank === 1 ? '🥇' : sub.orderRank === 2 ? '🥈' : sub.orderRank === 3 ? '🥉' : `#${sub.orderRank}`;
                  return (
                    <div
                      key={sub.submissionId || idx}
                      className="card animate-fade-in"
                      style={{
                        padding: '12px 16px',
                        background: 'var(--bg-tertiary)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        borderLeft: `4px solid ${sub.isCorrect ? 'var(--success)' : 'var(--danger)'}`
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                        <span style={{ fontSize: 18, fontWeight: 900, minWidth: 28 }}>{rankMedal}</span>
                        <div>
                          <div style={{ fontSize: 14, fontWeight: 700 }}>{sub.studentName}</div>
                          <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{sub.rollNumber}</div>
                        </div>
                      </div>

                      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                        {sub.codingSubmission ? (
                          <span className="badge badge-info" style={{ fontSize: 11 }}>
                            Tests: {sub.codingSubmission.testsPassed}/{sub.codingSubmission.totalTests}
                          </span>
                        ) : null}

                        <span
                          style={{
                            fontFamily: 'var(--font-mono)',
                            fontSize: 13,
                            fontWeight: 700,
                            color: 'var(--accent-primary)'
                          }}
                        >
                          ⚡ {sub.responseTimeSec}s
                        </span>

                        <span
                          className={`badge ${sub.isCorrect ? 'badge-success' : 'badge-danger'}`}
                          style={{ fontSize: 11 }}
                        >
                          {sub.isCorrect ? 'Correct' : 'Wrong'}
                        </span>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>
      </div>

      {/* QR Code Modal */}
      <Modal isOpen={showQrModal} onClose={() => setShowQrModal(false)} title="Student Join Pin & QR">
        <div style={{ textAlign: 'center', padding: '10px 0' }}>
          <div className="quiz-code-text" style={{ marginBottom: 12 }}>{session?.code}</div>
          <p style={{ fontSize: 14, color: 'var(--text-secondary)', marginBottom: 20 }}>
            Students can open LiveClass Quiz on their phone or laptop and enter code <strong>{session?.code}</strong>
          </p>
          <div
            style={{
              padding: 20,
              background: '#ffffff',
              borderRadius: 'var(--radius-lg)',
              display: 'inline-block',
              boxShadow: 'var(--shadow-lg)'
            }}
          >
            {/* Standard SVG QR Representation */}
            <svg width="200" height="200" viewBox="0 0 100 100">
              <rect width="100" height="100" fill="#ffffff" />
              <path d="M10 10 h30 v30 h-30 z M15 15 v20 h20 v-20 z M20 20 h10 v10 h-10 z" fill="#000000" />
              <path d="M60 10 h30 v30 h-30 z M65 15 v20 h20 v-20 z M70 20 h10 v10 h-10 z" fill="#000000" />
              <path d="M10 60 h30 v30 h-30 z M15 65 v20 h20 v-20 z M20 70 h10 v10 h-10 z" fill="#000000" />
              <circle cx="50" cy="50" r="10" fill="#6366f1" />
              <path d="M45 45 h10 v10 h-10 z M60 60 h15 v15 h-15 z M75 75 h15 v15 h-15 z M50 20 h10 v20 h-10 z" fill="#000000" />
            </svg>
          </div>
          <div style={{ marginTop: 20 }}>
            <button onClick={handleCopyLink} className="btn btn-primary">
              {copied ? 'Link Copied!' : 'Copy Direct Student Join Link'}
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
