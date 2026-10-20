"use client";

import { useEffect, useState } from "react";
import KartuProduk from "@/components/KartuProduk";
import { ambilProdukByIds } from "@/app/admin/actions";

// US-36: Deretan Produk Terakhir Dilihat dari localStorage (maksimal 8 produk)
export default function TerakhirDilihat() {
  const [produkList, setProdukList] = useState([]);
  const [sudahDimuat, setSudahDimuat] = useState(false);

  useEffect(() => {
    let dipasang = true;

    async function muatRiwayat() {
      try {
        const tersimpan = JSON.parse(localStorage.getItem("katalog_terakhir_dilihat") || "[]");
        if (Array.isArray(tersimpan) && tersimpan.length > 0) {
          const hasil = await ambilProdukByIds(tersimpan);
          if (dipasang) {
            setProdukList(hasil);
          }
        }
      } catch (e) {
        // Abaikan error parsing json
      } finally {
        if (dipasang) setSudahDimuat(true);
      }
    }

    muatRiwayat();

    return () => {
      dipasang = false;
    };
  }, []);

  const handleHapusRiwayat = () => {
    try {
      localStorage.removeItem("katalog_terakhir_dilihat");
      setProdukList([]);
    } catch (e) {}
  };

  // Jangan render apa pun sebelum client selesai memuat atau jika tidak ada riwayat
  if (!sudahDimuat || produkList.length === 0) {
    return null;
  }

  return (
    <section
      className="mt-14 flex flex-col gap-4 border-t border-garis pt-8"
      aria-labelledby="judul-terakhir-dilihat"
    >
      <div className="flex items-center justify-between">
        <h2 id="judul-terakhir-dilihat" className="text-xl font-bold flex items-center gap-2">
          <span>🕒</span> Terakhir Dilihat
        </h2>
        <button
          type="button"
          onClick={handleHapusRiwayat}
          className="text-xs text-teks-lembut hover:text-bahaya transition-colors cursor-pointer"
        >
          Hapus riwayat
        </button>
      </div>

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
        {produkList.map((produk) => (
          <KartuProduk key={produk.id} produk={produk} />
        ))}
      </div>
    </section>
  );
}

