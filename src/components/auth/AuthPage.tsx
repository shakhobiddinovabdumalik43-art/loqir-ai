import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { api } from '../../lib/api';
import { Logo } from '../Logo';
import {
  Lock,
  User as UserIcon,
  Phone,
  Eye,
  EyeOff,
  ShieldCheck,
  Sparkles,
  ArrowRight,
  AlertCircle,
  CheckCircle2,
  FileText,
  ScanFace,
  BrainCircuit,
  Zap,
} from 'lucide-react';

interface CountryCode {
  name: string;
  code: string;
  flag: string;
  placeholder: string;
}

const COUNTRY_CODES: CountryCode[] = [
  { name: 'Uzbekistan', code: '+998', flag: '🇺🇿', placeholder: '901234567' },
  { name: 'United States', code: '+1', flag: '🇺🇸', placeholder: '2025550143' },
  { name: 'United Kingdom', code: '+44', flag: '🇬🇧', placeholder: '7911123456' },
  { name: 'Kazakhstan', code: '+7', flag: '🇰🇿', placeholder: '7012345678' },
  { name: 'Turkey', code: '+90', flag: '🇹🇷', placeholder: '5321234567' },
  { name: 'United Arab Emirates', code: '+971', flag: '🇦🇪', placeholder: '501234567' },
  { name: 'Germany', code: '+49', flag: '🇩🇪', placeholder: '15123456789' },
  { name: 'South Korea', code: '+82', flag: '🇰🇷', placeholder: '1012345678' },
  { name: 'Japan', code: '+81', flag: '🇯🇵', placeholder: '9012345678' },
  { name: 'Saudi Arabia', code: '+966', flag: '🇸🇦', placeholder: '501234567' },
];

export const AuthPage: React.FC = () => {
  const { handleAuthSuccess } = useAuth();
  const [tab, setTab] = useState<'signup' | 'login'>('signup');

  // Form states
  const [fullName, setFullName] = useState('');
  const [countryCode, setCountryCode] = useState('+998');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [consentTerms, setConsentTerms] = useState(false);

  // UI state
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [showTermsModal, setShowTermsModal] = useState(false);

  // Enforce numeric digits only
  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const rawVal = e.target.value;
    // Replace non-digit characters strictly
    const numericOnly = rawVal.replace(/\D/g, '');
    setPhoneNumber(numericOnly);
    if (error) setError(null);
  };

  const currentCountry = COUNTRY_CODES.find((c) => c.code === countryCode) || COUNTRY_CODES[0];

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    if (!fullName.trim() || fullName.trim().length < 2) {
      setError('Please provide your legal or preferred full name (min 2 characters).');
      return;
    }

    if (!phoneNumber || phoneNumber.length < 7 || phoneNumber.length > 15) {
      setError(`Please enter a valid phone number (${currentCountry.placeholder.length} numeric digits).`);
      return;
    }

    if (password.length < 6) {
      setError('Password must contain at least 6 characters.');
      return;
    }

    if (password !== confirmPassword) {
      setError('Passwords do not match. Please re-check both fields.');
      return;
    }

    if (!consentTerms) {
      setError('Please review and accept the LOQIR AI Terms of Service & Biometric Consent.');
      return;
    }

    setLoading(true);
    try {
      const res = await api.register({
        fullName,
        countryCode,
        phoneNumber,
        password,
        confirmPassword,
      });

      setSuccess('Account created! Proceeding to Face ID Biometric Verification...');
      setTimeout(() => {
        handleAuthSuccess(res.user, true);
      }, 700);
    } catch (err: any) {
      setError(err.message || 'Registration failed. Please check your information.');
    } finally {
      setLoading(false);
    }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    if (!phoneNumber) {
      setError('Please enter your phone number.');
      return;
    }

    if (!password) {
      setError('Please enter your password.');
      return;
    }

    setLoading(true);
    try {
      const res = await api.login({
        countryCode,
        phoneNumber,
        password,
      });

      setSuccess(res.message || 'Credentials authenticated. Verifying Face ID...');
      setTimeout(() => {
        handleAuthSuccess(res.user, !!res.requiresFaceVerification);
      }, 700);
    } catch (err: any) {
      setError(err.message || 'Login failed. Invalid phone number or password.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="relative min-h-[calc(100vh-4rem)] flex flex-col justify-center items-center py-12 px-4 sm:px-6 lg:px-8 overflow-hidden bg-[#07090e]">
      {/* Futuristic Background Accents */}
      <div className="absolute top-1/4 -left-36 w-96 h-96 bg-purple-600/15 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-1/4 -right-36 w-96 h-96 bg-cyan-500/15 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute inset-0 bg-[linear-gradient(to_right,#ffffff05_1px,transparent_1px),linear-gradient(to_bottom,#ffffff05_1px,transparent_1px)] bg-[size:48px_48px] pointer-events-none" />

      {/* Main Container */}
      <div className="relative w-full max-w-4xl mx-auto grid grid-cols-1 lg:grid-cols-12 gap-8 items-center z-10">
        {/* Left Column: Brand Hero Presentation */}
        <div className="lg:col-span-6 flex flex-col items-start text-left space-y-6">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/[0.04] border border-cyan-500/30 text-cyan-300 text-xs font-medium">
            <Sparkles className="w-3.5 h-3.5 text-cyan-400 animate-spin" style={{ animationDuration: '6s' }} />
            <span>Next-Generation Neural Artificial Intelligence</span>
          </div>

          <div className="space-y-3">
            <Logo size="xl" />
            <h1 className="text-3xl sm:text-4xl font-extrabold text-white tracking-tight leading-tight">
              Biometric Intelligence,{' '}
              <span className="bg-gradient-to-r from-cyan-400 via-purple-300 to-fuchsia-400 bg-clip-text text-transparent">
                Elevated.
              </span>
            </h1>
            <p className="text-slate-400 text-sm sm:text-base leading-relaxed">
              Experience the frontier of cognitive AI. Secured by real facial biometric verification,
              zero-email phone authentication, and neural reasoning.
            </p>
          </div>

          {/* Core Feature Badges */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 w-full pt-2">
            <div className="flex items-center gap-3 p-3 rounded-xl bg-white/[0.02] border border-white/5 hover:border-purple-500/20 transition-all">
              <div className="w-8 h-8 rounded-lg bg-purple-500/10 flex items-center justify-center text-purple-400">
                <ScanFace className="w-4 h-4" />
              </div>
              <div className="text-xs">
                <p className="font-semibold text-slate-200">Face ID Liveness</p>
                <p className="text-slate-500">Real biometric anti-spoofing</p>
              </div>
            </div>

            <div className="flex items-center gap-3 p-3 rounded-xl bg-white/[0.02] border border-white/5 hover:border-cyan-500/20 transition-all">
              <div className="w-8 h-8 rounded-lg bg-cyan-500/10 flex items-center justify-center text-cyan-400">
                <Phone className="w-4 h-4" />
              </div>
              <div className="text-xs">
                <p className="font-semibold text-slate-200">Phone Auth Only</p>
                <p className="text-slate-500">Zero email requirement</p>
              </div>
            </div>

            <div className="flex items-center gap-3 p-3 rounded-xl bg-white/[0.02] border border-white/5 hover:border-cyan-500/20 transition-all">
              <div className="w-8 h-8 rounded-lg bg-cyan-500/10 flex items-center justify-center text-cyan-400">
                <BrainCircuit className="w-4 h-4" />
              </div>
              <div className="text-xs">
                <p className="font-semibold text-slate-200">Deep Reasoning</p>
                <p className="text-slate-500">Code, math, document analysis</p>
              </div>
            </div>

            <div className="flex items-center gap-3 p-3 rounded-xl bg-white/[0.02] border border-white/5 hover:border-purple-500/20 transition-all">
              <div className="w-8 h-8 rounded-lg bg-purple-500/10 flex items-center justify-center text-purple-400">
                <Zap className="w-4 h-4" />
              </div>
              <div className="text-xs">
                <p className="font-semibold text-slate-200">Streaming Speed</p>
                <p className="text-slate-500">Instant multi-token response</p>
              </div>
            </div>
          </div>
        </div>

        {/* Right Column: Authentication Card */}
        <div className="lg:col-span-6 w-full">
          <div className="backdrop-blur-2xl bg-[#0d111a]/80 border border-white/10 rounded-2xl p-6 sm:p-8 shadow-[0_8px_32px_rgba(0,0,0,0.6)] relative overflow-hidden">
            {/* Top Glowing Edge */}
            <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-purple-500 via-cyan-400 to-purple-600"></div>

            {/* Tab Switcher */}
            <div className="flex rounded-xl bg-black/40 p-1 mb-6 border border-white/5">
              <button
                type="button"
                onClick={() => {
                  setTab('signup');
                  setError(null);
                  setSuccess(null);
                }}
                className={`flex-1 py-2.5 text-xs font-semibold rounded-lg transition-all ${
                  tab === 'signup'
                    ? 'bg-gradient-to-r from-purple-600 to-cyan-600 text-white shadow-md'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                Sign Up
              </button>
              <button
                type="button"
                onClick={() => {
                  setTab('login');
                  setError(null);
                  setSuccess(null);
                }}
                className={`flex-1 py-2.5 text-xs font-semibold rounded-lg transition-all ${
                  tab === 'login'
                    ? 'bg-gradient-to-r from-purple-600 to-cyan-600 text-white shadow-md'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                Log In
              </button>
            </div>

            {/* Feedback Notifications */}
            {error && (
              <div className="mb-4 p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 flex items-start gap-2.5 text-rose-300 text-xs">
                <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5 text-rose-400" />
                <span>{error}</span>
              </div>
            )}
            {success && (
              <div className="mb-4 p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/30 flex items-start gap-2.5 text-emerald-300 text-xs">
                <CheckCircle2 className="w-4 h-4 flex-shrink-0 mt-0.5 text-emerald-400" />
                <span>{success}</span>
              </div>
            )}

            {/* Sign Up Form */}
            {tab === 'signup' && (
              <form onSubmit={handleRegister} className="space-y-4">
                {/* Full Name */}
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1.5">Full Name</label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-500">
                      <UserIcon className="w-4 h-4" />
                    </div>
                    <input
                      type="text"
                      required
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      placeholder="e.g. Jasur Aliyev"
                      className="w-full pl-10 pr-4 py-2.5 bg-black/30 border border-white/10 rounded-xl text-slate-100 placeholder-slate-500 text-sm focus:outline-none focus:border-cyan-400 focus:ring-1 focus:ring-cyan-400 transition-colors"
                    />
                  </div>
                </div>

                {/* Phone Number with Country Code */}
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="block text-xs font-medium text-slate-300">
                      Phone Number <span className="text-[10px] text-cyan-400">(Digits only)</span>
                    </label>
                    <span className="text-[10px] text-slate-500">No email required</span>
                  </div>
                  <div className="flex gap-2">
                    {/* Country Code Dropdown */}
                    <div className="relative w-36 flex-shrink-0">
                      <select
                        value={countryCode}
                        onChange={(e) => setCountryCode(e.target.value)}
                        className="w-full appearance-none pl-3 pr-7 py-2.5 bg-black/40 border border-white/10 rounded-xl text-slate-200 text-xs focus:outline-none focus:border-cyan-400 cursor-pointer"
                      >
                        {COUNTRY_CODES.map((c) => (
                          <option key={c.name} value={c.code} className="bg-[#0d111a] text-slate-200">
                            {c.flag} {c.code} ({c.name})
                          </option>
                        ))}
                      </select>
                      <div className="absolute inset-y-0 right-0 pr-2.5 flex items-center pointer-events-none text-slate-400 text-xs">
                        ▼
                      </div>
                    </div>

                    {/* Numeric Digits Only Input */}
                    <div className="relative flex-1">
                      <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-500">
                        <Phone className="w-4 h-4" />
                      </div>
                      <input
                        type="text"
                        inputMode="numeric"
                        pattern="[0-9]*"
                        required
                        value={phoneNumber}
                        onChange={handlePhoneChange}
                        placeholder={currentCountry.placeholder}
                        className="w-full pl-10 pr-4 py-2.5 bg-black/30 border border-white/10 rounded-xl text-slate-100 placeholder-slate-500 text-sm font-mono focus:outline-none focus:border-cyan-400 focus:ring-1 focus:ring-cyan-400 transition-colors"
                      />
                    </div>
                  </div>
                </div>

                {/* Password */}
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1.5">Password</label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-500">
                      <Lock className="w-4 h-4" />
                    </div>
                    <input
                      type={showPassword ? 'text' : 'password'}
                      required
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="••••••••"
                      className="w-full pl-10 pr-10 py-2.5 bg-black/30 border border-white/10 rounded-xl text-slate-100 placeholder-slate-500 text-sm focus:outline-none focus:border-cyan-400 focus:ring-1 focus:ring-cyan-400 transition-colors"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-slate-400 hover:text-slate-200"
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                {/* Confirm Password */}
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1.5">Confirm Password</label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-500">
                      <Lock className="w-4 h-4" />
                    </div>
                    <input
                      type={showConfirmPassword ? 'text' : 'password'}
                      required
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      placeholder="••••••••"
                      className="w-full pl-10 pr-10 py-2.5 bg-black/30 border border-white/10 rounded-xl text-slate-100 placeholder-slate-500 text-sm focus:outline-none focus:border-cyan-400 focus:ring-1 focus:ring-cyan-400 transition-colors"
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                      className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-slate-400 hover:text-slate-200"
                    >
                      {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                {/* Terms and Privacy Consent */}
                <div className="pt-1">
                  <label className="flex items-start gap-2.5 cursor-pointer text-xs text-slate-300">
                    <input
                      type="checkbox"
                      checked={consentTerms}
                      onChange={(e) => setConsentTerms(e.target.checked)}
                      className="mt-0.5 rounded border-white/20 bg-black/40 text-cyan-500 focus:ring-cyan-400"
                    />
                    <span>
                      I agree to the{' '}
                      <button
                        type="button"
                        onClick={() => setShowTermsModal(true)}
                        className="text-cyan-400 hover:underline inline-flex items-center gap-0.5"
                      >
                        Terms of Service & Biometric Privacy Policy
                      </button>
                    </span>
                  </label>
                </div>

                {/* Submit Sign Up Button */}
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-3 px-4 rounded-xl font-semibold text-sm text-white bg-gradient-to-r from-purple-600 via-indigo-600 to-cyan-500 hover:opacity-95 shadow-[0_0_20px_rgba(147,51,234,0.35)] flex items-center justify-center gap-2 transition-all disabled:opacity-50"
                >
                  {loading ? (
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  ) : (
                    <>
                      <span>Continue to Face ID Setup</span>
                      <ArrowRight className="w-4 h-4" />
                    </>
                  )}
                </button>
              </form>
            )}

            {/* Log In Form */}
            {tab === 'login' && (
              <form onSubmit={handleLogin} className="space-y-4">
                {/* Phone Number */}
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1.5">Registered Phone Number</label>
                  <div className="flex gap-2">
                    <div className="relative w-36 flex-shrink-0">
                      <select
                        value={countryCode}
                        onChange={(e) => setCountryCode(e.target.value)}
                        className="w-full appearance-none pl-3 pr-7 py-2.5 bg-black/40 border border-white/10 rounded-xl text-slate-200 text-xs focus:outline-none focus:border-cyan-400 cursor-pointer"
                      >
                        {COUNTRY_CODES.map((c) => (
                          <option key={c.name} value={c.code} className="bg-[#0d111a] text-slate-200">
                            {c.flag} {c.code} ({c.name})
                          </option>
                        ))}
                      </select>
                      <div className="absolute inset-y-0 right-0 pr-2.5 flex items-center pointer-events-none text-slate-400 text-xs">
                        ▼
                      </div>
                    </div>

                    <div className="relative flex-1">
                      <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-500">
                        <Phone className="w-4 h-4" />
                      </div>
                      <input
                        type="text"
                        inputMode="numeric"
                        pattern="[0-9]*"
                        required
                        value={phoneNumber}
                        onChange={handlePhoneChange}
                        placeholder={currentCountry.placeholder}
                        className="w-full pl-10 pr-4 py-2.5 bg-black/30 border border-white/10 rounded-xl text-slate-100 placeholder-slate-500 text-sm font-mono focus:outline-none focus:border-cyan-400 focus:ring-1 focus:ring-cyan-400 transition-colors"
                      />
                    </div>
                  </div>
                </div>

                {/* Password */}
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="block text-xs font-medium text-slate-300">Password</label>
                  </div>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-500">
                      <Lock className="w-4 h-4" />
                    </div>
                    <input
                      type={showPassword ? 'text' : 'password'}
                      required
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="••••••••"
                      className="w-full pl-10 pr-10 py-2.5 bg-black/30 border border-white/10 rounded-xl text-slate-100 placeholder-slate-500 text-sm focus:outline-none focus:border-cyan-400 focus:ring-1 focus:ring-cyan-400 transition-colors"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-slate-400 hover:text-slate-200"
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                {/* Submit Log In Button */}
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full mt-2 py-3 px-4 rounded-xl font-semibold text-sm text-white bg-gradient-to-r from-purple-600 via-indigo-600 to-cyan-500 hover:opacity-95 shadow-[0_0_20px_rgba(147,51,234,0.35)] flex items-center justify-center gap-2 transition-all disabled:opacity-50"
                >
                  {loading ? (
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  ) : (
                    <>
                      <span>Authenticate & Verify Face ID</span>
                      <ArrowRight className="w-4 h-4" />
                    </>
                  )}
                </button>
              </form>
            )}

            {/* Security Guarantee Note */}
            <div className="mt-6 pt-4 border-t border-white/5 flex items-center justify-between text-[11px] text-slate-400">
              <span className="flex items-center gap-1.5">
                <ShieldCheck className="w-3.5 h-3.5 text-cyan-400" />
                PBKDF2-SHA512 Password Encryption
              </span>
              <span className="text-purple-400">Biometric Guard</span>
            </div>
          </div>
        </div>
      </div>

      {/* Terms & Biometric Privacy Policy Modal */}
      {showTermsModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
          <div className="bg-[#0f1422] border border-white/10 rounded-2xl max-w-lg w-full p-6 text-left space-y-4 shadow-2xl">
            <div className="flex items-center justify-between border-b border-white/10 pb-3">
              <div className="flex items-center gap-2">
                <FileText className="w-5 h-5 text-cyan-400" />
                <h3 className="text-base font-bold text-white">LOQIR AI Biometric Privacy & Terms</h3>
              </div>
              <button
                onClick={() => setShowTermsModal(false)}
                className="text-slate-400 hover:text-white text-lg font-mono"
              >
                ✕
              </button>
            </div>
            <div className="text-xs text-slate-300 space-y-3 max-h-80 overflow-y-auto pr-2">
              <p className="font-semibold text-cyan-300">1. Phone-Only Identity Architecture</p>
              <p>
                LOQIR AI strictly eliminates email-based tracking. Your identity is anchored to your validated phone number
                and encrypted password credentials.
              </p>
              <p className="font-semibold text-cyan-300">2. Facial Biometric Data Protection</p>
              <p>
                Facial verification utilizes mathematical landmark vector descriptors extracted client-side. Raw camera
                footage is processed directly in volatile memory and never broadcasted. Vector descriptors are securely
                hashed and compared to prevent unauthorized access.
              </p>
              <p className="font-semibold text-cyan-300">3. Anti-Spoofing & Liveness Protocol</p>
              <p>
                Access requires verified dynamic physical presence (head movement and micro-expressions). Static photographs
                or recorded media are automatically rejected.
              </p>
              <p className="font-semibold text-cyan-300">4. AI Intelligence Scope</p>
              <p>
                LOQIR AI is a premier analytical, reasoning, and coding intelligence platform. Image generation features are
                deliberately prohibited to maintain absolute focus on computational and factual rigor.
              </p>
            </div>
            <div className="pt-3 border-t border-white/10 flex justify-end">
              <button
                type="button"
                onClick={() => {
                  setConsentTerms(true);
                  setShowTermsModal(false);
                }}
                className="px-4 py-2 bg-gradient-to-r from-purple-600 to-cyan-600 text-white text-xs font-semibold rounded-lg"
              >
                I Understand & Consent
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
