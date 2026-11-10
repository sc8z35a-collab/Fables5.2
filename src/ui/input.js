// 入力: マルチタッチ仮想スティック + ボタン、キーボード/マウス (PC でも遊べる)
import { G, clamp, el } from '../core/util.js';

export class Input {
  constructor(app) {
    this.steer = { x: 0, y: 0 }; // 左スティック
    this.look = { x: 0, y: 0 };  // 右ドラッグの移動量 (フレーム毎にリセット)
    this.thr = 0.5; this.roll = 0; this.vert = 0;
    this.btn = {}; this.keys = {}; this.tapped = {};
    this.mode = 'none';
    this.touchUI = el('div', 'touch', '', app);
    this.stickBase = el('div', 'stick-base', '<div class="stick-knob"></div>', this.touchUI);
    this.knob = this.stickBase.firstChild; this.stickBase.style.display = 'none';
    this.zoneL = el('div', 'zone zone-l', '', this.touchUI);
    this.zoneR = el('div', 'zone zone-r', '', this.touchUI);
    this.buttons = el('div', 'btns', '', this.touchUI);
    this.thrEl = el('div', 'thr', '<div class="thr-fill"></div><div class="thr-knob"></div><span>推力</span>', this.touchUI);
    this.sid = null; this.lid = null; this.tid = null; this.s0 = [0, 0]; this.l0 = [0, 0];
    const P = (e) => G.toLocal(e.clientX, e.clientY);
    const opt = { passive: false };
    this.zoneL.addEventListener('pointerdown', (e) => {
      e.preventDefault(); if (this.sid != null) return; this.sid = e.pointerId; this.s0 = P(e);
      this.stickBase.style.display = 'block'; this.stickBase.style.left = this.s0[0] + 'px'; this.stickBase.style.top = this.s0[1] + 'px'; this.knob.style.transform = '';
    }, opt);
    this.zoneR.addEventListener('pointerdown', (e) => { e.preventDefault(); if (this.lid != null) return; this.lid = e.pointerId; this.l0 = P(e); }, opt);
    this.thrEl.addEventListener('pointerdown', (e) => { e.preventDefault(); e.stopPropagation(); this.tid = e.pointerId; this._thr(e); }, opt);
    window.addEventListener('pointermove', (e) => {
      if (e.pointerId === this.sid) {
        const p = P(e), R = G.H * 0.13; let dx = (p[0] - this.s0[0]) / R, dy = (p[1] - this.s0[1]) / R; const l = Math.hypot(dx, dy); if (l > 1) { dx /= l; dy /= l; }
        this.steer.x = dx; this.steer.y = -dy; this.knob.style.transform = `translate(${dx * R}px,${dy * R}px)`;
      } else if (e.pointerId === this.lid) { const p = P(e); this.look.x += p[0] - this.l0[0]; this.look.y += p[1] - this.l0[1]; this.l0 = p; }
      else if (e.pointerId === this.tid) this._thr(e);
      else if (this.mouseLook && e.pointerType === 'mouse' && document.pointerLockElement) { this.look.x += e.movementX; this.look.y += e.movementY; }
    }, opt);
    const up = (e) => {
      if (e.pointerId === this.sid) { this.sid = null; this.steer.x = this.steer.y = 0; this.stickBase.style.display = 'none'; }
      if (e.pointerId === this.lid) this.lid = null;
      if (e.pointerId === this.tid) this.tid = null;
    };
    window.addEventListener('pointerup', up); window.addEventListener('pointercancel', up);
    window.addEventListener('keydown', (e) => { if (e.repeat) return; this.keys[e.code] = true; this.tapped[e.code] = true; if (['Space', 'ArrowUp', 'ArrowDown', 'Tab'].includes(e.code)) e.preventDefault(); });
    window.addEventListener('keyup', (e) => { this.keys[e.code] = false; });
    window.addEventListener('blur', () => { this.keys = {}; });
    document.addEventListener('contextmenu', (e) => e.preventDefault());
    this.defs = {};
  }
  _thr(e) { const r = this.thrEl.getBoundingClientRect(); let t; if (G.portrait) t = (e.clientX - r.left) / r.width; else t = 1 - (e.clientY - r.top) / r.height; this.setThr(clamp(t * 1.1 - 0.05, 0, 1)); }
  setThr(t) { this.thr = t; this.thrEl.firstChild.style.height = t * 100 + '%'; this.thrEl.children[1].style.bottom = t * 100 + '%'; }
  /** ボタン群を定義し直す。list: [{id,label,cls,hold,key}] */
  setButtons(list, mode) {
    if (this.mode === mode) return; this.mode = mode;
    this.buttons.innerHTML = ''; this.btn = {}; this.defs = {};
    for (const d of list) {
      const b = el('button', 'tb ' + (d.cls || ''), d.label, this.buttons); b.dataset.id = d.id; this.defs[d.id] = d; d.el = b;
      const down = (e) => { e.preventDefault(); e.stopPropagation(); b.classList.add('on'); this.btn[d.id] = true; this.tapped[d.id] = true; G.audio?.unlock(); };
      const upf = (e) => { e.preventDefault(); b.classList.remove('on'); this.btn[d.id] = false; };
      b.addEventListener('pointerdown', down, { passive: false }); b.addEventListener('pointerup', upf); b.addEventListener('pointerleave', upf); b.addEventListener('pointercancel', upf);
    }
    this.thrEl.style.display = mode === 'flight' || mode === 'atmo' ? '' : 'none';
    this.touchUI.style.display = mode === 'none' ? 'none' : '';
    this.steer.x = this.steer.y = 0; this.sid = this.lid = null; this.stickBase.style.display = 'none';
  }
  show(id, on) { const d = this.defs[id]; if (d && d.shown !== on) { d.shown = on; d.el.style.display = on ? '' : 'none'; } }
  active(id, on) { const d = this.defs[id]; if (d && d.act !== on) { d.act = on; d.el.classList.toggle('active', !!on); } }
  down(id) { const d = this.defs[id]; return !!this.btn[id] || (d && d.key && d.key.split(',').some((k) => this.keys[k])); }
  /** 押した瞬間だけ true */
  hit(id) { const d = this.defs[id]; if (this.tapped[id]) return true; return !!(d && d.key && d.key.split(',').some((k) => this.tapped[k])); }
  key(code) { return !!this.tapped[code]; }
  /** キーボードからスティック値を合成 */
  axes() {
    const k = this.keys; let x = this.steer.x, y = this.steer.y;
    if (k.KeyA || k.ArrowLeft) x -= 1; if (k.KeyD || k.ArrowRight) x += 1; if (k.KeyW || k.ArrowUp) y += 1; if (k.KeyS || k.ArrowDown) y -= 1;
    return { x: clamp(x, -1, 1), y: clamp(y, -1, 1) };
  }
  endFrame() { this.tapped = {}; this.look.x = this.look.y = 0; }
}
