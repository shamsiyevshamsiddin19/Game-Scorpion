// ==========================================
// SCORPION HUNTER GAME — Ultra Realistic
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
function angle(ax, ay, bx, by) { return Math.atan2(by - ay, bx - ax); }
function clamp(v, lo, hi) { return Math.max(lo, Math.min(hi, v)); }

let score = 0;

// ========================================
// DESERT BACKGROUND
// ========================================
const pebbles = [];
for (let i = 0; i < 80; i++) {
  pebbles.push({
    x: Math.random() * 3000,
    y: Math.random() * 2000,
    r: 1.5 + Math.random() * 3,
    a: 0.08 + Math.random() * 0.12,
  });
}

function drawDesert() {
  const bg = ctx.createRadialGradient(W / 2, H / 2, 0, W / 2, H / 2, Math.max(W, H) * 0.7);
  bg.addColorStop(0, "#e8d5a8");
  bg.addColorStop(0.5, "#d9c48e");
  bg.addColorStop(1, "#b89e6c");
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, W, H);

  for (const p of pebbles) {
    ctx.beginPath();
    ctx.arc(p.x % W, p.y % H, p.r, 0, Math.PI * 2);
    ctx.fillStyle = `rgba(140,115,65,${p.a})`;
    ctx.fill();
  }
}

// ========================================
// SCORPION SPINE (chain of joints)
// ========================================
const SPINE_COUNT = 22;
const spine = [];
for (let i = 0; i < SPINE_COUNT; i++) {
  spine.push({ x: W / 2, y: H / 2 });
}

// Segment spacing
const SPACING = 6;

function updateSpine() {
  // Head follows mouse
  spine[0].x = lerp(spine[0].x, mouse.x, 0.10);
  spine[0].y = lerp(spine[0].y, mouse.y, 0.10);

  for (let i = 1; i < SPINE_COUNT; i++) {
    const prev = spine[i - 1];
    const cur = spine[i];
    const a = angle(cur.x, cur.y, prev.x, prev.y);
    const d = dist(cur.x, cur.y, prev.x, prev.y);
    if (d > SPACING) {
      cur.x += Math.cos(a) * (d - SPACING);
      cur.y += Math.sin(a) * (d - SPACING);
    }
  }
}

// ========================================
// DRAWING HELPERS
// ========================================
function fillOval(cx, cy, rx, ry, ang, color) {
  ctx.save();
  ctx.translate(cx, cy);
  ctx.rotate(ang);
  ctx.beginPath();
  ctx.ellipse(0, 0, rx, ry, 0, 0, Math.PI * 2);
  ctx.fillStyle = color;
  ctx.fill();
  ctx.restore();
}

function fillOvalGrad(cx, cy, rx, ry, ang, c1, c2) {
  ctx.save();
  ctx.translate(cx, cy);
  ctx.rotate(ang);
  const g = ctx.createRadialGradient(-rx * 0.25, -ry * 0.35, 0, 0, 0, Math.max(rx, ry) * 1.1);
  g.addColorStop(0, c1);
  g.addColorStop(1, c2);
  ctx.beginPath();
  ctx.ellipse(0, 0, rx, ry, 0, 0, Math.PI * 2);
  ctx.fillStyle = g;
  ctx.fill();
  ctx.restore();
}

function thickLine(x1, y1, x2, y2, w, color) {
  ctx.beginPath();
  ctx.strokeStyle = color;
  ctx.lineWidth = w;
  ctx.lineCap = "round";
  ctx.lineJoin = "round";
  ctx.moveTo(x1, y1);
  ctx.lineTo(x2, y2);
  ctx.stroke();
}

// ========================================
// SCORPION SHADOW
// ========================================
function drawShadow() {
  ctx.save();
  ctx.globalAlpha = 0.10;
  // Body shadow
  for (let i = 0; i < 14; i++) {
    const s = spine[i];
    const t = i / 13;
    let rw;
    if (i === 0) rw = 12;
    else if (i <= 3) rw = 14 + Math.sin(((i - 1) / 2) * Math.PI) * 3;
    else if (i <= 10) rw = 12 + Math.sin(((i - 4) / 6) * Math.PI) * 5;
    else rw = 7 - (i - 10) * 1.5;
    ctx.beginPath();
    ctx.ellipse(s.x + 5, s.y + 7, Math.max(rw, 2), Math.max(rw * 0.6, 1.5), 0, 0, Math.PI * 2);
    ctx.fillStyle = "#000";
    ctx.fill();
  }
  ctx.restore();
}

// ========================================
// SCORPION BODY
// ========================================
function drawScorpion() {
  const time = performance.now() / 1000;

  // ── BODY SEGMENTS (mesosoma: spine indices 3–10) ──
  // Draw back-to-front so front overlaps
  for (let i = 10; i >= 3; i--) {
    const s = spine[i];
    const prev = spine[i - 1];
    const a = angle(prev.x, prev.y, s.x, s.y);
    const t = (i - 3) / 7; // 0..1
    // Wider in center
    const rw = 11 + Math.sin(t * Math.PI) * 6;
    const rh = 8 + Math.sin(t * Math.PI) * 3;

    // Main segment
    fillOvalGrad(s.x, s.y, rw, rh, a, "#7a5030", "#3a1a08");

    // Chitinous ridge (darker edge)
    ctx.save();
    ctx.translate(s.x, s.y);
    ctx.rotate(a);
    ctx.beginPath();
    ctx.ellipse(0, 0, rw, rh, 0, 0, Math.PI * 2);
    ctx.strokeStyle = "rgba(30,12,0,0.35)";
    ctx.lineWidth = 1;
    ctx.stroke();
    ctx.restore();

    // Segment crease line
    if (i > 3) {
      const px = -Math.sin(a);
      const py = Math.cos(a);
      ctx.beginPath();
      ctx.moveTo(s.x + px * rw * 0.65, s.y + py * rw * 0.65);
      ctx.lineTo(s.x - px * rw * 0.65, s.y - py * rw * 0.65);
      ctx.strokeStyle = "rgba(20,8,0,0.2)";
      ctx.lineWidth = 0.7;
      ctx.stroke();
    }
  }

  // ── CEPHALOTHORAX (head plate: spine 0–2) ──
  const headAng = angle(spine[2].x, spine[2].y, spine[0].x, spine[0].y);
  const fwdX = Math.cos(headAng);
  const fwdY = Math.sin(headAng);
  const sideX = -Math.sin(headAng);
  const sideY = Math.cos(headAng);

  // Wide shield plate
  const hx = (spine[0].x + spine[1].x + spine[2].x) / 3;
  const hy = (spine[0].y + spine[1].y + spine[2].y) / 3;
  fillOvalGrad(hx, hy, 16, 13, headAng, "#85593a", "#4a2810");

  // Head front piece
  fillOvalGrad(spine[0].x, spine[0].y, 11, 9, headAng, "#8a6040", "#503018");

  // Outline
  ctx.save();
  ctx.translate(hx, hy);
  ctx.rotate(headAng);
  ctx.beginPath();
  ctx.ellipse(0, 0, 16, 13, 0, 0, Math.PI * 2);
  ctx.strokeStyle = "rgba(30,12,0,0.3)";
  ctx.lineWidth = 1;
  ctx.stroke();
  ctx.restore();

  // ── EYES (2 pairs: median + lateral) ──
  // Median eyes (top center, close together)
  for (const side of [-1, 1]) {
    const ex = spine[0].x + fwdX * 4 + sideX * 2.5 * side;
    const ey = spine[0].y + fwdY * 4 + sideY * 2.5 * side;
    ctx.beginPath(); ctx.arc(ex, ey, 1.8, 0, Math.PI * 2);
    ctx.fillStyle = "#0a0a0a"; ctx.fill();
    ctx.beginPath(); ctx.arc(ex + 0.4, ey - 0.4, 0.6, 0, Math.PI * 2);
    ctx.fillStyle = "rgba(255,255,255,0.5)"; ctx.fill();
  }

  // ── PINCERS (Pedipalps) — big and realistic ──
  drawPincer(spine[0], headAng, 1, time);
  drawPincer(spine[0], headAng, -1, time);

  // ── LEGS (4 pairs, from body segments 4,5,7,8) ──
  const legIndices = [4, 6, 8, 9];
  for (let li = 0; li < legIndices.length; li++) {
    const si = legIndices[li];
    const s = spine[si];
    const prev = spine[si - 1];
    const a = angle(prev.x, prev.y, s.x, s.y);
    const px = -Math.sin(a);
    const py = Math.cos(a);

    // Walk cycle
    const wave = Math.sin(time * 7 + li * 1.8) * 5;

    for (const side of [1, -1]) {
      const bx = s.x + px * 10 * side;
      const by = s.y + py * 10 * side;

      // "Coxa" joint (out and slightly forward/back)
      const jx = bx + px * (16 + li * 1.5) * side + fwdX * wave * 0.5;
      const jy = by + py * (16 + li * 1.5) * side + fwdY * wave * 0.5;

      // "Tarsus" foot (down & back)
      const fx = jx + px * (10 + li) * side - Math.cos(a) * (8 + wave * 0.8);
      const fy = jy + py * (10 + li) * side - Math.sin(a) * (8 + wave * 0.8);

      // Upper leg (femur) — thicker
      thickLine(bx, by, jx, jy, 3.2, "#5a3318");
      // Lower leg (tibia) — thinner
      thickLine(jx, jy, fx, fy, 2.2, "#4a2510");
      // Foot point
      ctx.beginPath(); ctx.arc(fx, fy, 1.8, 0, Math.PI * 2);
      ctx.fillStyle = "#3a1808"; ctx.fill();
    }
  }

  // ── TAIL (metasoma: spine 11–21) ──
  drawTail(time);
}

// ========================================
// PINCER
// ========================================
function drawPincer(head, headAng, side, time) {
  const fwdX = Math.cos(headAng);
  const fwdY = Math.sin(headAng);
  const px = -Math.sin(headAng) * side;
  const py = Math.cos(headAng) * side;

  // Shoulder
  const sx = head.x + fwdX * 6 + px * 10;
  const sy = head.y + fwdY * 6 + py * 10;

  // Elbow (brachium) — out and forward
  const ex = sx + fwdX * 16 + px * 16;
  const ey = sy + fwdY * 16 + py * 16;

  // Wrist (manus) — more forward
  const wx = ex + fwdX * 14 + px * 4;
  const wy = ey + fwdY * 14 + py * 4;

  // Arm segments
  thickLine(head.x, head.y, sx, sy, 5.5, "#5a3318");
  thickLine(sx, sy, ex, ey, 6, "#6b4228");

  // Elbow joint blob
  fillOvalGrad(ex, ey, 6, 5, headAng, "#7a5030", "#4a2810");

  thickLine(ex, ey, wx, wy, 5, "#6b4228");

  // Manus (claw hand) — oval
  const clawAng = angle(ex, ey, wx, wy);
  fillOvalGrad(wx, wy, 11, 8, clawAng, "#8a6040", "#4a2810");
  // Outline
  ctx.save();
  ctx.translate(wx, wy);
  ctx.rotate(clawAng);
  ctx.beginPath();
  ctx.ellipse(0, 0, 11, 8, 0, 0, Math.PI * 2);
  ctx.strokeStyle = "rgba(30,12,0,0.3)";
  ctx.lineWidth = 0.8;
  ctx.stroke();
  ctx.restore();

  // Pincer fingers (fixed + movable)
  const openAngle = 0.25 + Math.sin(time * 3) * 0.08; // Subtle open/close

  // Fixed finger (straight forward)
  const f1x = wx + Math.cos(clawAng - openAngle * side) * 18;
  const f1y = wy + Math.sin(clawAng - openAngle * side) * 18;

  // Movable finger
  const f2x = wx + Math.cos(clawAng + openAngle * 1.2 * side) * 16;
  const f2y = wy + Math.sin(clawAng + openAngle * 1.2 * side) * 16;

  // Draw fingers with taper
  ctx.beginPath();
  ctx.moveTo(wx + Math.cos(clawAng) * 5, wy + Math.sin(clawAng) * 5);
  ctx.lineTo(f1x, f1y);
  ctx.strokeStyle = "#5a3318";
  ctx.lineWidth = 3.5;
  ctx.lineCap = "round";
  ctx.stroke();

  ctx.beginPath();
  ctx.moveTo(wx + Math.cos(clawAng) * 5, wy + Math.sin(clawAng) * 5);
  ctx.lineTo(f2x, f2y);
  ctx.strokeStyle = "#5a3318";
  ctx.lineWidth = 3;
  ctx.lineCap = "round";
  ctx.stroke();

  // Finger tips (sharp)
  ctx.beginPath(); ctx.arc(f1x, f1y, 1.5, 0, Math.PI * 2);
  ctx.fillStyle = "#2a0e04"; ctx.fill();
  ctx.beginPath(); ctx.arc(f2x, f2y, 1.5, 0, Math.PI * 2);
  ctx.fillStyle = "#2a0e04"; ctx.fill();
}

// ========================================
// TAIL (curls upward like real scorpion)
// ========================================
function drawTail(time) {
  const TAIL_START = 11;
  const TAIL_END = SPINE_COUNT - 1;
  const tailLen = TAIL_END - TAIL_START;

  // We compute a visual "lifted" position for each tail segment
  // The tail curves upward: we simulate this by making segments appear
  // to shrink (perspective) and shift position as they "rise"

  const tailPoints = [];

  for (let i = TAIL_START; i <= TAIL_END; i++) {
    const s = spine[i];
    const t = (i - TAIL_START) / tailLen; // 0..1

    // Lift amount — rises then curves forward
    // The tail should rise from body level, peak at ~80%, then curve forward (down a bit for stinger)
    let lift;
    if (t < 0.85) {
      lift = Math.sin(t / 0.85 * Math.PI * 0.5) * 55; // rises up
    } else {
      const tt = (t - 0.85) / 0.15;
      lift = 55 - tt * 12; // drops slightly for stinger
    }

    // To simulate "upward" visually (top-down view), we shift segment positions
    // back toward the body center and make them smaller (perspective)
    const prev = spine[Math.max(i - 1, TAIL_START)];
    const bodyCenter = spine[6]; // middle of body

    // Scale factor (things higher up appear closer to center in top-down)
    const scale = 1 - lift * 0.004;

    // Visual position: nudge toward body center as it rises
    const vx = lerp(s.x, bodyCenter.x, lift * 0.006);
    const vy = lerp(s.y, bodyCenter.y, lift * 0.006);

    // Segment radius (gets thinner)
    const rw = 7 - t * 4.5;
    const rh = 5.5 - t * 3;

    tailPoints.push({ x: vx, y: vy, rw, rh, t, lift, scale });
  }

  // Draw tail shadow first (lower/flatter)
  ctx.save();
  ctx.globalAlpha = 0.08;
  for (let i = 0; i < tailPoints.length; i++) {
    const tp = tailPoints[i];
    ctx.beginPath();
    ctx.ellipse(tp.x + 4, tp.y + 5, tp.rw + 1, tp.rh, 0, 0, Math.PI * 2);
    ctx.fillStyle = "#000";
    ctx.fill();
  }
  ctx.restore();

  // Draw tail segments
  for (let i = 0; i < tailPoints.length; i++) {
    const tp = tailPoints[i];
    const si = TAIL_START + i;
    const prev = spine[Math.max(si - 1, TAIL_START)];
    const a = angle(prev.x, prev.y, spine[si].x, spine[si].y);

    // Color gets darker toward tip
    const r = Math.floor(lerp(122, 50, tp.t));
    const g = Math.floor(lerp(80, 25, tp.t));
    const b = Math.floor(lerp(48, 8, tp.t));
    const color1 = `rgb(${r + 20},${g + 15},${b + 10})`;
    const color2 = `rgb(${r - 10},${g - 8},${b - 4})`;

    fillOvalGrad(tp.x, tp.y, Math.max(tp.rw, 1.5), Math.max(tp.rh, 1.2), a, color1, color2);

    // Outline
    ctx.save();
    ctx.translate(tp.x, tp.y);
    ctx.rotate(a);
    ctx.beginPath();
    ctx.ellipse(0, 0, Math.max(tp.rw, 1.5), Math.max(tp.rh, 1.2), 0, 0, Math.PI * 2);
    ctx.strokeStyle = `rgba(30,12,0,${0.2 + tp.t * 0.15})`;
    ctx.lineWidth = 0.7;
    ctx.stroke();
    ctx.restore();

    // Connect to next
    if (i < tailPoints.length - 1) {
      const next = tailPoints[i + 1];
      thickLine(tp.x, tp.y, next.x, next.y, Math.max(tp.rw * 0.8, 1.2),
        `rgb(${r},${g},${b})`);
    }
  }

  // ── STINGER (telson) ──
  const lastTP = tailPoints[tailPoints.length - 1];
  const prevTP = tailPoints[tailPoints.length - 2];
  const stAng = angle(prevTP.x, prevTP.y, lastTP.x, lastTP.y);

  // Vesicle (venom bulb) — sits at end of tail
  fillOvalGrad(lastTP.x, lastTP.y, 5.5, 4.5, stAng, "#8a5a38", "#4a2810");

  // Aculeus (the sharp needle)
  // Points forward-ish (toward the body, like a real scorpion strike position)
  const needleAng = stAng + Math.PI * 0.15; // slight hook
  const tipX = lastTP.x + Math.cos(needleAng) * 14;
  const tipY = lastTP.y + Math.sin(needleAng) * 14;

  // Draw needle with taper using a triangle
  ctx.beginPath();
  const nSideX = -Math.sin(needleAng);
  const nSideY = Math.cos(needleAng);
  ctx.moveTo(lastTP.x + nSideX * 2.5, lastTP.y + nSideY * 2.5);
  ctx.lineTo(lastTP.x - nSideX * 2.5, lastTP.y - nSideY * 2.5);
  ctx.lineTo(tipX, tipY);
  ctx.closePath();
  ctx.fillStyle = "#1a0800";
  ctx.fill();

  // Venom droplet glow (pulsing)
  const pulse = 0.35 + Math.sin(time * 4) * 0.3;
  ctx.beginPath();
  ctx.arc(tipX, tipY, 4, 0, Math.PI * 2);
  ctx.fillStyle = `rgba(30, 200, 80, ${pulse * 0.5})`;
  ctx.fill();
  ctx.beginPath();
  ctx.arc(tipX, tipY, 1.8, 0, Math.PI * 2);
  ctx.fillStyle = `rgba(50, 255, 100, ${pulse})`;
  ctx.fill();

  // Strike flash
  if (strikeTimer > 0) {
    ctx.beginPath();
    ctx.arc(tipX, tipY, 8 + strikeTimer * 1.5, 0, Math.PI * 2);
    ctx.fillStyle = `rgba(50, 255, 120, ${strikeTimer / 20})`;
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
    tx: 100 + Math.random() * (W - 200),
    ty: 100 + Math.random() * (H - 200),
    speed: 1 + Math.random() * 1.2,
    ang: 0,
    size: 5 + Math.random() * 3,
    legPhase: Math.random() * Math.PI * 2,
    hue: Math.random() > 0.5 ? "#2a1a08" : "#1a2508",
    alive: true,
    deathTimer: 0,
    retargetCD: 0,
    fleeing: false,
  });
}

function updateBugs() {
  const hx = spine[0].x;
  const hy = spine[0].y;

  for (let i = bugs.length - 1; i >= 0; i--) {
    const b = bugs[i];

    if (!b.alive) {
      b.deathTimer--;
      if (b.deathTimer <= 0) bugs.splice(i, 1);
      continue;
    }

    const dHead = dist(b.x, b.y, hx, hy);
    if (dHead < 110) {
      b.fleeing = true;
      const fa = angle(hx, hy, b.x, b.y);
      b.tx = clamp(b.x + Math.cos(fa) * 250, 40, W - 40);
      b.ty = clamp(b.y + Math.sin(fa) * 250, 40, H - 40);
    } else {
      b.fleeing = false;
    }

    const dt = dist(b.x, b.y, b.tx, b.ty);
    b.ang = angle(b.x, b.y, b.tx, b.ty);
    const spd = b.fleeing ? b.speed * 2.5 : b.speed;

    if (dt > 4) {
      b.x += Math.cos(b.ang) * spd;
      b.y += Math.sin(b.ang) * spd;
    } else {
      b.retargetCD--;
      if (b.retargetCD <= 0) {
        b.tx = 60 + Math.random() * (W - 120);
        b.ty = 60 + Math.random() * (H - 120);
        b.retargetCD = 80 + Math.random() * 140;
      }
    }

    if (b.x < -60 || b.x > W + 60 || b.y < -60 || b.y > H + 60) {
      b.tx = W / 2 + (Math.random() - 0.5) * W * 0.5;
      b.ty = H / 2 + (Math.random() - 0.5) * H * 0.5;
    }

    b.legPhase += b.fleeing ? 0.25 : 0.12;
  }
}

function drawBugs() {
  const t = performance.now() / 1000;
  for (const b of bugs) {
    if (!b.alive) {
      ctx.globalAlpha = b.deathTimer / 20;
      ctx.beginPath();
      ctx.arc(b.x, b.y, b.size + (20 - b.deathTimer) * 0.5, 0, Math.PI * 2);
      ctx.fillStyle = "rgba(80,50,15,0.4)";
      ctx.fill();
      ctx.globalAlpha = 1;
      continue;
    }

    ctx.save();
    ctx.translate(b.x, b.y);
    ctx.rotate(b.ang);

    // Shadow
    ctx.globalAlpha = 0.12;
    ctx.beginPath();
    ctx.ellipse(2, 3, b.size + 1, b.size * 0.5, 0, 0, Math.PI * 2);
    ctx.fillStyle = "#000";
    ctx.fill();
    ctx.globalAlpha = 1;

    // Abdomen
    ctx.beginPath();
    ctx.ellipse(-b.size * 0.2, 0, b.size * 0.9, b.size * 0.52, 0, 0, Math.PI * 2);
    ctx.fillStyle = b.hue;
    ctx.fill();

    // Thorax
    ctx.beginPath();
    ctx.ellipse(b.size * 0.5, 0, b.size * 0.45, b.size * 0.38, 0, 0, Math.PI * 2);
    ctx.fillStyle = "#1a0a00";
    ctx.fill();

    // Head
    ctx.beginPath();
    ctx.ellipse(b.size * 0.85, 0, b.size * 0.3, b.size * 0.28, 0, 0, Math.PI * 2);
    ctx.fillStyle = "#100800";
    ctx.fill();

    // Antennae
    for (const s of [-1, 1]) {
      ctx.beginPath();
      ctx.moveTo(b.size * 0.95, s * 1.5);
      const ax = b.size * 1.7 + Math.sin(t * 5 + s) * 2;
      const ay = s * (b.size * 0.7 + Math.sin(t * 6 + s * 2) * 2);
      ctx.quadraticCurveTo(b.size * 1.3, ay * 0.5, ax, ay);
      ctx.strokeStyle = "#3a2a18";
      ctx.lineWidth = 0.6;
      ctx.stroke();
    }

    // 3 pairs of legs
    for (let l = 0; l < 3; l++) {
      const off = (l - 1) * b.size * 0.4;
      const w = Math.sin(b.legPhase + l * 2.1) * 3;
      for (const s of [-1, 1]) {
        ctx.beginPath();
        ctx.moveTo(off, s * b.size * 0.35);
        const jx = off + w * 0.5;
        const jy = s * (b.size * 0.8 + Math.abs(w) * 0.3);
        const fx = off - w * 0.3;
        const fy = s * (b.size * 1.3 + Math.abs(w) * 0.2);
        ctx.lineTo(jx, jy);
        ctx.lineTo(fx, fy);
        ctx.strokeStyle = "#3a2a18";
        ctx.lineWidth = 0.9;
        ctx.stroke();
      }
    }

    ctx.restore();
  }
}

// ========================================
// STRIKE
// ========================================
function handleStrike() {
  if (clicking && strikeTimer <= 0) {
    strikeTimer = 15;
    const hx = spine[0].x;
    const hy = spine[0].y;
    for (const b of bugs) {
      if (!b.alive) continue;
      if (dist(hx, hy, b.x, b.y) < 55) {
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
// GAME LOOP
// ========================================
let spawnCD = 0;

function gameLoop() {
  ctx.clearRect(0, 0, W, H);
  drawDesert();

  spawnCD--;
  if (spawnCD <= 0 && bugs.length < MAX_BUGS) {
    spawnBug();
    spawnCD = 80 + Math.random() * 100;
  }

  updateBugs();
  updateSpine();
  handleStrike();

  drawBugs();
  drawShadow();
  drawScorpion();

  requestAnimationFrame(gameLoop);
}

spawnBug();
spawnBug();
gameLoop();
