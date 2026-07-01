/* =====================================================================
   ELDERMOOR - skilling module (SYS1-7). Gather/produce actions on a
   ~600ms tick. Self-contained: reads the live globals (window.EMHUD,
   window.EMWORLD) and exposes window.EMSKILL. main.js calls initSkilling()
   once. No-ops gracefully when those globals are absent (e.g. unit / SSR).

   Model: each in-progress action runs a per-tick success roll. On success
   it grants the output item (EMHUD.giveItem) + XP (EMHUD.addXp), plays a
   chat line, and for gather verbs depletes the world node (EMWORLD.deplete).
   The action auto-stops on a full bag, on node depletion, or when the
   bound success condition lapses (e.g. logs/fire consumed).
   ===================================================================== */

const TICK_MS = 600;            // OSRS-style game tick (~0.6s)
const BAG_SLOTS = 28;

/* verb -> skill (matches assets/data/skills.json names) */
const SKILL = {
  chop:  'Woodcutting',
  mine:  'Mining',
  fish:  'Fishing',
  light: 'Firemaking',
  cook:  'Cooking',
  smelt: 'Smithing',
  smith: 'Smithing',
};

/* per-action recipe table. xp values mirror skills.json tutorialXp.
   chance is the per-tick success probability (kept gentle, OSRS-ish).
   output is the item id granted on success. */
const RECIPE = {
  chop:  { skill:'Woodcutting', xp:25, chance:0.30, output:'logs',
           start:'You swing your axe at the tree.', success:'You get some logs.' },
  mine:  { skill:'Mining', xp:35, chance:0.28, output:'copper-ore', outputPool:['copper-ore','tin-ore'],
           start:'You swing your pickaxe at the rock.', success:'You manage to mine some ore.' },
  fish:  { skill:'Fishing', xp:30, chance:0.32, output:'raw-shrimp',
           start:'You cast out your net...', success:'You catch some shrimp.' },
  light: { skill:'Firemaking', xp:40, chance:0.45, output:null, consume:'logs',
           start:'You attempt to light the logs.', success:'The fire catches and the logs begin to burn.' },
  cook:  { skill:'Cooking', xp:30, chance:0.70, output:'cooked-shrimp', burnt:'burnt-shrimp',
           start:'You cook the food on the fire.', success:'You cook the food. It smells great.' },
  smelt: { skill:'Smithing', xp:35, chance:1.0, output:'bronze-bar', consume2:['copper-ore','tin-ore'],
           start:'You place the ore into the furnace...', success:'You retrieve a bronze bar.' },
  smith: { skill:'Smithing', xp:50, chance:1.0, output:'bronze-dagger', consume:'bronze-bar',
           start:'You hammer the bar on the anvil...', success:'You forge a bronze dagger.' },
};

/* scenery node type -> verb (routes 'Chop down'/'Mine'/'Search' through here) */
const SCENERY_VERB = { tree:'chop', rock:'mine', bush:'fish' };

/* ----------------------------------------------------------------- helpers */
function hud(){ return (typeof window !== 'undefined' && window.EMHUD) || null; }
function world(){ return (typeof window !== 'undefined' && window.EMWORLD) || null; }

function chat(text){ const h = hud(); if(h && h.addChat) h.addChat(text, '', true); }

/* subscribe fn to the shared global game tick (window.EMTICK) so gather/produce
   rolls advance on the same cadence as combat. Falls back to a private setInterval
   at TICK_MS if the shared clock isn't present. Returns an unsubscribe function. */
function onTick(fn){
  if(typeof window !== 'undefined' && window.EMTICK && typeof window.EMTICK.subscribe === 'function'){
    return window.EMTICK.subscribe(fn);
  }
  if(typeof setInterval !== 'function') return () => {};
  const id = setInterval(fn, TICK_MS);
  return () => { if(typeof clearInterval === 'function') clearInterval(id); };
}

/* count free inventory slots, honouring stackables already in the bag */
function bagFull(outputId){
  const h = hud();
  if(!h || !h.getInv || !h.getItems) return false;        // can't tell -> assume room
  const inv = h.getInv() || [];
  if(inv.length < BAG_SLOTS) return false;                 // a free slot exists
  if(!outputId) return false;                              // no item to store (e.g. lighting a fire)
  const items = h.getItems() || {};
  const def = items[outputId];
  if(def && def.stackable && inv.find(x => x && x.id === outputId)) return false; // stacks onto existing
  return true;                                             // 28 used and no stack to merge -> full
}

/* does the bag hold this item id? */
function hasItem(id){
  const h = hud();
  if(!h || !h.getInv) return true;                         // unknown -> don't block
  return !!(h.getInv() || []).find(x => x && x.id === id);
}

function grantItem(id){ const h = hud(); if(h && h.giveItem && id) h.giveItem(id, 1); }
function grantXp(skill, amt){ const h = hud(); if(h && h.addXp) h.addXp(skill, amt); }

/* ----------------------------------------------------------------- action engine */
/* a single in-progress action is held in `active`. Starting a new one cancels it. */
let active = null;          // { verb, recipe, scenery, ctx, timer }

export function stop(reason){
  if(!active) return;
  const a = active; active = null;
  if(a.timer){ a.timer(); a.timer = null; }                 // unsubscribe from the shared tick
  if(reason) chat(reason);
}

/* gate: is this action still valid to keep ticking? returns null if OK,
   else a stop-reason string. Bound conditions (logs/ore/fire) are checked here. */
function gate(a){
  const r = a.recipe;
  if(bagFull(r.output)) return 'Your inventory is too full to hold any more.';
  if(a.scenery && world() && world().isDepleted && world().isDepleted(a.scenery)) return null; // handled at success
  if(r.consume && !hasItem(r.consume)) return 'You have run out of ' + r.consume.replace(/-/g,' ') + '.';
  if(r.consume2 && !r.consume2.every(hasItem)) return 'You do not have all the ore you need.';
  return null;
}

/* run one tick: roll for success, grant rewards, handle depletion / one-shots */
function tick(){
  const a = active; if(!a) return;
  const r = a.recipe;

  const reason = gate(a);
  if(reason){ stop(reason); return; }

  // per-tick success roll
  if(Math.random() >= r.chance) return;                    // no success this tick - keep going

  // --- success ---
  // cooking can burn: success roll passed = cooked; otherwise a separate burn split
  if(r.burnt && Math.random() < 0.20){
    grantItem(r.burnt);
    chat('Oops! You accidentally burn the food.');
  } else {
    if(r.output) grantItem(r.output);
    chat(r.success);
  }
  grantXp(r.skill, r.xp);

  // consume inputs (best-effort; HUD owns the authoritative bag, so this is advisory)
  // gather verbs deplete the world node and stop (one resource per node, OSRS-style)
  if(a.scenery){
    const w = world();
    if(w && w.deplete) w.deplete(a.scenery);
    stop();                                                // node consumed -> action ends
    return;
  }

  // produce verbs that are one-shot (smelt/smith/light/cook a single item) end here
  if(r.oneShot){ stop(); return; }
}

/* begin an action: spec the chunk, announce, then tick on the game clock */
function begin(verb, opts){
  const r = RECIPE[verb];
  if(!r){ return false; }
  if(!hud()){ return false; }                              // no HUD -> nothing to grant into; no-op

  // pre-flight: full bag stops before we start
  if(bagFull(r.output)){ chat('Your inventory is too full to hold any more.'); return false; }
  // pre-flight: required inputs present?
  if(r.consume && !hasItem(r.consume)){ chat('You need ' + r.consume.replace(/-/g,' ') + ' first.'); return false; }
  if(r.consume2 && !r.consume2.every(hasItem)){ chat('You need both ores to make a bronze bar.'); return false; }

  stop();                                                  // cancel any prior action
  active = {
    verb, recipe: Object.assign({}, r, opts && opts.recipe),
    scenery: (opts && opts.scenery) || null,
    ctx: (opts && opts.ctx) || null,
    timer: null,
  };
  // single-grant produce verbs end after the first success
  if(verb === 'smelt' || verb === 'smith' || verb === 'light' || verb === 'cook'){
    active.recipe.oneShot = true;
  }
  chat(active.recipe.start);
  active.timer = onTick(tick);                               // beat on the shared game tick
  return true;
}

/* ----------------------------------------------------------------- Make-X helpers */

/* Run the produce logic for `verb` up to `qty` times, one unit per TICK_MS.
   Stops early if the bag fills or required inputs are exhausted.
   Returns void; side-effects via HUD. */
function runProduceQty(verb, qty){
  const r = RECIPE[verb];
  if(!r) return;
  let remaining = qty;

  stop(); // cancel any existing action

  // one attempt per shared game tick: gate, roll, grant; on a miss we simply
  // stay subscribed and retry next tick (matches the prior re-tick-on-miss path).
  function step(){
    if(!active) return;                                       // stopped between ticks
    if(remaining <= 0){ stop(); return; }
    // gate check before each unit
    if(bagFull(r.output)){ stop('Your inventory is too full to hold any more.'); return; }
    if(r.consume && !hasItem(r.consume)){
      stop('You have run out of ' + r.consume.replace(/-/g, ' ') + '.'); return;
    }
    if(r.consume2 && !r.consume2.every(hasItem)){ stop('You do not have all the materials you need.'); return; }

    // success roll (always lands for chance===1.0 verbs like smith; cook can miss/burn)
    if(Math.random() >= r.chance) return;                    // miss this tick - retry next tick
    if(verb === 'cook' && r.burnt && Math.random() < 0.20){
      grantItem(r.burnt);
      chat('Oops! You accidentally burn the food.');
    } else {
      if(r.output) grantItem(r.outputPool ? r.outputPool[Math.floor(Math.random()*r.outputPool.length)] : r.output);
      chat(r.success);
    }
    grantXp(r.skill, r.xp);

    remaining--;
    if(remaining <= 0){ stop(); }                            // batch done - unsubscribe
  }

  active = { verb, recipe: Object.assign({}, r), scenery: null, ctx: null, timer: null };
  chat(r.start);
  active.timer = onTick(step);                               // beat on the shared game tick
}

/* Open Make-X for smithing (anvil + bronze-bar -> products).
   Falls back to single-item smith if EMMAKE is absent. */
function smithMakeX(){
  if(typeof window !== 'undefined' && window.EMMAKE && window.EMMAKE.open){
    window.EMMAKE.open({
      title: 'What would you like to make?',
      products: [
        { id: 'bronze-dagger', name: 'Bronze dagger', requires: ['bronze-bar'] },
      ],
      onMake: function(productId, qty){
        // only bronze-dagger is currently supported; route through smith recipe
        runProduceQty('smith', qty);
      },
    });
    return true;
  }
  // fallback: make one
  return begin('smith');
}

/* Open Make-X for cooking (range/fire -> cooked product).
   Falls back to single-item cook if EMMAKE is absent. */
function cookMakeX(food, fire){
  if(typeof window !== 'undefined' && window.EMMAKE && window.EMMAKE.open){
    const r = RECIPE.cook;
    window.EMMAKE.open({
      title: 'What would you like to cook?',
      products: [
        { id: r.output, name: 'Cooked shrimp', requires: ['raw-shrimp'] },
      ],
      onMake: function(productId, qty){
        runProduceQty('cook', qty);
      },
    });
    return true;
  }
  // fallback: cook one
  return begin('cook', { ctx: { food, fire } });
}

/* ----------------------------------------------------------------- public verbs */
function chop(scenery){ return begin('chop', { scenery }); }
function mine(scenery){ return begin('mine', { scenery }); }
function fish(spot){    return begin('fish', { scenery: spot }); }
function light(logsUseTarget){ return begin('light', { ctx: logsUseTarget }); }
function cook(food, fire){ return cookMakeX(food, fire); }
function smelt(){ return begin('smelt'); }
function smith(){ return smithMakeX(); }

/* route a scenery `kind:'scenery'` interaction (Chop down / Mine / Search) here.
   The interact layer can call window.EMSKILL.doSceneryVerb(scenery). Returns true
   if the verb was handled by skilling, false if it's not a gather node. */
function doSceneryVerb(scenery){
  if(!scenery || scenery.kind !== 'scenery') return false;
  const verb = SCENERY_VERB[scenery.type];
  if(!verb) return false;
  const w = world();
  if(w && w.isDepleted && w.isDepleted(scenery)){ chat('There is nothing left to gather here.'); return true; }
  return begin(verb, { scenery });
}

/* ----------------------------------------------------------------- init */
export function initSkilling(){
  if(typeof window === 'undefined') return null;
  const api = {
    chop, mine, fish, light, cook, smelt, smith,
    doSceneryVerb,
    stop,
    isActive: () => !!active,
    SKILL, RECIPE, SCENERY_VERB,
  };
  window.EMSKILL = Object.assign(window.EMSKILL || {}, api);
  return window.EMSKILL;
}

export default initSkilling;
