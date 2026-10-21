/* ═══════════════════════════════════════════════════════════
   WAZEMA · app.js v10
   Eritrean Orthodox Tewahedo Church Hymn Entry Tool
   New 6-group taxonomy · per-lang zemari dropdown · multi-select subgroups
   ═══════════════════════════════════════════════════════════ */
'use strict';

// ── CONSTANTS ─────────────────────────────────────────────
const REPO = { owner:'EskndrEssey', repo:'Mezmur-Typer', branch:'main', folder:'data' };

const LANGS   = ['en','ti','ti_ro','am','am_ro','om'];
const LNAME   = { en:'English', ti:'Tigrinya', ti_ro:'Tigrinya (Rom.)', am:'Amharic', am_ro:'Amharic (Rom.)', om:'Afaan Oromo' };
const LSHORT  = { en:'EN', ti:'TI', ti_ro:'TI-R', am:'AM', am_ro:'AM-R', om:'OM' };
const GEEZ_LANGS = new Set(['ti','am']);
const GEEZ_PUNCT = ['።','፥','፤','፣','፡','፦','‹','›','«','»','—','…'];

const HYMN_KEY    = 'wz2_hymns';
const POW_KEY     = 'wz2_pow';
const PENDING_KEY = 'wz2_pending';
const AUTH_KEY    = 'wz2_auth';
const SESSION_K   = 'wz2_sess';
const CLOCK_KEY   = 'wz2_clock';
const SESSIONS_K  = 'wz2_sessions';

const COLORS = [
  '#e53935','#f4511e','#f6bf26','#33b679','#0b8043',
  '#039be5','#3f51b5','#7986cb','#8e24aa','#e67c73'
];

const GROUP_TAXONOMY = [
  {
    key: 'feasts', label: 'Dominical Feasts', labelGeez: 'በዓላተ እግዚእ', file: 'feasts.json',
    subgroups: [
      { id:'timket',       name_geez:'ጥምቀት',            name_en:'Timket / Theophany' },
      { id:'lidet',        name_geez:'ልደት',             name_en:'Lidet / Nativity' },
      { id:'hosaena',      name_geez:'ሆሣዕና',            name_en:"Hosa'ena / Palm Sunday" },
      { id:'tinsae',       name_geez:'ትንሣኤ',            name_en:'Tinsae / Easter' },
      { id:'erget',        name_geez:'ዕርገት',            name_en:'Erget / Ascension' },
      { id:'peraqlitos',   name_geez:'ጰራቅሊጦስ',         name_en:'Peraqlitos / Pentecost' },
      { id:'debre_tabor',  name_geez:'ደብረ ታቦር',        name_en:'Debre Tabor / Buhe' },
      { id:'meskel',       name_geez:'መስቀል',            name_en:'Meskel / Finding of Cross' },
      { id:'qana_zegelila',name_geez:'ቃና ዘገሊላ',        name_en:'Qana ZeGelila / Cana' },
      { id:'other_feasts', name_geez:'ካልኦት በዓላት',     name_en:'Other Feasts' },
    ]
  },
  {
    key: 'tsome', label: 'Tsome / Fasts', labelGeez: 'ጾም', file: 'tsome.json',
    subgroups: [
      { id:'abiy_tsom',       name_geez:'ዓቢይ ጾም',         name_en:'Abiy Tsom / Great Lent' },
      { id:'semune_himamat',  name_geez:'ሰሙነ ሕማማት',      name_en:'Semune Himamat / Holy Week' },
      { id:'siklet',          name_geez:'ዓርበ ስቅለት',       name_en:'Siqlet / Good Friday' },
      { id:'nenewe',          name_geez:'ጾመ ነነዌ',         name_en:'Tsome Nenewe / Nineveh' },
      { id:'hawaryat',        name_geez:'ጾመ ሐዋርያት',      name_en:'Tsome Hawaryat / Apostles' },
      { id:'filseta_fast',    name_geez:'ጾመ ፍልሰታ',       name_en:'Tsome Filseta / Assumption' },
      { id:'nebiyat',         name_geez:'ጾመ ነቢያት',       name_en:'Tsome Nebiyat / Advent' },
      { id:'tsige',           name_geez:'ዘመነ ጽጌ',        name_en:'Zemene Tsige / Flowers' },
      { id:'other_tsome',     name_geez:'ካልኦት ኣጽዋማት',   name_en:'Other Fasts' },
    ]
  },
  {
    key: 'st_mary', label: 'Holy Virgin Mary', labelGeez: 'ቅድስት ድንግል ማርያም', file: 'st_mary.json',
    subgroups: [
      { id:'kidane_mehret',  name_geez:'ኪዳነ ምሕረት',          name_en:'Kidane Mehret / Covenant' },
      { id:'filseta_mary',   name_geez:'ፍልሰታ ለማርያም',       name_en:'Filseta / Assumption' },
      { id:'lideta_mary',    name_geez:'ልደታ ለማርያም',        name_en:'Lideta / Nativity of Mary' },
      { id:'baeta_mary',     name_geez:"ባዕታ ለማርያም",        name_en:"Ba'eta / Presentation" },
      { id:'other_mary',     name_geez:'ካልኦት በዓላት ማርያም',  name_en:'Other Mary Feasts' },
    ]
  },
  {
    key: 'angels', label: 'Holy Angels & Archangels', labelGeez: 'ቅዱሳን መላእክት', file: 'angels.json',
    subgroups: [
      { id:'mikael',        name_geez:'ቅዱስ ሚካኤል',  name_en:'Kidus Mikael / Michael' },
      { id:'gabriel',       name_geez:'ቅዱስ ገብርኤል', name_en:'Kidus Gabriel / Gabriel' },
      { id:'rufael',        name_geez:'ቅዱስ ሩፋኤል',  name_en:'Kidus Rufael / Raphael' },
      { id:'urael',         name_geez:'ቅዱስ ዑራኤል',  name_en:'Kidus Urael / Uriel' },
      { id:'other_angels',  name_geez:'ካልኦት መላእክት',name_en:'Other Angels' },
    ]
  },
  {
    key: 'saints', label: 'Martyrs & Monastic Fathers', labelGeez: 'ሰማዕታት ወጻድቃን', file: 'saints.json',
    subgroups: [
      { id:'giyorgis',           name_geez:'ቅዱስ ጊዮርጊስ',           name_en:'Kidus Giyorgis / George' },
      { id:'arsema',             name_geez:'ቅድስት አርሴማ',           name_en:'Qidist Arsema / Hripsime' },
      { id:'tekle_haymanot',     name_geez:'አቡነ ተክለ ሃይማኖት',      name_en:'Tekle Haymanot' },
      { id:'gebre_menfes_kidus', name_geez:'አቡነ ገብረ መንፈስ ቅዱስ',  name_en:'Gebre Menfes Kidus' },
      { id:'yared',              name_geez:'ቅዱስ ያሬድ',             name_en:'Kidus Yared / St. Yared' },
      { id:'other_saints',       name_geez:'ካልኦት ቅዱሳን',          name_en:'Other Saints' },
    ]
  },
  {
    key: 'general', label: 'General & Sacraments', labelGeez: 'ሓፈሻዊ', file: 'general.json',
    subgroups: [
      { id:'wedding',        name_geez:'ስርዓተ መርዓ',           name_en:'Wedding / Matrimony' },
      { id:'burial',         name_geez:'ስርዓተ ቀብር',           name_en:'Burial / Hazen' },
      { id:'nisha',          name_geez:'ስርዓተ ንስሓ',           name_en:'Nisha / Repentance' },
      { id:'infant_baptism', name_geez:'ስርዓተ ጥምቀት ሕጻናት',  name_en:'Infant Baptism' },
      { id:'holy_communion', name_geez:'ስርዓተ ቁርባን',         name_en:'Holy Communion' },
      { id:'assembly',       name_geez:'ጉባኤና መክፈቲ',         name_en:'Assembly & Opening' },
      { id:'other_tracks',   name_geez:'ካልኦት መዛሙር',        name_en:'Other Tracks' },
    ]
  },
];
const ALL_GROUPS = GROUP_TAXONOMY.map(g => g.key);

// ── STATE ─────────────────────────────────────────────────
let hymns           = [];
let powLog          = [];
let pendingSync     = [];
let sessions        = [];
let activeId        = null;
let activeLang      = 'ti';
let contributorName = '';
let ghToken         = '';
let clockedInAt     = null;
let clockTimer      = null;
let catalogHymns    = [];
let geezFocusEl     = null;
let draftTimer      = null;
let previewHadLook  = false;

// ── UTILS ─────────────────────────────────────────────────
function el(id) { return document.getElementById(id); }
function uid()  { return Date.now().toString(36) + Math.random().toString(36).slice(2,7); }
function esc(s) { return String(s||'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;'); }
function noop() {}

// ── STORAGE ───────────────────────────────────────────────
function save()        { try { localStorage.setItem(HYMN_KEY,    JSON.stringify(hymns));        } catch(e){} }
function load()        { try { const d=localStorage.getItem(HYMN_KEY);    hymns=d?JSON.parse(d):[]; } catch(e){ hymns=[]; } }
function savePOW()     { try { localStorage.setItem(POW_KEY,     JSON.stringify(powLog));       } catch(e){} }
function loadPOW()     { try { const d=localStorage.getItem(POW_KEY);     powLog=d?JSON.parse(d):[]; } catch(e){ powLog=[]; } }
function savePending() { try { localStorage.setItem(PENDING_KEY, JSON.stringify(pendingSync));  } catch(e){} }
function loadPending() { try { const d=localStorage.getItem(PENDING_KEY); pendingSync=d?JSON.parse(d):[]; } catch(e){ pendingSync=[]; } }
function loadSessions(){ try { const d=localStorage.getItem(SESSIONS_K);  sessions=d?JSON.parse(d):[]; } catch(e){ sessions=[]; } }
function saveSessions(){ try { localStorage.setItem(SESSIONS_K,  JSON.stringify(sessions));    } catch(e){} }

// ── DATA MODEL ────────────────────────────────────────────
function newLang() {
  return { title:'', subtitle:'', chorus:'', verses:[], youtube:'', groupName:'', zemari:'' };
}
function newLine(t='') { return { text:t }; }

function newVerse() {
  return {
    lines:         [newLine()],
    pasteBlock:    '',          // raw paste text — split into lines on save/preview
    prefix:        '',          // repeats before every line (e.g. ሃሌሉያ)
    specialBefore: '',          // single optional line before the verse
    specialAfter:  '',          // single optional line after the verse
  };
}

function newHymn(o={}) {
  const id = o.id || uid();
  const langs = {};
  LANGS.forEach(l => langs[l] = newLang());
  return {
    id, groupKey:'', subgroups:[], color:'', status:'draft',
    langs,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    ...o
  };
}

// Migrate older hymn data
function migrateHymn(h) {
  // Migrate old global zemari → per-lang zemari (copy to all langs that don't have one)
  if (h.zemari) {
    LANGS.forEach(l => {
      if (h.langs[l] && !h.langs[l].zemari) h.langs[l].zemari = h.zemari;
    });
    delete h.zemari;
  }
  // Migrate old langsinger → per-lang zemari
  if (h.langsinger) {
    LANGS.forEach(l => {
      const singer = h.langsinger[l];
      if (singer && h.langs[l] && !h.langs[l].zemari) h.langs[l].zemari = singer;
    });
    delete h.langsinger;
  }
  // Migrate old string subgroups → id-based (attempt best-effort match by name_geez or name_en)
  if (Array.isArray(h.subgroups)) {
    h.subgroups = h.subgroups.map(s => {
      if (typeof s === 'string') {
        // try to find matching subgroup by Ge'ez name or English name
        for (const g of GROUP_TAXONOMY) {
          const match = g.subgroups.find(sg => sg.name_geez === s || sg.name_en === s || sg.id === s);
          if (match) return match.id;
        }
        return null; // can't match, drop it
      }
      return s; // already an id string from new format
    }).filter(Boolean);
  }
  LANGS.forEach(l => {
    const ld = h.langs[l];
    if (!ld) return;
    if (!ld.verses) ld.verses = [];
    if (ld.zemari === undefined) ld.zemari = '';
    ld.verses.forEach(v => {
      // flatten old array special lines to single string
      if (Array.isArray(v.specialBefore)) v.specialBefore = v.specialBefore.filter(Boolean).join(' ');
      if (Array.isArray(v.specialAfter))  v.specialAfter  = v.specialAfter.filter(Boolean).join(' ');
      if (v.specialBefore === undefined) v.specialBefore = '';
      if (v.specialAfter  === undefined) v.specialAfter  = '';
      if (v.prefix        === undefined) v.prefix        = '';
      if (v.pasteBlock    === undefined) {
        // build pasteBlock from existing lines so old data still shows up
        v.pasteBlock = (v.lines||[]).map(ln => {
          if (typeof ln === 'string') return ln;
          const parts = [ln.prefix, ln.text].filter(Boolean);
          return parts.join(' ').trim();
        }).join('\n');
      }
      if (!v.lines) v.lines = [newLine()];
      v.lines = v.lines.map(ln => {
        if (typeof ln === 'string') return newLine(ln);
        if (ln.prefix !== undefined) return newLine([ln.prefix, ln.text].filter(Boolean).join(' ').trim());
        return { text: ln.text || '' };
      });
    });
  });
  return h;
}

// Split pasteBlock into lines array
function commitPasteBlock(v) {
  if (!v.pasteBlock && v.pasteBlock !== 0) return;
  const raw = v.pasteBlock;
  if (!raw.trim()) return;
  const lines = raw.split('\n').map(l => l.trim()).filter(Boolean);
  v.lines = lines.map(t => newLine(t));
}

function hymnTitle(h) {
  for (const l of ['ti','en','am','om','ti_ro','am_ro']) {
    if (h.langs[l]?.title?.trim()) return h.langs[l].title.trim();
  }
  return '(Untitled)';
}
function langHasBody(ld) {
  if (!ld) return false;
  if (ld.chorus?.trim()) return true;
  return ld.verses?.some(v =>
    v.pasteBlock?.trim() || v.lines?.some(ln => ln.text?.trim()) ||
    v.specialBefore?.trim() || v.specialAfter?.trim()
  );
}
function gLabel(key) { return GROUP_TAXONOMY.find(g=>g.key===key)?.label || key || '—'; }
function gLabelGeez(key) { return GROUP_TAXONOMY.find(g=>g.key===key)?.labelGeez || ''; }
function gSubgroups(key) { return GROUP_TAXONOMY.find(g=>g.key===key)?.subgroups || []; }
function gFile(key)  { return GROUP_TAXONOMY.find(g=>g.key===key)?.file || (key.toLowerCase()+'.json'); }
// Get a subgroup object by id (across all groups)
function gSubgroupById(id) {
  for (const g of GROUP_TAXONOMY) {
    const s = g.subgroups.find(sg => sg.id === id);
    if (s) return s;
  }
  return null;
}

// Collect all unique zemari names across all hymns + all languages
function getKnownZemari() {
  const set = new Set();
  hymns.forEach(h => {
    LANGS.forEach(l => {
      const z = h.langs[l]?.zemari?.trim();
      if (z) set.add(z);
    });
  });
  return Array.from(set).sort((a,b) => a.localeCompare(b));
}

// ── GITHUB PATHS ──────────────────────────────────────────
function ghPath(groupKey) { return `${REPO.folder}/${gFile(groupKey)}`; }
function ghSessionsPath() { return `${REPO.folder}/admin/sessions.json`; }
function ghPowPath()      { return `${REPO.folder}/admin/pow.json`; }

// ── GITHUB API ────────────────────────────────────────────
async function ghGet(path) {
  const url = `https://api.github.com/repos/${REPO.owner}/${REPO.repo}/contents/${path}?ref=${REPO.branch}`;
  const r = await fetch(url, { headers:{ Authorization:`token ${ghToken}`, Accept:'application/vnd.github+json' }});
  if (r.status===404) return null;
  if (!r.ok) throw new Error(`GitHub GET ${path}: ${r.status}`);
  return r.json();
}
async function ghPut(path, contentObj, sha, msg) {
  const json = JSON.stringify(contentObj, null, 2);
  const b64  = btoa(unescape(encodeURIComponent(json)));
  const body = { message:msg, content:b64, branch:REPO.branch };
  if (sha) body.sha = sha;
  const url = `https://api.github.com/repos/${REPO.owner}/${REPO.repo}/contents/${path}`;
  const r = await fetch(url, {
    method:'PUT',
    headers:{ Authorization:`token ${ghToken}`, Accept:'application/vnd.github+json', 'Content-Type':'application/json' },
    body: JSON.stringify(body)
  });
  if (!r.ok) { const e = await r.json().catch(()=>({})); throw new Error(e.message || `GitHub PUT ${path}: ${r.status}`); }
  return r.json();
}
function decodeGH(b64) {
  return JSON.parse(decodeURIComponent(escape(atob(b64.replace(/\n/g,'')))));
}
async function loadGHJson(path) {
  try { const f = await ghGet(path); return f ? decodeGH(f.content) : null; } catch(e) { return null; }
}

// ── PAGE / TAB CONTROL ────────────────────────────────────
function showPage(id) {
  document.querySelectorAll('.page').forEach(p => { p.style.display='none'; });
  const p = el(id);
  if (p) { p.style.display='flex'; p.style.flexDirection='column'; }
}
function switchTab(name) {
  document.querySelectorAll('.tab-content').forEach(t => { t.style.display='none'; });
  document.querySelectorAll('.seg-btn').forEach(b => b.classList.remove('active'));
  const tab = el('tab-'+name), btn = el('nav-'+name);
  if (tab) { tab.style.display='flex'; tab.style.flexDirection='column'; }
  if (btn) btn.classList.add('active');
  if (name==='catalog')   renderCatalog();
  if (name==='proofwork') renderPOW();
}
function openSheet(id) { const s=el(id); if(s) s.style.display='flex'; }
function closeSheet(id){ const s=el(id); if(s) s.style.display='none'; }

// ── LOGIN ─────────────────────────────────────────────────
async function submitLogin() {
  const nameEl=el('login-name'), tokEl=el('login-token'), errEl=el('login-err');
  const name=nameEl?.value.trim(), token=tokEl?.value.trim();
  if (!name)  { showErr(errEl,'Please enter your name.'); return; }
  if (!token) { showErr(errEl,'Please enter your GitHub token.'); return; }
  const btn = el('login-btn');
  if (btn) { btn.disabled=true; btn.textContent='Checking…'; }
  try {
    const r = await fetch(`https://api.github.com/repos/${REPO.owner}/${REPO.repo}`, {
      headers:{ Authorization:`token ${token}`, Accept:'application/vnd.github+json' }
    });
    if (!r.ok) throw new Error('Invalid token or no repository access.');
    contributorName=name; ghToken=token;
    try { localStorage.setItem(AUTH_KEY, JSON.stringify({name,token})); } catch(e){}
    sessionStorage.setItem(SESSION_K,'1');
    showApp();
  } catch(e) {
    showErr(errEl, e.message||'Login failed.');
    if (btn) { btn.disabled=false; btn.textContent='Enter ✝'; }
  }
}
function showErr(elRef, msg) {
  if (!elRef) return;
  elRef.textContent=msg; elRef.style.display='block';
}
function logout() {
  try { localStorage.removeItem(AUTH_KEY); } catch(e){}
  sessionStorage.removeItem(SESSION_K);
  contributorName=''; ghToken='';
  closeSheet('sheet-admin');
  showPage('page-login');
}

// ── SHOW APP ──────────────────────────────────────────────
function showApp() {
  load();
  hymns = hymns.map(migrateHymn);
  loadPOW(); loadPending(); loadSessions();
  try {
    const c = localStorage.getItem(CLOCK_KEY);
    if (c) { const d=JSON.parse(c); clockedInAt=new Date(d.at); updateClockUI(); startClockTick(); }
  } catch(e){}
  showPage('page-list');
  switchTab('editor');
  renderList();
  renderStats();
  renderPOW();
  loadCatalogFromGH();
  startDraftAutoSave();
  populateGroupFilters();
  renderAdminPage();
}
function populateGroupFilters() {
  ['filter-group','catalog-group'].forEach(id => {
    const sel=el(id); if(!sel) return;
    sel.innerHTML = '<option value="">All Groups</option>' +
      GROUP_TAXONOMY.map(g=>`<option value="${g.key}">${esc(g.label)}</option>`).join('');
  });
}

// ── CLOCK ─────────────────────────────────────────────────
function clockAction() { if (!clockedInAt) clockIn(); else openClockOut(); }
function clockIn() {
  if (clockedInAt) return;
  clockedInAt = new Date();
  try { localStorage.setItem(CLOCK_KEY, JSON.stringify({at:clockedInAt.toISOString()})); } catch(e){}
  updateClockUI(); startClockTick();
  toast('Clocked in ✓','success');
  const sess = { id:uid(), contributor:contributorName, start:clockedInAt.toISOString(), end:null };
  sessions.unshift(sess); saveSessions();
}
function openClockOut() {
  const mins = Math.floor((Date.now()-clockedInAt.getTime())/60000);
  el('clockout-msg').textContent = `You've been working for ${mins} minutes. End session?`;
  openSheet('sheet-clockout');
}
function confirmClockOut() { closeSheet('sheet-clockout'); clockOut(); }
function clockOut() {
  if (!clockedInAt) return;
  const start=clockedInAt.toISOString(), end=new Date().toISOString();
  const mins=Math.round((new Date(end)-new Date(start))/60000);
  const sess=sessions.find(s=>s.start===start);
  if (sess) { sess.end=end; saveSessions(); }
  powLog.unshift({ contributor:contributorName, start, end, minutes:mins, date:end.slice(0,10) });
  savePOW();
  uploadPOW().catch(noop);
  clockedInAt=null; clearInterval(clockTimer); clockTimer=null;
  try { localStorage.removeItem(CLOCK_KEY); } catch(e){}
  updateClockUI();
  toast(`Clocked out — ${mins} min`,'success');
}
function startClockTick() {
  if (clockTimer) return;
  clockTimer = setInterval(updateClockUI, 30000);
}
function updateClockUI() {
  const dot=el('clock-dot'), label=el('clock-label');
  if (!dot||!label) return;
  if (clockedInAt) {
    const mins=Math.floor((Date.now()-clockedInAt.getTime())/60000);
    dot.classList.add('active');
    label.textContent=`${mins}m`;
  } else {
    dot.classList.remove('active');
    label.textContent='Clock In';
  }
}
async function uploadPOW() {
  const f=await ghGet(ghPowPath()).catch(()=>null);
  const sha=f?.sha;
  const existing=f?decodeGH(f.content):[];
  if (!Array.isArray(existing)) return;
  const merged=[...powLog,...existing.filter(r=>!powLog.some(p=>p.start===r.start))];
  await ghPut(ghPowPath(), merged, sha, `POW: ${contributorName}`);
}

// ── TOAST ─────────────────────────────────────────────────
function toast(msg, type='', dur=2400) {
  const t=el('toast'); if(!t) return;
  t.textContent=msg;
  t.className='show'+(type?' '+type:'');
  clearTimeout(t._t);
  t._t=setTimeout(()=>{ t.className=''; }, dur);
}

// ── LIST ──────────────────────────────────────────────────
function renderList() {
  const q    =(el('search-inp')?.value||'').trim().toLowerCase();
  const group=el('filter-group')?.value||'';
  const list =el('hymn-list'); if(!list) return;
  const filtered=hymns.filter(h=>{
    if (group && h.groupKey!==group) return false;
    if (!q) return true;
    return LANGS.some(l=>{
      const ld=h.langs[l];
      return (ld?.title||'').toLowerCase().includes(q)||(ld?.subtitle||'').toLowerCase().includes(q)||(ld?.zemari||'').toLowerCase().includes(q);
    });
  });
  if (!filtered.length) {
    list.innerHTML=`<div class="list-empty"><strong>No hymns yet</strong>${q?'Try a different search.':'Tap "New Hymn" to get started.'}</div>`;
    return;
  }
  list.innerHTML=filtered.map(h=>{
    const title=hymnTitle(h);
    // Show first available zemari name across languages
    const firstZemari = LANGS.map(l=>h.langs[l]?.zemari?.trim()).find(Boolean) || '';
    const sub=[h.groupKey?gLabel(h.groupKey):'',firstZemari].filter(Boolean).join(' · ');
    const dot=h.color?`background:${h.color}`:'';
    const badge=h.status==='published'?'published':'';
    const active=h.id===activeId?'active-hymn':'';
    return `<div class="hymn-row ${active}" onclick="openEditor('${h.id}')">
      <div class="hymn-color-dot" style="${dot}"></div>
      <div class="hymn-row-body">
        <div class="hymn-row-title">${esc(title)}</div>
        ${sub?`<div class="hymn-row-sub">${esc(sub)}</div>`:''}
      </div>
      <span class="hymn-row-badge ${badge}">${esc(h.status||'draft')}</span>
    </div>`;
  }).join('');
}
function renderStats() {
  const total=hymns.length, pub=hymns.filter(h=>h.status==='published').length,
        draft=hymns.filter(h=>h.status==='draft').length, rev=hymns.filter(h=>h.status==='review').length;
  const s=el('list-stats');
  if(s) s.textContent=`${total} hymn${total!==1?'s':''} · ${pub} published · ${draft} drafts`;
  const set=(id,v)=>{ const e=el(id); if(e) e.textContent=v; };
  set('stat-total',total); set('stat-pub',pub); set('stat-draft',draft); set('stat-review',rev);
  set('stat-pending',pendingSync.length||'—');
}

// ── CREATE / OPEN ─────────────────────────────────────────
function createHymn() {
  const h=newHymn();
  hymns.unshift(h); save();
  renderList();
  openEditor(h.id);
}
function openEditor(id) {
  activeId=id; activeLang='ti'; previewHadLook=false;
  showPage('page-editor');
  renderLangTabs();
  renderEditor();
}
function goBack() {
  saveActive(); activeId=null;
  showPage('page-list');
  renderList();
}

// ── LANG TABS ─────────────────────────────────────────────
function renderLangTabs() {
  const bar=el('lang-tabs-bar'); if(!bar) return;
  bar.innerHTML=LANGS.map(l=>
    `<button class="lang-tab-btn${l===activeLang?' active':''}" onclick="switchLang('${l}')">${esc(LNAME[l])}</button>`
  ).join('');
}
function switchLang(lang) {
  saveActive(); activeLang=lang;
  renderLangTabs(); renderEditor();
}

// ── RENDER EDITOR ─────────────────────────────────────────
function renderEditor() {
  const h=hymns.find(hh=>hh.id===activeId); if(!h) return;
  const ld=h.langs[activeLang];
  const isGeez=GEEZ_LANGS.has(activeLang);
  const gc=isGeez?'geez-field':'';

  const tl=el('editor-title-label');
  if(tl) tl.textContent=hymnTitle(h);

  const area=el('editor-area'); if(!area) return;

  // ── META CARD ──
  // Build group picker chips (single-select, 6 groups)
  const groupChips = GROUP_TAXONOMY.map(g => {
    const isActive = h.groupKey === g.key;
    return `<button class="group-chip${isActive?' selected':''}" data-key="${g.key}" onclick="onGroupChipClick('${g.key}')">
      <span class="group-chip-en">${esc(g.label)}</span>
      <span class="group-chip-geez">${esc(g.labelGeez)}</span>
    </button>`;
  }).join('');

  // Build subgroup chips (multi-select, for currently selected group)
  const subs = gSubgroups(h.groupKey);
  const subgroupSection = subs.length ? `
    <div class="form-field">
      <label>Subgroup <span class="field-hint">Select one or more</span></label>
      <div class="subgroup-wrap" id="subgroup-wrap">
        ${subs.map(s => {
          const selected = h.subgroups?.includes(s.id) ? ' selected' : '';
          return `<button class="subgroup-chip${selected}" data-id="${s.id}" onclick="toggleSubgroup('${s.id}')">
            <span class="sg-geez">${esc(s.name_geez)}</span>
            <span class="sg-en">${esc(s.name_en)}</span>
          </button>`;
        }).join('')}
      </div>
    </div>` : (h.groupKey ? '<div class="form-field"><label>Subgroup</label><div class="field-hint-row">No subgroups for this category.</div></div>' : '');

  let html=`
  <div class="section-card card-meta">
    <div class="section-card-header">
      <span class="section-card-title">Hymn Details</span>
    </div>
    <div class="form-field">
      <label>Category <span class="field-hint">Pick one</span></label>
      <div class="group-chips-wrap" id="group-chips-wrap">
        ${groupChips}
      </div>
    </div>
    ${subgroupSection}
    <div class="form-field">
      <label>Status</label>
      <div class="status-row">
        ${['draft','review','published'].map(s=>
          `<button class="status-chip${h.status===s?' selected':''}" data-val="${s}" onclick="setStatus('${s}')">${s.charAt(0).toUpperCase()+s.slice(1)}</button>`
        ).join('')}
      </div>
    </div>
    <div class="form-field">
      <label>Color Tag</label>
      <div class="color-row">
        ${COLORS.map(c=>`<div class="color-swatch${h.color===c?' selected':''}" style="background:${c}" onclick="setColor('${c}')"></div>`).join('')}
        <div class="color-swatch${!h.color?' selected':''}" style="background:#c7c7cc" onclick="setColor('')"></div>
      </div>
    </div>
  </div>`;

  // ── LANG CARD ──
  // Build zemari datalist from all known names
  const knownZemari = getKnownZemari();
  const datalistId = `dl-zemari-${activeLang}`;
  const zemariDatalist = `<datalist id="${datalistId}">${knownZemari.map(z=>`<option value="${esc(z)}">`).join('')}</datalist>`;

  html+=`
  <div class="section-card card-meta">
    <div class="section-card-header">
      <span class="section-card-title">${esc(LNAME[activeLang])}</span>
    </div>
    <div class="form-field">
      <label>Zemari — ${esc(LSHORT[activeLang])} <span class="field-hint">Select existing or type new name</span></label>
      ${zemariDatalist}
      <input id="lang-zemari" type="text" list="${datalistId}"
        placeholder="e.g. Dawit Haile"
        value="${esc(ld.zemari||'')}"/>
    </div>
    <div class="form-field">
      <label>Title</label>
      <input id="lang-title" type="text" placeholder="Hymn title" value="${esc(ld.title||'')}"/>
    </div>
    <div class="form-field">
      <label>Subtitle</label>
      <input id="lang-subtitle" type="text" placeholder="Subtitle or alternate name" value="${esc(ld.subtitle||'')}"/>
    </div>
    <div class="form-field">
      <label>YouTube Link</label>
      <input id="lang-youtube" type="url" placeholder="https://youtube.com/…" value="${esc(ld.youtube||'')}"/>
    </div>
  </div>`;

  // ── CHORUS CARD ──
  html+=`
  <div class="section-card card-chorus ${gc}">
    <div class="section-card-header">
      <span class="section-card-title">🎵 Chorus</span>
    </div>
    <div class="chorus-area">
      <textarea id="lang-chorus" placeholder="Paste or type the chorus / refrain here…" rows="3">${esc(ld.chorus||'')}</textarea>
    </div>
  </div>`;

  // ── VERSES ──
  html+='<div id="verses-wrap">';
  (ld.verses||[]).forEach((v,vi)=>{ html+=renderVerseBlock(v,vi,gc); });
  html+='</div>';
  html+=`<button class="add-verse-btn" onclick="addVerse()">＋ Add Verse</button>`;

  // ── PUBLISH ──
  html+=`
  <div class="section-card card-meta" style="margin-bottom:8px;">
    <div class="section-card-header"><span class="section-card-title">Publish</span></div>
    <div class="form-field" style="flex-direction:row;align-items:center;gap:12px;">
      <button style="flex:1;padding:12px;background:var(--accent);color:#fff;border-radius:var(--r-md);font-size:15px;font-weight:600;" onclick="submitHymn()">Submit to GitHub</button>
      <button style="padding:12px 16px;background:var(--bg-inset);color:var(--t2);border-radius:var(--r-md);font-size:14px;font-weight:600;" onclick="deleteHymn()">Delete</button>
    </div>
  </div>`;

  area.innerHTML=html;
  wireEditor();
}

// ── RENDER VERSE BLOCK ────────────────────────────────────
function renderVerseBlock(v, vi, gc) {
  return `
  <div class="verse-block" id="verse-${vi}">

    <div class="verse-header">
      <span class="verse-number">Verse ${vi+1}</span>
      <button class="verse-del-btn" onclick="delVerse(${vi})">×</button>
    </div>

    <!-- Opening special line -->
    <div class="special-lines-zone top-zone">
      <div class="special-zone-label">★ Opening Special Line</div>
      <input class="special-line-inp ${gc}" type="text"
        placeholder="Optional line before this verse…"
        value="${esc(v.specialBefore||'')}"
        oninput="onSpecialChange(this,${vi},'before')"/>
    </div>

    <!-- Verse prefix (repeats before every line) -->
    <div class="prefix-zone">
      <div class="prefix-zone-label">⟳ Line Prefix</div>
      <input class="prefix-inp ${gc}" type="text"
        placeholder="Repeats before every line, e.g. ሃሌሉያ (optional)"
        value="${esc(v.prefix||'')}"
        oninput="onPrefixChange(this,${vi})"/>
    </div>

    <!-- Paste block -->
    <div class="paste-zone ${gc}">
      <div class="paste-zone-label">Verse Lines — paste the full verse here</div>
      <textarea class="paste-block-inp ${gc}"
        placeholder="Paste or type all lines here. Each line break becomes a separate line."
        data-vi="${vi}"
        oninput="onPasteBlockChange(this,${vi})">${esc(v.pasteBlock||'')}</textarea>
    </div>

    <!-- Closing special line -->
    <div class="special-lines-zone bottom-zone">
      <div class="special-zone-label">★ Closing Special Line</div>
      <input class="special-line-inp ${gc}" type="text"
        placeholder="Optional line after this verse…"
        value="${esc(v.specialAfter||'')}"
        oninput="onSpecialChange(this,${vi},'after')"/>
    </div>

  </div>`;
}

// ── WIRE EDITOR ───────────────────────────────────────────
function wireEditor() {
  const area=el('editor-area'); if(!area) return;
  const h=hymns.find(hh=>hh.id===activeId); if(!h) return;
  const ld=h.langs[activeLang];
  const isGeez=GEEZ_LANGS.has(activeLang);

  // Lang fields live sync
  const titleInp=el('lang-title');
  if(titleInp) titleInp.addEventListener('input',()=>{
    ld.title=titleInp.value;
    const tl=el('editor-title-label'); if(tl) tl.textContent=hymnTitle(h);
  });
  const subtInp=el('lang-subtitle');
  if(subtInp) subtInp.addEventListener('input',()=>{ ld.subtitle=subtInp.value; });
  const ytInp=el('lang-youtube');
  if(ytInp) ytInp.addEventListener('input',()=>{ ld.youtube=ytInp.value; });

  // Chorus
  const chorusTA=el('lang-chorus');
  if(chorusTA){
    autoResize(chorusTA);
    chorusTA.addEventListener('input',()=>{ ld.chorus=chorusTA.value; autoResize(chorusTA); });
    if(isGeez){ chorusTA.addEventListener('focus',()=>showGeezToolbar(chorusTA)); chorusTA.addEventListener('blur',hideGeezToolbarDelayed); }
  }

  // Paste blocks
  area.querySelectorAll('textarea.paste-block-inp').forEach(ta=>{
    autoResize(ta);
    ta.addEventListener('input',()=>autoResize(ta));
    if(isGeez){ ta.addEventListener('focus',()=>showGeezToolbar(ta)); ta.addEventListener('blur',hideGeezToolbarDelayed); }
  });

  // Special line inputs + prefix inputs
  area.querySelectorAll('input.special-line-inp, input.prefix-inp').forEach(inp=>{
    if(isGeez){ inp.addEventListener('focus',()=>showGeezToolbar(inp)); inp.addEventListener('blur',hideGeezToolbarDelayed); }
  });

  buildGeezToolbar();
}
function autoResize(ta) { ta.style.height='auto'; ta.style.height=ta.scrollHeight+'px'; }

// ── GE'EZ TOOLBAR ─────────────────────────────────────────
function buildGeezToolbar() {
  const row=el('geez-punct-row'); if(!row) return;
  row.innerHTML=GEEZ_PUNCT.map(p=>
    `<button class="geez-btn" onmousedown="event.preventDefault()" onclick="insertGeez('${p}')">${p}</button>`
  ).join('');
}
function showGeezToolbar(inputEl) {
  geezFocusEl=inputEl;
  const tb=el('geez-toolbar'); if(tb) tb.classList.add('visible');
}
function hideGeezToolbarDelayed() {
  setTimeout(()=>{
    const tb=el('geez-toolbar');
    if(tb && !tb.contains(document.activeElement)){ tb.classList.remove('visible'); geezFocusEl=null; }
  },200);
}
function insertGeez(char) {
  const el_=geezFocusEl; if(!el_) return;
  const start=el_.selectionStart||0, end=el_.selectionEnd||0;
  el_.value=el_.value.slice(0,start)+char+el_.value.slice(end);
  el_.selectionStart=el_.selectionEnd=start+char.length;
  el_.dispatchEvent(new Event('input',{bubbles:true}));
  el_.focus();
}

// ── FIELD CHANGE HANDLERS ─────────────────────────────────
function onGroupChipClick(key) {
  const h=hymns.find(hh=>hh.id===activeId); if(!h) return;
  if(h.groupKey===key){
    // clicking the active group deselects it
    h.groupKey=''; h.subgroups=[];
  } else {
    h.groupKey=key; h.subgroups=[];
  }
  // Update group chip UI
  document.querySelectorAll('.group-chip').forEach(c=>{
    c.classList.toggle('selected', c.dataset.key===h.groupKey);
  });
  // Re-render subgroup section
  const subs=gSubgroups(h.groupKey);
  // Find subgroup form-field area (second form-field) and rebuild it
  // Easiest to re-render the whole meta card area
  const area=el('editor-area'); if(!area) return;
  // Re-render only the subgroup wrap section without full re-render (avoid losing focus)
  // We'll replace the subgroup section by re-rendering editor
  renderEditor();
}
function toggleSubgroup(id) {
  const h=hymns.find(hh=>hh.id===activeId); if(!h) return;
  if(!h.subgroups) h.subgroups=[];
  const i=h.subgroups.indexOf(id);
  if(i>=0) h.subgroups.splice(i,1); else h.subgroups.push(id);
  document.querySelectorAll('.subgroup-chip').forEach(c=>{
    c.classList.toggle('selected', h.subgroups.includes(c.dataset.id));
  });
}
function setStatus(s) {
  const h=hymns.find(hh=>hh.id===activeId); if(!h) return;
  h.status=s;
  document.querySelectorAll('.status-chip').forEach(c=>c.classList.toggle('selected',c.dataset.val===s));
}
function setColor(c) {
  const h=hymns.find(hh=>hh.id===activeId); if(!h) return;
  h.color=c;
  document.querySelectorAll('.color-swatch').forEach(sw=>{
    sw.classList.toggle('selected', c ? sw.style.background===c : (sw.style.background==='rgb(199, 199, 204)'||sw.style.background==='#c7c7cc'));
  });
}
function onPasteBlockChange(ta, vi) {
  const h=hymns.find(hh=>hh.id===activeId); if(!h) return;
  const v=h.langs[activeLang].verses[vi]; if(!v) return;
  v.pasteBlock=ta.value;
}
function onPrefixChange(inp, vi) {
  const h=hymns.find(hh=>hh.id===activeId); if(!h) return;
  const v=h.langs[activeLang].verses[vi]; if(!v) return;
  v.prefix=inp.value;
}
function onSpecialChange(inp, vi, position) {
  const h=hymns.find(hh=>hh.id===activeId); if(!h) return;
  const v=h.langs[activeLang].verses[vi]; if(!v) return;
  if(position==='before') v.specialBefore=inp.value;
  else                    v.specialAfter=inp.value;
}

// ── VERSE OPERATIONS ──────────────────────────────────────
function addVerse() {
  const h=hymns.find(hh=>hh.id===activeId); if(!h) return;
  const ld=h.langs[activeLang];
  if(!ld.verses) ld.verses=[];
  ld.verses.push(newVerse());
  save(); renderEditor();
  setTimeout(()=>{
    const vi=ld.verses.length-1;
    const vEl=el(`verse-${vi}`);
    if(vEl) vEl.scrollIntoView({behavior:'smooth',block:'start'});
  },80);
}
function delVerse(vi) {
  const h=hymns.find(hh=>hh.id===activeId); if(!h) return;
  h.langs[activeLang].verses.splice(vi,1);
  save(); renderEditor();
}

// ── SAVE ──────────────────────────────────────────────────
function saveActive() {
  const h=hymns.find(hh=>hh.id===activeId); if(!h) return;
  const ld=h.langs[activeLang];
  const get=(id)=>el(id)?.value??null;
  if(get('lang-title')!==null)    ld.title    = get('lang-title');
  if(get('lang-subtitle')!==null) ld.subtitle = get('lang-subtitle');
  if(get('lang-youtube')!==null)  ld.youtube  = get('lang-youtube');
  if(get('lang-chorus')!==null)   ld.chorus   = get('lang-chorus');
  if(get('lang-zemari')!==null)   ld.zemari   = get('lang-zemari');
  // Commit paste blocks to lines
  (ld.verses||[]).forEach(v=>{ commitPasteBlock(v); });
  h.updatedAt=new Date().toISOString();
}
function saveHymn() {
  saveActive(); save();
  toast('Saved ✓','success');
  renderList(); renderStats();
}
function startDraftAutoSave() {
  if(draftTimer) clearInterval(draftTimer);
  draftTimer=setInterval(()=>{ if(activeId){ saveActive(); save(); } },20000);
}

// ── SUBMIT ────────────────────────────────────────────────
function submitHymn() {
  if(!previewHadLook){ openSheet('sheet-preview-remind'); return; }
  doSubmit();
}
function forceSubmit() { doSubmit(); }
function doSubmit() {
  saveActive();
  const h=hymns.find(hh=>hh.id===activeId); if(!h) return;
  if(!h.groupKey){ toast('Please set a group before submitting.','error'); return; }
  el('submit-confirm-msg').textContent=`Submit "${hymnTitle(h)}" to the repository?`;
  el('submit-confirm-btn').onclick=confirmSubmit;
  openSheet('sheet-submit-confirm');
}
async function confirmSubmit() {
  closeSheet('sheet-submit-confirm');
  const h=hymns.find(hh=>hh.id===activeId); if(!h) return;
  h.updatedAt=new Date().toISOString();
  save();
  try {
    await pushHymnToGH(h);
    h.status='published'; save();
    renderList(); renderStats();
    powLog.unshift({ contributor:contributorName, action:'submit', hymnId:h.id, title:hymnTitle(h), date:new Date().toISOString().slice(0,10) });
    savePOW();
    el('submitted-msg').textContent=`"${hymnTitle(h)}" saved to GitHub ✓`;
    openSheet('sheet-submitted');
  } catch(e) {
    toast('Submit failed: '+e.message,'error',4000);
    pendingSync.push({ id:h.id, title:hymnTitle(h), at:new Date().toISOString() });
    savePending();
  }
}
async function pushHymnToGH(h) {
  const path=ghPath(h.groupKey);
  const f=await ghGet(path);
  const sha=f?.sha;
  const existing=f?decodeGH(f.content):[];
  const arr=Array.isArray(existing)?existing:[];
  const idx=arr.findIndex(x=>x.id===h.id);
  if(idx>=0) arr[idx]=h; else arr.push(h);
  const msg=`${h.status==='published'?'publish':'update'}: ${hymnTitle(h)} [${contributorName}]`;
  await ghPut(path, arr, sha, msg);
}

// ── PREVIEW ───────────────────────────────────────────────
function openPreview() {
  saveActive(); previewHadLook=true;
  const h=hymns.find(hh=>hh.id===activeId); if(!h) return;
  const avail=LANGS.filter(l=>langHasBody(h.langs[l])||h.langs[l]?.title?.trim());
  const tabs=el('preview-lang-tabs'); if(!tabs) return;
  if(!avail.length){ toast('No content to preview yet.'); return; }
  tabs.innerHTML=avail.map((l,i)=>
    `<div class="preview-lang-tab${i===0?' active':''}" onclick="previewLang('${l}',this)">${esc(LNAME[l])}</div>`
  ).join('');
  previewLang(avail[0]);
  openSheet('sheet-preview');
}
function previewLang(lang, tabEl) {
  const h=hymns.find(hh=>hh.id===activeId); if(!h) return;
  const ld=h.langs[lang];
  const isGeez=GEEZ_LANGS.has(lang);
  if(tabEl){
    document.querySelectorAll('.preview-lang-tab').forEach(t=>t.classList.remove('active'));
    tabEl.classList.add('active');
  }
  const body=el('preview-body'); if(!body) return;
  body.className='preview-body'+(isGeez?' geez':'');
  let html='';
  if(ld.title)    html+=`<div class="preview-title">${esc(ld.title)}</div>`;
  if(ld.subtitle) html+=`<div class="preview-subtitle">${esc(ld.subtitle)}</div>`;
  if(ld.zemari)   html+=`<div class="preview-zemari">⁂ ${esc(ld.zemari)}</div>`;
  if(ld.chorus)   html+=`<div class="preview-section-label">Chorus</div><div>${esc(ld.chorus).replace(/\n/g,'<br>')}</div>`;
  (ld.verses||[]).forEach((v,vi)=>{
    html+=`<div class="preview-section-label">Verse ${vi+1}</div>`;
    if(v.specialBefore?.trim()) html+=`<div class="preview-special">★ ${esc(v.specialBefore)}</div>`;
    // Get lines from pasteBlock if not yet committed
    const lines = v.pasteBlock?.trim()
      ? v.pasteBlock.split('\n').map(l=>l.trim()).filter(Boolean)
      : v.lines.map(ln=>ln.text).filter(Boolean);
    lines.forEach(t=>{
      const prefix = v.prefix?.trim() ? `<span class="preview-prefix">${esc(v.prefix)} </span>` : '';
      html+=`<div class="preview-line">${prefix}${esc(t)}</div>`;
    });
    if(v.specialAfter?.trim()) html+=`<div class="preview-special">★ ${esc(v.specialAfter)}</div>`;
  });
  body.innerHTML=html||'<p style="color:var(--t3)">No content yet.</p>';
}

// ── DELETE ────────────────────────────────────────────────
function deleteHymn() {
  if(!confirm('Delete this hymn? This cannot be undone.')) return;
  hymns=hymns.filter(h=>h.id!==activeId);
  activeId=null; save(); goBack();
}

// ── CATALOG ───────────────────────────────────────────────
async function loadCatalogFromGH() {
  catalogHymns=[];
  for(const g of ALL_GROUPS){
    const data=await loadGHJson(ghPath(g));
    if(Array.isArray(data)) catalogHymns.push(...data.map(migrateHymn));
  }
  if(document.querySelector('#tab-catalog[style*="flex"]')) renderCatalog();
}
function renderCatalog() {
  const q    =(el('catalog-search')?.value||'').trim().toLowerCase();
  const group=el('catalog-group')?.value||'';
  const list =el('catalog-list'); if(!list) return;
  const filtered=catalogHymns.filter(h=>{
    if(group && h.groupKey!==group) return false;
    if(!q) return true;
    return LANGS.some(l=>(h.langs[l]?.title||'').toLowerCase().includes(q));
  });
  if(!filtered.length){
    list.innerHTML='<div class="list-empty"><strong>Nothing found</strong>No published hymns match.</div>';
    return;
  }
  list.innerHTML=filtered.map(h=>{
    const title=hymnTitle(h);
    const sub=h.groupKey?gLabel(h.groupKey):'';
    const dot=h.color?`background:${h.color}`:'';
    return `<div class="hymn-row" style="cursor:default;">
      <div class="hymn-color-dot" style="${dot}"></div>
      <div class="hymn-row-body">
        <div class="hymn-row-title">${esc(title)}</div>
        ${sub?`<div class="hymn-row-sub">${esc(sub)}</div>`:''}
      </div>
      <span class="hymn-row-badge published">published</span>
    </div>`;
  }).join('');
}

// ── PROOF OF WORK ─────────────────────────────────────────
function renderPOW() {
  const list=el('pow-list'); if(!list) return;
  const mine=powLog.filter(r=>r.contributor===contributorName);
  if(!mine.length){
    list.innerHTML='<div class="list-empty"><strong>No sessions yet</strong>Clock in to start tracking your work.</div>';
    return;
  }
  list.innerHTML=mine.map(r=>{
    const dur=r.minutes!=null?`${r.minutes} min`:'';
    return `<div class="pow-card">
      <div class="pow-card-title">${esc(r.date||'')}</div>
      <div class="pow-card-meta">${esc(r.start?.slice(11,16)||'')} – ${esc(r.end?.slice(11,16)||'')}${dur?' · '+dur:''}</div>
      <span class="pow-badge">${esc(r.action||'session')}</span>
    </div>`;
  }).join('');
}

// ── SYNC ──────────────────────────────────────────────────
async function syncNow() {
  if(!pendingSync.length){ toast('Nothing to sync.'); return; }
  toast('Syncing…');
  const failed=[];
  for(const p of pendingSync){
    const h=hymns.find(hh=>hh.id===p.id);
    if(!h) continue;
    try { await pushHymnToGH(h); } catch(e){ failed.push(p); }
  }
  pendingSync=failed; savePending();
  toast(failed.length?`${failed.length} failed`:'Sync complete ✓',failed.length?'error':'success');
  renderStats();
}
function exportLocal() {
  const data={ hymns, powLog, exportedAt:new Date().toISOString(), contributor:contributorName };
  const blob=new Blob([JSON.stringify(data,null,2)],{type:'application/json'});
  const a=document.createElement('a');
  a.href=URL.createObjectURL(blob);
  a.download=`wazema_export_${new Date().toISOString().slice(0,10)}.json`;
  a.click();
  closeSheet('sheet-admin');
}

// ── ADMIN ─────────────────────────────────────────────────
function renderAdminPage() {
  const set=(id,v)=>{ const e=el(id); if(e) e.textContent=v; };
  set('admin-name', contributorName||'—');
  set('admin-session', new Date().toLocaleDateString());
  if(ghToken) set('admin-token-hint', ghToken.slice(0,7)+'…');
  renderStats();
  const sl=el('admin-sessions-list'); if(!sl) return;
  if(!sessions.length){ sl.innerHTML='<div class="admin-row" style="color:var(--t3);font-size:14px;">No sessions logged.</div>'; return; }
  sl.innerHTML=sessions.slice(0,10).map(s=>{
    const dur=s.end?Math.round((new Date(s.end)-new Date(s.start))/60000)+' min':'Active';
    return `<div class="admin-row">
      <span class="admin-row-label">${esc(s.start?.slice(0,10)||'')}</span>
      <span class="admin-row-value">${esc(dur)}</span>
    </div>`;
  }).join('');
}

// ── INIT ──────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
  ['login-name','login-token'].forEach(id=>{
    const inp=el(id);
    if(inp) inp.addEventListener('keydown',e=>{ if(e.key==='Enter'){ e.preventDefault(); submitLogin(); } });
  });
  const loginBtn=el('login-btn');
  if(loginBtn) loginBtn.addEventListener('click', submitLogin);
  buildGeezToolbar();
  // Auto-login
  try {
    const stored=localStorage.getItem(AUTH_KEY);
    if(stored && sessionStorage.getItem(SESSION_K)){
      const d=JSON.parse(stored);
      if(d.name && d.token){
        contributorName=d.name; ghToken=d.token;
        const ni=el('login-name'), ti=el('login-token');
        if(ni) ni.value=d.name;
        if(ti) ti.value=d.token;
        showApp(); return;
      }
    }
  } catch(e){}
});
