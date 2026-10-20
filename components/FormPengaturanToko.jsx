"use client";

import { useActionState } from "react";
import Input from "@/components/Input";
import Tombol from "@/components/Tombol";
import { simpanPengaturanToko } from "@/app/admin/actions";

// US-43: Form Pengaturan Identitas Toko
export default function FormPengaturanToko({ pengaturanAwal }) {
  const [state, formAction, isPending] = useActionState(simpanPengaturanToko, null);

  return (
    <form action={formAction} className="flex max-w-xl flex-col gap-4">
      {state?.success && (
        <div className="rounded-lg border border-emerald-500/20 bg-emerald-500/10 p-3 text-sm text-emerald-700 dark:text-emerald-400">
          {state.message}
        </div>
      )}

      {state?.error && (
        <div className="rounded-lg border border-bahaya/20 bg-bahaya/10 p-3 text-sm text-bahaya">
          {state.error}
        </div>
      )}

      <Input
        label="Nama Toko"
        name="nama"
        defaultValue={pengaturanAwal?.nama || ""}
        placeholder="Contoh: Toko Skincare Lulu"
        required
      />

      <div className="flex flex-col gap-1">
        <Input
          label="Nomor WhatsApp Toko (Angka & Kode Negara, tanpa + atau spasi)"
          name="whatsapp"
          type="text"
          defaultValue={pengaturanAwal?.whatsapp || pengaturanAwal?.nomorWhatsApp || ""}
          placeholder="Contoh: 6281261976531"
          required
        />
        <p className="text-xs text-teks-lembut">
          Format wajib angka dengan kode negara Indonesia (diawali 62). Jangan pakai tanda plus (+), spasi, atau strip.
        </p>
      </div>

      <Input
        label="Jam Operasional"
        name="jam_buka"
        defaultValue={pengaturanAwal?.jamBuka || ""}
        placeholder="Contoh: Setiap hari, 08.00–20.00 WIB"
      />

      <Input
        label="Alamat Toko"
        name="alamat"
        defaultValue={pengaturanAwal?.alamat || ""}
        placeholder="Contoh: Jl. Sudirman No. 12, Batam"
      />

      <div className="pt-2">
        <Tombol type="submit" disabled={isPending}>
          {isPending ? "Menyimpan..." : "Simpan Pengaturan"}
        </Tombol>
      </div>
    </form>
  );
}

