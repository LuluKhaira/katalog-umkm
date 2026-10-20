"use client";

import { useFavorit } from "@/lib/favorit-context";

export default function TombolFavorit({ id, className = "" }) {
  const { isFavorit, toggleFavorit, isLoaded } = useFavorit();
  const aktif = isLoaded && isFavorit(id);

  return (
    <button
      type="button"
      onClick={(e) => {
        e.preventDefault();
        e.stopPropagation();
        toggleFavorit(id);
      }}
      aria-label={aktif ? "Hapus dari favorit" : "Tambah ke favorit"}
      className={`inline-flex items-center justify-center rounded-full p-2 transition-transform active:scale-90 ${
        aktif
          ? "bg-bahaya/10 text-bahaya"
          : "bg-permukaan/80 text-teks-lembut hover:text-bahaya"
      } ${className}`}
    >
      <svg
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 24 24"
        className="h-5 w-5"
        fill={aktif ? "currentColor" : "none"}
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z" />
      </svg>
    </button>
  );
}

