// Música de fiesta al estilo de los dibujos animados clásicos, sintetizada con
// WebAudio: tuba que hace «oom-pah», acordes de banjo, xilófono, caja de madera,
// silbato de émbolo y platillo. Melodía original.

export const BPM = 152;
const BEAT = 60 / BPM;

const NOTE = { C: 0, 'C#': 1, D: 2, 'D#': 3, E: 4, F: 5, 'F#': 6, G: 7, 'G#': 8, A: 9, 'A#': 10, B: 11 };
function freq(n) {
  const m = /^([A-G]#?)(\d)$/.exec(n);
  return 440 * Math.pow(2, (NOTE[m[1]] + (+m[2] + 1) * 12 - 69) / 12);
}

// 8 compases de 4 tiempos: [nota, duración en tiempos] (null = silencio)
const MELODY = [
  ['E5', 0.5], ['G5', 0.5], ['C6', 1], ['A5', 0.5], ['G5', 0.5], ['E5', 1],
  ['G5', 0.5], ['F5', 0.5], ['E5', 0.5], ['D5', 0.5], ['E5', 1], ['C5', 1],
  ['D5', 0.5], ['F5', 0.5], ['B5', 1], ['A5', 0.5], ['G5', 0.5], ['F5', 1],
  ['G5', 0.5], ['F5', 0.5], ['D5', 0.5], ['B4', 0.5], ['D5', 1], ['G4', 1],
  ['E5', 0.5], ['G5', 0.5], ['C6', 1], ['D6', 0.5], ['C6', 0.5], ['A5', 1],
  ['A5', 0.5], ['C6', 0.5], ['F6', 1], ['E6', 0.5], ['D6', 0.5], ['C6', 1],
  ['B5', 0.5], ['A5', 0.5], ['G5', 0.5], ['F5', 0.5], ['D5', 0.5], ['F5', 0.5], ['B5', 1],
  ['C6', 1], ['G5', 0.5], ['E5', 0.5], ['C5', 1], [null, 1],
];
// armonía por compás: [bajo, quinta, acorde]
const C = ['C3', 'G2', ['C4', 'E4', 'G4']];
const G7 = ['G2', 'D3', ['B3', 'D4', 'F4']];
const F = ['F2', 'C3', ['A3', 'C4', 'F4']];
const HARMONY = [C, C, G7, G7, C, F, G7, C];
const LOOP_BEATS = 32;

export class Music {
  constructor() {
    this.ctx = null;
    this.playing = false;
    this.muted = false;
    try { this.muted = localStorage.getItem('parchis-peluches-mute') === '1'; } catch { /* nada */ }
  }

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
    while (this.startAt + this.nextBeat * BEAT < ctx.currentTime + 0.3) {
      const beat = this.nextBeat % LOOP_BEATS;
      const t = this.startAt + this.nextBeat * BEAT;
      const loop = Math.floor(this.nextBeat / LOOP_BEATS);
      this.playBeat(beat, t, loop);
      this.nextBeat++;
    }
  }

  playBeat(beat, t, loop) {
    const bar = Math.floor(beat / 4), inBar = beat % 4;
    const [root, fifth, chord] = HARMONY[bar];
    // tuba: oom en 1 y 3; banjo: pah en 2 y 4
    if (inBar === 0) this.tuba(t, root);
    if (inBar === 2) this.tuba(t, fifth);
    if (inBar === 1 || inBar === 3) for (const n of chord) this.banjo(t, n);
    // caja de madera a contratiempo y un «boing» al final de cada vuelta
    this.woodblock(t + BEAT / 2, inBar % 2 ? 1500 : 1100);
    if (beat === LOOP_BEATS - 1) this.slideWhistle(t, BEAT * 0.9, 1400, 600);
    if (beat === 0 && loop > 0) this.cymbal(t, 0.8);
    // melodía: busca las notas que empiezan dentro de este tiempo
    let pos = 0;
    const octave = loop % 2 ? 2 : 1; // en las vueltas impares, la melodía una octava más aguda
    for (const [n, d] of MELODY) {
      if (pos >= beat && pos < beat + 1 && n) {
        const tt = t + (pos - beat) * BEAT;
        this.xylophone(tt, freq(n) * (octave === 2 ? 2 : 1), Math.min(d, 1) * BEAT);
      }
      pos += d;
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

  tuba(t, n) {
    const ctx = this.ctx, g = this.out(t, 0.5);
    const o = ctx.createOscillator(), lp = ctx.createBiquadFilter();
    o.type = 'sawtooth';
    o.frequency.setValueAtTime(freq(n) * 0.97, t);
    o.frequency.linearRampToValueAtTime(freq(n), t + 0.05);
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

  banjo(t, n) {
    const ctx = this.ctx, g = this.out(t, 0.3);
    const o = ctx.createOscillator(), hp = ctx.createBiquadFilter();
    o.type = 'square';
    o.frequency.value = freq(n);
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
