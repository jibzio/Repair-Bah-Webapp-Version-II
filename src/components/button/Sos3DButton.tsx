import React, { useCallback, useEffect, useRef, useState } from 'react';

export interface Sos3DButtonProps {
  onClick?: () => void;
  onTrigger?: () => void;
  mode?: 'hold' | 'tap';
  size?: 'lg' | 'md';
  label?: string;
  topLabel?: string;
  centerLabel?: string;
  bottomLabel?: string;
  ariaLabel?: string;
  disabled?: boolean;
}

export const Sos3DButton: React.FC<Sos3DButtonProps> = ({
  onClick,
  onTrigger,
  mode = 'tap',
  size = 'md',
  label,
  topLabel = 'HOLD FOR',
  centerLabel = '((SOS))',
  bottomLabel = 'RESCUE',
  ariaLabel,
  disabled = false,
}) => {
  const [progress, setProgress] = useState(0);
  const [holding, setHolding] = useState(false);
  const rafRef = useRef<number | null>(null);
  const startRef = useRef<number>(0);
  const triggeredRef = useRef(false);

  const fireAction = useCallback(() => {
    if (disabled) return;
    if (typeof navigator !== 'undefined' && navigator.vibrate) {
      navigator.vibrate([120, 60, 200]);
    }
    onTrigger?.();
    onClick?.();
  }, [disabled, onClick, onTrigger]);

  const stopHold = useCallback(() => {
    setHolding(false);
    if (rafRef.current) {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    }
    if (!triggeredRef.current) {
      setProgress(0);
    }
  }, []);

  const startHold = (e: React.PointerEvent) => {
    if (mode !== 'hold' || disabled) return;
    e.preventDefault();
    if (triggeredRef.current) return;
    setHolding(true);
    startRef.current = performance.now();

    const step = (now: number) => {
      const elapsed = now - startRef.current;
      const pct = Math.min(100, (elapsed / 2500) * 100);
      setProgress(pct);
      if (pct >= 100) {
        triggeredRef.current = true;
        setHolding(false);
        fireAction();
        setTimeout(() => {
          triggeredRef.current = false;
          setProgress(0);
        }, 400);
        return;
      }
      rafRef.current = requestAnimationFrame(step);
    };
    rafRef.current = requestAnimationFrame(step);
  };

  useEffect(() => {
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, []);

  const isLarge = size === 'lg';
  const radius = 104;
  const circumference = 2 * Math.PI * radius;
  const dashOffset = circumference - (progress / 100) * circumference;

  if (mode === 'hold') {
    return (
      <div
        onPointerDown={startHold}
        onPointerUp={stopHold}
        onPointerLeave={stopHold}
        onPointerCancel={stopHold}
        role="button"
        tabIndex={0}
        aria-label={ariaLabel || 'Hold 2.5 seconds for SOS Rescue'}
        className={`relative ${
          isLarge ? 'w-64 h-64' : 'w-36 h-36'
        } rounded-full flex items-center justify-center select-none touch-none cursor-pointer transition-transform duration-150 ${
          holding ? 'scale-95' : 'scale-100'
        }`}
      >
        <div className="absolute inset-0 rounded-full bg-red-600/10 border border-red-500/20 animate-ping [animation-duration:3s]" />
        <div className="absolute inset-3 rounded-full bg-red-950/40 border border-red-500/30" />
        <div className="absolute inset-6 rounded-full bg-red-950/60 border border-red-500/40" />

        <svg
          className="absolute inset-0 w-full h-full -rotate-90 pointer-events-none"
          viewBox="0 0 240 240"
        >
          <circle
            cx="120"
            cy="120"
            r={radius}
            fill="none"
            stroke="rgba(239,68,68,0.18)"
            strokeWidth="8"
          />
          <circle
            cx="120"
            cy="120"
            r={radius}
            fill="none"
            stroke="#EF4444"
            strokeWidth="8"
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={dashOffset}
          />
        </svg>

        <div
          className={`relative ${
            isLarge ? 'w-44 h-44' : 'w-24 h-24'
          } rounded-full flex flex-col items-center justify-center text-white shadow-[0_0_55px_rgba(220,38,38,0.65)] border-2 border-red-400/50`}
          style={{
            background:
              'radial-gradient(circle at 35% 30%, #EF4444 0%, #DC2626 52%, #7F1D1D 100%)',
          }}
        >
          <span className="text-[11px] font-extrabold tracking-[0.22em] text-red-100">
            {topLabel}
          </span>
          <span
            className={`${
              isLarge ? 'text-3xl' : 'text-xl'
            } font-black tracking-tight my-0.5 drop-shadow`}
          >
            {centerLabel}
          </span>
          <span className="text-[11px] font-extrabold tracking-[0.22em] text-red-100">
            {bottomLabel}
          </span>
          {holding && (
            <span className="mt-1.5 text-[10px] font-mono bg-black/40 px-2 py-0.5 rounded-full">
              {Math.round(progress)}%
            </span>
          )}
        </div>
      </div>
    );
  }

  return (
    <button
      type="button"
      disabled={disabled}
      onClick={fireAction}
      aria-label={ariaLabel || label || 'Confirm SOS Rescue'}
      className="w-full flex items-center justify-center gap-4 py-1.5 px-2 rounded-2xl active:scale-[0.98] transition-transform disabled:opacity-60 group"
    >
      <div className="relative w-24 h-24 shrink-0 rounded-full flex items-center justify-center select-none">
        <div className="absolute inset-0 rounded-full bg-red-600/15 border border-red-500/25 animate-ping [animation-duration:2.6s]" />
        <div className="absolute inset-1.5 rounded-full bg-red-950/45 border border-red-500/35" />
        <div className="absolute inset-3 rounded-full bg-red-950/65 border border-red-500/45" />
        <div
          className="relative w-16 h-16 rounded-full flex flex-col items-center justify-center text-white shadow-[0_0_32px_rgba(220,38,38,0.7)] border-2 border-red-400/60 group-hover:brightness-110 transition-all"
          style={{
            background:
              'radial-gradient(circle at 35% 30%, #EF4444 0%, #DC2626 52%, #7F1D1D 100%)',
          }}
        >
          <span className="text-[8px] font-extrabold tracking-[0.16em] text-red-100">
            {topLabel}
          </span>
          <span className="text-sm font-black tracking-tight drop-shadow leading-none my-0.5">
            {centerLabel}
          </span>
          <span className="text-[8px] font-extrabold tracking-[0.14em] text-red-100">
            {bottomLabel}
          </span>
        </div>
      </div>

      {label && (
        <div className="flex-1 text-left px-3.5 py-3 rounded-2xl border border-red-500/50 bg-gradient-to-r from-[#58151C] via-[#431117] to-[#2B0C11] shadow-[0_8px_24px_rgba(220,38,38,0.28)]">
          <div className="text-[10px] font-black uppercase tracking-[0.14em] text-red-300">
            TAP 3D SOS TO DISPATCH
          </div>
          <div className="text-xs font-black text-white mt-0.5 leading-snug">
            {label}
          </div>
        </div>
      )}
    </button>
  );
};
