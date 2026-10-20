"use client";

import { createContext, useContext, useEffect, useState } from "react";

const KeranjangContext = createContext({
  items: [],
  tambahItem: () => {},
  ubahJumlah: () => {},
  hapusItem: () => {},
  kosongkanKeranjang: () => {},
  totalItem: 0,
  totalHarga: 0,
  isLoaded: false,
});

const STORAGE_KEY = "katalog_umkm_keranjang";

export function KeranjangProvider({ children }) {
  const [items, setItems] = useState([]);
  const [isLoaded, setIsLoaded] = useState(false);

  // Muat data dari localStorage saat client mount (mencegah hydration mismatch)
  useEffect(() => {
    try {
      const data = localStorage.getItem(STORAGE_KEY);
      if (data) {
        setItems(JSON.parse(data));
      }
    } catch (e) {
      console.error("Gagal membaca keranjang:", e);
    }
    setIsLoaded(true);
  }, []);

  // Simpan data ke localStorage setiap kali items berubah
  useEffect(() => {
    if (isLoaded) {
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
      } catch (e) {
        console.error("Gagal menyimpan keranjang:", e);
      }
    }
  }, [items, isLoaded]);

  const tambahItem = (produk, jumlah = 1, varian = "Standar") => {
    const qty = Math.max(1, parseInt(jumlah, 10) || 1);
    const hargaAktif =
      typeof produk.harga_diskon === "number" && produk.harga_diskon > 0
        ? produk.harga_diskon
        : produk.harga;

    setItems((prev) => {
      const index = prev.findIndex(
        (item) => item.id === produk.id && item.varian === varian
      );
      if (index > -1) {
        const updated = [...prev];
        updated[index] = {
          ...updated[index],
          jumlah: updated[index].jumlah + qty,
        };
        return updated;
      }
      return [
        ...prev,
        {
          id: produk.id,
          nama: produk.nama,
          harga: hargaAktif,
          foto_url: produk.foto_url,
          varian,
          jumlah: qty,
        },
      ];
    });
  };

  const ubahJumlah = (id, varian, jumlah) => {
    const qty = parseInt(jumlah, 10);
    if (qty <= 0) {
      hapusItem(id, varian);
      return;
    }
    setItems((prev) =>
      prev.map((item) =>
        item.id === id && item.varian === varian
          ? { ...item, jumlah: qty }
          : item
      )
    );
  };

  const hapusItem = (id, varian) => {
    setItems((prev) =>
      prev.filter((item) => !(item.id === id && item.varian === varian))
    );
  };

  const kosongkanKeranjang = () => {
    setItems([]);
  };

  const totalItem = isLoaded
    ? items.reduce((sum, item) => sum + item.jumlah, 0)
    : 0;

  const totalHarga = isLoaded
    ? items.reduce((sum, item) => sum + item.harga * item.jumlah, 0)
    : 0;

  return (
    <KeranjangContext.Provider
      value={{
        items: isLoaded ? items : [],
        tambahItem,
        ubahJumlah,
        hapusItem,
        kosongkanKeranjang,
        totalItem,
        totalHarga,
        isLoaded,
      }}
    >
      {children}
    </KeranjangContext.Provider>
  );
}

export function useKeranjang() {
  return useContext(KeranjangContext);
}

