"use client";

import { useActionState, useState } from "react";
import { tambahUlasan } from "@/app/admin/actions";
import Tombol from "@/components/Tombol";

// US-38: Ulasan dan Rating Produk (Form Kirim + Daftar Ulasan + Rating Rata-rata + Honeypot Spam Protection)
export default function UlasanProduk({ produkId, daftarUlasan = [] }) {
  const [state, formAction, isPending] = useActionState(tambahUlasan, null);
  const [ratingDipilih, setRatingDipilih] = useState(5);
  const [hoverRating, setHoverRating] = useState(0);

  const totalUlasan = daftarUlasan.length;
  const rataRata =
    totalUlasan > 0
      ? (daftarUlasan.reduce((acc, u) => acc + (u.rating || 5), 0) / totalUlasan).toFixed(1)
      : null;

  return (
    <section className="mt-12 flex flex-col gap-8 border-t border-garis pt-8" aria-labelledby="judul-ulasan">
      <div className="flex flex-col gap-2">
        <h2 id="judul-ulasan" className="text-2xl font-bold">
          Ulasan Pembeli
        </h2>
        {totalUlasan > 0 ? (
          <div className="flex items-center gap-3">
            <div className="flex items-center text-amber-500">
              {[1, 2, 3, 4, 5].map((star) => (
                <span key={star} className="text-xl">
                  {star <= Math.round(rataRata) ? "★" : "☆"}
                </span>
              ))}
            </div>
            <span className="text-base font-bold text-teks">{rataRata} / 5</span>
            <span className="text-sm text-teks-lembut">({totalUlasan} ulasan)</span>
          </div>
        ) : (
          <p className="text-sm text-teks-lembut">
            Belum ada ulasan untuk produk ini. Jadilah yang pertama memberikan ulasan!
          </p>
        )}
      </div>

      <div className="grid gap-8 lg:grid-cols-2">
        {/* Form Tulis Ulasan */}
        <div className="rounded-2xl border border-garis bg-latar p-5 shadow-xs">
          <h3 className="text-base font-bold text-teks mb-4">Tulis Ulasan Anda</h3>

          {state?.success && (
            <div className="mb-4 rounded-lg border border-emerald-500/20 bg-emerald-500/10 p-3 text-sm text-emerald-700 dark:text-emerald-400">
              {state.message}
            </div>
          )}

          {state?.error && (
            <div className="mb-4 rounded-lg border border-bahaya/20 bg-bahaya/10 p-3 text-sm text-bahaya">
              {state.error}
            </div>
          )}

          <form action={formAction} className="flex flex-col gap-4">
            <input type="hidden" name="produk_id" value={produkId} />

            {/* Proteksi Spam Honeypot (harus kosong) */}
            <input
              type="text"
              name="website"
              tabIndex={-1}
              autoComplete="off"
              className="hidden"
              aria-hidden="true"
            />

            {/* Input Nama */}
            <div className="flex flex-col gap-1.5">
              <label htmlFor="nama_ulasan" className="text-sm font-semibold">
                Nama Anda
              </label>
              <input
                id="nama_ulasan"
                name="nama"
                type="text"
                placeholder="Contoh: Budi Santoso"
                maxLength={100}
                required
                className="w-full rounded-lg border border-garis bg-latar px-3 py-2 text-sm text-teks placeholder:text-teks-lembut focus:border-utama focus:outline-none"
              />
            </div>

            {/* Pemilihan Bintang Rating */}
            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-semibold">Rating Kepuasan</label>
              <input type="hidden" name="rating" value={ratingDipilih} />
              <div className="flex items-center gap-1">
                {[1, 2, 3, 4, 5].map((star) => (
                  <button
                    key={star}
                    type="button"
                    onClick={() => setRatingDipilih(star)}
                    onMouseEnter={() => setHoverRating(star)}
                    onMouseLeave={() => setHoverRating(0)}
                    className="p-1 text-2xl transition-transform hover:scale-110 focus:outline-none"
                    aria-label={`${star} bintang`}
                  >
                    <span
                      className={
                        star <= (hoverRating || ratingDipilih)
                          ? "text-amber-500"
                          : "text-garis dark:text-teks-lembut/30"
                      }
                    >
                      ★
                    </span>
                  </button>
                ))}
                <span className="ml-2 text-xs font-semibold text-teks-lembut">
                  {ratingDipilih} dari 5 bintang
                </span>
              </div>
            </div>

            {/* Input Komentar */}
            <div className="flex flex-col gap-1.5">
              <label htmlFor="komentar_ulasan" className="text-sm font-semibold">
                Ulasan / Komentar
              </label>
              <textarea
                id="komentar_ulasan"
                name="komentar"
                rows={3}
                placeholder="Ceritakan pengalaman Anda membeli produk ini..."
                maxLength={500}
                required
                className="w-full rounded-lg border border-garis bg-latar px-3 py-2 text-sm text-teks placeholder:text-teks-lembut focus:border-utama focus:outline-none"
              />
            </div>

            <Tombol type="submit" disabled={isPending} className="self-start">
              {isPending ? "Mengirim..." : "Kirim Ulasan"}
            </Tombol>
          </form>
        </div>

        {/* Daftar Ulasan yang sudah ada */}
        <div className="flex flex-col gap-4">
          <h3 className="text-base font-bold text-teks">
            Semua Ulasan ({totalUlasan})
          </h3>

          {totalUlasan === 0 ? (
            <div className="rounded-2xl border border-garis bg-permukaan/40 p-6 text-center text-sm text-teks-lembut">
              Belum ada komentar pembeli yang ditampilkan.
            </div>
          ) : (
            <div className="flex flex-col gap-3 max-h-[460px] overflow-y-auto pr-1">
              {daftarUlasan.map((u) => (
                <div
                  key={u.id}
                  className="rounded-xl border border-garis bg-latar p-4 shadow-xs"
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-bold text-sm text-teks">{u.nama}</span>
                    <span className="text-xs text-teks-lembut">
                      {new Date(u.created_at).toLocaleDateString("id-ID", {
                        day: "numeric",
                        month: "short",
                        year: "numeric",
                      })}
                    </span>
                  </div>
                  <div className="mt-1 flex items-center text-amber-500 text-sm">
                    {[1, 2, 3, 4, 5].map((s) => (
                      <span key={s}>{s <= u.rating ? "★" : "☆"}</span>
                    ))}
                  </div>
                  <p className="mt-2 text-sm text-teks leading-relaxed">{u.komentar}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </section>
  );
}

