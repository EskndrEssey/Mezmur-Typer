'use strict';
// ═══════════════════════════════════════════════════════════
//  WAZEMA v2 · Paid Contributor Edition
//  Eritrean Orthodox Church
//  Wazema Hymn Entry Tool
// ═══════════════════════════════════════════════════════════

// ── CONSTANTS ──────────────────────────────────────────────
const REPO       = { owner:'EskndrEssey', repo:'Mezmur-Typer', branch:'main', folder:'data' };
const LANGS      = ['en','ti','ti_ro','am','am_ro','om'];
const LNAME      = { en:'English', ti:'Tigrinya', ti_ro:'Tigrinya (Rom.)', am:'Amharic', am_ro:'Amharic (Rom.)', om:'Oromo' };
const LSHORT     = { en:'EN', ti:'TI', ti_ro:'TI-Rom', am:'AM', am_ro:'AM-Rom', om:'OM' };
const STORE_KEY  = 'wz2_drafts';
const POW_KEY    = 'wz2_pow';
const PEND_KEY   = 'wz2_pending';
const AUTH_KEY   = 'wz2_auth';
const SESSION_K  = 'wz2_sess';
const AUTOSAVE_K = 'wz2_autosave';

const GROUP_TAXONOMY = {
  'Sillase':       { label:'ሥላሴ · Holy Trinity',           file:'Sillase',       subgroups:['Wereb','General'] },
  'Egziabher':     { label:'እግዚኣብሔር · God (Feasts of Lord)', file:'Egziabher',   subgroups:['Lidet','Timket','Hosanna','Siglet','Tinsae','Erget','Pentecost','DebreTabor','KibreTabot','MedhaneAlem','Pagumen','Meskel','Mera','Wereb','General'] },
  'Mariam':        { label:'ማርያም · St. Mary',              file:'Mariam',        subgroups:['Lideta','KidaneMehret','Filseta','SdetMariam','TsomeMariam','Mera','Wereb','General'] },
  'Giorgis':       { label:'ቅዱስ ጊዮርጊስ · St. George',      file:'Giorgis',       subgroups:['Wereb','General'] },
  'Michael':       { label:'ቅዱስ ሚካኤል · St. Michael',       file:'Michael',       subgroups:['Wereb','General'] },
  'Gabriel':       { label:'ቅዱስ ገብርኤል · St. Gabriel',      file:'Gabriel',       subgroups:['Wereb','General'] },
  'KidusnAbbot':   { label:'ቅዱሳን ኣቦት · Holy Fathers',      file:'KidusnAbbot',   subgroups:['TekleHaymanot','Yared','Wereb','General'] },
  'KidusnMelaikt': { label:'ቅዱሳን መላእኽት · Angels',          file:'KidusnMelaikt', subgroups:['Wereb','General'] },
  'Nissha':        { label:'ንስሓ · Repentance / Tsome',      file:'Nissha',        subgroups:['Wereb','General'] },
  'Zewetr':        { label:'ዘወትር · Everyday',               file:'Zewetr',        subgroups:['Wereb','EverySunday'] },
  'Mera':          { label:'መርዓ · Wedding',                 file:'Mera',          subgroups:['Wereb','General'] },
  'Yohannes':      { label:'ቅዱስ ዮሓንስ · St. John',          file:'Yohannes',      subgroups:['Wereb','General'] },
};
const ALL_GROUPS = Object.keys(GROUP_TAXONOMY);

// ── STATE ──────────────────────────────────────────────────
let contributorName = '';
let ghToken = '';
let ghHymns = [];          // all hymns loaded from GitHub (catalog)
let drafts = [];           // local drafts in progress
let activeDraft = null;    // currently open draft
let pendingSync = [];      // failed submissions queued for retry
let powLog = [];           // proof-of-work records
let autoSaveTimer = null;
let hasUnsaved = false;
let lastFocusedInput = null; // for Ge'ez toolbar insert
let tapCount = 0, tapTimer = null;
let toastTimer = null;

// ── HELPERS ────────────────────────────────────────────────
function el(id)  { return document.getElementById(id); }
function uid()   { return 'h_' + Date.now().toString(36) + Math.random().toString(36).slice(2,5); }
function esc(s)  { return s ? String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;') : ''; }
function fmtDate(iso) {
  try { return new Date(iso).toLocaleString('en-US',{month:'short',day:'numeric',year:'numeric',hour:'2-digit',minute:'2-digit'}); }
  catch(e) { return iso || ''; }
}
function wordCount(str) { return str ? str.trim().split(/\s+/).filter(Boolean).length : 0; }
function charCount(str) { return str ? str.replace(/\s/g,'').length : 0; }

function toast(msg, type='') {
  const t = el('toast'); if (!t) return;
  t.textContent = msg;
  t.className = 'toast visible' + (type ? ' '+type : '');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => t.classList.remove('visible'), 3000);
}

function openSheet(id)  { const s = el(id); if (s) s.style.display = 'flex'; }
function closeSheet(id) { const s = el(id); if (s) s.style.display = 'none'; }

// ── STORAGE ────────────────────────────────────────────────
function saveDrafts()   { try { localStorage.setItem(STORE_KEY, JSON.stringify(drafts)); } catch(e){} }
function loadDrafts()   { try { const d = localStorage.getItem(STORE_KEY); return d ? JSON.parse(d) : []; } catch(e) { return []; } }
function savePOW()      { try { localStorage.setItem(POW_KEY, JSON.stringify(powLog)); } catch(e){} }
function loadPOW()      { try { const d = localStorage.getItem(POW_KEY); return d ? JSON.parse(d) : []; } catch(e) { return []; } }
function savePending()  { try { localStorage.setItem(PEND_KEY, JSON.stringify(pendingSync)); } catch(e){} }
function loadPending()  { try { const d = localStorage.getItem(PEND_KEY); return d ? JSON.parse(d) : []; } catch(e) { return []; } }
function saveAuth()     { try { localStorage.setItem(AUTH_KEY, JSON.stringify({ name: contributorName, token: ghToken })); } catch(e){} }
function loadAuth()     { try { const d = localStorage.getItem(AUTH_KEY); return d ? JSON.parse(d) : null; } catch(e) { return null; } }

// ── AUTOSAVE DRAFT ─────────────────────────────────────────
function schedAutoSave() {
  markUnsaved();
  clearTimeout(autoSaveTimer);
  autoSaveTimer = setTimeout(autoSaveDraft, 600);
}
function markUnsaved() {
  hasUnsaved = true;
  const b = el('unsaved-banner'); if (b) b.style.display = 'block';
}
function markSaved() {
  hasUnsaved = false;
  const b = el('unsaved-banner'); if (b) b.style.display = 'none';
}
function autoSaveDraft() {
  if (!activeDraft) return;
  pullFormIntoDraft(activeDraft);
  const idx = drafts.findIndex(d => d.id === activeDraft.id);
  if (idx >= 0) drafts[idx] = activeDraft;
  else drafts.push(activeDraft);
  saveDrafts();
  markSaved();
}

// ── DRAFT OBJECT ───────────────────────────────────────────
function newDraft() {
  return {
    id: uid(),
    title: '',
    zemari: '',
    sourceType: 'Book',
    status: 'draft',
    groups: [],       // [{groupKey, subgroups:[]}]
    langs: Object.fromEntries(LANGS.map(l => [l, { chorus:'', verses:[], youtube:'' }])),
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
}

function draftTitle(d) {
  if (d.title && d.title.trim()) return d.title.trim();
  for (const l of LANGS) {
    const c = d.langs[l]?.chorus?.trim();
    if (c) return c.substring(0,40) + (c.length > 40 ? '…' : '');
  }
  return '(Untitled)';
}

// ── AUTH / LOGIN ────────────────────────────────────────────
async function submitLogin() {
  const nameInp = el('login-name'), tokInp = el('login-token'), errEl = el('login-err'), btn = el('login-btn');
  const name = nameInp.value.trim(), tok = tokInp.value.trim();
  if (!name) { showErr('Enter your name'); return; }
  if (!tok)  { showErr('Paste your GitHub token'); return; }
  btn.disabled = true; btn.textContent = 'Verifying…';
  if (errEl) errEl.style.display = 'none';

  try {
    const r = await fetch(`https://api.github.com/repos/${REPO.owner}/${REPO.repo}`, {
      headers: { Authorization: 'Bearer ' + tok, Accept: 'application/vnd.github+json' }
    });
    if (r.ok) {
      contributorName = name;
      ghToken = tok;
      saveAuth();
      sessionStorage.setItem(SESSION_K, '1');
      tokInp.value = '';
      showApp();
    } else {
      showErr(r.status === 401 ? 'Invalid token — contact the administrator' : 'Access denied (' + r.status + ')');
      tokInp.value = '';
      shakeEl(tokInp);
    }
  } catch(e) {
    showErr('Network error — check your connection');
  } finally {
    btn.disabled = false; btn.textContent = 'Enter ✝';
  }

  function showErr(msg) {
    if (errEl) { errEl.textContent = msg; errEl.style.display = 'block'; }
  }
}

function shakeEl(el) {
  el.classList.remove('shake');
  void el.offsetWidth;
  el.classList.add('shake');
}

function logout() {
  sessionStorage.removeItem(SESSION_K);
  contributorName = ''; ghToken = '';
  closeSheet('sheet-admin');
  el('page-app').style.display = 'none';
  el('page-login').style.display = 'flex';
}

// ── SHOW APP ────────────────────────────────────────────────
async function showApp() {
  el('page-login').style.display = 'none';
  el('page-app').style.display = 'flex';
  drafts = loadDrafts();
  powLog = loadPOW();
  pendingSync = loadPending();
  buildGroupPicker();
  renderDraftList();
  if (!activeDraft) { activeDraft = newDraft(); }
  renderEditor();
  switchTab('editor');
  renderPOW();
  if (pendingSync.length) toast(pendingSync.length + ' pending submissions — tap My Work', 'gold');
  // load catalog from GitHub in background
  loadGitHubCatalog();
}

// ── TABS ────────────────────────────────────────────────────
function switchTab(name) {
  document.querySelectorAll('.tab-content').forEach(t => { t.classList.remove('active'); t.style.display = 'none'; });
  document.querySelectorAll('.nav-btn').forEach(b => b.classList.remove('active'));
  const tab = el('tab-' + name), btn = el('nav-' + name);
  if (tab) { tab.style.display = 'flex'; tab.classList.add('active'); }
  if (btn) btn.classList.add('active');
  if (name === 'catalog') renderCatalog();
  if (name === 'proofwork') renderPOW();
}

// ── GROUP PICKER ────────────────────────────────────────────
function buildGroupPicker() {
  const wrap = el('group-picker'); if (!wrap) return;
  wrap.innerHTML = ALL_GROUPS.map(k => {
    const g = GROUP_TAXONOMY[k];
    const subs = g.subgroups.map(s => `
      <label class="sub-pill" data-group="${k}" data-sub="${s}">
        <input type="checkbox" data-group="${k}" data-sub="${s}" onchange="onSubChange('${k}','${s}',this.checked)"/>
        ${s}
      </label>`).join('');
    return `
      <div class="group-row" id="grow-${k}">
        <div class="group-row-header" onclick="toggleGroupRow('${k}')">
          <input type="checkbox" id="gchk-${k}" onclick="event.stopPropagation()" onchange="onGroupCheck('${k}',this.checked)"/>
          <span class="group-row-label">${esc(g.label)}</span>
          <span class="group-row-chevron">▾</span>
        </div>
        <div class="subgroup-list" id="gsubs-${k}">${subs}</div>
      </div>`;
  }).join('');
  // listen for pill clicks (label click triggers checkbox)
  wrap.querySelectorAll('.sub-pill').forEach(p => {
    p.addEventListener('click', function(e) {
      if (e.target.tagName === 'INPUT') return; // handled by onchange
    });
  });
}

function toggleGroupRow(k) {
  const row = el('grow-' + k); if (!row) return;
  row.classList.toggle('open');
}

function onGroupCheck(k, checked) {
  if (!activeDraft) return;
  if (checked) {
    if (!activeDraft.groups.find(g => g.groupKey === k)) {
      activeDraft.groups.push({ groupKey: k, subgroups: [] });
      el('grow-' + k)?.classList.add('open');
    }
  } else {
    activeDraft.groups = activeDraft.groups.filter(g => g.groupKey !== k);
    // uncheck all subs
    const subs = document.querySelectorAll(`input[data-group="${k}"][data-sub]`);
    subs.forEach(cb => { cb.checked = false; cb.closest('.sub-pill')?.classList.remove('checked'); });
  }
  schedAutoSave();
}

function onSubChange(groupKey, sub, checked) {
  if (!activeDraft) return;
  let g = activeDraft.groups.find(x => x.groupKey === groupKey);
  if (!g) {
    g = { groupKey, subgroups: [] };
    activeDraft.groups.push(g);
    const gchk = el('gchk-' + groupKey); if (gchk) gchk.checked = true;
  }
  if (checked) { if (!g.subgroups.includes(sub)) g.subgroups.push(sub); }
  else { g.subgroups = g.subgroups.filter(s => s !== sub); }
  // update pill style
  const pill = document.querySelector(`.sub-pill[data-group="${groupKey}"][data-sub="${sub}"]`);
  if (pill) pill.classList.toggle('checked', checked);
  schedAutoSave();
}

function syncGroupPickerToDraft(d) {
  if (!d) return;
  // reset all
  ALL_GROUPS.forEach(k => {
    const chk = el('gchk-' + k); if (chk) chk.checked = false;
    document.querySelectorAll(`input[data-group="${k}"][data-sub]`).forEach(cb => {
      cb.checked = false;
      cb.closest('.sub-pill')?.classList.remove('checked');
    });
    el('grow-' + k)?.classList.remove('open');
  });
  // apply draft selections
  d.groups.forEach(g => {
    const chk = el('gchk-' + g.groupKey); if (chk) chk.checked = true;
    if (g.subgroups.length) el('grow-' + g.groupKey)?.classList.add('open');
    g.subgroups.forEach(s => {
      const cb = document.querySelector(`input[data-group="${g.groupKey}"][data-sub="${s}"]`);
      if (cb) { cb.checked = true; cb.closest('.sub-pill')?.classList.add('checked'); }
    });
  });
}

// ── EDITOR ─────────────────────────────────────────────────
function renderEditor() {
  if (!activeDraft) return;
  const d = activeDraft;

  // Meta fields
  setVal('f-title', d.title);
  setVal('f-zemari', d.zemari);
  setSelVal('f-source', d.sourceType);
  setSelVal('f-status', d.status);
  el('editor-hymn-label').textContent = draftTitle(d);

  syncGroupPickerToDraft(d);
  buildLangPanels(d);
  updatePreview();
}

function setVal(id, val)    { const e = el(id); if (e) e.value = val || ''; }
function setSelVal(id, val) { const e = el(id); if (e) e.value = val || ''; }

// ── LANG PANELS ────────────────────────────────────────────
function buildLangPanels(d) {
  const panelWrap = el('lang-panels'); if (!panelWrap) return;
  panelWrap.innerHTML = LANGS.map(l => {
    const ld = d.langs[l] || { chorus:'', verses:[], youtube:'' };
    const verses = ld.verses || [];
    return `
      <div class="lang-panel ${l === 'ti' ? 'active' : ''}" id="lpanel-${l}" data-lang="${l}">
        <label class="lbl">Chorus / ኣዝማድ</label>
        <div class="chorus-box">
          <div class="stanza-header">
            <span class="stanza-label">Chorus</span>
          </div>
          <textarea class="stanza-text" id="chorus-${l}" rows="3"
            placeholder="Chorus text in ${LNAME[l]}…"
            oninput="onLangInput('${l}','chorus',this.value)"
          >${esc(ld.chorus||'')}</textarea>
        </div>
        <label class="lbl" style="margin-top:10px">Verses</label>
        <div class="verse-list" id="vlist-${l}">
          ${verses.map((v,i) => verseHTML(l, i, v)).join('')}
        </div>
        <button class="add-verse-btn" onclick="addVerse('${l}')">+ Add Verse</button>
        <label class="lbl" style="margin-top:10px">YouTube URL</label>
        <input class="inp" id="yt-${l}" type="text" placeholder="https://youtube.com/…"
          value="${esc(ld.youtube||'')}"
          oninput="onLangInput('${l}','youtube',this.value)"/>
      </div>`;
  }).join('');

  // Lang tab content indicators
  updateLangTabDots(d);
}

function verseHTML(l, i, text) {
  const t = typeof text === 'string' ? text : '';
  return `
    <div class="verse-box" id="vbox-${l}-${i}">
      <div class="stanza-header">
        <span class="stanza-label">Verse ${i+1}</span>
        <div class="stanza-actions">
          <button class="stanza-btn" onclick="moveVerse('${l}',${i},-1)" title="Up">↑</button>
          <button class="stanza-btn" onclick="moveVerse('${l}',${i},1)" title="Down">↓</button>
          <button class="stanza-btn" onclick="removeVerse('${l}',${i})" title="Remove">✕</button>
        </div>
      </div>
      <textarea class="stanza-text" rows="3"
        placeholder="Verse ${i+1} text in ${LNAME[l]}…"
        oninput="onVerseInput('${l}',${i},this.value)"
      >${esc(t)}</textarea>
    </div>`;
}

function onLangInput(lang, field, val) {
  if (!activeDraft) return;
  if (!activeDraft.langs[lang]) activeDraft.langs[lang] = { chorus:'', verses:[], youtube:'' };
  activeDraft.langs[lang][field] = val;
  updateLangTabDots(activeDraft);
  schedAutoSave();
  updatePreview();
}

function onVerseInput(lang, idx, val) {
  if (!activeDraft) return;
  if (!activeDraft.langs[lang]) activeDraft.langs[lang] = { chorus:'', verses:[], youtube:'' };
  if (!activeDraft.langs[lang].verses) activeDraft.langs[lang].verses = [];
  activeDraft.langs[lang].verses[idx] = val;
  schedAutoSave();
  updatePreview();
}

function addVerse(lang) {
  if (!activeDraft) return;
  if (!activeDraft.langs[lang]) activeDraft.langs[lang] = { chorus:'', verses:[], youtube:'' };
  if (!activeDraft.langs[lang].verses) activeDraft.langs[lang].verses = [];
  activeDraft.langs[lang].verses.push('');
  const vlist = el('vlist-' + lang); if (!vlist) return;
  const i = activeDraft.langs[lang].verses.length - 1;
  const div = document.createElement('div');
  div.innerHTML = verseHTML(lang, i, '');
  vlist.appendChild(div.firstElementChild);
  schedAutoSave();
}

function removeVerse(lang, idx) {
  if (!activeDraft) return;
  activeDraft.langs[lang].verses.splice(idx, 1);
  rebuildVerseList(lang);
  schedAutoSave();
}

function moveVerse(lang, idx, dir) {
  if (!activeDraft) return;
  const vv = activeDraft.langs[lang].verses;
  const ni = idx + dir;
  if (ni < 0 || ni >= vv.length) return;
  [vv[idx], vv[ni]] = [vv[ni], vv[idx]];
  rebuildVerseList(lang);
  schedAutoSave();
}

function rebuildVerseList(lang) {
  const vlist = el('vlist-' + lang); if (!vlist) return;
  const vv = activeDraft.langs[lang].verses || [];
  vlist.innerHTML = vv.map((v, i) => verseHTML(lang, i, v)).join('');
}

function updateLangTabDots(d) {
  LANGS.forEach(l => {
    const btn = document.querySelector(`.lang-tab[data-lang="${l}"]`); if (!btn) return;
    const ld = d.langs[l] || {};
    const hasContent = (ld.chorus||'').trim() || (ld.verses||[]).some(v => v.trim());
    btn.classList.toggle('has-content', !!hasContent);
  });
}

function switchLangTab(lang) {
  document.querySelectorAll('.lang-tab').forEach(b => b.classList.remove('active'));
  document.querySelectorAll('.lang-panel').forEach(p => p.style.display = 'none');
  const btn = document.querySelector(`.lang-tab[data-lang="${lang}"]`);
  if (btn) btn.classList.add('active');
  const panel = el('lpanel-' + lang);
  if (panel) panel.style.display = 'flex';
}

// ── GE'EZ TOOLBAR ──────────────────────────────────────────
function insertGeez(ch) {
  const inp = lastFocusedInput;
  if (!inp || (inp.tagName !== 'TEXTAREA' && inp.tagName !== 'INPUT')) return;
  const s = inp.selectionStart, e = inp.selectionEnd;
  const v = inp.value;
  inp.value = v.slice(0, s) + ch + v.slice(e);
  inp.selectionStart = inp.selectionEnd = s + ch.length;
  inp.dispatchEvent(new Event('input', { bubbles: true }));
  inp.focus();
}

// ── PULL FORM INTO DRAFT ────────────────────────────────────
function pullFormIntoDraft(d) {
  d.title      = (el('f-title')?.value || '').trim();
  d.zemari     = (el('f-zemari')?.value || '').trim();
  d.sourceType = el('f-source')?.value || 'Book';
  d.status     = el('f-status')?.value || 'draft';
  d.updatedAt  = new Date().toISOString();
  // langs are kept in sync via oninput handlers already
}

// ── DRAFT LIST ─────────────────────────────────────────────
function renderDraftList() {
  const wrap = el('draft-list'); if (!wrap) return;
  if (!drafts.length) { wrap.innerHTML = '<div style="color:var(--t3);font-size:13px;padding:10px 0">No drafts yet</div>'; return; }
  wrap.innerHTML = drafts.map(d => `
    <div class="draft-item ${activeDraft?.id === d.id ? 'active' : ''}" onclick="openDraft('${d.id}')">
      <div class="draft-item-title">${esc(draftTitle(d))}</div>
      <div class="draft-item-meta">${fmtDate(d.updatedAt)} · ${d.status}</div>
    </div>`).join('');
}

function openDraft(id) {
  autoSaveDraft();
  const d = drafts.find(x => x.id === id);
  if (!d) return;
  activeDraft = d;
  renderEditor();
  closeSheet('sheet-hymn-list');
  toast('Opened: ' + draftTitle(d));
}

function newHymn() {
  autoSaveDraft();
  activeDraft = newDraft();
  renderEditor();
  renderDraftList();
  closeSheet('sheet-hymn-list');
  markSaved();
}

// ── LIVE PREVIEW ────────────────────────────────────────────
function updatePreview() {
  const wrap = el('preview-content'); if (!wrap) return;
  if (!activeDraft) { wrap.innerHTML = ''; return; }
  const d = activeDraft;
  // Show Tigrinya by default, fall back to first available
  const lang = LANGS.find(l => (d.langs[l]?.chorus||'').trim() || (d.langs[l]?.verses||[]).some(v=>v.trim())) || 'ti';
  const ld = d.langs[lang] || {};
  const title = d.title || draftTitle(d);
  let html = `<div class="preview-htitle">${esc(title)}</div>`;
  if (ld.chorus) {
    html += `<div class="preview-chorus">${esc(ld.chorus).replace(/\n/g,'<br>')}</div>`;
  }
  (ld.verses||[]).forEach((v, i) => {
    if (!v.trim()) return;
    html += `<div class="preview-verse-label">Verse ${i+1}</div>
             <div class="preview-verse">${esc(v)}</div>`;
    if (ld.chorus) html += `<div class="preview-chorus" style="opacity:.7">${esc(ld.chorus).replace(/\n/g,'<br>')}</div>`;
  });
  wrap.innerHTML = html;
}

function togglePreview() {
  const panel = el('preview-panel'); if (!panel) return;
  const visible = panel.style.display !== 'none';
  panel.style.display = visible ? 'none' : 'flex';
  if (!visible) { panel.classList.add('mobile-open'); updatePreview(); }
  else { panel.classList.remove('mobile-open'); }
}

// ── GITHUB API ─────────────────────────────────────────────
function tok() { return ghToken; }

async function ghGet(path) {
  const r = await fetch(`https://api.github.com/repos/${REPO.owner}/${REPO.repo}/contents/${path}?ref=${REPO.branch}`, {
    headers: { Authorization: 'Bearer ' + tok(), Accept: 'application/vnd.github+json' }
  });
  if (r.status === 404) return null;
  if (!r.ok) { const e = await r.json(); throw new Error(e.message || r.status); }
  return r.json();
}

async function ghPut(path, content, sha, msg) {
  const body = { message: msg, content: btoa(unescape(encodeURIComponent(content))), branch: REPO.branch };
  if (sha) body.sha = sha;
  const r = await fetch(`https://api.github.com/repos/${REPO.owner}/${REPO.repo}/contents/${path}`, {
    method: 'PUT',
    headers: { Authorization: 'Bearer ' + tok(), Accept: 'application/vnd.github+json', 'Content-Type': 'application/json' },
    body: JSON.stringify(body)
  });
  if (!r.ok) { const e = await r.json(); throw new Error(e.message || 'Write failed'); }
  return r.json();
}

function ghPath(groupKey) {
  return REPO.folder + '/' + (GROUP_TAXONOMY[groupKey]?.file || groupKey) + '.json';
}

function decodeGHContent(b64) {
  return JSON.parse(decodeURIComponent(escape(atob(b64.replace(/\n/g,'')))));
}

// ── LOAD CATALOG FROM GITHUB ────────────────────────────────
async function loadGitHubCatalog() {
  const count = el('catalog-count');
  if (count) count.textContent = 'Loading from GitHub…';
  const all = [];
  for (const k of ALL_GROUPS) {
    try {
      const f = await ghGet(ghPath(k));
      if (!f) continue;
      const arr = decodeGHContent(f.content);
      if (Array.isArray(arr)) arr.forEach(h => { h._groupKey = k; all.push(h); });
    } catch(e) {}
    await new Promise(r => setTimeout(r, 70));
  }
  ghHymns = all;
  renderCatalog();
  toast('Loaded ' + all.length + ' mezmurs from GitHub ✝', 'gold');
}

// ── CATALOG ─────────────────────────────────────────────────
function renderCatalog() {
  const list = el('catalog-list'), count = el('catalog-count'); if (!list) return;
  const q      = (el('catalog-search')?.value || '').toLowerCase().trim();
  const group  = el('catalog-group')?.value || '';
  const status = el('catalog-status')?.value || '';
  const exist  = el('catalog-exist')?.value || 'existing';

  let items = ghHymns;
  if (group) items = items.filter(h => h._groupKey === group || (Array.isArray(h.groups) && h.groups.some(g => g.groupKey === group)));
  if (q) items = items.filter(h => {
    const titles = h.title ? Object.values(h.title).join(' ') : (h.langs ? Object.values(h.langs).map(l => l.title||'').join(' ') : '');
    return titles.toLowerCase().includes(q);
  });

  // status filter
  if (status === 'complete') items = items.filter(h => isComplete(h));
  if (status === 'incomplete') items = items.filter(h => !isComplete(h));
  if (exist === 'missing') items = items.filter(h => getMissingLangs(h).length > 0);

  if (count) count.textContent = items.length + ' mezmur' + (items.length !== 1 ? 's' : '');
  if (!items.length) { list.innerHTML = '<div style="color:var(--t3);font-size:13px;padding:16px">No results</div>'; return; }

  list.innerHTML = items.map(h => {
    const rawTitle = h.title ? (Object.values(h.title)[0] || '(Untitled)') : '(Untitled)';
    const missing = getMissingLangs(h);
    const grp = h._groupKey ? GROUP_TAXONOMY[h._groupKey]?.label || h._groupKey : '';
    const statusDot = `<span class="status-dot ${h.status||'draft'}"></span>`;
    const langBadges = LANGS.map(l => {
      const has = hasLang(h, l);
      return `<span class="lang-badge ${has ? 'has' : 'missing'}">${LSHORT[l]}</span>`;
    }).join('');
    return `
      <div class="catalog-card" onclick="openFromCatalog('${esc(h.id)}')">
        <div class="catalog-card-title">${esc(rawTitle)}</div>
        <div class="catalog-card-meta">${statusDot}${esc(grp)} ${missing.length ? '· <span style="color:var(--red)">Missing: '+missing.map(l=>LSHORT[l]).join(', ')+'</span>' : ''}</div>
        <div class="catalog-card-langs">${langBadges}</div>
      </div>`;
  }).join('');
}

function hasLang(h, l) {
  if (h.title?.[l] || h.lyrics?.[l]) return true;
  if (h.langs?.[l]?.title || h.langs?.[l]?.chorus) return true;
  return false;
}

function getMissingLangs(h) {
  return LANGS.filter(l => !hasLang(h, l));
}

function isComplete(h) {
  return LANGS.every(l => hasLang(h, l));
}

function populateCatalogGroupDropdown() {
  const sel = el('catalog-group'); if (!sel) return;
  sel.innerHTML = '<option value="">All Groups</option>' + ALL_GROUPS.map(k =>
    `<option value="${k}">${esc(GROUP_TAXONOMY[k].label)}</option>`).join('');
}

function openFromCatalog(id) {
  const raw = ghHymns.find(h => h.id === id);
  if (!raw) return;
  // Convert GitHub hymn to local draft format for editing
  const d = ghRawToDraft(raw);
  drafts.push(d);
  activeDraft = d;
  saveDrafts();
  renderEditor();
  renderDraftList();
  switchTab('editor');
  toast('Opened for editing — add missing translations');
}

function ghRawToDraft(raw) {
  const d = newDraft();
  d.id = raw.id || d.id;
  // title: try title map first, then langs
  if (raw.title && typeof raw.title === 'object') {
    d.title = Object.values(raw.title)[0] || '';
  } else if (typeof raw.title === 'string') { d.title = raw.title; }
  d.zemari = raw.zemari || raw.singer || '';
  d.status = raw.status || 'draft';
  d.sourceType = raw.metadata?.source_type || 'Book';

  // groups
  if (raw._groupKey) d.groups = [{ groupKey: raw._groupKey, subgroups: raw.subgroups || raw.subgroup ? [raw.subgroup||''].filter(Boolean) : [] }];
  if (Array.isArray(raw.groups)) d.groups = raw.groups;

  // langs — handle both old format and new
  LANGS.forEach(l => {
    const ld = d.langs[l];
    // title
    if (raw.title?.[l]) ld.title = raw.title[l];
    // lyrics
    if (raw.lyrics?.[l]) {
      const ly = raw.lyrics[l];
      ld.chorus = ly.match(/\[\[chorus\]\]([\s\S]*?)\[\[\/chorus\]\]/)?.[1]?.trim() || '';
      const verseMatches = [...ly.matchAll(/\[\[verse\]\]([\s\S]*?)\[\[\/verse\]\]/g)];
      ld.verses = verseMatches.map(m => m[1].trim());
      if (!ld.chorus && !ld.verses.length) ld.chorus = ly.trim();
    }
    if (raw.youtubeUrls?.[l]) ld.youtube = raw.youtubeUrls[l];
    // direct langs format
    if (raw.langs?.[l]) {
      const src = raw.langs[l];
      if (src.chorus) ld.chorus = src.chorus;
      if (src.verses) ld.verses = src.verses;
      if (src.youtube) ld.youtube = src.youtube;
    }
  });
  return d;
}

// ── DUPLICATE DETECTION ─────────────────────────────────────
function checkDuplicate() {
  if (!activeDraft) return null;
  const q = activeDraft.title.toLowerCase().trim();
  if (!q) return null;
  return ghHymns.find(h => {
    const titles = h.title ? Object.values(h.title).map(t => t.toLowerCase().trim()) : [];
    return titles.some(t => t.includes(q) || q.includes(t));
  });
}

// ── SUBMIT FLOW ─────────────────────────────────────────────
function startSubmit() {
  autoSaveDraft();
  if (!activeDraft) return;
  const d = activeDraft;

  // Validate: need at least one language with content
  const hasContent = LANGS.some(l => (d.langs[l]?.chorus||'').trim() || (d.langs[l]?.verses||[]).some(v=>v.trim()));
  if (!hasContent) { toast('Add some hymn content first', 'error'); return; }
  if (!d.groups.length) { toast('Select at least one group', 'error'); return; }

  // Dup check
  const dup = checkDuplicate();
  if (dup) {
    const dt = dup.title ? Object.values(dup.title)[0] : '(Untitled)';
    el('dup-msg').innerHTML = `"${esc(dt)}" already exists in ${esc(dup._groupKey || '')}.<br>Open the existing one to add translations, or submit as a new separate entry.`;
    el('dup-open').onclick = () => { closeSheet('sheet-dup'); openFromCatalog(dup.id); };
    el('dup-new').onclick = () => { closeSheet('sheet-dup'); showSubmitConfirm(); };
    openSheet('sheet-dup');
    return;
  }

  showSubmitConfirm();
}

function showSubmitConfirm() {
  const d = activeDraft;
  const langs = LANGS.filter(l => (d.langs[l]?.chorus||'').trim() || (d.langs[l]?.verses||[]).some(v=>v.trim()));
  const totalWords = langs.reduce((sum, l) => sum + wordCount((d.langs[l]?.chorus||'') + (d.langs[l]?.verses||[]).join(' ')), 0);
  const totalChars = langs.reduce((sum, l) => sum + charCount((d.langs[l]?.chorus||'') + (d.langs[l]?.verses||[]).join('')), 0);
  const groups = d.groups.map(g => GROUP_TAXONOMY[g.groupKey]?.label || g.groupKey).join(', ');

  el('submit-summary').innerHTML = `
    <div class="submit-row"><span class="submit-row-label">Title</span><span class="submit-row-val">${esc(draftTitle(d))}</span></div>
    <div class="submit-row"><span class="submit-row-label">Contributor</span><span class="submit-row-val">${esc(contributorName)}</span></div>
    <div class="submit-row"><span class="submit-row-label">Groups</span><span class="submit-row-val">${esc(groups)}</span></div>
    <div class="submit-row"><span class="submit-row-label">Languages</span><span class="submit-row-val">${langs.map(l=>LSHORT[l]).join(', ')}</span></div>
    <div class="submit-row"><span class="submit-row-label">Words</span><span class="submit-row-val">${totalWords}</span></div>
    <div class="submit-row"><span class="submit-row-label">Characters</span><span class="submit-row-val">${totalChars}</span></div>`;

  openSheet('sheet-submit-confirm');
}

async function doSubmit() {
  const btn = el('btn-confirm-submit');
  if (btn) { btn.disabled = true; btn.textContent = 'Submitting…'; }
  closeSheet('sheet-submit-confirm');

  try {
    const result = await submitToGitHub(activeDraft);
    recordPOW(activeDraft, result.sha);
    markSaved();
    // show success
    el('success-msg').textContent = `"${draftTitle(activeDraft)}" submitted to GitHub ✓`;
    // Remove submitted draft from local drafts list and start fresh
    drafts = drafts.filter(d => d.id !== activeDraft.id);
    saveDrafts();
    activeDraft = newDraft();
    drafts.push(activeDraft);
    saveDrafts();
    renderEditor();
    renderDraftList();
    openSheet('sheet-success');
    // refresh catalog
    ghHymns = ghHymns.filter(h => h.id !== activeDraft.id);
    toast('Submitted ✓', 'success');
  } catch(e) {
    // Queue for retry
    pendingSync.push({ draft: JSON.parse(JSON.stringify(activeDraft)), failedAt: new Date().toISOString(), error: e.message });
    savePending();
    toast('Submit failed — saved for retry', 'error');
  } finally {
    if (btn) { btn.disabled = false; btn.textContent = 'Submit to GitHub ✝'; }
  }
}

async function submitToGitHub(d) {
  const exported = draftToExport(d);
  let lastSha = null;

  for (const g of d.groups) {
    const path = ghPath(g.groupKey);
    const f = await ghGet(path);
    let arr = [];
    if (f) {
      lastSha = f.sha;
      try { arr = decodeGHContent(f.content); } catch(e) { arr = []; }
    }
    if (!Array.isArray(arr)) arr = [];
    const idx = arr.findIndex(x => x.id === exported.id);
    if (idx >= 0) arr[idx] = exported; else arr.push(exported);
    const res = await ghPut(path, JSON.stringify(arr, null, 2), f?.sha || null,
      `${contributorName}: ${draftTitle(d)}`);
    lastSha = res.content?.sha || lastSha;
    await new Promise(r => setTimeout(r, 200));
  }
  return { sha: lastSha };
}

function draftToExport(d) {
  const totalText = LANGS.map(l => (d.langs[l]?.chorus||'') + (d.langs[l]?.verses||[]).join(' ')).join(' ');
  const out = {
    id: d.id,
    category: d.groups[0]?.groupKey || '',
    groups: d.groups,
    subgroups: d.groups.flatMap(g => g.subgroups),
    zemari: d.zemari,
    status: d.status,
    title: {},
    lyrics: {},
    youtubeUrls: {},
    metadata: {
      contributor_id: ghToken.slice(0, 8),
      contributor_name: contributorName,
      created_at: d.createdAt,
      updated_at: new Date().toISOString(),
      word_count: wordCount(totalText),
      character_count: charCount(totalText),
      source_type: d.sourceType,
      proof_commit_sha: ''  // filled after commit
    }
  };
  LANGS.forEach(l => {
    const ld = d.langs[l] || {};
    const chorus = (ld.chorus||'').trim();
    const verses = (ld.verses||[]).filter(v => v.trim());
    if (!chorus && !verses.length) return;
    if (d.title) out.title[l] = d.title; // same title for all langs (contributor can override)
    let lyrics = '';
    if (chorus) lyrics += `[[chorus]]\n${chorus}\n[[/chorus]]\n\n`;
    verses.forEach((v, i) => { lyrics += `[[verse]]\n${v}\n[[/verse]]\n\n`; });
    out.lyrics[l] = lyrics.trim();
    if (ld.youtube) out.youtubeUrls[l] = ld.youtube;
  });
  if (!Object.keys(out.youtubeUrls).length) delete out.youtubeUrls;
  if (!Object.keys(out.title).length) delete out.title;
  return out;
}

// ── PROOF OF WORK ────────────────────────────────────────────
function recordPOW(d, sha) {
  const totalText = LANGS.map(l => (d.langs[l]?.chorus||'') + (d.langs[l]?.verses||[]).join(' ')).join(' ');
  const langs = LANGS.filter(l => (d.langs[l]?.chorus||'').trim() || (d.langs[l]?.verses||[]).some(v=>v.trim()));
  powLog.push({
    id: d.id,
    title: draftTitle(d),
    groups: d.groups.map(g => GROUP_TAXONOMY[g.groupKey]?.label || g.groupKey).join(', '),
    langs: langs.map(l => LSHORT[l]).join(', '),
    submittedAt: new Date().toISOString(),
    wordCount: wordCount(totalText),
    charCount: charCount(totalText),
    sourceType: d.sourceType,
    sha: sha || '',
    commitUrl: sha ? `https://github.com/${REPO.owner}/${REPO.repo}/commit/${sha}` : ''
  });
  savePOW();
}

function renderPOW() {
  const nameEl = el('pow-name'), statsEl = el('pow-stats'), list = el('pow-list'); if (!list) return;
  if (nameEl) nameEl.textContent = contributorName || '—';

  // Summarize
  const totalWords = powLog.reduce((s, r) => s + (r.wordCount||0), 0);
  const totalChars = powLog.reduce((s, r) => s + (r.charCount||0), 0);
  if (statsEl) statsEl.textContent = `${powLog.length} submission${powLog.length !== 1 ? 's' : ''} · ${totalWords} words · ${totalChars} characters`;

  if (!powLog.length) { list.innerHTML = '<div style="color:var(--t3);font-size:13px;padding:16px">No submissions yet</div>'; return; }
  list.innerHTML = [...powLog].reverse().map(r => `
    <div class="pow-card">
      <div class="pow-card-title">${esc(r.title)}</div>
      <div class="pow-card-meta">${fmtDate(r.submittedAt)} · ${esc(r.groups)}</div>
      <div class="pow-card-stats">
        <span class="pow-stat">Langs: <span>${esc(r.langs)}</span></span>
        <span class="pow-stat">Words: <span>${r.wordCount||0}</span></span>
        <span class="pow-stat">Chars: <span>${r.charCount||0}</span></span>
        <span class="pow-stat">Source: <span>${esc(r.sourceType||'')}</span></span>
      </div>
      ${r.commitUrl ? `<a href="${esc(r.commitUrl)}" target="_blank" class="pow-commit-link">View commit on GitHub ↗</a>` : ''}
    </div>`).join('');
}

function exportPOW() {
  if (!powLog.length) { toast('No submissions to export', 'error'); return; }
  const headers = ['Title','Groups','Languages','Submitted At','Words','Characters','Source Type','Commit SHA','Commit URL'];
  const rows = powLog.map(r => [
    r.title, r.groups, r.langs, r.submittedAt,
    r.wordCount, r.charCount, r.sourceType, r.sha, r.commitUrl
  ].map(v => '"' + String(v||'').replace(/"/g, '""') + '"'));
  const csv = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
  const blob = new Blob([csv], { type: 'text/csv' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = `wazema-pow-${contributorName.replace(/\s+/g,'-')}-${Date.now()}.csv`;
  a.click(); URL.revokeObjectURL(url);
  toast('Exported ✓', 'success');
}

// ── PENDING SYNC ────────────────────────────────────────────
async function retryPending() {
  if (!pendingSync.length) { toast('No pending submissions', ''); return; }
  const btn = el('btn-retry-pending');
  if (btn) { btn.disabled = true; btn.textContent = 'Retrying…'; }
  let ok = 0, fail = 0;
  const remaining = [];
  for (const p of pendingSync) {
    try {
      const res = await submitToGitHub(p.draft);
      recordPOW(p.draft, res.sha);
      ok++;
    } catch(e) { remaining.push(p); fail++; }
  }
  pendingSync = remaining;
  savePending();
  renderPendingList();
  if (btn) { btn.disabled = false; btn.textContent = '↻ Retry All'; }
  toast(ok + ' submitted' + (fail ? ', ' + fail + ' still failed' : ' ✓'), ok && !fail ? 'success' : 'error');
}

function renderPendingList() {
  const wrap = el('pending-list'); if (!wrap) return;
  if (!pendingSync.length) { wrap.innerHTML = '<div style="color:var(--t3);font-size:13px;padding:8px 0">No pending submissions</div>'; return; }
  wrap.innerHTML = pendingSync.map((p, i) => `
    <div class="pending-item">
      <div class="pending-item-title">${esc(draftTitle(p.draft))}</div>
      <div class="pending-item-meta">Failed ${fmtDate(p.failedAt)} · ${esc(p.error||'Unknown error')}</div>
    </div>`).join('');
}

// ── ADMIN: INIT FILES ───────────────────────────────────────
async function initGHFiles() {
  const log = el('admin-init-log'), btn = el('btn-init-files');
  if (log) log.innerHTML = '';
  if (btn) btn.disabled = true;
  for (const k of ALL_GROUPS) {
    const path = ghPath(k);
    try {
      const ex = await ghGet(path);
      if (ex) { appendLog(log, `✓ ${path}`, 'skip'); }
      else { await ghPut(path, '[]', null, `Init ${k}`); appendLog(log, `✝ Created ${path}`, 'ok'); }
    } catch(e) { appendLog(log, `✕ ${path} — ${e.message}`, 'fail'); }
    await new Promise(r => setTimeout(r, 300));
  }
  if (btn) btn.disabled = false;
  toast('Init complete', 'success');
}

function appendLog(logEl, msg, type) {
  if (!logEl) return;
  const d = document.createElement('div');
  d.className = 'admin-log-line admin-log-' + type;
  d.textContent = msg;
  logEl.appendChild(d);
  logEl.scrollTop = logEl.scrollHeight;
}

// ── UNLOAD GUARD ────────────────────────────────────────────
window.addEventListener('beforeunload', e => {
  if (hasUnsaved) { e.preventDefault(); e.returnValue = ''; }
});

// ── 5-TAP ADMIN ─────────────────────────────────────────────
function handleTitleTap() {
  tapCount++;
  clearTimeout(tapTimer);
  tapTimer = setTimeout(() => tapCount = 0, 2000);
  if (tapCount >= 5) { tapCount = 0; openSheet('sheet-admin'); }
}

// ── INIT ─────────────────────────────────────────────────────
function init() {
  // Check session
  const saved = loadAuth();
  if (sessionStorage.getItem(SESSION_K) === '1' && saved?.token) {
    contributorName = saved.name || '';
    ghToken = saved.token;
    showApp();
  }

  // Login
  el('login-btn')?.addEventListener('click', submitLogin);
  el('login-token')?.addEventListener('keydown', e => { if (e.key === 'Enter') submitLogin(); });
  el('login-name')?.addEventListener('keydown', e => { if (e.key === 'Enter') el('login-token')?.focus(); });

  // 5-tap admin
  el('login-title-tap')?.addEventListener('click', handleTitleTap);
  document.querySelectorAll('.top-title, .login-title').forEach(t => t.addEventListener('click', handleTitleTap));

  // Nav tabs
  document.querySelectorAll('.nav-btn').forEach(b => b.addEventListener('click', () => switchTab(b.dataset.tab)));

  // Lang tabs
  document.querySelectorAll('.lang-tab').forEach(b => b.addEventListener('click', () => switchLangTab(b.dataset.lang)));

  // Track focused input for Ge'ez toolbar
  document.addEventListener('focusin', e => {
    if (e.target.tagName === 'TEXTAREA' || (e.target.tagName === 'INPUT' && e.target.type === 'text')) {
      lastFocusedInput = e.target;
    }
  });

  // Editor topbar
  el('btn-hymn-list')?.addEventListener('click', () => { renderDraftList(); openSheet('sheet-hymn-list'); });
  el('btn-preview-toggle')?.addEventListener('click', togglePreview);
  el('btn-preview-close')?.addEventListener('click', togglePreview);
  el('btn-save-draft')?.addEventListener('click', () => { autoSaveDraft(); toast('Draft saved ✓', 'success'); });
  el('btn-submit')?.addEventListener('click', startSubmit);

  // Meta field changes
  el('f-title')?.addEventListener('input', () => { schedAutoSave(); el('editor-hymn-label').textContent = el('f-title').value || 'New Mezmur'; });

  // Sheets
  document.querySelectorAll('.sheet-overlay').forEach(s => s.addEventListener('click', e => { if (e.target === s) s.style.display = 'none'; }));

  // Hymn list sheet
  el('btn-new-hymn')?.addEventListener('click', newHymn);

  // Submit confirm
  el('btn-confirm-submit')?.addEventListener('click', doSubmit);
  el('success-ok')?.addEventListener('click', () => closeSheet('sheet-success'));

  // Proof of work
  el('btn-export-pow')?.addEventListener('click', exportPOW);

  // Admin
  el('btn-init-files')?.addEventListener('click', initGHFiles);
  el('btn-logout')?.addEventListener('click', logout);

  // Pending sync
  el('btn-retry-pending')?.addEventListener('click', retryPending);

  // Catalog
  populateCatalogGroupDropdown();

  // Cmd+S
  document.addEventListener('keydown', e => {
    if ((e.ctrlKey || e.metaKey) && e.key === 's') { e.preventDefault(); autoSaveDraft(); toast('Saved ✓', 'success'); }
  });
}

document.addEventListener('DOMContentLoaded', init);
