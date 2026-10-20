"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { cookies } from "next/headers";
import { createSessionClient } from "@/lib/supabase/session";
import { createServerClient } from "@/lib/supabase/server";

/**
 * Memastikan admin sudah login di server sebelum menjalankan aksi yang mengubah data.
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
 * US-45: Helper pencatatan log aktivitas admin
 */
export async function catatLogAdmin(email, aksi, produkInfo) {
  try {
    const supabase = createServerClient();
    await supabase.from("log_admin").insert([
      {
        email: email || "admin",
        aksi: aksi || "-",
        produk_info: produkInfo ? String(produkInfo).slice(0, 255) : null,
      },
    ]);
  } catch (e) {
    // Abaikan jika tabel log_admin belum dimigrasi
  }
}

/**
 * US-24 & US-36: Mengambil data produk berdasarkan daftar ID dari database publik.
 */
export async function ambilProdukFavorit(ids = []) {
  if (!Array.isArray(ids) || ids.length === 0) return [];
  try {
    const supabase = createServerClient();
    const { data } = await supabase.from("produk").select("*").in("id", ids);
    return data || [];
  } catch (e) {
    return [];
  }
}

export async function ambilProdukTerakhirDilihat(ids = []) {
  return ambilProdukFavorit(ids);
}

/**
 * Server Action: Login admin menggunakan Supabase Auth
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
    if (isActionState) return { error: pesan };
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

    if (isActionState) return { error: pesan };
    redirect(`/admin/login?error=${encodeURIComponent(pesan)}`);
  }

  redirect("/admin");
}

/**
 * Server Action: Ganti password admin
 */
export async function gantiPassword(prevState, formData) {
  const data = formData instanceof FormData ? formData : prevState;
  const isActionState = formData instanceof FormData;

  let supabase;
  try {
    const verified = await verifikasiAdmin();
    supabase = verified.supabase;
  } catch (err) {
    const pesan = err.message || "Akses ditolak: Anda harus login terlebih dahulu.";
    if (isActionState) return { error: pesan };
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
 * Server Action: Logout admin
 */
export async function keluar() {
  const supabase = await createSessionClient();
  await supabase.auth.signOut();
  redirect("/admin/login");
}

/**
 * US-14: Deskripsi produk dengan Google Gemini API
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

  const prompt = `Buatkan deskripsi produk singkat dalam bahasa Indonesia sebanyak 2 sampai 3 kalimat untuk produk UMKM dengan nama "${nama.trim()}" dan kategori "${kategori.trim()}". Gunakan gaya bahasa yang menarik, ramah pembeli, dan tanpa klaim berlebihan. Tuliskan teks deskripsi langsung tanpa pengantar atau tanda kutip tambahan.`;

  try {
    let response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }] }),
      }
    );

    if (!response.ok) {
      response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }] }),
        }
      );
    }

    if (!response.ok) {
      const errData = await response.json().catch(() => ({}));
      return { error: `Gagal memanggil Gemini API: ${errData.error?.message || response.statusText}` };
    }

    const data = await response.json();
    const hasil = data.candidates?.[0]?.content?.parts?.[0]?.text?.trim();
    return { success: true, deskripsi: hasil || "" };
  } catch (e) {
    return { error: `Terjadi kesalahan saat memanggil AI: ${e.message}` };
  }
}

/**
 * US-29: Helper upload foto produk ke Supabase Storage
 */
async function uploadFotoKeStorage(file) {
  if (!file || typeof file.size !== "number" || file.size === 0) return null;

  const allowedTypes = ["image/jpeg", "image/png", "image/webp"];
  if (!allowedTypes.includes(file.type)) {
    throw new Error("Format file foto harus berupa gambar JPEG, PNG, atau WebP.");
  }

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
 * US-08, US-18, US-19, US-20, US-29, US-32, US-34: Tambah Produk dengan Validasi per Field
 */
export async function tambahProduk(prevState, formData) {
  const data = formData instanceof FormData ? formData : prevState;

  let supabase;
  try {
    const verified = await verifikasiAdmin();
    supabase = verified.supabase;
  } catch (err) {
    return { error: err.message || "Akses ditolak: Anda harus login terlebih dahulu." };
  }

  const nama = data.get("nama")?.toString().trim() || "";
  const hargaRaw = data.get("harga")?.toString().trim() || "";
  const kategori = data.get("kategori")?.toString().trim() || "";
  let foto_url = data.get("foto_url")?.toString().trim() || "";
  const deskripsi = data.get("deskripsi")?.toString().trim() || "";
  const stokRaw = data.get("stok")?.toString().trim() || "10";
  const hargaDiskonRaw = data.get("harga_diskon")?.toString().trim() || "";
  const badge = data.get("badge")?.toString().trim() || "";
  const aktifRaw = data.get("aktif");
  const aktif = aktifRaw === "true" || aktifRaw === "on" || aktifRaw === true;
  const fotoTambahanRaw = data.get("foto_tambahan")?.toString().trim() || "";
  const fotoFile = data.get("foto_file");

  const errors = {};

  // US-34: Validasi per field di server
  if (!nama) {
    errors.nama = "Nama produk wajib diisi.";
  }

  const harga = parseInt(hargaRaw, 10);
  if (isNaN(harga) || harga < 0) {
    errors.harga = "Harga harus berupa angka positif.";
  }

  let harga_diskon = null;
  if (hargaDiskonRaw) {
    const hd = parseInt(hargaDiskonRaw, 10);
    if (isNaN(hd) || hd < 0) {
      errors.harga_diskon = "Harga diskon harus berupa angka.";
    } else if (!isNaN(harga) && hd >= harga) {
      errors.harga_diskon = "Harga diskon harus lebih kecil dari harga normal.";
    } else {
      harga_diskon = hd;
    }
  }

  const values = {
    nama,
    harga: hargaRaw,
    harga_diskon: hargaDiskonRaw,
    kategori,
    stok: stokRaw,
    badge,
    foto_url,
    deskripsi,
    aktif,
    foto_tambahan: fotoTambahanRaw,
  };

  if (Object.keys(errors).length > 0) {
    return { errors, values };
  }

  // Upload file foto jika ada (US-29)
  if (fotoFile && typeof fotoFile === "object" && fotoFile.size > 0) {
    try {
      const uploadedUrl = await uploadFotoKeStorage(fotoFile);
      if (uploadedUrl) foto_url = uploadedUrl;
    } catch (e) {
      errors.foto_file = e.message;
      return { errors, values };
    }
  }

  const stok = parseInt(stokRaw, 10);

  const payload = {
    nama,
    harga,
    kategori: kategori || null,
    foto_url: foto_url || null,
    deskripsi: deskripsi || null,
    stok: !isNaN(stok) ? stok : 10,
    harga_diskon,
    badge: badge || null,
    aktif,
  };

  let newProduct = null;
  let insertError = null;

  const res1 = await supabase.from("produk").insert([payload]).select("id").single();
  if (res1.error && res1.error.message?.includes("does not exist")) {
    const fallback = { nama, harga, kategori: kategori || null, foto_url: foto_url || null, deskripsi: deskripsi || null };
    const resFallback = await supabase.from("produk").insert([fallback]).select("id").single();
    newProduct = resFallback.data;
    insertError = resFallback.error;
  } else {
    newProduct = res1.data;
    insertError = res1.error;
  }

  if (insertError) {
    return { error: `Gagal menyimpan produk: ${insertError.message}`, values };
  }

  if (fotoTambahanRaw && newProduct?.id) {
    const urls = fotoTambahanRaw.split("\n").map((u) => u.trim()).filter(Boolean);
    if (urls.length > 0) {
      try {
        await supabase.from("foto_produk").insert(
          urls.map((url, idx) => ({ produk_id: newProduct.id, url, urutan: idx + 1 }))
        );
      } catch {}
    }
  }

  // US-45: Catat log aktivitas admin
  await catatLogAdmin(verified.user?.email, "Tambah produk", nama);

  revalidatePath("/admin");
  revalidatePath("/");
  redirect("/admin");
}

/**
 * US-09, US-18, US-19, US-20, US-29, US-32, US-34: Ubah Produk dengan Validasi per Field
 */
export async function ubahProduk(prevState, formData) {
  const data = formData instanceof FormData ? formData : prevState;

  let supabase;
  try {
    const verified = await verifikasiAdmin();
    supabase = verified.supabase;
  } catch (err) {
    return { error: err.message || "Akses ditolak: Anda harus login terlebih dahulu." };
  }

  const id = data.get("id");
  if (!id) return { error: "ID produk tidak valid." };

  const nama = data.get("nama")?.toString().trim() || "";
  const hargaRaw = data.get("harga")?.toString().trim() || "";
  const kategori = data.get("kategori")?.toString().trim() || "";
  let foto_url = data.get("foto_url")?.toString().trim() || "";
  const deskripsi = data.get("deskripsi")?.toString().trim() || "";
  const stokRaw = data.get("stok")?.toString().trim() || "10";
  const hargaDiskonRaw = data.get("harga_diskon")?.toString().trim() || "";
  const badge = data.get("badge")?.toString().trim() || "";
  const aktifRaw = data.get("aktif");
  const aktif = aktifRaw === "true" || aktifRaw === "on" || aktifRaw === true;
  const fotoTambahanRaw = data.get("foto_tambahan")?.toString().trim() || "";
  const fotoFile = data.get("foto_file");

  const errors = {};

  if (!nama) {
    errors.nama = "Nama produk wajib diisi.";
  }

  const harga = parseInt(hargaRaw, 10);
  if (isNaN(harga) || harga < 0) {
    errors.harga = "Harga harus berupa angka positif.";
  }

  let harga_diskon = null;
  if (hargaDiskonRaw) {
    const hd = parseInt(hargaDiskonRaw, 10);
    if (isNaN(hd) || hd < 0) {
      errors.harga_diskon = "Harga diskon harus berupa angka.";
    } else if (!isNaN(harga) && hd >= harga) {
      errors.harga_diskon = "Harga diskon harus lebih kecil dari harga normal.";
    } else {
      harga_diskon = hd;
    }
  }

  const values = {
    id,
    nama,
    harga: hargaRaw,
    harga_diskon: hargaDiskonRaw,
    kategori,
    stok: stokRaw,
    badge,
    foto_url,
    deskripsi,
    aktif,
    foto_tambahan: fotoTambahanRaw,
  };

  if (Object.keys(errors).length > 0) {
    return { errors, values };
  }

  if (fotoFile && typeof fotoFile === "object" && fotoFile.size > 0) {
    try {
      const uploadedUrl = await uploadFotoKeStorage(fotoFile);
      if (uploadedUrl) foto_url = uploadedUrl;
    } catch (e) {
      errors.foto_file = e.message;
      return { errors, values };
    }
  }

  const stok = parseInt(stokRaw, 10);

  const payload = {
    nama,
    harga,
    kategori: kategori || null,
    foto_url: foto_url || null,
    deskripsi: deskripsi || null,
    stok: !isNaN(stok) ? stok : 10,
    harga_diskon,
    badge: badge || null,
    aktif,
  };

  let updateError = null;
  const res1 = await supabase.from("produk").update(payload).eq("id", id);
  if (res1.error && res1.error.message?.includes("does not exist")) {
    const fallback = { nama, harga, kategori: kategori || null, foto_url: foto_url || null, deskripsi: deskripsi || null };
    const resFallback = await supabase.from("produk").update(fallback).eq("id", id);
    updateError = resFallback.error;
  } else {
    updateError = res1.error;
  }

  if (updateError) {
    return { error: `Gagal mengubah produk: ${updateError.message}`, values };
  }

  if (fotoTambahanRaw !== undefined) {
    const urls = fotoTambahanRaw.split("\n").map((u) => u.trim()).filter(Boolean);
    try {
      await supabase.from("foto_produk").delete().eq("produk_id", id);
      if (urls.length > 0) {
        await supabase.from("foto_produk").insert(
          urls.map((url, idx) => ({ produk_id: id, url, urutan: idx + 1 }))
        );
      }
    } catch {}
  }

  // US-45: Catat log aktivitas admin
  await catatLogAdmin(verified.user?.email, "Ubah produk", nama);

  revalidatePath("/admin");
  revalidatePath("/");
  revalidatePath(`/produk/${id}`);
  redirect("/admin");
}

/**
 * US-10 & US-45: Hapus Produk dengan Pencatatan Log
 */
export async function hapusProduk(id) {
  if (!id) return { error: "ID produk tidak valid." };

  let supabase;
  let adminEmail = null;
  try {
    const verified = await verifikasiAdmin();
    supabase = verified.supabase;
    adminEmail = verified.user?.email;
  } catch (err) {
    return { error: err.message || "Akses ditolak: Anda harus login terlebih dahulu." };
  }

  // Ambil nama produk untuk riwayat log sebelum dihapus
  let namaProduk = `ID ${id}`;
  try {
    const { data: prod } = await supabase.from("produk").select("nama").eq("id", id).maybeSingle();
    if (prod?.nama) namaProduk = prod.nama;
  } catch {}

  const { error } = await supabase.from("produk").delete().eq("id", id);
  if (error) return { error: `Gagal menghapus produk: ${error.message}` };

  // US-45: Catat log aktivitas admin
  await catatLogAdmin(adminEmail, "Hapus produk", namaProduk);

  revalidatePath("/admin");
  revalidatePath("/");
  return { success: true };
}

/**
 * US-32: Toggle Status Aktif/Nonaktif Produk
 */
export async function toggleAktifProduk(id, statusAktif) {
  let supabase;
  try {
    const verified = await verifikasiAdmin();
    supabase = verified.supabase;
  } catch (err) {
    return { error: err.message || "Akses ditolak: Anda harus login terlebih dahulu." };
  }

  const { error } = await supabase
    .from("produk")
    .update({ aktif: statusAktif })
    .eq("id", id);

  if (error) return { error: `Gagal memperbarui status: ${error.message}` };

  revalidatePath("/admin");
  revalidatePath("/");
  revalidatePath(`/produk/${id}`);
  return { success: true, aktif: statusAktif };
}

/**
 * US-31: Tambah Kategori Baru (Satu Definisi Bersih)
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
  if (!nama) return { error: "Nama kategori wajib diisi." };

  const slug = nama.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");

  const { error } = await supabase.from("kategori").insert([{ nama, slug }]);
  if (error) return { error: `Gagal menambah kategori: ${error.message}` };

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

  if (!id || !namaBaru) return { error: "Data kategori tidak valid." };

  const slug = namaBaru.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");

  const { error } = await supabase
    .from("kategori")
    .update({ nama: namaBaru, slug })
    .eq("id", id);

  if (error) return { error: `Gagal mengubah kategori: ${error.message}` };

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

  if (!id || !nama) return { error: "ID atau nama kategori tidak valid." };

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
  if (error) return { error: `Gagal menghapus kategori: ${error.message}` };

  revalidatePath("/admin/kategori");
  revalidatePath("/admin");
  revalidatePath("/");
  return { success: true };
}

/**
 * US-38: Tambah Ulasan Produk
 */
export async function tambahUlasan(prevState, formData) {
  const data = formData instanceof FormData ? formData : prevState;

  // Proteksi Spam: Honeypot field (harus kosong)
  const honeypot = data.get("website");
  if (honeypot) {
    return { error: "Terjadi kesalahan pengiriman." };
  }

  const produkId = data.get("produk_id");
  const nama = data.get("nama")?.toString().trim();
  const ratingRaw = data.get("rating")?.toString().trim();
  const komentar = data.get("komentar")?.toString().trim();

  if (!produkId) return { error: "Produk tidak valid." };
  if (!nama || nama.length > 100) return { error: "Nama wajib diisi (maks 100 karakter)." };
  if (!komentar || komentar.length > 500) return { error: "Komentar wajib diisi (maks 500 karakter)." };

  const rating = parseInt(ratingRaw, 10);
  if (isNaN(rating) || rating < 1 || rating > 5) {
    return { error: "Rating harus antara 1 sampai 5 bintang." };
  }

  try {
    const supabase = createServerClient();
    const { error } = await supabase.from("ulasan").insert([
      {
        produk_id: produkId,
        nama,
        rating,
        komentar,
        tampil: true,
      },
    ]);

    if (error) return { error: `Gagal menyimpan ulasan: ${error.message}` };

    revalidatePath(`/produk/${produkId}`);
    return { success: true, message: "Terima kasih! Ulasan Anda berhasil dikirim." };
  } catch (e) {
    return { error: "Terjadi kesalahan saat menyimpan ulasan." };
  }
}

/**
 * US-39: Moderasi Ulasan (Toggle Tampil & Hapus)
 */
export async function toggleTampilUlasan(id, tampil) {
  let supabase;
  try {
    const verified = await verifikasiAdmin();
    supabase = verified.supabase;
  } catch (err) {
    return { error: err.message || "Akses ditolak: Anda harus login terlebih dahulu." };
  }

  const { error } = await supabase
    .from("ulasan")
    .update({ tampil })
    .eq("id", id);

  if (error) return { error: `Gagal memperbarui ulasan: ${error.message}` };

  revalidatePath("/admin/ulasan");
  return { success: true };
}

export async function hapusUlasan(id) {
  let supabase;
  try {
    const verified = await verifikasiAdmin();
    supabase = verified.supabase;
  } catch (err) {
    return { error: err.message || "Akses ditolak: Anda harus login terlebih dahulu." };
  }

  const { error } = await supabase.from("ulasan").delete().eq("id", id);
  if (error) return { error: `Gagal menghapus ulasan: ${error.message}` };

  revalidatePath("/admin/ulasan");
  return { success: true };
}

/**
 * US-40: Catat Klik WhatsApp (Tanpa data pribadi)
 */
export async function catatKlikWa(produkId) {
  if (!produkId) return { success: false };
  try {
    const supabase = createServerClient();
    await supabase.from("klik_wa").insert([{ produk_id: produkId }]);
    return { success: true };
  } catch (e) {
    return { success: false };
  }
}

/**
 * US-42: Simpan & Kelola Banner Promo
 */
export async function simpanBanner(prevState, formData) {
  const data = formData instanceof FormData ? formData : prevState;
  let supabase;
  try {
    const verified = await verifikasiAdmin();
    supabase = verified.supabase;
  } catch (err) {
    return { error: err.message || "Akses ditolak: Anda harus login terlebih dahulu." };
  }

  const id = data.get("id");
  const judul = data.get("judul")?.toString().trim();
  const teks = data.get("teks")?.toString().trim() || null;
  const gambar_url = data.get("gambar_url")?.toString().trim() || null;
  const tautan = data.get("tautan")?.toString().trim() || null;
  const aktifRaw = data.get("aktif");
  const aktif = aktifRaw === "true" || aktifRaw === "on" || aktifRaw === true;

  if (!judul) return { error: "Judul banner wajib diisi." };

  const payload = { judul, teks, gambar_url, tautan, aktif };

  let err = null;
  if (id) {
    const res = await supabase.from("banner").update(payload).eq("id", id);
    err = res.error;
  } else {
    const res = await supabase.from("banner").insert([payload]);
    err = res.error;
  }

  if (err) return { error: `Gagal menyimpan banner: ${err.message}` };

  revalidatePath("/admin/banner");
  revalidatePath("/");
  return { success: true, message: "Banner berhasil disimpan." };
}

export async function toggleAktifBanner(id, aktif) {
  let supabase;
  try {
    const verified = await verifikasiAdmin();
    supabase = verified.supabase;
  } catch (err) {
    return { error: err.message || "Akses ditolak: Anda harus login terlebih dahulu." };
  }

  const { error } = await supabase.from("banner").update({ aktif }).eq("id", id);
  if (error) return { error: `Gagal memperbarui status banner: ${error.message}` };

  revalidatePath("/admin/banner");
  revalidatePath("/");
  return { success: true };
}

export async function hapusBanner(id) {
  let supabase;
  try {
    const verified = await verifikasiAdmin();
    supabase = verified.supabase;
  } catch (err) {
    return { error: err.message || "Akses ditolak: Anda harus login terlebih dahulu." };
  }

  const { error } = await supabase.from("banner").delete().eq("id", id);
  if (error) return { error: `Gagal menghapus banner: ${error.message}` };

  revalidatePath("/admin/banner");
  revalidatePath("/");
  return { success: true };
}

/**
 * US-36: Ambil Produk berdasarkan Array ID (untuk fitur Terakhir Dilihat)
 */
export async function ambilProdukByIds(ids = []) {
  if (!Array.isArray(ids) || ids.length === 0) return [];
  try {
    const supabase = createServerClient();
    let res = await supabase
      .from("produk")
      .select("*")
      .in("id", ids)
      .neq("aktif", false);

    if (res.error && (res.error.code === "42703" || res.error.message?.includes("aktif"))) {
      res = await supabase.from("produk").select("*").in("id", ids);
    }

    const data = res.data;
    if (res.error || !data) return [];

    // Urutkan sesuai urutan kunjungan di localStorage
    const idMap = new Map(data.map((p) => [String(p.id), p]));
    return ids.map((id) => idMap.get(String(id))).filter(Boolean);
  } catch (e) {
    return [];
  }
}

/**
 * US-43: Simpan Pengaturan Toko dari Admin
 */
export async function simpanPengaturanToko(prevState, formData) {
  const data = formData instanceof FormData ? formData : prevState;
  let supabase;
  let adminEmail = null;
  try {
    const verified = await verifikasiAdmin();
    supabase = verified.supabase;
    adminEmail = verified.user?.email;
  } catch (err) {
    return { error: err.message || "Akses ditolak: Anda harus login terlebih dahulu." };
  }

  const nama = data.get("nama")?.toString().trim();
  const whatsapp = data.get("whatsapp")?.toString().trim();
  const jam_buka = data.get("jam_buka")?.toString().trim();
  const alamat = data.get("alamat")?.toString().trim();

  if (!nama) {
    return { error: "Nama toko wajib diisi." };
  }

  if (!whatsapp) {
    return { error: "Nomor WhatsApp toko wajib diisi." };
  }

  // Validasi format nomor WhatsApp: angka, kode negara, tanpa spasi atau plus
  if (/[+\s\-]/.test(whatsapp) || !/^[0-9]{9,15}$/.test(whatsapp)) {
    return {
      error: "Nomor WhatsApp harus berupa angka dengan kode negara (contoh: 628123456789), tanpa spasi atau tanda plus (+).",
    };
  }

  const payload = {
    id: 1,
    nama,
    whatsapp,
    jam_buka: jam_buka || "Setiap hari, 08.00–20.00",
    alamat: alamat || "Indonesia",
    updated_at: new Date().toISOString(),
  };

  const { error } = await supabase
    .from("pengaturan_toko")
    .upsert(payload, { onConflict: "id" });

  if (error) {
    return { error: `Gagal menyimpan pengaturan toko: ${error.message}` };
  }

  await catatLogAdmin(adminEmail, "Ubah pengaturan toko", nama);

  revalidatePath("/");
  revalidatePath("/tentang");
  revalidatePath("/admin/pengaturan");
  return { success: true, message: "Pengaturan toko berhasil disimpan." };
}

/**
 * US-44: Kelola Akun Admin (Tambah Admin Baru)
 */
export async function tambahAkunAdmin(prevState, formData) {
  const data = formData instanceof FormData ? formData : prevState;
  let adminEmail = null;
  try {
    const verified = await verifikasiAdmin();
    adminEmail = verified.user?.email;
  } catch (err) {
    return { error: err.message || "Akses ditolak: Anda harus login terlebih dahulu." };
  }

  const email = data.get("email")?.toString().trim();
  const password = data.get("password")?.toString();

  if (!email || !email.includes("@")) {
    return { error: "Format email admin tidak valid." };
  }

  if (!password || password.length < 8) {
    return { error: "Password admin minimal 8 karakter." };
  }

  try {
    const supabaseAdmin = createServerClient();
    const { data: newUser, error } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
    });

    if (error) {
      return { error: `Gagal membuat akun admin: ${error.message}` };
    }

    await catatLogAdmin(adminEmail, "Tambah akun admin", email);

    revalidatePath("/admin/akun");
    return { success: true, message: `Akun admin "${email}" berhasil dibuat.` };
  } catch (err) {
    return { error: `Terjadi kesalahan server: ${err.message}` };
  }
}

/**
 * US-44: Kelola Akun Admin (Hapus Admin Lain)
 */
export async function hapusAkunAdmin(userId, targetEmail) {
  let adminEmail = null;
  let currentUserId = null;
  try {
    const verified = await verifikasiAdmin();
    adminEmail = verified.user?.email;
    currentUserId = verified.user?.id;
  } catch (err) {
    return { error: err.message || "Akses ditolak: Anda harus login terlebih dahulu." };
  }

  // Admin tidak boleh menghapus akunnya sendiri
  if (userId === currentUserId) {
    return { error: "Anda tidak dapat menghapus akun Anda sendiri demi keamanan." };
  }

  try {
    const supabaseAdmin = createServerClient();
    const { error } = await supabaseAdmin.auth.admin.deleteUser(userId);

    if (error) {
      return { error: `Gagal menghapus admin: ${error.message}` };
    }

    await catatLogAdmin(adminEmail, "Hapus akun admin", targetEmail || userId);

    revalidatePath("/admin/akun");
    return { success: true };
  } catch (err) {
    return { error: `Terjadi kesalahan server: ${err.message}` };
  }
}

/**
 * US-44: Kelola Akun Admin (Nonaktifkan / Aktifkan Admin Lain)
 */
export async function toggleStatusAdmin(userId, targetEmail, ban) {
  let adminEmail = null;
  let currentUserId = null;
  try {
    const verified = await verifikasiAdmin();
    adminEmail = verified.user?.email;
    currentUserId = verified.user?.id;
  } catch (err) {
    return { error: err.message || "Akses ditolak: Anda harus login terlebih dahulu." };
  }

  // Admin tidak boleh menonaktifkan akunnya sendiri
  if (userId === currentUserId) {
    return { error: "Anda tidak dapat menonaktifkan akun Anda sendiri." };
  }

  try {
    const supabaseAdmin = createServerClient();
    const { error } = await supabaseAdmin.auth.admin.updateUserById(userId, {
      ban_duration: ban ? "876000h" : "none",
    });

    if (error) {
      return { error: `Gagal mengubah status admin: ${error.message}` };
    }

    await catatLogAdmin(adminEmail, ban ? "Nonaktifkan admin" : "Aktifkan admin", targetEmail || userId);

    revalidatePath("/admin/akun");
    return { success: true };
  } catch (err) {
    return { error: `Terjadi kesalahan server: ${err.message}` };
  }
}

/**
 * US-46: Impor Produk dari CSV (Bulk Insert dengan Validasi per Baris)
 */
export async function imporProdukCsv(prevState, formData) {
  const data = formData instanceof FormData ? formData : prevState;
  let supabase;
  let adminEmail = null;
  try {
    const verified = await verifikasiAdmin();
    supabase = verified.supabase;
    adminEmail = verified.user?.email;
  } catch (err) {
    return { error: err.message || "Akses ditolak: Anda harus login terlebih dahulu." };
  }

  const file = data.get("file_csv");
  if (!file || typeof file !== "object" || file.size === 0) {
    return { error: "Pilih file CSV terlebih dahulu." };
  }

  // Batasan ukuran file CSV (maks 2 MB)
  if (file.size > 2 * 1024 * 1024) {
    return { error: "Ukuran file CSV maksimal adalah 2 MB." };
  }

  try {
    const rawText = await file.text();
    const cleanText = rawText.replace(/^\uFEFF/, "").trim();
    if (!cleanText) {
      return { error: "File CSV kosong." };
    }

    // Pisahkan baris
    const lines = cleanText.split(/\r?\n/).filter((l) => l.trim().length > 0);
    if (lines.length < 2) {
      return { error: "File CSV harus memiliki baris header dan minimal satu baris data." };
    }

    // Helper parser baris CSV berstandar RFC
    const parseLine = (line) => {
      const parts = [];
      let cur = "";
      let inQuote = false;
      for (let i = 0; i < line.length; i++) {
        const c = line[i];
        if (c === '"') {
          if (inQuote && line[i + 1] === '"') {
            cur += '"';
            i++;
          } else {
            inQuote = !inQuote;
          }
        } else if (c === "," && !inQuote) {
          parts.push(cur.trim());
          cur = "";
        } else {
          cur += c;
        }
      }
      parts.push(cur.trim());
      return parts;
    };

    const headerParts = parseLine(lines[0]).map((h) => h.toLowerCase().replace(/[^a-z0-9_]/g, ""));
    const namaIdx = headerParts.findIndex((h) => h === "nama" || h.includes("nama") || h === "produk");
    const kategoriIdx = headerParts.findIndex((h) => h === "kategori" || h.includes("kategori"));
    const hargaIdx = headerParts.findIndex((h) => h === "harga" || h === "harganormal");
    const deskripsiIdx = headerParts.findIndex((h) => h === "deskripsi" || h.includes("deskripsi"));
    const fotoIdx = headerParts.findIndex((h) => h === "urlfoto" || h === "foto" || h === "foto_url");
    const stokIdx = headerParts.findIndex((h) => h === "stok");

    if (namaIdx === -1 || kategoriIdx === -1 || hargaIdx === -1) {
      return {
        error: "Header CSV harus memuat kolom wajib: 'nama', 'kategori', dan 'harga'.",
      };
    }

    const daftarError = [];
    const barisValid = [];

    for (let i = 1; i < lines.length; i++) {
      const noBaris = i + 1;
      const cols = parseLine(lines[i]);
      if (cols.length === 0 || (cols.length === 1 && !cols[0])) continue;

      const nama = cols[namaIdx]?.trim();
      const kategori = cols[kategoriIdx]?.trim();
      const hargaStr = cols[hargaIdx]?.trim().replace(/[^0-9]/g, "");

      if (!nama) {
        daftarError.push({ baris: noBaris, pesan: "Nama produk tidak boleh kosong." });
        continue;
      }

      if (!kategori) {
        daftarError.push({ baris: noBaris, pesan: "Kategori tidak boleh kosong." });
        continue;
      }

      const harga = parseInt(hargaStr, 10);
      if (isNaN(harga) || harga <= 0) {
        daftarError.push({ baris: noBaris, pesan: "Harga harus berupa angka positif." });
        continue;
      }

      const deskripsi = deskripsiIdx !== -1 ? cols[deskripsiIdx]?.trim() || null : null;
      const foto_url = fotoIdx !== -1 ? cols[fotoIdx]?.trim() || null : null;
      const stokRaw = stokIdx !== -1 ? cols[stokIdx]?.trim().replace(/[^0-9]/g, "") : null;
      const stok = stokRaw ? parseInt(stokRaw, 10) : 10;

      barisValid.push({
        nama,
        kategori,
        harga,
        deskripsi,
        foto_url,
        stok: !isNaN(stok) ? stok : 10,
        aktif: true,
      });
    }

    if (barisValid.length > 0) {
      const { error: insertError } = await supabase.from("produk").insert(barisValid);
      if (insertError) {
        return { error: `Gagal menyimpan produk ke database: ${insertError.message}` };
      }
      await catatLogAdmin(adminEmail, "Impor produk CSV", `${barisValid.length} produk`);
    }

    revalidatePath("/admin");
    revalidatePath("/");

    return {
      success: true,
      jumlahBerhasil: barisValid.length,
      jumlahGagal: daftarError.length,
      daftarError,
    };
  } catch (err) {
    return { error: `Gagal memproses file CSV: ${err.message}` };
  }
}

/**
 * US-47: Geser Urutan Produk (Naik / Turun)
 */
export async function geserUrutanProduk(id, arah) {
  let supabase;
  try {
    const verified = await verifikasiAdmin();
    supabase = verified.supabase;
  } catch (err) {
    return { error: err.message || "Akses ditolak: Anda harus login terlebih dahulu." };
  }

  try {
    const { data: produkA, error: errA } = await supabase
      .from("produk")
      .select("id, urutan")
      .eq("id", id)
      .single();

    if (errA || !produkA) return { error: "Produk tidak ditemukan." };

    const urutanA = produkA.urutan !== undefined && produkA.urutan !== null ? produkA.urutan : produkA.id;

    if (arah === "naik") {
      // Cari produk terdekat dengan urutan lebih besar untuk ditukar
      const { data: produkB } = await supabase
        .from("produk")
        .select("id, urutan")
        .gt("urutan", urutanA)
        .order("urutan", { ascending: true })
        .limit(1)
        .maybeSingle();

      if (produkB) {
        await supabase.from("produk").update({ urutan: produkB.urutan }).eq("id", produkA.id);
        await supabase.from("produk").update({ urutan: urutanA }).eq("id", produkB.id);
      } else {
        await supabase.from("produk").update({ urutan: urutanA + 1 }).eq("id", produkA.id);
      }
    } else {
      // Cari produk terdekat dengan urutan lebih kecil untuk ditukar
      const { data: produkB } = await supabase
        .from("produk")
        .select("id, urutan")
        .lt("urutan", urutanA)
        .order("urutan", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (produkB) {
        await supabase.from("produk").update({ urutan: produkB.urutan }).eq("id", produkA.id);
        await supabase.from("produk").update({ urutan: urutanA }).eq("id", produkB.id);
      } else {
        await supabase.from("produk").update({ urutan: Math.max(0, urutanA - 1) }).eq("id", produkA.id);
      }
    }

    revalidatePath("/admin");
    revalidatePath("/");
    return { success: true };
  } catch (err) {
    return { error: `Gagal mengubah urutan: ${err.message}` };
  }
}

/**
 * US-48: Tambah Varian Produk
 */
export async function tambahVarianProduk(produkId, nama, harga) {
  let supabase;
  let adminEmail = null;
  try {
    const verified = await verifikasiAdmin();
    supabase = verified.supabase;
    adminEmail = verified.user?.email;
  } catch (err) {
    return { error: err.message || "Akses ditolak: Anda harus login terlebih dahulu." };
  }

  if (!produkId || !nama || typeof nama !== "string" || !nama.trim()) {
    return { error: "Nama varian wajib diisi." };
  }

  const hargaInt = parseInt(harga, 10);
  if (isNaN(hargaInt) || hargaInt < 0) {
    return { error: "Harga varian harus berupa angka non-negatif." };
  }

  const { error } = await supabase.from("varian_produk").insert([
    {
      produk_id: produkId,
      nama: nama.trim(),
      harga: hargaInt,
    },
  ]);

  if (error) return { error: `Gagal menambah varian: ${error.message}` };

  await catatLogAdmin(adminEmail, "Tambah varian produk", `${nama.trim()} (Rp ${hargaInt})`);

  revalidatePath("/admin");
  revalidatePath(`/admin/produk/${produkId}/ubah`);
  revalidatePath(`/produk/${produkId}`);
  return { success: true };
}

/**
 * US-48: Hapus Varian Produk
 */
export async function hapusVarianProduk(id, produkId) {
  let supabase;
  let adminEmail = null;
  try {
    const verified = await verifikasiAdmin();
    supabase = verified.supabase;
    adminEmail = verified.user?.email;
  } catch (err) {
    return { error: err.message || "Akses ditolak: Anda harus login terlebih dahulu." };
  }

  const { error } = await supabase.from("varian_produk").delete().eq("id", id);
  if (error) return { error: `Gagal menghapus varian: ${error.message}` };

  await catatLogAdmin(adminEmail, "Hapus varian produk", `ID ${id}`);

  revalidatePath("/admin");
  revalidatePath(`/admin/produk/${produkId}/ubah`);
  revalidatePath(`/produk/${produkId}`);
  return { success: true };
}

/**
 * US-50: Asisten AI Tanya Jawab Produk (Server-side LLM dengan batasan ketat & rate limit)
 */
export async function tanyaAiProduk(produkId, pertanyaan) {
  if (!pertanyaan || typeof pertanyaan !== "string" || !pertanyaan.trim()) {
    return { error: "Pertanyaan tidak boleh kosong." };
  }

  const cleanTanya = pertanyaan.trim();
  if (cleanTanya.length > 200) {
    return { error: "Pertanyaan maksimal 200 karakter." };
  }

  // Rate Limiting dasar per pengunjung dengan cookie
  try {
    const cookieStore = await cookies();
    const lastTime = cookieStore.get("ai_tanya_waktu")?.value;
    const now = Date.now();
    if (lastTime && now - parseInt(lastTime, 10) < 5000) {
      return { error: "Mohon tunggu beberapa detik sebelum mengajukan pertanyaan berikutnya." };
    }
    cookieStore.set("ai_tanya_waktu", String(now), { maxAge: 60, httpOnly: true, sameSite: "lax" });
  } catch (e) {}

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return {
      error: "Asisten AI saat ini sedang tidak aktif. Silakan hubungi toko langsung via WhatsApp.",
    };
  }

  // Ambil data produk dan variannya dari database publik
  let produk = null;
  let daftarVarian = [];
  try {
    const supabase = createServerClient();
    const { data: p } = await supabase.from("produk").select("*").eq("id", produkId).maybeSingle();
    produk = p;

    const { data: v } = await supabase.from("varian_produk").select("nama, harga").eq("produk_id", produkId);
    daftarVarian = v || [];
  } catch (e) {}

  if (!produk) {
    return { error: "Produk tidak ditemukan." };
  }

  const infoVarian =
    daftarVarian.length > 0
      ? daftarVarian.map((v) => `${v.nama} (Rp ${v.harga})`).join(", ")
      : "Tidak ada pilihan varian khusus.";

  const prompt = `Anda adalah asisten AI toko yang ramah, sopan, dan jujur. Tugas Anda adalah menjawab pertanyaan calon pembeli tentang produk berikut.

DATA RESMI PRODUK:
- Nama: ${produk.nama}
- Kategori: ${produk.kategori || "Umum"}
- Harga Normal: Rp ${produk.harga}
${produk.harga_diskon ? `- Harga Diskon: Rp ${produk.harga_diskon}` : ""}
- Ketersediaan Stok: ${produk.stok !== undefined ? `${produk.stok} pcs` : "Tersedia"}
- Varian: ${infoVarian}
- Deskripsi: ${produk.deskripsi || "Tidak ada deskripsi tambahan."}

PERTANYAAN PEMBELI:
"${cleanTanya}"

ATURAN MENJAWAB (SANGAT KETAT):
1. Jawab HANYA dan HANYA berdasarkan DATA RESMI PRODUK di atas.
2. JANGAN PERNAH mengarang informasi atau membuat klaim khasiat/bahan yang tidak tertulis.
3. BILA JAWABAN TIDAK ADA pada data resmi di atas (misalnya rincian komposisi, sertifikat khusus yang tidak tertulis, promo tambahan, atau pengiriman), katakan dengan ramah bahwa Anda tidak memiliki informasi tersebut dan sarankan calon pembeli menghubungi pemilik toko langsung melalui tombol WhatsApp.
4. Jawab singkat, padat, dan jelas dalam bahasa Indonesia (maksimal 2 sampai 3 kalimat).`;

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 12000);

    let response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }] }),
        signal: controller.signal,
      }
    );

    if (!response.ok) {
      response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }] }),
          signal: controller.signal,
        }
      );
    }

    clearTimeout(timeout);

    if (!response.ok) {
      return {
        error: "Asisten AI sedang sibuk. Silakan coba sesaat lagi atau tanyakan langsung via WhatsApp.",
      };
    }

    const resJson = await response.json();
    const jawaban = resJson.candidates?.[0]?.content?.parts?.[0]?.text?.trim();

    return {
      success: true,
      jawaban:
        jawaban ||
        "Maaf, saya belum dapat menemukan jawaban untuk pertanyaan tersebut. Silakan hubungi pemilik toko via WhatsApp.",
    };
  } catch (err) {
    if (err.name === "AbortError") {
      return {
        error: "Permintaan waktu habis (timeout). Silakan ulangi atau tanyakan via WhatsApp.",
      };
    }
    return {
      error: "Terjadi gangguan saat memproses jawaban AI. Silakan tanyakan via WhatsApp.",
    };
  }
}
