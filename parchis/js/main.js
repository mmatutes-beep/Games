// Escena, turnos y animaciones del parchís de peluches.
import * as THREE from 'three';
import { OrbitControls } from '../vendor/OrbitControls.js';
import { COLORS, HOME, META, Game, cellKey } from './rules.js';
import { drawBoard, piecePosition, PAPER } from './board.js';
import { makePlush, PLUSHES, plushThumbnails } from './plush.js';
import { Dice } from './dice.js';

const $ = (id) => document.getElementById(id);
const TOP = 0.06; // grosor del papel
const DEFAULT_PLUSH = ['pinguino', 'conejita', 'panda', 'unicornio'];

// ------------------------------------------------------------------
// Escena
// ------------------------------------------------------------------

const renderer = new THREE.WebGLRenderer({ antialias: true });
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

async function animateMove(move, events) {
  const pc = move.piece;
  const color = game.players[move.pl].color;
  const mesh = pieceMesh.get(pc);
  const stepMs = move.path.length > 12 ? 120 : 170;
  if (move.from === HOME) {
    await hop(mesh, layout().get(pc), 420, 1.6);
  } else {
    for (const q of move.path.slice(0, -1)) await hop(mesh, stepPos(color, pc, q), stepMs);
    await hop(mesh, layout().get(pc), stepMs + 40, move.to === META ? 1.4 : 0.55);
  }
  if (events.capture) {
    const cm = pieceMesh.get(events.capture.pc);
    await flyHome(cm, layout().get(events.capture.pc));
  }
  await settle();
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
    const victim = game.players[events.capture.pl];
    parts.push(`¡Se come a ${playerLabel(victim)}!`);
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
    await animateMove(move, events);
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

async function celebrate(id) {
  const pl = game.players[game.winner];
  setMsg(`¡${playerLabel(pl)} gana la partida!`);
  $('win-title').textContent = `¡Gana ${pl.name}!`;
  $('win-title').style.color = COLORS[pl.color].ink;
  const plush = PLUSHES.find((p) => p.id === pl.plush).name;
  $('win-text').textContent = `Las cuatro fichas de ${plush} ya están en la meta.`;
  setTimeout(() => { if (id === runId) $('win').classList.remove('hidden'); }, 1200);
  speed = 1;
  const meshes = pl.pieces.map((pc) => pieceMesh.get(pc));
  try {
    while (id === runId) {
      for (const m of meshes) {
        const p = m.position.clone();
        hop(m, p, 420, 1.2, false).catch(() => {});
        await sleep(110);
      }
      await sleep(700);
    }
  } catch { /* nada */ }
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

function setPlush(btn, id) {
  const p = PLUSHES.find((x) => x.id === id) || PLUSHES[0];
  btn.dataset.value = p.id;
  btn.innerHTML = `<img src="${thumbs[p.id] || ''}" alt=""><span>${p.name}</span>`;
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
    card.innerHTML = `<img src="${thumbs[p.id] || ''}" alt=""><span>${p.name}</span>`;
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
  frameCamera(firstHuman ? firstHuman.color : 0);

  $('setup').classList.add('hidden');
  $('win').classList.add('hidden');
  $('hud').classList.remove('hidden');
  $('bar').classList.remove('hidden');
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
// Cámara y bucle de render
// ------------------------------------------------------------------

let viewColor = 0;
function frameCamera(color = viewColor) {
  viewColor = color;
  const aspect = window.innerWidth / window.innerHeight;
  const fitR = PAPER * 1.08;
  const vfov = THREE.MathUtils.degToRad(camera.fov);
  const hfov = 2 * Math.atan(Math.tan(vfov / 2) * aspect);
  const dist = fitR / Math.sin(Math.min(vfov, hfov) / 2) * (aspect < 1 ? 0.95 : 0.82);
  const elev = aspect < 1 ? 1.15 : 0.98;
  let x = 0, z = Math.cos(elev) * dist;
  for (let i = 0; i < color; i++) [x, z] = [z, -x];
  camera.position.set(x, Math.sin(elev) * dist, z);
  controls.target.set(0, 0, 0);
  controls.update();
}

function resize() {
  const w = window.innerWidth, h = window.innerHeight;
  renderer.setSize(w, h);
  camera.aspect = w / h;
  camera.updateProjectionMatrix();
}
window.addEventListener('resize', () => { resize(); frameCamera(); });

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
  controls.update();
  renderer.render(scene, camera);
  requestAnimationFrame(loop);
}

async function init() {
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
  thumbs = plushThumbnails(120);
  buildSetup();
  $('loading').remove();
  requestAnimationFrame(loop);
}
init();

// Para depurar desde la consola
window.parchis = { get game() { return game; }, get pieces() { return pieceMesh; }, highlighted, camera, controls };
