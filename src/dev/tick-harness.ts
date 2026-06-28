// Dev-only manual-QA harness for the Tick engine (not part of the game build).
import { TickEngine } from '../sim/tick.js';
import { makeRNG } from '../sim/rng.js';
import { makeWorld } from '../sim/world.js';

const tickEl = document.getElementById('tick') as HTMLElement;
const statusEl = document.getElementById('status') as HTMLElement;

const engine = new TickEngine({ world: makeWorld(), rng: makeRNG(1), systems: [] });
engine.onTick((t) => { tickEl.textContent = String(t); });

const render = () => { statusEl.textContent = engine.running ? 'running' : 'paused'; };

document.getElementById('pause')!.addEventListener('click', () => { engine.stop(); render(); });
document.getElementById('resume')!.addEventListener('click', () => { engine.start(); render(); });
document.getElementById('step')!.addEventListener('click', () => {
  engine.step(1);
  tickEl.textContent = String(engine.tickCount);
  render();
});

engine.start();
render();
(window as unknown as { __tick: TickEngine }).__tick = engine;
