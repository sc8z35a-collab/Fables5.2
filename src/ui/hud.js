// HUD: DOM ゲージ + 2D キャンバス (照準・マーカー・レーダー)
import * as THREE from 'three';
import { G, el, clamp, fmtCr } from '../core/util.js';

const _v = new THREE.Vector3();
export class Hud {
  constructor(app) {
    const r = (this.root = el('div', '', '', app)); r.id = 'hud';
    this.cv = el('canvas', 'ov', '', r); this.x = this.cv.getContext('2d');
    this.cockpit = el('div', 'cockpit', '', r);
    this.vign = el('div', 'vign', '', r);
    const tl = el('div', 'tl', '', r); this.loc = el('div', 'loc', '', tl); this.obj = el('div', 'obj', '', tl);
    this.sys = el('div', 'sys', '', r); this.cr = el('div', 'cr', '', this.sys);
    this.bMap = el('button', 'sb', '星図', this.sys); this.bMenu = el('button', 'sb', 'MENU', this.sys);
    this.bars = el('div', 'bars', '', r);
    this.b = {};
    for (const [k, n] of [['sh', 'SHIELD'], ['hull', 'HULL'], ['en', 'ENERGY']]) { const d = el('div', 'bar ' + k, `<span>${n}</span><i><b></b></i>`, this.bars); this.b[k] = { d, f: d.querySelector('b'), v: -1 }; }
    this.speed = el('div', 'speed', '<b></b><small></small>', r);
    this.tgt = el('div', 'tgt', '<div class="n"></div><div class="b"><b></b></div><div class="b h"><b></b></div>', r);
    this.msgs = el('div', 'msgs', '', r);
    this.bannerEl = el('div', 'banner', '<h1></h1><p></p>', r);
    this.cross = el('div', 'cross', '', r); this.prompt = el('div', 'prompt', '', r);
    this.ctx = el('div', 'ctx', '', r); this.ctxKey = '';
    this.bMap.onclick = () => { G.audio?.ui(); G.ui.map(); }; this.bMenu.onclick = () => { G.audio?.ui(); G.ui.pause(); };
    this._cr = -1; this._loc = ''; this._obj = ''; this._sp = ''; this._bt = 0;
    this.resize();
  }
  resize() {
    const s = Math.min(window.devicePixelRatio || 1, 2); this.s = s;
    this.cv.width = Math.round(G.W * s); this.cv.height = Math.round(G.H * s); this.u = G.H / 100;
  }
  show(on) { this.root.classList.toggle('hide', !on); }
  setMode(m) {
    this.mode = m; const f = m === 'space' || m === 'atmo'; this.root.classList.toggle('title', m === 'title');
    this.bars.style.display = m === 'title' ? 'none' : ''; this.speed.style.display = f ? '' : 'none';
    this.cross.style.display = m === 'fps' ? 'block' : 'none'; if (m !== 'fps') { this.prompt.style.display = 'none'; this._pr = null; }
    // 非表示にしたら記憶も消す (同じ名前の目標を再び選んだときに表示されなくなるのを防ぐ)
    this.tgt.style.display = 'none'; this._tg = null; this.cockpit.style.display = 'none';
    this.b.en.d.style.display = f ? '' : 'none';
    this.b.sh.d.firstChild.textContent = f ? 'SHIELD' : 'SUIT'; this.b.hull.d.firstChild.textContent = f ? 'HULL' : 'HEALTH';
  }
  setLoc(name, sub = '') { const k = name + sub; if (k !== this._loc) { this._loc = k; this.loc.innerHTML = `${name}<small>${sub}</small>`; } }
  setObj(html) { if (html !== this._obj) { this._obj = html; this.obj.innerHTML = html; } }
  bar(k, v) { const b = this.b[k]; v = clamp(v, 0, 1); if (Math.abs(v - b.v) < 0.004) return; b.v = v; b.f.style.width = v * 100 + '%'; b.d.classList.toggle('low', v < 0.25); }
  setSpeed(main, sub) { const k = main + sub; if (k !== this._sp) { this._sp = k; this.speed.firstChild.textContent = main; this.speed.lastChild.textContent = sub; } }
  setTarget(t) {
    if (!t) { if (this._tg) { this.tgt.style.display = 'none'; this._tg = null; } return; }
    if (this._tg !== t.name) { this._tg = t.name; this.tgt.style.display = 'block'; this.tgt.firstChild.textContent = t.name; }
    this.tgt.children[1].firstChild.style.width = clamp(t.shield, 0, 1) * 100 + '%'; this.tgt.children[2].firstChild.style.width = clamp(t.hull, 0, 1) * 100 + '%';
  }
  msg(text, cls = '', ttl = 5) {
    const d = el('div', cls, text, this.msgs); while (this.msgs.children.length > 5) this.msgs.firstChild.remove();
    setTimeout(() => { d.style.opacity = 0; setTimeout(() => d.remove(), 700); }, ttl * 1000);
    if (cls === 'warn') G.audio?.sfx('warn'); else if (cls === 'comm') G.audio?.sfx('comm');
  }
  banner(title, sub = '', ttl = 3.2) {
    this.bannerEl.firstChild.textContent = title; this.bannerEl.lastChild.textContent = sub; this.bannerEl.classList.add('on');
    clearTimeout(this._bn); this._bn = setTimeout(() => this.bannerEl.classList.remove('on'), ttl * 1000);
  }
  /** 状況依存ボタン。list: [{label, fn, cls}] */
  setCtx(list) {
    const key = list.map((c) => c.label + (c.cls || '')).join('|'); this.ctxList = list;
    if (key === this.ctxKey) return; this.ctxKey = key; this.ctx.innerHTML = '';
    list.forEach((c, i) => { const b = el('button', 'cb ' + (c.cls || ''), c.label, this.ctx); b.addEventListener('pointerdown', (e) => { e.preventDefault(); e.stopPropagation(); G.audio?.unlock(); G.audio?.ui(); this.ctxList[i]?.fn(); }, { passive: false }); });
  }
  setPrompt(text) { if (text !== this._pr) { this._pr = text; this.prompt.style.display = text ? 'block' : 'none'; this.prompt.textContent = text || ''; } }
  damage(k) { this.vign.style.opacity = clamp(k, 0, 1); }
  // ── キャンバス描画 ──
  begin() { this.lbl = []; const x = this.x; x.setTransform(this.s, 0, 0, this.s, 0, 0); x.clearRect(0, 0, G.W, G.H); x.lineWidth = 1.5; x.textAlign = 'center'; x.textBaseline = 'middle'; this.font(2.2); }
  font(k, bold) { this.x.font = `${bold ? '700 ' : ''}${this.u * k}px "Hiragino Kaku Gothic ProN","Noto Sans JP",sans-serif`; }
  /** ワールド座標 → 画面座標。戻り値 [x, y, 前方か] */
  project(p, cam) {
    _v.copy(p).applyMatrix4(cam.matrixWorldInverse); const front = _v.z < 0; _v.applyMatrix4(cam.projectionMatrix);
    return [(_v.x * 0.5 + 0.5) * G.W, (-_v.y * 0.5 + 0.5) * G.H, front];
  }
  /** 画面外なら縁に寄せて矢印を出す。戻り値 [x,y,onScreen] */
  edge(px, py, front) {
    // 画面端の矢印は HUD (左上の地名・右上のボタン・右端の推力・左下のゲージ) と重ならない枠の内側に置く
    const u = this.u, L = u * 7, R = G.W - u * (this.mode === 'fps' ? 9 : 17), T = u * 13, Bm = G.H - u * 25, cx = G.W / 2, cy = G.H / 2; let dx = px - cx, dy = py - cy;
    if (!front) { dx = -dx; dy = -dy; }
    const on = front && px > u * 4 && px < G.W - u * 4 && py > u * 4 && py < G.H - u * 4;
    if (on) return [px, py, true];
    const k = Math.min(dx > 0 ? (R - cx) / dx : dx < 0 ? (L - cx) / dx : 1e9, dy > 0 ? (Bm - cy) / dy : dy < 0 ? (T - cy) / dy : 1e9);
    return [cx + dx * k, cy + dy * k, false, Math.atan2(dy, dx)];
  }
  marker(px, py, front, color, label, sub, shape = 'diamond', size = 1.6) {
    const x = this.x, u = this.u, [mx, my, on, ang] = this.edge(px, py, front), s = u * size;
    x.strokeStyle = x.fillStyle = color; x.globalAlpha = 0.95;
    if (!on) { const s = Math.min(this.u * 1.6 * size, this.u * 2.6); x.save(); x.translate(mx, my); x.rotate(ang); x.beginPath(); x.moveTo(s * 1.4, 0); x.lineTo(-s * 0.6, s * 0.9); x.lineTo(-s * 0.6, -s * 0.9); x.closePath(); x.fill(); x.restore(); }
    else if (shape === 'diamond') { x.beginPath(); x.moveTo(mx, my - s); x.lineTo(mx + s, my); x.lineTo(mx, my + s); x.lineTo(mx - s, my); x.closePath(); x.stroke(); }
    else if (shape === 'bracket') { const q = s * 0.45; x.beginPath(); for (const [sx, sy] of [[-1, -1], [1, -1], [1, 1], [-1, 1]]) { x.moveTo(mx + sx * s, my + sy * (s - q)); x.lineTo(mx + sx * s, my + sy * s); x.lineTo(mx + sx * (s - q), my + sy * s); } x.stroke(); }
    else if (shape === 'circle') { x.beginPath(); x.arc(mx, my, s, 0, 7); x.stroke(); }
    if (label) {
      this.font(2.1, true); const up = !on && my > G.H / 2, lh = u * (sub ? 5 : 2.6), w = Math.max(x.measureText(label).width, sub ? x.measureText(sub).width : 0) + u, lx = clamp(mx, w / 2 + u * 1.5, G.W - w / 2 - u * 1.5);
      let ty = on ? my + s + u * 2 : my + u * 3 * (up ? -1 : 1);
      // 既に描いたラベルと重なる場合は、重ならなくなるまで上下にずらす
      for (let i = 0; i < 8; i++) { const hit = this.lbl.find((b) => Math.abs(b[0] - lx) < (b[2] + w) / 2 && Math.abs(b[1] - ty) < lh * 0.5 + b[3] * 0.5); if (!hit) break; ty = up ? hit[1] - (hit[3] + lh) * 0.5 - u * 0.4 : hit[1] + (hit[3] + lh) * 0.5 + u * 0.4; }
      this.lbl.push([lx, ty + (sub ? u * 1.25 : 0), w, lh]);
      x.shadowColor = '#000'; x.shadowBlur = 4; x.fillText(label, lx, ty);
      if (sub) { this.font(1.9); x.globalAlpha = 0.8; x.fillText(sub, lx, ty + u * 2.5); }
      x.shadowBlur = 0;
    }
    x.globalAlpha = 1;
  }
  reticle(px, py, color = '#6fe8ff', spread = 1) {
    const x = this.x, u = this.u, r = u * 2.2 * spread; x.strokeStyle = color; x.globalAlpha = 0.9; x.lineWidth = 1.5;
    x.beginPath(); x.arc(px, py, r, 0, 7); x.stroke();
    x.beginPath(); for (let i = 0; i < 4; i++) { const a = i * Math.PI / 2; x.moveTo(px + Math.cos(a) * r * 1.3, py + Math.sin(a) * r * 1.3); x.lineTo(px + Math.cos(a) * r * 1.9, py + Math.sin(a) * r * 1.9); } x.stroke();
    x.fillStyle = color; x.beginPath(); x.arc(px, py, 1.6, 0, 7); x.fill(); x.globalAlpha = 1;
  }
  lead(px, py, locked) { const x = this.x, u = this.u; x.strokeStyle = locked ? '#ff5a4a' : '#ffd27a'; x.lineWidth = 2; x.beginPath(); x.arc(px, py, u * 1.5, 0, 7); x.moveTo(px - u * 2.3, py); x.lineTo(px + u * 2.3, py); x.moveTo(px, py - u * 2.3); x.lineTo(px, py + u * 2.3); x.stroke(); x.lineWidth = 1.5; }
  /** レーダー。contacts: [{x,y,z (自機ローカル, m), color}] */
  radar(contacts, range = 12000) {
    const x = this.x, u = this.u, cx = G.W / 2, cy = G.H - u * 14, R = u * 9.5;
    x.globalAlpha = 0.85; x.fillStyle = 'rgba(4,14,24,.55)'; x.strokeStyle = 'rgba(111,232,255,.7)';
    x.beginPath(); x.ellipse(cx, cy, R, R * 0.62, 0, 0, 7); x.fill(); x.stroke();
    x.globalAlpha = 0.35; x.beginPath(); x.ellipse(cx, cy, R * 0.5, R * 0.31, 0, 0, 7); x.moveTo(cx - R, cy); x.lineTo(cx + R, cy); x.moveTo(cx, cy - R * 0.62); x.lineTo(cx, cy + R * 0.62); x.stroke();
    x.globalAlpha = 1;
    for (const c of contacts) {
      const d = Math.hypot(c.x, c.y, c.z); if (d > range * 4) continue;
      const k = Math.min(1, Math.log10(1 + d / range * 9)) / (d || 1), px = cx + c.x * k * R, py = cy + c.z * k * R * 0.62, top = py - c.y * k * R * 0.5;
      x.strokeStyle = x.fillStyle = c.color; x.globalAlpha = 0.6; x.beginPath(); x.moveTo(px, py); x.lineTo(px, top); x.stroke(); x.globalAlpha = 1;
      x.fillRect(px - u * 0.45, top - u * 0.45, u * 0.9, u * 0.9);
    }
    x.fillStyle = '#fff'; x.beginPath(); x.moveTo(cx, cy - u * 0.9); x.lineTo(cx + u * 0.6, cy + u * 0.6); x.lineTo(cx - u * 0.6, cy + u * 0.6); x.fill();
  }
  text(str, px, py, color = '#6fe8ff', k = 2.4, bold) { const x = this.x; this.font(k, bold); x.fillStyle = color; x.shadowColor = '#000'; x.shadowBlur = 5; x.fillText(str, px, py); x.shadowBlur = 0; }
  /** ドッキング誘導 (進入路の輪) */
  ring(px, py, r, color, a = 1) { const x = this.x; x.strokeStyle = color; x.globalAlpha = a; x.lineWidth = 2; x.beginPath(); x.arc(px, py, Math.max(r, 2), 0, 7); x.stroke(); x.globalAlpha = 1; x.lineWidth = 1.5; }
  update(dt) {
    const c = Math.round(G.p?.credits ?? 0);
    if (c !== this._cr) { this._cr = c; this.cr.textContent = fmtCr(c); }
  }
}
