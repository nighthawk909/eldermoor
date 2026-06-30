# HUMAN_ACTIONS.md — manual steps (Josh)

The build sandbox can't run the Vercel CLI, a real browser/device, or provision
cloud storage. These steps are yours. Canonical branch: `claude/modular-v23`.

---

## A. One-time: connect Vercel KV (enables live QA sync)

The in-game QA panel auto-uploads your Pass/Fail/notes to `/api/qa`, which stores
them in Vercel KV so I can read them live (no copy/paste). It needs a KV store:

1. Vercel → project **eldermoor** → **Storage** → **Create Database** → **KV**
   (Upstash Redis). Accept the free plan.
2. **Connect** the store to the **eldermoor** project (all environments). This
   auto-adds the env vars `KV_REST_API_URL` and `KV_REST_API_TOKEN`.
3. **Redeploy** so the function picks up the env vars (promote the latest
   `claude/modular-v23` deploy, or `vercel deploy --prod`).
4. Verify: open `https://eldermoor.vercel.app/api/qa` — before any testing it
   returns `{"ok":true,"empty":true}` (not a 503). 503 = KV not connected yet.

Until KV is connected the QA panel shows "not synced" and you can still use the
**Copy / Share / Download** report. After it's connected, just play + check boxes;
tell me "pull QA" (or I'll check at the start of each turn) and I'll read your
results from `/api/qa`.

## B. Each release: promote the preview to production

GitHub pushes here build **previews** only. To make `eldermoor.vercel.app` serve
the latest:
- Dashboard: Vercel → eldermoor → Deployments → latest `claude/modular-v23`
  commit → ⋯ → **Promote to Production**, **or**
- CLI from repo root: `vercel deploy --prod --yes`.

Always-latest preview URL (no promotion needed) for QA:
`https://eldermoor-git-claude-modular-v23-josh-cocis-projects.vercel.app`

## C. Each release: QA via the in-game panel

Tap the green **QA** button (top-left). For every item: read what to test, tap
**Pass / Fail / Skip**, add a **note**. With KV connected (step A) it syncs
automatically; otherwise use **Copy report** and paste it back once.

---

### Notes
- The dev test character (level 99 + combat kit each load) is ON by default;
  disable in the browser console with `EMDEV.setEnabled(false)`.
- I refresh `assets/data/qa.json` every release so the checklist matches the build.
- Milestone 1B (Inventory + Equipment) is ON HOLD until you approve Milestone 1A.
