import React, { useEffect, useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { Hospital } from "lucide-react";
import { getPlatformLogoUrl } from "./DocumentLogo";

export interface SplashScreenLoaderProps {
  isVisible?: boolean;
  minDurationMs?: number;
  onComplete?: () => void;
  logoUrl?: string;
  className?: string;
}

export default function SplashScreenLoader({
  isVisible = true,
  minDurationMs = 1000,
  onComplete,
  logoUrl: propLogoUrl,
  className = ""
}: SplashScreenLoaderProps) {
  const [active, setActive] = useState(() => {
    if (!isVisible) return false;
    if (typeof window !== "undefined") {
      // Check if already displayed in this browser session
      const alreadyShown = sessionStorage.getItem("hmis_splash_loaded");
      if (alreadyShown) return false;
    }
    return true;
  });

  const [imgError, setImgError] = useState(false);
  const logoUrl = propLogoUrl || getPlatformLogoUrl();

  useEffect(() => {
    if (!active) {
      if (onComplete) onComplete();
      return;
    }

    if (typeof window !== "undefined") {
      sessionStorage.setItem("hmis_splash_loaded", "true");
    }

    // Quick, punchy duration so it doesn't block the user from the login page
    const timer = setTimeout(() => {
      setActive(false);
      if (onComplete) onComplete();
    }, minDurationMs);

    return () => clearTimeout(timer);
  }, [active, minDurationMs, onComplete]);

  return (
    <AnimatePresence>
      {active && (
        <motion.div
          id="splash-screen-loader"
          initial={{ opacity: 1 }}
          exit={{ opacity: 0, scale: 1.05 }}
          transition={{ duration: 0.35, ease: "easeInOut" }}
          className={`fixed inset-0 z-[99999] flex items-center justify-center bg-slate-950 select-none overflow-hidden ${className}`}
        >
          {/* Subtle Ambient Radial Glow */}
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-emerald-900/30 via-slate-950/80 to-slate-950 pointer-events-none" />

          {/* Animated Centered Logo Container */}
          <div className="relative flex items-center justify-center">
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
              className="absolute w-44 h-44 sm:w-56 sm:h-56 rounded-full border border-yellow-400/30 bg-yellow-400/5 pointer-events-none"
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
              className="absolute w-44 h-44 sm:w-56 sm:h-56 rounded-full border border-emerald-400/30 bg-emerald-500/5 pointer-events-none"
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

            {/* Main Round Animated Logo (Round exact match to header styling) */}
            <motion.div
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{
                scale: 1,
                opacity: 1,
              }}
              transition={{
                duration: 0.4,
                ease: "easeOut",
              }}
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

                  {/* Specular Light Gleam Sweep Across Logo (Same as Header) */}
                  <div className="absolute inset-0 rounded-full overflow-hidden pointer-events-none z-10">
                    <div className="w-full h-full bg-gradient-to-r from-transparent via-white/50 to-transparent animate-logo-gleam" />
                  </div>
                </div>
              )}
            </motion.div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
