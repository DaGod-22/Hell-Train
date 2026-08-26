// ============================================================
// HELL TRAIN — local save system
// ============================================================
const KEY = 'helltrain.save.v1';

export function loadSave() {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch { return null; }
}
export function saveSave(data) {
  try { localStorage.setItem(KEY, JSON.stringify(data)); } catch {}
}
export function resetSave() { try { localStorage.removeItem(KEY); } catch {} }

// Default save shape
export function newSave() {
  return {
    shards: 0,
    achievements: [],
    perma: { player: {}, train: {} },
    stats: { totalKills: 0, totalRuns: 0, bestScore: 0, longestRun: 0, highestStage: 0 },
    discovered: [],
    characters: ['conductor'],
    weapons: [],
    armour: ['guardian'],
    relics: [],
    trainParts: 0,
    bossCores: {},
    unlockedRealms: ['purgatory'],
    endings: [],
  };
}

// Merge default shape with loaded
export function ensureShape(save) {
  const s = save || newSave();
  const d = newSave();
  for (const k of Object.keys(d)) if (!(k in s)) s[k] = d[k];
  return s;
}
