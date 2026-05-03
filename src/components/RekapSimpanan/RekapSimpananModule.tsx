import React, { useState, useEffect, useMemo } from 'react';
import { 
  collection, onSnapshot, query, where, orderBy 
} from 'firebase/firestore';
import { db } from '../../services/firebase';
import { 
  PieChart, Wallet, TrendingUp, Users, CheckCircle2, 
  AlertCircle, Search, Filter, FileDown, Printer, ChevronRight,
  ArrowUpRight, Download, Eye
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

import * as XLSX from 'xlsx';
import { jsPDF } from 'jspdf';
import 'jspdf-autotable';

// --- TYPES ---
interface MandatorySaving {
  id?: string;
  memberId: string;
  month: number; // 1-12
  year: number;
  amount: number;
  status: string;
}

interface VoluntarySaving {
  id?: string;
  memberId: string;
  amount: number;
  date: any;
}

interface MemberSaving {
  id?: string;
  memberId: string;
  amount: number;
}

interface Member {
  id_anggota: string;
  nama: string;
  status_anggota?: string;
}

interface MemberRecap {
  id: string;
  name: string;
  months: (number | null)[]; // Index 0-11 for Jan-Dec
  totalMandatory: number;
  totalVoluntary: number;
  totalGeneral: number;
  grandTotal: number;
  status: 'Lunas' | 'Menunggak' | 'Aktif';
}

export default function RekapSimpananModule({ anggotaList }: { anggotaList: Member[] }) {
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'All' | 'Lunas' | 'Menunggak'>('All');
  
  const [mandatoryData, setMandatoryData] = useState<MandatorySaving[]>([]);
  const [voluntaryData, setVoluntaryData] = useState<VoluntarySaving[]>([]);
  const [savingsData, setSavingsData] = useState<MemberSaving[]>([]);
  const [loading, setLoading] = useState(true);

  // --- DATA FETCHING ---
  useEffect(() => {
    setLoading(true);
    
    // Listen to Mandatory Savings for selected year
    const qMandatory = query(
      collection(db, 'mandatory_savings'), 
      where('year', '==', selectedYear)
    );
    const unsubMandatory = onSnapshot(qMandatory, (snap) => {
      setMandatoryData(snap.docs.map(doc => doc.data() as MandatorySaving));
    });

    // Listen to Voluntary Savings (Lifetime total or specific year? Usually total balance)
    const unsubVoluntary = onSnapshot(collection(db, 'voluntary_savings'), (snap) => {
      setVoluntaryData(snap.docs.map(doc => doc.data() as VoluntarySaving));
    });

    // Listen to Member Savings
    const unsubSavings = onSnapshot(collection(db, 'member_savings'), (snap) => {
      setSavingsData(snap.docs.map(doc => doc.data() as MemberSaving));
      setLoading(false);
    });

    return () => {
      unsubMandatory();
      unsubVoluntary();
      unsubSavings();
    };
  }, [selectedYear]);

  // --- LOGIC: GENERATE RECAP MATRIX ---
  const recapList = useMemo(() => {
    return anggotaList.map(member => {
      const records = mandatoryData.filter(m => m.memberId === member.id_anggota);
      const months: (number | null)[] = Array(12).fill(null);
      let totalMandatory = 0;
      
      records.forEach(r => {
        if (r.month >= 1 && r.month <= 12) {
          months[r.month - 1] = r.amount;
          totalMandatory += r.amount;
        }
      });

      const voluntarySum = voluntaryData
        .filter(v => v.memberId === member.id_anggota)
        .reduce((sum, curr) => sum + curr.amount, 0);

      const generalSaving = savingsData
        .filter(s => s.memberId === member.id_anggota)
        .reduce((sum, curr) => sum + curr.amount, 0);

      const unpaidMonths = months.filter(m => m === null).length;
      const status: 'Lunas' | 'Menunggak' = unpaidMonths === 0 ? 'Lunas' : 'Menunggak';

      return {
        id: member.id_anggota,
        name: member.nama,
        months,
        totalMandatory,
        totalVoluntary: voluntarySum,
        totalGeneral: generalSaving,
        grandTotal: totalMandatory + voluntarySum + generalSaving,
        status
      } as MemberRecap;
    });
  }, [anggotaList, mandatoryData, voluntaryData, savingsData]);

  const filteredRecap = recapList.filter(item => {
    const matchesSearch = item.name.toLowerCase().includes(searchTerm.toLowerCase()) || item.id.includes(searchTerm);
    const matchesStatus = statusFilter === 'All' || item.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  // --- STATS ---
  const stats = {
    totalMembers: recapList.length,
    lunas: recapList.filter(r => r.status === 'Lunas').length,
    menunggak: recapList.filter(r => r.status === 'Menunggak').length,
    grandTotalValue: recapList.reduce((s, c) => s + c.grandTotal, 0),
    mandatoryTotal: recapList.reduce((s, c) => s + c.totalMandatory, 0),
    voluntaryTotal: recapList.reduce((s, c) => s + c.totalVoluntary, 0),
    generalTotal: recapList.reduce((s, c) => s + c.totalGeneral, 0),
  };

  const handleExportExcel = () => {
    const data = filteredRecap.map(item => ({
      'ID Anggota': item.id,
      'Nama Anggota': item.name,
      'Jan': item.months[0] || 0,
      'Feb': item.months[1] || 0,
      'Mar': item.months[2] || 0,
      'Apr': item.months[3] || 0,
      'Mei': item.months[4] || 0,
      'Jun': item.months[5] || 0,
      'Jul': item.months[6] || 0,
      'Agu': item.months[7] || 0,
      'Sep': item.months[8] || 0,
      'Okt': item.months[9] || 0,
      'Nov': item.months[10] || 0,
      'Des': item.months[11] || 0,
      'Total Wajib': item.totalMandatory,
      'Sukarela': item.totalVoluntary,
      'Tabungan': item.totalGeneral,
      'Grand Total': item.grandTotal,
      'Status': item.status
    }));

    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, `Rekap_Simpanan_${selectedYear}`);
    XLSX.writeFile(wb, `Rekap_Simpanan_Anggota_${selectedYear}.xlsx`);
  };

  const handleExportPDF = () => {
    const doc = new jsPDF('l', 'mm', 'a4');
    doc.text(`Rekapitulasi Simpanan Anggota Tahun ${selectedYear}`, 14, 15);
    
    const tableData = filteredRecap.map(item => [
      item.name,
      ...item.months.map(m => m ? (m/1000).toString() + 'k' : '-'),
      item.totalMandatory.toLocaleString(),
      item.totalVoluntary.toLocaleString(),
      item.totalGeneral.toLocaleString(),
      item.grandTotal.toLocaleString(),
      item.status
    ]);

    (doc as any).autoTable({
      head: [['Nama', 'Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des', 'Wajib', 'Sukarela', 'Tabungan', 'Total', 'Status']],
      body: tableData,
      startY: 20,
      styles: { fontSize: 7 },
      headStyles: { fillColor: [79, 70, 229] }
    });

    doc.save(`Rekap_Simpanan_Anggota_${selectedYear}.pdf`);
  };

  const handlePrint = () => {
    window.print();
  };

  const currentMonthName = (idx: number) => {
    return ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'][idx];
  };

  return (
    <div className="space-y-8 pb-20">
      {/* HEADER SECTION */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
        <div className="flex items-center gap-5">
          <div className="w-14 h-14 rounded-2xl bg-indigo-500/10 flex items-center justify-center text-indigo-400 border border-indigo-500/20 shadow-xl shadow-indigo-500/5">
            <PieChart size={28} />
          </div>
          <div>
            <h2 className="text-2xl font-black text-white uppercase tracking-tighter">Savings Analytics Recon</h2>
            <p className="text-[10px] font-mono text-slate-500 uppercase tracking-[0.2em]">Comprehensive matrix for member equity tracking</p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <select 
            value={selectedYear}
            onChange={(e) => setSelectedYear(Number(e.target.value))}
            className="bg-slate-900 border border-white/10 text-white px-5 py-3 rounded-2xl text-xs font-bold uppercase tracking-widest outline-none focus:ring-2 focus:ring-indigo-500/50"
          >
            {[2023, 2024, 2025, 2026, 2027].map(y => <option key={y} value={y}>{y} FISCAL</option>)}
          </select>
          <button 
            onClick={handlePrint}
            className="p-3 bg-white/5 border border-white/10 rounded-2xl text-slate-400 hover:text-white transition-all hover:bg-white/10"
          >
            <Printer size={20} />
          </button>
          <button 
            onClick={handleExportExcel}
            className="flex items-center gap-2 px-5 py-3 bg-emerald-600 rounded-2xl text-white text-[10px] font-bold uppercase tracking-widest hover:scale-105 transition-all shadow-lg shadow-emerald-900/20"
          >
            <FileDown size={14} /> EXCEL
          </button>
          <button 
            onClick={handleExportPDF}
            className="flex items-center gap-2 px-5 py-3 bg-red-600 rounded-2xl text-white text-[10px] font-bold uppercase tracking-widest hover:scale-105 transition-all shadow-lg shadow-red-900/20"
          >
            <FileDown size={14} /> PDF
          </button>
        </div>
      </div>

      {/* DASHBOARD STATS */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard 
          label="Total Managed Liquidity" 
          value={`Rp ${stats.grandTotalValue.toLocaleString('id-ID')}`} 
          subLabel={`${stats.totalMembers} Member Nodes`}
          icon={<Wallet className="text-emerald-400" />}
          color="emerald"
        />
        <StatCard 
          label="Equity Participation" 
          value={stats.lunas.toString()} 
          subLabel="Full Compliance (12/12)"
          icon={<CheckCircle2 className="text-indigo-400" />}
          color="indigo"
        />
        <StatCard 
          label="Payment Latency" 
          value={stats.menunggak.toString()} 
          subLabel="Pending Contributions"
          icon={<AlertCircle className="text-orange-400" />}
          color="orange"
        />
        <StatCard 
          label="Mandatory Velocity" 
          value={`Rp ${stats.mandatoryTotal.toLocaleString('id-ID')}`} 
          subLabel="Core Capital Growth"
          icon={<TrendingUp className="text-cyan-400" />}
          color="cyan"
        />
      </div>

      {/* FILTERS */}
      <div className="bg-slate-900/40 p-6 rounded-[2rem] border border-white/5 flex flex-col md:flex-row gap-6 items-center">
        <div className="relative flex-1 group">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 group-focus-within:text-indigo-400 transition-colors" size={18} />
          <input 
            type="text" 
            placeholder="Filter by Member Name or Entity ID..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full bg-slate-950 border border-white/10 text-white pl-12 pr-4 py-4 rounded-2xl text-sm focus:ring-2 focus:ring-indigo-500/50 outline-none font-mono placeholder:text-slate-700"
          />
        </div>
        <div className="flex gap-2">
          {['All', 'Lunas', 'Menunggak'].map((s) => (
            <button
              key={s}
              onClick={() => setStatusFilter(s as any)}
              className={`px-6 py-4 rounded-2xl text-[10px] font-bold uppercase tracking-widest transition-all border ${
                statusFilter === s 
                  ? 'bg-indigo-600 border-indigo-500 text-white shadow-lg shadow-indigo-900/20' 
                  : 'bg-white/5 border-transparent text-slate-500 hover:bg-white/10'
              }`}
            >
              {s}
            </button>
          ))}
        </div>
      </div>

      {/* MAIN MONITORING TABLE */}
      <div className="bg-slate-950/40 border border-white/5 rounded-[2.5rem] overflow-hidden shadow-2xl backdrop-blur-xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse table-fixed min-w-[1600px]">
            <thead>
              <tr className="bg-white/5">
                <th className="p-6 sticky left-0 z-20 bg-slate-900/90 w-64 backdrop-blur-md">
                  <span className="text-[10px] font-mono text-indigo-400 uppercase tracking-[0.2em] font-bold">Member Entity</span>
                </th>
                {Array(12).fill(0).map((_, i) => (
                  <th key={i} className="p-4 text-center border-l border-white/5">
                    <span className="text-[10px] font-mono text-slate-500 uppercase tracking-widest">{currentMonthName(i)}</span>
                  </th>
                ))}
                <th className="p-4 text-center border-l border-white/10 bg-indigo-500/5 w-32 font-bold">
                  <span className="text-[10px] font-mono text-indigo-400 uppercase tracking-widest">Wajib</span>
                </th>
                <th className="p-4 text-center border-l border-white/5 w-32">
                  <span className="text-[10px] font-mono text-purple-400 uppercase tracking-widest">Sukarela</span>
                </th>
                <th className="p-4 text-center border-l border-white/5 w-32 tracking-tighter">
                   <span className="text-[10px] font-mono text-emerald-400 uppercase tracking-tighter">Tabungan</span>
                </th>
                <th className="p-4 text-center border-l border-white/10 bg-slate-900/40 w-44">
                  <span className="text-[10px] font-mono text-white uppercase tracking-widest">Grand Total</span>
                </th>
                <th className="p-6 text-center w-28">
                   <span className="text-[10px] font-mono text-slate-500 uppercase tracking-widest">Health</span>
                </th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={18} className="p-32 text-center">
                    <div className="flex flex-col items-center gap-4">
                      <div className="w-12 h-12 border-4 border-indigo-500/20 border-t-indigo-500 rounded-full animate-spin"></div>
                      <p className="text-xs font-mono text-slate-500 uppercase tracking-widest animate-pulse">Synchronizing Ledger Data...</p>
                    </div>
                  </td>
                </tr>
              ) : filteredRecap.length === 0 ? (
                <tr>
                  <td colSpan={18} className="p-32 text-center text-slate-500 font-mono italic text-sm">
                    No records matched the current protocol filters.
                  </td>
                </tr>
              ) : filteredRecap.map((item) => (
                <tr key={item.id} className="border-b border-white/5 hover:bg-white/[0.02] transition-colors group">
                  <td className="p-6 sticky left-0 z-10 bg-slate-950/80 group-hover:bg-slate-900/90 transition-colors backdrop-blur-sm shadow-xl border-r border-white/5">
                    <div className="flex items-center gap-4">
                      <div className="w-8 h-8 rounded-full bg-indigo-500/10 flex items-center justify-center text-indigo-400 border border-indigo-500/20 text-[10px] font-bold">
                        {item.name.charAt(0)}
                      </div>
                      <div>
                        <div className="text-xs font-bold text-white uppercase truncate max-w-[150px]">{item.name}</div>
                        <div className="text-[9px] text-slate-500 font-mono mt-0.5">{item.id}</div>
                      </div>
                    </div>
                  </td>
                  {item.months.map((val, i) => (
                    <td key={i} className="p-2 text-center border-l border-white/5">
                      {val ? (
                        <div className="flex flex-col items-center bg-emerald-500/5 p-1.5 rounded-lg border border-emerald-500/10 tooltip relative group/val">
                          <CheckCircle2 size={12} className="text-emerald-500" />
                          <span className="text-[8px] font-mono text-emerald-400 mt-0.5 opacity-60">{(val/1000)}k</span>
                        </div>
                      ) : (
                        <div className="w-6 h-6 mx-auto bg-slate-800/10 border border-white/5 rounded-md flex items-center justify-center">
                           <div className="w-1 h-1 bg-slate-700 rounded-full"></div>
                        </div>
                      )}
                    </td>
                  ))}
                  <td className="p-4 text-center border-l border-white/10 bg-indigo-500/5 font-mono text-[10px] text-indigo-400 font-bold">
                    {item.totalMandatory.toLocaleString('id-ID')}
                  </td>
                  <td className="p-4 text-center border-l border-white/5 font-mono text-[10px] text-purple-400">
                    {item.totalVoluntary.toLocaleString('id-ID')}
                  </td>
                  <td className="p-4 text-center border-l border-white/5 font-mono text-[10px] text-emerald-400">
                    {item.totalGeneral.toLocaleString('id-ID')}
                  </td>
                  <td className="p-4 text-center border-l border-white/10 bg-white/5 font-mono text-xs text-white font-black">
                    Rp {item.grandTotal.toLocaleString('id-ID')}
                  </td>
                  <td className="p-6 text-center">
                    <span className={`inline-block px-3 py-1 rounded-full text-[8px] font-bold border transition-colors ${
                      item.status === 'Lunas' 
                        ? 'bg-indigo-500/10 text-indigo-400 border-indigo-500/30 shadow-[0_0_10px_rgba(99,102,241,0.1)]' 
                        : 'bg-orange-500/10 text-orange-400 border-orange-500/30'
                    }`}>
                      {item.status.toUpperCase()}
                    </span>
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

function StatCard({ label, value, subLabel, icon, color }: any) {
  const colors: any = {
    indigo: 'from-indigo-500/20 to-indigo-600/5 text-indigo-400 border-indigo-500/20 shadow-indigo-500/5',
    emerald: 'from-emerald-500/20 to-emerald-600/5 text-emerald-400 border-emerald-500/20 shadow-emerald-500/5',
    orange: 'from-orange-500/20 to-orange-600/5 text-orange-400 border-orange-500/20 shadow-orange-500/5',
    cyan: 'from-cyan-500/20 to-cyan-600/5 text-cyan-400 border-cyan-500/20 shadow-cyan-500/5',
  };

  return (
    <div className={`p-6 bg-gradient-to-br ${colors[color]} border rounded-[2rem] shadow-xl relative overflow-hidden group`}>
      <div className="absolute top-0 right-0 p-8 opacity-10 group-hover:scale-125 transition-transform">
        {icon}
      </div>
      <div className="relative z-10 flex flex-col gap-4">
        <div className="p-2.5 bg-slate-900/50 rounded-xl w-fit border border-white/5">
          {React.cloneElement(icon, { size: 18 })}
        </div>
        <div className="space-y-1">
          <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">{label}</p>
          <p className="text-xl font-black text-white tracking-tighter">{value}</p>
          <p className="text-[9px] font-mono text-slate-500 uppercase tracking-wider">{subLabel}</p>
        </div>
      </div>
    </div>
  );
}
