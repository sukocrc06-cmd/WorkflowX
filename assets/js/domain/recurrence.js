/* ================= RECURRING TASKS =================
   Rule: {freq:'daily'|'weekdays'|'weekly'|'monthly', interval:1–30, days:[0–6] (weekly), monthDay:1–31 (monthly)}.
   When a recurring task is completed, the next occurrence is created with the same
   time of day; the rule moves to the new task so only one open instance exists. */
const RECUR_FREQ=['daily','weekdays','weekly','monthly'];
function nextOccurrence(rule,from){
  const f=new Date(from),iv=Math.max(1,rule.interval||1);
  const keep=d=>{d.setHours(f.getHours(),f.getMinutes(),0,0);return d};
  if(rule.freq==='daily')return keep(addDays(f,iv));
  if(rule.freq==='weekdays'){let d=addDays(f,1);while(d.getDay()===0||d.getDay()===6)d=addDays(d,1);return keep(d)}
  if(rule.freq==='weekly'){
    const days=(rule.days&&rule.days.length?rule.days:[f.getDay()]).slice().sort((a,b)=>((a+6)%7)-((b+6)%7));   // Monday-first
    const wd=(f.getDay()+6)%7,later=days.find(d=>((d+6)%7)>wd);
    if(later!==undefined)return keep(addDays(f,((later+6)%7)-wd));
    const mon=addDays(sod(f),-wd);return keep(addDays(mon,7*iv+((days[0]+6)%7)));
  }
  if(rule.freq==='monthly'){
    const md=rule.monthDay||f.getDate();const y=f.getFullYear(),m=f.getMonth()+iv;
    const last=new Date(y,m+1,0).getDate();return keep(new Date(y,m,Math.min(md,last)));
  }
  return null;
}
function recurText(r){
  if(!r)return t('Tekrar yok');
  const iv=r.interval>1?r.interval:1;
  if(r.freq==='daily')return iv>1?t('Her {n} günde bir',{n:iv}):t('Her gün');
  if(r.freq==='weekdays')return t('Hafta içi her gün');
  if(r.freq==='weekly'){const ds=(r.days||[]).slice().sort((a,b)=>((a+6)%7)-((b+6)%7)).map(d=>dayName(d,true)).join(', ');return(iv>1?t('Her {n} haftada bir',{n:iv}):t('Her hafta'))+(ds?' · '+ds:'')}
  if(r.freq==='monthly')return(iv>1?t('Her {n} ayda bir',{n:iv}):t('Her ay'))+' · '+t('ayın {d}. günü',{d:r.monthDay||1});
  return'';
}
/* Called inside a commit when a recurring task is completed. Returns the new task. */
function spawnNext(x){
  if(!x.recur)return null;
  const anchor=x.due?new Date(x.due):(()=>{const d=new Date();d.setHours(S.settings.workEnd,0,0,0);return d})();
  let nd=nextOccurrence(x.recur,anchor);let guard=0;
  while(nd&&+nd<Date.now()&&guard++<400)nd=nextOccurrence(x.recur,nd);   // never create an already-late copy
  if(!nd)return null;
  const shift=+nd-+anchor;
  const n={...JSON.parse(JSON.stringify(x)),id:uid(),status:'todo',due:toLocal(nd),start:x.start?toLocal(new Date(+new Date(x.start)+shift)):'',
    logs:[],comments:[],deps:[],completedAt:null,createdAt:toLocal(new Date()),demo:false,
    subtasks:(x.subtasks||[]).map(s=>({id:uid(),title:s.title,done:false}))};
  x.recur=null;S.tasks.push(n);
  logAct('task',n.id,'created',{label:n.title,note:recurText(n.recur)});
  return n;
}
