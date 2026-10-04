/* ================= TEAM  (#/app/team) =================
   Real, local data: members you add can be assigned tasks; their workload is the
   open estimated work assigned to them versus the weekly capacity you set.
   Invitations, sign-in and server-side permissions arrive with the backend. */
V.team=()=>{
  const ms=allMembers(),loads=ms.map(m=>({m,l:memberLoad(m.id)}));
  const meCan=a=>can('owner',a);
  return`<div class="page-h"><div><h1>${t('Ekip')}</h1><p>${t('Kim neye çalışıyor, kimin ne kadar yeri var.')}</p></div>${meCan('members.manage')?`<button type="button" class="btn primary" data-a="newMember">${svg('plus')}${t('Üye ekle')}</button>`:''}</div>
  <div class="callout" style="margin-bottom:16px">${svg('lock','i s')} <span>${t('Ekip bilgileri şimdilik yalnızca bu cihazda tutulur; davet e-postası gönderilmez ve üyeler giriş yapamaz. Hesaplar ve paylaşılan çalışma alanları backend fazında gelecek.')}</span></div>
  <section class="panel" aria-labelledby="tm-h"><div class="panel-h"><h2 id="tm-h">${t('Üyeler')}</h2><span class="muted small">${t('{n} kişi',{n:ms.length})}</span></div>
    <div class="team-table" role="table" aria-label="${t('Üyeler')}">
      <div class="tt-row tt-head" role="row"><span role="columnheader">${t('Kişi')}</span><span role="columnheader">${t('Rol')}</span><span role="columnheader">${t('Atanan görev')}</span><span role="columnheader">${t('İş yükü / haftalık kapasite')}</span><span role="columnheader">${t('Şu anki proje')}</span><span role="columnheader"><span class="sr">${t('İşlemler')}</span></span></div>
      ${loads.map(({m,l})=>`<div class="tt-row" role="row">
        <span role="cell" class="tt-p">${avatar(m.id,'av-md')}<span><b>${esc(m.name)}</b>${m.me&&S.profile.name?` <small class="muted">(${t('sen')})</small>`:''}<br><small class="muted">${m.email?esc(m.email):m.me?t('Çalışma alanı sahibi'):t('E-posta yok')}</small></span></span>
        <span role="cell">${m.me?`<span class="pill">${t(ROLE_K.owner)}</span>`:`<label class="sr" for="rl-${m.id}">${t('Rol')}: ${esc(m.name)}</label><select id="rl-${m.id}" class="inline-select" data-c="role" data-id="${m.id}">${ROLES.filter(r=>r!=='owner').map(r=>`<option value="${r}" ${r===m.role?'selected':''}>${t(ROLE_K[r])}</option>`).join('')}</select>`}</span>
        <span role="cell">${l.tasks.length?`<a href="#/app/tasks" data-a="tasksFilter" data-v="${m.me?'open':'others'}">${t('{n} açık görev',{n:l.tasks.length})}</a>`:`<span class="muted">${t('Yok')}</span>`}</span>
        <span role="cell"><div class="tt-load"><div class="bar ${l.over?'over':''}"><i style="width:${l.cap?Math.min(100,l.hours/l.cap*100):0}%"></i></div><small class="${l.over?'late':'muted'}">${hrs(l.hours)} / ${hrs(l.cap)}${l.over?' · '+t('aşırı yüklü'):' · '+t('{h} müsait',{h:hrs(l.free)})}</small></div></span>
        <span role="cell">${l.project?projLink(l.project):`<span class="muted">—</span>`}</span>
        <span role="cell" class="tt-a">${m.me?`<a class="btn sm ghost" href="#/app/settings/profile">${t('Ayarlar')}</a>`:`<button type="button" class="btn sm ghost" data-a="editMember" data-id="${m.id}">${t('Düzenle')}</button><button type="button" class="btn sm icon ghost" data-a="delMember" data-id="${m.id}" aria-label="${t('Üyeyi kaldır')}: ${esc(m.name)}">${svg('trash')}</button>`}</span>
      </div>`).join('')}
    </div>
    ${!S.members.length?`<div class="empty-inline" style="margin:0 18px 18px">${illo('users')}<div><b>${t('Henüz ekip üyesi yok')}</b><p>${t('Üye eklediğinde görevleri atayabilir, kimin ne kadar yükü olduğunu görebilirsin.')}</p><button type="button" class="btn sm primary" data-a="newMember">${svg('plus')}${t('İlk üyeyi ekle')}</button></div></div>`:''}
  </section>
  <section class="panel" style="margin-top:16px" aria-labelledby="perm-h"><div class="panel-h"><h2 id="perm-h">${t('Roller ve yetkiler')}</h2><span class="muted small">${t('Backend fazında sunucu tarafında da uygulanacak')}</span></div>
    <div class="perm-scroll" tabindex="0" role="region" aria-labelledby="perm-h"><table class="perm"><thead><tr><th scope="col">${t('Yetki')}</th>${ROLES.map(r=>`<th scope="col">${t(ROLE_K[r])}</th>`).join('')}</tr></thead>
      <tbody>${PERMS.map(([k,l])=>`<tr><th scope="row">${t(l)}</th>${ROLES.map(r=>`<td>${can(r,k)?`<span class="ok-t">${svg('check','i s')}<span class="sr">${t('Var')}</span></span>`:`<span class="muted"><span aria-hidden="true">—</span><span class="sr">${t('Yok')}</span></span>`}</td>`).join('')}</tr>`).join('')}</tbody></table></div>
  </section>`;
};
