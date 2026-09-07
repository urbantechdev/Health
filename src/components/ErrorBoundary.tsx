import React, { Component, ErrorInfo, ReactNode } from "react";
import { AlertTriangle, RotateCcw, ShieldAlert, Copy, Check, Home } from "lucide-react";

interface Props {
  children: ReactNode;
  fallbackTitle?: string;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
  copied: boolean;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
      copied: false,
    };
  }

  static getDerivedStateFromError(error: Error): Partial<State> {
    return { hasError: true, error };
  }

  override componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("[HMIS Critical Error Boundary caught exception]:", error, errorInfo);
    this.setState({ errorInfo });
  }

  private handleReset = () => {
    try {
      // Clear any session-level transient flags that could cause loops
      sessionStorage.clear();
    } catch (_) {}
    window.location.reload();
  };

  private handleHardReset = () => {
    try {
      sessionStorage.clear();
      // Remove simulated login or profile overrides if corrupted
      localStorage.removeItem("simulated_user");
      localStorage.removeItem("active_specialist_id");
      localStorage.removeItem("user_profile_override");
    } catch (_) {}
    window.location.href = window.location.origin;
  };

  private handleCopyError = () => {
    const { error, errorInfo } = this.state;
    const text = `HMIS Error Report:\nError: ${error?.message || "Unknown error"}\n\nStack: ${error?.stack || ""}\n\nComponent Stack: ${errorInfo?.componentStack || ""}`;
    navigator.clipboard.writeText(text).then(() => {
      (this as any).setState({ copied: true });
      setTimeout(() => (this as any).setState({ copied: false }), 2500);
    });
  };

  public render() {
    if (this.state.hasError) {
      const { error, errorInfo, copied } = this.state;

      return (
        <div className="min-h-screen w-screen bg-slate-950 text-slate-100 flex items-center justify-center p-4 font-sans select-none antialiased">
          <div className="max-w-xl w-full bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-8 shadow-2xl relative overflow-hidden flex flex-col gap-6">
            {/* Ambient Caution Glow */}
            <div className="absolute -top-24 left-1/2 -translate-x-1/2 w-80 h-48 bg-rose-500/10 rounded-full blur-3xl pointer-events-none" />

            {/* Header / Icon */}
            <div className="flex items-center gap-4 relative z-10">
              <div className="w-14 h-14 rounded-2xl bg-rose-500/15 border border-rose-500/30 flex items-center justify-center text-rose-400 shrink-0">
                <ShieldAlert className="w-7 h-7 animate-pulse" />
              </div>
              <div>
                <span className="text-[10px] font-black uppercase tracking-widest px-2 py-0.5 rounded-full bg-rose-500/10 text-rose-400 border border-rose-500/20">
                  System Session Guard
                </span>
                <h1 className="text-xl sm:text-2xl font-black text-white tracking-tight mt-1">
                  Clinical Workspace Interrupted
                </h1>
                <p className="text-xs text-slate-400">
                  The application encountered an unexpected runtime error.
                </p>
              </div>
            </div>

            {/* Error Message Box */}
            <div className="bg-slate-950/80 border border-slate-800/80 rounded-2xl p-4 flex flex-col gap-2 relative z-10">
              <div className="flex items-center justify-between text-xs font-mono text-slate-400">
                <span className="flex items-center gap-1.5 text-rose-300 font-semibold">
                  <AlertTriangle className="w-3.5 h-3.5" />
                  Diagnostic Exception
                </span>
                <button
                  type="button"
                  onClick={this.handleCopyError}
                  className="flex items-center gap-1 text-[11px] hover:text-white transition-colors cursor-pointer text-slate-400"
                  title="Copy technical details"
                >
                  {copied ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                  <span>{copied ? "Copied" : "Copy Log"}</span>
                </button>
              </div>
              <p className="text-xs font-mono text-rose-200 break-all leading-relaxed bg-rose-950/20 p-2.5 rounded-xl border border-rose-900/30">
                {error?.message || "An unexpected error occurred during interface rendering."}
              </p>
              {errorInfo?.componentStack && (
                <details className="text-[10px] font-mono text-slate-500 mt-1">
                  <summary className="cursor-pointer hover:text-slate-400">View Component Trace</summary>
                  <pre className="mt-2 p-2 bg-slate-950 rounded-lg overflow-x-auto text-slate-400 max-h-36 leading-tight whitespace-pre-wrap">
                    {errorInfo.componentStack.trim()}
                  </pre>
                </details>
              )}
            </div>

            {/* Action Buttons */}
            <div className="flex flex-col sm:flex-row gap-3 pt-2 relative z-10">
              <button
                type="button"
                onClick={this.handleReset}
                className="flex-1 px-4 py-3 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold transition-all shadow-lg shadow-emerald-950/50 flex items-center justify-center gap-2 cursor-pointer"
              >
                <RotateCcw className="w-4 h-4" />
                <span>Reload Application</span>
              </button>
              <button
                type="button"
                onClick={this.handleHardReset}
                className="px-4 py-3 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 cursor-pointer border border-slate-700"
              >
                <Home className="w-4 h-4" />
                <span>Return to Login</span>
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
