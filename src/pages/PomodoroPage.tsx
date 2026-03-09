import { useState, useEffect, useRef, useCallback } from 'react';
import {
  getSettings, saveSettings, addSession, getTodaySessions, getSessions,
  type PomodoroSettings, type PomodoroSession, DEFAULT_SETTINGS,
} from '@/lib/pomodoroStore';

type Phase = 'focus' | 'short_break' | 'long_break';

const PomodoroPage = () => {
  const [settings, setSettings] = useState<PomodoroSettings>(getSettings);
  const [showSettings, setShowSettings] = useState(false);
  const [phase, setPhase] = useState<Phase>('focus');
  const [secondsLeft, setSecondsLeft] = useState(settings.focusMinutes * 60);
  const [running, setRunning] = useState(false);
  const [sessionCount, setSessionCount] = useState(0);
  const [todaySessions, setTodaySessions] = useState<PomodoroSession[]>(getTodaySessions);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const totalSeconds = phase === 'focus'
    ? settings.focusMinutes * 60
    : phase === 'short_break'
      ? settings.shortBreakMinutes * 60
      : settings.longBreakMinutes * 60;

  const phaseLabel: Record<Phase, string> = {
    focus: '🎯 Focus',
    short_break: '☕ Short Break',
    long_break: '🌿 Long Break',
  };

  const phaseColor: Record<Phase, string> = {
    focus: 'text-primary',
    short_break: 'text-success',
    long_break: 'text-accent',
  };

  const progressColor: Record<Phase, string> = {
    focus: 'stroke-primary',
    short_break: 'stroke-success',
    long_break: 'stroke-accent',
  };

  const completePhase = useCallback(() => {
    setRunning(false);
    // Log session
    const session: PomodoroSession = {
      id: crypto.randomUUID(),
      type: phase,
      durationMinutes: phase === 'focus' ? settings.focusMinutes : phase === 'short_break' ? settings.shortBreakMinutes : settings.longBreakMinutes,
      completedAt: Date.now(),
      date: new Date().toISOString().slice(0, 10),
    };
    addSession(session);
    setTodaySessions(getTodaySessions());

    // Determine next phase
    if (phase === 'focus') {
      const newCount = sessionCount + 1;
      setSessionCount(newCount);
      if (newCount % settings.sessionsBeforeLong === 0) {
        setPhase('long_break');
        setSecondsLeft(settings.longBreakMinutes * 60);
        if (settings.autoStartBreaks) setRunning(true);
      } else {
        setPhase('short_break');
        setSecondsLeft(settings.shortBreakMinutes * 60);
        if (settings.autoStartBreaks) setRunning(true);
      }
    } else {
      setPhase('focus');
      setSecondsLeft(settings.focusMinutes * 60);
      if (settings.autoStartFocus) setRunning(true);
    }

    // Sound notification
    try {
      const ctx = new AudioContext();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.frequency.value = phase === 'focus' ? 600 : 800;
      gain.gain.value = 0.3;
      osc.start();
      osc.stop(ctx.currentTime + 0.3);
    } catch {}
  }, [phase, sessionCount, settings]);

  useEffect(() => {
    if (!running) {
      if (intervalRef.current) clearInterval(intervalRef.current);
      return;
    }
    intervalRef.current = setInterval(() => {
      setSecondsLeft((s) => {
        if (s <= 1) {
          completePhase();
          return 0;
        }
        return s - 1;
      });
    }, 1000);
    return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
  }, [running, completePhase]);

  const resetTimer = () => {
    setRunning(false);
    setPhase('focus');
    setSessionCount(0);
    setSecondsLeft(settings.focusMinutes * 60);
  };

  const skipPhase = () => {
    completePhase();
  };

  const handleSaveSettings = (newSettings: PomodoroSettings) => {
    saveSettings(newSettings);
    setSettings(newSettings);
    setShowSettings(false);
    if (!running) {
      if (phase === 'focus') setSecondsLeft(newSettings.focusMinutes * 60);
      else if (phase === 'short_break') setSecondsLeft(newSettings.shortBreakMinutes * 60);
      else setSecondsLeft(newSettings.longBreakMinutes * 60);
    }
  };

  const mins = Math.floor(secondsLeft / 60);
  const secs = secondsLeft % 60;
  const pad = (n: number) => n.toString().padStart(2, '0');
  const progress = 1 - secondsLeft / totalSeconds;

  // Stats
  const todayFocus = todaySessions.filter(s => s.type === 'focus');
  const todayMinutes = todayFocus.reduce((a, s) => a + s.durationMinutes, 0);

  // SVG circle
  const size = 220;
  const strokeWidth = 8;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;

  return (
    <div className="p-6 max-w-2xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold font-mono text-foreground">🍅 Pomodoro</h1>
          <p className="text-xs text-muted-foreground mt-1">Stay focused, take breaks</p>
        </div>
        <button
          onClick={() => setShowSettings(!showSettings)}
          className="px-3 py-2 border border-border rounded-lg text-sm text-foreground hover:bg-muted transition-colors"
        >
          ⚙️ Settings
        </button>
      </div>

      {/* Settings panel */}
      {showSettings && (
        <SettingsPanel settings={settings} onSave={handleSaveSettings} onClose={() => setShowSettings(false)} />
      )}

      {/* Timer */}
      <div className="flex flex-col items-center gap-4">
        {/* Phase tabs */}
        <div className="flex gap-1 bg-muted rounded-lg p-1">
          {(['focus', 'short_break', 'long_break'] as Phase[]).map((p) => (
            <button
              key={p}
              onClick={() => {
                if (!running) {
                  setPhase(p);
                  setSecondsLeft(
                    p === 'focus' ? settings.focusMinutes * 60 :
                    p === 'short_break' ? settings.shortBreakMinutes * 60 :
                    settings.longBreakMinutes * 60
                  );
                }
              }}
              className={`px-3 py-1.5 rounded-md text-xs font-bold transition-colors ${
                phase === p ? 'bg-card text-foreground shadow-sm' : 'text-muted-foreground'
              }`}
            >
              {phaseLabel[p]}
            </button>
          ))}
        </div>

        {/* Circular timer */}
        <div className="relative">
          <svg width={size} height={size} className="-rotate-90">
            <circle
              cx={size / 2}
              cy={size / 2}
              r={radius}
              fill="none"
              stroke="hsl(var(--border))"
              strokeWidth={strokeWidth}
            />
            <circle
              cx={size / 2}
              cy={size / 2}
              r={radius}
              fill="none"
              className={progressColor[phase]}
              strokeWidth={strokeWidth}
              strokeLinecap="round"
              strokeDasharray={circumference}
              strokeDashoffset={circumference * (1 - progress)}
              style={{ transition: 'stroke-dashoffset 0.5s ease' }}
            />
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <div className={`text-5xl font-mono font-black ${phaseColor[phase]}`}>
              {pad(mins)}:{pad(secs)}
            </div>
            <div className="text-xs text-muted-foreground mt-1 font-mono">
              Session {sessionCount + 1}
            </div>
          </div>
        </div>

        {/* Controls */}
        <div className="flex gap-3">
          <button
            onClick={() => setRunning(!running)}
            className="px-6 py-3 bg-primary text-primary-foreground rounded-xl font-bold text-sm hover:opacity-90 transition-opacity"
          >
            {running ? '⏸ Pause' : '▶ Start'}
          </button>
          <button
            onClick={skipPhase}
            className="px-4 py-3 border border-border rounded-xl text-sm text-foreground hover:bg-muted transition-colors"
          >
            ⏭ Skip
          </button>
          <button
            onClick={resetTimer}
            className="px-4 py-3 border border-border rounded-xl text-sm text-foreground hover:bg-muted transition-colors"
          >
            ↺ Reset
          </button>
        </div>
      </div>

      {/* Today's stats */}
      <div className="bg-card border border-border rounded-xl p-4 space-y-3">
        <h2 className="font-bold font-mono text-foreground text-sm">📊 Today</h2>
        <div className="flex gap-6 text-center">
          <div>
            <div className="text-2xl font-mono font-black text-primary">{todayFocus.length}</div>
            <div className="text-xs text-muted-foreground">Sessions</div>
          </div>
          <div>
            <div className="text-2xl font-mono font-black text-foreground">{todayMinutes}</div>
            <div className="text-xs text-muted-foreground">Minutes</div>
          </div>
          <div>
            <div className="text-2xl font-mono font-black text-accent">
              {Math.round(todayMinutes / 60 * 10) / 10}
            </div>
            <div className="text-xs text-muted-foreground">Hours</div>
          </div>
        </div>
      </div>

      {/* Recent sessions */}
      <RecentSessions />
    </div>
  );
};

function SettingsPanel({ settings, onSave, onClose }: {
  settings: PomodoroSettings;
  onSave: (s: PomodoroSettings) => void;
  onClose: () => void;
}) {
  const [s, setS] = useState(settings);

  return (
    <div className="bg-card border border-border rounded-xl p-4 space-y-4">
      <h3 className="font-bold font-mono text-foreground text-sm">⚙️ Timer Settings</h3>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="text-xs text-muted-foreground">Focus (min)</label>
          <input type="number" min={1} max={120} value={s.focusMinutes}
            onChange={(e) => setS({ ...s, focusMinutes: +e.target.value })}
            className="w-full h-9 px-3 border border-border rounded-lg bg-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary"
          />
        </div>
        <div>
          <label className="text-xs text-muted-foreground">Short Break (min)</label>
          <input type="number" min={1} max={30} value={s.shortBreakMinutes}
            onChange={(e) => setS({ ...s, shortBreakMinutes: +e.target.value })}
            className="w-full h-9 px-3 border border-border rounded-lg bg-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary"
          />
        </div>
        <div>
          <label className="text-xs text-muted-foreground">Long Break (min)</label>
          <input type="number" min={1} max={60} value={s.longBreakMinutes}
            onChange={(e) => setS({ ...s, longBreakMinutes: +e.target.value })}
            className="w-full h-9 px-3 border border-border rounded-lg bg-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary"
          />
        </div>
        <div>
          <label className="text-xs text-muted-foreground">Sessions before long</label>
          <input type="number" min={2} max={10} value={s.sessionsBeforeLong}
            onChange={(e) => setS({ ...s, sessionsBeforeLong: +e.target.value })}
            className="w-full h-9 px-3 border border-border rounded-lg bg-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary"
          />
        </div>
      </div>

      <div className="space-y-2">
        <label className="flex items-center gap-2 text-sm text-foreground cursor-pointer">
          <input type="checkbox" checked={s.autoStartBreaks}
            onChange={(e) => setS({ ...s, autoStartBreaks: e.target.checked })}
            className="rounded border-border"
          />
          Auto-start breaks
        </label>
        <label className="flex items-center gap-2 text-sm text-foreground cursor-pointer">
          <input type="checkbox" checked={s.autoStartFocus}
            onChange={(e) => setS({ ...s, autoStartFocus: e.target.checked })}
            className="rounded border-border"
          />
          Auto-start focus after break
        </label>
      </div>

      <div className="flex gap-2">
        <button onClick={() => onSave(s)}
          className="px-4 py-2 bg-primary text-primary-foreground rounded-lg font-bold text-sm">
          Save
        </button>
        <button onClick={() => { onSave(DEFAULT_SETTINGS); }}
          className="px-4 py-2 border border-border rounded-lg text-xs text-muted-foreground hover:bg-muted">
          Reset to Default
        </button>
        <button onClick={onClose}
          className="px-4 py-2 border border-border rounded-lg text-sm text-foreground hover:bg-muted">
          Cancel
        </button>
      </div>
    </div>
  );
}

function RecentSessions() {
  const sessions = getSessions().slice(-20).reverse();
  if (sessions.length === 0) return null;

  const typeLabel: Record<string, string> = {
    focus: '🎯 Focus',
    short_break: '☕ Short',
    long_break: '🌿 Long',
  };

  return (
    <div className="bg-card border border-border rounded-xl p-4 space-y-3">
      <h2 className="font-bold font-mono text-foreground text-sm">🕐 Recent Sessions</h2>
      <div className="space-y-1 max-h-48 overflow-y-auto">
        {sessions.map((s) => (
          <div key={s.id} className="flex items-center justify-between py-1.5 px-2 rounded text-xs hover:bg-muted/50">
            <span className="text-foreground font-medium">{typeLabel[s.type]}</span>
            <span className="text-muted-foreground font-mono">{s.durationMinutes}m</span>
            <span className="text-muted-foreground font-mono">
              {new Date(s.completedAt).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

export default PomodoroPage;
