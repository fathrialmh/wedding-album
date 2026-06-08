-- Wedding Shared Album schema
-- Run this in the Supabase SQL Editor after creating your project.

-- Guests table: one row per device
create table if not exists public.guests (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  device_id text unique not null,
  photo_count integer not null default 0 check (photo_count >= 0),
  created_at timestamptz not null default now()
);

-- Photos table: one row per captured photo
create table if not exists public.photos (
  id uuid primary key default gen_random_uuid(),
  guest_id uuid not null references public.guests(id) on delete cascade,
  guest_name text not null,
  storage_path text not null,
  public_url text not null,
  created_at timestamptz not null default now()
);

create index if not exists photos_created_at_idx on public.photos (created_at desc);
create index if not exists photos_guest_id_idx on public.photos (guest_id);
create index if not exists guests_device_id_idx on public.guests (device_id);

-- Row Level Security
alter table public.guests enable row level security;
alter table public.photos enable row level security;

-- Photo likes: one like per device per photo
create table if not exists public.photo_likes (
  id uuid primary key default gen_random_uuid(),
  photo_id uuid not null references public.photos(id) on delete cascade,
  device_id text not null,
  created_at timestamptz not null default now(),
  unique (photo_id, device_id)
);

create index if not exists photo_likes_photo_id_idx on public.photo_likes (photo_id);
create index if not exists photo_likes_device_id_idx on public.photo_likes (device_id);

alter table public.photo_likes enable row level security;

-- Public read access for gallery
create policy "Photos are publicly readable"
  on public.photos
  for select
  using (true);

create policy "Photo likes are publicly readable"
  on public.photo_likes
  for select
  using (true);

-- Storage bucket for wedding photos (public read)
insert into storage.buckets (id, name, public)
values ('wedding-photos', 'wedding-photos', true)
on conflict (id) do update set public = true;

-- Public read policy for storage objects
create policy "Public read wedding photos"
  on storage.objects
  for select
  using (bucket_id = 'wedding-photos');

-- Atomic photo upload helper (prevents race conditions on photo limit)
create or replace function public.register_photo_upload(
  p_device_id text,
  p_photo_limit integer,
  p_storage_path text,
  p_public_url text
)
returns table (
  photo_id uuid,
  guest_name text,
  photo_count integer,
  remaining integer
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_guest public.guests%rowtype;
  v_photo_id uuid;
begin
  select *
  into v_guest
  from public.guests
  where device_id = p_device_id
  for update;

  if not found then
    raise exception 'Guest not found for device';
  end if;

  if v_guest.photo_count >= p_photo_limit then
    raise exception 'Photo limit reached';
  end if;

  insert into public.photos (guest_id, guest_name, storage_path, public_url)
  values (v_guest.id, v_guest.name, p_storage_path, p_public_url)
  returning id into v_photo_id;

  update public.guests as g
  set photo_count = g.photo_count + 1
  where g.id = v_guest.id
  returning * into v_guest;

  return query
  select
    v_photo_id,
    v_guest.name,
    v_guest.photo_count,
    greatest(p_photo_limit - v_guest.photo_count, 0);
end;
$$;
