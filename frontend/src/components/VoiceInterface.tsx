import { useState, useEffect, useRef } from 'react';
import { Mic, MicOff, Check, Loader2, X } from 'lucide-react';
import { motion } from 'framer-motion';

type VoiceState = 'idle' | 'listening' | 'processing' | 'done';

interface VoiceInterfaceProps {
  onClose: () => void;
  onTaskCreated: (task: { title: string; quadrant: string }) => void;
}

export function VoiceInterface({ onClose, onTaskCreated }: VoiceInterfaceProps) {
  const [state, setState] = useState<VoiceState>('idle');
  const [transcript, setTranscript] = useState('');
  const [seconds, setSeconds] = useState(0);
  const timerRef = useRef<number | null>(null);

  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, []);

  const startListening = () => {
    setState('listening');
    setTranscript('');
    setSeconds(0);
    timerRef.current = window.setInterval(() => {
      setSeconds((s) => s + 1);
    }, 1000);

    // Simulate transcription after 3 seconds
    setTimeout(() => {
      setTranscript('Remind Sarah to review the quarterly budget report by Friday 3 PM, should take about an hour, high priority');
    }, 2000);
  };

  const stopListening = () => {
    if (timerRef.current) clearInterval(timerRef.current);
    setState('processing');

    // Simulate AI processing
    setTimeout(() => {
      setState('done');
    }, 2000);
  };

  const confirmTask = () => {
    onTaskCreated({
      title: 'Review quarterly budget report',
      quadrant: 'Q1',
    });
    onClose();
  };

  const formatTime = (s: number) => `${Math.floor(s / 60)}:${(s % 60).toString().padStart(2, '0')}`;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-md" onClick={onClose}>
      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.9, opacity: 0 }}
        className="bg-[var(--color-skai-card)] border border-slate-700/50 rounded-3xl w-full max-w-lg p-8 shadow-2xl text-center"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close */}
        <button onClick={onClose} className="absolute top-4 right-4 text-slate-500 hover:text-white transition-colors">
          <X size={20} />
        </button>

        {/* Title */}
        <h2 className="text-xl font-bold text-white mb-2">SKAI Voice</h2>
        <p className="text-sm text-slate-400 mb-8">
          {state === 'idle' && 'Tap the microphone to start dictating'}
          {state === 'listening' && 'Listening... speak naturally'}
          {state === 'processing' && 'Processing your voice...'}
          {state === 'done' && 'Task parsed successfully!'}
        </p>

        {/* Mic button area */}
        <div className="flex justify-center mb-8">
          {state === 'idle' && (
            <button
              onClick={startListening}
              className="w-24 h-24 rounded-full bg-gradient-to-r from-blue-600 to-cyan-500 flex items-center justify-center shadow-[0_0_40px_rgba(6,182,212,0.4)] hover:shadow-[0_0_60px_rgba(6,182,212,0.6)] transition-all transform hover:scale-105"
            >
              <Mic size={36} className="text-white" />
            </button>
          )}

          {state === 'listening' && (
            <div className="relative">
              {/* Pulse rings */}
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="w-32 h-32 rounded-full border-2 border-cyan-400/30 animate-ping" />
              </div>
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="w-28 h-28 rounded-full border border-cyan-400/20 animate-pulse" />
              </div>
              <button
                onClick={stopListening}
                className="relative w-24 h-24 rounded-full bg-gradient-to-r from-red-600 to-red-500 flex items-center justify-center shadow-[0_0_40px_rgba(239,68,68,0.4)] transition-all"
              >
                <MicOff size={36} className="text-white" />
              </button>
              <div className="absolute -bottom-8 left-1/2 -translate-x-1/2 text-sm text-[var(--color-skai-accent)] font-mono">
                {formatTime(seconds)}
              </div>
            </div>
          )}

          {state === 'processing' && (
            <div className="w-24 h-24 rounded-full bg-slate-700 flex items-center justify-center">
              <Loader2 size={36} className="text-[var(--color-skai-accent)] animate-spin" />
            </div>
          )}

          {state === 'done' && (
            <div className="w-24 h-24 rounded-full bg-green-600/20 border-2 border-green-500 flex items-center justify-center">
              <Check size={36} className="text-green-400" />
            </div>
          )}
        </div>

        {/* Transcript */}
        {transcript && (
          <div className="bg-slate-800/60 rounded-xl p-4 mb-6 text-left border border-slate-700/30">
            <p className="text-xs text-slate-500 mb-1 font-medium">Transcript</p>
            <p className="text-sm text-slate-300 leading-relaxed">{transcript}</p>
          </div>
        )}

        {/* Parsed result */}
        {state === 'done' && (
          <div className="bg-slate-800/60 rounded-xl p-4 mb-6 text-left border border-[var(--color-skai-accent)]/20">
            <p className="text-xs text-[var(--color-skai-accent)] mb-2 font-medium">AI Parsed Task</p>
            <div className="space-y-1.5 text-sm">
              <div className="flex justify-between"><span className="text-slate-500">Title:</span><span className="text-slate-200 font-medium">Review quarterly budget report</span></div>
              <div className="flex justify-between"><span className="text-slate-500">Assignee:</span><span className="text-slate-200">Sarah</span></div>
              <div className="flex justify-between"><span className="text-slate-500">Due:</span><span className="text-slate-200">Friday 3:00 PM</span></div>
              <div className="flex justify-between"><span className="text-slate-500">Duration:</span><span className="text-slate-200">1 hour</span></div>
              <div className="flex justify-between"><span className="text-slate-500">Quadrant:</span><span className="text-[var(--color-skai-q1)] font-bold">Q1 — Do First</span></div>
            </div>
          </div>
        )}

        {/* Action buttons */}
        {state === 'done' && (
          <div className="flex gap-3">
            <button onClick={() => { setState('idle'); setTranscript(''); }} className="flex-1 py-3 rounded-xl border border-slate-600 text-slate-300 hover:bg-slate-800 transition-colors text-sm font-medium">
              Re-record
            </button>
            <button onClick={confirmTask} className="flex-1 py-3 rounded-xl bg-gradient-to-r from-blue-600 to-cyan-500 text-white font-semibold text-sm shadow-lg shadow-cyan-500/20 hover:shadow-cyan-500/30 transition-all">
              Add Task
            </button>
          </div>
        )}
      </motion.div>
    </div>
  );
}
