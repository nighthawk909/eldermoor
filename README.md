# Eldermoor — Character Asset Renderer

Original, RuneScape-era stylized game assets. This repo builds the **Adventurer**
character as real Blender geometry and renders it with Cycles (GPU). The model is
authored in Python so it stays identical run-to-run and is easy to extend.

> Note on IP: every asset here is original. We match the *style and quality* of the
> early-RuneScape low-poly register — we do **not** copy Jagex's models, map, items,
> names, or UI.

---

## What's in here

| File | Purpose |
|------|---------|
| `build_eldermoor.py` | The asset generator + renderer. Builds the hero, lights, camera; renders a still. |
| `README.md` | This file. |
| `.gitignore` | Keeps renders/backups out of git. |

---

## Prerequisites

- **Blender 4.2 LTS or newer** (`blender --version` should report ≥ 4.2).
- A **GPU** is the whole point: NVIDIA (OptiX/CUDA), AMD (HIP), Apple (Metal), or Intel (oneAPI).
- `blender` on your PATH, **or** the full path to the executable.

If Blender isn't installed:
- **Windows:** `winget install BlenderFoundation.Blender` (exe usually lands in
  `C:\Program Files\Blender Foundation\Blender 4.x\blender.exe`).
- **Linux:** grab the official 4.2 LTS tarball from blender.org and extract it
  (the distro `apt` build is often too old). Symlink it onto PATH if you like.

---

## ▶️ Paste this to Claude Code

```
Read README.md in this repo, then:

1. Confirm build_eldermoor.py is present. If not, stop and tell me.
2. Verify Blender 4.2+ is runnable (`blender --version`). If it isn't on PATH,
   find the executable and use its full path for all commands below.
3. Run the fast preview:
      blender --background --python build_eldermoor.py -- --preview
   In the log, find the line "[eldermoor] render device:" and tell me whether it
   says GPU or CPU. If CPU: open Blender > Preferences > System > Cycles Render
   Devices, enable my GPU, save preferences, and rerun.
4. Once it's using the GPU, run the full-quality render:
      blender --background --python build_eldermoor.py -- --samples 384 --res 1800 2250 --out eldermoor_hero.png
5. Open eldermoor_hero.png so I can see it. Report the render time and the GPU
   device name from the log.
```

---

## Manual run (if you'd rather drive it yourself)

```bash
# fast preview (48 samples, 720x900)
blender --background --python build_eldermoor.py -- --preview

# full quality (defaults: 1800x2250, 384 samples, OpenImageDenoise, GPU auto-detect)
blender --background --python build_eldermoor.py

# override anything
blender --background --python build_eldermoor.py -- \
  --samples 512 --res 2400 3000 --out hero_final.png --device GPU
```

Flags (everything after the `--`):

| Flag | Default | Meaning |
|------|---------|---------|
| `--preview` | off | Fast mode: 48 samples, 720×900 |
| `--samples N` | 384 | Cycles samples |
| `--res W H` | 1800 2250 | Output resolution |
| `--out PATH` | `eldermoor_hero.png` | Output file |
| `--device GPU\|CPU\|AUTO` | AUTO | Force device; AUTO uses GPU if found |

---

## Verify it actually used the GPU

The script prints its own device line, e.g.:

```
[eldermoor] render device: GPU (OPTIX)
```

If you see `GPU (...)` you're rendering on the card. If you see `CPU (CPU)`, the
GPU wasn't enabled in Blender's preferences — fix that and rerun (see Troubleshooting).

---

## Troubleshooting

- **Fell back to CPU.** Blender > Preferences > System > *Cycles Render Devices* →
  pick CUDA/OptiX (NVIDIA) or HIP (AMD), tick your GPU, save preferences. Rerun.
  The script enables detected GPU devices, but Blender must have the backend selected once.
- **`blender: command not found`.** Use the full path to the executable, e.g.
  `"C:\Program Files\Blender Foundation\Blender 4.2\blender.exe" --background ...`
- **Nothing saved / weird path.** Pass an absolute `--out`, e.g. `--out C:\Users\you\hero.png`.
- **Black or blown-out image.** Color management defaults to AgX (Punchy). Adjust the
  light energies in `build_stage()` if your view transform differs.

---

## Quality defaults

Production, not preview: **1800×2250, 384 samples, OpenImageDenoise, AgX Punchy**,
three-point lighting, depth of field. On a modern GPU this is seconds to ~a minute.

---

## Set up the GitHub repo

```bash
git init
git add build_eldermoor.py README.md .gitignore
git commit -m "Eldermoor: adventurer asset generator + Cycles renderer"

# then either:
gh repo create eldermoor --private --source=. --push
# or create the repo on github.com and:
git remote add origin git@github.com:<you>/eldermoor.git
git push -u origin main
```

Tip: rename or copy `README.md` to `CLAUDE.md` if you want Claude Code to auto-load
this as context every session in that repo.

---

## Extending (next)

The build is a factory — `build_head()` plus the `cube / cyl / cone / ico` helpers.
Reusing those, the next additions are:

- `build_merchant()` and `build_brute()` → render a **cast lineup** in one frame.
- A **turntable**: render N frames orbiting the character for a full-angle review.
- A **texture pass**: paint a skin/eye map onto the head — the single biggest jump
  toward true OSRS finish (right now the face is pure geometry).
