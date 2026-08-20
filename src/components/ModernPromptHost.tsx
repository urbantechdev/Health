import React, { useEffect, useState, useRef } from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  CheckCircle2,
  AlertCircle,
  AlertTriangle,
  Info,
  HelpCircle,
  X,
  ShieldAlert,
  ArrowRight,
  CornerDownLeft,
  Sparkles,
  Check
} from "lucide-react";
import {
  promptService,
  ToastNotification,
  ModalPromptConfig,
  PromptType,
} from "../lib/promptService";

export const ModernPromptHost: React.FC = () => {
  const [toasts, setToasts] = useState<ToastNotification[]>([]);
  const [activeModal, setActiveModal] = useState<ModalPromptConfig | null>(null);
  const [inputVal, setInputVal] = useState<string>("");
  const inputRef = useRef<HTMLInputElement | HTMLTextAreaElement | null>(null);

  // Subscribe to toast and modal prompt changes
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

  // Focus input when input prompt opens
  useEffect(() => {
    if (activeModal?.inputMode) {
      setTimeout(() => {
        inputRef.current?.focus();
      }, 100);
    }
  }, [activeModal]);

  // Handle ESC key for modal
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && activeModal) {
        promptService.dismissModal(false);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [activeModal]);

  // Type styling helpers
  const getPromptVisuals = (type: PromptType, destructive = false) => {
    if (destructive || type === "error") {
      return {
        icon: <AlertCircle className="w-6 h-6 text-rose-500 shrink-0" />,
        badgeBg: "bg-rose-500/10 text-rose-500 border-rose-500/20",
        ringColor: "ring-rose-500/30",
        borderColor: "border-rose-500/30",
        glowColor: "rgba(244, 63, 94, 0.25)",
        btnConfirmBg: "bg-gradient-to-r from-rose-600 to-red-600 hover:from-rose-500 hover:to-red-500 text-white shadow-rose-900/30 shadow-lg",
        accentBar: "bg-rose-500",
        pillLabel: destructive ? "Destructive Action" : "Critical Alert",
      };
    }
    if (type === "warning") {
      return {
        icon: <AlertTriangle className="w-6 h-6 text-amber-500 shrink-0" />,
        badgeBg: "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20",
        ringColor: "ring-amber-500/30",
        borderColor: "border-amber-500/30",
        glowColor: "rgba(245, 158, 11, 0.25)",
        btnConfirmBg: "bg-gradient-to-r from-amber-600 to-yellow-600 hover:from-amber-500 hover:to-yellow-500 text-slate-950 font-bold shadow-amber-900/20 shadow-lg",
        accentBar: "bg-amber-500",
        pillLabel: "Notice Required",
      };
    }
    if (type === "success") {
      return {
        icon: <CheckCircle2 className="w-6 h-6 text-emerald-500 shrink-0" />,
        badgeBg: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20",
        ringColor: "ring-emerald-500/30",
        borderColor: "border-emerald-500/30",
        glowColor: "rgba(16, 185, 129, 0.25)",
        btnConfirmBg: "bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white shadow-emerald-900/30 shadow-lg",
        accentBar: "bg-emerald-500",
        pillLabel: "Success Verified",
      };
    }
    if (type === "question") {
      return {
        icon: <HelpCircle className="w-6 h-6 text-sky-500 shrink-0" />,
        badgeBg: "bg-sky-500/10 text-sky-600 dark:text-sky-400 border-sky-500/20",
        ringColor: "ring-sky-500/30",
        borderColor: "border-sky-500/30",
        glowColor: "rgba(14, 165, 233, 0.25)",
        btnConfirmBg: "bg-gradient-to-r from-sky-600 to-indigo-600 hover:from-sky-500 hover:to-indigo-500 text-white shadow-sky-900/30 shadow-lg",
        accentBar: "bg-sky-500",
        pillLabel: "Confirmation Question",
      };
    }
    return {
      icon: <Info className="w-6 h-6 text-indigo-500 shrink-0" />,
      badgeBg: "bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border-indigo-500/20",
      ringColor: "ring-indigo-500/30",
      borderColor: "border-indigo-500/30",
      glowColor: "rgba(99, 102, 241, 0.25)",
      btnConfirmBg: "bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 text-white shadow-indigo-900/30 shadow-lg",
      accentBar: "bg-indigo-500",
      pillLabel: "System Notification",
    };
  };

  return (
    <>
      {/* 1. Modern Floating Toast Stack */}
      <div
        id="modern-toast-portal"
        className="fixed top-4 right-4 z-9999 flex flex-col gap-2.5 max-w-sm sm:max-w-md w-[calc(100vw-2rem)] sm:w-full pointer-events-none"
      >
        <AnimatePresence>
          {toasts.map((t) => {
            const visual = getPromptVisuals(t.type);
            return (
              <motion.div
                key={t.id}
                initial={{ opacity: 0, y: -20, scale: 0.94 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9, y: -15 }}
                transition={{ duration: 0.22, ease: "easeOut" }}
                className="pointer-events-auto relative overflow-hidden bg-slate-900/95 backdrop-blur-xl border border-slate-700/70 text-slate-100 rounded-2xl p-4 shadow-2xl shadow-black/40 flex flex-col gap-2 group"
                style={{
                  boxShadow: `0 12px 30px -4px rgba(0,0,0,0.5), 0 0 20px -2px ${visual.glowColor}`,
                }}
              >
                {/* Visual Left Accent Line */}
                <div
                  className={`absolute top-0 bottom-0 left-0 w-1.5 ${visual.accentBar}`}
                />

                <div className="flex items-start justify-between gap-3 pl-2">
                  <div className="flex items-start gap-3">
                    <div className="p-1.5 rounded-xl bg-slate-800/80 border border-slate-700/60 shrink-0 mt-0.5">
                      {visual.icon}
                    </div>
                    <div className="min-w-0 flex-1">
                      {t.title && (
                        <h4 className="text-xs font-black uppercase tracking-wider text-slate-300">
                          {t.title}
                        </h4>
                      )}
                      <p className="text-sm font-medium text-white leading-snug break-words">
                        {t.message}
                      </p>
                      {t.details && (
                        <p className="text-xs text-slate-400 mt-1 leading-relaxed bg-slate-950/50 p-2 rounded-lg border border-slate-800">
                          {t.details}
                        </p>
                      )}
                    </div>
                  </div>

                  <button
                    onClick={() => promptService.dismissToast(t.id)}
                    className="p-1 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors shrink-0 cursor-pointer"
                    title="Dismiss"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>

                {/* Optional Action Button */}
                {t.action && (
                  <div className="pl-11 pt-1">
                    <button
                      onClick={() => {
                        t.action?.onClick();
                        promptService.dismissToast(t.id);
                      }}
                      className="px-3 py-1 bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-white rounded-lg transition-colors flex items-center gap-1.5 border border-slate-600/60 cursor-pointer"
                    >
                      <span>{t.action.label}</span>
                      <ArrowRight className="w-3 h-3" />
                    </button>
                  </div>
                )}

                {/* Progress timer bar */}
                {t.duration && t.duration > 0 && (
                  <motion.div
                    className={`absolute bottom-0 left-0 h-0.5 ${visual.accentBar} opacity-60`}
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
          })}
        </AnimatePresence>
      </div>

      {/* 2. Modern Interactive Modal Dialog Prompts (Alert / Confirm / Question / Input) */}
      <AnimatePresence>
        {activeModal && (
          <div
            id="modern-prompt-modal-overlay"
            className="fixed inset-0 z-99999 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-md select-none"
          >
            {/* Animated Modal Window */}
            {(() => {
              const visual = getPromptVisuals(
                activeModal.type,
                activeModal.destructive
              );
              return (
                <motion.div
                  initial={{ opacity: 0, scale: 0.92, y: 15 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.95, y: 10 }}
                  transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
                  className="relative w-full max-w-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 sm:p-7 shadow-2xl overflow-hidden flex flex-col gap-5 text-slate-900 dark:text-slate-100"
                  style={{
                    boxShadow: `0 25px 60px -15px rgba(0,0,0,0.6), 0 0 30px 2px ${visual.glowColor}`,
                  }}
                >
                  {/* Top Ambient Glow / Header Ribbon */}
                  <div
                    className={`absolute top-0 left-0 right-0 h-1.5 ${visual.accentBar}`}
                  />

                  {/* Header Row */}
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <div
                        className={`p-3 rounded-2xl bg-slate-100 dark:bg-slate-800/90 border border-slate-200 dark:border-slate-700/80 shadow-xs shrink-0`}
                      >
                        {visual.icon}
                      </div>
                      <div>
                        <span
                          className={`inline-flex items-center gap-1 text-[10px] font-black uppercase tracking-wider px-2.5 py-0.5 rounded-full border mb-1 ${visual.badgeBg}`}
                        >
                          <Sparkles className="w-2.5 h-2.5" />
                          {activeModal.badgeText || visual.pillLabel}
                        </span>
                        <h3 className="text-lg sm:text-xl font-bold tracking-tight text-slate-900 dark:text-white leading-tight">
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
                      className="p-1.5 text-slate-400 hover:text-slate-700 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-colors shrink-0 cursor-pointer"
                    >
                      <X className="w-5 h-5" />
                    </button>
                  </div>

                  {/* Main Message Body */}
                  <div className="space-y-3 text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
                    <p className="font-medium text-slate-800 dark:text-slate-200 text-[15px]">
                      {activeModal.message}
                    </p>

                    {activeModal.details && (
                      <div className="bg-slate-50 dark:bg-slate-950/70 border border-slate-200 dark:border-slate-800 p-3.5 rounded-2xl text-xs font-mono text-slate-700 dark:text-slate-300 whitespace-pre-wrap max-h-36 overflow-y-auto">
                        {activeModal.details}
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
                            className="w-full px-4 py-3 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-slate-900 dark:text-white focus:outline-hidden focus:ring-2 focus:ring-emerald-500 font-medium text-sm transition-all"
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
                            className="w-full px-4 py-3 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-slate-900 dark:text-white focus:outline-hidden focus:ring-2 focus:ring-emerald-500 font-medium text-sm transition-all"
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

                  {/* Actions Button Bar */}
                  <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100 dark:border-slate-800">
                    {/* Cancel Button (if in confirm/prompt mode) */}
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
                        className="px-5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 font-semibold text-sm transition-all cursor-pointer"
                      >
                        {activeModal.cancelText || "Cancel"}
                      </button>
                    )}

                    {/* Confirm Button */}
                    <button
                      type="button"
                      onClick={() =>
                        promptService.dismissModal(
                          activeModal.inputMode ? inputVal : true
                        )
                      }
                      className={`px-6 py-2.5 rounded-xl font-bold text-sm flex items-center gap-2 transition-all active:scale-95 cursor-pointer ${visual.btnConfirmBg}`}
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
