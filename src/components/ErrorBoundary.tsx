import React, { Component, ErrorInfo, ReactNode } from "react";
import { AlertTriangle, RotateCcw } from "lucide-react";

interface Props {
  children?: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export default class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
    };
  }

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("Uncaught error:", error, errorInfo);
  }

  private handleReset = () => {
    this.setState({ hasError: false, error: null });
    window.location.reload();
  };

  public render() {
    if (this.state.hasError) {
      if (this.props.fallback) return this.props.fallback;

      return (
        <div className="min-h-screen bg-slate-950 flex items-center justify-center p-6">
          <div className="glass p-12 rounded-[3rem] border-white/5 max-w-md w-full text-center space-y-6 relative overflow-hidden">
            <div className="absolute -top-10 -right-10 w-40 h-40 bg-red-500/10 blur-3xl animate-pulse" />
            
            <div className="w-20 h-20 bg-red-500/10 rounded-full flex items-center justify-center mx-auto border border-red-500/20">
              <AlertTriangle className="text-red-500" size={40} />
            </div>

            <div className="space-y-2">
              <h1 className="text-2xl font-black text-white uppercase tracking-tighter">System Pulse Failure</h1>
              <p className="text-[10px] font-mono text-red-500 uppercase tracking-widest font-bold">Uncaught Exception Detected</p>
            </div>

            <div className="p-4 bg-black/40 rounded-2xl border border-white/5">
                <p className="text-[10px] font-mono text-slate-500 leading-relaxed text-left break-words">
                  {this.state.error?.message || "An unknown logic error has occurred in the matrix core."}
                </p>
            </div>

            <button
              onClick={this.handleReset}
              className="w-full py-4 bg-red-600 hover:bg-red-500 text-white text-[10px] font-bold uppercase tracking-[0.3em] rounded-2xl transition-all flex items-center justify-center gap-3 active:scale-95 shadow-xl shadow-red-950/20"
            >
              <RotateCcw size={16} />
              Re-initialize Core
            </button>
            
            <div className="pt-4">
               <p className="text-[8px] font-mono text-slate-600 uppercase tracking-tight">Koperasi Smart Systema - Safety Protocol v1.0</p>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

// export default ErrorBoundary;
