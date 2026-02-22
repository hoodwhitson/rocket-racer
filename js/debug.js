/**
 * debug.js
 * DebugOverlay — draws a live diagnostic panel when toggled with the D key.
 *
 * Usage from Chrome DevTools console:
 *   RR.debugOverlay.toggle()           // show / hide
 *   RR.player.speed = 300              // set max speed
 *   RR.gs.level                        // check current level
 *   RR.road._proj[0]                   // inspect first segment projection
 *   RR.audio.playCelebrationFanfare()  // trigger win fanfare
 */
class DebugOverlay {
  constructor() {
    this._visible = false;
    this._canvas  = null;
    this._ctx     = null;
    this._fps     = 0;
    this._lastTs  = 0;
    this._frameCount = 0;
    this._fpsTimer   = 0;
  }

  /** Toggle visibility. */
  toggle() {
    this._visible = !this._visible;
  }

  /**
   * Draw the overlay onto the game canvas.
   * Call this every frame (it's a no-op when not visible).
   *
   * @param {Array}  proj   - road._proj array (projection cache)
   * @param {object} gs     - game state object
   * @param {Player} player - player instance
   */
  draw(proj, gs, player) {
    if (!this._visible) return;

    // Lazily grab the canvas reference once
    if (!this._canvas) {
      this._canvas = document.getElementById('gameCanvas');
      this._ctx    = this._canvas.getContext('2d');
    }

    // FPS estimation (updated once per second)
    const now = performance.now();
    this._frameCount++;
    this._fpsTimer += (now - this._lastTs) / 1000;
    this._lastTs = now;
    if (this._fpsTimer >= 1) {
      this._fps = Math.round(this._frameCount / this._fpsTimer);
      this._frameCount = 0;
      this._fpsTimer   = 0;
    }

    const ctx = this._ctx;
    const W   = CONSTANTS.CANVAS_WIDTH;

    // Panel dimensions
    const panelW = 220;
    const lineH  = 16;
    const pad    = 8;

    // Build lines
    const maxSpeed = CONSTANTS.PLAYER_MAX_SPEED * (player.carConfig ? player.carConfig.topSpeedMult : 1);
    const speedPct = maxSpeed > 0 ? Math.round((player.speed / maxSpeed) * 100) : 0;

    const p0y = proj[0] ? proj[0].y.toFixed(1) : '—';
    const p1y = proj[1] ? proj[1].y.toFixed(1) : '—';
    const p5y = proj[5] ? proj[5].y.toFixed(1) : '—';

    const lines = [
      '[DEBUG]  (D to hide)',
      `FPS:      ${this._fps}`,
      `State:    ${gs.state}`,
      `Player Z: ${Math.round(player.z)}`,
      `Player X: ${player.x.toFixed(2)}`,
      `Seg IDX:  ${Math.floor(player.z / CONSTANTS.ROAD_SEGMENT_LENGTH) % CONSTANTS.ROAD_SEGMENTS}`,
      `Speed:    ${Math.round(player.speed)} (${speedPct}%)`,
      `Lives:    ${gs.lives}`,
      `Level:    ${gs.level}`,
      `proj[0].y ${p0y}   ${Number(p0y) >= 595 ? '✓ fix OK' : (Number(p0y) <= 275 ? '✗ bug' : '')}`,
      `proj[1].y ${p1y}`,
      `proj[5].y ${p5y}`,
    ];

    const panelH = lines.length * lineH + pad * 2;
    const panelX = W - panelW - 10;
    const panelY = 10;

    // Background
    ctx.save();
    ctx.globalAlpha = 0.82;
    ctx.fillStyle = '#000';
    ctx.fillRect(panelX, panelY, panelW, panelH);
    ctx.globalAlpha = 1;

    // Text
    ctx.font      = '11px monospace';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'top';

    lines.forEach((line, i) => {
      const y = panelY + pad + i * lineH;
      if (i === 0) {
        ctx.fillStyle = '#ffff44';
      } else if (line.includes('✓')) {
        ctx.fillStyle = '#44ff88';
      } else if (line.includes('✗')) {
        ctx.fillStyle = '#ff4444';
      } else {
        ctx.fillStyle = '#cccccc';
      }
      ctx.fillText(line, panelX + pad, y);
    });

    ctx.restore();
  }
}
