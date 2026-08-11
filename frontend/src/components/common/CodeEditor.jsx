import React, { useState } from 'react';
import { Play, Send, RotateCcw, Terminal, CheckCircle2, XCircle, AlertCircle, Loader2 } from 'lucide-react';

export default function CodeEditor({
  code,
  onChange,
  language = 'python',
  onLanguageChange,
  starterCode = '',
  publicTestCases = [],
  onSubmit,
  isSubmitting = false,
  isLocked = false
}) {
  const [activeTab, setActiveTab] = useState('editor'); // 'editor', 'testcases', 'customRun'
  const [customInput, setCustomInput] = useState('');
  const [runOutput, setRunOutput] = useState(null);
  const [isRunning, setIsRunning] = useState(false);

  const languages = [
    { label: 'Python 3', value: 'python' },
    { label: 'JavaScript (Node.js)', value: 'javascript' },
    { label: 'C++', value: 'cpp' },
    { label: 'C', value: 'c' },
    { label: 'Java', value: 'java' }
  ];

  const handleKeyDown = (e) => {
    if (e.key === 'Tab') {
      e.preventDefault();
      const start = e.target.selectionStart;
      const end = e.target.selectionEnd;
      const newCode = code.substring(0, start) + '    ' + code.substring(end);
      onChange(newCode);
      setTimeout(() => {
        e.target.selectionStart = e.target.selectionEnd = start + 4;
      }, 0);
    }
  };

  const handleRunCustomCode = async () => {
    setIsRunning(true);
    setRunOutput(null);
    try {
      const res = await fetch('/api/code/run', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          language,
          code,
          customInput
        })
      });
      const data = await res.json();
      setRunOutput(data);
      setActiveTab('customRun');
    } catch (err) {
      setRunOutput({ status: 'ERROR', stderr: 'Network or execution error: ' + err.message });
      setActiveTab('customRun');
    } finally {
      setIsRunning(false);
    }
  };

  const lineCount = (code || '').split('\n').length;
  const lineNumbers = Array.from({ length: Math.max(lineCount, 8) }, (_, i) => i + 1);

  return (
    <div
      style={{
        background: '#0d1117',
        border: '1px solid var(--border-color)',
        borderRadius: 'var(--radius-lg)',
        overflow: 'hidden',
        boxShadow: 'var(--shadow-lg)'
      }}
    >
      {/* Editor Top Bar */}
      <div
        style={{
          background: '#161b22',
          padding: '10px 16px',
          borderBottom: '1px solid rgba(255, 255, 255, 0.1)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: 10
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          {/* Language Selector */}
          <select
            value={language}
            onChange={(e) => onLanguageChange && onLanguageChange(e.target.value)}
            disabled={isLocked}
            style={{
              padding: '6px 12px',
              fontSize: 13,
              fontWeight: 600,
              background: '#21262d',
              borderColor: 'rgba(255, 255, 255, 0.15)',
              color: '#c9d1d9',
              width: 'auto'
            }}
          >
            {languages.map((l) => (
              <option key={l.value} value={l.value}>
                {l.label}
              </option>
            ))}
          </select>

          {/* Tab Navigation */}
          <div style={{ display: 'flex', gap: 4 }}>
            <button
              onClick={() => setActiveTab('editor')}
              style={{
                padding: '6px 12px',
                fontSize: 12,
                fontWeight: 600,
                borderRadius: 'var(--radius-sm)',
                background: activeTab === 'editor' ? 'rgba(99, 102, 241, 0.2)' : 'transparent',
                color: activeTab === 'editor' ? '#818cf8' : '#8b949e',
                border: activeTab === 'editor' ? '1px solid rgba(99, 102, 241, 0.4)' : 'none'
              }}
            >
              Code Solution
            </button>
            {publicTestCases.length > 0 && (
              <button
                onClick={() => setActiveTab('testcases')}
                style={{
                  padding: '6px 12px',
                  fontSize: 12,
                  fontWeight: 600,
                  borderRadius: 'var(--radius-sm)',
                  background: activeTab === 'testcases' ? 'rgba(99, 102, 241, 0.2)' : 'transparent',
                  color: activeTab === 'testcases' ? '#818cf8' : '#8b949e',
                  border: activeTab === 'testcases' ? '1px solid rgba(99, 102, 241, 0.4)' : 'none'
                }}
              >
                Sample Tests ({publicTestCases.length})
              </button>
            )}
            <button
              onClick={() => setActiveTab('customRun')}
              style={{
                padding: '6px 12px',
                fontSize: 12,
                fontWeight: 600,
                borderRadius: 'var(--radius-sm)',
                background: activeTab === 'customRun' ? 'rgba(99, 102, 241, 0.2)' : 'transparent',
                color: activeTab === 'customRun' ? '#818cf8' : '#8b949e',
                border: activeTab === 'customRun' ? '1px solid rgba(99, 102, 241, 0.4)' : 'none'
              }}
            >
              Test Console {runOutput && '•'}
            </button>
          </div>
        </div>

        {/* Action Buttons */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          {starterCode && !isLocked && (
            <button
              onClick={() => onChange(starterCode)}
              className="btn btn-secondary btn-sm"
              title="Reset to starter code"
              style={{ padding: '6px 10px', fontSize: 12 }}
            >
              <RotateCcw size={14} />
              <span>Reset</span>
            </button>
          )}

          <button
            onClick={handleRunCustomCode}
            disabled={isRunning || isLocked}
            className="btn btn-secondary btn-sm"
            style={{
              padding: '6px 12px',
              fontSize: 12,
              background: '#238636',
              color: '#ffffff',
              borderColor: '#2ea043'
            }}
          >
            {isRunning ? <Loader2 size={14} className="animate-spin" /> : <Play size={14} fill="#ffffff" />}
            <span>Run Code</span>
          </button>

          {onSubmit && (
            <button
              onClick={onSubmit}
              disabled={isSubmitting || isLocked}
              className="btn btn-primary btn-sm"
              style={{ padding: '6px 14px', fontSize: 13 }}
            >
              {isSubmitting ? <Loader2 size={14} className="animate-spin" /> : <Send size={14} />}
              <span>{isLocked ? 'Submitted' : 'Submit Code'}</span>
            </button>
          )}
        </div>
      </div>

      {/* Editor Content Area */}
      {activeTab === 'editor' && (
        <div style={{ display: 'flex', minHeight: 280, position: 'relative' }}>
          {/* Line Numbers */}
          <div
            style={{
              width: 44,
              padding: '12px 6px',
              background: '#0d1117',
              borderRight: '1px solid rgba(255, 255, 255, 0.08)',
              color: '#484f58',
              fontFamily: 'var(--font-mono)',
              fontSize: 13,
              lineHeight: '22px',
              textAlign: 'right',
              userSelect: 'none'
            }}
          >
            {lineNumbers.map((num) => (
              <div key={num}>{num}</div>
            ))}
          </div>

          {/* Textarea */}
          <textarea
            value={code}
            onChange={(e) => onChange(e.target.value)}
            onKeyDown={handleKeyDown}
            disabled={isLocked}
            placeholder="Write your code here..."
            spellCheck={false}
            style={{
              flex: 1,
              padding: '12px 14px',
              background: 'transparent',
              border: 'none',
              borderRadius: 0,
              color: '#e6edf3',
              fontFamily: 'var(--font-mono)',
              fontSize: 13.5,
              lineHeight: '22px',
              resize: 'vertical',
              minHeight: 280,
              outline: 'none',
              boxShadow: 'none',
              tabSize: 4
            }}
          />
        </div>
      )}

      {/* Sample Test Cases View */}
      {activeTab === 'testcases' && (
        <div style={{ padding: 18, background: '#0d1117', minHeight: 280 }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: '#8b949e', marginBottom: 14 }}>
            Sample Public Test Cases
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {publicTestCases.map((tc, idx) => (
              <div
                key={tc.id || idx}
                style={{
                  background: '#161b22',
                  border: '1px solid rgba(255, 255, 255, 0.1)',
                  borderRadius: 'var(--radius-md)',
                  padding: 14
                }}
              >
                <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--accent-primary)', marginBottom: 8 }}>
                  Sample Case #{idx + 1} {tc.explanation && `— ${tc.explanation}`}
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                  <div>
                    <div style={{ fontSize: 11, color: '#8b949e', marginBottom: 4 }}>Input</div>
                    <pre style={{ background: '#0d1117', padding: 8, borderRadius: 6, fontSize: 12, color: '#58a6ff' }}>
                      {tc.input || '(empty)'}
                    </pre>
                  </div>
                  <div>
                    <div style={{ fontSize: 11, color: '#8b949e', marginBottom: 4 }}>Expected Output</div>
                    <pre style={{ background: '#0d1117', padding: 8, borderRadius: 6, fontSize: 12, color: '#7ee787' }}>
                      {tc.expectedOutput}
                    </pre>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Custom Test Run Console */}
      {activeTab === 'customRun' && (
        <div style={{ padding: 18, background: '#0d1117', minHeight: 280 }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
            {/* Custom Input */}
            <div>
              <div style={{ fontSize: 12, fontWeight: 700, color: '#8b949e', marginBottom: 6 }}>
                Custom Stdin Input
              </div>
              <textarea
                value={customInput}
                onChange={(e) => setCustomInput(e.target.value)}
                placeholder="Enter input passed to standard input..."
                rows={5}
                style={{
                  background: '#161b22',
                  borderColor: 'rgba(255, 255, 255, 0.15)',
                  fontFamily: 'var(--font-mono)',
                  fontSize: 12.5,
                  color: '#e6edf3'
                }}
              />
            </div>

            {/* Run Output */}
            <div>
              <div style={{ fontSize: 12, fontWeight: 700, color: '#8b949e', marginBottom: 6, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <span>Execution Output</span>
                {runOutput && (
                  <span style={{ fontSize: 11, color: runOutput.status === 'SUCCESS' ? '#7ee787' : '#f85149' }}>
                    {runOutput.status} ({runOutput.executionTimeMs}ms)
                  </span>
                )}
              </div>
              <div
                style={{
                  background: '#161b22',
                  border: '1px solid rgba(255, 255, 255, 0.1)',
                  borderRadius: 'var(--radius-md)',
                  padding: 10,
                  minHeight: 120,
                  fontFamily: 'var(--font-mono)',
                  fontSize: 12.5
                }}
              >
                {isRunning ? (
                  <div style={{ color: '#8b949e', display: 'flex', alignItems: 'center', gap: 6 }}>
                    <Loader2 size={14} className="animate-spin" /> Running code in sandbox...
                  </div>
                ) : runOutput ? (
                  <div>
                    {runOutput.stdout && (
                      <pre style={{ color: '#7ee787', whiteSpace: 'pre-wrap' }}>{runOutput.stdout}</pre>
                    )}
                    {runOutput.stderr && (
                      <pre style={{ color: '#f85149', whiteSpace: 'pre-wrap' }}>{runOutput.stderr}</pre>
                    )}
                    {!runOutput.stdout && !runOutput.stderr && (
                      <span style={{ color: '#8b949e' }}>(No output generated)</span>
                    )}
                  </div>
                ) : (
                  <span style={{ color: '#6e7681' }}>Click "Run Code" above to execute with custom input.</span>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
