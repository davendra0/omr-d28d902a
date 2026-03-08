import { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTestStore } from '@/store/testStore';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, CheckCircle, XCircle, MinusCircle, Clock, TrendingUp } from 'lucide-react';
import type { AnalysisItem } from '@/types/test';
import { cn } from '@/lib/utils';

const AnalysisPage = () => {
  const { result, answerKey } = useTestStore();
  const navigate = useNavigate();

  const analysis = useMemo<AnalysisItem[]>(() => {
    if (!result || !answerKey) return [];

    const sorted = [...result.responses].sort((a, b) => {
      if (!a.answeredAt && !b.answeredAt) return a.questionNo - b.questionNo;
      if (!a.answeredAt) return 1;
      if (!b.answeredAt) return -1;
      return a.answeredAt - b.answeredAt;
    });

    let lastAnsweredTime = result.startTime;

    return result.responses.map((r) => {
      const correct = answerKey[r.questionNo] ?? null;
      const isCorrect = r.selected !== null && r.selected === correct;

      // find time gap
      let timeTaken: number | null = null;
      if (r.answeredAt) {
        timeTaken = Math.round((r.answeredAt - lastAnsweredTime) / 1000);
        // We show the gap from test start or previous answer based on answer order
      }

      return {
        questionNo: r.questionNo,
        selected: r.selected,
        correct,
        isCorrect,
        timeTaken: r.answeredAt ? timeTaken : null,
      };
    });
  }, [result, answerKey]);

  // Compute ordered time gaps
  const timeGaps = useMemo(() => {
    if (!result) return {};
    const answeredResponses = result.responses
      .filter((r) => r.answeredAt !== null)
      .sort((a, b) => a.answeredAt! - b.answeredAt!);

    const gaps: Record<number, number> = {};
    let prev = result.startTime;
    answeredResponses.forEach((r) => {
      gaps[r.questionNo] = Math.round((r.answeredAt! - prev) / 1000);
      prev = r.answeredAt!;
    });
    return gaps;
  }, [result]);

  if (!result || !answerKey) {
    navigate('/results');
    return null;
  }

  const correct = analysis.filter((a) => a.isCorrect).length;
  const incorrect = analysis.filter((a) => a.selected && !a.isCorrect).length;
  const unanswered = analysis.filter((a) => !a.selected).length;
  const accuracy = analysis.length > 0 ? Math.round((correct / analysis.length) * 100) : 0;

  const formatGap = (s: number) => {
    if (s < 60) return `${s}s`;
    return `${Math.floor(s / 60)}m ${s % 60}s`;
  };

  return (
    <div className="min-h-screen bg-background p-4">
      <div className="max-w-3xl mx-auto space-y-5">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => navigate('/results')}>
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <h1 className="text-xl font-bold font-mono">Detailed Analysis</h1>
        </div>

        {/* Summary cards */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <Card className="border-success/30">
            <CardContent className="p-4 text-center">
              <div className="text-2xl font-bold font-mono text-success">{correct}</div>
              <div className="text-xs text-muted-foreground">Correct</div>
            </CardContent>
          </Card>
          <Card className="border-destructive/30">
            <CardContent className="p-4 text-center">
              <div className="text-2xl font-bold font-mono text-destructive">{incorrect}</div>
              <div className="text-xs text-muted-foreground">Incorrect</div>
            </CardContent>
          </Card>
          <Card className="border-border/50">
            <CardContent className="p-4 text-center">
              <div className="text-2xl font-bold font-mono text-muted-foreground">{unanswered}</div>
              <div className="text-xs text-muted-foreground">Unanswered</div>
            </CardContent>
          </Card>
          <Card className="border-primary/30">
            <CardContent className="p-4 text-center">
              <div className="text-2xl font-bold font-mono text-primary">{accuracy}%</div>
              <div className="text-xs text-muted-foreground flex items-center justify-center gap-1">
                <TrendingUp className="w-3 h-3" /> Accuracy
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Per-question analysis */}
        <Card className="overflow-hidden border-border/50">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-mono text-muted-foreground flex items-center gap-6">
              <span className="w-10 text-right">Q.No</span>
              <span className="w-12">Yours</span>
              <span className="w-12">Correct</span>
              <span className="w-16">Status</span>
              <span className="ml-auto flex items-center gap-1">
                <Clock className="w-3 h-3" /> Time Gap
              </span>
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {analysis.map((item) => (
              <div
                key={item.questionNo}
                className={cn(
                  'flex items-center gap-6 px-4 py-2.5 border-b border-border/30 text-sm',
                  item.isCorrect && 'bg-success/5',
                  item.selected && !item.isCorrect && 'bg-destructive/5'
                )}
              >
                <span className="font-mono font-bold w-10 text-right text-muted-foreground">
                  {item.questionNo}
                </span>
                <span className={cn(
                  'font-mono font-bold w-12',
                  !item.selected && 'text-muted-foreground/40'
                )}>
                  {item.selected ?? '—'}
                </span>
                <span className="font-mono font-bold w-12 text-primary">
                  {item.correct ?? '—'}
                </span>
                <span className="w-16">
                  {!item.selected ? (
                    <Badge variant="secondary" className="text-xs"><MinusCircle className="w-3 h-3 mr-1" />Skip</Badge>
                  ) : item.isCorrect ? (
                    <Badge className="text-xs bg-success text-success-foreground"><CheckCircle className="w-3 h-3 mr-1" />✓</Badge>
                  ) : (
                    <Badge variant="destructive" className="text-xs"><XCircle className="w-3 h-3 mr-1" />✗</Badge>
                  )}
                </span>
                <span className="ml-auto font-mono text-xs text-muted-foreground">
                  {timeGaps[item.questionNo] != null ? formatGap(timeGaps[item.questionNo]) : '—'}
                </span>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default AnalysisPage;
