import { describe, it, expect } from 'vitest';
import {
  makeWorld, makeGrid, inBounds, isBlocked, setBlocked,
  addEntity, removeEntity, getEntity, entitiesAt, serializeWorld,
} from '../../src/sim/world.js';

describe('World + grid + entities', () => {
  it('AC1: makeWorld(10,8) → 10×8 grid, all passable, no entities', () => {
    const w = makeWorld(10, 8);
    expect(w.grid.w).toBe(10);
    expect(w.grid.h).toBe(8);
    expect(w.grid.blocked.length).toBe(80);
    expect([...w.grid.blocked].every((b) => b === 0)).toBe(true);
    expect(w.entities.size).toBe(0);
  });

  it('AC2: setBlocked toggles exactly one tile; neighbours unaffected', () => {
    const g = makeGrid(10, 8);
    setBlocked(g, 3, 4, true);
    expect(isBlocked(g, 3, 4)).toBe(true);
    expect(isBlocked(g, 4, 4)).toBe(false);
    expect(isBlocked(g, 3, 5)).toBe(false);
    expect(isBlocked(g, 2, 4)).toBe(false);
    setBlocked(g, 3, 4, false);
    expect(isBlocked(g, 3, 4)).toBe(false);
  });

  it('AC2b: corners and last row/col index correctly', () => {
    const g = makeGrid(10, 8);
    setBlocked(g, 9, 7, true); // last tile
    expect(isBlocked(g, 9, 7)).toBe(true);
    expect(isBlocked(g, 0, 0)).toBe(false);
  });

  it('AC3: out-of-bounds is not in-bounds and counts as blocked', () => {
    const g = makeGrid(10, 8);
    expect(inBounds(g, -1, 0)).toBe(false);
    expect(inBounds(g, 10, 0)).toBe(false);
    expect(inBounds(g, 0, 8)).toBe(false);
    expect(isBlocked(g, -1, 0)).toBe(true);
    expect(isBlocked(g, 10, 0)).toBe(true);
  });

  it('AC4: addEntity stores/returns; duplicate throws; get + remove work', () => {
    const w = makeWorld();
    const e = addEntity(w, { id: 'p1', type: 'player', tile: { x: 1, y: 1 } });
    expect(e.id).toBe('p1');
    expect(getEntity(w, 'p1')).toBe(e);
    expect(() => addEntity(w, { id: 'p1' })).toThrow();
    expect(removeEntity(w, 'p1')).toBe(true);
    expect(removeEntity(w, 'p1')).toBe(false);
    expect(getEntity(w, 'p1')).toBeUndefined();
  });

  it('AC5: entitiesAt returns only entities on that tile (excludes tile-less)', () => {
    const w = makeWorld();
    addEntity(w, { id: 'a', tile: { x: 2, y: 3 } });
    addEntity(w, { id: 'b', tile: { x: 2, y: 3 } });
    addEntity(w, { id: 'c', tile: { x: 5, y: 5 } });
    addEntity(w, { id: 'd' }); // no tile
    const here = entitiesAt(w, 2, 3).map((e) => e.id).sort();
    expect(here).toEqual(['a', 'b']);
    expect(entitiesAt(w, 0, 0)).toEqual([]);
  });

  it('AC6: serializeWorld is insertion-order independent (sorted by id)', () => {
    const w1 = makeWorld();
    addEntity(w1, { id: 'z', tile: { x: 1, y: 1 } });
    addEntity(w1, { id: 'a', tile: { x: 2, y: 2 } });
    const w2 = makeWorld();
    addEntity(w2, { id: 'a', tile: { x: 2, y: 2 } });
    addEntity(w2, { id: 'z', tile: { x: 1, y: 1 } });
    expect(serializeWorld(w1)).toBe(serializeWorld(w2));
  });
});
