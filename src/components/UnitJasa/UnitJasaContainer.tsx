import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Smartphone, ShoppingBag, MousePointer2, 
  MapPin, Plane, Printer, LayoutGrid 
} from 'lucide-react';
import PPOBModule from './PPOBModule';
import CreditGoodsModule from './CreditGoodsModule';
import DigitalServiceModule from './DigitalServiceModule';
import GORModule from './GORModule';
import TravelModule from './TravelModule';
import PrintingModule from './PrintingModule';

type SubModule = 'ppob' | 'credit' | 'digital' | 'gor' | 'travel' | 'printing' | 'overview';

interface UnitJasaContainerProps {
  anggotaList: any[];
  activeSub?: SubModule;
}

export default function UnitJasaContainer({ anggotaList, activeSub = 'overview' }: UnitJasaContainerProps) {
  const [currentModule, setCurrentModule] = useState<SubModule>(activeSub);

  const modules = [
    { id: 'ppob', label: 'PPOB HUB', icon: <Smartphone size={18} />, color: 'cyan', component: <PPOBModule anggotaList={anggotaList} /> },
    { id: 'credit', label: 'Kredit Barang', icon: <ShoppingBag size={18} />, color: 'purple', component: <CreditGoodsModule anggotaList={anggotaList} /> },
    { id: 'digital', label: 'Jasa Digital', icon: <MousePointer2 size={18} />, color: 'blue', component: <DigitalServiceModule anggotaList={anggotaList} /> },
    { id: 'gor', label: 'Kelola GOR', icon: <MapPin size={18} />, color: 'emerald', component: <GORModule anggotaList={anggotaList} /> },
    { id: 'travel', label: 'Tour & Travel', icon: <Plane size={18} />, color: 'blue', component: <TravelModule anggotaList={anggotaList} /> },
    { id: 'printing', label: 'Percetakan', icon: <Printer size={18} />, color: 'pink', component: <PrintingModule anggotaList={anggotaList} /> },
  ];

  return (
    <div className="flex flex-col gap-8">
      {/* MODULE SELECTOR CARD */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        {modules.map((m) => (
          <button
            key={m.id}
            onClick={() => setCurrentModule(m.id as SubModule)}
            className={`p-4 rounded-3xl border transition-all flex flex-col items-center gap-3 group relative overflow-hidden ${
              currentModule === m.id 
                ? 'bg-white/10 border-white/20 shadow-xl scale-105' 
                : 'glass border-white/5 hover:bg-white/5 opacity-60 hover:opacity-100'
            }`}
          >
            {currentModule === m.id && (
                <div className="absolute inset-0 bg-gradient-to-br from-cyan-500/10 to-purple-500/10 animate-pulse"></div>
            )}
            <div className={`w-10 h-10 rounded-2xl flex items-center justify-center transition-colors ${
              currentModule === m.id ? 'bg-cyan-500 text-white glow-cyan' : 'bg-slate-800 text-slate-400 group-hover:text-white group-hover:bg-slate-700'
            }`}>
              {m.icon}
            </div>
            <span className={`text-[10px] font-black uppercase tracking-widest ${
              currentModule === m.id ? 'text-white' : 'text-slate-500'
            }`}>
              {m.label}
            </span>
          </button>
        ))}
      </div>

      {/* MODULE RENDERER */}
      <div className="min-h-[500px]">
        <AnimatePresence mode="wait">
          <motion.div
            key={currentModule}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.2 }}
          >
            {modules.find(m => m.id === currentModule)?.component}
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
}
