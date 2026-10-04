/* ================= CLOUD SYNC (Supabase) =================
   When an account is signed in, the product state is also kept in Supabase
   (table public.user_data: one row per user, RLS = owner only). The browser copy stays
   as an offline cache, so the app opens instantly and keeps working without internet.

   How it stays consistent across devices:
   - every row has a revision number (rev). A device writes only "if rev is still what I last saw";
     otherwise someone else wrote first → it downloads, merges, and tries again.
   - merge is three-way, per item (task, project, event …), against the last synced copy (base):
     changed on one side → that side wins; changed on both → this device wins;
     deleted on one side and untouched on the other → stays deleted.
   - remote data is untrusted: it always goes through sanitizeState() before use.
   Nothing here runs in local mode (no Supabase config) or without a signed-in user. */
const CLOUD_TABLE='user_data';
const CLOUD_COLLS=['projects','tasks','events','blocks','members','templates','activity'];
const CLOUD={uid:null,rev:0,dirty:false,gen:0,busy:false,again:false,timer:null,retry:null,status:'idle',at:null,missing:false};

const cloudOn=()=>authOn()&&!!AUTH.client&&!!AUTH.user&&!CLOUD.missing;
const cloudMetaKey=()=>'sync.'+CLOUD.uid;
const cloudBaseKey=()=>storage.key+'.base';
const cloudHas=s=>!!s&&(s.tasks.length+s.projects.length+s.events.length+s.templates.length+s.members.length)>0;
const cloudJ=x=>x===undefined?'':JSON.stringify(x);

function cloudLoadMeta(){
  let m={};try{m=JSON.parse(prefs.get(cloudMetaKey())||'{}')||{}}catch{m={}}
  CLOUD.rev=Number.isInteger(m.rev)&&m.rev>0?m.rev:0;CLOUD.dirty=m.dirty===true;
  if(!('rev' in m))CLOUD.dirty=cloudHas(S);           // first sync on this device: local work must reach the cloud
}
function cloudSaveMeta(){if(CLOUD.uid)prefs.set(cloudMetaKey(),JSON.stringify({rev:CLOUD.rev,dirty:CLOUD.dirty}))}
function cloudBase(){try{const r=storage.adapter.read(cloudBaseKey());return r?sanitizeState(JSON.parse(r)).state:null}catch{return null}}
function cloudSetBase(st){try{storage.adapter.write(cloudBaseKey(),JSON.stringify(st))}catch{/* quota: merge falls back to "keep both" */}}

/* Three-way merge of the product state. Returns a sanitized state. */
function cloudMerge(base,loc,rem){
  loc=sanitizeState(JSON.parse(JSON.stringify(loc))).state;           // same normal form as base/remote, so equal means unchanged
  const out=JSON.parse(JSON.stringify(rem));
  for(const k of CLOUD_COLLS){
    const B=new Map(((base&&base[k])||[]).map(x=>[x.id,cloudJ(x)])),L=new Map(loc[k].map(x=>[x.id,x])),R=new Set(rem[k].map(x=>x.id)),res=[];
    for(const r of rem[k]){
      const l=L.get(r.id),b=B.get(r.id);
      if(l)res.push(b!==undefined&&cloudJ(l)===b?r:l);              // only remote changed → remote; otherwise this device
      else if(b===undefined||cloudJ(r)!==b)res.push(r);              // new on remote, or deleted here but edited there
    }
    for(const l of loc[k])if(!R.has(l.id)){const b=B.get(l.id);if(b===undefined||cloudJ(l)!==b)res.push(l)}
    out[k]=res;
  }
  for(const k of Object.keys(loc))if(!CLOUD_COLLS.includes(k)&&k!=='schema'&&cloudJ(loc[k])!==cloudJ(base&&base[k]))out[k]=loc[k];
  return sanitizeState(out).state;
}

/* Is the person in the middle of something? Then a download waits, so nothing they type is lost. */
function cloudUIBusy(){
  if(!$('#app').classList.contains('on'))return false;
  return !!((typeof dlg!=='undefined'&&dlg.open)||(typeof cmdk!=='undefined'&&cmdk.open)||(typeof DRAG!=='undefined'&&DRAG)||(typeof CREATE!=='undefined'&&CREATE)||(typeof TDRAG!=='undefined'&&TDRAG)||document.activeElement?.closest?.('#main form'));
}
function cloudApply(st){
  setState(st);storage.save(S);
  if(typeof resetHistory==='function')resetHistory();
  if(UI.boot==='ready'&&$('#app').classList.contains('on'))render();
}
function cloudBadge(st){CLOUD.status=st;if(st==='synced')CLOUD.at=new Date();if(typeof setSync==='function')setSync(st)}

async function cloudRemoteRev(){
  const {data,error}=await AUTH.client.from(CLOUD_TABLE).select('rev').eq('user_id',CLOUD.uid).maybeSingle();
  if(error)throw error;return data?data.rev:0;
}
async function cloudDownload(){
  const {data,error}=await AUTH.client.from(CLOUD_TABLE).select('data,rev').eq('user_id',CLOUD.uid).maybeSingle();
  if(error)throw error;if(!data)return null;
  return{rev:data.rev,state:sanitizeState(data.data&&typeof data.data==='object'&&!Array.isArray(data.data)?data.data:{}).state};
}
/* Upload when the cloud still has the revision we last saw. Returns false on a write race. */
async function cloudUpload(){
  const gen=CLOUD.gen,snap=JSON.parse(JSON.stringify({...S,schema:SCHEMA_VERSION})),q=AUTH.client.from(CLOUD_TABLE);
  const res=CLOUD.rev===0
    ?await q.insert({user_id:CLOUD.uid,data:snap,rev:1}).select('rev').maybeSingle()
    :await q.update({data:snap,rev:CLOUD.rev+1}).eq('user_id',CLOUD.uid).eq('rev',CLOUD.rev).select('rev').maybeSingle();
  if(res.error){if(res.error.code==='23505')return false;throw res.error}
  if(!res.data)return false;
  CLOUD.rev=res.data.rev;cloudSetBase(snap);
  if(CLOUD.gen===gen)CLOUD.dirty=false;                              // edits made during the upload go next time
  cloudSaveMeta();return true;
}

/* One sync pass: bring in the other devices' changes, then send ours. Serialized. */
async function cloudSync(opts={}){
  if(!cloudOn()||!CLOUD.uid||CLOUD.uid!==AUTH.user.id)return;
  if(CLOUD.busy){CLOUD.again=true;return}
  if(navigator.onLine===false){cloudBadge('offline');return}
  CLOUD.busy=true;clearTimeout(CLOUD.retry);
  try{
    if(CLOUD.dirty||opts.loud)cloudBadge('syncing');
    for(let i=0;i<4;i++){
      const rr=await cloudRemoteRev();
      if(rr&&rr!==CLOUD.rev){
        if(!opts.boot&&cloudUIBusy()){CLOUD.retry=setTimeout(()=>cloudSync(),5000);break}
        const remote=await cloudDownload();
        if(remote){
          const next=CLOUD.dirty?cloudMerge(cloudBase(),S,remote.state):remote.state;
          CLOUD.rev=remote.rev;cloudSetBase(remote.state);cloudSaveMeta();cloudApply(next);
        }
      }else if(!rr&&CLOUD.rev){CLOUD.rev=0;CLOUD.dirty=CLOUD.dirty||cloudHas(S)}   // row removed in the dashboard: re-create it
      if(!CLOUD.dirty)break;
      if(await cloudUpload())break;                                      // false = someone wrote first → loop: download, merge, retry
    }
    cloudBadge(CLOUD.dirty?'saving':'synced');
  }catch(e){
    if(/^(PGRST205|42P01)$/.test(String(e&&e.code))||/schema cache|relation .* does not exist/i.test(String(e&&e.message))){
      CLOUD.missing=true;console.warn('[sync] table public.user_data is missing — run the SQL in docs/AUTH_SUPABASE.md');cloudBadge('saved');
    }else{console.warn('[sync]',e);cloudBadge('failed');CLOUD.retry=setTimeout(()=>cloudSync(),30000)}
  }finally{
    CLOUD.busy=false;
    if(CLOUD.again){CLOUD.again=false;cloudSchedule(300)}
  }
}
function cloudSchedule(ms=1200){clearTimeout(CLOUD.timer);CLOUD.timer=setTimeout(()=>cloudSync(),ms)}

/* Called by save(): the local copy is written; mark it for upload. */
function cloudChanged(){
  if(!cloudOn()||!CLOUD.uid)return;
  CLOUD.gen++;CLOUD.dirty=true;cloudSaveMeta();
  if(navigator.onLine!==false)SYNC.state='saving';
  cloudSchedule();
}
/* Called by bootApp() after the local copy is loaded. Waits (max 8 s) so the first screen
   already shows the latest data; on a slow network the app opens with the local copy. */
async function cloudStart(){
  clearTimeout(CLOUD.timer);clearTimeout(CLOUD.retry);
  CLOUD.uid=null;CLOUD.missing=false;CLOUD.busy=false;CLOUD.again=false;
  if(!authOn()||!AUTH.client||!AUTH.user||!RX.id.test(AUTH.user.id))return;
  CLOUD.uid=AUTH.user.id;cloudLoadMeta();
  await Promise.race([cloudSync({boot:true,loud:true}),sleep(8000)]);
}
/* Before signing out: try to send pending changes (max 4 s). They also stay on this device. */
async function cloudFlush(){if(cloudOn()&&CLOUD.dirty){clearTimeout(CLOUD.timer);await Promise.race([cloudSync(),sleep(4000)])}}
function cloudStop(){clearTimeout(CLOUD.timer);clearTimeout(CLOUD.retry);CLOUD.uid=null;CLOUD.status='idle'}

/* Other devices' changes arrive when this tab is shown again, when the network returns,
   and every 45 seconds while the tab is visible (one tiny "rev" query). */
document.addEventListener('visibilitychange',()=>{if(document.visibilityState==='visible')cloudSync()});
window.addEventListener('online',()=>cloudSync());
setInterval(()=>{if(document.visibilityState==='visible')cloudSync()},45e3);
