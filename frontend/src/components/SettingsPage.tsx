import { useState, useEffect } from 'react';
import { Bell, Lock, Plug, Globe, Volume2, Mail, Smartphone, Shield } from 'lucide-react';
import { authApi } from '../services/authService';

type SettingsTab = 'notifications' | 'privacy' | 'integrations';

interface UserPreferences {
  emailNotifs: boolean;
  pushNotifs: boolean;
  soundNotifs: boolean;
  aiProcessing: boolean;
}

export function SettingsPage() {
  const [activeTab, setActiveTab] = useState<SettingsTab>('notifications');
  const [emailNotifs, setEmailNotifs] = useState(true);
  const [pushNotifs, setPushNotifs] = useState(true);
  const [soundNotifs, setSoundNotifs] = useState(false);
  const [aiProcessing, setAiProcessing] = useState(true);
  const [isExporting, setIsExporting] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  // Load preferences from localStorage on mount
  useEffect(() => {
    const saved = localStorage.getItem('skai_preferences');
    if (saved) {
      try {
        const prefs: UserPreferences = JSON.parse(saved);
        setEmailNotifs(prefs.emailNotifs);
        setPushNotifs(prefs.pushNotifs);
        setSoundNotifs(prefs.soundNotifs);
        setAiProcessing(prefs.aiProcessing);
      } catch (e) {
        console.error('Failed to parse preferences', e);
      }
    }
  }, []);

  // Save preferences to localStorage whenever they change
  const savePreferences = (key: string, value: boolean) => {
    const newPrefs: UserPreferences = {
      emailNotifs,
      pushNotifs,
      soundNotifs,
      aiProcessing,
      [key]: value,
    };
    localStorage.setItem('skai_preferences', JSON.stringify(newPrefs));
  };

  const handleExportData = async () => {
    setIsExporting(true);
    try {
      // Get user data from localStorage
      const userStr = localStorage.getItem('skai_user');
      const user = userStr ? JSON.parse(userStr) : null;

      // Create export data
      const exportData = {
        exportedAt: new Date().toISOString(),
        user: user ? { email: user.email, name: user.name, role: user.role } : null,
        preferences: { emailNotifs, pushNotifs, soundNotifs, aiProcessing },
        note: 'Task and calendar data export coming soon',
      };

      // Download as JSON
      const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `skai-todo-export-${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      alert('Data exported successfully!');
    } catch (error) {
      console.error('Export failed:', error);
      alert('Failed to export data');
    } finally {
      setIsExporting(false);
    }
  };

  const handleDeleteAccount = async () => {
    const confirmed = window.confirm('Are you absolutely sure? This action cannot be undone. All your data will be permanently deleted.');
    if (!confirmed) return;

    const password = window.prompt('Please enter your password to confirm account deletion:');
    if (!password) return;

    setIsDeleting(true);
    try {
      // Call backend API to delete account
      await authApi.deleteAccount(password);

      // Clear local storage
      localStorage.removeItem('skai_token');
      localStorage.removeItem('skai_user');
      localStorage.removeItem('skai_preferences');

      alert('Your account has been deleted. You will now be redirected to the login page.');
      // Reload to redirect to login
      window.location.reload();
    } catch (error: any) {
      console.error('Delete failed:', error);
      alert(error.response?.data?.message || 'Failed to delete account. Please check your password and try again.');
    } finally {
      setIsDeleting(false);
    }
  };

  const tabs = [
    { id: 'notifications' as SettingsTab, label: 'Notifications', icon: Bell },
    { id: 'privacy' as SettingsTab, label: 'Privacy & Data', icon: Lock },
    { id: 'integrations' as SettingsTab, label: 'Integration Hub', icon: Plug },
  ];

  const Toggle = ({ value, onChange }: { value: boolean; onChange: (v: boolean) => void }) => (
    <button
      onClick={() => { onChange(!value); }}
      className={`w-11 h-6 rounded-full transition-colors relative ${value ? 'bg-[var(--color-skai-accent)]' : 'bg-slate-700'}`}
    >
      <div className={`w-5 h-5 rounded-full bg-white shadow-md absolute top-0.5 transition-transform ${value ? 'translate-x-[22px]' : 'translate-x-0.5'}`} />
    </button>
  );

  return (
    <div className="flex-1 p-6 overflow-y-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-white">Settings</h1>
        <p className="text-sm text-slate-500 mt-1">Manage your preferences</p>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 mb-8 bg-slate-800/50 rounded-lg p-1 w-fit">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-all ${activeTab === tab.id
                ? 'bg-[var(--color-skai-card)] text-white shadow-sm'
                : 'text-slate-400 hover:text-slate-200'
                }`}
            >
              <Icon size={14} /> {tab.label}
            </button>
          );
        })}
      </div>

      <div className="max-w-2xl">
        {activeTab === 'notifications' && (
          <div className="space-y-1">
            <div className="bg-[var(--color-skai-card)] border border-slate-700/50 rounded-xl p-5 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Mail size={18} className="text-blue-400" />
                <div>
                  <p className="text-sm font-medium text-white">Email Notifications</p>
                  <p className="text-xs text-slate-500">Receive task reminders and digests via email</p>
                </div>
              </div>
              <Toggle value={emailNotifs} onChange={(v) => { setEmailNotifs(v); savePreferences('emailNotifs', v); }} />
            </div>
            <div className="bg-[var(--color-skai-card)] border border-slate-700/50 rounded-xl p-5 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Smartphone size={18} className="text-green-400" />
                <div>
                  <p className="text-sm font-medium text-white">Push Notifications</p>
                  <p className="text-xs text-slate-500">Get real-time alerts on your device</p>
                </div>
              </div>
              <Toggle value={pushNotifs} onChange={(v) => { setPushNotifs(v); savePreferences('pushNotifs', v); }} />
            </div>
            <div className="bg-[var(--color-skai-card)] border border-slate-700/50 rounded-xl p-5 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Volume2 size={18} className="text-orange-400" />
                <div>
                  <p className="text-sm font-medium text-white">Sound Effects</p>
                  <p className="text-xs text-slate-500">Play sounds for task completions and voice commands</p>
                </div>
              </div>
              <Toggle value={soundNotifs} onChange={(v) => { setSoundNotifs(v); savePreferences('soundNotifs', v); }} />
            </div>
          </div>
        )}

        {activeTab === 'privacy' && (
          <div className="space-y-1">
            <div className="bg-[var(--color-skai-card)] border border-slate-700/50 rounded-xl p-5 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Shield size={18} className="text-emerald-400" />
                <div>
                  <p className="text-sm font-medium text-white">AI Data Processing</p>
                  <p className="text-xs text-slate-500">Allow AI to analyze your tasks for scheduling suggestions</p>
                </div>
              </div>
              <Toggle value={aiProcessing} onChange={(v) => { setAiProcessing(v); savePreferences('aiProcessing', v); }} />
            </div>
            <div className="bg-[var(--color-skai-card)] border border-slate-700/50 rounded-xl p-5">
              <div className="flex items-center gap-3 mb-3">
                <Globe size={18} className="text-cyan-400" />
                <div>
                  <p className="text-sm font-medium text-white">Data Residency</p>
                  <p className="text-xs text-slate-500">All data stored on your self-hosted Hostinger VPS</p>
                </div>
              </div>
              <div className="bg-green-500/10 border border-green-500/20 rounded-lg px-3 py-2 text-xs text-green-400 font-medium">
                ✓ GDPR Compliant — All data stays on your server
              </div>
            </div>
            <div className="bg-[var(--color-skai-card)] border border-slate-700/50 rounded-xl p-5">
              <p className="text-sm font-medium text-white mb-3">Export or Delete Data</p>
              <div className="flex gap-3">
                <button
                  onClick={handleExportData}
                  disabled={isExporting}
                  className="px-4 py-2 rounded-lg border border-slate-600 text-sm text-slate-300 hover:bg-slate-800 transition-colors disabled:opacity-50"
                >
                  {isExporting ? 'Exporting...' : 'Export All Data'}
                </button>
                <button
                  onClick={handleDeleteAccount}
                  disabled={isDeleting}
                  className="px-4 py-2 rounded-lg border border-red-800 text-sm text-red-400 hover:bg-red-900/30 transition-colors disabled:opacity-50"
                >
                  {isDeleting ? 'Deleting...' : 'Delete Account'}
                </button>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'integrations' && (
          <div className="space-y-1">
            {[
              { name: 'Google Calendar', desc: 'Sync events bidirectionally', connected: true, color: 'text-blue-400' },
              { name: 'Outlook Calendar', desc: 'Microsoft 365 calendar sync', connected: false, color: 'text-sky-400' },
              { name: 'Slack', desc: 'Get task notifications in Slack channels', connected: true, color: 'text-emerald-400' },
              { name: 'Gmail', desc: 'Convert emails to tasks', connected: false, color: 'text-red-400' },
              { name: 'Zapier / n8n', desc: 'Custom webhook integrations', connected: true, color: 'text-orange-400' },
            ].map((integration) => (
              <div key={integration.name} className="bg-[var(--color-skai-card)] border border-slate-700/50 rounded-xl p-5 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className={`w-9 h-9 rounded-lg bg-slate-800 flex items-center justify-center ${integration.color} text-sm font-bold`}>
                    {integration.name[0]}
                  </div>
                  <div>
                    <p className="text-sm font-medium text-white">{integration.name}</p>
                    <p className="text-xs text-slate-500">{integration.desc}</p>
                  </div>
                </div>
                <button className={`px-4 py-1.5 rounded-lg text-xs font-medium transition-colors ${integration.connected
                  ? 'bg-green-500/10 text-green-400 border border-green-500/20'
                  : 'bg-slate-800 text-slate-400 border border-slate-700 hover:border-slate-500'
                  }`}>
                  {integration.connected ? 'Connected' : 'Connect'}
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
