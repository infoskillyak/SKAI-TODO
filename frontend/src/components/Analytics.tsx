import { BarChart3, Clock, Target, TrendingUp, Flame } from 'lucide-react';

const quadrantData = [
  { id: 'Q1', label: 'Do First', color: 'var(--color-skai-q1)', tasks: 12, hours: 8.5 },
  { id: 'Q2', label: 'Schedule', color: 'var(--color-skai-q2)', tasks: 18, hours: 14.2 },
  { id: 'Q3', label: 'Delegate', color: 'var(--color-skai-q3)', tasks: 7, hours: 3.1 },
  { id: 'Q4', label: 'Eliminate', color: 'var(--color-skai-q4)', tasks: 4, hours: 1.8 },
];

const stats = [
  { label: 'Focus Hours', value: '23.5h', icon: Clock, color: 'text-[var(--color-skai-accent)]' },
  { label: 'Tasks Completed', value: '41', icon: Target, color: 'text-green-400' },
  { label: 'Productivity Score', value: '87%', icon: TrendingUp, color: 'text-blue-400' },
  { label: 'Current Streak', value: '12 days', icon: Flame, color: 'text-orange-400' },
];

export function Analytics() {
  const maxHours = Math.max(...quadrantData.map(q => q.hours));

  return (
    <div className="flex-1 p-6 overflow-y-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold bg-gradient-to-r from-[var(--color-skai-accent)] to-blue-400 bg-clip-text text-transparent">
          Productivity Analytics
        </h1>
        <p className="text-sm text-slate-500 mt-1">Your performance over the past 7 days</p>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-4 gap-4 mb-8">
        {stats.map((s) => {
          const Icon = s.icon;
          return (
            <div key={s.label} className="bg-[var(--color-skai-card)] border border-slate-700/50 rounded-xl p-5">
              <div className="flex items-center gap-2 mb-3">
                <Icon size={16} className={s.color} />
                <span className="text-xs text-slate-500 font-medium">{s.label}</span>
              </div>
              <p className="text-2xl font-bold text-white">{s.value}</p>
            </div>
          );
        })}
      </div>

      {/* Time per quadrant chart */}
      <div className="bg-[var(--color-skai-card)] border border-slate-700/50 rounded-xl p-6 mb-6">
        <h2 className="text-base font-semibold text-white mb-6 flex items-center gap-2">
          <BarChart3 size={16} className="text-[var(--color-skai-accent)]" />
          Time per Quadrant
        </h2>
        <div className="space-y-4">
          {quadrantData.map((q) => (
            <div key={q.id} className="flex items-center gap-4">
              <div className="w-24 text-sm text-slate-400 flex-shrink-0">
                <span className="font-medium" style={{ color: q.color }}>{q.id}</span>
                <span className="text-slate-600 ml-1 text-xs">{q.label}</span>
              </div>
              <div className="flex-1 h-8 bg-slate-800 rounded-lg overflow-hidden relative">
                <div
                  className="h-full rounded-lg transition-all duration-700"
                  style={{ width: `${(q.hours / maxHours) * 100}%`, backgroundColor: q.color, opacity: 0.8 }}
                />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-slate-300 font-medium">
                  {q.hours}h · {q.tasks} tasks
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Weekly focus chart placeholder */}
      <div className="grid grid-cols-2 gap-4">
        <div className="bg-[var(--color-skai-card)] border border-slate-700/50 rounded-xl p-6">
          <h3 className="text-sm font-semibold text-white mb-4">Daily Focus Hours</h3>
          <div className="flex items-end gap-2 h-32">
            {[3.2, 4.1, 2.5, 5.0, 3.8, 4.5, 0.4].map((h, i) => (
              <div key={i} className="flex-1 flex flex-col items-center gap-1">
                <div
                  className="w-full rounded-t-md bg-gradient-to-t from-[var(--color-skai-accent)] to-blue-400 transition-all"
                  style={{ height: `${(h / 5) * 100}%`, opacity: i === 6 ? 0.3 : 0.7 }}
                />
                <span className="text-[10px] text-slate-500">
                  {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'][i]}
                </span>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-[var(--color-skai-card)] border border-slate-700/50 rounded-xl p-6">
          <h3 className="text-sm font-semibold text-white mb-4">Task Completion Rate</h3>
          <div className="flex items-center justify-center h-32">
            <div className="relative w-28 h-28">
              <svg className="w-full h-full -rotate-90" viewBox="0 0 120 120">
                <circle cx="60" cy="60" r="50" fill="none" stroke="rgba(100,116,139,0.2)" strokeWidth="8" />
                <circle cx="60" cy="60" r="50" fill="none" stroke="var(--color-skai-accent)" strokeWidth="8"
                  strokeDasharray={2 * Math.PI * 50}
                  strokeDashoffset={2 * Math.PI * 50 * (1 - 0.87)}
                  strokeLinecap="round"
                />
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className="text-xl font-bold text-white">87%</span>
                <span className="text-[10px] text-slate-500">Completion</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
