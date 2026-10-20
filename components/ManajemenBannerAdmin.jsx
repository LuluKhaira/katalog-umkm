"use client";

import { useActionState, useTransition, useState } from "react";
import Tombol from "@/components/Tombol";
import Input from "@/components/Input";
import { simpanBanner, toggleAktifBanner, hapusBanner } from "@/app/admin/actions";

// US-42: Komponen Interaktif Manajemen Banner Promo Admin
export default function ManajemenBannerAdmin({ daftarBanner = [] }) {
  const [state, formAction, isPending] = useActionState(simpanBanner, null);
  const [isTransitioning, startTransition] = useTransition();

  const [editId, setEditId] = useState(null);
  const [judul, setJudul] = useState("");
  const [teks, setTeks] = useState("");
  const [gambarUrl, setGambarUrl] = useState("");
  const [tautan, setTautan] = useState("");
  const [aktif, setAktif] = useState(true);

  const resetForm = () => {
    setEditId(null);
    setJudul("");
    setTeks("");
    setGambarUrl("");
    setTautan("");
    setAktif(true);
  };

  const handleEdit = (b) => {
    setEditId(b.id);
    setJudul(b.judul || "");
    setTeks(b.teks || "");
    setGambarUrl(b.gambar_url || "");
    setTautan(b.tautan || "");
    setAktif(b.aktif !== false);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleToggle = (id, currentAktif) => {
    startTransition(async () => {
      const res = await toggleAktifBanner(id, !currentAktif);
      if (res?.error) alert(res.error);
    });
  };

  const handleHapus = (id, judul) => {
    if (window.confirm(`Yakin ingin menghapus banner "${judul}"?`)) {
      startTransition(async () => {
        const res = await hapusBanner(id);
        if (res?.error) alert(res.error);
      });
    }
  };

  return (
    <div className="flex flex-col gap-10">
      {/* Form Tambah / Edit Banner */}
      <section className="rounded-2xl border border-garis bg-latar p-6 shadow-xs max-w-2xl">
        <h2 className="text-lg font-bold mb-4">
          {editId ? "Ubah Banner Promo" : "Tambah Banner Promo Baru"}
        </h2>

        {state?.success && (
          <div className="mb-4 rounded-lg border border-emerald-500/20 bg-emerald-500/10 p-3 text-sm text-emerald-700 dark:text-emerald-400">
            {state.message}
          </div>
        )}

        {state?.error && (
          <div className="mb-4 rounded-lg border border-bahaya/20 bg-bahaya/10 p-3 text-sm text-bahaya">
            {state.error}
          </div>
        )}

        <form action={formAction} className="flex flex-col gap-4">
          {editId && <input type="hidden" name="id" value={editId} />}

          <Input
            label="Judul banner promo *"
            name="judul"
            value={judul}
            onChange={(e) => setJudul(e.target.value)}
            placeholder="Contoh: Promo Spesial Gajian Diskon 20%!"
            required
          />

          <Input
            label="Teks / Subjudul promo (opsional)"
            name="teks"
            value={teks}
            onChange={(e) => setTeks(e.target.value)}
            placeholder="Contoh: Berlaku khusus untuk varian keripik pedas hingga akhir pekan."
          />

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Input
              label="URL Gambar Banner (opsional)"
              name="gambar_url"
              value={gambarUrl}
              onChange={(e) => setGambarUrl(e.target.value)}
              placeholder="https://... atau /produk/banner.jpg"
            />
            <Input
              label="Tautan Tujuan (opsional)"
              name="tautan"
              value={tautan}
              onChange={(e) => setTautan(e.target.value)}
              placeholder="Contoh: /produk/1 atau https://..."
            />
          </div>

          <div className="flex items-center gap-2 pt-1">
            <input
              type="checkbox"
              id="banner-aktif"
              name="aktif"
              value="true"
              checked={aktif}
              onChange={(e) => setAktif(e.target.checked)}
              className="h-4 w-4 rounded border-garis text-utama focus:ring-utama"
            />
            <label htmlFor="banner-aktif" className="text-sm font-medium text-teks cursor-pointer">
              Aktifkan banner di beranda
            </label>
          </div>

          <div className="flex items-center gap-3 pt-2">
            <Tombol type="submit" disabled={isPending}>
              {isPending ? "Menyimpan..." : editId ? "Simpan Perubahan" : "+ Tambah Banner"}
            </Tombol>
            {editId && (
              <button
                type="button"
                onClick={resetForm}
                className="rounded-lg border border-garis px-4 py-2.5 text-sm font-semibold text-teks hover:bg-permukaan"
              >
                Batal Edit
              </button>
            )}
          </div>
        </form>
      </section>

      {/* Tabel Daftar Banner */}
      <section className="flex flex-col gap-4">
        <h2 className="text-xl font-bold">Daftar Banner Promo</h2>

        {daftarBanner.length === 0 ? (
          <div className="rounded-2xl border border-garis bg-permukaan p-8 text-center text-teks-lembut">
            Belum ada banner promo yang dibuat.
          </div>
        ) : (
          <div className="overflow-x-auto rounded-2xl border border-garis">
            <table className="w-full min-w-[640px] text-left text-sm">
              <thead className="bg-permukaan text-teks-lembut">
                <tr>
                  <th className="px-4 py-3 font-semibold">Banner</th>
                  <th className="px-4 py-3 font-semibold">Tautan</th>
                  <th className="px-4 py-3 font-semibold">Status</th>
                  <th className="px-4 py-3 font-semibold text-right">Aksi</th>
                </tr>
              </thead>
              <tbody>
                {daftarBanner.map((b) => {
                  const isAktif = b.aktif !== false;
                  return (
                    <tr key={b.id} className="border-t border-garis hover:bg-permukaan/50">
                      <td className="px-4 py-3">
                        <div className="flex items-start gap-3">
                          {b.gambar_url ? (
                            <img
                              src={b.gambar_url}
                              alt=""
                              className="h-12 w-20 shrink-0 rounded-lg object-cover bg-permukaan"
                            />
                          ) : (
                            <div className="flex h-12 w-20 shrink-0 items-center justify-center rounded-lg bg-permukaan text-xs text-teks-lembut">
                              Teks Saja
                            </div>
                          )}
                          <div className="min-w-0">
                            <p className="font-semibold text-teks">{b.judul}</p>
                            {b.teks && (
                              <p className="text-xs text-teks-lembut line-clamp-1">{b.teks}</p>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-xs text-teks-lembut">
                        {b.tautan ? (
                          <a href={b.tautan} target="_blank" rel="noreferrer" className="text-utama hover:underline">
                            {b.tautan}
                          </a>
                        ) : (
                          "-"
                        )}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        <button
                          type="button"
                          onClick={() => handleToggle(b.id, isAktif)}
                          disabled={isTransitioning}
                          className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold ${
                            isAktif
                              ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                              : "bg-garis text-teks-lembut"
                          }`}
                        >
                          <span
                            className={`h-1.5 w-1.5 rounded-full ${
                              isAktif ? "bg-emerald-500" : "bg-teks-lembut"
                            }`}
                          />
                          {isAktif ? "Aktif" : "Nonaktif"}
                        </button>
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-right">
                        <div className="flex justify-end items-center gap-2">
                          <button
                            type="button"
                            onClick={() => handleEdit(b)}
                            className="rounded-lg border border-garis px-2.5 py-1 text-xs font-semibold hover:border-utama hover:text-utama"
                          >
                            Ubah
                          </button>
                          <Tombol
                            type="button"
                            varian="bahaya"
                            onClick={() => handleHapus(b.id, b.judul)}
                            disabled={isTransitioning}
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
        )}
      </section>
    </div>
  );
}

