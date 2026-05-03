import React, { useState, useEffect } from 'react';
import { 
  collection, addDoc, onSnapshot, query, orderBy, 
  serverTimestamp, doc, deleteDoc 
} from 'firebase/firestore';
import { auth, db } from '../../services/firebase';
import { logAudit } from '../../utils/auditLogger';
import { motion, AnimatePresence } from 'motion/react';
import { 
  ShoppingBag, Search, Plus, Trash2, Edit2, Loader2, 
  CheckCircle2, AlertCircle, Info, Calculator, Percent
} from 'lucide-react';
import { CustomerSelector } from './CommonComponents';

interface CreditModule {
  id?: string;
  itemName: string;
  marketPrice: number;
  creditPrice: number;
  downPayment: number;
  tenor: number; // in months
  monthlyInstallment: number;
  customerName: string;
  customerType: 'Anggota' | 'Umum';
  customerId: string;
  status: 'Active' | 'Paid' | 'Defaulted';
  notes: string;
  profit: number;
  createdAt: any;
}

export default function CreditGoodsModule({ anggotaList }: { anggotaList: any[] }) {
  const [data, setData] = useState<CreditModule[]>([]);
  const [loading, setLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  
  // Form State
  const [customerType, setCustomerType] = useState<'Anggota' | 'Umum'>('Anggota');
  const [selectedAnggotaId, setSelectedAnggotaId] = useState('');
  const [customerName, setCustomerName] = useState('');
  const [formData, setFormData] = useState({
    itemName: '',
    marketPrice: 0,
    creditPrice: 0,
    downPayment: 0,
    tenor: 12,
    notes: ''
  });

  useEffect(() => {
    const q = query(collection(db, 'service_credit_goods'), orderBy('createdAt', 'desc'));
    const unsub = onSnapshot(q, (snapshot) => {
      setData(snapshot.docs.map(d => ({ id: d.id, ...d.data() } as CreditModule)));
      setLoading(false);
    });
    return unsub;
  }, []);

  const calculateInstallment = (credit: number, dp: number, tenor: number) => {
    const principal = credit - dp;
    return principal > 0 ? principal / tenor : 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (formData.creditPrice <= 0) return alert('Credit price must be greater than 0');
    
    setIsSubmitting(true);
    try {
      const finalCustomerName = customerType === 'Anggota' 
        ? anggotaList.find(a => a.id_anggota === selectedAnggotaId)?.nama || 'Unknown'
        : customerName;

      const monthlyInstallment = calculateInstallment(formData.creditPrice, formData.downPayment, formData.tenor);
      const profit = formData.creditPrice - formData.marketPrice;

      const payload: Omit<CreditModule, 'id'> = {
        ...formData,
        customerType,
        customerId: customerType === 'Anggota' ? selectedAnggotaId : 'GUEST',
        customerName: finalCustomerName,
        monthlyInstallment,
        profit,
        status: 'Active',
        createdAt: serverTimestamp()
      };

      const docRef = await addDoc(collection(db, 'service_credit_goods'), payload);
      
      const user = auth.currentUser;
      if (user) {
        await logAudit({
          action: 'CREATE_CREDIT_GOODS',
          module: 'JASA',
          description: `Kredit barang ${formData.itemName} untuk ${finalCustomerName} senilai Rp ${formData.creditPrice.toLocaleString('id-ID')}`,
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
      alert('Credit sync failed.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const resetForm = () => {
    setFormData({
      itemName: '',
      marketPrice: 0,
      creditPrice: 0,
      downPayment: 0,
      tenor: 12,
      notes: ''
    });
    setSelectedAnggotaId('');
    setCustomerName('');
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-purple-500/10 flex items-center justify-center text-purple-400 border border-purple-500/20 shadow-lg shadow-purple-500/5">
            <ShoppingBag size={24} />
          </div>
          <div>
            <h2 className="text-xl font-black text-white uppercase tracking-tighter">Asset Fin-Credit Hub</h2>
            <p className="text-[10px] font-mono text-slate-500 uppercase tracking-widest">In-house credit program for commodity acquisition</p>
          </div>
        </div>
        <button 
          onClick={() => setShowForm(!showForm)}
          className="px-6 py-3 bg-gradient-to-r from-purple-600 to-cyan-600 rounded-2xl text-white text-[10px] font-bold uppercase tracking-widest flex items-center gap-2 hover:scale-105 active:scale-95 transition-all shadow-lg shadow-purple-900/20"
        >
          {showForm ? 'Abort Application' : <><Plus size={16} /> New Credit App</>}
        </button>
      </div>

      <AnimatePresence>
        {showForm && (
          <motion.div 
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="overflow-hidden"
          >
            <form onSubmit={handleSubmit} className="bg-slate-900/40 border border-white/5 p-8 rounded-[2rem] space-y-8">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                {/* COLUMN 1 */}
                <div className="space-y-6">
                  <h3 className="text-xs font-bold text-cyan-400 uppercase tracking-[0.2em] border-l-2 border-cyan-500 pl-3">Applicant Data</h3>
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
                    <label className="text-[10px] font-mono text-slate-500 uppercase font-bold tracking-widest px-1">Asset Designation</label>
                    <input 
                      type="text" 
                      value={formData.itemName}
                      onChange={(e) => setFormData({...formData, itemName: e.target.value})}
                      placeholder="e.g. Laptop ASUS ROG, Honda Vario"
                      className="bg-slate-950/80 border border-white/10 text-slate-200 p-4 rounded-2xl text-sm focus:ring-2 focus:ring-purple-500/50 outline-none"
                      required
                    />
                  </div>
                </div>

                {/* COLUMN 2 */}
                <div className="space-y-6">
                  <h3 className="text-xs font-bold text-emerald-400 uppercase tracking-[0.2em] border-l-2 border-emerald-500 pl-3">Pricing Matrix</h3>
                  <div className="grid grid-cols-2 gap-4">
                     <div className="flex flex-col gap-2">
                        <label className="text-[10px] font-mono text-slate-500 uppercase font-bold tracking-widest px-1">Acquisition Price</label>
                        <input 
                          type="number" 
                          value={formData.marketPrice}
                          onChange={(e) => setFormData({...formData, marketPrice: Number(e.target.value)})}
                          className="bg-slate-950/80 border border-white/10 text-slate-200 p-4 rounded-2xl text-sm font-mono"
                          required
                        />
                     </div>
                     <div className="flex flex-col gap-2">
                        <label className="text-[10px] font-mono text-slate-500 uppercase font-bold tracking-widest px-1">Credit Selling Price</label>
                        <input 
                          type="number" 
                          value={formData.creditPrice}
                          onChange={(e) => setFormData({...formData, creditPrice: Number(e.target.value)})}
                          className="bg-slate-950/80 border border-white/10 text-slate-200 p-4 rounded-2xl text-sm font-mono"
                          required
                        />
                     </div>
                  </div>
                  <div className="flex flex-col gap-2">
                     <label className="text-[10px] font-mono text-slate-500 uppercase font-bold tracking-widest px-1">Initial Deposit (DP)</label>
                     <input 
                       type="number" 
                       value={formData.downPayment}
                       onChange={(e) => setFormData({...formData, downPayment: Number(e.target.value)})}
                       className="bg-slate-950/80 border border-white/10 text-slate-200 p-4 rounded-2xl text-sm font-mono"
                       required
                     />
                  </div>
                </div>

                {/* COLUMN 3 */}
                <div className="space-y-6">
                  <h3 className="text-xs font-bold text-purple-400 uppercase tracking-[0.2em] border-l-2 border-purple-500 pl-3">Installment Logic</h3>
                  <div className="flex flex-col gap-2">
                     <label className="text-[10px] font-mono text-slate-500 uppercase font-bold tracking-widest px-1">Tenor (Months)</label>
                     <select
                        value={formData.tenor}
                        onChange={(e) => setFormData({...formData, tenor: Number(e.target.value)})}
                        className="bg-slate-950/80 border border-white/10 text-slate-200 p-4 rounded-2xl text-sm focus:ring-2 focus:ring-purple-500/50 outline-none appearance-none"
                     >
                        {[3, 6, 12, 18, 24, 36].map(t => <option key={t} value={t}>{t} Months</option>)}
                     </select>
                  </div>
                  <div className="bg-purple-500/10 border border-purple-500/20 p-6 rounded-3xl space-y-4">
                     <div className="flex justify-between items-center text-[10px] font-mono text-slate-400 uppercase">
                        <span>Monthly Installment:</span>
                        <span className="text-white font-bold">Rp {calculateInstallment(formData.creditPrice, formData.downPayment, formData.tenor).toLocaleString('id-ID')}</span>
                     </div>
                     <div className="flex justify-between items-center text-[10px] font-mono text-emerald-400 uppercase font-bold pt-4 border-t border-white/5">
                        <div className="flex items-center gap-2"><Percent size={12} /> Projected Gain:</div>
                        <span>Rp {(formData.creditPrice - formData.marketPrice).toLocaleString('id-ID')}</span>
                     </div>
                  </div>
                </div>
              </div>

              <div className="flex gap-4 pt-6 border-t border-white/5">
                <button 
                  type="submit" 
                  disabled={isSubmitting}
                  className="flex-1 py-5 bg-gradient-to-r from-purple-600 to-cyan-600 rounded-[1.5rem] text-white text-xs font-bold uppercase tracking-[0.3em] flex items-center justify-center gap-3 shadow-xl hover:scale-[1.01] active:scale-95 transition-all disabled:opacity-50"
                >
                  {isSubmitting ? <Loader2 className="animate-spin" /> : <Calculator size={20} />}
                  Execute Credit Agreement
                </button>
              </div>
            </form>
          </motion.div>
        )}
      </AnimatePresence>

      {/* DATA TABLE */}
      <div className="bg-slate-950/40 border border-white/5 rounded-[2.5rem] overflow-hidden shadow-2xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-white/5 border-b border-white/5">
                <th className="p-6 px-8 text-[10px] font-mono text-purple-400 uppercase tracking-widest">Asset Identification</th>
                <th className="p-6 text-[10px] font-mono text-purple-400 uppercase tracking-widest">Applicant</th>
                <th className="p-6 text-[10px] font-mono text-purple-400 uppercase tracking-widest">Pricing Matrix</th>
                <th className="p-6 text-[10px] font-mono text-purple-400 uppercase tracking-widest text-center">Tenor Cycle</th>
                <th className="p-6 text-[10px] font-mono text-purple-400 uppercase tracking-widest text-center">Status</th>
                <th className="p-6 px-8 text-[10px] font-mono text-purple-400 uppercase tracking-widest text-center tracking-tighter">Actions</th>
              </tr>
            </thead>
            <tbody>
              {data.map((item) => (
                <tr key={item.id} className="border-b border-white/5 hover:bg-white/5 transition-colors group">
                  <td className="p-6 px-8">
                    <div className="text-xs font-bold text-white uppercase">{item.itemName}</div>
                    <div className="text-[9px] text-slate-500 font-mono mt-1 italic uppercase tracking-tighter">A_ID: {item.id?.substring(0, 8)}</div>
                  </td>
                  <td className="p-6">
                    <div className="text-xs font-bold text-white uppercase">{item.customerName}</div>
                    <div className="text-[9px] text-slate-500 font-mono mt-1 uppercase tracking-tighter">{item.customerType} IDENT</div>
                  </td>
                  <td className="p-6">
                     <div className="text-xs font-bold text-white font-mono">Rp {item.creditPrice.toLocaleString('id-ID')}</div>
                     <div className="text-[8px] text-slate-500 uppercase mt-1">DP: Rp {item.downPayment.toLocaleString('id-ID')}</div>
                  </td>
                  <td className="p-6 text-center">
                    <div className="text-xs font-bold text-white font-mono">Rp {item.monthlyInstallment.toLocaleString('id-ID')}</div>
                    <div className="text-[8px] text-purple-400 font-mono mt-1 uppercase">Cycle: {item.tenor} MO</div>
                  </td>
                  <td className="p-6 text-center">
                    <div className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[8px] font-bold border ${
                      item.status === 'Active' ? 'bg-cyan-500/10 text-cyan-400 border-cyan-500/20' :
                      item.status === 'Paid' ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' :
                      'bg-red-500/10 text-red-400 border-red-500/20'
                    }`}>
                      {item.status.toUpperCase()}
                    </div>
                  </td>
                  <td className="p-6 px-8 text-center">
                    <button 
                      onClick={() => { if(confirm('Terminate credit application?')) deleteDoc(doc(db, 'service_credit_goods', item.id!)) }}
                      className="p-2.5 bg-slate-800 text-slate-500 hover:text-red-400 rounded-xl transition-all hover:bg-red-500/5 opacity-0 group-hover:opacity-100"
                    >
                      <Trash2 size={14} />
                    </button>
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
