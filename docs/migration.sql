-- ==============================================================================
-- Skrip Migrasi Lengkap: US-18 sampai US-42
-- Buka Supabase Dashboard > SQL Editor > New query > Tempel skrip ini > Run
-- ==============================================================================

-- 1. US-19 & US-32: Kolom stok dan status aktif di tabel produk
alter table public.produk add column if not exists stok integer not null default 10;
alter table public.produk add column if not exists aktif boolean not null default true;

-- 2. US-20: Kolom harga_diskon dan badge promo
alter table public.produk add column if not exists harga_diskon integer check (harga_diskon is null or harga_diskon < harga);
alter table public.produk add column if not exists badge text;

-- 3. US-18: Tabel foto_produk untuk galeri foto
create table if not exists public.foto_produk (
  id bigint generated always as identity primary key,
  produk_id bigint not null references public.produk(id) on delete cascade,
  url text not null,
  urutan integer not null default 0,
  created_at timestamptz not null default now()
);

alter table public.foto_produk enable row level security;
drop policy if exists "admin_foto_produk_all" on public.foto_produk;
create policy "admin_foto_produk_all" on public.foto_produk
  for all to authenticated using (true) with check (true);
drop policy if exists "public_foto_produk_select" on public.foto_produk;
create policy "public_foto_produk_select" on public.foto_produk
  for select using (true);

-- 4. US-31: Tabel kategori
create table if not exists public.kategori (
  id bigint generated always as identity primary key,
  nama text not null unique,
  slug text not null unique,
  created_at timestamptz not null default now()
);

alter table public.kategori enable row level security;
drop policy if exists "admin_kategori_all" on public.kategori;
create policy "admin_kategori_all" on public.kategori
  for all to authenticated using (true) with check (true);
drop policy if exists "public_kategori_select" on public.kategori;
create policy "public_kategori_select" on public.kategori
  for select using (true);

-- Migrasi kategori dari produk
insert into public.kategori (nama, slug)
select distinct
  kategori,
  lower(regexp_replace(trim(kategori), '[^a-zA-Z0-9]+', '-', 'g'))
from public.produk
where kategori is not null and trim(kategori) != ''
on conflict (nama) do nothing;

-- 5. US-38 & US-39: Tabel ulasan dan rating produk
create table if not exists public.ulasan (
  id bigint generated always as identity primary key,
  produk_id bigint not null references public.produk(id) on delete cascade,
  nama text not null,
  rating integer not null check (rating >= 1 and rating <= 5),
  komentar text not null,
  tampil boolean not null default true,
  created_at timestamptz not null default now()
);

alter table public.ulasan enable row level security;
drop policy if exists "admin_ulasan_all" on public.ulasan;
create policy "admin_ulasan_all" on public.ulasan
  for all to authenticated using (true) with check (true);
drop policy if exists "public_ulasan_select" on public.ulasan;
create policy "public_ulasan_select" on public.ulasan
  for select using (tampil = true);
drop policy if exists "public_ulasan_insert" on public.ulasan;
create policy "public_ulasan_insert" on public.ulasan
  for insert with check (true);

-- 6. US-40: Tabel klik_wa untuk analitik pemesanan (tanpa data pribadi)
create table if not exists public.klik_wa (
  id bigint generated always as identity primary key,
  produk_id bigint not null references public.produk(id) on delete cascade,
  created_at timestamptz not null default now()
);

alter table public.klik_wa enable row level security;
drop policy if exists "admin_klik_wa_all" on public.klik_wa;
create policy "admin_klik_wa_all" on public.klik_wa
  for all to authenticated using (true) with check (true);
drop policy if exists "public_klik_wa_insert" on public.klik_wa;
create policy "public_klik_wa_insert" on public.klik_wa
  for insert with check (true);

-- 7. US-42: Tabel banner promo di beranda
create table if not exists public.banner (
  id bigint generated always as identity primary key,
  judul text not null,
  teks text,
  gambar_url text,
  tautan text,
  aktif boolean not null default true,
  created_at timestamptz not null default now()
);

alter table public.banner enable row level security;
drop policy if exists "admin_banner_all" on public.banner;
create policy "admin_banner_all" on public.banner
  for all to authenticated using (true) with check (true);
drop policy if exists "public_banner_select" on public.banner;
create policy "public_banner_select" on public.banner
  for select using (aktif = true);

-- 8. US-29: Storage bucket "produk-foto"
insert into storage.buckets (id, name, public)
values ('produk-foto', 'produk-foto', true)
on conflict (id) do update set public = true;

drop policy if exists "Publik dapat melihat foto produk" on storage.objects;
create policy "Publik dapat melihat foto produk"
  on storage.objects for select
  using (bucket_id = 'produk-foto');
