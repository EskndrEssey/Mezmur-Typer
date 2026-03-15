/**
 * WAZEMA HYMN ENTRY TOOL · app.js v3
 *
 * REAL SCHEMA (from actual hymns.json):
 *   id          : string
 *   group       : { ti, am, en, om, ti_ro, am_ro, ro }  ← multilingual map
 *   title       : { ti, am, en, om, ti_ro, am_ro, ro }  ← multilingual map
 *   subtitle    : { ti, am, en, om, ti_ro, am_ro, ro }  ← multilingual map (optional)
 *   lyrics      : { ti, am, en, om, ti_ro, am_ro, ro }  ← multilingual map
 *   youtubeUrls : { ti, am, en, om, ti_ro, am_ro, ro }  ← per-language URLs (optional)
 *   color       : string (optional hex)
 *
 * HIGHLIGHT FORMAT (inline, not whole-line):
 *   [[highlight]]prefix text [[/highlight]]rest of line
 *   e.g. "[[highlight]]Praises of Mary [[/highlight]]in the morning prayers"
 *   The prefix is highlighted; the rest follows on the same line.
 *
 * INTERNAL VERSE MODEL:
 *   verse = { lines: [ { prefix, text } ] }
 *   prefix : string — the [[highlight]] portion (empty = no highlight on this line)
 *   text   : string — the remainder of the line after the highlight (or full line if no prefix)
 *
 * EXPORT — buildLyrics(ld):
 *   For each line:
 *     if prefix: "[[highlight]]prefix[[/highlight]]text"
 *     else:       "text"
 *   Verses separated by blank lines.
 *   Chorus: [[chorus]]...[[/chorus]] first, then after every verse.
 *
 * LOCALSTORAGE:
 *   'wazema_hymns'     → JSON array of all hymns
 *   'wazema_active_id' → currently selected hymn ID
 *   Autosave 400ms debounce after any change.
 */

'use strict';

const STORAGE_KEY   = 'wazema_hymns';
const ACTIVE_ID_KEY = 'wazema_active_id';

// All 7 language keys matching the real schema
const LANGS      = ['en','ti','ti_ro','am','am_ro','om','ro'];
const LANG_NAMES = {
  en:'English', ti:'Tigrinya', ti_ro:'Tigrinya (Romanized)',
  am:'Amharic', am_ro:'Amharic (Romanized)', om:'Oromo', ro:'Romanian'
};
const LANG_SHORT = {en:'EN',ti:'TI',ti_ro:'TI-R',am:'AM',am_ro:'AM-R',om:'OM',ro:'RO'};

const STATUS_OPTIONS = {draft:'Draft',review:'Needs Review',final:'Final'};

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

// STATE
let hymns=[], activeId=null, activeHymn=null, saveTimer=null, activeLang={};

// ═══════════════════════════════════════
//  DATA MODEL
// ═══════════════════════════════════════

function emptyLangMap(){ const m={}; LANGS.forEach(l=>m[l]=''); return m; }
function createLine(prefix='',text=''){ return {prefix,text}; }
function createVerse(){ return {lines:[createLine()]}; }

function createLangData(){
  return {
    groupName: '',    // per-language group name (e.g. "Mary" / "ማርያም")
    title:     '',
    subtitle:  '',
    chorus:    '',
    verses:    [],
    youtube:   '',    // per-language YouTube URL
  };
}

function createHymn(overrides={}){
  const id = overrides.id || generateId();
  const langs = {};
  LANGS.forEach(l => { langs[l] = createLangData(); });
  return {id, groupKey:'', subgroup:'', composer:'', singer:'', author:'', color:'', status:'draft', langs, ...overrides};
}
function generateId(){ return 'hymn_'+Date.now().toString(36)+Math.random().toString(36).slice(2,6); }

// ═══════════════════════════════════════
//  PERSISTENCE
// ═══════════════════════════════════════

function loadFromStorage(){
  try{
    const raw=localStorage.getItem(STORAGE_KEY);
    hymns=raw?JSON.parse(raw):[];
    activeId=localStorage.getItem(ACTIVE_ID_KEY)||null;
    hymns.forEach(migrateHymn);
  }catch(e){hymns=[];activeId=null;}
}

function migrateHymn(hymn){
  // Ensure all lang keys exist
  LANGS.forEach(l=>{
    if (!hymn.langs[l]) hymn.langs[l]=createLangData();
    const ld=hymn.langs[l];
    // Migrate old verses/blocks format
    if (!ld.verses) ld.verses=[];
    if (ld.blocks){
      ld.blocks.forEach(b=>{
        if (b.type==='verse') ld.verses.push({lines:b.text.split('\n').map(t=>createLine('',t))});
        else if (b.type==='highlight') ld.verses.push({lines:[createLine(b.text,'')]});
      });
      delete ld.blocks;
    }
    if (!ld.youtube) ld.youtube='';
    if (!ld.groupName) ld.groupName='';
  });
  if (!hymn.groupKey && hymn.group) hymn.groupKey = hymn.group;
  if (!hymn.zemari) hymn.zemari = hymn.singer||hymn.composer||hymn.author||'';
}

function saveToStorage(){ localStorage.setItem(STORAGE_KEY,JSON.stringify(hymns)); if(activeId)localStorage.setItem(ACTIVE_ID_KEY,activeId); }
function scheduleSave(){ clearTimeout(saveTimer); saveTimer=setTimeout(saveToStorage,400); }

// ═══════════════════════════════════════
//  EXPORT
// ═══════════════════════════════════════

/**
 * Build lyrics string for one language.
 * Lines with prefix: [[highlight]]prefix[[/highlight]]rest
 * Lines without: plain text
 * Chorus wraps [[chorus]]...[[/chorus]], placed first and after every verse.
 */
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
  closeExportMenu();
}

function exportByGroup(groupKey){
  const group=hymns.filter(h=>h.groupKey===groupKey);
  if (!group.length){showToast(`No hymns in group "${groupKey}"`,'error');closeExportMenu();return;}
  const data=group.map(hymnToExport);
  const filename=groupKey.replace(/[^a-zA-Z0-9_-]/g,'_')+'.json';
  downloadJSON(data,filename);
  showToast(`Exported ${data.length} hymn${data.length!==1?'s':''} from ${groupKey} \u2713`,'success');
  closeExportMenu();
}

function exportUngrouped(){
  const group=hymns.filter(h=>!h.groupKey);
  if (!group.length){showToast('No ungrouped hymns','error');closeExportMenu();return;}
  const data=group.map(hymnToExport);
  downloadJSON(data,'ungrouped.json');
  showToast(`Exported ${data.length} ungrouped hymn${data.length!==1?'s':''} \u2713`,'success');
  closeExportMenu();
}

function closeExportMenu(){
  document.getElementById('export-menu').style.display='none';
}

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

// ═══════════════════════════════════════
//  HELPERS
// ═══════════════════════════════════════

function getHymnDisplayTitle(h){
  for (const l of LANGS){ const t=h.langs[l]?.title?.trim(); if(t)return t; }
  return '(Untitled)';
}
function getActiveLang(id){return activeLang[id]||'en';}
function setActiveLang(id,lang){activeLang[id]=lang;}
function getSubgroupsForGroup(k){
  const subs = GROUP_TAXONOMY[k]?.subgroups||[];
  return subs; // array of {key, label} objects or empty
}
function getSubgroupLabel(sub, uiLang){
  if (typeof sub === 'string') return sub;
  return sub.label?.[uiLang] || sub.label?.en || sub.key || sub;
}
function getSubgroupKey(sub){
  if (typeof sub === 'string') return sub;
  return sub.key || sub;
}
function getGroupLabel(groupKey, uiLang){
  const g = GROUP_TAXONOMY[groupKey];
  if (!g) return groupKey;
  if (typeof g.label === 'string') return g.label;
  return g.label?.[uiLang] || g.label?.en || groupKey;
}

// ═══════════════════════════════════════
//  SIDEBAR
// ═══════════════════════════════════════

function getFilteredHymns(){
  const search  =(document.getElementById('search-input')?.value||'').toLowerCase();
  const group   =document.getElementById('filter-group')?.value||'';
  const subgroup=document.getElementById('filter-subgroup')?.value||'';
  const status  =document.getElementById('filter-status')?.value||'';
  return hymns.filter(h=>{
    const title=getHymnDisplayTitle(h).toLowerCase();
    if (search   &&!title.includes(search)&&!h.id.includes(search)) return false;
    if (group    &&h.groupKey!==group)       return false;
    if (subgroup &&h.subgroup!==subgroup)    return false;
    if (status   &&h.status!==status)        return false;
    return true;
  });
}

function renderHymnList(){
  const list=document.getElementById('hymn-list');
  const stats=document.getElementById('sidebar-stats');
  const groupSel=document.getElementById('filter-group');
  const sgSel=document.getElementById('filter-subgroup');
  const filtered=getFilteredHymns();

  const prevGroup=groupSel.value;
  groupSel.innerHTML='<option value="">All Groups</option>';
  ALL_GROUP_KEYS.forEach(k=>{
    const o=document.createElement('option');
    const g=GROUP_TAXONOMY[k];
    o.value=k;
    o.textContent=typeof g.label==='string'?g.label:(g.label?.en||k);
    if(k===prevGroup)o.selected=true;
    groupSel.appendChild(o);
  });

  const prevSG=sgSel.value;
  sgSel.innerHTML='<option value="">All Occasions</option>';
  const sgSource=groupSel.value?getSubgroupsForGroup(groupSel.value):[...new Set(hymns.map(h=>h.subgroup).filter(Boolean))].sort();
  sgSource.forEach(sg=>{
    const o=document.createElement('option'); o.value=sg; o.textContent=sg;
    if(sg===prevSG)o.selected=true; sgSel.appendChild(o);
  });

  stats.textContent=`${filtered.length} of ${hymns.length} hymn${hymns.length!==1?'s':''}`;
  list.innerHTML='';
  if (!filtered.length){list.innerHTML='<div style="padding:20px;text-align:center;color:var(--ink-faint);font-style:italic;font-size:13px">No hymns found</div>';return;}
  filtered.forEach(h=>{
    const item=document.createElement('div');
    item.className='hymn-item'+(h.id===activeId?' active':'');
    item.dataset.id=h.id;
    const gc=h.groupKey?`<span class="group-chip">${escHtml(h.groupKey)}</span>`:'';
    const sc=h.subgroup?`<span class="subgroup-chip">${escHtml(h.subgroup)}</span>`:'';
    const badge=`<span class="status-badge status-${h.status}">${STATUS_OPTIONS[h.status]||h.status}</span>`;
    item.innerHTML=`<div class="hymn-item-title">${escHtml(getHymnDisplayTitle(h))}</div><div class="hymn-item-meta">${gc}${sc}${badge}<span class="id-chip">${h.id.slice(0,10)}</span></div>`;
    item.addEventListener('click',()=>selectHymn(h.id));
    list.appendChild(item);
  });
}

// ═══════════════════════════════════════
//  SELECTION & RENDER
// ═══════════════════════════════════════

function selectHymn(id){activeId=id;activeHymn=hymns.find(h=>h.id===id)||null;localStorage.setItem(ACTIVE_ID_KEY,id);renderHymnList();renderEditor();}

function deselectHymn(){
  activeId=null;activeHymn=null;renderHymnList();
  const area=document.getElementById('editor-area');
  area.innerHTML='';area.appendChild(buildEmptyState());updatePreview();
}

function renderEditor(){
  const area=document.getElementById('editor-area');
  area.innerHTML='';
  if (!activeHymn){area.appendChild(buildEmptyState());updatePreview();return;}
  const wrapper=document.createElement('div');
  wrapper.className='hymn-editor';
  wrapper.innerHTML=buildEditorHTML(activeHymn);
  area.appendChild(wrapper);
  bindEditorEvents(wrapper,activeHymn);
  updatePreview();
}

function buildEmptyState(){
  const div=document.createElement('div');
  div.className='empty-state';
  div.innerHTML='<div class="empty-icon">\u266a</div><h2>No hymn selected</h2><p>Select a hymn from the list, or create a new one to begin.</p><button class="btn btn-primary" id="btn-new-hymn-empty">+ New Hymn</button>';
  div.querySelector('#btn-new-hymn-empty').addEventListener('click',addNewHymn);
  return div;
}

// ═══════════════════════════════════════
//  BUILD EDITOR HTML
// ═══════════════════════════════════════

function buildEditorHTML(hymn){
  const lang=getActiveLang(hymn.id);
  const tabs=LANGS.map(l=>`<button class="lang-tab${l===lang?' active':''}" data-lang="${l}">${LANG_NAMES[l]}</button>`).join('');

  // Category toggle buttons
  const catToggles = ALL_GROUP_KEYS.map(k=>{
    const g=GROUP_TAXONOMY[k];
    const lbl=typeof g.label==='string'?g.label:(g.label?.en||k);
    const isActive = hymn.groupKey===k;
    return `<button class="cat-toggle${isActive?' active':''}" data-cat="${k}">${escHtml(lbl)}</button>`;
  }).join('');

  // Subcategory toggle buttons (for selected group)
  const subToggles = buildSubToggleButtons(hymn.groupKey, hymn.subgroup, lang);

  const urlsHtml=(hymn.youtubeUrls&&hymn.youtubeUrls.length?hymn.youtubeUrls:['']).map((u,i)=>`
    <div class="url-row">
      <input type="url" class="field-input youtube-url-input" value="${escHtml(u)}" data-index="${i}" placeholder="https://youtube.com/watch?v=..." />
      <button class="btn-icon remove-url-btn" data-index="${i}" title="Remove">✕</button>
    </div>`).join('');

  return `
    <div class="editor-toolbar">
      <div class="editor-toolbar-left">
        <button class="btn btn-secondary btn-sm" id="btn-duplicate">⧉ Duplicate</button>
        <button class="btn btn-secondary btn-sm" id="btn-regen-id">↻ New ID</button>
        <div class="sep"></div>
        <select class="filter-select" id="meta-status" style="width:auto;padding:5px 10px">
          ${Object.entries(STATUS_OPTIONS).map(([k,v])=>`<option value="${k}"${hymn.status===k?' selected':''}>${v}</option>`).join('')}
        </select>
      </div>
      <div class="editor-toolbar-right">
        <button class="btn btn-copy-json btn-sm" id="btn-copy-json">⧉ Copy JSON</button>
        <button class="btn btn-submit btn-sm" id="btn-submit-hymn">✝ Submit</button>
        <button class="btn btn-danger btn-sm" id="btn-delete-hymn">✕ Delete</button>
      </div>
    </div>

    <!-- HYMN DETAILS -->
    <div class="section-block">
      <div class="section-header">
        <span>Hymn Details</span>
        <span class="id-chip">${escHtml(hymn.id)}</span>
      </div>
      <div class="section-body">

        <!-- CATEGORY TOGGLES -->
        <div class="cat-section">
          <span class="cat-label">Category</span>
          <div class="cat-toggles" id="cat-toggles">${catToggles}</div>
          <div class="sub-toggles" id="sub-toggles" style="${subToggles?'':'display:none'}">${subToggles}</div>
        </div>

        <div class="meta-grid" style="margin-top:12px">
          <div>
            <label class="field-label">Color (hex, optional)</label>
            <input type="text" class="field-input" id="meta-color" value="${escHtml(hymn.color||'')}" placeholder="#DB2777" />
          </div>
          <div>
            <label class="field-label">Zemari/t <span style="font-weight:400;text-transform:none;font-size:10px;color:var(--text3)">(Singer / Composer / Author)</span></label>
            <input type="text" class="field-input" id="meta-zemari" value="${escHtml(hymn.zemari||'')}" placeholder="Name" />
          </div>
        </div>
      </div>

      <div class="section-header" style="border-top:1px solid var(--border)">
        <span>YouTube Links (optional)</span>
        <button class="btn btn-secondary btn-sm" id="btn-add-url">+ Add URL</button>
      </div>
      <div class="section-body">
        <div class="url-list" id="url-list">${urlsHtml}</div>
      </div>
    </div>

    <!-- LYRICS -->
    <div class="section-block">
      <div class="section-header"><span>Lyrics by Language</span></div>
      <div class="lang-tabs">${tabs}</div>
      ${LANGS.map(l=>{
        const d=hymn.langs[l]||createLangData();
        return `
        <div class="lang-panel${l===lang?' active':''}" data-lang="${l}">
          <div class="lang-title-row">
            <div>
              <label class="field-label">Title (${LANG_SHORT[l]})</label>
              <input type="text" class="field-input lang-title" data-lang="${l}" value="${escHtml(d.title||'')}" placeholder="Hymn title" />
            </div>
            <div>
              <label class="field-label">Subtitle / Credits</label>
              <input type="text" class="field-input lang-subtitle" data-lang="${l}" value="${escHtml(d.subtitle||'')}" placeholder="Optional" />
            </div>
          </div>
          <div class="lang-youtube-row">
            <label class="field-label">YouTube URL (${LANG_SHORT[l]})</label>
            <input type="url" class="field-input lang-youtube" data-lang="${l}" value="${escHtml(d.youtube||'')}" placeholder="https://youtube.com/watch?v=..." />
          </div>

          <!-- CHORUS -->
          <div class="chorus-section">
            <div class="chorus-header">
              <div class="chorus-title">♪ Chorus / ኣዝ — type once</div>
              <div class="chorus-hint">Leave blank if no chorus</div>
            </div>
            <textarea class="chorus-textarea lang-chorus" data-lang="${l}" placeholder="Chorus / ኣዝ text here… it will automatically repeat after every verse.">${escHtml(d.chorus||'')}</textarea>
          </div>

          <!-- VERSES -->
          <div class="blocks-section">
            <div class="section-header"><span>Verses</span></div>
            <div class="blocks-toolbar">
              <button class="btn btn-secondary btn-sm add-verse-btn" data-lang="${l}">+ Verse / ስታንዛ</button>
              <button class="btn btn-secondary btn-sm dup-verse-btn" data-lang="${l}">⧉ Duplicate Last Verse</button>
            </div>
            <div class="highlight-hint">
              The <strong>gold prefix box</strong> on each line is for highlighted text (like <em>"Praises of Mary"</em>).
              Leave it empty for a plain line. Press <strong>Enter</strong> to add a new line.
            </div>
            <div class="blocks-list" id="verses-list-${l}">${buildVersesListHTML(d.verses||[])}</div>
          </div>
        </div>`;
      }).join('')}
    </div>`;
}

function buildSubToggleButtons(groupKey, selectedSub, uiLang='en'){
  const subs = getSubgroupsForGroup(groupKey);
  if (!subs.length) return '';
  return subs.map(sub=>{
    const key = getSubgroupKey(sub);
    const label = getSubgroupLabel(sub, uiLang);
    const isActive = selectedSub===key;
    return `<button class="sub-toggle${isActive?' active':''}" data-sub="${escHtml(key)}">${escHtml(label)}</button>`;
  }).join('');
}


function buildSubgroupOptions(groupKey, selectedSG, uiLang='en'){
  const subs = getSubgroupsForGroup(groupKey);
  if (!subs.length) return '';
  return subs.map(sub=>{
    const key = getSubgroupKey(sub);
    const label = getSubgroupLabel(sub, uiLang);
    return `<option value="${escHtml(key)}"${key===selectedSG?' selected':''}>${escHtml(label)}</option>`;
  }).join('');
}

// ═══════════════════════════════════════
//  VERSE & LINE HTML
// ═══════════════════════════════════════

function buildVersesListHTML(verses){
  if (!verses||verses.length===0) return '<div class="blocks-empty">No verses yet. Click \u201c+ Verse / \u1235\u1273\u1295\u12b3\u201d to start.</div>';
  return verses.map((v,vi)=>buildVerseCardHTML(v,vi,vi+1)).join('');
}

function buildVerseCardHTML(verse,vi,num){
  const linesHtml=(verse.lines||[]).map((line,li)=>buildLineRowHTML(line,vi,li)).join('');
  return `
    <div class="verse-card" data-vi="${vi}">
      <div class="verse-card-header">
        <div class="verse-label"><span class="drag-handle">\u2807</span>Verse ${num}</div>
        <div class="verse-actions">
          <button class="btn-icon verse-move-up" data-vi="${vi}">\u2191</button>
          <button class="btn-icon verse-move-down" data-vi="${vi}">\u2193</button>
          <button class="btn-icon verse-delete" data-vi="${vi}">\u2715</button>
        </div>
      </div>
      <div class="verse-lines" data-vi="${vi}">${linesHtml}</div>
      <button class="verse-add-line" data-vi="${vi}">+ Add line to this verse</button>
    </div>`;
}

function buildLineRowHTML(line,vi,li){
  const hasPrefix=!!(line.prefix||'').trim();
  return `
    <div class="line-row${hasPrefix?' has-prefix':''}" data-vi="${vi}" data-li="${li}">
      <div class="line-prefix-wrap">
        <span class="prefix-bracket" title="${hasPrefix?'Highlighted prefix':'No prefix — click to add'}">[[</span>
        <input type="text" class="line-prefix-input" data-vi="${vi}" data-li="${li}"
          value="${escHtml(line.prefix||'')}"
          placeholder="${hasPrefix?'':'prefix\u2026'}"
          title="Highlighted prefix text (leave empty for plain line)" />
        <span class="prefix-bracket">]]</span>
      </div>
      <textarea class="line-main-input" data-vi="${vi}" data-li="${li}" rows="1"
        placeholder="rest of line\u2026"
      >${escHtml(line.text||'')}</textarea>
      <button class="line-del-btn" data-vi="${vi}" data-li="${li}" title="Delete line">\u2715</button>
    </div>`;
}

// ═══════════════════════════════════════
//  EDITOR EVENT BINDING
// ═══════════════════════════════════════

function bindEditorEvents(wrapper,hymn){
  // Lang tabs
  wrapper.querySelectorAll('.lang-tab').forEach(tab=>{
    tab.addEventListener('click',()=>{
      const lang=tab.dataset.lang; setActiveLang(hymn.id,lang);
      wrapper.querySelectorAll('.lang-tab').forEach(t=>t.classList.remove('active')); tab.classList.add('active');
      wrapper.querySelectorAll('.lang-panel').forEach(p=>p.classList.toggle('active',p.dataset.lang===lang));
    });
  });

  // Category toggle buttons
  const catToggleContainer = wrapper.querySelector('#cat-toggles');
  const subToggleContainer = wrapper.querySelector('#sub-toggles');

  catToggleContainer?.addEventListener('click', e=>{
    const btn = e.target.closest('.cat-toggle');
    if (!btn) return;
    const key = btn.dataset.cat;
    hymn.groupKey = key;
    hymn.subgroup = '';
    // Update active states
    catToggleContainer.querySelectorAll('.cat-toggle').forEach(b=>b.classList.toggle('active', b.dataset.cat===key));
    // Rebuild sub-toggles
    const ul = getActiveLang(hymn.id);
    const subHtml = buildSubToggleButtons(key, '', ul);
    subToggleContainer.innerHTML = subHtml;
    subToggleContainer.style.display = subHtml ? '' : 'none';
    scheduleSave(); renderHymnList();
  });

  subToggleContainer?.addEventListener('click', e=>{
    const btn = e.target.closest('.sub-toggle');
    if (!btn) return;
    const key = btn.dataset.sub;
    // Allow toggling off
    hymn.subgroup = hymn.subgroup===key ? '' : key;
    subToggleContainer.querySelectorAll('.sub-toggle').forEach(b=>b.classList.toggle('active', b.dataset.sub===hymn.subgroup));
    scheduleSave(); renderHymnList();
  });

  bindInputField(wrapper,'#meta-color',  v=>hymn.color=v);
  bindInputField(wrapper,'#meta-zemari', v=>hymn.zemari=v);
  bindInputField(wrapper,'#meta-status',   v=>{hymn.status=v;renderHymnList();});
  bindInputField(wrapper,'#meta-status2',  v=>{hymn.status=v;renderHymnList();});



  // Per-language fields
  wrapper.querySelectorAll('.lang-groupname').forEach(el=>{
    el.addEventListener('input',()=>{hymn.langs[el.dataset.lang].groupName=el.value;scheduleSave();});
  });
  wrapper.querySelectorAll('.lang-title').forEach(el=>{
    el.addEventListener('input',()=>{hymn.langs[el.dataset.lang].title=el.value;scheduleSave();renderHymnList();updatePreview();});
  });
  wrapper.querySelectorAll('.lang-subtitle').forEach(el=>{
    el.addEventListener('input',()=>{hymn.langs[el.dataset.lang].subtitle=el.value;scheduleSave();});
  });
  wrapper.querySelectorAll('.lang-youtube').forEach(el=>{
    el.addEventListener('input',()=>{hymn.langs[el.dataset.lang].youtube=el.value;scheduleSave();});
  });
  wrapper.querySelectorAll('.lang-chorus').forEach(el=>{
    el.addEventListener('input',()=>{hymn.langs[el.dataset.lang].chorus=el.value;scheduleSave();updatePreview();});
  });

  // Verse controls
  LANGS.forEach(lang=>{
    const panel=wrapper.querySelector(`.lang-panel[data-lang="${lang}"]`); if(!panel)return;
    bindVerseControls(panel,hymn,lang,wrapper);
  });

  wrapper.querySelector('#btn-copy-json')?.addEventListener('click',()=>copyHymnJSON(hymn));
  wrapper.querySelector('#btn-duplicate')?.addEventListener('click',()=>duplicateHymn(hymn.id));
  wrapper.querySelector('#btn-regen-id')?.addEventListener('click',()=>regenId(hymn));
  wrapper.querySelector('#btn-delete-hymn')?.addEventListener('click',()=>confirmDeleteHymn(hymn.id));
  wrapper.querySelector('#btn-submit-hymn')?.addEventListener('click',()=>startSubmitFlow(hymn));
}

function bindInputField(wrapper,selector,setter){
  const el=wrapper.querySelector(selector); if(!el) return;
  const fn=()=>{setter(el.value);scheduleSave();}; el.addEventListener('input',fn); el.addEventListener('change',fn);
}

// ─── VERSE CONTROLS ──────────────────

function bindVerseControls(panel,hymn,lang,wrapper){
  panel.querySelector('.add-verse-btn')?.addEventListener('click',()=>{
    hymn.langs[lang].verses.push(createVerse()); scheduleSave(); refreshVersesList(wrapper,hymn,lang); updatePreview();
  });
  panel.querySelector('.dup-verse-btn')?.addEventListener('click',()=>{
    const vs=hymn.langs[lang].verses;
    if (!vs.length){showToast('No verses to duplicate.');return;}
    vs.push(JSON.parse(JSON.stringify(vs[vs.length-1])));
    scheduleSave(); refreshVersesList(wrapper,hymn,lang); updatePreview();
  });
  bindVersesListEvents(panel,hymn,lang,wrapper);
}

function bindVersesListEvents(panel,hymn,lang,wrapper){
  const list=panel.querySelector(`#verses-list-${lang}`); if(!list)return;

  // Prefix input changes
  list.addEventListener('input',e=>{
    const vi=parseInt(e.target.dataset.vi), li=parseInt(e.target.dataset.li);
    if (e.target.classList.contains('line-prefix-input')){
      hymn.langs[lang].verses[vi].lines[li].prefix=e.target.value;
      // Toggle has-prefix class
      const row=e.target.closest('.line-row');
      row.classList.toggle('has-prefix',!!e.target.value.trim());
      scheduleSave(); updatePreview();
    }
    if (e.target.classList.contains('line-main-input')){
      hymn.langs[lang].verses[vi].lines[li].text=e.target.value;
      autoResize(e.target); scheduleSave(); updatePreview();
    }
  });

  list.addEventListener('click',e=>{
    if (e.target.classList.contains('line-del-btn')){
      const vi=parseInt(e.target.dataset.vi),li=parseInt(e.target.dataset.li);
      const lines=hymn.langs[lang].verses[vi].lines;
      if (lines.length<=1){showToast('A verse needs at least one line.');return;}
      lines.splice(li,1); scheduleSave(); refreshVersesList(wrapper,hymn,lang); updatePreview(); return;
    }
    if (e.target.classList.contains('verse-add-line')){
      const vi=parseInt(e.target.dataset.vi);
      hymn.langs[lang].verses[vi].lines.push(createLine()); scheduleSave(); refreshVersesList(wrapper,hymn,lang); updatePreview(); return;
    }
    if (e.target.classList.contains('verse-move-up')){
      const vi=parseInt(e.target.dataset.vi),vs=hymn.langs[lang].verses;
      if (vi>0){[vs[vi-1],vs[vi]]=[vs[vi],vs[vi-1]];scheduleSave();refreshVersesList(wrapper,hymn,lang);updatePreview();} return;
    }
    if (e.target.classList.contains('verse-move-down')){
      const vi=parseInt(e.target.dataset.vi),vs=hymn.langs[lang].verses;
      if (vi<vs.length-1){[vs[vi],vs[vi+1]]=[vs[vi+1],vs[vi]];scheduleSave();refreshVersesList(wrapper,hymn,lang);updatePreview();} return;
    }
    if (e.target.classList.contains('verse-delete')){
      const vi=parseInt(e.target.dataset.vi);
      hymn.langs[lang].verses.splice(vi,1); scheduleSave(); refreshVersesList(wrapper,hymn,lang); updatePreview(); return;
    }
  });

  // Enter in main input → new line below
  list.addEventListener('keydown',e=>{
    if (e.key==='Enter'&&e.target.classList.contains('line-main-input')&&!e.shiftKey){
      e.preventDefault();
      const vi=parseInt(e.target.dataset.vi),li=parseInt(e.target.dataset.li);
      hymn.langs[lang].verses[vi].lines.splice(li+1,0,createLine());
      scheduleSave(); refreshVersesList(wrapper,hymn,lang); updatePreview();
      setTimeout(()=>{ const n=list.querySelector(`.line-main-input[data-vi="${vi}"][data-li="${li+1}"]`); if(n)n.focus(); },30);
    }
  });

  list.querySelectorAll('.line-main-input').forEach(autoResize);
}

function refreshVersesList(wrapper,hymn,lang){
  const list=wrapper.querySelector(`#verses-list-${lang}`); if(!list)return;
  list.innerHTML=buildVersesListHTML(hymn.langs[lang].verses||[]);
  const panel=wrapper.querySelector(`.lang-panel[data-lang="${lang}"]`);
  bindVersesListEvents(panel,hymn,lang,wrapper);
  list.querySelectorAll('.line-main-input').forEach(autoResize);
}

function autoResize(el){el.style.height='auto';el.style.height=el.scrollHeight+'px';}

// ═══════════════════════════════════════
//  LIVE PREVIEW
// ═══════════════════════════════════════

function updatePreview(){
  const body=document.getElementById('preview-body');
  const lang=document.getElementById('preview-lang-select')?.value||'en';
  if (!activeHymn){body.innerHTML='<p class="preview-placeholder">Preview will appear here as you type.</p>';return;}
  const ld=activeHymn.langs[lang]||{};
  const title=ld.title||getHymnDisplayTitle(activeHymn);
  const chorus=(ld.chorus||'').trim();
  const verses=ld.verses||[];
  let html=`<div class="preview-hymn-title">${escHtml(title)}</div>`;
  if (ld.subtitle) html+=`<div class="preview-hymn-sub">${escHtml(ld.subtitle)}</div>`;
  html+='<hr class="preview-divider">';
  const chorusHtml=chorus?`<div class="preview-chorus"><div class="preview-chorus-label">Chorus / ኣዝ</div>${nl2br(escHtml(chorus))}</div>`:'';
  const activeVerses=verses.filter(v=>v.lines&&v.lines.some(l=>(l.prefix||l.text||'').trim()));
  if (!chorus&&activeVerses.length===0){html+='<p class="preview-placeholder" style="margin-top:0">Start typing to see preview\u2026</p>';body.innerHTML=html;return;}
  if (chorusHtml) html+=chorusHtml;
  activeVerses.forEach((verse,vi)=>{
    const linesHtml=verse.lines.map(line=>{
      const prefix=(line.prefix||'').trim();
      const text=line.text||'';
      if (!prefix&&!text.trim()) return '';
      if (prefix) return `<span class="preview-line-prefix">${escHtml(prefix)}</span> ${escHtml(text)}`;
      return escHtml(text);
    }).filter(Boolean).join('<br>');
    if (linesHtml){
      html+=`<div class="preview-verse"><div class="preview-verse-label">Verse / ስታንዛ ${vi+1}</div>${linesHtml}</div>`;
      if (chorusHtml) html+=chorusHtml;
    }
  });
  body.innerHTML=html;
}

// ═══════════════════════════════════════
//  HYMN OPERATIONS
// ═══════════════════════════════════════

function addNewHymn(){const h=createHymn();hymns.unshift(h);saveToStorage();renderHymnList();selectHymn(h.id);showToast('New hymn created \u2713','success');}

function duplicateHymn(id){
  const orig=hymns.find(h=>h.id===id); if(!orig)return;
  const copy=JSON.parse(JSON.stringify(orig)); copy.id=generateId(); copy.status='draft';
  LANGS.forEach(l=>{if(copy.langs[l]?.title)copy.langs[l].title+=' (Copy)';});
  hymns.splice(hymns.findIndex(h=>h.id===id)+1,0,copy);
  saveToStorage();renderHymnList();selectHymn(copy.id);showToast('Hymn duplicated \u2713','success');
}

function regenId(hymn){hymn.id=generateId();activeId=hymn.id;localStorage.setItem(ACTIVE_ID_KEY,hymn.id);saveToStorage();renderHymnList();renderEditor();showToast('New ID generated \u2713');}

function confirmDeleteHymn(id){
  const hymn=hymns.find(h=>h.id===id);
  showDeleteModal(`Delete "${getHymnDisplayTitle(hymn)}"? This cannot be undone.`,()=>{hymns=hymns.filter(h=>h.id!==id);saveToStorage();deselectHymn();renderHymnList();showToast('Hymn deleted.','error');});
}

// ═══════════════════════════════════════
//  MODALS
// ═══════════════════════════════════════

function showConflictModal(msg,onKeep,onReplace,onCopy){
  const modal=document.getElementById('modal-conflict');
  document.getElementById('conflict-msg').textContent=msg; modal.style.display='flex';
  const close=()=>{modal.style.display='none';};
  document.getElementById('conflict-keep').onclick   =()=>{close();onKeep();};
  document.getElementById('conflict-replace').onclick=()=>{close();onReplace();};
  document.getElementById('conflict-copy').onclick   =()=>{close();onCopy();};
}
function showDeleteModal(msg,onConfirm){
  const modal=document.getElementById('modal-delete');
  document.getElementById('delete-msg').textContent=msg; modal.style.display='flex';
  const close=()=>{modal.style.display='none';};
  document.getElementById('delete-cancel').onclick =close;
  document.getElementById('delete-confirm').onclick=()=>{close();onConfirm();};
}

// TOAST
let toastTimer;
function showToast(msg,type=''){
  const t=document.getElementById('toast');
  t.textContent=msg; t.className='toast'+(type?` ${type}`:'')+' visible';
  clearTimeout(toastTimer); toastTimer=setTimeout(()=>t.classList.remove('visible'),2800);
}

// UTILS
function escHtml(str){if(!str)return '';return String(str).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');}
function nl2br(str){return str.replace(/\n/g,'<br>');}




// ═══════════════════════════════════════
//  COPY JSON
// ═══════════════════════════════════════

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

// ═══════════════════════════════════════
//  VOLUNTEER TOKEN FLOW
// ═══════════════════════════════════════

function getVolToken(){
  // Use volunteer's session token if set, else fall back to admin token
  return sessionStorage.getItem(VOL_TOKEN_KEY) || getGHConfig().token || '';
}

function setVolToken(t){ sessionStorage.setItem(VOL_TOKEN_KEY, t); }

let pendingTokenCallback = null;

function promptVolunteerToken(onConfirm){
  // If token already available this session, skip prompt
  if (getVolToken()){
    onConfirm(getVolToken());
    return;
  }
  pendingTokenCallback = onConfirm;
  document.getElementById('modal-token').style.display='flex';
  setTimeout(()=>document.getElementById('volunteer-token').focus(),150);
}

function confirmVolunteerToken(){
  const t = document.getElementById('volunteer-token').value.trim();
  if (!t){ showToast('Please paste your token.','error'); return; }
  setVolToken(t);
  document.getElementById('modal-token').style.display='none';
  document.getElementById('volunteer-token').value='';
  if (pendingTokenCallback){ pendingTokenCallback(t); pendingTokenCallback=null; }
}

// ═══════════════════════════════════════
//  GITHUB SETTINGS
// ═══════════════════════════════════════

const GH_KEYS = {owner:'wz_gh_owner',repo:'wz_gh_repo',branch:'wz_gh_branch',token:'wz_gh_token',folder:'wz_gh_folder',volpass:'wz_vol_pass'};
const SESSION_KEY = 'wz_session_ok';
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
  return sessionStorage.getItem(SESSION_KEY)==='1';
}

function checkPasswordGate(){
  const cfg=getGHConfig();
  if (!cfg.volpass || isSessionActive()){
    hideLanding();
    return;
  }
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
  const cfg=getGHConfig();
  const entered=document.getElementById('gate-password').value;
  const errEl=document.getElementById('gate-error');
  if (!cfg.volpass || entered===cfg.volpass){
    sessionStorage.setItem(SESSION_KEY,'1');
    hideLanding();
    errEl.style.display='none';
    document.getElementById('gate-password').value='';
  } else {
    errEl.style.display='block';
    document.getElementById('gate-password').value='';
    document.getElementById('gate-password').focus();
    // Shake animation
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
    results.innerHTML = `<div class="dupcheck-error">✕ Could not search GitHub: ${escHtml(e.message)}</div>`;
    submitBtn.style.display = 'inline-flex';
    submitBtn.textContent   = '✝ Submit Anyway';
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
    showToast(`Merge failed: ${e.message}`,'error');
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
    showToast(`Submit failed: ${e.message}`,'error');
  }
}

// Simple Levenshtein for duplicate fuzzy matching
function levenshtein(a,b){
  const m=a.length,n=b.length;
  const dp=Array.from({length:m+1},(_,i)=>Array.from({length:n+1},(_,j)=>i===0?j:j===0?i:0));
  for(let i=1;i<=m;i++) for(let j=1;j<=n;j++)
    dp[i][j]=a[i-1]===b[j-1]?dp[i-1][j-1]:1+Math.min(dp[i-1][j],dp[i][j-1],dp[i-1][j-1]);
  return dp[m][n];
}

// ═══════════════════════════════════════
//  INIT
// ═══════════════════════════════════════

function init(){
  loadFromStorage();
  document.getElementById('filter-group').addEventListener('change',()=>{document.getElementById('filter-subgroup').value='';renderHymnList();});
  renderHymnList();
  if (activeId&&hymns.find(h=>h.id===activeId)){activeHymn=hymns.find(h=>h.id===activeId);renderEditor();}
  else updatePreview();

  document.getElementById('btn-new-hymn').addEventListener('click',addNewHymn);
  document.getElementById('btn-admin-panel').addEventListener('click',()=>{
    // Admin panel needs a secret knock: triple-click or just open directly
    // You can protect this with admin password later if needed
    openAdminPanel();
  });
  document.getElementById('btn-export-toggle').addEventListener('click',(e)=>{
    e.stopPropagation();
    const menu=document.getElementById('export-menu');
    const isOpen=menu.style.display!=='none';
    if (!isOpen){ buildExportGroupList(); menu.style.display='block'; }
    else menu.style.display='none';
  });
  document.getElementById('btn-export-all').addEventListener('click',exportAllHymns);
  document.addEventListener('click',()=>closeExportMenu());
  document.getElementById('export-menu')?.addEventListener('click',e=>e.stopPropagation());
  document.getElementById('btn-import').addEventListener('click',()=>document.getElementById('file-import-input').click());
  document.getElementById('file-import-input').addEventListener('change',function(){
    const file=this.files[0]; if(!file)return;
    const reader=new FileReader(); reader.onload=e=>{importFromJSON(e.target.result);this.value='';};
    reader.readAsText(file);
  });

  document.getElementById('search-input').addEventListener('input',renderHymnList);
  document.getElementById('filter-subgroup').addEventListener('change',renderHymnList);
  document.getElementById('filter-status').addEventListener('change',renderHymnList);
  document.getElementById('preview-lang-select').addEventListener('change',updatePreview);

  // GitHub modal buttons
  document.getElementById('gh-cancel').addEventListener('click',closeAdminPanel);
  document.getElementById('token-cancel').addEventListener('click',()=>{document.getElementById('modal-token').style.display='none';pendingTokenCallback=null;});
  document.getElementById('copy-json-close')?.addEventListener('click',()=>{document.getElementById('modal-copy-json').style.display='none';});
  document.getElementById('modal-copy-json')?.addEventListener('click',function(e){if(e.target===this)this.style.display='none';});
  document.getElementById('copy-json-copy-btn')?.addEventListener('click',()=>{
    const ta=document.getElementById('copy-json-textarea');
    ta.select(); document.execCommand('copy');
    showToast('Copied ✓','success');
  });
  document.getElementById('token-confirm').addEventListener('click',confirmVolunteerToken);
  document.getElementById('volunteer-token')?.addEventListener('keydown',e=>{if(e.key==='Enter')confirmVolunteerToken();});
  document.getElementById('modal-token').addEventListener('click',function(e){if(e.target===this){this.style.display='none';pendingTokenCallback=null;}});
  document.getElementById('gh-save').addEventListener('click',()=>{
    const cfg={
      owner:document.getElementById('gh-owner').value.trim(),
      repo:document.getElementById('gh-repo').value.trim(),
      branch:document.getElementById('gh-branch').value.trim()||'main',
      token:document.getElementById('gh-token').value.trim(),
      folder:document.getElementById('gh-folder').value.trim(),
    };
    saveGHConfig(cfg); closeAdminPanel();
    showToast('GitHub settings saved ✓','success');
    updateGHStatusIndicator();
  });
  document.getElementById('gh-test').addEventListener('click',testGHConnection);
  document.getElementById('gh-init-files').addEventListener('click',initializeGitHubFiles);
  document.getElementById('modal-github').addEventListener('click',function(e){if(e.target===this)closeAdminPanel();});

  // Dup check modal
  document.getElementById('dupcheck-cancel').addEventListener('click',()=>{document.getElementById('modal-dupcheck').style.display='none';});
  document.getElementById('dupcheck-merge').addEventListener('click', submitMergedHymn);
  document.getElementById('dupcheck-submit').addEventListener('click',submitHymnToGitHub);
  document.getElementById('modal-dupcheck').addEventListener('click',function(e){if(e.target===this)this.style.display='none';});

  // Submitted modal
  document.getElementById('submitted-ok').addEventListener('click',()=>{document.getElementById('modal-submitted').style.display='none';});
  document.getElementById('modal-submitted').addEventListener('click',function(e){if(e.target===this)this.style.display='none';});

  document.getElementById('modal-conflict').addEventListener('click',function(e){if(e.target===this)this.style.display='none';});
  document.getElementById('modal-delete').addEventListener('click',function(e){if(e.target===this)this.style.display='none';});

  document.addEventListener('keydown',e=>{
    if ((e.ctrlKey||e.metaKey)&&e.key==='s'){e.preventDefault();saveToStorage();showToast('Saved \u2713','success');}
  });
}
function updateGHStatusIndicator(){
  const btn=document.getElementById('btn-admin-panel');
  if (!btn) return;
  if (isGHConfigured()){
    btn.textContent='⚙ Admin ✓';
    btn.style.borderColor='rgba(61,107,78,.5)';
    btn.style.color='#a8d5b5';
  } else {
    btn.textContent='⚙ Admin';
    btn.style.borderColor='';
    btn.style.color='';
  }
}

document.addEventListener('DOMContentLoaded',()=>{
  init();
  updateGHStatusIndicator();
  checkPasswordGate();

  // Password gate submit
  document.getElementById('gate-submit').addEventListener('click', submitPasswordGate);
  document.getElementById('gate-password').addEventListener('keydown', e=>{
    if (e.key==='Enter') submitPasswordGate();
  });
});
