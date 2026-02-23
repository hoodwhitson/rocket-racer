/**
 * constants.js
 * All game configuration values. Never hardcode magic numbers elsewhere.
 */
const CONSTANTS = {
  // Canvas
  CANVAS_WIDTH: 800,
  CANVAS_HEIGHT: 600,

  // Game states
  STATE_MAIN_MENU: 'MAIN_MENU',
  STATE_CAR_SELECT: 'CAR_SELECT',
  STATE_GAMEPLAY: 'GAMEPLAY',
  STATE_PAUSED: 'PAUSED',
  STATE_LEVEL_COMPLETE: 'LEVEL_COMPLETE',
  STATE_GAME_OVER: 'GAME_OVER',
  STATE_WIN_SCREEN: 'WIN_SCREEN',

  // Game rules
  TOTAL_LIVES: 3,
  TOTAL_LEVELS: 10,

  // Road renderer
  ROAD_SEGMENT_LENGTH: 150,       // world units per segment (was 200)
  ROAD_WIDTH: 0.75,               // normalized road half-width
  ROAD_SEGMENTS: 500,             // total segments in track (was 200)
  DRAW_LENGTH: 110,               // segments to draw ahead (was 150)
  CAMERA_HEIGHT: 1000,            // camera height above road
  CAMERA_DEPTH: 0.78,             // FOV factor (was 0.84, wider for speed feel)
  FOG_DENSITY: 3.5,               // fog intensity exponent
  STRIPE_GROUP: 3,                // segments per stripe alternation (was 4)

  // Road colors
  ROAD_COLOR_LIGHT: '#6b6b6b',
  ROAD_COLOR_DARK: '#555555',
  GRASS_COLOR_LIGHT: '#10aa10',
  GRASS_COLOR_DARK: '#009A00',
  RUMBLE_COLOR_LIGHT: '#fff',
  RUMBLE_COLOR_DARK: '#f00',
  LANE_COLOR: '#fff',

  // Horizon / road proportions
  HORIZON_RATIO: 0.45,            // sky takes this fraction of canvas height
  ROAD_HORIZON_HEIGHT: 3,         // rumble strip height at horizon (px)

  // Player physics (per 60hz tick; multiply by dt*60 in update)
  PLAYER_MAX_SPEED: 1440,         // world units / tick at 60fps (3x of 480)
  PLAYER_ACCEL: 16.5,
  PLAYER_BRAKE: 24.0,
  PLAYER_DECEL: 2.5,              // natural friction
  PLAYER_STEER_SPEED: 0.05,
  CENTRIFUGAL_FORCE: 0.3,
  OFFROAD_DECEL: 0.97,            // speed multiplier per tick when off-road
  OFFROAD_STEER_DECEL: 0.98,
  COLLISION_RADIUS_X: 0.6,        // lateral collision threshold
  COLLISION_SPEED_PENALTY: 0.5,   // speed multiplier on collision

  // Player position
  PLAYER_Z: 0.6,
  PLAYER_SCREEN_X: 0.5,
  PLAYER_SCREEN_Y_OFFSET: 0.1,

  // Car configs [topSpeedMult, accelMult, gripMult]
  CAR_CONFIGS: [
    { name: 'Speedster',  color: '#FF4444', bodyColor: '#CC0000', speed: 5, handling: 3, accel: 3, topSpeedMult: 1.3,  accelMult: 1.0,  gripMult: 0.8  },
    { name: 'Grip King',  color: '#44AAFF', bodyColor: '#0066CC', speed: 3, handling: 5, accel: 3, topSpeedMult: 0.9,  accelMult: 1.0,  gripMult: 1.4  },
    { name: 'Muscle',     color: '#FFAA00', bodyColor: '#CC7700', speed: 4, handling: 2, accel: 5, topSpeedMult: 1.1,  accelMult: 1.4,  gripMult: 0.65 },
    { name: 'Balanced',   color: '#44FF88', bodyColor: '#00BB55', speed: 4, handling: 4, accel: 4, topSpeedMult: 1.05, accelMult: 1.1,  gripMult: 1.05 },
  ],

  // Traffic
  TRAFFIC_SPEED_MIN: 60,
  TRAFFIC_SPEED_MAX: 120,
  TRAFFIC_COLORS: ['#cc4444','#44cc44','#4444cc','#cccc44','#cc44cc','#44cccc','#ffffff','#ff8800'],

  // Finish line
  FINISH_SEGMENT_INDEX: 470,      // segment that triggers level complete (was 185)

  // Checkpoints
  CHECKPOINT_DISPLAY_TIME: 2.0,   // seconds to show checkpoint notification

  // Crash animation
  CRASH_DURATION: 1.5,            // seconds for crash tumble

  // Score
  SCORE_PER_SECOND: 10,
  SCORE_PER_LEVEL_COMPLETE: 1000,

  // Win screen particles
  PARTICLE_COUNT: 150,

  // UI
  HUD_PADDING: 16,
  HUD_FONT_SIZE: 10,
  DASHBOARD_HEIGHT: 70,           // height of dashboard panel at bottom

  // Audio
  ENGINE_FREQ_MIN: 60,
  ENGINE_FREQ_MAX: 480,
};
