import React, { useState, useEffect } from 'react';
import { 
  collection, addDoc, onSnapshot, query, orderBy, 
  serverTimestamp, doc, deleteDoc 
} from 'firebase/firestore';
import { auth, db } from '../../services/firebase';
import { handleFirestoreError, OperationType } from '../../utils/firestoreUtils';
import { logAudit } from '../../utils/auditLogger';
import { motion, AnimatePresence } from 'motion/react';
import { 
  MousePointer2, Search, Plus, Trash2, Edit2, Loader2, 
  CheckCircle2, Clock, Calendar, Code, Palette, Share2
} from 'lucide-react';
import { CustomerSelector } from './CommonComponents';

interface DigitalService {
  id?: string;
  serviceType: string;
  serviceName: string;
  price: number;
  deadline: string;
  customerName: string;
  customerType: 'Anggota' | 'Umum';
  customerId: string;
  status: 'Awaiting' | 'Processing' | 'Completed' | 'Delivered';
  notes: string;
  createdAt: any;
}

const SERVICE_TYPES = [
  { id: 'design', label: 'Graphic Design', icon: <Palette size={14} /> },
  { id: 'dev', label: 'Web Development', icon: <Code size={14} /> },
  { id: 'edit', label: 'Video Editing', icon: <Share2 size={14} /> },
  { id: 'ai', label: 'AI Intelligence', icon: <MousePointer2 size={14} /> },
  { id: 'social', label: 'Social Media', icon: <Share2 size={14} /> },
];

export default function DigitalServiceModule({ anggotaList }: { anggotaList: any[] }) {
  const [data, setData] = useState<DigitalService[]>([]);
  const [loading, setLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  
  // Form State
  const [customerType, setCustomerType] = useState<'Anggota' | 'Umum'>('Anggota');
  const [selectedAnggotaId, setSelectedAnggotaId] = useState('');
  const [customerName, setCustomerName] = useState('');
  const [formData, setFormData] = useState({
    serviceType: 'Graphic Design',
    serviceName: '',
    price: 0,
    deadline: new Date(Date.now() + 7 * 86400000).toISOString().split('T')[0],
    notes: ''
  });

  useEffect(() => {
    const q = query(collection(db, 'service_digital'), orderBy('createdAt', 'desc'));
    const unsub = onSnapshot(q, (snapshot) => {
      setData(snapshot.docs.map(d => ({ id: d.id, ...d.data() } as DigitalService)));
      setLoading(false);
    }, (error) => handleFirestoreError(error, OperationType.LIST, 'service_digital'));
    return () => unsub();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      const finalCustomerName = customerType === 'Anggota' 
        ? anggotaList.find(a => a.id_anggota === selectedAnggotaId)?.nama || 'Unknown'
        : customerName;

      const payload: Omit<DigitalService, 'id'> = {
        ...formData,
        customerType,
        customerId: customerType === 'Anggota' ? selectedAnggotaId : 'GUEST',
        customerName: finalCustomerName,
        status: 'Awaiting',
        createdAt: serverTimestamp()
      };

      const docRef = await addDoc(collection(db, 'service_digital'), payload);
      
      const user = auth.currentUser;
      if (user) {
        await logAudit({
          action: 'CREATE_DIGITAL_SERVICE',
          module: 'JASA',
          description: `Jasa digital ${formData.serviceType} untuk ${finalCustomerName}: ${formData.serviceName}`,
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
      alert('Service protocol synchronization failed.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const resetForm = () => {
    setFormData({
      serviceType: 'Graphic Design',
      serviceName: '',
      price: 0,
      deadline: new Date(Date.now() + 7 * 86400000).toISOString().split('T')[0],
      notes: ''
    });
    setSelectedAnggotaId('');
    setCustomerName('');
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-cyan-500/10 flex items-center justify-center text-cyan-400 border border-cyan-500/20 shadow-lg shadow-cyan-500/5">
            <MousePointer2 size={24} />
          </div>
          <div>
            <h2 className="text-xl font-black text-white uppercase tracking-tighter">Digital Solution Nexus</h2>
            <p className="text-[10px] font-mono text-slate-500 uppercase tracking-widest">Advanced virtual service & production factory</p>
          </div>
        </div>
        <button 
          onClick={() => setShowForm(!showForm)}
          className="px-6 py-3 bg-gradient-to-r from-cyan-600 to-blue-600 rounded-2xl text-white text-[10px] font-bold uppercase tracking-widest flex items-center gap-2 hover:scale-105 active:scale-95 transition-all shadow-lg shadow-cyan-900/20"
        >
          {showForm ? 'Abort Job' : <><Plus size={16} /> New Job Order</>}
        </button>
      </div>

      <AnimatePresence>
        {showForm && (
          <motion.div 
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 20 }}
          >
            <form onSubmit={handleSubmit} className="bg-slate-900/40 border border-white/5 p-8 rounded-[2rem] space-y-8">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                {/* COLUMN 1 */}
                <div className="space-y-6">
                  <h3 className="text-xs font-bold text-cyan-400 uppercase tracking-[0.2em] border-l-2 border-cyan-500 pl-3">Client Assignment</h3>
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

                {/* COLUMN 2 */}
                <div className="space-y-6">
                  <h3 className="text-xs font-bold text-blue-400 uppercase tracking-[0.2em] border-l-2 border-blue-500 pl-3">Job Parameters</h3>
                  <div className="flex flex-col gap-4">
                    <div className="flex flex-col gap-2">
                       <label className="text-[10px] font-mono text-slate-500 uppercase font-bold tracking-widest px-1">Service Classification</label>
                       <select 
                         value={formData.serviceType}
                         onChange={(e) => setFormData({...formData, serviceType: e.target.value})}
                         className="bg-slate-950/80 border border-white/10 text-slate-200 p-4 rounded-2xl text-sm focus:ring-2 focus:ring-blue-500/50 outline-none appearance-none uppercase"
                       >
                         {SERVICE_TYPES.map(t => <option key={t.id} value={t.label}>{t.label}</option>)}
                       </select>
                    </div>
                    <div className="flex flex-col gap-2">
                       <label className="text-[10px] font-mono text-slate-500 uppercase font-bold tracking-widest px-1">Specific Task Name</label>
                       <input 
                         type="text" 
                         value={formData.serviceName}
                         onChange={(e) => setFormData({...formData, serviceName: e.target.value})}
                         placeholder="e.g. Logo Redesign, CRM Integration..."
                         className="bg-slate-950/80 border border-white/10 text-slate-200 p-4 rounded-2xl text-sm focus:ring-2 focus:ring-blue-500/50 outline-none"
                         required
                       />
                    </div>
                  </div>
                </div>

                {/* COLUMN 3 */}
                <div className="space-y-6">
                  <h3 className="text-xs font-bold text-indigo-400 uppercase tracking-[0.2em] border-l-2 border-indigo-500 pl-3">Delivery & Valuation</h3>
                  <div className="flex flex-col gap-4">
                     <div className="flex flex-col gap-2">
                        <label className="text-[10px] font-mono text-slate-500 uppercase font-bold tracking-widest px-1">Target Deadline</label>
                        <input 
                          type="date" 
                          value={formData.deadline}
                          onChange={(e) => setFormData({...formData, deadline: e.target.value})}
                          className="bg-slate-950/80 border border-white/10 text-slate-200 p-4 rounded-2xl text-sm font-mono"
                          required
                        />
                     </div>
                     <div className="flex flex-col gap-2">
                        <label className="text-[10px] font-mono text-slate-500 uppercase font-bold tracking-widest px-1">Project Valuation</label>
                        <input 
                          type="number" 
                          value={formData.price}
                          onChange={(e) => setFormData({...formData, price: Number(e.target.value)})}
                          placeholder="Rp..."
                          className="bg-slate-950/80 border border-white/10 text-slate-200 p-4 rounded-2xl text-sm font-mono"
                          required
                        />
                     </div>
                  </div>
                </div>
              </div>

              <div className="flex flex-col gap-2">
                <label className="text-[10px] font-mono text-slate-500 uppercase font-bold tracking-widest px-1">Technical Prerequisites / Brief</label>
                <textarea 
                  value={formData.notes}
                  onChange={(e) => setFormData({...formData, notes: e.target.value})}
                  rows={3}
                  placeholder="Input job specifications, asset links, or stylistic directives..."
                  className="bg-slate-950/80 border border-white/10 text-slate-200 p-5 rounded-3xl text-sm focus:ring-2 focus:ring-cyan-500/50 outline-none resize-none"
                />
              </div>

              <div className="flex gap-4 pt-6 border-t border-white/5">
                <button 
                  type="submit" 
                  disabled={isSubmitting}
                  className="flex-1 py-5 bg-gradient-to-r from-blue-600 to-indigo-600 rounded-[1.5rem] text-white text-xs font-bold uppercase tracking-[0.3em] flex items-center justify-center gap-3 shadow-xl hover:scale-[1.01] active:scale-95 transition-all disabled:opacity-50"
                >
                  {isSubmitting ? <Loader2 className="animate-spin" /> : <Clock size={20} />}
                  Synchronize Job In Registry
                </button>
              </div>
            </form>
          </motion.div>
        )}
      </AnimatePresence>

      {/* DATA VISUALIZATION */}
      <div className="bg-slate-950/40 border border-white/5 rounded-[2.5rem] overflow-hidden shadow-2xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-white/5 border-b border-white/5">
                <th className="p-6 px-8 text-[10px] font-mono text-cyan-400 uppercase tracking-widest">Job Classification</th>
                <th className="p-6 text-[10px] font-mono text-cyan-400 uppercase tracking-widest">Lead Entity</th>
                <th className="p-6 text-[10px] font-mono text-cyan-400 uppercase tracking-widest">Chronometrics</th>
                <th className="p-6 text-[10px] font-mono text-cyan-400 uppercase tracking-widest text-center">Valuation</th>
                <th className="p-6 text-[10px] font-mono text-cyan-400 uppercase tracking-widest text-center">Status</th>
                <th className="p-6 px-8 text-[10px] font-mono text-cyan-400 uppercase tracking-widest text-center tracking-tighter">Ops</th>
              </tr>
            </thead>
            <tbody>
              {data.map((item) => (
                <tr key={item.id} className="border-b border-white/5 hover:bg-white/5 transition-colors group">
                  <td className="p-6 px-8 flex items-center gap-4">
                     <div className="w-10 h-10 rounded-xl bg-blue-500/5 flex items-center justify-center text-blue-500 border border-blue-500/10">
                        {SERVICE_TYPES.find(t => t.label === item.serviceType)?.icon || <Code size={16} />}
                     </div>
                     <div>
                        <div className="text-xs font-bold text-white uppercase">{item.serviceName}</div>
                        <div className="text-[9px] text-slate-500 font-mono mt-1 uppercase tracking-tighter">{item.serviceType}</div>
                     </div>
                  </td>
                  <td className="p-6">
                    <div className="text-xs font-bold text-white uppercase">{item.customerName}</div>
                    <div className="text-[9px] text-slate-500 font-mono mt-1 uppercase tracking-tighter">{item.customerType} IDENT</div>
                  </td>
                  <td className="p-6">
                    <div className="text-xs text-white uppercase flex items-center gap-2">
                       <Calendar size={12} className="text-blue-500/50" />
                       DEADLINE: {item.deadline}
                    </div>
                    <div className="text-[9px] text-slate-500 font-mono mt-1 uppercase tracking-widest">ESTIMATED PRODUCTION CYCLE</div>
                  </td>
                  <td className="p-6 text-center">
                    <div className="text-xs font-bold text-white font-mono">Rp {item.price.toLocaleString('id-ID')}</div>
                  </td>
                  <td className="p-6 text-center">
                    <div className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[8px] font-bold border ${
                      item.status === 'Completed' ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' :
                      item.status === 'Awaiting' ? 'bg-orange-500/10 text-orange-400 border-orange-500/20' :
                      'bg-blue-500/10 text-blue-400 border-blue-500/20'
                    }`}>
                      {item.status.toUpperCase()}
                    </div>
                  </td>
                  <td className="p-6 px-8 text-center">
                    <button 
                      onClick={() => { if(confirm('Terminate project node?')) deleteDoc(doc(db, 'service_digital', item.id!)) }}
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
