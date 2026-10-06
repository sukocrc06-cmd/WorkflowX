/* ================= ACTIONS =================
   UI intents, dispatched from [data-a] elements by one delegated listener.
   Every change to product state goes through commit(label, fn) (core/history.js):
   it is saved, undoable with Ctrl+Z / the toast button, and redoable. */
function completeTask(x){
  const left=todayFocus(99).length;let r;const id=commit(t('Görev tamamlandı'),()=>{r=opComplete(x)});UI.flash={id:x.id,kind:'done'};render();
  if(left>0&&!todayFocus(99).length)setTimeout(()=>confetti(innerWidth/2,innerHeight/3,70),120);
  undoToast(t('Tamamlandı: {x}',{x:x.title})+(r.freed.length?' · '+t('{n} gelecek blok serbest bırakıldı',{n:r.freed.length}):'')+(r.next?' · '+t('Sonraki tekrar: {d}',{d:relDue(r.next.due)}):''),id);
}
function setLang(l){LANG=l==='en'?'en':'tr';prefs.set('lang',LANG);if($('#app').classList.contains('on'))render();else applyRoute()}
/* Accent presets (keys are an allow-list; CSS holds the actual colours). */
const ACCENTS=[['indigo','Çivit','#5b5bd6'],['violet','Mor','#7c3aed'],['blue','Mavi','#2563eb'],['teal','Deniz','#0f766e'],['green','Yeşil','#15803d'],['orange','Turuncu','#c2410c'],['rose','Gül','#d61f4c'],['graphite','Grafit','#3f414b']];
function setAccent(k){if(!ACCENTS.some(([x])=>x===k))return;prefs.set('accent',k);themeFade();document.documentElement.dataset.accent=k}
/* A one-shot colour cross-fade when theme/accent changes (synchronous: state is applied immediately). */
function themeFade(){if(RM())return;const r=document.documentElement;r.classList.add('theming');clearTimeout(themeFade.t);themeFade.t=setTimeout(()=>r.classList.remove('theming'),450)}
function setTheme(n){themeFade();document.documentElement.dataset.theme=n;prefs.set('theme',n)}
/* Standard confirmation dialog. `text` is trusted markup built by the caller (user values escaped). */
function confirmDlg({title,text,ok,danger=true,onOk}){
  openDlg(`<form>${dlgHead(title)}<div class="dlg-b"><p style="margin:0">${text}</p><div class="err" role="alert"></div></div><div class="dlg-f"><button type="button" class="btn" data-a="closeDlg">${t('Vazgeç')}</button><button class="btn ${danger?'danger-solid':'primary'}">${ok}</button></div></form>`,()=>{onOk()});
}
/* Buttons get a loading state while async work runs; double submits are ignored. */
async function withLoading(btn,fn){
  if(btn&&btn.classList.contains('is-loading'))return;
  if(btn){btn.classList.add('is-loading');btn.setAttribute('aria-busy','true');btn.disabled=true}
  try{return await fn()}
  catch(e){console.error(e);toast(t('İşlem tamamlanamadı. Lütfen tekrar dene.'),{label:t('Tekrar dene'),fn:()=>withLoading(null,fn)})}
  finally{if(btn&&btn.isConnected){btn.classList.remove('is-loading');btn.removeAttribute('aria-busy');btn.disabled=false}}
}
function removeTask(x){
  const id=commit(t('Görev silindi'),()=>opRemoveTask(x));
  closeDlg();
  if(UI.view==='task'&&UI.param===x.id)go('tasks');else render();
  undoToast(t('Görev silindi'),id);
}
function removeProject(p){
  const n=S.tasks.filter(x=>x.projectId===p.id).length;
  const id=commit(t('Proje silindi'),()=>{S.projects=S.projects.filter(x=>x!==p);S.tasks.forEach(x=>{if(x.projectId===p.id)x.projectId=null});S.events.forEach(e=>{if(e.projectId===p.id)e.projectId=null})});
  closeDlg();go('projects');
  undoToast(t('Proje silindi')+(n?' · '+t('{n} görev projesiz kaldı',{n}):''),id);
}
function setArchived(p,on){
  const id=commit(on?t('Proje arşivlendi'):t('Proje arşivden çıkarıldı'),()=>{p.archived=on;p.archivedAt=on?toLocal(new Date()):null;logAct('project',p.id,on?'archived':'restored',{label:p.name})});
  closeDlg();render();undoToast(on?t('“{x}” arşivlendi. Görevleri korunur.',{x:p.name}):t('“{x}” yeniden aktif',{x:p.name}),id);
}
function download(name,text,type){const b=new Blob([text],{type});const a=document.createElement('a');a.href=URL.createObjectURL(b);a.download=name;document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(a.href),1000)}

const A={
  /* navigation */
  enter(){go('overview')},
  scrollHow(){$('#how')?.scrollIntoView({behavior:RM()?'auto':'smooth'})},
  scrollTo(d){document.getElementById(d.v)?.scrollIntoView({behavior:RM()?'auto':'smooth'})},
  go(d){go(d.v,d.p||null,d.s||null)},
  back(){if(history.length>1)history.back();else go('overview')},
  skip(){$('#main').focus()},
  more(){$('#more').hidden=!$('#more').hidden;renderShell()},
  lang(d){setLang(d.v)},
  theme(){const cur=document.documentElement.dataset.theme||(matchMedia('(prefers-color-scheme: dark)').matches?'dark':'light');setTheme(cur==='dark'?'light':'dark')},
  cmdk(){openCmd()},keys(){showKeys()},
  undo(){undo()},redo(){redo()},
  quick(){quickAdd('task')},qaType(d){closeDlg();quickAdd(d.v)},closeDlg,
  ws(){const p=$('#wspop');if(p){p.hidden=!p.hidden;$('#wsbtn').setAttribute('aria-expanded',String(!p.hidden))}},
  /* tasks */
  newTask(d){openTask(null,{projectId:d.p||null})},
  editTask(d){closePops();openTask(d.id)},
  openTask(d){closePops();go('task',d.id)},
  toggle(d,el){const x=taskOf(d.id);if(!x)return;
    if(x.status==='done'){const id=commit(t('Görev yeniden açıldı'),()=>opReopen(x));render();undoToast(t('Yeniden açıldı: {x}',{x:x.title}),id);return}
    const row=el.closest('.li');
    if(!row||RM()){completeTask(x);return}
    if(row.classList.contains('completing'))return;
    row.classList.add('completing');el.innerHTML=svg('check');celebrate(el);
    const hide=!(UI.view==='project'||UI.view==='task'||(UI.view==='tasks'&&UI.taskFilter==='done'));
    setTimeout(()=>{if(hide&&row.isConnected){row.style.overflow='hidden';row.animate([{opacity:1,height:row.offsetHeight+'px'},{opacity:0,height:'0px',paddingTop:'0px',paddingBottom:'0px',borderBottomWidth:'0px'}],{duration:240,easing:'cubic-bezier(.65,0,.35,1)',fill:'forwards'}).onfinish=()=>completeTask(x)}else completeTask(x)},430)},
  delTask(d,el){const x=taskOf(d.id);if(!x)return;const row=el&&el.closest('.li');
    /* the row folds away first, so it is clear what was removed; undo is offered right after */
    if(row&&!RM()&&!dlg.open){row.style.overflow='hidden';row.animate([{opacity:1,height:row.offsetHeight+'px'},{opacity:0,height:'0px',paddingTop:'0px',paddingBottom:'0px'}],{duration:200,easing:'cubic-bezier(.65,0,.35,1)',fill:'forwards'}).onfinish=()=>removeTask(x)}else removeTask(x)},
  timerStart(d){const x=taskOf(d.id);if(!x)return;closeDlg();commit(t('Zamanlayıcı başladı'),()=>timerStart(x));render();toast(t('Zamanlayıcı başladı: {x}',{x:x.title}))},
  timerPause(){commit(t('Zamanlayıcı duraklatıldı'),()=>timerPause());render();toast(t('Duraklatıldı. Şu ana kadarki süre kaydedildi.'))},
  timerResume(){commit(t('Zamanlayıcı sürdü'),()=>timerResume());render()},
  timerStop(){commit(t('Zaman kaydedildi'),()=>timerStop());render()},
  delLog(d){const x=taskOf(d.id);if(!x)return;const i=+d.i;if(!x.logs[i])return;const id=commit(t('Zaman kaydı silindi'),()=>{x.logs.splice(i,1)});render();undoToast(t('Zaman kaydı silindi'),id)},
  tf(d){UI.taskFilter=d.v;UI.taskLimit=100;render()},
  moreTasks(){UI.taskLimit=(UI.taskLimit||100)+100;render()},
  tasksFilter(d){UI.taskFilter=d.v;go('tasks')},
  subToggle(d){const x=taskOf(d.id);const st=x&&x.subtasks.find(s=>s.id===d.s);if(!st)return;commit(t('Alt görev güncellendi'),()=>{st.done=!st.done;logAct('task',x.id,'subtask',{label:x.title,note:(st.done?'✓ ':'○ ')+st.title})});render();document.querySelector(`[data-a="subToggle"][data-s="${d.s}"]`)?.focus()},
  subDel(d){const x=taskOf(d.id);if(!x)return;const id=commit(t('Alt görev silindi'),()=>{x.subtasks=x.subtasks.filter(s=>s.id!==d.s)});render();undoToast(t('Alt görev silindi'),id)},
  commentDel(d){const x=taskOf(d.id);if(!x)return;const id=commit(t('Yorum silindi'),()=>{x.comments=x.comments.filter(c=>c.id!==d.c)});render();undoToast(t('Yorum silindi'),id)},
  saveTaskTpl(d){const x=taskOf(d.id);if(!x)return;commit(t('Şablon kaydedildi'),()=>{S.templates.push(templateFrom('task',x.title,[x]))});toast(t('“{x}” görev şablonu olarak kaydedildi',{x:x.title}))},
  fromTpl(){openTemplatePicker('task')},
  /* projects */
  newProject(){openProjectForm()},editProject(d){openProjectForm(d.id)},
  openProject(d){closePops();go('project',d.id)},
  delProject(d){const p=projectOf(d.id);if(p)removeProject(p)},
  archiveProject(d){const p=projectOf(d.id);if(p)setArchived(p,true)},
  restoreProject(d){const p=projectOf(d.id);if(p)setArchived(p,false)},
  projArchived(d){UI.projArchived=d.v==='1';render()},
  saveProjTpl(d){const p=projectOf(d.id);if(!p)return;const ts=S.tasks.filter(x=>x.projectId===p.id);if(!ts.length){toast(t('Şablon için projede en az bir görev olmalı.'));return}commit(t('Şablon kaydedildi'),()=>{S.templates.push(templateFrom('project',p.name,ts))});toast(t('“{x}” proje şablonu olarak kaydedildi',{x:p.name}))},
  delTpl(d){const i=S.templates.findIndex(x=>x.id===d.id);if(i<0)return;const id=commit(t('Şablon silindi'),()=>{S.templates.splice(i,1)});render();undoToast(t('Şablon silindi'),id)},
  planProject(d){const ts=S.tasks.filter(x=>x.projectId===d.id&&x.status!=='done'&&mine(x));if(!ts.some(x=>remainingH(x)>0)){toast(t('Bu projede planlanacak süre yok. Görevlere tahmini süre ekle.'));return}suggestFor(ts)},
  newMilestone(d){openEvent(null,{type:'milestone',projectId:d.p||null,start:toLocal((()=>{const x=addDays(sod(new Date()),7);x.setHours(S.settings.workEnd,0,0,0);return x})())})},
  boardCol(d){UI.boardCol=d.v;render()},
  /* calendar */
  newEvent(){openEvent()},editEvent(d){closePops();openEvent(d.id)},
  delEvent(d){const e=S.events.find(x=>x.id===d.id);if(!e)return;const id=commit(t('Etkinlik silindi'),()=>{S.events=S.events.filter(x=>x!==e)});closeDlg();render();undoToast(t('Etkinlik silindi'),id)},
  calSlot(d,el,ev){if(ev.target.closest('.ev,.mark,.evbar,.cal-empty-ov,.slot-draft'))return;const r=el.getBoundingClientRect();const h=CAL_S+Math.floor((ev.clientY-r.top)/PX*2)/2;const s=parseDay(d.day);s.setHours(Math.floor(h),(h%1)*60);openEvent(null,{start:toLocal(s),end:toLocal(new Date(+s+HOUR)),type:'meeting'})},
  calNav(d){const m=UI.calMode,c=UI.calDate;const n=d.v==='0'?sod(new Date()):m==='month'?new Date(c.getFullYear(),c.getMonth()+ +d.v,1):addDays(c,(m==='day'?1:m==='agenda'?14:7)*+d.v);go('calendar',dayKey(n),m)},
  calDay(d){go('calendar',d.day,'day')},
  calList(d){UI.calList=d.v==='1';render()},
  blockInfo(d){openBlockInfo(d.id)},
  editBlock(d){openBlockEdit(d.id)},
  delBlock(d){const b=S.blocks.find(x=>x.id===d.id);if(!b)return;const id=commit(t('Blok kaldırıldı'),()=>{S.blocks=S.blocks.filter(x=>x!==b)});closeDlg();render();undoToast(t('Blok kaldırıldı'),id)},
  resolve(d){openConflictFor(d.kind,d.id)},
  /* planning */
  optimize(){optimizeOverload()},
  planOne(d){const x=taskOf(d.id);x&&suggestFor([x])},
  planAll(d,el){withLoading(el,async()=>suggestFor(myOpen().filter(x=>remainingH(x)>0)))},
  planWeekend(d,el){if(!UI.draft)return;const ids=UI.draft.taskIds.map(taskOf).filter(Boolean);withLoading(el,async()=>suggestFor(ids,UI.draft.request,{weekend:true}))},
  editDraft(){UI.draftEdit=!UI.draftEdit;render()},
  dropDraft(d){if(!UI.draft)return;UI.draft.blocks=UI.draft.blocks.filter(b=>b.id!==d.id);render()},
  applyDraft(d,el){withLoading(el,async()=>applyDraft())},
  cancelDraft(){UI.draft=null;render();toast(t('Öneri iptal edildi, takvim değişmedi'))},
  draftCal(){const f=UI.draft?.blocks[0];go('calendar',f?f.start.slice(0,10):null,isMobile()?'day':'week')},
  /* notifications */
  bell(){const p=$('#notif');if(!p.hidden){p.hidden=true;$('#bellbtn').setAttribute('aria-expanded','false');return}renderNotif();p.hidden=false;$('#bellbtn').setAttribute('aria-expanded','true');p.querySelector('button,a')?.focus()},
  notifTab(d){UI.notifTab=d.v;renderNotif()},
  notifRead(d){markRead([d.id]);renderNotif();renderShell()},
  notifAll(){markRead(notifications().map(n=>n.id));renderNotif();renderShell()},
  notifOpen(d,el){markRead([d.id]);closePops();location.hash=el.getAttribute('href')},
  /* team */
  newMember(){openMemberForm()},editMember(d){openMemberForm(d.id)},
  delMember(d){const m=S.members.find(x=>x.id===d.id);if(!m)return;const n=S.tasks.filter(x=>x.assignee===m.id).length;
    confirmDlg({title:t('Üye kaldırılsın mı?'),text:t('{x} çalışma alanından kaldırılır. Atanmış {n} görev sana geri döner.',{x:`<b>${esc(m.name)}</b>`,n}),ok:t('Kaldır'),onOk:()=>{const id=commit(t('Üye kaldırıldı'),()=>{S.members=S.members.filter(x=>x!==m);S.tasks.forEach(x=>{if(x.assignee===m.id)x.assignee=null});logAct('workspace','','member_removed',{label:m.name})});render();undoToast(t('Üye kaldırıldı'),id)}})},
  /* roadmap */
  rm(d){const cur=rmState(d.id),nx=cur==='todo'?'proto':cur==='proto'?'done':'todo';commit(t('Yol haritası güncellendi'),()=>{S.roadmap[d.id]=nx});render();document.querySelector(`[data-a="rm"][data-id="${d.id}"]`)?.focus()},
  rmReset(){commit(t('Yol haritası sıfırlandı'),()=>{S.roadmap={}});render();toast(t('Yol haritası varsayılana döndü'))},
  /* data */
  unics(){const n=S.events.filter(e=>e.source==='ics').length;const id=commit(t('İçe aktarılan etkinlikler silindi'),()=>{S.events=S.events.filter(e=>e.source!=='ics')});render();undoToast(t('{n} içe aktarılan etkinlik silindi',{n}),id)},
  seed(){if(S.tasks.some(x=>x.demo)){toast(t('Demo verisi zaten yüklü'));return}seed()},unseed(){unseed()},
  reset(){confirmDlg({title:t('Tüm veriler silinsin mi?'),text:t('Projeler, görevler, etkinlikler ve bloklar bu tarayıcıdan silinir. Hemen ardından geri alabilirsin; kalıcı yedek için önce JSON dışa aktar.'),ok:t('Evet, sil'),onOk:()=>{const id=commit(t('Tüm veriler silindi'),()=>{const pr=S.profile,se=S.settings,rm=S.roadmap,ws=S.workspace;S=({...blank(),workspace:ws,profile:pr,settings:se,roadmap:rm,onboarded:true})});UI.draft=null;setTimeout(()=>{go('overview');undoToast(t('Tüm veriler silindi'),id)})}})},
  rerender(){render()},
  devSync(d){setSync(d.v)},
  retrySave(){save();if(cloudOn())cloudSync({loud:true});else if(SYNC.state!=='error')toast(t('Kaydedildi'))},
  syncNow(){if(cloudOn())cloudSync({loud:true}).then(()=>{if(CLOUD.status==='synced')toast(t('Buluta kaydedildi'));if(UI.view==='settings')render()})},
  downloadBackup(){const raw=prefs.get(BACKUP_KEY);if(raw)download('workflowx-onceki-veri.json',raw,'application/json')},
  export(){download('workflowx-'+dayKey(new Date())+'.json',JSON.stringify({...S,schema:SCHEMA_VERSION,exportedAt:new Date().toISOString()},null,2),'application/json');toast(t('Yedek indirildi'))},
  retryLoad(d,el){UI.boot='idle';withLoading(el,bootApp)},
  downloadCorrupt(){const raw=storage.corruptCopy();if(raw)download('workflowx-bozuk-veri.json',raw,'application/json')},
  resetData(){confirmDlg({title:t('Boş bir çalışma alanıyla başlansın mı?'),text:t('Okunamayan veriler bu cihazdan kaldırılır. Bozuk verinin bir kopyasını önce indirebilirsin.'),ok:t('Boş başla'),onOk:()=>{storage.reset();setState(blank());UI.boot='ready';save();setTimeout(()=>{go('overview');onboard()})}})},
  devToggle(d){const k='dev.'+d.k;if(d.k==='fail')prefs.set(k,prefs.get(k)==='1'?'0':'1');else prefs.set(k,+prefs.get(k,0)?0:1200);render();toast(t('Geliştirici ayarı kaydedildi. Etkisini görmek için sayfayı yenile.'))},
  /* onboarding */
  async authGoogle(d,el){await withLoading(el,async()=>{const r=await authGoogle();if(!r.ok){const e=$('#au-err');if(e)e.textContent=r.msg;else toast(r.msg)}})},
  async authResend(d,el){const e=String(d.e||'');if(!EMAIL_RX.test(e))return;if(el.dataset.wait)return;
    const r=await authResend(e);toast(r.ok?t('Doğrulama e-postası tekrar gönderildi.'):r.msg);
    if(r.ok){let n=60;el.dataset.wait='1';el.disabled=true;const base=el.textContent;const iv=setInterval(()=>{n--;if(!el.isConnected||n<=0){clearInterval(iv);if(el.isConnected){el.disabled=false;delete el.dataset.wait;el.textContent=base}return}el.textContent=t('{n} sn sonra tekrar gönderebilirsin',{n})},1000)}},
  pwEye(d,el){const i=document.getElementById(d.for);if(!i)return;const show=i.type==='password';i.type=show?'text':'password';el.setAttribute('aria-pressed',String(show));el.setAttribute('aria-label',show?t('Şifreyi gizle'):t('Şifreyi göster'));el.innerHTML=svg(show?'eyeOff':'eye');i.focus()},
  guestSkip(){prefs.set('import.'+AUTH.user.id,'skipped');closeDlg();if(!S.onboarded)onboard()},
  signOut(d){closePops();authSignOut(d.v==='all')},
  deleteAccount(){
    const email=String(AUTH.user?.email||'');if(!email)return;
    openDlg(`<form>${dlgHead(t('Hesabın silinsin mi?'))}<div class="dlg-b">
      <p style="margin-top:0">${t('Bu işlem geri alınamaz. Şunlar kalıcı olarak silinir:')}</p>
      <ul class="plain-list"><li>${svg('x','i s')} ${t('Hesabın ve giriş bilgilerin')}</li><li>${svg('x','i s')} ${t('Buluttaki tüm görev, proje, takvim ve ayarların')}</li><li>${svg('x','i s')} ${t('Bu cihazdaki hesap verilerin')}</li></ul>
      <p><button type="button" class="linkbtn" data-a="export">${svg('upload','i s')} ${t('Önce verilerimin yedeğini indir')}</button></p>
      <div class="f"><label for="delc">${t('Onaylamak için e-posta adresini yaz')}: <b>${esc(email)}</b></label><input id="delc" name="confirm" type="email" autocomplete="off" spellcheck="false" maxlength="254" required></div>
      <div class="err" role="alert"></div></div>
      <div class="dlg-f"><button type="button" class="btn" data-a="closeDlg">${t('Vazgeç')}</button><button class="btn danger-solid">${svg('trash')}${t('Hesabımı kalıcı olarak sil')}</button></div></form>`,(fd,f,btn)=>{
      if(String(fd.get('confirm')||'').trim().toLowerCase()!==email.toLowerCase())return t('E-posta adresi eşleşmiyor.');
      withLoading(btn||f.querySelector('.danger-solid'),async()=>{
        const r=await authDeleteAccount();
        if(!r.ok){const b=f.querySelector('.err');if(b)b.textContent=r.msg;return}
        closeDlg();location.hash='#/';setTimeout(()=>toast(t('Hesabın ve tüm verilerin silindi.')),300);
      });
      return KEEP_OPEN;
    });
  },
  reportMd(d){const day=RX.day.test(d.w||'')?parseDay(d.w):new Date(),r=weeklyReport(day);download('workflowx-rapor-'+dayKey(r.from)+'.md',reportMarkdown(r),'text/markdown');toast(t('Rapor indirildi'))},
  async reportCopy(d){const day=RX.day.test(d.w||'')?parseDay(d.w):new Date();try{await navigator.clipboard.writeText(reportMarkdown(weeklyReport(day)));toast(t('Rapor panoya kopyalandı'))}catch{toast(t('Kopyalanamadı. "Markdown indir" ile dosya olarak alabilirsin.'))}},
  reportPrint(){window.print()},
  usageClear(){planUsage.clear();render();toast(t('Kullanım kaydı temizlendi'))},
  userMenu(){const p=$('#upop'),b=$('#av');if(!p.hidden){p.hidden=true;b.setAttribute('aria-expanded','false');return}closePops();renderUserMenu();p.hidden=false;b.setAttribute('aria-expanded','true');p.querySelector('a,button')?.focus()},
  obSkip(){S.onboarded=true;OB.data={};save();closeDlg();render();toast(t('İstediğin zaman Ayarlar’dan çalışma saatlerini değiştirebilirsin.'))},
  obBack(){const f=dlg.querySelector('form');if(OB.step===3&&f){OB.data.project=f.elements.project.value;OB.data.task=f.elements.task.value}onboard(Math.max(1,OB.step-1))},
  obDemo(){const f=dlg.querySelector('form');const n=f.elements.name?.value.trim();if(n)S.profile.name=n.slice(0,120);S.onboarded=true;OB.data={};closeDlg();seed()},
};

/* JSON import: validated and never destructive by default.
   - Merge (default): existing records win, new ones are added.
   - Replace: the current data is first saved as a local backup (downloadable in Settings → Data). */
/* Backups are per account so one person's copy is never offered to another on a shared device. */
const BACKUP_KEY_BASE='backup';Object.defineProperty(window,'BACKUP_KEY',{get:()=>storage.scope?BACKUP_KEY_BASE+'.'+storage.scope:BACKUP_KEY_BASE});
function mergeStates(cur,inc){
  const out=JSON.parse(JSON.stringify(cur));let added=0;
  for(const k of ['projects','tasks','events','blocks','members','templates']){const have=new Set(out[k].map(x=>x.id));for(const x of inc[k])if(!have.has(x.id)){out[k].push(x);added++}}
  const acts=new Set(out.activity.map(a=>a.id));inc.activity.forEach(a=>{if(!acts.has(a.id))out.activity.push(a)});
  return{state:sanitizeState(out).state,added};
}
function importJSON(text){
  let data;try{data=JSON.parse(text)}catch{toast(t('Dosya geçersiz: JSON olarak okunamadı.'));return}
  if(!data||typeof data!=='object'||!Array.isArray(data.tasks)||!Array.isArray(data.projects)){toast(t('Dosya geçersiz: WorkFlowX yedeği değil.'));return}
  const{state,report}=sanitizeState(data);
  const hasData=S.tasks.length+S.projects.length+S.events.length>0;
  openDlg(`<form>${dlgHead(t('Yedeği içe aktar'))}<div class="dlg-b">
    <p style="margin-top:0">${t('Dosyada {p} proje, {t} görev ve {e} etkinlik var.',{p:state.projects.length,t:state.tasks.length,e:state.events.length})}${report.fixed+report.dropped?' '+t('{n} sorunlu kayıt düzeltilecek.',{n:report.fixed+report.dropped}):''}</p>
    ${hasData?`<fieldset class="imp-mode"><legend class="sr">${t('İçe aktarma yöntemi')}</legend>
      <label class="imp-opt"><input type="radio" name="mode" value="merge" checked><span><b>${t('Birleştir')}</b> <small class="pill">${t('Önerilen')}</small><br><small>${t('Mevcut verilerin korunur; yedekteki yeni kayıtlar eklenir.')}</small></span></label>
      <label class="imp-opt"><input type="radio" name="mode" value="replace"><span><b>${t('Değiştir')}</b><br><small>${t('Mevcut veriler yedektekiyle değiştirilir. Önce otomatik yedek alınır; Ayarlar → Veri’den indirebilirsin.')}</small></span></label></fieldset>`:''}
    <div class="err" role="alert"></div></div><div class="dlg-f"><button type="button" class="btn" data-a="closeDlg">${t('Vazgeç')}</button><button class="btn primary">${t('İçe aktar')}</button></div></form>`,fd=>{
    const mode=hasData?fd.get('mode'):'replace';
    let id,msg;
    if(mode==='merge'){const m=mergeStates(S,state);id=commit(t('Yedek birleştirildi'),()=>{S=m.state});msg=t('{n} yeni kayıt eklendi; mevcut verilerin korundu.',{n:m.added})}
    else{if(hasData)prefs.set(BACKUP_KEY,JSON.stringify({...S,schema:SCHEMA_VERSION,backupAt:new Date().toISOString()}));id=commit(t('Yedek içe aktarıldı'),()=>{S=state});msg=hasData?t('Veriler değiştirildi. Önceki verilerin yedeği Ayarlar → Veri’de.'):t('Veriler içe aktarıldı')}
    UI.draft=null;setTimeout(()=>{go('overview');undoToast(msg,id)});
  });
}
function closePops(){$('#notif').hidden=true;$('#bellbtn')?.setAttribute('aria-expanded','false');const up=$('#upop');if(up&&!up.hidden){up.hidden=true;$('#av')?.setAttribute('aria-expanded','false')}const w=$('#wspop');if(w&&!w.hidden){w.hidden=true;$('#wsbtn')?.setAttribute('aria-expanded','false')}}
let suppressClick=false;
document.addEventListener('click',e=>{
  if(suppressClick){suppressClick=false;e.preventDefault();e.stopPropagation();return}
  if(e.target.closest('#cmdk'))return;
  const el=e.target.closest('[data-a]');
  if(!e.target.closest('#notif')&&!e.target.closest('[data-a="bell"]')&&!e.target.closest('#wspop')&&!e.target.closest('[data-a="ws"]')&&!e.target.closest('#upop')&&!e.target.closest('[data-a="userMenu"]'))closePops();
  if(e.target.closest('#upop a'))closePops();
  if(!e.target.closest('#more')&&!e.target.closest('[data-a="more"]')&&!$('#more').hidden){$('#more').hidden=true;renderShell()}
  if(e.target.closest('#more a'))$('#more').hidden=true;
  if(!el||el.disabled)return;
  const fn=A[el.dataset.a];if(fn){e.preventDefault();safeRun(()=>fn(el.dataset,el,e))}
});
/* A failing action never fails silently or shows a stack trace: the user gets a plain message
   and a way forward; the technical error goes to the console for debugging. */
function safeRun(fn){try{const r=fn();if(r&&typeof r.catch==='function')r.catch(actionFailed);return r}catch(err){actionFailed(err)}}
function actionFailed(err){console.error('[action]',err);toast(t('İşlem gerçekleştirilemedi. Verilerin korunuyor; tekrar dene.'),{label:t('Genel bakışa dön'),fn:()=>go('overview')})}
window.addEventListener('unhandledrejection',e=>{console.error('[async]',e.reason);toast(t('İşlem gerçekleştirilemedi. Tekrar dene.'))});
document.addEventListener('change',e=>{
  const el=e.target,c=el.dataset.c;
  if(c==='status'){const x=taskOf(el.dataset.id);if(x&&ENUM.status.includes(el.value)){const was=x.status;let r=null;const id=commit(t('Durum değişti'),()=>{r=opSetStatus(x,el.value)});render();undoToast(t('“{x}” → {s}',{x:x.title,s:ST(x.status)})+(r&&r.next?' · '+t('Sonraki tekrar: {d}',{d:relDue(r.next.due)}):''),id);void was}}
  if(c==='theme'){const v=el.value;if(v==='system'){delete document.documentElement.dataset.theme;prefs.del('theme')}else setTheme(v);toast(t('Tema güncellendi'))}
  if(c==='langset'){setLang(el.value)}
  if(c==='accent'){setAccent(el.value)}
  if(c==='calPref'){setCalPref(el.dataset.k,el.checked?'1':'0')}
  if(c==='role'){const m=S.members.find(x=>x.id===el.dataset.id);if(m&&ENUM.role.includes(el.value)&&el.value!=='owner'){commit(t('Rol değişti'),()=>{const was=m.role;m.role=el.value;logAct('workspace','','member_role',{label:m.name,note:t(ROLE_K[was])+' → '+t(ROLE_K[m.role])})});render();toast(t('{x} artık {r}',{x:m.name,r:t(ROLE_K[m.role])}))}}
  if(c==='assign'){const x=taskOf(el.dataset.id);if(x){const v=el.value==='me'?null:(S.members.some(m=>m.id===el.value)?el.value:null);const before=x.assignee;commit(t('Görev atandı'),()=>{x.assignee=v;logAct('task',x.id,'assigned',{label:x.title,changes:[['assignee',memberName(before),memberName(v)]]})});render()}}
  if((c==='imp'||c==='ics')&&el.files[0]){const file=el.files[0];el.value='';if(file.size>5e6){toast(t('Dosya çok büyük (en fazla 5 MB).'));return}const r=new FileReader();
    r.onload=()=>{if(c==='ics'){try{importICS(String(r.result))}catch(err){console.error(err);toast(t('.ics dosyası okunamadı.'))}}else importJSON(String(r.result))};
    r.onerror=()=>toast(t('Dosya okunamadı.'));r.readAsText(file)}
});
document.addEventListener('submit',e=>{
  const f=e.target;if(!f.dataset.f)return;e.preventDefault();const fd=new FormData(f);
  if(f.dataset.f==='nl')handleNL(fd.get('q'));
  if(f.dataset.f==='qadd')submitQuick(fd.get('q'));
  if(f.dataset.f==='auth')submitAuth(f);
  if(f.dataset.f==='pwchange'){const fd=new FormData(f),pw=String(fd.get('password')||''),er=f.querySelector('.err'),bad=pwProblem(pw)||(String(fd.get('password2')||'')!==pw?t('Şifreler aynı değil.'):'');
    if(bad){er.textContent=bad;return}er.textContent='';const btn=f.querySelector('button.btn:not(.pw-eye)');
    withLoading(btn,async()=>{const r=await authUpdatePassword(pw);f.reset();if(!r.ok){er.textContent=r.msg;return}btnDone(btn);toast(t('Şifren güncellendi.'))})}
  if(f.dataset.f==='sub'){const x=taskOf(f.dataset.id),title=String(fd.get('title')||'').trim().slice(0,200);if(!x)return;if(!title){f.querySelector('input').focus();return}if(x.subtasks.length>=50){toast(t('Bir görevde en fazla 50 alt görev olabilir.'));return}
    commit(t('Alt görev eklendi'),()=>{x.subtasks.push({id:uid(),title,done:false});logAct('task',x.id,'subtask',{label:x.title,note:'+ '+title})});render();$('#subin')?.focus()}
  if(f.dataset.f==='comment'){const x=taskOf(f.dataset.id),text=String(fd.get('text')||'').trim().slice(0,2000);if(!x)return;if(!text){f.querySelector('textarea').focus();return}
    commit(t('Yorum eklendi'),()=>{x.comments.push({id:uid(),author:'me',text,at:new Date().toISOString()});logAct('task',x.id,'commented',{label:x.title})});render()}
  if(f.dataset.f==='settings'){const sec=f.dataset.s,E=$('#serr'),btn=f.querySelector('.btn.primary');
    if(sec==='profile')commit(t('Profil güncellendi'),()=>{S.profile.name=String(fd.get('name')||'').trim().slice(0,120);S.profile.role=String(fd.get('role')||'').trim().slice(0,120);S.workspace.name=String(fd.get('wsname')||'').trim().slice(0,120)});
    if(sec==='work'){const ws=+fd.get('workStart'),we=+fd.get('workEnd'),md=+fd.get('maxDaily');const days=fd.getAll('wd').map(Number).filter(d=>d>=0&&d<=6);
      if(!(Number.isInteger(ws)&&Number.isInteger(we)&&we>ws&&ws>=0&&we<=24)){E.textContent=t('Mesai bitişi başlangıçtan sonra olmalı.');return}if(!(md>0)||md>we-ws){E.textContent=t('Günlük kapasite mesai süresinden büyük olamaz.');return}if(!days.length){E.textContent=t('En az bir çalışma günü seç.');return}
      commit(t('Çalışma saatleri güncellendi'),()=>Object.assign(S.settings,{workStart:ws,workEnd:we,maxDaily:md,workDays:days,useFactor:fd.get('useFactor')==='on'}))}
    if(sec==='notifications'){const notify=Object.fromEntries(Object.keys(DEFAULT_NOTIFY).map(k=>[k,fd.get('n_'+k)==='on']));commit(t('Bildirim ayarları güncellendi'),()=>{S.settings.notify=notify})}
    render();toast(t('Kaydedildi'));const nb=document.querySelector(`form[data-s="${sec}"] .btn.primary`);if(nb&&!RM())btnDone(nb);void btn}
});
