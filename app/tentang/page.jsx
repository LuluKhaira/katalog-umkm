import Link from "next/link";
import { toko } from "@/lib/toko";
import Tombol from "@/components/Tombol";

// US-22: Halaman Tentang dan Kontak Toko
export const metadata = {
  title: `Tentang Kami | ${toko.nama}`,
  description: `Profil dan kontak resmi ${toko.nama}. ${toko.tagline}`,
};

export default function HalamanTentang() {
  const waUrl = `https://wa.me/${toko.nomorWhatsApp}?text=${encodeURIComponent(
    `Halo ${toko.nama}, saya ingin bertanya tentang toko Anda.`
  )}`;

  return (
    <div className="mx-auto max-w-2xl py-12">
      <div className="flex flex-col gap-6">
        <div>
          <h1 className="text-3xl font-extrabold sm:text-4xl">{toko.nama}</h1>
          <p className="mt-2 text-lg text-utama font-medium">{toko.tagline}</p>
        </div>

        <div className="rounded-2xl border border-garis bg-permukaan p-6 leading-relaxed text-teks-lembut">
          <p>
            Selamat datang di katalog resmi <strong>{toko.nama}</strong>. Kami berdedikasi
            menyediakan produk-produk berkualitas terbaik langsung ke tangan Anda. Semua pesanan
            dapat dilakukan secara praktis dan cepat melalui komunikasi langsung via WhatsApp.
          </p>
        </div>

        <div className="grid gap-4 rounded-2xl border border-garis bg-latar p-6">
          <h2 className="text-lg font-bold">Informasi & Kontak Toko</h2>

          <div className="flex flex-col gap-1 text-sm">
            <span className="font-semibold text-teks">Alamat:</span>
            <span className="text-teks-lembut">{toko.alamat}</span>
          </div>

          <div className="flex flex-col gap-1 text-sm">
            <span className="font-semibold text-teks">Jam Operasional:</span>
            <span className="text-teks-lembut">{toko.jamBuka}</span>
          </div>

          <div className="flex flex-col gap-1 text-sm">
            <span className="font-semibold text-teks">WhatsApp Pemesanan:</span>
            <span className="text-teks-lembut">+{toko.nomorWhatsApp}</span>
          </div>

          <div className="pt-2">
            <a
              href={waUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 rounded-lg bg-utama px-4 py-2 text-sm font-semibold text-white hover:bg-utama-gelap"
            >
              Hubungi Toko via WhatsApp
            </a>
          </div>
        </div>

        <div className="pt-4">
          <Tombol href="/">Kembali ke Katalog Produk</Tombol>
        </div>
      </div>
    </div>
  );
}

