/**
 * player.js
 * Player — physics, input handling, car sprite drawing, collision detection.
 */
class Player {
  /**
   * @param {HTMLCanvasElement} canvas
   */
  constructor(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');

    // --- Physics state ---
    /** @type {number} Speed in world units / tick (at 60fps) */
    this.speed = 0;
    /** @type {number} Lateral position, -2 (far left) to +2 (far right) */
    this.x = 0;
    /** @type {number} World-space Z position */
    this.z = 0;
    /** @type {number} Current steer input: -1, 0, +1 */
    this.steerInput = 0;

    // --- Car config (set by setCarConfig) ---
    this.carConfig = null;

    // --- Input state ---
    this._keys = {
      left: false,
      right: false,
      accel: false,
      brake: false,
    };

    // --- Offscreen sprite canvases ---
    this._sprites = {
      straight: null,
      left: null,
      right: null,
    };

    // --- Collision state ---
    this.isColliding = false;
    this._collisionTimer = 0;

    // Bind input handlers
    this._onKeyDown = this._onKeyDown.bind(this);
    this._onKeyUp   = this._onKeyUp.bind(this);
    document.addEventListener('keydown', this._onKeyDown);
    document.addEventListener('keyup',   this._onKeyUp);

    // Touch button bindings (set up in bindTouchControls)
    this._touchHandlers = {};
  }

  /**
   * Set the active car configuration and pre-render sprites.
   * @param {object} cfg - Car config from CONSTANTS.CAR_CONFIGS
   */
  setCarConfig(cfg) {
    this.carConfig = cfg;
    this._buildSprites(cfg);
  }

  /**
   * Bind touch buttons.
   * @param {HTMLElement} btnLeft
   * @param {HTMLElement} btnRight
   * @param {HTMLElement} btnAccel
   * @param {HTMLElement} btnBrake
   */
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

  /**
   * Reset player for a new level.
   */
  reset() {
    this.speed = 0;
    this.x = 0;
    this.z = 0;
    this.steerInput = 0;
    this.isColliding = false;
    this._collisionTimer = 0;
  }

  /**
   * Update player physics.
   * @param {number} dt - Delta time in seconds
   * @param {object} currentSegment - Road segment player is on
   * @param {Array} traffic - Traffic cars array
   * @returns {{ collided: boolean }} Result flags
   */
  update(dt, currentSegment, traffic) {
    const C = CONSTANTS;
    const cfg = this.carConfig || C.CAR_CONFIGS[3];
    const mult = dt * 60;  // normalize to 60fps

    // --- Collision cool-down ---
    if (this._collisionTimer > 0) {
      this._collisionTimer -= dt;
      if (this._collisionTimer < 0) {
        this._collisionTimer = 0;
        this.isColliding = false;
      }
    }

    // --- Acceleration ---
    const maxSpeed = C.PLAYER_MAX_SPEED * cfg.topSpeedMult;
    if (this._keys.accel) {
      this.speed += C.PLAYER_ACCEL * cfg.accelMult * mult;
    } else if (this._keys.brake) {
      this.speed -= C.PLAYER_BRAKE * mult;
    } else {
      this.speed -= C.PLAYER_DECEL * mult;
    }
    this.speed = Math.max(0, Math.min(maxSpeed, this.speed));

    // --- Steering ---
    this.steerInput = 0;
    if (this._keys.left)  this.steerInput = -1;
    if (this._keys.right) this.steerInput =  1;

    const steerAmount = C.PLAYER_STEER_SPEED * cfg.gripMult * mult;
    this.x += this.steerInput * steerAmount * (this.speed / maxSpeed + 0.3);

    // --- Centrifugal drift from road curve ---
    if (currentSegment) {
      const speedPct = this.speed / maxSpeed;
      this.x -= currentSegment.curve * speedPct * C.CENTRIFUGAL_FORCE * mult;
    }

    // --- Off-road penalty ---
    const offRoad = Math.abs(this.x) > 1.0;
    if (offRoad) {
      this.speed *= Math.pow(C.OFFROAD_DECEL, mult);
    }

    // Clamp lateral position
    this.x = Math.max(-2.0, Math.min(2.0, this.x));

    // --- Advance Z position ---
    this.z += this.speed * dt;

    // Wrap Z around track length
    const trackLength = CONSTANTS.ROAD_SEGMENTS * CONSTANTS.ROAD_SEGMENT_LENGTH;
    if (this.z >= trackLength) this.z -= trackLength;
    if (this.z < 0) this.z += trackLength;

    // --- Traffic collision ---
    let collided = false;
    if (this._collisionTimer <= 0 && traffic) {
      const playerSegIdx = Math.floor(this.z / CONSTANTS.ROAD_SEGMENT_LENGTH) % CONSTANTS.ROAD_SEGMENTS;
      for (const car of traffic) {
        const carSegIdx = Math.floor(car.segmentIndex) % CONSTANTS.ROAD_SEGMENTS;
        const segDiff = Math.abs(playerSegIdx - carSegIdx);
        if (segDiff <= 2 || segDiff >= CONSTANTS.ROAD_SEGMENTS - 2) {
          if (Math.abs(this.x - car.x) < C.COLLISION_RADIUS_X) {
            // Collision!
            this.speed *= C.COLLISION_SPEED_PENALTY;
            this.isColliding = true;
            this._collisionTimer = 1.5;  // invincibility seconds
            collided = true;
            break;
          }
        }
      }
    }

    return { collided };
  }

  /**
   * Draw the player car at the bottom-center of the canvas.
   */
  draw() {
    const ctx = this.ctx;
    const W = CONSTANTS.CANVAS_WIDTH;
    const H = CONSTANTS.CANVAS_HEIGHT;

    // Choose sprite based on steer direction
    let sprite;
    if (this.steerInput < 0) sprite = this._sprites.left;
    else if (this.steerInput > 0) sprite = this._sprites.right;
    else sprite = this._sprites.straight;

    if (!sprite) return;

    const sw = sprite.width;
    const sh = sprite.height;

    // Collision flash
    ctx.save();
    if (this.isColliding && Math.floor(this._collisionTimer * 10) % 2 === 0) {
      ctx.globalAlpha = 0.5;
    }

    // Center bottom of screen
    const drawX = W / 2 - sw / 2;
    const drawY = H - sh - 20;
    ctx.drawImage(sprite, drawX, drawY);

    ctx.restore();
  }

  /**
   * Get current speed as a 0–1 fraction of max speed.
   * @returns {number}
   */
  getSpeedPercent() {
    const maxSpeed = CONSTANTS.PLAYER_MAX_SPEED * (this.carConfig ? this.carConfig.topSpeedMult : 1);
    return this.speed / maxSpeed;
  }

  /**
   * Get the camera X offset driven by player X (for road renderer).
   * @returns {number}
   */
  getCameraX() {
    return this.x * 500;
  }

  /**
   * Destroy: remove event listeners.
   */
  destroy() {
    document.removeEventListener('keydown', this._onKeyDown);
    document.removeEventListener('keyup', this._onKeyUp);
  }

  // ---- Private ----

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
   * Pre-render car sprites to offscreen canvases.
   * @param {object} cfg - Car config
   */
  _buildSprites(cfg) {
    const W = 100;
    const H = 70;

    this._sprites.straight = this._drawCarSprite(cfg, W, H, 0);
    this._sprites.left     = this._drawCarSprite(cfg, W, H, -1);
    this._sprites.right    = this._drawCarSprite(cfg, W, H, 1);
  }

  /**
   * Draw a car sprite to an offscreen canvas.
   * @param {object} cfg
   * @param {number} W
   * @param {number} H
   * @param {number} lean - -1 left, 0 straight, 1 right
   * @returns {HTMLCanvasElement}
   */
  _drawCarSprite(cfg, W, H, lean) {
    const oc = document.createElement('canvas');
    oc.width = W;
    oc.height = H;
    const ctx = oc.getContext('2d');

    const leanPx = lean * 6;

    // Shadow
    ctx.save();
    ctx.fillStyle = 'rgba(0,0,0,0.3)';
    ctx.beginPath();
    ctx.ellipse(W / 2 + leanPx, H - 4, W * 0.36, 6, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();

    // Car body (main rectangle)
    ctx.save();
    ctx.translate(W / 2 + leanPx, H / 2);
    ctx.fillStyle = cfg.bodyColor;
    ctx.fillRect(-38, -10, 76, 28);

    // Windshield / cabin
    ctx.fillStyle = cfg.color;
    ctx.beginPath();
    ctx.moveTo(-22, -10);
    ctx.lineTo(-18, -28);
    ctx.lineTo(18, -28);
    ctx.lineTo(22, -10);
    ctx.closePath();
    ctx.fill();

    // Windshield glass
    ctx.fillStyle = 'rgba(150, 220, 255, 0.75)';
    ctx.beginPath();
    ctx.moveTo(-16, -12);
    ctx.lineTo(-13, -26);
    ctx.lineTo(13, -26);
    ctx.lineTo(16, -12);
    ctx.closePath();
    ctx.fill();

    // Wheels
    ctx.fillStyle = '#111';
    const wW = 14, wH = 10;
    ctx.fillRect(-42, -8, wW, wH);   // front-left
    ctx.fillRect(28, -8, wW, wH);    // front-right
    ctx.fillRect(-42, 10, wW, wH);   // rear-left
    ctx.fillRect(28, 10, wW, wH);    // rear-right

    // Wheel highlight
    ctx.fillStyle = '#444';
    ctx.fillRect(-40, -7, 10, 8);
    ctx.fillRect(30, -7, 10, 8);
    ctx.fillRect(-40, 11, 10, 8);
    ctx.fillRect(30, 11, 10, 8);

    // Headlights
    ctx.fillStyle = '#ffffaa';
    ctx.fillRect(-30, -18, 10, 6);
    ctx.fillRect(20, -18, 10, 6);

    // Tail lights
    ctx.fillStyle = '#ff3333';
    ctx.fillRect(-30, 16, 10, 5);
    ctx.fillRect(20, 16, 10, 5);

    ctx.restore();

    return oc;
  }
}
