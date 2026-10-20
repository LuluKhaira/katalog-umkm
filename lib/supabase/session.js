import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

function getSupabaseUrl() {
  const url = process.env.SUPABASE_URL;
  if (!url) {
    throw new Error("SUPABASE_URL belum diatur di environment variable.");
  }
  return url.replace(/\/rest\/v1\/?$/, "").replace(/\/+$/, "");
}

function getSupabasePublishableKey() {
  const key = process.env.SUPABASE_PUBLISHABLE_KEY;
  if (!key) {
    throw new Error("SUPABASE_PUBLISHABLE_KEY belum diatur di environment variable.");
  }
  return key;
}

/**
 * Membuat client Supabase dengan sesi admin berbasis cookie (@supabase/ssr).
 * Menggunakan SUPABASE_PUBLISHABLE_KEY sehingga aturan RLS tetap berlaku.
 * Digunakan untuk login, logout, ganti password, dan pengelolaan produk admin.
 */
export async function createSessionClient() {
  const cookieStore = await cookies();
  const url = getSupabaseUrl();
  const publishableKey = getSupabasePublishableKey();

  return createServerClient(url, publishableKey, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          cookiesToSet.forEach(({ name, value, options }) => {
            cookieStore.set(name, value, options);
          });
        } catch {
          // Dipanggil dari Server Component; abaikan jika ditangani middleware/proxy
        }
      },
    },
  });
}

