# WorkFlowX

**Canlı:** https://workflow-x-gules.vercel.app

**İşi zamana bağlayan planlama uygulaması.** Görev → odak bloğu → teslim tarihi.

- **Next.js kabuğu (beklemede):** `web/` — ana uygulama `index.html`; bu klasör ileride gerekirse diye duruyor. Kurulum: `web/README.md`.
- **Uygulamayı aç:** `index.html` dosyasına çift tıkla (kurulum gerekmez). Google ile giriş için `WorkflowX-Baslat.bat` dosyasına çift tıkla (http://localhost:5500). Hesapsız kullanımda veriler bu tarayıcıda saklanır, hesapla giriş yapınca buluta da kaydedilir; Ayarlar → Veri'den JSON yedeği alınabilir.
- **TypeScript çekirdek:** `web/` — `npm install && npm run check`.
- **Testler:** `qa/e2e.js` + `qa/e2e-v5.js` (Playwright) + `qa/e2e-v6.js` … `qa/e2e-v9-auth.js`, `qa/e2e-v10-sync.js` (bulut senkronu), `qa/a11y.js` (axe), `web/` içinde `npm run check` (58 birim testi).
- **Hesaplar ve bulut senkronu (Faz 2):** `assets/js/config.supabase.js` doldurulunca Supabase Auth ile gerçek hesaplar açılır; `docs/sql/user_data.sql` çalıştırılınca veriler her cihazda aynı olur. Rehber: `docs/AUTH_SUPABASE.md`.
- **Belgeler:** `docs/AUTH_SUPABASE.md`, `docs/AUDIT-FINAL.md`, `docs/AUDIT.md`, `docs/ARCHITECTURE.md`, `docs/MIGRATION.md`, `MVP_KAPSAM.md`, `schema.sql`.

Giriş sistemi Supabase Auth ile çalışır (ayar yapılmazsa hesapsız mod). Giriş yapınca veriler buluta da kaydedilir (çevrimdışı da çalışır). Ödeme ve AI API henüz yoktur. "Akıllı planlama" kural tabanlıdır ve her öneri kullanıcı onayı olmadan takvime yazılmaz.
