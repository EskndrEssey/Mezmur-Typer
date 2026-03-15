'use strict';

// ═══════════ CONSTANTS ════════════════
const STORAGE_KEY   = 'wazema_hymns';
const ACTIVE_ID_KEY = 'wazema_active_id';
const LANGS      = ['en','ti','ti_ro','am','am_ro','om','ro'];
const LANG_NAMES = {en:'English',ti:'Tigrinya',ti_ro:'Tigrinya (Rom.)',am:'Amharic',am_ro:'Amharic (Rom.)',om:'Oromo',ro:'Romanian'};
const LANG_SHORT = {en:'EN',ti:'TI',ti_ro:'TI-R',am:'AM',am_ro:'AM-R',om:'OM',ro:'RO'};
const STATUS_OPTIONS = {draft:'Draft',review:'Needs Review',final:'Final'};
// const SESSION_KEY = 'wz_session_ok'; (deduped)

const GROUP_TAXONOMY = {

  'Sillase': {
    label: { en:'ሥሳሴ · Holy Trinity', ti:'ሥሳሴ', am:'ሥሳሴ' },
    file: 'Sillase',
    subgroups: []
  },

  'Egziabher': {
    label: { en:'እግዚኣብሔር · God (Egziabher)', ti:'እግዚኣብሔር', am:'እግዚአብሔር' },
    file: 'Egziabher',
    subgroups: [
      { key:'Lidet',      label:{ en:'Lidet / Christmas',      ti:'ልደት',          am:'ልደት'          }},
      { key:'Timket',     label:{ en:'Timket / Epiphany',      ti:'ጥምቀት',         am:'ጥምቀት'         }},
      { key:'Hosanna',    label:{ en:'Hosanna / Palm Sunday',  ti:'ሆሳዕና',         am:'ሆሳዕና'         }},
      { key:'Siglet',     label:{ en:'Siglet / Good Friday',   ti:'ስቅለት',         am:'ስቅለት'         }},
      { key:'Tinsae',     label:{ en:'Tinsae / Easter',        ti:'ትንሣኤ',         am:'ትንሣኤ'         }},
      { key:'Erget',      label:{ en:'Erget / Ascension',      ti:'ዕርጋት',         am:'ዕርጋት'         }},
      { key:'Pentecost',  label:{ en:'Pentecost',              ti:'ጰንጠቆስጤ',       am:'ጰንጠቆስጤ'       }},
      { key:'DebreTabor', label:{ en:'Debre Tabor',            ti:'ደብረ ታቦር',      am:'ደብረ ታቦር'      }},
      { key:'KibreTabot', label:{ en:'Kibre Tabot',            ti:'ክብረ ታቦት',      am:'ክብረ ታቦት'      }},
      { key:'MedhaneAlem',label:{ en:'Medhane Alem',           ti:'መድኃኔ ዓለም',     am:'መድኃኒዓለም'      }},
      { key:'Pagumen',    label:{ en:'Pagumen',                ti:'ጳጉሜን',         am:'ጳጉሜን'         }},
      { key:'Meskel',     label:{ en:'Meskel / True Cross',    ti:'መስቀል',         am:'መስቀል'         }},
      { key:'Mera',       label:{ en:'Mera / Wedding',         ti:'መርዓ',           am:'ሰርግ'          }},
      { key:'General',    label:{ en:'General',                ti:'ጠቅላላ',         am:'ጠቅላላ'         }},
    ]
  },

  'Mariam': {
    label: { en:'ማርያም · St. Mary', ti:'ማርያም', am:'ማርያም' },
    file: 'Mariam',
    subgroups: [
      { key:'Lideta',     label:{ en:'Lideta le-Mariam',       ti:'ልደታ ለማርያም',   am:'ልደታ ለማርያም'   }},
      { key:'KidaneMehret',label:{en:'Kidane Mehret',          ti:'ኪዳነ ምሕረት',    am:'ኪዳነ ምሕረት'    }},
      { key:'Filseta',    label:{ en:'Filseta / Assumption',   ti:'ፍልሰታ',         am:'ፍልሰታ'         }},
      { key:'SdetMariam', label:{ en:'Sdet Mariam',            ti:'ስደት ማርያም',    am:'ስደተ ማርያም'    }},
      { key:'TsomeMariam',label:{ en:'Tsome Mariam',           ti:'ጾመ ማርያም',     am:'ጾመ ማርያም'     }},
      { key:'Mera',       label:{ en:'Mera / Wedding',         ti:'መርዓ',           am:'ሰርግ'          }},
      { key:'General',    label:{ en:'General',                ti:'ጠቅላላ',         am:'ጠቅላላ'         }},
    ]
  },

  'Giorgis': {
    label: { en:'ቅዱስ ጊዮርጊስ · St. George', ti:'ቅ/ ጊዮርጊስ', am:'ቅዱስ ጊዮርጊስ' },
    file: 'Giorgis',
    subgroups: [
      { key:'Monthly',    label:{ en:'Monthly Feast',          ti:'ወርሓዊ በዓል',     am:'ወርሃዊ በዓል'     }},
      { key:'General',    label:{ en:'General',                ti:'ጠቅላላ',         am:'ጠቅላላ'         }},
    ]
  },

  'Michael': {
    label: { en:'ቅዱስ ሚካኤል · St. Michael', ti:'ቅ/ ሚካኤል', am:'ቅዱስ ሚካኤል' },
    file: 'Michael',
    subgroups: [
      { key:'Monthly',    label:{ en:'Monthly Feast',          ti:'ወርሓዊ በዓል',     am:'ወርሃዊ በዓል'     }},
      { key:'General',    label:{ en:'General',                ti:'ጠቅላላ',         am:'ጠቅላላ'         }},
    ]
  },

  'Gabriel': {
    label: { en:'ቅዱስ ገብርኤል · St. Gabriel', ti:'ቅ/ ገብርኤል', am:'ቅዱስ ገብርኤል' },
    file: 'Gabriel',
    subgroups: [
      { key:'Monthly',    label:{ en:'Monthly Feast',          ti:'ወርሓዊ በዓል',     am:'ወርሃዊ በዓል'     }},
      { key:'General',    label:{ en:'General',                ti:'ጠቅላላ',         am:'ጠቅላላ'         }},
    ]
  },

  'KidusnAbbot': {
    label: { en:'ቅዱሳን ኣቦት · Holy Fathers', ti:'ቅዱሳን ኣቦት', am:'ቅዱሳን አበው' },
    file: 'KidusnAbbot',
    subgroups: [
      { key:'TekleHaymanot',label:{en:'Abune Tekle Haymanot', ti:'ኣቡነ ተክለ ሃይማኖት',am:'አቡነ ተክለ ሃይማኖት'}},
      { key:'Yared',      label:{ en:'St. Yared',             ti:'ቅዱስ ያሬድ',      am:'ቅዱስ ያሬድ'      }},
      { key:'General',    label:{ en:'General',                ti:'ጠቅላላ',         am:'ጠቅላላ'         }},
    ]
  },

  'KidusnMelaikt': {
    label: { en:'ቅዱሳን መላእኽት · Angels', ti:'ቅዱሳን መላእኽት', am:'ቅዱሳን መላእክት' },
    file: 'KidusnMelaikt',
    subgroups: [
      { key:'General',    label:{ en:'General',                ti:'ጠቅላላ',         am:'ጠቅላላ'         }},
    ]
  },

  'Nissha': {
    label: { en:'ንስሓ · Repentance', ti:'ንስሓ', am:'ንስሐ' },
    file: 'Nissha',
    subgroups: []
  },

  'Zewetr': {
    label: { en:'ዘወትር · Everyday', ti:'ዘወትር', am:'ዘወትር' },
    file: 'Zewetr',
    subgroups: []
  },

  'Mera': {
    label: { en:'መርዓ · Wedding', ti:'መርዓ', am:'ሰርግ' },
    file: 'Mera',
    subgroups: [
      { key:'Ceremony',   label:{ en:'Ceremony',               ti:'ስነ-ስርዓት',      am:'ሥርዓት'         }},
      { key:'Blessing',   label:{ en:'Blessing',               ti:'ቅድስና',         am:'ቡራኬ'          }},
      { key:'General',    label:{ en:'General',                ti:'ጠቅላላ',         am:'ጠቅላላ'         }},
    ]
  },

  'Yohannes': {
    label: { en:'ቅዱስ ዮሓንስ · St. John', ti:'ቅ. ዮሓንስ', am:'ቅዱስ ዮሐንስ' },
    file: 'Yohannes',
    subgroups: [
      { key:'General',    label:{ en:'General',                ti:'ጠቅላላ',         am:'ጠቅላላ'         }},
    ]
  },

};

const ALL_GROUP_KEYS = Object.keys(GROUP_TAXONOMY);

// ═══════════ STATE ════════════════════
let hymns=[], activeHymn=null, saveTimer=null;

// ═══════════ DATA MODEL ════════════════
function createLine(prefix='',text=''){ return {prefix,text}; }
function createVerse(){ return {lines:[createLine()]}; }
function createLangData(){ return {groupName:'',title:'',subtitle:'',chorus:'',verses:[],youtube:''}; }
function createHymn(o={}){
  const id=o.id||generateId();
  const langs={};
  LANGS.forEach(l=>{langs[l]=createLangData();});
  return {id,groupKey:'',subgroup:'',zemari:'',color:'',status:'draft',langs,...o};
}
function generateId(){ return 'hymn_'+Date.now().toString(36)+Math.random().toString(36).slice(2,6); }

// ═══════════ STORAGE ═══════════════════
function loadFromStorage(){
  try{
    const r=localStorage.getItem(STORAGE_KEY);
    hymns=r?JSON.parse(r):[];
    hymns.forEach(migrateHymn);
  }catch(e){hymns=[];}
}
function migrateHymn(h){
  LANGS.forEach(l=>{
    if(!h.langs[l])h.langs[l]=createLangData();
    const ld=h.langs[l];
    if(!ld.verses)ld.verses=[];
    if(ld.blocks){ld.blocks.forEach(b=>{if(b.type==='verse')ld.verses.push({lines:b.text.split('\n').map(t=>createLine('',t))});else if(b.type==='highlight')ld.verses.push({lines:[createLine(b.text,'')]});});delete ld.blocks;}
    if(!ld.youtube)ld.youtube='';
    if(!ld.groupName)ld.groupName='';
    if(!h.zemari)h.zemari=h.singer||h.composer||h.author||'';
  });
  if(!h.groupKey&&h.group)h.groupKey=h.group;
}
function saveToStorage(){ localStorage.setItem(STORAGE_KEY,JSON.stringify(hymns)); if(activeHymn)localStorage.setItem(ACTIVE_ID_KEY,activeHymn.id); }
function scheduleSave(){ clearTimeout(saveTimer); saveTimer=setTimeout(saveToStorage,400); }

// ═══════════ EXPORT/IMPORT ════════════
function buildLyricsString(ld){
  const chorus=(ld.chorus||'').trim();
  const verses=(ld.verses||[]).filter(v=>v.lines&&v.lines.some(l=>(l.prefix||l.text||'').trim()));
  if (!chorus&&verses.length===0) return '';
  const chorusTag=chorus?`[[chorus]]\n${chorus}\n[[/chorus]]`:null;
  if (verses.length===0) return chorusTag||'';
  const parts=[];
  if (chorusTag) parts.push(chorusTag);
  verses.forEach(verse=>{
    const lineStrings=verse.lines
      .map(line=>{
        const prefix=(line.prefix||'').trimEnd();
        const text=(line.text||'');
        if (prefix) return `[[highlight]]${prefix} [[/highlight]]${text}`;
        return text;
      })
      .filter(s=>s.trim());
    if (lineStrings.length){
      parts.push(lineStrings.join('\n'));
      if (chorusTag) parts.push(chorusTag);
    }
  });
  return parts.join('\n \n');
}

function hymnToExport(hymn){
  const out={id:hymn.id};

  // group as multilingual map
  const groupMap={};
  LANGS.forEach(l=>{ groupMap[l]=(hymn.langs[l]?.groupName||'').trim(); });
  out.group=groupMap;

  // title
  const titleMap={};
  LANGS.forEach(l=>{ const t=(hymn.langs[l]?.title||'').trim(); if(t)titleMap[l]=t; });
  out.title=titleMap;

  // lyrics
  const lyricsMap={};
  LANGS.forEach(l=>{ const ly=buildLyricsString(hymn.langs[l]); if(ly)lyricsMap[l]=ly; });
  out.lyrics=lyricsMap;

  // subtitle (optional map)
  const subMap={};
  LANGS.forEach(l=>{ const s=(hymn.langs[l]?.subtitle||'').trim(); if(s)subMap[l]=s; });
  if (Object.keys(subMap).length) out.subtitle=subMap;

  // youtubeUrls as per-language map (optional)
  const urlMap={};
  LANGS.forEach(l=>{ const u=(hymn.langs[l]?.youtube||'').trim(); if(u)urlMap[l]=u; });
  if (Object.keys(urlMap).length) out.youtubeUrls=urlMap;

  // scalar fields
  if (hymn.zemari&&hymn.zemari.trim()) out.singer=hymn.zemari.trim();
  if (hymn.color&&hymn.color.trim()) out.color=hymn.color.trim();
  if (hymn.subgroup&&hymn.subgroup.trim()) out.subcategory=hymn.subgroup.trim();
  if (hymn.groupKey&&hymn.groupKey.trim()) out.category=hymn.groupKey.trim();
  // If subcategory is Mera, also route file to Mera.json
  // (handled in ghFilePath via submitHymnToGitHub)

  return out;
}

function downloadJSON(data, filename){
  const blob=new Blob([JSON.stringify(data,null,2)],{type:'application/json'});
  const url=URL.createObjectURL(blob);
  const a=document.createElement('a'); a.href=url; a.download=filename; a.click();
  URL.revokeObjectURL(url);
}

function exportAllHymns(){
  const data=hymns.map(hymnToExport);
  downloadJSON(data,'hymns.json');
  showToast(`Exported ${data.length} hymn${data.length!==1?'s':''} \u2713`,'success');
  closeSheet('sheet-export');
}

function exportByGroup(groupKey){
  const group=hymns.filter(h=>h.groupKey===groupKey);
  if (!group.length){showToast(`No hymns in group "${groupKey}"`,'error');closeExportMenu();return;}
  const data=group.map(hymnToExport);
  const filename=groupKey.replace(/[^a-zA-Z0-9_-]/g,'_')+'.json';
  downloadJSON(data,filename);
  showToast(`Exported ${data.length} hymn${data.length!==1?'s':''} from ${groupKey} \u2713`,'success');
  closeSheet('sheet-export');
}

function exportUngrouped(){
  const group=hymns.filter(h=>!h.groupKey);
  if (!group.length){showToast('No ungrouped hymns','error');closeExportMenu();return;}
  const data=group.map(hymnToExport);
  downloadJSON(data,'ungrouped.json');
  showToast(`Exported ${data.length} ungrouped hymn${data.length!==1?'s':''} \u2713`,'success');
  closeSheet('sheet-export');
}

function closeExportMenu(){ closeSheet('sheet-export'); }

function buildExportGroupList(){
  const container=document.getElementById('export-group-list');
  if (!container) return;
  container.innerHTML='';
  // Which groups actually have hymns?
  const usedGroups=ALL_GROUP_KEYS.filter(k=>hymns.some(h=>h.groupKey===k));
  const ungrouped=hymns.filter(h=>!h.groupKey).length;
  if (!usedGroups.length && !ungrouped){
    container.innerHTML='<div class="export-menu-empty">No hymns yet</div>';
    return;
  }
  usedGroups.forEach(k=>{
    const count=hymns.filter(h=>h.groupKey===k).length;
    const btn=document.createElement('button');
    btn.className='export-menu-item';
    btn.innerHTML=`<span>${escHtml(GROUP_TAXONOMY[k].label)}</span><span class="export-count">${count}</span>`;
    btn.addEventListener('click',()=>exportByGroup(k));
    container.appendChild(btn);
  });
  if (ungrouped){
    const btn=document.createElement('button');
    btn.className='export-menu-item';
    btn.innerHTML=`<span>Ungrouped</span><span class="export-count">${ungrouped}</span>`;
    btn.addEventListener('click',()=>exportUngrouped());
    container.appendChild(btn);
  }
}

// ═══════════════════════════════════════
//  IMPORT
// ═══════════════════════════════════════

function importFromJSON(jsonStr){
  let data; try{data=JSON.parse(jsonStr);}catch(e){showToast('Invalid JSON file.','error');return;}
  if (!Array.isArray(data)) data=[data];
  importQueue=data; importStats={added:0,skipped:0,replaced:0}; importCurrent=0; importApplyAll=null;
  doNextImport();
}
let importQueue=[],importStats={},importCurrent=0,importApplyAll=null;

function doNextImport(){
  if (importCurrent>=importQueue.length){
    renderHymnList(); saveToStorage();
    showToast(`Import done: ${importStats.added} added, ${importStats.replaced} replaced, ${importStats.skipped} skipped.`,'success');
    return;
  }
  const raw=importQueue[importCurrent];
  const hymn=importedToInternal(raw);
  const exist=hymns.find(h=>h.id===hymn.id);
  if (!exist){hymns.push(hymn);importStats.added++;importCurrent++;doNextImport();return;}
  if (importApplyAll==='keep'){importStats.skipped++;importCurrent++;doNextImport();return;}
  if (importApplyAll==='replace'){hymns[hymns.findIndex(h=>h.id===hymn.id)]=hymn;importStats.replaced++;importCurrent++;doNextImport();return;}
  showConflictModal(
    `"${getHymnDisplayTitle(exist)}" (ID: ${hymn.id}) already exists.`,
    ()=>{importStats.skipped++;importCurrent++;doNextImport();},
    ()=>{hymns[hymns.findIndex(h=>h.id===hymn.id)]=hymn;importStats.replaced++;importCurrent++;doNextImport();},
    ()=>{hymn.id=generateId();hymns.push(hymn);importStats.added++;importCurrent++;doNextImport();}
  );
}

function importedToInternal(raw){
  const hymn=createHymn({id:raw.id||generateId()});
  hymn.color    =raw.color    ||'';
  hymn.subgroup =raw.subgroup ||'';
  hymn.composer =raw.composer ||'';
  hymn.singer   =raw.singer   ||'';
  hymn.author   =raw.author   ||'';

  LANGS.forEach(l=>{
    const ld=hymn.langs[l];
    // group name (from multilingual map)
    ld.groupName = (raw.group && typeof raw.group==='object') ? (raw.group[l]||'') : (typeof raw.group==='string'?raw.group:'');
    ld.title     = (raw.title    && raw.title[l]   )||'';
    ld.subtitle  = (raw.subtitle && raw.subtitle[l])||'';
    // YouTube per-lang
    if (raw.youtubeUrls && typeof raw.youtubeUrls==='object' && !Array.isArray(raw.youtubeUrls)){
      ld.youtube = raw.youtubeUrls[l]||'';
    } else if (Array.isArray(raw.youtubeUrls) && raw.youtubeUrls.length){
      ld.youtube = raw.youtubeUrls[0]||''; // legacy flat array: put in English
    }
    const lyrics=(raw.lyrics&&raw.lyrics[l])||'';
    if (lyrics){ const p=parseLyricsToVerses(lyrics); ld.chorus=p.chorus; ld.verses=p.verses; }
  });

  // Store groupKey from first non-empty group name
  hymn.groupKey = '';
  return hymn;
}

function parseLyricsToVerses(lyrics){
  const result={chorus:'',verses:[]};
  if (!lyrics) return result;
  const cm=lyrics.match(/\[\[chorus\]\]([\s\S]*?)\[\[\/chorus\]\]/);
  if (cm) result.chorus=cm[1].trim();
  let rem=lyrics.replace(/\[\[chorus\]\][\s\S]*?\[\[\/chorus\]\]/g,'').trim();
  // Split into verse-chunks by blank-ish lines
  const chunks=rem.split(/\n[ \t]*\n/).map(c=>c.trim()).filter(Boolean);
  chunks.forEach(chunk=>{
    const lines=chunk.split('\n').map(rawLine=>{
      rawLine=rawLine.trim();
      // Inline highlight: [[highlight]]prefix[[/highlight]]rest
      const m=rawLine.match(/^\[\[highlight\]\]([\s\S]*?)\[\[\/highlight\]\]([\s\S]*)$/);
      if (m) return createLine(m[1].trimEnd(), m[2]);
      return createLine('', rawLine);
    }).filter(l=>(l.prefix||l.text||'').trim());
    if (lines.length) result.verses.push({lines});
  });
  return result;
}


// ═══════════ HELPERS ═══════════════════
function getHymnDisplayTitle(h){ for(const l of LANGS){const t=h.langs[l]?.title?.trim();if(t)return t;} return '(Untitled)'; }
function getSubgroupsForGroup(k){ return GROUP_TAXONOMY[k]?.subgroups||[]; }
function getSubgroupKey(sub){ return typeof sub==='string'?sub:sub.key||sub; }
function getSubgroupLabel(sub,lang='en'){ if(typeof sub==='string')return sub; return sub.label?.[lang]||sub.label?.en||sub.key||sub; }
function getGroupLabel(k,lang='en'){ const g=GROUP_TAXONOMY[k]; if(!g)return k; return typeof g.label==='string'?g.label:(g.label?.[lang]||g.label?.en||k); }
function escHtml(s){ if(!s)return ''; return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;'); }
function nl2br(s){ return s.replace(/\n/g,'<br>'); }

// ═══════════ SHEETS ════════════════════
function openSheet(id){ const el=document.getElementById(id); if(el)el.style.display='flex'; }
function closeSheet(id){ const el=document.getElementById(id); if(el)el.style.display='none'; }
function closeAllSheets(){ document.querySelectorAll('.sheet-overlay').forEach(s=>s.style.display='none'); }

// ═══════════ PAGES ═════════════════════
function showPage(id){
  document.querySelectorAll('.page').forEach(p=>p.style.display='none');
  const p=document.getElementById(id);
  if(p){ p.style.display='flex'; p.classList.add('fade-up'); setTimeout(()=>p.classList.remove('fade-up'),300); }
}

// ═══════════ PASSWORD GATE ═════════════
// DEFAULT PASSWORD — hardcoded so volunteers always see the gate
// Admin can override by setting a different password in the Admin panel
const DEFAULT_VOL_PASSWORD = 'Mezmur2025';

function getVolPassword(){
  // Use admin-set password if available, else fall back to default
  return localStorage.getItem(GH_KEYS.volpass) || DEFAULT_VOL_PASSWORD;
}

function getVolPassword(){
  // Use admin-set password if available, else fall back to default
  return localStorage.getItem(GH_KEYS.volpass) || DEFAULT_VOL_PASSWORD;
}

function isSessionActive(){ return sessionStorage.getItem(SESSION_KEY)==='1'; }

function checkAndShowGate(){
  if(isSessionActive()){ showPage('page-list'); renderHymnList(); return; }
  showPage('page-gate');
  setTimeout(()=>document.getElementById('gate-password')?.focus(),200);
}
function submitGate(){
  const entered=document.getElementById('gate-password').value;
  const correct=getVolPassword();
  const errEl=document.getElementById('gate-error');
  if(entered===correct){
    sessionStorage.setItem(SESSION_KEY,'1');
    document.getElementById('gate-password').value='';
    errEl.style.display='none';
    showPage('page-list');
    renderHymnList();
  } else {
    errEl.style.display='block';
    document.getElementById('gate-password').value='';
    document.getElementById('gate-password').focus();
    document.getElementById('gate-password').classList.remove('shake');
    void document.getElementById('gate-password').offsetWidth;
    document.getElementById('gate-password').classList.add('shake');
  }
}

// ═══════════ HYMN LIST ═════════════════
function renderHymnList(){
  const list=document.getElementById('hymn-list');
  const stats=document.getElementById('sidebar-stats');
  const search=(document.getElementById('search-input')?.value||'').toLowerCase();
  const group=document.getElementById('filter-group')?.value||'';
  const status=document.getElementById('filter-status')?.value||'';

  // Rebuild group filter
  const groupSel=document.getElementById('filter-group');
  if(groupSel){
    const prev=groupSel.value;
    groupSel.innerHTML='<option value="">All Groups</option>';
    ALL_GROUP_KEYS.forEach(k=>{
      const o=document.createElement('option');
      o.value=k; o.textContent=getGroupLabel(k,'en');
      if(k===prev)o.selected=true;
      groupSel.appendChild(o);
    });
  }

  const filtered=hymns.filter(h=>{
    const title=getHymnDisplayTitle(h).toLowerCase();
    if(search&&!title.includes(search)&&!h.id.includes(search))return false;
    if(group&&h.groupKey!==group)return false;
    if(status&&h.status!==status)return false;
    return true;
  });

  stats.textContent=`${filtered.length} of ${hymns.length} hymn${hymns.length!==1?'s':''}`;
  list.innerHTML='';

  if(!filtered.length){
    list.innerHTML='<div style="padding:40px 20px;text-align:center;color:rgba(255,255,255,.3);font-size:15px">No hymns yet.<br><br>Tap <strong>+ New</strong> to start.</div>';
    return;
  }

  filtered.forEach(h=>{
    const item=document.createElement('div');
    item.className='hymn-item';
    const title=getHymnDisplayTitle(h);
    const gc=h.groupKey?`<span class="chip chip-group">${escHtml(h.groupKey)}</span>`:'';
    const sc=h.subgroup?`<span class="chip chip-sub">${escHtml(h.subgroup)}</span>`:'';
    const badge=`<span class="status-badge status-${h.status}">${STATUS_OPTIONS[h.status]||h.status}</span>`;
    item.innerHTML=`
      <div class="hymn-item-left">
        <div class="hymn-item-title">${escHtml(title)}</div>
        <div class="hymn-item-meta">${gc}${sc}${badge}</div>
      </div>
      <span class="hymn-item-arrow">›</span>`;
    item.addEventListener('click',()=>selectHymn(h.id));
    list.appendChild(item);
  });
}

function selectHymn(id){
  activeHymn=hymns.find(h=>h.id===id)||null;
  if(!activeHymn)return;
  localStorage.setItem(ACTIVE_ID_KEY,id);
  renderEditor();
  showPage('page-editor');
}

function addNewHymn(){
  const h=createHymn();
  hymns.unshift(h);
  saveToStorage();
  selectHymn(h.id);
  showToast('New hymn created','success');
}

// ═══════════ EDITOR ════════════════════
function renderEditor(){
  if(!activeHymn)return;
  const h=activeHymn;
  const area=document.getElementById('editor-area');

  // Status toggles
  const statusHTML=Object.entries(STATUS_OPTIONS).map(([k,v])=>
    `<button class="status-toggle ${h.status===k?'active-'+k:''}" data-status="${k}">${v}</button>`
  ).join('');

  // Category toggles
  const catHTML=ALL_GROUP_KEYS.map(k=>{
    const lbl=getGroupLabel(k,'en');
    return `<button class="cat-toggle ${h.groupKey===k?'active':''}" data-cat="${k}">${escHtml(lbl)}</button>`;
  }).join('');

  // Sub toggles
  const subs=getSubgroupsForGroup(h.groupKey);
  const subHTML=subs.map(sub=>{
    const key=getSubgroupKey(sub);
    const lbl=getSubgroupLabel(sub,'en');
    return `<button class="sub-toggle ${h.subgroup===key?'active':''}" data-sub="${escHtml(key)}">${escHtml(lbl)}</button>`;
  }).join('');

  // Lang panels
  const langTabs=LANGS.map(l=>`<button class="lang-tab ${l==='en'?'active':''}" data-lang="${l}">${LANG_NAMES[l]}</button>`).join('');
  const langPanels=LANGS.map(l=>{
    const ld=h.langs[l]||createLangData();
    return `<div class="lang-panel ${l==='en'?'active':''}" data-lang="${l}">
      <div class="form-row">
        <label class="form-label">Title (${LANG_SHORT[l]})</label>
        <input type="text" class="form-input lang-title" data-lang="${l}" value="${escHtml(ld.title||'')} " placeholder="Hymn title in ${LANG_NAMES[l]}"/>
      </div>
      <div class="form-row">
        <label class="form-label">Subtitle / Credits</label>
        <input type="text" class="form-input lang-subtitle" data-lang="${l}" value="${escHtml(ld.subtitle||'')} " placeholder="Optional"/>
      </div>
      <div class="form-row">
        <label class="form-label">YouTube URL</label>
        <input type="url" class="form-input lang-youtube" data-lang="${l}" value="${escHtml(ld.youtube||'')} " placeholder="https://youtube.com/..."/>
      </div>
      <div class="chorus-card">
        <div class="chorus-header">
          <span class="chorus-label">♪ Chorus / ኣዝ — type once</span>
          <span class="chorus-hint">Leave blank if none</span>
        </div>
        <textarea class="chorus-input lang-chorus" data-lang="${l}" placeholder="Type chorus here — it repeats after every verse automatically…">${escHtml(ld.chorus||'')} </textarea>
      </div>
      <div class="verse-hint"><strong>★ Gold prefix box</strong> = highlighted line (like "Praises of Mary"). Leave empty for a plain line. Press Enter for a new line.</div>
      <div class="verse-actions-row">
        <button class="add-verse-btn" data-lang="${l}">+ Verse / ስታንዛ</button>
        <button class="dup-verse-btn" data-lang="${l}">⧉ Duplicate Last</button>
      </div>
      <div class="verse-list" id="verse-list-${l}">${buildVersesHTML(ld.verses||[])}</div>
    </div>`;
  }).join('');

  area.innerHTML=`
    <div class="form-section">
      <div class="form-section-title">Status</div>
      <div class="form-body">
        <div class="status-row" id="status-row">${statusHTML}</div>
      </div>
    </div>
    <div class="form-section">
      <div class="form-section-title">Category</div>
      <div class="form-body">
        <div class="cat-wrap" id="cat-wrap">${catHTML}</div>
        <div class="sub-wrap" id="sub-wrap">${subHTML}</div>
      </div>
    </div>
    <div class="form-section">
      <div class="form-section-title">Hymn Info</div>
      <div class="form-body">
        <div class="form-row">
          <label class="form-label">Zemari/t (Singer / Composer / Author)</label>
          <input type="text" class="form-input" id="meta-zemari" value="${escHtml(h.zemari||'')} " placeholder="Name"/>
        </div>
        <div class="form-row">
          <label class="form-label">Color (hex, optional)</label>
          <input type="text" class="form-input" id="meta-color" value="${escHtml(h.color||'')} " placeholder="#DB2777"/>
        </div>
      </div>
    </div>
    <div class="form-section">
      <div class="form-section-title">Lyrics by Language</div>
      <div class="lang-tabs" id="lang-tabs">${langTabs}</div>
      ${langPanels}
    </div>`;

  bindEditorEvents(area, h);
}

function buildVersesHTML(verses){
  if(!verses||verses.length===0) return '<div style="padding:20px;text-align:center;color:rgba(255,255,255,.3);font-style:italic;font-size:15px">No verses yet</div>';
  return verses.map((v,vi)=>buildVerseHTML(v,vi)).join('');
}

function buildVerseHTML(verse,vi){
  const lines=(verse.lines||[]).map((line,li)=>{
    const hasPfx=!!(line.prefix||'').trim();
    return `<div class="line-row ${hasPfx?'highlighted':''}" data-vi="${vi}" data-li="${li}">
      <input type="text" class="line-prefix" data-vi="${vi}" data-li="${li}" value="${escHtml(line.prefix||'')} " placeholder="prefix…" title="Highlighted prefix (leave empty for plain line)"/>
      <textarea class="line-text" data-vi="${vi}" data-li="${li}" rows="1" placeholder="line…">${escHtml(line.text||'')} </textarea>
      <button class="line-del" data-vi="${vi}" data-li="${li}">✕</button>
    </div>`;
  }).join('');
  return `<div class="verse-card" data-vi="${vi}">
    <div class="verse-header">
      <span class="verse-title">Verse / ስታንዛ ${vi+1}</span>
      <div class="verse-btns">
        <button class="v-btn verse-up" data-vi="${vi}">↑</button>
        <button class="v-btn verse-down" data-vi="${vi}">↓</button>
        <button class="v-btn del verse-del" data-vi="${vi}">✕</button>
      </div>
    </div>
    <div class="line-list" data-vi="${vi}">${lines}</div>
    <button class="add-line-btn" data-vi="${vi}">+ Add line</button>
  </div>`;
}

function refreshVerseList(area, h, lang){
  const container=area.querySelector(`#verse-list-${lang}`);
  if(!container)return;
  container.innerHTML=buildVersesHTML(h.langs[lang].verses||[]);
  bindVerseListEvents(area,h,lang);
  container.querySelectorAll('.line-text').forEach(autoResize);
}

function autoResize(el){ el.style.height='auto'; el.style.height=el.scrollHeight+'px'; }

function bindEditorEvents(area,h){
  // Status
  area.querySelectorAll('.status-toggle').forEach(btn=>{
    btn.addEventListener('click',()=>{
      h.status=btn.dataset.status;
      area.querySelectorAll('.status-toggle').forEach(b=>b.className='status-toggle');
      btn.className=`status-toggle active-${h.status}`;
      scheduleSave(); renderHymnList();
    });
  });

  // Categories
  area.querySelector('#cat-wrap')?.addEventListener('click',e=>{
    const btn=e.target.closest('.cat-toggle'); if(!btn)return;
    h.groupKey=btn.dataset.cat; h.subgroup='';
    area.querySelectorAll('.cat-toggle').forEach(b=>b.classList.toggle('active',b.dataset.cat===h.groupKey));
    const subs=getSubgroupsForGroup(h.groupKey);
    const subWrap=area.querySelector('#sub-wrap');
    if(subWrap){
      subWrap.innerHTML=subs.map(sub=>{
        const key=getSubgroupKey(sub); const lbl=getSubgroupLabel(sub,'en');
        return `<button class="sub-toggle" data-sub="${escHtml(key)}">${escHtml(lbl)}</button>`;
      }).join('');
      subWrap.style.display=subs.length?'':'none';
      bindSubEvents(area,h);
    }
    scheduleSave(); renderHymnList();
  });
  bindSubEvents(area,h);

  // Meta fields
  area.querySelector('#meta-zemari')?.addEventListener('input',e=>{h.zemari=e.target.value;scheduleSave();});
  area.querySelector('#meta-color')?.addEventListener('input',e=>{h.color=e.target.value;scheduleSave();});

  // Lang tabs
  area.querySelector('#lang-tabs')?.addEventListener('click',e=>{
    const tab=e.target.closest('.lang-tab'); if(!tab)return;
    const lang=tab.dataset.lang;
    area.querySelectorAll('.lang-tab').forEach(t=>t.classList.toggle('active',t.dataset.lang===lang));
    area.querySelectorAll('.lang-panel').forEach(p=>p.classList.toggle('active',p.dataset.lang===lang));
  });

  // Per-lang fields
  area.querySelectorAll('.lang-title').forEach(el=>el.addEventListener('input',()=>{h.langs[el.dataset.lang].title=el.value;scheduleSave();renderHymnList();}));
  area.querySelectorAll('.lang-subtitle').forEach(el=>el.addEventListener('input',()=>{h.langs[el.dataset.lang].subtitle=el.value;scheduleSave();}));
  area.querySelectorAll('.lang-youtube').forEach(el=>el.addEventListener('input',()=>{h.langs[el.dataset.lang].youtube=el.value;scheduleSave();}));
  area.querySelectorAll('.lang-chorus').forEach(el=>el.addEventListener('input',()=>{h.langs[el.dataset.lang].chorus=el.value;scheduleSave();}));

  // Add verse
  area.querySelectorAll('.add-verse-btn').forEach(btn=>{
    btn.addEventListener('click',()=>{
      const lang=btn.dataset.lang;
      h.langs[lang].verses.push(createVerse());
      scheduleSave(); refreshVerseList(area,h,lang);
    });
  });
  area.querySelectorAll('.dup-verse-btn').forEach(btn=>{
    btn.addEventListener('click',()=>{
      const lang=btn.dataset.lang; const vs=h.langs[lang].verses;
      if(!vs.length){showToast('No verses to duplicate');return;}
      vs.push(JSON.parse(JSON.stringify(vs[vs.length-1])));
      scheduleSave(); refreshVerseList(area,h,lang);
    });
  });

  // Verse list events per language
  LANGS.forEach(lang=>bindVerseListEvents(area,h,lang));

  // Auto-resize all textareas
  area.querySelectorAll('.line-text').forEach(autoResize);
}

function bindSubEvents(area,h){
  area.querySelector('#sub-wrap')?.addEventListener('click',e=>{
    const btn=e.target.closest('.sub-toggle'); if(!btn)return;
    h.subgroup=h.subgroup===btn.dataset.sub?'':btn.dataset.sub;
    area.querySelectorAll('.sub-toggle').forEach(b=>b.classList.toggle('active',b.dataset.sub===h.subgroup));
    scheduleSave(); renderHymnList();
  });
}

function bindVerseListEvents(area,h,lang){
  const container=area.querySelector(`#verse-list-${lang}`); if(!container)return;

  container.addEventListener('input',e=>{
    if(e.target.classList.contains('line-prefix')){
      const vi=parseInt(e.target.dataset.vi),li=parseInt(e.target.dataset.li);
      h.langs[lang].verses[vi].lines[li].prefix=e.target.value;
      e.target.closest('.line-row').classList.toggle('highlighted',!!e.target.value.trim());
      scheduleSave();
    }
    if(e.target.classList.contains('line-text')){
      const vi=parseInt(e.target.dataset.vi),li=parseInt(e.target.dataset.li);
      h.langs[lang].verses[vi].lines[li].text=e.target.value;
      autoResize(e.target); scheduleSave();
    }
  },true);

  container.addEventListener('click',e=>{
    const vi=e.target.dataset?.vi!==undefined?parseInt(e.target.dataset.vi):null;
    const li=e.target.dataset?.li!==undefined?parseInt(e.target.dataset.li):null;
    if(e.target.classList.contains('line-del')){
      const lines=h.langs[lang].verses[vi].lines;
      if(lines.length<=1){showToast('A verse needs at least one line');return;}
      lines.splice(li,1); scheduleSave(); refreshVerseList(area,h,lang); return;
    }
    if(e.target.classList.contains('add-line-btn')){
      h.langs[lang].verses[vi].lines.push(createLine());
      scheduleSave(); refreshVerseList(area,h,lang); return;
    }
    if(e.target.classList.contains('verse-up')){
      const vs=h.langs[lang].verses;
      if(vi>0){[vs[vi-1],vs[vi]]=[vs[vi],vs[vi-1]];scheduleSave();refreshVerseList(area,h,lang);} return;
    }
    if(e.target.classList.contains('verse-down')){
      const vs=h.langs[lang].verses;
      if(vi<vs.length-1){[vs[vi],vs[vi+1]]=[vs[vi+1],vs[vi]];scheduleSave();refreshVerseList(area,h,lang);} return;
    }
    if(e.target.classList.contains('verse-del')){
      h.langs[lang].verses.splice(vi,1); scheduleSave(); refreshVerseList(area,h,lang); return;
    }
  });

  container.addEventListener('keydown',e=>{
    if(e.key==='Enter'&&e.target.classList.contains('line-text')&&!e.shiftKey){
      e.preventDefault();
      const vi=parseInt(e.target.dataset.vi),li=parseInt(e.target.dataset.li);
      h.langs[lang].verses[vi].lines.splice(li+1,0,createLine());
      scheduleSave(); refreshVerseList(area,h,lang);
      setTimeout(()=>{
        const n=container.querySelector(`.line-text[data-vi="${vi}"][data-li="${li+1}"]`);
        if(n)n.focus();
      },30);
    }
  });
}

// ═══════════ GITHUB + TOKEN ═══════════

const GH_KEYS = {owner:'wz_gh_owner',repo:'wz_gh_repo',branch:'wz_gh_branch',token:'wz_gh_token',folder:'wz_gh_folder',volpass:'wz_vol_pass'};
// const SESSION_KEY = 'wz_session_ok'; (deduped)
const VOL_TOKEN_KEY = 'wz_vol_token_session';

function getGHConfig(){
  return {
    // Repo details hardcoded — only token and volpass come from storage
    owner:   'EskndrEssey',
    repo:    'Mezmur-Typer',
    branch:  'main',
    folder:  'data',
    token:   localStorage.getItem(GH_KEYS.token)||'',
    volpass: localStorage.getItem(GH_KEYS.volpass)||'',
  };
}

function saveGHConfig(cfg){
  if (cfg.owner   !== undefined) localStorage.setItem(GH_KEYS.owner,   cfg.owner||'');
  if (cfg.repo    !== undefined) localStorage.setItem(GH_KEYS.repo,    cfg.repo||'');
  if (cfg.branch  !== undefined) localStorage.setItem(GH_KEYS.branch,  cfg.branch||'main');
  if (cfg.token   !== undefined) localStorage.setItem(GH_KEYS.token,   cfg.token||'');
  if (cfg.folder  !== undefined) localStorage.setItem(GH_KEYS.folder,  cfg.folder||'data');
  if (cfg.volpass !== undefined) localStorage.setItem(GH_KEYS.volpass, cfg.volpass||'');
}

function isGHConfigured(){
  // Build effective config — use volunteer token if set
  const _adminCfg=getGHConfig();
  const cfg={..._adminCfg, token: getVolToken()||_adminCfg.token};
  return !!(cfg.owner && cfg.repo && cfg.token);
}

function openAdminPanel(){
  const cfg=getGHConfig();
  document.getElementById('gh-token').value        = cfg.token||'';
  document.getElementById('gh-vol-password').value = cfg.volpass||'';
  document.getElementById('modal-admin').style.display='flex';
}

function closeAdminPanel(){
  document.getElementById('modal-admin').style.display='none';
}

// PASSWORD GATE
function isSessionActive(){
  // Use sessionStorage so password is required every new browser session
  return sessionStorage.getItem(SESSION_KEY)==='1';
}

// DEFAULT PASSWORD — hardcoded so volunteers always see the gate
// Admin can override by setting a different password in the Admin panel
// DEDUPED

function getVolPassword(){
  // Use admin-set password if available, else fall back to default
  return localStorage.getItem(GH_KEYS.volpass) || DEFAULT_VOL_PASSWORD;
}

function checkPasswordGate(){
  if (isSessionActive()){
    hideLanding();
    return;
  }
  // Always show gate — password is either admin-set or default hardcoded one
  showLanding();
}

function showLanding(){
  document.getElementById('password-landing').style.display='flex';
  document.getElementById('app-header-bar') && (document.getElementById('app-header-bar').style.display='none');
  document.querySelector('.app-body') && (document.querySelector('.app-body').style.display='none');
  setTimeout(()=>document.getElementById('gate-password').focus(),150);
}

function hideLanding(){
  document.getElementById('password-landing').style.display='none';
  document.getElementById('app-header-bar') && (document.getElementById('app-header-bar').style.display='');
  document.querySelector('.app-body') && (document.querySelector('.app-body').style.display='');
}

function submitPasswordGate(){
  const entered = document.getElementById('gate-password').value;
  const correct = getVolPassword();
  const errEl   = document.getElementById('gate-error');
  if (entered === correct){
    sessionStorage.setItem(SESSION_KEY,'1');
    hideLanding();
    errEl.style.display='none';
    document.getElementById('gate-password').value='';
  } else {
    errEl.style.display='block';
    document.getElementById('gate-password').value='';
    document.getElementById('gate-password').focus();
    const input=document.getElementById('gate-password');
    input.classList.remove('shake'); void input.offsetWidth; input.classList.add('shake');
  }
}

async function testGHConnection(){
  const cfg = {
    ...getGHConfig(),
    token: document.getElementById('gh-token').value.trim(),
  };
  if (!cfg.token){showToast('Paste your GitHub token first.','error');return;}
  showToast('Testing connection…');
  try{
    const r=await fetch(`https://api.github.com/repos/${cfg.owner}/${cfg.repo}`,{
      headers:{'Authorization':`Bearer ${cfg.token}`,'Accept':'application/vnd.github+json'}
    });
    if (r.ok){
      const d=await r.json();
      showToast(`Connected to "${d.full_name}" \u2713`,'success');
    } else {
      const e=await r.json();
      showToast(`Error: ${e.message}`,'error');
    }
  }catch(e){showToast('Network error — check your connection.','error');}
}

// ═══════════════════════════════════════
//  GITHUB FILE API HELPERS
// ═══════════════════════════════════════

function ghFilePath(cfg, groupKey){
  const folder = (cfg.folder||'').replace(/\/$/,'');
  // Use the file key from taxonomy if available, else groupKey directly
  const fileKey = (GROUP_TAXONOMY[groupKey]?.file) || groupKey || 'ungrouped';
  const filename = fileKey + '.json';
  return folder ? `${folder}/${filename}` : filename;
}

// Return all group file paths that should exist in the repo
function allGroupFilePaths(cfg){
  return ALL_GROUP_KEYS.map(k=>({key:k, label:GROUP_TAXONOMY[k].label, path:ghFilePath(cfg,k)}));
}

async function ghGetFile(cfg, path){
  const url=`https://api.github.com/repos/${cfg.owner}/${cfg.repo}/contents/${path}?ref=${cfg.branch}`;
  const r=await fetch(url,{headers:{'Authorization':`Bearer ${cfg.token}`,'Accept':'application/vnd.github+json'}});
  if (r.status===404) return null;
  if (!r.ok) throw new Error(`GitHub API error: ${r.status}`);
  return r.json(); // { content (base64), sha, ... }
}

async function ghPutFile(cfg, path, content, sha, message){
  const url=`https://api.github.com/repos/${cfg.owner}/${cfg.repo}/contents/${path}`;
  const body={
    message,
    content: btoa(unescape(encodeURIComponent(content))),
    branch: cfg.branch,
  };
  if (sha) body.sha = sha;
  const r=await fetch(url,{
    method:'PUT',
    headers:{'Authorization':`Bearer ${cfg.token}`,'Accept':'application/vnd.github+json','Content-Type':'application/json'},
    body:JSON.stringify(body)
  });
  if (!r.ok){const e=await r.json(); throw new Error(e.message||'GitHub write failed');}
  return r.json();
}


// ═══════════════════════════════════════
//  INITIALIZE ALL GROUP FILES ON GITHUB
// ═══════════════════════════════════════

async function initializeGitHubFiles(){
  if (!isGHConfigured()){showToast('Save GitHub settings first.','error');return;}
  const cfg=getGHConfig();
  const files=allGroupFilePaths(cfg);

  const btn=document.getElementById('gh-init-files');
  const statusEl=document.getElementById('gh-init-status');
  btn.disabled=true;
  btn.textContent='Creating files…';
  statusEl.innerHTML='<div class="init-progress"><span class="cross-spin">✝</span> Starting…</div>';

  let created=0, skipped=0, failed=0;

  for (const f of files){
    statusEl.innerHTML=`<div class="init-progress"><span class="cross-spin">✝</span> Checking <strong>${f.path}</strong>…</div>`;
    try{
      const existing=await ghGetFile(cfg, f.path);
      if (existing){
        skipped++;
        statusEl.innerHTML+=`<div class="init-row init-skip">✓ Already exists: <code>${f.path}</code></div>`;
      } else {
        await ghPutFile(cfg, f.path, '[]', null, `Initialize ${f.key} hymns file`);
        created++;
        statusEl.innerHTML+=`<div class="init-row init-ok">✝ Created: <code>${f.path}</code></div>`;
      }
    }catch(e){
      failed++;
      statusEl.innerHTML+=`<div class="init-row init-fail">✕ Failed: <code>${f.path}</code> — ${escHtml(e.message)}</div>`;
    }
    // Small delay to avoid rate limit
    await new Promise(r=>setTimeout(r,300));
  }

  btn.disabled=false;
  btn.textContent='✝ Initialize All Group Files';
  statusEl.innerHTML+=`<div class="init-summary">Done — ${created} created, ${skipped} already existed, ${failed} failed.</div>`;
  if (created>0) showToast(`${created} JSON files created on GitHub ✓`,'success');
}

// ═══════════════════════════════════════
//  DUPLICATE CHECK & SUBMIT FLOW
// ═══════════════════════════════════════


// ═══════════ DUPLICATE CHECK + SUBMIT ═
let pendingSubmitHymn = null;
let pendingMergeTarget = null;  // existing hymn on GitHub to merge into

async function startSubmitFlow(hymn){
  const hasTitle = LANGS.some(l=>(hymn.langs[l]?.title||'').trim());
  if (!hasTitle){showToast('Add at least one title before submitting.','error');return;}
  if (!hymn.groupKey){showToast('Please select a category first.','error');return;}

  pendingSubmitHymn = hymn;
  pendingMergeTarget = null;

  if (!getVolToken()){
    promptVolunteerToken(()=>startSubmitFlow(hymn));
    return;
  }

  const modal    = document.getElementById('modal-dupcheck');
  const results  = document.getElementById('dupcheck-results');
  const submitBtn= document.getElementById('dupcheck-submit');
  const mergeBtn = document.getElementById('dupcheck-merge');

  results.innerHTML = '<div class="dupcheck-loading"><span class="cross-spin">✝</span> Checking for existing hymns…</div>';
  submitBtn.style.display = 'none';
  mergeBtn.style.display  = 'none';
  modal.style.display     = 'flex';

  try{
    const cfg  = getGHConfig();
    const path = ghFilePath(cfg, hymn.groupKey);
    const existing = await ghGetFile(cfg, path);

    if (!existing){
      results.innerHTML = `<div class="dupcheck-clear">✓ No existing file yet — this will create <strong>${path}</strong>.</div>`;
      submitBtn.style.display = 'inline-flex';
      submitBtn.textContent   = '✝ Submit as New Hymn';
      return;
    }

    const decoded = decodeURIComponent(escape(atob(existing.content.replace(/\n/g,''))));
    let existingHymns = [];
    try{ existingHymns = JSON.parse(decoded); }catch(e){}

    const myTitle = getHymnDisplayTitle(hymn).toLowerCase();
    const myLangs = LANGS.filter(l=>(hymn.langs[l]?.title||'').trim());

    // Find similar titles
    const matches = existingHymns.filter(h=>{
      if (!h.title) return false;
      const titles = typeof h.title==='object' ? Object.values(h.title) : [h.title];
      return titles.some(t=>{
        if (!t) return false;
        const tl = t.toLowerCase();
        return tl.includes(myTitle) || myTitle.includes(tl) || levenshtein(tl,myTitle)<4;
      });
    });

    if (matches.length === 0){
      results.innerHTML = `<div class="dupcheck-clear">✓ No similar hymns found in <strong>${path}</strong> (${existingHymns.length} checked). Safe to submit!</div>`;
      submitBtn.style.display = 'inline-flex';
      submitBtn.textContent   = '✝ Submit as New Hymn';
    } else {
      // Show matches with language info and merge option
      let html = `<div class="dupcheck-warning">⚠ Found ${matches.length} similar hymn${matches.length!==1?'s':''} already in <strong>${path}</strong>:</div>`;
      html += '<div class="dupcheck-matches">';
      matches.forEach(m=>{
        const titles = typeof m.title==='object' ? Object.values(m.title).filter(Boolean) : [m.title||''];
        const existingLangs = typeof m.title==='object'
          ? Object.keys(m.title).filter(l=>m.title[l]).join(', ')
          : 'unknown';
        const myLangsStr = myLangs.join(', ');

        // Figure out which languages are missing in existing hymn
        const missingLangs = myLangs.filter(l=>!(m.title&&m.title[l]));
        const overlap = myLangs.filter(l=>m.title&&m.title[l]);

        html += `<div class="dupcheck-match-item" style="flex-direction:column;align-items:flex-start;gap:8px">
          <div style="display:flex;align-items:center;justify-content:space-between;width:100%">
            <span class="dupcheck-match-title">${escHtml(titles[0])}</span>
            <span class="id-chip">${escHtml(m.id||'')}</span>
          </div>
          <div style="font-size:11px;color:var(--t3)">
            Already has: <span style="color:var(--t2)">${escHtml(existingLangs)}</span>
            &nbsp;·&nbsp; You are adding: <span style="color:var(--accent)">${escHtml(myLangsStr)}</span>
          </div>
          ${missingLangs.length>0
            ? `<div style="font-size:11px;color:var(--green)">✓ Your languages (${escHtml(missingLangs.join(', '))}) will be added to this hymn.</div>`
            : overlap.length>0
              ? `<div style="font-size:11px;color:var(--gold)">⚠ Some languages overlap (${escHtml(overlap.join(', '))}). Merging will update them.</div>`
              : ''
          }
          <button class="btn btn-secondary btn-sm merge-select-btn" data-id="${escHtml(m.id||'')}" style="font-size:12px">
            Select this hymn to merge into →
          </button>
        </div>`;
      });
      html += '</div>';
      html += `<div class="dupcheck-note" style="margin-top:8px">Select a hymn above to merge your languages into it, or submit as a brand new hymn.</div>`;
      results.innerHTML = html;

      // Bind merge-select buttons
      results.querySelectorAll('.merge-select-btn').forEach(btn=>{
        btn.addEventListener('click',()=>{
          const targetId = btn.dataset.id;
          pendingMergeTarget = matches.find(m=>m.id===targetId)||null;
          // Highlight selected
          results.querySelectorAll('.merge-select-btn').forEach(b=>{
            b.style.background = b===btn ? 'var(--accent)' : '';
            b.style.color      = b===btn ? '#fff' : '';
            b.textContent      = b===btn ? '✓ Selected' : 'Select this hymn to merge into →';
          });
          mergeBtn.style.display  = 'inline-flex';
          submitBtn.style.display = 'inline-flex';
          submitBtn.textContent   = '+ Submit as New Hymn Instead';
        });
      });

      submitBtn.style.display = 'inline-flex';
      submitBtn.textContent   = '+ Submit as New Hymn';
      mergeBtn.style.display  = 'none';
    }
  }catch(e){
    const is401 = e.message.includes('401');
    if (is401){
      // Clear bad token so volunteer is prompted again
      sessionStorage.removeItem(VOL_TOKEN_KEY);
      localStorage.removeItem(GH_KEYS.token);
      results.innerHTML = `<div class="dupcheck-error">
        ✕ Token error (401 — Unauthorized).<br><br>
        <strong>Your token is invalid or expired.</strong><br>
        <span style="font-size:11px;color:var(--t3)">Close this and click Submit again — you will be asked to enter a new token.</span>
      </div>`;
    } else {
      results.innerHTML = `<div class="dupcheck-error">✕ Could not search GitHub: ${escHtml(e.message)}</div>`;
    }
    submitBtn.style.display = 'inline-flex';
    submitBtn.textContent   = is401 ? '✕ Close — Fix Token First' : '✝ Submit Anyway';
  }
}

// Merge: take existing hymn from GitHub, fill in missing languages from local hymn
function mergeHymns(existingExported, localHymn){
  const localExported = hymnToExport(localHymn);
  const merged = JSON.parse(JSON.stringify(existingExported));

  // Merge title
  if (!merged.title) merged.title = {};
  LANGS.forEach(l=>{
    const localTitle = localExported.title?.[l];
    if (localTitle && !merged.title[l]) merged.title[l] = localTitle;
    else if (localTitle && merged.title[l]) merged.title[l] = merged.title[l]; // keep existing
  });

  // Merge lyrics — add any language that's missing
  if (!merged.lyrics) merged.lyrics = {};
  LANGS.forEach(l=>{
    const localLyrics = localExported.lyrics?.[l];
    if (localLyrics && !merged.lyrics[l]){
      merged.lyrics[l] = localLyrics;
    }
  });

  // Merge subtitle
  if (!merged.subtitle) merged.subtitle = {};
  LANGS.forEach(l=>{
    const localSub = localExported.subtitle?.[l];
    if (localSub && !merged.subtitle?.[l]){
      if (!merged.subtitle) merged.subtitle = {};
      merged.subtitle[l] = localSub;
    }
  });

  // Merge youtubeUrls
  if (!merged.youtubeUrls) merged.youtubeUrls = {};
  if (localExported.youtubeUrls){
    LANGS.forEach(l=>{
      const localUrl = localExported.youtubeUrls?.[l];
      if (localUrl && !merged.youtubeUrls[l]) merged.youtubeUrls[l] = localUrl;
    });
  }

  // Merge group names
  if (!merged.group) merged.group = {};
  LANGS.forEach(l=>{
    const localGroup = localExported.group?.[l];
    if (localGroup && !merged.group[l]) merged.group[l] = localGroup;
  });

  // Keep singer/color/category if not already set
  if (!merged.singer && localExported.singer) merged.singer = localExported.singer;
  if (!merged.color  && localExported.color)  merged.color  = localExported.color;

  return merged;
}

async function submitMergedHymn(){
  const hymn   = pendingSubmitHymn;
  const target = pendingMergeTarget;
  if (!hymn || !target) return;
  document.getElementById('modal-dupcheck').style.display='none';

  const cfg   = getGHConfig();
  const path  = ghFilePath(cfg, hymn.groupKey);
  const title = getHymnDisplayTitle(hymn);

  showToast('Merging languages…');

  try{
    const merged = mergeHymns(target, hymn);

    // Read file, find and replace the target hymn
    const fileData = await ghGetFile(cfg, path);
    let arr = [], sha = null;
    if (fileData){
      sha = fileData.sha;
      const decoded = decodeURIComponent(escape(atob(fileData.content.replace(/\n/g,''))));
      try{ arr = JSON.parse(decoded); }catch(e){ arr=[]; }
    }
    const idx = arr.findIndex(h=>h.id===target.id);
    if (idx>=0) arr[idx] = merged; else arr.push(merged);

    const addedLangs = LANGS.filter(l=>!target.title?.[l] && merged.title?.[l]);
    const commitMsg  = `Merge languages (${addedLangs.join(', ')}) into: ${title} (${target.id})`;

    await ghPutFile(cfg, path, JSON.stringify(arr,null,2), sha, commitMsg);

    // Also handle Mera cross-filing
    if (hymn.subgroup==='Mera' && hymn.groupKey!=='Mera'){
      const meraPath = ghFilePath(cfg,'Mera');
      const meraFile = await ghGetFile(cfg, meraPath);
      let meraArr = [], meraSha = null;
      if (meraFile){
        meraSha = meraFile.sha;
        try{ meraArr = JSON.parse(decodeURIComponent(escape(atob(meraFile.content.replace(/\n/g,''))))); }catch(e){}
      }
      const mi = meraArr.findIndex(h=>h.id===target.id);
      if (mi>=0) meraArr[mi]=merged; else meraArr.push(merged);
      await ghPutFile(cfg, meraPath, JSON.stringify(meraArr,null,2), meraSha, commitMsg);
    }

    hymn.status = 'final';
    saveToStorage(); renderHymnList();
    if (activeHymn?.id===hymn.id) renderEditor();

    const addedStr = addedLangs.length ? addedLangs.join(', ') : 'your languages';
    document.getElementById('submitted-msg').innerHTML =
      `<strong>${escHtml(title)}</strong> — languages merged successfully.<br><br>
       Added: <strong>${escHtml(addedStr)}</strong> to the existing hymn.<br>
       File: <code>${escHtml(path)}</code>`;
    document.getElementById('modal-submitted').style.display='flex';

  }catch(e){
    if (e.message.includes('401')){
      sessionStorage.removeItem(VOL_TOKEN_KEY);
      localStorage.removeItem(GH_KEYS.token);
      showToast('Token invalid (401) — cleared. Click Submit again to enter a new token.','error');
    } else {
      showToast(`Merge failed: ${e.message}`,'error');
    }
  }
}

async function submitHymnToGitHub(){
  const hymn = pendingSubmitHymn;
  if (!hymn) return;
  document.getElementById('modal-dupcheck').style.display='none';

  const cfg     = getGHConfig();
  const path    = ghFilePath(cfg, hymn.groupKey);
  const exported= hymnToExport(hymn);
  const title   = getHymnDisplayTitle(hymn);

  showToast('Submitting to GitHub…');

  try{
    async function upsertInFile(filePath, hymnData){
      const existing = await ghGetFile(cfg, filePath);
      let arr=[], sha=null;
      if (existing){
        sha = existing.sha;
        const decoded = decodeURIComponent(escape(atob(existing.content.replace(/\n/g,''))));
        try{ arr = JSON.parse(decoded); }catch(e){ arr=[]; }
      }
      const idx = arr.findIndex(h=>h.id===hymnData.id);
      if (idx>=0) arr[idx]=hymnData; else arr.push(hymnData);
      const msg = idx>=0
        ? `Update hymn: ${title} (${hymnData.id})`
        : `Add hymn: ${title} (${hymnData.id})`;
      await ghPutFile(cfg, filePath, JSON.stringify(arr,null,2), sha, msg);
      return msg;
    }

    const commitMsg = await upsertInFile(path, exported);

    if (hymn.subgroup==='Mera' && hymn.groupKey!=='Mera'){
      await upsertInFile(ghFilePath(cfg,'Mera'), exported);
    }

    hymn.status = 'final';
    saveToStorage(); renderHymnList();
    if (activeHymn?.id===hymn.id) renderEditor();

    document.getElementById('submitted-msg').innerHTML =
      `<strong>${escHtml(title)}</strong> added to <code>${escHtml(path)}</code>.<br><br>
       Commit: <em>${escHtml(commitMsg)}</em>`;
    document.getElementById('modal-submitted').style.display='flex';

  }catch(e){
    if (e.message.includes('401')){
      sessionStorage.removeItem(VOL_TOKEN_KEY);
      localStorage.removeItem(GH_KEYS.token);
      showToast('Token invalid (401) — cleared. Click Submit again to enter a new token.','error');
    } else {
      showToast(`Submit failed: ${e.message}`,'error');
    }
  }
}

async function submitHymnToGitHub(){
  const hymn = pendingSubmitHymn;
  if (!hymn) return;
  document.getElementById('modal-dupcheck').style.display='none';

  const cfg     = getGHConfig();
  const path    = ghFilePath(cfg, hymn.groupKey);
  const exported= hymnToExport(hymn);
  const title   = getHymnDisplayTitle(hymn);

  showToast('Submitting to GitHub…');

  try{
    async function upsertInFile(filePath, hymnData){
      const existing = await ghGetFile(cfg, filePath);
      let arr=[], sha=null;
      if (existing){
        sha = existing.sha;
        const decoded = decodeURIComponent(escape(atob(existing.content.replace(/\n/g,''))));
        try{ arr = JSON.parse(decoded); }catch(e){ arr=[]; }
      }
      const idx = arr.findIndex(h=>h.id===hymnData.id);
      if (idx>=0) arr[idx]=hymnData; else arr.push(hymnData);
      const msg = idx>=0
        ? `Update hymn: ${title} (${hymnData.id})`
        : `Add hymn: ${title} (${hymnData.id})`;
      await ghPutFile(cfg, filePath, JSON.stringify(arr,null,2), sha, msg);
      return msg;
    }

    const commitMsg = await upsertInFile(path, exported);

    if (hymn.subgroup==='Mera' && hymn.groupKey!=='Mera'){
      await upsertInFile(ghFilePath(cfg,'Mera'), exported);
    }

    hymn.status = 'final';
    saveToStorage(); renderHymnList();
    if (activeHymn?.id===hymn.id) renderEditor();

    document.getElementById('submitted-msg').innerHTML =
      `<strong>${escHtml(title)}</strong> added to <code>${escHtml(path)}</code>.<br><br>
       Commit: <em>${escHtml(commitMsg)}</em>`;
    document.getElementById('modal-submitted').style.display='flex';

  }catch(e){
    if (e.message.includes('401')){
      sessionStorage.removeItem(VOL_TOKEN_KEY);
      localStorage.removeItem(GH_KEYS.token);
      showToast('Token invalid (401) — cleared. Click Submit again to enter a new token.','error');
    } else {
      showToast(`Submit failed: ${e.message}`,'error');
    }
  }
}



// ═══════════ COPY JSON ════════════════
function copyHymnJSON(hymn){
  const exported = hymnToExport(hymn);
  const jsonStr = JSON.stringify([exported], null, 2);
  navigator.clipboard.writeText(jsonStr).then(()=>{
    showToast('JSON copied to clipboard ✓','success');
  }).catch(()=>{
    // Fallback — show in a modal
    showCopyFallback(jsonStr);
  });
}

function showCopyFallback(text){
  const modal=document.getElementById('modal-copy-json');
  const ta=document.getElementById('copy-json-textarea');
  ta.value=text;
  modal.style.display='flex';
  ta.select();
}


// ═══════════ HYMN OPS ═════════════════
function confirmDeleteHymn(h){
  document.getElementById('delete-msg').textContent=`Delete "${getHymnDisplayTitle(h)}"? Cannot be undone.`;
  openSheet('sheet-delete');
}
function duplicateHymn(id){
  const orig=hymns.find(h=>h.id===id); if(!orig)return;
  const copy=JSON.parse(JSON.stringify(orig));
  copy.id=generateId(); copy.status='draft';
  LANGS.forEach(l=>{if(copy.langs[l]?.title)copy.langs[l].title+=' (Copy)';});
  hymns.splice(hymns.findIndex(h=>h.id===id)+1,0,copy);
  saveToStorage(); renderHymnList();
  selectHymn(copy.id);
  showToast('Hymn duplicated','success');
}

// ═══════════ TOAST ════════════════════
let toastTimer;
function showToast(msg,type=''){
  const t=document.getElementById('toast');
  t.textContent=msg; t.className='toast'+(type?' '+type:'')+' visible';
  clearTimeout(toastTimer); toastTimer=setTimeout(()=>t.classList.remove('visible'),2800);
}

// ═══════════ EXPORT SHEET ═════════════
function buildExportSheet(){
  const gl=document.getElementById('export-group-list'); if(!gl)return;
  gl.innerHTML='';
  const used=ALL_GROUP_KEYS.filter(k=>hymns.some(h=>h.groupKey===k));
  if(!used.length){gl.innerHTML='<div style="color:rgba(255,255,255,.3);font-size:14px;padding:8px 0">No hymns yet</div>';return;}
  used.forEach(k=>{
    const count=hymns.filter(h=>h.groupKey===k).length;
    const btn=document.createElement('button');
    btn.className='export-group-item';
    btn.innerHTML=`<span>${escHtml(getGroupLabel(k,'en'))}</span><span class="export-count">${count}</span>`;
    btn.addEventListener('click',()=>{ downloadJSON(hymns.filter(h=>h.groupKey===k).map(hymnToExport),k+'.json'); closeSheet('sheet-export'); showToast('Exported '+k,'success'); });
    gl.appendChild(btn);
  });
}
document.getElementById('btn-export-all')?.addEventListener('click',()=>{ downloadJSON(hymns.map(hymnToExport),'hymns.json'); closeSheet('sheet-export'); showToast(`Exported ${hymns.length} hymns`,'success'); });

// ═══════════ IMPORT ═══════════════════

function importFromJSON(jsonStr){
  let data; try{data=JSON.parse(jsonStr);}catch(e){showToast('Invalid JSON','error');return;}
  if(!Array.isArray(data))data=[data];
  importQueue=data; importStats={added:0,skipped:0,replaced:0}; importCurrent=0;
  doNextImport();
}
importQueue=[],importStats={},importCurrent=0;
function doNextImport(){
  if(importCurrent>=importQueue.length){
    renderHymnList(); saveToStorage();
    showToast(`Done: ${importStats.added} added, ${importStats.replaced} replaced, ${importStats.skipped} skipped`,'success');
    return;
  }
  const raw=importQueue[importCurrent];
  const hymn=importedToInternal(raw);
  const exist=hymns.find(h=>h.id===hymn.id);
  if(!exist){hymns.push(hymn);importStats.added++;importCurrent++;doNextImport();return;}
  document.getElementById('conflict-msg').textContent=`"${getHymnDisplayTitle(exist)}" already exists.`;
  openSheet('sheet-conflict');
}
function importedToInternal(raw){
  const hymn=createHymn({id:raw.id||generateId()});
  hymn.zemari=raw.singer||raw.composer||raw.author||'';
  hymn.color=raw.color||'';
  hymn.subgroup=raw.subgroup||'';
  hymn.groupKey=raw.category||raw.groupKey||'';
  LANGS.forEach(l=>{
    const ld=hymn.langs[l];
    ld.groupName=(raw.group&&raw.group[l])||'';
    ld.title=(raw.title&&raw.title[l])||'';
    ld.subtitle=(raw.subtitle&&raw.subtitle[l])||'';
    if(raw.youtubeUrls&&typeof raw.youtubeUrls==='object'&&!Array.isArray(raw.youtubeUrls))ld.youtube=raw.youtubeUrls[l]||'';
    const lyrics=(raw.lyrics&&raw.lyrics[l])||'';
    if(lyrics){const p=parseLyricsToVerses(lyrics);ld.chorus=p.chorus;ld.verses=p.verses;}
  });
  return hymn;
}

// ═══════════ INIT ═════════════════════
function init(){
  loadFromStorage();

  // Gate
  document.getElementById('gate-submit')?.addEventListener('click',submitGate);
  document.getElementById('gate-password')?.addEventListener('keydown',e=>{if(e.key==='Enter')submitGate();});

  // List page
  document.getElementById('btn-new-top')?.addEventListener('click',addNewHymn);
  document.getElementById('btn-import-top')?.addEventListener('click',()=>document.getElementById('file-import-input').click());
  document.getElementById('btn-export-top')?.addEventListener('click',()=>{buildExportSheet();openSheet('sheet-export');});
  document.getElementById('search-input')?.addEventListener('input',renderHymnList);
  document.getElementById('filter-group')?.addEventListener('change',renderHymnList);
  document.getElementById('filter-status')?.addEventListener('change',renderHymnList);
  document.getElementById('file-import-input')?.addEventListener('change',function(){
    const file=this.files[0]; if(!file)return;
    const reader=new FileReader(); reader.onload=e=>{importFromJSON(e.target.result);this.value='';};
    reader.readAsText(file);
  });

  // Editor page
  document.getElementById('btn-back')?.addEventListener('click',()=>{saveToStorage();showPage('page-list');renderHymnList();});
  document.getElementById('btn-submit-hymn')?.addEventListener('click',()=>{if(activeHymn)startSubmitFlow(activeHymn);});
  document.getElementById('btn-copy-json')?.addEventListener('click',()=>{if(activeHymn)copyHymnJSON(activeHymn);});
  document.getElementById('btn-delete-hymn')?.addEventListener('click',()=>{if(activeHymn)confirmDeleteHymn(activeHymn);});

  // Sheets — close on overlay tap
  document.querySelectorAll('.sheet-overlay').forEach(el=>{
    el.addEventListener('click',e=>{if(e.target===el)el.style.display='none';});
  });

  // Export sheet
  document.getElementById('sheet-export-close')?.addEventListener('click',()=>closeSheet('sheet-export'));
  document.getElementById('btn-export-all')?.addEventListener('click',()=>{ downloadJSON(hymns.map(hymnToExport),'hymns.json'); closeSheet('sheet-export'); showToast(`Exported ${hymns.length} hymns`,'success'); });

  // Admin sheet
  document.getElementById('sheet-admin-close')?.addEventListener('click',()=>closeSheet('sheet-admin'));
  document.getElementById('gh-save')?.addEventListener('click',()=>{
    const token=document.getElementById('gh-token').value.trim();
    if(!token){showToast('Paste your token first','error');return;}
    saveGHConfig({token});closeSheet('sheet-admin');showToast('Token saved ✓','success');
  });
  document.getElementById('gh-test')?.addEventListener('click',testGHConnection);
  document.getElementById('gh-init-files')?.addEventListener('click',initializeGitHubFiles);

  // Token sheet
  document.getElementById('token-cancel')?.addEventListener('click',()=>{closeSheet('sheet-token');pendingTokenCallback=null;});
  document.getElementById('token-confirm')?.addEventListener('click',confirmVolunteerToken);
  document.getElementById('volunteer-token')?.addEventListener('keydown',e=>{if(e.key==='Enter')confirmVolunteerToken();});

  // Copy JSON sheet
  document.getElementById('copy-json-close')?.addEventListener('click',()=>closeSheet('sheet-copy-json'));
  document.getElementById('copy-json-copy-btn')?.addEventListener('click',()=>{
    const ta=document.getElementById('copy-json-textarea'); ta.select(); document.execCommand('copy'); showToast('Copied ✓','success');
  });

  // Dup check sheet
  document.getElementById('dupcheck-cancel')?.addEventListener('click',()=>closeSheet('sheet-dupcheck'));
  document.getElementById('dupcheck-merge')?.addEventListener('click',submitMergedHymn);
  document.getElementById('dupcheck-submit')?.addEventListener('click',submitHymnToGitHub);

  // Success sheet
  document.getElementById('submitted-ok')?.addEventListener('click',()=>closeSheet('sheet-submitted'));

  // Delete
  document.getElementById('delete-cancel')?.addEventListener('click',()=>closeSheet('sheet-delete'));
  document.getElementById('delete-confirm')?.addEventListener('click',()=>{
    if(activeHymn){hymns=hymns.filter(h=>h.id!==activeHymn.id);saveToStorage();activeHymn=null;}
    closeSheet('sheet-delete'); showPage('page-list'); renderHymnList();
    showToast('Hymn deleted','error');
  });

  // Conflict
  document.getElementById('conflict-keep')?.addEventListener('click',()=>{importStats.skipped++;importCurrent++;closeSheet('sheet-conflict');doNextImport();});
  document.getElementById('conflict-replace')?.addEventListener('click',()=>{
    const raw=importQueue[importCurrent]; const hymn=importedToInternal(raw);
    hymns[hymns.findIndex(h=>h.id===hymn.id)]=hymn; importStats.replaced++;importCurrent++;
    closeSheet('sheet-conflict'); doNextImport();
  });
  document.getElementById('conflict-copy')?.addEventListener('click',()=>{
    const raw=importQueue[importCurrent]; const hymn=importedToInternal(raw);
    hymn.id=generateId(); hymns.push(hymn); importStats.added++;importCurrent++;
    closeSheet('sheet-conflict'); doNextImport();
  });

  // Logo secret tap → admin (5 quick taps)
  let tapCount=0,tapTimer;
  document.addEventListener('click',e=>{
    if(e.target.closest('.top-title')||e.target.closest('.gate-cross')){
      tapCount++; clearTimeout(tapTimer);
      tapTimer=setTimeout(()=>{tapCount=0;},2000);
      if(tapCount>=5){
        tapCount=0;
        const cfg=getGHConfig();
        document.getElementById('gh-token').value=cfg.token||'';
        openSheet('sheet-admin');
      }
    }
  });

  // Submit/merge modals use sheets now
  // Override modal refs to use sheets
  document.getElementById('modal-dupcheck') || Object.defineProperty(document,'getElementById',{
    value: function(id){ return HTMLDocument.prototype.getElementById.call(this,id); }
  });

  // Keyboard save
  document.addEventListener('keydown',e=>{
    if((e.ctrlKey||e.metaKey)&&e.key==='s'){e.preventDefault();saveToStorage();showToast('Saved ✓','success');}
  });

  checkAndShowGate();
}

// Fix: dup check + submit use sheet IDs now
function getDupModal(){ return {
  style:{display:'none'},
  querySelector:(s)=>document.querySelector('#sheet-dupcheck '+s)
};}

// Patch modal refs for dup check to use sheet
const _origStartSubmit = startSubmitFlow;
async function startSubmitFlow(hymn){
  // redirect modal IDs to sheet IDs
  const oldGet = document.getElementById.bind(document);
  const patchedGet = (id)=>{
    if(id==='modal-dupcheck') return document.getElementById('sheet-dupcheck');
    if(id==='dupcheck-results') return document.getElementById('dupcheck-results');
    if(id==='dupcheck-submit') return document.getElementById('dupcheck-submit');
    if(id==='dupcheck-merge') return document.getElementById('dupcheck-merge');
    if(id==='modal-submitted') return document.getElementById('sheet-submitted');
    if(id==='submitted-msg') return document.getElementById('submitted-msg');
    if(id==='modal-token') return document.getElementById('sheet-token');
    return oldGet(id);
  };
  // Temporarily patch getElementById
  document.getElementById = patchedGet;
  await _origStartSubmit(hymn);
  document.getElementById = oldGet;
}

async function submitHymnToGitHub(){
  const oldGet = document.getElementById.bind(document);
  document.getElementById = (id)=>{
    if(id==='modal-dupcheck') return document.getElementById('sheet-dupcheck')||oldGet(id);
    if(id==='modal-submitted') return document.getElementById('sheet-submitted')||oldGet(id);
    if(id==='submitted-msg') return oldGet('submitted-msg');
    return oldGet(id);
  };
  // Call original logic inline
  document.getElementById = oldGet;

  const hymn=pendingSubmitHymn; if(!hymn)return;
  closeSheet('sheet-dupcheck');
  const cfg=getGHConfig(); const path=ghFilePath(cfg,hymn.groupKey);
  const exported=hymnToExport(hymn); const title=getHymnDisplayTitle(hymn);
  showToast('Submitting…');
  try{
    async function upsertInFile(filePath,hymnData){
      const existing=await ghGetFile(cfg,filePath); let arr=[],sha=null;
      if(existing){sha=existing.sha;const decoded=decodeURIComponent(escape(atob(existing.content.replace(/\n/g,''))));try{arr=JSON.parse(decoded);}catch(e){arr=[];}}
      const idx=arr.findIndex(h=>h.id===hymnData.id);
      if(idx>=0)arr[idx]=hymnData; else arr.push(hymnData);
      const msg=idx>=0?`Update: ${title}`:`Add: ${title}`;
      await ghPutFile(cfg,filePath,JSON.stringify(arr,null,2),sha,msg); return msg;
    }
    const commitMsg=await upsertInFile(path,exported);
    if(hymn.subgroup==='Mera'&&hymn.groupKey!=='Mera') await upsertInFile(ghFilePath(cfg,'Mera'),exported);
    hymn.status='final'; saveToStorage(); renderHymnList();
    if(activeHymn?.id===hymn.id) renderEditor();
    document.getElementById('submitted-msg').innerHTML=`<strong>${escHtml(title)}</strong> added to <code>${escHtml(path)}</code>`;
    openSheet('sheet-submitted');
  }catch(e){
    if(e.message.includes('401')){sessionStorage.removeItem(VOL_TOKEN_KEY);localStorage.removeItem(GH_KEYS.token);showToast('Token invalid (401) — tap Submit again','error');}
    else showToast(`Failed: ${e.message}`,'error');
  }
}

async function submitMergedHymn(){
  const hymn=pendingSubmitHymn; const target=pendingMergeTarget;
  if(!hymn||!target)return;
  closeSheet('sheet-dupcheck');
  const cfg=getGHConfig(); const path=ghFilePath(cfg,hymn.groupKey);
  const title=getHymnDisplayTitle(hymn);
  showToast('Merging languages…');
  try{
    const merged=mergeHymns(target,hymn);
    const fileData=await ghGetFile(cfg,path); let arr=[],sha=null;
    if(fileData){sha=fileData.sha;try{arr=JSON.parse(decodeURIComponent(escape(atob(fileData.content.replace(/\n/g,'')))));}catch(e){arr=[];}}
    const idx=arr.findIndex(h=>h.id===target.id);
    if(idx>=0)arr[idx]=merged; else arr.push(merged);
    const addedLangs=LANGS.filter(l=>!target.title?.[l]&&merged.title?.[l]);
    await ghPutFile(cfg,path,JSON.stringify(arr,null,2),sha,`Merge (${addedLangs.join(',')}): ${title}`);
    if(hymn.subgroup==='Mera'&&hymn.groupKey!=='Mera'){
      const mf=await ghGetFile(cfg,ghFilePath(cfg,'Mera')); let ma=[],ms=null;
      if(mf){ms=mf.sha;try{ma=JSON.parse(decodeURIComponent(escape(atob(mf.content.replace(/\n/g,'')))));}catch(e){}}
      const mi=ma.findIndex(h=>h.id===target.id); if(mi>=0)ma[mi]=merged; else ma.push(merged);
      await ghPutFile(cfg,ghFilePath(cfg,'Mera'),JSON.stringify(ma,null,2),ms,`Merge: ${title}`);
    }
    hymn.status='final'; saveToStorage(); renderHymnList();
    if(activeHymn?.id===hymn.id)renderEditor();
    const addedStr=addedLangs.length?addedLangs.join(', '):'languages';
    document.getElementById('submitted-msg').innerHTML=`Merged <strong>${escHtml(addedStr)}</strong> into <strong>${escHtml(title)}</strong>`;
    openSheet('sheet-submitted');
  }catch(e){
    if(e.message.includes('401')){sessionStorage.removeItem(VOL_TOKEN_KEY);localStorage.removeItem(GH_KEYS.token);showToast('Token invalid — tap Submit again','error');}
    else showToast(`Merge failed: ${e.message}`,'error');
  }
}

function promptVolunteerToken(onConfirm){
  if(getVolToken()){onConfirm(getVolToken());return;}
  pendingTokenCallback=onConfirm;
  openSheet('sheet-token');
  setTimeout(()=>document.getElementById('volunteer-token')?.focus(),200);
}

function copyHymnJSON(hymn){
  const json=JSON.stringify([hymnToExport(hymn)],null,2);
  navigator.clipboard?.writeText(json).then(()=>showToast('Copied ✓','success')).catch(()=>{
    document.getElementById('copy-json-textarea').value=json;
    openSheet('sheet-copy-json');
  })||( ()=>{document.getElementById('copy-json-textarea').value=json;openSheet('sheet-copy-json');} )();
}

document.addEventListener('DOMContentLoaded',init);
