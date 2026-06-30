# Eldermoor

An original game in the visual register of early-2000s RuneScape (RS Classic / RS2 era):
low-poly, faceted, stylized. The bar is **parity-or-better within that register** — currently
focused on building **Tutorial Island** to OSRS parity.

> **IP:** every asset is original. We match the *style and production quality* of the era — we do
> **not** copy Jagex's models, map, items, names, or UI. (See `CLAUDE.md` §2.)

---

## The shape of the project

- **The game is a web client** — `eldermoor_client.html` (Three.js). It loads 3D assets authored
  in **Blender** and exported to **glTF**. This is the source of truth for "what you see."
- **Blender is the asset forge** — Python scripts generate geometry and export `.glb` files the
  client loads. The pipeline is:

  ```
  build_kit.py  →  assets/*.glb  →  eldermoor_client.html  →  browser
   (Blender forge)  (glTF export)     (Three.js client)        (the game)
  ```

- **Cycles (GPU) renders** are kept only for high-fidelity look-judgment stills, not the game.

Read these before working: **`CLAUDE.md`** (operating law + decisions + doc map), **`HANDOFF.md`**
(current state + the locked next-step order), **`ROADMAP.md`** (the master phased checklist — done vs
outstanding), **`PARITY_AUDIT.md`** (the granular ~250-item per-feature test sheet), and
**`docs/00_INDEX.md`** (the full MMORPG Bible index).

---

## ▶️ Run the game (current state: the Chapel)

```bash
# 1. generate the tiling textures (zero dependencies)
python make_textures.py

# 2. export an asset from the Blender forge to glTF
blender --background --python build_kit.py -- --scene chapel --export assets/chapel.glb

# 3. serve the repo root and open the client
python -m http.server 8099
#    -> http://localhost:8099/eldermoor_client.html
```

You should see a stone chapel — brick walls, plank floor, altar, banners, pipe organ, and a monk
NPC — that you can orbit (drag) and zoom (scroll). *(Next milestone: walk a player through it.)*

`build_kit.py` scenes: `--scene corner | chapel | character`. Add `--export path.glb` to emit glTF
for the client, or omit it to render a Cycles still (`--out file.png --samples N --res W H`).

---

## Offline Cycles stills (look-judgment only)

```bash
# environment scene beauty still
blender --background --python build_kit.py -- --scene chapel --samples 96 --res 1200 820 --out chapel.png
# the Adventurer hero (separate character track)
blender --background --python build_eldermoor.py -- --preview      # fast
blender --background --python build_eldermoor.py                   # full quality
```

**Confirm GPU:** scripts print `[kit]/[eldermoor] render device: GPU (OPTIX/CUDA/HIP/...)`. If it
says `CPU`, enable the card in Blender > Preferences > System > Cycles Render Devices, then rerun.

---

## Prerequisites

- **Python 3** (for `make_textures.py` and the static server — stdlib only).
- **Blender 4.2 LTS+** on PATH or via full path (e.g.
  `"C:\Program Files\Blender Foundation\Blender 4.3\blender.exe"`). A **GPU** is the point
  (NVIDIA OptiX/CUDA, AMD HIP, Apple Metal, Intel oneAPI). Install on Windows:
  `winget install BlenderFoundation.Blender`.

---

## Repo layout

| Path | Purpose |
|------|---------|
| `eldermoor_client.html` | **The game** — Three.js client, loads glTF assets |
| `build_kit.py` | Environment/world forge: scenes + Cycles render + `--export` glTF |
| `build_eldermoor.py` | Character forge: the Adventurer hero + Cycles still |
| `make_textures.py` | Zero-dep seamless tiling textures → `textures/` |
| `assets/` | Exported glTF (`.glb`) the client loads (e.g. `chapel.glb`) |
| `textures/` | `brick.png`, `plank.png` (tiling) |
| `docs/` | The MMORPG Bible (`00_INDEX.md` = master TOC) + parity specs |
| `CLAUDE.md` | Operating law + project context (read first) |
| `HANDOFF.md` | Current state, changelog, next-step order |
| `ROADMAP.md` | **The master phased checklist** (P0–P10 + lessons L0–L17) — done vs outstanding |
| `PARITY_AUDIT.md` | Granular per-feature test sheet (~250 itemised gaps, each a pass/fail test) |
| `ASSET_MANIFEST.md` | The one 3D-asset tracker (incl. the character-model sub-track, §9) |
| `ART_SPEC.md` · `MODELING_SPEC.md` · `SKILL.md` | Visual + modeling standards / the build-loop skill |
| `tutorial_island.html` · `eldermoor.html` | Retired/reference prototypes (not the client) |

---

## Repo & CI

Versioned at **https://github.com/nighthawk909/eldermoor** (private). Every push triggers the
**`render-smoke`** GitHub Actions check (installs Blender 4.2 LTS, runs a fast smoke render to
confirm the scene still builds). Watch with `gh run list` / `gh run watch`.

```bash
git add -A && git commit -m "<type>: <what changed>" && git push
```
