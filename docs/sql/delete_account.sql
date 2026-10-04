-- WorkFlowX · Hesap silme (v1.1)
-- Supabase → SQL Editor → New query → bu dosyanın tamamını yapıştır → Run. Bir kez yeterli.
-- Uygulamadaki "Hesabı sil" düğmesi bu fonksiyonu çağırır. Yalnızca giriş yapmış kişi
-- kendi hesabını silebilir; başkasının hesabına dokunamaz (auth.uid() ile sınırlı).

create or replace function public.delete_my_account() returns void
language plpgsql security definer set search_path = '' as $$
declare uid uuid := auth.uid();
begin
  if uid is null then
    raise exception 'Giriş yapılmamış' using errcode = '42501';
  end if;
  delete from public.user_data where user_id = uid;   -- bulut verileri
  delete from public.profiles  where id = uid;        -- profil
  delete from auth.users       where id = uid;        -- hesap (oturumlar ve Google bağlantısı da silinir)
end $$;

revoke all on function public.delete_my_account() from public, anon;
grant execute on function public.delete_my_account() to authenticated;
