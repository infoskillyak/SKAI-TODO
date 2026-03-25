import { useState } from 'react';
import { Eye, EyeOff } from 'lucide-react';
import { RegisterPage } from './RegisterPage';

interface LoginPageProps {
  onLogin: (email: string, password: string) => void;
}

export function LoginPage({ onLogin }: LoginPageProps) {
  const [showRegister, setShowRegister] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    await onLogin(email, password);
    setIsLoading(false);
  };

  if (showRegister) {
    return <RegisterPage onBackToLogin={() => setShowRegister(false)} onRegister={async (email, password, name) => {
      const response = await fetch('/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password, name })
      });
      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.message || 'Registration failed');
      }
      onLogin(email, password);
    }} />;
  }

  return (
    <div className="min-h-screen bg-[var(--color-skai-dark)] flex items-center justify-center p-4">
      {/* Background gradient effects */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-[var(--color-skai-accent)]/5 rounded-full blur-3xl"></div>
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-blue-500/5 rounded-full blur-3xl"></div>
      </div>

      <div className="relative w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-10">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-tr from-cyan-400 to-blue-500 shadow-[0_0_40px_rgba(6,182,212,0.4)] mb-4">
            <span className="text-white text-3xl font-black">S</span>
          </div>
          <h1 className="text-3xl font-bold text-white mt-2">
            <span className="text-[var(--color-skai-accent)]">SKAI</span>-ToDo
          </h1>
          <p className="text-slate-400 text-sm mt-2">Your AI-powered productivity teammate</p>
        </div>

        {/* Login Card */}
        <div className="bg-[var(--color-skai-card)] border border-slate-700/50 rounded-2xl p-8 shadow-2xl">
          <h2 className="text-xl font-semibold text-white mb-6">Sign in to your account</h2>

          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label htmlFor="emailInput" className="block text-sm font-medium text-slate-300 mb-2">Email address</label>
              <input
                id="emailInput"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full bg-slate-800/60 border border-slate-700/50 rounded-lg px-4 py-3 text-sm text-slate-200 placeholder-slate-500 outline-none focus:border-[var(--color-skai-accent)]/60 focus:ring-1 focus:ring-[var(--color-skai-accent)]/30 transition-all"
                placeholder="you@company.com"
                required
              />
            </div>

            <div>
              <label htmlFor="passwordInput" className="block text-sm font-medium text-slate-300 mb-2">Password</label>
              <div className="relative">
                <input
                  id="passwordInput"
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full bg-slate-800/60 border border-slate-700/50 rounded-lg px-4 py-3 pr-12 text-sm text-slate-200 placeholder-slate-500 outline-none focus:border-[var(--color-skai-accent)]/60 focus:ring-1 focus:ring-[var(--color-skai-accent)]/30 transition-all"
                  placeholder="••••••••"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300 transition-colors"
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>

            <div className="flex items-center justify-between">
              <label htmlFor="rememberMeCheckbox" className="flex items-center gap-2 text-sm text-slate-400 cursor-pointer">
                <input id="rememberMeCheckbox" type="checkbox" className="w-4 h-4 rounded border-slate-600 bg-slate-800 accent-[var(--color-skai-accent)]" />
                Remember me
              </label>
              <a href="#" className="text-sm text-[var(--color-skai-accent)] hover:underline">Forgot password?</a>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full bg-gradient-to-r from-blue-600 to-cyan-500 hover:from-blue-500 hover:to-cyan-400 text-white font-semibold py-3 rounded-lg transition-all shadow-lg shadow-cyan-500/20 hover:shadow-cyan-500/30 disabled:opacity-60"
            >
              {isLoading ? (
                <span className="flex items-center justify-center gap-2">
                  <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" /></svg>
                  Signing in...
                </span>
              ) : 'Sign In'}
            </button>
          </form>

          <div className="mt-6 pt-6 border-t border-slate-700/50 text-center">
            <p className="text-sm text-slate-400">
              Don't have an account? <button onClick={() => setShowRegister(true)} className="text-[var(--color-skai-accent)] hover:underline font-medium">Create one</button>
            </p>
          </div>
        </div>

        {/* Admin contact */}
        <p className="text-center text-xs text-slate-600 mt-6">
          Need help? Contact your admin or <a href="mailto:support@skai-todo.com" className="text-slate-500 hover:text-slate-400">support@skai-todo.com</a>
        </p>
      </div>
    </div>
  );
}
