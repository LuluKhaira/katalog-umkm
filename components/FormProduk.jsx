"use client";

import { useActionState, useState, useEffect } from "react";
import Input from "@/components/Input";
import Tombol from "@/components/Tombol";
import { buatDeskripsiAI } from "@/app/admin/actions";

// Dipakai untuk tambah produk (US-08) dan ubah produk (US-09).
// US-14 (AI Gemini), US-18 (Galeri Foto), US-19 (Stok), US-20 (Diskon & Badge), US-29 (Storage Bucket), US-32 (Aktif), US-34 (Validasi per field useActionState)
export default function FormProduk({ action, produk = {}, labelTombol = "Simpan produk" }) {
  const [state, formAction, isPending] = useActionState(action, null);

  const [nama, setNama] = useState(produk.nama || "");
  const [harga, setHarga] = useState(produk.harga !== undefined ? produk.harga : "");
  const [hargaDiskon, setHargaDiskon] = useState(produk.harga_diskon !== undefined ? produk.harga_diskon : "");
  const [kategori, setKategori] = useState(produk.kategori || "");
  const [stok, setStok] = useState(produk.stok !== undefined ? produk.stok : 10);
  const [badge, setBadge] = useState(produk.badge || "");
  const [fotoUrl, setFotoUrl] = useState(produk.foto_url || "");
  const [deskripsi, setDeskripsi] = useState(produk.deskripsi || "");
  const [fotoTambahan, setFotoTambahan] = useState("");
  const [aktif, setAktif] = useState(produk.aktif !== false);

  const [aiLoading, setAiLoading] = useState(false);
  const [aiError, setAiError] = useState(null);

  // US-34: Mempertahankan nilai isian form saat terjadi error validasi di server
  useEffect(() => {
    if (state?.values) {
      if (state.values.nama !== undefined) setNama(state.values.nama);
      if (state.values.harga !== undefined) setHarga(state.values.harga);
      if (state.values.harga_diskon !== undefined) setHargaDiskon(state.values.harga_diskon);
      if (state.values.kategori !== undefined) setKategori(state.values.kategori);
      if (state.values.stok !== undefined) setStok(state.values.stok);
      if (state.values.badge !== undefined) setBadge(state.values.badge);
      if (state.values.foto_url !== undefined) setFotoUrl(state.values.foto_url);
      if (state.values.deskripsi !== undefined) setDeskripsi(state.values.deskripsi);
      if (state.values.foto_tambahan !== undefined) setFotoTambahan(state.values.foto_tambahan);
      if (state.values.aktif !== undefined) setAktif(state.values.aktif);
    }
  }, [state]);

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
      {/* Pesan error umum */}
      {state?.error && (
        <div className="rounded-lg border border-bahaya/20 bg-bahaya/10 p-3 text-sm text-bahaya">
          {state.error}
        </div>
      )}

      {produk.id && <input type="hidden" name="id" value={produk.id} />}

      {/* US-34: Error per field di bawah nama */}
      <Input
        label="Nama produk"
        name="nama"
        value={nama}
        onChange={(e) => setNama(e.target.value)}
        error={state?.errors?.nama}
        required
      />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        {/* US-34: Error per field di bawah harga */}
        <Input
          label="Harga normal (Rp)"
          name="harga"
          type="number"
          min="0"
          value={harga}
          onChange={(e) => setHarga(e.target.value)}
          error={state?.errors?.harga}
          required
        />
        <Input
          label="Harga diskon (Rp, opsional)"
          name="harga_diskon"
          type="number"
          min="0"
          value={hargaDiskon}
          onChange={(e) => setHargaDiskon(e.target.value)}
          error={state?.errors?.harga_diskon}
          placeholder="Lebih kecil dari harga normal"
        />
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Input
          label="Kategori"
          name="kategori"
          value={kategori}
          onChange={(e) => setKategori(e.target.value)}
          error={state?.errors?.kategori}
          placeholder="Misal: Minuman, Camilan, Bumbu"
        />
        <Input
          label="Jumlah stok"
          name="stok"
          type="number"
          min="0"
          value={stok}
          onChange={(e) => setStok(e.target.value)}
          error={state?.errors?.stok}
          required
        />
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Input
          label="Badge promo (opsional)"
          name="badge"
          value={badge}
          onChange={(e) => setBadge(e.target.value)}
          placeholder="Misal: Baru, Terlaris, Hemat"
        />
        <Input
          label="Link foto utama (URL)"
          name="foto_url"
          placeholder="https://... atau /produk/nama.svg"
          value={fotoUrl}
          onChange={(e) => setFotoUrl(e.target.value)}
        />
      </div>

      {/* US-29: Input Upload File Foto ke Supabase Storage */}
      <div className="flex flex-col gap-1.5">
        <label htmlFor="foto_file" className="text-sm font-semibold cursor-pointer">
          Atau Upload File Foto (Maks 2 MB, JPEG/PNG/WebP)
        </label>
        <input
          id="foto_file"
          type="file"
          name="foto_file"
          accept="image/jpeg,image/png,image/webp"
          className="w-full rounded-lg border border-garis bg-latar p-2 text-sm text-teks file:mr-3 file:rounded-md file:border-0 file:bg-permukaan file:px-3 file:py-1 file:text-xs file:font-semibold hover:file:bg-garis"
        />
        {state?.errors?.foto_file && (
          <p className="text-xs text-bahaya mt-0.5">{state.errors.foto_file}</p>
        )}
      </div>

      <Input
        label="URL foto tambahan (opsional, satu URL per baris)"
        name="foto_tambahan"
        textarea
        rows={3}
        value={fotoTambahan}
        onChange={(e) => setFotoTambahan(e.target.value)}
        placeholder="https://contoh.com/foto2.jpg&#10;https://contoh.com/foto3.jpg"
      />

      {/* Bagian deskripsi dengan tombol AI (US-14) */}
      <div className="flex flex-col gap-1.5">
        <div className="flex items-center justify-between gap-2">
          <label htmlFor="deskripsi" className="text-sm font-semibold cursor-pointer">
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

        {aiError && <p className="text-xs text-bahaya">{aiError}</p>}

        <textarea
          id="deskripsi"
          name="deskripsi"
          rows={4}
          value={deskripsi}
          onChange={(e) => setDeskripsi(e.target.value)}
          className="w-full rounded-lg border border-garis bg-latar px-3 py-2.5 text-base text-teks placeholder:text-teks-lembut focus:border-utama focus:outline-none"
          placeholder="Tulis deskripsi atau buat otomatis dengan AI di atas..."
        />
        {state?.errors?.deskripsi && (
          <p className="text-xs text-bahaya mt-0.5">{state.errors.deskripsi}</p>
        )}
      </div>

      {/* US-32: Status Aktif/Nonaktif Produk */}
      <div className="flex items-center gap-2 pt-1">
        <input
          type="checkbox"
          id="aktif"
          name="aktif"
          value="true"
          checked={aktif}
          onChange={(e) => setAktif(e.target.checked)}
          className="h-4 w-4 rounded border-garis text-utama focus:ring-utama"
        />
        <label htmlFor="aktif" className="text-sm font-medium text-teks cursor-pointer">
          Produk aktif (ditampilkan di katalog publik dan sitemap)
        </label>
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
