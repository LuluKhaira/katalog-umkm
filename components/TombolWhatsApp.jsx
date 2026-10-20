"use client";

import { toko } from "@/lib/toko";
import { formatRupiah } from "@/lib/format";
import { catatKlikWa } from "@/app/admin/actions";

// US-03 & US-40: Buka WhatsApp toko dengan pesan otomatis dan catat statistik klik (tanpa PII)
export default function TombolWhatsApp({ produk }) {
  const nomor = toko.nomorWhatsApp;
  const pesan = `Halo, saya ingin memesan ${produk.nama} seharga ${formatRupiah(produk.harga)}.`;
  const url = `https://wa.me/${nomor}?text=${encodeURIComponent(pesan)}`;

  const handleKlik = () => {
    if (produk?.id) {
      catatKlikWa(produk.id).catch(() => {});
    }
  };

  return (
    <a
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      onClick={handleKlik}
      className="inline-flex w-full items-center justify-center rounded-lg bg-utama px-5 py-3 font-semibold text-white hover:bg-utama-gelap sm:w-auto"
    >
      Pesan via WhatsApp
    </a>
  );
}
