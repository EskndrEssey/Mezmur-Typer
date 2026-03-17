'use strict';

// ═══════════════════════════════════════════
//  WAZEMA · Hymn Entry Tool
//  St. George Eritrean Orthodox Church, Seattle
//  Deacon Eskndr Tadesse
// ═══════════════════════════════════════════

const STORE_KEY    = 'wazema_hymns';
const SESSION_KEY  = 'wz_session_ok';
const TOK_KEY      = 'wz_vol_token';
const ANT_KEY      = 'wz_ant_key';
const GH_TOK_KEY   = 'wz_gh_token';
const GH_PASS_KEY  = 'wz_vol_pass';
const DEFAULT_PASS = 'Mezmur2025'; // Admin: change this to the GitHub token so login = access

const REPO  = { owner:'EskndrEssey', repo:'Mezmur-Typer', branch:'main', folder:'data' };
const LANGS = ['en','ti','ti_ro','am','am_ro','om','ro'];
const LNAME = { en:'English', ti:'Tigrinya', ti_ro:'Tigrinya (Rom.)', am:'Amharic', am_ro:'Amharic (Rom.)', om:'Oromo', ro:'Romanian' };
const LSHORT= { en:'EN', ti:'TI', ti_ro:'TI-R', am:'AM', am_ro:'AM-R', om:'OM', ro:'RO' };
const STATUSES = { draft:'Draft', review:'Needs Review', final:'Final' };

const GROUP_TAXONOMY = {
  'Sillase':       { label:'ሥሳሴ · Holy Trinity',           file:'Sillase',       subgroups:[] },
  'Egziabher':     { label:'እግዚኣብሔር · God',               file:'Egziabher',     subgroups:[
    {key:'Lidet',label:'Lidet / Christmas'},{key:'Timket',label:'Timket / Epiphany'},
    {key:'Hosanna',label:'Hosanna'},{key:'Siglet',label:'Siglet / Good Friday'},
    {key:'Tinsae',label:'Tinsae / Easter'},{key:'Erget',label:'Erget / Ascension'},
    {key:'Pentecost',label:'Pentecost'},{key:'DebreTabor',label:'Debre Tabor'},
    {key:'KibreTabot',label:'Kibre Tabot'},{key:'MedhaneAlem',label:'Medhane Alem'},
    {key:'Pagumen',label:'Pagumen'},{key:'Meskel',label:'Meskel'},
    {key:'Mera',label:'Mera / Wedding'},{key:'General',label:'General'}
  ]},
  'Mariam':        { label:'ማርያም · St. Mary',              file:'Mariam',        subgroups:[
    {key:'Lideta',label:'Lideta'},{key:'KidaneMehret',label:'Kidane Mehret'},
    {key:'Filseta',label:'Filseta'},{key:'SdetMariam',label:'Sdet Mariam'},
    {key:'TsomeMariam',label:'Tsome Mariam'},{key:'Mera',label:'Mera / Wedding'},
    {key:'General',label:'General'}
  ]},
  'Giorgis':       { label:'ቅዱስ ጊዮርጊስ · St. George',      file:'Giorgis',       subgroups:[{key:'Monthly',label:'Monthly Feast'},{key:'General',label:'General'}] },
  'Michael':       { label:'ቅዱስ ሚካኤል · St. Michael',       file:'Michael',       subgroups:[{key:'Monthly',label:'Monthly Feast'},{key:'General',label:'General'}] },
  'Gabriel':       { label:'ቅዱስ ገብርኤል · St. Gabriel',      file:'Gabriel',       subgroups:[{key:'Monthly',label:'Monthly Feast'},{key:'General',label:'General'}] },
  'KidusnAbbot':   { label:'ቅዱሳን ኣቦት · Holy Fathers',      file:'KidusnAbbot',   subgroups:[{key:'TekleHaymanot',label:'Tekle Haymanot'},{key:'Yared',label:'St. Yared'},{key:'General',label:'General'}] },
  'KidusnMelaikt': { label:'ቅዱሳን መላእኽት · Angels',          file:'KidusnMelaikt', subgroups:[{key:'General',label:'General'}] },
  'Nissha':        { label:'ንስሓ · Repentance',              file:'Nissha',        subgroups:[] },
  'Zewetr':        { label:'ዘወትር · Everyday',               file:'Zewetr',        subgroups:[{key:'Wereb',label:'Wereb / ወረብ'},{key:'EverySunday',label:'Every Sunday'}] },
  'Mera':          { label:'መርዓ · Wedding',                 file:'Mera',          subgroups:[{key:'Ceremony',label:'Ceremony'},{key:'Blessing',label:'Blessing'},{key:'General',label:'General'}] },
  'Yohannes':      { label:'ቅዱስ ዮሓንስ · St. John',          file:'Yohannes',      subgroups:[{key:'General',label:'General'}] },
};
const ALL_GROUPS = Object.keys(GROUP_TAXONOMY);

// ── STATE ──────────────────────────────────────
let hymns = [], activeHymn = null, saveTimer = null, toastTimer = null;
let pendingHymn = null, pendingTarget = null, pendingTokenCb = null;
let impQueue = [], impStats = {}, impIdx = 0;

// ── HELPERS ────────────────────────────────────
function uid()   { return 'h_' + Date.now().toString(36) + Math.random().toString(36).slice(2,5); }
function esc(s)  { return s ? String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;') : ''; }
function el(id)  { return document.getElementById(id); }
function title(h){ for(const l of LANGS){ const t=h.langs[l]?.title?.trim(); if(t) return t; } return '(Untitled)'; }
function gLabel(k){ return GROUP_TAXONOMY[k]?.label || k; }
function getSubs(k){ return GROUP_TAXONOMY[k]?.subgroups || []; }

// ── DATA MODEL ─────────────────────────────────
function newLang()  { return { title:'', subtitle:'', chorus:'', verses:[], youtube:'', groupName:'' }; }
function newLine(p='',t=''){ return { prefix:p, text:t }; }
function newVerse() { return { lines:[newLine()] }; }
function newHymn(o={}){
  const id = o.id || uid();
  const langs = {};
  LANGS.forEach(l => langs[l] = newLang());
  return { id, groupKey:'', subgroups:[], zemari:'', color:'', status:'draft', langs, ...o };
}

// ── STORAGE ────────────────────────────────────
function load(){
  try {
    const d = localStorage.getItem(STORE_KEY);
    hymns = d ? JSON.parse(d) : [];
    hymns.forEach(migrate);
  } catch(e) { hymns = []; }
}
function migrate(h){
  if (!h.langs) h.langs = {};
  LANGS.forEach(l => {
    if (!h.langs[l]) h.langs[l] = newLang();
    const ld = h.langs[l];
    if (!ld.verses)    ld.verses = [];
    if (!ld.chorus)    ld.chorus = '';
    if (!ld.youtube)   ld.youtube = '';
    if (!ld.groupName) ld.groupName = '';
  });
  if (!h.zemari) h.zemari = h.singer || '';
  if (!h.groupKey && h.group) h.groupKey = typeof h.group === 'string' ? h.group : '';
}
function save()         { localStorage.setItem(STORE_KEY, JSON.stringify(hymns)); }
function schedSave()    { clearTimeout(saveTimer); saveTimer = setTimeout(save, 400); }

// ── TOAST ──────────────────────────────────────
function toast(msg, type=''){
  const t = el('toast'); if(!t) return;
  t.textContent = msg;
  t.className = 'toast' + (type ? ' '+type : '') + ' visible';
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => t.classList.remove('visible'), 2800);
}

// ── PAGES & SHEETS ─────────────────────────────
function showPage(id){
  // page-gate uses no display style (visible by default)
  // page-list and page-editor use display:none/flex
  document.querySelectorAll('.page').forEach(p => {
    p.style.display = 'none';
  });
  const p = el(id);
  if (p) p.style.display = 'flex';
}

function openSheet(id)  { const s=el(id); if(s) s.style.display='flex'; }
function closeSheet(id) { const s=el(id); if(s) s.style.display='none'; }

// ── PASSWORD ───────────────────────────────────
function getPass()      { return localStorage.getItem(GH_PASS_KEY) || DEFAULT_PASS; } // legacy — login now validates via GitHub API
function loggedIn()     { return sessionStorage.getItem(SESSION_KEY) === '1'; }

function checkGate(){
  if (loggedIn()){
    showPage('page-list');
    renderList();
  }
  // else gate is already visible (no display:none on it)
}

async function submitGate(){
  const input  = el('gate-password');
  const errEl  = el('gate-error');
  const btn    = el('gate-submit');
  if (!input) return;
  const val = input.value.trim();
  if (!val) return;

  // Show loading state
  btn.disabled = true;
  btn.textContent = 'Verifying…';
  if (errEl) errEl.style.display = 'none';

  try {
    // Validate token against GitHub repo directly
    const r = await fetch('https://api.github.com/repos/'+REPO.owner+'/'+REPO.repo, {
      headers: { 'Authorization': 'Bearer ' + val, 'Accept': 'application/vnd.github+json' }
    });

    if (r.ok) {
      // Valid token — log in and store as GitHub token
      sessionStorage.setItem(SESSION_KEY, '1');
      setGHToken(val);
      localStorage.setItem(GH_PASS_KEY, val);
      input.value = '';
      showPage('page-list');
      renderList();
    } else {
      // Invalid token
      if (errEl) {
        errEl.textContent = r.status === 401 ? 'Invalid token — contact Deacon Eskndr' : 'Access denied ('+r.status+')';
        errEl.style.display = 'block';
      }
      input.value = '';
      input.focus();
      input.classList.remove('shake');
      void input.offsetWidth;
      input.classList.add('shake');
    }
  } catch(e) {
    if (errEl) {
      errEl.textContent = 'Network error — check your internet';
      errEl.style.display = 'block';
    }
  } finally {
    btn.disabled = false;
    btn.textContent = 'Enter ✝';
  }
}

// ── LIST ───────────────────────────────────────
function renderList(){
  const listEl  = el('hymn-list');
  const statsEl = el('sidebar-stats');
  const search  = (el('search-input')?.value || '').toLowerCase();
  const group   = el('filter-group')?.value || '';
  const status  = el('filter-status')?.value || '';

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
    const t = title(h).toLowerCase();
    if (search && !t.includes(search) && !h.id.includes(search)) return false;
    if (group  && h.groupKey !== group)  return false;
    if (status && h.status  !== status)  return false;
    return true;
  });

  if (statsEl) statsEl.textContent = filtered.length + ' of ' + hymns.length + ' hymn' + (hymns.length !== 1 ? 's' : '');

  if (!listEl) return;
  if (!filtered.length){
    listEl.innerHTML = '<div style="padding:48px 24px;text-align:center;color:rgba(255,255,255,.25);font-size:15px;line-height:2">No hymns yet.<br>Tap <strong style="color:rgba(255,255,255,.5)">+ New</strong> to begin.</div>';
    return;
  }

  listEl.innerHTML = '';
  filtered.forEach(h => {
    const d = document.createElement('div');
    d.className = 'hymn-item';
    const gc = h.groupKey ? '<span class="chip chip-group">'+esc(h.groupKey)+'</span>' : '';
    const sc = (h.subgroups||[]).map(s=>'<span class="chip chip-sub">'+esc(s)+'</span>').join('');
    const badge = '<span class="status-badge status-'+h.status+'">'+(STATUSES[h.status]||h.status)+'</span>';
    d.innerHTML = '<div class="hymn-item-left"><div class="hymn-item-title">'+esc(title(h))+'</div><div class="hymn-item-meta">'+gc+sc+badge+'</div></div><span class="hymn-item-arrow">›</span>';
    d.addEventListener('click', () => selectHymn(h.id));
    listEl.appendChild(d);
  });
}

function selectHymn(id){
  activeHymn = hymns.find(h => h.id === id) || null;
  if (!activeHymn) return;
  renderEditor();
  showPage('page-editor');
}

function addNewHymn(){
  const h = newHymn();
  hymns.unshift(h);
  save();
  selectHymn(h.id);
}

// ── LYRICS BUILD ───────────────────────────────
function buildLyrics(ld){
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
    if (ls.length){ parts.push(ls.join('\n')); if(tag) parts.push(tag); }
  });
  return parts.join('\n \n');
}

function parseLyrics(lyrics){
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

function hymnToExport(h){
  const out = { id: h.id };
  const gm={}; LANGS.forEach(l => gm[l] = (h.langs[l]?.groupName||'').trim()); out.group = gm;
  const tm={}; LANGS.forEach(l => { const t=(h.langs[l]?.title||'').trim(); if(t) tm[l]=t; }); out.title = tm;
  const lm={}; LANGS.forEach(l => { const ly=buildLyrics(h.langs[l]); if(ly) lm[l]=ly; }); out.lyrics = lm;
  const sm={}; LANGS.forEach(l => { const s=(h.langs[l]?.subtitle||'').trim(); if(s) sm[l]=s; }); if(Object.keys(sm).length) out.subtitle = sm;
  const um={}; LANGS.forEach(l => { const u=(h.langs[l]?.youtube||'').trim(); if(u) um[l]=u; }); if(Object.keys(um).length) out.youtubeUrls = um;
  if (h.zemari?.trim())   out.singer     = h.zemari.trim();
  if (h.color?.trim())    out.color      = h.color.trim();
  if (h.subgroups && h.subgroups.length){ out.subcategory=h.subgroups.join(','); out.subcategories=h.subgroups; }
  if (h.groupKey?.trim()) out.category = h.groupKey.trim();
  return out;
}

// ── EDITOR ─────────────────────────────────────
function autoResize(el){ el.style.height='auto'; el.style.height=el.scrollHeight+'px'; }

function renderEditor(){
  const h = activeHymn; if (!h) return;
  const area = el('editor-area'); if (!area) return;

  // Status
  const statHTML = Object.entries(STATUSES).map(([k,v]) =>
    '<button class="status-toggle'+(h.status===k?' active-'+k:'')+'" data-status="'+k+'">'+v+'</button>'
  ).join('');

  // Categories
  const catHTML = ALL_GROUPS.map(k =>
    '<button class="cat-toggle'+(h.groupKey===k?' active':'')+'" data-cat="'+k+'">'+esc(gLabel(k))+'</button>'
  ).join('');

  // Subcategories
  const subs = getSubs(h.groupKey);
  const subHTML = (subs.length ? '<span class="sub-wrap-hint">Select all that apply:</span>' : '') +
    subs.map(s =>
      '<button class="sub-toggle'+((h.subgroups||[]).includes(s.key)?' active':'')+'" data-sub="'+esc(s.key)+'">'+esc(s.label)+'</button>'
    ).join('');

  // Lang tabs + panels
  const tabs = LANGS.map(l =>
    '<button class="lang-tab'+(l==='en'?' active':'')+'" data-lang="'+l+'">'+LNAME[l]+'</button>'
  ).join('');

  const panels = LANGS.map(l => {
    const ld = h.langs[l] || newLang();
    const isRom = false; // Romanize temporarily disabled
    const romBanner = '';

    const verses = (ld.verses||[]).map((v,vi) => buildVerseHTML(v,vi)).join('');
    return '<div class="lang-panel'+(l==='en'?' active':'')+'" data-lang="'+l+'">'+
      romBanner+
      '<div class="form-row"><label class="form-label">Title ('+LSHORT[l]+')</label>'+
        '<input class="form-input lang-title" data-lang="'+l+'" value="'+esc(ld.title||'')+'" placeholder="Title in '+LNAME[l]+'"/></div>'+
      '<div class="form-row"><label class="form-label">Subtitle</label>'+
        '<input class="form-input lang-subtitle" data-lang="'+l+'" value="'+esc(ld.subtitle||'')+'" placeholder="Optional"/></div>'+
      '<div class="form-row"><label class="form-label">YouTube URL</label>'+
        '<input type="url" class="form-input lang-youtube" data-lang="'+l+'" value="'+esc(ld.youtube||'')+'" placeholder="https://youtube.com/..."/></div>'+
      '<div class="chorus-card">'+
        '<div class="chorus-header"><span class="chorus-label">♪ Chorus / ኣዝ</span><span class="chorus-hint">type once, repeats after every verse</span></div>'+
        '<textarea class="chorus-input lang-chorus" data-lang="'+l+'" placeholder="Chorus here…">'+esc(ld.chorus||'')+'</textarea>'+
      '</div>'+
      '<div class="verse-hint">💡 <strong>Gold box</strong> = highlighted prefix. Leave empty for plain line. <strong>Enter</strong> = new line.</div>'+
      '<div class="verse-actions-row">'+
        '<button class="add-verse-btn" data-lang="'+l+'">+ Verse / ስታንዛ</button>'+
        '<button class="dup-verse-btn" data-lang="'+l+'">⧉ Dup Last</button>'+
      '</div>'+
      '<div class="verse-list" id="vl-'+l+'">'+(verses||'<div style="padding:20px;text-align:center;color:rgba(255,255,255,.25);font-style:italic">No verses yet</div>')+'</div>'+
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
    '<div class="form-section"><div class="form-section-title">Lyrics</div>'+
      '<div class="lang-tabs" id="ltabs">'+tabs+'</div>'+
      panels+
    '</div>';

  bindEditor(area, h);
}

function buildVerseHTML(v, vi){
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

function refreshVerses(area, h, lang){
  const c = area.querySelector('#vl-'+lang); if(!c) return;
  const vs = h.langs[lang].verses || [];
  c.innerHTML = vs.length ? vs.map((v,vi) => buildVerseHTML(v,vi)).join('') :
    '<div style="padding:20px;text-align:center;color:rgba(255,255,255,.25);font-style:italic">No verses yet</div>';
  c.querySelectorAll('.line-text').forEach(autoResize);
  bindVerses(area, h, lang);
}

function bindEditor(area, h){
  // Status
  area.querySelector('#stat-row').addEventListener('click', e => {
    const b = e.target.closest('.status-toggle'); if(!b) return;
    h.status = b.dataset.status;
    area.querySelectorAll('.status-toggle').forEach(x => x.className = 'status-toggle');
    b.className = 'status-toggle active-'+h.status;
    schedSave(); renderList();
  });

  // Category
  area.querySelector('#cat-wrap').addEventListener('click', e => {
    const b = e.target.closest('.cat-toggle'); if(!b) return;
    h.groupKey = b.dataset.cat; h.subgroups = [];
    area.querySelectorAll('.cat-toggle').forEach(x => x.classList.toggle('active', x.dataset.cat===h.groupKey));
    const sw = area.querySelector('#sub-wrap');
    const subs = getSubs(h.groupKey);
    sw.innerHTML = subs.map(s => '<button class="sub-toggle" data-sub="'+esc(s.key)+'">'+esc(s.label)+'</button>').join('');
    sw.style.display = subs.length ? '' : 'none';
    schedSave(); renderList();
  });

  // Subcategory — MULTI SELECT
  area.querySelector('#sub-wrap')?.addEventListener('click', e => {
    const b = e.target.closest('.sub-toggle'); if(!b) return;
    if(!h.subgroups) h.subgroups = [];
    const key = b.dataset.sub;
    const idx = h.subgroups.indexOf(key);
    if(idx >= 0) h.subgroups.splice(idx, 1);
    else h.subgroups.push(key);
    area.querySelectorAll('.sub-toggle').forEach(x =>
      x.classList.toggle('active', h.subgroups.includes(x.dataset.sub))
    );
    schedSave(); renderList();
  });

  // Meta fields
  area.querySelector('#meta-zemari').addEventListener('input', e => { h.zemari=e.target.value; schedSave(); });
  area.querySelector('#meta-color').addEventListener('input',  e => { h.color=e.target.value;  schedSave(); });

  // Lang tabs
  area.querySelector('#ltabs').addEventListener('click', e => {
    const b = e.target.closest('.lang-tab'); if(!b) return;
    const lang = b.dataset.lang;
    area.querySelectorAll('.lang-tab').forEach(x   => x.classList.toggle('active', x.dataset.lang===lang));
    area.querySelectorAll('.lang-panel').forEach(x => x.classList.toggle('active', x.dataset.lang===lang));
  });

  // Per-lang inputs
  area.querySelectorAll('.lang-title').forEach(i   => i.addEventListener('input', () => { h.langs[i.dataset.lang].title=i.value;    schedSave(); renderList(); refreshPreviewIfOpen(h); }));
  area.querySelectorAll('.lang-subtitle').forEach(i => i.addEventListener('input', () => { h.langs[i.dataset.lang].subtitle=i.value; schedSave(); }));
  area.querySelectorAll('.lang-youtube').forEach(i  => i.addEventListener('input', () => { h.langs[i.dataset.lang].youtube=i.value;  schedSave(); }));
  area.querySelectorAll('.lang-chorus').forEach(i   => i.addEventListener('input', () => { h.langs[i.dataset.lang].chorus=i.value;   schedSave(); refreshPreviewIfOpen(h); }));

  // Add / dup verse
  area.querySelectorAll('.add-verse-btn').forEach(b => b.addEventListener('click', () => {
    h.langs[b.dataset.lang].verses.push(newVerse()); schedSave(); refreshVerses(area,h,b.dataset.lang);
  }));
  area.querySelectorAll('.dup-verse-btn').forEach(b => b.addEventListener('click', () => {
    const vs = h.langs[b.dataset.lang].verses;
    if (!vs.length){ toast('No verses yet'); return; }
    vs.push(JSON.parse(JSON.stringify(vs[vs.length-1]))); schedSave(); refreshVerses(area,h,b.dataset.lang);
  }));

  

  // Bind verse events for all langs
  LANGS.forEach(l => bindVerses(area, h, l));
  area.querySelectorAll('.line-text').forEach(autoResize);
}

function bindVerses(area, h, lang){
  const c = area.querySelector('#vl-'+lang); if(!c) return;
  // Remove old listeners by cloning
  const nc = c.cloneNode(true);
  c.parentNode.replaceChild(nc, c);

  nc.addEventListener('input', e => {
    const vi = +e.target.dataset.vi, li = +e.target.dataset.li;
    if (isNaN(vi)||isNaN(li)) return;
    if (e.target.classList.contains('line-prefix')){
      h.langs[lang].verses[vi].lines[li].prefix = e.target.value;
      e.target.closest('.line-row').classList.toggle('highlighted', !!e.target.value.trim());
      schedSave();
    }
    if (e.target.classList.contains('line-text')){
      h.langs[lang].verses[vi].lines[li].text = e.target.value;
      autoResize(e.target); schedSave();
    }
  }, true);

  nc.addEventListener('click', e => {
    const vi = +(e.target.dataset.vi ?? NaN);
    const li = +(e.target.dataset.li ?? NaN);
    const vs = h.langs[lang].verses;
    if (e.target.classList.contains('line-del')){
      if (vs[vi].lines.length <= 1){ toast('Need at least one line'); return; }
      vs[vi].lines.splice(li,1); schedSave(); refreshVerses(area,h,lang); return;
    }
    if (e.target.classList.contains('add-line-btn')){
      vs[vi].lines.push(newLine()); schedSave(); refreshVerses(area,h,lang); return;
    }
    if (e.target.classList.contains('vu') && vi>0){
      [vs[vi-1],vs[vi]]=[vs[vi],vs[vi-1]]; schedSave(); refreshVerses(area,h,lang); return;
    }
    if (e.target.classList.contains('vd') && vi<vs.length-1){
      [vs[vi],vs[vi+1]]=[vs[vi+1],vs[vi]]; schedSave(); refreshVerses(area,h,lang); return;
    }
    if (e.target.classList.contains('vx')){
      vs.splice(vi,1); schedSave(); refreshVerses(area,h,lang); return;
    }
  });

  nc.addEventListener('keydown', e => {
    if (e.key==='Enter' && e.target.classList.contains('line-text') && !e.shiftKey){
      e.preventDefault();
      const vi=+e.target.dataset.vi, li=+e.target.dataset.li;
      h.langs[lang].verses[vi].lines.splice(li+1,0,newLine());
      schedSave(); refreshVerses(area,h,lang);
      setTimeout(() => {
        const n = area.querySelector('#vl-'+lang+' .line-text[data-vi="'+vi+'"][data-li="'+(li+1)+'"]');
        if (n) n.focus();
      }, 30);
    }
  });

  nc.querySelectorAll('.line-text').forEach(autoResize);
}

// ── GITHUB API ─────────────────────────────────
function getGHToken(){ return sessionStorage.getItem(TOK_KEY) || localStorage.getItem(GH_TOK_KEY) || ''; }
function setGHToken(t){ sessionStorage.setItem(TOK_KEY,t); localStorage.setItem(GH_TOK_KEY,t); }

function ghPath(groupKey){
  const file = (GROUP_TAXONOMY[groupKey]?.file || groupKey) + '.json';
  return REPO.folder + '/' + file;
}
async function ghGet(path){
  const tok = getGHToken(); if(!tok) throw new Error('No GitHub token');
  const r = await fetch('https://api.github.com/repos/'+REPO.owner+'/'+REPO.repo+'/contents/'+path+'?ref='+REPO.branch,
    { headers:{ 'Authorization':'Bearer '+tok, 'Accept':'application/vnd.github+json' } });
  if (r.status===404) return null;
  if (!r.ok){ const e=await r.json(); throw new Error(e.message||r.status); }
  return r.json();
}
async function ghPut(path, content, sha, msg){
  const tok = getGHToken();
  const body = { message:msg, content:btoa(unescape(encodeURIComponent(content))), branch:REPO.branch };
  if (sha) body.sha = sha;
  const r = await fetch('https://api.github.com/repos/'+REPO.owner+'/'+REPO.repo+'/contents/'+path, {
    method:'PUT',
    headers:{ 'Authorization':'Bearer '+tok, 'Accept':'application/vnd.github+json', 'Content-Type':'application/json' },
    body: JSON.stringify(body)
  });
  if (!r.ok){ const e=await r.json(); throw new Error(e.message||'Write failed'); }
  return r.json();
}
async function testGH(){
  const t = el('gh-token')?.value.trim(); if(!t){ toast('Paste a token first','error'); return; }
  toast('Testing…');
  try {
    const r = await fetch('https://api.github.com/repos/'+REPO.owner+'/'+REPO.repo, { headers:{'Authorization':'Bearer '+t} });
    r.ok ? toast('Connected ✓','success') : toast('Failed: '+r.status,'error');
  } catch(e){ toast('Network error','error'); }
}
async function initGHFiles(){
  const tok = getGHToken(); if(!tok){ toast('Save your token first','error'); return; }
  const btn=el('gh-init-files'), statusEl=el('gh-init-status');
  if(btn) btn.disabled=true;
  let ok=0,skip=0,fail=0;
  for(const k of ALL_GROUPS){
    const path=ghPath(k);
    if(statusEl) statusEl.innerHTML+='<div class="init-progress">Checking '+path+'…</div>';
    try{
      const ex=await ghGet(path);
      if(ex){ skip++; if(statusEl) statusEl.innerHTML+='<div class="init-skip">✓ '+path+'</div>'; }
      else{ await ghPut(path,'[]',null,'Init '+k); ok++; if(statusEl) statusEl.innerHTML+='<div class="init-ok">✝ Created '+path+'</div>'; }
    }catch(e){ fail++; if(statusEl) statusEl.innerHTML+='<div class="init-fail">✕ '+path+' — '+e.message+'</div>'; }
    await new Promise(r=>setTimeout(r,300));
  }
  if(btn) btn.disabled=false;
  if(statusEl) statusEl.innerHTML+='<div class="init-summary">'+ok+' created, '+skip+' existed, '+fail+' failed</div>';
  toast(ok+' files created','success');
}

// ── TOKEN PROMPT ───────────────────────────────
function promptToken(cb){
  // Token is always the login password — already set on login
  const tok = getGHToken();
  if(tok){ cb(tok); return; }
  // Fallback: ask to re-login
  pendingTokenCb = cb;
  openSheet('sheet-token');
  setTimeout(()=>el('volunteer-token')?.focus(), 200);
}
function confirmToken(){
  const t = el('volunteer-token')?.value.trim();
  if(!t){ toast('Paste your token','error'); return; }
  setGHToken(t);
  closeSheet('sheet-token');
  el('volunteer-token').value='';
  if(pendingTokenCb){ pendingTokenCb(t); pendingTokenCb=null; }
}

// ── SUBMIT ─────────────────────────────────────
async function startSubmit(h){
  if (!LANGS.some(l=>(h.langs[l]?.title||'').trim())){ toast('Add a title first','error'); return; }
  if (!h.groupKey){ toast('Select a category first','error'); return; }
  pendingHymn = h; pendingTarget = null;
  if (!getGHToken()){ promptToken(()=>startSubmit(h)); return; }

  const res=el('dupcheck-results'), subBtn=el('dupcheck-submit'), mergeBtn=el('dupcheck-merge');
  res.innerHTML='<div class="dc-loading"><span class="pulse">✝</span> Checking for duplicates…</div>';
  subBtn.style.display='none'; mergeBtn.style.display='none';
  openSheet('sheet-dupcheck');

  try{
    const path=ghPath(h.groupKey), ex=await ghGet(path);
    const myTitle=title(h).toLowerCase();
    if(!ex){ res.innerHTML='<div class="dc-clear">✓ No existing file yet. Safe to submit!</div>'; subBtn.style.display=''; subBtn.textContent='✝ Submit'; return; }
    let arr=[]; try{ arr=JSON.parse(decodeURIComponent(escape(atob(ex.content.replace(/\n/g,''))))); }catch(e){}
    const matches=arr.filter(x=>{ if(!x.title) return false; const ts=typeof x.title==='object'?Object.values(x.title):[x.title]; return ts.some(t=>{if(!t)return false;const tl=t.toLowerCase();return tl.includes(myTitle)||myTitle.includes(tl)||lev(tl,myTitle)<4;}); });
    if(!matches.length){ res.innerHTML='<div class="dc-clear">✓ No duplicates found ('+arr.length+' checked).</div>'; subBtn.style.display=''; subBtn.textContent='✝ Submit as New Hymn'; }
    else{
      let html='<div class="dc-warning">⚠ '+matches.length+' similar hymn'+(matches.length>1?'s':'')+' found:</div><div class="dc-matches">';
      matches.forEach(m=>{
        const t=typeof m.title==='object'?Object.values(m.title).filter(Boolean).join(' / '):m.title||'';
        const el2=typeof m.title==='object'?Object.keys(m.title).filter(k=>m.title[k]).join(', '):'?';
        html+='<div class="dc-match"><div class="dc-match-title">'+esc(t)+'</div><div class="dc-match-langs">Has: '+esc(el2)+'</div><button class="dc-match-select" data-id="'+esc(m.id||'')+'">Merge into this hymn →</button></div>';
      });
      html+='</div>';
      res.innerHTML=html;
      res.querySelectorAll('.dc-match-select').forEach(b=>b.addEventListener('click',()=>{
        pendingTarget=matches.find(m=>m.id===b.dataset.id)||null;
        res.querySelectorAll('.dc-match-select').forEach(x=>{x.style.background=x===b?'var(--accent)':'';x.style.color=x===b?'#fff':'';x.textContent=x===b?'✓ Selected':'Merge into this →';});
        mergeBtn.style.display='';
      }));
      subBtn.style.display=''; subBtn.textContent='+ Submit as New Hymn';
    }
  }catch(e){
    const is401=e.message.includes('401')||e.message.includes('Bad credentials');
    if(is401){
      sessionStorage.removeItem(TOK_KEY);
      localStorage.removeItem(GH_TOK_KEY);
      closeSheet('sheet-dupcheck');
      toast('Token expired — enter new token','error');
      // Force re-prompt with new token
      setTimeout(()=>{ promptToken(()=>startSubmit(h)); }, 400);
      return;
    }
    res.innerHTML='<div class="dc-error">✕ '+esc(e.message)+'</div>';
    subBtn.style.display=''; subBtn.textContent='✝ Submit Anyway';
  }
}

async function doSubmit(){
  const h=pendingHymn; if(!h) return;
  closeSheet('sheet-dupcheck');
  const path=ghPath(h.groupKey), exported=hymnToExport(h);
  toast('Submitting…');
  try{
    const f=await ghGet(path); let arr=[],sha=null;
    if(f){sha=f.sha;try{arr=JSON.parse(decodeURIComponent(escape(atob(f.content.replace(/\n/g,'')))));}catch(e){}}
    const i=arr.findIndex(x=>x.id===exported.id); if(i>=0) arr[i]=exported; else arr.push(exported);
    await ghPut(path,JSON.stringify(arr,null,2),sha,'Add: '+title(h));
    if((h.subgroups||[]).includes('Mera')&&h.groupKey!=='Mera'){
      const mp=ghPath('Mera'),mf=await ghGet(mp);let ma=[],ms=null;
      if(mf){ms=mf.sha;try{ma=JSON.parse(decodeURIComponent(escape(atob(mf.content.replace(/\n/g,'')))));}catch(e){}}
      const mi=ma.findIndex(x=>x.id===exported.id);if(mi>=0)ma[mi]=exported;else ma.push(exported);
      await ghPut(mp,JSON.stringify(ma,null,2),ms,'Add to Mera: '+title(h));
    }
    h.status='final'; save(); renderList(); if(activeHymn?.id===h.id) renderEditor();
    el('submitted-msg').innerHTML='<strong>'+esc(title(h))+'</strong> added to <code>'+esc(path)+'</code>';
    openSheet('sheet-submitted');
  }catch(e){
    if(e.message.includes('401')||e.message.includes('Bad credentials')){
      sessionStorage.removeItem(TOK_KEY);localStorage.removeItem(GH_TOK_KEY);
      toast('Token expired — re-entering…','error');
      setTimeout(()=>{ promptToken(()=>startSubmit(h)); }, 400);
    } else toast('Failed: '+e.message,'error');
  }
}

async function doMerge(){
  const h=pendingHymn,target=pendingTarget; if(!h||!target) return;
  closeSheet('sheet-dupcheck');
  const path=ghPath(h.groupKey), local=hymnToExport(h);
  toast('Merging…');
  try{
    const merged=JSON.parse(JSON.stringify(target));
    if(!merged.title) merged.title={};if(!merged.lyrics) merged.lyrics={};if(!merged.subtitle) merged.subtitle={};if(!merged.youtubeUrls) merged.youtubeUrls={};
    LANGS.forEach(l=>{
      if(local.title?.[l]&&!merged.title[l]) merged.title[l]=local.title[l];
      if(local.lyrics?.[l]&&!merged.lyrics[l]) merged.lyrics[l]=local.lyrics[l];
      if(local.subtitle?.[l]&&!merged.subtitle[l]) merged.subtitle[l]=local.subtitle[l];
      if(local.youtubeUrls?.[l]&&!merged.youtubeUrls[l]) merged.youtubeUrls[l]=local.youtubeUrls[l];
    });
    const f=await ghGet(path);let arr=[],sha=null;
    if(f){sha=f.sha;try{arr=JSON.parse(decodeURIComponent(escape(atob(f.content.replace(/\n/g,'')))));}catch(e){}}
    const i=arr.findIndex(x=>x.id===target.id);if(i>=0)arr[i]=merged;else arr.push(merged);
    const added=LANGS.filter(l=>!target.title?.[l]&&merged.title?.[l]);
    await ghPut(path,JSON.stringify(arr,null,2),sha,'Merge ('+added.join(',')+'): '+title(h));
    h.status='final'; save(); renderList(); if(activeHymn?.id===h.id) renderEditor();
    el('submitted-msg').innerHTML='Merged <strong>'+esc(added.join(', '))+'</strong> into <strong>'+esc(title(h))+'</strong>';
    openSheet('sheet-submitted');
  }catch(e){
    if(e.message.includes('401')){sessionStorage.removeItem(TOK_KEY);localStorage.removeItem(GH_TOK_KEY);toast('Token invalid — tap Submit again','error');}
    else toast('Merge failed: '+e.message,'error');
  }
}

function lev(a,b){
  const m=a.length,n=b.length,dp=Array.from({length:m+1},(_,i)=>Array.from({length:n+1},(_,j)=>i===0?j:j===0?i:0));
  for(let i=1;i<=m;i++)for(let j=1;j<=n;j++)dp[i][j]=a[i-1]===b[j-1]?dp[i-1][j-1]:1+Math.min(dp[i-1][j],dp[i][j-1],dp[i-1][j-1]);
  return dp[m][n];
}

// ── AUTO-ROMANIZE ───────────────────────────────
async function autoRomanize(h, src, dst, area){
  const ld = h.langs[src];
  const srcLyrics = buildLyrics(ld);
  if (!ld.title && !srcLyrics){ toast('Type the '+LNAME[src]+' version first','error'); return; }

  const btn = area.querySelector('.romanize-btn[data-dst="'+dst+'"]');
  if(btn){ btn.disabled=true; btn.textContent='⏳ Romanizing…'; }

  let apiKey = localStorage.getItem(ANT_KEY) || '';
  if(!apiKey){
    const k = window.prompt('Paste your Anthropic API key (sk-ant-...):\nGet one free at console.anthropic.com');
    if(!k){ if(btn){btn.disabled=false;btn.textContent='✨ Romanize';} return; }
    apiKey = k.trim();
    localStorage.setItem(ANT_KEY, apiKey);
  }

  const prompt = 'You are an expert in Ethiopian and Eritrean Orthodox liturgical texts.\n'+
    'Romanize the following '+LNAME[src]+' hymn into smooth, formal Latin script.\n\n'+
    'RULES:\n'+
    '- DO NOT translate — only romanize (Ethiopic script → Latin letters)\n'+
    '- Keep ALL tags exactly: [[chorus]] [[/chorus]] [[highlight]] [[/highlight]]\n'+
    '- Keep ALL line breaks exactly as original\n'+
    '- Use consistent, formal romanization for church use\n'+
    '- Conventions: q=ቀ, H=ሐ, ts=ጸ, T=ጠ, sh=ሽ, ch=ጨ\n\n'+
    'TITLE: '+ld.title+'\n'+
    'SUBTITLE: '+(ld.subtitle||'')+'\n\n'+
    'LYRICS:\n'+srcLyrics+'\n\n'+
    'Reply with ONLY valid JSON, no markdown:\n'+
    '{"title":"...","subtitle":"...","lyrics":"..."}';

  try{
    // Build request
    const reqBody = JSON.stringify({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 4000,
      messages: [{ role:'user', content: prompt }]
    });

    // Cloudflare Worker proxy — bypasses CORS
    const r = await fetch('https://steep-salad-ac55.eskndrtadesse7.workers.dev/', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: reqBody
    });

    if(r.status===401){ localStorage.removeItem(ANT_KEY); throw new Error('API key invalid — tap Romanize again to re-enter'); }
    if(!r.ok){ const e=await r.json().catch(()=>({})); throw new Error(e.error?.message||'API error '+r.status); }

    const data = await r.json();
    const raw  = data.content?.[0]?.text||'';
    const clean = raw.replace(/```json|```/g,'').trim();
    const parsed = JSON.parse(clean);

    const dstLd = h.langs[dst];
    if(parsed.title)    dstLd.title    = parsed.title;
    if(parsed.subtitle) dstLd.subtitle = parsed.subtitle;
    if(parsed.lyrics){
      const p = parseLyrics(parsed.lyrics);
      dstLd.chorus = p.chorus;
      dstLd.verses = p.verses;
    }

    schedSave();
    renderEditor();
    // Switch to dst tab after render
    setTimeout(()=>{
      const a2=el('editor-area');
      a2.querySelectorAll('.lang-tab').forEach(t=>t.classList.toggle('active',t.dataset.lang===dst));
      a2.querySelectorAll('.lang-panel').forEach(p=>p.classList.toggle('active',p.dataset.lang===dst));
    },50);
    toast('✨ Romanized!','success');

  }catch(e){
    toast('Romanize failed: '+e.message,'error');
    if(btn){ btn.disabled=false; btn.textContent='✨ Romanize'; }
  }
}

// ── COPY JSON ──────────────────────────────────
function copyJSON(h){
  const text = JSON.stringify([hymnToExport(h)], null, 2);
  if(navigator.clipboard){
    navigator.clipboard.writeText(text).then(()=>toast('Copied ✓','success')).catch(()=>fallbackCopy(text));
  } else fallbackCopy(text);
}
function fallbackCopy(text){
  el('copy-json-textarea').value = text;
  openSheet('sheet-copy-json');
}

// ── EXPORT ─────────────────────────────────────
function dlJSON(data, filename){
  const blob=new Blob([JSON.stringify(data,null,2)],{type:'application/json'});
  const url=URL.createObjectURL(blob);
  const a=document.createElement('a'); a.href=url; a.download=filename; a.click();
  URL.revokeObjectURL(url);
}
function buildExportSheet(){
  const gl=el('export-group-list'); if(!gl) return;
  gl.innerHTML='';
  const used=ALL_GROUPS.filter(k=>hymns.some(h=>h.groupKey===k));
  if(!used.length){ gl.innerHTML='<div style="color:rgba(255,255,255,.28);padding:8px 0;font-size:14px">No hymns yet</div>'; return; }
  used.forEach(k=>{
    const count=hymns.filter(h=>h.groupKey===k).length;
    const b=document.createElement('button'); b.className='sheet-item';
    b.innerHTML=esc(gLabel(k))+' <span class="export-count">'+count+'</span>';
    b.addEventListener('click',()=>{ dlJSON(hymns.filter(h=>h.groupKey===k).map(hymnToExport),k+'.json'); closeSheet('sheet-export'); toast('Exported '+k,'success'); });
    gl.appendChild(b);
  });
}

// ── IMPORT ─────────────────────────────────────
function importJSON(str){
  let data; try{data=JSON.parse(str);}catch(e){toast('Invalid JSON','error');return;}
  if(!Array.isArray(data)) data=[data];
  impQueue=data; impStats={added:0,replaced:0,skipped:0}; impIdx=0;
  nextImport();
}
function rawToHymn(raw){
  const h=newHymn({id:raw.id||uid()});
  h.zemari=raw.singer||raw.composer||raw.author||'';
  h.color=raw.color||'';
  // Support both old string and new array format
  if(raw.subcategories&&Array.isArray(raw.subcategories)) h.subgroups=raw.subcategories;
  else if(raw.subcategory) h.subgroups=raw.subcategory.split(',').map(s=>s.trim()).filter(Boolean);
  else h.subgroups=[];
  h.groupKey=raw.category||raw.groupKey||'';
  LANGS.forEach(l=>{
    const ld=h.langs[l];
    ld.groupName=(raw.group&&raw.group[l])||'';
    ld.title=(raw.title&&raw.title[l])||'';
    ld.subtitle=(raw.subtitle&&raw.subtitle[l])||'';
    if(raw.youtubeUrls&&typeof raw.youtubeUrls==='object') ld.youtube=raw.youtubeUrls[l]||'';
    const ly=(raw.lyrics&&raw.lyrics[l])||'';
    if(ly){const p=parseLyrics(ly);ld.chorus=p.chorus;ld.verses=p.verses;}
  });
  return h;
}
function nextImport(){
  if(impIdx>=impQueue.length){ renderList(); save(); toast('Done: '+impStats.added+' added, '+impStats.replaced+' replaced, '+impStats.skipped+' skipped','success'); return; }
  const raw=impQueue[impIdx], h=rawToHymn(raw), exist=hymns.find(x=>x.id===h.id);
  if(!exist){hymns.push(h);impStats.added++;impIdx++;nextImport();return;}
  el('conflict-msg').textContent='"'+title(exist)+'" already exists.';
  openSheet('sheet-conflict');
}



function refreshPreviewIfOpen(h){
  const sheet = el('sheet-preview');
  if(!sheet || sheet.style.display==='none') return;
  const contentEl = el('preview-content');
  const activeTab = el('preview-lang-tabs')?.querySelector('.preview-tab.active');
  if(contentEl && activeTab) contentEl.innerHTML = buildPreview(h, activeTab.dataset.lang);
}

// ── LIVE PREVIEW ────────────────────────────────
function buildPreview(h, lang){
  const ld = h.langs[lang];
  if(!ld) return '<div class="preview-empty">No content yet</div>';

  const color = h.color || '#0a84ff';
  let html = '';

  // Header
  html += '<div class="preview-header" style="border-color:'+color+'">';
  if(ld.title) html += '<div class="preview-title">'+esc(ld.title)+'</div>';
  if(ld.subtitle) html += '<div class="preview-subtitle">'+esc(ld.subtitle)+'</div>';
  const grp = h.langs[lang]?.groupName || h.groupKey;
  if(grp) html += '<div class="preview-group" style="color:'+color+'">'+esc(grp)+'</div>';
  html += '</div>';

  // Chorus
  const chorus = (ld.chorus||'').trim();
  const verses = (ld.verses||[]).filter(v=>v.lines&&v.lines.some(l=>(l.prefix||l.text||'').trim()));

  if(!chorus && !verses.length){
    html += '<div class="preview-empty">Type chorus or verses to see preview…</div>';
    return html;
  }

  function renderChorus(){
    if(!chorus) return '';
    let c = '<div class="preview-chorus">';
    chorus.split('\n').forEach(function(line){
      c += '<div class="preview-chorus-line">'+esc(line)+'</div>';
    });
    c += '</div>';
    return c;
  }

  function renderVerse(v, idx){
    let vhtml = '<div class="preview-verse">';
    vhtml += '<div class="preview-verse-num">'+LNAME[lang]+' · Verse '+(idx+1)+'</div>';
    (v.lines||[]).forEach(ln => {
      const prefix = (ln.prefix||'').trim();
      const text   = (ln.text||'').trim();
      if(!prefix && !text) return;
      if(prefix){
        vhtml += '<div class="preview-line"><span class="preview-highlight">'+esc(prefix)+'</span>';
        if(text) vhtml += ' <span class="preview-line-text">'+esc(text)+'</span>';
        vhtml += '</div>';
      } else {
        vhtml += '<div class="preview-line preview-plain">'+esc(text)+'</div>';
      }
    });
    vhtml += '</div>';
    return vhtml;
  }

  // Render: chorus first, then verse+chorus pattern
  html += renderChorus();
  verses.forEach((v,i) => {
    html += renderVerse(v, i);
    html += renderChorus(); // repeats after each verse
  });

  return html;
}

function openPreview(h){
  const tabsEl   = el('preview-lang-tabs');
  const contentEl = el('preview-content');
  if(!tabsEl||!contentEl) return;

  // Only show langs that have content
  const activeLangs = LANGS.filter(l => {
    const ld = h.langs[l];
    return ld && (ld.title || ld.chorus || (ld.verses||[]).some(v=>v.lines&&v.lines.some(ln=>(ln.prefix||ln.text||'').trim())));
  });

  if(!activeLangs.length){
    tabsEl.innerHTML = '';
    contentEl.innerHTML = '<div class="preview-empty">Nothing to preview yet — type some lyrics first.</div>';
    openSheet('sheet-preview');
    return;
  }

  let currentLang = activeLangs[0];

  function renderTabs(){
    tabsEl.innerHTML = activeLangs.map(l =>
      '<button class="preview-tab'+(l===currentLang?' active':'')+'" data-lang="'+l+'">'+LNAME[l]+'</button>'
    ).join('');
    tabsEl.querySelectorAll('.preview-tab').forEach(btn => {
      btn.addEventListener('click', () => {
        currentLang = btn.dataset.lang;
        renderTabs();
        contentEl.innerHTML = buildPreview(h, currentLang);
      });
    });
  }

  renderTabs();
  contentEl.innerHTML = buildPreview(h, currentLang);
  openSheet('sheet-preview');
}

// ── GITHUB SEARCH & LOAD ──────────────────────────
async function ghSearchHymns(query, groupKey){
  const groups = groupKey ? [groupKey] : ALL_GROUPS;
  const results = [];
  const q = query.toLowerCase().trim();

  for(const k of groups){
    try{
      const f = await ghGet(ghPath(k));
      if(!f) continue;
      let arr = [];
      try{ arr = JSON.parse(decodeURIComponent(escape(atob(f.content.replace(/\n/g,''))))); }catch(e){ continue; }
      arr.forEach(hymn => {
        if(!hymn.title) return;
        const titles = typeof hymn.title==='object' ? Object.values(hymn.title) : [hymn.title];
        const match = !q || titles.some(t => t && t.toLowerCase().includes(q));
        if(match) results.push({ ...hymn, _groupKey: k });
      });
    }catch(e){ /* skip group on error */ }
  }
  return results;
}

function ghHymnToLocal(raw){
  // Load a GitHub hymn into local state for editing
  const h = rawToHymn(raw);
  h.groupKey = raw._groupKey || raw.category || '';
  // Mark which languages already exist
  h._fromGitHub = true;
  h._existingLangs = LANGS.filter(l => (raw.title&&raw.title[l]) || (raw.lyrics&&raw.lyrics[l]));
  return h;
}

function openGhSearch(){
  // Populate group dropdown
  const sel = el('gh-search-group');
  if(sel && sel.options.length <= 1){
    ALL_GROUPS.forEach(k => {
      const o = document.createElement('option');
      o.value = k; o.textContent = gLabel(k);
      sel.appendChild(o);
    });
  }
  el('gh-search-results').innerHTML = '';
  el('gh-search-input').value = '';
  openSheet('sheet-gh-search');
  setTimeout(() => el('gh-search-input')?.focus(), 200);
}

async function runGhSearch(){
  const query = el('gh-search-input')?.value.trim() || '';
  const group = el('gh-search-group')?.value || '';
  const resEl = el('gh-search-results');

  if(!query && !group){ toast('Enter a title or pick a group','error'); return; }
  if(!getGHToken()){ promptToken(()=>runGhSearch()); return; }

  resEl.innerHTML = '<div class="dc-loading"><span class="pulse">✝</span> Searching GitHub…</div>';

  try{
    const results = await ghSearchHymns(query, group);
    if(!results.length){
      resEl.innerHTML = '<div class="dc-clear">No hymns found. Try a different search.</div>';
      return;
    }

    resEl.innerHTML = '<div class="gh-result-count">'+results.length+' hymn'+(results.length!==1?'s':'')+' found:</div>';
    results.slice(0,20).forEach(raw => {
      const titles = typeof raw.title==='object' ? Object.values(raw.title).filter(Boolean) : [raw.title||''];
      const hasLangs = typeof raw.title==='object' ? Object.keys(raw.title).filter(k=>raw.title[k]).join(', ') : '?';
      const missingLangs = LANGS.filter(l => !raw.title?.[l] && !raw.lyrics?.[l]);

      const card = document.createElement('div');
      card.className = 'gh-result-card';
      card.innerHTML =
        '<div class="gh-result-title">'+esc(titles[0])+(titles[1]?' · '+esc(titles[1]):'')+'</div>'+
        '<div class="gh-result-meta">'+
          '<span class="chip chip-group">'+esc(raw._groupKey||'')+'</span>'+
          '<span class="gh-has">Has: '+esc(hasLangs)+'</span>'+
        '</div>'+
        (missingLangs.length ? '<div class="gh-missing">Missing: '+missingLangs.map(l=>'<span class="chip chip-missing">'+LNAME[l]+'</span>').join('')+'</div>' : '<div class="gh-complete">✓ All languages present</div>')+
        '<button class="sheet-btn-primary gh-load-btn" style="width:100%;margin-top:10px">Load & Fill Missing Languages →</button>';

      card.querySelector('.gh-load-btn').addEventListener('click', () => {
        const h = ghHymnToLocal(raw);
        // Check if already in local hymns
        const existing = hymns.find(x => x.id === h.id);
        if(existing){
          closeSheet('sheet-gh-search');
          selectHymn(existing.id);
          toast('Opened existing hymn — add missing languages then Submit to merge','success');
        } else {
          hymns.unshift(h);
          save();
          closeSheet('sheet-gh-search');
          selectHymn(h.id);
          toast('Loaded from GitHub — add missing languages then Submit','success');
        }
      });

      resEl.appendChild(card);
    });
    if(results.length > 20){
      resEl.innerHTML += '<div style="text-align:center;color:rgba(255,255,255,.4);font-size:13px;padding:8px">Showing first 20 — refine your search for more</div>';
    }
  }catch(e){
    resEl.innerHTML = '<div class="dc-error">✕ '+esc(e.message)+'</div>';
  }
}

// ── INIT ───────────────────────────────────────
function init(){
  load();

  // Gate
  el('gate-submit')?.addEventListener('click', submitGate);
  el('gate-password')?.addEventListener('keydown', e=>{ if(e.key==='Enter') submitGate(); });

  // List
  el('btn-new-top')?.addEventListener('click', addNewHymn);
  el('btn-github-search')?.addEventListener('click', openGhSearch);
  el('gh-search-btn')?.addEventListener('click', runGhSearch);
  el('gh-search-close')?.addEventListener('click', ()=>closeSheet('sheet-gh-search'));
  el('gh-search-input')?.addEventListener('keydown', e=>{ if(e.key==='Enter') runGhSearch(); });
  el('btn-import-top')?.addEventListener('click', ()=>el('file-import-input').click());
  el('btn-export-top')?.addEventListener('click', ()=>{ buildExportSheet(); openSheet('sheet-export'); });
  el('btn-dl-all')?.addEventListener('click', ()=>{
    if(!hymns.length){ toast('No hymns to download','error'); return; }
    dlJSON(hymns.map(hymnToExport), 'wazema-hymns.json');
    toast('Downloaded '+hymns.length+' hymns ✓','success');
  });
  el('search-input')?.addEventListener('input', renderList);
  el('filter-group')?.addEventListener('change', renderList);
  el('filter-status')?.addEventListener('change', renderList);
  el('file-import-input')?.addEventListener('change', function(){
    const f=this.files[0]; if(!f) return;
    const r=new FileReader(); r.onload=e=>{importJSON(e.target.result);this.value='';};
    r.readAsText(f);
  });

  // Editor
  el('btn-back')?.addEventListener('click', ()=>{ save(); showPage('page-list'); renderList(); });
  el('btn-preview')?.addEventListener('click', ()=>{ if(activeHymn) openPreview(activeHymn); });
  el('preview-close')?.addEventListener('click', ()=>closeSheet('sheet-preview'));
  el('btn-submit-hymn')?.addEventListener('click', ()=>{ if(activeHymn) startSubmit(activeHymn); });
  el('btn-copy-json')?.addEventListener('click', ()=>{ if(activeHymn) copyJSON(activeHymn); });
  el('btn-delete-hymn')?.addEventListener('click', ()=>{
    if(!activeHymn) return;
    el('delete-msg').textContent='Delete "'+title(activeHymn)+'"?';
    openSheet('sheet-delete');
  });

  // Sheets: close on overlay tap
  document.querySelectorAll('.sheet-overlay').forEach(s=>s.addEventListener('click',e=>{if(e.target===s)s.style.display='none';}));

  // Export
  el('sheet-export-close')?.addEventListener('click',()=>closeSheet('sheet-export'));
  el('btn-export-all')?.addEventListener('click',()=>{ dlJSON(hymns.map(hymnToExport),'hymns.json'); closeSheet('sheet-export'); toast('Exported '+hymns.length+' hymns','success'); });

  // Admin
  el('sheet-admin-close')?.addEventListener('click',()=>closeSheet('sheet-admin'));
  el('gh-save')?.addEventListener('click',()=>{
    const t=el('gh-token')?.value.trim(); if(!t){toast('Paste token first','error');return;}
    setGHToken(t);
    // Also set as the login password so volunteers use token to log in
    localStorage.setItem(GH_PASS_KEY, t);
    closeSheet('sheet-admin'); toast('Token saved as password ✓','success');
  });
  el('gh-test')?.addEventListener('click', testGH);
  el('gh-init-files')?.addEventListener('click', initGHFiles);
  el('anthropic-key-save')?.addEventListener('click',()=>{
    const k=el('anthropic-key-input')?.value.trim(); if(!k){toast('Paste API key','error');return;}
    localStorage.setItem(ANT_KEY,k); el('anthropic-key-input').value='';
    el('anthropic-key-input').placeholder='sk-ant-... (saved)';
    closeSheet('sheet-admin'); toast('API key saved ✓','success');
  });
  el('anthropic-key-clear')?.addEventListener('click',()=>{ localStorage.removeItem(ANT_KEY); toast('API key cleared','success'); });
  // Pre-fill if key exists
  if(localStorage.getItem(ANT_KEY)) { const i=el('anthropic-key-input'); if(i) i.placeholder='sk-ant-... (saved)'; }

  // Token
  el('token-cancel')?.addEventListener('click',()=>{ closeSheet('sheet-token'); pendingTokenCb=null; });
  el('token-confirm')?.addEventListener('click', confirmToken);
  el('volunteer-token')?.addEventListener('keydown',e=>{ if(e.key==='Enter') confirmToken(); });

  // Copy JSON
  el('copy-json-close')?.addEventListener('click',()=>closeSheet('sheet-copy-json'));
  el('copy-json-copy-btn')?.addEventListener('click',()=>{
    el('copy-json-textarea')?.select(); document.execCommand('copy'); toast('Copied ✓','success');
  });

  // Dup check
  el('dupcheck-cancel')?.addEventListener('click',()=>closeSheet('sheet-dupcheck'));
  el('dupcheck-submit')?.addEventListener('click', doSubmit);
  el('dupcheck-merge')?.addEventListener('click', doMerge);

  // Success
  el('submitted-ok')?.addEventListener('click',()=>closeSheet('sheet-submitted'));

  // Delete
  el('delete-cancel')?.addEventListener('click',()=>closeSheet('sheet-delete'));
  el('delete-confirm')?.addEventListener('click',()=>{
    if(activeHymn){ hymns=hymns.filter(h=>h.id!==activeHymn.id); save(); activeHymn=null; }
    closeSheet('sheet-delete'); showPage('page-list'); renderList(); toast('Deleted');
  });

  // Conflict
  el('conflict-keep')?.addEventListener('click',()=>{ impStats.skipped++; impIdx++; closeSheet('sheet-conflict'); nextImport(); });
  el('conflict-replace')?.addEventListener('click',()=>{
    const h=rawToHymn(impQueue[impIdx]); hymns[hymns.findIndex(x=>x.id===h.id)]=h;
    impStats.replaced++; impIdx++; closeSheet('sheet-conflict'); nextImport();
  });
  el('conflict-copy')?.addEventListener('click',()=>{
    const h=rawToHymn(impQueue[impIdx]); h.id=uid(); hymns.push(h);
    impStats.added++; impIdx++; closeSheet('sheet-conflict'); nextImport();
  });

  // Secret admin: tap title 5×
  let taps=0, tapT;
  document.addEventListener('click',e=>{
    if(e.target.closest('.gate-title')||e.target.closest('.top-title')){
      taps++; clearTimeout(tapT); tapT=setTimeout(()=>taps=0,2000);
      if(taps>=5){ taps=0; const k=localStorage.getItem(GH_TOK_KEY)||''; if(el('gh-token')) el('gh-token').value=k; openSheet('sheet-admin'); }
    }
  });

  // Cmd+S save
  document.addEventListener('keydown',e=>{ if((e.ctrlKey||e.metaKey)&&e.key==='s'){e.preventDefault();save();toast('Saved ✓','success');} });

  checkGate();
}

document.addEventListener('DOMContentLoaded', init);
