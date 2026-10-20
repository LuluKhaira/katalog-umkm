"use client";

import { useTransition } from "react";
import { formatRupiah } from "@/lib/format";
import Tombol from "@/components/Tombol";
import { hapusProduk, toggleAktifProduk } from "@/app/admin/actions";

// US-07 (Daftar), US-10 (Hapus), US-32 (Toggle Status Aktif/Nonaktif)
export default function TabelProduk({ daftarProduk = [] }) {
  const [isPending, startTransition] = useTransition();

  const handleHapus = (id, nama) => {
    if (window.confirm(`Yakin ingin menghapus produk "${nama}"?`)) {
      startTransition(async () => {
        const res = await hapusProduk(id);
        if (res?.error) {
          alert(res.error);
        }
      });
    }
  };

  const handleToggleAktif = (id, statusAktif) => {
    startTransition(async () => {
      const res = await toggleAktifProduk(id, !statusAktif);
      if (res?.error) {
        alert(res.error);
      }
    });
  };

  return (
    <div className="overflow-x-auto rounded-2xl border border-garis">
      <table className="w-full min-w-[640px] text-left text-sm">
        <thead className="bg-permukaan text-teks-lembut">
          <tr>
            <th className="px-4 py-3 font-semibold">Produk</th>
            <th className="px-4 py-3 font-semibold">Kategori</th>
            <th className="px-4 py-3 font-semibold">Harga</th>
            <th className="px-4 py-3 font-semibold">Status (US-32)</th>
            <th className="px-4 py-3 font-semibold text-right">
              <span className="sr-only">Aksi</span>
            </th>
          </tr>
        </thead>
        <tbody>
          {daftarProduk.map((produk) => {
            const isAktif = produk.aktif !== false;
            return (
              <tr key={produk.id} className="border-t border-garis hover:bg-permukaan/50">
                <td className="px-4 py-3">
                  <div className="flex items-center gap-3">
                    <img
                      src={produk.foto_url || "/produk/keripik.svg"}
                      alt=""
                      className="h-10 w-10 rounded-md object-cover bg-permukaan"
                    />
                    <span className="font-semibold">{produk.nama}</span>
                  </div>
                </td>
                <td className="px-4 py-3 text-teks-lembut">{produk.kategori || "-"}</td>
                <td className="px-4 py-3 font-medium">{formatRupiah(produk.harga)}</td>
                <td className="px-4 py-3">
                  <button
                    type="button"
                    onClick={() => handleToggleAktif(produk.id, isAktif)}
                    disabled={isPending}
                    className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold transition-colors ${
                      isAktif
                        ? "bg-emerald-500/10 text-emerald-600 hover:bg-emerald-500/20 dark:text-emerald-400"
                        : "bg-garis text-teks-lembut hover:bg-garis/80"
                    }`}
                    title={isAktif ? "Klik untuk menonaktifkan produk" : "Klik untuk mengaktifkan produk"}
                  >
                    <span
                      className={`h-1.5 w-1.5 rounded-full ${
                        isAktif ? "bg-emerald-500" : "bg-teks-lembut"
                      }`}
                    />
                    {isAktif ? "Aktif" : "Nonaktif"}
                  </button>
                </td>
                <td className="px-4 py-3">
                  <div className="flex justify-end gap-2">
                    <Tombol href={`/admin/produk/${produk.id}/ubah`} varian="garis">
                      Ubah
                    </Tombol>
                    <Tombol
                      type="button"
                      varian="bahaya"
                      onClick={() => handleHapus(produk.id, produk.nama)}
                      disabled={isPending}
                    >
                      Hapus
                    </Tombol>
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
