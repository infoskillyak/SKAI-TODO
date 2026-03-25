import { Mic, LayoutDashboard, Calendar, BarChart3, Settings, LogOut, Target, Shield, Wrench, CreditCard, Wallet } from 'lucide-react';

interface SidebarProps {
  activeView: string;
  onViewChange: (view: string) => void;
  onVoiceClick: () => void;
  onLogout: () => void;
  user: { name: string; plan: string; email: string; role: string } | null;
}

const navItems = [
  { id: 'matrix', label: 'Matrix View', icon: LayoutDashboard },
  { id: 'calendar', label: 'AI Planner', icon: Calendar },
  { id: 'focus', label: 'Focus Mode', icon: Target },
  { id: 'analytics', label: 'Analytics', icon: BarChart3 },
  { id: 'subscription', label: 'Subscription', icon: CreditCard },
  { id: 'admin', label: 'Admin Panel', icon: Shield },
  { id: 'payments', label: 'Payment Settings', icon: Wallet },
  { id: 'settings', label: 'Settings', icon: Settings },
];

const superAdminItems = [
  { id: 'superadmin', label: 'Integrations', icon: Wrench },
];

export function Sidebar({ activeView, onViewChange, onVoiceClick, onLogout, user }: SidebarProps) {
  return (
    <div className="w-64 bg-[var(--color-skai-card)] border-r border-slate-700/50 flex flex-col h-full">
      {/* Logo Section */}
      <div className="p-6 flex items-center justify-center border-b border-slate-700/30">
        <div className="font-bold text-xl tracking-wider text-white flex items-center gap-3">
          <div className="w-9 h-9 rounded-full bg-gradient-to-tr from-cyan-400 to-blue-500 flex items-center justify-center shadow-[0_0_20px_rgba(6,182,212,0.5)]">
            <span className="text-white text-lg font-black leading-none">S</span>
          </div>
          <span>
            <span className="text-[var(--color-skai-accent)]">SKAI</span>
            <span className="text-slate-400 font-normal">-ToDo</span>
          </span>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-3 py-6 space-y-1 overflow-y-auto">
        {navItems
          .filter(item => {
            if (item.id === 'admin' || item.id === 'payments') return user?.role?.toUpperCase() === 'ADMIN' || user?.role?.toUpperCase() === 'SUPERADMIN';
            return true;
          })
          .map((item) => {
            const Icon = item.icon;
            const isActive = activeView === item.id;
            return (
              <button
                key={item.id}
                onClick={() => onViewChange(item.id)}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg font-medium transition-all text-sm ${isActive
                  ? 'bg-[var(--color-skai-accent)]/10 text-[var(--color-skai-accent)] shadow-sm'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
                  }`}
              >
                <Icon size={18} />
                {item.label}
              </button>
            );
          })}

        {/* Super Admin Section */}
        {user?.role?.toUpperCase() === 'SUPERADMIN' && (
          <div className="pt-4 mt-4 border-t border-slate-700/30">
            <p className="px-4 text-[10px] uppercase tracking-wider text-red-400 font-bold mb-2">Global System</p>
            {superAdminItems.map((item) => {
              const Icon = item.icon;
              const isActive = activeView === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => onViewChange(item.id)}
                  className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg font-medium transition-all text-sm ${isActive
                    ? 'bg-red-500/10 text-red-400 shadow-sm'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
                    }`}
                >
                  <Icon size={18} />
                  {item.label}
                </button>
              );
            })}
          </div>
        )}
      </nav>

      {/* SKAI Voice Button */}
      <div className="p-4 border-t border-slate-700/30">
        <button
          onClick={onVoiceClick}
          className="w-full bg-gradient-to-r from-blue-600 to-cyan-500 hover:from-blue-500 hover:to-cyan-400 text-white shadow-[0_0_25px_rgba(6,182,212,0.4)] hover:shadow-[0_0_35px_rgba(6,182,212,0.6)] rounded-xl p-4 flex items-center justify-center gap-3 transition-all transform hover:-translate-y-0.5 active:translate-y-0 active:shadow-[0_0_15px_rgba(6,182,212,0.3)]"
        >
          <Mic size={22} className="animate-pulse" />
          <span className="font-semibold text-base">SKAI Voice</span>
        </button>
        <p className="text-center text-[11px] text-slate-500 mt-2">Tap to dictate a task</p>
      </div>

      {/* User footer */}
      <div className="p-4 border-t border-slate-700/30 flex items-center gap-3">
        <div className="w-8 h-8 rounded-full bg-slate-600 flex items-center justify-center text-xs font-bold text-white">
          {(user?.name || 'U').charAt(0)}
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-slate-300 truncate">{user?.name || 'Guest User'}</p>
          <p className="text-[11px] text-slate-500 truncate uppercase tracking-tight">{user?.plan || 'Free Plan'}</p>
        </div>
        <button
          onClick={onLogout}
          className="text-slate-500 hover:text-red-400 transition-colors p-1"
        >
          <LogOut size={16} />
        </button>
      </div>
    </div>
  );
}
