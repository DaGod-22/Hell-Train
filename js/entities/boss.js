// ============================================================
// HELL TRAIN — Boss entities with phase logic
// ============================================================
import { uid, rand, randInt, clamp, dist, TAU, easeOutCubic } from '../core/utils.js';
import { BOSS_DEFS, findRealm } from '../data/realms.js';

export class Boss {
  constructor(id, x, y, realmId, difficulty, sprites) {
    const def = BOSS_DEFS[id];
    this.id = id;
    this.name = def.name;
    this.realmId = realmId;
    this.difficulty = difficulty;
    this.sprites = sprites;
    this.spriteName = def.sprite;
    this.radius = def.radius;
    this.color = def.color;
    this.maxHp = def.hp * (difficulty.enemyHp || 1);
    this.hp = this.maxHp;
    this.x = x; this.y = y; this.vx = 0; this.vy = 0;
    this.alive = true;
    this.t = 0;
    this.phase = 1;
    this.phases = def.phases;
    this.flashT = 0;
    this.attackCd = 0;
    this.specialCd = 4;
    this.moveDir = 0;
    this.aiT = 0;
    this.deathT = 0;
    this.scale = 1;
    this.xpReward = 200;
    this.drops = [];
    this._introT = 1.4; // intro animation duration
    this._id = uid();
    this.attacks = this._setupAttacks();
    this.attackIndex = 0;
    this.spawnAddsAt = { 0.6: false, 0.3: false };
  }

  _setupAttacks() {
    const a = [];
    // Common patterns, vary by boss
    a.push({ id: 'slam', dur: 1.2, cd: () => 4 - this.phase * 0.3 });
    a.push({ id: 'projectiles', dur: 1.6, cd: () => 3 });
    a.push({ id: 'dash', dur: 0.8, cd: () => 5 });
    a.push({ id: 'special', dur: 1.0, cd: () => 6 });
    return a;
  }

  update(dt, ctx) {
    this.t += dt;
    if (this._introT > 0) {
      this._introT -= dt;
      ctx.fx.flash(this.x, this.y, '#ffffff', 0.1);
      return;
    }
    if (!this.alive) {
      this.deathT -= dt;
      return;
    }
    if (this.flashT > 0) this.flashT -= dt;
    // Phase transitions
    const hpPct = this.hp / this.maxHp;
    const target = Math.min(this.phases, Math.floor((1 - hpPct) * this.phases) + 1);
    if (target > this.phase) {
      this.phase = target;
      ctx.fx.shakeScreen(8, 0.5);
      ctx.fx.flash(this.x, this.y, '#fff0a0', 0.4);
      ctx.fx.burst(this.x, this.y, this.color, 40, { life: 0.7, spd: 200 });
      ctx.gameStats.phaseChanges = (ctx.gameStats.phaseChanges || 0) + 1;
    }
    // Attack cycle
    this.attackCd -= dt;
    if (this.attackCd <= 0) {
      const att = this.attacks[this.attackIndex % this.attacks.length];
      this.attackIndex += 1;
      this.attackCd = att.cd();
      this._performAttack(att.id, ctx);
    }
    // Move (varies per boss id)
    this._moveAI(dt, ctx);

    // Contact damage
    const p = ctx.player;
    if (dist(this.x, this.y, p.x, p.y) < this.radius + p.radius) {
      const dealt = p.takeDamage((this.dmg || 20) * dt * 2.2, ctx, this);
      if (dealt > 0) ctx.onPlayerHit(dealt, this.color);
    }

    // Special adds at HP thresholds (used by some bosses)
    if (this.id === 'boss_summoner' || this.id === 'boss_null') {
      if (!this.spawnAddsAt[0.6] && hpPct < 0.6) {
        this.spawnAddsAt[0.6] = true;
        for (let i = 0; i < 6; i++) {
          const ang = (i / 6) * TAU;
          ctx.spawnEnemy('wraithling', this.x + Math.cos(ang) * 60, this.y + Math.sin(ang) * 60);
        }
      }
      if (!this.spawnAddsAt[0.3] && hpPct < 0.3) {
        this.spawnAddsAt[0.3] = true;
        for (let i = 0; i < 6; i++) {
          const ang = (i / 6) * TAU;
          ctx.spawnEnemy('void_sentinel', this.x + Math.cos(ang) * 60, this.y + Math.sin(ang) * 60);
        }
      }
    }
  }

  _moveAI(dt, ctx) {
    const p = ctx.player;
    const d = dist(this.x, this.y, p.x, p.y);
    const ang = Math.atan2(p.y - this.y, p.x - this.x);
    let spd = 50 + this.phase * 12;
    if (d < 90) spd *= 0.3;
    this.vx = Math.cos(ang) * spd;
    this.vy = Math.sin(ang) * spd;
    if (this.id === 'boss_bell') {
      // slow drift
      this.vx *= 0.4; this.vy *= 0.4;
    }
    if (this.id === 'boss_root') {
      // stationary treant
      this.vx *= 0.2; this.vy *= 0.2;
    }
    this.x += this.vx * dt;
    this.y += this.vy * dt;
  }

  _performAttack(id, ctx) {
    const p = ctx.player;
    if (id === 'slam') {
      ctx.fx.shakeScreen(5, 0.2);
      ctx.fx.burst(this.x, this.y, this.color, 24, { life: 0.5, spd: 140, size: 2 });
      // AOE ring
      if (dist(this.x, this.y, p.x, p.y) < 80) { const d = p.takeDamage(15 * this.phase, ctx, this); if (d > 0) ctx.onPlayerHit(d, this.color); }
    } else if (id === 'projectiles') {
      const count = 6 + this.phase * 2;
      const ang0 = Math.atan2(p.y - this.y, p.x - this.x);
      for (let i = 0; i < count; i++) {
        const ang = ang0 + (i - count / 2) * 0.15;
        ctx.spawnProjectile({
          x: this.x, y: this.y, vx: Math.cos(ang) * 110, vy: Math.sin(ang) * 110,
          life: 2.4, dmg: 12 * this.phase, color: this.color, owner: 'enemy', size: 5,
          family: this.realmId === 'void' ? 'void' : this.realmId === 'frozen' ? 'ice' : 'fire',
        });
      }
    } else if (id === 'dash') {
      const ang = Math.atan2(p.y - this.y, p.x - this.x);
      this.vx = Math.cos(ang) * 360;
      this.vy = Math.sin(ang) * 360;
      ctx.fx.shakeScreen(4, 0.2);
    } else if (id === 'special') {
      // Realm-specific specials
      if (this.realmId === 'frozen') {
        // Frost nova
        ctx.fx.burst(this.x, this.y, '#a8d4f4', 32, { life: 0.6, spd: 200 });
        { const d = p.takeDamage(10 * this.phase, ctx, this); if (d > 0) ctx.onPlayerHit(d, '#a8d4f4'); }
      } else if (this.realmId === 'infernal') {
        // Meteor shower
        for (let i = 0; i < 5; i++) {
          const tx = p.x + (Math.random() - 0.5) * 100;
          const ty = p.y + (Math.random() - 0.5) * 100;
          ctx.spawnMeteor(tx, ty, 14 * this.phase, 40);
        }
      } else if (this.realmId === 'desert') {
        // Sandstorm pull
        for (let i = 0; i < 60; i++) {
          const a = Math.random() * TAU;
          ctx.fx.dust(this.x + Math.cos(a) * 100, this.y + Math.sin(a) * 100, '#d4a04a');
        }
        for (const e of ctx.enemiesInRange(this.x, this.y, 220)) {
          const a = Math.atan2(this.y - e.y, this.x - e.x);
          e.x += Math.cos(a) * 30; e.y += Math.sin(a) * 30;
        }
      } else if (this.realmId === 'void') {
        // Reality shift
        ctx.fx.flash(p.x, p.y, '#985ce0', 0.6);
        ctx.fx.burst(this.x, this.y, '#985ce0', 40, { life: 1.0, spd: 250 });
        { const d = p.takeDamage(8 * this.phase, ctx, this); if (d > 0) ctx.onPlayerHit(d, this.color); }
      } else if (this.realmId === 'terminus') {
        // Train echo ram
        ctx.fx.shakeScreen(6, 0.4);
        for (let i = 0; i < 6; i++) {
          const ang = (i / 6) * TAU;
          ctx.spawnProjectile({
            x: this.x, y: this.y, vx: Math.cos(ang) * 140, vy: Math.sin(ang) * 140,
            life: 2.0, dmg: 10 * this.phase, color: '#9a8aa0', owner: 'enemy', size: 5, family: 'train',
          });
        }
      } else {
        // generic
        ctx.fx.burst(this.x, this.y, this.color, 16, { life: 0.5, spd: 160 });
      }
    }
  }

  takeDamage(amount, opts = {}) {
    if (!this.alive) return 0;
    const dealt = Math.min(this.hp, amount);
    this.hp -= amount;
    this.flashT = 0.1;
    if (opts.burn) { this.burnT = opts.burnDur || 3; this.burnDps = Math.max(this.burnDps || 0, opts.burn); }
    if (this.hp <= 0) {
      this.hp = 0;
      this.alive = false;
      this.deathT = 1.2;
    }
    return dealt;
  }
}
