import { useState } from 'react';
import { Search, Bell, Plus } from 'lucide-react';

interface TopBarProps {
  onAddTask: () => void;
}

export function TopBar({ onAddTask }: TopBarProps) {
  const [searchQuery, setSearchQuery] = useState('');

  return (
    <div className="h-16 bg-[var(--color-skai-card)] border-b border-slate-700/50 flex items-center justify-between px-6">
      {/* Search Bar */}
      <div className="flex items-center gap-3 bg-slate-800/60 rounded-lg px-4 py-2 w-96 border border-slate-700/50 focus-within:border-[var(--color-skai-accent)]/50 transition-colors">
        <label htmlFor="topSearch" className="sr-only">Search</label>
        <Search size={16} className="text-slate-500" />
        <input
          id="topSearch"
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Search tasks, projects..."
          className="bg-transparent text-sm text-slate-300 placeholder-slate-500 outline-none flex-1"
        />
      </div>

      {/* Right side actions */}
      <div className="flex items-center gap-3">
        <button
          onClick={onAddTask}
          className="flex items-center gap-2 bg-gradient-to-r from-[var(--color-skai-accent)] to-blue-500 text-white px-4 py-2 rounded-lg text-sm font-medium hover:opacity-90 transition-opacity shadow-md"
        >
          <Plus size={16} />
          Add Task
        </button>

        <button className="relative text-slate-400 hover:text-white transition-colors p-2 rounded-lg hover:bg-slate-800/50">
          <Bell size={18} />
          <span className="absolute top-1 right-1 w-2 h-2 bg-[var(--color-skai-q1)] rounded-full"></span>
        </button>
      </div>
    </div>
  );
}
