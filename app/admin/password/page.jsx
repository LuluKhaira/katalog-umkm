"use client";

import { useActionState } from "react";
import NavAdmin from "@/components/NavAdmin";
import Input from "@/components/Input";
import Tombol from "@/components/Tombol";
import { gantiPassword } from "@/app/admin/actions";

// US-05: admin yang sudah login bisa mengganti password-nya, diproses di server.
export default function HalamanGantiPassword() {
  const [state, formAction] = useActionState(gantiPassword, null);

  return (
    <div className="flex flex-col gap-6 py-8">
      <NavAdmin />
      <div>
        <h1 className="text-2xl font-extrabold">Ganti password</h1>
        <p className="mt-1 text-sm text-teks-lembut">
          Ganti password bawaan segera setelah pertama kali masuk. Minimal 8 karakter.
        </p>
      </div>

      <form action={formAction} className="flex max-w-sm flex-col gap-4">
        {state?.error && (
          <div className="rounded-lg border border-bahaya/20 bg-bahaya/10 p-3 text-sm text-bahaya">
            {state.error}
          </div>
        )}
        {state?.success && state?.message && (
          <div className="rounded-lg border border-utama/20 bg-utama/10 p-3 text-sm text-utama">
            {state.message}
          </div>
        )}
        <Input
          label="Password baru"
          name="password_baru"
          type="password"
          autoComplete="new-password"
          minLength={8}
          required
        />
        <Input
          label="Ulangi password baru"
          name="konfirmasi_password"
          type="password"
          autoComplete="new-password"
          minLength={8}
          required
        />
        <Tombol type="submit" className="self-start">
          Simpan password
        </Tombol>
      </form>
    </div>
  );
}
