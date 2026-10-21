/* ═══════════════════════════════════════════════════════════
   WAZEMA · app.js v8
   Eritrean Orthodox Tewahedo Church Hymn Entry Tool
   Full rewrite — Apple-inspired UI, Special Lines clearly labeled
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
  { key:'mezmur',         label:'Mezmur',          file:'mezmur.json',         subgroups:['ፍቅሪ','ስብሓት','ምስጋና'] },
  { key:'qidase',         label:'Qidase',           file:'qidase.json',         subgroups:['ቅዱስ ዮሃንስ','ቅዱስ ያዕቆብ'] },
  { key:'mihlla',         label:'Mihlla',           file:'mihlla.json',         subgroups:[] },
  { key:'mewasit',        label:'Mewasit',          file:'mewasit.json',        subgroups:[] },
  { key:'atsme_saat',     label:'Atsme Saat',       file:'atsme_saat.json',     subgroups:[] },
  { key:'deggua',         label:'Deggua',           file:'deggua.json',         subgroups:[] },
  { key:'special',        label:'Special Occasions',file:'special.json',        subgroups:['ልደት','ትንሳኤ','ጥምቀት'] },
  { key:'marian',         label:'Marian Hymns',     file:'marian.json',         subgroups:[] },
  { key:'saints',         label:'Saints',           file:'saints.json',         subgroups:[] },
  { key:'youth',          label:'Youth / Sunday School', file:'youth.json',     subgroups:[] },
  { key:'other',          label:'Other',            file:'other.json',          subgroups:[] },
];
const ALL_GROUPS = GROUP_TAXONOMY.map(g => g.key);

// ── STATE ─────────────────────────────────────────────────
let hymns          = [];
let powLog         = [];
let pendingSync    = [];
let sessions       = [];
let activeId       = null;
let activeLang     = 'ti';
let contributorName= '';
let ghToken        = '';
let clockedInAt    = null;
let clockTimer     = null;
let catalogHymns   = [];
let geezFocusEl    = null;
let draftTimer     = null;
let previewHadLook = false;

// ── UTILS ─────────────────────────────────────────────────
function el(id)    { return document.getElementById(id); }
function uid()     { return Date.now().toString(36) + Math.random().toString(36).slice(2,7); }
function esc(s)    { return String(s||'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;'); }
function noop()    {}

// ── STORAGE ───────────────────────────────────────────────
function save()   { try { localStorage.setItem(HYMN_KEY,    JSON.stringify(hymns));       } catch(e){} }
function load()   { try { const d=localStorage.getItem(HYMN_KEY);    hymns=d?JSON.parse(d):[]; } catch(e){ hymns=[]; } }
function savePOW() { try { localStorage.setItem(POW_KEY,    JSON.stringify(powLog));      } catch(e){} }
function loadPOW() { try { const d=localStorage.getItem(POW_KEY);    powLog=d?JSON.parse(d):[]; } catch(e){ powLog=[]; } }
function savePending() { try { localStorage.setItem(PENDING_KEY, JSON.stringify(pendingSync)); } catch(e){} }
function loadPending() { try { const d=localStorage.getItem(PENDING_KEY); pendingSync=d?JSON.parse(d):[]; } catch(e){ pendingSync=[]; } }
function loadSessions(){ try { const d=localStorage.getItem(SESSIONS_K); sessions=d?JSON.parse(d):[]; } catch(e){ sessions=[]; } }
function saveSessions(){ try { localStorage.setItem(SESSIONS_K, JSON.stringify(sessions)); } catch(e){} }

// ── DATA MODEL ────────────────────────────────────────────
function newLang() {
  return { title:'', subtitle:'', chorus:'', verses:[], youtube:'', groupName:'' };
}
function newLine(t='') {
  return { text:t };
}
function newVerse() {
  // specialBefore: lines shown at top of verse (before normal lines)
  // specialAfter:  lines shown at bottom of verse (after normal lines)
  return { lines:[newLine()], specialBefore:[], specialAfter:[] };
}
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

// Migrate older hymn data that might not have specialBefore/specialAfter
function migrateHymn(h) {
  LANGS.forEach(l => {
    const ld = h.langs[l];
    if (!ld) return;
    if (!ld.verses) ld.verses = [];
    ld.verses.forEach(v => {
      if (!v.specialBefore) v.specialBefore = [];
      if (!v.specialAfter)  v.specialAfter  = [];
      if (!v.lines) v.lines = [newLine()];
      // migrate old line format that had prefix field
      v.lines = v.lines.map(ln => {
        if (typeof ln === 'string') return newLine(ln);
        if (ln.prefix !== undefined) {
          const t = [ln.prefix, ln.text].filter(Boolean).join(' ');
          return newLine(t.trim());
        }
        return { text: ln.text || '' };
      });
    });
  });
  return h;
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
  if (ld.verses?.some(v =>
    v.lines?.some(ln => ln.text?.trim()) ||
    v.specialBefore?.some(s => s?.trim()) ||
    v.specialAfter?.some(s => s?.trim())
  )) return true;
  return false;
}
function gLabel(key) { return GROUP_TAXONOMY.find(g=>g.key===key)?.label || key || '—'; }
function gSubgroups(key) { return GROUP_TAXONOMY.find(g=>g.key===key)?.subgroups || []; }
function gFile(key)  { return GROUP_TAXONOMY.find(g=>g.key===key)?.file || (key.toLowerCase()+'.json'); }

// ── GITHUB PATHS ──────────────────────────────────────────
function ghPath(groupKey)     { return `${REPO.folder}/${gFile(groupKey)}`; }
function ghDraftPath(id)      { return `${REPO.folder}/drafts/${id}.json`; }
function ghSessionsPath()     { return `${REPO.folder}/admin/sessions.json`; }
function ghPowPath()          { return `${REPO.folder}/admin/pow.json`; }

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
function openSheet(id) {
  const s = el(id); if (s) { s.style.display='flex'; }
}
function closeSheet(id) {
  const s = el(id); if (s) s.style.display='none';
}

// ── LOGIN ─────────────────────────────────────────────────
async function submitLogin() {
  const nameEl = el('login-name'), tokEl = el('login-token'), errEl = el('login-err');
  const name = nameEl?.value.trim(), token = tokEl?.value.trim();
  if (!name)  { showErr(errEl,'Please enter your name.'); return; }
  if (!token) { showErr(errEl,'Please enter your GitHub token.'); return; }
  const btn = el('login-btn');
  if (btn) { btn.disabled=true; btn.textContent='Checking…'; }
  try {
    const r = await fetch(`https://api.github.com/repos/${REPO.owner}/${REPO.repo}`, {
      headers:{ Authorization:`token ${token}`, Accept:'application/vnd.github+json' }
    });
    if (!r.ok) throw new Error('Invalid token or no repository access.');
    contributorName = name;
    ghToken = token;
    try { localStorage.setItem(AUTH_KEY, JSON.stringify({name, token})); } catch(e){}
    sessionStorage.setItem(SESSION_K,'1');
    showApp();
  } catch(e) {
    showErr(errEl, e.message || 'Login failed.');
    if (btn) { btn.disabled=false; btn.textContent='Enter ✝'; }
  }
}
function showErr(elRef, msg) {
  if (!elRef) return;
  elRef.textContent = msg;
  elRef.style.display = 'block';
}
function logout() {
  try { localStorage.removeItem(AUTH_KEY); } catch(e){}
  sessionStorage.removeItem(SESSION_K);
  contributorName=''; ghToken='';
  closeSheet('sheet-admin');
  showPage('page-login');
}

// ── SHOW APP (after login) ────────────────────────────────
function showApp() {
  load();
  hymns = hymns.map(migrateHymn);
  loadPOW(); loadPending(); loadSessions();
  // Resume clock
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
    const sel = el(id); if (!sel) return;
    const opts = ALL_GROUPS.map(k => `<option value="${k}">${esc(gLabel(k))}</option>`).join('');
    sel.innerHTML = '<option value="">All Groups</option>' + opts;
  });
}

// ── CLOCK IN / OUT ────────────────────────────────────────
function clockAction() {
  if (!clockedInAt) { clockIn(); } else { openClockOut(); }
}
function clockIn() {
  if (clockedInAt) return;
  clockedInAt = new Date();
  try { localStorage.setItem(CLOCK_KEY, JSON.stringify({at: clockedInAt.toISOString()})); } catch(e){}
  updateClockUI();
  startClockTick();
  toast('Clocked in ✓','success');
  // Log session
  const sess = { id:uid(), contributor:contributorName, start:clockedInAt.toISOString(), end:null, hymnsEdited:[] };
  sessions.unshift(sess);
  saveSessions();
}
function openClockOut() {
  const mins = Math.floor((Date.now()-clockedInAt.getTime())/60000);
  el('clockout-msg').textContent = `You've been working for ${mins} minutes. End session?`;
  openSheet('sheet-clockout');
}
function confirmClockOut() {
  closeSheet('sheet-clockout');
  clockOut();
}
function clockOut() {
  if (!clockedInAt) return;
  const start = clockedInAt.toISOString();
  const end   = new Date().toISOString();
  const mins  = Math.round((new Date(end)-new Date(start))/60000);
  // Update session record
  const sess = sessions.find(s => s.start===start);
  if (sess) { sess.end=end; saveSessions(); }
  // Log pow
  powLog.unshift({ contributor:contributorName, start, end, minutes:mins, date:end.slice(0,10) });
  savePOW();
  // Upload pow
  uploadPOW().catch(noop);
  clockedInAt = null;
  clearInterval(clockTimer); clockTimer=null;
  try { localStorage.removeItem(CLOCK_KEY); } catch(e){}
  updateClockUI();
  toast(`Clocked out — ${mins} min`,'success');
}
function startClockTick() {
  if (clockTimer) return;
  clockTimer = setInterval(updateClockUI, 30000);
}
function updateClockUI() {
  const dot   = el('clock-dot');
  const label = el('clock-label');
  if (!dot||!label) return;
  if (clockedInAt) {
    const mins = Math.floor((Date.now()-clockedInAt.getTime())/60000);
    dot.classList.add('active');
    label.textContent = `${mins}m`;
  } else {
    dot.classList.remove('active');
    label.textContent = 'Clock In';
  }
}
async function uploadPOW() {
  const f = await ghGet(ghPowPath()).catch(()=>null);
  const sha = f?.sha;
  const existing = f ? decodeGH(f.content) : [];
  if (!Array.isArray(existing)) return;
  const merged = [...powLog, ...existing.filter(r=>!powLog.some(p=>p.start===r.start))];
  await ghPut(ghPowPath(), merged, sha, `POW: ${contributorName}`);
}

// ── TOAST ─────────────────────────────────────────────────
function toast(msg, type='', dur=2400) {
  const t = el('toast'); if (!t) return;
  t.textContent = msg;
  t.className = 'show' + (type ? ' '+type : '');
  clearTimeout(t._t);
  t._t = setTimeout(() => { t.className=''; }, dur);
}

// ── LIST ──────────────────────────────────────────────────
function renderList() {
  const q     = (el('search-inp')?.value||'').trim().toLowerCase();
  const group = el('filter-group')?.value||'';
  const list  = el('hymn-list'); if (!list) return;

  const filtered = hymns.filter(h => {
    if (group && h.groupKey!==group) return false;
    if (!q) return true;
    return LANGS.some(l => {
      const ld = h.langs[l];
      return (ld?.title||'').toLowerCase().includes(q) || (ld?.subtitle||'').toLowerCase().includes(q);
    }) || (h.zemari||'').toLowerCase().includes(q);
  });

  if (!filtered.length) {
    list.innerHTML = `<div class="list-empty"><strong>No hymns yet</strong>${q?'Try a different search.':'Tap "New Hymn" to get started.'}</div>`;
    return;
  }

  list.innerHTML = filtered.map(h => {
    const title = hymnTitle(h);
    const sub   = [h.groupKey ? gLabel(h.groupKey):'', h.zemari||''].filter(Boolean).join(' · ');
    const dot   = h.color ? `background:${h.color}` : '';
    const badge = h.status==='published' ? 'published' : '';
    const active= h.id===activeId ? 'active-hymn' : '';
    return `<div class="hymn-row ${active}" onclick="openEditor('${h.id}')">
      <div class="hymn-color-dot" style="${dot}"></div>
      <div class="hymn-row-body">
        <div class="hymn-row-title">${esc(title)}</div>
        ${sub ? `<div class="hymn-row-sub">${esc(sub)}</div>` : ''}
      </div>
      <span class="hymn-row-badge ${badge}">${esc(h.status||'draft')}</span>
    </div>`;
  }).join('');
}

function renderStats() {
  const total = hymns.length;
  const pub   = hymns.filter(h=>h.status==='published').length;
  const draft = hymns.filter(h=>h.status==='draft').length;
  const rev   = hymns.filter(h=>h.status==='review').length;
  const statsEl = el('list-stats');
  if (statsEl) statsEl.textContent = `${total} hymn${total!==1?'s':''} · ${pub} published · ${draft} drafts`;
  const totEl  = el('stat-total'); if(totEl)  totEl.textContent  = total;
  const pubEl  = el('stat-pub');   if(pubEl)  pubEl.textContent  = pub;
  const draftEl= el('stat-draft'); if(draftEl)draftEl.textContent= draft;
  const revEl  = el('stat-review');if(revEl)  revEl.textContent  = rev;
  const pndEl  = el('stat-pending');if(pndEl) pndEl.textContent  = pendingSync.length || '—';
}

// ── CREATE HYMN ───────────────────────────────────────────
function createHymn() {
  const h = newHymn();
  hymns.unshift(h);
  save();
  renderList();
  openEditor(h.id);
}

// ── OPEN EDITOR ───────────────────────────────────────────
function openEditor(id) {
  activeId   = id;
  activeLang = 'ti';
  previewHadLook = false;
  showPage('page-editor');
  renderLangTabs();
  renderEditor();
}
function goBack() {
  saveActive();
  activeId = null;
  showPage('page-list');
  renderList();
}

// ── RENDER LANG TABS ──────────────────────────────────────
function renderLangTabs() {
  const bar = el('lang-tabs-bar'); if (!bar) return;
  bar.innerHTML = LANGS.map(l =>
    `<button class="lang-tab-btn${l===activeLang?' active':''}" onclick="switchLang('${l}')">${esc(LNAME[l])}</button>`
  ).join('');
}
function switchLang(lang) {
  saveActive();
  activeLang = lang;
  renderLangTabs();
  renderEditor();
}

// ── RENDER EDITOR (main) ──────────────────────────────────
function renderEditor() {
  const h = hymns.find(hh=>hh.id===activeId); if (!h) return;
  const ld = h.langs[activeLang];
  const isGeez = GEEZ_LANGS.has(activeLang);
  const gc = isGeez ? 'geez-field' : '';

  // Update editor title
  const tl = el('editor-title-label');
  if (tl) tl.textContent = hymnTitle(h);

  const area = el('editor-area'); if (!area) return;

  // ── META card (shared across all langs) ──
  let metaHtml = `
  <div class="section-card meta-section">
    <div class="section-card-header">
      <span class="section-card-title">Hymn Details</span>
    </div>
    <div class="form-field">
      <label>Group</label>
      <select id="meta-group" onchange="onGroupChange()">
        <option value="">— Select Group —</option>
        ${ALL_GROUPS.map(k=>`<option value="${k}"${h.groupKey===k?' selected':''}>${esc(gLabel(k))}</option>`).join('')}
      </select>
    </div>`;

  const subs = gSubgroups(h.groupKey);
  if (subs.length) {
    metaHtml += `
    <div class="form-field">
      <label>Subgroup</label>
      <div class="subgroup-wrap" id="subgroup-wrap">
        ${subs.map(s=>`<button class="subgroup-chip${h.subgroups?.includes(s)?' selected':''}" onclick="toggleSubgroup('${s}')">${esc(s)}</button>`).join('')}
      </div>
    </div>`;
  }

  metaHtml += `
    <div class="form-field">
      <label>Zemari (Cantor)</label>
      <input id="meta-zemari" type="text" placeholder="Name of the singer" value="${esc(h.zemari||'')}" oninput="onZemariChange()"/>
    </div>
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
        <div class="color-swatch${!h.color?' selected':''}" style="background:#c7c7cc" onclick="setColor('')" title="None"></div>
      </div>
    </div>
  </div>`;

  // ── Language-specific card ──
  let langHtml = `
  <div class="section-card ${gc}">
    <div class="section-card-header">
      <span class="section-card-title">${esc(LNAME[activeLang])}</span>
    </div>
    <div class="form-field">
      <label>Singer (${esc(LSHORT[activeLang])})</label>
      <input id="lang-singer" type="text" placeholder="Singer for this language" value="${esc(h.langsinger?.[activeLang]||'')}" oninput="onLangSingerChange()"/>
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

  // ── Chorus card ──
  langHtml += `
  <div class="section-card ${gc}">
    <div class="section-card-header">
      <span class="section-card-title">Chorus</span>
    </div>
    <div class="chorus-area">
      <textarea id="lang-chorus" placeholder="Chorus / refrain (optional)" rows="3">${esc(ld.chorus||'')}</textarea>
    </div>
  </div>`;

  // ── Verses ──
  langHtml += '<div id="verses-wrap">';
  (ld.verses||[]).forEach((v,vi) => {
    langHtml += renderVerseBlock(v, vi, gc);
  });
  langHtml += '</div>';

  langHtml += `
  <button class="add-verse-btn" onclick="addVerse()">＋ Add Verse</button>`;

  // ── Submit section ──
  langHtml += `
  <div class="section-card" style="margin-bottom:8px;">
    <div class="section-card-header">
      <span class="section-card-title">Publish</span>
    </div>
    <div class="form-field" style="flex-direction:row;align-items:center;gap:12px;">
      <button style="flex:1;padding:12px;background:var(--accent);color:#fff;border-radius:var(--r-md);font-size:15px;font-weight:600;" onclick="submitHymn()">Submit to GitHub</button>
      <button style="padding:12px 16px;background:var(--bg-inset);color:var(--t2);border-radius:var(--r-md);font-size:14px;font-weight:600;" onclick="deleteHymn()">Delete</button>
    </div>
  </div>`;

  area.innerHTML = metaHtml + langHtml;
  wireEditor();
}

// ── RENDER A VERSE BLOCK ──────────────────────────────────
function renderVerseBlock(v, vi, gc) {
  let html = `<div class="verse-block" id="verse-${vi}">
    <div class="verse-header">
      <span class="verse-number">Verse ${vi+1}</span>
      <button class="verse-del-btn" onclick="delVerse(${vi})" title="Delete verse">×</button>
    </div>`;

  // Special Lines — Top of verse
  html += renderSpecialZone(v.specialBefore||[], vi, 'before', gc);

  // Normal lines
  html += `<div class="verse-lines" id="lines-${vi}">`;
  (v.lines||[]).forEach((ln,li) => {
    html += renderLineRow(ln, vi, li, gc);
  });
  html += `</div>`;

  html += `<button class="add-line-btn" onclick="addLine(${vi})">＋ Add Line</button>`;

  // Special Lines — Bottom of verse
  html += renderSpecialZone(v.specialAfter||[], vi, 'after', gc);

  html += `</div>`;
  return html;
}

// ── RENDER SPECIAL LINES ZONE ─────────────────────────────
function renderSpecialZone(lines, vi, position, gc) {
  const isTop = position === 'before';
  const zoneClass = isTop ? 'top-zone' : 'bottom-zone';
  const label = isTop ? '★ Special Lines — Before Verse' : '★ Special Lines — After Verse';
  const placeholder = isTop ? 'Special line at start of verse…' : 'Special line at end of verse…';

  let html = `<div class="special-lines-zone ${zoneClass}">
    <div class="special-zone-label">${label}</div>`;

  if (lines.length === 0) {
    html += `<button class="add-special-btn" onclick="addSpecialLine(${vi},'${position}')">＋ Add Special Line</button>`;
  } else {
    lines.forEach((txt, si) => {
      html += `<div class="special-line-row">
        <input class="special-line-inp ${gc}" type="text"
          placeholder="${placeholder}"
          value="${esc(txt||'')}"
          data-vi="${vi}" data-si="${si}" data-pos="${position}"
          oninput="onSpecialLineChange(this,${vi},${si},'${position}')"/>
        <button class="special-line-del" onclick="delSpecialLine(${vi},${si},'${position}')" title="Remove">×</button>
      </div>`;
    });
    html += `<button class="add-special-btn" onclick="addSpecialLine(${vi},'${position}')">＋ Add Another</button>`;
  }

  html += `</div>`;
  return html;
}

// ── RENDER A LINE ROW ─────────────────────────────────────
function renderLineRow(ln, vi, li, gc) {
  return `<div class="line-row" id="line-${vi}-${li}">
    <span class="line-num">${li+1}</span>
    <textarea class="line-inp ${gc}" rows="1"
      placeholder="Line ${li+1}…"
      data-vi="${vi}" data-li="${li}"
      oninput="onLineChange(this,${vi},${li})">${esc(ln.text||'')}</textarea>
    <button class="line-del-btn" onclick="delLine(${vi},${li})" title="Remove line">×</button>
  </div>`;
}

// ── WIRE EDITOR EVENTS ────────────────────────────────────
function wireEditor() {
  const area = el('editor-area'); if (!area) return;
  const h = hymns.find(hh=>hh.id===activeId); if (!h) return;
  const ld = h.langs[activeLang];
  const isGeez = GEEZ_LANGS.has(activeLang);

  // Meta fields
  const grpSel = el('meta-group');
  if (grpSel) grpSel.onchange = onGroupChange;

  // Language fields — use input events for live sync
  const titleInp = el('lang-title');
  if (titleInp) titleInp.addEventListener('input', () => {
    ld.title = titleInp.value;
    const tl = el('editor-title-label');
    if (tl) tl.textContent = hymnTitle(h);
  });
  const subtInp = el('lang-subtitle');
  if (subtInp) subtInp.addEventListener('input', () => { ld.subtitle = subtInp.value; });
  const ytInp = el('lang-youtube');
  if (ytInp)  ytInp.addEventListener('input', () => { ld.youtube = ytInp.value; });

  const chorusTA = el('lang-chorus');
  if (chorusTA) {
    autoResize(chorusTA);
    chorusTA.addEventListener('input', () => { ld.chorus = chorusTA.value; autoResize(chorusTA); });
    if (isGeez) {
      chorusTA.addEventListener('focus', () => showGeezToolbar(chorusTA));
      chorusTA.addEventListener('blur',  hideGeezToolbarDelayed);
    }
  }

  // Auto-resize all textareas
  area.querySelectorAll('textarea.line-inp').forEach(ta => {
    autoResize(ta);
    ta.addEventListener('input', () => autoResize(ta));
    if (isGeez) {
      ta.addEventListener('focus', () => showGeezToolbar(ta));
      ta.addEventListener('blur',  hideGeezToolbarDelayed);
    }
  });

  area.querySelectorAll('input.special-line-inp').forEach(inp => {
    if (isGeez) {
      inp.addEventListener('focus', () => showGeezToolbar(inp));
      inp.addEventListener('blur',  hideGeezToolbarDelayed);
    }
  });

  // Ge'ez toolbar buttons
  buildGeezToolbar();
}

function autoResize(ta) {
  ta.style.height = 'auto';
  ta.style.height = ta.scrollHeight + 'px';
}

// ── GE'EZ TOOLBAR ─────────────────────────────────────────
function buildGeezToolbar() {
  const row = el('geez-punct-row'); if (!row) return;
  row.innerHTML = GEEZ_PUNCT.map(p =>
    `<button class="geez-btn" onmousedown="event.preventDefault()" onclick="insertGeez('${p}')">${p}</button>`
  ).join('');
}
function showGeezToolbar(inputEl) {
  geezFocusEl = inputEl;
  const tb = el('geez-toolbar'); if (tb) tb.classList.add('visible');
}
function hideGeezToolbarDelayed() {
  setTimeout(() => {
    const tb = el('geez-toolbar');
    if (tb && document.activeElement !== geezFocusEl) {
      if (!tb.contains(document.activeElement)) {
        tb.classList.remove('visible');
        geezFocusEl = null;
      }
    }
  }, 200);
}
function insertGeez(char) {
  const el_ = geezFocusEl; if (!el_) return;
  const start = el_.selectionStart||0, end = el_.selectionEnd||0;
  const v = el_.value;
  el_.value = v.slice(0,start) + char + v.slice(end);
  el_.selectionStart = el_.selectionEnd = start + char.length;
  el_.dispatchEvent(new Event('input',{bubbles:true}));
  el_.focus();
}

// ── FIELD CHANGE HANDLERS ─────────────────────────────────
function onGroupChange() {
  const h = hymns.find(hh=>hh.id===activeId); if (!h) return;
  h.groupKey = el('meta-group')?.value||'';
  h.subgroups = [];
  // Re-render subgroups only
  const wrap = el('subgroup-wrap');
  if (wrap) {
    const subs = gSubgroups(h.groupKey);
    wrap.innerHTML = subs.map(s=>
      `<button class="subgroup-chip" onclick="toggleSubgroup('${s}')">${esc(s)}</button>`
    ).join('');
  }
}
function onZemariChange() {
  const h = hymns.find(hh=>hh.id===activeId); if (!h) return;
  h.zemari = el('meta-zemari')?.value||'';
}
function onLangSingerChange() {
  const h = hymns.find(hh=>hh.id===activeId); if (!h) return;
  if (!h.langsinger) h.langsinger = {};
  h.langsinger[activeLang] = el('lang-singer')?.value||'';
}
function toggleSubgroup(s) {
  const h = hymns.find(hh=>hh.id===activeId); if (!h) return;
  if (!h.subgroups) h.subgroups=[];
  const i = h.subgroups.indexOf(s);
  if (i>=0) h.subgroups.splice(i,1); else h.subgroups.push(s);
  // Update chip
  document.querySelectorAll('.subgroup-chip').forEach(c => {
    c.classList.toggle('selected', h.subgroups.includes(c.textContent.trim()));
  });
}
function setStatus(s) {
  const h = hymns.find(hh=>hh.id===activeId); if (!h) return;
  h.status = s;
  document.querySelectorAll('.status-chip').forEach(c => {
    c.classList.toggle('selected', c.dataset.val===s);
  });
}
function setColor(c) {
  const h = hymns.find(hh=>hh.id===activeId); if (!h) return;
  h.color = c;
  document.querySelectorAll('.color-swatch').forEach(sw => {
    const swColor = sw.style.background;
    const match = c ? swColor===c : (swColor==='rgb(199, 199, 204)' || swColor==='#c7c7cc');
    sw.classList.toggle('selected', match);
  });
}

// ── LINE OPERATIONS ───────────────────────────────────────
function onLineChange(ta, vi, li) {
  const h = hymns.find(hh=>hh.id===activeId); if (!h) return;
  const v = h.langs[activeLang].verses[vi]; if (!v) return;
  v.lines[li].text = ta.value;
  autoResize(ta);
}
function addLine(vi) {
  const h = hymns.find(hh=>hh.id===activeId); if (!h) return;
  const ld = h.langs[activeLang];
  ld.verses[vi].lines.push(newLine());
  save();
  renderEditor();
  // Focus new line
  setTimeout(() => {
    const linesCount = ld.verses[vi].lines.length;
    const ta = el(`line-${vi}-${linesCount-1}`)?.querySelector('textarea') ||
               document.querySelector(`[id="line-${vi}-${linesCount-1}"] textarea`);
    if (ta) ta.focus();
  }, 50);
}
function delLine(vi, li) {
  const h = hymns.find(hh=>hh.id===activeId); if (!h) return;
  const v = h.langs[activeLang].verses[vi];
  if (v.lines.length <= 1) { v.lines[0].text=''; save(); renderEditor(); return; }
  v.lines.splice(li,1);
  save();
  renderEditor();
}

// ── VERSE OPERATIONS ──────────────────────────────────────
function addVerse() {
  const h = hymns.find(hh=>hh.id===activeId); if (!h) return;
  const ld = h.langs[activeLang];
  if (!ld.verses) ld.verses=[];
  ld.verses.push(newVerse());
  save();
  renderEditor();
  // Scroll to new verse
  setTimeout(() => {
    const vi = ld.verses.length-1;
    const vEl = el(`verse-${vi}`);
    if (vEl) vEl.scrollIntoView({behavior:'smooth', block:'start'});
  }, 80);
}
function delVerse(vi) {
  const h = hymns.find(hh=>hh.id===activeId); if (!h) return;
  const ld = h.langs[activeLang];
  ld.verses.splice(vi,1);
  save();
  renderEditor();
}

// ── SPECIAL LINE OPERATIONS ───────────────────────────────
function onSpecialLineChange(inp, vi, si, position) {
  const h = hymns.find(hh=>hh.id===activeId); if (!h) return;
  const v = h.langs[activeLang].verses[vi]; if (!v) return;
  const arr = position==='before' ? v.specialBefore : v.specialAfter;
  arr[si] = inp.value;
}
function addSpecialLine(vi, position) {
  const h = hymns.find(hh=>hh.id===activeId); if (!h) return;
  const v = h.langs[activeLang].verses[vi]; if (!v) return;
  if (position==='before') v.specialBefore.push('');
  else                      v.specialAfter.push('');
  save();
  renderEditor();
  // Focus new special line input
  setTimeout(() => {
    const zone = document.querySelector(`[data-pos="${position}"][data-vi="${vi}"]`);
    if (zone) zone.focus();
  }, 50);
}
function delSpecialLine(vi, si, position) {
  const h = hymns.find(hh=>hh.id===activeId); if (!h) return;
  const v = h.langs[activeLang].verses[vi]; if (!v) return;
  if (position==='before') v.specialBefore.splice(si,1);
  else                      v.specialAfter.splice(si,1);
  save();
  renderEditor();
}

// ── SAVE ──────────────────────────────────────────────────
function saveActive() {
  const h = hymns.find(hh=>hh.id===activeId); if (!h) return;
  // Collect current field values
  const ld = h.langs[activeLang];
  const titleInp = el('lang-title');
  const subtInp  = el('lang-subtitle');
  const ytInp    = el('lang-youtube');
  const chorus   = el('lang-chorus');
  if (titleInp) ld.title    = titleInp.value;
  if (subtInp)  ld.subtitle = subtInp.value;
  if (ytInp)    ld.youtube  = ytInp.value;
  if (chorus)   ld.chorus   = chorus.value;
  // Verse textarea values
  const area = el('editor-area'); if (!area) return;
  area.querySelectorAll('textarea.line-inp').forEach(ta => {
    const vi = parseInt(ta.dataset.vi), li = parseInt(ta.dataset.li);
    if (!isNaN(vi) && !isNaN(li) && ld.verses[vi]) {
      ld.verses[vi].lines[li].text = ta.value;
    }
  });
  area.querySelectorAll('input.special-line-inp').forEach(inp => {
    const vi  = parseInt(inp.dataset.vi);
    const si  = parseInt(inp.dataset.si);
    const pos = inp.dataset.pos;
    if (!isNaN(vi) && !isNaN(si) && ld.verses[vi]) {
      const arr = pos==='before' ? ld.verses[vi].specialBefore : ld.verses[vi].specialAfter;
      arr[si] = inp.value;
    }
  });
  // Zemari
  const z = el('meta-zemari'); if (z) h.zemari = z.value;
  const sg = el('meta-group'); if (sg) h.groupKey = sg.value;
  const ls = el('lang-singer'); if (ls) { if(!h.langsinger)h.langsinger={}; h.langsinger[activeLang]=ls.value; }
  h.updatedAt = new Date().toISOString();
}
function saveHymn() {
  saveActive();
  save();
  toast('Saved ✓','success');
  renderList();
  renderStats();
}
function startDraftAutoSave() {
  if (draftTimer) clearInterval(draftTimer);
  draftTimer = setInterval(() => {
    if (activeId) { saveActive(); save(); }
  }, 20000);
}

// ── SUBMIT TO GITHUB ──────────────────────────────────────
function submitHymn() {
  if (!previewHadLook) {
    openSheet('sheet-preview-remind');
    return;
  }
  doSubmit();
}
function forceSubmit() { doSubmit(); }
function doSubmit() {
  saveActive();
  const h = hymns.find(hh=>hh.id===activeId); if (!h) return;
  if (!h.groupKey) { toast('Please set a group before submitting.','error'); return; }
  el('submit-confirm-msg').textContent = `Submit "${hymnTitle(h)}" to the repository?`;
  el('submit-confirm-btn').onclick = confirmSubmit;
  openSheet('sheet-submit-confirm');
}
async function confirmSubmit() {
  closeSheet('sheet-submit-confirm');
  const h = hymns.find(hh=>hh.id===activeId); if (!h) return;
  h.updatedAt = new Date().toISOString();
  save();
  try {
    await pushHymnToGH(h);
    h.status = 'published';
    save();
    renderList();
    renderStats();
    // Log POW
    powLog.unshift({ contributor:contributorName, action:'submit', hymnId:h.id, title:hymnTitle(h), date:new Date().toISOString().slice(0,10) });
    savePOW();
    el('submitted-msg').textContent = `"${hymnTitle(h)}" saved to GitHub ✓`;
    openSheet('sheet-submitted');
    const tl = el('editor-title-label');
    if (tl) tl.textContent = hymnTitle(h);
  } catch(e) {
    toast('Submit failed: '+e.message,'error', 4000);
    pendingSync.push({ id:h.id, title:hymnTitle(h), at:new Date().toISOString() });
    savePending();
  }
}
async function pushHymnToGH(h) {
  const path = ghPath(h.groupKey);
  const f    = await ghGet(path);
  const sha  = f?.sha;
  const existing = f ? decodeGH(f.content) : [];
  const arr  = Array.isArray(existing) ? existing : [];
  const idx  = arr.findIndex(x=>x.id===h.id);
  if (idx>=0) arr[idx]=h; else arr.push(h);
  const msg  = `${h.status==='published'?'publish':'update'}: ${hymnTitle(h)} [${contributorName}]`;
  await ghPut(path, arr, sha, msg);
}

// ── PREVIEW ───────────────────────────────────────────────
function openPreview() {
  saveActive();
  previewHadLook = true;
  const h = hymns.find(hh=>hh.id===activeId); if (!h) return;
  // Build language tabs
  const tabs = el('preview-lang-tabs'); if (!tabs) return;
  const avail = LANGS.filter(l => langHasBody(h.langs[l]) || h.langs[l]?.title?.trim());
  if (!avail.length) { toast('No content to preview yet.'); return; }
  tabs.innerHTML = avail.map((l,i)=>
    `<div class="preview-lang-tab${i===0?' active':''}" onclick="previewLang('${l}',this)">${esc(LNAME[l])}</div>`
  ).join('');
  previewLang(avail[0]);
  openSheet('sheet-preview');
}
function previewLang(lang, tabEl) {
  const h = hymns.find(hh=>hh.id===activeId); if (!h) return;
  const ld = h.langs[lang];
  const isGeez = GEEZ_LANGS.has(lang);
  if (tabEl) {
    document.querySelectorAll('.preview-lang-tab').forEach(t=>t.classList.remove('active'));
    tabEl.classList.add('active');
  }
  const body = el('preview-body'); if (!body) return;
  body.className = 'preview-body' + (isGeez ? ' geez':'');
  let html = '';
  if (ld.title)    html += `<div class="preview-title">${esc(ld.title)}</div>`;
  if (ld.subtitle) html += `<div class="preview-subtitle">${esc(ld.subtitle)}</div>`;
  if (ld.chorus)   html += `<div class="preview-section-label">Chorus</div>${esc(ld.chorus).replace(/\n/g,'<br>')}`;
  (ld.verses||[]).forEach((v,vi) => {
    html += `<div class="preview-section-label">Verse ${vi+1}</div>`;
    (v.specialBefore||[]).filter(s=>s?.trim()).forEach(s => {
      html += `<div class="preview-special">★ ${esc(s)}</div>`;
    });
    v.lines.filter(ln=>ln.text?.trim()).forEach(ln => {
      html += `<div class="preview-line">${esc(ln.text)}</div>`;
    });
    (v.specialAfter||[]).filter(s=>s?.trim()).forEach(s => {
      html += `<div class="preview-special">★ ${esc(s)}</div>`;
    });
  });
  body.innerHTML = html || '<p style="color:var(--t3)">No content yet.</p>';
}

// ── DELETE HYMN ───────────────────────────────────────────
function deleteHymn() {
  if (!confirm('Delete this hymn? This cannot be undone.')) return;
  hymns = hymns.filter(h=>h.id!==activeId);
  activeId = null;
  save();
  goBack();
}

// ── CATALOG ───────────────────────────────────────────────
async function loadCatalogFromGH() {
  catalogHymns = [];
  for (const g of ALL_GROUPS) {
    const data = await loadGHJson(ghPath(g));
    if (Array.isArray(data)) catalogHymns.push(...data.map(migrateHymn));
  }
  if (document.querySelector('#tab-catalog[style*="flex"]')) renderCatalog();
}
function renderCatalog() {
  const q     = (el('catalog-search')?.value||'').trim().toLowerCase();
  const group = el('catalog-group')?.value||'';
  const list  = el('catalog-list'); if (!list) return;
  const source = [...catalogHymns];
  const filtered = source.filter(h => {
    if (group && h.groupKey!==group) return false;
    if (!q) return true;
    return LANGS.some(l=>{
      const ld=h.langs[l];
      return (ld?.title||'').toLowerCase().includes(q);
    });
  });
  if (!filtered.length) {
    list.innerHTML = '<div class="list-empty"><strong>Nothing found</strong>No published hymns match.</div>';
    return;
  }
  list.innerHTML = filtered.map(h => {
    const title = hymnTitle(h);
    const sub   = h.groupKey ? gLabel(h.groupKey):'';
    const dot   = h.color ? `background:${h.color}` : '';
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
  const list = el('pow-list'); if (!list) return;
  const mine = powLog.filter(r=>r.contributor===contributorName);
  if (!mine.length) {
    list.innerHTML = '<div class="list-empty"><strong>No sessions yet</strong>Clock in to start tracking your work.</div>';
    return;
  }
  list.innerHTML = mine.map(r => {
    const dur = r.minutes!=null ? `${r.minutes} min` : '';
    return `<div class="pow-card">
      <div class="pow-card-title">${esc(r.date||'')}</div>
      <div class="pow-card-meta">${esc(r.start?.slice(11,16)||'')} – ${esc(r.end?.slice(11,16)||'')} ${dur?`· ${dur}`:''}</div>
      <span class="pow-badge">${esc(r.action||'session')}</span>
    </div>`;
  }).join('');
}

// ── SYNC ──────────────────────────────────────────────────
async function syncNow() {
  if (!pendingSync.length) { toast('Nothing to sync.'); return; }
  toast('Syncing…');
  const failed = [];
  for (const p of pendingSync) {
    const h = hymns.find(hh=>hh.id===p.id);
    if (!h) continue;
    try { await pushHymnToGH(h); }
    catch(e){ failed.push(p); }
  }
  pendingSync = failed;
  savePending();
  toast(failed.length ? `${failed.length} failed` : 'Sync complete ✓', failed.length?'error':'success');
  renderStats();
}
function exportLocal() {
  const data = { hymns, powLog, exportedAt: new Date().toISOString(), contributor: contributorName };
  const blob = new Blob([JSON.stringify(data,null,2)],{type:'application/json'});
  const a    = document.createElement('a');
  a.href  = URL.createObjectURL(blob);
  a.download = `wazema_export_${new Date().toISOString().slice(0,10)}.json`;
  a.click();
  closeSheet('sheet-admin');
}

// ── ADMIN PAGE ────────────────────────────────────────────
function renderAdminPage() {
  const nameEl  = el('admin-name');
  const sessEl  = el('admin-session');
  const tokEl   = el('admin-token-hint');
  if (nameEl) nameEl.textContent = contributorName || '—';
  if (sessEl) sessEl.textContent = new Date().toLocaleDateString();
  if (tokEl && ghToken) tokEl.textContent = ghToken.slice(0,7)+'…';
  renderStats();
  const sl = el('admin-sessions-list'); if (!sl) return;
  if (!sessions.length) { sl.innerHTML='<div class="admin-row" style="color:var(--t3);font-size:14px;">No sessions logged.</div>'; return; }
  sl.innerHTML = sessions.slice(0,10).map(s=>{
    const dur = s.end ? Math.round((new Date(s.end)-new Date(s.start))/60000)+' min' : 'Active';
    return `<div class="admin-row">
      <span class="admin-row-label">${esc(s.start?.slice(0,10)||'')}</span>
      <span class="admin-row-value">${esc(dur)}</span>
    </div>`;
  }).join('');
}

// ── INIT ──────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
  // Login with Enter key
  ['login-name','login-token'].forEach(id => {
    const inp = el(id);
    if (inp) inp.addEventListener('keydown', e => {
      if (e.key==='Enter') { e.preventDefault(); submitLogin(); }
    });
  });
  const loginBtn = el('login-btn');
  if (loginBtn) loginBtn.addEventListener('click', submitLogin);

  // Build Ge'ez toolbar
  buildGeezToolbar();

  // Try auto-login
  try {
    const stored = localStorage.getItem(AUTH_KEY);
    if (stored && sessionStorage.getItem(SESSION_K)) {
      const d = JSON.parse(stored);
      if (d.name && d.token) {
        contributorName = d.name;
        ghToken = d.token;
        const nameInp  = el('login-name');
        const tokenInp = el('login-token');
        if (nameInp)  nameInp.value  = d.name;
        if (tokenInp) tokenInp.value = d.token;
        showApp();
        return;
      }
    }
  } catch(e){}

  // Stay on login page
});
