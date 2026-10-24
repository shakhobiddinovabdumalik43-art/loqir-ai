import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { KeyRound, Copy, Check, ShieldCheck } from 'lucide-react';

interface BackupPinModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const BackupPinModal: React.FC<BackupPinModalProps> = ({ isOpen, onClose }) => {
  const { user } = useAuth();
  const [copied, setCopied] = useState(false);

  if (!isOpen) return null;

  const handleCopy = () => {
    if (user?.backupPin) {
      navigator.clipboard.writeText(user.backupPin);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
      <div className="bg-[#0f1422] border border-white/10 rounded-2xl max-w-sm w-full p-6 text-left space-y-4 shadow-2xl">
        <div className="flex items-center justify-between border-b border-white/10 pb-3">
          <div className="flex items-center gap-2">
            <KeyRound className="w-5 h-5 text-purple-400" />
            <h3 className="text-base font-bold text-white">Security Backup PIN</h3>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white text-lg font-mono"
          >
            ✕
          </button>
        </div>

        <p className="text-xs text-slate-300">
          This 6-digit backup code is linked to your registered phone number (<span className="text-cyan-300 font-mono">{user?.fullPhone}</span>) and allows authentication whenever camera access is blocked.
        </p>

        <div className="p-4 rounded-xl bg-purple-950/40 border border-purple-500/30 flex items-center justify-between">
          <span className="font-mono text-2xl font-bold tracking-[0.3em] text-white">
            {user?.backupPin || '123456'}
          </span>
          <button
            onClick={handleCopy}
            className="p-2 rounded-lg bg-white/10 hover:bg-white/20 text-slate-300 transition-colors"
            title="Copy PIN"
          >
            {copied ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
          </button>
        </div>

        <div className="flex items-center gap-1.5 text-[11px] text-slate-400">
          <ShieldCheck className="w-3.5 h-3.5 text-cyan-400" />
          <span>Keep this code private and secure.</span>
        </div>

        <div className="pt-2 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-white/10 hover:bg-white/15 text-xs text-white font-medium"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
