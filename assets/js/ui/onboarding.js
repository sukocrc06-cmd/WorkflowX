/* ================= ONBOARDING =================
   Three short, skippable steps — only what planning really needs:
   1 You (name, role) · 2 Working time (days, hours, how much can be booked) · 3 First work (project + task).
   Every step can be skipped; nothing is required to reach the app. */
const OB={step:1,data:{}};
/* Small animated scene per step (decorative; motion off with reduced motion). */
const OB_ART={
 1:'<svg viewBox="0 0 400 92" preserveAspectRatio="xMidYMid meet"><circle class="al pop1" cx="200" cy="46" r="34"/><circle class="b pop1" cx="200" cy="38" r="12"/><path class="b pop1" d="M178 72a22 22 0 0 1 44 0z"/><g class="pop2"><rect class="b" x="238" y="18" width="84" height="22" rx="8"/><rect class="a" x="246" y="26" width="8" height="6" rx="3"/><rect class="s" x="260" y="26" width="52" height="6" rx="3"/></g><g class="pop3"><rect class="b" x="80" y="52" width="80" height="22" rx="8"/><rect class="s" x="90" y="60" width="44" height="6" rx="3"/><circle class="g" cx="148" cy="63" r="4"/></g></svg>',
 2:'<svg viewBox="0 0 400 92" preserveAspectRatio="xMidYMid meet"><g class="pop1"><circle class="b" cx="120" cy="46" r="30"/><g class="spin" style="transform-origin:120px 46px"><path class="ln" d="M120 46V24" stroke-width="3" stroke-linecap="round"/></g><path class="ln" d="M120 46l12 8" stroke-width="3" stroke-linecap="round"/><circle class="a" cx="120" cy="46" r="4"/></g><g class="pop2">'+[0,1,2,3,4,5,6].map(i=>'<rect class="'+(i<5?'al':'s')+'" x="'+(176+i*28)+'" y="30" width="22" height="32" rx="6"/>').join('')+'</g><rect class="a slide" x="176" y="68" width="134" height="6" rx="3"/></svg>',
 3:'<svg viewBox="0 0 400 92" preserveAspectRatio="xMidYMid meet"><g class="pop1"><rect class="b" x="60" y="20" width="130" height="52" rx="10"/><rect class="a" x="72" y="32" width="10" height="10" rx="3"/><rect class="s" x="88" y="33" width="80" height="8" rx="4"/><rect class="s" x="72" y="52" width="60" height="7" rx="3.5"/></g><path class="ln pop2" d="M196 46h30" stroke-width="2" stroke-dasharray="4 4"/><g class="pop3"><rect class="b" x="232" y="14" width="110" height="64" rx="10"/><path class="ln" d="M232 32h110" stroke-width="1.5"/><rect class="s" x="242" y="40" width="20" height="12" rx="3"/><rect class="a slide" x="266" y="40" width="44" height="12" rx="3"/><rect class="s" x="242" y="58" width="20" height="12" rx="3"/><rect class="s" x="314" y="58" width="20" height="12" rx="3"/></g></svg>'
};
const OB_ROLES=['Yazılım geliştirici','Proje yöneticisi','Tasarımcı','Serbest çalışan','Öğrenci','Ofis çalışanı','Diğer'];
function onboard(step=1){
  OB.step=step;const d=OB.data,st=S.settings;
  const dots=`<ol class="ob-steps" aria-label="${t('Adım {a} / {b}',{a:step,b:3})}">${[1,2,3].map(i=>`<li class="${i===step?'on':i<step?'done':''}" ${i===step?'aria-current="step"':''}><span>${i}</span></li>`).join('')}</ol>`;
  const hours=[...Array(24)].map((_,h)=>h);
  const body={
    1:`<p class="muted" style="margin-top:0">${t('Birkaç bilgiyle planlamayı sana göre ayarlayalım. Her adımı atlayabilirsin.')}</p>
      <div class="f2"><div class="f"><label for="on">${t('Adın')}</label><input id="on" name="name" maxlength="120" autocomplete="given-name" value="${esc(d.name??S.profile.name)}"></div>
      <div class="f"><label for="or">${t('Rolün')}</label><select id="or" name="role"><option value="">${t('Seç…')}</option>${OB_ROLES.map(r=>`<option value="${esc(r)}" ${(d.role??S.profile.role)===r?'selected':''}>${t(r)}</option>`).join('')}</select></div></div>`,
    2:`<p class="muted" style="margin-top:0">${t('WorkFlowX işlerini yalnızca bu saatlere yerleştirir.')}</p>
      <fieldset class="f" style="border:0;padding:0"><legend class="lbl" style="margin-bottom:6px">${t('Çalışma günleri')}</legend><div class="row">${[1,2,3,4,5,6,0].map(x=>`<label class="pill daypick"><input type="checkbox" name="wd" value="${x}" ${(d.workDays||st.workDays).includes(x)?'checked':''}> ${dayName(x,true)}</label>`).join('')}</div></fieldset>
      <div class="f3"><div class="f"><label for="ows">${t('Başlangıç')}</label><select id="ows" name="ws">${hours.map(h=>`<option value="${h}" ${(d.workStart??st.workStart)===h?'selected':''}>${pad(h)}:00</option>`).join('')}</select></div>
      <div class="f"><label for="owe">${t('Bitiş')}</label><select id="owe" name="we">${hours.map(h=>h+1).map(h=>`<option value="${h}" ${(d.workEnd??st.workEnd)===h?'selected':''}>${pad(h%24)}:00</option>`).join('')}</select></div>
      <div class="f"><label for="omd">${t('Günde planlanabilir süre')}</label><input id="omd" type="number" name="md" min="1" max="16" step="0.5" value="${d.maxDaily??st.maxDaily}" aria-describedby="omd-h"></div></div>
      <p class="hint" id="omd-h">${t('Toplantılar dahil. Kalan zaman mola ve beklenmedik işler için boş kalır.')} · ${t('Saat dilimi: {z}',{z:esc(Intl.DateTimeFormat().resolvedOptions().timeZone||'—')})}</p>`,
    3:`<p class="muted" style="margin-top:0">${t('İlk işini yaz; istersen bir projeye koy. Süre yazarsan takvime yerleştirmeyi önereceğiz.')}</p>
      <div class="f"><label for="op">${t('İlk proje')} <span class="muted">(${t('isteğe bağlı')})</span></label><input id="op" name="project" maxlength="120" placeholder="${t('Örn. Müşteri web sitesi')}" value="${esc(d.project||'')}"></div>
      <div class="f smart"><label for="ot">${t('İlk görev')} <span class="muted">(${t('isteğe bağlı')})</span></label><input id="ot" name="task" maxlength="300" autocomplete="off" placeholder="${t('Örn. Sunumu hazırla cuma 3 saat yüksek')}" value="${esc(d.task||'')}"><div class="qprev" id="ob-prev" aria-live="polite">${d.task?qPreview(parseQuick(d.task)):qhint()}</div></div>`
  }[step];
  openDlg(`<form class="ob">${dlgHead(step===1?t('WorkFlowX’e hoş geldin'):step===2?t('Ne zaman çalışıyorsun?'):t('İlk işin')) }${dots}<div class="dlg-b"><span class="ob-art" aria-hidden="true">${OB_ART[step]}</span>${body}<div class="err" role="alert"></div></div>
    <div class="dlg-f"><button type="button" class="btn ghost left" data-a="obSkip">${t('Atla')}</button>${step===1?`<button type="button" class="btn" data-a="obDemo">${t('Demo ile keşfet')}</button>`:`<button type="button" class="btn" data-a="obBack">${t('Geri')}</button>`}<button class="btn primary">${step<3?t('İleri'):t('Başla')}</button></div></form>`,(fd)=>{
    if(step===1){OB.data.name=String(fd.get('name')||'').trim().slice(0,120);OB.data.role=String(fd.get('role')||'').slice(0,120);onboard(2);return KEEP_OPEN}
    if(step===2){const ws=+fd.get('ws'),we=+fd.get('we'),md=+fd.get('md'),days=fd.getAll('wd').map(Number);
      if(!(we>ws))return t('Bitiş, başlangıçtan sonra olmalı.');if(!days.length)return t('En az bir çalışma günü seç.');if(!(md>=0.5)||md>we-ws)return t('Planlanabilir süre, çalışma saatlerinden uzun olamaz ({h}).',{h:hrs(we-ws)});
      Object.assign(OB.data,{workStart:ws,workEnd:we,maxDaily:md,workDays:days});onboard(3);return KEEP_OPEN}
    OB.data.project=String(fd.get('project')||'').trim().slice(0,120);OB.data.task=String(fd.get('task')||'').trim();
    const r=OB.data.task?parseQuick(OB.data.task):null;if(r&&!r.title)return t('Görev adı gerekli.');
    finishOnboarding(r);
  });
}
function finishOnboarding(r){
  const d=OB.data;let task=null,proj=null;
  commit(t('Başlangıç ayarları'),()=>{
    S.profile={name:d.name??S.profile.name,role:d.role??S.profile.role,tz:Intl.DateTimeFormat().resolvedOptions().timeZone||''};
    if(d.workDays)Object.assign(S.settings,{workStart:d.workStart,workEnd:d.workEnd,maxDaily:d.maxDaily,workDays:d.workDays});
    if(d.project){proj={id:uid(),name:d.project,desc:'',color:COLORS[0],start:'',deadline:'',status:'active',archived:false,archivedAt:null,createdAt:toLocal(new Date()),demo:false};S.projects.push(proj);logAct('project',proj.id,'created',{label:proj.name})}
    if(r){task=newTask({title:r.title,priority:r.prio,due:r.due?toLocal(r.due):'',estimate:r.est,projectId:proj?proj.id:(r.proj?r.proj.id:null),tags:r.tags,recur:r.recur});S.tasks.push(task);logAct('task',task.id,'created',{label:task.title})}
    S.onboarded=true;
  });
  OB.data={};closeDlg();
  setTimeout(()=>{go(isMobile()?'today':'overview');
    if(task&&task.estimate)toast(t('Hazırsın. “{x}” takvime yerleştirilsin mi?',{x:task.title}),{label:t('Takvime yerleştir'),fn:()=>suggestFor([task])});
    else toast(t('Hazırsın. İlk görevini N ile ekleyebilirsin.'))},0);
}
document.addEventListener('input',e=>{if(e.target.id==='ot'){const b=$('#ob-prev');if(b)b.innerHTML=qPreview(parseQuick(e.target.value))}});
