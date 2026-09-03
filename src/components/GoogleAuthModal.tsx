import React, { useState } from "react";
import { motion } from "motion/react";
import { 
  X, 
  Sparkles, 
  AlertCircle, 
  ArrowRight,
  Shield
} from "lucide-react";
import { isSuperAdminEmail } from "../lib/superAdmins";
import { Employee } from "../types";

export interface GoogleAuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectAccount: (email: string, displayName: string, role?: string) => void;
  onAttemptRealGooglePopup: () => Promise<void>;
  employees: Employee[];
}

export const GoogleAuthModal: React.FC<GoogleAuthModalProps> = ({
  isOpen,
  onClose,
  onSelectAccount,
  onAttemptRealGooglePopup,
  employees
}) => {
  const [customEmail, setCustomEmail] = useState("");
  const [customPin, setCustomPin] = useState("");
  const [isPopupLoading, setIsPopupLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  React.useEffect(() => {
    if (isOpen) {
      setCustomEmail("");
      setCustomPin("");
      setErrorMessage(null);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const currentHost = typeof window !== "undefined" ? window.location.hostname : "localhost";

  const handleTriggerPopup = async () => {
    setIsPopupLoading(true);
    setErrorMessage(null);
    try {
      await onAttemptRealGooglePopup();
      onClose();
    } catch (err: any) {
      const code = err?.code || "";
      if (code === "auth/unauthorized-domain") {
        setErrorMessage(
          `Domain (${currentHost}) is not whitelisted in Firebase Console. Add this domain in Firebase Console → Authentication → Settings → Authorized domains.`
        );
      } else {
        setErrorMessage(err?.message || "Failed to complete Google Sign In.");
      }
    } finally {
      setIsPopupLoading(false);
    }
  };

  const handleCustomSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!customEmail.trim()) {
      setErrorMessage("Please enter your registered corporate email address.");
      return;
    }
    if (!customPin.trim()) {
      setErrorMessage("Please enter your Security PIN.");
      return;
    }

    const clean = customEmail.toLowerCase().trim();
    const cleanPin = customPin.trim();
    const matched = employees.find(emp => emp.email?.toLowerCase().trim() === clean);
    
    if (isSuperAdminEmail(clean)) {
      const expectedPin = matched?.pin || "2026";
      if (cleanPin !== expectedPin) {
        setErrorMessage("Invalid Security PIN for Administrator.");
        return;
      }
      onSelectAccount(
        clean,
        matched?.name || "System Administrator",
        "Super Admin"
      );
      onClose();
    } else if (matched) {
      if (matched.status === "terminated") {
        setErrorMessage("Access Denied: This staff account is currently suspended.");
        return;
      }
      const expectedPin = matched.pin || "2026";
      if (cleanPin !== expectedPin) {
        setErrorMessage("Invalid Security PIN for this staff account.");
        return;
      }
      onSelectAccount(
        clean,
        matched.name || "Hospital Staff",
        matched.role || "Staff"
      );
      onClose();
    } else {
      setErrorMessage(`Account '${clean}' is not registered in the hospital staff directory. Please contact System Administration.`);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs">
      <div className="relative max-w-md w-full">
        {/* Gemini Rainbow Halo Shadow Motion Layer */}
        <div className="absolute -inset-2 sm:-inset-3 rounded-3xl opacity-80 blur-xl sm:blur-2xl pointer-events-none -z-10 overflow-hidden">
          <div className="w-[220%] h-[220%] -top-[60%] -left-[60%] absolute gemini-rainbow-spin" />
        </div>
        <div className="absolute -inset-[2px] rounded-3xl opacity-70 pointer-events-none -z-10 overflow-hidden">
          <div className="w-full h-full gemini-rainbow-linear" />
        </div>

        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 10 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 10 }}
          className="bg-white rounded-3xl w-full overflow-hidden shadow-2xl border border-slate-100 flex flex-col max-h-[90vh] relative z-10"
        >
          {/* Navy Header */}
          <div className="px-6 py-5 bg-[#0B1528] text-white flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-white/10 flex items-center justify-center border border-white/10">
              <svg className="w-5 h-5" viewBox="0 0 24 24">
                <path
                  fill="#4285F4"
                  d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                />
                <path
                  fill="#34A853"
                  d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                />
                <path
                  fill="#FBBC05"
                  d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                />
                <path
                  fill="#EA4335"
                  d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                />
              </svg>
            </div>
            <div>
              <h3 className="text-base font-black tracking-tight flex items-center gap-2">
                <span>Google Single Sign-On</span>
              </h3>
              <p className="text-xs text-slate-300">
                Hospital Corporate Authentication
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 text-slate-300 hover:text-white flex items-center justify-center cursor-pointer transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Body */}
        <div className="p-6 overflow-y-auto space-y-5">
          {errorMessage && (
            <div className="p-3.5 bg-rose-50 border border-rose-200 rounded-2xl text-xs text-rose-900 flex items-start gap-2.5">
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
              <p className="leading-relaxed font-medium">{errorMessage}</p>
            </div>
          )}

          {/* Primary Trigger: Real Google Auth Popup */}
          <div className="space-y-3">
            <button
              type="button"
              disabled={isPopupLoading}
              onClick={handleTriggerPopup}
              className="w-full py-3.5 px-4 bg-slate-900 hover:bg-slate-800 text-white font-bold rounded-2xl text-xs flex items-center justify-center gap-2.5 transition-all shadow-md cursor-pointer disabled:opacity-60"
            >
              <svg className="w-4 h-4" viewBox="0 0 24 24">
                <path
                  fill="#4285F4"
                  d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                />
                <path
                  fill="#34A853"
                  d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                />
                <path
                  fill="#FBBC05"
                  d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                />
                <path
                  fill="#EA4335"
                  d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                />
              </svg>
              <span>{isPopupLoading ? "Opening Google Popup..." : "Sign in with Google"}</span>
            </button>
          </div>

          {/* Alternative: Corporate Email Verification */}
          <div className="pt-3 border-t border-slate-100 space-y-3">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider block">
              Or Sign In with Corporate Email
            </span>
            <form onSubmit={handleCustomSubmit} className="space-y-2.5">
              <input
                type="email"
                required
                value={customEmail}
                onChange={(e) => setCustomEmail(e.target.value)}
                placeholder="staff@hospital.org"
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-900 focus:outline-slate-800"
              />
              <input
                type="password"
                required
                maxLength={8}
                value={customPin}
                onChange={(e) => setCustomPin(e.target.value)}
                placeholder="Security PIN"
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-900 focus:outline-slate-800"
              />
              <button
                type="submit"
                className="w-full py-2.5 px-4 bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold rounded-xl text-xs flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
              >
                <span>Verify & Sign In</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </form>
            <p className="text-[11px] text-center text-slate-400 font-medium pt-1">
              Only whitelisted Google accounts are granted administrative access.
            </p>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-3.5 bg-slate-50 border-t border-slate-100 flex items-center justify-end">
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2 bg-slate-200 hover:bg-slate-300 text-slate-700 font-bold rounded-xl text-xs transition-colors cursor-pointer"
          >
            Close
          </button>
        </div>
      </motion.div>
    </div>
  </div>
  );
};
