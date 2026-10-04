/* ================= PROJECT HEALTH =================
   Derived only from real data. When there is not enough data to judge (no tasks,
   no deadlines), the honest answer is "Not enough data" — never a made-up score. */
const HEALTH_K={healthy:'Sağlıklı',risk:'Riskte',delayed:'Gecikmede',completed:'Tamamlandı',nodata:'Yeterli veri yok'};
function projectHealth(p){
  return memo('health'+p.id,()=>{
    const ts=S.tasks.filter(x=>x.projectId===p.id),open=ts.filter(x=>x.status!=='done'),now=new Date();
    if(p.status==='done'||(ts.length&&!open.length))return{k:'completed',why:t('Tüm görevler tamamlandı')};
    if(!ts.length)return{k:'nodata',why:t('Projede görev yok')};
    const pEnd=p.deadline?dayEnd(parseDay(p.deadline)):null;
    const late=open.filter(isLate);
    if(pEnd&&pEnd<+now)return{k:'delayed',why:t('Proje teslim tarihi geçti; {n} görev açık',{n:open.length})};
    if(late.length)return{k:'delayed',why:t('{n} görevin teslim tarihi geçti',{n:late.length})};
    const dues=open.filter(x=>x.due).map(x=>+new Date(x.due));
    const horizon=pEnd||(dues.length?Math.max(...dues):null);
    if(!horizon)return{k:'nodata',why:t('Teslim tarihi olmadan risk hesaplanamaz')};
    const afterDue=S.blocks.some(b=>{const x=taskOf(b.taskId);if(!x||x.projectId!==p.id||x.status==='done')return false;const lim=Math.min(x.due?+new Date(x.due):Infinity,pEnd||Infinity);return +new Date(b.end)>lim});
    if(afterDue)return{k:'risk',why:t('Bazı odak blokları teslimden sonra')};
    const need=open.filter(mine).reduce((s,x)=>s+remainingH(x),0),free=freeUntil(new Date(horizon));
    const noEst=open.filter(x=>!(+x.estimate)).length;
    if(need>free+1e-9)return{k:'risk',why:t('{a} planlanmamış iş var, teslime kadar {b} boş kapasite',{a:hrs(need),b:hrs(free)})};
    return{k:'healthy',why:need?t('Kalan iş teslime kadar sığıyor'):t('Tüm işler planlı')+(noEst?' · '+t('{n} görevin süresi yok',{n:noEst}):'')};
  });
}
const HEALTH_I={healthy:'check',risk:'alert',delayed:'clock',completed:'check',nodata:'search'};
const healthPill=h=>`<span class="pill hl-${h.k}" title="${esc(h.why)}">${svg(HEALTH_I[h.k],'i s')}${t(HEALTH_K[h.k])}</span>`;
