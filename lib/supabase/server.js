import { createClient } from "@supabase/supabase-js";

function getSupabaseUrl() {
  const url = process.env.SUPABASE_URL;
  if (!url) {
    throw new Error("SUPABASE_URL belum diatur di environment variable.");
  }
  return url.replace(/\/rest\/v1\/?$/, "").replace(/\/+$/, "");
}

function getSupabaseSecretKey() {
  const key = process.env.SUPABASE_SECRET_KEY;
  if (!key) {
    throw new Error("SUPABASE_SECRET_KEY belum diatur di environment variable.");
  }
  return key;
}

/**
 * Membuat client Supabase di sisi server menggunakan SUPABASE_SECRET_KEY.
 * Kunci rahasia melewati RLS, digunakan untuk membaca data publik (katalog & detail produk).
 */
export function createServerClient() {
  const url = getSupabaseUrl();
  const secretKey = getSupabaseSecretKey();

  return createClient(url, secretKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });
}

export { createServerClient as createClient };

