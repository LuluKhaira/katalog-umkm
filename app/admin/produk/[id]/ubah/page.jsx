import { notFound } from "next/navigation";
import NavAdmin from "@/components/NavAdmin";
import FormProduk from "@/components/FormProduk";
import KelolaVarianProduk from "@/components/KelolaVarianProduk";
import { createSessionClient } from "@/lib/supabase/session";
import { ubahProduk } from "@/app/admin/actions";

// US-09: Ubah data produk & US-48: Kelola Varian Harga per Ukuran
export default async function HalamanUbahProduk({ params }) {
  const { id } = await params;
  const supabase = await createSessionClient();

  const { data: produk } = await supabase
    .from("produk")
    .select("*")
    .eq("id", id)
    .maybeSingle();

  if (!produk) {
    notFound();
  }

  // US-48: Ambil varian produk yang ada dari database
  let daftarVarian = [];
  try {
    const { data: vData } = await supabase
      .from("varian_produk")
      .select("*")
      .eq("produk_id", id)
      .order("harga", { ascending: true });
    daftarVarian = vData || [];
  } catch (e) {}

  return (
    <div className="flex flex-col gap-6 py-8">
      <NavAdmin />
      <h1 className="text-2xl font-extrabold">Ubah produk: {produk.nama}</h1>
      <FormProduk produk={produk} action={ubahProduk} labelTombol="Simpan perubahan" />
      <KelolaVarianProduk produkId={id} daftarVarian={daftarVarian} />
    </div>
  );
}
