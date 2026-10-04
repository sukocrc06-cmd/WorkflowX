/* ================= PUBLIC SITE =================
   Landing, auth prototypes and info pages. Rendered into #landing; the app
   area (#app) is hidden while a public route is active. */
function showPublic(page){
  $('#app').classList.remove('on');$('#landing').hidden=false;closeDlg();
  const pages={landing:renderLanding,login:()=>renderAuth('login'),signup:()=>renderAuth('signup'),'forgot-password':()=>renderAuth('forgot'),'reset-password':()=>renderAuth('reset'),
    'legal/privacy':()=>renderInfo('privacy'),'legal/terms':()=>renderInfo('terms'),security:()=>renderInfo('security'),contact:()=>renderInfo('contact'),notfound:renderPublic404};
  (pages[page]||renderPublic404)();
  document.documentElement.lang=LANG;window.scrollTo(0,0);
}
/* Mini visuals for the feature cards (decorative, token-coloured inline SVG). */
const FEAT_ART=[
 '<svg viewBox="0 0 240 96"><rect class="b" x="16" y="14" width="96" height="26" rx="7"/><rect class="a" x="24" y="23" width="8" height="8" rx="2"/><rect class="s" x="38" y="24" width="56" height="6" rx="3"/><path class="as" d="M112 27c24 0 20 34 44 34" stroke-width="1.6" stroke-dasharray="3 3"/><g class="mv"><rect class="al" x="156" y="46" width="34" height="30" rx="6"/><rect class="al" x="196" y="46" width="30" height="20" rx="6"/></g><rect class="b" x="148" y="14" width="84" height="20" rx="6"/><rect class="s" x="156" y="21" width="40" height="6" rx="3"/></svg>',
 '<svg viewBox="0 0 240 96"><rect class="b" x="24" y="16" width="192" height="64" rx="10"/><rect class="al" x="38" y="30" width="70" height="14" rx="4"/><rect class="s" x="38" y="52" width="110" height="6" rx="3"/><rect class="s" x="38" y="64" width="80" height="6" rx="3"/><g class="mv"><rect class="a" x="152" y="28" width="52" height="18" rx="6"/></g><path d="M170 37l4 4 8-8" stroke="#fff" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round"/></svg>',
 '<svg viewBox="0 0 240 96"><circle class="b" cx="70" cy="50" r="30"/><path class="as" d="M70 50V30" stroke-width="3" stroke-linecap="round"/><circle class="a" cx="70" cy="50" r="4"/><path class="ln" d="M62 16h16M70 16v4" stroke-width="2"/><g class="mv"><rect class="s" x="124" y="30" width="90" height="10" rx="5"/><rect class="a" x="124" y="30" width="62" height="10" rx="5"/><rect class="s" x="124" y="52" width="90" height="10" rx="5"/><rect class="al" x="124" y="52" width="80" height="10" rx="5"/></g></svg>',
 '<svg viewBox="0 0 240 96"><rect class="b" x="22" y="20" width="70" height="58" rx="8"/><path class="ln" d="M22 34h70" stroke-width="1.5"/><rect class="s" x="32" y="42" width="16" height="10" rx="2"/><rect class="al" x="52" y="42" width="16" height="10" rx="2"/><rect class="s" x="32" y="58" width="16" height="10" rx="2"/><path class="as mv" d="M104 49h36m-8-8 8 8-8 8" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/><rect class="b" x="152" y="20" width="70" height="58" rx="8"/><rect class="a" x="162" y="32" width="50" height="10" rx="3"/><rect class="al" x="162" y="48" width="36" height="10" rx="3"/><rect class="s" x="162" y="64" width="44" height="6" rx="3"/></svg>',
 '<svg viewBox="0 0 240 96"><g class="mv"><rect class="s" x="34" y="34" width="22" height="46" rx="5"/><rect class="al" x="66" y="24" width="22" height="56" rx="5"/><rect class="d" x="98" y="12" width="22" height="68" rx="5" opacity=".85"/><rect class="s" x="130" y="40" width="22" height="40" rx="5"/><rect class="al" x="162" y="30" width="22" height="50" rx="5"/></g><path class="ln" d="M24 28h176" stroke-width="1.5" stroke-dasharray="4 4"/></svg>',
 '<svg viewBox="0 0 240 96"><rect class="b" x="40" y="22" width="160" height="52" rx="12"/><rect class="s" x="54" y="36" width="70" height="8" rx="4"/><rect class="s" x="54" y="52" width="46" height="8" rx="4"/><g class="mv"><rect class="b" x="140" y="34" width="22" height="22" rx="5"/><rect class="b" x="166" y="34" width="22" height="22" rx="5"/></g><text x="151" y="49" font-size="10" text-anchor="middle" font-family="monospace" fill="currentColor">⌘</text><text x="177" y="49" font-size="10" text-anchor="middle" font-family="monospace" fill="currentColor">K</text></svg>'
];
const brand=()=>`<a class="logo" href="#/" aria-label="WorkFlowX — ${t('Ana sayfa')}"><span class="logo-mark" aria-hidden="true">W</span><span>WorkFlow<b>X</b></span></a>`;
const publicNav=()=>`<header class="l-nav">${brand()}<nav class="row" aria-label="${t('Site')}">${langSwitch()}<a class="btn ghost hide-sm" href="#/login">${t('Giriş yap')}</a><a class="btn primary" href="#/app">${t('Uygulamayı aç')}</a></nav></header>`;
const publicFooter=()=>`<footer class="l-foot"><div class="l-foot-brand">${brand()}<p>${t('İşi planla. Zamanı ayır. Projeyi bitir.')}</p></div>
  <nav class="l-foot-links" aria-label="${t('Alt bilgi')}"><div><b>${t('Ürün')}</b><a href="#/app">${t('Uygulama')}</a><a href="#/signup">${t('Kayıt ol')}</a><a href="#/login">${t('Giriş yap')}</a></div>
  <div><b>${t('Şirket')}</b><a href="#/security">${t('Güvenlik')}</a><a href="#/contact">${t('İletişim')}</a></div>
  <div><b>${t('Yasal')}</b><a href="#/legal/privacy">${t('Gizlilik')}</a><a href="#/legal/terms">${t('Kullanım koşulları')}</a></div></nav>
  <div class="l-foot-bottom"><span>© 2026 WorkFlowX</span><span>${t('MVP prototipi')} · v0.4</span></div></footer>`;

function renderLanding(){
  const d=[1,2,3,4,5].map(i=>dayName(i,true));let k=0;
  const cells=a=>a.map(v=>v===1?`<span class="on" style="--d:${k++}"></span>`:v===2?'<span class="busy"></span>':'<span></span>').join('');
  const hl=w=>`<em class="hl">${w}<svg viewBox="0 0 200 12" preserveAspectRatio="none" aria-hidden="true"><path d="M3 9 C 55 3, 125 2, 197 6"/></svg></em>`;
  const tools=['Takvim','Görev listesi','Notlar','Tablolar','Mesajlar','Dosyalar'];
  $('#landing').innerHTML=`${publicNav()}<main id="public-main">
  <section class="hero"><div><span class="eyebrow">${t('Görev · Proje · Takvim · Planlama')}</span>
      <h1>${t('İşinizi {x} dönüştürün.',{x:hl(t('plana'))})}</h1>
      <p class="lead">${t('Görevlerinizi, projelerinizi, teslim tarihlerinizi ve çalışma zamanınızı tek bir çalışma alanında yönetin.')}</p>
      <div class="ctas"><a class="btn primary lg" href="#/app">${t('Hemen başlayın')}${svg('arrow','i arr')}</a><button type="button" class="btn lg" data-a="scrollHow">${t('Nasıl çalışır?')}</button></div>
      <p class="hero-note">${t('Kayıt gerekmez · Verileriniz yalnızca bu cihazda kalır')}</p></div>
    <div class="hero-visual" aria-hidden="true">
      <div class="hv-top"><b>${t('Bu hafta')}</b><span>${t('Önerilen plan')} · 13 ${t('sa')}</span></div>
      <div class="hv-head"><div>${t('Görev')}</div><div>${d.map(x=>`<span>${x}</span>`).join('')}</div></div>
      <div class="hv-row"><div class="hv-task">${t('Müşteri sunumu')}<small>3 ${t('sa')} · ${dayName(5,true)} 17:00</small></div><div class="hv-days">${cells([1,1,1,0,0])}</div></div>
      <div class="hv-row"><div class="hv-task">Frontend<small>6 ${t('sa')} · ${dayName(4,true)}</small></div><div class="hv-days">${cells([1,0,1,1,0])}</div></div>
      <div class="hv-row"><div class="hv-task">${t('Test ve yayın')}<small>4 ${t('sa')} · ${dayName(5,true)}</small></div><div class="hv-days">${cells([0,0,0,1,1])}</div></div>
      <div class="hv-row"><div class="hv-task">${t('Toplantılar')}<small>${t('takvimden')}</small></div><div class="hv-days">${cells([2,2,0,2,0])}</div></div>
      <div class="hv-float f1"><span class="ic">${svg('check')}</span>${t('Plan önerisi hazır')} · ${t('onayını bekliyor')}</div>
      <div class="hv-float f2">${ring(.72,'')}<span><b>%72</b> ${t('kapasite')}</span></div>
      <div class="hv-float f3"><span class="avatars"><span class="av-sm av-g0">AY</span><span class="av-sm av-g4">MK</span><span class="av-sm av-g2">SE</span></span></div>
      <span class="hv-cursor"><svg viewBox="0 0 24 24"><path d="M4 3l7 17 2.5-7.5L21 10z"/></svg></span>
    </div></section>

  <section class="l-sec problem" aria-labelledby="h-problem"><div class="l-sec-text rv"><span class="kicker">${t('Sorun')}</span><h2 id="h-problem">${t('İşler farklı araçlara dağılır.')}</h2>
      <ul class="l-points"><li>${t('Toplantılar bir takvimde, görevler başka bir listede.')}</li><li>${t('Bir işin ne kadar süreceği hiçbir yerde yazmaz.')}</li><li>${t('Teslim riski ancak son gün fark edilir.')}</li></ul></div>
    <div class="scatter rv" style="--r:1" aria-hidden="true">${tools.map((x,i)=>`<span style="--x:${[8,58,22,70,40,4][i]}%;--y:${[8,4,44,40,78,70][i]}%;--rot:${[-6,4,-2,7,-4,3][i]}deg">${t(x)}</span>`).join('')}</div></section>

  <section class="l-sec solution" aria-labelledby="h-solution"><div class="flow rv" aria-hidden="true">
      <div class="flow-node"><small>${t('Görev')}</small><b>${t('Müşteri sunumu')}</b><span>3 ${t('sa')} · ${PR('high')}</span></div><i class="flow-arrow"></i>
      <div class="flow-node accent"><small>${t('Odak bloğu')}</small><b>${dayName(2,true)} 10:00–11:00</b><span>${t('takvimde')}</span></div><i class="flow-arrow"></i>
      <div class="flow-node"><small>${t('Teslim')}</small><b>${dayName(5,true)} 17:00</b><span>${t('zamanında')} ✓</span></div></div>
    <div class="l-sec-text rv" style="--r:1"><span class="kicker">${t('Çözüm')}</span><h2 id="h-solution">${t('WorkFlowX işleri ve zamanı birleştirir.')}</h2>
      <p>${t('Her görevin bir süresi, her sürenin takvimde bir yeri olur. Böylece “ne yapmalıyım?” ile “ne zaman yapmalıyım?” aynı ekranda cevaplanır.')}</p></div></section>

  <section class="scenario" aria-labelledby="h-scen"><div class="l-center rv"><span class="kicker">${t('Gerçek bir hafta')}</span><h2 id="h-scen">${t('8 saatlik iş, 6 saatlik boşluk. Sonra ne olur?')}</h2>
      <p class="lead-sm">${t('Çoğu araç işi listeler. WorkFlowX işin takvimine sığıp sığmadığını söyler ve seçeneği sana bırakır.')}</p></div>
    <ol class="scen-steps">
      <li class="scen rv"><span class="scen-n">1</span><h3>${t('8 saatlik bir iş var.')}</h3><div class="scen-card"><b>${t('Web sitesi revizyonu')}</b><small>8 ${t('sa')} · ${t('Teslim')} ${dayName(5,true)} 17:00 · ${PR('high')}</small></div></li>
      <li class="scen rv" style="--r:1"><span class="scen-n">2</span><h3>${t('Takvimde 6 saat boş.')}</h3><div class="scen-week" aria-hidden="true">${[[4.5,1.5],[5,1],[4,2],[6,0],[4.5,1.5]].map(([b,f],i)=>`<div><span class="sw-bar"><i class="busy" style="height:${b/6*100}%"></i><i class="free" style="height:${f/6*100}%"></i></span><small>${dayName(i+1,true)}</small></div>`).join('')}</div><p class="scen-cap">${t('Toplantılar ve diğer işler düşülünce bu hafta {h} boş kapasite kalıyor.',{h:'6 '+t('sa')})}</p></li>
      <li class="scen rv" style="--r:2"><span class="scen-n">3</span><h3>${t('WorkFlowX işi mevcut kapasiteye göre dağıtır.')}</h3><ul class="scen-plan"><li><span>${dayName(1,true)} 14:00–15:30</span><b>1,5 ${t('sa')}</b></li><li><span>${dayName(2,true)} 10:00–11:00</span><b>1 ${t('sa')}</b></li><li><span>${dayName(3,true)} 09:00–11:00</span><b>2 ${t('sa')}</b></li><li><span>${dayName(5,true)} 13:00–14:30</span><b>1,5 ${t('sa')}</b></li><li class="short">${svg('alert','i s')} ${t('2 saat sığmıyor: teslimi uzat, kapasiteyi artır ya da işi böl.')}</li></ul></li>
      <li class="scen rv" style="--r:3"><span class="scen-n">4</span><h3>${t('Planı sen onaylarsın.')}</h3><div class="scen-card"><span class="scen-why">${t('Neden Çarşamba 09:00? Salı’da yalnızca 1 saat boş vardı; Çarşamba sabahı ilk uygun boşluk.')}</span><div class="scen-btns"><span class="btn primary sm">${t('Planı uygula')}</span><span class="btn sm">${t('Düzenle')}</span></div></div></li>
    </ol>
    <div class="l-center rv"><a class="btn primary lg" href="#/app">${t('Kendi haftanla dene')}${svg('arrow','i arr')}</a></div></section>

  <section class="l-sec-steps" id="how" aria-labelledby="h-how"><div class="l-center rv"><span class="kicker">${t('Nasıl çalışır')}</span><h2 id="h-how">${t('Dört adımda plan')}</h2></div>
    <ol class="steps">
      ${[['01','Görevi tanımlayın','Başlık, süre, öncelik ve teslim tarihi. Tek satırda da yazabilirsiniz.'],['02','Zamanı ayırın','Akıllı planlama işinizi toplantılarınızın arasındaki gerçek boşluklara yerleştirir ve nedenini açıklar.'],['03','Projeyi tamamlayın','İlerlemeyi, iş yükünü ve teslim riskini tek panelde görün.'],['04','AI ile optimize edin','Yapay zekâ asistanı planınızı yorumlayıp iyileştirecek. Siz onaylamadan hiçbir şey değişmez.']].map(([n,h,p],i)=>`<li class="step rv" style="--r:${i}"><div class="n">${n}</div><h3>${t(h)}${i===3?` <span class="soon">${t('Yakında')}</span>`:''}</h3><p>${t(p)}</p></li>`).join('')}
    </ol></section>

  <section class="feat" aria-label="${t('Özellikler')}">
    ${[['cal','Görev + takvim birlikte','Bir görev tek kalır, çalışma süresi birden çok zaman bloğuna dağılır.'],['spark','Açıklanabilir, onaylı plan','Her öneri “neden bu saat?” sorusunu cevaplar. Takvimin asla sessizce değişmez.'],['clock','Gerçek süreyi öğrenir','Zamanlayıcıyla harcadığın süreyi kaydet; tahmin hatanı gör ve planlamaya yansıt.'],['upload','Takvimini getir','Google veya Outlook takviminden .ics dosyası ile toplantılarını içe aktar.'],['chart','Gerçek iş yükü','Günlük kapasiteyi aşan günleri ve yetişmeyebilecek teslimleri önceden gör.'],['keyboard','Klavyeyle uçar','Ctrl K ile her şeye ulaş, takvimde sürükle-bırak ile planı elle ince ayarla.']].map(([i,h,p],n)=>`<div class="rv" style="--r:${n%3}"><span class="f-art" aria-hidden="true">${FEAT_ART[n]||''}</span><div class="ic">${svg(i)}</div><h3>${t(h)}</h3><p>${t(p)}</p></div>`).join('')}
  </section>

  <section class="trust rv" aria-labelledby="h-trust"><h2 id="h-trust">${t('Güven ilk günden tasarımın parçası')}</h2><div class="trust-grid">
    ${[['lock','Verileriniz sizde','Bu sürümde veriler yalnızca tarayıcınızda saklanır; sunucuya gönderilmez.'],['check','Onaysız değişiklik yok','Planlama önerileri siz onaylamadan takvime yazılmaz.'],['spark','Dürüst akıllı planlama','Bugün kurallara dayalı çalışır; yapay zekâ geldiğinde bunu açıkça göreceksiniz.']].map(([i,h,p])=>`<div>${svg(i)}<h3>${t(h)}</h3><p>${t(p)}</p></div>`).join('')}</div></section>

  <section class="l-cta rv"><h2>${t('İşi planla. Zamanı ayır. Projeyi bitir.')}</h2><p>${t('Kayıt gerekmez. Bu sürüm tarayıcınızda çalışan bir MVP prototipidir.')}</p><a class="btn primary lg" href="#/app">${t('WorkFlowX’i açın')}${svg('arrow','i arr')}</a></section>
  </main>${publicFooter()}`;
  document.title='WorkFlowX — '+t('İşinizi plana dönüştürün.').replace(/\.$/,'');
  setupReveal();
}
function setupReveal(){const els=document.querySelectorAll('#landing .rv');if(!('IntersectionObserver' in window)||RM()){els.forEach(e=>e.classList.add('in'));return}const io=new IntersectionObserver(es=>es.forEach(en=>{if(en.isIntersecting){en.target.classList.add('in');io.unobserve(en.target)}}),{threshold:.12});els.forEach(e=>io.observe(e))}

/* ---------- Auth pages: /login /signup /forgot-password /reset-password ----------
   Supabase mode → real accounts. Local mode (not configured) → the pages explain it and the
   app stays usable on this device without an account. Inputs are cleared right after submit. */
const AUTH_PAGES={
  login:{h:'Tekrar hoş geldin',p:'Çalışma alanına giriş yap.',btn:'Giriş yap',google:true,fields:[['email','E-posta','email','username'],['password','Şifre','password','current-password']],foot:['Hesabın yok mu?','Kayıt ol','#/signup']},
  signup:{h:'Hesap oluştur',p:'Birkaç saniyede çalışma alanını kur.',btn:'Hesap oluştur',google:true,fields:[['name','Ad soyad','text','name'],['email','E-posta','email','email'],['password','Şifre','password','new-password']],terms:true,meter:true,foot:['Zaten hesabın var mı?','Giriş yap','#/login']},
  forgot:{h:'Şifreni sıfırla',p:'E-posta adresini yaz; sıfırlama bağlantısı gönderelim.',btn:'Bağlantı gönder',fields:[['email','E-posta','email','email']],foot:['Şifreni hatırladın mı?','Giriş yap','#/login']},
  reset:{h:'Yeni şifre belirle',p:'Hesabın için yeni bir şifre seç.',btn:'Şifreyi kaydet',fields:[['password','Yeni şifre','password','new-password'],['password2','Yeni şifre (tekrar)','password','new-password']],meter:true,foot:['Vazgeç','Giriş sayfasına dön','#/login']}
};
const GOOGLE_G='<svg class="gg" viewBox="0 0 24 24" aria-hidden="true"><path fill="#4285F4" d="M22.6 12.3c0-.8-.1-1.5-.2-2.3H12v4.3h6a5.1 5.1 0 0 1-2.2 3.4v2.8h3.6c2.1-2 3.2-4.9 3.2-8.2z"/><path fill="#34A853" d="M12 23c3 0 5.5-1 7.3-2.7l-3.6-2.8c-1 .7-2.2 1.1-3.7 1.1-2.9 0-5.3-1.9-6.2-4.5H2.1v2.9A11 11 0 0 0 12 23z"/><path fill="#FBBC05" d="M5.8 14.1a6.6 6.6 0 0 1 0-4.2V7H2.1a11 11 0 0 0 0 10z"/><path fill="#EA4335" d="M12 5.4c1.6 0 3.1.6 4.2 1.7l3.2-3.2A11 11 0 0 0 2.1 7l3.7 2.9C6.7 7.3 9.1 5.4 12 5.4z"/></svg>';
function authCallout(){
  if(authOn()){
    if(AUTH.error)return`<div class="callout warn" role="alert">${svg('alert','i s')} ${t('Giriş servisine şu an ulaşılamıyor. Bağlantını kontrol edip sayfayı yenile.')}</div>`;
    return canRedirect()?'':`<div class="callout" role="note">${svg('alert','i s')} ${t('Uygulamayı dosyadan açtın. E-posta ve şifreyle giriş burada çalışır. Google ile giriş için “Google ile devam et”e bas; WorkflowX-Baslat açıksa oradan devam eder, değilse klasördeki “WorkflowX-Baslat” dosyasına çift tıkla.')}</div>`;
  }
  return`<div class="callout" role="note">${svg('lock','i s')} ${t('Hesap sistemi henüz bağlanmadı. Supabase ayarları yapılınca gerçek hesaplar açılır (docs/AUTH_SUPABASE.md). Şimdilik bu cihazda hesapsız çalışabilirsin.')}</div>`;
}
function renderAuth(kind,state){
  const c=AUTH_PAGES[kind];
  if(kind==='reset'&&authOn()&&!AUTH.user){
    $('#landing').innerHTML=`<div class="auth-wrap"><div class="auth-top">${brand()}${langSwitch()}</div><main id="public-main" class="auth-card"><div class="auth-done">${illo('search')}<h1>${t('Bağlantı geçersiz')}</h1><p class="auth-sub">${t('Şifre sıfırlama bağlantısının süresi dolmuş ya da daha önce kullanılmış olabilir.')}</p><a class="btn primary lg auth-wide" href="#/forgot-password">${t('Yeni bağlantı iste')}</a></div></main></div>`;
    document.title=t(c.h)+' · WorkFlowX';return;
  }
  if(state&&state.done){
    const D={confirm:[t('E-postanı kontrol et'),t('{e} adresine bir doğrulama bağlantısı gönderdik. Bağlantıya tıkladığında hesabın açılır.',{e:`<b>${esc(state.email)}</b>`})],sent:[t('Bağlantı gönderildi'),t('{e} adresine kayıtlı bir hesap varsa birkaç dakika içinde şifre sıfırlama bağlantısı gelecek.',{e:`<b>${esc(state.email)}</b>`})]}[state.done];
    $('#landing').innerHTML=`<div class="auth-wrap"><div class="auth-top">${brand()}${langSwitch()}</div><main id="public-main" class="auth-card"><div class="auth-done">${illo('inbox')}<h1>${D[0]}</h1><p class="auth-sub">${D[1]}</p>
      <p class="hint">${t('Gelmediyse spam klasörüne bak.')}</p>${state.done==='confirm'?`<button type="button" class="btn auth-wide" data-a="authResend" data-e="${esc(state.email)}">${t('Bağlantıyı tekrar gönder')}</button>`:''}
      <p class="auth-foot"><a href="#/login">${t('Giriş sayfasına dön')}</a></p></div></main></div>`;
    document.title=D[0]+' · WorkFlowX';return;
  }
  const live=authOn()&&!AUTH.error,google=live&&c.google&&AUTH_CFG.google;
  $('#landing').innerHTML=`<div class="auth-wrap"><div class="auth-top">${brand()}${langSwitch()}</div><main id="public-main" class="auth-card">
    <h1>${t(c.h)}</h1><p class="auth-sub">${t(c.p)}</p>${authCallout()}
    ${google?`<button type="button" class="btn lg auth-wide btn-google" data-a="authGoogle">${GOOGLE_G}${t('Google ile devam et')}</button><div class="auth-or"><span>${t('veya')}</span></div>`:''}
    <form data-f="auth" data-kind="${kind}" novalidate>
      ${c.fields.map(([n,l,type,ac])=>`<div class="f"><label for="au-${n}">${t(l)}</label>${type==='password'?`<div class="pw-wrap"><input id="au-${n}" name="${n}" type="password" autocomplete="${ac}" minlength="8" maxlength="72" required aria-describedby="au-${n}-e${c.meter&&n==='password'?' au-meter':''}"><button type="button" class="pw-eye" data-a="pwEye" data-for="au-${n}" aria-label="${t('Şifreyi göster')}" aria-pressed="false">${svg('eye')}</button></div>`:`<input id="au-${n}" name="${n}" type="${type}" autocomplete="${ac}" ${type==='email'?'inputmode="email" autocapitalize="off" spellcheck="false" maxlength="254"':'maxlength="120"'} required aria-describedby="au-${n}-e">`}<span class="field-err" id="au-${n}-e"></span>${c.meter&&n==='password'?`<div class="pw-meter" id="au-meter" aria-live="polite"><i></i><i></i><i></i><i></i><span>${t('En az 8 karakter, harf ve rakam')}</span></div>`:''}</div>`).join('')}
      ${c.terms?`<label class="check-row"><input type="checkbox" name="terms" required aria-describedby="au-terms-e"> <span>${t('{a} ve {b} metinlerini okudum.',{a:`<a href="#/legal/terms">${t('Kullanım koşulları')}</a>`,b:`<a href="#/legal/privacy">${t('Gizlilik')}</a>`})}</span></label><span class="field-err" id="au-terms-e"></span>`:''}
      ${kind==='login'?`<div class="auth-alt"><a href="#/forgot-password">${t('Şifremi unuttum')}</a></div>`:''}
      <div class="err" role="alert" id="au-err"></div>
      <button class="btn primary lg auth-wide">${t(c.btn)}</button>
    </form>
    <p class="auth-foot">${t(c.foot[0])} <a href="${c.foot[2]}">${t(c.foot[1])}</a></p>
    ${live?'':`<p class="auth-foot"><a href="#/app">${t('Hesapsız devam et')} →</a></p>`}
  </main></div>`;
  document.title=t(c.h)+' · WorkFlowX';
  const pre=new URLSearchParams(location.hash.split('?')[1]||'').get('email');if(pre&&EMAIL_RX.test(pre)){const e=$('#au-email');if(e)e.value=pre}
}
function submitAuth(f){
  const kind=f.dataset.kind,fd=new FormData(f);let ok=true;
  const err=(n,m)=>{const e=$('#au-'+n+'-e');if(e)e.textContent=m;const i=f.elements[n];if(i)i.setAttribute('aria-invalid',m?'true':'false');if(m){ok=false}};
  const top=m=>{const e=$('#au-err');if(e){e.textContent=m||'';if(m){e.classList.remove('shake');void e.offsetWidth;e.classList.add('shake')}}};
  top('');
  const email=String(fd.get('email')||'').trim().toLowerCase(),pw=String(fd.get('password')||''),name=String(fd.get('name')||'').trim().slice(0,120);
  if(f.elements.email)err('email',EMAIL_RX.test(email)&&email.length<=254?'':t('Geçerli bir e-posta adresi gir.'));
  if(f.elements.name)err('name',name?'':t('Adını yaz.'));
  if(f.elements.password)err('password',kind==='login'?(pw?'':t('Şifreni yaz.')):pwProblem(pw));
  if(f.elements.password2)err('password2',String(fd.get('password2')||'')===pw?'':t('Şifreler aynı değil.'));
  if(f.elements.terms)err('terms',f.elements.terms.checked?'':t('Devam etmek için onaylaman gerekiyor.'));
  if(!ok){f.querySelector('[aria-invalid="true"]')?.focus();return}
  const btn=f.querySelector('button.primary');
  const clearPw=()=>{['password','password2'].forEach(n=>{if(f.elements[n])f.elements[n].value=''})};   // passwords never linger in the DOM
  if(!authOn()){f.reset();withLoading(btn,async()=>{await sleep(400);
    if(kind==='forgot'){toast(t('Hesap sistemi bağlı değil; e-posta gönderilmedi.'));return}
    toast(t('Hesap sistemi bağlı değil; bu cihazda hesapsız devam ediyorsun.'));go('overview')});return}
  if(AUTH.error){top(t('Giriş servisine şu an ulaşılamıyor. Bağlantını kontrol edip sayfayı yenile.'));return}
  withLoading(btn,async()=>{
    let r;
    if(kind==='login'){r=await authSignIn(email,pw);clearPw();if(r.ok){location.hash=safeNext();toast(t('Hoş geldin'));return}
      top(r.msg);if(r.unconfirmed){const b=document.createElement('button');b.type='button';b.className='linkbtn';b.dataset.a='authResend';b.dataset.e=email;b.textContent=' '+t('Doğrulama e-postasını tekrar gönder');$('#au-err').appendChild(b)}return}
    if(kind==='signup'){r=await authSignUp(name,email,pw);clearPw();if(!r.ok){top(r.msg);return}
      if(r.confirm){renderAuth('signup',{done:'confirm',email});return}location.hash='#/app';toast(t('Hesabın oluşturuldu. Hoş geldin!'));return}
    if(kind==='forgot'){r=await authReset(email);if(!r.ok){top(r.msg);return}renderAuth('forgot',{done:'sent',email});return}
    if(kind==='reset'){r=await authUpdatePassword(pw);clearPw();if(!r.ok){top(r.msg);return}location.hash='#/app';toast(t('Şifren güncellendi.'));return}
  });
}
/* live password strength (shown only on sign-up / reset) */
document.addEventListener('input',e=>{const i=e.target;if(i.id!=='au-password'||!$('#au-meter'))return;const s=i.value?(pwProblem(i.value)?Math.min(1,pwStrength(i.value)):pwStrength(i.value)):0,m=$('#au-meter');m.dataset.s=s;
  m.querySelector('span').textContent=!i.value?t('En az 8 karakter, harf ve rakam'):pwProblem(i.value)||[t('Zayıf'),t('Zayıf'),t('Orta'),t('İyi'),t('Güçlü')][s]});

/* ---------- Info pages (placeholders until legal copy is ready) ---------- */
function renderInfo(kind){
  const C={
    privacy:['Gizlilik','Bu prototip hiçbir kişisel veriyi sunucuya göndermez. Görevler, projeler ve takvim kayıtları yalnızca tarayıcınızın yerel depolamasında tutulur ve istediğiniz an Ayarlar’dan silinebilir.','Yayından önce bu sayfa KVKK ve GDPR uyumlu tam gizlilik politikasıyla değiştirilecek.'],
    terms:['Kullanım koşulları','WorkFlowX şu an bir MVP prototipidir ve “olduğu gibi” sunulur. Verilerinizi düzenli olarak JSON yedeği alarak korumanızı öneririz.','Yayından önce bu sayfa hukuki olarak incelenmiş kullanım koşullarıyla değiştirilecek.'],
    security:['Güvenlik','Bu sürümde veriler cihazınızdan çıkmaz. İçe aktarılan her dosya doğrulanır ve kullanıcı girdileri ekrana yazılmadan önce güvenli hale getirilir.','Backend fazında: satır düzeyi güvenlik (RLS), şifreli bağlantı, rol tabanlı yetkilendirme ve düzenli güvenlik testleri.'],
    contact:['İletişim','Geri bildiriminiz ürünü şekillendiriyor. İletişim formu backend fazında etkinleşecek.','O zamana kadar geri bildirimlerinizi proje ekibine doğrudan iletebilirsiniz.']
  }[kind];
  $('#landing').innerHTML=`${publicNav()}<main id="public-main" class="info-page"><a class="btn ghost sm" href="#/">${svg('left')}${t('Ana sayfa')}</a><h1>${t(C[0])}</h1><p class="lead">${t(C[1])}</p><div class="callout" role="note">${t(C[2])}</div></main>${publicFooter()}`;
  document.title=t(C[0])+' · WorkFlowX';
}
function renderPublic404(){
  $('#landing').innerHTML=`${publicNav()}<main id="public-main" class="info-page"><div class="state"><span class="state-ic">${svg('search')}</span><h1>${t('Sayfa bulunamadı')}</h1><p>${t('Aradığın sayfa taşınmış ya da hiç var olmamış olabilir. Adresi kontrol et veya genel bakışa dön.')}</p><div class="row" style="justify-content:center"><a class="btn primary" href="#/">${t('Ana sayfa')}</a><a class="btn" href="#/app">${t('Uygulamayı aç')}</a></div></div></main>${publicFooter()}`;
  document.title=t('Sayfa bulunamadı')+' · WorkFlowX';
}
