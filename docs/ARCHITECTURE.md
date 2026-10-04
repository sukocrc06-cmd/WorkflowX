# WorkFlowX — Frontend Mimarisi (v0.5)

> **İşi zamana bağlar:** GÖREV → ODAK BLOĞU → TESLİM TARİHİ.
> Bu belge prototipin bugünkü yapısını ve Next.js'e taşınırken hangi parçanın nereye gideceğini anlatır.

## 1. İki katman

| Katman | Nerede | Amaç |
|---|---|---|
| **Çalışan prototip** | `index.html` + `assets/` | Kurulum gerektirmez; `file://` ile açılır. Tüm ekranlar, akışlar ve QA bunun üzerinde. |
| **Alan çekirdeği (TypeScript)** | `web/` | Strict TS; tipler, doğrulama, planlama motoru, hızlı ekleme ve ICS ayrıştırıcı, depolama arayüzü. Framework'ten bağımsız, **birim testli**. Next.js uygulaması bunu doğrudan içe aktaracak. |

Prototip derleme adımı olmadan çalışsın diye düz JS (klasik script) olarak kaldı; iş mantığının "gerçek" sürümü `web/src` içinde. İkisi aynı algoritmayı kullanır; bir hata bulunduğunda iki tarafta da düzeltilir (örnek: v0.4'te "Sunum"/"Pazarlama" kelimelerinin gün adı sanılması).

## 2. Prototip klasör yapısı

```
index.html                  kabuk + script sırası
assets/css/
  tokens.css                renk / tip / boşluk / gölge / hareket token'ları (açık + koyu)
  base.css app.css components.css overlays.css motion.css responsive.css landing.css
assets/js/
  core/     storage · i18n · icons · utils · validate · state · history   (altyapı, DOM'suz)
  domain/   capacity · activity · recurrence · conflicts · team · tasks · templates ·
            planning · insights · health · notifications · roadmap · calendar      (saf iş mantığı)
  app/      router · actions · boot                                (yönlendirme, olay delegasyonu, açılış)
  ui/       components · states · shell · public · render · forms · conflict · toast · onboarding
  views/    today overview tasks task projects project calendar planning analytics roadmap team settings
  features/ timer planning ics keyboard command-palette calendar-drag board-dnd quick-add
  data/     demo  (demo: true işaretli, tek tıkla kaldırılabilir)
qa/  e2e.js (36) · e2e-v5.js (37, test matrisi) · a11y.js (axe) · smoke.js
web/ TypeScript çekirdek (bkz. §5)
```

## 3. Durum ayrımı

- **Ürün durumu `S`** (kalıcı): profile, settings, projects, tasks, events, blocks, timer, roadmap. Yalnızca `save()` ile yazılır; `save()` hata verirse kullanıcıya "Tekrar dene" içeren bildirim gösterilir.
- **Arayüz durumu `UI`** (kalıcı değil): aktif rota, filtreler, açık taslak plan, sürükleme durumu, açılış durumu (`loading/ready/error`).
- Türetilmiş değerler (`busyItems`, yük, ilerleme) `STATE_V` sürüm numarasıyla önbelleğe alınır; her `save()`/`render()` sürümü artırır.

## 4. Güvenlik kuralları (frontend)

1. Kullanıcı kaynaklı her metin HTML'e **yalnızca `esc()`** ile girer. Hızlı ekleme önizlemesi, etiketler, ICS başlıkları dahil.
2. Tüm kimlikler `^[A-Za-z0-9_-]{1,64}$`; renkler `#rrggbb`. Uymayan veri yüklenirken **yeniden üretilir** (XSS denemesi `"><img onerror>` testle doğrulandı).
3. `localStorage` ve içe aktarılan JSON güvenilmez kabul edilir → `sanitizeState()` her yüklemede ve içe aktarmada çalışır: bilinmeyen alanlar atılır, enum/tarih/sayı sınırlanır, kopuk referanslar temizlenir, bağımlılık döngüleri kesilir. Bozuk veri silinmez, `workflowx.v1.corrupt` olarak saklanır ve indirilebilir.
4. URL parametreleri (`#/app/tasks/:id`, takvim tarihi/modu, proje sekmesi) beyaz liste + regex ile doğrulanır; geçersizse 404 durumu.
5. Planlama önerileri **hiçbir zaman otomatik uygulanmaz**; `validatePlan()` → taslak → kullanıcı "Uygula".

## 5. TypeScript çekirdek (`web/`)

```
web/src/
  types/domain.ts                 AppState, Task, Project, CalendarEvent, ScheduleBlock, Plan, PlanWhy…
  lib/date.ts                     yerel "YYYY-MM-DDTHH:mm" zaman modeli, gün yardımcıları
  lib/ids.ts  lib/html.ts         güvenli kimlik, escapeHtml
  lib/validate.ts                 sanitizeState, breakCycles, createsCycle
  lib/storage.ts                  StorageAdapter arayüzü, StorageService, LocalStorage/Memory adaptörleri
  features/planning/engine.ts     planTask / planOrder / planMany (saf, deterministik)
  features/planning/service.ts    Planner arayüzü, rulesPlanner, validatePlan, applyPlan
  features/tasks/quickParse.ts    doğal dil hızlı ekleme ayrıştırıcı
  features/calendar/ics.ts        .ics ayrıştırma, RRULE/EXDATE açılımı, içe aktarma
web/test/                         31 vitest testi (TZ=Europe/Istanbul)
```

Çalıştırma: `cd web && npm install && npm run check` (typecheck + test).

## 6. Zaman modeli

- Görev teslimi, etkinlik ve bloklar **yerel duvar saati** (`2026-10-05T14:00`), saat dilimi eki yok → kullanıcının gördüğü saat neyse o saklanır.
- Yalnızca tarih alanları `parseDay()` ile yerel gece yarısına çevrilir (UTC kayması hatası v0.4'te düzeltildi).
- Zaman kayıtları (timer) ISO UTC anı olarak saklanır.
- ICS: `Z` sonekli UTC saatler yerel saate çevrilir; kayan saatler olduğu gibi alınır.
- Backend fazında: `timestamptz` + profildeki `tz` ile dönüşüm (bkz. MIGRATION.md).

## 7. v0.5 ile gelen yapı taşları

| Konu | Nerede | Kural |
|---|---|---|
| Geri al / yinele | `core/history.js` | Her değişiklik `commit(label, fn)` ile; öncesi anlık görüntü olarak saklanır. Bildirimdeki "Geri al" yalnızca hâlâ son işlemse çalışır. Ctrl+Z / Ctrl+Shift+Z. |
| Aktivite | `domain/activity.js` | `S.activity` (en fazla 1000): görev/proje/çalışma alanı olayları, alan bazında fark. Backend'de `activity` tablosu. |
| Kapasite | `domain/capacity.js` | `dayCapacity(d)` → available / planned / free / remaining / over. Bugün, Genel bakış, Takvim, Planlama, Analiz aynı fonksiyonu okur. |
| Çakışma | `domain/conflicts.js` + `ui/conflict.js` | Kaydetmeden önce kontrol; Taşı (ilk boş slot), Böl (çakışmayan kısım), İptal, Yine de planla. Takvimde bant + vurgu + "Çöz". |
| Planlama | `domain/planning.js` | Başlangıç tarihi, atlanan dolu günlerin nedeni, hafta sonu seçeneği, gerekçe kodları (`due, window, nofree, outside, full, cap`), bağımlılıkları otomatik ekleme, başkasına atanan işi planlamama. |
| Görev modeli | `domain/tasks.js`, `recurrence.js`, `templates.js` | Alt görev, tekrar (günlük/hafta içi/haftalık/aylık), şablon, yorum, atanan, başlangıç, çoklu bağımlılık. |
| Proje | `domain/health.js` | Sağlık yalnızca gerçek veriden; veri yoksa "Yeterli veri yok". Arşiv/geri yükleme, kilometre taşları. |
| Ekip | `domain/team.js` | Roller + `can(role, action)` yetki matrisi; üyeler yerel. Çalışma alanı kavramı (şimdilik yalnızca kişisel). |
| Bildirim | `domain/notifications.js` | Kararlı kimlikler, kategori, okundu durumu (`S.notifRead`). Kişilere bağlı kategoriler simüle edilmez. |
| Kayıt durumu | `SYNC` + `syncBadge()` | saved / offline / error; syncing / synced backend için ayrıldı. |
| PWA | `manifest.webmanifest`, `assets/icons/` | Manifest yalnızca http(s) üzerinde bağlanır; service worker backend fazında. |

## 8. Tarayıcı desteği

Chrome / Edge 111+, Safari 16.2+, Firefox 113+ (`color-mix`, `<dialog>`, `dvh`). Otomatik testler Chromium'da çalışır; Safari için kullanılan API'ler tek tek kontrol edildi.

## 9. Performans (500 görev, 1000 etkinlik, Chromium)

Tüm sayfalar ≤ 55 ms render; planlama 40 görev ≈ 2 ms; 33 sayfa geçişinde document/window dinleyici sayısı sabit (19), interval sayısı sabit (2). Uzun görev listeleri 100'erli gösterilir.
