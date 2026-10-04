/* ================= FX — micro-interactions (v0.7) =================
   Purely presentational: nothing here changes data. Everything is skipped when the
   user prefers reduced motion, and every listener is a single delegated one. */

/* Button ripple — a soft circle from the press point, clipped by an inner layer so
   badges on the button (e.g. the bell dot) are never cut off. */
document.addEventListener('pointerdown',e=>{
  if(e.button!==0||RM())return;
  const b=e.target.closest('.btn,.nav-item,.mob-nav a,.chip-btn');if(!b||b.disabled||b.classList.contains('is-loading'))return;
  const r=b.getBoundingClientRect(),d=Math.max(r.width,r.height)*2.2;
  let layer=b.querySelector(':scope>.rpl');if(!layer){layer=document.createElement('span');layer.className='rpl';layer.setAttribute('aria-hidden','true');b.appendChild(layer)}
  const dot=document.createElement('i');dot.style.cssText=`width:${d}px;height:${d}px;left:${e.clientX-r.left-d/2}px;top:${e.clientY-r.top-d/2}px`;
  layer.appendChild(dot);dot.addEventListener('animationend',()=>dot.remove(),{once:true});
},{passive:true});

/* Spotlight — cards and tiles get a faint accent glow that follows the pointer. One rAF per frame. */
const SPOT_SEL='.panel,.card,.kpi,.tile,.feat>div,.hero-visual,.scen-card,.trust-grid>div';
let spotEl=null,spotEv=null,spotRaf=0;
document.addEventListener('pointermove',e=>{
  if(e.pointerType!=='mouse'||RM())return;spotEv=e;if(spotRaf)return;
  spotRaf=requestAnimationFrame(()=>{spotRaf=0;const ev=spotEv;const el=ev.target.closest&&ev.target.closest(SPOT_SEL);
    if(spotEl&&spotEl!==el){spotEl.style.removeProperty('--mx');spotEl.style.removeProperty('--my')}
    spotEl=el;if(!el)return;const r=el.getBoundingClientRect();el.style.setProperty('--mx',(ev.clientX-r.left)+'px');el.style.setProperty('--my',(ev.clientY-r.top)+'px');
    if(el.classList.contains('hero-visual')){const x=(ev.clientX-r.left)/r.width-.5,y=(ev.clientY-r.top)/r.height-.5;el.style.setProperty('--rx',(-y*5).toFixed(2)+'deg');el.style.setProperty('--ry',(x*6).toFixed(2)+'deg')}});
},{passive:true});
document.addEventListener('pointerleave',()=>{if(spotEl){spotEl.style.removeProperty('--mx');spotEl.style.removeProperty('--my');spotEl.style.removeProperty('--rx');spotEl.style.removeProperty('--ry')}spotEl=null},true);

/* Success morph: a button briefly turns into a check (used after saves that keep the form open). */
function btnDone(b,ms=1300){if(!b)return;b.classList.remove('is-done');void b.offsetWidth;b.classList.add('is-done');clearTimeout(b._done);b._done=setTimeout(()=>b.classList.remove('is-done'),ms)}

/* Confetti — small, short (≈1 s), canvas based, cleaned up after itself. */
function confetti(x=innerWidth/2,y=innerHeight/3,n=46){
  if(RM())return;
  const c=document.createElement('canvas'),ctx=c.getContext('2d');if(!ctx)return;
  const dpr=Math.min(2,devicePixelRatio||1);c.className='confetti';c.width=innerWidth*dpr;c.height=innerHeight*dpr;c.setAttribute('aria-hidden','true');document.body.appendChild(c);ctx.scale(dpr,dpr);
  const cs=getComputedStyle(document.documentElement),cols=[cs.getPropertyValue('--accent').trim()||'#5b5bd6',cs.getPropertyValue('--ok').trim()||'#1f7a45','#f5b83d','#ef6f8a','#38bdf8'];
  const ps=[...Array(n)].map((_,i)=>{const a=-Math.PI/2+(Math.random()-.5)*Math.PI*.9,v=5+Math.random()*6;return{x,y,vx:Math.cos(a)*v,vy:Math.sin(a)*v,r:Math.random()*Math.PI,vr:(Math.random()-.5)*.4,w:5+Math.random()*4,h:3+Math.random()*4,c:cols[i%cols.length],round:Math.random()<.3}});
  const t0=performance.now(),D=1100;
  (function frame(now){const k=(now-t0)/D;ctx.clearRect(0,0,innerWidth,innerHeight);
    for(const p of ps){p.vy+=.28;p.vx*=.985;p.x+=p.vx;p.y+=p.vy;p.r+=p.vr;ctx.globalAlpha=Math.max(0,1-k*k);ctx.fillStyle=p.c;ctx.save();ctx.translate(p.x,p.y);ctx.rotate(p.r);if(p.round){ctx.beginPath();ctx.arc(0,0,p.w/2.4,0,7);ctx.fill()}else ctx.fillRect(-p.w/2,-p.h/2,p.w,p.h);ctx.restore()}
    if(k<1)requestAnimationFrame(frame);else c.remove()})(t0);
}
/* Celebrate a completed task from the element that was clicked (falls back to screen centre). */
function celebrate(el){const r=el&&el.getBoundingClientRect?el.getBoundingClientRect():null;confetti(r?r.left+r.width/2:innerWidth/2,r?r.top+r.height/2:innerHeight/3,r?30:60)}

/* Progress ring markup: value 0..1, animated from 0 on page enter (CSS). */
const ring=(v,label,cls='')=>{const R=26,C=2*Math.PI*R,p=Math.max(0,Math.min(1,v||0));return`<svg class="ring ${cls}" viewBox="0 0 64 64" role="img" aria-label="${esc(label)}"><circle class="ring-bg" cx="32" cy="32" r="${R}"/><circle class="ring-fg" cx="32" cy="32" r="${R}" stroke-dasharray="${C.toFixed(1)}" style="--off:${(C*(1-p)).toFixed(1)};--full:${C.toFixed(1)}"/></svg>`};

