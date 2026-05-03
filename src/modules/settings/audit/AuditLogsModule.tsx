import React, { useState, useEffect } from 'react';
import { 
  Shield, Clock, User, Database, Activity, 
  Search, Filter, ChevronDown, CheckCircle2, 
  AlertTriangle, History, RefreshCw
} from 'lucide-react';
import { collection, query, orderBy, limit, onSnapshot, Timestamp } from 'firebase/firestore';
import { db } from '../../../services/firebase';

interface AuditLog {
  id: string;
  action: string;
  module: string;
  description: string;
  userId: string;
  userName: string;
  targetId?: string | null;
  severity: "INFO" | "WARNING" | "CRITICAL";
  createdAt: any;
  // Fallback for old logs
  timestamp?: any;
  userEmail?: string;
  collection?: string;
  payload?: any;
}

export default function AuditLogsModule({ isAdmin }: { isAdmin: boolean }) {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    if (!isAdmin) return;

    const q = query(
      collection(db, 'audit_logs'),
      orderBy('createdAt', 'desc'),
      limit(100)
    );

    const unsub = onSnapshot(q, (snapshot) => {
      const docs = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as AuditLog[];
      setLogs(docs);
      setLoading(false);
    });

    return () => unsub();
  }, [isAdmin]);

  if (!isAdmin) {
    return (
      <div className="p-8 bg-red-500/10 border border-red-500/20 rounded-3xl text-center">
        <h2 className="text-xl font-bold text-red-500 uppercase tracking-tighter">Access Denied</h2>
        <p className="text-xs text-red-400/70 mt-2 uppercase font-mono tracking-widest">Unauthorized Access Detected</p>
      </div>
    );
  }

  const filteredLogs = logs.filter(log => {
    const email = log.userName || log.userEmail || '';
    const module = log.module || log.collection || '';
    const desc = log.description || '';
    return email.toLowerCase().includes(searchTerm.toLowerCase()) ||
           log.action.toLowerCase().includes(searchTerm.toLowerCase()) ||
           module.toLowerCase().includes(searchTerm.toLowerCase()) ||
           desc.toLowerCase().includes(searchTerm.toLowerCase());
  });

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      <div className="flex justify-between items-center bg-slate-900/50 p-6 rounded-3xl border border-white/5">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 bg-indigo-500/10 rounded-2xl flex items-center justify-center border border-indigo-500/20 shadow-lg shadow-indigo-500/5">
            <History className="text-indigo-400" size={24} />
          </div>
          <div>
            <h1 className="text-2xl font-black text-white uppercase tracking-tighter">System Audit Trails</h1>
            <p className="text-[10px] font-mono text-indigo-400/70 uppercase tracking-widest">Security Event Monitor</p>
          </div>
        </div>

        <div className="relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" size={16} />
          <input 
            type="text"
            placeholder="Search flux event..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="bg-slate-950/50 border border-white/10 rounded-2xl py-3 pl-12 pr-6 text-xs text-white focus:ring-2 focus:ring-indigo-500/50 outline-none w-64 transition-all"
          />
        </div>
      </div>

      <div className="glass rounded-[2rem] border-white/5 overflow-hidden">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-white/5 text-[10px] uppercase font-bold text-slate-400 border-b border-white/5">
              <th className="p-6 tracking-widest">Temporal Node</th>
              <th className="p-6 tracking-widest">Subject (Operator)</th>
              <th className="p-6 tracking-widest">Action Vector</th>
              <th className="p-6 tracking-widest">Target Repository</th>
              <th className="p-6 tracking-widest">Metadata Proxy</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/5">
            {loading ? (
               <tr>
                 <td colSpan={5} className="p-20 text-center">
                    <div className="w-8 h-8 border-2 border-indigo-500/20 border-t-indigo-400 rounded-full animate-spin mx-auto mb-4" />
                    <p className="text-[10px] font-mono text-slate-500 uppercase tracking-widest">Decrypting Logs...</p>
                 </td>
               </tr>
            ) : filteredLogs.length === 0 ? (
               <tr>
                 <td colSpan={5} className="p-20 text-center">
                    <Activity className="text-slate-800 mx-auto mb-4" size={48} />
                    <p className="text-[10px] font-mono text-slate-600 uppercase tracking-widest">No Security Events Captured</p>
                 </td>
               </tr>
            ) : (
              filteredLogs.map((log) => {
                const email = log.userName || log.userEmail || 'anonymous';
                const moduleName = log.module || log.collection || 'N/A';
                const description = log.description || '';
                const time = log.createdAt || log.timestamp;

                return (
                  <tr key={log.id} className="hover:bg-white/5 transition-colors group">
                    <td className="p-6">
                      <div className="flex items-center gap-2 text-indigo-400">
                        <Clock size={12} />
                        <span className="text-[10px] font-mono">
                          {time instanceof Timestamp ? time.toDate().toLocaleString('id-ID') : 'PendingSync'}
                        </span>
                      </div>
                    </td>
                    <td className="p-6">
                      <div className="flex flex-col">
                        <span className="text-[11px] font-bold text-white uppercase">{email.split('@')[0]}</span>
                        <span className="text-[9px] font-mono text-slate-500 lowercase">{email}</span>
                      </div>
                    </td>
                    <td className="p-6">
                      <span className={`px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest ${
                        (log.severity === 'CRITICAL' || log.action === 'RESET') ? 'bg-red-500/10 text-red-500 border border-red-500/20' :
                        (log.severity === 'WARNING' || log.action === 'DELETE') ? 'bg-orange-500/10 text-orange-500 border border-orange-500/20' :
                        log.action === 'BACKUP' ? 'bg-emerald-500/10 text-emerald-500 border border-emerald-500/20' :
                        'bg-indigo-500/10 text-indigo-400 border border-indigo-500/20'
                      }`}>
                        {log.action}
                      </span>
                    </td>
                    <td className="p-6">
                      <div className="flex items-center gap-2">
                         <Database size={10} className="text-slate-600" />
                         <span className="text-[10px] font-bold text-slate-400 uppercase">{moduleName}</span>
                      </div>
                    </td>
                    <td className="p-6 text-right">
                      <div className="flex items-center justify-end gap-2 opacity-30 group-hover:opacity-100 transition-opacity">
                        <div className="text-[10px] font-mono text-slate-600 truncate max-w-[200px]">
                          {description || JSON.stringify(log.payload || {})}
                        </div>
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
      
      <div className="p-6 bg-indigo-500/5 border border-indigo-500/10 rounded-2xl flex gap-4">
        <div className="shrink-0 w-10 h-10 bg-indigo-500/10 rounded-xl flex items-center justify-center text-indigo-400">
           <Shield size={20} />
        </div>
        <div className="space-y-1">
          <h4 className="text-[10px] font-bold text-indigo-400 uppercase tracking-widest">Immutable Ledger Policy</h4>
          <p className="text-[9px] text-indigo-200/50 leading-relaxed uppercase tracking-tighter">
            Audit logs are append-only records of critical system interactions. These records provide transparency and are used for compliance monitoring and security posture evaluation. 
          </p>
        </div>
      </div>
    </div>
  );
}
