"use client";

import { useState } from "react";

// US-18: Galeri foto produk dengan thumbnail
export default function GaleriFoto({ fotoUtama, fotoTambahan = [], namaProduk }) {
  const semuaFoto = [
    fotoUtama || "/produk/keripik.svg",
    ...fotoTambahan.filter(Boolean),
  ];
  const [fotoAktif, setFotoAktif] = useState(semuaFoto[0]);

  return (
    <div className="flex flex-col gap-3">
      <div className="overflow-hidden rounded-2xl border border-garis bg-permukaan">
        <img
          src={fotoAktif}
          alt={namaProduk}
          className="aspect-square w-full object-cover transition-all"
        />
      </div>

      {semuaFoto.length > 1 && (
        <div className="flex flex-wrap gap-2">
          {semuaFoto.map((url, idx) => (
            <button
              key={idx}
              type="button"
              onClick={() => setFotoAktif(url)}
              className={`h-16 w-16 overflow-hidden rounded-lg border-2 transition-all ${
                fotoAktif === url
                  ? "border-utama ring-2 ring-utama/20"
                  : "border-garis opacity-70 hover:opacity-100"
              }`}
            >
              <img src={url} alt="" className="h-full w-full object-cover" />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

