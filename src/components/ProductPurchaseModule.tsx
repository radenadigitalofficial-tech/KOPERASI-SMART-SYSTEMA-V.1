import React, { useEffect, useState, useMemo } from "react";
import {
  collection,
  addDoc,
  serverTimestamp,
  doc,
  writeBatch
} from "firebase/firestore";
import { auth, db } from '../services/firebase';
import { logAudit } from '../utils/auditLogger';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
} from "recharts";
import SafeChartContainer from "./SafeChartContainer";
import { motion, AnimatePresence } from "motion/react";
import { 
  Package, 
  Truck, 
  Tag, 
  Calendar, 
  Plus, 
  RotateCcw, 
  Save, 
  PlusCircle, 
  Info,
  ChevronDown
} from "lucide-react";

interface Supplier {
  id_supplier: string;
  nama_supplier: string;
}

interface Category {
  id_kategori: string;
  nama_kategori: string;
}

interface Product {
  id_produk: string;
  nama_produk: string;
  stok: number;
}

interface Props {
  products: any[];
  suppliers: any[];
  categories: any[];
  onSyncState?: (syncing: boolean) => void;
}

export default function ProductPurchaseModule({ products, suppliers, categories }: Props) {
  // =========================
  // STATE
  // =========================
  const [loading, setLoading] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [showCategoryModal, setShowCategoryModal] = useState(false);
  const [newCategory, setNewCategory] = useState("");

  // Modal Cleanup & Management
  useEffect(() => {
    if (showCategoryModal) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "auto";
    }
    
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === "Escape") setShowCategoryModal(false);
    };
    
    window.addEventListener("keydown", handleEsc);
    return () => {
      document.body.style.overflow = "auto";
      window.removeEventListener("keydown", handleEsc);
    };
  }, [showCategoryModal]);

  const [form, setForm] = useState({
    supplierId: "",
    date: new Date().toISOString().split("T")[0],
    categoryId: "",
    productName: "",
    unit: "PCS",
    quantity: 1,
    costPrice: 0,
    sellingPrice: 0,
    stock: 1,
    notes: "",
  });

  const productsChart = useMemo(() => {
    return (products || []).slice(0, 8).map(p => ({
      name: p.nama_produk || (p as any).name || '-',
      stock: p.stok || (p as any).stock || 0
    }));
  }, [products]);

  // =========================
  // LOGIC & HANDLERS
  // =========================
  // =========================
  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    let updatedForm = { ...form, [name]: value };

    // Otomatis stock mengikuti quantity
    if (name === "quantity") {
      updatedForm.stock = Number(value);
    }
    setForm(updatedForm);
  };

  const handleAddCategory = async () => {
    if (!newCategory.trim()) return;
    try {
      await addDoc(collection(db, "product_categories"), {
        name: newCategory,
        createdAt: serverTimestamp(),
      });
      setNewCategory("");
      setShowCategoryModal(false);
    } catch (error) {
      console.error("Add Category Error:", error);
    }
  };

  const resetForm = () => {
    setForm({
      supplierId: "",
      date: new Date().toISOString().split("T")[0],
      categoryId: "",
      productName: "",
      unit: "PCS",
      quantity: 1,
      costPrice: 0,
      sellingPrice: 0,
      stock: 1,
      notes: "",
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!form.productName) return alert("Nama barang wajib diisi");
    if (!form.categoryId) return alert("Kategori wajib dipilih");
    if (Number(form.quantity) < 1) return alert("Jumlah barang minimal 1");
    if (Number(form.costPrice) < 0 || Number(form.sellingPrice) < 0) return alert("Harga tidak boleh negatif");

    try {
      setLoading(true);
      const totalModal = Number(form.quantity) * Number(form.costPrice);
      const batch = writeBatch(db);

      // 1. Transaction Log
      const purchaseRef = doc(collection(db, "purchase_transactions"));
      batch.set(purchaseRef, {
        supplierId: form.supplierId || null,
        date: form.date,
        categoryId: form.categoryId,
        productName: form.productName,
        unit: form.unit,
        quantity: Number(form.quantity),
        costPrice: Number(form.costPrice),
        sellingPrice: Number(form.sellingPrice),
        stock: Number(form.stock),
        totalModal,
        notes: form.notes,
        createdAt: serverTimestamp(),
      });

      // 2. Add / Update Product in Repository
      // We use addDoc or similar logic. For this module, we'll assume it's a new entry usually.
      const productRef = doc(collection(db, "products"));
      batch.set(productRef, {
        name: form.productName,
        categoryId: form.categoryId,
        supplierId: form.supplierId || null,
        unit: form.unit,
        stock: Number(form.stock),
        purchasePrice: Number(form.costPrice),
        sellingPrice: Number(form.sellingPrice),
        createdAt: serverTimestamp(),
      });

      await batch.commit();
      
      // 3. Audit Log
      const user = auth.currentUser;
      if (user) {
        await logAudit({
          action: 'CREATE_PURCHASE',
          module: 'GUDANG',
          description: `Penerimaan stok produk ${form.productName} sebanyak ${form.quantity} senilai Rp ${totalModal.toLocaleString('id-ID')}`,
          userId: user.uid,
          userName: user.displayName || user.email || 'Admin',
          severity: 'INFO'
        });
      }

      alert("Inbound Record Authenticated Successfully");
      resetForm();
    } catch (error) {
      console.error("Submit Error:", error);
      alert("System Failure: Could not sync with database.");
    } finally {
      setLoading(false);
    }
  };

  // =========================
  // SUB-COMPONENTS
  // =========================
  const FieldLabel = ({ children, icon, optional }: { children: string, icon?: React.ReactNode, optional?: boolean }) => (
    <div className="flex items-center justify-between mb-2">
      <label className="text-[10px] font-mono font-bold uppercase tracking-[0.2em] text-cyan-400 flex items-center gap-2">
        {icon} {children}
      </label>
      {optional && <span className="text-[8px] font-mono text-slate-500 uppercase">Optional</span>}
    </div>
  );

  return (
    <div className="space-y-8 max-w-7xl mx-auto p-2">
      
      {/* HEADER SECTION */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-black text-white tracking-tighter uppercase">Product Procurement</h1>
          <p className="text-xs font-mono text-slate-500 uppercase tracking-widest mt-1">Advanced Supply Chain Inbound Management</p>
        </div>
        <div className="bg-white/5 border border-white/10 px-4 py-2 rounded-2xl flex items-center gap-3">
          <div className={`w-2 h-2 rounded-full ${isSyncing ? 'bg-orange-500 animate-pulse' : 'bg-emerald-500'}`} />
          <span className="text-[10px] font-mono text-slate-400 uppercase tracking-tighter">Database Node Connectivity: {isSyncing ? 'Syncing' : 'Stabilized'}</span>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 min-w-0">
        
        {/* PROCUREMENT FORM (LEFT) */}
        <div className="lg:col-span-2 space-y-6">
          <motion.div 
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="glass p-8 rounded-[2.5rem] border-white/5 relative overflow-hidden"
          >
            <div className="absolute top-0 right-0 w-32 h-32 bg-cyan-500/5 blur-3xl -z-10" />
            <div className="absolute bottom-0 left-0 w-32 h-32 bg-emerald-500/5 blur-3xl -z-10" />

            <form onSubmit={handleSubmit} className="space-y-8">
              
              {/* SECTION 1: ORIGIN & TEMPORAL */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div>
                  <FieldLabel icon={<Truck size={14} />} optional>1. Supplier / Provider Source</FieldLabel>
                  <div className="relative group">
                    <select 
                      name="supplierId" 
                      value={form.supplierId} 
                      onChange={handleChange}
                      className="w-full bg-slate-950/80 border border-white/10 text-slate-200 p-5 rounded-2xl text-sm focus:ring-2 focus:ring-cyan-500/50 outline-none transition-all appearance-none uppercase"
                    >
                      <option value="">-- NO REGISTERED SUPPLIER --</option>
                      {suppliers?.map(s => <option key={s.id_supplier || (s as any).id} value={s.id_supplier || (s as any).id}>{s.nama_supplier || (s as any).name}</option>)}
                    </select>
                    <ChevronDown size={18} className="absolute right-5 top-1/2 -translate-y-1/2 text-slate-500 pointer-events-none group-hover:text-cyan-400 transition-colors" />
                  </div>
                </div>
                <div>
                  <FieldLabel icon={<Calendar size={14} />}>2. Inbound Date</FieldLabel>
                  <input 
                    type="date" 
                    name="date" 
                    value={form.date} 
                    onChange={handleChange}
                    className="w-full bg-slate-950/80 border border-white/10 text-slate-200 p-5 rounded-2xl text-sm focus:ring-2 focus:ring-cyan-500/50 outline-none transition-all font-mono"
                  />
                </div>
              </div>

              {/* SECTION 2: IDENTITY & CLASSIFICATION */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div>
                  <FieldLabel icon={<Tag size={14} />}>3. Core Category Protocol</FieldLabel>
                  <div className="flex gap-2">
                    <div className="relative flex-1 group">
                      <select 
                        name="categoryId" 
                        value={form.categoryId} 
                        onChange={handleChange}
                        className="w-full bg-slate-950/80 border border-white/10 text-slate-200 p-5 rounded-2xl text-sm focus:ring-2 focus:ring-cyan-500/50 outline-none transition-all appearance-none uppercase"
                      >
                        <option value="">-- SELECT CATEGORY --</option>
                        {categories?.map(c => <option key={c.id_kategori || (c as any).id} value={c.id_kategori || (c as any).id}>{c.nama_kategori || (c as any).name}</option>)}
                      </select>
                      <ChevronDown size={18} className="absolute right-5 top-1/2 -translate-y-1/2 text-slate-500 pointer-events-none" />
                    </div>
                    <button 
                      type="button"
                      onClick={() => setShowCategoryModal(true)}
                      className="bg-white/5 border border-white/10 hover:bg-cyan-500/10 hover:border-cyan-500/30 text-cyan-400 p-5 rounded-2xl transition-all"
                    >
                      <Plus size={20} />
                    </button>
                  </div>
                </div>
                <div>
                  <FieldLabel icon={<Package size={14} />}>4. Product Designation (Name)</FieldLabel>
                  <input 
                    type="text" 
                    name="productName" 
                    value={form.productName} 
                    onChange={handleChange}
                    placeholder="Enter full product label..."
                    className="w-full bg-slate-950/80 border border-white/10 text-slate-200 p-5 rounded-2xl text-sm focus:ring-2 focus:ring-cyan-500/50 outline-none transition-all"
                  />
                </div>
              </div>

              {/* SECTION 3: METRICS & QUANTITY */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <FieldLabel icon={<Info size={14} />}>5. Uni Metric</FieldLabel>
                    <select 
                      name="unit" 
                      value={form.unit} 
                      onChange={handleChange}
                      className="w-full bg-slate-950/80 border border-white/10 text-slate-200 p-5 rounded-2xl text-sm focus:ring-2 focus:ring-cyan-500/50 outline-none transition-all"
                    >
                      <option>PCS</option>
                      <option>KG</option>
                      <option>Dus</option>
                      <option>Liter</option>
                      <option>Box</option>
                      <option>Pack</option>
                    </select>
                  </div>
                  <div>
                    <FieldLabel icon={<RotateCcw size={14} />}>6. Quantity</FieldLabel>
                    <input 
                      type="number" 
                      name="quantity" 
                      value={form.quantity} 
                      onChange={handleChange}
                      className="w-full bg-slate-950/80 border border-white/10 text-slate-200 p-5 rounded-2xl text-sm focus:ring-2 focus:ring-cyan-500/50 outline-none transition-all font-mono"
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                   <div>
                    <FieldLabel>7. Modal (Cost)</FieldLabel>
                    <input 
                      type="number" 
                      name="costPrice" 
                      value={form.costPrice} 
                      onChange={handleChange}
                      placeholder="Rp..."
                      className="w-full bg-slate-950/80 border border-white/10 text-slate-200 p-5 rounded-2xl text-sm focus:ring-2 focus:ring-cyan-500/50 outline-none transition-all font-mono"
                    />
                   </div>
                   <div>
                    <FieldLabel>8. Retail (Sales)</FieldLabel>
                    <input 
                      type="number" 
                      name="sellingPrice" 
                      value={form.sellingPrice} 
                      onChange={handleChange}
                      placeholder="Rp..."
                      className="w-full bg-slate-950/80 border border-white/10 text-slate-200 p-5 rounded-2xl text-sm focus:ring-2 focus:ring-cyan-500/50 outline-none transition-all font-mono"
                    />
                   </div>
                </div>
              </div>

              {/* SECTION 4: INVENTORY FINALIZATION */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div>
                  <FieldLabel icon={<Package size={14} />}>9. Final System Stock</FieldLabel>
                  <div className="relative">
                    <input 
                      type="number" 
                      name="stock" 
                      value={form.stock} 
                      onChange={handleChange}
                      className="w-full bg-slate-950/80 border border-white/10 text-slate-200 p-5 rounded-2xl text-sm focus:ring-2 focus:ring-cyan-500/50 outline-none transition-all font-mono"
                    />
                    <div className="absolute right-5 top-1/2 -translate-y-1/2 text-[8px] font-mono text-cyan-500/50 uppercase">Master Value</div>
                  </div>
                  <p className="mt-2 text-[9px] font-mono text-slate-500 italic">Total Matrix Valuation: <span className="text-emerald-400 font-bold">Rp {(Number(form.quantity) * Number(form.costPrice)).toLocaleString('id-ID')}</span></p>
                </div>
                <div>
                  <FieldLabel optional>10. Operations Intel (Keterangan)</FieldLabel>
                  <textarea 
                    name="notes" 
                    value={form.notes} 
                    onChange={handleChange}
                    rows={3}
                    placeholder="Input additional telemetry or context..."
                    className="w-full bg-slate-950/80 border border-white/10 text-slate-200 p-5 rounded-2xl text-sm focus:ring-2 focus:ring-cyan-500/50 outline-none transition-all resize-none"
                  />
                </div>
              </div>

              {/* ACTION BUTTONS */}
              <div className="flex flex-col sm:flex-row gap-4 pt-6 border-t border-white/5">
                <button 
                  type="submit" 
                  disabled={loading}
                  className="flex-1 py-5 bg-gradient-to-r from-cyan-600 to-emerald-600 rounded-[1.5rem] text-white text-xs font-bold uppercase tracking-[0.3em] flex items-center justify-center gap-3 shadow-xl shadow-cyan-900/20 hover:scale-[1.02] active:scale-95 transition-all group disabled:opacity-50"
                >
                  {loading ? (
                    <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  ) : (
                    <>
                      <PlusCircle size={20} className="group-hover:rotate-90 transition-transform duration-500" />
                      AUTHENTICATE INBOUND
                    </>
                  )}
                </button>
                <button 
                  type="button" 
                  onClick={resetForm}
                  className="px-10 py-5 bg-white/5 border border-white/10 rounded-[1.5rem] text-slate-400 text-xs font-bold uppercase tracking-widest hover:bg-white/10 hover:text-white transition-all active:scale-95"
                >
                  RESET BUFFER
                </button>
              </div>

            </form>
          </motion.div>
        </div>

        {/* ANALYTICS & CHIPS (RIGHT) */}
        <div className="space-y-8">
          
          {/* STOCK MONITORING CHART */}
           <GlassCard title="Inventory Dispersion" className="min-w-0">
            <SafeChartContainer 
              loading={isSyncing} 
              data={productsChart} 
              height={320}
              title="Inventory Distribution"
            >
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={productsChart}>
                  <defs>
                    <linearGradient id="barGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#22d3ee" stopOpacity={0.8}/>
                      <stop offset="100%" stopColor="#22d3ee" stopOpacity={0.1}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(255,255,255,0.05)" />
                  <XAxis 
                    dataKey="name" 
                    axisLine={false} 
                    tickLine={false} 
                    fontSize={8} 
                    stroke="#64748b" 
                    dy={10} 
                    interval={0} 
                  />
                  <YAxis axisLine={false} tickLine={false} fontSize={8} stroke="#64748b" />
                  <Tooltip 
                    contentStyle={{ backgroundColor: '#0f172a', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '12px', fontSize: '9px' }}
                    cursor={{ fill: 'rgba(255,255,255,0.05)' }}
                  />
                  <Bar dataKey="stock" fill="url(#barGradient)" radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </SafeChartContainer>
          </GlassCard>

          {/* QUICK LINKS / HELP */}
          <GlassCard title="Inbound Directives" className="min-w-0">
             <div className="space-y-4">
                {[
                  { icon: <PlusCircle size={16} />, text: "Automated stock sync is active by default." },
                  { icon: <Info size={16} />, text: "Inventory cost is calculated per unit volume." },
                  { icon: <Save size={16} />, text: "All transactions are logged in purchase_transactions." }
                ].map((item, i) => (
                  <div key={i} className="flex gap-3 text-[10px] font-mono text-slate-400 group">
                    <div className="text-cyan-500 mt-0.5">{item.icon}</div>
                    <p className="leading-relaxed group-hover:text-slate-300 transition-colors uppercase">{item.text}</p>
                  </div>
                ))}
             </div>
          </GlassCard>

        </div>

      </div>

      {/* MODAL: ADD CATEGORY */}
      <AnimatePresence>
        {showCategoryModal && (
          <div 
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md"
            onClick={() => setShowCategoryModal(false)}
          >
            <motion.div 
              initial={{ opacity: 0, scale: 0.9, rotateX: 20 }}
              animate={{ opacity: 1, scale: 1, rotateX: 0 }}
              exit={{ opacity: 0, scale: 0.9, rotateX: -20 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-slate-900 border border-white/10 p-10 rounded-[2.5rem] w-full max-w-md shadow-2xl space-y-8 relative overflow-hidden"
            >
              <div className="absolute -top-10 -right-10 w-32 h-32 bg-emerald-500/10 blur-3xl" />
              
              <div className="space-y-2">
                <h3 className="text-2xl font-black text-white uppercase tracking-tighter">New Module Protocol</h3>
                <p className="text-[10px] font-mono text-emerald-500 uppercase font-bold tracking-widest">Category Registration Entry</p>
              </div>
              
              <div className="space-y-3">
                <FieldLabel icon={<Tag size={14} />}>Category Label Identity</FieldLabel>
                <input 
                  autoFocus
                  type="text" 
                  value={newCategory}
                  onChange={(e) => setNewCategory(e.target.value)}
                  placeholder="e.g. ELECTRONIC, ORGANIC, FLUIDS..." 
                  className="w-full bg-slate-950/80 border border-white/10 text-slate-200 p-5 rounded-2xl text-sm focus:ring-2 focus:ring-emerald-500/50 outline-none transition-all uppercase"
                />
              </div>

              <div className="flex gap-4">
                <button 
                  onClick={handleAddCategory}
                  disabled={!newCategory.trim()}
                  className="flex-1 py-4 bg-gradient-to-r from-emerald-600 to-cyan-600 rounded-2xl text-white text-[10px] font-bold uppercase tracking-[0.2em] hover:scale-[1.02] active:scale-95 transition-all disabled:opacity-50 shadow-lg shadow-emerald-950/20"
                >
                  AUTHENTICATE
                </button>
                <button 
                  onClick={() => setShowCategoryModal(false)}
                  className="px-8 py-4 bg-white/5 border border-white/10 rounded-2xl text-slate-400 text-[10px] font-bold uppercase tracking-widest hover:text-white transition-all"
                >
                  ABORT
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

    </div>
  );
}

// Internal reusable card for this module
const GlassCard = ({ children, title, className = "" }: { children: React.ReactNode, title?: string, className?: string }) => (
  <motion.div 
    initial={{ opacity: 0, x: 20 }}
    animate={{ opacity: 1, x: 0 }}
    className={`glass p-8 rounded-[2rem] border-white/5 relative overflow-hidden flex flex-col gap-4 min-w-0 ${className}`}
  >
    <div className="absolute top-0 left-0 w-full h-[1px] bg-gradient-to-r from-transparent via-cyan-400/20 to-transparent" />
    {title && (
      <div className="space-y-1">
        <h3 className="text-sm font-black text-white uppercase tracking-tighter">{title}</h3>
        <div className="w-8 h-[2px] bg-cyan-500/50 rounded-full" />
      </div>
    )}
    {children}
  </motion.div>
);
