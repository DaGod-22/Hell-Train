// ============================================================
// HELL TRAIN — main entry
// ============================================================
import { Engine } from './core/engine.js';
import { Input } from './core/input.js';
import { CFG } from './core/config.js';
import { buildSpriteRegistry } from './data/sprites.js';
import { buildArt } from './data/art.js';
import { loadSave, ensureShape, saveSave } from './core/save.js';
import { SupabaseClient } from './systems/supabase.js';
import { AudioEngine } from './systems/audio.js';

import { GameplayScene } from './systems/gameplay.js';
import { ShopScene } from './ui/shop.js';
import {
  MenuScene, WorldMapScene, TrainBaseScene, RunSummaryScene, PauseScene,
  AchievementsScene, LeaderboardScene, DailyRunScene, WeeklyChallengeScene,
  SettingsScene, ArsenalScene, ArmouryScene, RelicsScene,
} from './ui/menu.js';

async function boot() {
  const root = document.getElementById('root');
  // Hide loading
  const loading = document.getElementById('loading');
  const setStatus = (msg) => {
    try {
      const el = loading?.querySelector?.('.subtitle') || loading;
      if (el) el.textContent = msg;
    } catch {}
  };

  // ---- forge every sprite in the game at boot (procedural pixel art) ----
  setStatus('STOKING THE FURNACE...');
  await new Promise(r => setTimeout(r, 16));
  const t0 = performance.now();
  const art = buildArt();
  const legacy = buildSpriteRegistry();
  for (const k of Object.keys(legacy)) if (!(k in art)) art[k] = legacy[k];
  console.log('[HELL TRAIN] art forged in ' + Math.round(performance.now() - t0) + ' ms');

  if (loading?.style) loading.style.display = 'none';

  // Engine
  const engine = new Engine(root);
  engine.sprites = art;
  engine.input = new Input(engine.canvas);
  engine.audio = new AudioEngine();
  engine.supabase = new SupabaseClient();
  engine._difficulty = 'normal';

  // Load save
  let save = ensureShape(loadSave());
  if (!save.playerId) {
    save.playerId = 'p_' + Math.random().toString(36).slice(2, 10);
    saveSave(save);
  }
  engine.save = save;

  // Scenes
  engine.addScene('menu', new MenuScene(engine));
  engine.addScene('worldMap', new WorldMapScene(engine));
  engine.addScene('gameplay', new GameplayScene(engine));
  engine.addScene('trainBase', new TrainBaseScene(engine));
  engine.addScene('runSummary', new RunSummaryScene(engine));
  engine.addScene('pause', new PauseScene(engine));
  engine.addScene('achievements', new AchievementsScene(engine));
  engine.addScene('leaderboards', new LeaderboardScene(engine));
  engine.addScene('dailyRun', new DailyRunScene(engine));
  engine.addScene('weeklyChallenge', new WeeklyChallengeScene(engine));
  engine.addScene('settings', new SettingsScene(engine));
  engine.addScene('arsenal', new ArsenalScene(engine));
  engine.addScene('armoury', new ArmouryScene(engine));
  engine.addScene('relics', new RelicsScene(engine));
  engine.addScene('shop', new ShopScene(engine));

  if (typeof globalThis !== 'undefined') globalThis.__ENGINE__ = engine;
  engine.setScene('menu');
  engine.start();

  // Persist save on unload
  window.addEventListener('beforeunload', () => saveSave(engine.save));
  setInterval(() => saveSave(engine.save), 10000);

  // Audio resume on first click (browser autoplay policy)
  const resume = () => {
    engine.audio.resume();
    document.removeEventListener('click', resume);
    document.removeEventListener('keydown', resume);
  };
  document.addEventListener('click', resume);
  document.addEventListener('keydown', resume);
}

boot().catch(err => {
  console.error('Boot error:', err);
  const root = document.getElementById('root');
  root.innerHTML = '<div style="color:#ff5a33;font-family:monospace;padding:20px">'
    + '<h2>HELL TRAIN failed to load</h2>'
    + '<pre>' + (err?.stack || String(err)) + '</pre></div>';
});
