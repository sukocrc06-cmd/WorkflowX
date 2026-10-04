/* ================= TASK DETAIL  (#/app/tasks/:id) =================
   Answers: what is it, how long, when, will it make it, which project.
   Reading order (mobile shows exactly this order): title → description → status,
   priority, project, deadline, estimate, actual → time blocks → subtasks →
   dependencies → tags → comments → activity. Desktop moves the facts to a side column. */
function deadlineFit(x){
  if(!x.due)return{cls:'',text:t('Teslim tarihi yok')};
  if(x.status==='done')return{cls:'ok',text:t('Tamamlandı')};
  if(isLate(x))return{cls:'late',text:t('Teslim tarihi geçti')};
  const bl=blocksOf(x.id),lastEnd=bl.length?Math.max(...bl.map(b=>+new Date(b.end))):0,rem=remainingH(x);
  if(lastEnd>+new Date(x.due))return{cls:'late',text:t('Bir blok teslimden sonra')};
  if(rem>0)return{cls:'warn',text:t('{h} henüz planlanmadı',{h:hrs(rem)})};
  return{cls:'ok',text:t('Teslimden önce planlı')};
}
/* Estimated vs actual, e.g. "2 sa → 2 sa 35 dk (+29%)". Feeds personal estimate accuracy. */
function estVsActual(x){
  const est=+x.estimate||0,act=actualH(x);
  if(!act)return est?`<span class="muted">${t('Henüz kayıt yok')}</span>`:'—';
  if(!est)return`<b>${dur(act)}</b>`;
  if(x.status!=='done'){const pct=Math.round(act/est*100);return`<b>${dur(act)}</b> <small class="${pct>100?'late':'muted'}">${t('tahminin %{p}’i',{p:pct})}</small>`}
  const d=Math.round((act/est-1)*100);
  return`<b>${dur(act)}</b> <small class="${d>10?'late':d<-10?'ok-t':'muted'}">(${d>0?'+':''}${d}% ${t('tahmine göre')})</small>`;
}
V.task=()=>{
  const x=taskOf(UI.param);if(!x)return errorState('missing-task');
  const p=projectOf(x.projectId),bl=blocksOf(x.id).sort((a,b)=>new Date(a.start)-new Date(b.start));
  const now=Date.now(),next=bl.find(b=>+new Date(b.end)>now),fit=deadlineFit(x),done=x.status==='done';
  const deps=(x.deps||[]).map(taskOf).filter(Boolean),waiting=S.tasks.filter(y=>(y.deps||[]).includes(x.id));
  const act=actualH(x),est=+x.estimate||0,sh=scheduledH(x),running=S.timer&&S.timer.taskId===x.id&&!S.timer.paused,paused=S.timer&&S.timer.taskId===x.id&&S.timer.paused;
  const subs=x.subtasks||[],subDone=subs.filter(s=>s.done).length,acts=activityFor('task',x.id),coms=x.comments||[];
  const row=(k,v)=>`<div class="kv"><dt>${k}</dt><dd>${v}</dd></div>`;
  const depItem=y=>`<li>${y.status==='done'?svg('check','i s ok'):svg('clock','i s')} ${taskLink(y,'plain')} <span class="muted">· ${ST(y.status)}</span></li>`;
  const openDeps=deps.filter(y=>y.status!=='done');
  return`<a class="btn ghost sm back" href="#/app/tasks">${svg('left')}${t('Görevler')}</a>
  <div class="page-h detail-h"><div class="detail-title">
      <button type="button" class="chk big ${done?'on':''}" data-a="toggle" data-id="${x.id}" aria-label="${done?t('Tamamlanmadı olarak işaretle'):t('Tamamla')}: ${esc(x.title)}">${done?svg('check'):''}</button>
      <div><h1 class="${done?'is-done':''}">${esc(x.title)}</h1>
      <div class="row" style="margin-top:8px">${statusPill(x.status)}${prioPill(x.priority)}${p?projLink(p):`<span class="pill">${t('Projesiz')}</span>`}${x.recur?`<span class="pill acc">${svg('refresh','i s')} ${esc(recurText(x.recur))}</span>`:''}</div></div></div>
    <div class="row detail-actions">
      ${done?`<button type="button" class="btn" data-a="toggle" data-id="${x.id}">${svg('refresh')}${t('Yeniden aç')}</button>`:`<button type="button" class="btn primary" data-a="toggle" data-id="${x.id}">${svg('check')}${t('Tamamla')}</button>`}
      ${!done?(running?`<button type="button" class="btn rec" data-a="timerPause">${svg('pause')}${t('Duraklat')}</button><button type="button" class="btn icon" data-a="timerStop" aria-label="${t('Durdur ve kaydet')}">${svg('stop')}</button>`:paused?`<button type="button" class="btn" data-a="timerResume">${svg('play')}${t('Sürdür')}</button><button type="button" class="btn icon" data-a="timerStop" aria-label="${t('Durdur ve kaydet')}">${svg('stop')}</button>`:`<button type="button" class="btn" data-a="timerStart" data-id="${x.id}">${svg('play')}${t('Başlat')}</button>`):''}
      <button type="button" class="btn" data-a="editTask" data-id="${x.id}">${t('Düzenle')}</button>
      ${!done&&remainingH(x)>0&&mine(x)?`<button type="button" class="btn" data-a="planOne" data-id="${x.id}">${svg('spark')}${t('Planla')}</button>`:''}
      <button type="button" class="btn icon danger" data-a="delTask" data-id="${x.id}" aria-label="${t('Görevi sil')}">${svg('trash')}</button></div></div>

  ${openDeps.length&&!done?`<div class="callout warn" style="margin-bottom:14px">${svg('alert','i s')} ${t('Bu görev bekliyor: önce {x} bitmeli.',{x:openDeps.map(y=>'“'+esc(y.title)+'”').join(', ')})}</div>`:''}
  <ol class="chain" aria-label="${t('Görev, odak bloğu ve teslim ilişkisi')}">
    <li><small>${t('Süre')}</small><b>${est?hrs(est)+' '+t('tahmin'):t('Süre yok')}</b><span>${t('{a} planlı · {b} gerçekleşen',{a:hrs(sh),b:dur(act)})}</span></li>
    <li class="${next?'accent':''}"><small>${t('Sıradaki odak bloğu')}</small><b>${next?`${dayName(new Date(next.start).getDay(),true)} ${fTime(next.start)}–${fTime(next.end)}`:t('Yok')}</b><span>${bl.length?t('{n} blok toplam',{n:bl.length}):t('Henüz takvimde değil')}</span></li>
    <li class="${fit.cls}"><small>${t('Teslim')}</small><b>${x.due?fDT(x.due):'—'}</b><span>${fit.text}</span></li>
  </ol>

  <div class="detail-grid">
    <div class="detail-main">
      <section class="panel o1" aria-labelledby="d-desc"><div class="panel-h"><h2 id="d-desc">${t('Açıklama')}</h2></div><div class="panel-b">${x.desc?`<p class="prose">${esc(x.desc).replace(/\n/g,'<br>')}</p>`:`<p class="muted">${t('Açıklama yok.')} <button type="button" class="linkbtn" data-a="editTask" data-id="${x.id}">${t('Ekle')}</button></p>`}</div></section>
      <section class="panel o3" aria-labelledby="d-bl"><div class="panel-h"><h2 id="d-bl">${t('Zaman blokları')}</h2><span class="muted small">${t('{a} / {b} planlı',{a:hrs(sh),b:hrs(effEst(x))})}</span></div><div class="panel-b">
        ${bl.length?`<div class="list">${bl.map(b=>{const past=+new Date(b.end)<now,late=x.due&&+new Date(b.end)>+new Date(x.due);return`<div class="li ${past?'past':''}"><span class="tl-kind" style="background:${p?p.color:'var(--ink)'}"></span><div class="t"><a class="title" href="${hrefFor('calendar',b.start.slice(0,10),'day')}">${dayName(new Date(b.start).getDay())}, ${fDate(b.start)}</a><div class="meta"><span>${fTime(b.start)}–${fTime(b.end)}</span><span>${hrs((new Date(b.end)-new Date(b.start))/HOUR)}</span>${past?`<span>${t('geçti')}</span>`:''}${late?`<span class="late">${t('teslimden sonra')}</span>`:''}</div></div><button type="button" class="btn sm ghost" data-a="editBlock" data-id="${b.id}">${t('Zamanı değiştir')}</button><button type="button" class="btn sm icon ghost" data-a="delBlock" data-id="${b.id}" aria-label="${t('Bloğu kaldır')}">${svg('x')}</button></div>`}).join('')}</div>`
          :`<p class="muted">${t('Bu görev için henüz takvimde ayrılmış zaman yok.')}</p>`}
        ${!done&&remainingH(x)>0&&mine(x)?`<button type="button" class="btn sm" style="margin-top:10px" data-a="planOne" data-id="${x.id}">${svg('spark')}${t('Kalan {h} için plan öner',{h:hrs(remainingH(x))})}</button>`:''}
        ${!mine(x)?`<p class="hint">${t('Bu görev {x} kişisine atandı; senin takvimine planlanmaz.',{x:esc(memberName(x.assignee))})}</p>`:''}
      </div></section>
      <section class="panel o4" aria-labelledby="d-sub"><div class="panel-h"><h2 id="d-sub">${t('Alt görevler')}</h2>${subs.length?`<span class="muted small">${subDone}/${subs.length}</span>`:''}</div><div class="panel-b">
        ${subs.length?`<div class="bar sub-bar"><i style="width:${subDone/subs.length*100}%"></i></div><ul class="subs">${subs.map(st=>`<li class="${st.done?'done':''}"><button type="button" class="chk sm ${st.done?'on':''}" data-a="subToggle" data-id="${x.id}" data-s="${st.id}" role="checkbox" aria-checked="${st.done}" aria-label="${esc(st.title)}">${st.done?svg('check'):''}</button><span>${esc(st.title)}</span><button type="button" class="btn sm icon ghost" data-a="subDel" data-id="${x.id}" data-s="${st.id}" aria-label="${t('Alt görevi sil')}: ${esc(st.title)}">${svg('x')}</button></li>`).join('')}</ul>`:''}
        <form class="inline-add" data-f="sub" data-id="${x.id}"><label class="sr" for="subin">${t('Alt görev ekle')}</label><input id="subin" name="title" maxlength="200" autocomplete="off" placeholder="${t('Alt görev ekle…')}"><button class="btn sm">${t('Ekle')}</button></form>
      </div></section>
      <section class="panel o6" aria-labelledby="d-log"><div class="panel-h"><h2 id="d-log">${t('Zaman kayıtları')}</h2><span class="muted small">${dur(act)}</span></div><div class="panel-b">
        ${(x.logs||[]).length?`<div class="list">${x.logs.map((l,i)=>({l,i})).reverse().map(({l,i})=>`<div class="li"><div class="t"><span class="title plain">${fDate(l.start)} · ${fTime(l.start)}–${fTime(l.end)}</span><div class="meta"><span>${dur((new Date(l.end)-new Date(l.start))/HOUR)}</span>${l.manual?`<span>${t('elle eklendi')}</span>`:`<span>${t('zamanlayıcı')}</span>`}</div></div><button type="button" class="btn sm icon ghost" data-a="delLog" data-id="${x.id}" data-i="${i}" aria-label="${t('Kaydı sil')}">${svg('x')}</button></div>`).join('')}</div>`
          :`<p class="muted">${t('Henüz kayıt yok. Zamanlayıcıyı başlat ya da Düzenle’den süre ekle.')}</p>`}
      </div></section>
      <section class="panel o7" aria-labelledby="d-com"><div class="panel-h"><h2 id="d-com">${t('Yorumlar')}</h2>${coms.length?`<span class="muted small">${coms.length}</span>`:''}</div><div class="panel-b">
        ${coms.length?`<ul class="comments">${coms.map(c=>`<li>${avatar(c.author==='me'?'me':c.author)}<div><div class="c-h"><b>${esc(memberName(c.author==='me'?'me':c.author))}</b><time datetime="${esc(c.at)}">${fDate(c.at)} ${fTime(c.at)}</time><button type="button" class="linkbtn" data-a="commentDel" data-id="${x.id}" data-c="${c.id}">${t('Sil')}</button></div><p>${esc(c.text).replace(/\n/g,'<br>')}</p></div></li>`).join('')}</ul>`:''}
        <form class="comment-f" data-f="comment" data-id="${x.id}"><label class="sr" for="comin">${t('Yorum yaz')}</label><textarea id="comin" name="text" maxlength="2000" rows="2" placeholder="${t('Not veya yorum ekle…')}"></textarea><div class="row" style="justify-content:space-between"><small class="hint">${t('Yorumlar şimdilik bu cihazda saklanır; ekiple paylaşım hesaplarla gelecek.')}</small><button class="btn sm primary">${t('Yorum ekle')}</button></div></form>
      </div></section>
      <section class="panel o8" aria-labelledby="d-act"><div class="panel-h"><h2 id="d-act">${t('Aktivite geçmişi')}</h2></div><div class="panel-b">
        ${acts.length?`<ul class="acts">${acts.slice(0,12).map(a=>activityRow(a,{label:false})).join('')}</ul>${acts.length>12?`<details class="more-acts"><summary>${t('{n} eski kayıt daha',{n:acts.length-12})}</summary><ul class="acts">${acts.slice(12).map(a=>activityRow(a,{label:false})).join('')}</ul></details>`:''}`:`<p class="muted">${t('Bu görev için henüz kayıtlı değişiklik yok.')}</p>`}
      </div></section>
    </div>
    <aside class="detail-side" aria-label="${t('Görev ayrıntıları')}">
      <section class="panel o2" aria-labelledby="d-info"><div class="panel-h"><h2 id="d-info">${t('Ayrıntılar')}</h2></div><div class="panel-b"><dl class="kvs">
        ${row(t('Durum'),`<label class="sr" for="dst">${t('Durum')}</label><select id="dst" class="inline-select" data-c="status" data-id="${x.id}">${ENUM.status.map(k=>`<option value="${k}" ${k===x.status?'selected':''}>${ST(k)}</option>`).join('')}</select>`)}
        ${row(t('Öncelik'),prioPill(x.priority))}
        ${row(t('Proje'),p?projLink(p):t('Projesiz'))}
        ${row(t('Atanan'),`<label class="sr" for="das">${t('Atanan')}</label><select id="das" class="inline-select" data-c="assign" data-id="${x.id}">${memberOpts(x.assignee)}</select>`)}
        ${x.start?row(t('Başlangıç'),fDT(x.start)):''}
        ${row(t('Teslim'),x.due?`<span class="${isLate(x)?'late':''}">${relDue(x.due)}</span><br><small class="muted">${fDT(x.due)}</small>`:'—')}
        ${row(t('Tahmini süre'),est?hrs(est):'—')}
        ${row(t('Gerçekleşen'),estVsActual(x))}
        ${row(t('Tekrar'),x.recur?esc(recurText(x.recur)):'—')}
        ${row(t('Etiketler'),x.tags&&x.tags.length?x.tags.map(g=>`<span class="pill">#${esc(g)}</span>`).join(' '):'—')}
        ${row(t('Oluşturuldu'),fDate(x.createdAt))}
      </dl><button type="button" class="linkbtn" style="margin-top:10px" data-a="saveTaskTpl" data-id="${x.id}">${t('Şablon olarak kaydet')}</button></div></section>
      <section class="panel o5" aria-labelledby="d-dep"><div class="panel-h"><h2 id="d-dep">${t('Bağımlılıklar')}</h2><button type="button" class="btn sm ghost" data-a="editTask" data-id="${x.id}">${t('Düzenle')}</button></div><div class="panel-b">
        <h3 class="mini-h">${t('Önce bitmesi gerekenler')}</h3>${deps.length?`<ul class="deps">${deps.map(depItem).join('')}</ul>`:`<p class="muted small">${t('Yok')}</p>`}
        <h3 class="mini-h">${t('Bu görevi bekleyenler')}</h3>${waiting.length?`<ul class="deps">${waiting.map(depItem).join('')}</ul>`:`<p class="muted small">${t('Yok')}</p>`}
      </div></section>
    </aside>
  </div>
  <div class="m-actions" role="toolbar" aria-label="${t('Görev işlemleri')}">
    ${done?`<button type="button" class="btn" data-a="toggle" data-id="${x.id}">${svg('refresh')}${t('Yeniden aç')}</button>`:`<button type="button" class="btn primary" data-a="toggle" data-id="${x.id}">${svg('check')}${t('Tamamla')}</button>`}
    ${!done?(running?`<button type="button" class="btn rec" data-a="timerPause" aria-label="${t('Duraklat')}">${svg('pause')}</button>`:paused?`<button type="button" class="btn" data-a="timerResume" aria-label="${t('Sürdür')}">${svg('play')}</button>`:`<button type="button" class="btn" data-a="timerStart" data-id="${x.id}" aria-label="${t('Başlat')}">${svg('play')}</button>`):''}
    ${!done&&remainingH(x)>0&&mine(x)?`<button type="button" class="btn" data-a="planOne" data-id="${x.id}">${svg('spark')}${t('Planla')}</button>`:''}
    <button type="button" class="btn icon" data-a="editTask" data-id="${x.id}" aria-label="${t('Düzenle')}">${svg('wand')}</button>
  </div>`;
};
