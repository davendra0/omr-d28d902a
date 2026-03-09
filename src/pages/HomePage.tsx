import { useNavigate } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { getSavedTests } from '@/lib/testHistory';
import { getCountdowns, type Countdown } from '@/lib/countdownStore';

const HomePage = () => {
  const navigate = useNavigate();
  const [testCount, setTestCount] = useState(0);
  const [nextCountdown, setNextCountdown] = useState<Countdown | null>(null);

  useEffect(() => {
    setTestCount(getSavedTests().length);
    const cds = getCountdowns().filter(c => new Date(c.targetDate) >= new Date());
    if (cds.length > 0) {
      cds.sort((a, b) => new Date(a.targetDate).getTime() - new Date(b.targetDate).getTime());
      setNextCountdown(cds[0]);
    }
  }, []);

  const daysUntil = (date: string) => {
    const diff = new Date(date).getTime() - Date.now();
    return Math.max(0, Math.ceil(diff / (1000 * 60 * 60 * 24)));
  };

  const tools = [
    {
      icon: '📝',
      title: 'OMR Test',
      description: 'Practice with timed OMR-style tests',
      detail: testCount > 0 ? `${testCount} saved test${testCount > 1 ? 's' : ''}` : 'Start a new test',
      path: '/omr',
      accent: 'from-primary/20 to-primary/5',
    },
    {
      icon: '⏳',
      title: 'Countdowns',
      description: 'Track days until important events',
      detail: nextCountdown ? `${daysUntil(nextCountdown.targetDate)} days to ${nextCountdown.title}` : 'Add your first countdown',
      path: '/countdown',
      accent: 'from-accent/20 to-accent/5',
    },
    {
      icon: '🍅',
      title: 'Pomodoro',
      description: 'Focus timer with break management',
      detail: 'Stay productive',
      path: '/pomodoro',
      accent: 'from-destructive/20 to-destructive/5',
    },
  ];

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-8">
      <div className="space-y-2">
        <h1 className="text-3xl font-bold font-mono text-foreground tracking-tight">
          Good {new Date().getHours() < 12 ? 'morning' : new Date().getHours() < 17 ? 'afternoon' : 'evening'} 👋
        </h1>
        <p className="text-muted-foreground text-sm">Your personal productivity workspace</p>
      </div>

      {/* Quick countdown banner */}
      {nextCountdown && (
        <div className="bg-gradient-to-r from-accent/15 to-transparent border border-accent/20 rounded-xl p-4 flex items-center gap-4">
          <div className="text-3xl font-mono font-black text-accent">{daysUntil(nextCountdown.targetDate)}</div>
          <div>
            <div className="text-sm font-semibold text-foreground">days until {nextCountdown.title}</div>
            <div className="text-xs text-muted-foreground">{new Date(nextCountdown.targetDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })}</div>
          </div>
        </div>
      )}

      {/* Tool cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {tools.map((tool) => (
          <button
            key={tool.path}
            onClick={() => navigate(tool.path)}
            className="text-left bg-card border border-border rounded-xl p-5 hover:border-primary/40 hover:shadow-md transition-all group"
          >
            <div className={`w-12 h-12 rounded-lg bg-gradient-to-br ${tool.accent} flex items-center justify-center text-2xl mb-4`}>
              {tool.icon}
            </div>
            <h2 className="font-bold text-foreground group-hover:text-primary transition-colors">{tool.title}</h2>
            <p className="text-xs text-muted-foreground mt-1">{tool.description}</p>
            <div className="text-xs font-mono text-primary/70 mt-3">{tool.detail}</div>
          </button>
        ))}
      </div>
    </div>
  );
};

export default HomePage;
