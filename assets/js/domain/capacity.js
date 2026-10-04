/* ================= CAPACITY (one model for every screen) =================
   Available = the daily capacity on a working day (0 on days off).
   Planned   = booked WORK on that day: meetings, events, focus events and task blocks.
               Personal time and milestones are not work: they block the planner from
               using that time slot but do not consume work capacity.
   Free      = Available − Planned (never negative).  Overloaded = Planned > Available.
   Remaining = for today, Free limited to what is left of today's working hours.
   Dashboard, Today, Calendar, Planning and Analytics all read this function. */
const WORK_EVENT=new Set(['meeting','focus','event']);
const isWorkDay=d=>S.settings.workDays.includes(new Date(d).getDay());
function workItems(extra=[]){
  return memo('work',()=>[...S.events.filter(e=>WORK_EVENT.has(e.type)).map(e=>({a:+new Date(e.start),b:+new Date(e.end)})),...S.blocks.map(b=>({a:+new Date(b.start),b:+new Date(b.end)}))])
    .concat(extra.map(b=>({a:+new Date(b.start),b:+new Date(b.end)})));
}
function dayLoad(day,extra=[]){
  const s=+sod(day),e=dayEnd(day);
  const calc=()=>workItems(extra).reduce((acc,x)=>acc+overlap(x.a,x.b,s,e),0)/HOUR;
  return extra.length?calc():memo('load'+s,calc);
}
function dayCapacity(day,extra=[]){
  const d=sod(day),work=isWorkDay(d),st=S.settings;
  const available=work?st.maxDaily:0,planned=dayLoad(d,extra),free=Math.max(0,available-planned);
  let remaining=free;
  const now=new Date();
  if(dayKey(d)===dayKey(now)){const end=new Date(d);end.setHours(st.workEnd,0,0,0);remaining=Math.min(free,Math.max(0,(end-now)/HOUR))}
  else if(+d<+sod(now))remaining=0;
  return{d,work,available,planned,free,remaining,over:planned>available+1e-9,overBy:Math.max(0,planned-available)};
}
/* Free work capacity from now until a moment (inclusive of that day). */
function freeUntil(until){let free=0;for(let d=sod(new Date());+d<=+until;d=addDays(d,1))free+=dayCapacity(d).remaining;return free}
/* Short label used on every capacity bar: "5,5 / 6 sa". */
const capLabel=c=>c.work?`${num(c.planned)} / ${hrs(c.available)}`:(c.planned?hrs(c.planned):t('İzin günü'));
