// Los seis peluches, en versión caricatura: cabeza grande, cuerpo pequeño.
import * as THREE from 'three';

export const PLUSHES = [
  { id: 'pinguino', name: 'Pingu' },
  { id: 'conejita', name: 'Lulu' },
  { id: 'panda', name: 'Pandochka' },
  { id: 'unicornio', name: 'Moni' },
  { id: 'tigre', name: 'Tigri' },
  { id: 'osito', name: 'Milka' },
  { id: 'winnie', name: 'Winnie the Poos' },
  { id: 'earlygrey', name: 'Early grey', size: 0.6 },
  { id: 'ozita', name: 'Ozita' },
  { id: 'gluglu', name: 'Gluglu' },
  { id: 'foxy', name: 'Foxy' },
  { id: 'orci', name: 'Orqui', size: 1 },
  { id: 'bananito', name: 'Bananito', size: 1.28 },
  { id: 'piratilla', name: 'Piratilla', size: 1.28 },
];

// ------------------------------------------------------------------
// Texturas y materiales
// ------------------------------------------------------------------

function furStrokes(ctx, S, n = 9000, lo = 170) {
  for (let i = 0; i < n; i++) {
    const x = Math.random() * S, y = Math.random() * S;
    const a = Math.random() * Math.PI * 2, l = 2 + Math.random() * 5;
    const v = lo + Math.random() * (255 - lo);
    ctx.strokeStyle = `rgba(${v},${v},${v},0.9)`;
    ctx.lineWidth = 0.8 + Math.random();
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineTo(x + Math.cos(a) * l, y + Math.sin(a) * l);
    ctx.stroke();
  }
}

function canvasTex(S, paint, repeat = 1) {
  const cv = document.createElement('canvas');
  cv.width = cv.height = S;
  paint(cv.getContext('2d'), S);
  const t = new THREE.CanvasTexture(cv);
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.repeat.set(repeat, repeat);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

let furTex = null;
function getFur() {
  if (!furTex) furTex = canvasTex(256, (ctx, S) => {
    ctx.fillStyle = '#e2e2e2';
    ctx.fillRect(0, 0, S, S);
    furStrokes(ctx, S);
  }, 3);
  return furTex;
}

function fabric(color, map = getFur(), bump = getFur(), bumpScale = 1.2) {
  return new THREE.MeshPhysicalMaterial({
    color,
    map,
    bumpMap: bump,
    bumpScale,
    roughness: 1,
    sheen: 1,
    sheenRoughness: 0.55,
    sheenColor: new THREE.Color('#ffffff'),
  });
}

const shiny = (color) => new THREE.MeshStandardMaterial({ color, roughness: 0.18, metalness: 0 });
const felt = (color) => new THREE.MeshStandardMaterial({ color, roughness: 0.95 });

const SPH = new THREE.SphereGeometry(1, 32, 22);

function part(geo, mat, x = 0, y = 0, z = 0) {
  const m = new THREE.Mesh(geo, mat);
  m.position.set(x, y, z);
  m.castShadow = true;
  return m;
}

function ball(mat, r, x, y, z, sx = 1, sy = 1, sz = 1) {
  const m = part(SPH, mat, x, y, z);
  m.scale.set(r * sx, r * sy, r * sz);
  return m;
}

// Punto de ganchillo: filas de bucles abultados.
let crochetTex = null;
function getCrochet() {
  if (!crochetTex) crochetTex = canvasTex(256, (ctx, S) => {
    ctx.fillStyle = '#c4c4c4';
    ctx.fillRect(0, 0, S, S);
    const cw = 16, rh = 14;
    for (let r = 0; r * rh < S + rh; r++) {
      for (let c = -1; c * cw < S + cw; c++) {
        const x = c * cw + (r % 2) * cw / 2, y = r * rh;
        const g = ctx.createRadialGradient(x - 2, y - 2, 1, x, y, 9);
        g.addColorStop(0, '#ffffff');
        g.addColorStop(0.6, '#eeeeee');
        g.addColorStop(1, '#b0b0b0');
        ctx.fillStyle = g;
        ctx.beginPath();
        ctx.ellipse(x, y, 7.5, 6.5, -0.5, 0, Math.PI * 2);
        ctx.fill();
      }
    }
  }, 2.5);
  return crochetTex;
}

// Purpurina: motas brillantes de colores.
let glitterTex = null;
function getGlitter() {
  if (!glitterTex) glitterTex = canvasTex(128, (ctx, S) => {
    ctx.fillStyle = '#b8b8b8';
    ctx.fillRect(0, 0, S, S);
    for (let i = 0; i < 1400; i++) {
      const v = 150 + Math.random() * 105;
      ctx.fillStyle = Math.random() < 0.25 ? '#ffffff' : `rgb(${v},${v},${v})`;
      ctx.fillRect(Math.random() * S, Math.random() * S, 1.5, 1.5);
    }
  }, 4);
  return glitterTex;
}

const crochet = (color) => fabric(color, getCrochet(), getCrochet(), 2.5);
const glitter = (color) => new THREE.MeshStandardMaterial({
  color, map: getGlitter(), bumpMap: getGlitter(), bumpScale: 0.6, roughness: 0.3, metalness: 0.6,
});

// Ojo de peluche tipo canica: cúpula negra brillante con aro de purpurina.
function glitterEye(parent, x, y, z, r, rim) {
  const dome = ball(shiny('#111015'), r, x, y, z, 1, 1.08, 0.55);
  parent.add(dome);
  const rims = Array.isArray(rim) ? rim : [rim];
  const seg = (Math.PI * 2) / rims.length;
  rims.forEach((c, i) => {
    const t = part(new THREE.TorusGeometry(r * 1.02, r * 0.2, 8, 24, seg), glitter(c), x, y, z - r * 0.08);
    t.rotation.z = i * seg + Math.PI / 2;
    t.scale.y = 1.08;
    parent.add(t);
  });
  parent.add(ball(shiny('#ffffff'), r * 0.28, x + r * 0.35, y + r * 0.42, z + r * 0.42));
  parent.add(ball(shiny('#ffffff'), r * 0.12, x - r * 0.35, y - r * 0.35, z + r * 0.5));
}

// Puntada bordada: un hilo fino entre dos puntos.
function stitch(parent, a, b, color = '#1f1a1a', r = 0.008) {
  const A = new THREE.Vector3(...a), B = new THREE.Vector3(...b);
  const m = part(new THREE.CylinderGeometry(r, r, A.distanceTo(B), 5), shiny(color));
  m.position.copy(A).add(B).multiplyScalar(0.5);
  m.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), B.clone().sub(A).normalize());
  parent.add(m);
}

// Raya bordada que rodea un elipsoide a una altura dada, entre dos ángulos (0 = frente).
function ringStripe(parent, c, r, y, a0, a1, color, w = 0.013) {
  const k = Math.sqrt(Math.max(0, 1 - (y / r[1]) ** 2)) * 1.03;
  const pts = [];
  for (let i = 0; i <= 12; i++) {
    const a = a0 + ((a1 - a0) * i) / 12;
    pts.push(new THREE.Vector3(c[0] + Math.sin(a) * r[0] * k, c[1] + y, c[2] + Math.cos(a) * r[2] * k));
  }
  parent.add(part(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 24, w, 5), shiny(color)));
}

// Cara bordada de Pandochka, pintada sobre una textura equirectangular.
let pandiFace = null;
function getPandiFace() {
  if (pandiFace) return pandiFace;
  const W = 1024, H = 512;
  const cv = document.createElement('canvas');
  cv.width = W; cv.height = H;
  const ctx = cv.getContext('2d');
  ctx.fillStyle = '#f4f1ea';
  ctx.fillRect(0, 0, W, H);
  furStrokes(ctx, W, 26000, 215);
  ctx.globalAlpha = 1;
  const cx = W * 0.25, cy = H * 0.5; // el frente de la esfera
  for (const s of [-1, 1]) {
    const ex = cx + s * 68, ey = cy - 6;
    ctx.fillStyle = '#8f8f94';
    ctx.beginPath(); ctx.ellipse(ex, ey, 38, 48, s * -0.12, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#4a3430';
    ctx.beginPath(); ctx.ellipse(ex, ey, 29, 39, s * -0.12, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#ffffff';
    ctx.beginPath(); ctx.ellipse(ex + 3, ey - 14, 10, 12, 0, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.ellipse(ex - 10, ey + 12, 4, 4.5, 0, 0, Math.PI * 2); ctx.fill();
  }
  // nariz
  ctx.fillStyle = '#3d3b42';
  ctx.beginPath();
  ctx.moveTo(cx - 12, cy + 30); ctx.quadraticCurveTo(cx, cy + 22, cx + 12, cy + 30);
  ctx.quadraticCurveTo(cx + 4, cy + 46, cx, cy + 46); ctx.quadraticCurveTo(cx - 4, cy + 46, cx - 12, cy + 30);
  ctx.fill();
  // boca abierta con lengua
  ctx.fillStyle = '#3a2422';
  ctx.beginPath();
  ctx.moveTo(cx - 17, cy + 62); ctx.lineTo(cx + 17, cy + 62);
  ctx.quadraticCurveTo(cx + 14, cy + 88, cx, cy + 88); ctx.quadraticCurveTo(cx - 14, cy + 88, cx - 17, cy + 62);
  ctx.fill();
  ctx.fillStyle = '#e8708f';
  ctx.beginPath(); ctx.ellipse(cx + 1, cy + 81, 9, 6, 0, 0, Math.PI * 2); ctx.fill();
  pandiFace = new THREE.CanvasTexture(cv);
  pandiFace.colorSpace = THREE.SRGBColorSpace;
  return pandiFace;
}

// Banda beige del tarro con «HUNNY» bordado (el frente queda en el centro de la textura).
let hunnyTex = null;
function getHunny() {
  if (hunnyTex) return hunnyTex;
  const cv = document.createElement('canvas');
  cv.width = 1024; cv.height = 192;
  const ctx = cv.getContext('2d');
  ctx.fillStyle = '#e6d8c6';
  ctx.fillRect(0, 0, cv.width, cv.height);
  furStrokes(ctx, 1024, 9000, 210);
  ctx.globalAlpha = 1;
  ctx.fillStyle = '#6a3f2a';
  ctx.font = '700 104px "Caveat", "Comic Sans MS", cursive';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('HUNNY', 512, 100);
  hunnyTex = new THREE.CanvasTexture(cv);
  hunnyTex.colorSpace = THREE.SRGBColorSpace;
  return hunnyTex;
}

// Punto de media: columnas de uves, para gorros y bufandas de lana.
let knitTex = null;
function getKnit() {
  if (!knitTex) knitTex = canvasTex(128, (ctx, S) => {
    ctx.fillStyle = '#9c9c9c';
    ctx.fillRect(0, 0, S, S);
    ctx.lineCap = 'round';
    for (let x = 0; x < S; x += 16) {
      for (let y = -6; y < S + 12; y += 12) {
        for (const s of [-1, 1]) {
          const g = ctx.createLinearGradient(x + 8, y, x + 8 + s * 7, y + 10);
          g.addColorStop(0, '#ffffff');
          g.addColorStop(1, '#c4c4c4');
          ctx.strokeStyle = g;
          ctx.lineWidth = 6;
          ctx.beginPath();
          ctx.moveTo(x + 8 + s * 6, y);
          ctx.lineTo(x + 8 + s * 1, y + 10);
          ctx.stroke();
        }
      }
    }
  }, 4);
  return knitTex;
}
const knitted = (color) => fabric(color, getKnit(), getKnit(), 2);

// Cuerpo de terciopelo rosa de Ozita con la flor y el caracol bordados.
let ozitaTex = null;
function getOzitaBody() {
  if (ozitaTex) return ozitaTex;
  const W = 1024, H = 512;
  const cv = document.createElement('canvas');
  cv.width = W; cv.height = H;
  const c = cv.getContext('2d');
  c.fillStyle = '#ebc0cf';
  c.fillRect(0, 0, W, H);
  // canalé del terciopelo
  for (let x = 0; x < W; x += 4) {
    c.fillStyle = x % 8 ? 'rgba(255,255,255,0.10)' : 'rgba(150,80,100,0.06)';
    c.fillRect(x, 0, 2, H);
  }
  const cx = W * 0.25, cy = H * 0.5;
  // flor grande: pétalos de rizo beige con borde naranja y centro rojo
  const fx = cx + 52, fy = cy - 34;
  c.strokeStyle = '#6b1f2a'; c.lineWidth = 5;
  c.beginPath(); c.moveTo(fx, fy + 22); c.quadraticCurveTo(fx + 6, fy + 70, fx + 2, fy + 112); c.stroke();
  const leaf = (x, y, a, col) => {
    c.save(); c.translate(x, y); c.rotate(a); c.fillStyle = col;
    c.beginPath(); c.ellipse(0, 0, 18, 9, 0, 0, Math.PI * 2); c.fill();
    c.strokeStyle = 'rgba(255,255,255,0.5)'; c.lineWidth = 1.5; c.beginPath(); c.moveTo(-14, 0); c.lineTo(14, 0); c.stroke();
    c.restore();
  };
  leaf(fx - 20, fy + 84, 0.4, '#6e2a3c');
  leaf(fx + 26, fy + 78, -0.4, '#a9d36e');
  for (let i = 0; i < 5; i++) {
    const a = -Math.PI / 2 + (i * Math.PI * 2) / 5;
    c.fillStyle = '#f08a5d';
    c.beginPath(); c.arc(fx + Math.cos(a) * 24, fy + Math.sin(a) * 24, 21, 0, Math.PI * 2); c.fill();
  }
  for (let i = 0; i < 5; i++) {
    const a = -Math.PI / 2 + (i * Math.PI * 2) / 5;
    c.fillStyle = '#f3dcbd';
    c.beginPath(); c.arc(fx + Math.cos(a) * 24, fy + Math.sin(a) * 24, 17, 0, Math.PI * 2); c.fill();
  }
  c.fillStyle = '#f3dcbd'; c.beginPath(); c.arc(fx, fy, 20, 0, Math.PI * 2); c.fill();
  c.fillStyle = '#d8333a'; c.beginPath(); c.arc(fx, fy, 14, 0, Math.PI * 2); c.fill();
  // flor de lunares roja con botón, y el caracol encima
  const px = cx - 52, py = cy + 22;
  c.strokeStyle = '#6b1f2a'; c.lineWidth = 4;
  c.beginPath(); c.moveTo(px, py + 24); c.lineTo(px + 4, py + 58); c.stroke();
  leaf(px + 14, py + 56, -0.3, '#6e2a3c');
  c.fillStyle = '#e2493f'; c.beginPath(); c.arc(px, py, 27, 0, Math.PI * 2); c.fill();
  c.fillStyle = '#ffffff';
  for (const [dx, dy] of [[-14, -12], [6, -18], [16, 2], [-4, 12], [-18, 8], [10, 16]]) { c.beginPath(); c.arc(px + dx, py + dy, 4, 0, Math.PI * 2); c.fill(); }
  c.fillStyle = '#a9d36e'; c.beginPath(); c.arc(px, py, 7, 0, Math.PI * 2); c.fill();
  c.fillStyle = '#3a95d4';
  c.beginPath(); c.ellipse(px + 6, py - 30, 30, 7, -0.1, 0, Math.PI * 2); c.fill();
  c.beginPath(); c.ellipse(px + 32, py - 44, 8, 13, 0.3, 0, Math.PI * 2); c.fill();
  c.strokeStyle = '#3a95d4'; c.lineWidth = 2.5;
  c.beginPath(); c.moveTo(px + 32, py - 54); c.lineTo(px + 28, py - 68); c.moveTo(px + 36, py - 54); c.lineTo(px + 42, py - 66); c.stroke();
  c.fillStyle = '#ffffff'; c.beginPath(); c.arc(px + 34, py - 46, 3.5, 0, Math.PI * 2); c.fill();
  c.fillStyle = '#c8e07a'; c.beginPath(); c.arc(px - 2, py - 50, 22, 0, Math.PI * 2); c.fill();
  c.strokeStyle = '#3a95d4'; c.lineWidth = 2;
  c.beginPath(); c.arc(px - 2, py - 50, 13, 0, Math.PI * 1.5); c.stroke();
  ozitaTex = new THREE.CanvasTexture(cv);
  ozitaTex.colorSpace = THREE.SRGBColorSpace;
  return ozitaTex;
}

// Punto «tweed» teja con motitas crema y naranja (ya coloreado).
let tweedTex = null;
function getTweed() {
  if (!tweedTex) tweedTex = canvasTex(256, (ctx, S) => {
    ctx.fillStyle = '#a55638';
    ctx.fillRect(0, 0, S, S);
    for (let y = 0; y < S; y += 4) {
      ctx.fillStyle = y % 8 ? 'rgba(255,255,255,0.05)' : 'rgba(60,20,10,0.08)';
      ctx.fillRect(0, y, S, 2);
    }
    for (let i = 0; i < 900; i++) {
      ctx.fillStyle = Math.random() < 0.6 ? 'rgba(240,215,185,0.85)' : 'rgba(235,130,60,0.9)';
      const x = Math.random() * S, y = Math.random() * S;
      ctx.fillRect(x, y, 1.5 + Math.random() * 3, 1.2);
    }
  }, 3);
  return tweedTex;
}

// Chenilla: rizos cortos y apretados para la barriga y la cola de Foxy.
let chenilleTex = null;
function getChenille() {
  if (!chenilleTex) chenilleTex = canvasTex(256, (ctx, S) => {
    ctx.fillStyle = '#6a6a6a';
    ctx.fillRect(0, 0, S, S);
    ctx.lineCap = 'round';
    for (let i = 0; i < 2600; i++) {
      const x = Math.random() * S, y = Math.random() * S, r = 2 + Math.random() * 3;
      const v = 150 + Math.random() * 105;
      ctx.strokeStyle = `rgb(${v},${v},${v})`;
      ctx.lineWidth = 1.6 + Math.random() * 1.6;
      ctx.beginPath();
      ctx.arc(x, y, r, Math.random() * 6, Math.random() * 6 + 3.5);
      ctx.stroke();
    }
  }, 3);
  return chenilleTex;
}

// Pelo largo: mechones verticales para Bananito.
let shagTex = null;
function getShag() {
  if (!shagTex) shagTex = canvasTex(256, (ctx, S) => {
    ctx.fillStyle = '#ececec';
    ctx.fillRect(0, 0, S, S);
    ctx.lineCap = 'round';
    for (let i = 0; i < 3200; i++) {
      const x = Math.random() * S, y = Math.random() * S, l = 8 + Math.random() * 14;
      const v = 205 + Math.random() * 50;
      ctx.strokeStyle = `rgb(${v},${v},${v})`;
      ctx.lineWidth = 1 + Math.random() * 1.5;
      ctx.beginPath();
      ctx.moveTo(x, y);
      ctx.quadraticCurveTo(x + (Math.random() - 0.5) * 6, y + l / 2, x + (Math.random() - 0.5) * 8, y + l);
      ctx.stroke();
    }
  }, 3);
  return shagTex;
}

// Camiseta verde con el cartel amarillo del canguro (el frente en el centro).
let teeTex = null;
function getKangarooTee() {
  if (teeTex) return teeTex;
  const cv = document.createElement('canvas');
  cv.width = 1024; cv.height = 512;
  const c = cv.getContext('2d');
  c.fillStyle = '#1f8f6a';
  c.fillRect(0, 0, 1024, 512);
  const cx = 512, cy = 250, r = 150;
  c.fillStyle = '#f3d23b';
  c.strokeStyle = '#1a1a1a';
  c.lineWidth = 6;
  c.beginPath(); c.moveTo(cx, cy - r); c.lineTo(cx + r, cy); c.lineTo(cx, cy + r); c.lineTo(cx - r, cy); c.closePath();
  c.fill(); c.stroke();
  // silueta del canguro saltando
  c.fillStyle = '#163d2a';
  c.beginPath();
  c.ellipse(cx + 5, cy, 46, 22, -0.25, 0, Math.PI * 2);
  c.ellipse(cx + 52, cy - 30, 14, 10, -0.3, 0, Math.PI * 2);
  c.fill();
  c.lineCap = 'round';
  c.strokeStyle = '#163d2a';
  c.lineWidth = 9;
  c.beginPath(); c.moveTo(cx - 35, cy + 10); c.quadraticCurveTo(cx - 80, cy + 20, cx - 105, cy + 4); c.stroke();
  c.lineWidth = 7;
  c.beginPath(); c.moveTo(cx + 10, cy + 15); c.lineTo(cx + 35, cy + 45); c.lineTo(cx + 70, cy + 48); c.stroke();
  c.beginPath(); c.moveTo(cx + 56, cy - 40); c.lineTo(cx + 54, cy - 58); c.stroke();
  teeTex = new THREE.CanvasTexture(cv);
  teeTex.colorSpace = THREE.SRGBColorSpace;
  return teeTex;
}

// Grupo sobre la peana: stand (fijo) > body (salta y se aplasta).
function rig(g) {
  const stand = new THREE.Group();
  stand.position.y = 0.08;
  g.add(stand);
  const body = new THREE.Group();
  stand.add(body);
  return body;
}

// ------------------------------------------------------------------
// Piezas comunes
// ------------------------------------------------------------------

// Lazo: dos lazadas y un nudo.
function bow(mat, size = 1) {
  const g = new THREE.Group();
  const loop = new THREE.SphereGeometry(1, 20, 14);
  for (const s of [-1, 1]) {
    const l = part(loop, mat, s * 0.11 * size, 0, 0);
    l.scale.set(0.12 * size, 0.08 * size, 0.05 * size);
    l.rotation.z = s * 0.25;
    g.add(l);
  }
  g.add(ball(mat, 0.045 * size, 0, 0, 0.01, 1, 1, 0.8));
  return g;
}

// ------------------------------------------------------------------
// Los peluches
// ------------------------------------------------------------------

const BUILDERS = {
  // Pingu: azul eléctrico, cara blanca en dos lóbulos con la «V» azul en medio.
  pinguino() {
    const g = this;
    const blue = fabric('#2a9bff'), white = fabric('#f6f3ec'), orange = felt('#f8a35a');
    const body = rig(g);
    body.add(ball(blue, 0.43, 0, 0.42, 0, 1, 0.95, 0.92));
    body.add(ball(white, 0.33, 0, 0.38, 0.17, 1, 1.12, 0.78)); // barriga
    body.add(ball(orange, 0.12, -0.17, 0.05, 0.3, 1, 0.65, 1.3));
    body.add(ball(orange, 0.12, 0.17, 0.05, 0.3, 1, 0.65, 1.3));
    const armL = ball(blue, 1, -0.4, 0.4, -0.04, 0.08, 0.22, 0.16);
    const armR = ball(blue, 1, 0.4, 0.4, -0.04, 0.08, 0.22, 0.16);
    armL.rotation.z = 0.12; armR.rotation.z = -0.12;
    body.add(armL, armR);
    const head = new THREE.Group();
    head.position.y = 1.0;
    body.add(head);
    head.add(ball(blue, 0.45, 0, 0, 0, 1.02, 0.95, 0.95));
    head.add(ball(white, 0.22, -0.15, -0.02, 0.27, 1, 1.25, 0.75));
    head.add(ball(white, 0.22, 0.15, -0.02, 0.27, 1, 1.25, 0.75));
    head.add(ball(white, 0.26, 0, -0.17, 0.25, 1.3, 0.8, 0.75));
    glitterEye(head, -0.16, 0.02, 0.4, 0.115, '#4fb4f2');
    glitterEye(head, 0.16, 0.02, 0.4, 0.115, '#4fb4f2');
    head.add(ball(orange, 0.1, 0, -0.08, 0.45, 1, 0.8, 1.25));
    stitch(head, [-0.06, -0.08, 0.57], [0.06, -0.08, 0.57], '#e0863e', 0.006);
    return { body, head, armL, armR };
  },

  // Lulu: conejita de ganchillo con cabeza de huevo y una oreja caída.
  conejita() {
    const g = this;
    const grey = crochet('#cfc8c2'), cream = crochet('#f7f2e8'), pink = felt('#f3a7a4');
    const body = rig(g);
    body.add(ball(grey, 0.29, 0, 0.42, 0, 1, 1.25, 0.9));
    // piernas sentadas hacia delante con pies crema
    for (const s of [-1, 1]) {
      const leg = part(new THREE.CapsuleGeometry(0.075, 0.2, 6, 12), grey, s * 0.15, 0.11, 0.14);
      leg.rotation.x = Math.PI / 2;
      body.add(leg);
      body.add(ball(cream, 0.12, s * 0.16, 0.11, 0.33, 0.95, 0.95, 1.15));
    }
    // brazos largos con manitas crema
    const arms = [-1, 1].map((s) => {
      const arm = new THREE.Group();
      arm.position.set(s * 0.25, 0.68, 0.04);
      arm.rotation.z = s * 0.4;
      const a = part(new THREE.CapsuleGeometry(0.06, 0.26, 6, 12), grey, 0, -0.17, 0);
      arm.add(a);
      arm.add(ball(cream, 0.09, 0, -0.34, 0.01, 1, 1.15, 1));
      body.add(arm);
      return arm;
    });
    const head = new THREE.Group();
    head.position.y = 1.12;
    body.add(head);
    head.add(ball(grey, 0.38, 0, 0, 0, 0.88, 1.12, 0.88));
    head.add(ball(cream, 0.17, 0, -0.2, 0.25, 1.15, 0.95, 0.85)); // hocico
    const nose = part(new THREE.ConeGeometry(0.05, 0.07, 3), pink, 0, -0.12, 0.39);
    nose.rotation.set(Math.PI / 2 + 0.3, 0, Math.PI);
    head.add(nose);
    stitch(head, [0, -0.16, 0.395], [0.01, -0.27, 0.37]);
    for (const s of [-1, 1]) {
      head.add(ball(shiny('#16141a'), 0.062, s * 0.15, -0.02, 0.29, 1, 1, 0.65));
      head.add(ball(shiny('#ffffff'), 0.016, s * 0.15 + 0.02, 0.0, 0.33));
      // cejas bordadas, más altas por dentro: cara de buena
      stitch(head, [s * 0.09, 0.12, 0.3], [s * 0.21, 0.08, 0.26]);
    }
    const earGeo = new THREE.SphereGeometry(1, 24, 16);
    const earL = part(earGeo, grey, -0.11, 0.62, -0.02);
    earL.scale.set(0.13, 0.3, 0.05);
    earL.rotation.z = 0.12;
    const earR = part(earGeo, grey, 0.3, 0.45, -0.02);
    earR.scale.set(0.13, 0.26, 0.05);
    earR.rotation.z = -0.95;
    head.add(earL, earR);
    return { body, head, armL: arms[0], armR: arms[1] };
  },

  // Moni: unicornio lila con ojos de purpurina arcoíris.
  unicornio() {
    const g = this;
    const lilac = fabric('#b98ad9'), cream = fabric('#efe5d9'), hoof = glitter('#a774c4');
    const pinkGlit = glitter('#e7a6d6');
    const rainbow = ['#ef5b5b', '#f7a440', '#f4e04d', '#7ed957', '#4aa3df', '#9b6ad6'];
    const body = rig(g);
    body.add(ball(lilac, 0.27, 0, 0.36, 0, 1, 1.2, 1.1));
    // patas delanteras rectas y traseras dobladas, con pezuñas de purpurina
    for (const s of [-1, 1]) {
      const fl = part(new THREE.CapsuleGeometry(0.07, 0.16, 6, 12), lilac, s * 0.1, 0.2, 0.17);
      body.add(fl);
      body.add(ball(hoof, 0.085, s * 0.1, 0.05, 0.21, 1, 0.75, 1.15));
      body.add(ball(lilac, 0.13, s * 0.21, 0.13, -0.02, 0.8, 0.75, 1.3));
      body.add(ball(hoof, 0.08, s * 0.22, 0.05, 0.14, 1, 0.75, 1.1));
    }
    // cola arcoíris
    ['#7ed957', '#4aa3df', '#9b6ad6'].forEach((c, i) => body.add(ball(fabric(c), 0.075, 0, 0.22 - i * 0.05, -0.3 - i * 0.06)));
    const head = new THREE.Group();
    head.position.y = 0.98;
    body.add(head);
    head.add(ball(lilac, 0.41, 0, 0, 0, 1, 0.98, 0.95));
    head.add(ball(cream, 0.12, 0, -0.2, 0.33, 1.2, 0.9, 0.95)); // hocico
    const grin = part(new THREE.TorusGeometry(0.055, 0.009, 6, 16, Math.PI * 0.8), shiny('#e36d8f'), 0, -0.21, 0.44);
    grin.rotation.z = Math.PI + Math.PI * 0.1;
    head.add(grin);
    head.add(ball(shiny('#e36d8f'), 0.014, -0.04, -0.15, 0.44));
    head.add(ball(shiny('#e36d8f'), 0.014, 0.04, -0.15, 0.44));
    glitterEye(head, -0.15, 0.01, 0.33, 0.13, rainbow);
    glitterEye(head, 0.15, 0.01, 0.33, 0.13, rainbow);
    // cuerno crema con espiral granate
    const horn = new THREE.Group();
    horn.position.set(0, 0.46, 0.1);
    horn.rotation.x = 0.2;
    horn.add(part(new THREE.ConeGeometry(0.095, 0.4, 20), cream));
    const pts = [];
    for (let i = 0; i <= 60; i++) {
      const t = i / 60, a = t * Math.PI * 2 * 4, r = 0.097 * (1 - t) + 0.004;
      pts.push(new THREE.Vector3(Math.cos(a) * r, -0.2 + t * 0.4, Math.sin(a) * r));
    }
    horn.add(part(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 120, 0.007, 5), shiny('#a3263c')));
    head.add(horn);
    for (const s of [-1, 1]) {
      const ear = part(new THREE.ConeGeometry(0.085, 0.22, 14), lilac, s * 0.24, 0.35, -0.04);
      ear.rotation.z = -s * 0.3;
      ear.scale.z = 0.55;
      const inner = part(new THREE.ConeGeometry(0.085, 0.22, 14), pinkGlit, 0, -0.01, 0.04);
      inner.scale.set(0.6, 0.8, 0.35);
      ear.add(inner);
      head.add(ear);
    }
    // crin: un mechón arcoíris desde la coronilla hacia la nuca
    rainbow.slice().reverse().forEach((c, i) => {
      const a = 0.35 + i * 0.3;
      head.add(ball(fabric(c), 0.085, 0, Math.cos(a) * 0.41, -Math.sin(a) * 0.41 + 0.02, 0.9, 1, 1.1));
    });
    return { body, head, armL: null, armR: null };
  },

  // Tigri: de ganchillo melocotón, hocico crema, nariz grande marrón y rayas bordadas.
  tigre() {
    const g = this;
    const peach = crochet('#f4a274'), cream = crochet('#f3efe6'), nose = crochet('#3b2a27');
    const ink = '#241a17';
    const body = rig(g);
    body.add(ball(peach, 0.27, 0, 0.42, 0, 1, 1.3, 0.92));
    // rayas en los costados del cuerpo
    for (const s of [-1, 1]) for (let i = 0; i < 5; i++) {
      ringStripe(body, [0, 0.42, 0], [0.27, 0.35, 0.25], -0.1 + i * 0.07, s * 1.05, s * 1.75, ink);
    }
    for (const s of [-1, 1]) {
      const leg = part(new THREE.CapsuleGeometry(0.065, 0.24, 6, 12), peach, s * 0.15, 0.1, 0.16);
      leg.rotation.x = Math.PI / 2;
      body.add(leg);
      body.add(ball(cream, 0.13, s * 0.17, 0.11, 0.38, 0.95, 0.9, 1.15));
      stitch(body, [s * 0.17 - 0.03, 0.2, 0.44], [s * 0.17 - 0.02, 0.12, 0.5], ink, 0.006);
    }
    // cola larga por detrás
    const tail = part(new THREE.CapsuleGeometry(0.035, 0.5, 6, 10), peach, -0.22, 0.08, -0.28);
    tail.rotation.set(Math.PI / 2, 0, 0.9);
    body.add(tail);
    const arms = [-1, 1].map((s) => {
      const arm = new THREE.Group();
      arm.position.set(s * 0.24, 0.7, 0.04);
      arm.rotation.z = s * 0.3;
      arm.add(part(new THREE.CapsuleGeometry(0.055, 0.26, 6, 12), peach, 0, -0.17, 0));
      arm.add(ball(cream, 0.085, 0, -0.34, 0.01, 1, 1.15, 1));
      body.add(arm);
      return arm;
    });
    const head = new THREE.Group();
    head.position.y = 1.08;
    body.add(head);
    head.add(ball(peach, 0.37, 0, 0, 0, 0.92, 1.05, 0.9));
    head.add(ball(cream, 0.19, 0, -0.17, 0.24, 1.15, 0.95, 0.85)); // hocico grande
    head.add(ball(nose, 0.1, 0, -0.07, 0.38, 1.2, 0.85, 0.7));
    stitch(head, [0, -0.14, 0.41], [0, -0.24, 0.39], ink);
    for (const s of [-1, 1]) {
      head.add(ball(shiny('#15131a'), 0.045, s * 0.11, 0.03, 0.31, 1, 1, 0.7));
      head.add(ball(shiny('#ffffff'), 0.012, s * 0.11 + 0.015, 0.045, 0.34));
      // orejas redondas de ganchillo
      head.add(ball(peach, 0.1, s * 0.25, 0.33, -0.02, 1, 1, 0.55));
      // rayas en las sienes, visibles de frente
      for (let i = 0; i < 3; i++) ringStripe(head, [0, 0, 0], [0.34, 0.39, 0.33], 0.12 - i * 0.075, s * 0.95, s * 1.6, ink);
    }
    // rayas en la coronilla, de oreja a oreja
    for (let i = 0; i < 5; i++) {
      const z = 0.06 - i * 0.075, pts = [];
      for (let j = 0; j <= 10; j++) {
        const x = -0.13 + (0.26 * j) / 10;
        const y = 0.39 * Math.sqrt(Math.max(0, 1 - (x / 0.34) ** 2 - (z / 0.33) ** 2)) + 0.01;
        pts.push(new THREE.Vector3(x, y, z));
      }
      head.add(part(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 20, 0.015, 5), shiny(ink)));
    }
    return { body, head, armL: arms[0], armR: arms[1] };
  },

  // Milka: osita chocolate con gorro lila, bufanda verde anudada y ojos bordados.
  osito() {
    const g = this;
    const brown = fabric('#6e4a33'), beige = fabric('#e8c993'), lilac = fabric('#b7a0ec'), green = fabric('#3e9a4c');
    const body = rig(g);
    body.add(ball(brown, 0.33, 0, 0.42, 0, 1, 1.05, 0.9));
    body.add(ball(beige, 0.22, 0, 0.42, 0.15, 1, 1.25, 0.6));
    for (const s of [-1, 1]) {
      body.add(ball(brown, 0.15, s * 0.15, 0.1, 0.22, 0.9, 0.8, 1.35));
      stitch(body, [s * 0.15 - 0.04, 0.17, 0.42], [s * 0.15 - 0.04, 0.05, 0.42], '#4a3022', 0.01);
      stitch(body, [s * 0.15 + 0.04, 0.17, 0.42], [s * 0.15 + 0.04, 0.05, 0.42], '#4a3022', 0.01);
    }
    const armL = ball(brown, 1, -0.36, 0.42, 0.06, 0.1, 0.24, 0.14);
    const armR = ball(brown, 1, 0.36, 0.42, 0.06, 0.1, 0.24, 0.14);
    armL.rotation.z = -0.75; armR.rotation.z = 0.75;
    body.add(armL, armR);
    // bufanda anudada con dos puntas colgando
    const scarf = part(new THREE.TorusGeometry(0.22, 0.065, 12, 32), green, 0, 0.78, 0);
    scarf.rotation.x = Math.PI / 2;
    body.add(scarf);
    body.add(ball(green, 0.075, -0.08, 0.74, 0.23));
    const end1 = part(new THREE.BoxGeometry(0.1, 0.32, 0.05), green, -0.04, 0.56, 0.27);
    end1.rotation.z = 0.12;
    const end2 = part(new THREE.BoxGeometry(0.1, 0.26, 0.05), green, -0.2, 0.62, 0.24);
    end2.rotation.z = -0.7;
    body.add(end1, end2);
    const head = new THREE.Group();
    head.position.y = 1.1;
    body.add(head);
    head.add(ball(brown, 0.36, 0, 0, 0, 0.95, 1.05, 0.92));
    head.add(ball(beige, 0.22, 0, -0.14, 0.22, 1.15, 0.9, 0.8)); // hocico
    head.add(ball(shiny('#141212'), 0.075, 0, -0.04, 0.4, 1.25, 0.9, 0.8)); // nariz
    stitch(head, [0, -0.1, 0.42], [0, -0.17, 0.41], '#1d1515');
    // boca abierta con lengua roja
    const mouth = part(new THREE.SphereGeometry(1, 16, 8, 0, Math.PI * 2, Math.PI / 2, Math.PI / 2), shiny('#1d1515'), 0, -0.18, 0.39);
    mouth.scale.set(0.09, 0.06, 0.03);
    head.add(mouth);
    head.add(ball(shiny('#d8363c'), 0.035, 0, -0.215, 0.405, 1.1, 0.5, 0.4));
    for (const s of [-1, 1]) {
      // ojo bordado: aro lila, pupila negra y brillo
      head.add(ball(felt('#a68ad8'), 0.07, s * 0.13, 0.08, 0.3, 0.85, 1.1, 0.25));
      head.add(ball(shiny('#141212'), 0.052, s * 0.13, 0.075, 0.315, 0.85, 1.1, 0.25));
      head.add(ball(shiny('#ffffff'), 0.012, s * 0.13 + 0.015, 0.11, 0.33));
    }
    // gorro lila caído con vuelta y pompón, las orejas asoman
    for (const s of [-1, 1]) head.add(ball(brown, 0.075, s * 0.3, 0.27, -0.02, 1, 1, 0.6));
    const cap = part(new THREE.SphereGeometry(0.36, 28, 14, 0, Math.PI * 2, 0, Math.PI * 0.5), lilac, 0, 0.14, -0.03);
    cap.scale.set(1.08, 0.75, 1.05);
    cap.rotation.x = -0.15;
    head.add(cap);
    const cuff = part(new THREE.TorusGeometry(0.34, 0.075, 12, 32), lilac, 0, 0.16, -0.02);
    cuff.rotation.x = Math.PI / 2 - 0.15;
    cuff.scale.set(1.05, 1.05, 1);
    head.add(cuff);
    head.add(ball(lilac, 0.075, 0.03, 0.42, -0.08));
    return { body, head, armL, armR };
  },

  // Winnie the Poos: asomando de su tarro de miel «HUNNY».
  winnie() {
    const g = this;
    const yellow = fabric('#ffe27a'), pot = fabric('#8a6b52'), honey = fabric('#e5e58c'), red = fabric('#d8463c');
    const body = rig(g);
    body.add(ball(pot, 0.37, 0, 0.36, 0, 1, 0.97, 1));
    const band = part(new THREE.CylinderGeometry(0.375, 0.375, 0.24, 48, 1, true, -Math.PI, Math.PI * 2),
      new THREE.MeshPhysicalMaterial({ map: getHunny(), bumpMap: getFur(), bumpScale: 0.5, roughness: 1, sheen: 1, sheenColor: new THREE.Color('#ffffff') }),
      0, 0.38, 0);
    body.add(band);
    // miel desbordando por el borde
    const rim = part(new THREE.TorusGeometry(0.27, 0.075, 12, 36), honey, 0, 0.68, 0);
    rim.rotation.x = Math.PI / 2;
    body.add(rim);
    for (let i = 0; i < 7; i++) {
      const a = (i / 7) * Math.PI * 2;
      body.add(ball(honey, 0.07, Math.sin(a) * 0.31, 0.62 - (i % 2) * 0.03, Math.cos(a) * 0.31, 1, 1.3, 1));
    }
    // camiseta roja con cuello blanco
    body.add(ball(red, 0.21, 0, 0.8, -0.02, 1.05, 0.8, 0.95));
    const collar = part(new THREE.TorusGeometry(0.13, 0.03, 8, 24), fabric('#fbf8f1'), 0, 0.92, 0.02);
    collar.rotation.x = Math.PI / 2;
    body.add(collar);
    // un brazo en la mejilla y otro sujetando el palito de la miel
    const armR = ball(yellow, 0.085, 0.24, 1.05, 0.2, 0.9, 1.4, 0.9);
    armR.rotation.z = 0.4;
    const armL = ball(yellow, 0.085, -0.24, 0.8, 0.22, 1.4, 0.9, 0.9);
    armL.rotation.z = 0.2;
    body.add(armL, armR);
    const dipper = part(new THREE.CylinderGeometry(0.012, 0.012, 0.32, 6), fabric('#6b4a33'), -0.12, 0.72, 0.3);
    dipper.rotation.set(0.3, 0, 1.2);
    body.add(dipper);
    const head = new THREE.Group();
    head.position.y = 1.15;
    body.add(head);
    head.add(ball(yellow, 0.3, 0, 0, 0, 1.05, 0.95, 0.95));
    head.add(ball(yellow, 0.13, 0, -0.08, 0.22, 1.25, 0.9, 0.9)); // morrito
    head.add(ball(shiny('#1c1716'), 0.035, 0, -0.03, 0.35, 1.2, 0.85, 0.8));
    for (const s of [-1, 1]) {
      head.add(ball(yellow, 0.075, s * 0.22, 0.22, -0.03, 1, 1, 0.55));
      // ojos cerrados de felicidad
      const lid = part(new THREE.TorusGeometry(0.035, 0.008, 6, 12, Math.PI), shiny('#1c1716'), s * 0.11, 0.05, 0.28);
      head.add(lid);
    }
    const grin = part(new THREE.TorusGeometry(0.08, 0.009, 6, 16, Math.PI * 0.8), shiny('#1c1716'), 0, -0.1, 0.32);
    grin.rotation.z = Math.PI + Math.PI * 0.1;
    head.add(grin);
    head.add(ball(felt('#f08c9a'), 0.025, -0.06, -0.15, 0.32, 1.2, 0.7, 0.6)); // lengua golosa
    return { body, head, armL, armR };
  },

  // Early grey: pingüino gris de una pieza, aletas abiertas, gorrito y bufanda de punto.
  earlygrey() {
    const g = this;
    const grey = fabric('#7d93b5'), white = fabric('#f7f5f0'), yellow = felt('#f3df86');
    const knit = knitted('#aba5ae'), pom = fabric('#eeeae2');
    const body = rig(g);
    body.add(ball(grey, 0.41, 0, 0.6, 0, 1, 1.38, 0.95)); // cuerpo y cabeza en un solo huevo
    body.add(ball(white, 0.33, 0, 0.42, 0.16, 1, 1.05, 0.76)); // barriga
    body.add(ball(grey, 0.08, 0, 0.18, -0.38)); // colita
    for (const s of [-1, 1]) body.add(ball(yellow, 0.1, s * 0.13, 0.05, 0.26, 1, 0.6, 1.4));
    const armL = ball(grey, 1, -0.5, 0.62, 0.02, 0.22, 0.085, 0.13);
    const armR = ball(grey, 1, 0.5, 0.62, 0.02, 0.22, 0.085, 0.13);
    armL.rotation.z = -0.2; armR.rotation.z = 0.2;
    body.add(armL, armR);
    const head = new THREE.Group();
    body.add(head);
    // cara blanca en dos lóbulos, con la uve gris entre los ojos
    head.add(ball(white, 0.2, -0.13, 0.9, 0.25, 1, 1.25, 0.72));
    head.add(ball(white, 0.2, 0.13, 0.9, 0.25, 1, 1.25, 0.72));
    head.add(ball(white, 0.23, 0, 0.77, 0.26, 1.3, 0.7, 0.72));
    for (const s of [-1, 1]) {
      head.add(ball(shiny('#15131a'), 0.028, s * 0.13, 0.93, 0.395, 1, 1.1, 0.7));
      head.add(ball(shiny('#ffffff'), 0.008, s * 0.13 + 0.008, 0.94, 0.415));
    }
    head.add(ball(yellow, 0.085, 0, 0.84, 0.41, 1.15, 0.85, 1.05)); // pico
    // gorrito de punto ladeado con la punta torcida
    const hat = new THREE.Group();
    hat.position.set(0.15, 1.15, -0.02);
    hat.rotation.z = -0.4;
    const cuff = part(new THREE.TorusGeometry(0.115, 0.05, 10, 24), knit);
    cuff.rotation.x = Math.PI / 2;
    hat.add(cuff);
    hat.add(ball(knit, 0.12, 0, 0.09, 0, 1, 1.3, 1));
    hat.add(ball(knit, 0.04, 0.02, 0.26, 0));
    head.add(hat);
    // bufanda de punto ceñida al cuello, con dos puntas cortas y pompones pegados a la barriga
    const scarf = part(new THREE.TorusGeometry(0.385, 0.045, 10, 48), knit, 0, 0.74, 0.01);
    scarf.rotation.x = Math.PI / 2;
    scarf.scale.set(1, 0.97, 1);
    body.add(scarf);
    for (const s of [-1, 1]) {
      const tail = part(new THREE.BoxGeometry(0.06, 0.17, 0.03), knit, s * 0.06, 0.63, 0.42);
      tail.rotation.set(-0.2, 0, s * 0.18);
      body.add(tail);
      body.add(ball(pom, 0.042, s * 0.08, 0.53, 0.44));
    }
    return { body, head, armL, armR };
  },

  // Ozita: osita de cabeza beige, orejas rosas y cuerpo de bola rosa con bordados.
  ozita() {
    const g = this;
    const tan = fabric('#d8b98d'), cream = fabric('#f3e6cd'), terry = fabric('#e9e3d8'), orange = fabric('#f6b27d');
    const pink = fabric('#ecb9c8'), green = fabric('#cfe3a0');
    const velvet = new THREE.MeshPhysicalMaterial({
      map: getOzitaBody(), bumpMap: getFur(), bumpScale: 0.4, roughness: 0.9, sheen: 1, sheenRoughness: 0.4,
      sheenColor: new THREE.Color('#ffffff'),
    });
    const body = rig(g);
    body.add(ball(velvet, 0.43, 0, 0.42, 0, 1, 0.92, 0.95));
    // piernas de rizo hacia delante con la planta beige
    for (const s of [-1, 1]) {
      const leg = ball(terry, 0.16, s * 0.27, 0.11, 0.2, 0.95, 0.68, 1.35);
      leg.rotation.y = s * 0.35;
      body.add(leg);
      const sole = ball(tan, 0.13, s * 0.33, 0.1, 0.37, 1, 0.75, 0.35);
      sole.rotation.y = s * 0.35;
      body.add(sole);
    }
    // brazos de rizo hacia los lados con manos naranjas
    const arms = [-1, 1].map((s) => {
      const arm = new THREE.Group();
      arm.position.set(s * 0.32, 0.64, 0.04);
      arm.rotation.z = s * -0.35;
      arm.add(ball(terry, 1, s * 0.12, 0, 0, 0.2, 0.12, 0.13));
      arm.add(ball(orange, 0.1, s * 0.3, -0.02, 0.01, 1, 1, 0.95));
      body.add(arm);
      return arm;
    });
    // mordedor verde en forma de flor, colgado del costado
    const teether = new THREE.Group();
    teether.position.set(0.43, 0.3, -0.06);
    teether.rotation.y = Math.PI / 2 - 0.2;
    const petalGeo = new THREE.CylinderGeometry(0.04, 0.04, 0.02, 16);
    const rubber = new THREE.MeshStandardMaterial({ color: '#b7e07a', roughness: 0.45 });
    for (let i = 0; i < 5; i++) {
      const a = (i / 5) * Math.PI * 2;
      const pt = part(petalGeo, rubber, Math.cos(a) * 0.045, Math.sin(a) * 0.045, 0);
      pt.rotation.x = Math.PI / 2;
      teether.add(pt);
    }
    body.add(teether);
    const collar = part(new THREE.TorusGeometry(0.15, 0.05, 10, 28), green, 0, 0.8, 0);
    collar.rotation.x = Math.PI / 2;
    body.add(collar);
    const head = new THREE.Group();
    head.position.y = 1.07;
    body.add(head);
    head.add(ball(tan, 0.33, 0, 0, 0, 1.05, 0.95, 0.95));
    head.add(ball(cream, 0.15, 0, -0.09, 0.25, 1.2, 0.85, 0.75)); // hocico
    head.add(ball(shiny('#5a3828'), 0.036, 0, -0.04, 0.36, 1.3, 1, 0.6)); // nariz bordada
    const grin = part(new THREE.TorusGeometry(0.075, 0.008, 6, 20, Math.PI * 0.85), shiny('#5a3828'), 0, -0.1, 0.355);
    grin.rotation.z = Math.PI + Math.PI * 0.075;
    head.add(grin);
    for (const s of [-1, 1]) {
      // ojitos bordados con pestañas
      head.add(ball(shiny('#2a1d1a'), 0.026, s * 0.12, 0.05, 0.3, 1, 0.75, 0.5));
      stitch(head, [s * 0.14, 0.07, 0.3], [s * 0.165, 0.09, 0.285], '#2a1d1a', 0.005);
      stitch(head, [s * 0.15, 0.06, 0.3], [s * 0.18, 0.07, 0.28], '#2a1d1a', 0.005);
      // orejas rosas
      head.add(ball(pink, 0.11, s * 0.25, 0.23, -0.02, 1, 1, 0.5));
      head.add(ball(felt('#f4d2db'), 0.07, s * 0.25, 0.23, 0.03, 1, 1, 0.35));
    }
    return { body, head, armL: arms[0], armR: arms[1] };
  },

  // Gluglu: caballito de mar salmón con cresta, aletas y la cola enroscada.
  gluglu() {
    const g = this;
    const pink = fabric('#f7a596'), light = fabric('#f9b9ad');
    const body = rig(g);
    body.add(ball(pink, 0.26, 0, 0.55, 0.03, 1, 1.42, 0.92)); // barriga
    body.add(ball(pink, 0.17, 0, 0.24, -0.04));
    for (let i = 0; i < 4; i++) ringStripe(body, [0, 0.55, 0.03], [0.26, 0.37, 0.24], -0.2 + i * 0.09, -0.9, 0.9, '#e88d80', 0.01);
    // cola enroscada por delante, apoyada en la peana
    const curl = part(new THREE.TorusGeometry(0.085, 0.055, 10, 24, Math.PI * 1.6), pink, 0, 0.13, 0.14);
    curl.rotation.set(0, Math.PI / 2, Math.PI * 0.6);
    body.add(curl);
    body.add(ball(pink, 0.06, 0, 0.17, 0.05));
    // aleta dorsal festoneada
    const dorsal = ball(light, 1, 0, 0.55, -0.25, 0.03, 0.16, 0.12);
    dorsal.rotation.x = -0.2;
    body.add(dorsal);
    for (let i = 0; i < 4; i++) body.add(ball(light, 0.03, 0, 0.43 + i * 0.075, -0.36 + Math.abs(i - 1.5) * 0.02, 0.6, 1, 1));
    const head = new THREE.Group();
    head.position.set(0, 1.0, 0);
    body.add(head);
    head.add(ball(pink, 0.17, 0, -0.1, -0.06)); // cuello
    head.add(ball(pink, 0.2, 0, 0.06, 0.02, 0.85, 1, 1.12));
    // hocico largo hacia delante con la punta redonda
    const snout = part(new THREE.CapsuleGeometry(0.055, 0.17, 6, 12), pink, 0, -0.02, 0.24);
    snout.rotation.x = 2.1;
    head.add(snout);
    head.add(ball(pink, 0.075, 0, -0.08, 0.34, 1, 0.9, 1));
    for (const s of [-1, 1]) {
      head.add(ball(shiny('#15131a'), 0.028, s * 0.15, 0.1, 0.1, 0.6, 1, 1));
      head.add(ball(shiny('#ffffff'), 0.008, s * 0.165, 0.11, 0.115));
    }
    // cresta de pinchos y aleta en abanico en la nuca
    [[0, 0.27, 0.05, 0], [0, 0.25, -0.04, -0.3], [0, 0.21, -0.12, -0.6]].forEach(([x, y, z, rx]) => {
      const spike = part(new THREE.ConeGeometry(0.035, 0.13, 10), pink, x, y, z);
      spike.rotation.x = rx;
      head.add(spike);
    });
    const fan = part(new THREE.CylinderGeometry(0.13, 0.13, 0.025, 20, 1, false, 0, Math.PI), light, 0, 0.14, -0.16);
    fan.rotation.set(0, Math.PI / 2, Math.PI / 2 + 0.6);
    head.add(fan);
    body.rotation.y = -0.6; // de medio perfil, como se reconoce un caballito de mar
    return { body, head, armL: null, armR: null };
  },

  // Foxy: zorro de punto tweed, hocico crema, barriga y cola de chenilla, patas larguísimas.
  foxy() {
    const g = this;
    const tweed = fabric('#ffffff', getTweed(), getFur(), 0.6);
    const cream = knitted('#d9d2c6');
    const shag = fabric('#5a3320', getChenille(), getChenille(), 4);
    const body = rig(g);
    body.add(ball(tweed, 0.22, 0, 0.42, -0.02, 1, 1.3, 0.9));
    body.add(ball(shag, 0.2, 0, 0.38, 0.06, 0.95, 1.2, 0.75)); // barriga peluda
    // cola de chenilla por detrás
    const tail = ball(shag, 1, 0, 0.2, -0.3, 0.09, 0.09, 0.2);
    tail.rotation.x = -0.4;
    body.add(tail);
    // piernas largas estiradas hacia delante, con pies ovalados
    for (const s of [-1, 1]) {
      const leg = part(new THREE.CapsuleGeometry(0.045, 0.42, 6, 10), tweed, s * 0.1, 0.07, 0.3);
      leg.rotation.x = Math.PI / 2;
      body.add(leg);
      body.add(ball(tweed, 0.075, s * 0.1, 0.08, 0.56, 0.9, 0.8, 1.5));
    }
    // brazos larguísimos colgando hasta el suelo
    const arms = [-1, 1].map((s) => {
      const arm = new THREE.Group();
      arm.position.set(s * 0.2, 0.62, 0.02);
      arm.rotation.z = s * 0.2;
      arm.add(part(new THREE.CapsuleGeometry(0.04, 0.42, 6, 10), tweed, 0, -0.25, 0));
      arm.add(ball(tweed, 0.06, 0, -0.5, 0.02, 1, 1.3, 0.8));
      body.add(arm);
      return arm;
    });
    const head = new THREE.Group();
    head.position.y = 0.93;
    body.add(head);
    head.add(ball(tweed, 0.27, 0, 0, 0, 1, 1, 1));
    // morro redondeado con la «barba» crema de punto y una bolita marrón de nariz
    head.add(ball(tweed, 0.12, 0, -0.06, 0.17, 0.9, 0.75, 1.3));
    head.add(ball(cream, 0.2, 0, -0.12, 0.17, 1.15, 0.65, 0.95));
    head.add(ball(fabric('#7a4128', getFur(), getFur(), 0.5), 0.042, 0, -0.04, 0.36));
    for (const s of [-1, 1]) {
      head.add(ball(shiny('#1d1716'), 0.022, s * 0.1, 0.1, 0.25, 1, 0.75, 0.6));
      const ear = part(new THREE.ConeGeometry(0.09, 0.26, 14), tweed, s * 0.15, 0.3, -0.02);
      ear.rotation.z = -s * 0.25;
      ear.scale.z = 0.5;
      head.add(ear);
    }
    return { body, head, armL: arms[0], armR: arms[1] };
  },

  // Orqui: orca pequeñita de rizo rosa, nadando en horizontal, con la barriga y las manchas azul clarito.
  orci() {
    const g = this;
    const pink = fabric('#f3c1cd', getFur(), getFur(), 0.7), blue = fabric('#bfe0e4', getFur(), getFur(), 0.7);
    const body = rig(g);
    const swim = new THREE.Group(); // el cuerpo a lo largo de z, con la cabeza hacia delante
    swim.position.y = 0.34;
    swim.rotation.x = -0.08;
    body.add(swim);
    swim.add(ball(pink, 0.27, 0, 0, 0.02, 0.95, 0.85, 1.6)); // cuerpo
    swim.add(ball(blue, 0.24, 0, -0.07, 0.1, 0.82, 0.62, 1.45)); // barriga y barbilla
    swim.add(ball(pink, 0.15, 0, 0.02, -0.42, 0.8, 0.7, 1.3)); // pedúnculo de la cola
    for (const s of [-1, 1]) {
      // mancha azul detrás del ojo y otra en el costado
      const patch = ball(blue, 1, s * 0.22, 0.08, 0.2, 0.04, 0.07, 0.12);
      patch.rotation.y = s * 0.3;
      swim.add(patch);
      const saddle = ball(blue, 1, s * 0.18, 0.06, -0.3, 0.04, 0.06, 0.11);
      swim.add(saddle);
      swim.add(ball(shiny('#15131a'), 0.022, s * 0.2, 0.05, 0.33));
      // aletas pectorales hacia los lados y abajo
      const fin = ball(pink, 1, s * 0.3, -0.12, 0.18, 0.15, 0.03, 0.08);
      fin.rotation.set(0, s * 0.5, s * -0.5);
      swim.add(fin);
      // aletas de la cola, horizontales
      const fluke = ball(s < 0 ? blue : pink, 1, s * 0.12, 0.04, -0.66, 0.14, 0.03, 0.08);
      fluke.rotation.y = s * -0.5;
      swim.add(fluke);
    }
    const dorsal = part(new THREE.ConeGeometry(0.08, 0.24, 12), pink, 0, 0.3, -0.06);
    dorsal.rotation.x = -0.35;
    dorsal.scale.x = 0.35;
    swim.add(dorsal);
    const head = new THREE.Group();
    swim.add(head);
    return { body, head, armL: null, armR: null };
  },

  // Bananito: plátano curvo de pelo largo con rabito verde, manoplas y pies verdes.
  bananito() {
    const g = this;
    const shag = fabric('#ffe680', getShag(), getShag(), 2), green = fabric('#9bd34a', getFur(), getFur(), 0.6);
    const body = rig(g);
    // espina en arco de plátano: la espalda muy abombada y la punta doblada hacia delante
    const spine = (t) => {
      const a = -0.35 + t * 1.6; // ángulo a lo largo del arco
      return { y: 0.22 + Math.sin(a + 0.35) * 0.62 + t * 0.32, z: -Math.cos(a) * 0.4 + 0.33, r: 0.27 - t * 0.12 + Math.sin(Math.PI * t) * 0.05 };
    };
    for (let i = 0; i <= 32; i++) {
      const p = spine(i / 32);
      body.add(ball(shag, p.r, 0, p.y, p.z, 1, 1, 0.95));
    }
    const top = spine(1);
    const stem = part(new THREE.CapsuleGeometry(0.065, 0.2, 6, 12), green, 0, top.y + 0.08, top.z + 0.13);
    stem.rotation.x = 1.15;
    body.add(stem);
    // carita en la parte de delante, bajo la curva
    const face = spine(0.62);
    for (const s of [-1, 1]) stitch(body, [s * 0.11, face.y + 0.04, face.z + face.r * 0.93], [s * 0.05, face.y + 0.03, face.z + face.r * 0.98], '#1d1716', 0.009);
    body.add(ball(shag, 0.08, 0, face.y - 0.06, face.z + face.r * 0.95, 1.1, 0.9, 0.8));
    const mid = spine(0.38);
    const armL = ball(green, 1, -0.26, mid.y, mid.z + 0.12, 0.07, 0.12, 0.09);
    const armR = ball(green, 1, 0.26, mid.y, mid.z + 0.12, 0.07, 0.12, 0.09);
    armL.rotation.z = -0.3; armR.rotation.z = 0.3;
    body.add(armL, armR);
    for (const s of [-1, 1]) body.add(ball(green, 0.13, s * 0.13, 0.08, 0.3, 0.9, 0.7, 1.25));
    const head = new THREE.Group();
    body.add(head);
    return { body, head, armL, armR };
  },

  // Piratilla: niña de trapo con proporciones reales, melena, camiseta del canguro y parche pirata.
  piratilla() {
    const g = this;
    const skin = new THREE.MeshPhysicalMaterial({ color: '#f3cfb1', roughness: 0.9, sheen: 0.4, sheenColor: new THREE.Color('#ffffff') });
    const hair = fabric('#4a3022', getShag(), getShag(), 1.5);
    const tee = new THREE.MeshPhysicalMaterial({ map: getKangarooTee(), bumpMap: getFur(), bumpScale: 0.3, roughness: 1, sheen: 0.6, sheenColor: new THREE.Color('#ffffff') });
    const green = fabric('#1f8f6a', getFur(), getFur(), 0.3), pants = fabric('#ebe8e2', getFur(), getFur(), 0.5);
    const black = new THREE.MeshStandardMaterial({ color: '#141114', roughness: 0.6 });
    const body = rig(g);
    // piernas largas con pantalón ancho acampanado y pies descalzos
    for (const s of [-1, 1]) {
      body.add(part(new THREE.CylinderGeometry(0.075, 0.105, 0.62, 18), pants, s * 0.085, 0.36, 0));
      body.add(ball(skin, 0.055, s * 0.085, 0.035, 0.05, 0.9, 0.55, 1.5));
    }
    body.add(ball(pants, 0.17, 0, 0.66, 0, 1.05, 0.45, 0.8));
    // torso con la camiseta, hombros y brazos finos colgando
    const torso = part(new THREE.CylinderGeometry(0.15, 0.17, 0.42, 32), tee, 0, 0.9, 0);
    torso.rotation.y = Math.PI; // el dibujo hacia delante
    torso.scale.z = 0.72;
    body.add(torso);
    body.add(ball(green, 0.15, 0, 1.1, 0, 1.05, 0.35, 0.72));
    const arms = [-1, 1].map((s) => {
      const arm = new THREE.Group();
      arm.position.set(s * 0.195, 1.08, 0);
      arm.rotation.z = s * 0.1;
      arm.add(ball(green, 0.075, 0, -0.04, 0, 1, 1.3, 1));
      arm.add(part(new THREE.CapsuleGeometry(0.05, 0.36, 6, 12), skin, 0, -0.26, 0));
      arm.add(ball(skin, 0.056, 0, -0.5, 0.01, 0.9, 1.2, 0.8));
      body.add(arm);
      return arm;
    });
    const head = new THREE.Group();
    head.position.y = 1.36;
    body.add(head);
    head.add(part(new THREE.CylinderGeometry(0.045, 0.05, 0.12, 12), skin, 0, -0.17, 0)); // cuello
    head.add(ball(skin, 0.155, 0, 0, 0, 0.88, 1.08, 0.95)); // cara ovalada
    // melena castaña con raya al medio, hasta los hombros
    for (const s of [-1, 1]) {
      const cap = ball(hair, 0.15, s * 0.05, 0.06, -0.02, 0.85, 0.85, 1.05);
      cap.rotation.z = s * -0.25;
      head.add(cap);
      head.add(ball(hair, 0.1, s * 0.13, -0.08, -0.03, 0.55, 1.4, 0.95));
      head.add(ball(hair, 0.1, s * 0.14, -0.22, -0.05, 0.65, 0.9, 0.85));
    }
    head.add(ball(hair, 0.16, 0, -0.08, -0.08, 1.05, 1.2, 0.75));
    stitch(head, [0, 0.175, 0.07], [0, 0.15, -0.08], '#8a6a56', 0.005);
    // ojo izquierdo: blanco, iris marrón, pupila y brillo, con su ceja
    const ex = -0.052, ey = 0.02, ez = 0.143;
    head.add(ball(shiny('#fbf8f4'), 0.022, ex, ey, ez, 1.25, 0.8, 0.4));
    head.add(ball(shiny('#5a3a24'), 0.013, ex, ey, ez + 0.006, 1, 1, 0.4));
    head.add(ball(shiny('#140d0a'), 0.006, ex, ey, ez + 0.01, 1, 1, 0.4));
    head.add(ball(shiny('#ffffff'), 0.003, ex + 0.004, ey + 0.004, ez + 0.013));
    stitch(head, [ex - 0.025, ey + 0.035, ez - 0.004], [ex + 0.022, ey + 0.04, ez], '#3b2618', 0.004);
    // nariz, boca sonriente y mejillas
    head.add(ball(skin, 0.018, 0, -0.025, 0.155, 0.9, 1, 0.8));
    const grin = part(new THREE.TorusGeometry(0.032, 0.0055, 6, 20, Math.PI * 0.75), shiny('#b9605c'), 0, -0.055, 0.142);
    grin.rotation.z = Math.PI + Math.PI * 0.125;
    head.add(grin);
    const blush = new THREE.MeshStandardMaterial({ color: '#ff9aa6', roughness: 1, transparent: true, opacity: 0.4 });
    head.add(ball(blush, 0.025, -0.085, -0.035, 0.125, 1, 0.6, 0.3));
    head.add(ball(blush, 0.025, 0.085, -0.035, 0.125, 1, 0.6, 0.3));
    // parche pirata grande sobre el ojo derecho, con su cinta en diagonal
    const patch = ball(black, 0.055, 0.055, 0.025, 0.138, 1.05, 0.92, 0.45);
    patch.rotation.z = -0.15;
    head.add(patch);
    // cinta: un aro inclinado que va del parche por encima del pelo hasta la nuca izquierda
    const strap = part(new THREE.TorusGeometry(0.178, 0.0075, 6, 64), black, 0, 0.03, -0.02);
    const toPatch = new THREE.Vector3(0.055, -0.005, 0.17), toBack = new THREE.Vector3(-0.1, 0.13, -0.05);
    strap.quaternion.setFromUnitVectors(new THREE.Vector3(0, 0, 1), toPatch.cross(toBack).normalize());
    head.add(strap);
    return { body, head, armL: arms[0], armR: arms[1] };
  },

  // Pandochka: una bola blanca con la cara bordada y un gran lazo fucsia.
  panda() {
    const g = this;
    const grey = fabric('#4b4a52');
    const face = new THREE.MeshPhysicalMaterial({
      map: getPandiFace(), bumpMap: getFur(), bumpScale: 0.6, roughness: 1, sheen: 1, sheenRoughness: 0.6,
      sheenColor: new THREE.Color('#ffffff'),
    });
    const body = rig(g);
    for (const s of [-1, 1]) body.add(ball(grey, 0.13, s * 0.17, 0.08, 0.04, 1, 1.05, 1.05));
    const head = new THREE.Group();
    head.position.y = 0.6;
    body.add(head);
    head.add(ball(face, 0.52, 0, 0, 0, 1, 0.95, 0.95));
    for (const s of [-1, 1]) head.add(ball(grey, 0.1, s * 0.37, 0.36, -0.02, 1, 1, 0.6));
    const armL = ball(grey, 0.1, -0.5, -0.12, 0.1, 0.8, 1.35, 0.85);
    const armR = ball(grey, 0.1, 0.5, -0.12, 0.1, 0.8, 1.35, 0.85);
    armL.rotation.z = 0.7; armR.rotation.z = -0.7;
    head.add(armL, armR);
    const ribbon = bow(fabric('#e2447a'), 2.4);
    ribbon.position.set(0.1, 0.5, -0.02);
    ribbon.rotation.set(-0.35, 0, -0.15);
    head.add(ribbon);
    return { body, head, armL, armR };
  },
};

// Crea un peluche. teamInk/teamSoft: colores del jugador.
export function makePlush(kind, teamInk, teamSoft) {
  const build = BUILDERS[kind] || BUILDERS.osito;
  const g = new THREE.Group();

  // peana de fieltro del color del equipo, con ribete
  const ink = felt(teamInk);
  const base = part(new THREE.CylinderGeometry(0.5, 0.54, 0.1, 36), ink, 0, 0.05, 0);
  base.receiveShadow = true;
  g.add(base);
  const rim = part(new THREE.TorusGeometry(0.5, 0.03, 8, 40), felt(teamSoft), 0, 0.1, 0);
  rim.rotation.x = Math.PI / 2;
  g.add(rim);

  const sk = build.call(g, g, teamInk);
  // los pequeñitos y los grandotes: se escala el peluche, no la peana
  const size = (PLUSHES.find((p) => p.id === kind) || {}).size || 1;
  sk.body.parent.scale.setScalar(size);

  // anillo de selección (oculto por defecto)
  const ring = new THREE.Mesh(
    new THREE.RingGeometry(0.6, 0.72, 40),
    new THREE.MeshBasicMaterial({ color: teamInk, transparent: true, opacity: 0.9, depthWrite: false }),
  );
  ring.rotation.x = -Math.PI / 2;
  ring.position.y = 0.012;
  ring.visible = false;
  g.add(ring);

  g.scale.setScalar(0.64);
  g.userData = { body: sk.body, head: sk.head, ring, armL: sk.armL, armR: sk.armR };
  return g;
}

// Miniaturas de cada peluche (data URLs) para los selectores.
// Si se pasa el renderer del juego, se pinta con él (un único contexto WebGL,
// que algunas tablets no llevan bien tener dos). Una miniatura vacía sale null.
export function plushThumbnails(size = 160, ink = '#8c8178', soft = '#d6cdc4', renderer = null) {
  const own = !renderer;
  const r = renderer || new THREE.WebGLRenderer({ antialias: true, alpha: true, preserveDrawingBuffer: true });
  if (own) {
    r.setPixelRatio(1);
    r.setSize(size, size);
    r.toneMapping = THREE.ACESFilmicToneMapping;
  }
  const scene = new THREE.Scene();
  scene.add(new THREE.HemisphereLight('#fff6e8', '#8a7060', 1.3));
  const sun = new THREE.DirectionalLight('#fff1dc', 2.2);
  sun.position.set(2, 4, 5);
  scene.add(sun);
  const cam = new THREE.PerspectiveCamera(30, 1, 0.1, 50);
  cam.position.set(0, 0.95, 3.3);
  cam.lookAt(0, 0.74, 0);

  // pintamos en la esquina inferior izquierda del lienzo y la copiamos al momento
  const gl = r.domElement;
  const pr = r.getPixelRatio();
  const px = Math.max(1, Math.min(size, Math.floor(gl.width / pr), Math.floor(gl.height / pr)));
  const src = Math.floor(px * pr);
  const prev = {
    color: r.getClearColor(new THREE.Color()), alpha: r.getClearAlpha(),
    viewport: r.getViewport(new THREE.Vector4()), scissor: r.getScissor(new THREE.Vector4()),
    scissorTest: r.getScissorTest(), target: r.getRenderTarget(),
  };
  r.setRenderTarget(null);
  r.setClearColor(0x000000, 0);
  r.setViewport(0, 0, px, px);
  r.setScissor(0, 0, px, px);
  r.setScissorTest(true);

  const out = {};
  const cv = document.createElement('canvas');
  cv.width = cv.height = size;
  const ctx = cv.getContext('2d', { willReadFrequently: true });
  for (const p of PLUSHES) {
    const m = makePlush(p.id, ink, soft);
    m.scale.setScalar(1);
    m.rotation.y = -0.35;
    scene.add(m);
    const box = new THREE.Box3().setFromObject(m);
    const h = Math.max(1.35, box.max.y);
    cam.position.set(0, h * 0.7, h * 2.45);
    cam.lookAt(0, h * 0.55, 0);
    try {
      r.render(scene, cam);
      ctx.clearRect(0, 0, size, size);
      ctx.drawImage(gl, 0, gl.height - src, src, src, 0, 0, size, size);
      const probe = ctx.getImageData(size * 0.3, size * 0.3, size * 0.4, size * 0.4).data;
      let painted = false;
      for (let i = 3; i < probe.length; i += 16) if (probe[i] > 0) { painted = true; break; }
      out[p.id] = painted ? cv.toDataURL('image/png') : null;
    } catch {
      out[p.id] = null;
    }
    scene.remove(m);
  }

  r.setClearColor(prev.color, prev.alpha);
  r.setViewport(prev.viewport);
  r.setScissor(prev.scissor);
  r.setScissorTest(prev.scissorTest);
  r.setRenderTarget(prev.target);
  if (own) {
    r.dispose();
    r.forceContextLoss();
  }
  return out;
}
