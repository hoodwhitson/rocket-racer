/**
 * ui.js
 * UI — all HUD elements, menus, and overlays drawn to canvas.
 */
class UI {
  /**
   * @param {HTMLCanvasElement} canvas
   */
  constructor(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this._frameCount = 0;
  }

  /**
   * Increment frame counter (call each game loop tick).
   */
  tick() {
    this._frameCount++;
  }

  // ─────────────────────────────────────────────
  // MAIN MENU
  // ─────────────────────────────────────────────

  /**
   * Draw main menu screen.
   */
  drawMainMenu() {
    const ctx = this.ctx;
    const W = CONSTANTS.CANVAS_WIDTH;
    const H = CONSTANTS.CANVAS_HEIGHT;
    const fc = this._frameCount;

    // Background
    ctx.fillStyle = '#000';
    ctx.fillRect(0, 0, W, H);

    // Animated road stripes background
    ctx.fillStyle = '#1a1a1a';
    ctx.fillRect(0, 0, W, H);
    for (let i = 0; i < 12; i++) {
      const y = ((i * 60 + fc * 2) % (H + 60)) - 60;
      ctx.fillStyle = i % 2 === 0 ? '#222' : '#181818';
      ctx.fillRect(0, y, W, 30);
    }

    // Title glow effect
    const glowIntensity = 0.6 + 0.4 * Math.sin(fc * 0.05);
    ctx.save();
    ctx.shadowColor = '#ff4400';
    ctx.shadowBlur = 20 * glowIntensity;

    // ROCKET
    this._drawText('ROCKET', W / 2, 160, 36, '#ff4400', 'center');

    ctx.shadowColor = '#ffaa00';
    ctx.shadowBlur = 20 * glowIntensity;

    // RACER
    this._drawText('RACER', W / 2, 220, 36, '#ffaa00', 'center');
    ctx.restore();

    // Subtitle
    this._drawText('A RETRO RACING GAME', W / 2, 275, 9, '#888', 'center');

    // Blinking PRESS ENTER
    if (Math.floor(fc / 30) % 2 === 0) {
      this._drawText('PRESS ENTER TO START', W / 2, 360, 10, '#fff', 'center');
    }

    // Controls reference
    this._drawText('ARROWS: STEER / ACCEL / BRAKE', W / 2, 430, 7, '#555', 'center');
    this._drawText('P: PAUSE', W / 2, 455, 7, '#555', 'center');

    // Version / credits
    this._drawText('(C) 2026 ROCKET RACER', W / 2, 560, 6, '#333', 'center');
  }

  // ─────────────────────────────────────────────
  // CAR SELECT
  // ─────────────────────────────────────────────

  /**
   * Draw car selection screen.
   * @param {number} selectedCar - Index 0–3
   */
  drawCarSelect(selectedCar) {
    const ctx = this.ctx;
    const W = CONSTANTS.CANVAS_WIDTH;
    const H = CONSTANTS.CANVAS_HEIGHT;
    const fc = this._frameCount;
    const cars = CONSTANTS.CAR_CONFIGS;

    // Background
    ctx.fillStyle = '#0a0a1a';
    ctx.fillRect(0, 0, W, H);

    this._drawText('SELECT YOUR CAR', W / 2, 50, 14, '#fff', 'center');
    this._drawText('LEFT / RIGHT ARROWS  |  ENTER TO CONFIRM', W / 2, 80, 6, '#666', 'center');

    // Draw 4 car cards
    const cardW = 160;
    const cardH = 200;
    const startX = W / 2 - (cars.length * cardW + (cars.length - 1) * 10) / 2;

    for (let i = 0; i < cars.length; i++) {
      const car = cars[i];
      const cx = startX + i * (cardW + 10) + cardW / 2;
      const cy = 200;
      const isSelected = i === selectedCar;

      // Card background
      ctx.save();
      if (isSelected) {
        ctx.strokeStyle = car.color;
        ctx.lineWidth = 3;
        ctx.shadowColor = car.color;
        ctx.shadowBlur = 15;
      } else {
        ctx.strokeStyle = '#333';
        ctx.lineWidth = 1;
      }
      ctx.fillStyle = isSelected ? '#111122' : '#0d0d0d';
      this._roundRect(cx - cardW / 2, cy - cardH / 2, cardW, cardH, 8);
      ctx.fill();
      ctx.stroke();
      ctx.restore();

      // Car miniature
      const bobY = isSelected ? Math.sin(fc * 0.08) * 4 : 0;
      this._drawMiniCar(ctx, cx, cy - 30 + bobY, car, isSelected);

      // Car name
      this._drawText(car.name.toUpperCase(), cx, cy + 50, 7, isSelected ? car.color : '#aaa', 'center');

      // Stats
      const statsY = cy + 70;
      this._drawStat(ctx, cx - cardW / 2 + 10, statsY,      cardW - 20, 'SPD', car.speed,    isSelected);
      this._drawStat(ctx, cx - cardW / 2 + 10, statsY + 20, cardW - 20, 'HDL', car.handling, isSelected);
      this._drawStat(ctx, cx - cardW / 2 + 10, statsY + 40, cardW - 20, 'ACC', car.accel,    isSelected);
    }

    // Controls hint
    if (Math.floor(fc / 40) % 2 === 0) {
      this._drawText('PRESS ENTER TO RACE!', W / 2, H - 30, 9, '#ffaa00', 'center');
    }
  }

  // ─────────────────────────────────────────────
  // HUD (in-game)
  // ─────────────────────────────────────────────

  /**
   * Draw in-game HUD.
   * @param {object} gameState - { speed, maxSpeed, timeLeft, timeLimit, lives, level, score, totalLevels }
   */
  drawHUD(gameState) {
    const ctx = this.ctx;
    const W = CONSTANTS.CANVAS_WIDTH;
    const H = CONSTANTS.CANVAS_HEIGHT;
    const pad = CONSTANTS.HUD_PADDING;

    // ── Speedometer (bottom-left arc) ──
    const spdCx = 70;
    const spdCy = H - 60;
    const spdR  = 50;
    const speedPct = Math.min(1, gameState.speed / gameState.maxSpeed);

    // Arc background
    ctx.save();
    ctx.beginPath();
    ctx.arc(spdCx, spdCy, spdR, Math.PI * 0.75, Math.PI * 2.25);
    ctx.strokeStyle = '#333';
    ctx.lineWidth = 8;
    ctx.stroke();

    // Speed arc
    const arcEnd = Math.PI * 0.75 + speedPct * Math.PI * 1.5;
    const spdColor = speedPct > 0.8 ? '#ff4444' : speedPct > 0.5 ? '#ffaa00' : '#44ff88';
    ctx.beginPath();
    ctx.arc(spdCx, spdCy, spdR, Math.PI * 0.75, arcEnd);
    ctx.strokeStyle = spdColor;
    ctx.lineWidth = 8;
    ctx.stroke();

    // Speed number
    const mph = Math.floor(speedPct * 200);
    this._drawText(String(mph), spdCx, spdCy + 5, 11, '#fff', 'center');
    this._drawText('MPH', spdCx, spdCy + 18, 6, '#888', 'center');
    ctx.restore();

    // ── Timer (top-right) ──
    const tLeft = Math.max(0, Math.ceil(gameState.timeLeft));
    const timerColor = tLeft <= 10 ? (Math.floor(this._frameCount / 15) % 2 ? '#ff3333' : '#ff9999') : '#fff';
    this._drawText('TIME', W - 120, pad + 12, 8, '#888', 'left');
    this._drawText(this._pad2(tLeft), W - 120, pad + 30, 18, timerColor, 'left');

    // ── Level (top-center) ──
    this._drawText(`LEVEL ${gameState.level} / ${gameState.totalLevels}`, W / 2, pad + 20, 8, '#fff', 'center');

    // ── Score (top-left) ──
    this._drawText('SCORE', pad, pad + 12, 7, '#888', 'left');
    this._drawText(String(Math.floor(gameState.score)), pad, pad + 30, 10, '#ffff00', 'left');

    // ── Lives (bottom-right) ──
    const livesX = W - pad;
    const livesY = H - pad - 10;
    this._drawText('LIVES', livesX - 10, livesY - 20, 6, '#888', 'right');
    for (let i = 0; i < CONSTANTS.TOTAL_LIVES; i++) {
      const alive = i < gameState.lives;
      const hx = livesX - i * 22;
      this._drawHeart(ctx, hx, livesY, 14, alive ? '#ff3366' : '#333');
    }
  }

  // ─────────────────────────────────────────────
  // PAUSE OVERLAY
  // ─────────────────────────────────────────────

  /**
   * Draw pause overlay (semi-transparent, over gameplay).
   */
  drawPauseOverlay() {
    const ctx = this.ctx;
    const W = CONSTANTS.CANVAS_WIDTH;
    const H = CONSTANTS.CANVAS_HEIGHT;

    ctx.save();
    ctx.fillStyle = 'rgba(0,0,0,0.6)';
    ctx.fillRect(0, 0, W, H);
    ctx.restore();

    this._drawText('PAUSED', W / 2, H / 2 - 20, 24, '#fff', 'center');
    this._drawText('PRESS P TO RESUME', W / 2, H / 2 + 30, 9, '#aaa', 'center');
  }

  // ─────────────────────────────────────────────
  // LEVEL COMPLETE
  // ─────────────────────────────────────────────

  /**
   * Draw level complete overlay.
   * @param {object} gs - { level, score, bonusTime }
   */
  drawLevelComplete(gs) {
    const ctx = this.ctx;
    const W = CONSTANTS.CANVAS_WIDTH;
    const H = CONSTANTS.CANVAS_HEIGHT;
    const fc = this._frameCount;

    ctx.save();
    ctx.fillStyle = 'rgba(0,0,0,0.7)';
    ctx.fillRect(0, 0, W, H);
    ctx.restore();

    const pulse = 1 + 0.05 * Math.sin(fc * 0.1);
    ctx.save();
    ctx.translate(W / 2, H / 2 - 80);
    ctx.scale(pulse, pulse);
    this._drawText('LEVEL COMPLETE!', 0, 0, 18, '#44ff44', 'center');
    ctx.restore();

    this._drawText(`LEVEL ${gs.level}`, W / 2, H / 2 - 20, 10, '#fff', 'center');
    this._drawText(`SCORE: ${Math.floor(gs.score)}`, W / 2, H / 2 + 20, 10, '#ffff00', 'center');

    if (Math.floor(fc / 40) % 2 === 0) {
      this._drawText('PRESS ENTER TO CONTINUE', W / 2, H / 2 + 70, 8, '#aaa', 'center');
    }
  }

  // ─────────────────────────────────────────────
  // GAME OVER
  // ─────────────────────────────────────────────

  /**
   * Draw game over screen.
   * @param {object} gs - { score, level }
   */
  drawGameOver(gs) {
    const ctx = this.ctx;
    const W = CONSTANTS.CANVAS_WIDTH;
    const H = CONSTANTS.CANVAS_HEIGHT;
    const fc = this._frameCount;

    ctx.fillStyle = '#000';
    ctx.fillRect(0, 0, W, H);

    // Animated red scanlines
    for (let y = 0; y < H; y += 4) {
      ctx.fillStyle = `rgba(80,0,0,${0.15 + 0.05 * Math.sin(y * 0.1 + fc * 0.05)})`;
      ctx.fillRect(0, y, W, 2);
    }

    ctx.save();
    ctx.shadowColor = '#ff0000';
    ctx.shadowBlur = 30;
    this._drawText('GAME OVER', W / 2, H / 2 - 80, 30, '#ff2222', 'center');
    ctx.restore();

    this._drawText(`SCORE: ${Math.floor(gs.score)}`, W / 2, H / 2, 12, '#fff', 'center');
    this._drawText(`REACHED LEVEL ${gs.level}`, W / 2, H / 2 + 40, 9, '#aaa', 'center');

    if (Math.floor(fc / 40) % 2 === 0) {
      this._drawText('PRESS ENTER TO RESTART', W / 2, H / 2 + 100, 9, '#ff8888', 'center');
    }
  }

  // ─────────────────────────────────────────────
  // WIN SCREEN
  // ─────────────────────────────────────────────

  /**
   * Draw win/celebration screen.
   * @param {object} gs - { score, carName, particles }
   */
  drawWinScreen(gs) {
    const ctx = this.ctx;
    const W = CONSTANTS.CANVAS_WIDTH;
    const H = CONSTANTS.CANVAS_HEIGHT;
    const fc = this._frameCount;

    ctx.fillStyle = '#000';
    ctx.fillRect(0, 0, W, H);

    // Draw firework particles
    if (gs.particles) {
      for (const p of gs.particles) {
        if (!p.active) continue;
        ctx.save();
        ctx.globalAlpha = p.life;
        ctx.fillStyle = p.color;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      }
    }

    // Scrolling CONGRATULATIONS banner
    const bannerText = '*** CONGRATULATIONS! ***';
    ctx.font = `bold 22px 'Press Start 2P', monospace`;
    const textW = ctx.measureText(bannerText).width;
    const bannerX = W - ((fc * 2) % (W + textW + 20));
    const bannerY = 80;

    ctx.save();
    ctx.shadowColor = '#ffff00';
    ctx.shadowBlur = 15;
    ctx.fillStyle = '#ffff00';
    ctx.font = `bold 22px 'Press Start 2P', monospace`;
    ctx.fillText(bannerText, bannerX, bannerY);
    ctx.restore();

    // Stats panel
    const panelY = H / 2 - 60;
    ctx.save();
    ctx.fillStyle = 'rgba(0,40,0,0.8)';
    this._roundRect(W / 2 - 220, panelY, 440, 180, 10);
    ctx.fill();
    ctx.strokeStyle = '#44ff44';
    ctx.lineWidth = 2;
    this._roundRect(W / 2 - 220, panelY, 440, 180, 10);
    ctx.stroke();
    ctx.restore();

    this._drawText('YOU WIN!', W / 2, panelY + 35, 18, '#44ff44', 'center');
    this._drawText(`CAR: ${gs.carName || 'BALANCED'}`, W / 2, panelY + 75, 9, '#fff', 'center');
    this._drawText(`FINAL SCORE: ${Math.floor(gs.score)}`, W / 2, panelY + 105, 9, '#ffff00', 'center');
    this._drawText('ALL 10 LEVELS COMPLETE!', W / 2, panelY + 135, 8, '#aaa', 'center');

    if (Math.floor(fc / 40) % 2 === 0) {
      this._drawText('PRESS ENTER TO PLAY AGAIN', W / 2, H - 50, 9, '#fff', 'center');
    }
  }

  // ─────────────────────────────────────────────
  // Private helpers
  // ─────────────────────────────────────────────

  /**
   * Draw text using Press Start 2P font.
   * @param {string} text
   * @param {number} x
   * @param {number} y
   * @param {number} size - Font size in px
   * @param {string} color
   * @param {string} align - 'left' | 'center' | 'right'
   */
  _drawText(text, x, y, size, color, align) {
    const ctx = this.ctx;
    ctx.save();
    ctx.fillStyle = color;
    ctx.font = `${size}px 'Press Start 2P', monospace`;
    ctx.textAlign = align || 'left';
    ctx.textBaseline = 'middle';
    ctx.fillText(text, x, y);
    ctx.restore();
  }

  /**
   * Draw a stat bar (label + filled blocks).
   */
  _drawStat(ctx, x, y, w, label, value, highlight) {
    const maxVal = 5;
    const labelW = 30;
    this._drawText(label, x + labelW - 2, y + 7, 5, highlight ? '#aaa' : '#555', 'right');
    const barW = (w - labelW - 4) / maxVal;
    for (let i = 0; i < maxVal; i++) {
      ctx.fillStyle = i < value ? (highlight ? '#44ff88' : '#225533') : '#111';
      ctx.fillRect(x + labelW + 2 + i * (barW + 1), y + 1, barW, 12);
    }
  }

  /**
   * Draw a small car icon for car select.
   */
  _drawMiniCar(ctx, cx, cy, cfg, selected) {
    const w = 60, h = 40;
    ctx.save();
    ctx.translate(cx, cy);

    // Body
    ctx.fillStyle = cfg.bodyColor;
    ctx.fillRect(-w / 2, -h * 0.3, w, h * 0.6);

    // Cabin
    ctx.fillStyle = cfg.color;
    ctx.beginPath();
    ctx.moveTo(-w * 0.25, -h * 0.3);
    ctx.lineTo(-w * 0.18, -h * 0.75);
    ctx.lineTo(w * 0.18, -h * 0.75);
    ctx.lineTo(w * 0.25, -h * 0.3);
    ctx.closePath();
    ctx.fill();

    // Windshield
    ctx.fillStyle = 'rgba(150,220,255,0.7)';
    ctx.beginPath();
    ctx.moveTo(-w * 0.18, -h * 0.32);
    ctx.lineTo(-w * 0.12, -h * 0.7);
    ctx.lineTo(w * 0.12, -h * 0.7);
    ctx.lineTo(w * 0.18, -h * 0.32);
    ctx.closePath();
    ctx.fill();

    // Wheels
    ctx.fillStyle = '#111';
    ctx.fillRect(-w * 0.45, -h * 0.15, w * 0.18, h * 0.5);
    ctx.fillRect(w * 0.27, -h * 0.15, w * 0.18, h * 0.5);

    if (selected) {
      // Glow outline
      ctx.strokeStyle = cfg.color;
      ctx.lineWidth = 2;
      ctx.shadowColor = cfg.color;
      ctx.shadowBlur = 10;
      ctx.strokeRect(-w / 2 - 4, -h * 0.85, w + 8, h * 1.1);
    }

    ctx.restore();
  }

  /**
   * Draw a heart icon for lives display.
   */
  _drawHeart(ctx, x, y, size, color) {
    ctx.save();
    ctx.fillStyle = color;
    ctx.beginPath();
    const s = size / 2;
    ctx.moveTo(x, y + s * 0.5);
    ctx.bezierCurveTo(x, y - s, x - s * 2, y - s, x - s * 2, y);
    ctx.bezierCurveTo(x - s * 2, y + s, x, y + s * 1.5, x, y + s * 1.5);
    ctx.bezierCurveTo(x, y + s * 1.5, x + s * 2, y + s, x + s * 2, y);
    ctx.bezierCurveTo(x + s * 2, y - s, x, y - s, x, y + s * 0.5);
    ctx.fill();
    ctx.restore();
  }

  /**
   * Draw a rounded rectangle path.
   */
  _roundRect(x, y, w, h, r) {
    const ctx = this.ctx;
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.lineTo(x + w - r, y);
    ctx.quadraticCurveTo(x + w, y, x + w, y + r);
    ctx.lineTo(x + w, y + h - r);
    ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
    ctx.lineTo(x + r, y + h);
    ctx.quadraticCurveTo(x, y + h, x, y + h - r);
    ctx.lineTo(x, y + r);
    ctx.quadraticCurveTo(x, y, x + r, y);
    ctx.closePath();
  }

  /**
   * Zero-pad a number to 2 digits.
   * @param {number} n
   * @returns {string}
   */
  _pad2(n) {
    return n < 10 ? '0' + n : String(n);
  }
}
