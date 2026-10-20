"use client";

import Link from "next/link";
import { toko } from "@/lib/toko";
import { useKeranjang } from "@/lib/keranjang-context";

export default function Header() {
  const { totalItem } = useKeranjang();

  return (
    <header className="border-b border-garis bg-latar">
      <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-4">
        <Link href="/" className="text-lg font-extrabold tracking-tight text-utama">
          {toko.nama}
        </Link>
        <Link
          href="/keranjang"
          className="flex items-center gap-2 rounded-lg border border-garis bg-permukaan px-3 py-1.5 text-sm font-semibold text-teks hover:border-utama hover:text-utama"
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
          <span>Keranjang</span>
          {totalItem > 0 && (
            <span className="rounded-full bg-utama px-2 py-0.2 text-xs font-bold text-white">
              {totalItem}
            </span>
          )}
        </Link>
      </div>
    </header>
  );
}
