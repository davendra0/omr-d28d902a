import { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTestStore } from '@/store/testStore';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, CheckCircle, XCircle, MinusCircle, Clock, TrendingUp, Zap, Target, BarChart3 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, LineChart, Line, CartesianGrid } from 'recharts';

const COLORS = {
  correct: 'hsl(142, 71%, 45%)',
  incorrect: 'hsl(0, 72%, 51%)',
  unanswered: 'hsl(220, 10%, 70%)',
  primary: 'hsl(174, 62%, 42%)',
};

const AnalysisPage = () => {
  const { result, answerKey } = useTestStore();
  const navigate = useNavigate();

  // Time gaps ordered by answer sequence
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
      return {
        questionNo: r.questionNo,
        selected: r.selected,
        correct,
        isCorrect: r.selected !== null && r.selected === correct,
        isWrong: r.selected !== null && r.selected !== correct,
        isSkipped: r.selected === null,
        timeGap: timeGaps[r.questionNo] ?? null,
      };
    });
  }, [result, answerKey, timeGaps]);

  if (!result || !answerKey) {
    navigate('/results');
    return null;
  }

  const correctCount = analysis.filter((a) => a.isCorrect).length;
  const incorrectCount = analysis.filter((a) => a.isWrong).length;
  const skippedCount = analysis.filter((a) => a.isSkipped).length;
  const total = analysis.length;
  const accuracy = total > 0 ? Math.round((correctCount / total) * 100) : 0;
  const attemptRate = total > 0 ? Math.round(((total - skippedCount) / total) * 100) : 0;

  // Option distribution
  const optionDist = { A: 0, B: 0, C: 0, D: 0 };
  analysis.forEach((a) => { if (a.selected) optionDist[a.selected]++; });
  const optionData = Object.entries(optionDist).map(([name, value]) => ({ name, value }));

  // Correct answer distribution
  const correctDist = { A: 0, B: 0, C: 0, D: 0 };
  analysis.forEach((a) => { if (a.correct) correctDist[a.correct]++; });
  const correctDistData = Object.entries(correctDist).map(([name, value]) => ({ name, value }));

  // Pie data
  const pieData = [
    { name: 'Correct', value: correctCount, color: COLORS.correct },
    { name: 'Incorrect', value: incorrectCount, color: COLORS.incorrect },
    { name: 'Skipped', value: skippedCount, color: COLORS.unanswered },
  ].filter(d => d.value > 0);

  // Time per question chart (only answered)
  const timeChartData = analysis
    .filter((a) => a.timeGap !== null)
    .map((a) => ({ q: `Q${a.questionNo}`, time: a.timeGap!, status: a.isCorrect ? 'correct' : a.isWrong ? 'wrong' : 'skip' }));

  // Streaks
  const longestCorrectStreak = (() => {
    let max = 0, cur = 0;
    analysis.forEach((a) => {
      if (a.isCorrect) { cur++; max = Math.max(max, cur); }
      else cur = 0;
    });
    return max;
  })();

  const longestIncorrectStreak = (() => {
    let max = 0, cur = 0;
    analysis.forEach((a) => {
      if (a.isWrong) { cur++; max = Math.max(max, cur); }
      else cur = 0;
    });
    return max;
  })();

  // Avg time
  const answeredTimes = analysis.filter((a) => a.timeGap !== null).map((a) => a.timeGap!);
  const avgTime = answeredTimes.length > 0 ? Math.round(answeredTimes.reduce((a, b) => a + b, 0) / answeredTimes.length) : 0;
  const fastestQ = answeredTimes.length > 0 ? Math.min(...answeredTimes) : 0;
  const slowestQ = answeredTimes.length > 0 ? Math.max(...answeredTimes) : 0;

  // Cumulative accuracy over questions (rolling)
  const cumulativeData = (() => {
    let c = 0, t = 0;
    return analysis.map((a) => {
      t++;
      if (a.isCorrect) c++;
      return { q: `Q${a.questionNo}`, accuracy: Math.round((c / t) * 100) };
    });
  })();

  // Segment analysis (split into quarters)
  const segmentSize = Math.ceil(total / 4);
  const segments = Array.from({ length: 4 }, (_, i) => {
    const slice = analysis.slice(i * segmentSize, (i + 1) * segmentSize);
    const seg_correct = slice.filter(a => a.isCorrect).length;
    const seg_total = slice.length;
    return {
      name: `Q${slice[0]?.questionNo ?? '?'}–${slice[slice.length - 1]?.questionNo ?? '?'}`,
      accuracy: seg_total > 0 ? Math.round((seg_correct / seg_total) * 100) : 0,
      correct: seg_correct,
      total: seg_total,
    };
  }).filter(s => s.total > 0);

  const formatGap = (s: number) => {
    if (s < 60) return `${s}s`;
    return `${Math.floor(s / 60)}m ${s % 60}s`;
  };

  return (
    <div className="min-h-screen bg-background p-4 pb-12">
      <div className="max-w-6xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => navigate('/results')}>
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <h1 className="text-xl font-bold font-mono">Detailed Analysis</h1>
        </div>

        {/* Key metrics */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          {[
            { label: 'Correct', value: correctCount, icon: CheckCircle, color: 'text-success' },
            { label: 'Incorrect', value: incorrectCount, icon: XCircle, color: 'text-destructive' },
            { label: 'Skipped', value: skippedCount, icon: MinusCircle, color: 'text-muted-foreground' },
            { label: 'Accuracy', value: `${accuracy}%`, icon: Target, color: 'text-primary' },
            { label: 'Attempt Rate', value: `${attemptRate}%`, icon: Zap, color: 'text-review' },
            { label: 'Avg Time', value: formatGap(avgTime), icon: Clock, color: 'text-foreground' },
          ].map((m) => (
            <Card key={m.label} className="border-border/40">
              <CardContent className="p-3 text-center">
                <m.icon className={cn('w-4 h-4 mx-auto mb-1', m.color)} />
                <div className={cn('text-lg font-bold font-mono', m.color)}>{m.value}</div>
                <div className="text-[10px] text-muted-foreground mt-0.5">{m.label}</div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Charts row */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Pie chart */}
          <Card className="border-border/40">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-mono text-muted-foreground">Score Breakdown</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-48">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={pieData} cx="50%" cy="50%" innerRadius={45} outerRadius={75} dataKey="value" strokeWidth={2} stroke="hsl(var(--background))">
                      {pieData.map((entry, i) => (
                        <Cell key={i} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(value: number, name: string) => [`${value} (${Math.round((value / total) * 100)}%)`, name]} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div className="flex justify-center gap-4 text-xs">
                {pieData.map((d) => (
                  <div key={d.name} className="flex items-center gap-1.5">
                    <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: d.color }} />
                    {d.name}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Cumulative accuracy */}
          <Card className="border-border/40">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-mono text-muted-foreground">Accuracy Trend</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-48">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={cumulativeData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                    <XAxis dataKey="q" tick={{ fontSize: 9 }} interval={Math.max(0, Math.floor(cumulativeData.length / 10) - 1)} />
                    <YAxis domain={[0, 100]} tick={{ fontSize: 10 }} width={35} />
                    <Tooltip formatter={(v: number) => [`${v}%`, 'Accuracy']} />
                    <Line type="monotone" dataKey="accuracy" stroke={COLORS.primary} strokeWidth={2} dot={false} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>

          {/* Time per question */}
          <Card className="border-border/40">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-mono text-muted-foreground">Time Per Question</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-48">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={timeChartData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                    <XAxis dataKey="q" tick={{ fontSize: 8 }} interval={Math.max(0, Math.floor(timeChartData.length / 12) - 1)} />
                    <YAxis tick={{ fontSize: 10 }} width={35} />
                    <Tooltip formatter={(v: number) => [formatGap(v), 'Time']} />
                    <Bar dataKey="time" fill={COLORS.primary} radius={[2, 2, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>

          {/* Option distribution */}
          <Card className="border-border/40">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-mono text-muted-foreground">Your Option Distribution vs Answer Key</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-4 gap-3">
                {['A', 'B', 'C', 'D'].map((opt) => (
                  <div key={opt} className="text-center space-y-1">
                    <div className="font-mono text-lg font-bold text-foreground">{opt}</div>
                    <div className="text-xs text-primary font-mono">{optionDist[opt as keyof typeof optionDist]}×</div>
                    <div className="text-[10px] text-muted-foreground">yours</div>
                    <div className="h-px bg-border my-1" />
                    <div className="text-xs text-success font-mono">{correctDist[opt as keyof typeof correctDist]}×</div>
                    <div className="text-[10px] text-muted-foreground">key</div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Segment analysis + streaks */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Card className="border-border/40">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-mono text-muted-foreground flex items-center gap-2">
                <BarChart3 className="w-4 h-4" /> Section-wise Performance
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {segments.map((seg) => (
                <div key={seg.name} className="flex items-center gap-3">
                  <span className="font-mono text-xs text-muted-foreground w-24 shrink-0">{seg.name}</span>
                  <div className="flex-1 h-5 bg-muted rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all duration-300"
                      style={{
                        width: `${seg.accuracy}%`,
                        backgroundColor: seg.accuracy >= 70 ? COLORS.correct : seg.accuracy >= 40 ? COLORS.primary : COLORS.incorrect,
                      }}
                    />
                  </div>
                  <span className="font-mono text-xs font-bold w-10 text-right">{seg.accuracy}%</span>
                </div>
              ))}
            </CardContent>
          </Card>

          <Card className="border-border/40">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-mono text-muted-foreground flex items-center gap-2">
                <Zap className="w-4 h-4" /> Quick Stats
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-3">
                {[
                  { label: 'Best Streak', value: `${longestCorrectStreak} ✓`, sub: 'consecutive correct' },
                  { label: 'Worst Streak', value: `${longestIncorrectStreak} ✗`, sub: 'consecutive wrong' },
                  { label: 'Fastest', value: formatGap(fastestQ), sub: 'quickest answer' },
                  { label: 'Slowest', value: formatGap(slowestQ), sub: 'slowest answer' },
                ].map((s) => (
                  <div key={s.label} className="p-2 rounded-lg bg-muted/50 text-center">
                    <div className="text-xs text-muted-foreground">{s.label}</div>
                    <div className="font-mono font-bold text-sm mt-0.5">{s.value}</div>
                    <div className="text-[9px] text-muted-foreground">{s.sub}</div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Per-question table */}
        <Card className="overflow-hidden border-border/40">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-mono text-muted-foreground">Question-wise Breakdown</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border/50 text-muted-foreground text-xs font-mono">
                    <th className="p-2 text-right w-14">Q.No</th>
                    <th className="p-2 w-16">Yours</th>
                    <th className="p-2 w-16">Key</th>
                    <th className="p-2 w-20">Status</th>
                    <th className="p-2 text-right">Time Gap</th>
                  </tr>
                </thead>
                <tbody>
                  {analysis.map((item) => (
                    <tr
                      key={item.questionNo}
                      className={cn(
                        'border-b border-border/20 transition-colors',
                        item.isCorrect && 'bg-success/5',
                        item.isWrong && 'bg-destructive/5'
                      )}
                    >
                      <td className="p-2 font-mono font-bold text-right text-muted-foreground">{item.questionNo}</td>
                      <td className={cn('p-2 font-mono font-bold', !item.selected && 'text-muted-foreground/40')}>
                        {item.selected ?? '—'}
                      </td>
                      <td className="p-2 font-mono font-bold text-primary">{item.correct ?? '—'}</td>
                      <td className="p-2">
                        {item.isSkipped ? (
                          <Badge variant="secondary" className="text-[10px] h-5 px-1.5"><MinusCircle className="w-3 h-3 mr-0.5" />Skip</Badge>
                        ) : item.isCorrect ? (
                          <Badge className="text-[10px] h-5 px-1.5 bg-success text-success-foreground"><CheckCircle className="w-3 h-3 mr-0.5" />✓</Badge>
                        ) : (
                          <Badge variant="destructive" className="text-[10px] h-5 px-1.5"><XCircle className="w-3 h-3 mr-0.5" />✗</Badge>
                        )}
                      </td>
                      <td className="p-2 text-right font-mono text-xs text-muted-foreground">
                        {timeGaps[item.questionNo] != null ? formatGap(timeGaps[item.questionNo]) : '—'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default AnalysisPage;
