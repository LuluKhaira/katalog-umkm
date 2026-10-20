import Link from "next/link";
import NavAdmin from "@/components/NavAdmin";
import TabelProduk from "@/components/TabelProduk";
import Tombol from "@/components/Tombol";
import { formatRupiah } from "@/lib/format";
import { createSessionClient } from "@/lib/supabase/session";

export const dynamic = "force-dynamic";

const PER_PAGE = 10;

// US-07, US-30 (Ringkasan), US-33 (Cari & Paginasi Admin), US-35 (Ekspor CSV), US-41 (Widget Produk Terlaris)
export default async function HalamanAdmin({ searchParams }) {
  const params = (await searchParams) || {};
  const cari = params.q?.toString().trim() || "";
  const halaman = Math.max(1, parseInt(params.page, 10) || 1);

  let daftarProduk = [];
  let totalData = 0;
  let totalHalaman = 1;
  let totalSemuaProduk = 0;
  let ringkasanKategori = {};
  let top5Produk = [];
  let pesanError = null;

  try {
    const supabase = await createSessionClient();

    // 1. Ambil ringkasan seluruh produk untuk US-30
    const { data: semuaData } = await supabase.from("produk").select("id, kategori");
    if (semuaData) {
      totalSemuaProduk = semuaData.length;
      semuaData.forEach((p) => {
        const kat = p.kategori || "Tanpa Kategori";
        ringkasanKategori[kat] = (ringkasanKategori[kat] || 0) + 1;
      });
    }

    // 2. US-33: Query produk dengan pencarian dan paginasi di database
    let query = supabase.from("produk").select("*", { count: "exact" });

    if (cari) {
      query = query.ilike("nama", `%${cari}%`);
    }

    query = query.order("id", { ascending: false });

    const from = (halaman - 1) * PER_PAGE;
    const to = from + PER_PAGE - 1;
    query = query.range(from, to);

    const { data, count, error } = await query;

    if (error) {
      pesanError = `Gagal memuat produk: ${error.message}`;
    } else {
      daftarProduk = data || [];
      totalData = count || 0;
      totalHalaman = Math.max(1, Math.ceil(totalData / PER_PAGE));
    }

    // 3. US-41: Ambil data statistik klik WA untuk widget 5 produk terlaris
    try {
      const { data: klikData } = await supabase.from("klik_wa").select("produk_id");
      if (klikData && klikData.length > 0) {
        const hitungan = {};
        klikData.forEach((k) => {
          if (k.produk_id) {
            hitungan[k.produk_id] = (hitungan[k.produk_id] || 0) + 1;
          }
        });

        const urutanTop = Object.entries(hitungan)
          .sort((a, b) => b[1] - a[1])
          .slice(0, 5);

        if (urutanTop.length > 0) {
          const ids = urutanTop.map(([id]) => id);
          const { data: produkTerpilih } = await supabase
            .from("produk")
            .select("id, nama, harga, foto_url")
            .in("id", ids);

          if (produkTerpilih) {
            top5Produk = urutanTop
              .map(([id, jumlahKlik]) => {
                const p = produkTerpilih.find((item) => String(item.id) === String(id));
                return p ? { ...p, jumlahKlik } : null;
              })
              .filter(Boolean);
          }
        }
      }
    } catch (e) {
      // Abaikan jika tabel klik_wa belum dibuat
    }
  } catch (err) {
    pesanError = `Gagal memuat produk: ${err.message}`;
  }

  const buatLinkHalaman = (nomorHalaman) => {
    const sp = new URLSearchParams();
    if (cari) sp.set("q", cari);
    if (nomorHalaman > 1) sp.set("page", nomorHalaman);
    const qs = sp.toString();
    return qs ? `/admin?${qs}` : "/admin";
  };

  return (
    <div className="flex flex-col gap-8 py-8">
      <NavAdmin />

      {/* US-30: Dashboard Ringkasan Toko */}
      <section aria-labelledby="judul-dashboard">
        <h2 id="judul-dashboard" className="text-xl font-bold mb-4">
          Ringkasan Toko
        </h2>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <div className="rounded-2xl border border-garis bg-latar p-5 shadow-sm">
            <p className="text-sm font-semibold text-teks-lembut">Total Produk</p>
            <p className="mt-2 text-3xl font-extrabold text-utama">{totalSemuaProduk}</p>
            <p className="mt-1 text-xs text-teks-lembut">Tersimpan di katalog database</p>
          </div>

          <div className="rounded-2xl border border-garis bg-latar p-5 shadow-sm">
            <p className="text-sm font-semibold text-teks-lembut">Total Kategori</p>
            <p className="mt-2 text-3xl font-extrabold text-harga">
              {Object.keys(ringkasanKategori).length}
            </p>
            <p className="mt-1 text-xs text-teks-lembut">Kategori produk aktif</p>
          </div>

          <div className="rounded-2xl border border-garis bg-latar p-5 shadow-sm sm:col-span-2 lg:col-span-1">
            <p className="text-sm font-semibold text-teks-lembut mb-2">Produk per Kategori</p>
            <div className="flex flex-wrap gap-1.5 max-h-24 overflow-y-auto">
              {Object.entries(ringkasanKategori).map(([kat, jml]) => (
                <span
                  key={kat}
                  className="inline-flex items-center gap-1 rounded-md bg-permukaan px-2 py-1 text-xs font-medium text-teks"
                >
                  <span>{kat}:</span>
                  <strong className="text-utama">{jml}</strong>
                </span>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* US-41: Widget 5 Produk Terlaris (Paling Banyak Diklik WhatsApp) */}
      <section aria-labelledby="judul-terlaris">
        <h2 id="judul-terlaris" className="text-xl font-bold mb-3 flex items-center gap-2">
          <span>🔥</span> 5 Produk Terlaris (Klik WhatsApp Terbanyak)
        </h2>
        {top5Produk.length === 0 ? (
          <div className="rounded-xl border border-garis bg-permukaan/50 p-4 text-sm text-teks-lembut">
            Belum ada aktivitas klik pemesanan WhatsApp yang tercatat.
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-5">
            {top5Produk.map((item, index) => (
              <div
                key={item.id}
                className="relative flex items-center gap-3 rounded-xl border border-garis bg-latar p-3 shadow-xs"
              >
                <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-utama/10 text-xs font-bold text-utama">
                  #{index + 1}
                </span>
                <img
                  src={item.foto_url || "/produk/keripik.svg"}
                  alt=""
                  className="h-10 w-10 shrink-0 rounded-md object-cover bg-permukaan"
                />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold text-teks" title={item.nama}>
                    {item.nama}
                  </p>
                  <p className="text-xs text-teks-lembut">{formatRupiah(item.harga)}</p>
                  <p className="mt-0.5 text-xs font-bold text-emerald-600 dark:text-emerald-400">
                    {item.jumlahKlik}x klik WA
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Bagian Manajemen Daftar Produk */}
      <section className="flex flex-col gap-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl font-extrabold">Daftar Produk</h1>
            <p className="text-sm text-teks-lembut">
              Menampilkan {daftarProduk.length} dari {totalData} produk
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {/* US-35: Tombol Ekspor CSV */}
            <a
              href="/admin/produk/ekspor"
              download
              className="inline-flex items-center gap-1.5 rounded-lg border border-garis bg-permukaan px-3.5 py-2 text-sm font-semibold text-teks transition-colors hover:border-utama hover:text-utama"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-4 w-4"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth="2"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                />
              </svg>
              Ekspor CSV
            </a>

            {/* US-46: Tombol Impor CSV */}
            <Link
              href="/admin/produk/impor"
              className="inline-flex items-center gap-1.5 rounded-lg border border-garis bg-permukaan px-3.5 py-2 text-sm font-semibold text-teks transition-colors hover:border-utama hover:text-utama"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-4 w-4"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth="2"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12"
                />
              </svg>
              Impor CSV
            </Link>

            <Tombol href="/admin/produk/baru">+ Tambah produk</Tombol>
          </div>
        </div>

        {/* US-33: Form Pencarian di Admin */}
        <form method="GET" action="/admin" className="flex items-center gap-2">
          <div className="relative flex-1">
            <input
              type="search"
              name="q"
              defaultValue={cari}
              placeholder="Cari produk berdasarkan nama..."
              className="w-full rounded-lg border border-garis bg-latar py-2 pl-9 pr-3 text-sm text-teks placeholder:text-teks-lembut focus:border-utama focus:outline-none"
            />
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="absolute left-3 top-2.5 h-4 w-4 text-teks-lembut"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth="2"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
              />
            </svg>
          </div>
          <button
            type="submit"
            className="rounded-lg bg-utama px-4 py-2 text-sm font-semibold text-white hover:bg-utama-gelap"
          >
            Cari
          </button>
          {cari && (
            <Link
              href="/admin"
              className="rounded-lg border border-garis px-3 py-2 text-sm text-teks-lembut hover:text-teks"
            >
              Reset
            </Link>
          )}
        </form>

        {pesanError ? (
          <div className="rounded-lg border border-bahaya/20 bg-bahaya/10 p-4 text-sm text-bahaya">
            {pesanError}
          </div>
        ) : daftarProduk.length === 0 ? (
          <div className="rounded-2xl border border-garis bg-permukaan p-8 text-center text-teks-lembut">
            {cari ? (
              <p>Tidak ada produk yang cocok dengan pencarian &ldquo;{cari}&rdquo;.</p>
            ) : (
              <p>Belum ada produk di database.</p>
            )}
          </div>
        ) : (
          <>
            <TabelProduk daftarProduk={daftarProduk} />

            {/* US-33: Paginasi Admin */}
            {totalHalaman > 1 && (
              <div className="flex items-center justify-between gap-3 pt-3">
                <span className="text-xs text-teks-lembut">
                  Halaman {halaman} dari {totalHalaman}
                </span>
                <div className="flex items-center gap-2">
                  <Tombol
                    href={buatLinkHalaman(halaman - 1)}
                    varian="garis"
                    disabled={halaman <= 1}
                  >
                    Sebelumnya
                  </Tombol>
                  <Tombol
                    href={buatLinkHalaman(halaman + 1)}
                    varian="garis"
                    disabled={halaman >= totalHalaman}
                  >
                    Selanjutnya
                  </Tombol>
                </div>
              </div>
            )}
          </>
        )}
      </section>
    </div>
  );
}
