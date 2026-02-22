# Plan: Build Rad Racer Clone

## First Step
Create `docs/plan.md` in the project root with this plan's contents.

## Context
Building a retro-style pseudo-3D browser racing game from scratch, inspired by the NES classic Rad Racer. The project directory currently contains only `CLAUDE.md` (the spec) and an empty `prompts.txt`. All 10 files must be created. No frameworks, no npm, no build step — open `index.html` and play.

---

## Files to Create

| File | Purpose |
|---|---|
| `index.html` | Entry point; canvas + touch div; script load order |
| `css/style.css` | Black bg, canvas centering, touch button overlay |
| `js/constants.js` | All magic numbers (speeds, colors, car configs, states) |
| `js/audio.js` | `AudioManager` class — Web Audio API engine hum + SFX |
| `js/road.js` | `Road` class — pseudo-3D segment renderer (hardest file) |
| `js/player.js` | `Player` class — physics, input, collision, car sprite |
| `js/level.js` | `LEVELS` array (10 configs) + `getLevel()` helper |
| `js/ui.js` | `UI` class — all HUD, menus, overlays drawn to canvas |
| `js/game.js` | `Game` class — state machine, owns all subsystems |
| `js/main.js` | `requestAnimationFrame` game loop + font-ready gate |

---

## Build Order

**Phase 1 — Foundation**
1. `index.html` — canvas `800×600`, touch `<div>`, `<script>` tags in dependency order; `document.fonts.ready.then(startLoop)` in main.js
2. `css/style.css` — `display:flex` centering, `width:100%; height:auto` on canvas, `image-rendering: pixelated`, touch button `pointer-events`
3. `js/constants.js` — single global `CONSTANTS` object (no modules, must work on `file://`)

**Phase 2 — Core Logic**
4. `js/audio.js` — `AudioManager`: `init()` called on first user gesture; sawtooth oscillator engine hum with `exponentialRampToValueAtTime` (never pass 0, use 0.001); white-noise crash; square-wave jingles
5. `js/level.js` — 10 `LevelConfig` objects with palette, road spec array (enter/hold/leave/curve/hill), trafficDensity, timeLimit

**Phase 3 — Road Renderer** (most complex)
6. `js/road.js` — `Road` class:
   - `buildTrack(levelConfig)`: pre-allocate `segments[]` with eased curve/hill values; never reallocate in loop
   - `_projectSegment()`: mutate `.camera` and `.screen` in-place (no object allocation)
   - Projection math: `scale = CAMERA_DEPTH / camera.z`, `screen.x = W/2 + scale * world.x * W/2`
   - Render back-to-front; accumulate `cameraX += seg.curve` for curve illusion
   - Hill occlusion: track `maxScreenY`, skip segments where `p1.screen.y >= maxScreenY`
   - Fog: lerp each segment color toward sky color by `Math.pow(i/DRAW_LENGTH, FOG_DENSITY)`
   - Scenery sprites: scale by `seg.p1.screen.scale`, draw after road polygon (painter's algorithm)

**Phase 4 — Player**
7. `js/player.js` — `Player` class:
   - Physics: `speed`, `x` (lateral −2 to +2), `z` (depth)
   - Per-frame: accel/brake → speed; steer → x offset; centrifugal drift `x -= seg.curve * speedPercent * CENTRIFUGAL_FORCE * dt`
   - Off-road: `speed *= OFFROAD_DECEL` when `|x| > 1.0`
   - Car stats applied as multipliers: `topSpeedMult`, `accelMult`, `gripMult`
   - Sprite: 3 pre-drawn offscreen canvases (straight / left / right), chosen by steer direction
   - Collision: check if player Z within 2 segments of traffic car AND `|playerX − trafficX| < COLLISION_RADIUS_X`

**Phase 5 — UI**
8. `js/ui.js` — `UI` class with per-state draw methods:
   - `drawMainMenu()` — animated title, blinking PRESS ENTER
   - `drawCarSelect()` — 4-car carousel, stat bars, animated car preview
   - `drawHUD()` — speedometer arc, timer, lives icons, level, score
   - `drawWinScreen()` — firework particles, scrolling CONGRATULATIONS banner, final stats
   - `drawGameOver()`, `drawLevelComplete()`, `drawPauseOverlay()`
   - Win screen banner: `bannerX = CANVAS_WIDTH - (frameCount * 2) % (CANVAS_WIDTH + textWidth)`

**Phase 6 — Integration**
9. `js/game.js` — `Game` class state machine:
   - States: `MAIN_MENU → CAR_SELECT → GAMEPLAY ↔ PAUSED / LEVEL_COMPLETE / GAME_OVER / WIN_SCREEN`
   - `_onEnterState()`: side effects (start/stop audio, reset timers, init fireworks pool)
   - `AudioContext` created on first user gesture (autoplay policy guard)
   - All mutable state in `this.gameState` object — no other globals
   - Pre-allocated `Particle[]` pool for fireworks (`active` flag, no push/pop)
10. `js/main.js` — minimal: `document.fonts.ready.then(() => requestAnimationFrame(loop))`, cap `dt = Math.min(dt, 0.05)`

---

## Key Implementation Details

- **No ES modules** — must work on `file://`; one top-level class or const per file; only globals are `CONSTANTS`, `AudioManager`, `Road`, `Player`, `LEVELS`, `getLevel`, `UI`, `Game`
- **Delta-time pattern**: physics constants written as "per tick at 60fps", multiplied by `dt * 60` so behavior is frame-rate independent
- **Road polygon**: use `ctx.beginPath()` trapezoid (4 `lineTo` calls) — no `fillPolygon` API
- **Pre-allocate**: segment `.camera` and `.screen` sub-objects allocated in `buildTrack`, mutated in place each frame
- **Touch controls**: use HTML `<button>` elements with `pointerdown`/`pointerup` events (avoids coordinate-space conversion from CSS-scaled canvas)
- **`ctx.save()`/`ctx.restore()`**: required around every sprite draw that touches `globalAlpha` or transforms
- **`exponentialRampToValueAtTime`**: never pass frequency value of `0` — use `0.001` minimum
- **Finish line**: player Z reset to 0 on level start; finish check `segmentIndex >= FINISH_SEGMENT_INDEX`
- **Font race condition**: gate `requestAnimationFrame` start behind `document.fonts.ready`

---

## Level Themes (10 palettes)

| # | Theme | Sky | Special |
|---|---|---|---|
| 1 | City Night | `#1a1a2e` | Gentle intro |
| 2 | Suburbs | `#87CEEB` | Light traffic |
| 3 | Desert | `#FF8C00` | Sandy tones |
| 4 | Mountains | `#4B6FA5` | Hills + curves |
| 5 | Night City | `#000010` | Tight time |
| 6 | Tropical | `#00CED1` | S-curves |
| 7 | Autumn | `#8B4513` | Dense traffic |
| 8 | Snowy | `#B0C4DE` | Heavy fog |
| 9 | Canyon | `#8B0000` | Max curves |
| 10 | Finish | `#000` | Full difficulty |

---

## Verification

1. Open `index.html` directly in Chrome, Firefox, and Safari — no server needed
2. Confirm 60fps in DevTools Performance panel
3. Play through all 10 levels verifying: car select works, HUD updates, lives decrement on collision/timeout, GAME_OVER shows on 0 lives, WIN_SCREEN fires after level 10
4. Test on mobile: touch buttons respond, canvas scales correctly
5. Confirm audio: engine pitch rises with speed, crash sound plays on collision, jingle plays on level complete, fanfare plays on win
6. Tab out mid-game and tab back: `dt` cap prevents physics explosion
