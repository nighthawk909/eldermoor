// Dev-only manual-QA harness for Movement (#3). Top-down 2D canvas so we can SEE/TAP it.
import { TickEngine } from '../sim/tick.js';
import { makeRNG } from '../sim/rng.js';
import { makeWorld, addEntity, setBlocked, isBlocked } from '../sim/world.js';
import { movementSystem, walkTo, findPath, type MoveState } from '../sim/movement.js';

const TILE = 30;
const GW = 20, GH = 14;

const world = makeWorld(GW, GH);
// a wall with a gap, so routing-around is visible
for (let y = 0; y <= 9; y++) setBlocked(world.grid, 10, y, true);
for (let x = 4; x <= 14; x++) setBlocked(world.grid, x, 11, true);
const player = addEntity(world, { id: 'p', type: 'player', tile: { x: 2, y: 6 } });
let target: { x: number; y: number } | null = null;

const engine = new TickEngine({ world, rng: makeRNG(1), systems: [movementSystem] });
let lastTickAt = performance.now();
engine.onTick(() => { lastTickAt = performance.now(); });
engine.start();

const canvas = document.getElementById('c') as HTMLCanvasElement;
const ctx = canvas.getContext('2d')!;
function resize() { canvas.width = GW * TILE; canvas.height = GH * TILE; }
resize();

canvas.addEventListener('pointerdown', (ev) => {
  const r = canvas.getBoundingClientRect();
  const tx = Math.floor((ev.clientX - r.left) / TILE);
  const ty = Math.floor((ev.clientY - r.top) / TILE);
  if (tx < 0 || ty < 0 || tx >= GW || ty >= GH) return;
  target = { x: tx, y: ty };
  walkTo(player, world.grid, tx, ty);
});

function draw() {
  requestAnimationFrame(draw);
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  // tiles
  for (let y = 0; y < GH; y++) for (let x = 0; x < GW; x++) {
    ctx.fillStyle = isBlocked(world.grid, x, y) ? '#3a424c' : '#243a24';
    ctx.fillRect(x * TILE + 1, y * TILE + 1, TILE - 2, TILE - 2);
  }
  // target marker
  if (target) {
    ctx.strokeStyle = '#e7c64f'; ctx.lineWidth = 2;
    ctx.strokeRect(target.x * TILE + 4, target.y * TILE + 4, TILE - 8, TILE - 8);
  }
  // player (interpolated between tiles within the tick)
  const m = player.move as MoveState | undefined;
  const alpha = Math.min(1, (performance.now() - lastTickAt) / 600);
  let px = player.tile!.x, py = player.tile!.y;
  if (m && m.from && m.to && m.sinceTick === engine.tickCount) {
    px = m.from.x + (m.to.x - m.from.x) * alpha;
    py = m.from.y + (m.to.y - m.from.y) * alpha;
  }
  ctx.fillStyle = '#7fd0ff';
  ctx.beginPath();
  ctx.arc((px + 0.5) * TILE, (py + 0.5) * TILE, TILE * 0.34, 0, Math.PI * 2);
  ctx.fill();
}
draw();

(window as unknown as { __mv: unknown }).__mv = { engine, player, world, walkTo, findPath };
