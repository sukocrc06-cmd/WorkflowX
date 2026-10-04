/* ================= PLANNING ENGINE (deterministic, explainable) =================
   Splits a task's remaining hours into free slots between now and the deadline.
   Respects working hours, events, existing blocks, daily capacity and dependencies.
   Every block carries a structured `why` so the UI can explain the decision. */
const FOCUS_MIN=2;
function planTask(task,extra=[],ctx={rank:1,n:1},opts={}){
  const need=remainingH(task);
  if(need<=0)return{blocks:[],unplaced:0};
  const st=S.settings,SLOT=30*60e3,fac=factorNow(),work=d=>opts.weekend||isWorkDay(d);
  const now=new Date();let from=Math.ceil(+now/SLOT)*SLOT;
  let startNote=null;
  if(task.start&&+new Date(task.start)>from){from=Math.ceil(+new Date(task.start)/SLOT)*SLOT;startNote=task.start}
  let depTitle=null;
  for(const did of task.deps||[]){const dt=taskOf(did);if(!dt||dt.status==='done')continue;const ends=[...S.blocks,...extra].filter(b=>b.taskId===did).map(b=>+new Date(b.end));if(ends.length){const m=Math.max(...ends);if(m>from){from=m;depTitle=dt.title}}}
  const due=task.due?new Date(task.due):addDays(sod(now),8);
  if(+due<=from)return{blocks:[],unplaced:need,reason:+due<=+now?'due':'window'};
  const days=[],skipped=[];let hadWorkDay=false;
  for(let d=sod(from);d<=due;d=addDays(d,1)){
    if(!work(d)){skipped.push({d,why:'off'});continue}
    hadWorkDay=true;
    const ws=new Date(d);ws.setHours(st.workStart,0,0,0);
    const we=new Date(d);we.setHours(st.workEnd,0,0,0);
    const a=Math.max(+ws,from),b=Math.min(+we,+due);
    if(b-a<SLOT){skipped.push({d,why:'hours'});continue}
    const load=dayLoad(d,extra),cap=st.maxDaily-load;
    if(cap<0.5){skipped.push({d,why:'full',load,cap:st.maxDaily});continue}
    days.push({d,a,b,cap,ws:+ws});
  }
  if(!days.length){const full=skipped.some(x=>x.why==='full');return{blocks:[],unplaced:need,reason:full?'full':hadWorkDay?'outside':'nofree',weekendHelps:!opts.weekend&&skipped.some(x=>x.why==='off')}}
  let left=need;const out=[];
  /* Prefer focus chunks of at least 2 h (fewer context switches), then spread the rest evenly. */
  const per=Math.min(need,Math.max(FOCUS_MIN,Math.ceil(need/days.length*2)/2));
  const placeIn=(day,amount,pass,idx)=>{
    const want=Math.floor(amount*2)/2;if(want<0.5)return 0;
    const busy=busyItems([...extra,...out]);
    let placed=0,cursor=day.a,lastHit=null;
    while(cursor<day.b&&placed<want){
      const hit=busy.find(x=>x.a<cursor+SLOT&&x.b>cursor);
      if(hit){cursor=Math.ceil(hit.b/SLOT)*SLOT;lastHit=hit;continue}
      const nextBusy=busy.find(x=>x.a>=cursor);
      const freeEnd=Math.min(day.b,nextBusy?nextBusy.a:Infinity);
      const len=Math.min(freeEnd-cursor,(want-placed)*HOUR);
      /* Avoid scattering work into slivers: a block is at least 1 h unless less than 1 h is left. */
      if(len>=SLOT&&len>=Math.min(HOUR,(want-placed)*HOUR)){
        const L=Math.floor(len/SLOT)*SLOT,before=dayLoad(day.d,[...extra,...out]);
        const slot=lastHit&&Math.ceil(lastHit.b/SLOT)*SLOT===cursor?{kind:'after',label:lastHit.label}:cursor===day.ws?{kind:'start'}:cursor===from&&!depTitle?{kind:'now'}:{kind:'free'};
        const skippedBefore=skipped.filter(x=>+x.d<+day.d&&x.why==='full').slice(-3).map(x=>({d:dayKey(x.d),load:x.load,cap:x.cap}));
        out.push({id:uid(),taskId:task.id,start:toLocal(new Date(cursor)),end:toLocal(new Date(cursor+L)),
          why:{due:task.due||null,rank:ctx.rank,n:ctx.n,prio:task.priority,dep:depTitle,start:startNote,pass,per,dayIdx:idx+1,days:days.length,before,after:before+L/HOUR,cap:st.maxDaily,slot,factor:fac!==1?fac:null,skipped:skippedBefore,weekend:!!opts.weekend&&!isWorkDay(day.d)}});
        placed+=L/HOUR;cursor+=L;lastHit=null;
      } else {const nb=busy.find(x=>x.a>=cursor);cursor=freeEnd;lastHit=nb&&nb.a===freeEnd?nb:null}
    }
    day.cap-=placed;return placed;
  };
  days.forEach((day,i)=>{if(left>0)left-=placeIn(day,Math.min(per,day.cap,left),1,i)});
  days.forEach((day,i)=>{if(left>0)left-=placeIn(day,Math.min(day.cap,left),2,i)});
  const offDays=skipped.filter(x=>x.why==='off').length;
  return{blocks:out,unplaced:Math.max(0,Math.round(left*10)/10),reason:left>0?'cap':null,weekendHelps:left>0&&offDays>0&&!opts.weekend};
}
/* Earliest-deadline-first (then priority); dependencies are placed before dependants. */
function planOrder(tasks){const byDue=[...tasks].sort((x,y)=>((x.due?+new Date(x.due):Infinity)-(y.due?+new Date(y.due):Infinity))||(PRIO_W[y.priority]-PRIO_W[x.priority]));const out=[],seen=new Set();const visit=x=>{if(seen.has(x.id))return;seen.add(x.id);(x.deps||[]).map(taskOf).filter(d=>d&&byDue.includes(d)).forEach(visit);out.push(x)};byDue.forEach(visit);return out}
function planMany(tasks,opts={}){const all=[],unplaced=[];const order=planOrder(tasks);order.forEach((x,i)=>{const r=planTask(x,all,{rank:i+1,n:order.length},opts);all.push(...r.blocks);if(r.unplaced>0)unplaced.push({taskId:x.id,h:r.unplaced,reason:r.reason,weekendHelps:!!r.weekendHelps})});return{blocks:all,unplaced}}
function whyList(w){
  if(!w)return[];
  const L=[];
  L.push(w.due?t('Teslim {d}: bu tarihten sonrasına plan yapılmaz',{d:fDT(w.due)}):t('Teslim tarihi yok: önümüzdeki 8 gün içine yerleştirildi'));
  if(w.n>1)L.push(t('Planlama sırası {r}/{n}: teslimi en yakın iş önce, eşitlikte önceliği yüksek olan ({p})',{r:w.rank,n:w.n,p:PR(w.prio)}));
  if(w.dep)L.push(t('“{x}” görevine bağlı; onun bloklarından sonra planlandı',{x:w.dep}));
  if(w.start)L.push(t('Başlangıç tarihi {d}: öncesine plan yapılmaz',{d:fDT(w.start)}));
  (w.skipped||[]).forEach(s=>L.push(t('{d} atlandı: günlük kapasite dolu ({a} / {b})',{d:dayName(parseDay(s.d).getDay()),a:num(s.load),b:hrs(s.cap)})));
  if(w.weekend)L.push(t('Hafta sonu kullanımına izin verdiğin için bu güne yerleştirildi'));
  L.push(w.pass===1?t('Odak için günde en az {m}, en fazla ~{p} ayrıldı; {k} uygun günün {i}. günü',{m:hrs(Math.min(2,w.per)),p:hrs(w.per),k:w.days,i:w.dayIdx}):t('Eşit dağıtımdan kalan saat, boş kapasiteye yerleştirildi'));
  L.push(t('Gün yükü {a} → {b} (kapasite {c})',{a:hrs(w.before),b:hrs(w.after),c:hrs(w.cap)}));
  L.push(w.slot.kind==='after'?t('“{x}” bitiminden sonraki ilk boşluk',{x:w.slot.label}):w.slot.kind==='start'?t('Mesai başlangıcındaki ilk boşluk'):w.slot.kind==='now'?t('Şu andan sonraki ilk boş zaman'):t('Günün ilk uygun boşluğu'));
  if(w.factor)L.push(t('Kişisel tahmin katsayısı uygulandı (×{f})',{f:num(w.factor)}));
  return L;
}
const reasonText=r=>({due:t('Teslim tarihi geçmiş'),window:t('Başlangıç veya bağımlılık, teslimden sonraya denk geliyor'),nofree:t('Teslimden önce hiç çalışma günü yok'),outside:t('Teslim, çalışma saatlerinin dışında; önünde çalışma zamanı kalmıyor'),full:t('Teslime kadar tüm iş günlerinin kapasitesi dolu'),cap:t('Teslime kadar kapasite yetmiyor')}[r]||'');

