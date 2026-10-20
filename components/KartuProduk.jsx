import Link from "next/link";
import { formatRupiah } from "@/lib/format";

// US-01, US-19 (Stok Habis), US-20 (Harga Coret & Badge Promo)
export default function KartuProduk({ produk }) {
  const isHabis = produk.stok !== undefined && Number(produk.stok) <= 0;
  const adaDiskon =
    typeof produk.harga_diskon === "number" &&
    produk.harga_diskon > 0 &&
    produk.harga_diskon < produk.harga;

  return (
    <Link
      href={`/produk/${produk.id}`}
      className="group relative flex flex-col overflow-hidden rounded-2xl border border-garis bg-latar transition-shadow hover:shadow-sm"
    >
      {/* Badge stok habis atau badge promo */}
      <div className="absolute top-2 left-2 z-10 flex flex-col gap-1">
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

      <img
        src={produk.foto_url || "/produk/keripik.svg"}
        alt={produk.nama}
        className={`aspect-square w-full bg-permukaan object-cover ${
          isHabis ? "opacity-60 grayscale" : ""
        }`}
      />
      <div className="flex flex-1 flex-col gap-2 p-3">
        <p className="text-xs text-teks-lembut">{produk.kategori || "-"}</p>
        <h3 className="font-semibold leading-snug group-hover:text-utama">{produk.nama}</h3>
        
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
    </Link>
  );
}
