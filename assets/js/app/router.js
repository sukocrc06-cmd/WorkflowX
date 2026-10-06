/* ================= ROUTER =================
   Hash routes so the prototype works from file:// and any static host.
   The paths mirror the planned Next.js App Router structure 1:1:
     #/                      → /                     (landing)
     #/login /signup /forgot-password                (auth — prototype)
     #/legal/privacy /legal/terms /security /contact (public info)
     #/app                   → /app                  (dashboard)
     #/app/today · tasks · tasks/:id · projects · projects/:id/:tab
     #/app/calendar/:mode?d=YYYY-MM-DD · planning · analytics · team · settings · roadmap
   Every parameter is validated; anything unknown resolves to a not-found view. */
const APP_VIEWS=['today','tasks','projects','calendar','planning','analytics','team','settings','roadmap'];
const PUBLIC_PAGES=['login','signup','forgot-password','reset-password','legal/privacy','legal/terms','security','contact'];
const PROJECT_TABS=['overview','tasks','board','timeline','calendar'];
const CAL_MODES=['day','week','month','agenda'];
const SETTINGS_KEYS=['profile','appearance','work','notifications','shortcuts','templates','data','privacy','developer'];

function parseRoute(hash){
  const raw=String(hash||'').replace(/^#/,'');
  const [pathPart,queryPart='']=raw.split('?');
  const parts=pathPart.split('/').filter(Boolean).map(p=>{try{return decodeURIComponent(p)}catch{return'\u0000'}});
  const q=new URLSearchParams(queryPart);
  if(!parts.length)return{area:'public',page:'landing'};
  if(parts[0]!=='app'){const page=parts.join('/');return{area:'public',page:PUBLIC_PAGES.includes(page)?page:'notfound'}}
  const [,v,a,b]=parts;
  if(!v)return{area:'app',view:'overview'};
  if(v==='admin')return{area:'app',view:'forbidden'};
  if(!APP_VIEWS.includes(v))return{area:'app',view:'notfound'};
  if(v==='tasks'&&a)return RX.id.test(a)&&!b?{area:'app',view:'task',param:a}:{area:'app',view:'notfound'};
  if(v==='projects'&&a){
    if(!RX.id.test(a)||(b&&!PROJECT_TABS.includes(b))||parts.length>4)return{area:'app',view:'notfound'};
    return{area:'app',view:'project',param:a,sub:b||'overview'};
  }
  if(v==='calendar'){
    if(a&&!CAL_MODES.includes(a))return{area:'app',view:'notfound'};
    const d=q.get('d');
    return{area:'app',view:'calendar',sub:a||null,param:d&&RX.day.test(d)&&!isNaN(parseDay(d))?d:null};
  }
  if(v==='analytics'&&a){
    if(a!=='report'||b)return{area:'app',view:'notfound'};
    const w=q.get('w');
    return{area:'app',view:'report',param:w&&RX.day.test(w)&&!isNaN(parseDay(w))?w:null};
  }
  if(v==='settings'&&a)return SETTINGS_KEYS.includes(a)&&!b?{area:'app',view:'settings',sub:a}:{area:'app',view:'notfound'};
  if(a)return{area:'app',view:'notfound'};
  return{area:'app',view:v};
}
function hrefFor(view,param,sub){
  switch(view){
    case 'overview':return'#/app';
    case 'task':return'#/app/tasks/'+encodeURIComponent(param);
    case 'project':return'#/app/projects/'+encodeURIComponent(param)+(sub&&sub!=='overview'?'/'+sub:'');
    case 'calendar':return'#/app/calendar'+(sub?'/'+sub:'')+(param?'?d='+param:'');
    case 'report':return'#/app/analytics/report'+(param?'?w='+param:'');
    case 'landing':return'#/';
    default:return APP_VIEWS.includes(view)?'#/app/'+view:PUBLIC_PAGES.includes(view)?'#/'+view:'#/app';
  }
}
/* Navigate. Rendering happens in the hashchange handler; if the hash does not
   change (same route) we render directly so the call is never a no-op. */
function go(view,param=null,sub=null){
  closeDlg();closePops();$('#more').hidden=true;
  const h=hrefFor(view,param,sub);
  if(location.hash===h||(h==='#/'&&!location.hash))applyRoute();else location.hash=h;
}
function applyRoute(){
  closeDlg();closePops();$('#more').hidden=true;
  const r=parseRoute(location.hash);
  if(!AUTH.ready)return;                                  // authInit() calls applyRoute() when done
  const redir=authGuard(r);if(redir){location.replace(location.pathname+location.search+redir);return}
  if(r.area==='public'){showPublic(r.page);return}
  UI.view=r.view;UI.param=r.param||null;UI.sub=r.sub||null;
  if(r.view==='project')UI.projTab=r.sub;
  if(r.view==='calendar'){UI.miniMonth=null;UI.calOpts=false;UI.calMode=r.sub||(isMobile()?'day':'week');UI.calDate=r.param?parseDay(r.param):sod(new Date())}
  // the dashboard route opens "Today" on phones — it is the better first screen there
  if(r.view==='overview'&&!location.hash.startsWith('#/app/')&&isMobile()&&!UI._mobileRedirected){UI._mobileRedirected=true;history.replaceState(null,'','#/app/today');UI.view='today'}
  showApp();
}
const isMobile=()=>matchMedia('(max-width:860px)').matches;
window.addEventListener('hashchange',applyRoute);
