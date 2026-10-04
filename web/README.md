# WorkFlowX — Üretim uygulaması (Next.js)

Faz 1 ile kuruldu: **Next.js 16 (App Router) + TypeScript + Tailwind CSS 4 + shadcn/ui + Supabase**.
Prototip (`../index.html`) çalışmaya devam ediyor; ekranlar fazlar hâlinde buraya taşınıyor.

## Bilgisayarında çalıştırma

1. **Node.js 20 veya üstünü** kur: [nodejs.org](https://nodejs.org) → "LTS" sürümü.
2. VS Code'da `WorkflowX\web` klasörünü aç ve terminali aç (**Terminal → New Terminal**).
3. Paketleri kur (yalnızca ilk sefer):
   ```bash
   npm install
   ```
4. **Supabase'i bağla** (isteğe bağlı; bağlamazsan uygulama hesapsız modda açılır):
   - `.env.example` dosyasını kopyalayıp adını `.env.local` yap.
   - `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` satırına Supabase'deki **Publishable key**'i (`sb_publishable_…`) yapıştır.
   - **Secret key'i asla bu dosyaya yazma.**
5. Başlat:
   ```bash
   npm run dev
   ```
   Tarayıcıda **http://localhost:3000** adresini aç.

### Supabase ayarları (Google ve e-posta bağlantıları için)

Supabase → **Authentication → URL Configuration → Redirect URLs** listesine şunu ekle:

```
http://localhost:3000/**
```

Google girişi için Google Cloud'daki OAuth istemcisinde **Authorized JavaScript origins** listesine `http://localhost:3000` ekle.

## Komutlar

| Komut | Ne yapar |
|---|---|
| `npm run dev` | Geliştirme sunucusu (http://localhost:3000) |
| `npm run build` / `npm start` | Üretim derlemesi / çalıştırma |
| `npm run check` | TypeScript kontrolü + 58 birim testi |
| `node qa/e2e-next.cjs` | Tarayıcı testleri (çalışan sunucuya karşı; Playwright + axe-core) |

## Yapı

```
src/
  app/
    (marketing)/          tanıtım sayfası, yasal sayfalar
    (auth)/               /login /signup /forgot-password /reset-password
    auth/callback/        Google ve e-posta bağlantıları (PKCE kod değişimi)
    app/                  uygulama kabuğu: layout, template (sayfa geçişi), roadmap, settings, [section]
    globals.css           tasarım token'ları (açık/koyu tema, 8 vurgu rengi), animasyonlar
  components/
    ui/                   shadcn/ui bileşenleri: button, card, badge, input, dialog, sheet,
                          dropdown-menu, tooltip, command, skeleton, avatar, kbd…
    shell/                kenar çubuğu, üst bar, mobil menü, komut paleti, tema menüsü
    brand/                logo, illüstrasyonlar
  config/nav.ts           menü ve ekranların hangi fazda taşınacağı
  features/               alan katmanı (planlama motoru, hızlı ekleme, .ics, kapasite…) + roadmap
  lib/                    supabase (env, client, server), auth işlemleri, yardımcılar
  proxy.ts                oturum yenileme + korumalı rotalar (/app/*)
test/                     birim testleri (vitest)
```

## Güvenlik

- **Korumalı rotalar:** `/app/*` oturum ister. Giriş sonrası yalnızca uygulama içi adreslere dönülür; `//başka-site` gibi adresler reddedilir.
- **Güvenlik başlıkları:** her sayfada Content-Security-Policy, `X-Content-Type-Options` ve `Referrer-Policy` gönderilir; uygulama başka bir sitenin içinde (iframe) açılamaz.
- **Hata mesajları:** Türkçe ve sade. "Bu e-posta kayıtlı mı?" bilgisini sızdırmaz.
- **Şifreler:** gönderildikten hemen sonra formdan silinir.
