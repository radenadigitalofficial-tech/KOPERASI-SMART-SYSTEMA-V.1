import React, { useEffect, useState } from "react";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from "recharts";
import { collection, onSnapshot, query, orderBy } from "firebase/firestore";
import { db } from "../../services/firebase";
import { handleFirestoreError, OperationType } from "../../utils/firestoreUtils";

import UltraSafeChart from "./UltraSafeChart";

export default function SavingsChart() {
  const [chartData, setChartData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // We listen to 'transaksi' collection as defined in KoperasiSmartSystema
    const q = query(
      collection(db, "transaksi"),
      orderBy("tanggal", "asc")
    );

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const docs = snapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        })) as any[];

        // Process data for the chart: group by month
        const monthNames = ["Jan", "Feb", "Mar", "Apr", "Mei", "Jun", "Jul", "Agu", "Sep", "Okt", "Nov", "Des"];
        const groupedData: { [key: string]: number } = {};

        // Only count 'MASUK' for savings types (POKOK, WAJIB, SUKARELA, TABUNG)
        docs.forEach((t) => {
          if (!t.tanggal) return;
          const date = t.tanggal.toDate ? t.tanggal.toDate() : new Date(t.tanggal);
          const monthKey = monthNames[date.getMonth()];
          
          if (['POKOK', 'WAJIB', 'SUKARELA', 'TABUNG'].includes(t.jenis)) {
            const nominal = t.nominal || 0;
            if (t.tipe === 'MASUK') {
              groupedData[monthKey] = (groupedData[monthKey] || 0) + nominal;
            }
          }
        });

        const formattedData = monthNames
          .filter(m => groupedData[m] !== undefined)
          .map((m) => ({
            name: m,
            total: groupedData[m],
          }));

        setChartData(formattedData);
        setLoading(false);
      },
      (error) => {
        handleFirestoreError(error, OperationType.LIST, "transaksi");
      }
    );

    return () => unsubscribe();
  }, []);

  return (
    <div className="w-full min-w-0">
      <div className="rounded-[2.5rem] border border-cyan-500/20 bg-slate-900/60 p-8 shadow-2xl">
        <h2 className="mb-8 text-xl font-black text-cyan-400 uppercase tracking-tighter">
          Grafik Simpanan
        </h2>

        <UltraSafeChart
          data={chartData}
          loading={loading}
          height={320}
        >
          <ResponsiveContainer
            width="99%"
            height="99%"
          >
            <BarChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />

              <XAxis dataKey="name" stroke="#64748b" fontSize={11} tickLine={false} axisLine={false} />

              <YAxis 
                stroke="#64748b" 
                fontSize={11} 
                tickLine={false} 
                axisLine={false}
                tickFormatter={(value) => `Rp ${(value / 1000000).toFixed(1)}jt`}
              />

              <Tooltip 
                contentStyle={{ backgroundColor: "#0f172a", border: "1px solid rgba(255,255,255,0.1)", borderRadius: "16px", boxShadow: "0 10px 30px rgba(0,0,0,0.5)" }}
                itemStyle={{ color: "#22d3ee" }}
                formatter={(value: number) => [`Rp ${value.toLocaleString('id-ID')}`, "Total"]}
              />

              <Bar
                dataKey="total"
                fill="#06b6d4"
                radius={[12, 12, 0, 0]}
                barSize={40}
              />
            </BarChart>
          </ResponsiveContainer>
        </UltraSafeChart>
      </div>
    </div>
  );
}
