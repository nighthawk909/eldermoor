/* =====================================================================
   ELDERMOOR - HUD module. The ENTIRE second <script> from the original
   client (OSRS-style HUD: tabs / inventory / stats / equipment / combat /
   chat / minimap), verbatim, wrapped as initHud(). Self-contained: it owns
   its own DOM + sets window.EMHUD, which the other modules call through the
   global. main.js invokes initHud() once.
   ===================================================================== */
export function initHud(){
  const css = `
  #emobj{position:fixed;top:8px;left:50%;transform:translateX(-50%);z-index:30;max-width:62vw;text-align:center;
    background:rgba(33,29,24,.92);border:1px solid #c8a24a;border-radius:8px;padding:5px 14px;color:#f3e9cf;
    font:13px "Trebuchet MS",sans-serif;text-shadow:0 1px 2px #000;}
  #emobj .lab{color:#e7c64f;font-size:9px;letter-spacing:.22em;text-transform:uppercase;display:block;}
  #emmap{position:fixed;right:10px;top:10px;z-index:30;width:108px;height:108px;border-radius:50%;
    border:3px solid #5a4a2a;box-shadow:0 3px 12px #0008,inset 0 0 0 2px #2b2620;overflow:hidden;background:#3f6f3a;}
  #emmap canvas{display:block;width:100%;height:100%;}
  #emchat{position:fixed;left:8px;bottom:8px;width:min(44vw,360px);height:150px;z-index:30;display:flex;flex-direction:column;
    background:linear-gradient(#2b2620,#1f1b16);border:2px solid #5a4a2a;border-radius:6px;box-shadow:0 4px 16px #000a;font-family:"Trebuchet MS",sans-serif;}
  #emlog{flex:1;overflow-y:auto;padding:6px 9px;font-size:12.5px;color:#e3d6b8;line-height:1.5;}
  #emlog .sys{color:#e7c64f;} #emlog .who{color:#7fb0e0;}
  #emchch{display:flex;gap:2px;padding:3px;border-top:1px solid #4a3a26;}
  #emchch button{flex:1;font-size:10px;background:#3a2e1f;color:#cdbf98;border:1px solid #4a3a26;border-radius:3px;padding:3px 0;cursor:pointer;}
  #emchch button.on{border-color:#e7c64f;background:#5a4422;color:#fff;box-shadow:inset 0 0 6px #0006;}
  #emchch button.ch-game{color:#f3e9cf;} #emchch button.ch-public{color:#d8c08a;}
  #emchch button.ch-private{color:#c9a86a;} #emchch button.ch-clan{color:#aed089;}
  #emchch button.ch-trade{color:#f0c97a;}
  #emchch button.mode-off{opacity:.45;text-decoration:line-through;}
  #emchch button.mode-hide{opacity:.25;}
  #emchch button.mode-filtered{font-style:italic;}
  /* ---- OSRS-style two-row stone tab strip, fixed-docked bottom-right (desktop) ---- */
  #emtabs{position:fixed;right:8px;bottom:8px;z-index:31;display:grid;grid-template-columns:repeat(7,1fr);
    grid-auto-rows:1fr;gap:3px;width:min(80vw,318px);
    background:linear-gradient(#4a3c28,#2a2117);border:2px solid #6b5a32;border-radius:7px;padding:5px;
    box-shadow:0 4px 14px #000a,inset 0 1px 0 #ffffff14;}
  #emtabs button{aspect-ratio:1;font-size:16px;background:linear-gradient(#3a2e1f,#241b12);
    border:1px solid #5a4a2a;border-radius:5px;color:#f3e9cf;cursor:pointer;line-height:1;
    box-shadow:inset 0 1px 0 #ffffff10,inset 0 -2px 3px #00000040;}
  #emtabs button.on{border-color:#e7c64f;background:linear-gradient(#5a4422,#3a2e16);box-shadow:inset 0 0 6px #0006;}
  #empanel{position:fixed;right:8px;bottom:92px;z-index:31;width:min(80vw,318px);max-height:52vh;overflow:auto;display:none;
    background:linear-gradient(#4a3c28,#2a2117);border:2px solid #6b5a32;border-radius:7px;padding:9px;
    box-shadow:0 6px 22px #000b,inset 0 1px 0 #ffffff14;font-family:"Trebuchet MS",sans-serif;background-color:#312718;}
  #empanel.show{display:block;}
  #empanel h4{margin:0 0 7px;color:#e7c64f;font-size:11px;letter-spacing:.1em;text-transform:uppercase;}
  #empanel .muted{color:#9a8c6c;font-size:12px;}
  .eminv{display:grid;grid-template-columns:repeat(4,1fr);gap:4px;}
  .eminv .s{aspect-ratio:1;background:linear-gradient(#332a1c,#241c12);border:1px solid #5a4a2a;border-radius:5px;position:relative;
    display:flex;align-items:center;justify-content:center;font-size:21px;cursor:pointer;
    box-shadow:inset 0 1px 0 #ffffff12,inset 0 -2px 4px #00000050;}
  .eminv .s.empty{opacity:.4;cursor:default;}
  .eminv .s .ct{position:absolute;top:1px;right:3px;font-size:10px;color:#8fe08f;font-weight:bold;text-shadow:0 1px 1px #000;}
  .emsk{display:grid;grid-template-columns:repeat(3,1fr);gap:3px;}
  .emsk .sk{background:linear-gradient(#332a1c,#241c12);border:1px solid #5a4a2a;border-radius:4px;padding:3px 5px;font-size:11px;display:flex;align-items:center;gap:4px;}
  .emsk .sk .lv{margin-left:auto;color:#fff;font-weight:bold;}
  .emtot{text-align:center;margin-top:7px;color:#cdbf98;font-size:12px;}
  .emeq{display:grid;grid-template-columns:repeat(3,1fr);gap:5px;justify-items:center;}
  .emeq .s{width:84%;aspect-ratio:1;background:linear-gradient(#332a1c,#241c12);border:1px solid #5a4a2a;border-radius:5px;display:flex;
    align-items:center;justify-content:center;font-size:9px;color:#a08c5c;text-align:center;
    box-shadow:inset 0 1px 0 #ffffff12,inset 0 -2px 4px #00000050;}
  .emcs button{display:block;width:100%;text-align:left;background:linear-gradient(#332a1c,#241c12);color:#e3d6b8;border:1px solid #5a4a2a;
    border-radius:4px;padding:7px 9px;font-size:12px;margin-bottom:4px;cursor:pointer;}
  .emcs button.on{border-color:#e7c64f;color:#fff;}
  #emxp{position:fixed;top:120px;left:50%;transform:translateX(-50%);z-index:29;pointer-events:none;}
  #emxp .d{position:absolute;left:0;transform:translateX(-50%);white-space:nowrap;font-weight:bold;color:#8fe08f;
    text-shadow:0 1px 3px #000;font:14px "Trebuchet MS";animation:emrise 1.5s ease-out forwards;}
  @keyframes emrise{from{opacity:0;transform:translate(-50%,12px);}15%{opacity:1;}to{opacity:0;transform:translate(-50%,-32px);}}
  `;
  const st = document.createElement('style'); st.textContent = css; document.head.appendChild(st);
  const old = document.getElementById('hud'); if(old) old.style.display='none';
  const help = document.getElementById('help'); if(help) help.style.display='none';

  const TABS = [['inv','🎒','Inventory'],['stats','📊','Stats'],['equip','🛡️','Equipment'],['combat','⚔️','Combat'],
    ['prayer','🙏','Prayer'],['magic','✨','Magic'],['quests','📜','Quests'],['settings','⚙️','Settings'],
    ['friends','🧑‍🤝‍🧑','Friends'],['ignore','🚫','Ignore'],['account','👤','Account'],['emotes','😀','Emotes'],
    ['music','🎵','Music'],['logout','🚪','Logout']];
  document.body.insertAdjacentHTML('beforeend', `
    <div id="emobj"><span class="lab">Objective</span><span id="emobjtx">Explore the chapel grounds</span></div>
    <div id="emmap"><canvas width="108" height="108"></canvas></div>
    <div id="emchat"><div id="emlog"></div>
      <div id="emchch">${[['all','All'],['game','Game'],['public','Public'],['private','Private'],['clan','Clan'],['trade','Trade']]
        .map(([ch,lab])=>`<button data-ch="${ch}" data-lab="${lab}" class="${ch==='all'?'':'ch-'+ch}">${lab}</button>`).join('')}</div></div>
    <div id="empanel"></div>
    <div id="emtabs">${TABS.map(t=>`<button data-t="${t[0]}" title="${t[2]}">${t[1]}</button>`).join('')}</div>
    <div id="emxp" class="ui"></div>`);

  let SK=null, IT={}, ready=false;
  const skillXp = {}; const inv = []; let curTab='inv', atkStyle=0;
  const panel = document.getElementById('empanel');
  function levelFromXp(xp){ const t=SK.xpTable; let l=1; for(let i=1;i<t.length;i++){ if(xp>=t[i]) l=i+1; else break; } return Math.min(l,99); }
  function totalLevel(){ return SK.skills.reduce((a,s)=>a+levelFromXp(skillXp[s.id]||0),0); }
  function combatLevel(){ const L=id=>levelFromXp(skillXp[id]||0);
    const base=0.25*(L('defence')+L('hitpoints')+Math.floor(L('prayer')/2));
    const melee=0.325*(L('attack')+L('strength')); return Math.floor(base+Math.max(melee,0.325*Math.floor(1.5*L('ranged'))))||3; }

  function render(){
    if(!ready) return;
    if(window.EMTABS && typeof window.EMTABS[curTab]==='function'){ window.EMTABS[curTab](panel, EMHUD_STATE); return; }
    if(curTab==='inv'){
      panel.innerHTML='<h4>Inventory</h4><div class="eminv"></div>';
      const g=panel.querySelector('.eminv');
      for(let i=0;i<28;i++){ const it=inv[i];
        g.insertAdjacentHTML('beforeend', it?`<div class="s" data-i="${i}"><span class="ct">${it.count>1?it.count:''}</span>${(IT[it.id]||{}).icon||'❓'}</div>`:'<div class="s empty"></div>'); }
      g.querySelectorAll('.s[data-i]').forEach(el=>el.onclick=()=>{ const i=+el.dataset.i; const it=inv[i]; if(!it) return;
        if(window.EMINVOPS && EMINVOPS.defaultAction){ EMINVOPS.defaultAction(i); return; }   // tap = real op0 action
        const d=IT[it.id]||{}; EMHUD.addChat((d.verbs&&d.verbs[0]||'Use')+' '+(d.name||it.id)+'.'); });
    } else if(curTab==='stats'){
      panel.innerHTML='<h4>Skills</h4><div class="emsk"></div><div class="emtot"></div>';
      const g=panel.querySelector('.emsk');
      SK.skills.forEach(s=>{ const lv=levelFromXp(skillXp[s.id]||0);
        g.insertAdjacentHTML('beforeend', `<div class="sk" title="${s.name}: ${Math.floor(skillXp[s.id]||0)} xp"><span>${s.icon}</span><span class="lv">${lv}</span></div>`); });
      panel.querySelector('.emtot').textContent='Total level: '+totalLevel();
    } else if(curTab==='equip'){
      const slots=['head','cape','neck','weapon','body','shield','legs','hands','feet','ring','ammo'];
      panel.innerHTML='<h4>Worn Equipment</h4><div class="emeq">'+slots.map(s=>`<div class="s">${s}</div>`).join('')+'</div>';
    } else if(curTab==='combat'){
      const C=window.EMCOMBAT;
      const styles=(C&&C.availableStyles)?C.availableStyles():[];
      if(styles.length){
        const cur=(C.style&&C.style())||null; const wc=(C.weaponClass&&C.weaponClass())||'unarmed';
        panel.innerHTML=`<h4>Combat - lvl ${combatLevel()}</h4><div class="muted" style="margin-bottom:6px">Weapon: ${wc}</div><div class="emcs">`+
          styles.map(s=>`<button data-s="${s.id}" class="${cur&&cur.id===s.id?'on':''}">${s.name}<span class="muted" style="display:block;font-size:10px">${s.desc||('Trains '+((s.trains||[]).join(', ')))}</span></button>`).join('')+'</div>';
        panel.querySelectorAll('[data-s]').forEach(b=>b.onclick=()=>{ if(C.setStyle)C.setStyle(b.dataset.s); const s=styles.find(x=>x.id===b.dataset.s); render(); EMHUD.addChat('Attack style: '+(s?s.name:b.dataset.s)); });
      } else {
        const fb=['Accurate','Aggressive','Defensive','Controlled'];
        panel.innerHTML=`<h4>Combat - lvl ${combatLevel()}</h4><div class="emcs">`+fb.map((s,i)=>`<button data-s="${i}" class="${i===atkStyle?'on':''}">${s}</button>`).join('')+'</div>';
        panel.querySelectorAll('[data-s]').forEach(b=>b.onclick=()=>{ atkStyle=+b.dataset.s; render(); EMHUD.addChat('Attack style: '+fb[atkStyle]); });
      }
    } else if(curTab==='prayer'){ panel.innerHTML='<h4>Prayers</h4><div class="muted">Locked until you train Prayer at the altar.</div>';
    } else if(curTab==='magic'){ panel.innerHTML='<h4>Spellbook</h4><div class="muted">Get runes from the Magic Instructor to cast Wind Strike.</div>';
    } else if(curTab==='quests'){ panel.innerHTML='<h4>Quest Journal</h4><div class="muted">Tutorial Island - in progress.</div>';
    } else if(curTab==='settings'){ panel.innerHTML='<h4>Settings</h4><div class="muted">Audio, graphics & controls - coming soon.</div>';
    } else { const tab=(TABS.find(t=>t[0]===curTab)||[curTab,'',curTab]); panel.innerHTML='<h4>'+tab[2]+'</h4><div class="muted">Coming soon.</div>'; }
  }
  function showTab(t){ curTab=t; document.querySelectorAll('#emtabs button').forEach(b=>b.classList.toggle('on', b.dataset.t===t));
    panel.classList.add('show'); render(); }
  document.querySelectorAll('#emtabs button').forEach(b=>b.onclick=()=>{ if(curTab===b.dataset.t && panel.classList.contains('show')){ panel.classList.remove('show'); } else showTab(b.dataset.t); });

  const logEl=document.getElementById('emlog');

  /* ---- chat channels (C4): filter + per-channel mode cycle ---- */
  const CH_KEYS=['game','public','private','clan','trade'];
  // per-channel mode: on | filtered | off | hide  (right-click cycles)
  const chMode={}; CH_KEYS.forEach(c=>chMode[c]='on');
  let activeCh='all'; // which filter button is selected (All shows everything)
  // is a given message channel currently visible, given active filter + channel modes?
  function chVisible(ch){
    const mode=chMode[ch]||'on';
    if(mode==='off'||mode==='hide') return false;          // off/hide suppress the channel entirely
    if(activeCh==='all') return true;                       // All shows every still-visible channel
    if(mode==='filtered') return false;                     // filtered = only shown on its own tab / All
    return ch===activeCh;
  }
  function applyChFilter(div){ div.style.display = chVisible(div.dataset.ch||'game') ? '' : 'none'; }
  function refilter(){ logEl.querySelectorAll('.c').forEach(applyChFilter); logEl.scrollTop=logEl.scrollHeight; }
  function paintChBtn(b){
    const ch=b.dataset.ch;
    b.classList.toggle('on', activeCh===ch);
    if(ch==='all'){ b.textContent=b.dataset.lab; return; }   // All has no mode cycle
    const mode=chMode[ch];
    b.classList.remove('mode-on','mode-filtered','mode-off','mode-hide');
    b.classList.add('mode-'+mode);
    const tag={on:'',filtered:' ◦',off:' ✕',hide:' ·'}[mode]||'';
    b.textContent=b.dataset.lab+tag;
    b.title=b.dataset.lab+' channel - '+mode+' (right-click to cycle)';
  }
  function paintAllChBtns(){ document.querySelectorAll('#emchch button').forEach(paintChBtn); }
  document.querySelectorAll('#emchch button').forEach(b=>{
    const ch=b.dataset.ch;
    b.onclick=()=>{ activeCh=ch; paintAllChBtns(); refilter(); };
    if(ch!=='all'){
      b.oncontextmenu=(e)=>{ e.preventDefault();
        const order=['on','filtered','off','hide'];
        chMode[ch]=order[(order.indexOf(chMode[ch])+1)%order.length];
        paintChBtn(b); refilter(); };
    }
  });
  paintAllChBtns(); // default active = All

  window.EMHUD = {
    addChat(text, who, opts){
      // opts: true (legacy = system line) | {sys, channel}
      const o = (opts===true) ? {sys:true} : (opts||{});
      const sys = !!o.sys;
      // channel: explicit > player line is 'public' > system/default 'game'
      const channel = o.channel || (sys ? 'game' : (who ? 'public' : 'game'));
      const d=document.createElement('div'); d.className='c'+(sys?' sys':'');
      d.dataset.ch=channel;
      d.innerHTML=(who?`<span class="who">${who}: </span>`:'')+text; logEl.appendChild(d);
      while(logEl.children.length>60) logEl.removeChild(logEl.firstChild);
      applyChFilter(d); logEl.scrollTop=logEl.scrollHeight; },
    giveItem(id,n){ n=n||1; const e=inv.find(x=>x.id===id); const it=IT[id];
      if(it&&it.stackable&&e){ e.count+=n; } else { if(inv.length<28) inv.push({id,count:n}); }
      if(curTab==='inv') render(); this.addChat('You receive: '+((IT[id]||{}).name||id)+(n>1?' ×'+n:'')+'.','', true); },
    addXp(skill,amt){ const id=skill.toLowerCase(); const before=levelFromXp(skillXp[id]||0);
      skillXp[id]=(skillXp[id]||0)+amt; const after=levelFromXp(skillXp[id]);
      const d=document.createElement('div'); d.className='d'; d.textContent='+'+amt+' '+skill;
      document.getElementById('emxp').appendChild(d); setTimeout(()=>d.remove(),1500);
      if(after>before) this.addChat('⭐ '+skill+' level '+after+'!','', true);
      if(curTab==='stats') render(); },
    setObjective(t){ document.getElementById('emobjtx').textContent=t; },
    show:showTab,
    setPlayer(x,z,ang,markers){ drawMap(x,z,ang,markers); },
    /* ---- read access to HUD state for external tab modules + orbs (additive) ---- */
    getSkills:()=>SK,
    getSkillXp:()=>skillXp,
    getInv:()=>inv,
    getItems:()=>IT,
    levelFromXp,
    totalLevel,
    combatLevel,
    curTab:()=>curTab,
    refresh:()=>render()
  };
  // shared state object passed to external EMTABS renderers (read access to HUD internals)
  const EMHUD_STATE = window.EMHUD;

  /* minimap */
  const mc=document.querySelector('#emmap canvas'), mx=mc.getContext('2d');
  function drawMap(px,pz,ang,markers){
    mx.clearRect(0,0,108,108); mx.save(); mx.translate(54,54);
    const sc=1.1; // world units → px
    // markers (e.g. NPCs, next-step)
    (markers||[]).forEach(m=>{ mx.fillStyle=m.c||'#ffe27a'; mx.beginPath();
      mx.arc((m.x-(px||0))*sc, (m.z-(pz||0))*sc, m.r||2.5, 0, 7); mx.fill(); });
    // player
    mx.fillStyle='#fff'; mx.beginPath(); mx.arc(0,0,3.2,0,7); mx.fill();
    // compass N
    mx.fillStyle='#e7c64f'; mx.font='bold 11px Trebuchet MS'; mx.textAlign='center'; mx.fillText('N',0,-42);
    mx.restore();
  }
  drawMap(0,8.5,0,[]);

  /* load content data, then go */
  Promise.all([
    fetch('assets/data/skills.json').then(r=>r.json()),
    fetch('assets/data/items.json').then(r=>r.json())
  ]).then(([sk,it])=>{
    SK=sk; (it.items||[]).forEach(i=>IT[i.id]=i);
    SK.skills.forEach(s=>skillXp[s.id]=0);
    const start=SK.startLevels||{}; for(const k in start){ skillXp[k]=SK.xpTable[(start[k]||1)-1]||0; }
    ready=true; showTab('inv');
    EMHUD.addChat('Welcome to <b>Eldermoor</b> <span style="opacity:.6">(v38)</span>.','', true);
    EMHUD.addChat('Tap the world to walk. Tap an NPC to talk.','', true);
    // Neutral default; the lesson state machine (lessons.js) replaces this with the
    // current data-driven objective as soon as EMDATA.lessons loads.
    EMHUD.setObjective('Confirm your appearance to begin your training.');
    // a few starting items so the bag isn\'t empty (placeholder)
    ['bronze-axe','tinderbox','coins'].forEach(id=>{ if(IT[id]) EMHUD.giveItem(id, id==='coins'?25:1); });
  }).catch(e=>{ if(window.EMHUD) EMHUD.addChat('HUD data failed to load.'); });
}
