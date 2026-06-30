# PARITY_OSRS_QAv36 — OSRS reference + Eldermoor file-map (v36 QA)

Read-only research doc. For each domain: (a) what OSRS does, (b) the Eldermoor file(s) that
implement it today (grep-confirmed), (c) the concrete gap to close. Sources: OSRS Wiki
([Combat Options](https://oldschool.runescape.wiki/w/Combat_Options),
[Interface](https://oldschool.runescape.wiki/w/Interface),
[Minimap](https://oldschool.runescape.wiki/w/Minimap),
[Prayer](https://oldschool.runescape.wiki/w/Prayer),
[Standard spellbook](https://oldschool.runescape.wiki/w/Standard_spellbook)).

---

## 1. HUD layout (XP counter, stat orbs, minimap, tab dock, chatbox)

**(a) OSRS**
- Top-right: circular **minimap** with compass, world-map icon, run toggle, wiki, and a **stacked
  data-orb column** (top→bottom): Hitpoints, Prayer, Run energy, Special attack. Each orb shows a
  number left of the icon; background drains and number recolours (green→yellow→red) as the value
  falls. Run orb toggles run; Prayer orb toggles quick-prayers (right-click = setup); Spec orb
  activates the special attack.
- **XP-drops counter**: a button by the minimap; click shows a total-XP box to the left, transient
  per-hit XP drops rise on screen; right-click → Setup (per-skill trackers, goals, position).
- Bottom-right: **tab dock** — two rows of square tabs (Combat, Stats, Quests, Inventory,
  Equipment, Prayer, Magic / Clan, Friends, Account, Settings, Emotes, Music, Logout).
- Bottom-left: **chatbox** with channel tabs (All, Game, Public, Private, Channel, Clan, Trade),
  each cycling on/filtered/off/hide; scrollback; input line.

**(b) Eldermoor**
- `src/hud.js` — `initHud()` builds `#emmap` (108px minimap, player dot, NPC markers, compass),
  `#emchat` (6 channel tabs + mode cycling), `#emtabs` (tab dock), `#empanel` (tab content),
  `#emxp` (rising XP floats), `#emobj` (objective bar). Central `window.EMHUD` API.
- `src/xpcounter.js` — `initXpCounter()` → `#em-xpcounter` total-gained panel, polls
  `EMHUD.getSkillXp()` ~4/s, right-click menu (Reset / Hide), idle-dim.
- `src/orbs.js` — `initOrbs()` → `#emorbs` 4-orb stack (HP, Prayer, Run, Spec); reads `EMHUD` +
  `window.EMRUN` (from `player.js`); Run orb clickable (`EMTOGGLERUN`).
- `src/minimap-render.js` — under-layer terrain (grass/path/pond/chapel) from `EMWORLD`/`EMPLAYERPOS`.
- `src/minimap-nav.js` — click-to-walk (`EMWALK` / `em-walk`), recoloured NPC blips.

**(c) Gaps**
- Spec orb is **hardcoded 100** (`orbs.js:88` `spec:{cur:100…}`) — no real special-attack pool/use.
- Prayer orb is **display-only** — no click-to-toggle quick-prayers, no right-click setup.
- Orbs/HP number **do not recolour** as values drain (OSRS green→yellow→red); HP uses
  `EMPLAYERHP` fallback only.
- XP counter has **no per-skill trackers/goals/Setup** and is separate from the OSRS-style
  per-hit XP drop (drops live in `hud.js #emxp`, total lives in `xpcounter.js` — two systems).
- Tab dock layout is a 7-col emoji grid, not OSRS two-row square layout; chatbox channel set
  differs slightly (no dedicated "Channel" tab).

---

## 2. Inventory UX

**(a) OSRS**
- 28-slot 4×7 grid. **Left-click** = default (op0) action; **right-click** = full verb menu
  (Wield/Wear, Eat, Drink, Use, Drop, Examine, plus item-specific). **Use X on Y** = click Use,
  then click target (item, object, or NPC). **Drag-to-rearrange** slots freely. Drop confirms
  instantly; stackables show quantity (k/m colouring at thresholds). Equip moves to worn tab.

**(b) Eldermoor**
- `src/hud.js` — renders 28 slots (4-col), count badges, slots draggable/clickable.
- `src/inventory-ops.js` — `initInvOps()`, `EMINVOPS.defaultAction(idx)` (op0 on left-click),
  `EMINVOPS.openMenu(idx,x,y)` → `#eminv-ctx` verb menu; **Use-on** arming
  (`body.eminv-use-armed`, click target slot to resolve); long-press (420ms) opens menu on touch.
- `src/equipment.js` — `EMEQUIP.equip/unequip/stats`, 2H↔shield conflict handling, bag-space check.

**(c) Gaps**
- **Use-on targets are inventory-only** — cannot Use an item on a world object or NPC.
- **Drag-to-rearrange**: slots are draggable but report only confirms drag exists; verify free
  reordering persists (not just equip-drag).
- Stackable **quantity colouring** (yellow/white/green at 100k/10m) not implemented.
- No right-click on world/ground items → pickup verb chain tied into the same menu.

---

## 3. Combat styles (skill trained · XP behaviour · weapon-awareness)

**(a) OSRS** — per damage point: melee styles give 4 XP to the style skill + 1.33 Hitpoints.
- **Accurate** → Attack · **Aggressive** → Strength · **Defensive** → Defence ·
  **Controlled** → 1.33 each to Attack/Strength/Defence + 1.33 HP.
- **Ranged**: Accurate/Rapid → 4 Ranged +1.33 HP; **Longrange** → 2 Ranged + 2 Defence + 1.33 HP.
- **Magic**: offensive cast → Magic + 1.33 HP; **Defensive autocast** → Magic + 1 Defence + 1.33 HP.
- The **available style set changes with the equipped weapon** (e.g. whip exposes Controlled;
  most swords don't); each style has invisible +3 (or +1 controlled) level boost.

**(b) Eldermoor**
- `assets/data/combat.json` — `styles[]`: accurate→attack, aggressive→strength, defensive→defence,
  controlled→[attack,strength,defence] (`xpMode:"shared"`); `xpPerDamage:4`, `hpXpPerDamage:1.33`.
- `src/combat.js` — `awardXp(dmg)` (4×dmg to style skill + 1.33×dmg HP); `styleSkill()` reads
  `style.trains[0]`; ranged path `awardRangedXp()` (4 Ranged + 1.33 HP); melee vs ranged chosen by
  `isRangedReady()` (weapon id contains `'bow'` AND ammo qty>0).
- `src/hud.js` — Combat tab renders the 4 style buttons + selection.

**(c) Gaps**
- **Controlled "shared"** awards only `trains[0]` in `combat.js` and leans on HUD maths for the
  rest — verify it actually grants 1.33 to all three (OSRS) rather than 4 to Attack only.
- **No weapon-aware style sets**: the same 4 melee styles always show regardless of weapon;
  no Ranged/Magic style tabs swap in when a bow/staff is equipped.
- **Longrange** ranged style (2 Ranged + 2 Defence) **absent**.
- **Defensive magic autocast** (Magic + Defence split) **absent** — magic XP is offensive-only.
- No invisible +3/+1 style accuracy/strength boosts modelled.

---

## 4. Prayer roster

**(a) OSRS** — F2P/early standard prayers, drain scales with level; e.g. Thick Skin (1, +5 Def),
Burst of Strength (4, +5 Str), Clarity of Thought (7, +5 Atk), Sharp Eye (8, +5 Range),
Mystic Will (9, +5 Mage), Rock Skin (10, +10 Def), Superhuman Strength (13, +10 Str),
Improved Reflexes (16, +10 Atk), Rapid Restore/Heal, Protect prayers, etc. Prayer points = level;
**bones buried** give Prayer XP (regular bones 4.5; values vary). Quick-prayers exist.

**(b) Eldermoor**
- `src/prayer-tab.js` — 8 prayers (original IP names mapping OSRS): stoneskin(1,+5%Def),
  ironwill(4,+5%Str), keeneye(7,+5%Atk), truearrow(8,+5%Range), innerflame(9,+5%Mage),
  granitehide(10,+10%Def), berserkersoul(13,+10%Str), hawkeye(16,+10%Atk). Points pool max =
  prayer level, drain at 600ms (`DRAIN_INTERVAL_MS`), auto-off all at 0; exposes `EMPRAYERPTS`.
  `buryBones()` consumes 1 `bones`, awards 45 Prayer XP.

**(c) Gaps**
- Only **8 prayers** — no Protect-from-Melee/Ranged/Magic, Rapid Restore/Heal, Retribution,
  Redemption, Smite, or higher-tier (Piety-equivalent) prayers.
- **Bury XP = 45** (likely too high vs OSRS 4.5 regular bones) — confirm intended scale.
- **No quick-prayers** (orb toggle / right-click setup) — ties to Gap §1.
- Drain is **flat 1–2/tick** regardless of points-remaining mechanics; no Prayer-bonus gear
  affecting drain rate.

---

## 5. Standard spellbook + runes

**(a) OSRS** — standard book = 4 elements × 5 tiers (Strike→Bolt→Blast→Wave→Surge) + curses
(Confuse/Weaken/Curse/Vulnerability/Enfeeble/Stun), Bind/Snare/Entangle, teleports (Home + city
teleports, all use **law runes**), enchant jewellery, Low/High Alchemy, Superheat, Bones to
Bananas/Peaches, Telekinetic Grab, Charge. **Runes are consumed per cast**; combat casts give Magic
XP (offensive) and Hitpoints XP.

**(b) Eldermoor**
- `src/magic-tab.js` — 12 spells (original IP): combat tier = gale-bolt(1)/spring-lance(5)/
  stone-jab(9)/ember-spit(13) [Strike], gale-shard(17)/spring-shard(23)/stone-shard(29)/
  ember-shard(35) [Bolt]; mire-snare(31) [Bind]; hex-of-frailty(19) [curse]; teleports
  hearthward(25)/moorgate-step(45). 10 rune types tracked by inventory id; `hasRunes()` checks,
  `consumeRunes()` **deducts from inventory on cast**; `awardMagicXp(dmg)` = 2×dmg Magic + 1.33 HP;
  max hit = floor(magLevel/5)+1.

**(c) Gaps**
- **Only Strike + Bolt tiers** — no Blast/Wave/Surge combat spells.
- **No utility spells**: enchant, Low/High Alchemy, Superheat, Bones to Bananas, Telekinetic Grab.
- **Only 1 curse** (Confuse-equivalent) — Weaken/Vulnerability/Enfeeble/Stun absent.
- Teleports do **not all gate on law runes** consistently vs OSRS; only 2 destinations.
- No Magic **autocast / spell-on-target** selection from combat tab (cast is from magic tab only).

---

## 6. Dialogue UX (dismiss / close / new-conversation)

**(a) OSRS** — dialogue box at bottom; **Space/Enter or click** advances; number keys **1–N**
pick options; continue chevron shown when no options; pressing a new NPC or moving away ends it;
no explicit X — it auto-dismisses on the terminal node or on walking away.

**(b) Eldermoor**
- `src/dialogue.js` — `sayLines(name,lines)`/`talk(npc)`; `nextDlg()` (flat queue) / `treeAdvance()`
  (tree). Space/Enter/Spacebar advances no-option nodes; ▼ continue affordance wired to
  `treeAdvance()`; number keys 1–5 pick options; terminal node (no options, no next) → `endTree()`
  hides `#dlg`, nulls `treeState`/`dlgNpc`/`chat.npc`. `assets/data/dialogue.json` = tree schema
  (start, nodes{speaker,text,options,give,action,next}).

**(c) Gaps**
- **No way to abort mid-conversation** — no Esc-to-close, no click-outside dismiss; you must read
  to a terminal node (grep: no `close`/`esc`/`dismiss` handler in `dialogue.js`).
- **Cannot start a new conversation while one is open** — `talk()` freezes `chat.npc`; clicking
  another NPC mid-dialogue is not handled (must finish/abort first; but abort doesn't exist).
- Walking away does **not** end the dialogue (OSRS auto-ends on move out of range).

---

## 7. Login / logout flow

**(a) OSRS** — title screen → login (username/password) → optional world select → lobby → world.
**Logout** button (Account/Logout tab) with a click; "Click here to logout" + "World switcher".
Returns to login screen; session persists character on server.

**(b) Eldermoor**
- `src/main.js` — **no login/title at startup**: `startLoading()` loads assets+JSON, then
  `initCharCreate()` shows the character designer **only if no appearance saved** in
  `localStorage['eldermoor:appearance']`, else drops straight into the world; game loop starts
  immediately. No account/character-select.
- `src/logout-tab.js` — Logout tab with "Click here to logout" (no confirm) + "Switch world"
  (stub). `EMLOGOUT.logout()` clears `localStorage['eldermoor:session']` then `showTitle()` →
  `#em-title-overlay` ("Eldermoor" + "Click to play", click-anywhere dismiss).

**(c) Gaps**
- **Title screen only appears after logout**, never on first load — startup skips straight to
  charcreate/world. OSRS always shows title→login first.
- **No login step** (no username, no auth, no world list) — single local profile via localStorage.
- **"Switch world" is a stub** — no behaviour.
- Logout has **no confirmation** and no "you have been disconnected" / save-on-logout messaging.

---

## File → gap table

| File | Gap to close |
|---|---|
| `src/orbs.js` | Spec orb hardcoded `cur:100` — implement real special-attack pool + use; orb numbers don't recolour (green→yellow→red) on drain. |
| `src/orbs.js` + `src/prayer-tab.js` | Prayer orb is display-only — add click quick-prayers toggle + right-click setup. |
| `src/xpcounter.js` | No per-skill trackers/goals/Setup menu; total-XP counter and per-hit XP drops are two separate systems. |
| `src/hud.js` | Tab dock = 7-col emoji grid (not OSRS two-row); chat channels missing a dedicated "Channel" tab. |
| `src/inventory-ops.js` | Use-on works inventory→inventory only; no Use-on-world-object/NPC; no stackable quantity colouring. |
| `src/hud.js` (inventory) | Verify drag-to-rearrange actually reorders/persists (beyond equip-drag). |
| `src/combat.js` + `combat.json` | Controlled "shared" mode awards only `trains[0]` — verify 1.33 to all three; no weapon-aware style sets; no Ranged style tab swap. |
| `src/combat.js` | Longrange ranged style (2 Ranged + 2 Def) missing; defensive magic autocast (Magic+Def) missing; no invisible +3/+1 style boosts. |
| `src/prayer-tab.js` | Only 8 prayers — add Protect-from-X, Rapid Restore/Heal, Retribution/Redemption/Smite, top-tier; bury XP=45 likely mis-scaled; flat drain. |
| `src/magic-tab.js` | Only Strike+Bolt tiers; no Blast/Wave/Surge; no enchant/alchemy/superheat/grab utility; only 1 curse; no autocast/spell-on-target. |
| `src/dialogue.js` | No Esc/click-outside abort; cannot start new conversation while one is open; walking away doesn't end dialogue. |
| `src/main.js` | No title/login screen on first load (skips to charcreate/world); no account/world-select. |
| `src/logout-tab.js` | No logout confirmation; "Switch world" is a stub; no save-on-logout messaging. |
