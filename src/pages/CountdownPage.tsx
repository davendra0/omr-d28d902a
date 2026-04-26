import { useState, useEffect, useMemo } from 'react';
import { Settings as SettingsIcon, Maximize2, Minimize2, Pencil, Trash2, Plus, X, Clock, Calendar as CalendarIcon } from 'lucide-react';
import {
  getCountdowns, saveCountdown, deleteCountdown, updateCountdown,
  getCountdownPrefs, saveCountdownPrefs,
  type Countdown, type CountdownTheme, type ViewMode, type CountdownPrefs,
} from '@/lib/countdownStore';

const THEMES: { value: CountdownTheme; label: string; preview: string }[] = [
  { value: 'minimal', label: 'Minimal', preview: 'bg-card border border-border' },
  { value: 'bold', label: 'Bold', preview: 'bg-primary/10 border-2 border-primary/30' },
  { value: 'gradient', label: 'Gradient', preview: 'bg-gradient-to-br from-primary/20 via-accent/10 to-destructive/10 border border-border' },
  { value: 'outline', label: 'Outline', preview: 'bg-transparent border-2 border-dashed border-primary/40' },
  { value: 'aurora', label: '🌌 Aurora', preview: 'bg-gradient-to-br from-indigo-500/30 via-purple-500/20 to-emerald-400/20 border border-indigo-400/30' },
  { value: 'cyber', label: '⚡ Cyber', preview: 'bg-[#0a0a1a] border border-cyan-400/40' },
  { value: 'crimson', label: '🔥 Crimson', preview: 'bg-gradient-to-br from-red-900/40 via-orange-700/20 to-amber-500/20 border border-red-400/30' },
  { value: 'midnight', label: '🌙 Midnight', preview: 'bg-gradient-to-br from-slate-900 via-blue-950 to-indigo-950 border border-slate-700' },
];

const VIEW_MODES: { value: ViewMode; label: string; short: string }[] = [
  { value: 'breakdown', label: 'Breakdown (D / H / M)', short: 'D H M' },
  { value: 'totalDays', label: 'Total Days', short: 'Days' },
  { value: 'totalHours', label: 'Total Hours', short: 'Hours' },
  { value: 'totalMinutes', label: 'Total Minutes', short: 'Min' },
];

interface DiffParts {
  totalMs: number;
  days: number; hours: number; minutes: number; seconds: number;
  totalDays: number; totalHours: number; totalMinutes: number;
  passed: boolean;
}

function getDiff(targetDate: string, now: number): DiffParts {
  const target = new Date(targetDate).getTime();
  const totalMs = target - now;
  if (totalMs <= 0) {
    return { totalMs: 0, days: 0, hours: 0, minutes: 0, seconds: 0, totalDays: 0, totalHours: 0, totalMinutes: 0, passed: true };
  }
  const totalSeconds = Math.floor(totalMs / 1000);
  const totalMinutes = Math.floor(totalSeconds / 60);
  const totalHours = Math.floor(totalMinutes / 60);
  const totalDays = Math.floor(totalHours / 24);
  return {
    totalMs,
    days: totalDays,
    hours: totalHours % 24,
    minutes: totalMinutes % 60,
    seconds: totalSeconds % 60,
    totalDays, totalHours, totalMinutes,
    passed: false,
  };
}

const themeWrapperClass: Record<CountdownTheme, string> = {
  minimal: 'bg-card border border-border',
  bold: 'bg-primary/10 border-2 border-primary/30',
  gradient: 'bg-gradient-to-br from-primary/20 via-accent/10 to-destructive/10 border border-border',
  outline: 'bg-transparent border-2 border-dashed border-primary/40',
  aurora: 'bg-gradient-to-br from-indigo-600/25 via-purple-600/15 to-emerald-500/20 border border-indigo-400/30',
  cyber: 'bg-[#0a0a1a] border border-cyan-400/40 shadow-[0_0_20px_rgba(34,211,238,0.15)]',
  crimson: 'bg-gradient-to-br from-red-900/30 via-orange-800/20 to-amber-600/15 border border-red-400/30',
  midnight: 'bg-gradient-to-br from-slate-900 via-blue-950 to-indigo-950 border border-slate-700',
};

const themeNumberClass: Record<CountdownTheme, string> = {
  minimal: 'text-foreground',
  bold: 'text-primary',
  gradient: 'text-primary',
  outline: 'text-primary',
  aurora: 'text-white drop-shadow-[0_0_12px_rgba(167,139,250,0.6)]',
  cyber: 'text-cyan-300 drop-shadow-[0_0_8px_rgba(34,211,238,0.7)]',
  crimson: 'text-amber-200 drop-shadow-[0_0_10px_rgba(251,191,36,0.5)]',
  midnight: 'text-slate-100 drop-shadow-[0_0_12px_rgba(148,163,184,0.5)]',
};

const themeTitleClass: Record<CountdownTheme, string> = {
  minimal: 'text-foreground',
  bold: 'text-foreground',
  gradient: 'text-foreground',
  outline: 'text-foreground',
  aurora: 'text-white/90',
  cyber: 'text-cyan-100',
  crimson: 'text-amber-100',
  midnight: 'text-slate-200',
};

const themeMutedClass: Record<CountdownTheme, string> = {
  minimal: 'text-muted-foreground',
  bold: 'text-muted-foreground',
  gradient: 'text-muted-foreground',
  outline: 'text-muted-foreground',
  aurora: 'text-white/60',
  cyber: 'text-cyan-300/70',
  crimson: 'text-amber-200/70',
  midnight: 'text-slate-400',
};

function ThemeBackdrop({ theme, fullscreen = false }: { theme: CountdownTheme; fullscreen?: boolean }) {
  if (theme === 'aurora') {
    return (
      <div className="absolute inset-0 overflow-hidden pointer-events-none rounded-[inherit]">
        <div className="absolute -top-1/2 -left-1/4 w-[150%] h-[150%] bg-[radial-gradient(circle_at_30%_30%,rgba(139,92,246,0.4),transparent_50%)] animate-pulse" />
        <div className="absolute -bottom-1/2 -right-1/4 w-[150%] h-[150%] bg-[radial-gradient(circle_at_70%_70%,rgba(52,211,153,0.3),transparent_50%)] animate-pulse" style={{ animationDuration: '8s' }} />
      </div>
    );
  }
  if (theme === 'cyber') {
    return (
      <div className="absolute inset-0 overflow-hidden pointer-events-none rounded-[inherit]">
        <div className="absolute inset-0 bg-[linear-gradient(rgba(34,211,238,0.05)_1px,transparent_1px),linear-gradient(90deg,rgba(34,211,238,0.05)_1px,transparent_1px)] bg-[size:24px_24px]" />
      </div>
    );
  }
  if (theme === 'crimson') {
    return (
      <div className="absolute inset-0 overflow-hidden pointer-events-none rounded-[inherit]">
        <div className="absolute -top-1/4 left-1/4 w-[120%] h-[120%] bg-[radial-gradient(circle_at_50%_50%,rgba(251,146,60,0.2),transparent_60%)] animate-pulse" style={{ animationDuration: '5s' }} />
      </div>
    );
  }
  if (theme === 'midnight') {
    return (
      <div className="absolute inset-0 overflow-hidden pointer-events-none rounded-[inherit]">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,rgba(99,102,241,0.15),transparent_70%)]" />
        {fullscreen && Array.from({ length: 30 }).map((_, i) => (
          <div key={i} className="absolute w-0.5 h-0.5 bg-white rounded-full animate-pulse"
            style={{ top: `${(i * 37) % 100}%`, left: `${(i * 53) % 100}%`, animationDelay: `${(i * 0.2) % 3}s`, opacity: 0.6 }} />
        ))}
      </div>
    );
  }
  return null;
}

const CountdownPage = () => {
  const [countdowns, setCountdowns] = useState<Countdown[]>([]);
  const [prefs, setPrefs] = useState<CountdownPrefs>(getCountdownPrefs());
  const [showAdd, setShowAdd] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [showSettings, setShowSettings] = useState(false);
  const [fullscreenId, setFullscreenId] = useState<string | null>(null);

  const [title, setTitle] = useState('');
  const [date, setDate] = useState('');
  const [time, setTime] = useState('');
  const [style, setStyle] = useState<CountdownTheme>(prefs.defaultTheme);

  const [viewModes, setViewModes] = useState<Record<string, ViewMode>>({});

  const [now, setNow] = useState(Date.now());

  useEffect(() => {
    setCountdowns(getCountdowns());
  }, []);

  useEffect(() => {
    const interval = prefs.showSeconds || fullscreenId ? 1000 : 30000;
    const id = setInterval(() => setNow(Date.now()), interval);
    return () => clearInterval(id);
  }, [prefs.showSeconds, fullscreenId]);

  const refresh = () => setCountdowns(getCountdowns());

  const buildTargetISO = () => {
    if (!date) return '';
    return time ? `${date}T${time}` : date;
  };

  const handleAdd = () => {
    const target = buildTargetISO();
    if (!title.trim() || !target) return;
    saveCountdown({
      id: crypto.randomUUID(),
      title: title.trim(),
      targetDate: target,
      style,
      createdAt: Date.now(),
    });
    refresh();
    resetForm();
    setShowAdd(false);
  };

  const handleEdit = (cd: Countdown) => {
    setEditingId(cd.id);
    setShowAdd(false);
    setTitle(cd.title);
    const [d, t] = cd.targetDate.split('T');
    setDate(d || '');
    setTime(t ? t.slice(0, 5) : '');
    setStyle(cd.style);
  };

  const handleSaveEdit = () => {
    const target = buildTargetISO();
    if (!editingId || !title.trim() || !target) return;
    updateCountdown(editingId, { title: title.trim(), targetDate: target, style });
    refresh();
    resetForm();
    setEditingId(null);
  };

  const resetForm = () => {
    setTitle('');
    setDate('');
    setTime('');
    setStyle(prefs.defaultTheme);
  };

  const handleDelete = (id: string) => {
    if (!confirm('Delete this countdown?')) return;
    deleteCountdown(id);
    refresh();
    if (fullscreenId === id) setFullscreenId(null);
  };

  const updatePrefs = (updates: Partial<CountdownPrefs>) => {
    saveCountdownPrefs(updates);
    setPrefs(getCountdownPrefs());
  };

  const sorted = useMemo(() => {
    return [...countdowns].sort((a, b) => {
      const aT = new Date(a.targetDate).getTime();
      const bT = new Date(b.targetDate).getTime();
      const aPassed = aT < now;
      const bPassed = bT < now;
      if (aPassed !== bPassed) return aPassed ? 1 : -1;
      return aT - bT;
    });
  }, [countdowns, now]);

  const activeCountdowns = sorted.filter(cd => new Date(cd.targetDate).getTime() > now);
  const shouldAutoFullscreen = prefs.autoFullScreenSingle && activeCountdowns.length === 1 && !showAdd && !editingId && !showSettings && !fullscreenId;
  const effectiveFullscreenId = fullscreenId ?? (shouldAutoFullscreen ? activeCountdowns[0].id : null);
  const fullscreenCd = effectiveFullscreenId ? countdowns.find(c => c.id === effectiveFullscreenId) : null;

  const getViewMode = (id: string): ViewMode => viewModes[id] || prefs.defaultView;
  const setViewMode = (id: string, mode: ViewMode) => setViewModes(prev => ({ ...prev, [id]: mode }));

  const renderCountdownValue = (cd: Countdown, diff: DiffParts, large = false) => {
    const view = getViewMode(cd.id);
    const numCls = themeNumberClass[cd.style];
    const muteCls = themeMutedClass[cd.style];

    if (diff.passed) {
      return <div className={`font-mono font-bold ${large ? 'text-4xl' : 'text-lg'} ${muteCls}`}>Event passed ✓</div>;
    }

    const sizes = large
      ? { big: 'text-7xl md:text-9xl', med: 'text-4xl md:text-6xl', label: 'text-base md:text-xl', smallLabel: 'text-xs md:text-sm' }
      : { big: 'text-4xl', med: 'text-xl', label: 'text-sm', smallLabel: 'text-xs' };

    if (view === 'totalDays') {
      return (
        <div className="flex items-baseline gap-2">
          <span className={`font-mono font-black ${sizes.big} ${numCls}`}>{diff.totalDays.toLocaleString()}</span>
          <span className={`font-mono ${sizes.label} ${muteCls}`}>days</span>
        </div>
      );
    }
    if (view === 'totalHours') {
      return (
        <div className="flex items-baseline gap-2">
          <span className={`font-mono font-black ${sizes.big} ${numCls}`}>{diff.totalHours.toLocaleString()}</span>
          <span className={`font-mono ${sizes.label} ${muteCls}`}>hours</span>
        </div>
      );
    }
    if (view === 'totalMinutes') {
      return (
        <div className="flex items-baseline gap-2">
          <span className={`font-mono font-black ${sizes.big} ${numCls}`}>{diff.totalMinutes.toLocaleString()}</span>
          <span className={`font-mono ${sizes.label} ${muteCls}`}>min</span>
        </div>
      );
    }
    return (
      <div className="flex items-baseline flex-wrap gap-x-1 gap-y-1">
        <span className={`font-mono font-black ${sizes.big} ${numCls}`}>{diff.days}</span>
        <span className={`${sizes.smallLabel} ${muteCls} font-mono`}>d</span>
        <span className={`font-mono font-bold ${sizes.med} ${numCls} ml-2`}>{String(diff.hours).padStart(2, '0')}</span>
        <span className={`${sizes.smallLabel} ${muteCls} font-mono`}>h</span>
        <span className={`font-mono font-bold ${sizes.med} ${numCls} ml-2`}>{String(diff.minutes).padStart(2, '0')}</span>
        <span className={`${sizes.smallLabel} ${muteCls} font-mono`}>m</span>
        {prefs.showSeconds && (
          <>
            <span className={`font-mono font-bold ${sizes.med} ${numCls} ml-2`}>{String(diff.seconds).padStart(2, '0')}</span>
            <span className={`${sizes.smallLabel} ${muteCls} font-mono`}>s</span>
          </>
        )}
      </div>
    );
  };

  const formatTargetDateTime = (targetDate: string) => {
    const dt = new Date(targetDate);
    const hasTime = targetDate.includes('T');
    const dateStr = dt.toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric', weekday: 'short' });
    if (!hasTime) return dateStr;
    const timeStr = dt.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true });
    return `${dateStr} • ${timeStr}`;
  };

  if (fullscreenCd) {
    const diff = getDiff(fullscreenCd.targetDate, now);
    const view = getViewMode(fullscreenCd.id);
    return (
      <div className={`fixed inset-0 z-50 overflow-hidden ${themeWrapperClass[fullscreenCd.style]}`}>
        <ThemeBackdrop theme={fullscreenCd.style} fullscreen />
        <div className="relative h-full w-full flex flex-col">
          <div className="flex items-center justify-between p-4 md:p-6">
            <div className={`text-xs md:text-sm font-mono uppercase tracking-[0.3em] ${themeMutedClass[fullscreenCd.style]}`}>
              ⚔ War Room
            </div>
            <div className="flex items-center gap-2">
              <button onClick={() => setShowSettings(true)} className={`p-2 rounded-lg hover:bg-white/10 ${themeMutedClass[fullscreenCd.style]}`} title="Settings">
                <SettingsIcon className="w-4 h-4 md:w-5 md:h-5" />
              </button>
              <button onClick={() => { setFullscreenId(null); updatePrefs({ autoFullScreenSingle: false }); }}
                className={`p-2 rounded-lg hover:bg-white/10 ${themeMutedClass[fullscreenCd.style]}`} title="Exit fullscreen">
                <Minimize2 className="w-4 h-4 md:w-5 md:h-5" />
              </button>
            </div>
          </div>

          <div className="flex-1 flex flex-col items-center justify-center px-4 text-center">
            <div className={`text-2xl md:text-5xl font-bold mb-6 md:mb-10 ${themeTitleClass[fullscreenCd.style]}`}>
              {fullscreenCd.title}
            </div>
            <div className="mb-6 md:mb-10">
              {renderCountdownValue(fullscreenCd, diff, true)}
            </div>
            <div className={`text-sm md:text-lg font-mono ${themeMutedClass[fullscreenCd.style]}`}>
              {formatTargetDateTime(fullscreenCd.targetDate)}
            </div>
          </div>

          <div className="p-4 md:p-6 flex flex-wrap items-center justify-center gap-2">
            {VIEW_MODES.map(v => (
              <button key={v.value} onClick={() => setViewMode(fullscreenCd.id, v.value)}
                className={`px-3 md:px-4 py-1.5 md:py-2 rounded-full text-xs md:text-sm font-mono font-bold transition-all backdrop-blur-sm
                  ${view === v.value ? 'bg-white/20 text-white' : 'bg-white/5 hover:bg-white/10 ' + themeMutedClass[fullscreenCd.style]}`}>
                {v.short}
              </button>
            ))}
            <button onClick={() => updatePrefs({ showSeconds: !prefs.showSeconds })}
              className={`px-3 md:px-4 py-1.5 md:py-2 rounded-full text-xs md:text-sm font-mono font-bold transition-all backdrop-blur-sm
                ${prefs.showSeconds ? 'bg-white/20 text-white' : 'bg-white/5 hover:bg-white/10 ' + themeMutedClass[fullscreenCd.style]}`}>
              {prefs.showSeconds ? '👁 sec' : '👁‍🗨 sec'}
            </button>
          </div>
        </div>

        {showSettings && <SettingsModal prefs={prefs} updatePrefs={updatePrefs} onClose={() => setShowSettings(false)} />}
      </div>
    );
  }

  return (
    <div className="p-6 max-w-3xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold font-mono text-foreground">⏳ Countdowns</h1>
          <p className="text-xs text-muted-foreground mt-1">Track time until important events</p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => setShowSettings(true)}
            className="p-2 border border-border rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-colors" title="Settings">
            <SettingsIcon className="w-4 h-4" />
          </button>
          <button onClick={() => { setShowAdd(!showAdd); setEditingId(null); resetForm(); }}
            className="px-4 py-2 bg-primary text-primary-foreground rounded-lg font-bold text-sm hover:opacity-90 transition-opacity flex items-center gap-1.5">
            <Plus className="w-4 h-4" /> Add
          </button>
        </div>
      </div>

      {(showAdd || editingId) && (
        <div className="bg-card border border-border rounded-xl p-4 space-y-3">
          <h3 className="text-sm font-bold font-mono text-foreground">{editingId ? '✏️ Edit Countdown' : '➕ New Countdown'}</h3>
          <input type="text" placeholder="Event name (e.g. NEET 2026)" value={title} onChange={(e) => setTitle(e.target.value)}
            className="w-full h-10 px-3 border border-border rounded-lg bg-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary" />
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="text-[10px] font-bold text-muted-foreground flex items-center gap-1 mb-1"><CalendarIcon className="w-3 h-3" /> DATE</label>
              <input type="date" value={date} onChange={(e) => setDate(e.target.value)}
                className="w-full h-10 px-3 border border-border rounded-lg bg-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary" />
            </div>
            <div>
              <label className="text-[10px] font-bold text-muted-foreground flex items-center gap-1 mb-1"><Clock className="w-3 h-3" /> TIME (optional)</label>
              <input type="time" value={time} onChange={(e) => setTime(e.target.value)}
                className="w-full h-10 px-3 border border-border rounded-lg bg-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary" />
            </div>
          </div>
          <div>
            <label className="text-[10px] font-bold text-muted-foreground mb-1 block">THEME</label>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {THEMES.map((s) => (
                <button key={s.value} onClick={() => setStyle(s.value)}
                  className={`relative h-12 rounded-lg overflow-hidden text-xs font-bold transition-all ${s.preview} ${style === s.value ? 'ring-2 ring-primary scale-[1.02]' : 'opacity-70 hover:opacity-100'}`}>
                  <ThemeBackdrop theme={s.value} />
                  <span className="relative z-10 text-foreground mix-blend-difference">{s.label}</span>
                </button>
              ))}
            </div>
          </div>
          <div className="flex gap-2">
            <button onClick={editingId ? handleSaveEdit : handleAdd} disabled={!title.trim() || !date}
              className="px-4 py-2 bg-primary text-primary-foreground rounded-lg font-bold text-sm hover:opacity-90 disabled:opacity-40">
              {editingId ? 'Save Changes' : 'Save'}
            </button>
            <button onClick={() => { setEditingId(null); setShowAdd(false); resetForm(); }}
              className="px-4 py-2 border border-border rounded-lg text-sm text-foreground hover:bg-muted">
              Cancel
            </button>
          </div>
        </div>
      )}

      {sorted.length === 0 && !showAdd && (
        <div className="text-center py-16 text-muted-foreground">
          <div className="text-4xl mb-3">⏳</div>
          <p className="text-sm">No countdowns yet. Add one to track important dates!</p>
        </div>
      )}

      <div className="grid gap-4 sm:grid-cols-2">
        {sorted.map((cd) => {
          const diff = getDiff(cd.targetDate, now);
          const view = getViewMode(cd.id);
          return (
            <div key={cd.id} className={`relative rounded-xl p-5 transition-all overflow-hidden ${themeWrapperClass[cd.style]} ${diff.passed ? 'opacity-50' : ''}`}>
              <ThemeBackdrop theme={cd.style} />
              <div className="relative z-10">
                <div className="flex items-start justify-between gap-2">
                  <div className={`font-bold text-sm ${themeTitleClass[cd.style]}`}>{cd.title}</div>
                  <div className="flex gap-0.5">
                    <button onClick={() => setFullscreenId(cd.id)} className={`p-1.5 rounded hover:bg-white/10 ${themeMutedClass[cd.style]}`} title="War room view">
                      <Maximize2 className="w-3.5 h-3.5" />
                    </button>
                    <button onClick={() => handleEdit(cd)} className={`p-1.5 rounded hover:bg-white/10 ${themeMutedClass[cd.style]}`} title="Edit">
                      <Pencil className="w-3.5 h-3.5" />
                    </button>
                    <button onClick={() => handleDelete(cd.id)} className={`p-1.5 rounded hover:bg-white/10 ${themeMutedClass[cd.style]} hover:text-destructive`} title="Delete">
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                <div className="mt-3">
                  {renderCountdownValue(cd, diff)}
                </div>

                {!diff.passed && (
                  <div className="flex flex-wrap gap-1 mt-3">
                    {VIEW_MODES.map(v => (
                      <button key={v.value} onClick={() => setViewMode(cd.id, v.value)}
                        className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold transition-all
                          ${view === v.value ? 'bg-white/20 text-white' : 'bg-white/5 hover:bg-white/10 ' + themeMutedClass[cd.style]}`}>
                        {v.short}
                      </button>
                    ))}
                  </div>
                )}

                <div className={`text-xs mt-2 font-mono ${themeMutedClass[cd.style]}`}>
                  {formatTargetDateTime(cd.targetDate)}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {showSettings && <SettingsModal prefs={prefs} updatePrefs={updatePrefs} onClose={() => setShowSettings(false)} />}
    </div>
  );
};

function SettingsModal({ prefs, updatePrefs, onClose }: { prefs: CountdownPrefs; updatePrefs: (u: Partial<CountdownPrefs>) => void; onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-[60] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-card border border-border rounded-xl p-5 w-full max-w-md space-y-4 max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between">
          <h3 className="text-base font-bold font-mono text-foreground flex items-center gap-2"><SettingsIcon className="w-4 h-4" /> Countdown Settings</h3>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground"><X className="w-5 h-5" /></button>
        </div>

        <label className="flex items-center justify-between gap-2 cursor-pointer">
          <div>
            <div className="text-sm font-bold text-foreground">Show seconds</div>
            <div className="text-xs text-muted-foreground">Display the seconds digit in breakdown view</div>
          </div>
          <button onClick={() => updatePrefs({ showSeconds: !prefs.showSeconds })}
            className={`w-11 h-6 rounded-full transition-colors relative shrink-0 ${prefs.showSeconds ? 'bg-primary' : 'bg-muted'}`}>
            <span className={`absolute top-0.5 w-5 h-5 rounded-full bg-background transition-transform ${prefs.showSeconds ? 'translate-x-5' : 'translate-x-0.5'}`} />
          </button>
        </label>

        <label className="flex items-center justify-between gap-2 cursor-pointer">
          <div>
            <div className="text-sm font-bold text-foreground">Auto War-Room mode</div>
            <div className="text-xs text-muted-foreground">When only 1 active countdown, show it fullscreen</div>
          </div>
          <button onClick={() => updatePrefs({ autoFullScreenSingle: !prefs.autoFullScreenSingle })}
            className={`w-11 h-6 rounded-full transition-colors relative shrink-0 ${prefs.autoFullScreenSingle ? 'bg-primary' : 'bg-muted'}`}>
            <span className={`absolute top-0.5 w-5 h-5 rounded-full bg-background transition-transform ${prefs.autoFullScreenSingle ? 'translate-x-5' : 'translate-x-0.5'}`} />
          </button>
        </label>

        <div>
          <div className="text-sm font-bold text-foreground mb-2">Default view mode</div>
          <div className="grid grid-cols-2 gap-2">
            {VIEW_MODES.map(v => (
              <button key={v.value} onClick={() => updatePrefs({ defaultView: v.value })}
                className={`px-3 py-2 rounded-lg text-xs font-bold font-mono transition-all
                  ${prefs.defaultView === v.value ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground hover:text-foreground'}`}>
                {v.label}
              </button>
            ))}
          </div>
        </div>

        <div>
          <div className="text-sm font-bold text-foreground mb-2">Default theme for new countdowns</div>
          <div className="grid grid-cols-2 gap-2">
            {THEMES.map(t => (
              <button key={t.value} onClick={() => updatePrefs({ defaultTheme: t.value })}
                className={`relative h-10 rounded-lg overflow-hidden text-xs font-bold transition-all ${t.preview} ${prefs.defaultTheme === t.value ? 'ring-2 ring-primary' : 'opacity-70'}`}>
                <ThemeBackdrop theme={t.value} />
                <span className="relative z-10 text-foreground mix-blend-difference">{t.label}</span>
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

export default CountdownPage;