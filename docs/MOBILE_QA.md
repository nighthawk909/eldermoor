# Eldermoor — Mobile QA (Josh tests on a real phone, reports back)

Claude can't feel haptics or truly touch-test — so for every feature, Claude posts the device-only
checks here, pushes the live build, and pings Josh with the link. Josh tests on his phone and replies
"works / doesn't"; Claude then checks the boxes. A feature is not Done until these pass.

## How it works (ship-and-notify cadence)
1. Claude ships a feature/sub-feature → pushes → Vercel auto-deploys.
2. Claude sends Josh the **live link** + "test this on mobile" with the exact checks below.
3. Josh tests on his phone, reports results.
4. Claude checks/repairs, updates the parity checklist. Then the next sub-feature.

## Live links
- Progress hub: **https://eldermoor.vercel.app/progress.html**
- Current game (old prototype): https://eldermoor.vercel.app/
- New-engine demos: `/movement-harness.html` · `/tick-harness.html` · `/characters-showcase.html` (soon)

## Device-only checks (filled per feature as they ship)
### Characters (active)
- [ ] Hero/NPCs/monster look like the Blender quality (not blocky) on the phone
- [ ] Showcase rotates smoothly; performance OK on device
### Interaction (later)
- [ ] Tap an NPC/object selects it first try
- [ ] Long-press opens the option menu
- [ ] Haptic buzz on a successful action
