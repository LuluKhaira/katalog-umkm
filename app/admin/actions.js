"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
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

  revalidatePath("/admin");
  revalidatePath("/");
  revalidatePath(`/produk/${id}`);
  redirect("/admin");
}

/**
 * US-10: Hapus Produk
 */
export async function hapusProduk(id) {
  if (!id) return { error: "ID produk tidak valid." };

  let supabase;
  try {
    const verified = await verifikasiAdmin();
    supabase = verified.supabase;
  } catch (err) {
    return { error: err.message || "Akses ditolak: Anda harus login terlebih dahulu." };
  }

  const { error } = await supabase.from("produk").delete().eq("id", id);
  if (error) return { error: `Gagal menghapus produk: ${error.message}` };

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
    const { data, error } = await supabase
      .from("produk")
      .select("*")
      .in("id", ids)
      .neq("aktif", false);

    if (error || !data) return [];

    // Urutkan sesuai urutan kunjungan di localStorage
    const idMap = new Map(data.map((p) => [String(p.id), p]));
    return ids.map((id) => idMap.get(String(id))).filter(Boolean);
  } catch (e) {
    return [];
  }
}
