-- WorkFlowX · RLS / yetkilendirme testleri (Faz 12 · p12a)
-- Ne yapar: iki deneme kullanıcısı (A ve B) oluşturur, A gibi davranıp B'nin verisine
--           erişmeyi dener, giriş yapmamış (anon) erişimi ve hesap silmeyi dener.
-- Kalıcı hiçbir şey bırakmaz: en sondaki ROLLBACK her şeyi geri alır.
-- Nasıl çalıştırılır: Supabase → SQL Editor → New query → tamamını yapıştır → Run.
--   "Success. No rows returned"  → tüm testler GEÇTİ.
--   Kırmızı hata                  → mesaj hangi testin kaldığını söyler.
-- Önce şu betikler çalıştırılmış olmalı: user_data.sql, delete_account.sql, fix_signup.sql.

begin;

-- Deneme kullanıcıları (kayıt tetikleyicisi profil satırlarını da açar)
insert into auth.users (id, email, raw_user_meta_data) values
  ('00000000-0000-4000-8000-0000000000a1', 'rls-a@test.invalid', '{"full_name":"Test A"}'),
  ('00000000-0000-4000-8000-0000000000b2', 'rls-b@test.invalid', '{"full_name":"Test B"}');

insert into public.user_data (user_id, data, rev) values
  ('00000000-0000-4000-8000-0000000000a1', '{"tasks":[{"id":"t1","title":"A gizli"}]}', 1),
  ('00000000-0000-4000-8000-0000000000b2', '{"tasks":[{"id":"t2","title":"B gizli"}]}', 1);

-- ---------- A olarak giriş yapmış kullanıcı ----------
set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"00000000-0000-4000-8000-0000000000a1","role":"authenticated"}', true);

do $$
declare n int; blocked boolean;
begin
  -- 1. yalnızca kendi satırını görür
  select count(*) into n from public.user_data;
  if n <> 1 then raise exception 'TEST 1 KALDI: A % satır görüyor (1 olmalı)', n; end if;
  if not exists (select 1 from public.user_data where user_id = '00000000-0000-4000-8000-0000000000a1') then
    raise exception 'TEST 2 KALDI: A kendi satırını göremiyor'; end if;

  -- 3. başkasının satırını değiştiremez
  update public.user_data set data = '{}' where user_id = '00000000-0000-4000-8000-0000000000b2';
  get diagnostics n = row_count;
  if n <> 0 then raise exception 'TEST 3 KALDI: A, B''nin satırını değiştirebildi'; end if;

  -- 4. başkası adına satır ekleyemez
  blocked := false;
  begin
    insert into public.user_data (user_id, data, rev) values ('00000000-0000-4000-8000-0000000000c3', '{}', 1);
  exception when others then blocked := true; end;
  if not blocked then raise exception 'TEST 4 KALDI: A başka bir kullanıcı adına satır ekleyebildi'; end if;

  -- 5. kendi satırını sürümü 1 artırarak güncelleyebilir
  update public.user_data set data = '{"tasks":[]}', rev = rev + 1 where user_id = '00000000-0000-4000-8000-0000000000a1';
  get diagnostics n = row_count;
  if n <> 1 then raise exception 'TEST 5 KALDI: A kendi satırını güncelleyemedi'; end if;

  -- 6. sürüm atlatılamaz (eş zamanlı yazma koruması)
  blocked := false;
  begin
    update public.user_data set rev = rev + 5 where user_id = '00000000-0000-4000-8000-0000000000a1';
  exception when others then blocked := true; end;
  if not blocked then raise exception 'TEST 6 KALDI: sürüm 1''den fazla artırılabildi'; end if;

  -- 7. satır başka kullanıcıya devredilemez
  blocked := false;
  begin
    update public.user_data set user_id = '00000000-0000-4000-8000-0000000000b2', rev = rev + 1
      where user_id = '00000000-0000-4000-8000-0000000000a1';
  exception when others then blocked := true; end;
  if not blocked then raise exception 'TEST 7 KALDI: satır başka kullanıcıya devredilebildi'; end if;

  -- 8. API üzerinden satır silinemez (silme yalnızca hesap silmeyle)
  delete from public.user_data where user_id = '00000000-0000-4000-8000-0000000000a1';
  get diagnostics n = row_count;
  if n <> 0 then raise exception 'TEST 8 KALDI: satır doğrudan silinebildi'; end if;

  -- 9. başkasının profilini göremez
  if exists (select 1 from public.profiles where id = '00000000-0000-4000-8000-0000000000b2') then
    raise exception 'TEST 9 KALDI: A, B''nin profilini görebiliyor'; end if;
end $$;

-- ---------- Giriş yapmamış ziyaretçi (anon) ----------
reset role;
set local role anon;
select set_config('request.jwt.claims', '{"role":"anon"}', true);

do $$
declare blocked boolean;
begin
  -- 10. veri tablosuna hiç erişemez
  blocked := false;
  begin perform 1 from public.user_data; exception when others then blocked := true; end;
  if not blocked then raise exception 'TEST 10 KALDI: giriş yapmamış ziyaretçi user_data tablosunu okuyabildi'; end if;

  -- 11. hesap silme fonksiyonunu çağıramaz
  blocked := false;
  begin perform public.delete_my_account(); exception when others then blocked := true; end;
  if not blocked then raise exception 'TEST 11 KALDI: giriş yapmamış ziyaretçi delete_my_account çağırabildi'; end if;
end $$;

-- ---------- A hesabını siler ----------
reset role;
set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"00000000-0000-4000-8000-0000000000a1","role":"authenticated"}', true);
select public.delete_my_account();
reset role;

do $$
begin
  -- 12. yalnızca A silinir, B'ye dokunulmaz
  if exists (select 1 from auth.users where id = '00000000-0000-4000-8000-0000000000a1') then
    raise exception 'TEST 12 KALDI: A hesabı silinmedi'; end if;
  if exists (select 1 from public.user_data where user_id = '00000000-0000-4000-8000-0000000000a1') then
    raise exception 'TEST 12 KALDI: A''nın bulut verisi silinmedi'; end if;
  if not exists (select 1 from auth.users where id = '00000000-0000-4000-8000-0000000000b2')
     or not exists (select 1 from public.user_data where user_id = '00000000-0000-4000-8000-0000000000b2') then
    raise exception 'TEST 12 KALDI: A silinirken B''nin hesabı ya da verisi etkilendi'; end if;
  raise notice 'WorkFlowX RLS: 12/12 test geçti';
end $$;

rollback;
