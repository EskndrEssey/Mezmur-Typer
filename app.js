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

  // ── ማርያም ─────────────────────────────────────────────────────
  'Mariam': {
    label: 'ማርያም · Mariam (St. Mary)',
    subgroups: [
      'ልደታ ለማርያም / Lideta le-Mariam',
      'ኪዳነ ምሕረት / Kidane Mehret',
      'ፍልሰታ / Filseta (Assumption)',
      'ስደት ማርያም - ወርሒ ጹጌ / Sdet Mariam',
      'ትሶመ ማርያም / Tsome Mariam',
      'ጠቅላላ / General',
    ]
  },

  // ── ቅዱሳን ──────────────────────────────────────────────────────
  'Michael': {
    label: 'ቅዱስ ሚካኤል · St. Michael',
    subgroups: ['ጠቅላላ / General', 'Monthly Feast']
  },

  'Gabriel': {
    label: 'ቅዱስ ገብርኤል · St. Gabriel',
    subgroups: ['ጠቅላላ / General', 'Monthly Feast']
  },

  'Giorgis': {
    label: 'ቅዱስ ጊዮርጊስ · St. George',
    subgroups: ['ጠቅላላ / General', 'Monthly Feast']
  },

  'TekleHaymanot': {
    label: 'ኣቡነ ተክለ ሃይማኖት · Abune Tekle Haymanot',
    subgroups: ['ጠቅላላ / General']
  },

  'Yohannes': {
    label: 'ቅዱስ ዮሓንስ · St. John (Yohannes)',
    subgroups: ['ጠቅላላ / General']
  },

  'Saints': {
    label: 'ቅዱሳን · Other Saints & Angels',
    subgroups: ['ጠቅላላ / General', 'Angels / መላእክት', 'St. Yared / ቅዱስ ያሬድ']
  },

  // ── እግዚኣብሔር / Church Feasts ─────────────────────────────────
  'Egziabher': {
    label: 'እግዚኣብሔር · Egziabher (God)',
    subgroups: [
      'ጠቅላላ ምስጋና / General Praise',
      'ልደት / Lidet (Christmas)',
      'ጥምቀት / Timket (Epiphany)',
      'ሆሳዕና / Hosanna (Palm Sunday)',
      'ስቅለት / Siglet (Good Friday)',
      'ትንሣኤ / Tinsae (Easter)',
      'ዕርጋት / Erget (Ascension)',
      'ጰንጠቆስጤ / Pentecost',
      'ደብረ ታቦር / Debre Tabor (Transfiguration)',
      'ክብረ ታቦት / Kibre Tabot',
      'መድኃኔ ዓለም / Medhane Alem',
      'ፋሲካ / Fasika',
      'ጳጉሜን / Pagumen',
      'ዘወትር / Zewetr (Everyday)',
    ]
  },

  // ── ነፍሳዊ / Spiritual ─────────────────────────────────────────
  'Spiritual': {
    label: 'ነፍሳዊ · Spiritual / Penitential',
    subgroups: [
      'ንስሓ / Nissha (Repentance)',
      'ሥሳሴ / Sillase (Trinity)',
      'ጾም / Tsom (Fasting / Lent)',
      'ቅዳሴ / Qidase (Liturgy)',
      'ዘወትር / Everyday Devotion',
    ]
  },

  // ── መስቀል ─────────────────────────────────────────────────────
  'Meskel': {
    label: 'መስቀል · Meskel (Finding of the True Cross)',
    subgroups: ['ጠቅላላ / General']
  },

  // ── ሰርግ / Wedding ────────────────────────────────────────────
  'Wedding': {
    label: 'ሰርግ / መርዓ · Wedding',
    subgroups: [
      'መርዓ / Mera (Wedding ceremony)',
      'ቅድስና / Qidisna (Blessing)',
      'ሰርግ ዘፈን / Wedding songs',
      'ጠቅላላ / General',
    ]
  },

  // ── ቀብሪ / Funeral ────────────────────────────────────────────
  'Funeral': {
    label: 'ቀብሪ · Funeral',
    subgroups: ['ጠቅላላ / General']
  },

  // ── ጠቅላላ ─────────────────────────────────────────────────────
  'Morning': {
    label: 'ጸሎተ ንጋት · Morning Prayer',
    subgroups: ['Morning Praise', 'Lauds']
  },

  'Evening': {
    label: 'ጸሎተ ሠርክ · Evening Prayer',
    subgroups: ['Evening Praise', 'Vespers']
  },

  'General': {
    label: 'ጠቅላላ · General',
    subgroups: ['Praise & Worship', 'Youth / ወጣት', 'Children / ሕፃናት', 'Other']
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
  ['composer','singer','author'].forEach(f=>{ if(hymn[f]&&hymn[f].trim())out[f]=hymn[f].trim(); });
  if (hymn.color&&hymn.color.trim()) out.color=hymn.color.trim();
  if (hymn.subgroup&&hymn.subgroup.trim()) out.subgroup=hymn.subgroup.trim();

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
function getSubgroupsForGroup(k){return GROUP_TAXONOMY[k]?.subgroups||[];}

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
    o.value=k; o.textContent=GROUP_TAXONOMY[k].label;
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
  const groupOptions=ALL_GROUP_KEYS.map(k=>`<option value="${k}"${hymn.groupKey===k?' selected':''}>${escHtml(GROUP_TAXONOMY[k].label)}</option>`).join('');
  const subgroupOptions=buildSubgroupOptions(hymn.groupKey,hymn.subgroup);

  return `
    <div class="editor-toolbar">
      <div class="editor-toolbar-left">
        <button class="btn btn-secondary btn-sm" id="btn-duplicate">\u29c9 Duplicate</button>
        <button class="btn btn-secondary btn-sm" id="btn-regen-id">\u21bb New ID</button>
        <div class="sep"></div>
        <select class="filter-select" id="meta-status" style="width:auto;padding:5px 10px">
          ${Object.entries(STATUS_OPTIONS).map(([k,v])=>`<option value="${k}"${hymn.status===k?' selected':''}>${v}</option>`).join('')}
        </select>
      </div>
      <div class="editor-toolbar-right">
        <button class="btn btn-submit btn-sm" id="btn-submit-hymn">\u271d Submit to GitHub</button>
        <button class="btn btn-danger btn-sm" id="btn-delete-hymn">\u2715 Delete</button>
      </div>
    </div>

    <!-- HYMN DETAILS -->
    <div class="section-block">
      <div class="section-header">
        <span><span class="section-header-icon">\ud83d\udccb</span>Hymn Details</span>
        <span class="id-chip">${escHtml(hymn.id)}</span>
      </div>
      <div class="section-body">
        <div class="meta-grid">
          <div>
            <label class="field-label">Group Category</label>
            <select class="field-select" id="meta-group">
              <option value="">\u2014 Select group \u2014</option>
              ${groupOptions}
            </select>
          </div>
          <div>
            <label class="field-label">Occasion / Sub-group</label>
            <select class="field-select" id="meta-subgroup">
              <option value="">\u2014 Select occasion \u2014</option>
              ${subgroupOptions}
            </select>
          </div>
          <div>
            <label class="field-label">Color (hex, optional)</label>
            <input type="text" class="field-input" id="meta-color" value="${escHtml(hymn.color||'')}" placeholder="#DB2777" />
          </div>
          <div>
            <label class="field-label">Status</label>
            <select class="field-select" id="meta-status2">
              ${Object.entries(STATUS_OPTIONS).map(([k,v])=>`<option value="${k}"${hymn.status===k?' selected':''}>${v}</option>`).join('')}
            </select>
          </div>
        </div>
        <button class="optional-fields-toggle" id="toggle-optional">\u25b8 Show composer / singer / author</button>
        <div class="optional-fields" id="optional-fields">
          <div class="meta-third" style="margin-top:12px">
            <div><label class="field-label">Composer</label><input type="text" class="field-input" id="meta-composer" value="${escHtml(hymn.composer||'')}" placeholder="Name" /></div>
            <div><label class="field-label">Singer</label><input type="text" class="field-input" id="meta-singer" value="${escHtml(hymn.singer||'')}" placeholder="Name" /></div>
            <div><label class="field-label">Author</label><input type="text" class="field-input" id="meta-author" value="${escHtml(hymn.author||'')}" placeholder="Name" /></div>
          </div>
        </div>
      </div>
    </div>

    <!-- LYRICS BY LANGUAGE -->
    <div class="section-block">
      <div class="section-header"><span><span class="section-header-icon">\ud83c\udf10</span>Lyrics by Language</span></div>
      <div class="lang-tabs">${tabs}</div>
      ${LANGS.map(l=>{
        const d=hymn.langs[l]||createLangData();
        return `
        <div class="lang-panel${l===lang?' active':''}" data-lang="${l}">
          <!-- Per-language fields row -->
          <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:10px;margin-bottom:14px">
            <div>
              <label class="field-label">Group Name (${LANG_SHORT[l]})</label>
              <input type="text" class="field-input lang-groupname" data-lang="${l}" value="${escHtml(d.groupName||'')}" placeholder="e.g. Mary / ማርያም" />
            </div>
            <div>
              <label class="field-label">Title (${LANG_SHORT[l]})</label>
              <input type="text" class="field-input lang-title" data-lang="${l}" value="${escHtml(d.title||'')}" placeholder="Hymn title" />
            </div>
            <div>
              <label class="field-label">Subtitle (${LANG_SHORT[l]})</label>
              <input type="text" class="field-input lang-subtitle" data-lang="${l}" value="${escHtml(d.subtitle||'')}" placeholder="Optional" />
            </div>
          </div>
          <!-- YouTube URL for this language -->
          <div style="margin-bottom:14px">
            <label class="field-label">YouTube URL (${LANG_SHORT[l]}) — optional</label>
            <input type="url" class="field-input lang-youtube" data-lang="${l}" value="${escHtml(d.youtube||'')}" placeholder="https://youtube.com/watch?v=..." />
          </div>

          <!-- CHORUS -->
          <div class="chorus-section">
            <div class="chorus-header">
              <div class="chorus-title">\u266a Chorus \u2014 type once only</div>
              <div class="chorus-hint">Leave blank if no chorus</div>
            </div>
            <textarea class="chorus-textarea lang-chorus" data-lang="${l}" placeholder="Type the chorus here. It will be placed automatically after every verse on export.">${escHtml(d.chorus||'')}</textarea>
          </div>

          <!-- VERSES -->
          <div class="blocks-section">
            <div class="section-header"><span><span class="section-header-icon">\ud83d\udcdd</span>Verses</span></div>
            <div class="blocks-toolbar">
              <button class="btn btn-secondary btn-sm add-verse-btn" data-lang="${l}">+ Add Verse</button>
              <button class="btn btn-secondary btn-sm dup-verse-btn" data-lang="${l}">\u29c9 Duplicate Last</button>
            </div>
            <div class="highlight-hint">
              <strong>\u2605 Inline highlights:</strong> Each line can start with a highlighted prefix (like <em>"Praises of Mary"</em>).
              Type the <strong>highlighted prefix</strong> in the gold box, then the rest of the line after it.
              Leave prefix empty for a plain line. Press <strong>Enter</strong> to add a new line.
            </div>
            <div class="blocks-list" id="verses-list-${l}">${buildVersesListHTML(d.verses||[])}</div>
          </div>
        </div>`;
      }).join('')}
    </div>`;
}

function buildSubgroupOptions(groupKey,selectedSG){
  return getSubgroupsForGroup(groupKey).map(sg=>`<option value="${escHtml(sg)}"${sg===selectedSG?' selected':''}>${escHtml(sg)}</option>`).join('');
}

// ═══════════════════════════════════════
//  VERSE & LINE HTML
// ═══════════════════════════════════════

function buildVersesListHTML(verses){
  if (!verses||verses.length===0) return '<div class="blocks-empty">No verses yet. Click \u201c+ Add Verse\u201d to start.</div>';
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

  // Group / subgroup
  const groupSel=wrapper.querySelector('#meta-group');
  const sgSel   =wrapper.querySelector('#meta-subgroup');
  groupSel?.addEventListener('change',()=>{
    hymn.groupKey=groupSel.value; hymn.subgroup='';
    sgSel.innerHTML='<option value="">\u2014 Select occasion \u2014</option>'+buildSubgroupOptions(hymn.groupKey,'');
    scheduleSave(); renderHymnList();
  });
  sgSel?.addEventListener('change',()=>{hymn.subgroup=sgSel.value;scheduleSave();renderHymnList();});

  bindInputField(wrapper,'#meta-color',    v=>hymn.color=v);
  bindInputField(wrapper,'#meta-composer', v=>hymn.composer=v);
  bindInputField(wrapper,'#meta-singer',   v=>hymn.singer=v);
  bindInputField(wrapper,'#meta-author',   v=>hymn.author=v);
  bindInputField(wrapper,'#meta-status',   v=>{hymn.status=v;renderHymnList();});
  bindInputField(wrapper,'#meta-status2',  v=>{hymn.status=v;renderHymnList();});

  wrapper.querySelector('#toggle-optional')?.addEventListener('click',function(){
    const of=wrapper.querySelector('#optional-fields');of.classList.toggle('open');
    this.textContent=of.classList.contains('open')?'\u25be Hide extra fields':'\u25b8 Show composer / singer / author';
  });

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
  const chorusHtml=chorus?`<div class="preview-chorus"><div class="preview-chorus-label">Chorus</div>${nl2br(escHtml(chorus))}</div>`:'';
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
      html+=`<div class="preview-verse"><div class="preview-verse-label">Verse ${vi+1}</div>${linesHtml}</div>`;
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
//  GITHUB SETTINGS
// ═══════════════════════════════════════

const GH_KEYS = {owner:'wz_gh_owner',repo:'wz_gh_repo',branch:'wz_gh_branch',token:'wz_gh_token',folder:'wz_gh_folder'};

function getGHConfig(){
  return {
    owner:  localStorage.getItem(GH_KEYS.owner)||'',
    repo:   localStorage.getItem(GH_KEYS.repo)||'',
    branch: localStorage.getItem(GH_KEYS.branch)||'main',
    token:  localStorage.getItem(GH_KEYS.token)||'',
    folder: localStorage.getItem(GH_KEYS.folder)||'',
  };
}

function saveGHConfig(cfg){
  Object.keys(GH_KEYS).forEach(k=>localStorage.setItem(GH_KEYS[k], cfg[k]||''));
}

function isGHConfigured(){
  const cfg=getGHConfig();
  return !!(cfg.owner && cfg.repo && cfg.token);
}

function openGithubSettings(){
  const cfg=getGHConfig();
  document.getElementById('gh-owner').value  = cfg.owner;
  document.getElementById('gh-repo').value   = cfg.repo;
  document.getElementById('gh-branch').value = cfg.branch||'main';
  document.getElementById('gh-token').value  = cfg.token;
  document.getElementById('gh-folder').value = cfg.folder;
  document.getElementById('modal-github').style.display='flex';
}

function closeGithubSettings(){
  document.getElementById('modal-github').style.display='none';
}

async function testGHConnection(){
  const cfg = {
    owner:  document.getElementById('gh-owner').value.trim(),
    repo:   document.getElementById('gh-repo').value.trim(),
    branch: document.getElementById('gh-branch').value.trim()||'main',
    token:  document.getElementById('gh-token').value.trim(),
    folder: document.getElementById('gh-folder').value.trim(),
  };
  if (!cfg.owner||!cfg.repo||!cfg.token){showToast('Fill in username, repo, and token first.','error');return;}
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
  // Use clean filename — groupKey is already a clean key like 'Mariam', 'Egziabher' etc.
  const filename = (groupKey||'ungrouped')+'.json';
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

async function startSubmitFlow(hymn){
  if (!isGHConfigured()){
    showToast('Set up GitHub connection first (⚙ GitHub button).','error');
    openGithubSettings();
    return;
  }
  // Validate — needs at least one title
  const hasTitle = LANGS.some(l=>(hymn.langs[l]?.title||'').trim());
  if (!hasTitle){showToast('Add at least one title before submitting.','error');return;}

  pendingSubmitHymn = hymn;

  // Search for duplicates in GitHub repo
  const modal=document.getElementById('modal-dupcheck');
  const results=document.getElementById('dupcheck-results');
  const submitBtn=document.getElementById('dupcheck-submit');
  results.innerHTML='<div class="dupcheck-loading"><span class="cross-spin">✝</span> Searching GitHub for similar hymns…</div>';
  submitBtn.style.display='none';
  modal.style.display='flex';

  try{
    const cfg=getGHConfig();
    const path=ghFilePath(cfg, hymn.groupKey);
    const existing=await ghGetFile(cfg, path);
    const displayTitle=getHymnDisplayTitle(hymn).toLowerCase();

    if (!existing){
      results.innerHTML=`<div class="dupcheck-clear"><span style="color:var(--green);font-size:20px">✓</span> No existing file for this group yet. This will create <strong>${path}</strong>.</div>`;
      submitBtn.style.display='inline-flex';
      return;
    }

    // Decode existing JSON
    const decoded=decodeURIComponent(escape(atob(existing.content.replace(/\n/g,''))));
    let existingHymns=[];
    try{existingHymns=JSON.parse(decoded);}catch(e){}

    // Find similar titles
    const matches=existingHymns.filter(h=>{
      if (!h.title) return false;
      const titles=typeof h.title==='object'?Object.values(h.title):[h.title];
      return titles.some(t=>{
        if (!t) return false;
        const tl=t.toLowerCase();
        return tl.includes(displayTitle)||displayTitle.includes(tl)||levenshtein(tl,displayTitle)<4;
      });
    });

    if (matches.length===0){
      results.innerHTML=`<div class="dupcheck-clear"><span style="color:var(--green);font-size:20px">✓</span> No duplicates found in <strong>${path}</strong> (${existingHymns.length} hymns checked). Safe to submit!</div>`;
      submitBtn.style.display='inline-flex';
    } else {
      let html=`<div class="dupcheck-warning"><span style="color:var(--gold);font-size:16px">⚠</span> Found ${matches.length} possibly similar hymn${matches.length!==1?'s':''} already in <strong>${path}</strong>:</div>`;
      html+='<div class="dupcheck-matches">';
      matches.forEach(m=>{
        const t=typeof m.title==='object'?Object.values(m.title).filter(Boolean).join(' / '):m.title;
        html+=`<div class="dupcheck-match-item"><span class="dupcheck-match-title">${escHtml(t)}</span><span class="id-chip">${escHtml(m.id||'')}</span></div>`;
      });
      html+='</div><div class="dupcheck-note">You can still submit if this is a different hymn.</div>';
      results.innerHTML=html;
      submitBtn.style.display='inline-flex';
    }
  }catch(e){
    results.innerHTML=`<div class="dupcheck-error"><span style="color:var(--red)">✕</span> Could not search GitHub: ${escHtml(e.message)}</div>`;
    submitBtn.style.display='inline-flex';
    submitBtn.textContent='\u271d Submit Anyway';
  }
}

async function submitHymnToGitHub(){
  const hymn=pendingSubmitHymn;
  if (!hymn) return;
  document.getElementById('modal-dupcheck').style.display='none';

  const cfg=getGHConfig();
  const path=ghFilePath(cfg, hymn.groupKey);
  const exported=hymnToExport(hymn);
  const title=getHymnDisplayTitle(hymn);

  showToast('Submitting to GitHub…');

  try{
    // Get current file (may not exist)
    const existing=await ghGetFile(cfg, path);
    let arr=[];
    let sha=null;

    if (existing){
      sha=existing.sha;
      const decoded=decodeURIComponent(escape(atob(existing.content.replace(/\n/g,''))));
      try{arr=JSON.parse(decoded);}catch(e){arr=[];}
    }

    // Check if ID already exists → update, else append
    const idx=arr.findIndex(h=>h.id===exported.id);
    if (idx>=0) arr[idx]=exported;
    else arr.push(exported);

    const newContent=JSON.stringify(arr,null,2);
    const commitMsg=idx>=0
      ? `Update hymn: ${title} (${exported.id})`
      : `Add hymn: ${title} (${exported.id})`;

    await ghPutFile(cfg, path, newContent, sha, commitMsg);

    // Mark as final locally
    hymn.status='final';
    saveToStorage();
    renderHymnList();
    if (activeHymn?.id===hymn.id) renderEditor();

    // Show success
    document.getElementById('submitted-msg').innerHTML=
      `<strong>${escHtml(title)}</strong> was added to <code>${escHtml(path)}</code> in your GitHub repo.<br><br>Commit: <em>${escHtml(commitMsg)}</em>`;
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
  document.getElementById('btn-github-settings').addEventListener('click',openGithubSettings);
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
  document.getElementById('gh-cancel').addEventListener('click',closeGithubSettings);
  document.getElementById('gh-save').addEventListener('click',()=>{
    const cfg={
      owner:document.getElementById('gh-owner').value.trim(),
      repo:document.getElementById('gh-repo').value.trim(),
      branch:document.getElementById('gh-branch').value.trim()||'main',
      token:document.getElementById('gh-token').value.trim(),
      folder:document.getElementById('gh-folder').value.trim(),
    };
    saveGHConfig(cfg); closeGithubSettings();
    showToast('GitHub settings saved ✓','success');
    updateGHStatusIndicator();
  });
  document.getElementById('gh-test').addEventListener('click',testGHConnection);
  document.getElementById('gh-init-files').addEventListener('click',initializeGitHubFiles);
  document.getElementById('modal-github').addEventListener('click',function(e){if(e.target===this)closeGithubSettings();});

  // Dup check modal
  document.getElementById('dupcheck-cancel').addEventListener('click',()=>{document.getElementById('modal-dupcheck').style.display='none';});
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
  const btn=document.getElementById('btn-github-settings');
  if (!btn) return;
  if (isGHConfigured()){
    btn.textContent='⚙ GitHub ✓';
    btn.style.borderColor='rgba(61,107,78,.5)';
    btn.style.color='#a8d5b5';
  } else {
    btn.textContent='⚙ GitHub';
    btn.style.borderColor='';
    btn.style.color='';
  }
}

document.addEventListener('DOMContentLoaded',()=>{init();updateGHStatusIndicator();});
