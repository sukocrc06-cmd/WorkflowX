# Faz 2 — Supabase ile Kimlik Doğrulama

Backend kararı: **Supabase** (Firebase planı iptal edildi; `FIREBASE_PREP.md` yalnızca tarihsel not).

## Ne hazır?

| Özellik | Durum |
|---|---|
| E-posta + şifre ile kayıt / giriş / çıkış | Hazır |
| Google ile giriş (OAuth, PKCE) | Hazır, Supabase'de Google sağlayıcısı açılmalı |
| E-posta doğrulama + "tekrar gönder" (60 sn bekleme) | Hazır |
| Şifre sıfırlama e-postası + yeni şifre sayfası (`#/reset-password`) | Hazır |
| Korumalı rotalar: `#/app/*` oturum ister, girişten sonra istenen sayfaya döner | Hazır |
| Oturum yenileme, süresi dolunca girişe yönlendirme | Hazır |
| İlk girişte "Bu cihazdaki verileri hesabına ekleyelim mi?" | Hazır |
| Her hesabın bu cihazda ayrı veri alanı (hesap değişince bellek temizlenir) | Hazır |
| Ayarlar → Profil: hesap kartı, şifre değiştir, çıkış, tüm cihazlardan çık | Hazır |
| Hesabı kalıcı olarak silme (bulut verileriyle birlikte) | Hazır, `delete_my_account` fonksiyonu kurulmalı (adım 9) |
| Avatar menüsü ve tanıtım sayfasında çıkış | Hazır |
| Verilerin buluta senkronu (her cihazda aynı veriler, çevrimdışı çalışma) | Hazır, `user_data` tablosu kurulmalı (adım 8) |

Supabase ayarlanmadıysa uygulama eskisi gibi **hesapsız** çalışır. Giriş sayfaları bunu açıkça söyler.

## Kurulum (yaklaşık 10 dakika)

### 1. Proje aç
[supabase.com](https://supabase.com) → **New project**. Bölge olarak Frankfurt (eu-central-1) iyi bir seçimdir.

### 2. Anahtarları uygulamaya yaz
Dashboard → **Project Settings → API** sayfasından iki değeri al ve `assets/js/config.supabase.js` dosyasına yapıştır:

```js
window.WFX_SUPABASE = window.WFX_SUPABASE || {
  url: 'https://PROJE-KODUN.supabase.co',
  anonKey: 'eyJhbGciOi...',   // anon / public key
  google: true
};
```

> `anon` anahtarı herkese açıktır; verileri RLS kuralları korur. **`service_role` anahtarını asla bu dosyaya yazma.**

### 3. Uygulamayı açma

- **Çift tık (`index.html`):** e-posta + şifre ile giriş ve bulut senkronu çalışır.
- **Google ile giriş ve e-postadaki bağlantılar için:** klasördeki **`WorkflowX-Baslat.bat`** dosyasına çift tıkla. Uygulama `http://localhost:5500` adresinde açılır (yalnızca bu bilgisayardan erişilir; ek kurulum yok, sadece Node.js). Siyah pencere açık kaldığı sürece çalışır.
- Dosyadan açılan sayfada "Google ile devam et"e basınca, `WorkflowX-Baslat` açıksa uygulama oraya geçip Google girişini kendisi başlatır.
- Neden gerekli: Google girişten sonra kullanıcıyı bir web adresine geri gönderir; `file://` ile açılan bir sayfaya geri dönülemez.

### 4. Yönlendirme adreslerini izin ver
Dashboard → **Authentication → URL Configuration**:

- **Site URL:** `https://workflow-x-gules.vercel.app`
- **Redirect URLs:** `https://workflow-x-gules.vercel.app/**`, `http://localhost:5500/**`

### 5. E-posta ile giriş
**Authentication → Providers → Email** açık olmalı.

- *Confirm email* açıksa kayıt sonrası "E-postanı kontrol et" ekranı çıkar (önerilen).
- Şifre kuralı: en az 8 karakter, en az bir harf ve bir rakam. Uygulama da bunu kontrol eder. Supabase'de **Password requirements** ayarını da buna uygun seç.

### 6. Google ile giriş
1. Google Cloud Console → **APIs & Services → Credentials → OAuth client ID** (Web application).
2. *Authorized redirect URI* olarak Supabase'in verdiği adresi ekle: `https://PROJE-KODUN.supabase.co/auth/v1/callback`
3. Client ID ve Secret'ı Supabase → **Authentication → Providers → Google** alanına yapıştır, **Enable**.

Google girişi istemiyorsan config dosyasında `google: false` yap; buton gizlenir.

### 7. Profil tablosu (SQL Editor'de bir kez çalıştır)

```sql
-- Her kullanıcı için bir profil satırı; yalnızca sahibi okuyup güncelleyebilir.
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text check (char_length(full_name) <= 120),
  role text check (char_length(role) <= 120),
  timezone text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table public.profiles enable row level security;

create policy "profiles: sahibi okur"      on public.profiles for select using (auth.uid() = id);
create policy "profiles: sahibi günceller" on public.profiles for update using (auth.uid() = id) with check (auth.uid() = id);

-- Kayıt olunca profili otomatik oluştur (Google adı da gelir)
create or replace function public.handle_new_user() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, full_name)
  values (new.id, coalesce(new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'name'));
  return new;
end $$;
drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created after insert on auth.users
  for each row execute function public.handle_new_user();
```

### 8. Bulut senkronu tablosu (SQL Editor'de bir kez çalıştır)

Aynı betik `docs/sql/user_data.sql` dosyasında da var.

```sql
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
```

Tablo yoksa uygulama bozulmaz: veriler yalnızca o cihazda kalır, Ayarlar → Profil'de bunu söyleyen bir not çıkar.

### 9. Hesap silme fonksiyonu (SQL Editor'de bir kez çalıştır)

Aynı betik `docs/sql/delete_account.sql` dosyasında da var. Ayarlar → Profil → **Hesabı sil** bunu çağırır.

```sql
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
```

## Yayın (Vercel)

Canlı adres: **https://workflow-x-gules.vercel.app** (GitHub `main` dalına her gönderimde yeniden yayınlanır).

- Vercel → proje → **Settings → Build and Deployment**:
  - **Framework Preset:** Other
  - **Root Directory:** boş (depo kökü). `web` seçiliyse eski Next.js kabuğu yayınlanır.
  - Build Command / Output Directory: boş bırak (derleme yok, `index.html` doğrudan sunulur).
- `vercel.json` güvenlik başlıklarını ekler (CSP: yalnızca kendi dosyaları, Google Fonts ve bu Supabase projesi; iframe içinde açılamaz).
- `.vercelignore` şunları yayına göndermez: `web/`, `qa/`, `tools/`, `docs/`, `.bat`.
- `assets/js/config.supabase.js` içindeki Publishable key herkese açık olabilir; Secret key asla depoya girmemeli.

## Nasıl çalışıyor?

- `assets/js/core/auth.js` tek giriş noktasıdır.
  - Supabase SDK'sı `assets/vendor/` klasöründen yalnızca ayar yapılmışsa yüklenir. Sürüm 2.117.2, MIT lisanslı; CDN kullanılmaz.
  - PKCE akışı kullanılır, jetonlar adres çubuğunda görünmez.
- **Hata mesajları:** Türkçe ve sade gösterilir. "Bu e-posta kayıtlı mı?" sorusuna cevap vermez; şifre sıfırlamada her e-posta için aynı mesaj çıkar.
- **Şifreler:** gönderildikten hemen sonra formdan silinir, uygulama hiçbir yere kaydetmez.
- **Bulut senkronu (`core/sync.js`):**
  - Giriş yapınca veriler önce bu cihazdan açılır, sonra buluttaki en güncel hâl çekilir (en fazla 8 sn beklenir).
  - Her değişiklik önce bu cihaza, ~1 sn sonra buluta yazılır. Üst bardaki gösterge: "Buluta kaydediliyor…" → "Buluta kaydedildi".
  - İnternet yoksa çalışmaya devam edersin; bağlantı gelince bekleyen değişiklikler gönderilir.
  - Diğer cihazdaki değişiklikler sekmeye dönünce, internet geri gelince ve 45 saniyede bir kontrol edilir.
  - İki cihaz aynı anda değiştirdiyse veriler kayıt kayıt birleştirilir: tek tarafta değişen o taraftan alınır, iki tarafta da değişen kayıtta bu cihaz kazanır, bir tarafta silinen silinmiş kalır.
  - Buluttan gelen veri de cihazdaki veri gibi doğrulanır (`sanitizeState`).
- **Veri alanları:** her hesabın bu cihazda ayrı bir alanı var (`workflowx.v1.u.<kullanıcı-id>`). Hesapsız veriler `workflowx.v1` altında durur ve ilk girişte hesaba eklenmesi önerilir; cihazdaki kopya silinmez.
- **Yol Haritası:** Supabase bağlanıp erişilebilir olunca Faz 2 maddeleri otomatik olarak "Tamamlandı" görünür.

## Testler

`qa/e2e-v9-auth.js` gerçek bir Supabase projesine bağlanmaz. SDK'nın yerine sahte bir sürüm (`qa/mock-supabase.js`) kullanır ve şunları dener:

- kayıt, giriş ve çıkış
- e-posta doğrulama
- şifre sıfırlama
- Google yönlendirmesi
- korumalı rotalar ve güvensiz `next` adresinin reddedilmesi
- verileri hesaba aktarma
- hesaplar arası veri ayrımı
- oturumun sona ermesi
- erişilebilirlik taraması (axe)

## Next.js uygulaması (beklemede)

Ana uygulama `index.html`. `web/` klasöründeki Next.js kabuğu ileride gerekirse diye duruyor; şu an geliştirilmiyor.


Üretim uygulaması `web/` klasöründe. Supabase bilgileri orada `web/.env.local` dosyasından okunur (`.env.example` dosyasını kopyalayıp oluştur). Supabase → **URL Configuration → Redirect URLs** listesine `http://localhost:3000/**` adresini de ekle.

Giriş akışı sunucu tarafında:

- `src/proxy.ts` oturumu yeniler ve `/app` sayfalarını korur.
- `src/app/auth/callback` Google ve e-posta bağlantılarından gelen kodu oturuma çevirir.
