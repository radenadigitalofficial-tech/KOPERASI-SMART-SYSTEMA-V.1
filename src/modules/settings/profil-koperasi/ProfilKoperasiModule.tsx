import React, { useState, useEffect } from 'react';
import { 
  collection, onSnapshot, doc, setDoc, addDoc, 
  updateDoc, deleteDoc, query, where, serverTimestamp 
} from 'firebase/firestore';
import { db } from '../../../services/firebase';
import { 
  Building2, Users, ShieldCheck, Mail, Phone, 
  Globe, MapPin, Edit3, Save, Plus, Trash2, 
  Search, CheckCircle2, XCircle, LayoutGrid, Award
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

// --- TYPES ---
interface CoopProfile {
  name: string;
  shortName: string;
  legalNumber: string;
  foundedDate: string;
  address: string;
  city: string;
  province: string;
  zipCode: string;
  email: string;
  phone: string;
  website: string;
  logoUrl: string;
  description: string;
  vision: string;
  mission: string;
}

interface StaffMember {
  id?: string;
  memberId: string;
  memberName: string;
  role: string;
  startDate: string;
  endDate: string;
  status: 'Aktif' | 'Non-Aktif';
}

export default function ProfilKoperasiModule({ anggotaList }: { anggotaList: any[] }) {
  const [activeTab, setActiveTab] = useState<'profile' | 'management' | 'supervisors'>('profile');
  const [profile, setProfile] = useState<CoopProfile | null>(null);
  const [management, setManagement] = useState<StaffMember[]>([]);
  const [supervisors, setSupervisors] = useState<StaffMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [isEditingProfile, setIsEditingProfile] = useState(false);

  // Form States
  const [showStaffModal, setShowStaffModal] = useState(false);
  const [staffType, setStaffType] = useState<'management' | 'supervisors'>('management');
  const [staffForm, setStaffForm] = useState<Partial<StaffMember>>({
    memberId: '',
    role: '',
    startDate: '',
    endDate: '',
    status: 'Aktif'
  });

  const [showContactModal, setShowContactModal] = useState(false);
  const [contactForm, setContactForm] = useState({
    email: '',
    phone: '',
    website: ''
  });

  // --- DATA FETCHING ---
  useEffect(() => {
    // 1. Listen to Profile
    const unsubProfile = onSnapshot(doc(db, 'cooperative_profile', 'main'), (snap) => {
      if (snap.exists()) {
        const data = snap.data() as CoopProfile;
        setProfile(data);
        setContactForm({
          email: data.email || '',
          phone: data.phone || '',
          website: data.website || ''
        });
      }
      setLoading(false);
    });

    // 2. Listen to Management
    const unsubManagement = onSnapshot(collection(db, 'cooperative_management'), (snap) => {
      setManagement(snap.docs.map(d => ({ id: d.id, ...d.data() } as StaffMember)));
    });

    // 3. Listen to Supervisors
    const unsubSupervisors = onSnapshot(collection(db, 'cooperative_supervisors'), (snap) => {
      setSupervisors(snap.docs.map(d => ({ id: d.id, ...d.data() } as StaffMember)));
    });

    return () => {
      unsubProfile();
      unsubManagement();
      unsubSupervisors();
    };
  }, []);

  // --- HANDLERS ---
  const handleSaveProfile = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const data = Object.fromEntries(formData.entries());
    
    try {
      await setDoc(doc(db, 'cooperative_profile', 'main'), {
        ...data,
        updatedAt: serverTimestamp()
      }, { merge: true });
      setIsEditingProfile(false);
      alert('Identity verified and updated in the system.');
    } catch (err) {
      alert('Sync Fail: Could not update profile.');
    }
  };

  const handleUpdateContact = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Basic Validation
    if (contactForm.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(contactForm.email)) {
      alert('INVALID PROTOCOL: Please enter a correct email format.');
      return;
    }

    try {
      await updateDoc(doc(db, 'cooperative_profile', 'main'), {
        ...contactForm,
        updatedAt: serverTimestamp()
      });
      setShowContactModal(false);
      alert('Network Configuration Updated Successfully.');
    } catch (err) {
      alert('Connection Error: Node update failed.');
    }
  };

  const handleSaveStaff = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!staffForm.memberId || !staffForm.role) return;

    const member = anggotaList.find(a => a.id_anggota === staffForm.memberId);
    if (!member) return;

    // Logic Validation: Prevent duplicate active roles (Chairman/Bendahara/Sekretaris only 1 active)
    const restrictedRoles = ['Ketua', 'Sekretaris', 'Bendahara', 'Ketua Pengawas', 'Manager'];
    if (staffForm.status === 'Aktif' && restrictedRoles.includes(staffForm.role as string)) {
      const listToCheck = staffType === 'management' ? management : supervisors;
      const existing = listToCheck.find(s => s.role === staffForm.role && s.status === 'Aktif');
      if (existing) {
        alert(`ACCESS DENIED: Role ${staffForm.role} is already occupied by an active member.`);
        return;
      }
    }

    try {
      const coll = staffType === 'management' ? 'cooperative_management' : 'cooperative_supervisors';
      await addDoc(collection(db, coll), {
        ...staffForm,
        memberName: member.nama,
        createdAt: serverTimestamp()
      });
      setShowStaffModal(false);
      setStaffForm({ memberId: '', role: '', startDate: '', endDate: '', status: 'Aktif' });
    } catch (err) {
       alert('Operation Failed.');
    }
  };

  if (loading) return <div className="p-20 text-center font-mono text-cyan-400 animate-pulse uppercase tracking-[0.2em]">Synchronizing Registry...</div>;

  return (
    <div className="space-y-8 pb-32">
      {/* MODULE HEADER */}
      <div className="flex justify-between items-center bg-slate-900/40 p-8 rounded-[2.5rem] border border-white/5 backdrop-blur-xl">
        <div className="flex items-center gap-6">
          <div className="w-16 h-16 rounded-3xl bg-indigo-500/10 flex items-center justify-center text-indigo-400 border border-indigo-500/20 shadow-2xl shadow-indigo-500/10">
            <Building2 size={32} />
          </div>
          <div>
            <h2 className="text-2xl font-black text-white uppercase tracking-tighter">Cooperative Identity & Governance</h2>
            <p className="text-[10px] font-mono text-slate-500 uppercase tracking-[0.3em]">Master Entity Management & Structure</p>
          </div>
        </div>

        <div className="flex gap-2">
          {['profile', 'management', 'supervisors'].map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab as any)}
              className={`px-6 py-4 rounded-2xl text-[10px] font-bold uppercase tracking-widest transition-all ${
                activeTab === tab 
                  ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-900/20 border border-indigo-500' 
                  : 'bg-white/5 text-slate-400 hover:text-white hover:bg-white/10'
              }`}
            >
              {tab.replace('_', ' ')}
            </button>
          ))}
        </div>
      </div>

      <AnimatePresence mode="wait">
        <motion.div
          key={activeTab}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -10 }}
          transition={{ duration: 0.3 }}
        >
          {activeTab === 'profile' && (
             <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* LOGO & QUICK INFO */}
                <div className="space-y-6">
                   <div className="bg-slate-900/40 p-8 rounded-[2rem] border border-white/5 text-center">
                      <div className="w-40 h-40 mx-auto rounded-3xl bg-slate-950 border-2 border-dashed border-white/10 flex items-center justify-center overflow-hidden mb-6 group relative">
                        {profile?.logoUrl ? (
                           <img src={profile.logoUrl} alt="Logo" className="w-full h-full object-contain p-4" />
                        ) : (
                           <Building2 size={64} className="text-slate-800" />
                        )}
                      </div>
                      <h3 className="text-lg font-black text-white uppercase tracking-tight">{profile?.name || 'KOPERASI NAME'}</h3>
                      <p className="text-xs font-mono text-indigo-400 mt-1">{profile?.legalNumber || 'LEGAL-XXXX-XXXX'}</p>
                   </div>

                   <div className="bg-slate-900/40 p-8 rounded-[2rem] border border-white/5 space-y-4 group relative">
                      <button 
                        onClick={() => setShowContactModal(true)}
                        className="absolute top-6 right-6 p-2 bg-indigo-500/10 text-indigo-400 rounded-lg opacity-0 group-hover:opacity-100 transition-all border border-indigo-500/20 hover:bg-indigo-500/20"
                      >
                        <Edit3 size={14} />
                      </button>
                      <div className="flex items-center gap-3 text-slate-300">
                        <Mail size={16} className="text-indigo-400" />
                        <span className="text-xs font-mono">{profile?.email || 'not-set@koperasi.com'}</span>
                      </div>
                      <div className="flex items-center gap-3 text-slate-300">
                        <Phone size={16} className="text-indigo-400" />
                        <span className="text-xs font-mono">{profile?.phone || '+62 ---'}</span>
                      </div>
                      <div className="flex items-center gap-3 text-slate-300">
                        <Globe size={16} className="text-indigo-400" />
                        <span className="text-xs font-mono">{profile?.website || 'www.koperasi.com'}</span>
                      </div>
                   </div>
                </div>

                {/* EDITABLE DETAILS */}
                <div className="lg:col-span-2 space-y-6">
                   <div className="bg-slate-950/40 rounded-[2.5rem] border border-white/5 overflow-hidden">
                      <div className="p-8 border-b border-white/5 flex justify-between items-center bg-white/5">
                        <h4 className="text-xs font-black text-white uppercase tracking-widest flex items-center gap-2">
                           <Award size={16} className="text-yellow-400" /> Core Identity Matrix
                        </h4>
                        <button 
                          onClick={() => setIsEditingProfile(!isEditingProfile)}
                          className="flex items-center gap-2 px-4 py-2 bg-indigo-500/10 text-indigo-400 rounded-xl text-[10px] font-bold uppercase transition-all hover:bg-indigo-500/20"
                        >
                          {isEditingProfile ? <XCircle size={14} /> : <Edit3 size={14} />}
                          {isEditingProfile ? 'Cancel' : 'Modify Data'}
                        </button>
                      </div>

                      <form onSubmit={handleSaveProfile} className="p-8 space-y-8">
                         <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <InputGroup label="Nama Koperasi" name="name" defaultValue={profile?.name} disabled={!isEditingProfile} />
                            <InputGroup label="Badan Hukum" name="legalNumber" defaultValue={profile?.legalNumber} disabled={!isEditingProfile} />
                            <InputGroup label="Tanggal Berdiri" name="foundedDate" type="date" defaultValue={profile?.foundedDate} disabled={!isEditingProfile} />
                            <InputGroup label="Nama Singkat" name="shortName" defaultValue={profile?.shortName} disabled={!isEditingProfile} />
                         </div>

                         <div className="space-y-4">
                            <label className="text-[10px] font-mono text-slate-500 uppercase tracking-widest block">Visi Koperasi</label>
                            <textarea 
                              name="vision" 
                              defaultValue={profile?.vision} 
                              disabled={!isEditingProfile}
                              className="w-full bg-slate-950 border border-white/10 rounded-2xl p-4 text-xs text-white focus:outline-none focus:border-indigo-500 transition-all min-h-[80px]"
                            />
                         </div>

                         <div className="space-y-4">
                            <label className="text-[10px] font-mono text-slate-500 uppercase tracking-widest block">Misi Koperasi</label>
                            <textarea 
                              name="mission" 
                              defaultValue={profile?.mission} 
                              disabled={!isEditingProfile}
                              className="w-full bg-slate-950 border border-white/10 rounded-2xl p-4 text-xs text-white focus:outline-none focus:border-indigo-500 transition-all min-h-[120px]"
                            />
                         </div>

                         {isEditingProfile && (
                           <motion.button 
                             initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                             type="submit" 
                             className="w-full py-5 bg-indigo-600 text-white rounded-2xl font-black uppercase text-xs tracking-[0.2em] shadow-xl shadow-indigo-900/20 flex items-center justify-center gap-3"
                           >
                             <Save size={18} /> Commit Changes to Ledger
                           </motion.button>
                         )}
                      </form>
                   </div>
                </div>
             </div>
          )}

          {(activeTab === 'management' || activeTab === 'supervisors') && (
             <div className="space-y-6">
                <div className="flex justify-between items-center">
                   <h3 className="text-sm font-black text-white uppercase tracking-widest border-l-4 border-indigo-500 pl-4">
                      {activeTab === 'management' ? 'Board of Directors' : 'Supervisory Board'}
                   </h3>
                   <button 
                     onClick={() => {
                        setStaffType(activeTab as any);
                        setShowStaffModal(true);
                     }}
                     className="flex items-center gap-2 px-6 py-4 bg-white/5 border border-white/10 rounded-2xl text-[10px] font-bold uppercase text-white hover:bg-indigo-600 transition-all"
                   >
                     <Plus size={16} /> New Appointment
                   </button>
                </div>

                <div className="bg-slate-950/40 rounded-[2.5rem] border border-white/5 overflow-hidden">
                   <table className="w-full text-left">
                      <thead className="bg-white/5">
                        <tr>
                           <th className="p-6 text-[10px] font-mono text-slate-500 uppercase">Entity ID</th>
                           <th className="p-6 text-[10px] font-mono text-slate-500 uppercase">Full Identity</th>
                           <th className="p-6 text-[10px] font-mono text-slate-500 uppercase">Functional Role</th>
                           <th className="p-6 text-[10px] font-mono text-slate-500 uppercase text-center">Protocol Period</th>
                           <th className="p-6 text-[10px] font-mono text-slate-500 uppercase text-center">Status</th>
                           <th className="p-6 text-[10px] font-mono text-slate-500 uppercase text-right">Ops</th>
                        </tr>
                      </thead>
                      <tbody>
                        {(activeTab === 'management' ? management : supervisors).length === 0 ? (
                           <tr><td colSpan={6} className="p-20 text-center text-slate-500 italic text-sm font-mono tracking-widest">No active personnel detected in this sector.</td></tr>
                        ) : (
                          (activeTab === 'management' ? management : supervisors).map((item) => (
                            <tr key={item.id} className="border-b border-white/5 hover:bg-white/5 transition-colors">
                               <td className="p-6 text-[10px] font-mono text-indigo-400">{item.memberId}</td>
                               <td className="p-6">
                                  <div className="text-xs font-bold text-white uppercase">{item.memberName}</div>
                                  <div className="text-[9px] text-slate-500 font-mono tracking-tighter">Verified Member Entity</div>
                               </td>
                               <td className="p-6">
                                  <span className="px-3 py-1 bg-indigo-500/10 text-indigo-400 rounded-lg text-[9px] font-black uppercase border border-indigo-500/20">
                                     {item.role}
                                  </span>
                               </td>
                               <td className="p-6 text-center text-[10px] font-mono text-slate-400">
                                  {item.startDate} — {item.endDate || 'Present'}
                               </td>
                               <td className="p-6 text-center">
                                  <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[8px] font-black uppercase border ${
                                     item.status === 'Aktif' 
                                      ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30' 
                                      : 'bg-slate-500/10 text-slate-500 border-slate-500/30'
                                  }`}>
                                     {item.status === 'Aktif' ? <CheckCircle2 size={8} /> : <XCircle size={8} />}
                                     {item.status}
                                  </span>
                               </td>
                               <td className="p-6 text-right">
                                  <button 
                                    onClick={() => deleteDoc(doc(db, activeTab === 'management' ? 'cooperative_management' : 'cooperative_supervisors', item.id!))}
                                    className="text-slate-600 hover:text-red-400 transition-colors"
                                  >
                                    <Trash2 size={16} />
                                  </button>
                               </td>
                            </tr>
                          ))
                        )}
                      </tbody>
                   </table>
                </div>
             </div>
          )}
        </motion.div>
      </AnimatePresence>

      {/* STAFF APPOINTMENT MODAL */}
      <AnimatePresence>
        {showStaffModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-6 backdrop-blur-md bg-slate-950/60">
             <motion.div 
               initial={{ opacity: 0, scale: 0.9 }}
               animate={{ opacity: 1, scale: 1 }}
               exit={{ opacity: 0, scale: 0.9 }}
               className="bg-slate-900 border border-white/10 p-10 rounded-[3rem] w-full max-w-xl shadow-2xl relative overflow-hidden"
             >
                <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-indigo-500 to-transparent"></div>
                <h3 className="text-xl font-black text-white uppercase tracking-tight mb-8 flex items-center gap-3">
                   <Award size={24} className="text-indigo-400" /> New Staff Appointment
                </h3>

                <form onSubmit={handleSaveStaff} className="space-y-6">
                   <div className="space-y-2">
                      <label className="text-[10px] font-mono text-slate-500 uppercase tracking-widest">Select Member Entity</label>
                      <select 
                        required
                        value={staffForm.memberId}
                        onChange={(e) => setStaffForm({...staffForm, memberId: e.target.value})}
                        className="w-full bg-slate-950 border border-white/10 rounded-2xl p-4 text-xs text-white focus:outline-none focus:border-indigo-500"
                      >
                         <option value="">-- SEARCH MEMBER REGISTRY --</option>
                         {anggotaList.map(a => <option key={a.id_anggota} value={a.id_anggota}>{a.nama} ({a.id_anggota})</option>)}
                      </select>
                   </div>

                   <div className="space-y-2">
                      <label className="text-[10px] font-mono text-slate-500 uppercase tracking-widest">Functional Jabatan</label>
                      <select 
                        required
                        value={staffForm.role}
                        onChange={(e) => setStaffForm({...staffForm, role: e.target.value})}
                        className="w-full bg-slate-950 border border-white/10 rounded-2xl p-4 text-xs text-white focus:outline-none focus:border-indigo-500"
                      >
                         <option value="">-- ASSIGN POSITION --</option>
                         {staffType === 'management' ? (
                           <>
                             <option value="Ketua">Ketua Umum</option>
                             <option value="Wakil Ketua">Wakil Ketua</option>
                             <option value="Sekretaris">Sekretaris</option>
                             <option value="Bendahara">Bendahara</option>
                             <option value="Manager">Manager Operasional</option>
                             <option value="Pengurus Lainnya">Pengurus Lainnya</option>
                           </>
                         ) : (
                           <>
                             <option value="Ketua Pengawas">Ketua Pengawas</option>
                             <option value="Anggota Pengawas">Anggota Pengawas</option>
                           </>
                         )}
                      </select>
                   </div>

                   <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <label className="text-[10px] font-mono text-slate-500 uppercase tracking-widest">Service Start</label>
                        <input type="date" required value={staffForm.startDate} onChange={e => setStaffForm({...staffForm, startDate: e.target.value})} className="w-full bg-slate-950 border border-white/10 rounded-2xl p-4 text-xs text-white" />
                      </div>
                      <div className="space-y-2">
                        <label className="text-[10px] font-mono text-slate-500 uppercase tracking-widest">Service Term End</label>
                        <input type="date" required value={staffForm.endDate} onChange={e => setStaffForm({...staffForm, endDate: e.target.value})} className="w-full bg-slate-950 border border-white/10 rounded-2xl p-4 text-xs text-white" />
                      </div>
                   </div>

                   <div className="flex gap-3 pt-6">
                      <button type="button" onClick={() => setShowStaffModal(false)} className="flex-1 py-4 bg-white/5 text-slate-400 rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-white/10 transition-all">Abort Access</button>
                      <button type="submit" className="flex-1 py-4 bg-indigo-600 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest shadow-xl shadow-indigo-900/20 hover:scale-105 transition-all">Authorize Appointment</button>
                   </div>
                </form>
             </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* CONTACT EDIT MODAL */}
      <AnimatePresence>
        {showContactModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-6 backdrop-blur-md bg-slate-950/60">
             <motion.div 
               initial={{ opacity: 0, scale: 0.9 }}
               animate={{ opacity: 1, scale: 1 }}
               exit={{ opacity: 0, scale: 0.9 }}
               className="bg-slate-900 border border-white/10 p-10 rounded-[3rem] w-full max-w-lg shadow-2xl relative overflow-hidden"
             >
                <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-cyan-500 to-transparent"></div>
                <h3 className="text-xl font-black text-white uppercase tracking-tight mb-8 flex items-center gap-3">
                   <Globe size={24} className="text-cyan-400" /> Update Contact Link
                </h3>

                <form onSubmit={handleUpdateContact} className="space-y-6">
                   <div className="space-y-2">
                      <label className="text-[10px] font-mono text-slate-500 uppercase tracking-widest">Cooperative Email Address</label>
                      <div className="relative">
                        <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-600" size={16} />
                        <input 
                          type="email" 
                          placeholder="entity@koperasi.com"
                          value={contactForm.email}
                          onChange={(e) => setContactForm({...contactForm, email: e.target.value})}
                          className="w-full bg-slate-950 border border-white/10 rounded-2xl pl-12 pr-4 py-4 text-xs text-white focus:outline-none focus:border-cyan-500"
                        />
                      </div>
                   </div>

                   <div className="space-y-2">
                      <label className="text-[10px] font-mono text-slate-500 uppercase tracking-widest">Secure Line (Phone)</label>
                      <div className="relative">
                        <Phone className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-600" size={16} />
                        <input 
                          type="text" 
                          placeholder="+62 8..."
                          value={contactForm.phone}
                          onChange={(e) => setContactForm({...contactForm, phone: e.target.value})}
                          className="w-full bg-slate-950 border border-white/10 rounded-2xl pl-12 pr-4 py-4 text-xs text-white focus:outline-none focus:border-cyan-500"
                        />
                      </div>
                   </div>

                   <div className="space-y-2">
                      <label className="text-[10px] font-mono text-slate-500 uppercase tracking-widest">Domain Matrix (Website)</label>
                      <div className="relative">
                        <Globe className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-600" size={16} />
                        <input 
                          type="text" 
                          placeholder="https://..."
                          value={contactForm.website}
                          onChange={(e) => setContactForm({...contactForm, website: e.target.value})}
                          className="w-full bg-slate-950 border border-white/10 rounded-2xl pl-12 pr-4 py-4 text-xs text-white focus:outline-none focus:border-cyan-500"
                        />
                      </div>
                   </div>

                   <div className="flex gap-3 pt-6">
                      <button type="button" onClick={() => setShowContactModal(false)} className="flex-1 py-4 bg-white/5 text-slate-400 rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-white/10 transition-all">Abort</button>
                      <button type="submit" className="flex-1 py-4 bg-cyan-600 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest shadow-xl shadow-cyan-900/20 hover:scale-105 transition-all">Update Link</button>
                   </div>
                </form>
             </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}

function InputGroup({ label, name, defaultValue, type = 'text', disabled = false }: any) {
  return (
    <div className="space-y-2">
      <label className="text-[10px] font-mono text-slate-500 uppercase tracking-widest">{label}</label>
      <input 
        name={name}
        type={type} 
        defaultValue={defaultValue}
        disabled={disabled}
        className={`w-full bg-slate-950 border border-white/10 rounded-2xl p-4 text-xs text-white focus:outline-none focus:border-indigo-500 transition-all ${disabled ? 'opacity-50 cursor-not-allowed' : 'hover:border-white/20'}`}
      />
    </div>
  );
}
