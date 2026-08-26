// ============================================================
// HELL TRAIN — Train entity (a second combat system)
// ============================================================
import { uid, rand, TAU, clamp, dist } from '../core/utils.js';
import { TRAIN_WEAPONS, TRAIN_ULTIMATES, findRealm } from '../data/realms.js';
import { PAL } from '../core/config.js';

export class Train {
  constructor(x, y, sprites, difficulty) {
    this.x = x; this.y = y; this.baseX = x; this.baseY = y;
    this.vx = 0; this.vy = 0;
    this.radius = 26;
    this.sprites = sprites;
    this.engineSprite = sprites.trainEngine;
    this.carSprite = sprites.trainCar;
    this.carOffset = { x: -64, y: 0 };
    this.engineOffset = { x: 0, y: 0 };

    this.maxHp = 800 * (difficulty?.trainHp || 1);
    this.hp = this.maxHp;
    this.armour = 6;
    this.energy = 100; this.maxEnergy = 100;
    this.weapons = ['fireball_cannon', 'phantom_satellites', 'lightning_tower'];
    this.weaponCds = {};
    for (const w of this.weapons) this.weaponCds[w] = 0;
    this.dmgMul = 1;
    this.ultimateId = 'hellfire_express';
    this.ultimateCd = 0; this.ultimateDur = 0; this.ultimateT = 0;
    this.invuln = 0;
    this.t = 0;
    this.wheelT = 0;
    this.steamT = 0;
    this.damaged = false;
  }

  takeDamage(dmg) {
    if (this.invuln > 0) return 0;
    let dealt = Math.max(0, dmg - this.armour);
    this.hp -= dealt;
    this.damaged = true;
    if (this.hp <= 0) { this.hp = 0; this.dead = true; }
    return dealt;
  }

  repair(amount) {
    this.hp = Math.min(this.maxHp, this.hp + amount);
  }

  update(dt, ctx) {
    this.t += dt;
    if (this.invuln > 0) this.invuln -= dt;
    this.wheelT = (this.wheelT + dt * 8) % 4;
    this.steamT += dt;
    if (this.ultimateDur > 0) {
      this.ultimateT -= dt;
      if (this.ultimateT <= 0) { this.ultimateDur = 0; }
    }
    for (const id of this.weapons) {
      this.weaponCds[id] = Math.max(0, this.weaponCds[id] - dt);
    }
    this.ultimateCd = Math.max(0, this.ultimateCd - dt);

    // Energy regen
    this.energy = Math.min(this.maxEnergy, this.energy + 8 * dt);

    // Follow player (gentle)
    const px = ctx.player.x, py = ctx.player.y;
    const d = dist(this.x, this.y, px, py);
    if (d > 80) {
      const ang = Math.atan2(py - this.y, px - this.x);
      this.vx = Math.cos(ang) * 60;
      this.vy = Math.sin(ang) * 60;
    } else {
      this.vx *= 0.9; this.vy *= 0.9;
    }
    this.x += this.vx * dt;
    this.y += this.vy * dt;

    // weapon fire
    for (const id of this.weapons) {
      const def = TRAIN_WEAPONS.find(w => w.id === id);
      if (!def) continue;
      if (this.weaponCds[id] > 0) continue;
      const finalDmg = def.dmg * this.dmgMul;
      if (id === 'fireball_cannon') {
        const targets = ctx.enemiesInRange(this.x, this.y, def.range);
        if (targets.length === 0) continue;
        targets.sort((a, b) => dist(this.x, this.y, a.x, a.y) - dist(this.x, this.y, b.x, b.y));
        const t = targets[0];
        const ang = Math.atan2(t.y - this.y, t.x - this.x);
        ctx.spawnProjectile({
          x: this.x, y: this.y, vx: Math.cos(ang) * 180, vy: Math.sin(ang) * 180,
          life: 1.6, dmg: finalDmg, pierce: 0, explode: true, explodeRadius: 18,
          color: '#ff5a33', sprite: 'orbFire', behavior: 'projectile', owner: 'train',
          size: 6, family: 'fire',
        });
        ctx.fx.burst(this.x, this.y, '#ff7a33', 4, { life: 0.25, spd: 80 });
        this.weaponCds[id] = def.cd;
      } else if (id === 'phantom_satellites') {
        // Emit periodically
        ctx.fx.burst(this.x + (Math.random() - 0.5) * 30, this.y + (Math.random() - 0.5) * 30,
          '#985ce0', 2, { life: 0.3, spd: 60 });
        this.weaponCds[id] = def.cd;
      } else if (id === 'lightning_tower') {
        const targets = ctx.enemiesInRange(this.x, this.y, def.range);
        if (targets.length === 0) continue;
        targets.sort((a, b) => dist(this.x, this.y, a.x, a.y) - dist(this.x, this.y, b.x, b.y));
        const t = targets[0];
        ctx.onHit(t, finalDmg, { family: 'lightning' });
        ctx.fx.lightning(this.x, this.y, t.x, t.y, '#fff066');
        ctx.fx.flash(t.x, t.y, '#fff066', 0.05);
        this.weaponCds[id] = def.cd;
      } else if (id === 'carriage_bombs') {
        const targets = ctx.enemiesInRange(this.x, this.y, def.range);
        if (targets.length === 0) continue;
        ctx.fx.burst(this.x, this.y, '#9b6dff', 10, { life: 0.4, spd: 100 });
        ctx.fx.shakeScreen(3, 0.15);
        for (const t of targets) ctx.onHit(t, finalDmg, { family: 'void' });
        this.weaponCds[id] = def.cd;
      } else if (id === 'flamethrower') {
        const ang = Math.atan2(py - this.y, px - this.x);
        ctx.spawnFlame(this.x, this.y, ang, def.range, finalDmg);
        this.weaponCds[id] = def.cd;
      } else if (id === 'gravity_engine') {
        for (const e of ctx.enemiesInRange(this.x, this.y, def.range)) {
          const a = Math.atan2(this.y - e.y, this.x - e.x);
          e.x += Math.cos(a) * 60 * dt;
          e.y += Math.sin(a) * 60 * dt;
        }
        this.weaponCds[id] = 0.1;
      } else if (id === 'train_ram') {
        // contact damage: handled separately; cooldown just gates it
        this.weaponCds[id] = def.cd;
      }
    }
  }

  activateUltimate(ctx) {
    if (this.energy < 50 || this.ultimateCd > 0) return false;
    this.energy -= 50;
    this.ultimateCd = 30;
    this.ultimateDur = 1;
    this.ultimateT = 6;
    const def = TRAIN_ULTIMATES.find(u => u.id === this.ultimateId);
    if (!def) return false;
    if (def.beam) {
      const ang = Math.atan2(ctx.player.y - this.y, ctx.player.x - this.x);
      const sx = Math.cos(ang), sy = Math.sin(ang);
      for (let i = 0; i < 200; i++) {
        const tx = this.x + sx * i * 4, ty = this.y + sy * i * 4;
        for (const e of ctx.enemiesInRange(tx, ty, 24)) ctx.onHit(e, def.dmg, { family: 'lightning' });
      }
      ctx.fx.shakeScreen(8, 0.5);
    } else if (def.pull) {
      const dts = 1; // pull for ~1 second burst
      for (const e of ctx.enemiesInRange(this.x, this.y, 220)) {
        const a = Math.atan2(this.y - e.y, this.x - e.x);
        e.x += Math.cos(a) * 80 * dts;
        e.y += Math.sin(a) * 80 * dts;
      }
    }
    ctx.fx.shakeScreen(6, 0.4);
    return true;
  }
}
