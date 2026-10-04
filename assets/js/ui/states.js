/* ================= LOADING & ERROR STATES =================
   Skeletons mirror each page's real layout so nothing jumps when data arrives.
   Error states always answer: what happened, what can I do — and offer an action. */
const sk=(w,h=12,extra='')=>`<span class="sk" style="width:${w};height:${h}px;${extra}"></span>`;
const skRows=(n,withRight=true)=>Array.from({length:n},()=>`<div class="li">${sk('18px',18,'border-radius:50%')}<div class="t">${sk('46%',13)}<div style="margin-top:6px">${sk('28%',10)}</div></div>${withRight?sk('64px',18,'border-radius:99px'):''}</div>`).join('');
const skKpis=()=>`<div class="kpis">${Array.from({length:4},()=>`<div class="kpi">${sk('50%',10)}<div style="margin-top:10px">${sk('60%',24)}</div></div>`).join('')}</div>`;
const skPanel=(cls,body)=>`<section class="panel ${cls}"><div class="panel-h">${sk('90px',10)}</div><div class="panel-b">${body}</div></section>`;
function skeleton(view){
  const head=`<div class="page-h"><div>${sk('220px',28)}<div style="margin-top:10px">${sk('300px',12)}</div></div></div>`;
  let body;
  switch(view){
    case 'tasks':case 'task':body=`${sk('100%',46,'border-radius:12px;display:block;margin-bottom:22px')}<div class="panel tasks-table"><div class="list">${skRows(7)}</div></div>`;break;
    case 'projects':body=`<div class="proj-grid">${Array.from({length:6},()=>`<div class="panel proj">${sk('60%',16)}<div style="margin:10px 0 16px">${sk('90%',10)}</div>${sk('100%',6)}<div style="margin-top:10px">${sk('40%',10)}</div></div>`).join('')}</div>`;break;
    case 'calendar':body=`<div class="panel" style="padding:14px"><div style="display:grid;grid-template-columns:56px repeat(7,1fr);gap:8px">${Array.from({length:8},(_, i)=>i?sk('100%',36,'border-radius:8px'):'<span></span>').join('')}</div><div style="margin-top:12px">${sk('100%',420,'border-radius:10px;display:block')}</div></div>`;break;
    case 'today':body=`${sk('100%',64,'border-radius:12px;display:block;margin-bottom:16px')}${Array.from({length:3},()=>sk('100%',58,'border-radius:12px;display:block;margin-bottom:10px')).join('')}<div class="panel" style="margin-top:16px"><div class="list">${skRows(4)}</div></div>`;break;
    case 'planning':body=`${sk('100%',92,'border-radius:12px;display:block;margin-bottom:16px')}<div class="plan-grid">${skPanel('',`<div class="list">${skRows(5)}</div>`)}${skPanel('',Array.from({length:5},()=>`<div style="margin:12px 0">${sk('100%',12)}</div>`).join(''))}</div>`;break;
    case 'project':body=`<div class="panel" style="padding:20px;margin-bottom:16px">${sk('40%',26)}<div style="margin:12px 0">${sk('70%',12)}</div>${sk('100%',8)}</div>${sk('380px',36,'border-radius:10px;display:block;margin-bottom:16px')}${skKpis()}`;break;
    case 'team':body=`<div class="panel"><div class="list">${skRows(4)}</div></div>`;break;
    case 'analytics':body=`${skKpis()}<div class="grid-dash">${skPanel('c7',Array.from({length:4},()=>`<div style="margin:12px 0">${sk('100%',10)}</div>`).join(''))}${skPanel('c5',Array.from({length:4},()=>`<div style="margin:12px 0">${sk('100%',10)}</div>`).join(''))}</div>`;break;
    default:body=`${skKpis()}${sk('100%',70,'border-radius:12px;display:block;margin-bottom:16px')}<div class="grid-dash">${skPanel('c5',`<div class="list">${skRows(3,false)}</div>`)}${skPanel('c7',`<div class="list">${skRows(4)}</div>`)}</div>`;
  }
  return`<div aria-busy="true" aria-label="${t('Yükleniyor')}">${head}${body}</div>`;
}

/* kind: load | notfound | forbidden | missing-task | missing-project */
function errorState(kind){
  const back=`<button class="btn" data-a="back">${svg('left')}${t('Geri')}</button>`;
  const home=`<a class="btn primary" href="#/app">${t('Genel bakışa dön')}</a>`;
  const E={
    load:{ic:'alert',h:t('Veriler yüklenemedi'),
      p:UI.bootError==='corrupt'?t('Bu cihazda kayıtlı veriler okunamadı; dosya bozulmuş olabilir. Veriler silinmedi, bir kopyası saklandı.'):t('Kayıtlı verilere şu an ulaşılamıyor. Tarayıcı depolaması kapalı olabilir ya da geçici bir sorun yaşanıyor.'),
      a:`<button class="btn primary" data-a="retryLoad">${svg('refresh')}${t('Tekrar dene')}</button>${storage.corruptCopy()?`<button class="btn" data-a="downloadCorrupt">${t('Bozuk veriyi indir')}</button>`:''}<button class="btn danger" data-a="resetData">${t('Boş bir çalışma alanıyla başla')}</button>`},
    notfound:{ic:'search',h:t('Sayfa bulunamadı'),p:t('Aradığın sayfa taşınmış ya da hiç var olmamış olabilir. Adresi kontrol et veya genel bakışa dön.'),a:home+back},
    forbidden:{ic:'lock',h:t('Bu alana erişimin yok'),p:t('Yönetim paneli yalnızca ekip sahiplerine ve yöneticilere açık olacak. Ekip özellikleri sonraki sürümde geliyor.'),a:home+back},
    'missing-task':{ic:'tasks',h:t('Görev bulunamadı'),p:t('Bu görev silinmiş ya da başka bir cihazda oluşturulmuş olabilir.'),a:`<a class="btn primary" href="#/app/tasks">${t('Görevlere dön')}</a>`+back},
    'missing-project':{ic:'folder',h:t('Proje bulunamadı'),p:t('Bu proje silinmiş olabilir. Görevleri “Projesiz” olarak korunur.'),a:`<a class="btn primary" href="#/app/projects">${t('Projelere dön')}</a>`+back}
  }[kind]||{ic:'alert',h:t('Bu sayfa gösterilemedi'),p:t('Beklenmeyen bir sorun oluştu. Verilerin korunuyor; sayfayı yeniden deneyebilir ya da genel bakışa dönebilirsin.'),a:`<button class="btn primary" data-a="rerender">${svg('refresh')}${t('Tekrar dene')}</button>`+home};
  return`<div class="state" role="alert"><span class="state-ic">${svg(E.ic)}</span><h1>${E.h}</h1><p>${E.p}</p><div class="row" style="justify-content:center">${E.a}</div>${kind==='load'?`<p class="state-code">${t('Hata kodu')}: ${esc(UI.bootError||'unknown')}</p>`:''}</div>`;
}
V.notfound=()=>errorState('notfound');
V.forbidden=()=>errorState('forbidden');

/* Connection banner: the prototype works offline, but the user should know. */
function netBar(){const b=$('#netbar');if(!b)return;const off=navigator.onLine===false;b.hidden=!off;if(off)b.innerHTML=`${svg('alert','i s')} ${t('Bağlantı yok. Değişikliklerin bu cihazda saklanıyor; bağlantı gelince çalışmaya devam edebilirsin.')}`}
