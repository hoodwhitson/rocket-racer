/**
 * main.js
 * Entry point — requestAnimationFrame game loop, gated behind document.fonts.ready.
 */

/** @type {Game} */
let game;

/** @type {number} Timestamp of previous frame */
let lastTime = 0;

/**
 * Main game loop. Capped dt prevents physics explosion on tab-resume.
 * @param {number} timestamp - DOMHighResTimeStamp from rAF
 */
function loop(timestamp) {
  const dt = Math.min((timestamp - lastTime) / 1000, 0.05);
  lastTime = timestamp;

  game.update(dt);
  game.render();

  requestAnimationFrame(loop);
}

/**
 * Bootstrap: wait for fonts, then start the loop.
 */
document.fonts.ready.then(() => {
  const canvas = document.getElementById('gameCanvas');
  game = new Game(canvas);

  requestAnimationFrame((timestamp) => {
    lastTime = timestamp;
    requestAnimationFrame(loop);
  });
});
