import Link from "next/link";
import { formatRupiah } from "@/lib/format";
import { toko } from "@/lib/toko";
import { createServerClient } from "@/lib/supabase/server";
import PemilihBandingkan from "@/components/PemilihBandingkan";
import TombolWhatsApp from "@/components/TombolWhatsApp";

export const dynamic = "force-dynamic";

export const metadata = {
  title: `Bandingkan Produk | ${toko.nama}`,
  description: `Bandingkan spesifikasi, harga, dan fitur produk di ${toko.nama}`,
};

// US-37: Halaman Bandingkan 2 Produk berdampingan (?a=ID&b=ID)
export default async function HalamanBandingkan({ searchParams }) {
  const params = (await searchParams) || {};
  const idA = params.a;
  const idB = params.b;

  let semuaProduk = [];
  let produkA = null;
  let produkB = null;

  try {
    const supabase = createServerClient();

    // Ambil semua produk aktif untuk pilihan dropdown
    const { data: daftar } = await supabase
      .from("produk")
      .select("id, nama, harga, foto_url")
      .neq("aktif", false)
      .order("nama", { ascending: true });

    semuaProduk = daftar || [];

    // Ambil detail produk A dan B
    const idsToFetch = [idA, idB].filter(Boolean);
    if (idsToFetch.length > 0) {
      const { data: detailData } = await supabase
        .from("produk")
        .select("*")
        .in("id", idsToFetch)
        .neq("aktif", false);

      if (detailData) {
        produkA = detailData.find((p) => String(p.id) === String(idA)) || null;
        produkB = detailData.find((p) => String(p.id) === String(idB)) || null;
      }
    }
  } catch (e) {
    console.error("Gagal memuat produk perbandingan:", e);
  }

  return (
    <div className="py-8 md:py-12 flex flex-col gap-8">
      <div>
        <nav aria-label="Breadcrumb" className="mb-2">
          <Link href="/" className="text-sm text-teks-lembut hover:text-utama">
            &larr; Kembali ke Katalog
          </Link>
        </nav>
        <h1 className="text-3xl font-extrabold tracking-tight">Bandingkan Produk</h1>
        <p className="mt-1 text-sm text-teks-lembut">
          Pilih 2 produk untuk melihat perbandingan harga, kategori, dan deskripsi secara berdampingan.
        </p>
      </div>

      {/* Kontrol Pemilihan Produk A & B */}
      <PemilihBandingkan daftarProduk={semuaProduk} idA={idA} idB={idB} />

      {/* Tabel Komparasi Berdampingan */}
      {produkA && produkB ? (
        <div className="overflow-x-auto rounded-2xl border border-garis bg-latar shadow-xs">
          <table className="w-full min-w-[540px] text-left text-sm table-fixed">
            <thead className="bg-permukaan border-b border-garis">
              <tr>
                <th className="w-1/4 p-4 font-bold text-teks-lembut">Fitur</th>
                <th className="w-3/8 p-4 font-bold text-teks text-base">{produkA.nama}</th>
                <th className="w-3/8 p-4 font-bold text-teks text-base">{produkB.nama}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-garis">
              {/* Foto Produk */}
              <tr>
                <td className="p-4 font-semibold text-teks-lembut">Foto</td>
                <td className="p-4">
                  <img
                    src={produkA.foto_url || "/produk/keripik.svg"}
                    alt={produkA.nama}
                    className="h-36 w-36 rounded-xl object-cover bg-permukaan border border-garis"
                  />
                </td>
                <td className="p-4">
                  <img
                    src={produkB.foto_url || "/produk/keripik.svg"}
                    alt={produkB.nama}
                    className="h-36 w-36 rounded-xl object-cover bg-permukaan border border-garis"
                  />
                </td>
              </tr>

              {/* Harga */}
              <tr>
                <td className="p-4 font-semibold text-teks-lembut">Harga</td>
                <td className="p-4">
                  {produkA.harga_diskon ? (
                    <div>
                      <span className="text-base font-bold text-harga">
                        {formatRupiah(produkA.harga_diskon)}
                      </span>
                      <span className="ml-2 text-xs line-through text-teks-lembut">
                        {formatRupiah(produkA.harga)}
                      </span>
                    </div>
                  ) : (
                    <span className="text-base font-bold text-harga">
                      {formatRupiah(produkA.harga)}
                    </span>
                  )}
                </td>
                <td className="p-4">
                  {produkB.harga_diskon ? (
                    <div>
                      <span className="text-base font-bold text-harga">
                        {formatRupiah(produkB.harga_diskon)}
                      </span>
                      <span className="ml-2 text-xs line-through text-teks-lembut">
                        {formatRupiah(produkB.harga)}
                      </span>
                    </div>
                  ) : (
                    <span className="text-base font-bold text-harga">
                      {formatRupiah(produkB.harga)}
                    </span>
                  )}
                </td>
              </tr>

              {/* Kategori */}
              <tr>
                <td className="p-4 font-semibold text-teks-lembut">Kategori</td>
                <td className="p-4 font-medium text-teks">{produkA.kategori || "-"}</td>
                <td className="p-4 font-medium text-teks">{produkB.kategori || "-"}</td>
              </tr>

              {/* Status Ketersediaan */}
              <tr>
                <td className="p-4 font-semibold text-teks-lembut">Ketersediaan</td>
                <td className="p-4">
                  {produkA.stok !== undefined && Number(produkA.stok) <= 0 ? (
                    <span className="inline-flex rounded-md bg-bahaya/10 px-2 py-0.5 text-xs font-bold text-bahaya">
                      Stok Habis
                    </span>
                  ) : (
                    <span className="inline-flex rounded-md bg-emerald-500/10 px-2 py-0.5 text-xs font-bold text-emerald-600 dark:text-emerald-400">
                      Tersedia ({produkA.stok !== undefined ? `${produkA.stok} pcs` : "Ready"})
                    </span>
                  )}
                </td>
                <td className="p-4">
                  {produkB.stok !== undefined && Number(produkB.stok) <= 0 ? (
                    <span className="inline-flex rounded-md bg-bahaya/10 px-2 py-0.5 text-xs font-bold text-bahaya">
                      Stok Habis
                    </span>
                  ) : (
                    <span className="inline-flex rounded-md bg-emerald-500/10 px-2 py-0.5 text-xs font-bold text-emerald-600 dark:text-emerald-400">
                      Tersedia ({produkB.stok !== undefined ? `${produkB.stok} pcs` : "Ready"})
                    </span>
                  )}
                </td>
              </tr>

              {/* Deskripsi */}
              <tr>
                <td className="p-4 font-semibold text-teks-lembut">Deskripsi</td>
                <td className="p-4 text-xs text-teks leading-relaxed">
                  {produkA.deskripsi || "Tidak ada deskripsi."}
                </td>
                <td className="p-4 text-xs text-teks leading-relaxed">
                  {produkB.deskripsi || "Tidak ada deskripsi."}
                </td>
              </tr>

              {/* Pesan WhatsApp */}
              <tr>
                <td className="p-4 font-semibold text-teks-lembut">Pemesanan</td>
                <td className="p-4">
                  <TombolWhatsApp produk={produkA} />
                </td>
                <td className="p-4">
                  <TombolWhatsApp produk={produkB} />
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      ) : (
        <div className="rounded-2xl border border-garis bg-permukaan/50 p-12 text-center text-teks-lembut">
          <p className="text-base font-semibold text-teks">
            {!idA && !idB
              ? "Silakan pilih 2 produk di atas untuk membandingkan."
              : !produkA
              ? "Pilih produk pertama (A) untuk dibandingkan."
              : "Pilih produk kedua (B) untuk melengkapi perbandingan."}
          </p>
          <p className="mt-1 text-xs">
            Perbandingan akan langsung ditampilkan berdampingan begitu kedua produk dipilih.
          </p>
        </div>
      )}
    </div>
  );
}

