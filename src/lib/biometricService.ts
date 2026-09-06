import { db } from "./firebase";
import { doc, setDoc, onSnapshot } from "firebase/firestore";

export interface ClientPlatformInfo {
  isMobile: boolean;
  isAndroid: boolean;
  isIOS: boolean;
  isDesktop: boolean;
  userAgent: string;
}

export interface BiometricDevice {
  id: string;
  name: string;
  type: "mobile_fingerprint" | "remote_mobile" | "webauthn" | "smart_app_sdk" | "usb_hid" | "webusb";
  status: "connected" | "pairing" | "disconnected";
  manufacturerName?: string;
  details?: string;
  vendorId?: string;
  productId?: string;
  isMobileNative?: boolean;
}

export interface BiometricScanResult {
  scanId?: string;
  shaTemplateHash?: string;
  qualityScore?: number;
  matchScore?: number;
  isMatch?: boolean;
  matchedPatientName?: string;
  matchedNationalId?: string;
  deviceName?: string;
  deviceType?: string;
  timestamp?: string;
  fingerIndex?: string;
  isPhoneSensor?: boolean;
  success?: boolean;
  fingerprintHash?: string;
  deviceUsed?: string;
  nfiqScore?: number;
  minutiaeCount?: number;
  [key: string]: any;
}

export function detectClientPlatform(): ClientPlatformInfo {
  const ua = typeof navigator !== "undefined" ? navigator.userAgent || "" : "";
  const isAndroid = /Android/i.test(ua);
  const isIOS = /iPhone|iPad|iPod/i.test(ua);
  const isMobile = isAndroid || isIOS || /Mobi|Tablet/i.test(ua);

  return {
    isMobile,
    isAndroid,
    isIOS,
    isDesktop: !isMobile,
    userAgent: ua
  };
}

export async function isWebAuthnAvailable(): Promise<boolean> {
  if (typeof window === "undefined" || !window.PublicKeyCredential) {
    return false;
  }
  try {
    return await PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable();
  } catch {
    return false;
  }
}

export async function getConnectedUsbDevices(): Promise<BiometricDevice[]> {
  if (typeof navigator === "undefined" || !(navigator as any).usb) {
    return [];
  }
  try {
    const devices = await (navigator as any).usb.getDevices();
    return devices.map((d: any, idx: number) => ({
      id: `usb-${d.vendorId}-${d.productId}-${idx}`,
      name: d.productName || "USB Fingerprint Scanner",
      type: "webusb" as const,
      status: "connected" as const,
      manufacturerName: d.manufacturerName || "HID Global",
      vendorId: `0x${d.vendorId.toString(16).padStart(4, "0")}`,
      productId: `0x${d.productId.toString(16).padStart(4, "0")}`,
      details: "Hardware WebUSB compliant sensor connected"
    }));
  } catch {
    return [];
  }
}

export async function getConnectedHidDevices(): Promise<BiometricDevice[]> {
  if (typeof navigator === "undefined" || !(navigator as any).hid) {
    return [];
  }
  try {
    const devices = await (navigator as any).hid.getDevices();
    return devices.map((d: any, idx: number) => ({
      id: `hid-${d.vendorId}-${d.productId}-${idx}`,
      name: d.productName || "HID Biometric Terminal",
      type: "usb_hid" as const,
      status: "connected" as const,
      manufacturerName: "HID Biometrics",
      vendorId: `0x${d.vendorId.toString(16).padStart(4, "0")}`,
      productId: `0x${d.productId.toString(16).padStart(4, "0")}`,
      details: "Hardware HID biometric peripheral"
    }));
  } catch {
    return [];
  }
}

export async function pairUsbBiometricScanner(): Promise<BiometricDevice | null> {
  if (typeof navigator !== "undefined" && (navigator as any).usb) {
    try {
      const device = await (navigator as any).usb.requestDevice({ filters: [] });
      if (device) {
        return {
          id: `usb-${device.vendorId}-${device.productId}`,
          name: device.productName || "DigitalPersona U.are.U 4500",
          type: "webusb",
          status: "connected",
          manufacturerName: device.manufacturerName || "HID Global",
          vendorId: `0x${device.vendorId.toString(16).padStart(4, "0")}`,
          productId: `0x${device.productId.toString(16).padStart(4, "0")}`,
          details: "USB Fingerprint Reader Paired Successfully"
        };
      }
    } catch (err) {
      console.warn("User cancelled WebUSB device request or not supported:", err);
    }
  }

  // Fallback simulated device
  return {
    id: `usb-paired-${Date.now()}`,
    name: "SecuGen Hamster Pro 20 / DigitalPersona Reader",
    type: "smart_app_sdk",
    status: "connected",
    manufacturerName: "SecuGen / Smart Applications",
    details: "Universal Kenyan Hospital Biometric Scanner Ready"
  };
}

export async function pairHidBiometricScanner(): Promise<BiometricDevice | null> {
  return pairUsbBiometricScanner();
}

export function triggerHapticFeedback(pattern: number[] = [40]): void {
  if (typeof navigator !== "undefined" && navigator.vibrate) {
    try {
      navigator.vibrate(pattern);
    } catch {
      // Ignored if vibration permission disallowed
    }
  }
}

export async function captureBiometricFingerprint({
  patientName,
  nationalId,
  fingerIndex = "Right Thumb",
  preferredDevice
}: {
  patientName: string;
  nationalId?: string;
  fingerIndex?: string;
  preferredDevice?: BiometricDevice | null;
}): Promise<BiometricScanResult> {
  // Simulate hardware optical / capacitive capture delay
  await new Promise((res) => setTimeout(res, 1200));

  const qualityScore = Math.floor(92 + Math.random() * 8);
  const matchScore = Math.floor(95 + Math.random() * 5);

  return {
    scanId: `SCAN-${Date.now().toString().slice(-6)}`,
    shaTemplateHash: `ISO19794-2-ANSI378-${Math.random().toString(36).substring(2, 14).toUpperCase()}`,
    qualityScore,
    matchScore,
    isMatch: true,
    matchedPatientName: patientName,
    matchedNationalId: nationalId || "32441928",
    deviceName: preferredDevice?.name || "Standard Biometric Scanner",
    deviceType: preferredDevice?.type || "mobile_fingerprint",
    timestamp: new Date().toISOString(),
    fingerIndex,
    isPhoneSensor: preferredDevice?.isMobileNative || false
  };
}

export async function broadcastRemoteBiometricResult(
  sessionCode: string,
  result: BiometricScanResult
): Promise<void> {
  try {
    await setDoc(doc(db, "biometric_sessions", sessionCode), {
      ...result,
      updatedAt: new Date().toISOString()
    });
  } catch (err) {
    console.warn("Failed to broadcast remote biometric result via firestore:", err);
  }
}

export function subscribeToRemoteBiometricScan(
  sessionCode: string,
  onResult: (result: BiometricScanResult) => void
): () => void {
  return onSnapshot(
    doc(db, "biometric_sessions", sessionCode),
    (snapshot) => {
      if (snapshot.exists()) {
        const data = snapshot.data();
        if (data && data.scanId) {
          onResult(data as BiometricScanResult);
        }
      }
    },
    (err) => {
      console.warn("subscribeToRemoteBiometricScan error:", err);
    }
  );
}
