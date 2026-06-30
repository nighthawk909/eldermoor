/* =====================================================================
   ELDERMOOR - Fleet progress sync serverless function (Vercel).
   Zero dependencies: talks to Vercel KV over its REST API with global
   fetch, using the env vars Vercel injects when a KV store is connected:
       KV_REST_API_URL, KV_REST_API_TOKEN

   POST /api/progress
        body { board: [...], updated, version }   -> replace the whole board
        body { id, status, agent?, note?, title?, epic? } -> merge ONE entry
   GET  /api/progress                              -> { ok, data:{board,...} }

   The fleet (orchestrator + agents via tools/progress.js) POSTs entry
   updates as work moves; dashboard.html GETs the board every couple of
   seconds and renders it. Degrades cleanly: if KV isn't configured yet it
   returns 503 and the dashboard falls back to polling the local
   progress.json file (single-writer mode).
   ===================================================================== */

const LATEST = 'progress:latest';

function kvEnv(){
  const url = process.env.KV_REST_API_URL;
  const token = process.env.KV_REST_API_TOKEN;
  return (url && token) ? { url: url.replace(/\/+$/, ''), token } : null;
}

async function kvSet(env, key, value){
  const r = await fetch(env.url + '/set/' + encodeURIComponent(key), {
    method: 'POST',
    headers: { Authorization: 'Bearer ' + env.token },
    body: value,
  });
  if(!r.ok) throw new Error('kv set ' + r.status);
}

async function kvGet(env, key){
  const r = await fetch(env.url + '/get/' + encodeURIComponent(key), {
    headers: { Authorization: 'Bearer ' + env.token },
  });
  if(!r.ok) throw new Error('kv get ' + r.status);
  const j = await r.json();
  return (j && typeof j.result === 'string') ? j.result : (j ? j.result : null);
}

const ALLOWED = ['queued', 'building', 'review', 'requeue', 'done', 'blocked', 'failed'];

// immutable merge of a single entry into a board snapshot
function mergeEntry(snapshot, entry){
  const ts = entry.ts || Date.now();
  const board = Array.isArray(snapshot.board) ? snapshot.board : [];
  let found = false;
  const next = board.map((row) => {
    if(row.id !== entry.id) return row;
    found = true;
    return {
      ...row,
      status: ALLOWED.indexOf(entry.status) >= 0 ? entry.status : row.status,
      agent: entry.agent !== undefined ? entry.agent : row.agent,
      note: entry.note !== undefined ? entry.note : row.note,
      title: entry.title !== undefined ? entry.title : row.title,
      epic: entry.epic !== undefined ? entry.epic : row.epic,
      ts,
    };
  });
  if(!found){
    next.push({
      id: entry.id,
      epic: entry.epic || '?',
      title: entry.title || entry.id,
      status: ALLOWED.indexOf(entry.status) >= 0 ? entry.status : 'queued',
      agent: entry.agent || null,
      note: entry.note || '',
      ts,
    });
  }
  return { ...snapshot, board: next, updated: ts, version: snapshot.version || 'dev' };
}

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if(req.method === 'OPTIONS'){ res.status(204).end(); return; }

  const env = kvEnv();
  if(!env){
    res.status(503).json({ ok: false, error: 'KV not configured: connect a Vercel KV store so KV_REST_API_URL/KV_REST_API_TOKEN are set.' });
    return;
  }

  try {
    if(req.method === 'POST'){
      let body = req.body;
      if(typeof body === 'string'){ try { body = JSON.parse(body); } catch(_){ body = null; } }
      if(!body || typeof body !== 'object'){ res.status(400).json({ ok: false, error: 'bad body' }); return; }

      // whole-board replace
      if(Array.isArray(body.board)){
        const payload = JSON.stringify({ board: body.board, updated: body.updated || Date.now(), version: body.version || 'dev' });
        await kvSet(env, LATEST, payload);
        res.status(200).json({ ok: true, mode: 'replace' });
        return;
      }
      // single-entry merge (read-modify-write)
      if(body.id){
        const raw = await kvGet(env, LATEST);
        let snapshot = { board: [], version: body.version || 'dev' };
        if(raw){ try { snapshot = JSON.parse(raw); } catch(_){} }
        const next = mergeEntry(snapshot, body);
        await kvSet(env, LATEST, JSON.stringify(next));
        res.status(200).json({ ok: true, mode: 'merge', entry: body.id });
        return;
      }
      res.status(400).json({ ok: false, error: 'provide board[] or an entry with id' });
      return;
    }
    if(req.method === 'GET'){
      const raw = await kvGet(env, LATEST);
      if(!raw){ res.status(200).json({ ok: true, empty: true }); return; }
      let parsed = null; try { parsed = JSON.parse(raw); } catch(_){ parsed = { raw }; }
      res.status(200).json({ ok: true, data: parsed });
      return;
    }
    res.status(405).json({ ok: false, error: 'method not allowed' });
  } catch(e){
    res.status(500).json({ ok: false, error: String((e && e.message) || e) });
  }
};
