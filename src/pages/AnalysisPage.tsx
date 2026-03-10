import { useMemo, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTestStore } from '@/store/testStore';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, LineChart, Line, CartesianGrid, Legend,
  AreaChart, Area
} from 'recharts';
import {
  getAnnotation, saveAnnotation, getAnnotationsForTest,
  type QuestionAnnotation, type MistakeType, MISTAKE_TYPES,
} from '@/lib/mistakeStore';
import { getSavedTests } from '@/lib/testHistory';

const COLORS = {
  correct: 'hsl(142, 71%, 40%)',
  incorrect: 'hsl(0, 84%, 60%)',
  unanswered: 'hsl(215, 16%, 47%)',
  primary: 'hsl(221, 83%, 53%)',
  warn: 'hsl(38, 92%, 50%)',
};

const AnalysisPage = () => {
  const { result, answerKey } = useTestStore();
  const navigate = useNavigate();
  const [annotatingQ, setAnnotatingQ] = useState<number | null>(null);

  // Try to find the test ID from saved tests
  const currentTestId = useMemo(() => {
    if (!result) return '';
    const saved = getSavedTests();
    const match = saved.find(t => t.result.startTime === result.startTime);
    return match?.id || `unsaved_${result.startTime}`;
  }, [result]);

  const currentTestName = useMemo(() => {
    const saved = getSavedTests();
    const match = saved.find(t => t.id === currentTestId);
    return match?.name || 'Unsaved Test';
  }, [currentTestId]);

  const [annotations, setAnnotations] = useState<QuestionAnnotation[]>(() =>
    getAnnotationsForTest(currentTestId)
  );

  const refreshAnnotations = useCallback(() => {
    setAnnotations(getAnnotationsForTest(currentTestId));
  }, [currentTestId]);

  const timeGaps = useMemo(() => {
    if (!result) return {};
    const answered = result.responses
      .filter((r) => r.answeredAt !== null)
      .sort((a, b) => a.answeredAt! - b.answeredAt!);
    const gaps: Record<number, number> = {};
    let prev = result.startTime;
    answered.forEach((r) => {
      gaps[r.questionNo] = Math.round((r.answeredAt! - prev) / 1000);
      prev = r.answeredAt!;
    });
    return gaps;
  }, [result]);

  const analysis = useMemo(() => {
    if (!result || !answerKey) return [];
    return result.responses.map((r) => {
      const correct = answerKey[r.questionNo] ?? null;
      const isCorrect = r.selected !== null && r.selected === correct;
      const isWrong = r.selected !== null && correct !== null && r.selected !== correct;
      return {
        questionNo: r.questionNo,
        selected: r.selected,
        correct,
        isCorrect,
        isWrong,
        isSkipped: r.selected === null,
        marks: isCorrect ? 4 : isWrong ? -1 : 0,
        timeGap: timeGaps[r.questionNo] ?? null,
      };
    });
  }, [result, answerKey, timeGaps]);

  if (!result || !answerKey) {
    navigate('/results');
    return null;
  }

  const total = analysis.length;
  const correctCount = analysis.filter((a) => a.isCorrect).length;
  const incorrectCount = analysis.filter((a) => a.isWrong).length;
  const skippedCount = analysis.filter((a) => a.isSkipped).length;
  const totalScore = analysis.reduce((sum, a) => sum + a.marks, 0);
  const maxScore = total * 4;
  const marksLostToWrong = incorrectCount;
  const marksMissedBySkipping = skippedCount * 4;
  const accuracy = total > 0 ? Math.round((correctCount / (correctCount + incorrectCount || 1)) * 100) : 0;
  const attemptRate = total > 0 ? Math.round(((total - skippedCount) / total) * 100) : 0;

  const pieData = [
    { name: 'Correct (+4)', value: correctCount, color: COLORS.correct },
    { name: 'Incorrect (−1)', value: incorrectCount, color: COLORS.incorrect },
    { name: 'Skipped (0)', value: skippedCount, color: COLORS.unanswered },
  ].filter(d => d.value > 0);

  const cumulativeScore = (() => {
    let running = 0;
    return analysis.map((a) => {
      running += a.marks;
      return { q: `Q${a.questionNo}`, score: running, marks: a.marks };
    });
  })();

  const cumulativeAccuracy = (() => {
    let c = 0, t = 0;
    return analysis.map((a) => {
      t++;
      if (a.isCorrect) c++;
      return { q: `Q${a.questionNo}`, accuracy: Math.round((c / t) * 100) };
    });
  })();

  const timeChartData = analysis
    .filter((a) => a.timeGap !== null)
    .map((a) => ({ q: `Q${a.questionNo}`, time: a.timeGap!, marks: a.marks }));

  const answeredInOrder = analysis
    .filter(a => a.timeGap !== null)
    .sort((a, b) => {
      const aTime = result.responses.find(r => r.questionNo === a.questionNo)?.answeredAt ?? 0;
      const bTime = result.responses.find(r => r.questionNo === b.questionNo)?.answeredAt ?? 0;
      return aTime - bTime;
    });

  const timeSegments = (() => {
    if (answeredInOrder.length === 0) return [];
    const segCount = Math.min(5, answeredInOrder.length);
    const segSize = Math.ceil(answeredInOrder.length / segCount);
    return Array.from({ length: segCount }, (_, i) => {
      const slice = answeredInOrder.slice(i * segSize, (i + 1) * segSize);
      const earned = slice.filter(a => a.isCorrect).length * 4;
      const lost = slice.filter(a => a.isWrong).length * 1;
      const pct = Math.round(((i + 1) / segCount) * 100);
      return {
        name: `${Math.round((i / segCount) * 100)}–${pct}%`,
        earned, lost,
        net: slice.reduce((s, a) => s + a.marks, 0),
        correct: slice.filter(a => a.isCorrect).length,
        wrong: slice.filter(a => a.isWrong).length,
      };
    });
  })();

  const segmentSize = Math.ceil(total / 4);
  const sections = Array.from({ length: 4 }, (_, i) => {
    const slice = analysis.slice(i * segmentSize, (i + 1) * segmentSize);
    if (slice.length === 0) return null;
    const seg_correct = slice.filter(a => a.isCorrect).length;
    const seg_wrong = slice.filter(a => a.isWrong).length;
    const seg_score = slice.reduce((s, a) => s + a.marks, 0);
    const seg_max = slice.length * 4;
    return {
      name: `Q${slice[0].questionNo}–${slice[slice.length - 1].questionNo}`,
      correct: seg_correct, wrong: seg_wrong,
      skipped: slice.filter(a => a.isSkipped).length,
      score: seg_score, maxScore: seg_max,
      pct: seg_max > 0 ? Math.round((seg_score / seg_max) * 100) : 0,
    };
  }).filter(Boolean) as NonNullable<ReturnType<typeof Array.from<any, any>>>;

  let bestStreak = 0, worstStreak = 0, curGood = 0, curBad = 0;
  analysis.forEach((a) => {
    if (a.isCorrect) { curGood++; bestStreak = Math.max(bestStreak, curGood); curBad = 0; }
    else if (a.isWrong) { curBad++; worstStreak = Math.max(worstStreak, curBad); curGood = 0; }
    else { curGood = 0; curBad = 0; }
  });

  const answeredTimes = analysis.filter(a => a.timeGap !== null).map(a => a.timeGap!);
  const avgTime = answeredTimes.length > 0 ? Math.round(answeredTimes.reduce((a, b) => a + b, 0) / answeredTimes.length) : 0;
  const fastestQ = answeredTimes.length > 0 ? Math.min(...answeredTimes) : 0;
  const slowestQ = answeredTimes.length > 0 ? Math.max(...answeredTimes) : 0;

  const correctTimes = analysis.filter(a => a.isCorrect && a.timeGap !== null).map(a => a.timeGap!);
  const wrongTimes = analysis.filter(a => a.isWrong && a.timeGap !== null).map(a => a.timeGap!);
  const avgCorrectTime = correctTimes.length > 0 ? Math.round(correctTimes.reduce((a, b) => a + b, 0) / correctTimes.length) : 0;
  const avgWrongTime = wrongTimes.length > 0 ? Math.round(wrongTimes.reduce((a, b) => a + b, 0) / wrongTimes.length) : 0;

  const optionDist = { A: 0, B: 0, C: 0, D: 0 };
  const correctDist = { A: 0, B: 0, C: 0, D: 0 };
  analysis.forEach((a) => {
    if (a.selected && a.selected in optionDist) optionDist[a.selected as keyof typeof optionDist]++;
    if (a.correct && a.correct in correctDist) correctDist[a.correct as keyof typeof correctDist]++;
  });

  const worstTimeWasted = analysis
    .filter(a => a.isWrong && a.timeGap !== null)
    .sort((a, b) => b.timeGap! - a.timeGap!)
    .slice(0, 5);

  const fmt = (s: number) => s < 60 ? `${s}s` : `${Math.floor(s / 60)}m ${s % 60}s`;

  // Annotation stats
  const annotatedCount = annotations.length;
  const mistakeBreakdown = Object.entries(MISTAKE_TYPES).map(([type, meta]) => ({
    type: type as MistakeType,
    ...meta,
    count: annotations.filter(a => a.mistakeType === type).length,
  })).filter(b => b.count > 0);

  return (
    <div className="min-h-screen bg-background p-4 pb-16">
      <div className="max-w-5xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center gap-3">
          <button onClick={() => navigate('/')} className="px-2 py-2 border border-border rounded text-sm text-foreground hover:bg-muted" title="Home">🏠</button>
          <button onClick={() => navigate('/results')} className="px-3 py-2 border border-border rounded text-sm text-foreground hover:bg-muted">← Back</button>
          <h1 className="text-xl font-bold font-mono text-foreground">Detailed Analysis</h1>
        </div>

        {/* Score summary */}
        <div className="bg-card border-2 border-primary/30 rounded-lg p-5">
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-4 text-center">
            <div>
              <div className="text-3xl font-bold font-mono text-primary">{totalScore}</div>
              <div className="text-xs text-muted-foreground mt-1">Score / {maxScore}</div>
            </div>
            <div>
              <div className="text-2xl font-bold font-mono text-[hsl(var(--success))]">+{correctCount * 4}</div>
              <div className="text-xs text-muted-foreground mt-1">{correctCount} Correct</div>
            </div>
            <div>
              <div className="text-2xl font-bold font-mono text-destructive">−{marksLostToWrong}</div>
              <div className="text-xs text-muted-foreground mt-1">{incorrectCount} Wrong</div>
            </div>
            <div>
              <div className="text-2xl font-bold font-mono text-foreground">{accuracy}%</div>
              <div className="text-xs text-muted-foreground mt-1">Accuracy</div>
            </div>
            <div>
              <div className="text-2xl font-bold font-mono text-accent">{attemptRate}%</div>
              <div className="text-xs text-muted-foreground mt-1">Attempt Rate</div>
            </div>
          </div>
        </div>

        {/* Key stats */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            { label: 'Avg Time/Q', value: fmt(avgTime) },
            { label: 'Fastest', value: fmt(fastestQ) },
            { label: 'Slowest', value: fmt(slowestQ) },
            { label: 'Marks Missed (Skips)', value: String(marksMissedBySkipping) },
          ].map((m) => (
            <div key={m.label} className="bg-card border border-border rounded-lg p-3 text-center">
              <div className="text-lg font-bold font-mono text-foreground">{m.value}</div>
              <div className="text-[10px] text-muted-foreground mt-1">{m.label}</div>
            </div>
          ))}
        </div>

        {/* Time efficiency */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div className="bg-card border border-[hsl(var(--success))]/30 rounded-lg p-3 text-center">
            <div className="text-lg font-bold font-mono text-[hsl(var(--success))]">{fmt(avgCorrectTime)}</div>
            <div className="text-[10px] text-muted-foreground mt-1">Avg Time on Correct</div>
          </div>
          <div className="bg-card border border-destructive/30 rounded-lg p-3 text-center">
            <div className="text-lg font-bold font-mono text-destructive">{fmt(avgWrongTime)}</div>
            <div className="text-[10px] text-muted-foreground mt-1">Avg Time on Wrong</div>
          </div>
          <div className="bg-card border border-border rounded-lg p-3 text-center">
            <div className="text-lg font-bold font-mono text-foreground">{bestStreak} ✓ / {worstStreak} ✗</div>
            <div className="text-[10px] text-muted-foreground mt-1">Best / Worst Streak</div>
          </div>
        </div>

        {/* Mistake categorization summary */}
        {annotatedCount > 0 && (
          <div className="bg-card border border-accent/30 rounded-lg p-4">
            <h3 className="font-mono text-sm text-foreground font-bold mb-3">🏷 Mistake Categorization ({annotatedCount} annotated)</h3>
            <div className="flex gap-3 flex-wrap">
              {mistakeBreakdown.map(b => (
                <div key={b.type} className="bg-muted rounded-lg px-3 py-2 text-center">
                  <div className="text-lg">{b.icon}</div>
                  <div className="text-sm font-mono font-bold text-foreground">{b.count}</div>
                  <div className="text-[10px] text-muted-foreground">{b.label}</div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Charts */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="bg-card border border-border rounded-lg p-4">
            <h3 className="font-mono text-sm text-muted-foreground font-bold mb-3">Score Breakdown</h3>
            <div className="h-52">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={pieData} cx="50%" cy="50%" innerRadius={40} outerRadius={75} dataKey="value" strokeWidth={2} stroke="hsl(var(--background))">
                    {pieData.map((entry, i) => <Cell key={i} fill={entry.color} />)}
                  </Pie>
                  <Tooltip formatter={(value: number, name: string) => [`${value} questions`, name]} />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="bg-card border border-border rounded-lg p-4">
            <h3 className="font-mono text-sm text-muted-foreground font-bold mb-3">Score Progression</h3>
            <div className="h-52">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={cumulativeScore}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis dataKey="q" tick={{ fontSize: 8 }} interval={Math.max(0, Math.floor(cumulativeScore.length / 10) - 1)} />
                  <YAxis tick={{ fontSize: 10 }} width={40} />
                  <Tooltip formatter={(v: number) => [v, 'Score']} />
                  <Area type="monotone" dataKey="score" stroke={COLORS.primary} fill={COLORS.primary} fillOpacity={0.15} strokeWidth={2} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="bg-card border border-border rounded-lg p-4">
            <h3 className="font-mono text-sm text-muted-foreground font-bold mb-3">Accuracy Trend</h3>
            <div className="h-52">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={cumulativeAccuracy}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis dataKey="q" tick={{ fontSize: 8 }} interval={Math.max(0, Math.floor(cumulativeAccuracy.length / 10) - 1)} />
                  <YAxis domain={[0, 100]} tick={{ fontSize: 10 }} width={35} />
                  <Tooltip formatter={(v: number) => [`${v}%`, 'Accuracy']} />
                  <Line type="monotone" dataKey="accuracy" stroke={COLORS.primary} strokeWidth={2} dot={false} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="bg-card border border-border rounded-lg p-4">
            <h3 className="font-mono text-sm text-muted-foreground font-bold mb-3">Time Per Question</h3>
            <div className="h-52">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={timeChartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis dataKey="q" tick={{ fontSize: 7 }} interval={Math.max(0, Math.floor(timeChartData.length / 12) - 1)} />
                  <YAxis tick={{ fontSize: 10 }} width={35} />
                  <Tooltip formatter={(v: number) => [fmt(v), 'Time']} />
                  <Bar dataKey="time" fill={COLORS.primary} radius={[2, 2, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>

        {/* Time-segment marks */}
        {timeSegments.length > 0 && (
          <div className="bg-card border border-border rounded-lg p-4">
            <h3 className="font-mono text-sm text-muted-foreground font-bold mb-3">Marks Earned vs Lost Over Time</h3>
            <div className="h-52">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={timeSegments}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis dataKey="name" tick={{ fontSize: 10 }} />
                  <YAxis tick={{ fontSize: 10 }} width={35} />
                  <Tooltip />
                  <Legend />
                  <Bar dataKey="earned" name="Marks Earned" fill={COLORS.correct} radius={[2, 2, 0, 0]} />
                  <Bar dataKey="lost" name="Marks Lost" fill={COLORS.incorrect} radius={[2, 2, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}

        {/* Section-wise */}
        <div className="bg-card border border-border rounded-lg p-4">
          <h3 className="font-mono text-sm text-muted-foreground font-bold mb-3">Section-wise Performance</h3>
          <div className="space-y-3">
            {(sections as any[]).map((seg: any) => (
              <div key={seg.name}>
                <div className="flex items-center justify-between text-sm mb-1">
                  <span className="font-mono text-xs text-muted-foreground">{seg.name}</span>
                  <span className="font-mono text-xs font-bold">{seg.score}/{seg.maxScore} ({seg.pct}%)</span>
                </div>
                <div className="h-5 bg-muted rounded-full overflow-hidden flex">
                  <div className="h-full transition-all" style={{ width: `${(seg.correct / (seg.correct + seg.wrong + seg.skipped)) * 100}%`, backgroundColor: COLORS.correct }} />
                  <div className="h-full transition-all" style={{ width: `${(seg.wrong / (seg.correct + seg.wrong + seg.skipped)) * 100}%`, backgroundColor: COLORS.incorrect }} />
                </div>
                <div className="flex gap-4 mt-1 text-[10px] text-muted-foreground">
                  <span>✓ {seg.correct}</span>
                  <span>✗ {seg.wrong}</span>
                  <span>— {seg.skipped}</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Option distribution */}
        <div className="bg-card border border-border rounded-lg p-4">
          <h3 className="font-mono text-sm text-muted-foreground font-bold mb-3">Option Distribution: Yours vs Key</h3>
          <div className="grid grid-cols-4 gap-4">
            {(['A', 'B', 'C', 'D'] as const).map((opt) => (
              <div key={opt} className="text-center border border-border rounded-lg p-3">
                <div className="font-mono text-lg font-bold text-foreground">{opt}</div>
                <div className="mt-2 text-sm">
                  <div className="text-primary font-mono font-bold">{optionDist[opt]}</div>
                  <div className="text-[10px] text-muted-foreground">Your picks</div>
                </div>
                <div className="h-px bg-border my-2" />
                <div className="text-sm">
                  <div className="text-[hsl(var(--success))] font-mono font-bold">{correctDist[opt]}</div>
                  <div className="text-[10px] text-muted-foreground">In key</div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Worst time wasters */}
        {worstTimeWasted.length > 0 && (
          <div className="bg-card border border-destructive/30 rounded-lg p-4">
            <h3 className="font-mono text-sm text-destructive font-bold mb-3">⚠ Most Time Wasted on Wrong Answers</h3>
            <div className="space-y-2">
              {worstTimeWasted.map((a) => (
                <div key={a.questionNo} className="flex items-center justify-between py-2 px-3 bg-destructive/5 rounded">
                  <span className="font-mono text-sm font-bold">Q.{a.questionNo}</span>
                  <span className="text-xs text-muted-foreground">
                    You: <strong className="text-destructive">{a.selected}</strong> → Correct: <strong className="text-[hsl(var(--success))]">{a.correct}</strong>
                  </span>
                  <span className="font-mono text-sm text-destructive font-bold">{fmt(a.timeGap!)}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Question-wise breakdown with annotations */}
        <QuestionTable
          analysis={analysis}
          fmt={fmt}
          testId={currentTestId}
          testName={currentTestName}
          annotations={annotations}
          annotatingQ={annotatingQ}
          setAnnotatingQ={setAnnotatingQ}
          onAnnotationSaved={refreshAnnotations}
        />
      </div>
    </div>
  );
};

type SortMode = 'default' | 'time-desc' | 'time-asc' | 'wrong-slow' | 'right-slow' | 'correct-only' | 'wrong-only' | 'skipped-only' | 'annotated';

const SORT_OPTIONS: { value: SortMode; label: string }[] = [
  { value: 'default', label: '# Order' },
  { value: 'time-desc', label: '⏱ Slowest' },
  { value: 'time-asc', label: '⚡ Fastest' },
  { value: 'wrong-slow', label: '✗ Wrong + Slow' },
  { value: 'wrong-only', label: '✗ Wrong only' },
  { value: 'correct-only', label: '✓ Correct only' },
  { value: 'skipped-only', label: '— Skipped' },
  { value: 'annotated', label: '🏷 Annotated' },
];

function QuestionTable({
  analysis, fmt, testId, testName, annotations, annotatingQ, setAnnotatingQ, onAnnotationSaved,
}: {
  analysis: any[]; fmt: (s: number) => string;
  testId: string; testName: string;
  annotations: QuestionAnnotation[];
  annotatingQ: number | null;
  setAnnotatingQ: (q: number | null) => void;
  onAnnotationSaved: () => void;
}) {
  const [sortMode, setSortMode] = useState<SortMode>('default');

  const sorted = useMemo(() => {
    let items = [...analysis];
    switch (sortMode) {
      case 'time-desc': return items.filter(a => a.timeGap != null).sort((a, b) => b.timeGap - a.timeGap);
      case 'time-asc': return items.filter(a => a.timeGap != null).sort((a, b) => a.timeGap - b.timeGap);
      case 'wrong-slow': return items.filter(a => a.isWrong && a.timeGap != null).sort((a, b) => b.timeGap - a.timeGap);
      case 'correct-only': return items.filter(a => a.isCorrect);
      case 'wrong-only': return items.filter(a => a.isWrong);
      case 'skipped-only': return items.filter(a => a.isSkipped);
      case 'annotated': {
        const annotatedQs = new Set(annotations.map(a => a.questionNo));
        return items.filter(a => annotatedQs.has(a.questionNo));
      }
      default: return items;
    }
  }, [analysis, sortMode, annotations]);

  return (
    <div className="bg-card border border-border rounded-lg overflow-hidden">
      <div className="px-4 py-2 bg-muted border-b border-border flex items-center justify-between flex-wrap gap-2">
        <h3 className="font-mono text-xs text-muted-foreground font-bold">QUESTION-WISE BREAKDOWN</h3>
        <div className="flex gap-1.5 flex-wrap">
          {SORT_OPTIONS.map((opt) => (
            <button key={opt.value} onClick={() => setSortMode(opt.value)}
              className={`px-2 py-1 text-[10px] font-mono rounded border transition-colors ${
                sortMode === opt.value ? 'bg-primary text-primary-foreground border-primary' : 'border-border text-muted-foreground hover:border-primary/40 hover:text-foreground'
              }`}>{opt.label}</button>
          ))}
        </div>
      </div>
      <p className="px-4 py-2 text-[10px] text-muted-foreground bg-accent/5 border-b border-border">
        💡 Click on any wrong question to categorize the mistake, add notes, or paste a question image
      </p>
      {sorted.length === 0 ? (
        <div className="p-6 text-center text-sm text-muted-foreground">No questions match this filter</div>
      ) : (
        <div>
          {sorted.map((item: any, idx: number) => {
            const ann = annotations.find(a => a.questionNo === item.questionNo);
            const isAnnotating = annotatingQ === item.questionNo;
            return (
              <div key={item.questionNo}>
                <div
                  onClick={() => setAnnotatingQ(isAnnotating ? null : item.questionNo)}
                  className={`flex items-center gap-3 px-4 py-2.5 border-b border-border/30 cursor-pointer hover:bg-muted/30 transition-colors ${
                    item.isCorrect ? 'bg-[hsl(var(--success))]/5' : item.isWrong ? 'bg-destructive/5' : ''
                  } ${idx % 2 !== 0 ? 'bg-muted/10' : ''}`}
                >
                  <span className="font-mono text-sm font-bold text-muted-foreground w-14 text-right shrink-0">{item.questionNo}</span>
                  <span className={`font-mono font-bold w-8 ${!item.selected ? 'text-muted-foreground/40' : 'text-foreground'}`}>{item.selected ?? '—'}</span>
                  <span className="font-mono font-bold w-8 text-primary">{item.correct ?? '—'}</span>
                  <span className="font-mono text-xs font-bold w-10">
                    {item.isSkipped ? <span className="text-muted-foreground">SKIP</span> : item.isCorrect ? <span className="text-[hsl(var(--success))]">✓</span> : <span className="text-destructive">✗</span>}
                  </span>
                  <span className={`font-mono font-bold text-xs w-10 text-right ${item.marks > 0 ? 'text-[hsl(var(--success))]' : item.marks < 0 ? 'text-destructive' : 'text-muted-foreground'}`}>
                    {item.marks > 0 ? `+${item.marks}` : item.marks}
                  </span>
                  <span className="font-mono text-xs text-muted-foreground w-12 text-right">{item.timeGap != null ? fmt(item.timeGap) : '—'}</span>
                  {ann && (
                    <span className="ml-auto text-xs" title={`${MISTAKE_TYPES[ann.mistakeType].label}: ${ann.notes}`}>
                      {MISTAKE_TYPES[ann.mistakeType].icon}
                      {ann.imageData && ' 🖼'}
                    </span>
                  )}
                  {item.isWrong && !ann && (
                    <span className="ml-auto text-[10px] text-muted-foreground">+ annotate</span>
                  )}
                </div>
                {isAnnotating && (
                  <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm p-4 animate-in fade-in duration-200">
                    <div className="bg-card w-full max-w-lg rounded-xl border border-border shadow-2xl overflow-hidden relative animate-in zoom-in-95 duration-200">
                      <div className="absolute top-2 right-2 z-10">
                        <button onClick={() => setAnnotatingQ(null)} className="p-2 text-muted-foreground hover:text-foreground">✕</button>
                      </div>
                      <AnnotationEditor
                        testId={testId}
                        testName={testName}
                        questionNo={item.questionNo}
                        selected={item.selected}
                        correct={item.correct}
                        existing={ann}
                        onSave={() => { onAnnotationSaved(); setAnnotatingQ(null); }}
                        onCancel={() => setAnnotatingQ(null)}
                      />
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function AnnotationEditor({
  testId, testName, questionNo, selected, correct, existing, onSave, onCancel,
}: {
  testId: string; testName: string; questionNo: number;
  selected: string | null; correct: string | null;
  existing?: QuestionAnnotation;
  onSave: () => void; onCancel: () => void;
}) {
  const [mistakeType, setMistakeType] = useState<MistakeType>(existing?.mistakeType || 'silly');
  const [notes, setNotes] = useState(existing?.notes || '');
  const [imageData, setImageData] = useState<string | undefined>(existing?.imageData);

  const handlePaste = useCallback((e: React.ClipboardEvent) => {
    const items = e.clipboardData?.items;
    if (!items) return;
    for (const item of Array.from(items)) {
      if (item.type.startsWith('image/')) {
        e.preventDefault();
        const file = item.getAsFile();
        if (!file) continue;
        const reader = new FileReader();
        reader.onload = () => setImageData(reader.result as string);
        reader.readAsDataURL(file);
        return;
      }
    }
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    const file = e.dataTransfer.files[0];
    if (file?.type.startsWith('image/')) {
      const reader = new FileReader();
      reader.onload = () => setImageData(reader.result as string);
      reader.readAsDataURL(file);
    }
  }, []);

  const handleSave = () => {
    saveAnnotation({
      testId,
      testName,
      questionNo,
      mistakeType,
      notes,
      imageData,
      selected,
      correct,
      createdAt: existing?.createdAt || Date.now(),
      updatedAt: Date.now(),
    });
    onSave();
  };

  return (
    <div
      className="bg-muted/50 border-b border-border px-4 py-3 space-y-3"
      onPaste={handlePaste}
      onDrop={handleDrop}
      onDragOver={(e) => e.preventDefault()}
    >
      <div className="text-xs font-mono text-muted-foreground">
        Annotate Q.{questionNo} — You: <strong className="text-destructive">{selected}</strong> → Correct: <strong className="text-[hsl(var(--success))]">{correct}</strong>
      </div>

      {/* Mistake type */}
      <div>
        <label className="text-[10px] text-muted-foreground font-bold">MISTAKE TYPE</label>
        <div className="flex gap-1.5 flex-wrap mt-1">
          {(Object.entries(MISTAKE_TYPES) as [MistakeType, typeof MISTAKE_TYPES[MistakeType]][]).map(([type, meta]) => (
            <button key={type} onClick={() => setMistakeType(type)}
              className={`px-2 py-1 rounded text-[11px] font-bold transition-colors ${
                mistakeType === type ? 'bg-primary text-primary-foreground' : 'bg-card border border-border text-muted-foreground hover:text-foreground'
              }`}>
              {meta.icon} {meta.label}
            </button>
          ))}
        </div>
      </div>

      {/* Notes */}
      <div>
        <label className="text-[10px] text-muted-foreground font-bold">NOTES</label>
        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="Why was this wrong? What concept did you miss? What should you remember?"
          className="w-full mt-1 px-3 py-2 border border-border rounded-lg bg-background text-foreground text-xs min-h-[80px] font-mono focus:outline-none focus:ring-2 focus:ring-primary"
        />
      </div>

      {/* Image */}
      <div>
        <label className="text-[10px] text-muted-foreground font-bold">QUESTION IMAGE</label>
        <div className="mt-1 border-2 border-dashed border-border rounded-lg p-4 text-center text-xs text-muted-foreground">
          {imageData ? (
            <div className="space-y-2">
              <img src={imageData} alt="Question" className="max-w-full max-h-48 mx-auto rounded-lg border border-border" />
              <button onClick={() => setImageData(undefined)} className="text-destructive text-[10px] hover:underline">Remove image</button>
            </div>
          ) : (
            <div>
              <div className="text-2xl mb-1">📋</div>
              <div>Paste (Ctrl+V) or drag & drop an image of the question here</div>
            </div>
          )}
        </div>
      </div>

      <div className="flex gap-2">
        <button onClick={handleSave} className="px-4 py-2 bg-primary text-primary-foreground rounded-lg font-bold text-xs">
          {existing ? 'Update' : 'Save'} Annotation
        </button>
        <button onClick={onCancel} className="px-4 py-2 border border-border rounded-lg text-xs text-foreground hover:bg-muted">Cancel</button>
      </div>
    </div>
  );
}

export default AnalysisPage;
