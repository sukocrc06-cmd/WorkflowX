> **Güncelleme (v0.8):** Backend yeniden **Supabase**. Faz 2 (Supabase Auth) uygulandı. Kurulum için `AUTH_SUPABASE.md`'ye bakın. Aşağıdaki Supabase notları yeniden geçerlidir. Next.js geçişi bu fazda zorunlu değildir; mevcut modüler yapı korunmaktadır.

# WorkFlowX — Next.js'e Geçiş Planı

Hedef yığın: **Next.js (App Router) + TypeScript (strict) + React + Tailwind + shadcn/ui**. Backend (Supabase) ayrı bir fazdır; bu plan onu bekletmeden ilerleyebilir.

## 1. Hedef klasör yapısı

```
src/
  app/
    (marketing)/page.tsx                      ← ui/public.js renderLanding
    (marketing)/{privacy,terms,security,contact}/page.tsx
    (auth)/{login,signup,forgot-password}/page.tsx   ← renderAuth (şimdilik sahte)
    app/layout.tsx                            ← ui/shell.js (kenar çubuğu, üst bar, mobil alt menü, FAB)
    app/page.tsx                              ← views/overview.js
    app/today/page.tsx                        ← views/today.js
    app/tasks/page.tsx  app/tasks/[taskId]/page.tsx
    app/projects/page.tsx  app/projects/[projectId]/[[...tab]]/page.tsx
    app/calendar/page.tsx      (?date=&mode=day|week|month)
    app/planning/page.tsx  app/analytics/page.tsx  app/team/page.tsx  app/settings/page.tsx
    not-found.tsx  error.tsx  app/loading.tsx  ← ui/states.js
  components/ui/          shadcn: button, dialog, sheet, command, dropdown-menu, tabs, tooltip, skeleton, toast(sonner)
  components/             logo, empty-state, error-state, page-header, kpi, pill
  features/
    tasks/      task-form, task-row, task-detail, quick-add, quickParse.ts ✅ recurrence.ts ✅
    projects/   project-header, board (dnd-kit), timeline
    calendar/   calendar-grid, month-view, event-form, block-popover, conflict-dialog, ics.ts ✅ capacity.ts ✅ conflicts.ts ✅
    projects/   health.ts ✅
    team/       permissions.ts ✅, members-table, role-matrix
    planning/   engine.ts ✅, service.ts ✅, draft-view, assistant-card
    analytics/  kpis, charts
  lib/          date.ts ✅ ids.ts ✅ html.ts ✅ validate.ts ✅ storage.ts ✅ history.ts ✅ i18n.ts
  hooks/        use-app-state, use-hotkeys, use-media-query, use-reduced-motion
  types/        domain.ts ✅
```
✅ = `web/src` içinde hazır ve testli; olduğu gibi kopyalanır.

## 2. Rota eşlemesi (hash → gerçek URL)

| Prototip | Next.js |
|---|---|
| `#/` | `/` |
| `#/app` | `/app` |
| `#/app/tasks/ID` | `/app/tasks/[taskId]` |
| `#/app/projects/ID/board` | `/app/projects/[projectId]/board` |
| `#/app/calendar/2026-10-05/week` | `/app/calendar?date=2026-10-05&mode=week` |
| `#/login` `#/signup` `#/forgot-password` | aynı yollar |

Parametre doğrulaması (`isSafeId`, `isLocalDate`, mod beyaz listesi) sayfa bileşeninde yapılır; geçersizse `notFound()`.

## 3. Adımlar

1. **İskelet**: `create-next-app` (TS, Tailwind, App Router, ESLint), shadcn init. `tokens.css` → Tailwind tema değişkenleri (CSS değişkenleri aynı isimlerle korunur, açık/koyu).
2. **Çekirdek**: `web/src` → `src/` (types, lib, features/*.ts). `npm run check` yeşil kalmalı.
3. **Durum**: `AppStateProvider` (React context + `useSyncExternalStore`) + `StorageService(new LocalStorageAdapter())`. Geri al (undo) = önceki durumun anlık görüntüsü; aynı davranış.
4. **Kabuk ve durumlar**: layout, skeleton, error/not-found, bildirimler (sonner), komut paleti (cmdk), klavye kısayolları.
5. **Ekranlar** sırayla: Görevler → Görev detayı → Takvim → Planlama → Projeler → Pano (dnd-kit) → Analiz → Ayarlar → Tanıtım.
6. **i18n**: `t(trKey)` sözlüğü → `next-intl` mesaj dosyaları (tr/en).
7. **QA**: `qa/e2e.js` senaryoları `@playwright/test`'e taşınır (aynı adımlar, yeni URL'ler); axe denetimi CI'da.

## 4. Backend fazına hazırlık

- `StorageAdapter` arayüzü korunur; `SupabaseAdapter` eklenir → UI değişmez. Başlangıçta localStorage verisi tek seferlik "hesaba aktar" ile yüklenir (`sanitizeState` sonrası).
- Şema: `schema.sql` (RLS dahil). Yerel saatler `timestamptz`'e profil `tz` ile çevrilir.
- Sahte giriş yerine Supabase Auth + middleware ile korumalı `/app/*`.

## 5. AI fazına hazırlık

- `Planner` arayüzü (`features/planning/service.ts`): `aiPlanner` aynı imzayı uygular, sunucu tarafında (Route Handler) çalışır, anahtar istemciye gitmez.
- Model çıktısı Zod şemasıyla ayrıştırılır → `validatePlan()` → taslak → kullanıcı onayı. Deterministik motor hem yedek hem de çakışma denetçisi olarak kalır.
- Arayüzde "AI" etiketi yalnızca gerçekten model kullanıldığında gösterilir; bugün "Akıllı planlama (kural tabanlı)".

## 6. v0.5 veri modeli → backend tabloları (yalnızca plan; SQL bu fazda yazılmadı)

| Frontend | Backend fazında |
|---|---|
| `task.subtasks[]` | `subtasks (task_id, title, done, position)` |
| `task.recur` | `task_recurrences (task_id, freq, interval, days, month_day)` — sonraki örnek sunucuda da üretilebilir |
| `task.comments[]` | `comments (task_id, author_id, body, created_at)` + bahsetme |
| `task.assignee`, `S.members` | `memberships (workspace_id, user_id, role)`; roller `can()` tablosuyla aynı RLS politikaları |
| `S.activity` | `activity (workspace_id, entity, entity_id, type, data jsonb, at)` |
| `S.templates` | `templates (workspace_id, kind, name, items jsonb)` |
| `S.notifRead` | `notification_reads (user_id, notification_key)` |
| `project.archived` | `projects.archived_at` |
| `SYNC` durumu | Supabase realtime + çevrimdışı kuyruk → `syncing` / `synced` |
