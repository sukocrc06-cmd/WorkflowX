# WorkFlowX — Frontend Denetimi (v0.4 → v0.5)

Tarih: 27 Eylül 2026 · Kapsam: `index.html`, `assets/css/*` (8 dosya), `assets/js/*` (46 dosya), `qa/*`, `web/*`, `docs/*`.
Yöntem: her dosya satır satır okundu; uygulama Chromium'da masaüstü (1440) ve mobil (390) genişlikte demo verisiyle gezildi, konsol izlendi; mevcut 36 e2e senaryosu ve 31 birim testi çalıştırıldı.

## A — Çalışan (kodu okundu + tarayıcıda doğrulandı)

Görev CRUD, tamamla / yeniden aç, öncelik, durum, teslim, tahmini süre, etiket, bağımlılık (tek), zamanlayıcı ve elle süre, proje CRUD, proje sekmeleri (genel bakış, görevler, pano, zaman çizelgesi, takvim), pano sürükle-bırak, takvim gün/hafta/ay, etkinlik CRUD, blok/etkinlik sürükleme ve boyutlandırma, şimdiki zaman çizgisi, planlama motoru + "Neden?" + Uygula/Düzenle/İptal, doğal dil planlama isteği, akıllı hızlı ekleme, komut paleti, JSON dışa/içe aktarma (doğrulamalı), .ics içe aktarma (UTC, RRULE, EXDATE), onboarding, tema, TR/EN, iskelet yükleme, hata/404/403 ekranları, bozuk veri kurtarma, demo verisi ekle/temizle, yol haritası.

## B — Kısmen çalışan

| Özellik | Eksik davranış |
|---|---|
| Geri al | Sadece bazı işlemlerde; kapanış (closure) tabanlı, ardışık işlemlerde eski nesnelere dokunabiliyor; yinele yok; durum menüsünden değişiklik geri alınamıyor |
| Bağımlılık | Formda yalnızca **tek** bağımlılık seçilebiliyor |
| Çakışma | Yalnızca uyarı bildirimi; çözüm seçeneği ve takvimde görsel işaret yok |
| Kapasite | "Planlı" yükü kişisel etkinlikleri ve mesai dışını da sayıyor; Bugün / Genel bakış / Takvim farklı hesaplıyor |
| Planlama açıklaması | Atlanan günlerin nedeni ("Çarşamba dolu") söylenmiyor; hafta sonu seçeneği yok |
| Bugün ekranı | Hafta sonu "Kapasite 6 sa" gösteriyor; "Sonra" ve "ne yapmalıyım" listesi yok |
| Bildirimler | Okundu/okunmadı ve kategori yok |
| Arama | Kişiler yok; sonuç yoksa sonraki adım yok |
| Kısayollar | N/P/C/T istenen eşlemeyle uyuşmuyor (P = planla) |
| Analiz | Tahmini saat, boş kapasite, proje tamamlanma, plana uyum yok |
| Mobil pano / takvim | Masaüstü düzeninin küçültülmüşü (yatay kaydırma, boş saat ızgarası) |

## C — Sadece mock / yer tutucu

Giriş/kayıt/şifre sıfırlama (bilinçli sahte), Ekip sayfası (yalnızca "yakında"), proje üyeleri ("Ekip daveti yakında"), "Not · yakında" sekmesi.

## D — Hatalı

| # | Hata | Öncelik |
|---|---|---|
| D1 | Takvimde `[` / `]` → `A.wk is not a function` (konsolda yakalanmamış hata) | **P0** |
| D2 | Kapasite hesabı kişisel etkinlikleri ve mesai dışı etkinlikleri iş yükü sayıyor → yanlış "aşırı yüklü" uyarısı, planlayıcı gereksiz gün atlıyor | **P1** |
| D3 | Hafta sonu Bugün ekranı kapasite gösteriyor, işe yarar bilgi vermiyor | P1 |
| D4 | Hızlı eklemede bilinmeyen `@proje` sessizce yok sayılıyor → kullanıcı görmeden projesiz kayıt | P1 |
| D5 | Geçmiş teslim tarihi hiçbir uyarı olmadan kabul ediliyor | P1 |
| D6 | Board'da / detayda durum menüsü değişikliği geri alınamıyor; tamamlanan tekrar eden görev yok | P2 |
| D7 | `updatedAt` yazılıyor ama şemada yok (kayıtta düşüyor) | P2 |
| D8 | "Acil ve geciken" KPI sayısı ile altındaki liste farklı ölçütte | P2 |

## E — Eksik (MVP için gerekli)

Alt görevler, tekrar eden görevler, şablonlar (görev + proje), yorumlar, aktivite geçmişi, görev atama, başlangıç tarihi, proje arşivleme/geri yükleme, proje sağlık durumu, kilometre taşı listesi, çakışma çözümü (Taşı/Böl/İptal/Yine de), tek kapasite modeli, ekip rolleri ve yetki matrisi, çalışma alanı kavramı, bildirim kategorileri, kaydetme/senkron durumu göstergesi, PWA manifesti, yinele (redo), klavyeyle blok taşıma alternatifi, mobil pano ve mobil takvim akışı, landing'de gerçek kullanıcı senaryosu.

## F — Gelecek faz (mimari hazırlanacak, backend yok)

Gerçek kimlik doğrulama, Supabase/PostgreSQL, organizasyon/ekip/rol yetkilendirmesi (RLS), gerçek bildirim (e-posta/push), @bahsetme, ekip etkinliği, gerçek AI planlayıcı, Google/Microsoft takvim senkronu, Slack/GitHub, faturalama, yönetim paneli, servis worker ile tam çevrimdışı.

## Güvenlik taraması

- `innerHTML` 20 yerde; tamamı şablon çıktısı. Kullanıcı metni geçen her yer `esc()` kullanıyor (regex taraması: kaçışsız `.title/.name/.desc/...` yok).
- Satır içi olay işleyici (`onclick=` vb.) yok; tüm etkileşim `data-a` ile delege.
- URL parametreleri beyaz liste + regex ile doğrulanıyor.
- `localStorage` her yüklemede `sanitizeState` ile yeniden kuruluyor.
- Landing'de doğrulanmamış metrik (kullanıcı sayısı, doğruluk %, verimlilik skoru) yok.

## Performans taraması

- Global dinleyiciler bir kez bağlanıyor (delegasyon); sayfa değişiminde birikme yok.
- Zamanlayıcı yalnızca üst bardaki öğeyi saniyede bir güncelliyor; tam render 60 sn'de bir ve yalnızca zamana duyarlı sayfalarda, form/diyalog/sürükleme sırasında hiç.
- Türetilmiş değerler (`busyItems`, `dayLoad`) durum sürümüne göre önbellekli.
- İyileştirilecek: takvim fare izleyicisi her harekette `closest` çağırıyor (ucuz, kabul edilebilir); kayıt her işlemde tüm durumu yazıyor (küçük veri için sorun değil; backend fazında fark bazlı senkron).

## Öncelik özeti

- **P0:** D1
- **P1:** D2–D5, tek kapasite modeli, çakışma çözümü, Bugün akışı, mobil pano/takvim, görev modelinin eksikleri (alt görev, tekrar, atama, başlangıç, çoklu bağımlılık), arşiv, sağlık durumu, geri al/yinele birleşimi
- **P2:** Şablonlar, yorum/aktivite, ekip rolleri, çalışma alanı, bildirim kategorileri, arama genişletme, kısayol eşlemesi, analiz metrikleri, senkron göstergesi, PWA, landing senaryosu, D6–D8
- **P3:** F listesi

---

## v0.5 sonrası durum

| Bulgu | Durum |
|---|---|
| D1 `[` / `]` konsol hatası | ✅ Düzeltildi (kısayollar tek tablodan yönetiliyor) |
| D2 Kapasite kişisel zamanı iş sayıyordu | ✅ Tek kapasite modeli (`domain/capacity.js`); kişisel zaman slotu kapatır ama kapasite tüketmez |
| D3 Hafta sonu Bugün ekranı | ✅ "Bugün çalışma günün değil" + sıradaki iş günü özeti |
| D4 Bilinmeyen `@proje` sessizce yok sayılıyordu | ✅ Kaydı engeller, önizlemede kırmızı gösterir |
| D5 Geçmiş teslim uyarısız | ✅ İkinci onay ister |
| D6 Durum değişikliği geri alınamıyordu | ✅ Tüm değişiklikler `commit()` ile geri alınabilir + yinele |
| D7 `updatedAt` kayboluyordu | ✅ Şemada |
| D8 KPI ile liste farklı ölçüt | ✅ Tek "Bugün ne yapmalıyım?" sıralaması |
| Test sırasında bulunan: "her cuma 16:00" bugünü seçiyordu | ✅ Tekrar kuralından hesaplanıyor |
| Erişilebilirlik (mobil): arama düğmesi adsız, gün şeridi kontrastı, kaydırılabilir tablo | ✅ axe 0 ihlal (açık/koyu × masaüstü/mobil, tüm ekranlar + diyaloglar) |
| Performans: satır başına O(n²) tahmin katsayısı, her çağrıda yeni `Intl` biçimlendirici | ✅ Önbellek; 500 görev / 1000 etkinlikte tüm sayfalar ≤ 55 ms |

E listesindeki tüm MVP eksikleri bu fazda frontend olarak eklendi. F listesi değişmedi (backend/AI fazı).
