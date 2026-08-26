// ============================================================
// HELL TRAIN — procedural map generation
// Builds a chunk-based world for each realm/stage
// ============================================================
import { RNG, randInt } from './utils.js';
import { REALM_ROSTERS } from '../data/enemies.js';

const TILE = 16;
export const TILE_SIZE = TILE;

// Tile kinds
export const T = {
  EMPTY: 0, FLOOR: 1, WALL: 2, TREE: 3, ROCK: 4,
  WATER: 5, LAVA: 6, ICE: 7, SAND: 8, VOID: 9,
  ASH: 10, SNOW: 11, TRACK: 12, PLATFORM: 13,
};

// Biomes -> default tile weights for floor/wall/doodad
const BIOMES = {
  purgatory: { ground: T.FLOOR, decor: [T.TREE, T.ROCK], hazard: T.WATER, fog: 0.5 },
  infernal:  { ground: T.ASH, decor: [T.ROCK, T.LAVA], hazard: T.LAVA, fog: 0.0 },
  forgotten: { ground: T.FLOOR, decor: [T.ROCK, T.WALL], hazard: T.WATER, fog: 0.2 },
  forest:    { ground: T.FLOOR, decor: [T.TREE, T.TREE], hazard: T.WATER, fog: 0.3 },
  frozen:    { ground: T.ICE, decor: [T.ROCK, T.SNOW], hazard: T.ICE, fog: 0.4 },
  desert:    { ground: T.SAND, decor: [T.ROCK, T.ROCK], hazard: T.SAND, fog: 0.1 },
  void:      { ground: T.VOID, decor: [T.VOID, T.VOID], hazard: T.VOID, fog: 0.0 },
  terminus:  { ground: T.PLATFORM, decor: [T.WALL], hazard: T.VOID, fog: 0.0 },
  phantom:   { ground: T.VOID, decor: [T.VOID, T.VOID], hazard: T.VOID, fog: 0.6 },
};

export class World {
  constructor(seed, realmId, difficulty) {
    this.seed = seed >>> 0;
    this.rng = new RNG(this.seed);
    this.realmId = realmId;
    this.difficulty = difficulty;
    this.biome = BIOMES[realmId] || BIOMES.purgatory;
    // Multiple rooms stitched together
    this.rooms = [];
    this.connections = [];
    this.specials = {}; // boss room, elite room, shop, treasure, event
    this._generate();
  }

  _generate() {
    const numRooms = 10 + Math.floor(this.rng.next() * 4);
    const W = 60, H = 60;
    // Layout rooms in a non-linear chain; one path always leads to a boss room.
    let cx = Math.floor(W / 2), cy = Math.floor(H / 2);
    const startRoom = { x: cx, y: cy, w: 14, h: 10, id: 'start', kind: 'start', visited: true };
    this.rooms.push(startRoom);
    let lastRoom = startRoom;
    for (let i = 0; i < numRooms; i++) {
      // pick a random adjacent position
      const dir = this.rng.int(0, 3);
      const offset = 18 + this.rng.int(0, 6);
      let nx = lastRoom.x, ny = lastRoom.y;
      if (dir === 0) nx += lastRoom.w / 2 + offset;
      if (dir === 1) nx -= lastRoom.w / 2 + offset;
      if (dir === 2) ny += lastRoom.h / 2 + offset;
      if (dir === 3) ny -= lastRoom.h / 2 + offset;
      nx = Math.max(2, Math.min(W - 16, nx - 7));
      ny = Math.max(2, Math.min(H - 14, ny - 5));
      const w = 12 + this.rng.int(0, 6);
      const h = 9 + this.rng.int(0, 4);
      const room = {
        x: nx, y: ny, w, h, id: 'r' + i, kind: this._pickKind(i, numRooms),
      };
      this.rooms.push(room);
      this.connections.push({ from: lastRoom, to: room });
      lastRoom = room;
    }
    // Boss room at the end
    const bossRoom = { x: lastRoom.x + lastRoom.w / 2 + 14, y: lastRoom.y, w: 18, h: 14,
      id: 'boss', kind: 'boss' };
    this.rooms.push(bossRoom);
    this.connections.push({ from: lastRoom, to: bossRoom });

    // Tile grid (W*H tiles)
    this.W = W; this.H = H;
    this.tiles = new Uint8Array(W * H);
    this.solid = new Uint8Array(W * H); // 1 if blocking
    this.doodad = new Uint8Array(W * H); // 0..3 variants
    this.lights = []; // (x,y,radius,color)
    this._stampRooms();
    this._stampPaths();
    this._addSpecials();
  }

  _pickKind(i, total) {
    const r = this.rng.next();
    if (i === 0) return 'combat';
    if (i === total - 1) return 'elite';
    if (r < 0.55) return 'combat';
    if (r < 0.7) return 'elite';
    if (r < 0.8) return 'treasure';
    if (r < 0.88) return 'shop';
    return 'event';
  }

  _stampRooms() {
    for (const r of this.rooms) {
      const x0 = Math.floor(r.x), y0 = Math.floor(r.y);
      const x1 = Math.floor(r.x + r.w), y1 = Math.floor(r.y + r.h);
      for (let y = y0; y < y1; y++) {
        for (let x = x0; x < x1; x++) {
          if (x < 0 || y < 0 || x >= this.W || y >= this.H) continue;
          const idx = y * this.W + x;
          this.tiles[idx] = this.biome.ground;
          this.solid[idx] = 0;
          // walls on perimeter for certain kinds
          const onEdge = x === x0 || y === y0 || x === x1 - 1 || y === y1 - 1;
          if (onEdge && r.kind !== 'start' && r.kind !== 'boss') {
            // leave some gaps
            const seed = (x * 31 + y * 17 + this.seed) % 7;
            if (seed !== 0) {
              this.tiles[idx] = T.WALL;
              this.solid[idx] = 1;
            }
          }
        }
      }
      // Decorations
      for (let i = 0; i < (r.w * r.h) / 14; i++) {
        const dx = x0 + this.rng.int(1, r.w - 2);
        const dy = y0 + this.rng.int(1, r.h - 2);
        const idx = dy * this.W + dx;
        if (this.tiles[idx] !== this.biome.ground) continue;
        const choice = this.rng.pick(this.biome.decor);
        this.tiles[idx] = choice;
        if (choice === T.TREE || choice === T.ROCK) this.solid[idx] = 1;
        // hazard placement in some rooms
        if (this.rng.next() < 0.04) {
          this.tiles[idx] = this.biome.hazard;
          if (this.biome.hazard === T.LAVA) this.solid[idx] = 0;
        }
        this.doodad[idx] = this.rng.int(0, 3);
      }
      // Light source at room center for visibility
      this.lights.push({
        x: (x0 + r.w / 2) * TILE,
        y: (y0 + r.h / 2) * TILE,
        radius: 110 + Math.max(r.w, r.h) * 4,
        color: this.realmId === 'infernal' ? '#ff7a33' :
               this.realmId === 'frozen' ? '#a8d4f4' :
               this.realmId === 'void' ? '#985ce0' : '#fff0a0',
      });
    }
  }

  _stampPaths() {
    // Carve corridors between consecutive rooms (L-shaped)
    for (const c of this.connections) {
      const ax = Math.floor(c.from.x + c.from.w / 2);
      const ay = Math.floor(c.from.y + c.from.h / 2);
      const bx = Math.floor(c.to.x + c.to.w / 2);
      const by = Math.floor(c.to.y + c.to.h / 2);
      const horizFirst = this.rng.chance(0.5);
      if (horizFirst) {
        this._carveCorridor(ax, ay, bx, ay, 3);
        this._carveCorridor(bx, ay, bx, by, 3);
      } else {
        this._carveCorridor(ax, ay, ax, by, 3);
        this._carveCorridor(ax, by, bx, by, 3);
      }
    }
  }

  _carveCorridor(x1, y1, x2, y2, halfW) {
    const xa = Math.min(x1, x2), xb = Math.max(x1, x2);
    const ya = Math.min(y1, y2), yb = Math.max(y1, y2);
    for (let y = ya - halfW; y <= yb + halfW; y++) {
      for (let x = xa - halfW; x <= xb + halfW; x++) {
        if (x < 0 || y < 0 || x >= this.W || y >= this.H) continue;
        const idx = y * this.W + x;
        this.tiles[idx] = this.biome.ground;
        this.solid[idx] = 0;
      }
    }
  }

  _addSpecials() {
    for (const r of this.rooms) {
      this.specials[r.id] = {
        x: (r.x + r.w / 2) * TILE,
        y: (r.y + r.h / 2) * TILE,
        w: r.w * TILE, h: r.h * TILE, kind: r.kind, room: r,
      };
    }
    // Find player spawn = first room center
    const start = this.rooms[0];
    this.playerSpawn = { x: (start.x + start.w / 2) * TILE, y: (start.y + start.h / 2) * TILE };
    const boss = this.rooms[this.rooms.length - 1];
    this.bossSpawn = { x: (boss.x + boss.w / 2) * TILE, y: (boss.y + boss.h / 2) * TILE };
    this.bossRoomId = boss.id;
  }

  // Returns the room at world coords (or null)
  roomAtWorld(x, y) {
    const tx = Math.floor(x / TILE), ty = Math.floor(y / TILE);
    for (const r of this.rooms) {
      if (tx >= r.x && tx < r.x + r.w && ty >= r.y && ty < r.y + r.h) return r;
    }
    return null;
  }
  isSolidWorld(x, y) {
    const tx = Math.floor(x / TILE), ty = Math.floor(y / TILE);
    if (tx < 0 || ty < 0 || tx >= this.W || ty >= this.H) return true;
    return !!this.solid[ty * this.W + tx];
  }
  tileAtWorld(x, y) {
    const tx = Math.floor(x / TILE), ty = Math.floor(y / TILE);
    if (tx < 0 || ty < 0 || tx >= this.W || ty >= this.H) return T.WALL;
    return this.tiles[ty * this.W + tx];
  }

  pickEnemyRoster(stage) {
    const roster = REALM_ROSTERS[this.realmId] || REALM_ROSTERS.purgatory;
    // Late stages use tougher mix
    const tier = Math.min(2, Math.floor(stage / 2));
    const pool = roster.slice();
    return pool;
  }
}
