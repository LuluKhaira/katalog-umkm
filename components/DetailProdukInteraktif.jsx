"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { toko } from "@/lib/toko";
import { formatRupiah } from "@/lib/format";
import { useKeranjang } from "@/lib/keranjang-context";
import TombolFavorit from "@/components/TombolFavorit";
import { catatKlikWa } from "@/app/admin/actions";

// US-12 (Jumlah & Varian), US-19 (Stok), US-20 (Harga Diskon), US-21 (Keranjang), US-23 (Bagikan), US-36 (Terakhir Dilihat), US-37 (Bandingkan), US-40 (Catat Klik WA)
export default function DetailProdukInteraktif({ produk }) {
  const [jumlah, setJumlah] = useState(1);
  const [varian, setVarian] = useState("Standar");
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
  const hargaAktif =
    typeof produk.harga_diskon === "number" &&
    produk.harga_diskon > 0 &&
    produk.harga_diskon < produk.harga
      ? produk.harga_diskon
      : produk.harga;
  const totalHarga = hargaAktif * jumlah;

  // Format pesan WhatsApp
  const pesanWa = `Halo, saya ingin memesan:
- Produk: ${produk.nama}
- Varian: ${varian}
- Jumlah: ${jumlah}
Total: ${formatRupiah(totalHarga)}`;
  const waUrl = `https://wa.me/${toko.nomorWhatsApp}?text=${encodeURIComponent(pesanWa)}`;

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
      } catch (err) {
        // User cancelled or share failed, fallback to clipboard
      }
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
    tambahItem(produk, jumlah, varian);
    setKeranjangSukses(true);
    setTimeout(() => setKeranjangSukses(false), 2500);
  };

  const daftarVarian = ["Standar", "Besar", "Spesial"];

  return (
    <div className="flex flex-col gap-5 pt-2">
      {/* Pilihan varian (US-12) */}
      <div className="flex flex-col gap-2">
        <label className="text-sm font-semibold text-teks">Pilih Varian:</label>
        <div className="flex flex-wrap gap-2">
          {daftarVarian.map((v) => (
            <button
              key={v}
              type="button"
              onClick={() => setVarian(v)}
              className={`rounded-lg border px-3.5 py-1.5 text-sm font-semibold transition-colors ${
                varian === v
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
            className="px-3 py-1 text-base font-bold text-teks hover:bg-permukaan disabled:opacity-40"
          >
            -
          </button>
          <span className="w-10 text-center font-semibold text-teks">{jumlah}</span>
          <button
            type="button"
            onClick={() => setJumlah((prev) => prev + 1)}
            disabled={isHabis}
            className="px-3 py-1 text-base font-bold text-teks hover:bg-permukaan disabled:opacity-40"
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
              className="inline-flex w-full items-center justify-center rounded-lg bg-utama px-5 py-3 text-center font-semibold text-white hover:bg-utama-gelap sm:w-auto"
            >
              Pesan via WhatsApp ({formatRupiah(totalHarga)})
            </a>
            <button
              type="button"
              onClick={handleTambahKeranjang}
              className="inline-flex w-full items-center justify-center rounded-lg border border-garis bg-latar px-5 py-3 font-semibold text-teks hover:border-utama hover:text-utama sm:w-auto"
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
            className="inline-flex items-center gap-1.5 rounded-lg border border-garis bg-permukaan px-3 py-2.5 text-sm font-semibold text-teks hover:border-utama"
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
