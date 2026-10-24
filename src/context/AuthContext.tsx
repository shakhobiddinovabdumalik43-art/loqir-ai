import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { User, AppSettings } from '../types';
import { api } from '../lib/api';

export type AppFlowStep = 'auth' | 'face-enroll' | 'face-verify' | 'assistant';

interface AuthContextType {
  user: User | null;
  loading: boolean;
  step: AppFlowStep;
  settings: AppSettings;
  setStep: (step: AppFlowStep) => void;
  setUser: (user: User | null) => void;
  setSettings: React.Dispatch<React.SetStateAction<AppSettings>>;
  toggleTheme: () => void;
  logout: () => Promise<void>;
  handleAuthSuccess: (user: User, requiresFaceVerification: boolean) => void;
  handleFaceVerificationSuccess: () => void;
}

const defaultSettings: AppSettings = {
  theme: 'dark',
  temperature: 0.7,
  persona: 'General High-Performance Assistant',
  speechSpeed: 1.0,
  language: 'English',
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [step, setStep] = useState<AppFlowStep>('auth');
  const [settings, setSettings] = useState<AppSettings>(() => {
    const saved = localStorage.getItem('loqir_settings');
    if (saved) {
      try {
        return { ...defaultSettings, ...JSON.parse(saved) };
      } catch (e) {
        // use default
      }
    }
    return defaultSettings;
  });

  useEffect(() => {
    localStorage.setItem('loqir_settings', JSON.stringify(settings));
    if (settings.theme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [settings]);

  useEffect(() => {
    async function checkCurrentSession() {
      const token = api.getToken();
      if (!token) {
        setLoading(false);
        setStep('auth');
        return;
      }

      try {
        const { user: currentUser, verified } = await api.getCurrentUser();
        setUser(currentUser);
        if (verified) {
          setStep('assistant');
        } else if (currentUser.faceEnrolled) {
          setStep('face-verify');
        } else {
          setStep('face-enroll');
        }
      } catch (err) {
        api.clearToken();
        setUser(null);
        setStep('auth');
      } finally {
        setLoading(false);
      }
    }

    checkCurrentSession();
  }, []);

  const handleAuthSuccess = (authUser: User, requiresFaceVerification: boolean) => {
    setUser(authUser);
    if (!authUser.faceEnrolled) {
      setStep('face-enroll');
    } else if (requiresFaceVerification) {
      setStep('face-verify');
    } else {
      setStep('assistant');
    }
  };

  const handleFaceVerificationSuccess = () => {
    if (user) {
      setUser({ ...user, faceEnrolled: true });
    }
    setStep('assistant');
  };

  const toggleTheme = () => {
    setSettings((prev) => ({
      ...prev,
      theme: prev.theme === 'dark' ? 'light' : 'dark',
    }));
  };

  const logout = async () => {
    try {
      await api.logout();
    } catch (e) {
      // ignore
    }
    setUser(null);
    setStep('auth');
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        step,
        settings,
        setStep,
        setUser,
        setSettings,
        toggleTheme,
        logout,
        handleAuthSuccess,
        handleFaceVerificationSuccess,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
