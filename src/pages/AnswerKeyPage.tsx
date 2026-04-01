import { useState, useRef, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTestStore } from '@/store/testStore';
import DarkModeToggle from '@/components/DarkModeToggle';
import type { AnswerKey, Option, AnswerKeyValue } from '@/types/test';

const validOptions = ['A', 'B', 'C', 'D'];
const numberToOption: Record<string, string> = { '1': 'A', '2': 'B', '3': 'C', '4': 'D' };

const AnswerKeyPage = () => {
  const { result, setAnswerKey } = useTestStore();
  const navigate = useNavigate();

  const questions = result?.responses ?? [];
  const sections = result?.config?.sections ?? [];
  const [answers, setAnswers] = useState<AnswerKey>({});
  const [currentIdx, setCurrentIdx] = useState(0);
  const [multiMode, setMultiMode] = useState(false); // M key mode
  const [multiSelections, setMultiSelections] = useState<Option[]>([]);
  const [numericalInput, setNumericalInput] = useState('');
  const containerRef = useRef<HTMLDivElement>(null);
  const rowRefs = useRef<Record<number, HTMLDivElement | null>>({});

  const isNumericalQ = useCallback((questionNo: number) => {
    return sections.some(s => s.type === 'numerical' && questionNo >= s.startQ && questionNo <= s.endQ);
  }, [sections]);

  useEffect(() => {
    containerRef.current?.focus();
  }, [currentIdx]);

  // Auto-scroll to current question
  useEffect(() => {
    const qNo = questions[currentIdx]?.questionNo;
    if (qNo != null && rowRefs.current[qNo]) {
      rowRefs.current[qNo]?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  }, [currentIdx, questions]);

  // Reset modes when switching questions
  useEffect(() => {
    setMultiMode(false);
    setMultiSelections([]);
    const qNo = questions[currentIdx]?.questionNo;
    if (qNo != null && isNumericalQ(qNo)) {
      const existing = answers[qNo];
      setNumericalInput(typeof existing === 'string' && existing !== 'BONUS' ? existing : '');
    } else {
      setNumericalInput('');
    }
  }, [currentIdx]);

  if (!result) {
    navigate('/');
    return null;
  }

  const currentQ = questions[currentIdx];
  const totalFilled = Object.keys(answers).length;
  const isCurrentNumerical = currentQ ? isNumericalQ(currentQ.questionNo) : false;

  const advanceNext = () => {
    if (currentIdx < questions.length - 1) {
      setTimeout(() => setCurrentIdx(i => i + 1), 80);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!currentQ) return;

    // Numerical question mode
    if (isCurrentNumerical) {
      if (e.key === 'Enter') {
        if (numericalInput.trim()) {
          setAnswers(prev => ({ ...prev, [currentQ.questionNo]: numericalInput.trim() }));
        }
        advanceNext();
        return;
      }
      if (e.key === 'b' || e.key === 'B') {
        if (!e.ctrlKey && !e.metaKey) {
          // Check if this is meant to be BONUS (press shift+B or just B when input is empty)
          if (e.shiftKey || numericalInput === '') {
            e.preventDefault();
            setAnswers(prev => ({ ...prev, [currentQ.questionNo]: 'BONUS' as AnswerKeyValue }));
            advanceNext();
            return;
          }
        }
      }
      // Allow typing numbers, decimals, minus
      if (/^[0-9.\-]$/.test(e.key)) {
        setNumericalInput(prev => prev + e.key);
        return;
      }
      if (e.key === 'Backspace') {
        if (numericalInput) {
          setNumericalInput(prev => prev.slice(0, -1));
        } else if (currentIdx > 0) {
          setCurrentIdx(i => i - 1);
        }
        return;
      }
      if (e.key === 'ArrowUp' && currentIdx > 0) { setCurrentIdx(i => i - 1); return; }
      if (e.key === 'ArrowDown' && currentIdx < questions.length - 1) { setCurrentIdx(i => i + 1); return; }
      return;
    }

    // Multi-correct mode
    if (multiMode) {
      const mapped = numberToOption[e.key];
      const key = mapped ?? e.key.toUpperCase();
      if (validOptions.includes(key)) {
        setMultiSelections(prev => {
          if (prev.includes(key as Option)) return prev.filter(o => o !== key);
          return [...prev, key as Option];
        });
        return;
      }
      if (e.key === 'Enter') {
        if (multiSelections.length > 0) {
          setAnswers(prev => ({ ...prev, [currentQ.questionNo]: [...multiSelections] as AnswerKeyValue }));
        }
        setMultiMode(false);
        setMultiSelections([]);
        advanceNext();
        return;
      }
      if (e.key === 'Escape') {
        setMultiMode(false);
        setMultiSelections([]);
        return;
      }
      return;
    }

    // Normal MCQ mode
    // B = Bonus
    if ((e.key === 'b' || e.key === 'B') && !e.ctrlKey && !e.metaKey) {
      setAnswers(prev => ({ ...prev, [currentQ.questionNo]: 'BONUS' as AnswerKeyValue }));
      advanceNext();
      return;
    }
    // M = Multiple correct mode
    if ((e.key === 'm' || e.key === 'M') && !e.ctrlKey && !e.metaKey) {
      setMultiMode(true);
      setMultiSelections([]);
      return;
    }

    const mapped = numberToOption[e.key];
    const key = mapped ?? e.key.toUpperCase();
    if (validOptions.includes(key)) {
      setAnswers(prev => ({ ...prev, [currentQ.questionNo]: key as Option }));
      advanceNext();
    } else if (e.key === 'Enter') {
      advanceNext();
    } else if (e.key === 'Backspace') {
      if (answers[currentQ.questionNo]) {
        setAnswers(prev => {
          const copy = { ...prev };
          delete copy[currentQ.questionNo];
          return copy;
        });
      } else if (currentIdx > 0) {
        setCurrentIdx(i => i - 1);
      }
    } else if (e.key === 'ArrowUp' && currentIdx > 0) {
      setCurrentIdx(i => i - 1);
    } else if (e.key === 'ArrowDown' && currentIdx < questions.length - 1) {
      setCurrentIdx(i => i + 1);
    }
  };

  const handleSubmit = () => {
    setAnswerKey(answers);
    navigate('/results');
  };

  const formatAnswer = (val: AnswerKeyValue | undefined): string => {
    if (val === undefined || val === null) return '';
    if (val === 'BONUS') return '🎁 BONUS';
    if (Array.isArray(val)) return val.join(', ');
    return String(val);
  };

  const getAnswerBadgeClass = (val: AnswerKeyValue | undefined): string => {
    if (val === 'BONUS') return 'text-[hsl(var(--accent))]';
    if (Array.isArray(val)) return 'text-primary';
    return 'text-[hsl(var(--success))]';
  };

  return (
    <div
      className="min-h-screen bg-background p-4 outline-none"
      tabIndex={0}
      ref={containerRef}
      onKeyDown={handleKeyDown}
    >
      <div className="max-w-2xl mx-auto space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button onClick={() => navigate('/')} className="px-2 py-2 border border-border rounded text-sm text-foreground hover:bg-muted" title="Home">🏠</button>
            <button onClick={() => navigate('/results')} className="px-3 py-2 border border-border rounded text-sm text-foreground hover:bg-muted">← Back</button>
            <h1 className="text-xl font-bold font-mono text-foreground">Answer Key</h1>
          </div>
          <div className="flex items-center gap-3">
            <span className="font-mono text-sm text-muted-foreground">{totalFilled}/{questions.length}</span>
            <DarkModeToggle />
          </div>
        </div>

        {/* Instructions */}
        <div className="bg-muted p-3 rounded text-xs text-muted-foreground space-y-1">
          <div>
            <kbd className="px-1.5 py-0.5 bg-card border border-border rounded font-mono">A/1</kbd>{' '}
            <kbd className="px-1.5 py-0.5 bg-card border border-border rounded font-mono">B/2</kbd>{' '}
            <kbd className="px-1.5 py-0.5 bg-card border border-border rounded font-mono">C/3</kbd>{' '}
            <kbd className="px-1.5 py-0.5 bg-card border border-border rounded font-mono">D/4</kbd>{' '}
            set answer • <kbd className="px-1.5 py-0.5 bg-card border border-border rounded font-mono">↑↓</kbd> navigate •{' '}
            <kbd className="px-1.5 py-0.5 bg-card border border-border rounded font-mono">⌫</kbd> clear
          </div>
          <div>
            <kbd className="px-1.5 py-0.5 bg-card border border-border rounded font-mono">B</kbd> = Bonus (all get marks) •{' '}
            <kbd className="px-1.5 py-0.5 bg-card border border-border rounded font-mono">M</kbd> = Multiple correct → select options → <kbd className="px-1.5 py-0.5 bg-card border border-border rounded font-mono">Enter</kbd>
          </div>
          <div>
            <kbd className="px-1.5 py-0.5 bg-card border border-border rounded font-mono">Enter</kbd> = move to next question
          </div>
        </div>

        {/* Multi-mode indicator */}
        {multiMode && (
          <div className="bg-primary/10 border border-primary/30 rounded-lg p-3 text-sm font-mono">
            <span className="text-primary font-bold">MULTI-SELECT MODE</span>
            <span className="text-muted-foreground ml-2">Press options (A-D), then Enter to confirm</span>
            {multiSelections.length > 0 && (
              <span className="ml-2 text-primary font-bold">[{multiSelections.join(', ')}]</span>
            )}
          </div>
        )}

        {/* Answer key list */}
        <div className="bg-card border border-border rounded-lg overflow-hidden">
          <div className="max-h-[60vh] overflow-y-auto">
            {questions.map((q, idx) => {
              const isNum = isNumericalQ(q.questionNo);
              const isCurrent = idx === currentIdx;
              return (
                <div
                  key={q.questionNo}
                  ref={(el) => { rowRefs.current[q.questionNo] = el; }}
                  onClick={() => setCurrentIdx(idx)}
                  className={`flex items-center gap-4 px-4 py-3 border-b border-border/30 cursor-pointer transition-colors
                    ${isCurrent ? 'bg-primary/10 border-l-4 border-l-primary' : 'border-l-4 border-l-transparent'}
                    ${idx % 2 !== 0 ? 'bg-muted/20' : ''}
                  `}
                >
                  <span className="font-mono text-sm font-bold w-14 text-right text-muted-foreground">
                    Q.{q.questionNo}
                  </span>
                  {isNum ? (
                    <div className="flex items-center gap-2">
                      {isCurrent ? (
                        <input
                          type="text"
                          value={numericalInput}
                          onChange={(e) => setNumericalInput(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                              e.stopPropagation();
                              if (numericalInput.trim()) {
                                setAnswers(prev => ({ ...prev, [q.questionNo]: numericalInput.trim() }));
                              }
                              advanceNext();
                            }
                          }}
                          placeholder="Type numerical answer..."
                          className="w-40 h-9 px-3 text-sm font-mono border border-primary rounded bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                          autoFocus
                          onClick={(e) => e.stopPropagation()}
                        />
                      ) : (
                        <span className="font-mono text-sm text-muted-foreground">
                          {answers[q.questionNo] !== undefined ? (
                            <span className={getAnswerBadgeClass(answers[q.questionNo])}>{formatAnswer(answers[q.questionNo])}</span>
                          ) : '—'}
                        </span>
                      )}
                      <span className="text-[10px] text-muted-foreground bg-muted px-1.5 py-0.5 rounded font-mono">NUM</span>
                    </div>
                  ) : (
                    <div className="flex gap-2">
                      {validOptions.map((opt) => {
                        const ans = answers[q.questionNo];
                        const isSelected = ans === opt || (Array.isArray(ans) && ans.includes(opt as Option));
                        const isInMultiSelect = isCurrent && multiMode && multiSelections.includes(opt as Option);
                        return (
                          <button
                            key={opt}
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              if (multiMode && isCurrent) {
                                setMultiSelections(prev => prev.includes(opt as Option) ? prev.filter(o => o !== opt) : [...prev, opt as Option]);
                              } else {
                                setAnswers(prev => ({ ...prev, [q.questionNo]: opt as Option }));
                                if (isCurrent) advanceNext();
                              }
                            }}
                            className={`w-9 h-9 rounded-full border-2 flex items-center justify-center text-xs font-bold font-mono transition-all
                              ${isSelected
                                ? 'bg-primary text-primary-foreground border-primary'
                                : isInMultiSelect
                                  ? 'bg-primary/40 text-primary-foreground border-primary/60'
                                  : 'border-border text-muted-foreground hover:border-primary hover:text-foreground'
                              }
                            `}
                          >
                            {opt}
                          </button>
                        );
                      })}
                      {/* Bonus button */}
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setAnswers(prev => ({ ...prev, [q.questionNo]: 'BONUS' as AnswerKeyValue }));
                          if (isCurrent) advanceNext();
                        }}
                        className={`w-9 h-9 rounded-full border-2 flex items-center justify-center text-[10px] font-bold font-mono transition-all
                          ${answers[q.questionNo] === 'BONUS'
                            ? 'bg-[hsl(var(--accent))] text-foreground border-[hsl(var(--accent))]'
                            : 'border-border text-muted-foreground hover:border-[hsl(var(--accent))] hover:text-foreground'
                          }
                        `}
                        title="Bonus"
                      >
                        🎁
                      </button>
                    </div>
                  )}
                  {answers[q.questionNo] !== undefined && (
                    <span className={`ml-auto font-mono text-xs font-bold ${getAnswerBadgeClass(answers[q.questionNo])}`}>
                      {formatAnswer(answers[q.questionNo])}
                    </span>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        <button
          onClick={handleSubmit}
          className="w-full h-12 bg-primary text-primary-foreground font-bold text-base rounded hover:opacity-90 transition-opacity"
        >
          ✓ Apply Answer Key & Check
        </button>
      </div>
    </div>
  );
};

export default AnswerKeyPage;
