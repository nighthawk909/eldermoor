/* =====================================================================
   ELDERMOOR - runtime skin/hair recolor for the KayKit rigged avatars.

   The KayKit characters ship ONE baked 1024x1024 atlas per model, so the
   character creator's skin-tone / hair-colour picks can't be applied as
   material colours. Instead we retint the atlas itself on a canvas:

     - tools/bake_tint_masks.py pre-bakes a per-model mask PNG
       (assets/ext/characters/masks/<Model>_mask.png) from the glb's UV
       islands: R channel = skin texels, G channel = hair/beard texels.
     - tint() draws the model's live atlas to a canvas, remaps every masked
       texel to the target colour scaled by the texel's own luminance
       (shading survives, painted details like eyes stay untouched), and
       swaps the material map for the tinted CanvasTexture.

   Works on any GLTFLoader-loaded KayKit scene (player avatar, creator
   preview). Fully defensive: any failure (no THREE, missing mask, tainted
   canvas) resolves false and leaves the original texture in place.

   Exposes window.EMTINT = { tint, modelFile }. main.js wiring not needed:
   avatar.js imports initGlbTint() directly.
   ===================================================================== */

/* model key (avatar.js pickModelKey) -> mask/atlas identity */
const MODEL_FILES = {
  knight: 'Knight', mage: 'Mage', rogue: 'Rogue',
  rogue_hooded: 'Rogue_Hooded', barbarian: 'Barbarian',
};
const MASK_DIR = 'assets/ext/characters/masks/';

/* luminance reference of each family's original atlas colour (must mirror
   TINT_BASE in tools/bake_tint_masks.py). Tinting maps
   out = target * lum(texel)/lum(base), so a texel exactly at the base colour
   becomes exactly the target colour, shading scales around it. */
const SKIN_BASE = [0xf6, 0xc0, 0x9c];
const HAIR_BASE = {
  knight: [0xe3, 0xbe, 0x8f], barbarian: [0x9a, 0x92, 0x8a],
  rogue: [0xa2, 0x61, 0x49], rogue_hooded: [0xa2, 0x61, 0x49],
  mage: [0x2a, 0x26, 0x29],
};

function lum(r, g, b){ return 0.299*r + 0.587*g + 0.114*b; }
function hex2rgb(hex){
  const n = parseInt(String(hex || '').replace('#',''), 16);
  if(isNaN(n)) return null;
  return [(n>>16)&255, (n>>8)&255, n&255];
}

/* per-model cache: { base:ImageData(atlas), mask:ImageData, w, h } */
const cache = {};

function loadImage(src){
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = src;
  });
}

function imageData(img, w, h){
  const cv = document.createElement('canvas');
  cv.width = w; cv.height = h;
  const cx = cv.getContext('2d', { willReadFrequently: true });
  cx.drawImage(img, 0, 0, w, h);
  return cx.getImageData(0, 0, w, h);
}

/* find EVERY textured material in a loaded KayKit scene. GLTFLoader r128
   clones the atlas material per variant (SkinnedMesh bodies get a
   skinning:true clone; static gear nodes keep the original), so tinting a
   single instance leaves the visible body on the untinted clone — the swap
   must hit them all. */
function findMaterials(root){
  const found = [];
  root.traverse(o => {
    if(!o.isMesh || !o.material) return;
    const ms = Array.isArray(o.material) ? o.material : [o.material];
    ms.forEach(m => {
      if(m && m.map && m.map.image && found.indexOf(m) < 0) found.push(m);
    });
  });
  return found;
}

/* atlas + mask ImageData for a model, cached after the first tint. The
   atlas is read off the material's ORIGINAL texture image (the glb-embedded
   one), so alignment with the baked mask is guaranteed. */
async function ensureCache(modelKey, mat){
  if(cache[modelKey]) return cache[modelKey];
  const orig = mat.userData.emOrigMap || mat.map;
  const img = orig.image;
  const w = img.width || 1024, h = img.height || 1024;
  const base = imageData(img, w, h);
  const maskImg = await loadImage(MASK_DIR + MODEL_FILES[modelKey] + '_mask.png');
  const mask = imageData(maskImg, w, h);
  cache[modelKey] = { base, mask, w, h };
  return cache[modelKey];
}

/* Retint a loaded KayKit scene's atlas to the given skin/hair colours.
   Resolves true when the tinted texture is live on the material. */
async function tint(root, modelKey, skinHex, hairHex){
  try {
    const T = window.THREE;
    if(!T || !root || !MODEL_FILES[modelKey]) return false;
    const mats = findMaterials(root);
    if(!mats.length) return false;
    const skin = hex2rgb(skinHex), hair = hex2rgb(hairHex);
    if(!skin && !hair) return false;

    const { base, mask, w, h } = await ensureCache(modelKey, mats[0]);
    const out = new ImageData(new Uint8ClampedArray(base.data), w, h);
    const d = out.data, mk = mask.data;
    const sBase = lum(SKIN_BASE[0], SKIN_BASE[1], SKIN_BASE[2]);
    const hb = HAIR_BASE[modelKey] || [0x80,0x80,0x80];
    const hBase = Math.max(8, lum(hb[0], hb[1], hb[2]));
    for(let i = 0; i < d.length; i += 4){
      let target = null, ratio = 1;
      if(skin && mk[i] > 127){          // R channel = skin
        target = skin; ratio = lum(d[i], d[i+1], d[i+2]) / sBase;
      } else if(hair && mk[i+1] > 127){ // G channel = hair
        target = hair; ratio = lum(d[i], d[i+1], d[i+2]) / hBase;
      }
      if(target){
        d[i]   = Math.min(255, target[0] * ratio);
        d[i+1] = Math.min(255, target[1] * ratio);
        d[i+2] = Math.min(255, target[2] * ratio);
      }
    }
    const cv = document.createElement('canvas');
    cv.width = w; cv.height = h;
    cv.getContext('2d').putImageData(out, 0, 0);
    const ref = mats[0].userData.emOrigMap || mats[0].map;
    const tex = new T.CanvasTexture(cv);
    tex.flipY = ref.flipY;              // glTF textures are flipY=false
    if('encoding' in tex && ref.encoding !== undefined) tex.encoding = ref.encoding;
    if('colorSpace' in tex && ref.colorSpace !== undefined) tex.colorSpace = ref.colorSpace;
    tex.magFilter = ref.magFilter; tex.minFilter = ref.minFilter;
    tex.wrapS = ref.wrapS; tex.wrapT = ref.wrapT;
    tex.needsUpdate = true;
    let disposed = null;                // the same tint texture may be shared by several materials
    mats.forEach(mat => {
      const orig = mat.userData.emOrigMap || mat.map;
      mat.userData.emOrigMap = orig;    // keep for re-tints/reset
      const old = mat.map;
      mat.map = tex;
      mat.needsUpdate = true;
      if(old && old !== orig && old !== tex && old !== disposed && old.dispose){
        old.dispose(); disposed = old;  // free a previous tint exactly once
      }
    });
    return true;
  } catch(e){
    console.warn('[glb-tint] tint failed:', e);
    return false;
  }
}

export function initGlbTint(){
  if(typeof window === 'undefined') return null;
  if(window.EMTINT) return window.EMTINT;
  window.EMTINT = { tint, modelFile: k => MODEL_FILES[k] || null };
  return window.EMTINT;
}

export default initGlbTint;
