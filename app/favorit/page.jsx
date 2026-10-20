"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useFavorit } from "@/lib/favorit-context";
import { ambilProdukFavorit } from "@/app/admin/actions";
import KartuProduk from "@/components/KartuProduk";
import Tombol from "@/components/Tombol";

// US-24: Halaman Favorit Tersimpan
export default function HalamanFavorit() {
  const { favoritIds, isLoaded } = useFavorit();
  const [produkList, setProdukList] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadFavorit() {
      if (!isLoaded) return;
      if (favoritIds.length === 0) {
        setProdukList([]);
        setLoading(false);
        return;
      }
      setLoading(true);
      try {
        const data = await ambilProdukFavorit(favoritIds);
        setProdukList(data);
      } catch (e) {
        console.error("Gagal mengambil data produk favorit:", e);
      } finally {
        setLoading(false);
      }
    }
    loadFavorit();
  }, [favoritIds, isLoaded]);

  if (!isLoaded || loading) {
    return (
      <div className="py-16 text-center text-teks-lembut">
        <p>Memuat produk favorit Anda...</p>
      </div>
    );
  }

  if (produkList.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center gap-4 py-20 text-center">
        <h1 className="text-2xl font-extrabold">Produk Favorit</h1>
        <p className="text-teks-lembut">
          Belum ada produk yang Anda tandai sebagai favorit.
        </p>
        <Tombol href="/">Jelajahi Katalog</Tombol>
      </div>
    );
  }

  return (
    <div className="py-8">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-extrabold sm:text-3xl">
          Produk Favorit ({produkList.length})
        </h1>
        <Link
          href="/"
          className="text-sm text-teks-lembut underline underline-offset-4 hover:text-utama"
        >
          Kembali ke beranda
        </Link>
      </div>

      <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-4">
        {produkList.map((produk) => (
          <KartuProduk key={produk.id} produk={produk} />
        ))}
      </div>
    </div>
  );
}

