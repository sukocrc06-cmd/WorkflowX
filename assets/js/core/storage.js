/* ================= PERSISTENCE LAYER =================
   The only place that touches browser storage.
   - `prefs`   : small per-device preferences (language, theme, dev flags)
   - `storage` : the product state (tasks, projects, events …)
   Each signed-in account has its own key (storage.scope = user id, set by core/auth.js);
   without an account the device-wide key is used. In the data-sync phase `storage.adapter`
   is replaced by a Supabase adapter with the same load/save contract; it reports progress
   through setSync('saving'|'syncing'|'synced'|'failed'). Nothing else in the app has to change. */
const KEY='workflowx.v1';
const SCHEMA_VERSION=2;

const LocalAdapter={
  read(k){try{return window.localStorage.getItem(k)}catch{return null}},
  write(k,v){window.localStorage.setItem(k,v)},          // may throw (quota / disabled)
  remove(k){try{window.localStorage.removeItem(k)}catch{}}
};

const prefs={
  get(k,def=null){const v=LocalAdapter.read(KEY+'.'+k);return v===null?def:v},
  set(k,v){try{LocalAdapter.write(KEY+'.'+k,String(v));return true}catch{return false}},
  del(k){LocalAdapter.remove(KEY+'.'+k)}
};

class StorageError extends Error{constructor(code,cause){super(code);this.code=code;this.cause=cause}}
const sleep=ms=>new Promise(r=>setTimeout(r,ms));

const storage={
  adapter:LocalAdapter,
  scope:null,
  get key(){return this.scope?KEY+'.u.'+this.scope:KEY},
  /* Data created on this device without an account (offered for import on first sign-in). */
  guestRaw(){return this.adapter.read(KEY)},
  /* Developer switches (Settings → Developer) to preview loading / error UI. */
  get simulate(){return{delay:+prefs.get('dev.delay',0)||0,fail:prefs.get('dev.fail')==='1'}},
  async load(){
    const sim=this.simulate;
    if(sim.delay)await sleep(Math.min(sim.delay,5000));
    if(sim.fail)throw new StorageError('unavailable');
    const raw=this.adapter.read(this.key);
    if(raw==null||raw==='')return{state:null,report:null};
    let data;
    try{data=JSON.parse(raw)}catch(e){this.keepCorrupt(raw);throw new StorageError('corrupt',e)}
    if(!data||typeof data!=='object'||Array.isArray(data)){this.keepCorrupt(raw);throw new StorageError('corrupt')}
    return sanitizeState(data);
  },
  save(state){
    try{this.adapter.write(this.key,JSON.stringify({...state,schema:SCHEMA_VERSION}));return true}
    catch(e){console.error('[storage] save failed',e);return false}
  },
  /* Unreadable data is never silently discarded: it is copied aside so it can be downloaded. */
  keepCorrupt(raw){try{this.adapter.write(this.key+'.corrupt',raw)}catch{}},
  corruptCopy(){return this.adapter.read(this.key+'.corrupt')},
  reset(){this.adapter.remove(this.key)}
};
