import { useNavigate } from 'react-router-dom';
import { useTestStore } from '@/store/testStore';
import OMRCell from '@/components/OMRCell';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { KeyRound, BarChart3, RotateCcw, CheckCircle, MinusCircle, Clock, Flag } from 'lucide-react';

const ResultsPage = () => {
  const { result, answerKey, reset } = useTestStore();
  const navigate = useNavigate();

  if (!result) {
    navigate('/');
    return null;
  }

  const { responses, startTime, endTime } = result;
  const totalTimeSec = Math.round((endTime - startTime) / 1000);
  const answered = responses.filter((r) => r.selected !== null).length;
  const unanswered = responses.length - answered;
  const reviewed = responses.filter((r) => r.markedForReview).length;

  let correct = 0, incorrect = 0;
  if (answerKey) {
    responses.forEach((r) => {
      if (r.selected && answerKey[r.questionNo]) {
        if (r.selected === answerKey[r.questionNo]) correct++;
        else incorrect++;
      }
    });
  }

  const formatTime = (s: number) => {
    const m = Math.floor(s / 60);
    const sec = s % 60;
    return `${m}m ${sec}s`;
  };

  return (
    <div className="min-h-screen bg-background p-4">
      <div className="max-w-6xl mx-auto space-y-6">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <h1 className="text-2xl font-bold font-mono">Response Sheet</h1>
          <div className="flex gap-2 flex-wrap">
            <Button variant="outline" size="sm" onClick={() => navigate('/answer-key')} className="gap-1.5">
              <KeyRound className="w-4 h-4" />
              Answer Key
            </Button>
            {answerKey && (
              <Button variant="outline" size="sm" onClick={() => navigate('/analysis')} className="gap-1.5">
                <BarChart3 className="w-4 h-4" />
                Analysis
              </Button>
            )}
            <Button variant="secondary" size="sm" onClick={() => { reset(); navigate('/'); }} className="gap-1.5">
              <RotateCcw className="w-4 h-4" />
              New Test
            </Button>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <Card className="border-primary/20">
            <CardContent className="p-3 text-center">
              <div className="text-xl font-bold font-mono text-primary">{answered}</div>
              <div className="text-[11px] text-muted-foreground flex items-center justify-center gap-1 mt-0.5">
                <CheckCircle className="w-3 h-3" /> Answered
              </div>
            </CardContent>
          </Card>
          <Card className="border-border/50">
            <CardContent className="p-3 text-center">
              <div className="text-xl font-bold font-mono text-muted-foreground">{unanswered}</div>
              <div className="text-[11px] text-muted-foreground flex items-center justify-center gap-1 mt-0.5">
                <MinusCircle className="w-3 h-3" /> Unanswered
              </div>
            </CardContent>
          </Card>
          <Card className="border-review/20">
            <CardContent className="p-3 text-center">
              <div className="text-xl font-bold font-mono text-review">{reviewed}</div>
              <div className="text-[11px] text-muted-foreground flex items-center justify-center gap-1 mt-0.5">
                <Flag className="w-3 h-3" /> Review
              </div>
            </CardContent>
          </Card>
          <Card className="border-border/50">
            <CardContent className="p-3 text-center">
              <div className="text-xl font-bold font-mono">{formatTime(totalTimeSec)}</div>
              <div className="text-[11px] text-muted-foreground flex items-center justify-center gap-1 mt-0.5">
                <Clock className="w-3 h-3" /> Time
              </div>
            </CardContent>
          </Card>
        </div>

        {answerKey && (
          <div className="grid grid-cols-2 gap-3">
            <Card className="border-success/30">
              <CardContent className="p-3 text-center">
                <div className="text-xl font-bold font-mono text-success">{correct}</div>
                <div className="text-[11px] text-muted-foreground">Correct</div>
              </CardContent>
            </Card>
            <Card className="border-destructive/30">
              <CardContent className="p-3 text-center">
                <div className="text-xl font-bold font-mono text-destructive">{incorrect}</div>
                <div className="text-[11px] text-muted-foreground">Incorrect</div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* OMR Grid */}
        <div className="omr-grid">
          {responses.map((r) => (
            <OMRCell
              key={r.questionNo}
              response={r}
              onSelect={() => {}}
              onToggleReview={() => {}}
              readOnly
              correctAnswer={answerKey?.[r.questionNo] ?? undefined}
            />
          ))}
        </div>
      </div>
    </div>
  );
};

export default ResultsPage;
