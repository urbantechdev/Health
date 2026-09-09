type HotkeyHandler = (payload?: any) => void;

const actionListeners = new Map<string, Set<HotkeyHandler>>();

export function dispatchHotkeyAction(action: string, payload?: any) {
  const handlers = actionListeners.get(action);
  if (handlers) {
    handlers.forEach((fn) => {
      try {
        fn(payload);
      } catch (err) {
        console.error(`Hotkey handler error for ${action}:`, err);
      }
    });
  }
}

export function onHotkeyAction(action: string, handler: HotkeyHandler): () => void {
  if (!actionListeners.has(action)) {
    actionListeners.set(action, new Set());
  }
  const set = actionListeners.get(action)!;
  set.add(handler);
  return () => {
    set.delete(handler);
    if (set.size === 0) {
      actionListeners.delete(action);
    }
  };
}

export function normalizeKeyboardEvent(e: KeyboardEvent): { hasAlt: boolean; normalizedKey: string } {
  const hasAlt = e.altKey || false;
  const normalizedKey = (e.key || "").toLowerCase();
  return { hasAlt, normalizedKey };
}

export interface HotkeyItem {
  key: string;
  description: string;
  category: "navigation" | "action" | "system";
  action: string;
}

export const SYSTEM_HOTKEYS: HotkeyItem[] = [
  { key: "F1", description: "Toggle Shortcuts & Documentation Help", category: "system", action: "toggle-shortcuts-help" },
  { key: "F2", description: "Quick Search Barcode / Items", category: "action", action: "focus-barcode-search" },
  { key: "F4", description: "Quick POS Checkout & Receipt", category: "action", action: "pos-quick-checkout" },
  { key: "F8", description: "Clear Active Cart / Form", category: "action", action: "clear-pos-cart" },
  { key: "F9", description: "Open Barcode Inventory Scanner Wizard", category: "action", action: "open-barcode-inventory-wizard" },
  { key: "Alt+1..9", description: "Quick Department Switcher", category: "navigation", action: "switch-tab" },
];
