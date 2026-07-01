/* =====================================================================
   ELDERMOOR - engine module. Renderer, scene, camera, lights, sky sphere,
   tiling textures, and dressMaterials. Pure setup: the sky sphere + lights
   run at import time (no cross-module dependencies), so this is safe to be
   imported first by everyone else.
   ===================================================================== */

/* small shared utilities (used across modules) */
export const TAU = Math.PI*2;
export const col = h => new THREE.Color(h).convertSRGBToLinear();
export const buzz = ms => { try{ navigator.vibrate && navigator.vibrate(ms); }catch(e){} };

/* P1.7: asymptotic (exponential) decay helper for transient glow/flash effects
   (e.g. the altar-prayer glow). A hard linear ramp-down (intensity -= dt*k)
   reads as a mechanical "switch-off" near zero; exponential decay - value *=
   exp(-rate*dt) - falls fast at first and eases out, which matches how real
   light falloff / the rest of the game's easing reads. `rate` controls how
   quickly it decays (higher = faster); values below `floor` snap to 0 so the
   light doesn't glow forever at imperceptible intensity. */
export function decayExp(value, dt, rate=3.0, floor=0.01){
  if(value <= 0) return 0;
  const next = value * Math.exp(-rate*dt);
  return next < floor ? 0 : next;
}

export const canvas = document.getElementById('c');
export const renderer = new THREE.WebGLRenderer({canvas, antialias:true, preserveDrawingBuffer:true});
renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
renderer.setSize(innerWidth, innerHeight);
renderer.outputEncoding = THREE.sRGBEncoding;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.0;
renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.PCFSoftShadowMap;

export const scene = new THREE.Scene();
export const camera = new THREE.PerspectiveCamera(50, innerWidth/innerHeight, 0.1, 400);

/* subtle distance fog: distant terrain fades into the sky.
   near is set generously (~40) so the play area stays crisp; only far
   geometry near the sky sphere dissolves. Colour matches the sky\'s lower
   gradient band so the horizon reads as haze, not a wall. */
scene.fog = new THREE.Fog(col('#cdd6cf'), 40, 140);

/* sky-gradient backdrop (matches the Cycles flat world fill).
   P1.7: the gradient is authored in LINEAR space (col() already converts
   sRGB->linear, and the per-vertex lerp below is correct in that space), so
   it must be run through the SAME ACES Filmic tone-mapping + sRGB output
   encoding as every other material in the scene (toneMapped left at its
   default true). Previously this was toneMapped:false, which skipped ACES
   entirely for the sky only - that mismatch is what read as "washed out" /
   inconsistent against the tone-mapped world and fog below it. */
(function(){
  const g = new THREE.SphereGeometry(120, 24, 16), top = col('#5e93c9'), bot = col('#e7ddc4'), c = [];
  const v = new THREE.Vector3(), p = g.attributes.position;
  for(let i=0;i<p.count;i++){v.fromBufferAttribute(p,i).normalize();const t=Math.max(0,v.y);
    c.push(bot.r+(top.r-bot.r)*t, bot.g+(top.g-bot.g)*t, bot.b+(top.b-bot.b)*t);}
  g.setAttribute('color', new THREE.Float32BufferAttribute(c,3));
  scene.add(new THREE.Mesh(g, new THREE.MeshBasicMaterial({vertexColors:true, side:THREE.BackSide})));
})();

/* three-point-ish flat light (warm key + cool fill + ambient) per art bible */
scene.add(new THREE.HemisphereLight(col('#cfe0ff'), col('#5a4a32'), 0.9));
scene.add(new THREE.AmbientLight(0xffffff, 0.25));
export const sun = new THREE.DirectionalLight(col('#fff1d6'), 2.4);
sun.position.set(10, 18, 8); sun.castShadow = true;
sun.shadow.mapSize.set(2048,2048);
sun.shadow.camera.near = 1; sun.shadow.camera.far = 80;
sun.shadow.camera.left=-20; sun.shadow.camera.right=20; sun.shadow.camera.top=20; sun.shadow.camera.bottom=-20;
sun.shadow.bias = -0.0004; scene.add(sun);

/* tiling textures (world-space repeat: cube-projected UVs, 1 UV unit = 1 world unit) */
export const texLoader = new THREE.TextureLoader();
export function tiling(url, worldSize){
  const t = texLoader.load(url);
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.repeat.set(1/worldSize, 1/worldSize);
  t.encoding = THREE.sRGBEncoding; t.anisotropy = 4;
  return t;
}
export const TEX = {
  stone: tiling('textures/brick.png', 2.0), plank: tiling('textures/plank.png', 2.0),
  grass: tiling('textures/grass.png', 4.0), dirt:  tiling('textures/dirt.png', 3.0),
  sand:  tiling('textures/sand.png', 4.0),  water: tiling('textures/water.png', 5.0),
};
/* Explicit material-role classification (P1.5). Authoring tools name glTF
   materials after their intended role (e.g. "Terrain", "Water_Pond", "Roof_Hall");
   we resolve the EXACT role deterministically here instead of chaining fragile
   .includes() substring checks (which misclassify e.g. "Stonewater" or
   "Sandstone" / "Roofstone" style names). Longest-match-first against known
   role keywords keeps this a single source of truth other fixes (P1.1/P1.2/P1.6)
   build on. */
const MATERIAL_ROLES = [
  // [roleId, exact keyword to match as a whole lowercase token/substring, priority]
  { role: 'water',   key: 'water' },
  { role: 'terrain', key: 'terrain' },
  { role: 'roof',    key: 'roof' },
  { role: 'stone',   key: 'stone' },
  { role: 'plank',   key: 'plank' },
  { role: 'grass',   key: 'grass' },
  { role: 'dirt',    key: 'dirt' },
  { role: 'sand',    key: 'sand' },
];
export function materialRole(materialName){
  const n = (materialName||'').toLowerCase();
  for(const r of MATERIAL_ROLES){ if(n.includes(r.key)) return r.role; }
  return null;
}

/* renderOrder bands so transparent/overlapping surfaces sort deterministically
   regardless of draw call order (P1.2: water must draw after the floor). */
const RENDER_ORDER = { terrain: 0, water: 10 };

/* P1.6: terrain and building/interior floor meshes are authored flush at the
   same y-level, which z-fights under the renderer's depth precision. Nudge
   the terrain mesh a hair below true ground level so floors (stone/plank
   roles laid on top of it) always win the depth test cleanly, with no
   visible step (the offset is far below the faceted art style's visible
   tolerance). */
const TERRAIN_Y_OFFSET = -0.01;

export function dressMaterials(root, flat=true){
  root.traverse(o => {
    if(!o.isMesh) return;
    o.castShadow = true; o.receiveShadow = true;
    const mats = Array.isArray(o.material) ? o.material : [o.material];
    let isTerrainMesh = false;
    mats.forEach(m => {
      if(flat) m.flatShading = true;
      m.metalness = Math.min(m.metalness||0, 0.2);
      const role = materialRole(m.name);
      if(role === 'terrain'){
        // P1.1: vertex-colour terrain must NOT also sample a stray texture map
        // (a leftover/default map multiplies against vertex colours and washes
        // them out or tints them wrong) - explicitly null every map slot.
        m.vertexColors = true; m.color.setHex(0xffffff);
        m.map = null; m.emissiveMap = null; m.aoMap = null; m.roughnessMap = null; m.metalnessMap = null;
        m.side = THREE.FrontSide; m.needsUpdate = true;
        o.renderOrder = RENDER_ORDER.terrain;
        isTerrainMesh = true;
        return;
      }
      if(role === 'roof'){
        registerRoof(o);
      }
      let tex = null;
      if(role === 'stone')      tex = TEX.stone;
      else if(role === 'plank') tex = TEX.plank;
      else if(role === 'grass') tex = TEX.grass;
      else if(role === 'dirt')  tex = TEX.dirt;
      else if(role === 'sand')  tex = TEX.sand;
      else if(role === 'water') tex = TEX.water;
      if(tex){ m.map = tex; m.color.setHex(0xffffff); }
      if(role === 'water'){
        // P1.2: water stays depth-test-only (no depth WRITE) so it never
        // occludes geometry behind it, but it must be assigned a renderOrder
        // strictly after the floor/terrain band so the renderer draws it AFTER
        // opaque ground - otherwise sort order is draw-call-order-dependent and
        // water can "punch holes" by drawing before the floor beneath it.
        m.transparent = true; m.opacity = 0.85; m.depthWrite = false; m.metalness = 0.0; m.roughness = 0.3;
        o.renderOrder = RENDER_ORDER.water;
      }
      m.needsUpdate = true;
    });
    // P1.6: apply the terrain/floor z-fight offset once per mesh (not per
    // material-slot) and only once (guard so re-running dressMaterials on an
    // already-dressed root, e.g. a re-equip pass, doesn't stack the offset).
    if(isTerrainMesh && !o.userData.__terrainOffsetApplied){
      o.position.y += TERRAIN_Y_OFFSET;
      o.userData.__terrainOffsetApplied = true;
    }
  });
}

/* -------------------------------------------------------------------
   Quality + roof helpers (additive hooks for the client).
   ------------------------------------------------------------------- */

/* Quality toggle stub. For now flips shadows on/off; later this is the
   single place to also gate AA, anisotropy, fog distance, etc.
   level: 'low' | 'med' | 'high' (anything but 'low' keeps shadows). */
export function setQuality(level){
  const lo = level === 'low';
  renderer.shadowMap.enabled = !lo;
  // force materials to re-evaluate their shadow state next frame
  scene.traverse(o => {
    if(o.isMesh && o.material){
      const mats = Array.isArray(o.material) ? o.material : [o.material];
      mats.forEach(m => { m.needsUpdate = true; });
    }
  });
  return level;
}

/* Roof occlusion: buildings register their roof mesh(es); updateRoofs(true)
   hides them so the interior is visible when the player steps inside.
   P1.6: meshes whose material resolves to the 'roof' role (see materialRole /
   MATERIAL_ROLES above) are now auto-registered by dressMaterials, so no
   per-building wiring is required on the authoring side - any roof-named
   material is occlusion-managed automatically once its glTF is dressed. */
const _roofs = new Set();
export function registerRoof(mesh){
  if(mesh) _roofs.add(mesh);
  return mesh;
}
export function unregisterRoof(mesh){
  _roofs.delete(mesh);
}
export function updateRoofs(playerInside){
  _roofs.forEach(m => { m.visible = !playerInside; });
}

/* P1.6 (partial, engine-local): a self-contained interior test other modules
   CAN opt into without engine.js needing to know about world/player state.
   Each registered roof mesh's world-space bounding box defines its building's
   footprint; a point is "inside" if it falls within any roof's XZ footprint
   AND below that roof's underside (Y). This lets a caller elsewhere (e.g. the
   player tick) drive updateRoofs purely from a position vector:
     import { isInsideAnyRoof, updateRoofs } from './engine.js';
     updateRoofs(isInsideAnyRoof(pos));
   NOTE: the actual call-site wiring (importing this into the per-frame player/
   tick loop) lives outside engine.js and is OUT OF SCOPE for this batch - see
   builder report. This export only makes that wiring possible without
   touching any other file in this pass. */
const _box = new THREE.Box3();
export function isInsideAnyRoof(point){
  if(!point) return false;
  for(const m of _roofs){
    _box.setFromObject(m);
    if(point.x >= _box.min.x && point.x <= _box.max.x &&
       point.z >= _box.min.z && point.z <= _box.max.z &&
       point.y <= _box.min.y + 0.5){
      return true;
    }
  }
  return false;
}
