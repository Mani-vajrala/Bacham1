import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useSocket } from '../../context/SocketContext';
import TimerBadge from '../../components/common/TimerBadge';
import CodeEditor from '../../components/common/CodeEditor';
import Modal from '../../components/common/Modal';
import {
  Clock,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Send,
  Loader2,
  Lock,
  Zap,
  Code2,
  Award
} from 'lucide-react';

export default function StudentQuizRoom() {
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

  // Initialize question state from sessionStorage if navigated from Lobby/Join
  const cachedActiveQ = (() => {
    try {
      return JSON.parse(sessionStorage.getItem('liveclass_active_question') || 'null');
    } catch (_) {
      return null;
    }
  })();

  const [question, setQuestion] = useState(cachedActiveQ?.question || null);
  const [questionIndex, setQuestionIndex] = useState(cachedActiveQ?.questionIndex || 0);
  const [totalQuestions, setTotalQuestions] = useState(cachedActiveQ?.totalQuestions || 1);
  const [remainingSec, setRemainingSec] = useState(cachedActiveQ?.remainingSec || cachedActiveQ?.timeLimit || 30);
  const [timeLimit, setTimeLimit] = useState(cachedActiveQ?.timeLimit || 30);
  const [isPaused, setIsPaused] = useState(false);

  // Student answer inputs
  const [selectedOptionIds, setSelectedOptionIds] = useState([]);
  const [answerText, setAnswerText] = useState('');
  const [code, setCode] = useState(cachedActiveQ?.question?.starterCode || '');
  const [codingLanguage, setCodingLanguage] = useState(cachedActiveQ?.question?.codingLanguage || 'python');

  // Submission & Revealed Answer state
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [confirmedResult, setConfirmedResult] = useState(null);
  const [revealedAnswerData, setRevealedAnswerData] = useState(null);

  // Anti-cheat alert
  const [showTabWarning, setShowTabWarning] = useState(false);

  useEffect(() => {
    if (!student.id || !sessionId) {
      navigate('/student/join');
      return;
    }

    if (!socket) return;

    // Listen for question push from professor
    const handleQuestionStarted = (data) => {
      const { question: q, questionIndex: qIdx, totalQuestions: tq, timeLimit: tl } = data;
      sessionStorage.setItem('liveclass_active_question', JSON.stringify(data));
      setQuestion(q);
      setQuestionIndex(qIdx);
      setTotalQuestions(tq);
      setRemainingSec(tl);
      setTimeLimit(tl);
      setIsPaused(false);

      // Reset student inputs for new question
      setSelectedOptionIds([]);
      setAnswerText('');
      setCode(q.starterCode || '');
      setCodingLanguage(q.codingLanguage || 'python');
      setIsSubmitted(false);
      setConfirmedResult(null);
      setRevealedAnswerData(null);
    };

    socket.on('question_started', handleQuestionStarted);

    socket.on('timer_tick', ({ remainingSec: sec }) => {
      setRemainingSec(sec);
    });

    socket.on('timer_pause_toggled', ({ isPaused: paused }) => {
      setIsPaused(paused);
    });

    socket.on('question_time_up', () => {
      if (!isSubmitted) {
        // Auto-lock when time expires
        setIsSubmitted(true);
      }
    });

    socket.on('submission_confirmed', (result) => {
      setIsSubmitting(false);
      setIsSubmitted(true);
      setConfirmedResult(result);
    });

    socket.on('question_ended', (data) => {
      setIsSubmitted(true);
      setRevealedAnswerData(data);
    });

    socket.on('quiz_ended', () => {
      navigate(`/student/results/${sessionId}`);
    });

    return () => {
      socket.off('question_started', handleQuestionStarted);
      socket.off('timer_tick');
      socket.off('timer_pause_toggled');
      socket.off('question_time_up');
      socket.off('submission_confirmed');
      socket.off('question_ended');
      socket.off('quiz_ended');
    };
  }, [socket, sessionId, student, isSubmitted, navigate]);

  // Anti-Cheat: Tab switch & blur detection
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.hidden && !isSubmitted && socket) {
        setShowTabWarning(true);
        socket.emit('student:tab_switch', {
          sessionId,
          studentSessionId: student.id
        });
      }
    };

    const handleBlur = () => {
      if (!isSubmitted && socket) {
        setShowTabWarning(true);
        socket.emit('student:tab_switch', {
          sessionId,
          studentSessionId: student.id
        });
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('blur', handleBlur);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('blur', handleBlur);
    };
  }, [sessionId, student.id, isSubmitted, socket]);

  const handleOptionSelect = (optionId) => {
    if (isSubmitted || remainingSec <= 0) return;

    if (question.type === 'MULTI_MCQ') {
      setSelectedOptionIds((prev) =>
        prev.includes(optionId) ? prev.filter((id) => id !== optionId) : [...prev, optionId]
      );
    } else {
      setSelectedOptionIds([optionId]);
    }
  };

  const handleSubmit = (e) => {
    if (e) e.preventDefault();
    if (isSubmitted || isSubmitting || remainingSec <= 0) return;

    setIsSubmitting(true);

    const payload = {
      sessionId,
      questionId: question.id,
      studentSessionId: student.id,
      selectedOptionIds,
      answerText,
      code,
      language: codingLanguage
    };

    socket.emit('student:submit_answer', payload);
  };

  if (!question) {
    return (
      <div className="main-content" style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: 'calc(100vh - 120px)' }}>
        <div className="card card-gradient-border" style={{ textAlign: 'center', padding: 40, maxWidth: 450 }}>
          <Loader2 size={36} className="animate-spin" color="var(--accent-primary)" style={{ margin: '0 auto 16px auto' }} />
          <h3 style={{ fontSize: 20, fontWeight: 800 }}>Waiting for Question...</h3>
          <p style={{ fontSize: 14, color: 'var(--text-secondary)', marginTop: 8 }}>
            Professor will broadcast the next question shortly. Please keep this window active.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="main-content" style={{ maxWidth: 850, padding: '20px 16px 40px 16px' }}>
      {/* Top Question & Timer Header */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: 20,
          flexWrap: 'wrap',
          gap: 12
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <span className="badge badge-primary">
            Q{questionIndex + 1} of {totalQuestions}
          </span>
          <span className="badge badge-info">{question.type}</span>
          <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-muted)' }}>
            • {question.marks} Marks
          </span>
        </div>

        <TimerBadge remainingSec={remainingSec} totalSec={timeLimit} isPaused={isPaused} />
      </div>

      {/* Main Question Card */}
      <div className="card card-gradient-border" style={{ padding: '28px 24px', marginBottom: 24 }}>
        <h2 style={{ fontSize: 'clamp(18px, 2.5vw, 22px)', fontWeight: 800, lineHeight: 1.4, marginBottom: 24 }}>
          {question.text}
        </h2>

        {/* 1. SINGLE MCQ & MULTI-MCQ OPTIONS */}
        {(question.type === 'MCQ' || question.type === 'MULTI_MCQ') && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {question.options?.map((opt, idx) => {
              const isSelected = selectedOptionIds.includes(opt.id);
              const isCorrectOption = revealedAnswerData?.correctOptionIds?.includes(opt.id);
              const isRevealed = !!revealedAnswerData;

              let borderStyle = `2px solid ${isSelected ? 'var(--accent-primary)' : 'var(--border-color)'}`;
              let bgStyle = isSelected
                ? 'linear-gradient(135deg, rgba(99, 102, 241, 0.25) 0%, rgba(139, 92, 246, 0.35) 100%)'
                : 'var(--bg-tertiary)';

              if (isRevealed) {
                if (isCorrectOption) {
                  borderStyle = '2px solid var(--success)';
                  bgStyle = 'rgba(16, 185, 129, 0.22)';
                } else if (isSelected && !isCorrectOption) {
                  borderStyle = '2px solid var(--danger)';
                  bgStyle = 'rgba(244, 63, 94, 0.22)';
                }
              }

              return (
                <button
                  key={opt.id}
                  type="button"
                  onClick={() => handleOptionSelect(opt.id)}
                  disabled={isSubmitted || remainingSec <= 0}
                  style={{
                    padding: '16px 20px',
                    borderRadius: 'var(--radius-lg)',
                    background: bgStyle,
                    border: borderStyle,
                    color: 'var(--text-primary)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    textAlign: 'left',
                    boxShadow: isSelected ? 'var(--accent-glow)' : 'none',
                    transform: isSelected ? 'scale(1.01)' : 'none',
                    transition: 'all 0.2s ease'
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                    <span
                      style={{
                        width: 32,
                        height: 32,
                        borderRadius: '50%',
                        background: isRevealed && isCorrectOption
                          ? 'var(--success)'
                          : (isSelected ? 'var(--accent-gradient)' : 'rgba(255, 255, 255, 0.1)'),
                        color: '#ffffff',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: 14,
                        fontWeight: 800
                      }}
                    >
                      {String.fromCharCode(65 + idx)}
                    </span>
                    <span style={{ fontSize: 15, fontWeight: 600 }}>{opt.text}</span>
                  </div>

                  {isRevealed && isCorrectOption && (
                    <span className="badge badge-success" style={{ gap: 4 }}>
                      <CheckCircle2 size={14} />
                      <span>Correct Answer</span>
                    </span>
                  )}

                  {isRevealed && isSelected && !isCorrectOption && (
                    <span className="badge badge-danger" style={{ gap: 4 }}>
                      <XCircle size={14} />
                      <span>Your Answer</span>
                    </span>
                  )}

                  {!isRevealed && isSelected && <CheckCircle2 size={20} color="var(--accent-primary)" />}
                </button>
              );
            })}
          </div>
        )}

        {/* 2. TRUE / FALSE OPTIONS */}
        {question.type === 'TRUE_FALSE' && (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
            {['True', 'False'].map((val) => {
              const isSelected = answerText.toLowerCase() === val.toLowerCase();
              return (
                <button
                  key={val}
                  type="button"
                  onClick={() => !isSubmitted && setAnswerText(val)}
                  disabled={isSubmitted || remainingSec <= 0}
                  style={{
                    padding: '24px',
                    borderRadius: 'var(--radius-lg)',
                    background: isSelected
                      ? val === 'True' ? 'rgba(16, 185, 129, 0.25)' : 'rgba(244, 63, 94, 0.25)'
                      : 'var(--bg-tertiary)',
                    border: `2px solid ${
                      isSelected ? (val === 'True' ? 'var(--success)' : 'var(--danger)') : 'var(--border-color)'
                    }`,
                    color: '#ffffff',
                    fontSize: 20,
                    fontWeight: 800,
                    textAlign: 'center',
                    boxShadow: isSelected ? 'var(--shadow-lg)' : 'none',
                    transition: 'all 0.2s ease'
                  }}
                >
                  {val}
                </button>
              );
            })}
          </div>
        )}

        {/* 3. FILL IN THE BLANK */}
        {question.type === 'FILL_BLANK' && (
          <div>
            <label style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 8, display: 'block' }}>
              Type your exact answer:
            </label>
            <input
              type="text"
              placeholder="e.g. O(log n)"
              value={answerText}
              onChange={(e) => setAnswerText(e.target.value)}
              disabled={isSubmitted || remainingSec <= 0}
              style={{ fontSize: 16, fontWeight: 700, padding: '14px 18px' }}
            />
          </div>
        )}

        {/* 4. SHORT ANSWER */}
        {question.type === 'SHORT_ANSWER' && (
          <div>
            <label style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 8, display: 'block' }}>
              Write your concise response (1-2 sentences):
            </label>
            <textarea
              rows={4}
              placeholder="Explain concept here..."
              value={answerText}
              onChange={(e) => setAnswerText(e.target.value)}
              disabled={isSubmitted || remainingSec <= 0}
              style={{ fontSize: 15, lineHeight: 1.5 }}
            />
          </div>
        )}

        {/* Answer Explanation Card */}
        {revealedAnswerData?.explanation && (
          <div
            style={{
              marginTop: 24,
              padding: '16px 20px',
              borderRadius: 'var(--radius-md)',
              background: 'rgba(99, 102, 241, 0.12)',
              border: '1.5px solid rgba(99, 102, 241, 0.35)',
              textAlign: 'left'
            }}
          >
            <div style={{ fontSize: 13, fontWeight: 800, color: 'var(--accent-primary)', marginBottom: 6, display: 'flex', alignItems: 'center', gap: 6 }}>
              <span>💡 Explanation & Answer Details</span>
            </div>
            <p style={{ fontSize: 14, color: 'var(--text-primary)', lineHeight: 1.5 }}>
              {revealedAnswerData.explanation}
            </p>
          </div>
        )}

        {/* 5. CODING QUESTION */}
        {question.type === 'CODING' && (
          <CodeEditor
            code={code}
            onChange={setCode}
            language={codingLanguage}
            onLanguageChange={setCodingLanguage}
            starterCode={question.starterCode}
            publicTestCases={question.publicTestCases || []}
            onSubmit={handleSubmit}
            isSubmitting={isSubmitting}
            isLocked={isSubmitted || remainingSec <= 0}
          />
        )}
      </div>

      {/* Submit Button Bar (for non-coding questions) */}
      {question.type !== 'CODING' && !isSubmitted && (
        <button
          type="button"
          onClick={handleSubmit}
          disabled={isSubmitting || remainingSec <= 0}
          className="btn btn-primary btn-lg"
          style={{ width: '100%', padding: '16px', fontSize: 18 }}
        >
          {isSubmitting ? (
            <Loader2 size={22} className="animate-spin" />
          ) : (
            <>
              <Send size={20} />
              <span>Submit Answer</span>
            </>
          )}
        </button>
      )}

      {/* Confirmed Lock State Screen */}
      {isSubmitted && (
        <div
          className="card animate-fade-in"
          style={{
            textAlign: 'center',
            padding: 24,
            background: 'rgba(16, 185, 129, 0.12)',
            border: '1.5px solid rgba(16, 185, 129, 0.4)'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10, color: 'var(--success)' }}>
            <CheckCircle2 size={24} />
            <h3 style={{ fontSize: 18, fontWeight: 800 }}>Answer Locked & Transmitted</h3>
          </div>
          <p style={{ fontSize: 13, color: 'var(--text-secondary)', marginTop: 4 }}>
            Recorded by server at{' '}
            <strong style={{ color: 'var(--text-primary)' }}>
              ⚡ {confirmedResult?.responseTimeSec || '0.00'}s
            </strong>
            . Waiting for professor to advance to the next question...
          </p>
        </div>
      )}

      {/* Anti-Cheat Tab Switch Warning Modal */}
      <Modal isOpen={showTabWarning} onClose={() => setShowTabWarning(false)} title="⚠️ Anti-Cheat Notice">
        <div style={{ textAlign: 'center', padding: '10px 0' }}>
          <AlertTriangle size={48} color="var(--warning)" style={{ margin: '0 auto 12px auto' }} />
          <h3 style={{ fontSize: 18, fontWeight: 800 }}>Tab Switch Detected</h3>
          <p style={{ fontSize: 14, color: 'var(--text-secondary)', margin: '10px 0 20px 0' }}>
            Focus loss has been logged and reported to the professor's live control dashboard. Please stay on this tab during the quiz.
          </p>
          <button onClick={() => setShowTabWarning(false)} className="btn btn-primary" style={{ width: '100%' }}>
            I Understand, Return to Quiz
          </button>
        </div>
      </Modal>
    </div>
  );
}
