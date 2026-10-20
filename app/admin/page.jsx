import NavAdmin from "@/components/NavAdmin";
import TabelProduk from "@/components/TabelProduk";
import Tombol from "@/components/Tombol";
import { createSessionClient } from "@/lib/supabase/session";

export const dynamic = "force-dynamic";

// US-07 (List Produk) & US-30 (Dashboard Ringkasan Admin)
export default async function HalamanAdmin() {
  let daftarProduk = [];
  let pesanError = null;

  try {
    const supabase = await createSessionClient();
    const { data, error } = await supabase
      .from("produk")
      .select("*")
      .order("id", { ascending: true });

    if (error) {
      pesanError = `Gagal memuat produk: ${error.message}`;
    } else {
      daftarProduk = data || [];
    }
  } catch (err) {
    pesanError = `Gagal memuat produk: ${err.message}`;
  }

  // US-30: Hitung ringkasan total dan per kategori
  const totalProduk = daftarProduk.length;
  const ringkasanKategori = {};
  daftarProduk.forEach((p) => {
    const kat = p.kategori || "Tanpa Kategori";
    ringkasanKategori[kat] = (ringkasanKategori[kat] || 0) + 1;
  });

  return (
    <div className="flex flex-col gap-8 py-8">
      <NavAdmin />

      {/* US-30: Dashboard Ringkasan */}
      <section aria-labelledby="judul-dashboard">
        <h2 id="judul-dashboard" className="text-xl font-bold mb-4">
          Ringkasan Toko
        </h2>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <div className="rounded-2xl border border-garis bg-latar p-5 shadow-sm">
            <p className="text-sm font-semibold text-teks-lembut">Total Produk</p>
            <p className="mt-2 text-3xl font-extrabold text-utama">{totalProduk}</p>
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

      {/* Bagian Daftar Produk */}
      <section className="flex flex-col gap-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h1 className="text-2xl font-extrabold">Daftar Produk</h1>
          <Tombol href="/admin/produk/baru">Tambah produk</Tombol>
        </div>

        {pesanError ? (
          <div className="rounded-lg border border-bahaya/20 bg-bahaya/10 p-4 text-sm text-bahaya">
            {pesanError}
          </div>
        ) : daftarProduk.length === 0 ? (
          <div className="rounded-2xl border border-garis bg-permukaan p-8 text-center text-teks-lembut">
            <p>Belum ada produk di database.</p>
          </div>
        ) : (
          <TabelProduk daftarProduk={daftarProduk} />
        )}
      </section>
    </div>
  );
}
