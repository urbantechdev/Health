import React, { useEffect, useState, useRef } from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  X,
  ArrowRight,
  CornerDownLeft,
  Sparkles,
  Check,
  Copy,
  ChevronDown,
  ChevronUp,
  Ticket,
  ExternalLink,
} from "lucide-react";
import {
  promptService,
  ToastNotification,
  ModalPromptConfig,
  PromptType,
} from "../lib/promptService";

/* ========================================================================== */
/* ANIMATED SVG MICRO-ICONS (SMOOTH PATH DRAWING & SPRING PHYSICS)           */
/* ========================================================================== */

// 1. Animated Success Green Tick
export const AnimatedSuccessTick: React.FC<{ size?: "sm" | "md" | "lg" }> = ({ size = "md" }) => {
  const dim = size === "lg" ? "w-16 h-16" : size === "sm" ? "w-9 h-9" : "w-13 h-13";
  const iconSize = size === "lg" ? "w-9 h-9" : size === "sm" ? "w-5 h-5" : "w-7 h-7";

  return (
    <div className={`relative flex items-center justify-center shrink-0 ${dim}`}>
      {/* Outer Pulse Wave */}
      <motion.div
        initial={{ scale: 0.7, opacity: 0.8 }}
        animate={{ scale: [1, 1.35, 1.1], opacity: [0.8, 0, 0] }}
        transition={{ duration: 1.5, repeat: Infinity, ease: "easeOut" }}
        className="absolute inset-0 rounded-full bg-emerald-500/30 blur-xs"
      />
      {/* Central Glowing Orb */}
      <motion.div
        initial={{ scale: 0, rotate: -35 }}
        animate={{ scale: 1, rotate: 0 }}
        transition={{ type: "spring", stiffness: 400, damping: 22 }}
        className={`relative ${dim} rounded-full bg-gradient-to-tr from-emerald-600 via-teal-500 to-emerald-400 p-0.5 shadow-[0_0_25px_rgba(16,185,129,0.55)] flex items-center justify-center`}
      >
        <div className="w-full h-full rounded-full bg-slate-950/80 backdrop-blur-md flex items-center justify-center">
          <svg
            className={`${iconSize} text-emerald-400 drop-shadow-[0_0_8px_rgba(52,211,153,0.8)]`}
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="3.2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            {/* Animated Checkmark Path */}
            <motion.path
              d="M4.5 12.75l6 6 9-13.5"
              initial={{ pathLength: 0, opacity: 0 }}
              animate={{ pathLength: 1, opacity: 1 }}
              transition={{ duration: 0.45, ease: "easeOut", delay: 0.12 }}
            />
          </svg>
        </div>
      </motion.div>
    </div>
  );
};

// 2. Animated Red Error Cross (X)
export const AnimatedErrorCross: React.FC<{ size?: "sm" | "md" | "lg" }> = ({ size = "md" }) => {
  const dim = size === "lg" ? "w-16 h-16" : size === "sm" ? "w-9 h-9" : "w-13 h-13";
  const iconSize = size === "lg" ? "w-8 h-8" : size === "sm" ? "w-5 h-5" : "w-7 h-7";

  return (
    <div className={`relative flex items-center justify-center shrink-0 ${dim}`}>
      {/* Outer Pulse Wave */}
      <motion.div
        initial={{ scale: 0.7, opacity: 0.8 }}
        animate={{ scale: [1, 1.35, 1.1], opacity: [0.8, 0, 0] }}
        transition={{ duration: 1.5, repeat: Infinity, ease: "easeOut" }}
        className="absolute inset-0 rounded-full bg-rose-500/30 blur-xs"
      />
      {/* Central Glowing Orb with Shake */}
      <motion.div
        initial={{ scale: 0, x: 0 }}
        animate={{
          scale: 1,
          x: [0, -4, 4, -3, 3, 0],
        }}
        transition={{
          scale: { type: "spring", stiffness: 450, damping: 20 },
          x: { duration: 0.4, delay: 0.1 },
        }}
        className={`relative ${dim} rounded-full bg-gradient-to-tr from-rose-600 via-red-500 to-rose-400 p-0.5 shadow-[0_0_25px_rgba(244,63,94,0.55)] flex items-center justify-center`}
      >
        <div className="w-full h-full rounded-full bg-slate-950/80 backdrop-blur-md flex items-center justify-center">
          <svg
            className={`${iconSize} text-rose-400 drop-shadow-[0_0_8px_rgba(251,113,133,0.8)]`}
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="3.2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            {/* Animated First Cross Line */}
            <motion.path
              d="M18 6L6 18"
              initial={{ pathLength: 0, opacity: 0 }}
              animate={{ pathLength: 1, opacity: 1 }}
              transition={{ duration: 0.28, ease: "easeOut", delay: 0.1 }}
            />
            {/* Animated Second Cross Line */}
            <motion.path
              d="M6 6l12 12"
              initial={{ pathLength: 0, opacity: 0 }}
              animate={{ pathLength: 1, opacity: 1 }}
              transition={{ duration: 0.28, ease: "easeOut", delay: 0.22 }}
            />
          </svg>
        </div>
      </motion.div>
    </div>
  );
};

// 3. Animated Warning Exclamation
export const AnimatedWarningTriangle: React.FC<{ size?: "sm" | "md" | "lg" }> = ({ size = "md" }) => {
  const dim = size === "lg" ? "w-16 h-16" : size === "sm" ? "w-9 h-9" : "w-13 h-13";
  const iconSize = size === "lg" ? "w-8 h-8" : size === "sm" ? "w-5 h-5" : "w-7 h-7";

  return (
    <div className={`relative flex items-center justify-center shrink-0 ${dim}`}>
      <motion.div
        initial={{ scale: 0.7, opacity: 0.8 }}
        animate={{ scale: [1, 1.35, 1.1], opacity: [0.8, 0, 0] }}
        transition={{ duration: 1.5, repeat: Infinity, ease: "easeOut" }}
        className="absolute inset-0 rounded-full bg-amber-500/30 blur-xs"
      />
      <motion.div
        initial={{ scale: 0, y: -10 }}
        animate={{ scale: 1, y: 0 }}
        transition={{ type: "spring", stiffness: 400, damping: 20 }}
        className={`relative ${dim} rounded-full bg-gradient-to-tr from-amber-600 via-yellow-500 to-amber-400 p-0.5 shadow-[0_0_25px_rgba(245,158,11,0.55)] flex items-center justify-center`}
      >
        <div className="w-full h-full rounded-full bg-slate-950/80 backdrop-blur-md flex items-center justify-center">
          <svg
            className={`${iconSize} text-amber-400 drop-shadow-[0_0_8px_rgba(251,191,36,0.8)]`}
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="3"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <motion.path
              d="M12 9v4"
              initial={{ pathLength: 0, opacity: 0 }}
              animate={{ pathLength: 1, opacity: 1 }}
              transition={{ duration: 0.3, ease: "easeOut", delay: 0.15 }}
            />
            <motion.path
              d="M12 17h.01"
              initial={{ scale: 0, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ duration: 0.2, ease: "easeOut", delay: 0.35 }}
            />
          </svg>
        </div>
      </motion.div>
    </div>
  );
};

// 4. Animated Info / Question Icon
export const AnimatedInfoIcon: React.FC<{ size?: "sm" | "md" | "lg"; isQuestion?: boolean }> = ({
  size = "md",
  isQuestion = false,
}) => {
  const dim = size === "lg" ? "w-16 h-16" : size === "sm" ? "w-9 h-9" : "w-13 h-13";
  const iconSize = size === "lg" ? "w-8 h-8" : size === "sm" ? "w-5 h-5" : "w-7 h-7";

  return (
    <div className={`relative flex items-center justify-center shrink-0 ${dim}`}>
      <motion.div
        initial={{ scale: 0.7, opacity: 0.8 }}
        animate={{ scale: [1, 1.35, 1.1], opacity: [0.8, 0, 0] }}
        transition={{ duration: 1.5, repeat: Infinity, ease: "easeOut" }}
        className="absolute inset-0 rounded-full bg-sky-500/30 blur-xs"
      />
      <motion.div
        initial={{ scale: 0, rotate: 20 }}
        animate={{ scale: 1, rotate: 0 }}
        transition={{ type: "spring", stiffness: 400, damping: 20 }}
        className={`relative ${dim} rounded-full bg-gradient-to-tr from-sky-600 via-indigo-500 to-cyan-400 p-0.5 shadow-[0_0_25px_rgba(14,165,233,0.55)] flex items-center justify-center`}
      >
        <div className="w-full h-full rounded-full bg-slate-950/80 backdrop-blur-md flex items-center justify-center">
          <svg
            className={`${iconSize} text-sky-400 drop-shadow-[0_0_8px_rgba(56,189,248,0.8)]`}
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="3"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            {isQuestion ? (
              <>
                <motion.path
                  d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"
                  initial={{ pathLength: 0, opacity: 0 }}
                  animate={{ pathLength: 1, opacity: 1 }}
                  transition={{ duration: 0.4, ease: "easeOut", delay: 0.15 }}
                />
                <motion.path
                  d="M12 17h.01"
                  initial={{ scale: 0, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  transition={{ duration: 0.2, ease: "easeOut", delay: 0.35 }}
                />
              </>
            ) : (
              <>
                <motion.path
                  d="M12 8v4"
                  initial={{ pathLength: 0, opacity: 0 }}
                  animate={{ pathLength: 1, opacity: 1 }}
                  transition={{ duration: 0.3, ease: "easeOut", delay: 0.15 }}
                />
                <motion.path
                  d="M12 16h.01"
                  initial={{ scale: 0, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  transition={{ duration: 0.2, ease: "easeOut", delay: 0.35 }}
                />
              </>
            )}
          </svg>
        </div>
      </motion.div>
    </div>
  );
};

/* ========================================================================== */
/* MAIN MODERN NOTIFICATION & POPUP PROMPT HOST COMPONENT                    */
/* ========================================================================== */

export const ModernPromptHost: React.FC = () => {
  const [toasts, setToasts] = useState<ToastNotification[]>([]);
  const [activeModal, setActiveModal] = useState<ModalPromptConfig | null>(null);
  const [inputVal, setInputVal] = useState<string>("");
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [expandedDetailsId, setExpandedDetailsId] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement | HTMLTextAreaElement | null>(null);

  // Subscribe to toast and modal prompt updates
  useEffect(() => {
    const unsubToasts = promptService.subscribeToasts(setToasts);
    const unsubModal = promptService.subscribeModalPrompt((modal) => {
      setActiveModal(modal);
      if (modal && modal.inputMode) {
        setInputVal(modal.inputValue || "");
      }
    });

    return () => {
      unsubToasts();
      unsubModal();
    };
  }, []);

  // Autofocus input in modal prompts
  useEffect(() => {
    if (activeModal?.inputMode) {
      const timer = setTimeout(() => {
        inputRef.current?.focus();
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [activeModal]);

  // Handle ESC and Enter keys
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        if (activeModal) {
          promptService.dismissModal(activeModal.inputMode ? null : false);
        } else if (toasts.length > 0) {
          promptService.dismissToast(toasts[0].id);
        }
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [activeModal, toasts]);

  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => {
      setCopiedId(null);
    }, 2000);
  };

  const isTicketPrompt = (title?: string, message?: string) => {
    const combined = `${title || ""} ${message || ""}`.toLowerCase();
    return combined.includes("ticket") || combined.includes("queue") || combined.includes("triage");
  };

  const renderAnimatedIcon = (type: PromptType, size: "sm" | "md" | "lg" = "md") => {
    switch (type) {
      case "success":
        return <AnimatedSuccessTick size={size} />;
      case "error":
        return <AnimatedErrorCross size={size} />;
      case "warning":
        return <AnimatedWarningTriangle size={size} />;
      case "question":
        return <AnimatedInfoIcon size={size} isQuestion={true} />;
      case "info":
      default:
        return <AnimatedInfoIcon size={size} isQuestion={false} />;
    }
  };

  const getTheming = (type: PromptType, destructive = false, isTicket = false) => {
    if (destructive || type === "error") {
      return {
        badgeBg: "bg-rose-500/15 text-rose-300 border-rose-500/30",
        borderColor: "border-rose-500/40",
        glowColor: "rgba(244, 63, 94, 0.4)",
        btnPrimaryBg:
          "bg-gradient-to-r from-rose-600 via-red-600 to-rose-700 hover:from-rose-500 hover:to-red-500 text-white shadow-rose-950/60 shadow-lg",
        accentBar: "bg-gradient-to-r from-rose-500 via-red-400 to-rose-600",
        pillLabel: destructive ? "Destructive Action" : "Failed / Action Error",
      };
    }
    if (type === "warning") {
      return {
        badgeBg: "bg-amber-500/15 text-amber-300 border-amber-500/30",
        borderColor: "border-amber-500/40",
        glowColor: "rgba(245, 158, 11, 0.4)",
        btnPrimaryBg:
          "bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-bold shadow-amber-950/60 shadow-lg",
        accentBar: "bg-gradient-to-r from-amber-400 via-yellow-400 to-amber-500",
        pillLabel: "Attention Required",
      };
    }
    if (type === "success") {
      return {
        badgeBg: "bg-emerald-500/15 text-emerald-300 border-emerald-500/30",
        borderColor: "border-emerald-500/40",
        glowColor: "rgba(16, 185, 129, 0.4)",
        btnPrimaryBg:
          "bg-gradient-to-r from-emerald-600 via-teal-600 to-emerald-700 hover:from-emerald-500 hover:to-teal-500 text-white shadow-emerald-950/60 shadow-lg",
        accentBar: "bg-gradient-to-r from-emerald-400 via-teal-300 to-emerald-500",
        pillLabel: isTicket ? "Ticket Generated Successfully" : "Operation Succeeded",
      };
    }
    if (type === "question") {
      return {
        badgeBg: "bg-sky-500/15 text-sky-300 border-sky-500/30",
        borderColor: "border-sky-500/40",
        glowColor: "rgba(14, 165, 233, 0.4)",
        btnPrimaryBg:
          "bg-gradient-to-r from-sky-600 via-indigo-600 to-sky-700 hover:from-sky-500 hover:to-indigo-500 text-white shadow-sky-950/60 shadow-lg",
        accentBar: "bg-gradient-to-r from-sky-400 via-cyan-300 to-indigo-500",
        pillLabel: "Confirmation Prompt",
      };
    }
    return {
      badgeBg: "bg-indigo-500/15 text-indigo-300 border-indigo-500/30",
      borderColor: "border-indigo-500/40",
      glowColor: "rgba(99, 102, 241, 0.4)",
      btnPrimaryBg:
        "bg-gradient-to-r from-indigo-600 via-violet-600 to-indigo-700 hover:from-indigo-500 hover:to-violet-500 text-white shadow-indigo-950/60 shadow-lg",
      accentBar: "bg-gradient-to-r from-indigo-400 via-purple-300 to-indigo-500",
      pillLabel: "System Notification",
    };
  };

  return (
    <>
      {/* ========================================================================= */}
      {/* 1. DEAD-CENTER FLOATING NOTIFICATION POPUP WINDOW                         */}
      {/* ========================================================================= */}
      <AnimatePresence>
        {toasts.length > 0 && !activeModal && (
          <div
            id="modern-center-toast-overlay"
            className="fixed inset-0 z-[99998] flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs select-none pointer-events-auto"
          >
            {(() => {
              // Show the most recent toast in full center focus
              const t = toasts[0];
              const isTicket = isTicketPrompt(t.title, t.message);
              const theme = getTheming(t.type, false, isTicket);
              const isExpanded = expandedDetailsId === t.id;

              return (
                <motion.div
                  key={t.id}
                  initial={{ opacity: 0, scale: 0.82, y: 30, filter: "blur(8px)" }}
                  animate={{ opacity: 1, scale: 1, y: 0, filter: "blur(0px)" }}
                  exit={{ opacity: 0, scale: 0.88, y: -20, filter: "blur(6px)" }}
                  transition={{ type: "spring", stiffness: 460, damping: 26 }}
                  className={`relative w-full max-w-md bg-slate-950/95 text-white border ${theme.borderColor} rounded-3xl p-6 sm:p-7 shadow-2xl overflow-hidden flex flex-col gap-4.5`}
                  style={{
                    boxShadow: `0 30px 80px -15px rgba(0,0,0,0.85), 0 0 50px -5px ${theme.glowColor}`,
                  }}
                >
                  {/* Glowing Top Ambient Ribbon */}
                  <div className={`absolute top-0 left-0 right-0 h-1.5 ${theme.accentBar}`} />

                  {/* Multiple Queue Pill Counter (if more than 1 toast queued) */}
                  {toasts.length > 1 && (
                    <div className="absolute top-3.5 right-12 px-2.5 py-0.5 rounded-full bg-slate-800/90 border border-slate-700 text-[10px] font-mono text-slate-300">
                      +{toasts.length - 1} more
                    </div>
                  )}

                  {/* Close / Dismiss Button */}
                  <button
                    type="button"
                    onClick={() => promptService.dismissToast(t.id)}
                    className="absolute top-3.5 right-3.5 p-2 text-slate-400 hover:text-white hover:bg-slate-800/80 rounded-2xl transition-colors cursor-pointer"
                    title="Dismiss Notification"
                  >
                    <X className="w-4.5 h-4.5" />
                  </button>

                  {/* Center Header: Animated SVG Tick / Cross Icon & Status Badge */}
                  <div className="flex flex-col items-center text-center gap-3 pt-2">
                    {/* Animated SVG Icon */}
                    {renderAnimatedIcon(t.type, "lg")}

                    <div className="space-y-1">
                      <span
                        className={`inline-flex items-center gap-1 text-[10px] font-black uppercase tracking-wider px-3 py-1 rounded-full border ${theme.badgeBg}`}
                      >
                        <Sparkles className="w-3 h-3" />
                        {t.badge || theme.pillLabel}
                      </span>

                      <h3 className="text-base sm:text-lg font-bold text-white tracking-tight leading-snug">
                        {t.title || (t.type === "success" ? "Success!" : t.type === "error" ? "Error Submitting" : "Notification")}
                      </h3>
                    </div>
                  </div>

                  {/* Message Body */}
                  <div className="text-center px-1">
                    <p className="text-xs sm:text-sm text-slate-200 leading-relaxed font-medium">
                      {t.message}
                    </p>

                    {/* Diagnostic / Technical Details (Collapsible) */}
                    {t.details && (
                      <div className="mt-3 text-left">
                        <div className="flex items-center justify-between">
                          <button
                            type="button"
                            onClick={() => setExpandedDetailsId(isExpanded ? null : t.id)}
                            className="text-[11px] font-semibold text-slate-400 hover:text-white flex items-center gap-1 cursor-pointer transition-colors"
                          >
                            <span>{isExpanded ? "Hide Technical Details" : "View Technical Diagnostics"}</span>
                            {isExpanded ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                          </button>

                          <button
                            type="button"
                            onClick={() => copyToClipboard(t.details || "", t.id)}
                            className="text-[11px] font-semibold text-slate-400 hover:text-emerald-400 flex items-center gap-1 cursor-pointer transition-colors"
                          >
                            {copiedId === t.id ? (
                              <>
                                <Check className="w-3 h-3 text-emerald-400" />
                                <span className="text-emerald-400">Copied</span>
                              </>
                            ) : (
                              <>
                                <Copy className="w-3 h-3" />
                                <span>Copy Details</span>
                              </>
                            )}
                          </button>
                        </div>

                        {isExpanded && (
                          <motion.div
                            initial={{ opacity: 0, height: 0 }}
                            animate={{ opacity: 1, height: "auto" }}
                            exit={{ opacity: 0, height: 0 }}
                            className="mt-2 p-3 bg-slate-900/95 border border-slate-800 rounded-2xl text-[11px] font-mono text-slate-300 whitespace-pre-wrap max-h-32 overflow-y-auto leading-relaxed"
                          >
                            {t.details}
                          </motion.div>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Footer Action Buttons */}
                  <div className="pt-2 flex items-center justify-center gap-2.5 border-t border-slate-800/80">
                    {t.action && (
                      <button
                        type="button"
                        onClick={() => {
                          t.action?.onClick();
                          promptService.dismissToast(t.id);
                        }}
                        className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-2xl text-xs font-bold border border-slate-600 transition-all flex items-center gap-1.5 cursor-pointer shadow-xs active:scale-95"
                      >
                        <span>{t.action.label}</span>
                        <ArrowRight className="w-3.5 h-3.5" />
                      </button>
                    )}

                    <button
                      type="button"
                      onClick={() => promptService.dismissToast(t.id)}
                      className={`w-full px-5 py-2.5 rounded-2xl font-bold text-xs uppercase tracking-wider transition-all active:scale-95 cursor-pointer flex items-center justify-center gap-2 ${theme.btnPrimaryBg}`}
                    >
                      {t.type === "success" ? <Check className="w-4 h-4" /> : <ArrowRight className="w-4 h-4" />}
                      <span>Dismiss & Continue</span>
                    </button>
                  </div>

                  {/* Animated Auto-Dismiss Countdown Bar */}
                  {t.duration && t.duration > 0 && (
                    <motion.div
                      className={`absolute bottom-0 left-0 h-1 ${theme.accentBar} opacity-80`}
                      initial={{ width: "100%" }}
                      animate={{ width: "0%" }}
                      transition={{
                        duration: t.duration / 1000,
                        ease: "linear",
                      }}
                    />
                  )}
                </motion.div>
              );
            })()}
          </div>
        )}
      </AnimatePresence>

      {/* ========================================================================= */}
      {/* 2. DEAD-CENTER INTERACTIVE MODAL DIALOG PROMPT WINDOW                     */}
      {/* ========================================================================= */}
      <AnimatePresence>
        {activeModal && (
          <div
            id="modern-center-modal-overlay"
            className="fixed inset-0 z-[99999] flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md select-none"
          >
            {(() => {
              const isTicket = isTicketPrompt(activeModal.title, activeModal.message);
              const theme = getTheming(activeModal.type, activeModal.destructive, isTicket);

              return (
                <motion.div
                  initial={{ opacity: 0, scale: 0.85, y: 30, filter: "blur(8px)" }}
                  animate={{ opacity: 1, scale: 1, y: 0, filter: "blur(0px)" }}
                  exit={{ opacity: 0, scale: 0.9, y: 15, filter: "blur(5px)" }}
                  transition={{ type: "spring", stiffness: 440, damping: 28 }}
                  className={`relative w-full max-w-lg bg-slate-950 text-white border ${theme.borderColor} rounded-3xl p-6 sm:p-8 shadow-2xl overflow-hidden flex flex-col gap-5`}
                  style={{
                    boxShadow: `0 30px 80px -15px rgba(0,0,0,0.85), 0 0 60px -5px ${theme.glowColor}`,
                  }}
                >
                  {/* Glowing Top Ambient Ribbon */}
                  <div className={`absolute top-0 left-0 right-0 h-1.5 ${theme.accentBar}`} />

                  {/* Center Header: Animated SVG Icon & Header Text */}
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex items-start gap-4">
                      {/* Animated Micro-Icon */}
                      {renderAnimatedIcon(activeModal.type, "md")}

                      <div className="min-w-0">
                        <span
                          className={`inline-flex items-center gap-1 text-[10px] font-black uppercase tracking-wider px-2.5 py-0.5 rounded-full border mb-1.5 ${theme.badgeBg}`}
                        >
                          <Sparkles className="w-2.5 h-2.5" />
                          {activeModal.badgeText || theme.pillLabel}
                        </span>
                        <h3 className="text-lg sm:text-xl font-bold tracking-tight text-white leading-tight">
                          {activeModal.title}
                        </h3>
                      </div>
                    </div>

                    <button
                      onClick={() =>
                        promptService.dismissModal(
                          activeModal.inputMode ? null : false
                        )
                      }
                      className="p-2 text-slate-400 hover:text-white hover:bg-slate-800/80 rounded-2xl transition-colors shrink-0 cursor-pointer"
                      title="Close Dialog"
                    >
                      <X className="w-5 h-5" />
                    </button>
                  </div>

                  {/* Message & Body Container */}
                  <div className="space-y-3.5 text-sm leading-relaxed">
                    <p className="font-medium text-slate-200 text-[15px]">
                      {activeModal.message}
                    </p>

                    {activeModal.details && (
                      <div className="relative group">
                        <div className="bg-slate-900/90 border border-slate-800 p-4 rounded-2xl text-xs font-mono text-slate-300 whitespace-pre-wrap max-h-40 overflow-y-auto leading-relaxed">
                          {activeModal.details}
                        </div>
                        <button
                          type="button"
                          onClick={() => copyToClipboard(activeModal.details || "", "modal-details")}
                          className="absolute top-2.5 right-2.5 px-2 py-1 bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-300 hover:text-white text-[10px] font-bold rounded-lg transition-colors flex items-center gap-1 cursor-pointer"
                          title="Copy Diagnostics"
                        >
                          {copiedId === "modal-details" ? (
                            <>
                              <Check className="w-3 h-3 text-emerald-400" />
                              <span className="text-emerald-400">Copied</span>
                            </>
                          ) : (
                            <>
                              <Copy className="w-3 h-3" />
                              <span>Copy</span>
                            </>
                          )}
                        </button>
                      </div>
                    )}

                    {/* Interactive Input Mode */}
                    {activeModal.inputMode && (
                      <div className="pt-2">
                        {activeModal.inputType === "textarea" ? (
                          <textarea
                            ref={inputRef as any}
                            value={inputVal}
                            onChange={(e) => setInputVal(e.target.value)}
                            placeholder={activeModal.inputPlaceholder}
                            rows={3}
                            className="w-full px-4 py-3 rounded-2xl border border-slate-700 bg-slate-900 text-white placeholder-slate-500 focus:outline-hidden focus:ring-2 focus:ring-emerald-500 font-medium text-sm transition-all"
                            onKeyDown={(e) => {
                              if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
                                promptService.dismissModal(inputVal);
                              }
                            }}
                          />
                        ) : (
                          <input
                            ref={inputRef as any}
                            type={activeModal.inputType || "text"}
                            value={inputVal}
                            onChange={(e) => setInputVal(e.target.value)}
                            placeholder={activeModal.inputPlaceholder}
                            className="w-full px-4 py-3 rounded-2xl border border-slate-700 bg-slate-900 text-white placeholder-slate-500 focus:outline-hidden focus:ring-2 focus:ring-emerald-500 font-medium text-sm transition-all"
                            onKeyDown={(e) => {
                              if (e.key === "Enter") {
                                promptService.dismissModal(inputVal);
                              }
                            }}
                          />
                        )}
                      </div>
                    )}
                  </div>

                  {/* Actions Footer Bar */}
                  <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-800/80">
                    {(activeModal.cancelText ||
                      activeModal.inputMode ||
                      activeModal.type === "question" ||
                      activeModal.destructive) && (
                      <button
                        type="button"
                        onClick={() =>
                          promptService.dismissModal(
                            activeModal.inputMode ? null : false
                          )
                        }
                        className="px-5 py-2.5 rounded-2xl border border-slate-700 text-slate-300 hover:text-white hover:bg-slate-900 font-semibold text-sm transition-all cursor-pointer"
                      >
                        {activeModal.cancelText || "Cancel"}
                      </button>
                    )}

                    <button
                      type="button"
                      onClick={() =>
                        promptService.dismissModal(
                          activeModal.inputMode ? inputVal : true
                        )
                      }
                      className={`px-6 py-2.5 rounded-2xl font-bold text-sm flex items-center gap-2 transition-all active:scale-95 cursor-pointer ${theme.btnPrimaryBg}`}
                    >
                      <span>{activeModal.confirmText || "Acknowledge"}</span>
                      {activeModal.inputMode ? (
                        <CornerDownLeft className="w-4 h-4" />
                      ) : activeModal.type === "success" ? (
                        <Check className="w-4 h-4" />
                      ) : (
                        <ArrowRight className="w-4 h-4" />
                      )}
                    </button>
                  </div>
                </motion.div>
              );
            })()}
          </div>
        )}
      </AnimatePresence>
    </>
  );
};
