# WorkFlowX — Yol Haritası v2 (Ekim 2026)

Canlı: https://workflow-x-gules.vercel.app · Uygulama: `index.html` (HTML/JS + Supabase)

## Tamamlanan ilk sürüm (Faz 0–12)

| Faz | Konu | Durum |
|---|---|---|
| 0 | Mimari, şema, kapsam | ✅ |
| 1 | Uygulama kabuğu, tasarım sistemi, komut paleti | ✅ |
| 2 | Supabase hesapları, Google girişi, bulut senkronu, hesap silme | ✅ |
| 3–7 | Ana panel, görevler, projeler, takvim, görev → takvim planlama | ✅ |
| 8 | Planlama servisi: yapılandırılmış öneri + şema doğrulama, kullanım kaydı + hız limiti (saatte 60) | ✅ |
| 9 | Ekip önizlemesi (bu cihazda): üyeler, roller, iş yükü | ✅ |
| 10 | Analiz + **haftalık rapor** (Markdown / PDF) | ✅ |
| 11 | Çalışma saatleri, kapasite, TR/EN | ✅ |
| 12 | Uçtan uca testler, erişilebilirlik, **RLS testleri (12)**, Vercel yayını | ✅ |

## Yeni yol haritası (öncelik: ekip ve paylaşım)

### Faz 13 — Ekip ve paylaşım (V2) · şu an
- Ortak çalışma alanı (organizations + üyelik + RLS)
- E-posta ile davet ve katılma
- Roller: sahip / yönetici / üye / izleyici
- Gerçek kullanıcılarla görev atama
- Canlı ortak düzenleme (Supabase Realtime)
- Yorumda bahsetme ve ekip bildirimleri

### Faz 14 — Entegrasyonlar (V3)
- Google Takvim'i okuma → odak bloklarını Google Takvim'e yazma
- Outlook / Microsoft 365 takvimi
- Slack bildirimleri · GitHub / Jira görev içe aktarma · Notion içe aktarma

### Faz 15 — Gerçek AI planlama (V3)
- Sunucu tarafı AI servisi (Supabase Edge Function, anahtar sunucuda)
- Doğal dilden plan · sunucuda şema doğrulama + güvenli istem
- Hesap başına kota ve kullanım kaydı · önerilerin açıklaması ve geri bildirim

### Faz 16 — Mobil ve PWA (V3)
- Telefona yüklenebilir uygulama · çevrimdışı önbellek (service worker)
- Anlık bildirimler (Web Push) · mobil hızlı ekleme ve paylaşım hedefi

### Faz 17 — Abonelik ve büyüme (V4)
- Planlar ve fiyatlandırma · ödeme (Stripe) ve fatura · plan bazlı limitler
- Özel alan adı ve e-posta (SMTP) · gizlilik dostu ürün analitiği

Genel ilerleme: ilk sürüm %100; yeni haritayla birlikte toplam %71.
