import React from 'react';
import { useAuth } from '../context/AuthContext';
import { Logo } from './Logo';
import { Sun, Moon, ShieldCheck, LogOut, Settings as SettingsIcon, KeyRound, Sparkles } from 'lucide-react';

interface HeaderProps {
  onOpenSettings?: () => void;
  onOpenBackupPin?: () => void;
}

export const Header: React.FC<HeaderProps> = ({ onOpenSettings, onOpenBackupPin }) => {
  const { user, step, settings, toggleTheme, logout } = useAuth();

  return (
    <header className="sticky top-0 z-40 w-full border-b border-white/[0.08] bg-[#07090e]/80 backdrop-blur-xl transition-colors duration-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between gap-4">
        {/* Brand */}
        <Logo size="md" />

        {/* Step Flow Indicator */}
        <div className="hidden md:flex items-center gap-2 text-xs font-medium">
          <div
            className={`flex items-center gap-1.5 px-3 py-1 rounded-lg border transition-all ${
              step === 'auth'
                ? 'bg-purple-500/10 border-purple-500/40 text-purple-300 shadow-[0_0_12px_rgba(168,85,247,0.2)]'
                : 'border-white/5 text-slate-500'
            }`}
          >
            <span className="w-4 h-4 rounded-full flex items-center justify-center text-[10px] bg-white/10 font-bold">1</span>
            <span>Authentication</span>
          </div>

          <div className="w-3 h-px bg-white/10" />

          <div
            className={`flex items-center gap-1.5 px-3 py-1 rounded-lg border transition-all ${
              step === 'face-enroll' || step === 'face-verify'
                ? 'bg-cyan-500/10 border-cyan-500/40 text-cyan-300 shadow-[0_0_12px_rgba(34,211,238,0.2)]'
                : 'border-white/5 text-slate-500'
            }`}
          >
            <span className="w-4 h-4 rounded-full flex items-center justify-center text-[10px] bg-white/10 font-bold">2</span>
            <span>Face ID Verification</span>
          </div>

          <div className="w-3 h-px bg-white/10" />

          <div
            className={`flex items-center gap-1.5 px-3 py-1 rounded-lg border transition-all ${
              step === 'assistant'
                ? 'bg-emerald-500/10 border-emerald-500/40 text-emerald-300 shadow-[0_0_12px_rgba(16,185,129,0.2)]'
                : 'border-white/5 text-slate-500'
            }`}
          >
            <span className="w-4 h-4 rounded-full flex items-center justify-center text-[10px] bg-white/10 font-bold">3</span>
            <span>LOQIR AI</span>
          </div>
        </div>

        {/* Right Actions */}
        <div className="flex items-center gap-2">
          {/* Engine indicator */}
          <div className="hidden lg:flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-white/[0.03] border border-white/5 text-[11px] text-slate-400">
            <span className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse"></span>
            <span>Gemini 3.8 Neural Core</span>
          </div>

          {/* Theme toggle */}
          <button
            onClick={toggleTheme}
            aria-label="Toggle theme"
            className="p-2 rounded-lg text-slate-400 hover:text-white hover:bg-white/[0.06] transition-colors"
            title={settings.theme === 'dark' ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
          >
            {settings.theme === 'dark' ? <Sun className="w-4 h-4 text-amber-300" /> : <Moon className="w-4 h-4 text-purple-400" />}
          </button>

          {/* User controls if logged in */}
          {user && (
            <div className="flex items-center gap-2 pl-2 border-l border-white/10">
              {/* Backup PIN lookup */}
              {onOpenBackupPin && (
                <button
                  onClick={onOpenBackupPin}
                  className="hidden sm:flex items-center gap-1.5 px-2.5 py-1 text-xs text-slate-300 bg-white/[0.04] hover:bg-white/[0.08] border border-white/10 rounded-lg transition-colors"
                  title="View Security Backup PIN"
                >
                  <KeyRound className="w-3.5 h-3.5 text-purple-400" />
                  <span>PIN</span>
                </button>
              )}

              {/* Settings modal trigger */}
              {onOpenSettings && (
                <button
                  onClick={onOpenSettings}
                  className="p-2 rounded-lg text-slate-400 hover:text-white hover:bg-white/[0.06] transition-colors"
                  title="LOQIR AI Settings"
                >
                  <SettingsIcon className="w-4 h-4 text-cyan-400" />
                </button>
              )}

              {/* User badge */}
              <div className="hidden sm:flex items-center gap-2 px-2.5 py-1 bg-white/[0.04] border border-white/10 rounded-lg">
                <div className="w-5 h-5 rounded-md bg-gradient-to-tr from-purple-600 to-cyan-500 flex items-center justify-center text-[10px] font-bold text-white uppercase">
                  {user.fullName.charAt(0)}
                </div>
                <div className="flex flex-col text-left">
                  <span className="text-xs font-semibold text-slate-200 leading-tight max-w-[120px] truncate">
                    {user.fullName}
                  </span>
                  <span className="text-[10px] text-cyan-400 flex items-center gap-1">
                    <ShieldCheck className="w-2.5 h-2.5" /> Face ID Active
                  </span>
                </div>
              </div>

              {/* Logout */}
              <button
                onClick={logout}
                className="p-2 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 transition-colors"
                title="Log Out"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};
