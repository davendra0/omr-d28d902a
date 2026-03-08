import { useState, useEffect, useCallback, useRef } from 'react';

interface TimerProps {
  totalSeconds: number;
  onTimeUp: () => void;
}

const Timer = ({ totalSeconds, onTimeUp }: TimerProps) => {
  const [remaining, setRemaining] = useState(totalSeconds);
  const [paused, setPaused] = useState(false);
  const [totalPausedTime, setTotalPausedTime] = useState(0);
  const pauseStartRef = useRef<number | null>(null);

  useEffect(() => {
    if (paused) {
      pauseStartRef.current = Date.now();
      return;
    }
    if (pauseStartRef.current) {
      setTotalPausedTime((prev) => prev + Math.round((Date.now() - pauseStartRef.current!) / 1000));
      pauseStartRef.current = null;
    }
    if (remaining <= 0) {
      onTimeUp();
      return;
    }
    const id = setInterval(() => setRemaining((r) => r - 1), 1000);
    return () => clearInterval(id);
  }, [remaining, onTimeUp, paused]);

  const hours = Math.floor(remaining / 3600);
  const mins = Math.floor((remaining % 3600) / 60);
  const secs = remaining % 60;
  const pad = (n: number) => n.toString().padStart(2, '0');

  const pct = remaining / totalSeconds;
  const colorClass = pct > 0.25 ? 'text-success' : pct > 0.1 ? 'text-review' : 'text-destructive';

  const formatPaused = (s: number) => {
    if (s < 60) return `${s}s`;
    return `${Math.floor(s / 60)}m ${s % 60}s`;
  };

  // Current pause duration (live)
  const [livePause, setLivePause] = useState(0);
  useEffect(() => {
    if (!paused) { setLivePause(0); return; }
    const id = setInterval(() => {
      if (pauseStartRef.current) setLivePause(Math.round((Date.now() - pauseStartRef.current) / 1000));
    }, 1000);
    return () => clearInterval(id);
  }, [paused]);

  const displayPausedTotal = totalPausedTime + livePause;

  return (
    <div className="flex items-center gap-2">
      <span className={`font-mono text-xl font-bold ${colorClass} transition-colors`}>
        ⏱ {pad(hours)}:{pad(mins)}:{pad(secs)}
      </span>
      <button
        type="button"
        onClick={() => setPaused((p) => !p)}
        className="px-2 py-1 border border-border rounded text-xs font-bold text-foreground hover:bg-muted transition-colors"
        title={paused ? 'Resume timer' : 'Pause timer'}
      >
        {paused ? '▶ Resume' : '⏸ Pause'}
      </button>
      {displayPausedTotal > 0 && (
        <span className="font-mono text-xs text-muted-foreground">
          ⏸ {formatPaused(displayPausedTotal)}
        </span>
      )}
    </div>
  );
};

export default Timer;
