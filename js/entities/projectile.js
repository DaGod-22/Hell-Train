// ============================================================
// HELL TRAIN — Projectile entity
// ============================================================
import { uid, TAU, dist } from '../core/utils.js';

export class Projectile {
  constructor(opts) {
    Object.assign(this, opts);
    this.alive = true;
    this.t = 0;
    this.size = opts.size || 4;
    this.pierceLeft = opts.pierce || 0;
    this.hitIds = new Set();
  }
  update(dt, ctx) {
    if (!this.alive) return;
    this.t += dt;
    if (this.t > (this.life || 1.6)) { this.alive = false; return; }
    this.x += this.vx * dt;
    this.y += this.vy * dt;
    // Trail particle
    if (this.t < 0.05 || Math.random() < 0.5) {
      ctx.fx.spawn({
        x: this.x + (Math.random() - 0.5) * 2, y: this.y + (Math.random() - 0.5) * 2,
        vx: -this.vx * 0.1, vy: -this.vy * 0.1,
        color: this.color, life: 0.25, size: 1.5, drag: 0.85, fade: true,
      });
    }
    if (this.owner === 'enemy') {
      // collide with player
      const p = ctx.player;
      if (dist(this.x, this.y, p.x, p.y) < this.size + p.radius) {
        const dealt = p.takeDamage(this.dmg);
        if (dealt > 0) {
          ctx.fx.flash(p.x, p.y, this.color, 0.05);
          ctx.fx.damageText(p.x, p.y - 14, '-' + dealt.toFixed(0), this.color);
        }
        this.alive = false;
      }
    } else {
      // collide with enemies
      for (const e of ctx.enemies) {
        if (!e.alive) continue;
        if (this.hitIds.has(e._id)) continue;
        if (dist(this.x, this.y, e.x, e.y) < this.size + e.radius) {
          this.hitIds.add(e._id);
          const isCrit = Math.random() < ctx.player.crit;
          let dmg = this.dmg * (isCrit ? ctx.player.critDmg : 1);
          if (ctx.player.eclipse) dmg *= 1 + (1 - ctx.player.hp / ctx.player.maxHp);
          if (ctx.player.execute && e.hp < e.maxHp * 0.25) dmg *= 2;
          e.takeDamage(dmg, { family: this.family, burn: ctx.player.burnDmg,
            slow: this.slow, slowDur: this.slowDur, frozenHeart: ctx.player.frozenHeart });
          ctx.fx.flash(e.x, e.y, this.color, 0.05);
          ctx.fx.damageText(e.x, e.y - 12, '-' + dmg.toFixed(0), isCrit ? '#fff066' : '#ffffff');
          if (this.family === 'fire' || this.family === 'void') ctx.fx.fire(e.x, e.y, this.color);
          if (ctx.player.lifesteal > 0) ctx.player.heal(dmg * ctx.player.lifesteal);
          ctx.player.kills += 0; // xp granted on death
          if (this.pierceLeft <= 0) {
            this.alive = false;
            if (this.explode) {
              ctx.spawnExplosion(this.x, this.y, this.explodeRadius, this.dmg * 0.6, this.family);
            }
            break;
          } else {
            this.pierceLeft -= 1;
          }
        }
      }
      // collide with train (for enemy projectiles) — handled in enemy shot update
    }
    // collide with walls -> kill
    if (ctx.world.isSolidWorld(this.x, this.y)) {
      this.alive = false;
      if (this.explode) ctx.spawnExplosion(this.x, this.y, this.explodeRadius, this.dmg * 0.6, this.family);
    }
  }
}

export class Meteor {
  constructor(x, y, target, dmg, radius) {
    this.x = x; this.y = y; this.tx = target.x; this.ty = target.y;
    this.startX = x; this.startY = y - 600;
    this.dmg = dmg; this.radius = radius;
    this.t = 0; this.dur = 0.5; this.alive = true; this.landed = false;
    this._id = uid();
  }
  update(dt, ctx) {
    this.t += dt;
    const t = Math.min(1, this.t / this.dur);
    this.x = this.startX + (this.tx - this.startX) * t;
    this.y = this.startY + (this.ty - this.startY) * t;
    // Trail
    if (Math.random() < 0.5) {
      ctx.fx.fire(this.x, this.y + 4, '#ff7a33');
      ctx.fx.embers(this.x + (Math.random() - 0.5) * 4, this.y + 4, '#ffd260');
    }
    if (t >= 1 && !this.landed) {
      this.landed = true; this.alive = false;
      ctx.spawnExplosion(this.tx, this.ty, this.radius, this.dmg, 'fire');
      ctx.fx.shakeScreen(7, 0.3);
    }
  }
}

export class Flame {
  constructor(x, y, ang, range, dmg) {
    this.x = x; this.y = y; this.ang = ang; this.range = range; this.dmg = dmg;
    this.t = 0; this.dur = 0.4; this.alive = true; this._id = uid();
  }
  update(dt, ctx) {
    this.t += dt;
    if (this.t >= this.dur) { this.alive = false; return; }
    const len = this.range;
    for (let i = 0; i < 6; i++) {
      const r = (i / 6) * len;
      const ox = this.x + Math.cos(this.ang) * r + (Math.random() - 0.5) * 8;
      const oy = this.y + Math.sin(this.ang) * r + (Math.random() - 0.5) * 8;
      ctx.fx.fire(ox, oy, '#ff7a33');
      // damage
      const rate = 0.02;
      if (Math.random() < rate) {
        for (const e of ctx.enemies) {
          if (!e.alive) continue;
          if (dist(ox, oy, e.x, e.y) < 12) e.takeDamage(this.dmg * dt, { family: 'fire' });
        }
      }
    }
  }
}
