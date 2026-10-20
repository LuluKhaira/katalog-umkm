"use client";

import { useState, useTransition } from "react";
import { tanyaAiProduk } from "@/app/admin/actions";

// US-50: Asisten AI Tanya Jawab Produk (Server Action Gemini + Proteksi Rate Limit)
export default function AsistenAiProduk({ produkId, namaProduk }) {
  const [pertanyaan, setPertanyaan] = useState("");
  const [riwayat, setRiwayat] = useState([]);
  const [errorPesan, setErrorPesan] = useState(null);
  const [isPending, startTransition] = useTransition();

  const handleKirim = (e) => {
    e?.preventDefault();
    setErrorPesan(null);

    const q = pertanyaan.trim();
    if (!q) {
      setErrorPesan("Tulis pertanyaan Anda terlebih dahulu.");
      return;
    }
    if (q.length > 200) {
      setErrorPesan("Pertanyaan maksimal 200 karakter.");
      return;
    }

    startTransition(async () => {
      const res = await tanyaAiProduk(produkId, q);
      if (res?.error) {
        setErrorPesan(res.error);
      } else if (res?.jawaban) {
        setRiwayat((prev) => [...prev, { q, a: res.jawaban }]);
        setPertanyaan("");
      }
    });
  };

  const handlePilihContoh = (teks) => {
    setPertanyaan(teks);
  };

  return (
    <section
      className="mt-10 rounded-2xl border border-garis bg-latar p-6 shadow-xs flex flex-col gap-5"
      aria-labelledby="judul-tanya-ai"
    >
      <div className="flex items-center gap-2.5">
        <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-utama/10 text-xl text-utama">
          ✨
        </span>
        <div>
          <h3 id="judul-tanya-ai" className="text-base font-bold text-teks">
            Tanya Asisten AI tentang {namaProduk}
          </h3>
          <p className="text-xs text-teks-lembut">
            Dapatkan jawaban instan seputar harga, stok, varian, dan deskripsi produk ini.
          </p>
        </div>
      </div>

      {/* Riwayat Tanya Jawab */}
      {riwayat.length > 0 && (
        <div className="flex flex-col gap-3 max-h-64 overflow-y-auto pr-1">
          {riwayat.map((chat, idx) => (
            <div key={idx} className="flex flex-col gap-1.5 text-sm">
              <div className="self-end rounded-xl bg-utama text-white px-3.5 py-2 max-w-[85%] text-xs font-medium">
                {chat.q}
              </div>
              <div className="self-start rounded-xl bg-permukaan border border-garis text-teks px-3.5 py-2 max-w-[90%] text-xs leading-relaxed">
                <span className="font-bold text-utama block mb-1">Asisten Toko:</span>
                {chat.a}
              </div>
            </div>
          ))}
        </div>
      )}

      {errorPesan && (
        <div className="rounded-lg border border-bahaya/20 bg-bahaya/10 p-3 text-xs text-bahaya">
          {errorPesan}
        </div>
      )}

      {/* Rekomendasi Pertanyaan Cepat */}
      <div className="flex flex-wrap items-center gap-1.5 text-xs">
        <span className="text-teks-lembut font-semibold mr-1">Contoh:</span>
        <button
          type="button"
          onClick={() => handlePilihContoh("Apakah produk ini masih ready stok?")}
          className="rounded-full border border-garis bg-permukaan px-2.5 py-1 text-teks-lembut hover:border-utama hover:text-utama cursor-pointer"
        >
          Stok ready?
        </button>
        <button
          type="button"
          onClick={() => handlePilihContoh("Apa saja pilihan varian dan harganya?")}
          className="rounded-full border border-garis bg-permukaan px-2.5 py-1 text-teks-lembut hover:border-utama hover:text-utama cursor-pointer"
        >
          Varian & harga?
        </button>
        <button
          type="button"
          onClick={() => handlePilihContoh("Bisa jelaskan deskripsi produk ini secara singkat?")}
          className="rounded-full border border-garis bg-permukaan px-2.5 py-1 text-teks-lembut hover:border-utama hover:text-utama cursor-pointer"
        >
          Info produk?
        </button>
      </div>

      {/* Input Pertanyaan */}
      <form onSubmit={handleKirim} className="flex flex-col gap-2">
        <div className="relative">
          <input
            type="text"
            value={pertanyaan}
            onChange={(e) => setPertanyaan(e.target.value)}
            placeholder="Ketik pertanyaan Anda tentang produk ini..."
            maxLength={200}
            disabled={isPending}
            className="w-full rounded-xl border border-garis bg-permukaan py-2.5 pl-3.5 pr-20 text-sm text-teks placeholder:text-teks-lembut focus:border-utama focus:outline-none disabled:opacity-50"
          />
          <button
            type="submit"
            disabled={isPending || !pertanyaan.trim()}
            className="absolute right-1.5 top-1.5 bottom-1.5 rounded-lg bg-utama px-3.5 text-xs font-semibold text-white hover:bg-utama-gelap disabled:opacity-40 transition-colors cursor-pointer"
          >
            {isPending ? "Menjawab..." : "Tanya"}
          </button>
        </div>
        <div className="flex justify-between items-center text-[11px] text-teks-lembut px-1">
          <span>Dijawab otomatis oleh model AI Gemini</span>
          <span>{pertanyaan.length}/200</span>
        </div>
      </form>
    </section>
  );
}

