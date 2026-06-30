/* =====================================================================
   ELDERMOOR - in-game QA / feedback panel (QA1). Lets the tester check off
   each release's test items WITHOUT leaving the game or retyping in chat.

   For the current build it loads a checklist from `assets/data/qa.json`
   ({ version, title, items:[{id,title,how}] }) and shows, per item:
     • the title + exactly what to test ("how"),
     • Pass / Fail / Skip buttons,
     • a free-text note field for live feedback.

   Everything is persisted to localStorage under `eldermoor:qa:<version>` and
   compiled into a single Markdown report the tester sends back in ONE action:
     • Copy report (clipboard), • Share (mobile share sheet), • Download .md,
     • plus a read-only report box to long-press-copy on mobile.

   A small "✓ QA" launcher (top-left) opens a full-screen, touch-friendly,
   single-panel overlay. Self-contained; reads window.EMHAPTIC if present.
   main.js calls initQaPanel() once.
   ===================================================================== */

const QA_FILE = 'assets/data/qa.json';
const BTN_ID = 'emqa-btn';
const OV_ID = 'emqa-ov';

function storeKey(ver){ return 'eldermoor:qa:' + (ver || 'dev'); }
function haptic(kind){ try { const h = window.EMHAPTIC; if (h && h[kind]) h[kind](); } catch (e) {} }
function esc(s){ return String(s == null ? '' : s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;'); }

function loadResults(ver){
  try { const r = localStorage.getItem(storeKey(ver)); const o = r ? JSON.parse(r) : null; return (o && typeof o === 'object') ? o : {}; }
  catch (e) { return {}; }
}
function saveResults(ver, results){ try { localStorage.setItem(storeKey(ver), JSON.stringify(results)); } catch (e) {} }

function injectCss(){
  if (document.getElementById('emqa-css')) return;
  const css = `
  #${BTN_ID}{position:fixed;z-index:40;top:calc(8px + env(safe-area-inset-top,0px));left:8px;
    min-height:34px;padding:5px 10px;border-radius:8px;background:#2d5a34;border:2px solid #6fbf7a;
    color:#eafff0;font:bold 12px "Trebuchet MS",sans-serif;cursor:pointer;box-shadow:0 3px 12px #0008;}
  #${BTN_ID} .b{background:#1f3f25;border-radius:6px;padding:0 5px;margin-left:5px;}
  #${OV_ID}{position:fixed;inset:0;z-index:9500;display:none;background:rgba(10,12,10,.92);
    overflow:auto;-webkit-overflow-scrolling:touch;font-family:"Trebuchet MS",sans-serif;color:#eee4cc;
    padding:calc(10px + env(safe-area-inset-top,0px)) 10px calc(16px + env(safe-area-inset-bottom,0px));}
  #${OV_ID}.show{display:block;}
  #${OV_ID} .wrap{max-width:680px;margin:0 auto;}
  #${OV_ID} .hd{display:flex;align-items:center;gap:8px;position:sticky;top:0;background:rgba(10,12,10,.96);
    padding:6px 2px 10px;border-bottom:1px solid #3a4a38;margin-bottom:10px;z-index:2;}
  #${OV_ID} .hd h3{margin:0;color:#8fe08f;font-size:16px;}
  #${OV_ID} .hd .sub{color:#9fb89f;font-size:11px;}
  #${OV_ID} .hd .x{margin-left:auto;min-width:44px;min-height:44px;border-radius:8px;border:2px solid #5a4a2a;
    background:#3a2e1f;color:#f3e9cf;font-size:18px;cursor:pointer;}
  #${OV_ID} .it{background:#1b1f1a;border:1px solid #34402f;border-radius:10px;padding:11px;margin-bottom:10px;}
  #${OV_ID} .it.pass{border-color:#3e9b43;} #${OV_ID} .it.fail{border-color:#c0473a;} #${OV_ID} .it.skip{border-color:#7a6e3a;}
  #${OV_ID} .it .t{font-weight:bold;font-size:14px;color:#f3e9cf;}
  #${OV_ID} .it .how{font-size:12.5px;color:#b9c7b3;margin:4px 0 9px;line-height:1.45;}
  #${OV_ID} .btns{display:flex;gap:7px;margin-bottom:8px;}
  #${OV_ID} .btns button{flex:1;min-height:44px;border-radius:8px;border:2px solid #3e3424;background:#2b2620;
    color:#e3d6b8;font:bold 13px "Trebuchet MS",sans-serif;cursor:pointer;}
  #${OV_ID} .btns button.pass.on{background:#2c6e30;border-color:#3e9b43;color:#fff;}
  #${OV_ID} .btns button.fail.on{background:#7a2b22;border-color:#c0473a;color:#fff;}
  #${OV_ID} .btns button.skip.on{background:#5a4422;border-color:#e7c64f;color:#fff;}
  #${OV_ID} .note{width:100%;min-height:44px;box-sizing:border-box;padding:9px;border-radius:8px;
    background:#12150f;border:1px solid #34402f;color:#fff;font:13px "Trebuchet MS",sans-serif;resize:vertical;}
  #${OV_ID} .foot{position:sticky;bottom:0;background:rgba(10,12,10,.96);padding:10px 0 2px;border-top:1px solid #3a4a38;margin-top:6px;}
  #${OV_ID} .foot .row{display:flex;gap:7px;flex-wrap:wrap;margin-bottom:8px;}
  #${OV_ID} .foot button{flex:1;min-width:120px;min-height:46px;border-radius:8px;border:2px solid #5a4a2a;
    background:#3a2e1f;color:#f3e9cf;font:bold 13px "Trebuchet MS",sans-serif;cursor:pointer;}
  #${OV_ID} .foot button.go{border-color:#6fbf7a;background:#2d5a34;color:#eafff0;}
  #${OV_ID} .rep{width:100%;height:120px;box-sizing:border-box;padding:9px;border-radius:8px;background:#0c0e0a;
    border:1px solid #34402f;color:#cfe0c8;font:12px ui-monospace,monospace;white-space:pre;}
  #${OV_ID} .cnt{font-size:12px;color:#9fb89f;text-align:center;margin-bottom:6px;}
  `;
  const st = document.createElement('style'); st.id = 'emqa-css'; st.textContent = css; document.head.appendChild(st);
}

export function initQaPanel(){
  if (typeof window === 'undefined' || typeof document === 'undefined') return null;
  if (window.EMQA) return window.EMQA;
  injectCss();

  let spec = { version: 'dev', title: '', items: [] };
  let results = {};

  // launcher
  const btn = document.createElement('button');
  btn.id = BTN_ID; btn.type = 'button';
  btn.innerHTML = 'QA <span class="b">!</span>';
  btn.title = 'Open the test checklist';
  document.body.appendChild(btn);

  // overlay
  const ov = document.createElement('div');
  ov.id = OV_ID;
  document.body.appendChild(ov);

  function counts(){
    let p=0,f=0,s=0,n=spec.items.length;
    spec.items.forEach(it => { const r = results[it.id]; if(r && r.status==='pass')p++; else if(r&&r.status==='fail')f++; else if(r&&r.status==='skip')s++; });
    return { p, f, s, n, todo: n-p-f-s };
  }
  function badge(){ const c = counts(); btn.querySelector('.b').textContent = c.f ? (c.f+'✗') : (c.todo ? c.todo : '✓'); }

  function buildReport(){
    const c = counts();
    const lines = [];
    lines.push('# Eldermoor QA — ' + spec.version + (spec.title ? ' (' + spec.title + ')' : ''));
    lines.push('Pass ' + c.p + ' / Fail ' + c.f + ' / Skip ' + c.s + ' / To-do ' + c.todo + ' of ' + c.n);
    lines.push('');
    spec.items.forEach(it => {
      const r = results[it.id] || {};
      const tag = (r.status || 'todo').toUpperCase();
      lines.push('- [' + tag + '] ' + it.title + (r.note ? ' — ' + r.note : ''));
    });
    return lines.join('\n');
  }

  function setStatus(id, status){
    const cur = results[id] || {};
    results[id] = Object.assign({}, cur, { status: cur.status === status ? null : status });
    saveResults(spec.version, results);
    haptic(status === 'fail' ? 'error' : 'select');
    render();
  }
  function setNote(id, note){
    const cur = results[id] || {};
    results[id] = Object.assign({}, cur, { note });
    saveResults(spec.version, results);
    const rep = ov.querySelector('.rep'); if (rep) rep.value = buildReport();
    badge();
  }

  function render(){
    const itemsHtml = spec.items.map(it => {
      const r = results[it.id] || {};
      const st = r.status || '';
      return '<div class="it ' + esc(st) + '" data-id="' + esc(it.id) + '">'
        + '<div class="t">' + esc(it.title) + '</div>'
        + '<div class="how">' + esc(it.how || '') + '</div>'
        + '<div class="btns">'
        +   '<button type="button" class="pass' + (st==='pass'?' on':'') + '" data-s="pass">Pass</button>'
        +   '<button type="button" class="fail' + (st==='fail'?' on':'') + '" data-s="fail">Fail</button>'
        +   '<button type="button" class="skip' + (st==='skip'?' on':'') + '" data-s="skip">Skip</button>'
        + '</div>'
        + '<textarea class="note" rows="1" placeholder="Notes / what went wrong...">' + esc(r.note || '') + '</textarea>'
        + '</div>';
    }).join('');

    ov.innerHTML =
      '<div class="wrap">'
      + '<div class="hd"><div><h3>Test checklist — ' + esc(spec.version) + '</h3>'
      +   '<div class="sub">' + esc(spec.title || '') + ' · tap Pass/Fail/Skip, add notes, then Copy/Share below</div></div>'
      +   '<button type="button" class="x" title="Close">✕</button></div>'
      + (spec.items.length ? itemsHtml : '<div class="how">No checklist for this build yet.</div>')
      + '<div class="foot"><div class="cnt"></div>'
      +   '<div class="row"><button type="button" class="go" data-a="copy">Copy report</button>'
      +     '<button type="button" data-a="share">Share</button>'
      +     '<button type="button" data-a="download">Download .md</button>'
      +     '<button type="button" data-a="clear">Clear</button></div>'
      +   '<textarea class="rep" readonly></textarea></div>'
      + '</div>';

    ov.querySelector('.x').onclick = close;
    ov.querySelectorAll('.it').forEach(card => {
      const id = card.dataset.id;
      card.querySelectorAll('.btns button').forEach(b => { b.onclick = () => setStatus(id, b.dataset.s); });
      const ta = card.querySelector('.note');
      ta.addEventListener('input', () => setNote(id, ta.value));
    });
    ov.querySelector('.cnt').textContent = (() => { const c = counts(); return 'Pass ' + c.p + ' · Fail ' + c.f + ' · Skip ' + c.s + ' · To-do ' + c.todo; })();
    const rep = ov.querySelector('.rep'); rep.value = buildReport();
    ov.querySelector('[data-a="copy"]').onclick = () => doCopy(rep);
    ov.querySelector('[data-a="share"]').onclick = () => doShare();
    ov.querySelector('[data-a="download"]').onclick = () => doDownload();
    ov.querySelector('[data-a="clear"]').onclick = () => { if (confirm('Clear all QA results for ' + spec.version + '?')) { results = {}; saveResults(spec.version, results); render(); } };
    badge();
  }

  function doCopy(rep){
    const text = buildReport();
    let ok = false;
    try { if (navigator.clipboard && navigator.clipboard.writeText) { navigator.clipboard.writeText(text); ok = true; } } catch (e) {}
    if (!ok && rep){ rep.focus(); rep.select(); try { document.execCommand('copy'); ok = true; } catch (e) {} }
    haptic('success');
    flashFoot(ok ? 'Report copied — paste it back to me.' : 'Select the box below and copy manually.');
  }
  function doShare(){
    const text = buildReport();
    if (navigator.share){ navigator.share({ title: 'Eldermoor QA ' + spec.version, text }).catch(() => {}); }
    else doCopy(ov.querySelector('.rep'));
  }
  function doDownload(){
    try {
      const blob = new Blob([buildReport()], { type: 'text/markdown' });
      const a = document.createElement('a'); a.href = URL.createObjectURL(blob);
      a.download = 'eldermoor-qa-' + spec.version + '.md'; document.body.appendChild(a); a.click();
      setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 500);
      flashFoot('Downloaded eldermoor-qa-' + spec.version + '.md');
    } catch (e) { flashFoot('Download not supported — use Copy.'); }
  }
  function flashFoot(msg){ const c = ov.querySelector('.cnt'); if (c){ const prev = c.textContent; c.textContent = msg; setTimeout(() => { if (ov.classList.contains('show')) { const cc = ov.querySelector('.cnt'); if (cc) cc.textContent = (() => { const x = counts(); return 'Pass ' + x.p + ' · Fail ' + x.f + ' · Skip ' + x.s + ' · To-do ' + x.todo; })(); } }, 1800); } }

  function open(){ render(); ov.classList.add('show'); haptic('open'); }
  function close(){ ov.classList.remove('show'); haptic('close'); }
  btn.onclick = open;

  // load the checklist for this build
  fetch(QA_FILE).then(r => r.ok ? r.json() : null).then(data => {
    if (data && Array.isArray(data.items)) {
      spec = { version: data.version || 'dev', title: data.title || '', items: data.items };
    }
    results = loadResults(spec.version);
    badge();
  }).catch(() => { results = loadResults(spec.version); badge(); });

  window.EMQA = {
    open, close,
    report(){ return buildReport(); },
    results(){ return Object.assign({}, results); },
    setSpec(s){ if (s && Array.isArray(s.items)) { spec = { version: s.version||'dev', title: s.title||'', items: s.items }; results = loadResults(spec.version); badge(); } },
  };
  return window.EMQA;
}

export default initQaPanel;
