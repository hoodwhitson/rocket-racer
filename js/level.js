/**
 * level.js
 * Level configurations — 10 progressively harder levels.
 *
 * Each level config includes:
 *   roadSpec        — sections that expand to ~500 segments
 *   checkpoints     — [{segment, timeBonus}] for the checkpoint system
 *   scenerySet      — types of roadside objects for this environment
 *   background      — {layers:[]} for parallax pre-rendered backgrounds
 *   colors + fog    — NES-accurate palette
 *   difficulty      — timeLimit, trafficDensity, trafficSpeedMult
 */

/** @type {Array<object>} */
const LEVELS = [

  // ───────────────────────────────────────────────
  // Level 1 — Sunset Coast
  // ───────────────────────────────────────────────
  {
    theme: 'Sunset Coast',
    skyColor: '#4060C8',
    skyColorBottom: '#C06848',
    fogColor: '#C08068',
    grassLight: '#40A840',
    grassDark: '#308830',
    roadLight: '#6B6B6B',
    roadDark: '#595959',
    rumbleLight: '#FFFFFF',
    rumbleDark: '#DD2222',
    timeLimit: 90,
    trafficDensity: 8,
    trafficSpeedMult: 0.6,
    scenerySet: ['palmTree', 'billboard', 'rock'],
    background: {
      layers: [
        { type: 'clouds',    speed: 0.1, color: '#FFFFFF', y: 0.15, count: 5 },
        { type: 'mountains', speed: 0.3, color: '#8060A0', y: 0.55, height: 0.25, peaks: 8 },
        { type: 'treeline',  speed: 0.5, color: '#306030', y: 0.75, height: 0.08 },
      ],
    },
    checkpoints: [
      { segment: 160, timeBonus: 25 },
      { segment: 320, timeBonus: 22 },
    ],
    roadSpec: [
      { length: 40, curve: 0,    hill: 0   },
      { length: 25, curve: 0.4,  hill: 0   },
      { length: 20, curve: 0,    hill: 3   },
      { length: 25, curve: -0.3, hill: 0   },
      { length: 30, curve: 0,    hill: -3  },
      { length: 20, curve: 0.5,  hill: 0   },
      { length: 25, curve: 0,    hill: 0   },
      { length: 20, curve: -0.4, hill: 4   },
      { length: 30, curve: 0,    hill: -4  },
      { length: 25, curve: 0.3,  hill: 0   },
      { length: 20, curve: 0,    hill: 0   },
      { length: 25, curve: -0.5, hill: 0   },
      { length: 30, curve: 0,    hill: 0   },
      { length: 20, curve: 0.4,  hill: 3   },
      { length: 25, curve: 0,    hill: -3  },
      { length: 20, curve: -0.3, hill: 0   },
      { length: 30, curve: 0,    hill: 0   },
      { length: 25, curve: 0.5,  hill: 0   },
      { length: 30, curve: 0,    hill: 0   },
    ],
  },

  // ───────────────────────────────────────────────
  // Level 2 — City Night
  // ───────────────────────────────────────────────
  {
    theme: 'City Night',
    skyColor: '#000020',
    skyColorBottom: '#101030',
    fogColor: '#080818',
    grassLight: '#102010',
    grassDark: '#081808',
    roadLight: '#505058',
    roadDark: '#404048',
    rumbleLight: '#FF8800',
    rumbleDark: '#FF2200',
    timeLimit: 85,
    trafficDensity: 10,
    trafficSpeedMult: 0.7,
    scenerySet: ['lampPost', 'billboard', 'building'],
    background: {
      layers: [
        { type: 'buildings', speed: 0.25, color: '#181830', y: 0.45, height: 0.35, count: 14 },
        { type: 'buildings', speed: 0.4,  color: '#101020', y: 0.55, height: 0.25, count: 10 },
      ],
    },
    checkpoints: [
      { segment: 155, timeBonus: 23 },
      { segment: 310, timeBonus: 20 },
    ],
    roadSpec: [
      { length: 30, curve: 0,    hill: 0   },
      { length: 20, curve: 0.6,  hill: 0   },
      { length: 25, curve: 0,    hill: 0   },
      { length: 20, curve: -0.5, hill: 0   },
      { length: 25, curve: 0.7,  hill: 0   },
      { length: 20, curve: 0,    hill: 3   },
      { length: 25, curve: -0.6, hill: -3  },
      { length: 20, curve: 0,    hill: 0   },
      { length: 25, curve: 0.5,  hill: 0   },
      { length: 20, curve: -0.7, hill: 0   },
      { length: 30, curve: 0,    hill: 0   },
      { length: 20, curve: 0.4,  hill: 4   },
      { length: 25, curve: 0,    hill: -4  },
      { length: 20, curve: -0.5, hill: 0   },
      { length: 25, curve: 0.6,  hill: 0   },
      { length: 20, curve: 0,    hill: 0   },
      { length: 25, curve: -0.4, hill: 0   },
      { length: 30, curve: 0,    hill: 0   },
      { length: 35, curve: 0,    hill: 0   },
    ],
  },

  // ───────────────────────────────────────────────
  // Level 3 — Desert Highway
  // ───────────────────────────────────────────────
  {
    theme: 'Desert Highway',
    skyColor: '#E08830',
    skyColorBottom: '#F0A850',
    fogColor: '#D8A060',
    grassLight: '#C8A030',
    grassDark: '#A88020',
    roadLight: '#B09870',
    roadDark: '#988060',
    rumbleLight: '#FFFFFF',
    rumbleDark: '#DD2222',
    timeLimit: 80,
    trafficDensity: 12,
    trafficSpeedMult: 0.75,
    scenerySet: ['cactus', 'rock', 'billboard'],
    background: {
      layers: [
        { type: 'mountains', speed: 0.2, color: '#A06830', y: 0.50, height: 0.30, peaks: 6 },
        { type: 'mountains', speed: 0.35, color: '#886028', y: 0.60, height: 0.18, peaks: 10 },
      ],
    },
    checkpoints: [
      { segment: 150, timeBonus: 22 },
      { segment: 310, timeBonus: 18 },
    ],
    roadSpec: [
      { length: 35, curve: 0,    hill: 0   },
      { length: 25, curve: 0.8,  hill: 0   },
      { length: 20, curve: 0,    hill: 6   },
      { length: 25, curve: -0.6, hill: -6  },
      { length: 20, curve: 0,    hill: 0   },
      { length: 30, curve: 0.7,  hill: 4   },
      { length: 20, curve: -0.8, hill: -4  },
      { length: 25, curve: 0,    hill: 0   },
      { length: 20, curve: 0.5,  hill: 0   },
      { length: 25, curve: 0,    hill: 8   },
      { length: 20, curve: -0.7, hill: -8  },
      { length: 30, curve: 0,    hill: 0   },
      { length: 20, curve: 0.9,  hill: 0   },
      { length: 25, curve: -0.5, hill: 5   },
      { length: 20, curve: 0,    hill: -5  },
      { length: 25, curve: 0.6,  hill: 0   },
      { length: 20, curve: 0,    hill: 0   },
      { length: 25, curve: -0.4, hill: 0   },
      { length: 35, curve: 0,    hill: 0   },
    ],
  },

  // ───────────────────────────────────────────────
  // Level 4 — Mountain Pass
  // ───────────────────────────────────────────────
  {
    theme: 'Mountain Pass',
    skyColor: '#5070A8',
    skyColorBottom: '#8098C0',
    fogColor: '#7890B8',
    grassLight: '#2D6A2D',
    grassDark: '#1E4E1E',
    roadLight: '#707070',
    roadDark: '#5A5A5A',
    rumbleLight: '#FFFFFF',
    rumbleDark: '#DD2222',
    timeLimit: 78,
    trafficDensity: 14,
    trafficSpeedMult: 0.8,
    scenerySet: ['pineTree', 'rock', 'billboard'],
    background: {
      layers: [
        { type: 'clouds',    speed: 0.08, color: '#C8D0E0', y: 0.12, count: 4 },
        { type: 'mountains', speed: 0.2,  color: '#607090', y: 0.45, height: 0.35, peaks: 5 },
        { type: 'mountains', speed: 0.35, color: '#405060', y: 0.58, height: 0.20, peaks: 8 },
        { type: 'treeline',  speed: 0.5,  color: '#1E3E1E', y: 0.72, height: 0.10 },
      ],
    },
    checkpoints: [
      { segment: 140, timeBonus: 22 },
      { segment: 300, timeBonus: 18 },
      { segment: 420, timeBonus: 15 },
    ],
    roadSpec: [
      { length: 25, curve: 0,    hill: 0   },
      { length: 20, curve: 0.6,  hill: 12  },
      { length: 20, curve: 0.8,  hill: -8  },
      { length: 20, curve: -0.7, hill: 10  },
      { length: 20, curve: -1.0, hill: -12 },
      { length: 25, curve: 0,    hill: 0   },
      { length: 20, curve: 0.5,  hill: 15  },
      { length: 20, curve: -0.5, hill: -10 },
      { length: 25, curve: 0.9,  hill: 8   },
      { length: 20, curve: 0,    hill: -8  },
      { length: 20, curve: -0.8, hill: 10  },
      { length: 25, curve: 0.7,  hill: -6  },
      { length: 20, curve: 0,    hill: 0   },
      { length: 20, curve: -0.6, hill: 12  },
      { length: 20, curve: 0.4,  hill: -12 },
      { length: 25, curve: 0,    hill: 0   },
      { length: 20, curve: 0.8,  hill: 8   },
      { length: 20, curve: -0.9, hill: -8  },
      { length: 25, curve: 0,    hill: 0   },
      { length: 30, curve: 0,    hill: 0   },
    ],
  },

  // ───────────────────────────────────────────────
  // Level 5 — Tropical Paradise
  // ───────────────────────────────────────────────
  {
    theme: 'Tropical Paradise',
    skyColor: '#2090E0',
    skyColorBottom: '#60C0F0',
    fogColor: '#50B0E0',
    grassLight: '#00B848',
    grassDark: '#009838',
    roadLight: '#787878',
    roadDark: '#606060',
    rumbleLight: '#FFFFFF',
    rumbleDark: '#FF2200',
    timeLimit: 75,
    trafficDensity: 16,
    trafficSpeedMult: 0.85,
    scenerySet: ['palmTree', 'rock', 'billboard'],
    background: {
      layers: [
        { type: 'clouds',    speed: 0.1,  color: '#FFFFFF', y: 0.12, count: 6 },
        { type: 'mountains', speed: 0.25, color: '#308850', y: 0.55, height: 0.22, peaks: 7 },
        { type: 'treeline',  speed: 0.45, color: '#206830', y: 0.72, height: 0.10 },
      ],
    },
    checkpoints: [
      { segment: 140, timeBonus: 20 },
      { segment: 300, timeBonus: 17 },
      { segment: 420, timeBonus: 14 },
    ],
    roadSpec: [
      { length: 25, curve: 0,    hill: 0   },
      { length: 15, curve: 1.0,  hill: 0   },
      { length: 15, curve: -1.0, hill: 0   },
      { length: 15, curve: 0.8,  hill: 4   },
      { length: 15, curve: -0.8, hill: -4  },
      { length: 20, curve: 0,    hill: 0   },
      { length: 15, curve: 1.1,  hill: 0   },
      { length: 15, curve: -1.1, hill: 0   },
      { length: 15, curve: 0.9,  hill: 5   },
      { length: 15, curve: -0.9, hill: -5  },
      { length: 20, curve: 0,    hill: 0   },
      { length: 15, curve: 1.2,  hill: 0   },
      { length: 15, curve: -1.2, hill: 0   },
      { length: 15, curve: 0.7,  hill: 6   },
      { length: 15, curve: -0.7, hill: -6  },
      { length: 20, curve: 0,    hill: 0   },
      { length: 15, curve: 1.0,  hill: 0   },
      { length: 15, curve: -1.0, hill: 0   },
      { length: 20, curve: 0.5,  hill: 0   },
      { length: 20, curve: -0.5, hill: 0   },
      { length: 20, curve: 0,    hill: 0   },
      { length: 30, curve: 0,    hill: 0   },
    ],
  },

  // ───────────────────────────────────────────────
  // Level 6 — Canyon Run
  // ───────────────────────────────────────────────
  {
    theme: 'Canyon Run',
    skyColor: '#C84020',
    skyColorBottom: '#E06848',
    fogColor: '#B85838',
    grassLight: '#A06020',
    grassDark: '#804818',
    roadLight: '#907050',
    roadDark: '#785840',
    rumbleLight: '#FFFFFF',
    rumbleDark: '#FF2200',
    timeLimit: 72,
    trafficDensity: 18,
    trafficSpeedMult: 0.9,
    scenerySet: ['rock', 'cactus', 'billboard'],
    background: {
      layers: [
        { type: 'mountains', speed: 0.15, color: '#903020', y: 0.40, height: 0.40, peaks: 5 },
        { type: 'mountains', speed: 0.3,  color: '#702818', y: 0.55, height: 0.25, peaks: 8 },
      ],
    },
    checkpoints: [
      { segment: 130, timeBonus: 20 },
      { segment: 280, timeBonus: 16 },
      { segment: 410, timeBonus: 13 },
    ],
    roadSpec: [
      { length: 20, curve: 0,    hill: 0   },
      { length: 20, curve: 0.8,  hill: 10  },
      { length: 15, curve: -0.6, hill: -6  },
      { length: 20, curve: 1.0,  hill: 8   },
      { length: 15, curve: -1.0, hill: -10 },
      { length: 20, curve: 0,    hill: 12  },
      { length: 15, curve: 0.7,  hill: -12 },
      { length: 20, curve: -0.9, hill: 6   },
      { length: 15, curve: 0,    hill: -6  },
      { length: 20, curve: 1.1,  hill: 10  },
      { length: 15, curve: -0.8, hill: -8  },
      { length: 20, curve: 0.6,  hill: 0   },
      { length: 20, curve: -1.2, hill: 8   },
      { length: 15, curve: 0.9,  hill: -8  },
      { length: 20, curve: 0,    hill: 6   },
      { length: 15, curve: -0.7, hill: -6  },
      { length: 20, curve: 0.8,  hill: 0   },
      { length: 15, curve: -0.5, hill: 0   },
      { length: 20, curve: 0,    hill: 0   },
      { length: 25, curve: 0,    hill: 0   },
      { length: 30, curve: 0,    hill: 0   },
    ],
  },

  // ───────────────────────────────────────────────
  // Level 7 — Autumn Forest
  // ───────────────────────────────────────────────
  {
    theme: 'Autumn Forest',
    skyColor: '#886830',
    skyColorBottom: '#A08040',
    fogColor: '#988050',
    grassLight: '#C87020',
    grassDark: '#A85818',
    roadLight: '#787878',
    roadDark: '#606060',
    rumbleLight: '#FFDD00',
    rumbleDark: '#FF4400',
    timeLimit: 68,
    trafficDensity: 20,
    trafficSpeedMult: 0.95,
    scenerySet: ['pineTree', 'rock', 'billboard'],
    background: {
      layers: [
        { type: 'mountains', speed: 0.2,  color: '#705020', y: 0.48, height: 0.28, peaks: 7 },
        { type: 'treeline',  speed: 0.4,  color: '#884010', y: 0.68, height: 0.12 },
      ],
    },
    checkpoints: [
      { segment: 130, timeBonus: 18 },
      { segment: 275, timeBonus: 15 },
      { segment: 400, timeBonus: 13 },
    ],
    roadSpec: [
      { length: 20, curve: 0,    hill: 0   },
      { length: 18, curve: 0.9,  hill: 0   },
      { length: 18, curve: -0.9, hill: 6   },
      { length: 18, curve: 1.1,  hill: -6  },
      { length: 18, curve: -1.1, hill: 5   },
      { length: 18, curve: 0.7,  hill: -5  },
      { length: 18, curve: -0.7, hill: 0   },
      { length: 18, curve: 1.2,  hill: 8   },
      { length: 18, curve: -1.2, hill: -8  },
      { length: 18, curve: 0.8,  hill: 0   },
      { length: 18, curve: -0.8, hill: 6   },
      { length: 18, curve: 1.0,  hill: -6  },
      { length: 18, curve: -1.0, hill: 0   },
      { length: 18, curve: 0.6,  hill: 8   },
      { length: 18, curve: -0.6, hill: -8  },
      { length: 18, curve: 0.9,  hill: 0   },
      { length: 18, curve: -0.9, hill: 5   },
      { length: 18, curve: 0.5,  hill: -5  },
      { length: 18, curve: 0,    hill: 0   },
      { length: 15, curve: 0.7,  hill: 0   },
      { length: 15, curve: -0.7, hill: 0   },
      { length: 20, curve: 0,    hill: 0   },
      { length: 25, curve: 0,    hill: 0   },
    ],
  },

  // ───────────────────────────────────────────────
  // Level 8 — Snowy Peaks
  // ───────────────────────────────────────────────
  {
    theme: 'Snowy Peaks',
    skyColor: '#A0B0C8',
    skyColorBottom: '#C0D0E0',
    fogColor: '#C8D8E8',
    fogDensity: 5.0,
    grassLight: '#D0E0F0',
    grassDark: '#B8C8E0',
    roadLight: '#D0D0D8',
    roadDark: '#B8B8C8',
    rumbleLight: '#FFFFFF',
    rumbleDark: '#4488FF',
    timeLimit: 65,
    trafficDensity: 20,
    trafficSpeedMult: 0.95,
    scenerySet: ['pineTree', 'rock', 'billboard'],
    background: {
      layers: [
        { type: 'clouds',    speed: 0.06, color: '#E0E8F0', y: 0.10, count: 4 },
        { type: 'mountains', speed: 0.18, color: '#8898B0', y: 0.42, height: 0.35, peaks: 5 },
        { type: 'mountains', speed: 0.32, color: '#6878A0', y: 0.55, height: 0.22, peaks: 8 },
      ],
    },
    checkpoints: [
      { segment: 130, timeBonus: 18 },
      { segment: 270, timeBonus: 14 },
      { segment: 400, timeBonus: 12 },
    ],
    roadSpec: [
      { length: 20, curve: 0,    hill: 0   },
      { length: 18, curve: 0.7,  hill: 10  },
      { length: 18, curve: -0.7, hill: -10 },
      { length: 18, curve: 1.0,  hill: 8   },
      { length: 18, curve: -1.0, hill: -8  },
      { length: 18, curve: 0.8,  hill: 0   },
      { length: 18, curve: -0.8, hill: 0   },
      { length: 18, curve: 0.5,  hill: 10  },
      { length: 18, curve: -0.5, hill: -10 },
      { length: 18, curve: 1.1,  hill: 5   },
      { length: 18, curve: -1.1, hill: -5  },
      { length: 18, curve: 0.6,  hill: 8   },
      { length: 18, curve: -0.6, hill: -8  },
      { length: 18, curve: 0.9,  hill: 0   },
      { length: 18, curve: -0.9, hill: 0   },
      { length: 18, curve: 0.7,  hill: 12  },
      { length: 18, curve: -0.7, hill: -12 },
      { length: 18, curve: 1.0,  hill: 6   },
      { length: 18, curve: -1.0, hill: -6  },
      { length: 20, curve: 0,    hill: 0   },
      { length: 15, curve: 0.5,  hill: 0   },
      { length: 15, curve: -0.5, hill: 0   },
      { length: 20, curve: 0,    hill: 0   },
    ],
  },

  // ───────────────────────────────────────────────
  // Level 9 — Night Highway
  // ───────────────────────────────────────────────
  {
    theme: 'Night Highway',
    skyColor: '#000010',
    skyColorBottom: '#080820',
    fogColor: '#040410',
    grassLight: '#080818',
    grassDark: '#040410',
    roadLight: '#484850',
    roadDark: '#383840',
    rumbleLight: '#FF8800',
    rumbleDark: '#FF2200',
    timeLimit: 60,
    trafficDensity: 25,
    trafficSpeedMult: 1.1,
    scenerySet: ['lampPost', 'billboard', 'building'],
    background: {
      layers: [
        { type: 'buildings', speed: 0.2,  color: '#101828', y: 0.42, height: 0.38, count: 16 },
        { type: 'buildings', speed: 0.38, color: '#080C18', y: 0.55, height: 0.25, count: 12 },
      ],
    },
    checkpoints: [
      { segment: 120, timeBonus: 16 },
      { segment: 260, timeBonus: 14 },
      { segment: 390, timeBonus: 12 },
    ],
    roadSpec: [
      { length: 20, curve: 0,    hill: 0   },
      { length: 15, curve: 1.2,  hill: 0   },
      { length: 15, curve: -1.0, hill: 0   },
      { length: 15, curve: 0.8,  hill: 5   },
      { length: 15, curve: -0.9, hill: -5  },
      { length: 20, curve: 0,    hill: 0   },
      { length: 15, curve: 1.3,  hill: 0   },
      { length: 15, curve: -1.2, hill: 6   },
      { length: 15, curve: 0.7,  hill: -6  },
      { length: 15, curve: -0.8, hill: 0   },
      { length: 20, curve: 0,    hill: 8   },
      { length: 15, curve: 1.1,  hill: -8  },
      { length: 15, curve: -1.1, hill: 0   },
      { length: 15, curve: 0.9,  hill: 5   },
      { length: 15, curve: -0.7, hill: -5  },
      { length: 20, curve: 0,    hill: 0   },
      { length: 15, curve: 1.0,  hill: 0   },
      { length: 15, curve: -1.3, hill: 6   },
      { length: 15, curve: 0.6,  hill: -6  },
      { length: 15, curve: -0.5, hill: 0   },
      { length: 20, curve: 0,    hill: 0   },
      { length: 15, curve: 0.8,  hill: 0   },
      { length: 15, curve: -0.8, hill: 0   },
      { length: 20, curve: 0,    hill: 0   },
      { length: 30, curve: 0,    hill: 0   },
    ],
  },

  // ───────────────────────────────────────────────
  // Level 10 — Final Stage (Sunset Spectacular)
  // ───────────────────────────────────────────────
  {
    theme: 'Final Stage',
    skyColor: '#8020A0',
    skyColorBottom: '#E04830',
    fogColor: '#802060',
    grassLight: '#184018',
    grassDark: '#103010',
    roadLight: '#686870',
    roadDark: '#505058',
    rumbleLight: '#FFFF00',
    rumbleDark: '#FF00FF',
    timeLimit: 55,
    trafficDensity: 30,
    trafficSpeedMult: 1.3,
    scenerySet: ['palmTree', 'pineTree', 'rock', 'billboard', 'cactus'],
    background: {
      layers: [
        { type: 'clouds',    speed: 0.08, color: '#E08060', y: 0.10, count: 5 },
        { type: 'mountains', speed: 0.18, color: '#602048', y: 0.42, height: 0.35, peaks: 6 },
        { type: 'mountains', speed: 0.3,  color: '#401030', y: 0.55, height: 0.22, peaks: 9 },
        { type: 'treeline',  speed: 0.45, color: '#201820', y: 0.70, height: 0.10 },
      ],
    },
    checkpoints: [
      { segment: 110, timeBonus: 14 },
      { segment: 240, timeBonus: 12 },
      { segment: 370, timeBonus: 12 },
    ],
    roadSpec: [
      { length: 15, curve: 0,    hill: 0   },
      { length: 12, curve: 1.4,  hill: 12  },
      { length: 12, curve: -1.4, hill: -12 },
      { length: 12, curve: 1.2,  hill: 10  },
      { length: 12, curve: -1.2, hill: -10 },
      { length: 15, curve: 0,    hill: 0   },
      { length: 12, curve: 1.5,  hill: 0   },
      { length: 12, curve: -1.5, hill: 0   },
      { length: 12, curve: 1.3,  hill: 8   },
      { length: 12, curve: -1.3, hill: -8  },
      { length: 15, curve: 0,    hill: 15  },
      { length: 12, curve: 1.1,  hill: -15 },
      { length: 12, curve: -1.4, hill: 10  },
      { length: 12, curve: 1.0,  hill: -10 },
      { length: 12, curve: -1.0, hill: 0   },
      { length: 15, curve: 0,    hill: 0   },
      { length: 12, curve: 1.5,  hill: 12  },
      { length: 12, curve: -1.5, hill: -12 },
      { length: 12, curve: 1.3,  hill: 8   },
      { length: 12, curve: -1.3, hill: -8  },
      { length: 12, curve: 1.2,  hill: 0   },
      { length: 12, curve: -1.2, hill: 0   },
      { length: 12, curve: 1.4,  hill: 10  },
      { length: 12, curve: -1.4, hill: -10 },
      { length: 12, curve: 1.0,  hill: 5   },
      { length: 12, curve: -1.0, hill: -5  },
      { length: 12, curve: 1.5,  hill: 0   },
      { length: 12, curve: -1.5, hill: 0   },
      { length: 20, curve: 0,    hill: 0   },
      { length: 25, curve: 0,    hill: 0   },
    ],
  },
];

/**
 * Get a level config by 1-based index.
 * @param {number} levelNumber - 1 to 10
 * @returns {object}
 */
function getLevel(levelNumber) {
  const idx = Math.max(0, Math.min(levelNumber - 1, LEVELS.length - 1));
  return LEVELS[idx];
}
