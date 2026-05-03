import React, { useState, useEffect } from 'react';
import { collection, addDoc, onSnapshot, query, orderBy, serverTimestamp, doc, deleteDoc } from 'firebase/firestore';
import { auth, db } from '../../services/firebase';
import { handleFirestoreError, OperationType } from '../../utils/firestoreUtils';
import { logAudit } from '../../utils/auditLogger';
import { Plane, Search, Plus, Trash2, Loader2, Calendar, Users, MapPin } from 'lucide-react';
import { CustomerSelector } from './CommonComponents';

export default function TravelModule({ anggotaList }: { anggotaList: any[] }) {
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [customerType, setCustomerType] = useState<'Anggota' | 'Umum'>('Anggota');
  const [selectedAnggotaId, setSelectedAnggotaId] = useState('');
  const [customerName, setCustomerName] = useState('');
  const [formData, setFormData] = useState({ pkgName: '', destination: '', date: '', price: 0, participants: 1, notes: '' });

  useEffect(() => {
    const unsub = onSnapshot(
      query(collection(db, 'service_travel'), orderBy('createdAt', 'desc')), 
      (s) => {
        setData(s.docs?.map(d => ({ id: d.id, ...d.data() })));
        setLoading(false);
      },
      (error) => handleFirestoreError(error, OperationType.LIST, 'service_travel')
    );
    return () => unsub();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const finalCustomerName = customerType === 'Anggota' ? anggotaList.find(a => a.id_anggota === selectedAnggotaId)?.nama || 'Unknown' : customerName;
      const docRef = await addDoc(collection(db, 'service_travel'), { 
        ...formData, customerType, customerId: customerType === 'Anggota' ? selectedAnggotaId : 'GUEST', customerName: finalCustomerName, 
        status: 'Booked', createdAt: serverTimestamp() 
      });

      const user = auth.currentUser;
      if (user) {
        await logAudit({
          action: 'CREATE_TRAVEL',
          module: 'JASA',
          description: `Booking travel ${formData.destination} untuk ${finalCustomerName}`,
          userId: user.uid,
          userName: user.displayName || user.email || 'Admin',
          targetId: docRef.id,
          severity: 'INFO'
        });
      }

      setShowForm(false);
      setFormData({ pkgName: '', destination: '', date: '', price: 0, participants: 1, notes: '' });
    } catch (e) { alert('Sync fail'); }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center bg-slate-900/40 p-6 rounded-[2rem] border border-white/5">
        <div className="flex items-center gap-4">
          <div className="p-3 bg-blue-500/10 text-blue-500 rounded-xl border border-blue-500/20"><Plane size={24} /></div>
          <div><h2 className="text-xl font-black text-white uppercase">Travel Expeditions</h2></div>
        </div>
        <button onClick={() => setShowForm(!showForm)} className="px-4 py-2 bg-blue-600 rounded-xl text-[10px] font-bold uppercase tracking-widest text-white">{showForm ? 'Close' : 'New Trip'}</button>
      </div>

      {showForm && (
        <form onSubmit={handleSubmit} className="bg-slate-900/40 p-8 rounded-[2rem] border border-white/5 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <CustomerSelector customerType={customerType} setCustomerType={setCustomerType} selectedAnggotaId={selectedAnggotaId} setSelectedAnggotaId={setSelectedAnggotaId} customerName={customerName} setCustomerName={setCustomerName} anggotaList={anggotaList} />
          <div className="space-y-4">
            <input type="text" placeholder="Package Name" value={formData.pkgName} onChange={e => setFormData({...formData, pkgName: e.target.value})} className="w-full bg-slate-950 border border-white/10 p-3 rounded-xl text-xs uppercase font-mono" required />
            <input type="text" placeholder="Destination" value={formData.destination} onChange={e => setFormData({...formData, destination: e.target.value})} className="w-full bg-slate-950 border border-white/10 p-3 rounded-xl text-xs uppercase font-mono" required />
          </div>
          <div className="space-y-4">
            <input type="date" value={formData.date} onChange={e => setFormData({...formData, date: e.target.value})} className="w-full bg-slate-950 border border-white/10 p-3 rounded-xl text-xs font-mono" required />
            <input type="number" placeholder="Price" value={formData.price} onChange={e => setFormData({...formData, price: Number(e.target.value)})} className="w-full bg-slate-950 border border-white/10 p-3 rounded-xl text-xs font-mono" required />
            <button type="submit" className="w-full py-4 bg-blue-600 text-white rounded-xl font-bold uppercase text-[10px]">Secure My Seat</button>
          </div>
        </form>
      )}

      <div className="bg-slate-950/40 rounded-[2rem] overflow-hidden border border-white/5">
        <table className="w-full text-left">
          <thead className="bg-white/5 border-b border-white/5">
            <tr>
              <th className="p-6 text-[10px] font-mono text-blue-400 uppercase">Trip Data</th>
              <th className="p-6 text-[10px] font-mono text-blue-400 uppercase">Passenger</th>
              <th className="p-6 text-[10px] font-mono text-blue-400 uppercase">Valuation</th>
              <th className="p-6 text-[10px] font-mono text-blue-400 uppercase">Actions</th>
            </tr>
          </thead>
          <tbody>
            {data?.map(item => (
              <tr key={item.id} className="border-b border-white/5 hover:bg-white/5 transition-colors">
                <td className="p-6">
                  <div className="text-xs font-bold text-white uppercase">{item.pkgName}</div>
                  <div className="text-[9px] text-slate-500 font-mono mt-1 flex items-center gap-1 uppercase"><MapPin size={8} /> {item.destination}</div>
                </td>
                <td className="p-6">
                  <div className="text-xs font-bold text-white uppercase">{item.customerName}</div>
                  <div className="text-[9px] text-slate-500 font-mono mt-1 uppercase flex gap-1 items-center"><Users size={8}/> {item.participants} PAX</div>
                </td>
                <td className="p-6"><div className="text-xs font-bold text-white font-mono uppercase">Rp {item.price.toLocaleString('id-ID')}</div><div className="text-[9px] text-slate-500 font-mono font-bold tracking-tighter">Date: {item.date}</div></td>
                <td className="p-6">
                   <button onClick={() => deleteDoc(doc(db, 'service_travel', item.id))} className="text-red-400 hover:text-red-300 transition-colors"><Trash2 size={14} /></button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
