// ============================================================
// HELL TRAIN — Player entity
// ============================================================
import { WEAPONS, ABILITIES, findWeapon } from '../data/weapons.js';
import { uid, rand, randInt, clamp, dist, TAU, easeOutCubic } from '../core/utils.js';
import { PAL } from '../core/config.js';

export class Player {
  constructor(x, y, sprites, save) {
    this.x = x; this.y = y; this.vx = 0; this.vy = 0;
    this.r = 7; this.radius = 7;
    this.facing = 'down';
    this.frame = 0; this.frameT = 0; this.atkTimer = 0;
    this.sprites = sprites;
    this.animAtk = 0;
    this.alive = true;
    this.invuln = 0;
    // stats
    this.baseHp = 100; this.maxHp = 100; this.hp = 100;
    this.armour = 0;
    this.atkDmg = 1.0; this.atkSpd = 1.0; this.moveSpd = 1.0;
    this.crit = 0.05; this.critDmg = 1.5;
    this.cdr = 1.0;
    this.pickupRange = 60;
    this.regen = 0;
    this.dodge = 0;
    this.lifesteal = 0;
    this.burnDmg = 0; this.burnDur = 0;
    this.pierceBonus = 0;
    this.chain = 0;
    this.shield = 0; this.shieldTimer = 0;
    this.eclipse = false; this.execute = false;
    this.revive = 0; this.usedRevive = false;
    this.trainRepairRate = 0;
    this.frozenHeart = false; this.soulUrn = false;
    this.revealMap = false; this.revealBoss = false;
    this.eliteLoot = 1;
    this.permaMults = { atkDmg: 1, atkSpd: 1, moveSpd: 1, critDmg: 1, xpGain: 1, wpnDmg: 1 };
    this.permaMaxHp = 0; this.permaArmour = 0;
    // weapons
    this.weapons = [];
    this.weaponStates = {};
    this.abilities = [ABILITIES[0]]; // start with Phase Dodge
    this.abilityStates = {};
    // visuals
    this.armourId = save?.currentArmour || 'guardian';
    this.animDeath = 0;
    this.t = 0;
    // apply permanent bonuses from save
    if (save) this.applyPerma(save);
    this._applyArmour();
    // start with a base weapon
    this.addWeapon('fireball');
    this.addWeapon('orbital_blades');
    // init weapon states
    for (const w of this.weapons) this.weaponStates[w.id] = { cd: 0, level: 1, baseCount: w.baseCount };
    for (const a of this.abilities) this.abilityStates[a.id] = { cd: 0 };
    this.kills = 0;
    this.xp = 0;
    this.level = 1;
    this.score = 0;
  }

  applyPerma(save) {
    if (!save?.perma?.player) return;
    // Permanent bonuses are applied at game start by the GameplayScene
    // after constructing the player (see _build()).
  }

  modMult(key, mult) {
    if (key === 'atkDmg') this.atkDmg *= mult;
    else if (key === 'atkSpd') this.atkSpd *= mult;
    else if (key === 'moveSpd') this.moveSpd *= mult;
    else if (key === 'critDmg') this.critDmg *= mult;
    else if (key === 'cdr') this.cdr *= mult;
    else if (key === 'pickupRange') this.pickupRange *= mult;
    else if (key === 'pierce') this.pierceBonus += 1;
    else if (key === 'trainDmg') this._trainDmg = (this._trainDmg || 1) * mult;
    else if (key === 'visibility') this._visibility = (this._visibility || 1) * mult;
    else if (key === 'xpGain') this._xpGain = (this._xpGain || 1) * mult;
    else if (key === 'wpnDmg') this.atkDmg *= mult;
  }
  permaMult(key, mult) { this.modMult(key, mult); }

  _applyArmour() {
    // Each armour set is applied once via the registry; here we only set sprite
    const map = { guardian: 'playerArmour', phantom: 'playerDown', infernal: 'playerDown',
      void: 'playerArmour', conductor: 'playerArmour' };
    this.spriteName = map[this.armourId] || 'playerDown';
  }

  hasWeapon(id) { return this.weapons.some(w => w.id === id); }
  addWeapon(id) {
    if (this.hasWeapon(id)) return;
    const w = JSON.parse(JSON.stringify(findWeapon(id)));
    if (!w) return;
    this.weapons.push(w);
    this.weaponStates[id] = { cd: 0, level: 1, baseCount: w.baseCount || 1 };
  }
  addAbility(id) {
    if (this.abilities.some(a => a.id === id)) return;
    const a = ABILITIES.find(x => x.id === id);
    if (!a) return;
    this.abilities.push(JSON.parse(JSON.stringify(a)));
    this.abilityStates[id] = { cd: 0 };
  }
  upgradeWeapon(id) {
    const w = this.weapons.find(w => w.id === id);
    if (!w) return;
    const s = this.weaponStates[id];
    s.level += 1;
    const updates = w.curve(s.level);
    Object.assign(w, updates);
    if (updates.baseCount !== undefined) s.baseCount = updates.baseCount;
  }
  modWeapon(id, key, val) {
    const w = this.weapons.find(w => w.id === id);
    if (!w) return;
    if (typeof val === 'number' && Math.abs(val) < 3) {
      if (typeof w[key] === 'number') w[key] = Math.floor(w[key] * val);
      else w[key] = (w[key] || 0) + val;
    } else if (typeof val === 'number') {
      w[key] = (w[key] || 0) + val;
    } else {
      w[key] = val;
    }
  }

  // Returns xp needed for next level
  xpNeeded() { return Math.floor(8 + this.level * 4 + Math.pow(this.level, 1.4)); }
  gainXp(amount) {
    this.xp += amount * (this._xpGain || 1);
    while (this.xp >= this.xpNeeded()) {
      this.xp -= this.xpNeeded();
      this.level += 1;
      this.onLevelUp?.();
    }
  }

  takeDamage(dmg) {
    if (this.invuln > 0 || !this.alive) return 0;
    // dodge
    if (this.dodge > 0 && Math.random() < this.dodge) return 0;
    let dealt = Math.max(0, dmg - this.armour);
    if (this.shield > 0) {
      const absorbed = Math.min(this.shield, dealt);
      this.shield -= absorbed;
      dealt -= absorbed;
    }
    this.hp -= dealt;
    if (this.hp <= 0) {
      if (this.revive > 0 && !this.usedRevive) {
        this.usedRevive = true; this.revive -= 1;
        this.hp = this.maxHp * 0.5;
        this.invuln = 1.5;
        return dealt;
      }
      this.alive = false;
      this.animDeath = 1;
    } else {
      this.invuln = 0.4;
    }
    return dealt;
  }

  heal(amount) {
    this.hp = Math.min(this.maxHp, this.hp + amount);
  }

  update(dt, ctx) {
    this.t += dt;
    if (this.invuln > 0) this.invuln -= dt;
    if (this.regen) this.hp = Math.min(this.maxHp, this.hp + this.regen * dt);
    if (this.shieldTimer !== undefined) {
      this.shieldTimer -= dt;
      if (this.shieldTimer <= 0) { this.shieldTimer = 8; this.shield = (this.shield || 0) + 30; }
    }
    // animation
    const moving = Math.hypot(this.vx, this.vy) > 0.1;
    if (moving) this.frameT += dt * (this.moveSpd * 6);
    if (this.frameT >= 0.18) { this.frameT = 0; this.frame = (this.frame + 1) % 4; }
    if (this.animAtk > 0) this.animAtk = Math.max(0, this.animAtk - dt);
    if (this.animDeath > 0) this.animDeath = Math.max(0, this.animDeath - dt * 2);
  }

  // Choose a sprite based on facing and animation
  pickSprite() {
    if (this.animAtk > 0) return this.sprites.playerAttack;
    const walk = this.frame === 1 || this.frame === 3 ? 'Walk' : '';
    if (this.facing === 'up') return this.sprites['playerUp' + walk];
    if (this.facing === 'left' || this.facing === 'right') return this.sprites.playerSide;
    return this.sprites['playerDown' + walk];
  }

  // Auto-attack: finds nearest enemy in range and fires appropriate weapon
  autoAttack(dt, ctx) {
    const enemy = ctx.findNearestEnemy(this.x, this.y, 200);
    for (const w of this.weapons) {
      const s = this.weaponStates[w.id];
      s.cd -= dt * this.atkSpd * this.cdr;
      if (s.cd > 0) continue;
      if (enemy && dist(this.x, this.y, enemy.x, enemy.y) > 280) continue;
      s.cd = w.cd;
      const lvl = s.level;
      const dmg = w.dmg * this.atkDmg;
      if (w.behavior === 'fireball' || w.behavior === 'projectile' || w.behavior === 'lob') {
        const count = w.projCount || 1;
        const spread = w.spread || 0.12;
        for (let i = 0; i < count; i++) {
          const baseAng = enemy ? Math.atan2(enemy.y - this.y, enemy.x - this.x) : Math.random() * TAU;
          const ang = baseAng + (i - (count - 1) / 2) * spread;
          ctx.spawnProjectile({
            x: this.x, y: this.y, vx: Math.cos(ang) * w.speed, vy: Math.sin(ang) * w.speed,
            life: w.projLife, dmg, pierce: w.pierce + this.pierceBonus, explode: w.explode,
            explodeRadius: w.explodeRadius, color: w.color, sprite: w.sprite,
            behavior: w.behavior, owner: 'player', size: w.projSize, burn: w.burn,
            family: w.family,
          });
        }
        this.animAtk = 0.12;
      } else if (w.behavior === 'orbital') {
        // Orbitals are persistent — instantiated once; this just levels up the count
        // handled elsewhere
      } else if (w.behavior === 'lightning') {
        // Chain lightning: find a starting enemy and chain
        const start = enemy || ctx.findNearestEnemy(this.x, this.y, 300);
        if (!start) continue;
        const jumps = w.jumps || 3;
        let last = { x: this.x, y: this.y };
        let prev = null;
        for (let j = 0; j < jumps; j++) {
          // pick nearest not prev
          const targets = ctx.enemiesInRange(last.x, last.y, 220)
            .filter(e => e !== prev && e.alive).slice(0, 5);
          if (targets.length === 0) break;
          targets.sort((a, b) => dist(last.x, last.y, a.x, a.y) - dist(last.x, last.y, b.x, b.y));
          const t = targets[0];
          const isCrit = Math.random() < this.crit;
          const final = dmg * (isCrit ? this.critDmg : 1);
          ctx.onHit(t, final, { family: 'lightning' });
          ctx.fx.lightning(last.x, last.y, t.x, t.y, '#fff066');
          ctx.fx.flash(t.x, t.y, '#fff066', 0.05);
          prev = t; last = { x: t.x, y: t.y };
        }
      } else if (w.behavior === 'frost') {
        const ang = enemy ? Math.atan2(enemy.y - this.y, enemy.x - this.x) : Math.random() * TAU;
        ctx.spawnProjectile({
          x: this.x, y: this.y, vx: Math.cos(ang) * w.speed, vy: Math.sin(ang) * w.speed,
          life: w.projLife, dmg, pierce: w.pierce, color: w.color, sprite: w.sprite,
          behavior: 'projectile', owner: 'player', size: w.projSize,
          slow: w.slow, slowDur: w.slowDur, family: w.family,
        });
        this.animAtk = 0.12;
      } else if (w.behavior === 'meteor') {
        const target = enemy || ctx.findNearestEnemy(this.x, this.y, 400);
        if (!target) continue;
        ctx.spawnMeteor(target.x, target.y, dmg, w.explodeRadius);
      } else if (w.behavior === 'teleport') {
        const ang = Math.random() * TAU;
        const distT = 90 + Math.random() * 60;
        const nx = this.x + Math.cos(ang) * distT, ny = this.y + Math.sin(ang) * distT;
        // trail effect
        ctx.fx.burst(this.x, this.y, '#9b6dff', 14, { life: 0.4, size: 2, spd: 120 });
        this.x = nx; this.y = ny;
        ctx.fx.burst(nx, ny, '#9b6dff', 14, { life: 0.4, size: 2, spd: 120 });
        // damage at both
        for (const e of ctx.enemiesInRange(nx, ny, w.explodeRadius)) {
          ctx.onHit(e, dmg * 0.7, { family: 'void' });
        }
      }
    }
  }
}
