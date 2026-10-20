import NavAdmin from "@/components/NavAdmin";
import { createSessionClient } from "@/lib/supabase/session";

export const dynamic = "force-dynamic";

// US-45: Halaman Log Aktivitas Admin (Menampilkan 50 log terakhir)
export default async function HalamanLogAdmin() {
  let daftarLog = [];
  let pesanError = null;

  try {
    const supabase = await createSessionClient();
    const { data, error } = await supabase
      .from("log_admin")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(50);

    if (error) {
      pesanError = error.message;
    } else {
      daftarLog = data || [];
    }
  } catch (err) {
    pesanError = err.message;
  }

  const getAksiBadgeClass = (aksi) => {
    const a = (aksi || "").toLowerCase();
    if (a.includes("tambah")) return "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400";
    if (a.includes("ubah")) return "bg-amber-500/10 text-amber-600 dark:text-amber-400";
    if (a.includes("hapus")) return "bg-bahaya/10 text-bahaya";
    return "bg-garis text-teks-lembut";
  };

  return (
    <div className="flex flex-col gap-8 py-8">
      <NavAdmin />

      <section className="flex flex-col gap-4">
        <div>
          <h1 className="text-2xl font-extrabold">Log Aktivitas Admin</h1>
          <p className="text-sm text-teks-lembut">
            Menampilkan riwayat 50 aktivitas terakhir: siapa yang melakukan perubahan dan objek apa yang diubah.
          </p>
        </div>

        {pesanError ? (
          <div className="rounded-lg border border-bahaya/20 bg-bahaya/10 p-4 text-sm text-bahaya">
            Gagal memuat log aktivitas: {pesanError}
          </div>
        ) : daftarLog.length === 0 ? (
          <div className="rounded-2xl border border-garis bg-permukaan p-8 text-center text-teks-lembut">
            Belum ada aktivitas admin yang tercatat di database.
          </div>
        ) : (
          <div className="overflow-x-auto rounded-2xl border border-garis bg-latar">
            <table className="w-full min-w-[640px] text-left text-sm">
              <thead className="bg-permukaan text-teks-lembut">
                <tr>
                  <th className="px-4 py-3 font-semibold">Waktu</th>
                  <th className="px-4 py-3 font-semibold">Email Admin</th>
                  <th className="px-4 py-3 font-semibold">Aksi</th>
                  <th className="px-4 py-3 font-semibold">Detail / Info Produk</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-garis">
                {daftarLog.map((log) => (
                  <tr key={log.id} className="hover:bg-permukaan/40">
                    <td className="px-4 py-3 text-xs text-teks-lembut whitespace-nowrap">
                      {new Date(log.created_at).toLocaleString("id-ID", {
                        day: "numeric",
                        month: "short",
                        year: "numeric",
                        hour: "2-digit",
                        minute: "2-digit",
                        second: "2-digit",
                      })}
                    </td>
                    <td className="px-4 py-3 font-medium text-teks whitespace-nowrap">
                      {log.email}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <span
                        className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ${getAksiBadgeClass(
                          log.aksi
                        )}`}
                      >
                        {log.aksi}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-teks max-w-xs truncate" title={log.produk_info}>
                      {log.produk_info || "-"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}

