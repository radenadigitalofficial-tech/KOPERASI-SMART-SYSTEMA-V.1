import React, { useState, useEffect } from 'react';
import { 
  collection, addDoc, onSnapshot, query, orderBy, 
  serverTimestamp, updateDoc, doc, deleteDoc 
} from 'firebase/firestore';
import { auth, db } from '../../services/firebase';
import { handleFirestoreError, OperationType } from '../../utils/firestoreUtils';
import { logAudit } from '../../utils/auditLogger';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Smartphone, Zap, CreditCard, Search, Plus, 
  Filter, Trash2, Edit2, Loader2, CheckCircle2, Clock
} from 'lucide-react';
import { CustomerSelector } from './CommonComponents';

interface PPOBTransaction {
  id?: string;
  type: string;
  provider: string;
  nominal: number;
  costPrice: number;
  sellingPrice: number;
  customerType: 'Anggota' | 'Umum';
  customerId: string;
  customerName: string;
  phoneNo: string;
  status: 'Pending' | 'Completed' | 'Failed';
  notes: string;
  profit: number;
  createdAt: any;
}

export default function PPOBModule({ anggotaList }: { anggotaList: any[] }) {
  const [data, setData] = useState<PPOBTransaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  
  // Form State
  const [customerType, setCustomerType] = useState<'Anggota' | 'Umum'>('Anggota');
  const [selectedAnggotaId, setSelectedAnggotaId] = useState('');
  const [customerName, setCustomerName] = useState('');
  const [formData, setFormData] = useState({
    type: 'Pulsa',
    provider: '',
    nominal: 0,
    costPrice: 0,
    sellingPrice: 0,
    phoneNo: '',
    status: 'Pending',
    notes: ''
  });

  useEffect(() => {
    const q = query(collection(db, 'service_ppob'), orderBy('createdAt', 'desc'));
    const unsub = onSnapshot(q, (snapshot) => {
      setData(snapshot.docs.map(d => ({ id: d.id, ...d.data() } as PPOBTransaction)));
      setLoading(false);
    }, (error) => handleFirestoreError(error, OperationType.LIST, 'service_ppob'));
    return () => unsub();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      const finalCustomerName = customerType === 'Anggota' 
        ? anggotaList.find(a => a.id_anggota === selectedAnggotaId)?.nama || 'Unknown'
        : customerName;

      const payload: Omit<PPOBTransaction, 'id'> = {
        ...formData,
        customerType,
        customerId: customerType === 'Anggota' ? selectedAnggotaId : 'NON-ANGGOTA',
        customerName: finalCustomerName,
        profit: formData.sellingPrice - formData.costPrice,
        createdAt: serverTimestamp(),
        status: formData.status as any
      };

      const docRef = await addDoc(collection(db, 'service_ppob'), payload);
      
      const user = auth.currentUser;
      if (user) {
        await logAudit({
          action: 'CREATE_PPOB',
          module: 'JASA',
          description: `Transaksi PPOB ${formData.type} untuk ${finalCustomerName} nominal Rp ${formData.nominal.toLocaleString('id-ID')}`,
          userId: user.uid,
          userName: user.displayName || user.email || 'Admin',
          targetId: docRef.id,
          severity: 'INFO'
        });
      }

      setShowForm(false);
      resetForm();
    } catch (error) {
      console.error(error);
      alert('Failed to log PPOB transaction');
    } finally {
      setIsSubmitting(false);
    }
  };

  const resetForm = () => {
    setFormData({
      type: 'Pulsa',
      provider: '',
      nominal: 0,
      costPrice: 0,
      sellingPrice: 0,
      phoneNo: '',
      status: 'Pending',
      notes: ''
    });
    setSelectedAnggotaId('');
    setCustomerName('');
  };

  const filteredData = data.filter(item => 
    item.customerName.toLowerCase().includes(searchTerm.toLowerCase()) || 
    item.phoneNo.includes(searchTerm) ||
    item.provider.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-6">
      {/* HEADER BUS */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-cyan-500/10 flex items-center justify-center text-cyan-400 border border-cyan-500/20 shadow-lg shadow-cyan-500/5">
            <Smartphone size={24} />
          </div>
          <div>
            <h2 className="text-xl font-black text-white uppercase tracking-tighter">PPOB Connectivity Hub</h2>
            <p className="text-[10px] font-mono text-slate-500 uppercase tracking-widest">Digital recharge & utility payments portal</p>
          </div>
        </div>
        <button 
          onClick={() => setShowForm(!showForm)}
          className="px-6 py-3 bg-gradient-to-r from-cyan-600 to-emerald-600 rounded-2xl text-white text-[10px] font-bold uppercase tracking-widest flex items-center gap-2 hover:scale-105 active:scale-95 transition-all shadow-lg shadow-cyan-900/20"
        >
          {showForm ? 'Abort Transaction' : <><Plus size={16} /> New Transaction</>}
        </button>
      </div>

      <AnimatePresence>
        {showForm && (
          <motion.div 
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="overflow-hidden"
          >
            <form onSubmit={handleSubmit} className="bg-slate-900/40 border border-white/5 p-8 rounded-[2rem] space-y-8">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                {/* COLUMN 1: CUSTOMER */}
                <div className="space-y-6">
                  <h3 className="text-xs font-bold text-cyan-400 uppercase tracking-[0.2em] border-l-2 border-cyan-500 pl-3">Customer Identity</h3>
                  <CustomerSelector 
                    customerType={customerType}
                    setCustomerType={setCustomerType}
                    selectedAnggotaId={selectedAnggotaId}
                    setSelectedAnggotaId={setSelectedAnggotaId}
                    customerName={customerName}
                    setCustomerName={setCustomerName}
                    anggotaList={anggotaList}
                  />
                  <div className="flex flex-col gap-2">
                    <label className="text-[10px] font-mono text-slate-500 uppercase font-bold tracking-widest px-1">Customer Number / ID</label>
                    <input 
                      type="text" 
                      value={formData.phoneNo}
                      onChange={(e) => setFormData({...formData, phoneNo: e.target.value})}
                      placeholder="e.g. 0812xxxxxx or Account ID"
                      className="bg-slate-950/80 border border-white/10 text-slate-200 p-4 rounded-2xl text-sm focus:ring-2 focus:ring-cyan-500/50 outline-none"
                      required
                    />
                  </div>
                </div>

                {/* COLUMN 2: SERVICE DETAILS */}
                <div className="space-y-6">
                  <h3 className="text-xs font-bold text-emerald-400 uppercase tracking-[0.2em] border-l-2 border-emerald-500 pl-3">Service Mapping</h3>
                  <div className="flex flex-col gap-4">
                    <div className="flex flex-col gap-2">
                      <label className="text-[10px] font-mono text-slate-500 uppercase font-bold tracking-widest px-1">Service Protocol</label>
                      <select 
                        value={formData.type}
                        onChange={(e) => setFormData({...formData, type: e.target.value})}
                        className="bg-slate-950/80 border border-white/10 text-slate-200 p-4 rounded-2xl text-sm focus:ring-2 focus:ring-cyan-500/50 outline-none appearance-none"
                      >
                        <option>Pulsa</option>
                        <option>Paket Data</option>
                        <option>Token Listrik</option>
                        <option>PLN Pascabayar</option>
                        <option>Top Up E-Wallet</option>
                      </select>
                    </div>
                    <div className="flex flex-col gap-2">
                      <label className="text-[10px] font-mono text-slate-500 uppercase font-bold tracking-widest px-1">Network Provider</label>
                      <input 
                        type="text" 
                        value={formData.provider}
                        onChange={(e) => setFormData({...formData, provider: e.target.value})}
                        placeholder="e.g. Telkomsel, PLN, Shopee"
                        className="bg-slate-950/80 border border-white/10 text-slate-200 p-4 rounded-2xl text-sm focus:ring-2 focus:ring-cyan-500/50 outline-none"
                        required
                      />
                    </div>
                  </div>
                </div>

                {/* COLUMN 3: VALUATION */}
                <div className="space-y-6">
                  <h3 className="text-xs font-bold text-purple-400 uppercase tracking-[0.2em] border-l-2 border-purple-500 pl-3">Economic Matrix</h3>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="flex flex-col gap-2">
                      <label className="text-[10px] font-mono text-slate-500 uppercase font-bold tracking-widest px-1">Modal Price</label>
                      <input 
                        type="number" 
                        value={formData.costPrice}
                        onChange={(e) => setFormData({...formData, costPrice: Number(e.target.value)})}
                        className="bg-slate-950/80 border border-white/10 text-slate-200 p-4 rounded-2xl text-sm font-mono"
                        required
                        min="0"
                      />
                    </div>
                    <div className="flex flex-col gap-2">
                      <label className="text-[10px] font-mono text-slate-500 uppercase font-bold tracking-widest px-1">Retail Price</label>
                      <input 
                        type="number" 
                        value={formData.sellingPrice}
                        onChange={(e) => setFormData({...formData, sellingPrice: Number(e.target.value)})}
                        className="bg-slate-950/80 border border-white/10 text-slate-200 p-4 rounded-2xl text-sm font-mono"
                        required
                        min="0"
                      />
                    </div>
                  </div>
                  <div className="bg-emerald-500/10 border border-emerald-500/20 p-4 rounded-2xl flex justify-between items-center px-6">
                    <span className="text-[10px] font-mono text-emerald-400 uppercase font-bold tracking-widest">Est. Net Profit</span>
                    <span className="text-lg font-bold text-white font-mono">Rp {(formData.sellingPrice - formData.costPrice).toLocaleString('id-ID')}</span>
                  </div>
                </div>
              </div>

              <div className="flex gap-4 pt-6 border-t border-white/5">
                <button 
                  type="submit" 
                  disabled={isSubmitting}
                  className="flex-1 py-5 bg-gradient-to-r from-cyan-600 to-emerald-600 rounded-[1.5rem] text-white text-xs font-bold uppercase tracking-[0.3em] flex items-center justify-center gap-3 shadow-xl hover:scale-[1.01] active:scale-95 transition-all disabled:opacity-50"
                >
                  {isSubmitting ? <Loader2 className="animate-spin" /> : <CreditCard size={20} />}
                  Authorize & Finalize Transaction
                </button>
                <button 
                  type="button" 
                  onClick={() => { setShowForm(false); resetForm(); }}
                  className="px-10 py-5 bg-white/5 border border-white/10 rounded-[1.5rem] text-slate-400 text-xs font-bold uppercase tracking-widest hover:bg-white/10 transition-all"
                >
                  Abort
                </button>
              </div>
            </form>
          </motion.div>
        )}
      </AnimatePresence>

      {/* LIST DATA */}
      <div className="bg-slate-950/40 border border-white/5 rounded-[2rem] overflow-hidden">
        <div className="p-6 border-b border-white/5 flex flex-col md:flex-row justify-between gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" size={18} />
            <input 
              type="text" 
              placeholder="Search by customer, phone, or provider..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-slate-900 border border-white/10 text-slate-300 pl-12 pr-4 py-3 rounded-2xl text-sm focus:ring-2 focus:ring-cyan-500/50 outline-none transition-all"
            />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-white/5">
                <th className="p-6 text-[10px] font-mono text-cyan-400 uppercase tracking-widest">Protocol / Type</th>
                <th className="p-6 text-[10px] font-mono text-cyan-400 uppercase tracking-widest">Customer Entity</th>
                <th className="p-6 text-[10px] font-mono text-cyan-400 uppercase tracking-widest">Network Details</th>
                <th className="p-6 text-[10px] font-mono text-cyan-400 uppercase tracking-widest text-center">Value Matrix</th>
                <th className="p-6 text-[10px] font-mono text-cyan-400 uppercase tracking-widest text-center">Status</th>
                <th className="p-6 text-[10px] font-mono text-cyan-400 uppercase tracking-widest text-center tracking-tighter">Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={6} className="p-20 text-center">
                    <Loader2 className="animate-spin mx-auto text-cyan-400 mb-4" size={32} />
                    <p className="text-xs font-mono text-slate-500 uppercase tracking-widest">Decrypting Transaction Ledger...</p>
                  </td>
                </tr>
              ) : filteredData.length === 0 ? (
                <tr>
                  <td colSpan={6} className="p-20 text-center">
                    <div className="text-slate-600 mb-4 flex justify-center"><Search size={48} opacity={0.2} /></div>
                    <p className="text-xs font-mono text-slate-500 uppercase tracking-widest">No matching transaction nodes found in registry.</p>
                  </td>
                </tr>
              ) : filteredData.map((item) => (
                <tr key={item.id} className="border-b border-white/5 hover:bg-white/5 transition-colors group">
                  <td className="p-6">
                    <div className="text-xs font-bold text-white uppercase">{item.type}</div>
                    <div className="text-[9px] text-slate-500 font-mono mt-1 italic">TID: {item.id?.substring(0, 8)}</div>
                  </td>
                  <td className="p-6">
                    <div className="text-xs font-bold text-white uppercase">{item.customerName}</div>
                    <div className="text-[9px] text-slate-500 font-mono mt-1 uppercase tracking-tighter">{item.customerType} • {item.customerId}</div>
                  </td>
                  <td className="p-6">
                    <div className="text-xs text-white uppercase">{item.provider}</div>
                    <div className="text-[10px] text-cyan-400/70 font-mono mt-1">{item.phoneNo}</div>
                  </td>
                  <td className="p-6 text-center">
                    <div className="text-xs font-bold text-white font-mono">Rp {item.sellingPrice.toLocaleString('id-ID')}</div>
                    <div className="text-[8px] text-emerald-400 font-mono mt-1 uppercase tracking-tighter">Profit: Rp {item.profit.toLocaleString('id-ID')}</div>
                  </td>
                  <td className="p-6 text-center">
                    <div className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[9px] font-bold border ${
                      item.status === 'Completed' ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' :
                      item.status === 'Failed' ? 'bg-red-500/10 text-red-400 border-red-500/20' :
                      'bg-orange-500/10 text-orange-400 border-orange-500/20'
                    }`}>
                      {item.status === 'Completed' ? <CheckCircle2 size={10} /> : <Clock size={10} />}
                      {item.status.toUpperCase()}
                    </div>
                  </td>
                  <td className="p-6 text-center">
                    <div className="flex items-center justify-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button className="p-2 bg-slate-800 text-slate-400 hover:text-cyan-400 rounded-lg transition-colors"><Edit2 size={12} /></button>
                      <button 
                        onClick={() => { if(confirm('Terminate transaction record?')) deleteDoc(doc(db, 'service_ppob', item.id!)) }}
                        className="p-2 bg-slate-800 text-slate-400 hover:text-red-400 rounded-lg transition-colors"
                      >
                        <Trash2 size={12} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
