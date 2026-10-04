/* ================= SUPABASE AYARLARI =================
   Supabase projeni bağlamak için iki değeri doldur (rehber: docs/AUTH_SUPABASE.md):
     Supabase Dashboard → Project Settings → API
       - Project URL          → url       (ör. https://abcdefgh.supabase.co)
       - Publishable key (sb_publishable_…) ya da eski "anon" key → anonKey (herkese açıktır; veriyi RLS korur)
   ASLA "Secret key" (sb_secret_…) ya da "service_role" anahtarını buraya yazma.
   Boş bırakılırsa uygulama hesapsız (yalnızca bu cihazda) çalışmaya devam eder. */
window.WFX_SUPABASE = window.WFX_SUPABASE || {
  url: 'https://hkgsjcftnldnzqyyphsk.supabase.co',
  anonKey: '',        // ← Publishable key (sb_publishable_...) buraya
  google: true          // Google ile giriş butonunu göster (Supabase'de Google sağlayıcısı açık olmalı)
};
