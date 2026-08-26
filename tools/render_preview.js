// Render sprite grids to a PNG contact sheet (Node, no deps)
// Usage: node tools/render_preview.js
import { deflateSync } from 'zlib';
import { writeFileSync, mkdirSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { PAL } from '../js/core/config.js';

const __dirname = dirname(fileURLToPath(import.meta.url));

function crc32(buf) {
  let c, crc = 0xffffffff;
  for (let n = 0; n < buf.length; n++) {
    c = (crc ^ buf[n]) & 0xff;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    crc = (crc >>> 8) ^ c;
  }
  return (crc ^ 0xffffffff) >>> 0;
}
function chunk(type, data) {
  const t = Buffer.from(type, 'ascii');
  const len = Buffer.alloc(4); len.writeUInt32BE(data.length);
  const crc = Buffer.alloc(4); crc.writeUInt32BE(crc32(Buffer.concat([t, data])));
  return Buffer.concat([len, t, data, crc]);
}
function encodePNG(width, height, rgba) {
  const raw = Buffer.alloc((width * 4 + 1) * height);
  for (let y = 0; y < height; y++) {
    raw[y * (width * 4 + 1)] = 0;
    rgba.copy(raw, y * (width * 4 + 1) + 1, y * width * 4, (y + 1) * width * 4);
  }
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0); ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8; ihdr[9] = 6;
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk('IHDR', ihdr),
    chunk('IDAT', deflateSync(raw, { level: 9 })),
    chunk('IEND', Buffer.alloc(0)),
  ]);
}

function hexToRgb(hex) {
  return [parseInt(hex.slice(1, 3), 16), parseInt(hex.slice(3, 5), 16), parseInt(hex.slice(5, 7), 16)];
}

export function gridToRGBA(grid, map) {
  const h = grid.length, w = grid[0].length;
  const rgba = Buffer.alloc(w * h * 4);
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const ch = grid[y][x] || '.';
      let col = null;
      if (ch !== '.') col = map[ch] || PAL[ch] || null;
      const idx = (y * w + x) * 4;
      if (col) {
        const [r, g, b] = hexToRgb(col);
        rgba[idx] = r; rgba[idx + 1] = g; rgba[idx + 2] = b; rgba[idx + 3] = 255;
      }
    }
  }
  return { w, h, rgba };
}

// Contact sheet with scale factor and checkerboard background
export function renderSheet(items, scale = 8, cols = 10, gap = 4) {
  const iw = Math.max(...items.map(i => i.w)), ih = Math.max(...items.map(i => i.h));
  const W = cols * (iw + gap) * scale, H = Math.ceil(items.length / cols) * (ih + gap) * scale;
  const rgba = Buffer.alloc(W * H * 4);
  // checkerboard
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    const chk = ((x / scale / 8 | 0) + (y / scale / 8 | 0)) % 2 ? 28 : 22;
    const idx = (y * W + x) * 4;
    rgba[idx] = chk; rgba[idx + 1] = chk; rgba[idx + 2] = chk; rgba[idx + 3] = 255;
  }
  items.forEach((item, n) => {
    const cx = (n % cols) * (iw + gap) * scale, cy = Math.floor(n / cols) * (ih + gap) * scale;
    const ox = Math.floor((iw - item.w) / 2) * scale, oy = Math.floor((ih - item.h) / 2) * scale;
    for (let y = 0; y < item.h; y++) for (let x = 0; x < item.w; x++) {
      const si = (y * item.w + x) * 4;
      if (item.rgba[si + 3] === 0) continue;
      for (let sy = 0; sy < scale; sy++) for (let sx = 0; sx < scale; sx++) {
        const dx = cx + ox + x * scale + sx, dy = cy + oy + y * scale + sy;
        const di = (dy * W + dx) * 4;
        rgba[di] = item.rgba[si]; rgba[di + 1] = item.rgba[si + 1]; rgba[di + 2] = item.rgba[si + 2]; rgba[di + 3] = 255;
      }
    }
  });
  return encodePNG(W, H, rgba);
}

export function savePng(name, buf) {
  const out = join(__dirname, '..', 'art', name);
  mkdirSync(dirname(out), { recursive: true });
  writeFileSync(out, buf);
  console.log('wrote', out);
}
