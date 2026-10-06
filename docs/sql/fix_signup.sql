-- WorkFlowX · Kayıt / Google girişi düzeltmesi (v1.1.2)
-- Belirti: kayıt ol veya Google ile giriş "İşlem tamamlanamadı" / "Database error saving new user" veriyor.
-- Neden: yeni kullanıcı eklenince çalışan tetikleyici (handle_new_user) profiles tablosuna yazamıyor
--        (ör. tablo farklı sütunlarla — email zorunlu vb. — kurulmuş). Tetikleyici hata verince Supabase
--        kullanıcıyı da oluşturmaz.
-- Çözüm: tetikleyici profili iki yoldan dener; yine olmazsa uyarı yazar ama kaydı ENGELLEMEZ.
-- Supabase → SQL Editor → New query → tamamını yapıştır → Run. Tekrar çalıştırmak zarar vermez.

create or replace function public.handle_new_user() returns trigger
language plpgsql security definer set search_path = '' as $$
declare nm text := left(coalesce(new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'name', split_part(new.email, '@', 1)), 120);
begin
  begin
    insert into public.profiles (id, full_name) values (new.id, nm) on conflict (id) do nothing;
  exception when others then
    begin
      insert into public.profiles (id, email, full_name) values (new.id, new.email, nm) on conflict (id) do nothing;
    exception when others then
      raise warning 'WorkFlowX: profil oluşturulamadı (%), kayıt yine de tamamlandı', sqlerrm;
    end;
  end;
  return new;
end $$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created after insert on auth.users
  for each row execute function public.handle_new_user();

-- Kontrol: auth.users üzerindeki tetikleyiciler (yalnızca on_auth_user_created görünmeli)
select tgname as tetikleyici from pg_trigger
where tgrelid = 'auth.users'::regclass and not tgisinternal;
