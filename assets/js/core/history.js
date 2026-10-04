/* ================= HISTORY (undo / redo) =================
   Every user change goes through commit(label, fn): the state is snapshotted
   before fn runs, so undo restores exactly what was there — no hand-written
   inverse operations that can drift out of sync. Redo replays the forward state.
   Snapshots are small (tens of KB) and capped. In the backend phase the same
   entries become the source for optimistic updates + server reconciliation. */
const HISTORY={past:[],future:[],max:40,seq:0};
function commit(label,fn){
  const before=JSON.stringify(S),id=++HISTORY.seq;
  const r=fn();
  if(r===false)return false;                           // fn may abort (validation) → nothing recorded
  if(JSON.stringify(S)===before)return r;
  HISTORY.past.push({id,label,before});if(HISTORY.past.length>HISTORY.max)HISTORY.past.shift();
  HISTORY.future=[];save();
  return id;
}
function resetHistory(){HISTORY.past=[];HISTORY.future=[]}
const canUndo=()=>HISTORY.past.length>0,canRedo=()=>HISTORY.future.length>0;
function restoreSnapshot(json){
  setState(JSON.parse(json));
  if(UI.draft)UI.draft=validatePlan(UI.draft);        // drop draft blocks whose task disappeared
  save();render();
}
function undo(){
  const h=HISTORY.past.pop();if(!h){toast(t('Geri alınacak işlem yok'));return null}
  HISTORY.future.push({id:h.id,label:h.label,before:JSON.stringify(S)});
  restoreSnapshot(h.before);
  toast(t('Geri alındı: {x}',{x:h.label}),{label:t('Yinele'),fn:redo});
  return h;
}
function redo(){
  const h=HISTORY.future.pop();if(!h){toast(t('Yinelenecek işlem yok'));return null}
  HISTORY.past.push({id:h.id,label:h.label,before:JSON.stringify(S)});
  restoreSnapshot(h.before);
  toast(t('Yinelendi: {x}',{x:h.label}));
  return h;
}
/* Toast with an undo button bound to one history entry. If newer changes were made
   since, undoing would roll those back too — so the button then explains instead. */
function undoToast(msg,id){
  toast(msg,id?{label:t('Geri al'),fn:()=>{const top=HISTORY.past[HISTORY.past.length-1];if(top&&top.id===id)undo();else toast(t('Bu işlemden sonra başka değişiklikler yapıldı. Ctrl+Z ile adım adım geri alabilirsin.'))}}:null);
}
