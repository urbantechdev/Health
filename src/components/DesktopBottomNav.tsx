import React, { useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  Smartphone,
  ShieldCheck,
  Ticket,
  ArrowRightLeft,
  MessageSquare,
  FileDown,
  Keyboard,
  Activity,
  X,
  ShoppingCart,
  Monitor,
  Scale
} from "lucide-react";
import { SystemRole, getRoleConfig } from "../constants/roles";
import { downloadReadmeFile } from "../lib/downloadReadme";

interface DesktopBottomNavProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  currentUserRole: SystemRole;
  queueCount?: number;
  openTicketsCount?: number;
  pharmacyCount?: number;
  journeyCount?: number;
  pharmacyEnabled?: boolean;
  queueEnabled?: boolean;
  isOffline?: boolean;
  onOpenMpesa: () => void;
  onOpenSha: () => void;
  onOpenChat?: () => void;
  unreadChatCount?: number;
  onOpenTransfer?: () => void;
  pendingTransfersCount?: number;
  onOpenPolicyTerms?: (defaultTab?: "terms" | "privacy" | "infosec" | "governance" | "signoff") => void;
  checkTabPermission: (tabId: string) => { allowed: boolean; reason?: string };
}

export default function DesktopBottomNav({
  activeTab,
  setActiveTab,
  currentUserRole,
  queueCount = 0,
  openTicketsCount = 0,
  pharmacyCount = 0,
  journeyCount = 0,
  pharmacyEnabled = true,
  queueEnabled = true,
  onOpenMpesa,
  onOpenSha,
  onOpenChat,
  unreadChatCount = 0,
  onOpenTransfer,
  pendingTransfersCount = 0,
  onOpenPolicyTerms,
  checkTabPermission,
}: DesktopBottomNavProps) {
  const [showShortcuts, setShowShortcuts] = useState(false);
  const roleConfig = getRoleConfig(currentUserRole);

  const canAccessMpesa =
    roleConfig.canDispenseAndCheckout ||
    roleConfig.allowedModules.includes("billing") ||
    roleConfig.allowedModules.includes("pharmacy") ||
    roleConfig.allowedModules.includes("finance") ||
    roleConfig.allowedModules.includes("admin");

  const canAccessSha = roleConfig.allowedModules.some((m) =>
    ["reception", "billing", "doctor", "triage", "admin"].includes(m)
  );

  const canAccessTransfers =
    Boolean(onOpenTransfer) &&
    roleConfig.allowedModules.some((m) =>
      ["doctor", "triage", "admissions", "transfers", "reception", "admin"].includes(m)
    );

  // Bottom Navigation Station items: Pharmacy, Patient Journey, Patient Ticket, Live Queue
  const bottomStationTabs = [
    {
      id: "pharmacy",
      label: "Pharmacy POS",
      subtitle: "Dispense & Stock",
      icon: ShoppingCart,
      count: pharmacyCount,
      enabled: pharmacyEnabled && checkTabPermission("pharmacy").allowed,
      shortcut: "Alt + 5",
      badgeColor: "bg-gradient-to-r from-emerald-500 to-teal-500",
    },
    {
      id: "journey",
      label: "Patient Journey",
      subtitle: "Timeline & Care",
      icon: Activity,
      count: journeyCount,
      enabled: checkTabPermission("journey").allowed,
      shortcut: "Alt + J",
      badgeColor: "bg-gradient-to-r from-blue-500 to-indigo-500",
    },
    {
      id: "tickets",
      label: "Patient Tickets",
      subtitle: "Queue Tokens",
      icon: Ticket,
      count: openTicketsCount,
      enabled: checkTabPermission("tickets").allowed,
      shortcut: "Alt + K",
      badgeColor: "bg-gradient-to-r from-purple-500 to-pink-500",
    },
    {
      id: "queue",
      label: "Live Queue",
      subtitle: "Triage & Consult",
      icon: Monitor,
      count: queueCount,
      enabled: queueEnabled && checkTabPermission("queue").allowed,
      shortcut: "Alt + Q",
      badgeColor: "bg-gradient-to-r from-amber-500 to-orange-500",
    },
  ];

  const keyboardShortcutsList = [
    { key: "Alt + 1", desc: "Dashboard Overview" },
    { key: "Alt + 2", desc: "Reception Desk" },
    { key: "Alt + 3", desc: "Doctor Consultation" },
    { key: "Alt + 4", desc: "Lab & Diagnostics" },
    { key: "Alt + 5", desc: "Pharmacy POS" },
    { key: "Alt + 6", desc: "Split Billing & Claims" },
    { key: "Alt + 7", desc: "Finance & Accounts" },
    { key: "Alt + 8", desc: "Admin & Settings" },
    { key: "Alt + 9 / G", desc: "User Guide & Manual" },
    { key: "Alt + J", desc: "Patient Journey" },
    { key: "Alt + K", desc: "Patient Tickets" },
    { key: "Alt + Q", desc: "Live Queue Board" },
  ];

  return (
    <>
      {/* Keyboard Shortcuts Overlay Modal */}
      <AnimatePresence>
        {showShortcuts && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              className="bg-slate-900 border border-slate-700/80 rounded-3xl max-w-lg w-full p-7 shadow-2xl text-white relative overflow-hidden"
            >
              {/* Header */}
              <div className="flex items-center justify-between pb-4 border-b border-slate-800">
                <div className="flex items-center gap-3">
                  <div className="p-2.5 rounded-2xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                    <Keyboard className="w-6 h-6" />
                  </div>
                  <div>
                    <h3 className="text-base font-black text-white">System Hotkeys & Shortcuts</h3>
                    <p className="text-xs text-slate-400">Rapid desktop navigation keys</p>
                  </div>
                </div>
                <button
                  onClick={() => setShowShortcuts(false)}
                  className="p-2 rounded-xl hover:bg-slate-800 text-slate-400 hover:text-white transition-colors cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Grid */}
              <div className="grid grid-cols-2 gap-3 py-5 text-xs">
                {keyboardShortcutsList.map((item, idx) => (
                  <div
                    key={idx}
                    className="flex items-center justify-between p-2.5 rounded-2xl bg-slate-950/60 border border-slate-800/80"
                  >
                    <span className="text-slate-300 font-semibold text-xs">{item.desc}</span>
                    <kbd className="px-2.5 py-1 rounded-lg bg-slate-800 text-emerald-400 font-mono text-xs font-bold border border-slate-700">
                      {item.key}
                    </kbd>
                  </div>
                ))}
              </div>

              {/* Footer */}
              <div className="pt-4 border-t border-slate-800 flex justify-between items-center text-xs text-slate-400">
                <span>Hold <strong className="text-slate-200">Alt</strong> + key to switch instantly</span>
                <button
                  onClick={() => setShowShortcuts(false)}
                  className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold transition-all text-xs cursor-pointer shadow-md"
                >
                  Got It
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Fixed Desktop Operational Action & Navigation Dock */}
      <div
        id="desktop-bottom-nav"
        className="hidden md:flex flex-col fixed bottom-0 left-0 right-0 z-40 select-none pointer-events-none drop-shadow-2xl"
      >
        {/* Prominent Visible Wave Top Edge Silhouette with Dynamic Shadow Motion Effect */}
        <div className="w-full h-12 md:h-14 overflow-visible leading-none relative -mb-0.5 z-10">
          {/* Animated Moving Wave Top Edge Shadow Beam */}
          <motion.div
            className="absolute -top-2 h-8 w-80 md:w-112 bg-gradient-to-r from-transparent via-emerald-500/35 md:via-emerald-400/45 to-transparent blur-md rounded-full pointer-events-none z-20"
            initial={{ left: "-30%" }}
            animate={{ left: "110%" }}
            transition={{
              repeat: Infinity,
              duration: 5.5,
              ease: "easeInOut",
            }}
          />

          {/* Pulsing Ambient Top Edge Shadow Glow */}
          <motion.div
            className="absolute -top-1 left-0 right-0 h-5 bg-gradient-to-t from-emerald-500/15 via-black/5 to-transparent blur-xs pointer-events-none z-20"
            animate={{
              opacity: [0.35, 0.7, 0.35],
            }}
            transition={{
              repeat: Infinity,
              duration: 3.5,
              ease: "easeInOut",
            }}
          />

          <svg
            viewBox="0 0 1440 60"
            fill="none"
            preserveAspectRatio="none"
            className="w-full h-full block drop-shadow-[0_-6px_16px_rgba(16,185,129,0.2)]"
          >
            <defs>
              <linearGradient id="waveGlowGradient" x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" stopColor="#059669" />
                <stop offset="35%" stopColor="#10b981" />
                <stop offset="70%" stopColor="#059669" />
                <stop offset="100%" stopColor="#10b981" />
              </linearGradient>
            </defs>

            {/* Wave Solid Background connected to main white dock */}
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

        {/* Main Bar Container with White Background - Generous Double Height & Padding */}
        <div className="bg-white border-t border-slate-200/90 shadow-[0_-16px_40px_-8px_rgba(0,0,0,0.12)] px-4 lg:px-8 py-3.5 lg:py-4.5 pointer-events-auto relative overflow-hidden min-h-[82px] lg:min-h-[96px] flex items-center">
          
          {/* Continuous Motion Ambient Green Ray Shimmer */}
          <div className="absolute inset-0 pointer-events-none overflow-hidden z-0">
            <motion.div
              className="absolute top-0 bottom-0 w-64 md:w-96 bg-gradient-to-r from-transparent via-emerald-500/10 to-transparent blur-xl -skew-x-12"
              initial={{ left: "-40%" }}
              animate={{ left: "120%" }}
              transition={{
                repeat: Infinity,
                duration: 6.5,
                ease: "easeInOut",
                repeatDelay: 1.5,
              }}
            />
          </div>

          <div className="w-full flex items-center justify-between gap-4 lg:gap-6 relative z-10">
            
            {/* Primary Stations (Pharmacy POS, Patient Journey, Patient Tickets, Live Queue) with Green Smoke Background Aura */}
            <div className="flex items-center gap-3 lg:gap-4.5 flex-1 max-w-4xl">
              {bottomStationTabs
                .filter((tab) => tab.enabled)
                .map((tab) => {
                  const Icon = tab.icon;
                  const isActive = activeTab === tab.id;

                  return (
                    <div key={tab.id} className="relative flex-1 max-w-[230px] group">
                      {/* Deep Dynamic Green Smoke Shadow Layer 1 (Drifting Cloud) */}
                      <div
                        className={`absolute -inset-2.5 rounded-3xl bg-gradient-to-r from-emerald-500/40 via-green-400/50 to-teal-500/40 pointer-events-none transition-opacity duration-300 ${
                          isActive
                            ? "animate-green-smoke-aura opacity-100"
                            : "opacity-40 group-hover:opacity-85 animate-green-smoke-aura"
                        }`}
                        style={{
                          filter: "blur(14px)",
                        }}
                      />

                      {/* Secondary Green Smoke Cloud Layer 2 (Organic Swirling Puff) */}
                      <div
                        className={`absolute -inset-2 rounded-3xl bg-gradient-to-tr from-green-400/30 via-emerald-500/40 to-lime-400/25 pointer-events-none transition-opacity duration-300 ${
                          isActive
                            ? "animate-green-smoke-secondary opacity-100"
                            : "opacity-30 group-hover:opacity-75 animate-green-smoke-secondary"
                        }`}
                        style={{
                          filter: "blur(18px)",
                        }}
                      />

                      {/* Interactive Button */}
                      <motion.button
                        id={`desktop-bottom-tab-${tab.id}`}
                        onClick={() => setActiveTab(tab.id)}
                        whileHover={{ scale: 1.03, y: -2 }}
                        whileTap={{ scale: 0.97 }}
                        title={`${tab.label} (${tab.shortcut})`}
                        className={`relative w-full flex items-center gap-3 px-4 lg:px-6 py-2.5 lg:py-3.5 rounded-2xl text-sm font-black transition-all duration-200 cursor-pointer shadow-lg border min-h-[54px] lg:min-h-[62px] justify-center z-10 ${
                          isActive
                            ? "bg-gradient-to-r from-emerald-600 to-teal-600 text-white border-emerald-400 shadow-emerald-900/30 ring-2 ring-emerald-300/60"
                            : "bg-white/95 hover:bg-white text-slate-800 hover:text-slate-950 border-emerald-200/80 hover:border-emerald-400"
                        }`}
                      >
                        {/* Active Indicator Background Pill */}
                        {isActive && (
                          <motion.div
                            layoutId="activeBottomStationPill"
                            className="absolute inset-0 bg-gradient-to-r from-emerald-600 to-teal-600 rounded-2xl -z-10"
                            transition={{ type: "spring", stiffness: 400, damping: 30 }}
                          />
                        )}

                        <div className="relative flex items-center justify-center shrink-0">
                          <Icon className={`w-5 h-5 lg:w-6 lg:h-6 transition-colors ${isActive ? "text-white drop-shadow-[0_0_8px_rgba(255,255,255,0.7)]" : "text-emerald-700 group-hover:text-emerald-800"}`} />
                          
                          {/* Live Notification / Waiting Count Badge */}
                          {tab.count > 0 && (
                            <span
                              className={`absolute -top-2 -right-3 px-2 py-0.5 text-[10px] lg:text-xs font-black rounded-full text-white shadow-md ring-2 ring-white animate-pulse flex items-center justify-center min-w-[20px] h-5 ${tab.badgeColor}`}
                            >
                              {tab.count > 99 ? "99+" : tab.count}
                            </span>
                          )}
                        </div>

                        <div className="flex flex-col text-left min-w-0">
                          <span className="whitespace-nowrap font-black text-xs lg:text-sm tracking-tight truncate leading-tight">
                            {tab.label}
                          </span>
                          <span className={`text-[10px] font-medium truncate ${isActive ? "text-emerald-100" : "text-slate-500"}`}>
                            {tab.subtitle}
                          </span>
                        </div>

                        {/* Active Status Pip */}
                        {isActive && (
                          <span className="w-2 h-2 rounded-full bg-emerald-200 animate-pulse ml-0.5 shrink-0 shadow-[0_0_6px_rgba(167,243,208,0.9)]" />
                        )}
                      </motion.button>
                    </div>
                  );
                })}
            </div>

            {/* RIGHT: Quick Action Modal Triggers with Green Smoke Shadows */}
            <div className="flex items-center gap-2.5 lg:gap-3 shrink-0">
              
              {/* Keyboard Shortcuts Trigger */}
              <div className="relative hidden xl:block group">
                <div className="absolute -inset-1.5 rounded-2xl bg-emerald-400/25 pointer-events-none opacity-0 group-hover:opacity-75 blur-md transition-opacity duration-300 animate-green-smoke-aura" />
                <button
                  id="desktop-dock-shortcuts-btn"
                  onClick={() => setShowShortcuts(true)}
                  className="relative z-10 flex items-center gap-2 px-3.5 lg:px-4 py-2.5 lg:py-3 rounded-2xl bg-slate-100 hover:bg-slate-200 text-slate-700 hover:text-slate-950 text-xs lg:text-sm font-black border border-slate-300/90 transition-all cursor-pointer hover:shadow-md active:scale-95 min-h-[54px] lg:min-h-[62px]"
                  title="View Keyboard Hotkeys (Alt+...)"
                >
                  <Keyboard className="w-5 h-5 text-slate-500" />
                  <div className="flex flex-col text-left">
                    <span className="leading-tight">Hotkeys</span>
                    <span className="text-[10px] font-mono text-slate-400 font-normal">Alt+1..9</span>
                  </div>
                </button>
              </div>

              {/* Download System README.md Trigger */}
              <div className="relative hidden lg:block group">
                <div className="absolute -inset-1.5 rounded-2xl bg-emerald-500/30 pointer-events-none opacity-0 group-hover:opacity-80 blur-md transition-opacity duration-300 animate-green-smoke-aura" />
                <button
                  id="desktop-dock-readme-btn"
                  onClick={() => downloadReadmeFile("AfyaCare-HMS-Enterprise-Documentation.md")}
                  className="relative z-10 flex items-center gap-2 px-3.5 lg:px-4 py-2.5 lg:py-3 rounded-2xl bg-slate-100 hover:bg-emerald-50 text-slate-700 hover:text-emerald-800 text-xs lg:text-sm font-black border border-slate-300/90 hover:border-emerald-300 transition-all cursor-pointer hover:shadow-md active:scale-95 group min-h-[54px] lg:min-h-[62px]"
                  title="Download complete system architecture & setup documentation (README.md)"
                >
                  <FileDown className="w-5 h-5 text-emerald-600 group-hover:scale-110 transition-transform" />
                  <div className="flex flex-col text-left">
                    <span className="whitespace-nowrap leading-tight">Docs</span>
                    <span className="text-[10px] text-emerald-600 font-mono font-medium">README</span>
                  </div>
                </button>
              </div>

              {/* System Policy, Terms of Use & ODPC Data Protection Center */}
              {onOpenPolicyTerms && (
                <div className="relative hidden md:block group">
                  <div className="absolute -inset-1.5 rounded-2xl bg-emerald-500/30 pointer-events-none opacity-0 group-hover:opacity-80 blur-md transition-opacity duration-300 animate-green-smoke-aura" />
                  <button
                    id="desktop-dock-policy-terms-btn"
                    onClick={() => onOpenPolicyTerms("privacy")}
                    className="relative z-10 flex items-center gap-2 px-3.5 lg:px-4 py-2.5 lg:py-3 rounded-2xl bg-slate-100 hover:bg-emerald-50 text-slate-700 hover:text-emerald-900 text-xs lg:text-sm font-black border border-slate-300/90 hover:border-emerald-300 transition-all cursor-pointer hover:shadow-md active:scale-95 group min-h-[54px] lg:min-h-[62px]"
                    title="View System Policy, Kenya Data Protection Act (KDPA 2019) & Terms of Use"
                  >
                    <Scale className="w-5 h-5 text-emerald-700 group-hover:scale-110 transition-transform" />
                    <div className="flex flex-col text-left">
                      <span className="whitespace-nowrap leading-tight">Policies</span>
                      <span className="text-[10px] text-emerald-700 font-mono font-medium">ODPC / KDPA</span>
                    </div>
                  </button>
                </div>
              )}

              {/* Quick Patient Transfer Modal Launcher */}
              {canAccessTransfers && onOpenTransfer && (
                <div className="relative hidden xl:block group">
                  <div className="absolute -inset-1.5 rounded-2xl bg-emerald-500/30 pointer-events-none opacity-0 group-hover:opacity-80 blur-md transition-opacity duration-300 animate-green-smoke-aura" />
                  <button
                    id="desktop-dock-transfer-launcher"
                    onClick={onOpenTransfer}
                    className="relative z-10 flex items-center gap-2 px-3.5 lg:px-4 py-2.5 lg:py-3 rounded-2xl bg-slate-100 hover:bg-blue-50 text-slate-700 hover:text-blue-800 text-xs lg:text-sm font-black border border-slate-300/90 hover:border-blue-300 transition-all cursor-pointer hover:shadow-md active:scale-95 group min-h-[54px] lg:min-h-[62px]"
                    title="Initiate Inter-Departmental Transfer or MOH 268 Facility Referral"
                  >
                    <div className="relative flex items-center">
                      <ArrowRightLeft className="w-5 h-5 text-blue-600 group-hover:scale-110 transition-transform" />
                      {pendingTransfersCount > 0 && (
                        <span className="absolute -top-2 -right-2 px-1.5 py-0.5 bg-rose-500 text-white text-[10px] font-black rounded-full ring-2 ring-white animate-pulse">
                          {pendingTransfersCount > 99 ? "99+" : pendingTransfersCount}
                        </span>
                      )}
                    </div>
                    <div className="flex flex-col text-left">
                      <span className="whitespace-nowrap leading-tight">Transfer</span>
                      <span className="text-[10px] text-blue-600 font-medium">MOH 268</span>
                    </div>
                  </button>
                </div>
              )}

              {/* Internal Role Chat / Teleconsult Inbox Launcher with Green Smoke Shadow */}
              {onOpenChat && (
                <div className="relative group">
                  <div className="absolute -inset-2 rounded-3xl bg-gradient-to-r from-emerald-500/50 via-green-400/60 to-purple-500/40 pointer-events-none opacity-60 group-hover:opacity-100 blur-lg transition-opacity duration-300 animate-green-smoke-aura" />
                  <button
                    id="desktop-dock-chat-launcher"
                    onClick={onOpenChat}
                    className="relative z-10 flex items-center gap-2.5 bg-gradient-to-r from-purple-700 to-indigo-700 hover:from-purple-600 hover:to-indigo-600 text-white px-4 lg:px-5 py-2.5 lg:py-3 rounded-2xl text-xs lg:text-sm font-black border border-purple-400/50 transition-all duration-200 cursor-pointer active:scale-95 group whitespace-nowrap hover:-translate-y-0.5 overflow-hidden shadow-lg min-h-[54px] lg:min-h-[62px]"
                    title="Open Internal Role Chat & Notification Inbox"
                  >
                    <span className="absolute inset-0 overflow-hidden rounded-2xl pointer-events-none">
                      <span className="absolute -inset-full w-1/2 bg-gradient-to-r from-transparent via-white/30 to-transparent animate-green-ray-sweep" />
                    </span>
                    <div className="relative z-10 flex items-center">
                      <MessageSquare className="w-5 h-5 lg:w-6 lg:h-6 text-purple-200 group-hover:scale-110 transition-transform" />
                      {unreadChatCount > 0 && (
                        <span className="absolute -top-2 -right-2 px-1.5 py-0.5 bg-rose-500 text-white text-[10px] font-black rounded-full ring-2 ring-white animate-pulse">
                          {unreadChatCount > 99 ? "99+" : unreadChatCount}
                        </span>
                      )}
                    </div>
                    <div className="relative z-10 flex flex-col text-left">
                      <span className="leading-tight">Chat Inbox</span>
                      <span className="text-[10px] text-purple-200 font-normal">Internal Comms</span>
                    </div>
                  </button>
                </div>
              )}

              {/* SHA / Taifa Care & FHIR Digital Health Hub Launcher with Green Smoke Shadow */}
              {canAccessSha && (
                <div className="relative group">
                  <div className="absolute -inset-2.5 rounded-3xl bg-gradient-to-r from-emerald-500/60 via-green-400/70 to-teal-400/50 pointer-events-none opacity-70 group-hover:opacity-100 blur-lg transition-opacity duration-300 animate-green-smoke-aura" />
                  <button
                    id="desktop-dock-sha-launcher"
                    onClick={onOpenSha}
                    className="relative z-10 flex items-center gap-2.5 bg-gradient-to-r from-teal-700 to-emerald-700 hover:from-teal-600 hover:to-emerald-600 text-white px-4 lg:px-5 py-2.5 lg:py-3 rounded-2xl text-xs lg:text-sm font-black border border-emerald-400/60 transition-all duration-200 cursor-pointer active:scale-95 group whitespace-nowrap hover:-translate-y-0.5 overflow-hidden shadow-lg min-h-[54px] lg:min-h-[62px]"
                    title="Open Kenya Digital Health Integration Hub (SHA Eligibility, ICD-10/Tariffs, e-Claims & FHIR SHR)"
                  >
                    <span className="absolute inset-0 overflow-hidden rounded-2xl pointer-events-none">
                      <span className="absolute -inset-full w-1/2 bg-gradient-to-r from-transparent via-emerald-300/35 to-transparent animate-green-ray-sweep" />
                    </span>
                    <ShieldCheck className="relative z-10 w-5 h-5 lg:w-6 lg:h-6 text-emerald-100 group-hover:scale-110 transition-transform drop-shadow-[0_0_8px_rgba(255,255,255,0.7)]" />
                    <div className="relative z-10 flex flex-col text-left">
                      <span className="leading-tight">SHA / FHIR Hub</span>
                      <span className="text-[10px] text-emerald-200 font-normal">Eligibility • e-Claims • SHR</span>
                    </div>
                  </button>
                </div>
              )}

              {/* M-Pesa STK Push Express Checkout Launcher with Green Smoke Shadow */}
              {canAccessMpesa && (
                <div className="relative group">
                  <div className="absolute -inset-2.5 rounded-3xl bg-gradient-to-r from-emerald-500/70 via-green-400/80 to-lime-400/60 pointer-events-none opacity-80 group-hover:opacity-100 blur-xl transition-opacity duration-300 animate-green-smoke-aura" />
                  <div className="absolute -inset-2 rounded-3xl bg-emerald-400/40 pointer-events-none opacity-50 group-hover:opacity-90 blur-md animate-green-smoke-secondary" />
                  <button
                    id="desktop-dock-mpesa-launcher"
                    onClick={onOpenMpesa}
                    className="relative z-10 flex items-center gap-2.5 bg-gradient-to-r from-emerald-600 to-green-500 hover:from-emerald-500 hover:to-green-400 text-white px-4 lg:px-5 py-2.5 lg:py-3 rounded-2xl text-xs lg:text-sm font-black border border-emerald-300/70 transition-all duration-200 cursor-pointer active:scale-95 group whitespace-nowrap hover:-translate-y-0.5 overflow-hidden shadow-xl min-h-[54px] lg:min-h-[62px]"
                    title="Trigger Instant M-PESA STK Push Prompt"
                  >
                    <span className="absolute inset-0 overflow-hidden rounded-2xl pointer-events-none">
                      <span className="absolute -inset-full w-1/2 bg-gradient-to-r from-transparent via-white/40 to-transparent animate-green-ray-sweep" />
                    </span>
                    <Smartphone className="relative z-10 w-5 h-5 lg:w-6 lg:h-6 text-emerald-100 group-hover:scale-110 transition-transform drop-shadow-[0_0_8px_rgba(255,255,255,0.7)]" />
                    <div className="relative z-10 flex flex-col text-left">
                      <span className="leading-tight">M-PESA Pay</span>
                      <span className="text-[10px] text-emerald-100 font-normal">Instant STK Push</span>
                    </div>
                  </button>
                </div>
              )}

            </div>

          </div>
        </div>
      </div>
    </>
  );
}
