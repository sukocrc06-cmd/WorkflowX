/* ================= ROADMAP (development progress) =================
   done = works in index.html and is tested · proto = partly (single-user / on-device only) · todo = not started */
const ROADMAP=[
 {n:0,v:'MVP',tr:'Depo inceleme ve mimari',en:'Repository & architecture',items:[
  ['p0a','Ürün vizyonu ve MVP kapsamı','Product vision & MVP scope','done'],['p0b','Teknoloji seçimi (HTML/JS + Supabase)','Tech stack decision (HTML/JS + Supabase)','done'],['p0c','Veritabanı şeması + RLS taslağı','Database schema + RLS draft','done'],['p0d','Klasör yapısı ve ARCHITECTURE.md','Folder structure & ARCHITECTURE.md','done']]},
 {n:1,v:'MVP',tr:'Uygulama kabuğu ve tasarım sistemi',en:'App shell & design system',items:[
  ['p1a','Renk / tipografi token’ları, koyu tema','Color / type tokens, dark mode','done'],['p1b','Kenar çubuğu, üst bar, mobil menü','Sidebar, top bar, mobile nav','done'],['p1c','Tanıtım sayfası','Landing page','done'],['p1d','Bileşen kütüphanesi','Component library','done'],['p1e','Hareket sistemi (geçişler, mikro etkileşimler)','Motion system (transitions, micro-interactions)','done'],['p1f','Komut paleti ve klavye kısayolları','Command palette & keyboard shortcuts','done'],['p1g','Özel boş durum çizimleri','Custom empty-state illustrations','done']]},
 {n:2,v:'MVP',tr:'Kimlik doğrulama',en:'Authentication',items:[
  ['p2a','Kayıt / giriş / çıkış (Supabase Auth)','Sign up / in / out (Supabase Auth)','done'],['p2e','Google ile giriş (OAuth)','Sign in with Google (OAuth)','done'],['p2f','E-posta doğrulama ve tekrar gönderme','Email verification & resend','done'],['p2b','Şifre sıfırlama (PKCE bağlantısı)','Password reset (PKCE link)','done'],['p2c','Korumalı rotalar ve oturum yönetimi','Protected routes & session handling','done'],['p2g','Cihazdaki verileri hesaba aktarma','Import device data into the account','done'],['p2h','Hesap ayarları: şifre değiştir, tüm cihazlardan çık','Account settings: change password, sign out everywhere','done'],['p2d','Profil ve başlangıç akışı','Profile & onboarding flow','done'],['p2i','profiles tablosu + RLS (SQL betiği)','profiles table + RLS (SQL script)','done'],['p2j','Bulut senkronu: her cihazda aynı veriler','Cloud sync: the same data on every device','done']]},
 {n:3,v:'MVP',tr:'Ana panel',en:'Dashboard',items:[
  ['p3a','KPI’lar ve bugün akışı','KPIs and today agenda','done'],['p3b','Kural tabanlı içgörüler','Rule-based insights','done'],['p3c','Anlamlı boş durumlar','Meaningful empty states','done'],['p3d','Mobil “Bugün” ekranı','Mobile “Today” screen','done']]},
 {n:4,v:'MVP',tr:'Görevler',en:'Tasks',items:[
  ['p4a','Görev CRUD','Task CRUD','done'],['p4b','Öncelik, durum, etiket, bağımlılık','Priority, status, tags, dependencies','done'],['p4c','Gerçekleşen süre takibi','Actual time tracking','done'],['p4d','Görev atama (ekip)','Task assignment (team)','proto'],['p4e','Satır içi akıllı hızlı ekleme','Inline smart quick add','done'],['p4f','Alt görev, tekrar eden görev, şablon','Subtasks, recurring tasks, templates','done'],['p4g','Yorumlar ve aktivite geçmişi','Comments & activity history','done']]},
 {n:5,v:'MVP',tr:'Projeler',en:'Projects',items:[
  ['p5a','Proje CRUD','Project CRUD','done'],['p5b','Pano ve liste görünümü','Board and list views','done'],['p5c','Süre ağırlıklı ilerleme','Duration-weighted progress','done'],['p5d','Zaman çizelgesi görünümü','Timeline view','done'],['p5e','Pano sürükle-bırak','Board drag & drop','done'],['p5f','Arşiv, sağlık durumu, kilometre taşları','Archive, health status, milestones','done']]},
 {n:6,v:'MVP',tr:'Takvim',en:'Calendar',items:[
  ['p6a','Haftalık görünüm','Week view','done'],['p6b','Gün ve ay görünümü','Day and month views','done'],['p6c','Etkinlik CRUD + çakışma uyarısı','Event CRUD + conflict warning','done'],['p6d','.ics içe aktarma','.ics import','done'],['p6e','Takvimde sürükle-bırak taşıma ve boyutlandırma','Calendar drag to move & resize','done'],['p6f','Çakışma motoru (Taşı / Böl / İptal / Yine de)','Conflict engine (Move / Split / Cancel / Anyway)','done']]},
 {n:7,v:'MVP',tr:'Görev → takvim planlama',en:'Task → calendar scheduling',items:[
  ['p7a','Deterministik planlama motoru','Deterministic scheduling engine','done'],['p7b','Açıklanabilir öneriler','Explainable suggestions','done'],['p7c','Onay akışı (Uygula / Düzenle / İptal)','Approval flow (Apply / Edit / Cancel)','done'],['p7d','Motor için birim testleri','Engine unit tests','done']]},
 {n:8,v:'V2',tr:'AI planlama temeli',en:'AI planning foundation',items:[
  ['p8a','AIService / PlanningService soyutlaması','AIService / PlanningService abstraction','done'],['p8b','Yapılandırılmış çıktı + Zod doğrulama','Structured output + Zod validation','todo'],['p8c','Doğal dil istek (şimdilik kural tabanlı)','Natural-language request (rule-based for now)','done'],['p8d','AI kullanım kayıtları ve hız limiti','AI usage logs & rate limiting','todo']]},
 {n:9,v:'V2',tr:'Ekip',en:'Team collaboration',items:[
  ['p9a','Organizasyon ve roller','Organizations & roles','proto'],['p9b','Kişisel / organizasyon veri ayrımı (şema)','Personal vs organization data (schema)','proto'],['p9c','Davet akışı','Invitation flow','todo'],['p9d','Ekip iş yükü görünümü','Team workload view','proto']]},
 {n:10,v:'V2',tr:'Analiz ve iş yükü',en:'Analytics & workload',items:[
  ['p10a','Proje bazlı iş dağılımı','Work per project','done'],['p10b','7 günlük yük / kapasite','7-day load vs capacity','done'],['p10c','Tahmin doğruluğu','Estimate accuracy','done'],['p10d','Haftalık rapor','Weekly report','todo']]},
 {n:11,v:'V3',tr:'Ayarlar ve entegrasyonlar',en:'Settings & integrations',items:[
  ['p11a','Çalışma saatleri ve kapasite','Working hours & capacity','done'],['p11b','TR / EN dil desteği','TR / EN language support','done'],['p11c','Google Takvim API senkronu','Google Calendar API sync','todo'],['p11d','Outlook, Slack, GitHub, Jira, Notion','Outlook, Slack, GitHub, Jira, Notion','todo']]},
 {n:12,v:'MVP',now:true,tr:'QA, güvenlik ve yayın',en:'QA, security & launch',items:[
  ['p12a','RLS / yetkilendirme testleri','RLS / authorization tests','todo'],['p12b','Uçtan uca testler (Playwright)','End-to-end tests (Playwright)','done'],['p12c','Erişilebilirlik ve performans denetimi','Accessibility & performance audit','done'],['p12d','Yayına alma (web adresi)','Deploy (public web address)','todo']]}
];
const RM_DEF=Object.fromEntries(ROADMAP.flatMap(p=>p.items).map(i=>[i[0],i[3]]));
/* (Kept for saved overrides; every Faz 2 item is done now.) */
const RM_LIVE=[];
const rmState=id=>S.roadmap[id]||(RM_LIVE.includes(id)&&typeof authOn==='function'&&authOn()&&!AUTH.error?'done':RM_DEF[id]);
const rmScore=s=>s==='done'?1:s==='proto'?0.5:0;
const rmPct=items=>Math.round(items.reduce((s,i)=>s+rmScore(rmState(i[0])),0)/items.length*100);

