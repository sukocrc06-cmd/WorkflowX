/* ================= ANALYTICS  (#/app/analytics) =================
   Every number is derived from real state — no sample or decorative data. */
V.analytics=()=>{
  const all=S.tasks,done=all.filter(x=>x.status==='done'),late=all.filter(isLate);
  if(!all.length)return`<div class="page-h"><div><h1>${t('Analiz')}</h1></div></div><div class="panel">${emptyState('chart',t('Analiz oluşturmak için biraz veri gerekiyor'),t('Grafikler yalnızca gerçek verilerinden üretilir. Birkaç görev ekleyip süre kaydettikçe burası dolacak.'),t('Görev ekle'),'data-a="newTask"')}</div>`;
  const est=openTasks().reduce((s,x)=>s+effEst(x),0),planned=openTasks().reduce((s,x)=>s+Math.min(effEst(x),scheduledH(x)),0);
  const byProj=[...S.projects,{id:null,name:t('Projesiz'),color:'#9ca3af'}].map(p=>{const ts=all.filter(x=>(x.projectId||null)===p.id);return{p,d:ts.filter(x=>x.status==='done').reduce((s,x)=>s+(+x.estimate||0),0),pl:ts.filter(x=>x.status!=='done').reduce((s,x)=>s+Math.min(effEst(x),scheduledH(x)),0),un:ts.filter(x=>x.status!=='done').reduce((s,x)=>s+remainingH(x),0)}}).filter(r=>r.d+r.pl+r.un>0);
  const mx=Math.max(1,...byProj.map(r=>r.d+r.pl+r.un));
  const days=[...Array(7)].map((_,i)=>addDays(sod(new Date()),i));
  const cap=S.settings.maxDaily,mx2=Math.max(cap,...days.map(d=>dayLoad(d)));
  const es=estStats(),emx=Math.max(1,...es.list.map(x=>Math.max(+x.estimate,actualH(x))));
  const tracked=S.tasks.reduce((s,x)=>s+actualH(x),0),unplanned=openTasks().reduce((s,x)=>s+remainingH(x),0);
  const w0=+sod(new Date()),w1=+addDays(sod(new Date()),7),plannedWeek=S.blocks.reduce((s,b)=>s+overlap(+new Date(b.start),+new Date(b.end),w0,w1),0)/HOUR;
  const estOpen=openTasks().reduce((s,x)=>s+(+x.estimate||0),0),free7=days.reduce((s,d)=>s+dayCapacity(d).remaining,0);
  /* Schedule adherence (last 14 days): of the focus-block hours that already passed, how many
     were matched by time actually logged on the same task that same day. */
  const past=S.blocks.filter(b=>+new Date(b.end)<=Date.now()&&+new Date(b.start)>=+addDays(sod(new Date()),-14));
  const blH=past.reduce((s,b)=>s+(new Date(b.end)-new Date(b.start))/HOUR,0);
  const byTD=new Map();S.tasks.forEach(x=>(x.logs||[]).forEach(l=>{const k=x.id+'|'+dayKey(l.start);byTD.set(k,(byTD.get(k)||0)+(new Date(l.end)-new Date(l.start))/HOUR)}));
  const pool=new Map(byTD);let hit=0;past.forEach(b=>{const k=b.taskId+'|'+dayKey(b.start),h=(new Date(b.end)-new Date(b.start))/HOUR,av=pool.get(k)||0,u=Math.min(h,av);hit+=u;pool.set(k,av-u)});
  const adh=blH?hit/blH*100:null;
  const projs=S.projects.filter(p=>!p.archived).map(p=>({p,g:projProgress(p),h:projectHealth(p)})).filter(r=>r.g.total);
  return`<div class="page-h"><div><h1>${t('Analiz')}</h1><p>${t('Tüm değerler gerçek görev, blok, etkinlik ve zaman kayıtlarından hesaplanır.')}</p></div></div>
  <div class="kpis k4">
    <div class="kpi"><div class="l">${t('Tamamlanan görev')}</div><div class="v">${cu(done.length,'n')}<small> / ${all.length}</small></div></div>
    <div class="kpi"><div class="l">${t('Geciken görev')}</div><div class="v" style="${late.length?'color:var(--danger)':''}">${cu(late.length,'n')}</div></div>
    <div class="kpi"><div class="l">${t('Tahmini saat')} <span class="muted">· ${t('açık işler')}</span></div><div class="v">${cu(estOpen)}</div></div>
    <div class="kpi"><div class="l">${t('Gerçekleşen saat')}</div><div class="v">${cu(tracked)}</div></div>
    <div class="kpi"><div class="l">${t('Planlanan saat')} <span class="muted">· 7 ${t('gün')}</span></div><div class="v">${cu(plannedWeek)}</div></div>
    <div class="kpi"><div class="l">${t('Boş kapasite')} <span class="muted">· 7 ${t('gün')}</span></div><div class="v">${cu(free7)}</div></div>
    <div class="kpi"><div class="l">${t('Planlanmamış saat')}</div><div class="v">${cu(unplanned)}</div></div>
    <div class="kpi" title="${t('Son 14 günde süresi geçen odak bloklarının, aynı gün aynı göreve kaydedilen süreyle karşılanan oranı.')}"><div class="l">${t('Plana uyum')} <span class="muted">· 14 ${t('gün')}</span></div><div class="v">${adh===null?`<small>${t('Veri yok')}</small>`:cu(adh,'pct')}</div></div>
  </div>
  <div class="grid-dash">
    <section class="panel c7"><div class="panel-h"><h2>${t('Proje bazında iş (saat)')}</h2><div class="legend"><span><i style="background:var(--ok)"></i>${t('Tamamlanan')}</span><span><i style="background:var(--accent)"></i>${t('Planlı')}</span><span><i style="background:var(--border-strong)"></i>${t('Planlanmamış')}</span></div></div><div class="panel-b">
      ${byProj.map(r=>{const tot=r.d+r.pl+r.un;return`<div class="hbar"><span class="n">${esc(r.p.name)}</span><div class="stack" style="width:${tot/mx*100}%"><i style="width:${r.d/tot*100}%;background:var(--ok)"></i><i style="width:${r.pl/tot*100}%;background:var(--accent)"></i><i style="width:${r.un/tot*100}%;background:var(--border-strong)"></i></div><span class="v">${hrs(tot)}</span></div>`}).join('')}
    </div></section>
    <section class="panel c5"><div class="panel-h"><h2>${t('Tahmin doğruluğu')}</h2>${es.n?`<span class="pill ${Math.abs(es.factor-1)>=0.2?'pr-high':''}">×${num(es.factor)}</span>`:''}</div><div class="panel-b">
      ${es.n?`<p style="margin:0 0 8px;color:var(--muted);font-size:13px">${es.factor>1.05?t('Görevlerin tahmininden ortalama %{p} daha uzun sürüyor.',{p:Math.round((es.factor-1)*100)}):es.factor<0.95?t('Görevlerin tahmininden ortalama %{p} daha kısa sürüyor.',{p:Math.round((1-es.factor)*100)}):t('Tahminlerin gerçeğe çok yakın.')} ${es.ok?'':t('Planlamada kullanmak için en az 3 görev gerekir ({n}/3).',{n:es.n})}</p>
        ${es.list.slice(-6).map(x=>`<div class="hbar"><span class="n">${esc(x.title)}</span><div class="cmp"><div class="bar"><i style="width:${+x.estimate/emx*100}%;background:var(--border-strong)"></i></div><div class="bar"><i style="width:${actualH(x)/emx*100}%;background:${actualH(x)>+x.estimate*1.1?'var(--warn)':'var(--ok)'}"></i></div></div><span class="v">${hrs(+x.estimate)} → ${dur(actualH(x))}</span></div>`).join('')}
        <div class="legend" style="margin-top:6px"><span><i style="background:var(--border-strong)"></i>${t('Tahmin')}</span><span><i style="background:var(--ok)"></i>${t('Gerçekleşen')}</span></div>`
      :`<p style="color:var(--muted);margin:4px 0 8px">${t('Henüz veri yok. Görev üzerindeki ▶ ile zamanlayıcıyı başlat ya da görev düzenleme ekranından süre ekle; görev tamamlanınca burada karşılaştırılır.')}</p>`}
    </div></section>
    <section class="panel c12"><div class="panel-h"><h2>${t('Proje tamamlanma')}</h2><span class="muted small">${t('Süre ağırlıklı')}</span></div><div class="panel-b">
      ${projs.length?projs.map(r=>`<div class="hbar"><span class="n"><a href="${hrefFor('project',r.p.id)}">${esc(r.p.name)}</a></span><div class="bar"><i style="width:${r.g.pct}%;background:${r.p.color}"></i></div><span class="v">%${r.g.pct}</span>${healthPill(r.h)}</div>`).join(''):`<p class="muted">${t('Görevi olan aktif proje yok.')}</p>`}
    </div></section>
    <section class="panel c12"><div class="panel-h"><h2>${t('Önümüzdeki 7 gün — yük / kapasite')}</h2><span style="font-size:12px;color:var(--muted)">${t('Kapasite: günlük {h}',{h:hrs(cap)})}</span></div><div class="panel-b">
      ${days.map(d=>{const c=dayCapacity(d),l=c.planned,w=c.work;return`<div class="hbar"><span class="n">${dayName(d.getDay())} ${d.getDate()}</span><div class="bar ${w&&c.over?'over':''}" style="height:10px;position:relative;overflow:visible"><i style="width:${l/mx2*100}%"></i><span style="position:absolute;top:-3px;bottom:-3px;left:${cap/mx2*100}%;width:2px;background:var(--text);opacity:.35"></span></div><span class="v">${w?`${num(l)} / ${hrs(c.available)}`:(l?hrs(l)+' · ':'')+t('İzin günü')}</span></div>`}).join('')}
    </div></section>
  </div>`;
};

