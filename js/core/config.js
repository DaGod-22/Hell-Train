// ============================================================
// HELL TRAIN — global configuration & master pixel-art palette
// ============================================================
export const CFG = {
  VERSION: '1.0.0',
  // Internal render resolution (low-res canvas, scaled up pixel-perfect)
  VIEW_W: 480,
  VIEW_H: 270,
  // Gameplay timing
  FIXED_DT: 1 / 60,
  MAX_DT: 0.1,
  // World
  CHUNK: 128,
  START_HP: 100,
};

// Master palette — every sprite indexes into this. Deliberate, curated colours.
export const PAL = {
  // outlines & darks
  OUT:   '#1a1026',   // near-black purple outline
  O2:    '#2a1a3a',
  B1:    '#000000',
  // greys
  G0: '#0d0d12', G1: '#1c1c24', G2: '#2c2c38', G3: '#3d3d4d',
  G4: '#525264', G5: '#6b6b80', G6: '#8a8aa0', G7: '#a8a8c0', G8: '#cfcfe0', G9: '#f0f0ff',
  // skin / warm
  S0: '#5a3a1e', S1: '#8a5a2e', S2: '#b57b45', S3: '#d69a5c', S4: '#f0c090',
  // reds / fire
  R0: '#3a0d0d', R1: '#6b1510', R2: '#a01f12', R3: '#d6311a', R4: '#ff4d26',
  R5: '#ff6a33', R6: '#ff9033', R7: '#ffb040', R8: '#ffd260', R9: '#fff0a0',
  // oranges
  O1: '#ff7a1a', O2c: '#ff9a2a', O3: '#ffc040',
  // yellows
  Y1: '#ffe066', Y2: '#fff0a0', Y3: '#fffde0',
  // greens (poison/undead)
  N0: '#14240e', N1: '#1f3a14', N2: '#2f5a1c', N3: '#437a26', N4: '#5a9c33',
  N5: '#74c04a', N6: '#98e066', N7: '#c0ff90',
  // teal
  T1: '#0e3a3a', T2: '#145c5c', T3: '#1f8080', T4: '#2fa8a8', T5: '#4ad0d0', T6: '#80f0f0',
  // blues / ice
  I0: '#0c1220', I1: '#142238', I2: '#1e3350', I3: '#2b4a70', I4: '#3d6698',
  I5: '#5788c4', I6: '#7ab0e0', I7: '#a8d4f4', I8: '#d4ecff', I9: '#f0faff',
  // purple / void
  V0: '#160a24', V1: '#241040', V2: '#341858', V3: '#482278', V4: '#5f3098',
  V5: '#7a44c0', V6: '#985ce0', V7: '#bc84f4', V8: '#dcb4ff', V9: '#f4e4ff',
  // pink/magenta
  P1: '#40102c', P2: '#601844', P3: '#882460', P4: '#b03484', P5: '#d450a8',
  P6: '#f080cc', P7: '#ffb4e4',
  // browns (wood, earth)
  W0: '#1c1208', W1: '#2e1d0c', W2: '#422b12', W3: '#5c3d1a', W4: '#7a5224',
  W5: '#9a6c30', W6: '#bc8c40', W7: '#e0b460',
  // sand
  SD0: '#3a2f14', SD1: '#5c4c20', SD2: '#7a6530', SD3: '#9c8442', SD4: '#bca65c',
  SD5: '#dcc87c', SD6: '#f0e0a0',
  // rust / copper
  C1: '#3a1c08', C2: '#5c2e10', C3: '#7a4518', C4: '#9c5c24', C5: '#c07a34',
  // silver / metal
  M0: '#14141a', M1: '#22222c', M2: '#333342', M3: '#48485a', M4: '#606078',
  M5: '#7c7c98', M6: '#9c9cb8', M7: '#c0c0d8',
  // gold
  GLD0: '#3a2a08', GLD1: '#5c4410', GLD2: '#7a5c18', GLD3: '#a07c24',
  GLD4: '#c8a030', GLD5: '#e8c848', GLD6: '#ffe878',
  // white
  WHITE: '#ffffff',
};

// Build a reverse index char->color at runtime for sprite maps.
const PAL_INDEX = {};
for (const k of Object.keys(PAL)) PAL_INDEX[PAL[k]] = k;

export function paletteIndex() { return PAL_INDEX; }

// Fonts: pixel style stack
export const FONT = '"Press Start 2P", "Courier New", monospace';
export const FONT_BODY = '"VT323", "Courier New", monospace';
