/* =====================================================================
   ELDERMOOR - QA sync serverless function (Vercel). Zero dependencies:
   talks to Vercel KV over its REST API with global fetch, using the env
   vars Vercel injects when a KV store is connected to the project:
       KV_REST_API_URL, KV_REST_API_TOKEN

   POST /api/qa   body { version, ts, device, counts, results, report }
                  -> stores the payload at `qa:latest` and `qa:<version>`
   GET  /api/qa[?version=vNN]
                  -> { ok, data } (latest, or a specific version)

   The in-game QA panel POSTs here every few seconds as the tester checks
   items off; the dev (Claude) reads the latest via GET. Degrades cleanly:
   if KV isn't configured yet it returns 503 and the client just shows
   "not synced" (the manual Copy/Share report still works).
   ===================================================================== */

const LATEST = 'qa:latest';

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
      if(typeof body === 'string'){ try { body = JSON.parse(body); } catch(_){ body = { raw: body }; } }
      if(!body || typeof body !== 'object'){ res.status(400).json({ ok: false, error: 'bad body' }); return; }
      const payload = JSON.stringify({
        version: body.version || 'dev',
        ts: body.ts || Date.now(),
        device: body.device || null,
        counts: body.counts || null,
        results: body.results || null,
        report: body.report || null,
      });
      await kvSet(env, LATEST, payload);
      if(body.version) await kvSet(env, 'qa:' + body.version, payload);
      res.status(200).json({ ok: true });
      return;
    }
    if(req.method === 'GET'){
      const v = (req.query && req.query.version) ? String(req.query.version) : null;
      const raw = await kvGet(env, v ? ('qa:' + v) : LATEST);
      if(!raw){ res.status(200).json({ ok: true, empty: true }); return; }
      let parsed = null; try { parsed = JSON.parse(raw); } catch(_){ parsed = { raw: raw }; }
      res.status(200).json({ ok: true, data: parsed });
      return;
    }
    res.status(405).json({ ok: false, error: 'method not allowed' });
  } catch(e){
    res.status(500).json({ ok: false, error: String((e && e.message) || e) });
  }
};
