/* =====================================================================
   ELDERMOOR - global game tick (SYS0). One authoritative ~0.6s clock that
   every action system (combat, skilling, future timers) subscribes to, so
   hits and gather/produce rolls all advance on the SAME cadence instead of
   each system running its own independent setInterval (OSRS behaviour: one
   server tick drives everything).

   window.EMTICK:
     subscribe(fn)   -> registers fn(tickCount); returns an unsubscribe fn.
     unsubscribe(fn) -> removes fn.
     count()         -> ticks elapsed since boot.
     tickMs          -> the tick period (600).

   The interval is created lazily on the first subscriber and torn down when
   the last one leaves, so an idle client burns no timer. Subscriber errors
   are isolated (one throwing system never stalls the others or the clock).
   Self-contained + defensive: no-ops gracefully without a window/setInterval.
   ===================================================================== */

const TICK_MS = 600;            // OSRS-style game tick (~0.6s)

let count = 0;
let timer = null;
const subs = new Set();

function fire(){
  count++;
  // iterate a snapshot so a subscriber may (un)subscribe from inside its handler
  for (const fn of Array.from(subs)){
    try { fn(count); } catch (e) { try { console.warn('[tick] subscriber failed:', e); } catch (_){} }
  }
}

function ensureRunning(){
  if (timer == null && subs.size > 0 && typeof setInterval === 'function'){
    timer = setInterval(fire, TICK_MS);
  }
}
function maybeStop(){
  if (timer != null && subs.size === 0 && typeof clearInterval === 'function'){
    clearInterval(timer); timer = null;
  }
}

function subscribe(fn){
  if (typeof fn !== 'function') return () => {};
  subs.add(fn);
  ensureRunning();
  return () => unsubscribe(fn);
}
function unsubscribe(fn){
  subs.delete(fn);
  maybeStop();
}

export function initTick(){
  if (typeof window === 'undefined') return null;
  if (window.EMTICK) return window.EMTICK;
  window.EMTICK = {
    subscribe,
    unsubscribe,
    tickMs: TICK_MS,
    count: () => count,
  };
  return window.EMTICK;
}

export default initTick;
