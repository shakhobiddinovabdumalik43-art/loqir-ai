import React, { useRef, useEffect, useState, useCallback } from 'react';
import { useAuth } from '../../context/AuthContext';
import { api } from '../../lib/api';
import { FaceTracker, FaceDetectionResult } from '../../lib/faceDetector';
import confetti from 'canvas-confetti';
import {
  ScanFace,
  Camera,
  CameraOff,
  ShieldCheck,
  CheckCircle2,
  AlertTriangle,
  KeyRound,
  RotateCcw,
  Sparkles,
  Lock,
  ArrowRight,
  Info,
} from 'lucide-react';

export const FaceIdPage: React.FC = () => {
  const { user, step, handleFaceVerificationSuccess } = useAuth();
  const isEnrolling = !user?.faceEnrolled || step === 'face-enroll';

  // Camera & Tracking refs
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const overlayCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const animationFrameRef = useRef<number | null>(null);
  const trackerRef = useRef<FaceTracker>(new FaceTracker());

  // Component states
  const [cameraActive, setCameraActive] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [consentGiven, setConsentGiven] = useState(true);
  const [detectionResult, setDetectionResult] = useState<FaceDetectionResult | null>(null);
  const [verifying, setVerifying] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string>('Initializing optical biometric sensor...');
  const [verifiedSuccess, setVerifiedSuccess] = useState(false);
  const [verificationError, setVerificationError] = useState<string | null>(null);

  // Fallback PIN modal
  const [showFallbackModal, setShowFallbackModal] = useState(false);
  const [fallbackPinInput, setFallbackPinInput] = useState('');
  const [fallbackError, setFallbackError] = useState<string | null>(null);
  const [fallbackLoading, setFallbackLoading] = useState(false);

  // Sound effect helper (Web Audio API synthetic futuristic chime)
  const playSuccessChime = () => {
    try {
      const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(523.25, audioCtx.currentTime); // C5
      osc.frequency.exponentialRampToValueAtTime(783.99, audioCtx.currentTime + 0.15); // G5
      gain.gain.setValueAtTime(0.15, audioCtx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.35);
      osc.connect(gain);
      gain.connect(audioCtx.destination);
      osc.start();
      osc.stop(audioCtx.currentTime + 0.35);
    } catch (e) {
      // AudioContext may be restricted before user gesture
    }
  };

  // Start Camera Stream
  const startCamera = useCallback(async () => {
    setCameraError(null);
    setVerificationError(null);
    trackerRef.current.reset();

    try {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error('Camera access API is not supported by your browser environment.');
      }

      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          width: { ideal: 640 },
          height: { ideal: 480 },
          facingMode: 'user',
        },
        audio: false,
      });

      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.onloadedmetadata = () => {
          videoRef.current?.play();
          setCameraActive(true);
          setStatusMessage('Optical feed linked. Align face with reticle.');
        };
      }
    } catch (err: any) {
      console.warn('Camera access issue:', err);
      setCameraActive(false);
      if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
        setCameraError('Camera permission was denied. Please allow camera access or use the Security Backup PIN below.');
      } else if (err.name === 'NotFoundError' || err.name === 'DevicesNotFoundError') {
        setCameraError('No camera device detected on this system. Please authenticate using the Security Backup PIN.');
      } else {
        setCameraError(err.message || 'Unable to initialize biometric camera. Fallback authentication is available.');
      }
    }
  }, []);

  // Stop Camera Stream
  const stopCamera = useCallback(() => {
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = null;
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    setCameraActive(false);
  }, []);

  useEffect(() => {
    startCamera();
    return () => {
      stopCamera();
    };
  }, [startCamera, stopCamera]);

  // Submit Biometrics
  const processBiometricPayload = useCallback(
    async (descriptor: number[], livenessScore: number) => {
      if (verifying || verifiedSuccess) return;
      setVerifying(true);
      setStatusMessage('Encrypting biometric descriptor and executing cryptographic verification...');

      try {
        if (isEnrolling) {
          const res = await api.enrollFace(descriptor, livenessScore, true);
          if (res.success) {
            setVerifiedSuccess(true);
            setStatusMessage('Face ID profile successfully enrolled and verified!');
            playSuccessChime();
            confetti({ particleCount: 75, spread: 60, origin: { y: 0.6 } });
            setTimeout(() => {
              stopCamera();
              handleFaceVerificationSuccess();
            }, 1200);
          }
        } else {
          const res = await api.verifyFace(descriptor, livenessScore);
          if (res.success && res.verified) {
            setVerifiedSuccess(true);
            setStatusMessage(`Identity Confirmed! Similarity: ${(res.similarity * 100).toFixed(1)}%`);
            playSuccessChime();
            confetti({ particleCount: 75, spread: 60, origin: { y: 0.6 } });
            setTimeout(() => {
              stopCamera();
              handleFaceVerificationSuccess();
            }, 1200);
          }
        }
      } catch (err: any) {
        setVerificationError(err.message || 'Biometric authentication failed. Please hold still and retry.');
        setStatusMessage('Biometric mismatch or liveness fault. Reposition and retry.');
        trackerRef.current.reset();
      } finally {
        setVerifying(false);
      }
    },
    [isEnrolling, verifying, verifiedSuccess, stopCamera, handleFaceVerificationSuccess]
  );

  // Optical Analysis Loop
  useEffect(() => {
    if (!cameraActive || verifiedSuccess) return;

    let isSubmitting = false;

    const loop = () => {
      if (videoRef.current && canvasRef.current && videoRef.current.readyState >= 2) {
        const result = trackerRef.current.analyze(videoRef.current, canvasRef.current);
        setDetectionResult(result);

        // Draw HUD overlay on overlayCanvasRef
        const overlay = overlayCanvasRef.current;
        if (overlay) {
          const ctx = overlay.getContext('2d');
          if (ctx) {
            overlay.width = videoRef.current.videoWidth || 640;
            overlay.height = videoRef.current.videoHeight || 480;
            ctx.clearRect(0, 0, overlay.width, overlay.height);

            if (result.faceDetected && result.box) {
              const scaleX = overlay.width / 320;
              const scaleY = overlay.height / 240;
              const bx = result.box.x * scaleX;
              const by = result.box.y * scaleY;
              const bw = result.box.width * scaleX;
              const bh = result.box.height * scaleY;

              // Draw biometric corner reticles
              ctx.strokeStyle = result.livenessSteps.movement && result.livenessSteps.blink ? '#10b981' : '#22d3ee';
              ctx.lineWidth = 3;
              const cornerLen = 24;

              // Top-left
              ctx.beginPath();
              ctx.moveTo(bx, by + cornerLen);
              ctx.lineTo(bx, by);
              ctx.lineTo(bx + cornerLen, by);
              ctx.stroke();

              // Top-right
              ctx.beginPath();
              ctx.moveTo(bx + bw - cornerLen, by);
              ctx.lineTo(bx + bw, by);
              ctx.lineTo(bx + bw, by + cornerLen);
              ctx.stroke();

              // Bottom-left
              ctx.beginPath();
              ctx.moveTo(bx, by + bh - cornerLen);
              ctx.lineTo(bx, by + bh);
              ctx.lineTo(bx + cornerLen, by + bh);
              ctx.stroke();

              // Bottom-right
              ctx.beginPath();
              ctx.moveTo(bx + bw - cornerLen, by + bh);
              ctx.lineTo(bx + bw, by + bh);
              ctx.lineTo(bx + bw, by + bh - cornerLen);
              ctx.stroke();
            }
          }
        }

        // Check if all liveness steps are passed and we have a valid vector
        if (
          result.faceDetected &&
          result.descriptor &&
          result.livenessSteps.centered &&
          result.livenessSteps.movement &&
          result.livenessSteps.blink &&
          !isSubmitting &&
          !verifying
        ) {
          isSubmitting = true;
          processBiometricPayload(result.descriptor, result.livenessScore);
        }
      }

      animationFrameRef.current = requestAnimationFrame(loop);
    };

    animationFrameRef.current = requestAnimationFrame(loop);

    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [cameraActive, verifiedSuccess, verifying, processBiometricPayload]);

  // Fallback Backup PIN submit handler
  const handleFallbackSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFallbackError(null);

    if (!fallbackPinInput || fallbackPinInput.trim().length !== 6) {
      setFallbackError('Please enter your 6-digit backup security PIN.');
      return;
    }

    setFallbackLoading(true);
    try {
      const res = await api.fallbackVerify(fallbackPinInput.trim());
      if (res.success && res.verified) {
        stopCamera();
        setShowFallbackModal(false);
        handleFaceVerificationSuccess();
      }
    } catch (err: any) {
      setFallbackError(err.message || 'Invalid security backup PIN.');
    } finally {
      setFallbackLoading(false);
    }
  };

  return (
    <div className="relative min-h-[calc(100vh-4rem)] flex flex-col justify-center items-center py-8 px-4 sm:px-6 lg:px-8 bg-[#07090e] overflow-hidden">
      {/* Background Ambience */}
      <div className="absolute top-1/3 -left-40 w-96 h-96 bg-cyan-600/15 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-1/3 -right-40 w-96 h-96 bg-purple-600/15 rounded-full blur-3xl pointer-events-none" />

      {/* Main Container */}
      <div className="relative w-full max-w-2xl mx-auto space-y-6 z-10">
        {/* Header Title */}
        <div className="text-center space-y-2">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/[0.04] border border-cyan-500/30 text-cyan-300 text-xs font-semibold">
            <ScanFace className="w-4 h-4 text-cyan-400" />
            <span>LOQIR BIOMETRIC PROTOCOL v2.4</span>
          </div>
          <h2 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
            {isEnrolling ? 'Face ID Biometric Enrollment' : 'Face ID Identity Verification'}
          </h2>
          <p className="text-xs sm:text-sm text-slate-400 max-w-lg mx-auto">
            {isEnrolling
              ? 'Enroll your facial landmark signature with dynamic 3D liveness detection to protect your LOQIR AI workspace.'
              : 'Hold still, look into the camera, and follow the liveness prompts to unlock your account.'}
          </p>
        </div>

        {/* Biometric Scanner HUD Card */}
        <div className="backdrop-blur-2xl bg-[#0d111a]/90 border border-white/10 rounded-3xl p-6 sm:p-8 shadow-[0_8px_32px_rgba(0,0,0,0.8)] relative overflow-hidden">
          {/* Top Scanner Status Indicator */}
          <div className="flex items-center justify-between border-b border-white/10 pb-4 mb-4 text-xs">
            <div className="flex items-center gap-2">
              <span
                className={`w-2.5 h-2.5 rounded-full ${
                  verifiedSuccess
                    ? 'bg-emerald-400 animate-ping'
                    : cameraActive
                    ? 'bg-cyan-400 animate-pulse'
                    : 'bg-rose-500'
                }`}
              />
              <span className="font-mono text-slate-300">
                SENSOR: {verifiedSuccess ? 'VERIFIED' : cameraActive ? 'LIVE STREAMING (30 FPS)' : 'OFFLINE'}
              </span>
            </div>
            <div className="flex items-center gap-1.5 text-slate-400">
              <ShieldCheck className="w-3.5 h-3.5 text-purple-400" />
              <span>Vector Hash Encrypted</span>
            </div>
          </div>

          {/* Camera Viewport Area */}
          <div className="relative aspect-[4/3] w-full max-w-md mx-auto rounded-2xl overflow-hidden bg-black/60 border-2 border-white/10 flex items-center justify-center">
            {/* Hidden canvas for processing */}
            <canvas ref={canvasRef} className="hidden" />

            {/* Video Feed */}
            <video
              ref={videoRef}
              playsInline
              autoPlay
              muted
              className={`w-full h-full object-cover transform scale-x-[-1] transition-opacity duration-300 ${
                cameraActive ? 'opacity-90' : 'opacity-0'
              }`}
            />

            {/* HUD Overlay Canvas for Bounding Box */}
            <canvas
              ref={overlayCanvasRef}
              className="absolute inset-0 w-full h-full object-cover pointer-events-none transform scale-x-[-1]"
            />

            {/* Futuristic Scanner Guides & Reticle */}
            {cameraActive && !verifiedSuccess && (
              <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
                {/* Laser scan line sweep */}
                <div className="absolute inset-x-0 h-0.5 bg-gradient-to-r from-transparent via-cyan-400 to-transparent shadow-[0_0_15px_#22d3ee] animate-pulse top-1/4" />

                {/* Central Biometric Ring */}
                <div className="relative w-48 h-56 rounded-[40%] border-2 border-dashed border-cyan-400/40 flex items-center justify-center">
                  <div className="w-44 h-52 rounded-[40%] border border-purple-500/30 animate-pulse" />
                  <div className="absolute top-2 w-3 h-3 border-t-2 border-l-2 border-cyan-400" />
                  <div className="absolute top-2 right-2 w-3 h-3 border-t-2 border-r-2 border-cyan-400" />
                  <div className="absolute bottom-2 left-2 w-3 h-3 border-b-2 border-l-2 border-cyan-400" />
                  <div className="absolute bottom-2 right-2 w-3 h-3 border-b-2 border-r-2 border-cyan-400" />
                </div>
              </div>
            )}

            {/* Success Overlay */}
            {verifiedSuccess && (
              <div className="absolute inset-0 bg-emerald-950/80 backdrop-blur-md flex flex-col items-center justify-center text-center p-6 space-y-3 z-20">
                <div className="w-16 h-16 rounded-full bg-emerald-500/20 border-2 border-emerald-400 flex items-center justify-center text-emerald-400">
                  <CheckCircle2 className="w-10 h-10 animate-bounce" />
                </div>
                <h3 className="text-xl font-bold text-white tracking-wide">
                  {isEnrolling ? 'Face ID Successfully Enrolled!' : 'Identity Verified'}
                </h3>
                <p className="text-xs text-emerald-200">
                  Biometric certificate validated. Redirecting to LOQIR AI Assistant...
                </p>
              </div>
            )}

            {/* Camera Error / Disabled State */}
            {cameraError && !verifiedSuccess && (
              <div className="absolute inset-0 bg-black/90 p-6 flex flex-col items-center justify-center text-center space-y-4 z-20">
                <div className="w-12 h-12 rounded-full bg-rose-500/10 border border-rose-500/30 flex items-center justify-center text-rose-400">
                  <CameraOff className="w-6 h-6" />
                </div>
                <div className="space-y-1">
                  <p className="text-sm font-semibold text-rose-300">Camera Unavailable</p>
                  <p className="text-xs text-slate-400 max-w-xs">{cameraError}</p>
                </div>
                <div className="flex flex-col sm:flex-row gap-2 pt-2">
                  <button
                    onClick={startCamera}
                    className="px-3 py-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-xs text-white flex items-center gap-1.5 transition-colors"
                  >
                    <RotateCcw className="w-3.5 h-3.5" /> Retry Camera
                  </button>
                  <button
                    onClick={() => setShowFallbackModal(true)}
                    className="px-3 py-1.5 rounded-lg bg-gradient-to-r from-purple-600 to-cyan-600 text-xs text-white font-semibold flex items-center gap-1.5 shadow-md"
                  >
                    <KeyRound className="w-3.5 h-3.5" /> Use Security PIN
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Liveness Progress & Dynamic Instructions */}
          <div className="mt-6 space-y-4">
            {/* Live Instructions Banner */}
            <div className="p-3.5 rounded-xl bg-white/[0.03] border border-white/10 flex items-center justify-between text-xs">
              <div className="flex items-center gap-2.5">
                <Sparkles className="w-4 h-4 text-cyan-400 flex-shrink-0" />
                <span className="text-slate-200 font-medium">
                  {detectionResult?.feedback || statusMessage}
                </span>
              </div>
              {verifying && (
                <div className="flex items-center gap-1.5 text-cyan-300 text-[11px] font-mono">
                  <div className="w-3.5 h-3.5 border-2 border-cyan-400 border-t-transparent rounded-full animate-spin" />
                  <span>COMPARING...</span>
                </div>
              )}
            </div>

            {/* Step-by-Step Liveness Verification Checklist */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 text-xs">
              {/* Step 1: Center Face */}
              <div
                className={`p-2.5 rounded-xl border flex items-center gap-2 transition-all ${
                  detectionResult?.livenessSteps.centered
                    ? 'bg-emerald-500/10 border-emerald-500/40 text-emerald-300'
                    : 'bg-white/[0.02] border-white/5 text-slate-400'
                }`}
              >
                <div
                  className={`w-5 h-5 rounded-md flex items-center justify-center text-[10px] font-bold ${
                    detectionResult?.livenessSteps.centered
                      ? 'bg-emerald-500 text-black'
                      : 'bg-white/10 text-slate-400'
                  }`}
                >
                  {detectionResult?.livenessSteps.centered ? '✓' : '1'}
                </div>
                <span>Face Centered</span>
              </div>

              {/* Step 2: Head Movement Parallax */}
              <div
                className={`p-2.5 rounded-xl border flex items-center gap-2 transition-all ${
                  detectionResult?.livenessSteps.movement
                    ? 'bg-emerald-500/10 border-emerald-500/40 text-emerald-300'
                    : 'bg-white/[0.02] border-white/5 text-slate-400'
                }`}
              >
                <div
                  className={`w-5 h-5 rounded-md flex items-center justify-center text-[10px] font-bold ${
                    detectionResult?.livenessSteps.movement
                      ? 'bg-emerald-500 text-black'
                      : 'bg-white/10 text-slate-400'
                  }`}
                >
                  {detectionResult?.livenessSteps.movement ? '✓' : '2'}
                </div>
                <span>3D Parallax Movement</span>
              </div>

              {/* Step 3: Natural Blink / Expression */}
              <div
                className={`p-2.5 rounded-xl border flex items-center gap-2 transition-all ${
                  detectionResult?.livenessSteps.blink
                    ? 'bg-emerald-500/10 border-emerald-500/40 text-emerald-300'
                    : 'bg-white/[0.02] border-white/5 text-slate-400'
                }`}
              >
                <div
                  className={`w-5 h-5 rounded-md flex items-center justify-center text-[10px] font-bold ${
                    detectionResult?.livenessSteps.blink
                      ? 'bg-emerald-500 text-black'
                      : 'bg-white/10 text-slate-400'
                  }`}
                >
                  {detectionResult?.livenessSteps.blink ? '✓' : '3'}
                </div>
                <span>Micro-Blink Verified</span>
              </div>
            </div>

            {/* Error Notification if Biometrics Mismatched */}
            {verificationError && (
              <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 flex items-start gap-2.5 text-rose-300 text-xs">
                <AlertTriangle className="w-4 h-4 flex-shrink-0 mt-0.5 text-rose-400" />
                <div>
                  <p className="font-semibold">{verificationError}</p>
                  <p className="text-slate-400 mt-0.5">
                    Tip: Ensure good front lighting. If verification continues to fail, use your 6-digit backup security PIN.
                  </p>
                </div>
              </div>
            )}

            {/* Alternative Fallback Trigger Button */}
            <div className="pt-2 flex items-center justify-between text-xs text-slate-400 border-t border-white/5">
              <span className="flex items-center gap-1.5">
                <Info className="w-3.5 h-3.5 text-cyan-400" />
                Anti-Spoofing: Static photos or videos are rejected.
              </span>
              <button
                type="button"
                onClick={() => setShowFallbackModal(true)}
                className="text-cyan-400 hover:text-cyan-300 underline font-medium"
              >
                Use Security PIN Fallback
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Alternative Fallback Authentication Modal */}
      {showFallbackModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md">
          <div className="bg-[#0f1422] border border-white/10 rounded-2xl max-w-md w-full p-6 text-left space-y-4 shadow-2xl">
            <div className="flex items-center justify-between border-b border-white/10 pb-3">
              <div className="flex items-center gap-2">
                <KeyRound className="w-5 h-5 text-purple-400" />
                <h3 className="text-base font-bold text-white">Alternative Security PIN</h3>
              </div>
              <button
                onClick={() => setShowFallbackModal(false)}
                className="text-slate-400 hover:text-white text-lg font-mono"
              >
                ✕
              </button>
            </div>

            <p className="text-xs text-slate-300 leading-relaxed">
              If camera access is restricted or unavailable on this device, enter the 6-digit Security Backup PIN assigned
              to your account during registration.
            </p>

            {/* Hint for testing / convenience */}
            {user?.backupPin && (
              <div className="p-2.5 rounded-lg bg-cyan-950/40 border border-cyan-500/30 text-[11px] text-cyan-300 flex items-center justify-between">
                <span>Your Account Backup PIN:</span>
                <span className="font-mono font-bold tracking-widest text-white px-2 py-0.5 bg-cyan-500/20 rounded">
                  {user.backupPin}
                </span>
              </div>
            )}

            {fallbackError && (
              <div className="p-2.5 rounded-lg bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs">
                {fallbackError}
              </div>
            )}

            <form onSubmit={handleFallbackSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">6-Digit Backup PIN</label>
                <input
                  type="text"
                  maxLength={6}
                  inputMode="numeric"
                  pattern="[0-9]*"
                  value={fallbackPinInput}
                  onChange={(e) => setFallbackPinInput(e.target.value.replace(/\D/g, ''))}
                  placeholder="e.g. 123456"
                  className="w-full px-4 py-2.5 bg-black/40 border border-white/10 rounded-xl text-center text-lg font-mono tracking-[0.3em] text-white focus:outline-none focus:border-cyan-400"
                />
              </div>

              <div className="flex items-center gap-2 justify-end pt-2">
                <button
                  type="button"
                  onClick={() => setShowFallbackModal(false)}
                  className="px-3.5 py-2 rounded-lg bg-white/10 hover:bg-white/15 text-xs text-slate-300"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={fallbackLoading || fallbackPinInput.length !== 6}
                  className="px-4 py-2 rounded-lg bg-gradient-to-r from-purple-600 to-cyan-600 text-xs font-semibold text-white shadow-md disabled:opacity-50 flex items-center gap-1.5"
                >
                  {fallbackLoading ? (
                    <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  ) : (
                    <>
                      <span>Authorize Access</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
