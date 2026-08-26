// ============================================================
// HELL TRAIN — weapons data
// Each weapon defines: id, base stats, behavior, level curve,
// evolution chains (when combined with cores).
// ============================================================
export const WEAPONS = [
  {
    id: 'fireball', name: 'Fireball', family: 'fire', color: '#ff5a33', sprite: 'orbFire',
    desc: 'Launches an animated fireball at the nearest enemy.',
    cd: 1.0, dmg: 12, speed: 220, projLife: 1.8, projSize: 5,
    pierce: 0, explode: false, burn: 0,
    behavior: 'fireball', projCount: 1, spread: 0,
    curve: (lvl) => ({ cd: Math.max(0.35, 1.0 - lvl * 0.04), dmg: 12 + lvl * 3, projCount: 1 + Math.floor(lvl / 3) }),
    evolutions: [
      { id: 'inferno_nova', requires: ['fireball', 'explosion_core'], name: 'Inferno Nova',
        desc: 'Fireballs explode twice as large and ignite the ground.' },
      { id: 'hellstorm', requires: ['fireball', 'hellstorm_core'], name: 'Hellstorm',
        desc: 'A meteor storm rains over nearby enemies.' },
    ],
  },
  {
    id: 'orbital_blades', name: 'Orbital Blades', family: 'orbital', color: '#d0d4e8', sprite: null,
    desc: 'Animated blades orbit the player dealing contact damage.',
    cd: 0, dmg: 8, speed: 180, projLife: 99, projSize: 6,
    pierce: 99, explode: false, burn: 0,
    behavior: 'orbital', baseRadius: 38, baseSpeed: 4, baseCount: 2, baseSize: 7,
    curve: (lvl) => ({ dmg: 8 + lvl * 1.6, baseCount: Math.min(8, 2 + Math.floor(lvl / 2)),
      baseRadius: 38 + Math.min(28, lvl * 1.4), baseSpeed: 4 + lvl * 0.05 }),
    evolutions: [
      { id: 'eclipse_ring', requires: ['orbital_blades', 'eclipse_core'], name: 'Eclipse Ring',
        desc: 'Ringed blades that periodically launch outward.' },
      { id: 'storm_ring', requires: ['orbital_blades', 'lightning'], name: 'Storm Ring',
        desc: 'Each blade emits lightning to nearby enemies.' },
    ],
  },
  {
    id: 'void_bomb', name: 'Void Bomb', family: 'void', color: '#9b6dff', sprite: 'orbVoid',
    desc: 'Lobbed bomb that explodes on impact.',
    cd: 2.2, dmg: 26, speed: 160, projLife: 1.6, projSize: 7,
    pierce: 0, explode: true, explodeRadius: 42, burn: 0,
    behavior: 'lob', projCount: 1,
    curve: (lvl) => ({ cd: Math.max(1.2, 2.2 - lvl * 0.07), dmg: 26 + lvl * 6,
      explodeRadius: 42 + lvl * 2, projCount: 1 + Math.floor(lvl / 4) }),
    evolutions: [
      { id: 'chain_reaction', requires: ['void_bomb', 'explosion_core'], name: 'Chain Reaction',
        desc: 'Each explosion triggers another in a chain.' },
      { id: 'void_impact', requires: ['void_bomb', 'meteor'], name: 'Void Impact',
        desc: 'Calls down a void meteor that leaves a singularity.' },
    ],
  },
  {
    id: 'lightning', name: 'Lightning', family: 'lightning', color: '#fff066', sprite: 'orbLight',
    desc: 'Instant lightning strikes jump between enemies.',
    cd: 1.4, dmg: 14, speed: 0, projLife: 0.1, projSize: 6,
    pierce: 0, explode: false, burn: 0,
    behavior: 'lightning', jumps: 3,
    curve: (lvl) => ({ cd: Math.max(0.5, 1.4 - lvl * 0.05), dmg: 14 + lvl * 3, jumps: 3 + lvl }),
    evolutions: [
      { id: 'thunder_god', requires: ['lightning', 'thunder_core'], name: 'Thunder God',
        desc: 'Storm strikes every 0.4s in a wide radius.' },
      { id: 'storm_ring', requires: ['lightning', 'orbital_blades'], name: 'Storm Ring',
        desc: 'Orbital blades conduct lightning.' },
    ],
  },
  {
    id: 'frost', name: 'Frost', family: 'ice', color: '#7ec8ff', sprite: 'orbIce',
    desc: 'Icy bolts that slow enemies.',
    cd: 1.1, dmg: 9, speed: 240, projLife: 1.4, projSize: 5,
    pierce: 0, explode: false, burn: 0,
    behavior: 'frost', slow: 0.5, slowDur: 2.0,
    curve: (lvl) => ({ cd: Math.max(0.4, 1.1 - lvl * 0.04), dmg: 9 + lvl * 2,
      projCount: 1 + Math.floor(lvl / 3), slowDur: 2.0 + lvl * 0.2 }),
    evolutions: [
      { id: 'absolute_zero', requires: ['frost', 'ice_core'], name: 'Absolute Zero',
        desc: 'Frozen enemies can shatter, creating frost novas.' },
      { id: 'shatter', requires: ['frost', 'explosion_core'], name: 'Shatter',
        desc: 'Frozen enemies explode on death.' },
    ],
  },
  {
    id: 'shadow', name: 'Shadow', family: 'shadow', color: '#888899', sprite: 'orbShadow',
    desc: 'Ethereal projectiles haunt enemies.',
    cd: 1.5, dmg: 11, speed: 200, projLife: 1.6, projSize: 5,
    pierce: 1, explode: false, burn: 0,
    behavior: 'projectile', projCount: 1,
    curve: (lvl) => ({ cd: Math.max(0.5, 1.5 - lvl * 0.04), dmg: 11 + lvl * 2.5, projCount: 1 + Math.floor(lvl / 3) }),
    evolutions: [
      { id: 'shadow_army', requires: ['shadow', 'shadow_core'], name: 'Shadow Army',
        desc: 'Killed enemies leave temporary shadow copies.' },
      { id: 'darkflame', requires: ['shadow', 'fireball'], name: 'Darkflame',
        desc: 'Shadow projectiles burn and seek more.' },
    ],
  },
  {
    id: 'meteor', name: 'Meteor', family: 'fire', color: '#ff7a33', sprite: null,
    desc: 'Calls a meteor from above onto a random enemy.',
    cd: 4.5, dmg: 60, speed: 0, projLife: 0.6, projSize: 18,
    pierce: 0, explode: true, explodeRadius: 70,
    behavior: 'meteor',
    curve: (lvl) => ({ cd: Math.max(2.4, 4.5 - lvl * 0.12), dmg: 60 + lvl * 14, explodeRadius: 70 + lvl * 2 }),
    evolutions: [
      { id: 'world_breaker', requires: ['meteor', 'meteor_core'], name: 'World Breaker',
        desc: 'Meteors are massive and create lingering craters.' },
    ],
  },
  {
    id: 'void_step', name: 'Void Step', family: 'void', color: '#9b6dff', sprite: null,
    desc: 'Teleport to a nearby location, leaving a void afterimage.',
    cd: 4.0, dmg: 0, speed: 0, projLife: 0.3, projSize: 8,
    pierce: 0, explode: true, explodeRadius: 30,
    behavior: 'teleport',
    curve: (lvl) => ({ cd: Math.max(2.2, 4.0 - lvl * 0.1), explodeRadius: 30 + lvl * 2 }),
    evolutions: [
      { id: 'phantom_shift', requires: ['void_step', 'shadow_core'], name: 'Phantom Shift',
        desc: 'Creates attacking clones at the origin and destination.' },
    ],
  },
];

export const ABILITIES = [
  {
    id: 'dodge', name: 'Phase Dodge', family: 'survival', color: '#7ec8ff',
    desc: 'Short invulnerable dash.',
    cd: 3.0, dur: 0.35, dist: 110,
  },
  {
    id: 'blast', name: 'Hellfire Blast', family: 'fire', color: '#ff7a33',
    desc: 'Knockback shockwave around you.',
    cd: 6.0, radius: 90, dmg: 24,
  },
  {
    id: 'magnet', name: 'Soul Magnet', family: 'survival', color: '#9b6dff',
    desc: 'Pulls XP and loot toward you for a short time.',
    cd: 14.0, dur: 4.0, radius: 220,
  },
];

export const CORES = [
  { id: 'explosion_core', name: 'Explosion Core', desc: 'Triggers an explosion component.' },
  { id: 'eclipse_core', name: 'Eclipse Core', desc: 'Evolves orbital patterns.' },
  { id: 'ice_core', name: 'Ice Core', desc: 'Boosts ice-based weapons.' },
  { id: 'shadow_core', name: 'Shadow Core', desc: 'Boosts shadow-based weapons.' },
  { id: 'hellstorm_core', name: 'Hellstorm Core', desc: 'Creates fiery chaos.' },
  { id: 'thunder_core', name: 'Thunder Core', desc: 'Intensifies lightning.' },
  { id: 'meteor_core', name: 'Meteor Core', desc: 'Boosts meteor weapons.' },
];

export function findWeapon(id) { return WEAPONS.find(w => w.id === id); }
export function findAbility(id) { return ABILITIES.find(w => w.id === id); }
export function findCore(id) { return CORES.find(w => w.id === id); }

// Returns a list of possible evolution names given a weapon + core pair
export function findEvolution(weaponId, otherId) {
  for (const w of WEAPONS) {
    if (w.id !== weaponId) continue;
    for (const evo of w.evolutions) {
      if (evo.requires.includes(otherId)) return evo;
    }
  }
  return null;
}
