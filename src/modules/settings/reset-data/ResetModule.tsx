import React, { useState } from 'react';
import { 
  Trash2, AlertCircle, ShieldAlert, Loader2, 
  CheckCircle2, AlertTriangle, Key, Info, 
  DatabaseZap, Settings2
} from 'lucide-react';
import { collection, getDocs, writeBatch, doc } from 'firebase/firestore';
import { auth, db } from '../../../services/firebase';
import { logAudit } from '../../../utils/auditLogger';

const RESET_OPTIONS = [
  { id: 'savings', label: 'Reset Transaksi Simpanan', collections: ['mandatory_savings', 'voluntary_savings', 'member_savings'], description: 'Menghapus saldo dan history simpanan wajib, sukarela, dan tabungan.' },
  { id: 'loans', label: 'Reset Transaksi Pinjaman', collections: ['pinjaman', 'cicilan'], description: 'Menghapus seluruh kontrak pinjaman dan jadwal angsuran.' },
  { id: 'products', label: 'Reset Produk & Inventori', collections: ['products'], description: 'Menghapus katalog produk dan stok barang.' },
  { id: 'ppob', label: 'Reset Transaksi PPOB', collections: ['service_ppob'], description: 'Menghapus history transaksi pulsa, listrik, dan tagihan PPOB.' },
  { id: 'unit_jasa', label: 'Reset Unit Jasa Lainnya', collections: ['service_travel', 'service_gor', 'service_printing', 'service_digital', 'service_credit_goods'], description: 'Menghapus history Travel, GOR, Printing, dan Digital Service.' },
  { id: 'dpk', label: 'Reset Dana Pihak Ketiga', collections: ['dana_pihak_ketiga', 'third_party_funds'], description: 'Menghapus data hibah dan pendanaan pihak luar.' },
  { id: 'ledger', label: 'Reset Ledger Utama', collections: ['transaksi'], description: 'Menghapus seluruh entry pada General Ledger system.' },
  { id: 'all_trans', label: 'RESET SEMUA TRANSAKSI', collections: ['transaksi', 'penjualan', 'purchase_transactions', 'pinjaman', 'cicilan', 'mandatory_savings', 'voluntary_savings', 'member_savings', 'service_travel', 'service_gor', 'service_ppob', 'service_printing', 'service_digital', 'service_credit_goods', 'dana_pihak_ketiga', 'third_party_funds'], description: 'AKSI TOTAL: Menghapus seluruh aktivitas transaksi tanpa menyisakan history.', danger: true }
];

export default function ResetModule({ isAdmin }: { isAdmin: boolean }) {
  const [selectedReset, setSelectedReset] = useState<string | null>(null);
  const [confirmText, setConfirmText] = useState('');
  const [isConfirmed, setIsConfirmed] = useState(false);
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState<{ type: 'success' | 'error', message: string } | null>(null);
  const [showModal, setShowModal] = useState(false);

  if (!isAdmin) {
    return (
      <div className="p-8 bg-red-500/10 border border-red-500/20 rounded-3xl text-center">
        <h2 className="text-xl font-bold text-red-500 uppercase tracking-tighter">Access Denied</h2>
        <p className="text-xs text-red-400/70 mt-2 uppercase font-mono tracking-widest">Unauthorized Access Detected</p>
      </div>
    );
  }

  const activeOption = RESET_OPTIONS.find(o => o.id === selectedReset);

  const handleReset = async () => {
    if (confirmText !== 'KONFIRMASI' || !isConfirmed || !activeOption) {
      setStatus({ type: 'error', message: 'Teks Konfirmasi Salah!' });
      return;
    }

    setLoading(true);
    setStatus(null);
    
    try {
      let totalDeleted = 0;
      
      for (const colId of activeOption.collections) {
        const snapshot = await getDocs(collection(db, colId));
        if (snapshot.empty) continue;

        // Firestore batches are limited to 500 operations
        const chunks = [];
        for (let i = 0; i < snapshot.docs.length; i += 500) {
          chunks.push(snapshot.docs.slice(i, i + 500));
        }

        for (const chunk of chunks) {
          const batch = writeBatch(db);
          chunk.forEach(d => batch.delete(doc(db, colId, d.id)));
          await batch.commit();
          totalDeleted += chunk.length;
        }
      }
      
      const user = auth.currentUser;
      if (user) {
        await logAudit({
          action: 'RESET_DATA',
          module: 'SETTINGS',
          description: `Reset data ${activeOption.label} (${totalDeleted} dokumen dihapus)`,
          userId: user.uid,
          userName: user.displayName || user.email || 'Admin',
          severity: 'CRITICAL'
        });
      }

      setStatus({ type: 'success', message: `${totalDeleted} Nodes Data Berhasil Direset!` });
      setShowModal(false);
      setIsConfirmed(false);
      setSelectedReset(null);
    } catch (error) {
      console.error(error);
      setStatus({ type: 'error', message: 'Gagal melakukan reset data. Hubungi System Admin.' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      <div className="flex bg-slate-950 p-8 rounded-[2.5rem] border border-red-500/10 gap-6 relative overflow-hidden">
        <div className="absolute -top-10 -right-10 w-40 h-40 bg-red-500/5 blur-3xl animate-pulse" />
        <div className="shrink-0 w-16 h-16 bg-red-500/10 rounded-2xl flex items-center justify-center border border-red-500/20 shadow-xl shadow-red-950/20">
          <DatabaseZap className="text-red-500" size={32} />
        </div>
        <div className="space-y-2">
          <h1 className="text-2xl font-black text-white uppercase tracking-tighter">Emergency Data Reset</h1>
          <p className="text-[10px] font-mono text-red-500 font-bold uppercase tracking-[0.2em]">Maintenance & Logical Re-initialization</p>
          <div className="pt-2">
             <span className="px-3 py-1 bg-red-500/10 text-red-500 border border-red-500/20 rounded-full text-[8px] font-black uppercase tracking-widest">Aksi Irreversibel</span>
          </div>
        </div>
      </div>

      {status && (
        <div className={`p-5 rounded-2xl border flex items-center justify-between gap-3 animate-in fade-in zoom-in duration-300 ${
          status.type === 'success' ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400' : 'bg-red-500/10 border-red-500/20 text-red-400'
        }`}>
          <div className="flex items-center gap-3">
            {status.type === 'success' ? <CheckCircle2 size={24} /> : <ShieldAlert size={24} />}
            <div>
              <p className="text-[11px] font-bold uppercase tracking-widest">{status.type === 'success' ? 'Operation Success' : 'Operation Failed'}</p>
              <p className="text-[10px] font-mono opacity-80">{status.message}</p>
            </div>
          </div>
          <button onClick={() => setStatus(null)} className="text-[10px] uppercase font-bold hover:underline opacity-50">Dismiss</button>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {RESET_OPTIONS.map((option) => (
          <div 
            key={option.id}
            onClick={() => setSelectedReset(option.id)}
            className={`group p-6 rounded-3xl border-2 transition-all cursor-pointer relative overflow-hidden flex flex-col gap-4 ${
              selectedReset === option.id 
              ? (option.danger ? 'bg-red-500/10 border-red-500/40' : 'bg-amber-500/10 border-amber-500/40') 
              : 'bg-slate-900/30 border-white/5 hover:border-white/20'
            }`}
          >
            <div className="flex justify-between items-start">
               <div className={`w-10 h-10 rounded-xl flex items-center justify-center transition-colors ${
                 selectedReset === option.id ? 'bg-white/20 text-white' : 'bg-slate-950 text-slate-500'
               }`}>
                 <Trash2 size={20} />
               </div>
               {selectedReset === option.id && (
                 <div className="animate-pulse">
                   <AlertCircle size={16} className={option.danger ? 'text-red-500' : 'text-amber-500'} />
                 </div>
               )}
            </div>
            
            <div className="space-y-1">
              <h3 className={`text-xs font-black uppercase tracking-tight ${selectedReset === option.id ? 'text-white' : 'text-slate-400'}`}>
                {option.label}
              </h3>
              <p className="text-[9px] text-slate-500 leading-relaxed uppercase tracking-tighter">
                {option.description}
              </p>
            </div>

            {selectedReset === option.id && (
              <button 
                onClick={(e) => { e.stopPropagation(); setShowModal(true); }}
                className={`mt-2 w-full py-3 rounded-xl text-[10px] font-bold uppercase tracking-widest transition-all ${
                  option.danger ? 'bg-red-600 hover:bg-red-500 text-white' : 'bg-amber-600 hover:bg-amber-500 text-white'
                }`}
              >
                PROSES RESET DATA
              </button>
            )}
          </div>
        ))}
      </div>

      <div className="p-8 bg-slate-900/50 rounded-3xl border border-white/5 space-y-4">
        <div className="flex items-center gap-2 text-cyan-400">
           <Info size={16} />
           <h4 className="text-[10px] font-bold uppercase tracking-widest">Resetting Knowledge</h4>
        </div>
        <p className="text-[9px] text-slate-500 uppercase tracking-tight leading-relaxed">
          Resetting data will permanently remove documents from their respective collections. Authentication data, membership profiles, and core system settings will remain intact. Ensure a backup has been performed before initiating high-level data neutralization.
        </p>
      </div>

      {/* CONFIRMATION MODAL */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-6 bg-black/80 backdrop-blur-sm">
          <div className="glass max-w-md w-full p-8 rounded-[3rem] border-red-500/20 space-y-8 animate-in zoom-in slide-in-from-bottom-2 duration-300">
            <div className="text-center space-y-2">
              <div className="w-16 h-16 bg-red-500/10 rounded-full flex items-center justify-center border border-red-500/20 mx-auto mb-4">
                <ShieldAlert className="text-red-500" size={32} />
              </div>
              <h2 className="text-xl font-bold text-white uppercase tracking-tighter">Neutralization Confirmation</h2>
              <p className="text-[9px] font-mono text-slate-500 uppercase">Aksi ini bersifat permanen dan berbahaya</p>
            </div>

            <div className="p-4 bg-red-500/5 rounded-2xl border border-red-500/10">
               <p className="text-[10px] text-red-200/50 uppercase tracking-tighter text-center italic">
                 "Saya mengerti bahwa menghapus data <span className="text-red-400 font-bold">{activeOption?.label}</span> akan mengakibatkan kehilangan data selamanya."
               </p>
            </div>

            <div className="space-y-6">
              <div className="space-y-2">
                 <label className="text-[9px] font-mono text-slate-500 uppercase ml-2 flex items-center gap-2">
                   <Key size={10} /> Konfirmasi Pengetikan (Ketik: KONFIRMASI)
                 </label>
                 <input 
                   type="text" 
                   value={confirmText}
                   onChange={(e) => setConfirmText(e.target.value.toUpperCase())}
                   placeholder="KONFIRMASI"
                   className="w-full bg-slate-950 border border-white/5 rounded-2xl p-4 text-sm font-mono text-center tracking-widest focus:ring-2 focus:ring-red-500/30 outline-none text-red-500"
                 />
              </div>

              <label className="flex items-start gap-3 p-4 bg-white/5 rounded-2xl cursor-pointer hover:bg-white/10 transition-colors">
                <input 
                  type="checkbox" 
                  checked={isConfirmed}
                  onChange={(e) => setIsConfirmed(e.target.checked)}
                  className="mt-1 w-4 h-4 rounded border-slate-700 bg-slate-900 checked:bg-red-500 transition-all"
                />
                <span className="text-[9px] text-slate-400 uppercase tracking-tight leading-relaxed select-none">
                  SAYA KONFIRMASI BAHWA SAYA INGIN MENGHAPUS SELURUH DATA AKTIVITAS PADA CATEGORY YANG DIPILIH.
                </span>
              </label>
            </div>

            <div className="flex gap-4">
               <button 
                 onClick={() => setShowModal(false)}
                 className="flex-1 py-4 bg-slate-800 hover:bg-slate-700 text-white text-[10px] font-bold uppercase tracking-widest rounded-2xl transition-all"
               >
                 Batal
               </button>
               <button 
                 onClick={handleReset}
                 disabled={!isConfirmed || confirmText !== 'KONFIRMASI' || loading}
                 className="flex-1 py-4 bg-red-600 hover:bg-red-500 disabled:opacity-50 disabled:grayscale text-white text-[10px] font-bold uppercase tracking-widest rounded-2xl transition-all shadow-xl shadow-red-950/20 flex items-center justify-center gap-2"
               >
                 {loading ? <Loader2 className="animate-spin" size={14} /> : <Trash2 size={14} />}
                 HAPUS DATA
               </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
