import Link from "next/link";
import { notFound } from "next/navigation";
import KartuProduk from "@/components/KartuProduk";
import Tombol from "@/components/Tombol";
import { getPengaturanToko } from "@/lib/pengaturan";
import { createServerClient } from "@/lib/supabase/server";
import { toSlug } from "@/lib/format";

export const dynamic = "force-dynamic";

// Helper mencari nama kategori berdasarkan slug
async function ambilDataKategori(slug) {
  const supabase = createServerClient();

  // 1. Cek di tabel kategori
  try {
    const { data: kat } = await supabase
      .from("kategori")
      .select("nama, slug")
      .eq("slug", slug)
      .maybeSingle();

    if (kat?.nama) return kat.nama;
  } catch (e) {}

  // 2. Fallback: Cari di kategori unik produk
  try {
    const { data: produkKategori } = await supabase.from("produk").select("kategori");
    if (produkKategori) {
      for (const p of produkKategori) {
        if (p.kategori && toSlug(p.kategori) === slug) {
          return p.kategori;
        }
      }
    }
  } catch (e) {}

  return null;
}

// US-49: Metadata SEO dinamis per kategori
export async function generateMetadata({ params }) {
  const { slug } = await params;
  const namaKategori = await ambilDataKategori(slug);
  const dataToko = await getPengaturanToko();

  if (!namaKategori) {
    return {
      title: "Kategori Tidak Ditemukan",
    };
  }

  return {
    title: `Kategori: ${namaKategori} | ${dataToko.nama}`,
    description: `Daftar produk terbaik dalam kategori ${namaKategori} di ${dataToko.nama}.`,
  };
}

// US-49: Halaman per Kategori (/kategori/[slug])
export default async function HalamanKategori({ params }) {
  const { slug } = await params;
  const namaKategori = await ambilDataKategori(slug);

  // Jika slug tidak ada di database, panggil notFound()
  if (!namaKategori) {
    notFound();
  }

  const supabase = createServerClient();
  let daftarProduk = [];
  let pesanError = null;

  try {
    let query = supabase
      .from("produk")
      .select("*")
      .eq("kategori", namaKategori)
      .neq("aktif", false);

    // US-47: Urutan default
    query = query.order("urutan", { ascending: false }).order("id", { ascending: false });

    let res = await query;
    if (
      res.error &&
      (res.error.code === "42703" ||
        res.error.message?.includes("does not exist") ||
        res.error.message?.includes("urutan") ||
        res.error.message?.includes("aktif"))
    ) {
      res = await supabase
        .from("produk")
        .select("*")
        .eq("kategori", namaKategori)
        .order("id", { ascending: false });
    }

    if (res.error) {
      pesanError = res.error.message;
    } else {
      daftarProduk = res.data || [];
    }
  } catch (e) {
    pesanError = e.message;
  }

  return (
    <div className="py-8 md:py-12 flex flex-col gap-6">
      <div>
        <nav aria-label="Breadcrumb" className="mb-2">
          <Link href="/" className="text-sm text-teks-lembut hover:text-utama">
            &larr; Kembali ke Semua Produk
          </Link>
        </nav>
        <h1 className="text-3xl font-extrabold tracking-tight">Kategori: {namaKategori}</h1>
        <p className="mt-1 text-sm text-teks-lembut">
          Menampilkan {daftarProduk.length} produk dalam kategori &ldquo;{namaKategori}&rdquo;.
        </p>
      </div>

      {pesanError ? (
        <div className="rounded-xl border border-bahaya/20 bg-bahaya/10 p-4 text-sm text-bahaya">
          Gagal memuat produk: {pesanError}
        </div>
      ) : daftarProduk.length === 0 ? (
        <div className="rounded-2xl border border-garis bg-permukaan p-8 text-center text-teks-lembut">
          <p>Belum ada produk aktif di kategori ini.</p>
          <Tombol href="/" varian="garis" className="mt-4">
            Lihat semua produk
          </Tombol>
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-4">
          {daftarProduk.map((produk) => (
            <KartuProduk key={produk.id} produk={produk} />
          ))}
        </div>
      )}
    </div>
  );
}

