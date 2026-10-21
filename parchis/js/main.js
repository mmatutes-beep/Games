// Escena, turnos y animaciones del parchís de peluches.
import * as THREE from 'three';
import { OrbitControls } from '../vendor/OrbitControls.js';
import { COLORS, HOME, META, Game, cellKey } from './rules.js';
import { drawBoard, piecePosition, PAPER } from './board.js';
import { makePlush, PLUSHES, plushThumbnails } from './plush.js';
import { Dice } from './dice.js';
import { WEAPONS, makeWeapon, makeBurst, makeJets, Particles } from './fx.js';
import { Music } from './music.js';

const $ = (id) => document.getElementById(id);
const TOP = 0.06; // grosor del papel
const DEFAULT_PLUSH = ['pinguino', 'conejita', 'panda', 'unicornio'];

// ------------------------------------------------------------------
// Escena
// ------------------------------------------------------------------

const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.05;
$('stage').appendChild(renderer.domElement);
const maxAniso = renderer.capabilities.getMaxAnisotropy();

const scene = new THREE.Scene();
scene.background = new THREE.Color('#3b281c');
scene.fog = new THREE.Fog('#3b281c', 45, 90);

const camera = new THREE.PerspectiveCamera(40, 1, 0.1, 200);
const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;
controls.maxPolarAngle = 1.3;
controls.minDistance = 8;
controls.maxDistance = 60;

scene.add(new THREE.HemisphereLight('#fff6e8', '#5a4030', 1.1));
const sun = new THREE.DirectionalLight('#fff1dc', 2.2);
sun.position.set(9, 22, 12);
sun.castShadow = true;
sun.shadow.mapSize.set(2048, 2048);
Object.assign(sun.shadow.camera, { left: -16, right: 16, top: 16, bottom: -16, near: 1, far: 60 });
sun.shadow.bias = -0.0005;
sun.shadow.normalBias = 0.02;
scene.add(sun);

// Mesa de madera
function woodTexture() {
  const S = 1024;
  const cv = document.createElement('canvas');
  cv.width = cv.height = S;
  const ctx = cv.getContext('2d');
  ctx.fillStyle = '#8a5d3d';
  ctx.fillRect(0, 0, S, S);
  for (let i = 0; i < 260; i++) {
    const y0 = Math.random() * S;
    const a = Math.random() * 10, f = 0.004 + Math.random() * 0.006;
    ctx.strokeStyle = Math.random() < 0.5 ? 'rgba(70,40,22,0.25)' : 'rgba(170,120,80,0.18)';
    ctx.lineWidth = 1 + Math.random() * 3;
    ctx.beginPath();
    for (let x = 0; x <= S; x += 16) {
      const y = y0 + Math.sin(x * f + a) * 6;
      x ? ctx.lineTo(x, y) : ctx.moveTo(x, y);
    }
    ctx.stroke();
  }
  const t = new THREE.CanvasTexture(cv);
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.repeat.set(3, 3);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = maxAniso;
  return t;
}
const table = new THREE.Mesh(
  new THREE.PlaneGeometry(120, 120),
  new THREE.MeshStandardMaterial({ map: woodTexture(), roughness: 0.75 }),
);
table.rotation.x = -Math.PI / 2;
table.receiveShadow = true;
scene.add(table);

// Hoja con el tablero
const boardGroup = new THREE.Group();
boardGroup.rotation.y = 0.035;
scene.add(boardGroup);

const boardCanvas = document.createElement('canvas');
boardCanvas.width = boardCanvas.height = Math.min(renderer.capabilities.maxTextureSize, 3072);
const boardTex = new THREE.CanvasTexture(boardCanvas);
boardTex.colorSpace = THREE.SRGBColorSpace;
boardTex.anisotropy = maxAniso;
const edgeMat = new THREE.MeshStandardMaterial({ color: '#efe8d6', roughness: 1 });
const paper = new THREE.Mesh(
  new THREE.BoxGeometry(PAPER * 2, TOP, PAPER * 2),
  [edgeMat, edgeMat, new THREE.MeshStandardMaterial({ map: boardTex, roughness: 0.95 }), edgeMat, edgeMat, edgeMat],
);
paper.position.y = TOP / 2;
paper.receiveShadow = true;
boardGroup.add(paper);

// Un boli BIC apoyado en la mesa, por si acaso
function makePen() {
  const g = new THREE.Group();
  const body = new THREE.Mesh(
    new THREE.CylinderGeometry(0.22, 0.22, 7, 6),
    new THREE.MeshPhysicalMaterial({ color: '#dfe7ef', roughness: 0.15, transmission: 0.6, thickness: 0.4 }),
  );
  body.rotation.z = Math.PI / 2;
  const refill = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, 6.6, 8), new THREE.MeshStandardMaterial({ color: '#1d2f78' }));
  refill.rotation.z = Math.PI / 2;
  const cap = new THREE.Mesh(new THREE.CylinderGeometry(0.25, 0.25, 1.4, 16), new THREE.MeshStandardMaterial({ color: '#1d3fa0', roughness: 0.4 }));
  cap.rotation.z = Math.PI / 2;
  cap.position.x = 3.6;
  const tip = new THREE.Mesh(new THREE.ConeGeometry(0.22, 0.6, 16), new THREE.MeshStandardMaterial({ color: '#cfd3d8', metalness: 0.6, roughness: 0.3 }));
  tip.rotation.z = Math.PI / 2;
  tip.position.x = -3.8;
  for (const m of [body, refill, cap, tip]) { m.castShadow = true; g.add(m); }
  g.position.set(-PAPER - 1.6, 0.25, 3);
  g.rotation.y = 1.35;
  return g;
}
scene.add(makePen());

const diceHolder = new THREE.Group();
diceHolder.position.y = TOP;
boardGroup.add(diceHolder);
const dice = new Dice(maxAniso, 1.2);
dice.place(0, 0);
diceHolder.add(dice.mesh);

const markers = new THREE.Group();
markers.position.y = TOP + 0.01;
boardGroup.add(markers);

// ------------------------------------------------------------------
// Animaciones
// ------------------------------------------------------------------

let tweens = [];
let speed = 1;
function tween(ms, fn) {
  return new Promise((res, rej) => tweens.push({ t0: performance.now(), ms: Math.max(1, ms * speed), fn, res, rej }));
}
const sleep = (ms) => tween(ms, () => {});
const smooth = (k) => k * k * (3 - 2 * k);
function lerpAngle(a, b, k) {
  let d = ((b - a + Math.PI) % (Math.PI * 2) + Math.PI * 2) % (Math.PI * 2) - Math.PI;
  return a + d * k;
}
const restYaw = (p) => Math.atan2(-p.x, -p.z);

function hop(mesh, to, ms, height = 0.55, face = true) {
  const from = mesh.position.clone();
  const dx = to.x - from.x, dz = to.z - from.z;
  const yaw0 = mesh.rotation.y;
  const yaw = face && Math.hypot(dx, dz) > 0.01 ? Math.atan2(dx, dz) : yaw0;
  const { body } = mesh.userData;
  return tween(ms, (k) => {
    mesh.position.set(from.x + dx * k, TOP + Math.sin(Math.PI * k) * height, from.z + dz * k);
    mesh.rotation.y = lerpAngle(yaw0, yaw, Math.min(1, k * 2.5));
    const s = 1 + 0.14 * Math.sin(Math.PI * k);
    body.scale.set(1 / Math.sqrt(s), s, 1 / Math.sqrt(s));
  }).then(() => body.scale.set(1, 1, 1));
}

function slide(mesh, to, ms) {
  const from = mesh.position.clone();
  const yaw0 = mesh.rotation.y, yaw = restYaw(to);
  return tween(ms, (k) => {
    const e = smooth(k);
    mesh.position.set(from.x + (to.x - from.x) * e, TOP, from.z + (to.z - from.z) * e);
    mesh.rotation.y = lerpAngle(yaw0, yaw, e);
  });
}

function flyHome(mesh, to) {
  const from = mesh.position.clone();
  const yaw0 = mesh.rotation.y;
  const turns = Math.PI * 4 + lerpAngle(0, restYaw(to) - yaw0, 1);
  return tween(800, (k) => {
    const e = smooth(k);
    mesh.position.set(from.x + (to.x - from.x) * e, TOP + Math.sin(Math.PI * k) * 4, from.z + (to.z - from.z) * e);
    mesh.rotation.y = yaw0 + turns * e;
    mesh.rotation.z = Math.sin(Math.PI * k) * 0.8;
  }).then(() => { mesh.rotation.z = 0; });
}

// ------------------------------------------------------------------
// Estado de la partida
// ------------------------------------------------------------------

let game = null;
let pieceMesh = new Map(); // pieza -> grupo three.js
let runId = 0;
let waiters = [];
const highlighted = new Set();
class Abort extends Error {}

function layout() {
  const groups = new Map();
  for (const o of game.allPieces()) {
    const key = cellKey(game.players[o.pl].color, o.pc.pos);
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push(o);
  }
  const out = new Map();
  for (const arr of groups.values()) {
    arr.sort((a, b) => a.pc.arrived - b.pc.arrived);
    arr.forEach((o, i) => {
      out.set(o.pc, piecePosition(game.players[o.pl].color, o.pc.pos, o.pc.id, i, arr.length));
    });
  }
  return out;
}

function settle(skip = null) {
  const tasks = [];
  for (const [pc, to] of layout()) {
    if (pc === skip) continue;
    const m = pieceMesh.get(pc);
    if (Math.hypot(m.position.x - to.x, m.position.z - to.z) > 0.01) tasks.push(slide(m, to, 260));
  }
  return Promise.all(tasks);
}

function stepPos(color, pc, q) {
  return piecePosition(color, q, pc.id, 0, 1);
}

async function animateMove(move, events, rocket = false) {
  const pc = move.piece;
  const color = game.players[move.pl].color;
  const mesh = pieceMesh.get(pc);
  const stepMs = move.path.length > 12 ? 120 : 170;
  const victim = events.capture ? pieceMesh.get(events.capture.pc) : null;
  let final = layout().get(pc);
  if (victim) {
    // se planta al lado de la víctima, por el lado del que llega, para darle el golpe
    const ref = rocket || move.path.length < 2 ? mesh.position.clone() : stepPos(color, pc, move.path[move.path.length - 2]);
    let dx = ref.x - victim.position.x, dz = ref.z - victim.position.z;
    const d = Math.hypot(dx, dz);
    if (d < 0.01) { dx = 1; dz = 0; } else { dx /= d; dz /= d; }
    final = { x: victim.position.x + dx * 0.9, z: victim.position.z + dz * 0.9 };
  }
  if (move.from === HOME) {
    await hop(mesh, final, 420, 1.6);
  } else if (rocket) {
    await rocketTo(mesh, final);
  } else {
    for (const q of move.path.slice(0, -1)) await hop(mesh, stepPos(color, pc, q), stepMs);
    await hop(mesh, final, stepMs + 40, move.to === META ? 1.4 : 0.55);
  }
  if (victim) events.weapon = await strike(mesh, victim, COLORS[color].ink, layout().get(events.capture.pc));
  await settle();
}

// ------------------------------------------------------------------
// Comer a golpes y volar con propulsores
// ------------------------------------------------------------------

const particles = new Particles(boardGroup);
let shake = 0;

async function strike(mesh, victim, ink, home) {
  const kind = WEAPONS[Math.floor(Math.random() * WEAPONS.length)];
  const w = makeWeapon(kind, ink);
  const stand = mesh.userData.body.parent;
  const body = mesh.userData.body;
  stand.add(w.pivot);
  // se miran y aparece el arma
  const dx = victim.position.x - mesh.position.x, dz = victim.position.z - mesh.position.z;
  const a0 = mesh.rotation.y, v0 = victim.rotation.y;
  const ya = Math.atan2(dx, dz), yv = Math.atan2(-dx, -dz);
  await tween(240, (k) => {
    const e = smooth(k);
    mesh.rotation.y = lerpAngle(a0, ya, e);
    victim.rotation.y = lerpAngle(v0, yv, e);
    w.pivot.scale.setScalar(Math.max(0.01, e));
  });
  // coge impulso
  const wind = w.from + Math.sign(w.from - w.to) * 0.35;
  const lean = kind === 'patada' ? -0.25 : kind === 'maza' ? -0.15 : 0;
  await tween(380, (k) => {
    const e = smooth(k);
    w.pivot.rotation[w.axis] = w.from + (wind - w.from) * e;
    body.rotation.x = lean * e;
    if (kind === 'bate') body.rotation.y = 0.35 * e;
  });
  await sleep(110);
  // ¡golpe!
  let hitDone = false, flight = null;
  await tween(210, (k) => {
    const e = k * k;
    w.pivot.rotation[w.axis] = wind + (w.to - wind) * e;
    body.rotation.x = lean * (1 - e) + (kind === 'maza' ? 0.2 : 0) * e;
    if (kind === 'bate') body.rotation.y = 0.35 - 0.7 * e;
    if (!hitDone && k >= w.hit) {
      hitDone = true;
      flight = impact(mesh, victim, kind, home);
      flight.catch(() => {});
    }
  });
  await sleep(160);
  await tween(180, (k) => {
    w.pivot.scale.setScalar(Math.max(0.01, 1 - k));
    body.rotation.x *= 1 - k;
    body.rotation.y *= 1 - k;
  });
  stand.remove(w.pivot);
  body.rotation.set(0, 0, 0);
  await flight;
  return kind;
}

async function impact(mesh, victim, kind, home) {
  const mid = new THREE.Vector3((mesh.position.x + victim.position.x) / 2, TOP + 0.75, (mesh.position.z + victim.position.z) / 2);
  const pow = makeBurst(kind);
  pow.position.copy(mid);
  boardGroup.add(pow);
  shake = kind === 'maza' ? 0.25 : 0.15;
  particles.burst(mid, 14, { star: true, size: 0.22, grow: 0.4, life: 650, speed: 2.2, gravity: 3 });
  tween(650, (k) => {
    pow.scale.setScalar(0.4 + 1.5 * Math.min(1, k * 4));
    pow.material.opacity = k < 0.6 ? 1 : 1 - (k - 0.6) / 0.4;
  }).then(() => { boardGroup.remove(pow); pow.material.map.dispose(); pow.material.dispose(); }, () => boardGroup.remove(pow));
  // la víctima se aplasta un instante y sale despedida
  const vb = victim.userData.body;
  await tween(kind === 'maza' ? 200 : 110, (k) => {
    const s = 1 - (kind === 'maza' ? 0.55 : 0.3) * Math.sin(Math.PI * k);
    vb.scale.set(1 / Math.sqrt(s), s, 1 / Math.sqrt(s));
  });
  vb.scale.set(1, 1, 1);
  await launchHome(victim, home, kind === 'golf' ? 7 : 5);
}

function launchHome(mesh, to, height) {
  const from = mesh.position.clone();
  const yaw0 = mesh.rotation.y;
  const spinX = Math.PI * 2 * (2 + Math.floor(Math.random() * 2));
  const spinZ = (Math.random() < 0.5 ? -1 : 1) * Math.PI * 2;
  particles.trails.add(mesh);
  return tween(1250, (k) => {
    const e = 1 - Math.pow(1 - k, 1.6);
    mesh.position.set(from.x + (to.x - from.x) * e, TOP + Math.sin(Math.PI * k) * height, from.z + (to.z - from.z) * e);
    mesh.rotation.set(spinX * e, lerpAngle(yaw0, restYaw(to), e), spinZ * e);
  }).then(() => {
    particles.trails.delete(mesh);
    mesh.rotation.set(0, restYaw(to), 0);
    particles.burst(new THREE.Vector3(to.x, TOP + 0.05, to.z), 8, { size: 0.2, grow: 2.5, life: 600, speed: 0.6, lift: 0.3, color: '#cfc6b8', opacity: 0.6 });
    return hop(mesh, to, 220, 0.25, false);
  }, (err) => { particles.trails.delete(mesh); throw err; });
}

const HOVER = 0.3; // altura a la que flota al encender los propulsores

async function rocketTo(mesh, to) {
  const jets = makeJets();
  mesh.add(jets);
  particles.jets.add(jets);
  const body = mesh.userData.body;
  const from = mesh.position.clone();
  const dx = to.x - from.x, dz = to.z - from.z;
  const dist = Math.hypot(dx, dz);
  const yaw0 = mesh.rotation.y, yaw = dist > 0.01 ? Math.atan2(dx, dz) : yaw0;
  const height = 1.6 + Math.min(1.6, dist * 0.12);
  try {
    // encendido: tiembla y se gira hacia donde va
    await tween(500, (k) => {
      jets.userData.power = 0.25 + 0.4 * k;
      mesh.position.set(from.x + (Math.random() - 0.5) * 0.03 * k, TOP + HOVER * smooth(k), from.z + (Math.random() - 0.5) * 0.03 * k);
      mesh.rotation.y = lerpAngle(yaw0, yaw, smooth(k));
      const s = 1 - 0.12 * k;
      body.scale.set(1 / Math.sqrt(s), s, 1 / Math.sqrt(s));
    });
    body.scale.set(1, 1, 1);
    // despegue, vuelo y aterrizaje
    await tween(800 + dist * 110, (k) => {
      const up = smooth(Math.min(1, k / 0.22)) * smooth(Math.min(1, (1 - k) / 0.2));
      const e = smooth(Math.min(1, Math.max(0, (k - 0.12) / 0.74)));
      mesh.position.set(from.x + dx * e, TOP + HOVER + (height - HOVER) * up + Math.sin(k * 30) * 0.03 * up, from.z + dz * e);
      body.rotation.x = 0.5 * Math.sin(Math.PI * e);
      jets.userData.power = 0.55 + 0.45 * up;
    });
    particles.burst(new THREE.Vector3(to.x, TOP + 0.05, to.z), 10, { size: 0.22, grow: 2.5, life: 650, speed: 0.8, lift: 0.3, color: '#cfc6b8', opacity: 0.6 });
    await tween(300, (k) => {
      jets.userData.power = 0.55 * (1 - k);
      mesh.position.y = TOP + HOVER * (1 - smooth(k));
      const s = 1 - 0.18 * Math.sin(Math.PI * k);
      body.scale.set(1 / Math.sqrt(s), s, 1 / Math.sqrt(s));
      body.rotation.x = 0;
    });
  } finally {
    particles.jets.delete(jets);
    mesh.remove(jets);
    body.scale.set(1, 1, 1);
    body.rotation.x = 0;
  }
}

// ------------------------------------------------------------------
// Interfaz
// ------------------------------------------------------------------

function setMsg(html) { $('msg').innerHTML = html; }

function playerLabel(pl) {
  const c = COLORS[pl.color];
  return `<b style="color:${c.ink}">${escapeHtml(pl.name)}</b>`;
}

function escapeHtml(s) {
  return s.replace(/[&<>"']/g, (ch) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[ch]));
}

function renderHud() {
  const ol = $('players');
  ol.innerHTML = '';
  game.players.forEach((pl, i) => {
    const li = document.createElement('li');
    if (i === game.turn && game.winner === null) li.className = 'turn';
    const atMeta = pl.pieces.filter((p) => p.pos === META).length;
    const plush = PLUSHES.find((p) => p.id === pl.plush).name;
    li.innerHTML = `<span class="dot" style="background:${COLORS[pl.color].soft}"></span>
      <span class="name" title="${escapeHtml(pl.name)} · ${plush}">${escapeHtml(pl.name)}</span>
      <span class="meta">${atMeta}/4</span>`;
    ol.appendChild(li);
  });
}

function waitFor(setup) {
  const id = runId;
  return new Promise((resolve) => {
    const cancel = () => { cleanup(); resolve(undefined); };
    const done = (v) => { cleanup(); waiters = waiters.filter((w) => w !== cancel); resolve(v); };
    const cleanup = setup(done) || (() => {});
    waiters.push(cancel);
  }).then((v) => { guard(id); return v; });
}

function guard(id) {
  if (id !== runId) throw new Abort();
}

// Espera a que el humano tire (botón, clic en el dado o espacio).
function waitRoll() {
  return waitFor((done) => {
    const btn = $('roll');
    btn.disabled = false;
    btn.focus({ preventScroll: true });
    const onKey = (e) => { if (e.code === 'Space' || e.code === 'Enter') { e.preventDefault(); done(); } };
    const onBtn = () => done();
    btn.addEventListener('click', onBtn);
    window.addEventListener('keydown', onKey);
    clickHandlers.dice = done;
    return () => {
      btn.disabled = true;
      btn.removeEventListener('click', onBtn);
      window.removeEventListener('keydown', onKey);
      clickHandlers.dice = null;
    };
  });
}

// Marca las fichas que pueden moverse y espera a que se elija una.
function pickMove(moves) {
  const color = game.players[moves[0].pl].color;
  return waitFor((done) => {
    for (const m of moves) {
      const mesh = pieceMesh.get(m.piece);
      highlighted.add(mesh);
      mesh.userData.ring.visible = true;
      mesh.userData.move = m;
      const dest = piecePosition(color, m.to, m.piece.id, 0, 1);
      const mk = new THREE.Mesh(
        new THREE.RingGeometry(0.16, 0.26, 24),
        new THREE.MeshBasicMaterial({ color: COLORS[color].ink, transparent: true, opacity: 0.75, depthWrite: false }),
      );
      mk.rotation.x = -Math.PI / 2;
      mk.position.set(dest.x, 0, dest.z);
      mk.userData.move = m;
      markers.add(mk);
    }
    clickHandlers.piece = done;
    return () => {
      for (const mesh of highlighted) {
        mesh.userData.ring.visible = false;
        mesh.userData.body.position.y = 0;
        delete mesh.userData.move;
      }
      highlighted.clear();
      for (const mk of [...markers.children]) { mk.geometry.dispose(); mk.material.dispose(); markers.remove(mk); }
      clickHandlers.piece = null;
    };
  });
}

// Todos los movimientos llevan al mismo sitio desde la misma casilla.
function onlyOneChoice(moves) {
  const color = game.players[moves[0].pl].color;
  return new Set(moves.map((m) => cellKey(color, m.from) + '>' + m.to)).size === 1;
}

async function chooseMove(moves) {
  const pl = game.current;
  if (pl.cpu) {
    await sleep(350);
    return game.bestMove(moves);
  }
  if (onlyOneChoice(moves)) {
    await sleep(250);
    return moves[0];
  }
  return pickMove(moves);
}

// ------------------------------------------------------------------
// Ratón / táctil
// ------------------------------------------------------------------

const clickHandlers = { dice: null, piece: null };
const raycaster = new THREE.Raycaster();
const pointer = new THREE.Vector2();
let downAt = null;

function hit(e) {
  const r = renderer.domElement.getBoundingClientRect();
  pointer.set(((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1);
  raycaster.setFromCamera(pointer, camera);
  const targets = [dice.mesh, ...highlighted, ...markers.children];
  for (const h of raycaster.intersectObjects(targets, true)) {
    let o = h.object;
    while (o && !o.userData.move && o !== dice.mesh) o = o.parent;
    if (o === dice.mesh) return { dice: true };
    if (o && o.userData.move) return { move: o.userData.move };
  }
  return null;
}

renderer.domElement.addEventListener('pointerdown', (e) => { downAt = [e.clientX, e.clientY]; });
renderer.domElement.addEventListener('pointerup', (e) => {
  if (!downAt || Math.hypot(e.clientX - downAt[0], e.clientY - downAt[1]) > 8) return;
  const h = hit(e);
  if (!h) return;
  if (h.dice && clickHandlers.dice) clickHandlers.dice();
  if (h.move && clickHandlers.piece) clickHandlers.piece(h.move);
});
renderer.domElement.addEventListener('pointermove', (e) => {
  const h = hit(e);
  const can = h && ((h.dice && clickHandlers.dice) || (h.move && clickHandlers.piece));
  renderer.domElement.style.cursor = can ? 'pointer' : '';
});

// ------------------------------------------------------------------
// Bucle de turnos
// ------------------------------------------------------------------

function sayMove(pl, move, events) {
  const parts = [];
  if (move.from === HOME) parts.push(`${playerLabel(pl)} saca un peluche de casa.`);
  else if (events.meta) parts.push(`¡${playerLabel(pl)} mete un peluche en la meta!`);
  if (events.capture) {
    const v = playerLabel(game.players[events.capture.pl]);
    const how = {
      bate: `¡Batazo! ${v} vuelve a casa volando.`,
      golf: `¡Golpe de golf! ${v} sale disparado a casa.`,
      maza: `¡Mazazo! ${v} vuelve a casa de un porrazo.`,
      patada: `¡Patada! ${v} vuelve a casa por los aires.`,
    }[events.weapon];
    parts.push(how || `¡Se come a ${v}!`);
  }
  if (parts.length) setMsg(parts.join(' '));
  return parts.join(' ');
}

async function playTurn(id) {
  const pl = game.current;
  speed = pl.cpu && $('fast').checked ? 0.35 : 1;
  renderHud();
  const again = game.sixes > 0;
  if (pl.cpu) {
    setMsg(`${again ? 'Repite' : 'Turno de'} ${playerLabel(pl)}…`);
    await sleep(again ? 350 : 600);
  } else {
    setMsg(`${again ? '¡Repites' : '¡Te toca'}, ${playerLabel(pl)}! Tira el dado.`);
    await waitRoll();
  }
  guard(id);

  const n = 1 + Math.floor(Math.random() * 6);
  await dice.roll(n, 1100 * speed);
  guard(id);
  const r = game.roll(n);
  let said = '';

  if (r.penalty) {
    setMsg(`¡Tres seises! El último peluche que movió ${playerLabel(pl)} vuelve a casa.`);
    await flyHome(pieceMesh.get(r.penalty), layout().get(r.penalty));
    await settle();
    await sleep(700);
  } else if (n === 6 && r.moves.length === 0 && game.sixes === 3) {
    setMsg(`¡Tres seises! ${playerLabel(pl)} pierde el turno.`);
    await sleep(900);
  } else if (!r.moves.length) {
    setMsg(`Sale un <b>${n}</b>. ${playerLabel(pl)} no puede mover.`);
    await sleep(900);
  } else {
    const extra = r.value !== n ? ` (cuenta ${r.value})` : '';
    setMsg(`Sale un <b>${n}</b>${extra}. ${pl.cpu ? `${playerLabel(pl)} piensa…` : 'Elige un peluche.'}`);
    const move = await chooseMove(r.moves);
    guard(id);
    const events = game.apply(move);
    await animateMove(move, events);
    guard(id);
    said = sayMove(pl, move, events);
  }

  let nx = game.next();
  while (nx.type === 'bonus') {
    renderHud();
    const why = nx.value === 20 ? 'por comer' : 'por llegar a la meta';
    setMsg(`${said} ${playerLabel(pl)} cuenta <b>${nx.value}</b> ${why}. ${pl.cpu ? '' : 'Elige un peluche.'}`);
    await sleep(500);
    const move = await chooseMove(nx.moves);
    guard(id);
    const events = game.apply(move);
    setMsg(`${playerLabel(pl)} enciende los propulsores… ¡despega!`);
    await animateMove(move, events, true);
    guard(id);
    said = sayMove(pl, move, events);
    nx = game.next();
  }
  renderHud();
  if (nx.type === 'over') return true;
  await sleep(250);
  return false;
}

async function run(id) {
  try {
    while (!(await playTurn(id))) guard(id);
    celebrate(id);
  } catch (e) {
    if (!(e instanceof Abort)) throw e;
  }
}

// ------------------------------------------------------------------
// Fiesta final: coro de los ganadores, zoom, fuegos artificiales y música
// ------------------------------------------------------------------

const music = new Music();
let party = null;
const SPACING = 1.15, DANCER_SCALE = 1.7;

async function celebrate(id) {
  const pl = game.players[game.winner];
  setMsg(`¡${playerLabel(pl)} gana la partida!`);
  $('win-title').textContent = `¡Gana ${pl.name}!`;
  $('win-title').style.color = COLORS[pl.color].ink;
  const plush = PLUSHES.find((p) => p.id === pl.plush).name;
  $('win-text').textContent = `Las cuatro fichas de ${plush} bailan en la meta.`;
  speed = 1;
  music.next(); // cada fiesta, la siguiente pieza
  const dancers = pl.pieces.map((pc) => pieceMesh.get(pc));
  // despejar el centro: fuera el dado y las fichas de los demás que estén cerca
  dice.mesh.visible = false;
  for (const m of pieceMesh.values()) {
    if (!dancers.includes(m) && Math.hypot(m.position.x, m.position.z) < 3.2) m.visible = false;
  }
  document.body.classList.add('celebrating');
  layoutStage();

  // dirección hacia la cámara, en coordenadas del tablero
  const camLocal = boardGroup.worldToLocal(camera.position.clone());
  const toCam = new THREE.Vector2(camLocal.x, camLocal.z).normalize();
  const right = new THREE.Vector2(toCam.y, -toCam.x);
  const faceYaw = Math.atan2(toCam.x, toCam.y);

  try {
    // en fila en el centro mirando a la cámara; en pantallas verticales, dos filas de dos
    const tall = camera.aspect < 0.85;
    const slots = tall
      ? [[-0.62, 0.6], [0.62, 0.6], [-0.62, -0.75], [0.62, -0.75]]
      : [0, 1, 2, 3].map((i) => [(i - 1.5) * SPACING, 0]);
    await Promise.all(dancers.map((m, i) => {
      const [off, fwd] = slots[i];
      const to = { x: right.x * off + toCam.x * fwd, z: right.y * off + toCam.y * fwd };
      return hop(m, to, 650, 1.4).then(() => { m.rotation.y = faceYaw; });
    }));
    guard(id);
    // zoom
    const target = new THREE.Vector3(0, 0.62, 0);
    boardGroup.localToWorld(target);
    const camDir = new THREE.Vector3(camLocal.x, 0, camLocal.z).normalize().applyQuaternion(boardGroup.quaternion);
    const vfov = THREE.MathUtils.degToRad(camera.fov);
    const hfov = 2 * Math.atan(Math.tan(vfov / 2) * camera.aspect);
    const width = tall ? 2.9 : SPACING * 3 + 1.5, height = tall ? 1.9 : 1.5;
    const dist = Math.max(width / 2 / Math.tan(hfov / 2), height / Math.tan(vfov / 2)) * 0.95;
    const up = tall ? 0.62 : 0.27; // en vertical, más alta para ver también la fila de atrás
    const endPos = target.clone().addScaledVector(camDir, dist * (tall ? 0.85 : 0.96)).add(new THREE.Vector3(0, dist * up, 0));
    const startPos = camera.position.clone(), startTgt = controls.target.clone();
    controls.enabled = false;
    await tween(1600, (k) => {
      const e = smooth(k);
      camera.position.lerpVectors(startPos, endPos, e);
      controls.target.lerpVectors(startTgt, target, e);
      for (const m of dancers) m.scale.setScalar(0.64 * (1 + (DANCER_SCALE - 1) * e));
    });
    guard(id);
    controls.enabled = true;
    music.start();
    party = { id, dancers, t0: performance.now(), nextFw: 0, faceYaw, toCam, right, tall };
    setTimeout(() => { if (id === runId) $('win').classList.remove('hidden'); }, 3500);
  } catch { /* partida nueva */ }
}

function endParty() {
  if (!party) return;
  for (const m of party.dancers) {
    m.userData.body.position.set(0, 0, 0);
    m.userData.body.rotation.set(0, 0, 0);
    m.position.y = TOP;
  }
  party = null;
  music.stop();
  controls.enabled = true;
}

// coreografía de 8 tiempos al compás de la música
function danceStep(now) {
  if (!party) return;
  if (party.id !== runId) { endParty(); return; }
  const beatLen = 60000 / music.bpm;
  const beats = (now - party.t0) / beatLen;
  const bar = Math.floor(beats / 4) % 4;
  party.dancers.forEach((m, i) => {
    const { body, armL, armR } = m.userData;
    const b = beats % 4, ph = beats * Math.PI;
    body.position.set(0, 0, 0);
    body.rotation.set(0, 0, 0);
    m.rotation.y = party.faceYaw;
    let jump = 0; // los saltos levantan la ficha entera, con su peana
    if (bar === 0) {
      // balanceo de coro: todos a la vez, de lado a lado
      body.rotation.z = Math.sin(ph) * 0.22;
      body.position.x = Math.sin(ph) * 0.12;
      body.position.y = Math.abs(Math.sin(ph)) * 0.12;
    } else if (bar === 1) {
      // patadas de cabaret alternando, con saltito
      const side = Math.floor(beats * 2) % 2 ? 1 : -1;
      body.rotation.x = -0.25 * Math.abs(Math.sin(ph * 2));
      body.rotation.z = side * 0.12;
      jump = Math.abs(Math.sin(ph * 2)) * 0.22;
    } else if (bar === 2) {
      // la ola: saltan uno detrás de otro con media vuelta
      const k = (b - i * 0.5);
      if (k > 0 && k < 1.2) {
        const e = k / 1.2;
        jump = Math.sin(Math.PI * e) * 0.9;
        m.rotation.y = party.faceYaw + Math.PI * 2 * e;
      }
    } else {
      // brazos arriba y giro todos juntos
      const e = (b % 2) / 2;
      m.rotation.y = party.faceYaw + Math.PI * 2 * smooth(e);
      jump = Math.sin(Math.PI * e) * 0.45;
    }
    m.position.y = TOP + jump;
    // brazos: arriba y abajo alternando, como un coro
    const wave = Math.sin(ph + (bar === 2 ? i : 0)) * 0.7;
    if (armL) armL.rotation.x = -wave - (bar === 3 ? 1.2 : 0);
    if (armR) armR.rotation.x = wave - (bar === 3 ? 1.2 : 0);
  });
  // fuegos artificiales
  if (now > party.nextFw) {
    party.nextFw = now + 350 + Math.random() * 550;
    firework(party.toCam, party.right, party.tall);
  }
}

const FW_COLORS = ['#ff4d6d', '#ffd23f', '#3ec1ff', '#7bff6b', '#c77dff', '#ff9f1c', '#ffffff'];
// estallan detrás de los bailarines (vistos desde la cámara) para que salgan en el plano
function firework(toCam, right, tall) {
  const back = tall ? 1.6 + Math.random() * 1.6 : 2.5 + Math.random() * 3.5;
  const side = (Math.random() - 0.5) * (tall ? 3 : 7);
  const y = tall ? 1.6 + Math.random() * 1.2 : 2.0 + Math.random() * 1.8;
  const at = new THREE.Vector3(-toCam.x * back + right.x * side, y, -toCam.y * back + right.y * side);
  const color = FW_COLORS[Math.floor(Math.random() * FW_COLORS.length)];
  const color2 = FW_COLORS[Math.floor(Math.random() * FW_COLORS.length)];
  // estela de subida
  for (let i = 0; i < 6; i++) {
    particles.spawn({ pos: new THREE.Vector3(at.x, at.y - 2.2 + i * 0.35, at.z), vel: new THREE.Vector3(0, 1.5, 0), life: 300 + i * 40, size: 0.12, grow: 0.3, color: '#ffe9b0', additive: true });
  }
  // la explosión en esfera
  const n = 46;
  for (let i = 0; i < n; i++) {
    const u = Math.random() * 2 - 1, th = Math.random() * Math.PI * 2, sq = Math.sqrt(1 - u * u);
    const sp = 2.6 + Math.random() * 0.8;
    particles.spawn({
      pos: at, vel: new THREE.Vector3(sq * Math.cos(th) * sp, u * sp, sq * Math.sin(th) * sp),
      life: 1100 + Math.random() * 500, size: 0.2, grow: 0.5, color: i % 3 ? color : color2, additive: true, gravity: 2.2,
    });
  }
  particles.spawn({ pos: at, vel: new THREE.Vector3(), life: 280, size: 1.6, grow: 2, color: '#fff6d8', additive: true });
}

// ------------------------------------------------------------------
// Configuración
// ------------------------------------------------------------------

function loadSeats() {
  try {
    const s = JSON.parse(localStorage.getItem('parchis-peluches-seats'));
    if (Array.isArray(s) && s.length === 4) {
      // peluches guardados de versiones anteriores
      s.forEach((seat, i) => { if (!PLUSHES.some((p) => p.id === seat.plush)) seat.plush = DEFAULT_PLUSH[i]; });
      return s;
    }
  } catch { /* sin almacenamiento */ }
  return COLORS.map((c, i) => ({ who: i === 0 ? 'human' : 'cpu', name: i === 0 ? 'Tú' : c.name, plush: DEFAULT_PLUSH[i] }));
}

function saveSeats(seats) {
  try { localStorage.setItem('parchis-peluches-seats', JSON.stringify(seats)); } catch { /* da igual */ }
}

function buildSetup() {
  const seats = loadSeats();
  const box = $('seats');
  box.innerHTML = '';
  COLORS.forEach((c, i) => {
    const s = seats[i];
    const row = document.createElement('div');
    row.className = 'seat';
    row.innerHTML = `
      <span class="color"><span class="dot" style="background:${c.soft}"></span>${c.name}</span>
      <select class="who" aria-label="Jugador ${c.name}">
        <option value="human">Persona</option>
        <option value="cpu">Ordenador</option>
        <option value="off">No juega</option>
      </select>
      <button type="button" class="plush" aria-label="Peluche de ${c.name}"></button>
      <input class="name" maxlength="14" aria-label="Nombre ${c.name}">`;
    row.querySelector('.who').value = s.who;
    const plushBtn = row.querySelector('.plush');
    setPlush(plushBtn, s.plush);
    plushBtn.addEventListener('click', () => openPicker(plushBtn, c.name));
    row.querySelector('.name').value = s.name;
    const sync = () => row.classList.toggle('off', row.querySelector('.who').value === 'off');
    row.querySelector('.who').addEventListener('change', sync);
    sync();
    box.appendChild(row);
  });
}

let thumbs = {};

// Miniatura del peluche, o su inicial si no se pudo pintar.
function thumbHtml(p) {
  return thumbs[p.id] ? `<img src="${thumbs[p.id]}" alt="">` : `<span class="thumb-initial" aria-hidden="true">${p.name[0]}</span>`;
}

function setPlush(btn, id) {
  const p = PLUSHES.find((x) => x.id === id) || PLUSHES[0];
  btn.dataset.value = p.id;
  btn.innerHTML = `${thumbHtml(p)}<span>${p.name}</span>`;
}

// Galería para elegir peluche, con miniaturas.
function openPicker(btn, colorName) {
  const box = $('picker');
  $('picker-title').textContent = `Peluche para ${colorName}`;
  const grid = $('picker-grid');
  grid.innerHTML = '';
  for (const p of PLUSHES) {
    const card = document.createElement('button');
    card.type = 'button';
    card.className = 'pick';
    card.setAttribute('aria-pressed', String(p.id === btn.dataset.value));
    card.innerHTML = `${thumbHtml(p)}<span>${p.name}</span>`;
    card.addEventListener('click', () => { setPlush(btn, p.id); close(); });
    grid.appendChild(card);
  }
  const onKey = (e) => { if (e.key === 'Escape') close(); };
  const onBackdrop = (e) => { if (e.target === box) close(); };
  function close() {
    box.classList.add('hidden');
    window.removeEventListener('keydown', onKey);
    box.removeEventListener('click', onBackdrop);
    btn.focus();
  }
  window.addEventListener('keydown', onKey);
  box.addEventListener('click', onBackdrop);
  box.classList.remove('hidden');
  grid.querySelector('[aria-pressed="true"]')?.focus();
}

function readSetup() {
  return [...$('seats').children].map((row, i) => ({
    who: row.querySelector('.who').value,
    plush: row.querySelector('.plush').dataset.value,
    name: row.querySelector('.name').value.trim() || COLORS[i].name,
  }));
}

function clearPieces() {
  for (const m of pieceMesh.values()) {
    boardGroup.remove(m);
    m.traverse((o) => { if (o.isMesh && o.geometry !== undefined && o.geometry.type !== 'SphereGeometry') o.geometry.dispose(); });
  }
  pieceMesh = new Map();
}

function startGame(seats) {
  runId++;
  for (const w of waiters) w();
  waiters = [];
  const old = tweens;
  tweens = [];
  for (const t of old) t.rej(new Abort());
  particles.clear();
  shake = 0;
  endParty();
  dice.mesh.visible = true;
  document.body.classList.remove('celebrating');
  highlighted.clear();
  clearPieces();

  const players = [];
  seats.forEach((s, color) => {
    if (s.who !== 'off') players.push({ color, plush: s.plush, cpu: s.who === 'cpu', name: s.name });
  });
  game = new Game(players);

  const names = {};
  for (const p of players) names[p.color] = p.name;
  drawBoard(boardCanvas, names);
  boardTex.needsUpdate = true;

  const at = layout();
  for (const { pl, pc } of game.allPieces()) {
    const c = COLORS[game.players[pl].color];
    const m = makePlush(game.players[pl].plush, c.ink, c.soft);
    const p = at.get(pc);
    m.position.set(p.x, TOP, p.z);
    m.rotation.y = restYaw(p);
    boardGroup.add(m);
    pieceMesh.set(pc, m);
  }

  const firstHuman = players.find((p) => !p.cpu);
  viewColor = firstHuman ? firstHuman.color : 0;

  $('setup').classList.add('hidden');
  $('win').classList.add('hidden');
  $('hud').classList.remove('hidden');
  $('bar').classList.remove('hidden');
  layoutStage();
  frameCamera();
  renderHud();
  run(runId);
}

$('setup-form').addEventListener('submit', (e) => {
  e.preventDefault();
  const seats = readSetup();
  if (seats.filter((s) => s.who !== 'off').length < 2) {
    $('setup-error').textContent = 'Hacen falta al menos dos jugadores.';
    return;
  }
  $('setup-error').textContent = '';
  saveSeats(seats);
  startGame(seats);
});

function openSetup() {
  runId++;
  endParty();
  document.body.classList.remove('celebrating');
  buildSetup();
  $('win').classList.add('hidden');
  $('setup').classList.remove('hidden');
}
$('restart').addEventListener('click', openSetup);
$('again').addEventListener('click', openSetup);

try { $('fast').checked = localStorage.getItem('parchis-peluches-fast') === '1'; } catch { /* nada */ }
$('fast').addEventListener('change', () => {
  try { localStorage.setItem('parchis-peluches-fast', $('fast').checked ? '1' : '0'); } catch { /* nada */ }
});

// ------------------------------------------------------------------
// Pantalla completa
// ------------------------------------------------------------------

const fsBtn = $('fullscreen');
const docEl = document.documentElement;
const canFullscreen = !!(docEl.requestFullscreen || docEl.webkitRequestFullscreen);
const fullscreenEl = () => document.fullscreenElement || document.webkitFullscreenElement;
// Abierto desde el icono de la pantalla de inicio: ya ocupa toda la pantalla.
const installed = matchMedia('(display-mode: fullscreen), (display-mode: standalone)').matches || navigator.standalone === true;
if (installed) fsBtn.classList.add('hidden');

let tipTimer = 0;
function showFullscreenTip() {
  const tip = $('fs-tip');
  tip.textContent = 'Este navegador no deja ponerlo a pantalla completa. Usa «Añadir a pantalla de inicio» en su menú y abre el juego desde el icono: así se ve sin barras.';
  tip.classList.remove('hidden');
  clearTimeout(tipTimer);
  tipTimer = setTimeout(() => tip.classList.add('hidden'), 9000);
}
$('fs-tip').addEventListener('click', () => $('fs-tip').classList.add('hidden'));

fsBtn.addEventListener('click', async () => {
  if (!canFullscreen) { showFullscreenTip(); return; }
  try {
    if (fullscreenEl()) await (document.exitFullscreen || document.webkitExitFullscreen).call(document);
    else await (docEl.requestFullscreen || docEl.webkitRequestFullscreen).call(docEl, { navigationUI: 'hide' });
  } catch {
    showFullscreenTip();
  }
  syncFullscreen();
});

function syncFullscreen() {
  const on = !!fullscreenEl();
  fsBtn.classList.toggle('active', on);
  const label = on ? 'Salir de pantalla completa' : 'Pantalla completa';
  fsBtn.setAttribute('aria-label', label);
  fsBtn.title = label;
}
document.addEventListener('fullscreenchange', syncFullscreen);
document.addEventListener('webkitfullscreenchange', syncFullscreen);
window.addEventListener('resize', syncFullscreen);

// ------------------------------------------------------------------
// Sonido
// ------------------------------------------------------------------

const soundBtn = $('sound');
function syncSound() {
  soundBtn.classList.toggle('active', music.muted);
  const label = music.muted ? 'Activar música' : 'Quitar música';
  soundBtn.setAttribute('aria-label', label);
  soundBtn.title = label;
}
soundBtn.addEventListener('click', () => {
  music.unlock();
  music.setMuted(!music.muted);
  if (!music.muted && party) music.start();
  syncSound();
});
syncSound();
// el navegador solo deja sonar audio después de un toque o una tecla
for (const ev of ['pointerdown', 'keydown']) window.addEventListener(ev, () => music.unlock(), { passive: true });

// ------------------------------------------------------------------
// Cámara y bucle de render
// ------------------------------------------------------------------

let viewColor = 0;
const stageEl = $('stage');
const stageSize = () => ({ w: Math.max(1, stageEl.clientWidth), h: Math.max(1, stageEl.clientHeight) });

function frameCamera(color = viewColor) {
  viewColor = color;
  const { w, h } = stageSize();
  const aspect = w / h;
  const fitR = PAPER * 1.04;
  const vfov = THREE.MathUtils.degToRad(camera.fov);
  const hfov = 2 * Math.atan(Math.tan(vfov / 2) * aspect);
  const dist = fitR / Math.sin(Math.min(vfov, hfov) / 2) * (aspect < 1 ? 0.9 : 0.93);
  const elev = aspect < 1 ? 1.15 : 0.98;
  let x = 0, z = Math.cos(elev) * dist;
  for (let i = 0; i < color; i++) [x, z] = [z, -x];
  camera.position.set(x, Math.sin(elev) * dist, z);
  controls.target.set(0, 0, 0);
  controls.update();
}

// Coloca el marcador y la barra según la orientación. El tablero ocupa siempre
// toda la pantalla y no se recoloca solo: los paneles flotan encima, translúcidos.
function layoutStage() {
  const W = window.innerWidth, H = window.innerHeight;
  const side = W / H > 1.15 && W >= 700;
  document.body.classList.toggle('side', side);
  document.body.classList.toggle('stack', !side);
}

function resize() {
  const { w, h } = stageSize();
  renderer.setSize(w, h);
  camera.aspect = w / h;
  camera.updateProjectionMatrix();
}
window.addEventListener('resize', () => { layoutStage(); resize(); if (!party) frameCamera(); });

function loop(now) {
  // las animaciones avanzan antes de pintar
  const done = [];
  for (const t of tweens) {
    const k = Math.min(1, (now - t.t0) / t.ms);
    t.fn(k);
    if (k >= 1) done.push(t);
  }
  if (done.length) {
    tweens = tweens.filter((t) => !done.includes(t));
    for (const t of done) t.res();
  }
  dice.update(now);
  const s = now / 1000;
  for (const m of highlighted) {
    m.userData.body.position.y = Math.abs(Math.sin(s * 5 + m.id)) * 0.25;
    m.userData.ring.material.opacity = 0.55 + Math.sin(s * 6) * 0.35;
  }
  for (const mk of markers.children) mk.scale.setScalar(1 + Math.sin(s * 6) * 0.15);
  danceStep(now);
  particles.update(now);
  controls.update();
  if (shake > 0.002) {
    const off = new THREE.Vector3((Math.random() - 0.5) * shake, (Math.random() - 0.5) * shake, (Math.random() - 0.5) * shake);
    camera.position.add(off);
    renderer.render(scene, camera);
    camera.position.sub(off);
    shake *= 0.86;
  } else {
    renderer.render(scene, camera);
  }
  requestAnimationFrame(loop);
}

async function init() {
  layoutStage();
  resize();
  frameCamera(0);
  try {
    await Promise.race([
      document.fonts.load('600 40px "Caveat"'),
      new Promise((r) => setTimeout(r, 2500)),
    ]);
  } catch { /* sin fuente, usamos la de reserva */ }
  drawBoard(boardCanvas, {});
  boardTex.needsUpdate = true;
  try {
    thumbs = plushThumbnails(120, undefined, undefined, renderer);
  } catch {
    thumbs = {};
  }
  buildSetup();
  $('loading').remove();
  requestAnimationFrame(loop);
}
init();

// Para depurar desde la consola
window.parchis = { get game() { return game; }, get pieces() { return pieceMesh; }, get party() { return party; }, music, highlighted, camera, controls, animateMove, settle };
