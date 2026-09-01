// Cross-Platform Global Hotkeys & Shortcut Service
// Handles Windows, Linux, macOS (Option key code translation), Function keys, and POS shortcuts.

export interface HotkeyDefinition {
  id: string;
  category: "Navigation" | "POS & Dispensing" | "Hardware & Tools";
  label: string;
  primaryKey: string;
  altKeyStr?: string;
  actionId: string;
  targetTab?: string;
  description: string;
}

export const SYSTEM_HOTKEYS: HotkeyDefinition[] = [
  // Primary Module Navigation
  { id: "nav-dashboard", category: "Navigation", label: "Dashboard Overview", primaryKey: "Alt + 1", altKeyStr: "Ctrl+1", actionId: "switch-tab", targetTab: "dashboard", description: "Switch to executive clinical dashboard" },
  { id: "nav-reception", category: "Navigation", label: "Reception Desk", primaryKey: "Alt + 2", altKeyStr: "Ctrl+2", actionId: "switch-tab", targetTab: "reception", description: "Patient check-in, SHA verification & Biometric Kiosk" },
  { id: "nav-doctor", category: "Navigation", label: "Doctor Consultation", primaryKey: "Alt + 3", altKeyStr: "Ctrl+3", actionId: "switch-tab", targetTab: "doctor", description: "Clinical encounter, MEWS & ICD-10 diagnosis" },
  { id: "nav-diagnostics", category: "Navigation", label: "Lab & Diagnostics", primaryKey: "Alt + 4", altKeyStr: "Ctrl+4", actionId: "switch-tab", targetTab: "diagnostics", description: "LIS/RIS analyzer order queue & specimen collection" },
  { id: "nav-pharmacy", category: "Navigation", label: "Pharmacy POS Desk", primaryKey: "Alt + 5", altKeyStr: "Alt+P", actionId: "switch-tab", targetTab: "pharmacy", description: "Open Smart Pharmacy POS & 2D GS1 Dispensing" },
  { id: "nav-billing", category: "Navigation", label: "Split Billing & Claims", primaryKey: "Alt + 6", altKeyStr: "Alt+B", actionId: "switch-tab", targetTab: "billing", description: "SHA / Cash Split cashier & eTIMS fiscal invoices" },
  { id: "nav-finance", category: "Navigation", label: "Finance & Accounts", primaryKey: "Alt + 7", altKeyStr: "Alt+F", actionId: "switch-tab", targetTab: "finance", description: "Revenue ledgers, M-Pesa statements & reconciliation" },
  { id: "nav-admin", category: "Navigation", label: "Admin & Settings", primaryKey: "Alt + 8", altKeyStr: "Alt+A", actionId: "switch-tab", targetTab: "admin", description: "User access control, branding & system logs" },
  { id: "nav-guide", category: "Navigation", label: "User Manual / Guide", primaryKey: "Alt + 9", altKeyStr: "Alt+G", actionId: "switch-tab", targetTab: "guide", description: "Comprehensive workflow documentation" },
  { id: "nav-journey", category: "Navigation", label: "Patient Journey", primaryKey: "Alt + J", altKeyStr: "Ctrl+J", actionId: "switch-tab", targetTab: "journey", description: "Real-time clinical timeline & progress" },
  { id: "nav-tickets", category: "Navigation", label: "Patient Tickets & Tokens", primaryKey: "Alt + K", altKeyStr: "Ctrl+K", actionId: "switch-tab", targetTab: "tickets", description: "Queue tokens and station routing" },
  { id: "nav-queue", category: "Navigation", label: "Live Queue Board", primaryKey: "Alt + Q", altKeyStr: "Ctrl+Q", actionId: "switch-tab", targetTab: "queue", description: "Department triage board & audio announcements" },

  // POS, Inventory & Hardware Hotkeys
  { id: "pos-focus-search", category: "POS & Dispensing", label: "Focus Barcode / Search", primaryKey: "F2", altKeyStr: "Ctrl+F", actionId: "focus-barcode-search", description: "Instantly focus the laser barcode gun input or drug search bar" },
  { id: "pos-quick-checkout", category: "POS & Dispensing", label: "Instant POS Checkout", primaryKey: "F4", altKeyStr: "Ctrl+Enter", actionId: "pos-quick-checkout", description: "Launch M-Pesa STK / Cash POS checkout modal" },
  { id: "pos-inventory-wizard", category: "POS & Dispensing", label: "Barcode Inventory Intake", primaryKey: "F9", altKeyStr: "Alt+I", actionId: "open-barcode-inventory-wizard", description: "Open 2D GS1 Camera / Laser barcode intake wizard to feed POS" },
  { id: "pos-clear-cart", category: "POS & Dispensing", label: "Clear Dispensing Cart", primaryKey: "F8", altKeyStr: "Alt+C", actionId: "clear-pos-cart", description: "Reset active items in dispensing register" },
  { id: "system-shortcuts-help", category: "Hardware & Tools", label: "Hotkeys Help Sheet", primaryKey: "F1", altKeyStr: "Alt+H", actionId: "toggle-shortcuts-help", description: "Display the hotkeys overlay cheat sheet" }
];

// Mac Option-Key output character mapping to standard keys
const MAC_OPTION_CHAR_MAP: Record<string, string> = {
  "¡": "1",
  "™": "2",
  "£": "3",
  "¢": "4",
  "∞": "5",
  "§": "6",
  "¶": "7",
  "•": "8",
  "ª": "9",
  "º": "0",
  "∆": "j",
  "˚": "k",
  "œ": "q",
  "©": "g",
  "π": "p",
  "∫": "b",
  "®": "r",
  "∂": "d",
  "å": "a",
  "ƒ": "f",
  "˙": "h",
  "ˆ": "i",
  "ç": "c",
};

// Code-to-Normalized key mapper
export function normalizeKeyboardEvent(e: KeyboardEvent): {
  normalizedKey: string;
  isModifierPressed: boolean;
  hasAlt: boolean;
  hasCtrl: boolean;
  hasMeta: boolean;
} {
  const code = e.code || "";
  let key = (e.key || "").toLowerCase();

  // If Mac produced a special symbol from Option key, translate it back
  if (MAC_OPTION_CHAR_MAP[e.key]) {
    key = MAC_OPTION_CHAR_MAP[e.key].toLowerCase();
  }

  // Handle standard Digit codes
  if (code.startsWith("Digit")) {
    key = code.replace("Digit", "");
  } else if (code.startsWith("Numpad") && !isNaN(Number(code.replace("Numpad", "")))) {
    key = code.replace("Numpad", "");
  } else if (code.startsWith("Key")) {
    key = code.replace("Key", "").toLowerCase();
  }

  const hasAlt = e.altKey;
  const hasCtrl = e.ctrlKey;
  const hasMeta = e.metaKey;
  const isModifierPressed = hasAlt || hasCtrl || hasMeta;

  return {
    normalizedKey: key,
    isModifierPressed,
    hasAlt,
    hasCtrl,
    hasMeta,
  };
}

// Global Custom Event Dispatcher for Action Hotkeys
export function dispatchHotkeyAction(actionId: string, payload?: any) {
  const event = new CustomEvent(`tassiahill-hotkey-${actionId}`, { detail: payload });
  window.dispatchEvent(event);
}

// Subscribe to a specific hotkey action
export function onHotkeyAction(actionId: string, callback: (detail?: any) => void) {
  const handler = (e: Event) => {
    const customEvent = e as CustomEvent;
    callback(customEvent.detail);
  };
  window.addEventListener(`tassiahill-hotkey-${actionId}`, handler);
  return () => window.removeEventListener(`tassiahill-hotkey-${actionId}`, handler);
}
