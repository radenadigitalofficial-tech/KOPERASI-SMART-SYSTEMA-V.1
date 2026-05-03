import React, { useState } from 'react';
import { 
  Download, FileJson, FileSpreadsheet, Database, 
  ShieldCheck, Loader2, CheckCircle2, AlertTriangle, Clock
} from 'lucide-react';
import { collection, getDocs } from 'firebase/firestore';
import { auth, db } from '../../../services/firebase';
import { logAudit } from '../../../utils/auditLogger';
import * as XLSX from 'xlsx';

// List of major collections in the system
const COLLECTIONS = [
  { id: 'anggota', label: 'Data Anggota', icon: 'Users' },
  { id: 'transaksi', label: 'Data Transaksi', icon: 'Activity' },
  { id: 'dana_pihak_ketiga', label: 'Dana Pihak Ketiga (Legacy)', icon: 'Briefcase' },
  { id: 'third_party_funds', label: 'Dana Pihak Ketiga (New)', icon: 'Briefcase' },
  { id: 'pinjaman', label: 'Data Pinjaman', icon: 'CreditCard' },
  { id: 'cicilan', label: 'Data Cicilan', icon: 'Clock' },
  { id: 'products', label: 'Data Produk / Inventori', icon: 'Package' },
  { id: 'penjualan', label: 'Data Penjualan POS', icon: 'ShoppingBag' },
  { id: 'suppliers', label: 'Data Supplier', icon: 'Truck' },
  { id: 'product_categories', label: 'Kategori Produk', icon: 'ShoppingBag' },
  { id: 'purchase_transactions', label: 'Data Pembelian / Restock', icon: 'TrendingUp' },
  { id: 'mandatory_savings', label: 'Simpanan Wajib', icon: 'Wallet' },
  { id: 'voluntary_savings', label: 'Simpanan Sukarela', icon: 'Wallet' },
  { id: 'member_savings', label: 'Tabungan Anggota', icon: 'Wallet' },
  { id: 'service_travel', label: 'Unit Jasa: Travel', icon: 'Cpu' },
  { id: 'service_gor', label: 'Unit Jasa: GOR', icon: 'Cpu' },
  { id: 'service_ppob', label: 'Unit Jasa: PPOB', icon: 'Cpu' },
  { id: 'service_printing', label: 'Unit Jasa: Printing', icon: 'Cpu' },
  { id: 'service_digital', label: 'Unit Jasa: Digital', icon: 'Cpu' },
  { id: 'service_credit_goods', label: 'Unit Jasa: Kredit Barang', icon: 'Cpu' },
  { id: 'cooperative_management', label: 'Pengurus Koperasi', icon: 'ShieldCheck' },
  { id: 'cooperative_supervisors', label: 'Pengawas Koperasi', icon: 'ShieldCheck' },
  { id: 'cooperative_profile', label: 'Profil Koperasi', icon: 'Building2' },
  { id: 'settings', label: 'Global Configurations', icon: 'Settings2' }
];

export default function BackupModule({ isAdmin }: { isAdmin: boolean }) {
  const [selectedCollections, setSelectedCollections] = useState<string[]>(COLLECTIONS.map(c => c.id));
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState<{ type: 'success' | 'error', message: string } | null>(null);

  if (!isAdmin) {
    return (
      <div className="p-8 bg-red-500/10 border border-red-500/20 rounded-3xl text-center">
        <h2 className="text-xl font-bold text-red-500 uppercase tracking-tighter">Access Denied</h2>
        <p className="text-xs text-red-400/70 mt-2 uppercase font-mono tracking-widest">Unauthorized Access Detected</p>
      </div>
    );
  }

  const toggleCollection = (id: string) => {
    setSelectedCollections(prev => 
      prev.includes(id) ? prev.filter(c => c !== id) : [...prev, id]
    );
  };

  const selectAll = () => setSelectedCollections(COLLECTIONS.map(c => c.id));
  const selectNone = () => setSelectedCollections([]);

  const fetchAllData = async () => {
    const backupData: Record<string, any[]> = {};
    for (const colId of selectedCollections) {
      try {
        const snapshot = await getDocs(collection(db, colId));
        backupData[colId] = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }));
      } catch (error) {
        console.error(`Error fetching ${colId}:`, error);
      }
    }
    return backupData;
  };

  const exportToJson = async () => {
    if (!isAdmin || selectedCollections.length === 0) return;
    setLoading(true);
    setStatus(null);
    try {
      const data = await fetchAllData();
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      const timestamp = new Date().toISOString().split('T')[0];
      link.href = url;
      link.download = `koperasi-backup-${timestamp}.json`;
      link.click();
      URL.revokeObjectURL(url);
      
      const user = auth.currentUser;
      if (user) {
        await logAudit({
          action: 'BACKUP_JSON',
          module: 'SETTINGS',
          description: `Download backup JSON untuk ${selectedCollections.length} koleksi`,
          userId: user.uid,
          userName: user.displayName || user.email || 'Admin',
          severity: 'INFO'
        });
      }

      setStatus({ type: 'success', message: 'Backup JSON berhasil di-download.' });
    } catch (error) {
      setStatus({ type: 'error', message: 'Gagal melakukan backup JSON.' });
    } finally {
      setLoading(false);
    }
  };

  const exportToExcel = async () => {
    if (!isAdmin || selectedCollections.length === 0) return;
    setLoading(true);
    setStatus(null);
    try {
      const data = await fetchAllData();
      const workbook = XLSX.utils.book_new();
      
      for (const [colId, rows] of Object.entries(data)) {
        if (rows.length > 0) {
          // Flatten complex objects for Excel if needed
          const flattenedRows = rows.map(row => {
            const flat: any = {};
            for (const [key, val] of Object.entries(row)) {
              if (typeof val === 'object' && val !== null && !(val instanceof Date)) {
                flat[key] = JSON.stringify(val);
              } else if (val && (val as any).seconds) { // Firestore timestamp
                flat[key] = new Date((val as any).seconds * 1000).toLocaleString('id-ID');
              } else {
                flat[key] = val;
              }
            }
            return flat;
          });
          const worksheet = XLSX.utils.json_to_sheet(flattenedRows);
          XLSX.utils.book_append_sheet(workbook, worksheet, colId.substring(0, 31)); // sheet names limited to 31 chars
        }
      }

      const timestamp = new Date().toISOString().split('T')[0];
      XLSX.writeFile(workbook, `koperasi-backup-${timestamp}.xlsx`);
      
      const user = auth.currentUser;
      if (user) {
        await logAudit({
          action: 'BACKUP_EXCEL',
          module: 'SETTINGS',
          description: `Download backup Excel untuk ${selectedCollections.length} koleksi`,
          userId: user.uid,
          userName: user.displayName || user.email || 'Admin',
          severity: 'INFO'
        });
      }

      setStatus({ type: 'success', message: 'Backup Excel berhasil di-download.' });
    } catch (error) {
      console.error(error);
      setStatus({ type: 'error', message: 'Gagal melakukan backup Excel.' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      <div className="flex justify-between items-center bg-slate-900/50 p-6 rounded-3xl border border-white/5">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 bg-cyan-500/10 rounded-2xl flex items-center justify-center border border-cyan-500/20 shadow-lg shadow-cyan-500/5">
            <Database className="text-cyan-400" size={24} />
          </div>
          <div>
            <h1 className="text-2xl font-black text-white uppercase tracking-tighter">Backup Repository</h1>
            <p className="text-[10px] font-mono text-cyan-400/70 uppercase tracking-widest">Database Preservation System</p>
          </div>
        </div>
        
        <div className="flex gap-2">
          <button 
            onClick={exportToJson}
            disabled={loading || selectedCollections.length === 0}
            className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white px-5 py-3 rounded-2xl text-[10px] font-bold uppercase tracking-widest transition-all active:scale-95 shadow-lg shadow-indigo-950/20"
          >
            {loading ? <Loader2 className="animate-spin" size={16} /> : <FileJson size={16} />}
            Export JSON
          </button>
          <button 
            onClick={exportToExcel}
            disabled={loading || selectedCollections.length === 0}
            className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white px-5 py-3 rounded-2xl text-[10px] font-bold uppercase tracking-widest transition-all active:scale-95 shadow-lg shadow-emerald-950/20"
          >
            {loading ? <Loader2 className="animate-spin" size={16} /> : <FileSpreadsheet size={16} />}
            Export Excel
          </button>
        </div>
      </div>

      {status && (
        <div className={`p-4 rounded-2xl border flex items-center gap-3 animate-in fade-in slide-in-from-top-2 duration-300 ${
          status.type === 'success' ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400' : 'bg-red-500/10 border-red-500/20 text-red-400'
        }`}>
          {status.type === 'success' ? <CheckCircle2 size={18} /> : <AlertTriangle size={18} />}
          <p className="text-[10px] font-mono uppercase tracking-widest">{status.message}</p>
        </div>
      )}

      <div className="glass rounded-[2rem] border-white/5 overflow-hidden">
        <div className="p-6 border-b border-white/5 flex justify-between items-center bg-white/5">
          <div className="flex items-center gap-3">
            <h2 className="text-xs font-bold text-white uppercase tracking-widest">Select Collections to Backup</h2>
            <span className="px-2 py-0.5 bg-cyan-500/20 text-cyan-400 rounded-full text-[8px] font-mono leading-none">{selectedCollections.length} Selected</span>
          </div>
          <div className="flex gap-2">
            <button onClick={selectAll} className="text-[9px] font-mono text-slate-500 hover:text-cyan-400 uppercase tracking-tighter transition-colors">Select All</button>
            <span className="text-slate-800">|</span>
            <button onClick={selectNone} className="text-[9px] font-mono text-slate-500 hover:text-red-400 uppercase tracking-tighter transition-colors">Deselect All</button>
          </div>
        </div>

        <div className="p-8 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {COLLECTIONS.map((col) => (
            <div 
              key={col.id}
              onClick={() => toggleCollection(col.id)}
              className={`group flex items-center gap-4 p-4 rounded-2xl border transition-all cursor-pointer select-none ${
                selectedCollections.includes(col.id) 
                ? 'bg-cyan-500/5 border-cyan-500/20 ring-1 ring-cyan-500/10' 
                : 'bg-slate-900/20 border-white/5 grayscale opacity-60 hover:opacity-100 hover:grayscale-0'
              }`}
            >
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center transition-all ${
                selectedCollections.includes(col.id) ? 'bg-cyan-500/20 text-cyan-400' : 'bg-slate-950 text-slate-600 group-hover:bg-slate-900'
              }`}>
                <ShieldCheck size={20} />
              </div>
              <div className="flex-1">
                <p className={`text-[10px] font-bold uppercase tracking-tight transition-colors ${
                  selectedCollections.includes(col.id) ? 'text-white' : 'text-slate-500'
                }`}>{col.label}</p>
                <code className="text-[8px] font-mono text-slate-600 lowercase opacity-60">{col.id}</code>
              </div>
              <div className={`w-5 h-5 rounded-full border flex items-center justify-center transition-all ${
                selectedCollections.includes(col.id) ? 'bg-cyan-500 border-cyan-400 scale-100' : 'bg-transparent border-slate-700 scale-90'
              }`}>
                {selectedCollections.includes(col.id) && <Download size={10} className="text-white" />}
              </div>
            </div>
          ))}
        </div>
      </div>
      
      <div className="p-6 bg-amber-500/5 border border-amber-500/10 rounded-2xl flex gap-4">
        <div className="shrink-0 w-10 h-10 bg-amber-500/10 rounded-xl flex items-center justify-center text-amber-500">
           <AlertTriangle size={20} />
        </div>
        <div className="space-y-1">
          <h4 className="text-[10px] font-bold text-amber-400 uppercase tracking-widest">Important Preservation Notice</h4>
          <p className="text-[9px] text-amber-200/50 leading-relaxed uppercase tracking-tighter">
            Backing up large datasets may take time depending on network latency. It is recommended to perform backups during low-traffic cycles. This process extracts raw document data from Firestore without applying data transformations.
          </p>
        </div>
      </div>
    </div>
  );
}
