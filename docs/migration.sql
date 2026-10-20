-- ==============================================================================
-- Skrip Migrasi Lengkap: US-18, US-19, US-20, US-29, US-31
-- Cara pakai: Buka Supabase Dashboard > SQL Editor > New query > Tempel skrip ini > Run
-- ==============================================================================

-- 1. US-19: Kolom stok di tabel produk
alter table public.produk add column if not exists stok integer not null default 10;

-- 2. US-20: Kolom harga_diskon dan badge promo
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

alter table public.foto_produk enable row level security;

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

-- 4. US-31: Tabel kelola kategori
create table if not exists public.kategori (
  id bigint generated always as identity primary key,
  nama text not null unique,
  slug text not null unique,
  created_at timestamptz not null default now()
);

alter table public.kategori enable row level security;

drop policy if exists "admin_baca_kategori" on public.kategori;
drop policy if exists "admin_tambah_kategori" on public.kategori;
drop policy if exists "admin_ubah_kategori" on public.kategori;
drop policy if exists "admin_hapus_kategori" on public.kategori;

create policy "admin_baca_kategori" on public.kategori
  for select to authenticated using (true);
create policy "admin_tambah_kategori" on public.kategori
  for insert to authenticated with check (true);
create policy "admin_ubah_kategori" on public.kategori
  for update to authenticated using (true) with check (true);
create policy "admin_hapus_kategori" on public.kategori
  for delete to authenticated using (true);

-- Migrasikan nama kategori yang sudah ada di tabel produk ke tabel kategori
insert into public.kategori (nama, slug)
select distinct
  kategori,
  lower(regexp_replace(trim(kategori), '[^a-zA-Z0-9]+', '-', 'g'))
from public.produk
where kategori is not null and trim(kategori) != ''
on conflict (nama) do nothing;

-- 5. US-29: Petunjuk Pengaturan Supabase Storage (Bucket)
-- Bucket: "produk-foto" (dibuat Public Bucket di menu Storage > New Bucket di Dashboard)
-- Policy storage:
--   - Select (baca): Izinkan publik (Anon & Authenticated)
--   - Insert / Update / Delete: Service Role Key (otomatis melewati RLS)
insert into storage.buckets (id, name, public)
values ('produk-foto', 'produk-foto', true)
on conflict (id) do update set public = true;

drop policy if exists "Publik dapat melihat foto produk" on storage.objects;
create policy "Publik dapat melihat foto produk"
  on storage.objects for select
  using (bucket_id = 'produk-foto');
