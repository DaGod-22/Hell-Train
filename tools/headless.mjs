// Headless harness: boots the real game in Node using @napi-rs/canvas
// Usage: node tools/headless.mjs [frames] [outPrefix] [script]
import { createCanvas } from '@napi-rs/canvas';
import fs from 'fs';

const errors = [];
const logs = [];

function makeStyle() { return new Proxy({}, { get: (t, k) => t[k] ?? '', set: (t, k, v) => (t[k] = v, true) }); }

function makeCanvasEl(w = 300, h = 150) {
  const c = createCanvas(w, h);
  c.style = makeStyle();
  c.className = ''; c.id = '';
  c.getBoundingClientRect = () => ({ left: 0, top: 0, width: 1280, height: 720, right: 1280, bottom: 720 });
  c.addEventListener = () => {}; c.removeEventListener = () => {};
  c.appendChild = () => {}; c.focus = () => {}; c.setAttribute = () => {};
  return c;
}

const nodes = {};
function makeEl(tag) {
  if (tag === 'canvas') return makeCanvasEl();
  return {
    tagName: tag, style: makeStyle(), className: '', id: '', innerHTML: '', textContent: '',
    children: [], appendChild(c) { this.children.push(c); }, removeChild() {},
    addEventListener() {}, removeEventListener() {}, setAttribute() {},
    getBoundingClientRect() { return { left: 0, top: 0, width: 1280, height: 720, right: 1280, bottom: 720 }; },
  };
}

const listeners = {};
global.document = {
  createElement: makeEl,
  getElementById: (id) => (nodes[id] ||= makeEl('div')),
  querySelector: () => null,
  body: makeEl('body'),
  addEventListener: (k, f) => ((listeners[k] ||= []).push(f)),
  removeEventListener: () => {},
  fonts: { ready: Promise.resolve(), load: () => Promise.resolve() },
};
const store = {};
global.localStorage = {
  getItem: (k) => (k in store ? store[k] : null),
  setItem: (k, v) => (store[k] = String(v)),
  removeItem: (k) => delete store[k],
};
let rafQueue = [];
global.requestAnimationFrame = (cb) => { rafQueue.push(cb); return rafQueue.length; };
global.cancelAnimationFrame = () => {};
global.performance = { now: () => nowMs };
global.window = {
  addEventListener: (k, f) => ((listeners[k] ||= []).push(f)),
  removeEventListener: () => {},
  location: { search: '', href: 'http://localhost/' },
  devicePixelRatio: 1, innerWidth: 1280, innerHeight: 720,
  localStorage: global.localStorage,
  requestAnimationFrame: global.requestAnimationFrame,
  setTimeout, clearTimeout, setInterval: () => 0, clearInterval: () => {},
  AudioContext: undefined, webkitAudioContext: undefined,
  matchMedia: () => ({ matches: false, addEventListener() {} }),
  navigator: { userAgent: 'node' },
};
global.window.navigator = globalThis.navigator;
global.Image = class { set src(v) { this._s = v; setTimeout(() => this.onload?.(), 0); } };
global.setInterval = () => 0;

let nowMs = 0;

const origError = console.error;
console.error = (...a) => { errors.push(a.map(String).join(' ')); origError(...a); };
process.on('uncaughtException', (e) => { errors.push('UNCAUGHT ' + (e.stack || e)); });
process.on('unhandledRejection', (e) => { errors.push('UNHANDLED ' + (e?.stack || e)); });

const frames = parseInt(process.argv[2] || '120', 10);
const prefix = process.argv[3] || 'shot';
const scriptName = process.argv[4] || '';

await import('../js/main.js');
await new Promise(r => setTimeout(r, 50));

const eng = global.__ENGINE__;
if (!eng) { console.log('NO ENGINE EXPORTED (set window/global __ENGINE__ in main.js for harness)'); }

// Scripted interactions: [frameNumber, fn]
const scripts = {
  '': [],
  menu: [],
  play: [[2, (e) => e.setScene('gameplay', { save: e.save, realmId: process.env.REALM || 'purgatory', stage: 1, difficulty: 'normal' })]],
  shop: [[2, (e) => e.setScene('shop', { save: e.save, from: 'menu' })]],
  cards: [[2, (e) => e.setScene('gameplay', { save: e.save, realmId: 'purgatory', stage: 1, difficulty: 'normal' })],
          [8, (e) => { const g = e.scenes.gameplay; g.pendingLevelUps = 1; g.player.level = 7; g._openCards(); }]],
  sim: [[2, (e) => e.setScene('gameplay', { save: e.save, realmId: process.env.REALM || 'purgatory', stage: 1, difficulty: 'normal' })],
        [-1, null]],
  death: [[2, (e) => e.setScene('gameplay', { save: e.save, realmId: 'purgatory', stage: 1, difficulty: 'normal' })],
          [40, (e) => { const g = e.scenes.gameplay; g.player.hp = 0; g.player.alive = false; g.player.deathT = 0; }]],
  pause: [[2, (e) => e.setScene('gameplay', { save: e.save, realmId: 'purgatory', stage: 1, difficulty: 'normal' })],
          [40, (e) => e.setScene('pause', { from: 'gameplay', ctx: e.scenes.gameplay })]],
  coinshop: [[2, (e) => e.setScene('coinShop', { save: e.save })]],
  charsel: [[2, (e) => e.setScene('characterSelect', { save: e.save })]],
  boss: [[2, (e) => e.setScene('gameplay', { save: e.save, realmId: 'infernal', stage: 3, difficulty: 'normal' })],
         [30, (e) => e.scenes.gameplay._spawnBoss()]],
};
const actions = scripts[scriptName] || [];

function step(dtMs = 16.7) {
  nowMs += dtMs;
  const q = rafQueue; rafQueue = [];
  for (const cb of q) { try { cb(nowMs); } catch (e) { errors.push('RAF ' + (e.stack || e)); } }
}

const auto = scriptName === 'sim';
for (let i = 0; i < frames; i++) {
  for (const [f, fn] of actions) if (f === i) { try { fn(eng); } catch (e) { errors.push('ACT ' + e.stack); } }
  if (auto) {
    const g = eng?.scenes?.gameplay;
    if (g?.cards) { try { g._pickCard(Math.floor(Math.random() * g.cards.length)); } catch (e) { errors.push('CARD ' + e.stack); } }
    if (g?.player) { g.player.hp = g.player.maxHp; }
  }
  step();
}

if (eng) {
  fs.mkdirSync('shots', { recursive: true });
  fs.writeFileSync(`shots/${prefix}.png`, eng.canvas.toBuffer('image/png'));
  console.log('wrote shots/' + prefix + '.png');
}
const g = eng?.scenes?.gameplay;
if (g && g.player && scriptName !== '') {
  console.log('STATS', JSON.stringify({
    t: +g.runTime.toFixed(1), kills: g.runStats.kills, coins: g.runCoins, lvl: g.player.level,
    hp: Math.round(g.player.hp), maxHp: Math.round(g.player.maxHp), enemies: g.enemies.length,
    proj: g.projectiles.length, pickups: g.pickups.length, particles: g.fx.list.length,
    trainHp: Math.round(g.train.hp), cards: !!g.cards, owned: Object.keys(g.owned).length,
    weapons: g.player.weapons.map(w => w.id),
  }));
}
console.log('ERRORS:', errors.length);
for (const e of errors.slice(0, 10)) console.log('---\n' + e);
