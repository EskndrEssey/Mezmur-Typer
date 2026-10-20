'use strict';
// ═══════════════════════════════════════════════════════════
//  WAZEMA · Hymn Entry Tool  v2
// ═══════════════════════════════════════════════════════════

// ── CONSTANTS ──────────────────────────────────────────────
const REPO      = { owner:'EskndrEssey', repo:'Mezmur-Typer', branch:'main', folder:'data' };
const LANGS     = ['en','ti','ti_ro','am','am_ro','om'];
const LNAME     = { en:'English', ti:'Tigrinya', ti_ro:'Tigrinya (Rom.)', am:'Amharic', am_ro:'Amharic (Rom.)', om:'Oromo' };
const LSHORT    = { en:'EN', ti:'TI', ti_ro:'TI-R', am:'AM', am_ro:'AM-R', om:'OM' };
const STATUSES  = { draft:'Draft', review:'Needs Review', final:'Final' };

const STORE_KEY = 'wz2_hymns';
const POW_KEY   = 'wz2_pow';
const PEND_KEY  = 'wz2_pending';
const AUTH_KEY  = 'wz2_auth';
const SESSION_K = 'wz2_sess';

const GROUP_TAXONOMY = {
  'Sillase':       { label:'ሥላሴ · Holy Trinity',              file:'Sillase',       subgroups:[{key:'Wereb',label:'Wereb / ወረብ'},{key:'General',label:'General'}] },
  'Egziabher':     { label:'እግዚኣብሔር · Feasts of the Lord',   file:'Egziabher',     subgroups:[
    {key:'Lidet',label:'Lidet / Christmas'},{key:'Timket',label:'Timket / Epiphany'},
    {key:'Hosanna',label:'Hosanna'},{key:'Siglet',label:'Siglet / Good Friday'},
    {key:'Tinsae',label:'Tinsae / Easter'},{key:'Erget',label:'Erget / Ascension'},
    {key:'Pentecost',label:'Pentecost'},{key:'DebreTabor',label:'Debre Tabor'},
    {key:'KibreTabot',label:'Kibre Tabot'},{key:'MedhaneAlem',label:'Medhane Alem'},
    {key:'Pagumen',label:'Pagumen'},{key:'Meskel',label:'Meskel'},
    {key:'Mera',label:'Mera / Wedding'},{key:'Wereb',label:'Wereb / ወረብ'},{key:'General',label:'General'}
  ]},
  'Mariam':        { label:'ማርያም · St. Mary',                 file:'Mariam',        subgroups:[
    {key:'Lideta',label:'Lideta'},{key:'KidaneMehret',label:'Kidane Mehret'},
    {key:'Filseta',label:'Filseta'},{key:'SdetMariam',label:'Sdet Mariam'},
    {key:'TsomeMariam',label:'Tsome Mariam'},{key:'Mera',label:'Mera / Wedding'},
    {key:'Wereb',label:'Wereb / ወረብ'},{key:'General',label:'General'}
  ]},
  'Giorgis':       { label:'ቅዱስ ጊዮርጊስ · St. George',         file:'Giorgis',       subgroups:[{key:'Wereb',label:'Wereb / ወረብ'},{key:'General',label:'General'}] },
  'Michael':       { label:'ቅዱስ ሚካኤል · St. Michael',          file:'Michael',       subgroups:[{key:'Wereb',label:'Wereb / ወረብ'},{key:'General',label:'General'}] },
  'Gabriel':       { label:'ቅዱስ ገብርኤል · St. Gabriel',         file:'Gabriel',       subgroups:[{key:'Wereb',label:'Wereb / ወረብ'},{key:'General',label:'General'}] },
  'KidusnAbbot':   { label:'ቅዱሳን ኣቦት · Holy Fathers',         file:'KidusnAbbot',   subgroups:[{key:'TekleHaymanot',label:'Tekle Haymanot'},{key:'Yared',label:'St. Yared'},{key:'Wereb',label:'Wereb / ወረብ'},{key:'General',label:'General'}] },
  'KidusnMelaikt': { label:'ቅዱሳን መላእኽት · Angels',             file:'KidusnMelaikt', subgroups:[{key:'Wereb',label:'Wereb / ወረብ'},{key:'General',label:'General'}] },
  'Nissha':        { label:'ንስሓ · Repentance',                 file:'Nissha',        subgroups:[{key:'Wereb',label:'Wereb / ወረብ'},{key:'General',label:'General'}] },
  'Zewetr':        { label:'ዘወትር · Everyday',                  file:'Zewetr',        subgroups:[{key:'Wereb',label:'Wereb / ወረብ'},{key:'EverySunday',label:'Every Sunday'}] },
  'Mera':          { label:'መርዓ · Wedding',                    file:'Mera',          subgroups:[{key:'Wereb',label:'Wereb / ወረብ'},{key:'General',label:'General'}] },
  'Yohannes':      { label:'ቅዱስ ዮሓንስ · St. John',             file:'Yohannes',      subgroups:[{key:'Wereb',label:'Wereb / ወረብ'},{key:'General',label:'General'}] },
};
const ALL_GROUPS = Object.keys(GROUP_TAXONOMY);

// ── STATE ──────────────────────────────────────────────────
let contributorName = '';
let ghToken = '';
let hymns = [];           // all hymns (merged local + GitHub)
let ghHymns = [];         // catalog from GitHub only
let activeHymn = null;
let pendingSync = [];
let powLog = [];
let saveTimer = null, toastTimer = null, tapCount = 0, tapTimer = null;
let hasUnsaved = false;
let lastFocused = null;

// ── HELPERS ────────────────────────────────────────────────
function el(id)    { return document.getElementById(id); }
function uid()     { return 'h_' + Date.now().toString(36) + Math.random().toString(36).slice(2,5); }
function esc(s)    { return s ? String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;') : ''; }
function gLabel(k) { return GROUP_TAXONOMY[k]?.label || k; }
function getSubs(k){ return GROUP_TAXONOMY[k]?.subgroups || []; }
function fmtDate(iso) { try { return new Date(iso).toLocaleString('en-US',{month:'short',day:'numeric',year:'numeric',hour:'2-digit',minute:'2-digit'}); } catch(e){ return iso||''; } }
function wordCount(s)  { return s ? s.trim().split(/\s+/).filter(Boolean).length : 0; }
function charCount(s)  { return s ? s.replace(/\s/g,'').length : 0; }
function hymnTitle(h)  { for(const l of LANGS){ const t=h.langs[l]?.title?.trim(); if(t) return t; } return '(Untitled)'; }

// ── DATA MODEL ─────────────────────────────────────────────
function newLang()  { return { title:'', subtitle:'', chorus:'', verses:[], youtube:'', groupName:'' }; }
function newLine(p='',t='') { return { prefix:p, text:t }; }
function newVerse() { return { lines:[newLine()] }; }
function newHymn(o={}) {
  const id = o.id || uid();
  const langs = {};
  LANGS.forEach(l => langs[l] = newLang());
  return { id, groupKey:'', subgroups:[], zemari:'', color:'', status:'draft', langs,
           createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(), ...o };
}
function migrate(h) {
  if (!h.langs) h.langs = {};
  LANGS.forEach(l => {
    if (!h.langs[l]) h.langs[l] = newLang();
    const ld = h.langs[l];
    if (!ld.verses)    ld.verses = [];
    if (!ld.chorus)    ld.chorus = '';
    if (!ld.youtube)   ld.youtube = '';
    if (!ld.groupName) ld.groupName = '';
    if (!ld.title)     ld.title = '';
    if (!ld.subtitle)  ld.subtitle = '';
    // Convert plain string verses to {lines:[]} objects
    ld.verses = ld.verses.map(v => {
      if (typeof v === 'string') return { lines: v.split('\n').map(ln => newLine('', ln)).filter(l => l.text.trim()) };
      if (!v.lines) v.lines = [];
      return v;
    });
  });
  if (!h.zemari)    h.zemari = h.singer || '';
  if (!h.groupKey && h.group) h.groupKey = typeof h.group === 'string' ? h.group : '';
  if (!h.subgroups) h.subgroups = [];
  if (!h.createdAt) h.createdAt = new Date().toISOString();
  if (!h.updatedAt) h.updatedAt = new Date().toISOString();
}

// ── STORAGE ────────────────────────────────────────────────
function save()        { try { localStorage.setItem(STORE_KEY, JSON.stringify(hymns)); } catch(e){} }
function schedSave()   { markUnsaved(); clearTimeout(saveTimer); saveTimer = setTimeout(save, 400); }
function savePOW()     { try { localStorage.setItem(POW_KEY, JSON.stringify(powLog)); } catch(e){} }
function savePending() { try { localStorage.setItem(PEND_KEY, JSON.stringify(pendingSync)); } catch(e){} }
function saveAuth()    { try { localStorage.setItem(AUTH_KEY, JSON.stringify({ name: contributorName, token: ghToken })); } catch(e){} }

function loadAll() {
  try { const d = localStorage.getItem(STORE_KEY); hymns = d ? JSON.parse(d) : []; hymns.forEach(migrate); } catch(e) { hymns = []; }
  try { const d = localStorage.getItem(POW_KEY);   powLog = d ? JSON.parse(d) : []; } catch(e) { powLog = []; }
  try { const d = localStorage.getItem(PEND_KEY);  pendingSync = d ? JSON.parse(d) : []; } catch(e) { pendingSync = []; }
}

// ── UNSAVED BANNER ─────────────────────────────────────────
function markUnsaved() {
  hasUnsaved = true;
  const b = el('unsaved-banner'); if (b) b.style.display = 'block';
}
function markSaved() {
  hasUnsaved = false;
  const b = el('unsaved-banner'); if (b) b.style.display = 'none';
}

window.addEventListener('beforeunload', e => {
  if (hasUnsaved) { e.preventDefault(); e.returnValue = ''; }
});

// ── TOAST ──────────────────────────────────────────────────
function toast(msg, type='') {
  const t = el('toast'); if (!t) return;
  t.textContent = msg;
  t.className = 'toast' + (type ? ' '+type : '') + ' visible';
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => t.classList.remove('visible'), 2800);
}

// ── PAGES / SHEETS ─────────────────────────────────────────
function showPage(id) {
  document.querySelectorAll('.page').forEach(p => p.style.display = 'none');
  const p = el(id); if (p) p.style.display = 'flex';
}
function openSheet(id)  { const s = el(id); if (s) s.style.display = 'flex'; }
function closeSheet(id) { const s = el(id); if (s) s.style.display = 'none'; }

// ── TABS (in app) ───────────────────────────────────────────
function switchTab(name) {
  document.querySelectorAll('.tab-content').forEach(t => t.style.display = 'none');
  document.querySelectorAll('.nav-btn').forEach(b => b.classList.remove('active'));
  const tab = el('tab-' + name), btn = el('nav-' + name);
  if (tab) tab.style.display = 'flex';
  if (btn) btn.classList.add('active');
  if (name === 'catalog') renderCatalog();
  if (name === 'proofwork') renderPOW();
}

// ── AUTH ───────────────────────────────────────────────────
async function submitLogin() {
  const nameInp = el('login-name'), tokInp = el('login-token');
  const errEl = el('login-err'), btn = el('login-btn');
  const name = nameInp.value.trim(), tok = tokInp.value.trim();
  if (!name) { showLoginErr('Enter your name'); return; }
  if (!tok)  { showLoginErr('Paste your GitHub token'); return; }
  btn.disabled = true; btn.textContent = 'Verifying…';
  if (errEl) errEl.style.display = 'none';
  try {
    const r = await fetch(`https://api.github.com/repos/${REPO.owner}/${REPO.repo}`, {
      headers: { Authorization: 'Bearer ' + tok, Accept: 'application/vnd.github+json' }
    });
    if (r.ok) {
      contributorName = name; ghToken = tok;
      saveAuth(); sessionStorage.setItem(SESSION_K, '1');
      tokInp.value = '';
      showApp();
    } else {
      showLoginErr(r.status === 401 ? 'Invalid token — contact the administrator' : 'Access denied (' + r.status + ')');
      tokInp.value = ''; shakeEl(tokInp);
    }
  } catch(e) { showLoginErr('Network error — check your connection'); }
  finally { btn.disabled = false; btn.textContent = 'Enter ✝'; }
}
function showLoginErr(msg) { const e = el('login-err'); if (e) { e.textContent = msg; e.style.display = 'block'; } }
function shakeEl(e) { e.classList.remove('shake'); void e.offsetWidth; e.classList.add('shake'); }

function logout() {
  sessionStorage.removeItem(SESSION_K);
  contributorName = ''; ghToken = '';
  closeSheet('sheet-admin');
  showPage('page-login');
}

// ── SHOW APP ────────────────────────────────────────────────
function showApp() {
  loadAll();
  showPage('page-list');
  renderList();
  if (pendingSync.length) toast(pendingSync.length + ' pending submissions — tap ⋯ pending', 'gold');
  loadFromGitHub();
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

function ghPath(groupKey) { return REPO.folder + '/' + (GROUP_TAXONOMY[groupKey]?.file || groupKey) + '.json'; }

function decodeGH(b64) { return JSON.parse(decodeURIComponent(escape(atob(b64.replace(/\n/g,''))))); }

// ── LOAD FROM GITHUB ────────────────────────────────────────
async function loadFromGitHub() {
  const statsEl = el('sidebar-stats');
  if (statsEl) statsEl.textContent = 'Loading from GitHub…';
  const all = [];
  for (const k of ALL_GROUPS) {
    try {
      const f = await ghGet(ghPath(k));
      if (!f) continue;
      const arr = decodeGH(f.content);
      if (Array.isArray(arr)) arr.forEach(r => { const h = rawToHymn(r, k); all.push(h); });
    } catch(e) {}
    await new Promise(r => setTimeout(r, 80));
  }
  ghHymns = all;
  if (all.length > 0) {
    const ghIds = new Set(all.map(h => h.id));
    const localOnly = hymns.filter(h => !ghIds.has(h.id));
    hymns = [...all, ...localOnly];
    hymns.forEach(migrate);
    save();
  }
  renderList();
  if (all.length > 0) toast('Loaded ' + all.length + ' hymns from GitHub ✝', 'success');
}

async function refreshFromGitHub() {
  const btn = el('btn-refresh-gh');
  if (btn) { btn.disabled = true; btn.textContent = '↻…'; }
  try { await loadFromGitHub(); }
  finally { if (btn) { btn.disabled = false; btn.textContent = '↻'; } }
}

function rawToHymn(r, groupKey) {
  const h = newHymn({ id: r.id || uid() });
  h.groupKey  = r.category || groupKey || '';
  h.subgroups = r.subcategories || (r.subcategory ? r.subcategory.split(',') : []);
  h.zemari    = r.singer || r.zemari || '';
  h.color     = r.color || '';
  h.status    = r.status || 'final';
  h.createdAt = r.metadata?.created_at || r.createdAt || new Date().toISOString();
  h.updatedAt = r.metadata?.updated_at || r.updatedAt || new Date().toISOString();
  LANGS.forEach(l => {
    const ld = h.langs[l];
    if (r.title?.[l])    ld.title    = r.title[l];
    if (r.subtitle?.[l]) ld.subtitle = r.subtitle[l];
    if (r.youtubeUrls?.[l]) ld.youtube = r.youtubeUrls[l];
    if (r.group?.[l])    ld.groupName = r.group[l];
    if (r.lyrics?.[l])   { const p = parseLyrics(r.lyrics[l]); ld.chorus = p.chorus; ld.verses = p.verses; }
  });
  migrate(h);
  return h;
}

// ── LYRICS ─────────────────────────────────────────────────
function buildLyrics(ld) {
  const chorus = (ld.chorus || '').trim();
  const verses = (ld.verses || []).filter(v => v.lines && v.lines.some(l => (l.prefix||l.text||'').trim()));
  if (!chorus && !verses.length) return '';
  const tag = chorus ? '[[chorus]]\n' + chorus + '\n[[/chorus]]' : null;
  if (!verses.length) return tag || '';
  const parts = [];
  if (tag) parts.push(tag);
  verses.forEach(v => {
    const ls = v.lines.map(l => {
      const p = (l.prefix||'').trimEnd();
      return p ? '[[highlight]]'+p+' [[/highlight]]'+(l.text||'') : (l.text||'');
    }).filter(s => s.trim());
    if (ls.length) { parts.push(ls.join('\n')); if (tag) parts.push(tag); }
  });
  return parts.join('\n \n');
}

function parseLyrics(lyrics) {
  const out = { chorus:'', verses:[] };
  if (!lyrics) return out;
  const cm = lyrics.match(/\[\[chorus\]\]([\s\S]*?)\[\[\/chorus\]\]/);
  if (cm) out.chorus = cm[1].trim();
  const noC = lyrics.replace(/\[\[chorus\]\][\s\S]*?\[\[\/chorus\]\]/g,'').trim();
  if (!noC) return out;
  noC.split(/\n\s*\n/).forEach(block => {
    block = block.trim(); if (!block) return;
    const lines = block.split('\n').map(raw => {
      raw = raw.trim();
      const m = raw.match(/^\[\[highlight\]\]([\s\S]*?)\[\[\/highlight\]\]([\s\S]*)$/);
      return m ? newLine(m[1].trimEnd(), m[2]) : newLine('', raw);
    }).filter(l => (l.prefix||l.text||'').trim());
    if (lines.length) out.verses.push({ lines });
  });
  return out;
}

function hymnToExport(h) {
  const out = { id: h.id };
  const gm = {}; LANGS.forEach(l => gm[l] = (h.langs[l]?.groupName||'').trim()); out.group = gm;
  const tm = {}; LANGS.forEach(l => { const t=(h.langs[l]?.title||'').trim(); if(t) tm[l]=t; }); out.title = tm;
  const lm = {}; LANGS.forEach(l => { const ly=buildLyrics(h.langs[l]); if(ly) lm[l]=ly; }); out.lyrics = lm;
  const sm = {}; LANGS.forEach(l => { const s=(h.langs[l]?.subtitle||'').trim(); if(s) sm[l]=s; }); if(Object.keys(sm).length) out.subtitle = sm;
  const um = {}; LANGS.forEach(l => { const u=(h.langs[l]?.youtube||'').trim(); if(u) um[l]=u; }); if(Object.keys(um).length) out.youtubeUrls = um;
  if (h.zemari?.trim())  out.singer      = h.zemari.trim();
  if (h.color?.trim())   out.color       = h.color.trim();
  if (h.subgroups?.length){ out.subcategory = h.subgroups.join(','); out.subcategories = h.subgroups; }
  if (h.groupKey?.trim()) out.category   = h.groupKey.trim();
  out.status = h.status || 'draft';
  // Proof-of-work metadata
  const allText = LANGS.map(l => (h.langs[l]?.chorus||'') + (h.langs[l]?.verses||[]).map(v=>v.lines?.map(ln=>ln.text||'').join(' ')||'').join(' ')).join(' ');
  out.metadata = {
    contributor_id:   ghToken.slice(0, 8),
    contributor_name: contributorName,
    created_at:       h.createdAt || new Date().toISOString(),
    updated_at:       new Date().toISOString(),
    word_count:       wordCount(allText),
    character_count:  charCount(allText),
    source_type:      h.sourceType || 'Book',
    proof_commit_sha: ''
  };
  return out;
}

// ── LIST PAGE ───────────────────────────────────────────────
function renderList() {
  const listEl = el('hymn-list'), statsEl = el('sidebar-stats');
  const search = (el('search-input')?.value || '').toLowerCase();
  const group  = el('filter-group')?.value || '';
  const status = el('filter-status')?.value || '';

  // Rebuild group dropdown
  const gsel = el('filter-group');
  if (gsel) {
    const prev = gsel.value;
    gsel.innerHTML = '<option value="">All Groups</option>';
    ALL_GROUPS.forEach(k => {
      const o = document.createElement('option');
      o.value = k; o.textContent = gLabel(k);
      if (k === prev) o.selected = true;
      gsel.appendChild(o);
    });
  }

  const filtered = hymns.filter(h => {
    const t = hymnTitle(h).toLowerCase();
    if (search && !t.includes(search) && !h.id.includes(search)) return false;
    if (group  && h.groupKey !== group)  return false;
    if (status && h.status  !== status)  return false;
    return true;
  });

  if (statsEl) statsEl.textContent = filtered.length + ' of ' + hymns.length + ' hymn' + (hymns.length !== 1 ? 's' : '');

  if (!listEl) return;
  if (!filtered.length) {
    listEl.innerHTML = '<div style="padding:48px 24px;text-align:center;color:rgba(255,255,255,.25);font-size:15px;line-height:2">No hymns yet.<br>Tap <strong style="color:rgba(255,255,255,.5)">+ New</strong> to begin.</div>';
    return;
  }
  listEl.innerHTML = '';
  filtered.forEach(h => {
    const d = document.createElement('div');
    d.className = 'hymn-item';
    const gc = h.groupKey ? '<span class="chip chip-group">'+esc(h.groupKey)+'</span>' : '';
    const sc = (h.subgroups||[]).map(s => '<span class="chip chip-sub">'+esc(s)+'</span>').join('');
    const badge = '<span class="status-badge status-'+h.status+'">'+(STATUSES[h.status]||h.status)+'</span>';
    d.innerHTML = '<div class="hymn-item-left"><div class="hymn-item-title">'+esc(hymnTitle(h))+'</div><div class="hymn-item-meta">'+gc+sc+badge+'</div></div><span class="hymn-item-arrow">›</span>';
    d.addEventListener('click', () => selectHymn(h.id));
    listEl.appendChild(d);
  });
}

function selectHymn(id) {
  activeHymn = hymns.find(h => h.id === id) || null;
  if (!activeHymn) return;
  renderEditor();
  showPage('page-editor');
}

function addNewHymn() {
  const h = newHymn();
  hymns.unshift(h);
  save(); markSaved();
  selectHymn(h.id);
}

// ── EDITOR ─────────────────────────────────────────────────
function autoResize(el) { el.style.height = 'auto'; el.style.height = el.scrollHeight + 'px'; }

function renderEditor() {
  const h = activeHymn; if (!h) return;
  const area = el('editor-area'); if (!area) return;

  const statHTML = Object.entries(STATUSES).map(([k,v]) =>
    '<button class="status-toggle'+(h.status===k?' active-'+k:'')+'" data-status="'+k+'">'+v+'</button>'
  ).join('');

  const catHTML = ALL_GROUPS.map(k =>
    '<button class="cat-toggle'+(h.groupKey===k?' active':'')+'" data-cat="'+k+'">'+esc(gLabel(k))+'</button>'
  ).join('');

  const subs = getSubs(h.groupKey);
  const subHTML = (subs.length ? '<span class="sub-wrap-hint">Select all that apply:</span>' : '') +
    subs.map(s =>
      '<button class="sub-toggle'+((h.subgroups||[]).includes(s.key)?' active':'')+'" data-sub="'+esc(s.key)+'">'+esc(s.label)+'</button>'
    ).join('');

  const tabs = LANGS.map(l =>
    '<button class="lang-tab'+(l==='en'?' active':'')+'" data-lang="'+l+'">'+LNAME[l]+'</button>'
  ).join('');

  const panels = LANGS.map(l => {
    const ld = h.langs[l] || newLang();
    const verses = (ld.verses||[]).map((v,vi) => buildVerseHTML(v,vi)).join('');
    return '<div class="lang-panel'+(l==='en'?' active':'')+'" data-lang="'+l+'">'+
      '<div class="form-row"><label class="form-label">Title ('+LSHORT[l]+')</label>'+
        '<input class="form-input lang-title" data-lang="'+l+'" value="'+esc(ld.title||'')+'" placeholder="Title in '+LNAME[l]+'…"/></div>'+
      '<div class="form-row"><label class="form-label">Subtitle</label>'+
        '<input class="form-input lang-subtitle" data-lang="'+l+'" value="'+esc(ld.subtitle||'')+'" placeholder="Optional"/></div>'+
      '<div class="form-row"><label class="form-label">YouTube URL</label>'+
        '<input type="url" class="form-input lang-youtube" data-lang="'+l+'" value="'+esc(ld.youtube||'')+'" placeholder="https://youtube.com/…"/></div>'+
      '<div class="chorus-card">'+
        '<div class="chorus-header"><span class="chorus-label">♪ Chorus / ኣዝ</span><span class="chorus-hint">type once, repeats after every verse</span></div>'+
        '<textarea class="chorus-input lang-chorus" data-lang="'+l+'" placeholder="Chorus here…">'+esc(ld.chorus||'')+'</textarea>'+
      '</div>'+
      '<div class="verse-hint">💡 <strong>Gold box</strong> = highlighted prefix. Leave empty for plain line.</div>'+
      '<div class="verse-actions-row">'+
        '<button class="add-verse-btn" data-lang="'+l+'">+ Verse / ስታንዛ</button>'+
        '<button class="dup-verse-btn" data-lang="'+l+'">⧉ Dup Last</button>'+
      '</div>'+
      '<div class="verse-list" id="vl-'+l+'">'+(verses || '<div style="padding:20px;text-align:center;color:rgba(255,255,255,.25);font-style:italic">No verses yet</div>')+'</div>'+
    '</div>';
  }).join('');

  area.innerHTML =
    '<div class="form-section"><div class="form-section-title">Status</div><div class="form-body"><div id="stat-row">'+statHTML+'</div></div></div>'+
    '<div class="form-section"><div class="form-section-title">Category</div><div class="form-body">'+
      '<div id="cat-wrap">'+catHTML+'</div>'+
      '<div id="sub-wrap" style="'+(subs.length?'':'display:none')+'">'+subHTML+'</div>'+
    '</div></div>'+
    '<div class="form-section"><div class="form-section-title">Details</div><div class="form-body">'+
      '<div class="form-row"><label class="form-label">Zemari/t (Singer / Composer)</label>'+
        '<input class="form-input" id="meta-zemari" value="'+esc(h.zemari||'')+'" placeholder="Name"/></div>'+
      '<div class="form-row"><label class="form-label">Color (optional)</label>'+
        '<input class="form-input" id="meta-color" value="'+esc(h.color||'')+'" placeholder="#DB2777"/></div>'+
    '</div></div>'+
    '<div class="form-section"><div class="form-section-title">Ge\'ez Punctuation</div>'+
      '<div class="geez-toolbar">'+
        '<button class="geez-btn" onclick="insertGeez(\'፡\')">፡</button>'+
        '<button class="geez-btn" onclick="insertGeez(\'፣\')">፣</button>'+
        '<button class="geez-btn" onclick="insertGeez(\'፤\')">፤</button>'+
        '<button class="geez-btn" onclick="insertGeez(\'፥\')">፥</button>'+
        '<button class="geez-btn" onclick="insertGeez(\'፦\')">፦</button>'+
        '<button class="geez-btn" onclick="insertGeez(\'፨\')">፨</button>'+
      '</div>'+
    '</div>'+
    '<div class="form-section"><div class="form-section-title">Lyrics</div>'+
      '<div class="lang-tabs" id="ltabs">'+tabs+'</div>'+
      panels+
    '</div>';

  bindEditor(area, h);
}

function buildVerseHTML(v, vi) {
  const lines = (v.lines||[]).map((ln,li) => {
    const hp = !!(ln.prefix||'').trim();
    return '<div class="line-row'+(hp?' highlighted':'')+'" data-vi="'+vi+'" data-li="'+li+'">'+
      '<input class="line-prefix" data-vi="'+vi+'" data-li="'+li+'" value="'+esc(ln.prefix||'')+'" placeholder="prefix"/>'+
      '<textarea class="line-text" data-vi="'+vi+'" data-li="'+li+'" rows="1" placeholder="line…">'+esc(ln.text||'')+'</textarea>'+
      '<button class="line-del" data-vi="'+vi+'" data-li="'+li+'">✕</button>'+
    '</div>';
  }).join('');
  return '<div class="verse-card" data-vi="'+vi+'">'+
    '<div class="verse-header">'+
      '<span class="verse-title">Verse / ስታንዛ '+(vi+1)+'</span>'+
      '<div class="verse-btns">'+
        '<button class="v-btn vu" data-vi="'+vi+'">↑</button>'+
        '<button class="v-btn vd" data-vi="'+vi+'">↓</button>'+
        '<button class="v-btn del vx" data-vi="'+vi+'">✕</button>'+
      '</div>'+
    '</div>'+
    '<div class="line-list" data-vi="'+vi+'">'+lines+'</div>'+
    '<button class="add-line-btn" data-vi="'+vi+'">+ Add line</button>'+
  '</div>';
}

function refreshVerses(area, h, lang) {
  const c = area.querySelector('#vl-'+lang); if (!c) return;
  const vs = h.langs[lang].verses || [];
  c.innerHTML = vs.length ? vs.map((v,vi) => buildVerseHTML(v,vi)).join('') :
    '<div style="padding:20px;text-align:center;color:rgba(255,255,255,.25);font-style:italic">No verses yet</div>';
  c.querySelectorAll('.line-text').forEach(autoResize);
  bindVerses(area, h, lang);
}

function bindEditor(area, h) {
  area.querySelector('#stat-row').addEventListener('click', e => {
    const b = e.target.closest('.status-toggle'); if (!b) return;
    h.status = b.dataset.status;
    area.querySelectorAll('.status-toggle').forEach(x => x.className = 'status-toggle');
    b.className = 'status-toggle active-'+h.status;
    schedSave(); renderList();
  });

  area.querySelector('#cat-wrap').addEventListener('click', e => {
    const b = e.target.closest('.cat-toggle'); if (!b) return;
    h.groupKey = b.dataset.cat; h.subgroups = [];
    area.querySelectorAll('.cat-toggle').forEach(x => x.classList.toggle('active', x.dataset.cat===h.groupKey));
    const sw = area.querySelector('#sub-wrap');
    const subs = getSubs(h.groupKey);
    sw.innerHTML = (subs.length ? '<span class="sub-wrap-hint">Select all that apply:</span>' : '') +
      subs.map(s => '<button class="sub-toggle" data-sub="'+esc(s.key)+'">'+esc(s.label)+'</button>').join('');
    sw.style.display = subs.length ? '' : 'none';
    schedSave(); renderList();
  });

  area.querySelector('#sub-wrap')?.addEventListener('click', e => {
    const b = e.target.closest('.sub-toggle'); if (!b) return;
    if (!h.subgroups) h.subgroups = [];
    const key = b.dataset.sub;
    const idx = h.subgroups.indexOf(key);
    if (idx >= 0) h.subgroups.splice(idx, 1); else h.subgroups.push(key);
    area.querySelectorAll('.sub-toggle').forEach(x => x.classList.toggle('active', h.subgroups.includes(x.dataset.sub)));
    schedSave(); renderList();
  });

  area.querySelector('#meta-zemari')?.addEventListener('input', e => { h.zemari = e.target.value; schedSave(); });
  area.querySelector('#meta-color')?.addEventListener('input',  e => { h.color = e.target.value;  schedSave(); });

  area.querySelector('#ltabs').addEventListener('click', e => {
    const b = e.target.closest('.lang-tab'); if (!b) return;
    const lang = b.dataset.lang;
    area.querySelectorAll('.lang-tab').forEach(x    => x.classList.toggle('active', x.dataset.lang===lang));
    area.querySelectorAll('.lang-panel').forEach(x  => x.classList.toggle('active', x.dataset.lang===lang));
  });

  area.querySelectorAll('.lang-title').forEach(i   => i.addEventListener('input', () => { h.langs[i.dataset.lang].title    = i.value; schedSave(); renderList(); }));
  area.querySelectorAll('.lang-subtitle').forEach(i => i.addEventListener('input', () => { h.langs[i.dataset.lang].subtitle = i.value; schedSave(); }));
  area.querySelectorAll('.lang-youtube').forEach(i  => i.addEventListener('input', () => { h.langs[i.dataset.lang].youtube  = i.value; schedSave(); }));
  area.querySelectorAll('.lang-chorus').forEach(i   => {
    autoResize(i);
    i.addEventListener('input', () => { h.langs[i.dataset.lang].chorus = i.value; schedSave(); autoResize(i); });
  });

  area.querySelectorAll('.add-verse-btn').forEach(b => b.addEventListener('click', () => {
    const lang = b.dataset.lang;
    h.langs[lang].verses.push(newVerse());
    schedSave(); refreshVerses(area, h, lang);
  }));

  area.querySelectorAll('.dup-verse-btn').forEach(b => b.addEventListener('click', () => {
    const lang = b.dataset.lang, vs = h.langs[lang].verses;
    if (!vs.length) return;
    vs.push(JSON.parse(JSON.stringify(vs[vs.length-1])));
    schedSave(); refreshVerses(area, h, lang);
  }));

  LANGS.forEach(l => bindVerses(area, h, l));

  // track last focused for Ge'ez toolbar
  area.querySelectorAll('input, textarea').forEach(inp => inp.addEventListener('focus', () => { lastFocused = inp; }));
}

function bindVerses(area, h, lang) {
  const vl = area.querySelector('#vl-'+lang); if (!vl) return;
  vl.querySelectorAll('.line-text').forEach(autoResize);

  vl.addEventListener('input', e => {
    const vi = +e.target.dataset.vi, li = +e.target.dataset.li;
    if (isNaN(vi) || isNaN(li)) return;
    if (!h.langs[lang].verses[vi]) return;
    if (e.target.classList.contains('line-text'))   { h.langs[lang].verses[vi].lines[li].text   = e.target.value; autoResize(e.target); }
    if (e.target.classList.contains('line-prefix')) { h.langs[lang].verses[vi].lines[li].prefix = e.target.value;
      const row = e.target.closest('.line-row');
      if (row) row.classList.toggle('highlighted', !!e.target.value.trim());
    }
    schedSave();
  });

  vl.addEventListener('click', e => {
    const vi = +(e.target.dataset.vi ?? e.target.closest('[data-vi]')?.dataset.vi);
    const li = +(e.target.dataset.li ?? e.target.closest('[data-li]')?.dataset.li);
    const vs = h.langs[lang].verses;

    if (e.target.classList.contains('vu')) {
      if (vi > 0) { [vs[vi], vs[vi-1]] = [vs[vi-1], vs[vi]]; schedSave(); refreshVerses(area, h, lang); }
    } else if (e.target.classList.contains('vd')) {
      if (vi < vs.length-1) { [vs[vi], vs[vi+1]] = [vs[vi+1], vs[vi]]; schedSave(); refreshVerses(area, h, lang); }
    } else if (e.target.classList.contains('vx')) {
      vs.splice(vi, 1); schedSave(); refreshVerses(area, h, lang);
    } else if (e.target.classList.contains('line-del')) {
      vs[vi].lines.splice(li, 1);
      if (!vs[vi].lines.length) vs.splice(vi, 1);
      schedSave(); refreshVerses(area, h, lang);
    } else if (e.target.classList.contains('add-line-btn')) {
      vs[vi].lines.push(newLine()); schedSave(); refreshVerses(area, h, lang);
    }
  });

  vl.addEventListener('keydown', e => {
    if (e.target.classList.contains('line-text') && e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      const vi = +e.target.dataset.vi, li = +e.target.dataset.li;
      h.langs[lang].verses[vi].lines.splice(li+1, 0, newLine());
      schedSave(); refreshVerses(area, h, lang);
      setTimeout(() => {
        const rows = area.querySelectorAll(`#vl-${lang} .line-row`);
        let count = 0;
        for (const row of rows) {
          if (+row.dataset.vi === vi) {
            if (+row.dataset.li === li+1) { row.querySelector('.line-text')?.focus(); break; }
          }
        }
      }, 50);
    }
  });
}

// ── GE'EZ TOOLBAR ──────────────────────────────────────────
function insertGeez(ch) {
  const inp = lastFocused;
  if (!inp || (inp.tagName !== 'TEXTAREA' && inp.tagName !== 'INPUT')) return;
  const s = inp.selectionStart, e = inp.selectionEnd;
  inp.value = inp.value.slice(0,s) + ch + inp.value.slice(e);
  inp.selectionStart = inp.selectionEnd = s + ch.length;
  inp.dispatchEvent(new Event('input', { bubbles: true }));
  inp.focus();
}

// ── PREVIEW ─────────────────────────────────────────────────
function showPreview() {
  const h = activeHymn; if (!h) return;
  const langTabs = el('preview-lang-tabs');
  const content  = el('preview-content');

  // Build lang tabs for preview
  langTabs.innerHTML = LANGS.map((l,i) =>
    '<button class="preview-lang-btn'+(i===0?' active':'')+'" data-lang="'+l+'">'+LNAME[l]+'</button>'
  ).join('');
  langTabs.addEventListener('click', e => {
    const b = e.target.closest('.preview-lang-btn'); if (!b) return;
    langTabs.querySelectorAll('.preview-lang-btn').forEach(x => x.classList.toggle('active', x===b));
    renderPreviewLang(h, b.dataset.lang);
  });

  renderPreviewLang(h, 'en');
  openSheet('sheet-preview');
}

function renderPreviewLang(h, lang) {
  const content = el('preview-content'); if (!content) return;
  const ld = h.langs[lang] || newLang();
  const chorus = (ld.chorus||'').trim();
  let html = '';
  if (ld.title) html += '<div class="pv-title">'+esc(ld.title)+'</div>';
  if (ld.subtitle) html += '<div class="pv-sub">'+esc(ld.subtitle)+'</div>';
  if (chorus) html += '<div class="pv-chorus">'+esc(chorus).replace(/\n/g,'<br>')+'</div>';
  (ld.verses||[]).forEach((v,i) => {
    const ls = v.lines||[];
    if (!ls.length) return;
    html += '<div class="pv-verse-num">Verse '+(i+1)+'</div><div class="pv-verse">';
    ls.forEach(l => {
      const p = (l.prefix||'').trim(), t = (l.text||'').trim();
      if (p) html += '<div class="pv-line"><span class="pv-prefix">'+esc(p)+'</span> '+esc(t)+'</div>';
      else html += '<div class="pv-line">'+esc(t)+'</div>';
    });
    html += '</div>';
    if (chorus) html += '<div class="pv-chorus pv-chorus-repeat">'+esc(chorus).replace(/\n/g,'<br>')+'</div>';
  });
  content.innerHTML = html || '<div style="color:rgba(255,255,255,.3);text-align:center;padding:40px">No content for '+LNAME[lang]+'</div>';
}

// ── SUBMIT ──────────────────────────────────────────────────
function startSubmit() {
  const h = activeHymn; if (!h) return;
  const hasContent = LANGS.some(l => (h.langs[l]?.chorus||'').trim() || (h.langs[l]?.verses||[]).some(v => v.lines?.some(ln => (ln.text||ln.prefix||'').trim())));
  if (!hasContent) { toast('Add some hymn content first', 'error'); return; }
  if (!h.groupKey) { toast('Select a category first', 'error'); return; }

  // Dup check
  const q = LANGS.map(l => h.langs[l]?.title?.toLowerCase().trim()).filter(Boolean)[0] || '';
  const dup = q ? ghHymns.find(g => g.id !== h.id && LANGS.some(l => (g.langs[l]?.title||'').toLowerCase().trim() === q)) : null;
  if (dup) {
    el('dup-msg').innerHTML = '"'+esc(hymnTitle(dup))+'" already exists in '+esc(dup.groupKey||'')+
      '.<br>Open the existing one to add translations, or submit as new.';
    el('dup-open').onclick = () => { closeSheet('sheet-dup'); selectHymn(dup.id); };
    el('dup-new').onclick  = () => { closeSheet('sheet-dup'); showSubmitConfirm(); };
    openSheet('sheet-dup'); return;
  }
  showSubmitConfirm();
}

function showSubmitConfirm() {
  const h = activeHymn;
  const langs = LANGS.filter(l => (h.langs[l]?.chorus||'').trim() || (h.langs[l]?.verses||[]).some(v => v.lines?.some(ln => (ln.text||'').trim())));
  const allText = LANGS.map(l => (h.langs[l]?.chorus||'') + (h.langs[l]?.verses||[]).map(v=>v.lines?.map(ln=>ln.text||'').join(' ')||'').join(' ')).join(' ');
  el('submit-summary').innerHTML =
    '<div class="submit-row"><span class="submit-row-label">Title</span><span>'+esc(hymnTitle(h))+'</span></div>'+
    '<div class="submit-row"><span class="submit-row-label">Contributor</span><span>'+esc(contributorName)+'</span></div>'+
    '<div class="submit-row"><span class="submit-row-label">Category</span><span>'+esc(gLabel(h.groupKey))+'</span></div>'+
    '<div class="submit-row"><span class="submit-row-label">Languages</span><span>'+langs.map(l=>LSHORT[l]).join(', ')+'</span></div>'+
    '<div class="submit-row"><span class="submit-row-label">Words</span><span>'+wordCount(allText)+'</span></div>'+
    '<div class="submit-row"><span class="submit-row-label">Characters</span><span>'+charCount(allText)+'</span></div>';
  openSheet('sheet-submit-confirm');
}

async function doSubmit() {
  const btn = el('btn-confirm-submit');
  if (btn) { btn.disabled = true; btn.textContent = 'Submitting…'; }
  closeSheet('sheet-submit-confirm');
  const h = activeHymn;
  try {
    const res = await submitToGitHub(h);
    recordPOW(h, res.sha);
    // Auto-start new hymn
    hymns = hymns.filter(x => x.id !== h.id);
    const fresh = newHymn();
    hymns.unshift(fresh);
    save(); markSaved();
    activeHymn = fresh;
    el('submitted-msg').textContent = '"'+hymnTitle(h)+'" submitted to GitHub ✓';
    openSheet('sheet-submitted');
    toast('Submitted ✓', 'success');
    ghHymns = ghHymns.filter(g => g.id !== h.id);
  } catch(e) {
    pendingSync.push({ hymn: JSON.parse(JSON.stringify(h)), failedAt: new Date().toISOString(), error: e.message });
    savePending();
    toast('Submit failed — saved to pending', 'error');
  } finally {
    if (btn) { btn.disabled = false; btn.textContent = 'Submit to GitHub ✝'; }
  }
}

function onSubmitOk() {
  closeSheet('sheet-submitted');
  renderEditor();
  renderList();
}

async function submitToGitHub(h) {
  const exported = hymnToExport(h);
  const path = ghPath(h.groupKey);
  const f = await ghGet(path);
  let arr = [];
  if (f) { try { arr = decodeGH(f.content); } catch(e) { arr = []; } }
  if (!Array.isArray(arr)) arr = [];
  const idx = arr.findIndex(x => x.id === exported.id);
  if (idx >= 0) arr[idx] = exported; else arr.push(exported);
  const res = await ghPut(path, JSON.stringify(arr, null, 2), f?.sha || null,
    `${contributorName}: ${hymnTitle(h)}`);
  return { sha: res.content?.sha || '' };
}

// ── PROOF OF WORK ────────────────────────────────────────────
function recordPOW(h, sha) {
  const allText = LANGS.map(l => (h.langs[l]?.chorus||'') + (h.langs[l]?.verses||[]).map(v=>v.lines?.map(ln=>ln.text||'').join(' ')||'').join(' ')).join(' ');
  const langs = LANGS.filter(l => (h.langs[l]?.chorus||'').trim() || (h.langs[l]?.verses||[]).some(v => v.lines?.some(ln => (ln.text||'').trim())));
  powLog.push({
    id: h.id, title: hymnTitle(h),
    group: gLabel(h.groupKey),
    subgroups: (h.subgroups||[]).join(', '),
    langs: langs.map(l=>LSHORT[l]).join(', '),
    submittedAt: new Date().toISOString(),
    wordCount: wordCount(allText), charCount: charCount(allText),
    sha: sha || '',
    commitUrl: sha ? `https://github.com/${REPO.owner}/${REPO.repo}/commit/${sha}` : ''
  });
  savePOW();
}

function renderPOW() {
  const nameEl = el('pow-name'), statsEl = el('pow-stats'), list = el('pow-list'); if (!list) return;
  if (nameEl) nameEl.textContent = contributorName || '—';
  const totalWords = powLog.reduce((s,r) => s+(r.wordCount||0), 0);
  const totalChars = powLog.reduce((s,r) => s+(r.charCount||0), 0);
  if (statsEl) statsEl.textContent = `${powLog.length} submission${powLog.length!==1?'s':''} · ${totalWords} words · ${totalChars} chars`;
  if (!powLog.length) { list.innerHTML = '<div style="color:var(--t3);font-size:13px;padding:16px">No submissions yet</div>'; return; }
  list.innerHTML = [...powLog].reverse().map(r => `
    <div class="pow-card">
      <div class="pow-card-title">${esc(r.title)}</div>
      <div class="pow-card-meta">${fmtDate(r.submittedAt)} · ${esc(r.group)}</div>
      <div class="pow-card-stats">
        <span class="pow-stat">Langs: <span>${esc(r.langs)}</span></span>
        <span class="pow-stat">Words: <span>${r.wordCount||0}</span></span>
        <span class="pow-stat">Chars: <span>${r.charCount||0}</span></span>
      </div>
      ${r.commitUrl ? '<a href="'+esc(r.commitUrl)+'" target="_blank" class="pow-commit-link">View commit ↗</a>' : ''}
    </div>`).join('');
}

function exportPOW() {
  if (!powLog.length) { toast('No submissions to export', 'error'); return; }
  const headers = ['Title','Group','Subgroups','Languages','Submitted At','Words','Characters','Commit SHA','Commit URL'];
  const rows = powLog.map(r => [r.title,r.group,r.subgroups,r.langs,r.submittedAt,r.wordCount,r.charCount,r.sha,r.commitUrl].map(v => '"'+String(v||'').replace(/"/g,'""')+'"'));
  const csv = [headers.join(','), ...rows.map(r=>r.join(','))].join('\n');
  const blob = new Blob([csv], { type:'text/csv' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob); a.download = `wazema-pow-${contributorName.replace(/\s+/g,'-')}-${Date.now()}.csv`;
  a.click(); URL.revokeObjectURL(a.href);
  toast('Exported ✓', 'success');
}

// ── CATALOG TAB ─────────────────────────────────────────────
function renderCatalog() {
  const list = el('catalog-list'), count = el('catalog-count'); if (!list) return;
  const q     = (el('catalog-search')?.value||'').toLowerCase().trim();
  const group = el('catalog-group')?.value||'';

  let items = ghHymns;
  if (group) items = items.filter(h => h.groupKey === group);
  if (q)     items = items.filter(h => hymnTitle(h).toLowerCase().includes(q));

  if (count) count.textContent = items.length + ' mezmur' + (items.length!==1?'s':'');
  if (!items.length) { list.innerHTML = '<div style="color:rgba(255,255,255,.3);font-size:13px;padding:16px">No results</div>'; return; }

  list.innerHTML = items.map(h => {
    const missing = LANGS.filter(l => !((h.langs[l]?.title||'').trim() || (h.langs[l]?.chorus||'').trim() || (h.langs[l]?.verses||[]).some(v => v.lines?.some(ln=>(ln.text||'').trim()))));
    const badges = LANGS.map(l => {
      const has = !missing.includes(l);
      return '<span class="lang-badge '+(has?'has':'missing')+'">'+LSHORT[l]+'</span>';
    }).join('');
    return '<div class="catalog-card" onclick="openFromCatalog(\''+esc(h.id)+'\')">'+
      '<div class="catalog-card-title">'+esc(hymnTitle(h))+'</div>'+
      '<div class="catalog-card-meta">'+esc(gLabel(h.groupKey))+(missing.length?' · <span style="color:#ff453a">Missing: '+missing.map(l=>LSHORT[l]).join(', ')+'</span>':'')+'</div>'+
      '<div class="catalog-card-langs">'+badges+'</div>'+
    '</div>';
  }).join('');
}

function openFromCatalog(id) {
  const h = ghHymns.find(x => x.id === id); if (!h) return;
  const existing = hymns.find(x => x.id === id);
  if (existing) { selectHymn(id); } else { hymns.unshift(h); save(); selectHymn(id); }
  showPage('page-editor');
}

// ── PENDING SYNC ─────────────────────────────────────────────
async function retryPending() {
  if (!pendingSync.length) { toast('No pending submissions'); return; }
  const btn = el('btn-retry-pending');
  if (btn) { btn.disabled = true; btn.textContent = 'Retrying…'; }
  let ok = 0; const remaining = [];
  for (const p of pendingSync) {
    try { const res = await submitToGitHub(p.hymn); recordPOW(p.hymn, res.sha); ok++; }
    catch(e) { remaining.push(p); }
  }
  pendingSync = remaining; savePending();
  if (btn) { btn.disabled = false; btn.textContent = '↻ Retry All'; }
  toast(ok+' submitted'+(remaining.length?', '+remaining.length+' still failed':' ✓'), ok&&!remaining.length?'success':'error');
  renderPendingList();
}

function renderPendingList() {
  const wrap = el('pending-list'); if (!wrap) return;
  if (!pendingSync.length) { wrap.innerHTML = '<div style="color:rgba(255,255,255,.3);font-size:13px;padding:8px 0">No pending submissions</div>'; return; }
  wrap.innerHTML = pendingSync.map(p =>
    '<div class="pending-item"><div class="pending-item-title">'+esc(hymnTitle(p.hymn))+'</div>'+
    '<div class="pending-item-meta">Failed '+fmtDate(p.failedAt)+' · '+esc(p.error||'')+'</div></div>'
  ).join('');
}

// ── ADMIN: INIT FILES ────────────────────────────────────────
async function initGHFiles() {
  const log = el('admin-init-log'), btn = el('btn-init-files');
  if (log) log.innerHTML = '';
  if (btn) btn.disabled = true;
  for (const k of ALL_GROUPS) {
    const path = ghPath(k);
    try {
      const ex = await ghGet(path);
      if (ex) { appendLog(log, '✓ '+path, 'skip'); }
      else { await ghPut(path, '[]', null, 'Init '+k); appendLog(log, '✝ Created '+path, 'ok'); }
    } catch(e) { appendLog(log, '✕ '+path+' — '+e.message, 'fail'); }
    await new Promise(r => setTimeout(r, 300));
  }
  if (btn) btn.disabled = false;
  toast('Init complete', 'success');
}

function appendLog(logEl, msg, type) {
  if (!logEl) return;
  const d = document.createElement('div');
  d.className = 'admin-log-line admin-log-'+type; d.textContent = msg;
  logEl.appendChild(d); logEl.scrollTop = logEl.scrollHeight;
}

// ── 5-TAP ADMIN ─────────────────────────────────────────────
function handleTitleTap() {
  tapCount++; clearTimeout(tapTimer);
  tapTimer = setTimeout(() => tapCount = 0, 2000);
  if (tapCount >= 5) { tapCount = 0; openSheet('sheet-admin'); }
}

// ── INIT ─────────────────────────────────────────────────────
function init() {
  // Resume session
  const saved = (() => { try { const d = localStorage.getItem(AUTH_KEY); return d ? JSON.parse(d) : null; } catch(e){ return null; } })();
  if (sessionStorage.getItem(SESSION_K) === '1' && saved?.token) {
    contributorName = saved.name || '';
    ghToken = saved.token;
    showApp();
  }

  // Login
  el('login-btn')?.addEventListener('click', submitLogin);
  el('login-token')?.addEventListener('keydown', e => { if (e.key==='Enter') submitLogin(); });
  el('login-name')?.addEventListener('keydown',  e => { if (e.key==='Enter') el('login-token')?.focus(); });

  // 5-tap
  document.querySelectorAll('[data-admin-tap]').forEach(t => t.addEventListener('click', handleTitleTap));

  // List page
  el('btn-new-top')?.addEventListener('click', addNewHymn);
  el('btn-refresh-gh')?.addEventListener('click', refreshFromGitHub);
  el('search-input')?.addEventListener('input', renderList);
  el('filter-group')?.addEventListener('change', renderList);
  el('filter-status')?.addEventListener('change', renderList);

  // Editor page
  el('btn-back')?.addEventListener('click', () => { save(); showPage('page-list'); renderList(); });
  el('btn-preview')?.addEventListener('click', showPreview);
  el('btn-submit-hymn')?.addEventListener('click', startSubmit);
  el('preview-close')?.addEventListener('click', () => closeSheet('sheet-preview'));

  // Bottom nav
  el('nav-editor')?.addEventListener('click', () => { switchTab('editor'); showPage('page-list'); });
  el('nav-catalog')?.addEventListener('click', () => switchTab('catalog'));
  el('nav-proofwork')?.addEventListener('click', () => switchTab('proofwork'));

  // Catalog
  el('catalog-search')?.addEventListener('input', renderCatalog);
  el('catalog-group')?.addEventListener('change', renderCatalog);
  (() => {
    const sel = el('catalog-group'); if (!sel) return;
    sel.innerHTML = '<option value="">All Groups</option>' + ALL_GROUPS.map(k =>
      '<option value="'+k+'">'+esc(gLabel(k))+'</option>').join('');
  })();

  // POW
  el('btn-export-pow')?.addEventListener('click', exportPOW);

  // Sheets
  document.querySelectorAll('.sheet-overlay').forEach(s => s.addEventListener('click', e => { if (e.target===s) s.style.display='none'; }));
  el('btn-confirm-submit')?.addEventListener('click', doSubmit);
  el('submitted-ok')?.addEventListener('click', onSubmitOk);
  el('dup-open')?.addEventListener('click', () => closeSheet('sheet-dup'));
  el('dup-new')?.addEventListener('click',  () => { closeSheet('sheet-dup'); showSubmitConfirm(); });

  // Pending
  el('btn-retry-pending')?.addEventListener('click', retryPending);

  // Admin
  el('btn-init-files')?.addEventListener('click', initGHFiles);
  el('btn-logout')?.addEventListener('click', logout);

  // Cmd+S
  document.addEventListener('keydown', e => {
    if ((e.ctrlKey||e.metaKey) && e.key==='s') { e.preventDefault(); save(); markSaved(); toast('Saved ✓', 'success'); }
  });
}

document.addEventListener('DOMContentLoaded', init);
