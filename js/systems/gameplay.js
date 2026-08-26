// ============================================================
// HELL TRAIN — Main gameplay scene
// ============================================================
import { CFG, PAL } from '../core/config.js';
import { RNG, rand, randInt, clamp, dist, dist2, TAU, easeOutCubic, fmtNum, fmtTime, circleHit, moveWithCollision } from '../core/utils.js';
import { World, T } from '../core/world.js';
import { FXSystem, Camera } from '../systems/fx.js';
import { Input } from '../core/input.js';
import { Player } from '../entities/player.js';
import { makeEnemy } from '../entities/enemy.js';
import { Projectile, Meteor, Flame } from '../entities/projectile.js';
import { Pickup } from '../entities/pickup.js';
import { Boss } from '../entities/boss.js';
import { Train } from '../entities/train.js';
import { UPGRADES, REALMS, BOSS_DEFS, findRealm, findDifficulty, WEEKLY_CHALLENGES, ACHIEVEMENTS, EVENTS, LORE, RELICS, ARMOURS, SYNERGIES } from '../data/realms.js';
import { findEvolution, findWeapon, findCore, findAbility, CORES } from '../data/weapons.js';
import { drawSprite, spriteCanvas } from '../core/sprite.js';

export class GameplayScene {
  constructor(ctx) {
    this.engine = ctx;
    this.canvas = ctx.canvas;
    this.input = new Input(this.canvas);
    this.fx = new FXSystem(2500);
    this.camera = new Camera(CFG.VIEW_W, CFG.VIEW_H);
    this.save = ctx.save;
    this.runSeed = ctx.runSeed || ((Math.random() * 4294967295) >>> 0);
    this.realmId = ctx.realmId || 'purgatory';
    this.stage = ctx.stage || 1;
    this.difficulty = findDifficulty(ctx.difficulty || 'normal');
    this.weeklyChallenge = ctx.weeklyChallenge || null;
    this.dailySeed = ctx.dailySeed || null;
    this.paused = false;
    this.upgradeChoices = null;
    this.eventChoice = null;
    this.runStart = performance.now();
    this.bossSpawned = false;
    this.bossDefeated = false;
    this.trainSpawned = false;
    this.trainDead = false;
    this.runStats = { kills: 0, damageDealt: 0, damageTaken: 0, level: 1, relics: [], cores: [],
      shards: 0, trainHpLost: 0, bossesDefeated: 0, perfectRoom: true };
    this.gameStats = { shards: 0, kills: 0, lastBossAt: 0, phaseChanges: 0 };
    this._build();
  }

  _build() {
    // Build world
    const seed = (this.runSeed ^ hashStr(this.realmId + ':' + this.stage + ':' + (this.dailySeed || 0))) >>> 0;
    this.world = new World(seed, this.realmId, this.difficulty);
    this.sprites = this.engine.sprites;
    // Player at spawn
    this.player = new Player(this.world.playerSpawn.x, this.world.playerSpawn.y, this.sprites, this.save);
    // Train (carriage in start room)
    this.train = new Train(this.world.playerSpawn.x - 90, this.world.playerSpawn.y + 30, this.sprites, this.difficulty);
    // Entities
    this.enemies = [];
    this.projectiles = [];
    this.meteors = [];
    this.flames = [];
    this.pickups = [];
    // Background objects (decor animators)
    this.bgAnim = [];
    this._spawnEnemiesForRoom(this.world.rooms[0]);
    this._spawnBgAnim();
    this.camera.x = this.player.x; this.camera.y = this.player.y;
  }

  _spawnBgAnim() {
    // Realm-specific background animators
    if (this.realmId === 'frozen') {
      for (let i = 0; i < 60; i++) this.bgAnim.push({ kind: 'snow', x: Math.random() * 4000 - 2000, y: Math.random() * 4000 - 2000 });
    } else if (this.realmId === 'infernal') {
      for (let i = 0; i < 60; i++) this.bgAnim.push({ kind: 'ember', x: Math.random() * 4000 - 2000, y: Math.random() * 4000 - 2000 });
    } else if (this.realmId === 'desert') {
      for (let i = 0; i < 60; i++) this.bgAnim.push({ kind: 'sand', x: Math.random() * 4000 - 2000, y: Math.random() * 4000 - 2000 });
    } else if (this.realmId === 'forest') {
      for (let i = 0; i < 40; i++) this.bgAnim.push({ kind: 'leaf', x: Math.random() * 4000 - 2000, y: Math.random() * 4000 - 2000 });
    } else if (this.realmId === 'void' || this.realmId === 'phantom') {
      for (let i = 0; i < 40; i++) this.bgAnim.push({ kind: 'spark', x: Math.random() * 4000 - 2000, y: Math.random() * 4000 - 2000 });
    } else if (this.realmId === 'terminus') {
      for (let i = 0; i < 40; i++) this.bgAnim.push({ kind: 'spark', x: Math.random() * 4000 - 2000, y: Math.random() * 4000 - 2000 });
    } else {
      // purgatory/forgotten: fog wisps + embers
      for (let i = 0; i < 30; i++) this.bgAnim.push({ kind: 'fog', x: Math.random() * 4000 - 2000, y: Math.random() * 4000 - 2000 });
      for (let i = 0; i < 24; i++) this.bgAnim.push({ kind: 'ember', x: Math.random() * 4000 - 2000, y: Math.random() * 4000 - 2000 });
    }
  }

  _spawnEnemiesForRoom(room, force = false) {
    const roster = this.world.pickEnemyRoster(this.stage);
    const roomW = room.w * 16, roomH = room.h * 16;
    const cx = (room.x + room.w / 2) * 16, cy = (room.y + room.h / 2) * 16;
    let count = 4 + this.stage * 2;
    if (room.kind === 'elite') count = 3;
    if (room.kind === 'boss') count = 0; // boss spawn handled separately
    for (let i = 0; i < count; i++) {
      const dx = (Math.random() - 0.5) * roomW * 0.7;
      const dy = (Math.random() - 0.5) * roomH * 0.7;
      const x = cx + dx, y = cy + dy;
      const id = roster[Math.floor(Math.random() * roster.length)];
      const e = makeEnemy(id, x, y, this.realmId, this.difficulty);
      if (!e) continue;
      if (room.kind === 'elite') {
        const mods = ['armoured','fast','giant','regenerating','teleporting','summoner','enraged','void_touched'];
        const mod = mods[Math.floor(Math.random() * mods.length)];
        e.applyMod({ id: mod, name: mod, apply: (m => this._applyEliteMod(e, mod)) });
      }
      e._id = (this.enemies.length + 1) << 8;
      this.enemies.push(e);
    }
  }

  _applyEliteMod(e, mod) {
    const map = {
      armoured: (e) => { e.hp *= 2.2; e.radius += 1; },
      fast: (e) => { e.spd *= 1.6; e.dmg *= 0.9; },
      giant: (e) => { e.hp *= 4; e.spd *= 0.85; e.radius *= 1.6; e.scale = 2; e.dmg *= 1.5; e.giant = true; },
      regenerating: (e) => { e.regen = Math.max(2, e.hp * 0.04); },
      teleporting: (e) => { e.teleportCd = 4; e.teleportRange = 80; },
      summoner: (e) => { e.ai = 'summoner'; e.summon = { id: 'firefly_swarm', cd: 3.5, count: 2, max: 4 }; e.hp *= 1.4; },
      enraged: (e) => { e.dmg *= 1.7; e.spd *= 1.15; },
      void_touched: (e) => { e.voidTouched = true; e.hp *= 1.7; e.dmg *= 1.2; },
    };
    map[mod]?.(e);
    e.eliteMod = mod;
  }

  // ===== context helpers exposed to entities =====
  spawnEnemy(id, x, y) {
    const e = makeEnemy(id, x, y, this.realmId, this.difficulty);
    if (!e) return;
    e._id = (this.enemies.length + 1) << 8;
    this.enemies.push(e);
  }
  spawnProjectile(opts) {
    const p = new Projectile(opts);
    p._id = (this.projectiles.length + 1) << 8;
    this.projectiles.push(p);
  }
  spawnMeteor(x, y, dmg, radius) {
    this.meteors.push(new Meteor(x - 0, y, { x, y }, dmg, radius));
  }
  spawnFlame(x, y, ang, range, dmg) {
    this.flames.push(new Flame(x, y, ang, range, dmg));
  }
  spawnExplosion(x, y, radius, dmg, family) {
    this.fx.burst(x, y, family === 'fire' ? '#ff5a33' : family === 'ice' ? '#a8d4f4' :
      family === 'void' ? '#985ce0' : '#ffffff', 24, { life: 0.6, spd: 200 });
    this.fx.flash(x, y, '#ffffff', 0.05);
    this.fx.shakeScreen(3, 0.12);
    for (const e of this.enemiesInRange(x, y, radius)) {
      e.takeDamage(dmg, { family });
    }
  }
  enemiesInRange(x, y, r) {
    const out = [];
    const r2 = r * r;
    for (const e of this.enemies) {
      if (!e.alive) continue;
      const dx = e.x - x, dy = e.y - y;
      if (dx * dx + dy * dy <= r2) out.push(e);
    }
    return out;
  }
  findNearestEnemy(x, y, maxR) {
    let best = null, bd = maxR * maxR;
    for (const e of this.enemies) {
      if (!e.alive) continue;
      const dx = e.x - x, dy = e.y - y;
      const d2 = dx * dx + dy * dy;
      if (d2 <= bd) { best = e; bd = d2; }
    }
    return best;
  }
  onHit(e, dmg, opts) {
    if (!e.alive) return;
    e.takeDamage(dmg, opts);
    if (!e.alive) {
      // Drop loot
      this._onEnemyKilled(e);
    }
  }

  _onEnemyKilled(e) {
    this.runStats.kills += 1;
    this.gameStats.kills += 1;
    // XP drop
    const xp = (e.xp || 5) * (this.difficulty.xpMult || 1);
    this.pickups.push(new Pickup('xp', e.x, e.y, xp));
    if (e.eliteMod) {
      // elites drop hearts and shards
      for (let i = 0; i < 3; i++) this.pickups.push(new Pickup('shard', e.x + (Math.random() - 0.5) * 8, e.y + (Math.random() - 0.5) * 8, 1));
      if (Math.random() < 0.5) this.pickups.push(new Pickup('heart', e.x + (Math.random() - 0.5) * 8, e.y + (Math.random() - 0.5) * 8, 25));
    }
    // shards occasionally
    if (Math.random() < 0.06) {
      this.pickups.push(new Pickup('shard', e.x + (Math.random() - 0.5) * 6, e.y + (Math.random() - 0.5) * 6, 1));
    }
  }

  onBossKilled(b) {
    this.runStats.bossesDefeated += 1;
    this.bossDefeated = true;
    this.runStats.perfectRoom = false; // boss room clears
    // Reward shower
    for (let i = 0; i < 30; i++) {
      this.pickups.push(new Pickup('xp', b.x + (Math.random() - 0.5) * 40, b.y + (Math.random() - 0.5) * 40, 8));
    }
    for (let i = 0; i < 5; i++) {
      this.pickups.push(new Pickup('shard', b.x + (Math.random() - 0.5) * 30, b.y + (Math.random() - 0.5) * 30, 3));
    }
    for (let i = 0; i < 2; i++) {
      this.pickups.push(new Pickup('heart', b.x + (Math.random() - 0.5) * 20, b.y + (Math.random() - 0.5) * 20, 30));
    }
    this.fx.shakeScreen(8, 0.5);
    this.fx.flash(b.x, b.y, '#ffe066', 0.4);
    this.fx.burst(b.x, b.y, '#ffe066', 80, { life: 1.0, spd: 250 });
    this.save.bossCores = this.save.bossCores || {};
    this.save.bossCores[b.id] = (this.save.bossCores[b.id] || 0) + 1;
    // Unlock next realm
    const idx = REALMS.findIndex(r => r.id === this.realmId);
    if (idx >= 0 && idx < REALMS.length - 1) {
      this.save.unlockedRealms = Array.from(new Set([...(this.save.unlockedRealms || []), REALMS[idx + 1].id]));
    }
    // Achievement tracking
    if (this.realmId === 'purgatory') this._grantAchievement('purgatory_clear');
    if (this.realmId === 'infernal') this._grantAchievement('infernal_clear');
    if (this.realmId === 'forgotten') this._grantAchievement('forgotten_clear');
    if (this.realmId === 'forest') this._grantAchievement('forest_clear');
    if (this.realmId === 'frozen') this._grantAchievement('frozen_clear');
    if (this.realmId === 'desert') this._grantAchievement('desert_clear');
    if (this.realmId === 'void') this._grantAchievement('void_clear');
    if (this.realmId === 'terminus') this._grantAchievement('terminus');
  }

  _grantAchievement(id) {
    if (!this.save.achievements.includes(id)) {
      this.save.achievements.push(id);
      this.fx.damageText(this.player.x, this.player.y - 30, 'ACHIEVEMENT: ' + id, '#ffe066');
    }
  }

  // ===== UPDATE =====
  update(dt, time) {
    this.input.endFrame();
    if (!this.player.alive && this.player.animDeath <= 0) {
      this._onRunEnd();
      return;
    }
    if (this.upgradeChoices || this.eventChoice) {
      this._handleChoice();
      return;
    }
    if (this.bossDefeated) {
      this._endStageTransition(dt);
      return;
    }
    // Player movement
    const a = this.input.axis();
    const speed = 110 * this.player.moveSpd;
    const dx = a.x * speed, dy = a.y * speed;
    // facing
    if (Math.abs(dx) > Math.abs(dy)) {
      this.player.facing = dx < 0 ? 'left' : 'right';
    } else if (Math.abs(dy) > 0) {
      this.player.facing = dy < 0 ? 'up' : 'down';
    }
    // move with collision
    const r = this.player.radius;
    let nx = this.player.x + dx * dt, ny = this.player.y + dy * dt;
    if (!this.world.isSolidWorld(nx + Math.sign(dx) * r, this.player.y)) this.player.x = nx;
    if (!this.world.isSolidWorld(this.player.x, ny + Math.sign(dy) * r)) this.player.y = ny;
    this.player.vx = dx; this.player.vy = dy;
    this.player.update(dt, this);
    // Auto attack
    this.player.autoAttack(dt, this);
    // Ability
    for (const a of this.player.abilities) {
      const s = this.player.abilityStates[a.id];
      s.cd = Math.max(0, s.cd - dt);
      if (s.cd <= 0 && this.input.wasPressed('Space')) {
        s.cd = a.cd;
        this._useAbility(a);
      }
    }
    // Train
    this.train.update(dt, this);
    // Enemies
    for (const e of this.enemies) e.update(dt, this);
    // Projectiles
    for (const p of this.projectiles) p.update(dt, this);
    for (const m of this.meteors) m.update(dt, this);
    for (const f of this.flames) f.update(dt, this);
    // Pickups
    for (const u of this.pickups) u.update(dt, this);
    // Boss spawn if player is in boss room
    if (!this.bossSpawned) {
      const bossRoom = this.world.rooms[this.world.rooms.length - 1];
      if (this.world.roomAtWorld(this.player.x, this.player.y)?.id === bossRoom.id) {
        this.bossSpawned = true;
        this._spawnBoss();
      }
    }
    // Boss update
    if (this.boss) {
      this.boss.update(dt, this);
      if (!this.boss.alive && this.boss.deathT <= 0) {
        this.boss = null;
        this.onBossKilled(this._lastBoss);
      }
      if (!this.boss.alive) this._lastBoss = this.boss;
    }
    // Cleanups
    this.enemies = this.enemies.filter(e => e.alive || e.deathT > 0);
    this.projectiles = this.projectiles.filter(p => p.alive);
    this.meteors = this.meteors.filter(m => m.alive);
    this.flames = this.flames.filter(f => f.alive);
    this.pickups = this.pickups.filter(u => u.alive);
    // Room-based enemy spawning: when player enters a room without enemies, spawn
    this._maybeSpawnRoomEnemies();
    // Update FX
    this.fx.update(dt);
    // Animate background
    this._updateBgAnim(dt);
    // Camera follow
    this.camera.follow(this.player.x, this.player.y, dt);
    // Camera shake
    this.camera.shake = this.fx.shake;
    // Apply realm mechanic
    this._realmMechanic(dt);
    // Track stats
    if (this.runStats.kills >= 1000) this._grantAchievement('unstoppable');
  }

  _handleChoice() {
    // numbers 1-4 select upgrade
    if (this.upgradeChoices) {
      for (let i = 0; i < 4; i++) {
        if (this.input.wasPressed('Digit' + (i + 1)) || this.input.wasPressed('Numpad' + (i + 1))) {
          const c = this.upgradeChoices[i];
          if (c) {
            c.apply(this.player);
            this.upgradeChoices = null;
            return;
          }
        }
      }
      // Also accept click on cards
      if (this.input.mouse.justDown) {
        const rect = this.canvas.getBoundingClientRect();
        const mx = (this.input.mouse.x / this.canvas.width) * CFG.VIEW_W;
        const my = (this.input.mouse.y / this.canvas.height) * CFG.VIEW_H;
        const cw = 100, ch = 80;
        const x0 = (CFG.VIEW_W - 4 * cw - 30) / 2;
        const y0 = (CFG.VIEW_H - ch) / 2;
        for (let i = 0; i < 4; i++) {
          const x = x0 + i * (cw + 10);
          if (mx >= x && mx <= x + cw && my >= y0 && my <= y0 + ch) {
            const c = this.upgradeChoices[i];
            if (c) { c.apply(this.player); this.upgradeChoices = null; return; }
          }
        }
      }
    }
    if (this.eventChoice) {
      if (this.input.wasPressed('Digit1') || this.input.wasPressed('Digit2') || this.input.wasPressed('Digit3')) {
        const i = parseInt([...this.input.justPressed].find(k => k.startsWith('Digit') && k.length > 5)?.slice(5) || '0', 10) - 1;
        if (i >= 0 && i < this.eventChoice.options.length) {
          this.eventChoice.options[i].effect(this);
          this.eventChoice = null;
        }
      }
    }
  }

  _useAbility(a) {
    if (a.id === 'dodge') {
      const ax = this.input.axis();
      const ang = Math.atan2(ax.y, ax.x);
      const useAng = Math.abs(ax.x) + Math.abs(ax.y) > 0.1 ? ang : -Math.PI / 2;
      const distT = a.dist;
      this.player.invuln = Math.max(this.player.invuln, a.dur);
      const sx = Math.cos(useAng) * distT, sy = Math.sin(useAng) * distT;
      const nx = this.player.x + sx, ny = this.player.y + sy;
      this.fx.burst(this.player.x, this.player.y, '#7ec8ff', 12, { life: 0.35, spd: 200 });
      this.player.x = nx; this.player.y = ny;
      this.fx.burst(nx, ny, '#7ec8ff', 12, { life: 0.35, spd: 200 });
    } else if (a.id === 'blast') {
      this.fx.shakeScreen(5, 0.2);
      this.fx.burst(this.player.x, this.player.y, '#ff7a33', 28, { life: 0.5, spd: 220 });
      for (const e of this.enemiesInRange(this.player.x, this.player.y, a.radius)) {
        e.takeDamage(a.dmg, { family: 'fire' });
        const ang = Math.atan2(e.y - this.player.y, e.x - this.player.x);
        e.x += Math.cos(ang) * 60; e.y += Math.sin(ang) * 60;
      }
    } else if (a.id === 'magnet') {
      this.player._magnetUntil = this.t + a.dur;
      this.player._magnetRadius = a.radius;
    }
  }

  _maybeSpawnRoomEnemies() {
    const room = this.world.roomAtWorld(this.player.x, this.player.y);
    if (!room) return;
    if (room._cleared) return;
    if (room.id === this.world.bossRoomId) return;
    // Count living enemies in this room
    let cnt = 0;
    for (const e of this.enemies) {
      if (!e.alive) continue;
      const r = this.world.roomAtWorld(e.x, e.y);
      if (r && r.id === room.id) cnt++;
    }
    if (cnt < 2) {
      this._spawnEnemiesForRoom(room);
    }
  }

  _spawnBoss() {
    const bossDef = findRealm(this.realmId).boss;
    if (!bossDef) return;
    const b = new Boss(bossDef.id, this.world.bossSpawn.x, this.world.bossSpawn.y,
      this.realmId, this.difficulty, this.sprites);
    this.boss = b;
    this._lastBoss = b;
    this.fx.flash(b.x, b.y, '#ffffff', 0.4);
    this.fx.shakeScreen(5, 0.4);
    this.fx.damageText(b.x, b.y - 30, bossDef.name, '#fff0a0');
  }

  _endStageTransition(dt) {
    // After boss kill, brief pause then transition
    if (!this._endT) this._endT = 2.0;
    this._endT -= dt;
    // Brief heal
    if (!this._postHealGiven) { this.player.heal(50); this._postHealGiven = true; }
    if (this._endT <= 0) {
      // submit score & advance
      const elapsed = (performance.now() - this.runStart) / 1000;
      this._submitRunScore(elapsed);
      this.engine.setScene('worldMap', {
        realmId: this.realmId, stage: this.stage, save: this.save,
        runStats: this.runStats, lastRunTime: elapsed,
      });
    }
  }

  _onRunEnd() {
    if (this._ended) return;
    this._ended = true;
    const elapsed = (performance.now() - this.runStart) / 1000;
    this._submitRunScore(elapsed);
    this.engine.setScene('runSummary', {
      realmId: this.realmId, stage: this.stage, save: this.save,
      runStats: this.runStats, time: elapsed, victory: false,
    });
  }

  _submitRunScore(elapsed) {
    this.save.stats = this.save.stats || {};
    this.save.stats.totalKills = (this.save.stats.totalKills || 0) + this.runStats.kills;
    this.save.stats.totalRuns = (this.save.stats.totalRuns || 0) + 1;
    this.save.stats.bestScore = Math.max(this.save.stats.bestScore || 0, this.player.score);
    this.save.stats.longestRun = Math.max(this.save.stats.longestRun || 0, elapsed);
    this.save.stats.highestStage = Math.max(this.save.stats.highestStage || 0, this.stage);
    // Persist
    import('../core/save.js').then(({ saveSave }) => saveSave(this.save));
    // Async submit to supabase
    if (this.engine.supabase) {
      this.engine.supabase.submitScore({
        score: this.player.score, time: elapsed, stage: this.stage,
        realm: this.realmId, kills: this.runStats.kills, character: 'conductor',
        difficulty: this.difficulty.id, challenge: this.weeklyChallenge?.id || null,
        playerId: this.save.playerId,
      });
    }
  }

  _realmMechanic(dt) {
    // Gentle, non-lethal theme effects; the realm mechanic is also reflected in tile set & palette
    if (this.realmId === 'frozen') {
      if (Math.random() < 0.002) this.fx.flash(this.player.x, this.player.y, '#a8d4f4', 0.05);
    }
    if (this.realmId === 'infernal') {
      if (Math.random() < 0.005) this.fx.fire(this.player.x, this.player.y, '#ff5a33');
    }
  }

  _updateBgAnim(dt) {
    for (const a of this.bgAnim) {
      if (a.kind === 'snow') {
        a.y += 12 * dt;
        a.x += 4 * dt;
        if (a.y > this.player.y + 200) a.y = this.player.y - 200;
        if (a.x > this.player.x + 200) a.x = this.player.x - 200;
      } else if (a.kind === 'ember') {
        a.y -= 16 * dt;
        a.x += 6 * dt;
        if (a.y < this.player.y - 200) a.y = this.player.y + 200;
      } else if (a.kind === 'sand') {
        a.x -= 24 * dt;
        if (a.x < this.player.x - 200) a.x = this.player.x + 200;
      } else if (a.kind === 'leaf') {
        a.x += 4 * dt; a.y += 6 * dt;
        if (a.y > this.player.y + 200) a.y = this.player.y - 200;
      } else if (a.kind === 'spark') {
        a.t = (a.t || 0) + dt;
        if (a.t > 1.4) { a.t = 0; a.x = this.player.x + (Math.random() - 0.5) * 300; a.y = this.player.y + (Math.random() - 0.5) * 300; }
      } else if (a.kind === 'fog') {
        a.x += 2 * dt;
        if (a.x > this.player.x + 200) a.x = this.player.x - 200;
      }
    }
  }

  // ===== RENDER =====
  render(ctx, time) {
    const W = CFG.VIEW_W, H = CFG.VIEW_H;
    ctx.imageSmoothingEnabled = false;
    // Sky
    const realm = findRealm(this.realmId);
    ctx.fillStyle = realm.sky;
    ctx.fillRect(0, 0, W, H);
    // Apply camera transform
    ctx.save();
    this.camera.apply(ctx);
    // Draw background animators (before world)
    this._drawBgAnim(ctx);
    // World tiles
    this._drawWorld(ctx);
    // Pickups
    for (const u of this.pickups) {
      const c = u.spriteName ? this.sprites[u.spriteName()] : null;
      if (c) drawSprite(ctx, c, u.x, u.y, 1, false, 0, 1);
      else { ctx.fillStyle = u.color(); ctx.fillRect(u.x - 2, u.y - 2, 4, 4); }
    }
    // Projectiles
    for (const p of this.projectiles) {
      if (p.sprite && this.sprites[p.sprite]) {
        drawSprite(ctx, this.sprites[p.sprite], p.x, p.y, 1, false, p.angle || 0, 1);
      } else {
        ctx.fillStyle = p.color || '#fff';
        ctx.beginPath(); ctx.arc(p.x, p.y, p.size, 0, TAU); ctx.fill();
      }
    }
    // Meteors (trail)
    for (const m of this.meteors) {
      const grad = ctx.createRadialGradient(m.x, m.y, 1, m.x, m.y, 24);
      grad.addColorStop(0, '#ffe066');
      grad.addColorStop(1, '#ff5a3300');
      ctx.fillStyle = grad;
      ctx.beginPath(); ctx.arc(m.x, m.y, 20, 0, TAU); ctx.fill();
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(m.x - 2, m.y - 2, 4, 4);
    }
    // Train (side view; orient based on facing)
    this._drawTrain(ctx);
    // Enemies
    for (const e of this.enemies) {
      if (!e.alive && e.deathT <= 0) continue;
      const sp = e.spriteName(this.sprites);
      const c = this.sprites[sp];
      const scale = e.scale || 1;
      const alpha = e.alive ? 1 : Math.max(0, e.deathT / 0.6);
      if (e.alive && e.flashT > 0) ctx.globalAlpha = 0.6;
      ctx.globalAlpha *= alpha;
      if (c) drawSprite(ctx, c, e.x, e.y, scale, false, 0, alpha);
      else { ctx.fillStyle = '#a00'; ctx.fillRect(e.x - 5, e.y - 5, 10, 10); }
      ctx.globalAlpha = 1;
      // HP bar above
      if (e.alive && e.hp < e.maxHp) {
        const w = 24;
        const pct = e.hp / e.maxHp;
        ctx.fillStyle = '#000'; ctx.fillRect(e.x - w/2 - 1, e.y - e.radius - 8 - 1, w + 2, 4);
        ctx.fillStyle = e.eliteMod ? '#ffe066' : '#ff5a33';
        ctx.fillRect(e.x - w/2, e.y - e.radius - 8, w * pct, 2);
      }
    }
    // Boss
    if (this.boss) {
      const b = this.boss;
      const c = this.sprites[b.spriteName];
      if (b._introT > 0) {
        ctx.globalAlpha = 1 - b._introT / 1.4;
        const scale = 1 + (1.4 - b._introT) * 0.2;
        if (c) drawSprite(ctx, c, b.x, b.y, scale, false, 0, ctx.globalAlpha);
      } else if (b.alive) {
        if (c) drawSprite(ctx, c, b.x, b.y, 1, false, 0, 1);
        // HP bar
        const w = 80, y0 = b.y - b.radius - 14;
        ctx.fillStyle = '#000'; ctx.fillRect(b.x - w/2 - 1, y0 - 1, w + 2, 6);
        const phaseCol = ['#ff5a33','#ffe066','#985ce0','#a8d4f4','#7eff7e','#fff0a0'][b.phase - 1] || '#fff';
        ctx.fillStyle = phaseCol;
        ctx.fillRect(b.x - w/2, y0, w * (b.hp / b.maxHp), 4);
        ctx.fillStyle = '#fff'; ctx.font = '8px monospace';
        ctx.fillText(b.name, b.x - b.name.length * 3, y0 - 4);
      } else {
        // Death anim — fade out + radial burst
        const a = Math.max(0, b.deathT / 1.2);
        if (c) drawSprite(ctx, c, b.x, b.y, 1 + (1 - a) * 0.5, false, 0, a);
      }
      ctx.globalAlpha = 1;
    }
    // Player
    if (this.player.alive || this.player.animDeath > 0) {
      const ps = this.player.pickSprite();
      const a = this.player.alive ? 1 : Math.max(0, this.player.animDeath);
      if (this.player.invuln > 0 && Math.floor(this.t * 30) % 2 === 0) ctx.globalAlpha = 0.5;
      if (ps) drawSprite(ctx, ps, this.player.x, this.player.y, 1, false, 0, a);
      ctx.globalAlpha = 1;
    }
    // FX layer
    this.fx.draw(ctx);
    // Player aura from magnet
    if (this.player._magnetUntil && this.t < this.player._magnetUntil) {
      ctx.globalAlpha = 0.25;
      ctx.fillStyle = '#985ce0';
      ctx.beginPath();
      ctx.arc(this.player.x, this.player.y, this.player._magnetRadius, 0, TAU);
      ctx.fill();
      ctx.globalAlpha = 1;
    }
    ctx.restore();
    // HUD (camera-space independent)
    this._drawHUD(ctx);
    // Upgrade overlay / event overlay / boss intro overlay
    if (this.upgradeChoices) this._drawUpgradeOverlay(ctx);
    if (this.eventChoice) this._drawEventOverlay(ctx);
    // Damage screen edge
    if (this.player.hp / this.player.maxHp < 0.3) {
      const a = 0.4 * (1 - this.player.hp / this.player.maxHp);
      ctx.fillStyle = `rgba(255,40,40,${a.toFixed(3)})`;
      ctx.fillRect(0, 0, W, 6); ctx.fillRect(0, H - 6, W, 6);
      ctx.fillRect(0, 0, 6, H); ctx.fillRect(W - 6, 0, 6, H);
    }
    // Pause hint
    if (this.input.wasPressed('Escape')) this.engine.setScene('pause', { from: 'gameplay', ctx: this });
  }

  _drawWorld(ctx) {
    const ts = 16;
    const camX = this.camera.x, camY = this.camera.y;
    const halfW = CFG.VIEW_W / 2 / this.camera.zoom + 16;
    const halfH = CFG.VIEW_H / 2 / this.camera.zoom + 16;
    const tx0 = Math.max(0, Math.floor((camX - halfW) / ts));
    const ty0 = Math.max(0, Math.floor((camY - halfH) / ts));
    const tx1 = Math.min(this.world.W - 1, Math.ceil((camX + halfW) / ts));
    const ty1 = Math.min(this.world.H - 1, Math.ceil((camY + halfH) / ts));
    const realm = findRealm(this.realmId);
    // ground base layer
    ctx.fillStyle = realm.ground;
    ctx.fillRect(camX - halfW - 32, camY - halfH - 32, halfW * 2 + 64, halfH * 2 + 64);
    for (let y = ty0; y <= ty1; y++) {
      for (let x = tx0; x <= tx1; x++) {
        const t = this.world.tiles[y * this.world.W + x];
        const px = x * ts, py = y * ts;
        if (t === T.FLOOR) {
          ctx.fillStyle = realm.ground;
          ctx.fillRect(px, py, ts, ts);
        } else if (t === T.ASH) {
          ctx.fillStyle = '#23190a';
          ctx.fillRect(px, py, ts, ts);
          if ((x + y) % 4 === 0) {
            ctx.fillStyle = '#3a2a14';
            ctx.fillRect(px + 2, py + 2, 2, 2);
          }
        } else if (t === T.ICE) {
          ctx.fillStyle = '#0e1428';
          ctx.fillRect(px, py, ts, ts);
          ctx.fillStyle = '#5788c4';
          ctx.fillRect(px + 4, py + 4, 1, 1);
        } else if (t === T.SAND) {
          ctx.fillStyle = '#23190a';
          ctx.fillRect(px, py, ts, ts);
          ctx.fillStyle = '#7a6530';
          ctx.fillRect(px + 6, py + 6, 2, 2);
        } else if (t === T.VOID) {
          ctx.fillStyle = '#0a0420';
          ctx.fillRect(px, py, ts, ts);
          ctx.fillStyle = '#482278';
          if ((x + y * 3) % 5 === 0) ctx.fillRect(px + 4, py + 4, 1, 1);
        } else if (t === T.PLATFORM) {
          ctx.fillStyle = '#1c1c24';
          ctx.fillRect(px, py, ts, ts);
          ctx.fillStyle = '#3d3d4d';
          ctx.fillRect(px, py + 12, 16, 2);
        } else if (t === T.WALL) {
          ctx.fillStyle = '#2a1a3a';
          ctx.fillRect(px, py, ts, ts);
          ctx.fillStyle = '#1a1026';
          ctx.fillRect(px + 2, py + 2, 12, 12);
        } else if (t === T.TREE) {
          ctx.fillStyle = realm.ground;
          ctx.fillRect(px, py, ts, ts);
          ctx.fillStyle = '#1f3a14';
          ctx.fillRect(px + 6, py + 2, 4, 14);
          ctx.fillStyle = '#2f5a1c';
          ctx.fillRect(px + 2, py + 4, 12, 8);
          ctx.fillStyle = '#437a26';
          ctx.fillRect(px + 4, py + 4, 8, 4);
        } else if (t === T.ROCK) {
          ctx.fillStyle = realm.ground;
          ctx.fillRect(px, py, ts, ts);
          ctx.fillStyle = '#525264';
          ctx.fillRect(px + 2, py + 8, 12, 6);
          ctx.fillStyle = '#6b6b80';
          ctx.fillRect(px + 4, py + 6, 8, 4);
        } else if (t === T.LAVA) {
          ctx.fillStyle = '#3a1208';
          ctx.fillRect(px, py, ts, ts);
          ctx.fillStyle = '#a01f12';
          ctx.fillRect(px + 2, py + 6, 12, 8);
          ctx.fillStyle = '#ff4d26';
          ctx.fillRect(px + 4, py + 8, 8, 4);
          ctx.fillStyle = '#ffd260';
          if ((x + y) % 3 === 0) ctx.fillRect(px + 6, py + 8, 4, 2);
        }
      }
    }
  }

  _drawBgAnim(ctx) {
    for (const a of this.bgAnim) {
      if (a.kind === 'snow') {
        ctx.fillStyle = '#d4ecff';
        ctx.fillRect(a.x, a.y, 1, 1);
      } else if (a.kind === 'ember') {
        const grad = ctx.createRadialGradient(a.x, a.y, 0, a.x, a.y, 4);
        grad.addColorStop(0, '#ffe066');
        grad.addColorStop(1, '#ff5a3300');
        ctx.fillStyle = grad;
        ctx.beginPath(); ctx.arc(a.x, a.y, 3, 0, TAU); ctx.fill();
      } else if (a.kind === 'sand') {
        ctx.fillStyle = '#d4a04a44';
        ctx.fillRect(a.x, a.y, 8, 1);
      } else if (a.kind === 'leaf') {
        ctx.fillStyle = '#437a26';
        ctx.fillRect(a.x, a.y, 1, 1);
      } else if (a.kind === 'spark') {
        ctx.fillStyle = '#985ce0';
        ctx.fillRect(a.x, a.y, 1, 1);
      } else if (a.kind === 'fog') {
        ctx.fillStyle = '#3a3a4a22';
        ctx.fillRect(a.x, a.y, 32, 6);
      }
    }
  }

  _drawTrain(ctx) {
    const t = this.train;
    const s = t.engineSprite, c = t.carSprite;
    // Carriage behind
    drawSprite(ctx, c, t.x - 56, t.y, 1, false, 0, 1);
    drawSprite(ctx, s, t.x + 8, t.y, 1, false, 0, 1);
    // HP bar
    const w = 60, y0 = t.y - 32;
    ctx.fillStyle = '#000'; ctx.fillRect(t.x - w/2 - 1, y0 - 1, w + 2, 4);
    const hpPct = t.hp / t.maxHp;
    ctx.fillStyle = hpPct > 0.5 ? '#74c04a' : hpPct > 0.25 ? '#ffe066' : '#ff5a33';
    ctx.fillRect(t.x - w/2, y0, w * hpPct, 2);
    // Energy bar
    ctx.fillStyle = '#000'; ctx.fillRect(t.x - w/2 - 1, y0 + 5, w + 2, 3);
    ctx.fillStyle = '#7ec8ff';
    ctx.fillRect(t.x - w/2, y0 + 6, w * (t.energy / t.maxEnergy), 1);
    // Wheels animation: offset
    // Steam
    if (Math.random() < 0.2) this.fx.smoke(t.x + 8, t.y - 30, '#aaaaaa');
    if (Math.random() < 0.1) this.fx.smoke(t.x + 30, t.y - 30, '#aaa');
  }

  _drawHUD(ctx) {
    const W = CFG.VIEW_W, H = CFG.VIEW_H;
    const p = this.player;
    // Top-left: HP bar + level
    ctx.fillStyle = 'rgba(0,0,0,0.55)';
    ctx.fillRect(6, 6, 180, 38);
    ctx.fillStyle = '#ffffff'; ctx.font = 'bold 8px monospace';
    ctx.fillText('LV ' + p.level, 10, 14);
    // HP
    ctx.fillStyle = '#220a0a'; ctx.fillRect(10, 18, 170, 8);
    ctx.fillStyle = '#a01f12'; ctx.fillRect(10, 18, 170 * Math.max(0, p.hp / p.maxHp), 8);
    ctx.fillStyle = '#fff'; ctx.fillRect(10, 18, 170 * Math.max(0, p.hp / p.maxHp), 4);
    ctx.font = '7px monospace';
    ctx.fillText(Math.ceil(p.hp) + ' / ' + p.maxHp, 90, 24);
    // XP
    ctx.fillStyle = '#0a1220'; ctx.fillRect(10, 28, 170, 4);
    ctx.fillStyle = '#a8d4f4';
    ctx.fillRect(10, 28, 170 * Math.min(1, p.xp / p.xpNeeded()), 4);
    // Armour indicator
    if (p.armour > 0) {
      ctx.fillStyle = '#cfcfe0'; ctx.font = '7px monospace';
      ctx.fillText('AR ' + p.armour, 150, 14);
    }
    // Top-right: stage + time
    ctx.fillStyle = 'rgba(0,0,0,0.55)';
    ctx.fillRect(W - 140, 6, 134, 38);
    const realm = findRealm(this.realmId);
    ctx.fillStyle = '#fff'; ctx.font = 'bold 8px monospace';
    ctx.fillText(realm.name.toUpperCase(), W - 136, 14);
    ctx.font = '7px monospace';
    ctx.fillText('STAGE ' + this.stage, W - 136, 24);
    const elapsed = (performance.now() - this.runStart) / 1000;
    ctx.fillText('TIME ' + fmtTime(elapsed), W - 136, 34);
    ctx.fillText('KILLS ' + this.runStats.kills, W - 80, 34);
    // Bottom-center: abilities + weapons
    ctx.fillStyle = 'rgba(0,0,0,0.55)';
    ctx.fillRect(0, H - 28, W, 28);
    // Abilities (left)
    let ax = 10;
    for (const a of p.abilities) {
      const s = p.abilityStates[a.id];
      const w = 24;
      ctx.fillStyle = a.color;
      ctx.globalAlpha = s.cd > 0 ? 0.4 : 1;
      ctx.fillRect(ax, H - 22, w, 18);
      ctx.globalAlpha = 1;
      ctx.strokeStyle = '#000'; ctx.lineWidth = 1;
      ctx.strokeRect(ax + 0.5, H - 22.5, w, 18);
      // CD overlay
      if (s.cd > 0) {
        ctx.fillStyle = 'rgba(0,0,0,0.5)';
        ctx.fillRect(ax, H - 22 + 18 * (1 - s.cd / a.cd), w, 18 * (s.cd / a.cd));
      }
      ctx.fillStyle = '#fff'; ctx.font = '6px monospace';
      ctx.fillText(a.id.toUpperCase().slice(0, 4), ax + 2, H - 13);
      ctx.fillText(s.cd > 0 ? s.cd.toFixed(1) : 'READY', ax + 2, H - 8);
      ax += w + 6;
    }
    // Weapons (center)
    let wx = W / 2 - (p.weapons.length * 30) / 2;
    for (const w of p.weapons) {
      const s = p.weaponStates[w.id];
      ctx.fillStyle = w.color;
      ctx.globalAlpha = s.cd > 0 ? 0.4 : 1;
      ctx.fillRect(wx, H - 22, 26, 18);
      ctx.globalAlpha = 1;
      ctx.strokeStyle = '#000'; ctx.strokeRect(wx + 0.5, H - 22.5, 26, 18);
      if (s.cd > 0) {
        ctx.fillStyle = 'rgba(0,0,0,0.5)';
        ctx.fillRect(wx, H - 22 + 18 * (1 - s.cd / w.cd), 26, 18 * (s.cd / w.cd));
      }
      ctx.fillStyle = '#fff'; ctx.font = '6px monospace';
      ctx.fillText(w.id.slice(0, 4).toUpperCase(), wx + 2, H - 13);
      ctx.fillText('L' + s.level, wx + 2, H - 8);
      wx += 30;
    }
    // Boss HP bottom
    if (this.boss && this.boss.alive) {
      ctx.fillStyle = 'rgba(0,0,0,0.6)';
      ctx.fillRect(0, H - 50, W, 8);
      ctx.fillStyle = '#ff5a33';
      ctx.fillRect(0, H - 50, W * (this.boss.hp / this.boss.maxHp), 8);
      ctx.fillStyle = '#fff'; ctx.font = '7px monospace';
      ctx.fillText(this.boss.name + '  PHASE ' + this.boss.phase + '/' + this.boss.phases,
        4, H - 53);
    }
    // Train indicator (bottom-right)
    if (this.train) {
      ctx.fillStyle = 'rgba(0,0,0,0.55)';
      ctx.fillRect(W - 90, H - 50, 84, 20);
      ctx.fillStyle = '#fff'; ctx.font = '7px monospace';
      ctx.fillText('TRAIN', W - 86, H - 40);
      ctx.fillStyle = '#220a0a'; ctx.fillRect(W - 86, H - 36, 80, 6);
      ctx.fillStyle = '#74c04a';
      ctx.fillRect(W - 86, H - 36, 80 * Math.max(0, this.train.hp / this.train.maxHp), 6);
    }
    // Score
    ctx.fillStyle = '#fff'; ctx.font = '7px monospace';
    ctx.fillText('SCORE ' + fmtNum(p.score), 10, H - 32);
    ctx.fillText('SHARDS ' + this.gameStats.shards, 100, H - 32);
  }

  _drawUpgradeOverlay(ctx) {
    const W = CFG.VIEW_W, H = CFG.VIEW_H;
    ctx.fillStyle = 'rgba(0,0,0,0.85)';
    ctx.fillRect(0, 0, W, H);
    ctx.fillStyle = '#fff'; ctx.font = 'bold 10px monospace';
    ctx.fillText('CHOOSE AN UPGRADE', W / 2 - 70, 40);
    const cw = 100, ch = 100;
    const x0 = (W - 4 * cw - 30) / 2;
    const y0 = 60;
    for (let i = 0; i < 4; i++) {
      const c = this.upgradeChoices[i];
      const x = x0 + i * (cw + 10);
      ctx.fillStyle = '#1a1026';
      ctx.fillRect(x, y0, cw, ch);
      ctx.strokeStyle = c?.rarity === 'legendary' ? '#ffe066' :
        c?.rarity === 'epic' ? '#985ce0' : c?.rarity === 'rare' ? '#7ec8ff' :
        c?.rarity === 'uncommon' ? '#74c04a' : '#8a8aa0';
      ctx.lineWidth = 2; ctx.strokeRect(x + 1, y0 + 1, cw - 2, ch - 2);
      if (!c) continue;
      ctx.fillStyle = c.rarity === 'legendary' ? '#ffe066' : c.rarity === 'epic' ? '#985ce0' :
        c.rarity === 'rare' ? '#7ec8ff' : '#fff';
      ctx.font = 'bold 12px monospace';
      ctx.fillText((i + 1) + '', x + cw / 2 - 4, y0 + 16);
      ctx.font = 'bold 8px monospace';
      ctx.fillText(c.name.slice(0, 14), x + 4, y0 + 30);
      ctx.font = '7px monospace';
      ctx.fillStyle = '#cfd4e0';
      const lines = wrap(c.desc, 13);
      for (let j = 0; j < Math.min(5, lines.length); j++) ctx.fillText(lines[j], x + 4, y0 + 46 + j * 10);
      ctx.fillStyle = c.rarity === 'legendary' ? '#ffe066' : '#cfd4e0';
      ctx.font = '7px monospace';
      ctx.fillText(c.rarity.toUpperCase(), x + 4, y0 + ch - 6);
    }
  }

  _drawEventOverlay(ctx) {
    const W = CFG.VIEW_W, H = CFG.VIEW_H;
    ctx.fillStyle = 'rgba(0,0,0,0.8)';
    ctx.fillRect(0, 0, W, H);
    const ev = this.eventChoice;
    ctx.fillStyle = '#fff'; ctx.font = 'bold 12px monospace';
    ctx.fillText(ev.title, W / 2 - ev.title.length * 4, 30);
    ctx.font = '8px monospace';
    ctx.fillText(ev.desc, W / 2 - ev.desc.length * 3, 50);
    let yy = 80;
    for (let i = 0; i < ev.options.length; i++) {
      ctx.fillStyle = '#1a1026'; ctx.fillRect(60, yy, W - 120, 30);
      ctx.strokeStyle = '#985ce0'; ctx.lineWidth = 1; ctx.strokeRect(60.5, yy + 0.5, W - 121, 30);
      ctx.fillStyle = '#fff'; ctx.font = '8px monospace';
      ctx.fillText((i + 1) + '. ' + ev.options[i].text, 70, yy + 18);
      yy += 36;
    }
  }
}

function wrap(s, n) {
  const words = s.split(' ');
  const lines = [];
  let cur = '';
  for (const w of words) {
    if ((cur + ' ' + w).length > n) { lines.push(cur); cur = w; }
    else cur = (cur + ' ' + w).trim();
  }
  if (cur) lines.push(cur);
  return lines;
}

// Tiny hash to avoid importing another module
function hashStr(s) {
  let h = 5381;
  for (let i = 0; i < s.length; i++) h = ((h << 5) + h) + s.charCodeAt(i);
  return h >>> 0;
}

// ============================================================
// Hooks for level-up choices — used by GameplayScene
// ============================================================
GameplayScene.prototype._chooseUpgrade = function () {
  // Build 4 candidate upgrades weighted by current build
  const pool = UPGRADES.filter(u => !u.cond || u.cond(this.player));
  // Rarity weights
  const weights = { common: 50, uncommon: 30, rare: 18, epic: 8, legendary: 3, mythic: 1, transcendent: 0.5 };
  const picks = [];
  for (let i = 0; i < 4; i++) {
    let total = 0;
    for (const p of pool) total += weights[p.rarity] || 1;
    let r = Math.random() * total;
    let chosen = pool[0];
    for (const p of pool) { r -= weights[p.rarity] || 1; if (r <= 0) { chosen = p; break; } }
    picks.push(chosen);
  }
  this.upgradeChoices = picks;
};

GameplayScene.prototype._buildParams = function () {
  return {
    save: this.engine.save, realmId: this.realmId, stage: this.stage,
    difficulty: this.difficulty.id, runSeed: this.runSeed,
    weeklyChallenge: this.weeklyChallenge, dailySeed: this.dailySeed,
  };
};
