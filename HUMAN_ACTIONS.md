# HUMAN_ACTIONS.md — v27 production promotion + playtest

These steps require the Vercel CLI/dashboard and a real browser, which the build
sandbox cannot reach (network policy blocks `eldermoor.vercel.app` and the
three.js/GLTFLoader CDNs). They must be done by you, Josh.

**Canonical branch:** `claude/modular-v23` (HEAD `5feaa56`). Do **not** touch or
merge `claude/opus-wave-v26`.

**What's already true:** v27 is committed + pushed and Vercel built it as a
**preview** (state READY). Production is still **v25** (`88eaa61`) — it does not
auto-promote; promotion is manual.

---

## v27 preview URLs (all serve the v27 client)

- **Branch alias (always-latest of the canonical branch — use this):**
  https://eldermoor-git-claude-modular-v23-josh-cocis-projects.vercel.app
- Latest canonical deploy (commit `5feaa56`, v27 client + synced docs/config):
  https://eldermoor-5ws3q78cb-josh-cocis-projects.vercel.app
  · inspector: https://vercel.com/josh-cocis-projects/eldermoor/GjeWVj1byyhiiDvF3r3WDZd9NkZn
- v27 code deploy (commit `e68d1b8`):
  https://eldermoor-hr4ssip2y-josh-cocis-projects.vercel.app
  · inspector: https://vercel.com/josh-cocis-projects/eldermoor/Hoa6iJqfaX4Azn3GKHfTfCHLN4ih

> Preview URLs sit behind Vercel deployment protection (SSO); open them while
> logged into the `josh-cocis-projects` team.

---

## 1. Promote v27 preview to production

**Option A — dashboard (no CLI):**
Vercel → project **eldermoor** → **Deployments** → find the `claude/modular-v23`
deploy at commit **`5feaa56`** (or `e68d1b8`) → **⋯** menu → **Promote to Production**.

**Option B — CLI (promote the existing build, no rebuild):**
```bash
vercel promote https://eldermoor-5ws3q78cb-josh-cocis-projects.vercel.app
```

**Option C — CLI (deploy the repo root to prod):**
```bash
git checkout claude/modular-v23 && git pull
cp index.modular.html index.html        # already in sync at v27, but per project deploy convention
vercel deploy --prod --yes
```
> Make sure you promote the **v27** deploy, not an older one — a v25 deploy was
> re-promoted earlier, so double-check the commit is `5feaa56`/`e68d1b8`.

## 2. Live playtest v27 (on the promoted production URL or the preview)

Hard-refresh first (cache-bust). Verify each:

- [ ] **Movement** — tap-to-walk, A* routes around walls, arrives at target.
- [ ] **Shared 0.6s tick** — combat swings *and* skilling rolls advance on one
      synchronized ~0.6s cadence (not two different rhythms).
- [ ] **Combat** — attack the giant rat: hitsplats, HP bar, XP, death/respawn.
- [ ] **Skilling** — chop a tree / fish the spot / cook on the fire: per-tick
      success, items + XP, node depletes/respawns.
- [ ] **Lesson gating** — expected to be **permissive** in this single-zone build
      (instructors/zones not placed yet → anti-brick keeps actions open). Confirm
      nothing is wrongly locked. (To exercise a hard gate, set
      `localStorage['eldermoor:gating']='on'` is default; gating only bites once
      instructor NPCs exist.)
- [ ] No console errors on boot (DevTools → Console); HUD shows **v27**.

## 3. Confirm production shows v27

- Open https://eldermoor.vercel.app → HUD top-centre reads **`v27`**.
- Or: `curl -s https://eldermoor.vercel.app | grep -o 'v[0-9]\+' | head -1` → `v27`.

## 4. Report any failures

Reply with: which checklist item failed, the console error text (if any), and the
URL/commit you tested. I'll fix forward on `claude/modular-v23`, re-verify, and
re-push. If all pass, say "v27 stable in production" and Sprint 1 can begin.
