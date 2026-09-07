import React, { useEffect, useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { Hospital, Wifi, ShieldCheck, Sparkles } from "lucide-react";
import { getPlatformLogoUrl } from "./DocumentLogo";

export interface SplashScreenLoaderProps {
  isVisible?: boolean;
  minDurationMs?: number;
  onComplete?: () => void;
  logoUrl?: string;
  hospitalName?: string;
  className?: string;
}

export default function SplashScreenLoader({
  isVisible = false,
  minDurationMs = 0,
  onComplete,
  logoUrl: propLogoUrl,
  hospitalName = "The Tassia Hill Hospital",
  className = ""
}: SplashScreenLoaderProps) {
  const [active, setActive] = useState<boolean>(Boolean(isVisible && minDurationMs > 0));
  const [progress, setProgress] = useState<number>(100);
  const [imgError, setImgError] = useState<boolean>(false);
  const logoUrl = propLogoUrl || getPlatformLogoUrl();

  useEffect(() => {
    if (!isVisible || minDurationMs <= 0) {
      setActive(false);
      if (onComplete) onComplete();
      return;
    }

    setActive(true);
    setProgress(0);

    // Progress bar ticker
    const intervalMs = 30;
    const totalSteps = Math.max(1, minDurationMs / intervalMs);
    let currentStep = 0;

    const progressTimer = setInterval(() => {
      currentStep++;
      const pct = Math.min(100, Math.round((currentStep / totalSteps) * 100));
      setProgress(pct);

      if (currentStep >= totalSteps) {
        clearInterval(progressTimer);
      }
    }, intervalMs);

    // Completion timer
    const completeTimer = setTimeout(() => {
      setActive(false);
      if (onComplete) onComplete();
    }, minDurationMs);

    return () => {
      clearInterval(progressTimer);
      clearTimeout(completeTimer);
    };
  }, [isVisible, minDurationMs, onComplete]);

  return (
    <AnimatePresence>
      {active && (
        <motion.div
          id="splash-screen-loader"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0, scale: 1.02 }}
          transition={{ duration: 0.4, ease: "easeInOut" }}
          className={`fixed inset-0 z-[99999] flex flex-col items-center justify-center bg-slate-950 select-none overflow-hidden ${className}`}
        >
          {/* Subtle Ambient Radial Glow */}
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-emerald-950/60 via-slate-950/90 to-slate-950 pointer-events-none" />

          {/* Animated Centered Logo Container */}
          <div className="relative flex flex-col items-center justify-center px-4 max-w-md w-full">
            <div className="relative flex items-center justify-center mb-6">
              {/* Outward Radiating Pulsing Rings */}
              <motion.div
                animate={{
                  scale: [1, 1.45, 1.8],
                  opacity: [0.35, 0.15, 0],
                }}
                transition={{
                  duration: 2.2,
                  repeat: Infinity,
                  ease: "easeOut",
                }}
                className="absolute w-44 h-44 sm:w-52 sm:h-52 rounded-full border border-yellow-400/30 bg-yellow-400/5 pointer-events-none"
              />
              <motion.div
                animate={{
                  scale: [1, 1.6, 2.1],
                  opacity: [0.25, 0.08, 0],
                }}
                transition={{
                  duration: 2.2,
                  delay: 0.6,
                  repeat: Infinity,
                  ease: "easeOut",
                }}
                className="absolute w-44 h-44 sm:w-52 sm:h-52 rounded-full border border-emerald-400/30 bg-emerald-500/5 pointer-events-none"
              />

              {/* Rotating Subtle Gradient Ring */}
              <motion.div
                animate={{ rotate: 360 }}
                transition={{
                  duration: 6,
                  repeat: Infinity,
                  ease: "linear",
                }}
                className="absolute w-36 h-36 sm:w-44 sm:h-44 rounded-full p-[2px] bg-gradient-to-tr from-yellow-400 via-emerald-400 to-transparent shadow-[0_0_25px_rgba(234,179,8,0.3)] pointer-events-none"
              >
                <div className="w-full h-full rounded-full bg-slate-950/90" />
              </motion.div>

              {/* Breathing Ambient Aura */}
              <motion.div
                animate={{
                  scale: [0.95, 1.15, 0.95],
                  opacity: [0.35, 0.75, 0.35],
                }}
                transition={{
                  duration: 2.2,
                  repeat: Infinity,
                  ease: "easeInOut",
                }}
                className="absolute w-32 h-32 sm:w-40 sm:h-40 rounded-full bg-yellow-400/20 blur-xl pointer-events-none"
              />

              {/* Main Round Animated Logo */}
              <motion.div
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ duration: 0.5, ease: "easeOut" }}
                className="relative z-10 p-1.5 sm:p-2 bg-yellow-300 rounded-full shadow-2xl border-2 sm:border-3 border-yellow-500 ring-4 ring-yellow-400/50 flex items-center justify-center w-28 h-28 sm:w-36 sm:h-36 overflow-hidden"
              >
                {imgError || !logoUrl ? (
                  <div className="w-full h-full bg-slate-900 text-white rounded-full flex items-center justify-center overflow-hidden">
                    <Hospital className="w-14 h-14 sm:w-18 sm:h-18 text-yellow-400 animate-logo-image-alive drop-shadow-[0_0_10px_rgba(250,204,21,0.5)]" />
                  </div>
                ) : (
                  <div className="relative w-full h-full rounded-full overflow-hidden flex items-center justify-center bg-slate-900/10">
                    <img
                      src={logoUrl}
                      alt="HMIS Logo"
                      className="w-full h-full object-cover rounded-full shadow-inner animate-logo-image-alive"
                      referrerPolicy="no-referrer"
                      onError={() => setImgError(true)}
                    />

                    {/* Specular Light Gleam Sweep Across Logo */}
                    <div className="absolute inset-0 rounded-full overflow-hidden pointer-events-none z-10">
                      <div className="w-full h-full bg-gradient-to-r from-transparent via-white/50 to-transparent animate-logo-gleam" />
                    </div>
                  </div>
                )}
              </motion.div>
            </div>

            {/* Brand Title & System Description */}
            <motion.div
              initial={{ y: 12, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.2, duration: 0.4 }}
              className="text-center relative z-10 space-y-2 mb-6"
            >
              <h1 className="text-xl sm:text-2xl font-black text-white tracking-wide uppercase drop-shadow-md">
                {hospitalName}
              </h1>
              <p className="text-xs sm:text-sm font-semibold tracking-wider uppercase text-emerald-400">
                Hospital Management Integrated System
              </p>
              <div className="flex items-center justify-center gap-2 pt-1 text-[11px] text-slate-400">
                <span className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-white/5 border border-white/10 text-emerald-300">
                  <Wifi className="w-3 h-3 text-emerald-400" />
                  Offline-Ready PWA
                </span>
                <span className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-white/5 border border-white/10 text-yellow-300">
                  <ShieldCheck className="w-3 h-3 text-yellow-400" />
                  Clinical Grade
                </span>
              </div>
            </motion.div>

            {/* Dynamic Loading Progress Bar */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.3 }}
              className="w-full max-w-xs space-y-1.5"
            >
              <div className="h-1.5 w-full bg-slate-800 rounded-full overflow-hidden p-0.5 border border-slate-700/60 shadow-inner">
                <motion.div
                  className="h-full bg-gradient-to-r from-emerald-500 via-teal-400 to-yellow-400 rounded-full shadow-[0_0_12px_rgba(52,211,153,0.8)]"
                  style={{ width: `${progress}%` }}
                  transition={{ ease: "linear" }}
                />
              </div>
              <div className="flex items-center justify-between text-[10px] text-slate-400 font-mono">
                <span>{progress < 40 ? "Loading clinical cache..." : progress < 80 ? "Initializing offline database..." : "Ready."}</span>
                <span>{progress}%</span>
              </div>
            </motion.div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
