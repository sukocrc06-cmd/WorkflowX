/* ================= TIMER =================
   S.timer = { taskId, start: ISO | null, acc: ms worked this session (shown), logged: ms written to the log, paused }
   - start   → a running segment begins
   - pause   → the running segment is written to the task's time log, the timer stays on the task
   - resume  → a new segment begins
   - stop    → the last segment is logged and the timer is cleared
   Segments shorter than 30 s are not logged (accidental clicks). */
const MIN_SEG=30e3;
const timerRunMs=()=>S.timer&&S.timer.start?Date.now()-new Date(S.timer.start):0;
const timerTotalMs=()=>S.timer?(S.timer.acc||0)+timerRunMs():0;
/* Closes the running segment: always counted in the session total, logged only if ≥ 30 s. */
function logSegment(tk){
  if(!S.timer||!S.timer.start)return;
  const st=new Date(S.timer.start),en=new Date(),ms=en-st;
  S.timer.acc=(S.timer.acc||0)+ms;
  if(tk&&ms>=MIN_SEG){tk.logs.push({start:st.toISOString(),end:en.toISOString()});S.timer.logged=(S.timer.logged||0)+ms;logAct('task',tk.id,'time',{label:tk.title,note:dur(ms/HOUR)})}
}
function timerStart(x){if(S.timer&&S.timer.taskId!==x.id)timerStop(true);if(S.timer&&S.timer.taskId===x.id){if(S.timer.paused)timerResume();return}S.timer={taskId:x.id,start:new Date().toISOString(),acc:0,logged:0,paused:false};if(x.status==='todo'||x.status==='inbox')x.status='progress'}
function timerPause(){if(!S.timer||S.timer.paused)return;logSegment(taskOf(S.timer.taskId));S.timer.start=null;S.timer.paused=true}
function timerResume(){if(!S.timer||!S.timer.paused)return;S.timer.start=new Date().toISOString();S.timer.paused=false}
function timerStop(silent){
  if(!S.timer)return;const tk=taskOf(S.timer.taskId);
  logSegment(tk);const total=S.timer.logged||0;
  S.timer=null;save();
  if(!silent&&tk)toast(total?t('{x}: {h} kaydedildi',{x:tk.title,h:dur(total/HOUR)}):t('30 saniyeden kısa süreler kaydedilmez'));
}
function updateTimer(){
  const el=$('#timer');const tk=S.timer&&taskOf(S.timer.taskId);
  if(!tk){el.hidden=true;el.innerHTML='';return}
  const p=!!S.timer.paused,tm=clock(timerTotalMs());
  el.hidden=false;el.classList.toggle('paused',p);
  const cur=el.querySelector('.tm');
  if(cur&&el.dataset.tid===tk.id&&el.dataset.p===String(p)){cur.textContent=tm;return}   // tick: update the clock only
  el.dataset.tid=tk.id;el.dataset.p=String(p);
  el.innerHTML=`<a class="tlink" href="${hrefFor('task',tk.id)}" title="${esc(tk.title)}"><span class="rd" aria-hidden="true"></span><span class="tt">${esc(tk.title)}</span><span class="tm" role="timer" aria-label="${t('Geçen süre')}">${tm}</span></a>
    <button type="button" class="tbtn" data-a="${p?'timerResume':'timerPause'}" aria-label="${p?t('Sürdür'):t('Duraklat')}: ${esc(tk.title)}" title="${p?t('Sürdür'):t('Duraklat')}">${svg(p?'play':'pause','i s')}</button>
    <button type="button" class="tbtn" data-a="timerStop" aria-label="${t('Durdur ve kaydet')}: ${esc(tk.title)}" title="${t('Durdur ve kaydet')}">${svg('stop','i s')}</button>`;
}
setInterval(()=>{if(S.timer&&!S.timer.paused&&$('#app').classList.contains('on'))updateTimer()},1000);
