‘use strict’;
// WAZEMA Hymn Entry Tool — Mobile App
// St. George Eritrean Orthodox Church, Seattle
// Deacon Eskndr Tadesse

// ═══ CONSTANTS ═══════════════════════════════
const STORAGE_KEY = ‘wazema_hymns’;
const ACTIVE_KEY  = ‘wazema_active_id’;
const SESSION_KEY = ‘wz_session_ok’;
const VOL_TOKEN_KEY = ‘wz_vol_token_session’;
const LANGS      = [‘en’,‘ti’,‘ti_ro’,‘am’,‘am_ro’,‘om’,‘ro’];
const LANG_NAMES = {en:‘English’,ti:‘Tigrinya’,ti_ro:‘Tigrinya (Rom.)’,am:‘Amharic’,am_ro:‘Amharic (Rom.)’,om:‘Oromo’,ro:‘Romanian’};
const LANG_SHORT = {en:‘EN’,ti:‘TI’,ti_ro:‘TI-R’,am:‘AM’,am_ro:‘AM-R’,om:‘OM’,ro:‘RO’};
const STATUS_OPTIONS = {draft:‘Draft’,review:‘Needs Review’,final:‘Final’};
const DEFAULT_PASSWORD = ‘Mezmur2025’;

const GH_KEYS = {token:‘wz_gh_token’,volpass:‘wz_vol_pass’};
const HARDCODED_REPO = {owner:‘EskndrEssey’,repo:‘Mezmur-Typer’,branch:‘main’,folder:‘data’};

const GROUP_TAXONOMY = {

‘Sillase’: {
label: { en:‘ሥሳሴ · Holy Trinity’, ti:‘ሥሳሴ’, am:‘ሥሳሴ’ },
file: ‘Sillase’,
subgroups: []
},

‘Egziabher’: {
label: { en:‘እግዚኣብሔር · God (Egziabher)’, ti:‘እግዚኣብሔር’, am:‘እግዚአብሔር’ },
file: ‘Egziabher’,
subgroups: [
{ key:‘Lidet’,      label:{ en:‘Lidet / Christmas’,      ti:‘ልደት’,          am:‘ልደት’          }},
{ key:‘Timket’,     label:{ en:‘Timket / Epiphany’,      ti:‘ጥምቀት’,         am:‘ጥምቀት’         }},
{ key:‘Hosanna’,    label:{ en:‘Hosanna / Palm Sunday’,  ti:‘ሆሳዕና’,         am:‘ሆሳዕና’         }},
{ key:‘Siglet’,     label:{ en:‘Siglet / Good Friday’,   ti:‘ስቅለት’,         am:‘ስቅለት’         }},
{ key:‘Tinsae’,     label:{ en:‘Tinsae / Easter’,        ti:‘ትንሣኤ’,         am:‘ትንሣኤ’         }},
{ key:‘Erget’,      label:{ en:‘Erget / Ascension’,      ti:‘ዕርጋት’,         am:‘ዕርጋት’         }},
{ key:‘Pentecost’,  label:{ en:‘Pentecost’,              ti:‘ጰንጠቆስጤ’,       am:‘ጰንጠቆስጤ’       }},
{ key:‘DebreTabor’, label:{ en:‘Debre Tabor’,            ti:‘ደብረ ታቦር’,      am:‘ደብረ ታቦር’      }},
{ key:‘KibreTabot’, label:{ en:‘Kibre Tabot’,            ti:‘ክብረ ታቦት’,      am:‘ክብረ ታቦት’      }},
{ key:‘MedhaneAlem’,label:{ en:‘Medhane Alem’,           ti:‘መድኃኔ ዓለም’,     am:‘መድኃኒዓለም’      }},
{ key:‘Pagumen’,    label:{ en:‘Pagumen’,                ti:‘ጳጉሜን’,         am:‘ጳጉሜን’         }},
{ key:‘Meskel’,     label:{ en:‘Meskel / True Cross’,    ti:‘መስቀል’,         am:‘መስቀል’         }},
{ key:‘Mera’,       label:{ en:‘Mera / Wedding’,         ti:‘መርዓ’,           am:‘ሰርግ’          }},
{ key:‘General’,    label:{ en:‘General’,                ti:‘ጠቅላላ’,         am:‘ጠቅላላ’         }},
]
},

‘Mariam’: {
label: { en:‘ማርያም · St. Mary’, ti:‘ማርያም’, am:‘ማርያም’ },
file: ‘Mariam’,
subgroups: [
{ key:‘Lideta’,     label:{ en:‘Lideta le-Mariam’,       ti:‘ልደታ ለማርያም’,   am:‘ልደታ ለማርያም’   }},
{ key:‘KidaneMehret’,label:{en:‘Kidane Mehret’,          ti:‘ኪዳነ ምሕረት’,    am:‘ኪዳነ ምሕረት’    }},
{ key:‘Filseta’,    label:{ en:‘Filseta / Assumption’,   ti:‘ፍልሰታ’,         am:‘ፍልሰታ’         }},
{ key:‘SdetMariam’, label:{ en:‘Sdet Mariam’,            ti:‘ስደት ማርያም’,    am:‘ስደተ ማርያም’    }},
{ key:‘TsomeMariam’,label:{ en:‘Tsome Mariam’,           ti:‘ጾመ ማርያም’,     am:‘ጾመ ማርያም’     }},
{ key:‘Mera’,       label:{ en:‘Mera / Wedding’,         ti:‘መርዓ’,           am:‘ሰርግ’          }},
{ key:‘General’,    label:{ en:‘General’,                ti:‘ጠቅላላ’,         am:‘ጠቅላላ’         }},
]
},

‘Giorgis’: {
label: { en:‘ቅዱስ ጊዮርጊስ · St. George’, ti:‘ቅ/ ጊዮርጊስ’, am:‘ቅዱስ ጊዮርጊስ’ },
file: ‘Giorgis’,
subgroups: [
{ key:‘Monthly’,    label:{ en:‘Monthly Feast’,          ti:‘ወርሓዊ በዓል’,     am:‘ወርሃዊ በዓል’     }},
{ key:‘General’,    label:{ en:‘General’,                ti:‘ጠቅላላ’,         am:‘ጠቅላላ’         }},
]
},

‘Michael’: {
label: { en:‘ቅዱስ ሚካኤል · St. Michael’, ti:‘ቅ/ ሚካኤል’, am:‘ቅዱስ ሚካኤል’ },
file: ‘Michael’,
subgroups: [
{ key:‘Monthly’,    label:{ en:‘Monthly Feast’,          ti:‘ወርሓዊ በዓል’,     am:‘ወርሃዊ በዓል’     }},
{ key:‘General’,    label:{ en:‘General’,                ti:‘ጠቅላላ’,         am:‘ጠቅላላ’         }},
]
},

‘Gabriel’: {
label: { en:‘ቅዱስ ገብርኤል · St. Gabriel’, ti:‘ቅ/ ገብርኤል’, am:‘ቅዱስ ገብርኤል’ },
file: ‘Gabriel’,
subgroups: [
{ key:‘Monthly’,    label:{ en:‘Monthly Feast’,          ti:‘ወርሓዊ በዓል’,     am:‘ወርሃዊ በዓል’     }},
{ key:‘General’,    label:{ en:‘General’,                ti:‘ጠቅላላ’,         am:‘ጠቅላላ’         }},
]
},

‘KidusnAbbot’: {
label: { en:‘ቅዱሳን ኣቦት · Holy Fathers’, ti:‘ቅዱሳን ኣቦት’, am:‘ቅዱሳን አበው’ },
file: ‘KidusnAbbot’,
subgroups: [
{ key:‘TekleHaymanot’,label:{en:‘Abune Tekle Haymanot’, ti:‘ኣቡነ ተክለ ሃይማኖት’,am:‘አቡነ ተክለ ሃይማኖት’}},
{ key:‘Yared’,      label:{ en:‘St. Yared’,             ti:‘ቅዱስ ያሬድ’,      am:‘ቅዱስ ያሬድ’      }},
{ key:‘General’,    label:{ en:‘General’,                ti:‘ጠቅላላ’,         am:‘ጠቅላላ’         }},
]
},

‘KidusnMelaikt’: {
label: { en:‘ቅዱሳን መላእኽት · Angels’, ti:‘ቅዱሳን መላእኽት’, am:‘ቅዱሳን መላእክት’ },
file: ‘KidusnMelaikt’,
subgroups: [
{ key:‘General’,    label:{ en:‘General’,                ti:‘ጠቅላላ’,         am:‘ጠቅላላ’         }},
]
},

‘Nissha’: {
label: { en:‘ንስሓ · Repentance’, ti:‘ንስሓ’, am:‘ንስሐ’ },
file: ‘Nissha’,
subgroups: []
},

‘Zewetr’: {
label: { en:‘ዘወትር · Everyday’, ti:‘ዘወትር’, am:‘ዘወትር’ },
file: ‘Zewetr’,
subgroups: []
},

‘Mera’: {
label: { en:‘መርዓ · Wedding’, ti:‘መርዓ’, am:‘ሰርግ’ },
file: ‘Mera’,
subgroups: [
{ key:‘Ceremony’,   label:{ en:‘Ceremony’,               ti:‘ስነ-ስርዓት’,      am:‘ሥርዓት’         }},
{ key:‘Blessing’,   label:{ en:‘Blessing’,               ti:‘ቅድስና’,         am:‘ቡራኬ’          }},
{ key:‘General’,    label:{ en:‘General’,                ti:‘ጠቅላላ’,         am:‘ጠቅላላ’         }},
]
},

‘Yohannes’: {
label: { en:‘ቅዱስ ዮሓንስ · St. John’, ti:‘ቅ. ዮሓንስ’, am:‘ቅዱስ ዮሐንስ’ },
file: ‘Yohannes’,
subgroups: [
{ key:‘General’,    label:{ en:‘General’,                ti:‘ጠቅላላ’,         am:‘ጠቅላላ’         }},
]
},

};

const ALL_GROUP_KEYS = Object.keys(GROUP_TAXONOMY);

// ═══ STATE ════════════════════════════════════
let hymns = [];
let activeHymn = null;
let saveTimer = null;
let toastTimer = null;
let pendingSubmitHymn = null;
let pendingMergeTarget = null;
let pendingTokenCallback = null;
let importQueue = [], importStats = {}, importCurrent = 0;

// ═══ DATA MODEL ═══════════════════════════════
function uid(){ return ‘hymn_’+Date.now().toString(36)+Math.random().toString(36).slice(2,6); }
function createLine(prefix=’’,text=’’){ return {prefix,text}; }
function createVerse(){ return {lines:[createLine()]}; }
function createLangData(){ return {groupName:’’,title:’’,subtitle:’’,chorus:’’,verses:[],youtube:’’}; }
function createHymn(o={}){
const id=o.id||uid();
const langs={};
LANGS.forEach(l=>{langs[l]=createLangData();});
return {id,groupKey:’’,subgroup:’’,zemari:’’,color:’’,status:‘draft’,langs,…o};
}

// ═══ STORAGE ══════════════════════════════════
function loadStorage(){
try{
const d=localStorage.getItem(STORAGE_KEY);
hymns=d?JSON.parse(d):[];
hymns.forEach(migrateHymn);
}catch(e){hymns=[];}
}
function migrateHymn(h){
if(!h.langs)h.langs={};
LANGS.forEach(l=>{
if(!h.langs[l])h.langs[l]=createLangData();
const ld=h.langs[l];
if(!ld.verses)ld.verses=[];
if(!ld.youtube)ld.youtube=’’;
if(!ld.chorus)ld.chorus=’’;
if(!ld.groupName)ld.groupName=’’;
if(ld.blocks){
ld.blocks.forEach(b=>{
if(b.type===‘verse’)ld.verses.push({lines:b.text.split(’\n’).map(t=>createLine(’’,t))});
else if(b.type===‘highlight’)ld.verses.push({lines:[createLine(b.text,’’)]});
});
delete ld.blocks;
}
});
if(!h.zemari)h.zemari=h.singer||h.composer||h.author||’’;
if(!h.groupKey&&h.group)h.groupKey=h.group;
}
function saveStorage(){ localStorage.setItem(STORAGE_KEY,JSON.stringify(hymns)); }
function scheduleSave(){ clearTimeout(saveTimer); saveTimer=setTimeout(saveStorage,400); }

// ═══ HELPERS ══════════════════════════════════
function esc(s){ if(!s)return ‘’; return String(s).replace(/&/g,’&’).replace(/</g,’<’).replace(/>/g,’>’).replace(/”/g,’"’); }
function getTitle(h){ for(const l of LANGS){const t=h.langs[l]?.title?.trim();if(t)return t;} return ‘(Untitled)’; }
function getSubs(k){ return GROUP_TAXONOMY[k]?.subgroups||[]; }
function subKey(s){ return typeof s===‘string’?s:s.key||s; }
function subLabel(s,l=‘en’){ if(typeof s===‘string’)return s; return s.label?.[l]||s.label?.en||s.key||s; }
function groupLabel(k,l=‘en’){ const g=GROUP_TAXONOMY[k]; if(!g)return k; return typeof g.label===‘string’?g.label:(g.label?.[l]||g.label?.en||k); }

// ═══ PAGES ════════════════════════════════════
function showPage(id){
document.querySelectorAll(’.page’).forEach(p=>p.style.display=‘none’);
const p=document.getElementById(id);
if(p)p.style.display=‘flex’;
}

// ═══ TOAST ════════════════════════════════════
function showToast(msg,type=’’){
const t=document.getElementById(‘toast’);
if(!t)return;
t.textContent=msg;
t.className=‘toast’+(type?’ ‘+type:’’)+’ visible’;
clearTimeout(toastTimer);
toastTimer=setTimeout(()=>t.classList.remove(‘visible’),2800);
}

// ═══ SHEETS ═══════════════════════════════════
function openSheet(id){ const el=document.getElementById(id); if(el)el.style.display=‘flex’; }
function closeSheet(id){ const el=document.getElementById(id); if(el)el.style.display=‘none’; }

// ═══ PASSWORD GATE ═════════════════════════════
function getPassword(){ return localStorage.getItem(GH_KEYS.volpass)||DEFAULT_PASSWORD; }
function isLoggedIn(){ return sessionStorage.getItem(SESSION_KEY)===‘1’; }
function checkGate(){
if(isLoggedIn()){
showPage(‘page-list’);
renderList();
} else {
// Gate is already visible by default in HTML — just focus the input
showPage(‘page-gate’);
setTimeout(()=>document.getElementById(‘gate-password’)?.focus(),200);
}
}
function submitGate(){
const val=document.getElementById(‘gate-password’).value;
const err=document.getElementById(‘gate-error’);
if(val===getPassword()){
sessionStorage.setItem(SESSION_KEY,‘1’);
document.getElementById(‘gate-password’).value=’’;
err.style.display=‘none’;
showPage(‘page-list’);
renderList();
} else {
err.style.display=‘block’;
document.getElementById(‘gate-password’).value=’’;
document.getElementById(‘gate-password’).classList.remove(‘shake’);
void document.getElementById(‘gate-password’).offsetWidth;
document.getElementById(‘gate-password’).classList.add(‘shake’);
}
}

// ═══ HYMN LIST ═════════════════════════════════
function renderList(){
const list=document.getElementById(‘hymn-list’);
const stats=document.getElementById(‘sidebar-stats’);
const search=(document.getElementById(‘search-input’)?.value||’’).toLowerCase();
const group=document.getElementById(‘filter-group’)?.value||’’;
const status=document.getElementById(‘filter-status’)?.value||’’;

// Rebuild group dropdown
const gsel=document.getElementById(‘filter-group’);
if(gsel){
const prev=gsel.value;
gsel.innerHTML=’<option value="">All Groups</option>’;
ALL_GROUP_KEYS.forEach(k=>{
const o=document.createElement(‘option’);
o.value=k; o.textContent=groupLabel(k,‘en’);
if(k===prev)o.selected=true;
gsel.appendChild(o);
});
}

const filtered=hymns.filter(h=>{
const t=getTitle(h).toLowerCase();
if(search&&!t.includes(search)&&!h.id.includes(search))return false;
if(group&&h.groupKey!==group)return false;
if(status&&h.status!==status)return false;
return true;
});

if(stats)stats.textContent=`${filtered.length} of ${hymns.length} hymn${hymns.length!==1?'s':''}`;

if(!list)return;
list.innerHTML=’’;
if(!filtered.length){
list.innerHTML=’<div style="padding:40px 20px;text-align:center;color:rgba(255,255,255,.28);font-size:15px;line-height:1.8">No hymns yet.<br>Tap <strong style=color:rgba(255,255,255,.6)>+ New</strong> to start.</div>’;
return;
}
filtered.forEach(h=>{
const d=document.createElement(‘div’);
d.className=‘hymn-item’;
const gc=h.groupKey?`<span class="chip chip-group">${esc(h.groupKey)}</span>`:’’;
const sc=h.subgroup?`<span class="chip chip-sub">${esc(h.subgroup)}</span>`:’’;
const badge=`<span class="status-badge status-${h.status}">${STATUS_OPTIONS[h.status]||h.status}</span>`;
d.innerHTML=`<div class="hymn-item-left"><div class="hymn-item-title">${esc(getTitle(h))}</div><div class="hymn-item-meta">${gc}${sc}${badge}</div></div><span class="hymn-item-arrow">›</span>`;
d.addEventListener(‘click’,()=>selectHymn(h.id));
list.appendChild(d);
});
}

// ═══ SELECT / ADD HYMN ════════════════════════
function selectHymn(id){
activeHymn=hymns.find(h=>h.id===id)||null;
if(!activeHymn)return;
renderEditor();
showPage(‘page-editor’);
}
function addNewHymn(){
const h=createHymn();
hymns.unshift(h);
saveStorage();
selectHymn(h.id);
}

// ═══ LYRICS BUILD ═════════════════════════════
function buildLyricsString(ld){
const chorus=(ld.chorus||’’).trim();
const verses=(ld.verses||[]).filter(v=>v.lines&&v.lines.some(l=>(l.prefix||l.text||’’).trim()));
if(!chorus&&!verses.length)return ‘’;
const tag=chorus?`[[chorus]]\n${chorus}\n[[/chorus]]`:null;
if(!verses.length)return tag||’’;
const parts=[];if(tag)parts.push(tag);
verses.forEach(v=>{
const ls=v.lines.map(l=>{const p=(l.prefix||’’).trimEnd();return p?`[[highlight]]${p} [[/highlight]]${l.text||''}`:(l.text||’’);}).filter(s=>s.trim());
if(ls.length){parts.push(ls.join(’\n’));if(tag)parts.push(tag);}
});
return parts.join(’\n \n’);
}

function hymnToExport(h){
const out={id:h.id};
const gm={};LANGS.forEach(l=>{gm[l]=(h.langs[l]?.groupName||’’).trim();});out.group=gm;
const tm={};LANGS.forEach(l=>{const t=(h.langs[l]?.title||’’).trim();if(t)tm[l]=t;});out.title=tm;
const lm={};LANGS.forEach(l=>{const ly=buildLyricsString(h.langs[l]);if(ly)lm[l]=ly;});out.lyrics=lm;
const sm={};LANGS.forEach(l=>{const s=(h.langs[l]?.subtitle||’’).trim();if(s)sm[l]=s;});if(Object.keys(sm).length)out.subtitle=sm;
const um={};LANGS.forEach(l=>{const u=(h.langs[l]?.youtube||’’).trim();if(u)um[l]=u;});if(Object.keys(um).length)out.youtubeUrls=um;
if(h.zemari?.trim())out.singer=h.zemari.trim();
if(h.color?.trim())out.color=h.color.trim();
if(h.subgroup?.trim())out.subcategory=h.subgroup.trim();
if(h.groupKey?.trim())out.category=h.groupKey.trim();
return out;
}

// ═══ EDITOR ═══════════════════════════════════
function autoResize(el){ el.style.height=‘auto’; el.style.height=el.scrollHeight+‘px’; }

function renderEditor(){
const h=activeHymn; if(!h)return;
const area=document.getElementById(‘editor-area’); if(!area)return;

const statusHTML=Object.entries(STATUS_OPTIONS).map(([k,v])=>
`<button class="status-toggle ${h.status===k?'active-'+k:''}" data-status="${k}">${v}</button>`
).join(’’);

const catHTML=ALL_GROUP_KEYS.map(k=>
`<button class="cat-toggle ${h.groupKey===k?'active':''}" data-cat="${k}">${esc(groupLabel(k,'en'))}</button>`
).join(’’);

const subs=getSubs(h.groupKey);
const subHTML=subs.map(s=>{
const k=subKey(s),l=subLabel(s,‘en’);
return `<button class="sub-toggle ${h.subgroup===k?'active':''}" data-sub="${esc(k)}">${esc(l)}</button>`;
}).join(’’);

const tabs=LANGS.map(l=>`<button class="lang-tab ${l==='en'?'active':''}" data-lang="${l}">${LANG_NAMES[l]}</button>`).join(’’);

const panels=LANGS.map(l=>{
const ld=h.langs[l]||createLangData();
const verses=(ld.verses||[]).map((v,vi)=>buildVerseHTML(v,vi)).join(’’);
return `<div class="lang-panel ${l==='en'?'active':''}" data-lang="${l}"> ${(l==='ti_ro'||l==='am_ro') ? `
<div class="romanize-banner">
<div class="romanize-info">
<span class="romanize-icon">✨</span>
<div>
<div class="romanize-title">Auto-Romanize with AI</div>
<div class="romanize-desc">Fills this tab automatically from ${l===‘ti_ro’?‘Tigrinya’:‘Amharic’}</div>
</div>
</div>
<button class="romanize-btn" data-src="${l==='ti_ro'?'ti':'am'}" data-dst="${l}">✨ Romanize</button>
</div>` : ''} <div class="form-row"><label class="form-label">Title (${LANG_SHORT[l]})</label> <input class="form-input lang-title" data-lang="${l}" value="${esc(ld.title||'')}" placeholder="Hymn title in ${LANG_NAMES[l]}"/></div> <div class="form-row"><label class="form-label">Subtitle / Credits</label> <input class="form-input lang-subtitle" data-lang="${l}" value="${esc(ld.subtitle||'')}" placeholder="Optional"/></div> <div class="form-row"><label class="form-label">YouTube URL</label> <input type="url" class="form-input lang-youtube" data-lang="${l}" value="${esc(ld.youtube||'')}" placeholder="https://youtube.com/..."/></div> <div class="chorus-card"> <div class="chorus-header"><span class="chorus-label">♪ Chorus / ኣዝ</span><span class="chorus-hint">type once — repeats automatically</span></div> <textarea class="chorus-input lang-chorus" data-lang="${l}" placeholder="Chorus text here…">${esc(ld.chorus||'')}</textarea> </div> <div class="verse-hint">💡 <strong>Gold prefix box</strong> = highlighted text (e.g. "Praises of Mary"). Leave empty for plain line. <strong>Enter</strong> = new line.</div> <div class="verse-actions-row"> <button class="add-verse-btn" data-lang="${l}">+ Verse / ስታንዛ</button> <button class="dup-verse-btn" data-lang="${l}">⧉ Duplicate Last</button> </div> <div class="verse-list" id="vlist-${l}">${verses||'<div style="padding:20px;text-align:center;color:rgba(255,255,255,.3);font-style:italic">No verses yet</div>'}</div> </div>`;
}).join(’’);

area.innerHTML=` <div class="form-section"><div class="form-section-title">Status</div> <div class="form-body"><div class="status-row" id="status-row">${statusHTML}</div></div></div> <div class="form-section"><div class="form-section-title">Category</div> <div class="form-body"> <div class="cat-wrap" id="cat-wrap">${catHTML}</div> <div class="sub-wrap" id="sub-wrap" style="${subs.length?'':'display:none'}">${subHTML}</div> </div></div> <div class="form-section"><div class="form-section-title">Details</div> <div class="form-body"> <div class="form-row"><label class="form-label">Zemari/t (Singer / Composer)</label> <input class="form-input" id="meta-zemari" value="${esc(h.zemari||'')}" placeholder="Name"/></div> <div class="form-row"><label class="form-label">Color (hex, optional)</label> <input class="form-input" id="meta-color" value="${esc(h.color||'')}" placeholder="#DB2777"/></div> </div></div> <div class="form-section"><div class="form-section-title">Lyrics by Language</div> <div class="lang-tabs" id="lang-tabs">${tabs}</div> ${panels} </div>`;

bindEditor(area, h);
}

function buildVerseHTML(v,vi){
const lines=(v.lines||[]).map((line,li)=>{
const hasPfx=!!(line.prefix||’’).trim();
return `<div class="line-row ${hasPfx?'highlighted':''}" data-vi="${vi}" data-li="${li}"> <input class="line-prefix" data-vi="${vi}" data-li="${li}" value="${esc(line.prefix||'')}" placeholder="prefix"/> <textarea class="line-text" data-vi="${vi}" data-li="${li}" rows="1" placeholder="line…">${esc(line.text||'')}</textarea> <button class="line-del" data-vi="${vi}" data-li="${li}">✕</button> </div>`;
}).join(’’);
return `<div class="verse-card" data-vi="${vi}">
<div class="verse-header">
<span class="verse-title">Verse / ስታንዛ ${vi+1}</span>
<div class="verse-btns">
<button class="v-btn verse-up" data-vi="${vi}">↑</button>
<button class="v-btn verse-dn" data-vi="${vi}">↓</button>
<button class="v-btn del verse-del" data-vi="${vi}">✕</button>
</div>
</div>
<div class="line-list" data-vi="${vi}">${lines}</div>
<button class="add-line-btn" data-vi="${vi}">+ Add line</button>

  </div>`;
}

function refreshVerses(area,h,lang){
const c=area.querySelector(`#vlist-${lang}`); if(!c)return;
const verses=h.langs[lang].verses||[];
c.innerHTML=verses.length?verses.map((v,vi)=>buildVerseHTML(v,vi)).join(’’):’<div style="padding:20px;text-align:center;color:rgba(255,255,255,.3);font-style:italic">No verses yet</div>’;
c.querySelectorAll(’.line-text’).forEach(autoResize);
bindVerseEvents(area,h,lang);
}

function bindEditor(area,h){
// Status
area.querySelector(’#status-row’)?.addEventListener(‘click’,e=>{
const btn=e.target.closest(’.status-toggle’); if(!btn)return;
h.status=btn.dataset.status;
area.querySelectorAll(’.status-toggle’).forEach(b=>b.className=‘status-toggle’);
btn.className=`status-toggle active-${h.status}`;
scheduleSave(); renderList();
});

// Category
area.querySelector(’#cat-wrap’)?.addEventListener(‘click’,e=>{
const btn=e.target.closest(’.cat-toggle’); if(!btn)return;
h.groupKey=btn.dataset.cat; h.subgroup=’’;
area.querySelectorAll(’.cat-toggle’).forEach(b=>b.classList.toggle(‘active’,b.dataset.cat===h.groupKey));
const subs=getSubs(h.groupKey);
const sw=area.querySelector(’#sub-wrap’);
if(sw){
sw.innerHTML=subs.map(s=>{const k=subKey(s),l=subLabel(s,‘en’);return `<button class="sub-toggle" data-sub="${esc(k)}">${esc(l)}</button>`;}).join(’’);
sw.style.display=subs.length?’’:‘none’;
bindSubEvents(area,h);
}
scheduleSave(); renderList();
});
bindSubEvents(area,h);

// Meta
area.querySelector(’#meta-zemari’)?.addEventListener(‘input’,e=>{h.zemari=e.target.value;scheduleSave();});
area.querySelector(’#meta-color’)?.addEventListener(‘input’,e=>{h.color=e.target.value;scheduleSave();});

// Lang tabs
area.querySelector(’#lang-tabs’)?.addEventListener(‘click’,e=>{
const tab=e.target.closest(’.lang-tab’); if(!tab)return;
const lang=tab.dataset.lang;
area.querySelectorAll(’.lang-tab’).forEach(t=>t.classList.toggle(‘active’,t.dataset.lang===lang));
area.querySelectorAll(’.lang-panel’).forEach(p=>p.classList.toggle(‘active’,p.dataset.lang===lang));
});

// Per-lang inputs
area.querySelectorAll(’.lang-title’).forEach(el=>el.addEventListener(‘input’,()=>{h.langs[el.dataset.lang].title=el.value;scheduleSave();renderList();}) );
area.querySelectorAll(’.lang-subtitle’).forEach(el=>el.addEventListener(‘input’,()=>{h.langs[el.dataset.lang].subtitle=el.value;scheduleSave();}) );
area.querySelectorAll(’.lang-youtube’).forEach(el=>el.addEventListener(‘input’,()=>{h.langs[el.dataset.lang].youtube=el.value;scheduleSave();}) );
area.querySelectorAll(’.lang-chorus’).forEach(el=>el.addEventListener(‘input’,()=>{h.langs[el.dataset.lang].chorus=el.value;scheduleSave();}) );

// Auto-romanize buttons
area.querySelectorAll(’.romanize-btn’).forEach(btn=>{
btn.addEventListener(‘click’,()=>{
autoRomanize(h, btn.dataset.src, btn.dataset.dst, area);
});
});

// Add/dup verse
area.querySelectorAll(’.add-verse-btn’).forEach(btn=>btn.addEventListener(‘click’,()=>{
const lang=btn.dataset.lang;
h.langs[lang].verses.push(createVerse());
scheduleSave(); refreshVerses(area,h,lang);
}));
area.querySelectorAll(’.dup-verse-btn’).forEach(btn=>btn.addEventListener(‘click’,()=>{
const lang=btn.dataset.lang; const vs=h.langs[lang].verses;
if(!vs.length){showToast(‘No verses yet’);return;}
vs.push(JSON.parse(JSON.stringify(vs[vs.length-1])));
scheduleSave(); refreshVerses(area,h,lang);
}));

// All verse events
LANGS.forEach(lang=>bindVerseEvents(area,h,lang));
area.querySelectorAll(’.line-text’).forEach(autoResize);
}

function bindSubEvents(area,h){
area.querySelector(’#sub-wrap’)?.addEventListener(‘click’,e=>{
const btn=e.target.closest(’.sub-toggle’); if(!btn)return;
h.subgroup=h.subgroup===btn.dataset.sub?’’:btn.dataset.sub;
area.querySelectorAll(’.sub-toggle’).forEach(b=>b.classList.toggle(‘active’,b.dataset.sub===h.subgroup));
scheduleSave(); renderList();
});
}

function bindVerseEvents(area,h,lang){
const c=area.querySelector(`#vlist-${lang}`); if(!c)return;

c.addEventListener(‘input’,e=>{
const vi=+e.target.dataset.vi, li=+e.target.dataset.li;
if(isNaN(vi)||isNaN(li))return;
if(e.target.classList.contains(‘line-prefix’)){
h.langs[lang].verses[vi].lines[li].prefix=e.target.value;
e.target.closest(’.line-row’).classList.toggle(‘highlighted’,!!e.target.value.trim());
scheduleSave();
}
if(e.target.classList.contains(‘line-text’)){
h.langs[lang].verses[vi].lines[li].text=e.target.value;
autoResize(e.target); scheduleSave();
}
},true);

c.addEventListener(‘click’,e=>{
const vi=e.target.dataset?.vi!==undefined?+e.target.dataset.vi:NaN;
const li=e.target.dataset?.li!==undefined?+e.target.dataset.li:NaN;
const vs=h.langs[lang].verses;
if(e.target.classList.contains(‘line-del’)){
if(vs[vi].lines.length<=1){showToast(‘Need at least one line’);return;}
vs[vi].lines.splice(li,1); scheduleSave(); refreshVerses(area,h,lang); return;
}
if(e.target.classList.contains(‘add-line-btn’)){
vs[vi].lines.push(createLine()); scheduleSave(); refreshVerses(area,h,lang); return;
}
if(e.target.classList.contains(‘verse-up’)){
if(vi>0){[vs[vi-1],vs[vi]]=[vs[vi],vs[vi-1]];scheduleSave();refreshVerses(area,h,lang);} return;
}
if(e.target.classList.contains(‘verse-dn’)){
if(vi<vs.length-1){[vs[vi],vs[vi+1]]=[vs[vi+1],vs[vi]];scheduleSave();refreshVerses(area,h,lang);} return;
}
if(e.target.classList.contains(‘verse-del’)){
vs.splice(vi,1); scheduleSave(); refreshVerses(area,h,lang); return;
}
});

c.addEventListener(‘keydown’,e=>{
if(e.key===‘Enter’&&e.target.classList.contains(‘line-text’)&&!e.shiftKey){
e.preventDefault();
const vi=+e.target.dataset.vi, li=+e.target.dataset.li;
h.langs[lang].verses[vi].lines.splice(li+1,0,createLine());
scheduleSave(); refreshVerses(area,h,lang);
setTimeout(()=>{const n=c.querySelector(`.line-text[data-vi="${vi}"][data-li="${li+1}"]`);if(n)n.focus();},30);
}
});
}

// ═══ GITHUB API ═══════════════════════════════
function getToken(){ return sessionStorage.getItem(VOL_TOKEN_KEY)||localStorage.getItem(GH_KEYS.token)||’’; }
function setToken(t){ sessionStorage.setItem(VOL_TOKEN_KEY,t); localStorage.setItem(GH_KEYS.token,t); }
function saveGHConfig(cfg){ if(cfg.token)localStorage.setItem(GH_KEYS.token,cfg.token); if(cfg.volpass)localStorage.setItem(GH_KEYS.volpass,cfg.volpass); }

function ghPath(groupKey){
const file=(GROUP_TAXONOMY[groupKey]?.file||groupKey)+’.json’;
return HARDCODED_REPO.folder+’/’+file;
}
async function ghGet(path){
const t=getToken(); if(!t)throw new Error(‘No token’);
const r=await fetch(`https://api.github.com/repos/${HARDCODED_REPO.owner}/${HARDCODED_REPO.repo}/contents/${path}?ref=${HARDCODED_REPO.branch}`,
{headers:{‘Authorization’:’Bearer ’+t,‘Accept’:‘application/vnd.github+json’}});
if(r.status===404)return null;
if(!r.ok){const e=await r.json();throw new Error(e.message||r.status);}
return r.json();
}
async function ghPut(path,content,sha,msg){
const t=getToken();
const r=await fetch(`https://api.github.com/repos/${HARDCODED_REPO.owner}/${HARDCODED_REPO.repo}/contents/${path}`,{
method:‘PUT’,
headers:{‘Authorization’:’Bearer ’+t,‘Accept’:‘application/vnd.github+json’,‘Content-Type’:‘application/json’},
body:JSON.stringify({message:msg,content:btoa(unescape(encodeURIComponent(content))),branch:HARDCODED_REPO.branch,…(sha?{sha}:{})}),
});
if(!r.ok){const e=await r.json();throw new Error(e.message||‘Write failed’);}
return r.json();
}

async function testGHConnection(){
const t=document.getElementById(‘gh-token’)?.value.trim();
if(!t){showToast(‘Paste a token first’,‘error’);return;}
showToast(‘Testing…’);
try{
const r=await fetch(`https://api.github.com/repos/${HARDCODED_REPO.owner}/${HARDCODED_REPO.repo}`,
{headers:{‘Authorization’:’Bearer ’+t}});
if(r.ok){const d=await r.json();showToast(’Connected: ’+d.full_name,‘success’);}
else showToast(’Failed: ’+r.status,‘error’);
}catch(e){showToast(‘Network error’,‘error’);}
}

async function initializeGitHubFiles(){
const t=getToken();
if(!t){showToast(‘Save your token first’,‘error’);return;}
const btn=document.getElementById(‘gh-init-files’);
const status=document.getElementById(‘gh-init-status’);
if(btn)btn.disabled=true;
let created=0,skipped=0,failed=0;
for(const k of ALL_GROUP_KEYS){
const path=ghPath(k);
if(status)status.innerHTML+=`<div class="init-progress">Checking ${path}…</div>`;
try{
const ex=await ghGet(path);
if(ex){skipped++;if(status)status.innerHTML+=`<div class="init-skip">✓ Exists: ${path}</div>`;}
else{await ghPut(path,’[]’,null,’Initialize ’+k);created++;if(status)status.innerHTML+=`<div class="init-ok">✝ Created: ${path}</div>`;}
}catch(e){failed++;if(status)status.innerHTML+=`<div class="init-fail">✕ Failed: ${path}</div>`;}
await new Promise(r=>setTimeout(r,300));
}
if(btn){btn.disabled=false;}
if(status)status.innerHTML+=`<div class="init-summary">Done: ${created} created, ${skipped} existed, ${failed} failed</div>`;
showToast(`${created} files created`,‘success’);
}

// ═══ TOKEN PROMPT ══════════════════════════════
function promptToken(onConfirm){
if(getToken()){onConfirm(getToken());return;}
pendingTokenCallback=onConfirm;
openSheet(‘sheet-token’);
setTimeout(()=>document.getElementById(‘volunteer-token’)?.focus(),200);
}
function confirmToken(){
const t=document.getElementById(‘volunteer-token’).value.trim();
if(!t){showToast(‘Paste your token’,‘error’);return;}
setToken(t);
closeSheet(‘sheet-token’);
document.getElementById(‘volunteer-token’).value=’’;
if(pendingTokenCallback){pendingTokenCallback(t);pendingTokenCallback=null;}
}

// ═══ SUBMIT FLOW ═══════════════════════════════
async function startSubmit(h){
const hasTitle=LANGS.some(l=>(h.langs[l]?.title||’’).trim());
if(!hasTitle){showToast(‘Add a title first’,‘error’);return;}
if(!h.groupKey){showToast(‘Select a category first’,‘error’);return;}
pendingSubmitHymn=h;
if(!getToken()){promptToken(()=>startSubmit(h));return;}

const res=document.getElementById(‘dupcheck-results’);
const subBtn=document.getElementById(‘dupcheck-submit’);
const mergeBtn=document.getElementById(‘dupcheck-merge’);
res.innerHTML=’<div class="dc-loading"><span class="pulse">✝</span> Checking for duplicates…</div>’;
subBtn.style.display=‘none’; mergeBtn.style.display=‘none’;
openSheet(‘sheet-dupcheck’);

try{
const path=ghPath(h.groupKey);
const existing=await ghGet(path);
const myTitle=getTitle(h).toLowerCase();
if(!existing){
res.innerHTML=’<div class="dc-clear">✓ No existing file yet — safe to submit!</div>’;
subBtn.style.display=’’; subBtn.textContent=‘✝ Submit as New Hymn’;
return;
}
let arr=[];
try{arr=JSON.parse(decodeURIComponent(escape(atob(existing.content.replace(/\n/g,’’)))));}catch(e){}
const matches=arr.filter(ex=>{
if(!ex.title)return false;
const titles=typeof ex.title===‘object’?Object.values(ex.title):[ex.title];
return titles.some(t=>{if(!t)return false;const tl=t.toLowerCase();return tl.includes(myTitle)||myTitle.includes(tl)||levenshtein(tl,myTitle)<4;});
});
if(!matches.length){
res.innerHTML=`<div class="dc-clear">✓ No duplicates found (${arr.length} checked). Safe to submit!</div>`;
subBtn.style.display=’’; subBtn.textContent=‘✝ Submit as New Hymn’;
} else {
let html=`<div class="dc-warning">⚠ Found ${matches.length} similar hymn${matches.length>1?'s':''}:</div><div class="dc-matches">`;
matches.forEach(m=>{
const t=typeof m.title===‘object’?Object.values(m.title).filter(Boolean).join(’ / ‘):m.title||’’;
const existLangs=typeof m.title===‘object’?Object.keys(m.title).filter(k=>m.title[k]).join(’, ‘):’?’;
const myLangs=LANGS.filter(l=>(h.langs[l]?.title||’’).trim()).join(’, ‘);
html+=`<div class="dc-match"> <div class="dc-match-title">${esc(t)}</div> <div class="dc-match-langs">Has: ${esc(existLangs)} · You adding: ${esc(myLangs)}</div> <button class="dc-match-select" data-id="${esc(m.id||'')}">Select to merge into this hymn →</button> </div>`;
});
html+=’</div><div class="dc-note">Or submit as a new separate hymn.</div>’;
res.innerHTML=html;
res.querySelectorAll(’.dc-match-select’).forEach(btn=>{
btn.addEventListener(‘click’,()=>{
pendingMergeTarget=matches.find(m=>m.id===btn.dataset.id)||null;
res.querySelectorAll(’.dc-match-select’).forEach(b=>{b.style.background=b===btn?‘var(–accent)’:’’;b.style.color=b===btn?’#fff’:’’;b.textContent=b===btn?‘✓ Selected’:‘Select to merge →’;});
mergeBtn.style.display=’’;
});
});
subBtn.style.display=’’; subBtn.textContent=’+ Submit as New Hymn’;
}
}catch(e){
const is401=e.message.includes(‘401’);
if(is401){sessionStorage.removeItem(VOL_TOKEN_KEY);localStorage.removeItem(GH_KEYS.token);}
res.innerHTML=`<div class="dc-error">✕ ${is401?'Token invalid (401) — close and tap Submit again to enter a new token.':esc(e.message)}</div>`;
subBtn.style.display=’’; subBtn.textContent=is401?‘Close’:‘✝ Submit Anyway’;
}
}

async function doSubmit(){
const h=pendingSubmitHymn; if(!h)return;
closeSheet(‘sheet-dupcheck’);
const path=ghPath(h.groupKey);
const exported=hymnToExport(h);
showToast(‘Submitting…’);
try{
const f=await ghGet(path);
let arr=[],sha=null;
if(f){sha=f.sha;try{arr=JSON.parse(decodeURIComponent(escape(atob(f.content.replace(/\n/g,’’)))));}catch(e){}}
const idx=arr.findIndex(x=>x.id===exported.id);
if(idx>=0)arr[idx]=exported;else arr.push(exported);
await ghPut(path,JSON.stringify(arr,null,2),sha,‘Add: ‘+getTitle(h));
if(h.subgroup===‘Mera’&&h.groupKey!==‘Mera’){
const mp=ghPath(‘Mera’);const mf=await ghGet(mp);
let ma=[],ms=null;
if(mf){ms=mf.sha;try{ma=JSON.parse(decodeURIComponent(escape(atob(mf.content.replace(/\n/g,’’)))));}catch(e){}}
const mi=ma.findIndex(x=>x.id===exported.id);
if(mi>=0)ma[mi]=exported;else ma.push(exported);
await ghPut(mp,JSON.stringify(ma,null,2),ms,’Add to Mera: ’+getTitle(h));
}
h.status=‘final’; saveStorage(); renderList();
if(activeHymn?.id===h.id)renderEditor();
document.getElementById(‘submitted-msg’).innerHTML=`<strong>${esc(getTitle(h))}</strong> added to <code>${esc(path)}</code>`;
openSheet(‘sheet-submitted’);
}catch(e){
if(e.message.includes(‘401’)){sessionStorage.removeItem(VOL_TOKEN_KEY);localStorage.removeItem(GH_KEYS.token);showToast(‘Token invalid — tap Submit again’,‘error’);}
else showToast(’Failed: ’+e.message,‘error’);
}
}

async function doMerge(){
const h=pendingSubmitHymn; const target=pendingMergeTarget;
if(!h||!target)return;
closeSheet(‘sheet-dupcheck’);
const path=ghPath(h.groupKey);
showToast(‘Merging…’);
try{
const local=hymnToExport(h);
const merged=JSON.parse(JSON.stringify(target));
if(!merged.title)merged.title={};
if(!merged.lyrics)merged.lyrics={};
if(!merged.subtitle)merged.subtitle={};
if(!merged.youtubeUrls)merged.youtubeUrls={};
if(!merged.group)merged.group={};
LANGS.forEach(l=>{
if(local.title?.[l]&&!merged.title[l])merged.title[l]=local.title[l];
if(local.lyrics?.[l]&&!merged.lyrics[l])merged.lyrics[l]=local.lyrics[l];
if(local.subtitle?.[l]&&!merged.subtitle[l])merged.subtitle[l]=local.subtitle[l];
if(local.youtubeUrls?.[l]&&!merged.youtubeUrls[l])merged.youtubeUrls[l]=local.youtubeUrls[l];
if(local.group?.[l]&&!merged.group[l])merged.group[l]=local.group[l];
});
const f=await ghGet(path); let arr=[],sha=null;
if(f){sha=f.sha;try{arr=JSON.parse(decodeURIComponent(escape(atob(f.content.replace(/\n/g,’’)))));}catch(e){}}
const idx=arr.findIndex(x=>x.id===target.id);
if(idx>=0)arr[idx]=merged;else arr.push(merged);
const addedLangs=LANGS.filter(l=>!target.title?.[l]&&merged.title?.[l]);
await ghPut(path,JSON.stringify(arr,null,2),sha,‘Merge (’+addedLangs.join(’,’)+’) into: ’+getTitle(h));
h.status=‘final’; saveStorage(); renderList();
if(activeHymn?.id===h.id)renderEditor();
document.getElementById(‘submitted-msg’).innerHTML=`Merged <strong>${esc(addedLangs.join(', '))||'languages'}</strong> into <strong>${esc(getTitle(h))}</strong>`;
openSheet(‘sheet-submitted’);
}catch(e){
if(e.message.includes(‘401’)){sessionStorage.removeItem(VOL_TOKEN_KEY);localStorage.removeItem(GH_KEYS.token);showToast(‘Token invalid — tap Submit again’,‘error’);}
else showToast(’Merge failed: ’+e.message,‘error’);
}
}

// ═══ LEVENSHTEIN ═══════════════════════════════
function levenshtein(a,b){
const m=a.length,n=b.length;
const dp=Array.from({length:m+1},(*,i)=>Array.from({length:n+1},(*,j)=>i===0?j:j===0?i:0));
for(let i=1;i<=m;i++)for(let j=1;j<=n;j++)dp[i][j]=a[i-1]===b[j-1]?dp[i-1][j-1]:1+Math.min(dp[i-1][j],dp[i][j-1],dp[i-1][j-1]);
return dp[m][n];
}

// ═══ COPY JSON ═════════════════════════════════
function copyJSON(h){
const text=JSON.stringify([hymnToExport(h)],null,2);
if(navigator.clipboard){
navigator.clipboard.writeText(text).then(()=>showToast(‘Copied ✓’,‘success’)).catch(()=>showFallbackCopy(text));
} else showFallbackCopy(text);
}
function showFallbackCopy(text){
document.getElementById(‘copy-json-textarea’).value=text;
openSheet(‘sheet-copy-json’);
}

// ═══ EXPORT ════════════════════════════════════
function downloadJSON(data,filename){
const blob=new Blob([JSON.stringify(data,null,2)],{type:‘application/json’});
const url=URL.createObjectURL(blob);
const a=document.createElement(‘a’); a.href=url; a.download=filename; a.click();
URL.revokeObjectURL(url);
}
function buildExportSheet(){
const gl=document.getElementById(‘export-group-list’); if(!gl)return;
gl.innerHTML=’’;
const used=ALL_GROUP_KEYS.filter(k=>hymns.some(h=>h.groupKey===k));
if(!used.length){gl.innerHTML=’<div style="color:rgba(255,255,255,.3);padding:8px 0;font-size:14px">No hymns yet</div>’;return;}
used.forEach(k=>{
const count=hymns.filter(h=>h.groupKey===k).length;
const btn=document.createElement(‘button’);
btn.className=‘sheet-item’;
btn.innerHTML=`${esc(groupLabel(k,'en'))} <span class="export-count">${count}</span>`;
btn.addEventListener(‘click’,()=>{
downloadJSON(hymns.filter(h=>h.groupKey===k).map(hymnToExport),k+’.json’);
closeSheet(‘sheet-export’);
showToast(’Exported ’+k,‘success’);
});
gl.appendChild(btn);
});
}

// ═══ IMPORT ════════════════════════════════════
function importFromJSON(jsonStr){
let data; try{data=JSON.parse(jsonStr);}catch(e){showToast(‘Invalid JSON’,‘error’);return;}
if(!Array.isArray(data))data=[data];
importQueue=data; importStats={added:0,replaced:0,skipped:0}; importCurrent=0;
doNextImport();
}
function importedToInternal(raw){
const h=createHymn({id:raw.id||uid()});
h.zemari=raw.singer||raw.composer||raw.author||’’;
h.color=raw.color||’’;
h.subgroup=raw.subcategory||raw.subgroup||’’;
h.groupKey=raw.category||raw.groupKey||’’;
LANGS.forEach(l=>{
const ld=h.langs[l];
ld.groupName=(raw.group&&raw.group[l])||’’;
ld.title=(raw.title&&raw.title[l])||’’;
ld.subtitle=(raw.subtitle&&raw.subtitle[l])||’’;
if(raw.youtubeUrls&&typeof raw.youtubeUrls===‘object’)ld.youtube=raw.youtubeUrls[l]||’’;
const lyrics=(raw.lyrics&&raw.lyrics[l])||’’;
if(lyrics){const p=parseLyricsToVerses(lyrics);ld.chorus=p.chorus;ld.verses=p.verses;}
});
return h;
}
function doNextImport(){
if(importCurrent>=importQueue.length){
renderList(); saveStorage();
showToast(`Done: ${importStats.added} added, ${importStats.replaced} replaced`,‘success’);
return;
}
const raw=importQueue[importCurrent];
const hymn=importedToInternal(raw);
const exist=hymns.find(h=>h.id===hymn.id);
if(!exist){hymns.push(hymn);importStats.added++;importCurrent++;doNextImport();return;}
document.getElementById(‘conflict-msg’).textContent=`"${getTitle(exist)}" already exists.`;
openSheet(‘sheet-conflict’);
}

function parseLyricsToVerses(lyrics){
const result={chorus:’’,verses:[]};
if(!lyrics)return result;
const chorusMatch=lyrics.match(/[[chorus]]([\s\S]*?)[[/chorus]]/);
if(chorusMatch)result.chorus=chorusMatch[1].trim();
const noChorus=lyrics.replace(/[[chorus]][\s\S]*?[[/chorus]]/g,’’).trim();
if(!noChorus)return result;
noChorus.split(/\n\s*\n/).forEach(block=>{
const block2=block.trim(); if(!block2)return;
const lines=block2.split(’\n’).map(rawLine=>{
rawLine=rawLine.trim();
const m=rawLine.match(/^[[highlight]]([\s\S]*?)[[/highlight]]([\s\S]*)$/);
if(m)return createLine(m[1].trimEnd(),m[2]);
return createLine(’’,rawLine);
}).filter(l=>(l.prefix||l.text||’’).trim());
if(lines.length)result.verses.push({lines});
});
return result;
}

// ═══ DELETE ════════════════════════════════════
function confirmDelete(h){
document.getElementById(‘delete-msg’).textContent=`Delete "${getTitle(h)}"?`;
openSheet(‘sheet-delete’);
}

// ═══ AUTO-ROMANIZE ═════════════════════════════
async function autoRomanize(h, srcLang, dstLang, area) {
const srcLd = h.langs[srcLang];
const srcText = buildLyricsString(srcLd);
const srcTitle = srcLd.title || ‘’;
const srcSubtitle = srcLd.subtitle || ‘’;

if (!srcTitle && !srcText) {
showToast(`Type the ${LANG_NAMES[srcLang]} version first`, ‘error’);
return;
}

const btn = area.querySelector(`.romanize-btn[data-dst="${dstLang}"]`);
if (btn) { btn.disabled = true; btn.textContent = ‘⏳ Romanizing…’; }

const langName = srcLang === ‘ti’ ? ‘Tigrinya (ትግርኛ)’ : ‘Amharic (አማርኛ)’;

const prompt = `You are an expert in Ethiopian and Eritrean Orthodox Christian liturgical texts.
Romanize the following ${langName} hymn into smooth, formal Latin script for a church hymn app.

STRICT RULES:

- DO NOT translate — only romanize (convert Ethiopic script to Latin letters)
- Keep ALL tags exactly as they appear: [[chorus]], [[/chorus]], [[highlight]], [[/highlight]]
- Keep ALL line breaks exactly as in the original
- Use consistent spelling (same word = same romanization every time)
- Use formal, smooth, readable romanization suitable for liturgical use
- Conventions: q=ቀ, H=ሐ, ts=ጸ, T=ጠ, sh=ሽ, ch=ጨ, ’=glottal stop, double vowels for long sounds

TITLE: ${srcTitle}
SUBTITLE: ${srcSubtitle}

LYRICS:
${srcText}

Respond with ONLY a JSON object in this exact format, no extra text:
{
“title”: “romanized title here”,
“subtitle”: “romanized subtitle here”,
“lyrics”: “romanized lyrics here with all tags preserved”
}`;

try {
// Get or prompt for API key
let apiKey = localStorage.getItem(‘wz_anthropic_key’) || ‘’;
if (!apiKey) {
const key = window.prompt(‘Enter your Anthropic API key:\n(Get one at console.anthropic.com → API Keys)’);
if (!key || !key.trim()) throw new Error(‘No API key — tap Romanize again to enter one’);
apiKey = key.trim();
localStorage.setItem(‘wz_anthropic_key’, apiKey);
}

```
let data, raw;
// Try direct call first (works if CORS is allowed)
// Fall back to allorigins proxy if blocked
const body = JSON.stringify({
  model: 'claude-haiku-4-5-20251001',
  max_tokens: 4000,
  messages: [{ role: 'user', content: prompt }]
});
const headers = {
  'Content-Type': 'application/json',
  'x-api-key': apiKey,
  'anthropic-version': '2023-06-01',
  'anthropic-dangerous-allow-browser': 'true'
};

// Try direct first
let response;
try {
  response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST', headers, body
  });
} catch(corsErr) {
  // CORS blocked — use allorigins proxy
  const proxyUrl = 'https://api.allorigins.win/raw?url=' + encodeURIComponent('https://api.anthropic.com/v1/messages');
  response = await fetch(proxyUrl, { method: 'POST', headers, body });
}

if (!response.ok) {
  if (response.status === 401) {
    localStorage.removeItem('wz_anthropic_key');
    throw new Error('API key invalid or expired — tap Romanize again to enter a new one');
  }
  const err = await response.json().catch(()=>({}));
  throw new Error(err.error?.message || 'API error ' + response.status);
}

data = await response.json();
raw = data.content?.[0]?.text || '';

// Parse JSON response
let parsed;
try {
  const clean = raw.replace(/```json|```/g, '').trim();
  parsed = JSON.parse(clean);
} catch(e) {
  throw new Error('Could not parse AI response');
}

// Fill in the destination lang data
const dstLd = h.langs[dstLang];
if (parsed.title)    dstLd.title    = parsed.title;
if (parsed.subtitle) dstLd.subtitle = parsed.subtitle;

// Parse the romanized lyrics back into verses/chorus
if (parsed.lyrics) {
  const p = parseLyricsToVerses(parsed.lyrics);
  dstLd.chorus = p.chorus;
  dstLd.verses = p.verses;
}

scheduleSave();

// Switch to the dst tab and re-render
renderEditor();
setTimeout(() => {
  const area2 = document.getElementById('editor-area');
  // Switch to dst lang tab
  area2.querySelectorAll('.lang-tab').forEach(t => t.classList.toggle('active', t.dataset.lang === dstLang));
  area2.querySelectorAll('.lang-panel').forEach(p => p.classList.toggle('active', p.dataset.lang === dstLang));
}, 50);

showToast('✨ Romanized successfully!', 'success');
```

} catch(e) {
showToast(’Romanize failed: ’ + e.message, ‘error’);
if (btn) { btn.disabled = false; btn.textContent = ‘✨ Romanize’; }
}
}

// ═══ INIT ══════════════════════════════════════
function init(){
loadStorage();

// Gate
document.getElementById(‘gate-submit’)?.addEventListener(‘click’,submitGate);
document.getElementById(‘gate-password’)?.addEventListener(‘keydown’,e=>{if(e.key===‘Enter’)submitGate();});

// List page
document.getElementById(‘btn-new-top’)?.addEventListener(‘click’,addNewHymn);
document.getElementById(‘btn-import-top’)?.addEventListener(‘click’,()=>document.getElementById(‘file-import-input’).click());
document.getElementById(‘btn-export-top’)?.addEventListener(‘click’,()=>{buildExportSheet();openSheet(‘sheet-export’);});
document.getElementById(‘search-input’)?.addEventListener(‘input’,renderList);
document.getElementById(‘filter-group’)?.addEventListener(‘change’,renderList);
document.getElementById(‘filter-status’)?.addEventListener(‘change’,renderList);
document.getElementById(‘file-import-input’)?.addEventListener(‘change’,function(){
const file=this.files[0]; if(!file)return;
const r=new FileReader(); r.onload=e=>{importFromJSON(e.target.result);this.value=’’;};
r.readAsText(file);
});

// Editor page
document.getElementById(‘btn-back’)?.addEventListener(‘click’,()=>{saveStorage();showPage(‘page-list’);renderList();});
document.getElementById(‘btn-submit-hymn’)?.addEventListener(‘click’,()=>{if(activeHymn)startSubmit(activeHymn);});
document.getElementById(‘btn-copy-json’)?.addEventListener(‘click’,()=>{if(activeHymn)copyJSON(activeHymn);});
document.getElementById(‘btn-delete-hymn’)?.addEventListener(‘click’,()=>{if(activeHymn)confirmDelete(activeHymn);});

// Close sheets on overlay click
document.querySelectorAll(’.sheet-overlay’).forEach(el=>el.addEventListener(‘click’,e=>{if(e.target===el)el.style.display=‘none’;}) );

// Export
document.getElementById(‘sheet-export-close’)?.addEventListener(‘click’,()=>closeSheet(‘sheet-export’));
document.getElementById(‘btn-export-all’)?.addEventListener(‘click’,()=>{
downloadJSON(hymns.map(hymnToExport),‘hymns.json’);
closeSheet(‘sheet-export’);
showToast(`Exported ${hymns.length} hymns`,‘success’);
});

// Admin
document.getElementById(‘sheet-admin-close’)?.addEventListener(‘click’,()=>closeSheet(‘sheet-admin’));
document.getElementById(‘gh-save’)?.addEventListener(‘click’,()=>{
const t=document.getElementById(‘gh-token’)?.value.trim();
if(!t){showToast(‘Paste your token first’,‘error’);return;}
saveGHConfig({token:t}); closeSheet(‘sheet-admin’); showToast(‘Token saved ✓’,‘success’);
});
document.getElementById(‘gh-test’)?.addEventListener(‘click’,testGHConnection);
document.getElementById(‘gh-init-files’)?.addEventListener(‘click’,initializeGitHubFiles);

// Anthropic API key management
const akInput = document.getElementById(‘anthropic-key-input’);
const existingKey = localStorage.getItem(‘wz_anthropic_key’) || ‘’;
if(akInput && existingKey) akInput.placeholder = ‘sk-ant-… (key saved)’;
document.getElementById(‘anthropic-key-save’)?.addEventListener(‘click’,()=>{
const k = akInput?.value.trim();
if(!k){ showToast(‘Paste your API key first’,‘error’); return; }
localStorage.setItem(‘wz_anthropic_key’, k);
akInput.value=’’; akInput.placeholder=‘sk-ant-… (key saved)’;
closeSheet(‘sheet-admin’);
showToast(‘API key saved ✓’,‘success’);
});
document.getElementById(‘anthropic-key-clear’)?.addEventListener(‘click’,()=>{
localStorage.removeItem(‘wz_anthropic_key’);
if(akInput){ akInput.value=’’; akInput.placeholder=‘sk-ant-…’; }
showToast(‘API key cleared’,‘success’);
});

// Token
document.getElementById(‘token-cancel’)?.addEventListener(‘click’,()=>{closeSheet(‘sheet-token’);pendingTokenCallback=null;});
document.getElementById(‘token-confirm’)?.addEventListener(‘click’,confirmToken);
document.getElementById(‘volunteer-token’)?.addEventListener(‘keydown’,e=>{if(e.key===‘Enter’)confirmToken();});

// Copy JSON
document.getElementById(‘copy-json-close’)?.addEventListener(‘click’,()=>closeSheet(‘sheet-copy-json’));
document.getElementById(‘copy-json-copy-btn’)?.addEventListener(‘click’,()=>{
const ta=document.getElementById(‘copy-json-textarea’); ta.select(); document.execCommand(‘copy’); showToast(‘Copied ✓’,‘success’);
});

// Dup check
document.getElementById(‘dupcheck-cancel’)?.addEventListener(‘click’,()=>closeSheet(‘sheet-dupcheck’));
document.getElementById(‘dupcheck-submit’)?.addEventListener(‘click’,doSubmit);
document.getElementById(‘dupcheck-merge’)?.addEventListener(‘click’,doMerge);

// Success
document.getElementById(‘submitted-ok’)?.addEventListener(‘click’,()=>closeSheet(‘sheet-submitted’));

// Delete
document.getElementById(‘delete-cancel’)?.addEventListener(‘click’,()=>closeSheet(‘sheet-delete’));
document.getElementById(‘delete-confirm’)?.addEventListener(‘click’,()=>{
if(activeHymn){hymns=hymns.filter(h=>h.id!==activeHymn.id);saveStorage();activeHymn=null;}
closeSheet(‘sheet-delete’); showPage(‘page-list’); renderList();
showToast(‘Hymn deleted’);
});

// Conflict
document.getElementById(‘conflict-keep’)?.addEventListener(‘click’,()=>{importStats.skipped++;importCurrent++;closeSheet(‘sheet-conflict’);doNextImport();});
document.getElementById(‘conflict-replace’)?.addEventListener(‘click’,()=>{
const hymn=importedToInternal(importQueue[importCurrent]);
hymns[hymns.findIndex(h=>h.id===hymn.id)]=hymn;
importStats.replaced++;importCurrent++;closeSheet(‘sheet-conflict’);doNextImport();
});
document.getElementById(‘conflict-copy’)?.addEventListener(‘click’,()=>{
const hymn=importedToInternal(importQueue[importCurrent]);
hymn.id=uid();hymns.push(hymn);importStats.added++;importCurrent++;
closeSheet(‘sheet-conflict’);doNextImport();
});

// Secret admin — tap title 5 times
let taps=0,tapT;
document.addEventListener(‘click’,e=>{
if(e.target.closest(’.top-title’)||e.target.closest(’.gate-title’)){
taps++;clearTimeout(tapT);tapT=setTimeout(()=>taps=0,2000);
if(taps>=5){
taps=0;
const cfg=localStorage.getItem(GH_KEYS.token)||’’;
const el=document.getElementById(‘gh-token’);
if(el)el.value=cfg;
openSheet(‘sheet-admin’);
}
}
});

// Keyboard save
document.addEventListener(‘keydown’,e=>{if((e.ctrlKey||e.metaKey)&&e.key===‘s’){e.preventDefault();saveStorage();showToast(‘Saved ✓’,‘success’);}});

checkGate();
}

document.addEventListener(‘DOMContentLoaded’, function(){
try {
init();
} catch(e) {
console.error(‘Wazema init error:’, e);
// Show the gate page even if init crashes
const gate = document.getElementById(‘page-gate’);
if(gate) gate.style.display = ‘flex’;
// Show error to help debug
const sub = document.querySelector(’.gate-sub’);
if(sub) sub.textContent = ‘Error: ’ + e.message + ’ — please reload’;
}
});