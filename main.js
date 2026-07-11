// ==========================================
// DESERT HUNTER GAME - ENHANCED EDITION
// ==========================================

const canvas = document.getElementById("canvas");
const ctx = canvas.getContext("2d");
const scoreEl = document.getElementById("score");
const selectScreen = document.getElementById("selectScreen");
const gameUI = document.getElementById("gameUI");
const backBtn = document.getElementById("backBtn");
const animalCards = document.querySelectorAll(".animal-card");
const infoTitle = document.getElementById("infoTitle");

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

// ── Game State ──
let currentAnimalType = null; 
let score = 0;
let lastTime = 0;
let time = 0;
let animFrame;

// Combo System
let comboCount = 0;
let comboTimer = 0;
const COMBO_MAX_TIME = 2.5; // seconds to keep combo alive

// Screen Shake
let shakeIntensity = 0;

// ── Mouse ──
const mouse = { x: W / 2, y: H / 2, down: false, clicked: false };
window.addEventListener("mousemove", e => {
  mouse.x = e.clientX;
  mouse.y = e.clientY;
});
window.addEventListener("mousedown", () => { mouse.down = true; mouse.clicked = true; });
window.addEventListener("mouseup", () => { mouse.down = false; });

// ── Utility ──
function lerp(a, b, t) { return a + (b - a) * t; }
function dist(ax, ay, bx, by) { return Math.hypot(bx - ax, by - ay); }
function angle(ax, ay, bx, by) { return Math.atan2(by - ay, bx - ax); }
function clamp(v, lo, hi) { return Math.max(lo, Math.min(hi, v)); }

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

function addShake(amt) {
  shakeIntensity = Math.min(shakeIntensity + amt, 15);
}

// ========================================
// VFX: PARTICLES & FLOATING TEXT
// ========================================
const particles = [];
const floatingTexts = [];

function spawnParticles(x, y, color, count, speedBase, isDust = false) {
  for (let i = 0; i < count; i++) {
    const ang = Math.random() * Math.PI * 2;
    const spd = Math.random() * speedBase;
    particles.push({
      x, y,
      vx: Math.cos(ang) * spd,
      vy: Math.sin(ang) * spd,
      life: 1.0,
      decay: 0.02 + Math.random() * 0.03,
      r: (isDust ? 3 : 2) + Math.random() * 3,
      color,
      isDust
    });
  }
}

function spawnFloatingText(x, y, text, color, scale = 1) {
  floatingTexts.push({
    x, y,
    text, color, scale,
    life: 1.0,
    vy: -1 - Math.random()
  });
}

function updateAndDrawVFX() {
  // Particles
  for (let i = particles.length - 1; i >= 0; i--) {
    const p = particles[i];
    p.life -= p.decay;
    if (p.life <= 0) { particles.splice(i, 1); continue; }
    
    p.x += p.vx;
    p.y += p.vy;
    if (!p.isDust) p.vy += 0.1; // gravity for goo/blood
    
    ctx.globalAlpha = p.life;
    ctx.beginPath();
    ctx.arc(p.x, p.y, p.r * p.life, 0, Math.PI * 2);
    ctx.fillStyle = p.color;
    ctx.fill();
  }
  ctx.globalAlpha = 1;

  // Texts
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  for (let i = floatingTexts.length - 1; i >= 0; i--) {
    const ft = floatingTexts[i];
    ft.life -= 0.015;
    if (ft.life <= 0) { floatingTexts.splice(i, 1); continue; }
    
    ft.y += ft.vy;
    
    ctx.globalAlpha = ft.life;
    ctx.font = `bold ${20 * ft.scale}px 'Segoe UI'`;
    // Outline
    ctx.lineWidth = 3;
    ctx.strokeStyle = "#000";
    ctx.strokeText(ft.text, ft.x, ft.y);
    // Fill
    ctx.fillStyle = ft.color;
    ctx.fillText(ft.text, ft.x, ft.y);
  }
  ctx.globalAlpha = 1;
}

// ========================================
// DESERT ENVIRONMENT
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
// PREY (Bugs)
// ========================================
const bugs = [];
const MAX_BUGS = 8; // increased max bugs slightly
let spawnCD = 0;

const BUG_TYPES = {
  NORMAL: { prob: 0.7, speed: 1.0, size: 5, hue: "#2a1a08", points: 1, colorName: "yashil", goo: "#7a9020" },
  GOLDEN: { prob: 0.15, speed: 2.2, size: 4, hue: "#d4af37", points: 3, colorName: "oltin", goo: "#ffd700" }, // Fast, small, high points
  BIG:    { prob: 0.15, speed: 0.5, size: 8, hue: "#3b2f2f", points: 2, colorName: "qizil", goo: "#803020" }  // Slow, big, good for combos
};

function getRandomBugType() {
  const r = Math.random();
  if (r < BUG_TYPES.GOLDEN.prob) return BUG_TYPES.GOLDEN;
  if (r < BUG_TYPES.GOLDEN.prob + BUG_TYPES.BIG.prob) return BUG_TYPES.BIG;
  return BUG_TYPES.NORMAL;
}

function spawnBug() {
  if (bugs.length >= MAX_BUGS) return;
  const edge = Math.floor(Math.random() * 4);
  let x, y;
  if (edge === 0) { x = Math.random() * W; y = -20; }
  else if (edge === 1) { x = W + 20; y = Math.random() * H; }
  else if (edge === 2) { x = Math.random() * W; y = H + 20; }
  else { x = -20; y = Math.random() * H; }

  const type = getRandomBugType();
  const baseSpeed = type.speed + Math.random() * 0.5 * type.speed;

  bugs.push({
    x, y,
    tx: 100 + Math.random() * (W - 200),
    ty: 100 + Math.random() * (H - 200),
    speed: baseSpeed,
    type: type,
    ang: 0,
    size: type.size + Math.random() * 2,
    legPhase: Math.random() * Math.PI * 2,
    alive: true,
    deathTimer: 0,
    retargetCD: 0,
    fleeing: false,
  });
}

function updateBugs(hunterX, hunterY, fearRadius) {
  for (let i = bugs.length - 1; i >= 0; i--) {
    const b = bugs[i];

    if (!b.alive) {
      b.deathTimer--;
      if (b.deathTimer <= 0) bugs.splice(i, 1);
      continue;
    }

    const dHead = dist(b.x, b.y, hunterX, hunterY);
    if (dHead < fearRadius) {
      b.fleeing = true;
      const fa = angle(hunterX, hunterY, b.x, b.y);
      b.tx = clamp(b.x + Math.cos(fa) * 250, 40, W - 40);
      b.ty = clamp(b.y + Math.sin(fa) * 250, 40, H - 40);
    } else {
      b.fleeing = false;
    }

    const dt = dist(b.x, b.y, b.tx, b.ty);
    b.ang = angle(b.x, b.y, b.tx, b.ty);
    
    // Golden bugs flee MUCH faster
    let fleeMult = b.type === BUG_TYPES.GOLDEN ? 3.5 : 2.5;
    const spd = b.fleeing ? b.speed * fleeMult : b.speed;

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

    b.legPhase += b.fleeing ? 0.35 : 0.15;
  }
}

function drawBugs() {
  for (const b of bugs) {
    if (!b.alive) continue; // Skip drawing dead bugs entirely, handled by particles now

    ctx.save();
    ctx.translate(b.x, b.y);
    ctx.rotate(b.ang);

    ctx.globalAlpha = 0.12;
    ctx.beginPath(); ctx.ellipse(2, 3, b.size + 1, b.size * 0.5, 0, 0, Math.PI * 2);
    ctx.fillStyle = "#000"; ctx.fill();
    ctx.globalAlpha = 1;

    ctx.beginPath(); ctx.ellipse(-b.size * 0.2, 0, b.size * 0.9, b.size * 0.52, 0, 0, Math.PI * 2);
    ctx.fillStyle = b.type.hue; ctx.fill();
    
    // Golden bug glow
    if(b.type === BUG_TYPES.GOLDEN) {
      ctx.beginPath(); ctx.ellipse(-b.size * 0.2, 0, b.size * 0.6, b.size * 0.3, 0, 0, Math.PI * 2);
      ctx.fillStyle = "#fff5cc"; ctx.fill();
    }

    ctx.beginPath(); ctx.ellipse(b.size * 0.5, 0, b.size * 0.45, b.size * 0.38, 0, 0, Math.PI * 2);
    ctx.fillStyle = "#1a0a00"; ctx.fill();
    ctx.beginPath(); ctx.ellipse(b.size * 0.85, 0, b.size * 0.3, b.size * 0.28, 0, 0, Math.PI * 2);
    ctx.fillStyle = "#100800"; ctx.fill();

    for (const s of [-1, 1]) {
      ctx.beginPath();
      ctx.moveTo(b.size * 0.95, s * 1.5);
      const ax = b.size * 1.7 + Math.sin(time * 8 + s) * 2;
      const ay = s * (b.size * 0.7 + Math.sin(time * 9 + s * 2) * 2);
      ctx.quadraticCurveTo(b.size * 1.3, ay * 0.5, ax, ay);
      ctx.strokeStyle = "#3a2a18"; ctx.lineWidth = 0.8; ctx.stroke();
    }

    for (let l = 0; l < 3; l++) {
      const off = (l - 1) * b.size * 0.4;
      const w = Math.sin(b.legPhase + l * 2.1) * (b.size * 0.6);
      for (const s of [-1, 1]) {
        ctx.beginPath();
        ctx.moveTo(off, s * b.size * 0.35);
        ctx.lineTo(off + w * 0.5, s * (b.size * 0.8 + Math.abs(w) * 0.3));
        ctx.lineTo(off - w * 0.3, s * (b.size * 1.3 + Math.abs(w) * 0.2));
        ctx.strokeStyle = "#3a2a18"; ctx.lineWidth = 1.2; ctx.stroke();
      }
    }
    ctx.restore();
  }
}

function processCatch(b) {
  b.alive = false;
  b.deathTimer = 0; // removed old poof
  
  // Combo Logic
  comboCount++;
  comboTimer = COMBO_MAX_TIME;
  let multiplier = Math.min(Math.floor((comboCount - 1) / 2) + 1, 5); // Max x5 multiplier
  
  let pts = b.type.points * multiplier;
  score += pts;
  scoreEl.textContent = score;
  
  // VFX
  spawnParticles(b.x, b.y, b.type.goo, 15, 6);
  
  let textColor = b.type === BUG_TYPES.GOLDEN ? "#ffd700" : "#00ff66";
  let text = `+${pts}`;
  let scale = 1.0;
  
  if (multiplier > 1) {
    text += ` (x${multiplier})`;
    textColor = "#ffaa00";
    scale = 1.0 + (multiplier * 0.1);
  }
  
  spawnFloatingText(b.x, b.y - 15, text, textColor, scale);
  addShake(3);
}

function catchBug(targetX, targetY, catchRadius) {
  let caught = false;
  for (const b of bugs) {
    if (b.alive && dist(targetX, targetY, b.x, b.y) < catchRadius) {
      processCatch(b);
      caught = true;
    }
  }
  return caught;
}

function updateCombos(dt) {
  if (comboTimer > 0) {
    comboTimer -= dt;
    if (comboTimer <= 0) {
      comboCount = 0; // Combo dropped
    }
  }
}

// ========================================
// ANIMALS LOGIC
// ========================================

// ── SCORPION ──
const Scorpion = {
  spine: [],
  strikeTimer: 0,
  init() {
    this.spine = [];
    for (let i = 0; i < 22; i++) this.spine.push({ x: W / 2, y: H / 2 });
    this.strikeTimer = 0;
  },
  update() {
    this.spine[0].x = lerp(this.spine[0].x, mouse.x, 0.12);
    this.spine[0].y = lerp(this.spine[0].y, mouse.y, 0.12);
    const SPACING = 6;
    for (let i = 1; i < 22; i++) {
      const prev = this.spine[i - 1];
      const cur = this.spine[i];
      const a = angle(cur.x, cur.y, prev.x, prev.y);
      const d = dist(cur.x, cur.y, prev.x, prev.y);
      if (d > SPACING) {
        cur.x += Math.cos(a) * (d - SPACING);
        cur.y += Math.sin(a) * (d - SPACING);
      }
    }

    if (mouse.clicked && this.strikeTimer <= 0) {
      this.strikeTimer = 20;
      catchBug(this.spine[0].x, this.spine[0].y, 65);
      addShake(4);
    }
    if (this.strikeTimer > 0) this.strikeTimer--;
  },
  draw() {
    // Shadow
    ctx.save(); ctx.globalAlpha = 0.10;
    for (let i = 0; i < 14; i++) {
      const s = this.spine[i];
      let rw = i === 0 ? 12 : i <= 3 ? 14 + Math.sin(((i - 1) / 2) * Math.PI) * 3 : i <= 10 ? 12 + Math.sin(((i - 4) / 6) * Math.PI) * 5 : 7 - (i - 10) * 1.5;
      ctx.beginPath(); ctx.ellipse(s.x + 5, s.y + 7, Math.max(rw, 2), Math.max(rw * 0.6, 1.5), 0, 0, Math.PI * 2);
      ctx.fillStyle = "#000"; ctx.fill();
    }
    ctx.restore();

    // Body
    for (let i = 10; i >= 3; i--) {
      const s = this.spine[i];
      const prev = this.spine[i - 1];
      const a = angle(prev.x, prev.y, s.x, s.y);
      const t = (i - 3) / 7;
      const rw = 11 + Math.sin(t * Math.PI) * 6;
      const rh = 8 + Math.sin(t * Math.PI) * 3;
      fillOvalGrad(s.x, s.y, rw, rh, a, "#7a5030", "#3a1a08");
      
      if (i > 3) {
        ctx.beginPath();
        ctx.moveTo(s.x - Math.sin(a) * rw * 0.65, s.y + Math.cos(a) * rw * 0.65);
        ctx.lineTo(s.x + Math.sin(a) * rw * 0.65, s.y - Math.cos(a) * rw * 0.65);
        ctx.strokeStyle = "rgba(20,8,0,0.2)"; ctx.lineWidth = 0.7; ctx.stroke();
      }
    }

    // Head
    const headAng = angle(this.spine[2].x, this.spine[2].y, this.spine[0].x, this.spine[0].y);
    const hx = (this.spine[0].x + this.spine[1].x + this.spine[2].x) / 3;
    const hy = (this.spine[0].y + this.spine[1].y + this.spine[2].y) / 3;
    fillOvalGrad(hx, hy, 16, 13, headAng, "#85593a", "#4a2810");
    fillOvalGrad(this.spine[0].x, this.spine[0].y, 11, 9, headAng, "#8a6040", "#503018");

    // Eyes
    for (const side of [-1, 1]) {
      const ex = this.spine[0].x + Math.cos(headAng) * 4 - Math.sin(headAng) * 2.5 * side;
      const ey = this.spine[0].y + Math.sin(headAng) * 4 + Math.cos(headAng) * 2.5 * side;
      ctx.beginPath(); ctx.arc(ex, ey, 1.8, 0, Math.PI * 2); ctx.fillStyle = "#0a0a0a"; ctx.fill();
    }

    // Pincers
    // Enhanced: Snap shut when striking
    const isStriking = this.strikeTimer > 10; 
    for (const side of [1, -1]) {
      const fwdX = Math.cos(headAng), fwdY = Math.sin(headAng), px = -Math.sin(headAng) * side, py = Math.cos(headAng) * side;
      
      // Pull arms back slightly during strike
      const armPull = isStriking ? -4 : 0;
      
      const sx = this.spine[0].x + fwdX * (6 + armPull) + px * 10, sy = this.spine[0].y + fwdY * (6 + armPull) + py * 10;
      const ex = sx + fwdX * 16 + px * 16, ey = sy + fwdY * 16 + py * 16;
      const wx = ex + fwdX * 14 + px * 4, wy = ey + fwdY * 14 + py * 4;
      
      thickLine(this.spine[0].x, this.spine[0].y, sx, sy, 5.5, "#5a3318");
      thickLine(sx, sy, ex, ey, 6, "#6b4228");
      fillOvalGrad(ex, ey, 6, 5, headAng, "#7a5030", "#4a2810");
      thickLine(ex, ey, wx, wy, 5, "#6b4228");

      const clawAng = angle(ex, ey, wx, wy);
      fillOvalGrad(wx, wy, 11, 8, clawAng, "#8a6040", "#4a2810");

      // Snap fingers shut
      const openBase = 0.25 + Math.sin(time * 3) * 0.08;
      const openAngle = isStriking ? 0.05 : openBase; 

      const f1x = wx + Math.cos(clawAng - openAngle * side) * 18, f1y = wy + Math.sin(clawAng - openAngle * side) * 18;
      const f2x = wx + Math.cos(clawAng + openAngle * 1.2 * side) * 16, f2y = wy + Math.sin(clawAng + openAngle * 1.2 * side) * 16;
      
      thickLine(wx + Math.cos(clawAng)*5, wy + Math.sin(clawAng)*5, f1x, f1y, 3.5, "#5a3318");
      thickLine(wx + Math.cos(clawAng)*5, wy + Math.sin(clawAng)*5, f2x, f2y, 3, "#5a3318");
    }

    // Legs
    const legIndices = [4, 6, 8, 9];
    for (let li = 0; li < legIndices.length; li++) {
      const si = legIndices[li], s = this.spine[si], prev = this.spine[si - 1];
      const a = angle(prev.x, prev.y, s.x, s.y), px = -Math.sin(a), py = Math.cos(a);
      const wave = Math.sin(time * 9 + li * 1.8) * 5; // slightly faster legs
      for (const side of [1, -1]) {
        const bx = s.x + px * 10 * side, by = s.y + py * 10 * side;
        const jx = bx + px * (16 + li * 1.5) * side + Math.cos(headAng) * wave * 0.5;
        const jy = by + py * (16 + li * 1.5) * side + Math.sin(headAng) * wave * 0.5;
        const fx = jx + px * (10 + li) * side - Math.cos(a) * (8 + wave * 0.8);
        const fy = jy + py * (10 + li) * side - Math.sin(a) * (8 + wave * 0.8);
        thickLine(bx, by, jx, jy, 3.2, "#5a3318");
        thickLine(jx, jy, fx, fy, 2.2, "#4a2510");
      }
    }

    // Tail
    const tailPoints = [];
    // Enhanced strike arc
    let strikeArc = 0;
    if (this.strikeTimer > 0) {
      // parabolic arc for strike
      const tStrike = this.strikeTimer / 20;
      strikeArc = Math.sin(tStrike * Math.PI) * 40; 
    }

    for (let i = 11; i < 22; i++) {
      const t = (i - 11) / 10;
      let lift = t < 0.85 ? Math.sin(t / 0.85 * Math.PI * 0.5) * 55 : 55 - ((t - 0.85) / 0.15) * 12;
      
      const vx = lerp(this.spine[i].x, this.spine[6].x, (lift + strikeArc * t) * 0.006);
      const vy = lerp(this.spine[i].y, this.spine[6].y, (lift + strikeArc * t) * 0.006);
      tailPoints.push({ x: vx, y: vy, rw: 7 - t * 4.5, rh: 5.5 - t * 3, t, lift });
    }
    
    for (let i = 0; i < tailPoints.length; i++) {
      const tp = tailPoints[i], a = angle(this.spine[Math.max(11 + i - 1, 11)].x, this.spine[Math.max(11 + i - 1, 11)].y, this.spine[11+i].x, this.spine[11+i].y);
      const r = Math.floor(lerp(122, 50, tp.t)), g = Math.floor(lerp(80, 25, tp.t)), b = Math.floor(lerp(48, 8, tp.t));
      fillOvalGrad(tp.x, tp.y, Math.max(tp.rw, 1.5), Math.max(tp.rh, 1.2), a, `rgb(${r+20},${g+15},${b+10})`, `rgb(${r-10},${g-8},${b-4})`);
      if (i < tailPoints.length - 1) thickLine(tp.x, tp.y, tailPoints[i+1].x, tailPoints[i+1].y, Math.max(tp.rw * 0.8, 1.2), `rgb(${r},${g},${b})`);
    }

    // Stinger
    const last = tailPoints[tailPoints.length - 1], prevTP = tailPoints[tailPoints.length - 2];
    const stAng = angle(prevTP.x, prevTP.y, last.x, last.y);
    fillOvalGrad(last.x, last.y, 5.5, 4.5, stAng, "#8a5a38", "#4a2810");
    const nAng = stAng + Math.PI * 0.15, tipX = last.x + Math.cos(nAng) * 14, tipY = last.y + Math.sin(nAng) * 14;
    
    ctx.beginPath();
    ctx.moveTo(last.x - Math.sin(nAng)*2.5, last.y + Math.cos(nAng)*2.5);
    ctx.lineTo(last.x + Math.sin(nAng)*2.5, last.y - Math.cos(nAng)*2.5);
    ctx.lineTo(tipX, tipY); ctx.fillStyle = "#1a0800"; ctx.fill();

    const pulse = 0.35 + Math.sin(time * 8) * 0.4;
    ctx.beginPath(); ctx.arc(tipX, tipY, 4, 0, Math.PI * 2); ctx.fillStyle = `rgba(30, 200, 80, ${pulse * 0.5})`; ctx.fill();
    ctx.beginPath(); ctx.arc(tipX, tipY, 1.8, 0, Math.PI * 2); ctx.fillStyle = `rgba(50, 255, 100, ${pulse})`; ctx.fill();

    if (this.strikeTimer > 0) {
      ctx.beginPath(); ctx.arc(tipX, tipY, 8 + this.strikeTimer * 2, 0, Math.PI * 2); ctx.fillStyle = `rgba(50, 255, 120, ${this.strikeTimer / 20})`; ctx.fill();
    }
  },
  getHead() { return this.spine[0]; }
};

// ── SNAKE ──
const Snake = {
  pts: [],
  len: 35, // longer
  spacing: 5,
  strikeOffset: 0,
  headAng: 0,
  init() {
    this.pts = [];
    for (let i = 0; i < this.len; i++) this.pts.push({ x: W / 2, y: H / 2 });
    this.strikeOffset = 0;
    this.headAng = 0;
  },
  update() {
    let targetX = mouse.x;
    let targetY = mouse.y;
    let speed = dist(this.pts[0].x, this.pts[0].y, mouse.x, mouse.y) * 0.06;
    speed = clamp(speed, 0, 6);
    
    if (mouse.clicked && this.strikeOffset <= 0) {
      this.strikeOffset = 30; // Faster lunge
      addShake(5);
      
      // Calculate strike trajectory (straight to mouse)
      const stAng = angle(this.pts[0].x, this.pts[0].y, mouse.x, mouse.y);
      const reach = 80;
      catchBug(this.pts[0].x + Math.cos(stAng)*reach, this.pts[0].y + Math.sin(stAng)*reach, 40);
    }
    
    let isStriking = this.strikeOffset > 0;
    
    if (isStriking) {
      speed += 18; // much faster strike
      this.strikeOffset -= 3;
    }

    const ang = angle(this.pts[0].x, this.pts[0].y, targetX, targetY);
    this.headAng = ang; // Store for drawing

    // Less slither when striking
    const slitherAmt = isStriking ? 0 : Math.sin(time * 10) * (speed * 0.9);
    
    this.pts[0].x += Math.cos(ang) * speed + Math.cos(ang + Math.PI/2) * slitherAmt;
    this.pts[0].y += Math.sin(ang) * speed + Math.sin(ang + Math.PI/2) * slitherAmt;

    for (let i = 1; i < this.len; i++) {
      const prev = this.pts[i - 1];
      const cur = this.pts[i];
      const a = angle(cur.x, cur.y, prev.x, prev.y);
      const d = dist(cur.x, cur.y, prev.x, prev.y);
      if (d > this.spacing) {
        cur.x += Math.cos(a) * (d - this.spacing);
        cur.y += Math.sin(a) * (d - this.spacing);
      }
    }
    
    // Dust trail at tail
    if (speed > 2 && Math.random() < 0.2) {
        const tail = this.pts[this.len-1];
        spawnParticles(tail.x, tail.y, "rgba(200,180,120,0.5)", 1, 1, true);
    }
  },
  draw() {
    // Shadow
    ctx.save(); ctx.globalAlpha = 0.25;
    for (let i = 0; i < this.len; i+=2) {
      ctx.beginPath(); ctx.arc(this.pts[i].x + 4, this.pts[i].y + 5, this.getSize(i)*1.1, 0, Math.PI * 2); ctx.fillStyle = "#000"; ctx.fill();
    }
    ctx.restore();

    // Body
    for (let i = this.len - 1; i >= 0; i--) {
      const p = this.pts[i];
      const size = this.getSize(i);
      
      const prev = i > 0 ? this.pts[i-1] : this.pts[0];
      const a = angle(p.x, p.y, prev.x, prev.y);

      // Scale pattern (diamond/hexagon look)
      const isDark = (i % 4 === 0 || i % 4 === 1);
      const color = isDark ? "#4a5e2f" : "#6c8042"; // Lighter olive snake
      const edge = isDark ? "#2a3617" : "#4a5732";
      
      fillOvalGrad(p.x, p.y, size * 1.1, size*0.9, a, color, edge);
      
      // Diamond markings on back
      if (i % 4 === 0 && i > 2 && i < this.len - 5) {
          ctx.save();
          ctx.translate(p.x, p.y);
          ctx.rotate(a);
          ctx.beginPath();
          ctx.moveTo(-size*0.4, 0); ctx.lineTo(0, size*0.5); ctx.lineTo(size*0.4, 0); ctx.lineTo(0, -size*0.5);
          ctx.fillStyle = "#2a3617";
          ctx.fill();
          ctx.restore();
      }
    }

    // Head
    const head = this.pts[0];
    const neck = this.pts[2];
    const hAng = this.headAng;
    
    const isBiting = this.strikeOffset > 10;
    
    // Draw lower jaw if biting
    if (isBiting) {
        fillOvalGrad(head.x + Math.cos(hAng)*2, head.y + Math.sin(hAng)*2, 12, 9, hAng, "#c9a687", "#8c6f56");
        // Fangs
        const fangX = head.x + Math.cos(hAng)*15;
        const fangY = head.y + Math.sin(hAng)*15;
        for(let side of [-1, 1]) {
            ctx.beginPath();
            ctx.moveTo(fangX + Math.cos(hAng - Math.PI/2)*4*side, fangY + Math.sin(hAng - Math.PI/2)*4*side);
            ctx.lineTo(fangX + Math.cos(hAng)*6 + Math.cos(hAng - Math.PI/2)*4*side, fangY + Math.sin(hAng)*6 + Math.sin(hAng - Math.PI/2)*4*side);
            ctx.strokeStyle = "#fff"; ctx.lineWidth = 1.5; ctx.stroke();
        }
    }

    // Upper head
    fillOvalGrad(head.x, head.y, 15, 12, hAng, "#5a7038", "#2a3617");
    
    // Eyes (slits)
    for(const side of [-1, 1]) {
       const ex = head.x + Math.cos(hAng)*5 - Math.sin(hAng)*6*side;
       const ey = head.y + Math.sin(hAng)*5 + Math.cos(hAng)*6*side;
       ctx.beginPath(); ctx.arc(ex, ey, 2.5, 0, Math.PI*2); ctx.fillStyle = "#ffdd00"; ctx.fill();
       // Slit pupil
       ctx.beginPath(); 
       ctx.ellipse(ex, ey, 0.5, 2.2, hAng, 0, Math.PI*2);
       ctx.fillStyle = "#000"; ctx.fill();
    }

    // Tongue
    if (!isBiting && (Math.random() < 0.05 || this.strikeOffset > 0)) {
      const tx = head.x + Math.cos(hAng) * 22;
      const ty = head.y + Math.sin(hAng) * 22;
      ctx.beginPath(); ctx.moveTo(head.x, head.y); ctx.lineTo(tx, ty);
      ctx.lineTo(tx + Math.cos(hAng - 0.5)*5, ty + Math.sin(hAng - 0.5)*5);
      ctx.moveTo(tx, ty);
      ctx.lineTo(tx + Math.cos(hAng + 0.5)*5, ty + Math.sin(hAng + 0.5)*5);
      ctx.strokeStyle = "#cc0000"; ctx.lineWidth = 1.5; ctx.stroke();
    }
  },
  getSize(i) {
    if (i < 4) return 11;
    if (i > this.len - 15) return 11 - (i - (this.len - 15)) * 0.6;
    return 13 + Math.sin((i/this.len)*Math.PI) * 1.5;
  },
  getHead() { return this.pts[0]; }
};

// ── LIZARD ──
const Lizard = {
  x: W/2, y: H/2, bodyAng: 0, headAng: 0,
  tongueLen: 0, tongueMax: 100, striking: false,
  walkTime: 0, isMoving: false,
  init() {
    this.x = W/2; this.y = H/2; this.bodyAng = 0; this.headAng = 0;
    this.tongueLen = 0; this.striking = false; this.walkTime = 0; this.isMoving = false;
  },
  update() {
    const targetAng = angle(this.x, this.y, mouse.x, mouse.y);
    const d = dist(this.x, this.y, mouse.x, mouse.y);
    
    // Head tracks mouse constantly
    this.headAng = lerp(this.headAng, targetAng, 0.2);

    if (!this.striking) {
      // Body aligns when moving
      this.isMoving = false;
      if (d > 50) {
        if (Math.sin(time * 6) > -0.2) { // Quick burst timing
          this.bodyAng = lerp(this.bodyAng, targetAng, 0.2);
          this.x += Math.cos(this.bodyAng) * 8; // Faster bursts
          this.y += Math.sin(this.bodyAng) * 8;
          this.walkTime += 0.5;
          this.isMoving = true;
          
          if (Math.random() < 0.3) {
              spawnParticles(this.x - Math.cos(this.bodyAng)*20, this.y - Math.sin(this.bodyAng)*20, "rgba(200,180,120,0.4)", 1, 2, true);
          }
        }
      }
      
      if (mouse.clicked && d < this.tongueMax + 20) {
          this.striking = true;
          addShake(2);
      }
    } else {
      this.tongueLen += 25; // Super fast tongue
      if (this.tongueLen > this.tongueMax) {
        this.striking = false;
      }
      
      // Shoot tongue in direction of head
      const tx = this.x + Math.cos(this.headAng) * (25 + this.tongueLen);
      const ty = this.y + Math.sin(this.headAng) * (25 + this.tongueLen);
      if (catchBug(tx, ty, 25)) {
         this.striking = false; 
         // Optional: draw wrap effect in draw() next frame
      }
    }
    
    if (!this.striking && this.tongueLen > 0) this.tongueLen -= 35; // Snap back fast
    this.tongueLen = Math.max(0, this.tongueLen);
  },
  draw() {
    ctx.save();
    ctx.translate(this.x, this.y);

    // Shadow
    ctx.save();
    ctx.rotate(this.bodyAng);
    ctx.fillStyle = "rgba(0,0,0,0.2)";
    ctx.beginPath(); ctx.ellipse(2, 5, 32, 14, 0, 0, Math.PI*2); ctx.fill();
    
    // Tail
    const tailWig = this.isMoving ? Math.sin(this.walkTime) * 12 : Math.sin(time * 2) * 3; // subtle wag when still
    ctx.beginPath(); ctx.moveTo(-20, 0); 
    ctx.quadraticCurveTo(-45, tailWig, -70, tailWig * 1.8);
    ctx.strokeStyle = "#8a7a40"; ctx.lineWidth = 7; ctx.lineCap = "round"; ctx.stroke();
    
    // Legs
    const legPhase = this.walkTime;
    for (let side of [-1, 1]) {
      const fWig = this.isMoving ? Math.sin(legPhase) * 12 * side : 0;
      const bWig = this.isMoving ? Math.cos(legPhase) * 12 * side : 0;
      // Front
      thickLine(12, 10*side, 18 + fWig, 22*side, 4.5, "#7a6a30");
      thickLine(18 + fWig, 22*side, 24 + fWig, 30*side, 3.5, "#6a5a20");
      // Back
      thickLine(-12, 10*side, -18 + bWig, 22*side, 4.5, "#7a6a30");
      thickLine(-18 + bWig, 22*side, -12 + bWig, 30*side, 3.5, "#6a5a20");
    }

    // Body
    fillOvalGrad(0, 0, 24, 14, 0, "#9a8a50", "#7a6a30");
    // Pattern
    ctx.fillStyle = "#5a4a10";
    ctx.beginPath(); ctx.arc(0, 0, 3.5, 0, Math.PI*2); ctx.fill();
    ctx.beginPath(); ctx.arc(12, 0, 3, 0, Math.PI*2); ctx.fill();
    ctx.beginPath(); ctx.arc(-12, 0, 3, 0, Math.PI*2); ctx.fill();
    ctx.restore(); // End body rotation

    // Head (rotates independently)
    ctx.save();
    ctx.rotate(this.headAng);
    fillOvalGrad(25, 0, 11, 9, 0, "#8a7a40", "#6a5a20");
    
    // Eyes (Bulging slightly)
    for(const side of [-1, 1]) {
        ctx.beginPath(); ctx.arc(28, 6*side, 3, 0, Math.PI*2); ctx.fillStyle = "#7a6a30"; ctx.fill(); // socket
        ctx.beginPath(); ctx.arc(28, 6.5*side, 2, 0, Math.PI*2); ctx.fillStyle = "#111"; ctx.fill(); // pupil
        ctx.beginPath(); ctx.arc(28.5, 6*side, 0.8, 0, Math.PI*2); ctx.fillStyle = "#fff"; ctx.fill(); // highlight
    }

    // Tongue
    if (this.tongueLen > 0) {
      ctx.beginPath(); ctx.moveTo(35, 0); ctx.lineTo(35 + this.tongueLen, 0);
      ctx.strokeStyle = "#ff77aa"; ctx.lineWidth = 4; ctx.stroke();
      
      // Sticky end
      ctx.beginPath(); ctx.arc(35 + this.tongueLen, 0, 5, 0, Math.PI*2); 
      ctx.fillStyle = "#ff4488"; ctx.fill();
      // Drop shadow on tongue end
      ctx.beginPath(); ctx.arc(35 + this.tongueLen + 2, 3, 4, 0, Math.PI*2); 
      ctx.fillStyle = "rgba(0,0,0,0.2)"; ctx.fill();
    }
    ctx.restore(); // End head rotation

    ctx.restore();
  },
  getHead() { return {x: this.x, y: this.y}; }
};

// ── FROG ──
const Frog = {
  x: W/2, y: H/2, ang: 0,
  z: 0, vz: 0, jumping: false,
  tongueLen: 0, striking: false, caughtBugData: null,
  init() {
    this.x = W/2; this.y = H/2; this.ang = 0;
    this.z = 0; this.vz = 0; this.jumping = false; this.tongueLen = 0; this.striking = false;
    this.caughtBugData = null;
  },
  update() {
    if (this.jumping) {
      this.z += this.vz;
      this.vz -= 0.6; // gravity
      this.x += Math.cos(this.ang) * 5;
      this.y += Math.sin(this.ang) * 5;
      if (this.z <= 0) {
        this.z = 0;
        this.jumping = false;
        // Dust on landing
        spawnParticles(this.x, this.y, "rgba(200,180,120,0.5)", 8, 3, true);
        addShake(2);
      }
    } else {
      this.ang = lerp(this.ang, angle(this.x, this.y, mouse.x, mouse.y), 0.2);
      
      if (dist(this.x, this.y, mouse.x, mouse.y) > 60 && !this.striking && Math.random() < 0.08) {
        this.jumping = true;
        this.vz = 7; // jump force
        // Dust on takeoff
        spawnParticles(this.x, this.y, "rgba(200,180,120,0.4)", 4, 2, true);
      }

      if (mouse.clicked && !this.striking && !this.jumping) {
          this.striking = true;
          this.caughtBugData = null; // reset
      }
      
      if (this.striking) {
        this.tongueLen += 25;
        if (this.tongueLen > 150) this.striking = false;
        
        if (!this.caughtBugData) {
            const tx = this.x + Math.cos(this.ang) * (this.tongueLen + 15);
            const ty = this.y + Math.sin(this.ang) * (this.tongueLen + 15);
            
            // Custom catch logic for frog (delay processCatch until retracted)
            for (let i = bugs.length - 1; i >= 0; i--) {
                const b = bugs[i];
                if (b.alive && dist(tx, ty, b.x, b.y) < 30) {
                    b.alive = false; // mark dead so it stops moving
                    this.caughtBugData = b; // store bug data
                    this.striking = false; // start retracting
                    break;
                }
            }
        }
      } else if (this.tongueLen > 0) {
        this.tongueLen -= 30; // retract
        if (this.tongueLen <= 0 && this.caughtBugData) {
            // Reached mouth, process the actual kill/points
            processCatch(this.caughtBugData);
            this.caughtBugData = null;
        }
      }
      this.tongueLen = Math.max(0, this.tongueLen);
    }
  },
  draw() {
    ctx.save();
    ctx.translate(this.x, this.y);
    
    // Shadow (scales with jump)
    const sh = Math.max(0.3, 1 - (this.z / 60));
    ctx.fillStyle = `rgba(0,0,0,${0.25 * sh})`;
    ctx.beginPath(); ctx.ellipse(0, 0, 22*sh, 16*sh, this.ang, 0, Math.PI*2); ctx.fill();

    ctx.translate(0, -this.z); // Apply jump height
    ctx.rotate(this.ang);

    // Back Legs
    const ext = this.jumping ? 22 : 6;
    for (const side of [-1, 1]) {
      thickLine(-10, 12*side, -16 - ext*0.6, 16*side + ext*0.3, 6, "#2a7a20"); // Thigh
      thickLine(-16 - ext*0.6, 16*side + ext*0.3, -6 - ext*1.1, 22*side, 4.5, "#3a8a30"); // Calf
      // Foot
      ctx.beginPath(); ctx.arc(-6 - ext*1.1, 23*side, 3, 0, Math.PI*2); ctx.fillStyle = "#2a7a20"; ctx.fill();
    }

    // Body (squish/stretch)
    const stretch = this.jumping ? 4 : 0;
    fillOvalGrad(stretch/2, 0, 20 + stretch, 16 - stretch/2, 0, "#4a9a40", "#2a7a20");
    
    // Pattern
    ctx.fillStyle = "#2a7a20";
    ctx.beginPath(); ctx.arc(-5, 5, 2.5, 0, Math.PI*2); ctx.fill();
    ctx.beginPath(); ctx.arc(2, -6, 2, 0, Math.PI*2); ctx.fill();
    ctx.beginPath(); ctx.arc(-8, -4, 1.5, 0, Math.PI*2); ctx.fill();

    // Front Legs
    for (const side of [-1, 1]) {
       thickLine(10, 12*side, 16 + (this.jumping?8:0), 14*side, 4, "#3a8a30");
       // Foot
       ctx.beginPath(); ctx.arc(16 + (this.jumping?8:0), 15*side, 2.5, 0, Math.PI*2); ctx.fillStyle = "#2a7a20"; ctx.fill();
    }

    // Eyes (Bulging out)
    for (const side of [-1, 1]) {
      const eyeX = 14;
      const eyeY = 9*side;
      ctx.beginPath(); ctx.arc(eyeX, eyeY, 5.5, 0, Math.PI*2); ctx.fillStyle = "#1a5a10"; ctx.fill(); // socket
      ctx.beginPath(); ctx.arc(eyeX+1, eyeY, 4, 0, Math.PI*2); ctx.fillStyle = "#ffd700"; ctx.fill(); // iris
      // Slit pupil horizontal
      ctx.beginPath(); ctx.ellipse(eyeX+2, eyeY, 1.5, 2.5, 0, 0, Math.PI*2); ctx.fillStyle = "#000"; ctx.fill();
      ctx.beginPath(); ctx.arc(eyeX+3, eyeY-1, 1, 0, Math.PI*2); ctx.fillStyle = "#fff"; ctx.fill(); // shine
    }

    // Tongue
    if (this.tongueLen > 0) {
      const tipX = 16 + this.tongueLen;
      
      // Draw tongue line
      ctx.beginPath(); ctx.moveTo(16, 0); ctx.lineTo(tipX, 0);
      ctx.strokeStyle = "#ff77aa"; ctx.lineWidth = 5; ctx.lineCap = "round"; ctx.stroke();
      
      // Sticky end
      ctx.beginPath(); ctx.arc(tipX, 0, 7, 0, Math.PI*2); 
      ctx.fillStyle = "#ff4488"; ctx.fill();
      
      // Draw caught bug on tongue
      if (this.caughtBugData) {
          ctx.save();
          ctx.translate(tipX, 0);
          ctx.beginPath(); ctx.ellipse(0, 0, 6, 4, 0, 0, Math.PI*2);
          ctx.fillStyle = this.caughtBugData.type.hue; ctx.fill();
          ctx.restore();
      }
    }

    ctx.restore();
  },
  getHead() { return {x: this.x, y: this.y}; }
};


// ========================================
// CORE GAME LOOP
// ========================================

const Animals = {
  'scorpion': Scorpion,
  'snake': Snake,
  'lizard': Lizard,
  'frog': Frog
};

function initGame(animalKey) {
  currentAnimalType = animalKey;
  score = 0;
  scoreEl.textContent = score;
  comboCount = 0;
  comboTimer = 0;
  shakeIntensity = 0;
  bugs.length = 0;
  particles.length = 0;
  floatingTexts.length = 0;
  
  for(let i=0; i<4; i++) spawnBug();
  
  Animals[currentAnimalType].init();
  
  selectScreen.style.display = "none";
  gameUI.style.display = "block";
  infoTitle.textContent = document.querySelector(`.animal-card[data-animal="${animalKey}"] .card-name`).textContent;
  
  if(animFrame) cancelAnimationFrame(animFrame);
  lastTime = performance.now();
  gameLoop(lastTime);
}

function gameLoop(now) {
  const dt = (now - lastTime) / 1000;
  lastTime = now;
  time = now / 1000;
  
  updateCombos(dt);
  
  ctx.clearRect(0, 0, W, H);
  
  // Screen Shake Application
  ctx.save();
  if (shakeIntensity > 0.5) {
      const sx = (Math.random() - 0.5) * shakeIntensity;
      const sy = (Math.random() - 0.5) * shakeIntensity;
      ctx.translate(sx, sy);
      shakeIntensity *= 0.85; // decay
  }

  drawDesert();

  if (currentAnimalType) {
    const animal = Animals[currentAnimalType];
    
    spawnCD--;
    if (spawnCD <= 0 && bugs.length < MAX_BUGS) {
      spawnBug();
      spawnCD = 60 + Math.random() * 80; // slightly faster spawns for combos
    }

    const head = animal.getHead();
    updateBugs(head.x, head.y, 110);
    animal.update();
    
    drawBugs();
    updateAndDrawVFX();
    animal.draw();
  }
  
  ctx.restore(); // Restore shake transform

  mouse.clicked = false; // reset click
  animFrame = requestAnimationFrame(gameLoop);
}

// ========================================
// EVENT LISTENERS
// ========================================
animalCards.forEach(card => {
  card.addEventListener("click", () => {
    initGame(card.dataset.animal);
  });
});

backBtn.addEventListener("click", () => {
  currentAnimalType = null;
  selectScreen.style.display = "flex";
  gameUI.style.display = "none";
});

// Initial start logic (just draw background)
gameLoop(performance.now());
