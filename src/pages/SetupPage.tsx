import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTestStore } from '@/store/testStore';
import DarkModeToggle from '@/components/DarkModeToggle';
import { getSavedTests, deleteTest, type SavedTest } from '@/lib/testHistory';

const SetupPage = () => {
  const [totalQuestions, setTotalQuestions] = useState('');
  const [startFrom, setStartFrom] = useState('1');
  const [timeInMinutes, setTimeInMinutes] = useState('');
  const { setConfig, startTest, setResult, setAnswerKey } = useTestStore();
  const navigate = useNavigate();
  const [savedTests, setSavedTests] = useState<SavedTest[]>([]);

  useEffect(() => {
    setSavedTests(getSavedTests());
  }, []);

  const handleStart = () => {
    const total = parseInt(totalQuestions);
    const start = parseInt(startFrom) || 1;
    const time = parseInt(timeInMinutes);
    if (!total || total < 1 || !time || time < 1) return;
    setConfig({ totalQuestions: total, startFrom: start, timeInMinutes: time });
    startTest();
    navigate('/test');
  };

  const handleLoadTest = (test: SavedTest) => {
    setResult(test.result);
    if (test.answerKey) setAnswerKey(test.answerKey);
    navigate('/results');
  };

  const handleDeleteTest = (id: string) => {
    deleteTest(id);
    setSavedTests(getSavedTests());
  };

  const formatDate = (ts: number) => {
    const d = new Date(ts);
    return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) +
      ' ' + d.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' });
  };

  const formatTime = (ms: number) => {
    const s = Math.round(ms / 1000);
    const m = Math.floor(s / 60);
    return `${m}m ${s % 60}s`;
  };

  return (
    <div className="min-h-screen flex flex-col items-center p-6 bg-background">
      <div className="absolute top-4 right-4">
        <DarkModeToggle />
      </div>
      <div className="w-full max-w-md space-y-8 mt-8">
        <div className="text-center">
          <h1 className="text-3xl font-bold font-mono tracking-tight text-foreground">OMR Test</h1>
          <p className="text-muted-foreground mt-2 text-sm">Configure your test and start</p>
        </div>

        <div className="space-y-5 bg-card border border-border rounded-lg p-6">
          <div>
            <label className="block text-sm font-medium text-foreground mb-1">Number of Questions</label>
            <input
              type="number"
              min={1}
              placeholder="e.g. 90"
              value={totalQuestions}
              onChange={(e) => setTotalQuestions(e.target.value)}
              className="w-full h-12 px-4 text-lg font-mono border border-border rounded bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-foreground mb-1">Starting Question Number</label>
            <input
              type="number"
              min={1}
              placeholder="e.g. 45"
              value={startFrom}
              onChange={(e) => setStartFrom(e.target.value)}
              className="w-full h-12 px-4 text-lg font-mono border border-border rounded bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-foreground mb-1">Time (minutes)</label>
            <input
              type="number"
              min={1}
              placeholder="e.g. 180"
              value={timeInMinutes}
              onChange={(e) => setTimeInMinutes(e.target.value)}
              className="w-full h-12 px-4 text-lg font-mono border border-border rounded bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>

          <div className="text-xs text-muted-foreground bg-muted p-3 rounded">
            <strong>Scoring:</strong> +4 for correct, −1 for wrong, 0 for unanswered
          </div>

          <button
            onClick={handleStart}
            disabled={!totalQuestions || !timeInMinutes}
            className="w-full h-12 bg-primary text-primary-foreground font-bold text-lg rounded hover:opacity-90 disabled:opacity-40 transition-opacity"
          >
            ▶ Start Test
          </button>
        </div>
      </div>

      {/* Past Tests button */}
      {savedTests.length > 0 && (
        <div className="w-full max-w-md mt-8">
          <button
            onClick={() => navigate('/history')}
            className="w-full h-12 border-2 border-border rounded-lg font-bold font-mono text-foreground hover:bg-muted transition-colors flex items-center justify-center gap-2"
          >
            📋 Past Tests ({savedTests.length})
          </button>
        </div>
      )}
    </div>
  );
};

export default SetupPage;
