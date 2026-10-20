"use client";

import { useActionState, useState } from "react";
import Input from "@/components/Input";
import Tombol from "@/components/Tombol";
import { buatDeskripsiAI } from "@/app/admin/actions";

// Dipakai untuk tambah produk (US-08) dan ubah produk (US-09).
// Dilengkapi AI Gemini (US-14), Galeri Foto (US-18), Stok (US-19), Diskon & Badge (US-20), Upload Foto Storage (US-29).
export default function FormProduk({ action, produk = {}, labelTombol = "Simpan produk" }) {
  const [state, formAction, isPending] = useActionState(action, null);

  const [nama, setNama] = useState(produk.nama || "");
  const [kategori, setKategori] = useState(produk.kategori || "");
  const [deskripsi, setDeskripsi] = useState(produk.deskripsi || "");
  const [aiLoading, setAiLoading] = useState(false);
  const [aiError, setAiError] = useState(null);

  const handleBuatDeskripsiAI = async () => {
    setAiError(null);
    if (!nama.trim()) {
      setAiError("Isi nama produk terlebih dahulu.");
      return;
    }
    if (!kategori.trim()) {
      setAiError("Isi kategori produk terlebih dahulu.");
      return;
    }

    setAiLoading(true);
    try {
      const res = await buatDeskripsiAI(nama, kategori);
      if (res?.error) {
        setAiError(res.error);
      } else if (res?.deskripsi) {
        setDeskripsi(res.deskripsi);
      }
    } catch (err) {
      setAiError(err.message || "Gagal membuat deskripsi dengan AI.");
    } finally {
      setAiLoading(false);
    }
  };

  return (
    <form action={formAction} className="flex max-w-xl flex-col gap-4">
      {state?.error && (
        <div className="rounded-lg border border-bahaya/20 bg-bahaya/10 p-3 text-sm text-bahaya">
          {state.error}
        </div>
      )}

      {produk.id && <input type="hidden" name="id" value={produk.id} />}

      <Input
        label="Nama produk"
        name="nama"
        value={nama}
        onChange={(e) => setNama(e.target.value)}
        required
      />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Input
          label="Harga normal (Rp)"
          name="harga"
          type="number"
          min="0"
          defaultValue={produk.harga}
          required
        />
        <Input
          label="Harga diskon (Rp, opsional)"
          name="harga_diskon"
          type="number"
          min="0"
          defaultValue={produk.harga_diskon || ""}
          placeholder="Lebih kecil dari harga normal"
        />
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Input
          label="Kategori"
          name="kategori"
          value={kategori}
          onChange={(e) => setKategori(e.target.value)}
          placeholder="Misal: Minuman, Camilan, Bumbu"
        />
        <Input
          label="Jumlah stok"
          name="stok"
          type="number"
          min="0"
          defaultValue={produk.stok !== undefined ? produk.stok : 10}
          required
        />
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Input
          label="Badge promo (opsional)"
          name="badge"
          defaultValue={produk.badge || ""}
          placeholder="Misal: Baru, Terlaris, Hemat"
        />
        <Input
          label="Link foto utama (URL)"
          name="foto_url"
          placeholder="https://... atau /produk/nama.svg"
          defaultValue={produk.foto_url}
        />
      </div>

      {/* US-29: Input Upload File Foto ke Supabase Storage */}
      <div className="flex flex-col gap-1.5">
        <label className="text-sm font-semibold">
          Atau Upload File Foto (Maks 2 MB, JPEG/PNG/WebP)
        </label>
        <input
          type="file"
          name="foto_file"
          accept="image/jpeg,image/png,image/webp"
          className="w-full rounded-lg border border-garis bg-latar p-2 text-sm text-teks file:mr-3 file:rounded-md file:border-0 file:bg-permukaan file:px-3 file:py-1 file:text-xs file:font-semibold hover:file:bg-garis"
        />
      </div>

      <Input
        label="URL foto tambahan (opsional, satu URL per baris)"
        name="foto_tambahan"
        textarea
        rows={3}
        placeholder="https://contoh.com/foto2.jpg&#10;https://contoh.com/foto3.jpg"
      />

      {/* Bagian deskripsi dengan tombol AI (US-14) */}
      <div className="flex flex-col gap-1.5">
        <div className="flex items-center justify-between gap-2">
          <label htmlFor="deskripsi" className="text-sm font-semibold">
            Deskripsi
          </label>
          <button
            type="button"
            onClick={handleBuatDeskripsiAI}
            disabled={aiLoading}
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-utama hover:underline disabled:opacity-50"
          >
            <span aria-hidden="true">✨</span>
            {aiLoading ? "Sedang membuat AI..." : "Buat deskripsi dengan AI"}
          </button>
        </div>

        {aiError && (
          <p className="text-xs text-bahaya">{aiError}</p>
        )}

        <textarea
          id="deskripsi"
          name="deskripsi"
          rows={4}
          value={deskripsi}
          onChange={(e) => setDeskripsi(e.target.value)}
          className="w-full rounded-lg border border-garis bg-latar px-3 py-2.5 text-base text-teks placeholder:text-teks-lembut focus:border-utama focus:outline-none"
          placeholder="Tulis deskripsi atau buat otomatis dengan AI di atas..."
        />
      </div>

      <div className="flex gap-3 pt-2">
        <Tombol type="submit" disabled={isPending}>
          {isPending ? "Menyimpan..." : labelTombol}
        </Tombol>
        <Tombol href="/admin" varian="garis">
          Batal
        </Tombol>
      </div>
    </form>
  );
}
