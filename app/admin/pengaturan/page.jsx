import NavAdmin from "@/components/NavAdmin";
import FormPengaturanToko from "@/components/FormPengaturanToko";
import { getPengaturanToko } from "@/lib/pengaturan";

export const dynamic = "force-dynamic";

// US-43: Halaman Admin Pengaturan Toko
export default async function HalamanAdminPengaturan() {
  const pengaturan = await getPengaturanToko();

  return (
    <div className="flex flex-col gap-8 py-8">
      <NavAdmin />

      <section className="flex flex-col gap-4">
        <div>
          <h1 className="text-2xl font-extrabold">Pengaturan Identitas Toko</h1>
          <p className="text-sm text-teks-lembut">
            Ubah nama toko, nomor WhatsApp pemesanan, jam buka, dan alamat langsung dari admin tanpa mengubah kode.
          </p>
        </div>

        <div className="rounded-2xl border border-garis bg-latar p-6">
          <FormPengaturanToko pengaturanAwal={pengaturan} />
        </div>
      </section>
    </div>
  );
}

