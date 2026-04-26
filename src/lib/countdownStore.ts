export type CountdownTheme = 'minimal' | 'bold' | 'gradient' | 'outline' | 'aurora' | 'cyber' | 'crimson' | 'midnight';
export type ViewMode = 'breakdown' | 'totalDays' | 'totalHours' | 'totalMinutes';

export interface Countdown {
  id: string;
  title: string;
  targetDate: string; // ISO datetime string (YYYY-MM-DD or YYYY-MM-DDTHH:mm)
  style: CountdownTheme;
  createdAt: number;
}

export interface CountdownPrefs {
  showSeconds: boolean;
  defaultView: ViewMode;
  defaultTheme: CountdownTheme;
  autoFullScreenSingle: boolean;
}

const STORAGE_KEY = 'workspace_countdowns';
const PREFS_KEY = 'workspace_countdown_prefs';

const DEFAULT_PREFS: CountdownPrefs = {
  showSeconds: true,
  defaultView: 'breakdown',
  defaultTheme: 'aurora',
  autoFullScreenSingle: true,
};

export function getCountdowns(): Countdown[] {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
  } catch {
    return [];
  }
}

export function saveCountdown(cd: Countdown) {
  const all = getCountdowns();
  all.push(cd);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(all));
}

export function deleteCountdown(id: string) {
  const all = getCountdowns().filter(c => c.id !== id);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(all));
}

export function updateCountdown(id: string, updates: Partial<Countdown>) {
  const all = getCountdowns().map(c => c.id === id ? { ...c, ...updates } : c);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(all));
}

export function getCountdownPrefs(): CountdownPrefs {
  try {
    const stored = JSON.parse(localStorage.getItem(PREFS_KEY) || '{}');
    return { ...DEFAULT_PREFS, ...stored };
  } catch {
    return DEFAULT_PREFS;
  }
}

export function saveCountdownPrefs(prefs: Partial<CountdownPrefs>) {
  const current = getCountdownPrefs();
  localStorage.setItem(PREFS_KEY, JSON.stringify({ ...current, ...prefs }));
}