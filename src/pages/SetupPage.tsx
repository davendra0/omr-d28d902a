import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTestStore } from '@/store/testStore';
import DarkModeToggle from '@/components/DarkModeToggle';

const SetupPage = () => {
  const [totalQuestions, setTotalQuestions] = useState('');
  const [startFrom, setStartFrom] = useState('1');
  const [timeInMinutes, setTimeInMinutes] = useState('');
  const { setConfig, startTest } = useTestStore();
  const navigate = useNavigate();

  const handleStart = () => {
    const total = parseInt(totalQuestions);
    const start = parseInt(startFrom) || 1;
    const time = parseInt(timeInMinutes);
    if (!total || total < 1 || !time || time < 1) return;
    setConfig({ totalQuestions: total, startFrom: start, timeInMinutes: time });
    startTest();
    navigate('/test');
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-6 bg-background">
      <div className="absolute top-4 right-4">
        <DarkModeToggle />
      </div>
      <div className="w-full max-w-md space-y-8">
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
    </div>
  );
};

export default SetupPage;
