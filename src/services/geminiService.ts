import { GoogleGenAI } from "@google/genai";

// Initialize Gemini
const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || '' });

export async function generateSmartReport(totalSimpanan: number, totalAnggota: number) {
  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: `Sebagai konsultan keuangan Koperasi Smart Systema yang futuristik, buatkan laporan analisis singkat. 
      Data saat ini:
      - Total simpanan anggota: Rp ${totalSimpanan.toLocaleString('id-ID')}
      - Total anggota aktif: ${totalAnggota} node.
      
      Berikan 3 poin rekomendasi strategis untuk pengembangan Unit Usaha, Unit Simpan Pinjam, dan Unit Jasa berdasarkan tren digitalisasi. 
      Gunakan bahasa yang profesional dan futuristik.`,
    });

    return response.text;
  } catch (error) {
    console.error("Gemini AI Error:", error);
    throw error;
  }
}
