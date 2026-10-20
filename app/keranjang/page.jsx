"use client";

import Link from "next/link";
import { formatRupiah } from "@/lib/format";
import { toko } from "@/lib/toko";
import { useKeranjang } from "@/lib/keranjang-context";
import Tombol from "@/components/Tombol";

// US-21: Keranjang Belanja & Pesan Semua via WhatsApp
export default function HalamanKeranjang() {
  const { items, ubahJumlah, hapusItem, kosongkanKeranjang, totalHarga, totalItem, isLoaded } =
    useKeranjang();

  if (!isLoaded) {
    return (
      <div className="py-12 text-center text-teks-lembut">
        <p>Memuat keranjang...</p>
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center gap-4 py-20 text-center">
        <h1 className="text-2xl font-extrabold">Keranjang Belanja</h1>
        <p className="text-teks-lembut">Keranjang belanja Anda masih kosong.</p>
        <Tombol href="/">Mulai Belanja</Tombol>
      </div>
    );
  }

  // Buat satu pesan WhatsApp untuk seluruh isi keranjang
  const daftarItemTeks = items
    .map(
      (item, idx) =>
        `${idx + 1}. ${item.nama} (${item.varian || "Standar"}) - ${item.jumlah}x @ ${formatRupiah(
          item.harga
        )} = ${formatRupiah(item.harga * item.jumlah)}`
    )
    .join("\n");

  const pesanLengkapWa = `Halo, saya ingin memesan barang-barang berikut dari ${toko.nama}:

${daftarItemTeks}

Total Pembelian: ${formatRupiah(totalHarga)}

Mohon konfirmasi ketersediaan dan total ongkos kirim. Terima kasih!`;

  const waUrl = `https://wa.me/${toko.nomorWhatsApp}?text=${encodeURIComponent(pesanLengkapWa)}`;

  return (
    <div className="py-8">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <h1 className="text-2xl font-extrabold sm:text-3xl">Keranjang Belanja</h1>
        <button
          type="button"
          onClick={kosongkanKeranjang}
          className="text-xs text-bahaya underline underline-offset-4 hover:opacity-80"
        >
          Kosongkan keranjang
        </button>
      </div>

      <div className="flex flex-col gap-8 lg:flex-row lg:items-start">
        {/* Daftar Barang */}
        <div className="flex-1 overflow-hidden rounded-2xl border border-garis bg-latar">
          <div className="divide-y divide-garis">
            {items.map((item) => (
              <div
                key={`${item.id}-${item.varian}`}
                className="flex flex-col gap-4 p-4 sm:flex-row sm:items-center sm:justify-between"
              >
                <div className="flex items-center gap-3">
                  <img
                    src={item.foto_url || "/produk/keripik.svg"}
                    alt={item.nama}
                    className="h-16 w-16 rounded-xl border border-garis bg-permukaan object-cover"
                  />
                  <div>
                    <h2 className="font-semibold">{item.nama}</h2>
                    <p className="text-xs text-teks-lembut">Varian: {item.varian || "Standar"}</p>
                    <p className="text-sm font-bold text-harga">{formatRupiah(item.harga)}</p>
                  </div>
                </div>

                <div className="flex items-center justify-between gap-4 sm:justify-end">
                  {/* Pengatur jumlah */}
                  <div className="flex items-center rounded-lg border border-garis bg-permukaan">
                    <button
                      type="button"
                      onClick={() => ubahJumlah(item.id, item.varian, item.jumlah - 1)}
                      className="px-2.5 py-1 text-sm font-bold text-teks hover:bg-garis"
                    >
                      -
                    </button>
                    <span className="w-8 text-center text-xs font-semibold">{item.jumlah}</span>
                    <button
                      type="button"
                      onClick={() => ubahJumlah(item.id, item.varian, item.jumlah + 1)}
                      className="px-2.5 py-1 text-sm font-bold text-teks hover:bg-garis"
                    >
                      +
                    </button>
                  </div>

                  <span className="min-w-20 text-right font-bold text-teks">
                    {formatRupiah(item.harga * item.jumlah)}
                  </span>

                  <button
                    type="button"
                    onClick={() => hapusItem(item.id, item.varian)}
                    className="text-xs text-teks-lembut hover:text-bahaya"
                    title="Hapus item"
                  >
                    ✕
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Ringkasan & Checkout WhatsApp */}
        <div className="w-full rounded-2xl border border-garis bg-latar p-6 lg:max-w-sm">
          <h2 className="text-lg font-bold">Ringkasan Pesanan</h2>
          <div className="mt-4 flex flex-col gap-2 border-b border-garis pb-4 text-sm">
            <div className="flex justify-between text-teks-lembut">
              <span>Total Item</span>
              <span>{totalItem} pcs</span>
            </div>
            <div className="flex justify-between text-base font-bold text-teks">
              <span>Total Harga</span>
              <span className="text-harga">{formatRupiah(totalHarga)}</span>
            </div>
          </div>

          <div className="mt-6 flex flex-col gap-3">
            <a
              href={waUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex w-full items-center justify-center rounded-lg bg-utama px-5 py-3 font-semibold text-white hover:bg-utama-gelap"
            >
              Pesan Semua via WhatsApp
            </a>
            <Link
              href="/"
              className="text-center text-xs text-teks-lembut underline underline-offset-4 hover:text-utama"
            >
              Lanjut pilih produk lain
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}

