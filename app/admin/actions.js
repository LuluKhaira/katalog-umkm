"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createSessionClient } from "@/lib/supabase/session";
import { createServerClient } from "@/lib/supabase/server";

/**
 * Memastikan admin sudah login di server sebelum menjalankan Server Action yang mengubah data.
 * Mengambil data pengguna dari Supabase Auth secara aman di sisi server.
 */
export async function verifikasiAdmin() {
  const supabase = await createSessionClient();
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error || !user) {
    throw new Error("Akses ditolak: Anda harus login sebagai admin.");
  }

  return { supabase, user };
}

export { verifikasiAdmin as requireAdmin, verifikasiAdmin as requireAuth };

/**
 * US-24: Mengambil produk favorit berdasarkan ID dari database.
 */
export async function ambilProdukFavorit(ids = []) {
  if (!Array.isArray(ids) || ids.length === 0) return [];
  try {
    const supabase = createServerClient();
    const { data } = await supabase.from("produk").select("*").in("id", ids);
    return data || [];
  } catch (e) {
    console.error("Gagal mengambil produk favorit:", e);
    return [];
  }
}

/**
 * Server Action untuk memproses login admin menggunakan Supabase Auth.
 */
export async function login(prevState, formData) {
  const data = formData instanceof FormData ? formData : prevState;
  const isActionState = formData instanceof FormData;

  if (!data || typeof data.get !== "function") {
    return { error: "Data formulir tidak valid." };
  }

  const email = data.get("email");
  const password = data.get("password");

  if (!email || !password) {
    const pesan = "Email dan password wajib diisi.";
    if (isActionState) {
      return { error: pesan };
    }
    redirect(`/admin/login?error=${encodeURIComponent(pesan)}`);
  }

  const supabase = await createSessionClient();
  const { error } = await supabase.auth.signInWithPassword({
    email: String(email).trim(),
    password: String(password),
  });

  if (error) {
    const pesan =
      error.message === "Invalid login credentials"
        ? "Email atau password salah."
        : error.message || "Gagal masuk. Periksa kembali email dan password.";

    if (isActionState) {
      return { error: pesan };
    }
    redirect(`/admin/login?error=${encodeURIComponent(pesan)}`);
  }

  redirect("/admin");
}

/**
 * Server Action untuk mengganti password admin yang sedang login.
 */
export async function gantiPassword(prevState, formData) {
  const data = formData instanceof FormData ? formData : prevState;
  const isActionState = formData instanceof FormData;

  if (!data || typeof data.get !== "function") {
    return { error: "Data formulir tidak valid." };
  }

  let supabase;
  try {
    const verified = await verifikasiAdmin();
    supabase = verified.supabase;
  } catch (err) {
    const pesan = err.message || "Akses ditolak: Anda harus login terlebih dahulu.";
    if (isActionState) {
      return { error: pesan };
    }
    redirect(`/admin/login?error=${encodeURIComponent(pesan)}`);
  }

  const passwordBaru = data.get("password_baru");
  const konfirmasiPassword = data.get("konfirmasi_password");

  if (!passwordBaru || String(passwordBaru).length < 8) {
    return { error: "Password baru minimal 8 karakter." };
  }

  if (passwordBaru !== konfirmasiPassword) {
    return { error: "Konfirmasi password tidak sama dengan password baru." };
  }

  const { error } = await supabase.auth.updateUser({
    password: String(passwordBaru),
  });

  if (error) {
    return { error: error.message || "Gagal mengganti password." };
  }

  return { success: true, message: "Password berhasil diganti." };
}

/**
 * Server Action untuk mengakhiri sesi admin (logout).
 */
export async function keluar() {
  const supabase = await createSessionClient();
  await supabase.auth.signOut();
  redirect("/admin/login");
}

/**
 * US-14: Membuat deskripsi dengan Google Gemini API.
 */
export async function buatDeskripsiAI(nama, kategori) {
  try {
    await verifikasiAdmin();
  } catch (err) {
    return { error: err.message || "Akses ditolak: Anda harus login terlebih dahulu." };
  }

  if (!nama || !nama.trim()) {
    return { error: "Nama produk wajib diisi terlebih dahulu." };
  }
  if (!kategori || !kategori.trim()) {
    return { error: "Kategori produk wajib diisi terlebih dahulu." };
  }

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return { error: "GEMINI_API_KEY belum diisi di environment variable." };
  }

  const prompt = `Buatkan deskripsi produk singkat dalam bahasa Indonesia sebanyak 2 sampai 3 kalimat untuk produk UMKM dengan nama "${nama.trim()}" dan kategori "${kategori.trim()}". Gunakan gaya bahasa yang menarik, ramah pembeli, dan jangan membuat klaim yang berlebihan. Berikan teks deskripsi saja tanpa pengantar atau tanda kutip tambahan.`;

  try {
    let response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
        }),
      }
    );

    if (!response.ok) {
      response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            contents: [{ parts: [{ text: prompt }] }],
          }),
        }
      );
    }

    if (!response.ok) {
      const errData = await response.json().catch(() => ({}));
      return {
        error: `Gagal memanggil Gemini API: ${errData.error?.message || response.statusText}`,
      };
    }

    const data = await response.json();
    const hasil = data.candidates?.[0]?.content?.parts?.[0]?.text?.trim();
    return { success: true, deskripsi: hasil || "" };
  } catch (e) {
    return { error: `Terjadi kesalahan saat memanggil AI: ${e.message}` };
  }
}

/**
 * US-29: Helper untuk mengunggah file foto produk ke Supabase Storage (Server Side).
 */
async function uploadFotoKeStorage(file) {
  if (!file || typeof file.size !== "number" || file.size === 0) {
    return null;
  }

  // Validasi tipe file
  const allowedTypes = ["image/jpeg", "image/png", "image/webp"];
  if (!allowedTypes.includes(file.type)) {
    throw new Error("Format file foto harus berupa gambar JPEG, PNG, atau WebP.");
  }

  // Validasi ukuran maksimal 2 MB (2 * 1024 * 1024 byte)
  if (file.size > 2 * 1024 * 1024) {
    throw new Error("Ukuran file foto maksimal adalah 2 MB.");
  }

  const supabaseAdmin = createServerClient();
  const ext = file.name.split(".").pop() || "jpg";
  const uniqueName = `produk-${Date.now()}-${Math.random().toString(36).substring(2, 8)}.${ext}`;

  const arrayBuffer = await file.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);

  const { error } = await supabaseAdmin.storage
    .from("produk-foto")
    .upload(uniqueName, buffer, {
      contentType: file.type,
      upsert: true,
    });

  if (error) {
    throw new Error(`Gagal mengunggah foto ke storage: ${error.message}`);
  }

  const { data: urlData } = supabaseAdmin.storage
    .from("produk-foto")
    .getPublicUrl(uniqueName);

  return urlData.publicUrl;
}

/**
 * US-08, US-18, US-19, US-20, US-29: Tambah Produk
 */
export async function tambahProduk(prevState, formData) {
  const data = formData instanceof FormData ? formData : prevState;

  if (!data || typeof data.get !== "function") {
    return { error: "Data formulir tidak valid." };
  }

  let supabase;
  try {
    const verified = await verifikasiAdmin();
    supabase = verified.supabase;
  } catch (err) {
    return { error: err.message || "Akses ditolak: Anda harus login terlebih dahulu." };
  }

  const nama = data.get("nama")?.toString().trim();
  const hargaRaw = data.get("harga")?.toString().trim();
  const kategori = data.get("kategori")?.toString().trim() || null;
  let foto_url = data.get("foto_url")?.toString().trim() || null;
  const deskripsi = data.get("deskripsi")?.toString().trim() || null;
  const stokRaw = data.get("stok")?.toString().trim();
  const hargaDiskonRaw = data.get("harga_diskon")?.toString().trim();
  const badge = data.get("badge")?.toString().trim() || null;
  const fotoTambahanRaw = data.get("foto_tambahan")?.toString().trim() || "";
  const fotoFile = data.get("foto_file");

  if (!nama) {
    return { error: "Nama produk wajib diisi." };
  }

  const harga = parseInt(hargaRaw, 10);
  if (isNaN(harga) || harga < 0) {
    return { error: "Harga harus berupa angka yang tidak negatif." };
  }

  // Upload file foto jika disediakan (US-29)
  if (fotoFile && typeof fotoFile === "object" && fotoFile.size > 0) {
    try {
      const uploadedUrl = await uploadFotoKeStorage(fotoFile);
      if (uploadedUrl) {
        foto_url = uploadedUrl;
      }
    } catch (e) {
      return { error: e.message };
    }
  }

  const stok = stokRaw !== undefined && stokRaw !== "" ? parseInt(stokRaw, 10) : 10;
  let harga_diskon = null;
  if (hargaDiskonRaw) {
    const hd = parseInt(hargaDiskonRaw, 10);
    if (!isNaN(hd) && hd > 0) {
      if (hd >= harga) {
        return { error: "Harga diskon harus lebih kecil dari harga normal." };
      }
      harga_diskon = hd;
    }
  }

  const payload = {
    nama,
    harga,
    kategori,
    foto_url,
    deskripsi,
    stok: !isNaN(stok) ? stok : 10,
    harga_diskon,
    badge,
  };

  let newProduct = null;
  let insertError = null;

  const res1 = await supabase.from("produk").insert([payload]).select("id").single();
  if (res1.error && res1.error.message?.includes("does not exist")) {
    const fallbackPayload = { nama, harga, kategori, foto_url, deskripsi };
    const resFallback = await supabase.from("produk").insert([fallbackPayload]).select("id").single();
    newProduct = resFallback.data;
    insertError = resFallback.error;
  } else {
    newProduct = res1.data;
    insertError = res1.error;
  }

  if (insertError) {
    return { error: `Gagal menyimpan produk: ${insertError.message}` };
  }

  // Simpan foto tambahan jika ada (US-18)
  if (fotoTambahanRaw && newProduct?.id) {
    const urls = fotoTambahanRaw
      .split("\n")
      .map((u) => u.trim())
      .filter(Boolean);
    if (urls.length > 0) {
      try {
        await supabase.from("foto_produk").insert(
          urls.map((url, idx) => ({
            produk_id: newProduct.id,
            url,
            urutan: idx + 1,
          }))
        );
      } catch {}
    }
  }

  revalidatePath("/admin");
  revalidatePath("/");
  redirect("/admin");
}

/**
 * US-09, US-18, US-19, US-20, US-29: Ubah Produk
 */
export async function ubahProduk(prevState, formData) {
  const data = formData instanceof FormData ? formData : prevState;

  if (!data || typeof data.get !== "function") {
    return { error: "Data formulir tidak valid." };
  }

  let supabase;
  try {
    const verified = await verifikasiAdmin();
    supabase = verified.supabase;
  } catch (err) {
    return { error: err.message || "Akses ditolak: Anda harus login terlebih dahulu." };
  }

  const id = data.get("id");
  if (!id) {
    return { error: "ID produk tidak valid." };
  }

  const nama = data.get("nama")?.toString().trim();
  const hargaRaw = data.get("harga")?.toString().trim();
  const kategori = data.get("kategori")?.toString().trim() || null;
  let foto_url = data.get("foto_url")?.toString().trim() || null;
  const deskripsi = data.get("deskripsi")?.toString().trim() || null;
  const stokRaw = data.get("stok")?.toString().trim();
  const hargaDiskonRaw = data.get("harga_diskon")?.toString().trim();
  const badge = data.get("badge")?.toString().trim() || null;
  const fotoTambahanRaw = data.get("foto_tambahan")?.toString().trim() || "";
  const fotoFile = data.get("foto_file");

  if (!nama) {
    return { error: "Nama produk wajib diisi." };
  }

  const harga = parseInt(hargaRaw, 10);
  if (isNaN(harga) || harga < 0) {
    return { error: "Harga harus berupa angka yang tidak negatif." };
  }

  // Upload file foto jika ada (US-29)
  if (fotoFile && typeof fotoFile === "object" && fotoFile.size > 0) {
    try {
      const uploadedUrl = await uploadFotoKeStorage(fotoFile);
      if (uploadedUrl) {
        foto_url = uploadedUrl;
      }
    } catch (e) {
      return { error: e.message };
    }
  }

  const stok = stokRaw !== undefined && stokRaw !== "" ? parseInt(stokRaw, 10) : 10;
  let harga_diskon = null;
  if (hargaDiskonRaw) {
    const hd = parseInt(hargaDiskonRaw, 10);
    if (!isNaN(hd) && hd > 0) {
      if (hd >= harga) {
        return { error: "Harga diskon harus lebih kecil dari harga normal." };
      }
      harga_diskon = hd;
    }
  }

  const payload = {
    nama,
    harga,
    kategori,
    foto_url,
    deskripsi,
    stok: !isNaN(stok) ? stok : 10,
    harga_diskon,
    badge,
  };

  let updateError = null;
  const res1 = await supabase.from("produk").update(payload).eq("id", id);
  if (res1.error && res1.error.message?.includes("does not exist")) {
    const fallbackPayload = { nama, harga, kategori, foto_url, deskripsi };
    const resFallback = await supabase.from("produk").update(fallbackPayload).eq("id", id);
    updateError = resFallback.error;
  } else {
    updateError = res1.error;
  }

  if (updateError) {
    return { error: `Gagal mengubah produk: ${updateError.message}` };
  }

  // Perbarui foto tambahan jika diisi (US-18)
  if (fotoTambahanRaw !== undefined) {
    const urls = fotoTambahanRaw
      .split("\n")
      .map((u) => u.trim())
      .filter(Boolean);
    try {
      await supabase.from("foto_produk").delete().eq("produk_id", id);
      if (urls.length > 0) {
        await supabase.from("foto_produk").insert(
          urls.map((url, idx) => ({
            produk_id: id,
            url,
            urutan: idx + 1,
          }))
        );
      }
    } catch {}
  }

  revalidatePath("/admin");
  revalidatePath("/");
  revalidatePath(`/produk/${id}`);
  redirect("/admin");
}

/**
 * US-10: Hapus Produk
 */
export async function hapusProduk(id) {
  if (!id) {
    return { error: "ID produk tidak valid." };
  }

  let supabase;
  try {
    const verified = await verifikasiAdmin();
    supabase = verified.supabase;
  } catch (err) {
    return { error: err.message || "Akses ditolak: Anda harus login terlebih dahulu." };
  }

  const { error } = await supabase.from("produk").delete().eq("id", id);

  if (error) {
    return { error: `Gagal menghapus produk: ${error.message}` };
  }

  revalidatePath("/admin");
  revalidatePath("/");
  return { success: true };
}

/**
 * US-31: Tambah Kategori Baru
 */
export async function tambahKategori(prevState, formData) {
  const data = formData instanceof FormData ? formData : prevState;
  let supabase;
  try {
    const verified = await verifikasiAdmin();
    supabase = verified.supabase;
  } catch (err) {
    return { error: err.message || "Akses ditolak: Anda harus login terlebih dahulu." };
  }

  const nama = data.get("nama")?.toString().trim();
  if (!nama) {
    return { error: "Nama kategori wajib diisi." };
  }

  const slug = nama.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");

  const { error } = await supabase.from("kategori").insert([{ nama, slug }]);
  if (error) {
    return { error: `Gagal menambah kategori: ${error.message}` };
  }

  revalidatePath("/admin/kategori");
  revalidatePath("/admin");
  revalidatePath("/");
  return { success: true, message: `Kategori "${nama}" berhasil ditambahkan.` };
}

/**
 * US-31: Ubah Nama Kategori
 */
export async function ubahKategori(prevState, formData) {
  const data = formData instanceof FormData ? formData : prevState;
  let supabase;
  try {
    const verified = await verifikasiAdmin();
    supabase = verified.supabase;
  } catch (err) {
    return { error: err.message || "Akses ditolak: Anda harus login terlebih dahulu." };
  }

  const id = data.get("id");
  const namaLama = data.get("nama_lama")?.toString().trim();
  const namaBaru = data.get("nama")?.toString().trim();

  if (!id || !namaBaru) {
    return { error: "Data kategori tidak valid." };
  }

  const slug = namaBaru.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");

  const { error } = await supabase
    .from("kategori")
    .update({ nama: namaBaru, slug })
    .eq("id", id);

  if (error) {
    return { error: `Gagal mengubah kategori: ${error.message}` };
  }

  // Jika nama kategori berubah, perbarui juga di tabel produk
  if (namaLama && namaLama !== namaBaru) {
    try {
      await supabase.from("produk").update({ kategori: namaBaru }).eq("kategori", namaLama);
    } catch {}
  }

  revalidatePath("/admin/kategori");
  revalidatePath("/admin");
  revalidatePath("/");
  return { success: true, message: "Kategori berhasil diperbarui." };
}

/**
 * US-31: Hapus Kategori (Ditolak jika masih digunakan oleh produk)
 */
export async function hapusKategori(id, nama) {
  let supabase;
  try {
    const verified = await verifikasiAdmin();
    supabase = verified.supabase;
  } catch (err) {
    return { error: err.message || "Akses ditolak: Anda harus login terlebih dahulu." };
  }

  if (!id || !nama) {
    return { error: "ID atau nama kategori tidak valid." };
  }

  // Periksa apakah kategori masih digunakan oleh produk
  const { count, error: countError } = await supabase
    .from("produk")
    .select("id", { count: "exact", head: true })
    .eq("kategori", nama);

  if (!countError && count > 0) {
    return {
      error: `Kategori "${nama}" tidak dapat dihapus karena masih digunakan oleh ${count} produk.`,
    };
  }

  const { error } = await supabase.from("kategori").delete().eq("id", id);
  if (error) {
    return { error: `Gagal menghapus kategori: ${error.message}` };
  }

  revalidatePath("/admin/kategori");
  revalidatePath("/admin");
  revalidatePath("/");
  return { success: true };
}

/**
 * US-31: Tambah Kategori Baru
 */
export async function tambahKategori(prevState, formData) {
  const data = formData instanceof FormData ? formData : prevState;
  let supabase;
  try {
    const verified = await verifikasiAdmin();
    supabase = verified.supabase;
  } catch (err) {
    return { error: err.message || "Akses ditolak: Anda harus login terlebih dahulu." };
  }

  const nama = data.get("nama")?.toString().trim();
  if (!nama) {
    return { error: "Nama kategori wajib diisi." };
  }

  const slug = nama.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");

  const { error } = await supabase.from("kategori").insert([{ nama, slug }]);
  if (error) {
    return { error: `Gagal menambah kategori: ${error.message}` };
  }

  revalidatePath("/admin/kategori");
  revalidatePath("/admin");
  revalidatePath("/");
  return { success: true, message: `Kategori "${nama}" berhasil ditambahkan.` };
}

/**
 * US-31: Ubah Nama Kategori
 */
export async function ubahKategori(prevState, formData) {
  const data = formData instanceof FormData ? formData : prevState;
  let supabase;
  try {
    const verified = await verifikasiAdmin();
    supabase = verified.supabase;
  } catch (err) {
    return { error: err.message || "Akses ditolak: Anda harus login terlebih dahulu." };
  }

  const id = data.get("id");
  const namaLama = data.get("nama_lama")?.toString().trim();
  const namaBaru = data.get("nama")?.toString().trim();

  if (!id || !namaBaru) {
    return { error: "Data kategori tidak valid." };
  }

  const slug = namaBaru.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");

  const { error } = await supabase
    .from("kategori")
    .update({ nama: namaBaru, slug })
    .eq("id", id);

  if (error) {
    return { error: `Gagal mengubah kategori: ${error.message}` };
  }

  // Jika nama kategori berubah, perbarui juga di tabel produk
  if (namaLama && namaLama !== namaBaru) {
    try {
      await supabase.from("produk").update({ kategori: namaBaru }).eq("kategori", namaLama);
    } catch {}
  }

  revalidatePath("/admin/kategori");
  revalidatePath("/admin");
  revalidatePath("/");
  return { success: true, message: "Kategori berhasil diperbarui." };
}

/**
 * US-31: Hapus Kategori (Ditolak jika masih digunakan oleh produk)
 */
export async function hapusKategori(id, nama) {
  let supabase;
  try {
    const verified = await verifikasiAdmin();
    supabase = verified.supabase;
  } catch (err) {
    return { error: err.message || "Akses ditolak: Anda harus login terlebih dahulu." };
  }

  if (!id || !nama) {
    return { error: "ID atau nama kategori tidak valid." };
  }

  // Periksa apakah kategori masih digunakan oleh produk
  const { count, error: countError } = await supabase
    .from("produk")
    .select("id", { count: "exact", head: true })
    .eq("kategori", nama);

  if (!countError && count > 0) {
    return {
      error: `Kategori "${nama}" tidak dapat dihapus karena masih digunakan oleh ${count} produk.`,
    };
  }

  const { error } = await supabase.from("kategori").delete().eq("id", id);
  if (error) {
    return { error: `Gagal menghapus kategori: ${error.message}` };
  }

  revalidatePath("/admin/kategori");
  revalidatePath("/admin");
  revalidatePath("/");
  return { success: true };
}

