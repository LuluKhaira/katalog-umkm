import Link from "next/link";
import { notFound } from "next/navigation";
import { formatRupiah, toSlug } from "@/lib/format";
import { getPengaturanToko } from "@/lib/pengaturan";
import { createServerClient } from "@/lib/supabase/server";
import GaleriFoto from "@/components/GaleriFoto";
import DetailProdukInteraktif from "@/components/DetailProdukInteraktif";
import KartuProduk from "@/components/KartuProduk";
import UlasanProduk from "@/components/UlasanProduk";
import AsistenAiProduk from "@/components/AsistenAiProduk";

// US-26: generateMetadata untuk SEO dan Open Graph
export async function generateMetadata({ params }) {
  const { id } = await params;
  const supabase = createServerClient();
  const dataToko = await getPengaturanToko();

  const { data: produk } = await supabase
    .from("produk")
    .select("*")
    .eq("id", id)
    .maybeSingle();

  // US-32: Jika produk tidak ditemukan atau nonaktif, kembalikan metadata 404
  if (!produk || produk.aktif === false) {
    return {
      title: "Produk Tidak Ditemukan",
    };
  }

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://katalog-umkm.vercel.app";
  const ogImage = produk.foto_url?.startsWith("http")
    ? produk.foto_url
    : `${siteUrl}${produk.foto_url || "/produk/keripik.svg"}`;

  return {
    title: `${produk.nama} | ${dataToko.nama}`,
    description: produk.deskripsi || dataToko.tagline,
    openGraph: {
      title: `${produk.nama} | ${dataToko.nama}`,
      description: produk.deskripsi || dataToko.tagline,
      images: [
        {
          url: ogImage,
          width: 800,
          height: 800,
          alt: produk.nama,
        },
      ],
    },
  };
}

// US-02, US-12, US-17, US-18, US-19, US-20, US-21, US-23, US-24, US-32 (Aktif), US-38 (Ulasan), US-43 (Pengaturan Toko), US-48 (Varian), US-49 (Tautan Kategori), US-50 (Asisten AI)
export default async function HalamanDetailProduk({ params }) {
  const { id } = await params;
  const supabase = createServerClient();
  const dataToko = await getPengaturanToko();

  // 1. Ambil data produk
  const { data: produk } = await supabase
    .from("produk")
    .select("*")
    .eq("id", id)
    .maybeSingle();

  // US-32: Jika produk tidak ada atau nonaktif, panggil notFound()
  if (!produk || produk.aktif === false) {
    notFound();
  }

  // 2. Ambil foto tambahan jika ada (US-18)
  let fotoTambahan = [];
  try {
    const { data: fotoData } = await supabase
      .from("foto_produk")
      .select("url")
      .eq("produk_id", id)
      .order("urutan", { ascending: true });
    if (fotoData) {
      fotoTambahan = fotoData.map((f) => f.url);
    }
  } catch {}

  // 3. Ambil varian harga per ukuran (US-48)
  let daftarVarian = [];
  try {
    const { data: vData } = await supabase
      .from("varian_produk")
      .select("*")
      .eq("produk_id", id)
      .order("harga", { ascending: true });
    daftarVarian = vData || [];
  } catch (e) {}

  // 4. Ambil ulasan produk yang berstatus tampil (US-38)
  let daftarUlasan = [];
  try {
    const { data: ulasanData } = await supabase
      .from("ulasan")
      .select("*")
      .eq("produk_id", id)
      .eq("tampil", true)
      .order("created_at", { ascending: false });
    daftarUlasan = ulasanData || [];
  } catch {}

  // 5. Ambil produk terkait dari kategori yang sama dan hanya yang aktif (US-17 & US-32)
  let produkTerkait = [];
  if (produk.kategori) {
    try {
      let resTerkait = await supabase
        .from("produk")
        .select("*")
        .eq("kategori", produk.kategori)
        .neq("id", id)
        .neq("aktif", false)
        .limit(4);

      if (resTerkait.error && (resTerkait.error.code === "42703" || resTerkait.error.message?.includes("aktif"))) {
        resTerkait = await supabase
          .from("produk")
          .select("*")
          .eq("kategori", produk.kategori)
          .neq("id", id)
          .limit(4);
      }
      produkTerkait = resTerkait.data || [];
    } catch {}
  }

  const adaDiskon =
    typeof produk.harga_diskon === "number" &&
    produk.harga_diskon > 0 &&
    produk.harga_diskon < produk.harga;

  return (
    <div className="py-8 md:py-12">
      <article className="grid gap-8 md:grid-cols-2">
        {/* Galeri foto produk (US-18) */}
        <GaleriFoto
          fotoUtama={produk.foto_url}
          fotoTambahan={fotoTambahan}
          namaProduk={produk.nama}
        />

        {/* Informasi produk & interaksi pembelian */}
        <div className="flex flex-col gap-4">
          <Link
            href="/"
            className="text-sm text-teks-lembut underline underline-offset-4 hover:text-utama"
          >
            Kembali ke katalog
          </Link>

          <div className="flex items-center gap-2">
            {/* US-49: Tautan kategori ke halaman /kategori/[slug] */}
            {produk.kategori ? (
              <Link
                href={`/kategori/${toSlug(produk.kategori)}`}
                className="text-sm font-semibold text-utama hover:underline"
              >
                {produk.kategori}
              </Link>
            ) : (
              <span className="text-sm font-semibold text-teks-lembut">Umum</span>
            )}
            {produk.badge && (
              <span className="rounded-md bg-utama px-2 py-0.5 text-xs font-bold text-white">
                {produk.badge}
              </span>
            )}
          </div>

          <h1 className="text-3xl font-extrabold leading-tight tracking-tight">
            {produk.nama}
          </h1>

          {/* Tampilan harga dengan harga coret diskon (US-20) */}
          <div className="flex flex-wrap items-baseline gap-2">
            {adaDiskon ? (
              <>
                <p className="rounded-md bg-harga-latar px-3 py-1 text-2xl font-bold text-harga">
                  {formatRupiah(produk.harga_diskon)}
                </p>
                <p className="text-base text-teks-lembut line-through">
                  {formatRupiah(produk.harga)}
                </p>
              </>
            ) : (
              <p className="rounded-md bg-harga-latar px-3 py-1 text-2xl font-bold text-harga">
                {formatRupiah(produk.harga)}
              </p>
            )}
          </div>

          <p className="max-w-prose leading-relaxed text-teks-lembut">
            {produk.deskripsi || "Tidak ada deskripsi produk."}
          </p>

          {/* Interaktif: jumlah, varian dinamis (US-48), WA dinamis (US-43), keranjang, share, favorit, bandingkan */}
          <DetailProdukInteraktif
            produk={produk}
            daftarVarian={daftarVarian}
            nomorWhatsApp={dataToko.whatsapp}
          />
        </div>
      </article>

      {/* US-50: Kotak Tanya Asisten AI tentang Produk */}
      <AsistenAiProduk produkId={id} namaProduk={produk.nama} />

      {/* US-38: Ulasan dan Rating Produk */}
      <UlasanProduk produkId={id} daftarUlasan={daftarUlasan} />

      {/* US-17 & US-32: Produk Terkait (Hanya produk aktif) */}
      {produkTerkait.length > 0 && (
        <section className="mt-16 border-t border-garis pt-10">
          <h2 className="mb-6 text-xl font-bold">Produk terkait</h2>
          <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
            {produkTerkait.map((item) => (
              <KartuProduk key={item.id} produk={item} />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
