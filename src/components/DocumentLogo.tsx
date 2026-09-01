import React from "react";
import { Hospital, Building2 } from "lucide-react";

export const DEFAULT_BRAND_LOGO = "https://i.pinimg.com/1200x/0d/21/0a/0d210ae7221bc218df223d59b16d2198.jpg";

/**
 * Returns the currently active platform / hospital logo URL from localStorage,
 * falling back to the official high-resolution brand logo.
 */
export function getPlatformLogoUrl(): string {
  try {
    if (typeof window !== "undefined" && window.localStorage) {
      return (
        window.localStorage.getItem("platform_logo_url") ||
        window.localStorage.getItem("hospital_logo_url") ||
        DEFAULT_BRAND_LOGO
      );
    }
  } catch {
    // ignore
  }
  return DEFAULT_BRAND_LOGO;
}

export interface DocumentLogoProps {
  size?: "xs" | "sm" | "md" | "lg" | "xl" | "thermal" | "watermark";
  className?: string;
  shape?: "circle" | "rounded" | "square";
  alt?: string;
  showFallbackIcon?: boolean;
  border?: boolean;
}

export default function DocumentLogo({
  size = "md",
  className = "",
  shape = "circle",
  alt = "Hospital Emblem & Logo",
  showFallbackIcon = true,
  border = true
}: DocumentLogoProps) {
  const [imgError, setImgError] = React.useState(false);
  const logoUrl = getPlatformLogoUrl();

  const sizeClasses = {
    xs: "w-6 h-6",
    sm: "w-8 h-8",
    thermal: "w-10 h-10 sm:w-12 sm:h-12",
    md: "w-12 h-12 sm:w-14 sm:h-14",
    lg: "w-16 h-16 sm:w-18 sm:h-18",
    xl: "w-20 h-20 sm:w-24 sm:h-24",
    watermark: "w-48 h-48 sm:w-64 sm:h-64"
  }[size];

  const shapeClasses = {
    circle: "rounded-full",
    rounded: "rounded-xl",
    square: "rounded-none"
  }[shape];

  const borderClass = border ? "border border-slate-300 shadow-2xs" : "";

  if (imgError || !logoUrl) {
    if (!showFallbackIcon) return null;
    return (
      <div
        className={`bg-emerald-50 text-emerald-800 flex items-center justify-center shrink-0 overflow-hidden ${sizeClasses} ${shapeClasses} ${borderClass} ${className}`}
      >
        <Hospital className="w-3/5 h-3/5 text-emerald-700" />
      </div>
    );
  }

  return (
    <div
      className={`relative shrink-0 overflow-hidden bg-white flex items-center justify-center ${sizeClasses} ${shapeClasses} ${borderClass} ${className}`}
    >
      <img
        src={logoUrl}
        alt={alt}
        className={`w-full h-full object-cover ${shapeClasses}`}
        referrerPolicy="no-referrer"
        onError={() => setImgError(true)}
      />
    </div>
  );
}
