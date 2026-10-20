import { createServerClient } from "@/lib/supabase/server";

// US-27 & US-32: Dynamic sitemap.xml dari database (hanya produk aktif)
export default async function sitemap() {
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://katalog-umkm.vercel.app";

  let produkList = [];
  try {
    const supabase = createServerClient();
    const { data } = await supabase
      .from("produk")
      .select("id, created_at")
      .neq("aktif", false);
    produkList = data || [];
  } catch (e) {
    console.error("Gagal membuat sitemap:", e);
  }

  const routesStatis = ["", "/tentang", "/favorit", "/keranjang", "/bandingkan"].map((route) => ({
    url: `${siteUrl}${route}`,
    lastModified: new Date(),
    changeFrequency: "daily",
    priority: route === "" ? 1 : 0.8,
  }));

  const routesProduk = produkList.map((item) => ({
    url: `${siteUrl}/produk/${item.id}`,
    lastModified: item.created_at ? new Date(item.created_at) : new Date(),
    changeFrequency: "weekly",
    priority: 0.7,
  }));

  return [...routesStatis, ...routesProduk];
}
