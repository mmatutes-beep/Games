// Efectos: armas para comer, «¡POW!», propulsores de fuego y partículas.
import * as THREE from 'three';

const wood = () => new THREE.MeshStandardMaterial({ color: '#b07a45', roughness: 0.7 });
const metal = () => new THREE.MeshStandardMaterial({ color: '#c9ced6', metalness: 0.8, roughness: 0.3 });

function mesh(geo, mat, x = 0, y = 0, z = 0) {
  const m = new THREE.Mesh(geo, mat);
  m.position.set(x, y, z);
  m.castShadow = true;
  return m;
}

// ------------------------------------------------------------------
// Armas. Cada una se cuelga de un pivote en el peluche (unidades del
// peluche: mide ~1.2 de alto, mira hacia +z, su derecha es +x) y se
// anima girando el pivote sobre un eje desde «from» (preparación)
// hasta «to» (final del golpe). «hit» es el momento del impacto (0..1).
// ------------------------------------------------------------------

export const WEAPONS = ['bate', 'golf', 'maza', 'patada'];

export function makeWeapon(kind, shoeColor = '#c8322b') {
  const pivot = new THREE.Group();
  const holder = new THREE.Group();
  pivot.add(holder);
  let spec;
  if (kind === 'bate') {
    // bate de béisbol tumbado hacia la derecha; barre en horizontal
    const bat = mesh(new THREE.CylinderGeometry(0.065, 0.024, 0.95, 20), wood(), 0.5, 0, 0);
    bat.rotation.z = Math.PI / 2;
    holder.add(bat);
    holder.add(mesh(new THREE.SphereGeometry(0.035, 12, 8), wood(), 0.02, 0, 0));
    spec = { at: [0.28, 0.58, 0.05], axis: 'y', from: 1.5, to: -2.1, hit: 0.55, label: 'bate' };
  } else if (kind === 'golf') {
    // palo de golf colgando; swing de abajo hacia delante
    holder.add(mesh(new THREE.CylinderGeometry(0.014, 0.014, 0.95, 8), metal(), 0, -0.47, 0));
    holder.add(mesh(new THREE.CylinderGeometry(0.026, 0.026, 0.18, 10), new THREE.MeshStandardMaterial({ color: '#222', roughness: 0.8 }), 0, -0.07, 0));
    const head = mesh(new THREE.BoxGeometry(0.06, 0.07, 0.17), metal(), 0, -0.95, 0.05);
    holder.add(head);
    spec = { at: [0.12, 0.62, 0.12], axis: 'x', from: 2.5, to: -1.4, hit: 0.5, label: 'golf' };
  } else if (kind === 'maza') {
    // maza de madera por encima de la cabeza; golpe de arriba abajo
    holder.add(mesh(new THREE.CylinderGeometry(0.024, 0.024, 0.75, 10), wood(), 0, 0.37, 0));
    const head = mesh(new THREE.CylinderGeometry(0.14, 0.14, 0.32, 20), new THREE.MeshStandardMaterial({ color: '#8a5a33', roughness: 0.75 }), 0, 0.78, 0);
    head.rotation.z = Math.PI / 2;
    holder.add(head);
    for (const s of [-1, 1]) {
      const band = mesh(new THREE.TorusGeometry(0.142, 0.012, 6, 20), metal(), s * 0.12, 0.78, 0);
      band.rotation.y = Math.PI / 2;
      holder.add(band);
    }
    spec = { at: [0.22, 0.62, 0.05], axis: 'x', from: -2.3, to: 1.75, hit: 0.75, label: 'maza' };
  } else {
    // patada: una pierna con zapatilla que sale de la cadera
    holder.add(mesh(new THREE.CapsuleGeometry(0.07, 0.3, 6, 12), new THREE.MeshStandardMaterial({ color: '#e9e2d6', roughness: 0.9 }), 0, -0.2, 0));
    const shoe = mesh(new THREE.SphereGeometry(0.1, 16, 12), new THREE.MeshStandardMaterial({ color: shoeColor, roughness: 0.6 }), 0, -0.42, 0.05);
    shoe.scale.set(1, 0.75, 1.5);
    holder.add(shoe);
    holder.add(mesh(new THREE.BoxGeometry(0.17, 0.03, 0.3), new THREE.MeshStandardMaterial({ color: '#f4f1ea', roughness: 0.6 }), 0, -0.49, 0.06));
    spec = { at: [0.12, 0.32, 0.02], axis: 'x', from: 1.0, to: -1.7, hit: 0.6, label: 'patada' };
  }
  pivot.position.set(...spec.at);
  pivot.rotation[spec.axis] = spec.from;
  holder.scale.setScalar(1.3); // un poco exagerada, para que se vea desde la cámara del tablero
  return { pivot, ...spec };
}

// ------------------------------------------------------------------
// Rótulos de cómic
// ------------------------------------------------------------------

const WORDS = { bate: '¡ZAS!', golf: '¡FIUU!', maza: '¡BONK!', patada: '¡POW!' };

export function makeBurst(label) {
  const S = 256;
  const cv = document.createElement('canvas');
  cv.width = cv.height = S;
  const c = cv.getContext('2d');
  c.translate(S / 2, S / 2);
  c.beginPath();
  const spikes = 12;
  for (let i = 0; i <= spikes * 2; i++) {
    const a = (i / (spikes * 2)) * Math.PI * 2;
    const r = i % 2 ? 70 + Math.random() * 10 : 118 - Math.random() * 14;
    c.lineTo(Math.cos(a) * r, Math.sin(a) * r);
  }
  c.closePath();
  c.fillStyle = '#ffd93b';
  c.fill();
  c.lineWidth = 8;
  c.strokeStyle = '#d6312b';
  c.stroke();
  c.rotate(-0.12);
  c.font = '700 66px "Caveat", "Comic Sans MS", cursive';
  c.textAlign = 'center';
  c.textBaseline = 'middle';
  c.lineWidth = 9;
  c.strokeStyle = '#ffffff';
  c.strokeText(WORDS[label] || '¡POW!', 0, 4);
  c.fillStyle = '#1d2f78';
  c.fillText(WORDS[label] || '¡POW!', 0, 4);
  const tex = new THREE.CanvasTexture(cv);
  tex.colorSpace = THREE.SRGBColorSpace;
  const sprite = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, transparent: true, depthTest: false }));
  sprite.renderOrder = 10;
  return sprite;
}

// ------------------------------------------------------------------
// Propulsores tipo Iron Man bajo la peana
// ------------------------------------------------------------------

export function makeJets() {
  const g = new THREE.Group();
  const outer = new THREE.MeshBasicMaterial({ color: '#ff7a1a', transparent: true, opacity: 0.85, blending: THREE.AdditiveBlending, depthWrite: false });
  const inner = new THREE.MeshBasicMaterial({ color: '#fff0a0', transparent: true, opacity: 0.95, blending: THREE.AdditiveBlending, depthWrite: false });
  const flames = [];
  for (const s of [-1, 1]) {
    const jet = new THREE.Group();
    jet.position.set(s * 0.2, 0, 0.02);
    const o = new THREE.Mesh(new THREE.ConeGeometry(0.12, 0.7, 16, 1, true), outer);
    o.rotation.x = Math.PI;
    o.position.y = -0.35;
    const i = new THREE.Mesh(new THREE.ConeGeometry(0.06, 0.4, 12, 1, true), inner);
    i.rotation.x = Math.PI;
    i.position.y = -0.2;
    jet.add(o, i);
    g.add(jet);
    flames.push(jet);
  }
  g.userData.flames = flames;
  g.userData.power = 0; // 0 apagado .. 1 a tope
  return g;
}

// ------------------------------------------------------------------
// Partículas sencillas (chispas, humo, estrellitas)
// ------------------------------------------------------------------

let dotTex = null;
function getDot() {
  if (dotTex) return dotTex;
  const S = 64;
  const cv = document.createElement('canvas');
  cv.width = cv.height = S;
  const c = cv.getContext('2d');
  const g = c.createRadialGradient(S / 2, S / 2, 0, S / 2, S / 2, S / 2);
  g.addColorStop(0, 'rgba(255,255,255,1)');
  g.addColorStop(0.4, 'rgba(255,255,255,0.6)');
  g.addColorStop(1, 'rgba(255,255,255,0)');
  c.fillStyle = g;
  c.fillRect(0, 0, S, S);
  dotTex = new THREE.CanvasTexture(cv);
  return dotTex;
}

let starTex = null;
function getStar() {
  if (starTex) return starTex;
  const S = 64;
  const cv = document.createElement('canvas');
  cv.width = cv.height = S;
  const c = cv.getContext('2d');
  c.translate(S / 2, S / 2);
  c.beginPath();
  for (let i = 0; i < 10; i++) {
    const a = -Math.PI / 2 + (i * Math.PI) / 5, r = i % 2 ? 11 : 28;
    c.lineTo(Math.cos(a) * r, Math.sin(a) * r);
  }
  c.closePath();
  c.fillStyle = '#ffe14d';
  c.fill();
  c.lineWidth = 3;
  c.strokeStyle = '#e0892a';
  c.stroke();
  starTex = new THREE.CanvasTexture(cv);
  starTex.colorSpace = THREE.SRGBColorSpace;
  return starTex;
}

export class Particles {
  constructor(parent) {
    this.parent = parent;
    this.list = [];
    this.jets = new Set();
    this.trails = new Set();
    this.last = performance.now();
    this._v = new THREE.Vector3();
  }

  spawn({ pos, vel, life = 600, size = 0.2, grow = 1, color = '#ffffff', additive = false, gravity = 0, star = false, opacity = 1 }) {
    const mat = new THREE.SpriteMaterial({
      map: star ? getStar() : getDot(), color, transparent: true, opacity, depthWrite: false,
      blending: additive ? THREE.AdditiveBlending : THREE.NormalBlending,
    });
    const s = new THREE.Sprite(mat);
    s.position.copy(pos);
    s.scale.setScalar(size);
    this.parent.add(s);
    this.list.push({ s, vel: vel.clone(), t0: performance.now(), life, size, grow, gravity, opacity, spin: star ? (Math.random() - 0.5) * 8 : 0 });
  }

  // posición de un objeto en el espacio del contenedor de partículas
  local(obj, out = new THREE.Vector3()) {
    obj.getWorldPosition(out);
    return this.parent.worldToLocal(out);
  }

  burst(pos, n, opts) {
    for (let i = 0; i < n; i++) {
      const a = Math.random() * Math.PI * 2, up = Math.random();
      const sp = (opts.speed || 1) * (0.5 + Math.random() * 0.8);
      this.spawn({ ...opts, pos, vel: new THREE.Vector3(Math.cos(a) * sp, up * sp * (opts.lift ?? 1), Math.sin(a) * sp) });
    }
  }

  clear() {
    for (const p of this.list) { this.parent.remove(p.s); p.s.material.dispose(); }
    this.list = [];
    this.jets.clear();
    this.trails.clear();
  }

  update(now) {
    const dt = Math.min(0.05, (now - this.last) / 1000);
    this.last = now;
    // propulsores: parpadeo y chispas
    for (const jets of this.jets) {
      const p = jets.userData.power;
      jets.visible = p > 0.01;
      if (!jets.visible) continue;
      for (const f of jets.userData.flames) {
        f.scale.set(p * (0.85 + Math.random() * 0.3), p * (0.75 + Math.random() * 0.5), p * (0.85 + Math.random() * 0.3));
        if (Math.random() < 0.6 * p) {
          const at = this.local(f, this._v).clone();
          at.y -= 0.25 * p;
          this.spawn({
            pos: at, vel: new THREE.Vector3((Math.random() - 0.5) * 0.6, -1.5 - Math.random(), (Math.random() - 0.5) * 0.6),
            life: 350, size: 0.16, grow: 0.3, color: Math.random() < 0.5 ? '#ffb02e' : '#ff5a1a', additive: true,
          });
        }
        if (Math.random() < 0.25 * p) {
          const at = this.local(f, this._v).clone();
          at.y -= 0.4 * p;
          this.spawn({
            pos: at, vel: new THREE.Vector3((Math.random() - 0.5) * 0.4, -0.3, (Math.random() - 0.5) * 0.4),
            life: 900, size: 0.18, grow: 3, color: '#9a928a', opacity: 0.45,
          });
        }
      }
    }
    // estela de estrellitas de una ficha que sale volando
    for (const obj of this.trails) {
      if (Math.random() < 0.7) {
        this.spawn({ pos: this.local(obj, this._v).clone(), vel: new THREE.Vector3(0, -0.2, 0), life: 500, size: 0.14, grow: 0.2, star: true });
      }
    }
    // mover y apagar
    const alive = [];
    for (const p of this.list) {
      const k = (now - p.t0) / p.life;
      if (k >= 1) { this.parent.remove(p.s); p.s.material.dispose(); continue; }
      p.vel.y -= p.gravity * dt;
      p.s.position.addScaledVector(p.vel, dt);
      p.s.scale.setScalar(p.size * (1 + (p.grow - 1) * k));
      p.s.material.opacity = p.opacity * (1 - k);
      if (p.spin) p.s.material.rotation += p.spin * dt;
      alive.push(p);
    }
    this.list = alive;
  }
}
