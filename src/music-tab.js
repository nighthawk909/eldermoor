/* =====================================================================
   ELDERMOOR - Music tab module (MUSIC1-7)

   Owns the "music" HUD tab via the shared tab registry hook
   (window.EMTABS['music'] = (panel, state) => {...}). Renders the track
   list from window.EMDATA.music (assets/data/music.json):
     { tracks: [ { id, name, unlockArea, locked, loop } ] }

   Behaviour:
   - Locked tracks render greyed and are not clickable.
   - Unlocked tracks are clickable → window.EMAUDIO.playZone(id) (guarded)
     and the now-playing track is highlighted green.
   - Loop / Shuffle toggles in the header (Loop seeds from the playing
     track\'s `loop` flag; Shuffle picks a random unlocked track on each
     track end is not simulated here, but the toggle state is exposed).
   - Exposes window.EMMUSIC = { play(id), unlock(id), nowPlaying() }.
     unlock(id) flips the track\'s `locked` flag, emits the chat line
     "You have unlocked a new music track." and fires the EMAUDIO.levelUp
     jingle (if available).
   - Listens for 'em-data-ready' so a late EMDATA load re-renders the tab.

   Conventions matched: ES module exporting initMusicTab(); registers via
   window.EMTABS[tab]; reads HUD state through the passed `state` object;
   self-contained scoped CSS injected once; no-ops gracefully when EMDATA /
   EMAUDIO / EMHUD / document are not yet ready. main.js wires the single
   initMusicTab() call.
   ===================================================================== */

/* -------------------------------------------------------------- HELPERS */
function emData() {
  return (typeof window !== 'undefined' && window.EMDATA) ? window.EMDATA : null;
}

/* Read the live tracks array from EMDATA, lazily (never cached). */
function tracks() {
  const d = emData();
  const m = d && d.music;
  const list = m && Array.isArray(m.tracks) ? m.tracks : [];
  return list;
}

function findTrack(id) {
  return tracks().find((t) => t && t.id === id) || null;
}

/* Guarded chat line through the HUD. */
function chat(msg) {
  if (typeof window === 'undefined') return;
  const h = window.EMHUD;
  if (h && typeof h.addChat === 'function') h.addChat(msg, '', true);
}

/* Guarded EMAUDIO accessors. */
function audio() {
  return (typeof window !== 'undefined' && window.EMAUDIO) ? window.EMAUDIO : null;
}

/* ------------------------------------------------------- PLAYBACK STATE */
/* Local source of truth for the now-playing track + toggle state. */
const playerState = {
  nowPlaying: null,   // track id currently playing, or null
  loop: true,         // Loop toggle
  shuffle: false,     // Shuffle toggle
};

/* Re-render the music tab if it is the open tab. */
function refresh() {
  if (typeof window === 'undefined') return;
  const h = window.EMHUD;
  if (h && typeof h.curTab === 'function' && h.curTab() === 'music' &&
      typeof h.refresh === 'function') {
    h.refresh();
  }
}

/* --------------------------------------------------------------- ACTIONS */
function play(id) {
  const t = findTrack(id);
  if (!t || t.locked) return false;

  const a = audio();
  if (a && typeof a.playZone === 'function') {
    try { a.playZone(id); } catch (_err) { /* no-op */ }
  }

  playerState.nowPlaying = id;
  if (typeof t.loop === 'boolean') playerState.loop = t.loop;
  publish();
  refresh();
  return true;
}

function unlock(id) {
  const t = findTrack(id);
  if (!t) return false;
  if (!t.locked) return false; // already unlocked - no jingle/chat spam

  t.locked = false; // flip the flag on the live data record
  chat('You have unlocked a new music track.');

  const a = audio();
  if (a && typeof a.levelUp === 'function') {
    try { a.levelUp(); } catch (_err) { /* no-op */ }
  }

  publish();
  refresh();
  return true;
}

function nowPlaying() {
  return playerState.nowPlaying;
}

/* ----------------------------------------------------- PUBLIC API PUBLISH */
function publish() {
  if (typeof window === 'undefined') return;
  window.EMMUSIC = window.EMMUSIC || {};
  window.EMMUSIC.play = play;
  window.EMMUSIC.unlock = unlock;
  window.EMMUSIC.nowPlaying = nowPlaying;
}

/* ------------------------------------------------------------ RENDER */
function renderList(host /*, state */) {
  if (!host) return;
  host.innerHTML = '';

  const list = tracks();

  // Header with Loop / Shuffle toggles.
  const head = document.createElement('div');
  head.className = 'emmu-head';

  const title = document.createElement('span');
  title.className = 'emmu-title';
  title.textContent = 'Jukebox';
  head.appendChild(title);

  const toggles = document.createElement('div');
  toggles.className = 'emmu-toggles';

  const loopBtn = document.createElement('button');
  loopBtn.type = 'button';
  loopBtn.className = 'emmu-tog' + (playerState.loop ? ' emmu-tog-on' : '');
  loopBtn.textContent = 'Loop';
  loopBtn.setAttribute('aria-pressed', playerState.loop ? 'true' : 'false');
  loopBtn.addEventListener('click', () => {
    playerState.loop = !playerState.loop;
    renderList(host);
  });

  const shufBtn = document.createElement('button');
  shufBtn.type = 'button';
  shufBtn.className = 'emmu-tog' + (playerState.shuffle ? ' emmu-tog-on' : '');
  shufBtn.textContent = 'Shuffle';
  shufBtn.setAttribute('aria-pressed', playerState.shuffle ? 'true' : 'false');
  shufBtn.addEventListener('click', () => {
    playerState.shuffle = !playerState.shuffle;
    renderList(host);
  });

  toggles.appendChild(loopBtn);
  toggles.appendChild(shufBtn);
  head.appendChild(toggles);
  host.appendChild(head);

  if (!list.length) {
    const empty = document.createElement('div');
    empty.className = 'emmu-empty';
    empty.textContent = 'No tracks available yet.';
    host.appendChild(empty);
    return;
  }

  const ul = document.createElement('div');
  ul.className = 'emmu-list';
  host.appendChild(ul);

  list.forEach((t) => {
    if (!t || !t.id) return;
    const locked = !!t.locked;
    const playing = playerState.nowPlaying === t.id;

    const row = document.createElement('button');
    row.type = 'button';
    row.className = 'emmu-row' +
      (locked ? ' emmu-row-locked' : '') +
      (playing ? ' emmu-row-playing' : '');
    row.setAttribute('aria-disabled', locked ? 'true' : 'false');
    row.setAttribute('aria-pressed', playing ? 'true' : 'false');

    const dot = playing ? '▶' : (locked ? '🔒' : '♪');
    row.innerHTML =
      `<span class="emmu-dot">${dot}</span>` +
      `<span class="emmu-name">${t.name || t.id}</span>` +
      (locked ? '<span class="emmu-lock">Locked</span>' : '');

    if (locked) {
      row.disabled = true;
    } else {
      row.addEventListener('click', () => { play(t.id); });
    }

    ul.appendChild(row);
  });
}

/* --------------------------------------------------------------- CSS */
const STYLE_ID = 'emmu-style';
function injectStyle() {
  if (typeof document === 'undefined') return;
  if (document.getElementById(STYLE_ID)) return;
  const css = `
  #empanel .emmu-head{display:flex;align-items:center;justify-content:space-between;
    margin:0 0 8px;gap:8px;}
  #empanel .emmu-title{font:600 12px/1.4 system-ui,sans-serif;color:#d8c9a8;
    letter-spacing:.02em;}
  #empanel .emmu-toggles{display:flex;gap:4px;}
  #empanel .emmu-tog{font:600 10px/1 system-ui,sans-serif;color:#cdbf9d;
    padding:4px 8px;border:1px solid #3a2f22;border-radius:5px;background:#241c12;
    cursor:pointer;transition:background .08s,border-color .08s,color .08s;}
  #empanel .emmu-tog:hover{background:#322715;border-color:#6b5836;}
  #empanel .emmu-tog-on{background:#3d5a2a;border-color:#8fc25a;color:#eaf6d6;
    box-shadow:0 0 0 1px #8fc25a inset;}
  #empanel .emmu-tog-on:hover{background:#456631;}
  #empanel .emmu-list{display:flex;flex-direction:column;gap:4px;}
  #empanel .emmu-row{display:flex;align-items:center;gap:8px;width:100%;
    padding:7px 9px;border:1px solid #3a2f22;border-radius:6px;background:#241c12;
    color:#e8dcc2;font:500 11px/1.2 system-ui,sans-serif;text-align:left;
    cursor:pointer;transition:background .08s,border-color .08s,box-shadow .08s;}
  #empanel .emmu-row:hover{background:#322715;border-color:#6b5836;}
  #empanel .emmu-dot{width:16px;text-align:center;flex:0 0 auto;opacity:.85;}
  #empanel .emmu-name{flex:1 1 auto;overflow:hidden;text-overflow:ellipsis;
    white-space:nowrap;}
  #empanel .emmu-lock{font-size:9px;color:#c98;opacity:.85;flex:0 0 auto;}
  #empanel .emmu-row-playing{background:#3d5a2a;border-color:#8fc25a;
    box-shadow:0 0 0 1px #8fc25a inset,0 0 6px rgba(143,194,90,.35);}
  #empanel .emmu-row-playing:hover{background:#456631;}
  #empanel .emmu-row-locked{cursor:default;opacity:.45;filter:grayscale(1);
    background:#1c1710;border-color:#2c241a;}
  #empanel .emmu-row-locked:hover{background:#1c1710;border-color:#2c241a;}
  #empanel .emmu-empty{font:500 11px/1.4 system-ui,sans-serif;color:#9b8f76;
    opacity:.8;}
  `;
  const el = document.createElement('style');
  el.id = STYLE_ID;
  el.textContent = css;
  document.head.appendChild(el);
}

/* ---------------------------------------------------- INIT / REGISTER */
export function initMusicTab() {
  if (typeof window === 'undefined') return null;

  injectStyle();
  publish(); // seed window.EMMUSIC before any render

  window.EMTABS = window.EMTABS || {};
  window.EMTABS['music'] = (panel, state) => {
    if (!panel) return;
    panel.innerHTML = '<h4>Music</h4><div class="emmu-host"></div>';
    renderList(panel.querySelector('.emmu-host'), state);
  };

  // EMDATA may arrive after init - re-render the tab when it signals ready.
  if (typeof window.addEventListener === 'function') {
    window.addEventListener('em-data-ready', refresh);
  }

  return window.EMTABS['music'];
}

export default initMusicTab;
