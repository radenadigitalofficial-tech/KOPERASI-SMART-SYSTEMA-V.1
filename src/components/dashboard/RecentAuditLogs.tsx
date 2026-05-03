import React, { useState, useEffect } from 'react';
import { 
  collection, query, orderBy, limit, onSnapshot 
} from 'firebase/firestore';
import { db } from '../../services/firebase';
import { Shield } from 'lucide-react';
import { handleFirestoreError, OperationType } from '../../utils/firestoreUtils';

const RecentAuditLogs = () => {
  const [logs, setLogs] = useState<any[]>([]);
  useEffect(() => {
    const q = query(collection(db, 'audit_logs'), orderBy('createdAt', 'desc'), limit(5));
    const unsub = onSnapshot(q, (s) => setLogs(s.docs.map(d => ({ id: d.id, ...d.data() }))), (error) => handleFirestoreError(error, OperationType.LIST, 'audit_logs'));
    return unsub;
  }, []);

  if (logs.length === 0) return <p className="text-center py-10 text-[10px] text-slate-600 uppercase font-mono">No Recent System Events</p>;

  return (
    <div className="space-y-3">
      {logs.map((l) => {
        const action = l.action || 'UNKNOWN';
        const email = l.userName || l.userEmail || 'anonymous';
        const moduleName = l.module || l.collection || 'SYSTEM';
        const time = l.createdAt || l.timestamp;

        return (
          <div key={l.id} className="p-3 bg-white/5 border border-white/5 rounded-2xl flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-xl bg-indigo-500/10 flex items-center justify-center text-indigo-400">
                <Shield size={14} />
              </div>
              <div className="overflow-hidden">
                <p className="text-[10px] font-bold text-white uppercase truncate">{action} IN {moduleName}</p>
                <p className="text-[8px] text-slate-500 uppercase font-mono truncate">{email}</p>
              </div>
            </div>
            <span className="text-[8px] font-mono text-indigo-400 uppercase">
              {time?.toDate?.() ? time.toDate().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'Sync'}
            </span>
          </div>
        );
      })}
    </div>
  );
};

export default RecentAuditLogs;
