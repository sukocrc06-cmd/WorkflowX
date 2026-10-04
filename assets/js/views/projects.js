/* ================= PROJECTS  (#/app/projects) ================= */
function projCard(p){
  const g=projProgress(p),open=S.tasks.filter(x=>x.projectId===p.id&&x.status!=='done'),h=projectHealth(p);
  return`<a class="panel proj ${p.archived?'archived':''}" href="${hrefFor('project',p.id)}" style="--pc:${p.color}"><span class="proj-cover" aria-hidden="true"></span>${projIcon(p,'lg')}<div class="proj-top"><h2 class="card-h">${esc(p.name)}</h2>${p.demo?`<span class="pill demo">${t('Demo')}</span>`:''}${p.archived?`<span class="pill">${t('Arşivde')}</span>`:healthPill(h)}</div>
    <p>${esc(p.desc||'')}</p><div class="bar"><i style="width:${g.pct}%;background:${p.color}"></i></div>
    <div class="foot"><span>%${g.pct} · ${t('{a}/{b} görev',{a:g.done,b:g.total})}</span><span>${p.deadline?t('Teslim')+' '+fDate(parseDay(p.deadline)):t('Teslim yok')}</span></div>
    <div class="foot"><span>${t('{h} kalan iş',{h:hrs(open.reduce((s,x)=>s+effEst(x),0))})}</span><span>${projStatus(p.status)}</span></div>
    ${!p.archived&&h.k!=='healthy'&&h.k!=='completed'?`<small class="health-why">${esc(h.why)}</small>`:''}</a>`;
}
V.projects=()=>{
  const arch=UI.projArchived,list=S.projects.filter(p=>!!p.archived===arch),nArch=S.projects.filter(p=>p.archived).length;
  return`<div class="page-h"><div><h1>${t('Projeler')}</h1><p>${t('İlerleme tahmini sürelere göre; sağlık durumu teslim tarihleri ve boş kapasiteye göre hesaplanır.')}</p></div><button class="btn primary" data-a="newProject">${svg('plus')}${t('Yeni proje')}</button></div>
  <div class="row" style="margin-bottom:14px"><div class="tabs" role="tablist"><span class="tab-ind" data-flip="ind-pa"></span><button role="tab" aria-selected="${!arch}" class="${arch?'':'on'}" data-a="projArchived" data-v="0">${t('Aktif')} <span style="color:var(--faint)">${S.projects.length-nArch}</span></button><button role="tab" aria-selected="${arch}" class="${arch?'on':''}" data-a="projArchived" data-v="1">${t('Arşiv')} <span style="color:var(--faint)">${nArch}</span></button></div></div>
  ${list.length?`<div class="proj-grid">${list.map(projCard).join('')}</div>`
  :arch?`<div class="panel">${emptyState('archive',t('Arşivde proje yok'),t('Biten ya da askıya alınan projeleri arşivleyerek listeni sade tutabilirsin. Arşivlenen projelerin görevleri korunur.'),null,'',`<button type="button" class="btn" data-a="projArchived" data-v="0">${t('Aktif projelere dön')}</button>`)}</div>`
  :`<div class="panel">${emptyState('folder',t('İlk projeni oluştur'),t('İlk projeni oluştur ya da “Yeni Müşteri Projesi” şablonuyla altı adımlı bir planla başla.'),t('Proje oluştur'),'data-a="newProject"')}</div>`}
  ${!arch&&S.templates.filter(x=>x.kind==='project').length?`<section class="plain-sec"><div class="sec-h"><h2>${t('Proje şablonların')}</h2></div><div class="list">${S.templates.filter(x=>x.kind==='project').map(tp=>`<div class="li"><div class="t"><b>${esc(tp.name)}</b><div class="meta"><span>${t('{n} görev',{n:tp.items.length})}</span></div></div><button type="button" class="btn sm icon ghost" data-a="delTpl" data-id="${tp.id}" aria-label="${t('Şablonu sil')}: ${esc(tp.name)}">${svg('trash')}</button></div>`).join('')}</div></section>`:''}`;
};
