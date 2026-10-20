"use client";

import { useRouter } from "next/navigation";

// US-37: Pemilih dropdown interaktif untuk mengganti produk yang dibandingkan
export default function PemilihBandingkan({ daftarProduk = [], idA, idB }) {
  const router = useRouter();

  const handleChange = (posisi, val) => {
    const sp = new URLSearchParams();
    if (posisi === "a") {
      if (val) sp.set("a", val);
      if (idB) sp.set("b", idB);
    } else {
      if (idA) sp.set("a", idA);
      if (val) sp.set("b", val);
    }
    router.push(`/bandingkan?${sp.toString()}`);
  };

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 rounded-2xl border border-garis bg-permukaan p-4">
      <div className="flex flex-col gap-1.5">
        <label htmlFor="pilih-a" className="text-xs font-bold text-teks-lembut">
          Produk Pertama (A):
        </label>
        <select
          id="pilih-a"
          value={idA || ""}
          onChange={(e) => handleChange("a", e.target.value)}
          className="rounded-lg border border-garis bg-latar p-2 text-sm text-teks focus:border-utama focus:outline-none"
        >
          <option value="">-- Pilih Produk A --</option>
          {daftarProduk.map((p) => (
            <option key={p.id} value={p.id} disabled={String(p.id) === String(idB)}>
              {p.nama}
            </option>
          ))}
        </select>
      </div>

      <div className="flex flex-col gap-1.5">
        <label htmlFor="pilih-b" className="text-xs font-bold text-teks-lembut">
          Produk Kedua (B):
        </label>
        <select
          id="pilih-b"
          value={idB || ""}
          onChange={(e) => handleChange("b", e.target.value)}
          className="rounded-lg border border-garis bg-latar p-2 text-sm text-teks focus:border-utama focus:outline-none"
        >
          <option value="">-- Pilih Produk B --</option>
          {daftarProduk.map((p) => (
            <option key={p.id} value={p.id} disabled={String(p.id) === String(idA)}>
              {p.nama}
            </option>
          ))}
        </select>
      </div>
    </div>
  );
}

