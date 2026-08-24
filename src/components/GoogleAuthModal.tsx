import React, { useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { 
  X, 
  ShieldCheck, 
  Sparkles, 
  AlertCircle, 
  Globe, 
  Copy, 
  Check, 
  ChevronRight, 
  Lock,
  ArrowRight
} from "lucide-react";
import { MASTER_SUPER_ADMIN_SEEDS, SUPER_ADMIN_EMAILS } from "../lib/superAdmins";
import { Employee } from "../types";

export interface GoogleAuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectAccount: (email: string, displayName: string) => void;
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
  const [copiedHost, setCopiedHost] = useState(false);
  const [isPopupLoading, setIsPopupLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  if (!isOpen) return null;

  const currentHost = typeof window !== "undefined" ? window.location.hostname : "localhost";

  const handleCopyHost = () => {
    if (typeof navigator !== "undefined" && navigator.clipboard) {
      navigator.clipboard.writeText(currentHost);
      setCopiedHost(true);
      setTimeout(() => setCopiedHost(false), 2000);
    }
  };

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
          `Domain (${currentHost}) is not whitelisted in Firebase Console. Please select one of the authorized Super Admin accounts below or add this domain in Firebase Console → Authentication → Settings → Authorized domains.`
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
    if (!customEmail.trim()) return;
    const clean = customEmail.toLowerCase().trim();
    const matched = employees.find(emp => emp.email?.toLowerCase().trim() === clean);
    
    if (SUPER_ADMIN_EMAILS.includes(clean as any) || matched) {
      onSelectAccount(
        clean,
        matched?.name || "Hospital Staff",
        matched?.role || "Super Admin"
      );
      onClose();
    } else {
      setErrorMessage(`Google Account '${clean}' is not registered in the hospital staff directory. Please select a whitelisted Super Admin account or contact an administrator.`);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 10 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 10 }}
        className="bg-white rounded-3xl max-w-lg w-full overflow-hidden shadow-2xl border border-slate-100 flex flex-col max-h-[90vh]"
      >
        {/* Header */}
        <div className="px-6 py-5 bg-gradient-to-r from-slate-900 via-slate-800 to-purple-950 text-white flex items-center justify-between">
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
                <span>Google Account Authentication</span>
              </h3>
              <p className="text-xs text-slate-300">
                Hospital Single Sign-On (SSO) Portal
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
            <div className="p-3.5 bg-amber-50 border border-amber-200 rounded-2xl text-xs text-amber-900 flex items-start gap-2.5">
              <AlertCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
              <p className="leading-relaxed font-medium">{errorMessage}</p>
            </div>
          )}

          {/* Whitelisted Super Admins (One-Click Instant Sovereign Sign In) */}
          <div className="space-y-2.5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-black text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                <ShieldCheck className="w-4 h-4 text-purple-600" />
                <span>Whitelisted Super Admins</span>
              </span>
              <span className="text-[10px] font-bold px-2 py-0.5 bg-purple-50 text-purple-700 rounded-md border border-purple-200">
                Full Clearance
              </span>
            </div>

            <div className="space-y-2">
              {MASTER_SUPER_ADMIN_SEEDS.map((admin) => (
                <button
                  key={admin.email}
                  type="button"
                  onClick={() => {
                    onSelectAccount(admin.email, admin.name);
                    onClose();
                  }}
                  className="w-full p-3.5 bg-slate-50 hover:bg-purple-50/80 border border-slate-200 hover:border-purple-300 rounded-2xl text-left transition-all flex items-center justify-between group cursor-pointer"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-xl bg-purple-600 text-white font-black text-xs flex items-center justify-center shadow-xs">
                      {admin.name.charAt(0)}
                    </div>
                    <div>
                      <p className="text-xs font-black text-slate-900 group-hover:text-purple-900">
                        {admin.name}
                      </p>
                      <p className="text-[11px] font-mono font-medium text-slate-500 group-hover:text-purple-700">
                        {admin.email}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-1.5 text-xs font-bold text-purple-700 opacity-0 group-hover:opacity-100 transition-opacity">
                    <span>Sign In</span>
                    <ChevronRight className="w-4 h-4" />
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Or Trigger Real Google Auth Popup */}
          <div className="pt-2 border-t border-slate-100 space-y-3">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider block">
              Or Authenticate with Google Popup
            </span>

            <button
              type="button"
              disabled={isPopupLoading}
              onClick={handleTriggerPopup}
              className="w-full py-3 px-4 bg-white hover:bg-slate-50 border border-slate-200 hover:border-slate-300 text-slate-700 font-bold rounded-2xl text-xs flex items-center justify-center gap-2.5 transition-all shadow-xs cursor-pointer disabled:opacity-60"
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
              <span>{isPopupLoading ? "Opening Google Popup..." : "Launch Google OAuth Popup"}</span>
            </button>
          </div>

          {/* Domain Information Helper */}
          <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-2xl space-y-2 text-[11px] text-slate-600">
            <div className="flex items-center justify-between">
              <span className="font-bold text-slate-700 flex items-center gap-1">
                <Globe className="w-3.5 h-3.5 text-blue-600" />
                <span>Domain Whitelist Utility</span>
              </span>
              <button
                type="button"
                onClick={handleCopyHost}
                className="px-2 py-0.5 bg-white border border-slate-200 hover:bg-slate-100 rounded text-[10px] font-bold text-slate-700 flex items-center gap-1 cursor-pointer"
              >
                {copiedHost ? <Check className="w-3 h-3 text-emerald-600" /> : <Copy className="w-3 h-3" />}
                <span>{copiedHost ? "Copied" : "Copy Host"}</span>
              </button>
            </div>
            <p className="text-slate-500">
              Current active hostname: <code className="font-mono text-slate-900 font-bold bg-white px-1.5 py-0.5 rounded border border-slate-200">{currentHost}</code>
            </p>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 bg-slate-50 border-t border-slate-100 flex items-center justify-end">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 bg-slate-200 hover:bg-slate-300 text-slate-700 font-bold rounded-xl text-xs transition-colors cursor-pointer"
          >
            Close
          </button>
        </div>
      </motion.div>
    </div>
  );
};
