// Structural geometry for the overworld: terrain paint (grass/path/sand/floor/water).
// Buildings + fences land here in the next sub-increment. Faceted, palette-driven.
import * as THREE from 'three';
import type { TerrainKind } from '../world/mapTypes.js';

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
