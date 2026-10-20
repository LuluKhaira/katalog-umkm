import NavAdmin from "@/components/NavAdmin";
import { createSessionClient } from "@/lib/supabase/session";
import KelolaKategoriClient from "./kelola-kategori-client";

export const dynamic = "force-dynamic";

// US-31: Halaman Kelola Kategori Admin
export default async function HalamanKelolaKategori() {
  let daftarKategori = [];
  let ringkasanPemakaian = {};
  let errorMsg = null;

  try {
    const supabase = await createSessionClient();

    // 1. Ambil data kategori dari tabel kategori
    const { data: katData, error: katError } = await supabase
      .from("kategori")
      .select("*")
      .order("nama", { ascending: true });

    if (katError && !katError.message?.includes("does not exist")) {
      errorMsg = katError.message;
    } else if (katData) {
      daftarKategori = katData;
    }

    // 2. Hitung berapa banyak produk yang menggunakan masing-masing kategori
    const { data: prodData } = await supabase.from("produk").select("kategori");
    if (prodData) {
      prodData.forEach((p) => {
        if (p.kategori) {
          ringkasanPemakaian[p.kategori] = (ringkasanPemakaian[p.kategori] || 0) + 1;
        }
      });
    }

    // Fallback jika tabel kategori belum dibuat di SQL: buat daftar dari produk
    if (daftarKategori.length === 0 && Object.keys(ringkasanPemakaian).length > 0) {
      daftarKategori = Object.keys(ringkasanPemakaian).map((nama, idx) => ({
        id: idx + 1,
        nama,
        slug: nama.toLowerCase().replace(/[^a-z0-9]+/g, "-"),
      }));
    }
  } catch (e) {
    errorMsg = e.message;
  }

  return (
    <div className="flex flex-col gap-6 py-8">
      <NavAdmin />
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-extrabold">Kelola Kategori</h1>
      </div>

      {errorMsg && (
        <div className="rounded-lg border border-bahaya/20 bg-bahaya/10 p-4 text-sm text-bahaya">
          {errorMsg}
        </div>
      )}

      <KelolaKategoriClient
        daftarKategoriAwal={daftarKategori}
        ringkasanPemakaian={ringkasanPemakaian}
      />
    </div>
  );
}

