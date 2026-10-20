"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { toko } from "@/lib/toko";
import { formatRupiah } from "@/lib/format";
import { useKeranjang } from "@/lib/keranjang-context";
import TombolFavorit from "@/components/TombolFavorit";
import { catatKlikWa } from "@/app/admin/actions";

// US-12, US-19, US-20, US-21, US-23, US-36, US-37, US-40, US-43 (WhatsApp dinamis), US-48 (Varian harga per ukuran)
export default function DetailProdukInteraktif({ produk, daftarVarian = [], nomorWhatsApp }) {
  const adaVarianDb = Array.isArray(daftarVarian) && daftarVarian.length > 0;
  const [varianDb, setVarianDb] = useState(adaVarianDb ? daftarVarian[0] : null);
  const [varianFallback, setVarianFallback] = useState("Standar");
  const [jumlah, setJumlah] = useState(1);
  const [bagikanPesan, setBagikanPesan] = useState(null);
  const [keranjangSukses, setKeranjangSukses] = useState(false);

  const { tambahItem } = useKeranjang();

  // US-36: Simpan produk yang dikunjungi ke localStorage (maks 8 produk, tanpa duplikat)
  useEffect(() => {
    if (typeof window !== "undefined" && produk?.id) {
      try {
        const tersimpan = JSON.parse(localStorage.getItem("katalog_terakhir_dilihat") || "[]");
        const filtered = Array.isArray(tersimpan)
          ? tersimpan.filter((id) => String(id) !== String(produk.id))
          : [];
        const baru = [produk.id, ...filtered].slice(0, 8);
        localStorage.setItem("katalog_terakhir_dilihat", JSON.stringify(baru));
      } catch (e) {}
    }
  }, [produk?.id]);

  const isHabis = produk.stok !== undefined && Number(produk.stok) <= 0;

  // US-48: Harga berubah sesuai varian terpilih dari database, atau harga normal/diskon jika tanpa varian
  const hargaSatuan = adaVarianDb
    ? (varianDb?.harga ?? produk.harga)
    : (typeof produk.harga_diskon === "number" &&
       produk.harga_diskon > 0 &&
       produk.harga_diskon < produk.harga)
    ? produk.harga_diskon
    : produk.harga;

  const totalHarga = hargaSatuan * jumlah;
  const namaVarianAktif = adaVarianDb ? varianDb?.nama || "Standar" : varianFallback;

  // Format pesan WhatsApp (US-48: memuat nama varian dan harga varian yang dipilih)
  const pesanWa = `Halo, saya ingin memesan:
- Produk: ${produk.nama}
- Varian: ${namaVarianAktif} (${formatRupiah(hargaSatuan)})
- Jumlah: ${jumlah}
Total: ${formatRupiah(totalHarga)}`;

  // US-43: Memakai nomor WhatsApp dari database dengan lib/toko.js sebagai cadangan
  const targetNomorWa = nomorWhatsApp || toko.nomorWhatsApp;
  const waUrl = `https://wa.me/${targetNomorWa}?text=${encodeURIComponent(pesanWa)}`;

  // US-40: Catat klik pemesanan WhatsApp tanpa menghambat user
  const handlePesanWa = () => {
    if (produk?.id) {
      catatKlikWa(produk.id).catch(() => {});
    }
  };

  // US-23: Bagikan link atau salin ke clipboard
  const handleBagikan = async () => {
    const url = typeof window !== "undefined" ? window.location.href : "";
    const shareData = {
      title: produk.nama,
      text: `Lihat ${produk.nama} di ${toko.nama}`,
      url,
    };

    if (navigator.share) {
      try {
        await navigator.share(shareData);
        return;
      } catch (err) {}
    }

    try {
      await navigator.clipboard.writeText(url);
      setBagikanPesan("Link tersalin ke clipboard!");
      setTimeout(() => setBagikanPesan(null), 3000);
    } catch (e) {
      setBagikanPesan("Gagal menyalin link.");
      setTimeout(() => setBagikanPesan(null), 3000);
    }
  };

  const handleTambahKeranjang = () => {
    const produkCustom = {
      ...produk,
      harga: hargaSatuan,
      harga_diskon: null,
    };
    tambahItem(produkCustom, jumlah, namaVarianAktif);
    setKeranjangSukses(true);
    setTimeout(() => setKeranjangSukses(false), 2500);
  };

  const varianDefault = ["Standar", "Besar", "Spesial"];

  return (
    <div className="flex flex-col gap-5 pt-2">
      {/* Pilihan varian (US-12 & US-48) */}
      <div className="flex flex-col gap-2">
        <label className="text-sm font-semibold text-teks">
          Pilih Varian {adaVarianDb && <span className="text-xs font-normal text-teks-lembut">(Harga menyesuaikan)</span>}:
        </label>
        <div className="flex flex-wrap gap-2">
          {adaVarianDb
            ? daftarVarian.map((v) => {
                const isSelected = varianDb?.id === v.id;
                return (
                  <button
                    key={v.id}
                    type="button"
                    onClick={() => setVarianDb(v)}
                    className={`rounded-lg border px-3.5 py-1.5 text-sm font-semibold transition-colors flex items-center gap-2 cursor-pointer ${
                      isSelected
                        ? "border-utama bg-utama text-white shadow-xs"
                        : "border-garis bg-latar text-teks hover:border-utama"
                    }`}
                  >
                    <span>{v.nama}</span>
                    <span className={isSelected ? "text-white/90 text-xs font-normal" : "text-harga text-xs font-bold"}>
                      {formatRupiah(v.harga)}
                    </span>
                  </button>
                );
              })
            : varianDefault.map((v) => (
                <button
                  key={v}
                  type="button"
                  onClick={() => setVarianFallback(v)}
                  className={`rounded-lg border px-3.5 py-1.5 text-sm font-semibold transition-colors cursor-pointer ${
                    varianFallback === v
                      ? "border-utama bg-utama text-white"
                      : "border-garis bg-latar text-teks hover:border-utama"
                  }`}
                >
                  {v}
                </button>
              ))}
        </div>
      </div>

      {/* Input jumlah (US-12) */}
      <div className="flex items-center gap-4">
        <label htmlFor="input-jumlah" className="text-sm font-semibold text-teks">
          Jumlah:
        </label>
        <div className="flex items-center rounded-lg border border-garis bg-latar">
          <button
            type="button"
            onClick={() => setJumlah((prev) => Math.max(1, prev - 1))}
            disabled={jumlah <= 1 || isHabis}
            className="px-3 py-1 text-base font-bold text-teks hover:bg-permukaan disabled:opacity-40 cursor-pointer"
          >
            -
          </button>
          <span className="w-10 text-center font-semibold text-teks">{jumlah}</span>
          <button
            type="button"
            onClick={() => setJumlah((prev) => prev + 1)}
            disabled={isHabis}
            className="px-3 py-1 text-base font-bold text-teks hover:bg-permukaan disabled:opacity-40 cursor-pointer"
          >
            +
          </button>
        </div>
        <span className="text-sm text-teks-lembut">
          Total: <strong className="text-teks">{formatRupiah(totalHarga)}</strong>
        </span>
      </div>

      {/* Tombol Aksi */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        {isHabis ? (
          <div className="rounded-lg border border-bahaya/20 bg-bahaya/10 px-5 py-3 text-center text-sm font-semibold text-bahaya sm:w-auto">
            Produk Habis
          </div>
        ) : (
          <>
            <a
              href={waUrl}
              target="_blank"
              rel="noopener noreferrer"
              onClick={handlePesanWa}
              className="inline-flex w-full items-center justify-center rounded-lg bg-utama px-5 py-3 text-center font-semibold text-white hover:bg-utama-gelap sm:w-auto shadow-xs"
            >
              Pesan via WhatsApp ({formatRupiah(totalHarga)})
            </a>
            <button
              type="button"
              onClick={handleTambahKeranjang}
              className="inline-flex w-full items-center justify-center rounded-lg border border-garis bg-latar px-5 py-3 font-semibold text-teks hover:border-utama hover:text-utama sm:w-auto cursor-pointer"
            >
              {keranjangSukses ? "✓ Ditambahkan!" : "+ Keranjang"}
            </button>
          </>
        )}

        {/* Tombol Bagikan (US-23), Favorit (US-24), dan Bandingkan (US-37) */}
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleBagikan}
            className="inline-flex items-center gap-1.5 rounded-lg border border-garis bg-permukaan px-3 py-2.5 text-sm font-semibold text-teks hover:border-utama cursor-pointer"
            title="Bagikan produk ini"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-4 w-4"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth="2"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z"
              />
            </svg>
            <span>Bagikan</span>
          </button>

          <Link
            href={`/bandingkan?a=${produk.id}`}
            className="inline-flex items-center gap-1.5 rounded-lg border border-garis bg-permukaan px-3 py-2.5 text-sm font-semibold text-teks hover:border-utama"
            title="Bandingkan produk ini"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-4 w-4"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth="2"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4"
              />
            </svg>
            <span>Bandingkan</span>
          </Link>

          <TombolFavorit id={produk.id} className="border border-garis bg-permukaan" />
        </div>
      </div>

      {bagikanPesan && (
        <p className="text-xs font-semibold text-utama">{bagikanPesan}</p>
      )}
    </div>
  );
}
