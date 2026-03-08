import { useState, useEffect } from 'react';

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
  const colorClass = pct > 0.25 ? 'text-success' : pct > 0.1 ? 'text-review' : 'text-destructive';

  return (
    <span className={`font-mono text-xl font-bold ${colorClass} transition-colors`}>
      ⏱ {pad(hours)}:{pad(mins)}:{pad(secs)}
    </span>
  );
};

export default Timer;
