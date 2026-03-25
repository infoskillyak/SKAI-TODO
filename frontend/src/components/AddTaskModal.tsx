import { useState } from 'react';
import { X } from 'lucide-react';

type QuadrantType = 'Q1' | 'Q2' | 'Q3' | 'Q4';

interface AddTaskModalProps {
  onClose: () => void;
  onAdd: (task: { content: string; quadrant: QuadrantType; duration?: number; energyLevel?: number }) => void;
}

export function AddTaskModal({ onClose, onAdd }: AddTaskModalProps) {
  const [content, setContent] = useState('');
  const [quadrant, setQuadrant] = useState<QuadrantType>('Q2');
  const [duration, setDuration] = useState('');
  const [energyLevel, setEnergyLevel] = useState('3');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!content.trim()) return;
    onAdd({
      content: content.trim(),
      quadrant,
      duration: duration ? parseInt(duration) : undefined,
      energyLevel: parseInt(energyLevel),
    });
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-[var(--color-skai-card)] rounded-xl p-6 w-full max-w-md border border-slate-700">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-white">Add New Task</h2>
          <button onClick={onClose} className="text-slate-400 hover:text-white">
            <X size={20} />
          </button>
        </div>
        
        <form onSubmit={handleSubmit}>
          <div className="mb-4">
            <label className="block text-sm text-slate-400 mb-1">Task</label>
            <input
              type="text"
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="What needs to be done?"
              className="w-full bg-slate-800 border border-slate-700 rounded-lg px-4 py-2 text-white placeholder-slate-500 focus:outline-none focus:border-[var(--color-skai-accent)]"
              autoFocus
            />
          </div>

          <div className="mb-4">
            <label className="block text-sm text-slate-400 mb-1">Quadrant</label>
            <select
              value={quadrant}
              onChange={(e) => setQuadrant(e.target.value as QuadrantType)}
              className="w-full bg-slate-800 border border-slate-700 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-[var(--color-skai-accent)]"
            >
              <option value="Q1">Q1 - Do First (Urgent & Important)</option>
              <option value="Q2">Q2 - Schedule (Not Urgent & Important)</option>
              <option value="Q3">Q3 - Delegate (Urgent & Not Important)</option>
              <option value="Q4">Q4 - Eliminate (Not Urgent & Not Important)</option>
            </select>
          </div>

          <div className="flex gap-4 mb-6">
            <div className="flex-1">
              <label className="block text-sm text-slate-400 mb-1">Duration (min)</label>
              <input
                type="number"
                value={duration}
                onChange={(e) => setDuration(e.target.value)}
                placeholder="30"
                min="1"
                className="w-full bg-slate-800 border border-slate-700 rounded-lg px-4 py-2 text-white placeholder-slate-500 focus:outline-none focus:border-[var(--color-skai-accent)]"
              />
            </div>
            <div className="flex-1">
              <label className="block text-sm text-slate-400 mb-1">Energy Level</label>
              <select
                value={energyLevel}
                onChange={(e) => setEnergyLevel(e.target.value)}
                className="w-full bg-slate-800 border border-slate-700 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-[var(--color-skai-accent)]"
              >
                <option value="1">Low</option>
                <option value="2">Medium-Low</option>
                <option value="3">Medium</option>
                <option value="4">Medium-High</option>
                <option value="5">High</option>
              </select>
            </div>
          </div>

          <div className="flex gap-3">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2 rounded-lg border border-slate-700 text-slate-300 hover:bg-slate-800"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="flex-1 px-4 py-2 rounded-lg bg-gradient-to-r from-[var(--color-skai-accent)] to-blue-500 text-white font-medium hover:opacity-90"
            >
              Add Task
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
