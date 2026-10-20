"use client";

import { useTransition } from "react";
import Tombol from "@/components/Tombol";
import { toggleTampilUlasan, hapusUlasan } from "@/app/admin/actions";

// US-39: Tabel Moderasi Ulasan oleh Admin
export default function TabelUlasanAdmin({ daftarUlasan = [] }) {
  const [isPending, startTransition] = useTransition();

  const handleToggle = (id, currentTampil) => {
    startTransition(async () => {
      const res = await toggleTampilUlasan(id, !currentTampil);
      if (res?.error) {
        alert(res.error);
      }
    });
  };

  const handleHapus = (id, nama) => {
    if (window.confirm(`Yakin ingin menghapus ulasan dari "${nama}"?`)) {
      startTransition(async () => {
        const res = await hapusUlasan(id);
        if (res?.error) {
          alert(res.error);
        }
      });
    }
  };

  if (daftarUlasan.length === 0) {
    return (
      <div className="rounded-2xl border border-garis bg-permukaan p-8 text-center text-teks-lembut">
        Belum ada ulasan pembeli yang masuk.
      </div>
    );
  }

  return (
    <div className="overflow-x-auto rounded-2xl border border-garis">
      <table className="w-full min-w-[700px] text-left text-sm">
        <thead className="bg-permukaan text-teks-lembut">
          <tr>
            <th className="px-4 py-3 font-semibold">Produk</th>
            <th className="px-4 py-3 font-semibold">Pengirim</th>
            <th className="px-4 py-3 font-semibold">Rating</th>
            <th className="px-4 py-3 font-semibold">Komentar</th>
            <th className="px-4 py-3 font-semibold">Status</th>
            <th className="px-4 py-3 font-semibold text-right">Aksi</th>
          </tr>
        </thead>
        <tbody>
          {daftarUlasan.map((u) => {
            const isTampil = u.tampil !== false;
            const namaProduk = u.produk?.nama || `ID Produk: ${u.produk_id}`;

            return (
              <tr key={u.id} className="border-t border-garis hover:bg-permukaan/50">
                <td className="px-4 py-3 font-semibold text-teks max-w-[180px] truncate" title={namaProduk}>
                  {namaProduk}
                </td>
                <td className="px-4 py-3 text-teks whitespace-nowrap">
                  <div>{u.nama}</div>
                  <div className="text-xs text-teks-lembut">
                    {new Date(u.created_at).toLocaleDateString("id-ID", {
                      day: "numeric",
                      month: "short",
                      year: "numeric",
                    })}
                  </div>
                </td>
                <td className="px-4 py-3 whitespace-nowrap">
                  <div className="flex items-center text-amber-500 text-sm">
                    {[1, 2, 3, 4, 5].map((s) => (
                      <span key={s}>{s <= u.rating ? "★" : "☆"}</span>
                    ))}
                    <span className="ml-1 text-xs font-bold text-teks">({u.rating})</span>
                  </div>
                </td>
                <td className="px-4 py-3 text-teks max-w-[280px]">
                  <p className="line-clamp-2 text-xs leading-relaxed">{u.komentar}</p>
                </td>
                <td className="px-4 py-3 whitespace-nowrap">
                  <span
                    className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ${
                      isTampil
                        ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                        : "bg-garis text-teks-lembut"
                    }`}
                  >
                    {isTampil ? "Tampil" : "Disembunyikan"}
                  </span>
                </td>
                <td className="px-4 py-3 whitespace-nowrap text-right">
                  <div className="flex justify-end items-center gap-2">
                    <button
                      type="button"
                      onClick={() => handleToggle(u.id, isTampil)}
                      disabled={isPending}
                      className="rounded-lg border border-garis px-2.5 py-1 text-xs font-semibold hover:border-utama hover:text-utama disabled:opacity-50"
                    >
                      {isTampil ? "Sembunyikan" : "Tampilkan"}
                    </button>
                    <Tombol
                      type="button"
                      varian="bahaya"
                      onClick={() => handleHapus(u.id, u.nama)}
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

