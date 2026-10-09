// Peluches hechos con esferas y mucho cariño.
import * as THREE from 'three';

export const PLUSHES = [
  { id: 'oso', name: 'Osito', base: '#a8774f', light: '#e8c9a4' },
  { id: 'conejo', name: 'Conejito', base: '#f1ece6', light: '#ffd3dc' },
  { id: 'gato', name: 'Gatito', base: '#9a9aa6', light: '#f4efe9' },
  { id: 'rana', name: 'Ranita', base: '#7fbf5a', light: '#e7f3c8' },
  { id: 'cerdo', name: 'Cerdito', base: '#f4a9b8', light: '#ffd9e0' },
];

let furTexture = null;
function getFur() {
  if (furTexture) return furTexture;
  const S = 256;
  const cv = document.createElement('canvas');
  cv.width = cv.height = S;
  const ctx = cv.getContext('2d');
  ctx.fillStyle = '#d8d8d8';
  ctx.fillRect(0, 0, S, S);
  // pelitos cortos en todas direcciones
  for (let i = 0; i < 9000; i++) {
    const x = Math.random() * S, y = Math.random() * S;
    const a = Math.random() * Math.PI * 2, l = 2 + Math.random() * 5;
    const v = 170 + Math.random() * 85;
    ctx.strokeStyle = `rgb(${v},${v},${v})`;
    ctx.lineWidth = 0.8 + Math.random();
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineTo(x + Math.cos(a) * l, y + Math.sin(a) * l);
    ctx.stroke();
  }
  furTexture = new THREE.CanvasTexture(cv);
  furTexture.wrapS = furTexture.wrapT = THREE.RepeatWrapping;
  furTexture.repeat.set(3, 3);
  furTexture.colorSpace = THREE.SRGBColorSpace;
  return furTexture;
}

function fabric(color) {
  const fur = getFur();
  return new THREE.MeshPhysicalMaterial({
    color,
    map: fur,
    bumpMap: fur,
    bumpScale: 1.2,
    roughness: 1,
    sheen: 1,
    sheenRoughness: 0.6,
    sheenColor: new THREE.Color('#ffffff'),
  });
}

const shiny = (color) => new THREE.MeshStandardMaterial({ color, roughness: 0.25, metalness: 0 });
const felt = (color) => new THREE.MeshStandardMaterial({ color, roughness: 0.95 });

const SPH = new THREE.SphereGeometry(1, 28, 20);

function ball(mat, r, x, y, z, sx = 1, sy = 1, sz = 1) {
  const m = new THREE.Mesh(SPH, mat);
  m.position.set(x, y, z);
  m.scale.set(r * sx, r * sy, r * sz);
  m.castShadow = true;
  return m;
}

// Crea un peluche. teamInk/teamSoft: colores del jugador.
export function makePlush(kind, teamInk, teamSoft) {
  const def = PLUSHES.find((p) => p.id === kind) || PLUSHES[0];
  const g = new THREE.Group();
  const body = new THREE.Group(); // lo que se aplasta al saltar
  g.add(body);

  const baseCol = new THREE.Color(def.base).lerp(new THREE.Color(teamSoft), 0.45);
  const lightCol = new THREE.Color(def.light);
  const furMat = fabric(baseCol);
  const lightMat = fabric(lightCol);
  const black = shiny('#1a1410');
  const white = shiny('#ffffff');
  const pink = felt('#e9879b');
  const ink = felt(teamInk);

  // peana de fieltro del color del equipo
  const base = new THREE.Mesh(new THREE.CylinderGeometry(0.5, 0.54, 0.08, 32), ink);
  base.position.y = 0.04;
  base.castShadow = true;
  base.receiveShadow = true;
  g.add(base);

  body.add(ball(furMat, 0.42, 0, 0.5, 0, 1, 0.95, 0.9)); // tripa
  body.add(ball(lightMat, 0.27, 0, 0.47, 0.2, 1, 1.05, 0.55)); // barriguita
  body.add(ball(furMat, 0.14, -0.2, 0.18, 0.2, 1, 0.8, 1.3)); // patas
  body.add(ball(furMat, 0.14, 0.2, 0.18, 0.2, 1, 0.8, 1.3));
  body.add(ball(lightMat, 0.08, -0.2, 0.17, 0.36, 1, 1, 0.4));
  body.add(ball(lightMat, 0.08, 0.2, 0.17, 0.36, 1, 1, 0.4));
  const armL = ball(furMat, 0.12, -0.38, 0.58, 0.1, 1, 1.5, 1);
  const armR = ball(furMat, 0.12, 0.38, 0.58, 0.1, 1, 1.5, 1);
  armL.rotation.z = -0.5; armR.rotation.z = 0.5;
  body.add(armL, armR);

  // bufanda del equipo
  const scarf = new THREE.Mesh(new THREE.TorusGeometry(0.25, 0.075, 12, 32), ink);
  scarf.rotation.x = Math.PI / 2;
  scarf.position.y = 0.8;
  scarf.castShadow = true;
  body.add(scarf);
  const tail = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.24, 0.05), ink);
  tail.position.set(0.14, 0.7, 0.24);
  tail.rotation.z = 0.25;
  body.add(tail);

  const head = new THREE.Group();
  head.position.y = 1.08;
  body.add(head);
  const headScale = kind === 'rana' ? [1.25, 0.82, 1] : [1, 0.95, 0.95];
  head.add(ball(furMat, 0.36, 0, 0, 0, ...headScale));

  const eye = (x, y, z, r = 0.048) => {
    head.add(ball(black, r, x, y, z));
    head.add(ball(white, r * 0.35, x + r * 0.3, y + r * 0.35, z + r * 0.75));
  };
  const cheeks = () => {
    const blush = new THREE.MeshStandardMaterial({ color: '#ff8fa3', roughness: 1, transparent: true, opacity: 0.55 });
    head.add(ball(blush, 0.06, -0.21, -0.07, 0.27, 1, 0.6, 0.3));
    head.add(ball(blush, 0.06, 0.21, -0.07, 0.27, 1, 0.6, 0.3));
  };

  if (kind === 'oso') {
    for (const s of [-1, 1]) {
      head.add(ball(furMat, 0.13, s * 0.25, 0.28, -0.02, 1, 1, 0.6));
      head.add(ball(lightMat, 0.075, s * 0.25, 0.28, 0.04, 1, 1, 0.4));
    }
    head.add(ball(lightMat, 0.14, 0, -0.08, 0.28, 1.2, 0.85, 0.8));
    head.add(ball(black, 0.05, 0, -0.03, 0.39, 1.3, 0.9, 0.8));
    eye(-0.13, 0.06, 0.29);
    eye(0.13, 0.06, 0.29);
    cheeks();
  } else if (kind === 'conejo') {
    const earGeo = new THREE.CapsuleGeometry(0.075, 0.36, 6, 14);
    for (const s of [-1, 1]) {
      const ear = new THREE.Mesh(earGeo, furMat);
      ear.position.set(s * 0.13, 0.47, -0.04);
      ear.rotation.z = -s * 0.18;
      ear.scale.set(1, 1, 0.55);
      ear.castShadow = true;
      const inner = new THREE.Mesh(earGeo, pink);
      inner.scale.set(0.55, 0.85, 0.3);
      inner.position.z = 0.04;
      ear.add(inner);
      head.add(ear);
    }
    head.add(ball(lightMat, 0.1, -0.06, -0.09, 0.28, 1, 0.8, 0.8));
    head.add(ball(lightMat, 0.1, 0.06, -0.09, 0.28, 1, 0.8, 0.8));
    head.add(ball(pink, 0.04, 0, -0.03, 0.35, 1.2, 0.9, 0.9));
    eye(-0.13, 0.06, 0.29);
    eye(0.13, 0.06, 0.29);
    cheeks();
  } else if (kind === 'gato') {
    const earGeo = new THREE.ConeGeometry(0.12, 0.24, 4);
    for (const s of [-1, 1]) {
      const ear = new THREE.Mesh(earGeo, furMat);
      ear.position.set(s * 0.2, 0.3, 0);
      ear.rotation.set(0, Math.PI / 4, -s * 0.35);
      ear.scale.set(1, 1, 0.5);
      ear.castShadow = true;
      head.add(ear);
      const inner = new THREE.Mesh(earGeo, pink);
      inner.position.set(s * 0.19, 0.28, 0.035);
      inner.rotation.copy(ear.rotation);
      inner.scale.set(0.55, 0.65, 0.25);
      head.add(inner);
    }
    head.add(ball(lightMat, 0.12, 0, -0.1, 0.27, 1.3, 0.75, 0.7));
    head.add(ball(pink, 0.035, 0, -0.04, 0.35, 1.3, 0.9, 0.9));
    const whiskerGeo = new THREE.CylinderGeometry(0.006, 0.006, 0.26, 4);
    for (const s of [-1, 1]) {
      for (const k of [-1, 1]) {
        const w = new THREE.Mesh(whiskerGeo, black);
        w.rotation.z = Math.PI / 2 + k * 0.15 * s;
        w.position.set(s * 0.25, -0.08 + k * 0.03, 0.27);
        head.add(w);
      }
    }
    eye(-0.13, 0.07, 0.29, 0.052);
    eye(0.13, 0.07, 0.29, 0.052);
  } else if (kind === 'rana') {
    for (const s of [-1, 1]) {
      head.add(ball(furMat, 0.13, s * 0.2, 0.22, 0.1));
      head.add(ball(white, 0.09, s * 0.2, 0.24, 0.18));
      head.add(ball(black, 0.05, s * 0.2, 0.25, 0.26));
    }
    const mouth = new THREE.Mesh(new THREE.TorusGeometry(0.2, 0.015, 6, 24, Math.PI * 0.7), black);
    mouth.rotation.z = Math.PI + Math.PI * 0.15;
    mouth.position.set(0, -0.0, 0.3);
    head.add(mouth);
    cheeks();
  } else if (kind === 'cerdo') {
    const earGeo = new THREE.ConeGeometry(0.11, 0.2, 3);
    for (const s of [-1, 1]) {
      const ear = new THREE.Mesh(earGeo, furMat);
      ear.position.set(s * 0.22, 0.27, 0.04);
      ear.rotation.set(0.6, 0, -s * 0.5);
      ear.castShadow = true;
      head.add(ear);
    }
    const snout = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.13, 0.09, 24), lightMat);
    snout.rotation.x = Math.PI / 2;
    snout.position.set(0, -0.07, 0.33);
    head.add(snout);
    head.add(ball(pink, 0.025, -0.045, -0.07, 0.38, 1, 1.4, 0.5));
    head.add(ball(pink, 0.025, 0.045, -0.07, 0.38, 1, 1.4, 0.5));
    eye(-0.14, 0.08, 0.28);
    eye(0.14, 0.08, 0.28);
    cheeks();
  }

  // anillo de selección dibujado a boli (oculto por defecto)
  const ring = new THREE.Mesh(
    new THREE.RingGeometry(0.58, 0.7, 40),
    new THREE.MeshBasicMaterial({ color: teamInk, transparent: true, opacity: 0.9, depthWrite: false }),
  );
  ring.rotation.x = -Math.PI / 2;
  ring.position.y = 0.012;
  ring.visible = false;
  g.add(ring);

  g.scale.setScalar(0.64);
  g.userData = { body, head, ring, armL, armR };
  return g;
}
