import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import Sidebar from '../../components/common/Sidebar';
import { useAuth } from '../../context/AuthContext';
import {
  Save,
  Plus,
  Trash2,
  ChevronUp,
  ChevronDown,
  Clock,
  Award,
  Code2,
  CheckCircle2,
  ArrowLeft,
  Loader2,
  Sparkles,
  HelpCircle,
  Eye,
  EyeOff
} from 'lucide-react';

export default function QuizEditor() {
  const { id } = useParams();
  const { token } = useAuth();
  const navigate = useNavigate();
  const isEditing = !!id;

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [timeLimit, setTimeLimit] = useState(30);
  const [shuffleOptions, setShuffleOptions] = useState(false);
  const [allowCopyPaste, setAllowCopyPaste] = useState(true);
  const [showLeaderboardLive, setShowLeaderboardLive] = useState(true);
  const [questions, setQuestions] = useState([]);
  const [loading, setLoading] = useState(isEditing);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (isEditing) {
      fetchQuiz();
    } else {
      // Initialize with one default MCQ question
      setQuestions([
        {
          type: 'MCQ',
          text: 'What is the time complexity of binary search on a sorted array?',
          marks: 2,
          timeLimit: 30,
          explanation: 'Binary search divides the search space in half each time.',
          options: [
            { text: 'O(n)', isCorrect: false },
            { text: 'O(log n)', isCorrect: true },
            { text: 'O(n²)', isCorrect: false },
            { text: 'O(1)', isCorrect: false }
          ],
          testCases: []
        }
      ]);
    }
  }, [id]);

  const fetchQuiz = async () => {
    try {
      const res = await fetch(`/api/quizzes/${id}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      if (res.ok && data.quiz) {
        const q = data.quiz;
        setTitle(q.title);
        setDescription(q.description || '');
        setTimeLimit(q.timeLimit);
        setShuffleOptions(q.shuffleOptions);
        setAllowCopyPaste(q.allowCopyPaste);
        setShowLeaderboardLive(q.showLeaderboardLive);
        setQuestions(
          q.questions.map((ques) => ({
            ...ques,
            options: ques.options || [],
            testCases: ques.testCases || []
          }))
        );
      }
    } catch (err) {
      alert('Failed to load quiz: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const addQuestion = (type = 'MCQ') => {
    const newQ = {
      type,
      text: '',
      marks: 2,
      timeLimit: 30,
      explanation: '',
      options: [],
      testCases: []
    };

    if (type === 'MCQ' || type === 'MULTI_MCQ') {
      newQ.options = [
        { text: 'Option A', isCorrect: true },
        { text: 'Option B', isCorrect: false },
        { text: 'Option C', isCorrect: false },
        { text: 'Option D', isCorrect: false }
      ];
    } else if (type === 'TRUE_FALSE') {
      newQ.options = [
        { text: 'True', isCorrect: true },
        { text: 'False', isCorrect: false }
      ];
    } else if (type === 'FILL_BLANK') {
      newQ.acceptedAnswers = '["O(log n)", "O(logn)"]';
    } else if (type === 'CODING') {
      newQ.codingLanguage = 'python';
      newQ.starterCode = '# Write your solution\nimport sys\n\nline = sys.stdin.read().strip()\nprint(line)\n';
      newQ.testCases = [
        { input: 'hello', expectedOutput: 'hello', isHidden: false },
        { input: 'world', expectedOutput: 'world', isHidden: true }
      ];
    }

    setQuestions([...questions, newQ]);
  };

  const removeQuestion = (index) => {
    setQuestions(questions.filter((_, idx) => idx !== index));
  };

  const moveQuestion = (index, direction) => {
    const targetIdx = index + direction;
    if (targetIdx < 0 || targetIdx >= questions.length) return;
    const updated = [...questions];
    const temp = updated[index];
    updated[index] = updated[targetIdx];
    updated[targetIdx] = temp;
    setQuestions(updated);
  };

  const handleQuestionChange = (index, field, value) => {
    const updated = [...questions];
    updated[index][field] = value;
    setQuestions(updated);
  };

  const handleOptionChange = (qIndex, optIndex, field, value) => {
    const updated = [...questions];
    const q = updated[qIndex];
    if (field === 'isCorrect' && q.type === 'MCQ') {
      // Single correct option: reset others
      q.options.forEach((opt, idx) => {
        opt.isCorrect = idx === optIndex;
      });
    } else {
      q.options[optIndex][field] = value;
    }
    setQuestions(updated);
  };

  const addOption = (qIndex) => {
    const updated = [...questions];
    updated[qIndex].options.push({ text: `Option ${updated[qIndex].options.length + 1}`, isCorrect: false });
    setQuestions(updated);
  };

  const removeOption = (qIndex, optIndex) => {
    const updated = [...questions];
    updated[qIndex].options = updated[qIndex].options.filter((_, idx) => idx !== optIndex);
    setQuestions(updated);
  };

  const addTestCase = (qIndex) => {
    const updated = [...questions];
    updated[qIndex].testCases.push({ input: '', expectedOutput: '', isHidden: false });
    setQuestions(updated);
  };

  const handleTestCaseChange = (qIndex, tcIndex, field, value) => {
    const updated = [...questions];
    updated[qIndex].testCases[tcIndex][field] = value;
    setQuestions(updated);
  };

  const removeTestCase = (qIndex, tcIndex) => {
    const updated = [...questions];
    updated[qIndex].testCases = updated[qIndex].testCases.filter((_, idx) => idx !== tcIndex);
    setQuestions(updated);
  };

  const handleSave = async (e) => {
    e.preventDefault();
    if (!title.trim()) {
      return alert('Quiz title is required.');
    }
    if (questions.length === 0) {
      return alert('Please add at least one question.');
    }

    setSaving(true);
    try {
      const payload = {
        title,
        description,
        timeLimit: Number(timeLimit),
        shuffleOptions,
        allowCopyPaste,
        showLeaderboardLive,
        questions: questions.map((q, idx) => ({
          ...q,
          order: idx
        }))
      };

      const url = isEditing ? `/api/quizzes/${id}` : '/api/quizzes';
      const method = isEditing ? 'PUT' : 'POST';

      const res = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify(payload)
      });

      const data = await res.json();
      if (res.ok) {
        navigate('/professor/quizzes');
      } else {
        alert(data.message || 'Failed to save quiz.');
      }
    } catch (err) {
      alert('Save error: ' + err.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div style={{ display: 'flex' }}>
      <Sidebar />

      <main style={{ flex: 1, padding: '32px 36px', overflowY: 'auto' }}>
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 28, flexWrap: 'wrap', gap: 16 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
            <Link to="/professor/quizzes" className="btn btn-secondary btn-icon">
              <ArrowLeft size={18} />
            </Link>
            <div>
              <h1 style={{ fontSize: 26, fontWeight: 800 }}>
                {isEditing ? 'Edit Quiz' : 'Create New Quiz'}
              </h1>
              <p style={{ fontSize: 13, color: 'var(--text-secondary)' }}>
                Configure questions, accepted answers, code execution test cases, and anti-cheat settings.
              </p>
            </div>
          </div>

          <button onClick={handleSave} disabled={saving} className="btn btn-primary btn-lg">
            {saving ? <Loader2 size={18} className="animate-spin" /> : <Save size={18} />}
            <span>{isEditing ? 'Save Changes' : 'Create Quiz'}</span>
          </button>
        </div>

        {loading ? (
          <div style={{ padding: 60, textAlign: 'center', color: 'var(--text-muted)' }}>
            <Loader2 size={28} className="animate-spin" style={{ margin: '0 auto 12px auto' }} />
            Loading quiz configuration...
          </div>
        ) : (
          <form onSubmit={handleSave} style={{ display: 'flex', flexDirection: 'column', gap: 28 }}>
            {/* General Quiz Settings Card */}
            <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
              <h3 style={{ fontSize: 18, fontWeight: 800 }}>General Information</h3>

              <div>
                <label style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 6, display: 'block' }}>
                  Quiz Title *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Computer Networks & Systems Test"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  style={{ fontSize: 16, fontWeight: 600 }}
                />
              </div>

              <div>
                <label style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 6, display: 'block' }}>
                  Description (Optional)
                </label>
                <textarea
                  rows={2}
                  placeholder="Instructions for students..."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 16 }}>
                <div>
                  <label style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 6, display: 'block' }}>
                    Default Timer (Seconds / Question)
                  </label>
                  <input
                    type="number"
                    min={5}
                    max={300}
                    value={timeLimit}
                    onChange={(e) => setTimeLimit(e.target.value)}
                  />
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', gap: 10 }}>
                  <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, cursor: 'pointer' }}>
                    <input
                      type="checkbox"
                      checked={showLeaderboardLive}
                      onChange={(e) => setShowLeaderboardLive(e.target.checked)}
                      style={{ width: 'auto' }}
                    />
                    <span>Show Live Leaderboard to Students</span>
                  </label>
                  <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, cursor: 'pointer' }}>
                    <input
                      type="checkbox"
                      checked={shuffleOptions}
                      onChange={(e) => setShuffleOptions(e.target.checked)}
                      style={{ width: 'auto' }}
                    />
                    <span>Randomize MCQ Option Order</span>
                  </label>
                </div>
              </div>
            </div>

            {/* Questions List */}
            <div>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
                <h3 style={{ fontSize: 20, fontWeight: 800 }}>
                  Questions ({questions.length})
                </h3>

                {/* Add Question Menu */}
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                  <button type="button" onClick={() => addQuestion('MCQ')} className="btn btn-secondary btn-sm">
                    + MCQ
                  </button>
                  <button type="button" onClick={() => addQuestion('MULTI_MCQ')} className="btn btn-secondary btn-sm">
                    + Multi-MCQ
                  </button>
                  <button type="button" onClick={() => addQuestion('FILL_BLANK')} className="btn btn-secondary btn-sm">
                    + Fill Blank
                  </button>
                  <button type="button" onClick={() => addQuestion('TRUE_FALSE')} className="btn btn-secondary btn-sm">
                    + True/False
                  </button>
                  <button type="button" onClick={() => addQuestion('CODING')} className="btn btn-secondary btn-sm">
                    + Coding
                  </button>
                  <button type="button" onClick={() => addQuestion('SHORT_ANSWER')} className="btn btn-secondary btn-sm">
                    + Short Answer
                  </button>
                </div>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
                {questions.map((q, qIdx) => (
                  <div key={qIdx} className="card" style={{ borderLeft: '4px solid var(--accent-primary)' }}>
                    {/* Question Header Bar */}
                    <div
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        marginBottom: 16,
                        flexWrap: 'wrap',
                        gap: 10
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <span style={{ fontSize: 16, fontWeight: 800 }}>Q{qIdx + 1}.</span>
                        <select
                          value={q.type}
                          onChange={(e) => handleQuestionChange(qIdx, 'type', e.target.value)}
                          style={{ width: 'auto', padding: '4px 10px', fontSize: 13, fontWeight: 700 }}
                        >
                          <option value="MCQ">Single MCQ</option>
                          <option value="MULTI_MCQ">Multiple Correct MCQ</option>
                          <option value="FILL_BLANK">Fill in the Blank</option>
                          <option value="TRUE_FALSE">True / False</option>
                          <option value="CODING">Coding Problem</option>
                          <option value="SHORT_ANSWER">Short Answer</option>
                        </select>
                      </div>

                      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12 }}>
                          <span>Marks:</span>
                          <input
                            type="number"
                            min={1}
                            max={50}
                            value={q.marks || 1}
                            onChange={(e) => handleQuestionChange(qIdx, 'marks', e.target.value)}
                            style={{ width: 60, padding: '4px 8px', fontSize: 12 }}
                          />
                        </div>

                        <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12 }}>
                          <span>Time (s):</span>
                          <input
                            type="number"
                            min={5}
                            max={300}
                            value={q.timeLimit || timeLimit}
                            onChange={(e) => handleQuestionChange(qIdx, 'timeLimit', e.target.value)}
                            style={{ width: 70, padding: '4px 8px', fontSize: 12 }}
                          />
                        </div>

                        <div style={{ display: 'flex', gap: 4 }}>
                          <button
                            type="button"
                            onClick={() => moveQuestion(qIdx, -1)}
                            disabled={qIdx === 0}
                            className="btn btn-secondary btn-icon"
                            style={{ width: 30, height: 30 }}
                          >
                            <ChevronUp size={16} />
                          </button>
                          <button
                            type="button"
                            onClick={() => moveQuestion(qIdx, 1)}
                            disabled={qIdx === questions.length - 1}
                            className="btn btn-secondary btn-icon"
                            style={{ width: 30, height: 30 }}
                          >
                            <ChevronDown size={16} />
                          </button>
                          <button
                            type="button"
                            onClick={() => removeQuestion(qIdx)}
                            className="btn btn-secondary btn-icon"
                            style={{ width: 30, height: 30, color: 'var(--danger)' }}
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                      </div>
                    </div>

                    {/* Question Prompt */}
                    <div style={{ marginBottom: 14 }}>
                      <textarea
                        rows={2}
                        placeholder="Enter the question text here..."
                        value={q.text}
                        onChange={(e) => handleQuestionChange(qIdx, 'text', e.target.value)}
                        style={{ fontSize: 15, fontWeight: 500 }}
                      />
                    </div>

                    {/* TYPE SPECIFIC EDITORS */}
                    {(q.type === 'MCQ' || q.type === 'MULTI_MCQ' || q.type === 'TRUE_FALSE') && (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginTop: 10 }}>
                        <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-muted)' }}>
                          OPTIONS ({q.type === 'MCQ' ? 'Select the single correct answer' : 'Check all correct options'})
                        </div>

                        {q.options.map((opt, optIdx) => (
                          <div key={optIdx} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                            <input
                              type={q.type === 'MCQ' ? 'radio' : 'checkbox'}
                              name={`q_${qIdx}_correct`}
                              checked={opt.isCorrect}
                              onChange={(e) =>
                                handleOptionChange(qIdx, optIdx, 'isCorrect', e.target.checked)
                              }
                              style={{ width: 18, height: 18, cursor: 'pointer' }}
                            />
                            <input
                              type="text"
                              placeholder={`Option ${optIdx + 1}`}
                              value={opt.text}
                              onChange={(e) => handleOptionChange(qIdx, optIdx, 'text', e.target.value)}
                            />
                            {q.type !== 'TRUE_FALSE' && (
                              <button
                                type="button"
                                onClick={() => removeOption(qIdx, optIdx)}
                                style={{ color: 'var(--text-muted)', padding: 6 }}
                              >
                                <Trash2 size={15} />
                              </button>
                            )}
                          </div>
                        ))}

                        {q.type !== 'TRUE_FALSE' && (
                          <button
                            type="button"
                            onClick={() => addOption(qIdx)}
                            className="btn btn-secondary btn-sm"
                            style={{ alignSelf: 'flex-start', marginTop: 4 }}
                          >
                            + Add Option
                          </button>
                        )}
                      </div>
                    )}

                    {q.type === 'FILL_BLANK' && (
                      <div style={{ marginTop: 10 }}>
                        <label style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-muted)', marginBottom: 6, display: 'block' }}>
                          Accepted Answers (JSON Array or Comma Separated)
                        </label>
                        <input
                          type="text"
                          placeholder='e.g. ["O(log n)", "O(logn)", "log n"]'
                          value={q.acceptedAnswers || ''}
                          onChange={(e) => handleQuestionChange(qIdx, 'acceptedAnswers', e.target.value)}
                        />
                        <span style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 4, display: 'block' }}>
                          Evaluator ignores spaces and casing differences automatically.
                        </span>
                      </div>
                    )}

                    {q.type === 'SHORT_ANSWER' && (
                      <div style={{ marginTop: 10 }}>
                        <label style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-muted)', marginBottom: 6, display: 'block' }}>
                          Expected Key Phrases (Optional for auto-match, otherwise manual grading)
                        </label>
                        <input
                          type="text"
                          placeholder='e.g. ["many forms", "overriding", "overloading"]'
                          value={q.acceptedAnswers || ''}
                          onChange={(e) => handleQuestionChange(qIdx, 'acceptedAnswers', e.target.value)}
                        />
                      </div>
                    )}

                    {q.type === 'CODING' && (
                      <div style={{ marginTop: 14, display: 'flex', flexDirection: 'column', gap: 14 }}>
                        <div style={{ display: 'flex', gap: 14, alignItems: 'center' }}>
                          <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-muted)' }}>LANGUAGE:</span>
                          <select
                            value={q.codingLanguage || 'python'}
                            onChange={(e) => handleQuestionChange(qIdx, 'codingLanguage', e.target.value)}
                            style={{ width: 'auto', padding: '4px 10px', fontSize: 13 }}
                          >
                            <option value="python">Python 3</option>
                            <option value="javascript">JavaScript (Node.js)</option>
                            <option value="cpp">C++</option>
                            <option value="c">C</option>
                            <option value="java">Java</option>
                          </select>
                        </div>

                        <div>
                          <label style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-muted)', marginBottom: 6, display: 'block' }}>
                            Starter Code Template
                          </label>
                          <textarea
                            rows={5}
                            value={q.starterCode || ''}
                            onChange={(e) => handleQuestionChange(qIdx, 'starterCode', e.target.value)}
                            style={{ fontFamily: 'var(--font-mono)', fontSize: 13, background: '#0d1117', color: '#e6edf3' }}
                          />
                        </div>

                        {/* Test Cases List */}
                        <div>
                          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
                            <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-muted)' }}>
                              TEST CASES (Public & Hidden)
                            </span>
                            <button
                              type="button"
                              onClick={() => addTestCase(qIdx)}
                              className="btn btn-secondary btn-sm"
                            >
                              + Add Test Case
                            </button>
                          </div>

                          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                            {q.testCases.map((tc, tcIdx) => (
                              <div
                                key={tcIdx}
                                style={{
                                  background: 'var(--bg-tertiary)',
                                  padding: 12,
                                  borderRadius: 'var(--radius-md)',
                                  display: 'grid',
                                  gridTemplateColumns: '1fr 1fr auto auto',
                                  gap: 10,
                                  alignItems: 'center'
                                }}
                              >
                                <input
                                  type="text"
                                  placeholder="Input stdin (e.g. hello)"
                                  value={tc.input}
                                  onChange={(e) => handleTestCaseChange(qIdx, tcIdx, 'input', e.target.value)}
                                  style={{ fontFamily: 'var(--font-mono)', fontSize: 12 }}
                                />
                                <input
                                  type="text"
                                  placeholder="Expected stdout (e.g. olleh)"
                                  value={tc.expectedOutput}
                                  onChange={(e) => handleTestCaseChange(qIdx, tcIdx, 'expectedOutput', e.target.value)}
                                  style={{ fontFamily: 'var(--font-mono)', fontSize: 12 }}
                                />
                                <label style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 12, cursor: 'pointer' }}>
                                  <input
                                    type="checkbox"
                                    checked={tc.isHidden}
                                    onChange={(e) => handleTestCaseChange(qIdx, tcIdx, 'isHidden', e.target.checked)}
                                    style={{ width: 'auto' }}
                                  />
                                  <span>{tc.isHidden ? <EyeOff size={14} /> : <Eye size={14} />} Hidden</span>
                                </label>
                                <button
                                  type="button"
                                  onClick={() => removeTestCase(qIdx, tcIdx)}
                                  style={{ color: 'var(--danger)', padding: 4 }}
                                >
                                  <Trash2 size={15} />
                                </button>
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Explanation */}
                    <div style={{ marginTop: 12 }}>
                      <input
                        type="text"
                        placeholder="Explanation shown after answer is revealed (optional)..."
                        value={q.explanation || ''}
                        onChange={(e) => handleQuestionChange(qIdx, 'explanation', e.target.value)}
                        style={{ fontSize: 13 }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </form>
        )}
      </main>
    </div>
  );
}
