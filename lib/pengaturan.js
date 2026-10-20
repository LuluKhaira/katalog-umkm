import { toko } from "@/lib/toko";
import { createServerClient } from "@/lib/supabase/server";

/**
 * US-43: Mengambil pengaturan toko dari database Supabase (tabel pengaturan_toko) di sisi server.
 * Jika tabel belum ada atau kosong, otomatis memakai data cadangan dari lib/toko.js.
 */
export async function getPengaturanToko() {
  try {
    const supabase = createServerClient();
    const { data } = await supabase
      .from("pengaturan_toko")
      .select("*")
      .eq("id", 1)
      .maybeSingle();

    if (data && data.nama) {
      return {
        nama: data.nama || toko.nama,
        nomorWhatsApp: data.whatsapp || toko.nomorWhatsApp,
        whatsapp: data.whatsapp || toko.nomorWhatsApp,
        alamat: data.alamat || toko.alamat,
        jamBuka: data.jam_buka || toko.jamBuka,
        tagline: toko.tagline,
      };
    }
  } catch (e) {
    // Fallback jika database belum ada tabel pengaturan_toko
  }

  return {
    ...toko,
    whatsapp: toko.nomorWhatsApp,
  };
}

