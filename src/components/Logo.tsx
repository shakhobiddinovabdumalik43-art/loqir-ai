import React from 'react';

interface LogoProps {
  size?: 'sm' | 'md' | 'lg' | 'xl';
  showText?: boolean;
  animated?: boolean;
  className?: string;
}

export const Logo: React.FC<LogoProps> = ({
  size = 'md',
  showText = true,
  animated = true,
  className = '',
}) => {
  const iconSizes = {
    sm: 'w-7 h-7',
    md: 'w-9 h-9',
    lg: 'w-12 h-12',
    xl: 'w-16 h-16',
  };

  const textSizes = {
    sm: 'text-base tracking-widest',
    md: 'text-lg tracking-widest',
    lg: 'text-2xl tracking-widest',
    xl: 'text-3xl tracking-widest',
  };

  return (
    <div className={`inline-flex items-center gap-3 select-none ${className}`}>
      {/* Original LOQIR AI Quantum Neural Nexus Emblem */}
      <div className={`relative ${iconSizes[size]} flex items-center justify-center`}>
        {/* Ambient Glow */}
        <div className="absolute inset-0 bg-gradient-to-tr from-purple-600/40 via-cyan-500/30 to-purple-400/40 rounded-xl blur-md"></div>

        {/* SVG Emblem */}
        <svg
          viewBox="0 0 100 100"
          className={`relative w-full h-full drop-shadow-[0_0_12px_rgba(34,211,238,0.4)]`}
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          <defs>
            <linearGradient id="loqirGrad1" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#c084fc" />
              <stop offset="50%" stopColor="#8b5cf6" />
              <stop offset="100%" stopColor="#06b6d4" />
            </linearGradient>
            <linearGradient id="loqirGrad2" x1="100%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#22d3ee" />
              <stop offset="100%" stopColor="#9333ea" />
            </linearGradient>
            <radialGradient id="loqirCore" cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor="#ffffff" />
              <stop offset="40%" stopColor="#38bdf8" />
              <stop offset="100%" stopColor="#7c3aed" stopOpacity="0" />
            </radialGradient>
          </defs>

          {/* Outer Hexagonal Tech Frame */}
          <polygon
            points="50,6 88,28 88,72 50,94 12,72 12,28"
            stroke="url(#loqirGrad1)"
            strokeWidth="3.5"
            strokeLinejoin="round"
            className="opacity-90"
          />

          {/* Inner Inverted Diamond Nexus */}
          <polygon
            points="50,18 78,50 50,82 22,50"
            stroke="url(#loqirGrad2)"
            strokeWidth="2.5"
            strokeLinejoin="round"
            strokeDasharray={animated ? '6,3' : 'none'}
            className="opacity-80"
          />

          {/* Cross Neural Accelerators */}
          <line x1="50" y1="18" x2="50" y2="82" stroke="#22d3ee" strokeWidth="2" strokeOpacity="0.85" />
          <line x1="22" y1="50" x2="78" y2="50" stroke="#a855f7" strokeWidth="2" strokeOpacity="0.85" />

          {/* Quantum Core Singularity */}
          <circle cx="50" cy="50" r="11" fill="url(#loqirCore)" />
          <circle cx="50" cy="50" r="5" fill="#ffffff" />

          {/* Orbit Node Satellite Accents */}
          <circle cx="50" cy="6" r="3" fill="#22d3ee" />
          <circle cx="88" cy="28" r="3" fill="#a855f7" />
          <circle cx="88" cy="72" r="3" fill="#22d3ee" />
          <circle cx="50" cy="94" r="3" fill="#a855f7" />
          <circle cx="12" cy="72" r="3" fill="#22d3ee" />
          <circle cx="12" cy="28" r="3" fill="#a855f7" />
        </svg>
      </div>

      {/* Typography */}
      {showText && (
        <div className="flex flex-col">
          <div className="flex items-center gap-1.5 font-extrabold tracking-wider leading-none">
            <span className={`bg-gradient-to-r from-white via-cyan-200 to-purple-300 bg-clip-text text-transparent font-['Plus_Jakarta_Sans'] ${textSizes[size]}`}>
              LOQIR
            </span>
            <span className="text-[10px] font-bold uppercase px-1.5 py-0.5 rounded bg-gradient-to-r from-purple-600/40 to-cyan-500/40 border border-purple-500/30 text-cyan-300">
              AI
            </span>
          </div>
          {size !== 'sm' && (
            <span className="text-[9px] uppercase tracking-[0.22em] text-slate-400 font-medium mt-1">
              Neural Intelligence
            </span>
          )}
        </div>
      )}
    </div>
  );
};
