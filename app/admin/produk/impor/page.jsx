import NavAdmin from "@/components/NavAdmin";
import FormImporCsv from "@/components/FormImporCsv";

export const dynamic = "force-dynamic";

// US-46: Halaman Impor Produk dari CSV
export default async function HalamanImporProduk() {
  return (
    <div className="flex flex-col gap-8 py-8">
      <NavAdmin />

      <section className="flex flex-col gap-4">
        <div>
          <h1 className="text-2xl font-extrabold">Impor Produk dari CSV</h1>
          <p className="text-sm text-teks-lembut">
            Tambahkan banyak produk sekaligus ke database dengan mengunggah berkas CSV.
          </p>
        </div>

        <FormImporCsv />
      </section>
    </div>
  );
}

