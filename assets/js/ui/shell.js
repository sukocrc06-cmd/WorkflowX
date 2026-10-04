/* ================= SHELL =================
   Sidebar, top bar and mobile navigation. Navigation items are real links
   (<a href="#/app/…">), so they work with middle-click, keyboard and history. */
const NAV=[['today','Bugün','sun'],['overview','Genel Bakış','home'],['tasks','Görevlerim','tasks'],['projects','Projeler','folder'],['calendar','Takvim','cal'],['planning','Planlama','spark'],['analytics','Analiz','chart'],['team','Ekip','users']];
const MOBILE_NAV=[['today','Bugün','sun'],['tasks','Görevler','tasks'],['calendar','Takvim','cal'],['projects','Projeler','folder']];
const MORE_NAV=[['overview','Genel Bakış','home'],['planning','Planlama','spark'],['analytics','Analiz','chart'],['team','Ekip','users'],['roadmap','Yol Haritası','map'],['settings','Ayarlar','settings']];
const langSwitch=()=>`<div class="langsw" role="group" aria-label="${t('Dil')}"><button type="button" class="${LANG==='tr'?'on':''}" data-a="lang" data-v="tr" aria-pressed="${LANG==='tr'}">TR</button><button type="button" class="${LANG==='en'?'on':''}" data-a="lang" data-v="en" aria-pressed="${LANG==='en'}">EN</button></div>`;
const navOn=k=>UI.view===k||(k==='projects'&&UI.view==='project')||(k==='tasks'&&UI.view==='task');
/* Workspace switcher: the personal workspace is the only one in this phase. Company and
   team workspaces are shown as what they will be, not as fake working options. */
function wsSwitch(){
  const name=S.workspace.name||t('Kişisel çalışma alanı');
  return`<div class="ws"><button type="button" class="ws-btn" id="wsbtn" data-a="ws" aria-haspopup="true" aria-expanded="false" aria-controls="wspop"><span class="ws-ic ${avHue(name)}" aria-hidden="true">${esc(initials(name))}</span><span class="ws-n"><b>${esc(name)}</b><small>${t('Kişisel')} · ${cloudOn()?t('hesabında'):t('bu cihazda')}</small></span>${svg('right','i s ws-chev')}</button>
    <div class="pop ws-pop" id="wspop" hidden><div class="pop-h">${t('Çalışma alanları')}</div>
      ${WORKSPACE_KINDS.map(([k,l])=>k==='personal'?`<a class="pop-item on" href="#/app/settings" aria-current="true">${svg('check')}<span><b style="font-weight:500">${esc(name)}</b><br><small>${t(l)}</small></span></a>`:`<div class="pop-item dis" aria-disabled="true">${svg('users')}<span>${t(l)}<br><small>${t('Hesaplar ve ekip senkronu ile gelecek')}</small></span></div>`).join('')}
    </div></div>`;
}
/* One indicator for every persistence state. Without an account: saved/offline/error.
   With an account core/sync.js also drives saving/syncing/synced/failed through setSync(). */
const SYNC_L={saving:['Kaydediliyor…','refresh'],saved:['Bu cihaza kaydedildi','check'],offline:['Çevrimdışı · bu cihaza kaydediliyor','alert'],error:['Kaydedilemedi · tekrar dene','alert'],failed:['Buluta kaydedilemedi · tekrar dene','alert'],syncing:['Buluta kaydediliyor…','refresh'],synced:['Buluta kaydedildi','check']};
function setSync(state){if(!SYNC_L[state])return;SYNC.state=state;SYNC.at=new Date();syncBadge()}
function syncBadge(){
  const el=$('#sync');if(!el)return;
  const st=navigator.onLine===false&&SYNC.state==='saved'?'offline':SYNC.state,[l,ic]=SYNC_L[st]||SYNC_L.saved;
  el.className='sync s-'+st+(SYNC.flash?' flash':'');el.innerHTML=`${svg(ic,'i s')}<span>${t(l)}</span>`;
  if(st==='error'||st==='failed'){el.setAttribute('role','button');el.tabIndex=0;el.dataset.a='retrySave'}else{el.removeAttribute('data-a');el.removeAttribute('tabindex');el.setAttribute('role','status')}
  el.title=SYNC.at?t('Son kayıt: {t}',{t:fTime(SYNC.at)}):t(l);
}
function renderNotif(){
  const all=notifications(),tab=UI.notifTab,list=tab==='unread'?all.filter(n=>!isRead(n)):all,un=all.filter(n=>!isRead(n)).length;
  $('#notif').innerHTML=`<div class="pop-h row" style="justify-content:space-between"><span>${t('Bildirimler')}</span>${un?`<button type="button" class="linkbtn" data-a="notifAll">${t('Tümünü okundu say')}</button>`:''}</div>
    <div class="seg-mini" role="group" aria-label="${t('Filtre')}"><button type="button" class="${tab==='all'?'on':''}" data-a="notifTab" data-v="all" aria-pressed="${tab==='all'}">${t('Tümü')} ${all.length}</button><button type="button" class="${tab==='unread'?'on':''}" data-a="notifTab" data-v="unread" aria-pressed="${tab==='unread'}">${t('Okunmamış')} ${un}</button></div>
    ${list.length?`<div class="notif-list">${list.map(n=>{const[cl,ic]=NOTIF_CATS[n.cat];return`<div class="notif ${isRead(n)?'read':''} ${n.lvl||''}"><a class="pop-item" href="${esc(n.href)}" data-a="notifOpen" data-id="${esc(n.id)}">${svg(ic)}<span><small class="ncat">${t(cl)}</small><b>${esc(n.t)}</b><small>${esc(n.s)}</small></span></a>${isRead(n)?'':`<button type="button" class="btn icon ghost sm" data-a="notifRead" data-id="${esc(n.id)}" aria-label="${t('Okundu say')}: ${esc(n.t)}"><i class="udot" aria-hidden="true"></i></button>`}</div>`}).join('')}</div>`
      :`<div class="notif-empty">${illo('bell')}<p>${tab==='unread'?t('Okunmamış bildirim yok.'):t('Yeni bildirim yok.')}</p><small>${t('Teslim tarihleri, proje teslimleri, takvim çakışmaları ve kapasite uyarıları burada görünür.')}</small><a class="linkbtn" href="#/app/settings/notifications">${t('Bildirim ayarları')}</a></div>`}
    <p class="notif-foot">${t('Görev ataması, bahsetme ve ekip bildirimleri hesaplar geldiğinde eklenecek.')}</p>`;
}
function renderShell(){
  const ready=UI.boot==='ready';
  const cnt=ready?{tasks:myOpen().length,projects:S.projects.filter(p=>!p.archived&&p.status!=='done').length}:{};
  const item=([k,l,i])=>`<a class="nav-item ${navOn(k)?'on':''}" href="${hrefFor(k)}" ${navOn(k)?'aria-current="page"':''}>${svg(i)}<span>${t(l)}</span>${cnt[k]?`<span class="cnt">${cnt[k]}</span>`:''}</a>`;
  $('#sidein').innerHTML=`<a class="logo" href="#/" aria-label="WorkFlowX — ${t('Ana sayfa')}"><span class="logo-mark" aria-hidden="true">W</span><span>WorkFlow<b>X</b></span></a>
    ${ready?wsSwitch():''}
    <nav aria-label="${t('Ana gezinme')}">${NAV.map(item).join('')}</nav><div class="sep"></div>
    <a class="nav-item ${navOn('roadmap')?'on':''}" href="#/app/roadmap" ${navOn('roadmap')?'aria-current="page"':''}>${svg('map')}<span>${t('Yol Haritası')}</span><span class="cnt">%${rmPct(ROADMAP.flatMap(p=>p.items))}</span></a>
    <div class="grow"></div><div class="sep"></div>
    ${item(['settings','Ayarlar','settings'])}
    <div class="side-foot">${langSwitch()}<button type="button" class="btn icon ghost sm" data-a="theme" aria-label="${t('Temayı değiştir')}">${svg('moon')}</button></div>`;
  const moreOn=MORE_NAV.some(([k])=>navOn(k));
  $('#mobnav').innerHTML=MOBILE_NAV.map(([k,l,i])=>`<a class="${navOn(k)?'on':''}" href="${hrefFor(k)}" ${navOn(k)?'aria-current="page"':''}>${svg(i)}<span>${t(l)}</span></a>`).join('')+`<button type="button" class="${moreOn?'on':''}" data-a="more" aria-expanded="${!$('#more').hidden}" aria-controls="more">${svg('menu')}<span>${t('Daha')}</span></button>`;
  $('#more').innerHTML=MORE_NAV.map(([k,l,i])=>`<a class="pop-item" href="${hrefFor(k)}">${svg(i)}${t(l)}</a>`).join('')+`<div class="row" style="padding:8px 10px">${langSwitch()}<button type="button" class="btn sm" data-a="theme">${svg('moon')}${t('Tema')}</button></div>${authOn()&&AUTH.user?`<button type="button" class="pop-item" data-a="signOut">${svg('logout')}${t('Çıkış yap')}</button>`:''}`;
  const n=S.profile.name.trim();$('#av').textContent=n?initials(n):'?';$('#av').className='avatar '+(n?avHue(n):'');
  $('#av').setAttribute('aria-label',t('Profil ve ayarlar'));
  const un=ready?unreadCount():0;
  {const bb=$('#bellbtn'),pu=+bb.dataset.un||0;bb.dataset.un=un;if(un>pu&&!RM()){bb.classList.remove('has-new');void bb.offsetWidth;bb.classList.add('has-new')}}
  $('#belldot').hidden=!un;$('#belldot').textContent=un>9?'9+':un||'';
  $('#bellbtn').setAttribute('aria-label',un?t('Bildirimler, {n} okunmamış',{n:un}):t('Bildirimler'));
  document.querySelectorAll('[data-t]').forEach(el=>el.textContent=t(el.dataset.t));
  $('#searchbtn kbd').textContent=MAC?'⌘ K':'Ctrl K';
  $('#searchbtn').setAttribute('aria-label',t('Ara veya komut çalıştır…'));
  $('#qabtn').innerHTML=`${svg('plus')}<span class="qa-label">${t('Hızlı ekle')}</span><kbd class="qa-label">N</kbd>`;
  $('#qabtn').setAttribute('aria-label',t('Hızlı ekle'));
  $('#fab').setAttribute('aria-label',t('Hızlı ekle'));
  $('#qabtn').disabled=$('#fab').disabled=!ready;
  $('#sync').hidden=!ready;
  const demoN=ready?S.tasks.filter(x=>x.demo).length+S.projects.filter(x=>x.demo).length+S.events.filter(x=>x.demo).length:0;
  const dc=$('#demochip');dc.hidden=!demoN;dc.textContent=t('Demo verisi');dc.title=t('Örnek veriler gösteriliyor. Ayarlar → Veri’den tek tıkla silebilirsin.');
  document.documentElement.lang=LANG;
  updateTimer();netBar();syncBadge();
}
