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
 * US-08: Server Action untuk menambah produk baru ke database.
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

  if (!nama) {
    return { error: "Nama produk wajib diisi." };
  }

  const harga = parseInt(hargaRaw, 10);
  if (isNaN(harga) || harga < 0) {
    return { error: "Harga harus berupa angka yang tidak negatif." };
  }

  const { error } = await supabase.from("produk").insert([
    {
      nama,
      harga,
      kategori,
      foto_url,
      deskripsi,
    },
  ]);

  if (error) {
    return { error: `Gagal menyimpan produk: ${error.message}` };
  }

  revalidatePath("/admin");
  revalidatePath("/");
  redirect("/admin");
}

/**
 * US-09: Server Action untuk mengubah produk yang sudah ada di database.
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

  if (!nama) {
    return { error: "Nama produk wajib diisi." };
  }

  const harga = parseInt(hargaRaw, 10);
  if (isNaN(harga) || harga < 0) {
    return { error: "Harga harus berupa angka yang tidak negatif." };
  }

  const { error } = await supabase
    .from("produk")
    .update({
      nama,
      harga,
      kategori,
      foto_url,
      deskripsi,
    })
    .eq("id", id);

  if (error) {
    return { error: `Gagal mengubah produk: ${error.message}` };
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

/**
 * US-08: Server Action untuk menambah produk baru ke database.
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

  if (!nama) {
    return { error: "Nama produk wajib diisi." };
  }

  const harga = parseInt(hargaRaw, 10);
  if (isNaN(harga) || harga < 0) {
    return { error: "Harga harus berupa angka yang tidak negatif." };
  }

  const { error } = await supabase.from("produk").insert([
    {
      nama,
      harga,
      kategori,
      foto_url,
      deskripsi,
    },
  ]);

  if (error) {
    return { error: `Gagal menyimpan produk: ${error.message}` };
  }

  revalidatePath("/admin");
  revalidatePath("/");
  redirect("/admin");
}

/**
 * US-09: Server Action untuk mengubah produk yang sudah ada di database.
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

  if (!nama) {
    return { error: "Nama produk wajib diisi." };
  }

  const harga = parseInt(hargaRaw, 10);
  if (isNaN(harga) || harga < 0) {
    return { error: "Harga harus berupa angka yang tidak negatif." };
  }

  const { error } = await supabase
    .from("produk")
    .update({
      nama,
      harga,
      kategori,
      foto_url,
      deskripsi,
    })
    .eq("id", id);

  if (error) {
    return { error: `Gagal mengubah produk: ${error.message}` };
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

