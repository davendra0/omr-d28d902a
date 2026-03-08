import { useState, useEffect, useCallback } from 'react';
import { Clock } from 'lucide-react';

interface TimerProps {
  totalSeconds: number;
  onTimeUp: () => void;
}

const Timer = ({ totalSeconds, onTimeUp }: TimerProps) => {
  const [remaining, setRemaining] = useState(totalSeconds);

  useEffect(() => {
    if (remaining <= 0) {
      onTimeUp();
      return;
    }
    const id = setInterval(() => setRemaining((r) => r - 1), 1000);
    return () => clearInterval(id);
  }, [remaining, onTimeUp]);

  const hours = Math.floor(remaining / 3600);
  const mins = Math.floor((remaining % 3600) / 60);
  const secs = remaining % 60;
  const pad = (n: number) => n.toString().padStart(2, '0');

  const pct = remaining / totalSeconds;
  const colorClass = pct > 0.25 ? 'text-timer-safe' : pct > 0.1 ? 'text-timer-warn' : 'text-timer';

  return (
    <div className={`flex items-center gap-2 font-mono text-lg font-bold ${colorClass} transition-colors`}>
      <Clock className="w-5 h-5" />
      <span>{pad(hours)}:{pad(mins)}:{pad(secs)}</span>
    </div>
  );
};

export default Timer;
