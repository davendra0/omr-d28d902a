import { useState, useEffect, useRef, useCallback } from 'react';
import {
  getSettings, saveSettings, addSession, deleteSession, updateSession, getTodaySessions, getSessions,
  type PomodoroSettings, type PomodoroSession, DEFAULT_SETTINGS, SUBJECTS,
} from '@/lib/pomodoroStore';
import { usePomodoroTimer } from '@/store/pomodoroTimerStore';

type Phase = 'focus' | 'short_break' | 'long_break';

const PomodoroPage = () => {
  const [settings, setSettings] = useState<PomodoroSettings>(getSettings);
  const [showSettings, setShowSettings] = useState(false);
  const timer = usePomodoroTimer();
  const phase = timer.phase as Phase;
  const secondsLeft = timer.secondsLeft;
  const running = timer.running;
  const sessionCount = timer.sessionCount;
  const [todaySessions, setTodaySessions] = useState<PomodoroSession[]>(getTodaySessions);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const [minimal, setMinimal] = useState(false);
  const [hideTime, setHideTime] = useState(false);
  const sessionLabel = timer.label;
  const sessionSubject = timer.subject;
  const sessionChapter = timer.chapter;
  const setSessionLabel = timer.setLabel;
  const setSessionSubject = timer.setSubject;
  const setSessionChapter = timer.setChapter;
  const [dailyGoal, setDailyGoal] = useState(() => {
    try { return parseInt(localStorage.getItem('pomo_daily_goal') || '120'); } catch { return 120; }
  });

  const totalSeconds = phase === 'focus'
    ? settings.focusMinutes * 60
    : phase === 'short_break'
      ? settings.shortBreakMinutes * 60
      : settings.longBreakMinutes * 60;

  const phaseLabel: Record<Phase, string> = {
    focus: 'Focus',
    short_break: 'Break',
    long_break: 'Long Break',
  };

  const phaseColor: Record<Phase, string> = {
    focus: 'text-primary',
    short_break: 'text-[hsl(var(--success))]',
    long_break: 'text-accent',
  };

  const progressColor: Record<Phase, string> = {
    focus: 'stroke-primary',
    short_break: 'stroke-[hsl(var(--success))]',
    long_break: 'stroke-accent',
  };

  const completePhase = useCallback(() => {
    timer.setRunning(false);
    const session: PomodoroSession = {
      id: crypto.randomUUID(),
      type: phase,
      durationMinutes: phase === 'focus' ? settings.focusMinutes : phase === 'short_break' ? settings.shortBreakMinutes : settings.longBreakMinutes,
      completedAt: Date.now(),
      date: new Date().toISOString().slice(0, 10),
      label: sessionLabel || undefined,
      subject: sessionSubject || undefined,
      chapter: sessionChapter || undefined,
    };
    addSession(session);
    setTodaySessions(getTodaySessions());

    if (phase === 'focus') {
      const newCount = sessionCount + 1;
      timer.setSessionCount(newCount);
      if (newCount % settings.sessionsBeforeLong === 0) {
        timer.setPhase('long_break', settings.longBreakMinutes * 60);
        if (settings.autoStartBreaks) timer.setRunning(true);
      } else {
        timer.setPhase('short_break', settings.shortBreakMinutes * 60);
        if (settings.autoStartBreaks) timer.setRunning(true);
      }
    } else {
      timer.setPhase('focus', settings.focusMinutes * 60);
      if (settings.autoStartFocus) timer.setRunning(true);
    }

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
  }, [phase, sessionCount, settings, sessionLabel, sessionSubject, sessionChapter, timer]);

  useEffect(() => {
    if (!running) {
      if (intervalRef.current) clearInterval(intervalRef.current);
      return;
    }
    intervalRef.current = setInterval(() => {
      timer.setSecondsLeft(usePomodoroTimer.getState().secondsLeft - 1);
      if (usePomodoroTimer.getState().secondsLeft <= 1) {
        completePhase();
      }
    }, 1000);
    return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
  }, [running, completePhase, timer]);

  const resetTimer = () => {
    timer.setRunning(false);
    timer.setPhase('focus', settings.focusMinutes * 60);
    timer.setSessionCount(0);
  };

  const skipPhase = () => completePhase();

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

  const todayFocus = todaySessions.filter(s => s.type === 'focus');
  const todayMinutes = todayFocus.reduce((a, s) => a + s.durationMinutes, 0);
  const goalPct = Math.min(100, Math.round((todayMinutes / dailyGoal) * 100));

  const size = minimal ? 280 : 220;
  const strokeWidth = minimal ? 10 : 8;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;

  // Zen mode
  if (minimal) {
    return (
      <div className="fixed inset-0 z-50 bg-background flex flex-col items-center justify-center gap-6">
        <button onClick={() => setMinimal(false)}
          className="absolute top-4 right-4 px-3 py-1.5 text-xs border border-border rounded-lg text-muted-foreground hover:bg-muted transition-colors">
          ✕ Exit Zen
        </button>
        <div className={`text-sm font-mono ${phaseColor[phase]}`}>{phaseLabel[phase]}</div>
        {sessionLabel && <div className="text-xs text-muted-foreground font-mono">📎 {sessionLabel}</div>}
        <div className="relative">
          <svg width={size} height={size} className="-rotate-90">
            <circle cx={size/2} cy={size/2} r={radius} fill="none" stroke="hsl(var(--border))" strokeWidth={strokeWidth} />
            <circle cx={size/2} cy={size/2} r={radius} fill="none" className={progressColor[phase]}
              strokeWidth={strokeWidth} strokeLinecap="round"
              strokeDasharray={circumference} strokeDashoffset={circumference * (1 - progress)}
              style={{ transition: 'stroke-dashoffset 0.5s ease' }} />
          </svg>
          {!hideTime && (
            <div className="absolute inset-0 flex items-center justify-center">
              <div className={`text-6xl font-mono font-black ${phaseColor[phase]}`}>{pad(mins)}:{pad(secs)}</div>
            </div>
          )}
        </div>
        <div className="flex gap-3">
          <button onClick={() => setRunning(!running)} className="px-8 py-3 bg-primary text-primary-foreground rounded-xl font-bold text-sm hover:opacity-90">
            {running ? '⏸ Pause' : '▶ Start'}
          </button>
          <button onClick={skipPhase} className="px-4 py-3 border border-border rounded-xl text-sm text-foreground hover:bg-muted">⏭ Skip</button>
        </div>
        <button onClick={() => setHideTime(!hideTime)} className="text-xs text-muted-foreground hover:text-foreground">
          {hideTime ? '👁 Show Time' : '🙈 Hide Time'}
        </button>
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-6 max-w-xl mx-auto space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold font-mono text-foreground">🍅 Pomodoro</h1>
        <div className="flex gap-1.5">
          <button onClick={() => setMinimal(true)} className="px-2.5 py-1.5 border border-border rounded-lg text-xs text-foreground hover:bg-muted transition-colors" title="Zen mode">🧘</button>
          <button onClick={() => setShowSettings(!showSettings)} className="px-2.5 py-1.5 border border-border rounded-lg text-xs text-foreground hover:bg-muted transition-colors" title="Settings">⚙️</button>
        </div>
      </div>

      {showSettings && (
        <SettingsPanel settings={settings} onSave={handleSaveSettings} onClose={() => setShowSettings(false)}
          dailyGoal={dailyGoal} onDailyGoalChange={(g) => { setDailyGoal(g); localStorage.setItem('pomo_daily_goal', String(g)); }} />
      )}

      {/* Timer Card */}
      <div className="bg-card border border-border rounded-2xl p-6 flex flex-col items-center gap-4">
        {/* Phase selector */}
        <div className="flex gap-1 bg-muted rounded-lg p-0.5">
          {(['focus', 'short_break', 'long_break'] as Phase[]).map((p) => (
            <button key={p}
              onClick={() => { if (!running) { setPhase(p); setSecondsLeft(p === 'focus' ? settings.focusMinutes * 60 : p === 'short_break' ? settings.shortBreakMinutes * 60 : settings.longBreakMinutes * 60); } }}
              className={`px-3 py-1.5 rounded-md text-xs font-bold transition-colors ${phase === p ? 'bg-card text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'}`}>
              {phaseLabel[p]}
            </button>
          ))}
        </div>

        {/* Circle timer */}
        <div className="relative">
          <svg width={size} height={size} className="-rotate-90">
            <circle cx={size/2} cy={size/2} r={radius} fill="none" stroke="hsl(var(--border))" strokeWidth={strokeWidth} opacity={0.3} />
            <circle cx={size/2} cy={size/2} r={radius} fill="none" className={progressColor[phase]}
              strokeWidth={strokeWidth} strokeLinecap="round"
              strokeDasharray={circumference} strokeDashoffset={circumference * (1 - progress)}
              style={{ transition: 'stroke-dashoffset 0.5s ease' }} />
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            {!hideTime ? (
              <div className={`text-5xl font-mono font-black tracking-tighter ${phaseColor[phase]}`}>{pad(mins)}:{pad(secs)}</div>
            ) : (
              <div className="text-sm text-muted-foreground font-mono">⏳ in progress</div>
            )}
            <div className="text-[10px] text-muted-foreground mt-1 font-mono">#{sessionCount + 1}</div>
          </div>
        </div>

        {/* Controls */}
        <div className="flex gap-2">
          <button onClick={() => setRunning(!running)}
            className="px-6 py-2.5 bg-primary text-primary-foreground rounded-xl font-bold text-sm hover:opacity-90 transition-opacity">
            {running ? '⏸ Pause' : '▶ Start'}
          </button>
          <button onClick={skipPhase} className="px-3 py-2.5 border border-border rounded-xl text-xs text-foreground hover:bg-muted" title="Skip">⏭</button>
          <button onClick={resetTimer} className="px-3 py-2.5 border border-border rounded-xl text-xs text-foreground hover:bg-muted" title="Reset">↺</button>
          <button onClick={() => setHideTime(!hideTime)} className="px-3 py-2.5 border border-border rounded-xl text-[10px] text-muted-foreground hover:bg-muted" title={hideTime ? 'Show time' : 'Hide time'}>
            {hideTime ? '👁' : '🙈'}
          </button>
        </div>
      </div>

      {/* Quick tag */}
      <div className="bg-card border border-border rounded-xl p-4 space-y-2">
        <input type="text" placeholder="Label this session (optional)" value={sessionLabel} onChange={(e) => setSessionLabel(e.target.value)}
          className="w-full h-9 px-3 border border-border rounded-lg bg-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary" />
        <div className="flex gap-2">
          <select value={sessionSubject} onChange={(e) => setSessionSubject(e.target.value)}
            className="h-8 px-2 border border-border rounded-lg bg-background text-foreground text-xs focus:outline-none flex-1">
            <option value="">Subject</option>
            {SUBJECTS.map(s => <option key={s} value={s}>{s}</option>)}
          </select>
          <input type="text" placeholder="Chapter" value={sessionChapter} onChange={(e) => setSessionChapter(e.target.value)}
            className="h-8 px-2 border border-border rounded-lg bg-background text-foreground text-xs flex-1 focus:outline-none" />
        </div>
      </div>

      {/* Today's progress */}
      <div className="bg-card border border-border rounded-xl p-4">
        <div className="flex items-center justify-between mb-3">
          <span className="text-sm font-bold font-mono text-foreground">Today</span>
          <span className="text-xs text-muted-foreground font-mono">{todayMinutes}/{dailyGoal}m goal</span>
        </div>
        {/* Progress bar */}
        <div className="w-full h-2 bg-muted rounded-full overflow-hidden mb-3">
          <div className="h-full bg-primary rounded-full transition-all duration-500" style={{ width: `${goalPct}%` }} />
        </div>
        <div className="grid grid-cols-3 gap-3 text-center">
          <div>
            <div className="text-2xl font-mono font-black text-primary">{todayFocus.length}</div>
            <div className="text-[10px] text-muted-foreground">Sessions</div>
          </div>
          <div>
            <div className="text-2xl font-mono font-black text-foreground">{todayMinutes}</div>
            <div className="text-[10px] text-muted-foreground">Minutes</div>
          </div>
          <div>
            <div className="text-2xl font-mono font-black text-accent">{(todayMinutes / 60).toFixed(1)}</div>
            <div className="text-[10px] text-muted-foreground">Hours</div>
          </div>
        </div>
        {/* Subject breakdown */}
        {todayFocus.length > 0 && (
          <div className="pt-3 mt-3 border-t border-border space-y-1">
            {Object.entries(
              todayFocus.reduce<Record<string, number>>((acc, s) => {
                const key = s.subject || 'Unlabeled';
                acc[key] = (acc[key] || 0) + s.durationMinutes;
                return acc;
              }, {})
            ).map(([subj, m]) => (
              <div key={subj} className="flex justify-between text-xs">
                <span className="text-foreground">{subj}</span>
                <span className="font-mono text-muted-foreground">{m}m</span>
              </div>
            ))}
          </div>
        )}
      </div>

      <RecentSessions />
    </div>
  );
};

function SettingsPanel({ settings, onSave, onClose, dailyGoal, onDailyGoalChange }: {
  settings: PomodoroSettings;
  onSave: (s: PomodoroSettings) => void;
  onClose: () => void;
  dailyGoal: number;
  onDailyGoalChange: (g: number) => void;
}) {
  const [s, setS] = useState(settings);
  const [goal, setGoal] = useState(dailyGoal);

  return (
    <div className="bg-card border border-border rounded-xl p-4 space-y-4">
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="text-xs text-muted-foreground">Focus (min)</label>
          <input type="number" min={1} max={120} value={s.focusMinutes}
            onChange={(e) => setS({ ...s, focusMinutes: +e.target.value })}
            className="w-full h-9 px-3 border border-border rounded-lg bg-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary" />
        </div>
        <div>
          <label className="text-xs text-muted-foreground">Short Break (min)</label>
          <input type="number" min={1} max={30} value={s.shortBreakMinutes}
            onChange={(e) => setS({ ...s, shortBreakMinutes: +e.target.value })}
            className="w-full h-9 px-3 border border-border rounded-lg bg-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary" />
        </div>
        <div>
          <label className="text-xs text-muted-foreground">Long Break (min)</label>
          <input type="number" min={1} max={60} value={s.longBreakMinutes}
            onChange={(e) => setS({ ...s, longBreakMinutes: +e.target.value })}
            className="w-full h-9 px-3 border border-border rounded-lg bg-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary" />
        </div>
        <div>
          <label className="text-xs text-muted-foreground">Sessions before long</label>
          <input type="number" min={2} max={10} value={s.sessionsBeforeLong}
            onChange={(e) => setS({ ...s, sessionsBeforeLong: +e.target.value })}
            className="w-full h-9 px-3 border border-border rounded-lg bg-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary" />
        </div>
      </div>
      <div>
        <label className="text-xs text-muted-foreground">Daily Focus Goal (min)</label>
        <input type="number" min={10} max={600} value={goal}
          onChange={(e) => setGoal(+e.target.value)}
          className="w-full h-9 px-3 border border-border rounded-lg bg-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary" />
      </div>
      <div className="space-y-2">
        <label className="flex items-center gap-2 text-sm text-foreground cursor-pointer">
          <input type="checkbox" checked={s.autoStartBreaks} onChange={(e) => setS({ ...s, autoStartBreaks: e.target.checked })} className="rounded border-border" />
          Auto-start breaks
        </label>
        <label className="flex items-center gap-2 text-sm text-foreground cursor-pointer">
          <input type="checkbox" checked={s.autoStartFocus} onChange={(e) => setS({ ...s, autoStartFocus: e.target.checked })} className="rounded border-border" />
          Auto-start focus after break
        </label>
      </div>
      <div className="flex gap-2">
        <button onClick={() => { onSave(s); onDailyGoalChange(goal); }} className="px-4 py-2 bg-primary text-primary-foreground rounded-lg font-bold text-sm">Save</button>
        <button onClick={() => { onSave(DEFAULT_SETTINGS); onDailyGoalChange(120); }} className="px-3 py-2 border border-border rounded-lg text-xs text-muted-foreground hover:bg-muted">Reset</button>
        <button onClick={onClose} className="px-3 py-2 border border-border rounded-lg text-sm text-foreground hover:bg-muted">Cancel</button>
      </div>
    </div>
  );
}

function RecentSessions() {
  const [sessions, setSessions] = useState(() => getSessions().slice(-20).reverse());
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<Partial<PomodoroSession>>({});
  const [showAddForm, setShowAddForm] = useState(false);
  const [addForm, setAddForm] = useState<Partial<PomodoroSession>>({
    type: 'focus', durationMinutes: 25, label: '', subject: '', chapter: '',
  });

  const refreshSessions = () => setSessions(getSessions().slice(-20).reverse());

  const handleDelete = (id: string) => { if (confirm('Delete?')) { deleteSession(id); refreshSessions(); } };
  const handleEdit = (s: PomodoroSession) => { setEditingId(s.id); setEditForm({ ...s }); };
  const handleSaveEdit = () => { if (editingId && editForm) { updateSession(editingId, editForm); setEditingId(null); refreshSessions(); } };
  const handleAddSession = () => {
    addSession({
      id: crypto.randomUUID(),
      type: addForm.type as any,
      durationMinutes: addForm.durationMinutes || 25,
      completedAt: Date.now(),
      date: new Date().toISOString().slice(0, 10),
      label: addForm.label || undefined,
      subject: addForm.subject || undefined,
      chapter: addForm.chapter || undefined,
    });
    setShowAddForm(false);
    setAddForm({ type: 'focus', durationMinutes: 25, label: '', subject: '', chapter: '' });
    refreshSessions();
  };

  const typeIcon: Record<string, string> = { focus: '🎯', short_break: '☕', long_break: '🌿' };

  return (
    <div className="bg-card border border-border rounded-xl p-4 space-y-3">
      <div className="flex items-center justify-between">
        <h2 className="font-bold font-mono text-foreground text-sm">Recent Sessions</h2>
        <button onClick={() => setShowAddForm(!showAddForm)} className="px-2 py-1 text-xs bg-primary text-primary-foreground rounded-lg hover:opacity-90">+ Log</button>
      </div>

      {showAddForm && (
        <div className="p-3 bg-muted rounded-lg space-y-2 border border-border">
          <div className="grid grid-cols-2 gap-2">
            <select value={addForm.type} onChange={(e) => setAddForm({ ...addForm, type: e.target.value as any })}
              className="h-8 px-2 border border-border rounded-lg bg-background text-foreground text-xs">
              <option value="focus">🎯 Focus</option>
              <option value="short_break">☕ Short Break</option>
              <option value="long_break">🌿 Long Break</option>
            </select>
            <input type="number" placeholder="Minutes" value={addForm.durationMinutes} onChange={(e) => setAddForm({ ...addForm, durationMinutes: +e.target.value })}
              className="h-8 px-2 border border-border rounded-lg bg-background text-foreground text-xs" />
          </div>
          <input type="text" placeholder="Label" value={addForm.label} onChange={(e) => setAddForm({ ...addForm, label: e.target.value })}
            className="w-full h-8 px-2 border border-border rounded-lg bg-background text-foreground text-xs" />
          <div className="flex gap-2">
            <select value={addForm.subject} onChange={(e) => setAddForm({ ...addForm, subject: e.target.value })}
              className="h-8 px-2 border border-border rounded-lg bg-background text-foreground text-xs flex-1">
              <option value="">Subject</option>
              {SUBJECTS.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
            <input type="text" placeholder="Chapter" value={addForm.chapter} onChange={(e) => setAddForm({ ...addForm, chapter: e.target.value })}
              className="h-8 px-2 border border-border rounded-lg bg-background text-foreground text-xs flex-1" />
          </div>
          <div className="flex gap-2">
            <button onClick={handleAddSession} className="px-3 py-1.5 bg-primary text-primary-foreground rounded-lg text-xs font-bold">Save</button>
            <button onClick={() => setShowAddForm(false)} className="px-3 py-1.5 border border-border rounded-lg text-xs text-muted-foreground">Cancel</button>
          </div>
        </div>
      )}

      {sessions.length === 0 ? (
        <p className="text-xs text-muted-foreground text-center py-4">No sessions yet</p>
      ) : (
        <div className="space-y-0.5 max-h-60 overflow-y-auto">
          {sessions.map((s) => (
            <div key={s.id}>
              {editingId === s.id ? (
                <div className="p-2 bg-muted rounded-lg space-y-2 border border-border">
                  <div className="grid grid-cols-2 gap-2">
                    <select value={editForm.type} onChange={(e) => setEditForm({ ...editForm, type: e.target.value as any })}
                      className="h-7 px-2 border border-border rounded bg-background text-foreground text-xs">
                      <option value="focus">🎯 Focus</option>
                      <option value="short_break">☕ Short</option>
                      <option value="long_break">🌿 Long</option>
                    </select>
                    <input type="number" value={editForm.durationMinutes} onChange={(e) => setEditForm({ ...editForm, durationMinutes: +e.target.value })}
                      className="h-7 px-2 border border-border rounded bg-background text-foreground text-xs" />
                  </div>
                  <input type="text" placeholder="Label" value={editForm.label || ''} onChange={(e) => setEditForm({ ...editForm, label: e.target.value })}
                    className="w-full h-7 px-2 border border-border rounded bg-background text-foreground text-xs" />
                  <div className="flex gap-2">
                    <button onClick={handleSaveEdit} className="px-2 py-1 bg-primary text-primary-foreground rounded text-xs">Save</button>
                    <button onClick={() => setEditingId(null)} className="px-2 py-1 border border-border rounded text-xs text-muted-foreground">Cancel</button>
                  </div>
                </div>
              ) : (
                <div className="flex items-center justify-between py-1.5 px-2 rounded text-xs hover:bg-muted/50 gap-2 group">
                  <span className="shrink-0">{typeIcon[s.type]}</span>
                  <span className="text-foreground font-medium truncate flex-1">{s.label || s.subject || '—'}</span>
                  <span className="text-muted-foreground font-mono shrink-0">{s.durationMinutes}m</span>
                  <span className="text-muted-foreground font-mono shrink-0 text-[10px]">
                    {new Date(s.completedAt).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}
                  </span>
                  <div className="flex gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                    <button onClick={() => handleEdit(s)} className="px-1 py-0.5 text-[10px] border border-border rounded hover:bg-muted">✏️</button>
                    <button onClick={() => handleDelete(s.id)} className="px-1 py-0.5 text-[10px] border border-destructive/50 text-destructive rounded hover:bg-destructive/10">🗑</button>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default PomodoroPage;
