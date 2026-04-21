const canvas = document.getElementById("canvas") as HTMLCanvasElement;
const ctx = canvas.getContext("2d") as CanvasRenderingContext2D;

let w = window.innerWidth;
let h = window.innerHeight;

canvas.width = w;
canvas.height = h;

type Point = {
  x: number;
  y: number;
};

const mouse: Point = {
  x: w * 0.35,
  y: h * 0.55,
};

const bodyCount = 34;
const body: Point[] = [];

for (let i = 0; i < bodyCount; i++) {
  body.push({ x: mouse.x, y: mouse.y });
}

window.addEventListener("resize", () => {
  w = window.innerWidth;
  h = window.innerHeight;
  canvas.width = w;
  canvas.height = h;
});

window.addEventListener("mousemove", (e: MouseEvent) => {
  mouse.x = e.clientX;
  mouse.y = e.clientY;
});

function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

function dist(a: Point, b: Point): number {
  return Math.hypot(b.x - a.x, b.y - a.y);
}

function normalize(x: number, y: number) {
  const len = Math.hypot(x, y) || 1;
  return { x: x / len, y: y / len };
}

function drawCircle(x: number, y: number, r: number, alpha = 1) {
  ctx.beginPath();
  ctx.strokeStyle = `rgba(220,220,220,${alpha})`;
  ctx.lineWidth = 1.4;
  ctx.arc(x, y, r, 0, Math.PI * 2);
  ctx.stroke();
}

function drawLine(x1: number, y1: number, x2: number, y2: number, alpha = 1, width = 1.2) {
  ctx.beginPath();
  ctx.strokeStyle = `rgba(220,220,220,${alpha})`;
  ctx.lineWidth = width;
  ctx.moveTo(x1, y1);
  ctx.lineTo(x2, y2);
  ctx.stroke();
}

function updateBody() {
  for (let i = 0; i < body.length; i++) {
    const prev = i === 0 ? mouse : body[i - 1];
    const current = body[i];

    const smooth = i === 0 ? 0.22 : 0.28;
    current.x = lerp(current.x, prev.x, smooth);
    current.y = lerp(current.y, prev.y, smooth);
  }
}

function drawBody() {
  for (let i = 0; i < body.length; i++) {
    const p = body[i];
    const next = body[Math.min(i + 1, body.length - 1)];
    const prev = i === 0 ? mouse : body[i - 1];

    const dx = next.x - prev.x;
    const dy = next.y - prev.y;
    const n = normalize(dx, dy);
    const px = -n.y;
    const py = n.x;

    let radius: number;

    if (i < body.length * 0.55) {
      radius = 6 + (1 - i / (body.length * 0.55)) * 9;
    } else {
      const t = (i - body.length * 0.55) / (body.length * 0.45);
      radius = 10 - t * 6.5;
    }

    drawCircle(p.x, p.y, radius, 0.9);

    if (i < body.length - 1) {
      drawLine(p.x, p.y, next.x, next.y, 0.55, 1.1);
    }

    if (i > 2 && i < 20 && i % 2 === 0) {
      const legLen1 = 18 + i * 0.7;
      const legLen2 = 14 + i * 0.45;

      const leftJointX = p.x + px * legLen1;
      const leftJointY = p.y + py * legLen1;
      const leftFootX = leftJointX + px * 6 - n.x * legLen2;
      const leftFootY = leftJointY + py * 6 - n.y * legLen2;

      const rightJointX = p.x - px * legLen1;
      const rightJointY = p.y - py * legLen1;
      const rightFootX = rightJointX - px * 6 - n.x * legLen2;
      const rightFootY = rightJointY - py * 6 - n.y * legLen2;

      drawLine(p.x, p.y, leftJointX, leftJointY, 0.65, 1.3);
      drawLine(leftJointX, leftJointY, leftFootX, leftFootY, 0.65, 1.3);
      drawCircle(leftFootX, leftFootY, 2.4, 0.85);

      drawLine(p.x, p.y, rightJointX, rightJointY, 0.65, 1.3);
      drawLine(rightJointX, rightJointY, rightFootX, rightFootY, 0.65, 1.3);
      drawCircle(rightFootX, rightFootY, 2.4, 0.85);
    }
  }
}

function drawHeadAndPincers() {
  const head = body[0];
  const neck = body[1];

  const ang = Math.atan2(head.y - neck.y, head.x - neck.x);

  const forwardX = Math.cos(ang);
  const forwardY = Math.sin(ang);

  const sideX = -forwardY;
  const sideY = forwardX;

  drawCircle(head.x, head.y, 5, 1);

  const hornX = head.x + forwardX * 18;
  const hornY = head.y + forwardY * 18;
  drawLine(head.x, head.y, hornX, hornY, 0.8, 1.1);
  drawCircle(hornX, hornY, 2.5, 0.95);

  const leftBaseX = head.x + sideX * 8 + forwardX * 6;
  const leftBaseY = head.y + sideY * 8 + forwardY * 6;
  const leftMidX = leftBaseX + sideX * 18 + forwardX * 6;
  const leftMidY = leftBaseY + sideY * 18 + forwardY * 6;
  const leftClawX = leftMidX + sideX * 10 + forwardX * 5;
  const leftClawY = leftMidY + sideY * 10 + forwardY * 5;

  const rightBaseX = head.x - sideX * 8 + forwardX * 6;
  const rightBaseY = head.y - sideY * 8 + forwardY * 6;
  const rightMidX = rightBaseX - sideX * 18 + forwardX * 6;
  const rightMidY = rightBaseY - sideY * 18 + forwardY * 6;
  const rightClawX = rightMidX - sideX * 10 + forwardX * 5;
  const rightClawY = rightMidY - sideY * 10 + forwardY * 5;

  drawLine(head.x, head.y, leftBaseX, leftBaseY, 0.85, 1.2);
  drawLine(leftBaseX, leftBaseY, leftMidX, leftMidY, 0.85, 1.2);
  drawLine(leftMidX, leftMidY, leftClawX, leftClawY, 0.85, 1.2);
  drawCircle(leftClawX, leftClawY, 3, 0.95);

  drawLine(head.x, head.y, rightBaseX, rightBaseY, 0.85, 1.2);
  drawLine(rightBaseX, rightBaseY, rightMidX, rightMidY, 0.85, 1.2);
  drawLine(rightMidX, rightMidY, rightClawX, rightClawY, 0.85, 1.2);
  drawCircle(rightClawX, rightClawY, 3, 0.95);
}

function drawTailSting() {
  const tailStart = Math.floor(body.length * 0.7);

  for (let i = tailStart; i < body.length - 1; i++) {
    const p = body[i];
    const next = body[i + 1];

    const t = (i - tailStart) / (body.length - tailStart);
    const curveLift = Math.sin(t * Math.PI) * 22;

    drawCircle(p.x, p.y - curveLift, 4.5 - t * 2.2, 0.9);
    drawLine(
      p.x,
      p.y - curveLift,
      next.x,
      next.y - Math.sin(((i + 1 - tailStart) / (body.length - tailStart)) * Math.PI) * 22,
      0.7,
      1.1
    );
  }

  const last = body[body.length - 1];
  const before = body[body.length - 2];
  const ang = Math.atan2(last.y - before.y, last.x - before.x);

  const stingBaseX = last.x;
  const stingBaseY = last.y - 4;

  const tipX = stingBaseX + Math.cos(ang) * 16;
  const tipY = stingBaseY + Math.sin(ang) * 16 - 10;

  drawLine(stingBaseX, stingBaseY, tipX, tipY, 0.95, 1.4);
  drawLine(tipX, tipY, tipX - Math.cos(ang - 0.7) * 8, tipY - Math.sin(ang - 0.7) * 8, 0.95, 1.4);
  drawLine(tipX, tipY, tipX - Math.cos(ang + 0.7) * 8, tipY - Math.sin(ang + 0.7) * 8, 0.95, 1.4);
}

function animate() {
  ctx.clearRect(0, 0, w, h);

  updateBody();
  drawTailSting();
  drawBody();
  drawHeadAndPincers();

  requestAnimationFrame(animate);
}

animate();