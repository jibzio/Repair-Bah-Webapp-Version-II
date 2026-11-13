import React, { useEffect, useState } from 'react';
import { motion } from 'motion/react';

export interface SplashScreenProps {
  onComplete: () => void;
}

export const SplashScreen: React.FC<SplashScreenProps> = ({ onComplete }) => {
  const [fading, setFading] = useState(false);

  useEffect(() => {
    const fadeTimer = setTimeout(() => {
      setFading(true);
    }, 1150);
    const doneTimer = setTimeout(() => {
      onComplete();
    }, 1400);

    return () => {
      clearTimeout(fadeTimer);
      clearTimeout(doneTimer);
    };
  }, [onComplete]);

  return (
    <motion.div
      initial={{ opacity: 1 }}
      animate={{ opacity: fading ? 0 : 1 }}
      transition={{ duration: 0.25, ease: 'easeOut' }}
      aria-label="RepairBah Sabah Launching"
      className="absolute inset-0 z-[100] bg-[#0B0F17] text-white flex flex-col items-center justify-between px-8 py-14 select-none"
    >
      <div className="w-full flex justify-center">
        <span className="text-[11px] font-mono tracking-[0.2em] text-slate-500">
          KOTA KINABALU · SABAH
        </span>
      </div>

      <div className="flex flex-col items-center text-center">
        <div className="relative w-32 h-32 flex items-center justify-center mb-8">
          <span className="absolute inset-0 rounded-full border border-red-600/35 animate-ping [animation-duration:1.8s]" />
          <span className="absolute inset-2 rounded-full border border-red-600/25" />
          <div className="relative w-24 h-24 rounded-3xl bg-[#141923] border border-[#232936] flex items-center justify-center shadow-[0_0_48px_rgba(220,38,38,0.28)]">
            <svg
              viewBox="0 0 64 64"
              className="w-14 h-14"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
              aria-hidden="true"
            >
              <path
                d="M32 6L52 14V30C52 43.2 43.4 53.6 32 58C20.6 53.6 12 43.2 12 30V14L32 6Z"
                fill="#181C24"
                stroke="#DC2626"
                strokeWidth="2.5"
                strokeLinejoin="round"
              />
              <circle
                cx="32"
                cy="31"
                r="11"
                stroke="#F8FAFC"
                strokeWidth="2"
                strokeDasharray="4 3"
              />
              <circle cx="32" cy="31" r="4.5" fill="#DC2626" />
              <path
                d="M32 15V21M32 41V47M16 31H22M42 31H48"
                stroke="#DC2626"
                strokeWidth="2.5"
                strokeLinecap="round"
              />
            </svg>
          </div>
        </div>

        <h1 className="text-3xl font-extrabold tracking-[0.14em] text-white">
          REPAIR-BAH
        </h1>
        <p className="mt-2.5 text-[11px] font-semibold tracking-[0.24em] text-slate-400">
          SABAH ROADSIDE &amp; WORKSHOP NETWORK
        </p>
      </div>

      <div className="w-full max-w-[240px] space-y-2.5">
        <div className="h-1 w-full rounded-full bg-[#181C24] overflow-hidden border border-[#232936]">
          <motion.div
            initial={{ scaleX: 0 }}
            animate={{ scaleX: 1 }}
            transition={{ duration: 1.25, ease: [0.16, 1, 0.3, 1] }}
            style={{ transformOrigin: 'left' }}
            className="h-full w-full bg-[#DC2626]"
          />
        </div>
        <div className="text-center text-[11px] font-mono text-slate-500">
          Initializing dispatch &amp; telemetry
        </div>
      </div>
    </motion.div>
  );
};
