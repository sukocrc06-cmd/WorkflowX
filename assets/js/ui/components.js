/* ================= COMPONENTS =================
   Small HTML builders shared by the pages. Rule: every user-supplied string is
   passed through esc(); ids are validated on load, so they are attribute-safe. */
const V={};
/* Duotone empty-state illustrations (inline SVG, 132×88). Class roles:
   .bl soft accent blob · .b card (surface + outline) · .s quiet fill · .a accent · .al soft accent · .as accent stroke · .g success.
   Colours come from tokens, so they follow theme and the chosen accent. .fl elements float gently (off with reduced motion). */
const ILLO={
 cal:'<circle class="bl" cx="66" cy="46" r="38"/><rect class="b" x="30" y="16" width="70" height="58" rx="9"/><path class="a" d="M30 25a9 9 0 0 1 9-9h52a9 9 0 0 1 9 9v5H30z" stroke="none"/><path d="M46 11v10M84 11v10"/><g class="s" stroke="none"><rect x="40" y="38" width="10" height="8" rx="2"/><rect x="55" y="38" width="10" height="8" rx="2"/><rect x="70" y="38" width="10" height="8" rx="2"/><rect x="40" y="52" width="10" height="8" rx="2"/><rect x="70" y="52" width="10" height="8" rx="2"/></g><rect class="a" x="55" y="52" width="10" height="8" rx="2" stroke="none"/><g class="fl"><circle class="b" cx="104" cy="64" r="12"/><path d="M104 58v6l4 3"/></g><path class="as" d="M20 24l2 4 4 2-4 2-2 4-2-4-4-2 4-2z" stroke-width="1.2"/>',
 check:'<circle class="bl" cx="66" cy="46" r="38"/><rect class="b" x="28" y="14" width="76" height="18" rx="6"/><rect class="b" x="28" y="36" width="76" height="18" rx="6"/><rect class="b" x="28" y="58" width="76" height="18" rx="6"/><circle class="g" cx="39" cy="23" r="5" stroke="none"/><path d="M36.8 23l1.6 1.6 3-3.2" stroke="#fff" stroke-width="1.6"/><circle cx="39" cy="45" r="4.5"/><circle cx="39" cy="67" r="4.5"/><path class="s-l" d="M50 23h34M50 45h44M50 67h26"/><g class="fl"><circle class="a" cx="108" cy="16" r="9" stroke="none"/><path d="M108 12v8M104 16h8" stroke="#fff" stroke-width="1.8"/></g>',
 folder:'<circle class="bl" cx="66" cy="46" r="38"/><path class="al" d="M26 26a6 6 0 0 1 6-6h18l7 7h43a6 6 0 0 1 6 6v36a6 6 0 0 1-6 6H32a6 6 0 0 1-6-6z" stroke="none"/><rect class="b fl" x="40" y="18" width="46" height="34" rx="4"/><path class="s-l" d="M47 28h26M47 35h32M47 42h18"/><path class="b" d="M22 40a6 6 0 0 1 6-6h78a6 6 0 0 1 5.8 7.5l-6 28a6 6 0 0 1-5.8 4.5H32a6 6 0 0 1-5.9-5z"/><circle class="a" cx="66" cy="56" r="4" stroke="none"/>',
 chart:'<circle class="bl" cx="66" cy="46" r="38"/><rect class="b" x="24" y="14" width="84" height="62" rx="9"/><g class="s" stroke="none"><rect x="36" y="48" width="10" height="18" rx="2.5"/><rect x="52" y="38" width="10" height="28" rx="2.5"/><rect x="84" y="42" width="10" height="24" rx="2.5"/></g><rect class="a" x="68" y="28" width="10" height="38" rx="2.5" stroke="none"/><path class="as fl" d="M34 40l18-10 16 6 26-16" stroke-width="2"/><circle class="a fl" cx="94" cy="20" r="3" stroke="none"/>',
 spark:'<circle class="bl" cx="66" cy="46" r="38"/><rect class="b" x="22" y="16" width="88" height="58" rx="9"/><path class="s-l" d="M22 35h88M22 55h88" stroke-dasharray="2 4"/><rect class="s" x="30" y="22" width="30" height="9" rx="3" stroke="none"/><rect class="s" x="70" y="41" width="30" height="9" rx="3" stroke="none"/><rect class="al" x="44" y="61" width="40" height="9" rx="3" stroke="none"/><rect class="as fl" x="44" y="61" width="40" height="9" rx="3" stroke-dasharray="4 3"/><path class="a fl" d="M104 10l2.5 5.5L112 18l-5.5 2.5L104 26l-2.5-5.5L96 18l5.5-2.5z" stroke="none"/>',
 users:'<circle class="bl" cx="66" cy="46" r="38"/><circle class="b" cx="54" cy="36" r="12"/><path class="b" d="M30 76a24 24 0 0 1 48 0z"/><circle class="al" cx="86" cy="40" r="9" stroke="none"/><path class="al" d="M72 76a16 16 0 0 1 32 0z" stroke="none"/><g class="fl"><circle class="a" cx="104" cy="22" r="8" stroke="none"/><path d="M104 18.5v7M100.5 22h7" stroke="#fff" stroke-width="1.8"/></g>',
 bell:'<circle class="bl" cx="66" cy="46" r="38"/><g class="fl"><path class="b" d="M50 60V42a16 16 0 0 1 32 0v18l5 6H45z"/><path d="M60 72a6 6 0 0 0 12 0"/><circle class="a" cx="80" cy="30" r="5" stroke="none"/></g><path class="as" d="M32 34a30 30 0 0 1 8-12M100 34a30 30 0 0 0-8-12" stroke-width="1.6"/>',
 search:'<circle class="bl" cx="66" cy="46" r="38"/><rect class="b" x="24" y="18" width="62" height="52" rx="8"/><path class="s-l" d="M34 32h40M34 42h30M34 52h36"/><g class="fl"><circle class="b" cx="88" cy="50" r="15"/><circle class="al" cx="88" cy="50" r="10" stroke="none"/><path d="M99 61l10 10" stroke-width="3"/></g>',
 party:'<circle class="bl" cx="66" cy="46" r="38"/><circle class="g" cx="66" cy="46" r="20" stroke="none"/><path d="M57 46l6 6 12-12" stroke="#fff" stroke-width="3"/><g class="fl"><rect class="a" x="28" y="20" width="6" height="6" rx="1.5" stroke="none" transform="rotate(20 31 23)"/><circle class="a" cx="102" cy="26" r="3.5" stroke="none"/><path class="as" d="M100 66l6 4M30 64l-5 5M96 14l2 6" stroke-width="2"/><rect class="al" x="104" y="50" width="7" height="7" rx="1.5" stroke="none" transform="rotate(-18 107 53)"/></g>',
 inbox:'<circle class="bl" cx="66" cy="46" r="38"/><rect class="b fl" x="44" y="12" width="44" height="30" rx="5"/><path class="s-l fl" d="M52 22h28M52 30h18"/><path class="b" d="M26 50l10-16h60l10 16v20a6 6 0 0 1-6 6H32a6 6 0 0 1-6-6z"/><path class="al" d="M26 50h24a16 8 0 0 0 32 0h24v20a6 6 0 0 1-6 6H32a6 6 0 0 1-6-6z" stroke="none"/>',
 archive:'<circle class="bl" cx="66" cy="46" r="38"/><rect class="al fl" x="26" y="16" width="80" height="16" rx="5" stroke="none"/><rect class="b" x="30" y="30" width="72" height="44" rx="6"/><rect class="a" x="56" y="40" width="20" height="6" rx="3" stroke="none"/>',
 timer:'<circle class="bl" cx="66" cy="46" r="38"/><circle class="b" cx="66" cy="48" r="26"/><path d="M60 16h12M66 16v6M88 26l4-4"/><path class="as" d="M66 48V32" stroke-width="2.4"/><path class="a" d="M66 48 L66 30 A18 18 0 0 1 83 42 Z" stroke="none" opacity=".25"/><circle class="a" cx="66" cy="48" r="3" stroke="none"/>'
};
const illo=n=>`<svg class="illo" viewBox="0 0 132 88" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${ILLO[n]||ILLO.check}</svg>`;
const emptyState=(icon,title,text,btn,act,extra='')=>`<div class="empty">${illo(icon)}<h3>${title}</h3><p>${text}</p>${btn||extra?`<div class="row" style="justify-content:center;margin-top:16px">${btn?`<button type="button" class="btn primary" ${act}>${svg('plus')}${btn}</button>`:''}${extra}</div>`:''}</div>`;
/* Project badge: allow-listed icon on a tint of the (hex-validated) project colour. */
const projIcon=(p,cls='')=>`<span class="p-ic ${cls}" style="--pc:${p.color}" aria-hidden="true">${svg(p.icon||'folder')}</span>`;
const prioPill=p=>`<span class="pill pr-${p}">${PR(p)}</span>`;
function projPill(id){const p=projectOf(id);return p?`<span class="pill"><i class="dotc" style="background:${p.color}"></i>${esc(p.name)}</span>`:''}
const timerBtn=x=>{const mine=S.timer&&S.timer.taskId===x.id,on=mine&&!S.timer.paused,l=on?t('Duraklat'):mine?t('Sürdür'):t('Zamanlayıcıyı başlat');return`<button type="button" class="btn sm icon ${on?'rec':'ghost'}" data-a="${on?'timerPause':mine?'timerResume':'timerStart'}" data-id="${x.id}" aria-label="${l}: ${esc(x.title)}" title="${l}">${svg(on?'pause':'play')}</button>`};
const projStatus=s=>s==='done'?t('Tamamlandı'):s==='hold'?t('Beklemede'):t('Aktif');
/* Accessible small help: native title for pointer users, text for screen readers. */
const statusPill=s=>`<span class="pill st-${s}">${ST(s)}</span>`;
const taskLink=(x,cls='title')=>`<a class="${cls}" href="${hrefFor('task',x.id)}">${esc(x.title)}</a>`;
const projLink=p=>`<a class="plink" href="${hrefFor('project',p.id)}"><i class="dotc" style="background:${p.color}"></i>${esc(p.name)}</a>`;
function taskRow(x,{compact=false,why=false}={}){
  const sh=scheduledH(x),est=+x.estimate||0,act=actualH(x);
  return`<div class="li ${x.status==='done'?'done':''}" data-flip="t-${x.id}">
    <button type="button" class="chk ${x.status==='done'?'on':''}" data-a="toggle" data-id="${x.id}" aria-label="${x.status==='done'?t('Tamamlanmadı olarak işaretle'):t('Tamamla')}: ${esc(x.title)}">${x.status==='done'?svg('check'):''}</button>
    <div class="t">${taskLink(x)}
      <div class="meta">${why&&x.status!=='done'?`<span class="why-chip">${why4today(x)}</span>`:''}${x.due?`<span class="${isLate(x)?'late':''}">${svg('clock','i s')} ${relDue(x.due)}</span>`:''}${est?`<span>${hrs(est)}</span>`:''}${act>=0.05?`<span title="${t('Gerçekleşen')}">⏱ ${dur(act)}</span>`:''}${x.status!=='done'&&x.status!=='todo'?`<span>${ST(x.status)}</span>`:''}${x.subtasks&&x.subtasks.length?`<span title="${t('Alt görevler')}">☑ ${x.subtasks.filter(s=>s.done).length}/${x.subtasks.length}</span>`:''}${x.recur?`<span title="${esc(recurText(x.recur))}">↻</span>`:''}${x.assignee?`<span class="as-chip">${avatar(x.assignee)} ${esc(memberName(x.assignee))}</span>`:''}${(x.tags||[]).map(g=>`<span>#${esc(g)}</span>`).join('')}</div></div>
    ${compact?prioPill(x.priority):`<div class="cols">${projPill(x.projectId)}${prioPill(x.priority)}
      ${est&&x.status!=='done'?`<div class="sched">${t('{a} / {b} planlı',{a:hrs(sh),b:hrs(effEst(x))})}<div class="bar"><i style="width:${Math.min(100,sh/Math.max(effEst(x),0.1)*100)}%"></i></div></div>`:'<div class="sched"></div>'}
      ${x.status!=='done'?timerBtn(x):''}
      ${x.status!=='done'&&remainingH(x)>0?`<button type="button" class="btn sm" data-a="planOne" data-id="${x.id}">${svg('spark')}${t('Planla')}</button>`:''}
      <button type="button" class="btn sm icon ghost danger del" data-a="delTask" data-id="${x.id}" aria-label="${t('Sil')}: ${esc(x.title)}">${svg('trash')}</button></div>`}
  </div>`;
}
function agendaFor(day){
  const s=+sod(day),e=dayEnd(day);
  const ev=S.events.filter(x=>overlap(+new Date(x.start),+new Date(x.end),s,e)>0).map(x=>({k:'ev',x,st:new Date(x.start)}));
  const bl=S.blocks.filter(x=>overlap(+new Date(x.start),+new Date(x.end),s,e)>0).map(x=>({k:'bl',x,st:new Date(x.start)}));
  return[...ev,...bl].sort((a,b)=>a.st-b.st);
}
function agendaRow({k,x}){const tk=k==='bl'?taskOf(x.taskId):null,p=tk?projectOf(tk.projectId):null;const c=k==='ev'?EVT_C[x.type]:(p?p.color:'var(--accent)');const past=new Date(x.end)<new Date();
  return`<div class="li${past?' past':''}"><span class="tl-kind" style="background:${c}"></span><span class="time-col">${fTime(x.start)} – ${fTime(x.end)}</span><div class="t"><button type="button" class="title" data-a="${k==='ev'?'editEvent':'blockInfo'}" data-id="${x.id}">${esc(k==='ev'?x.title:(tk?tk.title:t('Silinmiş görev')))}</button><div class="meta">${k==='ev'?EV(x.type)+(x.source==='ics'?' · .ics':''):t('Odak bloğu')}${p?' · '+esc(p.name):''}${x.type!=='milestone'&&conflictsWith(+new Date(x.start),+new Date(x.end),x.id).length?` · <span class="late">${t('Çakışma')}</span>`:''}</div></div>${tk&&tk.status!=='done'?timerBtn(tk):''}</div>`}
const greetName=()=>S.profile.name?', <em class="nm">'+esc(S.profile.name.split(' ')[0])+'</em>':'';

