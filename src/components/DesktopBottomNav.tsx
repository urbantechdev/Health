import React from "react";
import { motion } from "motion/react";
import {
  LayoutDashboard,
  UserPlus,
  Stethoscope,
  FlaskRound,
  ShoppingBag,
  CreditCard,
  Landmark,
  ShieldAlert,
  Users,
  Smartphone,
  ShieldCheck,
  Activity,
  Sliders,
  Sparkles,
  Ticket,
  ChevronUp,
  CircleDot
} from "lucide-react";
import { SystemRole, getRoleConfig } from "../constants/roles";

interface DesktopBottomNavProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  currentUserRole: SystemRole;
  queueCount?: number;
  isOffline?: boolean;
  onOpenMpesa: () => void;
  onOpenSha: () => void;
  checkTabPermission: (tabId: string) => { allowed: boolean; reason?: string };
}

export default function DesktopBottomNav({
  activeTab,
  setActiveTab,
  currentUserRole,
  queueCount = 0,
  isOffline = false,
  onOpenMpesa,
  onOpenSha,
  checkTabPermission,
}: DesktopBottomNavProps) {
  const roleConfig = getRoleConfig(currentUserRole);

  const navItems = [
    {
      id: "dashboard",
      label: "Overview",
      icon: LayoutDashboard,
      shortcut: "Alt+1",
    },
    {
      id: "reception",
      label: "Reception",
      icon: UserPlus,
      shortcut: "Alt+2",
    },
    {
      id: "doctor",
      label: "Doctor Desk",
      icon: Stethoscope,
      shortcut: "Alt+3",
    },
    {
      id: "diagnostics",
      label: "Labs & Diag",
      icon: FlaskRound,
      shortcut: "Alt+4",
    },
    {
      id: "pharmacy",
      label: "Pharmacy POS",
      icon: ShoppingBag,
      shortcut: "Alt+5",
    },
    {
      id: "billing",
      label: "Billing & Claims",
      icon: CreditCard,
      shortcut: "Alt+6",
    },
    {
      id: "finance",
      label: "Finance",
      icon: Landmark,
      shortcut: "Alt+7",
    },
    {
      id: "admin",
      label: "Admin & Users",
      icon: Sliders,
      shortcut: "Alt+8",
    },
  ];

  return (
    <div
      id="desktop-bottom-nav"
      className="hidden md:flex flex-col fixed bottom-0 left-0 right-0 z-40 select-none pointer-events-none drop-shadow-2xl"
    >
      {/* Prominent Visible Wave Top Edge Silhouette */}
      <div className="w-full h-8 overflow-visible leading-none relative -mb-0.5 z-10">
        <svg
          viewBox="0 0 1440 60"
          fill="none"
          preserveAspectRatio="none"
          className="w-full h-full block"
        >
          <defs>
            <linearGradient id="waveGlowGradient" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#059669" />
              <stop offset="35%" stopColor="#10b981" />
              <stop offset="70%" stopColor="#059669" />
              <stop offset="100%" stopColor="#10b981" />
            </linearGradient>
          </defs>

          {/* Wave Solid Background connected to main white nav */}
          <path
            d="M 0,38 C 360,6 1080,56 1440,16 L 1440,60 L 0,60 Z"
            fill="#ffffff"
          />

          {/* High-Contrast Bold Vibrant Highlight Border Line */}
          <path
            d="M 0,38 C 360,6 1080,56 1440,16"
            stroke="url(#waveGlowGradient)"
            strokeWidth="3.5"
            strokeLinecap="round"
            fill="none"
          />
        </svg>
      </div>

      {/* Main Bar Container with Generous Height, White Background, and Centered Buttons */}
      <div className="bg-white border-t border-slate-100/80 shadow-[0_-12px_30px_-5px_rgba(0,0,0,0.12)] px-6 py-4 pointer-events-auto relative overflow-hidden">
        {/* Continuous Motion Gentle Shimmer Effect */}
        <div className="absolute inset-0 pointer-events-none overflow-hidden z-0">
          {/* Ambient Sweeping Green Ray Beam */}
          <motion.div
            className="absolute top-0 bottom-0 w-48 md:w-80 bg-gradient-to-r from-transparent via-emerald-500/10 to-transparent blur-lg -skew-x-12"
            initial={{ left: "-40%" }}
            animate={{ left: "120%" }}
            transition={{
              repeat: Infinity,
              duration: 6.0,
              ease: "easeInOut",
              repeatDelay: 1.2,
            }}
          />

          {/* Gentle Light Ray Line with Soft Emerald Glow */}
          <motion.div
            className="absolute top-0 bottom-0 w-1 bg-gradient-to-b from-transparent via-emerald-400/50 to-transparent -skew-x-12 opacity-60 shadow-[0_0_10px_#10b981]"
            initial={{ left: "-40%" }}
            animate={{ left: "120%" }}
            transition={{
              repeat: Infinity,
              duration: 6.0,
              ease: "easeInOut",
              repeatDelay: 1.2,
            }}
          >
            {/* Core Bright Light Spark */}
            <div className="absolute top-1/4 bottom-1/4 w-0.5 left-1/2 -translate-x-1/2 bg-white/70 blur-[0.5px]" />
          </motion.div>

          {/* Top Edge Tracer Line */}
          <motion.div
            className="absolute top-0 w-24 h-0.5 bg-gradient-to-r from-transparent via-emerald-400/40 to-transparent blur-[0.5px]"
            initial={{ left: "-40%" }}
            animate={{ left: "120%" }}
            transition={{
              repeat: Infinity,
              duration: 6.0,
              ease: "easeInOut",
              repeatDelay: 1.2,
            }}
          />
        </div>

        <div className="w-full flex items-center justify-center gap-3.5 lg:gap-6 relative z-10">
          
          {/* Center-aligned Navigation Module Switcher Tabs positioned closer to action buttons */}
          <div className="flex items-center justify-center gap-2 xl:gap-3 py-0.5">
            {navItems.map((item) => {
              const Icon = item.icon;
              const perm = checkTabPermission(item.id);
              const isAllowed = perm.allowed;
              const isActive = activeTab === item.id;

              return (
                <button
                  key={item.id}
                  id={`desktop-bottom-nav-${item.id}`}
                  onClick={() => {
                    if (isAllowed) {
                      setActiveTab(item.id);
                    }
                  }}
                  disabled={!isAllowed}
                  title={isAllowed ? `${item.label} (${item.shortcut})` : perm.reason}
                  className={`group relative px-3.5 lg:px-4 xl:px-4.5 py-3 rounded-xl text-xs font-semibold tracking-wide transition-all duration-300 ease-out flex items-center gap-2.5 shrink-0 cursor-pointer overflow-hidden ${
                    isActive
                      ? "bg-gradient-to-r from-emerald-600 to-emerald-500 text-white shadow-[0_0_24px_rgba(16,185,129,0.85)] border border-emerald-400 font-bold scale-105"
                      : isAllowed
                      ? "text-slate-600 hover:text-emerald-800 hover:bg-emerald-50/90 hover:border hover:border-emerald-400/50 hover:shadow-[0_0_20px_rgba(16,185,129,0.45)] hover:-translate-y-0.5"
                      : "text-slate-400/60 opacity-40 cursor-not-allowed"
                  }`}
                >
                  {/* Animated Green Background Light Glow on Hover */}
                  {isAllowed && !isActive && (
                    <span className="absolute inset-0 bg-gradient-to-r from-emerald-500/0 via-emerald-400/25 to-emerald-500/0 opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none" />
                  )}
                  {isAllowed && !isActive && (
                    <span className="absolute -inset-1 bg-emerald-400/20 blur-sm opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none rounded-xl" />
                  )}

                  <Icon className={`relative z-10 w-4.5 h-4.5 transition-transform duration-200 group-hover:scale-110 ${
                    isActive ? "text-white" : isAllowed ? "text-slate-500 group-hover:text-emerald-700" : "text-slate-300"
                  }`} />
                  <span className="relative z-10 whitespace-nowrap">{item.label}</span>
                  {isActive && (
                    <span className="relative z-10 w-1.5 h-1.5 rounded-full bg-white shadow-xs animate-pulse" />
                  )}
                </button>
              );
            })}

            {queueCount > 0 && (
              <button
                onClick={() => setActiveTab("queue")}
                className="flex items-center gap-2 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 px-3.5 py-3 rounded-xl border border-emerald-300/80 shadow-[0_0_14px_rgba(16,185,129,0.3)] hover:shadow-[0_0_20px_rgba(16,185,129,0.55)] text-xs font-bold transition-all cursor-pointer shrink-0 ml-1 hover:-translate-y-0.5"
                title="View Live Waiting Queue"
              >
                <Ticket className="w-4.5 h-4.5 text-emerald-600" />
                <span className="whitespace-nowrap">{queueCount} Queue</span>
              </button>
            )}
          </div>

          {/* Far Right Action Buttons (SHA & M-PESA Trigger Hub) positioned smoothly next to the centered buttons */}
          <div className="flex items-center gap-2.5 shrink-0 pl-3.5 border-l border-slate-200 ml-2">
            {/* Quick M-Pesa STK Launcher */}
            <button
              id="desktop-bottom-nav-mpesa"
              onClick={onOpenMpesa}
              className="flex items-center gap-2 bg-gradient-to-r from-emerald-600 to-green-500 hover:from-emerald-500 hover:to-green-400 text-white px-4 py-3 rounded-xl text-xs font-bold shadow-[0_0_20px_rgba(16,185,129,0.45)] hover:shadow-[0_0_28px_rgba(16,185,129,0.75)] border border-emerald-400/50 transition-all duration-200 cursor-pointer active:scale-95 group whitespace-nowrap hover:-translate-y-0.5"
              title="Trigger M-PESA STK Push Prompt"
            >
              <Smartphone className="w-4.5 h-4.5 text-emerald-100 group-hover:scale-110 transition-transform" />
              <span>M-PESA Pay</span>
            </button>

            {/* Quick SHA Portal Launcher */}
            <button
              id="desktop-bottom-nav-sha"
              onClick={onOpenSha}
              className="flex items-center gap-2 bg-gradient-to-r from-teal-700 to-emerald-700 hover:from-teal-600 hover:to-emerald-600 text-white px-4 py-3 rounded-xl text-xs font-bold shadow-[0_0_18px_rgba(16,185,129,0.4)] hover:shadow-[0_0_25px_rgba(16,185,129,0.7)] border border-emerald-500/40 transition-all duration-200 cursor-pointer active:scale-95 group whitespace-nowrap hover:-translate-y-0.5"
              title="Open SHA / Taifa Care Biometric & Pre-Auth Portal"
            >
              <ShieldCheck className="w-4.5 h-4.5 text-emerald-100 group-hover:scale-110 transition-transform" />
              <span>SHA Portal</span>
            </button>
          </div>

        </div>
      </div>
    </div>
  );
}
