import { useCallback, useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTestStore } from '@/store/testStore';
import Timer from '@/components/Timer';
import OMRRow from '@/components/OMRRow';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { CheckCircle, Flag, Send, AlertTriangle } from 'lucide-react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';

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
      <div className="sticky top-0 z-50 bg-card/95 backdrop-blur border-b border-border px-4 py-3">
        <div className="max-w-3xl mx-auto flex items-center justify-between gap-4 flex-wrap">
          <div className="flex items-center gap-3">
            <Timer totalSeconds={config.timeInMinutes * 60} onTimeUp={handleEnd} />
          </div>
          <div className="flex items-center gap-3 flex-wrap">
            <Badge variant="secondary" className="gap-1 font-mono">
              <CheckCircle className="w-3.5 h-3.5" />
              {stats.answered}/{stats.total}
            </Badge>
            <Badge variant="outline" className="gap-1 font-mono text-review border-review/30">
              <Flag className="w-3.5 h-3.5" />
              {stats.reviewed}
            </Badge>
            <Button size="sm" onClick={() => setShowConfirm(true)} className="gap-1.5 font-semibold">
              <Send className="w-4 h-4" />
              Submit
            </Button>
          </div>
        </div>
      </div>

      {/* OMR Sheet */}
      <div className="flex-1 max-w-3xl mx-auto w-full p-4">
        <Card className="overflow-hidden border-border/50">
          {responses.map((r) => (
            <OMRRow
              key={r.questionNo}
              response={r}
              onSelect={(opt) => selectOption(r.questionNo, opt)}
              onToggleReview={() => toggleReview(r.questionNo)}
            />
          ))}
        </Card>
      </div>

      {/* Submit confirmation */}
      <AlertDialog open={showConfirm} onOpenChange={setShowConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-review" />
              Submit Test?
            </AlertDialogTitle>
            <AlertDialogDescription>
              You have answered {stats.answered} out of {stats.total} questions.
              {stats.reviewed > 0 && ` ${stats.reviewed} question(s) marked for review.`}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Continue Test</AlertDialogCancel>
            <AlertDialogAction onClick={handleEnd}>Submit</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default TestPage;
