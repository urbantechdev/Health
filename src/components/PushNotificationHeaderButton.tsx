import React, { useState } from "react";
import { Bell, BellRing, BellOff } from "lucide-react";
import { useWebPush } from "../hooks/useWebPush";
import { PushNotificationManagerModal } from "./PushNotificationManagerModal";

interface PushNotificationHeaderButtonProps {
  currentUser?: {
    name?: string;
    role?: string;
    department?: string;
    email?: string;
  };
}

export const PushNotificationHeaderButton: React.FC<PushNotificationHeaderButtonProps> = ({
  currentUser,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const { isSubscribed, subscriberCount } = useWebPush({
    name: currentUser?.name || "Medical Staff",
    role: currentUser?.role || "Staff",
    department: currentUser?.department || "General",
  });

  return (
    <>
      <button
        id="header-push-notification-btn"
        onClick={() => setIsOpen(true)}
        className={`relative flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl border text-xs font-bold transition shadow-2xs cursor-pointer ${
          isSubscribed
            ? "bg-emerald-50 text-emerald-800 border-emerald-300 hover:bg-emerald-100 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-600/40"
            : "bg-white text-slate-700 border-slate-200 hover:bg-slate-50 dark:bg-slate-900 dark:text-slate-300 dark:border-slate-800"
        }`}
        title={isSubscribed ? "Web Push Active (Click to manage)" : "Enable Web Push Notifications"}
      >
        {isSubscribed ? (
          <BellRing className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400 animate-pulse" />
        ) : (
          <Bell className="w-3.5 h-3.5 text-slate-500" />
        )}
        <span className="hidden md:inline">
          {isSubscribed ? "Push Active" : "Web Push"}
        </span>
        {isSubscribed && (
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 ring-2 ring-white dark:ring-slate-900" />
        )}
      </button>

      <PushNotificationManagerModal
        isOpen={isOpen}
        onClose={() => setIsOpen(false)}
        currentUser={currentUser}
      />
    </>
  );
};
