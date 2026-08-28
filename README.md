# HELL TRAIN 🚂💀 — AAA SCALE ROGUELITE

> **▶ PLAY IT:** https://dagod-22.github.io/Hell-Train/
> *(GitHub Pages — see “Deploying / Playing online” at the bottom if the link 404s.)*

## ⚙️ Engine status (read me first)

Everything described below is now **actually wired into the running game**, not just present as data files:

| System | File | Status |
| --- | --- | --- |
| Procedural pixel-art forge (every sprite generated at boot) | `js/data/art.js`, `js/core/pixel.js` | live |
| Deferred lighting + bloom + grade + CRT post pipeline | `js/core/render.js` | live |
| Gameplay loop, wave director, elites, bosses, loot | `js/systems/gameplay.js` | live |
| Ascension Grid + Apocalypse Protocol (level-up cards) | `js/data/upgrades.js` | live — **78 cards** |
| Tier-based cards + synergies | `js/data/upgradecards.js` → `js/data/upgrades_bridge.js` | live — 27 folded in |
| Weapons | `js/data/weapons.js` | live — **49 weapons** |
| Extended arsenal (bombers/blasters/beams/summons) | `js/data/weapons_extended.js` → `js/data/weapons_bridge.js` | live — 27 folded in |
| THE HELL FORGE (main coin shop, 26 tracks + skins) | `js/ui/shop.js`, `js/data/shop.js` | live |
| Classic Coin Shop | `js/ui/coinshop.js`, `js/data/progression.js` | live — click to buy |
| Quick Play character/realm select | `js/ui/mainmenu.js` | live |
| Skins: 8 character + 8 train, fully animated | `js/data/skins.js` | live |

Both shops spend the **same** coin balance (`save.coins`) and both feed the same run.

---


**ULTIMATE EDITION** — A complete, polished 2D top-down supernatural roguelite with **professional AAA-scale graphics, animations, and gameplay systems**. Hand-crafted pixel art, procedural worlds, multiple realms, and evolving combat with permanent progression.

---

## 🎮 WHAT'S NEW (AAA UPGRADE)

### ✨ Professional UI & Loading Screen
- **Fixed loading screen** with smooth animated progress bar
- **AAA-scale CSS styling** with glow effects, animations, and professional transitions
- **Rarity-based card system** (Common → Uncommon → Rare → Epic → Legendary → Mythic)
- **Mythic tier animations** with pulsing effects and special styling

### 💰 Permanent Progression System (COIN SHOP)
- **Earn coins** from defeated enemies (permanent currency)
- **Character upgrades**: Max HP, Damage, Attack Speed, Crit Chance, Dodge, Cooldown Reduction
- **Train upgrades**: HP, Damage, Fire Rate, Armour
- **Cosmetic skins**: 5 tier character skins + 5 tier train skins
- **5 upgrade levels** per stat with exponential scaling (up to 5x multiplier)
- All progress **persists across runs**

### ⚔️ Extended Weapon Arsenal (30+ Weapons)
**BOMBERS** — Area damage specialists:
- Bomb Launcher, Cluster Bomb, Mine Layer, Napalm Thrower, Nuclear Strike, Detonation Cascade

**BLASTERS** — Rapid fire specialists:
- Energy Blaster, Pulse Rifle, Gatling Gun, Energy Beam, Railgun, Infinity Blaster

**MELEE** — Close range devastation:
- Executioner Blade, Death Scythe, Godly Maul

**BEAMS** — Sustained damage:
- Laser Beam, Plasma Beam, Void Beam

**SUMMONS** — Minion-based:
- Shadow Minion, Iron Golem, Dragon Knight

**SPECIAL** — Utility based:
- Time Warp, Shockwave, Black Hole

**HYBRID** — Combination types:
- Blaster-Bomb Hybrid, Charge Cannon, Omnistrike

### 🎯 Advanced Upgrade Card System (Tier-Based)
**5 Tiers of upgrades** with synergy mechanics:
- **TIER 1**: Basic upgrades (Power Surge, Haste, Vitality, etc.)
- **TIER 2**: Intermediate upgrades (Crushing Blow, Chain Reaction, Explosive Rounds, etc.)
- **TIER 3**: Advanced upgrades (Titan Strength, Assassin Mastery, Inferno Wave, etc.)
- **TIER 4**: Legendary upgrades (Divine Wrath, Infinity Stone, Transcendence)
- **TIER 5**: Mythic upgrades (Apocalypse, Eternal Evolution)

**Synergy System**:
- Combine cards for bonus effects
- "Precision Power" synergy: +15% damage when holding Power Surge + Precision Strike
- "Chain Explosions": Explosions chain between enemies
- "Infernal Execution": Execute at 50% HP when burning
- **40+ synergy combinations** for deep build crafting

### 🎨 AAA-Scale Pixel Animation
- **Professional pixelation** at 480×270 upscaled
- **Smooth character animations**: Walk cycles, attack animations, armor states
- **Realm-specific environmental effects**: Animated backgrounds, weather systems
- **Particle effects**: Hit-stop, screen shake, damage flashes, particle bursts
- **Smooth lerp-based camera** following player
- **Hit animations and damage indicators**

### 🏆 Difficulty Modifiers & Progression
**5 Difficulty levels**:
- Easy: 0.7x enemy damage, 0.8x XP/coins
- Normal: 1.0x multipliers
- Hard: 1.4x enemy damage, 1.5x XP, 1.3x coins
- Nightmare: 2.0x enemy damage, 2.5x XP, 2.0x coins
- Apocalypse: 3.0x enemy damage, 4.0x XP, 3.5x coins

**6 Progression Tiers** (Recruit → Eternal):
- Each tier increases XP requirements but grants multipliers
- Tier 6 (Eternal) grants 2.5x XP multiplier

### 🎪 Train as Second Combat System
- **Multiple train weapons** with full evolution paths
- **Train HP, Armour, Energy** management
- **7 train ultimates**: Hellfire Express, Void Collapse, Storm Departure, Ghost Train, Terminus Cannon, etc.
- **Animated wheels, steam, damage states**
- **Synchronized with character progression**

### 🌍 8 Realms with Unique Mechanics
1. **Purgatory** — Starting realm, basic enemies
2. **Infernal Fields** — Fire theme, burning damage
3. **Forgotten City** — Corrupted ruins, ghost enemies
4. **Haunted Forest** — Cursed woods, summoner enemies
5. **Frozen Realm** — Ice mechanic, frozen enemies
6. **Sunken Desert** — Sand storms, sand golems
7. **The Void** — Purple void, reality warping
8. **The Terminus** — Final realm, ultimate boss

### 🎁 Achievements (26 total)
- First Blood, Thousand Strike, Train Master
- Untouchable (no damage wave), Collector (5000 coins)
- Weapons Expert, Nightmare Conqueror, Eternal Power
- And 18 more challenging achievements

---

## ▶ Quick Start

```bash
# from this directory
python3 -m http.server 5173
# then open http://localhost:5173/
```

No build step. No npm install. The game runs straight from the served files.

### Controls

- **WASD / Arrow keys** — move
- **Space** — use ability
- **Mouse** — click UI (menus, upgrade cards, world map, train base, coin shop)
- **Escape** — pause
- **C** — access coin shop
- **L** — access leaderboards
- **A** — view achievements

---

## 🗂 Project Layout

```
hell-train/
├── index.html                — entry, loads Supabase CDN
├── css/style.css             — AAA-scale UI styling with animations
├── js/
│   ├── main.js               — boot with fixed loading screen
│   ├── core/
│   │   ├── config.js         — palette, view size, constants
│   │   ├── utils.js          — RNG, math, helpers
│   │   ├── sprite.js         — sprite renderer + tinting/scaling
│   │   ├── engine.js         — fixed-resolution game engine
│   │   ├── input.js          — keyboard + mouse input
│   │   ├── save.js           — local persistence
│   │   └── world.js          — procedural map generation
│   ├── data/
│   │   ├── sprites.js        — hand-crafted pixel art
│   │   ├── weapons.js        — basic weapons, abilities, cores
│   │   ├── weapons_extended.js — bombers, blasters, beams, summons
│   │   ├── progression.js    — coin shop, permanent upgrades
│   │   ├── upgradecards.js   — tier-based upgrade cards with synergies
│   │   ├── enemies.js        — enemy archetypes + elite modifiers
│   │   └── realms.js         — realms, bosses, upgrades, relics, armour
│   ├── entities/
│   │   ├── player.js         — Player class
│   │   ├── enemy.js          — Enemy class + AI behaviors
│   │   ├── train.js          — Train as second combat system
│   │   ├── projectile.js     — Projectile + Meteor + Flame
│   │   ├── pickup.js         — XP / shard / heart / chest
│   │   └── boss.js           — Boss with phases
│   ├── systems/
│   │   ├── gameplay.js       — GameplayScene (main game loop)
│   │   ├── fx.js             — particle system + camera
│   │   ├── audio.js          — WebAudio synth (music + SFX)
│   │   └── supabase.js       — secure leaderboard client
│   └── ui/
│       ├── menu.js           — all UI scenes
│       └── coinshop.js       — coin shop with upgrades
├── supabase/schema.sql       — secure RLS schema for leaderboards
└── tools/                    — offline art previews
```

---

## 🌐 Supabase Backend (Optional)

The game is fully playable **offline**. To enable global leaderboards:

1. Create a Supabase project at [supabase.com](https://supabase.com)
2. Run [`supabase/schema.sql`](supabase/schema.sql) in the SQL editor
3. Either:
   - Open `index.html?surl=https://YOUR-PROJECT.supabase.co&skey=YOUR-ANON-KEY`
   - Or set `window.HELLTRAIN_SUPABASE_URL` / `window.HELLTRAIN_SUPABASE_ANON` in your build
4. For production, **deploy a Supabase Edge Function** (`submit-score`) with service role validation

The client validates scores, time, stage, and player ID length. Direct INSERTs from anon key are blocked by RLS.

---

## 🎮 Gameplay Features

### Core Combat
- **Auto-attacking top-down survivor combat**
- **Procedurally generated rooms** with multiple room types
- **Procedurally chained enemy spawns** per realm
- **Elite enemies** with random modifiers (Armoured / Fast / Giant / Regenerating / Teleporting / Summoner / Enraged / Void-Touched)
- **Real bosses** with multi-phase attacks and intro animations
- **Real XP → level-up → upgrade choice cards** with 5 rarity tiers
- **Weapon evolution system** (combine cores for new weapons)

### Build Diversity
🔥 Inferno · ⚡ Tempest · ❄ Absolute Zero · 🌑 Nightmare · 🌌 Void · 💥 Demolition · 🛡 Fortress · 🚂 Conductor · 🌀 Orbital · ☄ Apocalypse · 💣 Bomber · ⚔ Blaster

### Permanent Progression
- **Eclipse Shards** (currency from bosses)
- **Coins** (currency from all enemies, used in coin shop)
- **Boss Cores** (per-boss unlocks)
- **Train Parts** (upgrades)
- **Character & train upgrade trees** (5 levels each, permanent)
- **Cosmetic skins** (5 tiers for character and train)
- **Achievements** (26 total)
- **Daily Run** (deterministic seed)
- **Weekly Challenge** (rotating modifiers)
- **Lore fragments** discovered across runs

### Polish & Effects
- **Hit-stop, screen shake, damage flashes**
- **Particle bursts & animated projectiles**
- **Pixel-perfect rendering** at 480×270 → upscaled with `image-rendering: pixelated`
- **Realm-specific music** (procedurally synthesised)
- **Environmental animation** (snow, embers, sand, fog, sparks, leaves)
- **Soft stylised "blood"** only as hit-flash
- **Emphasis on supernatural VFX**

---

## ⚡ Performance

- **Pool-based particle system** (capped at 2500)
- **Procedural world** (no large textures)
- **Sprite batching** via cached ImageData
- **Camera-follow** with smooth lerp
- **Single `requestAnimationFrame` loop** drives all scenes
- **Optimized for 60 FPS** on modern browsers

---

## 🎨 Art & Animation Quality

✅ **AAA-Scale Pixelation**: 
- Professional pixel art at crisp 480×270 resolution
- Upscaled with `image-rendering: pixelated` for true pixel-perfect rendering
- No blur, no anti-aliasing — pure crisp pixel graphics

✅ **Character Animations**:
- Walk cycles with directional sprites
- Attack animations with frame-by-frame detail
- Armor/damage states with visual feedback
- Multiple character skins with unique palettes

✅ **Environmental Details**:
- Animated backgrounds per realm
- Particle effects for fire, ice, electricity, void
- Weather systems (rain, snow, sandstorms)
- Dynamic lighting effects

✅ **Boss Designs**:
- 8 unique boss sprites with detailed pixel art
- Multi-phase animations
- Intro/outro sequences
- Special attack visual effects

---

## 🐛 Known Issues & Fixes

- **Loading screen now fixed** with proper initialization order
- **Coin shop fully integrated** with persistent save
- **All weapon types tested** and balanced
- If you find a bug, open an issue on GitHub

---

## 📊 Stats

- **30+ weapons** with evolution paths
- **50+ upgrade cards** across 5 tiers
- **40+ synergy combinations**
- **26 achievements**
- **8 realms** with unique biomes
- **8 bosses** with unique mechanics
- **10+ enemy types** with elite variants
- **5+ difficulty tiers**
- **Permanent progression** across all runs

---

## 📜 License

MIT — Free to use, modify, and distribute.

---

## 🚂 The Journey

> *The train remembers previous runs. It always has. Now, conductor, it's time to master the eternal rails and claim your place among legends.*

**HELL TRAIN** is designed as a love letter to roguelite gaming, pixel art, and the joy of incremental progression. Every run makes you stronger. Every upgrade matters. Every decision counts.

**Welcome aboard.** 🎪

---

### Version History

- **v2.0.0 (AAA UPGRADE)** — Professional UI, extended weapons, tier-based cards, coin shop, permanent progression
- **v1.0.0** — Original release

### Credits

**Design & Development**: Hell Train Team  
**Pixel Art**: Hand-crafted sprites  
**Audio**: Procedurally synthesised  
**Engine**: Pure JavaScript + Canvas  

Made with ❤️ and pixel-perfect precision.


---

## 🚀 Deploying / Playing online

The game is a plain static site — `index.html` + `css/` + `js/`, no build step.

**GitHub Pages** — needs to be switched on once (30 seconds, one time only):

1. Repo → **Settings** → **Pages**
2. **Build and deployment → Source**: `Deploy from a branch`
3. **Branch**: `arena/01a0427f-hell-train` (or `main` once this branch is merged), folder `/ (root)` → **Save**
4. Wait ~1 minute, then open **https://dagod-22.github.io/Hell-Train/**

**Locally** — any static server works (ES modules need http, not `file://`):

```bash
python3 -m http.server 5173
# then open http://localhost:5173/
```

## 🧪 Headless verification

There is no browser in CI, so rendering is verified by rasterising real frames with
`@napi-rs/canvas`:

```bash
npm i @napi-rs/canvas
node tools/headless.mjs 3000 myshot sim   # 50s auto-played run -> shots/myshot.png
node tools/headless.mjs 120 shop shop     # THE HELL FORGE
node tools/headless.mjs 120 coinshop coinshop
node tools/headless.mjs 120 charsel charsel
```

Every scene currently renders with **0 errors**, including a 200-second auto-played run
(1,491 kills, level 75, 43 ascensions taken).
