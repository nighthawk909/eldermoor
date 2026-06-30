/* =====================================================================
   ELDERMOOR - dialogue module. Owns the #dlg queue and conversation state
   (sayLines / talk / nextDlg / prayAtAltar). `chat.npc` is the NPC currently
   in conversation (freezes their wander) and is read by npc.updateNpcs.
   ===================================================================== */
import { buzz } from './engine.js';
import { glow } from './player.js';

const dlgEl = document.getElementById('dlg');
let dlgQ = [], dlgNpc = null;
export const chat = { npc: null };   // chat.npc = NPC currently in conversation (freezes their wander)

// --- range-watch: auto-close the dialogue when the player walks out of the
// talking NPC's talkRange (or the NPC has no live position, e.g. the altar
// stays put so this simply never fires for it). Self-contained rAF loop so
// this file doesn't need to import player.js (which imports talk() back -
// would be circular); reads the live position main.js already publishes.
let rangeWatchHandle = null;
function liveStr(){
  if(typeof window === 'undefined') return null;
  return window.EMPLAYERPOS || null;
}
function startRangeWatch(npc){
  stopRangeWatch();
  if(!npc || typeof npc.x !== 'number' || typeof npc.z !== 'number' || !npc.talkRange) return;
  const tick = ()=>{
    if(chat.npc !== npc){ rangeWatchHandle = null; return; }   // conversation already ended/replaced
    const p = liveStr();
    if(p){
      const d = Math.hypot(npc.x - p.x, npc.z - p.z);
      if(d > npc.talkRange + 0.35){    // small slack so a single jittery frame can't clip the chat
        closeDialogue();
        return;
      }
    }
    rangeWatchHandle = (typeof requestAnimationFrame === 'function')
      ? requestAnimationFrame(tick)
      : setTimeout(tick, 100);
  };
  rangeWatchHandle = (typeof requestAnimationFrame === 'function')
    ? requestAnimationFrame(tick)
    : setTimeout(tick, 100);
}
function stopRangeWatch(){
  if(rangeWatchHandle == null) return;
  if(typeof cancelAnimationFrame === 'function') cancelAnimationFrame(rangeWatchHandle);
  else clearTimeout(rangeWatchHandle);
  rangeWatchHandle = null;
}

// Unconditionally tear down ANY in-progress conversation (flat queue or
// branching tree) so a new one can start clean, or so an explicit
// close/walk-away can end it. Safe to call when nothing is open.
export function closeDialogue(){
  stopRangeWatch();
  if(treeState){ teardownTreeUI(); treeState = null; }
  dlgQ = []; dlgNpc = null;
  if(dlgEl) dlgEl.style.display = 'none';
  chat.npc = null;
}
if(typeof window !== 'undefined') window.EMDLG = { close: closeDialogue };

export function sayLines(name, lines){
  // NOTE: does not call closeDialogue() itself - talk()/prayAtAltar() already
  // closed any prior conversation before calling this, and closing here would
  // also wipe the chat.npc + range-watch that talk() just set up for this NPC.
  if(treeState){ teardownTreeUI(); treeState = null; }   // still guard against stray tree UI
  dlgNpc = {name}; dlgQ = lines.slice(); buzz(20); nextDlg();
}
export function talk(npc){
  closeDialogue();   // starting a NEW conversation always cleanly replaces any previous one
  chat.npc = npc;
  startRangeWatch(npc);
  // Try branching tree first: look up by npc.id, then by lower-cased name.
  const map = emData() && emData().dialogue;
  const key = map && (
    (npc.id      && map[npc.id])      ? npc.id      :
    (npc.name    && map[npc.name])    ? npc.name    :
    (npc.name    && map[npc.name.toLowerCase()]) ? npc.name.toLowerCase() : null
  );
  if(key){
    runDialogue(key);   // tree runner sets its own dlgNpc / treeState; chat.npc already set
    return;
  }
  // No tree found - fall back to flat line queue.
  sayLines(npc.name, npc.lines);
}
export function prayAtAltar(){
  closeDialogue();   // praying always cleanly replaces any previous conversation, same as talk()
  glow.t = 1.6; buzz(30);
  if(window.EMHUD){ EMHUD.addXp('Prayer', 7); EMHUD.addChat('You pray at the altar.','', true); }
  sayLines('Altar', ['You kneel before the altar and offer a quiet prayer.',
                     'A gentle warmth settles over you. The Light grants you Prayer.']); }
export function nextDlg(){
  if(treeState){ treeAdvance(); return; }   // tree owns advancement while active
  if(!dlgQ.length){ closeDialogue(); return; }
  document.getElementById('dlgwho').textContent = dlgNpc.name;
  document.getElementById('dlgtx').textContent  = dlgQ.shift();
  dlgEl.style.display='block'; buzz(12);
}

/* =====================================================================
   Branching dialogue-tree runner (additive). Consumes a tree from
   window.EMDATA.dialogue[npcId] = { start?, nodes:{ id: node } } and
   renders into the SAME #dlg box. Falls back to flat sayLines if no tree.

   Node schema (all fields optional except text):
     {
       speaker : 'npc' | 'player'        // who is talking (defaults 'npc')
       text    : string                  // the line shown in #dlgtx
       options : [{ label, goto }]        // player choices -> next node id
       give    : 'itemId' | {id,n} | [..] // grants via EMHUD.giveItem
       action  : 'complete:LN' | string  // fires CustomEvent('em-lesson')
       next    : 'nodeId'                // auto-advance target (no options)
     }
   A node with neither options nor next ends the conversation.
   ===================================================================== */
let treeState = null;   // { npcId, name, tree, nodeId } while a tree runs

function emData(){ return (typeof window!=='undefined' && window.EMDATA) ? window.EMDATA : null; }

// Resolve treeOrId into a tree object: either a literal tree or an npcId key.
function resolveTree(npcId, treeOrId){
  if(treeOrId && typeof treeOrId === 'object' && treeOrId.nodes) return treeOrId;
  const data = emData();
  const map = data && data.dialogue;
  if(!map) return null;
  const key = (typeof treeOrId === 'string' && treeOrId) ? treeOrId : npcId;
  const t = map[key];
  return (t && t.nodes) ? t : null;
}

function nodeById(tree, id){ return tree && tree.nodes ? tree.nodes[id] : null; }
function startNodeId(tree){
  if(tree.start && tree.nodes[tree.start]) return tree.start;
  const keys = Object.keys(tree.nodes||{});
  return keys.length ? keys[0] : null;
}

// Public entry point. Returns true if a tree ran, false if it fell back.
export function runDialogue(npcId, treeOrId){
  const tree = resolveTree(npcId, treeOrId);
  if(!tree){
    // Fall back to the flat queue if the npc exposes lines, else a stub line.
    const lines = (treeOrId && treeOrId.lines) || null;
    if(lines){ sayLines(treeOrId.name || npcId, lines); }
    return false;
  }
  const startId = startNodeId(tree);
  if(!startId){ return false; }
  // Tree mode takes over the box; clear any flat queue.
  dlgQ = [];
  const name = tree.name || (treeOrId && treeOrId.name) || npcId;
  treeState = { npcId, name, tree, nodeId: startId };
  renderTreeNode();
  return true;
}

function teardownTreeUI(){
  const opts = document.getElementById('dlgopts'); if(opts) opts.remove();
  const cont = document.getElementById('dlgcont'); if(cont) cont.remove();
  const btn = document.getElementById('dlgbtn'); if(btn) btn.style.display='';
}

function endTree(){
  closeDialogue();   // shared teardown: stops range-watch, clears tree/queue state, hides #dlg
}

// Apply a node\'s side effects (give / action) exactly once on entry.
function applyNodeEffects(node){
  if(node.give){
    const grants = Array.isArray(node.give) ? node.give : [node.give];
    for(const g of grants){
      const id = (g && typeof g === 'object') ? g.id : g;
      const n  = (g && typeof g === 'object' && g.n) ? g.n : 1;
      if(id && window.EMHUD && typeof window.EMHUD.giveItem === 'function'){
        window.EMHUD.giveItem(id, n);
      }
    }
  }
  if(node.action){
    if(typeof window !== 'undefined' && typeof window.dispatchEvent === 'function'){
      window.dispatchEvent(new CustomEvent('em-lesson', { detail: node.action }));
    }
  }
}

function renderTreeNode(){
  if(!treeState){ return; }
  const node = nodeById(treeState.tree, treeState.nodeId);
  if(!node){ endTree(); return; }

  applyNodeEffects(node);

  const speaker = node.speaker === 'player' ? 'You' : treeState.name;
  document.getElementById('dlgwho').textContent = speaker;
  document.getElementById('dlgtx').textContent  = node.text || '';
  dlgEl.style.display = 'block'; buzz(12);

  // Reset transient UI from the previous node.
  teardownTreeUI();

  const opts = Array.isArray(node.options) ? node.options : null;
  const btn  = document.getElementById('dlgbtn');

  if(opts && opts.length){
    if(btn) btn.style.display='none';   // options replace the Continue button
    const wrap = document.createElement('div');
    wrap.id = 'dlgopts';
    wrap.className = 'dlgopts';
    opts.slice(0,5).forEach((o, i)=>{
      const b = document.createElement('button');
      b.className = 'dlgopt';
      b.dataset.goto = o.goto || '';
      b.textContent = (i+1) + '. ' + (o.label || '...');
      b.onclick = ()=> chooseOption(o.goto);
      wrap.appendChild(b);
    });
    const go = dlgEl.querySelector('.go') || dlgEl;
    go.appendChild(wrap);
  } else {
    // No options: a ▼ continue affordance; click/Space advances.
    if(btn) btn.style.display='';
    const cont = document.createElement('span');
    cont.id = 'dlgcont';
    cont.className = 'dlgcont';
    cont.textContent = '▼';
    cont.title = 'Continue';
    cont.onclick = treeAdvance;
    const go = dlgEl.querySelector('.go') || dlgEl;
    go.appendChild(cont);
  }
}

function chooseOption(goto){
  if(!treeState) return;
  if(!goto){ endTree(); return; }
  treeState.nodeId = goto;
  renderTreeNode();
}

// Advance a node that has no options (next -> id, else end).
function treeAdvance(){
  if(!treeState) return;
  const node = nodeById(treeState.tree, treeState.nodeId);
  if(node && Array.isArray(node.options) && node.options.length) return; // wait for choice
  if(node && node.next && nodeById(treeState.tree, node.next)){
    treeState.nodeId = node.next;
    renderTreeNode();
  } else {
    endTree();
  }
}

// Number keys 1-5 pick options; Space/Enter advances a non-branching node;
// Escape explicitly closes the dialogue (flat queue or tree, whichever is open).
if(typeof window !== 'undefined' && typeof window.addEventListener === 'function'){
  window.addEventListener('keydown', (e)=>{
    if(e.key === 'Escape' || e.key === 'Esc'){
      if(treeState || dlgQ.length || (dlgEl && dlgEl.style.display === 'block')){
        e.preventDefault();
        closeDialogue();
      }
      return;
    }
    if(!treeState) return;
    const node = nodeById(treeState.tree, treeState.nodeId);
    if(!node) return;
    if(Array.isArray(node.options) && node.options.length){
      const n = parseInt(e.key, 10);
      if(n >= 1 && n <= Math.min(5, node.options.length)){
        e.preventDefault();
        chooseOption(node.options[n-1].goto);
      }
    } else if(e.key === ' ' || e.key === 'Spacebar' || e.key === 'Enter'){
      e.preventDefault();
      treeAdvance();
    }
  });
}
