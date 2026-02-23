/**
 * road.js
 * Road — pseudo-3D segment-based road renderer with performance caching,
 * parallax backgrounds, varied scenery, and checkpoint markers.
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

    // Curve scale factor
    this._CURVE_SCALE = 22;

    // ── Performance caches (populated in buildTrack) ──
    this._colorCache   = {};          // hex → {r,g,b}
    this._fogLUT       = null;        // Float32Array[DRAW_LENGTH]
    this._foggedColors = null;        // pre-blended CSS strings per distance
    this._skyGradient  = null;        // cached CanvasGradient
    this._bgLayers     = [];          // offscreen canvases for parallax layers

    // ── Traffic car shape definitions ──
    this._trafficShapes = [
      { name: 'sedan',   widthMult: 1.0, heightMult: 0.65, roofH: 0.35, roofW: 0.55 },
      { name: 'truck',   widthMult: 1.2, heightMult: 0.80, roofH: 0.50, roofW: 0.70 },
      { name: 'sports',  widthMult: 0.95, heightMult: 0.55, roofH: 0.28, roofW: 0.50 },
      { name: 'van',     widthMult: 1.1, heightMult: 0.85, roofH: 0.55, roofW: 0.65 },
      { name: 'compact', widthMult: 0.85, heightMult: 0.55, roofH: 0.30, roofW: 0.45 },
    ];
  }

  // ─────────────────────────────────────────────────────────────
  // Public API
  // ─────────────────────────────────────────────────────────────

  /**
   * Build track segments from level config and pre-compute all caches.
   * @param {object} levelConfig
   */
  buildTrack(levelConfig) {
    this.levelConfig = levelConfig;
    const segs  = this.segments;
    const total = CONSTANTS.ROAD_SEGMENTS;
    const spec  = levelConfig.roadSpec;
    const stripeGroup = CONSTANTS.STRIPE_GROUP;

    // Expand road spec into flat list
    const flat = [];
    for (const s of spec) {
      for (let k = 0; k < s.length; k++) flat.push({ curve: s.curve, hill: s.hill });
    }

    // Build checkpoint segment set for quick lookup
    const cpSet = new Set();
    if (levelConfig.checkpoints) {
      for (const cp of levelConfig.checkpoints) cpSet.add(cp.segment);
    }

    // Determine scenery set
    const scenerySet = levelConfig.scenerySet || ['tree', 'sign'];

    for (let i = 0; i < total; i++) {
      const src = flat[i % flat.length];
      const seg = segs[i];
      seg.index    = i;
      seg.curve    = src.curve * 0.018;
      seg.hill     = src.hill  * 0.55;
      seg.isLight  = Math.floor(i / stripeGroup) % 2 === 0;
      seg.isFinish = i >= CONSTANTS.FINISH_SEGMENT_INDEX;
      seg.isCheckpoint = cpSet.has(i);

      // Scenery on both sides every ~6 segments
      seg.scenery  = null;
      seg.scenery2 = null;
      if (!seg.isFinish && !seg.isCheckpoint) {
        if (i % 6 === 0) {
          seg.scenery = { type: scenerySet[i % scenerySet.length], side: 1 };
        }
        if (i % 6 === 3) {
          seg.scenery2 = { type: scenerySet[(i + 2) % scenerySet.length], side: -1 };
        }
      }
    }

    // ── Build performance caches ──
    this._buildColorCache(levelConfig);
    this._buildFogLUT(levelConfig);
    this._buildFoggedColors(levelConfig);
    this._buildSkyGradient(levelConfig);
    this._buildBackgroundLayers(levelConfig);
  }

  /**
   * Spawn traffic cars for the given level.
   * @param {object} levelConfig
   */
  spawnTraffic(levelConfig) {
    this.traffic = [];
    const colors = CONSTANTS.TRAFFIC_COLORS;
    const shapes = this._trafficShapes;
    for (let i = 0; i < levelConfig.trafficDensity; i++) {
      this.traffic.push({
        segmentIndex: Math.floor(20 + Math.random() * (CONSTANTS.ROAD_SEGMENTS - 40)),
        x:     (Math.random() * 1.2 - 0.6),
        speed: (CONSTANTS.TRAFFIC_SPEED_MIN
                + Math.random() * (CONSTANTS.TRAFFIC_SPEED_MAX - CONSTANTS.TRAFFIC_SPEED_MIN))
               * levelConfig.trafficSpeedMult,
        color:  colors[i % colors.length],
        width:  0.30 + Math.random() * 0.08,
        height: 0.60 + Math.random() * 0.15,
        shape:  shapes[i % shapes.length],
      });
    }
  }

  /** @param {number} dt */
  updateTraffic(dt) {
    const total  = CONSTANTS.ROAD_SEGMENTS;
    const segLen = CONSTANTS.ROAD_SEGMENT_LENGTH;
    for (const car of this.traffic) {
      car.segmentIndex = (car.segmentIndex + car.speed * dt / segLen) % total;
      if (car.segmentIndex < 0) car.segmentIndex += total;
    }
  }

  /**
   * Render the full road scene.
   * @param {number} playerZ
   * @param {number} playerX
   * @param {number} playerSpeed
   * @param {number} _cameraX
   * @param {number} shakeX - screen shake X offset
   * @param {number} shakeY - screen shake Y offset
   */
  render(playerZ, playerX, playerSpeed, _cameraX, shakeX, shakeY) {
    const ctx      = this.ctx;
    const W        = CONSTANTS.CANVAS_WIDTH;
    const H        = CONSTANTS.CANVAS_HEIGHT;
    const cfg      = this.levelConfig;
    const segLen   = CONSTANTS.ROAD_SEGMENT_LENGTH;
    const total    = CONSTANTS.ROAD_SEGMENTS;
    const drawLen  = CONSTANTS.DRAW_LENGTH;
    const camD     = CONSTANTS.CAMERA_DEPTH;
    const roadHalfW = CONSTANTS.ROAD_WIDTH;
    const curveScale = this._CURVE_SCALE;
    const horizonY = Math.floor(H * CONSTANTS.HORIZON_RATIO);

    const sx = shakeX || 0;
    const sy = shakeY || 0;

    // Player's current segment + sub-segment fraction for smooth scrolling
    const startSegIdx = Math.floor(playerZ / segLen) % total;
    const zFraction = (playerZ / segLen) - Math.floor(playerZ / segLen);
    this._playerSegmentIndex = startSegIdx;

    // ── Sky ─────────────────────────────────────────────────────
    ctx.fillStyle = this._skyGradient;
    ctx.fillRect(0, 0, W, horizonY);

    // ── Parallax background ────────────────────────────────────
    this._drawBackground(playerZ, horizonY);

    // ── Projection pass ─────────────────────────────────────────
    let xOffset   = 0;
    let hillAccum = 0;
    const HEIGHT_SCALE = (H - horizonY) / camD;

    for (let i = 0; i < drawLen; i++) {
      const segIdx = (startSegIdx + i) % total;
      const seg    = this.segments[segIdx];
      const depth  = i + (1 - zFraction);
      if (depth <= 0.01) continue;  // skip degenerate near-zero depth
      const scale  = camD / depth;
      const screenW = scale * roadHalfW * (W / 2);
      const screenX = W / 2 + xOffset - playerX * screenW + sx;
      const screenY = horizonY + scale * HEIGHT_SCALE - hillAccum + sy;

      const p  = this._proj[i];
      p.seg    = seg;
      p.x      = screenX;
      p.y      = Math.min(screenY, H + 10);
      p.w      = screenW;
      p.scale  = scale;
      p.fogT   = this._fogLUT[i];

      xOffset   += seg.curve * curveScale;
      hillAccum += scale * seg.hill;
    }

    // ── Draw pass: back-to-front ────────────────────────────────
    const foggedColors = this._foggedColors;

    for (let i = drawLen - 1; i >= 0; i--) {
      const p  = this._proj[i];
      const p2 = (i > 0) ? this._proj[i - 1] : p;

      const y1 = p.y;
      const y2 = p2.y;
      const seg      = p.seg;
      const isLight  = seg.isLight;
      const isFinish = seg.isFinish;

      const x1 = p.x,  w1 = p.w;
      const x2 = p2.x, w2 = p2.w;
      const segH = Math.max(1, y2 - y1);

      // Grass
      ctx.fillStyle = isLight ? foggedColors.grassLight[i] : foggedColors.grassDark[i];
      ctx.fillRect(0, y1, W, segH);

      // Rumble strip
      const rM = 1.2;
      if (isFinish) {
        ctx.fillStyle = isLight ? foggedColors.finishLight[i] : foggedColors.finishDark[i];
      } else {
        ctx.fillStyle = isLight ? foggedColors.rumbleLight[i] : foggedColors.rumbleDark[i];
      }
      ctx.beginPath();
      ctx.moveTo(x1 - w1 * rM, y1);
      ctx.lineTo(x1 + w1 * rM, y1);
      ctx.lineTo(x2 + w2 * rM, y2);
      ctx.lineTo(x2 - w2 * rM, y2);
      ctx.closePath();
      ctx.fill();

      // Road surface
      ctx.fillStyle = isLight ? foggedColors.roadLight[i] : foggedColors.roadDark[i];
      ctx.beginPath();
      ctx.moveTo(x1 - w1, y1);
      ctx.lineTo(x1 + w1, y1);
      ctx.lineTo(x2 + w2, y2);
      ctx.lineTo(x2 - w2, y2);
      ctx.closePath();
      ctx.fill();

      // Road edge lines (white shoulder markings)
      const edgeAlpha = Math.max(0, 0.8 - p.fogT);
      if (edgeAlpha > 0.04 && !isFinish) {
        const edgeW = Math.max(1, w1 * 0.03);
        const edgeW2 = Math.max(1, w2 * 0.03);
        ctx.fillStyle = foggedColors.edgeLine[i];
        // Left edge
        ctx.beginPath();
        ctx.moveTo(x1 - w1 - edgeW, y1);
        ctx.lineTo(x1 - w1 + edgeW, y1);
        ctx.lineTo(x2 - w2 + edgeW2, y2);
        ctx.lineTo(x2 - w2 - edgeW2, y2);
        ctx.closePath();
        ctx.fill();
        // Right edge
        ctx.beginPath();
        ctx.moveTo(x1 + w1 - edgeW, y1);
        ctx.lineTo(x1 + w1 + edgeW, y1);
        ctx.lineTo(x2 + w2 + edgeW2, y2);
        ctx.lineTo(x2 + w2 - edgeW2, y2);
        ctx.closePath();
        ctx.fill();
      }

      // Centre lane dash (no save/restore — manual globalAlpha)
      if (isLight && !isFinish) {
        const prevAlpha = ctx.globalAlpha;
        ctx.globalAlpha = Math.max(0, 0.65 - p.fogT);
        ctx.fillStyle = '#fff';
        ctx.beginPath();
        ctx.moveTo(x1 - 3, y1);
        ctx.lineTo(x1 + 3, y1);
        ctx.lineTo(x2 + 3, y2);
        ctx.lineTo(x2 - 3, y2);
        ctx.closePath();
        ctx.fill();
        ctx.globalAlpha = prevAlpha;
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

      // Checkpoint marker
      if (seg.isCheckpoint) {
        this._drawCheckpointMarker(x1, y1, w1, p.scale, p.fogT);
      }

      // Roadside scenery
      if (seg.scenery)  this._drawScenery(seg.scenery,  x1, y1, p.scale, p.fogT, w1);
      if (seg.scenery2) this._drawScenery(seg.scenery2, x1, y1, p.scale, p.fogT, w1);
    }

    // ── Traffic cars ─────────────────────────────────────────────
    this._drawTraffic(startSegIdx, playerX);
  }

  /** @returns {number} */
  getPlayerSegmentIndex() { return this._playerSegmentIndex; }

  // ─────────────────────────────────────────────────────────────
  // Cache builders
  // ─────────────────────────────────────────────────────────────

  _buildColorCache(cfg) {
    this._colorCache = {};
    const hexes = [
      cfg.grassLight  || CONSTANTS.GRASS_COLOR_LIGHT,
      cfg.grassDark   || CONSTANTS.GRASS_COLOR_DARK,
      cfg.roadLight   || CONSTANTS.ROAD_COLOR_LIGHT,
      cfg.roadDark    || CONSTANTS.ROAD_COLOR_DARK,
      cfg.rumbleLight || CONSTANTS.RUMBLE_COLOR_LIGHT,
      cfg.rumbleDark  || CONSTANTS.RUMBLE_COLOR_DARK,
      cfg.fogColor    || cfg.skyColor,
      '#fff', '#000', '#FFFFFF',
    ];
    for (const hex of hexes) {
      if (!this._colorCache[hex]) {
        this._colorCache[hex] = this._parseColor(hex);
      }
    }
  }

  _buildFogLUT(cfg) {
    const drawLen = CONSTANTS.DRAW_LENGTH;
    const fogDensity = cfg.fogDensity || CONSTANTS.FOG_DENSITY;
    this._fogLUT = new Float32Array(drawLen);
    for (let i = 0; i < drawLen; i++) {
      this._fogLUT[i] = Math.pow(i / drawLen, fogDensity);
    }
  }

  _buildFoggedColors(cfg) {
    const drawLen = CONSTANTS.DRAW_LENGTH;
    const fogCol = this._parseColor(cfg.fogColor || cfg.skyColor);

    const colorKeys = {
      grassLight:  cfg.grassLight  || CONSTANTS.GRASS_COLOR_LIGHT,
      grassDark:   cfg.grassDark   || CONSTANTS.GRASS_COLOR_DARK,
      roadLight:   cfg.roadLight   || CONSTANTS.ROAD_COLOR_LIGHT,
      roadDark:    cfg.roadDark    || CONSTANTS.ROAD_COLOR_DARK,
      rumbleLight: cfg.rumbleLight || CONSTANTS.RUMBLE_COLOR_LIGHT,
      rumbleDark:  cfg.rumbleDark  || CONSTANTS.RUMBLE_COLOR_DARK,
      finishLight: '#fff',
      finishDark:  '#000',
      edgeLine:    '#FFFFFF',
    };

    this._foggedColors = {};
    for (const [key, hex] of Object.entries(colorKeys)) {
      const base = this._parseColor(hex);
      const arr = new Array(drawLen);
      for (let i = 0; i < drawLen; i++) {
        const t = this._fogLUT[i];
        if (t <= 0) {
          arr[i] = hex;
        } else if (t >= 1) {
          arr[i] = cfg.fogColor || cfg.skyColor;
        } else {
          const r = Math.round(base.r + (fogCol.r - base.r) * t);
          const g = Math.round(base.g + (fogCol.g - base.g) * t);
          const b = Math.round(base.b + (fogCol.b - base.b) * t);
          arr[i] = `rgb(${r},${g},${b})`;
        }
      }
      this._foggedColors[key] = arr;
    }
  }

  _buildSkyGradient(cfg) {
    const ctx = this.ctx;
    const horizonY = Math.floor(CONSTANTS.CANVAS_HEIGHT * CONSTANTS.HORIZON_RATIO);
    const grad = ctx.createLinearGradient(0, 0, 0, horizonY);
    grad.addColorStop(0, cfg.skyColor);
    grad.addColorStop(1, cfg.skyColorBottom || cfg.skyColor);
    this._skyGradient = grad;
  }

  _buildBackgroundLayers(cfg) {
    this._bgLayers = [];
    if (!cfg.background || !cfg.background.layers) return;

    const W = CONSTANTS.CANVAS_WIDTH;
    const horizonY = Math.floor(CONSTANTS.CANVAS_HEIGHT * CONSTANTS.HORIZON_RATIO);
    const tileW = W * 2;  // wide enough to tile seamlessly

    for (const layer of cfg.background.layers) {
      const oc = document.createElement('canvas');
      oc.width  = tileW;
      oc.height = horizonY;
      const octx = oc.getContext('2d');

      const baseY = horizonY * layer.y;

      if (layer.type === 'mountains') {
        this._prerenderMountains(octx, tileW, horizonY, baseY, layer);
      } else if (layer.type === 'buildings') {
        this._prerenderBuildings(octx, tileW, horizonY, baseY, layer);
      } else if (layer.type === 'treeline') {
        this._prerenderTreeline(octx, tileW, horizonY, baseY, layer);
      } else if (layer.type === 'clouds') {
        this._prerenderClouds(octx, tileW, horizonY, baseY, layer);
      }

      this._bgLayers.push({
        canvas: oc,
        speed: layer.speed,
        width: tileW,
      });
    }
  }

  // ─────────────────────────────────────────────────────────────
  // Parallax pre-renderers
  // ─────────────────────────────────────────────────────────────

  _prerenderMountains(ctx, w, h, baseY, layer) {
    const peaks = layer.peaks || 6;
    const peakH = h * (layer.height || 0.25);
    ctx.fillStyle = layer.color;
    ctx.beginPath();
    ctx.moveTo(0, h);
    for (let i = 0; i <= peaks * 2; i++) {
      const x = (i / (peaks * 2)) * w;
      const isPeak = i % 2 === 1;
      const variance = 0.3 + 0.7 * Math.abs(Math.sin(i * 2.3 + 0.5));
      const y = isPeak ? baseY - peakH * variance : baseY;
      ctx.lineTo(x, y);
    }
    ctx.lineTo(w, h);
    ctx.closePath();
    ctx.fill();
  }

  _prerenderBuildings(ctx, w, h, baseY, layer) {
    const count = layer.count || 12;
    const maxH = h * (layer.height || 0.3);
    ctx.fillStyle = layer.color;

    for (let i = 0; i < count; i++) {
      const bx = (i / count) * w;
      const bw = (w / count) * 0.85;
      const bh = maxH * (0.3 + 0.7 * Math.abs(Math.sin(i * 3.7 + 1.2)));
      const by = baseY + (h - baseY) - bh;
      ctx.fillRect(bx, by, bw, bh + (h - baseY));

      // Lit windows
      const winColor = 'rgba(255,220,100,0.6)';
      ctx.fillStyle = winColor;
      const winW = bw * 0.12;
      const winH = bh * 0.06;
      for (let wy = by + bh * 0.1; wy < by + bh - winH; wy += bh * 0.12) {
        for (let wx = bx + bw * 0.15; wx < bx + bw * 0.8; wx += bw * 0.22) {
          if (Math.sin(wx * 7.3 + wy * 3.1) > 0.1) {
            ctx.fillRect(wx, wy, winW, winH);
          }
        }
      }
      ctx.fillStyle = layer.color;
    }
  }

  _prerenderTreeline(ctx, w, h, baseY, layer) {
    const treeH = h * (layer.height || 0.08);
    ctx.fillStyle = layer.color;
    ctx.beginPath();
    ctx.moveTo(0, h);
    const step = 8;
    for (let x = 0; x <= w; x += step) {
      const variance = Math.sin(x * 0.05) * 0.3 + Math.sin(x * 0.12) * 0.2;
      const y = baseY + (h - baseY) - treeH * (0.6 + 0.4 * variance);
      // Triangle peaks for tree shapes
      if (x % 24 < 12) {
        ctx.lineTo(x, y - treeH * 0.3);
      } else {
        ctx.lineTo(x, y);
      }
    }
    ctx.lineTo(w, h);
    ctx.closePath();
    ctx.fill();
  }

  _prerenderClouds(ctx, w, h, baseY, layer) {
    const count = layer.count || 5;
    ctx.fillStyle = layer.color;
    ctx.globalAlpha = 0.5;
    for (let i = 0; i < count; i++) {
      const cx = (i / count) * w + w * 0.05;
      const cy = baseY + Math.sin(i * 2.1) * h * 0.06;
      const cw = w * 0.08 + Math.sin(i * 3.7) * w * 0.03;
      const ch = h * 0.04 + Math.sin(i * 1.3) * h * 0.015;
      // Puffy cloud shape: overlapping ellipses
      ctx.beginPath();
      ctx.ellipse(cx, cy, cw, ch, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.beginPath();
      ctx.ellipse(cx - cw * 0.5, cy + ch * 0.2, cw * 0.6, ch * 0.8, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.beginPath();
      ctx.ellipse(cx + cw * 0.5, cy + ch * 0.15, cw * 0.5, ch * 0.7, 0, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;
  }

  // ─────────────────────────────────────────────────────────────
  // Private rendering
  // ─────────────────────────────────────────────────────────────

  _drawBackground(playerZ, horizonY) {
    const ctx = this.ctx;
    const W = CONSTANTS.CANVAS_WIDTH;
    const segLen = CONSTANTS.ROAD_SEGMENT_LENGTH;

    for (const layer of this._bgLayers) {
      const offset = (playerZ / segLen) * layer.speed * 2;
      const tileW = layer.width;
      // Source X within the tile (wrap positive)
      let srcX = offset % tileW;
      if (srcX < 0) srcX += tileW;
      // Draw the visible portion from the tile
      const srcW = Math.min(W, tileW - srcX);
      ctx.drawImage(layer.canvas, srcX, 0, srcW, horizonY, 0, 0, srcW, horizonY);
      // If we hit the edge, draw the wrap-around portion
      if (srcW < W) {
        ctx.drawImage(layer.canvas, 0, 0, W - srcW, horizonY, srcW, 0, W - srcW, horizonY);
      }
    }
  }

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
      const screenX = p.x + car.x * p.w;
      const screenY = p.y;
      const shape = car.shape;
      const alpha = Math.max(0.12, 1 - p.fogT * 1.4);

      const prevAlpha = ctx.globalAlpha;
      ctx.globalAlpha = alpha;

      // Body
      ctx.fillStyle = car.color;
      const bodyW = carW * shape.widthMult;
      const bodyH = carH * shape.heightMult;
      ctx.fillRect(screenX - bodyW / 2, screenY - bodyH, bodyW, bodyH);

      // Roof/cabin
      const roofW = bodyW * shape.roofW;
      const roofH = bodyH * shape.roofH;
      ctx.fillStyle = this._darkenColor(car.color, 0.7);
      ctx.fillRect(screenX - roofW / 2, screenY - bodyH - roofH * 0.3, roofW, roofH);

      // Windshield
      ctx.fillStyle = 'rgba(180,230,255,0.6)';
      ctx.fillRect(screenX - roofW * 0.4, screenY - bodyH - roofH * 0.25, roofW * 0.8, roofH * 0.6);

      // Tail lights
      ctx.fillStyle = '#ff3333';
      const tlW = bodyW * 0.08;
      const tlH = bodyH * 0.10;
      ctx.fillRect(screenX - bodyW * 0.45, screenY - bodyH * 0.25, tlW, tlH);
      ctx.fillRect(screenX + bodyW * 0.37, screenY - bodyH * 0.25, tlW, tlH);

      ctx.globalAlpha = prevAlpha;
    }
  }

  _drawCheckpointMarker(x, y, w, scale, fogT) {
    const ctx = this.ctx;
    const alpha = Math.max(0, 1 - fogT * 1.1);
    if (alpha < 0.04) return;

    const prevAlpha = ctx.globalAlpha;
    ctx.globalAlpha = alpha;

    // Yellow posts on both sides
    const postH = Math.min(200, Math.max(4, scale * 700));
    const postW = Math.max(2, scale * 40);

    ctx.fillStyle = '#FFD700';
    // Left post
    ctx.fillRect(x - w * 1.15 - postW / 2, y - postH, postW, postH);
    // Right post
    ctx.fillRect(x + w * 1.15 - postW / 2, y - postH, postW, postH);

    // Banner across the top
    if (postH > 10) {
      ctx.fillStyle = 'rgba(255,215,0,0.7)';
      ctx.fillRect(x - w * 1.15, y - postH, w * 2.3, Math.max(2, postH * 0.15));
    }

    ctx.globalAlpha = prevAlpha;
  }

  _drawScenery(scenery, roadCenterX, roadY, scale, fogT, roadW) {
    const ctx   = this.ctx;
    const alpha = Math.max(0, 1 - fogT * 1.05);
    if (alpha < 0.04) return;
    if (scale > 0.15) return;

    const rw = roadW || (scale * CONSTANTS.ROAD_WIDTH * (CONSTANTS.CANVAS_WIDTH / 2));
    const x  = roadCenterX + scenery.side * rw * 1.55;

    const prevAlpha = ctx.globalAlpha;
    ctx.globalAlpha = alpha;

    switch (scenery.type) {
      case 'palmTree':   this._drawPalmTree(ctx, x, roadY, scale); break;
      case 'pineTree':   this._drawPineTree(ctx, x, roadY, scale); break;
      case 'cactus':     this._drawCactus(ctx, x, roadY, scale); break;
      case 'lampPost':   this._drawLampPost(ctx, x, roadY, scale); break;
      case 'billboard':  this._drawBillboard(ctx, x, roadY, scale); break;
      case 'rock':       this._drawRock(ctx, x, roadY, scale); break;
      case 'building':   this._drawBuildingScenery(ctx, x, roadY, scale); break;
      case 'tree':       this._drawPineTree(ctx, x, roadY, scale); break;
      case 'sign':       this._drawBillboard(ctx, x, roadY, scale); break;
      default:           this._drawPineTree(ctx, x, roadY, scale); break;
    }

    ctx.globalAlpha = prevAlpha;
  }

  // ── Scenery type renderers ──

  _drawPalmTree(ctx, x, y, scale) {
    const h = Math.min(280, Math.max(4, scale * 850));
    const w = h * 0.55;
    // Curved trunk
    ctx.strokeStyle = '#8B6914';
    ctx.lineWidth = Math.max(2, w * 0.08);
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.quadraticCurveTo(x + w * 0.15, y - h * 0.5, x + w * 0.05, y - h * 0.75);
    ctx.stroke();
    // Fan leaves
    ctx.fillStyle = '#228B22';
    for (let a = 0; a < 5; a++) {
      const angle = -Math.PI * 0.3 + a * Math.PI * 0.15;
      const lx = x + w * 0.05 + Math.cos(angle) * w * 0.4;
      const ly = y - h * 0.75 + Math.sin(angle) * h * 0.15;
      ctx.beginPath();
      ctx.ellipse(lx, ly, w * 0.22, h * 0.06, angle, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  _drawPineTree(ctx, x, y, scale) {
    const h = Math.min(280, Math.max(4, scale * 850));
    const w = h * 0.45;
    // Trunk
    ctx.fillStyle = '#5C3317';
    ctx.fillRect(x - w * 0.06, y - h * 0.35, w * 0.12, h * 0.35);
    // Lower foliage
    ctx.fillStyle = '#1a6a1a';
    ctx.beginPath();
    ctx.moveTo(x, y - h * 0.85);
    ctx.lineTo(x - w * 0.45, y - h * 0.35);
    ctx.lineTo(x + w * 0.45, y - h * 0.35);
    ctx.closePath();
    ctx.fill();
    // Upper foliage
    ctx.fillStyle = '#22aa22';
    ctx.beginPath();
    ctx.moveTo(x, y - h * 1.1);
    ctx.lineTo(x - w * 0.3, y - h * 0.65);
    ctx.lineTo(x + w * 0.3, y - h * 0.65);
    ctx.closePath();
    ctx.fill();
  }

  _drawCactus(ctx, x, y, scale) {
    const h = Math.min(200, Math.max(3, scale * 600));
    const w = h * 0.2;
    // Main stem
    ctx.fillStyle = '#2D8B2D';
    ctx.fillRect(x - w * 0.3, y - h, w * 0.6, h);
    // Arms
    ctx.fillRect(x - w * 1.0, y - h * 0.7, w * 0.7, w * 0.4);
    ctx.fillRect(x - w * 1.0, y - h * 0.7, w * 0.4, h * 0.3);
    ctx.fillRect(x + w * 0.3, y - h * 0.5, w * 0.6, w * 0.4);
    ctx.fillRect(x + w * 0.5, y - h * 0.5, w * 0.4, h * 0.25);
  }

  _drawLampPost(ctx, x, y, scale) {
    const h = Math.min(250, Math.max(3, scale * 750));
    const w = h * 0.06;
    // Pole
    ctx.fillStyle = '#666';
    ctx.fillRect(x - w / 2, y - h, w, h);
    // Lamp head
    ctx.fillStyle = '#888';
    ctx.fillRect(x - w * 2, y - h - w, w * 4, w);
    // Glow
    ctx.fillStyle = 'rgba(255,220,100,0.3)';
    ctx.beginPath();
    ctx.arc(x, y - h, h * 0.12, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = 'rgba(255,220,100,0.15)';
    ctx.beginPath();
    ctx.arc(x, y - h * 0.5, h * 0.2, 0, Math.PI * 2);
    ctx.fill();
  }

  _drawBillboard(ctx, x, y, scale) {
    const h = Math.min(180, Math.max(3, scale * 600));
    const w = h * 1.5;
    // Posts
    ctx.fillStyle = '#888';
    ctx.fillRect(x - w * 0.3, y - h, h * 0.06, h);
    ctx.fillRect(x + w * 0.24, y - h, h * 0.06, h);
    // Board
    ctx.fillStyle = '#003377';
    ctx.fillRect(x - w / 2, y - h * 1.06, w, h * 0.48);
    // Text
    ctx.save();
    ctx.fillStyle = '#fff';
    const fontSize = Math.max(3, h * 0.18);
    ctx.font = `${fontSize}px monospace`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('GO!', x, y - h * 0.84);
    ctx.restore();
  }

  _drawRock(ctx, x, y, scale) {
    const h = Math.min(100, Math.max(2, scale * 350));
    const w = h * 1.2;
    ctx.fillStyle = '#706050';
    ctx.beginPath();
    ctx.moveTo(x - w * 0.4, y);
    ctx.lineTo(x - w * 0.3, y - h * 0.7);
    ctx.lineTo(x + w * 0.1, y - h);
    ctx.lineTo(x + w * 0.4, y - h * 0.5);
    ctx.lineTo(x + w * 0.35, y);
    ctx.closePath();
    ctx.fill();
    // Highlight
    ctx.fillStyle = '#908070';
    ctx.beginPath();
    ctx.moveTo(x - w * 0.1, y - h * 0.3);
    ctx.lineTo(x + w * 0.05, y - h * 0.85);
    ctx.lineTo(x + w * 0.3, y - h * 0.4);
    ctx.closePath();
    ctx.fill();
  }

  _drawBuildingScenery(ctx, x, y, scale) {
    const h = Math.min(220, Math.max(3, scale * 700));
    const w = h * 0.5;
    ctx.fillStyle = '#303040';
    ctx.fillRect(x - w / 2, y - h, w, h);
    // Windows
    ctx.fillStyle = 'rgba(255,220,100,0.5)';
    const winW = w * 0.15;
    const winH = h * 0.06;
    for (let wy = y - h * 0.9; wy < y - h * 0.1; wy += h * 0.1) {
      for (let wx = x - w * 0.35; wx < x + w * 0.3; wx += w * 0.25) {
        if (Math.sin(wx * 5 + wy * 3) > 0) {
          ctx.fillRect(wx, wy, winW, winH);
        }
      }
    }
  }

  // ── Helpers ──

  _darkenColor(hex, factor) {
    const c = this._parseColor(hex);
    if (!c) return hex;
    return `rgb(${Math.round(c.r * factor)},${Math.round(c.g * factor)},${Math.round(c.b * factor)})`;
  }

  _parseColor(hex) {
    if (!hex) return { r: 0, g: 0, b: 0 };
    if (hex.startsWith('rgb')) {
      const m = hex.match(/\d+/g);
      return m && m.length >= 3 ? { r: +m[0], g: +m[1], b: +m[2] } : { r: 0, g: 0, b: 0 };
    }
    const c = hex.replace('#', '');
    if (c.length === 3) return { r: parseInt(c[0]+c[0],16), g: parseInt(c[1]+c[1],16), b: parseInt(c[2]+c[2],16) };
    if (c.length === 6) return { r: parseInt(c.slice(0,2),16), g: parseInt(c.slice(2,4),16), b: parseInt(c.slice(4,6),16) };
    return { r: 0, g: 0, b: 0 };
  }

  _makeSegment(index) {
    return { index, curve: 0, hill: 0, isLight: false, isFinish: false, isCheckpoint: false, scenery: null, scenery2: null };
  }
}
