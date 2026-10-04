/**
 * WorkFlowX development roadmap (single source of truth for the production app).
 * done  = shipped in this Next.js app · proto = works in the index.html prototype only · todo = not started.
 * Faz 2 sign-in items count as done automatically once Supabase is configured (see authEnabled).
 */
export type RoadmapStatus = 'done' | 'proto' | 'todo';
export interface RoadmapItem { id: string; tr: string; en: string; status: RoadmapStatus }
export interface RoadmapPhase { n: number; v: 'MVP' | 'V2' | 'V3'; tr: string; en: string; now?: true; items: RoadmapItem[] }

export const ROADMAP: RoadmapPhase[] = [
  { n: 0, v: "MVP", tr: "Depo inceleme ve mimari", en: "Repository & architecture", items: [
    { id: "p0a", tr: "Ürün vizyonu ve MVP kapsamı", en: "Product vision & MVP scope", status: "done" },
    { id: "p0b", tr: "Teknoloji seçimi (Next.js + Supabase)", en: "Tech stack decision (Next.js + Supabase)", status: "done" },
    { id: "p0c", tr: "Veritabanı şeması + RLS taslağı", en: "Database schema + RLS draft", status: "done" },
    { id: "p0d", tr: "Klasör yapısı ve ARCHITECTURE.md", en: "Folder structure & ARCHITECTURE.md", status: "done" }] },
  { n: 1, v: "MVP", tr: "Uygulama kabuğu ve tasarım sistemi", en: "App shell & design system", items: [
    { id: "p1a", tr: "Renk / tipografi token’ları, koyu tema", en: "Color / type tokens, dark mode", status: "done" },
    { id: "p1b", tr: "Kenar çubuğu, üst bar, mobil menü", en: "Sidebar, top bar, mobile nav", status: "done" },
    { id: "p1c", tr: "Tanıtım sayfası", en: "Landing page", status: "done" },
    { id: "p1d", tr: "shadcn/ui bileşen kütüphanesi", en: "shadcn/ui component library", status: "done" },
    { id: "p1e", tr: "Hareket sistemi (geçişler, mikro etkileşimler)", en: "Motion system (transitions, micro-interactions)", status: "done" },
    { id: "p1f", tr: "Komut paleti ve klavye kısayolları", en: "Command palette & keyboard shortcuts", status: "done" },
    { id: "p1g", tr: "Özel boş durum çizimleri", en: "Custom empty-state illustrations", status: "done" }] },
  { n: 2, v: "MVP", tr: "Kimlik doğrulama", en: "Authentication", now: true, items: [
    { id: "p2a", tr: "Kayıt / giriş / çıkış (Supabase Auth)", en: "Sign up / in / out (Supabase Auth)", status: "proto" },
    { id: "p2e", tr: "Google ile giriş (OAuth)", en: "Sign in with Google (OAuth)", status: "proto" },
    { id: "p2f", tr: "E-posta doğrulama ve tekrar gönderme", en: "Email verification & resend", status: "proto" },
    { id: "p2b", tr: "Şifre sıfırlama (PKCE bağlantısı)", en: "Password reset (PKCE link)", status: "proto" },
    { id: "p2c", tr: "Korumalı rotalar ve oturum yönetimi", en: "Protected routes & session handling", status: "proto" },
    { id: "p2g", tr: "Cihazdaki verileri hesaba aktarma", en: "Import device data into the account", status: "proto" },
    { id: "p2h", tr: "Hesap ayarları: şifre değiştir, tüm cihazlardan çık", en: "Account settings: change password, sign out everywhere", status: "proto" },
    { id: "p2d", tr: "Profil ve başlangıç akışı", en: "Profile & onboarding flow", status: "proto" },
    { id: "p2i", tr: "profiles tablosu + RLS (SQL betiği)", en: "profiles table + RLS (SQL script)", status: "proto" }] },
  { n: 3, v: "MVP", tr: "Ana panel", en: "Dashboard", items: [
    { id: "p3a", tr: "KPI’lar ve bugün akışı", en: "KPIs and today agenda", status: "proto" },
    { id: "p3b", tr: "Kural tabanlı içgörüler", en: "Rule-based insights", status: "proto" },
    { id: "p3c", tr: "Anlamlı boş durumlar", en: "Meaningful empty states", status: "proto" },
    { id: "p3d", tr: "Mobil “Bugün” ekranı", en: "Mobile “Today” screen", status: "proto" }] },
  { n: 4, v: "MVP", tr: "Görevler", en: "Tasks", items: [
    { id: "p4a", tr: "Görev CRUD", en: "Task CRUD", status: "proto" },
    { id: "p4b", tr: "Öncelik, durum, etiket, bağımlılık", en: "Priority, status, tags, dependencies", status: "proto" },
    { id: "p4c", tr: "Gerçekleşen süre takibi", en: "Actual time tracking", status: "proto" },
    { id: "p4d", tr: "Görev atama (ekip)", en: "Task assignment (team)", status: "proto" },
    { id: "p4e", tr: "Satır içi akıllı hızlı ekleme", en: "Inline smart quick add", status: "proto" },
    { id: "p4f", tr: "Alt görev, tekrar eden görev, şablon", en: "Subtasks, recurring tasks, templates", status: "proto" },
    { id: "p4g", tr: "Yorumlar ve aktivite geçmişi", en: "Comments & activity history", status: "proto" }] },
  { n: 5, v: "MVP", tr: "Projeler", en: "Projects", items: [
    { id: "p5a", tr: "Proje CRUD", en: "Project CRUD", status: "proto" },
    { id: "p5b", tr: "Pano ve liste görünümü", en: "Board and list views", status: "proto" },
    { id: "p5c", tr: "Süre ağırlıklı ilerleme", en: "Duration-weighted progress", status: "proto" },
    { id: "p5d", tr: "Zaman çizelgesi görünümü", en: "Timeline view", status: "proto" },
    { id: "p5e", tr: "Pano sürükle-bırak", en: "Board drag & drop", status: "proto" },
    { id: "p5f", tr: "Arşiv, sağlık durumu, kilometre taşları", en: "Archive, health status, milestones", status: "proto" }] },
  { n: 6, v: "MVP", tr: "Takvim", en: "Calendar", items: [
    { id: "p6a", tr: "Haftalık görünüm", en: "Week view", status: "proto" },
    { id: "p6b", tr: "Gün ve ay görünümü", en: "Day and month views", status: "proto" },
    { id: "p6c", tr: "Etkinlik CRUD + çakışma uyarısı", en: "Event CRUD + conflict warning", status: "proto" },
    { id: "p6d", tr: ".ics içe aktarma", en: ".ics import", status: "proto" },
    { id: "p6e", tr: "Takvimde sürükle-bırak taşıma ve boyutlandırma", en: "Calendar drag to move & resize", status: "proto" },
    { id: "p6f", tr: "Çakışma motoru (Taşı / Böl / İptal / Yine de)", en: "Conflict engine (Move / Split / Cancel / Anyway)", status: "proto" }] },
  { n: 7, v: "MVP", tr: "Görev → takvim planlama", en: "Task → calendar scheduling", items: [
    { id: "p7a", tr: "Deterministik planlama motoru", en: "Deterministic scheduling engine", status: "proto" },
    { id: "p7b", tr: "Açıklanabilir öneriler", en: "Explainable suggestions", status: "proto" },
    { id: "p7c", tr: "Onay akışı (Uygula / Düzenle / İptal)", en: "Approval flow (Apply / Edit / Cancel)", status: "proto" },
    { id: "p7d", tr: "Motor için birim testleri", en: "Engine unit tests", status: "done" }] },
  { n: 8, v: "V2", tr: "AI planlama temeli", en: "AI planning foundation", items: [
    { id: "p8a", tr: "AIService / PlanningService soyutlaması", en: "AIService / PlanningService abstraction", status: "proto" },
    { id: "p8b", tr: "Yapılandırılmış çıktı + Zod doğrulama", en: "Structured output + Zod validation", status: "todo" },
    { id: "p8c", tr: "Doğal dil istek (şimdilik kural tabanlı)", en: "Natural-language request (rule-based for now)", status: "proto" },
    { id: "p8d", tr: "AI kullanım kayıtları ve hız limiti", en: "AI usage logs & rate limiting", status: "todo" }] },
  { n: 9, v: "V2", tr: "Ekip", en: "Team collaboration", items: [
    { id: "p9a", tr: "Organizasyon ve roller", en: "Organizations & roles", status: "proto" },
    { id: "p9b", tr: "Kişisel / organizasyon veri ayrımı (şema)", en: "Personal vs organization data (schema)", status: "proto" },
    { id: "p9c", tr: "Davet akışı", en: "Invitation flow", status: "todo" },
    { id: "p9d", tr: "Ekip iş yükü görünümü", en: "Team workload view", status: "proto" }] },
  { n: 10, v: "V2", tr: "Analiz ve iş yükü", en: "Analytics & workload", items: [
    { id: "p10a", tr: "Proje bazlı iş dağılımı", en: "Work per project", status: "proto" },
    { id: "p10b", tr: "7 günlük yük / kapasite", en: "7-day load vs capacity", status: "proto" },
    { id: "p10c", tr: "Tahmin doğruluğu", en: "Estimate accuracy", status: "proto" },
    { id: "p10d", tr: "Haftalık rapor", en: "Weekly report", status: "todo" }] },
  { n: 11, v: "V3", tr: "Ayarlar ve entegrasyonlar", en: "Settings & integrations", items: [
    { id: "p11a", tr: "Çalışma saatleri ve kapasite", en: "Working hours & capacity", status: "proto" },
    { id: "p11b", tr: "TR / EN dil desteği", en: "TR / EN language support", status: "proto" },
    { id: "p11c", tr: "Google Takvim API senkronu", en: "Google Calendar API sync", status: "todo" },
    { id: "p11d", tr: "Outlook, Slack, GitHub, Jira, Notion", en: "Outlook, Slack, GitHub, Jira, Notion", status: "todo" }] },
  { n: 12, v: "MVP", tr: "QA, güvenlik ve yayın", en: "QA, security & launch", items: [
    { id: "p12a", tr: "RLS / yetkilendirme testleri", en: "RLS / authorization tests", status: "todo" },
    { id: "p12b", tr: "Uçtan uca testler (Playwright)", en: "End-to-end tests (Playwright)", status: "proto" },
    { id: "p12c", tr: "Erişilebilirlik ve performans denetimi", en: "Accessibility & performance audit", status: "proto" },
    { id: "p12d", tr: "Vercel’e yayın", en: "Deploy to Vercel", status: "todo" }] }
];

const LIVE_WHEN_AUTH = new Set(['p2a', 'p2e', 'p2f', 'p2b', 'p2c', 'p2g', 'p2h', 'p2d']);
export const statusOf = (item: RoadmapItem, authEnabled: boolean): RoadmapStatus =>
  authEnabled && LIVE_WHEN_AUTH.has(item.id) ? 'done' : item.status;
const score = (s: RoadmapStatus) => (s === 'done' ? 1 : s === 'proto' ? 0.5 : 0);
export function percent(items: RoadmapItem[], authEnabled: boolean): number {
  if (!items.length) return 0;
  return Math.round((items.reduce((t, i) => t + score(statusOf(i, authEnabled)), 0) / items.length) * 100);
}
