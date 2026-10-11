// Reglas del parchís (versión española clásica, un dado, 4 colores).
// Este módulo no depende de three.js: se puede probar con node.

export const COLORS = [
  { id: 'yellow', name: 'Amarillo', ink: '#d39b00', soft: '#f3d36b', exit: 5, entry: 68 },
  { id: 'blue', name: 'Azul', ink: '#1f4fbf', soft: '#8fb0ec', exit: 22, entry: 17 },
  { id: 'red', name: 'Rojo', ink: '#c8322b', soft: '#ee9a92', exit: 39, entry: 34 },
  { id: 'green', name: 'Verde', ink: '#2e8b57', soft: '#93d1a9', exit: 56, entry: 51 },
];

export const SAFE = new Set([5, 12, 17, 22, 29, 34, 39, 46, 51, 56, 63, 68]);
export const HOME = -1;
export const LAST_TRACK = 63; // progreso de la casilla de entrada al pasillo
export const META = 71; // 7 casillas de pasillo + meta
export const CAPTURE_BONUS = 20;
export const META_BONUS = 10;

// Casilla global (1..68) de un progreso p (0..63) para un color.
export function squareOf(color, p) {
  return ((COLORS[color].exit - 1 + p) % 68) + 1;
}

// Clave única de la celda donde está una ficha.
export function cellKey(color, p) {
  if (p === HOME) return 'h' + color;
  if (p <= LAST_TRACK) return 's' + squareOf(color, p);
  if (p < META) return 'c' + color + '-' + (p - LAST_TRACK - 1);
  return 'm' + color;
}

export class Game {
  // players: [{ color, plush, cpu, name }]
  constructor(players) {
    this.players = players.map((pl) => ({
      ...pl,
      pieces: [0, 1, 2, 3].map((id) => ({ id, pos: HOME, arrived: 0 })),
    }));
    this.turn = 0;
    this.tick = 0;
    this.sixes = 0;
    this.extra = false;
    this.lastMoved = null;
    this.bonusQueue = [];
    this.winner = null;
  }

  get current() {
    return this.players[this.turn];
  }

  *allPieces() {
    for (let i = 0; i < this.players.length; i++) {
      for (const pc of this.players[i].pieces) yield { pl: i, pc };
    }
  }

  occupants(key, except = null) {
    const out = [];
    for (const o of this.allPieces()) {
      if (o.pc === except) continue;
      if (cellKey(this.players[o.pl].color, o.pc.pos) === key) out.push(o);
    }
    return out;
  }

  isBarrier(occ) {
    return occ.length >= 2 && occ[0].pl === occ[1].pl;
  }

  allOut(plIdx) {
    return this.players[plIdx].pieces.every((p) => p.pos !== HOME);
  }

  // Movimientos legales para avanzar `steps`. kind: 'die' | 'bonus'.
  legalMoves(plIdx, steps, kind = 'die', raw = steps) {
    const pl = this.players[plIdx];
    const color = pl.color;
    const moves = [];

    if (kind === 'die' && steps === 5) {
      const key = cellKey(color, 0);
      const occ = this.occupants(key);
      let capture = null;
      let ok = occ.length < 2;
      if (occ.length >= 2) {
        const rivals = occ.filter((o) => o.pl !== plIdx);
        if (rivals.length) {
          rivals.sort((a, b) => b.pc.arrived - a.pc.arrived);
          capture = rivals[0];
          ok = true;
        }
      }
      if (ok) {
        for (const pc of pl.pieces) {
          if (pc.pos === HOME) moves.push({ pl: plIdx, piece: pc, from: HOME, to: 0, capture, path: [0] });
        }
      }
      // Con un 5 es obligatorio sacar ficha si se puede.
      if (moves.length) return moves;
    }

    for (const pc of pl.pieces) {
      if (pc.pos === HOME || pc.pos === META) continue;
      const to = pc.pos + steps;
      if (to > META) continue;
      let blocked = false;
      const path = [];
      for (let q = pc.pos + 1; q <= to; q++) {
        path.push(q);
        if (q === META) break;
        const occ = this.occupants(cellKey(color, q), pc);
        if (q < to && this.isBarrier(occ)) { blocked = true; break; }
        if (q === to && occ.length >= 2) { blocked = true; break; }
      }
      if (blocked) continue;
      let capture = null;
      if (to <= LAST_TRACK) {
        const occ = this.occupants(cellKey(color, to), pc);
        if (occ.length === 1 && occ[0].pl !== plIdx && !SAFE.has(squareOf(color, to))) capture = occ[0];
      }
      moves.push({ pl: plIdx, piece: pc, from: pc.pos, to, capture, path });
    }

    // Con un 6 hay que abrir barrera si se puede.
    if (kind === 'die' && raw === 6) {
      const breaking = moves.filter((m) => {
        if (m.from === HOME || m.from === META) return false;
        const occ = this.occupants(cellKey(color, m.from));
        return this.isBarrier(occ) && occ[0].pl === plIdx;
      });
      if (breaking.length) return breaking;
    }
    return moves;
  }

  // Tira el dado (n = 1..6). Devuelve { value, moves, penalty }.
  roll(n) {
    if (n === 6) {
      this.sixes++;
      if (this.sixes === 3) {
        this.extra = false;
        let penalty = null;
        const lm = this.lastMoved;
        if (lm && lm.pos !== HOME && lm.pos <= LAST_TRACK) {
          lm.pos = HOME;
          penalty = lm;
        }
        this.pending = null;
        return { value: 6, moves: [], penalty };
      }
      this.extra = true;
    } else {
      this.extra = false;
    }
    const value = n === 6 && this.allOut(this.turn) ? 7 : n;
    const moves = this.legalMoves(this.turn, value, 'die', n);
    this.pending = { kind: 'die', value, moves };
    return { value, moves, penalty: null };
  }

  apply(move) {
    const pc = move.piece;
    pc.pos = move.to;
    pc.arrived = ++this.tick;
    this.lastMoved = pc;
    const events = { capture: null, meta: false };
    if (move.capture) {
      move.capture.pc.pos = HOME;
      events.capture = move.capture;
      this.bonusQueue.push(CAPTURE_BONUS);
    }
    if (move.to === META) {
      events.meta = true;
      if (this.players[move.pl].pieces.every((p) => p.pos === META)) {
        this.winner = move.pl;
        this.bonusQueue = [];
      } else {
        this.bonusQueue.push(META_BONUS);
      }
    }
    this.pending = null;
    return events;
  }

  // Siguiente paso tras resolver una tirada o un bonus.
  // { type: 'bonus', value, moves } | { type: 'roll', same } | { type: 'over' }
  next() {
    if (this.winner !== null) return { type: 'over', winner: this.winner };
    while (this.bonusQueue.length) {
      const value = this.bonusQueue.shift();
      const moves = this.legalMoves(this.turn, value, 'bonus');
      if (moves.length) {
        this.pending = { kind: 'bonus', value, moves };
        return { type: 'bonus', value, moves };
      }
    }
    if (this.extra) {
      this.extra = false;
      return { type: 'roll', same: true };
    }
    this.turn = (this.turn + 1) % this.players.length;
    this.sixes = 0;
    this.lastMoved = null;
    return { type: 'roll', same: false };
  }

  // Heurística sencilla para la CPU.
  bestMove(moves) {
    let best = null;
    let bestScore = -Infinity;
    for (const m of moves) {
      const s = this.scoreMove(m) + Math.random() * 2;
      if (s > bestScore) { bestScore = s; best = m; }
    }
    return best;
  }

  threatAt(plIdx, color, p) {
    if (p < 0 || p > LAST_TRACK) return 0;
    const sq = squareOf(color, p);
    if (SAFE.has(sq)) return 0;
    let t = 0;
    for (const o of this.allPieces()) {
      if (o.pl === plIdx) continue;
      const op = o.pc.pos;
      if (op < 0 || op > LAST_TRACK) continue;
      const oc = this.players[o.pl].color;
      const d = (sq - squareOf(oc, op) + 68) % 68;
      if (d >= 1 && d <= 7 && op + d <= LAST_TRACK) t++;
    }
    return t;
  }

  scoreMove(m) {
    const color = this.players[m.pl].color;
    let s = m.to * 0.3;
    if (m.capture) s += 100;
    if (m.to === META) s += 80;
    if (m.from === HOME) s += 60;
    if (m.from <= LAST_TRACK && m.to > LAST_TRACK) s += 40;
    if (m.to <= LAST_TRACK && SAFE.has(squareOf(color, m.to))) s += 15;
    s += this.threatAt(m.pl, color, m.from) * 20;
    s -= this.threatAt(m.pl, color, m.to) * 25;
    return s;
  }
}
