// ============================================================
// HELL TRAIN — Coin Shop UI Scene
// Professional AAA-scale interface for permanent progression
// ============================================================
import { CFG } from '../core/config.js';
import { COIN_SHOP, PROGRESSION_TIERS } from '../data/progression.js';

export class CoinShopScene {
  constructor(engine) {
    this.engine = engine;
    this.selectedTab = 'character';
    this.scrollOffset = 0;
    this.hoveredItem = null;
    this.coins = engine.save?.permanentCoins || 0;
    this.upgrades = engine.save?.coinShopUpgrades || {
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
    this.tabs = ['character', 'train', 'skins'];
    this.animationTime = 0;
  }

  enter(params = {}) {
    this.coins = this.engine.save?.permanentCoins || 0;
    this.upgrades = this.engine.save?.coinShopUpgrades || this.upgrades;
    this.selectedTab = 'character';
    this.scrollOffset = 0;
    this.animationTime = 0;
  }

  exit() {
    this.engine.save.permanentCoins = this.coins;
    this.engine.save.coinShopUpgrades = this.upgrades;
  }

  update(dt, t) {
    this.animationTime += dt;
    const input = this.engine.input;

    // Tab switching
    if (input.isPressed('KeyC')) this.selectedTab = 'character';
    if (input.isPressed('KeyT')) this.selectedTab = 'train';
    if (input.isPressed('KeyS')) this.selectedTab = 'skins';

    // Scroll
    if (input.isPressed('ArrowUp')) this.scrollOffset = Math.max(0, this.scrollOffset - 30);
    if (input.isPressed('ArrowDown')) this.scrollOffset += 30;

    // Back to menu
    if (input.isPressed('Escape')) {
      this.engine.setScene('menu');
    }
  }

  render(ctx, t) {
    // Clear background
    ctx.fillStyle = '#0a0420';
    ctx.fillRect(0, 0, CFG.VIEW_W, CFG.VIEW_H);

    // Animated background
    for (let i = 0; i < 3; i++) {
      ctx.fillStyle = `rgba(255, 90, 51, ${0.02 * Math.sin(t * 0.5 + i)})`;
      ctx.fillRect(0, (i * 50 + t * 20) % CFG.VIEW_H, CFG.VIEW_W, 50);
    }

    // Title
    ctx.fillStyle = '#ff5a33';
    ctx.font = 'bold 10px Arial';
    ctx.textAlign = 'center';
    ctx.fillText('COIN SHOP - PERMANENT PROGRESSION', CFG.VIEW_W / 2, 15);

    // Coins display
    ctx.fillStyle = '#ffd700';
    ctx.font = 'bold 8px Arial';
    ctx.textAlign = 'left';
    ctx.fillText(`COINS: ${this.coins}`, 10, 30);

    // Tab buttons
    this.renderTabs(ctx, t);

    // Content area
    this.renderTabContent(ctx, t);

    // Instructions
    ctx.fillStyle = '#b0b0ff';
    ctx.font = '6px monospace';
    ctx.textAlign = 'center';
    ctx.fillText('[C]haracter [T]rain [S]kins | [↑↓] Scroll | [ESC] Back', CFG.VIEW_W / 2, CFG.VIEW_H - 5);
  }

  renderTabs(ctx, t) {
    const tabWidth = CFG.VIEW_W / 3;
    const tabY = 40;

    this.tabs.forEach((tab, idx) => {
      const x = idx * tabWidth;
      const isActive = tab === this.selectedTab;

      // Tab background
      ctx.fillStyle = isActive ? '#ff5a33' : '#1a0e3d';
      ctx.fillRect(x, tabY, tabWidth, 16);

      // Tab border
      ctx.strokeStyle = isActive ? '#ffd700' : '#00d4ff';
      ctx.lineWidth = 2;
      ctx.strokeRect(x, tabY, tabWidth, 16);

      // Tab label
      ctx.fillStyle = isActive ? '#ffffff' : '#b0b0ff';
      ctx.font = 'bold 7px Arial';
      ctx.textAlign = 'center';
      ctx.fillText(tab.toUpperCase(), x + tabWidth / 2, tabY + 11);
    });
  }

  renderTabContent(ctx, t) {
    const contentY = 60;
    const contentH = CFG.VIEW_H - contentY - 20;

    // Clipping region for scrollable content
    ctx.save();
    ctx.beginPath();
    ctx.rect(0, contentY, CFG.VIEW_W, contentH);
    ctx.clip();

    if (this.selectedTab === 'character') {
      this.renderCharacterUpgrades(ctx, t, contentY);
    } else if (this.selectedTab === 'train') {
      this.renderTrainUpgrades(ctx, t, contentY);
    } else if (this.selectedTab === 'skins') {
      this.renderSkins(ctx, t, contentY);
    }

    ctx.restore();
  }

  renderCharacterUpgrades(ctx, t, startY) {
    const categories = ['maxHP', 'attackDamage', 'attackSpeed', 'critChance', 'dodge', 'cooldownReduction'];
    const itemWidth = CFG.VIEW_W / 2 - 6;
    let y = startY - this.scrollOffset;

    ctx.fillStyle = '#ff5a33';
    ctx.font = 'bold 7px Arial';
    ctx.fillText('CHARACTER UPGRADES', 10, startY + 12);
    y += 20;

    categories.forEach((cat) => {
      const upgrades = COIN_SHOP.CHARACTER[cat];
      if (!upgrades) return;

      ctx.fillStyle = '#ffd700';
      ctx.font = 'bold 6px Arial';
      ctx.fillText(cat.toUpperCase(), 10, y);
      y += 10;

      upgrades.forEach((upgrade, idx) => {
        const x = 10 + (idx % 2) * (itemWidth + 4);
        const row = Math.floor(idx / 2);
        const itemY = y + row * 28;

        if (itemY < startY - 30 || itemY > startY + 250) return; // Culling

        this.renderUpgradeCard(ctx, t, x, itemY, itemWidth, upgrade, cat);
      });

      y += Math.ceil(upgrades.length / 2) * 28 + 8;
    });
  }

  renderTrainUpgrades(ctx, t, startY) {
    const categories = ['hp', 'damage', 'fireRate', 'armour'];
    const itemWidth = CFG.VIEW_W / 2 - 6;
    let y = startY - this.scrollOffset;

    ctx.fillStyle = '#ff5a33';
    ctx.font = 'bold 7px Arial';
    ctx.fillText('TRAIN UPGRADES', 10, startY + 12);
    y += 20;

    categories.forEach((cat) => {
      const upgrades = COIN_SHOP.TRAIN[cat];
      if (!upgrades) return;

      ctx.fillStyle = '#ffd700';
      ctx.font = 'bold 6px Arial';
      ctx.fillText(cat.toUpperCase(), 10, y);
      y += 10;

      upgrades.forEach((upgrade, idx) => {
        const x = 10 + (idx % 2) * (itemWidth + 4);
        const row = Math.floor(idx / 2);
        const itemY = y + row * 28;

        if (itemY < startY - 30 || itemY > startY + 250) return;

        this.renderUpgradeCard(ctx, t, x, itemY, itemWidth, upgrade, `train_${cat}`);
      });

      y += Math.ceil(upgrades.length / 2) * 28 + 8;
    });
  }

  renderSkins(ctx, t, startY) {
    const types = ['character', 'train'];
    let y = startY - this.scrollOffset;

    ctx.fillStyle = '#ff5a33';
    ctx.font = 'bold 7px Arial';
    ctx.fillText('COSMETIC SKINS', 10, startY + 12);
    y += 20;

    types.forEach((type) => {
      const skins = COIN_SHOP.SKINS[type];
      if (!skins) return;

      ctx.fillStyle = '#00d4ff';
      ctx.font = 'bold 6px Arial';
      ctx.fillText(`${type.toUpperCase()} SKINS`, 10, y);
      y += 10;

      skins.forEach((skin, idx) => {
        const x = 10 + (idx % 2) * (CFG.VIEW_W / 2 - 6 + 4);
        const row = Math.floor(idx / 2);
        const itemY = y + row * 28;

        if (itemY < startY - 30 || itemY > startY + 250) return;

        this.renderSkinCard(ctx, t, x, itemY, CFG.VIEW_W / 2 - 6, skin);
      });

      y += Math.ceil(skins.length / 2) * 28 + 8;
    });
  }

  renderUpgradeCard(ctx, t, x, y, w, upgrade, key) {
    const owned = this.upgrades[key] || 0;
    const canAfford = this.coins >= upgrade.cost;
    const isMaxed = owned >= upgrade.level;

    // Card background
    if (isMaxed) {
      ctx.fillStyle = '#1a0e3d';
      ctx.globalAlpha = 0.5;
    } else if (canAfford) {
      ctx.fillStyle = '#2a1a5d';
      ctx.globalAlpha = 0.9;
    } else {
      ctx.fillStyle = '#1a0a2d';
      ctx.globalAlpha = 0.7;
    }
    ctx.fillRect(x, y, w, 24);
    ctx.globalAlpha = 1.0;

    // Border
    ctx.strokeStyle = canAfford ? '#00d4ff' : '#6a5a8a';
    ctx.lineWidth = 1;
    ctx.strokeRect(x, y, w, 24);

    // Content
    ctx.fillStyle = isMaxed ? '#888888' : '#ffd700';
    ctx.font = 'bold 5px Arial';
    ctx.textAlign = 'left';
    ctx.fillText(upgrade.label, x + 2, y + 6);

    ctx.fillStyle = isMaxed ? '#666666' : '#b0b0ff';
    ctx.font = '4px Arial';
    ctx.fillText(upgrade.desc, x + 2, y + 12);

    ctx.fillStyle = isMaxed ? '#00aa00' : canAfford ? '#00ff41' : '#ff3344';
    ctx.font = 'bold 5px Arial';
    ctx.textAlign = 'right';
    if (isMaxed) {
      ctx.fillText('MAXED', x + w - 2, y + 20);
    } else {
      ctx.fillText(`${upgrade.cost} COINS`, x + w - 2, y + 20);
    }
  }

  renderSkinCard(ctx, t, x, y, w, skin) {
    const owned = this.engine.save?.ownedSkins?.[skin.key] || false;
    const canAfford = this.coins >= skin.cost;

    // Card background
    if (owned) {
      ctx.fillStyle = '#1a3a1d';
      ctx.globalAlpha = 0.6;
    } else if (canAfford) {
      ctx.fillStyle = '#3a2a1d';
      ctx.globalAlpha = 0.9;
    } else {
      ctx.fillStyle = '#2a1a1d';
      ctx.globalAlpha = 0.7;
    }
    ctx.fillRect(x, y, w, 24);
    ctx.globalAlpha = 1.0;

    // Border
    ctx.strokeStyle = owned ? '#00ff41' : canAfford ? '#ffd700' : '#6a5a8a';
    ctx.lineWidth = 1;
    ctx.strokeRect(x, y, w, 24);

    // Content
    ctx.fillStyle = owned ? '#00ff41' : '#ffd700';
    ctx.font = 'bold 5px Arial';
    ctx.textAlign = 'left';
    ctx.fillText(skin.label, x + 2, y + 6);

    ctx.fillStyle = '#b0b0ff';
    ctx.font = '4px Arial';
    ctx.fillText(skin.desc, x + 2, y + 12);

    ctx.fillStyle = owned ? '#00ff41' : canAfford ? '#00d4ff' : '#ff3344';
    ctx.font = 'bold 5px Arial';
    ctx.textAlign = 'right';
    if (owned) {
      ctx.fillText('OWNED', x + w - 2, y + 20);
    } else {
      ctx.fillText(`${skin.cost} COINS`, x + w - 2, y + 20);
    }
  }
}
