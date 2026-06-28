// Structural geometry for the overworld: terrain paint (grass/path/sand/floor/water).
// Buildings + fences land here in the next sub-increment. Faceted, palette-driven.
import * as THREE from 'three';
import type { TerrainKind, BuildingDef, FenceDef } from '../world/mapTypes.js';

// World palette (CLAUDE.md §4): grass / dirt path / water / sand / interior floor.
const TERRAIN: Record<TerrainKind, { color: string; y: number; rough: number; metal: number; opacity: number }> = {
  grass: { color: '#4f8a3c', y: 0.012, rough: 1, metal: 0, opacity: 1 },
  path:  { color: '#8c6b40', y: 0.022, rough: 1, metal: 0, opacity: 1 },
  sand:  { color: '#d8c89a', y: 0.018, rough: 1, metal: 0, opacity: 1 },
  floor: { color: '#9a8a6a', y: 0.03, rough: 0.95, metal: 0, opacity: 1 },
  water: { color: '#2c6a82', y: 0.05, rough: 0.2, metal: 0.1, opacity: 0.92 },
};

/** A flat colored quad covering w×h tiles (1 tile = 1 world unit), laid on the ground plane. */
export function makeTerrainPlane(kind: TerrainKind, w: number, h: number): THREE.Mesh {
  const t = TERRAIN[kind];
  const mesh = new THREE.Mesh(
    new THREE.PlaneGeometry(w, h),
    new THREE.MeshStandardMaterial({
      color: new THREE.Color(t.color), flatShading: true, roughness: t.rough, metalness: t.metal,
      transparent: t.opacity < 1, opacity: t.opacity,
    }),
  );
  mesh.rotation.x = -Math.PI / 2;
  mesh.position.y = t.y;
  mesh.receiveShadow = true;
  return mesh;
}

function smat(hex: string, rough = 0.9): THREE.MeshStandardMaterial {
  return new THREE.MeshStandardMaterial({ color: new THREE.Color(hex), flatShading: true, roughness: rough });
}
function part(geo: THREE.BufferGeometry, m: THREE.Material, x: number, y: number, z: number): THREE.Mesh {
  const me = new THREE.Mesh(geo, m); me.position.set(x, y, z); me.castShadow = true; me.receiveShadow = true; return me;
}

const WALL_H = 1.3;
/** Building: 4 walls around the footprint perimeter (door tile left open) + a pitched roof.
 *  Geometry is centered on the footprint, so the loader places it at the footprint center tile. */
export function makeBuilding(def: BuildingDef): THREE.Group {
  const g = new THREE.Group();
  const wall = smat(def.wall ?? '#9a8358'), roof = smat(def.roof ?? '#7a3f2c', 0.95);
  const cx = (def.w - 1) / 2, cz = (def.h - 1) / 2; // footprint center in local tile units
  for (let ty = def.y; ty < def.y + def.h; ty++) {
    for (let tx = def.x; tx < def.x + def.w; tx++) {
      const onPerim = tx === def.x || tx === def.x + def.w - 1 || ty === def.y || ty === def.y + def.h - 1;
      if (!onPerim) continue;
      if (tx === def.door.x && ty === def.door.y) continue; // doorway
      g.add(part(new THREE.BoxGeometry(1, WALL_H, 1), wall, (tx - def.x) - cx, WALL_H / 2, (ty - def.y) - cz));
    }
  }
  // pitched roof: a flattened pyramid covering the footprint
  const roofMesh = part(new THREE.ConeGeometry(Math.max(def.w, def.h) * 0.82, 0.7, 4), roof, 0, WALL_H + 0.35, 0);
  roofMesh.rotation.y = Math.PI / 4; roofMesh.scale.set(def.w / Math.max(def.w, def.h), 1, def.h / Math.max(def.w, def.h));
  g.add(roofMesh);
  return g;
}

/** Fence: posts + two rails along a run of `len` tiles. Centered on the run for loader placement. */
export function makeFence(def: FenceDef): THREE.Group {
  const g = new THREE.Group();
  const m = smat(def.color ?? '#6b4a2c', 0.95);
  const horiz = def.dir === 'h';
  const mid = (def.len - 1) / 2;
  for (let i = 0; i < def.len; i++) {
    const a = i - mid; const x = horiz ? a : 0, z = horiz ? 0 : a;
    g.add(part(new THREE.BoxGeometry(0.12, 0.8, 0.12), m, x, 0.4, z)); // post
  }
  const railLen = def.len; const railGeo = horiz ? new THREE.BoxGeometry(railLen, 0.08, 0.06) : new THREE.BoxGeometry(0.06, 0.08, railLen);
  g.add(part(railGeo, m, 0, 0.55, 0));
  g.add(part(railGeo.clone(), m, 0, 0.28, 0));
  return g;
}
