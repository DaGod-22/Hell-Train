// ============================================================
// HELL TRAIN — THE HELL FORGE
// The coin shop. Permanent progression for the Conductor and the
// Train, plus every animated skin in the game.
// ============================================================
import { CFG } from '../core/config.js';
import { TAU, fmtNum } from '../core/utils.js';
import { PLAYER_TRACKS, TRAIN_TRACKS, findTrack, trackCost, trackValue, totalSpent } from '../data/shop.js';
import { CHAR_SKINS, TRAIN_SKINS } from '../data/skins.js';
import { spendCoins, saveSave } from '../core/save.js';
import { text, textC, textR, drawPanel, drawBar, drawIcon, hexA, hitRect } from './widgets.js';

const TABS = [
  { id: 'conductor', name: 'CONDUCTOR', color: '#ff8a30' },
  { id: 'train', name: 'THE TRAIN', color: '#8ef0ff' },
  { id: 'skins', name: 'SKINS', color: '#c07aff' },
];
const RCOL = {
  common: '#9aa0b4', uncommon: '#5ad07a', rare: '#4a9cff',
  epic: '#c07aff', legendary: '#ffb020', mythic: '#ff2a5a',
};

export class ShopScene {
  constructor(engine) {
    this.engine = engine;
    this.input = engine.input;
    this.art = engine.sprites;
    this.t = 0;
    this.tab = 0;
    this.sel = 0;
    this.scroll = 0;
    this.toast = null;
    this.embers = [];
    for (let i = 0; i < 40; i++) {
      this.embers.push({ x: Math.random() * CFG.VIEW_W, y: Math.random() * CFG.VIEW_H, s: 0.4 + Math.random() });
    }
  }

  enter(params = {}) {
    this.save = params.save || this.engine.save;
    this.from = params.from || 'menu';
    this.art = this.engine.sprites;
    this.t = 0;
    this.sel = 0;
    this.scroll = 0;
    this.toast = null;
  }
  exit() { saveSave(this.save); }

  // ---------------- data for the current tab ----------------
  items() {
    if (this.tab === 0) return PLAYER_TRACKS.map(t => ({ kind: 'track', track: t }));
    if (this.tab === 1) return TRAIN_TRACKS.map(t => ({ kind: 'track', track: t }));
    return [
      ...CHAR_SKINS.map(s => ({ kind: 'charSkin', skin: s })),
      ...TRAIN_SKINS.map(s => ({ kind: 'trainSkin', skin: s })),
    ];
  }

  _levelOf(track) { return (this.save.permaLevels?.[track.id]) || 0; }
  _owned(item) {
    if (item.kind === 'charSkin') return (this.save.ownedCharSkins || []).includes(item.skin.id) || item.skin.cost === 0;
    if (item.kind === 'trainSkin') return (this.save.ownedTrainSkins || []).includes(item.skin.id) || item.skin.cost === 0;
    return false;
  }
  _equipped(item) {
    if (item.kind === 'charSkin') return this.save.charSkin === item.skin.id;
    if (item.kind === 'trainSkin') return this.save.trainSkin === item.skin.id;
    return false;
  }
  _price(item) {
    if (item.kind === 'track') {
      const l = this._levelOf(item.track);
      return l >= (item.track.max || 10) ? null : trackCost(item.track, l);
    }
    return this._owned(item) ? null : item.skin.cost;
  }

  _buy(item) {
    if (!item) return;
    const save = this.save;
    if (item.kind === 'track') {
      const t = item.track;
      const l = this._levelOf(t);
      if (l >= (t.max || 10)) return this._say('FULLY FORGED', '#ffb020');
      const cost = trackCost(t, l);
      if (!spendCoins(save, cost)) return this._say('NOT ENOUGH COINS', '#ff4d6a');
      save.permaLevels = save.permaLevels || {};
      save.permaLevels[t.id] = l + 1;
      this._say(t.name.toUpperCase() + ' → ' + (l + 1), '#5ad07a');
      this._sparks();
    } else {
      const s = item.skin;
      const listKey = item.kind === 'charSkin' ? 'ownedCharSkins' : 'ownedTrainSkins';
      const eqKey = item.kind === 'charSkin' ? 'charSkin' : 'trainSkin';
      save[listKey] = save[listKey] || [];
      if (this._owned(item)) {
        if (save[eqKey] === s.id) return this._say('ALREADY EQUIPPED', '#9aa0b4');
        save[eqKey] = s.id;
        this._say('EQUIPPED ' + s.name.toUpperCase(), '#8ef0ff');
      } else {
        if (!spendCoins(save, s.cost)) return this._say('NOT ENOUGH COINS', '#ff4d6a');
        save[listKey].push(s.id);
        save[eqKey] = s.id;
        this._say('UNLOCKED ' + s.name.toUpperCase(), RCOL[s.rarity] || '#ffe066');
        this._sparks();
      }
    }
    saveSave(save);
  }
  _say(msg, color) { this.toast = { msg, color, t: 1.6 }; }
  _sparks() { this.flashT = 0.35; }

  // ---------------- update ----------------
  update(dt) {
    const inp = this.input;
    this.t += dt;
    if (this.toast) { this.toast.t -= dt; if (this.toast.t <= 0) this.toast = null; }
    if (this.flashT > 0) this.flashT -= dt;

    const items = this.items();
    const rows = this._rowGeometry(items.length);

    if (inp.wasPressed('Escape') || inp.wasPressed('Backspace')) {
      inp.endFrame(); saveSave(this.save); this.engine.setScene(this.from, { save: this.save }); return;
    }
    if (inp.wasPressed('KeyQ') || inp.wasPressed('ArrowLeft') || inp.wasPressed('KeyA')) { this.tab = (this.tab + 2) % 3; this.sel = 0; this.scroll = 0; }
    if (inp.wasPressed('KeyE') || inp.wasPressed('ArrowRight') || inp.wasPressed('KeyD')) { this.tab = (this.tab + 1) % 3; this.sel = 0; this.scroll = 0; }
    if (inp.wasPressed('ArrowDown') || inp.wasPressed('KeyS')) this.sel = Math.min(items.length - 1, this.sel + 1);
    if (inp.wasPressed('ArrowUp') || inp.wasPressed('KeyW')) this.sel = Math.max(0, this.sel - 1);
    if (inp.wasPressed('Enter') || inp.wasPressed('Space')) this._buy(items[this.sel]);

    // mouse
    const mx = inp.mouse.x, my = inp.mouse.y;
    for (let i = 0; i < TABS.length; i++) {
      const tb = this._tabRect(i);
      if (hitRect(mx, my, tb.x, tb.y, tb.w, tb.h)) {
        if (inp.mouse.justDown) { this.tab = i; this.sel = 0; this.scroll = 0; }
      }
    }
    for (let i = 0; i < rows.length; i++) {
      const r = rows[i];
      if (r.y < 40 || r.y > CFG.VIEW_H - 26) continue;
      if (hitRect(mx, my, r.x, r.y, r.w, r.h)) {
        this.sel = i;
        if (inp.mouse.justDown) this._buy(items[i]);
      }
    }
    // back button
    const bb = { x: 6, y: CFG.VIEW_H - 16, w: 52, h: 12 };
    if (inp.mouse.justDown && hitRect(mx, my, bb.x, bb.y, bb.w, bb.h)) {
      saveSave(this.save); inp.endFrame(); this.engine.setScene(this.from, { save: this.save }); return;
    }

    // keep selection visible
    const visible = Math.floor((CFG.VIEW_H - 70) / ROW_H);
    if (this.sel < this.scroll) this.scroll = this.sel;
    if (this.sel >= this.scroll + visible) this.scroll = this.sel - visible + 1;
    this.scroll = Math.max(0, Math.min(Math.max(0, items.length - visible), this.scroll));

    for (const e of this.embers) {
      e.y -= (10 + e.s * 14) * dt;
      e.x += Math.sin(this.t * 1.6 + e.s * 9) * 6 * dt;
      if (e.y < -4) { e.y = CFG.VIEW_H + 4; e.x = Math.random() * CFG.VIEW_W; }
    }
    inp.endFrame();
  }

  _tabRect(i) {
    const w = 86, gap = 4;
    const total = TABS.length * w + (TABS.length - 1) * gap;
    return { x: (CFG.VIEW_W - total) / 2 + i * (w + gap), y: 24, w, h: 14 };
  }
  _rowGeometry(n) {
    const out = [];
    const x = 8, w = 264;
    for (let i = 0; i < n; i++) {
      out.push({ x, y: 44 + (i - this.scroll) * ROW_H, w, h: ROW_H - 2 });
    }
    return out;
  }

  // ---------------- render ----------------
  render(ctx) {
    const W = CFG.VIEW_W, H = CFG.VIEW_H;
    // backdrop: forge interior
    const g = ctx.createLinearGradient(0, 0, 0, H);
    g.addColorStop(0, '#160a12'); g.addColorStop(0.6, '#0d0710'); g.addColorStop(1, '#20090a');
    ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
    // furnace glow
    const fg = ctx.createRadialGradient(W / 2, H + 20, 10, W / 2, H + 20, 220);
    fg.addColorStop(0, 'rgba(255,90,20,0.35)'); fg.addColorStop(1, 'rgba(255,90,20,0)');
    ctx.fillStyle = fg; ctx.fillRect(0, 0, W, H);
    for (const e of this.embers) {
      ctx.fillStyle = 'rgba(255,150,50,' + (0.25 + e.s * 0.4).toFixed(2) + ')';
      ctx.fillRect(e.x | 0, e.y | 0, 1, e.s > 1 ? 2 : 1);
    }

    // header
    ctx.fillStyle = 'rgba(0,0,0,0.55)'; ctx.fillRect(0, 0, W, 20);
    textC(ctx, 'THE HELL FORGE', W / 2, 14, '#ff8a30', 13, true);
    const coinF = this.art.anim?.coin?.[Math.floor(this.t * 8) % 8];
    if (coinF) ctx.drawImage(coinF, W - 70, 5);
    textR(ctx, fmtNum(this.save.coins || 0), W - 8, 14, '#ffe878', 10, true);
    text(ctx, 'SPENT ' + fmtNum(totalSpent(this.save)), 6, 14, '#6b6b80', 6);

    // tabs
    for (let i = 0; i < TABS.length; i++) {
      const r = this._tabRect(i);
      const on = i === this.tab;
      drawPanel(ctx, r.x, r.y, r.w, r.h, on ? TABS[i].color : '#3d3d4d',
        on ? hexA(TABS[i].color, 0.18) : 'rgba(8,6,14,0.9)');
      textC(ctx, TABS[i].name, r.x + r.w / 2, r.y + 10, on ? '#ffffff' : '#8a8aa0', 7, true);
    }

    const items = this.items();
    const rows = this._rowGeometry(items.length);
    ctx.save();
    ctx.beginPath(); ctx.rect(0, 42, 276, H - 60); ctx.clip();
    for (let i = 0; i < items.length; i++) {
      const r = rows[i];
      if (r.y + r.h < 42 || r.y > H - 18) continue;
      this._drawRow(ctx, items[i], r, i === this.sel);
    }
    ctx.restore();

    // scroll hint
    if (items.length * ROW_H > H - 70) {
      const trackH = H - 70;
      const kh = Math.max(10, trackH * (trackH / (items.length * ROW_H)));
      const ky = 44 + (this.scroll / Math.max(1, items.length)) * trackH;
      ctx.fillStyle = '#2a2a38'; ctx.fillRect(274, 44, 2, trackH);
      ctx.fillStyle = '#ff8a30'; ctx.fillRect(274, ky, 2, kh);
    }

    // ---- detail panel ----
    this._drawDetail(ctx, items[this.sel], 282, 44, W - 290, H - 66);

    // footer
    ctx.fillStyle = 'rgba(0,0,0,0.6)'; ctx.fillRect(0, H - 18, W, 18);
    drawPanel(ctx, 6, H - 16, 52, 12, '#8a8aa0');
    textC(ctx, 'BACK (ESC)', 32, H - 7, '#cfd4e0', 6, true);
    text(ctx, 'Q/E TABS   W/S SELECT   ENTER BUY', 66, H - 7, '#5a5a70', 6);

    if (this.toast) {
      const a = Math.min(1, this.toast.t * 2);
      ctx.globalAlpha = a;
      drawPanel(ctx, W / 2 - 84, H - 40, 168, 16, this.toast.color);
      textC(ctx, this.toast.msg, W / 2, H - 29, this.toast.color, 7, true);
      ctx.globalAlpha = 1;
    }
    if (this.flashT > 0) {
      ctx.fillStyle = 'rgba(255,200,120,' + (this.flashT * 0.5).toFixed(2) + ')';
      ctx.fillRect(0, 0, W, H);
    }
  }

  _drawRow(ctx, item, r, selected) {
    const isTrack = item.kind === 'track';
    const color = isTrack ? (this.tab === 0 ? '#ff8a30' : '#8ef0ff') : (RCOL[item.skin.rarity] || '#9aa0b4');
    const name = isTrack ? item.track.name : item.skin.name;
    const icon = isTrack ? item.track.icon : (item.kind === 'charSkin' ? 'ghost' : 'train');
    const lvl = isTrack ? this._levelOf(item.track) : 0;
    const max = isTrack ? (item.track.max || 10) : 0;
    const price = this._price(item);
    const afford = price === null || (this.save.coins || 0) >= price;

    drawPanel(ctx, r.x, r.y, r.w, r.h, selected ? '#ffffff' : hexA(color, 0.5),
      selected ? hexA(color, 0.16) : 'rgba(10,8,16,0.85)');
    drawIcon(ctx, icon, r.x + 3, r.y + 3, 16, color);
    text(ctx, name.toUpperCase(), r.x + 23, r.y + 10, selected ? '#ffffff' : '#cfd4e0', 7, true);

    if (isTrack) {
      // pip bar
      const px = r.x + 23, py = r.y + 13;
      const pw = Math.min(96, max * 8);
      for (let i = 0; i < max; i++) {
        ctx.fillStyle = i < lvl ? color : '#2a2a38';
        ctx.fillRect(px + i * (pw / max), py, Math.max(2, pw / max - 1), 3);
      }
      text(ctx, lvl + '/' + max, px + pw + 4, py + 4, '#8a8aa0', 6);
    } else {
      const tag = this._equipped(item) ? 'EQUIPPED' : this._owned(item) ? 'OWNED' : item.skin.rarity.toUpperCase();
      text(ctx, tag, r.x + 23, r.y + 18, this._equipped(item) ? '#5ad07a' : color, 6, true);
    }

    // price
    if (price === null) {
      textR(ctx, isTrack ? 'MAX' : (this._equipped(item) ? '✓' : 'EQUIP'), r.x + r.w - 5, r.y + 13,
        isTrack ? '#ffb020' : '#5ad07a', 7, true);
    } else {
      textR(ctx, fmtNum(price), r.x + r.w - 5, r.y + 13, afford ? '#ffe878' : '#8a4a4a', 8, true);
    }
  }

  _drawDetail(ctx, item, x, y, w, h) {
    drawPanel(ctx, x, y, w, h, '#5a3a2a', 'rgba(14,8,14,0.92)');
    if (!item) return;
    const isTrack = item.kind === 'track';
    const color = isTrack ? (this.tab === 0 ? '#ff8a30' : '#8ef0ff') : (RCOL[item.skin.rarity] || '#9aa0b4');

    if (isTrack) {
      const t = item.track;
      const lvl = this._levelOf(t);
      const max = t.max || 10;
      drawIcon(ctx, t.icon, x + w / 2 - 14, y + 8, 28, color);
      textC(ctx, t.name.toUpperCase(), x + w / 2, y + 50, color, 10, true);
      const lines = wrapLines(ctx, t.desc, w - 14, 6);
      let ly = y + 62;
      for (const ln of lines) { textC(ctx, ln, x + w / 2, ly, '#cfd4e0', 6); ly += 8; }
      ly += 6;
      textC(ctx, 'CURRENT', x + w / 2, ly, '#6b6b80', 6, true); ly += 9;
      textC(ctx, '+' + trackValue(t, lvl) + ' ' + t.unit, x + w / 2, ly, '#ffffff', 8, true); ly += 12;
      if (lvl < max) {
        textC(ctx, 'NEXT LEVEL', x + w / 2, ly, '#6b6b80', 6, true); ly += 9;
        textC(ctx, '+' + trackValue(t, lvl + 1) + ' ' + t.unit, x + w / 2, ly, '#5ad07a', 8, true); ly += 14;
        drawBar(ctx, x + 10, ly, w - 20, 4, lvl / max, color);
        ly += 14;
        const cost = trackCost(t, lvl);
        const afford = (this.save.coins || 0) >= cost;
        drawPanel(ctx, x + 10, ly, w - 20, 16, afford ? '#ffe878' : '#5a3a3a',
          afford ? 'rgba(60,40,10,0.9)' : 'rgba(30,10,10,0.9)');
        textC(ctx, 'FORGE — ' + fmtNum(cost), x + w / 2, ly + 11, afford ? '#ffe878' : '#8a4a4a', 8, true);
      } else {
        textC(ctx, 'FULLY FORGED', x + w / 2, ly + 6, '#ffb020', 9, true);
      }
    } else {
      const s = item.skin;
      // animated live preview
      const cx = x + w / 2, cy = y + 40;
      ctx.fillStyle = 'rgba(0,0,0,0.35)';
      ctx.beginPath(); ctx.ellipse(cx, cy + 22, 26, 6, 0, 0, TAU); ctx.fill();
      try {
        if (item.kind === 'charSkin') {
          const set = this.art.getCharSet(s.id);
          const frames = set.side.run;
          const f = frames[Math.floor(this.t * 10) % frames.length];
          ctx.save(); ctx.translate(cx, cy); ctx.scale(2, 2);
          ctx.drawImage(f, -f.width / 2, -f.height / 2);
          ctx.restore();
        } else {
          const set = this.art.getTrainSet(s.id);
          const f = set.engine[Math.floor(this.t * 10) % set.engine.length];
          ctx.save(); ctx.translate(cx, cy + 6); ctx.scale(1.15, 1.15);
          ctx.drawImage(f, -f.width / 2, -f.height / 2);
          ctx.restore();
        }
      } catch (err) { /* preview only */ }

      textC(ctx, s.name.toUpperCase(), cx, y + 78, color, 10, true);
      textC(ctx, s.rarity.toUpperCase(), cx, y + 88, color, 6, true);
      const lines = wrapLines(ctx, s.desc, w - 14, 6);
      let ly = y + 102;
      for (const ln of lines) { textC(ctx, ln, cx, ly, '#cfd4e0', 6); ly += 8; }
      ly += 6;
      // palette swatches
      const pal = Object.values(s.pal);
      const sw = Math.min(10, (w - 24) / pal.length);
      for (let i = 0; i < pal.length; i++) {
        ctx.fillStyle = pal[i];
        ctx.fillRect(x + 12 + i * sw, ly, sw - 1, 6);
      }
      ly += 16;
      const owned = this._owned(item);
      const eq = this._equipped(item);
      const cost = s.cost;
      const afford = (this.save.coins || 0) >= cost;
      const label = eq ? 'EQUIPPED' : owned ? 'EQUIP' : 'UNLOCK — ' + fmtNum(cost);
      const bc = eq ? '#5ad07a' : owned ? '#8ef0ff' : (afford ? '#ffe878' : '#5a3a3a');
      drawPanel(ctx, x + 10, ly, w - 20, 16, bc, 'rgba(20,14,24,0.9)');
      textC(ctx, label, cx, ly + 11, bc, 8, true);
    }
  }
}

const ROW_H = 24;

function wrapLines(ctx, str, w, size) {
  ctx.font = size + 'px monospace';
  const words = String(str || '').split(/\s+/);
  const out = [];
  let cur = '';
  for (const word of words) {
    const test = cur ? cur + ' ' + word : word;
    if (ctx.measureText(test).width > w && cur) { out.push(cur); cur = word; }
    else cur = test;
  }
  if (cur) out.push(cur);
  return out;
}
