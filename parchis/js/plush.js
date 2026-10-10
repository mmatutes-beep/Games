// Los seis peluches, en versión caricatura: cabeza grande, cuerpo pequeño.
import * as THREE from 'three';

export const PLUSHES = [
  { id: 'pinguino', name: 'Pingüino' },
  { id: 'conejita', name: 'Conejita' },
  { id: 'unicornio', name: 'Unicornio' },
  { id: 'tigre', name: 'Tigre' },
  { id: 'osito', name: 'Osito' },
  { id: 'panda', name: 'Panda' },
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

// Rayas de tigre: franjas verticales onduladas que se afinan en las puntas.
let stripeTex = null;
function getStripes() {
  stripeTex ||= canvasTex(512, (ctx, S) => {
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, S, S);
    furStrokes(ctx, S, 20000, 200);
    ctx.fillStyle = '#231a14';
    const n = 14;
    for (let i = 0; i < n; i++) {
      const cx = (i + 0.5) * (S / n) + (Math.random() - 0.5) * 8;
      const y0 = S * (0.12 + Math.random() * 0.1), y1 = S * (0.72 + Math.random() * 0.15);
      const w = 6 + Math.random() * 5;
      ctx.beginPath();
      const pts = 24;
      for (let k = 0; k <= pts; k++) {
        const t = k / pts, y = y0 + (y1 - y0) * t;
        const ww = w * Math.sin(Math.PI * t);
        ctx.lineTo(cx + Math.sin(t * 7 + i) * 6 + ww, y);
      }
      for (let k = pts; k >= 0; k--) {
        const t = k / pts, y = y0 + (y1 - y0) * t;
        const ww = w * Math.sin(Math.PI * t);
        ctx.lineTo(cx + Math.sin(t * 7 + i) * 6 - ww, y);
      }
      ctx.fill();
    }
  }, 1);
  return stripeTex;
}

function fabric(color, map = getFur()) {
  return new THREE.MeshPhysicalMaterial({
    color,
    map,
    bumpMap: getFur(),
    bumpScale: 1.2,
    roughness: 1,
    sheen: 1,
    sheenRoughness: 0.55,
    sheenColor: new THREE.Color('#ffffff'),
  });
}

const shiny = (color) => new THREE.MeshStandardMaterial({ color, roughness: 0.18, metalness: 0 });
const felt = (color) => new THREE.MeshStandardMaterial({ color, roughness: 0.95 });
const satin = (color) => new THREE.MeshPhysicalMaterial({ color, roughness: 0.35, sheen: 1, sheenColor: new THREE.Color('#ffffff') });

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

// ------------------------------------------------------------------
// Piezas comunes
// ------------------------------------------------------------------

// Ojo brillante grande con dos destellos.
function eye(parent, x, y, z, r = 0.07) {
  const black = shiny('#15110e');
  const white = shiny('#ffffff');
  const e = ball(black, r, x, y, z, 1, 1.15, 0.6);
  parent.add(e);
  parent.add(ball(white, r * 0.36, x + r * 0.3, y + r * 0.4, z + r * 0.45));
  parent.add(ball(white, r * 0.16, x - r * 0.3, y - r * 0.35, z + r * 0.5));
}

// Ojo cerrado y feliz: un arco con pestañas.
function happyEye(parent, x, y, z, s) {
  const ink = shiny('#2a1d1a');
  const arc = part(new THREE.TorusGeometry(0.06, 0.012, 6, 16, Math.PI), ink, x, y, z);
  parent.add(arc);
  for (const k of [0.25, 0.5, 0.75]) {
    const a = Math.PI * k;
    const lash = part(new THREE.CylinderGeometry(0.007, 0.007, 0.05, 4), ink,
      x + Math.cos(a) * 0.075 * (s > 0 ? 1 : 1), y + Math.sin(a) * 0.075, z);
    lash.rotation.z = a - Math.PI / 2;
    parent.add(lash);
  }
}

function cheeks(parent, x, y, z) {
  const blush = new THREE.MeshStandardMaterial({ color: '#ff8fa8', roughness: 1, transparent: true, opacity: 0.6 });
  parent.add(ball(blush, 0.065, -x, y, z, 1, 0.6, 0.3));
  parent.add(ball(blush, 0.065, x, y, z, 1, 0.6, 0.3));
}

function smile(parent, y, z, r = 0.05) {
  const m = part(new THREE.TorusGeometry(r, 0.01, 6, 16, Math.PI), shiny('#2a1d1a'), 0, y, z);
  m.rotation.z = Math.PI;
  parent.add(m);
}

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

// Esqueleto común: cuerpo, patas, brazos y la cabeza (grupo vacío).
function skeleton(g, main, belly, { limbs = main, feet = main } = {}) {
  const stand = new THREE.Group(); // apoyado sobre la peana
  stand.position.y = 0.08;
  g.add(stand);
  const body = new THREE.Group();
  stand.add(body);
  body.add(ball(main, 0.36, 0, 0.42, 0, 1, 0.95, 0.88));
  if (belly) body.add(ball(belly, 0.25, 0, 0.4, 0.17, 1, 1.05, 0.6));
  body.add(ball(feet, 0.13, -0.17, 0.12, 0.14, 1, 0.75, 1.35));
  body.add(ball(feet, 0.13, 0.17, 0.12, 0.14, 1, 0.75, 1.35));
  const armL = ball(limbs, 0.11, -0.33, 0.5, 0.08, 1, 1.5, 1);
  const armR = ball(limbs, 0.11, 0.33, 0.5, 0.08, 1, 1.5, 1);
  armL.rotation.z = -0.55; armR.rotation.z = 0.55;
  body.add(armL, armR);
  const head = new THREE.Group();
  head.position.y = 1.06;
  body.add(head);
  return { body, head, armL, armR };
}

// ------------------------------------------------------------------
// Los peluches
// ------------------------------------------------------------------

const BUILDERS = {
  pinguino(g, team) {
    const navy = fabric('#2b3550'), white = fabric('#f7f4ee'), orange = felt('#f39a2b');
    const sk = skeleton(g, navy, white, { feet: orange });
    const { head, armL, armR } = sk;
    // aletas planas
    for (const a of [armL, armR]) a.scale.set(0.05, 0.2, 0.12);
    head.add(ball(navy, 0.42, 0, 0, 0, 1, 0.95, 0.95));
    // carita blanca en forma de corazón
    head.add(ball(white, 0.2, -0.1, -0.02, 0.24, 1, 1.15, 0.7));
    head.add(ball(white, 0.2, 0.1, -0.02, 0.24, 1, 1.15, 0.7));
    head.add(ball(white, 0.17, 0, -0.12, 0.25, 1.2, 0.8, 0.7));
    const beak = part(new THREE.ConeGeometry(0.06, 0.14, 16), orange, 0, -0.08, 0.43);
    beak.rotation.x = Math.PI / 2;
    beak.scale.set(1.4, 1, 0.7);
    head.add(beak);
    eye(head, -0.1, 0.04, 0.39, 0.06);
    eye(head, 0.1, 0.04, 0.39, 0.06);
    cheeks(head, 0.2, -0.08, 0.34);
    // gorrito de pompón no; pajarita del equipo
    const tie = bow(felt(team), 0.9);
    tie.position.set(0, 0.74, 0.27);
    sk.body.add(tie);
    return sk;
  },

  conejita(g, team) {
    const cream = fabric('#f4ece6'), pink = felt('#f6b9c9'), light = fabric('#fff9f6');
    const sk = skeleton(g, cream, light);
    const { head } = sk;
    head.add(ball(cream, 0.4, 0, 0, 0, 1.05, 0.95, 0.95));
    const earGeo = new THREE.CapsuleGeometry(0.085, 0.42, 6, 14);
    [-1, 1].forEach((s) => {
      const ear = part(earGeo, cream, s * 0.14, 0.5, -0.05);
      ear.rotation.z = -s * 0.2;
      ear.scale.set(1, 1, 0.55);
      if (s > 0) { ear.rotation.z = -1.0; ear.position.set(0.32, 0.36, -0.02); } // una oreja caída
      const inner = part(earGeo, pink, 0, 0, 0.08);
      inner.scale.set(0.55, 0.85, 0.3);
      ear.add(inner);
      head.add(ear);
    });
    const ribbon = bow(satin(team), 1.1);
    ribbon.position.set(-0.17, 0.33, 0.12);
    ribbon.rotation.z = 0.3;
    head.add(ribbon);
    head.add(ball(light, 0.1, -0.06, -0.1, 0.3, 1, 0.8, 0.8));
    head.add(ball(light, 0.1, 0.06, -0.1, 0.3, 1, 0.8, 0.8));
    head.add(ball(pink, 0.04, 0, -0.04, 0.38, 1.3, 0.9, 0.9));
    eye(head, -0.14, 0.05, 0.33);
    eye(head, 0.14, 0.05, 0.33);
    cheeks(head, 0.23, -0.07, 0.3);
    // colita de algodón
    sk.body.add(ball(light, 0.11, 0, 0.3, -0.32));
    return sk;
  },

  unicornio(g, team) {
    const white = fabric('#fbf8f4'), lilac = fabric('#e5d4f2'), gold = shiny('#f3c34f');
    const mane = ['#ff9ec7', '#c8a7f2', '#8fd8e8', '#ffe08a', '#a8e6b4'].map((c) => fabric(c));
    const sk = skeleton(g, white, null, { feet: lilac });
    const { head } = sk;
    head.add(ball(white, 0.4, 0, 0, 0, 1, 0.95, 0.95));
    head.add(ball(lilac, 0.18, 0, -0.14, 0.27, 1.2, 0.85, 0.85)); // hocico
    head.add(ball(shiny('#c28fb5'), 0.02, -0.06, -0.12, 0.42));
    head.add(ball(shiny('#c28fb5'), 0.02, 0.06, -0.12, 0.42));
    // cuerno en espiral
    const horn = part(new THREE.ConeGeometry(0.1, 0.42, 20), gold, 0, 0.44, 0.14);
    horn.rotation.x = 0.25;
    for (let i = 0; i < 4; i++) {
      const ring = part(new THREE.TorusGeometry(0.088 - i * 0.019, 0.014, 6, 20), gold, 0, -0.15 + i * 0.09, 0);
      ring.rotation.x = Math.PI / 2 + 0.25;
      horn.add(ring);
    }
    head.add(horn);
    const earGeo = new THREE.ConeGeometry(0.075, 0.18, 12);
    for (const s of [-1, 1]) {
      const ear = part(earGeo, white, s * 0.24, 0.33, -0.02);
      ear.rotation.z = -s * 0.4;
      ear.scale.z = 0.6;
      head.add(ear);
    }
    // crin de colores: mechones por la coronilla y la nuca
    for (let i = 0; i < 9; i++) {
      const t = i / 8;
      const a = -0.2 + t * 2.1;
      head.add(ball(mane[i % mane.length], 0.1 - t * 0.02, 0.03 * Math.sin(i * 2), 0.38 * Math.cos(a), 0.06 - 0.4 * Math.sin(a)));
    }
    head.add(ball(mane[0], 0.09, -0.12, 0.36, 0.18));
    head.add(ball(mane[2], 0.08, 0.08, 0.38, 0.2));
    // cola
    for (let i = 0; i < 4; i++) sk.body.add(ball(mane[i], 0.09, (i - 1.5) * 0.04, 0.35 - i * 0.07, -0.34 - i * 0.04));
    happyEye(head, -0.15, 0.06, 0.36, -1);
    happyEye(head, 0.15, 0.06, 0.36, 1);
    cheeks(head, 0.24, -0.06, 0.31);
    const collar = part(new THREE.TorusGeometry(0.24, 0.045, 10, 28), felt(team), 0, 0.74, 0);
    collar.rotation.x = Math.PI / 2;
    sk.body.add(collar);
    return sk;
  },

  tigre(g, team) {
    const striped = fabric('#f08a2b', getStripes());
    const white = fabric('#fff3e3'), black = shiny('#231a14');
    const sk = skeleton(g, striped, white);
    const { head } = sk;
    const skull = ball(striped, 0.42, 0, 0, 0, 1.08, 0.95, 0.95);
    skull.rotation.y = Math.PI; // las rayas en la frente
    head.add(skull);
    for (const s of [-1, 1]) {
      head.add(ball(striped, 0.12, s * 0.27, 0.3, -0.02, 1, 1, 0.6));
      head.add(ball(white, 0.07, s * 0.27, 0.3, 0.04, 1, 1, 0.4));
    }
    head.add(ball(white, 0.11, -0.08, -0.12, 0.32, 1.1, 0.85, 0.8));
    head.add(ball(white, 0.11, 0.08, -0.12, 0.32, 1.1, 0.85, 0.8));
    head.add(ball(white, 0.09, 0, -0.2, 0.3, 1, 0.7, 0.8));
    const nose = ball(felt('#e5738a'), 0.05, 0, -0.06, 0.42, 1.2, 0.7, 0.7);
    head.add(nose);
    const whiskerGeo = new THREE.CylinderGeometry(0.005, 0.005, 0.22, 4);
    for (const s of [-1, 1]) for (const k of [-1, 1]) {
      const w = part(whiskerGeo, black, s * 0.27, -0.12 + k * 0.03, 0.31);
      w.rotation.z = Math.PI / 2 + k * 0.15 * s;
      head.add(w);
    }
    eye(head, -0.15, 0.05, 0.34);
    eye(head, 0.15, 0.05, 0.34);
    // cola rayada en curva
    const tail = part(new THREE.TorusGeometry(0.18, 0.05, 10, 20, Math.PI * 1.1), striped, 0.12, 0.3, -0.34);
    tail.rotation.set(0, Math.PI / 2, 0.3);
    sk.body.add(tail);
    const band = part(new THREE.TorusGeometry(0.23, 0.04, 10, 28), felt(team), 0, 0.74, 0);
    band.rotation.x = Math.PI / 2;
    sk.body.add(band);
    return sk;
  },

  osito(g, team) {
    const brown = fabric('#9b6a43'), light = fabric('#e3c39c'), knit = fabric(team), white = fabric('#fbf8f2');
    const sk = skeleton(g, brown, light);
    const { head, body } = sk;
    head.add(ball(brown, 0.41, 0, 0, 0, 1.05, 0.95, 0.95));
    for (const s of [-1, 1]) {
      head.add(ball(brown, 0.12, s * 0.3, 0.24, 0, 1, 1, 0.6));
      head.add(ball(light, 0.07, s * 0.3, 0.24, 0.05, 1, 1, 0.4));
    }
    head.add(ball(light, 0.15, 0, -0.12, 0.3, 1.25, 0.85, 0.8));
    head.add(ball(shiny('#2a1d1a'), 0.055, 0, -0.06, 0.43, 1.3, 0.9, 0.8));
    smile(head, -0.16, 0.42, 0.04);
    eye(head, -0.15, 0.05, 0.34);
    eye(head, 0.15, 0.05, 0.34);
    cheeks(head, 0.24, -0.08, 0.3);
    // gorro de lana con pompón
    const hat = part(new THREE.SphereGeometry(0.39, 28, 14, 0, Math.PI * 2, 0, Math.PI * 0.42), knit, 0, 0.12, -0.02);
    hat.scale.set(1.08, 1.05, 1.02);
    head.add(hat);
    const cuff = part(new THREE.TorusGeometry(0.33, 0.06, 10, 32), white, 0, 0.21, -0.02);
    cuff.rotation.x = Math.PI / 2 - 0.08;
    head.add(cuff);
    head.add(ball(white, 0.1, 0, 0.53, -0.04));
    // bufanda con una punta colgando
    const scarf = part(new THREE.TorusGeometry(0.24, 0.07, 12, 32), knit, 0, 0.76, 0);
    scarf.rotation.x = Math.PI / 2;
    body.add(scarf);
    const end = part(new THREE.BoxGeometry(0.12, 0.28, 0.06), knit, 0.13, 0.62, 0.25);
    end.rotation.z = 0.2;
    body.add(end);
    for (const k of [-1, 0, 1]) body.add(part(new THREE.BoxGeometry(0.02, 0.06, 0.02), white, 0.13 + k * 0.035 + 0.03, 0.47, 0.26));
    return sk;
  },

  panda(g, team) {
    const white = fabric('#f8f6f1'), black = fabric('#24221f');
    const sk = skeleton(g, white, null, { limbs: black, feet: black });
    const { head, body } = sk;
    head.add(ball(white, 0.42, 0, 0, 0, 1.08, 0.95, 0.95));
    for (const s of [-1, 1]) {
      head.add(ball(black, 0.13, s * 0.3, 0.28, -0.02, 1, 1, 0.65));
      const patch = ball(black, 0.1, s * 0.15, 0.02, 0.32, 1, 1.35, 0.5);
      patch.rotation.z = s * 0.6;
      head.add(patch);
    }
    head.add(ball(white, 0.13, 0, -0.14, 0.31, 1.25, 0.8, 0.8));
    head.add(ball(shiny('#1d1b19'), 0.045, 0, -0.08, 0.43, 1.3, 0.85, 0.8));
    smile(head, -0.17, 0.42, 0.035);
    eye(head, -0.15, 0.04, 0.37, 0.05);
    eye(head, 0.15, 0.04, 0.37, 0.05);
    cheeks(head, 0.26, -0.1, 0.3);
    const ribbon = bow(satin(team), 1.3);
    ribbon.position.set(0.2, 0.33, 0.14);
    ribbon.rotation.z = -0.35;
    head.add(ribbon);
    return sk;
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

  const sk = build(g, teamInk);

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
