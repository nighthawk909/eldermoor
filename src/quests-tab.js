/* =====================================================================
   ELDERMOOR - Quests tab (QJ1-5). Owns the "Quests" panel via the HUD
   tab registry hook (window.EMTABS['quests']). Self-contained and
   data-driven: reads quest content from window.EMDATA.quests, the
   quests.json shape:
     { questPointsTotal, quests:[ { id, name, state, group, questPoints,
       requirements, description, steps, rewards } ] }

   Behaviour:
     * Header shows "Quest Points: N" (sum of complete quests' points,
       out of questPointsTotal) in red.
     * Quests grouped under Free / Members / Miscellaneous headers, each
       with a (done/total) count.
     * Quest name coloured by state: not_started=red, in_progress=yellow,
       complete=green (OSRS journal convention).
     * Click a quest -> detail subpanel (description, requirements coloured
       by met/unmet via state.getSkillXp + levelFromXp, steps, rewards)
       with a Back button.
     * not_started quests show a "Start quest" button; clicking it flips
       state to in_progress and persists to localStorage.
     * window.EMQUEST.complete(id) flips state to complete, increments a
       persisted QP total, shows a centered reward scroll, plays
       window.EMAUDIO.levelUp?.(), and fires a chat message.
     * window.EMQUEST = { start(id), complete(id), state(id), questPoints() }
     * If EMDATA.quests is absent yet, renders a "loading..." line and
       re-renders when the 'em-data-ready' event fires.

   Conventions matched: ES module exporting initQuestsTab(); idempotent;
   window.EMTABS[tab] = (panel, state) => {...}; reads HUD state read-only,
   never mutates sibling modules. main.js invokes initQuestsTab() once.
   ===================================================================== */
export function initQuestsTab(){
  if(typeof window === 'undefined') return;
  if(window.__emQuestsInit) return;        // idempotent - main.js calls once
  window.__emQuestsInit = true;

  /* ----------------------------------------------------- group definitions */
  // Canonical group order + display labels. Quests with an unknown group
  // fall through to Miscellaneous so nothing is ever dropped silently.
  const GROUPS = [
    { id: 'Free',          label: 'Free Quests' },
    { id: 'Members',       label: "Members' Quests" },
    { id: 'Miscellaneous', label: 'Miscellaneous' }
  ];
  const GROUP_IDS = GROUPS.map(g => g.id);

  // state -> colour class (drives the name colour in list + detail title).
  const STATE_CLASS = { not_started: 'ns', in_progress: 'ip', complete: 'cp' };

  /* --------------------------------------------------- localStorage helpers */
  const LS_STATES_KEY = 'eldermoor:quests';
  const LS_QP_KEY     = 'eldermoor:questPoints';

  function loadPersistedStates(){
    try {
      const raw = localStorage.getItem(LS_STATES_KEY);
      return raw ? JSON.parse(raw) : {};
    } catch { return {}; }
  }

  function savePersistedStates(map){
    try { localStorage.setItem(LS_STATES_KEY, JSON.stringify(map)); } catch { /* quota */ }
  }

  function loadPersistedQP(){
    try {
      const v = localStorage.getItem(LS_QP_KEY);
      return v !== null ? Number(v) || 0 : null;  // null = not yet set
    } catch { return null; }
  }

  function savePersistedQP(n){
    try { localStorage.setItem(LS_QP_KEY, String(Number(n) || 0)); } catch { /* quota */ }
  }

  // Apply localStorage overrides onto the live quest list (non-mutating read).
  // Returns a new array with state fields overridden where saved.
  function questListWithOverrides(){
    const raw = questList();
    const saved = loadPersistedStates();
    return raw.map(q => {
      const override = saved[q.id];
      if(override && override !== q.state) return Object.assign({}, q, { state: override });
      return q;
    });
  }

  /* ----------------------------------------------------- data access (safe) */
  // EMDATA.quests may arrive after init; read lazily, never cache.
  function questData(){
    const d = window.EMDATA;
    return (d && d.quests && typeof d.quests === 'object') ? d.quests : null;
  }
  function questList(){
    const q = questData();
    return (q && Array.isArray(q.quests)) ? q.quests.filter(Boolean) : [];
  }
  function findQuest(id){
    return questListWithOverrides().find(q => q && q.id === id) || null;
  }

  /* ------------------------------------------------------- escaping helper */
  function esc(s){
    return String(s == null ? '' : s)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  /* ----------------------------------------------------- HUD skill access */
  // Read a skill\'s current level via the shared HUD state. quests.json uses
  // capitalised skill ids ("Attack"); EMHUD.getSkillXp() keys are lowercase,
  // so we lowercase before lookup. Returns null when HUD/xp is unavailable.
  function skillLevel(state, skillId){
    try {
      const getXp = (state && state.getSkillXp) || (window.EMHUD && window.EMHUD.getSkillXp);
      const lvlFn = (state && state.levelFromXp) || (window.EMHUD && window.EMHUD.levelFromXp);
      if(typeof getXp !== 'function') return null;
      const xp = getXp() || {};
      const key = String(skillId || '').toLowerCase();
      const v = (typeof xp[key] === 'number') ? xp[key] : (typeof xp[skillId] === 'number' ? xp[skillId] : 0);
      if(typeof lvlFn === 'function') return lvlFn(v);
      return null;
    } catch { return null; }
  }

  // Evaluate one requirement -> { met:boolean|null, label:string }.
  // met===null means "can\'t determine" (treated as unmet styling, neutral).
  function evalRequirement(req, state){
    if(!req || typeof req !== 'object') return { met: null, label: String(req || '') };
    if(req.type === 'skill'){
      const need = Number(req.level) || 0;
      const have = skillLevel(state, req.id);
      const label = 'Level ' + need + ' ' + (req.id || '?');
      if(have == null) return { met: null, label };
      return { met: have >= need, label: label + ' (you: ' + have + ')' };
    }
    if(req.type === 'quest'){
      const dep = findQuest(req.id);
      const name = dep ? dep.name : (req.id || 'a prior quest');
      const met = !!(dep && dep.state === 'complete');
      return { met, label: 'Completion of ' + name };
    }
    // Unknown requirement shape - show its text, neutral styling.
    const txt = req.label || req.text || req.id || JSON.stringify(req);
    return { met: null, label: String(txt) };
  }

  /* --------------------------------------------------------- chat helper */
  function chatMsg(text){
    try {
      const fn = window.EMCHAT && (window.EMCHAT.addLine || window.EMCHAT.add);
      if(typeof fn === 'function'){ fn.call(window.EMCHAT, text); return; }
      // Fallback: dispatch a custom event that the HUD chat pane may listen to.
      window.dispatchEvent(new CustomEvent('em-chat', { detail: { text } }));
    } catch { /* silent */ }
  }

  /* --------------------------------------------------------- re-render helper */
  // Re-render the quests tab if it is currently active.
  function refreshIfActive(){
    try {
      const hud = window.EMHUD;
      if(hud && typeof hud.curTab === 'function' && hud.curTab() === 'quests'
         && typeof hud.refresh === 'function'){
        hud.refresh();
      }
    } catch { /* HUD not ready */ }
  }

  /* --------------------------------------------------------- reward scroll */
  function showRewardScroll(quest){
    const existing = document.getElementById('emq-reward-overlay');
    if(existing) existing.remove();

    const qp = Number(quest.questPoints) || 0;
    const rewards = Array.isArray(quest.rewards) ? quest.rewards : [];

    let rewardsHtml = '';
    if(rewards.length){
      rewardsHtml = '<ul class="emq-rwd-list">'
        + rewards.map(r => '<li>' + esc(r) + '</li>').join('') + '</ul>';
    }

    const overlay = document.createElement('div');
    overlay.id = 'emq-reward-overlay';
    overlay.innerHTML =
      '<div class="emq-scroll-wrap">'
      + '<div class="emq-scroll-title">Quest Complete!</div>'
      + '<div class="emq-scroll-name">' + esc(quest.name || quest.id) + '</div>'
      + (qp ? '<div class="emq-scroll-qp">+' + qp + ' Quest Point' + (qp !== 1 ? 's' : '') + '</div>' : '')
      + (rewardsHtml ? '<div class="emq-scroll-rwdhead">Rewards:</div>' + rewardsHtml : '')
      + '<button class="emq-scroll-close" type="button">Continue</button>'
      + '</div>';

    document.body.appendChild(overlay);

    const btn = overlay.querySelector('.emq-scroll-close');
    if(btn) btn.onclick = () => overlay.remove();

    // Auto-dismiss after 12 s.
    setTimeout(() => { if(overlay.parentNode) overlay.remove(); }, 12000);
  }

  /* --------------------------------------------------------- one-time styles */
  const css = `
  .emq-wrap{font-family:"Trebuchet MS",sans-serif;color:#e3d6b8;}
  .emq-loading{color:#9a8c6c;font-size:12px;padding:8px 2px;}
  .emq-pts{font-size:13px;font-weight:bold;color:#d14b3a;margin:0 0 8px;letter-spacing:.02em;}
  .emq-grp{margin:0 0 9px;}
  .emq-grp h5{margin:0 0 3px;font-size:11px;letter-spacing:.08em;text-transform:uppercase;
    color:#cdbf98;border-bottom:1px solid #4a3f2a;padding-bottom:2px;display:flex;align-items:center;}
  .emq-grp h5 .ct{margin-left:auto;color:#9a8c6c;font-weight:normal;letter-spacing:0;}
  .emq-list{list-style:none;margin:0;padding:0;}
  .emq-list li{padding:3px 4px;border-radius:4px;cursor:pointer;font-size:12.5px;line-height:1.25;
    display:flex;align-items:center;gap:5px;}
  .emq-list li:hover{background:#3a3122;}
  .emq-list li .nm.ns{color:#d14b3a;}   /* not started - red    */
  .emq-list li .nm.ip{color:#e7c64f;}   /* in progress - yellow */
  .emq-list li .nm.cp{color:#5fc14b;}   /* complete    - green  */
  .emq-list li .qp{margin-left:auto;color:#9a8c6c;font-size:10px;white-space:nowrap;}
  .emq-empty{color:#9a8c6c;font-size:12px;padding:6px 2px;}

  /* ---- detail subpanel ---- */
  .emq-detail .back{background:#3a2e1f;border:1px solid #5a4a2a;color:#f3e9cf;font-size:11px;
    cursor:pointer;border-radius:5px;padding:3px 9px;margin:0 0 8px;font-family:inherit;}
  .emq-detail .back:hover{border-color:#e7c64f;background:#5a4422;}
  .emq-detail .title{font-size:14px;font-weight:bold;margin:0 0 2px;}
  .emq-detail .title.ns{color:#d14b3a;} .emq-detail .title.ip{color:#e7c64f;} .emq-detail .title.cp{color:#5fc14b;}
  .emq-detail .meta{font-size:10px;color:#9a8c6c;margin:0 0 8px;text-transform:capitalize;}
  .emq-detail .desc{font-size:12px;line-height:1.4;color:#d8cba8;margin:0 0 9px;font-style:italic;}
  .emq-detail h6{margin:9px 0 3px;font-size:10.5px;letter-spacing:.06em;text-transform:uppercase;
    color:#cdbf98;}
  .emq-detail ul{list-style:none;margin:0;padding:0 0 0 2px;}
  .emq-detail ul li{font-size:12px;line-height:1.35;padding:1px 0 1px 14px;position:relative;color:#d8cba8;}
  .emq-detail ul li:before{content:"*";position:absolute;left:2px;color:#7a6a48;}
  .emq-detail .req.met{color:#5fc14b;} .emq-detail .req.met:before{content:"v";color:#5fc14b;}
  .emq-detail .req.unmet{color:#d14b3a;} .emq-detail .req.unmet:before{content:"x";color:#d14b3a;}
  .emq-detail .req.unknown{color:#cdbf98;}
  .emq-detail .none{color:#9a8c6c;font-style:italic;}
  .emq-start-btn{display:block;margin:12px 0 0;background:#2a5a28;border:1px solid #4a8a42;
    color:#c8f0b8;font-size:12px;font-weight:bold;cursor:pointer;border-radius:6px;
    padding:6px 18px;font-family:"Trebuchet MS",sans-serif;letter-spacing:.04em;}
  .emq-start-btn:hover{background:#3a7a36;border-color:#7acc64;}

  /* ---- reward scroll overlay ---- */
  #emq-reward-overlay{position:fixed;inset:0;background:rgba(0,0,0,.7);
    display:flex;align-items:center;justify-content:center;z-index:99999;}
  .emq-scroll-wrap{background:#2a2010;border:3px solid #c8a840;border-radius:10px;
    padding:28px 36px;min-width:260px;max-width:380px;text-align:center;
    font-family:"Trebuchet MS",sans-serif;color:#f3e9cf;box-shadow:0 0 40px #c8a84066;}
  .emq-scroll-title{font-size:18px;font-weight:bold;color:#e7c64f;margin:0 0 6px;letter-spacing:.04em;}
  .emq-scroll-name{font-size:14px;color:#f3e9cf;margin:0 0 14px;}
  .emq-scroll-qp{font-size:22px;font-weight:bold;color:#5fc14b;margin:0 0 14px;letter-spacing:.02em;}
  .emq-scroll-rwdhead{font-size:11px;letter-spacing:.08em;text-transform:uppercase;
    color:#cdbf98;margin:0 0 5px;}
  .emq-rwd-list{list-style:none;margin:0 0 14px;padding:0;text-align:left;}
  .emq-rwd-list li{font-size:12px;color:#d8cba8;padding:2px 0 2px 14px;position:relative;}
  .emq-rwd-list li:before{content:"*";position:absolute;left:2px;color:#c8a840;}
  .emq-scroll-close{margin:4px 0 0;background:#3a2e1f;border:1px solid #c8a840;
    color:#f3e9cf;font-size:12px;cursor:pointer;border-radius:5px;padding:5px 22px;
    font-family:"Trebuchet MS",sans-serif;}
  .emq-scroll-close:hover{background:#5a4422;border-color:#e7c64f;}
  `;
  const st = document.createElement('style');
  st.textContent = css;
  document.head.appendChild(st);

  /* ----------------------------------------------------- LIST view rendering */
  function renderList(panel, state){
    const q = questData();
    const all = questListWithOverrides();
    const total = (q && Number.isFinite(q.questPointsTotal)) ? q.questPointsTotal
      : all.reduce((a, x) => a + (Number(x.questPoints) || 0), 0);

    // QP earned: prefer persisted total (so complete() updates are reflected
    // immediately), fall back to summing complete quests.
    const persisted = loadPersistedQP();
    const earned = persisted !== null ? persisted
      : all.reduce((a, x) =>
          a + (x.state === 'complete' ? (Number(x.questPoints) || 0) : 0), 0);

    // Bucket quests into known groups; unknown groups -> Miscellaneous.
    const buckets = {};
    GROUP_IDS.forEach(id => { buckets[id] = []; });
    all.forEach(x => {
      const g = GROUP_IDS.indexOf(x.group) >= 0 ? x.group : 'Miscellaneous';
      buckets[g].push(x);
    });

    let html = '<div class="emq-wrap">';
    html += '<div class="emq-pts">Quest Points: ' + earned + ' / ' + total + '</div>';

    GROUPS.forEach(g => {
      const items = buckets[g.id];
      if(!items.length) return;                 // skip empty groups
      const done = items.filter(x => x.state === 'complete').length;
      html += '<div class="emq-grp"><h5>' + esc(g.label)
        + '<span class="ct">' + done + '/' + items.length + '</span></h5>';
      html += '<ul class="emq-list">';
      items.forEach(x => {
        const cls = STATE_CLASS[x.state] || 'ns';
        const qp = (Number(x.questPoints) || 0);
        html += '<li data-id="' + esc(x.id) + '">'
          + '<span class="nm ' + cls + '">' + esc(x.name || x.id) + '</span>'
          + (qp ? '<span class="qp">' + qp + ' QP</span>' : '')
          + '</li>';
      });
      html += '</ul></div>';
    });

    if(!all.length) html += '<div class="emq-empty">No quests available yet.</div>';
    html += '</div>';
    panel.innerHTML = '<h4>Quest Journal</h4>' + html;

    panel.querySelectorAll('.emq-list li[data-id]').forEach(el => {
      el.onclick = () => renderDetail(panel, state, el.dataset.id);
    });
  }

  /* --------------------------------------------------- DETAIL view rendering */
  function renderDetail(panel, state, id){
    const x = findQuest(id);
    if(!x){ renderList(panel, state); return; }   // vanished - fall back to list
    const cls = STATE_CLASS[x.state] || 'ns';
    const stateLabel = String(x.state || '').replace(/_/g, ' ');

    let html = '<h4>Quest Journal</h4><div class="emq-wrap emq-detail">';
    html += '<button class="back" type="button">&larr; Back</button>';
    html += '<div class="title ' + cls + '">' + esc(x.name || x.id) + '</div>';

    const metaBits = [];
    if(x.difficulty) metaBits.push(esc(x.difficulty));
    if(x.length) metaBits.push(esc(x.length));
    metaBits.push(esc(stateLabel));
    if(x.questPoints) metaBits.push((Number(x.questPoints) || 0) + ' QP');
    html += '<div class="meta">' + metaBits.join(' &middot; ') + '</div>';

    if(x.description) html += '<div class="desc">' + esc(x.description) + '</div>';

    // Requirements - coloured met/unmet (or neutral when undeterminable).
    html += '<h6>Requirements</h6>';
    const reqs = Array.isArray(x.requirements) ? x.requirements : [];
    if(!reqs.length){
      html += '<ul><li class="req unknown none">None.</li></ul>';
    } else {
      html += '<ul>';
      reqs.forEach(r => {
        const ev = evalRequirement(r, state);
        const rc = ev.met === true ? 'met' : (ev.met === false ? 'unmet' : 'unknown');
        html += '<li class="req ' + rc + '">' + esc(ev.label) + '</li>';
      });
      html += '</ul>';
    }

    // Steps.
    html += '<h6>Steps</h6>';
    const steps = Array.isArray(x.steps) ? x.steps : [];
    if(!steps.length){
      html += '<ul><li class="none">No steps recorded.</li></ul>';
    } else {
      html += '<ul>' + steps.map(s => '<li>' + esc(s) + '</li>').join('') + '</ul>';
    }

    // Rewards.
    html += '<h6>Rewards</h6>';
    const rewards = Array.isArray(x.rewards) ? x.rewards : [];
    if(!rewards.length){
      html += '<ul><li class="none">No rewards listed.</li></ul>';
    } else {
      html += '<ul>' + rewards.map(r => '<li>' + esc(r) + '</li>').join('') + '</ul>';
    }

    // "Start quest" button - only shown for not_started quests.
    if(x.state === 'not_started'){
      html += '<button class="emq-start-btn" type="button" data-start-id="' + esc(x.id) + '">'
        + 'Start quest'
        + '</button>';
    }

    html += '</div>';
    panel.innerHTML = html;

    const back = panel.querySelector('.emq-detail .back');
    if(back) back.onclick = () => renderList(panel, state);

    const startBtn = panel.querySelector('.emq-start-btn[data-start-id]');
    if(startBtn){
      startBtn.onclick = () => {
        window.EMQUEST.start(startBtn.dataset.startId);
        renderDetail(panel, state, startBtn.dataset.startId);
      };
    }
  }

  /* ----------------------------------------------------- top-level renderer */
  // Routes to loading / list. (Detail is reached via clicks, not on entry.)
  function render(panel, state){
    if(!panel) return;
    if(!questData()){
      panel.innerHTML = '<h4>Quest Journal</h4><div class="emq-wrap">'
        + '<div class="emq-loading">Loading quests...</div></div>';
      return;
    }
    renderList(panel, state);
  }

  /* ---------------------------------------------- EMQUEST public API */
  window.EMQUEST = {
    /**
     * Start a quest (flip not_started -> in_progress).
     * No-ops if the quest is already in_progress or complete.
     */
    start: function(id){
      const q = findQuest(id);
      if(!q || q.state !== 'not_started') return;
      const saved = loadPersistedStates();
      saved[id] = 'in_progress';
      savePersistedStates(saved);
      // Mirror onto live EMDATA so findQuest() reflects the change immediately.
      const live = questList().find(function(x){ return x && x.id === id; });
      if(live) live.state = 'in_progress';
      chatMsg('You have started a quest.');
      refreshIfActive();
    },

    /**
     * Complete a quest (flip any state -> complete).
     * Increments the persisted QP total by the quest\'s questPoints value,
     * shows a centered reward scroll, plays EMAUDIO.levelUp, and chats.
     */
    complete: function(id){
      const q = findQuest(id);
      if(!q || q.state === 'complete') return;
      const qp = Number(q.questPoints) || 0;

      // Persist state.
      const saved = loadPersistedStates();
      saved[id] = 'complete';
      savePersistedStates(saved);

      // Persist QP total.
      const prevQP = loadPersistedQP();
      const baseQP = prevQP !== null ? prevQP
        : questListWithOverrides().reduce(function(a, x){
            return a + (x.state === 'complete' && x.id !== id ? (Number(x.questPoints) || 0) : 0);
          }, 0);
      savePersistedQP(baseQP + qp);

      // Mirror onto live EMDATA.
      const live = questList().find(function(x){ return x && x.id === id; });
      if(live) live.state = 'complete';

      // Show reward scroll.
      showRewardScroll(q);

      // Play level-up sound.
      try {
        const audio = window.EMAUDIO;
        if(audio && typeof audio.levelUp === 'function') audio.levelUp();
      } catch { /* audio may not be loaded */ }

      // Chat notification.
      const name = q.name || id;
      chatMsg('You have completed ' + name + '!'
        + (qp ? ' (' + qp + ' Quest Point' + (qp !== 1 ? 's' : '') + ' earned)' : ''));

      refreshIfActive();
    },

    /**
     * Return the current state string for a quest id, or null if not found.
     */
    state: function(id){
      const q = findQuest(id);
      return q ? q.state : null;
    },

    /**
     * Return the current persisted Quest Points total.
     * Falls back to summing complete quests when no persisted value exists yet.
     */
    questPoints: function(){
      const persisted = loadPersistedQP();
      if(persisted !== null) return persisted;
      return questListWithOverrides().reduce(function(a, x){
        return a + (x.state === 'complete' ? (Number(x.questPoints) || 0) : 0);
      }, 0);
    }
  };

  /* ---------------------------------------------- TAB REGISTRY HOOK (EMTABS) */
  // Renders into the HUD\'s shared panel when the 'quests' tab is shown.
  window.EMTABS = window.EMTABS || {};
  window.EMTABS['quests'] = (panel, state) => render(panel, state);

  /* ------------------------------------------ re-render when data arrives */
  // If the quests tab is open showing "loading..." when EMDATA lands, refresh it.
  window.addEventListener('em-data-ready', () => {
    refreshIfActive();
  });
}
