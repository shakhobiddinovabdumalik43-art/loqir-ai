import React, { useState } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { Header } from './components/Header';
import { AuthPage } from './components/auth/AuthPage';
import { FaceIdPage } from './components/face/FaceIdPage';
import { ChatPage } from './components/chat/ChatPage';
import { SettingsModal } from './components/settings/SettingsModal';
import { BackupPinModal } from './components/auth/BackupPinModal';

const AppContent: React.FC = () => {
  const { step, loading } = useAuth();
  const [showSettings, setShowSettings] = useState(false);
  const [showBackupPin, setShowBackupPin] = useState(false);

  if (loading) {
    return (
      <div className="min-h-screen bg-[#07090e] flex flex-col items-center justify-center space-y-4">
        <div className="relative w-12 h-12">
          <div className="absolute inset-0 rounded-full border-2 border-cyan-400/20 border-t-cyan-400 animate-spin" />
          <div className="absolute inset-2 rounded-full border-2 border-purple-500/20 border-b-purple-400 animate-spin" style={{ animationDirection: 'reverse' }} />
        </div>
        <p className="text-xs font-mono tracking-widest text-slate-400 uppercase">
          Initializing LOQIR Neural Core...
        </p>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-[#07090e] text-slate-100 selection:bg-purple-500/30 selection:text-cyan-300 font-['Plus_Jakarta_Sans',sans-serif]">
      {/* Universal Header */}
      <Header
        onOpenSettings={() => setShowSettings(true)}
        onOpenBackupPin={() => setShowBackupPin(true)}
      />

      {/* Main Flow: Exactly 3 Connected Pages */}
      <main className="flex-1 flex flex-col min-h-0">
        {/* Page 1 — Welcome & Authentication */}
        {step === 'auth' && <AuthPage />}

        {/* Page 2 — Face ID Verification & Enrollment */}
        {(step === 'face-enroll' || step === 'face-verify') && <FaceIdPage />}

        {/* Page 3 — LOQIR AI Assistant */}
        {step === 'assistant' && (
          <ChatPage
            onOpenSettings={() => setShowSettings(true)}
            onOpenBackupPin={() => setShowBackupPin(true)}
          />
        )}
      </main>

      {/* Settings Modal */}
      <SettingsModal
        isOpen={showSettings}
        onClose={() => setShowSettings(false)}
      />

      {/* Backup Security PIN Modal */}
      <BackupPinModal
        isOpen={showBackupPin}
        onClose={() => setShowBackupPin(false)}
      />
    </div>
  );
};

export default function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}
