// ============================================================
// HELL TRAIN — visual effects & particle system
// ============================================================
import { uid, rand, randInt } from '../core/utils.js';
import { PAL } from '../core/config.js';

// A pool-based particle system to keep allocation down under load
export class FXSystem {
  constructor(maxParticles = 2000) {
    this.list = [];
    this.max = maxParticles;
    this.shake = 0; // pixels
    this.shakeT = 0;
    this.flashes = []; // brief full-screen color flashes
    this.texts = [];   // damage numbers, floating text
  }
  update(dt) {
    for (let i = this.list.length - 1; i >= 0; i--) {
      const p = this.list[i];
      p.t -= dt;
      if (p.t <= 0) { this.list.splice(i, 1); continue; }
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      if (p.gravity) p.vy += p.gravity * dt;
      if (p.drag) { p.vx *= p.drag; p.vy *= p.drag; }
      if (p.fade) p.alpha = Math.max(0, p.t / p.life);
    }
    for (let i = this.texts.length - 1; i >= 0; i--) {
      const t = this.texts[i];
      t.t -= dt;
      t.y += t.vy * dt;
      if (t.t <= 0) this.texts.splice(i, 1);
    }
    if (this.shakeT > 0) {
      this.shakeT -= dt;
      this.shake = Math.max(0, this.shakeT / 0.25) * 6;
    } else this.shake = 0;
    for (let i = this.flashes.length - 1; i >= 0; i--) {
      this.flashes[i].t -= dt;
      if (this.flashes[i].t <= 0) this.flashes.splice(i, 1);
    }
  }
  spawn(opts) {
    if (this.list.length >= this.max) return;
    const p = {
      x: opts.x || 0, y: opts.y || 0,
      vx: opts.vx || 0, vy: opts.vy || 0,
      life: opts.life || 0.4, t: opts.life || 0.4,
      color: opts.color || '#ffffff',
      size: opts.size || 1.5,
      gravity: opts.gravity || 0,
      drag: opts.drag || 0.95,
      fade: opts.fade !== false,
      alpha: 1,
      kind: opts.kind || 'spark',
      sprite: opts.sprite || null,
      rot: opts.rot || 0,
      rotSpd: opts.rotSpd || 0,
      shape: opts.shape || null, // when kind==='shape'
      ttl: opts.ttl || null,
      glow: !!opts.glow,
    };
    this.list.push(p);
  }
  burst(x, y, color, count = 10, opts = {}) {
    const spd = opts.spd || 80;
    const life = opts.life || 0.4;
    const size = opts.size || 2;
    for (let i = 0; i < count; i++) {
      const a = Math.random() * Math.PI * 2;
      const s = spd * (0.4 + Math.random() * 0.7);
      this.spawn({ x, y, vx: Math.cos(a) * s, vy: Math.sin(a) * s, color, life, size,
        gravity: opts.gravity || 0, drag: 0.9 });
    }
  }
  // Burn sparks
  fire(x, y, color = '#ff7a33') {
    for (let i = 0; i < 4; i++) {
      this.spawn({ x: x + (Math.random() - 0.5) * 6, y, vx: (Math.random() - 0.5) * 30,
        vy: -20 - Math.random() * 50, color, life: 0.5 + Math.random() * 0.4,
        size: 1.5 + Math.random(), gravity: 60, fade: true });
    }
  }
  // Smoke puff
  smoke(x, y, color = '#888') {
    for (let i = 0; i < 5; i++) {
      this.spawn({ x: x + (Math.random() - 0.5) * 4, y: y + (Math.random() - 0.5) * 4,
        vx: (Math.random() - 0.5) * 20, vy: -10 - Math.random() * 25, color,
        life: 0.8 + Math.random() * 0.5, size: 3 + Math.random() * 2, drag: 0.92, fade: true });
    }
  }
  // Embers (like fire but slower)
  embers(x, y, color = '#ffb040') {
    for (let i = 0; i < 3; i++) {
      this.spawn({ x: x + (Math.random() - 0.5) * 8, y, vx: (Math.random() - 0.5) * 30,
        vy: -10 - Math.random() * 30, color, life: 1.0 + Math.random() * 0.5,
        size: 1 + Math.random(), gravity: 10, fade: true });
    }
  }
  // Snow / ash falling
  dust(x, y, color = '#cfd4e0') {
    for (let i = 0; i < 2; i++) {
      this.spawn({ x: x + (Math.random() - 0.5) * 12, y: y + (Math.random() - 0.5) * 12,
        vx: (Math.random() - 0.5) * 20, vy: 20 + Math.random() * 30, color,
        life: 1.4 + Math.random() * 0.5, size: 1 + Math.random(), fade: true });
    }
  }
  // Sparkle (XP pickup)
  sparkle(x, y, color = '#a8d4f4') {
    for (let i = 0; i < 4; i++) {
      const a = (i / 4) * Math.PI * 2;
      this.spawn({ x, y, vx: Math.cos(a) * 30, vy: Math.sin(a) * 30 - 10, color,
        life: 0.4, size: 1.5, drag: 0.9, fade: true });
    }
  }
  // Lightning bolt from origin to target (line of fading pixels)
  lightning(x1, y1, x2, y2, color = '#fff066', segs = 6, life = 0.18) {
    let px = x1, py = y1;
    for (let i = 1; i <= segs; i++) {
      const t = i / segs;
      let nx = x1 + (x2 - x1) * t, ny = y1 + (y2 - y1) * t;
      if (i < segs) { nx += (Math.random() - 0.5) * 18; ny += (Math.random() - 0.5) * 18; }
      const dx = nx - px, dy = ny - py;
      const d = Math.hypot(dx, dy);
      this.spawn({ x: nx, y: ny, vx: 0, vy: 0, color, life, size: 2.5, drag: 1, fade: true,
        glow: true });
      px = nx; py = ny;
    }
    // flash + branches
    this.flash(x2, y2, color, 0.08);
  }
  flash(x, y, color = '#ffffff', life = 0.1) {
    this.flashes.push({ x, y, color, life, t: life });
  }
  shakeScreen(amount = 6, time = 0.25) {
    this.shake = amount;
    this.shakeT = time;
  }
  damageText(x, y, text, color = '#ffffff') {
    this.texts.push({ x, y, vy: -30, t: 1.0, life: 1.0, text, color, alpha: 1 });
  }
  draw(ctx, camera) {
    // We draw in world-space already (camera applied outside)
    for (const p of this.list) {
      if (p.alpha <= 0) continue;
      ctx.globalAlpha = p.alpha;
      if (p.glow) {
        // glow halo
        ctx.fillStyle = p.color;
        ctx.globalAlpha = p.alpha * 0.35;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size * 2.5, 0, Math.PI * 2);
        ctx.fill();
        ctx.globalAlpha = p.alpha;
      }
      ctx.fillStyle = p.color;
      const s = Math.max(1, Math.round(p.size));
      ctx.fillRect(Math.round(p.x - s / 2), Math.round(p.y - s / 2), s, s);
    }
    ctx.globalAlpha = 1;
    for (const t of this.texts) {
      const a = Math.max(0, t.t / t.life);
      ctx.globalAlpha = a;
      ctx.font = 'bold 8px monospace';
      ctx.fillStyle = '#000000';
      ctx.fillText(t.text, Math.round(t.x) + 1, Math.round(t.y) + 1);
      ctx.fillStyle = t.color;
      ctx.fillText(t.text, Math.round(t.x), Math.round(t.y));
    }
    ctx.globalAlpha = 1;
  }
}

// Camera helper
export class Camera {
  constructor(w, h) { this.x = 0; this.y = 0; this.w = w; this.h = h; this.zoom = 2; this.shake = 0; }
  follow(x, y, dt) {
    this.x += (x - this.x) * Math.min(1, dt * 8);
    this.y += (y - this.y) * Math.min(1, dt * 8);
  }
  apply(ctx) {
    ctx.translate(this.w / 2 - this.x * this.zoom + this.shake * (Math.random() - 0.5) * 2,
                  this.h / 2 - this.y * this.zoom + this.shake * (Math.random() - 0.5) * 2);
    ctx.scale(this.zoom, this.zoom);
  }
}
