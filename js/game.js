/**
 * game.js
 * Game — state machine and core orchestration.
 * Owns all subsystems: Road, Player, UI, AudioManager.
 */
class Game {
  /** @param {HTMLCanvasElement} canvas */
  constructor(canvas) {
    this.canvas = canvas;
    this.ctx    = canvas.getContext('2d');

    // Subsystems
    this.road   = new Road(canvas);
    this.player = new Player(canvas);
    this.ui     = new UI(canvas);
    this.audio  = new AudioManager();

    // Game state
    this.gs = {
      state:       CONSTANTS.STATE_MAIN_MENU,
      lives:       CONSTANTS.TOTAL_LIVES,
      level:       1,
      score:       0,
      timeLeft:    0,
      timeLimit:   60,
      selectedCar: 0,
      particles:   [],
      fireworkTimer: 0,
      nextFirework:  0,
      // Checkpoint state
      checkpointsPassed: 0,
      levelCheckpoints: [],
      // Screen shake
      shakeX: 0,
      shakeY: 0,
      shakeIntensity: 0,
    };

    // Pre-allocate particle pool
    for (let i = 0; i < CONSTANTS.PARTICLE_COUNT; i++) {
      this.gs.particles.push({ active: false, x: 0, y: 0, vx: 0, vy: 0, life: 0, color: '#fff', size: 2 });
    }

    // Debug overlay
    this.debugOverlay = new DebugOverlay();
    window.RR = this;

    this._onKeyDown = this._onKeyDown.bind(this);
    document.addEventListener('keydown', this._onKeyDown);

    this._bindTouchButtons();
  }

  /** @param {number} dt */
  update(dt) {
    this.ui.tick();
    this.ui.updateCheckpoint(dt);

    const gs = this.gs;

    switch (gs.state) {
      case CONSTANTS.STATE_MAIN_MENU:
      case CONSTANTS.STATE_CAR_SELECT:
      case CONSTANTS.STATE_GAME_OVER:
      case CONSTANTS.STATE_WIN_SCREEN:
        this._updateWinParticles(dt);
        break;
      case CONSTANTS.STATE_PAUSED:
        break;
      case CONSTANTS.STATE_GAMEPLAY:
        this._updateGameplay(dt);
        break;
      case CONSTANTS.STATE_LEVEL_COMPLETE:
        this._updateLevelComplete(dt);
        break;
    }
  }

  render() {
    const gs = this.gs;

    switch (gs.state) {
      case CONSTANTS.STATE_MAIN_MENU:
        this.ui.drawMainMenu();
        break;
      case CONSTANTS.STATE_CAR_SELECT:
        this.ui.drawCarSelect(gs.selectedCar);
        break;
      case CONSTANTS.STATE_GAMEPLAY:
        this._renderGameplay();
        break;
      case CONSTANTS.STATE_PAUSED:
        this._renderGameplay();
        this.ui.drawPauseOverlay();
        break;
      case CONSTANTS.STATE_LEVEL_COMPLETE:
        this._renderGameplay();
        this.ui.drawLevelComplete({ level: gs.level, score: gs.score });
        break;
      case CONSTANTS.STATE_GAME_OVER:
        this.ui.drawGameOver({ score: gs.score, level: gs.level });
        break;
      case CONSTANTS.STATE_WIN_SCREEN:
        this.ui.drawWinScreen({
          score: gs.score,
          carName: CONSTANTS.CAR_CONFIGS[gs.selectedCar].name,
          particles: gs.particles,
        });
        break;
    }
  }

  // ─────────────────────────────────────────────
  // State transitions
  // ─────────────────────────────────────────────

  _setState(newState) {
    const gs = this.gs;
    const prev = gs.state;
    gs.state = newState;

    if (prev === CONSTANTS.STATE_GAMEPLAY) {
      this.audio.stopEngine();
    }

    switch (newState) {
      case CONSTANTS.STATE_MAIN_MENU:
        gs.lives = CONSTANTS.TOTAL_LIVES;
        gs.level = 1;
        gs.score = 0;
        gs.selectedCar = 0;
        break;
      case CONSTANTS.STATE_GAMEPLAY:
        this._startLevel();
        break;
      case CONSTANTS.STATE_WIN_SCREEN:
        this._initParticles();
        this.audio.playCelebrationFanfare();
        break;
      case CONSTANTS.STATE_GAME_OVER:
        this.audio.playGameOver();
        break;
    }
  }

  // ─────────────────────────────────────────────
  // Gameplay
  // ─────────────────────────────────────────────

  _startLevel() {
    const gs = this.gs;
    const cfg = getLevel(gs.level);

    gs.timeLeft  = cfg.timeLimit;
    gs.timeLimit = cfg.timeLimit;
    gs.checkpointsPassed = 0;
    gs.levelCheckpoints = cfg.checkpoints || [];
    gs.shakeX = 0;
    gs.shakeY = 0;
    gs.shakeIntensity = 0;

    this.road.buildTrack(cfg);
    this.road.spawnTraffic(cfg);

    const carCfg = CONSTANTS.CAR_CONFIGS[gs.selectedCar];
    this.player.setCarConfig(carCfg);
    this.player.reset();

    this.audio.startEngine(0);
  }

  /** @param {number} dt */
  _updateGameplay(dt) {
    const gs = this.gs;

    // Timer
    gs.timeLeft -= dt;

    // Score
    gs.score += CONSTANTS.SCORE_PER_SECOND * dt * (gs.level * 0.5 + 0.5);

    // Traffic
    this.road.updateTraffic(dt);

    // Current segment
    const segIdx = Math.floor(this.player.z / CONSTANTS.ROAD_SEGMENT_LENGTH) % CONSTANTS.ROAD_SEGMENTS;
    const currentSegment = this.road.segments[segIdx];

    // Player update
    const { collided } = this.player.update(dt, currentSegment, this.road.traffic);

    if (collided) {
      this.audio.playCrash();
      this.audio.playCrashScreech();
      gs.lives--;
      if (gs.lives <= 0) {
        this._setState(CONSTANTS.STATE_GAME_OVER);
        return;
      }
    }

    // Engine audio
    this.audio.updateEngine(this.player.getSpeedPercent());

    // ── Screen shake at high speed ──
    const speedPct = this.player.getSpeedPercent();
    if (speedPct > 0.8 && !this.player.isCrashing()) {
      gs.shakeIntensity = (speedPct - 0.8) * 10; // 0 to 2
      gs.shakeX = (Math.random() - 0.5) * gs.shakeIntensity;
      gs.shakeY = (Math.random() - 0.5) * gs.shakeIntensity * 0.5;
    } else {
      gs.shakeX = 0;
      gs.shakeY = 0;
    }

    // ── Checkpoint detection ──
    const playerSegIdx = Math.floor(this.player.z / CONSTANTS.ROAD_SEGMENT_LENGTH) % CONSTANTS.ROAD_SEGMENTS;
    if (gs.checkpointsPassed < gs.levelCheckpoints.length) {
      const nextCP = gs.levelCheckpoints[gs.checkpointsPassed];
      if (playerSegIdx >= nextCP.segment && playerSegIdx < nextCP.segment + 10) {
        gs.checkpointsPassed++;
        gs.timeLeft += nextCP.timeBonus;
        this.ui.showCheckpoint(nextCP.timeBonus);
        this.audio.playCheckpointBeep();
      }
    }

    // ── Finish line ──
    if (playerSegIdx >= CONSTANTS.FINISH_SEGMENT_INDEX) {
      this._onLevelComplete();
      return;
    }

    // ── Time expired ──
    if (gs.timeLeft <= 0) {
      gs.lives--;
      if (gs.lives <= 0) {
        this._setState(CONSTANTS.STATE_GAME_OVER);
      } else {
        this.audio.stopEngine();
        this._startLevel();
      }
    }
  }

  _onLevelComplete() {
    const gs = this.gs;
    gs.score += CONSTANTS.SCORE_PER_LEVEL_COMPLETE;
    this.audio.stopEngine();
    this.audio.playLevelComplete();
    this._setState(CONSTANTS.STATE_LEVEL_COMPLETE);
  }

  _updateLevelComplete(dt) {
    // Waiting for input
  }

  _renderGameplay() {
    const gs = this.gs;
    const carCfg = CONSTANTS.CAR_CONFIGS[gs.selectedCar];
    const maxSpeed = CONSTANTS.PLAYER_MAX_SPEED * carCfg.topSpeedMult;

    // Road (with screen shake)
    this.road.render(
      this.player.z,
      this.player.x,
      this.player.speed,
      0,
      gs.shakeX,
      gs.shakeY
    );

    // Player car
    this.player.draw();

    // HUD
    this.ui.drawHUD({
      speed:       this.player.speed,
      maxSpeed:    maxSpeed,
      timeLeft:    gs.timeLeft,
      timeLimit:   gs.timeLimit,
      lives:       gs.lives,
      level:       gs.level,
      score:       gs.score,
      totalLevels: CONSTANTS.TOTAL_LEVELS,
    });

    // Debug overlay
    this.debugOverlay.draw(this.road._proj, gs, this.player);
  }

  // ─────────────────────────────────────────────
  // Win screen particles
  // ─────────────────────────────────────────────

  _initParticles() {
    for (const p of this.gs.particles) p.active = false;
    this.gs.nextFirework = 0;
    this.gs.fireworkTimer = 0;
  }

  /** @param {number} dt */
  _updateWinParticles(dt) {
    const gs = this.gs;
    const W = CONSTANTS.CANVAS_WIDTH;
    const H = CONSTANTS.CANVAS_HEIGHT;

    gs.fireworkTimer += dt;
    if (gs.fireworkTimer >= gs.nextFirework) {
      gs.fireworkTimer = 0;
      gs.nextFirework = 0.3 + Math.random() * 0.5;
      this._spawnFirework(
        W * (0.2 + Math.random() * 0.6),
        H * (0.1 + Math.random() * 0.5)
      );
    }

    for (const p of gs.particles) {
      if (!p.active) continue;
      p.x  += p.vx * dt * 60;
      p.y  += p.vy * dt * 60;
      p.vy += 0.05;
      p.life -= dt * 1.2;
      p.size *= 0.97;
      if (p.life <= 0 || p.size < 0.5) p.active = false;
    }
  }

  _spawnFirework(x, y) {
    const colors = ['#ff4444','#ffff00','#44ff44','#44aaff','#ff44ff','#ffffff','#ff8800'];
    const color = colors[Math.floor(Math.random() * colors.length)];
    const count = 20 + Math.floor(Math.random() * 15);
    let spawned = 0;

    for (const p of this.gs.particles) {
      if (p.active) continue;
      if (spawned >= count) break;
      const angle = (spawned / count) * Math.PI * 2 + Math.random() * 0.3;
      const speed = 1.5 + Math.random() * 3;
      p.active = true;
      p.x = x;
      p.y = y;
      p.vx = Math.cos(angle) * speed;
      p.vy = Math.sin(angle) * speed - 2;
      p.life = 0.6 + Math.random() * 0.6;
      p.color = color;
      p.size = 2 + Math.random() * 3;
      spawned++;
    }
  }

  // ─────────────────────────────────────────────
  // Input
  // ─────────────────────────────────────────────

  /** @param {KeyboardEvent} e */
  _onKeyDown(e) {
    const gs = this.gs;
    this.audio.init();

    switch (gs.state) {
      case CONSTANTS.STATE_MAIN_MENU:
        if (e.code === 'Enter' || e.code === 'Space') {
          this._setState(CONSTANTS.STATE_CAR_SELECT);
        }
        break;

      case CONSTANTS.STATE_CAR_SELECT:
        if (e.code === 'ArrowLeft') {
          gs.selectedCar = (gs.selectedCar - 1 + CONSTANTS.CAR_CONFIGS.length) % CONSTANTS.CAR_CONFIGS.length;
        }
        if (e.code === 'ArrowRight') {
          gs.selectedCar = (gs.selectedCar + 1) % CONSTANTS.CAR_CONFIGS.length;
        }
        if (e.code === 'Enter' || e.code === 'Space') {
          this._setState(CONSTANTS.STATE_GAMEPLAY);
        }
        if (e.code === 'Escape') {
          this._setState(CONSTANTS.STATE_MAIN_MENU);
        }
        break;

      case CONSTANTS.STATE_GAMEPLAY:
        if (e.code === 'KeyP' || e.code === 'Escape') {
          this._setState(CONSTANTS.STATE_PAUSED);
        }
        if (e.code === 'KeyD') {
          this.debugOverlay.toggle();
        }
        break;

      case CONSTANTS.STATE_PAUSED:
        if (e.code === 'KeyP' || e.code === 'Escape') {
          this.gs.state = CONSTANTS.STATE_GAMEPLAY;
          this.audio.startEngine(this.player.getSpeedPercent());
        }
        break;

      case CONSTANTS.STATE_LEVEL_COMPLETE:
        if (e.code === 'Enter' || e.code === 'Space') {
          if (gs.level >= CONSTANTS.TOTAL_LEVELS) {
            this._setState(CONSTANTS.STATE_WIN_SCREEN);
          } else {
            gs.level++;
            this._setState(CONSTANTS.STATE_GAMEPLAY);
          }
        }
        break;

      case CONSTANTS.STATE_GAME_OVER:
        if (e.code === 'Enter' || e.code === 'Space') {
          this._setState(CONSTANTS.STATE_MAIN_MENU);
        }
        break;

      case CONSTANTS.STATE_WIN_SCREEN:
        if (e.code === 'Enter' || e.code === 'Space') {
          this._setState(CONSTANTS.STATE_MAIN_MENU);
        }
        break;
    }
  }

  _bindTouchButtons() {
    const btnLeft  = document.getElementById('btn-left');
    const btnRight = document.getElementById('btn-right');
    const btnAccel = document.getElementById('btn-accel');
    const btnBrake = document.getElementById('btn-brake');

    if (!btnLeft) return;

    btnAccel.addEventListener('pointerdown', () => {
      this.audio.init();
      const gs = this.gs;
      if (gs.state === CONSTANTS.STATE_MAIN_MENU) this._setState(CONSTANTS.STATE_CAR_SELECT);
      else if (gs.state === CONSTANTS.STATE_CAR_SELECT) this._setState(CONSTANTS.STATE_GAMEPLAY);
      else if (gs.state === CONSTANTS.STATE_LEVEL_COMPLETE) {
        if (gs.level >= CONSTANTS.TOTAL_LEVELS) this._setState(CONSTANTS.STATE_WIN_SCREEN);
        else { gs.level++; this._setState(CONSTANTS.STATE_GAMEPLAY); }
      }
      else if (gs.state === CONSTANTS.STATE_GAME_OVER) this._setState(CONSTANTS.STATE_MAIN_MENU);
      else if (gs.state === CONSTANTS.STATE_WIN_SCREEN) this._setState(CONSTANTS.STATE_MAIN_MENU);
    });

    btnLeft.addEventListener('pointerdown', () => {
      if (this.gs.state === CONSTANTS.STATE_CAR_SELECT) {
        this.gs.selectedCar = (this.gs.selectedCar - 1 + CONSTANTS.CAR_CONFIGS.length) % CONSTANTS.CAR_CONFIGS.length;
      }
    });
    btnRight.addEventListener('pointerdown', () => {
      if (this.gs.state === CONSTANTS.STATE_CAR_SELECT) {
        this.gs.selectedCar = (this.gs.selectedCar + 1) % CONSTANTS.CAR_CONFIGS.length;
      }
    });

    this.player.bindTouchControls(btnLeft, btnRight, btnAccel, btnBrake);
  }
}
