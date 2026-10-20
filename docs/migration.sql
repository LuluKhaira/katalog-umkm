-- Skrip Migrasi Tambahan untuk US-18, US-19, dan US-20
-- Cara pakai: Supabase Dashboard > SQL Editor > New query > Tempel skrip ini > Run

-- 1. US-19: Kolom stok di tabel produk (default 10)
alter table public.produk add column if not exists stok integer not null default 10;

-- 2. US-20: Kolom harga_diskon dan badge promo di tabel produk
alter table public.produk add column if not exists harga_diskon integer check (harga_diskon is null or harga_diskon < harga);
alter table public.produk add column if not exists badge text;

-- 3. US-18: Tabel foto_produk untuk galeri banyak foto
create table if not exists public.foto_produk (
  id bigint generated always as identity primary key,
  produk_id bigint not null references public.produk(id) on delete cascade,
  url text not null,
  urutan integer not null default 0,
  created_at timestamptz not null default now()
);

-- RLS untuk tabel foto_produk
alter table public.foto_produk enable row level security;

-- Kebijakan RLS foto_produk
drop policy if exists "admin_baca_foto_produk" on public.foto_produk;
drop policy if exists "admin_tambah_foto_produk" on public.foto_produk;
drop policy if exists "admin_ubah_foto_produk" on public.foto_produk;
drop policy if exists "admin_hapus_foto_produk" on public.foto_produk;

create policy "admin_baca_foto_produk" on public.foto_produk
  for select to authenticated using (true);

create policy "admin_tambah_foto_produk" on public.foto_produk
  for insert to authenticated with check (true);

create policy "admin_ubah_foto_produk" on public.foto_produk
  for update to authenticated using (true) with check (true);

create policy "admin_hapus_foto_produk" on public.foto_produk
  for delete to authenticated using (true);

