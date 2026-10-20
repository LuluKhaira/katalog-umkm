"use client";

import { useActionState, useTransition, useState } from "react";
import Input from "@/components/Input";
import Tombol from "@/components/Tombol";
import { tambahAkunAdmin, hapusAkunAdmin, toggleStatusAdmin } from "@/app/admin/actions";

// US-44: Manajemen Akun Admin
export default function ManajemenAkunAdmin({ daftarAdmin = [], currentAdminId }) {
  const [state, formAction, isPending] = useActionState(tambahAkunAdmin, null);
  const [isTransitioning, startTransition] = useTransition();

  const [emailBaru, setEmailBaru] = useState("");
  const [passwordBaru, setPasswordBaru] = useState("");

  const handleToggleStatus = (userId, email, isBanned) => {
    const aksi = isBanned ? "mengaktifkan" : "menonaktifkan";
    if (window.confirm(`Yakin ingin ${aksi} akun admin "${email}"?`)) {
      startTransition(async () => {
        const res = await toggleStatusAdmin(userId, email, !isBanned);
        if (res?.error) alert(res.error);
      });
    }
  };

  const handleHapus = (userId, email) => {
    if (window.confirm(`PERINGATAN: Yakin ingin MENGHAPUS PERMANEN akun admin "${email}"?`)) {
      startTransition(async () => {
        const res = await hapusAkunAdmin(userId, email);
        if (res?.error) alert(res.error);
      });
    }
  };

  return (
    <div className="flex flex-col gap-10">
      {/* Form Tambah Admin Baru */}
      <section className="rounded-2xl border border-garis bg-latar p-6 shadow-xs max-w-xl">
        <h2 className="text-lg font-bold mb-4">Tambah Admin Baru</h2>

        {state?.success && (
          <div className="mb-4 rounded-lg border border-emerald-500/20 bg-emerald-500/10 p-3 text-sm text-emerald-700 dark:text-emerald-400">
            {state.message}
          </div>
        )}

        {state?.error && (
          <div className="mb-4 rounded-lg border border-bahaya/20 bg-bahaya/10 p-3 text-sm text-bahaya">
            {state.error}
          </div>
        )}

        <form action={formAction} className="flex flex-col gap-4">
          <Input
            label="Email Admin"
            name="email"
            type="email"
            value={emailBaru}
            onChange={(e) => setEmailBaru(e.target.value)}
            placeholder="admin.baru@toko.com"
            required
          />

          <Input
            label="Password Sementara (Minimal 8 karakter)"
            name="password"
            type="password"
            value={passwordBaru}
            onChange={(e) => setPasswordBaru(e.target.value)}
            placeholder="••••••••"
            required
          />

          <div className="pt-2">
            <Tombol type="submit" disabled={isPending}>
              {isPending ? "Memproses..." : "+ Tambah Admin"}
            </Tombol>
          </div>
        </form>
      </section>

      {/* Tabel Daftar Akun Admin */}
      <section className="flex flex-col gap-4">
        <h2 className="text-xl font-bold">Daftar Admin Terdaftar ({daftarAdmin.length})</h2>

        <div className="overflow-x-auto rounded-2xl border border-garis bg-latar">
          <table className="w-full min-w-[640px] text-left text-sm">
            <thead className="bg-permukaan text-teks-lembut">
              <tr>
                <th className="px-4 py-3 font-semibold">Email</th>
                <th className="px-4 py-3 font-semibold">Tanggal Terdaftar</th>
                <th className="px-4 py-3 font-semibold">Status Akun</th>
                <th className="px-4 py-3 font-semibold text-right">Aksi</th>
              </tr>
            </thead>
            <tbody>
              {daftarAdmin.map((adm) => {
                const isCurrent = adm.id === currentAdminId;
                const isBanned = adm.banned_until && new Date(adm.banned_until) > new Date();

                return (
                  <tr key={adm.id} className="border-t border-garis hover:bg-permukaan/40">
                    <td className="px-4 py-3 font-medium text-teks">
                      <div className="flex items-center gap-2">
                        <span>{adm.email}</span>
                        {isCurrent && (
                          <span className="rounded-md bg-utama/10 px-2 py-0.5 text-xs font-bold text-utama">
                            Anda
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-teks-lembut text-xs">
                      {new Date(adm.created_at).toLocaleDateString("id-ID", {
                        day: "numeric",
                        month: "long",
                        year: "numeric",
                      })}
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ${
                          isBanned
                            ? "bg-bahaya/10 text-bahaya"
                            : "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                        }`}
                      >
                        {isBanned ? "Dinonaktifkan" : "Aktif"}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      {isCurrent ? (
                        <span className="text-xs text-teks-lembut italic">Tidak dapat diubah</span>
                      ) : (
                        <div className="flex justify-end items-center gap-2">
                          <button
                            type="button"
                            onClick={() => handleToggleStatus(adm.id, adm.email, isBanned)}
                            disabled={isTransitioning}
                            className={`rounded-lg border px-2.5 py-1 text-xs font-semibold transition-colors ${
                              isBanned
                                ? "border-emerald-600/30 text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-950/20"
                                : "border-garis text-teks-lembut hover:border-bahaya hover:text-bahaya"
                            }`}
                          >
                            {isBanned ? "Aktifkan" : "Nonaktifkan"}
                          </button>
                          <Tombol
                            type="button"
                            varian="bahaya"
                            onClick={() => handleHapus(adm.id, adm.email)}
                            disabled={isTransitioning}
                          >
                            Hapus
                          </Tombol>
                        </div>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}

