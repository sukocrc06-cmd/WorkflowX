/* ================= RENDER =================
   One render path for the app area. Pages are pure functions of (S, UI) that
   return HTML; every user-supplied value inside them goes through esc(). */
const RM=()=>matchMedia('(prefers-reduced-motion: reduce)').matches;
const cu=(v,k='h')=>`<span data-count="${v}" data-kind="${k}">${k==='h'?hrs(v):k==='pct'?'%'+Math.round(v):Math.round(v)}</span>`;
function countUps(root){root.querySelectorAll('[data-count]').forEach(el=>{const to=+el.dataset.count,k=el.dataset.kind,fin=el.textContent;if(!(to>0))return;const fmt=v=>k==='h'?hrs(v):k==='pct'?'%'+Math.round(v):String(Math.round(v));const t0=performance.now(),D=800;el.textContent=fmt(0);const step=now=>{if(!el.isConnected)return;const p=Math.min(1,(now-t0)/D),e=1-Math.pow(1-p,3);el.textContent=p<1?fmt(to*e):fin;if(p<1)requestAnimationFrame(step)};requestAnimationFrame(step)})}
/* FLIP: elements with data-flip glide from their old position to the new one after a re-render */
/* Skipped for very long lists: measuring hundreds of rows would cost more than the animation is worth. */
function captureFlip(){const m=new Map();if(RM())return m;const els=document.querySelectorAll('#main [data-flip]');if(els.length>150)return m;els.forEach(el=>m.set(el.dataset.flip,el.getBoundingClientRect()));return m}
function playFlip(m){if(!m.size)return;const E='cubic-bezier(.16,1,.3,1)';document.querySelectorAll('#main [data-flip]').forEach(el=>{const o=m.get(el.dataset.flip),n=el.getBoundingClientRect();
  if(!o){if(!el.classList.contains('tab-ind'))el.animate([{opacity:0,transform:'translateY(-6px)'},{opacity:1,transform:'none'}],{duration:320,easing:E});return}
  const dx=o.left-n.left,dy=o.top-n.top,ind=el.classList.contains('tab-ind'),sx=ind&&n.width?o.width/n.width:1;
  if(Math.abs(dx)<1&&Math.abs(dy)<1&&Math.abs(sx-1)<.01)return;
  el.animate([{transformOrigin:'0 0',transform:`translate(${dx}px,${dy}px) scaleX(${sx})`},{transformOrigin:'0 0',transform:'none'}],{duration:ind?360:420,easing:E})})}
function placeTabInds(){document.querySelectorAll('#main .tabs').forEach(tb=>{const ind=tb.querySelector('.tab-ind'),on=tb.querySelector('.on');if(!ind||!on)return;Object.assign(ind.style,{left:on.offsetLeft+'px',top:on.offsetTop+'px',width:on.offsetWidth+'px',height:on.offsetHeight+'px'})})}
function placeNavInd(){const ind=$('#navind'),on=document.querySelector('#sidein .nav-item.on');if(!ind)return;if(!on||!on.offsetHeight){ind.style.opacity=0;return}ind.style.opacity=1;ind.style.height=on.offsetHeight+'px';ind.style.transform=`translateY(${on.offsetTop}px)`;if(!ind.classList.contains('ready')){void ind.offsetWidth;ind.classList.add('ready')}}
function pageHTML(){
  if(UI.boot==='loading'||UI.boot==='idle')return skeleton(UI.view);
  if(UI.boot==='error')return errorState('load');
  const view=V[UI.view]||V.notfound;
  try{return view()}
  catch(e){console.error('[render]',UI.view,e);return errorState('render')}
}
function render(){
  const key=[UI.boot,UI.view,UI.param||'',UI.sub||''].join('|'),entering=UI._last!==key,main=$('#main');
  const snap=entering?null:captureFlip();
  bump();
  main.classList.remove('enter');
  renderShell();
  main.innerHTML=pageHTML();
  placeTabInds();
  if(entering&&UI.boot==='ready'&&!RM()){[...main.children].forEach((c,i)=>c.style.setProperty('--i',i));main.querySelectorAll('.grid-dash,.rm-grid,.proj-grid').forEach(g=>[...g.children].forEach((c,j)=>c.style.setProperty('--j',j)));main.querySelectorAll('.ev.draft').forEach((e,k)=>e.style.setProperty('--k',k));void main.offsetWidth;main.classList.add('enter');countUps(main)}
  else if(snap)playFlip(snap);
  /* One-shot feedback for the item that just changed (completed / created). Plays once, then cleared,
     so periodic re-renders never replay it. */
  if(UI.flash){const f=UI.flash;UI.flash=null;if(!RM())requestAnimationFrame(()=>{document.querySelectorAll(`#main [data-flip="t-${f.id}"], #main [data-flip="c-${f.id}"], #main [data-flip="e-${f.id}"]`).forEach(el=>el.classList.add(f.kind==='done'?'just-done':f.kind==='placed'?'just-placed':'just-new'));if(f.kind==='done'&&UI.view==='task'&&UI.param===f.id)$('#main .detail-title')?.classList.add('just-done')})}
  const routeChanged=UI._lastRoute!==key.slice(key.indexOf('|'));
  UI._last=key;UI._lastRoute=key.slice(key.indexOf('|'));placeNavInd();
  if(routeChanged&&UI.boot==='ready'){window.scrollTo(0,0);if(!dlg.open&&!cmdk.open)main.focus({preventScroll:true});document.title=pageTitle()+' · WorkFlowX'}
  if(typeof calAfterRender==='function')calAfterRender(routeChanged&&UI.boot==='ready');
}
function pageTitle(){const m={today:'Bugün',overview:'Genel Bakış',tasks:'Görevlerim',projects:'Projeler',calendar:'Takvim',planning:'Planlama',analytics:'Analiz',report:'Haftalık rapor',team:'Ekip',settings:'Ayarlar',roadmap:'Yol Haritası',notfound:'Sayfa bulunamadı',forbidden:'Erişim yok'};
  if(UI.view==='task')return taskOf(UI.param)?.title||t('Görev');if(UI.view==='project')return projectOf(UI.param)?.name||t('Proje');return t(m[UI.view]||'WorkFlowX')}
