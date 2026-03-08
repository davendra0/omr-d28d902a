import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTestStore } from '@/store/testStore';
import DarkModeToggle from '@/components/DarkModeToggle';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, LineChart, Line, CartesianGrid, Legend,
  AreaChart, Area
} from 'recharts';

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
  const marksLostToWrong = incorrectCount; // -1 each
  const marksMissedBySkipping = skippedCount * 4; // potential marks
  const accuracy = total > 0 ? Math.round((correctCount / (correctCount + incorrectCount || 1)) * 100) : 0;
  const attemptRate = total > 0 ? Math.round(((total - skippedCount) / total) * 100) : 0;

  // Pie data
  const pieData = [
    { name: 'Correct (+4)', value: correctCount, color: COLORS.correct },
    { name: 'Incorrect (−1)', value: incorrectCount, color: COLORS.incorrect },
    { name: 'Skipped (0)', value: skippedCount, color: COLORS.unanswered },
  ].filter(d => d.value > 0);

  // Cumulative score over questions
  const cumulativeScore = (() => {
    let running = 0;
    return analysis.map((a) => {
      running += a.marks;
      return { q: `Q${a.questionNo}`, score: running, marks: a.marks };
    });
  })();

  // Cumulative accuracy
  const cumulativeAccuracy = (() => {
    let c = 0, t = 0;
    return analysis.map((a) => {
      t++;
      if (a.isCorrect) c++;
      return { q: `Q${a.questionNo}`, accuracy: Math.round((c / t) * 100) };
    });
  })();

  // Time per question (only answered)
  const timeChartData = analysis
    .filter((a) => a.timeGap !== null)
    .map((a) => ({
      q: `Q${a.questionNo}`,
      time: a.timeGap!,
      marks: a.marks,
      color: a.isCorrect ? COLORS.correct : a.isWrong ? COLORS.incorrect : COLORS.unanswered,
    }));

  // Marks lost per time segment (split test into 5 time segments)
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
      const net = slice.reduce((s, a) => s + a.marks, 0);
      const pct = Math.round(((i + 1) / segCount) * 100);
      return {
        name: `${Math.round((i / segCount) * 100)}–${pct}%`,
        earned,
        lost,
        net,
        correct: slice.filter(a => a.isCorrect).length,
        wrong: slice.filter(a => a.isWrong).length,
      };
    });
  })();

  // Section-wise performance (split into quarters by question number)
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
      correct: seg_correct,
      wrong: seg_wrong,
      skipped: slice.filter(a => a.isSkipped).length,
      score: seg_score,
      maxScore: seg_max,
      pct: seg_max > 0 ? Math.round((seg_score / seg_max) * 100) : 0,
    };
  }).filter(Boolean) as NonNullable<typeof sections[0]>[];

  // Streaks
  let bestStreak = 0, worstStreak = 0, curGood = 0, curBad = 0;
  analysis.forEach((a) => {
    if (a.isCorrect) { curGood++; bestStreak = Math.max(bestStreak, curGood); curBad = 0; }
    else if (a.isWrong) { curBad++; worstStreak = Math.max(worstStreak, curBad); curGood = 0; }
    else { curGood = 0; curBad = 0; }
  });

  // Timing stats
  const answeredTimes = analysis.filter(a => a.timeGap !== null).map(a => a.timeGap!);
  const avgTime = answeredTimes.length > 0 ? Math.round(answeredTimes.reduce((a, b) => a + b, 0) / answeredTimes.length) : 0;
  const fastestQ = answeredTimes.length > 0 ? Math.min(...answeredTimes) : 0;
  const slowestQ = answeredTimes.length > 0 ? Math.max(...answeredTimes) : 0;

  // Time spent on correct vs incorrect
  const correctTimes = analysis.filter(a => a.isCorrect && a.timeGap !== null).map(a => a.timeGap!);
  const wrongTimes = analysis.filter(a => a.isWrong && a.timeGap !== null).map(a => a.timeGap!);
  const avgCorrectTime = correctTimes.length > 0 ? Math.round(correctTimes.reduce((a, b) => a + b, 0) / correctTimes.length) : 0;
  const avgWrongTime = wrongTimes.length > 0 ? Math.round(wrongTimes.reduce((a, b) => a + b, 0) / wrongTimes.length) : 0;

  // Option distribution
  const optionDist = { A: 0, B: 0, C: 0, D: 0 };
  const correctDist = { A: 0, B: 0, C: 0, D: 0 };
  analysis.forEach((a) => {
    if (a.selected && a.selected in optionDist) optionDist[a.selected as keyof typeof optionDist]++;
    if (a.correct && a.correct in correctDist) correctDist[a.correct as keyof typeof correctDist]++;
  });

  // Questions where most time was wasted (wrong answers that took long)
  const worstTimeWasted = analysis
    .filter(a => a.isWrong && a.timeGap !== null)
    .sort((a, b) => b.timeGap! - a.timeGap!)
    .slice(0, 5);

  const fmt = (s: number) => {
    if (s < 60) return `${s}s`;
    return `${Math.floor(s / 60)}m ${s % 60}s`;
  };

  return (
    <div className="min-h-screen bg-background p-4 pb-16">
      <div className="max-w-5xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate('/results')}
            className="px-3 py-2 border border-border rounded text-sm text-foreground hover:bg-muted"
          >
            ← Back
          </button>
          <h1 className="text-xl font-bold font-mono text-foreground">Detailed Analysis</h1>
          <div className="ml-auto">
            <DarkModeToggle />
          </div>
        </div>

        {/* Score summary */}
        <div className="bg-card border-2 border-primary/30 rounded-lg p-5">
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-4 text-center">
            <div>
              <div className="text-3xl font-bold font-mono text-primary">{totalScore}</div>
              <div className="text-xs text-muted-foreground mt-1">Score / {maxScore}</div>
            </div>
            <div>
              <div className="text-2xl font-bold font-mono text-success">+{correctCount * 4}</div>
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
              <div className="text-2xl font-bold font-mono text-review">{attemptRate}%</div>
              <div className="text-xs text-muted-foreground mt-1">Attempt Rate</div>
            </div>
          </div>
        </div>

        {/* Key stats row */}
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
          <div className="bg-card border border-success/30 rounded-lg p-3 text-center">
            <div className="text-lg font-bold font-mono text-success">{fmt(avgCorrectTime)}</div>
            <div className="text-[10px] text-muted-foreground mt-1">Avg Time on Correct Answers</div>
          </div>
          <div className="bg-card border border-destructive/30 rounded-lg p-3 text-center">
            <div className="text-lg font-bold font-mono text-destructive">{fmt(avgWrongTime)}</div>
            <div className="text-[10px] text-muted-foreground mt-1">Avg Time on Wrong Answers</div>
          </div>
          <div className="bg-card border border-border rounded-lg p-3 text-center">
            <div className="text-lg font-bold font-mono text-foreground">
              {bestStreak} ✓ / {worstStreak} ✗
            </div>
            <div className="text-[10px] text-muted-foreground mt-1">Best / Worst Streak</div>
          </div>
        </div>

        {/* Charts */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Pie */}
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

          {/* Cumulative score */}
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

          {/* Accuracy trend */}
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

          {/* Time per question */}
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

        {/* Time-segment marks analysis */}
        {timeSegments.length > 0 && (
          <div className="bg-card border border-border rounded-lg p-4">
            <h3 className="font-mono text-sm text-muted-foreground font-bold mb-3">
              Marks Earned vs Lost Over Time
            </h3>
            <p className="text-xs text-muted-foreground mb-3">Test timeline split into segments to show where you gained or lost the most marks</p>
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

        {/* Section-wise performance */}
        <div className="bg-card border border-border rounded-lg p-4">
          <h3 className="font-mono text-sm text-muted-foreground font-bold mb-3">Section-wise Performance</h3>
          <div className="space-y-3">
            {sections.map((seg) => (
              <div key={seg.name}>
                <div className="flex items-center justify-between text-sm mb-1">
                  <span className="font-mono text-xs text-muted-foreground">{seg.name}</span>
                  <span className="font-mono text-xs font-bold">
                    {seg.score}/{seg.maxScore} ({seg.pct}%)
                  </span>
                </div>
                <div className="h-5 bg-muted rounded-full overflow-hidden flex">
                  <div
                    className="h-full transition-all"
                    style={{
                      width: `${(seg.correct / (seg.correct + seg.wrong + seg.skipped)) * 100}%`,
                      backgroundColor: COLORS.correct,
                    }}
                  />
                  <div
                    className="h-full transition-all"
                    style={{
                      width: `${(seg.wrong / (seg.correct + seg.wrong + seg.skipped)) * 100}%`,
                      backgroundColor: COLORS.incorrect,
                    }}
                  />
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
                  <div className="text-success font-mono font-bold">{correctDist[opt]}</div>
                  <div className="text-[10px] text-muted-foreground">In key</div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Worst time wasters */}
        {worstTimeWasted.length > 0 && (
          <div className="bg-card border border-destructive/30 rounded-lg p-4">
            <h3 className="font-mono text-sm text-destructive font-bold mb-3">
              ⚠ Most Time Wasted on Wrong Answers
            </h3>
            <p className="text-xs text-muted-foreground mb-3">These questions took the most time but were answered incorrectly</p>
            <div className="space-y-2">
              {worstTimeWasted.map((a) => (
                <div key={a.questionNo} className="flex items-center justify-between py-2 px-3 bg-destructive/5 rounded">
                  <span className="font-mono text-sm font-bold">Q.{a.questionNo}</span>
                  <span className="text-xs text-muted-foreground">
                    You: <strong className="text-destructive">{a.selected}</strong> → Correct: <strong className="text-success">{a.correct}</strong>
                  </span>
                  <span className="font-mono text-sm text-destructive font-bold">{fmt(a.timeGap!)}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Full question table */}
        <div className="bg-card border border-border rounded-lg overflow-hidden">
          <div className="px-4 py-2 bg-muted border-b border-border">
            <h3 className="font-mono text-xs text-muted-foreground font-bold">QUESTION-WISE BREAKDOWN</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border text-muted-foreground text-xs font-mono bg-muted/50">
                  <th className="p-2 text-right w-14">Q.No</th>
                  <th className="p-2 w-14">Yours</th>
                  <th className="p-2 w-14">Key</th>
                  <th className="p-2 w-16">Status</th>
                  <th className="p-2 w-16 text-right">Marks</th>
                  <th className="p-2 text-right">Time</th>
                </tr>
              </thead>
              <tbody>
                {analysis.map((item, idx) => (
                  <tr
                    key={item.questionNo}
                    className={`border-b border-border/20 ${
                      item.isCorrect ? 'bg-success/5' : item.isWrong ? 'bg-destructive/5' : ''
                    } ${idx % 2 !== 0 ? 'bg-muted/10' : ''}`}
                  >
                    <td className="p-2 font-mono font-bold text-right text-muted-foreground">{item.questionNo}</td>
                    <td className={`p-2 font-mono font-bold ${!item.selected ? 'text-muted-foreground/40' : 'text-foreground'}`}>
                      {item.selected ?? '—'}
                    </td>
                    <td className="p-2 font-mono font-bold text-primary">{item.correct ?? '—'}</td>
                    <td className="p-2 font-mono text-xs font-bold">
                      {item.isSkipped ? (
                        <span className="text-muted-foreground">SKIP</span>
                      ) : item.isCorrect ? (
                        <span className="text-success">✓</span>
                      ) : (
                        <span className="text-destructive">✗</span>
                      )}
                    </td>
                    <td className={`p-2 text-right font-mono font-bold text-xs ${
                      item.marks > 0 ? 'text-success' : item.marks < 0 ? 'text-destructive' : 'text-muted-foreground'
                    }`}>
                      {item.marks > 0 ? `+${item.marks}` : item.marks}
                    </td>
                    <td className="p-2 text-right font-mono text-xs text-muted-foreground">
                      {item.timeGap != null ? fmt(item.timeGap) : '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AnalysisPage;
