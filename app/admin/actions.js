"use server";

import { redirect } from "next/navigation";
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
