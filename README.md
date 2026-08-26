# HELL TRAIN 🚂💀

A complete, polished 2D top-down supernatural roguelite where **the player and the train are both powerful evolving combat systems**. Hand-crafted pixel art, procedural worlds, multiple realms, real bosses, real evolutions, real Supabase leaderboards.

---

## ▶ Quick start

```bash
# from this directory
python3 -m http.server 5173
# then open http://localhost:5173/
```

No build step. No npm install. The game runs straight from the served files.

Controls:

- **WASD / Arrow keys** — move
- **Space** — use ability
- **Mouse** — click UI (menus, upgrade cards, world map, train base)
- **Escape** — pause

---

## 🗂 Project layout

```
hell-train/
├── index.html            — entry, loads Supabase CDN
├── css/style.css         — UI styling
├── js/
│   ├── main.js           — boot, scenes, save
│   ├── core/
│   │   ├── config.js     — palette, view size, constants
│   │   ├── utils.js      — RNG, math, helpers
│   │   ├── sprite.js     — sprite renderer + tinting/scaling
│   │   ├── engine.js     — fixed-resolution game engine
│   │   ├── input.js      — keyboard + mouse input
│   │   ├── save.js       — local persistence
│   │   └── world.js      — procedural map generation
│   ├── data/
│   │   ├── sprites.js    — hand-crafted pixel art (player, train, enemies, bosses)
│   │   ├── weapons.js    — weapons, abilities, cores
│   │   ├── enemies.js    — enemy archetypes + elite modifiers
│   │   └── realms.js     — realms, bosses, upgrades, relics, armour, lore, synergies
│   ├── entities/
│   │   ├── player.js     — Player class
│   │   ├── enemy.js      — Enemy class + AI behaviors
│   │   ├── train.js      — Train as second combat system
│   │   ├── projectile.js — Projectile + Meteor + Flame
│   │   ├── pickup.js     — XP / shard / heart / chest
│   │   └── boss.js       — Boss with phases
│   ├── systems/
│   │   ├── gameplay.js   — GameplayScene (main game loop)
│   │   ├── fx.js         — particle system + camera
│   │   ├── audio.js      — WebAudio synth (music + SFX)
│   │   └── supabase.js   — secure leaderboard client
│   └── ui/menu.js        — all UI scenes
├── supabase/schema.sql   — secure RLS schema for leaderboards
└── tools/                — offline art previews
```

## 🌐 Supabase backend (optional)

The game is fully playable **offline**. To enable global leaderboards:

1. Create a Supabase project.
2. Run [`supabase/schema.sql`](supabase/schema.sql) in the SQL editor.
3. Either:
   - Open `index.html? s URL = https://YOUR-PROJECT.supabase.co & skey = YOUR-ANON-KEY`
   - Or set `window.HELLTRAIN_SUPABASE_URL` / `window.HELLTRAIN_SUPABASE_ANON` in your build.
4. For production, **deploy a Supabase Edge Function** (`submit-score`) that validates and inserts using the service role key. The schema includes an anti-cheat trigger that rate-limits submissions.

The client validates `score`, `time_s`, `stage`, `player_id` length, and `realm`. Direct INSERTs from the anon key are blocked by RLS — go through the Edge Function.

## 🎮 Game features

### Core gameplay
- Auto-attacking top-down survivor combat
- Procedurally generated rooms with multiple room types
- Procedurally chained enemy spawns per realm
- Elites with random modifiers (Armoured / Fast / Giant / Regenerating / Teleporting / Summoner / Enraged / Void-Touched)
- Real bosses with **multi-phase attacks** (intro animation, phase transitions, special attacks)
- Real XP → level-up → **upgrade choice cards** with rarities
- Real weapon evolutions (Fireball + Explosion Core = **Inferno Nova**, etc.)

### Weapons (and their evolutions)
- **Fireball** → Multiple → Burning Ground → Explosive → Orbiting → **Hellstorm**
- **Orbital Blades** → +count/radius/speed → **Eclipse Ring** / **Storm Ring**
- **Void Bomb** → **Chain Reaction** / **Void Impact**
- **Lightning** → jumps → **Thunder God** / **Storm Ring**
- **Frost** → **Absolute Zero** / **Shatter**
- **Shadow** → **Shadow Army** / **Darkflame**
- **Meteor** → **World Breaker**
- **Void Step** → **Phantom Shift**

### Train (the second combat system)
- HP / armour / energy / weapons / ultimates / carriages
- Multiple weapons fire automatically (Fireball Cannon, Lightning Tower, Flamethrower, Gravity Engine, Carriage Bombs, Train Ram, Phantom Satellites)
- **Hellfire Express**, **Void Collapse**, **Storm Departure**, **Ghost Train**, **Terminus Cannon** ultimates
- Animated wheels, steam, damage states, energy HUD

### Realms (8)
Purgatory / Infernal Fields / Forgotten City / Haunted Forest / Frozen Realm / Sunken Desert / The Void / The Terminus

Each has its own palette, biome, mechanic, music and boss.

### Build archetypes
🔥 Inferno · ⚡ Tempest · ❄ Absolute Zero · 🌑 Nightmare · 🌌 Void · 💥 Demolition · 🛡 Fortress · 🚂 Conductor · 🌀 Orbital · ☄ Apocalypse

### Permanent progression
- Eclipse Shards (currency)
- Boss Cores (per-boss unlocks)
- Train Parts
- Permanent character & train upgrade trees
- Achievements (26)
- Daily Run (deterministic seed)
- Weekly Challenge (rotating modifiers)
- Lore fragments discovered across runs

### Polish
- Hit-stop, screen shake, damage flashes, particle bursts, animated projectiles
- Pixel-perfect rendering at 480×270 → upscaled with `image-rendering: pixelated`
- Realm-specific music & boss music (procedurally synthesised — no audio assets)
- Realm-specific environmental animation (snow, embers, sand, fog, sparks, leaves)
- Soft stylised "blood" only as hit-flash; emphasis on supernatural VFX

## ⚡ Performance
- Pool-based particle system (capped at 2500)
- Procedural world (no large textures)
- Sprite batching via cached ImageData
- Camera-follow with smooth lerp
- Single `requestAnimationFrame` loop drives all scenes

## 🐛 Bugs & fixes
If you find a bug, open an issue. The game is intended to be self-contained: a Supabase outage never crashes gameplay.

## 📜 License
MIT.

---

> *The train remembers previous runs. It always has.*
