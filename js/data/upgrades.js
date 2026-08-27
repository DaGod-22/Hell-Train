// ============================================================
// HELL TRAIN — THE ASCENSION GRID
// Level-up upgrade cards (survivor-style). Every card has up to
// five ranks, and deep ranks unlock EVOLVED cards ("upgrades for
// your upgrades"). Reach the end of the grid and the run offers
// the APOCALYPSE PROTOCOL — one insane, run-defining transformation.
// ============================================================

export const RARITY_COLORS = {
  common: '#b8b8cc', uncommon: '#74c04a', rare: '#54a8ff',
  epic: '#c07aff', legendary: '#ffb020', mythic: '#ff4d6a',
  apocalypse: '#ff2a2a',
};
export const RARITY_WEIGHT = {
  common: 100, uncommon: 62, rare: 34, epic: 16, legendary: 6, mythic: 2, apocalypse: 0,
};
export const ROMAN = ['', 'I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X'];

const A = (o) => ({ target: 'player', max: 5, family: 'core', ...o });

// ==================================================================
// TIER 1 — CORE STATS (each has 5 ranks)
// ==================================================================
export const ASCENSIONS = [
  A({ id: 'fury', name: 'Fury', icon: 'sword', rarity: 'common', family: 'offence',
    desc: (l) => `+${12 + l * 2}% damage`,
    apply: (p, l) => p.modMult('atkDmg', 1 + (0.12 + l * 0.02)) }),
  A({ id: 'alacrity', name: 'Alacrity', icon: 'clock', rarity: 'common', family: 'offence',
    desc: (l) => `+${10 + l}% attack speed`,
    apply: (p, l) => p.modMult('atkSpd', 1 + (0.10 + l * 0.01)) }),
  A({ id: 'swiftness', name: 'Swiftness', icon: 'boot', rarity: 'common', family: 'mobility',
    desc: (l) => `+${8 + l}% movement speed`,
    apply: (p, l) => p.modMult('moveSpd', 1 + (0.08 + l * 0.01)) }),
  A({ id: 'vitality', name: 'Vitality', icon: 'heart', rarity: 'common', family: 'defence',
    desc: (l) => `+${20 + l * 5} max HP, heal the same`,
    apply: (p, l) => { const v = 20 + l * 5; p.maxHp += v; p.heal(v); } }),
  A({ id: 'greed', name: 'Greed', icon: 'coin', rarity: 'common', family: 'utility',
    desc: (l) => `+${20 + l * 5}% coins and +25% pickup radius`,
    apply: (p, l) => { p.coinMult = (p.coinMult || 1) * (1 + 0.20 + l * 0.05); p.modMult('pickupRange', 1.25); } }),
  A({ id: 'insight', name: 'Insight', icon: 'gem', rarity: 'common', family: 'utility',
    desc: (l) => `+${18 + l * 4}% XP gained`,
    apply: (p, l) => p.modMult('xpGain', 1 + 0.18 + l * 0.04) }),

  A({ id: 'precision', name: 'Precision', icon: 'target', rarity: 'uncommon', family: 'offence',
    desc: (l) => `+${5 + l}% critical chance`,
    apply: (p, l) => { p.crit += (5 + l) / 100; } }),
  A({ id: 'savagery', name: 'Savagery', icon: 'skull', rarity: 'uncommon', family: 'offence',
    desc: (l) => `+${25 + l * 5}% critical damage`,
    apply: (p, l) => p.modMult('critDmg', 1 + 0.25 + l * 0.05) }),
  A({ id: 'aegis', name: 'Aegis', icon: 'shield', rarity: 'uncommon', family: 'defence',
    desc: (l) => `+${2 + l} armour`,
    apply: (p, l) => { p.armour += 2 + l; } }),
  A({ id: 'mending', name: 'Mending', icon: 'cross', rarity: 'uncommon', family: 'defence',
    desc: (l) => `Regenerate ${(1 + l * 0.5).toFixed(1)} HP/s`,
    apply: (p, l) => { p.regen += 1 + l * 0.5; } }),
  A({ id: 'overcharge', name: 'Overcharge', icon: 'clock', rarity: 'uncommon', family: 'offence',
    desc: () => `-8% all cooldowns`,
    apply: (p) => p.modMult('cdr', 1.08) }),
  A({ id: 'phase_skin', name: 'Phase Skin', icon: 'ghost', rarity: 'uncommon', family: 'defence',
    desc: (l) => `+${4 + l}% dodge chance`,
    apply: (p, l) => { p.dodge = Math.min(0.6, p.dodge + (4 + l) / 100); } }),
  A({ id: 'piercer', name: 'Soul Piercer', icon: 'arrow', rarity: 'uncommon', family: 'offence',
    desc: () => `All projectiles pierce +1 target`,
    apply: (p) => { p.pierceBonus = (p.pierceBonus || 0) + 1; } }),
  A({ id: 'multishot', name: 'Split Shot', icon: 'fan', rarity: 'rare', family: 'offence', max: 3,
    desc: () => `All projectile weapons fire +1 projectile`,
    apply: (p) => { p.extraProjectiles = (p.extraProjectiles || 0) + 1; } }),

  // ---------------- TIER 2 — mechanics ----------------
  A({ id: 'ember_heart', name: 'Ember Heart', icon: 'fire', rarity: 'rare', family: 'fire',
    desc: (l) => `Hits burn for ${6 + l * 3} dmg/s over 3s`,
    apply: (p, l) => { p.burnDmg += 6 + l * 3; p.burnDur = 3; } }),
  A({ id: 'frostbind', name: 'Frostbind', icon: 'ice', rarity: 'rare', family: 'ice',
    desc: (l) => `Hits slow enemies by ${15 + l * 5}%`,
    apply: (p, l) => { p.chill = Math.min(0.7, (p.chill || 0) + (15 + l * 5) / 100); } }),
  A({ id: 'static_field', name: 'Static Field', icon: 'bolt', rarity: 'rare', family: 'lightning',
    desc: (l) => `Every hit chains to ${l} extra enemies`,
    apply: (p) => { p.chain = (p.chain || 0) + 1; } }),
  A({ id: 'leech', name: 'Sanguine Pact', icon: 'blood', rarity: 'rare', family: 'blood',
    desc: (l) => `Lifesteal ${3 + l * 2}% of damage dealt`,
    apply: (p, l) => { p.lifesteal += (3 + l * 2) / 100; } }),
  A({ id: 'executioner', name: 'Executioner', icon: 'axe', rarity: 'rare', family: 'offence',
    desc: (l) => `+${40 + l * 20}% damage to enemies below 30% HP`,
    apply: (p, l) => { p.execute = true; p.executeMult = (p.executeMult || 1) + 0.4 + l * 0.2; } }),
  A({ id: 'siphon', name: 'Soul Siphon', icon: 'gem', rarity: 'rare', family: 'utility',
    desc: (l) => `Kills restore ${l} HP and ${l} energy to the train`,
    apply: (p, l) => { p.killHeal = (p.killHeal || 0) + 1; p.killTrainEnergy = (p.killTrainEnergy || 0) + 1; } }),
  A({ id: 'bulwark_field', name: 'Bulwark Field', icon: 'shield', rarity: 'rare', family: 'defence',
    desc: (l) => `Gain a ${25 + l * 15} HP shield every 8s`,
    apply: (p, l) => { p.shieldAmount = (p.shieldAmount || 0) + 25 + l * 15; p.shieldTimer = p.shieldTimer ?? 8; } }),
  A({ id: 'knockback', name: 'Concussive Force', icon: 'fist', rarity: 'rare', family: 'offence',
    desc: (l) => `Hits knock enemies back (+${l * 20}%)`,
    apply: (p, l) => { p.knockback = (p.knockback || 0) + 40 + l * 20; } }),
  A({ id: 'thorns', name: 'Iron Thorns', icon: 'spike', rarity: 'rare', family: 'defence',
    desc: (l) => `Reflect ${30 + l * 20} damage to attackers`,
    apply: (p, l) => { p.thorns = (p.thorns || 0) + 30 + l * 20; } }),

  // ---------------- TIER 3 — epic ----------------
  A({ id: 'twin_soul', name: 'Twin Soul', icon: 'twin', rarity: 'epic', family: 'offence', max: 3,
    desc: (l) => `${10 + l * 5}% chance to fire every weapon twice`,
    apply: (p, l) => { p.doubleCast = (p.doubleCast || 0) + (10 + l * 5) / 100; } }),
  A({ id: 'eclipse', name: 'Eclipse', icon: 'moon', rarity: 'epic', family: 'offence', max: 3,
    desc: (l) => `Damage scales with missing HP (up to +${30 + l * 20}%)`,
    apply: (p, l) => { p.eclipse = true; p.eclipseMax = (p.eclipseMax || 0) + 0.3 + l * 0.2; } }),
  A({ id: 'glass_cannon', name: 'Forbidden Art', icon: 'candle', rarity: 'epic', family: 'offence', max: 3,
    desc: () => `+45% damage, -12% max HP`,
    apply: (p) => { p.modMult('atkDmg', 1.45); p.maxHp = Math.max(20, Math.floor(p.maxHp * 0.88)); p.hp = Math.min(p.hp, p.maxHp); } }),
  A({ id: 'momentum', name: 'Momentum', icon: 'boot', rarity: 'epic', family: 'mobility',
    desc: (l) => `Moving builds up to +${20 + l * 10}% damage`,
    apply: (p, l) => { p.momentum = (p.momentum || 0) + 0.2 + l * 0.1; } }),
  A({ id: 'vampire_lord', name: 'Vampire Lord', icon: 'blood', rarity: 'epic', family: 'blood', max: 3,
    desc: (l) => `Lifesteal also overheals into shield (+${l * 15}%)`,
    apply: (p, l) => { p.overheal = (p.overheal || 0) + 0.15 * l + 0.15; p.lifesteal += 0.03; } }),
  A({ id: 'detonator', name: 'Detonator', icon: 'bomb', rarity: 'epic', family: 'explosive',
    desc: (l) => `Killed enemies explode for ${20 + l * 12} damage`,
    apply: (p, l) => { p.corpseBoom = (p.corpseBoom || 0) + 20 + l * 12; } }),
  A({ id: 'frenzy', name: 'Kill Frenzy', icon: 'skull', rarity: 'epic', family: 'offence',
    desc: (l) => `Each kill grants +${1 + l}% attack speed for 4s (max 40 stacks)`,
    apply: (p, l) => { p.frenzy = (p.frenzy || 0) + (1 + l) / 100; } }),
  A({ id: 'phoenix', name: 'Phoenix Clause', icon: 'wing', rarity: 'legendary', family: 'defence', max: 2,
    desc: () => `Revive once per run at 60% HP with a nova blast`,
    apply: (p) => { p.revive = (p.revive || 0) + 1; } }),

  // ---------------- EVOLVED — require deep ranks ----------------
  A({ id: 'solar_core', name: 'SOLAR CORE', icon: 'sun', rarity: 'legendary', family: 'fire', max: 1,
    req: { id: 'ember_heart', lvl: 3 },
    desc: () => `Burning enemies detonate in a solar flare on death`,
    apply: (p) => { p.solarCore = true; p.burnDmg += 12; } }),
  A({ id: 'absolute_zero', name: 'ABSOLUTE ZERO', icon: 'ice', rarity: 'legendary', family: 'ice', max: 1,
    req: { id: 'frostbind', lvl: 3 },
    desc: () => `Chilled enemies freeze solid, then shatter for 300% damage`,
    apply: (p) => { p.absoluteZero = true; } }),
  A({ id: 'tempest_crown', name: 'TEMPEST CROWN', icon: 'bolt', rarity: 'legendary', family: 'lightning', max: 1,
    req: { id: 'static_field', lvl: 3 },
    desc: () => `A permanent storm strikes near you every 0.6s`,
    apply: (p) => { p.tempest = true; } }),
  A({ id: 'crimson_tide', name: 'CRIMSON TIDE', icon: 'blood', rarity: 'legendary', family: 'blood', max: 1,
    req: { id: 'leech', lvl: 3 },
    desc: () => `Lifesteal doubled; healing above max HP becomes damage`,
    apply: (p) => { p.lifesteal *= 2; p.crimsonTide = true; } }),
  A({ id: 'headsman', name: 'THE HEADSMAN', icon: 'axe', rarity: 'legendary', family: 'offence', max: 1,
    req: { id: 'executioner', lvl: 3 },
    desc: () => `Instantly execute non-boss enemies below 18% HP`,
    apply: (p) => { p.headsman = 0.18; } }),
  A({ id: 'chain_master', name: 'CHAIN MASTER', icon: 'bolt', rarity: 'legendary', family: 'lightning', max: 1,
    req: { id: 'static_field', lvl: 4 },
    desc: () => `Chains bounce twice as far and split into forks`,
    apply: (p) => { p.chainMaster = true; p.chain = (p.chain || 0) + 2; } }),
  A({ id: 'nova_engine', name: 'NOVA ENGINE', icon: 'bomb', rarity: 'legendary', family: 'explosive', max: 1,
    req: { id: 'detonator', lvl: 3 },
    desc: () => `Corpse explosions chain-react across the whole screen`,
    apply: (p) => { p.novaEngine = true; p.corpseBoom = (p.corpseBoom || 0) + 40; } }),
  A({ id: 'undying', name: 'UNDYING', icon: 'wing', rarity: 'mythic', family: 'defence', max: 1,
    req: { id: 'phoenix', lvl: 1 },
    desc: () => `Death is delayed 4s instead of killing you. Kill to survive.`,
    apply: (p) => { p.undying = true; } }),
  A({ id: 'godspeed', name: 'GODSPEED', icon: 'boot', rarity: 'mythic', family: 'mobility', max: 1,
    req: { id: 'swiftness', lvl: 4 },
    desc: () => `+60% move speed, dashes leave a damaging fire trail`,
    apply: (p) => { p.modMult('moveSpd', 1.6); p.dashTrail = true; } }),
  A({ id: 'arsenal_master', name: 'ARSENAL MASTER', icon: 'fan', rarity: 'mythic', family: 'offence', max: 1,
    req: { id: 'multishot', lvl: 3 },
    desc: () => `+3 projectiles on everything and +30% projectile speed`,
    apply: (p) => { p.extraProjectiles = (p.extraProjectiles || 0) + 3; p.projSpeedMult = (p.projSpeedMult || 1) * 1.3; } }),

  // ---------------- TRAIN ASCENSIONS ----------------
  A({ id: 't_boiler', name: 'Reinforced Boiler', target: 'train', icon: 'train', rarity: 'common', family: 'train',
    desc: (l) => `Train +${120 + l * 40} max HP`,
    apply: (p, l, ctx) => { const t = ctx.train; t.maxHp += 120 + l * 40; t.hp += 120 + l * 40; } }),
  A({ id: 't_ordnance', name: 'Ordnance Upgrade', target: 'train', icon: 'train', rarity: 'common', family: 'train',
    desc: (l) => `Train weapons +${18 + l * 4}% damage`,
    apply: (p, l, ctx) => { ctx.train.dmgMul *= 1 + (0.18 + l * 0.04); } }),
  A({ id: 't_autoloader', name: 'Autoloader', target: 'train', icon: 'train', rarity: 'uncommon', family: 'train',
    desc: (l) => `Train fires ${12 + l * 4}% faster`,
    apply: (p, l, ctx) => { ctx.train.fireRate = (ctx.train.fireRate || 1) * (1 + 0.12 + l * 0.04); } }),
  A({ id: 't_plating', name: 'Hell-Iron Plating', target: 'train', icon: 'train', rarity: 'uncommon', family: 'train',
    desc: (l) => `Train +${4 + l * 2} armour and repairs 2 HP/s`,
    apply: (p, l, ctx) => { ctx.train.armour += 4 + l * 2; ctx.train.repairRate = (ctx.train.repairRate || 0) + 2; } }),
  A({ id: 't_reactor', name: 'Soul Reactor', target: 'train', icon: 'train', rarity: 'rare', family: 'train',
    desc: (l) => `Train ultimate charges ${25 + l * 10}% faster`,
    apply: (p, l, ctx) => { ctx.train.energyRate = (ctx.train.energyRate || 1) * (1 + 0.25 + l * 0.1); } }),
  A({ id: 't_newgun', name: 'Mount New Weapon', target: 'train', icon: 'train', rarity: 'rare', family: 'train', max: 6,
    desc: () => `Bolt another weapon onto the train`,
    apply: (p, l, ctx) => ctx.train.mountRandomWeapon() }),
  A({ id: 't_ram', name: 'Siege Ram', target: 'train', icon: 'train', rarity: 'epic', family: 'train',
    desc: (l) => `Train body deals ${40 + l * 25} contact damage`,
    apply: (p, l, ctx) => { ctx.train.ramDamage = (ctx.train.ramDamage || 0) + 40 + l * 25; } }),
  A({ id: 't_aura', name: 'Furnace Aura', target: 'train', icon: 'train', rarity: 'epic', family: 'train',
    desc: (l) => `The train burns enemies within 70px for ${10 + l * 6}/s`,
    apply: (p, l, ctx) => { ctx.train.auraDamage = (ctx.train.auraDamage || 0) + 10 + l * 6; } }),
  A({ id: 't_guardian', name: 'GUARDIAN PROTOCOL', target: 'train', icon: 'train', rarity: 'legendary', family: 'train', max: 1,
    req: { id: 't_plating', lvl: 3 },
    desc: () => `The train intercepts lethal damage for you once every 20s`,
    apply: (p, l, ctx) => { ctx.train.guardian = true; } }),
  A({ id: 't_warmachine', name: 'WAR MACHINE', target: 'train', icon: 'train', rarity: 'mythic', family: 'train', max: 1,
    req: { id: 't_ordnance', lvl: 4 },
    desc: () => `Every train weapon fires twice and gains infinite range`,
    apply: (p, l, ctx) => { ctx.train.warMachine = true; ctx.train.dmgMul *= 1.5; } }),
];

// ==================================================================
// APOCALYPSE PROTOCOL — the final mode
// Unlocked mid-run once you have gone deep enough into the grid.
// ==================================================================
export const APOCALYPSE_PROTOCOL = {
  id: 'apocalypse_protocol', name: 'APOCALYPSE PROTOCOL', rarity: 'apocalypse',
  icon: 'omega', family: 'apocalypse', max: 1,
  tagline: 'THE RAGNARÖK ENGINE COMES ONLINE',
  desc: () => 'Damage x2.5 · fire rate x2 · infinite pierce · the train enters permanent overdrive · you burn 2% max HP per second. There is no off switch.',
  apply: (p, l, ctx) => {
    p.apocalypse = true;
    p.modMult('atkDmg', 2.5);
    p.modMult('atkSpd', 2.0);
    p.pierceBonus = (p.pierceBonus || 0) + 99;
    p.extraProjectiles = (p.extraProjectiles || 0) + 2;
    p.apocalypseBurn = 0.02;
    p.invulnOnKill = 0.06;
    if (ctx?.train) { ctx.train.overdrive = true; ctx.train.dmgMul *= 2.2; ctx.train.fireRate = (ctx.train.fireRate || 1) * 2.2; }
    ctx?.onApocalypse?.();
  },
};

// Post-apocalypse cards: only appear once the protocol is live.
export const APOCALYPSE_CARDS = [
  A({ id: 'omega_round', name: 'OMEGA ROUND', rarity: 'apocalypse', icon: 'omega', family: 'apocalypse', max: 3,
    desc: (l) => `Every ${9 - l}th shot is a world-ending round (500% damage, huge blast)`,
    apply: (p) => { p.omegaRound = (p.omegaRound || 9) - 1; } }),
  A({ id: 'extinction', name: 'EXTINCTION EVENT', rarity: 'apocalypse', icon: 'skull', family: 'apocalypse', max: 3,
    desc: (l) => `Every 20s, annihilate everything on screen for ${200 + l * 150} damage`,
    apply: (p, l) => { p.extinction = (p.extinction || 0) + 200 + l * 150; } }),
  A({ id: 'hellsplit', name: 'HELLSPLIT', rarity: 'apocalypse', icon: 'fan', family: 'apocalypse', max: 3,
    desc: (l) => `Projectiles split into ${2 + l} on impact`,
    apply: (p, l) => { p.hellsplit = (p.hellsplit || 0) + 2 + l; } }),
  A({ id: 'ragnarok_heart', name: 'RAGNARÖK HEART', rarity: 'apocalypse', icon: 'heart', family: 'apocalypse', max: 3,
    desc: (l) => `Stop the HP burn and gain ${l * 4} HP/s regeneration instead`,
    apply: (p, l) => { p.apocalypseBurn = 0; p.regen += 4 * l; } }),
  A({ id: 'final_stop', name: 'THE FINAL STOP', rarity: 'apocalypse', icon: 'train', family: 'apocalypse', max: 1,
    desc: () => `The train fires its ultimate every 5 seconds, forever`,
    apply: (p, l, ctx) => { if (ctx?.train) ctx.train.finalStop = true; } }),
];

export function apocalypseReady(owned, playerLevel) {
  if (owned.apocalypse_protocol) return false;
  let deep = 0, total = 0;
  for (const [id, lvl] of Object.entries(owned)) { total += lvl; if (lvl >= 3) deep++; }
  return playerLevel >= 18 && (deep >= 3 || total >= 22);
}

export function findAscension(id) {
  return ASCENSIONS.find(a => a.id === id) || APOCALYPSE_CARDS.find(a => a.id === id) ||
    (id === APOCALYPSE_PROTOCOL.id ? APOCALYPSE_PROTOCOL : null);
}

// Build the pool of cards currently offerable to the player.
export function offerPool(owned, player, ctx) {
  const pool = [];
  const src = player?.apocalypse ? ASCENSIONS.concat(APOCALYPSE_CARDS) : ASCENSIONS;
  for (const a of src) {
    const lvl = owned[a.id] || 0;
    if (lvl >= (a.max || 5)) continue;
    if (a.req) { const rl = owned[a.req.id] || 0; if (rl < a.req.lvl) continue; }
    if (a.cond && !a.cond(player, ctx)) continue;
    pool.push({ card: a, nextLevel: lvl + 1 });
  }
  return pool;
}

// Weighted pick of n distinct cards, biased toward the player's build.
export function rollCards(owned, player, ctx, n = 3, rng = Math.random) {
  const pool = offerPool(owned, player, ctx);
  const picks = [];
  const used = new Set();
  const familyCount = {};
  for (const [id, lvl] of Object.entries(owned)) {
    const c = findAscension(id);
    if (c) familyCount[c.family] = (familyCount[c.family] || 0) + lvl;
  }
  let guard = 0;
  while (picks.length < n && pool.length && guard++ < 400) {
    let total = 0;
    for (const p of pool) {
      if (used.has(p.card.id)) continue;
      total += weightOf(p, familyCount, owned);
    }
    if (total <= 0) break;
    let r = rng() * total;
    let chosen = null;
    for (const p of pool) {
      if (used.has(p.card.id)) continue;
      r -= weightOf(p, familyCount, owned);
      if (r <= 0) { chosen = p; break; }
    }
    if (!chosen) break;
    used.add(chosen.card.id);
    picks.push(chosen);
  }
  return picks;
}

function weightOf(p, familyCount, owned) {
  let w = RARITY_WEIGHT[p.card.rarity] ?? 10;
  if (p.card.rarity === 'apocalypse') w = 26;
  // synergy: cards in families you already invest in show up more
  w *= 1 + Math.min(1.6, (familyCount[p.card.family] || 0) * 0.14);
  // finishing an existing chain feels good
  if ((owned[p.card.id] || 0) > 0) w *= 1.35;
  if (p.card.req) w *= 1.8;
  return w;
}
