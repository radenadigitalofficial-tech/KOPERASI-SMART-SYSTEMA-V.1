import React, { useState, useEffect, useMemo } from 'react';
import { 
  Database, UserPlus, Wallet, Activity, 
  Cpu, LogOut, ShieldCheck, Users, 
  ArrowUpRight, ArrowDownRight, CreditCard,
  FileDown, Printer, Edit2, Trash2, X, Settings,
  ShoppingBag, Plus, Minus, Trash, PlusCircle, Package, Truck, ChevronDown,
  ChevronLeft, ChevronRight, Shield,
  TrendingUp, Briefcase, AlertCircle, Loader2, ShieldAlert
} from 'lucide-react';
import ProductPurchaseModule from './ProductPurchaseModule';
import { motion, AnimatePresence } from 'motion/react';
import UnitJasaContainer from './UnitJasa/UnitJasaContainer';
import RekapSimpananModule from './RekapSimpanan/RekapSimpananModule';
import SafeChartContainer from './SafeChartContainer';
import ProfilKoperasiModule from '../modules/settings/profil-koperasi/ProfilKoperasiModule';
import BackupModule from '../modules/settings/backup/BackupModule';
import ResetModule from '../modules/settings/reset-data/ResetModule';
import AuditLogsModule from '../modules/settings/audit/AuditLogsModule';
import RecentAuditLogs from './dashboard/RecentAuditLogs';
import { 
  collection, addDoc, onSnapshot, query, orderBy, serverTimestamp,
  where, doc, setDoc, getDoc, runTransaction,
  limit, getDocs, updateDoc, deleteDoc, writeBatch 
} from 'firebase/firestore';
import { onAuthStateChanged } from 'firebase/auth';
import { auth, db, signInWithGoogle, logout } from '../services/firebase';
import { logAudit } from '../utils/auditLogger';
import { handleFirestoreError, OperationType } from '../utils/firestoreUtils';

// ==========================================
// TIPE DATA & ERROR HANDLING
// ==========================================
import { 
  PieChart, Pie, Cell, Tooltip, Legend,
  BarChart, Bar, XAxis, YAxis, CartesianGrid,
  LineChart, Line, ResponsiveContainer
} from 'recharts';
import * as XLSX from 'xlsx';
import { jsPDF } from 'jspdf';
import 'jspdf-autotable';

type MenuType = 'dashboard' | 'pendaftaran' | 'transaksi' | 'anggota_list' | 'dpk' | 'laporan' | 'pinjaman' | 'settings' | 'pos' | 'produk' | 'kasbon' | 'laporan_usaha' | 'supplier' | 'pembelian' | 'kategori' | 'unit_jasa' | 'rekap_simpanan' | 'profil_koperasi' | 'backup_data' | 'reset_data' | 'audit_log';

interface Produk {
  id_produk: string;
  nama_produk: string;
  harga_jual: number;
  harga_modal: number;
  stok: number;
  jumlah_barang: number;
  satuan: string;
  kategori: string;
  supplier: string;
  tanggal_pembelian: any;
  tanggal_input: any;
  keterangan: string;
}

interface Kategori {
  id_kategori: string;
  nama_kategori: string;
}

interface Supplier {
  id_supplier: string;
  nama_supplier: string;
  kontak: string;
}

interface Pembelian {
  id_pembelian: string;
  tanggal_belanja: any;
  id_supplier: string;
  items: {
    id_produk: string;
    nama_produk: string;
    qty: number;
    harga_modal: number;
  }[];
  total_modal: number;
}

interface Penjualan {
  id_penjualan: string;
  id_anggota?: string;
  items: {
    id_produk: string;
    nama_produk: string;
    qty: number;
    harga: number;
    subtotal: number;
  }[];
  total_bayar: number;
  total_modal?: number;
  keuntungan?: number;
  metode_bayar: 'TUNAI' | 'KASBON';
  status_bayar: 'LUNAS' | 'BELUM_LUNAS';
  tanggal: any;
}

interface Anggota {
  id_anggota: string;
  nama: string;
  no_hp: string;
  alamat: string;
  tanggal_daftar: any;
  status: string;
}

interface Transaksi {
  id_transaksi: string;
  id_anggota: string;
  jenis: 'POKOK' | 'WAJIB' | 'SUKARELA' | 'TABUNG' | 'PINJAM' | 'CICIL';
  tipe: 'MASUK' | 'KELUAR';
  nominal: number;
  tanggal: any;
  keterangan?: string;
}

interface DanaPihakKetiga {
  id_dana: string;
  jenis: 'SUMBANGAN' | 'HIBAH' | 'PENDANAAN' | 'LAINNYA';
  nominal: number;
  sumber: string;
  keterangan?: string;
  tanggal: any;
  created_at: any;
}

interface ThirdPartyFund {
  id?: string;
  sourceName: string;
  fundType: 'Investor' | 'Mitra' | 'Hibah' | 'Dana Sosial' | 'Dana Titipan' | 'Non Anggota' | 'Kerjasama' | 'Lainnya';
  amount: number;
  contributorName: string;
  description?: string;
  status: 'ACTIVE' | 'INACTIVE';
  createdAt: any;
}

interface Pinjaman {
  id_pinjaman: string;
  id_anggota: string;
  nama_anggota: string;
  jumlah_pinjaman: number;
  tenor: number;
  bunga: number;
  total_bunga: number;
  total_tagihan: number;
  cicilan_per_bulan: number;
  tanggal_mulai: any;
  status: 'AKTIF' | 'LUNAS';
  created_at: any;
}

interface Cicilan {
  id_cicilan: string;
  id_pinjaman: string;
  angsuran_ke: number;
  tanggal_jatuh_tempo: any;
  nominal: number;
  status: 'BELUM' | 'SUDAH';
  tanggal_bayar?: any;
}

// ==========================================
// MAIN COMPONENT
// ==========================================
export default function KoperasiSmartSystema() {
  const [activeMenu, setActiveMenu] = useState<MenuType>('dashboard');
  const [user, setUser] = useState(auth.currentUser);
  const [filterMemberId, setFilterMemberId] = useState<string>('ALL');
  
  // Data State
  const [anggota, setAnggota] = useState<Anggota[]>([]);
  const [transaksi, setTransaksi] = useState<Transaksi[]>([]);
  const [dpkList, setDpkList] = useState<DanaPihakKetiga[]>([]);
  const [thirdPartyFunds, setThirdPartyFunds] = useState<ThirdPartyFund[]>([]);
  const [loans, setLoans] = useState<Pinjaman[]>([]);
  const [installments, setInstallments] = useState<Cicilan[]>([]);
  const [selectedLoanId, setSelectedLoanId] = useState<string | null>(null);
  const [editingItem, setEditingItem] = useState<{ type: MenuType | 'cicilan'; data: any } | null>(null);
  const [config, setConfig] = useState<{ simpanan_pokok: number }>({ simpanan_pokok: 50000 });
  const [currentTime, setCurrentTime] = useState(new Date().toLocaleString('id-ID'));
  const [isLoading, setIsLoading] = useState(true);
  const [products, setProducts] = useState<Produk[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [kategoriList, setKategoriList] = useState<Kategori[]>([]);
  const [pembelianList, setPembelianList] = useState<Pembelian[]>([]);
  const [sales, setSales] = useState<Penjualan[]>([]);
  const [showCatModal, setShowCatModal] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [productView, setProductView] = useState<'table' | 'procurement'>('table');
  const [cart, setCart] = useState<{ product: Produk; qty: number }[]>([]);
  const [searchProduct, setSearchProduct] = useState('');
  const [selectedCustomer, setSelectedCustomer] = useState<string>('');
  const [checkoutType, setCheckoutType] = useState<'TUNAI' | 'KASBON'>('TUNAI');
  const [simulationResult, setSimulationResult] = useState<{
    jumlah_pinjaman: number;
    tenor: number;
    bunga: number;
    total_bunga: number;
    total_tagihan: number;
    cicilan_per_bulan: number;
    jadwal: { angsuran_ke: number; tanggal: Date; nominal: number }[];
  } | null>(null);

  const [isAdmin, setIsAdmin] = useState(false);
  const [deleteMemberModal, setDeleteMemberModal] = useState<{ 
    isOpen: boolean; 
    data: Anggota | null;
    isDeleting: boolean;
  }>({ isOpen: false, data: null, isDeleting: false });

  // Pagination State
  const [currentPageAnggota, setCurrentPageAnggota] = useState(1);
  const [currentPageTransaksi, setCurrentPageTransaksi] = useState(1);
  const itemsPerPage = 20;

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (u) => {
      setUser(u);
      if (u) {
        // Correct way to check for admin: Query the 'admins' collection
        const adminDoc = await getDoc(doc(db, 'admins', u.uid));
        if (adminDoc.exists()) {
          setIsAdmin(true);
        } else {
          // Fallback check for the initial setup
          if (u.email === 'radena.digital@gmail.com') {
            // Auto-whitelist first admin if collection is empty or not yet set up
            await setDoc(doc(db, 'admins', u.uid), { email: u.email, role: 'ADMIN' });
            setIsAdmin(true);
          } else {
            setIsAdmin(false);
          }
        }
      } else {
        setIsAdmin(false);
      }
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    let timeout: NodeJS.Timeout;
    const resetTimeout = () => {
      if (timeout) clearTimeout(timeout);
      timeout = setTimeout(() => {
        if (auth.currentUser) {
          auth.signOut();
          alert('Sesi berakhir karena inaktivitas demi keamanan.');
        }
      }, 30 * 60 * 1000); // 30 minutes
    };

    window.addEventListener('mousemove', resetTimeout);
    window.addEventListener('keydown', resetTimeout);
    window.addEventListener('click', resetTimeout);
    
    resetTimeout();

    return () => {
      window.removeEventListener('mousemove', resetTimeout);
      window.removeEventListener('keydown', resetTimeout);
      window.removeEventListener('click', resetTimeout);
      if (timeout) clearTimeout(timeout);
    };
  }, [user]);

  // Real-time Data Sync
  useEffect(() => {
    if (!user) return;

    // Realtime Anggota
    const unsubAnggota = onSnapshot(collection(db, 'anggota'), (snapshot) => {
      setAnggota(snapshot.docs.map(doc => doc.data() as Anggota).filter(a => !(a as any).isDeleted && !(a as any).deleted));
      setIsLoading(false);
    }, (error) => handleFirestoreError(error, OperationType.LIST, 'anggota'));

    // Realtime Transaksi
    const unsubTransaksi = onSnapshot(collection(db, 'transaksi'), (snapshot) => {
      setTransaksi(snapshot.docs.map(doc => doc.data() as Transaksi).filter(t => !(t as any).isDeleted && !(t as any).deleted));
    }, (error) => handleFirestoreError(error, OperationType.LIST, 'transaksi'));

    // Realtime DPK
    const unsubDPK = onSnapshot(collection(db, 'dana_pihak_ketiga'), (snapshot) => {
      setDpkList(snapshot.docs.map(doc => doc.data() as DanaPihakKetiga));
    }, (error) => handleFirestoreError(error, OperationType.LIST, 'dana_pihak_ketiga'));

    const unsubThirdParty = onSnapshot(collection(db, 'third_party_funds'), (snapshot) => {
      setThirdPartyFunds(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }) as ThirdPartyFund));
    }, (error) => handleFirestoreError(error, OperationType.LIST, 'third_party_funds'));

    // Realtime Pinjaman
    const unsubLoans = onSnapshot(collection(db, 'pinjaman'), (snapshot) => {
      setLoans(snapshot.docs.map(doc => doc.data() as Pinjaman));
    }, (error) => handleFirestoreError(error, OperationType.LIST, 'pinjaman'));

    // Realtime Cicilan
    const unsubInstallments = onSnapshot(collection(db, 'cicilan'), (snapshot) => {
      setInstallments(snapshot.docs.map(doc => doc.data() as Cicilan));
    }, (error) => handleFirestoreError(error, OperationType.LIST, 'cicilan'));

    // Realtime Settings
    const unsubConfig = onSnapshot(doc(db, 'settings', 'koperasi_config'), (snapshot) => {
      if (snapshot.exists()) {
        setConfig(snapshot.data() as { simpanan_pokok: number });
      }
    }, (error) => handleFirestoreError(error, OperationType.GET, 'settings/koperasi_config'));

    // Realtime Produk
    const unsubProduk = onSnapshot(collection(db, 'products'), (snapshot) => {
      setProducts(snapshot.docs.map(doc => ({ 
        id_produk: doc.id, 
        ...doc.data() 
      } as Produk)));
    }, (error) => handleFirestoreError(error, OperationType.LIST, 'products'));

    // Realtime Penjualan
    const unsubPenjualan = onSnapshot(collection(db, 'penjualan'), (snapshot) => {
      setSales(snapshot.docs.map(doc => doc.data() as Penjualan));
    }, (error) => handleFirestoreError(error, OperationType.LIST, 'penjualan'));

    const unsubSupplier = onSnapshot(collection(db, 'suppliers'), (snapshot) => {
      setSuppliers(snapshot.docs.map(doc => doc.data() as Supplier));
    }, (error) => handleFirestoreError(error, OperationType.LIST, 'suppliers'));

    const unsubKategori = onSnapshot(collection(db, 'product_categories'), (snapshot) => {
      setKategoriList(snapshot.docs.map(doc => doc.data() as Kategori));
    }, (error) => handleFirestoreError(error, OperationType.LIST, 'product_categories'));

    const unsubPembelian = onSnapshot(collection(db, 'purchase_transactions'), (snapshot) => {
      setPembelianList(snapshot.docs.map(doc => doc.data() as Pembelian));
    }, (error) => handleFirestoreError(error, OperationType.LIST, 'purchase_transactions'));

    const timer = setInterval(() => setCurrentTime(new Date().toLocaleString('id-ID')), 1000);

    return () => {
      unsubAnggota();
      unsubTransaksi();
      unsubDPK();
      unsubThirdParty();
      unsubLoans();
      unsubInstallments();
      unsubConfig();
      unsubProduk();
      unsubPenjualan();
      unsubSupplier();
      unsubKategori();
      unsubPembelian();
      clearInterval(timer);
    };
  }, [user]);

  // Modal & Popup Management
  useEffect(() => {
    // Auto-close all modals when menu changes to prevent ghost overlays
    setEditingItem(null);
    setDeleteMemberModal({ isOpen: false, data: null, isDeleting: false });
    setShowCatModal(false);
  }, [activeMenu]);

  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setEditingItem(null);
        setDeleteMemberModal({ isOpen: false, data: null, isDeleting: false });
        setShowCatModal(false);
      }
    };
    window.addEventListener("keydown", handleEsc);
    return () => window.removeEventListener("keydown", handleEsc);
  }, []);

  useEffect(() => {
    const isAnyModalOpen = !!editingItem || deleteMemberModal.isOpen || showCatModal;
    if (isAnyModalOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "auto";
    }
    return () => {
      document.body.style.overflow = "auto";
    };
  }, [editingItem, deleteMemberModal.isOpen, showCatModal]);

  // ==========================================
  // LOGIC HELPERS
  // ==========================================
  const getSummaryPerAnggota = (id: string) => {
    let pokok = 0;
    let wajib = 0;
    let sukarela = 0;
    let tabungan = 0;
    let pinjam = 0;
    let cicil = 0;

    transaksi.forEach(t => {
      if (t.id_anggota === id) {
        const nominal = t.nominal || 0;
        if (t.jenis === "POKOK") pokok += nominal;
        if (t.jenis === "WAJIB") wajib += nominal;
        if (t.jenis === "SUKARELA") sukarela += nominal;
        if (t.jenis === "TABUNG") {
          if (t.tipe === "MASUK") tabungan += nominal;
          else tabungan -= nominal;
        }
        if (t.jenis === "PINJAM") pinjam += nominal;
        if (t.jenis === "CICIL") cicil += nominal;
      }
    });

    return { pokok, wajib, sukarela, tabungan, sisa_pinjam: pinjam - cicil };
  };

  const stats = useMemo(() => {
    const pokok = transaksi
      .filter(t => t.jenis === 'POKOK')
      .reduce((acc, curr) => acc + curr.nominal, 0);

    const wajib = transaksi
      .filter(t => t.jenis === 'WAJIB')
      .reduce((acc, curr) => acc + curr.nominal, 0);

    const sukarela = transaksi
      .filter(t => t.jenis === 'SUKARELA')
      .reduce((acc, curr) => acc + curr.nominal, 0);

    const tabungan = transaksi
      .filter(t => t.jenis === 'TABUNG')
      .reduce((acc, curr) => (curr.tipe === 'MASUK' ? acc + curr.nominal : acc - curr.nominal), 0);

    const pinjaman = transaksi
      .filter(t => t.jenis === 'PINJAM')
      .reduce((acc, curr) => acc + curr.nominal, 0);

    const cicilan = transaksi
      .filter(t => t.jenis === 'CICIL')
      .reduce((acc, curr) => acc + curr.nominal, 0);

    const checkSisaPinjaman = pinjaman - cicilan;
    const dpkTotalLegacy = dpkList.reduce((acc, curr) => acc + (curr.nominal || 0), 0);
    const dpkTotalNew = thirdPartyFunds
      .filter(f => f.status === 'ACTIVE')
      .reduce((acc, curr) => acc + (curr.amount || 0), 0);
    
    const dpkTotal = dpkTotalLegacy + dpkTotalNew;
    const asetTotal = pokok + wajib + sukarela + tabungan + checkSisaPinjaman + dpkTotal;

    return {
      totalPokok: pokok,
      totalWajib: wajib,
      totalSukarela: sukarela,
      totalTabungan: tabungan,
      totalPinjaman: pinjaman,
      totalCicilan: cicilan,
      sisaPinjaman: checkSisaPinjaman,
      totalDPK: dpkTotal,
      totalAsetKoperasi: asetTotal
    };
  }, [transaksi, dpkList, thirdPartyFunds]);

  // Aggregate Data for Charts - Memoized
  const chartData = useMemo(() => [
    { name: 'Simpanan', value: stats.totalPokok + stats.totalWajib + stats.totalSukarela, color: '#22d3ee' },
    { name: 'Tabungan', value: stats.totalTabungan, color: '#facc15' },
    { name: 'Pinjaman (Receivable)', value: stats.sisaPinjaman, color: '#f87171' },
    { name: 'Dana Pihak Ketiga', value: stats.totalDPK, color: '#c084fc' },
  ], [stats]);

  const lineChartData = useMemo(() => {
    return Array.from({ length: 7 }, (_, i) => {
      const d = new Date();
      d.setDate(d.getDate() - (6 - i));
      const dateStr = d.toLocaleDateString('id-ID', { day: 'numeric', month: 'short' });
      const dayTransactions = transaksi.filter(t => {
        const tDate = t.tanggal?.toDate?.() || new Date(t.tanggal);
        return tDate.toDateString() === d.toDateString();
      });
      return {
        tanggal: dateStr,
        simpan: dayTransactions.filter(t => t.tipe === 'MASUK').reduce((acc, curr) => acc + curr.nominal, 0),
        pinjam: dayTransactions.filter(t => t.jenis === 'PINJAM').reduce((acc, curr) => acc + curr.nominal, 0),
      };
    });
  }, [transaksi]);

  // ==========================================
  // ID GENERATORS
  // ==========================================
  
  /**
   * Menghasilkan ID Anggota otomatis dengan format KOP-XXX (001, 002, dst)
   * Menggunakan Firestore Transaction untuk menjamin keunikan and urutan.
   */
  const generateIdAnggota = async () => {
    const counterRef = doc(db, 'counters', 'anggota');
    
    return await runTransaction(db, async (transaction) => {
      const counterDoc = await transaction.get(counterRef);
      let nextId = 1;
      
      if (counterDoc.exists()) {
        nextId = counterDoc.data().last_id + 1;
      }
      
      transaction.set(counterRef, { last_id: nextId }, { merge: true });
      
      // format ke 3 digit (misal: 1 -> 001, 10 -> 010)
      const paddedNumber = nextId.toString().padStart(3, '0');
      return `KOP-${paddedNumber}`;
    });
  };

  /**
   * Menghasilkan ID Transaksi acak 5 digit TRX-XXXXX
   * Dilengkapi pengecekan duplikasi di database.
   */
  const generateIdTransaksi = async () => {
    let unique = false;
    let newTrxId = '';
    
    while (!unique) {
      const randomDigits = Math.floor(10000 + Math.random() * 90000); // 5 digit (10000-99999)
      newTrxId = `TRX-${randomDigits}`;
      
      // Cek apakah ID sudah dipakai
      const trxDoc = await getDoc(doc(db, 'transaksi', newTrxId));
      if (!trxDoc.exists()) {
        unique = true;
      }
    }
    
    return newTrxId;
  };

  /**
   * Menghasilkan ID Dana Pihak Ketiga (DPK-XXX)
   */
  const generateIdDPK = async () => {
    const counterRef = doc(db, 'counters', 'dpk');
    return await runTransaction(db, async (transaction) => {
      const counterDoc = await transaction.get(counterRef);
      let nextId = 1;
      if (counterDoc.exists()) nextId = counterDoc.data().last_id + 1;
      transaction.set(counterRef, { last_id: nextId }, { merge: true });
      return `DPK-${nextId.toString().padStart(3, '0')}`;
    });
  };

  /**
   * Menghasilkan ID Pinjaman (PJM-XXX)
   */
  const generateIdPinjaman = async () => {
    const counterRef = doc(db, 'counters', 'pinjaman');
    return await runTransaction(db, async (transaction) => {
      const counterDoc = await transaction.get(counterRef);
      let nextId = 1;
      if (counterDoc.exists()) nextId = counterDoc.data().last_id + 1;
      transaction.set(counterRef, { last_id: nextId }, { merge: true });
      return `PJM-${nextId.toString().padStart(3, '0')}`;
    });
  };

  /**
   * Menghasilkan ID Cicilan (CIC-XXXXX)
   */
  const generateIdCicilan = (pjmId: string, idx: number) => {
    return `CIC-${pjmId}-${idx.toString().padStart(2, '0')}`;
  };

  /**
   * Menghasilkan ID Produk (PRD-XXX)
   */
  const generateIdProduk = async () => {
    const counterRef = doc(db, 'counters', 'produk');
    return await runTransaction(db, async (transaction) => {
      const counterDoc = await transaction.get(counterRef);
      let nextId = 1;
      if (counterDoc.exists()) nextId = (counterDoc.data().last_id || 0) + 1;
      transaction.set(counterRef, { last_id: nextId }, { merge: true });
      return `PRD-${nextId.toString().padStart(3, '0')}`;
    });
  };

  /**
   * Menghasilkan ID Penjualan (INV-XXXXX)
   */
  const generateIdPenjualan = async () => {
    const timestamp = Date.now().toString().slice(-8);
    const random = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
    return `INV-${timestamp}${random}`;
  };

  // ==========================================
  // HANDLERS
  // ==========================================
  const handleTambahAnggota = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const form = e.currentTarget;
    const formData = new FormData(form);
    
    try {
      // Generate ID otomatis
      const id = await generateIdAnggota();
      
      const memberData: Anggota = {
        id_anggota: id,
        nama: formData.get('nama') as string,
        no_hp: formData.get('no_hp') as string,
        alamat: formData.get('alamat') as string,
        status: 'Aktif',
        tanggal_daftar: new Date()
      };

      // 1. Simpan profile anggota
      await setDoc(doc(db, 'anggota', id), memberData);
      
      // 2. Automatis buat transaksi SIMPANAN POKOK (MASUK, nominal dari config)
      const trxId = await generateIdTransaksi();
      await setDoc(doc(db, 'transaksi', trxId), {
        id_transaksi: trxId,
        id_anggota: id,
        jenis: 'POKOK',
        tipe: 'MASUK',
        nominal: config.simpanan_pokok || 50000,
        tanggal: new Date(),
        keterangan: 'Inisialisasi Simpanan Pokok Otomatis (Settings Config)'
      });

      // Audit Log
      if (user) {
        await logAudit({
          action: 'CREATE_MEMBER',
          module: 'PENGURUSAN',
          description: `Mendaftarkan anggota baru: ${memberData.nama}`,
          userId: user.uid,
          userName: user.displayName || user.email || 'Admin',
          targetId: id,
          severity: 'INFO'
        });
      }

      alert(`Sukses! Anggota terdaftar dengan ID: ${id}`);
      form.reset();
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, 'anggota');
    }
  };

  const monthMap: { [key: string]: number } = {
    'Januari': 1, 'Februari': 2, 'Maret': 3, 'April': 4,
    'Mei': 5, 'Juni': 6, 'Juli': 7, 'Agustus': 8,
    'September': 9, 'Oktober': 10, 'November': 11, 'Desember': 12
  };

  const handleTambahTransaksi = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const form = e.currentTarget;
    const formData = new FormData(form);
    
    const idAnggota = formData.get('id_anggota_trx') as string;
    const jenis = formData.get('jenis') as string;
    const paymentMonth = formData.get('paymentMonth') as string;
    const paymentYear = Number(formData.get('paymentYear'));
    const nominal = Number(formData.get('nominal'));
    const tipe = formData.get('tipe') as string;

    try {
      // 1. Validasi Duplikat untuk SIMPANAN WAJIB (MASUK)
      if (jenis === 'WAJIB' && tipe === 'MASUK') {
        const q = query(
          collection(db, 'mandatory_savings'),
          where('memberId', '==', idAnggota),
          where('month', '==', monthMap[paymentMonth] || 0),
          where('year', '==', paymentYear)
        );
        const check = await getDocs(q);
        if (!check.empty) {
          alert(`CRITICAL ERROR: Anggota ${idAnggota} sudah tercatat membayar Simpanan WAJIB untuk periode ${paymentMonth} ${paymentYear}. Sistem menolak duplikasi.`);
          return;
        }
      }

      // Generate ID Transaksi otomatis
      const idTrx = await generateIdTransaksi();
      const member = anggota.find(a => a.id_anggota === idAnggota);

      const data = {
        id_transaksi: idTrx,
        id_anggota: idAnggota,
        nama_anggota: member?.nama || 'Unknown Entity',
        jenis: jenis,
        tipe: tipe,
        nominal: nominal,
        keterangan: formData.get('keterangan'),
        tanggal: new Date(),
        paymentMonth: paymentMonth || null,
        paymentYear: paymentYear || null,
        savingType: jenis
      };

      // Commit ke Main Ledger
      await setDoc(doc(db, 'transaksi', idTrx), data);

      // Audit Log
      if (user) {
        await logAudit({
          action: 'CREATE_SAVING',
          module: 'SIMPANAN',
          description: `Menambahkan simpanan ${jenis.toLowerCase()} anggota${jenis === 'WAJIB' ? ' wajib' : ''}`,
          userId: user.uid,
          userName: user.displayName || user.email || 'Admin',
          targetId: idTrx,
          severity: 'INFO'
        });
      }

      // Sinkronisasi ke Module Rekap (Spesifik WAJIB)
      if (jenis === 'WAJIB' && tipe === 'MASUK') {
        await addDoc(collection(db, 'mandatory_savings'), {
          memberId: idAnggota,
          memberName: member?.nama || 'Unknown',
          month: monthMap[paymentMonth],
          year: paymentYear,
          amount: nominal,
          paymentDate: new Date(),
          status: 'LUNAS',
          createdAt: new Date()
        });
      }

      // Sinkronisasi ke Module Rekap (Spesifik SUKARELA)
      if (jenis === 'SUKARELA' && tipe === 'MASUK') {
         await addDoc(collection(db, 'voluntary_savings'), {
            memberId: idAnggota,
            memberName: member?.nama || 'Unknown',
            amount: nominal,
            transactionDate: new Date(),
            notes: formData.get('keterangan')
         });
      }

      // Sinkronisasi ke Module Rekap (Spesifik TABUNG)
      if (jenis === 'TABUNG' && tipe === 'MASUK') {
         await addDoc(collection(db, 'member_savings'), {
            memberId: idAnggota,
            memberName: member?.nama || 'Unknown',
            amount: nominal,
            transactionDate: new Date(),
            notes: formData.get('keterangan')
         });
      }

      alert(`LOGGED: Transaksi ${idTrx} successfully committed to database.`);
      form.reset();
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, 'transaksi');
    }
  };

  // ==========================================
  // EXPORT FUNCTIONS
  // ==========================================
  const exportToExcel = () => {
    const dataAnggota = (anggota || []).map(a => {
      const s = getSummaryPerAnggota(a.id_anggota);
      return {
        'Nama': a.nama,
        'ID': a.id_anggota,
        'Pokok': s.pokok,
        'Wajib': s.wajib,
        'Sukarela': s.sukarela,
        'Tabungan': s.tabungan,
        'Sisa Pinjaman': s.sisa_pinjam,
        'Total': s.pokok + s.wajib + s.sukarela + s.tabungan
      };
    });

    const fundData = [
      { 'Kategori': 'Simpanan Pokok', 'Nominal': stats.totalPokok },
      { 'Kategori': 'Simpanan Wajib', 'Nominal': stats.totalWajib },
      { 'Kategori': 'Simpanan Sukarela', 'Nominal': stats.totalSukarela },
      { 'Kategori': 'Tabungan', 'Nominal': stats.totalTabungan },
      { 'Kategori': 'Pinjaman Beredar', 'Nominal': stats.sisaPinjaman },
      { 'Kategori': 'Dana Pihak Ketiga', 'Nominal': stats.totalDPK },
      { 'Kategori': 'TOTAL ASET', 'Nominal': stats.totalAsetKoperasi }
    ];

    const wb = XLSX.utils.book_new();
    const ws1 = XLSX.utils.json_to_sheet(dataAnggota);
    const ws2 = XLSX.utils.json_to_sheet(fundData);

    XLSX.utils.book_append_sheet(wb, ws1, "Data Anggota");
    XLSX.utils.book_append_sheet(wb, ws2, "Ikhtisar Aset");

    XLSX.writeFile(wb, `Laporan_Aset_Koperasi_${new Date().toISOString().split('T')[0]}.xlsx`);
  };

  const exportToPDF = () => {
    const doc = new jsPDF();
    doc.setFontSize(18);
    doc.text('Laporan Aset Koperasi Smart Systema', 14, 22);
    doc.setFontSize(11);
    doc.text(`Dicetak pada: ${new Date().toLocaleString('id-ID')}`, 14, 30);

    const summaryData = [
      ['Simpanan Pokok', `Rp ${stats.totalPokok.toLocaleString('id-ID')}`],
      ['Simpanan Wajib', `Rp ${stats.totalWajib.toLocaleString('id-ID')}`],
      ['Simpanan Sukarela', `Rp ${stats.totalSukarela.toLocaleString('id-ID')}`],
      ['Tabungan Anggota', `Rp ${stats.totalTabungan.toLocaleString('id-ID')}`],
      ['Pinjaman Beredar (Piutang)', `Rp ${stats.sisaPinjaman.toLocaleString('id-ID')}`],
      ['Dana Pihak Ketiga', `Rp ${stats.totalDPK.toLocaleString('id-ID')}`],
      ['TOTAL ASET KOPERASI', `Rp ${stats.totalAsetKoperasi.toLocaleString('id-ID')}`]
    ];

    (doc as any).autoTable({
      startY: 40,
      head: [['Kategori Aset', 'Nominal']],
      body: summaryData,
      theme: 'grid',
      headStyles: { fillColor: [6, 182, 212] }
    });

    const memberData = (anggota || []).map(a => {
      const s = getSummaryPerAnggota(a.id_anggota);
      return [
        a.nama,
        a.id_anggota,
        s.pokok.toLocaleString('id-ID'),
        s.wajib.toLocaleString('id-ID'),
        s.tabungan.toLocaleString('id-ID'),
        s.sisa_pinjam.toLocaleString('id-ID')
      ];
    });

    doc.text('Detail Aset per Anggota', 14, (doc as any).lastAutoTable.finalY + 15);
    (doc as any).autoTable({
      startY: (doc as any).lastAutoTable.finalY + 20,
      head: [['Nama', 'ID', 'Pokok', 'Wajib', 'Tabung', 'Pinjam']],
      body: memberData,
      theme: 'striped',
      headStyles: { fillColor: [59, 130, 246] }
    });

    doc.save(`Laporan_Koperasi_${Date.now()}.pdf`);
  };

  const handleTambahDPK = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const form = e.currentTarget;
    const formData = new FormData(form);
    
    try {
      const id = await generateIdDPK();
      const data: ThirdPartyFund = {
        sourceName: formData.get('sourceName') as string,
        fundType: formData.get('fundType') as any,
        amount: Number(formData.get('amount')),
        contributorName: formData.get('contributorName') as string,
        description: formData.get('description') as string,
        status: 'ACTIVE',
        createdAt: new Date()
      };

      await setDoc(doc(db, 'third_party_funds', id), data);
      alert(`Berhasil! Dana Pihak Ketiga tersimpan dengan ID sistem: ${id}`);
      form.reset();
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, 'third_party_funds');
    }
  };

  const handleSimulasi = (e: React.MouseEvent) => {
    e.preventDefault();
    const form = (e.target as HTMLElement).closest('form');
    if (!form) return;
    
    const formData = new FormData(form);
    const amount = Number(formData.get('jumlah_pinjaman'));
    const tenor = Number(formData.get('tenor'));
    const rate = Number(formData.get('bunga'));
    const startDateRaw = formData.get('tanggal_mulai') as string;

    // Validasi
    if (amount <= 0) { alert('Jumlah pinjaman harus lebih dari 0'); return; }
    if (rate < 0) { alert('Bunga tidak boleh negatif'); return; }
    if (!startDateRaw) { alert('Tentukan tanggal mulai'); return; }

    const startDate = new Date(startDateRaw);
    const totalBunga = amount * (rate / 100);
    const totalTagihan = amount + totalBunga;
    const cicilanPerBulan = Math.round(totalTagihan / tenor);

    const jadwal = [];
    for (let i = 1; i <= tenor; i++) {
      const dueDate = new Date(startDate);
      dueDate.setMonth(dueDate.getMonth() + i);
      jadwal.push({
        angsuran_ke: i,
        tanggal: dueDate,
        nominal: cicilanPerBulan
      });
    }

    setSimulationResult({
      jumlah_pinjaman: amount,
      tenor: tenor,
      bunga: rate,
      total_bunga: totalBunga,
      total_tagihan: totalTagihan,
      cicilan_per_bulan: cicilanPerBulan,
      jadwal
    });
  };

  const handleTambahPinjaman = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const form = e.currentTarget;
    const formData = new FormData(form);
    
    const memberId = formData.get('id_anggota_pjm') as string;
    const amount = Number(formData.get('jumlah_pinjaman'));
    const tenor = Number(formData.get('tenor'));
    const rate = Number(formData.get('bunga'));
    const startDate = new Date(formData.get('tanggal_mulai') as string);
    const member = anggota.find(a => a.id_anggota === memberId);

    if (!member) {
      alert('Pilih anggota yang valid');
      return;
    }

    try {
      const pjmId = await generateIdPinjaman();
      const totalBunga = Math.round(amount * (rate / 100));
      const totalTagihan = amount + totalBunga;
      const cicilanPerBulan = Math.round(totalTagihan / tenor);

      const loanData: Pinjaman = {
        id_pinjaman: pjmId,
        id_anggota: memberId,
        nama_anggota: member.nama,
        jumlah_pinjaman: amount,
        tenor: tenor,
        bunga: rate,
        total_bunga: totalBunga,
        total_tagihan: totalTagihan,
        cicilan_per_bulan: cicilanPerBulan,
        tanggal_mulai: startDate,
        status: 'AKTIF',
        created_at: new Date()
      };

      // 1. Simpan Pinjaman
      await setDoc(doc(db, 'pinjaman', pjmId), loanData);

      // 2. Transaksi Ledger (PINJAM)
      const trxId = await generateIdTransaksi();
      await setDoc(doc(db, 'transaksi', trxId), {
        id_transaksi: trxId,
        id_anggota: memberId,
        jenis: 'PINJAM',
        tipe: 'KELUAR',
        nominal: amount,
        tanggal: new Date(),
        keterangan: `Pinjaman Baru ${pjmId}`
      });

      // 3. Generate Cicilan
      for (let i = 1; i <= tenor; i++) {
        const dueDate = new Date(startDate);
        dueDate.setMonth(dueDate.getMonth() + i);
        const cicilanId = generateIdCicilan(pjmId, i);
        await setDoc(doc(db, 'cicilan', cicilanId), {
          id_cicilan: cicilanId,
          id_pinjaman: pjmId,
          angsuran_ke: i,
          tanggal_jatuh_tempo: dueDate,
          nominal: cicilanPerBulan,
          status: 'BELUM',
          tanggal_bayar: null
        });
      }

      alert(`Pinjaman ${pjmId} berhasil diproses & Cicilan digenerate.`);
      form.reset();
      setSimulationResult(null);
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, 'pinjaman');
    }
  };

  const handleBayarCicilan = async (cicilan: Cicilan) => {
    try {
      // 1. Update Cicilan
      await setDoc(doc(db, 'cicilan', cicilan.id_cicilan), {
        ...cicilan,
        status: 'SUDAH',
        tanggal_bayar: new Date()
      });

      // 2. Transaksi Ledger (CICIL)
      const loan = loans.find(l => l.id_pinjaman === cicilan.id_pinjaman);
      if (loan) {
        const trxId = await generateIdTransaksi();
        await setDoc(doc(db, 'transaksi', trxId), {
          id_transaksi: trxId,
          id_anggota: loan.id_anggota,
          jenis: 'CICIL',
          tipe: 'MASUK',
          nominal: cicilan.nominal,
          tanggal: new Date(),
          keterangan: `Angsuran ke-${cicilan.angsuran_ke} Pinjaman ${loan.id_pinjaman}`
        });

        // 3. Check if all paid
        const allCicilan = installments.filter(i => i.id_pinjaman === loan.id_pinjaman);
        const paidCount = allCicilan.filter(i => i.status === 'SUDAH').length + 1; // +1 for the current one
        if (paidCount === loan.tenor) {
          await setDoc(doc(db, 'pinjaman', loan.id_pinjaman), {
            ...loan,
            status: 'LUNAS'
          });
          alert('Selamat! Pinjaman telah LUNAS.');
        } else {
          alert(`Angsuran ke-${cicilan.angsuran_ke} berhasil dibayar.`);
        }
      }
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, 'cicilan');
    }
  };

  // ==========================================
  // DELETE HANDLERS
  // ==========================================
  const triggerHapusAnggota = (target: Anggota) => {
    setDeleteMemberModal({ isOpen: true, data: target, isDeleting: false });
  };

  const hapusAnggota = async (id: string) => {
    // Permission Verification
    if (!isAdmin) {
      alert('Akses Ditolak: Hanya Admin atau Super Admin yang dapat mengeksekusi penghapusan.');
      return;
    }

    try {
      setDeleteMemberModal(prev => ({ ...prev, isDeleting: true }));
      
      const batch = writeBatch(db);
      const memberDocRef = doc(db, 'anggota', id);

      // Perform Soft Delete update according to spec
      batch.update(memberDocRef, { 
        isDeleted: true,
        deletedAt: serverTimestamp(),
        deletedBy: user?.uid || 'unknown',
        status: "DELETED"
      });

      // Also cascade soft delete to related data node
      // Note: We follow the instruction to NOT hard delete
      
      const trxToHide = transaksi.filter(t => t.id_anggota === id);
      trxToHide.forEach(t => {
        batch.update(doc(db, 'transaksi', t.id_transaksi), {
          isDeleted: true,
          deletedAt: serverTimestamp(),
          status: 'ARCHIVED'
        });
      });

      const loansToHide = loans.filter(l => l.id_anggota === id);
      loansToHide.forEach(l => {
        batch.update(doc(db, 'pinjaman', l.id_pinjaman), {
          isDeleted: true,
          deletedAt: serverTimestamp(),
          status: 'DELETED'
        });
      });

      await batch.commit();

      if (user) {
        await logAudit({
          action: 'DELETE_MEMBER_SOFT',
          module: 'PENGURUSAN',
          description: `Soft delete anggota ID: ${id}. Seluruh data terkait diarsipkan.`,
          userId: user.uid,
          userName: user.displayName || user.email || 'Admin',
          targetId: id,
          severity: 'CRITICAL'
        });
      }

      alert('Berhasil: Data anggota telah dipindahkan ke registry arsip (Soft Delete).');
      setDeleteMemberModal({ isOpen: false, data: null, isDeleting: false });
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, 'anggota');
    } finally {
      setDeleteMemberModal(prev => ({ ...prev, isDeleting: false }));
    }
  };

  const hapusTransaksi = async (id: string) => {
    if (!confirm('Hapus transaksi ini dari ledger?')) return;
    try {
      await updateDoc(doc(db, 'transaksi', id), { 
        deleted: true, 
        deletedAt: serverTimestamp() 
      });
      if (user) {
        await logAudit({
          action: 'DELETE_TRANSACTION',
          module: 'SIMPANAN',
          description: `Menonaktifkan transaksi ledger ID: ${id}`,
          userId: user.uid,
          userName: user.displayName || user.email || 'Admin',
          targetId: id,
          severity: 'WARNING'
        });
      }
      alert('Entry ledger dinonaktifkan.');
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, 'transaksi');
    }
  };

  const hapusPinjaman = async (id: string) => {
    if (!confirm('Yakin hapus pinjaman ini? Semua record cicilan terkait juga akan dihapus.')) return;
    try {
      const batch = writeBatch(db);
      
      // Hapus Pinjaman
      batch.delete(doc(db, 'pinjaman', id));
      
      // Hapus Cicilan Terkait
      const relatedCicilan = installments.filter(i => i.id_pinjaman === id);
      relatedCicilan.forEach(c => {
        batch.delete(doc(db, 'cicilan', c.id_cicilan));
      });

      await batch.commit();
      alert('Data pinjaman & cicilan berhasil di-wipe.');
      if (selectedLoanId === id) setSelectedLoanId(null);
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, 'pinjaman');
    }
  };

  // ==========================================
  // UPDATE HANDLERS
  // ==========================================
  const handleUpdateItem = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!editingItem) return;

    const formData = new FormData(e.currentTarget);
    const id = editingItem.data.id_anggota || editingItem.data.id_transaksi || editingItem.data.id_pinjaman || editingItem.data.id_dana || editingItem.data.id_cicilan;
    const collectionName = editingItem.type === 'dpk' ? 'dana_pihak_ketiga' : editingItem.type;

    try {
      const updatedData: any = { ...editingItem.data };
      formData.forEach((value, key) => {
        if (key === 'nominal' || key === 'jumlah_pinjaman' || key === 'tenor' || key === 'bunga') {
          updatedData[key] = Number(value);
        } else {
          updatedData[key] = value;
        }
      });

      // Recalculate if it's a loan update
      if (editingItem.type === 'pinjaman') {
        const amount = Number(formData.get('jumlah_pinjaman'));
        const rate = Number(formData.get('bunga'));
        const tenor = Number(formData.get('tenor'));
        
        updatedData.total_bunga = Math.round(amount * (rate / 100));
        updatedData.total_tagihan = amount + updatedData.total_bunga;
        updatedData.cicilan_per_bulan = Math.round(updatedData.total_tagihan / tenor);
        
        alert('Peringatan: Mengubah parameter pinjaman tidak otomatis mengubah cicilan yang sudah ada. Disarankan hapus dan buat ulang jika tenor berubah.');
      }

      await setDoc(doc(db, collectionName, id), updatedData, { merge: true });
      alert('Data berhasil diperbarui.');
      setEditingItem(null);
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, collectionName);
    }
  };

  // ==========================================
  // POS HANDLERS
  // ==========================================
  const handleAddToCart = (product: Produk) => {
    if (product.stok <= 0) {
      alert('Stok habis!');
      return;
    }
    setCart(prev => {
      const existing = prev.find(item => item.product.id_produk === product.id_produk);
      if (existing) {
        return prev.map(item => 
          item.product.id_produk === product.id_produk 
            ? { ...item, qty: item.qty + 1 } 
            : item
        );
      }
      return [...prev, { product, qty: 1 }];
    });
  };

  const handleUpdateCartQty = (id: string, delta: number) => {
    setCart(prev => prev.map(item => {
      if (item.product.id_produk === id) {
        const newQty = item.qty + delta;
        if (newQty <= 0) return item;
        if (newQty > item.product.stok) {
          alert('Stok tidak mencukupi!');
          return item;
        }
        return { ...item, qty: newQty };
      }
      return item;
    }));
  };

  const handleRemoveFromCart = (id: string) => {
    setCart(prev => prev.filter(item => item.product.id_produk !== id));
  };

  const handleCheckout = async () => {
    if (cart.length === 0) return;
    
    try {
      const idPenjualan = await generateIdPenjualan();
      const totalBayar = cart.reduce((acc, curr) => acc + (curr.qty * curr.product.harga_jual), 0);
      const totalModalPerTransaksi = cart.reduce((acc, curr) => acc + (curr.qty * curr.product.harga_modal), 0);
      
      const saleData: Penjualan = {
        id_penjualan: idPenjualan,
        id_anggota: selectedCustomer || undefined,
        items: cart.map(item => ({
          id_produk: item.product.id_produk,
          nama_produk: item.product.nama_produk,
          qty: item.qty,
          harga: item.product.harga_jual,
          subtotal: item.qty * item.product.harga_jual
        })),
        total_bayar: totalBayar,
        total_modal: totalModalPerTransaksi,
        keuntungan: totalBayar - totalModalPerTransaksi,
        metode_bayar: checkoutType,
        status_bayar: checkoutType === 'TUNAI' ? 'LUNAS' : 'BELUM_LUNAS',
        tanggal: new Date()
      };

      const batch = writeBatch(db);
      
      // 1. Simpan Penjualan
      batch.set(doc(db, 'penjualan', idPenjualan), saleData);
      
      // 2. Update Stok
      cart.forEach(item => {
        const productRef = doc(db, 'produk', item.product.id_produk);
        batch.update(productRef, {
          stok: item.product.stok - item.qty
        });
      });

      await batch.commit();
      
      // Audit Log
      if (user) {
        await logAudit({
          action: 'CREATE_SALE',
          module: 'POS',
          description: `Transaksi penjualan sebesar Rp ${totalBayar.toLocaleString('id-ID')} (${cart.length} item)`,
          userId: user.uid,
          userName: user.displayName || user.email || 'Admin',
          targetId: idPenjualan,
          severity: 'INFO'
        });
      }

      alert(`Transaksi ${idPenjualan} berhasil [${checkoutType}]! Total: Rp ${totalBayar.toLocaleString('id-ID')}`);
      setCart([]);
      setSelectedCustomer('');
      setCheckoutType('TUNAI');
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, 'penjualan');
    }
  };

  const handleTambahProduk = async (data: any) => {
    setIsSubmitting(true);
    try {
      const id = await generateIdProduk();
      const finalData: Produk = {
        ...data,
        id_produk: id,
        nama_produk: data.nama_produk,
        harga_jual: Number(data.harga_jual),
        harga_modal: Number(data.harga_modal),
        stok: Number(data.stok),
        jumlah_barang: Number(data.jumlah_barang),
        satuan: data.satuan || 'Pcs',
        kategori: data.kategori || '',
        supplier: data.id_supplier || '',
        keterangan: data.keterangan || '',
        tanggal_input: new Date(),
        tanggal_pembelian: data.tanggal_pembelian ? new Date(data.tanggal_pembelian) : new Date()
      };

      const batch = writeBatch(db);
      
      // Save product
      batch.set(doc(db, 'products', id), finalData);
      
      // Save purchase transaction
      const purchaseId = 'PUR-' + Date.now();
      batch.set(doc(db, 'purchase_transactions', purchaseId), {
        id_transaksi: purchaseId,
        id_produk: id,
        nama_produk: data.nama_produk,
        id_supplier: data.id_supplier || '',
        qty: Number(data.jumlah_barang),
        harga_modal: Number(data.harga_modal),
        total_modal: Number(data.total_modal_transaksi),
        tanggal: data.tanggal_pembelian ? new Date(data.tanggal_pembelian) : new Date()
      });

      await batch.commit();
      
      // Audit Log
      if (user) {
        await logAudit({
          action: 'CREATE_PRODUCT',
          module: 'GUDANG',
          description: `Inisialisasi produk baru: ${data.nama_produk} dengan stok awal ${data.stok}`,
          userId: user.uid,
          userName: user.displayName || user.email || 'Admin',
          targetId: id,
          severity: 'INFO'
        });
      }

      alert(`Product ${id} initialized and purchase logged successfully.`);
      setEditingItem(null);
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, 'products');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleUpdateProduk = async (data: any) => {
    setIsSubmitting(true);
    if (!editingItem) return;
    try {
      const id = editingItem.data.id_produk;
      const finalData: any = {
        ...data,
        harga_jual: Number(data.harga_jual),
        harga_modal: Number(data.harga_modal),
        stok: Number(data.stok),
        jumlah_barang: Number(data.jumlah_barang),
        tanggal_pembelian: data.tanggal_pembelian ? new Date(data.tanggal_pembelian) : new Date(),
        supplier: data.id_supplier || ''
      };

      await setDoc(doc(db, 'products', id), finalData, { merge: true });
      alert(`Product metadata for ${id} synchronized.`);
      setEditingItem(null);
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, 'products');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleTambahSupplier = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const form = e.currentTarget;
    const formData = new FormData(form);
    try {
      const id = 'SUP-' + Math.random().toString(36).substr(2, 5).toUpperCase();
      const data: Supplier = {
        id_supplier: id,
        nama_supplier: formData.get('nama_supplier') as string,
        kontak: formData.get('kontak') as string
      };
      await setDoc(doc(db, 'suppliers', id), data);
      alert('Supplier node added to registry');
      form.reset();
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, 'suppliers');
    }
  };

  const handleTambahKategoriFromForm = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const nama = formData.get('nama_kategori') as string;
    if (!nama) return;
    
    try {
      const id = 'CAT-' + Math.random().toString(36).substr(2, 5).toUpperCase();
      const data: Kategori = {
        id_kategori: id,
        nama_kategori: nama,
        // @ts-ignore
        createdAt: serverTimestamp()
      };
      await setDoc(doc(db, 'product_categories', id), data);
      e.currentTarget.reset();
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, 'product_categories');
    }
  };

  const handleTambahKategori = async (nama: string) => {
    try {
      const id = 'CAT-' + Math.random().toString(36).substr(2, 5).toUpperCase();
      const data: Kategori = {
        id_kategori: id,
        nama_kategori: nama,
        // @ts-ignore - explicitly handle potential missing fields in local state vs cloud
        createdAt: serverTimestamp()
      };
      await setDoc(doc(db, 'product_categories', id), data);
      setShowCatModal(false);
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, 'product_categories');
    }
  };

  const handleTambahPembelian = async (items: any[], supplierId: string) => {
    if (items.length === 0) return;
    try {
      const idPembelian = 'BEL-' + Date.now();
      const totalModal = items.reduce((acc, curr) => acc + (curr.qty * curr.harga_modal), 0);
      
      const purchaseData: Pembelian = {
        id_pembelian: idPembelian,
        tanggal_belanja: new Date(),
        id_supplier: supplierId,
        items: items,
        total_modal: totalModal
      };

      const batch = writeBatch(db);
      batch.set(doc(db, 'pembelian', idPembelian), purchaseData);
      
      items.forEach(item => {
        const productRef = doc(db, 'produk', item.id_produk);
        const p = products.find(prod => prod.id_produk === item.id_produk);
        if (p) {
          batch.update(productRef, {
            stok: p.stok + item.qty,
            harga_modal: item.harga_modal
          });
        }
      });

      await batch.commit();
      alert(`Pembelian Barang Berhasil! Stok updated.`);
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, 'pembelian');
    }
  };

  if (!user) {
    return (
      <div className="min-h-screen bg-[#020617] flex items-center justify-center p-6 relative overflow-hidden font-sans">
        <div className="absolute top-[-100px] left-[-100px] w-[400px] h-[400px] bg-cyan-500/10 rounded-full blur-[120px]"></div>
        <div className="absolute bottom-[-100px] right-[-100px] w-[400px] h-[400px] bg-purple-600/10 rounded-full blur-[120px]"></div>
        
        <motion.div 
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="max-w-md w-full glass p-10 rounded-3xl glow-cyan text-center relative z-10"
        >
          <Database className="mx-auto text-cyan-400 mb-6 drop-shadow-[0_0_15px_rgba(34,211,238,0.8)]" size={64} />
          <h1 className="text-3xl font-bold text-white mb-2 tracking-tighter uppercase">Smart Systema</h1>
          <p className="text-xs font-mono text-cyan-400/70 tracking-widest uppercase mb-8">Koperasi Dashboard v2.0</p>
          <button 
            onClick={signInWithGoogle}
            className="w-full h-12 bg-gradient-to-r from-cyan-600 to-purple-600 rounded-lg text-white text-xs font-bold tracking-widest glow-purple hover:scale-105 transition-transform flex items-center justify-center gap-3"
          >
            CONNECT WITH GOOGLE NODE
          </button>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#020617] text-slate-200 font-sans selection:bg-cyan-500/30 flex overflow-hidden">
      <div className="absolute top-[-100px] left-[-100px] w-[400px] h-[400px] bg-cyan-500/10 rounded-full blur-[120px] pointer-events-none"></div>
      <div className="absolute bottom-[-100px] right-[-100px] w-[400px] h-[400px] bg-purple-600/10 rounded-full blur-[120px] pointer-events-none"></div>

      {/* SIDEBAR */}
      <aside className="w-64 glass border-r border-cyan-500/20 p-6 flex flex-col gap-8 relative z-20 h-screen">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-cyan-400 to-purple-600 flex items-center justify-center glow-cyan shrink-0">
            <Database className="text-white" size={24} />
          </div>
          <div>
            <h1 className="font-bold text-sm tracking-tighter text-white uppercase leading-none">Smart Systema</h1>
            <p className="text-[10px] text-cyan-400/70 font-mono tracking-widest uppercase mt-1">Koperasi Dashboard</p>
          </div>
        </div>

          <nav className="flex flex-col gap-2 flex-grow overflow-y-auto pr-2 custom-scrollbar">
            {/* SECTION KOPERASI */}
            <div className="mb-4">
              <p className="px-4 text-[10px] font-mono text-cyan-400/50 uppercase tracking-[0.2em] mb-2 border-b border-white/5 pb-1">Koperasi Hub</p>
              <SidebarButton label="Dashboard" active={activeMenu === 'dashboard'} onClick={() => setActiveMenu('dashboard')} />
              <SidebarButton label="Data Anggota" active={activeMenu === 'anggota_list'} onClick={() => setActiveMenu('anggota_list')} />
              <SidebarButton label="Pinjaman Hub" active={activeMenu === 'pinjaman'} onClick={() => setActiveMenu('pinjaman')} />
              <SidebarButton label="Laporan Koperasi" active={activeMenu === 'laporan'} onClick={() => setActiveMenu('laporan')} />
              <SidebarButton label="Profil Koperasi" active={activeMenu === 'profil_koperasi'} onClick={() => setActiveMenu('profil_koperasi')} />
              <SidebarButton label="Setting System" active={activeMenu === 'settings'} onClick={() => setActiveMenu('settings')} />
            </div>

            {/* SECTION SIMPANAN */}
            <div className="mb-4">
              <p className="px-4 text-[10px] font-mono text-purple-400/50 uppercase tracking-[0.2em] mb-2 border-b border-white/5 pb-1">Simpanan Ops</p>
              <SidebarButton label="Rekap Simpanan" active={activeMenu === 'rekap_simpanan'} onClick={() => setActiveMenu('rekap_simpanan')} />
            </div>
            
            {/* SECTION UNIT USAHA */}
            <div className="mb-4">
              <p className="px-4 text-[10px] font-mono text-emerald-400/50 uppercase tracking-[0.2em] mb-2 border-b border-white/5 pb-1">Unit Usaha POS</p>
              <SidebarButton label="POS Warung" active={activeMenu === 'pos'} onClick={() => setActiveMenu('pos')} />
              <SidebarButton label="Manajemen Produk" active={activeMenu === 'produk'} onClick={() => setActiveMenu('produk')} />
              <SidebarButton label="Master Supplier" active={activeMenu === 'supplier'} onClick={() => setActiveMenu('supplier')} />
              <SidebarButton label="Master Kategori" active={activeMenu === 'kategori'} onClick={() => setActiveMenu('kategori')} />
              <SidebarButton label="Restock / Pembelian" active={activeMenu === 'pembelian'} onClick={() => setActiveMenu('pembelian')} />
              <SidebarButton label="Kasbon Anggota" active={activeMenu === 'kasbon'} onClick={() => setActiveMenu('kasbon')} />
              <SidebarButton label="Laporan Usaha" active={activeMenu === 'laporan_usaha'} onClick={() => setActiveMenu('laporan_usaha')} />
              <div className="mt-2 pt-2 border-t border-white/5">
                <SidebarButton label="✨ Unit Jasa Hub" active={activeMenu === 'unit_jasa'} onClick={() => setActiveMenu('unit_jasa')} />
              </div>
            </div>

            {/* ADVANCED ADMIN OPS (Optional/Backoffice) */}
            <div className="mt-2 px-4 border-t border-white/5 pt-4 opacity-40 hover:opacity-100 transition-opacity">
              <p className="text-[8px] font-mono text-slate-500 uppercase tracking-[0.2em] mb-2 group-hover:text-cyan-400 transition-colors">Admin Entry</p>
              <div className="space-y-1">
                <button onClick={() => setActiveMenu('pendaftaran')} className={`w-full text-left px-2 py-1.5 text-[10px] rounded-lg transition-colors ${activeMenu === 'pendaftaran' ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/30' : 'text-slate-400 hover:text-white hover:bg-white/5'}`}>Quick Register</button>
                <button onClick={() => setActiveMenu('transaksi')} className={`w-full text-left px-2 py-1.5 text-[10px] rounded-lg transition-colors ${activeMenu === 'transaksi' ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/30' : 'text-slate-400 hover:text-white hover:bg-white/5'}`}>Ledger Post</button>
                <button onClick={() => setActiveMenu('dpk')} className={`w-full text-left px-2 py-1.5 text-[10px] rounded-lg transition-colors ${activeMenu === 'dpk' ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/30' : 'text-slate-400 hover:text-white hover:bg-white/5'}`}>Dana Cap-Ex</button>
              </div>

              {/* SYSTEM MAINTENANCE moved here */}
              {isAdmin && (
                <div className="mt-4 pt-4 border-t border-white/5">
                  <p className="text-[8px] font-mono text-red-400/50 uppercase tracking-[0.2em] mb-2">Maintenance Hub</p>
                  <div className="space-y-1">
                    <SidebarButton label="Backup Data" active={activeMenu === 'backup_data'} onClick={() => setActiveMenu('backup_data')} />
                    <SidebarButton label="Reset Data Flux" active={activeMenu === 'reset_data'} onClick={() => setActiveMenu('reset_data')} />
                    <SidebarButton label="Audit Trail" active={activeMenu === 'audit_log'} onClick={() => setActiveMenu('audit_log')} />
                  </div>
                </div>
              )}
            </div>
          </nav>

        <div className="mt-auto flex flex-col gap-4">
          <div className="p-3 glass rounded-xl border-cyan-900/30">
            <div className="flex items-center gap-3 mb-2">
              <img src={user.photoURL || ''} alt={user.displayName || ''} className="w-8 h-8 rounded-full border border-cyan-500/30" />
              <div className="overflow-hidden">
                <p className="text-[10px] font-bold text-white truncate">{user.displayName}</p>
                <p className="text-[10px] text-slate-500 truncate font-mono">{user.email}</p>
              </div>
            </div>
          </div>
          <button 
            onClick={logout}
            className="flex items-center justify-center gap-2 w-full py-2.5 glass hover:bg-red-950/20 text-red-400 rounded-xl transition-all text-[10px] font-bold tracking-widest uppercase"
          >
            DISCONNECT
          </button>
        </div>
      </aside>

      {/* MAIN CONTENT AREA */}
      <main className="flex-1 min-w-0 p-8 relative z-10 flex flex-col gap-8 overflow-y-auto">
        
        <header className="flex justify-between items-end relative z-20 pb-4 border-b border-white/5">
          <div className="space-y-1">
            <motion.h2 
              key={activeMenu}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              className="text-2xl font-bold tracking-tight text-white uppercase"
            >
              {activeMenu === 'dashboard' ? '📊 Dashboard Overview' : 
               activeMenu === 'anggota_list' ? '👤 Data Anggota Registry' :
               activeMenu === 'pinjaman' ? '💳 Kredit & Pinjaman' :
               activeMenu === 'pos' ? '🛒 POS Warung Koperasi' :
               activeMenu === 'produk' ? '📦 Manajemen Inventori' :
               activeMenu === 'supplier' ? '🚚 Master Supplier Node' :
               activeMenu === 'kategori' ? '🏷️ Klasifikasi Produk' :
               activeMenu === 'pembelian' ? '📥 Restock / Pembelian' :
               activeMenu === 'kasbon' ? '💳 Kredit Kasbon Anggota' :
               activeMenu === 'laporan_usaha' ? '📈 Analytics Unit Usaha' :
               activeMenu === 'unit_jasa' ? '💎 Unit Jasa Hub' :
               activeMenu === 'rekap_simpanan' ? '📊 Rekapitulasi Simpanan Matrix' :
               activeMenu === 'profil_koperasi' ? '🏛️ Identity Profil Koperasi' :
               activeMenu === 'settings' ? '⚙️ Parameter System' :
               activeMenu === 'backup_data' ? '💾 Backup Data Repository' :
               activeMenu === 'reset_data' ? '⚠️ Emergency Data Reset' :
               activeMenu === 'audit_log' ? '📜 System Audit Trail' :
               activeMenu.replace('_', ' ')}
            </motion.h2>
            <p className="text-[10px] font-mono text-slate-500 uppercase tracking-widest leading-none">
              Node Hub: <span className="text-emerald-400">Operational</span> • Secure Cluster Access
            </p>
          </div>
          <div className="flex flex-col items-end">
            <span className="text-[10px] text-slate-500 uppercase font-mono tracking-widest mb-1 italic">Network Ledger Time</span>
            <span className="text-sm font-mono text-cyan-400 border-b border-cyan-400/30 pb-0.5">{currentTime}</span>
          </div>
        </header>

        <AnimatePresence mode="wait">
          <motion.div 
            key={activeMenu}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="relative z-10 flex-1 flex flex-col gap-6"
          >
            {activeMenu === 'dashboard' && (
              <div className="space-y-8 flex-1 flex flex-col">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 min-w-0">
                  <StatCard 
                    title="Simpanan Pokok" 
                    value={`Rp ${stats.totalPokok.toLocaleString('id-ID')}`} 
                    metric="Core Deposit" 
                    glow 
                    color="cyan" 
                    icon={<ShieldCheck size={16} />}
                  />
                  <StatCard 
                    title="Simpanan Wajib" 
                    value={`Rp ${stats.totalWajib.toLocaleString('id-ID')}`} 
                    metric="Mandatory Saving" 
                    color="emerald" 
                    icon={<Activity size={16} />}
                  />
                  <StatCard 
                    title="Simpanan Sukarela" 
                    value={`Rp ${stats.totalSukarela.toLocaleString('id-ID')}`} 
                    metric="Voluntary Saving" 
                    color="purple" 
                    icon={<TrendingUp size={16} />}
                  />
                  <StatCard 
                    title="Tabungan Anggota" 
                    value={`Rp ${stats.totalTabungan.toLocaleString('id-ID')}`} 
                    metric="Liquid Deposits" 
                    color="cyan" 
                    icon={<Wallet size={16} />}
                  />
                  <StatCard 
                    title="Pinjaman (OUT)" 
                    value={`Rp ${stats.sisaPinjaman.toLocaleString('id-ID')}`} 
                    metric="Active Credit" 
                    color="purple" 
                    icon={<CreditCard size={16} />}
                  />
                  <StatCard 
                    title="Dana Pihak Ketiga" 
                    value={`Rp ${stats.totalDPK.toLocaleString('id-ID')}`} 
                    metric="External Funding Pool" 
                    color="emerald" 
                    icon={<Briefcase size={16} />}
                  />
                  <StatCard 
                    title="Total Aset Matrix" 
                    value={`Rp ${stats.totalAsetKoperasi.toLocaleString('id-ID')}`} 
                    metric="Global Registry" 
                    color="cyan" 
                    glow
                    icon={<Database size={16} />}
                  />
                </div>

                 <div className="grid grid-cols-1 gap-4 min-w-0">
                  <GlassCard title="Grafik Trend Arus Kas (7 Hari Terakhir)" className="min-w-0">
                    <SafeChartContainer 
                      loading={isLoading} 
                      data={lineChartData} 
                      height={320}
                      title="Trend Arus Kas"
                    >
                      <ResponsiveContainer width="100%" height="100%">
                        <LineChart data={lineChartData}>
                          <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
                          <XAxis 
                            dataKey="tanggal" 
                            stroke="#64748b" 
                            fontSize={10} 
                            tickLine={false} 
                            axisLine={false}
                            dy={10}
                          />
                          <YAxis 
                            stroke="#64748b" 
                            fontSize={10} 
                            tickLine={false} 
                            axisLine={false}
                            tickFormatter={(value: number) => `Rp ${(value / 1000).toLocaleString('id-ID')}k`}
                          />
                          <Tooltip 
                            contentStyle={{ backgroundColor: '#0f172a', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '12px', fontSize: '10px' }}
                            itemStyle={{ fontSize: '10px' }}
                            formatter={(value: number) => `Rp ${value.toLocaleString('id-ID')}`}
                          />
                          <Legend wrapperStyle={{ fontSize: '10px', paddingTop: '20px' }} />
                          <Line 
                            type="monotone" 
                            dataKey="simpan" 
                            name="Setoran (Masuk)" 
                            stroke="#22d3ee" 
                            strokeWidth={3} 
                            dot={{ r: 4, fill: '#22d3ee', strokeWidth: 2 }}
                            activeDot={{ r: 6, stroke: '#fff', strokeWidth: 2 }}
                          />
                          <Line 
                            type="monotone" 
                            dataKey="pinjam" 
                            name="Pinjaman (Keluar)" 
                            stroke="#f87171" 
                            strokeWidth={3} 
                            dot={{ r: 4, fill: '#f87171', strokeWidth: 2 }}
                            activeDot={{ r: 6, stroke: '#fff', strokeWidth: 2 }}
                          />
                        </LineChart>
                      </ResponsiveContainer>
                    </SafeChartContainer>
                  </GlassCard>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 min-w-0">
                  <GlassCard title="Transaksi Terbaru" className="min-w-0">
                    <div className="space-y-3">
                      {transaksi?.slice(-5).reverse().map((t, i) => (
                        <div key={i} className="flex items-center justify-between p-4 glass border-white/5 rounded-2xl">
                          <div className="flex items-center gap-3">
                            <div className={`w-8 h-8 rounded-full border flex items-center justify-center ${
                              t.tipe === 'MASUK' ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400' :
                              'bg-red-500/10 border-red-500/30 text-red-400'
                            }`}>
                              {t.tipe === 'MASUK' ? <ArrowDownRight size={14} /> : <ArrowUpRight size={14} />}
                            </div>
                            <div>
                              <p className="text-xs font-semibold text-white uppercase">{t.jenis} - {t.id_anggota}</p>
                              <p className="text-[10px] font-mono text-slate-500 italic">TX: {t.id_transaksi}</p>
                            </div>
                          </div>
                          <span className={`${t.tipe === 'MASUK' ? 'text-white' : 'text-slate-400'} text-xs font-mono font-bold`}>
                            {t.tipe === 'KELUAR' ? '-' : ''}Rp {t.nominal.toLocaleString('id-ID')}
                          </span>
                        </div>
                      ))}
                      {transaksi.length === 0 && <p className="text-center text-slate-600 text-xs py-10">Belum ada transaksi di ledger.</p>}
                    </div>
                  </GlassCard>

                  <GlassCard title="Recent Technical Audit" className="min-w-0">
                    <RecentAuditLogs />
                  </GlassCard>
                </div>
              </div>
            )}

            {activeMenu === 'pendaftaran' && (
              <GlassCard title="Pendaftaran Node Anggota Baru" className="min-w-0">
                <div className="space-y-4">
                  <FormAnggota onSubmit={handleTambahAnggota} />
                  <div className="p-4 bg-cyan-500/5 border border-cyan-500/20 rounded-xl">
                    <p className="text-[10px] text-cyan-400 uppercase font-mono tracking-widest text-center">
                      NOTE: Pendaftaran akan otomatis membuat Transaksi Simpanan Pokok Rp {(config.simpanan_pokok || 50000).toLocaleString('id-ID')}
                    </p>
                  </div>
                </div>
              </GlassCard>
            )}

            {activeMenu === 'transaksi' && (
              <GlassCard title="Ledger Entry Transaksi" className="min-w-0">
                <FormTransaksi onSubmit={handleTambahTransaksi} anggota={anggota} />
              </GlassCard>
            )}

            {activeMenu === 'dpk' && (
              <div className="space-y-8 flex-1 flex flex-col">
                <GlassCard title="Input Dana Pihak Ketiga" className="min-w-0">
                  <FormDPK onSubmit={handleTambahDPK} />
                </GlassCard>

                <GlassCard title="Registry Dana Pihak Ketiga" className="min-w-0">
                  <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                      <thead>
                        <tr className="border-b border-white/10">
                          <th className="py-4 px-4 text-[10px] font-mono text-cyan-400 uppercase tracking-widest font-bold">Tanggal</th>
                          <th className="py-4 px-4 text-[10px] font-mono text-cyan-400 uppercase tracking-widest font-bold">Sumber / Entitas</th>
                          <th className="py-4 px-4 text-[10px] font-mono text-cyan-400 uppercase tracking-widest font-bold">Kategori</th>
                          <th className="py-4 px-4 text-[10px] font-mono text-cyan-400 uppercase tracking-widest font-bold">Kontributor</th>
                          <th className="py-4 px-4 text-[10px] font-mono text-cyan-400 uppercase tracking-widest font-bold">Nominal</th>
                          <th className="py-4 px-4 text-[10px] font-mono text-cyan-400 uppercase tracking-widest font-bold text-center">Status</th>
                        </tr>
                      </thead>
                      <tbody>
                        {/* New Collection Data */}
                        {thirdPartyFunds?.map((d, i) => (
                          <tr key={i} className="border-b border-white/5 hover:bg-white/5 transition-colors group">
                            <td className="py-4 px-4 text-xs font-mono text-slate-500">
                              {d.createdAt?.toDate?.() ? d.createdAt.toDate().toLocaleDateString('id-ID') : new Date(d.createdAt).toLocaleDateString('id-ID')}
                            </td>
                            <td className="py-4 px-4 text-xs text-white font-bold">{d.sourceName}</td>
                            <td className="py-4 px-4">
                              <span className="px-2 py-1 bg-cyan-500/10 border border-cyan-500/30 text-cyan-400 text-[8px] font-bold uppercase rounded">
                                {d.fundType}
                              </span>
                            </td>
                            <td className="py-4 px-4 text-xs text-slate-400">{d.contributorName}</td>
                            <td className="py-4 px-4 text-xs font-mono text-emerald-400 font-bold">Rp {d.amount.toLocaleString('id-ID')}</td>
                            <td className="py-4 px-4 text-center">
                               <span className={`px-2 py-1 rounded-[4px] text-[8px] font-black uppercase ${d.status === 'ACTIVE' ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30' : 'bg-slate-500/10 text-slate-400 border border-white/10'}`}>
                                {d.status}
                               </span>
                            </td>
                          </tr>
                        ))}
                        {/* Legacy Data */}
                        {dpkList?.map((d, i) => (
                          <tr key={'legacy-'+i} className="border-b border-white/5 hover:bg-white/5 transition-colors group opacity-70 italic">
                            <td className="py-4 px-4 text-xs font-mono text-slate-500">
                              {d.tanggal?.toDate?.() ? d.tanggal.toDate().toLocaleDateString('id-ID') : new Date(d.tanggal).toLocaleDateString('id-ID')}
                            </td>
                            <td className="py-4 px-4 text-xs text-slate-400 underline decoration-white/10">{d.sumber} (Legacy)</td>
                            <td className="py-4 px-4">
                              <span className="px-2 py-1 bg-slate-500/10 border border-white/10 text-slate-400 text-[8px] font-bold uppercase rounded">
                                {d.jenis}
                              </span>
                            </td>
                            <td className="py-4 px-4 text-xs text-slate-600">-</td>
                            <td className="py-4 px-4 text-xs font-mono text-slate-400">Rp {d.nominal.toLocaleString('id-ID')}</td>
                            <td className="py-4 px-4 text-center">
                               <span className="px-2 py-1 rounded-[4px] text-[8px] font-black uppercase bg-slate-500/10 text-slate-400 border border-white/10">
                                ACTIVE
                               </span>
                            </td>
                          </tr>
                        ))}
                        {dpkList.length === 0 && thirdPartyFunds.length === 0 && (
                          <tr>
                            <td colSpan={6} className="py-20 text-center text-slate-600 text-xs font-mono uppercase tracking-widest leading-relaxed">
                              No external resources registry entries detected.<br/>
                              <span className="text-[10px] opacity-50">Awaiting secure capital injection...</span>
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </GlassCard>
              </div>
            )}

            {activeMenu === 'pinjaman' && (
              <div className="space-y-8 flex-1 flex flex-col">
                <GlassCard title="Fasilitasi Pinjaman Anggota" className="min-w-0">
                  <FormPinjaman 
                    onSubmit={handleTambahPinjaman} 
                    anggota={anggota} 
                    handleSimulasi={handleSimulasi} 
                    simulationResult={simulationResult} 
                  />
                  {simulationResult && (
                    <motion.div 
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      className="grid grid-cols-1 lg:grid-cols-2 gap-8 border-t border-white/5 pt-8 mt-4"
                    >
                      <div className="space-y-4">
                        <p className="text-[10px] font-mono text-emerald-400 uppercase tracking-[0.2em] font-bold">Simulation Output</p>
                        <div className="grid grid-cols-2 gap-4">
                          <div className="p-4 glass rounded-2xl border-white/5">
                            <p className="text-[8px] text-slate-500 uppercase font-bold mb-1">Total Loan</p>
                            <p className="text-sm font-bold text-white">Rp {simulationResult.jumlah_pinjaman.toLocaleString('id-ID')}</p>
                          </div>
                          <div className="p-4 glass rounded-2xl border-white/5">
                            <p className="text-[8px] text-slate-500 uppercase font-bold mb-1">Total Interest ({simulationResult.bunga}%)</p>
                            <p className="text-sm font-bold text-cyan-400">Rp {simulationResult.total_bunga.toLocaleString('id-ID')}</p>
                          </div>
                          <div className="p-4 glass rounded-2xl border-white/5">
                            <p className="text-[8px] text-slate-500 uppercase font-bold mb-1">Total Liability</p>
                            <p className="text-sm font-bold text-white underline decoration-white/20">Rp {simulationResult.total_tagihan.toLocaleString('id-ID')}</p>
                          </div>
                          <div className="p-4 glass rounded-2xl border-white/5 bg-emerald-500/5">
                            <p className="text-[8px] text-emerald-500 uppercase font-bold mb-1">Installment / Month</p>
                            <p className="text-lg font-bold text-emerald-400">Rp {simulationResult.cicilan_per_bulan.toLocaleString('id-ID')}</p>
                          </div>
                        </div>
                      </div>

                      <div className="space-y-4">
                        <p className="text-[10px] font-mono text-slate-500 uppercase tracking-widest font-bold">Projection Matrix (Tenor: {simulationResult.tenor} Bln)</p>
                        <div className="bg-slate-950/30 rounded-2xl overflow-hidden border border-white/5">
                          <table className="w-full text-left">
                            <thead className="bg-white/5">
                              <tr>
                                <th className="p-3 text-[9px] font-mono text-slate-500 uppercase">Seq</th>
                                <th className="p-3 text-[9px] font-mono text-slate-500 uppercase">Due Date</th>
                                <th className="p-3 text-[9px] font-mono text-slate-500 uppercase text-right">Amount</th>
                              </tr>
                            </thead>
                            <tbody className="text-[10px]">
                              {simulationResult?.jadwal?.map((j: any, i: number) => (
                                <tr key={i} className="border-b border-white/5">
                                  <td className="p-3 font-mono text-cyan-400">#{j.angsuran_ke}</td>
                                  <td className="p-3 text-slate-300">{j.tanggal.toLocaleDateString('id-ID')}</td>
                                  <td className="p-3 text-right text-white font-bold">Rp {j.nominal.toLocaleString('id-ID')}</td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    </motion.div>
                  )}
                </GlassCard>

                <div className="grid grid-cols-1 xl:grid-cols-3 gap-8 min-w-0">
                  <div className="xl:col-span-2">
                    <GlassCard title="Master Ledger Pinjaman" className="min-w-0">
                       <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse">
                          <thead>
                            <tr className="border-b border-white/10">
                              <th className="py-4 px-4 text-[10px] font-mono text-cyan-400 uppercase font-bold">ID / Nama</th>
                              <th className="py-4 px-4 text-[10px] font-mono text-cyan-400 uppercase font-bold">Nominal</th>
                              <th className="py-4 px-4 text-[10px] font-mono text-cyan-400 uppercase font-bold">Cicilan</th>
                              <th className="py-4 px-4 text-[10px] font-mono text-cyan-400 uppercase font-bold">Status</th>
                              <th className="py-4 px-4 text-[10px] font-mono text-cyan-400 uppercase font-bold">Aksi</th>
                            </tr>
                          </thead>
                          <tbody>
                            {loans?.map((l, i) => {
                              const paid = installments.filter(ins => ins.id_pinjaman === l.id_pinjaman && ins.status === 'SUDAH').reduce((a, c) => a + c.nominal, 0);
                              const sisa = l.total_tagihan - paid;
                              return (
                                <tr key={i} className={`border-b border-white/5 hover:bg-white/5 transition-colors ${selectedLoanId === l.id_pinjaman ? 'bg-cyan-500/5' : ''}`}>
                                  <td className="py-4 px-4">
                                    <div className="text-xs font-bold text-white">{l.nama_anggota}</div>
                                    <div className="text-[9px] text-slate-500 font-mono">{l.id_pinjaman}</div>
                                  </td>
                                  <td className="py-4 px-4">
                                    <div className="text-xs text-white">Rp {l.jumlah_pinjaman.toLocaleString('id-ID')}</div>
                                    <div className="text-[9px] text-slate-500">Sisa: Rp {sisa.toLocaleString('id-ID')}</div>
                                  </td>
                                  <td className="py-3 px-4">
                                    <div className="text-xs text-cyan-400">Rp {l.cicilan_per_bulan.toLocaleString('id-ID')}</div>
                                    <div className="text-[9px] text-slate-600">/{l.tenor} Bln</div>
                                  </td>
                                  <td className="py-4 px-4">
                                    <span className={`px-2 py-0.5 rounded text-[8px] font-bold ${l.status === 'LUNAS' ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30' : 'bg-orange-500/10 text-orange-400 border border-orange-500/30'}`}>
                                      {l.status}
                                    </span>
                                  </td>
                                  <td className="py-4 px-4">
                                    <div className="flex items-center gap-2">
                                      <button 
                                        onClick={() => setSelectedLoanId(l.id_pinjaman)}
                                        className="p-2 bg-white/5 border border-white/10 rounded-lg hover:border-cyan-500/50 transition-all"
                                      >
                                        <Activity size={14} className="text-cyan-400" />
                                      </button>
                                      <button 
                                        onClick={() => setEditingItem({ type: 'pinjaman', data: l })}
                                        className="p-2 bg-white/5 border border-white/10 rounded-lg hover:border-cyan-500/50 transition-all"
                                      >
                                        <Edit2 size={14} className="text-slate-400" />
                                      </button>
                                      <button 
                                        onClick={() => hapusPinjaman(l.id_pinjaman)}
                                        className="p-2 bg-white/5 border border-red-500/10 rounded-lg hover:border-red-500/50 transition-all"
                                      >
                                        <Trash2 size={14} className="text-red-400" />
                                      </button>
                                    </div>
                                  </td>
                                </tr>
                              );
                            })}
                            {loans.length === 0 && (
                              <tr><td colSpan={5} className="py-20 text-center text-slate-600 text-xs font-mono">No active loans in network.</td></tr>
                            )}
                          </tbody>
                        </table>
                      </div>
                    </GlassCard>
                  </div>

                  <div>
                    <GlassCard title="Schedule & Payment" className="min-w-0">
                      {selectedLoanId ? (
                        <div className="space-y-4">
                          <p className="text-[10px] text-slate-400 uppercase font-mono tracking-widest">Installment Matrix: {selectedLoanId}</p>
                          <div className="space-y-2 h-[450px] overflow-y-auto pr-2">
                             {(installments || [])
                                .filter(ins => ins.id_pinjaman === selectedLoanId)
                                .sort((a, b) => a.angsuran_ke - b.angsuran_ke)
                                .map((ins, i) => (
                                  <div key={i} className={`p-4 glass border-white/5 rounded-2xl flex items-center justify-between ${ins.status === 'SUDAH' ? 'opacity-60' : ''}`}>
                                    <div className="flex flex-col gap-1">
                                      <div className="flex items-center gap-2">
                                        <span className="text-[10px] font-mono text-cyan-400 font-bold">#{ins.angsuran_ke}</span>
                                        <span className="text-xs text-white">Rp {ins.nominal.toLocaleString('id-ID')}</span>
                                      </div>
                                      <span className="text-[8px] text-slate-500 uppercase">Due: {ins.tanggal_jatuh_tempo?.toDate?.() ? ins.tanggal_jatuh_tempo.toDate().toLocaleDateString('id-ID') : new Date(ins.tanggal_jatuh_tempo).toLocaleDateString('id-ID')}</span>
                                    </div>
                                    
                                    {ins.status === 'BELUM' ? (
                                      <div className="flex items-center gap-2">
                                        <button 
                                          onClick={() => handleBayarCicilan(ins)}
                                          className="px-3 py-1.5 bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-[9px] font-bold uppercase rounded-lg hover:bg-emerald-500/20 transition-all"
                                        >
                                          Pay
                                        </button>
                                        <button 
                                          onClick={() => setEditingItem({ type: 'cicilan', data: ins })}
                                          className="p-2 bg-white/5 border border-white/10 rounded-lg text-slate-500 hover:text-cyan-400 transition-colors"
                                        >
                                          <Edit2 size={12} />
                                        </button>
                                      </div>
                                    ) : (
                                      <div className="flex items-center gap-2">
                                        <div className="w-8 h-8 rounded-full bg-emerald-500/10 flex items-center justify-center">
                                          <ShieldCheck size={14} className="text-emerald-400" />
                                        </div>
                                        <button 
                                          onClick={() => setEditingItem({ type: 'cicilan', data: ins })}
                                          className="p-2 bg-white/5 border border-white/10 rounded-lg text-slate-500 hover:text-cyan-400 transition-colors"
                                        >
                                          <Edit2 size={12} />
                                        </button>
                                      </div>
                                    )}
                                  </div>
                                ))}
                          </div>
                        </div>
                      ) : (
                        <div className="h-[450px] flex flex-col items-center justify-center text-center p-8 opacity-30">
                          <CreditCard size={48} className="mb-4 text-slate-500" />
                          <p className="text-xs font-mono uppercase tracking-widest">Select a loan to view payment matrix</p>
                        </div>
                      )}
                    </GlassCard>
                  </div>
                </div>
              </div>
            )}
            {activeMenu === 'pos' && (
              <div className="grid grid-cols-1 xl:grid-cols-3 gap-8 flex-1 min-w-0">
                <div className="xl:col-span-2 space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="glass p-4 rounded-2xl flex items-center gap-4">
                      <div className="w-10 h-10 rounded-xl bg-cyan-500/10 flex items-center justify-center text-cyan-400">
                        <ShoppingBag size={20} />
                      </div>
                      <div className="flex-1">
                        <p className="text-[10px] font-mono text-slate-500 uppercase">Product Catalog</p>
                        <input 
                          type="text" 
                          placeholder="Search items..." 
                          value={searchProduct}
                          onChange={(e) => setSearchProduct(e.target.value)}
                          className="w-full bg-transparent border-none text-white text-sm focus:outline-none placeholder-slate-700"
                        />
                      </div>
                    </div>
                    <div className="glass p-4 rounded-2xl flex items-center gap-4">
                      <div className="w-10 h-10 rounded-xl bg-purple-500/10 flex items-center justify-center text-purple-400">
                        <Users size={20} />
                      </div>
                      <div className="flex-1">
                        <p className="text-[10px] font-mono text-slate-500 uppercase">Customer (Member Connection)</p>
                        <select 
                          value={selectedCustomer}
                          onChange={(e) => setSelectedCustomer(e.target.value)}
                          className="w-full bg-transparent border-none text-white text-sm focus:outline-none"
                        >
                          <option value="" className="bg-[#020617]">Guest Customer</option>
                          {anggota?.map(a => (
                            <option key={a.id_anggota} value={a.id_anggota} className="bg-[#020617]">{a.nama} ({a.id_anggota})</option>
                          ))}
                        </select>
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                    {products
                      ?.filter(p => p.nama_produk.toLowerCase().includes(searchProduct.toLowerCase()))
                      .map(product => (
                        <motion.div 
                          key={product.id_produk}
                          whileHover={{ scale: 1.02 }}
                          onClick={() => handleAddToCart(product)}
                          className="glass p-4 rounded-2xl border-white/5 cursor-pointer group relative overflow-hidden"
                        >
                          <div className="absolute top-2 right-2 p-1.5 bg-cyan-500/10 rounded-lg text-cyan-400 opacity-0 group-hover:opacity-100 transition-opacity">
                            <Plus size={14} />
                          </div>
                          <p className="text-[8px] font-mono text-slate-500 uppercase mb-1">{product.kategori || 'General'}</p>
                          <h4 className="text-xs font-bold text-white mb-2 truncate">{product.nama_produk}</h4>
                          <div className="flex justify-between items-baseline">
                            <span className="text-cyan-400 text-sm font-bold">Rp {product.harga_jual.toLocaleString('id-ID')}</span>
                            <span className={`text-[9px] ${product.stok < 5 ? 'text-red-400' : 'text-slate-500'}`}>Stock: {product.stok}</span>
                          </div>
                        </motion.div>
                      ))}
                    {products.length === 0 && (
                      <div className="col-span-full py-12 glass border-dashed rounded-2xl flex flex-col items-center justify-center text-slate-600 gap-4">
                        <Package size={48} />
                        <p className="text-xs font-mono uppercase tracking-widest text-center">No products in inventory.<br/>Manage items in "Produk" menu.</p>
                      </div>
                    )}
                  </div>
                </div>

                <div className="xl:col-span-1">
                  <GlassCard title="Transaction Cart" className="min-w-0">
                    <div className="flex flex-col h-full min-h-[500px]">
                      <div className="flex-1 space-y-4 mb-6">
                        {cart?.map((item, i) => (
                          <div key={i} className="flex items-center gap-3 p-3 glass border-white/5 rounded-2xl animate-in slide-in-from-right duration-300">
                            <div className="flex-1">
                              <h5 className="text-[11px] font-bold text-white uppercase">{item.product.nama_produk}</h5>
                              <p className="text-[10px] text-cyan-400 font-mono">Rp {item.product.harga_jual.toLocaleString('id-ID')}</p>
                            </div>
                            <div className="flex items-center gap-2 bg-slate-950/50 rounded-lg p-1 border border-white/5">
                              <button onClick={() => handleUpdateCartQty(item.product.id_produk, -1)} className="p-1 text-slate-500 hover:text-white"><Minus size={12} /></button>
                              <span className="text-xs font-mono text-white min-w-[20px] text-center">{item.qty}</span>
                              <button onClick={() => handleUpdateCartQty(item.product.id_produk, 1)} className="p-1 text-slate-500 hover:text-white"><Plus size={12} /></button>
                            </div>
                            <button onClick={() => handleRemoveFromCart(item.product.id_produk)} className="p-2 text-slate-500 hover:text-red-400">
                              <Trash size={14} />
                            </button>
                          </div>
                        ))}
                        {cart.length === 0 && (
                          <div className="h-full flex flex-col items-center justify-center text-slate-600 opacity-30 gap-4 mt-20">
                            <ShoppingBag size={48} />
                            <p className="text-[10px] uppercase font-mono tracking-widest text-center">Cart Empty<br/>Scanning for products...</p>
                          </div>
                        )}
                      </div>

                      <div className="mt-auto space-y-4 border-t border-white/5 pt-6">
                        <div className="flex justify-between items-center text-slate-400">
                          <span className="text-[10px] font-mono uppercase">Checkout Type</span>
                          <select 
                            value={checkoutType}
                            onChange={(e) => setCheckoutType(e.target.value as any)}
                            className="bg-transparent border-none text-[10px] font-mono text-cyan-400 focus:outline-none text-right"
                          >
                             <option value="TUNAI" className="bg-[#020617]">CASH PAYMENT</option>
                             <option value="KASBON" disabled={!selectedCustomer} className="bg-[#020617]">KASBON (MEMBER ONLY)</option>
                          </select>
                        </div>
                        <div className="flex justify-between items-center text-white">
                          <span className="text-xs font-bold uppercase tracking-tighter">Grand Total</span>
                          <span className="text-xl font-bold font-mono text-cyan-400">Rp {cart.reduce((a, c) => a + (c.qty * c.product.harga_jual), 0).toLocaleString('id-ID')}</span>
                        </div>
                        <button 
                          disabled={cart.length === 0}
                          onClick={handleCheckout}
                          className="w-full py-4 bg-gradient-to-r from-emerald-600 to-cyan-600 rounded-2xl text-white text-[10px] font-bold tracking-[0.2em] uppercase glow-cyan hover:scale-[1.02] active:scale-95 transition-all disabled:opacity-20 disabled:grayscale disabled:cursor-not-allowed"
                        >
                          Process Unit Transaction
                        </button>
                      </div>
                    </div>
                  </GlassCard>
                </div>
              </div>
            )}

            {activeMenu === 'produk' && (
              <div className="space-y-6 min-w-0">
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                   <div className="space-y-1">
                      <h3 className="text-xl font-black text-white uppercase tracking-tighter">Inventory Core</h3>
                      <div className="flex gap-4">
                        <button 
                          onClick={() => setProductView('table')}
                          className={`text-[10px] font-bold uppercase tracking-[0.2em] transition-all flex items-center gap-2 ${productView === 'table' ? 'text-cyan-400' : 'text-slate-500 hover:text-slate-300'}`}
                        >
                          <div className={`w-1 h-1 rounded-full ${productView === 'table' ? 'bg-cyan-400' : 'bg-transparent'}`} />
                          Matrix View
                        </button>
                        <button 
                          onClick={() => setProductView('procurement')}
                          className={`text-[10px] font-bold uppercase tracking-[0.2em] transition-all flex items-center gap-2 ${productView === 'procurement' ? 'text-cyan-400' : 'text-slate-500 hover:text-slate-300'}`}
                        >
                          <div className={`w-1 h-1 rounded-full ${productView === 'procurement' ? 'bg-cyan-400' : 'bg-transparent'}`} />
                          Procurement Protocol
                        </button>
                      </div>
                   </div>
                   {productView === 'table' && (
                     <button 
                      onClick={() => setEditingItem({ type: 'pos' as any, data: {} } as any)}
                      className="px-4 py-3 bg-cyan-500/10 border border-cyan-500/30 text-cyan-400 rounded-2xl hover:bg-cyan-500/20 transition-all text-[10px] font-bold uppercase tracking-widest flex items-center gap-2"
                     >
                       <Plus size={14} /> Initialize Node
                     </button>
                   )}
                </div>

                {productView === 'table' ? (
                  <GlassCard title="Global Inventory Repository" className="min-w-0">
                    <div className="overflow-x-auto">
                       <table className="w-full text-left min-w-[800px]">
                         <thead>
                           <tr className="border-b border-white/5">
                             <th className="p-4 text-[10px] font-mono text-cyan-400 uppercase tracking-widest">Asset Parameters</th>
                             <th className="p-4 text-[10px] font-mono text-cyan-400 uppercase tracking-widest">Standard Pricing</th>
                             <th className="p-4 text-[10px] font-mono text-cyan-400 uppercase tracking-widest text-center">Inbound Qty</th>
                             <th className="p-4 text-[10px] font-mono text-cyan-400 uppercase tracking-widest text-center">Status</th>
                             <th className="p-4 text-[10px] font-mono text-cyan-400 uppercase tracking-widest text-center">Registry Logic</th>
                           </tr>
                         </thead>
                         <tbody>
                            {products?.length > 0 ? (
                              products?.map(p => (
                                <tr key={p.id_produk} className="border-b border-white/5 hover:bg-white/5 transition-colors group">
                                  <td className="p-4">
                                    <div className="text-xs font-bold text-white uppercase">{p.nama_produk || (p as any).name}</div>
                                    <div className="text-[9px] text-slate-500 font-mono italic">NODE_ID: {p.id_produk}</div>
                                    <div className="text-[9px] text-cyan-500/50 uppercase font-bold mt-1 tracking-tighter">{p.kategori || (p as any).categoryId || 'Unclassified'} · {p.satuan || (p as any).unit || 'PCS'}</div>
                                  </td>
                                  <td className="p-4">
                                    <div className="text-xs font-mono text-white">Rp {(p.harga_jual || (p as any).sellingPrice || 0).toLocaleString('id-ID')}</div>
                                    <div className="text-[8px] font-mono text-slate-500 uppercase">Margin: Rp {((p.harga_jual || (p as any).sellingPrice || 0) - (p.harga_modal || (p as any).purchasePrice || 0)).toLocaleString('id-ID')}</div>
                                  </td>
                                  <td className="p-4 text-center">
                                    <div className="text-xs font-bold text-white font-mono">{p.stok ?? 0}</div>
                                    <div className="text-[8px] text-slate-500 uppercase tracking-tighter">Units in Hub</div>
                                  </td>
                                  <td className="p-4 text-center">
                                    <span className={`px-2 py-1 rounded-full text-[8px] font-bold border ${(p.stok ?? 0) > 10 ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' : 'bg-red-500/10 text-red-400 border-red-500/20'}`}>
                                      {(p.stok ?? 0) > 10 ? 'OPTIMAL' : 'LOW_THRESHOLD'}
                                    </span>
                                  </td>
                                  <td className="p-4 text-center">
                                    <div className="flex items-center justify-center gap-2">
                                      <button onClick={() => setEditingItem({ type: 'pos' as any, data: p })} className="p-2 bg-white/5 border border-white/10 rounded-xl text-slate-500 hover:text-cyan-400 transition-all"><Edit2 size={12} /></button>
                                      <button onClick={() => { if(confirm('Terminate product node?')) deleteDoc(doc(db, 'products', p.id_produk)) }} className="p-2 bg-white/5 border border-white/10 rounded-xl text-slate-500 hover:text-red-400 transition-all"><Trash2 size={12} /></button>
                                    </div>
                                  </td>
                                </tr>
                              ))
                            ) : (
                              <tr>
                                <td colSpan={5} className="py-20 text-center">
                                  <div className="flex flex-col items-center gap-2 text-slate-600">
                                    <Package size={32} className="opacity-20 mb-2" />
                                    <p className="text-[10px] font-mono uppercase tracking-[0.3em]">No Product Nodes Detected</p>
                                    <p className="text-[9px] italic">Awaiting Inventory Initialization...</p>
                                  </div>
                                </td>
                              </tr>
                            )}
                         </tbody>
                       </table>
                    </div>
                  </GlassCard>
                ) : (
                  <ProductPurchaseModule 
                    products={products} 
                    suppliers={suppliers} 
                    categories={kategoriList} 
                  />
                )}
              </div>
            )}
            {activeMenu === 'kasbon' && (
              <div className="space-y-6">
                <GlassCard title="Piutang Kasbon Unit Usaha" className="min-w-0">
                   <div className="overflow-x-auto">
                      <table className="w-full text-left">
                        <thead>
                          <tr className="border-b border-white/10">
                            <th className="py-4 px-4 text-[10px] font-mono text-emerald-400 uppercase tracking-widest font-bold">Tanggal</th>
                            <th className="py-4 px-4 text-[10px] font-mono text-emerald-400 uppercase tracking-widest font-bold">Anggota</th>
                            <th className="py-4 px-4 text-[10px] font-mono text-emerald-400 uppercase tracking-widest font-bold text-right">Nominal</th>
                            <th className="py-4 px-4 text-[10px] font-mono text-emerald-400 uppercase tracking-widest font-bold text-center">Status</th>
                            <th className="py-4 px-4 text-[10px] font-mono text-emerald-400 uppercase tracking-widest font-bold text-center">Action</th>
                          </tr>
                        </thead>
                        <tbody>
                          {sales?.filter(s => s.metode_bayar === 'KASBON').map((sale, i) => (
                            <tr key={i} className="border-b border-white/5 hover:bg-white/5 transition-colors">
                              <td className="py-4 px-4 text-xs font-mono text-slate-500">
                                {new Date(sale.tanggal?.toDate?.() || sale.tanggal).toLocaleDateString('id-ID')}
                              </td>
                              <td className="py-4 px-4">
                                <div className="text-xs font-bold text-white uppercase">{anggota.find(a => a.id_anggota === sale.id_anggota)?.nama || 'Unknown Node'}</div>
                                <div className="text-[9px] text-slate-500 font-mono tracking-tighter">{sale.id_anggota}</div>
                              </td>
                              <td className="py-4 px-4 text-right text-xs font-mono text-emerald-400 font-bold">
                                Rp {sale.total_bayar.toLocaleString('id-ID')}
                              </td>
                              <td className="py-4 px-4 text-center">
                                <span className={`px-2 py-1 rounded text-[8px] font-bold ${sale.status_bayar === 'LUNAS' ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : 'bg-orange-500/10 text-orange-400 border border-orange-500/20'}`}>
                                  {sale.status_bayar === 'LUNAS' ? 'LUNAS' : 'PENDING'}
                                </span>
                              </td>
                              <td className="py-4 px-4 text-center">
                                {sale.status_bayar !== 'LUNAS' && (
                                  <button 
                                    onClick={async () => {
                                      if(confirm('Tandai tagihan kasbon ini sebagai Lunas?')) {
                                        await updateDoc(doc(db, 'penjualan', sale.id_penjualan), { status_bayar: 'LUNAS' });
                                      }
                                    }}
                                    className="px-3 py-1 bg-emerald-500 text-white text-[9px] font-bold rounded-lg hover:bg-emerald-600 transition-all uppercase tracking-widest"
                                  >
                                    Set Lunas
                                  </button>
                                )}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                </GlassCard>
              </div>
            )}

            {activeMenu === 'laporan_usaha' && (
              <div className="space-y-8 flex-1 flex flex-col">
                <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                    <StatCard 
                      title="Total Omzet" 
                      value={`Rp ${sales.reduce((a, s) => a + s.total_bayar, 0).toLocaleString('id-ID')}`} 
                      metric="Sales Node" 
                      color="emerald" 
                    />
                    <StatCard 
                      title="Total Modal" 
                      value={`Rp ${sales.reduce((a, s) => a + (s as any).total_modal || 0, 0).toLocaleString('id-ID')}`} 
                      metric="Inventory Cost" 
                      color="slate" 
                    />
                    <StatCard 
                      title="Keuntungan Net" 
                      value={`Rp ${sales.reduce((a, s) => a + (s as any).keuntungan || 0, 0).toLocaleString('id-ID')}`} 
                      metric="Net Margin" 
                      color="cyan" 
                    />
                    <StatCard 
                      title="Piutang Kasbon" 
                      value={`Rp ${sales.filter(s => s.status_bayar !== 'LUNAS').reduce((a, s) => a + s.total_bayar, 0).toLocaleString('id-ID')}`} 
                      metric="Unpaid" 
                      color="orange" 
                    />
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 min-w-0">
                  <GlassCard title="Rekap Belanja Anggota" className="min-w-0">
                    <div className="overflow-x-auto">
                      <table className="w-full text-left">
                        <thead>
                          <tr className="border-b border-white/5">
                            <th className="p-4 text-[10px] font-mono text-cyan-400 uppercase">Anggota</th>
                            <th className="p-4 text-[10px] font-mono text-cyan-400 uppercase text-right">Total Belanja</th>
                            <th className="p-4 text-[10px] font-mono text-cyan-400 uppercase text-center">Freq</th>
                          </tr>
                        </thead>
                        <tbody>
                          {anggota?.map(a => {
                            const nodeSales = sales.filter(s => s.id_anggota === a.id_anggota);
                            const total = nodeSales.reduce((acc, s) => acc + s.total_bayar, 0);
                            if (total === 0) return null;
                            return (
                              <tr key={a.id_anggota} className="border-b border-white/5 hover:bg-white/5 transition-colors font-mono text-xs">
                                <td className="p-4">
                                  <div className="font-bold text-white">{a.nama}</div>
                                  <div className="text-[9px] text-slate-500 italic">{a.id_anggota}</div>
                                </td>
                                <td className="p-4 text-right text-emerald-400 font-bold">Rp {total.toLocaleString('id-ID')}</td>
                                <td className="p-4 text-center text-slate-400">{nodeSales.length}x</td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  </GlassCard>

                  <GlassCard title="Log Penjualan Terakhir" className="min-w-0">
                    <div className="space-y-3">
                        {sales?.slice().reverse().slice(0, 10).map((sale: any, i: number) => (
                          <div key={i} className="p-3 glass rounded-xl border-white/5 flex items-center justify-between text-[10px] font-mono">
                            <div>
                               <div className="text-white font-bold uppercase">{sale.id_penjualan}</div>
                               <div className="text-slate-500">{new Date(sale.tanggal?.toDate?.() || sale.tanggal).toLocaleString('id-ID')}</div>
                            </div>
                            <div className="text-right">
                               <div className="text-emerald-400 font-bold">Rp {sale.total_bayar.toLocaleString('id-ID')}</div>
                               <div className={`text-[8px] uppercase ${sale.metode_bayar === 'KASBON' ? 'text-orange-400' : 'text-slate-500'}`}>{sale.metode_bayar}</div>
                            </div>
                          </div>
                        ))}
                    </div>
                  </GlassCard>
                </div>
              </div>
            )}

            {activeMenu === 'supplier' && (
              <div className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <GlassCard title="Register New Supplier" className="min-w-0">
                    <form onSubmit={handleTambahSupplier} className="space-y-4">
                      <InputBox name="nama_supplier" label="Supplier Name" placeholder="PT. Distributor..." required />
                      <InputBox name="kontak" label="Contact / WA" placeholder="08..." required />
                      <CyberButton text="Register Node" icon={<ArrowUpRight size={18} />} />
                    </form>
                  </GlassCard>
                  <div className="md:col-span-2">
                    <GlassCard title="Supplier List Registry" className="min-w-0">
                       <div className="overflow-x-auto">
                        <table className="w-full text-left">
                          <thead>
                            <tr className="border-b border-white/5">
                              <th className="p-4 text-[10px] font-mono text-cyan-400 uppercase">Provider Node</th>
                              <th className="p-4 text-[10px] font-mono text-cyan-400 uppercase">Contact</th>
                              <th className="p-4 text-[10px] font-mono text-cyan-400 uppercase text-center">Protocol</th>
                            </tr>
                          </thead>
                          <tbody>
                            {suppliers?.map(s => (
                              <tr key={s.id_supplier} className="border-b border-white/5 hover:bg-white/5 font-mono text-xs">
                                <td className="p-4">
                                  <div className="text-white font-bold">{s.nama_supplier}</div>
                                  <div className="text-[9px] text-slate-500 italic">{s.id_supplier}</div>
                                </td>
                                <td className="p-4 text-slate-300">{s.kontak}</td>
                                <td className="p-4 text-center">
                                  <button onClick={() => deleteDoc(doc(db, 'supplier', s.id_supplier))} className="p-2 text-slate-600 hover:text-red-400 transition-colors"><Trash2 size={14} /></button>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </GlassCard>
                  </div>
                </div>
              </div>
            )}

            {activeMenu === 'kategori' && (
              <div className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <GlassCard title="New Category Protocol" className="min-w-0">
                    <form onSubmit={handleTambahKategoriFromForm} className="space-y-4">
                      <InputBox name="nama_kategori" label="Category Name" placeholder="Electronik, Food..." required />
                      <CyberButton text="Deploy Category" icon={<Plus size={18} />} />
                    </form>
                  </GlassCard>
                  <div className="md:col-span-2">
                    <GlassCard title="Classification Nodes" className="min-w-0">
                       <div className="overflow-x-auto">
                        <table className="w-full text-left">
                          <thead>
                            <tr className="border-b border-white/5">
                              <th className="p-4 text-[10px] font-mono text-cyan-400 uppercase">Category Identity</th>
                              <th className="p-4 text-[10px] font-mono text-cyan-400 uppercase text-center">Protocol</th>
                            </tr>
                          </thead>
                          <tbody>
                            {kategoriList?.map(cat => (
                              <tr key={cat.id_kategori} className="border-b border-white/5 hover:bg-white/5 font-mono text-xs">
                                <td className="p-4">
                                  <div className="text-white font-bold">{cat.nama_kategori}</div>
                                  <div className="text-[9px] text-slate-500 italic">{cat.id_kategori}</div>
                                </td>
                                <td className="p-4 text-center">
                                  <button onClick={() => deleteDoc(doc(db, 'kategori', cat.id_kategori))} className="p-2 text-slate-600 hover:text-red-400 transition-colors"><Trash2 size={14} /></button>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </GlassCard>
                  </div>
                </div>
              </div>
            )}

            {activeMenu === 'pembelian' && (
              <div className="space-y-6">
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 min-w-0">
                   <GlassCard title="Supply Chain Inbound (Restock)" className="min-w-0">
                     <RestockSystem 
                        products={products} 
                        suppliers={suppliers} 
                        onSubmit={handleTambahPembelian}
                      />
                   </GlassCard>

                   <GlassCard title="Purchasing Registry Log" className="min-w-0">
                       <div className="space-y-4">
                          {pembelianList?.slice().reverse().map((p, i) => (
                            <div key={i} className="p-4 glass rounded-2xl border-white/5 text-[10px] font-mono group">
                               <div className="flex justify-between items-center mb-2">
                                  <span className="text-cyan-400 font-bold uppercase">{p.id_pembelian}</span>
                                  <span className="text-slate-600 italic font-light">{new Date(p.tanggal_belanja?.toDate?.() || p.tanggal_belanja).toLocaleString('id-ID')}</span>
                               </div>
                               <div className="flex items-center gap-2 mb-2">
                                  <div className="px-2 py-0.5 bg-white/5 border border-white/10 rounded text-slate-400 uppercase text-[8px]">
                                     Supplier: {suppliers.find(s => s.id_supplier === p.id_supplier)?.nama_supplier || 'Unknown'}
                                  </div>
                               </div>
                               <div className="space-y-1 pl-2 border-l border-white/5">
                                  {p.items?.map((it, idx) => (
                                    <div key={idx} className="flex justify-between text-slate-500">
                                       <span>{it.nama_produk} x {it.qty}</span>
                                       <span>Rp {(it.qty * it.harga_modal).toLocaleString('id-ID')}</span>
                                    </div>
                                  ))}
                               </div>
                               <div className="mt-3 text-right pt-2 border-t border-white/5">
                                  <span className="text-emerald-400 font-bold">Total Modal: Rp {p.total_modal.toLocaleString('id-ID')}</span>
                               </div>
                            </div>
                          ))}
                       </div>
                   </GlassCard>
                </div>
              </div>
            )}

            {activeMenu === 'settings' && (
              <div className="max-w-2xl mx-auto py-12">
                <GlassCard title="Global Configuration Unit" className="min-w-0">
                  <FormSettings 
                    onSubmit={async (e) => {
                      e.preventDefault();
                      const val = Number(new FormData(e.currentTarget).get('simpanan_pokok'));
                      try {
                        await setDoc(doc(db, 'settings', 'koperasi_config'), { simpanan_pokok: val });
                        alert('Konfigurasi berhasil disimpan ke network.');
                      } catch (error) {
                        handleFirestoreError(error, OperationType.WRITE, 'settings/koperasi_config');
                      }
                    }} 
                    config={config} 
                  />
                </GlassCard>
              </div>
            )}

            {activeMenu === 'unit_jasa' && (
              <UnitJasaContainer anggotaList={anggota} />
            )}
            
            {activeMenu === 'rekap_simpanan' && (
              <RekapSimpananModule anggotaList={anggota} />
            )}

            {activeMenu === 'profil_koperasi' && (
              <ProfilKoperasiModule anggotaList={anggota} />
            )}

            {activeMenu === 'backup_data' && (
              <BackupModule isAdmin={isAdmin} />
            )}

            {activeMenu === 'reset_data' && (
              <ResetModule isAdmin={isAdmin} />
            )}

            {activeMenu === 'audit_log' && (
              <AuditLogsModule isAdmin={isAdmin} />
            )}
            {activeMenu === 'laporan' && (
              <div className="space-y-8 flex-1 flex flex-col">
                <div className="flex justify-between items-end gap-4">
                  <div>
                    <h2 className="text-2xl font-bold text-white tracking-tighter uppercase">Laporan Strategis Aset</h2>
                    <p className="text-xs text-slate-400 mt-1 uppercase font-mono">Consolidated Financial Statement & Asset Composition</p>
                  </div>
                  <div className="flex gap-3">
                    <button onClick={exportToExcel} className="p-3 bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 rounded-xl hover:bg-emerald-500/20 transition-all text-xs font-bold flex items-center gap-2">
                       <FileDown size={14} /> EXPORT EXCEL
                    </button>
                    <button onClick={exportToPDF} className="p-3 bg-red-500/10 border border-red-500/30 text-red-400 rounded-xl hover:bg-red-500/20 transition-all text-xs font-bold flex items-center gap-2">
                       <Printer size={14} /> EXPORT PDF
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
                    <StatCard title="Simpanan" value={`Rp ${(stats.totalPokok + stats.totalWajib + stats.totalSukarela).toLocaleString('id-ID')}`} metric="Core Capital" color="cyan" />
                    <StatCard title="Tabungan" value={`Rp ${stats.totalTabungan.toLocaleString('id-ID')}`} metric="Liabilities" color="emerald" />
                    <StatCard title="Pinjaman" value={`Rp ${stats.sisaPinjaman.toLocaleString('id-ID')}`} metric="Receivables" color="slate" />
                    <StatCard title="Dana DPK" value={`Rp ${stats.totalDPK.toLocaleString('id-ID')}`} metric="External" color="purple" />
                    <StatCard title="TOTAL ASET" value={`Rp ${stats.totalAsetKoperasi.toLocaleString('id-ID')}`} metric="Net Value" glow color="cyan" />
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 min-w-0">
                  <GlassCard title="Komposisi Aset Koperasi" className="min-w-0">
                    <SafeChartContainer 
                      loading={isLoading} 
                      data={chartData} 
                      height={320}
                      title="Aset Komposisi"
                    >
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie
                            data={chartData}
                            cx="50%"
                            cy="50%"
                            innerRadius={60}
                            outerRadius={80}
                            paddingAngle={5}
                            dataKey="value"
                          >
                            {(chartData || []).map((entry, index) => (
                              <Cell key={`cell-${index}`} fill={entry.color} />
                            ))}
                          </Pie>
                          <Tooltip 
                            contentStyle={{ backgroundColor: '#0f172a', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '12px', fontSize: '10px' }}
                            formatter={(value: number) => `Rp ${value.toLocaleString('id-ID')}`}
                          />
                          <Legend wrapperStyle={{ fontSize: '10px', paddingTop: '20px' }} />
                        </PieChart>
                      </ResponsiveContainer>
                    </SafeChartContainer>
                  </GlassCard>

                  <GlassCard title="Detail Aset Ledger" className="min-w-0">
                    <div className="space-y-4 py-4">
                        {[
                          { label: 'Simpanan Pokok', value: stats.totalPokok, sub: 'Initial Investment' },
                          { label: 'Simpanan Wajib', value: stats.totalWajib, sub: 'Periodic Growth' },
                          { label: 'Simpanan Sukarela', value: stats.totalSukarela, sub: 'Optional Liquidity' },
                          { label: 'Saldo Tabungan', value: stats.totalTabungan, sub: 'Member Deposits' },
                          { label: 'Pinjaman Beredar', value: stats.sisaPinjaman, sub: 'Outstanding Credit' },
                          { label: 'Dana DPK', value: stats.totalDPK, sub: 'External Grants/Loans' },
                        ].map((item, idx) => (
                          <div key={idx} className="flex justify-between items-center p-3 glass border-white/5 rounded-xl transition-all hover:bg-white/5">
                            <div>
                              <p className="text-[10px] font-bold text-slate-300 uppercase leading-none">{item.label}</p>
                              <p className="text-[8px] text-slate-500 uppercase mt-1">{item.sub}</p>
                            </div>
                            <span className="text-xs font-mono text-white font-bold">Rp {item.value.toLocaleString('id-ID')}</span>
                          </div>
                        ))}
                    </div>
                  </GlassCard>
                </div>

                <GlassCard title="Distribusi Aset Per Node Anggota" className="min-w-0">
                   <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                      <thead>
                        <tr className="border-b border-white/10">
                          <th className="py-4 px-4 text-[10px] font-mono text-cyan-400 uppercase font-bold">Node Anggota</th>
                          <th className="py-4 px-4 text-[10px] font-mono text-cyan-400 uppercase font-bold text-right">Simpanan</th>
                          <th className="py-4 px-4 text-[10px] font-mono text-cyan-400 uppercase font-bold text-right">Tabungan</th>
                          <th className="py-4 px-4 text-[10px] font-mono text-cyan-400 uppercase font-bold text-right">Sisa Pinjam</th>
                          <th className="py-4 px-4 text-[10px] font-mono text-cyan-400 uppercase font-bold text-right">Total Kontribusi</th>
                        </tr>
                      </thead>
                      <tbody>
                        {(anggota || []).map((a, i) => {
                          const s = getSummaryPerAnggota(a.id_anggota);
                          const simpanan = s.pokok + s.wajib + s.sukarela;
                          const totalNode = simpanan + s.tabungan;
                          return (
                            <tr key={i} className="border-b border-white/5 hover:bg-white/5 transition-colors text-xs font-mono">
                              <td className="py-4 px-4">
                                <div className="text-white font-bold">{a.nama}</div>
                                <div className="text-[8px] text-slate-500">{a.id_anggota}</div>
                              </td>
                              <td className="py-4 px-4 text-right text-cyan-400">Rp {simpanan.toLocaleString('id-ID')}</td>
                              <td className="py-4 px-4 text-right text-emerald-400">Rp {s.tabungan.toLocaleString('id-ID')}</td>
                              <td className="py-4 px-4 text-right text-red-400">Rp {s.sisa_pinjam.toLocaleString('id-ID')}</td>
                              <td className="py-4 px-4 text-right text-white font-bold underline decoration-cyan-500/30">Rp {(totalNode).toLocaleString('id-ID')}</td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </GlassCard>
              </div>
            )}

            {activeMenu === 'anggota_list' && (
              <div className="space-y-6">
                <GlassCard title="Master Ledger Anggota" className="min-w-0">
                  <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                      <thead>
                        <tr className="border-b border-white/10">
                          <th className="py-4 px-4 text-[10px] font-mono text-cyan-400 uppercase tracking-widest font-bold">Nama Anggota</th>
                          <th className="py-4 px-4 text-[10px] font-mono text-cyan-400 uppercase tracking-widest font-bold">ID</th>
                          <th className="py-4 px-4 text-[10px] font-mono text-cyan-400 uppercase tracking-widest font-bold">Pokok</th>
                          <th className="py-4 px-4 text-[10px] font-mono text-cyan-400 uppercase tracking-widest font-bold">Wajib</th>
                          <th className="py-4 px-4 text-[10px] font-mono text-cyan-400 uppercase tracking-widest font-bold">Sukarela</th>
                          <th className="py-4 px-4 text-[10px] font-mono text-cyan-400 uppercase tracking-widest font-bold">Tabungan</th>
                          <th className="py-4 px-4 text-[10px] font-mono text-cyan-400 uppercase tracking-widest font-bold text-center">Aksi</th>
                        </tr>
                      </thead>
                      <tbody>
                        {(anggota || []).slice((currentPageAnggota - 1) * itemsPerPage, currentPageAnggota * itemsPerPage).map((a, i) => {
                          const s = getSummaryPerAnggota(a.id_anggota);
                          return (
                            <tr key={i} className="border-b border-white/5 hover:bg-white/5 transition-colors group">
                              <td className="py-4 px-4">
                                <div className="text-xs font-semibold text-white">{a.nama}</div>
                                <div className="text-[8px] text-slate-500 uppercase tracking-tighter">{a.alamat}</div>
                              </td>
                              <td className="py-4 px-4 text-xs font-mono text-slate-400">{a.id_anggota}</td>
                              <td className="py-4 px-4 text-xs font-mono text-cyan-400">Rp {s.pokok.toLocaleString('id-ID')}</td>
                              <td className="py-4 px-4 text-xs font-mono text-emerald-400">Rp {s.wajib.toLocaleString('id-ID')}</td>
                              <td className="py-4 px-4 text-xs font-mono text-purple-400">Rp {s.sukarela.toLocaleString('id-ID')}</td>
                              <td className="py-4 px-4 text-xs font-mono text-white font-bold">Rp {s.tabungan.toLocaleString('id-ID')}</td>
                              <td className="py-4 px-4 text-center">
                                <div className="flex items-center justify-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                  <button onClick={() => setEditingItem({ type: 'anggota_list', data: a })} className="p-1.5 text-slate-400 hover:text-cyan-400 transition-colors"><Edit2 size={12} /></button>
                                  <button onClick={() => triggerHapusAnggota(a)} className="p-1.5 text-slate-400 hover:text-red-400 transition-colors"><Trash2 size={12} /></button>
                                </div>
                              </td>
                            </tr>
                          );
                        })}
                        {anggota.length === 0 && (
                          <tr>
                            <td colSpan={6} className="py-20 text-center text-slate-600 text-xs font-mono">No network nodes detected. Ingest data to view registry.</td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                    <Pagination 
                      current={currentPageAnggota} 
                      total={Math.ceil(anggota.length / itemsPerPage)} 
                      onPageChange={setCurrentPageAnggota} 
                    />
                  </div>
                </GlassCard>
                
                <GlassCard title="Log Transaksi Riwayat" className="min-w-0">
                  <div className="flex flex-col gap-6">
                    <div className="flex items-center gap-4 p-4 bg-slate-950/50 rounded-2xl border border-white/5">
                      <div className="flex flex-col gap-1.5 flex-1">
                        <label className="text-[9px] font-mono text-cyan-400 uppercase tracking-widest font-bold">Filter By Node Member</label>
                        <select 
                          value={filterMemberId}
                          onChange={(e) => setFilterMemberId(e.target.value)}
                          className="bg-transparent text-slate-200 focus:outline-none text-xs font-mono"
                        >
                          <option value="ALL">ALL NETWORK NODES</option>
                          {(anggota || []).map(a => (
                            <option key={a.id_anggota} value={a.id_anggota}>{a.nama} ({a.id_anggota})</option>
                          ))}
                        </select>
                      </div>
                      <Users size={20} className="text-slate-700" />
                    </div>

                    <div className="overflow-x-auto">
                      <table className="w-full text-left border-collapse">
                        <thead>
                          <tr className="border-b border-white/10">
                            <th className="py-4 px-4 text-[10px] font-mono text-cyan-400 uppercase font-bold">Tanggal</th>
                            <th className="py-4 px-4 text-[10px] font-mono text-cyan-400 uppercase font-bold">ID Anggota</th>
                            <th className="py-4 px-4 text-[10px] font-mono text-cyan-400 uppercase font-bold">Jenis</th>
                            <th className="py-4 px-4 text-[10px] font-mono text-cyan-400 uppercase font-bold">Tipe</th>
                            <th className="py-4 px-4 text-[10px] font-mono text-cyan-400 uppercase font-bold">Nominal</th>
                            <th className="py-4 px-4 text-[10px] font-mono text-cyan-400 uppercase font-bold text-center">Aksi</th>
                          </tr>
                        </thead>
                        <tbody>
                          {(() => {
                            const filtered = transaksi
                              .filter(t => filterMemberId === 'ALL' || t.id_anggota === filterMemberId)
                              .slice()
                              .reverse();
                            
                            const paginated = filtered.slice((currentPageTransaksi - 1) * itemsPerPage, currentPageTransaksi * itemsPerPage);
                            
                            return (
                              <>
                                {(paginated || []).map((t, i) => (
                                  <tr key={i} className="border-b border-white/5 text-[10px] font-mono group">
                                    <td className="py-3 px-4 text-slate-500">{t.tanggal?.toDate?.() ? t.tanggal.toDate().toLocaleDateString('id-ID') : new Date(t.tanggal).toLocaleDateString('id-ID')}</td>
                                    <td className="py-3 px-4 text-slate-300">{t.id_anggota}</td>
                                    <td className="py-3 px-4 text-slate-400">{t.jenis}</td>
                                    <td className={`py-3 px-4 ${t.tipe === 'MASUK' ? 'text-emerald-400' : 'text-red-400'}`}>{t.tipe}</td>
                                    <td className="py-3 px-4 text-white">Rp {t.nominal.toLocaleString('id-ID')}</td>
                                    <td className="py-3 px-4 text-center">
                                      <div className="flex items-center justify-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                        <button onClick={() => setEditingItem({ type: 'transaksi', data: t })} className="p-1 text-slate-500 hover:text-cyan-400 transition-colors"><Edit2 size={10} /></button>
                                        <button onClick={() => hapusTransaksi(t.id_transaksi)} className="p-1 text-slate-500 hover:text-red-400 transition-colors"><Trash2 size={10} /></button>
                                      </div>
                                    </td>
                                  </tr>
                                ))}
                                {filtered.length === 0 && (
                                  <tr>
                                    <td colSpan={6} className="py-10 text-center text-slate-600 text-xs font-mono">No transactions found for this node.</td>
                                  </tr>
                                )}
                              </>
                            );
                          })()}
                        </tbody>
                      </table>
                      {(() => {
                        const filtered = transaksi.filter(t => filterMemberId === 'ALL' || t.id_anggota === filterMemberId);
                        return (
                          <Pagination 
                            current={currentPageTransaksi} 
                            total={Math.ceil(filtered.length / itemsPerPage)} 
                            onPageChange={setCurrentPageTransaksi} 
                          />
                        );
                      })()}
                    </div>
                  </div>
                </GlassCard>
              </div>
            )}
          </motion.div>
        </AnimatePresence>

        {/* FOOTER COPYRIGHT */}
        <footer className="mt-auto pt-10 pb-4 text-center">
          <p className="text-[10px] md:text-xs font-mono text-slate-500 uppercase tracking-[0.3em] opacity-40 hover:opacity-100 transition-opacity duration-500">
            © 2026 @Radena Digital Agency
          </p>
        </footer>

        <AnimatePresence>
          {deleteMemberModal.isOpen && deleteMemberModal.data && (
            <div 
              className="fixed inset-0 z-50 flex items-center justify-center p-6 bg-slate-950/90 backdrop-blur-md"
              onClick={() => setDeleteMemberModal({ isOpen: false, data: null, isDeleting: false })}
            >
              <motion.div 
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9 }}
                onClick={(e) => e.stopPropagation()}
                className="w-full max-w-md glass border border-red-500/30 rounded-3xl overflow-hidden shadow-[0_0_50px_rgba(239,68,68,0.2)]"
              >
                <div className="p-6 bg-red-500/10 border-b border-red-500/20 flex items-center gap-4">
                  <div className="p-3 bg-red-500/20 rounded-2xl text-red-400">
                    <ShieldAlert size={24} />
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-white uppercase italic tracking-tighter">Konfirmasi Terminasi Node</h3>
                    <p className="text-[10px] text-red-400/70 font-mono uppercase">Security Protocol: Action Required</p>
                  </div>
                </div>

                <div className="p-8 space-y-6">
                  <div className="space-y-4 p-4 bg-white/5 rounded-2xl border border-white/10">
                    <div className="flex justify-between items-center text-[10px] font-mono">
                      <span className="text-slate-500 uppercase">Nama Anggota</span>
                      <span className="text-white font-bold">{deleteMemberModal.data.nama}</span>
                    </div>
                    <div className="flex justify-between items-center text-[10px] font-mono">
                      <span className="text-slate-500 uppercase">ID Anggota</span>
                      <span className="text-cyan-400">{deleteMemberModal.data.id_anggota}</span>
                    </div>
                  </div>

                  {(() => {
                    const s = getSummaryPerAnggota(deleteMemberModal.data.id_anggota);
                    const hasActiveData = s.pokok > 0 || s.wajib > 0 || s.sukarela > 0 || s.tabungan > 0 || s.sisa_pinjam > 0;
                    
                    return (
                      <div className={`p-4 rounded-2xl border ${hasActiveData ? 'bg-orange-500/10 border-orange-500/20' : 'bg-slate-900/50 border-white/5'}`}>
                        <div className="flex gap-3">
                          <AlertCircle size={16} className={hasActiveData ? 'text-orange-400' : 'text-slate-500'} />
                          <div className="space-y-1">
                            <p className="text-[10px] font-bold text-white uppercase tracking-tight">Analisis Ledger</p>
                            <p className="text-[9px] text-slate-400 leading-relaxed">
                              {hasActiveData 
                                ? "WARNING: Anggota memiliki saldo aktif. Seluruh saldo akan diarsipkan namun tidak dapat ditarik setelah penghapusan."
                                : "Node ini bersih. Tidak ada saldo aktif yang terdeteksi."
                              }
                            </p>
                          </div>
                        </div>
                      </div>
                    )
                  })()}

                  <div className="p-4 bg-red-500/5 border border-red-500/10 rounded-2xl">
                    <p className="text-[9px] text-red-300 italic text-center">
                      "Tindakan ini bersifat permanen dalam registry aktif. Seluruh riwayat transaksi akan ditandai sebagai ARCHIVED."
                    </p>
                  </div>

                  <div className="flex gap-3">
                    <button 
                      onClick={() => setDeleteMemberModal({ isOpen: false, data: null, isDeleting: false })}
                      className="flex-1 py-3 bg-white/5 hover:bg-white/10 text-white text-[10px] font-bold rounded-xl transition-all uppercase tracking-widest border border-white/10"
                    >
                      Batal
                    </button>
                    <button 
                      disabled={deleteMemberModal.isDeleting}
                      onClick={() => hapusAnggota(deleteMemberModal.data!.id_anggota)}
                      className="flex-1 py-3 bg-red-600 hover:bg-red-500 text-white text-[10px] font-bold rounded-xl transition-all uppercase tracking-widest shadow-[0_0_20px_rgba(220,38,38,0.3)] flex items-center justify-center gap-2"
                    >
                      {deleteMemberModal.isDeleting ? (
                        <>
                          <Loader2 size={14} className="animate-spin" />
                          Processing
                        </>
                      ) : (
                        "Hapus Anggota"
                      )}
                    </button>
                  </div>
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>

        <AnimatePresence>
          {editingItem && (
            <div 
              className="fixed inset-0 z-50 flex items-center justify-center p-6 bg-slate-950/80 backdrop-blur-sm"
              onClick={() => setEditingItem(null)}
            >
              <motion.div 
                initial={{ opacity: 0, scale: 0.9, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.9, y: 20 }}
                onClick={(e) => e.stopPropagation()}
                className="w-full max-w-xl glass border border-white/10 rounded-3xl overflow-hidden shadow-2xl relative max-h-[90vh] overflow-y-auto"
              >
                <div className="p-6 border-b border-white/5 flex justify-between items-center bg-white/5">
                  <div>
                    <h3 className="text-lg font-bold text-white uppercase tracking-tighter">Edit Data Matrix</h3>
                    <p className="text-[10px] text-slate-500 uppercase font-mono">{editingItem.type} ID: {editingItem.data.id_anggota || editingItem.data.id_transaksi || editingItem.data.id_pinjaman || editingItem.data.id_dana || editingItem.data.id_cicilan}</p>
                  </div>
                  <button onClick={() => setEditingItem(null)} className="p-2 bg-white/5 rounded-full text-slate-400 hover:text-white transition-colors">
                    <X size={20} />
                  </button>
                </div>
                
                <div className="p-8">
                  {editingItem.type === 'anggota_list' && (
                    <FormAnggota onSubmit={handleUpdateItem} defaultValue={editingItem.data} />
                  )}

                  {editingItem.type === 'transaksi' && (
                    <FormTransaksi onSubmit={handleUpdateItem} anggota={anggota} defaultValue={editingItem.data} />
                  )}

                  {editingItem.type === 'dpk' && (
                    <FormDPK onSubmit={handleUpdateItem} defaultValue={editingItem.data} />
                  )}

                  {editingItem.type === 'pinjaman' && (
                    <FormPinjaman 
                      onSubmit={handleUpdateItem} 
                      anggota={anggota} 
                      handleSimulasi={handleSimulasi} 
                      simulationResult={simulationResult} 
                      defaultValue={editingItem.data}
                    />
                  )}

                  {editingItem.type === 'cicilan' && (
                    <form onSubmit={handleUpdateItem} className="space-y-6">
                      <div className="flex flex-col gap-2">
                        <label className="text-[10px] font-mono text-cyan-400 uppercase font-bold">Status Bayar</label>
                        <select name="status" defaultValue={editingItem.data.status} className="bg-slate-950/50 border border-white/10 text-slate-200 p-3.5 rounded-xl text-sm">
                          <option value="BELUM">BELUM</option>
                          <option value="SUDAH">SUDAH</option>
                        </select>
                      </div>
                      <InputBox name="nominal" label="Nominal Cicilan" type="number" placeholder="" defaultValue={editingItem.data.nominal} />
                      <CyberButton text="Update Installment" icon={<CreditCard size={18} />} />
                    </form>
                  )}

                  {editingItem.type === 'pos' && (
                    <FormProduk 
                      onSubmit={editingItem.data.id_produk ? handleUpdateProduk : handleTambahProduk} 
                      defaultValue={editingItem.data.id_produk ? editingItem.data : undefined} 
                      kategoriList={kategoriList}
                      suppliers={suppliers}
                      onAddCategory={() => setShowCatModal(true)}
                      isSubmitting={isSubmitting}
                    />
                  )}

                  <div className="pt-6 border-t border-white/5 mt-6">
                    <button type="button" onClick={() => setEditingItem(null)} className="w-full bg-white/5 border border-white/10 text-slate-400 py-3 rounded-xl font-bold uppercase text-xs tracking-widest hover:bg-white/10 transition-all font-mono">
                      Discard Changes / Close
                    </button>
                  </div>
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>
        <AnimatePresence>
          {showCatModal && (
            <CategoryModal 
              isOpen={showCatModal} 
              onClose={() => setShowCatModal(false)} 
              onAdd={handleTambahKategori} 
            />
          )}
        </AnimatePresence>
      </main>
    </div>
  );
}

// ==========================================
// FORM COMPONENTS
// ==========================================

const FormAnggota = ({ onSubmit, defaultValue }: { onSubmit: (e: React.FormEvent<HTMLFormElement>) => void, defaultValue?: Anggota }) => (
  <form onSubmit={onSubmit} className="space-y-6">
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
      <div className="flex flex-col gap-2 opacity-50 cursor-not-allowed">
        <label className="text-[10px] font-mono text-cyan-400 uppercase tracking-widest font-bold">Generated ID</label>
        <div className="bg-slate-950/50 border border-white/10 text-slate-400 p-3.5 rounded-xl text-sm font-mono">
          {defaultValue?.id_anggota || 'Auto-Generated (KOP-XXX)'}
        </div>
      </div>
      <InputBox name="nama" label="Nama Lengkap" placeholder="Nama legal anggota..." defaultValue={defaultValue?.nama} required />
      <InputBox name="no_hp" label="No HP / WA" placeholder="+62..." defaultValue={defaultValue?.no_hp} required />
      <InputBox name="alamat" label="Alamat Domisili" placeholder="Kota/Kabupaten..." defaultValue={defaultValue?.alamat} required />
      {defaultValue && (
        <div className="flex flex-col gap-2">
          <label className="text-[10px] font-mono text-cyan-400 uppercase font-bold">Status</label>
          <select name="status" defaultValue={defaultValue.status} className="bg-slate-950/50 border border-white/10 text-slate-200 p-3.5 rounded-xl text-sm">
            <option value="Aktif">Aktif</option>
            <option value="Non-Aktif">Non-Aktif</option>
          </select>
        </div>
      )}
    </div>
    <CyberButton text={defaultValue ? "Update Member Node" : "Simpan Data Anggota"} icon={<UserPlus size={18} />} />
  </form>
);

const FormTransaksi = ({ onSubmit, anggota, defaultValue }: { onSubmit: (e: React.FormEvent<HTMLFormElement>) => void, anggota: Anggota[], defaultValue?: Transaksi }) => {
  const [jenis, setJenis] = useState(defaultValue?.jenis || 'POKOK');
  const years = [2024, 2025, 2026, 2027, 2028];
  const months = [
    'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 
    'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'
  ];

  return (
    <form onSubmit={onSubmit} className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="flex flex-col gap-2 opacity-50 cursor-not-allowed">
          <label className="text-[10px] font-mono text-cyan-400 uppercase tracking-widest font-bold">Transaction Ledger ID</label>
          <div className="bg-slate-950/50 border border-white/10 text-slate-400 p-3.5 rounded-xl text-sm font-mono">
            {defaultValue?.id_transaksi || 'Auto-Generated (TRX-XXXXX)'}
          </div>
        </div>
        
         <div className="flex flex-col gap-2">
          <label className="text-[10px] font-mono text-cyan-400 uppercase tracking-widest font-bold">Pilih Anggota</label>
          <select name="id_anggota_trx" defaultValue={defaultValue?.id_anggota} required className="bg-slate-950/50 border border-white/10 text-slate-200 p-3.5 rounded-xl focus:outline-none focus:border-cyan-400/50 transition-all text-sm">
            {anggota?.map(a => <option key={a.id_anggota} value={a.id_anggota}>{a.nama} ({a.id_anggota})</option>)}
            {(anggota?.length === 0 || !anggota) && <option value="">Belum ada anggota</option>}
          </select>
        </div>

        <div className="flex flex-col gap-2">
          <label className="text-[10px] font-mono text-cyan-400 uppercase tracking-widest font-bold">Jenis Simpanan / Kredit</label>
          <select 
            name="jenis" 
            value={jenis} 
            onChange={(e) => setJenis(e.target.value as any)}
            required 
            className="bg-slate-950/50 border border-white/10 text-slate-200 p-3.5 rounded-xl focus:outline-none focus:border-cyan-400/50 transition-all text-sm"
          >
            <option value="POKOK">POKOK</option>
            <option value="WAJIB">WAJIB</option>
            <option value="SUKARELA">SUKARELA</option>
            <option value="TABUNG">TABUNG</option>
            <option value="PINJAM">PINJAM (Piutang)</option>
            <option value="CICIL">CICIL (Angsuran)</option>
          </select>
        </div>

        <div className="flex flex-col gap-2">
          <label className="text-[10px] font-mono text-cyan-400 uppercase tracking-widest font-bold">Tipe Operasi</label>
          <select name="tipe" defaultValue={defaultValue?.tipe} required className="bg-slate-950/50 border border-white/10 text-slate-200 p-3.5 rounded-xl focus:outline-none focus:border-cyan-400/50 transition-all text-sm">
            <option value="MASUK">MASUK (Setoran)</option>
            <option value="KELUAR">KELUAR (Penarikan)</option>
          </select>
        </div>

        {jenis === 'WAJIB' && (
          <>
            <div className="flex flex-col gap-2 animate-in fade-in slide-in-from-top-2 duration-300">
              <label className="text-[10px] font-mono text-purple-400 uppercase tracking-widest font-bold">Bulan Pembayaran</label>
              <select name="paymentMonth" required className="bg-slate-950/50 border border-white/10 text-slate-200 p-3.5 rounded-xl focus:outline-none focus:border-purple-400/50 transition-all text-sm">
                {months.map(m => <option key={m} value={m}>{m}</option>)}
              </select>
            </div>
            <div className="flex flex-col gap-2 animate-in fade-in slide-in-from-top-2 duration-300">
              <label className="text-[10px] font-mono text-purple-400 uppercase tracking-widest font-bold">Tahun Pembayaran</label>
              <select name="paymentYear" required className="bg-slate-950/50 border border-white/10 text-slate-200 p-3.5 rounded-xl focus:outline-none focus:border-purple-400/50 transition-all text-sm">
                {years.map(y => <option key={y} value={y}>{y}</option>)}
              </select>
            </div>
          </>
        )}

        <InputBox name="nominal" label="Nominal (IDR)" type="number" placeholder="Rp 0" defaultValue={defaultValue?.nominal} required />
        
        <div className="col-span-2">
          <InputBox name="keterangan" label="Catatan Transaksi" placeholder="Optional..." defaultValue={defaultValue?.keterangan} />
        </div>
      </div>
      <CyberButton text={defaultValue ? "Update Entry Ledger" : "Execute Financial Commit"} icon={<CreditCard size={18} />} />
    </form>
  );
};

const FormDPK = ({ onSubmit, defaultValue }: { onSubmit: (e: React.FormEvent<HTMLFormElement>) => void, defaultValue?: any }) => (
  <form onSubmit={onSubmit} className="space-y-6">
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
      <div className="flex flex-col gap-2">
        <label className="text-[10px] font-mono text-cyan-400 uppercase tracking-widest font-bold">Source Matrix Name (Entitas)</label>
        <input 
          type="text" 
          name="sourceName" 
          placeholder="e.g. PT Mitra Sejahtera / Investor A" 
          defaultValue={defaultValue?.sourceName || defaultValue?.sumber}
          className="bg-slate-950/50 border border-white/10 text-slate-200 p-3.5 rounded-xl focus:outline-none focus:border-cyan-400/50 transition-all text-sm" 
          required 
        />
      </div>

      <div className="flex flex-col gap-2">
        <label className="text-[10px] font-mono text-cyan-400 uppercase tracking-widest font-bold">Funding Classification</label>
        <select 
          name="fundType" 
          defaultValue={defaultValue?.fundType || (defaultValue?.jenis === 'SUMBANGAN' ? 'Hibah' : (defaultValue?.jenis === 'PENDANAAN' ? 'Investor' : 'Lainnya'))}
          className="bg-slate-950/50 border border-white/10 text-slate-200 p-3.5 rounded-xl focus:outline-none focus:border-cyan-400/50 transition-all text-sm appearance-none"
          required
        >
          {['Investor', 'Mitra', 'Hibah', 'Dana Sosial', 'Dana Titipan', 'Non Anggota', 'Kerjasama', 'Lainnya'].map(opt => (
            <option key={opt} value={opt}>{opt}</option>
          ))}
        </select>
      </div>

      <InputBox name="contributorName" label="Contributor Personnel" placeholder="Full name of representative..." defaultValue={defaultValue?.contributorName} required />
      <InputBox name="amount" label="Quantum Amount (IDR)" type="number" placeholder="0" defaultValue={defaultValue?.amount || defaultValue?.nominal} required />
      
      <div className="col-span-2">
        <div className="flex flex-col gap-2">
          <label className="text-[10px] font-mono text-cyan-400 uppercase tracking-widest font-bold px-1">Engagement Description</label>
          <textarea 
            name="description" 
            placeholder="Purpose of funds, terms, or conditions..."
            defaultValue={defaultValue?.description || defaultValue?.keterangan}
            className="bg-slate-950/50 border border-white/10 text-slate-200 p-4 rounded-2xl text-sm h-[100px] resize-none focus:ring-2 focus:ring-cyan-500/50 outline-none"
          ></textarea>
        </div>
      </div>
    </div>
    <CyberButton text={defaultValue ? "Update Resource Data" : "Register External Fund"} icon={<Database size={18} />} />
  </form>
);

const FormPinjaman = ({ onSubmit, anggota, handleSimulasi, simulationResult, defaultValue }: { 
  onSubmit: (e: React.FormEvent<HTMLFormElement>) => void, 
  anggota: Anggota[], 
  handleSimulasi: (e: React.MouseEvent) => void,
  simulationResult: any,
  defaultValue?: Pinjaman
}) => (
  <form onSubmit={onSubmit} className="space-y-6">
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      <div className="flex flex-col gap-2">
        <label className="text-[10px] font-mono text-cyan-400 uppercase font-bold">Pilih Anggota</label>
        <select name="id_anggota_pjm" defaultValue={defaultValue?.id_anggota} required className="bg-slate-950/50 border border-white/10 text-slate-200 p-3.5 rounded-xl text-sm">
          {anggota?.map((a: any) => <option key={a.id_anggota} value={a.id_anggota}>{a.nama} ({a.id_anggota})</option>)}
        </select>
      </div>
      <InputBox name="jumlah_pinjaman" label="Jumlah Pinjaman" type="number" placeholder="Rp 0" defaultValue={defaultValue?.jumlah_pinjaman} required />
      <div className="flex flex-col gap-2">
        <label className="text-[10px] font-mono text-cyan-400 uppercase font-bold">Tenor (Bulan)</label>
        <select name="tenor" defaultValue={defaultValue?.tenor} required className="bg-slate-950/50 border border-white/10 text-slate-200 p-3.5 rounded-xl text-sm">
          <option value="3">3 Bulan</option>
          <option value="6">6 Bulan</option>
          <option value="9">9 Bulan</option>
          <option value="12">12 Bulan</option>
        </select>
      </div>
      <InputBox name="bunga" label="Bunga (%)" type="number" placeholder="%" defaultValue={defaultValue?.bunga} required />
      <InputBox name="tanggal_mulai" label="Tanggal Mulai" type="date" placeholder="YYYY-MM-DD" defaultValue={defaultValue?.tanggal_mulai ? new Date(defaultValue.tanggal_mulai?.toDate?.() || defaultValue.tanggal_mulai).toISOString().split('T')[0] : ''} required />
    </div>
    <div className="flex gap-4">
      {!defaultValue && (
        <button 
          type="button" 
          onClick={handleSimulasi}
          className="px-6 py-3 bg-white/5 border border-white/10 rounded-lg text-cyan-400 text-[10px] font-bold tracking-widest uppercase hover:bg-white/10 transition-all font-mono"
        >
          Run Simulation
        </button>
      )}
      {(simulationResult || defaultValue) && (
        <CyberButton text={defaultValue ? "Update Core Logic" : "Execute Loan Facilitation"} icon={<ShieldCheck size={18} />} />
      )}
    </div>
  </form>
);

const RestockSystem = ({ products, suppliers, onSubmit }: { products: Produk[], suppliers: Supplier[], onSubmit: (items: any[], supplierId: string) => void }) => {
  const [selectedSupplier, setSelectedSupplier] = useState('');
  const [tempItems, setTempItems] = useState<{ id_produk: string; nama_produk: string; qty: number; harga_modal: number }[]>([]);

  const addItemToRestock = (p: Produk) => {
    setTempItems([...tempItems, { id_produk: p.id_produk, nama_produk: p.nama_produk, qty: 1, harga_modal: (p as any).harga_modal || 0 }]);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-2">
        <label className="text-[10px] font-mono text-cyan-400 uppercase font-bold">Pilih Supplier Source</label>
        <select 
          value={selectedSupplier}
          onChange={(e) => setSelectedSupplier(e.target.value)}
          className="bg-slate-950/50 border border-white/10 text-slate-200 p-3.5 rounded-xl text-sm"
        >
          <option value="">-- SELECT SUPPLIER --</option>
          {suppliers?.map(s => <option key={s.id_supplier} value={s.id_supplier}>{s.nama_supplier}</option>)}
        </select>
      </div>

      <div className="space-y-4">
        <label className="text-[10px] font-mono text-cyan-400 uppercase font-bold">Daftar Item Belanja</label>
        {tempItems?.map((item, idx) => (
          <div key={idx} className="grid grid-cols-4 gap-3 items-end glass p-3 rounded-xl border-white/5">
            <div className="col-span-1 text-[10px] text-white font-bold truncate">{item.nama_produk}</div>
            <div className="flex flex-col gap-1">
               <span className="text-[8px] text-slate-500 uppercase font-mono">Qty</span>
               <input 
                type="number" 
                value={item.qty} 
                onChange={(e) => {
                  const newItems = [...tempItems];
                  newItems[idx].qty = Number(e.target.value);
                  setTempItems(newItems);
                }}
                className="bg-slate-900 border border-white/10 rounded p-1.5 text-xs text-white"
               />
            </div>
            <div className="flex flex-col gap-1">
               <span className="text-[8px] text-slate-500 uppercase font-mono">Hrg Modal</span>
               <input 
                type="number" 
                value={item.harga_modal} 
                onChange={(e) => {
                  const newItems = [...tempItems];
                  newItems[idx].harga_modal = Number(e.target.value);
                  setTempItems(newItems);
                }}
                className="bg-slate-900 border border-white/10 rounded p-1.5 text-xs text-white"
               />
            </div>
            <button onClick={() => setTempItems(tempItems.filter((_, i) => i !== idx))} className="p-2 text-red-400"><Trash size={14}/></button>
          </div>
        ))}
        
        <div className="flex flex-col gap-2">
           <select 
            onChange={(e) => {
              const p = products.find(prod => prod.id_produk === e.target.value);
              if(p) addItemToRestock(p);
            }}
            className="bg-white/5 border border-white/5 text-slate-500 p-2 rounded text-[10px]"
           >
              <option value="">+ ADD ITEM FROM REPOSITORY</option>
              {products?.map(p => <option key={p.id_produk} value={p.id_produk}>{p.nama_produk} (Stock: {p.stok})</option>)}
           </select>
        </div>
      </div>

      <div className="pt-4 border-t border-white/5">
        <div className="flex justify-between items-center mb-4">
           <span className="text-[10px] font-mono text-slate-500 uppercase">Subtotal Modal</span>
           <span className="text-sm font-bold text-emerald-400">Rp {tempItems.reduce((a, c) => a + (c.qty * c.harga_modal), 0).toLocaleString('id-ID')}</span>
        </div>
        <button 
          onClick={() => {
            if(!selectedSupplier) return alert('Select supplier first');
            onSubmit(tempItems, selectedSupplier);
            setTempItems([]);
            setSelectedSupplier('');
          }}
          disabled={tempItems.length === 0}
          className="w-full py-4 bg-emerald-600 rounded-2xl text-white text-[10px] font-bold uppercase tracking-widest disabled:opacity-20"
        >
          Lock Restock Protocol
        </button>
      </div>
    </div>
  );
};

const FormProduk = ({ onSubmit, defaultValue, kategoriList, suppliers, onAddCategory, isSubmitting }: { onSubmit: (data: any) => void, defaultValue?: Produk, kategoriList: Kategori[], suppliers: Supplier[], onAddCategory: () => void, isSubmitting?: boolean }) => {
  const [jumlahBarang, setJumlahBarang] = useState(defaultValue?.jumlah_barang || 0);
  const [stokTotal, setStokTotal] = useState(defaultValue?.stok || 0);
  const [modal, setModal] = useState(defaultValue?.harga_modal || 0);
  const [syncStok, setSyncStok] = useState(!defaultValue);

  useEffect(() => {
    if (syncStok) {
      setStokTotal(jumlahBarang);
    }
  }, [jumlahBarang, syncStok]);

  const handleSubmitInternal = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const data = Object.fromEntries(formData.entries());
    
    // Validation
    const hargaModal = Number(data.harga_modal);
    const hargaJual = Number(data.harga_jual);
    const qty = Number(data.jumlah_barang);

    if (qty < 1) return alert('Jumlah barang minimal 1');
    if (hargaModal < 0) return alert('Harga modal tidak boleh negatif');
    if (hargaJual < 0) return alert('Harga jual tidak boleh negatif');
    if (!data.nama_produk) return alert('Nama barang wajib diisi');
    if (!data.kategori) return alert('Kategori wajib dipilih');

    onSubmit({ ...data, stok: stokTotal, total_modal_transaksi: qty * hargaModal });
  };

  return (
    <form onSubmit={handleSubmitInternal} className="space-y-8 bg-slate-900/40 p-6 rounded-3xl border border-white/5 shadow-2xl">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        {/* SECTION 1: SUPPLIER & TANGGAL */}
        <div className="space-y-6">
          <div className="flex flex-col gap-2">
            <label className="text-[10px] font-mono text-cyan-400 uppercase font-bold tracking-widest px-1">1. Supplier / Grosir Source</label>
            <select 
              name="id_supplier" 
              defaultValue={defaultValue?.supplier} 
              className="bg-slate-950/80 border border-white/10 text-slate-200 p-4 rounded-2xl text-sm focus:ring-2 focus:ring-cyan-500/50 outline-none transition-all appearance-none"
            >
              <option value="">-- BELI BEBAS --</option>
              {suppliers?.map(s => <option key={s.id_supplier} value={s.id_supplier}>{s.nama_supplier}</option>)}
            </select>
          </div>
          <div className="flex flex-col gap-2">
            <label className="text-[10px] font-mono text-cyan-400 uppercase font-bold tracking-widest px-1">2. Transaction Date</label>
            <input 
              type="date" 
              name="tanggal_pembelian" 
              defaultValue={defaultValue?.tanggal_pembelian ? new Date(defaultValue.tanggal_pembelian.toDate?.() || defaultValue.tanggal_pembelian).toISOString().split('T')[0] : new Date().toISOString().split('T')[0]}
              className="bg-slate-950/80 border border-white/10 text-slate-200 p-4 rounded-2xl text-sm focus:ring-2 focus:ring-cyan-500/50 outline-none transition-all"
            />
          </div>
        </div>

        {/* SECTION 2: KATEGORI & NAMA */}
        <div className="space-y-6">
          <div className="flex flex-col gap-2">
            <div className="flex justify-between items-center px-1">
              <label className="text-[10px] font-mono text-cyan-400 uppercase font-bold tracking-widest">3. Category Protocol</label>
              <button 
                type="button" 
                onClick={onAddCategory}
                className="text-emerald-400 hover:text-emerald-300 transition-colors flex items-center gap-1 text-[10px] uppercase font-bold"
              >
                <Plus size={12} /> New Module
              </button>
            </div>
            <select 
              name="kategori" 
              defaultValue={defaultValue?.kategori} 
              className="bg-slate-950/80 border border-white/10 text-slate-200 p-4 rounded-2xl text-sm focus:ring-2 focus:ring-cyan-500/50 outline-none transition-all appearance-none"
              required
            >
              <option value="">-- SELECT CATEGORY --</option>
              {kategoriList?.map(cat => <option key={cat.id_kategori} value={cat.nama_kategori}>{cat.nama_kategori}</option>)}
            </select>
          </div>
          <InputBox name="nama_produk" label="4. Product Designation" placeholder="Input product name..." defaultValue={defaultValue?.nama_produk} required />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        {/* SECTION 3: SATUAN & JUMLAH */}
        <div className="grid grid-cols-2 gap-4">
          <div className="flex flex-col gap-2">
            <label className="text-[10px] font-mono text-cyan-400 uppercase font-bold tracking-widest px-1">5. Measurement Unit</label>
            <select 
              name="satuan" 
              defaultValue={defaultValue?.satuan || 'Pcs'} 
              className="bg-slate-950/80 border border-white/10 text-slate-200 p-4 rounded-2xl text-sm focus:ring-2 focus:ring-cyan-500/50 outline-none transition-all appearance-none"
            >
              <option value="Pcs">Pcs</option>
              <option value="Kg">Kg</option>
              <option value="Dus">Dus</option>
              <option value="Liter">Liter</option>
              <option value="Box">Box</option>
              <option value="Pack">Pack</option>
              <option value="Lainnya">Lainnya</option>
            </select>
          </div>
          <div className="flex flex-col gap-2">
            <label className="text-[10px] font-mono text-cyan-400 uppercase font-bold tracking-widest px-1">6. Quantity Inbound</label>
            <input 
              type="number" 
              name="jumlah_barang" 
              value={jumlahBarang}
              onChange={(e) => setJumlahBarang(Number(e.target.value))}
              placeholder="0"
              className="bg-slate-950/80 border border-white/10 text-slate-200 p-4 rounded-2xl text-sm focus:ring-2 focus:ring-cyan-500/50 outline-none transition-all"
              required 
              min="1"
            />
          </div>
        </div>

        {/* SECTION 4: HARGA */}
        <div className="grid grid-cols-2 gap-4">
          <div className="flex flex-col gap-2">
            <label className="text-[10px] font-mono text-cyan-400 uppercase font-bold tracking-widest px-1">7. Modal Price (Per Unit)</label>
            <input 
              type="number" 
              name="harga_modal" 
              value={modal}
              onChange={(e) => setModal(Number(e.target.value))}
              placeholder="Rp 0"
              className="bg-slate-950/80 border border-white/10 text-slate-200 p-4 rounded-2xl text-sm focus:ring-2 focus:ring-cyan-500/50 outline-none transition-all font-mono"
              required 
              min="0"
            />
          </div>
          <div className="flex flex-col gap-2">
            <label className="text-[10px] font-mono text-cyan-400 uppercase font-bold tracking-widest px-1">8. Selling Price (Per Unit)</label>
            <input 
              type="number" 
              name="harga_jual" 
              defaultValue={defaultValue?.harga_jual}
              placeholder="Rp 0"
              className="bg-slate-950/80 border border-white/10 text-slate-200 p-4 rounded-2xl text-sm focus:ring-2 focus:ring-cyan-500/50 outline-none transition-all font-mono"
              required 
              min="0"
            />
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-start">
        {/* SECTION 5: STOK & KETERANGAN */}
        <div className="space-y-4">
          <div className="flex flex-col gap-2">
            <div className="flex justify-between items-center px-1">
              <label className="text-[10px] font-mono text-cyan-400 uppercase font-bold tracking-widest">9. Live System Stock</label>
              <button 
                type="button" 
                onClick={() => setSyncStok(!syncStok)}
                className={`text-[8px] font-bold px-3 py-1 rounded-full transition-all ${syncStok ? 'bg-cyan-500/20 text-cyan-400 border border-cyan-500/30' : 'bg-slate-800 text-slate-500 border border-white/5'}`}
              >
                {syncStok ? 'AUTO-SYNC ACTIVE' : 'MANUAL OVERRIDE'}
              </button>
            </div>
            <input 
              type="number" 
              name="stok" 
              value={stokTotal}
              onChange={(e) => {
                setSyncStok(false);
                setStokTotal(Number(e.target.value));
              }}
              className={`bg-slate-950/80 border border-white/10 text-slate-200 p-4 rounded-2xl text-sm focus:ring-2 focus:ring-cyan-500/50 outline-none transition-all ${syncStok ? 'opacity-50 cursor-not-allowed' : ''}`}
            />
            <div className="flex justify-between items-center px-2">
              <p className="text-[10px] font-mono text-slate-500 uppercase tracking-tighter">Inventory Valuation:</p>
              <p className="text-xs font-bold text-emerald-400 font-mono">Rp {(jumlahBarang * modal).toLocaleString('id-ID')}</p>
            </div>
          </div>
        </div>
        <div className="flex flex-col gap-2">
          <label className="text-[10px] font-mono text-cyan-400 uppercase font-bold tracking-widest px-1">10. Additional Metadata (Notes)</label>
          <textarea 
            name="keterangan" 
            placeholder="Operational notes, batch info, or shelf location..."
            defaultValue={defaultValue?.keterangan}
            className="bg-slate-950/80 border border-white/10 text-slate-200 p-4 rounded-2xl text-sm h-[110px] resize-none focus:ring-2 focus:ring-cyan-500/50 outline-none transition-all"
          ></textarea>
        </div>
      </div>

      <div className="flex gap-4 pt-6 border-t border-white/5">
        <button 
          type="submit" 
          disabled={isSubmitting}
          className="flex-1 py-5 bg-gradient-to-r from-cyan-600 to-emerald-600 rounded-2xl text-white text-[11px] font-bold tracking-[0.3em] uppercase shadow-lg shadow-cyan-950/20 hover:scale-[1.02] active:scale-95 transition-all flex items-center justify-center gap-3 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isSubmitting ? (
            <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
          ) : (
            <PlusCircle size={20} />
          )}
          {defaultValue ? "Commit Product Patch" : "Authenticate New Inbound"}
        </button>
        <button 
          type="reset" 
          onClick={() => {
            setJumlahBarang(0);
            setModal(0);
            setStokTotal(0);
            setSyncStok(true);
          }}
          className="px-10 py-5 bg-white/5 border border-white/10 rounded-2xl text-slate-400 text-[11px] font-bold uppercase tracking-widest hover:bg-white/10 hover:text-white transition-all active:scale-95"
        >
          Factory Reset
        </button>
      </div>
    </form>
  );
};

const CategoryModal = ({ isOpen, onClose, onAdd }: { isOpen: boolean, onClose: () => void, onAdd: (name: string) => void }) => {
  const [name, setName] = useState('');
  if (!isOpen) return null;

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md"
      onClick={onClose}
    >
      <motion.div 
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        onClick={(e) => e.stopPropagation()}
        className="bg-slate-900 border border-white/10 p-8 rounded-3xl w-full max-w-md shadow-2xl space-y-6"
      >
        <div className="space-y-2">
          <h3 className="text-xl font-bold text-white uppercase tracking-tighter">New Category Node</h3>
          <p className="text-[10px] font-mono text-slate-500 uppercase">Initialize new classification in registry</p>
        </div>
        
        <div className="space-y-2">
          <label className="text-[10px] font-mono text-cyan-400 uppercase font-bold tracking-widest px-1">Category Label</label>
          <input 
            autoFocus
            type="text" 
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. Sembako, Elektronik..." 
            className="w-full bg-slate-950/80 border border-white/10 text-slate-200 p-4 rounded-2xl text-sm focus:ring-2 focus:ring-emerald-500/50 outline-none transition-all"
          />
        </div>

        <div className="flex gap-4">
          <button 
            onClick={() => onAdd(name)}
            disabled={!name.trim()}
            className="flex-1 py-4 bg-gradient-to-r from-emerald-600 to-cyan-600 rounded-2xl text-white text-[10px] font-bold uppercase tracking-widest hover:scale-[1.02] active:scale-95 transition-all disabled:opacity-50"
          >
            Authenticate Category
          </button>
          <button 
            onClick={onClose}
            className="px-6 py-4 bg-white/5 border border-white/10 rounded-2xl text-slate-400 text-[10px] font-bold uppercase hover:text-white transition-all"
          >
            Abort
          </button>
        </div>
      </motion.div>
    </div>
  );
};

const FormSettings = ({ onSubmit, config }: { onSubmit: (e: React.FormEvent<HTMLFormElement>) => void, config: { simpanan_pokok: number } }) => (
  <form onSubmit={onSubmit} className="space-y-6">
    <div className="p-6 bg-cyan-500/5 border border-cyan-500/10 rounded-2xl">
      <p className="text-[10px] font-mono text-cyan-400 uppercase tracking-widest mb-4">Core Financial Parameters</p>
      <InputBox 
        name="simpanan_pokok" 
        label="Simpanan Pokok (Initial Capital)" 
        type="number" 
        placeholder="Rp 50.000" 
        defaultValue={config.simpanan_pokok}
        required 
      />
      <p className="text-[9px] text-slate-500 mt-2 italic">* Nilai ini akan digunakan secara otomatis saat pendaftaran anggota baru.</p>
    </div>
    <CyberButton text="Update Core Parameters" icon={<Settings size={18} />} />
  </form>
);

// ==========================================
// REUSABLE UI COMPONENTS
// ==========================================

const SidebarButton = ({ label, active, onClick }: { label: string, active: boolean, onClick: () => void }) => (
  <button 
    onClick={onClick}
    className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-300 group ${
      active 
        ? 'bg-cyan-500/10 text-cyan-400 border border-cyan-500/20' 
        : 'text-slate-400 hover:bg-white/5 hover:text-slate-200'
    }`}
  >
    <span className="text-[10px] font-bold tracking-widest uppercase">{label}</span>
    {active && (
      <div className="ml-auto w-1 h-1 bg-cyan-400 rounded-full shadow-[0_0_8px_#22d3ee]"></div>
    )}
  </button>
);

const Pagination = ({ current, total, onPageChange }: { current: number, total: number, onPageChange: (p: number) => void }) => {
  if (total <= 1) return null;
  return (
    <div className="flex items-center justify-center gap-2 mt-6">
      <button 
        disabled={current === 1}
        onClick={() => onPageChange(current - 1)}
        className="p-2 glass border-white/5 rounded-xl disabled:opacity-30 text-cyan-400 hover:bg-cyan-500/10 transition-all font-mono text-[10px]"
      >
        <ChevronLeft size={14} />
      </button>
      <span className="text-[10px] font-mono text-slate-500 uppercase tracking-widest">Page {current} of {total}</span>
      <button 
        disabled={current === total}
        onClick={() => onPageChange(current + 1)}
        className="p-2 glass border-white/5 rounded-xl disabled:opacity-30 text-cyan-400 hover:bg-cyan-500/10 transition-all font-mono text-[10px]"
      >
        <ChevronRight size={14} />
      </button>
    </div>
  );
};

const GlassCard = React.memo(({ children, title, className = "" }: { children: React.ReactNode, title?: string, className?: string }) => (
  <div className={`glass p-8 rounded-3xl border-slate-700/50 relative overflow-hidden flex flex-col gap-6 min-w-0 ${className}`}>
    <div className="absolute top-0 left-0 w-full h-[1px] bg-gradient-to-r from-transparent via-cyan-400/30 to-transparent"></div>
    {title && (
      <div className="space-y-1">
        <h3 className="text-xl font-bold text-white flex items-center gap-2 uppercase tracking-tight">{title}</h3>
      </div>
    )}
    {children}
  </div>
));

const InputBox = ({ label, placeholder, name, type = 'text', required = false, defaultValue }: { label: string, placeholder: string, name: string, type?: string, required?: boolean, defaultValue?: any }) => (
  <div className="flex flex-col gap-2 group">
    <label className="text-[10px] font-mono text-cyan-400 uppercase tracking-widest font-bold">{label}</label>
    <input 
      name={name}
      type={type} 
      required={required}
      placeholder={placeholder} 
      defaultValue={defaultValue}
      className="bg-slate-950/50 border border-white/10 text-slate-200 p-3.5 rounded-xl focus:outline-none focus:border-cyan-400/50 transition-all placeholder-slate-600 text-sm font-light"
    />
  </div>
);

const CyberButton = ({ text, icon }: { text: string, icon: React.ReactNode }) => (
  <button type="submit" className="px-6 py-3 bg-gradient-to-r from-cyan-600 to-purple-600 rounded-lg text-white text-[10px] font-bold tracking-widest uppercase glow-purple hover:scale-[1.02] active:scale-95 transition-transform flex items-center gap-2 w-fit">
    {icon} {text}
  </button>
);

const StatCard = React.memo(({ title, value, metric, glow, color, icon }: { title: string, value: string, metric: string, glow?: boolean, color: 'cyan' | 'emerald' | 'purple' | 'slate' | 'orange', icon?: React.ReactNode }) => {
  const colorMap = {
    cyan: 'text-cyan-400',
    emerald: 'text-emerald-400',
    purple: 'text-purple-400',
    slate: 'text-slate-400',
    orange: 'text-orange-400'
  };

  return (
    <div className={`glass p-5 rounded-2xl min-w-0 ${glow ? 'glow-cyan' : ''} transition-all hover:translate-y-[-2px] duration-300`}>
      <div className="flex justify-between items-start mb-2">
        <p className={`text-[10px] font-mono uppercase ${colorMap[color]} tracking-widest`}>{title}</p>
        {icon && <div className={`${colorMap[color]} opacity-60`}>{icon}</div>}
      </div>
      <div className="flex flex-col gap-1">
        <h3 className="text-2xl font-bold text-white tracking-tight leading-none">{value}</h3>
        <p className="text-[10px] text-slate-500 font-mono italic mt-1">{metric}</p>
      </div>
    </div>
  );
});

