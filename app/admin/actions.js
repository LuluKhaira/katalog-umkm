"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createSessionClient } from "@/lib/supabase/session";

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
 * Server Action untuk memproses login admin menggunakan Supabase Auth.
 * Mendukung pemanggilan via useActionState(login, null) maupun langsung lewat <form action={login}>.
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
 * Memeriksa autentikasi di server, memvalidasi panjang minimal 8 karakter dan kesamaan konfirmasi.
 */
export async function gantiPassword(prevState, formData) {
  const data = formData instanceof FormData ? formData : prevState;
  const isActionState = formData instanceof FormData;

  if (!data || typeof data.get !== "function") {
    return { error: "Data formulir tidak valid." };
  }

  // 1. Periksa sesi admin di server
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

  // 2. Validasi panjang password baru minimal 8 karakter
  if (!passwordBaru || String(passwordBaru).length < 8) {
    return { error: "Password baru minimal 8 karakter." };
  }

  // 3. Validasi konfirmasi password harus sama
  if (passwordBaru !== konfirmasiPassword) {
    return { error: "Konfirmasi password tidak sama dengan password baru." };
  }

  // 4. Update password melalui Supabase Auth
  const { error } = await supabase.auth.updateUser({
    password: String(passwordBaru),
  });

  if (error) {
    return { error: error.message || "Gagal mengganti password." };
  }

  return { success: true, message: "Password berhasil diganti." };
}

/**
 * Server Action untuk mengakhiri sesi admin (logout) lalu kembali ke halaman login.
 */
export async function keluar() {
  const supabase = await createSessionClient();
  await supabase.auth.signOut();
  redirect("/admin/login");
}

/**
 * US-14: Server Action untuk membuat deskripsi produk menggunakan Google Gemini API.
 * Dipanggil secara aman di sisi server.
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
      // Fallback ke gemini-1.5-flash jika gemini-2.5-flash belum tersedia
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
 * US-08, US-18, US-19, US-20: Server Action untuk menambah produk baru ke database.
 * Memeriksa sesi login di server dan menolak jika belum login.
 */
export async function tambahProduk(prevState, formData) {
  const data = formData instanceof FormData ? formData : prevState;

  if (!data || typeof data.get !== "function") {
    return { error: "Data formulir tidak valid." };
  }

  // 1. Periksa autentikasi admin di server
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
  const foto_url = data.get("foto_url")?.toString().trim() || null;
  const deskripsi = data.get("deskripsi")?.toString().trim() || null;
  const stokRaw = data.get("stok")?.toString().trim();
  const hargaDiskonRaw = data.get("harga_diskon")?.toString().trim();
  const badge = data.get("badge")?.toString().trim() || null;
  const fotoTambahanRaw = data.get("foto_tambahan")?.toString().trim() || "";

  if (!nama) {
    return { error: "Nama produk wajib diisi." };
  }

  const harga = parseInt(hargaRaw, 10);
  if (isNaN(harga) || harga < 0) {
    return { error: "Harga harus berupa angka yang tidak negatif." };
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
    // Fallback jika migrasi kolom baru belum dijalankan di Supabase
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
 * US-09, US-18, US-19, US-20: Server Action untuk mengubah produk yang sudah ada di database.
 * Memeriksa sesi login di server dan menolak jika belum login.
 */
export async function ubahProduk(prevState, formData) {
  const data = formData instanceof FormData ? formData : prevState;

  if (!data || typeof data.get !== "function") {
    return { error: "Data formulir tidak valid." };
  }

  // 1. Periksa autentikasi admin di server
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
  const foto_url = data.get("foto_url")?.toString().trim() || null;
  const deskripsi = data.get("deskripsi")?.toString().trim() || null;
  const stokRaw = data.get("stok")?.toString().trim();
  const hargaDiskonRaw = data.get("harga_diskon")?.toString().trim();
  const badge = data.get("badge")?.toString().trim() || null;
  const fotoTambahanRaw = data.get("foto_tambahan")?.toString().trim() || "";

  if (!nama) {
    return { error: "Nama produk wajib diisi." };
  }

  const harga = parseInt(hargaRaw, 10);
  if (isNaN(harga) || harga < 0) {
    return { error: "Harga harus berupa angka yang tidak negatif." };
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
 * US-10: Server Action untuk menghapus produk dari database.
 * Memeriksa sesi login di server dan menolak jika belum login.
 */
export async function hapusProduk(id) {
  if (!id) {
    return { error: "ID produk tidak valid." };
  }

  // 1. Periksa autentikasi admin di server
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
