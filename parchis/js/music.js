// Música de fiesta sintetizada con WebAudio: tuba que hace «oom-pah», acordes de
// banjo, xilófono, caja de madera, silbato de émbolo y platillo, tocando melodías
// clásicas de dibujos animados que son de dominio público.

import { TUNES } from './tunes.js';

// Melodías de dominio público (ver tunes.js). Cada victoria suena la siguiente.
export const BPM = 152; // tempo por defecto si no suena música

const midiFreq = (m) => 440 * Math.pow(2, (m - 69) / 12);
const NOTE = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 };
const QUALITY = { '': [0, 4, 7], m: [0, 3, 7], '7': [0, 4, 7, 10], m7: [0, 3, 7, 10], dim: [0, 3, 6], maj7: [0, 4, 7, 11] };

function pitchClass(name) {
  return (NOTE[name[0]] + (name[1] === '#' ? 1 : name[1] === 'b' ? -1 : 0) + 12) % 12;
}

// «D7», «C/E», «Fm»... -> { root, bass, tones }
function parseChord(name) {
  const [main, slash] = name.split('/');
  const m = /^([A-G][#b]?)(.*)$/.exec(main);
  const root = pitchClass(m[1]);
  return { root, bass: slash ? pitchClass(slash) : root, tones: QUALITY[m[2]] || QUALITY[''] };
}

// prepara una pieza: notas con su instante de inicio y el acorde de cada tiempo
function prepare(tune) {
  let t = 0;
  const notes = [];
  for (const [midi, d] of tune.notes) {
    if (midi) notes.push({ t, midi: midi + 12, d });
    t += d;
  }
  const chordAt = [];
  let ci = 0, cur = parseChord(tune.chords[0] ? tune.chords[0][1] : 'C');
  for (let beat = 0; beat < tune.beats; beat++) {
    while (ci < tune.chords.length && tune.chords[ci][0] <= beat + 1e-6) cur = parseChord(tune.chords[ci++][1]);
    chordAt.push(cur);
  }
  return { ...tune, notes, chordAt };
}
const PIECES = TUNES.map(prepare);

export class Music {
  constructor() {
    this.ctx = null;
    this.playing = false;
    this.muted = false;
    try { this.muted = localStorage.getItem('parchis-peluches-mute') === '1'; } catch { /* nada */ }
    let i = -1;
    try { i = parseInt(localStorage.getItem('parchis-peluches-tune'), 10); } catch { /* nada */ }
    this.index = Number.isInteger(i) ? i : -1;
    this.piece = PIECES[0];
  }

  // pasa a la siguiente pieza (se llama al empezar cada fiesta)
  next() {
    this.index = (this.index + 1) % PIECES.length;
    this.piece = PIECES[this.index];
    try { localStorage.setItem('parchis-peluches-tune', String(this.index)); } catch { /* nada */ }
    return this.piece;
  }

  get bpm() { return this.piece.bpm; }

  // Hay que crear el contexto dentro de un gesto del usuario (un toque o una tecla).
  unlock() {
    try {
      if (!this.ctx) {
        const AC = window.AudioContext || window.webkitAudioContext;
        if (!AC) return;
        this.ctx = new AC();
      }
      if (this.ctx.state === 'suspended') this.ctx.resume();
    } catch { this.ctx = null; }
  }

  setMuted(m) {
    this.muted = m;
    try { localStorage.setItem('parchis-peluches-mute', m ? '1' : '0'); } catch { /* nada */ }
    if (m) this.stop();
  }

  start() {
    if (this.muted || !this.ctx || this.playing) return;
    const ctx = this.ctx;
    if (ctx.state === 'suspended') ctx.resume();
    this.playing = true;
    this.master = ctx.createGain();
    this.master.gain.value = 0.55;
    const comp = ctx.createDynamicsCompressor();
    this.master.connect(comp).connect(ctx.destination);
    this.noise = this.makeNoise();
    const t0 = ctx.currentTime + 0.08;
    // entrada: silbato de émbolo hacia arriba y platillo
    this.slideWhistle(t0, 0.55, 520, 1560);
    this.cymbal(t0 + 0.6, 1.2);
    this.startAt = t0 + 0.62;
    this.nextBeat = 0;
    this.loops = 0;
    this.timer = setInterval(() => this.schedule(), 40);
    this.schedule();
  }

  stop() {
    if (!this.playing) return;
    this.playing = false;
    clearInterval(this.timer);
    const ctx = this.ctx, g = this.master;
    g.gain.cancelScheduledValues(ctx.currentTime);
    g.gain.setValueAtTime(g.gain.value, ctx.currentTime);
    g.gain.linearRampToValueAtTime(0, ctx.currentTime + 0.4);
    setTimeout(() => g.disconnect(), 600);
  }

  // programa los tiempos que caen en los próximos 0,3 s
  schedule() {
    if (!this.playing) return;
    const ctx = this.ctx;
    const beatLen = 60 / this.piece.bpm, loopBeats = this.piece.beats;
    while (this.startAt + this.nextBeat * beatLen < ctx.currentTime + 0.3) {
      const beat = this.nextBeat % loopBeats;
      const t = this.startAt + this.nextBeat * beatLen;
      const loop = Math.floor(this.nextBeat / loopBeats);
      this.playBeat(beat, t, loop);
      this.nextBeat++;
    }
  }

  playBeat(beat, t, loop) {
    const piece = this.piece, BEAT = 60 / piece.bpm;
    const inBar = beat % 4;
    const ch = piece.chordAt[beat];
    // tuba: oom en 1 y 3 (fundamental y quinta); banjo: pah en 2 y 4
    const low = (pc) => 40 + ((pc + 8) % 12); // entre Mi2 y Re#3, que se oye bien en altavoces pequeños
    if (inBar === 0) this.tuba(t, low(ch.bass), BEAT);
    if (inBar === 2) this.tuba(t, low(ch.root + 7), BEAT);
    if (inBar === 1 || inBar === 3) for (const iv of ch.tones) this.banjo(t, 57 + ((ch.root + iv) % 12));
    // caja de madera a contratiempo, platillo al empezar cada vuelta y «boing» al acabarla
    this.woodblock(t + BEAT / 2, inBar % 2 ? 1500 : 1100);
    if (beat === 0 && loop > 0) this.cymbal(t, 0.8);
    if (beat === piece.beats - 1) this.slideWhistle(t, BEAT * 0.9, 1400, 600);
    // melodía: las notas que empiezan dentro de este tiempo
    for (const n of piece.notes) {
      if (n.t >= beat && n.t < beat + 1) this.xylophone(t + (n.t - beat) * BEAT, midiFreq(n.midi), Math.min(n.d, 1) * BEAT);
    }
  }

  out(t, dur) {
    const g = this.ctx.createGain();
    g.connect(this.master);
    setTimeout(() => g.disconnect(), (t - this.ctx.currentTime + dur + 0.5) * 1000);
    return g;
  }

  xylophone(t, f, dur) {
    const ctx = this.ctx, g = this.out(t, 0.6);
    g.gain.setValueAtTime(0, t);
    g.gain.linearRampToValueAtTime(0.32, t + 0.004);
    g.gain.exponentialRampToValueAtTime(0.001, t + Math.max(0.25, dur * 1.4));
    for (const [mult, amp] of [[1, 1], [3.9, 0.25], [9.2, 0.08]]) {
      if (f * mult > 16000) continue;
      const o = ctx.createOscillator(), a = ctx.createGain();
      o.type = 'sine';
      o.frequency.value = f * mult;
      a.gain.value = amp;
      o.connect(a).connect(g);
      o.start(t);
      o.stop(t + 0.7);
    }
  }

  tuba(t, midi, BEAT) {
    const ctx = this.ctx, g = this.out(t, 0.5);
    const o = ctx.createOscillator(), lp = ctx.createBiquadFilter();
    const f = midiFreq(midi);
    o.type = 'sawtooth';
    o.frequency.setValueAtTime(f * 0.97, t);
    o.frequency.linearRampToValueAtTime(f, t + 0.05);
    lp.type = 'lowpass';
    lp.frequency.setValueAtTime(900, t);
    lp.frequency.exponentialRampToValueAtTime(260, t + 0.3);
    g.gain.setValueAtTime(0, t);
    g.gain.linearRampToValueAtTime(0.5, t + 0.02);
    g.gain.exponentialRampToValueAtTime(0.001, t + BEAT * 0.9);
    o.connect(lp).connect(g);
    o.start(t);
    o.stop(t + BEAT);
  }

  banjo(t, midi) {
    const ctx = this.ctx, g = this.out(t, 0.3);
    const o = ctx.createOscillator(), hp = ctx.createBiquadFilter();
    o.type = 'square';
    o.frequency.value = midiFreq(midi);
    hp.type = 'bandpass';
    hp.frequency.value = 1800;
    hp.Q.value = 0.8;
    g.gain.setValueAtTime(0, t);
    g.gain.linearRampToValueAtTime(0.09, t + 0.003);
    g.gain.exponentialRampToValueAtTime(0.001, t + 0.18);
    o.connect(hp).connect(g);
    o.start(t);
    o.stop(t + 0.2);
  }

  makeNoise() {
    const ctx = this.ctx, len = ctx.sampleRate;
    const buf = ctx.createBuffer(1, len, ctx.sampleRate);
    const d = buf.getChannelData(0);
    for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
    return buf;
  }

  woodblock(t, f) {
    const ctx = this.ctx, g = this.out(t, 0.1);
    const o = ctx.createOscillator();
    o.type = 'triangle';
    o.frequency.setValueAtTime(f, t);
    o.frequency.exponentialRampToValueAtTime(f * 0.7, t + 0.05);
    g.gain.setValueAtTime(0.12, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + 0.06);
    o.connect(g);
    o.start(t);
    o.stop(t + 0.08);
  }

  cymbal(t, dur) {
    const ctx = this.ctx, g = this.out(t, dur);
    const s = ctx.createBufferSource(), hp = ctx.createBiquadFilter();
    s.buffer = this.noise;
    hp.type = 'highpass';
    hp.frequency.value = 6000;
    g.gain.setValueAtTime(0.25, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + dur);
    s.connect(hp).connect(g);
    s.start(t);
    s.stop(t + dur);
  }

  slideWhistle(t, dur, f0, f1) {
    const ctx = this.ctx, g = this.out(t, dur);
    const o = ctx.createOscillator(), vib = ctx.createOscillator(), vg = ctx.createGain();
    o.type = 'sine';
    o.frequency.setValueAtTime(f0, t);
    o.frequency.exponentialRampToValueAtTime(f1, t + dur);
    vib.frequency.value = 9;
    vg.gain.value = 18;
    vib.connect(vg).connect(o.frequency);
    g.gain.setValueAtTime(0, t);
    g.gain.linearRampToValueAtTime(0.16, t + 0.04);
    g.gain.setValueAtTime(0.16, t + dur - 0.05);
    g.gain.linearRampToValueAtTime(0, t + dur);
    o.connect(g);
    o.start(t);
    vib.start(t);
    o.stop(t + dur + 0.05);
    vib.stop(t + dur + 0.05);
  }
}
