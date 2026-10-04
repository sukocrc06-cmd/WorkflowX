/* ================= AUTH (Faz 2 · Supabase Auth) =================
   One small service the rest of the app talks to. Two modes:
   - 'supabase' : config/supabase.config.js has a project URL + anon key → real accounts
                  (email + password, Google OAuth, password reset, email verification),
                  /app routes require a session, each account gets its own data space.
   - 'local'    : not configured → the app keeps working on this device without an account
                  (exactly the previous behaviour); the auth pages explain how to connect.
   The SDK (MIT, vendored in assets/vendor) is loaded only in 'supabase' mode.
   Security notes: the anon key is public by design (RLS protects data); passwords never touch
   our storage or the DOM after submit; errors are mapped to plain messages that never reveal
   whether an email exists; PKCE flow keeps tokens out of the URL. */
const SUPABASE_SDK='assets/vendor/supabase-js-2.117.2.umd.js';
const AUTH_CFG=(()=>{
  const c=(typeof window!=='undefined'&&window.WFX_SUPABASE)||{};
  const url=String(c.url||'').trim().replace(/\/+$/,''),key=String(c.anonKey||'').trim();
  const okUrl=/^https:\/\/[a-z0-9-]+\.supabase\.(co|in)$/i.test(url)||/^https?:\/\/(localhost|127\.0\.0\.1)(:\d{2,5})?$/i.test(url);
  const okKey=/^[A-Za-z0-9._-]{20,}$/.test(key);
  return okUrl&&okKey?{url,key,google:c.google!==false}:null;
})();
const AUTH={mode:AUTH_CFG?'supabase':'local',client:null,user:null,ready:false,error:null,recovery:false,_uid:undefined};
const authOn=()=>AUTH.mode==='supabase';
const canRedirect=()=>/^https?:$/.test(location.protocol);           // OAuth + email links need a web address
/* Local launcher (WorkflowX-Baslat.bat → tools/serve.js) serves the app at this fixed address. */
const LAUNCH_URL='http://localhost:5500/index.html';
/* Opened from a file? If the launcher is running, Google sign-in continues there.
   A 1×1 image only the launcher serves tells us it is up (works from file:// without CORS). */
function launcherUp(ms=1500){return new Promise(res=>{const i=new Image();const tm=setTimeout(()=>{i.onload=i.onerror=null;res(false)},ms);i.onload=()=>{clearTimeout(tm);res(true)};i.onerror=()=>{clearTimeout(tm);res(false)};i.src=LAUNCH_URL.replace('index.html','__wfx.gif?')+Date.now()})}
const LAUNCH_HINT='Google ile giriş için WorkflowX klasöründeki “WorkflowX-Baslat” dosyasına çift tıkla. Uygulama tarayıcıda açılır ve Google ile giriş çalışır.';
const authRedirect=next=>location.origin+location.pathname+(next?'?next='+encodeURIComponent(next):'');
const authName=u=>{if(!u)return'';const m=u.user_metadata||{};return String(m.full_name||m.name||'').trim().slice(0,120)};
const authProvider=u=>u?(u.app_metadata&&u.app_metadata.provider)||'email':'';

function loadScript(src,ms=12000){return new Promise((res,rej)=>{const s=document.createElement('script');s.src=src;s.async=true;const tm=setTimeout(()=>{s.remove();rej(new Error('timeout'))},ms);s.onload=()=>{clearTimeout(tm);res()};s.onerror=()=>{clearTimeout(tm);rej(new Error('load'))};document.head.appendChild(s)})}

/* Friendly, non-enumerating error text for every Supabase auth error we can meet. */
function authError(e){
  const m=String(e&&(e.message||e.error_description||e)||''),code=String(e&&(e.code||'')),st=e&&e.status;
  if(e instanceof TypeError||/fetch|network|Failed to/i.test(m))return t('Bağlantı kurulamadı. İnternet bağlantını kontrol edip tekrar dene.');
  if(st===429||/rate limit|too many/i.test(m)||code==='over_request_rate_limit'||code==='over_email_send_rate_limit')return t('Çok fazla deneme yapıldı. Birkaç dakika sonra tekrar dene.');
  if(/invalid login|invalid_credentials/i.test(m+code))return t('E-posta veya şifre hatalı.');
  if(/email not confirmed|email_not_confirmed/i.test(m+code))return t('Önce e-posta adresini doğrulaman gerekiyor. Gelen kutunu kontrol et.');
  if(/already registered|user_already_exists/i.test(m+code))return t('Bu e-posta ile bir hesap zaten var. Giriş yapmayı dene.');
  if(/weak|password should|weak_password/i.test(m+code))return t('Şifre çok zayıf. En az 8 karakter; harf ve rakam kullan.');
  if(/same_password|should be different/i.test(m+code))return t('Yeni şifre eskisinden farklı olmalı.');
  if(/expired|invalid.*(link|token|code)|otp_expired|flow_state/i.test(m+code))return t('Bağlantının süresi dolmuş ya da geçersiz. Yeni bir bağlantı iste.');
  if(/provider is not enabled|unsupported provider/i.test(m))return t('Bu giriş yöntemi Supabase projesinde henüz açılmamış.');
  if(/signup.*disabled|signups not allowed/i.test(m))return t('Yeni kayıtlar şu an kapalı.');
  console.warn('[auth]',e);return t('İşlem tamamlanamadı. Lütfen tekrar dene.');
}

/* Start-up: load SDK, restore the session, finish OAuth / email-link redirects (?code=…). */
async function authInit(){
  if(!authOn()){AUTH.ready=true;applyAccount(null,true);return}
  try{
    if(!window.supabase||!window.supabase.createClient)await loadScript(SUPABASE_SDK);
    AUTH.client=window.supabase.createClient(AUTH_CFG.url,AUTH_CFG.key,{auth:{flowType:'pkce',persistSession:true,autoRefreshToken:true,detectSessionInUrl:true,storageKey:'workflowx.auth'}});
    const q=new URLSearchParams(location.search),next=q.get('next'),err=q.get('error_description');
    const {data,error}=await AUTH.client.auth.getSession();if(error)throw error;
    AUTH.user=data.session?data.session.user:null;
    if(q.has('code')||err||next){                                   // clean the redirect URL, then land on the right page
      const target=err?'#/login':next==='reset'?'#/reset-password':location.hash&&location.hash!=='#/'?location.hash:'#/app';
      if(next==='reset'&&AUTH.user)AUTH.recovery=true;
      history.replaceState(null,'',location.pathname+target);
      if(err)setTimeout(()=>toast(authError({message:err})),300);
    }
    AUTH.client.auth.onAuthStateChange((ev,session)=>{
      const u=session?session.user:null;
      if(ev==='PASSWORD_RECOVERY'){AUTH.recovery=true;AUTH.user=u;setTimeout(()=>go('reset-password'),0);return}
      if(ev==='TOKEN_REFRESHED'||ev==='USER_UPDATED'){AUTH.user=u;if($('#app').classList.contains('on'))renderShell();return}
      if(ev==='SIGNED_OUT'){const was=AUTH.user;AUTH.user=null;AUTH.recovery=false;applyAccount(null);if(was&&!AUTH._leaving)toast(t('Oturumun kapandı. Devam etmek için tekrar giriş yap.'));AUTH._leaving=false;if(parseRoute(location.hash).area==='app')go('login');else if(parseRoute(location.hash).area==='public')applyRoute();return}
      if(ev==='SIGNED_IN'||ev==='INITIAL_SESSION'){AUTH.user=u;applyAccount(u)}
    });
    applyAccount(AUTH.user,true);
    /* Arrived from the file version's Google button: start Google sign-in right away (once). */
    if(canRedirect()&&location.hash==='#/login?go=google'){history.replaceState(null,'',location.pathname+'#/login');if(!AUTH.user)setTimeout(()=>authGoogle().then(r=>{if(!r.ok)toast(r.msg)}),0)}
  }catch(e){console.error('[auth] init',e);AUTH.error=e&&e.message==='timeout'||/load/.test(e&&e.message)?'sdk':'session'}
  AUTH.ready=true;
}

/* Each account has its own data space on this device, mirrored to the cloud by core/sync.js.
   Switching account clears what is in memory so one person's data is never shown to the next. */
function applyAccount(u,initial){
  const uid=u?u.id:null;if(!initial&&uid===AUTH._uid)return;
  const changed=AUTH._uid!==undefined&&AUTH._uid!==uid;AUTH._uid=uid;
  storage.scope=uid&&RX.id.test(uid)?uid:null;
  if(changed){
    if(typeof cloudStop==='function')cloudStop();
    if(typeof resetHistory==='function')resetHistory();
    setState(blank());UI.draft=null;UI.boot='idle';UI._last=null;
    if(typeof closeDlg==='function')closeDlg();
    if($('#app').classList.contains('on')&&uid)bootApp();
  }
}

/* Guard for /app routes. Returns a hash to redirect to, or null when access is allowed. */
function authGuard(r){
  if(!authOn())return null;
  if(r.area==='app'&&!AUTH.user)return'#/login?next='+encodeURIComponent(location.hash.replace(/^#/,''));
  if(r.area==='public'&&AUTH.user&&['login','signup'].includes(r.page))return safeNext();
  return null;
}
function safeNext(){
  const q=new URLSearchParams((location.hash.split('?')[1])||''),n=q.get('next');
  if(n&&/^\/app(\/[A-Za-z0-9_\-/.]*)?(\?[A-Za-z0-9=&_\-]*)?$/.test(n)&&parseRoute('#'+n).area==='app')return'#'+n;
  return'#/app';
}

/* ---------- Actions (each returns {ok, msg?, confirm?}) ---------- */
async function authSignIn(email,password){
  try{const {data,error}=await AUTH.client.auth.signInWithPassword({email,password});if(error)throw error;AUTH.user=data.user;applyAccount(data.user);return{ok:true}}
  catch(e){return{ok:false,msg:authError(e),unconfirmed:/not confirmed/i.test(String(e&&e.message))}}
}
async function authSignUp(name,email,password){
  try{const {data,error}=await AUTH.client.auth.signUp({email,password,options:{data:{full_name:name},...(canRedirect()?{emailRedirectTo:authRedirect()}:{})}});if(error)throw error;
    if(data.session){AUTH.user=data.user;applyAccount(data.user);return{ok:true}}
    return{ok:true,confirm:true}}
  catch(e){return{ok:false,msg:authError(e)}}
}
async function authGoogle(){
  if(!canRedirect()){
    if(await launcherUp()){location.href=LAUNCH_URL+'#/login?go=google';return{ok:true}}   // continue on the launcher address
    return{ok:false,msg:t(LAUNCH_HINT)};
  }
  try{const {error}=await AUTH.client.auth.signInWithOAuth({provider:'google',options:{redirectTo:authRedirect()}});if(error)throw error;return{ok:true}}
  catch(e){return{ok:false,msg:authError(e)}}
}
async function authReset(email){
  if(!canRedirect())return{ok:false,msg:t('Şifre sıfırlama bağlantısı için WorkflowX klasöründeki “WorkflowX-Baslat” dosyasına çift tıklayıp oradan dene.')};
  try{const {error}=await AUTH.client.auth.resetPasswordForEmail(email,{redirectTo:authRedirect('reset')});if(error&&error.status===429)throw error;return{ok:true}}   // same answer whether or not the email exists
  catch(e){return{ok:false,msg:authError(e)}}
}
async function authResend(email){
  try{const {error}=await AUTH.client.auth.resend({type:'signup',email,...(canRedirect()?{options:{emailRedirectTo:authRedirect()}}:{})});if(error)throw error;return{ok:true}}
  catch(e){return{ok:false,msg:authError(e)}}
}
async function authUpdatePassword(password){
  try{const {data,error}=await AUTH.client.auth.updateUser({password});if(error)throw error;AUTH.user=data.user;AUTH.recovery=false;return{ok:true}}
  catch(e){return{ok:false,msg:authError(e)}}
}
async function authSignOut(everywhere){
  AUTH._leaving=true;
  if(typeof cloudFlush==='function')await cloudFlush();              // send pending changes first
  try{await AUTH.client.auth.signOut({scope:everywhere?'global':'local'})}catch(e){console.warn('[auth] sign-out',e)}
  AUTH.user=null;AUTH.recovery=false;applyAccount(null);go('login');toast(everywhere?t('Tüm cihazlardan çıkış yapıldı.'):t('Çıkış yapıldı.'));
}
/* Password rules shared by sign-up and reset: ≥ 8 chars, a letter and a digit. */
function pwProblem(p){p=String(p||'');if(p.length<8)return t('Şifre en az 8 karakter olmalı.');if(p.length>72)return t('Şifre en fazla 72 karakter olabilir.');if(!/[A-Za-zÇĞİÖŞÜçğıöşü]/.test(p)||!/\d/.test(p))return t('Şifrede en az bir harf ve bir rakam olmalı.');return''}
function pwStrength(p){p=String(p||'');let s=0;if(p.length>=8)s++;if(p.length>=12)s++;if(/[a-zçğıöşü]/.test(p)&&/[A-ZÇĞİÖŞÜ]/.test(p))s++;if(/\d/.test(p))s++;if(/[^A-Za-z0-9ÇĞİÖŞÜçğıöşü]/.test(p))s++;return Math.min(4,s)}
