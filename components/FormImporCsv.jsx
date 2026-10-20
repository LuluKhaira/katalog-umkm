"use client";

import { useActionState, useState } from "react";
import Tombol from "@/components/Tombol";
import { imporProdukCsv } from "@/app/admin/actions";

// US-46: Form Impor Produk dari CSV
export default function FormImporCsv() {
  const [state, formAction, isPending] = useActionState(imporProdukCsv, null);
  const [namaFile, setNamaFile] = useState("");

  const contohCsv = `nama,kategori,harga,deskripsi,stok
Keripik Singkong Pedas,Camilan,15000,Keripik renyah rasa balado spesial,25
Kopi Robusta Asli,Minuman,25000,Kopi murni biji pilihan khas Nusantara,30
Sambal Bawang Botol,Bumbu,18000,Sambal bawang pedas gurih tanpa pengawet,15`;

  const downloadContohCsv = () => {
    const blob = new Blob(["\uFEFF" + contohCsv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute("download", "template-impor-produk.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="flex flex-col gap-8 max-w-2xl">
      {/* Kartu Ringkasan Hasil Impor */}
      {state?.success && (
        <div className="rounded-2xl border border-garis bg-latar p-5 shadow-xs flex flex-col gap-3">
          <h3 className="font-bold text-base text-teks">Hasil Impor CSV</h3>
          <div className="grid grid-cols-2 gap-4">
            <div className="rounded-xl bg-emerald-500/10 p-4 border border-emerald-500/20">
              <span className="text-xs font-semibold text-emerald-600 dark:text-emerald-400">
                Berhasil Diimpor
              </span>
              <p className="text-2xl font-extrabold text-emerald-700 dark:text-emerald-300 mt-1">
                {state.jumlahBerhasil} produk
              </p>
            </div>
            <div className="rounded-xl bg-bahaya/10 p-4 border border-bahaya/20">
              <span className="text-xs font-semibold text-bahaya">Gagal / Dilewati</span>
              <p className="text-2xl font-extrabold text-bahaya mt-1">{state.jumlahGagal} baris</p>
            </div>
          </div>

          {state.daftarError && state.daftarError.length > 0 && (
            <div className="mt-2 flex flex-col gap-1.5 max-h-48 overflow-y-auto rounded-lg border border-bahaya/30 bg-bahaya/5 p-3">
              <p className="text-xs font-bold text-bahaya">Daftar Baris yang Bermasalah:</p>
              {state.daftarError.map((err, idx) => (
                <p key={idx} className="text-xs text-bahaya">
                  &bull; <strong>Baris {err.baris}:</strong> {err.pesan}
                </p>
              ))}
            </div>
          )}
        </div>
      )}

      {state?.error && (
        <div className="rounded-lg border border-bahaya/20 bg-bahaya/10 p-4 text-sm text-bahaya">
          {state.error}
        </div>
      )}

      {/* Form Unggah File CSV */}
      <form action={formAction} className="rounded-2xl border border-garis bg-latar p-6 flex flex-col gap-5">
        <div>
          <label htmlFor="file_csv" className="text-sm font-bold text-teks block mb-1">
            Pilih Berkas CSV (Maksimal 2 MB)
          </label>
          <input
            id="file_csv"
            name="file_csv"
            type="file"
            accept=".csv,text/csv"
            required
            onChange={(e) => setNamaFile(e.target.files?.[0]?.name || "")}
            className="w-full rounded-lg border border-garis bg-permukaan p-2.5 text-sm text-teks file:mr-3 file:rounded-md file:border-0 file:bg-utama file:px-3 file:py-1 file:text-xs file:font-semibold file:text-white hover:file:bg-utama-gelap cursor-pointer"
          />
          {namaFile && <p className="mt-1.5 text-xs text-teks-lembut">Berkas dipilih: {namaFile}</p>}
        </div>

        <div className="flex items-center gap-3 pt-2">
          <Tombol type="submit" disabled={isPending}>
            {isPending ? "Sedang Memproses CSV..." : "Unggah & Impor Produk"}
          </Tombol>
          <Tombol href="/admin" varian="garis">
            Kembali
          </Tombol>
        </div>
      </form>

      {/* Template & Panduan Format CSV */}
      <div className="rounded-2xl border border-garis bg-permukaan p-5 text-sm text-teks-lembut flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <h4 className="font-bold text-teks">Format Kolom CSV yang Didukung</h4>
          <button
            type="button"
            onClick={downloadContohCsv}
            className="text-xs font-semibold text-utama hover:underline cursor-pointer"
          >
            Unduh Template .CSV
          </button>
        </div>
        <ul className="list-disc pl-5 space-y-1 text-xs">
          <li>
            <strong>nama</strong> (wajib): Nama produk.
          </li>
          <li>
            <strong>kategori</strong> (wajib): Kategori produk (contoh: Camilan, Minuman).
          </li>
          <li>
            <strong>harga</strong> (wajib): Angka harga positif (contoh: 15000).
          </li>
          <li>
            <strong>stok</strong> (opsional): Angka jumlah stok (default 10 jika kosong).
          </li>
          <li>
            <strong>deskripsi</strong> (opsional): Keterangan penjelasan produk.
          </li>
          <li>
            <strong>foto_url</strong> (opsional): URL gambar produk.
          </li>
        </ul>
      </div>
    </div>
  );
}

