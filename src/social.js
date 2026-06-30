/* =====================================================================
   ELDERMOOR - Social module (FR/IGN/ACCT). Owns THREE in-game interface
   tabs via the HUD tab registry hook:

       window.EMTABS['friends'] = (panel, state) => { ... }
       window.EMTABS['ignore']  = (panel, state) => { ... }
       window.EMTABS['account'] = (panel, state) => { ... }

   Friends:  a persisted list (localStorage 'eldermoor:friends') with an
             "Add friend" input + per-row Delete, plus a stub online/offline
             status pip beside each name.
   Ignore:   a persisted list (localStorage 'eldermoor:ignore') with an
             "Add name" input + per-row Delete. Adding a name that is already
             a friend is blocked (you can\'t ignore a friend).
   Account:  a menu of account-management entries (Set Bank PIN, Recovery
             questions, Authenticator, Display name). Selecting one shows a
             stub panel with Eldermoor-original security copy. No real auth.

   Persistence: window.EMSOCIAL is a small facade created on window here,
   backed by localStorage. Reads/writes are defensive so a corrupt/blocked
   store never throws.

   Exposes (global, for other modules / console):
       window.EMSOCIAL = {
         friends(),            // -> string[]  (snapshot)
         ignore(),             // -> string[]  (snapshot)
         addFriend(name),      // -> bool  (false if invalid/dupe)
         addIgnore(name),      // -> bool  (false if invalid/dupe/is-friend)
       }

   Exposes (ESM, wired by main.js):
       export function initSocial()   // call once from main.js

   Graceful no-op: nothing here throws if optional globals (EMHUD, EMTABS,
   localStorage, document) are missing. No other files are edited.
   ===================================================================== */

const FRIENDS_KEY = 'eldermoor:friends';
const IGNORE_KEY  = 'eldermoor:ignore';

const MAX_LIST = 200;     // generous cap to keep the store sane
const MAX_NAME = 16;      // OSRS-era display-name length ceiling

/* --------------------------------------------------------- name handling */
// Normalize a raw input to a stored display name, or '' if unusable.
// Collapses internal whitespace, trims, caps length. Names are compared
// case-insensitively (canonical form) for de-dupe / friend checks.
function cleanName(raw){
  if(raw == null) return '';
  let s = String(raw).replace(/\s+/g, ' ').trim();
  if(!s) return '';
  if(s.length > MAX_NAME) s = s.slice(0, MAX_NAME);
  return s;
}
function canon(name){ return cleanName(name).toLowerCase(); }
function listHas(list, name){
  const c = canon(name);
  return c !== '' && list.some(n => canon(n) === c);
}

/* ----------------------------------------------- EMSOCIAL persistence
   Two string lists mirrored to localStorage. All mutations are immutable
   (new arrays, never spliced in place) so callers can hold snapshots
   safely. After any change we emit an 'em-social-changed' event so an open
   tab can re-render. */
function buildStore(){
  if(typeof window === 'undefined') return null;
  if(window.EMSOCIAL && typeof window.EMSOCIAL.friends === 'function'){
    return window.EMSOCIAL;                       // idempotent
  }

  let friendsList = loadRaw(FRIENDS_KEY);
  let ignoreList  = loadRaw(IGNORE_KEY);

  function loadRaw(key){
    try {
      const raw = window.localStorage && window.localStorage.getItem(key);
      if(!raw) return [];
      const arr = JSON.parse(raw);
      if(!Array.isArray(arr)) return [];
      // sanitize on load: clean, drop empties, de-dupe (first wins), cap.
      const out = [];
      for(const item of arr){
        const n = cleanName(item);
        if(n && !out.some(x => canon(x) === canon(n))) out.push(n);
        if(out.length >= MAX_LIST) break;
      }
      return out;
    } catch(_){ return []; }                       // private mode / quota / bad JSON
  }
  function persist(key, arr){
    try {
      if(window.localStorage) window.localStorage.setItem(key, JSON.stringify(arr));
    } catch(_){ /* storage unavailable - keep in-memory only */ }
  }
  function emit(){
    try { window.dispatchEvent(new CustomEvent('em-social-changed')); }
    catch(_){ /* CustomEvent unavailable - tabs just re-render on next open */ }
  }

  const api = {
    friends(){ return friendsList.slice(); },     // snapshot copy
    ignore(){  return ignoreList.slice();  },

    // Add to friends. Returns false if blank, too-long-empty, dupe, or full.
    addFriend(name){
      const n = cleanName(name);
      if(!n) return false;
      if(listHas(friendsList, n)) return false;
      if(friendsList.length >= MAX_LIST) return false;
      friendsList = [...friendsList, n];           // immutable
      persist(FRIENDS_KEY, friendsList);
      emit();
      return true;
    },
    // Remove a friend by (canonical) name. Returns true if something left.
    removeFriend(name){
      const c = canon(name);
      const next = friendsList.filter(x => canon(x) !== c);
      if(next.length === friendsList.length) return false;
      friendsList = next;
      persist(FRIENDS_KEY, friendsList);
      emit();
      return true;
    },

    // Add to ignore. Blocked if the name is already a friend (can\'t ignore
    // someone on your friends list). Returns false on blank/dupe/friend/full.
    addIgnore(name){
      const n = cleanName(name);
      if(!n) return false;
      if(listHas(ignoreList, n)) return false;
      if(listHas(friendsList, n)) return false;    // friend takes precedence
      if(ignoreList.length >= MAX_LIST) return false;
      ignoreList = [...ignoreList, n];             // immutable
      persist(IGNORE_KEY, ignoreList);
      emit();
      return true;
    },
    removeIgnore(name){
      const c = canon(name);
      const next = ignoreList.filter(x => canon(x) !== c);
      if(next.length === ignoreList.length) return false;
      ignoreList = next;
      persist(IGNORE_KEY, ignoreList);
      emit();
      return true;
    },

    // True if a name is on the ignore list (handy for chat filtering later).
    isIgnored(name){ return listHas(ignoreList, name); },
  };

  window.EMSOCIAL = api;
  return api;
}

/* ----------------------------------------------------- stub online status
   No netcode yet, so presence is deterministic-from-name pseudo state:
   stable per session, varied across names, so the UI reads as "live"
   without lying about a backend. */
function stubOnline(name){
  const c = canon(name);
  let h = 0;
  for(let i = 0; i < c.length; i++){ h = (h * 31 + c.charCodeAt(i)) & 0xffff; }
  return (h % 3) !== 0;   // ~2/3 online - purely cosmetic until real presence
}

function emLog(text){
  try {
    if(typeof window !== 'undefined' && window.EMHUD && typeof window.EMHUD.addChat === 'function'){
      window.EMHUD.addChat(text, '', true);
    }
  } catch(_){ /* HUD optional */ }
}

/* ------------------------------------------------- account-management data
   Eldermoor-original security copy - deliberately NOT mirroring any real
   provider\'s wording. Each entry renders a stub panel; nothing is stored. */
const ACCOUNT_ENTRIES = [
  {
    id: 'pin',
    label: 'Set Bank PIN',
    blurb: 'A four-rune Bank PIN seals your vault in Eldermoor.',
    body: 'Choose four runes only you would know. The PIN is asked whenever you '
        + 'open your bank, so a thief who steals your password still cannot empty '
        + 'your coffers. Never share your PIN with another adventurer, and never '
        + 'enter it for anyone who claims to be a Moderator - we will never ask.',
  },
  {
    id: 'recovery',
    label: 'Recovery questions',
    blurb: 'Three questions to reclaim a lost account.',
    body: 'Set three recovery questions with answers that are memorable to you and '
        + 'guessable by no one. Avoid answers a guildmate could know. These let the '
        + 'Wardens of Eldermoor return your account to you if your password is ever '
        + 'lost or taken.',
  },
  {
    id: 'auth',
    label: 'Authenticator',
    blurb: 'A rolling rune-code for a second lock on the gate.',
    body: 'Bind an authenticator to generate a fresh six-figure rune-code every '
        + 'minute. With it enabled, knowing your password is not enough to enter - '
        + 'an intruder would also need the code from your own device. This is the '
        + 'single strongest ward you can place on your account.',
  },
  {
    id: 'name',
    label: 'Display name',
    blurb: 'The name other adventurers see in Eldermoor.',
    body: 'Your display name is how the realm knows you in chat, on the friends '
        + 'list, and on the leaderboards. You may change it occasionally. It is '
        + 'kept separate from your login, so changing it never weakens your '
        + 'account security.',
  },
];

/* ----------------------------------------------------------------- CSS */
function injectCss(){
  if(typeof document === 'undefined') return;
  if(document.getElementById('emsoc-style')) return;
  const css = `
  .emsoc{font-family:"Trebuchet MS",sans-serif;color:#f3e9cf;}
  .emsoc h4{margin:0 0 8px;color:#e7c64f;font-size:14px;letter-spacing:.04em;
    text-shadow:0 1px 2px #000;}
  .emsoc-add{display:flex;gap:6px;margin-bottom:10px;}
  .emsoc-add input{flex:1 1 auto;min-width:0;background:#272019;color:#f3e9cf;
    border:1px solid #4a3a26;border-radius:5px;padding:6px 8px;font-size:12px;
    font-family:inherit;}
  .emsoc-add input:focus{outline:none;border-color:#e7c64f;}
  .emsoc-btn{flex:0 0 auto;cursor:pointer;background:linear-gradient(#5a4a2a,#3a2e1f);
    color:#f3e9cf;border:1px solid #8a6f3a;border-radius:5px;padding:6px 11px;
    font-size:11px;font-weight:bold;letter-spacing:.03em;font-family:inherit;
    user-select:none;}
  .emsoc-btn:hover{border-color:#e7c64f;color:#fff;}
  .emsoc-list{display:flex;flex-direction:column;gap:5px;}
  .emsoc-row{display:flex;align-items:center;gap:9px;background:rgba(33,29,24,.55);
    border:1px solid #3a2e1f;border-radius:6px;padding:6px 9px;}
  .emsoc-pip{flex:0 0 auto;width:9px;height:9px;border-radius:50%;
    box-shadow:0 0 4px #0006 inset;}
  .emsoc-pip.on{background:#5fbf4a;box-shadow:0 0 5px #5fbf4a99;}
  .emsoc-pip.off{background:#7a6a52;}
  .emsoc-name{flex:1 1 auto;font-size:12px;color:#e3d6b8;overflow:hidden;
    text-overflow:ellipsis;white-space:nowrap;}
  .emsoc-status{flex:0 0 auto;font-size:10px;color:#bdac86;letter-spacing:.03em;}
  .emsoc-del{flex:0 0 auto;cursor:pointer;background:#2b2620;color:#cdbf9c;
    border:1px solid #5a2a2a;border-radius:4px;padding:3px 8px;font-size:10px;
    font-weight:bold;font-family:inherit;user-select:none;}
  .emsoc-del:hover{background:#5a2424;border-color:#b04848;color:#fff;}
  .emsoc-empty{font-size:12px;color:#bdac86;padding:10px 4px;line-height:1.5;}
  /* account menu */
  .emsoc-menu{display:flex;flex-direction:column;gap:6px;}
  .emsoc-mrow{cursor:pointer;background:linear-gradient(#332a1d,#272019);
    border:1px solid #4a3a26;border-radius:6px;padding:9px 11px;user-select:none;}
  .emsoc-mrow:hover{border-color:#8a6f3a;}
  .emsoc-mrow .mt{font-size:12px;font-weight:bold;color:#f3e9cf;}
  .emsoc-mrow .mb{font-size:10px;color:#bdac86;margin-top:2px;line-height:1.3;}
  .emsoc-panel{background:rgba(33,29,24,.55);border:1px solid #3a2e1f;
    border-radius:6px;padding:11px;}
  .emsoc-panel .pt{font-size:13px;font-weight:bold;color:#e7c64f;margin-bottom:6px;}
  .emsoc-panel .pb{font-size:11.5px;color:#e3d6b8;line-height:1.55;}
  .emsoc-panel .stub{margin-top:9px;font-size:10px;color:#9c8e6e;font-style:italic;}
  .emsoc-back{margin-top:11px;}
  `;
  const st = document.createElement('style');
  st.id = 'emsoc-style';
  st.textContent = css;
  document.head.appendChild(st);
}

/* ------------------------------------------------------- list-tab render
   A shared renderer for the friends + ignore tabs; the two differ only in
   labels, the backing list, and the add/remove handlers passed in. */
function renderListTab(panel, cfg){
  panel.innerHTML = '';
  panel.classList.add('emsoc');

  const title = document.createElement('h4');
  title.textContent = cfg.title;
  panel.appendChild(title);

  // ---- add row ----
  const addWrap = document.createElement('div');
  addWrap.className = 'emsoc-add';
  const input = document.createElement('input');
  input.type = 'text';
  input.placeholder = cfg.placeholder;
  input.maxLength = MAX_NAME;
  const addBtn = document.createElement('button');
  addBtn.className = 'emsoc-btn';
  addBtn.textContent = 'Add';
  addWrap.appendChild(input);
  addWrap.appendChild(addBtn);
  panel.appendChild(addWrap);

  function submit(){
    const n = cleanName(input.value);
    if(!n){ input.value = ''; return; }
    const ok = cfg.add(n);
    input.value = '';
    input.focus();
    if(ok){ emLog(cfg.addedMsg(n)); }
    else  { emLog(cfg.rejectMsg(n)); }
    renderListTab(panel, cfg);            // reflect new state
  }
  addBtn.addEventListener('click', submit);
  input.addEventListener('keydown', (e) => { if(e.key === 'Enter') submit(); });

  // ---- list ----
  const list = document.createElement('div');
  list.className = 'emsoc-list';
  const names = cfg.get();
  if(!names.length){
    const empty = document.createElement('div');
    empty.className = 'emsoc-empty';
    empty.textContent = cfg.emptyMsg;
    list.appendChild(empty);
  } else {
    for(const name of names){
      list.appendChild(buildListRow(panel, cfg, name));
    }
  }
  panel.appendChild(list);
}

function buildListRow(panel, cfg, name){
  const row = document.createElement('div');
  row.className = 'emsoc-row';

  if(cfg.showStatus){
    const online = stubOnline(name);
    const pip = document.createElement('span');
    pip.className = 'emsoc-pip ' + (online ? 'on' : 'off');
    row.appendChild(pip);
  }

  const nm = document.createElement('span');
  nm.className = 'emsoc-name';
  nm.textContent = name;
  nm.title = name;
  row.appendChild(nm);

  if(cfg.showStatus){
    const st = document.createElement('span');
    st.className = 'emsoc-status';
    st.textContent = stubOnline(name) ? 'Online' : 'Offline';
    row.appendChild(st);
  }

  const del = document.createElement('button');
  del.className = 'emsoc-del';
  del.textContent = 'Delete';
  del.addEventListener('click', () => {
    cfg.remove(name);
    emLog(cfg.removedMsg(name));
    renderListTab(panel, cfg);
  });
  row.appendChild(del);

  return row;
}

/* --------------------------------------------------------- account render
   A menu of management entries; selecting one swaps to a stub detail panel
   with a Back button. Selection is per-panel so reopening the tab returns
   to the menu. */
const accountSelByPanel = new WeakMap();

function renderAccountTab(panel){
  panel.innerHTML = '';
  panel.classList.add('emsoc');

  const title = document.createElement('h4');
  title.textContent = 'Account Management';
  panel.appendChild(title);

  const selId = accountSelByPanel.get(panel);
  const entry = ACCOUNT_ENTRIES.find(e => e.id === selId);

  if(!entry){
    // ---- menu view ----
    const menu = document.createElement('div');
    menu.className = 'emsoc-menu';
    for(const e of ACCOUNT_ENTRIES){
      const row = document.createElement('div');
      row.className = 'emsoc-mrow';
      const t = document.createElement('div'); t.className = 'mt'; t.textContent = e.label;
      const b = document.createElement('div'); b.className = 'mb'; b.textContent = e.blurb;
      row.appendChild(t); row.appendChild(b);
      row.addEventListener('click', () => {
        accountSelByPanel.set(panel, e.id);
        renderAccountTab(panel);
      });
      menu.appendChild(row);
    }
    panel.appendChild(menu);
    return;
  }

  // ---- detail (stub) view ----
  const card = document.createElement('div');
  card.className = 'emsoc-panel';
  const pt = document.createElement('div'); pt.className = 'pt'; pt.textContent = entry.label;
  const pb = document.createElement('div'); pb.className = 'pb'; pb.textContent = entry.body;
  const stub = document.createElement('div');
  stub.className = 'stub';
  stub.textContent = 'This panel is a stub - no account data is changed yet.';
  card.appendChild(pt); card.appendChild(pb); card.appendChild(stub);
  panel.appendChild(card);

  const back = document.createElement('div');
  back.className = 'emsoc-back';
  const backBtn = document.createElement('button');
  backBtn.className = 'emsoc-btn';
  backBtn.textContent = '‹ Back';
  backBtn.addEventListener('click', () => {
    accountSelByPanel.delete(panel);
    renderAccountTab(panel);
  });
  back.appendChild(backBtn);
  panel.appendChild(back);
}

/* --------------------------------------------------------- tab configs */
function friendsCfg(store){
  return {
    title: 'Friends List',
    placeholder: 'Add friend',
    showStatus: true,
    emptyMsg: 'Your friends list is empty. Add an adventurer above to see when they are online.',
    get:    () => store.friends(),
    add:    (n) => store.addFriend(n),
    remove: (n) => store.removeFriend(n),
    addedMsg:   (n) => n + ' added to your friends list.',
    rejectMsg:  (n) => n + ' is already on your friends list.',
    removedMsg: (n) => n + ' removed from your friends list.',
  };
}
function ignoreCfg(store){
  return {
    title: 'Ignore List',
    placeholder: 'Add name to ignore',
    showStatus: false,
    emptyMsg: 'Your ignore list is empty. Add a name above to mute that adventurer.',
    get:    () => store.ignore(),
    add:    (n) => store.addIgnore(n),
    remove: (n) => store.removeIgnore(n),
    addedMsg:   (n) => n + ' added to your ignore list.',
    // reject covers both "already ignored" and "is a friend" - message
    // distinguishes the friend case since that block can surprise the user.
    rejectMsg:  (n) => store.isIgnored(n)
                         ? (n + ' is already on your ignore list.')
                         : ('You cannot ignore ' + n + ' - remove them from your friends list first.'),
    removedMsg: (n) => n + ' removed from your ignore list.',
  };
}

/* ----------------------------------------------------------- public init */
export function initSocial(){
  if(typeof window === 'undefined') return null;
  injectCss();

  const store = buildStore();

  /* ---------------------------------------------- TAB REGISTRY HOOKS (EMTABS) */
  window.EMTABS = window.EMTABS || {};
  window.EMTABS['friends'] = (panel /*, state */) => {
    if(panel) renderListTab(panel, friendsCfg(store));
  };
  window.EMTABS['ignore'] = (panel /*, state */) => {
    if(panel) renderListTab(panel, ignoreCfg(store));
  };
  window.EMTABS['account'] = (panel /*, state */) => {
    if(panel) renderAccountTab(panel);
  };

  // If the store changes from elsewhere (console API, future netcode), refresh
  // an open social tab so the list stays live.
  function onChanged(){
    try {
      if(window.EMHUD && typeof window.EMHUD.curTab === 'function' &&
         typeof window.EMHUD.refresh === 'function'){
        const t = window.EMHUD.curTab();
        if(t === 'friends' || t === 'ignore') window.EMHUD.refresh();
      }
    } catch(_){ /* HUD optional */ }
  }
  window.addEventListener('em-social-changed', onChanged);

  emLog('Social lists ready.');

  return {
    renderFriends: (panel) => renderListTab(panel, friendsCfg(store)),
    renderIgnore:  (panel) => renderListTab(panel, ignoreCfg(store)),
    renderAccount: (panel) => renderAccountTab(panel),
    store,
  };
}
