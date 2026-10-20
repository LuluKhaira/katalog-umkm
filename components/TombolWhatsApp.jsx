import { toko } from "@/lib/toko";
import { formatRupiah } from "@/lib/format";

// US-03: buka WhatsApp toko dengan pesan otomatis berisi nama dan harga produk.
export default function TombolWhatsApp({ produk }) {
  const nomor = toko.nomorWhatsApp;
  const pesan = `Halo, saya ingin memesan ${produk.nama} seharga ${formatRupiah(produk.harga)}.`;
  const url = `https://wa.me/${nomor}?text=${encodeURIComponent(pesan)}`;

  return (
    <a
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      className="inline-flex w-full items-center justify-center rounded-lg bg-utama px-5 py-3 font-semibold text-white hover:bg-utama-gelap sm:w-auto"
    >
      Pesan via WhatsApp
    </a>
  );
}
