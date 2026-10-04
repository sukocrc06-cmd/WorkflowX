/* ================= TASK OPERATIONS =================
   The only functions that change a task's lifecycle. They are called inside
   commit(), so each one is undoable and leaves an activity entry. */
function newTask(f={}){
  return{id:uid(),title:'',desc:'',status:'todo',priority:'medium',due:'',start:'',estimate:0,projectId:null,assignee:null,
    tags:[],deps:[],logs:[],comments:[],subtasks:[],recur:null,createdAt:toLocal(new Date()),completedAt:null,updatedAt:null,demo:false,...f};
}
/* Complete: stops its timer, frees FUTURE focus blocks (past ones are history), and
   creates the next occurrence of a recurring task. */
function opComplete(x){
  if(x.status==='done')return{freed:[],next:null};
  if(S.timer&&S.timer.taskId===x.id)timerStop(true);
  x.status='done';x.completedAt=toLocal(new Date());
  const now=new Date(),freed=S.blocks.filter(b=>b.taskId===x.id&&new Date(b.start)>now);
  S.blocks=S.blocks.filter(b=>!freed.includes(b));
  logAct('task',x.id,'completed',{label:x.title});
  const next=spawnNext(x);
  return{freed,next};
}
function opReopen(x){if(x.status!=='done')return;x.status='todo';x.completedAt=null;logAct('task',x.id,'reopened',{label:x.title})}
function opSetStatus(x,s){
  if(!ENUM.status.includes(s)||s===x.status)return null;
  if(s==='done')return opComplete(x);
  const was=x.status;
  if(was==='done'){x.completedAt=null}
  x.status=s;logAct('task',x.id,'status',{label:x.title,changes:[['status',ST(was),ST(s)]]});
  return null;
}
function opRemoveTask(x){
  if(S.timer&&S.timer.taskId===x.id)S.timer=null;
  S.tasks=S.tasks.filter(y=>y!==x);S.blocks=S.blocks.filter(b=>b.taskId!==x.id);
  S.tasks.forEach(y=>{if(y.deps.includes(x.id))y.deps=y.deps.filter(i=>i!==x.id)});
  if(UI.draft){UI.draft.blocks=UI.draft.blocks.filter(b=>b.taskId!==x.id);UI.draft.unplaced=UI.draft.unplaced.filter(u=>u.taskId!==x.id)}
}
/* "What should I do today?" — ordered: running timer, overdue, due today, blocks
   scheduled today, then urgent/high priority. Only my work. */
function todayFocus(limit=5){
  const now=new Date(),end=dayEnd(now),todayBl=new Set(S.blocks.filter(b=>overlap(+new Date(b.start),+new Date(b.end),+sod(now),end)>0).map(b=>b.taskId));
  const score=x=>(S.timer&&S.timer.taskId===x.id?1000:0)+(isLate(x)?500:0)+(x.due&&+new Date(x.due)<end?300:0)+(todayBl.has(x.id)?200:0)+PRIO_W[x.priority]*20+(x.status==='progress'?15:0);
  return myOpen().filter(x=>x.status!=='blocked').map(x=>({x,s:score(x)})).filter(o=>o.s>=60).sort((a,b)=>b.s-a.s||((a.x.due?+new Date(a.x.due):Infinity)-(b.x.due?+new Date(b.x.due):Infinity))).slice(0,limit).map(o=>o.x);
}
const why4today=x=>{const end=dayEnd(new Date());if(S.timer&&S.timer.taskId===x.id)return t('Şu an çalışıyorsun');if(isLate(x))return t('Gecikti');if(x.due&&+new Date(x.due)<end)return t('Bugün teslim');if(S.blocks.some(b=>b.taskId===x.id&&dayKey(b.start)===dayKey(new Date())))return t('Bugün için planlı');return PR(x.priority)+' '+t('öncelik')};
