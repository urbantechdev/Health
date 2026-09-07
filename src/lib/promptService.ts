export type PromptType = "success" | "error" | "warning" | "info" | "question" | "ticket";

export interface ToastNotification {
  id: string;
  title?: string;
  message: string;
  type: PromptType;
  duration?: number;
  badge?: string;
  details?: string;
  action?: {
    label: string;
    onClick: () => void;
  };
}

export interface ModalPromptConfig {
  id: string;
  title: string;
  message: string;
  type: PromptType;
  badgeText?: string;
  details?: string;
  destructive?: boolean;
  confirmText?: string;
  cancelText?: string;
  inputMode?: boolean;
  inputType?: "text" | "number" | "password" | "textarea";
  inputPlaceholder?: string;
  inputValue?: string;
  resolve: (val: any) => void;
}

type ToastListener = (toasts: ToastNotification[]) => void;
type ModalListener = (modal: ModalPromptConfig | null) => void;

class PromptService {
  private toasts: ToastNotification[] = [];
  private toastListeners: Set<ToastListener> = new Set();
  private activeModal: ModalPromptConfig | null = null;
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
    listener(this.activeModal);
    return () => {
      this.modalListeners.delete(listener);
    };
  }

  private notifyToasts() {
    for (const listener of this.toastListeners) {
      listener([...this.toasts]);
    }
  }

  private notifyModal() {
    for (const listener of this.modalListeners) {
      listener(this.activeModal);
    }
  }

  public showToast(config: {
    message: string;
    title?: string;
    type?: PromptType;
    duration?: number;
    badge?: string;
    details?: string;
    action?: { label: string; onClick: () => void };
  }): string {
    const id = "toast-" + Math.random().toString(36).substring(2, 9);
    const toastItem: ToastNotification = {
      id,
      title: config.title,
      message: config.message,
      type: config.type || "info",
      duration: config.duration ?? 2500,
      badge: config.badge,
      details: config.details,
      action: config.action
    };

    this.toasts.unshift(toastItem);
    this.notifyToasts();

    if (toastItem.duration && toastItem.duration > 0) {
      setTimeout(() => {
        this.dismissToast(id);
      }, toastItem.duration);
    }

    return id;
  }

  public dismissToast(id: string) {
    const prevLen = this.toasts.length;
    this.toasts = this.toasts.filter((t) => t.id !== id);
    if (this.toasts.length !== prevLen) {
      this.notifyToasts();
    }
  }

  public showModal(
    config: Omit<ModalPromptConfig, "id" | "resolve">
  ): Promise<any> {
    return new Promise((resolve) => {
      const id = "modal-" + Math.random().toString(36).substring(2, 9);
      this.activeModal = {
        ...config,
        id,
        resolve: (val: any) => {
          this.activeModal = null;
          this.notifyModal();
          resolve(val);
        }
      };
      this.notifyModal();
    });
  }

  public dismissModal(result: any) {
    if (this.activeModal) {
      this.activeModal.resolve(result);
    }
  }
}

export const promptService = new PromptService();

export function toast(message: string, options?: Partial<ToastNotification>) {
  return promptService.showToast({
    message,
    ...options
  });
}

toast.success = (message: string, title?: string, options?: Partial<ToastNotification>) => {
  return promptService.showToast({
    message,
    title: title || "Success",
    type: "success",
    ...options
  });
};

toast.error = (message: string, title?: string, options?: Partial<ToastNotification>) => {
  return promptService.showToast({
    message,
    title: title || "Error",
    type: "error",
    ...options
  });
};

toast.warning = (message: string, title?: string, options?: Partial<ToastNotification>) => {
  return promptService.showToast({
    message,
    title: title || "Warning",
    type: "warning",
    ...options
  });
};

toast.info = (message: string, title?: string, options?: Partial<ToastNotification>) => {
  return promptService.showToast({
    message,
    title: title || "Information",
    type: "info",
    ...options
  });
};

export async function modernConfirm(
  message: string,
  options?: {
    title?: string;
    confirmText?: string;
    cancelText?: string;
    type?: PromptType;
    destructive?: boolean;
    details?: string;
    badgeText?: string;
  }
): Promise<boolean> {
  const result = await promptService.showModal({
    message,
    title: options?.title || "Confirm Action",
    type: options?.type || (options?.destructive ? "warning" : "question"),
    confirmText: options?.confirmText || "Confirm",
    cancelText: options?.cancelText || "Cancel",
    destructive: options?.destructive,
    details: options?.details,
    badgeText: options?.badgeText
  });
  return Boolean(result);
}

export async function modernAlert(
  message: string,
  options?: {
    title?: string;
    confirmText?: string;
    type?: PromptType;
    details?: string;
    badgeText?: string;
  }
): Promise<void> {
  await promptService.showModal({
    message,
    title: options?.title || "Notification",
    type: options?.type || "info",
    confirmText: options?.confirmText || "OK",
    details: options?.details,
    badgeText: options?.badgeText
  });
}

export async function modernPrompt(
  message: string,
  options?: {
    title?: string;
    confirmText?: string;
    cancelText?: string;
    defaultValue?: string;
    placeholder?: string;
    type?: PromptType;
    details?: string;
    badgeText?: string;
  }
): Promise<string | null> {
  const result = await promptService.showModal({
    message,
    title: options?.title || "Input Required",
    type: options?.type || "question",
    confirmText: options?.confirmText || "Submit",
    cancelText: options?.cancelText || "Cancel",
    inputMode: true,
    inputValue: options?.defaultValue || "",
    inputPlaceholder: options?.placeholder || "",
    details: options?.details,
    badgeText: options?.badgeText
  });
  return typeof result === "string" ? result : null;
}
