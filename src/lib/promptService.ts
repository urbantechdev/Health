export type PromptType = "success" | "error" | "warning" | "info" | "question";

export interface ToastNotification {
  id: string;
  type: PromptType;
  title?: string;
  message: string;
  badge?: string;
  details?: string;
  duration?: number;
  action?: {
    label: string;
    onClick: () => void;
  };
}

export interface ModalPromptConfig {
  id: string;
  type?: PromptType;
  title?: string;
  message?: string;
  badge?: string;
  badgeText?: string;
  details?: string;
  destructive?: boolean;
  inputMode?: boolean;
  inputType?: "text" | "number" | "password" | "textarea" | string;
  inputLabel?: string;
  inputPlaceholder?: string;
  inputValue?: string;
  confirmText?: string;
  cancelText?: string;
  onConfirm?: (val?: any) => void;
  onCancel?: () => void;
  [key: string]: any;
}

type ToastListener = (toasts: ToastNotification[]) => void;
type ModalListener = (modal: ModalPromptConfig | null) => void;

class PromptService {
  private toasts: ToastNotification[] = [];
  private toastListeners: Set<ToastListener> = new Set();
  private currentModal: ModalPromptConfig | null = null;
  private modalListeners: Set<ModalListener> = new Set();

  public subscribeToasts(listener: ToastListener): () => void {
    this.toastListeners.add(listener);
    listener([...this.toasts]);
    return () => {
      this.toastListeners.delete(listener);
    };
  }

  public subscribeModalPrompt(listener: ModalListener): () => void {
    this.modalListeners.add(listener);
    listener(this.currentModal);
    return () => {
      this.modalListeners.delete(listener);
    };
  }

  private notifyToasts() {
    const copy = [...this.toasts];
    this.toastListeners.forEach((l) => l(copy));
  }

  private notifyModal() {
    this.modalListeners.forEach((l) => l(this.currentModal));
  }

  public showToast(toast: Omit<ToastNotification, "id">): string {
    const id = "toast-" + Math.random().toString(36).substring(2, 9);
    const item: ToastNotification = { ...toast, id };
    this.toasts.unshift(item);
    this.notifyToasts();

    const duration = toast.duration ?? 4500;
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

  public showModal(config: Omit<ModalPromptConfig, "id">): Promise<any> {
    return new Promise((resolve) => {
      const id = "modal-" + Math.random().toString(36).substring(2, 9);
      this.currentModal = {
        ...config,
        id,
        onConfirm: (val?: any) => {
          this.currentModal = null;
          this.notifyModal();
          resolve(config.inputMode ? (val ?? "") : true);
        },
        onCancel: () => {
          this.currentModal = null;
          this.notifyModal();
          resolve(config.inputMode ? null : false);
        },
      };
      this.notifyModal();
    });
  }

  public dismissModal(result?: any) {
    if (!this.currentModal) return;
    if (result !== false && result !== null && result !== undefined) {
      this.currentModal.onConfirm?.(result);
    } else {
      this.currentModal.onCancel?.();
    }
  }
}

export const promptService = new PromptService();

export const toast = {
  success: (message: string, title?: string, details?: string) =>
    promptService.showToast({ type: "success", message, title: title || "Success", details }),
  error: (message: string, title?: string, details?: string) =>
    promptService.showToast({ type: "error", message, title: title || "Error", details }),
  warning: (message: string, title?: string, details?: string) =>
    promptService.showToast({ type: "warning", message, title: title || "Attention", details }),
  info: (message: string, title?: string, details?: string) =>
    promptService.showToast({ type: "info", message, title: title || "Notice", details }),
};

export function modernConfirm(
  optionsOrMessage: string | {
    title?: string;
    message: string;
    confirmText?: string;
    cancelText?: string;
    destructive?: boolean;
    details?: string;
  },
  secondArg?: any
): Promise<boolean> {
  if (typeof optionsOrMessage === "string") {
    const opts = typeof secondArg === "object" ? secondArg : {};
    return promptService.showModal({
      type: opts.destructive ? "error" : "question",
      title: typeof secondArg === "string" ? secondArg : opts.title || "Confirm Action",
      message: optionsOrMessage,
      confirmText: opts.confirmText || "Confirm",
      cancelText: opts.cancelText || "Cancel",
      destructive: opts.destructive,
      details: opts.details,
    });
  }
  return promptService.showModal({
    type: optionsOrMessage.destructive ? "error" : "question",
    title: optionsOrMessage.title || "Confirm Action",
    message: optionsOrMessage.message,
    confirmText: optionsOrMessage.confirmText || "Confirm",
    cancelText: optionsOrMessage.cancelText || "Cancel",
    destructive: optionsOrMessage.destructive,
    details: optionsOrMessage.details,
  });
}

export function modernAlert(
  optionsOrMessage: string | {
    title?: string;
    message: string;
    type?: PromptType;
    confirmText?: string;
    details?: string;
  },
  secondArg?: any
): Promise<void> {
  if (typeof optionsOrMessage === "string") {
    const opts = typeof secondArg === "object" ? secondArg : {};
    return promptService.showModal({
      type: opts.type || "info",
      title: typeof secondArg === "string" ? secondArg : opts.title || "Alert",
      message: optionsOrMessage,
      confirmText: opts.confirmText || "OK",
      details: opts.details,
    }).then(() => {});
  }
  return promptService.showModal({
    type: optionsOrMessage.type || "info",
    title: optionsOrMessage.title || "Alert",
    message: optionsOrMessage.message,
    confirmText: optionsOrMessage.confirmText || "OK",
    details: optionsOrMessage.details,
  }).then(() => {});
}

export function modernPrompt(
  optionsOrMessage: string | {
    title?: string;
    message: string;
    inputLabel?: string;
    inputPlaceholder?: string;
    inputValue?: string;
    confirmText?: string;
    cancelText?: string;
  },
  secondArg?: any
): Promise<string | null> {
  if (typeof optionsOrMessage === "string") {
    const opts = typeof secondArg === "object" ? secondArg : {};
    return promptService.showModal({
      type: "question",
      title: typeof secondArg === "string" ? secondArg : opts.title || "Input Required",
      message: optionsOrMessage,
      inputMode: true,
      inputLabel: opts.inputLabel,
      inputPlaceholder: opts.inputPlaceholder,
      inputValue: opts.inputValue,
      confirmText: opts.confirmText || "Submit",
      cancelText: opts.cancelText || "Cancel",
    });
  }
  return promptService.showModal({
    type: "question",
    title: optionsOrMessage.title || "Input Required",
    message: optionsOrMessage.message,
    inputMode: true,
    inputLabel: optionsOrMessage.inputLabel,
    inputPlaceholder: optionsOrMessage.inputPlaceholder,
    inputValue: optionsOrMessage.inputValue,
    confirmText: optionsOrMessage.confirmText || "Submit",
    cancelText: optionsOrMessage.cancelText || "Cancel",
  });
}
