import { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTestStore } from '@/store/testStore';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, Check, SkipForward } from 'lucide-react';
import type { AnswerKey, Option } from '@/types/test';
import { cn } from '@/lib/utils';

const validOptions = ['A', 'B', 'C', 'D'];

const AnswerKeyPage = () => {
  const { result, setAnswerKey } = useTestStore();
  const navigate = useNavigate();

  const questions = result?.responses ?? [];
  const [answers, setAnswers] = useState<AnswerKey>({});
  const [currentIdx, setCurrentIdx] = useState(0);
  const inputRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    inputRef.current?.focus();
  }, [currentIdx]);

  if (!result) {
    navigate('/');
    return null;
  }

  const currentQ = questions[currentIdx];
  const totalFilled = Object.keys(answers).length;

  const handleKeyDown = (e: React.KeyboardEvent) => {
    const key = e.key.toUpperCase();
    if (validOptions.includes(key)) {
      setAnswers((prev) => ({ ...prev, [currentQ.questionNo]: key as Option }));
      // Auto-advance
      if (currentIdx < questions.length - 1) {
        setTimeout(() => setCurrentIdx((i) => i + 1), 150);
      }
    } else if (e.key === 'Enter') {
      if (currentIdx < questions.length - 1) {
        setCurrentIdx((i) => i + 1);
      }
    } else if (e.key === 'Backspace') {
      if (answers[currentQ.questionNo]) {
        setAnswers((prev) => {
          const copy = { ...prev };
          delete copy[currentQ.questionNo];
          return copy;
        });
      } else if (currentIdx > 0) {
        setCurrentIdx((i) => i - 1);
      }
    } else if (e.key === 'ArrowUp' && currentIdx > 0) {
      setCurrentIdx((i) => i - 1);
    } else if (e.key === 'ArrowDown' && currentIdx < questions.length - 1) {
      setCurrentIdx((i) => i + 1);
    }
  };

  const handleSubmit = () => {
    setAnswerKey(answers);
    navigate('/results');
  };

  return (
    <div
      className="min-h-screen bg-background p-4 outline-none"
      tabIndex={0}
      ref={inputRef}
      onKeyDown={handleKeyDown}
    >
      <div className="max-w-lg mx-auto space-y-4">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => navigate('/results')}>
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <h1 className="text-xl font-bold font-mono">Answer Key</h1>
          <Badge variant="secondary" className="ml-auto font-mono">
            {totalFilled}/{questions.length}
          </Badge>
        </div>

        <Card className="border-border/50">
          <CardHeader className="pb-3">
            <CardDescription>
              Press <kbd className="px-1.5 py-0.5 bg-muted rounded text-xs font-mono">A</kbd>{' '}
              <kbd className="px-1.5 py-0.5 bg-muted rounded text-xs font-mono">B</kbd>{' '}
              <kbd className="px-1.5 py-0.5 bg-muted rounded text-xs font-mono">C</kbd>{' '}
              <kbd className="px-1.5 py-0.5 bg-muted rounded text-xs font-mono">D</kbd>{' '}
              to set answer • <kbd className="px-1.5 py-0.5 bg-muted rounded text-xs font-mono">↑↓</kbd> to navigate •{' '}
              <kbd className="px-1.5 py-0.5 bg-muted rounded text-xs font-mono">⌫</kbd> to clear
            </CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            <div className="max-h-[50vh] overflow-y-auto">
              {questions.map((q, idx) => (
                <div
                  key={q.questionNo}
                  onClick={() => setCurrentIdx(idx)}
                  className={cn(
                    'flex items-center gap-4 px-4 py-2.5 border-b border-border/50 cursor-pointer transition-colors',
                    idx === currentIdx && 'bg-primary/5 border-l-2 border-l-primary'
                  )}
                >
                  <span className="font-mono text-sm font-bold w-10 text-right text-muted-foreground">
                    {q.questionNo}.
                  </span>
                  <div className="flex gap-2">
                    {validOptions.map((opt) => (
                      <div
                        key={opt}
                        className={cn(
                          'w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold border-2 transition-all',
                          answers[q.questionNo] === opt
                            ? 'bg-primary text-primary-foreground border-primary'
                            : 'border-border/50 text-muted-foreground'
                        )}
                      >
                        {opt}
                      </div>
                    ))}
                  </div>
                  {answers[q.questionNo] && (
                    <Check className="w-4 h-4 text-success ml-auto" />
                  )}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Button onClick={handleSubmit} className="w-full h-11 font-semibold gap-2">
          <Check className="w-5 h-5" />
          Apply Answer Key & Check
        </Button>
      </div>
    </div>
  );
};

export default AnswerKeyPage;
