import React, { useEffect, useState } from "react";
import { Hospital } from "lucide-react";

export const DEFAULT_BRAND_LOGO = "https://i.pinimg.com/1200x/0d/21/0a/0d210ae7221bc218df223d59b16d2198.jpg";

/**
 * Returns the currently active platform / system interface logo URL from localStorage.
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

/**
 * Returns the dedicated logo URL specifically configured for clinical documents,
 * patient invoices, lab reports, receipts, and official forms.
 * Falls back to the platform system logo if no separate document logo is set.
 */
export function getDocumentLogoUrl(): string {
  try {
    if (typeof window !== "undefined" && window.localStorage) {
      const docLogo =
        window.localStorage.getItem("platform_document_logo_url") ||
        window.localStorage.getItem("document_logo_url");
      if (docLogo && docLogo.trim() !== "") {
        return docLogo.trim();
      }
      return getPlatformLogoUrl();
    }
  } catch {
    // ignore
  }
  return DEFAULT_BRAND_LOGO;
}

/**
 * Returns the hospital/facility name retained for official medical documents,
 * reports, letters, and certificates.
 */
export function getHospitalFacilityName(): string {
  try {
    if (typeof window !== "undefined" && window.localStorage) {
      const explicit = window.localStorage.getItem("hospital_facility_name");
      if (explicit && explicit.trim() && explicit.trim().toUpperCase() !== "HMIS") {
        return explicit.trim();
      }
      const brand = window.localStorage.getItem("platform_custom_brand_name");
      if (brand && brand.trim() && brand.trim().toUpperCase() !== "HMIS") {
        return brand.trim();
      }
    }
  } catch {
    // ignore
  }
  return "The Tassia Hill Hospital";
}

export interface DocumentLogoProps {
  size?: "xs" | "sm" | "md" | "lg" | "xl" | "thermal" | "watermark";
  className?: string;
  shape?: "circle" | "rounded" | "square";
  alt?: string;
  showFallbackIcon?: boolean;
  border?: boolean;
  src?: string;
  url?: string;
  type?: "document" | "system";
}

export default function DocumentLogo({
  size = "md",
  className = "",
  shape = "circle",
  alt = "Hospital Document Emblem",
  showFallbackIcon = true,
  border = true,
  src,
  url,
  type = "document"
}: DocumentLogoProps) {
  const [imgError, setImgError] = useState(false);
  const [currentUrl, setCurrentUrl] = useState<string>(() => {
    if (src) return src;
    if (url) return url;
    return type === "document" ? getDocumentLogoUrl() : getPlatformLogoUrl();
  });

  useEffect(() => {
    if (src || url) {
      setCurrentUrl(src || url || "");
      setImgError(false);
      return;
    }

    const updateLogo = () => {
      setCurrentUrl(type === "document" ? getDocumentLogoUrl() : getPlatformLogoUrl());
      setImgError(false);
    };

    updateLogo();
    window.addEventListener("platform_branding_changed", updateLogo);
    window.addEventListener("platform_document_logo_changed", updateLogo);
    return () => {
      window.removeEventListener("platform_branding_changed", updateLogo);
      window.removeEventListener("platform_document_logo_changed", updateLogo);
    };
  }, [src, url, type]);

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

  if (imgError || !currentUrl) {
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
        src={currentUrl}
        alt={alt}
        className={`w-full h-full object-cover ${shapeClasses}`}
        referrerPolicy="no-referrer"
        onError={() => setImgError(true)}
      />
    </div>
  );
}

