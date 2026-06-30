# METRICS.md — Eldermoor

_Snapshot 2026-06-30. Honest counts; integrated ≠ playtested._

## Headline
- **Overall:** ~24% complete (integrated + boot-verified).
- **Live version:** v33.

## Features
| State | Count | Definition |
|---|---|---|
| Integrated + boot-verified | ~46 | code merged into the build, boots clean (zero console errors) |
| **Live-playtested** | **~6** | actually clicked-through in a foreground browser (walking, camera, HUD chrome, chat, inventory render, stats) |
| Remaining | ~44 | not started or data-only |
| **Total target** | ~90 | feature-level rollup of the ~645 PARITY_AUDIT items |

## Audit (granular tests, PARITY_AUDIT.md)
- Total itemised gaps: ~645.
- Verified done: ~22. Partial/integrated-pending-playtest: ~120. Remaining: ~500.

## Build/codebase
- Client modules: ~37 `src/*.js`. Data files: 11 `assets/data/*.json`.
- Versions shipped this session: v15 → v27 (each boot-verified before deploy). v24 = ranged combat + magic-cast;
  v25 = prayer points + Make-X smith/cook + quest accept/complete + action SFX + apostrophe-delimiter fix;
  v26 = lesson gating (`gating.js`); v27 = single 0.6s global game tick (`tick.js`, combat + skilling share it);
  v28 = Mobile Sprint 1A — responsive UI framework (`mobile-ui.js`: orientation, single-panel docking, bottom-sheet
  dialogue, chat collapse, objective auto-hide, touch targets, haptics, character name entry);
  v29 = 1A QA fixes — dedicated landscape layout, top-right HUD cluster de-overlap, responsive panel sizing,
  inventory long-press context menu (mobile), objective persists on entry;
  v30 = test infrastructure — dev test character (all-99 + combat kit each load) + in-game QA checklist panel
  (Pass/Fail/Skip + notes per item, one-tap Copy/Share/Download report). Not a player feature.
  v31 = live QA sync backend — api/qa.js (Vercel KV) + QA panel auto-POST (needs KV connected);
  v32 = QA findability — version on QA button + XP counter de-overlap;
  v33 = character-creator live 2D paper-doll preview (updates on every part/colour toggle).
- Mobile Sprint plan: 1A framework (v28, done/await QA) → 1B inventory+equipment → 1C combat loop →
  1D tutorial progression → 1E audio/settings/prayer/save/logout. Each gated by Josh's on-device QA.
- Tooling: policy-driven Claude Code config installed (commit 3a9fe8d) — `.claude/settings.json` +
  SessionStart/PreToolUse/PostToolUse/Stop hooks, validated against simulated payloads.

## Process
- Build waves run via parallel subagents (Sonnet = feature code, Haiku = docs/QA/data, Opus = orchestrate
  + integrate). Per-agent model set via the Agent tool `model` param (runtime model not independently
  verifiable from the session).
- Every integration gated by: `node --check` → real-browser boot (cache-free copy / deployed URL) → deploy.

## Known risk
- ~32 features are "integrated" but **unproven in actual play** — the dominant gap between % integrated and %
  truly done. Closing it requires a human/real-browser playtest pass (see NEXT_TASKS #10).
</content>
