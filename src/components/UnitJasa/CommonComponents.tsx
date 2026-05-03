import React from 'react';
import { User, Users } from 'lucide-react';

interface Anggota {
  id_anggota: string;
  nama: string;
}

interface CustomerSelectorProps {
  customerType: 'Anggota' | 'Umum';
  setCustomerType: (type: 'Anggota' | 'Umum') => void;
  selectedAnggotaId: string;
  setSelectedAnggotaId: (id: string) => void;
  customerName: string;
  setCustomerName: (name: string) => void;
  anggotaList: Anggota[];
}

export const CustomerSelector: React.FC<CustomerSelectorProps> = ({
  customerType,
  setCustomerType,
  selectedAnggotaId,
  setSelectedAnggotaId,
  customerName,
  setCustomerName,
  anggotaList
}) => {
  return (
    <div className="space-y-4 bg-slate-900/40 p-4 rounded-2xl border border-white/5">
      <div className="flex gap-4">
        <button
          type="button"
          onClick={() => setCustomerType('Anggota')}
          className={`flex-1 py-2 px-4 rounded-xl text-[10px] font-bold uppercase transition-all flex items-center justify-center gap-2 ${
            customerType === 'Anggota' 
              ? 'bg-cyan-500/20 text-cyan-400 border border-cyan-500/30 shadow-[0_0_15px_rgba(34,211,238,0.2)]' 
              : 'bg-white/5 text-slate-500 border border-transparent'
          }`}
        >
          <Users size={14} /> Anggota
        </button>
        <button
          type="button"
          onClick={() => setCustomerType('Umum')}
          className={`flex-1 py-2 px-4 rounded-xl text-[10px] font-bold uppercase transition-all flex items-center justify-center gap-2 ${
            customerType === 'Umum' 
              ? 'bg-purple-500/20 text-purple-400 border border-purple-500/30' 
              : 'bg-white/5 text-slate-500 border border-transparent'
          }`}
        >
          <User size={14} /> Umum
        </button>
      </div>

      {customerType === 'Anggota' ? (
        <div className="flex flex-col gap-2">
          <label className="text-[10px] font-mono text-cyan-400 uppercase font-bold tracking-widest px-1">Select Member</label>
          <select
            value={selectedAnggotaId}
            onChange={(e) => setSelectedAnggotaId(e.target.value)}
            className="bg-slate-950/80 border border-white/10 text-slate-200 p-3 rounded-xl text-sm focus:ring-2 focus:ring-cyan-500/50 outline-none transition-all appearance-none"
          >
            <option value="">-- SELECT MEMBER --</option>
            {anggotaList?.map((a) => (
              <option key={a.id_anggota} value={a.id_anggota}>
                {a.nama} ({a.id_anggota})
              </option>
            ))}
          </select>
        </div>
      ) : (
        <div className="flex flex-col gap-2">
          <label className="text-[10px] font-mono text-purple-400 uppercase font-bold tracking-widest px-1">Customer Name (Public)</label>
          <input
            type="text"
            value={customerName}
            onChange={(e) => setCustomerName(e.target.value)}
            placeholder="Input guest name..."
            className="bg-slate-950/80 border border-white/10 text-slate-200 p-3 rounded-xl text-sm focus:ring-2 focus:ring-purple-500/50 outline-none transition-all"
          />
        </div>
      )}
    </div>
  );
};
