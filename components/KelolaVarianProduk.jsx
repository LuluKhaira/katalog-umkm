"use client";

import { useTransition, useState } from "react";
import { formatRupiah } from "@/lib/format";
import Tombol from "@/components/Tombol";
import { tambahVarianProduk, hapusVarianProduk } from "@/app/admin/actions";

// US-48: Komponen Kelola Varian Harga per Ukuran di Halaman Admin
export default function KelolaVarianProduk({ produkId, daftarVarian = [] }) {
  const [isPending, startTransition] = useTransition();
  const [namaVarian, setNamaVarian] = useState("");
  const [hargaVarian, setHargaVarian] = useState("");
  const [errorMsg, setErrorMsg] = useState(null);

  const handleTambah = (e) => {
    e.preventDefault();
    setErrorMsg(null);

    if (!namaVarian.trim()) {
      setErrorMsg("Nama varian wajib diisi (contoh: Ukuran S, 250 gram, dll).");
      return;
    }

    const harga = parseInt(hargaVarian, 10);
    if (isNaN(harga) || harga < 0) {
      setErrorMsg("Harga varian harus berupa angka non-negatif.");
      return;
    }

    startTransition(async () => {
      const res = await tambahVarianProduk(produkId, namaVarian, harga);
      if (res?.error) {
        setErrorMsg(res.error);
      } else {
        setNamaVarian("");
        setHargaVarian("");
      }
    });
  };

  const handleHapus = (varianId, nama) => {
    if (window.confirm(`Hapus varian "${nama}"?`)) {
      startTransition(async () => {
        const res = await hapusVarianProduk(varianId, produkId);
        if (res?.error) setErrorMsg(res.error);
      });
    }
  };

  return (
    <section className="mt-8 rounded-2xl border border-garis bg-latar p-6 max-w-xl shadow-xs">
      <div className="mb-4">
        <h2 className="text-lg font-bold text-teks">Kelola Varian Harga (US-48)</h2>
        <p className="text-xs text-teks-lembut">
          Atur pilihan ukuran/varian khusus dengan harga berbeda. Pengunjung di halaman produk dapat memilih varian ini dan harga otomatis menyesuaikan.
        </p>
      </div>

      {errorMsg && (
        <div className="mb-4 rounded-lg border border-bahaya/20 bg-bahaya/10 p-3 text-xs text-bahaya">
          {errorMsg}
        </div>
      )}

      {/* Form Tambah Varian */}
      <form onSubmit={handleTambah} className="grid grid-cols-1 sm:grid-cols-5 gap-3 items-end mb-6">
        <div className="sm:col-span-2 flex flex-col gap-1">
          <label htmlFor="nama_varian" className="text-xs font-semibold text-teks">
            Nama Varian
          </label>
          <input
            id="nama_varian"
            type="text"
            placeholder="Misal: Ukuran L / 500g"
            value={namaVarian}
            onChange={(e) => setNamaVarian(e.target.value)}
            className="rounded-lg border border-garis bg-permukaan px-3 py-2 text-sm text-teks focus:border-utama focus:outline-none"
            required
          />
        </div>

        <div className="sm:col-span-2 flex flex-col gap-1">
          <label htmlFor="harga_varian" className="text-xs font-semibold text-teks">
            Harga Varian (Rp)
          </label>
          <input
            id="harga_varian"
            type="number"
            min="0"
            placeholder="Misal: 35000"
            value={hargaVarian}
            onChange={(e) => setHargaVarian(e.target.value)}
            className="rounded-lg border border-garis bg-permukaan px-3 py-2 text-sm text-teks focus:border-utama focus:outline-none"
            required
          />
        </div>

        <div className="sm:col-span-1">
          <Tombol type="submit" disabled={isPending} className="w-full text-xs py-2 px-2">
            {isPending ? "..." : "+ Tambah"}
          </Tombol>
        </div>
      </form>

      {/* Daftar Varian yang ada */}
      {daftarVarian.length === 0 ? (
        <div className="rounded-xl border border-garis bg-permukaan/50 p-4 text-center text-xs text-teks-lembut">
          Belum ada varian ukuran/harga khusus. Produk ini menggunakan harga normal biasa.
        </div>
      ) : (
        <div className="flex flex-col divide-y divide-garis border border-garis rounded-xl bg-latar overflow-hidden">
          {daftarVarian.map((v) => (
            <div key={v.id} className="flex items-center justify-between p-3 text-sm">
              <div>
                <span className="font-semibold text-teks">{v.nama}</span>
                <span className="ml-2 text-xs font-bold text-harga">
                  {formatRupiah(v.harga)}
                </span>
              </div>
              <button
                type="button"
                onClick={() => handleHapus(v.id, v.nama)}
                disabled={isPending}
                className="text-xs font-semibold text-bahaya hover:underline disabled:opacity-50 cursor-pointer"
              >
                Hapus
              </button>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}

