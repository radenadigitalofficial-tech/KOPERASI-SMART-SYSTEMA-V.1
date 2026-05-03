import React from 'react';
import { Loader2, BarChart3 } from 'lucide-react';

interface SafeChartContainerProps {
  loading?: boolean;
  data: any[];
  children: React.ReactNode;
  height?: number | string;
  title?: string;
}

const SafeChartContainer: React.FC<SafeChartContainerProps> = ({ 
  loading, 
  data, 
  children, 
  height = 320,
  title 
}) => {
  if (loading) {
    return (
      <div 
        style={{ height }} 
        className="w-full flex flex-col items-center justify-center gap-3 bg-slate-900/20 rounded-2xl border border-white/5 animate-pulse"
      >
        <Loader2 className="w-8 h-8 text-cyan-500 animate-spin" />
        <p className="text-[10px] font-mono text-slate-500 uppercase tracking-widest">Sychronizing Ledger...</p>
      </div>
    );
  }

  if (!Array.isArray(data) || data.length === 0) {
    return (
      <div 
        style={{ height }} 
        className="w-full flex flex-col items-center justify-center gap-3 bg-slate-900/20 rounded-2xl border border-white/5"
      >
        <div className="p-3 bg-slate-800/50 rounded-full text-slate-600">
          <BarChart3 size={24} />
        </div>
        <div className="text-center">
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-tighter">{title || 'Data Analytics'}</p>
          <p className="text-[9px] text-slate-600 font-mono uppercase">Status: Insufficient Data Points</p>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full min-w-0" style={{ height }}>
      {children}
    </div>
  );
};

export default SafeChartContainer;
