// ============================================================
// HELL TRAIN — Professional Main Menu (Survivor.io Style)
// Home screen with character selection, realm select, shop
// ============================================================
import { CFG } from '../core/config.js';
import { CHAR_SKINS } from '../data/skins.js';
import { REALMS } from '../data/realms.js';
import { saveSave } from '../core/save.js';

export class MainMenuScene {
  constructor(engine) {
    this.engine = engine;
    this.selectedCharacter = 0;
    this.selectedRealm = 0;
    this.characters = [
      { id: 'conductor', name: 'The Conductor', desc: 'Balanced fighter', color: '#d69a5c', unlocked: true },
      { id: 'shadow', name: 'Shadow Assassin', desc: 'High damage, low HP', color: '#4a3a6a', unlocked: true },
      { id: 'guardian', name: 'Iron Guardian', desc: 'Tank, high HP', color: '#9c9cb8', unlocked: true },
    ];
    this.realms = [
      { id: 'purgatory', name: 'Purgatory', desc: 'Starting realm', color: '#ff6a33', difficulty: 1, unlocked: true },
      { id: 'infernal', name: 'Infernal Fields', desc: 'Fire & fury', color: '#ff4d26', difficulty: 2, unlocked: true },
      { id: 'frozen', name: 'Frozen Realm', desc: 'Icy depths', color: '#a8d4f4', difficulty: 3, unlocked: false },
      { id: 'void', name: 'The Void', desc: 'Reality bends', color: '#bc84f4', difficulty: 4, unlocked: false },
    ];
    this.showShop = false;
    this.shopTab = 'upgrades';
    this.animationTime = 0;
    this.coins = 0;
    this.stats = { runs: 0, kills: 0, bestScore: 0 };
  }

  enter(params = {}) {
    const save = params.save || this.engine.save;
    this.save = save;
    // Character roster comes from the real skin list; you can pick anything you own.
    this.characters = CHAR_SKINS.map(sk => ({
      id: sk.id, name: sk.name, desc: sk.desc, color: sk.pal.glow,
      unlocked: sk.cost === 0 || (save.ownedCharSkins || []).includes(sk.id),
    }));
    // Realms honour the actual unlock state from the save file.
    const unlocked = save.unlockedRealms || ['purgatory'];
    this.realms = REALMS.map(r => ({
      id: r.id, name: r.name, desc: r.desc, color: r.accent,
      difficulty: r.tier, unlocked: unlocked.includes(r.id),
    }));
    const ci = this.characters.findIndex(c => c.id === save.charSkin);
    if (ci >= 0) this.selectedCharacter = ci;
    this.selectedRealm = Math.max(0, this.realms.findIndex(r => r.unlocked));
    this.coins = save.coins || 0;
    this.stats = {
      runs: this.engine.save?.stats?.totalRuns || 0,
      kills: this.engine.save?.stats?.totalKills || 0,
      bestScore: this.engine.save?.stats?.bestScore || 0,
    };
    this.animationTime = 0;
  }

  update(dt, t) {
    this.animationTime += dt;
    const input = this.engine.input;

    if (this.showShop) {
      if (input.wasPressed('Escape')) this.showShop = false;
      if (input.wasPressed('KeyU')) this.shopTab = 'upgrades';
      if (input.wasPressed('KeyS')) this.shopTab = 'skins';
      return;
    }

    // Character selection
    if (input.wasPressed('ArrowLeft')) {
      this.selectedCharacter = (this.selectedCharacter - 1 + this.characters.length) % this.characters.length;
    }
    if (input.wasPressed('ArrowRight')) {
      this.selectedCharacter = (this.selectedCharacter + 1) % this.characters.length;
    }

    // Realm selection
    if (input.wasPressed('ArrowUp')) {
      this.selectedRealm = Math.max(0, this.selectedRealm - 1);
    }
    if (input.wasPressed('ArrowDown')) {
      this.selectedRealm = Math.min(this.realms.length - 1, this.selectedRealm + 1);
    }

    // Start game
    if (input.wasPressed('Enter') || input.wasPressed('Space')) {
      const realm = this.realms[this.selectedRealm];
      const chr = this.characters[this.selectedCharacter];
      if (realm.unlocked && chr.unlocked) {
        const save = this.save || this.engine.save;
        save.charSkin = chr.id;
        saveSave(save);
        this.engine.setScene('gameplay', {
          save, realmId: realm.id, stage: 1,
          difficulty: this.engine._difficulty || 'normal',
        });
      }
    }

    // Open shop
    if (input.wasPressed('KeyC')) this.engine.setScene('shop', { save: this.save || this.engine.save, from: 'characterSelect' });
    if (input.wasPressed('Escape') || input.wasPressed('Backspace')) this.engine.setScene('menu', { save: this.save || this.engine.save });
    if (input.wasPressed('KeyL')) this.engine.setScene('leaderboards');
    if (input.wasPressed('KeyA')) this.engine.setScene('achievements');
    input.endFrame();
  }

  render(ctx, t) {
    // Clear and background
    ctx.fillStyle = '#0a0420';
    ctx.fillRect(0, 0, CFG.VIEW_W, CFG.VIEW_H);

    // Animated background particles
    for (let i = 0; i < 5; i++) {
      ctx.fillStyle = `rgba(255, 90, 51, ${0.03 + 0.02 * Math.sin(t * 0.3 + i)})`;
      ctx.fillRect(0, (i * 60 + t * 15) % CFG.VIEW_H, CFG.VIEW_W, 60);
    }

    if (this.showShop) {
      this.renderShop(ctx, t);
    } else {
      this.renderMainMenu(ctx, t);
    }
  }

  renderMainMenu(ctx, t) {
    // Title
    ctx.fillStyle = '#ff5a33';
    ctx.font = 'bold 14px Arial';
    ctx.textAlign = 'center';
    ctx.shadowColor = 'rgba(255, 90, 51, 0.5)';
    ctx.shadowBlur = 10;
    ctx.fillText('HELL TRAIN', CFG.VIEW_W / 2, 25);
    ctx.shadowColor = 'transparent';

    // Stats bar (top right)
    this.renderStatsBar(ctx, t);

    // Left panel: Character selection
    this.renderCharacterPanel(ctx, t);

    // Right panel: Realm selection
    this.renderRealmPanel(ctx, t);

    // Bottom panel: Info & controls
    this.renderControlsPanel(ctx, t);

    // Coin display
    ctx.fillStyle = '#ffd700';
    ctx.font = 'bold 8px Arial';
    ctx.textAlign = 'left';
    ctx.fillText(`COINS: ${this.coins}`, 10, CFG.VIEW_H - 30);

    // Shop button
    ctx.fillStyle = this.coins > 0 ? '#00d4ff' : '#666666';
    ctx.strokeStyle = this.coins > 0 ? '#00d4ff' : '#666666';
    ctx.lineWidth = 2;
    ctx.fillRect(10, CFG.VIEW_H - 25, 40, 15);
    ctx.strokeRect(10, CFG.VIEW_H - 25, 40, 15);
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 6px Arial';
    ctx.textAlign = 'center';
    ctx.fillText('SHOP [C]', 30, CFG.VIEW_H - 14);
  }

  renderStatsBar(ctx, t) {
    const x = CFG.VIEW_W - 140;
    const y = 10;
    const w = 130;
    const h = 40;

    // Background
    ctx.fillStyle = 'rgba(26, 14, 61, 0.9)';
    ctx.fillRect(x, y, w, h);
    ctx.strokeStyle = '#00d4ff';
    ctx.lineWidth = 2;
    ctx.strokeRect(x, y, w, h);

    // Stats text
    ctx.fillStyle = '#ffd700';
    ctx.font = 'bold 6px Arial';
    ctx.textAlign = 'left';
    ctx.fillText('STATS', x + 5, y + 10);

    ctx.fillStyle = '#b0b0ff';
    ctx.font = '5px monospace';
    ctx.fillText(`Runs: ${this.stats.runs}`, x + 5, y + 20);
    ctx.fillText(`Kills: ${this.stats.kills}`, x + 5, y + 30);
    ctx.fillText(`Best: ${this.stats.bestScore}`, x + 5, y + 40);
  }

  renderCharacterPanel(ctx, t) {
    const x = 10;
    const y = 40;
    const w = 100;
    const h = CFG.VIEW_H - 120;

    // Panel background
    ctx.fillStyle = 'rgba(26, 14, 61, 0.95)';
    ctx.fillRect(x, y, w, h);
    ctx.strokeStyle = '#ff5a33';
    ctx.lineWidth = 2;
    ctx.strokeRect(x, y, w, h);

    // Title
    ctx.fillStyle = '#ff5a33';
    ctx.font = 'bold 7px Arial';
    ctx.textAlign = 'center';
    ctx.fillText('CHARACTER', x + w / 2, y + 12);

    // Character display
    const charY = y + 30;
    const cWin = 4;
    const cStart = Math.max(0, Math.min(this.characters.length - cWin, this.selectedCharacter - 1));
    this.characters.slice(cStart, cStart + cWin).forEach((char, i) => {
      const idx = cStart + i;
      const isSelected = idx === this.selectedCharacter;
      const itemY = charY + i * 45;

      // Background
      ctx.fillStyle = isSelected ? '#ff5a33' : 'rgba(0, 0, 0, 0.3)';
      ctx.fillRect(x + 2, itemY, w - 4, 40);

      // Border
      ctx.strokeStyle = isSelected ? '#ffd700' : '#666666';
      ctx.lineWidth = 2;
      ctx.strokeRect(x + 2, itemY, w - 4, 40);

      // Character color indicator
      ctx.fillStyle = char.color;
      ctx.fillRect(x + 5, itemY + 3, 8, 8);

      // Name
      ctx.fillStyle = isSelected ? '#ffffff' : '#b0b0ff';
      ctx.font = 'bold 6px Arial';
      ctx.textAlign = 'left';
      ctx.fillText(char.name, x + 16, itemY + 10);

      // Description
      ctx.fillStyle = '#8a8aa0';
      ctx.font = '4px monospace';
      ctx.fillText(char.desc, x + 16, itemY + 20);

      // Lock indicator
      if (!char.unlocked) {
        ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
        ctx.fillRect(x + 2, itemY, w - 4, 40);
        ctx.fillStyle = '#ff3344';
        ctx.font = 'bold 5px Arial';
        ctx.textAlign = 'center';
        ctx.fillText('LOCKED', x + w / 2, itemY + 20);
      }
    });
  }

  renderRealmPanel(ctx, t) {
    const x = CFG.VIEW_W - 140;
    const y = 55;
    const w = 130;
    const h = CFG.VIEW_H - 135;

    // Panel background
    ctx.fillStyle = 'rgba(26, 14, 61, 0.95)';
    ctx.fillRect(x, y, w, h);
    ctx.strokeStyle = '#00d4ff';
    ctx.lineWidth = 2;
    ctx.strokeRect(x, y, w, h);

    // Title
    ctx.fillStyle = '#00d4ff';
    ctx.font = 'bold 7px Arial';
    ctx.textAlign = 'center';
    ctx.fillText('SELECT REALM', x + w / 2, y + 12);

    // Realm display
    const realmY = y + 20;
    const rWin = 5;
    const rStart = Math.max(0, Math.min(this.realms.length - rWin, this.selectedRealm - 2));
    this.realms.slice(rStart, rStart + rWin).forEach((realm, i) => {
      const idx = rStart + i;
      const isSelected = idx === this.selectedRealm;
      const itemY = realmY + i * 35;

      // Background
      ctx.fillStyle = isSelected ? realm.color : 'rgba(0, 0, 0, 0.3)';
      ctx.globalAlpha = realm.unlocked ? 1.0 : 0.5;
      ctx.fillRect(x + 2, itemY, w - 4, 30);
      ctx.globalAlpha = 1.0;

      // Border
      ctx.strokeStyle = isSelected ? '#ffd700' : realm.unlocked ? realm.color : '#666666';
      ctx.lineWidth = 2;
      ctx.strokeRect(x + 2, itemY, w - 4, 30);

      // Name
      ctx.fillStyle = isSelected ? '#000000' : '#b0b0ff';
      ctx.font = 'bold 6px Arial';
      ctx.textAlign = 'left';
      ctx.fillText(realm.name, x + 6, itemY + 10);

      // Difficulty stars
      ctx.fillStyle = isSelected ? '#000000' : '#ffd700';
      for (let i = 0; i < realm.difficulty; i++) {
        ctx.fillText('★', x + 6 + i * 8, itemY + 20);
      }

      // Lock
      if (!realm.unlocked) {
        ctx.fillStyle = '#ff3344';
        ctx.font = 'bold 5px Arial';
        ctx.textAlign = 'right';
        ctx.fillText('🔒', x + w - 6, itemY + 15);
      }
    });
  }

  renderControlsPanel(ctx, t) {
    const x = 115;
    const y = CFG.VIEW_H - 60;
    const w = CFG.VIEW_W - 260;

    // Background
    ctx.fillStyle = 'rgba(26, 14, 61, 0.9)';
    ctx.fillRect(x, y, w, 50);
    ctx.strokeStyle = '#ffd700';
    ctx.lineWidth = 2;
    ctx.strokeRect(x, y, w, 50);

    // Instructions
    ctx.fillStyle = '#ffd700';
    ctx.font = 'bold 6px Arial';
    ctx.textAlign = 'center';
    ctx.fillText('READY TO FIGHT?', x + w / 2, y + 12);

    ctx.fillStyle = '#b0b0ff';
    ctx.font = '5px monospace';
    ctx.fillText('[←→] Character | [↑↓] Realm | [ENTER] Start | [C] Shop | [L] Leaderboard', x + w / 2, y + 28);
    ctx.fillText('[A] Achievements', x + w / 2, y + 40);
  }

  renderShop(ctx, t) {
    // Title
    ctx.fillStyle = '#ff5a33';
    ctx.font = 'bold 12px Arial';
    ctx.textAlign = 'center';
    ctx.fillText('COIN SHOP', CFG.VIEW_W / 2, 25);

    // Coin display
    ctx.fillStyle = '#ffd700';
    ctx.font = 'bold 8px Arial';
    ctx.fillText(`Balance: ${this.coins} COINS`, CFG.VIEW_W / 2, 40);

    // Tabs
    const tabWidth = 80;
    const tabX = CFG.VIEW_W / 2 - tabWidth - 10;

    this.renderTab(ctx, tabX, 50, tabWidth, 'UPGRADES [U]', this.shopTab === 'upgrades');
    this.renderTab(ctx, tabX + tabWidth + 20, 50, tabWidth, 'SKINS [S]', this.shopTab === 'skins');

    // Content area (placeholder - integrate with actual shop)
    ctx.fillStyle = 'rgba(26, 14, 61, 0.9)';
    ctx.fillRect(10, 75, CFG.VIEW_W - 20, CFG.VIEW_H - 95);
    ctx.strokeStyle = '#00d4ff';
    ctx.lineWidth = 2;
    ctx.strokeRect(10, 75, CFG.VIEW_W - 20, CFG.VIEW_H - 95);

    ctx.fillStyle = '#b0b0ff';
    ctx.font = '7px monospace';
    ctx.textAlign = 'center';
    if (this.shopTab === 'upgrades') {
      ctx.fillText('PERMANENT UPGRADES COMING SOON', CFG.VIEW_W / 2, CFG.VIEW_H / 2 - 10);
      ctx.font = '6px monospace';
      ctx.fillText('Increase your stats permanently across all runs', CFG.VIEW_W / 2, CFG.VIEW_H / 2 + 10);
    } else {
      ctx.fillText('COSMETIC SKINS COMING SOON', CFG.VIEW_W / 2, CFG.VIEW_H / 2 - 10);
      ctx.font = '6px monospace';
      ctx.fillText('Customize your character and train appearance', CFG.VIEW_W / 2, CFG.VIEW_H / 2 + 10);
    }

    // Back button
    ctx.fillStyle = '#ff5a33';
    ctx.fillRect(CFG.VIEW_W / 2 - 30, CFG.VIEW_H - 25, 60, 15);
    ctx.strokeStyle = '#ffd700';
    ctx.lineWidth = 2;
    ctx.strokeRect(CFG.VIEW_W / 2 - 30, CFG.VIEW_H - 25, 60, 15);
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 6px Arial';
    ctx.textAlign = 'center';
    ctx.fillText('BACK [ESC]', CFG.VIEW_W / 2, CFG.VIEW_H - 14);
  }

  renderTab(ctx, x, y, w, label, isActive) {
    ctx.fillStyle = isActive ? '#ff5a33' : '#1a0e3d';
    ctx.fillRect(x, y, w, 18);
    ctx.strokeStyle = isActive ? '#ffd700' : '#00d4ff';
    ctx.lineWidth = 2;
    ctx.strokeRect(x, y, w, 18);

    ctx.fillStyle = isActive ? '#ffffff' : '#b0b0ff';
    ctx.font = 'bold 6px Arial';
    ctx.textAlign = 'center';
    ctx.fillText(label, x + w / 2, y + 12);
  }
}
