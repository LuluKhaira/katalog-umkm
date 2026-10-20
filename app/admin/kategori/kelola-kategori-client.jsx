"use client";

import { useActionState, useState, useTransition } from "react";
import Tombol from "@/components/Tombol";
import { tambahKategori, ubahKategori, hapusKategori } from "@/app/admin/actions";

export default function KelolaKategoriClient({ daftarKategoriAwal = [], ringkasanPemakaian = {} }) {
  const [tambahState, tambahAction, tambahPending] = useActionState(tambahKategori, null);
  const [editId, setEditId] = useState(null);
  const [editNama, setEditNama] = useState("");
  const [editLama, setEditLama] = useState("");
  const [pesanAksi, setPesanAksi] = useState(null);
  const [isPending, startTransition] = useTransition();

  const handleMulaiEdit = (kat) => {
    setEditId(kat.id);
    setEditNama(kat.nama);
    setEditLama(kat.nama);
    setPesanAksi(null);
  };

  const handleBatalEdit = () => {
    setEditId(null);
    setEditNama("");
  };

  const handleSimpanEdit = (e) => {
    e.preventDefault();
    if (!editNama.trim()) return;

    startTransition(async () => {
      const fd = new FormData();
      fd.append("id", editId);
      fd.append("nama_lama", editLama);
      fd.append("nama", editNama);

      const res = await ubahKategori(null, fd);
      if (res?.error) {
        setPesanAksi({ type: "error", text: res.error });
      } else {
        setPesanAksi({ type: "success", text: res?.message || "Kategori berhasil diubah." });
        setEditId(null);
      }
    });
  };

  const handleHapus = (kat) => {
    const pemakaian = ringkasanPemakaian[kat.nama] || 0;
    if (pemakaian > 0) {
      alert(`Kategori "${kat.nama}" tidak dapat dihapus karena masih digunakan oleh ${pemakaian} produk.`);
      return;
    }

    if (window.confirm(`Yakin ingin menghapus kategori "${kat.nama}"?`)) {
      startTransition(async () => {
        const res = await hapusKategori(kat.id, kat.nama);
        if (res?.error) {
          setPesanAksi({ type: "error", text: res.error });
        } else {
          setPesanAksi({ type: "success", text: `Kategori "${kat.nama}" berhasil dihapus.` });
        }
      });
    }
  };

  return (
    <div className="flex flex-col gap-8">
      {/* Notifikasi feedback */}
      {pesanAksi && (
        <div
          className={`rounded-lg p-3 text-sm border ${
            pesanAksi.type === "error"
              ? "border-bahaya/20 bg-bahaya/10 text-bahaya"
              : "border-utama/20 bg-utama/10 text-utama"
          }`}
        >
          {pesanAksi.text}
        </div>
      )}

      {/* Form Tambah Kategori Baru */}
      <div className="rounded-2xl border border-garis bg-latar p-5">
        <h2 className="text-base font-bold mb-3">Tambah Kategori Baru</h2>
        {tambahState?.error && (
          <p className="mb-3 text-xs text-bahaya">{tambahState.error}</p>
        )}
        {tambahState?.success && (
          <p className="mb-3 text-xs text-utama">{tambahState.message}</p>
        )}
        <form action={tambahAction} className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <input
            type="text"
            name="nama"
            placeholder="Nama kategori baru..."
            required
            className="flex-1 rounded-lg border border-garis bg-latar px-3.5 py-2 text-sm text-teks placeholder:text-teks-lembut focus:border-utama focus:outline-none"
          />
          <Tombol type="submit" disabled={tambahPending}>
            {tambahPending ? "Menambahkan..." : "Tambah Kategori"}
          </Tombol>
        </form>
      </div>

      {/* Daftar Kategori */}
      <div className="overflow-x-auto rounded-2xl border border-garis bg-latar">
        <table className="w-full text-left text-sm">
          <thead className="bg-permukaan text-teks-lembut">
            <tr>
              <th className="px-4 py-3 font-semibold">Nama Kategori</th>
              <th className="px-4 py-3 font-semibold">Digunakan Produk</th>
              <th className="px-4 py-3 font-semibold text-right">Aksi</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-garis">
            {daftarKategoriAwal.map((kat) => {
              const pemakaian = ringkasanPemakaian[kat.nama] || 0;
              const sedangEdit = editId === kat.id;

              return (
                <tr key={kat.id}>
                  <td className="px-4 py-3">
                    {sedangEdit ? (
                      <form onSubmit={handleSimpanEdit} className="flex items-center gap-2">
                        <input
                          type="text"
                          value={editNama}
                          onChange={(e) => setEditNama(e.target.value)}
                          className="rounded-md border border-utama px-2.5 py-1 text-sm text-teks focus:outline-none"
                          required
                          autoFocus
                        />
                        <button
                          type="submit"
                          disabled={isPending}
                          className="rounded-md bg-utama px-2.5 py-1 text-xs font-semibold text-white hover:bg-utama-gelap"
                        >
                          Simpan
                        </button>
                        <button
                          type="button"
                          onClick={handleBatalEdit}
                          className="rounded-md border border-garis px-2.5 py-1 text-xs text-teks-lembut hover:bg-permukaan"
                        >
                          Batal
                        </button>
                      </form>
                    ) : (
                      <span className="font-semibold text-teks">{kat.nama}</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-teks-lembut">
                    <span
                      className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${
                        pemakaian > 0 ? "bg-permukaan text-teks" : "text-teks-lembut/60"
                      }`}
                    >
                      {pemakaian} produk
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right">
                    {!sedangEdit && (
                      <div className="flex justify-end gap-2">
                        <button
                          type="button"
                          onClick={() => handleMulaiEdit(kat)}
                          className="text-xs font-semibold text-teks-lembut hover:text-utama"
                        >
                          Ubah
                        </button>
                        <button
                          type="button"
                          onClick={() => handleHapus(kat)}
                          disabled={isPending}
                          className="text-xs font-semibold text-bahaya hover:underline disabled:opacity-50"
                        >
                          Hapus
                        </button>
                      </div>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

