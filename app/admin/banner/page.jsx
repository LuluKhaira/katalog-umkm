import NavAdmin from "@/components/NavAdmin";
import ManajemenBannerAdmin from "@/components/ManajemenBannerAdmin";
import { createSessionClient } from "@/lib/supabase/session";

export const dynamic = "force-dynamic";

// US-42: Halaman Kelola Banner Promo Admin
export default async function HalamanAdminBanner() {
  let daftarBanner = [];
  let pesanError = null;

  try {
    const supabase = await createSessionClient();
    const { data, error } = await supabase
      .from("banner")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) {
      pesanError = error.message;
    } else {
      daftarBanner = data || [];
    }
  } catch (err) {
    pesanError = err.message;
  }

  return (
    <div className="flex flex-col gap-8 py-8">
      <NavAdmin />

      <section className="flex flex-col gap-4">
        <div>
          <h1 className="text-2xl font-extrabold">Banner Promo Beranda</h1>
          <p className="text-sm text-teks-lembut">
            Kelola banner promosi dan pengumuman yang muncul di bagian atas halaman depan katalog.
          </p>
        </div>

        {pesanError ? (
          <div className="rounded-lg border border-bahaya/20 bg-bahaya/10 p-4 text-sm text-bahaya">
            Gagal memuat banner: {pesanError}
          </div>
        ) : (
          <ManajemenBannerAdmin daftarBanner={daftarBanner} />
        )}
      </section>
    </div>
  );
}

