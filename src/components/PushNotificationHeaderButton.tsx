import React, { useState } from "react";
import { Bell } from "lucide-react";
import { useWebPush } from "../hooks/useWebPush";
import { PushNotificationManagerModal } from "./PushNotificationManagerModal";

interface PushNotificationHeaderButtonProps {
  variant?: "header" | "header-mobile" | "compact";
  className?: string;
  currentUser?: {
    name?: string;
    role?: string;
    department?: string;
    email?: string;
  };
}

export const PushNotificationHeaderButton: React.FC<PushNotificationHeaderButtonProps> = ({
  variant = "header",
  className = "",
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
      {variant === "header-mobile" ? (
        <button
          id="btn-push-notification-mobile"
          onClick={() => setIsOpen(true)}
          title={isSubscribed ? "Web Push Active (Click to manage)" : "Enable Web Push Notifications"}
          className={`p-1 text-white hover:text-white/80 transition-all active:scale-90 cursor-pointer relative ${className}`}
        >
          <Bell className="w-5 h-5 text-white" />
          {isSubscribed ? (
            <span className="absolute -top-0.5 -right-0.5 w-2 h-2 rounded-full bg-emerald-400 ring-1 ring-slate-950" />
          ) : (
            <span className="absolute -top-0.5 -right-0.5 w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
          )}
        </button>
      ) : variant === "compact" ? (
        <button
          id="btn-push-notification-compact"
          onClick={() => setIsOpen(true)}
          className={`flex items-center gap-1 px-2 py-1 rounded-md bg-emerald-700 hover:bg-emerald-800 text-white text-[11px] font-semibold transition cursor-pointer ${className}`}
          title={isSubscribed ? "Web Push Active" : "Enable Web Push"}
        >
          <Bell className="w-3 h-3 text-white" />
          <span>{isSubscribed ? "Active" : "Push"}</span>
        </button>
      ) : (
        <button
          id="header-push-notification-btn"
          onClick={() => setIsOpen(true)}
          className={`relative flex items-center justify-center p-1.5 text-white hover:text-white/80 hover:scale-110 active:scale-95 transition-all duration-200 cursor-pointer ${className}`}
          title={isSubscribed ? "Web Push Active (Click to manage notifications)" : "Enable Web Push Notifications"}
        >
          <Bell className="w-6 h-6 lg:w-7 lg:h-7 text-white" />
          {isSubscribed ? (
            <span className="absolute top-0.5 right-0.5 w-2 h-2 rounded-full bg-emerald-400 ring-1 ring-slate-950" />
          ) : (
            <span className="absolute top-0.5 right-0.5 w-2 h-2 rounded-full bg-amber-400 animate-pulse ring-1 ring-slate-950" />
          )}
        </button>
      )}

      <PushNotificationManagerModal
        isOpen={isOpen}
        onClose={() => setIsOpen(false)}
        currentUser={currentUser}
      />
    </>
  );
};
