/* =====================================================================
   ELDERMOOR - Login / landing module (AUTH-LOGIN).

   Owns the real title/login screen: a full-screen overlay shown before
   play begins, with a name field (or a saved profile pick), an "Enter
   Eldermoor" button, and graceful handling of new vs. returning players.

   Profile persistence (separate from character-creation's appearance
   save in charcreate.js, which still gates new-vs-returning for the
   in-world look):

       localStorage['eldermoor:profile']  -> { name, createdAt, lastSeen }
       localStorage['eldermoor:session']  -> '1' while "logged in"

   On boot:
     - If a session flag is already set (page reload mid-play, or a
       fresh tab opened with a still-active session), the overlay is
       skipped entirely so play resumes uninterrupted.
     - Otherwise the login overlay is shown. A saved profile offers
       "Continue as <name>"; there is always a fresh-name path too.
     - On submit: persist the profile + session flag, mirror the name
       onto window.EMNAME (charcreate.js / HUD read this), dispatch
       'em-login', remove the overlay. charcreate.js\'s own first-load
       gate (it checks its OWN saved appearance) then decides whether
       new players land in character creation or returning players
       skip straight into the world - that behaviour is untouched here.

   Exposes:
       window.EMLOGIN = { show(), hide(), isLoggedIn(), getProfile() }
       export function initLogin()   // called once from main.js

   Conventions:
   - Self-contained scoped CSS injected once via <style id="em-login-css">.
   - No-ops gracefully when document / window globals are absent.
   - Node --check clean: no top-level await, no bare ESM imports.
   ===================================================================== */

const PROFILE_KEY = 'eldermoor:profile';
const SESSION_KEY = 'eldermoor:session';
const STYLE_ID    = 'em-login-css';
const ROOT_ID     = 'em-login';

const NAME_MIN = 2, NAME_MAX = 12;

/* ------------------------------------------------------- name validation
   Mirrors charcreate.js's display-name rule so a chosen login name is
   always acceptable later in character creation too. */
function validateName(raw){
  const collapsed = String(raw == null ? '' : raw).replace(/\s+/g, ' ').trim();
  if(!collapsed)                          return { ok:false, value:'', error:'Enter a name.' };
  if(collapsed.length < NAME_MIN)         return { ok:false, value:collapsed, error:'At least ' + NAME_MIN + ' characters.' };
  if(collapsed.length > NAME_MAX)         return { ok:false, value:collapsed, error:'Max ' + NAME_MAX + ' characters.' };
  if(!/^[A-Za-z0-9 ]+$/.test(collapsed))  return { ok:false, value:collapsed, error:'Letters, numbers and spaces only.' };
  return { ok:true, value:collapsed, error:'' };
}

/* --------------------------------------------------------- persistence */
function readProfile(){
  try {
    if(typeof localStorage === 'undefined') return null;
    const raw = localStorage.getItem(PROFILE_KEY);
    if(!raw) return null;
    const obj = JSON.parse(raw);
    if(obj && typeof obj.name === 'string' && obj.name) return obj;
    return null;
  } catch(e){ return null; }
}

function writeProfile(name){
  const profile = { name: name, createdAt: Date.now(), lastSeen: Date.now() };
  try {
    if(typeof localStorage !== 'undefined') localStorage.setItem(PROFILE_KEY, JSON.stringify(profile));
  } catch(e){ /* storage blocked - non-fatal, profile just won't persist across reloads */ }
  return profile;
}

function touchProfile(profile){
  if(!profile) return;
  try {
    if(typeof localStorage !== 'undefined'){
      localStorage.setItem(PROFILE_KEY, JSON.stringify(Object.assign({}, profile, { lastSeen: Date.now() })));
    }
  } catch(e){ /* ignore */ }
}

function setSession(active){
  try {
    if(typeof localStorage === 'undefined') return;
    if(active) localStorage.setItem(SESSION_KEY, '1');
    else localStorage.removeItem(SESSION_KEY);
  } catch(e){ /* ignore */ }
}

function hasSession(){
  try {
    return (typeof localStorage !== 'undefined') && localStorage.getItem(SESSION_KEY) === '1';
  } catch(e){ return false; }
}

/* --------------------------------------------------------- CSS inject */
function injectCSS(){
  if(typeof document === 'undefined') return;
  if(document.getElementById(STYLE_ID)) return;
  const st = document.createElement('style');
  st.id = STYLE_ID;
  st.textContent = `
#${ROOT_ID}{
  position:fixed; inset:0; z-index:100001;
  display:flex; align-items:center; justify-content:center;
  background:radial-gradient(circle at 50% 30%, #2b2316 0%, #15110a 70%, #0b0805 100%);
  font-family:'Trebuchet MS','Segoe UI',sans-serif; color:#efe3c8;
  -webkit-user-select:none; user-select:none;
  animation: em-login-fadein 0.25s ease;
}
@keyframes em-login-fadein { from{opacity:0;} to{opacity:1;} }
#${ROOT_ID} *{ box-sizing:border-box; }
#${ROOT_ID} .em-lg-panel{
  width:min(420px, 92vw); max-height:92vh; overflow:auto;
  background:linear-gradient(#3b2f1c,#2a2112);
  border:3px solid #6b5326; border-radius:10px;
  box-shadow:0 10px 40px rgba(0,0,0,.6), inset 0 0 0 1px #0006;
  padding:22px 24px 20px; text-align:center;
}
#${ROOT_ID} .em-lg-logo{
  font-family:'Cinzel','Palatino Linotype',Georgia,serif;
  font-size:clamp(26px, 5vw, 42px); font-weight:700;
  color:#e8c96a; text-shadow:0 0 24px rgba(232,201,106,.5), 2px 2px 0 #3a2e14, -1px -1px 0 #1a1206;
  letter-spacing:.1em; text-transform:uppercase; margin:0 0 4px;
}
#${ROOT_ID} .em-lg-tag{
  font-size:11px; color:#b8a86a; letter-spacing:.16em; text-transform:uppercase;
  opacity:.85; margin:0 0 18px;
}
#${ROOT_ID} .em-lg-saved{
  display:flex; align-items:center; gap:10px; text-align:left;
  background:#0003; border:1px solid #00000040; border-radius:7px;
  padding:10px 12px; margin:0 0 12px;
}
#${ROOT_ID} .em-lg-saved-name{ flex:1 1 auto; font-size:15px; color:#fff; min-width:0; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; }
#${ROOT_ID} .em-lg-saved-lbl{ font-size:10px; color:#9a8c6c; letter-spacing:.04em; text-transform:uppercase; display:block; margin-bottom:2px; }
#${ROOT_ID} .em-lg-continue{
  cursor:pointer; border:2px solid #2e7d32; background:linear-gradient(#3e9b43,#2c6e30);
  color:#fff; font-weight:bold; font-size:13px; border-radius:6px; padding:8px 14px;
  text-shadow:1px 1px 0 #0008; white-space:nowrap;
}
#${ROOT_ID} .em-lg-continue:hover{ background:linear-gradient(#46ad4b,#327a37); }
#${ROOT_ID} .em-lg-continue:active{ transform:translateY(1px); }
#${ROOT_ID} .em-lg-or{
  font-size:11px; color:#9a8c6c; letter-spacing:.08em; text-transform:uppercase;
  margin:4px 0 12px; position:relative;
}
#${ROOT_ID} .em-lg-name{
  width:100%; margin:2px 0 6px; padding:11px 12px; font-size:16px;
  color:#fff; background:#1c160c; border:2px solid #6b5326; border-radius:6px;
  font-family:inherit; min-height:44px; text-align:center;
}
#${ROOT_ID} .em-lg-name:focus{ outline:none; border-color:#f4d27a; }
#${ROOT_ID} .em-lg-name.em-bad{ border-color:#c0473a; }
#${ROOT_ID} .em-lg-err{
  min-height:15px; margin:-2px 0 8px; font-size:12px; color:#e88;
}
#${ROOT_ID} .em-lg-enter{
  display:block; width:100%; margin-top:6px;
  cursor:pointer; border:2px solid #2e7d32;
  background:linear-gradient(#3e9b43,#2c6e30); color:#fff;
  font-weight:bold; font-size:16px; letter-spacing:.5px;
  border-radius:7px; padding:12px; text-shadow:1px 1px 0 #0008;
}
#${ROOT_ID} .em-lg-enter:hover{ background:linear-gradient(#46ad4b,#327a37); }
#${ROOT_ID} .em-lg-enter:active{ transform:translateY(1px); }
#${ROOT_ID} .em-lg-foot{
  margin-top:14px; font-size:11px; color:#9a8c6c; letter-spacing:.04em;
}
  `;
  document.head.appendChild(st);
}

/* ------------------------------------------------------------ builder */
function buildOverlay(onEnter){
  const root = document.createElement('div');
  root.id = ROOT_ID;

  const panel = document.createElement('div');
  panel.className = 'em-lg-panel';

  const logo = document.createElement('div');
  logo.className = 'em-lg-logo';
  logo.textContent = 'Eldermoor';

  const tag = document.createElement('div');
  tag.className = 'em-lg-tag';
  tag.textContent = 'Sign in to play';

  panel.appendChild(logo);
  panel.appendChild(tag);

  const saved = readProfile();
  if(saved && saved.name){
    const row = document.createElement('div');
    row.className = 'em-lg-saved';

    const info = document.createElement('div');
    info.className = 'em-lg-saved-name';
    const lbl = document.createElement('span');
    lbl.className = 'em-lg-saved-lbl';
    lbl.textContent = 'Saved profile';
    info.appendChild(lbl);
    info.appendChild(document.createTextNode(saved.name));

    const btnContinue = document.createElement('button');
    btnContinue.type = 'button';
    btnContinue.className = 'em-lg-continue';
    btnContinue.textContent = 'Continue as ' + saved.name;
    btnContinue.addEventListener('click', () => {
      touchProfile(saved);
      onEnter(saved.name);
    });

    row.appendChild(info);
    row.appendChild(btnContinue);
    panel.appendChild(row);

    const or = document.createElement('div');
    or.className = 'em-lg-or';
    or.textContent = '— or use a different name —';
    panel.appendChild(or);
  }

  const nameInput = document.createElement('input');
  nameInput.type = 'text';
  nameInput.className = 'em-lg-name';
  nameInput.placeholder = 'Enter your name';
  nameInput.maxLength = NAME_MAX + 4; // a little slack before trim/collapse
  nameInput.autocomplete = 'off';
  nameInput.spellcheck = false;

  const err = document.createElement('div');
  err.className = 'em-lg-err';

  const enterBtn = document.createElement('button');
  enterBtn.type = 'button';
  enterBtn.className = 'em-lg-enter';
  enterBtn.textContent = 'Enter Eldermoor';

  const submit = () => {
    const result = validateName(nameInput.value);
    if(!result.ok){
      err.textContent = result.error;
      nameInput.classList.add('em-bad');
      return;
    }
    err.textContent = '';
    nameInput.classList.remove('em-bad');
    writeProfile(result.value);
    onEnter(result.value);
  };

  nameInput.addEventListener('keydown', (e) => {
    if(e.key === 'Enter') submit();
  });
  enterBtn.addEventListener('click', submit);

  panel.appendChild(nameInput);
  panel.appendChild(err);
  panel.appendChild(enterBtn);

  const foot = document.createElement('div');
  foot.className = 'em-lg-foot';
  foot.textContent = 'A local profile only - no account required.';
  panel.appendChild(foot);

  root.appendChild(panel);
  return root;
}

/* -------------------------------------------------------------- show/hide */
function getOverlay(){
  if(typeof document === 'undefined') return null;
  return document.getElementById(ROOT_ID);
}

function hide(){
  const existing = getOverlay();
  if(!existing) return;
  if(existing.parentNode) existing.parentNode.removeChild(existing);
}

function show(){
  if(typeof document === 'undefined') return;
  if(getOverlay()) return; // already visible
  injectCSS();
  const overlay = buildOverlay((name) => {
    setSession(true);
    try { window.EMNAME = name; } catch(e){ /* ignore */ }
    hide();
    try {
      window.dispatchEvent(new CustomEvent('em-login', { detail: { name: name } }));
    } catch(e){ /* CustomEvent unsupported - non-fatal */ }
  });
  document.body.appendChild(overlay);
  // Focus the name field for keyboard-first entry, unless a saved-profile
  // "Continue" button is the more obvious path (still fine to focus either).
  try {
    const input = overlay.querySelector('.em-lg-name');
    if(input) setTimeout(() => input.focus(), 30);
  } catch(e){ /* ignore */ }
}

function isLoggedIn(){
  return hasSession();
}

function getProfile(){
  return readProfile();
}

/* ------------------------------------------------------- global surface */
function installGlobal(){
  if(typeof window === 'undefined') return;
  window.EMLOGIN = {
    show:        show,
    hide:        hide,
    isLoggedIn:  isLoggedIn,
    getProfile:  getProfile,
  };
}

/* ------------------------------------------------------------- init */
/**
 * initLogin - call once from main.js.
 *
 * Installs window.EMLOGIN and, if there is no active session, shows the
 * login overlay immediately (blocking play until a name is submitted).
 * If a session is already active (reload mid-play) this is a no-op so
 * returning-this-tab players aren\'t interrupted.
 */
export function initLogin(){
  installGlobal();

  if(typeof window === 'undefined' || typeof document === 'undefined') return;

  if(!hasSession()){
    show();
  } else {
    // Mirror the saved name for HUD / dialogue convenience even when the
    // overlay itself is skipped (session already active).
    const saved = readProfile();
    if(saved && saved.name){
      try { window.EMNAME = saved.name; } catch(e){ /* ignore */ }
    }
  }
}

export default { initLogin };
