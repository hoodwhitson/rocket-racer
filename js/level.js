/**
 * level.js
 * Level configurations and helper. 10 progressively harder levels.
 */

/**
 * Road spec segment types:
 *   { length, curve, hill }
 *   length = number of road segments
 *   curve  = lateral curve per segment (negative=left, positive=right)
 *   hill   = vertical offset change per segment
 */

/** @type {Array<LevelConfig>} */
const LEVELS = [
  // Level 1 — City Night (gentle intro)
  {
    theme: 'City Night',
    skyColor: '#1a1a2e',
    skyColorBottom: '#16213e',
    grassLight: '#1a4a1a',
    grassDark: '#143814',
    roadLight: '#6b6b6b',
    roadDark: '#555',
    rumbleLight: '#fff',
    rumbleDark: '#dd2222',
    fogColor: '#1a1a2e',
    timeLimit: 60,
    trafficDensity: 3,
    trafficSpeedMult: 0.7,
    roadSpec: [
      { length: 30, curve: 0,    hill: 0   },
      { length: 20, curve: 0.5,  hill: 0   },
      { length: 30, curve: 0,    hill: 0   },
      { length: 20, curve: -0.4, hill: 0   },
      { length: 30, curve: 0,    hill: 0   },
      { length: 20, curve: 0.3,  hill: 0   },
      { length: 30, curve: 0,    hill: 0   },
    ],
  },

  // Level 2 — Suburbs (light traffic)
  {
    theme: 'Suburbs',
    skyColor: '#87CEEB',
    skyColorBottom: '#b0e0ff',
    grassLight: '#33bb33',
    grassDark: '#229922',
    roadLight: '#707070',
    roadDark: '#5a5a5a',
    rumbleLight: '#fff',
    rumbleDark: '#dd2222',
    fogColor: '#c8e8ff',
    timeLimit: 55,
    trafficDensity: 5,
    trafficSpeedMult: 0.8,
    roadSpec: [
      { length: 25, curve: 0,    hill: 0   },
      { length: 20, curve: 0.7,  hill: 0   },
      { length: 20, curve: -0.5, hill: 0   },
      { length: 25, curve: 0,    hill: 5   },
      { length: 20, curve: 0.4,  hill: -5  },
      { length: 25, curve: 0,    hill: 0   },
      { length: 20, curve: -0.6, hill: 0   },
      { length: 25, curve: 0,    hill: 0   },
    ],
  },

  // Level 3 — Desert
  {
    theme: 'Desert',
    skyColor: '#FF8C00',
    skyColorBottom: '#ffaa44',
    grassLight: '#c8a020',
    grassDark: '#a07818',
    roadLight: '#d2b48c',
    roadDark: '#b8986a',
    rumbleLight: '#fff',
    rumbleDark: '#dd2222',
    fogColor: '#ffaa44',
    timeLimit: 52,
    trafficDensity: 6,
    trafficSpeedMult: 0.85,
    roadSpec: [
      { length: 20, curve: 0,    hill: 0   },
      { length: 25, curve: 1.0,  hill: 0   },
      { length: 20, curve: 0,    hill: 8   },
      { length: 20, curve: -0.8, hill: -8  },
      { length: 20, curve: 0,    hill: 0   },
      { length: 25, curve: 0.6,  hill: 5   },
      { length: 20, curve: -0.6, hill: 0   },
      { length: 30, curve: 0,    hill: 0   },
    ],
  },

  // Level 4 — Mountains (hills + curves)
  {
    theme: 'Mountains',
    skyColor: '#4B6FA5',
    skyColorBottom: '#7090c0',
    grassLight: '#2d6a2d',
    grassDark: '#1e4e1e',
    roadLight: '#808080',
    roadDark: '#666',
    rumbleLight: '#fff',
    rumbleDark: '#dd2222',
    fogColor: '#7090c0',
    timeLimit: 50,
    trafficDensity: 7,
    trafficSpeedMult: 0.9,
    roadSpec: [
      { length: 20, curve: 0.5,  hill: 15  },
      { length: 20, curve: 0.8,  hill: -10 },
      { length: 20, curve: -0.6, hill: 12  },
      { length: 15, curve: -1.0, hill: -15 },
      { length: 20, curve: 0.3,  hill: 8   },
      { length: 20, curve: 0,    hill: 0   },
      { length: 20, curve: 0.7,  hill: 10  },
      { length: 15, curve: -0.8, hill: -10 },
      { length: 20, curve: 0,    hill: 0   },
    ],
  },

  // Level 5 — Night City (tight time)
  {
    theme: 'Night City',
    skyColor: '#000010',
    skyColorBottom: '#000820',
    grassLight: '#111133',
    grassDark: '#0a0a22',
    roadLight: '#5a5a5a',
    roadDark: '#484848',
    rumbleLight: '#ff8800',
    rumbleDark: '#ff2200',
    fogColor: '#000820',
    timeLimit: 45,
    trafficDensity: 8,
    trafficSpeedMult: 1.0,
    roadSpec: [
      { length: 15, curve: 0,    hill: 0   },
      { length: 20, curve: 1.2,  hill: 0   },
      { length: 15, curve: -1.0, hill: 0   },
      { length: 15, curve: 0.8,  hill: 5   },
      { length: 20, curve: -0.9, hill: -5  },
      { length: 15, curve: 0,    hill: 0   },
      { length: 20, curve: 1.1,  hill: 8   },
      { length: 15, curve: -0.7, hill: -8  },
      { length: 20, curve: 0.5,  hill: 0   },
      { length: 15, curve: 0,    hill: 0   },
    ],
  },

  // Level 6 — Tropical (S-curves)
  {
    theme: 'Tropical',
    skyColor: '#00CED1',
    skyColorBottom: '#00aacc',
    grassLight: '#00aa44',
    grassDark: '#008833',
    roadLight: '#888',
    roadDark: '#666',
    rumbleLight: '#fff',
    rumbleDark: '#ff2200',
    fogColor: '#00ccdd',
    timeLimit: 48,
    trafficDensity: 8,
    trafficSpeedMult: 1.0,
    roadSpec: [
      { length: 12, curve: 1.2,  hill: 0   },
      { length: 12, curve: -1.2, hill: 0   },
      { length: 12, curve: 1.0,  hill: 5   },
      { length: 12, curve: -1.0, hill: -5  },
      { length: 12, curve: 1.3,  hill: 0   },
      { length: 12, curve: -1.3, hill: 0   },
      { length: 12, curve: 0.8,  hill: 8   },
      { length: 12, curve: -0.8, hill: -8  },
      { length: 12, curve: 1.1,  hill: 0   },
      { length: 12, curve: -1.1, hill: 0   },
      { length: 16, curve: 0,    hill: 0   },
    ],
  },

  // Level 7 — Autumn (dense traffic)
  {
    theme: 'Autumn',
    skyColor: '#8B4513',
    skyColorBottom: '#a05520',
    grassLight: '#cc6600',
    grassDark: '#aa4400',
    roadLight: '#888',
    roadDark: '#666',
    rumbleLight: '#ffdd00',
    rumbleDark: '#ff4400',
    fogColor: '#aa5520',
    timeLimit: 45,
    trafficDensity: 10,
    trafficSpeedMult: 1.05,
    roadSpec: [
      { length: 15, curve: 0.9,  hill: 0   },
      { length: 15, curve: -0.9, hill: 8   },
      { length: 15, curve: 1.1,  hill: -8  },
      { length: 15, curve: -1.1, hill: 6   },
      { length: 15, curve: 0.7,  hill: -6  },
      { length: 15, curve: -0.7, hill: 0   },
      { length: 15, curve: 1.3,  hill: 10  },
      { length: 15, curve: -1.3, hill: -10 },
      { length: 15, curve: 0,    hill: 0   },
      { length: 15, curve: 0.8,  hill: 0   },
      { length: 15, curve: -0.8, hill: 0   },
    ],
  },

  // Level 8 — Snowy (heavy fog)
  {
    theme: 'Snowy',
    skyColor: '#B0C4DE',
    skyColorBottom: '#c8d8ee',
    grassLight: '#ddeeff',
    grassDark: '#c0d8f0',
    roadLight: '#e0e0e8',
    roadDark: '#c8c8d8',
    rumbleLight: '#fff',
    rumbleDark: '#4488ff',
    fogColor: '#ddeeff',
    fogDensity: 5.0,
    timeLimit: 42,
    trafficDensity: 9,
    trafficSpeedMult: 1.05,
    roadSpec: [
      { length: 15, curve: 0.7,  hill: 12  },
      { length: 15, curve: -0.7, hill: -12 },
      { length: 15, curve: 1.1,  hill: 8   },
      { length: 15, curve: -1.1, hill: -8  },
      { length: 15, curve: 0.9,  hill: 0   },
      { length: 15, curve: -0.9, hill: 0   },
      { length: 15, curve: 0.5,  hill: 10  },
      { length: 15, curve: -0.5, hill: -10 },
      { length: 15, curve: 1.2,  hill: 5   },
      { length: 15, curve: -1.2, hill: -5  },
      { length: 20, curve: 0,    hill: 0   },
    ],
  },

  // Level 9 — Canyon (max curves)
  {
    theme: 'Canyon',
    skyColor: '#8B0000',
    skyColorBottom: '#aa1111',
    grassLight: '#884400',
    grassDark: '#662200',
    roadLight: '#aa7755',
    roadDark: '#885533',
    rumbleLight: '#fff',
    rumbleDark: '#ff2200',
    fogColor: '#880000',
    timeLimit: 40,
    trafficDensity: 11,
    trafficSpeedMult: 1.1,
    roadSpec: [
      { length: 10, curve: 1.5,  hill: 0   },
      { length: 10, curve: -1.5, hill: 10  },
      { length: 10, curve: 1.4,  hill: -10 },
      { length: 10, curve: -1.4, hill: 8   },
      { length: 10, curve: 1.3,  hill: -8  },
      { length: 10, curve: -1.3, hill: 0   },
      { length: 10, curve: 1.5,  hill: 12  },
      { length: 10, curve: -1.5, hill: -12 },
      { length: 10, curve: 1.2,  hill: 0   },
      { length: 10, curve: -1.2, hill: 6   },
      { length: 10, curve: 1.1,  hill: -6  },
      { length: 10, curve: -1.1, hill: 0   },
      { length: 20, curve: 0,    hill: 0   },
    ],
  },

  // Level 10 — Finish (full difficulty)
  {
    theme: 'Finish',
    skyColor: '#000000',
    skyColorBottom: '#110011',
    grassLight: '#111111',
    grassDark: '#090909',
    roadLight: '#777',
    roadDark: '#555',
    rumbleLight: '#ffff00',
    rumbleDark: '#ff00ff',
    fogColor: '#000011',
    timeLimit: 38,
    trafficDensity: 13,
    trafficSpeedMult: 1.2,
    roadSpec: [
      { length: 10, curve: 1.5,  hill: 15  },
      { length: 10, curve: -1.5, hill: -15 },
      { length: 10, curve: 1.3,  hill: 12  },
      { length: 10, curve: -1.3, hill: -12 },
      { length: 10, curve: 1.4,  hill: 0   },
      { length: 10, curve: -1.4, hill: 0   },
      { length: 10, curve: 1.2,  hill: 10  },
      { length: 10, curve: -1.2, hill: -10 },
      { length: 10, curve: 1.5,  hill: 8   },
      { length: 10, curve: -1.5, hill: -8  },
      { length: 10, curve: 1.0,  hill: 5   },
      { length: 10, curve: -1.0, hill: -5  },
      { length: 10, curve: 1.3,  hill: 0   },
      { length: 10, curve: -1.3, hill: 0   },
      { length: 20, curve: 0,    hill: 0   },
    ],
  },
];

/**
 * Get a level config by 1-based index.
 * @param {number} levelNumber - 1 to 10
 * @returns {object} Level configuration object
 */
function getLevel(levelNumber) {
  const idx = Math.max(0, Math.min(levelNumber - 1, LEVELS.length - 1));
  return LEVELS[idx];
}
