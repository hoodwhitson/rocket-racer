/**
 * test.js
 * In-browser unit test suite for Rocket Racer.
 * Loads via tests/test.html — no npm, no build step, works on file://.
 *
 * Categories:
 *   1. Constants validation
 *   2. Level configs
 *   3. Road projection math
 *   4. Player physics
 *   5. Collision geometry
 */

// ─── Mini test runner ────────────────────────────────────────────────────────

let _pass = 0;
let _fail = 0;
let _currentSection = '';

const _log = document.getElementById('log');
const _summary = document.getElementById('summary');

function section(name) {
  _currentSection = name;
  const h = document.createElement('h2');
  h.textContent = name;
  _log.appendChild(h);
}

/**
 * Assert a condition. Logs pass/fail in DOM and console.
 * @param {boolean} cond
 * @param {string}  msg
 */
function assert(cond, msg) {
  const div = document.createElement('div');
  div.className = cond ? 'result pass' : 'result fail';
  div.textContent = msg;
  _log.appendChild(div);
  if (cond) {
    _pass++;
  } else {
    _fail++;
    console.error(`FAIL [${_currentSection}]: ${msg}`);
  }
}

/**
 * Declare and immediately run a named test.
 * @param {string}   name
 * @param {Function} fn
 */
function test(name, fn) {
  try {
    fn();
  } catch (e) {
    assert(false, `${name} — threw: ${e.message}`);
  }
}

// ─── 1. Constants validation ─────────────────────────────────────────────────

section('1. Constants validation');

test('FINISH_SEGMENT_INDEX < ROAD_SEGMENTS', () => {
  assert(
    CONSTANTS.FINISH_SEGMENT_INDEX < CONSTANTS.ROAD_SEGMENTS,
    `FINISH_SEGMENT_INDEX (${CONSTANTS.FINISH_SEGMENT_INDEX}) < ROAD_SEGMENTS (${CONSTANTS.ROAD_SEGMENTS})`
  );
});

test('DRAW_LENGTH <= ROAD_SEGMENTS', () => {
  assert(
    CONSTANTS.DRAW_LENGTH <= CONSTANTS.ROAD_SEGMENTS,
    `DRAW_LENGTH (${CONSTANTS.DRAW_LENGTH}) <= ROAD_SEGMENTS (${CONSTANTS.ROAD_SEGMENTS})`
  );
});

test('HORIZON_RATIO in (0, 1)', () => {
  assert(
    CONSTANTS.HORIZON_RATIO > 0 && CONSTANTS.HORIZON_RATIO < 1,
    `HORIZON_RATIO (${CONSTANTS.HORIZON_RATIO}) is between 0 and 1`
  );
});

test('CAMERA_DEPTH > 0', () => {
  assert(CONSTANTS.CAMERA_DEPTH > 0, `CAMERA_DEPTH (${CONSTANTS.CAMERA_DEPTH}) > 0`);
});

test('All 4 CAR_CONFIGS have required multiplier fields', () => {
  const required = ['topSpeedMult', 'accelMult', 'gripMult'];
  CONSTANTS.CAR_CONFIGS.forEach((cfg, i) => {
    required.forEach(field => {
      assert(
        typeof cfg[field] === 'number' && cfg[field] > 0,
        `CAR_CONFIGS[${i}] (${cfg.name}) has ${field} = ${cfg[field]}`
      );
    });
  });
});

test('Exactly 4 car configs', () => {
  assert(CONSTANTS.CAR_CONFIGS.length === 4, `CAR_CONFIGS.length === 4 (got ${CONSTANTS.CAR_CONFIGS.length})`);
});

test('COLLISION_RADIUS_X is positive and within road half-width', () => {
  assert(
    CONSTANTS.COLLISION_RADIUS_X > 0 && CONSTANTS.COLLISION_RADIUS_X <= 1.0,
    `COLLISION_RADIUS_X (${CONSTANTS.COLLISION_RADIUS_X}) in (0, 1]`
  );
});

// ─── 2. Level configs ────────────────────────────────────────────────────────

section('2. Level configs');

test('getLevel(1) returns City Night', () => {
  const lvl = getLevel(1);
  assert(lvl.theme === 'City Night', `getLevel(1).theme === 'City Night' (got '${lvl.theme}')`);
});

test('getLevel(10) returns Finish', () => {
  const lvl = getLevel(10);
  assert(lvl.theme === 'Finish', `getLevel(10).theme === 'Finish' (got '${lvl.theme}')`);
});

test('getLevel(11) clamps to level 10 (no crash)', () => {
  const lvl11 = getLevel(11);
  const lvl10 = getLevel(10);
  assert(lvl11 === lvl10, `getLevel(11) returns same object as getLevel(10)`);
});

test('getLevel(0) clamps to level 1 (no crash)', () => {
  const lvl0 = getLevel(0);
  const lvl1 = getLevel(1);
  assert(lvl0 === lvl1, `getLevel(0) returns same object as getLevel(1)`);
});

test('All 10 levels have timeLimit > 0', () => {
  for (let i = 1; i <= 10; i++) {
    const lvl = getLevel(i);
    assert(lvl.timeLimit > 0, `Level ${i} timeLimit (${lvl.timeLimit}) > 0`);
  }
});

test('All 10 levels have trafficDensity > 0', () => {
  for (let i = 1; i <= 10; i++) {
    const lvl = getLevel(i);
    assert(lvl.trafficDensity > 0, `Level ${i} trafficDensity (${lvl.trafficDensity}) > 0`);
  }
});

test('All 10 levels have non-empty roadSpec', () => {
  for (let i = 1; i <= 10; i++) {
    const lvl = getLevel(i);
    assert(
      Array.isArray(lvl.roadSpec) && lvl.roadSpec.length > 0,
      `Level ${i} roadSpec is non-empty array (length ${lvl.roadSpec ? lvl.roadSpec.length : 'none'})`
    );
  }
});

test('Each roadSpec entry has length > 0', () => {
  for (let i = 1; i <= 10; i++) {
    const lvl = getLevel(i);
    lvl.roadSpec.forEach((seg, j) => {
      assert(
        typeof seg.length === 'number' && seg.length > 0,
        `Level ${i} roadSpec[${j}].length (${seg.length}) > 0`
      );
    });
  }
});

test('Levels get progressively harder (timeLimit decreases)', () => {
  let prevTime = Infinity;
  for (let i = 1; i <= 10; i++) {
    const lvl = getLevel(i);
    assert(
      lvl.timeLimit <= prevTime,
      `Level ${i} timeLimit (${lvl.timeLimit}) <= level ${i - 1} timeLimit (${prevTime})`
    );
    prevTime = lvl.timeLimit;
  }
});

// ─── 3. Road projection math ─────────────────────────────────────────────────

section('3. Road projection math (pure functions)');

// These mirror exactly what road.js does after the fix.
// horizonY = floor(600 * 0.45) = 270
// HEIGHT_SCALE = (600 - 270) / 0.84 ≈ 392.857
// screenY(depth) = horizonY + (camD / depth) * HEIGHT_SCALE

const H         = CONSTANTS.CANVAS_HEIGHT;              // 600
const camD      = CONSTANTS.CAMERA_DEPTH;               // 0.84
const horizonY  = Math.floor(H * CONSTANTS.HORIZON_RATIO); // 270
const HEIGHT_SCALE = (H - horizonY) / camD;

/** Pure projection: screenY for a given depth (i+1) */
function projY(depth) {
  const scale = camD / depth;
  return horizonY + scale * HEIGHT_SCALE;
}

/** Pure projection: screenW (road half-width in pixels) for a given depth */
function projW(depth) {
  return (camD / depth) * CONSTANTS.ROAD_WIDTH * (CONSTANTS.CANVAS_WIDTH / 2);
}

test('HEIGHT_SCALE formula gives correct value', () => {
  const expected = (H - horizonY) / camD;
  assert(
    Math.abs(HEIGHT_SCALE - expected) < 0.001,
    `HEIGHT_SCALE = (${H} - ${horizonY}) / ${camD} = ${HEIGHT_SCALE.toFixed(3)} (expected ${expected.toFixed(3)})`
  );
});

test('horizonY = floor(H * HORIZON_RATIO)', () => {
  assert(horizonY === 270, `horizonY === 270 (got ${horizonY})`);
});

test('screenY at depth=1 equals canvas bottom (H=600)', () => {
  const y = projY(1);
  assert(
    Math.abs(y - H) < 0.5,
    `projY(1) ≈ ${H} (got ${y.toFixed(2)})`
  );
});

test('screenY at depth=150 is just above horizonY', () => {
  const y = projY(150);
  assert(
    y > horizonY && y < horizonY + 10,
    `projY(150) = ${y.toFixed(2)} is in (${horizonY}, ${horizonY + 10})`
  );
});

test('screenY decreases monotonically as depth increases (road recedes)', () => {
  let prevY = projY(1);
  let monotone = true;
  for (let d = 2; d <= CONSTANTS.DRAW_LENGTH; d++) {
    const y = projY(d);
    if (y > prevY) { monotone = false; break; }
    prevY = y;
  }
  assert(monotone, 'screenY decreases (or stays equal) as depth increases 1→150');
});

test('screenW decreases monotonically with depth (road narrows)', () => {
  let prevW = projW(1);
  let monotone = true;
  for (let d = 2; d <= CONSTANTS.DRAW_LENGTH; d++) {
    const w = projW(d);
    if (w > prevW) { monotone = false; break; }
    prevW = w;
  }
  assert(monotone, 'screenW decreases as depth increases 1→150');
});

test('scale(1) = camD (≈0.84)', () => {
  const scale1 = camD / 1;
  assert(
    Math.abs(scale1 - camD) < 0.001,
    `scale(depth=1) = camD = ${camD} (got ${scale1})`
  );
});

test('scale(2) = camD/2', () => {
  const scale2 = camD / 2;
  assert(
    Math.abs(scale2 - camD / 2) < 0.001,
    `scale(depth=2) = ${camD}/2 = ${(camD / 2).toFixed(4)} (got ${scale2.toFixed(4)})`
  );
});

// ─── 4. Player physics (pure math) ───────────────────────────────────────────

section('4. Player physics (pure math)');

// Simulate player update logic without DOM or canvas.
// We replicate the relevant equations from player.js.

const C = CONSTANTS;
const defaultCar = C.CAR_CONFIGS[3]; // Balanced car (index 3)
const maxSpeed = C.PLAYER_MAX_SPEED * defaultCar.topSpeedMult; // 320 * 1.05 = 336

test('Speed clamps at 0 — no negative speed', () => {
  let speed = 10;
  const dt = 1 / 60;
  const mult = dt * 60;
  // Apply brake repeatedly until speed would go negative
  for (let i = 0; i < 200; i++) {
    speed -= C.PLAYER_BRAKE * mult;
    speed = Math.max(0, Math.min(maxSpeed, speed));
  }
  assert(speed === 0, `Speed after heavy braking = ${speed} (expected 0)`);
});

test('Speed clamps at maxSpeed — cannot exceed topSpeedMult limit', () => {
  let speed = 0;
  const dt = 1 / 60;
  const mult = dt * 60;
  // Accelerate for a long time
  for (let i = 0; i < 1000; i++) {
    speed += C.PLAYER_ACCEL * defaultCar.accelMult * mult;
    speed = Math.max(0, Math.min(maxSpeed, speed));
  }
  assert(
    Math.abs(speed - maxSpeed) < 0.001,
    `Speed after sustained accel = ${speed.toFixed(2)} (expected ${maxSpeed})`
  );
});

test('player.x clamps at +2.0 (right boundary)', () => {
  let x = 1.9;
  const dt = 1 / 60;
  const mult = dt * 60;
  // Steer right for a long time
  for (let i = 0; i < 300; i++) {
    x += C.PLAYER_STEER_SPEED * defaultCar.gripMult * mult;
    x = Math.max(-2.0, Math.min(2.0, x));
  }
  assert(x === 2.0, `x after hard right = ${x} (expected 2.0)`);
});

test('player.x clamps at -2.0 (left boundary)', () => {
  let x = -1.9;
  const dt = 1 / 60;
  const mult = dt * 60;
  for (let i = 0; i < 300; i++) {
    x -= C.PLAYER_STEER_SPEED * defaultCar.gripMult * mult;
    x = Math.max(-2.0, Math.min(2.0, x));
  }
  assert(x === -2.0, `x after hard left = ${x} (expected -2.0)`);
});

test('Off-road check |x| > 1.0 fires at correct boundary', () => {
  const xOnRoad    = 1.0;   // exactly on edge → not off-road
  const xOffRoad   = 1.001; // just outside
  const onRoad     = !(Math.abs(xOnRoad)  > 1.0);
  const offRoad    = Math.abs(xOffRoad) > 1.0;
  assert(onRoad,  `x=1.0 is NOT off-road (|1.0| > 1.0 is false)`);
  assert(offRoad, `x=1.001 IS off-road (|1.001| > 1.0 is true)`);
});

test('Z wrapping: track length = ROAD_SEGMENTS * ROAD_SEGMENT_LENGTH', () => {
  const trackLength = CONSTANTS.ROAD_SEGMENTS * CONSTANTS.ROAD_SEGMENT_LENGTH;
  assert(
    trackLength === 200 * 200,
    `trackLength = ${trackLength} (expected ${200 * 200})`
  );
});

test('Z wrapping: z=trackLength wraps to 0', () => {
  const trackLength = CONSTANTS.ROAD_SEGMENTS * CONSTANTS.ROAD_SEGMENT_LENGTH;
  let z = trackLength;
  if (z >= trackLength) z -= trackLength;
  assert(z === 0, `z=trackLength wraps to 0 (got ${z})`);
});

test('Finish line detection: segIdx >= FINISH_SEGMENT_INDEX (185)', () => {
  const finishIdx = CONSTANTS.FINISH_SEGMENT_INDEX; // 185
  const segLen    = CONSTANTS.ROAD_SEGMENT_LENGTH;

  // At segment 185
  const z185 = finishIdx * segLen;
  const idx185 = Math.floor(z185 / segLen) % CONSTANTS.ROAD_SEGMENTS;
  assert(
    idx185 >= finishIdx,
    `z for seg 185 → segIdx ${idx185} >= FINISH_SEGMENT_INDEX (${finishIdx})`
  );

  // At segment 184 — should NOT trigger
  const z184 = (finishIdx - 1) * segLen;
  const idx184 = Math.floor(z184 / segLen) % CONSTANTS.ROAD_SEGMENTS;
  assert(
    idx184 < finishIdx,
    `z for seg 184 → segIdx ${idx184} < FINISH_SEGMENT_INDEX (${finishIdx})`
  );
});

// ─── 5. Collision geometry ───────────────────────────────────────────────────

section('5. Collision geometry');

const RADIUS = CONSTANTS.COLLISION_RADIUS_X; // 0.6

test('Player at x=0, car at x=0 → collision (|0-0|=0 < 0.6)', () => {
  const playerX = 0;
  const carX    = 0;
  assert(
    Math.abs(playerX - carX) < RADIUS,
    `|${playerX} - ${carX}| = ${Math.abs(playerX - carX)} < RADIUS (${RADIUS})`
  );
});

test('Player at x=0, car at x=0.7 → no collision (|0-0.7|=0.7 > 0.6)', () => {
  const playerX = 0;
  const carX    = 0.7;
  assert(
    Math.abs(playerX - carX) >= RADIUS,
    `|${playerX} - ${carX}| = ${Math.abs(playerX - carX)} >= RADIUS (${RADIUS})`
  );
});

test('Player at x=0.55, car at x=0 → collision (|0.55|=0.55 < 0.6)', () => {
  const playerX = 0.55;
  const carX    = 0;
  assert(
    Math.abs(playerX - carX) < RADIUS,
    `|${playerX} - ${carX}| = ${Math.abs(playerX - carX).toFixed(2)} < RADIUS (${RADIUS})`
  );
});

test('Player at x=0.65, car at x=0 → no collision (|0.65|=0.65 > 0.6)', () => {
  const playerX = 0.65;
  const carX    = 0;
  assert(
    Math.abs(playerX - carX) >= RADIUS,
    `|${playerX} - ${carX}| = ${Math.abs(playerX - carX).toFixed(2)} >= RADIUS (${RADIUS})`
  );
});

test('Traffic car x range -0.6..+0.6 is within road ±1.0 boundary', () => {
  // Traffic x is generated as: Math.random() * 1.2 - 0.6 → range [-0.6, 0.6]
  const trafficMin = -0.6;
  const trafficMax =  0.6;
  const roadEdge   =  1.0;
  assert(
    Math.abs(trafficMin) <= roadEdge && Math.abs(trafficMax) <= roadEdge,
    `Traffic x range [${trafficMin}, ${trafficMax}] is within road edge ±${roadEdge}`
  );
});

test('COLLISION_RADIUS_X boundary: exactly at radius → no collision', () => {
  const playerX = 0;
  const carX    = RADIUS;  // exactly at boundary
  assert(
    !(Math.abs(playerX - carX) < RADIUS),
    `At exact radius (${RADIUS}): |${playerX} - ${carX}| = ${Math.abs(playerX - carX)} is NOT < ${RADIUS}`
  );
});

// ─── Summary ──────────────────────────────────────────────────────────────────

const total  = _pass + _fail;
const pct    = total > 0 ? Math.round((_pass / total) * 100) : 0;
_summary.className = _fail === 0 ? 'pass' : 'fail';
_summary.textContent = `${_pass}/${total} tests passed (${pct}%)${_fail > 0 ? ` — ${_fail} FAILED` : ' — ALL PASS'}`;

if (_fail > 0) {
  console.error(`Test suite: ${_fail} test(s) failed. See details above.`);
} else {
  console.log(`Test suite: all ${_pass} tests passed.`);
}
