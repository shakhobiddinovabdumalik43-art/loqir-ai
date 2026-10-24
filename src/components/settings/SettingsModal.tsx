import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { api } from '../../lib/api';
import {
  Settings as SettingsIcon,
  User,
  ShieldCheck,
  KeyRound,
  RotateCcw,
  Sparkles,
  Sliders,
  Check,
  Copy,
  AlertTriangle,
  Globe,
} from 'lucide-react';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const PERSONAS = [
  { id: 'General High-Performance Assistant', label: 'General Neural Assistant', desc: 'Balanced, articulate, factual' },
  { id: 'Senior Software Architect & Fullstack Engineer', label: 'Senior Software Architect', desc: 'Deep type safety, architecture, refactoring' },
  { id: 'Academic Researcher & STEM Scientist', label: 'Academic STEM Researcher', desc: 'Rigorous mathematics, physics, literature citation' },
  { id: 'Creative Writer & Strategic Storyteller', label: 'Creative & Executive Writer', desc: 'Compelling essays, scripts, narratives' },
  { id: 'Strategic Business & Venture Consultant', label: 'Business & Strategy Consultant', desc: 'Financial models, market strategies, executive summaries' },
];

export const SettingsModal: React.FC<SettingsModalProps> = ({ isOpen, onClose }) => {
  const { user, settings, setSettings, setStep, setUser } = useAuth();
  const [copiedPin, setCopiedPin] = useState(false);
  const [resettingBiometrics, setResettingBiometrics] = useState(false);
  const [resetMessage, setResetMessage] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleCopyPin = () => {
    if (user?.backupPin) {
      navigator.clipboard.writeText(user.backupPin);
      setCopiedPin(true);
      setTimeout(() => setCopiedPin(false), 2000);
    }
  };

  const handleReEnrollFace = async () => {
    if (window.confirm('Reset current Face ID profile and launch biometric enrollment scanner?')) {
      setResettingBiometrics(true);
      try {
        await api.resetFaceBiometrics();
        if (user) {
          setUser({ ...user, faceEnrolled: false });
        }
        onClose();
        setStep('face-enroll');
      } catch (err: any) {
        setResetMessage(err.message || 'Failed to reset Face ID');
      } finally {
        setResettingBiometrics(false);
      }
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
      <div className="bg-[#0f1422] border border-white/10 rounded-3xl max-w-xl w-full p-6 sm:p-8 text-left space-y-6 shadow-2xl relative max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-white/10 pb-4">
          <div className="flex items-center gap-2.5">
            <SettingsIcon className="w-5 h-5 text-cyan-400" />
            <div>
              <h3 className="text-base font-bold text-white">LOQIR AI Workspace Settings</h3>
              <p className="text-xs text-slate-400">Account security, model parameters, and persona</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white text-lg font-mono p-1 rounded-lg hover:bg-white/10"
          >
            ✕
          </button>
        </div>

        {/* Section 1: User Profile & Security */}
        <div className="space-y-3">
          <h4 className="text-xs font-semibold uppercase tracking-wider text-purple-400 flex items-center gap-1.5">
            <User className="w-3.5 h-3.5" /> Identity & Biometric Security
          </h4>

          <div className="p-4 rounded-2xl bg-white/[0.02] border border-white/5 space-y-3">
            <div className="flex items-center justify-between text-xs">
              <span className="text-slate-400">Authenticated Name:</span>
              <span className="font-semibold text-slate-200">{user?.fullName || 'User'}</span>
            </div>

            <div className="flex items-center justify-between text-xs">
              <span className="text-slate-400">Registered Phone:</span>
              <span className="font-mono text-slate-200">{user?.fullPhone || 'N/A'}</span>
            </div>

            <div className="flex items-center justify-between text-xs">
              <span className="text-slate-400">Face ID Status:</span>
              <span className="inline-flex items-center gap-1 text-emerald-400 font-medium">
                <ShieldCheck className="w-3.5 h-3.5" /> Enrolled & Active
              </span>
            </div>

            {/* Backup Security PIN card */}
            <div className="p-3 rounded-xl bg-purple-950/30 border border-purple-500/20 flex items-center justify-between">
              <div>
                <p className="text-xs font-semibold text-purple-300 flex items-center gap-1">
                  <KeyRound className="w-3.5 h-3.5" /> 6-Digit Backup PIN
                </p>
                <p className="text-[11px] text-slate-400">Use this code if camera is disabled</p>
              </div>
              <div className="flex items-center gap-2">
                <span className="font-mono text-base font-bold text-white tracking-widest px-2.5 py-1 bg-black/40 rounded-lg border border-purple-500/30">
                  {user?.backupPin || '123456'}
                </span>
                <button
                  onClick={handleCopyPin}
                  className="p-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-slate-300"
                  title="Copy PIN"
                >
                  {copiedPin ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                </button>
              </div>
            </div>

            {/* Re-enroll Face ID Button */}
            <div className="pt-1 flex items-center justify-between">
              <span className="text-xs text-slate-400">Facial template update:</span>
              <button
                type="button"
                disabled={resettingBiometrics}
                onClick={handleReEnrollFace}
                className="px-3 py-1.5 rounded-lg bg-white/10 hover:bg-white/15 text-xs text-cyan-300 flex items-center gap-1.5 border border-cyan-500/20 transition-colors"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Re-enroll Face ID</span>
              </button>
            </div>
          </div>
        </div>

        {/* Section 2: AI Model Persona */}
        <div className="space-y-3">
          <h4 className="text-xs font-semibold uppercase tracking-wider text-cyan-400 flex items-center gap-1.5">
            <Sparkles className="w-3.5 h-3.5" /> Neural Engine Persona
          </h4>

          <div className="space-y-2">
            {PERSONAS.map((p) => {
              const isSelected = settings.persona === p.id;
              return (
                <div
                  key={p.id}
                  onClick={() => setSettings((prev) => ({ ...prev, persona: p.id }))}
                  className={`p-3 rounded-xl border cursor-pointer transition-all ${
                    isSelected
                      ? 'bg-cyan-950/30 border-cyan-500/50 text-cyan-200'
                      : 'bg-white/[0.02] border-white/5 text-slate-400 hover:bg-white/[0.04]'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-slate-200">{p.label}</span>
                    {isSelected && <span className="w-2 h-2 rounded-full bg-cyan-400" />}
                  </div>
                  <p className="text-[11px] text-slate-400 mt-0.5">{p.desc}</p>
                </div>
              );
            })}
          </div>
        </div>

        {/* Section 3: Model Temperature / Creativity */}
        <div className="space-y-3">
          <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-300 flex items-center gap-1.5">
            <Sliders className="w-3.5 h-3.5" /> Response Temperature ({settings.temperature.toFixed(2)})
          </h4>

          <div className="p-4 rounded-2xl bg-white/[0.02] border border-white/5 space-y-2">
            <input
              type="range"
              min="0"
              max="1"
              step="0.05"
              value={settings.temperature}
              onChange={(e) =>
                setSettings((prev) => ({ ...prev, temperature: parseFloat(e.target.value) }))
              }
              className="w-full accent-cyan-400 cursor-pointer"
            />
            <div className="flex justify-between text-[10px] text-slate-500 font-mono">
              <span>0.0 (Strict / Code / Math)</span>
              <span>0.7 (Default Balanced)</span>
              <span>1.0 (Creative Writing)</span>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="pt-2 border-t border-white/10 flex justify-end">
          <button
            onClick={onClose}
            className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-purple-600 to-cyan-600 text-white text-xs font-semibold shadow-md"
          >
            Apply & Close
          </button>
        </div>
      </div>
    </div>
  );
};
