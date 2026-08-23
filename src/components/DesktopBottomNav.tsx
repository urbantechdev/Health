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
  CircleDot,
  ArrowRightLeft,
  MessageSquare
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
  onOpenChat?: () => void;
  unreadChatCount?: number;
  onOpenTransfer?: () => void;
  pendingTransfersCount?: number;
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
  onOpenChat,
  unreadChatCount = 0,
  onOpenTransfer,
  pendingTransfersCount = 0,
  checkTabPermission,
}: DesktopBottomNavProps) {
  const roleConfig = getRoleConfig(currentUserRole);

  const allNavItems = [
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
      id: "transfers",
      label: "Transfers",
      icon: ArrowRightLeft,
      shortcut: "Alt+T",
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

  // Strictly filter items: do not render unauthorized modules at all
  const visibleNavItems = allNavItems.filter((item) => checkTabPermission(item.id).allowed);
  const canAccessQueue = checkTabPermission("queue").allowed;
  const canAccessMpesa = roleConfig.canDispenseAndCheckout || roleConfig.allowedModules.includes("billing") || roleConfig.allowedModules.includes("pharmacy") || roleConfig.allowedModules.includes("finance");
  const canAccessSha = roleConfig.allowedModules.some(m => ["reception", "billing", "doctor", "admin"].includes(m));

  return (
    <div
      id="desktop-bottom-nav"
      className="hidden md:flex flex-col fixed bottom-0 left-0 right-0 z-40 select-none pointer-events-none drop-shadow-2xl"
    >
      {/* Prominent Visible Wave Top Edge Silhouette with Dynamic Shadow Motion Effect */}
      <div className="w-full h-10 md:h-12 overflow-visible leading-none relative -mb-0.5 z-10">
        {/* Animated Moving Wave Top Edge Shadow Beam */}
        <motion.div
          className="absolute -top-1.5 h-8 w-72 md:w-96 bg-gradient-to-r from-transparent via-yellow-500/40 md:via-yellow-400/50 to-transparent blur-md rounded-full pointer-events-none z-20"
          initial={{ left: "-30%" }}
          animate={{ left: "110%" }}
          transition={{
            repeat: Infinity,
            duration: 4.5,
            ease: "easeInOut",
          }}
        />

        {/* Pulsing Ambient Top Edge Shadow Glow */}
        <motion.div
          className="absolute -top-1.5 left-0 right-0 h-5 bg-gradient-to-t from-yellow-500/15 via-black/10 to-transparent blur-xs pointer-events-none z-20"
          animate={{
            opacity: [0.35, 0.7, 0.35],
          }}
          transition={{
            repeat: Infinity,
            duration: 3,
            ease: "easeInOut",
          }}
        />

        <svg
          viewBox="0 0 1440 60"
          fill="none"
          preserveAspectRatio="none"
          className="w-full h-full block drop-shadow-[0_-4px_12px_rgba(234,179,8,0.25)]"
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

      {/* Main Bar Container with Balanced Height, White Background, and Centered Buttons */}
      <div className="bg-white border-t border-slate-100/80 shadow-[0_-12px_30px_-5px_rgba(0,0,0,0.12)] px-3 lg:px-6 xl:px-8 py-3 lg:py-3.5 xl:py-4 pointer-events-auto relative overflow-hidden">
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

        <div className="w-full flex items-center justify-between xl:justify-center gap-2 lg:gap-4 xl:gap-6 relative z-10 overflow-x-auto no-scrollbar">
          
          {/* Center-aligned Navigation Module Switcher Tabs positioned closer to action buttons */}
          <div className="flex items-center gap-1.5 lg:gap-2 xl:gap-2.5 py-0.5 shrink-0 overflow-x-auto no-scrollbar">
            {visibleNavItems.map((item) => {
              const Icon = item.icon;
              const isActive = activeTab === item.id;

              return (
                <button
                  key={item.id}
                  id={`desktop-bottom-nav-${item.id}`}
                  onClick={() => {
                    setActiveTab(item.id);
                  }}
                  title={`${item.label} (${item.shortcut})`}
                  className={`group relative px-2.5 lg:px-3.5 xl:px-4 py-2 lg:py-2.5 rounded-xl text-xs font-semibold tracking-wide transition-all duration-300 ease-out flex items-center gap-1.5 lg:gap-2 shrink-0 cursor-pointer overflow-hidden ${
                    isActive
                      ? "bg-gradient-to-r from-emerald-600 via-emerald-500 to-green-500 text-white animate-green-shadow-motion border border-emerald-300 font-bold scale-105"
                      : "text-slate-700 hover:text-emerald-950 bg-slate-50/80 hover:bg-emerald-50/90 border border-slate-200/90 hover:border-emerald-400 animate-green-subtle-shadow hover:shadow-[0_0_24px_rgba(16,185,129,0.65)] hover:-translate-y-0.5"
                  }`}
                >
                  {/* Active Dynamic Green Shadow Motion Ambient Light Halo */}
                  {isActive && (
                    <>
                      {/* Sweeping Green Motion Light Beam */}
                      <span className="absolute inset-0 w-full h-full pointer-events-none overflow-hidden rounded-xl">
                        <span className="absolute -inset-full top-0 bottom-0 w-1/2 bg-gradient-to-r from-transparent via-white/40 to-transparent animate-green-ray-sweep pointer-events-none" />
                      </span>
                      {/* Deep Green Inner Glow Halo */}
                      <span className="absolute -inset-0.5 bg-gradient-to-r from-emerald-400 to-green-400 opacity-40 blur-[4px] rounded-xl pointer-events-none animate-pulse" />
                    </>
                  )}

                  {/* Animated Green Background Light Glow on Inactive Hover */}
                  {!isActive && (
                    <>
                      <span className="absolute inset-0 bg-gradient-to-r from-emerald-500/0 via-emerald-400/30 to-emerald-500/0 opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none" />
                      <span className="absolute -inset-1 bg-emerald-400/35 blur-md opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none rounded-xl" />
                      {/* Moving light beam on hover */}
                      <span className="absolute inset-0 overflow-hidden rounded-xl opacity-0 group-hover:opacity-100 pointer-events-none">
                        <span className="absolute -inset-full w-1/2 bg-gradient-to-r from-transparent via-emerald-400/40 to-transparent animate-green-ray-sweep" />
                      </span>
                    </>
                  )}

                  <Icon className={`relative z-10 w-4.5 h-4.5 transition-transform duration-200 group-hover:scale-110 ${
                    isActive ? "text-white drop-shadow-[0_0_8px_rgba(255,255,255,0.7)]" : "text-slate-600 group-hover:text-emerald-700"
                  }`} />
                  <span className="relative z-10 whitespace-nowrap">{item.label}</span>
                  {isActive && (
                    <span className="relative z-10 w-1.5 h-1.5 rounded-full bg-white shadow-[0_0_8px_#ffffff] animate-ping" />
                  )}
                </button>
              );
            })}

            {canAccessQueue && queueCount > 0 && (
              <button
                onClick={() => setActiveTab("queue")}
                className="relative flex items-center gap-2 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 px-3.5 py-3 rounded-xl border border-emerald-300/80 animate-green-shadow-motion text-xs font-bold transition-all cursor-pointer shrink-0 ml-1 hover:-translate-y-0.5 overflow-hidden group"
                title="View Live Waiting Queue"
              >
                {/* Moving Green Light Sweep */}
                <span className="absolute inset-0 overflow-hidden rounded-xl pointer-events-none">
                  <span className="absolute -inset-full w-1/2 bg-gradient-to-r from-transparent via-emerald-400/30 to-transparent animate-green-ray-sweep" />
                </span>
                <Ticket className="relative z-10 w-4.5 h-4.5 text-emerald-600 group-hover:scale-110 transition-transform" />
                <span className="relative z-10 whitespace-nowrap">{queueCount} Queue</span>
              </button>
            )}
          </div>

          {/* Far Right Action Buttons (Chat Inbox, Referrals, SHA & M-PESA Trigger Hub) */}
          <div className="flex items-center gap-2.5 shrink-0 pl-3.5 border-l border-slate-200 ml-2">
            {/* Quick Internal Chat / Role Inbox Launcher */}
            {onOpenChat && (
              <button
                id="desktop-bottom-nav-chat"
                onClick={onOpenChat}
                className="relative flex items-center gap-2 bg-gradient-to-r from-purple-700 to-indigo-700 hover:from-purple-600 hover:to-indigo-600 text-white px-3.5 py-3 rounded-xl text-xs font-bold animate-green-shadow-motion border border-purple-400/50 transition-all duration-200 cursor-pointer active:scale-95 group whitespace-nowrap hover:-translate-y-0.5 overflow-hidden"
                title="Open Internal Role Chat & Notification Inbox"
              >
                <span className="absolute inset-0 overflow-hidden rounded-xl pointer-events-none">
                  <span className="absolute -inset-full w-1/2 bg-gradient-to-r from-transparent via-white/30 to-transparent animate-green-ray-sweep" />
                </span>
                <div className="relative z-10 flex items-center">
                  <MessageSquare className="w-4.5 h-4.5 text-purple-200 group-hover:scale-110 transition-transform" />
                  {unreadChatCount > 0 && (
                    <span className="absolute -top-1 -right-1.5 px-1.5 py-0.2 bg-rose-500 text-white text-[9px] font-black rounded-full ring-1 ring-white animate-pulse">
                      {unreadChatCount > 99 ? "99+" : unreadChatCount}
                    </span>
                  )}
                </div>
                <span className="relative z-10">Chat Inbox</span>
              </button>
            )}

            {/* Quick M-Pesa STK Launcher */}
            {canAccessMpesa && (
              <button
                id="desktop-bottom-nav-mpesa"
                onClick={onOpenMpesa}
                className="relative flex items-center gap-2 bg-gradient-to-r from-emerald-600 to-green-500 hover:from-emerald-500 hover:to-green-400 text-white px-4 py-3 rounded-xl text-xs font-bold animate-green-shadow-motion border border-emerald-300/60 transition-all duration-200 cursor-pointer active:scale-95 group whitespace-nowrap hover:-translate-y-0.5 overflow-hidden"
                title="Trigger M-PESA STK Push Prompt"
              >
                {/* Sweeping Green Motion Light Beam */}
                <span className="absolute inset-0 overflow-hidden rounded-xl pointer-events-none">
                  <span className="absolute -inset-full w-1/2 bg-gradient-to-r from-transparent via-white/35 to-transparent animate-green-ray-sweep" />
                </span>
                <Smartphone className="relative z-10 w-4.5 h-4.5 text-emerald-100 group-hover:scale-110 transition-transform drop-shadow-[0_0_6px_rgba(255,255,255,0.6)]" />
                <span className="relative z-10">M-PESA Pay</span>
              </button>
            )}

            {/* Quick SHA Portal Launcher */}
            {canAccessSha && (
              <button
                id="desktop-bottom-nav-sha"
                onClick={onOpenSha}
                className="relative flex items-center gap-2 bg-gradient-to-r from-teal-700 to-emerald-700 hover:from-teal-600 hover:to-emerald-600 text-white px-4 py-3 rounded-xl text-xs font-bold animate-green-shadow-motion border border-emerald-400/50 transition-all duration-200 cursor-pointer active:scale-95 group whitespace-nowrap hover:-translate-y-0.5 overflow-hidden"
                title="Open SHA / Taifa Care Biometric & Pre-Auth Portal"
              >
                {/* Sweeping Green Motion Light Beam */}
                <span className="absolute inset-0 overflow-hidden rounded-xl pointer-events-none">
                  <span className="absolute -inset-full w-1/2 bg-gradient-to-r from-transparent via-emerald-300/35 to-transparent animate-green-ray-sweep" />
                </span>
                <ShieldCheck className="relative z-10 w-4.5 h-4.5 text-emerald-100 group-hover:scale-110 transition-transform drop-shadow-[0_0_6px_rgba(255,255,255,0.6)]" />
                <span className="relative z-10">SHA Portal</span>
              </button>
            )}
          </div>

        </div>
      </div>
    </div>
  );
}
