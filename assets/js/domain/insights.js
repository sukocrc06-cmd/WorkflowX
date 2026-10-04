/* ================= INSIGHTS (rule-based, real data) ================= */
function insights(){
  const out=[],st=S.settings;
  for(let i=0;i<7;i++){const c=dayCapacity(addDays(sod(new Date()),i));if(c.work&&c.over)out.push({lvl:'warn',text:t('{d} aşırı yüklü: {l} planlı, kapasiten {c}.',{d:i===0?t('Bugün'):dayName(c.d.getDay()),l:hrs(c.planned),c:hrs(c.available)})})}
  for(const x of myOpen()){
    if(!x.due||!(+x.estimate))continue;
    const due=new Date(x.due);if(due<new Date())continue;
    const rem=remainingH(x);if(rem<=0)continue;
    const free=freeUntil(due);
    if(rem>free)out.push({lvl:'warn',text:t('“{x}” yetişmeyebilir: {r} planlanmamış iş var, teslime kadar yalnızca ~{f} boş kapasite kaldı.',{x:x.title,r:hrs(rem),f:hrs(free)})});
    else if((due-new Date())/864e5<3)out.push({lvl:'info',text:t('“{x}” için {r} henüz takvime yerleştirilmedi (teslim {d}).',{x:x.title,r:hrs(rem),d:relDue(due)})});
  }
  const es=estStats();if(es.ok&&Math.abs(es.factor-1)>=0.2)out.push({lvl:'info',text:t('Görevlerin tahmininden ortalama ×{f} sürüyor ({n} görev). Ayarlar’dan planlamada bu katsayıyı kullanabilirsin.',{f:num(es.factor),n:es.n})});
  return out;
}
/* "Is my time enough?" — free capacity on the next N working days versus the
   unscheduled work due in the same window. Today only counts the hours left. */
function capacityOutlook(n=5){
  const now=new Date(),days=[];
  for(let d=sod(now);days.length<n;d=addDays(d,1)){if(!isWorkDay(d))continue;const c=dayCapacity(d);days.push({d,load:c.planned,cap:c.available,free:c.remaining,over:c.over})}
  const until=+addDays(days[days.length-1].d,1);
  const due=myOpen().filter(x=>x.due&&+new Date(x.due)<until);
  const need=due.reduce((s,x)=>s+remainingH(x),0),free=days.reduce((s,r)=>s+r.free,0);
  return{days,need,free,ok:need<=free,short:Math.max(0,need-free),tasks:due.filter(x=>remainingH(x)>0)};
}
