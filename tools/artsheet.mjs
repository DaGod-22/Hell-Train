// Renders a contact sheet of the procedural art so we can eyeball it.
// node tools/artsheet.mjs
import { createCanvas } from '@napi-rs/canvas';
import fs from 'fs';

function makeStyle() { return new Proxy({}, { get: (t, k) => t[k] ?? '', set: (t, k, v) => (t[k] = v, true) }); }
global.document = {
  createElement: (tag) => {
    if (tag !== 'canvas') return { style: makeStyle(), appendChild() {}, addEventListener() {} };
    const c = createCanvas(1, 1);
    c.style = makeStyle();
    return c;
  },
  getElementById: () => ({ style: makeStyle(), appendChild() {}, addEventListener() {} }),
  addEventListener() {},
};
global.window = { addEventListener() {}, devicePixelRatio: 1 };

const { buildArt, buildCharSet, buildTrainSet } = await import('../js/data/art.js');
const t0 = Date.now();
const S = buildArt();
console.log('art built in', Date.now() - t0, 'ms');

const rows = [];
const push = (label, frames) => rows.push({ label, frames: frames.filter(Boolean) });

const skin = process.argv[2] || 'conductor';
const cs = buildCharSet(skin);
push('char down idle', cs.down.idle);
push('char down run', cs.down.run);
push('char side run', cs.side.run);
push('char up run', cs.up.run);
push('char down attack', cs.down.attack);
push('char side attack', cs.side.attack);
const ts = buildTrainSet(process.argv[3] || 'iron_horse');
push('train engine', ts.engine.slice(0, 4));
push('train cargo', ts.cargo.slice(0, 2));
push('train gun', ts.gun.slice(0, 2));
for (const k of ['ghost', 'wraith', 'crawler', 'hound', 'brute', 'knight', 'caster', 'summoner', 'flyer', 'blob', 'egg']) push(k, S.anim[k]);
for (const k of ['bossConductor', 'bossAshen', 'bossBell', 'bossRoot', 'bossFrost', 'bossSand', 'bossNull', 'bossTrain']) push(k, S.anim[k].slice(0, 4));
push('coin', S.anim.coin);
push('pickups', [S.xp, S.xpBig, S.shard, S.heart, S.chest, S.magnet]);
push('proj', [S.orbFire, S.orbIce, S.orbVoid, S.orbShadow, S.orbLight, S.orbPlasma, S.orbToxic, S.sawBlade, S.missile, S.bomb, S.railSlug]);
push('explFire', S.fx.explFire);
push('explVoid', S.fx.explVoid);

const SC = 4, PAD = 6, LABELW = 130;
let W = LABELW, H = PAD;
for (const r of rows) {
  let rw = LABELW, rh = 0;
  for (const f of r.frames) { rw += f.width * SC + PAD; rh = Math.max(rh, f.height * SC); }
  W = Math.max(W, rw + PAD); H += rh + PAD + 4;
}
const c = createCanvas(W, H);
const ctx = c.getContext('2d');
ctx.fillStyle = '#12101c'; ctx.fillRect(0, 0, W, H);
ctx.imageSmoothingEnabled = false;
let y = PAD;
for (const r of rows) {
  let x = LABELW, rh = 0;
  ctx.fillStyle = '#ffe066'; ctx.font = '12px sans-serif';
  ctx.fillText(r.label, 6, y + 16);
  for (const f of r.frames) {
    ctx.drawImage(f, x, y, f.width * SC, f.height * SC);
    x += f.width * SC + PAD; rh = Math.max(rh, f.height * SC);
  }
  y += rh + PAD + 4;
  ctx.strokeStyle = '#2a2438'; ctx.beginPath(); ctx.moveTo(0, y - 4); ctx.lineTo(W, y - 4); ctx.stroke();
}
fs.mkdirSync('shots', { recursive: true });
fs.writeFileSync('shots/artsheet.png', c.toBuffer('image/png'));
console.log('wrote shots/artsheet.png', W, 'x', H);
