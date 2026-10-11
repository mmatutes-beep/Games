// Geometría del tablero y dibujo "a boli" sobre papel.
import { COLORS, SAFE, squareOf, LAST_TRACK, META } from './rules.js';

export const CW = 1.4; // ancho de casilla (a lo ancho del brazo)
export const CL = 1.0; // largo de casilla (a lo largo del brazo)
export const C = CW * 1.5; // semilado del cuadrado central
export const ARM = 8; // casillas por columna
export const HALF = C + ARM * CL; // semilado del tablero
export const PAPER = HALF + 0.9; // semilado del papel

// Rotación de un brazo al siguiente (sentido antihorario visto desde arriba).
function rot(x, z, k) {
  for (let i = 0; i < k; i++) [x, z] = [z, -x];
  return [x, z];
}

// Casilla de un brazo base (brazo 0 = abajo). col: -1 izq, 0 centro, 1 dcha.
function armCell(arm, col, i) {
  const [x, z] = rot(col * CW, C + (i + 0.5) * CL, arm);
  const [ax, az] = rot(1, 0, arm);
  const corners = [
    [col * CW - CW / 2, C + i * CL],
    [col * CW + CW / 2, C + i * CL],
    [col * CW + CW / 2, C + (i + 1) * CL],
    [col * CW - CW / 2, C + (i + 1) * CL],
  ].map(([a, b]) => rot(a, b, arm));
  return { x, z, ax, az, corners, arm, col, i };
}

export function squareCell(sq) {
  if (sq <= 8) return armCell(0, 1, 8 - sq);
  if (sq <= 59) {
    const m = sq - 9;
    const a = 1 + Math.floor(m / 17);
    const r = m % 17;
    if (r < 8) return armCell(a, -1, r);
    if (r === 8) return armCell(a, 0, 7);
    return armCell(a, 1, 7 - (r - 9));
  }
  if (sq <= 67) return armCell(0, -1, sq - 60);
  return armCell(0, 0, 7);
}

export function corridorCell(color, j) {
  return armCell(color, 0, 6 - j);
}

export function homeSpot(color, idx) {
  const off = [[-1, -1], [1, -1], [-1, 1], [1, 1]][idx];
  const cx = C + ARM / 2, cz = C + ARM / 2;
  const [x, z] = rot(cx + off[0] * 1.3, cz + off[1] * 1.3, color);
  return { x, z };
}

export function homeCenter(color) {
  const [x, z] = rot(C + ARM / 2, C + ARM / 2, color);
  return { x, z };
}

export function metaSpot(color, idx) {
  const off = [-0.75, -0.25, 0.25, 0.75][idx];
  const [x, z] = rot(off, C * 0.62, color);
  return { x, z };
}

// Posición en el mundo de una ficha (color, progreso, índice en la celda).
export function piecePosition(color, p, pieceId, slot, slotCount) {
  if (p < 0) return homeSpot(color, pieceId);
  if (p >= META) return metaSpot(color, pieceId);
  const cell = p <= LAST_TRACK ? squareCell(squareOf(color, p)) : corridorCell(color, p - LAST_TRACK - 1);
  const o = slotCount > 1 ? (slot === 0 ? -0.36 : 0.36) : 0;
  return { x: cell.x + cell.ax * o, z: cell.z + cell.az * o };
}

// ------------------------------------------------------------------
// Dibujo
// ------------------------------------------------------------------

export const INK = '#1d2f78';
export const INK_DARK = '#16204a';

function mulberry(seed) {
  return function () {
    seed |= 0; seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function makePen(ctx, seed = 7) {
  const R = mulberry(seed);
  const j = (a) => (R() - 0.5) * 2 * a;

  function line(x1, y1, x2, y2, { color = INK, width = 2.2, passes = 2, wob = 1.6, alpha = 0.85 } = {}) {
    ctx.save();
    ctx.strokeStyle = color;
    ctx.lineCap = 'round';
    ctx.globalAlpha = alpha;
    for (let p = 0; p < passes; p++) {
      ctx.lineWidth = width * (0.75 + R() * 0.5);
      const len = Math.hypot(x2 - x1, y2 - y1);
      const nx = -(y2 - y1) / (len || 1), ny = (x2 - x1) / (len || 1);
      const bow = j(wob * 1.6);
      // pequeño sobretrazo en los extremos, como a mano alzada
      const ex = (x2 - x1) / (len || 1), ey = (y2 - y1) / (len || 1);
      const s0 = j(2.5), s1 = j(2.5);
      ctx.beginPath();
      ctx.moveTo(x1 - ex * s0 + j(wob), y1 - ey * s0 + j(wob));
      ctx.quadraticCurveTo(
        (x1 + x2) / 2 + nx * bow + j(wob), (y1 + y2) / 2 + ny * bow + j(wob),
        x2 + ex * s1 + j(wob), y2 + ey * s1 + j(wob));
      ctx.stroke();
    }
    ctx.restore();
  }

  function poly(pts, opts) {
    for (let i = 0; i < pts.length; i++) {
      const a = pts[i], b = pts[(i + 1) % pts.length];
      line(a[0], a[1], b[0], b[1], opts);
    }
  }

  function circle(cx, cy, r, { color = INK, width = 2.2, alpha = 0.85, turns = 1.12, wob = 0.04 } = {}) {
    ctx.save();
    ctx.strokeStyle = color;
    ctx.globalAlpha = alpha;
    ctx.lineWidth = width;
    ctx.lineCap = 'round';
    ctx.beginPath();
    const start = R() * Math.PI * 2;
    const steps = 80;
    const ph1 = R() * 6, ph2 = R() * 6;
    for (let s = 0; s <= steps * turns; s++) {
      const a = start + (s / steps) * Math.PI * 2;
      const rr = r * (1 + Math.sin(a * 2 + ph1) * wob + Math.sin(a * 3 + ph2) * wob * 0.5 + (s / steps) * 0.03);
      const x = cx + Math.cos(a) * rr, y = cy + Math.sin(a) * rr;
      s ? ctx.lineTo(x, y) : ctx.moveTo(x, y);
    }
    ctx.stroke();
    ctx.restore();
  }

  // Relleno rayado (sombreado a boli) dentro de un camino.
  function hatch(pathFn, { color = INK, spacing = 7, angle = -0.8, width = 1.6, alpha = 0.55, cross = false } = {}) {
    ctx.save();
    ctx.beginPath();
    pathFn(ctx);
    ctx.clip();
    const W = ctx.canvas.width;
    const draw = (ang) => {
      const ca = Math.cos(ang), sa = Math.sin(ang);
      for (let d = -W * 1.5; d < W * 1.5; d += spacing * (0.8 + R() * 0.4)) {
        const cx = W / 2 + -sa * d, cy = W / 2 + ca * d;
        ctx.strokeStyle = color;
        ctx.globalAlpha = alpha * (0.7 + R() * 0.3);
        ctx.lineWidth = width * (0.7 + R() * 0.6);
        ctx.beginPath();
        ctx.moveTo(cx - ca * W * 1.5, cy - sa * W * 1.5);
        ctx.lineTo(cx + ca * W * 1.5, cy + sa * W * 1.5);
        ctx.stroke();
      }
    };
    draw(angle);
    if (cross) draw(angle + Math.PI / 2.3);
    ctx.restore();
  }

  function text(str, x, y, { size = 28, color = INK, rot = 0, font = 'Caveat', weight = 600, alpha = 0.9 } = {}) {
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(rot + j(0.04));
    ctx.fillStyle = color;
    ctx.globalAlpha = alpha;
    ctx.font = `${weight} ${size}px "${font}", "Comic Sans MS", cursive`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(str, 0, 0);
    ctx.restore();
  }

  function star(cx, cy, r, opts) {
    const pts = [];
    for (let i = 0; i < 5; i++) {
      const a = -Math.PI / 2 + i * (Math.PI * 4 / 5);
      pts.push([cx + Math.cos(a) * r, cy + Math.sin(a) * r]);
    }
    poly(pts, opts);
  }

  return { line, poly, circle, hatch, text, star, rand: R, j };
}

// Textura de papel de libreta (cuadriculado tenue + grano).
export function paintPaper(ctx, W, H, { lines = true, margin = true, seed = 3 } = {}) {
  const R = mulberry(seed);
  ctx.fillStyle = '#f7f2e4';
  ctx.fillRect(0, 0, W, H);
  // manchas suaves de luz
  for (let i = 0; i < 8; i++) {
    const g = ctx.createRadialGradient(R() * W, R() * H, 0, R() * W, R() * H, W * 0.5);
    g.addColorStop(0, 'rgba(255,255,250,0.25)');
    g.addColorStop(1, 'rgba(230,220,195,0)');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, W, H);
  }
  // grano
  const img = ctx.getImageData(0, 0, W, H);
  for (let i = 0; i < img.data.length; i += 4) {
    const n = (R() - 0.5) * 14;
    img.data[i] += n; img.data[i + 1] += n; img.data[i + 2] += n - 2;
  }
  ctx.putImageData(img, 0, 0);
  if (lines) {
    const step = W / 44;
    ctx.strokeStyle = 'rgba(110,150,210,0.28)';
    ctx.lineWidth = Math.max(1, W / 1400);
    for (let y = step; y < H; y += step) {
      ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(W, y); ctx.stroke();
    }
    ctx.strokeStyle = 'rgba(110,150,210,0.13)';
    for (let x = step; x < W; x += step) {
      ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, H); ctx.stroke();
    }
  }
  if (margin) {
    ctx.strokeStyle = 'rgba(220,80,80,0.45)';
    ctx.lineWidth = Math.max(1.5, W / 900);
    ctx.beginPath(); ctx.moveTo(W * 0.035, 0); ctx.lineTo(W * 0.035, H); ctx.stroke();
  }
}

export function drawBoard(canvas, names = {}) {
  const W = canvas.width;
  const ctx = canvas.getContext('2d');
  const k = W / (PAPER * 2);
  const P = (x, z) => [(x + PAPER) * k, (z + PAPER) * k];
  const pen = makePen(ctx, 42);

  paintPaper(ctx, W, W);

  const pathOf = (pts) => (c) => {
    pts.forEach(([x, z], i) => { const [a, b] = P(x, z); i ? c.lineTo(a, b) : c.moveTo(a, b); });
    c.closePath();
  };

  // Casas (esquinas)
  for (let color = 0; color < 4; color++) {
    const col = COLORS[color];
    const corner = [[C, C], [HALF, C], [HALF, HALF], [C, HALF]].map(([x, z]) => rot(x, z, color));
    pen.hatch(pathOf(corner), { color: col.ink, spacing: 22, alpha: 0.18, width: 2 });
    const hc = homeCenter(color);
    const [cx, cy] = P(hc.x, hc.z);
    const r = 3.3 * k;
    pen.hatch((c) => c.arc(cx, cy, r, 0, Math.PI * 2), { color: col.ink, spacing: 9, alpha: 0.5, width: 2.2, angle: -0.7 + color * 0.3 });
    pen.circle(cx, cy, r, { color: INK, width: 3.2 });
    pen.circle(cx, cy, r * 1.04, { color: INK, width: 1.5, alpha: 0.5 });
    for (let i = 0; i < 4; i++) {
      const hs = homeSpot(color, i);
      const [sx, sy] = P(hs.x, hs.z);
      ctx.save();
      ctx.fillStyle = '#f7f2e4'; ctx.globalAlpha = 0.85;
      ctx.beginPath(); ctx.arc(sx, sy, 0.48 * k, 0, Math.PI * 2); ctx.fill();
      ctx.restore();
      pen.circle(sx, sy, 0.48 * k, { color: INK, width: 2 });
    }
    // nombre escrito en la esquina exterior
    const [lx, lz] = rot(C + ARM - 0.55, C + ARM / 2, color);
    const [tx, ty] = P(lx, lz);
    const label = names[color] || col.name;
    pen.text(label, tx, ty, { size: 0.62 * k, color: INK, rot: -Math.PI / 2 - (color * Math.PI) / 2 + Math.PI });
  }

  // Pasillos
  for (let color = 0; color < 4; color++) {
    for (let j = 0; j < 7; j++) {
      const cell = corridorCell(color, j);
      pen.hatch(pathOf(cell.corners), { color: COLORS[color].ink, spacing: 8, alpha: 0.42, angle: 0.75 });
    }
  }

  // Casillas del recorrido
  for (let sq = 1; sq <= 68; sq++) {
    const cell = squareCell(sq);
    const exitOf = COLORS.findIndex((c) => c.exit === sq);
    if (exitOf >= 0) {
      pen.hatch(pathOf(cell.corners), { color: COLORS[exitOf].ink, spacing: 6, alpha: 0.6, cross: true });
    } else if (SAFE.has(sq)) {
      pen.hatch(pathOf(cell.corners), { color: INK, spacing: 9, alpha: 0.18 });
    }
  }

  // Rejilla de todas las casillas
  const allCells = [];
  for (let sq = 1; sq <= 68; sq++) allCells.push(squareCell(sq));
  for (let c = 0; c < 4; c++) for (let j = 0; j < 7; j++) allCells.push(corridorCell(c, j));
  for (const cell of allCells) pen.poly(cell.corners.map(([x, z]) => P(x, z)), { width: 2.3, passes: 1, wob: 1.3 });
  // bordes exteriores reforzados
  const outline = [];
  for (let a = 0; a < 4; a++) {
    const seg = [[-CW * 1.5, C], [-CW * 1.5, HALF], [CW * 1.5, HALF], [CW * 1.5, C]].map(([x, z]) => rot(x, z, a));
    outline.push(...seg);
  }
  pen.poly(outline.map(([x, z]) => P(x, z)), { width: 3.4, passes: 2, wob: 2 });

  // Símbolos: seguros, números
  for (let sq = 1; sq <= 68; sq++) {
    const cell = squareCell(sq);
    const [cx, cy] = P(cell.x, cell.z);
    const along = Math.atan2(cell.az, cell.ax);
    const isExit = COLORS.some((c) => c.exit === sq);
    if (SAFE.has(sq) && !isExit) pen.circle(cx, cy, 0.3 * k, { width: 2.2 });
    if (isExit) pen.star(cx, cy, 0.3 * k, { width: 2.4, passes: 1, wob: 0.8 });
    // número en el extremo de la casilla
    const [nx, nz] = [cell.x - cell.az * 0.33 + cell.ax * 0.48, cell.z + cell.ax * 0.33 + cell.az * 0.48];
    const [px, py] = P(nx, nz);
    pen.text(String(sq), px, py, { size: 0.3 * k, rot: along, alpha: 0.75, weight: 500 });
  }

  // Flechas de entrada al pasillo
  for (let color = 0; color < 4; color++) {
    const cell = squareCell(COLORS[color].entry);
    const inward = rot(0, -1, color);
    const [x1, y1] = P(cell.x - inward[0] * 0.25, cell.z - inward[1] * 0.25);
    const [x2, y2] = P(cell.x + inward[0] * 0.3, cell.z + inward[1] * 0.3);
    pen.line(x1, y1, x2, y2, { color: COLORS[color].ink, width: 3.2 });
    const ang = Math.atan2(y2 - y1, x2 - x1);
    for (const s of [-1, 1]) {
      pen.line(x2, y2, x2 - Math.cos(ang + s * 0.5) * 0.18 * k, y2 - Math.sin(ang + s * 0.5) * 0.18 * k, { color: COLORS[color].ink, width: 3 });
    }
  }

  // Centro: meta
  for (let color = 0; color < 4; color++) {
    const tri = [[-C, C], [C, C], [0, 0]].map(([x, z]) => rot(x, z, color));
    pen.hatch(pathOf(tri), { color: COLORS[color].ink, spacing: 7, alpha: 0.55, angle: 0.3 + color * 0.4 });
    pen.poly(tri.map(([x, z]) => P(x, z)), { width: 2.8 });
  }
  const [mx, my] = P(0, 0);
  pen.star(mx, my, 0.55 * k, { width: 3, color: INK_DARK });

  // Garabatos en el margen
  pen.text('¡Suerte!', ...P(-HALF + 1.6, -HALF - 0.45), { size: 0.55 * k, rot: -0.06 });
  pen.text('parchís de peluches', ...P(HALF - 3.2, HALF + 0.45), { size: 0.5 * k, rot: 0.03 });
  pen.star(...P(HALF - 0.3, -HALF - 0.45), 0.25 * k, { width: 2 });
  pen.star(...P(-HALF + 0.3, HALF + 0.45), 0.2 * k, { width: 2 });
}
