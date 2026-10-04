/* ================= CONFLICT ENGINE =================
   Two timed items conflict when their intervals overlap. Milestones are points
   in time and never conflict. Personal time does conflict: you cannot be in a
   meeting and at the dentist. Pure functions over S — the dialog lives in ui/conflict.js. */
function timedItems(){
  return memo('timed',()=>[...S.events.filter(e=>e.type!=='milestone').map(e=>({kind:'ev',id:e.id,obj:e,a:+new Date(e.start),b:+new Date(e.end),label:e.title})),
    ...S.blocks.map(b=>({kind:'bl',id:b.id,obj:b,a:+new Date(b.start),b:+new Date(b.end),label:taskOf(b.taskId)?.title||t('Silinmiş görev')}))]);
}
/* Items overlapping [a,b), excluding the item itself (by id). */
function conflictsWith(a,b,excludeId){return timedItems().filter(x=>x.id!==excludeId&&overlap(x.a,x.b,a,b)>0).sort((p,q)=>p.a-q.a)}
/* All overlapping pairs whose overlap touches [from,to). */
function conflictPairs(from,to){
  const its=timedItems().filter(x=>overlap(x.a,x.b,+from,+to)>0).sort((p,q)=>p.a-q.a),out=[];
  for(let i=0;i<its.length;i++)for(let j=i+1;j<its.length&&its[j].a<its[i].b;j++)if(overlap(its[i].a,its[i].b,its[j].a,its[j].b)>0)out.push([its[i],its[j]]);
  return out;
}
/* First free slot of `dur` ms at or after `from`, inside working hours of working days,
   not overlapping anything except `excludeId`. Searches `days` days ahead. */
function nextFreeSlot(dur,from,excludeId,days=14){
  const st=S.settings,Q=15*60e3;
  const busy=timedItems().filter(x=>x.id!==excludeId).sort((p,q)=>p.a-q.a);
  for(let d=sod(from),i=0;i<days;d=addDays(d,1),i++){
    if(!isWorkDay(d))continue;
    const ws=new Date(d);ws.setHours(st.workStart,0,0,0);const we=new Date(d);we.setHours(st.workEnd,0,0,0);
    let cur=Math.max(+ws,Math.ceil(+from/Q)*Q);
    while(cur+dur<=+we){
      const hit=busy.find(x=>overlap(x.a,x.b,cur,cur+dur)>0);
      if(!hit)return{a:cur,b:cur+dur};
      cur=Math.ceil(hit.b/Q)*Q;
    }
  }
  return null;
}
/* The parts of [a,b) not covered by `others`, keeping pieces of 15 min or more. */
function splitAround(a,b,others){
  let segs=[[a,b]];
  for(const o of others)segs=segs.flatMap(([s,e])=>o.b<=s||o.a>=e?[[s,e]]:[[s,Math.min(e,o.a)],[Math.max(s,o.b),e]].filter(([x,y])=>y-x>0));
  return segs.filter(([s,e])=>e-s>=15*60e3);
}
