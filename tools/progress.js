#!/usr/bin/env node
/* =====================================================================
   ELDERMOOR - fleet progress reporter (zero deps, cross-platform).

   Any agent or the orchestrator calls this to move a chunk on the board.
   It (1) merges the entry IMMUTABLY into ./progress.json (the single
   source the local dashboard polls) and (2) best-effort POSTs the same
   entry to /api/progress so the deployed dashboard updates too.

   Usage:
     node tools/progress.js set <id> <status> ["note"] [--agent NAME] [--title "..."] [--epic "..."]
     node tools/progress.js show

   <status> = queued | building | review | requeue | done | blocked | failed

   Examples:
     node tools/progress.js set C4 building "channel filters" --agent eldermoor-builder
     node tools/progress.js set C4 review  --agent eldermoor-builder
     node tools/progress.js set C4 done

   Set EM_PROGRESS_ENDPOINT to push to a deployed URL, e.g.
     EM_PROGRESS_ENDPOINT=https://eldermoor.vercel.app/api/progress
   ===================================================================== */

'use strict';
const fs = require('fs');
const path = require('path');

const FILE = path.join(__dirname, '..', 'progress.json');
const ALLOWED = ['queued', 'building', 'review', 'requeue', 'done', 'blocked', 'failed'];

function readBoard(){
  try { return JSON.parse(fs.readFileSync(FILE, 'utf8')); }
  catch(_){ return { updated: 0, version: 'dev', board: [] }; }
}

function parseArgs(argv){
  const out = { positional: [], agent: undefined, title: undefined, epic: undefined };
  for(let i = 0; i < argv.length; i++){
    const a = argv[i];
    if(a === '--agent'){ out.agent = argv[++i]; }
    else if(a === '--title'){ out.title = argv[++i]; }
    else if(a === '--epic'){ out.epic = argv[++i]; }
    else { out.positional.push(a); }
  }
  return out;
}

// immutable merge -> new snapshot
function merge(snapshot, entry){
  const ts = Date.now();
  const board = Array.isArray(snapshot.board) ? snapshot.board : [];
  let found = false;
  const next = board.map((row) => {
    if(row.id !== entry.id) return row;
    found = true;
    return {
      ...row,
      status: entry.status || row.status,
      agent: entry.agent !== undefined ? entry.agent : row.agent,
      note: entry.note !== undefined ? entry.note : row.note,
      title: entry.title !== undefined ? entry.title : row.title,
      epic: entry.epic !== undefined ? entry.epic : row.epic,
      ts,
    };
  });
  if(!found){
    next.push({
      id: entry.id, epic: entry.epic || '?', title: entry.title || entry.id,
      status: entry.status || 'queued', agent: entry.agent || null,
      note: entry.note || '', ts,
    });
  }
  return { ...snapshot, board: next, updated: ts };
}

async function pushRemote(entry, version){
  const url = process.env.EM_PROGRESS_ENDPOINT;
  if(!url || typeof fetch !== 'function') return;
  try {
    await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...entry, version }),
    });
  } catch(_){ /* best-effort; local file is the source of truth */ }
}

async function main(){
  const [cmd, ...rest] = process.argv.slice(2);

  if(cmd === 'show'){
    const s = readBoard();
    for(const r of (s.board || [])){
      console.log(`${(r.status||'').padEnd(9)} ${String(r.id).padEnd(5)} ${r.title||''}${r.agent?('  ['+r.agent+']'):''}`);
    }
    return;
  }

  if(cmd === 'set'){
    const args = parseArgs(rest);
    const [id, status, note] = args.positional;
    if(!id || !status){ console.error('usage: node tools/progress.js set <id> <status> ["note"] [--agent NAME]'); process.exit(2); }
    if(ALLOWED.indexOf(status) < 0){ console.error('status must be one of: ' + ALLOWED.join(', ')); process.exit(2); }
    const entry = { id, status, agent: args.agent, title: args.title, epic: args.epic };
    if(note !== undefined) entry.note = note;
    const snapshot = readBoard();
    const next = merge(snapshot, entry);
    fs.writeFileSync(FILE, JSON.stringify(next, null, 2) + '\n');
    await pushRemote(entry, next.version);
    console.log(`progress: ${id} -> ${status}`);
    return;
  }

  console.error('usage:\n  node tools/progress.js set <id> <status> ["note"] [--agent NAME] [--title "..."] [--epic "..."]\n  node tools/progress.js show');
  process.exit(2);
}

main();
