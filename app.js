/* ═══════════════════════════════════════════════════════════
   WAZEMA · app.js v7
   Eritrean Orthodox Tewahedo Church Hymn Entry Tool
═══════════════════════════════════════════════════════════ */
'use strict';

// ── CONSTANTS ────────────────────────────────────────────
const REPO    = { owner:'EskndrEssey', repo:'Mezmur-Typer', branch:'main', folder:'data' };
const LANGS   = ['en','ti','ti_ro','am','am_ro','om'];
const LNAME   = { en:'English', ti:'Tigrinya', ti_ro:'Tigrinya (Rom.)', am:'Amharic', am_ro:'Amharic (Rom.)', om:'Afaan Oromo' };
const LSHORT  = { en:'EN', ti:'TI', ti_ro:'TI-R', am:'AM', am_ro:'AM-R', om:'OM' };
const GEEZ_LANGS = new Set(['ti','am']);
const GEEZ_PUNCT = ['።','፥','፤','፣','፡','፦','‹','›','«','»','—','…'];

const GROUP_TAXONOMY = [
  { key:'Sillase',      label:'ስሉስ ቅዱስ (Trinity)',          file:'sillase.json',      subgroups:['Sillase','Wedi Sillase','Menfes Qidus'] },
  { key:'Egziabher',   label:'እግዚኣብሔር (God)',               file:'egziabher.json',    subgroups:['Egziabher','Wedi Egziabher'] },
  { key:'Mariam',      label:'ማርያም (St. Mary)',              file:'mariam.json',       subgroups:['Mariam','Wedi Mariam','Lij Mariam'] },
  { key:'Giorgis',     label:'ቅ. ጊዮርጊስ (St. George)',       file:'giorgis.json',      subgroups:['Giorgis'] },
  { key:'Michael',     label:'ቅ. ሚካኤል (St. Michael)',        file:'michael.json',      subgroups:['Michael'] },
  { key:'Gabriel',     label:'ቅ. ገብርኤል (St. Gabriel)',       file:'gabriel.json',      subgroups:['Gabriel'] },
  { key:'KidusnAbbot', label:'ቅዱሳን ኣቦታት (Holy Fathers)',    file:'kidusn_abbot.json', subgroups:['KidusnAbbot','Teklehaimanot','Arragawi','Yared'] },
  { key:'KidusnMelaikt',label:'ቅዱሳን መላእኽቲ (Holy Angels)',   file:'kidusn_melaikt.json',subgroups:['KidusnMelaikt','Rufael','Uriel','Selatan'] },
  { key:'Nissha',      label:'ንስሓ (Repentance)',              file:'nissha.json',       subgroups:['Nissha'] },
  { key:'Zewetr',      label:'ዘወትር (General/Daily)',          file:'zewetr.json',       subgroups:['Zewetr','Senbete','Senbet'] },
  { key:'Mera',        label:'ምራቕ (Praise)',                  file:'mera.json',         subgroups:['Mera'] },
  { key:'Yohannes',    label:'ቅ. ዮሓንስ (St. John)',           file:'yohannes.json',     subgroups:['Yohannes'] },
];
const ALL_GROUPS = GROUP_TAXONOMY.map(g => g.key);

const COLORS = ['#c9a55a','#4caf76','#e05555','#5a9be0','#b05ae0','#e09a30','#5ae0c0','#e05aa0'];

// ── STORAGE KEYS ─────────────────────────────────────────
const HYMNS_KEY   = 'wz2_hymns';
const POW_KEY     = 'wz2_pow';
const PENDING_KEY = 'wz2_pending';
const AUTH_KEY    = 'wz2_auth';
const SESSION_K   = 'wz2_sess';
const CLOCK_KEY   = 'wz2_clock';
const SESSIONS_K  = 'wz2_sessions';

// ── STATE ─────────────────────────────────────────────────
let hymns         = [];
let ghHymns       = [];
let powLog        = [];
let pendingSync   = [];
let sessions      = [];
let activeId      = null;
let contributorName = '';
let ghToken       = '';
let clockedInAt   = null;
let clockTimer    = null;
let draftSaveTimer = null;
let tapCount      = 0;
let tapTimer      = null;
let previewShown  = false;

// ── HELPERS ───────────────────────────────────────────────
const el  = id => document.getElementById(id);
const esc = s  => String(s||'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2,7);

function toast(msg, type='', dur=2600) {
  const t = el('toast'); if (!t) return;
  t.textContent = msg;
  t.className = 'toast show' + (type ? ' '+type : '');
  clearTimeout(t._timer);
  t._timer = setTimeout(() => t.classList.remove('show'), dur);
}

function fmtDate(iso) {
  if (!iso) return '—';
  const d = new Date(iso);
  return d.toLocaleDateString(undefined,{month:'short',day:'numeric',year:'numeric'}) + ' ' +
         d.toLocaleTimeString(undefined,{hour:'2-digit',minute:'2-digit'});
}
function fmtDateShort(iso) {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString(undefined,{weekday:'short',month:'short',day:'numeric',year:'numeric'});
}
function fmtTime(iso) {
  if (!iso) return '—';
  return new Date(iso).toLocaleTimeString(undefined,{hour:'2-digit',minute:'2-digit'});
}
function formatDuration(ms) {
  if (!ms) return '—';
  const h = Math.floor(ms/3600000), m = Math.floor((ms%3600000)/60000), s = Math.floor((ms%60000)/1000);
  return (h?h+'h ':'') + (m?m+'m ':'') + s+'s';
}
function padZero(n) { return String(n).padStart(2,'0'); }

// ── STORAGE ───────────────────────────────────────────────
function save() {
  try { localStorage.setItem(HYMNS_KEY, JSON.stringify(hymns)); } catch(e) {}
}
function load() {
  try { const d = localStorage.getItem(HYMNS_KEY); hymns = d ? JSON.parse(d) : []; } catch(e) { hymns = []; }
  // Migrate: ensure all hymns have langsinger
  hymns.forEach(h => { if (!h.langsinger) h.langsinger = {}; });
}
function savePOW() {
  try { localStorage.setItem(POW_KEY, JSON.stringify(powLog)); } catch(e) {}
}
function loadPOW() {
  try { const d = localStorage.getItem(POW_KEY); powLog = d ? JSON.parse(d) : []; } catch(e) { powLog = []; }
}
function savePending() {
  try { localStorage.setItem(PENDING_KEY, JSON.stringify(pendingSync)); } catch(e) {}
}
function loadPending() {
  try { const d = localStorage.getItem(PENDING_KEY); pendingSync = d ? JSON.parse(d) : []; } catch(e) { pendingSync = []; }
}
function loadSessions() {
  try { const d = localStorage.getItem(SESSIONS_K); sessions = d ? JSON.parse(d) : []; } catch(e) { sessions = []; }
}
function saveSessions() {
  try { localStorage.setItem(SESSIONS_K, JSON.stringify(sessions)); } catch(e) {}
}

// ── DATA MODEL ────────────────────────────────────────────
function newLang() { return { title:'', subtitle:'', chorus:'', verses:[], youtube:'', groupName:'' }; }
function newLine(p='',t='') { return { prefix:p, text:t }; }
function newVerse() { return { lines:[newLine()] }; }
function newHymn(o={}) {
  const id = o.id || uid();
  const langs = {};
  LANGS.forEach(l => langs[l] = newLang());
  return {
    id, groupKey:'', subgroups:[], zemari:'', color:'', status:'draft',
    langs, langsinger:{},
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    ...o
  };
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
  if (ld.verses?.some(v => v.lines?.some(ln => ln.text?.trim()))) return true;
  return false;
}
function gLabel(key) {
  return GROUP_TAXONOMY.find(g => g.key === key)?.label || key || '—';
}
function gSubgroups(key) {
  return GROUP_TAXONOMY.find(g => g.key === key)?.subgroups || [];
}
function gFile(key) {
  return GROUP_TAXONOMY.find(g => g.key === key)?.file || (key.toLowerCase()+'.json');
}

// ── GITHUB PATHS ──────────────────────────────────────────
function ghPath(groupKey) {
  return `${REPO.folder}/${gFile(groupKey)}`;
}
function ghDraftPath(id) {
  return `${REPO.folder}/drafts/${id}.json`;
}
function ghSessionsPath() {
  return `${REPO.folder}/admin/sessions.json`;
}
function ghPowPath() {
  return `${REPO.folder}/admin/pow.json`;
}

// ── GITHUB API ────────────────────────────────────────────
async function ghGet(path) {
  const url = `https://api.github.com/repos/${REPO.owner}/${REPO.repo}/contents/${path}?ref=${REPO.branch}`;
  const r = await fetch(url, { headers:{ Authorization:`token ${ghToken}`, Accept:'application/vnd.github+json' }});
  if (r.status === 404) return null;
  if (!r.ok) throw new Error(`GitHub GET ${path}: ${r.status}`);
  return r.json();
}
async function ghPut(path, contentObj, sha, msg) {
  const json = JSON.stringify(contentObj, null, 2);
  const b64  = btoa(unescape(encodeURIComponent(json)));
  const body = { message: msg, content: b64, branch: REPO.branch };
  if (sha) body.sha = sha;
  const url = `https://api.github.com/repos/${REPO.owner}/${REPO.repo}/contents/${path}`;
  const r = await fetch(url, {
    method:'PUT', headers:{ Authorization:`token ${ghToken}`, Accept:'application/vnd.github+json', 'Content-Type':'application/json' },
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
  document.querySelectorAll('.page').forEach(p => {
    p.style.display = 'none';
  });
  const p = el(id);
  if (p) { p.style.display = 'flex'; }
}
function switchTab(name) {
  document.querySelectorAll('.tab-content').forEach(t => {
    t.style.display = 'none';
  });
  document.querySelectorAll('.nav-btn').forEach(b => b.classList.remove('active'));
  const tab = el('tab-'+name), btn = el('nav-'+name);
  if (tab) { tab.style.display = 'flex'; tab.style.flexDirection = 'column'; }
  if (btn) btn.classList.add('active');
  if (name === 'catalog') renderCatalog();
  if (name === 'proofwork') renderPOW();
}
function openSheet(id) {
  const s = el(id); if (s) s.style.display = 'flex';
}
function closeSheet(id) {
  const s = el(id); if (s) s.style.display = 'none';
}

// ── LOGIN ─────────────────────────────────────────────────
async function submitLogin() {
  const nameEl = el('login-name'), tokEl = el('login-token'), errEl = el('login-err');
  const name = nameEl?.value.trim(), token = tokEl?.value.trim();
  if (!name) { showErr(errEl, 'Please enter your name.'); return; }
  if (!token) { showErr(errEl, 'Please enter your GitHub token.'); return; }
  const btn = el('login-btn');
  if (btn) { btn.disabled = true; btn.textContent = 'Checking…'; }
  try {
    const r = await fetch(`https://api.github.com/repos/${REPO.owner}/${REPO.repo}`, {
      headers:{ Authorization:`token ${token}`, Accept:'application/vnd.github+json' }
    });
    if (!r.ok) throw new Error('Invalid token or no repo access.');
    contributorName = name;
    ghToken = token;
    try { localStorage.setItem(AUTH_KEY, JSON.stringify({name, token})); } catch(e) {}
    sessionStorage.setItem(SESSION_K, '1');
    showApp();
  } catch(e) {
    showErr(errEl, e.message || 'Login failed.');
    if (btn) { btn.disabled = false; btn.textContent = 'Enter ✝'; }
  }
}
function showErr(el_, msg) {
  if (!el_) return;
  el_.textContent = msg;
  el_.style.display = 'block';
}
function logout() {
  try { localStorage.removeItem(AUTH_KEY); } catch(e) {}
  sessionStorage.removeItem(SESSION_K);
  contributorName = ''; ghToken = '';
  closeSheet('sheet-admin');
  showPage('page-login');
}

// ── SHOW APP (after login) ────────────────────────────────
function showApp() {
  load(); loadPOW(); loadPending(); loadSessions();
  // Resume clock
  try {
    const c = localStorage.getItem(CLOCK_KEY);
    if (c) { const d = JSON.parse(c); clockedInAt = new Date(d.at); updateClockUI(); startClockTick(); }
  } catch(e) {}
  showPage('page-list');
  switchTab('editor');
  renderList();
  renderStats();
  renderPOW();
  loadCatalogFromGH();
  startDraftAutoSave();
  // Populate group filters
  populateGroupFilters();
}

function populateGroupFilters() {
  ['filter-group','catalog-group'].forEach(id => {
    const sel = el(id); if (!sel) return;
    const opts = ALL_GROUPS.map(k => '<option value="'+k+'">'+esc(gLabel(k))+'</option>').join('');
    sel.innerHTML = '<option value="">All Groups</option>' + opts;
  });
}

// ── CLOCK IN / OUT ────────────────────────────────────────
function clockIn() {
  if (clockedInAt) return;
  clockedInAt = new Date();
  try { localStorage.setItem(CLOCK_KEY, JSON.stringify({at: clockedInAt.toISOString()})); } catch(e) {}
  updateClockUI();
  startClockTick();
  toast('Clocked in ✓', 'success');
}
function updateClockUI() {
  const dot = el('clock-dot'), label = el('clock-label');
  const btnIn = el('btn-clock-in'), btnOut = el('btn-clock-out');
  const timer = el('clock-timer');
  if (clockedInAt) {
    if (dot) dot.classList.add('active');
    if (label) label.textContent = 'Clocked in — ' + contributorName;
    if (btnIn) btnIn.style.display = 'none';
    if (btnOut) btnOut.style.display = '';
    if (timer) timer.style.display = '';
  } else {
    if (dot) dot.classList.remove('active');
    if (label) label.textContent = 'Not clocked in';
    if (btnIn) btnIn.style.display = '';
    if (btnOut) btnOut.style.display = 'none';
    if (timer) timer.style.display = 'none';
  }
}
function startClockTick() {
  clearInterval(clockTimer);
  clockTimer = setInterval(() => {
    if (!clockedInAt) { clearInterval(clockTimer); return; }
    const ms = Date.now() - clockedInAt.getTime();
    const h = Math.floor(ms/3600000), m = Math.floor((ms%3600000)/60000), s = Math.floor((ms%60000)/1000);
    const elapsed = el('clock-elapsed');
    if (elapsed) elapsed.textContent = padZero(h)+':'+padZero(m)+':'+padZero(s);
  }, 1000);
}
function confirmClockOut() {
  if (!clockedInAt) return;
  const ms = Date.now() - clockedInAt.getTime();
  const sumEl = el('clockout-summary');
  if (sumEl) sumEl.textContent = 'Session duration: ' + formatDuration(ms) + '. Clocked in at ' + fmtTime(clockedInAt.toISOString()) + '.';
  openSheet('sheet-clockout');
}
async function doClockOut() {
  if (!clockedInAt) return;
  const now = new Date();
  const ms  = now.getTime() - clockedInAt.getTime();
  const sess = {
    id: uid(), name: contributorName,
    clockedIn: clockedInAt.toISOString(),
    clockedOut: now.toISOString(),
    durationMs: ms,
    submissionsInSession: powLog.filter(r => new Date(r.submittedAt) >= clockedInAt).length
  };
  sessions.push(sess);
  saveSessions();
  clockedInAt = null;
  try { localStorage.removeItem(CLOCK_KEY); } catch(e) {}
  clearInterval(clockTimer);
  updateClockUI();
  closeSheet('sheet-clockout');
  toast('Clocked out ✓', 'success');
  // Write to GitHub
  try {
    const f = await ghGet(ghSessionsPath());
    const arr = f ? decodeGH(f.content) : [];
    arr.push(sess);
    await ghPut(ghSessionsPath(), arr, f?.sha || null, 'Session: '+contributorName);
  } catch(e) { console.warn('Session sync failed', e); }
}

// ── DRAFT AUTO-SAVE ───────────────────────────────────────
function startDraftAutoSave() {
  clearInterval(draftSaveTimer);
  draftSaveTimer = setInterval(autosaveDraft, 2 * 60 * 1000);
}
async function autosaveDraft() {
  if (!activeId || !ghToken) return;
  const h = hymns.find(x => x.id === activeId); if (!h) return;
  const bar = el('draft-save-bar');
  try {
    const f = await ghGet(ghDraftPath(h.id));
    await ghPut(ghDraftPath(h.id), h, f?.sha || null, 'Draft: '+hymnTitle(h));
    if (bar) { bar.textContent = 'Draft saved to GitHub ' + fmtTime(new Date().toISOString()); bar.style.display = ''; setTimeout(() => bar.style.display='none', 3000); }
  } catch(e) {
    if (bar) { bar.textContent = 'Draft save failed'; bar.style.display = ''; setTimeout(() => bar.style.display='none', 3000); }
  }
}

// ── HYMN LIST ─────────────────────────────────────────────
function addNewHymn() {
  const h = newHymn();
  hymns.unshift(h);
  save();
  selectHymn(h.id);
  showPage('page-editor');
}
function selectHymn(id) {
  activeId = id;
  renderEditor();
}
function deleteHymn(id) {
  if (!confirm('Delete this hymn? This cannot be undone.')) return;
  hymns = hymns.filter(h => h.id !== id);
  save();
  if (activeId === id) { activeId = null; showPage('page-list'); }
  renderList();
  renderStats();
}
function get activeHymn() { return hymns.find(h => h.id === activeId); }

function renderList() {
  const list = el('hymn-list'); if (!list) return;
  const q     = (el('search-input')?.value||'').toLowerCase();
  const grp   = el('filter-group')?.value||'';
  const stat  = el('filter-status')?.value||'';
  let items = hymns.filter(h => {
    if (grp  && h.groupKey !== grp)  return false;
    if (stat && h.status  !== stat)  return false;
    if (q) {
      const hay = [hymnTitle(h), h.zemari, gLabel(h.groupKey)].join(' ').toLowerCase();
      if (!hay.includes(q)) return false;
    }
    return true;
  });
  if (!items.length) { list.innerHTML = '<div style="color:var(--t3);font-size:13px;padding:20px;text-align:center">No hymns found</div>'; return; }
  list.innerHTML = items.map(h => {
    const col = h.color || 'var(--t3)';
    const bodyLangs = LANGS.filter(l => langHasBody(h.langs[l]));
    return '<div class="hymn-card'+(h.id===activeId?' active':'')+'" onclick="selectHymn(\''+esc(h.id)+'\');showPage(\'page-editor\')">'+
      '<div class="hymn-card-dot" style="background:'+col+'"></div>'+
      '<div class="hymn-card-body">'+
        '<div class="hymn-card-title">'+esc(hymnTitle(h))+'</div>'+
        '<div class="hymn-card-meta">'+esc(gLabel(h.groupKey))+(h.zemari?' · '+esc(h.zemari):'')+'</div>'+
        '<div class="hymn-card-tags">'+
          '<span class="tag tag-'+esc(h.status)+'">'+esc(h.status)+'</span>'+
          bodyLangs.map(l=>'<span class="tag tag-lang">'+esc(LSHORT[l])+'</span>').join('')+
        '</div>'+
      '</div>'+
    '</div>';
  }).join('');
}
function renderStats() {
  const s = el('sidebar-stats'); if (!s) return;
  s.textContent = hymns.length + ' hymn' + (hymns.length!==1?'s':'');
}
function markSaved() {
  const b = el('unsaved-banner'); if (b) b.style.display='none';
}
function markUnsaved() {
  const b = el('unsaved-banner'); if (b) b.style.display='';
}

// ── GITHUB REFRESH ────────────────────────────────────────
async function refreshFromGitHub() {
  const btn = el('btn-refresh-gh');
  if (btn) { btn.disabled = true; btn.textContent = '⏳'; }
  try {
    await loadCatalogFromGH();
    toast('Refreshed from GitHub ✓', 'success');
  } catch(e) {
    toast('Refresh failed: '+e.message, 'error');
  } finally {
    if (btn) { btn.disabled = false; btn.textContent = '↻'; }
  }
}
async function loadCatalogFromGH() {
  const all = [];
  for (const g of GROUP_TAXONOMY) {
    try {
      const f = await ghGet(ghPath(g.key));
      if (f) { const arr = decodeGH(f.content); if (Array.isArray(arr)) all.push(...arr); }
    } catch(e) {}
  }
  ghHymns = all;
  renderCatalog();
}

// ── EDITOR ────────────────────────────────────────────────
function renderEditor() {
  const area = el('editor-area'); if (!area) return;
  const h = hymns.find(x => x.id === activeId);
  if (!h) { area.innerHTML = '<div style="color:var(--t3);padding:20px;text-align:center">Select a hymn</div>'; return; }
  // Ensure langsinger exists
  if (!h.langsinger) h.langsinger = {};

  area.innerHTML = renderMetaSection(h) + renderLangSection(h);
  wireEditor(h);
}
function renderMetaSection(h) {
  const groupOpts = ALL_GROUPS.map(k => '<option value="'+k+'"'+(h.groupKey===k?' selected':'')+'>'+esc(gLabel(k))+'</option>').join('');
  const subOpts = gSubgroups(h.groupKey).map(s => '<option value="'+s+'"'+(h.subgroups?.includes(s)?' selected':'')+'>'+esc(s)+'</option>').join('');
  const colorDots = COLORS.map(c => '<button class="color-dot" style="background:'+c+';width:22px;height:22px;border-radius:50%;border:'+(h.color===c?'2px solid white':'2px solid transparent')+';" onclick="setHymnColor(\''+c+'\')" title="'+c+'"></button>').join('');
  const ytLink = h.langs.ti?.youtube ? '<a href="'+esc(h.langs.ti.youtube)+'" target="_blank" class="youtube-link">▶ YT</a>' : '';

  return '<div class="section" id="sec-meta">'+
    '<div class="section-header" onclick="toggleSection(\'sec-meta\')">'+
      '<span class="section-toggle open" id="tog-sec-meta">›</span>'+
      '<span class="section-header-title">Mezmur Details</span>'+
    '</div>'+
    '<div class="section-body" id="body-sec-meta">'+
      '<div class="field-group">'+
        '<label class="field-label">Group</label>'+
        '<select class="field-sel" id="ed-group" onchange="onGroupChange()"><option value="">— Select Group —</option>'+groupOpts+'</select>'+
      '</div>'+
      (h.groupKey ? '<div class="field-group">'+
        '<label class="field-label">Subgroup</label>'+
        '<select class="field-sel" id="ed-subgroup" multiple style="height:auto;min-height:36px">'+subOpts+'</select>'+
      '</div>' : '')+
      '<div class="field-row">'+
        '<div class="field-group">'+
          '<label class="field-label">Status</label>'+
          '<select class="field-sel" id="ed-status">'+
            '<option value="draft"'+(h.status==='draft'?' selected':'')+'>Draft</option>'+
            '<option value="review"'+(h.status==='review'?' selected':'')+'>Needs Review</option>'+
            '<option value="final"'+(h.status==='final'?' selected':'')+'>Final</option>'+
          '</select>'+
        '</div>'+
        '<div class="field-group">'+
          '<label class="field-label">Color</label>'+
          '<div style="display:flex;gap:5px;flex-wrap:wrap;align-items:center;padding:4px 0">'+colorDots+'</div>'+
        '</div>'+
      '</div>'+
      '<div class="field-group">'+
        '<label class="field-label">YouTube Link (optional)</label>'+
        '<div class="youtube-inp-row">'+
          '<input class="field-inp" id="ed-youtube" type="url" placeholder="https://youtube.com/watch?v=…" value="'+esc(h.langs.ti?.youtube||'')+'"/>'+
          ytLink+
        '</div>'+
      '</div>'+
    '</div>'+
  '</div>';
}
function renderLangSection(h) {
  const tabs = LANGS.map((l,i) =>
    '<button class="lang-tab'+(i===0?' active':'')+(langHasBody(h.langs[l])?' has-content':'')+'" '+
    'id="ltab-'+l+'" onclick="switchLangTab(\''+l+'\')">'+esc(LSHORT[l])+'</button>'
  ).join('');
  const panels = LANGS.map((l,i) => renderLangPanel(h, l, i===0)).join('');
  return '<div class="section" id="sec-langs">'+
    '<div class="section-header" onclick="toggleSection(\'sec-langs\')">'+
      '<span class="section-toggle open" id="tog-sec-langs">›</span>'+
      '<span class="section-header-title">Lyrics by Language</span>'+
    '</div>'+
    '<div class="lang-tab-row" id="lang-tab-row">'+tabs+'</div>'+
    '<div id="lang-panels">'+panels+'</div>'+
  '</div>';
}
function renderLangPanel(h, l, isActive) {
  const ld  = h.langs[l];
  const isG = GEEZ_LANGS.has(l);
  const gc  = isG ? ' geez' : '';
  const singer = h.langsinger?.[l] || '';

  const chorus = ld.chorus || '';
  const chorusLines = chorus ? chorus.split('\n') : [''];

  const verseBlocks = (ld.verses||[]).map((v,vi) =>
    '<div class="verse-block" id="vb-'+l+'-'+vi+'">'+
      '<div class="verse-header">'+
        '<span class="verse-label">Verse '+(vi+1)+'</span>'+
        '<button class="verse-del-btn" onclick="deleteVerse(\''+l+'\','+vi+')" title="Delete verse">✕</button>'+
      '</div>'+
      '<div class="verse-lines" id="vlines-'+l+'-'+vi+'">'+
        v.lines.map((ln,li) => renderLineRow(l, vi, li, ln, isG)).join('')+
      '</div>'+
      '<button class="add-line-btn" onclick="addLine(\''+l+'\','+vi+')">+ Add line</button>'+
    '</div>'
  ).join('');

  const toolbar = isG ? renderGeezToolbar(l) : '';

  return '<div class="lang-panel'+(isActive?' active':'')+'" id="lpanel-'+l+'">'+
    (toolbar)+
    '<div class="field-group">'+
      '<label class="field-label">Title'+( isG?' (Ge\'ez script required)':'')+'</label>'+
      '<input class="field-inp'+gc+'" id="ed-title-'+l+'" type="text" placeholder="'+esc(LNAME[l])+' title" value="'+esc(ld.title||'')+'"/>'+
    '</div>'+
    '<div class="field-group">'+
      '<label class="field-label">Singer / Zemari</label>'+
      '<input class="field-inp'+gc+'" id="ed-singer-'+l+'" type="text" placeholder="Singer name" value="'+esc(singer)+'"/>'+
    '</div>'+
    '<div class="field-group">'+
      '<label class="field-label">Chorus (repeated refrain)</label>'+
      '<textarea class="field-inp'+gc+'" id="ed-chorus-'+l+'" rows="3" placeholder="Enter chorus lines…">'+esc(chorus)+'</textarea>'+
    '</div>'+
    verseBlocks+
    '<button class="add-verse-btn" onclick="addVerse(\''+l+'\')">+ Add verse</button>'+
  '</div>';
}
function renderLineRow(l, vi, li, ln, isG) {
  const gc = isG ? ' geez' : '';
  return '<div class="line-row" id="lr-'+l+'-'+vi+'-'+li+'">'+
    '<input class="line-prefix-inp" id="pfx-'+l+'-'+vi+'-'+li+'" type="text" placeholder="V1" value="'+esc(ln.prefix||'')+'"/>'+
    '<textarea class="line-text-inp'+gc+'" id="ltxt-'+l+'-'+vi+'-'+li+'" rows="1" placeholder="Line text…">'+esc(ln.text||'')+'</textarea>'+
    '<button class="line-del-btn" onclick="deleteLine(\''+l+'\','+vi+','+li+')" title="Delete line">✕</button>'+
  '</div>';
}
function renderGeezToolbar(l) {
  const btns = GEEZ_PUNCT.map(p =>
    '<button class="geez-btn" onclick="insertGeez(\''+esc(p)+'\',\''+l+'\')" title="'+esc(p)+'">'+esc(p)+'</button>'
  ).join('');
  return '<div class="geez-toolbar" id="geez-tb-'+l+'">'+btns+'</div>';
}

function insertGeez(char, l) {
  // Insert into last focused Ge'ez input in that panel
  const panel = el('lpanel-'+l); if (!panel) return;
  const focused = panel.querySelector(':focus');
  if (focused && (focused.tagName==='INPUT'||focused.tagName==='TEXTAREA')) {
    const start = focused.selectionStart, end = focused.selectionEnd;
    focused.value = focused.value.slice(0,start) + char + focused.value.slice(end);
    focused.selectionStart = focused.selectionEnd = start + char.length;
    focused.dispatchEvent(new Event('input'));
  }
}

function wireEditor(h) {
  // Meta fields
  const groupSel = el('ed-group');
  if (groupSel) groupSel.addEventListener('change', onGroupChange);
  const subSel = el('ed-subgroup');
  if (subSel) subSel.addEventListener('change', () => {
    h.subgroups = Array.from(subSel.selectedOptions).map(o => o.value);
    save(); markUnsaved();
  });
  const statusSel = el('ed-status');
  if (statusSel) statusSel.addEventListener('change', () => { h.status = statusSel.value; save(); markUnsaved(); renderList(); });
  const ytInp = el('ed-youtube');
  if (ytInp) ytInp.addEventListener('input', () => { if (!h.langs.ti) h.langs.ti = newLang(); h.langs.ti.youtube = ytInp.value; save(); markUnsaved(); });

  // Lang fields
  LANGS.forEach(l => {
    const ld = h.langs[l];
    const titleInp = el('ed-title-'+l);
    if (titleInp) titleInp.addEventListener('input', () => { ld.title = titleInp.value; h.updatedAt = new Date().toISOString(); save(); markUnsaved(); updateLangTab(l, h); });
    const singerInp = el('ed-singer-'+l);
    if (singerInp) singerInp.addEventListener('input', () => { if (!h.langsinger) h.langsinger={}; h.langsinger[l] = singerInp.value; save(); markUnsaved(); });
    const chorusInp = el('ed-chorus-'+l);
    if (chorusInp) {
      autoResize(chorusInp);
      chorusInp.addEventListener('input', () => { ld.chorus = chorusInp.value; h.updatedAt = new Date().toISOString(); save(); markUnsaved(); updateLangTab(l, h); autoResize(chorusInp); });
    }
    // Verse lines
    (ld.verses||[]).forEach((v,vi) => {
      v.lines.forEach((ln,li) => {
        const pfxInp = el('pfx-'+l+'-'+vi+'-'+li);
        const txtInp = el('ltxt-'+l+'-'+vi+'-'+li);
        if (pfxInp) pfxInp.addEventListener('input', () => { ln.prefix = pfxInp.value; save(); markUnsaved(); });
        if (txtInp) {
          autoResize(txtInp);
          txtInp.addEventListener('input', () => { ln.text = txtInp.value; h.updatedAt = new Date().toISOString(); save(); markUnsaved(); updateLangTab(l, h); autoResize(txtInp); });
        }
      });
    });
  });
}
function autoResize(el_) {
  el_.style.height = 'auto';
  el_.style.height = el_.scrollHeight + 'px';
}

function onGroupChange() {
  const h = hymns.find(x => x.id === activeId); if (!h) return;
  const sel = el('ed-group'); if (!sel) return;
  h.groupKey = sel.value;
  h.subgroups = [];
  save(); markUnsaved();
  renderEditor();
}
function setHymnColor(c) {
  const h = hymns.find(x => x.id === activeId); if (!h) return;
  h.color = c; save(); markUnsaved();
  renderEditor();
}
function toggleSection(id) {
  const body = el('body-'+id), tog = el('tog-'+id); if (!body||!tog) return;
  const collapsed = body.classList.toggle('collapsed');
  if (collapsed) tog.classList.remove('open'); else tog.classList.add('open');
}
function switchLangTab(l) {
  document.querySelectorAll('.lang-tab').forEach(t => t.classList.remove('active'));
  document.querySelectorAll('.lang-panel').forEach(p => p.style.display='none');
  const tab = el('ltab-'+l), panel = el('lpanel-'+l);
  if (tab) tab.classList.add('active');
  if (panel) { panel.style.display='flex'; panel.style.flexDirection='column'; }
}
function updateLangTab(l, h) {
  const tab = el('ltab-'+l); if (!tab) return;
  if (langHasBody(h.langs[l])) tab.classList.add('has-content');
  else tab.classList.remove('has-content');
}

// Verse / line mutators
function addVerse(l) {
  const h = hymns.find(x => x.id === activeId); if (!h) return;
  if (!h.langs[l]) h.langs[l] = newLang();
  if (!h.langs[l].verses) h.langs[l].verses = [];
  h.langs[l].verses.push(newVerse());
  save(); markUnsaved();
  renderEditor();
  switchLangTab(l);
}
function deleteVerse(l, vi) {
  const h = hymns.find(x => x.id === activeId); if (!h) return;
  h.langs[l].verses.splice(vi, 1);
  save(); markUnsaved();
  renderEditor();
  switchLangTab(l);
}
function addLine(l, vi) {
  const h = hymns.find(x => x.id === activeId); if (!h) return;
  h.langs[l].verses[vi].lines.push(newLine());
  save(); markUnsaved();
  renderEditor();
  switchLangTab(l);
}
function deleteLine(l, vi, li) {
  const h = hymns.find(x => x.id === activeId); if (!h) return;
  const lines = h.langs[l].verses[vi].lines;
  if (lines.length <= 1) { toast('Verse needs at least one line', 'warn'); return; }
  lines.splice(li, 1);
  save(); markUnsaved();
  renderEditor();
  switchLangTab(l);
}

// ── PREVIEW ───────────────────────────────────────────────
function showPreview() {
  const h = hymns.find(x => x.id === activeId); if (!h) return;
  previewShown = true;
  const bodyLangs = LANGS.filter(l => langHasBody(h.langs[l]));
  if (!bodyLangs.length) { toast('No lyrics to preview yet', 'warn'); return; }
  const tabEl = el('preview-lang-tabs');
  const content = el('preview-content');
  if (tabEl) tabEl.innerHTML = bodyLangs.map((l,i) =>
    '<button class="preview-lang-tab'+(i===0?' active':'')+'" onclick="switchPreviewTab(\''+l+'\')">'+esc(LNAME[l])+'</button>'
  ).join('');
  if (content) content.innerHTML = bodyLangs.map((l,i) => renderPreviewPanel(h, l, i===0)).join('');
  openSheet('sheet-preview');
}
function switchPreviewTab(l) {
  document.querySelectorAll('.preview-lang-tab').forEach(t => t.classList.remove('active'));
  document.querySelectorAll('.preview-lang-panel').forEach(p => p.classList.remove('active'));
  const btns = document.querySelectorAll('.preview-lang-tab');
  btns.forEach(b => { if (b.textContent === LNAME[l]) b.classList.add('active'); });
  const panel = el('pv-'+l); if (panel) panel.classList.add('active');
}
function renderPreviewPanel(h, l, isActive) {
  const ld = h.langs[l];
  const singer = h.langsinger?.[l] || h.zemari || '';
  let html = '<div class="preview-lang-panel'+(isActive?' active':'')+'" id="pv-'+l+'">';
  if (ld.title) html += '<div class="preview-title">'+esc(ld.title)+'</div>';
  if (singer)   html += '<div class="preview-singer">'+esc(singer)+'</div>';
  if (ld.chorus?.trim()) {
    html += '<div class="preview-chorus-label">Chorus</div><div class="preview-chorus">';
    ld.chorus.split('\n').forEach(line => { html += '<div class="preview-line">'+esc(line)+'</div>'; });
    html += '</div>';
  }
  (ld.verses||[]).forEach((v,i) => {
    html += '<div class="preview-verse"><div class="preview-verse-label">Verse '+(i+1)+'</div>';
    v.lines.forEach(ln => {
      html += '<div class="preview-line">'+(ln.prefix?'<span class="preview-prefix">'+esc(ln.prefix)+'</span>':'')+esc(ln.text)+'</div>';
    });
    html += '</div>';
  });
  html += '</div>';
  return html;
}

// ── SUBMIT ────────────────────────────────────────────────
function startSubmit() {
  const h = hymns.find(x => x.id === activeId); if (!h) return;
  if (!previewShown) {
    // Show preview reminder
    const skip = el('remind-skip'), prev = el('remind-preview');
    if (skip) skip.onclick = () => { closeSheet('sheet-preview-remind'); showSubmitConfirm(h); };
    if (prev) prev.onclick = () => { closeSheet('sheet-preview-remind'); showPreview(); };
    openSheet('sheet-preview-remind');
    return;
  }
  showSubmitConfirm(h);
}
function showSubmitConfirm(h) {
  if (!h) return;
  const bodyLangs = LANGS.filter(l => langHasBody(h.langs[l]));
  const sumEl = el('submit-summary');
  if (sumEl) sumEl.innerHTML =
    '<strong>'+esc(hymnTitle(h))+'</strong><br>'+
    'Group: <strong>'+esc(gLabel(h.groupKey))+'</strong><br>'+
    (bodyLangs.length ? 'Languages: <strong>'+bodyLangs.map(l=>esc(LNAME[l])).join(', ')+'</strong><br>' : '')+
    (h.zemari ? 'Zemari: <strong>'+esc(h.zemari)+'</strong>' : '');

  // Quality checklist
  const checks = validateHymn(h);
  const ql = el('quality-checklist');
  if (ql) ql.innerHTML = checks.map(c =>
    '<div class="quality-item '+c.level+'">'+
      '<span class="quality-item-icon">'+(c.level==='ok'?'✓':c.level==='warn'?'⚠':'✕')+'</span>'+
      '<span>'+esc(c.msg)+'</span>'+
    '</div>'
  ).join('');

  openSheet('sheet-submit-confirm');
}
function validateHymn(h) {
  const checks = [];
  if (h.groupKey) checks.push({level:'ok', msg:'Group selected: '+gLabel(h.groupKey)});
  else checks.push({level:'fail', msg:'No group selected'});
  const bodyLangs = LANGS.filter(l => langHasBody(h.langs[l]));
  if (bodyLangs.length) checks.push({level:'ok', msg:'Has lyrics in: '+bodyLangs.map(l=>LSHORT[l]).join(', ')});
  else checks.push({level:'fail', msg:'No lyrics entered'});
  // Per-language: title and singer required if that lang has content
  bodyLangs.forEach(l => {
    const ld = h.langs[l];
    const singer = h.langsinger?.[l] || '';
    if (!ld.title?.trim()) checks.push({level:'warn', msg:LNAME[l]+': missing title'});
    if (!singer.trim()) checks.push({level:'warn', msg:LNAME[l]+': missing singer name'});
  });
  // Ge'ez langs check
  ['ti','am'].forEach(l => {
    if (langHasBody(h.langs[l])) {
      const ld = h.langs[l];
      if (!ld.title?.trim()) checks.push({level:'warn', msg:LNAME[l]+': title should be in Ge\'ez script'});
    }
  });
  return checks;
}

async function doSubmit() {
  const h = hymns.find(x => x.id === activeId); if (!h) return;
  const btn = el('btn-confirm-submit');
  if (btn) { btn.disabled = true; btn.textContent = 'Submitting…'; }
  try {
    const res = await submitToGitHub(h);
    recordPOW(h, res.sha);
    h.status = 'final'; h.updatedAt = new Date().toISOString();
    save();
    closeSheet('sheet-submit-confirm');
    const msgEl = el('submitted-msg');
    if (msgEl) msgEl.textContent = hymnTitle(h) + ' submitted successfully.';
    openSheet('sheet-submitted');
  } catch(e) {
    // Save to pending
    pendingSync.push({ hymn:JSON.parse(JSON.stringify(h)), failedAt: new Date().toISOString(), error: e.message });
    savePending();
    closeSheet('sheet-submit-confirm');
    toast('GitHub error — saved to pending: '+e.message, 'error', 4000);
  } finally {
    if (btn) { btn.disabled = false; btn.textContent = 'Submit to GitHub ✝'; }
  }
}
async function submitToGitHub(h) {
  if (!h.groupKey) throw new Error('No group selected');
  const path = ghPath(h.groupKey);
  let file;
  try { file = await ghGet(path); } catch(e) { file = null; }
  let arr = [];
  if (file) {
    try { arr = decodeGH(file.content); if (!Array.isArray(arr)) arr = []; } catch(e) { arr = []; }
  }
  const idx = arr.findIndex(x => x.id === h.id);
  const entry = { ...h, submittedBy: contributorName, submittedAt: new Date().toISOString() };
  if (idx >= 0) arr[idx] = entry; else arr.push(entry);
  const res = await ghPut(path, arr, file?.sha || null, 'Mezmur: '+hymnTitle(h)+' — '+contributorName);
  return { sha: res.content?.sha || '' };
}
function recordPOW(h, sha) {
  const bodyLangs = LANGS.filter(l => langHasBody(h.langs[l]));
  const wordCount = bodyLangs.reduce((s,l) => {
    const ld = h.langs[l];
    const text = [ld.chorus||'', ...(ld.verses||[]).flatMap(v => v.lines.map(ln=>ln.text||''))].join(' ');
    return s + text.split(/\s+/).filter(Boolean).length;
  }, 0);
  const rec = {
    id: uid(), name: contributorName, title: hymnTitle(h), group: gLabel(h.groupKey),
    langs: bodyLangs.map(l=>LSHORT[l]).join(','),
    wordCount, charCount: 0, sha,
    submittedAt: new Date().toISOString(),
    sessionClockIn: clockedInAt?.toISOString() || '',
    sessionElapsedAtSubmit: clockedInAt ? formatDuration(Date.now()-clockedInAt.getTime()) : '',
    hymnId: h.id
  };
  powLog.unshift(rec);
  savePOW();
  // Write to GitHub
  (async () => {
    try {
      const f = await ghGet(ghPowPath());
      const arr = f ? decodeGH(f.content) : [];
      arr.unshift(rec);
      await ghPut(ghPowPath(), arr, f?.sha||null, 'POW: '+contributorName);
    } catch(e) {}
  })();
}
function onSubmitOk() {
  closeSheet('sheet-submitted');
  previewShown = false;
  showPage('page-list');
  renderList();
  renderStats();
  renderPOW();
}

// ── PROOF OF WORK ─────────────────────────────────────────
function renderPOW() {
  const nameEl = el('pow-name'), statsEl = el('pow-stats'), list = el('pow-list');
  if (nameEl) nameEl.textContent = contributorName || '—';
  const mine = powLog.filter(r => r.name === contributorName);
  if (statsEl) statsEl.textContent = mine.length + ' submission' + (mine.length!==1?'s':'');
  if (!list) return;
  if (!mine.length) { list.innerHTML = '<div style="color:var(--t3);font-size:13px;padding:16px;text-align:center">No submissions yet</div>'; return; }
  list.innerHTML = mine.map(r =>
    '<div class="pow-card">'+
    '<div class="pow-card-title">'+esc(r.title||'—')+'</div>'+
    '<div class="pow-card-meta">'+esc(r.group||'—')+(r.langs?' · '+esc(r.langs):'')+'</div>'+
    '<div class="pow-card-stats">'+esc(String(r.wordCount||0))+' words · '+fmtDate(r.submittedAt)+'</div>'+
    (r.sha ? '<a href="https://github.com/'+REPO.owner+'/'+REPO.repo+'/commit/'+esc(r.sha)+'" target="_blank" class="pow-card-commit">↗ View commit</a>' : '')+
    '</div>'
  ).join('');
}
function exportPOW() {
  if (!powLog.length) { toast('No data to export', 'error'); return; }
  const mine = powLog.filter(r => r.name === contributorName);
  if (!mine.length) { toast('No submissions to export', 'warn'); return; }
  const hdrs = ['Title','Group','Languages','Submitted At','Words','SHA'];
  const rows = mine.map(r => [r.title||'',r.group||'',r.langs||'',r.submittedAt||'',r.wordCount||0,r.sha||''].map(v=>'"'+String(v).replace(/"/g,'""')+'"'));
  const csv  = [hdrs.join(','), ...rows.map(r=>r.join(','))].join('\n');
  const blob = new Blob([csv],{type:'text/csv'});
  const a = document.createElement('a'); a.href = URL.createObjectURL(blob);
  a.download = 'pow-'+contributorName.replace(/\s+/g,'-')+'-'+Date.now()+'.csv'; a.click();
  URL.revokeObjectURL(a.href);
  toast('Exported ✓', 'success');
}

// ── CATALOG ───────────────────────────────────────────────
function renderCatalog() {
  const list  = el('catalog-list');
  const count = el('catalog-count');
  if (!list) return;
  const q    = (el('catalog-search')?.value||'').toLowerCase();
  const grp  = el('catalog-group')?.value||'';
  const langF= el('catalog-lang-filter')?.value||'';
  let items = [...ghHymns];
  if (grp)  items = items.filter(h => h.groupKey === grp);
  if (q)    items = items.filter(h => [hymnTitle(h), h.zemari||'', gLabel(h.groupKey)].join(' ').toLowerCase().includes(q));
  if (langF.startsWith('missing-')) {
    const ml = langF.replace('missing-','');
    items = items.filter(h => !langHasBody(h.langs[ml]));
  }
  if (count) count.textContent = items.length + ' mezmur' + (items.length!==1?'s':'');
  if (!items.length) { list.innerHTML = '<div style="color:var(--t3);font-size:13px;padding:16px;text-align:center">No results</div>'; return; }
  list.innerHTML = items.map(h => {
    const bodyLangs = LANGS.filter(l => langHasBody(h.langs[l]));
    const missLangs = LANGS.filter(l => !langHasBody(h.langs[l]));
    return '<div class="catalog-card" onclick="openFromCatalog(\''+esc(h.id)+'\')">'+
      '<div class="catalog-card-title">'+esc(hymnTitle(h))+'</div>'+
      '<div class="catalog-card-meta">'+esc(gLabel(h.groupKey))+(h.zemari?' · '+esc(h.zemari):'')+'</div>'+
      '<div class="missing-lang-row">'+
        bodyLangs.map(l=>'<span class="has-tag">'+esc(LSHORT[l])+'</span>').join('')+
        missLangs.map(l=>'<span class="missing-tag">'+esc(LSHORT[l])+'</span>').join('')+
      '</div>'+
    '</div>';
  }).join('');
}
function openFromCatalog(id) {
  const h = ghHymns.find(x => x.id === id); if (!h) return;
  const existing = hymns.find(x => x.id === id);
  if (existing) { selectHymn(id); } else { hymns.unshift({...h, langsinger: h.langsinger||{}}); save(); selectHymn(id); }
  showPage('page-editor');
}

// ── ADMIN PAGE ────────────────────────────────────────────
async function openAdminPage() {
  closeSheet('sheet-admin');
  showPage('page-admin');
  await loadAdminData();
}
async function loadAdminData() {
  const allPow  = await loadGHJson(ghPowPath())  || [];
  const allSess = await loadGHJson(ghSessionsPath()) || [];
  const localPow  = powLog.filter(r => !allPow.find(x => x.id === r.id));
  const localSess = sessions.filter(r => !allSess.find(x => x.id === r.id));
  const combinedPow  = [...allPow,  ...localPow ].sort((a,b) => new Date(b.submittedAt)-new Date(a.submittedAt));
  const combinedSess = [...allSess, ...localSess].sort((a,b) => new Date(b.clockedIn)-new Date(a.clockedIn));
  window._adminPow  = combinedPow;
  window._adminSess = combinedSess;
  renderAdminSummary(combinedPow, combinedSess);
  renderAdminDaily(combinedPow);
  renderAdminSessions(combinedSess);
  renderAdminSubmissions(combinedPow);
}
function filterAdminData() {
  const search = (el('admin-search')?.value||'').toLowerCase();
  const from   = el('admin-date-from')?.value;
  const to     = el('admin-date-to')?.value;
  let pow  = window._adminPow  || [];
  let sess = window._adminSess || [];
  if (search) { pow = pow.filter(r=>(r.name||'').toLowerCase().includes(search)); sess = sess.filter(r=>(r.name||'').toLowerCase().includes(search)); }
  if (from)   { pow = pow.filter(r=>new Date(r.submittedAt)>=new Date(from)); sess = sess.filter(r=>new Date(r.clockedIn)>=new Date(from)); }
  if (to)     { const toEnd=new Date(to); toEnd.setHours(23,59,59); pow=pow.filter(r=>new Date(r.submittedAt)<=toEnd); sess=sess.filter(r=>new Date(r.clockedIn)<=toEnd); }
  renderAdminSummary(pow, sess);
  renderAdminDaily(pow);
  renderAdminSessions(sess);
  renderAdminSubmissions(pow);
}
function renderAdminSummary(pow, sess) {
  const contributors = new Set(pow.map(r=>r.name||'').filter(Boolean));
  const totalWords = pow.reduce((s,r)=>s+(r.wordCount||0),0);
  const totalMins  = sess.reduce((s,r)=>s+Math.round((r.durationMs||0)/60000),0);
  el('admin-summary-row').innerHTML =
    tile(pow.length,'Total Hymns') + tile(contributors.size,'Contributors') +
    tile(totalWords.toLocaleString(),'Total Words') + tile(totalMins+' min','Total Time');
}
function tile(num, label) {
  return '<div class="admin-stat-tile"><div class="admin-stat-num">'+esc(String(num))+'</div><div class="admin-stat-label">'+esc(label)+'</div></div>';
}
function renderAdminDaily(pow) {
  const byDay = {};
  pow.forEach(r => { const d=(r.submittedAt||'').slice(0,10); if(!byDay[d])byDay[d]=[]; byDay[d].push(r); });
  const days = Object.keys(byDay).sort((a,b)=>b.localeCompare(a));
  if (!days.length) { el('admin-daily').innerHTML='<div style="color:var(--t3);font-size:13px;padding:8px">No submissions yet</div>'; return; }
  el('admin-daily').innerHTML = days.map(day => {
    const entries = byDay[day];
    const contributors = new Set(entries.map(r=>r.name||''));
    const totalW = entries.reduce((s,r)=>s+(r.wordCount||0),0);
    const rows = entries.map(r =>
      '<div class="admin-row">'+
      '<span class="admin-row-name">'+esc(r.name||'—')+'</span>'+
      '<span class="admin-row-title">'+esc(r.title||'—')+'</span>'+
      '<span class="admin-row-words">'+esc(String(r.wordCount||0))+'w</span>'+
      '<span class="admin-row-time">'+fmtTime(r.submittedAt)+'</span>'+
      (r.sha?'<a href="https://github.com/'+REPO.owner+'/'+REPO.repo+'/commit/'+esc(r.sha)+'" target="_blank" class="admin-row-commit">↗</a>':'')+
      '</div>'
    ).join('');
    return '<div class="admin-day-card">'+
      '<div class="admin-day-header">'+
        '<span class="admin-day-date">'+fmtDateShort(day+'T12:00:00')+'</span>'+
        '<span class="admin-day-counts">'+
          '<span class="admin-day-count"><span>'+entries.length+'</span> hymns</span>'+
          '<span class="admin-day-count"><span>'+contributors.size+'</span> contributors</span>'+
          '<span class="admin-day-count"><span>'+totalW+'</span> words</span>'+
        '</span>'+
      '</div>'+
      '<div class="admin-day-rows">'+rows+'</div>'+
    '</div>';
  }).join('');
}
function renderAdminSessions(sess) {
  if (!sess.length) { el('admin-sessions').innerHTML='<div style="color:var(--t3);font-size:13px;padding:8px">No sessions logged yet</div>'; return; }
  el('admin-sessions').innerHTML = sess.map(s =>
    '<div class="session-row">'+
    '<span class="session-row-name">'+esc(s.name||'—')+'</span>'+
    '<span class="session-row-in">In: '+fmtDate(s.clockedIn)+'</span>'+
    '<span class="session-row-out">Out: '+(s.clockedOut?fmtDate(s.clockedOut):'— (active)')+'</span>'+
    '<span class="session-row-dur">'+(s.durationMs?formatDuration(s.durationMs):'—')+'</span>'+
    '<span style="font-size:11px;color:var(--t3)">'+esc(String(s.submissionsInSession||0))+' hymns</span>'+
    '</div>'
  ).join('');
}
function renderAdminSubmissions(pow) {
  if (!pow.length) { el('admin-submissions').innerHTML='<div style="color:var(--t3);font-size:13px;padding:8px">No submissions yet</div>'; return; }
  el('admin-submissions').innerHTML = pow.map(r =>
    '<div class="admin-row" style="background:var(--bg2);border-radius:var(--r-sm);margin-bottom:4px">'+
    '<span class="admin-row-name">'+esc(r.name||contributorName)+'</span>'+
    '<span class="admin-row-title">'+esc(r.title||'—')+'</span>'+
    '<span class="admin-row-words">'+esc(String(r.wordCount||0))+'w</span>'+
    '<span class="admin-row-time">'+fmtDate(r.submittedAt)+'</span>'+
    (r.sha?'<a href="https://github.com/'+REPO.owner+'/'+REPO.repo+'/commit/'+esc(r.sha)+'" target="_blank" class="admin-row-commit">↗</a>':'')+
    '</div>'
  ).join('');
}
function exportAdminCSV() {
  const pow = window._adminPow||[]; if (!pow.length) { toast('No data to export','error'); return; }
  const hdrs = ['Name','Title','Group','Languages','Submitted At','Words','SHA'];
  const rows = pow.map(r => [r.name||'',r.title||'',r.group||'',r.langs||'',r.submittedAt||'',r.wordCount||0,r.sha||''].map(v=>'"'+String(v).replace(/"/g,'""')+'"'));
  const csv  = [hdrs.join(','), ...rows.map(r=>r.join(','))].join('\n');
  const blob = new Blob([csv],{type:'text/csv'});
  const a = document.createElement('a'); a.href=URL.createObjectURL(blob);
  a.download='wazema-admin-'+Date.now()+'.csv'; a.click(); URL.revokeObjectURL(a.href);
  toast('Admin CSV exported ✓','success');
}

// ── PENDING SYNC ──────────────────────────────────────────
async function retryPending() {
  if (!pendingSync.length) { toast('No pending submissions'); return; }
  const btn = el('btn-retry-pending');
  if (btn) { btn.disabled=true; btn.textContent='Retrying…'; }
  let ok=0; const remaining=[];
  for (const p of pendingSync) {
    try { const res=await submitToGitHub(p.hymn); recordPOW(p.hymn,res.sha); ok++; }
    catch(e) { remaining.push(p); }
  }
  pendingSync=remaining; savePending();
  if (btn) { btn.disabled=false; btn.textContent='↻ Retry All'; }
  toast(ok+' submitted'+(remaining.length?', '+remaining.length+' still failed':' ✓'), ok&&!remaining.length?'success':'error');
  renderPendingList();
}
function renderPendingList() {
  const wrap=el('pending-list'); if (!wrap) return;
  if (!pendingSync.length) { wrap.innerHTML='<div style="color:var(--t3);font-size:13px;padding:8px 0">No pending submissions</div>'; return; }
  wrap.innerHTML=pendingSync.map(p =>
    '<div class="pending-item"><div class="pending-item-title">'+esc(hymnTitle(p.hymn))+'</div>'+
    '<div class="pending-item-meta">Failed '+fmtDate(p.failedAt)+' · '+esc(p.error||'')+'</div></div>'
  ).join('');
}

// ── ADMIN: INIT FILES ─────────────────────────────────────
async function initGHFiles() {
  const log=el('admin-init-log'), btn=el('btn-init-files');
  if (log) log.innerHTML='';
  if (btn) btn.disabled=true;
  for (const k of ALL_GROUPS) {
    const path=ghPath(k);
    try {
      const ex=await ghGet(path);
      if (ex) appendLog(log,'✓ '+path,'skip');
      else { await ghPut(path,[],null,'Init '+k); appendLog(log,'✝ Created '+path,'ok'); }
    } catch(e) { appendLog(log,'✕ '+path+' — '+e.message,'fail'); }
    await new Promise(r=>setTimeout(r,300));
  }
  for (const path of [ghSessionsPath(),ghPowPath()]) {
    try {
      const ex=await ghGet(path);
      if (ex) appendLog(log,'✓ '+path,'skip');
      else { await ghPut(path,[],null,'Init admin log'); appendLog(log,'✝ Created '+path,'ok'); }
    } catch(e) { appendLog(log,'✕ '+path+' — '+e.message,'fail'); }
    await new Promise(r=>setTimeout(r,300));
  }
  if (btn) btn.disabled=false;
  toast('Init complete','success');
}
function appendLog(logEl, msg, type) {
  if (!logEl) return;
  const d=document.createElement('div');
  d.className='admin-log-line admin-log-'+type; d.textContent=msg;
  logEl.appendChild(d); logEl.scrollTop=logEl.scrollHeight;
}

// ── 5-TAP ADMIN ───────────────────────────────────────────
function handleTitleTap() {
  tapCount++; clearTimeout(tapTimer);
  tapTimer=setTimeout(()=>tapCount=0, 2000);
  if (tapCount>=5) { tapCount=0; openSheet('sheet-admin'); }
}

// ── INIT ──────────────────────────────────────────────────
function init() {
  // Resume session
  const saved = (() => { try { const d=localStorage.getItem(AUTH_KEY); return d?JSON.parse(d):null; } catch(e){return null;} })();
  if (sessionStorage.getItem(SESSION_K)==='1' && saved?.token) {
    contributorName=saved.name||''; ghToken=saved.token;
    showApp();
  }

  // Login
  el('login-btn')?.addEventListener('click', submitLogin);
  el('login-token')?.addEventListener('keydown', e=>{ if(e.key==='Enter') submitLogin(); });
  el('login-name')?.addEventListener('keydown',  e=>{ if(e.key==='Enter') el('login-token')?.focus(); });

  // 5-tap
  document.querySelectorAll('[data-admin-tap]').forEach(t=>t.addEventListener('click',handleTitleTap));

  // List page
  el('btn-new-top')?.addEventListener('click', addNewHymn);
  el('btn-refresh-gh')?.addEventListener('click', refreshFromGitHub);
  el('search-input')?.addEventListener('input', renderList);
  el('filter-group')?.addEventListener('change', renderList);
  el('filter-status')?.addEventListener('change', renderList);

  // Clock
  el('btn-clock-in')?.addEventListener('click', clockIn);
  el('btn-clock-out')?.addEventListener('click', confirmClockOut);
  el('btn-confirm-clockout')?.addEventListener('click', doClockOut);

  // Editor
  el('btn-back')?.addEventListener('click', ()=>{ save(); markSaved(); clearInterval(draftSaveTimer); showPage('page-list'); renderList(); });
  el('btn-preview')?.addEventListener('click', showPreview);
  el('btn-submit-hymn')?.addEventListener('click', startSubmit);
  el('preview-close')?.addEventListener('click', ()=>closeSheet('sheet-preview'));

  // Tab nav
  el('nav-editor')?.addEventListener('click',    ()=>{ showPage('page-list'); switchTab('editor'); });
  el('nav-catalog')?.addEventListener('click',   ()=>{ showPage('page-list'); switchTab('catalog'); });
  el('nav-proofwork')?.addEventListener('click', ()=>{ showPage('page-list'); switchTab('proofwork'); });

  // Catalog
  el('catalog-search')?.addEventListener('input', renderCatalog);
  el('catalog-group')?.addEventListener('change', renderCatalog);
  el('catalog-lang-filter')?.addEventListener('change', renderCatalog);

  // POW
  el('btn-export-pow')?.addEventListener('click', exportPOW);

  // Sheets: close on overlay click
  document.querySelectorAll('.sheet-overlay').forEach(s=>s.addEventListener('click', e=>{ if(e.target===s) s.style.display='none'; }));

  // Submit
  el('btn-confirm-submit')?.addEventListener('click', doSubmit);
  el('submitted-ok')?.addEventListener('click', onSubmitOk);
  el('dup-open')?.addEventListener('click', ()=>closeSheet('sheet-dup'));
  el('dup-new')?.addEventListener('click',  ()=>{ closeSheet('sheet-dup'); const h=hymns.find(x=>x.id===activeId); if(h) showSubmitConfirm(h); });

  // Pending
  el('btn-retry-pending')?.addEventListener('click', retryPending);

  // Admin sheet
  el('btn-init-files')?.addEventListener('click', initGHFiles);
  el('btn-logout')?.addEventListener('click', logout);
  el('btn-open-admin-page')?.addEventListener('click', openAdminPage);

  // Admin page
  el('btn-admin-back')?.addEventListener('click', ()=>showPage('page-list'));
  el('btn-export-admin-csv')?.addEventListener('click', exportAdminCSV);
  el('btn-admin-filter')?.addEventListener('click', filterAdminData);

  // Keyboard save
  document.addEventListener('keydown', e=>{
    if ((e.ctrlKey||e.metaKey)&&e.key==='s') { e.preventDefault(); save(); markSaved(); toast('Saved ✓','success'); }
  });
}

document.addEventListener('DOMContentLoaded', init);
