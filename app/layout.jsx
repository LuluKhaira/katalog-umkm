import "./globals.css";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { toko } from "@/lib/toko";
import { getPengaturanToko } from "@/lib/pengaturan";
import { KeranjangProvider } from "@/lib/keranjang-context";
import { FavoritProvider } from "@/lib/favorit-context";

export async function generateMetadata() {
  const dataToko = await getPengaturanToko();
  return {
    title: {
      default: dataToko.nama,
      template: `%s | ${dataToko.nama}`,
    },
    description: dataToko.tagline,
    manifest: "/manifest.webmanifest",
  };
}

export const viewport = {
  themeColor: "#1f6b4f",
};

export default async function RootLayout({ children }) {
  const dataToko = await getPengaturanToko();

  return (
    <html lang="id" suppressHydrationWarning>
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        <link
          rel="stylesheet"
          href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;600;700;800&display=swap"
        />
        {/* US-25: Inisialisasi tema sebelum render untuk mencegah flicker */}
        <script
          dangerouslySetInnerHTML={{
            __html: `
              (function() {
                try {
                  var t = localStorage.getItem('katalog_theme');
                  if (t === 'dark' || (!t && window.matchMedia('(prefers-color-scheme: dark)').matches)) {
                    document.documentElement.classList.add('dark');
                  } else {
                    document.documentElement.classList.remove('dark');
                  }
                } catch (e) {}
              })();
            `,
          }}
        />
      </head>
      <body className="flex min-h-screen flex-col font-sans antialiased bg-latar text-teks">
        <FavoritProvider>
          <KeranjangProvider>
            <Header namaToko={dataToko.nama} />
            <main className="mx-auto w-full max-w-5xl flex-1 px-4">{children}</main>
            <Footer dataToko={dataToko} />
          </KeranjangProvider>
        </FavoritProvider>

        {/* US-13: Registrasi Service Worker PWA */}
        <script
          dangerouslySetInnerHTML={{
            __html: `
              if (typeof window !== 'undefined' && 'serviceWorker' in navigator) {
                window.addEventListener('load', function() {
                  navigator.serviceWorker.register('/sw.js').catch(function() {});
                });
              }
            `,
          }}
        />
      </body>
    </html>
  );
}
