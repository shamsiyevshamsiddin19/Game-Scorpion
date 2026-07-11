// ==========================================
// SCORPION HUNTER GAME — Realistic Edition
// ==========================================

const canvas = document.getElementById("canvas");
const ctx = canvas.getContext("2d");
const scoreEl = document.getElementById("score");

let W = window.innerWidth;
let H = window.innerHeight;
canvas.width = W;
canvas.height = H;

window.addEventListener("resize", () => {
  W = window.innerWidth;
  H = window.innerHeight;
  canvas.width = W;
  canvas.height = H;
});

// ── Mouse ──
const mouse = { x: W / 2, y: H / 2 };
let clicking = false;
let strikeTimer = 0;

window.addEventListener("mousemove", e => {
  mouse.x = e.clientX;
  mouse.y = e.clientY;
});
window.addEventListener("mousedown", () => { clicking = true; });
window.addEventListener("mouseup", () => { clicking = false; });

// ── Utility ──
function lerp(a, b, t) { return a + (b - a) * t; }
function dist(ax, ay, bx, by) { return Math.hypot(bx - ax, by - ay); }
function angleBetween(ax, ay, bx, by) { return Math.atan2(by - ay, bx - ax); }
function clamp(v, lo, hi) { return Math.max(lo, Math.min(hi, v)); }

// ── Score ──
let score = 0;

// ========================================
// SAND PARTICLES (background decoration)
// ========================================
const sandGrains = [];
for (let i = 0; i < 120; i++) {
  sandGrains.push({
    x: Math.random() * W * 1.2,
    y: Math.random() * H * 1.2,
    r: 1 + Math.random() * 2.5,
    alpha: 0.15 + Math.random() * 0.2,
  });
}

function drawDesert() {
  // Gradient sand background
  const bg = ctx.createRadialGradient(W / 2, H / 2, 0, W / 2, H / 2, Math.max(W, H) * 0.7);
  bg.addColorStop(0, "#e8d5a8");
  bg.addColorStop(0.6, "#d4bc8a");
  bg.addColorStop(1, "#b89e6c");
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, W, H);

  // Sand grains / pebbles
  for (const g of sandGrains) {
    ctx.beginPath();
    ctx.arc(g.x % W, g.y % H, g.r, 0, Math.PI * 2);
    ctx.fillStyle = `rgba(160,130,80,${g.alpha})`;
    ctx.fill();
  }
}

// ========================================
// SCORPION
// ========================================
const SEGMENT_COUNT = 28;
const segments = [];
for (let i = 0; i < SEGMENT_COUNT; i++) {
  segments.push({ x: W / 2, y: H / 2 });
}

function updateScorpion() {
  // Head follows mouse smoothly
  segments[0].x = lerp(segments[0].x, mouse.x, 0.12);
  segments[0].y = lerp(segments[0].y, mouse.y, 0.12);

  // Chain: each segment follows the previous one at a fixed distance
  const spacing = 7;
  for (let i = 1; i < SEGMENT_COUNT; i++) {
    const prev = segments[i - 1];
    const cur = segments[i];
    const a = angleBetween(cur.x, cur.y, prev.x, prev.y);
    const d = dist(cur.x, cur.y, prev.x, prev.y);
    if (d > spacing) {
      cur.x += Math.cos(a) * (d - spacing);
      cur.y += Math.sin(a) * (d - spacing);
    }
  }
}

// ── Draw helpers ──
function fillEllipse(cx, cy, rx, ry, angle, color) {
  ctx.save();
  ctx.translate(cx, cy);
  ctx.rotate(angle);
  ctx.beginPath();
  ctx.ellipse(0, 0, rx, ry, 0, 0, Math.PI * 2);
  ctx.fillStyle = color;
  ctx.fill();
  ctx.restore();
}

function fillEllipseGrad(cx, cy, rx, ry, angle, c1, c2) {
  ctx.save();
  ctx.translate(cx, cy);
  ctx.rotate(angle);
  const g = ctx.createRadialGradient(0, -ry * 0.3, 0, 0, 0, Math.max(rx, ry));
  g.addColorStop(0, c1);
  g.addColorStop(1, c2);
  ctx.beginPath();
  ctx.ellipse(0, 0, rx, ry, 0, 0, Math.PI * 2);
  ctx.fillStyle = g;
  ctx.fill();
  ctx.restore();
}

function drawThickLine(x1, y1, x2, y2, w, color) {
  ctx.beginPath();
  ctx.strokeStyle = color;
  ctx.lineWidth = w;
  ctx.lineCap = "round";
  ctx.moveTo(x1, y1);
  ctx.lineTo(x2, y2);
  ctx.stroke();
}

// ── Draw the scorpion body ──
function drawScorpionBody() {
  const headSeg = segments[0];
  const neckSeg = segments[1];
  const headAng = angleBetween(neckSeg.x, neckSeg.y, headSeg.x, headSeg.y);

  // === BODY SEGMENTS (mesosoma: segments 2–12) ===
  for (let i = 12; i >= 2; i--) {
    const s = segments[i];
    const prev = segments[i - 1];
    const a = angleBetween(prev.x, prev.y, s.x, s.y);
    // Width tapers from center
    const t = (i - 2) / 10;
    const rx = 10 + Math.sin(t * Math.PI) * 6;
    const ry = 6 + Math.sin(t * Math.PI) * 4;
    fillEllipseGrad(s.x, s.y, rx, ry, a, "#6b4226", "#3b1f0e");

    // Segment divider line
    if (i > 2) {
      const perpX = -Math.sin(a);
      const perpY = Math.cos(a);
      ctx.beginPath();
      ctx.moveTo(s.x + perpX * rx * 0.7, s.y + perpY * rx * 0.7);
      ctx.lineTo(s.x - perpX * rx * 0.7, s.y - perpY * rx * 0.7);
      ctx.strokeStyle = "rgba(20,10,0,0.3)";
      ctx.lineWidth = 0.8;
      ctx.stroke();
    }
  }

  // === HEAD (cephalothorax) ===
  fillEllipseGrad(headSeg.x, headSeg.y, 14, 11, headAng, "#7a4e2d", "#4a2810");

  // Eyes
  const eyeOff = 5;
  const perpHX = -Math.sin(headAng);
  const perpHY = Math.cos(headAng);
  const fwdX = Math.cos(headAng);
  const fwdY = Math.sin(headAng);

  const eye1x = headSeg.x + perpHX * eyeOff + fwdX * 4;
  const eye1y = headSeg.y + perpHY * eyeOff + fwdY * 4;
  const eye2x = headSeg.x - perpHX * eyeOff + fwdX * 4;
  const eye2y = headSeg.y - perpHY * eyeOff + fwdY * 4;

  ctx.beginPath(); ctx.arc(eye1x, eye1y, 2, 0, Math.PI * 2);
  ctx.fillStyle = "#111"; ctx.fill();
  ctx.beginPath(); ctx.arc(eye1x - 0.5, eye1y - 0.5, 0.7, 0, Math.PI * 2);
  ctx.fillStyle = "#fff"; ctx.fill();

  ctx.beginPath(); ctx.arc(eye2x, eye2y, 2, 0, Math.PI * 2);
  ctx.fillStyle = "#111"; ctx.fill();
  ctx.beginPath(); ctx.arc(eye2x - 0.5, eye2y - 0.5, 0.7, 0, Math.PI * 2);
  ctx.fillStyle = "#fff"; ctx.fill();

  // === PINCERS (Chelae / Pedipalps) ===
  drawPincer(headSeg, headAng, 1);   // left
  drawPincer(headSeg, headAng, -1);  // right

  // === LEGS (4 pairs, from segments 3–10) ===
  const legSegments = [3, 5, 7, 9];
  const time = performance.now() / 1000;
  for (let li = 0; li < legSegments.length; li++) {
    const si = legSegments[li];
    const s = segments[si];
    const prev = segments[si - 1];
    const a = angleBetween(prev.x, prev.y, s.x, s.y);
    const perpLX = -Math.sin(a);
    const perpLY = Math.cos(a);

    // Animate legs with a walking wave
    const wave = Math.sin(time * 8 + li * 1.5) * 4;

    for (const side of [1, -1]) {
      const baseX = s.x + perpLX * 8 * side;
      const baseY = s.y + perpLY * 8 * side;

      const jointX = baseX + perpLX * (18 + li * 1.5) * side + Math.cos(a) * wave * side;
      const jointY = baseY + perpLY * (18 + li * 1.5) * side + Math.sin(a) * wave * side;

      const footX = jointX + perpLX * (12 + li) * side - Math.cos(a) * (10 + wave);
      const footY = jointY + perpLY * (12 + li) * side - Math.sin(a) * (10 + wave);

      // Upper leg
      drawThickLine(baseX, baseY, jointX, jointY, 3, "#5a3318");
      // Lower leg
      drawThickLine(jointX, jointY, footX, footY, 2.2, "#4a2510");
      // Foot dot
      ctx.beginPath(); ctx.arc(footX, footY, 2, 0, Math.PI * 2);
      ctx.fillStyle = "#3a1a08"; ctx.fill();
    }
  }

  // === TAIL (metasoma: segments 13–27) ===
  drawTail();
}

// ── Pincer ──
function drawPincer(headSeg, headAng, side) {
  const fwdX = Math.cos(headAng);
  const fwdY = Math.sin(headAng);
  const perpX = -Math.sin(headAng) * side;
  const perpY = Math.cos(headAng) * side;

  // Arm segments
  const baseX = headSeg.x + fwdX * 10 + perpX * 8;
  const baseY = headSeg.y + fwdY * 10 + perpY * 8;

  const midX = baseX + fwdX * 14 + perpX * 14;
  const midY = baseY + fwdY * 14 + perpY * 14;

  const tipX = midX + fwdX * 16 + perpX * 6;
  const tipY = midY + fwdY * 16 + perpY * 6;

  // Draw arm
  drawThickLine(headSeg.x, headSeg.y, baseX, baseY, 5, "#5a3318");
  drawThickLine(baseX, baseY, midX, midY, 5.5, "#6b4226");

  // Claw hand (ellipse)
  const clawAng = angleBetween(midX, midY, tipX, tipY);
  fillEllipseGrad(tipX, tipY, 10, 7, clawAng, "#7a4e2d", "#4a2810");

  // Claw fingers (two curved lines)
  const claw1X = tipX + Math.cos(clawAng - 0.3 * side) * 14;
  const claw1Y = tipY + Math.sin(clawAng - 0.3 * side) * 14;
  const claw2X = tipX + Math.cos(clawAng + 0.5 * side) * 12;
  const claw2Y = tipY + Math.sin(clawAng + 0.5 * side) * 12;

  drawThickLine(tipX, tipY, claw1X, claw1Y, 3, "#5a3318");
  drawThickLine(tipX, tipY, claw2X, claw2Y, 3, "#5a3318");

  // Claw tips
  ctx.beginPath(); ctx.arc(claw1X, claw1Y, 2, 0, Math.PI * 2);
  ctx.fillStyle = "#2a0e04"; ctx.fill();
  ctx.beginPath(); ctx.arc(claw2X, claw2Y, 2, 0, Math.PI * 2);
  ctx.fillStyle = "#2a0e04"; ctx.fill();
}

// ── Tail with stinger ──
function drawTail() {
  const tailStart = 13;
  const tailEnd = SEGMENT_COUNT - 1;
  const tailLen = tailEnd - tailStart;

  for (let i = tailStart; i <= tailEnd; i++) {
    const s = segments[i];
    const prev = segments[i - 1];
    const a = angleBetween(prev.x, prev.y, s.x, s.y);

    // Tail rises up as it goes — simulate the curl
    const t = (i - tailStart) / tailLen;
    const lift = Math.sin(t * Math.PI) * (35 + t * 20);

    const dx = s.x;
    const dy = s.y - lift;

    // Tail segments get thinner
    const radius = 7 - t * 4;

    fillEllipseGrad(dx, dy, radius + 2, radius, a, "#6b4226", "#2a0e04");

    // Connect segments
    if (i < tailEnd) {
      const ns = segments[i + 1];
      const nt = ((i + 1) - tailStart) / tailLen;
      const nLift = Math.sin(nt * Math.PI) * (35 + nt * 20);
      drawThickLine(dx, dy, ns.x, ns.y - nLift, radius * 1.2, "#4a2810");
    }
  }

  // === STINGER (telson) ===
  const lastSeg = segments[tailEnd];
  const prevSeg = segments[tailEnd - 1];
  const tailAng = angleBetween(prevSeg.x, prevSeg.y, lastSeg.x, lastSeg.y);

  const liftLast = Math.sin(1.0 * Math.PI) * (35 + 1.0 * 20);
  const stBaseX = lastSeg.x;
  const stBaseY = lastSeg.y - liftLast;

  // Venom bulb
  fillEllipseGrad(stBaseX, stBaseY, 6, 5, tailAng, "#8b5e3c", "#4a2810");

  // Stinger needle
  const stTipX = stBaseX + Math.cos(tailAng - 0.8) * 18;
  const stTipY = stBaseY + Math.sin(tailAng - 0.8) * 18 - 8;

  drawThickLine(stBaseX, stBaseY, stTipX, stTipY, 2.5, "#2a0e04");

  // Venom glow (pulsing)
  const pulse = 0.4 + Math.sin(performance.now() / 200) * 0.3;
  ctx.beginPath();
  ctx.arc(stTipX, stTipY, 5, 0, Math.PI * 2);
  ctx.fillStyle = `rgba(0, 220, 80, ${pulse})`;
  ctx.fill();
  ctx.beginPath();
  ctx.arc(stTipX, stTipY, 2, 0, Math.PI * 2);
  ctx.fillStyle = "#00ff66";
  ctx.fill();

  // If striking, draw a flash
  if (strikeTimer > 0) {
    ctx.beginPath();
    ctx.arc(stTipX, stTipY, 12 + strikeTimer * 2, 0, Math.PI * 2);
    ctx.fillStyle = `rgba(0, 255, 100, ${strikeTimer / 15})`;
    ctx.fill();
  }
}

// ========================================
// PREY (Bugs)
// ========================================
const bugs = [];
const MAX_BUGS = 6;

function spawnBug() {
  if (bugs.length >= MAX_BUGS) return;
  const edge = Math.floor(Math.random() * 4);
  let x, y;
  if (edge === 0) { x = Math.random() * W; y = -20; }
  else if (edge === 1) { x = W + 20; y = Math.random() * H; }
  else if (edge === 2) { x = Math.random() * W; y = H + 20; }
  else { x = -20; y = Math.random() * H; }

  bugs.push({
    x, y,
    targetX: 100 + Math.random() * (W - 200),
    targetY: 100 + Math.random() * (H - 200),
    speed: 1.2 + Math.random() * 1.5,
    angle: 0,
    size: 5 + Math.random() * 4,
    legPhase: Math.random() * Math.PI * 2,
    color: Math.random() > 0.5 ? "#2a1a08" : "#1a2a08",
    alive: true,
    deathTimer: 0,
    retargetCD: 0,
    // Flee behavior
    fleeing: false,
  });
}

function updateBugs() {
  const headX = segments[0].x;
  const headY = segments[0].y;

  for (let i = bugs.length - 1; i >= 0; i--) {
    const b = bugs[i];

    if (!b.alive) {
      b.deathTimer--;
      if (b.deathTimer <= 0) bugs.splice(i, 1);
      continue;
    }

    // Flee from scorpion if close
    const dToHead = dist(b.x, b.y, headX, headY);
    if (dToHead < 120) {
      b.fleeing = true;
      const fleeAng = angleBetween(headX, headY, b.x, b.y);
      b.targetX = b.x + Math.cos(fleeAng) * 200;
      b.targetY = b.y + Math.sin(fleeAng) * 200;
      b.targetX = clamp(b.targetX, 50, W - 50);
      b.targetY = clamp(b.targetY, 50, H - 50);
    } else {
      b.fleeing = false;
    }

    // Move to target
    const dToTarget = dist(b.x, b.y, b.targetX, b.targetY);
    b.angle = angleBetween(b.x, b.y, b.targetX, b.targetY);
    const spd = b.fleeing ? b.speed * 2.2 : b.speed;

    if (dToTarget > 5) {
      b.x += Math.cos(b.angle) * spd;
      b.y += Math.sin(b.angle) * spd;
    } else {
      b.retargetCD--;
      if (b.retargetCD <= 0) {
        b.targetX = 80 + Math.random() * (W - 160);
        b.targetY = 80 + Math.random() * (H - 160);
        b.retargetCD = 60 + Math.random() * 120;
      }
    }

    // Out of bounds → retarget
    if (b.x < -50 || b.x > W + 50 || b.y < -50 || b.y > H + 50) {
      b.targetX = W / 2 + (Math.random() - 0.5) * W * 0.6;
      b.targetY = H / 2 + (Math.random() - 0.5) * H * 0.6;
    }

    b.legPhase += 0.15;
  }
}

function drawBugs() {
  const time = performance.now() / 1000;
  for (const b of bugs) {
    if (!b.alive) {
      // Death animation — small poof
      ctx.globalAlpha = b.deathTimer / 20;
      ctx.beginPath(); ctx.arc(b.x, b.y, b.size + (20 - b.deathTimer), 0, Math.PI * 2);
      ctx.fillStyle = "rgba(100,60,20,0.5)";
      ctx.fill();
      ctx.globalAlpha = 1;
      continue;
    }

    ctx.save();
    ctx.translate(b.x, b.y);
    ctx.rotate(b.angle);

    // Body
    ctx.beginPath();
    ctx.ellipse(0, 0, b.size, b.size * 0.55, 0, 0, Math.PI * 2);
    ctx.fillStyle = b.color;
    ctx.fill();

    // Head
    ctx.beginPath();
    ctx.ellipse(b.size * 0.7, 0, b.size * 0.4, b.size * 0.35, 0, 0, Math.PI * 2);
    ctx.fillStyle = "#1a0a00";
    ctx.fill();

    // Antennae
    ctx.beginPath();
    ctx.moveTo(b.size * 0.9, -1);
    ctx.lineTo(b.size * 1.6, -b.size * 0.6 + Math.sin(time * 6) * 2);
    ctx.strokeStyle = "#3a2a1a";
    ctx.lineWidth = 0.8;
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(b.size * 0.9, 1);
    ctx.lineTo(b.size * 1.6, b.size * 0.6 + Math.cos(time * 6) * 2);
    ctx.stroke();

    // 3 pairs of legs
    for (let l = 0; l < 3; l++) {
      const offset = (l - 1) * b.size * 0.45;
      const wave = Math.sin(b.legPhase + l * 2) * 3;
      // Left leg
      ctx.beginPath();
      ctx.moveTo(offset, -b.size * 0.4);
      ctx.lineTo(offset - wave, -b.size * 1.2 - wave);
      ctx.strokeStyle = "#3a2a1a";
      ctx.lineWidth = 1.2;
      ctx.stroke();
      // Right leg
      ctx.beginPath();
      ctx.moveTo(offset, b.size * 0.4);
      ctx.lineTo(offset + wave, b.size * 1.2 + wave);
      ctx.stroke();
    }

    ctx.restore();
  }
}

// ========================================
// STRIKE (Click Attack)
// ========================================
function handleStrike() {
  if (clicking && strikeTimer <= 0) {
    strikeTimer = 15;
    // Check if any bug is near the scorpion head
    const headX = segments[0].x;
    const headY = segments[0].y;
    for (const b of bugs) {
      if (!b.alive) continue;
      if (dist(headX, headY, b.x, b.y) < 60) {
        b.alive = false;
        b.deathTimer = 20;
        score++;
        scoreEl.textContent = score;
      }
    }
  }
  if (strikeTimer > 0) strikeTimer--;
}

// ========================================
// SHADOW
// ========================================
function drawScorpionShadow() {
  ctx.save();
  ctx.globalAlpha = 0.12;
  ctx.fillStyle = "#000";

  // Body shadow
  for (let i = 0; i < 13; i++) {
    const s = segments[i];
    const t = i / 12;
    const r = 8 + Math.sin(t * Math.PI) * 5;
    ctx.beginPath();
    ctx.ellipse(s.x + 4, s.y + 6, r, r * 0.6, 0, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
}

// ========================================
// GAME LOOP
// ========================================
let spawnCD = 0;

function gameLoop() {
  ctx.clearRect(0, 0, W, H);

  drawDesert();

  // Spawn bugs
  spawnCD--;
  if (spawnCD <= 0 && bugs.length < MAX_BUGS) {
    spawnBug();
    spawnCD = 90 + Math.random() * 120;
  }

  updateBugs();
  updateScorpion();
  handleStrike();

  drawBugs();
  drawScorpionShadow();
  drawScorpionBody();

  requestAnimationFrame(gameLoop);
}

// Start
spawnBug();
spawnBug();
gameLoop();
