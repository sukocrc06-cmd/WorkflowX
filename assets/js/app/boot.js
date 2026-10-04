/* ================= BOOT =================
   1. apply stored preferences   2. resolve the route
   3. app routes load data asynchronously (skeleton → content | error state) */
function applyTheme(){const th=prefs.get('theme');if(th==='dark'||th==='light')document.documentElement.dataset.theme=th;const ac=prefs.get('accent');document.documentElement.dataset.accent=ACCENTS.some(([k])=>k===ac)?ac:'indigo'}
function showApp(){
  $('#landing').hidden=true;$('#app').classList.add('on');
  if(UI.boot==='idle'){bootApp();return}
  render();
}
async function bootApp(){
  UI.boot='loading';UI.bootError=null;render();
  try{
    const{state,report}=await storage.load();
    setState(state||blank());
    if(AUTH.user&&!state){const nm=authName(AUTH.user);if(nm&&!S.profile.name)S.profile.name=nm}
    if(AUTH.user)await cloudStart();else cloudStop();                // newest data from the account (max 8 s), then show
    UI.boot='ready';
    const n=report?report.fixed+report.dropped:0;
    if(n)setTimeout(()=>toast(t('Kayıtlı verilerde {n} sorun bulundu ve otomatik düzeltildi.',{n})),400);
  }catch(e){console.error('[boot] load failed',e);UI.boot='error';UI.bootError=e.code||'unknown'}
  render();
  if(UI.boot!=='ready')return;
  if(AUTH.user&&offerGuestImport())return;
  if(!S.onboarded)onboard();
}
/* First sign-in on a device that already has account-less data: offer to copy it into the account.
   The device copy is never deleted; the question is asked once per account. */
function offerGuestImport(){
  const uid=AUTH.user.id,k='import.'+uid;if(prefs.get(k))return false;
  let g=null;try{g=sanitizeState(JSON.parse(storage.guestRaw()||'null')).state}catch{g=null}
  if(!g||!(g.tasks.length+g.projects.length+g.events.length)){prefs.set(k,'none');return false}
  const n={t:g.tasks.length,p:g.projects.length,e:g.events.length};
  openDlg(`<form>${dlgHead(t('Bu cihazdaki verileri hesabına ekleyelim mi?'))}<div class="dlg-b">
    <p style="margin-top:0">${t('Hesapsız çalışırken bu cihazda {t} görev, {p} proje ve {e} etkinlik oluşturdun.',n)}</p>
    <ul class="plain-list"><li>${svg('check','i s')} ${t('Hesabına eklenir; takvim blokları, alt görevler ve ayarlar da gelir.')}</li><li>${svg('lock','i s')} ${t('Cihazdaki kopya silinmez.')}</li></ul></div>
    <div class="dlg-f"><button type="button" class="btn" data-a="guestSkip">${t('Boş başla')}</button><button class="btn primary">${svg('upload')}${t('Hesabıma ekle')}</button></div></form>`,()=>{
      const cur=JSON.parse(JSON.stringify(S)),merged=(!cur.tasks.length&&!cur.projects.length)?{...g,profile:{...g.profile,name:g.profile.name||cur.profile.name}}:mergeStates(cur,g);
      setState(merged);S.onboarded=true;save();prefs.set(k,'done');render();
      setTimeout(()=>toast(t('{t} görev ve {p} proje hesabına eklendi.',n)),0);
    });
  return true;
}
/* Periodic refresh keeps "now" lines and relative times honest. It never runs
   while the user is interacting (dialog, palette, drag, or typing in a form). */
function tick(){
  if(!$('#app').classList.contains('on')||UI.boot!=='ready')return;
  if(dlg.open||cmdk.open||DRAG||(typeof CREATE!=='undefined'&&CREATE)||(typeof EVPOP!=='undefined'&&EVPOP)||(typeof TDRAG!=='undefined'&&TDRAG)||UI.calOpts||document.activeElement?.closest?.('#main form'))return;
  if(['overview','today','calendar','task'].includes(UI.view))render();
}
applyTheme();hydrateIcons();
/* PWA: the manifest is linked only over http(s); browsers reject it on file:// with a console error.
   A service worker (offline cache + background sync) is deliberately left for the backend phase. */
if(/^https?:$/.test(location.protocol)){const l=document.createElement('link');l.rel='manifest';l.href='manifest.webmanifest';document.head.appendChild(l)}
const onNet=()=>{netBar();if(SYNC.state==='saved'||SYNC.state==='offline')SYNC.state=navigator.onLine===false?'offline':'saved';syncBadge()};
window.addEventListener('online',onNet);window.addEventListener('offline',onNet);
authInit().then(applyRoute);
setInterval(tick,60e3);
