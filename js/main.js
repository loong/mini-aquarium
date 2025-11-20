const canvas = document.getElementById("game");
const ctx = canvas.getContext("2d");

const SPRITE_PATH = "assets/chloe-sprite-3.png";
const BACKGROUND_PATH = "assets/tank.png";
const MUSIC_PATH = "assets/CosmicSolitude.mp3";
const SPRITE_COLUMNS = 5;
const SPRITE_SHEET_ROWS = 2;
const CANVAS_WIDTH = 1200;
const CANVAS_HEIGHT = 840;
const TANK_SCALE_BASE = 0.65;
const TANK_SCALE_HEIGHT_MULTIPLIER = 1;
const TANK_OFFSET_Y = 8;
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
const BUBBLE_COUNT = 40;
const BUBBLE_MIN_SIZE = 4;
const BUBBLE_MAX_SIZE = 12;
const BUBBLE_MIN_SPEED = 20;
const BUBBLE_MAX_SPEED = 50;
const BUBBLE_SPAWN_RATE = 0.6;

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
const bubbles = [];

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

function createBubble(tankX, tankY, tankWidth, tankHeight, startAtBottom = true) {
  return {
    x: tankX + Math.random() * tankWidth,
    y: startAtBottom ? tankY + tankHeight : tankY + Math.random() * tankHeight,
    size: BUBBLE_MIN_SIZE + Math.random() * (BUBBLE_MAX_SIZE - BUBBLE_MIN_SIZE),
    speed: BUBBLE_MIN_SPEED + Math.random() * (BUBBLE_MAX_SPEED - BUBBLE_MIN_SPEED),
    drift: -15 + Math.random() * 30,
    opacity: 0.4 + Math.random() * 0.4,
    phase: Math.random() * Math.PI * 2
  };
}

function initializeBubbles() {
  if (!backgroundLoaded) {
    return;
  }

  const scaleX = (canvas.width / CANVAS_WIDTH) * TANK_SCALE_BASE;
  const scaleY = (canvas.height / CANVAS_HEIGHT) * TANK_SCALE_BASE * TANK_SCALE_HEIGHT_MULTIPLIER;
  const tankWidth = background.width * scaleX;
  const tankHeight = background.height * scaleY;
  const tankX = Math.round((canvas.width - tankWidth) * 0.5);
  const tankY = TANK_OFFSET_Y;

  const initialBubbleCount = Math.min(15, BUBBLE_COUNT);
  for (let i = 0; i < initialBubbleCount; i++) {
    bubbles.push(createBubble(tankX, tankY, tankWidth, tankHeight, false));
  }
}

const music = new Audio(MUSIC_PATH);
music.loop = true;
music.volume = 0.6;
music.preload = "auto";

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

const btnLeft = document.getElementById("btn-left");
const btnRight = document.getElementById("btn-right");

function setupButtonEvents(button, direction) {
  const setActive = (active) => {
    if (active) {
      button.classList.add("active");
      input[direction] = true;
      startMusic();
    } else {
      button.classList.remove("active");
      input[direction] = false;
    }
  };

  button.addEventListener("mousedown", (e) => {
    e.preventDefault();
    setActive(true);
  });

  button.addEventListener("mouseup", (e) => {
    e.preventDefault();
    setActive(false);
  });

  button.addEventListener("mouseleave", (e) => {
    e.preventDefault();
    setActive(false);
  });

  button.addEventListener("touchstart", (e) => {
    e.preventDefault();
    setActive(true);
  });

  button.addEventListener("touchend", (e) => {
    e.preventDefault();
    setActive(false);
  });

  button.addEventListener("touchcancel", (e) => {
    e.preventDefault();
    setActive(false);
  });
}

if (btnLeft && btnRight) {
  setupButtonEvents(btnLeft, "left");
  setupButtonEvents(btnRight, "right");
}

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

  updateBubbles(delta);
}

function updateBubbles(delta) {
  if (!isReady || !backgroundLoaded) {
    return;
  }

  const scaleX = (canvas.width / CANVAS_WIDTH) * TANK_SCALE_BASE;
  const scaleY = (canvas.height / CANVAS_HEIGHT) * TANK_SCALE_BASE * TANK_SCALE_HEIGHT_MULTIPLIER;
  const tankWidth = background.width * scaleX;
  const tankHeight = background.height * scaleY;
  const tankX = Math.round((canvas.width - tankWidth) * 0.5);
  const tankY = TANK_OFFSET_Y;

  for (let i = bubbles.length - 1; i >= 0; i--) {
    const bubble = bubbles[i];
    bubble.y -= bubble.speed * delta;
    bubble.x += bubble.drift * delta * 0.1;
    bubble.phase += delta * 2;

    if (bubble.y < tankY || bubble.x < tankX || bubble.x > tankX + tankWidth) {
      bubbles.splice(i, 1);
    }
  }

  if (Math.random() < BUBBLE_SPAWN_RATE * delta && bubbles.length < BUBBLE_COUNT) {
    bubbles.push(createBubble(tankX, tankY, tankWidth, tankHeight));
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
  drawPlaque();
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
  const scaleX = (canvas.width / CANVAS_WIDTH) * TANK_SCALE_BASE;
  const scaleY = (canvas.height / CANVAS_HEIGHT) * TANK_SCALE_BASE * TANK_SCALE_HEIGHT_MULTIPLIER;
  const tankWidth = background.width * scaleX;
  const tankHeight = background.height * scaleY;
  const tankX = Math.round((canvas.width - tankWidth) * 0.5);
  const tankY = TANK_OFFSET_Y;

  ctx.save();
  ctx.shadowColor = "rgba(100, 180, 255, 0.4)";
  ctx.shadowBlur = 30;
  ctx.shadowOffsetX = 0;
  ctx.shadowOffsetY = 0;
  ctx.drawImage(background, tankX, tankY, tankWidth, tankHeight);
  ctx.restore();

  drawBubbles(tankX, tankY, tankWidth, tankHeight);

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

function drawBubbles(tankX, tankY, tankWidth, tankHeight) {
  ctx.save();
  ctx.imageSmoothingEnabled = false;
  for (const bubble of bubbles) {
    if (bubble.y < tankY || bubble.y > tankY + tankHeight) {
      continue;
    }

    const wobble = Math.sin(bubble.phase) * 0.5;
    const currentX = Math.round(bubble.x + wobble);
    const currentY = Math.round(bubble.y);
    const size = Math.round(bubble.size);
    const radius = size;

    ctx.globalAlpha = Math.min(1, bubble.opacity * 1.2);

    const centerX = currentX;
    const centerY = currentY;

    for (let y = -radius; y <= radius; y++) {
      for (let x = -radius; x <= radius; x++) {
        const distance = Math.sqrt(x * x + y * y);
        if (distance <= radius) {
          const pixelX = centerX + x;
          const pixelY = centerY + y;

          let color;
          const normalizedDist = distance / radius;
          const highlightDist = Math.sqrt((x + radius * 0.4) * (x + radius * 0.4) + (y + radius * 0.4) * (y + radius * 0.4));

          if (highlightDist < radius * 0.3) {
            color = "rgba(255, 255, 255, 0.95)";
          } else if (normalizedDist < 0.3) {
            color = "rgba(200, 240, 255, 0.85)";
          } else if (normalizedDist < 0.6) {
            color = "rgba(150, 220, 255, 0.7)";
          } else if (normalizedDist < 0.85) {
            color = "rgba(100, 200, 255, 0.5)";
          } else {
            color = "rgba(80, 180, 255, 0.3)";
          }

          ctx.fillStyle = color;
          ctx.fillRect(pixelX, pixelY, 1, 1);
        }
      }
    }

    ctx.strokeStyle = "rgba(255, 255, 255, 0.8)";
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.arc(centerX, centerY, radius, 0, Math.PI * 2);
    ctx.stroke();
  }
  ctx.restore();
}

function drawPlaque() {
  if (!isReady || !backgroundLoaded) {
    return;
  }

  const walkwayMainY = WALKWAY_TOP + WALKWAY_EDGE_HEIGHT;
  const walkwayMainHeight = WALKWAY_HEIGHT - WALKWAY_EDGE_HEIGHT;

  const plaqueWidth = 240;
  const plaqueHeight = 36;
  const plaqueX = (canvas.width - plaqueWidth) * 0.5;
  const plaqueY = walkwayMainY - 10;

  ctx.save();
  ctx.imageSmoothingEnabled = false;

  const plaqueGradient = ctx.createLinearGradient(plaqueX, plaqueY, plaqueX, plaqueY + plaqueHeight);
  plaqueGradient.addColorStop(0, "#2a3441");
  plaqueGradient.addColorStop(0.5, "#1e2835");
  plaqueGradient.addColorStop(1, "#151b26");
  ctx.fillStyle = plaqueGradient;
  ctx.fillRect(plaqueX, plaqueY, plaqueWidth, plaqueHeight);

  ctx.strokeStyle = "rgba(150, 200, 255, 0.4)";
  ctx.lineWidth = 2;
  ctx.strokeRect(plaqueX, plaqueY, plaqueWidth, plaqueHeight);

  ctx.strokeStyle = "rgba(100, 180, 255, 0.6)";
  ctx.lineWidth = 1;
  ctx.strokeRect(plaqueX + 1, plaqueY + 1, plaqueWidth - 2, plaqueHeight - 2);

  const innerGradient = ctx.createLinearGradient(plaqueX, plaqueY, plaqueX, plaqueY + plaqueHeight);
  innerGradient.addColorStop(0, "rgba(100, 180, 255, 0.08)");
  innerGradient.addColorStop(1, "transparent");
  ctx.fillStyle = innerGradient;
  ctx.fillRect(plaqueX + 2, plaqueY + 2, plaqueWidth - 4, plaqueHeight - 4);

  ctx.shadowColor = "rgba(100, 180, 255, 0.4)";
  ctx.shadowBlur = 6;
  ctx.shadowOffsetX = 0;
  ctx.shadowOffsetY = 0;
  ctx.fillStyle = "#e8f4ff";
  ctx.font = "bold 16px 'Courier New', monospace";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText("Chloe's Mini Oceanium", plaqueX + plaqueWidth * 0.5, plaqueY + plaqueHeight * 0.5);

  ctx.restore();
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

  drawTankGlowOnWalkway(walkwayMainY, walkwayMainHeight);

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

function drawTankGlowOnWalkway(walkwayMainY, walkwayMainHeight) {
  if (!isReady || !backgroundLoaded) {
    return;
  }

  const scaleX = (canvas.width / CANVAS_WIDTH) * TANK_SCALE_BASE;
  const scaleY = (canvas.height / CANVAS_HEIGHT) * TANK_SCALE_BASE * TANK_SCALE_HEIGHT_MULTIPLIER;
  const tankWidth = background.width * scaleX;
  const tankHeight = background.height * scaleY;
  const tankX = Math.round((canvas.width - tankWidth) * 0.5);
  const tankCenterX = tankX + tankWidth * 0.5;
  const tankBottomY = TANK_OFFSET_Y + tankHeight;

  ctx.save();

  const pulse1 = 0.85 + 0.15 * Math.sin(animationTime * 1.2);
  const pulse2 = 0.9 + 0.1 * Math.sin(animationTime * 0.8 + Math.PI * 0.3);
  const pulse3 = 0.88 + 0.12 * Math.sin(animationTime * 1.5 + Math.PI * 0.6);
  const shimmer = 0.95 + 0.05 * Math.sin(animationTime * 2.5);

  const glowGradient = ctx.createRadialGradient(
    tankCenterX,
    walkwayMainY,
    0,
    tankCenterX,
    walkwayMainY,
    tankWidth * 0.8
  );
  glowGradient.addColorStop(0, `rgba(100, 180, 255, ${0.25 * pulse1})`);
  glowGradient.addColorStop(0.3, `rgba(80, 160, 240, ${0.18 * pulse1})`);
  glowGradient.addColorStop(0.6, `rgba(60, 140, 220, ${0.1 * pulse1})`);
  glowGradient.addColorStop(1, "transparent");

  ctx.fillStyle = glowGradient;
  ctx.fillRect(
    tankCenterX - tankWidth * 0.8,
    walkwayMainY,
    tankWidth * 1.6,
    walkwayMainHeight * 0.6
  );

  const edgeGlowGradient = ctx.createLinearGradient(
    tankX,
    walkwayMainY,
    tankX + tankWidth,
    walkwayMainY
  );
  edgeGlowGradient.addColorStop(0, "transparent");
  edgeGlowGradient.addColorStop(0.2, `rgba(120, 200, 255, ${0.15 * pulse2 * shimmer})`);
  edgeGlowGradient.addColorStop(0.5, `rgba(100, 180, 255, ${0.2 * pulse2 * shimmer})`);
  edgeGlowGradient.addColorStop(0.8, `rgba(120, 200, 255, ${0.15 * pulse2 * shimmer})`);
  edgeGlowGradient.addColorStop(1, "transparent");

  ctx.fillStyle = edgeGlowGradient;
  ctx.fillRect(
    tankX - tankWidth * 0.1,
    walkwayMainY,
    tankWidth * 1.2,
    walkwayMainHeight * 0.4
  );

  const verticalGlowGradient = ctx.createLinearGradient(
    tankCenterX,
    walkwayMainY,
    tankCenterX,
    walkwayMainY + walkwayMainHeight * 0.5
  );
  verticalGlowGradient.addColorStop(0, `rgba(100, 180, 255, ${0.2 * pulse3})`);
  verticalGlowGradient.addColorStop(0.5, `rgba(80, 160, 240, ${0.1 * pulse3})`);
  verticalGlowGradient.addColorStop(1, "transparent");

  ctx.fillStyle = verticalGlowGradient;
  ctx.fillRect(
    tankCenterX - tankWidth * 0.15,
    walkwayMainY,
    tankWidth * 0.3,
    walkwayMainHeight * 0.5
  );

  const waveOffset = Math.sin(animationTime * 1.8) * 3;
  const waveGradient = ctx.createLinearGradient(
    tankCenterX - tankWidth * 0.2 + waveOffset,
    walkwayMainY,
    tankCenterX + tankWidth * 0.2 + waveOffset,
    walkwayMainY + walkwayMainHeight * 0.3
  );
  waveGradient.addColorStop(0, "transparent");
  waveGradient.addColorStop(0.4, `rgba(150, 220, 255, ${0.12 * pulse1})`);
  waveGradient.addColorStop(0.6, `rgba(150, 220, 255, ${0.12 * pulse1})`);
  waveGradient.addColorStop(1, "transparent");

  ctx.fillStyle = waveGradient;
  ctx.fillRect(
    tankX - tankWidth * 0.15,
    walkwayMainY,
    tankWidth * 1.3,
    walkwayMainHeight * 0.3
  );

  ctx.restore();
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

  actor.x = clamp(canvas.width * (1/5), 0, canvas.width - frameSize.width);
  actor.y = canvas.height - frameSize.height - GROUND_OFFSET;
  isReady = true;
  
  initializeBubbles();
  
  setTimeout(() => {
    startMusic();
  }, 100);
  
  requestAnimationFrame(loop);
}

