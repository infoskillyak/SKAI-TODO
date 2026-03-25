import { useState } from 'react';
import { X, Clock, Zap, Calendar, MessageSquare, Activity, Send, MoreHorizontal } from 'lucide-react';

interface Comment {
  id: string;
  author: string;
  text: string;
  timestamp: string;
}

interface TaskDetailProps {
  task: {
    id: string;
    title: string;
    description?: string;
    quadrant: string;
    status: string;
    dueDate?: string;
    duration?: number;
    energyLevel?: number;
  };
  onClose: () => void;
}

const quadrantLabels: Record<string, { label: string; color: string }> = {
  Q1: { label: 'Do First', color: 'bg-[var(--color-skai-q1)]' },
  Q2: { label: 'Schedule', color: 'bg-[var(--color-skai-q2)]' },
  Q3: { label: 'Delegate', color: 'bg-[var(--color-skai-q3)]' },
  Q4: { label: 'Eliminate', color: 'bg-[var(--color-skai-q4)]' },
};

export function TaskDetailModal({ task, onClose }: TaskDetailProps) {
  const [activeTab, setActiveTab] = useState<'comments' | 'activity'>('comments');
  const [commentText, setCommentText] = useState('');
  const [comments, setComments] = useState<Comment[]>([
    { id: 'c1', author: 'You', text: 'Synced with team lead regarding scope.', timestamp: '2 hours ago' },
    { id: 'c2', author: 'AI', text: 'Auto-scheduled this task for tomorrow 9:00–10:00 AM.', timestamp: '1 hour ago' },
  ]);

  const handleAddComment = () => {
    if (!commentText.trim()) return;
    setComments([...comments, {
      id: `c${Date.now()}`,
      author: 'You',
      text: commentText,
      timestamp: 'Just now',
    }]);
    setCommentText('');
  };

  const qMeta = quadrantLabels[task.quadrant] || quadrantLabels.Q1;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm" onClick={onClose}>
      <div
        className="bg-[var(--color-skai-card)] border border-slate-700/50 rounded-2xl w-full max-w-2xl max-h-[85vh] overflow-hidden shadow-2xl flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-start justify-between p-6 border-b border-slate-700/50">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-2">
              <span className={`px-2 py-0.5 rounded text-[10px] font-bold text-white ${qMeta.color}`}>
                {qMeta.label}
              </span>
              <span className="px-2 py-0.5 rounded text-[10px] font-medium bg-slate-700 text-slate-300">
                {task.status}
              </span>
            </div>
            <h2 className="text-xl font-bold text-white">{task.title}</h2>
            <p className="text-sm text-slate-400 mt-1">{task.description || 'No description provided.'}</p>
          </div>
          <button onClick={onClose} className="text-slate-500 hover:text-white transition-colors ml-4">
            <X size={20} />
          </button>
        </div>

        {/* Metadata row */}
        <div className="flex items-center gap-6 px-6 py-3 border-b border-slate-700/30 text-sm text-slate-400">
          {task.dueDate && (
            <span className="flex items-center gap-1.5"><Calendar size={14} /> {task.dueDate}</span>
          )}
          {task.duration && (
            <span className="flex items-center gap-1.5"><Clock size={14} /> {task.duration} min</span>
          )}
          {task.energyLevel && (
            <span className="flex items-center gap-1.5"><Zap size={14} className="text-yellow-500" /> Energy {task.energyLevel}/5</span>
          )}
        </div>

        {/* Tabs */}
        <div className="flex border-b border-slate-700/30">
          <button
            onClick={() => setActiveTab('comments')}
            className={`flex items-center gap-2 px-6 py-3 text-sm font-medium transition-colors ${activeTab === 'comments' ? 'text-[var(--color-skai-accent)] border-b-2 border-[var(--color-skai-accent)]' : 'text-slate-500 hover:text-slate-300'}`}
          >
            <MessageSquare size={14} /> Comments ({comments.length})
          </button>
          <button
            onClick={() => setActiveTab('activity')}
            className={`flex items-center gap-2 px-6 py-3 text-sm font-medium transition-colors ${activeTab === 'activity' ? 'text-[var(--color-skai-accent)] border-b-2 border-[var(--color-skai-accent)]' : 'text-slate-500 hover:text-slate-300'}`}
          >
            <Activity size={14} /> Activity
          </button>
        </div>

        {/* Tab content */}
        <div className="flex-1 overflow-y-auto p-6">
          {activeTab === 'comments' && (
            <div className="space-y-4">
              {comments.map((c) => (
                <div key={c.id} className="flex gap-3 group">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold text-white flex-shrink-0 ${c.author === 'AI' ? 'bg-gradient-to-tr from-cyan-400 to-blue-500' : 'bg-slate-600'}`}>
                    {c.author === 'AI' ? 'S' : c.author[0]}
                  </div>
                  <div className="flex-1 bg-slate-800/50 rounded-lg p-3 border border-slate-700/30">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-sm font-medium text-slate-300">{c.author}</span>
                      <div className="flex items-center gap-2">
                        <span className="text-[11px] text-slate-500">{c.timestamp}</span>
                        <button className="opacity-0 group-hover:opacity-100 text-slate-500 hover:text-slate-300 transition-all"><MoreHorizontal size={14} /></button>
                      </div>
                    </div>
                    <p className="text-sm text-slate-400">{c.text}</p>
                  </div>
                </div>
              ))}
            </div>
          )}

          {activeTab === 'activity' && (
            <div className="space-y-3 text-sm text-slate-400">
              <div className="flex items-center gap-3 py-2">
                <div className="w-1.5 h-1.5 rounded-full bg-green-500"></div>
                <span>Task created <span className="text-slate-600">— 3 hours ago</span></span>
              </div>
              <div className="flex items-center gap-3 py-2">
                <div className="w-1.5 h-1.5 rounded-full bg-blue-500"></div>
                <span>Moved from Q2 to Q1 <span className="text-slate-600">— 2 hours ago</span></span>
              </div>
              <div className="flex items-center gap-3 py-2">
                <div className="w-1.5 h-1.5 rounded-full bg-cyan-500"></div>
                <span>AI auto-scheduled for tomorrow 9 AM <span className="text-slate-600">— 1 hour ago</span></span>
              </div>
            </div>
          )}
        </div>

        {/* Comment input */}
        {activeTab === 'comments' && (
          <div className="p-4 border-t border-slate-700/50">
            <div className="flex items-center gap-3 bg-slate-800/60 rounded-lg px-4 py-2 border border-slate-700/50 focus-within:border-[var(--color-skai-accent)]/50 transition-colors">
              <label htmlFor="commentInput" className="sr-only">Write a comment</label>
              <input
                id="commentInput"
                type="text"
                value={commentText}
                onChange={(e) => setCommentText(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleAddComment()}
                placeholder="Write a comment..."
                className="flex-1 bg-transparent text-sm text-slate-300 placeholder-slate-500 outline-none"
              />
              <button
                onClick={handleAddComment}
                className="text-[var(--color-skai-accent)] hover:text-white transition-colors"
              >
                <Send size={16} />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
