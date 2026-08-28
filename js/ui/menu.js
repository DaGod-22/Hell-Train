// ============================================================
// HELL TRAIN — UI scenes: menu, world map, train base, summary,
// pause, leaderboard, daily run, weekly, achievements, settings.
// All UI is drawn directly to the low-res canvas for crisp pixels.
// ============================================================
import { CFG, PAL, FONT } from '../core/config.js';
import { findAscension } from '../data/upgrades.js';
import { drawSprite, spriteCanvas } from '../core/sprite.js';
import { RNG, dist, TAU, easeOutCubic, fmtTime, fmtNum, easeOutBack } from '../core/utils.js';
import { REALMS, HIDDEN_REALM, BOSS_DEFS, ACHIEVEMENTS, WEEKLY_CHALLENGES, ARMOURS, RELICS, LORE, UPGRADES, EVENTS, findRealm, findDifficulty } from '../data/realms.js';
import { WEAPONS, findWeapon } from '../data/weapons.js';

let _sharedUi = null;
export function setSharedUI(ui) { _sharedUi = ui; }

// UI primitives
class Button {
  constructor(label, x, y, w, h, color = '#985ce0') {
    this.label = label; this.x = x; this.y = y; this.w = w; this.h = h; this.color = color;
    this.hover = false; this.pressed = false;
  }
  draw(ctx, font) {
    ctx.fillStyle = this.pressed ? '#3a2a4a' : this.hover ? '#2a1a3a' : '#1a1026';
    ctx.fillRect(this.x, this.y, this.w, this.h);
    ctx.strokeStyle = this.color; ctx.lineWidth = 2;
    ctx.strokeRect(this.x + 1, this.y + 1, this.w - 2, this.h - 2);
    ctx.fillStyle = '#fff'; ctx.font = font || 'bold 9px monospace';
    const tw = ctx.measureText(this.label).width;
    ctx.fillText(this.label, this.x + (this.w - tw) / 2, this.y + this.h / 2 + 3);
  }
  hit(mx, my) { return mx >= this.x && mx <= this.x + this.w && my >= this.y && my <= this.y + this.h; }
}

function drawBigTitle(ctx, text, x, y, scale = 1) {
  ctx.font = 'bold ' + (24 * scale) + 'px monospace';
  ctx.textAlign = 'center';
  // shadow
  ctx.fillStyle = '#000';
  ctx.fillText(text, x + 2, y + 2);
  // outer
  ctx.fillStyle = '#985ce0';
  ctx.fillText(text, x, y - 2);
  // inner
  ctx.fillStyle = '#ffe066';
  ctx.fillText(text, x, y);
  ctx.textAlign = 'left';
}

// Pull the player's currently-equipped animated train from the Art Forge.
function trainSet(engine) {
  try { return engine.sprites?.getTrainSet?.(engine.save?.trainSkin || 'iron_horse') || null; }
  catch { return null; }
}
function trainFrame(engine, t, which = 'engine') {
  const set = trainSet(engine);
  if (!set) return null;
  const arr = set[which] || set.engine;
  return arr[Math.floor(t * 8) % arr.length];
}
function projFrame(engine, key, t) {
  const a = engine.sprites?.anim?.[key];
  if (Array.isArray(a)) return a[Math.floor(t * 10) % a.length];
  return engine.sprites?.[key] || null;
}

// =====================================================================
// MENU SCENE
// =====================================================================
export class MenuScene {
  constructor(ctx) {
    this.engine = ctx;
    this.t = 0;
    this.sprites = ctx.sprites;
    this.buttons = [];
    this.bgStars = [];
    for (let i = 0; i < 80; i++) {
      this.bgStars.push({
        x: Math.random() * CFG.VIEW_W, y: Math.random() * CFG.VIEW_H,
        spd: 4 + Math.random() * 12, b: Math.random() * 1.5 + 0.5,
      });
    }
    this._buildButtons();
    this.canvas = ctx.canvas;
    this.input = ctx.input || null;
  }
  enter() {
    if (!this.input) {
      // Build a lightweight input for menu (no movement keys needed)
      this.input = {
        mouse: { x: CFG.VIEW_W / 2, y: CFG.VIEW_H / 2, down: false, justDown: false },
        isDown: () => false, wasPressed: () => false, axis: () => ({ x: 0, y: 0 }),
        justPressed: new Set(),
      };
      this.canvas.addEventListener('mousemove', e => {
        const r = this.canvas.getBoundingClientRect();
        this.input.mouse.x = (e.clientX - r.left) / r.width * CFG.VIEW_W;
        this.input.mouse.y = (e.clientY - r.top) / r.height * CFG.VIEW_H;
      });
      this.canvas.addEventListener('mousedown', e => {
        if (e.button === 0) { this.input.mouse.down = true; this.input.mouse.justDown = true; }
      });
      this.canvas.addEventListener('mouseup', e => {
        if (e.button === 0) this.input.mouse.down = false;
      });
    }
  }
  _buildButtons() {
    const W = CFG.VIEW_W;
    const list = [
      { label: 'PLAY', scene: 'worldMap' },
      { label: 'THE HELL FORGE', scene: 'shop' },
      { label: 'QUICK PLAY', scene: 'characterSelect' },
      { label: 'COIN SHOP', scene: 'coinShop' },
      { label: 'TRAIN BASE', scene: 'trainBase' },
      { label: 'ARSENAL', scene: 'arsenal' },
      { label: 'ARMOURY', scene: 'armoury' },
      { label: 'RELICS', scene: 'relics' },
      { label: 'WORLD MAP', scene: 'worldMap' },
      { label: 'ACHIEVEMENTS', scene: 'achievements' },
      { label: 'LEADERBOARDS', scene: 'leaderboards' },
      { label: 'DAILY RUN', scene: 'dailyRun' },
      { label: 'WEEKLY CHALLENGE', scene: 'weeklyChallenge' },
      { label: 'SETTINGS', scene: 'settings' },
    ];
    const cols = 3;
    const cw = 120, ch = 22;
    const x0 = (W - cols * (cw + 8) - 8) / 2;
    const y0 = 80;
    for (let i = 0; i < list.length; i++) {
      const r = Math.floor(i / cols), c = i % cols;
      const b = new Button(list[i].label, x0 + c * (cw + 8), y0 + r * (ch + 6), cw, ch);
      b.scene = list[i].scene;
      this.buttons.push(b);
    }
  }
  exit() {}
  update(dt, t) {
    this.t = t;
    if (!this.input || !this.input.mouse) return;
    for (const b of this.buttons) b.hover = b.hit(this.input.mouse.x, this.input.mouse.y);
    if (this.input.mouse.justDown) {
      for (const b of this.buttons) {
        if (b.hit(this.input.mouse.x, this.input.mouse.y)) {
          if (b.scene === 'play' || b.scene === 'worldMap') {
            this.engine.setScene('worldMap', { save: this.engine.save });
          } else {
            this.engine.setScene(b.scene, { save: this.engine.save });
          }
          return;
        }
      }
    }
    this.input.mouse.justDown = false;
  }
  render(ctx, t) {
    const W = CFG.VIEW_W, H = CFG.VIEW_H;
    // Sky
    ctx.fillStyle = '#080418';
    ctx.fillRect(0, 0, W, H);
    // Stars
    for (const s of this.bgStars) {
      s.x -= s.spd * 0.05;
      if (s.x < 0) s.x = W;
      ctx.fillStyle = `rgba(255,255,255,${0.3 + Math.sin(t + s.x) * 0.3})`;
      ctx.fillRect(s.x, s.y, 1, 1);
    }
    // Title
    drawBigTitle(ctx, 'HELL TRAIN', W / 2, 50, 1);
    ctx.fillStyle = '#cfd4e0'; ctx.font = '8px monospace'; ctx.textAlign = 'center';
    ctx.fillText('A roguelite beyond the end of the line', W / 2, 70);
    ctx.textAlign = 'left';
    // Train silhouette background
    const tr = trainFrame(this.engine, t) || this.sprites.trainEngine;
    const car = trainFrame(this.engine, t, 'cargo') || this.sprites.trainCar;
    if (tr && car) {
      drawSprite(ctx, car, W / 2 - 110, H - 46, 1, false, 0, 0.55);
      drawSprite(ctx, car, W / 2 - 50, H - 46, 1, false, 0, 0.55);
      drawSprite(ctx, tr, W / 2 + 30, H - 48, 1, false, 0, 0.75);
      // Steam
      ctx.globalAlpha = 0.4;
      for (let i = 0; i < 6; i++) {
        ctx.fillStyle = '#aaa';
        ctx.beginPath();
        ctx.arc(W / 2 + 50 + Math.sin(t + i) * 6, H - 75 - i * 6, 4 + i, 0, TAU);
        ctx.fill();
      }
      ctx.globalAlpha = 1;
    }
    // Buttons
    for (const b of this.buttons) b.draw(ctx);
    // Footer
    ctx.fillStyle = '#cfd4e0'; ctx.font = '7px monospace'; ctx.textAlign = 'center';
    ctx.fillText('© HELL TRAIN v' + CFG.VERSION + '   WASD/Arrows: Move   Space: Ability   Click: Select', W / 2, H - 6);
    ctx.textAlign = 'left';
  }
}

// =====================================================================
// WORLD MAP SCENE
// =====================================================================
export class WorldMapScene {
  constructor(ctx) {
    this.engine = ctx; this.sprites = ctx.sprites; this.t = 0;
    this.canvas = ctx.canvas;
    this.input = { mouse: { x: 0, y: 0, justDown: false }, justPressed: new Set() };
    this.canvas.addEventListener('mousemove', e => {
      const r = this.canvas.getBoundingClientRect();
      this.input.mouse.x = (e.clientX - r.left) / r.width * CFG.VIEW_W;
      this.input.mouse.y = (e.clientY - r.top) / r.height * CFG.VIEW_H;
    });
    this.canvas.addEventListener('mousedown', e => { if (e.button === 0) this.input.mouse.justDown = true; });
  }
  enter(params = {}) {
    this.save = params.save || this.engine.save;
    this.runStats = params.runStats || null;
  }
  exit() {}
  update(dt, t) {
    this.t = t;
    if (this.runStats) {
      // Subtle notification banner
      this.runStats = null;
    }
    if (this.input.mouse.justDown) {
      const x = this.input.mouse.x, y = this.input.mouse.y;
      const W = CFG.VIEW_W;
      // Difficulty row at top
      const diffs = ['easy', 'normal', 'hard', 'nightmare', 'abyss', 'infinite'];
      const dx0 = (W - diffs.length * 60) / 2;
      for (let i = 0; i < diffs.length; i++) {
        const x0 = dx0 + i * 60;
        if (x >= x0 && x <= x0 + 56 && y >= 22 && y <= 36) {
          this.engine._difficulty = diffs[i];
          return;
        }
      }
      // Realm nodes
      const reachable = this._realmPositions();
      for (const r of reachable) {
        if (x >= r.x - 22 && x <= r.x + 22 && y >= r.y - 16 && y <= r.y + 16) {
          if ((this.save.unlockedRealms || ['purgatory']).includes(r.id)) {
            this.engine.setScene('gameplay', {
              save: this.save, realmId: r.id, stage: 1,
              difficulty: this.engine._difficulty || 'normal',
            });
            return;
          }
        }
      }
      // Train base button (top-right)
      if (x > W - 100 && x < W - 6 && y > 6 && y < 28) {
        this.engine.setScene('trainBase', { save: this.save });
        return;
      }
    }
    this.input.mouse.justDown = false;
  }
  _realmPositions() {
    const W = CFG.VIEW_W, H = CFG.VIEW_H;
    const list = [
      { id: 'purgatory', name: 'Purgatory', x: 60, y: 90 },
      { id: 'infernal', name: 'Infernal Fields', x: 120, y: 110 },
      { id: 'forgotten', name: 'Forgotten City', x: 200, y: 100 },
      { id: 'forest', name: 'Haunted Forest', x: 280, y: 130 },
      { id: 'frozen', name: 'Frozen Realm', x: 350, y: 110 },
      { id: 'desert', name: 'Sunken Desert', x: 400, y: 140 },
      { id: 'void', name: 'The Void', x: 430, y: 100 },
      { id: 'terminus', name: 'Terminus', x: 460, y: 80 },
    ];
    // Filter to those visible: show only unlocked or next
    const unlocked = new Set(this.save.unlockedRealms || ['purgatory']);
    return list.map(r => ({ ...r, locked: !unlocked.has(r.id) }));
  }
  render(ctx, t) {
    const W = CFG.VIEW_W, H = CFG.VIEW_H;
    ctx.fillStyle = '#0a0420';
    ctx.fillRect(0, 0, W, H);
    // Train railway lines connecting nodes
    ctx.strokeStyle = '#3d2a4f'; ctx.lineWidth = 1;
    const list = this._realmPositions();
    for (let i = 0; i < list.length - 1; i++) {
      ctx.beginPath();
      ctx.moveTo(list[i].x, list[i].y);
      ctx.lineTo(list[i + 1].x, list[i + 1].y);
      ctx.stroke();
    }
    // Animated train running along tracks
    const tx = (t * 12) % (list[list.length - 1].x + 20);
    let idx = Math.floor(tx / 60);
    if (idx >= list.length - 1) idx = list.length - 2;
    const f = (tx - idx * 60) / 60;
    const px = list[idx].x + (list[idx + 1].x - list[idx].x) * f;
    const py = list[idx].y + (list[idx + 1].y - list[idx].y) * f;
    const tr = trainFrame(this.engine, t) || this.sprites.trainEngine;
    if (tr) drawSprite(ctx, tr, px, py, 0.6, false, 0, 1);

    // Nodes
    for (const r of list) {
      const unlocked = !r.locked;
      ctx.fillStyle = unlocked ? '#985ce0' : '#1a1026';
      ctx.beginPath(); ctx.arc(r.x, r.y, 16, 0, TAU); ctx.fill();
      ctx.strokeStyle = unlocked ? '#ffe066' : '#3a3a4a';
      ctx.lineWidth = 2; ctx.stroke();
      ctx.fillStyle = '#fff'; ctx.font = 'bold 7px monospace'; ctx.textAlign = 'center';
      ctx.fillText(r.name.toUpperCase().slice(0, 12), r.x, r.y + 26);
      if (r.id === 'terminus') ctx.fillText('FINAL', r.x, r.y + 36);
      ctx.textAlign = 'left';
    }
    // Hidden realm hint (very subtle)
    if (this.save.achievements.includes('secret_discovery') ||
        (this.save.discovered || []).includes('phantom')) {
      ctx.fillStyle = '#985ce0';
      ctx.beginPath(); ctx.arc(80, 170, 8, 0, TAU); ctx.fill();
      ctx.fillStyle = '#fff'; ctx.font = '6px monospace'; ctx.textAlign = 'center';
      ctx.fillText('???', 80, 174);
      ctx.textAlign = 'left';
    }
    // Difficulty row
    const diffs = ['easy','normal','hard','nightmare','abyss','infinite'];
    const dx0 = (W - diffs.length * 60) / 2;
    for (let i = 0; i < diffs.length; i++) {
      const x0 = dx0 + i * 60;
      const isSel = (this.engine._difficulty || 'normal') === diffs[i];
      ctx.fillStyle = isSel ? '#985ce0' : '#1a1026';
      ctx.fillRect(x0, 18, 56, 18);
      ctx.strokeStyle = isSel ? '#ffe066' : '#3a3a4a'; ctx.lineWidth = 1; ctx.strokeRect(x0 + 0.5, 18.5, 56, 18);
      ctx.fillStyle = '#fff'; ctx.font = '6px monospace'; ctx.textAlign = 'center';
      ctx.fillText(diffs[i].toUpperCase(), x0 + 28, 31);
      ctx.textAlign = 'left';
    }
    // Top-right train base button
    const tb = new Button('TRAIN BASE', W - 100, 6, 94, 22, '#ffe066');
    tb.hover = this.input.mouse.x > W - 100 && this.input.mouse.x < W - 6 && this.input.mouse.y > 6 && this.input.mouse.y < 28;
    tb.draw(ctx);
    // Title
    ctx.fillStyle = '#fff'; ctx.font = 'bold 10px monospace'; ctx.textAlign = 'center';
    ctx.fillText('WORLD MAP', W / 2, 11);
    ctx.fillStyle = '#cfd4e0'; ctx.font = '7px monospace';
    ctx.fillText('Click a realm node to begin a stage. Difficulty scales enemy stats.', W / 2, H - 4);
    ctx.textAlign = 'left';
  }
}

// =====================================================================
// TRAIN BASE SCENE
// =====================================================================
export class TrainBaseScene {
  constructor(ctx) {
    this.engine = ctx; this.sprites = ctx.sprites; this.t = 0;
    this.canvas = ctx.canvas;
    this.input = { mouse: { x: 0, y: 0, justDown: false } };
    this.canvas.addEventListener('mousemove', e => {
      const r = this.canvas.getBoundingClientRect();
      this.input.mouse.x = (e.clientX - r.left) / r.width * CFG.VIEW_W;
      this.input.mouse.y = (e.clientY - r.top) / r.height * CFG.VIEW_H;
    });
    this.canvas.addEventListener('mousedown', e => { if (e.button === 0) this.input.mouse.justDown = true; });
  }
  enter(params) {
    this.save = params.save || this.engine.save;
    this.tab = 'engine';
    this.tabs = [
      { id: 'engine', label: 'ENGINE' },
      { id: 'arsenal', label: 'ARSENAL' },
      { id: 'workshop', label: 'WORKSHOP' },
      { id: 'observatory', label: 'OBSERVATORY' },
      { id: 'library', label: 'LIBRARY' },
      { id: 'vault', label: 'VAULT' },
      { id: 'medical', label: 'MEDICAL' },
      { id: 'mystery', label: 'MYSTERY' },
    ];
  }
  exit() {}
  update(dt, t) {
    this.t = t;
    if (this.input.mouse.justDown) {
      const x = this.input.mouse.x, y = this.input.mouse.y;
      // tabs
      const tx0 = 12;
      for (let i = 0; i < this.tabs.length; i++) {
        const x0 = tx0 + i * 56;
        if (x >= x0 && x <= x0 + 52 && y >= 38 && y <= 56) {
          this.tab = this.tabs[i].id;
        }
      }
      // back button
      if (x >= 6 && x <= 70 && y >= 6 && y <= 26) {
        this.engine.setScene('menu', { save: this.save });
        return;
      }
      // Spend shard button
      if (this._spendRect && x >= this._spendRect.x && x <= this._spendRect.x + this._spendRect.w &&
          y >= this._spendRect.y && y <= this._spendRect.y + this._spendRect.h) {
        const cost = this._spendRect.cost;
        if ((this.save.shards || 0) >= cost) {
          this.save.shards -= cost;
          this._spendRect.effect(this.save);
        }
      }
    }
    this.input.mouse.justDown = false;
  }
  render(ctx, t) {
    const W = CFG.VIEW_W, H = CFG.VIEW_H;
    ctx.fillStyle = '#1a1026';
    ctx.fillRect(0, 0, W, H);
    // Top background train sprite
    const tr = trainFrame(this.engine, t) || this.sprites.trainEngine;
    if (tr) drawSprite(ctx, tr, W / 2 + 20, 30, 0.5, false, 0, 0.4);
    // Back button
    const back = new Button('BACK', 6, 6, 64, 20, '#985ce0');
    back.hover = this.input.mouse.x >= 6 && this.input.mouse.x <= 70 && this.input.mouse.y >= 6 && this.input.mouse.y <= 26;
    back.draw(ctx);
    // Shards indicator
    ctx.fillStyle = '#985ce0'; ctx.font = '7px monospace';
    ctx.fillText('SHARDS: ' + (this.save.shards || 0), W - 110, 16);
    // Tabs
    const tx0 = 12;
    for (let i = 0; i < this.tabs.length; i++) {
      const x0 = tx0 + i * 56;
      const sel = this.tab === this.tabs[i].id;
      ctx.fillStyle = sel ? '#985ce0' : '#1a1026';
      ctx.fillRect(x0, 38, 52, 18);
      ctx.strokeStyle = sel ? '#ffe066' : '#3a3a4a'; ctx.lineWidth = 1;
      ctx.strokeRect(x0 + 0.5, 38.5, 52, 18);
      ctx.fillStyle = sel ? '#fff' : '#cfd4e0'; ctx.font = '6px monospace'; ctx.textAlign = 'center';
      ctx.fillText(this.tabs[i].label, x0 + 26, 50);
      ctx.textAlign = 'left';
    }
    // Body
    ctx.fillStyle = '#0a0420';
    ctx.fillRect(8, 60, W - 16, H - 70);
    this._renderTab(ctx);
    // Title
    ctx.fillStyle = '#fff'; ctx.font = 'bold 10px monospace';
    ctx.fillText('TRAIN BASE — ' + this.tab.toUpperCase(), 80, 16);
  }
  _renderTab(ctx) {
    const W = CFG.VIEW_W;
    if (this.tab === 'engine') {
      ctx.fillStyle = '#fff'; ctx.font = '8px monospace';
      ctx.fillText('Engine upgrade tree', 14, 80);
      const upg = [
        { id: 'eng1', name: 'Engine I: +20% train speed', cost: 1 },
        { id: 'eng2', name: 'Engine II: +20% train speed', cost: 2 },
      ];
      for (let i = 0; i < upg.length; i++) {
        const y = 100 + i * 40;
        ctx.fillStyle = '#1a1026'; ctx.fillRect(14, y, W - 28, 32);
        ctx.fillStyle = '#cfd4e0'; ctx.font = '8px monospace';
        ctx.fillText(upg[i].name, 22, y + 12);
        ctx.fillText('Cost: ' + upg[i].cost + ' shards', 22, y + 24);
        // spend button
        const sx = W - 80, sy = y + 4;
        ctx.fillStyle = '#985ce0'; ctx.fillRect(sx, sy, 60, 24);
        ctx.fillStyle = '#fff'; ctx.textAlign = 'center';
        ctx.fillText('UPGRADE', sx + 30, sy + 16);
        ctx.textAlign = 'left';
        if (this.input.mouse.x >= sx && this.input.mouse.x <= sx + 60 && this.input.mouse.y >= sy && this.input.mouse.y <= sy + 24) {
          this._spendRect = { x: sx, y: sy, w: 60, h: 24, cost: upg[i].cost, effect: () => { this.save.perma.train = this.save.perma.train || {}; this.save.perma.train.engine = this.save.perma.train.engine || []; this.save.perma.train.engine.push(upg[i].id); } };
        }
      }
    } else if (this.tab === 'arsenal') {
      ctx.fillStyle = '#fff'; ctx.font = '8px monospace';
      ctx.fillText('Train Weapons', 14, 80);
      const list = ['fireball_cannon','phantom_satellites','carriage_bombs','lightning_tower','flamethrower','gravity_engine','train_ram'];
      for (let i = 0; i < list.length; i++) {
        const w = list[i];
        const y = 100 + i * 20;
        ctx.fillStyle = '#1a1026'; ctx.fillRect(14, y, W - 28, 18);
        ctx.fillStyle = '#cfd4e0'; ctx.font = '7px monospace';
        ctx.fillText(w.replace(/_/g, ' ').toUpperCase(), 22, y + 12);
      }
    } else if (this.tab === 'workshop') {
      ctx.fillStyle = '#fff'; ctx.font = '8px monospace';
      ctx.fillText('Permanent character upgrades', 14, 80);
      const list = PERMANENT_LIST();
      for (let i = 0; i < list.length; i++) {
        const u = list[i];
        const y = 100 + i * 28;
        ctx.fillStyle = '#1a1026'; ctx.fillRect(14, y, W - 28, 24);
        ctx.fillStyle = '#cfd4e0'; ctx.font = '7px monospace';
        ctx.fillText(u.name + ' (' + u.cost + ' shards)', 22, y + 12);
        ctx.fillText(u.desc, 22, y + 20);
      }
    } else if (this.tab === 'observatory') {
      ctx.fillStyle = '#fff'; ctx.font = '8px monospace';
      ctx.fillText('Realm intel', 14, 80);
      for (let i = 0; i < REALMS.length; i++) {
        const r = REALMS[i];
        const y = 100 + i * 18;
        ctx.fillStyle = '#1a1026'; ctx.fillRect(14, y, W - 28, 16);
        ctx.fillStyle = '#cfd4e0'; ctx.font = '7px monospace';
        ctx.fillText(r.idx + '. ' + r.name + ' — ' + r.desc, 22, y + 10);
      }
    } else if (this.tab === 'library') {
      ctx.fillStyle = '#fff'; ctx.font = '8px monospace';
      ctx.fillText('Lore fragments discovered', 14, 80);
      const disc = this.save.discovered || [];
      for (let i = 0; i < LORE.length; i++) {
        const l = LORE[i];
        const y = 100 + i * 30;
        ctx.fillStyle = '#1a1026'; ctx.fillRect(14, y, W - 28, 28);
        ctx.fillStyle = disc.includes(l.id) ? '#cfd4e0' : '#3a3a4a';
        ctx.font = '7px monospace';
        ctx.fillText(l.name + (disc.includes(l.id) ? '' : ' — locked'), 22, y + 12);
        if (disc.includes(l.id)) ctx.fillText('"' + l.text.slice(0, 64) + '"', 22, y + 22);
      }
    } else if (this.tab === 'vault') {
      ctx.fillStyle = '#fff'; ctx.font = '8px monospace';
      ctx.fillText('Boss Cores & Rare Resources', 14, 80);
      const cores = this.save.bossCores || {};
      const keys = Object.keys(cores);
      if (keys.length === 0) {
        ctx.fillStyle = '#3a3a4a'; ctx.font = '7px monospace';
        ctx.fillText('No cores collected yet. Defeat bosses to earn cores.', 22, 110);
      }
      for (let i = 0; i < keys.length; i++) {
        const k = keys[i];
        const y = 110 + i * 22;
        ctx.fillStyle = '#985ce0'; ctx.fillRect(14, y, W - 28, 20);
        ctx.fillStyle = '#fff'; ctx.font = '7px monospace';
        ctx.fillText(k.replace(/_/g, ' ').toUpperCase() + ' × ' + cores[k], 22, y + 12);
      }
    } else if (this.tab === 'medical') {
      ctx.fillStyle = '#fff'; ctx.font = '8px monospace';
      ctx.fillText('Medical Carriage', 14, 80);
      const list = [
        { name: 'Healing Aura', desc: 'Regen +2', cost: 2 },
        { name: 'Shielding Plate', desc: 'Train armour +4', cost: 3 },
      ];
      for (let i = 0; i < list.length; i++) {
        const y = 100 + i * 30;
        ctx.fillStyle = '#1a1026'; ctx.fillRect(14, y, W - 28, 28);
        ctx.fillStyle = '#cfd4e0'; ctx.font = '7px monospace';
        ctx.fillText(list[i].name + ' (' + list[i].cost + ' shards)', 22, y + 12);
        ctx.fillText(list[i].desc, 22, y + 22);
      }
    } else if (this.tab === 'mystery') {
      ctx.fillStyle = '#fff'; ctx.font = '8px monospace';
      ctx.fillText('Mystery Carriage', 14, 80);
      ctx.fillStyle = '#985ce0'; ctx.font = '7px monospace';
      ctx.fillText('A random event is waiting inside...', 22, 110);
    }
  }
}

function PERMANENT_LIST() {
  return [
    { name: 'Combat I', desc: '+10% damage', cost: 1 },
    { name: 'Vitality I', desc: '+20 HP', cost: 1 },
    { name: 'Haste I', desc: '+8% attack speed', cost: 1 },
    { name: 'Armour I', desc: '+2 armour', cost: 1 },
  ];
}

// =====================================================================
// RUN SUMMARY SCENE
// =====================================================================
export class RunSummaryScene {
  constructor(ctx) { this.engine = ctx; this.canvas = ctx.canvas; this.t = 0;
    this.input = { mouse: { x: 0, y: 0, justDown: false } };
    this.canvas.addEventListener('mousemove', e => {
      const r = this.canvas.getBoundingClientRect();
      this.input.mouse.x = (e.clientX - r.left) / r.width * CFG.VIEW_W;
      this.input.mouse.y = (e.clientY - r.top) / r.height * CFG.VIEW_H;
    });
    this.canvas.addEventListener('mousedown', e => { if (e.button === 0) this.input.mouse.justDown = true; });
  }
  enter(params) {
    this.params = params;
  }
  _buttons() {
    const W = CFG.VIEW_W, y = CFG.VIEW_H - 34, w = 128, gap = 8;
    const total = 3 * w + 2 * gap;
    const x0 = (W - total) / 2;
    return [
      { label: 'RUN IT BACK', x: x0, y, w, h: 22, act: 'retry', color: '#ff8a30' },
      { label: 'THE HELL FORGE', x: x0 + w + gap, y, w, h: 22, act: 'shop', color: '#ffe066' },
      { label: 'MAIN MENU', x: x0 + 2 * (w + gap), y, w, h: 22, act: 'menu', color: '#985ce0' },
    ];
  }
  update(dt, t) {
    this.t = t;
    this.anim = Math.min(1, (this.anim || 0) + dt * 1.6);
    const m = this.input.mouse;
    if (m.justDown) {
      for (const b of this._buttons()) {
        if (m.x >= b.x && m.x <= b.x + b.w && m.y >= b.y && m.y <= b.y + b.h) {
          if (b.act === 'retry') {
            this.engine.setScene('gameplay', {
              save: this.engine.save, realmId: this.params.realmId,
              stage: this.params.stage, difficulty: this.params.difficulty || 'normal',
            });
          } else if (b.act === 'shop') {
            this.engine.setScene('shop', { save: this.engine.save, from: 'menu' });
          } else {
            this.engine.setScene('menu', { save: this.engine.save });
          }
          break;
        }
      }
    }
    this.input.mouse.justDown = false;
  }
  render(ctx, t) {
    const W = CFG.VIEW_W, H = CFG.VIEW_H;
    const p = this.params || {};
    const rs = p.runStats || {};
    const k = this.anim || 0;
    // backdrop
    const g = ctx.createLinearGradient(0, 0, 0, H);
    g.addColorStop(0, p.victory ? '#1a1030' : '#1a0a10');
    g.addColorStop(1, '#06040c');
    ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
    const rg = ctx.createRadialGradient(W / 2, 40, 4, W / 2, 40, 200);
    rg.addColorStop(0, p.victory ? 'rgba(255,224,102,0.18)' : 'rgba(255,60,40,0.16)');
    rg.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = rg; ctx.fillRect(0, 0, W, H);

    drawBigTitle(ctx, p.victory ? 'STAGE CLEARED' : 'RUN ENDED', W / 2, 34, 0.8);
    ctx.textAlign = 'center';
    ctx.font = '7px monospace'; ctx.fillStyle = '#8a8aa0';
    ctx.fillText(findRealm(p.realmId).name.toUpperCase() + '  ·  STAGE ' + (p.stage || 1) +
      '  ·  ' + fmtTime(p.time || 0), W / 2, 50);

    // stat tiles
    const stats = [
      ['KILLS', fmtNum(rs.kills || 0), '#ff8a30'],
      ['LEVEL', String(p.level || 1), '#8ef0ff'],
      ['COINS', fmtNum(p.coins || 0), '#ffe878'],
      ['BEST COMBO', 'x' + (rs.bestCombo || 0), '#c07aff'],
      ['DAMAGE DEALT', fmtNum(Math.round(rs.damageDealt || 0)), '#ff4d6a'],
      ['DAMAGE TAKEN', fmtNum(Math.round(rs.damageTaken || 0)), '#9aa0b4'],
    ];
    const cols = 3, tw = 132, th = 34, gap = 8;
    const x0 = (W - (cols * tw + (cols - 1) * gap)) / 2;
    for (let i = 0; i < stats.length; i++) {
      const c = i % cols, r = Math.floor(i / cols);
      const x = x0 + c * (tw + gap), y = 60 + r * (th + gap);
      const kk = Math.max(0, Math.min(1, k * 3 - i * 0.25));
      if (kk <= 0) continue;
      ctx.globalAlpha = kk;
      ctx.fillStyle = 'rgba(10,8,18,0.9)'; ctx.fillRect(x, y, tw, th);
      ctx.strokeStyle = stats[i][2]; ctx.lineWidth = 1;
      ctx.strokeRect(x + 0.5, y + 0.5, tw - 1, th - 1);
      ctx.fillStyle = '#6b6b80'; ctx.font = '6px monospace';
      ctx.fillText(stats[i][0], x + tw / 2, y + 11);
      ctx.fillStyle = stats[i][2]; ctx.font = 'bold 13px monospace';
      ctx.fillText(stats[i][1], x + tw / 2, y + 27);
      ctx.globalAlpha = 1;
    }

    // ascensions taken
    const owned = p.owned || {};
    const ids = Object.keys(owned);
    ctx.font = '6px monospace'; ctx.fillStyle = '#6b6b80';
    ctx.fillText('ASCENSIONS TAKEN — ' + ids.length + (p.apocalypse ? '   ·   APOCALYPSE PROTOCOL ENGAGED' : ''),
      W / 2, 156);
    let line = ids.map(id => {
      const a = findAscension(id);
      return (a ? a.name : id) + (owned[id] > 1 ? ' ' + owned[id] : '');
    }).join('  ·  ');
    ctx.fillStyle = '#cfd4e0';
    const chunks = [];
    while (line.length > 74) {
      let cut = line.lastIndexOf('·', 74);
      if (cut < 20) cut = 74;
      chunks.push(line.slice(0, cut)); line = line.slice(cut + 1);
    }
    if (line) chunks.push(line);
    for (let i = 0; i < Math.min(3, chunks.length); i++) ctx.fillText(chunks[i].trim(), W / 2, 168 + i * 9);

    // coin banner
    ctx.fillStyle = '#ffe878'; ctx.font = 'bold 9px monospace';
    ctx.fillText('+' + fmtNum(p.coins || 0) + ' COINS BANKED   (TOTAL ' +
      fmtNum(this.engine.save?.coins || 0) + ')', W / 2, 204);

    // buttons
    for (const b of this._buttons()) {
      const hover = this.input.mouse.x >= b.x && this.input.mouse.x <= b.x + b.w &&
        this.input.mouse.y >= b.y && this.input.mouse.y <= b.y + b.h;
      ctx.fillStyle = hover ? 'rgba(40,30,60,0.95)' : 'rgba(12,10,20,0.9)';
      ctx.fillRect(b.x, b.y, b.w, b.h);
      ctx.strokeStyle = b.color; ctx.lineWidth = hover ? 2 : 1;
      ctx.strokeRect(b.x + 0.5, b.y + 0.5, b.w - 1, b.h - 1);
      ctx.fillStyle = hover ? '#ffffff' : b.color;
      ctx.font = 'bold 8px monospace';
      ctx.fillText(b.label, b.x + b.w / 2, b.y + 14);
    }
    ctx.lineWidth = 1;
    ctx.textAlign = 'left';
  }
}

// =====================================================================
// PAUSE SCENE
// =====================================================================
export class PauseScene {
  constructor(ctx) { this.engine = ctx; this.canvas = ctx.canvas; this.t = 0;
    this.input = { mouse: { x: 0, y: 0, justDown: false } };
    this.canvas.addEventListener('mousemove', e => {
      const r = this.canvas.getBoundingClientRect();
      this.input.mouse.x = (e.clientX - r.left) / r.width * CFG.VIEW_W;
      this.input.mouse.y = (e.clientY - r.top) / r.height * CFG.VIEW_H;
    });
    this.canvas.addEventListener('mousedown', e => { if (e.button === 0) this.input.mouse.justDown = true; });
  }
  enter(params) { this.params = params; }
  update(dt, t) {
    this.t = t;
    if (this.input.mouse.justDown) {
      const y = this.input.mouse.y;
      if (y > 60 && y < 80) this.engine.resumeScene(this.params.ctx);
      if (y > 90 && y < 110) this.engine.setScene('shop', { save: this.engine.save, from: 'menu' });
      if (y > 120 && y < 140) this.engine.setScene('menu', { save: this.engine.save });
    }
    this.input.mouse.justDown = false;
  }
  render(ctx, t) {
    const W = CFG.VIEW_W, H = CFG.VIEW_H;
    ctx.fillStyle = 'rgba(0,0,0,0.7)'; ctx.fillRect(0, 0, W, H);
    ctx.fillStyle = '#fff'; ctx.font = 'bold 12px monospace'; ctx.textAlign = 'center';
    ctx.fillText('PAUSED', W / 2, 40);
    ctx.font = '8px monospace';
    ctx.fillText('Resume', W / 2, 75);
    ctx.fillText('The Hell Forge', W / 2, 105);
    ctx.fillText('Quit to Menu', W / 2, 135);
    ctx.textAlign = 'left';
  }
}

// =====================================================================
// ACHIEVEMENTS SCENE
// =====================================================================
export class AchievementsScene {
  constructor(ctx) { this.engine = ctx; this.canvas = ctx.canvas; this.t = 0;
    this.input = { mouse: { x: 0, y: 0, justDown: false } };
    this.canvas.addEventListener('mousemove', e => {
      const r = this.canvas.getBoundingClientRect();
      this.input.mouse.x = (e.clientX - r.left) / r.width * CFG.VIEW_W;
      this.input.mouse.y = (e.clientY - r.top) / r.height * CFG.VIEW_H;
    });
    this.canvas.addEventListener('mousedown', e => { if (e.button === 0) this.input.mouse.justDown = true; });
  }
  enter(p) { this.save = p.save || this.engine.save; }
  update(dt, t) {
    this.t = t;
    if (this.input.mouse.justDown) {
      if (this.input.mouse.x < 70 && this.input.mouse.y < 26) this.engine.setScene('menu', { save: this.save });
    }
    this.input.mouse.justDown = false;
  }
  render(ctx, t) {
    const W = CFG.VIEW_W, H = CFG.VIEW_H;
    ctx.fillStyle = '#080418'; ctx.fillRect(0, 0, W, H);
    const back = new Button('BACK', 6, 6, 64, 20, '#985ce0');
    back.draw(ctx);
    ctx.fillStyle = '#fff'; ctx.font = 'bold 10px monospace';
    ctx.fillText('ACHIEVEMENTS', 80, 16);
    const earned = this.save.achievements || [];
    let yy = 36;
    for (let i = 0; i < ACHIEVEMENTS.length; i++) {
      const a = ACHIEVEMENTS[i];
      const got = earned.includes(a.id);
      ctx.fillStyle = got ? '#2a1a3a' : '#0a0420';
      ctx.fillRect(8, yy, W - 16, 14);
      ctx.fillStyle = got ? '#ffe066' : '#3a3a4a';
      ctx.font = '7px monospace';
      ctx.fillText((got ? '✔ ' : '✗ ') + a.name + ' — ' + a.desc, 14, yy + 10);
      yy += 16;
      if (yy > H - 6) break;
    }
    ctx.fillStyle = '#cfd4e0'; ctx.font = '7px monospace';
    ctx.fillText('Earned: ' + earned.length + ' / ' + ACHIEVEMENTS.length, 12, H - 4);
  }
}

// =====================================================================
// LEADERBOARDS SCENE
// =====================================================================
export class LeaderboardScene {
  constructor(ctx) { this.engine = ctx; this.t = 0; }
  enter(p) { this.save = p.save || this.engine.save; this._load(); }
  async _load() {
    if (!this.engine.supabase) {
      this.rows = []; return;
    }
    try {
      this.rows = await this.engine.supabase.topScores(20, this.engine._lbFilter || {});
    } catch { this.rows = []; }
  }
  update(dt, t) {
    this.t = t;
    // simple: any click goes back
    if (this.input?.mouse?.justDown) {
      this.engine.setScene('menu', { save: this.save });
    }
    this.input.mouse.justDown = false;
  }
  render(ctx, t) {
    const W = CFG.VIEW_W, H = CFG.VIEW_H;
    ctx.fillStyle = '#080418'; ctx.fillRect(0, 0, W, H);
    ctx.fillStyle = '#fff'; ctx.font = 'bold 10px monospace';
    ctx.fillText('LEADERBOARDS', 12, 16);
    if (!this.engine.supabase) {
      ctx.fillStyle = '#cfd4e0'; ctx.font = '8px monospace';
      ctx.fillText('Leaderboard backend not configured. Game still playable.', 12, 60);
      ctx.fillText('Single-player mode active.', 12, 80);
    } else if (!this.rows || this.rows.length === 0) {
      ctx.fillStyle = '#cfd4e0'; ctx.font = '8px monospace';
      ctx.fillText('No scores yet — be the first!', 12, 60);
    } else {
      ctx.fillStyle = '#cfd4e0'; ctx.font = '7px monospace';
      let y = 36;
      for (let i = 0; i < Math.min(15, this.rows.length); i++) {
        const r = this.rows[i];
        ctx.fillText((i + 1) + '. ' + (r.player_id?.slice(0, 6) || '???') + ' — ' +
          fmtNum(r.score) + '  S' + r.stage + '  K' + r.kills, 12, y);
        y += 10;
      }
    }
    ctx.fillStyle = '#cfd4e0'; ctx.font = '7px monospace';
    ctx.fillText('Click anywhere to return', 12, H - 6);
  }
}

// =====================================================================
// DAILY RUN SCENE
// =====================================================================
export class DailyRunScene {
  constructor(ctx) { this.engine = ctx; this.canvas = ctx.canvas; this.t = 0;
    this.input = { mouse: { x: 0, y: 0, justDown: false } };
    this.canvas.addEventListener('mousemove', e => {
      const r = this.canvas.getBoundingClientRect();
      this.input.mouse.x = (e.clientX - r.left) / r.width * CFG.VIEW_W;
      this.input.mouse.y = (e.clientY - r.top) / r.height * CFG.VIEW_H;
    });
    this.canvas.addEventListener('mousedown', e => { if (e.button === 0) this.input.mouse.justDown = true; });
  }
  enter(p) { this.save = p.save || this.engine.save;
    // Daily seed = today's date string
    const d = new Date();
    this.dailySeed = (d.getUTCFullYear() * 10000 + (d.getUTCMonth() + 1) * 100 + d.getUTCDate()) >>> 0;
  }
  update(dt, t) {
    this.t = t;
    if (this.input.mouse.justDown) {
      const y = this.input.mouse.y;
      if (y < 26 && this.input.mouse.x < 70) this.engine.setScene('menu', { save: this.save });
      else if (y > 100 && y < 130) {
        this.engine.setScene('gameplay', {
          save: this.save, realmId: 'purgatory', stage: 1,
          difficulty: 'normal', dailySeed: this.dailySeed,
          runSeed: this.dailySeed,
        });
      }
    }
    this.input.mouse.justDown = false;
  }
  render(ctx, t) {
    const W = CFG.VIEW_W, H = CFG.VIEW_H;
    ctx.fillStyle = '#080418'; ctx.fillRect(0, 0, W, H);
    const back = new Button('BACK', 6, 6, 64, 20, '#985ce0'); back.draw(ctx);
    ctx.fillStyle = '#fff'; ctx.font = 'bold 12px monospace'; ctx.textAlign = 'center';
    ctx.fillText('DAILY RUN', W / 2, 50);
    ctx.font = '7px monospace';
    ctx.fillText('Seed: ' + this.dailySeed.toString(16).toUpperCase(), W / 2, 70);
    ctx.fillText('Same seed for everyone. Compete on the global leaderboard.', W / 2, 84);
    // Start button
    const sb = new Button('START DAILY RUN', W / 2 - 100, 100, 200, 28, '#ffe066');
    sb.hover = this.input.mouse.x > W / 2 - 100 && this.input.mouse.x < W / 2 + 100 && this.input.mouse.y > 100 && this.input.mouse.y < 128;
    sb.draw(ctx);
    ctx.textAlign = 'left';
  }
}

// =====================================================================
// WEEKLY CHALLENGE SCENE
// =====================================================================
export class WeeklyChallengeScene {
  constructor(ctx) { this.engine = ctx; this.canvas = ctx.canvas; this.t = 0;
    this.input = { mouse: { x: 0, y: 0, justDown: false } };
    this.canvas.addEventListener('mousemove', e => {
      const r = this.canvas.getBoundingClientRect();
      this.input.mouse.x = (e.clientX - r.left) / r.width * CFG.VIEW_W;
      this.input.mouse.y = (e.clientY - r.top) / r.height * CFG.VIEW_H;
    });
    this.canvas.addEventListener('mousedown', e => { if (e.button === 0) this.input.mouse.justDown = true; });
  }
  enter(p) { this.save = p.save || this.engine.save;
    // Rotate weekly challenge by week number
    const d = new Date();
    const wk = Math.floor((Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()) / 86400000) / 7);
    this.challenge = WEEKLY_CHALLENGES[wk % WEEKLY_CHALLENGES.length];
  }
  update(dt, t) {
    this.t = t;
    if (this.input.mouse.justDown) {
      if (this.input.mouse.y < 26 && this.input.mouse.x < 70) this.engine.setScene('menu', { save: this.save });
      else if (this.input.mouse.y > 100 && this.input.mouse.y < 130) {
        this.engine.setScene('gameplay', {
          save: this.save, realmId: 'purgatory', stage: 1, difficulty: 'normal',
          weeklyChallenge: this.challenge,
        });
      }
    }
    this.input.mouse.justDown = false;
  }
  render(ctx, t) {
    const W = CFG.VIEW_W, H = CFG.VIEW_H;
    ctx.fillStyle = '#080418'; ctx.fillRect(0, 0, W, H);
    const back = new Button('BACK', 6, 6, 64, 20, '#985ce0'); back.draw(ctx);
    ctx.fillStyle = '#fff'; ctx.font = 'bold 12px monospace'; ctx.textAlign = 'center';
    ctx.fillText('WEEKLY CHALLENGE', W / 2, 50);
    ctx.font = 'bold 9px monospace';
    ctx.fillStyle = '#ffe066';
    ctx.fillText(this.challenge.name.toUpperCase(), W / 2, 80);
    ctx.fillStyle = '#cfd4e0'; ctx.font = '7px monospace';
    ctx.fillText(this.challenge.desc, W / 2, 96);
    const sb = new Button('START CHALLENGE', W / 2 - 100, 100, 200, 28, '#985ce0');
    sb.hover = this.input.mouse.x > W / 2 - 100 && this.input.mouse.x < W / 2 + 100 && this.input.mouse.y > 100 && this.input.mouse.y < 128;
    sb.draw(ctx);
    ctx.textAlign = 'left';
  }
}

// =====================================================================
// SETTINGS SCENE
// =====================================================================
export class SettingsScene {
  constructor(ctx) { this.engine = ctx; this.canvas = ctx.canvas;
    this.input = { mouse: { x: 0, y: 0, justDown: false } };
    this.canvas.addEventListener('mousemove', e => {
      const r = this.canvas.getBoundingClientRect();
      this.input.mouse.x = (e.clientX - r.left) / r.width * CFG.VIEW_W;
      this.input.mouse.y = (e.clientY - r.top) / r.height * CFG.VIEW_H;
    });
    this.canvas.addEventListener('mousedown', e => { if (e.button === 0) this.input.mouse.justDown = true; });
    this.audio = 1; this.music = 1; this.shake = 1;
  }
  enter(p) { this.save = p.save || this.engine.save; }
  update(dt, t) {
    if (this.input.mouse.justDown) {
      if (this.input.mouse.y < 26 && this.input.mouse.x < 70) this.engine.setScene('menu', { save: this.save });
      // toggles
      const x = this.input.mouse.x, y = this.input.mouse.y;
      if (y > 60 && y < 80 && x > 100 && x < 400) {
        this.audio = this.audio > 0 ? 0 : 1;
      }
      if (y > 80 && y < 100 && x > 100 && x < 400) {
        this.music = this.music > 0 ? 0 : 1;
      }
      if (y > 100 && y < 120 && x > 100 && x < 400) {
        this.shake = this.shake > 0 ? 0 : 1;
      }
      if (y > 130 && y < 150 && x > 100 && x < 400) {
        // Reset save
        import('../core/save.js').then(({ resetSave }) => {
          resetSave(); this.engine.save = null; this.engine.setScene('menu', {});
        });
      }
    }
    this.input.mouse.justDown = false;
  }
  render(ctx, t) {
    const W = CFG.VIEW_W, H = CFG.VIEW_H;
    ctx.fillStyle = '#080418'; ctx.fillRect(0, 0, W, H);
    const back = new Button('BACK', 6, 6, 64, 20, '#985ce0'); back.draw(ctx);
    ctx.fillStyle = '#fff'; ctx.font = 'bold 10px monospace';
    ctx.fillText('SETTINGS', 80, 16);
    const rows = [
      ['SFX', this.audio ? 'ON' : 'OFF'],
      ['MUSIC', this.music ? 'ON' : 'OFF'],
      ['SCREEN SHAKE', this.shake ? 'ON' : 'OFF'],
      ['RESET SAVE', 'CLICK'],
    ];
    for (let i = 0; i < rows.length; i++) {
      const y = 60 + i * 20;
      ctx.fillStyle = '#1a1026'; ctx.fillRect(100, y, 300, 18);
      ctx.fillStyle = '#cfd4e0'; ctx.font = '8px monospace';
      ctx.fillText(rows[i][0], 110, y + 12);
      ctx.fillText(rows[i][1], 380, y + 12);
    }
  }
}

// =====================================================================
// ARSENAL SCENE (weapons catalog)
// =====================================================================
export class ArsenalScene {
  constructor(ctx) { this.engine = ctx; this.canvas = ctx.canvas;
    this.input = { mouse: { x: 0, y: 0, justDown: false } };
    this.canvas.addEventListener('mousemove', e => {
      const r = this.canvas.getBoundingClientRect();
      this.input.mouse.x = (e.clientX - r.left) / r.width * CFG.VIEW_W;
      this.input.mouse.y = (e.clientY - r.top) / r.height * CFG.VIEW_H;
    });
    this.canvas.addEventListener('mousedown', e => { if (e.button === 0) this.input.mouse.justDown = true; });
  }
  enter(p) { this.save = p.save || this.engine.save; }
  update(dt, t) {
    if (this.input.mouse.justDown) {
      if (this.input.mouse.y < 26 && this.input.mouse.x < 70) this.engine.setScene('menu', { save: this.save });
    }
    this.input.mouse.justDown = false;
  }
  render(ctx, t) {
    const W = CFG.VIEW_W, H = CFG.VIEW_H;
    ctx.fillStyle = '#080418'; ctx.fillRect(0, 0, W, H);
    const back = new Button('BACK', 6, 6, 64, 20, '#985ce0'); back.draw(ctx);
    ctx.fillStyle = '#fff'; ctx.font = 'bold 10px monospace';
    ctx.fillText('ARSENAL — WEAPONS', 80, 16);
    const cols = 2; const cw = (W - 24) / cols; const ch = 50;
    for (let i = 0; i < WEAPONS.length; i++) {
      const w = WEAPONS[i];
      const c = i % cols, r = Math.floor(i / cols);
      const x = 8 + c * cw, y = 32 + r * (ch + 6);
      ctx.fillStyle = '#1a1026'; ctx.fillRect(x, y, cw - 8, ch);
      ctx.strokeStyle = w.color; ctx.lineWidth = 1; ctx.strokeRect(x + 0.5, y + 0.5, cw - 8, ch);
      ctx.fillStyle = '#fff'; ctx.font = 'bold 8px monospace';
      ctx.fillText(w.name, x + 6, y + 12);
      ctx.font = '7px monospace'; ctx.fillStyle = '#cfd4e0';
      const lines = wrap(w.desc, 32);
      for (let j = 0; j < Math.min(3, lines.length); j++) ctx.fillText(lines[j], x + 6, y + 24 + j * 9);
      // orb sprite
      const sp = projFrame(this.engine, w.sprite, t);
      if (sp) drawSprite(ctx, sp, x + cw - 18, y + 14, 1.5, false, 0, 1);
    }
  }
}

// =====================================================================
// ARMOURY SCENE
// =====================================================================
export class ArmouryScene {
  constructor(ctx) { this.engine = ctx; this.canvas = ctx.canvas;
    this.input = { mouse: { x: 0, y: 0, justDown: false } };
    this.canvas.addEventListener('mousemove', e => {
      const r = this.canvas.getBoundingClientRect();
      this.input.mouse.x = (e.clientX - r.left) / r.width * CFG.VIEW_W;
      this.input.mouse.y = (e.clientY - r.top) / r.height * CFG.VIEW_H;
    });
    this.canvas.addEventListener('mousedown', e => { if (e.button === 0) this.input.mouse.justDown = true; });
  }
  enter(p) { this.save = p.save || this.engine.save; this.selected = 0; }
  update(dt, t) {
    if (this.input.mouse.justDown) {
      if (this.input.mouse.y < 26 && this.input.mouse.x < 70) this.engine.setScene('menu', { save: this.save });
      const y = this.input.mouse.y;
      if (y > 32 && y < 32 + ARMOURS.length * 28) {
        const i = Math.floor((y - 32) / 28);
        if (ARMOURS[i]) {
          this.selected = i;
          this.save.currentArmour = ARMOURS[i].id;
        }
      }
    }
    this.input.mouse.justDown = false;
  }
  render(ctx, t) {
    const W = CFG.VIEW_W, H = CFG.VIEW_H;
    ctx.fillStyle = '#080418'; ctx.fillRect(0, 0, W, H);
    const back = new Button('BACK', 6, 6, 64, 20, '#985ce0'); back.draw(ctx);
    ctx.fillStyle = '#fff'; ctx.font = 'bold 10px monospace';
    ctx.fillText('ARMOURY', 80, 16);
    for (let i = 0; i < ARMOURS.length; i++) {
      const a = ARMOURS[i];
      const y = 32 + i * 28;
      const sel = this.selected === i;
      ctx.fillStyle = sel ? '#985ce0' : '#1a1026';
      ctx.fillRect(8, y, W - 16, 24);
      ctx.fillStyle = '#fff'; ctx.font = 'bold 8px monospace';
      ctx.fillText(a.name, 14, y + 12);
      ctx.font = '7px monospace'; ctx.fillStyle = '#cfd4e0';
      ctx.fillText(a.desc, 14, y + 22);
    }
  }
}

// =====================================================================
// RELICS SCENE
// =====================================================================
export class RelicsScene {
  constructor(ctx) { this.engine = ctx; this.canvas = ctx.canvas;
    this.input = { mouse: { x: 0, y: 0, justDown: false } };
    this.canvas.addEventListener('mousemove', e => {
      const r = this.canvas.getBoundingClientRect();
      this.input.mouse.x = (e.clientX - r.left) / r.width * CFG.VIEW_W;
      this.input.mouse.y = (e.clientY - r.top) / r.height * CFG.VIEW_H;
    });
    this.canvas.addEventListener('mousedown', e => { if (e.button === 0) this.input.mouse.justDown = true; });
  }
  enter(p) { this.save = p.save || this.engine.save; }
  update(dt, t) {
    if (this.input.mouse.justDown) {
      if (this.input.mouse.y < 26 && this.input.mouse.x < 70) this.engine.setScene('menu', { save: this.save });
    }
    this.input.mouse.justDown = false;
  }
  render(ctx, t) {
    const W = CFG.VIEW_W, H = CFG.VIEW_H;
    ctx.fillStyle = '#080418'; ctx.fillRect(0, 0, W, H);
    const back = new Button('BACK', 6, 6, 64, 20, '#985ce0'); back.draw(ctx);
    ctx.fillStyle = '#fff'; ctx.font = 'bold 10px monospace';
    ctx.fillText('RELICS', 80, 16);
    for (let i = 0; i < RELICS.length; i++) {
      const r = RELICS[i];
      const y = 32 + i * 28;
      ctx.fillStyle = '#1a1026'; ctx.fillRect(8, y, W - 16, 24);
      ctx.fillStyle = '#fff'; ctx.font = 'bold 8px monospace';
      ctx.fillText(r.name, 14, y + 12);
      ctx.font = '7px monospace'; ctx.fillStyle = '#cfd4e0';
      ctx.fillText(r.desc, 14, y + 22);
    }
  }
}
