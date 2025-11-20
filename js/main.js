const canvas = document.getElementById("game");
const ctx = canvas.getContext("2d");

const SPRITE_PATH = "assets/chloe-sprite-3.png";
const BACKGROUND_PATH = "assets/tank.png";
const MUSIC_PATH = "assets/CosmicSolitude.mp3";
const SPRITE_COLUMNS = 5;
const SPRITE_SHEET_ROWS = 2;
const CANVAS_WIDTH = 896;
const CANVAS_HEIGHT = 504;
const TANK_SCALE = 0.78;
const TANK_OFFSET_Y = 24;
const ROW_RIGHT = 0;
const ROW_LEFT = 1;
const WALK_FPS = 10;
const MOVE_SPEED = 140;
const WALKWAY_HEIGHT = 120;
const WALKWAY_TOP = CANVAS_HEIGHT - WALKWAY_HEIGHT;
const GROUND_OFFSET = 8;
const WALKWAY_EDGE_HEIGHT = 20;
const LIGHT_RAY_COUNT = 8;
const PARTICLE_COUNT = 25;

const background = new Image();
background.src = BACKGROUND_PATH;

const sprite = new Image();
sprite.src = SPRITE_PATH;

canvas.width = CANVAS_WIDTH;
canvas.height = CANVAS_HEIGHT;

const frameSize = {
  width: 0,
  height: 0
};

const actor = {
  x: canvas.width * 0.5,
  y: canvas.height * 0.5,
  vx: 0,
  facing: 1,
  currentFrame: 0,
  isMoving: false,
  frameTimer: 0
};

const input = {
  left: false,
  right: false
};

let lastTimestamp = 0;
let isReady = false;
let backgroundLoaded = false;
let spriteLoaded = false;
let musicStarted = false;
let animationTime = 0;

const particles = [];
const lightRays = [];

for (let i = 0; i < PARTICLE_COUNT; i++) {
  particles.push({
    x: Math.random() * CANVAS_WIDTH,
    y: Math.random() * WALKWAY_TOP,
    size: 1 + Math.random() * 2,
    speed: 0.3 + Math.random() * 0.5,
    opacity: 0.2 + Math.random() * 0.3,
    phase: Math.random() * Math.PI * 2
  });
}

for (let i = 0; i < LIGHT_RAY_COUNT; i++) {
  lightRays.push({
    x: (i / LIGHT_RAY_COUNT) * CANVAS_WIDTH,
    width: 40 + Math.random() * 60,
    opacity: 0.08 + Math.random() * 0.12,
    speed: 0.5 + Math.random() * 0.8,
    phase: Math.random() * Math.PI * 2
  });
}

const music = new Audio(MUSIC_PATH);
music.loop = true;
music.volume = 0.6;

sprite.addEventListener("load", () => {
  frameSize.width = sprite.width / SPRITE_COLUMNS;
  frameSize.height = sprite.height / SPRITE_SHEET_ROWS;
  spriteLoaded = true;
  tryStartGame();
});

background.addEventListener("load", () => {
  backgroundLoaded = true;
  tryStartGame();
});

window.addEventListener("keydown", (event) => {
  if (event.key === "ArrowLeft") {
    input.left = true;
    event.preventDefault();
    startMusic();
  } else if (event.key === "ArrowRight") {
    input.right = true;
    event.preventDefault();
    startMusic();
  }
});

window.addEventListener("keyup", (event) => {
  if (event.key === "ArrowLeft") {
    input.left = false;
    event.preventDefault();
  } else if (event.key === "ArrowRight") {
    input.right = false;
    event.preventDefault();
  }
});

window.addEventListener("pointerdown", () => {
  startMusic();
});

function loop(timestamp) {
  if (!isReady) {
    return;
  }

  const delta = (timestamp - lastTimestamp) / 1000 || 0;
  lastTimestamp = timestamp;
  animationTime += delta;

  update(delta);
  draw();

  requestAnimationFrame(loop);
}

function update(delta) {
  actor.vx = 0;
  actor.isMoving = false;

  if (input.left) {
    actor.vx -= MOVE_SPEED;
    actor.facing = -1;
  }

  if (input.right) {
    actor.vx += MOVE_SPEED;
    actor.facing = 1;
  }

  if (actor.vx !== 0) {
    actor.isMoving = true;
  }

  actor.x += actor.vx * delta;
  actor.x = clamp(actor.x, 0, canvas.width - frameSize.width);

  if (actor.isMoving) {
    actor.frameTimer += delta;
    const frameDuration = 1 / WALK_FPS;
    if (actor.frameTimer >= frameDuration) {
      actor.frameTimer -= frameDuration;
      actor.currentFrame = (actor.currentFrame + 1) % SPRITE_COLUMNS;
    }
  } else {
    actor.currentFrame = 0;
    actor.frameTimer = 0;
  }
}

function draw() {
  if (!isReady) {
    return;
  }

  ctx.clearRect(0, 0, canvas.width, canvas.height);

  drawBackdrop();
  drawLightRays();
  drawParticles();
  drawTank();
  drawWalkway();
  drawCharacter();
}

function drawBackdrop() {
  const gradient = ctx.createLinearGradient(0, 0, 0, WALKWAY_TOP);
  gradient.addColorStop(0, "#0a1628");
  gradient.addColorStop(0.3, "#0d1b2e");
  gradient.addColorStop(0.6, "#0f1e33");
  gradient.addColorStop(1, "#0a1525");
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, canvas.width, WALKWAY_TOP);

  const ambientGradient = ctx.createRadialGradient(
    canvas.width * 0.5,
    WALKWAY_TOP * 0.3,
    0,
    canvas.width * 0.5,
    WALKWAY_TOP * 0.3,
    WALKWAY_TOP * 0.8
  );
  ambientGradient.addColorStop(0, "rgba(255, 220, 150, 0.15)");
  ambientGradient.addColorStop(0.5, "rgba(200, 220, 255, 0.08)");
  ambientGradient.addColorStop(1, "transparent");
  ctx.fillStyle = ambientGradient;
  ctx.fillRect(0, 0, canvas.width, WALKWAY_TOP);
}

function drawLightRays() {
  ctx.save();
  for (const ray of lightRays) {
    const y = WALKWAY_TOP * 0.15 + Math.sin(animationTime * ray.speed + ray.phase) * 10;
    const gradient = ctx.createLinearGradient(ray.x - ray.width * 0.5, 0, ray.x + ray.width * 0.5, 0);
    gradient.addColorStop(0, "transparent");
    gradient.addColorStop(0.5, `rgba(255, 240, 200, ${ray.opacity})`);
    gradient.addColorStop(1, "transparent");
    ctx.fillStyle = gradient;
    ctx.fillRect(ray.x - ray.width * 0.5, 0, ray.width, WALKWAY_TOP);
  }
  ctx.restore();
}

function drawParticles() {
  ctx.save();
  for (const particle of particles) {
    particle.y += particle.speed;
    if (particle.y > WALKWAY_TOP) {
      particle.y = -particle.size;
      particle.x = Math.random() * canvas.width;
    }
    const opacity = particle.opacity * (0.5 + 0.5 * Math.sin(animationTime * 2 + particle.phase));
    ctx.fillStyle = `rgba(200, 220, 255, ${opacity})`;
    ctx.beginPath();
    ctx.arc(particle.x, particle.y, particle.size, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
}

function drawTank() {
  const tankWidth = background.width * TANK_SCALE;
  const tankHeight = background.height * TANK_SCALE;
  const tankX = Math.round((canvas.width - tankWidth) * 0.5);
  const tankY = TANK_OFFSET_Y;

  ctx.save();
  ctx.shadowColor = "rgba(100, 180, 255, 0.4)";
  ctx.shadowBlur = 30;
  ctx.shadowOffsetX = 0;
  ctx.shadowOffsetY = 0;
  ctx.drawImage(background, tankX, tankY, tankWidth, tankHeight);
  ctx.restore();

  const glassGradient = ctx.createLinearGradient(tankX, tankY, tankX, tankY + tankHeight);
  glassGradient.addColorStop(0, "rgba(180, 220, 255, 0.12)");
  glassGradient.addColorStop(0.3, "rgba(150, 200, 255, 0.08)");
  glassGradient.addColorStop(0.7, "rgba(120, 180, 255, 0.1)");
  glassGradient.addColorStop(1, "rgba(100, 160, 255, 0.15)");
  ctx.fillStyle = glassGradient;
  ctx.fillRect(tankX, tankY, tankWidth, tankHeight);

  const reflectionGradient = ctx.createLinearGradient(tankX, tankY, tankX, tankY + tankHeight * 0.4);
  reflectionGradient.addColorStop(0, "rgba(255, 255, 255, 0.25)");
  reflectionGradient.addColorStop(1, "transparent");
  ctx.fillStyle = reflectionGradient;
  ctx.fillRect(tankX, tankY, tankWidth, tankHeight * 0.4);

  const causticsGradient = ctx.createRadialGradient(
    tankX + tankWidth * 0.3,
    tankY + tankHeight * 0.5,
    0,
    tankX + tankWidth * 0.3,
    tankY + tankHeight * 0.5,
    tankHeight * 0.6
  );
  causticsGradient.addColorStop(0, "rgba(255, 255, 255, 0.15)");
  causticsGradient.addColorStop(0.5, "rgba(200, 240, 255, 0.1)");
  causticsGradient.addColorStop(1, "transparent");
  ctx.fillStyle = causticsGradient;
  ctx.fillRect(tankX, tankY, tankWidth, tankHeight);

  const edgeHighlight = ctx.createLinearGradient(tankX, tankY, tankX + 4, tankY);
  edgeHighlight.addColorStop(0, "rgba(255, 255, 255, 0.3)");
  edgeHighlight.addColorStop(1, "transparent");
  ctx.fillStyle = edgeHighlight;
  ctx.fillRect(tankX, tankY, 4, tankHeight);
}

function drawWalkway() {
  const walkwayMainY = WALKWAY_TOP + WALKWAY_EDGE_HEIGHT;
  const walkwayMainHeight = WALKWAY_HEIGHT - WALKWAY_EDGE_HEIGHT;

  const edgeGradient = ctx.createLinearGradient(0, WALKWAY_TOP, 0, walkwayMainY);
  edgeGradient.addColorStop(0, "rgba(25, 35, 50, 0.95)");
  edgeGradient.addColorStop(0.5, "rgba(20, 30, 45, 0.98)");
  edgeGradient.addColorStop(1, "rgba(18, 28, 42, 1)");
  ctx.fillStyle = edgeGradient;
  ctx.fillRect(0, WALKWAY_TOP, canvas.width, WALKWAY_EDGE_HEIGHT);

  const walkwayGradient = ctx.createLinearGradient(0, walkwayMainY, 0, canvas.height);
  walkwayGradient.addColorStop(0, "#1a2332");
  walkwayGradient.addColorStop(0.2, "#151d2a");
  walkwayGradient.addColorStop(0.5, "#0f1620");
  walkwayGradient.addColorStop(0.8, "#0a0f18");
  walkwayGradient.addColorStop(1, "#050810");
  ctx.fillStyle = walkwayGradient;
  ctx.fillRect(0, walkwayMainY, canvas.width, walkwayMainHeight);

  const reflectionGradient = ctx.createLinearGradient(0, walkwayMainY, 0, walkwayMainY + walkwayMainHeight * 0.3);
  reflectionGradient.addColorStop(0, "rgba(255, 240, 200, 0.08)");
  reflectionGradient.addColorStop(1, "transparent");
  ctx.fillStyle = reflectionGradient;
  ctx.fillRect(0, walkwayMainY, canvas.width, walkwayMainHeight * 0.3);

  ctx.strokeStyle = "rgba(200, 220, 255, 0.2)";
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(0, walkwayMainY);
  ctx.lineTo(canvas.width, walkwayMainY);
  ctx.stroke();

  const dividerGradient = ctx.createLinearGradient(canvas.width * 0.5 - 1, walkwayMainY, canvas.width * 0.5 + 1, walkwayMainY);
  dividerGradient.addColorStop(0, "transparent");
  dividerGradient.addColorStop(0.5, "rgba(150, 200, 255, 0.4)");
  dividerGradient.addColorStop(1, "transparent");
  ctx.strokeStyle = dividerGradient;
  ctx.lineWidth = 1;
  ctx.setLineDash([8, 12]);
  ctx.beginPath();
  ctx.moveTo(0, walkwayMainY + walkwayMainHeight * 0.5);
  ctx.lineTo(canvas.width, walkwayMainY + walkwayMainHeight * 0.5);
  ctx.stroke();
  ctx.setLineDash([]);
}

function drawCharacter() {
  const row = actor.facing === 1 ? ROW_RIGHT : ROW_LEFT;
  const sx = actor.currentFrame * frameSize.width;
  const sy = row * frameSize.height;

  ctx.save();
  ctx.shadowColor = "rgba(0, 0, 0, 0.4)";
  ctx.shadowBlur = 8;
  ctx.shadowOffsetY = 4;
  ctx.drawImage(
    sprite,
    sx,
    sy,
    frameSize.width,
    frameSize.height,
    Math.round(actor.x),
    Math.round(actor.y),
    frameSize.width,
    frameSize.height
  );
  ctx.restore();
}

function clamp(value, min, max) {
  return Math.min(Math.max(value, min), max);
}

function startMusic() {
  if (musicStarted) {
    return;
  }

  const playAttempt = music.play();
  if (playAttempt instanceof Promise) {
    playAttempt
      .then(() => {
        musicStarted = true;
      })
      .catch(() => {
        musicStarted = false;
      });
  } else {
    musicStarted = true;
  }
}

function tryStartGame() {
  if (isReady || !spriteLoaded || !backgroundLoaded) {
    return;
  }

  actor.x = clamp((canvas.width - frameSize.width) * 0.5, 0, canvas.width - frameSize.width);
  actor.y = canvas.height - frameSize.height - GROUND_OFFSET;
  isReady = true;
  requestAnimationFrame(loop);
}

