// ============================================================
// HELL TRAIN — Pickups (XP, shards, hearts, chests)
// ============================================================
import { uid, TAU, dist } from '../core/utils.js';
import { rand } from '../core/utils.js';

export class Pickup {
  constructor(type, x, y, amount = 1) {
    this.type = type; this.x = x; this.y = y; this.amount = amount;
    this.vy = -100; this.vx = (Math.random() - 0.5) * 60;
    this.t = 0; this.alive = true; this.magnetized = false; this._id = uid();
  }
  update(dt, ctx) {
    if (!this.alive) return;
    this.t += dt;
    if (!this.magnetized) {
      this.vy += 240 * dt; // gravity
      this.x += this.vx * dt; this.y += this.vy * dt;
      // Floor bounce
      if (this.vy > 0 && ctx.world.isSolidWorld(this.x, this.y)) {
        this.vy *= -0.4; this.vx *= 0.6;
        if (Math.abs(this.vy) < 8) this.vy = 0;
      }
    } else {
      // Pull to player
      const p = ctx.player;
      const dx = p.x - this.x, dy = p.y - this.y;
      const d = Math.hypot(dx, dy) + 0.01;
      const speed = 360;
      this.x += (dx / d) * speed * dt;
      this.y += (dy / d) * speed * dt;
    }
    // Magnet check
    const p = ctx.player;
    const d = dist(this.x, this.y, p.x, p.y);
    if (d < p.pickupRange) this.magnetized = true;
    // Pickup
    if (d < p.radius + 6) {
      this.onPickup(ctx);
      this.alive = false;
      ctx.fx.sparkle(this.x, this.y, this.color());
    }
    // Auto-despawn after long life
    if (this.t > 30) this.alive = false;
  }
  color() {
    switch (this.type) {
      case 'xp': return '#a8d4f4';
      case 'shard': return '#985ce0';
      case 'heart': return '#ff5a33';
      case 'chest': return '#ffe066';
    }
    return '#ffffff';
  }
  spriteName(sprites) {
    switch (this.type) {
      case 'xp': return 'gemXP';
      case 'shard': return 'gemShard';
      case 'heart': return 'gemHeart';
      case 'chest': return 'gemShard';
    }
    return null;
  }
  onPickup(ctx) {
    const p = ctx.player;
    if (this.type === 'xp') {
      const base = this.amount;
      const trainBoost = (ctx.train && dist(this.x, this.y, ctx.train.x, ctx.train.y) < 120) ? (p.trainXpBoost || 1) : 1;
      p.gainXp(base * trainBoost);
      p.score += 1;
    } else if (this.type === 'shard') {
      p.score += 25 * (p.eliteLoot || 1);
      ctx.gameStats.shards += this.amount;
    } else if (this.type === 'heart') {
      p.heal(this.amount);
      p.score += 5;
    } else if (this.type === 'chest') {
      ctx.openChest(this);
      p.score += 50;
    }
  }
}
