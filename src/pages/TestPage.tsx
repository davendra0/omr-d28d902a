import { useCallback, useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTestStore } from '@/store/testStore';
import Timer from '@/components/Timer';
import type { Option } from '@/types/test';

const options: Option[] = ['A', 'B', 'C', 'D'];

const TestPage = () => {
  const { config, responses, selectOption, toggleReview, endTest } = useTestStore();
  const navigate = useNavigate();
  const [showConfirm, setShowConfirm] = useState(false);

  const handleEnd = useCallback(() => {
    endTest();
    navigate('/results');
  }, [endTest, navigate]);

  const stats = useMemo(() => {
    const answered = responses.filter((r) => r.selected !== null).length;
    const reviewed = responses.filter((r) => r.markedForReview).length;
    return { answered, reviewed, total: responses.length };
  }, [responses]);

  if (!config) {
    navigate('/');
    return null;
  }

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Sticky header */}
      <div className="sticky top-0 z-50 bg-card border-b-2 border-border px-4 py-3">
        <div className="max-w-4xl mx-auto flex items-center justify-between gap-4 flex-wrap">
          <Timer totalSeconds={config.timeInMinutes * 60} onTimeUp={handleEnd} />
          <div className="flex items-center gap-4 text-sm font-mono">
            <span className="text-muted-foreground">
              Q{config.startFrom}–{config.startFrom + config.totalQuestions - 1}
            </span>
            <span className="text-primary font-bold">
              ✓ {stats.answered}/{stats.total}
            </span>
            {stats.reviewed > 0 && (
              <span className="text-review font-bold">⚑ {stats.reviewed}</span>
            )}
            <button
              onClick={() => setShowConfirm(true)}
              className="px-4 py-2 bg-primary text-primary-foreground font-bold rounded hover:opacity-90 transition-opacity"
            >
              Submit
            </button>
          </div>
        </div>
      </div>

      {/* OMR Sheet - Row format */}
      <div className="flex-1 max-w-4xl mx-auto w-full p-4">
        <div className="bg-card border border-border rounded-lg overflow-hidden">
          {responses.map((r, idx) => (
            <div
              key={r.questionNo}
              className={`flex items-center gap-3 px-4 py-3 border-b border-border/50 transition-colors
                ${r.markedForReview ? 'bg-review/8' : idx % 2 === 0 ? 'bg-card' : 'bg-muted/30'}
                ${r.selected ? 'border-l-4 border-l-primary' : 'border-l-4 border-l-transparent'}
              `}
            >
              {/* Question number */}
              <span className="font-mono text-base font-bold text-muted-foreground w-14 text-right shrink-0">
                Q.{r.questionNo}
              </span>

              {/* Option buttons */}
              <div className="flex items-center gap-2">
                {options.map((opt) => (
                  <button
                    key={opt}
                    type="button"
                    onClick={() => selectOption(r.questionNo, opt!)}
                    className={`w-11 h-11 rounded-full border-2 font-bold font-mono text-sm transition-all
                      ${r.selected === opt
                        ? 'bg-primary text-primary-foreground border-primary scale-110'
                        : 'border-border text-muted-foreground hover:border-primary hover:text-foreground hover:scale-105'
                      }
                    `}
                  >
                    {opt}
                  </button>
                ))}
              </div>

              {/* Review toggle */}
              <button
                type="button"
                onClick={() => toggleReview(r.questionNo)}
                className={`ml-auto text-lg transition-all ${
                  r.markedForReview ? 'text-review' : 'text-border hover:text-muted-foreground'
                }`}
                title="Mark for review"
              >
                ⚑
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* Submit confirmation modal */}
      {showConfirm && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-foreground/50">
          <div className="bg-card border border-border rounded-lg p-6 max-w-sm w-full mx-4 space-y-4">
            <h2 className="text-lg font-bold text-foreground">Submit Test?</h2>
            <p className="text-sm text-muted-foreground">
              You have answered <strong>{stats.answered}</strong> out of <strong>{stats.total}</strong> questions.
              {stats.reviewed > 0 && ` ${stats.reviewed} marked for review.`}
            </p>
            <p className="text-xs text-muted-foreground">
              Unanswered: {stats.total - stats.answered} (0 marks each)
            </p>
            <div className="flex gap-3 justify-end">
              <button
                onClick={() => setShowConfirm(false)}
                className="px-4 py-2 border border-border rounded text-sm font-medium text-foreground hover:bg-muted"
              >
                Continue Test
              </button>
              <button
                onClick={handleEnd}
                className="px-4 py-2 bg-primary text-primary-foreground rounded text-sm font-bold hover:opacity-90"
              >
                Submit
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default TestPage;
