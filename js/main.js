// ============================================================
// HELL TRAIN — main entry with fixed loading screen
// ============================================================
import { Engine } from './core/engine.js';
import { Input } from './core/input.js';
import { CFG } from './core/config.js';
import { buildSpriteRegistry } from './data/sprites.js';
import { loadSave, ensureShape, saveSave } from './core/save.js';
import { SupabaseClient } from './systems/supabase.js';
import { AudioEngine } from './systems/audio.js';

import { GameplayScene } from './systems/gameplay.js';
import {
  MenuScene, WorldMapScene, TrainBaseScene, RunSummaryScene, PauseScene,
  AchievementsScene, LeaderboardScene, DailyRunScene, WeeklyChallengeScene,
  SettingsScene, ArsenalScene, ArmouryScene, RelicsScene,
} from './ui/menu.js';
import { CoinShopScene } from './ui/coinshop.js';

// Loading bar animation
function animateLoadingBar() {
  const bar = document.getElementById('loading');
  if (!bar) return;
  
  const barFill = bar.querySelector('.bar-fill');
  if (!barFill) return;

  let progress = 0;
  const interval = setInterval(() => {
    progress += Math.random() * 25;
    if (progress > 90) progress = 90;
    
    barFill.style.width = progress + '%';
    
    if (progress >= 90) {
      clearInterval(interval);
    }
  }, 200);
}

async function boot() {
  try {
    // Start loading animation immediately
    animateLoadingBar();
    
    const root = document.getElementById('root');
    if (!root) {
      throw new Error('Root element not found');
    }

    // Create engine
    const engine = new Engine(root);
    
    // Load sprites (this is typically the slowest part)
    console.log('Building sprite registry...');
    engine.sprites = buildSpriteRegistry();
    
    // Initialize systems
    console.log('Initializing input system...');
    engine.input = new Input(engine.canvas);
    
    console.log('Initializing audio engine...');
    engine.audio = new AudioEngine();
    
    console.log('Initializing Supabase client...');
    engine.supabase = new SupabaseClient();
    engine._difficulty = 'normal';

    // Load save game
    console.log('Loading save data...');
    let save = ensureShape(loadSave());
    if (!save.playerId) {
      save.playerId = 'p_' + Math.random().toString(36).slice(2, 10);
      saveSave(save);
    }
    engine.save = save;
    
    // Initialize permanent progression if missing
    if (!engine.save.permanentCoins) engine.save.permanentCoins = 0;
    if (!engine.save.coinShopUpgrades) {
      engine.save.coinShopUpgrades = {
        maxHP: 0,
        attackDamage: 0,
        attackSpeed: 0,
        critChance: 0,
        dodge: 0,
        cooldownReduction: 0,
        trainHP: 0,
        trainDamage: 0,
        trainFireRate: 0,
        trainArmour: 0,
      };
    }
    if (!engine.save.ownedSkins) engine.save.ownedSkins = {};
    if (!engine.save.achievements) engine.save.achievements = {};

    // Add all scenes
    console.log('Registering scenes...');
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
    engine.addScene('coinShop', new CoinShopScene(engine));

    // Hide loading screen and start game
    console.log('Boot complete, starting game...');
    const loading = document.getElementById('loading');
    if (loading) {
      loading.style.opacity = '0';
      loading.style.pointerEvents = 'none';
      setTimeout(() => {
        if (loading.parentNode) loading.parentNode.removeChild(loading);
      }, 600);
    }

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

    // Global error handler
    window.addEventListener('error', (err) => {
      console.error('Uncaught error:', err);
    });

  } catch (err) {
    console.error('Boot error:', err);
    const root = document.getElementById('root');
    if (root) {
      root.innerHTML = '<div style="color:#ff5a33;font-family:monospace;padding:20px;text-align:center">'
        + '<h2 style="margin:0 0 20px 0">HELL TRAIN INITIALIZATION FAILED</h2>'
        + '<pre style="text-align:left;background:#1a0e3d;padding:15px;border:2px solid #ff5a33;border-radius:4px;font-size:12px;overflow:auto;max-height:300px">'
        + (err?.stack || String(err))
        + '</pre>'
        + '<p style="margin-top:20px;color:#b0b0ff">Please refresh the page or check browser console</p>'
        + '</div>';
    }
  }
}

// Start boot immediately
boot();
