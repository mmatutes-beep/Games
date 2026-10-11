// Dado de papel con los puntos pintados a boli.
import * as THREE from 'three';
import { makePen, paintPaper, INK } from './board.js';

// Orden de caras de BoxGeometry: +x, -x, +y, -y, +z, -z
const FACE_VALUES = [3, 4, 1, 6, 2, 5];
const FACE_NORMALS = [
  new THREE.Vector3(1, 0, 0), new THREE.Vector3(-1, 0, 0),
  new THREE.Vector3(0, 1, 0), new THREE.Vector3(0, -1, 0),
  new THREE.Vector3(0, 0, 1), new THREE.Vector3(0, 0, -1),
];

const PIPS = {
  1: [[0, 0]],
  2: [[-1, -1], [1, 1]],
  3: [[-1, -1], [0, 0], [1, 1]],
  4: [[-1, -1], [1, -1], [-1, 1], [1, 1]],
  5: [[-1, -1], [1, -1], [0, 0], [-1, 1], [1, 1]],
  6: [[-1, -1], [1, -1], [-1, 0], [1, 0], [-1, 1], [1, 1]],
};

function faceTexture(value, maxAniso) {
  const S = 256;
  const cv = document.createElement('canvas');
  cv.width = cv.height = S;
  const ctx = cv.getContext('2d');
  paintPaper(ctx, S, S, { lines: false, margin: false, seed: value * 11 });
  const pen = makePen(ctx, value * 97);
  const m = 18;
  pen.poly([[m, m], [S - m, m], [S - m, S - m], [m, S - m]], { width: 3, passes: 2, wob: 2 });
  for (const [px, py] of PIPS[value]) {
    const cx = S / 2 + px * 64, cy = S / 2 + py * 64;
    pen.hatch((c) => c.arc(cx, cy, 22, 0, Math.PI * 2), { spacing: 4, alpha: 0.85, width: 2.2, cross: true });
    pen.circle(cx, cy, 22, { width: 3 });
  }
  const tex = new THREE.CanvasTexture(cv);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = maxAniso;
  return tex;
}

const ease = (t) => 1 - Math.pow(1 - t, 3);

export class Dice {
  constructor(maxAniso = 4, size = 1.5) {
    this.size = size;
    const mats = FACE_VALUES.map((v) => new THREE.MeshStandardMaterial({
      map: faceTexture(v, maxAniso), roughness: 0.9,
    }));
    this.mesh = new THREE.Mesh(new THREE.BoxGeometry(size, size, size), mats);
    this.mesh.castShadow = true;
    this.mesh.receiveShadow = true;
    this.home = new THREE.Vector3();
    this.anim = null;
    this.ink = INK;
  }

  place(x, z) {
    this.home.set(x, this.size / 2, z);
    this.mesh.position.copy(this.home);
    this.mesh.quaternion.copy(this.targetQuat(1));
  }

  // Orientación con la cara `value` hacia arriba y un giro aleatorio en Y.
  targetQuat(value, yaw = Math.random() * Math.PI * 2) {
    const n = FACE_NORMALS[FACE_VALUES.indexOf(value)];
    const q = new THREE.Quaternion().setFromUnitVectors(n, new THREE.Vector3(0, 1, 0));
    return new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), yaw).multiply(q);
  }

  // Lanza el dado; resuelve cuando se para mostrando `value`.
  roll(value, duration = 1100) {
    const axis = new THREE.Vector3(Math.random() - 0.5, Math.random() - 0.5, Math.random() - 0.5).normalize();
    const spin = Math.PI * (5 + Math.random() * 3);
    const final = this.targetQuat(value);
    const from = new THREE.Vector3((Math.random() - 0.5) * 3, 0, -2.5 - Math.random());
    return new Promise((resolve) => {
      this.anim = { t0: performance.now(), duration, axis, spin, final, from, resolve };
    });
  }

  update(now) {
    const a = this.anim;
    if (!a) return;
    const t = Math.min(1, (now - a.t0) / a.duration);
    const e = ease(t);
    const q = new THREE.Quaternion().setFromAxisAngle(a.axis, (1 - e) * a.spin);
    this.mesh.quaternion.copy(a.final).premultiply(q);
    // rebotes que se van apagando
    const bounce = Math.abs(Math.sin(t * Math.PI * 3)) * (1 - t) * 2.6;
    this.mesh.position.set(
      this.home.x + a.from.x * (1 - e),
      this.home.y + bounce,
      this.home.z + a.from.z * (1 - e),
    );
    if (t >= 1) {
      this.mesh.position.copy(this.home);
      this.anim = null;
      a.resolve();
    }
  }
}
