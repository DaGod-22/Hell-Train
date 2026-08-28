// ============================================================
// HELL TRAIN — GAMEPLAY
// The run itself: director-driven waves, the Conductor, the Train,
// bosses, loot, the Ascension Grid and the Apocalypse Protocol.
// ============================================================
import { CFG } from '../core/config.js';
import { rand, randInt, clamp, dist, TAU, fmtNum, fmtTime } from '../core/utils.js';
import { World, T } from '../core/world.js';
import { FXSystem } from './fx.js';
import { Renderer, GameCamera, TimeFlow } from '../core/render.js';
import { Player } from '../entities/player.js';
import { makeEnemy } from '../entities/enemy.js';
import { Projectile, Meteor, Flame, Bomb, Pool, BlackHole } from '../entities/projectile.js';
import { Pickup } from '../entities/pickup.js';
import { Boss } from '../entities/boss.js';
import { Train } from '../entities/train.js';
import { REALMS, findRealm, findDifficulty } from '../data/realms.js';
import { ASCENSIONS, APOCALYPSE_PROTOCOL, APOCALYPSE_CARDS, RARITY_COLORS, ROMAN,
  rollCards, apocalypseReady, findAscension } from '../data/upgrades.js';
import { applyPermaToPlayer, applyPermaToTrain } from '../data/shop.js';
import { checkSynergies } from '../data/upgrades_bridge.js';
import { WEAPONS, findWeapon } from '../data/weapons.js';
import { addCoins, saveSave } from '../core/save.js';
import { drawCard, drawPanel, drawBar, drawIcon, text, textC } from '../ui/widgets.js';

const AMBIENT = {
  purgatory: '#8e8ebc', infernal: '#b06a52', forgotten: '#7e7ea4', forest: '#6a9070',
  frozen: '#90b0dc', desert: '#c8ac82', void: '#7a64a8', terminus: '#a89684', phantom: '#7a64a8',
};

// Lit floor colours — brighter than the raw realm colour so the world
// still reads once the lighting multiply pass lands on it.
const FLOOR = {
  purgatory: ['#332748', '#2a1f3c', '#241a33'],
  infernal:  ['#4a2016', '#3a1710', '#2e110c'],
  forgotten: ['#2a2a40', '#222234', '#1b1b2a'],
  forest:    ['#1e3822', '#182e1c', '#132516'],
  frozen:    ['#26405e', '#1e3450', '#182a42'],
  desert:    ['#5c4526', '#4c391f', '#3e2e19'],
  void:      ['#1a1038', '#140c2c', '#0e0822'],
  terminus:  ['#2a2a2e', '#222226', '#1a1a1e'],
  phantom:   ['#241440', '#1c1034', '#150c28'],
};
const floorOf = (id, n) => (FLOOR[id] || FLOOR.purgatory)[n % 3];
const GRADE = {
  purgatory: '#6a5ce0', infernal: '#ff5a20', forgotten: '#8a9ad0', forest: '#4ad06a',
  frozen: '#7ac0ff', desert: '#ffc060', void: '#a05cff', terminus: '#ffd060', phantom: '#c07aff',
};

export class GameplayScene {
  constructor(engine) {
    this.engine = engine;
    this.canvas = engine.canvas;
    this.art = engine.sprites;
    this.renderer = new Renderer(CFG.VIEW_W, CFG.VIEW_H);
    this.camera = new GameCamera(CFG.VIEW_W, CFG.VIEW_H, 1.55);
    this.time = new TimeFlow();
    this.fx = new FXSystem(3000, this.art);
    this.input = engine.input;
  }

  // ================================================================
  // RUN SETUP
  // ================================================================
  enter(params = {}) {
    const engine = this.engine;
    this.save = params.save || engine.save;
    this.realmId = params.realmId || 'purgatory';
    this.stage = params.stage || 1;
    this.difficulty = findDifficulty(params.difficulty || engine._difficulty || 'normal');
    this.runSeed = params.runSeed || ((Math.random() * 4294967295) >>> 0);
    this.weeklyChallenge = params.weeklyChallenge || null;
    this.dailySeed = params.dailySeed || null;

    this.fx = new FXSystem(3000, this.art);
    this.camera = new GameCamera(CFG.VIEW_W, CFG.VIEW_H, 1.55);
    this.time = new TimeFlow();
    this.renderer.settings.bloom = this.save.settings?.bloom ?? 1;
    this.renderer.settings.lighting = this.save.settings?.lighting ?? 1;
    this.renderer.settings.scanlines = this.save.settings?.scanlines ?? 0.35;

    this.world = new World(this.runSeed ^ hashStr(this.realmId + this.stage), this.realmId, this.difficulty);
    this.player = new Player(this.world.playerSpawn.x, this.world.playerSpawn.y, this.art, this.save);
    applyPermaToPlayer(this.player, this.save);
    this.player.addWeapon('fireball');
    this.player.onLevelUp = () => this._queueLevelUp();

    this.train = new Train(this.player.x - 90, this.player.y + 26, this.art, this.difficulty, this.save);
    applyPermaToTrain(this.train, this.save);
    for (let i = 0; i < (this.train.extraSlots || 0); i++) this.train.mountRandomWeapon();

    this.enemies = []; this.projectiles = []; this.pickups = [];
    this.meteors = []; this.flames = []; this.bombs = []; this.pools = []; this.holes = [];
    this.boss = null; this.bossSpawned = false; this.bossDefeated = false;

    this.owned = {};                 // ascension id -> level
    this.pendingLevelUps = 0;
    this.cards = null;
    this.cardIndex = 0;
    this.rerolls = (this.player.freeRerolls || 0);
    this.banishes = 1;
    this.paused = false;
    this.runTime = 0;
    this.runCoins = 0;
    this.gameStats = { shards: 0, kills: 0, elites: 0, bosses: 0 };
    this.runStats = { kills: 0, damageDealt: 0, damageTaken: 0, level: 1, coins: 0, bestCombo: 0 };
    this.magnetAll = false;
    this._magnetT = 0;
    this.director = { t: 0, wave: 0, nextWave: 3, budget: 0, eliteT: 45, chestT: 38 };
    this._ended = false;
    this._flash = { a: 0, color: '#ffffff' };
    this.apocalypseActive = false;
    this._synergiesFired = {};

    // veteran perma: start with extra levels
    for (let i = 0; i < (this.player.startLevelBonus || 0); i++) {
      this.player.level += 1; this.pendingLevelUps += 1;
    }

    this.camera.x = this.player.x; this.camera.y = this.player.y;
    this._spawnAmbient();
    if (this.pendingLevelUps > 0) this._openCards();
    this.fx.banner(this.player.x, this.player.y - 40, findRealm(this.realmId).name.toUpperCase(), '#ffe066');
  }
  exit() {}

  _spawnAmbient() {
    this.ambientBits = [];
    const kinds = { frozen: 'snow', infernal: 'ember', desert: 'sand', forest: 'leaf',
      void: 'spark', phantom: 'spark', terminus: 'spark' };
    const kind = kinds[this.realmId] || 'fog';
    for (let i = 0; i < 70; i++) {
      this.ambientBits.push({ kind, x: rand(-300, 300), y: rand(-200, 200), s: rand(0.4, 1.4) });
    }
  }

  // ================================================================
  // CONTEXT API used by entities
  // ================================================================
  spawnProjectile(o) { this.projectiles.push(new Projectile(o)); }
  spawnBomb(x, y, o) { this.bombs.push(new Bomb(x, y, o)); }
  spawnPool(x, y, o) { this.pools.push(new Pool(x, y, o)); }
  spawnBlackhole(x, y, o) { this.holes.push(new BlackHole(x, y, o)); }
  spawnMeteor(x, y, dmg, radius) { this.meteors.push(new Meteor(x, y, { x, y }, dmg, radius)); }
  spawnFlame(x, y, ang, range, dmg) { this.flames.push(new Flame(x, y, ang, range, dmg)); }
  spawnEnemy(id, x, y) {
    const e = makeEnemy(id, x, y, this.realmId, this.difficulty);
    if (!e) return null;
    e._id = ++ID; this.enemies.push(e);
    return e;
  }
  enemiesInRange(x, y, r) {
    const out = []; const r2 = r * r;
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
    if (this.boss?.alive && !best) {
      if (dist(x, y, this.boss.x, this.boss.y) < maxR) return this.boss;
    }
    return best;
  }
  addRunCoins(n) { this.runCoins += n; this.runStats.coins += n; }
  magnetPulse() {
    this.magnetAll = true; this._magnetT = 1.2;
    this.fx.ring(this.player.x, this.player.y, 200, '#f080cc', 0.5, 3);
  }
  onPlayerHit(dealt, color) {
    this.fx.damageText(this.player.x, this.player.y - 20, '-' + Math.round(dealt), '#ff5a5a', { size: 8 });
    this.fx.screenTint('#ff2020', 0.22);
    this.fx.shakeScreen(5, 0.2);
    this.camera.shake(0.35);
    this.time.hit(0.05);
    this.runStats.damageTaken += dealt;
    this.fx.blood(this.player.x, this.player.y, '#a01f12', 6);
  }
  onRevive(p) {
    this.fx.explosion(p.x, p.y, 'explHoly', 3, { lightColor: '#ffe066' });
    this.fx.banner(p.x, p.y - 40, 'PHOENIX CLAUSE', '#ffb020');
    for (const e of this.enemiesInRange(p.x, p.y, 140)) this.dealDamage(e, 200, { family: 'holy' });
    this.camera.shake(0.8);
  }
  onApocalypse() {
    this.apocalypseActive = true;
    this.fx.banner(this.player.x, this.player.y - 44, 'APOCALYPSE PROTOCOL', '#ff2a2a');
    this.fx.screenTint('#ff2020', 0.85);
    this.camera.shake(1);
    this.time.slowmo(1.2, 0.25);
    this.save.stats.apocalypses = (this.save.stats.apocalypses || 0) + 1;
  }
  extinctionEvent(dmg) {
    this.fx.screenTint('#ffffff', 0.7);
    this.camera.shake(1);
    this.time.slowmo(0.5, 0.3);
    for (const e of this.enemies) {
      if (!e.alive) continue;
      this.fx.explosion(e.x, e.y, 'explVoid', 1, { lightColor: '#ff2a2a' });
      this.dealDamage(e, dmg, { family: 'apocalypse' });
    }
    if (this.boss?.alive) this.dealDamage(this.boss, dmg, { family: 'apocalypse', boss: true });
  }
  openChest() {
    // a free upgrade card
    this.pendingLevelUps += 1;
    this.fx.banner(this.player.x, this.player.y - 30, 'RELIC CHEST', '#ffe066');
    this._openCards();
  }
  spawnExplosion(x, y, radius, dmg, family) {
    radius *= (this.player?.aoeMult || 1);
    const kind = family === 'ice' ? 'explIce' : family === 'void' ? 'explVoid' :
      family === 'holy' ? 'explHoly' : family === 'toxic' ? 'explToxic' : 'explFire';
    this.fx.explosion(x, y, kind, Math.max(0.5, radius / 26), {
      lightColor: family === 'ice' ? '#a8d4f4' : family === 'void' ? '#c07aff' : '#ffb060',
    });
    this.fx.shakeScreen(3, 0.12);
    this.camera.shake(0.18);
    this.fx.decal(x, y, radius * 0.35, '#150a12', 8);
    for (const e of this.enemiesInRange(x, y, radius)) {
      this.dealDamage(e, dmg, { family, x, y, knockback: 60 });
    }
    if (this.boss?.alive && dist(x, y, this.boss.x, this.boss.y) < radius + this.boss.radius) {
      this.dealDamage(this.boss, dmg, { family, boss: true });
    }
  }

  // ---------------- the one true damage function ----------------
  dealDamage(target, amount, opts = {}) {
    if (!target || !target.alive) return 0;
    const p = this.player;
    const { dmg, crit } = p.rollDamage(amount, target);
    let final = dmg;
    // status riders from the build
    const rider = {
      family: opts.family, x: opts.x ?? p.x, y: opts.y ?? p.y,
      knockback: opts.knockback ?? (p.knockback || 0), angle: opts.angle,
      burn: (opts.burn || 0) + (p.burnDmg || 0), burnDur: p.burnDur || 3,
      chill: p.chill || 0, slow: opts.slow, slowDur: opts.slowDur,
    };
    if (p.absoluteZero && (rider.chill > 0 || opts.family === 'ice') && Math.random() < 0.25) rider.freeze = 1.4;
    if (target.freezeT > 0 && p.absoluteZero) final *= 3;
    if (p.headsman && !opts.boss && target.maxHp && target.hp / target.maxHp < p.headsman) {
      final = target.hp + 1;
      this.fx.damageText(target.x, target.y - 16, 'EXECUTE', '#ff4d6a', { size: 8, crit: true });
    }
    const dealt = target.takeDamage(final, rider) ?? final;
    this.runStats.damageDealt += dealt;

    // feedback
    const big = final > p.maxHp * 0.4 || crit;
    if (!opts.small || crit) {
      this.fx.damageText(target.x + rand(-4, 4), target.y - (target.radius || 8) - 4,
        Math.round(final) + (crit ? '!' : ''), crit ? '#ffe066' : '#ffffff',
        { size: crit ? 10 : 8, crit });
    }
    this.fx.sparks(target.x, target.y, crit ? '#ffe066' : '#ffd0a0', crit ? 6 : 3,
      opts.angle ?? rand(0, TAU), 0.8, crit ? 160 : 90);
    if (big) { this.time.hit(crit ? 0.05 : 0.03); this.camera.shake(crit ? 0.2 : 0.1); }
    if (opts.family === 'fire') this.fx.fire(target.x, target.y, '#ff7a33');
    if (p.lifesteal > 0 && !opts.byTrain) p.heal(dealt * p.lifesteal);
    if (opts.lifesteal) p.heal(dealt * opts.lifesteal);

    // chains
    if (p.chain > 0 && !opts.isChain && Math.random() < 0.5) {
      const near = this.enemiesInRange(target.x, target.y, p.chainMaster ? 180 : 90)
        .filter(e => e !== target).slice(0, p.chain);
      for (const e of near) {
        this.fx.lightning(target.x, target.y, e.x, e.y, '#8ef0ff', 4, 0.12);
        this.dealDamage(e, amount * 0.4, { family: 'lightning', isChain: true, small: true });
      }
    }

    if (!target.alive) this._onKill(target, opts);
    return dealt;
  }

  onEnemyDeath(e) { this._onKill(e); }

  _onKill(e, opts = {}) {
    const p = this.player;
    if (e === this.boss) { this._onBossKilled(e); return; }
    p.onKill(this, e);
    this.gameStats.kills++; this.runStats.kills++;
    this.runStats.bestCombo = Math.max(this.runStats.bestCombo, p.combo);

    // visuals
    this.fx.explosion(e.x, e.y, 'impact', (e.radius || 7) / 9, { light: 0.6, speed: 26 });
    this.fx.blood(e.x, e.y, '#7a1010', e.giant ? 14 : 7);
    this.fx.decal(e.x, e.y, (e.radius || 7) * 0.8, '#2a0808', 10);
    this.fx.shard(e.x, e.y, '#ffd0a0', 4);

    // loot
    const eliteMul = e.eliteMod ? 4 : 1;
    const coinBase = Math.max(1, Math.round((e.xp || 4) * 0.12 * eliteMul * (1 + (this.train.lootBonus || 0)) * (this.player.coinMult || 1)));
    const coinDrops = Math.min(4, 1 + Math.floor(coinBase / 6));
    for (let i = 0; i < coinDrops; i++) {
      this.pickups.push(new Pickup('coin', e.x + rand(-5, 5), e.y + rand(-5, 5), Math.ceil(coinBase / coinDrops)));
    }
    const xpType = e.eliteMod || e.giant ? 'xpBig' : 'xp';
    this.pickups.push(new Pickup(xpType, e.x, e.y, (e.xp || 4) * (this.difficulty.xpMult || 1)));
    if (e.eliteMod) {
      this.gameStats.elites++;
      for (let i = 0; i < 3; i++) this.pickups.push(new Pickup('shard', e.x + rand(-6, 6), e.y + rand(-6, 6), 1));
      if (Math.random() < 0.7) this.pickups.push(new Pickup('heart', e.x, e.y, 30));
      if (Math.random() < 0.35) this.pickups.push(new Pickup('chest', e.x, e.y, 1));
    } else {
      if (Math.random() < 0.035) this.pickups.push(new Pickup('heart', e.x, e.y, 18));
      if (Math.random() < 0.02) this.pickups.push(new Pickup('magnet', e.x, e.y, 1));
    }

    // on-kill build effects
    if (p.corpseBoom) {
      this.spawnExplosion(e.x, e.y, p.novaEngine ? 70 : 42, p.corpseBoom, 'explosive');
    }
    if (p.solarCore && (e.burnT > 0)) {
      this.spawnExplosion(e.x, e.y, 56, p.burnDmg * 4, 'fire');
    }
    if (e.splitInto) {
      for (let i = 0; i < (e.splits || 2); i++) {
        const a = rand(0, TAU);
        this.spawnEnemy(e.splitInto, e.x + Math.cos(a) * 12, e.y + Math.sin(a) * 12);
      }
    }
  }

  _onBossKilled(b) {
    if (this.bossDefeated) return;
    this.bossDefeated = true;
    this.gameStats.bosses++;
    this.time.slowmo(1.6, 0.25);
    this.camera.shake(1);
    this.fx.explosion(b.x, b.y, 'explFire', 4, { lightColor: '#ffe066' });
    this.fx.banner(b.x, b.y - 40, b.name + ' DESTROYED', '#ffe066');
    for (let i = 0; i < 24; i++) this.pickups.push(new Pickup('coin', b.x + rand(-30, 30), b.y + rand(-30, 30), 10));
    for (let i = 0; i < 16; i++) this.pickups.push(new Pickup('xpBig', b.x + rand(-30, 30), b.y + rand(-30, 30), 14));
    for (let i = 0; i < 3; i++) this.pickups.push(new Pickup('heart', b.x + rand(-16, 16), b.y + rand(-16, 16), 45));
    this.pickups.push(new Pickup('chest', b.x, b.y, 1));
    this.save.bossCores = this.save.bossCores || {};
    this.save.bossCores[b.id] = (this.save.bossCores[b.id] || 0) + 1;
    const idx = REALMS.findIndex(r => r.id === this.realmId);
    if (idx >= 0 && idx < REALMS.length - 1) {
      const next = REALMS[idx + 1].id;
      this.save.unlockedRealms = Array.from(new Set([...(this.save.unlockedRealms || ['purgatory']), next]));
    }
  }

  // ================================================================
  // LEVEL-UP CARDS
  // ================================================================
  _queueLevelUp() {
    this.pendingLevelUps += 1;
    // 'Annihilation' tiered card: every level-up wipes the screen
    if (this.player.screenWipe > 0) {
      this.extinctionEvent(180 * this.player.screenWipe);
      this.fx.banner(this.player.x, this.player.y - 52, 'ANNIHILATION', '#ff2a2a');
    }
    this.fx.banner(this.player.x, this.player.y - 34, 'LEVEL ' + this.player.level, '#8ef0ff');
    this.fx.ring(this.player.x, this.player.y, 40, '#8ef0ff', 0.5, 3);
    if (!this.cards) this._openCards();
  }
  _openCards() {
    if (this.pendingLevelUps <= 0) return;
    const p = this.player;
    // Apocalypse Protocol takes priority once you have gone deep enough
    if (apocalypseReady(this.owned, p.level)) {
      this.cards = [{ card: APOCALYPSE_PROTOCOL, nextLevel: 1 }];
      this.cardIndex = 0;
      this.cardT = 0;
      return;
    }
    let n = 3;
    if ((p.luck || 0) > 0.15) n = 4;
    this.cards = rollCards(this.owned, p, this, n);
    if (!this.cards.length) {
      // nothing left to offer — hand out a weapon or heal
      this.pendingLevelUps--;
      this._grantRandomWeapon();
      return;
    }
    this.cardIndex = 0;
    this.cardT = 0;
  }
  _grantRandomWeapon() {
    const p = this.player;
    const pool = WEAPONS.filter(w => !p.hasWeapon(w.id));
    if (pool.length && p.weapons.length < 6) {
      const w = pool[randInt(0, pool.length - 1)];
      p.addWeapon(w.id);
      this.fx.banner(p.x, p.y - 30, 'NEW WEAPON: ' + w.name.toUpperCase(), w.color);
    } else {
      p.heal(p.maxHp * 0.25);
    }
  }
  _pickCard(i) {
    const pick = this.cards?.[i];
    if (!pick) return;
    const c = pick.card;
    const lvl = (this.owned[c.id] || 0) + 1;
    this.owned[c.id] = lvl;
    c.apply(this.player, lvl, this);
    this.fx.banner(this.player.x, this.player.y - 30, c.name.toUpperCase() + ' ' + (c.max > 1 ? ROMAN[lvl] : ''),
      RARITY_COLORS[c.rarity] || '#ffffff');
    this.fx.explosion(this.player.x, this.player.y, 'explHoly', 1.4, { lightColor: RARITY_COLORS[c.rarity] });
    // tiered-card synergies (data/upgradecards.js SYNERGY_BONUSES)
    this._synergiesFired = this._synergiesFired || {};
    checkSynergies(this.owned, this.player, this, this._synergiesFired);
    this.cards = null;
    this.pendingLevelUps -= 1;
    // every 4 levels also offer a new weapon if we have room
    if (this.player.level % 4 === 0 && this.player.weapons.length < 6) this._grantRandomWeapon();
    if (this.pendingLevelUps > 0) this._openCards();
  }
  _reroll() {
    if (this.rerolls <= 0 || !this.cards) return;
    if (this.cards[0]?.card?.rarity === 'apocalypse') return;
    this.rerolls--;
    this.cards = rollCards(this.owned, this.player, this, this.cards.length);
  }
  _banish() {
    if (this.banishes <= 0 || !this.cards) return;
    const c = this.cards[this.cardIndex];
    if (!c || c.card.rarity === 'apocalypse') return;
    this.banishes--;
    this.owned[c.card.id] = c.card.max || 5;   // pretend maxed => never offered again
    this.cards = rollCards(this.owned, this.player, this, this.cards.length);
    delete this.owned[c.card.id];
  }

  // ================================================================
  // DIRECTOR — continuous escalating waves
  // ================================================================
  _director(dt) {
    const d = this.director;
    d.t += dt;
    const stageMul = 1 + (this.stage - 1) * 0.35;
    const timeMul = 1 + d.t / 55;
    const cap = Math.min(180, Math.round(26 * stageMul * timeMul));
    let alive = 0;
    for (const e of this.enemies) if (e.alive) alive++;

    d.nextWave -= dt;
    if (d.nextWave <= 0 && alive < cap) {
      d.wave++;
      d.nextWave = Math.max(0.7, 2.6 - d.t / 80);
      const roster = this.world.pickEnemyRoster(this.stage);
      const count = Math.min(cap - alive, Math.round(rand(4, 7) * stageMul * Math.min(3.4, timeMul)));
      for (let i = 0; i < count; i++) {
        const a = rand(0, TAU);
        const r = rand(150, 210);
        const x = this.player.x + Math.cos(a) * r;
        const y = this.player.y + Math.sin(a) * r;
        const id = roster[randInt(0, roster.length - 1)];
        const e = this.spawnEnemy(id, x, y);
        if (e) {
          const hpScale = 1 + d.t / 130 + (this.stage - 1) * 0.3;
          e.maxHp *= hpScale; e.hp = e.maxHp;
          e.dmg *= 1 + d.t / 260;
          e.xp = Math.round((e.xp || 4) * (1 + d.t / 300));
          this.fx.spawn({ x, y, vx: 0, vy: 0, color: '#985ce0', life: 0.3, size: 4, endSize: 0 });
        }
      }
    }
    // elite pack
    d.eliteT -= dt;
    if (d.eliteT <= 0) {
      d.eliteT = Math.max(24, 50 - d.t / 20);
      this._spawnElite();
    }
    // treasure
    d.chestT -= dt;
    if (d.chestT <= 0) {
      d.chestT = 55;
      const a = rand(0, TAU);
      this.pickups.push(new Pickup('chest', this.player.x + Math.cos(a) * 130, this.player.y + Math.sin(a) * 130, 1));
      this.fx.banner(this.player.x, this.player.y - 44, 'A CHEST APPEARED', '#ffe066');
    }
    // boss timer
    if (!this.bossSpawned && d.t > 150 + this.stage * 15) this._spawnBoss();
  }

  _spawnElite() {
    const roster = this.world.pickEnemyRoster(this.stage);
    const mods = ['armoured', 'fast', 'giant', 'regenerating', 'teleporting', 'summoner', 'enraged', 'void_touched'];
    const n = 1 + Math.floor(this.director.t / 120);
    for (let k = 0; k < n; k++) {
      const a = rand(0, TAU);
      const e = this.spawnEnemy(roster[randInt(0, roster.length - 1)],
        this.player.x + Math.cos(a) * 170, this.player.y + Math.sin(a) * 170);
      if (!e) continue;
      const mod = mods[randInt(0, mods.length - 1)];
      this._applyEliteMod(e, mod);
      e.maxHp = e.hp; 
      this.fx.ring(e.x, e.y, 30, '#ffb020', 0.6, 2);
    }
    this.fx.banner(this.player.x, this.player.y - 46, 'ELITE INCOMING', '#ff8a30');
  }
  _applyEliteMod(e, mod) {
    const map = {
      armoured: () => { e.hp *= 2.4; e.radius += 1; },
      fast: () => { e.spd *= 1.7; e.dmg *= 0.9; },
      giant: () => { e.hp *= 5; e.spd *= 0.85; e.radius *= 1.7; e.scale = 2; e.dmg *= 1.6; e.giant = true; },
      regenerating: () => { e.regen = Math.max(3, e.hp * 0.03); e.hp *= 1.5; },
      teleporting: () => { e.teleportCd = 4; e.hp *= 1.5; },
      summoner: () => { e.ai = 'summoner'; e.summon = { id: 'firefly_swarm', cd: 3.2, count: 3, max: 8 }; e.hp *= 1.8; },
      enraged: () => { e.dmg *= 1.8; e.spd *= 1.2; e.hp *= 1.6; },
      void_touched: () => { e.voidTouched = true; e.hp *= 2; e.dmg *= 1.3; },
    };
    map[mod]?.();
    e.eliteMod = mod;
    e.hp *= 1 + (this.stage - 1) * 0.3;
    e.maxHp = e.hp;
    e.xp = (e.xp || 4) * 6;
  }

  _spawnBoss() {
    const def = findRealm(this.realmId).boss;
    if (!def) return;
    this.bossSpawned = true;
    const a = rand(0, TAU);
    const b = new Boss(def.id, this.player.x + Math.cos(a) * 150, this.player.y + Math.sin(a) * 150,
      this.realmId, this.difficulty, this.art);
    b._id = 'boss';
    this.boss = b;
    this.fx.banner(this.player.x, this.player.y - 50, def.name.toUpperCase(), '#ff4d6a');
    this.fx.screenTint('#ff3020', 0.5);
    this.camera.shake(0.9);
    this.time.slowmo(1.0, 0.35);
  }

  // ================================================================
  // UPDATE
  // ================================================================
  update(rawDt) {
    const input = this.input;
    if (input.wasPressed('Escape')) { input.endFrame(); this.engine.setScene('pause', { from: 'gameplay', ctx: this }); return; }

    // --- card overlay owns the frame ---
    if (this.cards) {
      this.cardT = (this.cardT || 0) + rawDt;
      this._updateCards();
      this.fx.update(rawDt * 0.25);
      input.endFrame();
      return;
    }

    const dt = this.time.scale(Math.min(rawDt, 0.05));
    this.runTime += rawDt;

    if (!this.player.alive && this.player.deathT <= 0) { this._endRun(false); input.endFrame(); return; }

    // ---- input / movement ----
    const p = this.player;
    if (p.alive) {
      const a = input.axis();
      const len = Math.hypot(a.x, a.y) || 1;
      const nx = a.x / (len > 1 ? len : 1), ny = a.y / (len > 1 ? len : 1);
      const speed = 118 * p.moveSpd * (p.dashT > 0 ? 3.2 : 1);
      p.vx = nx * speed; p.vy = ny * speed;
      if (Math.abs(nx) > Math.abs(ny)) { if (nx) { p.facing = nx < 0 ? 'left' : 'right'; p.flip = nx < 0; } }
      else if (ny) p.facing = ny < 0 ? 'up' : 'down';
      const r = p.radius;
      const tx = p.x + p.vx * dt, ty = p.y + p.vy * dt;
      if (!this.world.isSolidWorld(tx + Math.sign(p.vx) * r, p.y)) p.x = tx;
      if (!this.world.isSolidWorld(p.x, ty + Math.sign(p.vy) * r)) p.y = ty;
      if (p.dashT > 0 && p.dashTrail) {
        for (const e of this.enemiesInRange(p.x, p.y, 20)) this.dealDamage(e, 18 * p.atkDmg, { family: 'fire', small: true });
        this.fx.fire(p.x, p.y, '#ff7a33');
      }
      if (p.dashT > 0 && Math.random() < 0.8) this.fx.afterimage(p.currentFrame(), p.x, p.y, 1, p.flip, '#7ec8ff', 0.25);

      // abilities
      for (const ab of p.abilities) {
        const st = p.abilityStates[ab.id];
        st.cd = Math.max(0, st.cd - dt * p.cdr);
        if (st.cd <= 0 && (input.wasPressed('Space') || input.wasPressed('ShiftLeft'))) {
          st.cd = ab.cd;
          this._useAbility(ab);
          break;
        }
      }
      p.autoAttack(dt, this);
    }
    p.update(dt, this);

    // ---- world sim ----
    this.train.update(dt, this);
    if (this.train.dead && !this._trainDeadNotified) {
      this._trainDeadNotified = true;
      this.fx.banner(this.train.x, this.train.y - 40, 'THE TRAIN HAS FALLEN', '#ff4d6a');
      this.fx.explosion(this.train.x, this.train.y, 'explFire', 4, {});
    }
    for (const e of this.enemies) e.update(dt, this);
    for (const arr of [this.projectiles, this.meteors, this.flames, this.bombs, this.pools, this.holes, this.pickups]) {
      for (const o of arr) o.update(dt, this);
    }
    if (this.boss) {
      this.boss.update(dt, this);
      if (!this.boss.alive) {
        if (!this.bossDefeated) this._onBossKilled(this.boss);
        if (this.boss.deathT <= 0) this.boss = null;
      }
    }
    this._director(dt);

    // cleanup
    this.enemies = this.enemies.filter(e => e.alive || e.deathT > 0);
    this.projectiles = this.projectiles.filter(o => o.alive);
    this.meteors = this.meteors.filter(o => o.alive);
    this.flames = this.flames.filter(o => o.alive);
    this.bombs = this.bombs.filter(o => o.alive);
    this.pools = this.pools.filter(o => o.alive);
    this.holes = this.holes.filter(o => o.alive);
    this.pickups = this.pickups.filter(o => o.alive);
    if (this.enemies.length > 320) this.enemies.splice(0, this.enemies.length - 320);

    if (this._magnetT > 0) { this._magnetT -= dt; if (this._magnetT <= 0) this.magnetAll = false; }

    // ---- camera & fx ----
    this.fx.update(dt);
    this.camera.follow(p.x, p.y, rawDt, p.vx, p.vy);
    this.camera.update(rawDt);
    this._updateAmbient(dt);

    input.endFrame();
  }

  _useAbility(ab) {
    const p = this.player;
    if (ab.id === 'dodge') {
      const a = this.input.axis();
      const ang = (a.x || a.y) ? Math.atan2(a.y, a.x) :
        (p.facing === 'left' ? Math.PI : p.facing === 'up' ? -Math.PI / 2 : p.facing === 'down' ? Math.PI / 2 : 0);
      p.invuln = Math.max(p.invuln, ab.dur + 0.1);
      p.dashT = ab.dur;
      const nx = p.x + Math.cos(ang) * ab.dist, ny = p.y + Math.sin(ang) * ab.dist;
      if (!this.world.isSolidWorld(nx, ny)) { p.x = nx; p.y = ny; }
      this.fx.burst(p.x, p.y, '#7ec8ff', 14, { spd: 150, life: 0.35, light: 0.2 });
      this.camera.punch(0.02);
    } else if (ab.id === 'blast') {
      this.fx.shockwave(p.x, p.y, ab.radius, '#ff7a33');
      this.fx.explosion(p.x, p.y, 'explFire', 2.4, {});
      this.camera.shake(0.5); this.camera.punch(0.04);
      for (const e of this.enemiesInRange(p.x, p.y, ab.radius)) {
        this.dealDamage(e, ab.dmg * p.atkDmg, { family: 'fire', knockback: 220, x: p.x, y: p.y });
      }
    } else if (ab.id === 'magnet') {
      this.magnetPulse(); this._magnetT = ab.dur;
    } else if (ab.id === 'overclock') {
      p.frenzyStacks = 40; p.frenzyT = ab.dur; p.frenzy = Math.max(p.frenzy, 0.05);
      this.fx.banner(p.x, p.y - 30, 'OVERCLOCK', '#2ff0ff');
    } else if (ab.id === 'bulwark') {
      p.shield += p.maxHp * 0.4;
      this.fx.ring(p.x, p.y, 26, '#ffe066', 0.4, 3);
    }
  }

  _updateAmbient(dt) {
    const p = this.player;
    for (const a of this.ambientBits) {
      switch (a.kind) {
        case 'snow': a.y += 22 * dt * a.s; a.x += 9 * dt; break;
        case 'ember': a.y -= 26 * dt * a.s; a.x += 7 * dt; break;
        case 'sand': a.x -= 60 * dt * a.s; break;
        case 'leaf': a.x += 12 * dt; a.y += 16 * dt * a.s; break;
        case 'spark': a.y -= 8 * dt; a.x += Math.sin(this.runTime + a.s * 8) * 8 * dt; break;
        default: a.x += 6 * dt;
      }
      if (a.x > p.x + 200) a.x = p.x - 200;
      if (a.x < p.x - 200) a.x = p.x + 200;
      if (a.y > p.y + 160) a.y = p.y - 160;
      if (a.y < p.y - 160) a.y = p.y + 160;
    }
  }

  _updateCards() {
    const input = this.input;
    const n = this.cards.length;
    const mx = input.mouse.x, my = input.mouse.y;
    const geo = this._cardGeometry();
    this.cardIndex = -1;
    for (let i = 0; i < n; i++) {
      const g = geo[i];
      if (mx >= g.x && mx <= g.x + g.w && my >= g.y && my <= g.y + g.h) this.cardIndex = i;
    }
    for (let i = 0; i < n; i++) {
      if (input.wasPressed('Digit' + (i + 1)) || input.wasPressed('Numpad' + (i + 1))) { this._pickCard(i); return; }
    }
    if (input.mouse.justDown && this.cardIndex >= 0) { this._pickCard(this.cardIndex); return; }
    if (input.wasPressed('KeyR')) this._reroll();
    if (input.wasPressed('KeyB')) this._banish();
    // reroll / banish buttons
    if (input.mouse.justDown) {
      const by = CFG.VIEW_H - 26;
      if (my >= by && my <= by + 16) {
        if (mx > CFG.VIEW_W / 2 - 90 && mx < CFG.VIEW_W / 2 - 10) this._reroll();
        if (mx > CFG.VIEW_W / 2 + 10 && mx < CFG.VIEW_W / 2 + 90) this._banish();
      }
    }
  }
  _cardGeometry() {
    const n = this.cards.length;
    const single = n === 1;
    const w = single ? 220 : Math.min(120, Math.floor((CFG.VIEW_W - 40) / n) - 8);
    const h = single ? 120 : 132;
    const gap = 8;
    const total = n * w + (n - 1) * gap;
    const x0 = (CFG.VIEW_W - total) / 2;
    const y = (CFG.VIEW_H - h) / 2 + 6;
    return this.cards.map((_, i) => ({ x: x0 + i * (w + gap), y, w, h }));
  }

  _endRun(victory) {
    if (this._ended) return;
    this._ended = true;
    const p = this.player;
    addCoins(this.save, this.runCoins);
    this.save.stats.totalKills = (this.save.stats.totalKills || 0) + this.runStats.kills;
    this.save.stats.totalRuns = (this.save.stats.totalRuns || 0) + 1;
    this.save.stats.bestScore = Math.max(this.save.stats.bestScore || 0, p.score);
    this.save.stats.longestRun = Math.max(this.save.stats.longestRun || 0, this.runTime);
    this.save.stats.highestStage = Math.max(this.save.stats.highestStage || 0, this.stage);
    this.save.stats.bestCombo = Math.max(this.save.stats.bestCombo || 0, this.runStats.bestCombo);
    saveSave(this.save);
    this.engine.supabase?.submitScore?.({
      score: p.score, time: this.runTime, stage: this.stage, realm: this.realmId,
      kills: this.runStats.kills, character: this.save.charSkin, difficulty: this.difficulty.id,
      challenge: this.weeklyChallenge?.id || null, playerId: this.save.playerId,
    });
    this.engine.setScene('runSummary', {
      realmId: this.realmId, stage: this.stage, save: this.save, runStats: this.runStats,
      time: this.runTime, victory, coins: this.runCoins, level: p.level,
      owned: this.owned, apocalypse: this.apocalypseActive,
    });
  }
  _buildParams() {
    return { save: this.save, realmId: this.realmId, stage: this.stage,
      difficulty: this.difficulty.id, runSeed: (Math.random() * 4294967295) >>> 0 };
  }

  // ================================================================
  // RENDER
  // ================================================================
  render(out) {
    const A = this.art;
    const ctx = this.renderer.begin();
    const cam = this.camera;
    const realm = findRealm(this.realmId);

    ctx.fillStyle = realm.sky;
    ctx.fillRect(0, 0, CFG.VIEW_W, CFG.VIEW_H);

    ctx.save();
    cam.apply(ctx);

    this._drawWorld(ctx);
    this.fx.drawDecals(ctx);
    this._drawAmbient(ctx, 0);

    // pools & holes (ground layer)
    for (const p of this.pools) {
      const fade = Math.max(0, Math.min(1, p.t < 0.3 ? p.t / 0.3 : (p.life - p.t) / 0.8));
      const seed = (p._id || 1) * 0.7;
      // irregular puddle built from overlapping lobes so it never reads as a disc
      ctx.globalAlpha = 0.34 * fade;
      ctx.fillStyle = p.color;
      ctx.beginPath();
      for (let i = 0; i < 7; i++) {
        const a = (i / 7) * TAU + seed;
        const wob = 0.72 + 0.28 * Math.sin(this.runTime * 1.6 + i * 2.1 + seed);
        ctx.arc(p.x + Math.cos(a) * p.radius * 0.34, p.y + Math.sin(a) * p.radius * 0.22,
          p.radius * 0.62 * wob, 0, TAU);
      }
      ctx.fill();
      // darker core + bright rim
      ctx.globalAlpha = 0.28 * fade;
      ctx.fillStyle = '#00000080';
      ctx.beginPath(); ctx.ellipse(p.x, p.y, p.radius * 0.5, p.radius * 0.34, 0, 0, TAU); ctx.fill();
      ctx.globalAlpha = 0.5 * fade;
      ctx.strokeStyle = p.color; ctx.lineWidth = 1;
      ctx.beginPath(); ctx.ellipse(p.x, p.y, p.radius * 0.9, p.radius * 0.62, 0, 0, TAU); ctx.stroke();
      ctx.globalAlpha = 1;
      // bubbles
      if (Math.random() < 0.25 * fade) {
        this.fx.spawn({ x: p.x + rand(-p.radius * 0.7, p.radius * 0.7),
          y: p.y + rand(-p.radius * 0.4, p.radius * 0.4), vx: 0, vy: -8,
          color: p.color, life: 0.5, size: 2, endSize: 0, additive: false });
      }
    }
    for (const h of this.holes) {
      const g = ctx.createRadialGradient(h.x, h.y, 1, h.x, h.y, h.radius);
      g.addColorStop(0, '#000000'); g.addColorStop(0.5, '#2a1240'); g.addColorStop(1, 'rgba(40,10,80,0)');
      ctx.fillStyle = g;
      ctx.beginPath(); ctx.arc(h.x, h.y, h.radius, 0, TAU); ctx.fill();
    }

    // ---- draw order by Y ----
    const drawables = [];
    for (const u of this.pickups) drawables.push({ y: u.y, kind: 'pickup', o: u });
    for (const e of this.enemies) drawables.push({ y: e.y, kind: 'enemy', o: e });
    drawables.push({ y: this.train.y + 10, kind: 'train', o: this.train });
    if (this.boss) drawables.push({ y: this.boss.y, kind: 'boss', o: this.boss });
    if (this.player.alive || this.player.deathT > 0) drawables.push({ y: this.player.y, kind: 'player', o: this.player });
    drawables.sort((a, b) => a.y - b.y);

    for (const d of drawables) {
      if (d.kind === 'pickup') this._drawPickup(ctx, d.o);
      else if (d.kind === 'enemy') this._drawEnemy(ctx, d.o);
      else if (d.kind === 'train') this._drawTrain(ctx, d.o);
      else if (d.kind === 'boss') this._drawBoss(ctx, d.o);
      else if (d.kind === 'player') this._drawPlayer(ctx, d.o);
    }

    // orbitals & drones on top
    const p = this.player;
    for (const o of p.orbitals) {
      const f = A.anim.sawBlade[Math.floor((this.runTime * 18 + o.ang * 3) % A.anim.sawBlade.length)];
      ctx.drawImage(f, Math.round(o.x - f.width / 2), Math.round(o.y - f.height / 2));
      this._light(o.x, o.y, 20, o.color, 0.35);
    }
    for (const d of p.drones) {
      const f = A.anim.orbPlasma[Math.floor(this.runTime * 12) % A.anim.orbPlasma.length];
      ctx.drawImage(f, Math.round(d.x - f.width / 2), Math.round(d.y - f.height / 2));
      this._light(d.x, d.y, 22, '#8ef0ff', 0.4);
    }
    for (const o of this.train.orbiters) {
      const f = A.anim.orbShadow[Math.floor(this.runTime * 10) % A.anim.orbShadow.length];
      ctx.drawImage(f, Math.round(o.x - f.width / 2), Math.round(o.y - f.height / 2));
    }

    // projectiles / bombs / meteors
    for (const pr of this.projectiles) this._drawProjectile(ctx, pr);
    for (const b of this.bombs) {
      const f = A.anim.bomb[Math.floor(b.t * 14) % A.anim.bomb.length];
      ctx.drawImage(f, Math.round(b.x - f.width / 2), Math.round(b.y - f.height / 2));
      this._light(b.x, b.y, 18, '#ff9033', 0.4);
    }
    for (const m of this.meteors) {
      const f = A.anim.orbFire[Math.floor(this.runTime * 20) % A.anim.orbFire.length];
      ctx.save(); ctx.translate(m.x, m.y); ctx.scale(2.2, 2.2);
      ctx.drawImage(f, -f.width / 2, -f.height / 2); ctx.restore();
      this._light(m.x, m.y, 46, '#ff7a33', 0.8);
      // target marker
      ctx.strokeStyle = '#ff5a33'; ctx.globalAlpha = 0.6;
      ctx.beginPath(); ctx.arc(m.tx, m.ty, m.radius * 0.5, 0, TAU); ctx.stroke();
      ctx.globalAlpha = 1;
    }

    this.fx.draw(ctx, this.renderer, cam);
    this._drawAmbient(ctx, 1);
    ctx.restore();

    // ---- lights ----
    for (const wl of this.world.lights) {
      if (Math.abs(wl.x - cam.x) > 340 || Math.abs(wl.y - cam.y) > 240) continue;
      this._light(wl.x, wl.y, wl.radius * 0.8, wl.color, 0.32, 0.05);
    }
    this._light(p.x, p.y, 110, this.apocalypseActive ? '#ff5a33' : '#ffd9a0', this.apocalypseActive ? 1.1 : 0.85, 0.06);
    this._light(this.train.x + 20 * (this.train.facing || 1), this.train.y - 12, 90,
      this.train.set.skin.pal.glow, 0.9, 0.15);

    // ---- composite ----
    this.renderer.composite(out, {
      ambient: this.apocalypseActive ? '#9a6858' : (AMBIENT[this.realmId] || '#7a7a96'),
      grade: this.apocalypseActive ? '#ff5a3a' : GRADE[this.realmId],
      gradeAmount: this.apocalypseActive ? 0.26 : 0.16,
      time: this.runTime,
      aberration: Math.min(3, this.fx.aberration + (this.apocalypseActive ? 0.6 : 0) + cam.trauma * 1.6),
      bloomBoost: this.apocalypseActive ? 1.15 : 1,
      flash: this.fx.screenFlash.a > 0.01 ? this.fx.screenFlash : null,
    });

    // ---- HUD (screen space, after post) ----
    this.fx.drawTexts(out, cam);
    this._drawHUD(out);
    if (this.cards) this._drawCards(out);
  }

  _light(wx, wy, r, color, intensity, flicker = 0) {
    const s = this.camera.worldToScreen(wx, wy);
    this.renderer.addLight(s.x, s.y, r * this.camera.zoom, color, intensity, flicker);
  }

  _drawShadow(ctx, x, y, w) {
    const s = w > 34 ? this.art.shadowHuge : w > 18 ? this.art.shadowBig : this.art.shadow;
    ctx.globalAlpha = 0.55;
    ctx.drawImage(s, Math.round(x - s.width / 2), Math.round(y - s.height / 2));
    ctx.globalAlpha = 1;
  }

  _drawPlayer(ctx, p) {
    const f = p.currentFrame();
    if (!f) return;
    this._drawShadow(ctx, p.x, p.y + 9, 16);
    let img = f;
    if (p.hitT > 0) img = this.art.hitFlash(f, '#ff6060');
    else if (p.invuln > 0 && Math.floor(this.runTime * 24) % 2 === 0) img = this.art.hitFlash(f, '#ffffff');
    if (p.shield > 0) {
      ctx.strokeStyle = '#ffe066'; ctx.globalAlpha = 0.5 + 0.2 * Math.sin(this.runTime * 6);
      ctx.beginPath(); ctx.arc(p.x, p.y, 15, 0, TAU); ctx.stroke();
      ctx.globalAlpha = 1;
    }
    ctx.save();
    ctx.translate(Math.round(p.x), Math.round(p.y));
    if (p.flip && p.dirKey() === 'side') ctx.scale(-1, 1);
    if (!p.alive) { ctx.globalAlpha = Math.max(0, p.deathT / 1.4); ctx.rotate((1 - p.deathT / 1.4) * 0.6); }
    ctx.drawImage(img, -Math.round(img.width / 2), -Math.round(img.height / 2) - 3);
    ctx.restore();
    ctx.globalAlpha = 1;
    if (this.apocalypseActive) {
      ctx.globalCompositeOperation = 'lighter';
      ctx.globalAlpha = 0.25 + 0.1 * Math.sin(this.runTime * 8);
      ctx.fillStyle = '#ff2a2a';
      ctx.beginPath(); ctx.arc(p.x, p.y - 2, 16, 0, TAU); ctx.fill();
      ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'source-over';
    }
  }

  _drawEnemy(ctx, e) {
    const A = this.art;
    const key = e.spriteName(A.anim);
    const frames = A.anim[key] || A.anim.ghost;
    let f = frames[e.frame % frames.length];
    if (!f) return;
    const scale = e.scale || 1;
    this._drawShadow(ctx, e.x, e.y + 6 * scale, 14 * scale);
    let img = f;
    if (e.freezeT > 0) img = A.hitFlash(f, '#9cd8ff');
    else if (e.flashT > 0) img = A.hitFlash(f, '#ffffff');
    else if (e.eliteMod) img = A.hitFlash(f, '#ffb020');
    ctx.save();
    ctx.translate(Math.round(e.x), Math.round(e.y));
    if (!e.alive) {
      const k = Math.max(0, e.deathT / 0.55);
      ctx.globalAlpha = k;
      ctx.scale(scale * (1 + (1 - k) * 0.5), scale * (1 - (1 - k) * 0.5));
    } else {
      const squash = e.spawnT > 0 ? 0.4 + (0.25 - e.spawnT) * 2.4 : 1;
      ctx.scale(scale * squash, scale * (2 - squash));
    }
    ctx.drawImage(img, -Math.round(img.width / 2), -Math.round(img.height / 2) - 2);
    ctx.restore();
    ctx.globalAlpha = 1;
    if (e.alive && e.hp < e.maxHp) {
      const w = Math.max(14, 10 * scale + 8);
      const pct = Math.max(0, e.hp / e.maxHp);
      const y = e.y - (e.radius + 9) * scale;
      ctx.fillStyle = '#00000099'; ctx.fillRect(e.x - w / 2 - 1, y - 1, w + 2, 4);
      ctx.fillStyle = e.eliteMod ? '#ffb020' : '#ff4d4d';
      ctx.fillRect(e.x - w / 2, y, w * pct, 2);
    }
    if (e.eliteMod) this._light(e.x, e.y, 26, '#ffb020', 0.4);
  }

  _drawBoss(ctx, b) {
    const A = this.art;
    let key = b.spriteName;
    if (key === 'trainEngine') key = 'bossTrain';
    if (!A.anim[key]) key = 'bossConductor';
    const frames = A.anim[key];
    const f = frames[Math.floor(this.runTime * 8) % frames.length];
    this._drawShadow(ctx, b.x, b.y + b.radius * 0.7, b.radius * 2.4);
    let img = f;
    if (b.flashT > 0) img = A.hitFlash(f, '#ffffff');
    const intro = b._introT > 0 ? b._introT / 1.4 : 0;
    ctx.save();
    ctx.translate(Math.round(b.x), Math.round(b.y));
    const s = (b.scale || 1) * (1 + intro * 0.3);
    ctx.scale(s, s);
    ctx.globalAlpha = b.alive ? (1 - intro * 0.5) : Math.max(0, b.deathT / 1.2);
    ctx.drawImage(img, -Math.round(img.width / 2), -Math.round(img.height / 2));
    ctx.restore();
    ctx.globalAlpha = 1;
    this._light(b.x, b.y, 70, b.color || '#ff8040', 0.6);
  }

  _drawTrain(ctx, t) {
    const set = t.set;
    const i = Math.floor(t.wheelPhase * set.engine.length) % set.engine.length;
    const eng = (t.hp / t.maxHp < 0.4 ? set.engineHurt : set.engine)[i];
    const dir = t.facing || 1;
    this._drawShadow(ctx, t.x, t.y + 14, 60);
    // carriages behind
    let off = -46 * dir;
    for (const c of t.carriages) {
      const car = (c === 'gun' ? set.gun : set.cargo)[i];
      this._drawShadow(ctx, t.x + off, t.y + 12, 46);
      ctx.save();
      ctx.translate(Math.round(t.x + off), Math.round(t.y));
      if (dir < 0) ctx.scale(-1, 1);
      ctx.drawImage(car, -Math.round(car.width / 2), -Math.round(car.height / 2) - 4);
      ctx.restore();
      off -= 46 * dir;
    }
    ctx.save();
    ctx.translate(Math.round(t.x), Math.round(t.y));
    if (dir < 0) ctx.scale(-1, 1);
    let img = eng;
    if (t.hitT > 0) img = this.art.hitFlash(eng, '#ff8080');
    ctx.drawImage(img, -Math.round(img.width / 2), -Math.round(img.height / 2) - 4);
    ctx.restore();
    // headlight cone
    this._light(t.x + 26 * dir, t.y - 8, 60, set.skin.pal.glow, 0.8, 0.1);
    if (t.overdrive) this._light(t.x, t.y, 90, '#ff3a2a', 1.0, 0.3);
  }

  _drawPickup(ctx, u) {
    const A = this.art;
    const frames = A.anim[u.spriteKey()] || A.anim.xp;
    const f = frames[Math.floor(u.frame) % frames.length];
    const bob = Math.sin(u.t * 6) * 1.5;
    ctx.drawImage(f, Math.round(u.x - f.width / 2), Math.round(u.y - f.height / 2 + bob));
    if (u.type === 'coin' || u.type === 'chest' || u.type === 'heart') {
      this._light(u.x, u.y, 14, u.color(), 0.35);
    }
  }

  _drawProjectile(ctx, pr) {
    const A = this.art;
    const key = pr.sprite && A.anim[pr.sprite] ? pr.sprite : null;
    if (key) {
      const frames = A.anim[key];
      const f = frames[Math.floor(this.runTime * 22 + pr._id) % frames.length];
      ctx.save();
      ctx.translate(Math.round(pr.x), Math.round(pr.y));
      if (pr.rot || pr.angle !== undefined) ctx.rotate(pr.rot || pr.angle || 0);
      const s = pr.omega ? 2 : 1;
      ctx.drawImage(f, -Math.round(f.width / 2) * s, -Math.round(f.height / 2) * s, f.width * s, f.height * s);
      ctx.restore();
    } else {
      ctx.fillStyle = pr.color || '#ffffff';
      ctx.beginPath(); ctx.arc(pr.x, pr.y, pr.size, 0, TAU); ctx.fill();
    }
    this._light(pr.x, pr.y, (pr.omega ? 60 : 20), pr.color || '#ffffff', pr.omega ? 1 : 0.4);
  }

  _drawAmbient(ctx, layer) {
    const bits = this.ambientBits;
    for (const a of bits) {
      switch (a.kind) {
        case 'snow': if (layer) { ctx.fillStyle = '#d4ecff'; ctx.globalAlpha = 0.7; ctx.fillRect(a.x, a.y, 1, 1); } break;
        case 'ember': if (layer) { ctx.fillStyle = '#ffb040'; ctx.globalAlpha = 0.8; ctx.fillRect(a.x, a.y, 1, 2); } break;
        case 'sand': if (!layer) { ctx.fillStyle = '#c8a464'; ctx.globalAlpha = 0.18; ctx.fillRect(a.x, a.y, 10, 1); } break;
        case 'leaf': if (layer) { ctx.fillStyle = '#5a9c33'; ctx.globalAlpha = 0.7; ctx.fillRect(a.x, a.y, 2, 1); } break;
        case 'spark': if (layer) { ctx.fillStyle = '#c07aff'; ctx.globalAlpha = 0.8; ctx.fillRect(a.x, a.y, 1, 1); } break;
        default: if (!layer) { ctx.fillStyle = '#8a8ab0'; ctx.globalAlpha = 0.07; ctx.fillRect(a.x, a.y, 40, 8); }
      }
      ctx.globalAlpha = 1;
    }
  }

  _drawWorld(ctx) {
    const ts = 16;
    const cam = this.camera;
    const halfW = CFG.VIEW_W / 2 / cam.zoom + 24;
    const halfH = CFG.VIEW_H / 2 / cam.zoom + 24;
    const tx0 = Math.max(0, Math.floor((cam.x - halfW) / ts));
    const ty0 = Math.max(0, Math.floor((cam.y - halfH) / ts));
    const tx1 = Math.min(this.world.W - 1, Math.ceil((cam.x + halfW) / ts));
    const ty1 = Math.min(this.world.H - 1, Math.ceil((cam.y + halfH) / ts));
    const realm = findRealm(this.realmId);
    ctx.fillStyle = floorOf(this.realmId, 2);
    ctx.fillRect(cam.x - halfW - 32, cam.y - halfH - 32, halfW * 2 + 64, halfH * 2 + 64);
    for (let y = ty0; y <= ty1; y++) {
      for (let x = tx0; x <= tx1; x++) {
        const t = this.world.tiles[y * this.world.W + x];
        const px = x * ts, py = y * ts;
        const n = ((x * 73856093) ^ (y * 19349663)) & 7;
        if (t === T.WALL) {
          ctx.fillStyle = realm.accent; ctx.fillRect(px, py, ts, ts);
          ctx.fillStyle = '#00000055'; ctx.fillRect(px + 1, py + 1, ts - 2, ts - 2);
          ctx.fillStyle = realm.accent; ctx.fillRect(px + 2, py + 2, ts - 5, ts - 5);
          ctx.fillStyle = '#ffffff10'; ctx.fillRect(px + 2, py + 2, ts - 5, 2);
        } else if (t === T.TREE) {
          ctx.fillStyle = floorOf(this.realmId, n); ctx.fillRect(px, py, ts, ts);
          ctx.fillStyle = '#1a1208'; ctx.fillRect(px + 6, py + 6, 4, 10);
          ctx.fillStyle = '#24401a'; ctx.beginPath(); ctx.arc(px + 8, py + 6, 6, 0, TAU); ctx.fill();
          ctx.fillStyle = '#3a6a26'; ctx.beginPath(); ctx.arc(px + 7, py + 5, 4, 0, TAU); ctx.fill();
        } else if (t === T.ROCK) {
          ctx.fillStyle = floorOf(this.realmId, n); ctx.fillRect(px, py, ts, ts);
          ctx.fillStyle = '#2c2c38'; ctx.beginPath(); ctx.arc(px + 8, py + 9, 5, 0, TAU); ctx.fill();
          ctx.fillStyle = '#48485a'; ctx.beginPath(); ctx.arc(px + 7, py + 8, 3.4, 0, TAU); ctx.fill();
        } else if (t === T.LAVA) {
          const pulse = 0.5 + 0.5 * Math.sin(this.runTime * 2 + n);
          ctx.fillStyle = '#6b1510'; ctx.fillRect(px, py, ts, ts);
          ctx.fillStyle = pulse > 0.6 ? '#ff6a33' : '#d6311a';
          ctx.fillRect(px + 2, py + 2, ts - 4, ts - 4);
          if (Math.random() < 0.02) this.fx.embers(px + 8, py + 8, '#ffb040', 1);
        } else if (t === T.ICE) {
          ctx.fillStyle = '#16243c'; ctx.fillRect(px, py, ts, ts);
          ctx.fillStyle = '#25436a'; ctx.fillRect(px + 1, py + 1, ts - 2, ts - 2);
          if (n < 2) { ctx.fillStyle = '#7ab0e0'; ctx.fillRect(px + 4 + n, py + 5, 4, 1); }
        } else if (t === T.SAND) {
          ctx.fillStyle = '#5c4c20'; ctx.fillRect(px, py, ts, ts);
          ctx.fillStyle = '#6d5a28'; ctx.fillRect(px + 1, py + 1, ts - 2, ts - 2);
          if (n < 3) { ctx.fillStyle = '#7a6530'; ctx.fillRect(px + 3 + n * 2, py + 6 + n, 3, 1); }
        } else if (t === T.VOID) {
          ctx.fillStyle = '#0a0420'; ctx.fillRect(px, py, ts, ts);
          if (n === 0) { ctx.fillStyle = '#482278'; ctx.fillRect(px + 4, py + 6, 1, 1); }
          if (n === 3) { ctx.fillStyle = '#7a44c0'; ctx.fillRect(px + 11, py + 3, 1, 1); }
        } else if (t === T.PLATFORM) {
          ctx.fillStyle = '#1c1c24'; ctx.fillRect(px, py, ts, ts);
          ctx.fillStyle = '#2c2c38'; ctx.fillRect(px + 1, py + 1, ts - 2, ts - 2);
          ctx.fillStyle = '#3d3d4d'; ctx.fillRect(px, py + 12, ts, 2);
        } else if (t === T.TRACK) {
          ctx.fillStyle = floorOf(this.realmId, n); ctx.fillRect(px, py, ts, ts);
          ctx.fillStyle = '#3a2a18'; ctx.fillRect(px, py + 4, ts, 8);
          ctx.fillStyle = '#6a6a80'; ctx.fillRect(px, py + 5, ts, 1); ctx.fillRect(px, py + 10, ts, 1);
        } else if (t === T.ASH) {
          ctx.fillStyle = '#241a10'; ctx.fillRect(px, py, ts, ts);
          if (n < 2) { ctx.fillStyle = '#3a2a18'; ctx.fillRect(px + 3 + n * 3, py + 4 + n, 2, 2); }
        } else {
          ctx.fillStyle = floorOf(this.realmId, n & 1 ? 0 : 1);
          ctx.fillRect(px, py, ts, ts);
          if (n === 0) { ctx.fillStyle = '#ffffff12'; ctx.fillRect(px + 3, py + 5, 3, 1); }
          if (n === 2) { ctx.fillStyle = '#ffffff0a'; ctx.fillRect(px + 10, py + 2, 2, 2); }
          if (n === 5) { ctx.fillStyle = '#00000033'; ctx.fillRect(px + 9, py + 10, 4, 2); }
          if (n === 6) { ctx.fillStyle = '#00000022'; ctx.fillRect(px + 2, py + 12, 5, 1); }
        }
      }
    }
  }

  // ================================================================
  // HUD
  // ================================================================
  _drawHUD(ctx) {
    const W = CFG.VIEW_W, H = CFG.VIEW_H;
    const p = this.player;

    // ---- XP bar across the very top ----
    ctx.fillStyle = '#0c0a16'; ctx.fillRect(0, 0, W, 7);
    const xpPct = Math.min(1, p.xp / p.xpNeeded());
    const g = ctx.createLinearGradient(0, 0, W, 0);
    g.addColorStop(0, '#2b6ad0'); g.addColorStop(1, '#8ef0ff');
    ctx.fillStyle = g; ctx.fillRect(0, 0, W * xpPct, 6);
    ctx.fillStyle = '#ffffff40'; ctx.fillRect(0, 0, W * xpPct, 2);
    text(ctx, 'LV ' + p.level, 4, 13, '#ffffff', 8, true);

    // ---- HP + shield ----
    const hx = 34, hy = 8, hw = 118, hh = 9;
    ctx.fillStyle = '#000000aa'; ctx.fillRect(hx - 1, hy - 1, hw + 2, hh + 2);
    ctx.fillStyle = '#2a0c10'; ctx.fillRect(hx, hy, hw, hh);
    const hpPct = Math.max(0, p.hp / p.maxHp);
    const hg = ctx.createLinearGradient(hx, 0, hx + hw, 0);
    hg.addColorStop(0, '#c81f2a'); hg.addColorStop(1, '#ff6a5a');
    ctx.fillStyle = hg; ctx.fillRect(hx, hy, hw * hpPct, hh);
    ctx.fillStyle = '#ffffff33'; ctx.fillRect(hx, hy, hw * hpPct, 3);
    if (p.shield > 0) {
      ctx.fillStyle = '#ffe06699';
      ctx.fillRect(hx, hy, hw * Math.min(1, p.shield / p.maxHp), hh);
    }
    text(ctx, Math.ceil(p.hp) + '/' + Math.round(p.maxHp), hx + 4, hy + 7, '#ffffff', 7, true);

    // ---- coins / time / kills ----
    const coinF = this.art.anim.coin[Math.floor(this.runTime * 8) % 8];
    ctx.drawImage(coinF, W - 74, 8);
    text(ctx, fmtNum(this.runCoins), W - 62, 16, '#ffe878', 8, true);
    text(ctx, fmtTime(this.runTime), W - 74, 26, '#cfd4e0', 7);
    text(ctx, 'KILLS ' + this.runStats.kills, W - 74, 34, '#cfd4e0', 7);

    // ---- combo ----
    if (p.combo > 4) {
      const a = Math.min(1, p.comboT);
      ctx.globalAlpha = a;
      textC(ctx, 'x' + p.combo + ' COMBO', W / 2, 22, p.combo > 40 ? '#ff4d6a' : p.combo > 20 ? '#ffb020' : '#ffe066',
        p.combo > 40 ? 12 : 10, true);
      ctx.globalAlpha = 1;
    }

    // ---- weapons (bottom-left) ----
    let wx = 6;
    for (const w of p.weapons) {
      const st = p.weaponStates[w.id];
      drawIcon(ctx, w.icon || 'fire', wx, H - 22, 16, w.color);
      ctx.fillStyle = '#000000aa'; ctx.fillRect(wx, H - 8, 16, 7);
      text(ctx, 'L' + st.level, wx + 2, H - 2, '#ffffff', 6, true);
      if (st.cd > 0 && w.cd) {
        ctx.fillStyle = '#000000aa';
        const k = Math.max(0, Math.min(1, st.cd / w.cd));
        ctx.fillRect(wx, H - 22, 16, 16 * k);
      }
      wx += 19;
    }
    // ---- ability ----
    for (const ab of p.abilities) {
      const st = p.abilityStates[ab.id];
      drawIcon(ctx, 'dash', wx + 4, H - 22, 16, ab.color);
      if (st.cd > 0) {
        ctx.fillStyle = '#000000bb';
        ctx.fillRect(wx + 4, H - 22, 16, 16 * (st.cd / ab.cd));
        text(ctx, st.cd.toFixed(1), wx + 5, H - 12, '#ffffff', 6, true);
      } else text(ctx, 'SPC', wx + 5, H - 2, '#8ef0ff', 6, true);
      wx += 22;
    }

    // ---- train status (bottom-right) ----
    const tw = 90, tx = W - tw - 6, ty = H - 26;
    ctx.fillStyle = '#000000aa'; ctx.fillRect(tx - 2, ty - 2, tw + 4, 24);
    text(ctx, this.train.set.skin.name.toUpperCase().slice(0, 14), tx, ty + 5, '#cfd4e0', 6, true);
    drawBar(ctx, tx, ty + 8, tw, 5, this.train.hp / this.train.maxHp, '#74c04a', '#0e2410');
    drawBar(ctx, tx, ty + 15, tw, 4, this.train.energy / this.train.maxEnergy, '#8ef0ff', '#101a2a');
    if (this.train.overdrive) text(ctx, 'OVERDRIVE', tx + 20, ty + 24, '#ff4d6a', 6, true);

    // ---- boss bar ----
    if (this.boss?.alive && this.boss._introT <= 0) {
      const bw = W - 120, bx = 60, by = 42;
      ctx.fillStyle = '#000000bb'; ctx.fillRect(bx - 2, by - 2, bw + 4, 12);
      drawBar(ctx, bx, by, bw, 8, this.boss.hp / this.boss.maxHp, '#ff3a4a', '#2a0a10');
      textC(ctx, this.boss.name.toUpperCase() + '   PHASE ' + this.boss.phase + '/' + this.boss.phases,
        W / 2, by + 7, '#ffffff', 7, true);
    }

    // ---- apocalypse banner ----
    if (this.apocalypseActive) {
      ctx.globalAlpha = 0.6 + 0.3 * Math.sin(this.runTime * 5);
      textC(ctx, 'APOCALYPSE PROTOCOL ACTIVE', W / 2, H - 32, '#ff2a2a', 8, true);
      ctx.globalAlpha = 1;
    }

    // ---- low HP vignette ----
    if (p.hp / p.maxHp < 0.3) {
      const a = 0.5 * (1 - p.hp / p.maxHp) * (0.7 + 0.3 * Math.sin(this.runTime * 8));
      ctx.fillStyle = `rgba(255,30,30,${a.toFixed(3)})`;
      ctx.fillRect(0, 0, W, 5); ctx.fillRect(0, H - 5, W, 5);
      ctx.fillRect(0, 0, 5, H); ctx.fillRect(W - 5, 0, 5, H);
    }
  }

  // ================================================================
  // CARD OVERLAY
  // ================================================================
  _drawCards(ctx) {
    const W = CFG.VIEW_W, H = CFG.VIEW_H;
    const apoc = this.cards[0]?.card?.rarity === 'apocalypse';
    ctx.fillStyle = apoc ? 'rgba(40,0,0,0.9)' : 'rgba(6,4,14,0.86)';
    ctx.fillRect(0, 0, W, H);
    const t = Math.min(1, (this.cardT || 0) * 4);
    if (apoc) {
      ctx.globalAlpha = 0.25 + 0.15 * Math.sin(this.runTime * 6);
      ctx.fillStyle = '#ff2a2a'; ctx.fillRect(0, 0, W, H);
      ctx.globalAlpha = 1;
      textC(ctx, 'THE GRID IS COMPLETE', W / 2, 26, '#ff8080', 8, true);
      textC(ctx, 'APOCALYPSE PROTOCOL', W / 2, 40, '#ffffff', 14, true);
    } else {
      textC(ctx, 'ASCENSION', W / 2, 24, '#ffe066', 12, true);
      textC(ctx, 'LEVEL ' + this.player.level + '  ·  CHOOSE YOUR PATH', W / 2, 36, '#cfd4e0', 7);
    }
    const geo = this._cardGeometry();
    for (let i = 0; i < this.cards.length; i++) {
      const { card, nextLevel } = this.cards[i];
      const gm = geo[i];
      drawCard(ctx, {
        x: gm.x, y: gm.y + (1 - t) * 20 * (i % 2 ? 1 : -1), w: gm.w, h: gm.h,
        title: card.name, level: (card.max || 5) > 1 ? ROMAN[nextLevel] : '',
        desc: typeof card.desc === 'function' ? card.desc(nextLevel) : card.desc,
        rarity: card.rarity, color: RARITY_COLORS[card.rarity], icon: card.icon,
        selected: this.cardIndex === i, index: i + 1, alpha: t,
        target: card.target === 'train' ? 'TRAIN' : null,
        tagline: card.tagline,
        evolved: !!card.req,
      });
    }
    if (!apoc) {
      const by = H - 26;
      const rc = this.rerolls > 0 ? '#8ef0ff' : '#555566';
      const bc = this.banishes > 0 ? '#ff8a30' : '#555566';
      drawPanel(ctx, W / 2 - 90, by, 80, 16, rc);
      textC(ctx, 'REROLL (R) ' + this.rerolls, W / 2 - 50, by + 11, rc, 7, true);
      drawPanel(ctx, W / 2 + 10, by, 80, 16, bc);
      textC(ctx, 'BANISH (B) ' + this.banishes, W / 2 + 50, by + 11, bc, 7, true);
    }
  }
}

let ID = 1;
function hashStr(s) {
  let h = 5381;
  for (let i = 0; i < s.length; i++) h = ((h << 5) + h) + s.charCodeAt(i);
  return h >>> 0;
}
