import { verifikasiAdmin } from "@/app/admin/actions";

// US-35: Route Handler GET untuk Ekspor Semua Produk ke Format CSV
export async function GET() {
  let supabase;
  try {
    const verified = await verifikasiAdmin();
    supabase = verified.supabase;
  } catch (err) {
    return new Response("Unauthorized: Anda harus login sebagai admin.", {
      status: 401,
      headers: { "Content-Type": "text/plain; charset=utf-8" },
    });
  }

  try {
    const { data: daftarProduk, error } = await supabase
      .from("produk")
      .select("*")
      .order("id", { ascending: true });

    if (error) {
      return new Response(`Gagal mengambil data produk: ${error.message}`, {
        status: 500,
        headers: { "Content-Type": "text/plain; charset=utf-8" },
      });
    }

    const escapeCsv = (val) => {
      if (val === null || val === undefined) return '""';
      const str = String(val);
      // Escape jika ada koma, kutip ganda, atau baris baru
      return `"${str.replace(/"/g, '""')}"`;
    };

    const header = [
      "ID",
      "Nama Produk",
      "Kategori",
      "Harga",
      "Harga Diskon",
      "Stok",
      "Status Aktif",
      "Badge",
      "URL Foto",
      "Deskripsi",
      "Tanggal Dibuat",
    ].map(escapeCsv).join(",");

    const barisData = (daftarProduk || []).map((p) => {
      return [
        p.id,
        p.nama,
        p.kategori || "",
        p.harga,
        p.harga_diskon !== null && p.harga_diskon !== undefined ? p.harga_diskon : "",
        p.stok !== undefined ? p.stok : 10,
        p.aktif !== false ? "Aktif" : "Nonaktif",
        p.badge || "",
        p.foto_url || "",
        p.deskripsi || "",
        p.created_at || "",
      ]
        .map(escapeCsv)
        .join(",");
    });

    // Menambahkan BOM UTF-8 (\uFEFF) agar Microsoft Excel & aplikasi lain membuka karakter dengan benar
    const csvContent = "\uFEFF" + [header, ...barisData].join("\r\n");

    const tanggalHariIni = new Date().toISOString().slice(0, 10);
    const namaFile = `katalog-produk-${tanggalHariIni}.csv`;

    return new Response(csvContent, {
      status: 200,
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="${namaFile}"`,
        "Cache-Control": "no-store, max-age=0",
      },
    });
  } catch (err) {
    return new Response(`Terjadi kesalahan server: ${err.message}`, {
      status: 500,
      headers: { "Content-Type": "text/plain; charset=utf-8" },
    });
  }
}

