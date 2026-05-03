import React, { useState, useEffect } from 'react';
import { collection, addDoc, onSnapshot, query, orderBy, serverTimestamp, doc, deleteDoc } from 'firebase/firestore';
import { auth, db } from '../../services/firebase';
import { handleFirestoreError, OperationType } from '../../utils/firestoreUtils';
import { logAudit } from '../../utils/auditLogger';
import { Printer, Search, Plus, Trash2, Loader2, FileText, Scaling } from 'lucide-react';
import { CustomerSelector } from './CommonComponents';

export default function PrintingModule({ anggotaList }: { anggotaList: any[] }) {
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [customerType, setCustomerType] = useState<'Anggota' | 'Umum'>('Anggota');
  const [selectedAnggotaId, setSelectedAnggotaId] = useState('');
  const [customerName, setCustomerName] = useState('');
  const [formData, setFormData] = useState({ printType: '', size: '', qty: 1, unitPrice: 0, notes: '' });

  useEffect(() => {
    const unsub = onSnapshot(
      query(collection(db, 'service_printing'), orderBy('createdAt', 'desc')), 
      (s) => {
        setData(s.docs.map(d => ({ id: d.id, ...d.data() })));
        setLoading(false);
      },
      (error) => handleFirestoreError(error, OperationType.LIST, 'service_printing')
    );
    return () => unsub();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const finalCustomerName = customerType === 'Anggota' ? anggotaList.find(a => a.id_anggota === selectedAnggotaId)?.nama || 'Unknown' : customerName;
      const docRef = await addDoc(collection(db, 'service_printing'), { 
        ...formData, customerType, customerId: customerType === 'Anggota' ? selectedAnggotaId : 'GUEST', customerName: finalCustomerName, 
        totalPrice: formData.qty * formData.unitPrice, status: 'Drafting', createdAt: serverTimestamp() 
      });

      const user = auth.currentUser;
      if (user) {
        await logAudit({
          action: 'CREATE_PRINTING',
          module: 'JASA',
          description: `Pesanan cetak ${formData.printType} untuk ${finalCustomerName} senilai Rp ${(formData.qty * formData.unitPrice).toLocaleString('id-ID')}`,
          userId: user.uid,
          userName: user.displayName || user.email || 'Admin',
          targetId: docRef.id,
          severity: 'INFO'
        });
      }

      setShowForm(false);
      setFormData({ printType: '', size: '', qty: 1, unitPrice: 0, notes: '' });
    } catch (e) { alert('Sync fail'); }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center bg-slate-900/40 p-6 rounded-[2rem] border border-white/5">
        <div className="flex items-center gap-4">
          <div className="p-3 bg-purple-500/10 text-purple-400 rounded-xl border border-purple-500/20"><Printer size={24} /></div>
          <div><h2 className="text-xl font-black text-white uppercase">Printing Factory</h2></div>
        </div>
        <button onClick={() => setShowForm(!showForm)} className="px-4 py-2 bg-purple-600 rounded-xl text-[10px] font-bold uppercase tracking-widest text-white">{showForm ? 'Close' : 'New Order'}</button>
      </div>

      {showForm && (
        <form onSubmit={handleSubmit} className="bg-slate-900/40 p-8 rounded-[2rem] border border-white/5 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <CustomerSelector customerType={customerType} setCustomerType={setCustomerType} selectedAnggotaId={selectedAnggotaId} setSelectedAnggotaId={setSelectedAnggotaId} customerName={customerName} setCustomerName={setCustomerName} anggotaList={anggotaList} />
          <div className="space-y-4">
             <input type="text" placeholder="Print Type (Banner, Photo...)" value={formData.printType} onChange={e => setFormData({...formData, printType: e.target.value})} className="w-full bg-slate-950 border border-white/10 p-3 rounded-xl text-xs uppercase font-mono" required />
             <input type="text" placeholder="Size (A4, 2x3m...)" value={formData.size} onChange={e => setFormData({...formData, size: e.target.value})} className="w-full bg-slate-950 border border-white/10 p-3 rounded-xl text-xs uppercase font-mono" required />
          </div>
          <div className="space-y-4">
            <div className="flex gap-2">
              <input type="number" placeholder="QTY" value={formData.qty} onChange={e => setFormData({...formData, qty: Number(e.target.value)})} className="w-1/2 bg-slate-950 border border-white/10 p-3 rounded-xl text-xs font-mono" required />
              <input type="number" placeholder="Price/Unit" value={formData.unitPrice} onChange={e => setFormData({...formData, unitPrice: Number(e.target.value)})} className="w-1/2 bg-slate-950 border border-white/10 p-3 rounded-xl text-xs font-mono" required />
            </div>
            <div className="p-3 bg-white/5 rounded-xl text-center"><span className="text-[10px] text-slate-500 font-mono uppercase">Total:</span> <span className="text-white font-bold font-mono">Rp {(formData.qty * formData.unitPrice).toLocaleString('id-ID')}</span></div>
            <button type="submit" className="w-full py-4 bg-purple-600 text-white rounded-xl font-bold uppercase text-[10px]">Release Spooler</button>
          </div>
        </form>
      )}

      <div className="bg-slate-950/40 rounded-[2rem] overflow-hidden border border-white/5">
        <table className="w-full text-left">
          <thead className="bg-white/5 border-b border-white/5">
            <tr>
              <th className="p-6 text-[10px] font-mono text-purple-400 uppercase">Print Specs</th>
              <th className="p-6 text-[10px] font-mono text-purple-400 uppercase">Customer</th>
              <th className="p-6 text-[10px] font-mono text-purple-400 uppercase">Financials</th>
              <th className="p-6 text-[10px] font-mono text-purple-400 uppercase">Actions</th>
            </tr>
          </thead>
          <tbody>
            {data.map(item => (
              <tr key={item.id} className="border-b border-white/5 hover:bg-white/5 transition-colors">
                <td className="p-6">
                  <div className="text-xs font-bold text-white uppercase">{item.printType}</div>
                  <div className="text-[9px] text-slate-500 font-mono mt-1 flex items-center gap-1 uppercase"><Scaling size={8} /> {item.size}</div>
                </td>
                <td className="p-6">
                  <div className="text-xs font-bold text-white uppercase">{item.customerName}</div>
                  <div className="text-[9px] text-slate-500 font-mono mt-1 uppercase italic tracking-tighter">{item.customerType} IDENT</div>
                </td>
                <td className="p-6">
                   <div className="text-xs font-bold text-white font-mono uppercase font-bold tracking-tight">Rp {item.totalPrice.toLocaleString('id-ID')}</div>
                   <div className="text-[9px] text-slate-500 font-mono italic">{item.qty} UNITS @ RP {item.unitPrice.toLocaleString('id-ID')}</div>
                </td>
                <td className="p-6">
                   <button onClick={() => deleteDoc(doc(db, 'service_printing', item.id))} className="text-red-400 hover:text-red-300 transition-colors"><Trash2 size={14} /></button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
