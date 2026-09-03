// Modernized Prompts & Notification Service for NextGen HMS
// Handles Success, Error, Warning, Question, and Input Prompts with sleek animations and sound effects
import { promptSound } from "./promptSound";

export type PromptType = "success" | "error" | "warning" | "info" | "question";

export interface ToastNotification {
  id: string;
  type: PromptType;
  title?: string;
  message: string;
  details?: string;
  duration?: number; // ms
  timestamp: number;
  badge?: string;
  action?: {
    label: string;
    onClick: () => void;
  };
}

export interface ModalPromptConfig {
  id: string;
  type: PromptType;
  title: string;
  message: string;
  details?: string;
  confirmText?: string;
  cancelText?: string;
  destructive?: boolean;
  inputMode?: boolean;
  inputType?: "text" | "number" | "password" | "textarea";
  inputPlaceholder?: string;
  inputValue?: string;
  badgeText?: string;
  resolve: (value: any) => void;
}

type ToastListener = (toasts: ToastNotification[]) => void;
type ModalPromptListener = (prompt: ModalPromptConfig | null) => void;

class PromptService {
  private toasts: ToastNotification[] = [];
  private currentModalPrompt: ModalPromptConfig | null = null;
  private toastListeners: Set<ToastListener> = new Set();
  private modalListeners: Set<ModalPromptListener> = new Set();

  // Toast Subscription
  public subscribeToasts(listener: ToastListener) {
    this.toastListeners.add(listener);
    listener(this.toasts);
    return () => {
      this.toastListeners.delete(listener);
    };
  }

  // Modal Prompt Subscription
  public subscribeModalPrompt(listener: ModalPromptListener) {
    this.modalListeners.add(listener);
    listener(this.currentModalPrompt);
    return () => {
      this.modalListeners.delete(listener);
    };
  }

  private notifyToasts() {
    this.toastListeners.forEach((fn) => fn([...this.toasts]));
  }

  private notifyModal() {
    this.modalListeners.forEach((fn) => fn(this.currentModalPrompt));
  }

  // --- Toast Methods ---
  public showToast(config: {
    type?: PromptType;
    title?: string;
    message: string;
    details?: string;
    duration?: number;
    badge?: string;
    playSound?: boolean;
    action?: { label: string; onClick: () => void };
  }): string {
    const id = `toast-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`;
    const type = config.type || "info";
    const duration = config.duration ?? (type === "error" ? 6500 : 4500);

    const newToast: ToastNotification = {
      id,
      type,
      title: config.title,
      message: config.message,
      details: config.details,
      badge: config.badge,
      duration,
      timestamp: Date.now(),
      action: config.action,
    };

    if (config.playSound !== false) {
      promptSound.play(type);
    }

    // Keep max 4 toasts on screen
    this.toasts = [newToast, ...this.toasts.slice(0, 3)];
    this.notifyToasts();

    if (duration > 0) {
      setTimeout(() => {
        this.dismissToast(id);
      }, duration);
    }

    return id;
  }

  public dismissToast(id: string) {
    this.toasts = this.toasts.filter((t) => t.id !== id);
    this.notifyToasts();
  }

  public clearAllToasts() {
    this.toasts = [];
    this.notifyToasts();
  }

  // --- Modal Prompt Methods ---
  public alert(
    message: string,
    options?: {
      title?: string;
      type?: PromptType;
      details?: string;
      confirmText?: string;
      badgeText?: string;
      playSound?: boolean;
    }
  ): Promise<void> {
    return new Promise((resolve) => {
      const type = options?.type || (message.toLowerCase().includes("error") || message.toLowerCase().includes("failed") || message.toLowerCase().includes("denied") ? "error" : "info");
      
      if (options?.playSound !== false) {
        promptSound.play(type);
      }

      this.currentModalPrompt = {
        id: `alert-${Date.now()}`,
        type,
        title: options?.title || (type === "error" ? "Action Required" : type === "warning" ? "Attention" : type === "success" ? "Operation Successful" : "System Notice"),
        message,
        details: options?.details,
        confirmText: options?.confirmText || "Understood",
        badgeText: options?.badgeText,
        resolve: () => {
          this.currentModalPrompt = null;
          this.notifyModal();
          resolve();
        },
      };
      this.notifyModal();
    });
  }

  public confirm(
    message: string,
    options?: {
      title?: string;
      type?: PromptType;
      details?: string;
      confirmText?: string;
      cancelText?: string;
      destructive?: boolean;
      badgeText?: string;
      playSound?: boolean;
    }
  ): Promise<boolean> {
    return new Promise((resolve) => {
      const isDestructive = options?.destructive ?? (options?.type === "error" || message.toLowerCase().includes("delete") || message.toLowerCase().includes("remove") || message.toLowerCase().includes("purge") || message.toLowerCase().includes("wipe") || message.toLowerCase().includes("terminate"));
      const type = options?.type || (isDestructive ? "error" : "question");

      if (options?.playSound !== false) {
        promptSound.play(type);
      }

      this.currentModalPrompt = {
        id: `confirm-${Date.now()}`,
        type,
        title: options?.title || (isDestructive ? "Confirm Irreversible Action" : "Confirmation Required"),
        message,
        details: options?.details,
        confirmText: options?.confirmText || (isDestructive ? "Proceed & Delete" : "Yes, Confirm"),
        cancelText: options?.cancelText || "Cancel",
        destructive: isDestructive,
        badgeText: options?.badgeText,
        resolve: (confirmed: boolean) => {
          this.currentModalPrompt = null;
          this.notifyModal();
          resolve(Boolean(confirmed));
        },
      };
      this.notifyModal();
    });
  }

  public prompt(
    message: string,
    options?: {
      title?: string;
      defaultValue?: string;
      placeholder?: string;
      inputType?: "text" | "number" | "password" | "textarea";
      confirmText?: string;
      cancelText?: string;
      details?: string;
      badgeText?: string;
      playSound?: boolean;
    }
  ): Promise<string | null> {
    return new Promise((resolve) => {
      if (options?.playSound !== false) {
        promptSound.play("question");
      }

      this.currentModalPrompt = {
        id: `prompt-${Date.now()}`,
        type: "question",
        title: options?.title || "Input Required",
        message,
        details: options?.details,
        inputMode: true,
        inputType: options?.inputType || "text",
        inputValue: options?.defaultValue || "",
        inputPlaceholder: options?.placeholder || "Enter details here...",
        confirmText: options?.confirmText || "Submit",
        cancelText: options?.cancelText || "Cancel",
        badgeText: options?.badgeText,
        resolve: (val: string | null) => {
          this.currentModalPrompt = null;
          this.notifyModal();
          resolve(val);
        },
      };
      this.notifyModal();
    });
  }

  public dismissModal(result: any = null) {
    if (this.currentModalPrompt) {
      this.currentModalPrompt.resolve(result);
    }
  }
}

export const promptService = new PromptService();

// Convenient Functional Shorthands
export const toast = {
  success: (message: string, title = "Operation Successful", details?: string) =>
    promptService.showToast({ type: "success", title, message, details }),
  error: (message: string, title = "Error Encountered", details?: string) =>
    promptService.showToast({ type: "error", title, message, details }),
  warning: (message: string, title = "System Warning", details?: string) =>
    promptService.showToast({ type: "warning", title, message, details }),
  info: (message: string, title = "System Notification", details?: string) =>
    promptService.showToast({ type: "info", title, message, details }),
  question: (message: string, title = "Verification Required", details?: string) =>
    promptService.showToast({ type: "question", title, message, details }),
  custom: (config: { type?: PromptType; title?: string; message: string; details?: string; duration?: number; badge?: string; action?: { label: string; onClick: () => void } }) =>
    promptService.showToast(config),
};

export const modernAlert = (
  message: string,
  options?: { title?: string; type?: PromptType; details?: string; confirmText?: string; badgeText?: string }
) => promptService.alert(message, options);

export const modernConfirm = (
  message: string,
  options?: { title?: string; type?: PromptType; details?: string; confirmText?: string; cancelText?: string; destructive?: boolean; badgeText?: string }
) => promptService.confirm(message, options);

export const modernPrompt = (
  message: string,
  options?: { title?: string; defaultValue?: string; placeholder?: string; inputType?: "text" | "number" | "password" | "textarea"; confirmText?: string; cancelText?: string; details?: string; badgeText?: string }
) => promptService.prompt(message, options);

