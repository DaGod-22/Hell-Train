import { ASSETS } from '../js/data/sprites.js';
import { gridToRGBA, renderSheet, savePng } from './render_preview.js';

const S = 8;
const items = [];
for (const a of ASSETS) {
  const { w, h, rgba } = gridToRGBA(a.grid, a.map);
  items.push({ name: a.key, w, h, rgba });
}
savePng('sprites_sheet.png', renderSheet(items, S, 6, 8));
// Big previews
for (const a of ASSETS) {
  if (!/player|trainEngine|boss/.test(a.key)) continue;
  const { w, h, rgba } = gridToRGBA(a.grid, a.map);
  savePng('big_' + a.key + '.png', renderSheet([{ name: a.key, w, h, rgba }], 10, 1, 0));
}
console.log('rendered', items.length, 'assets');
