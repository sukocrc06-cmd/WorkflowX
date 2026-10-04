/* ================= STATE =================
   Product state (S): the user's data — persisted through `storage`.
   UI state (UI): what is on screen — never persisted (except via the URL). */
const DEFAULT_NOTIFY={deadline:true,project:true,conflict:true,suggestion:true};
const blank=()=>({workspace:{id:'personal',kind:'personal',name:''},profile:{name:'',role:'',tz:''},
  settings:{workStart:9,workEnd:18,maxDaily:6,workDays:[1,2,3,4,5],useFactor:false,notify:{...DEFAULT_NOTIFY}},
  projects:[],tasks:[],events:[],blocks:[],members:[],templates:[],activity:[],notifRead:{},timer:null,roadmap:{},onboarded:false});
let S=blank();
const UI={
  view:'overview',param:null,sub:null,         // current route (see router.js)
  taskFilter:'open',projTab:'overview',
  calMode:'week',calDate:sod(new Date()),      // calendar cursor
  draft:null,draftOpts:{},                     // unapplied planning suggestion (+ options such as weekend)
  projArchived:false,boardCol:'todo',calList:true,notifTab:'all',
  boot:'idle',bootError:null                   // idle | loading | ready | error
};

/* Memoisation: derived values are cached per state version. Any save() or render()
   bumps the version, so caches can never serve stale data across an update. */
let STATE_V=0;const MEMO=new Map();
const bump=()=>{STATE_V++;MEMO.clear()};
const memo=(key,fn)=>{if(MEMO.has(key))return MEMO.get(key);const v=fn();MEMO.set(key,v);return v};

function setState(next){S=next;bump()}
/* Save status, shown in the top bar. Saved on this device first; with an account,
   core/sync.js then uploads and drives 'saving' / 'syncing' / 'synced' / 'failed'. */
const SYNC={state:'saved',at:null};
function save(){
  bump();
  const ok=storage.save(S);
  SYNC.state=ok?(navigator.onLine===false?'offline':'saved'):'error';if(ok&&typeof cloudChanged==='function')cloudChanged();SYNC.at=new Date();SYNC.flash=ok;clearTimeout(SYNC.ft);SYNC.ft=setTimeout(()=>{SYNC.flash=false;if(typeof syncBadge==='function')syncBadge()},900);
  if(typeof syncBadge==='function')syncBadge();
  if(!ok)toast(t('Değişiklikler kaydedilemedi. Tarayıcı depolaması dolu ya da kapalı olabilir.'),{label:t('Tekrar dene'),fn:save});
}

const projectOf=id=>S.projects.find(p=>p.id===id);
const taskOf=id=>S.tasks.find(x=>x.id===id);
const openTasks=()=>S.tasks.filter(x=>x.status!=='done');
/* "Mine" = unassigned or assigned to me. Only my work fills my calendar. */
const mine=x=>!x.assignee||x.assignee==='me';
const myOpen=()=>openTasks().filter(mine);
/* Indexed per state version: pages call these once per row, so a scan per call would be O(n²). */
const blocksOf=id=>(memo('bByTask',()=>{const m=new Map();S.blocks.forEach(b=>{const a=m.get(b.taskId);if(a)a.push(b);else m.set(b.taskId,[b])});return m}).get(id)||[]).slice();
const scheduledH=x=>blocksOf(x.id).reduce((s,b)=>s+(new Date(b.end)-new Date(b.start))/HOUR,0);
const actualH=x=>(x.logs||[]).reduce((s,l)=>s+(new Date(l.end)-new Date(l.start))/HOUR,0)+(S.timer&&S.timer.taskId===x.id?timerRunMs()/HOUR:0);
/* Personal estimate accuracy: actual / estimated over completed tasks that have time logs. */
function estStats(){return memo('est',estStatsRaw)}
function estStatsRaw(){const xs=S.tasks.filter(x=>x.status==='done'&&+x.estimate>0&&actualH(x)>=0.1);const e=xs.reduce((s,x)=>s+ +x.estimate,0),a=xs.reduce((s,x)=>s+actualH(x),0);return{n:xs.length,factor:e?Math.round(a/e*100)/100:1,ok:xs.length>=3,list:xs}}
const factorNow=()=>{if(!S.settings.useFactor)return 1;const st=estStats();return st.ok?Math.min(3,Math.max(0.5,st.factor)):1};
const effEst=x=>(+x.estimate||0)*factorNow();
const remainingH=x=>Math.max(0,Math.round((effEst(x)-scheduledH(x))*2)/2);
function projProgress(p){const ts=S.tasks.filter(x=>x.projectId===p.id);if(!ts.length)return{pct:0,done:0,total:0};const w=x=>(+x.estimate||1);const tot=ts.reduce((s,x)=>s+w(x),0);const dn=ts.filter(x=>x.status==='done').reduce((s,x)=>s+w(x),0);return{pct:Math.round(dn/tot*100),done:ts.filter(x=>x.status==='done').length,total:ts.length}}
const isLate=x=>x.due&&x.status!=='done'&&new Date(x.due)<new Date();
const sortTasks=a=>[...a].sort((x,y)=>(PRIO_W[y.priority]-PRIO_W[x.priority])||((x.due?new Date(x.due):Infinity)-(y.due?new Date(y.due):Infinity)));

/* busy items = events + blocks (+ draft blocks), labelled for plan explanations.
   Milestones are points in time, not busy time. */
function busyItems(extra=[]){
  const build=()=>[...S.events.filter(e=>e.type!=='milestone').map(e=>({a:+new Date(e.start),b:+new Date(e.end),label:e.title})),...S.blocks.map(b=>({a:+new Date(b.start),b:+new Date(b.end),label:taskOf(b.taskId)?.title||''}))];
  const base=memo('busy',build);
  if(!extra.length)return memo('busySorted',()=>[...base].sort((p,q)=>p.a-q.a));
  return[...base,...extra.map(b=>({a:+new Date(b.start),b:+new Date(b.end),label:taskOf(b.taskId)?.title||''}))].sort((p,q)=>p.a-q.a);
}
/* dayLoad / capacity live in domain/capacity.js */
