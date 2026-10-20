import NavAdmin from "@/components/NavAdmin";
import TabelUlasanAdmin from "@/components/TabelUlasanAdmin";
import { createSessionClient } from "@/lib/supabase/session";

export const dynamic = "force-dynamic";

// US-39: Halaman Admin Moderasi Ulasan
export default async function HalamanModerasiUlasan() {
  let daftarUlasan = [];
  let pesanError = null;

  try {
    const supabase = await createSessionClient();

    // Query ulasan dengan join ke produk
    const res = await supabase
      .from("ulasan")
      .select("id, produk_id, nama, rating, komentar, tampil, created_at, produk(nama)")
      .order("created_at", { ascending: false });

    if (res.error) {
      // Fallback query tanpa join jika relasi FK belum otomatis terbaca
      const fallback = await supabase
        .from("ulasan")
        .select("id, produk_id, nama, rating, komentar, tampil, created_at")
        .order("created_at", { ascending: false });

      if (fallback.error) {
        pesanError = fallback.error.message;
      } else {
        daftarUlasan = fallback.data || [];
      }
    } else {
      daftarUlasan = res.data || [];
    }
  } catch (err) {
    pesanError = err.message;
  }

  return (
    <div className="flex flex-col gap-8 py-8">
      <NavAdmin />

      <section className="flex flex-col gap-4">
        <div>
          <h1 className="text-2xl font-extrabold">Moderasi Ulasan Pembeli</h1>
          <p className="text-sm text-teks-lembut">
            Kelola ulasan yang masuk dari pengunjung. Anda dapat menyembunyikan ulasan yang tidak pantas atau menghapusnya.
          </p>
        </div>

        {pesanError ? (
          <div className="rounded-lg border border-bahaya/20 bg-bahaya/10 p-4 text-sm text-bahaya">
            Gagal memuat ulasan: {pesanError}
          </div>
        ) : (
          <TabelUlasanAdmin daftarUlasan={daftarUlasan} />
        )}
      </section>
    </div>
  );
}

