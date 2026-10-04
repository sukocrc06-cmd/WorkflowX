/* ================= DIALOGS & FORMS =================
   Native <dialog> (focus trap, Esc, inert background) with an exit animation.
   Every form validates its input again on save — HTML constraints are UX, not security.
   Saves go through commit() so they are undoable and logged. */
const dlg=$('#dlg');
let dlgT=null;
function openDlg(html,onSubmit){if(dlgT){clearTimeout(dlgT);dlgT=null;dlg.classList.remove('closing');if(dlg.open)dlg.close()}dlg.innerHTML=html;const h=dlg.querySelector('.dlg-h h2');if(h){h.id='dlg-title';dlg.setAttribute('aria-labelledby','dlg-title')}else dlg.removeAttribute('aria-labelledby');const f=dlg.querySelector('form');if(f)f.onsubmit=e=>{e.preventDefault();const err=onSubmit(new FormData(f),f,e.submitter);if(err===KEEP_OPEN)return;if(err){const box=f.querySelector('.err');if(box){box.textContent=err;box.classList.remove('shake');void box.offsetWidth;box.classList.add('shake')}else toast(err)}else closeDlg()};if(!dlg.open)dlg.showModal();const first=dlg.querySelector('input:not([type=hidden]):not([type=radio]):not([type=checkbox]),select,textarea');first&&first.focus()}
function closeDlg(){if(!dlg.open||dlgT)return;if(RM()){dlg.close();return}dlg.classList.add('closing');dlgT=setTimeout(()=>{dlg.classList.remove('closing');dlg.close();dlgT=null},150)}
dlg.addEventListener('click',e=>{if(e.target===dlg)closeDlg()});
const dlgHead=h=>`<div class="dlg-h"><h2>${h}</h2><button type="button" class="btn icon ghost" data-a="closeDlg" aria-label="${t('Kapat')}">${svg('x')}</button></div>`;
/* Archived projects are not offered for new work (but a task already in one keeps it). */
const projOpts=sel=>`<option value="">${t('Projesiz')}</option>`+S.projects.filter(p=>!p.archived||p.id===sel).map(p=>`<option value="${p.id}" ${p.id===sel?'selected':''}>${esc(p.name)}${p.archived?' ('+t('arşivde')+')':''}</option>`).join('');
const memberOpts=sel=>allMembers().map(m=>`<option value="${m.id}" ${(sel||'me')===m.id?'selected':''}>${esc(m.name)}${m.me&&S.profile.name?' ('+t('sen')+')':''}</option>`).join('');
const quickTabs=cur=>`<div class="qa-types tabs">${[['task','Görev'],['project','Proje'],['event','Etkinlik']].map(([k,l])=>`<button type="button" class="${k===cur?'on':''}" data-a="qaType" data-v="${k}" aria-pressed="${k===cur}">${t(l)}</button>`).join('')}</div>`;

/* ---------- recurrence fieldset (shared by task form) ---------- */
function recurFields(r){
  const f=r?r.freq:'';
  return`<fieldset class="recur" data-freq="${f}"><legend class="lbl">${t('Tekrar')}</legend>
    <div class="f2"><div class="f"><label class="sr" for="rf">${t('Tekrar sıklığı')}</label><select id="rf" name="rfreq">${[['',t('Tekrar yok')],['daily',t('Her gün')],['weekdays',t('Hafta içi her gün')],['weekly',t('Her hafta')],['monthly',t('Her ay')]].map(([k,l])=>`<option value="${k}" ${k===f?'selected':''}>${l}</option>`).join('')}</select></div>
    <div class="f r-iv"><label for="riv">${t('Aralık')}</label><input id="riv" type="number" name="rint" min="1" max="30" value="${r?.interval||1}"></div></div>
    <div class="r-days row" role="group" aria-label="${t('Günler')}">${[1,2,3,4,5,6,0].map(d=>`<label class="pill"><input type="checkbox" name="rday" value="${d}" ${(r?.days||[]).includes(d)?'checked':''}> ${dayName(d,true)}</label>`).join('')}</div>
    <div class="f r-md"><label for="rmd">${t('Ayın günü')}</label><input id="rmd" type="number" name="rmd" min="1" max="31" value="${r?.monthDay||1}"></div>
    <p class="hint">${t('Görev tamamlandığında bir sonraki tekrarı aynı saatle otomatik oluşturulur.')}</p></fieldset>`;
}
document.addEventListener('change',e=>{if(e.target.name==='rfreq')e.target.closest('.recur').dataset.freq=e.target.value;if(e.target.name==='type'&&e.target.closest('#dlg'))e.target.closest('form').dataset.type=e.target.value});
function readRecur(fd){
  const f=String(fd.get('rfreq')||'');if(!ENUM.recur.includes(f))return{r:null};
  const iv=Math.round(+fd.get('rint')||1);if(!(iv>=1&&iv<=30))return{err:t('Tekrar aralığı 1–30 arasında olmalı.')};
  const r={freq:f,interval:f==='weekdays'?1:iv};
  if(f==='weekly'){r.days=fd.getAll('rday').map(Number).filter(d=>d>=0&&d<=6);if(!r.days.length)return{err:t('Haftalık tekrar için en az bir gün seç.')}}
  if(f==='monthly'){const md=Math.round(+fd.get('rmd'));if(!(md>=1&&md<=31))return{err:t('Ayın günü 1–31 arasında olmalı.')};r.monthDay=md}
  return{r};
}

/* ---------- task form ----------
   Field order follows the fastest creation path: title → project → priority → estimate → due → save.
   Everything else is folded into "More details". In Quick Add a smart line fills the fields. */
function taskForm(x={},{quick=false}={}){
  const isNew=!x.id,act=isNew?0:actualH(x);
  const depOpts=S.tasks.filter(y=>y.id!==x.id&&(y.status!=='done'||(x.deps||[]).includes(y.id))&&(!x.id||!createsCycle(x.id,y.id)));
  const more=!isNew&&(x.desc||x.tags?.length||x.deps?.length||x.status!=='todo'||x.start||x.assignee||x.recur);
  return`<form novalidate>${dlgHead(isNew?t('Yeni görev'):t('Görevi düzenle'))}${quick?quickTabs('task'):''}<div class="dlg-b">
   ${quick?`<div class="f smart"><label for="tsmart">${svg('spark','i s')} ${t('Akıllı giriş')} <span class="muted">(${t('isteğe bağlı')})</span></label><input id="tsmart" autocomplete="off" maxlength="300" placeholder="${t('Raporu yarın saat 15’e kadar bitir 2 saat yüksek')}"><div class="qprev" id="tsmart-prev" aria-live="polite">${qhint()}</div></div>`:''}
   <div class="f"><label for="tt">${t('Başlık')} <span aria-hidden="true">*</span></label><input id="tt" name="title" value="${esc(x.title||'')}" maxlength="200" required aria-required="true" placeholder="${t('Örn. Müşteri sunumunu hazırla')}"></div>
   <div class="f2"><div class="f"><label for="tpr">${t('Proje')}</label><select id="tpr" name="projectId">${projOpts(x.projectId)}</select></div><div class="f"><label for="tp">${t('Öncelik')}</label><select id="tp" name="priority">${ENUM.priority.map(k=>`<option value="${k}" ${k===(x.priority||'medium')?'selected':''}>${PR(k)}</option>`).join('')}</select></div></div>
   <div class="f2"><div class="f"><label for="te">${t('Tahmini süre (sa)')}</label><input id="te" type="number" inputmode="decimal" name="estimate" min="0" max="200" step="0.25" value="${x.estimate||''}" placeholder="3"></div><div class="f"><label for="td">${t('Teslim')}</label><input id="td" type="datetime-local" name="due" value="${x.due||''}"></div></div>
   <details class="more" ${more?'open':''}><summary>${t('Diğer ayrıntılar')}</summary>
     <div class="f2"><div class="f"><label for="tst">${t('Başlangıç')} <span class="muted">(${t('en erken')})</span></label><input id="tst" type="datetime-local" name="start" value="${x.start||''}"></div>
     <div class="f"><label for="ts">${t('Durum')}</label><select id="ts" name="status">${ENUM.status.map(k=>`<option value="${k}" ${k===(x.status||'todo')?'selected':''}>${ST(k)}</option>`).join('')}</select></div></div>
     <div class="f"><label for="tas">${t('Atanan')}</label><select id="tas" name="assignee">${memberOpts(x.assignee)}</select>${S.members.length?'':`<p class="hint">${t('Ekip sayfasından üye ekleyince burada görünür.')}</p>`}</div>
     ${recurFields(x.recur)}
     <fieldset class="f deps-f"><legend class="lbl">${t('Önce bitmesi gereken görevler')}</legend>${depOpts.length?`<div class="deps-pick">${depOpts.map(y=>`<label><input type="checkbox" name="dep" value="${y.id}" ${(x.deps||[]).includes(y.id)?'checked':''}> <span>${esc(y.title)}</span>${y.status==='done'?` <small class="muted">· ${t('tamamlandı')}</small>`:''}</label>`).join('')}</div>`:`<p class="hint">${t('Bağlanabilecek açık görev yok.')}</p>`}</fieldset>
     <div class="f"><label for="tg">${t('Etiketler (virgülle)')}</label><input id="tg" name="tags" value="${esc((x.tags||[]).join(', '))}" maxlength="300" placeholder="${t('tasarım, müşteri')}"></div>
     <div class="f"><label for="tds">${t('Açıklama')}</label><textarea id="tds" name="desc" maxlength="10000">${esc(x.desc||'')}</textarea></div>
   </details>
   ${isNew?(quick?`<p class="hint" style="margin:10px 0 0"><button type="button" class="linkbtn" data-a="fromTpl">${t('Şablondan oluştur')}</button></p>`:''):`<div class="track">${svg('clock')}<span class="grow">${t('Gerçekleşen')}: <b>${dur(act)}</b>${+x.estimate?` / ${t('tahmin')} ${hrs(+x.estimate)}`:''}${scheduledH(x)?` · ${t('takvimde {h}',{h:hrs(scheduledH(x))})}`:''}</span><label class="sr" for="tadd">${t('Süre ekle (sa)')}</label><input id="tadd" class="mini-input" name="addTime" type="number" inputmode="decimal" min="0" max="24" step="0.25" placeholder="+ ${t('sa')}"></div>`}
   <div class="err" role="alert"></div></div>
   <div class="dlg-f">${!isNew?`<button type="button" class="btn danger left" data-a="delTask" data-id="${x.id}">${t('Sil')}</button>`:''}<button type="button" class="btn" data-a="closeDlg">${t('Vazgeç')}</button><button class="btn primary">${isNew?t('Görev ekle'):t('Kaydet')}</button></div></form>`;
}
const TASK_DIFF=['title','due','start','estimate','priority','status','projectId','assignee','recur'];
function saveTask(fd,existing,defaults={},form){
  const title=String(fd.get('title')||'').trim();if(!title)return t('Başlık gerekli.');
  const estRaw=String(fd.get('estimate')||'').trim(),est=estRaw===''?0:Number(estRaw.replace(',','.'));
  if(!Number.isFinite(est))return t('Geçersiz süre: sayı gir (örn. 1,5).');
  if(est<0)return t('Süre negatif olamaz.');if(est>200)return t('Süre en fazla 200 saat olabilir.');
  const due=String(fd.get('due')||'');if(due&&!validLocal(due))return t('Geçersiz teslim tarihi.');
  const start=String(fd.get('start')||'');if(start&&!validLocal(start))return t('Geçersiz başlangıç tarihi.');
  if(start&&due&&new Date(start)>new Date(due))return t('Başlangıç, teslim tarihinden sonra olamaz.');
  const add=fd.get('addTime')?+fd.get('addTime'):0;if(!(add>=0&&add<=24))return t('Eklenecek süre 0–24 saat olmalı.');
  const prio=ENUM.priority.includes(fd.get('priority'))?fd.get('priority'):'medium';
  const status=ENUM.status.includes(fd.get('status'))?fd.get('status'):(existing?existing.status:'todo');
  const pidRaw=fd.get('projectId');if(pidRaw&&!projectOf(pidRaw))return t('Seçilen proje artık yok. Başka bir proje seç.');
  const asRaw=fd.get('assignee');const assignee=!asRaw||asRaw==='me'?null:(S.members.some(m=>m.id===asRaw)?asRaw:null);
  const deps=[...new Set(fd.getAll('dep').map(String))].filter(id=>taskOf(id));
  if(existing)for(const d of deps)if(d===existing.id||createsCycle(existing.id,d))return t('“{x}” bağımlılığı bir döngü oluşturur: o görev zaten bu göreve bağlı.',{x:taskOf(d).title});
  const rr=fd.has('rfreq')?readRecur(fd):{r:existing?existing.recur:null};if(rr.err)return rr.err;
  // A deadline in the past is allowed (logging late work), but only after an explicit second confirmation.
  const dueChanged=!existing||existing.due!==due;
  if(due&&dueChanged&&status!=='done'&&new Date(due)<new Date()&&form&&form.dataset.pastOk!==due){form.dataset.pastOk=due;return t('Teslim tarihi geçmişte ({d}). Yine de kaydetmek için tekrar “{b}” düğmesine bas.',{d:fDT(due),b:existing?t('Kaydet'):t('Görev ekle')})}
  const data={title:title.slice(0,200),due,start,estimate:Math.round(est*4)/4,priority:prio,projectId:pidRaw||null,assignee,status,recur:rr.r,
    tags:String(fd.get('tags')||'').split(',').map(s=>s.trim().replace(/^#/,'').slice(0,40)).filter(Boolean).slice(0,10),deps};
  if(fd.has('desc'))data.desc=String(fd.get('desc')||'').slice(0,10000);
  if(!fd.has('rfreq'))delete data.recur;
  if(existing){
    let r=null;
    const id=commit(t('Görev güncellendi'),()=>{
      const before={...existing},newStatus=data.status;delete data.status;
      Object.assign(existing,data,{updatedAt:toLocal(new Date())});
      if(newStatus!==before.status)r=opSetStatus(existing,newStatus);
      if(add>0){const en=new Date();existing.logs.push({start:new Date(+en-add*HOUR).toISOString(),end:en.toISOString(),manual:true});logAct('task',existing.id,'time',{label:existing.title,note:'+'+dur(add)})}
      const ch=diffFields(before,existing,TASK_DIFF.filter(k=>k!=='status'));if(ch.length)logAct('task',existing.id,'updated',{label:existing.title,changes:ch});
    });
    render();undoToast(t('Görev güncellendi')+(r&&r.next?' · '+t('Sonraki tekrar: {d}',{d:relDue(r.next.due)}):''),id);
  }else{
    const x=newTask({...defaults,...data,completedAt:status==='done'?toLocal(new Date()):null});
    commit(t('Görev eklendi'),()=>{S.tasks.push(x);logAct('task',x.id,'created',{label:x.title})});UI.flash={id:x.id,kind:'new'};render();
    if(x.estimate&&x.status!=='done'&&mine(x))toast(t('Görev eklendi. Bu görevi takvime yerleştirmek ister misin?'),{label:t('Planla'),fn:()=>suggestFor([x])});else toast(t('Görev eklendi'),{label:t('Aç'),fn:()=>go('task',x.id)});
  }
}
/* Smart line → form fields (only fields that were recognised are overwritten). */
document.addEventListener('input',e=>{
  if(e.target.id!=='tsmart')return;
  const r=parseQuick(e.target.value),f=e.target.form;$('#tsmart-prev').innerHTML=qPreview(r);
  if(r.title)f.elements.title.value=r.title;
  if(r.proj)f.elements.projectId.value=r.proj.id;
  if(r.prioSet)f.elements.priority.value=r.prio;
  if(r.est)f.elements.estimate.value=r.est;
  if(r.due)f.elements.due.value=toLocal(r.due);
  if(r.tags.length){f.elements.tags.value=r.tags.join(', ');f.querySelector('details.more').open=true}
  if(r.recur){f.querySelector('details.more').open=true;f.elements.rfreq.value=r.recur.freq;f.querySelector('.recur').dataset.freq=r.recur.freq;if(r.recur.days)f.querySelectorAll('[name=rday]').forEach(c=>c.checked=r.recur.days.includes(+c.value));if(r.recur.monthDay)f.elements.rmd.value=r.recur.monthDay}
});
function openTask(id,defaults={}){const x=id?taskOf(id):null;if(id&&!x){toast(t('Görev bulunamadı; silinmiş olabilir.'));return}openDlg(taskForm(x||{projectId:defaults.projectId}),(fd,f)=>saveTask(fd,x,defaults,f))}

/* ---------- event form ---------- */
function eventForm(e={},{quick=false}={}){
  const isNew=!e.id,s=e.start?new Date(e.start):null,en=e.end?new Date(e.end):null,type=e.type||'meeting';
  return`<form data-type="${type}">${dlgHead(isNew?t('Yeni etkinlik'):t('Etkinliği düzenle'))}${quick?quickTabs('event'):''}<div class="dlg-b">
   <div class="f"><label for="et">${t('Başlık')} *</label><input id="et" name="title" value="${esc(e.title||'')}" maxlength="200" required placeholder="${t('Örn. Müşteri toplantısı')}"></div>
   <div class="f"><label for="ety">${t('Tür')}</label><select id="ety" name="type">${Object.keys(EVT_K).map(k=>`<option value="${k}" ${k===type?'selected':''}>${EV(k)}</option>`).join('')}</select><p class="hint ev-hint">${t('Toplantı ve odak bloğu iş kapasitesinden düşer; kişisel zaman yalnızca o saatleri kapatır; kilometre taşı bir andır.')}</p></div>
   <div class="f3"><div class="f"><label for="edt">${t('Tarih')}</label><input id="edt" type="date" name="date" value="${dayKey(s||new Date())}" required></div><div class="f"><label for="es">${t('Başlangıç')}</label><input id="es" type="time" name="st" value="${s?toLocal(s).slice(11):'10:00'}" required></div><div class="f ev-end"><label for="ee">${t('Bitiş')}</label><input id="ee" type="time" name="en" value="${en?toLocal(en).slice(11):'11:00'}"></div></div>
   <div class="f"><label for="epr">${t('Proje')}</label><select id="epr" name="projectId">${projOpts(e.projectId)}</select></div>
   <div class="f2 ev-more"><div class="f"><label for="elo">${t('Konum')}</label><input id="elo" name="location" maxlength="300" value="${esc(e.location||'')}" placeholder="${t('Ofis / Zoom')}"></div><div class="f"><label for="epa">${t('Katılımcılar')}</label><input id="epa" name="participants" maxlength="500" value="${esc(e.participants||'')}"></div></div>
   ${quick?'':`<div class="f"><label for="eds">${t('Açıklama')}</label><textarea id="eds" name="desc" maxlength="5000">${esc(e.desc||'')}</textarea></div>`}
   ${e.source==='ics'?`<p class="hint" style="margin:0">${t('.ics dosyasından içe aktarıldı')}</p>`:''}
   <div class="err" role="alert"></div></div>
   <div class="dlg-f">${!isNew?`<button type="button" class="btn danger left" data-a="delEvent" data-id="${e.id}">${t('Sil')}</button>`:''}<button type="button" class="btn" data-a="closeDlg">${t('Vazgeç')}</button><button class="btn primary">${isNew?t('Ekle'):t('Kaydet')}</button></div></form>`;
}
function saveEvent(fd,existing){
  const title=String(fd.get('title')||'').trim().slice(0,200);if(!title)return t('Başlık gerekli.');
  const type=ENUM.eventType.includes(fd.get('type'))?fd.get('type'):'meeting';
  const date=String(fd.get('date')||''),stt=String(fd.get('st')||''),ent=String(fd.get('en')||'');
  if(!RX.day.test(date)||!/^\d{2}:\d{2}$/.test(stt))return t('Geçerli tarih ve saat gir.');
  const st=new Date(date+'T'+stt);let en=/^\d{2}:\d{2}$/.test(ent)?new Date(date+'T'+ent):null;
  if(isNaN(st)||(en&&isNaN(en)))return t('Geçerli tarih ve saat gir.');
  if(type==='milestone')en=new Date(+st+30*60e3);          // milestones are points in time
  if(!en)return t('Bitiş saati gerekli.');
  if(en<=st)return t('Bitiş, başlangıçtan sonra olmalı.');
  const pid=fd.get('projectId');if(pid&&!projectOf(pid))return t('Seçilen proje artık yok. Başka bir proje seç.');
  const data={title,type,projectId:pid||null,location:String(fd.get('location')||'').slice(0,300),participants:String(fd.get('participants')||'').slice(0,500)};
  if(fd.has('desc'))data.desc=String(fd.get('desc')||'').slice(0,5000);
  const apply=segs=>{const id=commit(existing?t('Etkinlik güncellendi'):t('Etkinlik eklendi'),()=>writeTimed('ev',existing,data,segs));render();
    const clashB=type!=='milestone'&&S.blocks.some(b=>segs.some(([a,c])=>overlap(a,c,+new Date(b.start),+new Date(b.end))>0));
    undoToast(existing?t('Etkinlik güncellendi'):t('Etkinlik eklendi'),id);void clashB};
  if(type==='milestone'){closeDlg();apply([[+st,+en]]);return}
  checkConflicts({kind:'ev',id:existing?.id,title,start:toLocal(st),end:toLocal(en),apply,cancel:()=>toast(t('Değişiklik kaydedilmedi'))});
  if(!CF)closeDlg();
  return KEEP_OPEN;
}
function openEvent(id,preset={}){const e=id?S.events.find(x=>x.id===id):null;if(id&&!e){toast(t('Etkinlik bulunamadı; silinmiş olabilir.'));return}openDlg(eventForm(e||preset),fd=>saveEvent(fd,e))}

/* ---------- focus block: change time (keyboard / touch alternative to dragging) ---------- */
function openBlockEdit(id){
  const b=S.blocks.find(x=>x.id===id);if(!b)return;const x=taskOf(b.taskId);
  openDlg(`<form>${dlgHead(t('Blok zamanını değiştir'))}<div class="dlg-b"><p class="muted" style="margin-top:0">${esc(x?x.title:'')}</p>
    <div class="f3"><div class="f"><label for="bd">${t('Tarih')}</label><input id="bd" type="date" name="date" value="${b.start.slice(0,10)}" required></div><div class="f"><label for="bs">${t('Başlangıç')}</label><input id="bs" type="time" name="st" value="${b.start.slice(11)}" required></div><div class="f"><label for="be">${t('Bitiş')}</label><input id="be" type="time" name="en" value="${b.end.slice(11)}" required></div></div>
    <div class="err" role="alert"></div></div><div class="dlg-f"><button type="button" class="btn" data-a="closeDlg">${t('Vazgeç')}</button><button class="btn primary">${t('Kaydet')}</button></div></form>`,fd=>{
    const date=String(fd.get('date')||''),s1=String(fd.get('st')||''),e1=String(fd.get('en')||'');
    if(!RX.day.test(date)||!/^\d{2}:\d{2}$/.test(s1)||!/^\d{2}:\d{2}$/.test(e1))return t('Geçerli tarih ve saat gir.');
    const st=new Date(date+'T'+s1),en=new Date(date+'T'+e1);if(isNaN(st)||isNaN(en))return t('Geçerli tarih ve saat gir.');if(en<=st)return t('Bitiş, başlangıçtan sonra olmalı.');if(en-st>12*HOUR)return t('Bir blok en fazla 12 saat olabilir.');
    checkConflicts({kind:'bl',id:b.id,title:x?x.title:'',start:toLocal(st),end:toLocal(en),apply:segs=>{const cid=commit(t('Blok taşındı'),()=>writeTimed('bl',b,{},segs));render();undoToast(t('Blok güncellendi'),cid)},cancel:()=>{}});
    if(!CF)closeDlg();return KEEP_OPEN});
}

/* ---------- project form ---------- */
function projectForm(p={},{quick=false}={}){
  const isNew=!p.id,c=p.color||COLORS[S.projects.length%COLORS.length],tpls=allTemplates('project');
  return`<form>${dlgHead(isNew?t('Yeni proje'):t('Projeyi düzenle'))}${quick?quickTabs('project'):''}<div class="dlg-b">
   <div class="f"><label for="pn">${t('Proje adı')} *</label><input id="pn" name="name" value="${esc(p.name||'')}" maxlength="120" required placeholder="${t('Örn. Müşteri web sitesi')}"></div>
   ${isNew?`<div class="f"><label for="ptp">${t('Şablon')}</label><select id="ptp" name="tpl"><option value="">${t('Boş proje')}</option>${tpls.map(tp=>`<option value="${tp.id}">${esc(tplName(tp))} · ${t('{n} görev',{n:tp.items.length})}</option>`).join('')}</select><p class="hint">${t('Şablon görevleri ve bağımlılıkları oluşturur; teslim tarihi varsa adımlar bu tarihe kadar dağıtılır.')}</p></div>`:''}
   <div class="f"><label for="pd">${t('Açıklama')}</label><textarea id="pd" name="desc" maxlength="5000">${esc(p.desc||'')}</textarea></div>
   <div class="f3"><div class="f"><label for="ps">${t('Başlangıç')}</label><input id="ps" type="date" name="start" value="${p.start||''}"></div><div class="f"><label for="pdl">${t('Teslim')}</label><input id="pdl" type="date" name="deadline" value="${p.deadline||''}"></div><div class="f"><label for="pst">${t('Durum')}</label><select id="pst" name="status">${['active','hold','done'].map(k=>`<option value="${k}" ${k===(p.status||'active')?'selected':''}>${projStatus(k)}</option>`).join('')}</select></div></div>
   <fieldset class="f" style="border:0;padding:0;margin:0 0 12px"><legend class="lbl" style="margin-bottom:5px">${t('Renk')}</legend><div class="swatches">${COLORS.map((col,i)=>`<label><input type="radio" name="color" value="${col}" ${col===c?'checked':''} aria-label="${t('Renk')} ${i+1}"><span style="background:${col}"></span></label>`).join('')}</div></fieldset>
   <fieldset class="f" style="border:0;padding:0;margin:0 0 12px"><legend class="lbl" style="margin-bottom:5px">${t('Simge')}</legend><div class="icon-pick" style="--pc:${c}">${PROJ_ICONS.map(k=>`<label><input type="radio" name="icon" value="${k}" ${k===(p.icon||'folder')?'checked':''} aria-label="${t('Simge')}: ${k}"><span>${svg(k)}</span></label>`).join('')}</div></fieldset>
   <div class="err" role="alert"></div></div>
   <div class="dlg-f">${!isNew?`<button type="button" class="btn danger left" data-a="delProject" data-id="${p.id}">${t('Sil')}</button><button type="button" class="btn" data-a="${p.archived?'restoreProject':'archiveProject'}" data-id="${p.id}">${p.archived?t('Arşivden çıkar'):t('Arşivle')}</button>`:''}<button type="button" class="btn" data-a="closeDlg">${t('Vazgeç')}</button><button class="btn primary">${isNew?t('Proje oluştur'):t('Kaydet')}</button></div></form>`;
}
function saveProject(fd,existing){
  const name=String(fd.get('name')||'').trim().slice(0,120);if(!name)return t('Proje adı gerekli.');
  const start=String(fd.get('start')||''),deadline=String(fd.get('deadline')||'');
  if((start&&!validDay(start))||(deadline&&!validDay(deadline)))return t('Geçerli bir tarih gir.');
  if(start&&deadline&&deadline<start)return t('Teslim, başlangıçtan önce olamaz.');
  const color=RX.color.test(fd.get('color'))?fd.get('color'):COLORS[0];
  const data={name,desc:String(fd.get('desc')||'').slice(0,5000),start,deadline,status:ENUM.projectStatus.includes(fd.get('status'))?fd.get('status'):'active',color,icon:PROJ_ICONS.includes(fd.get('icon'))?fd.get('icon'):''};
  if(existing){const id=commit(t('Proje güncellendi'),()=>{const before={...existing};Object.assign(existing,data);const ch=diffFields(before,existing,['name','deadline','status']);if(ch.length)logAct('project',existing.id,'updated',{label:existing.name,changes:ch})});render();undoToast(t('Proje güncellendi'),id);return}
  const tp=fd.get('tpl')?templateOf(fd.get('tpl')):null;
  const p={id:uid(),createdAt:toLocal(new Date()),archived:false,archivedAt:null,demo:false,...data};let made=[];
  commit(t('Proje oluşturuldu'),()=>{S.projects.push(p);logAct('project',p.id,'created',{label:p.name});if(tp)made=instantiate(tp,{projectId:p.id,start:start?parseDay(start):null,end:deadline?parseDay(deadline):null})});
  setTimeout(()=>{go('project',p.id);toast(made.length?t('Proje “{x}” şablonuyla {n} görevle oluşturuldu.',{x:tplName(tp),n:made.length}):t('Proje oluşturuldu. Şimdi görevlerini ekle.'),made.length?{label:t('Projeyi planla'),fn:()=>A.planProject({id:p.id})}:{label:t('Görev ekle'),fn:()=>openTask(null,{projectId:p.id})})});
}
function openProjectForm(id){const p=id?projectOf(id):null;openDlg(projectForm(p||{}),fd=>saveProject(fd,p))}

/* ---------- templates ---------- */
function openTemplatePicker(kind){
  const tpls=allTemplates(kind),pid=UI.view==='project'?UI.param:null;
  openDlg(`<form>${dlgHead(t('Şablondan görev oluştur'))}<div class="dlg-b">${tpls.length?`<div class="list tpl-list">${tpls.map(tp=>`<div class="li"><div class="t"><b>${esc(tplName(tp))}</b><div class="meta">${tp.builtin?`<span>${t('Hazır şablon')}</span>`:`<span>${t('Senin şablonun')}</span>`}<span>${esc(tp.builtin?t(tp.desc):tp.desc||'')}</span>${tp.items[0]?.subtasks?.length?`<span>${t('{n} alt görev',{n:tp.items[0].subtasks.length})}</span>`:''}${tp.items[0]?.recur?`<span>${esc(recurText(tp.items[0].recur))}</span>`:''}</div></div>${tp.builtin?'':`<button type="button" class="btn sm icon ghost" data-a="delTpl" data-id="${tp.id}" aria-label="${t('Şablonu sil')}: ${esc(tp.name)}">${svg('trash')}</button>`}<button type="button" class="btn sm primary" data-a="useTpl" data-id="${tp.id}">${t('Kullan')}</button></div>`).join('')}</div>`:`<p class="muted">${t('Henüz şablon yok. Bir görevin sayfasından “Şablon olarak kaydet” diyebilirsin.')}</p>`}</div></form>`,()=>{});
  A.useTpl=d=>{const tp=templateOf(d.id);if(!tp)return;let made=[];const id=commit(t('Şablondan görev oluşturuldu'),()=>{made=instantiate(tp,{projectId:pid})});closeDlg();render();undoToast(t('“{x}” oluşturuldu',{x:made[0]?.title||''}),id);if(made[0])setTimeout(()=>go('task',made[0].id),0)};
}

/* ---------- team member ---------- */
function openMemberForm(id){
  const m=id?S.members.find(x=>x.id===id):null;
  openDlg(`<form>${dlgHead(m?t('Üyeyi düzenle'):t('Üye ekle'))}<div class="dlg-b">
    <p class="callout" style="margin-top:0">${svg('lock','i s')} ${t('Bu sürümde davet e-postası gönderilmez. Üye, görev atamak ve iş yükünü görmek için bu cihazda tutulur.')}</p>
    <div class="f2"><div class="f"><label for="mn">${t('Ad soyad')} *</label><input id="mn" name="name" maxlength="120" required value="${esc(m?.name||'')}"></div><div class="f"><label for="mm">${t('E-posta')} <span class="muted">(${t('isteğe bağlı')})</span></label><input id="mm" name="email" type="email" maxlength="254" value="${esc(m?.email||'')}"></div></div>
    <div class="f2"><div class="f"><label for="mr">${t('Rol')}</label><select id="mr" name="role">${ROLES.filter(r=>r!=='owner').map(r=>`<option value="${r}" ${(m?.role||'member')===r?'selected':''}>${t(ROLE_K[r])}</option>`).join('')}</select></div><div class="f"><label for="mc">${t('Haftalık kapasite (sa)')}</label><input id="mc" name="capacity" type="number" min="0" max="80" step="0.5" value="${m?m.capacity:30}"></div></div>
    <div class="err" role="alert"></div></div><div class="dlg-f"><button type="button" class="btn" data-a="closeDlg">${t('Vazgeç')}</button><button class="btn primary">${m?t('Kaydet'):t('Ekle')}</button></div></form>`,fd=>{
    const name=String(fd.get('name')||'').trim().slice(0,120);if(!name)return t('Ad gerekli.');
    const email=String(fd.get('email')||'').trim();if(email&&!EMAIL_RX.test(email))return t('Geçerli bir e-posta gir ya da boş bırak.');
    const role=ENUM.role.includes(fd.get('role'))&&fd.get('role')!=='owner'?fd.get('role'):'member';
    const cap=+fd.get('capacity');if(!(cap>=0&&cap<=80))return t('Haftalık kapasite 0–80 saat olmalı.');
    const data={name,email,role,capacity:Math.round(cap*2)/2};
    const cid=commit(m?t('Üye güncellendi'):t('Üye eklendi'),()=>{if(m)Object.assign(m,data);else S.members.push({id:uid(),...data});logAct('workspace','',m?'member_updated':'member_added',{label:name})});render();undoToast(m?t('Üye güncellendi'):t('{x} ekibe eklendi',{x:name}),cid)});
}

function quickAdd(type='task'){
  if(UI.boot!=='ready')return;
  if(type==='task')openDlg(taskForm({projectId:UI.view==='project'&&!projectOf(UI.param)?.archived?UI.param:null},{quick:true}),(fd,f)=>saveTask(fd,null,{},f));
  if(type==='project')openDlg(projectForm({},{quick:true}),fd=>saveProject(fd,null));
  if(type==='event')openDlg(eventForm({},{quick:true}),fd=>saveEvent(fd,null));
}
