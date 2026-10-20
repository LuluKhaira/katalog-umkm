import { createServerClient } from "@supabase/ssr";
import { NextResponse } from "next/server";

// US-06: Proteksi semua rute /admin kecuali /admin/login menggunakan Supabase Auth
export async function proxy(request) {
  let response = NextResponse.next({
    request: {
      headers: request.headers,
    },
  });

  const url = (process.env.SUPABASE_URL || "").replace(/\/rest\/v1\/?$/, "").replace(/\/+$/, "");
  const publishableKey = process.env.SUPABASE_PUBLISHABLE_KEY;

  if (!url || !publishableKey) {
    return response;
  }

  const supabase = createServerClient(url, publishableKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
        response = NextResponse.next({
          request,
        });
        cookiesToSet.forEach(({ name, value, options }) =>
          response.cookies.set(name, value, options)
        );
      },
    },
  });

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const pathname = request.nextUrl.pathname;
  const normalizedPath = pathname.replace(/\/+$/, "") || "/";

  // Semua rute di bawah /admin (kecuali /admin/login) wajib login
  if (
    (normalizedPath === "/admin" || normalizedPath.startsWith("/admin/")) &&
    normalizedPath !== "/admin/login"
  ) {
    if (!user) {
      const loginUrl = new URL("/admin/login", request.url);
      return NextResponse.redirect(loginUrl);
    }
  }

  // Jika sudah login dan mencoba mengakses /admin/login, alihkan ke /admin
  if (normalizedPath === "/admin/login" && user) {
    const adminUrl = new URL("/admin", request.url);
    return NextResponse.redirect(adminUrl);
  }

  return response;
}

export const config = {
  matcher: ["/admin", "/admin/:path*"],
};

export { proxy as middleware };
export default proxy;

