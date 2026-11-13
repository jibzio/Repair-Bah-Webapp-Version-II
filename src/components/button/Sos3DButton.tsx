import React, { useCallback, useEffect, useRef, useState } from 'react';

export interface Sos3DButtonProps {
  onClick?: () => void;
  onTrigger?: () => void;
  size?: 'lg' | 'md';
  topLabel?: string;
  centerLabel?: string;
  bottomLabel?: string;
  ariaLabel?: string;
  disabled?: boolean;
}

export const Sos3DButton: React.FC<Sos3DButtonProps> = ({
  onClick,
  onTrigger,
  size = 'lg',
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
    if (disabled) return;
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
        isLarge ? 'w-64 h-64' : 'w-44 h-44'
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
          isLarge ? 'w-44 h-44' : 'w-32 h-32'
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
            isLarge ? 'text-3xl' : 'text-2xl'
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
};
