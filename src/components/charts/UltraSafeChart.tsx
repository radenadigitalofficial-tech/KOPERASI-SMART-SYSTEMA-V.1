import React, { useEffect, useState } from "react";

interface Props {
  children: React.ReactNode;
  data?: any[];
  loading?: boolean;
  height?: number;
}

/**
 * UltraSafeChart
 * Mencegah Recharts render dengan width/height -1
 * Menggunakan mount delay dan explicit container sizing
 */
export default function UltraSafeChart({
  children,
  data = [],
  loading = false,
  height = 320,
}: Props) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    // Delay render untuk memastikan layout induk (flex/grid/sidebar) stabil
    const timer = setTimeout(() => {
      setMounted(true);
    }, 200);

    return () => clearTimeout(timer);
  }, []);

  // Loading State
  if (loading) {
    return (
      <div
        className="w-full min-w-0 rounded-2xl bg-slate-900 animate-pulse border border-white/5"
        style={{ height }}
      />
    );
  }

  // Wait Mount State (mencegah -1 warning)
  if (!mounted) {
    return (
      <div
        className="w-full min-w-0 rounded-2xl bg-slate-900/40 border border-white/5"
        style={{ height }}
      />
    );
  }

  // Empty State
  if (!data || data.length === 0) {
    return (
      <div
        className="w-full min-w-0 rounded-2xl border border-dashed border-slate-800 bg-slate-900/40 flex flex-col items-center justify-center text-slate-500 gap-2"
        style={{ height }}
      >
        <div className="w-8 h-8 rounded-full border-2 border-slate-800 border-t-slate-600 animate-spin mb-2" />
        <span className="text-[10px] font-mono uppercase tracking-widest">Awaiting Data Node...</span>
      </div>
    );
  }

  return (
    <div
      className="relative w-full min-w-0 overflow-hidden"
      style={{
        width: "100%",
        height: `${height}px`,
        minHeight: `${height}px`,
      }}
    >
      {children}
    </div>
  );
}
