const canvas = document.querySelector("#canvas");
const ctx = canvas.getContext("2d");

let W = window.innerWidth;
let H = window.innerHeight;
canvas.width = W;
canvas.height = H;

function loadImage(src) {
  const img = new Image();
  img.src = src;
  return img;
}

const IMAGES = {
  glassBlue: loadImage("img/glass/Blue.png"),
  glassGreen: loadImage("img/glass/Green.png"),
  glassYellow: loadImage("img/glass/Yellow.png"),
  glassRed: loadImage("img/glass/Red.png"),
  glassPink: loadImage("img/glass/Pink.png"),
  glassVide: loadImage("img/glass/Vide.png"),
  glassVerre: loadImage("img/glass/Verre.png"),
  fond: loadImage("img/fond.jpg"),
};

let point = 100;

const BASE_SIZE = 50;
const SELECTED_SIZE = 150;
const SELECTED_POS = { x: W - 200, y: 400 };
const MAX_TILT_DEG = 45;
const MAX_ROTATION_DEG = 130;
const TARGET_GLASS_SIZE = 140;

const PARTICLE_COUNT = 500;
const PARTICLE_RADIUS = 2;
const PARTICLE_GRAVITY = 0.28;
const PARTICLE_FRICTION = 0.985;
const PARTICLE_RESTITUTION = 0.15;
const PARTICLE_REMOVE_MARGIN = 800;
const COLLISION_PASSES = 3;
const COLLISION_CELL_SIZE = 12;
const ESCAPED_DECAY_PER_FRAME = 2;
const GAME_DURATION_MS = 10_000;
const UI_TEXT_PADDING = 20;
// URL de redirection apres "Continuer" (facile a modifier).
// Tu peux aussi mettre l'URL dans index.html via: <body data-continue-url="page2.html">
const CONTINUE_REDIRECT_URL = document.body?.dataset?.continueUrl || "";

let sensorRotation = 0;
let targetRotation = 0;
let particles = [];
let lastSelectedGlass = null;
let currentRotation = 0;
let keyboardRotation = 0;
let leftPressed = false;
let rightPressed = false;
let pendingDecayByColor = Object.create(null);
let decayTriggeredForCurrentPour = false;
let gameStartTime = null;
let retryButtonBounds = null;
let continueButtonBounds = null;
const COLOR_HEX_RE = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i;
const MIX_TINT_SPEED = 0.08;

const SOURCE_LAYOUT = [
  { dx: -100, y: 115 },
  { dx: -10, y: 115 },
  { dx: 75, y: 115 },
  { dx: -10, y: 230 },
  { x: 120, y: 335 },
];

const glasses = [
  { image: IMAGES.glassBlue, color: "#2f88ff", x: 0, y: 0, width: BASE_SIZE, height: BASE_SIZE, selected: false },
  { image: IMAGES.glassGreen, color: "#3fc25f", x: 0, y: 0, width: BASE_SIZE, height: BASE_SIZE, selected: false },
  { image: IMAGES.glassYellow, color: "#ffd447", x: 0, y: 0, width: BASE_SIZE, height: BASE_SIZE, selected: false },
  { image: IMAGES.glassRed, color: "#f25555", x: 0, y: 0, width: BASE_SIZE, height: BASE_SIZE, selected: false },
  { image: IMAGES.glassPink, color: "#ff6bc6", x: 0, y: 0, width: BASE_SIZE, height: BASE_SIZE, selected: false },
  {
    image: IMAGES.glassVerre,
    x: 0,
    y: 0,
    width: TARGET_GLASS_SIZE,
    height: TARGET_GLASS_SIZE,
    isTarget: true,
  },
];

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function getResponsiveFontSize(min, max, viewportFactor) {
  return Math.round(clamp(Math.min(W, H) * viewportFactor, min, max));
}

function drawRoundedRect(x, y, width, height, radius) {
  const r = Math.min(radius, width / 2, height / 2);
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + width - r, y);
  ctx.quadraticCurveTo(x + width, y, x + width, y + r);
  ctx.lineTo(x + width, y + height - r);
  ctx.quadraticCurveTo(x + width, y + height, x + width - r, y + height);
  ctx.lineTo(x + r, y + height);
  ctx.quadraticCurveTo(x, y + height, x, y + height - r);
  ctx.lineTo(x, y + r);
  ctx.quadraticCurveTo(x, y, x + r, y);
  ctx.closePath();
}

function drawCanvasButton({ x, y, width, height, label, variant = "gold" }) {
  const centerX = x + width / 2;
  const centerY = y + height / 2;
  const radius = height / 2;

  ctx.save();
  ctx.shadowBlur = variant === "gold" ? 26 : 18;
  ctx.shadowColor = variant === "gold" ? "rgba(201, 151, 58, 0.75)" : "rgba(245, 232, 200, 0.35)";
  drawRoundedRect(x, y, width, height, radius);
  const gradient = ctx.createLinearGradient(x, y, x + width, y + height);
  if (variant === "gold") {
    gradient.addColorStop(0, "#f0c060");
    gradient.addColorStop(0.5, "#c9973a");
    gradient.addColorStop(1, "#f0c060");
  } else {
    gradient.addColorStop(0, "rgba(245, 232, 200, 0.2)");
    gradient.addColorStop(1, "rgba(245, 232, 200, 0.08)");
  }
  ctx.fillStyle = gradient;
  ctx.fill();
  ctx.restore();

  ctx.lineWidth = variant === "gold" ? 2 : 1.5;
  ctx.strokeStyle = variant === "gold" ? "rgba(240, 192, 96, 0.65)" : "rgba(245, 232, 200, 0.45)";
  drawRoundedRect(x, y, width, height, radius);
  ctx.stroke();

  const gloss = ctx.createLinearGradient(x, y, x, y + height);
  gloss.addColorStop(0, "rgba(255,255,255,0.34)");
  gloss.addColorStop(0.6, "rgba(255,255,255,0.08)");
  gloss.addColorStop(1, "rgba(255,255,255,0)");
  drawRoundedRect(x + 3, y + 2, width - 6, height * 0.56, Math.max(8, radius - 3));
  ctx.fillStyle = gloss;
  ctx.fill();

  ctx.fillStyle = variant === "gold" ? "#1a1208" : "#f5e8c8";
  ctx.font = `700 ${getResponsiveFontSize(17, 32, 0.036)}px "Cinzel", serif`;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(label, centerX, centerY, width - 18);
}

function hexToRgb(hex) {
  const match = COLOR_HEX_RE.exec(hex || "");
  if (!match) return null;
  return {
    r: parseInt(match[1], 16),
    g: parseInt(match[2], 16),
    b: parseInt(match[3], 16),
  };
}

function rgbToCss(rgb) {
  return `rgb(${Math.round(rgb.r)}, ${Math.round(rgb.g)}, ${Math.round(rgb.b)})`;
}

function rgbToHex(rgb) {
  const toHex = (v) => clamp(Math.round(v), 0, 255).toString(16).padStart(2, "0");
  return `#${toHex(rgb.r)}${toHex(rgb.g)}${toHex(rgb.b)}`;
}

function saveStoryColor(hexColor) {
  try {
    localStorage.setItem("henriette.couleur", hexColor);
  } catch (_e) {
    // Ignore localStorage errors on restricted browsers.
  }
}

function lerpColor(from, to, t) {
  return {
    r: from.r + (to.r - from.r) * t,
    g: from.g + (to.g - from.g) * t,
    b: from.b + (to.b - from.b) * t,
  };
}

function getSelectedGlass() {
  return glasses.find((g) => g.selected && !g.isTarget) || null;
}

function getDisplayRect(glass) {
  if (!glass.selected) {
    return { x: glass.x, y: glass.y, width: glass.width, height: glass.height };
  }
  return { x: SELECTED_POS.x, y: SELECTED_POS.y, width: SELECTED_SIZE, height: SELECTED_SIZE };
}

function isPointInGlass(x, y, glass) {
  if (glass.isTarget) return false;
  const rect = getDisplayRect(glass);
  return x >= rect.x && x <= rect.x + rect.width && y >= rect.y && y <= rect.y + rect.height;
}

function clearSelection() {
  glasses.forEach((g) => {
    g.selected = false;
  });
}

function selectGlass(glass) {
  clearSelection();
  glass.selected = true;
}

function updatePositions() {
  SOURCE_LAYOUT.forEach((slot, i) => {
    glasses[i].x = typeof slot.x === "number" ? slot.x : W / 2 + slot.dx;
    glasses[i].y = slot.y;
  });

  const target = glasses[glasses.length - 1];
  target.x = W / 2 - TARGET_GLASS_SIZE / 2;
  target.y = H - TARGET_GLASS_SIZE - 40;
}

function getTargetBounds(targetGlass) {
  if (!targetGlass) return null;
  const rect = getDisplayRect(targetGlass);
  const wallThickness = Math.max(8, rect.width * 0.08);
  const floorInset = Math.max(6, rect.width * 0.06);
  return {
    rect,
    wallThickness,
    floorInset,
  };
}

function isEscapedParticleInsideTarget(p, targetBounds) {
  if (!targetBounds || p.inGlass) return false;
  const { rect, wallThickness, floorInset } = targetBounds;
  const left = rect.x + wallThickness + p.radius;
  const right = rect.x + rect.width - wallThickness - p.radius;
  const top = rect.y + wallThickness + p.radius;
  const bottom = rect.y + rect.height - floorInset - p.radius;
  return p.x >= left && p.x <= right && p.y >= top && p.y <= bottom;
}

function keepEscapedParticleInTargetGlass(p, targetBounds) {
  if (!targetBounds || p.inGlass) return;

  const { rect, wallThickness, floorInset } = targetBounds;
  const outerLeft = rect.x + p.radius;
  const outerRight = rect.x + rect.width - p.radius;
  const innerLeft = rect.x + wallThickness + p.radius;
  const innerRight = rect.x + rect.width - wallThickness - p.radius;
  const innerBottom = rect.y + rect.height - floorInset - p.radius;
  const topOpeningY = rect.y + wallThickness;

  if (p.x < outerLeft || p.x > outerRight || p.y < topOpeningY) return;

  if (p.x < innerLeft) {
    p.x = innerLeft;
    p.vx = Math.max(0, p.vx) * 0.2;
  } else if (p.x > innerRight) {
    p.x = innerRight;
    p.vx = Math.min(0, p.vx) * 0.2;
  }

  if (p.y > innerBottom) {
    p.y = innerBottom;
    p.vy = 0;
  }
}

function scheduleHalfDecayByColor(escapedParticles) {
  const counts = Object.create(null);
  for (let i = 0; i < escapedParticles.length; i += 1) {
    const color = escapedParticles[i].sourceColor || "__default";
    counts[color] = (counts[color] || 0) + 1;
  }

  pendingDecayByColor = Object.create(null);
  const colors = Object.keys(counts);
  for (let i = 0; i < colors.length; i += 1) {
    const color = colors[i];
    pendingDecayByColor[color] = Math.floor(counts[color] / 2);
  }
}

function getPendingDecayCount() {
  const colors = Object.keys(pendingDecayByColor);
  let total = 0;
  for (let i = 0; i < colors.length; i += 1) {
    total += pendingDecayByColor[colors[i]] || 0;
  }
  return total;
}

function applyGradualEscapedDecay(targetBounds) {
  const totalPending = getPendingDecayCount();
  if (totalPending <= 0) return;

  let budget = Math.max(ESCAPED_DECAY_PER_FRAME, Math.ceil(totalPending * 0.03));
  let write = 0;

  for (let i = 0; i < particles.length; i += 1) {
    const p = particles[i];
    let remove = false;

    if (budget > 0 && !p.inGlass && isEscapedParticleInsideTarget(p, targetBounds)) {
      const color = p.sourceColor || "__default";
      const pending = pendingDecayByColor[color] || 0;
      if (pending > 0) {
        pendingDecayByColor[color] = pending - 1;
        budget -= 1;
        remove = true;
      }
    }

    if (!remove) {
      particles[write] = p;
      write += 1;
    }
  }

  particles.length = write;
}

function onCanvasClick(event) {
  const r = canvas.getBoundingClientRect();
  const x = event.clientX - r.left;
  const y = event.clientY - r.top;

  if (isGameLost()) {
    const clickedContinue =
      continueButtonBounds &&
      x >= continueButtonBounds.x &&
      x <= continueButtonBounds.x + continueButtonBounds.width &&
      y >= continueButtonBounds.y &&
      y <= continueButtonBounds.y + continueButtonBounds.height;
    if (clickedContinue) {
      const finalColor = getFinalTargetColor();
      if (finalColor) saveStoryColor(rgbToHex(finalColor));
      if (CONTINUE_REDIRECT_URL) window.location.href = CONTINUE_REDIRECT_URL;
      else returnToIntro();
      return;
    }

    if (
      retryButtonBounds &&
      x >= retryButtonBounds.x &&
      x <= retryButtonBounds.x + retryButtonBounds.width &&
      y >= retryButtonBounds.y &&
      y <= retryButtonBounds.y + retryButtonBounds.height
    ) {
      restartGame();
    }
    return;
  }

  let clicked = null;
  for (let i = glasses.length - 1; i >= 0; i -= 1) {
    if (isPointInGlass(x, y, glasses[i])) {
      clicked = glasses[i];
      break;
    }
  }

  if (!clicked) {
    clearSelection();
    return;
  }

  if (clicked.selected) {
    resetParticles(getDisplayRect(clicked), clicked.color);
    return;
  }

  selectGlass(clicked);
}

function setRotationFromGamma(gamma) {
  if (typeof gamma !== "number") return;
  const clamped = clamp(gamma, -MAX_TILT_DEG, MAX_TILT_DEG);
  const deg = (clamped / MAX_TILT_DEG) * MAX_ROTATION_DEG;
  sensorRotation = (deg * Math.PI) / 180;
}

function onDeviceOrientation(event) {
  setRotationFromGamma(event.gamma);
}

function enableDeviceOrientation() {
  if (!window.DeviceOrientationEvent) return;

  if (typeof DeviceOrientationEvent.requestPermission === "function") {
    const request = async () => {
      try {
        const state = await DeviceOrientationEvent.requestPermission();
        if (state === "granted") {
          window.addEventListener("deviceorientation", onDeviceOrientation);
        }
      } catch {
        // Ignore si refuse.
      }
    };
    window.addEventListener("click", request, { once: true });
    window.addEventListener("touchstart", request, { once: true });
    return;
  }

  window.addEventListener("deviceorientation", onDeviceOrientation);
}

function onKeyDown(event) {
  if (event.key === "ArrowLeft") leftPressed = true;
  else if (event.key === "ArrowRight") rightPressed = true;
  else return;
  event.preventDefault();
}

function onKeyUp(event) {
  if (event.key === "ArrowLeft") leftPressed = false;
  else if (event.key === "ArrowRight") rightPressed = false;
}

function updateKeyboardRotation() {
  const step = (4 * Math.PI) / 180;
  if (leftPressed && !rightPressed) keyboardRotation -= step;
  if (rightPressed && !leftPressed) keyboardRotation += step;
  if (!leftPressed && !rightPressed) keyboardRotation *= 0.9;

  const maxOffset = (MAX_ROTATION_DEG * Math.PI) / 180;
  keyboardRotation = clamp(keyboardRotation, -maxOffset, maxOffset);
}

function createParticle(rect, color) {
  const baseRgb = hexToRgb(color) || { r: 255, g: 255, b: 255 };
  return {
    x: rect.width / 2 + (Math.random() - 0.5) * 30,
    y: rect.height / 2 + (Math.random() - 0.5) * 30,
    vx: (Math.random() - 0.5) * 1.6,
    vy: (Math.random() - 0.5) * 1.6,
    radius: PARTICLE_RADIUS,
    inGlass: true,
    color: rgbToCss(baseRgb),
    sourceColor: color,
    r: baseRgb.r,
    g: baseRgb.g,
    b: baseRgb.b,
  };
}

function resetParticles(rect, color) {
  const targetGlass = glasses[glasses.length - 1];
  const targetBounds = getTargetBounds(targetGlass);
  const escaped = [];
  for (let i = 0; i < particles.length; i += 1) {
    const p = particles[i];
    if (isEscapedParticleInsideTarget(p, targetBounds)) escaped.push(p);
  }
  decayTriggeredForCurrentPour = false;

  const fresh = Array.from({ length: PARTICLE_COUNT }, () => createParticle(rect, color));
  particles = [...escaped, ...fresh];
}

function keepParticleInBounds(p, rect) {
  const centerX = rect.width / 2;
  const minY = p.radius;
  const maxY = rect.height - p.radius;
  const neckHalf = Math.max(7, rect.width * 0.09);
  const yNeckBottom = Math.min(maxY - 1, minY + rect.height * 0.4);
  const baseHalf = rect.width * 0.42 - p.radius;
  const cornerR = Math.max(10, rect.width * 0.16);
  const yCornerStart = Math.max(yNeckBottom, maxY - cornerR);

  if (p.y > maxY) {
    p.y = maxY;
    p.vy = 0;
  }

  if (p.y < minY) {
    if (Math.abs(p.x - centerX) <= neckHalf) return;
    p.y = minY;
    p.vy = 0;
  }

  let halfSpan = neckHalf;
  if (p.y > yNeckBottom && p.y <= yCornerStart) {
    const t = clamp((p.y - yNeckBottom) / Math.max(1, yCornerStart - yNeckBottom), 0, 1);
    halfSpan = neckHalf + (baseHalf - neckHalf) * t;
  } else if (p.y > yCornerStart) {
    const dy = clamp(p.y - yCornerStart, 0, cornerR);
    const dx = Math.sqrt(Math.max(0, cornerR * cornerR - dy * dy));
    halfSpan = baseHalf - cornerR + dx;
  }

  const minX = centerX - halfSpan;
  const maxX = centerX + halfSpan;
  if (p.x < minX) {
    p.x = minX;
    p.vx = 0;
  } else if (p.x > maxX) {
    p.x = maxX;
    p.vx = 0;
  }
}

function localToWorld(localX, localY, rect, centerX, centerY, rotation) {
  const ox = localX - rect.width / 2;
  const oy = localY - rect.height / 2;
  const cos = Math.cos(rotation);
  const sin = Math.sin(rotation);
  return { x: centerX + ox * cos - oy * sin, y: centerY + ox * sin + oy * cos };
}

function localVelocityToWorld(vx, vy, rotation) {
  const cos = Math.cos(rotation);
  const sin = Math.sin(rotation);
  return { vx: vx * cos - vy * sin, vy: vx * sin + vy * cos };
}

function escapeParticleFromGlass(p, rect, centerX, centerY, rotation) {
  const worldPos = localToWorld(p.x, p.y, rect, centerX, centerY, rotation);
  const worldVel = localVelocityToWorld(p.vx, p.vy, rotation);
  p.x = worldPos.x;
  p.y = worldPos.y;
  p.vx = worldVel.vx;
  p.vy = worldVel.vy;
  p.inGlass = false;

  if (!decayTriggeredForCurrentPour) {
    const targetGlass = glasses[glasses.length - 1];
    const targetBounds = getTargetBounds(targetGlass);
    const escapedInTarget = [];
    for (let i = 0; i < particles.length; i += 1) {
      const particle = particles[i];
      if (isEscapedParticleInsideTarget(particle, targetBounds)) escapedInTarget.push(particle);
    }
    scheduleHalfDecayByColor(escapedInTarget);
    decayTriggeredForCurrentPour = true;
  }
}

function resolvePairCollision(a, b) {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const distance = Math.hypot(dx, dy);
  const minDistance = a.radius + b.radius;
  if (distance >= minDistance) return;

  let nx = 0;
  let ny = 0;
  let safeDistance = distance;
  if (distance === 0) {
    const angle = Math.random() * Math.PI * 2;
    nx = Math.cos(angle);
    ny = Math.sin(angle);
    safeDistance = 0.0001;
  } else {
    nx = dx / distance;
    ny = dy / distance;
  }

  const overlap = minDistance - safeDistance;
  const correction = overlap / 2;
  a.x -= nx * correction;
  a.y -= ny * correction;
  b.x += nx * correction;
  b.y += ny * correction;

  const rvx = b.vx - a.vx;
  const rvy = b.vy - a.vy;
  const velAlongNormal = rvx * nx + rvy * ny;
  if (velAlongNormal > 0) return;

  const impulse = -((1 + PARTICLE_RESTITUTION) * velAlongNormal) / 2;
  a.vx -= impulse * nx;
  a.vy -= impulse * ny;
  b.vx += impulse * nx;
  b.vy += impulse * ny;
}

function resolveCollisions() {
  const grid = new Map();

  for (let i = 0; i < particles.length; i += 1) {
    const p = particles[i];
    const cx = Math.floor(p.x / COLLISION_CELL_SIZE);
    const cy = Math.floor(p.y / COLLISION_CELL_SIZE);
    const group = p.inGlass ? "1" : "0";
    const key = `${group}:${cx},${cy}`;
    const bucket = grid.get(key);
    if (bucket) bucket.push(i);
    else grid.set(key, [i]);
  }

  for (let i = 0; i < particles.length; i += 1) {
    const a = particles[i];
    const acx = Math.floor(a.x / COLLISION_CELL_SIZE);
    const acy = Math.floor(a.y / COLLISION_CELL_SIZE);
    const group = a.inGlass ? "1" : "0";

    for (let oy = -1; oy <= 1; oy += 1) {
      for (let ox = -1; ox <= 1; ox += 1) {
        const key = `${group}:${acx + ox},${acy + oy}`;
        const bucket = grid.get(key);
        if (!bucket) continue;

        for (let k = 0; k < bucket.length; k += 1) {
          const j = bucket[k];
          if (j <= i) continue;
          resolvePairCollision(a, particles[j]);
        }
      }
    }
  }
}

function updateParticles(rect, centerX, centerY, rotation) {
  const targetGlass = glasses[glasses.length - 1];
  const targetBounds = getTargetBounds(targetGlass);

  for (let i = 0; i < particles.length; i += 1) {
    const p = particles[i];
    if (p.inGlass) {
      p.vx += Math.sin(rotation) * PARTICLE_GRAVITY;
      p.vy += Math.cos(rotation) * PARTICLE_GRAVITY;
      p.vx *= PARTICLE_FRICTION;
      p.x += p.vx;
      p.y += p.vy;
      keepParticleInBounds(p, rect);
      if (p.y < -p.radius) escapeParticleFromGlass(p, rect, centerX, centerY, rotation);
      continue;
    }

    p.vy += PARTICLE_GRAVITY;
    p.vx *= PARTICLE_FRICTION;
    p.x += p.vx;
    p.y += p.vy;
    keepEscapedParticleInTargetGlass(p, targetBounds);
  }

  applyGradualEscapedDecay(targetBounds);
  updateTargetMixColor(targetBounds);

  for (let pass = 0; pass < COLLISION_PASSES; pass += 1) {
    resolveCollisions();
    for (let i = 0; i < particles.length; i += 1) {
      const p = particles[i];
      if (p.inGlass) keepParticleInBounds(p, rect);
      else keepEscapedParticleInTargetGlass(p, targetBounds);
    }
  }

  let write = 0;
  for (let i = 0; i < particles.length; i += 1) {
    const p = particles[i];
    if (!p.inGlass && (p.x < 0 || p.x > W || p.y < 0 || p.y > H)) {
      if (point !== 0) point -= 1;
      continue;
    }
    const inSafetyBounds =
      p.x >= -PARTICLE_REMOVE_MARGIN &&
      p.x <= W + PARTICLE_REMOVE_MARGIN &&
      p.y >= -PARTICLE_REMOVE_MARGIN &&
      p.y <= H + PARTICLE_REMOVE_MARGIN;
    if (!inSafetyBounds) continue;
    particles[write] = p;
    write += 1;
  }
  particles.length = write;
}

function updateEscapedParticlesOnly() {
  const targetGlass = glasses[glasses.length - 1];
  const targetBounds = getTargetBounds(targetGlass);

  for (let i = 0; i < particles.length; i += 1) {
    const p = particles[i];
    if (p.inGlass) continue;
    p.vy += PARTICLE_GRAVITY;
    p.vx *= PARTICLE_FRICTION;
    p.x += p.vx;
    p.y += p.vy;
    keepEscapedParticleInTargetGlass(p, targetBounds);
  }

  applyGradualEscapedDecay(targetBounds);
  updateTargetMixColor(targetBounds);

  for (let pass = 0; pass < COLLISION_PASSES; pass += 1) {
    resolveCollisions();
    for (let i = 0; i < particles.length; i += 1) {
      const p = particles[i];
      if (!p.inGlass) keepEscapedParticleInTargetGlass(p, targetBounds);
    }
  }

  let write = 0;
  for (let i = 0; i < particles.length; i += 1) {
    const p = particles[i];
    if (!p.inGlass && (p.x < 0 || p.x > W || p.y < 0 || p.y > H)) {
      if (point !== 0) point -= 1;
      continue;
    }
    const inSafetyBounds =
      p.x >= -PARTICLE_REMOVE_MARGIN &&
      p.x <= W + PARTICLE_REMOVE_MARGIN &&
      p.y >= -PARTICLE_REMOVE_MARGIN &&
      p.y <= H + PARTICLE_REMOVE_MARGIN;
    if (!inSafetyBounds) continue;
    particles[write] = p;
    write += 1;
  }
  particles.length = write;
}

function updateTargetMixColor(targetBounds) {
  if (!targetBounds) return;

  let totalR = 0;
  let totalG = 0;
  let totalB = 0;
  let count = 0;

  for (let i = 0; i < particles.length; i += 1) {
    const p = particles[i];
    if (p.inGlass || !isEscapedParticleInsideTarget(p, targetBounds)) continue;
    if (typeof p.r !== "number" || typeof p.g !== "number" || typeof p.b !== "number") {
      const base = hexToRgb(p.sourceColor) || hexToRgb(p.color) || { r: 255, g: 255, b: 255 };
      p.r = base.r;
      p.g = base.g;
      p.b = base.b;
    }
    totalR += p.r;
    totalG += p.g;
    totalB += p.b;
    count += 1;
  }

  if (count === 0) return;

  const mixR = totalR / count;
  const mixG = totalG / count;
  const mixB = totalB / count;

  for (let i = 0; i < particles.length; i += 1) {
    const p = particles[i];
    if (p.inGlass || !isEscapedParticleInsideTarget(p, targetBounds)) continue;
    p.r += (mixR - p.r) * MIX_TINT_SPEED;
    p.g += (mixG - p.g) * MIX_TINT_SPEED;
    p.b += (mixB - p.b) * MIX_TINT_SPEED;
    p.color = rgbToCss(p);
  }
}

function drawEscapedParticlesOnly() {
  for (let i = 0; i < particles.length; i += 1) {
    const p = particles[i];
    if (p.inGlass) continue;
    ctx.fillStyle = p.color || "#ffffff";
    ctx.beginPath();
    ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
    ctx.fill();
  }
}

function getRemainingTimeSeconds() {
  if (gameStartTime === null) return GAME_DURATION_MS / 1000;
  const elapsed = Date.now() - gameStartTime;
  const remainingMs = Math.max(0, GAME_DURATION_MS - elapsed);
  return remainingMs / 1000;
}

function isGameLost() {
  return point === 0 || (gameStartTime !== null && getRemainingTimeSeconds() <= 0);
}

function isOutOfPoints() {
  return point === 0;
}

function isTimerOver() {
  return gameStartTime !== null && getRemainingTimeSeconds() <= 0;
}

function isTargetGlassFilled() {
  const targetGlass = glasses[glasses.length - 1];
  const targetBounds = getTargetBounds(targetGlass);
  if (!targetBounds) return false;

  for (let i = 0; i < particles.length; i += 1) {
    const p = particles[i];
    if (!p.inGlass && isEscapedParticleInsideTarget(p, targetBounds)) return true;
  }
  return false;
}

function resetGameState(shouldStartTimer) {
  point = 100;
  particles = [];
  pendingDecayByColor = Object.create(null);
  decayTriggeredForCurrentPour = false;
  clearSelection();
  lastSelectedGlass = null;
  sensorRotation = 0;
  targetRotation = 0;
  currentRotation = 0;
  keyboardRotation = 0;
  leftPressed = false;
  rightPressed = false;
  retryButtonBounds = null;
  continueButtonBounds = null;
  gameStartTime = shouldStartTimer ? Date.now() : null;
}

function restartGame() {
  resetGameState(true);
}

function returnToIntro() {
  resetGameState(false);
  const intro = document.querySelector(".intro");
  const startButton = document.querySelector(".start");
  const rulesModal = document.querySelector(".rules-modal");
  canvas.ariaHidden = "true";
  if (intro) intro.ariaHidden = "false";
  if (rulesModal) rulesModal.ariaHidden = "true";
  if (startButton) startButton.ariaExpanded = "false";
}

function getFinalTargetColor() {
  const targetGlass = glasses[glasses.length - 1];
  const targetBounds = getTargetBounds(targetGlass);
  if (!targetBounds) return null;

  let totalR = 0;
  let totalG = 0;
  let totalB = 0;
  let count = 0;

  for (let i = 0; i < particles.length; i += 1) {
    const p = particles[i];
    if (p.inGlass || !isEscapedParticleInsideTarget(p, targetBounds)) continue;
    const base = (typeof p.r === "number" && typeof p.g === "number" && typeof p.b === "number")
      ? p
      : hexToRgb(p.sourceColor) || hexToRgb(p.color) || { r: 255, g: 255, b: 255 };
    totalR += base.r;
    totalG += base.g;
    totalB += base.b;
    count += 1;
  }

  if (count === 0) return { r: 255, g: 255, b: 255 };
  return {
    r: totalR / count,
    g: totalG / count,
    b: totalB / count,
  };
}

function loose() {
  if (!isGameLost()) return;
  retryButtonBounds = null;
  continueButtonBounds = null;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";

  const centerX = W / 2;
  const centerY = H / 2;
  const textMaxWidth = W - UI_TEXT_PADDING * 2;

  if (isOutOfPoints()) {
    ctx.fillStyle = "#ff000091";
    ctx.fillRect(0, 0, W, H);
    ctx.fillStyle = "#ffffff";
    ctx.font = `bold ${getResponsiveFontSize(34, 56, 0.065)}px serif`;
    ctx.fillText("Défaite", centerX, centerY - 35, textMaxWidth);
    ctx.font = `bold ${getResponsiveFontSize(20, 34, 0.04)}px serif`;
    ctx.fillText("Vous en avez trop renverse a cote", centerX, centerY + 35, textMaxWidth);

    const buttonWidth = 210;
    const buttonHeight = 62;
    const buttonX = centerX - buttonWidth / 2;
    const buttonY = centerY + 95;
    retryButtonBounds = { x: buttonX, y: buttonY, width: buttonWidth, height: buttonHeight };

    drawCanvasButton({
      x: buttonX,
      y: buttonY,
      width: buttonWidth,
      height: buttonHeight,
      label: "Ressayer",
      variant: "gold",
    });
  } else if (isTimerOver()) {
    if (!isTargetGlassFilled()) {
      ctx.fillStyle = "#ff000091";
      ctx.fillRect(0, 0, W, H);
      ctx.fillStyle = "#ffffff";
      ctx.font = `bold ${getResponsiveFontSize(34, 56, 0.065)}px serif`;
      ctx.fillText("Défaite", centerX, centerY - 35, textMaxWidth);
      ctx.font = `bold ${getResponsiveFontSize(20, 34, 0.04)}px serif`;
      ctx.fillText("Le verre cible n'a pas ete rempli", centerX, centerY + 35, textMaxWidth);

      const buttonWidth = 210;
      const buttonHeight = 62;
      const buttonX = centerX - buttonWidth / 2;
      const buttonY = centerY + 95;
      retryButtonBounds = { x: buttonX, y: buttonY, width: buttonWidth, height: buttonHeight };

      drawCanvasButton({
        x: buttonX,
        y: buttonY,
        width: buttonWidth,
        height: buttonHeight,
        label: "Ressayer",
        variant: "gold",
      });
      ctx.textAlign = "left";
      ctx.textBaseline = "alphabetic";
      return;
    }

    ctx.fillStyle = "rgba(0, 0, 0, 0.82)";
    ctx.fillRect(0, 0, W, H);

    const finalColor = getFinalTargetColor() || { r: 255, g: 255, b: 255 };
    const finalColorCss = rgbToCss(finalColor);
    const finalColorHex = rgbToHex(finalColor);
    const circleRadius = 55;

    ctx.fillStyle = "#ffffff";
    ctx.font = `bold ${getResponsiveFontSize(34, 56, 0.065)}px serif`;
    ctx.fillText("Fin", centerX, centerY - 90, textMaxWidth);

    ctx.fillStyle = finalColorCss;
    ctx.beginPath();
    ctx.arc(centerX, centerY, circleRadius, 0, Math.PI * 2);
    ctx.fill();

    ctx.strokeStyle = "#ffffff";
    ctx.lineWidth = 4;
    ctx.stroke();

    ctx.fillStyle = "#ffffff";
    ctx.font = `${getResponsiveFontSize(20, 30, 0.036)}px serif`;
    ctx.fillText(`Couleur finale : ${finalColorHex}`, centerX, centerY + 95, textMaxWidth);

    const ctaWidth = 280;
    const ctaHeight = 64;
    const ctaX = centerX - ctaWidth / 2;
    const ctaY = centerY + 125;
    continueButtonBounds = { x: ctaX, y: ctaY, width: ctaWidth, height: ctaHeight };
    drawCanvasButton({
      x: ctaX,
      y: ctaY,
      width: ctaWidth,
      height: ctaHeight,
      label: "Continuer",
      variant: "gold",
    });

    const secondaryWidth = 350;
    const secondaryHeight = 56;
    const secondaryX = centerX - secondaryWidth / 2;
    const secondaryY = ctaY + ctaHeight + 16;
    retryButtonBounds = { x: secondaryX, y: secondaryY, width: secondaryWidth, height: secondaryHeight };
    drawCanvasButton({
      x: secondaryX,
      y: secondaryY,
      width: secondaryWidth,
      height: secondaryHeight,
      label: "Changer de couleur",
      variant: "ghost",
    });
  }

  ctx.textAlign = "left";
  ctx.textBaseline = "alphabetic";
}

function drawParticles(rect, color, centerX, centerY, rotation) {
  updateParticles(rect, centerX, centerY, rotation);
  const cos = Math.cos(rotation);
  const sin = Math.sin(rotation);
  const halfW = rect.width / 2;
  const halfH = rect.height / 2;

  for (let i = 0; i < particles.length; i += 1) {
    const p = particles[i];
    let px = p.x;
    let py = p.y;
    if (p.inGlass) {
      const ox = p.x - halfW;
      const oy = p.y - halfH;
      px = centerX + ox * cos - oy * sin;
      py = centerY + ox * sin + oy * cos;
    }
    ctx.fillStyle = p.color || color;
    ctx.beginPath();
    ctx.arc(px, py, p.radius, 0, Math.PI * 2);
    ctx.fill();
  }
}

function drawGlass(glass) {
  const rect = getDisplayRect(glass);
  if (!glass.selected) {
    ctx.drawImage(glass.image, rect.x, rect.y, rect.width, rect.height);
    return;
  }

  const centerX = rect.x + rect.width / 2;
  const centerY = rect.y + rect.height / 2;
  ctx.save();
  ctx.translate(centerX, centerY);
  ctx.rotate(currentRotation);
  ctx.drawImage(IMAGES.glassVide, -rect.width / 2, -rect.height / 2, rect.width, rect.height);
  ctx.restore();
  drawParticles(rect, glass.color, centerX, centerY, currentRotation);
}

function render() {
  updateKeyboardRotation();
  targetRotation = sensorRotation + keyboardRotation;
  currentRotation += (targetRotation - currentRotation) * 0.32;

  const selectedGlass = getSelectedGlass();
  if (selectedGlass !== lastSelectedGlass) {
    lastSelectedGlass = selectedGlass;
    if (selectedGlass) resetParticles(getDisplayRect(selectedGlass), selectedGlass.color);
    else particles = particles.filter((p) => !p.inGlass);
  }

  ctx.clearRect(0, 0, W, H);
  ctx.drawImage(IMAGES.fond, 0, 0, W, H);

  let selected = null;
  for (let i = 0; i < glasses.length; i += 1) {
    const g = glasses[i];
    if (g.selected) {
      selected = g;
      continue;
    }
    drawGlass(g);
  }
  if (selected) drawGlass(selected);
  else {
    updateEscapedParticlesOnly();
    drawEscapedParticlesOnly();
  }
}

function renderInfo() {
  if (isGameLost()) return;
  const remaining = Math.ceil(getRemainingTimeSeconds());
  ctx.fillStyle = "#ffffff";
  ctx.font = `bold ${getResponsiveFontSize(34, 64, 0.075)}px serif`;
  ctx.textAlign = "center";
  ctx.textBaseline = "top";
  ctx.fillText(`${remaining}`, W / 2, UI_TEXT_PADDING, W - UI_TEXT_PADDING * 2);
  ctx.textAlign = "left";
  ctx.textBaseline = "alphabetic";
}

function loop() {
  if (!isGameLost()) render();
  else {
    ctx.clearRect(0, 0, W, H);
    ctx.drawImage(IMAGES.fond, 0, 0, W, H);
  }
  renderInfo();
  loose();
  requestAnimationFrame(loop);
}

window.addEventListener("resize", () => {
  W = window.innerWidth;
  H = window.innerHeight;
  canvas.width = W;
  canvas.height = H;
  updatePositions();
});

canvas.addEventListener("click", onCanvasClick);
window.addEventListener("keydown", onKeyDown);
window.addEventListener("keyup", onKeyUp);
window.addEventListener("game:start", () => {
  if (gameStartTime === null) gameStartTime = Date.now();
});

updatePositions();
enableDeviceOrientation();
loop();
