import Link from "next/link";
import KartuProduk from "@/components/KartuProduk";
import Tombol from "@/components/Tombol";
import { toko } from "@/lib/toko";
import { createServerClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

const PER_PAGE = 12;

// US-01, US-11 (Filter & Cari), US-15 (Urutkan), US-16 (Paginasi)
export default async function HalamanKatalog({ searchParams }) {
  const params = (await searchParams) || {};
  const cari = params.q?.toString().trim() || "";
  const kategoriDipilih = params.kategori?.toString().trim() || "";
  const urutan = params.sort?.toString().trim() || "terbaru";
  const halaman = Math.max(1, parseInt(params.page, 10) || 1);

  let daftarProduk = [];
  let daftarKategori = [];
  let totalData = 0;
  let totalHalaman = 1;
  let pesanError = null;

  try {
    const supabase = createServerClient();

    // 1. Ambil daftar kategori unik dari tabel produk
    const { data: dataKategori } = await supabase.from("produk").select("kategori");
    if (dataKategori) {
      daftarKategori = [...new Set(dataKategori.map((p) => p.kategori).filter(Boolean))].sort();
    }

    // 2. Bangun query dengan penyaringan di database
    let query = supabase.from("produk").select("*", { count: "exact" });

    if (cari) {
      query = query.ilike("nama", `%${cari}%`);
    }

    if (kategoriDipilih) {
      query = query.eq("kategori", kategoriDipilih);
    }

    // US-15: Urutkan produk di query database
    if (urutan === "termurah") {
      query = query.order("harga", { ascending: true });
    } else if (urutan === "termahal") {
      query = query.order("harga", { ascending: false });
    } else {
      // Default terbaru
      query = query.order("id", { ascending: false });
    }

    // US-16: Paginasi range di query database
    const from = (halaman - 1) * PER_PAGE;
    const to = from + PER_PAGE - 1;
    query = query.range(from, to);

    const { data, count, error } = await query;

    if (error) {
      pesanError = `Gagal mengambil data produk: ${error.message}`;
    } else {
      daftarProduk = data || [];
      totalData = count || 0;
      totalHalaman = Math.max(1, Math.ceil(totalData / PER_PAGE));
    }
  } catch (err) {
    pesanError = `Gagal mengambil data produk: ${err.message}`;
  }

  const sedangMenyaring = Boolean(cari || kategoriDipilih || urutan !== "terbaru");

  const buatLinkHalaman = (nomorHalaman) => {
    const sp = new URLSearchParams();
    if (cari) sp.set("q", cari);
    if (kategoriDipilih) sp.set("kategori", kategoriDipilih);
    if (urutan && urutan !== "terbaru") sp.set("sort", urutan);
    if (nomorHalaman > 1) sp.set("page", nomorHalaman);
    const qs = sp.toString();
    return qs ? `/?${qs}` : "/";
  };

  return (
    <>
      <section className="py-10 sm:py-14">
        <h1 className="max-w-2xl text-4xl font-extrabold leading-tight tracking-tight sm:text-5xl">
          {toko.nama}
        </h1>
        <p className="mt-3 max-w-xl text-lg text-teks-lembut">{toko.tagline}</p>
        <p className="mt-4 text-sm text-teks-lembut">{toko.jamBuka}</p>
      </section>

      <section aria-labelledby="judul-produk" className="flex flex-col gap-6">
        <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
          <h2 id="judul-produk" className="text-xl font-bold">
            Produk kami ({totalData})
          </h2>
        </div>

        {/* Form pencarian, filter kategori, dan urutan (US-11 & US-15) */}
        <form method="GET" action="/" className="flex flex-col gap-2.5 md:flex-row md:items-center">
          <div className="relative flex-1">
            <input
              type="text"
              name="q"
              defaultValue={cari}
              placeholder="Cari nama produk..."
              className="w-full rounded-lg border border-garis bg-latar px-3.5 py-2 text-sm text-teks placeholder:text-teks-lembut focus:border-utama focus:outline-none"
            />
          </div>

          <select
            name="kategori"
            defaultValue={kategoriDipilih}
            className="rounded-lg border border-garis bg-latar px-3.5 py-2 text-sm text-teks focus:border-utama focus:outline-none"
          >
            <option value="">Semua kategori</option>
            {daftarKategori.map((kat) => (
              <option key={kat} value={kat}>
                {kat}
              </option>
            ))}
          </select>

          <select
            name="sort"
            defaultValue={urutan}
            className="rounded-lg border border-garis bg-latar px-3.5 py-2 text-sm text-teks focus:border-utama focus:outline-none"
          >
            <option value="terbaru">Terbaru</option>
            <option value="termurah">Harga: Termurah</option>
            <option value="termahal">Harga: Termahal</option>
          </select>

          <div className="flex gap-2">
            <Tombol type="submit">Terapkan</Tombol>
            {sedangMenyaring && (
              <Tombol href="/" varian="garis">
                Reset
              </Tombol>
            )}
          </div>
        </form>

        {pesanError ? (
          <div className="rounded-xl border border-bahaya/20 bg-bahaya/10 p-4 text-sm text-bahaya">
            {pesanError}
          </div>
        ) : daftarProduk.length === 0 ? (
          <div className="rounded-2xl border border-garis bg-permukaan p-8 text-center text-teks-lembut">
            <p>
              {sedangMenyaring
                ? "Tidak ada produk yang cocok dengan filter atau pencarian Anda."
                : "Belum ada produk"}
            </p>
            {sedangMenyaring && (
              <Tombol href="/" varian="garis" className="mt-4">
                Lihat semua produk
              </Tombol>
            )}
          </div>
        ) : (
          <>
            <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-4">
              {daftarProduk.map((produk) => (
                <KartuProduk key={produk.id} produk={produk} />
              ))}
            </div>

            {/* US-16: Navigasi Paginasi */}
            {totalHalaman > 1 && (
              <nav aria-label="Paginasi produk" className="mt-8 flex flex-wrap items-center justify-center gap-2">
                {halaman > 1 ? (
                  <Link
                    href={buatLinkHalaman(halaman - 1)}
                    className="rounded-lg border border-garis bg-latar px-3 py-1.5 text-sm font-semibold hover:border-utama"
                  >
                    Sebelumnya
                  </Link>
                ) : (
                  <span className="rounded-lg border border-garis/50 bg-permukaan/50 px-3 py-1.5 text-sm text-teks-lembut/50">
                    Sebelumnya
                  </span>
                )}

                <div className="flex items-center gap-1">
                  {Array.from({ length: totalHalaman }, (_, i) => i + 1).map((nomor) => (
                    <Link
                      key={nomor}
                      href={buatLinkHalaman(nomor)}
                      className={`h-9 w-9 rounded-lg border text-sm font-semibold inline-flex items-center justify-center ${
                        nomor === halaman
                          ? "border-utama bg-utama text-white"
                          : "border-garis bg-latar text-teks hover:border-utama"
                      }`}
                    >
                      {nomor}
                    </Link>
                  ))}
                </div>

                {halaman < totalHalaman ? (
                  <Link
                    href={buatLinkHalaman(halaman + 1)}
                    className="rounded-lg border border-garis bg-latar px-3 py-1.5 text-sm font-semibold hover:border-utama"
                  >
                    Berikutnya
                  </Link>
                ) : (
                  <span className="rounded-lg border border-garis/50 bg-permukaan/50 px-3 py-1.5 text-sm text-teks-lembut/50">
                    Berikutnya
                  </span>
                )}
              </nav>
            )}
          </>
        )}
      </section>
    </>
  );
}
