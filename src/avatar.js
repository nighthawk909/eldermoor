/* =====================================================================
   ELDERMOOR - parameterized player avatar (CC4 / EQ4). Builds the in-world
   player from Three.js primitives so the character-creator selections
   actually appear on the body: head + hair/beard/hood, torso (tunic/robe/
   jerkin/yoke), arms (sleeved/bare/wrapped), hands (bare/gloves/bracers),
   legs (trousers/skirt/breeches), feet (boots/shoes/sandals), body type, and
   every colour. Worn weapon/shield from window.EMEQUIP are shown too.

   It reads the SAVE FORMAT unchanged (window.EMAPPEARANCE / 'eldermoor:appearance'
   and EMEQUIP.worn) and rebuilds on the 'em-appearance' event + when worn gear
   changes. The limb pivots are registered on window.EMRIG so the existing
   player.js walk cycle animates them. The original static player.glb is hidden
   while the parameterized avatar is active (and left intact as a fallback when
   no appearance is saved). Defensive: no-ops until THREE + the player group are
   ready. main.js calls initAvatar() once.

   This is the code-procedural parameterization (stylized low-poly). A higher-
   fidelity Blender-authored multi-part model can replace it later behind the
   same data contract (tracked in BACKLOG).
   ===================================================================== */

const DEF = { skin:'#e8b98e', hair:'#3a2a1c', torso:'#3f6f8c', legs:'#2f3742', feet:'#5a3f28' };

function TH(){ return (typeof window !== 'undefined') ? window.THREE : null; }
function appearance(){
  if (typeof window === 'undefined') return null;
  if (window.EMAPPEARANCE) return window.EMAPPEARANCE;
  try { const r = localStorage.getItem('eldermoor:appearance'); return r ? JSON.parse(r) : null; } catch(e){ return null; }
}
function col(sel, k){ const c = sel && sel.colours && sel.colours[k]; return c || DEF[k]; }
function dark(hex){ try{ const n=parseInt(String(hex).slice(1),16); let r=(n>>16)&255,g=(n>>8)&255,b=n&255; r=(r*0.55)|0;g=(g*0.55)|0;b=(b*0.55)|0; return '#'+((1<<24)+(r<<16)+(g<<8)+b).toString(16).slice(1);}catch(e){return '#222';} }

function mat(hex){ const T=TH(); return new T.MeshStandardMaterial({ color:new T.Color(hex), flatShading:true }); }
function box(w,h,d,hex){ const T=TH(); const m=new T.Mesh(new T.BoxGeometry(w,h,d), mat(hex)); return m; }
function cyl(rt,rb,h,hex){ const T=TH(); return new T.Mesh(new T.CylinderGeometry(rt,rb,h,10), mat(hex)); }
function place(o,x,y,z){ o.position.set(x,y,z); return o; }

/* build the avatar group from an appearance selection. Returns
   { group, pivots:{legL,legR,armL,armR}, handR, handL }. */
function buildBody(sel){
  const T = TH();
  const p = (sel && sel.parts) || {};
  const head=String(p.head||''), torso=String(p.torso||''), arms=String(p.arms||''),
        hands=String(p.hands||''), legs=String(p.legs||''), feet=String(p.feet||'');
  const skin=col(sel,'skin'), hair=col(sel,'hair'), tcol=col(sel,'torso'), lcol=col(sel,'legs'), fcol=col(sel,'feet');
  const hooded=/hood/.test(head), beard=/beard/.test(head), longB=/long/.test(head);
  const robe=/robe/.test(torso), yoke=/yoke/.test(torso), jerkin=/jerkin/.test(torso);
  const skirt=/skirt/.test(legs), breeches=/breech/.test(legs);
  const bare=/bare/.test(arms), wrapped=/wrap/.test(arms);
  const gloves=/glove/.test(hands), bracers=/bracer/.test(hands);
  const boots=/boot/.test(feet), sandals=/sandal/.test(feet);
  const wide = sel && sel.bodyType === 'B';
  const bw = wide ? 1.25 : 1.0;

  const g = new T.Group();
  const armCol = (bare || wrapped) ? skin : tcol;
  const handCol = gloves ? dark(tcol) : skin;

  // torso
  const torsoH = robe ? 0.95 : 0.55, torsoY = robe ? 0.95 : 1.15;
  g.add(place(box(0.5*bw, torsoH, 0.28, tcol), 0, torsoY, 0));
  if(yoke) g.add(place(box(0.66*bw, 0.14, 0.32, tcol), 0, 1.40, 0));            // shoulder yoke
  if(jerkin) g.add(place(box(0.52*bw, 0.06, 0.30, dark(tcol)), 0, 0.92, 0));    // belt

  // head + hair/beard/hood
  g.add(place(box(0.34, 0.34, 0.32, skin), 0, 1.62, 0));
  if(hooded) g.add(place(box(0.42, 0.30, 0.40, tcol), 0, 1.70, -0.02));         // hood shell (behind/over)
  else g.add(place(box(0.38, 0.12, 0.36, hair), 0, 1.80, 0));                   // hair cap
  if(beard) g.add(place(box(0.30, longB?0.20:0.12, 0.10, hair), 0, 1.46, 0.16));

  // arms (pivots at shoulders so the walk cycle can swing them)
  const shoulderY = 1.40, shoulderX = 0.34*bw, armLen = 0.5;
  function arm(side){
    const pv = new T.Group(); pv.position.set(side*shoulderX, shoulderY, 0);
    const a = place(box(0.14, armLen, 0.16, armCol), 0, -armLen/2, 0); pv.add(a);
    if(wrapped) for(let i=0;i<3;i++) pv.add(place(box(0.15,0.03,0.17,dark(skin)),0,-0.12-i*0.13,0));
    const hand = place(box(0.13,0.13,0.13, handCol), 0, -armLen-0.04, 0); pv.add(hand);
    if(bracers) pv.add(place(box(0.15,0.06,0.17,dark(fcol)),0,-armLen+0.02,0));
    g.add(pv); return { pv, hand };
  }
  const aL = arm(-1), aR = arm(1);

  // legs (pivots at hips)
  const hipY = 0.92, hipX = 0.13*bw, legLen = 0.9;
  function leg(side){
    const pv = new T.Group(); pv.position.set(side*hipX, hipY, 0);
    const upperCol = (skirt||breeches) ? skin : lcol;
    pv.add(place(box(0.16, legLen, 0.18, upperCol), 0, -legLen/2, 0));
    // feet
    if(sandals){ pv.add(place(box(0.18,0.05,0.28, skin), 0, -legLen-0.02, 0.03)); pv.add(place(box(0.16,0.04,0.10,fcol),0,-legLen+0.02,0)); }
    else { const fh = boots?0.20:0.10; pv.add(place(box(0.18, fh, 0.28, fcol), 0, -legLen-fh/2, 0.04)); }
    g.add(pv); return pv;
  }
  const lL = leg(-1), lR = leg(1);
  if(skirt) g.add(place(cyl(0.26*bw, 0.42*bw, 0.5, lcol), 0, 0.70, 0));         // skirt drape over the legs
  else if(breeches) { g.add(place(box(0.20*bw,0.4,0.22,lcol),0,1.0,0)); }       // breeches cover upper legs

  // metrics so worn-gear overlays (body/cape/helm/legs/feet) land on the right
  // anchors regardless of body type / robe.
  const metrics = { bw, torsoY, torsoH, headY:1.62, hipY, legLen, robe:!!robe };
  return { group:g, pivots:{ legL:lL, legR:lR, armL:aL.pv, armR:aR.pv }, handR:aR.hand, handL:aL.hand, metrics };
}

export function initAvatar(){
  if (typeof window === 'undefined') return null;
  if (window.EMAVATAR) return window.EMAVATAR;

  let current = null;       // { group, pivots, handR, handL }
  let wornSig = '';         // signature of the last-rendered worn set

  function playerGroup(){ return window.EMPLAYER || null; }
  function ready(){ return !!(TH() && playerGroup() && window.EMRIG); }

  function disposeGroup(grp){
    if(!grp) return;
    grp.traverse(o => { if(o.geometry && o.geometry.dispose) o.geometry.dispose();
      if(o.material){ const ms = Array.isArray(o.material)?o.material:[o.material]; ms.forEach(m=>m.dispose&&m.dispose()); } });
    if(grp.parent) grp.parent.remove(grp);
  }

  function hideGlb(pg, keep){
    // Hide the static glb mesh(es) under the player group, but leave our avatar
    // group AND any non-mesh overlays (sprites / nameplates / arrows that other
    // modules may parent to the player) visible. We detect the glb by it owning
    // renderable mesh geometry; sprites and groups-of-sprites are left alone.
    (pg.children || []).slice().forEach(c => {
      if(c === keep) return;
      if(c.userData && c.userData.emKeepVisible) return;     // explicit opt-out
      let hasMesh = false;
      try { c.traverse(o => { if(o.isMesh) hasMesh = true; }); } catch(_){ hasMesh = !!c.isMesh; }
      if(hasMesh) c.visible = false;
    });
  }

  function rebuild(){
    const sel = appearance();
    if(!sel || !ready()) return false;
    const pg = playerGroup();
    if(current) disposeGroup(current.group);
    current = buildBody(sel);
    pg.add(current.group);
    hideGlb(pg, current.group);
    // hand the limb pivots to the walk rig so player.js animates the avatar
    const rig = window.EMRIG;
    rig.legL = current.pivots.legL; rig.legR = current.pivots.legR;
    rig.armL = current.pivots.armL; rig.armR = current.pivots.armR;
    wornSig = '';                 // force worn re-render against the new hands
    renderWorn();
    return true;
  }

  /* read the live worn map ({slot -> {id,count}|string}) as a plain {slot:id} */
  function wornState(){
    const e = window.EMEQUIP; const w = (e && e.worn) || {};
    const out = {};
    Object.keys(w).forEach(slot => { const v = w[slot]; const id = v && (v.id || v); if(id) out[slot] = String(id); });
    return out;
  }

  /* low-poly substance colour for a worn item, derived from its id keywords */
  function gearColor(slot, id){
    id = String(id||'');
    if(/gold|gilded|brass/.test(id)) return '#d8b25a';
    if(/leather|hide|studded/.test(id)) return '#5a3f28';
    if(/bronze/.test(id)) return '#8a6b3a';
    if(/iron/.test(id)) return '#6b7178';
    if(/steel|metal|plate|chain|mail/.test(id)) return '#c2cad4';
    if(/wood|oak|wooden/.test(id)) return '#6b4f2e';
    if(slot === 'cape') return '#9c3030';
    if(slot === 'weapon') return '#c2cad4';
    if(slot === 'shield') return '#5a3f28';
    return '#7a6a52';
  }

  /* (re)build EVERY worn item onto the avatar: weapon+shield ride the hands so
     they swing with the walk cycle; body/cape/helm/legs/feet are body-fixed
     overlays. Items unequipped since last call are removed. */
  function renderWorn(){
    if(!current) return;
    const T = TH(); if(!T) return;
    const ws = wornState();
    const sig = Object.keys(ws).sort().map(s => s + ':' + ws[s]).join('|');
    if(sig === wornSig) return;
    wornSig = sig;

    // tear down the previous worn meshes (each remembers its own parent)
    if(current._worn) current._worn.forEach(m => disposeGroup(m));
    current._worn = [];
    const add = (mesh, parent) => { if(mesh && parent){ parent.add(mesh); current._worn.push(mesh); } };

    const m = current.metrics || { bw:1, torsoY:1.15, torsoH:0.55, headY:1.62, hipY:0.92, legLen:0.9, robe:false };
    const bw = m.bw;

    Object.keys(ws).forEach(slot => {
      const id = ws[slot];
      const c = gearColor(slot, id);
      if(slot === 'weapon'){
        let mesh;
        if(/bow/.test(id)) mesh = place(box(0.06,0.7,0.04,'#5a3f28'), 0, -0.2, 0.05);
        else if(/staff|wand/.test(id)) mesh = place(box(0.05,0.8,0.05,'#5a3f28'), 0, -0.2, 0);
        else if(/pick/.test(id)) mesh = place(box(0.06,0.34,0.30, c), 0, -0.22, 0.06);
        else if(/axe|hatchet/.test(id)){ mesh = place(box(0.05,0.40,0.05,'#5a3f28'),0,-0.24,0.04); add(place(box(0.16,0.16,0.08,c),0,-0.04,0.06), mesh); }
        else mesh = place(box(0.06,0.5,0.12, c), 0, -0.28, 0.04);              // blade/dagger
        add(mesh, current.handR);
      } else if(slot === 'shield'){
        const sh = cyl(0.22,0.22,0.05, c); sh.rotation.x = Math.PI/2; place(sh, 0, -0.1, 0.06);
        add(sh, current.handL);
      } else if(slot === 'body'){
        // armour shell over the torso (slightly larger so it reads as worn)
        add(place(box(0.56*bw, m.torsoH+0.06, 0.34, c), 0, m.torsoY, 0), current.group);
        add(place(box(0.70*bw, 0.12, 0.36, c), 0, m.torsoY + m.torsoH/2, 0), current.group); // shoulder pauldrons
      } else if(slot === 'cape'){
        add(place(box(0.46*bw, 0.9, 0.05, c), 0, m.torsoY - 0.05, -0.20), current.group);     // draped on the back
      } else if(slot === 'head' || slot === 'helm'){
        add(place(box(0.40, 0.22, 0.40, c), 0, m.headY + 0.16, 0), current.group);            // helm shell
      } else if(slot === 'legs'){
        add(place(box(0.46*bw, 0.5, 0.30, c), 0, m.hipY - 0.18, 0), current.group);           // greaves/skirt of mail
      } else if(slot === 'feet'){
        add(place(box(0.20, 0.16, 0.30, c), -0.13*bw, m.hipY - m.legLen, 0.04), current.group);
        add(place(box(0.20, 0.16, 0.30, c),  0.13*bw, m.hipY - m.legLen, 0.04), current.group);
      } else if(slot === 'hands'){
        // gloves: small cubes over both hands
        if(current.handR) add(box(0.16,0.16,0.16, c), current.handR);
        if(current.handL) add(box(0.16,0.16,0.16, c), current.handL);
      }
      // ammo / ring / amulet: no visible mesh (parity with OSRS scale)
    });
  }

  // build when ready / on appearance change; poll worn gear for equip/unequip
  let tries = 0;
  (function pump(){ if(rebuild()) return; if(++tries < 120) setTimeout(pump, 150); })();
  addEventListener('em-appearance', () => { try { rebuild(); } catch(e){} }, { passive:true });
  if(typeof setInterval === 'function') setInterval(() => { try { renderWorn(); } catch(e){} }, 400);

  window.EMAVATAR = { rebuild, renderWorn, current(){ return current; } };
  return window.EMAVATAR;
}

export default initAvatar;
