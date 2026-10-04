/* ================= COMMAND PALETTE ================= */
const cmdk=$('#cmdk');const CMD={items:[],act:0};
const norm=s=>String(s||'').toLocaleLowerCase('tr-TR').normalize('NFD').replace(/[̀-ͯ]/g,'').replace(/ı/g,'i');
function cmdSource(){
  const acts=[
    {g:'Eylemler',ic:'plus',l:t('Görev oluştur'),k:'N',run:()=>quickAdd('task')},
    {g:'Eylemler',ic:'folder',l:t('Proje oluştur'),k:'P',run:()=>openProjectForm()},
    {g:'Eylemler',ic:'cal',l:t('Etkinlik oluştur'),k:'E',run:()=>openEvent()},
    {g:'Eylemler',ic:'tasks',l:t('Şablondan görev oluştur'),run:()=>openTemplatePicker('task')},
    {g:'Eylemler',ic:'wand',l:t('Tüm açık işleri planla'),run:()=>A.planAll()},
    {g:'Eylemler',ic:'upload',l:t('.ics içe aktar'),run:()=>{go('calendar');setTimeout(()=>document.querySelector('#main input[data-c=ics]')?.click(),30)}},
    {g:'Eylemler',ic:'moon',l:t('Temayı değiştir'),run:()=>A.theme()},
    {g:'Eylemler',ic:'globe',l:LANG==='tr'?'Switch to English':'Türkçe’ye geç',run:()=>setLang(LANG==='tr'?'en':'tr')},
    {g:'Eylemler',ic:'keyboard',l:t('Klavye kısayolları'),k:'?',run:()=>showKeys()}
  ];
  if(authOn()&&AUTH.user)acts.push({g:'Eylemler',ic:'logout',l:t('Çıkış yap'),run:()=>authSignOut(false)});
  if(canRedo())acts.unshift({g:'Eylemler',ic:'refresh',l:t('Yinele: {x}',{x:HISTORY.future[HISTORY.future.length-1].label}),k:MAC?'⌘ ⇧ Z':'Ctrl ⇧ Z',run:redo});
  if(canUndo())acts.unshift({g:'Eylemler',ic:'left',l:t('Geri al: {x}',{x:HISTORY.past[HISTORY.past.length-1].label}),k:MAC?'⌘ Z':'Ctrl Z',run:undo});
  if(S.timer){acts.unshift({g:'Eylemler',ic:'stop',l:t('Zamanlayıcıyı durdur'),run:()=>A.timerStop()});acts.unshift(S.timer.paused?{g:'Eylemler',ic:'play',l:t('Zamanlayıcıyı sürdür'),run:()=>A.timerResume()}:{g:'Eylemler',ic:'pause',l:t('Zamanlayıcıyı duraklat'),run:()=>A.timerPause()})}
  const K={today:'T',overview:'G O',tasks:'G G',projects:'G P',calendar:'C',planning:'G L',analytics:'G A',roadmap:'G R',settings:'G S'};
  const L={today:'Bugünü aç',calendar:'Takvimi aç',planning:'Planlamayı aç',settings:'Ayarlara git'};
  const nav=[...NAV,['roadmap','Yol Haritası','map'],['settings','Ayarlar','settings']].map(([v,l,i])=>({g:'Git',ic:i,l:t(L[v]||l),k:K[v]||'',run:()=>go(v)}));
  return[...acts,...nav];
}
function hlMatch(l,q){if(!q)return esc(l);const i=norm(l).indexOf(q);if(i<0)return esc(l);return esc(l.slice(0,i))+'<mark>'+esc(l.slice(i,i+q.length))+'</mark>'+esc(l.slice(i+q.length))}
function renderCmd(){
  const q=norm($('#cmdq').value.trim());
  let items=cmdSource().filter(i=>!q||norm(i.l).includes(q));
  if(q){const m=s=>norm(s).includes(q);
    items=[...S.tasks.filter(x=>m(x.title)||(x.tags||[]).some(m)).slice(0,8).map(x=>({g:'Görevler',ic:x.status==='done'?'check':'tasks',l:x.title,k:x.due?relDue(x.due):'',run:()=>go('task',x.id)})),
      ...S.projects.filter(p=>m(p.name)).slice(0,5).map(p=>({g:'Projeler',ic:'folder',l:p.name,k:p.archived?t('Arşivde'):'',run:()=>go('project',p.id)})),
      ...S.events.filter(x=>m(x.title)||m(x.location||'')).slice(0,5).map(x=>({g:'Etkinlikler',ic:'cal',l:x.title,k:fDT(x.start),run:()=>openEvent(x.id)})),
      ...allMembers().filter(p=>m(p.name)||m(p.email||'')).slice(0,5).map(p=>({g:'Kişiler',ic:'users',l:p.name,k:t(ROLE_K[p.role]),run:()=>go('team')})),...items];
    if(!items.length){const raw=$('#cmdq').value.trim().slice(0,200);items=[{g:'Sonuç yok',ic:'plus',l:t('“{x}” adlı görev oluştur',{x:raw}),run:()=>{const x=newTask({title:raw});const id=commit(t('Görev eklendi'),()=>{S.tasks.push(x);logAct('task',x.id,'created',{label:x.title})});render();undoToast(t('Görev eklendi: {x}',{x:raw}),id)}},{g:'Sonuç yok',ic:'search',l:t('Aramayı temizle'),run:()=>{openCmd()}}]}
  }
  CMD.items=items;CMD.act=Math.max(0,Math.min(CMD.act,items.length-1));
  let html='',g=null;
  items.forEach((it,i)=>{if(it.g!==g){g=it.g;html+=`<div class="cmd-h" role="presentation">${t(g)}</div>`}html+=`<div class="cmd" role="option" id="cmd-${i}" data-i="${i}" aria-selected="${i===CMD.act}">${svg(it.ic)}<span class="lab">${hlMatch(it.l,q)}</span>${it.k?`<small>${esc(it.k)}</small>`:''}</div>`});
  $('#cmdl').innerHTML=html||`<p style="padding:16px;color:var(--muted);margin:0">${t('Sonuç yok.')}</p>`;
  $('#cmdq').setAttribute('aria-activedescendant',items.length?'cmd-'+CMD.act:'');
}
function moveCmd(i){if(!CMD.items.length)return;CMD.act=(i+CMD.items.length)%CMD.items.length;cmdk.querySelectorAll('.cmd').forEach(el=>el.setAttribute('aria-selected',+el.dataset.i===CMD.act));const el=$('#cmd-'+CMD.act);el&&el.scrollIntoView({block:'nearest'});$('#cmdq').setAttribute('aria-activedescendant','cmd-'+CMD.act)}
function runCmd(i){const it=CMD.items[i];if(!it)return;closeCmd();setTimeout(()=>it.run(),0)}
function openCmd(){
  cmdk.innerHTML=`<div class="cmdk-in">${svg('search')}<input id="cmdq" role="combobox" aria-expanded="true" aria-controls="cmdl" aria-autocomplete="list" autocomplete="off" spellcheck="false" placeholder="${t('Ara veya komut çalıştır…')}" aria-label="${t('Komut paleti')}"><kbd>esc</kbd></div><div id="cmdl" role="listbox" aria-label="${t('Sonuçlar')}"></div><div class="cmdk-foot"><span><kbd>↑</kbd> <kbd>↓</kbd> ${t('gezin')}</span><span><kbd>↵</kbd> ${t('seç')}</span><span><kbd>T</kbd> ${t('Bugün')}</span><span><kbd>?</kbd> ${t('kısayollar')}</span></div>`;
  CMD.act=0;cmdk.showModal();renderCmd();$('#cmdq').focus();
}
function closeCmd(){if(cmdk.open)cmdk.close()}
cmdk.addEventListener('input',e=>{if(e.target.id==='cmdq'){CMD.act=0;renderCmd()}});
cmdk.addEventListener('keydown',e=>{if(e.key==='ArrowDown'){e.preventDefault();moveCmd(CMD.act+1)}else if(e.key==='ArrowUp'){e.preventDefault();moveCmd(CMD.act-1)}else if(e.key==='Enter'){e.preventDefault();runCmd(CMD.act)}});
cmdk.addEventListener('mousemove',e=>{const c=e.target.closest('.cmd');if(c&&+c.dataset.i!==CMD.act)moveCmd(+c.dataset.i)});
cmdk.addEventListener('click',e=>{if(e.target===cmdk){closeCmd();return}const c=e.target.closest('.cmd');if(c)runCmd(+c.dataset.i)});

