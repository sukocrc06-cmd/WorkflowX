V.roadmap=()=>{
  const all=ROADMAP.flatMap(p=>p.items),cnt=s=>all.filter(i=>rmState(i[0])===s).length;
  const vers=['MVP','V2','V3'].map(v=>({v,pct:rmPct(ROADMAP.filter(p=>p.v===v).flatMap(p=>p.items))}));
  const stl={done:t('Tamamlandı'),proto:t('Kısmen'),todo:t('Başlanmadı')};
  return`<div class="page-h"><div><h1>${t('Yol Haritası')}</h1><p>${t('WorkFlowX’in geliştirme ilerlemesi. Bir maddeye tıklayarak durumunu değiştir.')}</p></div><button class="btn ghost" data-a="rmReset">${t('Varsayılana dön')}</button></div>
  <div class="panel" style="margin-bottom:16px"><div class="panel-b" style="padding-top:16px">
    <div style="display:flex;justify-content:space-between;align-items:baseline;flex-wrap:wrap;gap:8px"><div><span style="font:600 40px/1 var(--f-display);letter-spacing:-.04em">${cu(rmPct(all),'pct')}</span> <span style="color:var(--muted)">${t('genel ilerleme')}</span></div>
    <div class="legend"><span><i style="background:var(--ok)"></i>${stl.done} · ${cnt('done')}</span><span><i style="background:var(--warn)"></i>${stl.proto} · ${cnt('proto')}</span><span><i style="background:var(--border-strong)"></i>${stl.todo} · ${cnt('todo')}</span></div></div>
    <div class="seg" style="margin:10px 0 14px" role="img" aria-label="${stl.done} ${cnt('done')}, ${stl.proto} ${cnt('proto')}, ${stl.todo} ${cnt('todo')}"><i style="width:${cnt('done')/all.length*100}%;background:var(--ok)"></i><i style="width:${cnt('proto')/all.length*100}%;background:var(--warn)"></i></div>
    <div class="row" style="gap:18px">${vers.map(v=>`<div style="min-width:140px;flex:1"><div style="display:flex;justify-content:space-between;font-size:12px;color:var(--muted)"><span class="ver ${v.v==='MVP'?'mvp':''}">${v.v}</span><span>%${v.pct}</span></div><div class="bar" style="margin-top:6px"><i style="width:${v.pct}%"></i></div></div>`).join('')}<div style="min-width:140px;flex:1"><div style="display:flex;justify-content:space-between;font-size:12px;color:var(--muted)"><span class="ver">V4</span><span>${t('planlanmadı')}</span></div><div class="bar" style="margin-top:6px"></div></div></div>
    <p style="font-size:12px;color:var(--faint);margin:12px 0 0">${t('“Kısmen” = çalışıyor ama yalnızca tek kişi / bu cihaz için; ekip için bulut tarafı gerekiyor. Yarım puan sayılır.')}</p>
  </div></div>
  ${(()=>{const cur=ROADMAP.find(p=>p.now);if(!cur)return'';const pc=rmPct(cur.items),dn=cur.items.filter(i=>rmState(i[0])==='done').length,pr=cur.items.filter(i=>rmState(i[0])==='proto').length;
    return`<a class="panel rm-now" href="#rm-${cur.n}"><div class="rm-now-l">${ring(pc/100,t('Faz ilerlemesi'),'rm-ring')}<b class="rm-now-p">%${pc}</b></div><div class="rm-now-t"><small><span class="live on" aria-hidden="true"></span>${t('Şu anki faz')}</small><h2>${t('Faz')} ${cur.n} · ${LANG==='en'?cur.en:cur.tr}</h2>
      <p>${t('{a} tamamlandı · {b} kısmen · {c} madde',{a:dn,b:pr,c:cur.items.length})}</p></div></a>`})()}
  <div class="rm-grid">${ROADMAP.map(p=>{const pc=rmPct(p.items);return`<section class="panel rm-phase ${p.now?'is-now':''}" id="rm-${p.n}"><div class="panel-h"><h2 class="rm-h"><span class="num">${t('Faz')} ${p.n}</span>${LANG==='en'?p.en:p.tr}<span class="ver ${p.v==='MVP'?'mvp':''}">${p.v}</span>${p.now?`<span class="pill acc rm-now-pill">${t('Şu an')}</span>`:''}</h2><span style="font-size:13px;font-variant-numeric:tabular-nums;color:var(--muted)">%${pc}</span></div>
    <div class="panel-b"><div class="bar" style="margin-bottom:8px"><i style="width:${pc}%;background:${pc===100?'var(--ok)':'var(--accent)'}"></i></div>
    ${p.items.map(([id,tr,en])=>{const s=rmState(id),lab=LANG==='en'?en:tr;return`<button class="rm-item ${s}" data-a="rm" data-id="${id}" aria-label="${esc(lab)}: ${stl[s]}"><span class="rm-st ${s}">${s==='done'?svg('check'):''}</span><span class="lab">${esc(lab)}</span><span class="stl">${stl[s]}</span></button>`}).join('')}</div></section>`}).join('')}</div>`;
};

