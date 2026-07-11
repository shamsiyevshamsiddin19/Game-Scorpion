// ==========================================
// DESERT HUNTER GAME
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
const MAX_BUGS = 6;
let spawnCD = 0;

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

    ctx.globalAlpha = 0.12;
    ctx.beginPath(); ctx.ellipse(2, 3, b.size + 1, b.size * 0.5, 0, 0, Math.PI * 2);
    ctx.fillStyle = "#000"; ctx.fill();
    ctx.globalAlpha = 1;

    ctx.beginPath(); ctx.ellipse(-b.size * 0.2, 0, b.size * 0.9, b.size * 0.52, 0, 0, Math.PI * 2);
    ctx.fillStyle = b.hue; ctx.fill();
    ctx.beginPath(); ctx.ellipse(b.size * 0.5, 0, b.size * 0.45, b.size * 0.38, 0, 0, Math.PI * 2);
    ctx.fillStyle = "#1a0a00"; ctx.fill();
    ctx.beginPath(); ctx.ellipse(b.size * 0.85, 0, b.size * 0.3, b.size * 0.28, 0, 0, Math.PI * 2);
    ctx.fillStyle = "#100800"; ctx.fill();

    for (const s of [-1, 1]) {
      ctx.beginPath();
      ctx.moveTo(b.size * 0.95, s * 1.5);
      const ax = b.size * 1.7 + Math.sin(time * 5 + s) * 2;
      const ay = s * (b.size * 0.7 + Math.sin(time * 6 + s * 2) * 2);
      ctx.quadraticCurveTo(b.size * 1.3, ay * 0.5, ax, ay);
      ctx.strokeStyle = "#3a2a18"; ctx.lineWidth = 0.6; ctx.stroke();
    }

    for (let l = 0; l < 3; l++) {
      const off = (l - 1) * b.size * 0.4;
      const w = Math.sin(b.legPhase + l * 2.1) * 3;
      for (const s of [-1, 1]) {
        ctx.beginPath();
        ctx.moveTo(off, s * b.size * 0.35);
        ctx.lineTo(off + w * 0.5, s * (b.size * 0.8 + Math.abs(w) * 0.3));
        ctx.lineTo(off - w * 0.3, s * (b.size * 1.3 + Math.abs(w) * 0.2));
        ctx.strokeStyle = "#3a2a18"; ctx.lineWidth = 0.9; ctx.stroke();
      }
    }
    ctx.restore();
  }
}

function catchBug(targetX, targetY, catchRadius) {
  let caught = false;
  for (const b of bugs) {
    if (b.alive && dist(targetX, targetY, b.x, b.y) < catchRadius) {
      b.alive = false;
      b.deathTimer = 20;
      score++;
      scoreEl.textContent = score;
      caught = true;
    }
  }
  return caught;
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
    this.spine[0].x = lerp(this.spine[0].x, mouse.x, 0.10);
    this.spine[0].y = lerp(this.spine[0].y, mouse.y, 0.10);
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
      this.strikeTimer = 15;
      catchBug(this.spine[0].x, this.spine[0].y, 55);
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
    for (const side of [1, -1]) {
      const fwdX = Math.cos(headAng), fwdY = Math.sin(headAng), px = -Math.sin(headAng) * side, py = Math.cos(headAng) * side;
      const sx = this.spine[0].x + fwdX * 6 + px * 10, sy = this.spine[0].y + fwdY * 6 + py * 10;
      const ex = sx + fwdX * 16 + px * 16, ey = sy + fwdY * 16 + py * 16;
      const wx = ex + fwdX * 14 + px * 4, wy = ey + fwdY * 14 + py * 4;
      
      thickLine(this.spine[0].x, this.spine[0].y, sx, sy, 5.5, "#5a3318");
      thickLine(sx, sy, ex, ey, 6, "#6b4228");
      fillOvalGrad(ex, ey, 6, 5, headAng, "#7a5030", "#4a2810");
      thickLine(ex, ey, wx, wy, 5, "#6b4228");

      const clawAng = angle(ex, ey, wx, wy);
      fillOvalGrad(wx, wy, 11, 8, clawAng, "#8a6040", "#4a2810");

      const openAngle = 0.25 + Math.sin(time * 3) * 0.08;
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
      const wave = Math.sin(time * 7 + li * 1.8) * 5;
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
    for (let i = 11; i < 22; i++) {
      const t = (i - 11) / 10;
      let lift = t < 0.85 ? Math.sin(t / 0.85 * Math.PI * 0.5) * 55 : 55 - ((t - 0.85) / 0.15) * 12;
      const vx = lerp(this.spine[i].x, this.spine[6].x, lift * 0.006);
      const vy = lerp(this.spine[i].y, this.spine[6].y, lift * 0.006);
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

    const pulse = 0.35 + Math.sin(time * 4) * 0.3;
    ctx.beginPath(); ctx.arc(tipX, tipY, 4, 0, Math.PI * 2); ctx.fillStyle = `rgba(30, 200, 80, ${pulse * 0.5})`; ctx.fill();
    ctx.beginPath(); ctx.arc(tipX, tipY, 1.8, 0, Math.PI * 2); ctx.fillStyle = `rgba(50, 255, 100, ${pulse})`; ctx.fill();

    if (this.strikeTimer > 0) {
      ctx.beginPath(); ctx.arc(tipX, tipY, 8 + this.strikeTimer * 1.5, 0, Math.PI * 2); ctx.fillStyle = `rgba(50, 255, 120, ${this.strikeTimer / 20})`; ctx.fill();
    }
  },
  getHead() { return this.spine[0]; }
};

// ── SNAKE ──
const Snake = {
  pts: [],
  len: 30,
  spacing: 5,
  strikeOffset: 0,
  init() {
    this.pts = [];
    for (let i = 0; i < this.len; i++) this.pts.push({ x: W / 2, y: H / 2 });
    this.strikeOffset = 0;
  },
  update() {
    let speed = dist(this.pts[0].x, this.pts[0].y, mouse.x, mouse.y) * 0.05;
    speed = clamp(speed, 0, 5);
    
    if (mouse.clicked && this.strikeOffset <= 0) {
      this.strikeOffset = 40; // Lunge forward
      catchBug(this.pts[0].x, this.pts[0].y, 60);
    }
    
    if (this.strikeOffset > 0) {
      speed += 10;
      this.strikeOffset -= 2;
    }

    const ang = angle(this.pts[0].x, this.pts[0].y, mouse.x, mouse.y);
    const slither = Math.sin(time * 8) * (speed * 0.8);
    
    this.pts[0].x += Math.cos(ang) * speed + Math.cos(ang + Math.PI/2) * slither;
    this.pts[0].y += Math.sin(ang) * speed + Math.sin(ang + Math.PI/2) * slither;

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
  },
  draw() {
    // Shadow
    ctx.save(); ctx.globalAlpha = 0.2;
    for (let i = 0; i < this.len; i+=2) {
      ctx.beginPath(); ctx.arc(this.pts[i].x + 4, this.pts[i].y + 4, this.getSize(i), 0, Math.PI * 2); ctx.fillStyle = "#000"; ctx.fill();
    }
    ctx.restore();

    // Body
    for (let i = this.len - 1; i >= 0; i--) {
      const p = this.pts[i];
      const size = this.getSize(i);
      
      const prev = i > 0 ? this.pts[i-1] : this.pts[0];
      const a = angle(p.x, p.y, prev.x, prev.y);

      // Scale pattern
      const color = (i % 4 === 0 || i % 4 === 1) ? "#5c6b40" : "#3c4a25";
      const edge = (i % 4 === 0 || i % 4 === 1) ? "#4a5732" : "#2a3617";
      fillOvalGrad(p.x, p.y, size, size*0.9, a, color, edge);
    }

    // Head
    const head = this.pts[0];
    const neck = this.pts[2];
    const headAng = angle(neck.x, neck.y, head.x, head.y);
    fillOvalGrad(head.x, head.y, 14, 11, headAng, "#4c5930", "#2a3617");
    
    // Eyes
    for(const side of [-1, 1]) {
       const ex = head.x + Math.cos(headAng)*5 - Math.sin(headAng)*6*side;
       const ey = head.y + Math.sin(headAng)*5 + Math.cos(headAng)*6*side;
       ctx.beginPath(); ctx.arc(ex, ey, 2, 0, Math.PI*2); ctx.fillStyle = "#ffdd00"; ctx.fill();
       ctx.beginPath(); ctx.arc(ex, ey, 1, 0, Math.PI*2); ctx.fillStyle = "#000"; ctx.fill();
    }

    // Tongue
    if (Math.random() < 0.05 || this.strikeOffset > 0) {
      const tx = head.x + Math.cos(headAng) * 20;
      const ty = head.y + Math.sin(headAng) * 20;
      ctx.beginPath(); ctx.moveTo(head.x, head.y); ctx.lineTo(tx, ty);
      ctx.lineTo(tx + Math.cos(headAng - 0.5)*5, ty + Math.sin(headAng - 0.5)*5);
      ctx.moveTo(tx, ty);
      ctx.lineTo(tx + Math.cos(headAng + 0.5)*5, ty + Math.sin(headAng + 0.5)*5);
      ctx.strokeStyle = "#cc0000"; ctx.lineWidth = 1.5; ctx.stroke();
    }
  },
  getSize(i) {
    if (i < 5) return 10;
    if (i > this.len - 10) return 10 - (i - (this.len - 10)) * 0.8;
    return 12 + Math.sin((i/this.len)*Math.PI) * 2;
  },
  getHead() { return this.pts[0]; }
};

// ── LIZARD ──
const Lizard = {
  x: W/2, y: H/2, ang: 0,
  tongueLen: 0, tongueMax: 80, striking: false,
  walkTime: 0,
  init() {
    this.x = W/2; this.y = H/2; this.ang = 0;
    this.tongueLen = 0; this.striking = false; this.walkTime = 0;
  },
  update() {
    const d = dist(this.x, this.y, mouse.x, mouse.y);
    if (!this.striking) {
      this.ang = lerp(this.ang, angle(this.x, this.y, mouse.x, mouse.y), 0.1);
      
      // Move in bursts
      if (d > 40) {
        if (Math.sin(time * 5) > 0) {
          this.x += Math.cos(this.ang) * 6;
          this.y += Math.sin(this.ang) * 6;
          this.walkTime += 0.4;
        }
      }
      
      if (mouse.clicked) this.striking = true;
    } else {
      this.tongueLen += 15;
      if (this.tongueLen > this.tongueMax) {
        this.striking = false;
      }
      // Check catch
      const tx = this.x + Math.cos(this.ang) * (this.tongueLen + 20);
      const ty = this.y + Math.sin(this.ang) * (this.tongueLen + 20);
      if (catchBug(tx, ty, 20)) {
         this.striking = false; // retract immediately on catch
      }
    }
    if (!this.striking && this.tongueLen > 0) this.tongueLen -= 20;
    this.tongueLen = Math.max(0, this.tongueLen);
  },
  draw() {
    ctx.save();
    ctx.translate(this.x, this.y);
    ctx.rotate(this.ang);

    // Shadow
    ctx.fillStyle = "rgba(0,0,0,0.15)";
    ctx.beginPath(); ctx.ellipse(2, 4, 30, 12, 0, 0, Math.PI*2); ctx.fill();

    // Tail
    const tailWig = Math.sin(this.walkTime) * 10;
    ctx.beginPath(); ctx.moveTo(-20, 0); 
    ctx.quadraticCurveTo(-40, tailWig, -60, tailWig * 1.5);
    ctx.strokeStyle = "#8a7a40"; ctx.lineWidth = 6; ctx.lineCap = "round"; ctx.stroke();
    
    // Legs
    const legPhase = this.walkTime;
    for (let side of [-1, 1]) {
      const fWig = Math.sin(legPhase) * 10 * side;
      const bWig = Math.cos(legPhase) * 10 * side;
      // Front
      thickLine(10, 8*side, 15 + fWig, 18*side, 4, "#7a6a30");
      thickLine(15 + fWig, 18*side, 20 + fWig, 25*side, 3, "#6a5a20");
      // Back
      thickLine(-10, 8*side, -15 + bWig, 18*side, 4, "#7a6a30");
      thickLine(-15 + bWig, 18*side, -10 + bWig, 25*side, 3, "#6a5a20");
    }

    // Body
    fillOvalGrad(0, 0, 22, 12, 0, "#9a8a50", "#7a6a30");
    // Pattern
    ctx.fillStyle = "#5a4a10";
    ctx.beginPath(); ctx.arc(0, 0, 3, 0, Math.PI*2); ctx.fill();
    ctx.beginPath(); ctx.arc(10, 0, 2.5, 0, Math.PI*2); ctx.fill();
    ctx.beginPath(); ctx.arc(-10, 0, 2.5, 0, Math.PI*2); ctx.fill();
    
    // Head
    fillOvalGrad(25, 0, 10, 8, 0, "#8a7a40", "#6a5a20");
    ctx.fillStyle = "#111";
    ctx.beginPath(); ctx.arc(28, 5, 2, 0, Math.PI*2); ctx.fill();
    ctx.beginPath(); ctx.arc(28, -5, 2, 0, Math.PI*2); ctx.fill();

    // Tongue
    if (this.tongueLen > 0) {
      ctx.beginPath(); ctx.moveTo(35, 0); ctx.lineTo(35 + this.tongueLen, 0);
      ctx.strokeStyle = "#ff77aa"; ctx.lineWidth = 3; ctx.stroke();
      ctx.beginPath(); ctx.arc(35 + this.tongueLen, 0, 4, 0, Math.PI*2); 
      ctx.fillStyle = "#ff4488"; ctx.fill();
    }

    ctx.restore();
  },
  getHead() { return {x: this.x, y: this.y}; }
};

// ── FROG ──
const Frog = {
  x: W/2, y: H/2, ang: 0,
  z: 0, vz: 0, jumping: false,
  tongueLen: 0, striking: false,
  init() {
    this.x = W/2; this.y = H/2; this.ang = 0;
    this.z = 0; this.vz = 0; this.jumping = false; this.tongueLen = 0; this.striking = false;
  },
  update() {
    if (this.jumping) {
      this.z += this.vz;
      this.vz -= 0.5; // gravity
      this.x += Math.cos(this.ang) * 4;
      this.y += Math.sin(this.ang) * 4;
      if (this.z <= 0) {
        this.z = 0;
        this.jumping = false;
      }
    } else {
      this.ang = lerp(this.ang, angle(this.x, this.y, mouse.x, mouse.y), 0.2);
      if (dist(this.x, this.y, mouse.x, mouse.y) > 50 && !this.striking && Math.random() < 0.05) {
        this.jumping = true;
        this.vz = 6; // jump force
      }

      if (mouse.clicked && !this.striking) this.striking = true;
      
      if (this.striking) {
        this.tongueLen += 20;
        if (this.tongueLen > 120) this.striking = false;
        const tx = this.x + Math.cos(this.ang) * (this.tongueLen + 15);
        const ty = this.y + Math.sin(this.ang) * (this.tongueLen + 15);
        if (catchBug(tx, ty, 25)) this.striking = false;
      } else if (this.tongueLen > 0) {
        this.tongueLen -= 25;
      }
      this.tongueLen = Math.max(0, this.tongueLen);
    }
  },
  draw() {
    ctx.save();
    ctx.translate(this.x, this.y);
    
    // Shadow
    const sh = 1 - (this.z / 50);
    ctx.fillStyle = `rgba(0,0,0,${0.2 * sh})`;
    ctx.beginPath(); ctx.ellipse(0, 0, 20*sh, 15*sh, this.ang, 0, Math.PI*2); ctx.fill();

    ctx.translate(0, -this.z); // Apply jump height
    ctx.rotate(this.ang);

    // Back Legs
    const ext = this.jumping ? 20 : 5;
    for (const side of [-1, 1]) {
      thickLine(-10, 10*side, -15 - ext*0.5, 15*side + ext*0.2, 5, "#2a7a20"); // Thigh
      thickLine(-15 - ext*0.5, 15*side + ext*0.2, -5 - ext, 20*side, 4, "#3a8a30"); // Calf
    }

    // Body
    fillOvalGrad(0, 0, 18, 15 + (this.jumping? -2:2), 0, "#4a9a40", "#2a7a20");
    
    // Front Legs
    for (const side of [-1, 1]) {
       thickLine(10, 10*side, 15 + (this.jumping?5:0), 12*side, 3.5, "#3a8a30");
    }

    // Eyes
    for (const side of [-1, 1]) {
      ctx.beginPath(); ctx.arc(12, 8*side, 5, 0, Math.PI*2); ctx.fillStyle = "#2a7a20"; ctx.fill();
      ctx.beginPath(); ctx.arc(13, 8*side, 3.5, 0, Math.PI*2); ctx.fillStyle = "#ffd700"; ctx.fill();
      ctx.beginPath(); ctx.arc(14, 8*side, 1.5, 0, Math.PI*2); ctx.fillStyle = "#000"; ctx.fill();
    }

    // Tongue
    if (this.tongueLen > 0) {
      ctx.beginPath(); ctx.moveTo(15, 0); ctx.lineTo(15 + this.tongueLen, 0);
      ctx.strokeStyle = "#ff77aa"; ctx.lineWidth = 4; ctx.stroke();
      ctx.beginPath(); ctx.arc(15 + this.tongueLen, 0, 6, 0, Math.PI*2); 
      ctx.fillStyle = "#ff4488"; ctx.fill();
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
  bugs.length = 0;
  for(let i=0; i<3; i++) spawnBug();
  
  Animals[currentAnimalType].init();
  
  selectScreen.style.display = "none";
  gameUI.style.display = "block";
  infoTitle.textContent = document.querySelector(`.animal-card[data-animal="${animalKey}"] .card-name`).textContent;
  
  if(animFrame) cancelAnimationFrame(animFrame);
  lastTime = performance.now();
  gameLoop(lastTime);
}

function gameLoop(now) {
  time = now / 1000;
  ctx.clearRect(0, 0, W, H);
  
  drawDesert();

  if (currentAnimalType) {
    const animal = Animals[currentAnimalType];
    
    spawnCD--;
    if (spawnCD <= 0 && bugs.length < MAX_BUGS) {
      spawnBug();
      spawnCD = 80 + Math.random() * 100;
    }

    const head = animal.getHead();
    updateBugs(head.x, head.y, 110);
    animal.update();
    
    drawBugs();
    animal.draw();
  }

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
