/**
 * ui.js
 * UI — dashboard HUD, menus, overlays, checkpoint notifications.
 */
class UI {
  /** @param {HTMLCanvasElement} canvas */
  constructor(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this._frameCount = 0;
    this._fontCache = {};

    // Checkpoint notification state
    this._checkpointTimer = 0;
    this._checkpointBonus = 0;
  }

  /** Increment frame counter. */
  tick() { this._frameCount++; }

  /** Show checkpoint notification. */
  showCheckpoint(timeBonus) {
    this._checkpointTimer = CONSTANTS.CHECKPOINT_DISPLAY_TIME;
    this._checkpointBonus = timeBonus;
  }

  /** Update checkpoint timer. */
  updateCheckpoint(dt) {
    if (this._checkpointTimer > 0) this._checkpointTimer -= dt;
  }

  // ─────────────────────────────────────────────
  // MAIN MENU
  // ─────────────────────────────────────────────

  drawMainMenu() {
    const ctx = this.ctx;
    const W = CONSTANTS.CANVAS_WIDTH;
    const H = CONSTANTS.CANVAS_HEIGHT;
    const fc = this._frameCount;

    // Dark background
    ctx.fillStyle = '#000';
    ctx.fillRect(0, 0, W, H);

    // Road perspective effect
    const horizonY = H * 0.38;
    // Sky gradient
    const skyGrad = ctx.createLinearGradient(0, 0, 0, horizonY);
    skyGrad.addColorStop(0, '#1a0a30');
    skyGrad.addColorStop(1, '#402050');
    ctx.fillStyle = skyGrad;
    ctx.fillRect(0, 0, W, horizonY);

    // Ground (road receding)
    const roadGrad = ctx.createLinearGradient(0, horizonY, 0, H);
    roadGrad.addColorStop(0, '#333');
    roadGrad.addColorStop(1, '#555');
    ctx.fillStyle = roadGrad;
    ctx.fillRect(0, horizonY, W, H - horizonY);

    // Vanishing point road lines
    const vpx = W / 2;
    ctx.strokeStyle = '#666';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(vpx - 2, horizonY);
    ctx.lineTo(0, H);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(vpx + 2, horizonY);
    ctx.lineTo(W, H);
    ctx.stroke();

    // Dashed center line
    ctx.strokeStyle = '#888';
    ctx.setLineDash([8, 12]);
    ctx.beginPath();
    ctx.moveTo(vpx, horizonY);
    ctx.lineTo(vpx, H);
    ctx.stroke();
    ctx.setLineDash([]);

    // Title with glow
    const glowIntensity = 0.6 + 0.4 * Math.sin(fc * 0.05);
    ctx.save();
    ctx.shadowColor = '#ff4400';
    ctx.shadowBlur = 25 * glowIntensity;
    this._drawText('ROCKET', W / 2, 120, 38, '#ff4400', 'center');
    ctx.shadowColor = '#ffaa00';
    ctx.shadowBlur = 25 * glowIntensity;
    this._drawText('RACER', W / 2, 175, 38, '#ffaa00', 'center');
    ctx.restore();

    this._drawText('A RETRO RACING GAME', W / 2, 220, 8, '#888', 'center');

    // Blinking PRESS ENTER
    if (Math.floor(fc / 30) % 2 === 0) {
      this._drawText('PRESS ENTER TO START', W / 2, 310, 10, '#fff', 'center');
    }

    // Controls
    this._drawText('ARROWS: STEER / ACCEL / BRAKE', W / 2, 380, 7, '#555', 'center');
    this._drawText('P: PAUSE', W / 2, 405, 7, '#555', 'center');

    this._drawText('(C) 2026 ROCKET RACER', W / 2, 560, 6, '#333', 'center');
  }

  // ─────────────────────────────────────────────
  // CAR SELECT
  // ─────────────────────────────────────────────

  drawCarSelect(selectedCar) {
    const ctx = this.ctx;
    const W = CONSTANTS.CANVAS_WIDTH;
    const H = CONSTANTS.CANVAS_HEIGHT;
    const fc = this._frameCount;
    const cars = CONSTANTS.CAR_CONFIGS;

    ctx.fillStyle = '#0a0a1a';
    ctx.fillRect(0, 0, W, H);

    this._drawText('SELECT YOUR CAR', W / 2, 50, 14, '#fff', 'center');
    this._drawText('LEFT / RIGHT ARROWS  |  ENTER TO CONFIRM', W / 2, 80, 6, '#666', 'center');

    const cardW = 160;
    const cardH = 200;
    const startX = W / 2 - (cars.length * cardW + (cars.length - 1) * 10) / 2;

    for (let i = 0; i < cars.length; i++) {
      const car = cars[i];
      const cx = startX + i * (cardW + 10) + cardW / 2;
      const cy = 200;
      const isSelected = i === selectedCar;

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

      const bobY = isSelected ? Math.sin(fc * 0.08) * 4 : 0;
      this._drawMiniCar(ctx, cx, cy - 30 + bobY, car, isSelected);

      this._drawText(car.name.toUpperCase(), cx, cy + 50, 7, isSelected ? car.color : '#aaa', 'center');

      const statsY = cy + 70;
      this._drawStat(ctx, cx - cardW / 2 + 10, statsY,      cardW - 20, 'SPD', car.speed,    isSelected);
      this._drawStat(ctx, cx - cardW / 2 + 10, statsY + 20, cardW - 20, 'HDL', car.handling, isSelected);
      this._drawStat(ctx, cx - cardW / 2 + 10, statsY + 40, cardW - 20, 'ACC', car.accel,    isSelected);
    }

    if (Math.floor(fc / 40) % 2 === 0) {
      this._drawText('PRESS ENTER TO RACE!', W / 2, H - 30, 9, '#ffaa00', 'center');
    }
  }

  // ─────────────────────────────────────────────
  // HUD — Rad Racer Dashboard Style
  // ─────────────────────────────────────────────

  /**
   * Draw the Rad Racer-style dashboard HUD.
   * @param {object} gs
   */
  drawHUD(gs) {
    const ctx = this.ctx;
    const W = CONSTANTS.CANVAS_WIDTH;
    const H = CONSTANTS.CANVAS_HEIGHT;
    const dashH = CONSTANTS.DASHBOARD_HEIGHT;
    const dashY = H - dashH;

    // ── Power bar (thin colored strip above dashboard) ──
    const speedPct = Math.min(1, gs.speed / gs.maxSpeed);
    const barH = 4;
    ctx.fillStyle = '#111';
    ctx.fillRect(0, dashY - barH, W, barH);
    const barColor = speedPct > 0.8 ? '#ff2222' : speedPct > 0.5 ? '#ffaa00' : '#44ff88';
    ctx.fillStyle = barColor;
    ctx.fillRect(0, dashY - barH, W * speedPct, barH);

    // ── Dashboard panel ──
    ctx.fillStyle = 'rgba(0,0,40,0.88)';
    ctx.fillRect(0, dashY, W, dashH);

    // Top border line
    ctx.fillStyle = '#334';
    ctx.fillRect(0, dashY, W, 2);

    // ── Layout: 3 columns ──
    const colW = W / 3;
    const textY1 = dashY + 18;
    const textY2 = dashY + 38;
    const textY3 = dashY + 55;

    // Vertical dividers
    ctx.fillStyle = '#223';
    ctx.fillRect(colW, dashY + 6, 1, dashH - 12);
    ctx.fillRect(colW * 2, dashY + 6, 1, dashH - 12);

    // ── Left column: TIME + LIVES ──
    const tLeft = Math.max(0, Math.ceil(gs.timeLeft));
    const timerFlash = tLeft <= 10 && Math.floor(this._frameCount / 12) % 2;
    const timerColor = tLeft <= 10 ? (timerFlash ? '#ff3333' : '#ff9999') : '#FFFFFF';

    this._drawText('TIME', colW * 0.5, textY1, 7, '#8888AA', 'center');
    this._drawText(this._pad3(tLeft), colW * 0.5, textY2, 16, timerColor, 'center');

    // Lives as small car icons
    const livesStartX = colW * 0.5 - (gs.lives - 1) * 10;
    for (let i = 0; i < CONSTANTS.TOTAL_LIVES; i++) {
      const alive = i < gs.lives;
      this._drawMiniCarIcon(ctx, livesStartX + i * 20, textY3, alive);
    }

    // ── Center column: KM/H + STAGE ──
    const kmh = Math.floor(speedPct * 300);
    this._drawText('KM/H', colW * 1.5, textY1, 7, '#8888AA', 'center');
    this._drawText(String(kmh), colW * 1.5, textY2, 16, '#FFFFFF', 'center');
    this._drawText(`STAGE ${gs.level}`, colW * 1.5, textY3, 7, '#AAAACC', 'center');

    // ── Right column: SCORE ──
    this._drawText('SCORE', colW * 2.5, textY1, 7, '#8888AA', 'center');
    this._drawText(String(Math.floor(gs.score)), colW * 2.5, textY2, 12, '#FFFF00', 'center');

    // ── Checkpoint notification ──
    if (this._checkpointTimer > 0) {
      this._drawCheckpointNotification();
    }
  }

  _drawCheckpointNotification() {
    const ctx = this.ctx;
    const W = CONSTANTS.CANVAS_WIDTH;
    const H = CONSTANTS.CANVAS_HEIGHT;
    const t = this._checkpointTimer / CONSTANTS.CHECKPOINT_DISPLAY_TIME;

    ctx.save();
    ctx.globalAlpha = Math.min(1, t * 2);

    // "CHECKPOINT" banner
    ctx.fillStyle = 'rgba(255,215,0,0.15)';
    ctx.fillRect(0, H * 0.3, W, 60);

    ctx.shadowColor = '#FFD700';
    ctx.shadowBlur = 15;
    this._drawText('CHECKPOINT', W / 2, H * 0.3 + 20, 18, '#FFD700', 'center');
    ctx.shadowBlur = 0;
    this._drawText(`TIME +${this._checkpointBonus}s`, W / 2, H * 0.3 + 45, 10, '#FFFFFF', 'center');

    ctx.restore();
  }

  _drawMiniCarIcon(ctx, x, y, alive) {
    ctx.fillStyle = alive ? '#44ff88' : '#333';
    // Tiny car shape
    ctx.fillRect(x - 5, y - 3, 10, 6);
    ctx.fillRect(x - 3, y - 6, 6, 4);
  }

  // ─────────────────────────────────────────────
  // PAUSE OVERLAY
  // ─────────────────────────────────────────────

  drawPauseOverlay() {
    const ctx = this.ctx;
    const W = CONSTANTS.CANVAS_WIDTH;
    const H = CONSTANTS.CANVAS_HEIGHT;

    ctx.fillStyle = 'rgba(0,0,0,0.6)';
    ctx.fillRect(0, 0, W, H);

    this._drawText('PAUSED', W / 2, H / 2 - 20, 24, '#fff', 'center');
    this._drawText('PRESS P TO RESUME', W / 2, H / 2 + 30, 9, '#aaa', 'center');
  }

  // ─────────────────────────────────────────────
  // LEVEL COMPLETE
  // ─────────────────────────────────────────────

  drawLevelComplete(gs) {
    const ctx = this.ctx;
    const W = CONSTANTS.CANVAS_WIDTH;
    const H = CONSTANTS.CANVAS_HEIGHT;
    const fc = this._frameCount;

    ctx.fillStyle = 'rgba(0,0,0,0.7)';
    ctx.fillRect(0, 0, W, H);

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

  drawGameOver(gs) {
    const ctx = this.ctx;
    const W = CONSTANTS.CANVAS_WIDTH;
    const H = CONSTANTS.CANVAS_HEIGHT;
    const fc = this._frameCount;

    ctx.fillStyle = '#000';
    ctx.fillRect(0, 0, W, H);

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
    this._drawText(`REACHED STAGE ${gs.level}`, W / 2, H / 2 + 40, 9, '#aaa', 'center');

    if (Math.floor(fc / 40) % 2 === 0) {
      this._drawText('PRESS ENTER TO RESTART', W / 2, H / 2 + 100, 9, '#ff8888', 'center');
    }
  }

  // ─────────────────────────────────────────────
  // WIN SCREEN
  // ─────────────────────────────────────────────

  drawWinScreen(gs) {
    const ctx = this.ctx;
    const W = CONSTANTS.CANVAS_WIDTH;
    const H = CONSTANTS.CANVAS_HEIGHT;
    const fc = this._frameCount;

    ctx.fillStyle = '#000';
    ctx.fillRect(0, 0, W, H);

    // Firework particles
    if (gs.particles) {
      for (const p of gs.particles) {
        if (!p.active) continue;
        const prevAlpha = ctx.globalAlpha;
        ctx.globalAlpha = p.life;
        ctx.fillStyle = p.color;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.fill();
        ctx.globalAlpha = prevAlpha;
      }
    }

    // Scrolling banner
    const bannerText = '*** CONGRATULATIONS! ***';
    const fontStr = this._getFont(22);
    ctx.font = fontStr;
    const textW = ctx.measureText(bannerText).width;
    const bannerX = W - ((fc * 2) % (W + textW + 20));

    ctx.save();
    ctx.shadowColor = '#ffff00';
    ctx.shadowBlur = 15;
    ctx.fillStyle = '#ffff00';
    ctx.font = fontStr;
    ctx.fillText(bannerText, bannerX, 80);
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
    this._drawText('ALL 10 STAGES COMPLETE!', W / 2, panelY + 135, 8, '#aaa', 'center');

    if (Math.floor(fc / 40) % 2 === 0) {
      this._drawText('PRESS ENTER TO PLAY AGAIN', W / 2, H - 50, 9, '#fff', 'center');
    }
  }

  // ─────────────────────────────────────────────
  // Private helpers
  // ─────────────────────────────────────────────

  _getFont(size) {
    if (!this._fontCache[size]) {
      this._fontCache[size] = `${size}px 'Press Start 2P', monospace`;
    }
    return this._fontCache[size];
  }

  _drawText(text, x, y, size, color, align) {
    const ctx = this.ctx;
    ctx.save();
    ctx.fillStyle = color;
    ctx.font = this._getFont(size);
    ctx.textAlign = align || 'left';
    ctx.textBaseline = 'middle';
    ctx.fillText(text, x, y);
    ctx.restore();
  }

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

  _drawMiniCar(ctx, cx, cy, cfg, selected) {
    const w = 60, h = 40;
    ctx.save();
    ctx.translate(cx, cy);

    ctx.fillStyle = cfg.bodyColor;
    ctx.fillRect(-w / 2, -h * 0.3, w, h * 0.6);

    ctx.fillStyle = cfg.color;
    ctx.beginPath();
    ctx.moveTo(-w * 0.25, -h * 0.3);
    ctx.lineTo(-w * 0.18, -h * 0.75);
    ctx.lineTo(w * 0.18, -h * 0.75);
    ctx.lineTo(w * 0.25, -h * 0.3);
    ctx.closePath();
    ctx.fill();

    ctx.fillStyle = 'rgba(150,220,255,0.7)';
    ctx.beginPath();
    ctx.moveTo(-w * 0.18, -h * 0.32);
    ctx.lineTo(-w * 0.12, -h * 0.7);
    ctx.lineTo(w * 0.12, -h * 0.7);
    ctx.lineTo(w * 0.18, -h * 0.32);
    ctx.closePath();
    ctx.fill();

    ctx.fillStyle = '#111';
    ctx.fillRect(-w * 0.45, -h * 0.15, w * 0.18, h * 0.5);
    ctx.fillRect(w * 0.27, -h * 0.15, w * 0.18, h * 0.5);

    if (selected) {
      ctx.strokeStyle = cfg.color;
      ctx.lineWidth = 2;
      ctx.shadowColor = cfg.color;
      ctx.shadowBlur = 10;
      ctx.strokeRect(-w / 2 - 4, -h * 0.85, w + 8, h * 1.1);
    }

    ctx.restore();
  }

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

  _pad2(n) {
    return n < 10 ? '0' + n : String(n);
  }

  _pad3(n) {
    if (n < 10) return '00' + n;
    if (n < 100) return '0' + n;
    return String(n);
  }
}
