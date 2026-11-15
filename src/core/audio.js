// WebAudio による完全シンセサイズ音響 (効果音・エンジン音・生成アンビエント音楽)
import { G, clamp } from './util.js';

const SCALES = {
  title: { root: 110, chords: [[0, 7, 12, 16], [-4, 3, 8, 12], [-7, 0, 5, 9], [-2, 5, 10, 14]], bell: [12, 16, 19, 24, 26], pulse: 0 },
  space: { root: 98, chords: [[0, 7, 14, 19], [-5, 2, 9, 14], [-3, 4, 12, 16], [-7, 0, 7, 12]], bell: [12, 14, 19, 21, 24, 26], pulse: 0 },
  battle: { root: 82.4, chords: [[0, 7, 12, 15], [-2, 5, 10, 13], [-4, 3, 8, 12], [-5, 2, 7, 10]], bell: [12, 15, 19, 22], pulse: 1 },
  interior: { root: 130.8, chords: [[0, 4, 7, 11], [-3, 0, 4, 9], [-5, -1, 2, 7], [-7, -3, 0, 5]], bell: [12, 16, 19, 23, 24], pulse: 0 },
  hostile: { root: 73.4, chords: [[0, 6, 12, 15], [-1, 5, 11, 14]], bell: [13, 18, 24], pulse: 0.5 },
  neon: { root: 110, chords: [[0, 3, 7, 10], [-4, 0, 3, 8], [-2, 2, 5, 10], [-5, -1, 2, 7]], bell: [12, 15, 17, 19, 22, 24], pulse: 0.6 },
  surface: { root: 87.3, chords: [[0, 7, 12, 16], [-5, 2, 7, 11], [-7, 0, 5, 9]], bell: [12, 16, 19, 24, 28], pulse: 0 },
};
const hz = (root, semi) => root * Math.pow(2, semi / 12);

export class AudioSys {
  constructor() { this.ctx = null; this.on = true; this.kind = 'title'; this.t = 0; this.ci = 0; this.beat = 0; this._last = {}; this._eK = -1; }
  unlock() {
    if (this.ctx) { if (this.ctx.state === 'suspended' && this.on) this.ctx.resume(); return; } // サウンド OFF の間は止めたままにする
    const AC = window.AudioContext || window.webkitAudioContext; if (!AC) return;
    const c = (this.ctx = new AC());
    this.master = c.createGain(); this.master.gain.value = this.on ? 0.85 : 0;
    const comp = c.createDynamicsCompressor(); comp.threshold.value = -14; comp.ratio.value = 5; this.master.connect(comp); comp.connect(c.destination);
    const n = (this.noise = c.createBuffer(1, c.sampleRate * 2, c.sampleRate)), d = n.getChannelData(0); for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
    // リバーブ (簡易: フィードバックディレイ網)
    this.rev = c.createGain(); this.rev.gain.value = 0.5; const mix = c.createGain(); mix.gain.value = 0.34; mix.connect(this.master);
    for (const [t, fb] of [[0.29, 0.52], [0.37, 0.48], [0.53, 0.42]]) { const dl = c.createDelay(1); dl.delayTime.value = t; const g = c.createGain(); g.gain.value = fb; const f = c.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = 2600; this.rev.connect(dl); dl.connect(f); f.connect(g); g.connect(dl); f.connect(mix); }
    // エンジン
    const en = (this.eng = { g: c.createGain(), f: c.createBiquadFilter(), o: c.createOscillator(), o2: c.createOscillator(), n: c.createBufferSource(), ng: c.createGain(), og: c.createGain() });
    en.g.gain.value = 0; en.f.type = 'lowpass'; en.f.frequency.value = 200; en.o.type = 'sawtooth'; en.o.frequency.value = 48; en.o2.type = 'triangle'; en.o2.frequency.value = 72; en.n.buffer = n; en.n.loop = true; en.ng.gain.value = 0.5; en.og.gain.value = 0.35;
    en.o.connect(en.og); en.o2.connect(en.og); en.og.connect(en.f); en.n.connect(en.ng); en.ng.connect(en.f); en.f.connect(en.g); en.g.connect(this.master); en.o.start(); en.o2.start(); en.n.start();
    // 音楽パッド
    this.pad = { g: c.createGain(), f: c.createBiquadFilter(), v: [] }; this.pad.g.gain.value = 0; this.pad.f.type = 'lowpass'; this.pad.f.frequency.value = 900; this.pad.f.Q.value = 0.7;
    this.pad.f.connect(this.pad.g); this.pad.g.connect(this.master); this.pad.g.connect(this.rev);
    for (let i = 0; i < 4; i++) { const v = { o: c.createOscillator(), o2: c.createOscillator(), g: c.createGain() }; v.o.type = 'sawtooth'; v.o2.type = 'sawtooth'; v.o2.detune.value = 9 + i * 2; v.o.detune.value = -7; v.g.gain.value = 0.055; v.o.connect(v.g); v.o2.connect(v.g); v.g.connect(this.pad.f); v.o.start(); v.o2.start(); this.pad.v.push(v); }
    this.pad.g.gain.linearRampToValueAtTime(0.5, c.currentTime + 4); this._chord();
    if (!this.on) c.suspend();
  }
  /** サウンド ON/OFF。OFF の間は音声処理そのものを止める (音量 0 のまま発振器を回し続けると CPU と電池を使うため) */
  setOn(b) {
    this.on = b; const c = this.ctx; if (!c) return; clearTimeout(this._sus);
    if (b) { if (c.state === 'suspended' && !document.hidden) c.resume(); this.master.gain.setTargetAtTime(0.85, c.currentTime, 0.1); }
    else { this.master.gain.setTargetAtTime(0, c.currentTime, 0.05); this._sus = setTimeout(() => { if (!this.on) c.suspend(); }, 400); }
  }
  music(kind) { if (this.kind === kind) return; this.kind = kind; G.music = kind; this.ci = 0; if (this.ctx) this._chord(); }
  _chord() {
    const s = SCALES[this.kind] || SCALES.space, ch = s.chords[this.ci % s.chords.length], t = this.ctx.currentTime;
    this.pad.v.forEach((v, i) => { const f = hz(s.root, ch[i]); v.o.frequency.setTargetAtTime(f, t, 1.2); v.o2.frequency.setTargetAtTime(f, t, 1.2); });
    this.pad.f.frequency.setTargetAtTime(this.kind === 'battle' ? 1700 : this.kind === 'hostile' ? 600 : 950, t, 2);
  }
  update(dt) {
    if (!this.ctx || !this.on) return; const s = SCALES[this.kind] || SCALES.space;
    this.t += dt; if (this.t > (s.pulse ? 6.4 : 10)) { this.t = 0; this.ci++; this._chord(); }
    if (Math.random() < dt * (s.pulse ? 0.7 : 0.32)) this._tone(hz(s.root * 2, s.bell[Math.floor(Math.random() * s.bell.length)]), 2.4, 0.05, 'sine', 0, true);
    if (s.pulse) { this.beat += dt; const step = this.kind === 'battle' ? 0.2 : 0.4; if (this.beat > step) { this.beat -= step; const ch = s.chords[this.ci % s.chords.length]; this._tone(hz(s.root / 2, ch[0]), 0.16, 0.13 * s.pulse, 'sawtooth', 0, false, 500); } }
  }
  engine(thr, boost, sc) {
    if (!this.ctx) return; const k = thr + boost * 0.6 + sc * 0.8, off = thr <= 0 && !sc;
    if (off === this._eOff && Math.abs(k - this._eK) < 0.01) return; this._eOff = off; this._eK = k; // 変化したときだけ予約する (毎フレーム 4 本ずつ自動化イベントを積まない)
    const t = this.ctx.currentTime, e = this.eng;
    e.g.gain.setTargetAtTime(off ? 0 : 0.05 + k * 0.1, t, 0.15); e.f.frequency.setTargetAtTime(140 + k * 520, t, 0.2); e.o.frequency.setTargetAtTime(40 + k * 34, t, 0.2); e.o2.frequency.setTargetAtTime(60 + k * 52, t, 0.2);
  }
  _tone(f, dur, vol, type = 'sine', f2 = 0, rev = false, lp = 0) {
    const c = this.ctx, t = c.currentTime, o = c.createOscillator(), g = c.createGain(); o.type = type; o.frequency.setValueAtTime(f, t);
    if (f2) o.frequency.exponentialRampToValueAtTime(Math.max(20, f2), t + dur);
    g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(vol, t + 0.008); g.gain.exponentialRampToValueAtTime(0.0008, t + dur);
    let out = g; if (lp) { const fl = c.createBiquadFilter(); fl.type = 'lowpass'; fl.frequency.value = lp; g.connect(fl); out = fl; }
    o.connect(g); out.connect(this.master); if (rev) out.connect(this.rev); o.start(t); o.stop(t + dur + 0.05);
  }
  _noise(dur, vol, f1, f2, type = 'lowpass', q = 1, rev = false) {
    const c = this.ctx, t = c.currentTime, s = c.createBufferSource(), fl = c.createBiquadFilter(), g = c.createGain(); s.buffer = this.noise; s.loop = true; fl.type = type; fl.Q.value = q;
    fl.frequency.setValueAtTime(f1, t); fl.frequency.exponentialRampToValueAtTime(Math.max(30, f2), t + dur);
    g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(vol, t + 0.01); g.gain.exponentialRampToValueAtTime(0.0008, t + dur);
    s.connect(fl); fl.connect(g); g.connect(this.master); if (rev) g.connect(this.rev); s.start(t, Math.random()); s.stop(t + dur + 0.05);
  }
  ui() { this.sfx('ui'); }
  sfx(name, v = 1) {
    if (!this.ctx || !this.on) return; v = clamp(v, 0, 1);
    // 同じ効果音が 30ms 以内に重なったら鳴らさない (被弾や敵の一斉射撃で音が割れたり、発音ノードが一度に何十も作られたりしないように)
    const now = this.ctx.currentTime; if (now - (this._last[name] ?? -1) < 0.03) return; this._last[name] = now; const T = (...a) => this._tone(...a), N = (...a) => this._noise(...a), later = (ms, f) => setTimeout(() => { if (this.ctx) f(); }, ms);
    switch (name) {
      case 'laser': T(1700, 0.13, 0.11, 'sawtooth', 260, false, 3200); break;
      case 'elaser': T(820, 0.18, 0.09 * v, 'square', 150, false, 1800); break;
      case 'blaster': T(2300, 0.09, 0.1, 'square', 500, false, 3500); break;
      case 'missile': N(0.9, 0.25, 500, 3000, 'bandpass', 2); T(160, 0.5, 0.12, 'sawtooth', 60); break;
      case 'boom': N(1.5, 0.75 * v, 1500, 50, 'lowpass', 1, true); T(90, 0.9, 0.5 * v, 'sine', 28); break;
      case 'hit': N(0.22, 0.4, 2400, 200); T(170, 0.18, 0.3, 'triangle', 60); break;
      case 'shield': T(520, 0.3, 0.14, 'sine', 980, true); N(0.2, 0.1, 5000, 1500, 'bandpass', 3); break;
      case 'dock': T(70, 0.35, 0.5, 'sine', 38); N(0.9, 0.2, 6000, 600, 'highpass'); later(280, () => T(58, 0.4, 0.5, 'sine', 32)); break;
      case 'undock': N(0.8, 0.22, 800, 7000, 'highpass'); T(64, 0.3, 0.4, 'sine', 36); break;
      case 'warp': T(60, 1.6, 0.3, 'sawtooth', 900, true, 1400); N(1.6, 0.3, 200, 6000, 'bandpass', 1.5, true); break;
      case 'charge': T(180, 1.6, 0.12, 'sine', 1300, true); break;
      case 'drop': T(900, 0.8, 0.25, 'sawtooth', 50, true, 1500); N(0.7, 0.3, 4000, 100, 'lowpass', 1, true); break;
      case 'ui': T(1250, 0.07, 0.07, 'sine', 1700); break;
      case 'nav': T(880, 0.1, 0.09, 'sine'); later(110, () => T(1320, 0.14, 0.09, 'sine')); break;
      case 'lock': T(1500, 0.06, 0.08, 'square', 0, false, 3000); later(80, () => T(1500, 0.06, 0.08, 'square', 0, false, 3000)); break;
      case 'warn': T(620, 0.16, 0.13, 'square', 0, false, 2200); later(200, () => T(440, 0.2, 0.13, 'square', 0, false, 2200)); break;
      case 'comm': T(1400, 0.05, 0.05, 'sine'); later(70, () => T(1900, 0.07, 0.05, 'sine')); break;
      case 'reward': [0, 4, 7, 12, 16].forEach((s, i) => later(i * 90, () => T(hz(523, s), 0.5, 0.1, 'triangle', 0, true))); break;
      case 'door': N(0.45, 0.2, 500, 5000, 'bandpass', 2); T(110, 0.3, 0.1, 'triangle', 70); break;
      case 'step': N(0.07, 0.07, 500, 120); break;
      case 'entry': N(3.2, 0.5, 300, 2200, 'lowpass', 1, true); T(48, 3, 0.3, 'sawtooth', 90, false, 300); break;
      case 'disable': [12, 7, 3, 0].forEach((s, i) => later(i * 110, () => T(hz(330, s), 0.3, 0.1, 'square', 0, true, 2000))); T(400, 1.2, 0.15, 'sawtooth', 40, true, 900); break;
      case 'pickup': T(700, 0.1, 0.1, 'triangle'); later(90, () => T(1050, 0.2, 0.1, 'triangle', 0, true)); break;
      case 'buy': T(990, 0.08, 0.09, 'triangle'); later(70, () => T(1480, 0.16, 0.09, 'triangle')); break;
      case 'deny': T(200, 0.22, 0.14, 'square', 140, false, 900); break;
      case 'slot': T(900 + Math.random() * 500, 0.04, 0.06, 'square', 0, false, 2500); break;
      case 'land': N(1.2, 0.3, 1200, 150, 'lowpass'); T(60, 0.5, 0.5, 'sine', 30); break;
      case 'hurt': N(0.18, 0.3, 1800, 300); T(140, 0.2, 0.25, 'sawtooth', 70, false, 700); break;
      default: break;
    }
  }
}
