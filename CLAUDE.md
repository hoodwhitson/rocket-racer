# Rad Racer Clone — Project Intelligence

## Project Overview
A retro-style pseudo-3D racing game inspired by Rad Racer (NES, 1987).
Built with vanilla JavaScript and HTML5 Canvas. Runs entirely in the browser
with zero dependencies and zero build steps.

## Tech Stack
- Language: Vanilla JavaScript (ES6+)
- Rendering: HTML5 Canvas API
- Audio: Web Audio API (procedurally generated — no audio files needed)
- Fonts: Google Fonts (Press Start 2P — retro pixel font via CDN)
- Build Tool: None — single HTML file or flat file structure
- Deployment: Any static host (GitHub Pages, Netlify, Vercel, etc.)

## Project Structure
```
rad_racer/
├── index.html            # Entry point — loads all scripts
├── CLAUDE.md             # This file
├── css/
│   └── style.css         # Minimal styles (canvas centering, bg color)
├── js/
│   ├── main.js           # Entry point, game loop (requestAnimationFrame)
│   ├── game.js           # State machine and core orchestration
│   ├── player.js         # Player car logic and input handling
│   ├── road.js           # Pseudo-3D road renderer
│   ├── level.js          # Level configs and progression
│   ├── ui.js             # HUD, menus, overlays drawn to canvas
│   ├── audio.js          # Web Audio API sound generation
│   └── constants.js      # All magic numbers — never hardcode inline
```

## Code Style
- ES6+ with const/let — no var
- JSDoc comments on all functions
- All game config values in constants.js
- No external JS libraries or npm dependencies
- Canvas rendering only — no DOM manipulation for game elements
- State machine pattern — never use global mutable state directly
- Use requestAnimationFrame for the game loop with delta-time for
  frame-rate-independent movement

## Key Game Rules
- 3 lives total shared across all levels
- 10 levels with increasing difficulty
- 4 selectable cars with different stats
- Win celebration screen after level 10
- Time limit per level — expire = lose a life

## Core Requirements

### Game Structure
- Implement a state machine with these states: MAIN_MENU, CAR_SELECT,
  GAMEPLAY, PAUSED, LEVEL_COMPLETE, GAME_OVER, WIN_SCREEN
- 10 progressively harder levels (faster traffic, tighter time limits,
  sharper curves)
- 3 lives shared across the entire run
- GAME_OVER screen shows score and prompts restart

### Car Selection Screen
- 4 cars to choose from, each with distinct colors and stat profiles:
  - Car 1 "Speedster":  Speed ★★★★★, Handling ★★★, Acceleration ★★★
  - Car 2 "Grip King":  Speed ★★★, Handling ★★★★★, Acceleration ★★★
  - Car 3 "Muscle":     Speed ★★★★, Handling ★★, Acceleration ★★★★★
  - Car 4 "Balanced":   Speed ★★★★, Handling ★★★★, Acceleration ★★★★
- Arrow keys to cycle cars, Enter to confirm
- Show animated preview of selected car with its stat panel

### Road Renderer (Pseudo-3D)
- Implement a segment-based pseudo-3D road renderer on Canvas
- Draw road line-by-line with perspective scaling (like Out Run / Rad Racer)
- Alternating colored road segments for the classic stripe effect
- Road curves using per-segment curve values that offset the camera
- Uphill/downhill using per-segment Y-position modifiers
- Roadside scenery objects (trees, signs, billboards) that scale with
  perspective and are drawn back-to-front

### Gameplay
- Keyboard controls:
    Arrow Left / Right — steer
    Arrow Up / Z       — accelerate
    Arrow Down / X     — brake
    P                  — pause
- AI traffic cars as obstacles — collision costs a life and resets speed
- Reach the finish line before the timer hits zero to advance
- Each level has a unique background color palette (city, desert,
  mountains, night, tropical, etc.)
- HUD displays: speedometer, timer, current level, lives remaining

### Win / Celebration Screen
- After completing level 10, render a full celebration screen on canvas:
  - Procedural animated fireworks (Canvas arcs + particle system)
  - Scrolling "CONGRATULATIONS!" banner using Press Start 2P font
  - Final score, total elapsed time, chosen car name
  - Prompt to return to main menu

### Audio (Web Audio API — no files needed)
- Procedurally generate all sounds using Web Audio API oscillators:
  - Engine hum that pitches up with speed
  - Crash/collision impact sound
  - Level complete jingle
  - Countdown beep
  - Celebration fanfare on win

### Responsive Canvas
- Canvas should be 800x600 logical resolution
- Scale the canvas to fit the browser window while maintaining aspect ratio
  using CSS (width: 100%, height: auto on the canvas element)
- Handle both keyboard and touch input:
  - On-screen touch buttons for mobile (Left, Right, Accel, Brake)
  - Touch buttons drawn on canvas or as simple HTML overlays

## Performance Notes
- Target 60fps using requestAnimationFrame with delta-time
- Road segment count should be tunable in constants.js
- Avoid memory allocation in the game loop — pre-allocate segment arrays

## Deployment
- Must work by simply opening index.html in a browser (file:// protocol)
- Must also work deployed to any static hosting service
- No server-side code, no backend, no build pipeline required

### Deployment Instructions
After building, provide:
1. Exact folder structure of all created files
2. How to run locally: "Open index.html in any modern browser"
3. How to deploy to GitHub Pages, Netlify, or Vercel (drag and drop the
   folder — it's all static files)
4. Full keyboard control reference

## Do Not
- Do not use any npm packages or external JS libraries
- Do not use frameworks (React, Vue, etc.)
- Do not use localStorage without a clear comment explaining why
- Do not manipulate DOM elements for gameplay — use Canvas only
- Do not use global variables — encapsulate in classes or modules
