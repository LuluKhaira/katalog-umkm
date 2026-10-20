"use client";

import { toko } from "@/lib/toko";
import { formatRupiah } from "@/lib/format";
import { catatKlikWa } from "@/app/admin/actions";

// US-03, US-40, US-43: Buka WhatsApp toko dengan nomor dari database (fallback lib/toko.js) dan catat statistik klik
export default function TombolWhatsApp({ produk, whatsappNumber }) {
  const nomor = whatsappNumber || toko.nomorWhatsApp;
  const harga = produk.harga_diskon || produk.harga;
  const pesan = `Halo, saya ingin memesan ${produk.nama} seharga ${formatRupiah(harga)}.`;
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
