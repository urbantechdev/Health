import React, { useEffect, useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { Volume2, VolumeX, Radio, Sparkles } from "lucide-react";
import { voiceAnnouncer, ActiveAnnouncement } from "../lib/voiceAnnouncementService";

export const VoiceAnnouncementHUD: React.FC = () => {
  const [active, setActive] = useState<ActiveAnnouncement | null>(null);

  useEffect(() => {
    const unsubscribe = voiceAnnouncer.subscribe((announcement) => {
      setActive(announcement);
    });
    return () => unsubscribe();
  }, []);

  return (
    <AnimatePresence>
      {active && (
        <motion.div
          id="voice-announcement-live-hud"
          initial={{ opacity: 0, y: -40, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: -30, scale: 0.96 }}
          transition={{ type: "spring", stiffness: 400, damping: 25 }}
          className="fixed top-4 left-1/2 -translate-x-1/2 z-[99997] max-w-xl w-[92%] sm:w-auto min-w-[340px] pointer-events-auto select-none"
        >
          <div className="relative overflow-hidden bg-slate-950/95 text-white border border-emerald-500/50 rounded-2xl p-3 sm:px-4 sm:py-3 shadow-2xl backdrop-blur-md flex items-center justify-between gap-3 sm:gap-4 ring-2 ring-emerald-500/20">
            {/* Ambient Top Laser Line */}
            <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-emerald-500 via-teal-400 to-indigo-500 animate-pulse" />

            {/* Left: Animated Radio Icon & Live Badge */}
            <div className="flex items-center gap-2.5 shrink-0">
              <div className="w-8 h-8 rounded-xl bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center text-emerald-400 shrink-0">
                <Radio className="w-4 h-4 animate-pulse" />
              </div>

              <div>
                <div className="flex items-center gap-1.5">
                  <span className="inline-block w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
                  <span className="text-[10px] font-black uppercase tracking-widest text-emerald-400">
                    Hospital PA Live
                  </span>
                </div>
                {active.ticketNo && (
                  <div className="text-xs font-mono font-black text-white flex items-center gap-1">
                    <span>Ticket</span>
                    <span className="px-1.5 py-0.2 bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 rounded-md">
                      {active.ticketNo}
                    </span>
                  </div>
                )}
              </div>
            </div>

            {/* Middle: Text Preview & Equalizer Waves */}
            <div className="min-w-0 flex-1 px-1">
              <p className="text-xs font-medium text-slate-200 truncate max-w-[260px] sm:max-w-xs">
                {active.formattedText || (active as any).text}
              </p>
              {active.roomOrDesk && (
                <p className="text-[10px] font-semibold text-emerald-400/90 truncate flex items-center gap-1 mt-0.5">
                  <Sparkles className="w-2.5 h-2.5 text-emerald-400" />
                  <span>Proceed to {active.roomOrDesk}</span>
                </p>
              )}
            </div>

            {/* Audio Wave Visualizer Graphic */}
            <div className="hidden sm:flex items-center gap-0.5 h-5 px-1.5 shrink-0" title="Audio Broadcasting">
              <span className="w-1 bg-emerald-400 rounded-full h-3 animate-pulse" />
              <span className="w-1 bg-teal-400 rounded-full h-5 animate-pulse [animation-delay:150ms]" />
              <span className="w-1 bg-emerald-300 rounded-full h-2 animate-pulse [animation-delay:300ms]" />
              <span className="w-1 bg-emerald-400 rounded-full h-4 animate-pulse [animation-delay:75ms]" />
            </div>

            {/* Right: Stop / Silence Button */}
            <button
              type="button"
              onClick={() => voiceAnnouncer.stop()}
              title="Stop / Silence Announcement"
              className="p-1.5 sm:px-2.5 sm:py-1.5 bg-slate-800/90 hover:bg-rose-900/40 text-slate-400 hover:text-rose-300 border border-slate-700 hover:border-rose-500/50 rounded-xl text-xs font-semibold flex items-center gap-1 transition-all cursor-pointer shrink-0 active:scale-95"
            >
              <VolumeX className="w-3.5 h-3.5" />
              <span className="hidden sm:inline text-[11px]">Stop</span>
            </button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
