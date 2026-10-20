import Link from "next/link";
import { keluar } from "@/app/admin/actions";

export default function NavAdmin() {
  return (
    <nav className="flex flex-wrap items-center gap-x-5 gap-y-2 border-b border-garis pb-4 text-sm">
      <Link href="/admin" className="font-semibold hover:text-utama">
        Produk
      </Link>
      <Link href="/admin/kategori" className="font-semibold hover:text-utama">
        Kategori
      </Link>
      <Link href="/admin/ulasan" className="font-semibold hover:text-utama">
        Ulasan
      </Link>
      <Link href="/admin/banner" className="font-semibold hover:text-utama">
        Banner
      </Link>
      <Link href="/admin/log" className="font-semibold hover:text-utama">
        Log Aktivitas
      </Link>
      <Link href="/admin/akun" className="font-semibold hover:text-utama">
        Kelola Admin
      </Link>
      <Link href="/admin/pengaturan" className="font-semibold hover:text-utama">
        Pengaturan
      </Link>
      <Link href="/admin/password" className="font-semibold hover:text-utama">
        Password
      </Link>
      <form action={keluar} className="ml-auto">
        <button type="submit" className="text-teks-lembut hover:text-bahaya cursor-pointer">
          Keluar
        </button>
      </form>
    </nav>
  );
}
