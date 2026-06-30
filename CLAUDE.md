# CLAUDE.md — Eldermoor

Durable project context for Claude Code. Read this first every session.

---

## EXECUTION POLICY (policy-driven mode)

This section converts ad-hoc prompting into standing policy. Some of it is **enforced by
Claude Code hooks** (`.claude/settings.json` + `.claude/hooks/*.sh`); the rest is **behavioural
policy Claude follows** because it cannot be enforced by a deterministic shell hook. Each item
is tagged `[HOOK]` (mechanically enforced) or `[POLICY]` (Claude must self-apply). Honesty about
the boundary is deliberate: hooks gate/inject/flag — they cannot think, write prose, or know
that a feature "works".

### Project execution
- `[POLICY]` Continue until the assigned task is **fully complete** (see Quality Rules). Never
  stop because a logical *subtask* finished.
- `[POLICY]` When a task completes, automatically pick up the **next highest-priority task** from
  `NEXT_TASKS.md` → `BACKLOG.md` unless blocked.
- `[POLICY]` **Single-agent** for shared control-flow + integration work (anything touching
  `main.js`, `world.js`, `interact.js`, `hud.js`, `combat.js`, `skilling.js`, or the deploy path).
- `[POLICY]` **Multi-agent (10–20)** only for *isolated, non-overlapping* work (separate data
  files, separate feature modules with no shared-file edits). Never parallelize edits to the same
  control-flow file.
- `[HOOK-assist]` The **Stop hook** refuses to end the session while there are uncommitted
  changes, unpushed commits, or stale docs, and re-injects "continue with the next task".
- `[POLICY]` **Agent QA before owner QA (always).** Before asking Josh to test a build, run the
  `eldermoor-qa` agent over the change to review the code (syntax/JSON validity first, then a static
  correctness pass against the feature's intent). Fix what it finds, re-verify, THEN hand it to Josh.
  Never send the owner a build that hasn't been agent-reviewed + boot-verified first.
- `[POLICY]` **Auto-backlog, don't interrupt.** Anything outside the current milestone that is
  non-blocking is recorded in `BACKLOG.md` automatically — do not ask the owner about it. Only
  interrupt the owner for decisions that: change architecture, create incompatible save data,
  replace an existing system, or delete previously built functionality. Decisions that merely defer
  work are made by writing a backlog item and moving on.

### Session start  `[HOOK]` (`session-start.sh`)
On every session the SessionStart hook prints, into context: current **branch**, **latest commit**,
upstream ahead/behind, worktree cleanliness, **local client version**, presence of the six context
docs, and a best-effort **production version** check. `[POLICY]` Then read
`PROJECT_STATE.md`, `BACKLOG.md`, `ARCHITECTURE.md`, `NEXT_TASKS.md`, `METRICS.md`,
`PROJECT_HANDOFF.md` and restore full context **before any coding**.

### After implementation  `[HOOK]` (`post-tool-use.sh`) + `[POLICY]`
When any `src/**`, `index.html`, `index.modular.html`, or `*.js` file is edited, the PostToolUse
hook raises `.claude/state/docs-dirty` and reminds you. `[POLICY]` Before the work unit ends,
update **all six** of PROJECT_STATE / BACKLOG / NEXT_TASKS / METRICS / PROJECT_HANDOFF (and
ARCHITECTURE when structure changes) to the new state, keep them synchronized, then clear the flag:
`rm .claude/state/docs-dirty`. (A hook cannot write the prose; it can only flag staleness.)

### Stop conditions  `[HOOK]` (`stop.sh`)
Stopping is **blocked** while any of these objectively-detectable conditions hold: uncommitted
changes · unpushed commits · `docs-dirty` flag · `boot-pending` flag · `deploy-pending` flag.
`[POLICY]` The semantic conditions a hook can't verify — *feature incomplete, boot not verified,
playtest not done when required, deployment not promoted, higher-priority work remaining* — you
must self-enforce; record the verifiable ones as flag files so the hook can hold the line:
`touch .claude/state/boot-pending` / `deploy-pending`, and remove them when satisfied.
If blocked from stopping: resolve the condition and **continue with the next highest-priority
task automatically**. Only request human input for **destructive git** (`[HOOK]` PreToolUse asks)
or a **genuine design decision**.

### Output style  `[POLICY]` (not hook-enforceable)
Think silently. Read files / inspect code silently. Do not narrate, explain reasoning, announce
reads, announce plans, or send progress updates while actively working. Respond **only** when: a
milestone is complete, a blocker needs my decision, or a destructive git action needs approval.
Status updates must be **under 75 words** in exactly this format:

```
Version:
Commit:
Pushed:
Deployed:
Feature:
Playable impact:
Blocker:
```

### Quality Rules  `[POLICY]`
Never report a feature complete unless it is: **implemented · integrated · boot-verified ·
playtested (when required) · committed · pushed · deployed · reflected in all six docs.** If the
sandbox network policy blocks browser boot / production reachability, say so explicitly and use
the project boot-verify method (deterministic logic test + deployed-URL verification) rather than
silently downgrading — and leave `boot-pending` / `deploy-pending` set until truly satisfied.

---

## 0. Operating law (NON-NEGOTIABLE)

These override convenience, speed, and token cost. If a step would violate one, stop.

1. **Claude-built OR free-licensed assets (REVISED 2026-06-30, owner-directed).** Code is
   Claude-built. 3D assets may be either Claude-authored (Blender/Python) **or** sourced from
   **free, permissively-licensed (CC0 / public-domain) libraries** — Quaternius, Kenney,
   Poly Pizza, KhronosGroup samples, etc. The purely-procedural blocky avatar was the cost of
   the old "Claude-built only" rule; we now use real low-poly models for characters + gear so
   the game actually looks good. STILL FORBIDDEN: ripped/proprietary models, anything copying
   Jagex/RuneScape's specific expression (§2), and paid assets without owner approval. Every
   external asset's source + license is recorded in **ASSET_LICENSES.md** (CC0 needs no
   attribution but we log provenance anyway).
2. **No shortcuts, ever.** Never silently lower the bar to fit a constraint. If hardware
   (e.g. a sandbox with no GPU) blocks full quality, say so and route around it (render on
   the Victus GPU) — do not quietly ship the lesser thing and call it done.
3. **Fully baked.** Every thought, decision, plan, and increment is reasoned to completion
   with rationale and tradeoffs recorded (in HANDOFF.md / ROADMAP.md). No hand-waving, no
   "good enough for now" that hides debt.
4. **Small verified chunks — never one-shot.** Build ONE increment from the manifest at a
   time. Each increment has a written Definition of Done and is rendered, inspected, and
   critiqued against reference BEFORE advancing. Do not attempt a whole character or system
   in one pass.
5. **Reference-driven.** Judge every increment against the OSRS-era reference for the
   register. Write down what specifically reads wrong, then fix that.
6. **Name the ceiling.** When a method plateaus, state it plainly and define the next
   method. Honesty about limits is part of the work.

## The Build Loop (run for every chunk)

```
PLAN    → fully spec the chunk + its Definition of Done (write it down)
BUILD   → implement exactly that one chunk, nothing more
RENDER  → render/run it (GPU)
INSPECT → actually view the output
CRITIQUE→ compare to reference + DoD; list concrete defects
DECIDE  → defects? fix and re-loop. clean? mark done in MANIFEST, advance
LOG     → update HANDOFF.md / ROADMAP.md with result + next chunk
```

## Definition of Done (per asset, unless the chunk says otherwise)

> The measurable standard lives in **MODELING_SPEC.md**. A chunk is done only when the
> relevant items of its **Acceptance Checklist (MODELING_SPEC §7)** pass against the
> reference. Summary:

- Silhouette matches the approved proportions (MODELING_SPEC §2).
- Forms are **continuous** — no stacked-primitive seams, no gaps at joints.
- Materials read as their **substance** (cloth/leather/steel/skin), not flat plastic.
- Faces/skin are **textured** (painted map), not bare geometry.
- Passes a side-by-side reference comparison for the register.
- Renders clean on GPU at production settings.

---

## 1. What this is

**Eldermoor** is an original game in the visual register of early-2000s RuneScape
(RS Classic / RS2 era): low-poly, faceted, stylized — *not* AAA, not photoreal.
The bar is **parity-or-better within that register**: clean silhouettes, consistent
materials, deliberate lighting. Think "a notch above OSRS in craft, not in polycount."

## 2. Hard rules (IP)

- **Every asset is original.** We match the *style and production quality* of the era.
- **Never** reproduce Jagex's specific expression: their character/monster models, the
  map of Gielinor, item/UI designs, music, or the RuneScape names/logos.
- Style, genre, mechanics, and the low-poly look are not copyrightable — original designs
  in that style are how a real competitor legally exists. Stay on that side of the line.

## 3. Stack & decisions

- **Cost philosophy (decided):** free tooling now, architected to pay-to-scale the moment
  revenue/load justifies it. No tool choice made to avoid ever paying.
- **Engine (DECIDED 2026-06-28):** **web-first — the playable client is Three.js**
  (`eldermoor_client.html`), loading Blender-authored **glTF** assets. This is the parity
  surface and the source of truth for "what you see." Browser-instant-play is RuneScape's DNA,
  so the thing the owner looks at must be the real game, not an offline render. A native engine
  (Unity/Godot) is a *later, optional* port once the look + vertical slice are locked — not the path.
- **Asset pipeline (DECIDED, live):** authored in **Blender** (Python-generated geometry),
  exported to **glTF (.glb)**, loaded by the web client. The bridge works end-to-end:
  `build_kit.py → assets/*.glb → eldermoor_client.html → browser`. Cycles is kept for
  high-fidelity look-judgment stills only. Pipeline stays engine-agnostic (glTF ports to Unity/Godot).
- **Textures:** web client uses **seamless tiling PNGs** (`make_textures.py`, zero-dep) applied
  by glTF material name with world-space repeat (uniform texel density, ART_SPEC §3). glTF can't
  carry Blender's procedural node textures, so on `--export` those are swapped for solid palette
  colors and the tiling PNGs supply detail in-browser.
- **Renderer:** browser = Three.js (real-time, the game). Blender Cycles, GPU = offline beauty
  stills. Production Cycles defaults live in `build_eldermoor.py` / `build_kit.py`.

## 4. Visual language / art bible

**Signature:** faceted (flat-shaded) geometry, warm late-afternoon key light, long soft
shadows, harmonized storybook palette, AgX-Punchy grade. Spend boldness on the world and
character silhouettes; keep UI quiet.

**Palette (sRGB hex):**
- Skin `#e8b98e` · Hair `#3a2a1c` · Beard `#4a3420` · Eyes `#241812`
- Tunic `#3f6f8c` · Trim/gold `#d8b25a` · Cape `#9c3030` · Trousers `#2f3742`
- Leather `#5a3f28` · Steel `#c2cad4`
- World/terrain (for later): grass `#4f8a3c`/`#578f3f`/`#477d34`, dirt path `#8c6b40`,
  water `#2c6a82`, neutral ground `#d8d1c0`, sky/world fill `#e9e4d7`

**Character construction (locked approach):**
- Sculpted low-poly **head**: icosphere with lower verts pinched to a **chin**, back
  flattened, face pushed forward; plus a protruding 3-sided **nose**, heavy **brow**,
  angular **eyes**, chunky **hair** (top mass + fringe + sideburns + back), short **beard**.
- Slim, tall-ish **body** with sloped shoulder yoke (no boxy flat top), tapered limbs,
  faceted hands, and **shaped boots** (ankle + forward foot + raised toe + sole).
- Gear: upright sword, round shield (disc faces front), draped cape.

**Lighting:** three-point (warm key, cool fill, warm rim), depth of field, AgX Punchy.

## 5. Current assets

**The playable client (source of truth):**
- `eldermoor_client.html` — **the game shell.** Three.js + GLTFLoader; loads `assets/*.glb`,
  flat-shaded, OSRS camera, tiling textures applied by material name. Currently renders the
  **Chapel** (room + altar/organ/banners + monk NPC). This is "what you see." Run via a static
  server (see §6). *Next: player + click-to-move + collision (make the room playable).*
- `assets/chapel.glb` — Blender-authored chapel, exported via `build_kit.py --export`.
- `textures/brick.png`, `textures/plank.png` — seamless tiles from `make_textures.py`.

**The asset forge:**
- `build_kit.py` — modular ENVIRONMENT kit + scenes (`--scene corner|chapel|character`),
  Cycles render **or** `--export path.glb` for the client. Holds `build_npc_monk` (rounded-form
  character per `docs/44_CHARACTER_RIG.md`).
- `build_eldermoor.py` — the **Adventurer** hero (sculpted head/body/gear) + Cycles still.
- `make_textures.py` — generates the tiling PNGs (zero dependencies, pure stdlib).

**Reference / legacy:**
- `eldermoor.html` — original look+interaction prototype (Three.js).
- `tutorial_island.html` — **retired** skill-sampler demo; kept for interaction reference only,
  no longer the parity target (it's the "old version" — the real client is `eldermoor_client.html`).

## 6. How to run / render

**Run the playable client (the game):**
```bash
python make_textures.py                       # (re)generate tiling textures -> textures/
# export an asset from the forge to glTF for the client:
blender --background --python build_kit.py -- --scene chapel --export assets/chapel.glb
python -m http.server 8099                     # serve the repo root
# open http://localhost:8099/eldermoor_client.html
```

**Offline Cycles beauty stills (look-judgment only):**
```bash
blender --background --python build_kit.py -- --scene chapel --samples 96 --res 1200 820 --out chapel.png
blender --background --python build_eldermoor.py -- --preview        # hero, fast
blender --background --python build_eldermoor.py                     # hero, full quality
```

**Always confirm GPU use:** scripts print `[kit]/[eldermoor] render device: GPU (OPTIX/CUDA/HIP/...)`.
If it says `CPU`, enable the card in Blender > Preferences > System > Cycles Render Devices, then rerun.

## 7. Code conventions (build_eldermoor.py)

- **Factory pattern:** `build_head()` + primitive helpers `cube / cyl / cone / ico`.
  New characters reuse these — don't hand-place raw `bpy.ops`.
- **Coordinate convention:** geometry is authored in web-render space (Y up, +Z forward)
  and converted to Blender (Z up, front = -Y) via `conv()` / `dimsB()`. Keep new geometry
  in authored space and let `conv()` handle it, so models stay identical to the web prototype.
- **Flat shading + light bevel** on parts (the faceted look with edge highlights).
- **Color:** author sRGB hex; `lin()` converts to linear for Cycles. Always go through it.
- Scale is applied per-object so bevel width stays uniform.

## 8. Division of labor

- **Claude Code (this machine):** runs renders on the GPU, builds the Unity project,
  multi-file/agentic work, git. The executor.
- **Claude chat:** look/quality judgment (can view uploaded renders), architecture and
  tradeoff decisions, current-info research, authoring scripts/specs that get run here.
- **Loop:** decide & author in chat → execute & render here → bring results back to judge.

## 9. Roadmap

**Near term**
- `build_merchant()` and `build_brute()` → render a **cast lineup** in one frame.
- **Turntable** render (N frames orbiting) for full-angle review.
- **Texture pass** on the head (skin/eye map) — the biggest jump toward true OSRS finish;
  the face is currently pure geometry.

**Then**
- Import approved models into the chosen engine; rig + walk/combat animation set.
- Build a town/zone using the world palette and props from the web prototype.

## 10. Repo layout

```
eldermoor_client.html  # THE GAME — Three.js client, loads glTF assets (source of truth)
build_kit.py           # environment/world forge: scenes + Cycles render + --export glTF
build_eldermoor.py     # character forge: Adventurer hero + Cycles still
make_textures.py       # zero-dep seamless tiling textures -> textures/
assets/                # exported glTF (.glb) consumed by the client (e.g. chapel.glb)
textures/              # brick.png, plank.png (tiling)
docs/                  # the MMORPG Bible (00_INDEX is the master TOC) + parity specs
tutorial_island.html   # RETIRED skill-sampler demo (interaction reference only)
eldermoor.html         # original look/interaction prototype
CLAUDE.md              # this file (project context/operating law) — read first
HANDOFF.md             # current state + changelog + next steps
ROADMAP.md             # THE master phased checklist (done vs outstanding) — P0–P10 + lessons L0–L17
PARITY_AUDIT.md        # granular per-feature test sheet (~250 itemised gaps, each a pass/fail test)
ASSET_MANIFEST.md      # the one 3D-asset tracker (NPCs/buildings/fixtures/props/items + character sub-track)
ART_SPEC.md MODELING_SPEC.md SKILL.md  # visual + modeling standards / the build-loop skill
tutorial_island.html   # RETIRED skill-sampler demo (interaction reference only)
eldermoor.html         # original look/interaction prototype
.gitignore
```

> **Documentation map (one job per file).** Read order: CLAUDE.md (why) → HANDOFF.md (now) →
> ROADMAP.md (what's left, phase-level) → PARITY_AUDIT.md (item-level tests) → ASSET_MANIFEST.md (assets)
> → ART_SPEC/MODELING_SPEC (standards). A feature's **status lives only in ROADMAP**; its **test only in
> PARITY_AUDIT**; an asset's status only in ASSET_MANIFEST. No duplicate trackers.
> _Retired 2026-06-29 (merged, not lost): BUILD_PLAN.md + TUTORIAL_ISLAND_PARITY.md → ROADMAP.md;
> MANIFEST.md → ASSET_MANIFEST.md §9; KICKOFF.md (one-time bootstrap, superseded)._
