/* ================= KEYBOARD =================
   One table drives both the handler and the help screens (dialog + Settings). */
const SHORTCUTS=[
  ['Ctrl K','Komut paleti'],['/','Ara'],['N','Yeni görev'],['P','Yeni proje'],['E','Yeni etkinlik'],
  ['T','Bugün'],['C','Takvim'],['Ctrl Z','Geri al'],['Ctrl Shift Z','Yinele'],
  ['G → O · G · P · L · A · S','Genel bakış, görevler, projeler, planlama, analiz, ayarlar'],
  ['[ · ]','Takvimde önceki / sonraki'],['?','Klavye kısayolları'],['Esc','Kapat']
];
const MAC=/Mac|iPhone|iPad/.test(navigator.platform||navigator.userAgent||'');
const keyLabel=k=>MAC?k.replace(/Ctrl/g,'⌘'):k;
const keysTable=()=>`<div class="keys">${SHORTCUTS.map(([k,l])=>`<span>${t(l)}</span><span>${keyLabel(k).split(' ').map(x=>/^[·→]$/.test(x)?`<span style="color:var(--faint)"> ${x} </span>`:`<kbd>${esc(x)}</kbd>`).join('')}</span>`).join('')}</div>`;
let gPending=0;
document.addEventListener('keydown',e=>{
  if(!$('#app').classList.contains('on'))return;
  const k=e.key,mod=e.ctrlKey||e.metaKey;
  if(mod&&k.toLowerCase()==='k'){e.preventDefault();if(cmdk.open)closeCmd();else{if(dlg.open)closeDlg();openCmd()}return}
  if(cmdk.open||dlg.open)return;
  if(k==='Escape'){closePops();if(!$('#more').hidden){$('#more').hidden=true;renderShell()}return}
  const a=document.activeElement,typing=a&&(/INPUT|TEXTAREA|SELECT/.test(a.tagName)||a.isContentEditable);
  if(mod&&!e.altKey&&!typing&&UI.boot==='ready'){
    if(k.toLowerCase()==='z'&&!e.shiftKey){e.preventDefault();undo();return}
    if((k.toLowerCase()==='z'&&e.shiftKey)||k.toLowerCase()==='y'){e.preventDefault();redo();return}
  }
  if(mod||e.altKey||typing||UI.boot!=='ready')return;
  if(gPending&&Date.now()-gPending<900){gPending=0;const m={t:'today',o:'overview',g:'tasks',p:'projects',c:'calendar',l:'planning',a:'analytics',r:'roadmap',s:'settings'}[k.toLowerCase()];if(m){e.preventDefault();go(m)}return}
  switch(k.toLowerCase()){
    case '/':e.preventDefault();openCmd();break;
    case 'g':gPending=Date.now();break;
    case 'n':e.preventDefault();quickAdd('task');break;
    case 'p':e.preventDefault();openProjectForm();break;
    case 'e':e.preventDefault();openEvent();break;
    case 't':e.preventDefault();go('today');break;
    case 'c':e.preventDefault();go('calendar');break;
    case '?':e.preventDefault();showKeys();break;
    case '[':if(UI.view==='calendar'){e.preventDefault();A.calNav({v:'-1'})}break;
    case ']':if(UI.view==='calendar'){e.preventDefault();A.calNav({v:'1'})}break;
  }
});
function showKeys(){
  openDlg(`<form>${dlgHead(t('Klavye kısayolları'))}<div class="dlg-b">${keysTable()}
   <p class="hint" style="margin:16px 0 0">${t('Takvimde bir bloğu veya etkinliği sürükleyerek taşıyabilir, alt kenarından çekerek süresini değiştirebilirsin. Klavyeyle: bloğu aç → “Zamanı değiştir”.')}</p></div>
   <div class="dlg-f"><button class="btn primary">${t('Tamam')}</button></div></form>`,()=>{});
}
