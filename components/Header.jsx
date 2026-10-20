"use client";

import Link from "next/link";
import { toko } from "@/lib/toko";
import { useKeranjang } from "@/lib/keranjang-context";
import { useFavorit } from "@/lib/favorit-context";
import ToggleTema from "@/components/ToggleTema";

export default function Header() {
  const { totalItem } = useKeranjang();
  const { favoritIds } = useFavorit();

  return (
    <header className="border-b border-garis bg-latar transition-colors">
      <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-3 sm:py-4">
        <Link href="/" className="text-lg font-extrabold tracking-tight text-utama">
          {toko.nama}
        </Link>

        <div className="flex items-center gap-2 sm:gap-3">
          <Link
            href="/tentang"
            className="hidden text-sm font-semibold text-teks-lembut hover:text-utama sm:inline-block"
          >
            Tentang
          </Link>

          {/* Link Favorit (US-24) */}
          <Link
            href="/favorit"
            className="flex items-center gap-1.5 rounded-lg border border-garis bg-permukaan px-2.5 py-1.5 text-xs font-semibold text-teks hover:border-utama hover:text-utama sm:text-sm"
            title="Produk Favorit"
          >
            <span className="text-bahaya">♥</span>
            <span className="hidden sm:inline">Favorit</span>
            {favoritIds.length > 0 && (
              <span className="rounded-full bg-bahaya/20 px-1.5 py-0.2 text-xs font-bold text-bahaya">
                {favoritIds.length}
              </span>
            )}
          </Link>

          {/* Link Keranjang (US-21) */}
          <Link
            href="/keranjang"
            className="flex items-center gap-1.5 rounded-lg border border-garis bg-permukaan px-2.5 py-1.5 text-xs font-semibold text-teks hover:border-utama hover:text-utama sm:text-sm"
            title="Keranjang Belanja"
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
                d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z"
              />
            </svg>
            <span className="hidden sm:inline">Keranjang</span>
            {totalItem > 0 && (
              <span className="rounded-full bg-utama px-1.5 py-0.2 text-xs font-bold text-white">
                {totalItem}
              </span>
            )}
          </Link>

          {/* Toggle Dark Mode (US-25) */}
          <ToggleTema />
        </div>
      </div>
    </header>
  );
}
