import Link from "next/link";
import { toko } from "@/lib/toko";

export default function Footer() {
  return (
    <footer className="mt-16 border-t border-garis bg-permukaan transition-colors">
      <div className="mx-auto flex max-w-5xl flex-col gap-6 px-4 py-8 text-sm text-teks-lembut sm:flex-row sm:justify-between">
        <div className="flex flex-col gap-1">
          <p className="font-bold text-teks">{toko.nama}</p>
          <p>{toko.alamat}</p>
          <p>{toko.jamBuka}</p>
        </div>

        <div className="flex flex-col gap-2 sm:items-end">
          <div className="flex flex-wrap gap-4">
            <Link href="/" className="hover:text-utama">
              Beranda
            </Link>
            <Link href="/tentang" className="hover:text-utama">
              Tentang Kami
            </Link>
            <Link href="/favorit" className="hover:text-utama">
              Favorit
            </Link>
            <Link href="/keranjang" className="hover:text-utama">
              Keranjang
            </Link>
          </div>
          <Link href="/admin" className="mt-2 text-xs underline underline-offset-4 hover:text-utama">
            Masuk sebagai admin
          </Link>
        </div>
      </div>
    </footer>
  );
}
