import React, { useEffect } from "react";
import DocumentLogo, { getHospitalFacilityName } from "./DocumentLogo";
import { Activity, ShieldCheck } from "lucide-react";

export interface SplashScreenLoaderProps {
  isVisible: boolean;
  minDurationMs?: number;
  onComplete: () => void;
  logoUrl?: string;
  hospitalName?: string;
}

export const SplashScreenLoader: React.FC<SplashScreenLoaderProps> = ({
  isVisible,
  minDurationMs = 0,
  onComplete,
  logoUrl,
  hospitalName = getHospitalFacilityName()
}) => {
  useEffect(() => {
    if (!isVisible) return;
    const timer = setTimeout(() => {
      onComplete();
    }, Math.max(minDurationMs, 600));
    return () => clearTimeout(timer);
  }, [isVisible, minDurationMs, onComplete]);

  if (!isVisible) return null;

  return (
    <div className="fixed inset-0 z-[100000] bg-slate-950 flex flex-col items-center justify-center p-6 text-white select-none">
      <div className="relative flex flex-col items-center max-w-sm text-center">
        <div className="relative mb-6">
          <div className="w-24 h-24 rounded-3xl bg-slate-900 border border-slate-800 flex items-center justify-center shadow-2xl p-4">
            {logoUrl ? (
              <img src={logoUrl} alt="Hospital Logo" className="w-full h-full object-contain" />
            ) : (
              <DocumentLogo className="h-16 w-auto" />
            )}
          </div>
          <div className="absolute -bottom-2 -right-2 p-2 bg-emerald-600 rounded-xl shadow-lg">
            <Activity className="w-4 h-4 text-white animate-pulse" />
          </div>
        </div>

        <h2 className="text-xl font-black tracking-tight text-white uppercase">{hospitalName}</h2>
        <p className="text-xs text-slate-400 mt-1 font-medium">Enterprise Hospital HMIS & Clinical Portal</p>

        <div className="w-48 h-1.5 bg-slate-800 rounded-full overflow-hidden mt-6 mb-3">
          <div className="h-full bg-emerald-500 rounded-full animate-[progress_1s_ease-in-out_infinite]" />
        </div>

        <div className="flex items-center gap-1.5 text-[11px] text-slate-500 font-mono">
          <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" />
          <span>Synchronizing Clinical Registry...</span>
        </div>
      </div>
    </div>
  );
};

export default SplashScreenLoader;
