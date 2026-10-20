// US-27: robots.txt generator
export default function robots() {
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://katalog-umkm.vercel.app";

  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: ["/admin/", "/admin"],
    },
    sitemap: `${siteUrl}/sitemap.xml`,
  };
}

