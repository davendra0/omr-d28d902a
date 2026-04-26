import { useState, useEffect, useMemo } from 'react';
import { Settings as SettingsIcon, Maximize2, Minimize2, Pencil, Trash2, Plus, X } from 'lucide-react';
import {
  getCountdowns, saveCountdown, deleteCountdown, updateCountdown,
  getCountdownPrefs, saveCountdownPrefs,
  type Countdown, type ViewMode, type CountdownPrefs,
} from '@/lib/countdownStore';

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

// Single unified dark theme — black background with subtle white grid + glow
const DarkBackdrop = ({ intense = false }: { intense?: boolean }) => (
  <div className="absolute inset-0 overflow-hidden pointer-events-none rounded-[inherit]">
    {/* subtle grid lines */}
    <div className="absolute inset-0 opacity-[0.07] bg-[linear-gradient(rgba(255,255,255,0.6)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.6)_1px,transparent_1px)] bg-[size:32px_32px]" />
    {/* radial vignette glow */}
    <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgba(255,255,255,0.06),transparent_70%)]" />
    {/* corner light streak */}
    {intense && (
      <>
        <div className="absolute -top-32 -left-32 w-96 h-96 bg-[radial-gradient(circle,rgba(255,255,255,0.08),transparent_60%)] blur-2xl" />
        <div className="absolute -bottom-32 -right-32 w-96 h-96 bg-[radial-gradient(circle,rgba(255,255,255,0.05),transparent_60%)] blur-2xl" />
        {/* horizontal scan line */}
        <div className="absolute left-0 right-0 top-1/2 h-px bg-gradient-to-r from-transparent via-white/30 to-transparent" />
      </>
    )}
  </div>
);

const DARK_WRAP = 'bg-[#0a0a0a] border border-white/10';
const DARK_NUM = 'text-white drop-shadow-[0_0_10px_rgba(255,255,255,0.3)]';
const DARK_TITLE = 'text-white/95';
const DARK_MUTED = 'text-white/50';

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
      style: 'midnight',
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
  };

  const handleSaveEdit = () => {
    const target = buildTargetISO();
    if (!editingId || !title.trim() || !target) return;
    updateCountdown(editingId, { title: title.trim(), targetDate: target });
    refresh();
    resetForm();
    setEditingId(null);
  };

  const resetForm = () => {
    setTitle('');
    setDate('');
    setTime('');
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

    if (diff.passed) {
      return <div className={`font-mono font-bold ${large ? 'text-4xl' : 'text-lg'} ${DARK_MUTED}`}>Event passed ✓</div>;
    }

    const sizes = large
      ? { big: 'text-7xl md:text-[10rem]', med: 'text-4xl md:text-7xl', label: 'text-base md:text-xl', smallLabel: 'text-xs md:text-sm' }
      : { big: 'text-4xl', med: 'text-xl', label: 'text-sm', smallLabel: 'text-xs' };

    if (view === 'totalDays') {
      return (
        <div className="flex items-baseline gap-3">
          <span className={`font-mono font-black tracking-tight ${sizes.big} ${DARK_NUM}`}>{diff.totalDays.toLocaleString()}</span>
          <span className={`font-mono uppercase tracking-widest ${sizes.label} ${DARK_MUTED}`}>days</span>
        </div>
      );
    }
    if (view === 'totalHours') {
      return (
        <div className="flex items-baseline gap-3">
          <span className={`font-mono font-black tracking-tight ${sizes.big} ${DARK_NUM}`}>{diff.totalHours.toLocaleString()}</span>
          <span className={`font-mono uppercase tracking-widest ${sizes.label} ${DARK_MUTED}`}>hours</span>
        </div>
      );
    }
    if (view === 'totalMinutes') {
      return (
        <div className="flex items-baseline gap-3">
          <span className={`font-mono font-black tracking-tight ${sizes.big} ${DARK_NUM}`}>{diff.totalMinutes.toLocaleString()}</span>
          <span className={`font-mono uppercase tracking-widest ${sizes.label} ${DARK_MUTED}`}>min</span>
        </div>
      );
    }
    // Breakdown
    if (large) {
      return (
        <div className="flex flex-wrap items-end justify-center gap-x-6 md:gap-x-10 gap-y-4">
          {[
            { v: diff.days, l: 'days' },
            { v: String(diff.hours).padStart(2, '0'), l: 'hours' },
            { v: String(diff.minutes).padStart(2, '0'), l: 'min' },
            ...(prefs.showSeconds ? [{ v: String(diff.seconds).padStart(2, '0'), l: 'sec' }] : []),
          ].map((u, i) => (
            <div key={i} className="flex flex-col items-center">
              <span className={`font-mono font-black tracking-tight leading-none ${sizes.big} ${DARK_NUM}`}>{u.v}</span>
              <span className={`mt-3 font-mono uppercase tracking-[0.3em] ${sizes.smallLabel} ${DARK_MUTED}`}>{u.l}</span>
            </div>
          ))}
        </div>
      );
    }
    return (
      <div className="flex items-baseline flex-wrap gap-x-1 gap-y-1">
        <span className={`font-mono font-black ${sizes.big} ${DARK_NUM}`}>{diff.days}</span>
        <span className={`${sizes.smallLabel} ${DARK_MUTED} font-mono`}>d</span>
        <span className={`font-mono font-bold ${sizes.med} ${DARK_NUM} ml-2`}>{String(diff.hours).padStart(2, '0')}</span>
        <span className={`${sizes.smallLabel} ${DARK_MUTED} font-mono`}>h</span>
        <span className={`font-mono font-bold ${sizes.med} ${DARK_NUM} ml-2`}>{String(diff.minutes).padStart(2, '0')}</span>
        <span className={`${sizes.smallLabel} ${DARK_MUTED} font-mono`}>m</span>
        {prefs.showSeconds && (
          <>
            <span className={`font-mono font-bold ${sizes.med} ${DARK_NUM} ml-2`}>{String(diff.seconds).padStart(2, '0')}</span>
            <span className={`${sizes.smallLabel} ${DARK_MUTED} font-mono`}>s</span>
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

  // ───── War Room (fullscreen) ─────
  if (fullscreenCd) {
    const diff = getDiff(fullscreenCd.targetDate, now);
    const view = getViewMode(fullscreenCd.id);
    return (
      <div className="fixed inset-0 z-50 overflow-hidden bg-black">
        <DarkBackdrop intense />
        <div className="relative h-full w-full flex flex-col">
          {/* Top bar */}
          <div className="flex items-center justify-between p-4 md:p-6">
            <div className="flex items-center gap-3">
              <span className="w-2 h-2 rounded-full bg-white/80 animate-pulse" />
              <div className="text-xs md:text-sm font-mono uppercase tracking-[0.4em] text-white/60">
                War Room
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button onClick={() => setShowSettings(true)} className="p-2 rounded-lg text-white/60 hover:text-white hover:bg-white/10 transition-colors" title="Settings">
                <SettingsIcon className="w-4 h-4 md:w-5 md:h-5" />
              </button>
              <button onClick={() => { setFullscreenId(null); updatePrefs({ autoFullScreenSingle: false }); }}
                className="p-2 rounded-lg text-white/60 hover:text-white hover:bg-white/10 transition-colors" title="Exit fullscreen">
                <Minimize2 className="w-4 h-4 md:w-5 md:h-5" />
              </button>
            </div>
          </div>

          {/* Center */}
          <div className="flex-1 flex flex-col items-center justify-center px-4 text-center">
            <div className="mb-2 text-[10px] md:text-xs font-mono uppercase tracking-[0.5em] text-white/40">Mission</div>
            <div className="text-2xl md:text-5xl font-bold mb-10 md:mb-16 text-white tracking-tight">
              {fullscreenCd.title}
            </div>
            <div className="mb-10 md:mb-14 w-full">
              {renderCountdownValue(fullscreenCd, diff, true)}
            </div>
            <div className="flex items-center gap-3">
              <span className="h-px w-12 bg-white/20" />
              <div className="text-sm md:text-lg font-mono text-white/50 tracking-wide">
                {formatTargetDateTime(fullscreenCd.targetDate)}
              </div>
              <span className="h-px w-12 bg-white/20" />
            </div>
          </div>

          {/* Bottom controls */}
          <div className="p-4 md:p-6 flex flex-wrap items-center justify-center gap-2">
            {VIEW_MODES.map(v => (
              <button key={v.value} onClick={() => setViewMode(fullscreenCd.id, v.value)}
                className={`px-3 md:px-4 py-1.5 md:py-2 rounded-full text-xs md:text-sm font-mono font-bold transition-all border
                  ${view === v.value ? 'bg-white text-black border-white' : 'bg-transparent text-white/60 border-white/15 hover:border-white/40 hover:text-white'}`}>
                {v.short}
              </button>
            ))}
            <button onClick={() => updatePrefs({ showSeconds: !prefs.showSeconds })}
              className={`px-3 md:px-4 py-1.5 md:py-2 rounded-full text-xs md:text-sm font-mono font-bold transition-all border
                ${prefs.showSeconds ? 'bg-white text-black border-white' : 'bg-transparent text-white/60 border-white/15 hover:border-white/40 hover:text-white'}`}>
              {prefs.showSeconds ? 'sec on' : 'sec off'}
            </button>
          </div>
        </div>

        {showSettings && <SettingsModal prefs={prefs} updatePrefs={updatePrefs} onClose={() => setShowSettings(false)} />}
      </div>
    );
  }

  // ───── Main list ─────
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
              <label className="text-xs text-muted-foreground font-mono">Date</label>
              <input type="date" value={date} onChange={(e) => setDate(e.target.value)}
                className="w-full h-10 px-3 mt-1 border border-border rounded-lg bg-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary" />
            </div>
            <div>
              <label className="text-xs text-muted-foreground font-mono">Time (optional)</label>
              <input type="time" value={time} onChange={(e) => setTime(e.target.value)}
                className="w-full h-10 px-3 mt-1 border border-border rounded-lg bg-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary" />
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
            <div key={cd.id} className={`relative rounded-xl p-5 transition-all overflow-hidden ${DARK_WRAP} ${diff.passed ? 'opacity-50' : ''}`}>
              <DarkBackdrop />
              <div className="relative z-10">
                <div className="flex items-start justify-between gap-2">
                  <div className={`font-bold text-sm ${DARK_TITLE}`}>{cd.title}</div>
                  <div className="flex gap-0.5">
                    <button onClick={() => setFullscreenId(cd.id)} className={`p-1.5 rounded hover:bg-white/10 ${DARK_MUTED}`} title="War room view">
                      <Maximize2 className="w-3.5 h-3.5" />
                    </button>
                    <button onClick={() => handleEdit(cd)} className={`p-1.5 rounded hover:bg-white/10 ${DARK_MUTED}`} title="Edit">
                      <Pencil className="w-3.5 h-3.5" />
                    </button>
                    <button onClick={() => handleDelete(cd.id)} className={`p-1.5 rounded hover:bg-white/10 ${DARK_MUTED} hover:text-red-400`} title="Delete">
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
                        className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold transition-all border
                          ${view === v.value ? 'bg-white text-black border-white' : 'bg-transparent border-white/10 ' + DARK_MUTED + ' hover:border-white/30 hover:text-white'}`}>
                        {v.short}
                      </button>
                    ))}
                  </div>
                )}

                <div className={`text-xs mt-2 font-mono ${DARK_MUTED}`}>
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
      </div>
    </div>
  );
}

export default CountdownPage;
