import { describe, it, expect } from 'vitest';
import { TickEngine } from '../../src/sim/tick.js';
import { makeRNG } from '../../src/sim/rng.js';
import { makeWorld, addEntity, setBlocked, isBlocked, type Entity } from '../../src/sim/world.js';
import { movementSystem, walkTo, findPath, type MoveState } from '../../src/sim/movement.js';

function setup(w = 12, h = 12) {
  const world = makeWorld(w, h);
  const e = addEntity(world, { id: 'p', type: 'player', tile: { x: 0, y: 0 } });
  const engine = new TickEngine({ world, rng: makeRNG(1), systems: [movementSystem] });
  return { world, e, engine };
}
const T = (e: Entity) => e.tile!;
const mv = (e: Entity) => e.move as MoveState;

describe('Movement (tile, tick-stepped)', () => {
  it('AC1: walks 5 east in 5 ticks; one tile per tick', () => {
    const { world, e, engine } = setup();
    walkTo(e, world.grid, 5, 0);
    engine.step(1); expect(T(e)).toEqual({ x: 1, y: 0 });
    engine.step(1); expect(T(e)).toEqual({ x: 2, y: 0 });
    engine.step(3); expect(T(e)).toEqual({ x: 5, y: 0 });
    expect(mv(e).path.length).toBe(0);
  });

  it('AC2: running covers 2 tiles/tick → 5 east in 3 ticks', () => {
    const { world, e, engine } = setup();
    walkTo(e, world.grid, 5, 0);
    mv(e).running = true;
    engine.step(1); expect(T(e)).toEqual({ x: 2, y: 0 });
    engine.step(1); expect(T(e)).toEqual({ x: 4, y: 0 });
    engine.step(1); expect(T(e)).toEqual({ x: 5, y: 0 });
  });

  it('AC3: routes around a wall (gap at the bottom) and arrives; never enters a blocked tile', () => {
    const { world, e, engine } = setup();
    // vertical wall at x=5 for y=0..10, gap at y=11
    for (let y = 0; y <= 10; y++) setBlocked(world.grid, 5, y, true);
    walkTo(e, world.grid, 9, 0);
    for (let i = 0; i < 80 && mv(e).path.length > 0; i++) {
      engine.step(1);
      expect(isBlocked(world.grid, T(e).x, T(e).y)).toBe(false); // never on a blocked tile
    }
    expect(T(e)).toEqual({ x: 9, y: 0 });
  });

  it('AC4: unreachable target → stops at nearest reachable, never crosses the wall', () => {
    const { world, e, engine } = setup();
    for (let y = 0; y <= 11; y++) setBlocked(world.grid, 5, y, true); // full wall, no gap
    walkTo(e, world.grid, 9, 0);
    for (let i = 0; i < 80 && mv(e).path.length > 0; i++) engine.step(1);
    expect(isBlocked(world.grid, T(e).x, T(e).y)).toBe(false);
    expect(T(e).x).toBeLessThan(5);          // never crossed the wall
    expect(T(e)).not.toEqual({ x: 9, y: 0 }); // didn't reach the unreachable target
  });

  it('AC5: interact-walk (adjacent) stops adjacent to the object, not on it', () => {
    const { world, e } = setup();
    e.tile = { x: 0, y: 5 };
    setBlocked(world.grid, 5, 5, true); // object footprint
    const path = findPath(world.grid, e.tile, { x: 5, y: 5 }, { adjacent: true });
    const end = path[path.length - 1]!;
    const cheb = Math.max(Math.abs(end.x - 5), Math.abs(end.y - 5));
    expect(cheb).toBe(1);                 // adjacent
    expect(end).not.toEqual({ x: 5, y: 5 });
  });

  it('AC6: a new walk mid-path overrides the old destination', () => {
    const { world, e, engine } = setup();
    walkTo(e, world.grid, 5, 0);
    engine.step(1); expect(T(e)).toEqual({ x: 1, y: 0 });
    walkTo(e, world.grid, 1, 4); // new target
    for (let i = 0; i < 20 && mv(e).path.length > 0; i++) engine.step(1);
    expect(T(e)).toEqual({ x: 1, y: 4 });
  });

  it('AC7: diagonals cannot cut a blocked corner', () => {
    const open = makeWorld(4, 4);
    expect(findPath(open.grid, { x: 0, y: 0 }, { x: 1, y: 1 })).toEqual([{ x: 1, y: 1 }]); // legal diagonal
    const corner = makeWorld(4, 4);
    setBlocked(corner.grid, 1, 0, true);
    setBlocked(corner.grid, 0, 1, true);
    // only route to (1,1) would be a corner-cut diagonal ⇒ unreachable
    expect(findPath(corner.grid, { x: 0, y: 0 }, { x: 1, y: 1 })).toEqual([]);
  });
});
