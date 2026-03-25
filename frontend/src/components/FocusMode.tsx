import { useState, useEffect, useRef } from 'react';
import { Play, Pause, RotateCcw, Coffee, Target } from 'lucide-react';

export function FocusMode() {
  const [isRunning, setIsRunning] = useState(false);
  const [timeLeft, setTimeLeft] = useState(25 * 60); // 25 min
  const [mode, setMode] = useState<'focus' | 'break'>('focus');
  const [sessions, setSessions] = useState(0);
  const timerRef = useRef<number | null>(null);

  useEffect(() => {
    if (isRunning && timeLeft > 0) {
      timerRef.current = window.setInterval(() => {
        setTimeLeft((t) => t - 1);
      }, 1000);
    } else if (timeLeft === 0) {
      setIsRunning(false);
      if (mode === 'focus') {
        setSessions((s) => s + 1);
        setMode('break');
        setTimeLeft(5 * 60);
      } else {
        setMode('focus');
        setTimeLeft(25 * 60);
      }
    }
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [isRunning, timeLeft, mode]);

  const formatTime = (s: number) => {
    const m = Math.floor(s / 60);
    const sec = s % 60;
    return `${m.toString().padStart(2, '0')}:${sec.toString().padStart(2, '0')}`;
  };

  const progress = mode === 'focus' ? (1 - timeLeft / (25 * 60)) * 100 : (1 - timeLeft / (5 * 60)) * 100;
  const circumference = 2 * Math.PI * 120;

  const reset = () => {
    setIsRunning(false);
    setTimeLeft(mode === 'focus' ? 25 * 60 : 5 * 60);
  };

  return (
    <div className="flex-1 flex flex-col items-center justify-center p-8">
      <div className="text-center mb-8">
        <h1 className="text-2xl font-bold text-white flex items-center gap-3 justify-center">
          <Target size={24} className="text-[var(--color-skai-accent)]" />
          Focus Mode
        </h1>
        <p className="text-sm text-slate-500 mt-1">
          {mode === 'focus' ? 'Deep work — no distractions' : 'Take a short break'}
        </p>
      </div>

      {/* Timer circle */}
      <div className="relative w-64 h-64 mb-8">
        <svg className="w-full h-full -rotate-90" viewBox="0 0 260 260">
          <circle cx="130" cy="130" r="120" fill="none" stroke="rgba(100,116,139,0.2)" strokeWidth="6" />
          <circle
            cx="130" cy="130" r="120" fill="none"
            stroke={mode === 'focus' ? 'var(--color-skai-accent)' : '#22c55e'}
            strokeWidth="6"
            strokeDasharray={circumference}
            strokeDashoffset={circumference - (progress / 100) * circumference}
            strokeLinecap="round"
            className="transition-all duration-1000"
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-5xl font-mono font-bold text-white tracking-widest">
            {formatTime(timeLeft)}
          </span>
          <span className={`text-sm font-medium mt-2 ${mode === 'focus' ? 'text-[var(--color-skai-accent)]' : 'text-green-400'}`}>
            {mode === 'focus' ? 'FOCUS' : 'BREAK'}
          </span>
        </div>
      </div>

      {/* Controls */}
      <div className="flex items-center gap-4">
        <button onClick={reset} className="w-12 h-12 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center text-slate-400 hover:text-white hover:border-slate-500 transition-all">
          <RotateCcw size={18} />
        </button>
        <button
          onClick={() => setIsRunning(!isRunning)}
          className={`w-16 h-16 rounded-full flex items-center justify-center text-white shadow-lg transition-all ${
            mode === 'focus' 
              ? 'bg-gradient-to-r from-blue-600 to-cyan-500 shadow-cyan-500/30 hover:shadow-cyan-500/50'
              : 'bg-gradient-to-r from-green-600 to-emerald-500 shadow-green-500/30 hover:shadow-green-500/50'
          }`}
        >
          {isRunning ? <Pause size={24} /> : <Play size={24} className="ml-1" />}
        </button>
        <button
          onClick={() => { setMode(mode === 'focus' ? 'break' : 'focus'); setTimeLeft(mode === 'focus' ? 5 * 60 : 25 * 60); setIsRunning(false); }}
          className="w-12 h-12 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center text-slate-400 hover:text-white hover:border-slate-500 transition-all"
        >
          <Coffee size={18} />
        </button>
      </div>

      {/* Session counter */}
      <div className="mt-8 flex items-center gap-2">
        {[...Array(4)].map((_, i) => (
          <div key={i} className={`w-3 h-3 rounded-full transition-colors ${i < sessions % 4 ? 'bg-[var(--color-skai-accent)]' : 'bg-slate-700'}`} />
        ))}
        <span className="text-xs text-slate-500 ml-2">{sessions} sessions completed</span>
      </div>
    </div>
  );
}
