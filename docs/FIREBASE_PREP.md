> **Güncelleme (v0.8, Faz 2):** Backend kararı yeniden **Supabase** oldu. Bu belge yalnızca tarihsel kayıttır; güncel kurulum için `AUTH_SUPABASE.md`'ye bakın. Varlık ayrımı ve kalıcılık adaptörü ilkeleri Supabase için de geçerlidir.

# WorkFlowX — Firebase Fazına Hazırlık

> Bu belge yalnızca plandır. Bu fazda Firebase Authentication, Firestore, Storage, Cloud Functions veya Security Rules **kurulmadı**; hiçbir SDK eklenmedi.
> Not: Önceki belgelerde (`schema.sql`, `MIGRATION.md` §4–6) Supabase hedefleniyordu. Backend hedefi artık **Firebase**'dir; `schema.sql` yalnızca veri modelinin referansı olarak kalır.

## 1. Katmanlar (bugün → Firebase)

```
UI (views/, ui/)                       değişmez
  ↓ yalnızca A.* eylemleri
Domain / Actions (domain/, app/actions)
  commit(label, fn) → S değişir → save()   değişmez
  ↓
Persistence (core/storage.js)
  bugün:  storage.adapter = LocalAdapter   (localStorage, tek JSON)
  sonra:  storage.adapter = FirestoreAdapter (varlık başına koleksiyon, toplu yazma)
```

UI hiçbir yerde `localStorage`'a doğrudan dokunmaz; kalıcılığa yalnızca `storage` ve kayıt durumuna yalnızca `setSync()` üzerinden erişilir. Adaptör değişince ekranlar değişmez.

### Adaptörün uyması gereken sözleşme
| Yöntem | Bugün | Firestore'da |
|---|---|---|
| `load()` → `{state, report}` | JSON okur, `sanitizeState` | Kullanıcının aktif çalışma alanındaki koleksiyonları okur, aynı `sanitizeState`'ten geçirir |
| `save(state)` | tüm JSON'u yazar | Son kayıttan bu yana değişen belgeleri `writeBatch` ile yazar (fark `commit` geçmişinden çıkarılabilir) |
| `setSync(state)` | saving / saved / offline / error | + syncing / synced / failed (bekleyen yazma, onay, hata) |

## 2. Varlıklar → koleksiyonlar (öneri)

| Varlık | Arayüzde | Firestore yolu | Not |
|---|---|---|---|
| User | Profil (ad, rol, saat dilimi), onboarding | `users/{uid}` | Auth kullanıcısı; tercihler (tema, dil) burada veya cihazda |
| Workspace | Çalışma alanı seçici, `S.workspace` | `workspaces/{wid}` | Bugün yalnızca kişisel; şirket/ekip alanları hazır görünüyor |
| Membership / Role | Ekip ekranı, `can()` | `workspaces/{wid}/members/{uid}` | Roller: owner, admin, manager, member, viewer |
| Project | Projeler | `workspaces/{wid}/projects/{pid}` | `archived`, `status`, tarihler |
| Task | Görevler | `workspaces/{wid}/tasks/{tid}` | Alt görevler belge içinde dizi; yorumlar alt koleksiyon |
| Comment | Görev detayı | `…/tasks/{tid}/comments/{cid}` | Yazar = uid |
| Event | Takvim | `workspaces/{wid}/events/{eid}` | ICS kaynağı + uid ile tekrar içe aktarma koruması |
| Schedule Block | Takvim + görev detayı | `workspaces/{wid}/blocks/{bid}` | taskId referansı; görev silinince sunucuda da temizlenmeli |
| Notification | Bildirim merkezi | Bugün türetilmiş; okunma: `users/{uid}/notifRead/{key}` | Atama / bahsetme bildirimleri sunucuda üretilecek |
| Activity | Görev/proje aktivitesi | `workspaces/{wid}/activity/{aid}` | Yalnızca ekleme; en fazla N kayıt istemcide gösterilir |
| Template | Şablonlar | `workspaces/{wid}/templates/{id}` | Hazır şablonlar istemcide sabit |

Kimlikler bugün de `^[A-Za-z0-9_-]{1,64}$` biçiminde, Firestore belge kimliği olarak doğrudan kullanılabilir.

## 3. Zaman
- Bugün: teslim, etkinlik ve bloklar yerel duvar saati (`2026-10-05T14:00`), zaman kayıtları ISO UTC.
- Firestore'da: `Timestamp` + kullanıcının `tz` alanı. Dönüşüm yalnızca adaptörde yapılır; ekranlar yine yerel duvar saati görür.
- Gün sınırları takvim tabanlı (`dayEnd`), yaz saati günleri test edildi (America/New_York, 1 Kasım 2026).

## 4. Kimlik doğrulama
- `/login`, `/signup`, `/forgot-password` rotaları ve formları mevcut (sahte). Firebase Auth gelince yalnızca `submitAuth()` gövdesi değişir.
- Korumalı rotalar: `#/app/*` açılmadan önce `bootApp()` içinde oturum kontrolü eklenecek; yükleme iskeleti ve hata ekranı hazır.
- İlk girişte yerel veri varsa: "Bu cihazdaki verileri hesabına aktar" (bugünkü içe aktarma birleştirme mantığı yeniden kullanılır).

## 5. Erişim modeli (kural yazılmadı, yalnızca ilke)
- Bir kullanıcı yalnızca üyesi olduğu çalışma alanının belgelerini okuyabilir.
- Yazma yetkisi `can(role, action)` tablosuyla aynıdır; istemci kontrolü kullanıcı deneyimi içindir, asıl uygulama sunucu kurallarında olacaktır.
- İstemciden gelen her belge bugün olduğu gibi doğrulanır (`sanitizeState` kuralları sunucu tarafına da taşınmalı).

## 6. Çevrimdışı
- Firestore çevrimdışı önbelleği açılacak; `navigator.onLine` + bekleyen yazmalar → `offline` / `syncing` / `synced` göstergesi (bileşen hazır, Ayarlar → Geliştirici'den önizlenebilir).
- Çakışma: son yazan kazanır; blok/etkinlik çakışmaları zaten istemcide gösterilip çözülüyor.
