/**
 * road.js
 * Road — pseudo-3D segment-based road renderer.
 *
 * Rendering model (Rad Racer / Out Run style):
 *   - Segments are scanned from near (i=0) to far (i=drawLen-1)
 *   - Perspective scale = CAMERA_DEPTH / (i + 1)
 *   - screenW = scale * ROAD_WIDTH * (W/2)          — road gets narrower with depth
 *   - screenY = horizonY - hillAccum                 — accumulated hill offset in px
 *   - screenX = W/2 + xOffset - playerX * screenW   — curve offset + lateral position
 *     where xOffset accumulates seg.curve * CURVE_SCALE each step (screen-space, near→far)
 *
 * Key insight: xOffset is screen-space (pixels), NOT world-space × scale.
 * This makes near road centered and far road visually curved away from center.
 */
class Road {
  /** @param {HTMLCanvasElement} canvas */
  constructor(canvas) {
    this.canvas = canvas;
    this.ctx    = canvas.getContext('2d');

    this.segments = [];
    this.traffic  = [];
    this.levelConfig = null;
    this._playerSegmentIndex = 0;

    // Pre-allocate segment pool
    const poolSize = CONSTANTS.ROAD_SEGMENTS + CONSTANTS.DRAW_LENGTH + 10;
    for (let i = 0; i < poolSize; i++) {
      this.segments.push(this._makeSegment(i));
    }

    // Projection cache — mutated each frame, no allocation in loop
    this._proj = [];
    for (let i = 0; i < CONSTANTS.DRAW_LENGTH; i++) {
      this._proj.push({ seg: null, x: 0, y: 0, w: 0, scale: 0, fogT: 0 });
    }

    // Scale factor: how many screen pixels per unit of seg.curve, per segment step
    // Tuned so max curve (section.curve≈1.5 → seg.curve≈0.027) produces ~90px shift at horizon
    this._CURVE_SCALE = 22;
  }

  // ─────────────────────────────────────────────────────────────
  // Public API
  // ─────────────────────────────────────────────────────────────

  /**
   * Build track segments from level config.
   * @param {object} levelConfig
   */
  buildTrack(levelConfig) {
    this.levelConfig = levelConfig;
    const segs  = this.segments;
    const total = CONSTANTS.ROAD_SEGMENTS;
    const spec  = levelConfig.roadSpec;

    // Expand road spec into flat list
    const flat = [];
    for (const s of spec) {
      for (let k = 0; k < s.length; k++) flat.push({ curve: s.curve, hill: s.hill });
    }

    for (let i = 0; i < total; i++) {
      const src = flat[i % flat.length];
      const seg = segs[i];
      seg.index    = i;
      seg.curve    = src.curve * 0.018;   // world-curve units
      seg.hill     = src.hill  * 0.55;    // hill in screen-space units
      seg.isLight  = Math.floor(i / 4) % 2 === 0;
      seg.isFinish = i >= CONSTANTS.FINISH_SEGMENT_INDEX;

      // Scenery placement (deterministic, based on index)
      seg.scenery  = (i % 10 === 0 && !seg.isFinish)
                   ? { type: (i % 30 === 0 ? 'sign' : 'tree'), side: (i % 20 === 0 ? -1 : 1) }
                   : null;
      seg.scenery2 = (i % 10 === 5 && !seg.isFinish)
                   ? { type: 'tree', side: (i % 20 === 5 ? 1 : -1) }
                   : null;
    }
  }

  /**
   * Spawn traffic cars for the given level.
   * @param {object} levelConfig
   */
  spawnTraffic(levelConfig) {
    this.traffic = [];
    const colors = CONSTANTS.TRAFFIC_COLORS;
    for (let i = 0; i < levelConfig.trafficDensity; i++) {
      this.traffic.push({
        segmentIndex: Math.floor(20 + Math.random() * (CONSTANTS.ROAD_SEGMENTS - 40)),
        x:     (Math.random() * 1.2 - 0.6),   // lateral: -0.6..+0.6 (within road)
        speed: (CONSTANTS.TRAFFIC_SPEED_MIN
                + Math.random() * (CONSTANTS.TRAFFIC_SPEED_MAX - CONSTANTS.TRAFFIC_SPEED_MIN))
               * levelConfig.trafficSpeedMult,
        color:  colors[i % colors.length],
        width:  0.30 + Math.random() * 0.08,
        height: 0.60 + Math.random() * 0.15,
      });
    }
  }

  /** @param {number} dt */
  updateTraffic(dt) {
    const total  = CONSTANTS.ROAD_SEGMENTS;
    const segLen = CONSTANTS.ROAD_SEGMENT_LENGTH;
    for (const car of this.traffic) {
      car.segmentIndex = (car.segmentIndex + car.speed * dt / segLen * 60) % total;
      if (car.segmentIndex < 0) car.segmentIndex += total;
    }
  }

  /**
   * Render the full road scene.
   * @param {number} playerZ     - Player world-Z position
   * @param {number} playerX     - Player lateral position (−2 to +2)
   * @param {number} playerSpeed - Current speed
   * @param {number} _cameraX    - (unused; curve is computed internally)
   */
  render(playerZ, playerX, playerSpeed, _cameraX) {
    const ctx      = this.ctx;
    const W        = CONSTANTS.CANVAS_WIDTH;
    const H        = CONSTANTS.CANVAS_HEIGHT;
    const cfg      = this.levelConfig;
    const segLen   = CONSTANTS.ROAD_SEGMENT_LENGTH;
    const total    = CONSTANTS.ROAD_SEGMENTS;
    const drawLen  = CONSTANTS.DRAW_LENGTH;
    const camD     = CONSTANTS.CAMERA_DEPTH;
    const roadHalfW = CONSTANTS.ROAD_WIDTH;       // normalized (0.75)
    const curveScale = this._CURVE_SCALE;
    const fogDensity = cfg.fogDensity || CONSTANTS.FOG_DENSITY;
    const fogCol   = cfg.fogColor || cfg.skyColor;
    const horizonY = Math.floor(H * CONSTANTS.HORIZON_RATIO);

    // Player's current segment
    const startSegIdx = Math.floor(playerZ / segLen) % total;
    this._playerSegmentIndex = startSegIdx;

    // ── Sky ─────────────────────────────────────────────────────
    this._drawSky(cfg, horizonY);

    // ── Projection pass: near (i=0) → far (i=drawLen-1) ─────────
    let xOffset   = 0;   // accumulated screen-space curve offset (px)
    let hillAccum = 0;   // accumulated screen-space hill offset (px)

    // Height scale: maps perspective scale back to screen pixels so that
    // depth=1 (nearest) → screenY = H (bottom) and depth→∞ → screenY = horizonY
    const HEIGHT_SCALE = (H - horizonY) / camD;

    for (let i = 0; i < drawLen; i++) {
      const segIdx = (startSegIdx + i) % total;
      const seg    = this.segments[segIdx];
      const depth  = i + 1;                       // perspective depth (1 = nearest)
      const scale  = camD / depth;
      const screenW = scale * roadHalfW * (W / 2); // road half-width in pixels

      // Road center: W/2, shifted by accumulated curve and player lateral pos
      const screenX = W / 2 + xOffset - playerX * screenW;
      const screenY = horizonY + scale * HEIGHT_SCALE - hillAccum;
      const fogT    = Math.pow(i / drawLen, fogDensity);

      const p  = this._proj[i];
      p.seg    = seg;
      p.x      = screenX;
      p.y      = Math.min(screenY, H + 10);
      p.w      = screenW;
      p.scale  = scale;
      p.fogT   = fogT;

      // Accumulate for next step
      xOffset   += seg.curve * curveScale;
      hillAccum += scale * seg.hill;
    }

    // ── Draw pass: back-to-front (painter's algorithm) ───────────
    let maxScreenY = H;   // hill-occlusion tracker

    for (let i = drawLen - 1; i >= 0; i--) {
      const p  = this._proj[i];
      const p2 = (i > 0) ? this._proj[i - 1] : p;

      const y1 = p.y;
      const y2 = p2.y;

      // Hill occlusion: skip if this segment is below already-drawn road
      if (y1 >= maxScreenY) continue;
      maxScreenY = y1;

      const seg      = p.seg;
      const isLight  = seg.isLight;
      const isFinish = seg.isFinish;
      const fogT     = p.fogT;

      // Fogged colors
      const grassCol  = this._fogC(isLight
                          ? (cfg.grassLight  || CONSTANTS.GRASS_COLOR_LIGHT)
                          : (cfg.grassDark   || CONSTANTS.GRASS_COLOR_DARK),  fogCol, fogT);
      const roadCol   = this._fogC(isLight
                          ? (cfg.roadLight   || CONSTANTS.ROAD_COLOR_LIGHT)
                          : (cfg.roadDark    || CONSTANTS.ROAD_COLOR_DARK),   fogCol, fogT);
      const rumbleCol = this._fogC(
        isFinish ? (isLight ? '#fff' : '#000')
                 : (isLight ? (cfg.rumbleLight || CONSTANTS.RUMBLE_COLOR_LIGHT)
                            : (cfg.rumbleDark  || CONSTANTS.RUMBLE_COLOR_DARK)),
        fogCol, fogT
      );

      const x1 = p.x,  w1 = p.w;
      const x2 = p2.x, w2 = p2.w;
      const segH = Math.max(1, y2 - y1);

      // Grass (full width strip)
      ctx.fillStyle = grassCol;
      ctx.fillRect(0, y1, W, segH);

      // Rumble strip
      const rM = 1.2;
      ctx.fillStyle = rumbleCol;
      ctx.beginPath();
      ctx.moveTo(x1 - w1 * rM, y1);
      ctx.lineTo(x1 + w1 * rM, y1);
      ctx.lineTo(x2 + w2 * rM, y2);
      ctx.lineTo(x2 - w2 * rM, y2);
      ctx.closePath();
      ctx.fill();

      // Road surface
      ctx.fillStyle = roadCol;
      ctx.beginPath();
      ctx.moveTo(x1 - w1, y1);
      ctx.lineTo(x1 + w1, y1);
      ctx.lineTo(x2 + w2, y2);
      ctx.lineTo(x2 - w2, y2);
      ctx.closePath();
      ctx.fill();

      // Centre lane dash
      if (isLight && !isFinish) {
        ctx.save();
        ctx.globalAlpha = Math.max(0, 0.65 - fogT);
        ctx.fillStyle = '#fff';
        ctx.beginPath();
        ctx.moveTo(x1 - 3, y1);
        ctx.lineTo(x1 + 3, y1);
        ctx.lineTo(x2 + 3, y2);
        ctx.lineTo(x2 - 3, y2);
        ctx.closePath();
        ctx.fill();
        ctx.restore();
      }

      // Finish line checker pattern
      if (isFinish) {
        const checks = 8;
        for (let c = 0; c < checks; c++) {
          const t0 = c / checks;
          const t1 = (c + 1) / checks;
          if (c % 2 === (isLight ? 0 : 1)) {
            ctx.fillStyle = '#fff';
            ctx.beginPath();
            ctx.moveTo(x1 - w1 + 2 * w1 * t0, y1);
            ctx.lineTo(x1 - w1 + 2 * w1 * t1, y1);
            ctx.lineTo(x2 - w2 + 2 * w2 * t1, y2);
            ctx.lineTo(x2 - w2 + 2 * w2 * t0, y2);
            ctx.closePath();
            ctx.fill();
          }
        }
      }

      // Roadside scenery
      if (seg.scenery)  this._drawScenery(seg.scenery,  x1, y1, p.scale, fogT);
      if (seg.scenery2) this._drawScenery(seg.scenery2, x1, y1, p.scale, fogT);
    }

    // ── Traffic cars ─────────────────────────────────────────────
    this._drawTraffic(startSegIdx, playerX);
  }

  /** @returns {number} */
  getPlayerSegmentIndex() { return this._playerSegmentIndex; }

  // ─────────────────────────────────────────────────────────────
  // Private
  // ─────────────────────────────────────────────────────────────

  _drawTraffic(startSegIdx, playerX) {
    const ctx     = this.ctx;
    const total   = CONSTANTS.ROAD_SEGMENTS;
    const drawLen = CONSTANTS.DRAW_LENGTH;
    const W       = CONSTANTS.CANVAS_WIDTH;

    for (const car of this.traffic) {
      const relIdx = (Math.floor(car.segmentIndex) - startSegIdx + total) % total;
      if (relIdx === 0 || relIdx >= drawLen - 1) continue;

      const p = this._proj[relIdx];
      if (!p || !p.seg) continue;

      const carW = p.scale * CONSTANTS.ROAD_WIDTH * (W / 2) * car.width * 2;
      const carH = carW * car.height;
      // car.x is a fraction of road half-width (-1..1 → ±p.w)
      const screenX = p.x + car.x * p.w;
      const screenY = p.y;

      ctx.save();
      ctx.globalAlpha = Math.max(0.12, 1 - p.fogT * 1.4);

      ctx.fillStyle = car.color;
      ctx.fillRect(screenX - carW / 2, screenY - carH, carW, carH);

      ctx.fillStyle = 'rgba(180,230,255,0.65)';
      ctx.fillRect(screenX - carW * 0.33, screenY - carH * 0.94, carW * 0.66, carH * 0.28);

      ctx.fillStyle = '#ff3333';
      ctx.fillRect(screenX - carW * 0.47, screenY - carH * 0.27, carW * 0.11, carH * 0.11);
      ctx.fillRect(screenX + carW * 0.36, screenY - carH * 0.27, carW * 0.11, carH * 0.11);

      ctx.restore();
    }
  }

  _drawScenery(scenery, roadCenterX, roadY, scale, fogT) {
    const ctx   = this.ctx;
    const W     = CONSTANTS.CANVAS_WIDTH;
    const alpha = Math.max(0, 1 - fogT * 1.05);
    if (alpha < 0.04) return;

    const roadW   = scale * CONSTANTS.ROAD_WIDTH * (W / 2);
    const x       = roadCenterX + scenery.side * roadW * 1.55;

    ctx.save();
    ctx.globalAlpha = alpha;

    if (scenery.type === 'tree') {
      const h = Math.max(4, scale * 880);
      const w = h * 0.55;
      ctx.fillStyle = '#5C3317';
      ctx.fillRect(x - w * 0.09, roadY - h * 0.38, w * 0.18, h * 0.38);
      ctx.fillStyle = '#1a7a1a';
      ctx.beginPath();
      ctx.moveTo(x,           roadY - h);
      ctx.lineTo(x - w * 0.5, roadY - h * 0.38);
      ctx.lineTo(x + w * 0.5, roadY - h * 0.38);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = '#22aa22';
      ctx.beginPath();
      ctx.moveTo(x,            roadY - h * 1.2);
      ctx.lineTo(x - w * 0.34, roadY - h * 0.68);
      ctx.lineTo(x + w * 0.34, roadY - h * 0.68);
      ctx.closePath();
      ctx.fill();
    } else {
      const h = Math.max(3, scale * 660);
      const w = h * 1.5;
      ctx.fillStyle = '#888';
      ctx.fillRect(x - h * 0.06, roadY - h, h * 0.12, h);
      ctx.fillStyle = '#003377';
      ctx.fillRect(x - w / 2, roadY - h * 1.06, w, h * 0.48);
      ctx.fillStyle = '#fff';
      ctx.font = `${Math.max(3, h * 0.22)}px monospace`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('GO!', x, roadY - h * 0.82);
    }

    ctx.restore();
  }

  _drawSky(cfg, horizonY) {
    const ctx  = this.ctx;
    const W    = CONSTANTS.CANVAS_WIDTH;
    const grad = ctx.createLinearGradient(0, 0, 0, horizonY);
    grad.addColorStop(0, cfg.skyColor);
    grad.addColorStop(1, cfg.skyColorBottom || cfg.skyColor);
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, W, horizonY);
  }

  _fogC(color, fogColor, t) {
    if (t <= 0) return color;
    if (t >= 1) return fogColor;
    const a = this._parseColor(color);
    const b = this._parseColor(fogColor);
    if (!a || !b) return color;
    return `rgb(${Math.round(a.r+(b.r-a.r)*t)},${Math.round(a.g+(b.g-a.g)*t)},${Math.round(a.b+(b.b-a.b)*t)})`;
  }

  _parseColor(hex) {
    if (!hex) return null;
    if (hex.startsWith('rgb')) {
      const m = hex.match(/\d+/g);
      return m && m.length >= 3 ? { r:+m[0], g:+m[1], b:+m[2] } : null;
    }
    const c = hex.replace('#', '');
    if (c.length === 3) return { r:parseInt(c[0]+c[0],16), g:parseInt(c[1]+c[1],16), b:parseInt(c[2]+c[2],16) };
    if (c.length === 6) return { r:parseInt(c.slice(0,2),16), g:parseInt(c.slice(2,4),16), b:parseInt(c.slice(4,6),16) };
    return null;
  }

  _makeSegment(index) {
    return { index, curve:0, hill:0, isLight:false, isFinish:false, scenery:null, scenery2:null, world:{x:0,y:0,z:0} };
  }
}
