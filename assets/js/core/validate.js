/* ================= VALIDATION =================
   Stored or imported data is untrusted. sanitizeState() rebuilds a clean state
   object field by field: unknown fields are dropped, enums/dates/numbers/colours
   are checked, dangling references are cleared and dependency cycles are cut.
   It never throws; it returns { state, report } where report counts repairs. */
const RX={
  id:/^[A-Za-z0-9_-]{1,64}$/,
  local:/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/,       // floating local date-time (wall clock)
  day:/^\d{4}-\d{2}-\d{2}$/,
  color:/^#[0-9a-fA-F]{6}$/
};
const ENUM={
  status:['inbox','todo','progress','blocked','done'],
  priority:['low','medium','high','urgent'],
  eventType:['meeting','focus','personal','event','milestone'],
  projectStatus:['active','hold','done'],
  roadmap:['todo','proto','done'],
  role:['owner','admin','manager','member','viewer'],
  recur:['daily','weekdays','weekly','monthly'],
  tplKind:['task','project']
};
const EMAIL_RX=/^[^\s@<>"']{1,64}@[^\s@<>"']{1,190}\.[A-Za-z]{2,24}$/;
const str=(v,max)=>typeof v==='string'?v.slice(0,max):'';
const validLocal=v=>typeof v==='string'&&RX.local.test(v)&&!isNaN(new Date(v));
const validDay=v=>typeof v==='string'&&RX.day.test(v)&&!isNaN(parseDay(v));
const validISO=v=>typeof v==='string'&&!isNaN(Date.parse(v));
const clampNum=(v,min,max,def)=>{const n=+v;return Number.isFinite(n)?Math.min(max,Math.max(min,n)):def};

function sanitizeState(raw){
  const rep={fixed:0,dropped:0};
  const fix=()=>rep.fixed++,drop=()=>rep.dropped++;
  const src=raw&&typeof raw==='object'?raw:{};
  const out=blank();
  const arr=v=>Array.isArray(v)?v.filter(x=>x&&typeof x==='object'):[];
  const idMap=new Map();                                   // old invalid id → new id
  const cleanId=(id)=>{if(typeof id==='string'&&RX.id.test(id))return id;const n=uid();fix();if(id!=null)idMap.set(String(id),n);return n};

  // profile & settings
  const pr=src.profile||{};
  out.profile={name:str(pr.name,120).trim(),role:str(pr.role,120).trim(),tz:str(pr.tz,64)};
  const wsp=src.workspace||{};
  out.workspace={id:'personal',kind:'personal',name:str(wsp.name,120).trim()};
  const se=src.settings||{};
  const ws=Math.round(clampNum(se.workStart,0,23,9)),we=Math.round(clampNum(se.workEnd,1,24,18));
  out.settings={workStart:ws,workEnd:we>ws?we:Math.min(24,ws+8),maxDaily:0,workDays:[],useFactor:se.useFactor===true};
  out.settings.maxDaily=Math.min(clampNum(se.maxDaily,0.5,16,6),out.settings.workEnd-out.settings.workStart);
  out.settings.workDays=[...new Set(Array.isArray(se.workDays)?se.workDays.map(Number).filter(d=>Number.isInteger(d)&&d>=0&&d<=6):[])];
  if(!out.settings.workDays.length){out.settings.workDays=[1,2,3,4,5];if(se.workDays)fix()}
  const nt=se.notify&&typeof se.notify==='object'?se.notify:{};
  out.settings.notify=Object.fromEntries(Object.keys(DEFAULT_NOTIFY).map(k=>[k,nt[k]!==false]));
  out.onboarded=src.onboarded===true;

  // members (local only until the backend phase)
  for(const m of arr(src.members).slice(0,200)){
    const name=str(m.name,120).trim();if(!name){drop();continue}
    out.members.push({id:m.id==='me'?(fix(),uid()):cleanId(m.id),name,email:EMAIL_RX.test(m.email||'')?String(m.email):'',role:ENUM.role.includes(m.role)&&m.role!=='owner'?m.role:(m.role?(fix(),'member'):'member'),capacity:Math.round(clampNum(m.capacity,0,80,30)*2)/2,demo:m.demo===true});
  }
  const memberIds=new Set(out.members.map(m=>m.id));
  const memberRef=id=>{if(id==null||id===''||id==='me')return null;const k=idMap.get(String(id))||id;if(memberIds.has(k))return k;fix();return null};

  // projects
  for(const p of arr(src.projects)){
    const name=str(p.name,120).trim();if(!name){drop();continue}
    out.projects.push({id:cleanId(p.id),name,desc:str(p.desc,5000),
      color:RX.color.test(p.color)?p.color:(fix(),COLORS[0]),
      start:validDay(p.start)?p.start:'',deadline:validDay(p.deadline)?p.deadline:'',
      status:ENUM.projectStatus.includes(p.status)?p.status:'active',
      archived:p.archived===true,archivedAt:p.archived===true&&validLocal(p.archivedAt)?p.archivedAt:null,
      createdAt:validLocal(p.createdAt)?p.createdAt:toLocal(new Date()),demo:p.demo===true,icon:PROJ_ICONS.includes(p.icon)?p.icon:''});
  }
  const projIds=new Set(out.projects.map(p=>p.id));
  const projRef=id=>{if(id==null||id==='')return null;const k=idMap.get(String(id))||id;if(projIds.has(k))return k;fix();return null};

  // tasks
  for(const x of arr(src.tasks)){
    const title=str(x.title,200).trim();if(!title){drop();continue}
    out.tasks.push({id:cleanId(x.id),title,desc:str(x.desc,10000),
      status:ENUM.status.includes(x.status)?x.status:(fix(),'todo'),
      priority:ENUM.priority.includes(x.priority)?x.priority:(fix(),'medium'),
      due:validLocal(x.due)?x.due:(x.due?(fix(),''):''),
      start:validLocal(x.start)?x.start:(x.start?(fix(),''):''),
      assignee:memberRef(x.assignee),
      subtasks:arr(x.subtasks).slice(0,50).map(st=>({id:RX.id.test(st.id)?st.id:uid(),title:str(st.title,200).trim(),done:st.done===true})).filter(st=>st.title),
      recur:cleanRecur(x.recur),
      comments:arr(x.comments).slice(-200).filter(c=>validISO(c.at)&&str(c.text,2000).trim()).map(c=>({id:RX.id.test(c.id)?c.id:uid(),author:c.author==='me'?'me':(memberRef(c.author)||'me'),text:str(c.text,2000).trim(),at:c.at})),
      estimate:Math.round(clampNum(x.estimate,0,200,0)*4)/4,
      projectId:projRef(x.projectId),
      tags:(Array.isArray(x.tags)?x.tags:[]).filter(g=>typeof g==='string'&&g.trim()).map(g=>g.trim().slice(0,40)).slice(0,10),
      deps:Array.isArray(x.deps)?x.deps.map(String):[],
      logs:arr(x.logs).filter(l=>validISO(l.start)&&validISO(l.end)&&Date.parse(l.end)>Date.parse(l.start)).map(l=>({start:l.start,end:l.end,manual:l.manual===true})),
      createdAt:validLocal(x.createdAt)?x.createdAt:toLocal(new Date()),
      completedAt:validLocal(x.completedAt)?x.completedAt:null,
      updatedAt:validLocal(x.updatedAt)?x.updatedAt:null,
      demo:x.demo===true});
  }
  // a start after the deadline is impossible → drop the start
  for(const x of out.tasks)if(x.start&&x.due&&new Date(x.start)>new Date(x.due)){x.start='';fix()}
  const taskIds=new Set(out.tasks.map(x=>x.id));
  const taskRef=id=>{const k=idMap.get(String(id))||id;return taskIds.has(k)?k:null};
  // dependencies: existing tasks only, no self-reference, no cycles
  for(const x of out.tasks){const before=x.deps.length;x.deps=[...new Set(x.deps.map(taskRef).filter(d=>d&&d!==x.id))];if(x.deps.length!==before)fix()}
  rep.fixed+=breakCycles(out.tasks);

  // events
  for(const e of arr(src.events)){
    const title=str(e.title,200).trim();
    if(!title||!validLocal(e.start)||!validLocal(e.end)||new Date(e.end)<=new Date(e.start)){drop();continue}
    let type=e.type==='work'?'focus':e.type;                // v1 → v2 migration
    if(!ENUM.eventType.includes(type)){fix();type='meeting'}
    out.events.push({id:cleanId(e.id),title,start:e.start,end:e.end,type,projectId:projRef(e.projectId),
      location:str(e.location,300),participants:str(e.participants,500),desc:str(e.desc,5000),
      source:e.source==='ics'?'ics':'manual',uid:str(e.uid,256),demo:e.demo===true});
  }
  // schedule blocks
  for(const b of arr(src.blocks)){
    const tk=taskRef(b.taskId);
    if(!tk||!validLocal(b.start)||!validLocal(b.end)||new Date(b.end)<=new Date(b.start)){drop();continue}
    out.blocks.push({id:cleanId(b.id),taskId:tk,start:b.start,end:b.end});
  }
  // running timer
  const tm=src.timer;
  if(tm&&taskRef(tm.taskId)&&((tm.paused===true&&!tm.start)||(validISO(tm.start)&&Date.parse(tm.start)<=Date.now())))out.timer={taskId:taskRef(tm.taskId),start:tm.paused===true?null:tm.start,acc:Math.round(clampNum(tm.acc,0,864e5,0)),logged:Math.round(clampNum(tm.logged,0,864e5,0)),paused:tm.paused===true};
  else if(tm)fix();
  // templates
  for(const tp of arr(src.templates).slice(0,100)){
    const name=str(tp.name,120).trim();if(!name||!ENUM.tplKind.includes(tp.kind)){drop();continue}
    const items=arr(tp.items).slice(0,40).map((it,i)=>({title:str(it.title,200).trim(),estimate:Math.round(clampNum(it.estimate,0,200,0)*4)/4,priority:ENUM.priority.includes(it.priority)?it.priority:'medium',
      tags:(Array.isArray(it.tags)?it.tags:[]).filter(g=>typeof g==='string').map(g=>g.trim().slice(0,40)).filter(Boolean).slice(0,10),
      subtasks:(Array.isArray(it.subtasks)?it.subtasks:[]).filter(g=>typeof g==='string').map(g=>g.trim().slice(0,200)).filter(Boolean).slice(0,50),
      depIndex:Number.isInteger(it.depIndex)&&it.depIndex>=0&&it.depIndex<i?it.depIndex:null,recur:cleanRecur(it.recur)})).filter(it=>it.title);
    if(!items.length){drop();continue}
    out.templates.push({id:cleanId(tp.id),kind:tp.kind,name,desc:str(tp.desc,500),items});
  }
  // activity log
  const ACT_T=/^[a-z_]{1,24}$/;
  for(const a of arr(src.activity).slice(-1000)){
    if(!validISO(a.at)||!ACT_T.test(a.type)||!['task','project','event','workspace'].includes(a.entity))continue;
    const d=a.data&&typeof a.data==='object'?a.data:{};
    const changes=Array.isArray(d.changes)?d.changes.filter(c=>Array.isArray(c)&&c.length===3).slice(0,12).map(c=>c.map(v=>str(String(v??''),120))):[];
    out.activity.push({id:RX.id.test(a.id)?a.id:uid(),at:a.at,entity:a.entity,entityId:RX.id.test(a.entityId)?(idMap.get(a.entityId)||a.entityId):'',type:a.type,data:{label:str(d.label,200),note:str(d.note,200),changes}});
  }
  // notification read markers
  if(src.notifRead&&typeof src.notifRead==='object')for(const k of Object.keys(src.notifRead).slice(-500))if(/^[a-z]{2,10}:[A-Za-z0-9_:.\-]{1,160}$/.test(k)&&src.notifRead[k]===true)out.notifRead[k]=true;
  // roadmap progress
  if(src.roadmap&&typeof src.roadmap==='object')for(const[k,v]of Object.entries(src.roadmap))if(RX.id.test(k)&&ENUM.roadmap.includes(v))out.roadmap[k]=v;
  return{state:out,report:rep};
}

function cleanRecur(r){
  if(!r||typeof r!=='object'||!ENUM.recur.includes(r.freq))return null;
  const o={freq:r.freq,interval:Math.round(clampNum(r.interval,1,30,1))};
  if(r.freq==='weekly'){o.days=[...new Set((Array.isArray(r.days)?r.days:[]).map(Number).filter(d=>Number.isInteger(d)&&d>=0&&d<=6))];if(!o.days.length)o.days=[1]}
  if(r.freq==='monthly')o.monthDay=Math.round(clampNum(r.monthDay,1,31,1));
  return o;
}
/* Removes dependency edges that close a cycle. Returns how many were removed. */
function breakCycles(tasks){
  const byId=new Map(tasks.map(x=>[x.id,x]));let removed=0;
  const state=new Map();                                   // 1 = visiting, 2 = done
  const visit=x=>{state.set(x.id,1);
    x.deps=x.deps.filter(d=>{const s=state.get(d);if(s===1){removed++;return false}if(!s&&byId.has(d))visit(byId.get(d));return true});
    state.set(x.id,2)};
  tasks.forEach(x=>{if(!state.get(x.id))visit(x)});
  return removed;
}
/* Would making `taskId` depend on `depId` create a cycle? */
function createsCycle(taskId,depId){
  const seen=new Set();const stack=[depId];
  while(stack.length){const id=stack.pop();if(id===taskId)return true;if(seen.has(id))continue;seen.add(id);const x=taskOf(id);if(x)stack.push(...(x.deps||[]))}
  return false;
}
