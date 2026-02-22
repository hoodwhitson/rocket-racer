/**
 * player.js
 * Player — physics, input handling, enhanced car sprites, crash animation.
 */
class Player {
  /** @param {HTMLCanvasElement} canvas */
  constructor(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');

    // Physics state
    this.speed = 0;
    this.x = 0;
    this.z = 0;
    this.steerInput = 0;

    // Car config
    this.carConfig = null;

    // Input state
    this._keys = { left: false, right: false, accel: false, brake: false };

    // Offscreen sprite canvases (120x80 for more detail)
    this._sprites = { straight: null, left: null, right: null };

    // Collision state
    this.isColliding = false;
    this._collisionTimer = 0;

    // Crash animation state
    this._crashState = {
      active: false,
      timer: 0,
      duration: CONSTANTS.CRASH_DURATION,
      spinAngle: 0,
      bounceY: 0,
      direction: 1,
    };

    // Bind input handlers
    this._onKeyDown = this._onKeyDown.bind(this);
    this._onKeyUp   = this._onKeyUp.bind(this);
    document.addEventListener('keydown', this._onKeyDown);
    document.addEventListener('keyup',   this._onKeyUp);

    this._touchHandlers = {};
  }

  /** @param {object} cfg - Car config from CONSTANTS.CAR_CONFIGS */
  setCarConfig(cfg) {
    this.carConfig = cfg;
    this._buildSprites(cfg);
  }

  /** Bind touch buttons. */
  bindTouchControls(btnLeft, btnRight, btnAccel, btnBrake) {
    const bind = (el, key) => {
      const down = () => { this._keys[key] = true; };
      const up   = () => { this._keys[key] = false; };
      el.addEventListener('pointerdown', down);
      el.addEventListener('pointerup',   up);
      el.addEventListener('pointercancel', up);
      this._touchHandlers[key] = { el, down, up };
    };
    bind(btnLeft,  'left');
    bind(btnRight, 'right');
    bind(btnAccel, 'accel');
    bind(btnBrake, 'brake');
  }

  /** Reset player for a new level. */
  reset() {
    this.speed = 0;
    this.x = 0;
    this.z = 0;
    this.steerInput = 0;
    this.isColliding = false;
    this._collisionTimer = 0;
    this._crashState.active = false;
    this._crashState.timer = 0;
  }

  /** @returns {boolean} True if crash animation is currently playing */
  isCrashing() {
    return this._crashState.active;
  }

  /**
   * Update player physics.
   * @param {number} dt
   * @param {object} currentSegment
   * @param {Array} traffic
   * @returns {{ collided: boolean }}
   */
  update(dt, currentSegment, traffic) {
    const C = CONSTANTS;
    const cfg = this.carConfig || C.CAR_CONFIGS[3];
    const mult = dt * 60;

    // ── Crash animation active ──
    if (this._crashState.active) {
      this._updateCrash(dt);
      // During crash, car decelerates
      this.speed *= Math.pow(0.95, mult);
      this.z += this.speed * dt;
      const trackLength = C.ROAD_SEGMENTS * C.ROAD_SEGMENT_LENGTH;
      if (this.z >= trackLength) this.z -= trackLength;
      if (this.z < 0) this.z += trackLength;
      return { collided: false };
    }

    // ── Collision cool-down ──
    if (this._collisionTimer > 0) {
      this._collisionTimer -= dt;
      if (this._collisionTimer < 0) {
        this._collisionTimer = 0;
        this.isColliding = false;
      }
    }

    // ── Acceleration ──
    const maxSpeed = C.PLAYER_MAX_SPEED * cfg.topSpeedMult;
    if (this._keys.accel) {
      this.speed += C.PLAYER_ACCEL * cfg.accelMult * mult;
    } else if (this._keys.brake) {
      this.speed -= C.PLAYER_BRAKE * mult;
    } else {
      this.speed -= C.PLAYER_DECEL * mult;
    }
    this.speed = Math.max(0, Math.min(maxSpeed, this.speed));

    // ── Steering ──
    this.steerInput = 0;
    if (this._keys.left)  this.steerInput = -1;
    if (this._keys.right) this.steerInput =  1;

    const steerAmount = C.PLAYER_STEER_SPEED * cfg.gripMult * mult;
    this.x += this.steerInput * steerAmount * (this.speed / maxSpeed + 0.3);

    // ── Centrifugal drift ──
    if (currentSegment) {
      const speedPct = this.speed / maxSpeed;
      this.x -= currentSegment.curve * speedPct * C.CENTRIFUGAL_FORCE * mult;
    }

    // ── Off-road penalty ──
    if (Math.abs(this.x) > 1.0) {
      this.speed *= Math.pow(C.OFFROAD_DECEL, mult);
    }

    this.x = Math.max(-2.0, Math.min(2.0, this.x));

    // ── Advance Z ──
    this.z += this.speed * dt;
    const trackLength = C.ROAD_SEGMENTS * C.ROAD_SEGMENT_LENGTH;
    if (this.z >= trackLength) this.z -= trackLength;
    if (this.z < 0) this.z += trackLength;

    // ── Traffic collision ──
    let collided = false;
    if (this._collisionTimer <= 0 && traffic) {
      const playerSegIdx = Math.floor(this.z / C.ROAD_SEGMENT_LENGTH) % C.ROAD_SEGMENTS;
      for (const car of traffic) {
        const carSegIdx = Math.floor(car.segmentIndex) % C.ROAD_SEGMENTS;
        const segDiff = Math.abs(playerSegIdx - carSegIdx);
        if (segDiff <= 2 || segDiff >= C.ROAD_SEGMENTS - 2) {
          if (Math.abs(this.x - car.x) < C.COLLISION_RADIUS_X) {
            this.speed *= C.COLLISION_SPEED_PENALTY;
            this.isColliding = true;
            this._collisionTimer = C.CRASH_DURATION + 0.5;
            // Start crash animation
            this._crashState.active = true;
            this._crashState.timer = 0;
            this._crashState.spinAngle = 0;
            this._crashState.bounceY = 0;
            this._crashState.direction = car.x > this.x ? -1 : 1;
            collided = true;
            break;
          }
        }
      }
    }

    return { collided };
  }

  /** Draw the player car. */
  draw() {
    const ctx = this.ctx;
    const W = CONSTANTS.CANVAS_WIDTH;
    const H = CONSTANTS.CANVAS_HEIGHT;

    let sprite;
    if (this.steerInput < 0) sprite = this._sprites.left;
    else if (this.steerInput > 0) sprite = this._sprites.right;
    else sprite = this._sprites.straight;

    if (!sprite) return;

    const sw = sprite.width;
    const sh = sprite.height;
    const drawX = W / 2 - sw / 2;
    const drawY = H - sh - 20;

    ctx.save();

    // Crash animation transform
    if (this._crashState.active) {
      const cs = this._crashState;
      const cx = drawX + sw / 2;
      const cy = drawY + sh / 2;
      ctx.translate(cx, cy - cs.bounceY);
      ctx.rotate(cs.spinAngle);
      ctx.translate(-cx, -cy);
      // Flash during crash
      if (Math.floor(cs.timer * 12) % 3 === 0) ctx.globalAlpha = 0.4;
    } else if (this.isColliding && Math.floor(this._collisionTimer * 10) % 2 === 0) {
      ctx.globalAlpha = 0.5;
    }

    ctx.drawImage(sprite, drawX, drawY);
    ctx.restore();
  }

  /** @returns {number} 0-1 speed fraction */
  getSpeedPercent() {
    const maxSpeed = CONSTANTS.PLAYER_MAX_SPEED * (this.carConfig ? this.carConfig.topSpeedMult : 1);
    return this.speed / maxSpeed;
  }

  /** @returns {number} Camera X offset */
  getCameraX() {
    return this.x * 500;
  }

  /** Remove event listeners. */
  destroy() {
    document.removeEventListener('keydown', this._onKeyDown);
    document.removeEventListener('keyup', this._onKeyUp);
  }

  // ── Private ──

  _updateCrash(dt) {
    const cs = this._crashState;
    cs.timer += dt;
    cs.spinAngle += cs.direction * dt * 6;

    // Parabolic bounce arc
    const t = cs.timer / cs.duration;
    cs.bounceY = Math.sin(t * Math.PI) * 80;

    // Lateral drift
    this.x += cs.direction * dt * 0.5;
    this.x = Math.max(-2.0, Math.min(2.0, this.x));

    if (cs.timer >= cs.duration) {
      cs.active = false;
      cs.timer = 0;
      cs.spinAngle = 0;
      cs.bounceY = 0;
    }
  }

  /** @param {KeyboardEvent} e */
  _onKeyDown(e) {
    switch (e.code) {
      case 'ArrowLeft':  this._keys.left  = true; e.preventDefault(); break;
      case 'ArrowRight': this._keys.right = true; e.preventDefault(); break;
      case 'ArrowUp':
      case 'KeyZ':       this._keys.accel = true; e.preventDefault(); break;
      case 'ArrowDown':
      case 'KeyX':       this._keys.brake = true; e.preventDefault(); break;
    }
  }

  /** @param {KeyboardEvent} e */
  _onKeyUp(e) {
    switch (e.code) {
      case 'ArrowLeft':  this._keys.left  = false; break;
      case 'ArrowRight': this._keys.right = false; break;
      case 'ArrowUp':
      case 'KeyZ':       this._keys.accel = false; break;
      case 'ArrowDown':
      case 'KeyX':       this._keys.brake = false; break;
    }
  }

  /**
   * Pre-render car sprites to offscreen canvases (120x80).
   * @param {object} cfg
   */
  _buildSprites(cfg) {
    const W = 120;
    const H = 80;
    this._sprites.straight = this._drawCarSprite(cfg, W, H, 0);
    this._sprites.left     = this._drawCarSprite(cfg, W, H, -1);
    this._sprites.right    = this._drawCarSprite(cfg, W, H, 1);
  }

  /**
   * Draw an enhanced car sprite (rear view, sports car style).
   * @param {object} cfg
   * @param {number} W
   * @param {number} H
   * @param {number} lean
   * @returns {HTMLCanvasElement}
   */
  _drawCarSprite(cfg, W, H, lean) {
    const oc = document.createElement('canvas');
    oc.width = W;
    oc.height = H;
    const ctx = oc.getContext('2d');
    const leanPx = lean * 7;
    const cx = W / 2 + leanPx;
    const cy = H / 2 + 4;

    // Shadow
    ctx.fillStyle = 'rgba(0,0,0,0.3)';
    ctx.beginPath();
    ctx.ellipse(cx, H - 3, W * 0.38, 6, 0, 0, Math.PI * 2);
    ctx.fill();

    // Body outline (silhouette)
    ctx.save();
    ctx.translate(cx, cy);

    // Lower body (darker)
    ctx.fillStyle = cfg.bodyColor;
    ctx.beginPath();
    ctx.moveTo(-44, -6);
    // Curved hood line
    ctx.quadraticCurveTo(-44, -14, -38, -14);
    ctx.lineTo(38, -14);
    ctx.quadraticCurveTo(44, -14, 44, -6);
    ctx.lineTo(44, 16);
    ctx.lineTo(-44, 16);
    ctx.closePath();
    ctx.fill();

    // Upper body (lighter accent)
    ctx.fillStyle = cfg.color;
    ctx.beginPath();
    ctx.moveTo(-44, -6);
    ctx.quadraticCurveTo(-44, -14, -38, -14);
    ctx.lineTo(38, -14);
    ctx.quadraticCurveTo(44, -14, 44, -6);
    ctx.lineTo(44, 4);
    ctx.lineTo(-44, 4);
    ctx.closePath();
    ctx.fill();

    // Cabin / windshield frame
    ctx.fillStyle = cfg.color;
    ctx.beginPath();
    ctx.moveTo(-24, -14);
    ctx.lineTo(-20, -32);
    ctx.lineTo(20, -32);
    ctx.lineTo(24, -14);
    ctx.closePath();
    ctx.fill();

    // Rear spoiler
    ctx.fillStyle = cfg.bodyColor;
    ctx.fillRect(-28, -35, 56, 4);
    ctx.fillRect(-30, -36, 4, 6);
    ctx.fillRect(26, -36, 4, 6);

    // Windshield glass
    ctx.fillStyle = 'rgba(140,210,255,0.75)';
    ctx.beginPath();
    ctx.moveTo(-18, -15);
    ctx.lineTo(-15, -30);
    ctx.lineTo(15, -30);
    ctx.lineTo(18, -15);
    ctx.closePath();
    ctx.fill();

    // Body outline stroke
    ctx.strokeStyle = 'rgba(0,0,0,0.4)';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(-44, 16);
    ctx.lineTo(-44, -6);
    ctx.quadraticCurveTo(-44, -14, -38, -14);
    ctx.lineTo(-24, -14);
    ctx.lineTo(-20, -32);
    ctx.lineTo(20, -32);
    ctx.lineTo(24, -14);
    ctx.lineTo(38, -14);
    ctx.quadraticCurveTo(44, -14, 44, -6);
    ctx.lineTo(44, 16);
    ctx.stroke();

    // Wheels
    ctx.fillStyle = '#111';
    ctx.fillRect(-48, -10, 14, 12);
    ctx.fillRect(34, -10, 14, 12);
    ctx.fillRect(-48, 8, 14, 12);
    ctx.fillRect(34, 8, 14, 12);
    // Wheel highlights
    ctx.fillStyle = '#333';
    ctx.fillRect(-46, -9, 10, 10);
    ctx.fillRect(36, -9, 10, 10);
    ctx.fillRect(-46, 9, 10, 10);
    ctx.fillRect(36, 9, 10, 10);

    // Tail lights (glowing red)
    ctx.fillStyle = '#ff2222';
    ctx.shadowColor = '#ff0000';
    ctx.shadowBlur = 8;
    ctx.beginPath();
    ctx.arc(-36, 12, 5, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(36, 12, 5, 0, Math.PI * 2);
    ctx.fill();
    ctx.shadowBlur = 0;

    // Headlight glow (visible on road ahead — subtle light cone)
    ctx.fillStyle = 'rgba(255,255,200,0.08)';
    ctx.beginPath();
    ctx.moveTo(-30, -20);
    ctx.lineTo(-50, -50);
    ctx.lineTo(50, -50);
    ctx.lineTo(30, -20);
    ctx.closePath();
    ctx.fill();

    // Headlights
    ctx.fillStyle = '#ffffaa';
    ctx.shadowColor = '#ffff88';
    ctx.shadowBlur = 5;
    ctx.fillRect(-34, -20, 10, 5);
    ctx.fillRect(24, -20, 10, 5);
    ctx.shadowBlur = 0;

    ctx.restore();

    return oc;
  }
}
