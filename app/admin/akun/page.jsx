import NavAdmin from "@/components/NavAdmin";
import ManajemenAkunAdmin from "@/components/ManajemenAkunAdmin";
import { verifikasiAdmin } from "@/app/admin/actions";
import { createServerClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

// US-44: Halaman Kelola Akun Admin
export default async function HalamanAdminAkun() {
  const verified = await verifikasiAdmin();
  const currentAdminId = verified.user?.id;

  let daftarAdmin = [];
  let pesanError = null;

  try {
    const supabaseAdmin = createServerClient();
    const { data, error } = await supabaseAdmin.auth.admin.listUsers();
    if (error) {
      pesanError = error.message;
    } else {
      daftarAdmin = data.users || [];
    }
  } catch (err) {
    pesanError = err.message;
  }

  return (
    <div className="flex flex-col gap-8 py-8">
      <NavAdmin />

      <section className="flex flex-col gap-4">
        <div>
          <h1 className="text-2xl font-extrabold">Kelola Akun Admin</h1>
          <p className="text-sm text-teks-lembut">
            Kelola akses toko dengan menambahkan akun admin baru atau menonaktifkan akun admin lain.
          </p>
        </div>

        {pesanError ? (
          <div className="rounded-lg border border-bahaya/20 bg-bahaya/10 p-4 text-sm text-bahaya">
            Gagal memuat daftar admin: {pesanError}
          </div>
        ) : (
          <ManajemenAkunAdmin
            daftarAdmin={daftarAdmin}
            currentAdminId={currentAdminId}
          />
        )}
      </section>
    </div>
  );
}

