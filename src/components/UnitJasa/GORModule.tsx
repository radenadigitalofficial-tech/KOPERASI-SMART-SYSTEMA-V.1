import React, { useState, useEffect } from 'react';
import { 
  collection, addDoc, onSnapshot, query, orderBy, 
  serverTimestamp, doc, deleteDoc, where, getDocs 
} from 'firebase/firestore';
import { auth, db } from '../../services/firebase';
import { handleFirestoreError, OperationType } from '../../utils/firestoreUtils';
import { logAudit } from '../../utils/auditLogger';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Calendar, Clock, MapPin, Users, Search, Plus, 
  Trash2, Edit2, Loader2, CheckCircle2, AlertCircle, TrendingUp
} from 'lucide-react';
import { CustomerSelector } from './CommonComponents';

interface GORBooking {
  id?: string;
  customerName: string;
  customerType: 'Anggota' | 'Umum';
  customerId: string;
  date: string;
  startTime: string;
  endTime: string;
  duration: number; // in hours
  ratePerHour: number;
  contribution: number;
  totalPrice: number;
  status: 'Pending' | 'Confirmed' | 'Completed' | 'Cancelled';
  notes: string;
  createdAt: any;
}

export default function GORModule({ anggotaList }: { anggotaList: any[] }) {
  const [data, setData] = useState<GORBooking[]>([]);
  const [loading, setLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  
  // Form State
  const [customerType, setCustomerType] = useState<'Anggota' | 'Umum'>('Anggota');
  const [selectedAnggotaId, setSelectedAnggotaId] = useState('');
  const [customerName, setCustomerName] = useState('');
  const [formData, setFormData] = useState({
    date: new Date().toISOString().split('T')[0],
    startTime: '08:00',
    endTime: '09:00',
    ratePerHour: 50000,
    contribution: 0,
    notes: ''
  });

  useEffect(() => {
    const q = query(collection(db, 'service_gor'), orderBy('createdAt', 'desc'));
    const unsub = onSnapshot(q, (snapshot) => {
      setData(snapshot.docs.map(d => ({ id: d.id, ...d.data() } as GORBooking)));
      setLoading(false);
    }, (error) => handleFirestoreError(error, OperationType.LIST, 'service_gor'));
    return () => unsub();
  }, []);

  const calculateDuration = (start: string, end: string) => {
    const [h1, m1] = start.split(':').map(Number);
    const [h2, m2] = end.split(':').map(Number);
    const duration = (h2 + m2 / 60) - (h1 + m1 / 60);
    return duration > 0 ? duration : 0;
  };

  const handleBooking = async (e: React.FormEvent) => {
    e.preventDefault();
    const duration = calculateDuration(formData.startTime, formData.endTime);
    if (duration <= 0) return alert('Invalid Time Range: End time must be after start time.');

    // Duplicate Check
    const isConflict = data.some(b => 
      b.date === formData.date && 
      b.status !== 'Cancelled' &&
      ((formData.startTime >= b.startTime && formData.startTime < b.endTime) ||
       (formData.endTime > b.startTime && formData.endTime <= b.endTime))
    );

    if (isConflict) return alert('SCHEDULE CONFLICT: The selected time slot is already booked.');

    setIsSubmitting(true);
    try {
      const finalCustomerName = customerType === 'Anggota' 
        ? anggotaList.find(a => a.id_anggota === selectedAnggotaId)?.nama || 'Unknown'
        : customerName;

      const totalPrice = (duration * formData.ratePerHour) + formData.contribution;

      const payload: Omit<GORBooking, 'id'> = {
        ...formData,
        customerType,
        customerId: customerType === 'Anggota' ? selectedAnggotaId : 'GUEST',
        customerName: finalCustomerName,
        duration,
        totalPrice,
        status: 'Confirmed',
        createdAt: serverTimestamp()
      };

      const docRef = await addDoc(collection(db, 'service_gor'), payload);
      
      const user = auth.currentUser;
      if (user) {
        await logAudit({
          action: 'CREATE_GOR_BOOKING',
          module: 'JASA',
          description: `Booking GOR pada ${formData.date} untuk ${finalCustomerName} senilai Rp ${totalPrice.toLocaleString('id-ID')}`,
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
      alert('Network Error: Failed to synchronize booking node.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const resetForm = () => {
    setFormData({
      date: new Date().toISOString().split('T')[0],
      startTime: '08:00',
      endTime: '09:00',
      ratePerHour: 50000,
      contribution: 0,
      notes: ''
    });
    setSelectedAnggotaId('');
    setCustomerName('');
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 flex items-center justify-center text-emerald-400 border border-emerald-500/20 shadow-lg shadow-emerald-500/5">
            <MapPin size={24} />
          </div>
          <div>
            <h2 className="text-xl font-black text-white uppercase tracking-tighter">GOR Optimization System</h2>
            <p className="text-[10px] font-mono text-slate-500 uppercase tracking-widest">Facility scheduling & arena reservation protocol</p>
          </div>
        </div>
        <button 
          onClick={() => setShowForm(!showForm)}
          className="px-6 py-3 bg-gradient-to-r from-emerald-600 to-cyan-600 rounded-2xl text-white text-[10px] font-bold uppercase tracking-widest flex items-center gap-2 hover:scale-105 active:scale-95 transition-all shadow-lg shadow-emerald-900/20"
        >
          {showForm ? 'Abort Scheduling' : <><Plus size={16} /> New Reservation</>}
        </button>
      </div>

      <AnimatePresence>
        {showForm && (
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="overflow-hidden"
          >
            <form onSubmit={handleBooking} className="bg-slate-900/40 border border-white/5 p-8 rounded-[2rem] space-y-8">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                {/* COLUMN 1: CLIENT ENTITY */}
                <div className="space-y-6">
                  <h3 className="text-xs font-bold text-cyan-400 uppercase tracking-[0.2em] border-l-2 border-cyan-500 pl-3">Client Verification</h3>
                  <CustomerSelector 
                    customerType={customerType}
                    setCustomerType={setCustomerType}
                    selectedAnggotaId={selectedAnggotaId}
                    setSelectedAnggotaId={setSelectedAnggotaId}
                    customerName={customerName}
                    setCustomerName={setCustomerName}
                    anggotaList={anggotaList}
                  />
                </div>

                {/* COLUMN 2: TEMPORAL MAPPING */}
                <div className="space-y-6">
                  <h3 className="text-xs font-bold text-emerald-400 uppercase tracking-[0.2em] border-l-2 border-emerald-500 pl-3">Schedule Allocation</h3>
                  <div className="flex flex-col gap-4">
                    <div className="flex flex-col gap-2">
                       <label className="text-[10px] font-mono text-slate-500 uppercase font-bold tracking-widest px-1">Reservation Date</label>
                       <input 
                         type="date" 
                         value={formData.date}
                         onChange={(e) => setFormData({...formData, date: e.target.value})}
                         className="bg-slate-950/80 border border-white/10 text-slate-200 p-4 rounded-2xl text-sm focus:ring-2 focus:ring-emerald-500/50 outline-none"
                         required
                       />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                       <div className="flex flex-col gap-2">
                          <label className="text-[10px] font-mono text-slate-500 uppercase font-bold tracking-widest px-1">Start Hub</label>
                          <input 
                            type="time" 
                            value={formData.startTime}
                            onChange={(e) => setFormData({...formData, startTime: e.target.value})}
                            className="bg-slate-950/80 border border-white/10 text-slate-200 p-4 rounded-2xl text-sm focus:ring-2 focus:ring-emerald-500/50 outline-none"
                            required
                          />
                       </div>
                       <div className="flex flex-col gap-2">
                          <label className="text-[10px] font-mono text-slate-500 uppercase font-bold tracking-widest px-1">End Point</label>
                          <input 
                            type="time" 
                            value={formData.endTime}
                            onChange={(e) => setFormData({...formData, endTime: e.target.value})}
                            className="bg-slate-950/80 border border-white/10 text-slate-200 p-4 rounded-2xl text-sm focus:ring-2 focus:ring-emerald-500/50 outline-none"
                            required
                          />
                       </div>
                    </div>
                  </div>
                </div>

                {/* COLUMN 3: COST ENGINE */}
                <div className="space-y-6">
                  <h3 className="text-xs font-bold text-purple-400 uppercase tracking-[0.2em] border-l-2 border-purple-500 pl-3">Financial Projection</h3>
                  <div className="grid grid-cols-2 gap-4">
                     <div className="flex flex-col gap-2">
                        <label className="text-[10px] font-mono text-slate-500 uppercase font-bold tracking-widest px-1">Hourly Tarif</label>
                        <input 
                          type="number" 
                          value={formData.ratePerHour}
                          onChange={(e) => setFormData({...formData, ratePerHour: Number(e.target.value)})}
                          className="bg-slate-950/80 border border-white/10 text-slate-200 p-4 rounded-2xl text-sm font-mono"
                          required
                        />
                     </div>
                     <div className="flex flex-col gap-2">
                        <label className="text-[10px] font-mono text-slate-500 uppercase font-bold tracking-widest px-1">Contribution</label>
                        <input 
                          type="number" 
                          value={formData.contribution}
                          onChange={(e) => setFormData({...formData, contribution: Number(e.target.value)})}
                          className="bg-slate-950/80 border border-white/10 text-slate-200 p-4 rounded-2xl text-sm font-mono"
                        />
                     </div>
                  </div>
                  <div className="bg-emerald-500/10 border border-emerald-500/20 p-6 rounded-3xl space-y-4">
                     <div className="flex justify-between items-center">
                        <span className="text-[10px] font-mono text-slate-500 uppercase tracking-widest">Calculated Duration</span>
                        <span className="text-xs font-bold text-white px-2 py-0.5 bg-white/10 rounded-lg">{calculateDuration(formData.startTime, formData.endTime).toFixed(1)} Hours</span>
                     </div>
                     <div className="flex justify-between items-center border-t border-emerald-500/20 pt-4">
                        <span className="text-[10px] font-mono text-emerald-400 uppercase font-bold tracking-widest">Total Invoice</span>
                        <span className="text-xl font-black text-white font-mono tracking-tighter">Rp {((calculateDuration(formData.startTime, formData.endTime) * formData.ratePerHour) + formData.contribution).toLocaleString('id-ID')}</span>
                     </div>
                  </div>
                </div>
              </div>

              <div className="flex gap-4 pt-6 border-t border-white/5">
                <button 
                  type="submit" 
                  disabled={isSubmitting}
                  className="flex-1 py-5 bg-gradient-to-r from-emerald-600 to-cyan-600 rounded-[1.5rem] text-white text-xs font-bold uppercase tracking-[0.3em] flex items-center justify-center gap-3 shadow-xl hover:scale-[1.01] active:scale-95 transition-all disabled:opacity-50"
                >
                  {isSubmitting ? <Loader2 className="animate-spin" /> : <CheckCircle2 size={20} />}
                  Execute Reservation Protocol
                </button>
              </div>
            </form>
          </motion.div>
        )}
      </AnimatePresence>

      {/* DATA VISUALIZATION - MINI TABLE */}
      <div className="bg-slate-950/40 border border-white/5 rounded-[2.5rem] overflow-hidden shadow-2xl">
        <div className="p-8 border-b border-white/5 flex justify-between items-center">
          <div className="flex items-center gap-3">
             <Search className="text-slate-500" size={18} />
             <input 
              type="text" 
              placeholder="Filter by customer node..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="bg-transparent border-none text-sm text-slate-200 outline-none w-64 uppercase font-mono tracking-widest"
             />
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-white/5 border-b border-white/5">
                <th className="p-6 px-8 text-[10px] font-mono text-emerald-400 uppercase tracking-widest">Schedule Node</th>
                <th className="p-6 text-[10px] font-mono text-emerald-400 uppercase tracking-widest">Occupant Entity</th>
                <th className="p-6 text-[10px] font-mono text-emerald-400 uppercase tracking-widest">Time Window</th>
                <th className="p-6 text-[10px] font-mono text-emerald-400 uppercase tracking-widest text-center">Invoice Value</th>
                <th className="p-6 text-[10px] font-mono text-emerald-400 uppercase tracking-widest text-center">Status</th>
                <th className="p-6 px-8 text-[10px] font-mono text-emerald-400 uppercase tracking-widest text-center tracking-tighter">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredData().map((item) => (
                <tr key={item.id} className="border-b border-white/5 hover:bg-white/5 transition-colors group">
                  <td className="p-6 px-8 flex items-center gap-4">
                     <div className="w-10 h-10 rounded-xl bg-emerald-500/5 flex items-center justify-center text-emerald-500 border border-emerald-500/10">
                        <TrendingUp size={16} />
                     </div>
                     <div>
                        <div className="text-xs font-bold text-white uppercase">{item.date}</div>
                        <div className="text-[9px] text-slate-500 font-mono mt-1 italic tracking-widest">REF: {item.id?.substring(0, 8)}</div>
                     </div>
                  </td>
                  <td className="p-6">
                    <div className="text-xs font-bold text-white uppercase">{item.customerName}</div>
                    <div className="text-[9px] text-slate-500 font-mono mt-1 uppercase tracking-tighter">{item.customerType} IDENT</div>
                  </td>
                  <td className="p-6">
                    <div className="text-xs text-white uppercase flex items-center gap-2">
                       <Clock size={12} className="text-emerald-500/50" />
                       {item.startTime} — {item.endTime}
                    </div>
                    <div className="text-[9px] text-slate-500 font-mono mt-1 uppercase tracking-widest">{item.duration.toFixed(1)} HRS DURATION</div>
                  </td>
                  <td className="p-6 text-center">
                    <div className="text-xs font-bold text-emerald-400 font-mono">Rp {item.totalPrice.toLocaleString('id-ID')}</div>
                  </td>
                  <td className="p-6 text-center">
                    <div className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[8px] font-bold border ${
                      item.status === 'Confirmed' ? 'bg-cyan-500/10 text-cyan-400 border-cyan-500/20' :
                      item.status === 'Completed' ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' :
                      'bg-slate-500/10 text-slate-500 border-slate-500/20'
                    }`}>
                      {item.status.toUpperCase()}
                    </div>
                  </td>
                  <td className="p-6 px-8 text-center">
                     <button 
                      onClick={() => { if(confirm('Terminate booking slot?')) deleteDoc(doc(db, 'service_gor', item.id!)) }}
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

  function filteredData() {
    return data.filter(item => 
      item.customerName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.date.includes(searchTerm)
    );
  }
}
