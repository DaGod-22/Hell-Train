// ============================================================
// HELL TRAIN — local save system
// ============================================================
const KEY = 'helltrain.save.v2';
const OLD_KEY = 'helltrain.save.v1';

export function loadSave() {
  try {
    const raw = localStorage.getItem(KEY) || localStorage.getItem(OLD_KEY);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch { return null; }
}
export function saveSave(data) {
  try { localStorage.setItem(KEY, JSON.stringify(data)); } catch {}
}
export function resetSave() { try { localStorage.removeItem(KEY); localStorage.removeItem(OLD_KEY); } catch {} }

export function newSave() {
  return {
    version: 2,
    coins: 0,
    shards: 0,
    achievements: [],
    permaLevels: {},              // shop track id -> level
    ownedCharSkins: ['conductor'],
    ownedTrainSkins: ['iron_horse'],
    charSkin: 'conductor',
    trainSkin: 'iron_horse',
    perma: { player: {}, train: {} },
    stats: { totalKills: 0, totalRuns: 0, bestScore: 0, longestRun: 0, highestStage: 0,
      totalCoins: 0, apocalypses: 0, bestCombo: 0 },
    discovered: [],
    characters: ['conductor'],
    weapons: [],
    armour: ['guardian'],
    relics: [],
    trainParts: 0,
    bossCores: {},
    unlockedRealms: ['purgatory'],
    endings: [],
    settings: { bloom: 1, lighting: 1, scanlines: 0.35, shake: 1, damageNumbers: 1 },
  };
}

export function ensureShape(save) {
  const s = save || newSave();
  const d = newSave();
  for (const k of Object.keys(d)) {
    if (!(k in s) || s[k] === null || s[k] === undefined) s[k] = d[k];
  }
  // nested defaults
  for (const k of Object.keys(d.stats)) if (!(k in s.stats)) s.stats[k] = d.stats[k];
  for (const k of Object.keys(d.settings)) if (!(k in s.settings)) s.settings[k] = d.settings[k];
  if (!Array.isArray(s.ownedCharSkins) || !s.ownedCharSkins.length) s.ownedCharSkins = ['conductor'];
  if (!Array.isArray(s.ownedTrainSkins) || !s.ownedTrainSkins.length) s.ownedTrainSkins = ['iron_horse'];
  if (!s.ownedCharSkins.includes(s.charSkin)) s.charSkin = 'conductor';
  if (!s.ownedTrainSkins.includes(s.trainSkin)) s.trainSkin = 'iron_horse';
  s.version = 2;
  return s;
}

export function addCoins(save, n) {
  save.coins = Math.max(0, Math.round((save.coins || 0) + n));
  save.stats.totalCoins = (save.stats.totalCoins || 0) + Math.max(0, n);
  return save.coins;
}
export function spendCoins(save, n) {
  if ((save.coins || 0) < n) return false;
  save.coins -= n;
  return true;
}
