create schema if not exists private;
revoke all on schema private from public;
grant usage on schema private to anon, authenticated;

create table public.account_access (
  user_id uuid primary key references auth.users(id) on delete cascade,
  status text not null default 'active' check (status in ('active', 'suspended', 'deleting'))
);
create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  username text unique check (username ~ '^[a-z0-9_]{3,24}$'),
  display_name text not null default '' check (char_length(display_name) <= 60),
  bio text not null default '' check (char_length(bio) <= 500),
  visibility text not null default 'public' check (visibility in ('public','private')),
  created_at timestamptz not null default now()
);
create table public.albums (
  id uuid primary key default gen_random_uuid(),
  mbid uuid not null unique,
  title text not null check (char_length(title) between 1 and 1000),
  artist text not null check (char_length(artist) between 1 and 1000),
  release_date text not null default '',
  kind text not null check (kind in ('Album','EP')),
  source_url text not null,
  fetched_at timestamptz not null default now()
);
create table public.ratings (
  user_id uuid not null references public.profiles(id) on delete cascade,
  album_id uuid not null references public.albums(id),
  value smallint not null check (value between 1 and 10),
  updated_at timestamptz not null default now(),
  primary key (user_id, album_id)
);
create index ratings_album_idx on public.ratings(album_id);
create table public.listening_list (
  user_id uuid not null references public.profiles(id) on delete cascade,
  album_id uuid not null references public.albums(id),
  created_at timestamptz not null default now(),
  primary key (user_id, album_id)
);
create index listening_list_album_idx on public.listening_list(album_id);

create function private.is_active(uid uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists(select 1 from public.account_access where user_id = uid and status = 'active');
$$;
revoke all on function private.is_active(uuid) from public;
grant execute on function private.is_active(uuid) to anon, authenticated;

create function private.on_user_created() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  insert into public.account_access(user_id) values (new.id);
  insert into public.profiles(id) values (new.id);
  return new;
end $$;
revoke all on function private.on_user_created() from public;
create trigger create_reverb_profile after insert on auth.users
for each row execute procedure private.on_user_created();

create function private.touch_rating() returns trigger language plpgsql set search_path = '' as $$
begin new.updated_at = now(); return new; end $$;
revoke all on function private.touch_rating() from public;
create trigger rating_time before update on public.ratings for each row execute procedure private.touch_rating();

alter table public.account_access enable row level security;
alter table public.profiles enable row level security;
alter table public.albums enable row level security;
alter table public.ratings enable row level security;
alter table public.listening_list enable row level security;
revoke all on public.account_access, public.profiles, public.albums, public.ratings, public.listening_list from anon, authenticated;
grant select on public.account_access to authenticated;
grant select on public.profiles, public.albums, public.ratings to anon, authenticated;
grant update (username, display_name, bio, visibility) on public.profiles to authenticated;
grant insert, update, delete on public.ratings to authenticated;
grant select, insert, delete on public.listening_list to authenticated;
grant all on public.account_access, public.profiles, public.albums, public.ratings, public.listening_list to service_role;

create policy access_self on public.account_access for select to authenticated using (user_id = (select auth.uid()));
create policy profile_read on public.profiles for select using (
  private.is_active(id) and (visibility = 'public' or id = (select auth.uid()))
);
create policy profile_update on public.profiles for update to authenticated
using (id = (select auth.uid()) and private.is_active(id)) with check (id = (select auth.uid()) and private.is_active(id));
create policy catalog_read on public.albums for select using (true);
create policy rating_read on public.ratings for select using (
  exists (select 1 from public.profiles p where p.id = user_id)
);
create policy rating_insert on public.ratings for insert to authenticated
with check (user_id = (select auth.uid()) and private.is_active(user_id));
create policy rating_update on public.ratings for update to authenticated
using (user_id = (select auth.uid()) and private.is_active(user_id))
with check (user_id = (select auth.uid()) and private.is_active(user_id));
create policy rating_delete on public.ratings for delete to authenticated
using (user_id = (select auth.uid()) and private.is_active(user_id));
create policy list_owner on public.listening_list for all to authenticated
using (user_id = (select auth.uid()) and private.is_active(user_id))
with check (user_id = (select auth.uid()) and private.is_active(user_id));

-- Server-only cache and shared reservation clock: no per-instance quota counter.
create table public.catalog_cache (query text primary key, album_ids uuid[] not null, expires_at timestamptz not null);
create table public.catalog_clock (id boolean primary key default true check (id), next_at timestamptz not null);
insert into public.catalog_clock values (true, now());
alter table public.catalog_cache enable row level security;
alter table public.catalog_clock enable row level security;
revoke all on public.catalog_cache, public.catalog_clock from anon, authenticated;
grant all on public.catalog_cache, public.catalog_clock to service_role;
create function public.reserve_catalog_slot() returns integer
language plpgsql security invoker set search_path = '' as $$
declare slot timestamptz;
begin
  select greatest(next_at, clock_timestamp()) into slot from public.catalog_clock where id for update;
  if slot > clock_timestamp() + interval '15 seconds' then raise exception 'catalog_busy'; end if;
  update public.catalog_clock set next_at = slot + interval '1100 milliseconds' where id;
  return greatest(0, ceil(extract(epoch from (slot - clock_timestamp())) * 1000)::integer);
end $$;
revoke all on function public.reserve_catalog_slot() from public, anon, authenticated;
grant execute on function public.reserve_catalog_slot() to service_role;
