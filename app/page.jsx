import KartuProduk from "@/components/KartuProduk";
import Tombol from "@/components/Tombol";
import { toko } from "@/lib/toko";
import { createServerClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

// US-01 & US-11: Menampilkan katalog dengan filter kategori dan pencarian nama di database
export default async function HalamanKatalog({ searchParams }) {
  const resolvedSearchParams = (await searchParams) || {};
  const cari = resolvedSearchParams.q?.toString().trim() || "";
  const kategoriDipilih = resolvedSearchParams.kategori?.toString().trim() || "";

  let daftarProduk = [];
  let daftarKategori = [];
  let pesanError = null;

  try {
    const supabase = createServerClient();

    // Ambil daftar kategori unik dari tabel produk
    const { data: dataKategori } = await supabase
      .from("produk")
      .select("kategori");

    if (dataKategori) {
      daftarKategori = [
        ...new Set(dataKategori.map((p) => p.kategori).filter(Boolean)),
      ].sort();
    }

    // Bangun query penyaringan langsung di sisi server database
    let query = supabase.from("produk").select("*");

    if (cari) {
      query = query.ilike("nama", `%${cari}%`);
    }

    if (kategoriDipilih) {
      query = query.eq("kategori", kategoriDipilih);
    }

    const { data, error } = await query.order("id", { ascending: true });

    if (error) {
      pesanError = `Gagal mengambil data produk: ${error.message}`;
    } else {
      daftarProduk = data || [];
    }
  } catch (err) {
    pesanError = `Gagal mengambil data produk: ${err.message}`;
  }

  const sedangMenyaring = Boolean(cari || kategoriDipilih);

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
            Produk kami
          </h2>
        </div>

        {/* Form pencarian dan filter kategori */}
        <form method="GET" action="/" className="flex flex-col gap-2.5 sm:flex-row sm:items-center">
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
          <div className="flex gap-2">
            <Tombol type="submit">Cari</Tombol>
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
                ? "Tidak ada produk yang cocok dengan pencarian atau filter."
                : "Belum ada produk"}
            </p>
            {sedangMenyaring && (
              <Tombol href="/" varian="garis" className="mt-4">
                Lihat semua produk
              </Tombol>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-4 md:grid-cols-3">
            {daftarProduk.map((produk) => (
              <KartuProduk key={produk.id} produk={produk} />
            ))}
          </div>
        )}
      </section>
    </>
  );
}
