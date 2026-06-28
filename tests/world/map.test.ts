import { describe, it, expect } from 'vitest';
import { ASSET_KINDS, WALKABLE_TERRAIN, type AssetKind } from '../../src/world/mapTypes.js';
import { REGISTERED_KINDS } from '../../src/world/assetRegistry.js';
import { tutorialIsland } from '../../src/world/maps/tutorialIsland.js';

const inBounds = (x: number, y: number, w: number, h: number) => x >= 0 && y >= 0 && x < w && y < h;

describe('Asset registry', () => {
  it('covers every declared ASSET_KIND (no id without a factory)', () => {
    for (const kind of ASSET_KINDS) expect(REGISTERED_KINDS).toContain(kind);
  });
  it('declares no extra kinds the data layer does not know about', () => {
    for (const kind of REGISTERED_KINDS) expect(ASSET_KINDS).toContain(kind as AssetKind);
  });
});

describe('Tutorial Island map data', () => {
  const m = tutorialIsland;

  it('player start is inside the grid', () => {
    expect(inBounds(m.start.x, m.start.y, m.width, m.height)).toBe(true);
  });

  it('every spawn references a known asset kind', () => {
    for (const s of m.spawns) expect(ASSET_KINDS).toContain(s.kind);
    for (const d of m.decor ?? []) expect(ASSET_KINDS).toContain(d.kind);
    for (const sc of m.scatter ?? []) expect(ASSET_KINDS).toContain(sc.kind);
  });

  it('every spawn/decor tile is inside the grid', () => {
    for (const s of m.spawns) expect(inBounds(s.tile.x, s.tile.y, m.width, m.height)).toBe(true);
    for (const d of m.decor ?? []) expect(inBounds(d.tile.x, d.tile.y, m.width, m.height)).toBe(true);
    for (const [x, y] of m.blockedTiles ?? []) expect(inBounds(x, y, m.width, m.height)).toBe(true);
  });

  it('spawn ids are unique', () => {
    const ids = m.spawns.map((s) => s.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('no spawn sits on the player start tile', () => {
    for (const s of m.spawns) expect(s.tile.x === m.start.x && s.tile.y === m.start.y).toBe(false);
  });

  it('scatter counts are positive and bounded', () => {
    for (const sc of m.scatter ?? []) {
      expect(sc.count).toBeGreaterThan(0);
      expect(sc.count).toBeLessThan(m.width * m.height);
    }
  });

  it('every terrain rect lies fully inside the grid', () => {
    for (const t of m.terrain ?? []) {
      expect(t.x).toBeGreaterThanOrEqual(0);
      expect(t.y).toBeGreaterThanOrEqual(0);
      expect(t.x + t.w).toBeLessThanOrEqual(m.width);
      expect(t.y + t.h).toBeLessThanOrEqual(m.height);
      expect(t.w).toBeGreaterThan(0);
      expect(t.h).toBeGreaterThan(0);
    }
  });

  it('player start sits on a walkable terrain tile (not ocean/lake)', () => {
    const walkableAt = (x: number, y: number) =>
      (m.terrain ?? []).some((t) => WALKABLE_TERRAIN[t.kind] && x >= t.x && x < t.x + t.w && y >= t.y && y < t.y + t.h);
    if ((m.terrain ?? []).length) expect(walkableAt(m.start.x, m.start.y)).toBe(true);
  });
});
