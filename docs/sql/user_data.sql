-- WorkFlowX · Bulut senkronu (v1.0)
-- Supabase → SQL Editor → New query → bu dosyanın tamamını yapıştır → Run. Bir kez çalıştırman yeterli;
-- tekrar çalıştırmak zarar vermez.
-- Her kullanıcının verisi tek satırda tutulur. Satırı yalnızca sahibi okuyup yazabilir (RLS).

create table if not exists public.user_data (
  user_id    uuid primary key references auth.users(id) on delete cascade,
  data       jsonb not null default '{}'::jsonb,
  rev        bigint not null default 1 check (rev > 0),
  updated_at timestamptz not null default now(),
  constraint user_data_size check (pg_column_size(data) <= 5000000)   -- en fazla ~5 MB
);

alter table public.user_data enable row level security;

drop policy if exists "user_data: sahibi okur"    on public.user_data;
drop policy if exists "user_data: sahibi ekler"   on public.user_data;
drop policy if exists "user_data: sahibi günceller" on public.user_data;

create policy "user_data: sahibi okur" on public.user_data
  for select to authenticated using ((select auth.uid()) = user_id);
create policy "user_data: sahibi ekler" on public.user_data
  for insert to authenticated with check ((select auth.uid()) = user_id and rev = 1);
create policy "user_data: sahibi günceller" on public.user_data
  for update to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
-- Silme izni yok: hesap silinince satır otomatik silinir (on delete cascade).

-- Her yazmada sürüm (rev) tam 1 artmalı; zaman damgasını sunucu koyar.
create or replace function public.user_data_touch() returns trigger
language plpgsql set search_path = '' as $$
begin
  if new.user_id <> old.user_id then raise exception 'user_id değiştirilemez'; end if;
  if new.rev <> old.rev + 1 then raise exception 'rev bir artmalı' using errcode = '40001'; end if;
  new.updated_at := now();
  return new;
end $$;

drop trigger if exists user_data_touch on public.user_data;
create trigger user_data_touch before update on public.user_data
  for each row execute function public.user_data_touch();

revoke all on public.user_data from anon;
grant select, insert, update on public.user_data to authenticated;
