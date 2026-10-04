/* ================= CALENDAR MODEL =================
   Pure calculations for the calendar views (no DOM). */
/* Grid geometry. Updated by calGeom() before every render from the user's view options:
   density (hour height), "compress off-hours" (work hours ±1 h) — always widened to fit the items shown. */
let CAL_S=7,CAL_E=21,PX=48;
const CAL_DENSITY={compact:36,comfortable:48,spacious:64};
const calPref=(k,d)=>{const v=prefs.get('cal.'+k);return v==null?d:v};
function calGeom(days){
  const den=calPref('density','comfortable');PX=CAL_DENSITY[den]||48;
  const st=S.settings;let a=calPref('compress','0')==='1'?Math.max(0,st.workStart-1):7,b=calPref('compress','0')==='1'?Math.min(24,st.workEnd+1):21;
  if(days&&days.length){const s=+sod(days[0]),e=dayEnd(days[days.length-1]);
    [...S.events.filter(x=>x.type!=='milestone'),...S.blocks,...(UI.draft?UI.draft.blocks:[])].forEach(x=>{const xs=+new Date(x.start),xe=+new Date(x.end);if(xe<=s||xs>=e)return;
      const d1=new Date(Math.max(xs,s)),d2=new Date(Math.min(xe,e));a=Math.min(a,d1.getHours());const eh=+sod(d2)===+sod(d1)?d2.getHours()+(d2.getMinutes()?1:0):24;b=Math.max(b,eh)})}
  CAL_S=Math.max(0,Math.min(a,23));CAL_E=Math.min(24,Math.max(b,CAL_S+1));
}

/* Timed items for one day, laid out in lanes so overlapping items sit side by side. */
function calItems(day,draft){
  const s=+sod(day),e=dayEnd(day);
  const items=[...S.events.filter(x=>x.type!=='milestone').map(x=>({k:'ev',x})),...S.blocks.map(x=>({k:'bl',x})),...(draft||[]).map(x=>({k:'dr',x}))]
    .filter(({x})=>overlap(+new Date(x.start),+new Date(x.end),s,e)>0).map(o=>({...o,a:+new Date(o.x.start),b:+new Date(o.x.end)})).sort((p,q)=>p.a-q.a||q.b-p.b);
  let cluster=[],cEnd=-1;const flush=()=>{const lanes=[];cluster.forEach(it=>{let l=lanes.findIndex(end=>end<=it.a);if(l<0){l=lanes.length;lanes.push(0)}lanes[l]=it.b;it.lane=l});cluster.forEach(it=>it.lanes=lanes.length);cluster=[]};
  items.forEach(it=>{if(it.a>=cEnd&&cluster.length)flush();cluster.push(it);cEnd=Math.max(cEnd,it.b)});flush();
  return items;
}
/* Point-in-time markers: task deadlines, milestone events and project deadlines. */
function calMarkers(day){
  const idx=memo('marks',()=>{const m=new Map(),add=(k,o)=>{const a=m.get(k);if(a)a.push(o);else m.set(k,[o])};
    S.tasks.forEach(x=>{if(x.due&&x.status!=='done')add(dayKey(x.due),{kind:'deadline',at:+new Date(x.due),label:x.title,task:x})});
    S.events.forEach(ev=>{if(ev.type==='milestone')add(dayKey(ev.start),{kind:'milestone',at:+new Date(ev.start),label:ev.title,event:ev})});
    S.projects.forEach(p=>{if(p.deadline&&p.status!=='done'&&!p.archived)add(p.deadline,{kind:'project',at:+parseDay(p.deadline)+S.settings.workEnd*HOUR,label:p.name,project:p})});
    m.forEach(a=>a.sort((x,y)=>x.at-y.at));return m});
  return(idx.get(dayKey(day))||[]).slice();
}
function calMarkersScan(day){
  const s=+sod(day),e=dayEnd(day),key=dayKey(day),out=[];
  S.tasks.forEach(x=>{if(x.due&&x.status!=='done'){const d=+new Date(x.due);if(d>=s&&d<e)out.push({kind:'deadline',at:d,label:x.title,task:x})}});
  S.events.forEach(ev=>{if(ev.type==='milestone'){const d=+new Date(ev.start);if(d>=s&&d<e)out.push({kind:'milestone',at:d,label:ev.title,event:ev})}});
  S.projects.forEach(p=>{if(p.deadline===key&&p.status!=='done')out.push({kind:'project',at:s+S.settings.workEnd*HOUR,label:p.name,project:p})});
  return out.sort((a,b)=>a.at-b.at);
}
/* The visible range for the current calendar mode. */
function calRange(mode,date){
  if(mode==='day'){const d=sod(date);return{days:[d],from:d,to:addDays(d,1)}}
  if(mode==='agenda'){const d=sod(date);return{days:[...Array(14)].map((_,i)=>addDays(d,i)),from:d,to:addDays(d,14)}}
  if(mode==='month'){const first=new Date(date.getFullYear(),date.getMonth(),1),start=startOfWeek(first),days=[...Array(42)].map((_,i)=>addDays(start,i));return{days,from:start,to:addDays(start,42),month:date.getMonth()}}
  const ws=startOfWeek(date);let days=[...Array(7)].map((_,i)=>addDays(ws,i));
  if(calPref('weekend','1')==='0')days=days.filter(d=>d.getDay()%6!==0);
  return{days,from:ws,to:addDays(ws,7)};
}
function rangeHasItems(from,to){const a=+from,b=+to;return S.events.some(x=>overlap(+new Date(x.start),+new Date(x.end)||+new Date(x.start)+1,a,b)>0)||S.blocks.some(x=>overlap(+new Date(x.start),+new Date(x.end),a,b)>0)||S.tasks.some(x=>x.due&&x.status!=='done'&&+new Date(x.due)>=a&&+new Date(x.due)<b)}
