import Link from "next/link";
import { formatRupiah, toSlug } from "@/lib/format";
import TombolFavorit from "@/components/TombolFavorit";

// US-01, US-19 (Stok), US-20 (Diskon), US-24 (Favorit), US-49 (Tautan Kategori)
export default function KartuProduk({ produk }) {
  const isHabis = produk.stok !== undefined && Number(produk.stok) <= 0;
  const adaDiskon =
    typeof produk.harga_diskon === "number" &&
    produk.harga_diskon > 0 &&
    produk.harga_diskon < produk.harga;

  const kategoriSlug = produk.kategori ? toSlug(produk.kategori) : null;

  return (
    <div className="group relative flex flex-col overflow-hidden rounded-2xl border border-garis bg-latar transition-shadow hover:shadow-sm">
      {/* Badge stok habis atau promo di pojok kiri atas */}
      <div className="absolute top-2 left-2 z-10 flex flex-col gap-1 pointer-events-none">
        {isHabis ? (
          <span className="rounded-md bg-bahaya px-2 py-0.5 text-xs font-bold text-white shadow-sm">
            Habis
          </span>
        ) : (
          produk.badge && (
            <span className="rounded-md bg-utama px-2 py-0.5 text-xs font-bold text-white shadow-sm">
              {produk.badge}
            </span>
          )
        )}
      </div>

      {/* Tombol favorit di pojok kanan atas (US-24) */}
      <div className="absolute top-2 right-2 z-10">
        <TombolFavorit id={produk.id} />
      </div>

      {/* Gambar produk */}
      <Link href={`/produk/${produk.id}`} className="block overflow-hidden">
        <img
          src={produk.foto_url || "/produk/keripik.svg"}
          alt={produk.nama}
          className={`aspect-square w-full bg-permukaan object-cover transition-transform duration-300 group-hover:scale-105 ${
            isHabis ? "opacity-60 grayscale" : ""
          }`}
        />
      </Link>

      <div className="flex flex-1 flex-col gap-2 p-3">
        {/* US-49: Nama kategori tertaut ke halaman /kategori/[slug] */}
        {kategoriSlug ? (
          <Link
            href={`/kategori/${kategoriSlug}`}
            className="text-xs text-teks-lembut hover:text-utama hover:underline w-fit z-10"
          >
            {produk.kategori}
          </Link>
        ) : (
          <p className="text-xs text-teks-lembut">-</p>
        )}

        <Link href={`/produk/${produk.id}`} className="block">
          <h3 className="font-semibold leading-snug group-hover:text-utama">{produk.nama}</h3>
        </Link>

        <div className="mt-auto flex flex-wrap items-baseline gap-1.5 pt-1">
          {adaDiskon ? (
            <>
              <p className="rounded-md bg-harga-latar px-2 py-0.5 text-sm font-bold text-harga">
                {formatRupiah(produk.harga_diskon)}
              </p>
              <p className="text-xs text-teks-lembut line-through">
                {formatRupiah(produk.harga)}
              </p>
            </>
          ) : (
            <p className="rounded-md bg-harga-latar px-2 py-0.5 text-sm font-bold text-harga">
              {formatRupiah(produk.harga)}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
