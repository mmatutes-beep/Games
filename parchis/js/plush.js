// Los seis peluches, en versión caricatura: cabeza grande, cuerpo pequeño.
import * as THREE from 'three';

export const PLUSHES = [
  { id: 'pinguino', name: 'Pingu' },
  { id: 'conejita', name: 'Lulu' },
  { id: 'panda', name: 'Panditchka' },
  { id: 'unicornio', name: 'Moni' },
  { id: 'tigre', name: 'Tigre' },
  { id: 'osito', name: 'Osito' },
  { id: 'winnie', name: 'Winnie' },
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
  furTex ||= canvasTex(256, (ctx, S) => {
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
  crochetTex ||= canvasTex(256, (ctx, S) => {
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
  glitterTex ||= canvasTex(128, (ctx, S) => {
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

// Cara bordada de Panditchka, pintada sobre una textura equirectangular.
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

  // Tigre: de ganchillo melocotón, hocico crema, nariz grande marrón y rayas bordadas.
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

  // Osito: chocolate con gorro lila, bufanda verde anudada y ojos bordados.
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

  // Winnie: asomando de su tarro de miel «HUNNY».
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

  // Panditchka: una bola blanca con la cara bordada y un gran lazo fucsia.
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
export function plushThumbnails(size = 160, ink = '#8c8178', soft = '#d6cdc4') {
  const r = new THREE.WebGLRenderer({ antialias: true, alpha: true, preserveDrawingBuffer: true });
  r.setPixelRatio(1);
  r.setSize(size, size);
  r.toneMapping = THREE.ACESFilmicToneMapping;
  const scene = new THREE.Scene();
  scene.add(new THREE.HemisphereLight('#fff6e8', '#8a7060', 1.3));
  const sun = new THREE.DirectionalLight('#fff1dc', 2.2);
  sun.position.set(2, 4, 5);
  scene.add(sun);
  const cam = new THREE.PerspectiveCamera(30, 1, 0.1, 50);
  cam.position.set(0, 0.95, 3.3);
  cam.lookAt(0, 0.74, 0);
  const out = {};
  for (const p of PLUSHES) {
    const m = makePlush(p.id, ink, soft);
    m.scale.setScalar(1);
    m.rotation.y = -0.35;
    scene.add(m);
    r.render(scene, cam);
    out[p.id] = r.domElement.toDataURL('image/png');
    scene.remove(m);
  }
  r.dispose();
  r.forceContextLoss();
  return out;
}
