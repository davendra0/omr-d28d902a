import { useNavigate } from 'react-router-dom';
import { useTestStore } from '@/store/testStore';
import type { Option } from '@/types/test';

const options: Option[] = ['A', 'B', 'C', 'D'];

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

  let correct = 0, incorrect = 0, score = 0;
  if (answerKey) {
    responses.forEach((r) => {
      if (r.selected) {
        if (answerKey[r.questionNo] && r.selected === answerKey[r.questionNo]) {
          correct++;
          score += 4;
        } else if (answerKey[r.questionNo]) {
          incorrect++;
          score -= 1;
        }
      }
    });
  }

  const maxScore = responses.length * 4;

  const formatTime = (s: number) => {
    const m = Math.floor(s / 60);
    const sec = s % 60;
    return `${m}m ${sec}s`;
  };

  const getBubbleClass = (r: typeof responses[0], opt: Option) => {
    if (!answerKey) {
      return r.selected === opt
        ? 'bg-primary text-primary-foreground border-primary'
        : 'border-border text-muted-foreground';
    }
    const correctOpt = answerKey[r.questionNo];
    if (opt === correctOpt && opt === r.selected) return 'bg-success text-success-foreground border-success';
    if (opt === r.selected && opt !== correctOpt) return 'bg-destructive text-destructive-foreground border-destructive';
    if (opt === correctOpt) return 'bg-success/20 text-success border-success';
    return 'border-border/40 text-muted-foreground/40';
  };

  return (
    <div className="min-h-screen bg-background p-4">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between flex-wrap gap-3">
          <h1 className="text-2xl font-bold font-mono text-foreground">Response Sheet</h1>
          <div className="flex gap-2 flex-wrap">
            <button
              onClick={() => navigate('/answer-key')}
              className="px-3 py-2 border border-border rounded text-sm font-medium text-foreground hover:bg-muted"
            >
              📝 Answer Key
            </button>
            {answerKey && (
              <button
                onClick={() => navigate('/analysis')}
                className="px-3 py-2 border border-border rounded text-sm font-medium text-foreground hover:bg-muted"
              >
                📊 Analysis
              </button>
            )}
            <button
              onClick={() => { reset(); navigate('/'); }}
              className="px-3 py-2 bg-secondary text-secondary-foreground rounded text-sm font-medium hover:opacity-80"
            >
              ↺ New Test
            </button>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div className="bg-card border border-border rounded-lg p-4 text-center">
            <div className="text-2xl font-bold font-mono text-primary">{answered}</div>
            <div className="text-xs text-muted-foreground mt-1">✓ Answered</div>
          </div>
          <div className="bg-card border border-border rounded-lg p-4 text-center">
            <div className="text-2xl font-bold font-mono text-muted-foreground">{unanswered}</div>
            <div className="text-xs text-muted-foreground mt-1">— Unanswered</div>
          </div>
          <div className="bg-card border border-border rounded-lg p-4 text-center">
            <div className="text-2xl font-bold font-mono text-review">{reviewed}</div>
            <div className="text-xs text-muted-foreground mt-1">⚑ Reviewed</div>
          </div>
          <div className="bg-card border border-border rounded-lg p-4 text-center">
            <div className="text-2xl font-bold font-mono text-foreground">{formatTime(totalTimeSec)}</div>
            <div className="text-xs text-muted-foreground mt-1">⏱ Time</div>
          </div>
        </div>

        {/* Score section */}
        {answerKey && (
          <div className="bg-card border-2 border-primary/30 rounded-lg p-5">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-center">
              <div>
                <div className="text-3xl font-bold font-mono text-primary">{score}</div>
                <div className="text-xs text-muted-foreground mt-1">Score (out of {maxScore})</div>
              </div>
              <div>
                <div className="text-2xl font-bold font-mono text-success">{correct}</div>
                <div className="text-xs text-muted-foreground mt-1">Correct (+{correct * 4})</div>
              </div>
              <div>
                <div className="text-2xl font-bold font-mono text-destructive">{incorrect}</div>
                <div className="text-xs text-muted-foreground mt-1">Incorrect (−{incorrect})</div>
              </div>
              <div>
                <div className="text-2xl font-bold font-mono text-foreground">
                  {responses.length > 0 ? Math.round((correct / responses.length) * 100) : 0}%
                </div>
                <div className="text-xs text-muted-foreground mt-1">Accuracy</div>
              </div>
            </div>
          </div>
        )}

        {/* OMR Response Sheet - Row format */}
        <div className="bg-card border border-border rounded-lg overflow-hidden">
          <div className="px-4 py-2 bg-muted border-b border-border">
            <span className="font-mono text-xs text-muted-foreground font-bold">RESPONSE SHEET</span>
          </div>
          {responses.map((r, idx) => (
            <div
              key={r.questionNo}
              className={`flex items-center gap-3 px-4 py-2.5 border-b border-border/30
                ${idx % 2 === 0 ? '' : 'bg-muted/20'}
              `}
            >
              <span className="font-mono text-sm font-bold text-muted-foreground w-14 text-right shrink-0">
                Q.{r.questionNo}
              </span>
              <div className="flex items-center gap-2">
                {options.map((opt) => (
                  <div
                    key={opt}
                    className={`w-9 h-9 rounded-full border-2 flex items-center justify-center text-xs font-bold font-mono ${getBubbleClass(r, opt)}`}
                  >
                    {opt}
                  </div>
                ))}
              </div>
              {answerKey && r.selected && (
                <span className="ml-2 font-mono text-xs font-bold">
                  {r.selected === answerKey[r.questionNo] ? (
                    <span className="text-success">+4</span>
                  ) : (
                    <span className="text-destructive">−1</span>
                  )}
                </span>
              )}
              {answerKey && !r.selected && (
                <span className="ml-2 font-mono text-xs text-muted-foreground">0</span>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default ResultsPage;
