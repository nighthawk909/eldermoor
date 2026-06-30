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

export const canvas = document.getElementById('c');
export const renderer = new THREE.WebGLRenderer({canvas, antialias:true});
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

/* sky-gradient backdrop (matches the Cycles flat world fill) */
(function(){
  const g = new THREE.SphereGeometry(120, 24, 16), top = col('#5e93c9'), bot = col('#e7ddc4'), c = [];
  const v = new THREE.Vector3(), p = g.attributes.position;
  for(let i=0;i<p.count;i++){v.fromBufferAttribute(p,i).normalize();const t=Math.max(0,v.y);
    c.push(bot.r+(top.r-bot.r)*t, bot.g+(top.g-bot.g)*t, bot.b+(top.b-bot.b)*t);}
  g.setAttribute('color', new THREE.Float32BufferAttribute(c,3));
  scene.add(new THREE.Mesh(g, new THREE.MeshBasicMaterial({vertexColors:true, side:THREE.BackSide, toneMapped:false})));
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
export function dressMaterials(root, flat=true){
  root.traverse(o => {
    if(!o.isMesh) return;
    o.castShadow = true; o.receiveShadow = true;
    const mats = Array.isArray(o.material) ? o.material : [o.material];
    mats.forEach(m => {
      if(flat) m.flatShading = true;
      m.metalness = Math.min(m.metalness||0, 0.2);
      const n = (m.name||'').toLowerCase();
      if(n.includes('terrain')){ m.vertexColors = true; m.color.setHex(0xffffff); m.map = null; m.emissiveMap = null; m.side = THREE.FrontSide; m.needsUpdate = true; return; }
      let tex = null;
      if(n.includes('stone'))      tex = TEX.stone;
      else if(n.includes('plank')) tex = TEX.plank;
      else if(n.includes('grass')) tex = TEX.grass;
      else if(n.includes('dirt'))  tex = TEX.dirt;
      else if(n.includes('sand'))  tex = TEX.sand;
      else if(n.includes('water')) tex = TEX.water;
      if(tex){ m.map = tex; m.color.setHex(0xffffff); }
      if(n.includes('water')){ m.transparent = true; m.opacity = 0.85; m.depthWrite = false; m.metalness = 0.0; m.roughness = 0.3; }
      m.needsUpdate = true;
    });
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
   hides them so the interior is visible when the player steps inside. */
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
