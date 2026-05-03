import React from "react";
import { ResponsiveContainer } from "recharts";

interface SafeChartContainerProps {
  children: React.ReactNode;
  data?: any[];
  loading?: boolean;
  title?: string;
  height?: number;
}

export default function SafeChartContainer({
  children,
  data = [],
  loading = false,
  title,
  height = 320,
}: SafeChartContainerProps) {
  // =========================
  // LOADING STATE
  // =========================
  if (loading) {
    return (
      <div
        className="w-full min-w-0 rounded-2xl bg-slate-900/60 animate-pulse border border-slate-800"
        style={{ height }}
      />
    );
  }

  // =========================
  // EMPTY STATE
  // =========================
  if (!data || data.length === 0) {
    return (
      <div
        className="w-full min-w-0 rounded-2xl border border-slate-800 bg-slate-900/40 flex items-center justify-center text-slate-400 font-mono text-[10px] uppercase tracking-wider flex-col gap-2"
        style={{ height }}
      >
        <span>Tidak ada data</span>
        {title && <span className="opacity-50 text-[8px]">{title}</span>}
      </div>
    );
  }

  // =========================
  // SAFE CONTAINER
  // =========================
  return (
    <div
      className="w-full min-w-0 relative"
      style={{
        height: `${height}px`,
        minHeight: `${height}px`,
      }}
    >
      {children}
    </div>
  );
}
