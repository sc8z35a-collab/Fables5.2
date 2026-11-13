// 追加ステーション用の小道具 (4): メガトンの街と駅・ラウンジの調度、ウェポンの兵器まわり、各拠点の掲示物
import * as THREE from 'three';
import { Builder, mx } from '../gfx/builder.js';
import { mat, glow, screenMat, cv, ctex, JP } from '../gfx/textures.js';
import { makeGlowSprite } from '../gfx/fx.js';
import { holoMat, glassMat } from './interior.js';
import { MM, fab, crateM, flat, scr, bush } from './props.js';
import { basic, W2 } from './props2.js';

const HP = Math.PI / 2, TAU = Math.PI * 2;
let _B;
const BM = () => _B || (_B = { br: mat('flat', { color: 0xc8a04a, rough: 0.3, metal: 1 }), cu: mat('flat', { color: 0xc8743a, rough: 0.32, metal: 1 }), rl: mat('flat', { color: 0x8a929e, rough: 0.3, metal: 1 }), gm: mat('flat', { color: 0x4a505a, rough: 0.5, metal: 0.65 }), yl: mat('flat', { color: 0xf2b90a, rough: 0.55, metal: 0.3 }),
  rd: mat('flat', { color: 0xc8201e, rough: 0.45, metal: 0.3 }), gn: mat('marble', { color: 0x2c5a4e, rough: 0.2, metal: 0.05 }), iv: mat('flat', { color: 0xf0e8d4, rough: 0.35, metal: 0.15 }), st: mat('marble', { color: 0xe8e0cc, rough: 0.3, metal: 0.05 }), al: mat('flat', { color: 0xfff0d0, rough: 0.5, metal: 0, emissive: '#ffd9a0', ei: 1.5 }) });
/** 絵や貼り紙などの印刷物 (発光しない)。fn(ctx, w, h) で描く */
const PR = new Map();
function printed(key, w, h, fn) { let m = PR.get(key); if (m) return m; const c = cv(w, h), x = c.getContext('2d'); fn(x, w, h); m = new THREE.MeshStandardMaterial({ map: ctex(c, true, false), roughness: 0.7, metalness: 0.05 }); m.userData.uvs = 0; PR.set(key, m); return m; }
const txt = (x, s, px, py, size, col = '#16181c', al = 'center', wgt = 900) => { x.font = `${wgt} ${size}px ${JP}`; x.fillStyle = col; x.textAlign = al; x.textBaseline = 'middle'; x.fillText(s, px, py); };

export const PROPS5 = {
  // ───────────────────────── メガトン: 調度と街の小物 ─────────────────────────
  /** アールデコの大型吊り灯 (段々に重なる真鍮の環と乳白の灯り) */
  decolamp(P, o, e) {
    const m = MM(), B = BM(), h = e.room.h, y = o.y || Math.max(3.2, h - 2.6), s = o.s || 1, c = o.c || '#ffe2b0';
    P.cyl(B.br, 0.02 * s, 0.02 * s, h - y - 0.9 * s, 0, (h + y + 0.9 * s) / 2, 0, 'y', 6); P.cyl(B.br, 0.2 * s, 0.1 * s, 0.14, 0, h - 0.07, 0, 'y', 12);
    for (const [r, hh, dy] of [[0.95, 0.34, 0.62], [0.7, 0.3, 0.32], [0.45, 0.28, 0.04]]) { P.add(B.al, new THREE.CylinderGeometry(r * s, r * s, hh * s, 12, 1, true), mx(0, y + dy * s, 0), 0); P.tor(B.br, r * s + 0.01, 0.028 * s, 0, y + (dy + hh / 2) * s, 0, HP, 0, 0, 12, 6); P.tor(B.br, r * s + 0.01, 0.028 * s, 0, y + (dy - hh / 2) * s, 0, HP, 0, 0, 12, 6);
      for (let i = 0; i < 12; i++) { const a = i * TAU / 12; P.box(B.br, 0.022 * s, hh * s, 0.022 * s, Math.cos(a) * r * s, y + dy * s, Math.sin(a) * r * s); } P.add(B.al, new THREE.CircleGeometry(r * s, 12).rotateX(HP), mx(0, y + (dy - hh / 2) * s + 0.004, 0), 0); }
    P.add(B.br, new THREE.ConeGeometry(0.16 * s, 0.4 * s, 8), mx(0, y - 0.3 * s, 0, Math.PI, 0, 0)); P.sph(glow(c, 3.4), 0.07 * s, 0, y - 0.54 * s, 0, 1, 1, 1, 8); for (let i = 0; i < 4; i++) { const a = i * HP + 0.785; P.add(B.br, new THREE.CylinderGeometry(0.008, 0.008, 0.62 * s, 4), mx(Math.cos(a) * 0.4 * s, y + 0.86 * s, Math.sin(a) * 0.4 * s, Math.sin(a) * 0.62, 0, -Math.cos(a) * 0.62)); }
    e.light(c, o.i || 26, Math.min(y, 4.4), o.d || 14);
  },
  /** メガトンの千分の一模型 (ガラスの覆いの中でリングが回る) */
  megamodel(P, o, e) {
    const m = MM(), B = BM(), y = 1.5;
    P.box(B.gn, 4.4, 1.0, 1.6, 0, 0.5, 0); P.box(B.br, 4.5, 0.06, 1.7, 0, 1.03, 0); P.box(B.br, 4.5, 0.06, 1.7, 0, 0.08, 0); P.box(m.bk, 4.2, 0.04, 1.4, 0, 1.08, 0); P.add(glassMat(), new THREE.BoxGeometry(4.2, 1.5, 1.4), mx(0, 1.85, 0), 0); for (const [sx, sz] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) P.box(B.br, 0.03, 1.5, 0.03, sx * 2.1, 1.85, sz * 0.7); P.box(B.br, 4.24, 0.03, 1.44, 0, 2.6, 0);
    // 居住筒・蓋・ドッキング塔・炉・放熱板・採光ミラー
    P.cyl(B.gm, 0.25, 0.25, 2.2, 0.15, y + 0.35, 0, 'x', 20); for (let i = 0; i < 3; i++) P.add(glow('#ffd9a0', 1.6), new THREE.BoxGeometry(2.1, 0.012, 0.16), mx(0.15, y + 0.35 + Math.sin(i * 2.094) * 0.251, Math.cos(i * 2.094) * 0.251, HP - i * 2.094, 0, 0)); P.cyl(B.rl, 0.11, 0.25, 0.13, 1.31, y + 0.35, 0, 'x', 20); P.cyl(B.rl, 0.25, 0.11, 0.13, -1.01, y + 0.35, 0, 'x', 20);
    P.cyl(B.rl, 0.06, 0.06, 0.34, 1.54, y + 0.35, 0, 'x', 12); P.cyl(m.dk, 0.06, 0.06, 0.2, -1.17, y + 0.35, 0, 'x', 10); P.sph(glow('#ff9a3a', 4), 0.17, -1.44, y + 0.35, 0, 1, 1, 1, 16); for (let k = 0; k < 3; k++) P.add(m.dk, new THREE.TorusGeometry(0.185, 0.009, 4, 20), mx(-1.44, y + 0.35, 0, 0, k * 1.047, 0));
    for (const [len, ang] of [[0.8, 0], [0.8, Math.PI], [0.52, HP], [0.52, -HP]]) P.add(glow('#ff5a1a', 1.5), new THREE.BoxGeometry(0.3, len, 0.006).translate(0, len / 2 + 0.09, 0).rotateX(ang), mx(-1.16, y + 0.35, 0), 0);
    for (let i = 0; i < 3; i++) { const a = i * 2.094; P.add(mat('flat', { color: 0xd6dfee, rough: 0.05, metal: 1, env: 2.4 }), new THREE.BoxGeometry(1.15, 0.005, 0.21), mx(0.38, y + 0.35 + Math.sin(a) * 0.53, Math.cos(a) * 0.53, HP - a, 0, 0).multiply(mx(0, 0, 0, 0, 0, -0.49))); }
    const rings = [1.09, -0.79].map((x) => { const g = new THREE.Group(), rb = new Builder(); rb.add(B.br, new THREE.TorusGeometry(0.64, 0.046, 8, 48).rotateY(HP), null, 0); rb.add(glow('#ffd9a0', 1.8), new THREE.TorusGeometry(0.688, 0.006, 4, 48).rotateY(HP), null, 0); for (let i = 0; i < 6; i++) rb.add(B.rl, new THREE.CylinderGeometry(0.014, 0.014, 0.38, 6), mx(0, Math.cos(i * 1.047) * 0.44, Math.sin(i * 1.047) * 0.44, i * 1.047, 0, 0)); g.add(rb.build({ shadow: false })); return e.dyn(g, x, y + 0.35, 0); });
    for (const x of [-0.8, 0.8]) P.cyl(B.br, 0.02, 0.03, 0.52, x, 1.34, 0, 'y', 8);
    P.add(printed('megaplate', 512, 96, (x, w, h) => { x.fillStyle = '#c8a04a'; x.fillRect(0, 0, w, h); x.strokeStyle = '#3a2a10'; x.lineWidth = 5; x.strokeRect(6, 6, w - 12, h - 12); txt(x, 'MEGATON  1 : 1000  ─ 全長 3,300 m / 人口 100 万', w / 2, h / 2, 24, '#2a1c08'); }), new THREE.PlaneGeometry(2.2, 0.4), mx(0, 0.6, 0.81), 0);
    e.anim((dt) => { rings[0].rotateX(dt * 0.5); rings[1].rotateX(-dt * 0.5); }); e.rect(4.5, 1.7); e.light('#ffd9a0', 12, 2.2, 7); if (o.use) e.use(o.label || 'メガトンの模型', o.use, 3.2);
  },
  /** 自動改札 (n 通路)。通れる向きに緑の矢印 */
  ticketgate(P, o, e) {
    const m = MM(), B = BM(), n = o.n || 3, pitch = 1.15;
    for (let i = 0; i <= n; i++) { const x = (i - n / 2) * pitch; P.box(B.iv, 0.26, 1.0, 1.5, x, 0.5, 0); P.box(B.br, 0.28, 0.04, 1.52, x, 1.02, 0); P.box(m.dk, 0.28, 0.1, 1.52, x, 0.05, 0); P.add(m.bk, new THREE.BoxGeometry(0.2, 0.02, 0.3), mx(x, 1.045, 0.5, 0.2, 0, 0)); P.box(glow('#6fe8ff', 2.2), 0.14, 0.012, 0.16, x, 1.06, 0.5); e.rect(0.3, 1.5, x, 0);
      if (i < n) { const ok = i !== n - 1, cx = x + pitch / 2;
        if (ok) for (const s of [-1, 1]) { P.add(glassMat(), new THREE.BoxGeometry(0.16, 0.7, 0.02), mx(cx + s * (pitch / 2 - 0.2), 0.65, 0), 0); P.box(glow('#5dff8a', 2.6), 0.03, 0.5, 0.025, cx + s * (pitch / 2 - 0.135), 0.65, 0.0); } // 開いた扉は両脇に収まる
        else { P.add(glassMat(), new THREE.BoxGeometry(pitch - 0.3, 0.7, 0.02), mx(cx, 0.65, 0), 0); P.box(B.br, pitch - 0.3, 0.03, 0.03, cx, 1.0, 0); P.box(glow('#ff5a4a', 2.6), 0.26, 0.06, 0.02, cx, 0.66, 0.012); e.rect(pitch - 0.3, 0.1, cx, 0); } } }
    P.box(m.dk, n * pitch + 0.4, 0.3, 0.3, 0, 2.7, 0); for (let i = 0; i < n; i++) { const x = (i - n / 2 + 0.5) * pitch, ok = i !== n - 1; P.box(m.bk, 0.6, 0.24, 0.04, x, 2.7, 0.16); P.box(glow(ok ? '#5dff8a' : '#ff5a4a', 2.4), ok ? 0.3 : 0.24, 0.06, 0.012, x, 2.7, 0.185); if (!ok) P.box(glow('#ff5a4a', 2.4), 0.06, 0.2, 0.012, x, 2.7, 0.186); } for (const s of [-1, 1]) P.box(m.dk, 0.08, 2.7, 0.08, s * (n * pitch / 2 + 0.16), 1.35, 0);
  },
  /** 売店 (新聞・雑誌・飲み物)。庇つき */
  newsstand(P, o, e) {
    const m = MM(), B = BM(), w = o.w || 2.6, cs = [0xb8452e, 0x2e7ab8, 0xc9a22e, 0x3aa86a, 0x8a4ab8, 0xe8e0cc, 0x30343c];
    P.box(B.gn, w, 1.0, 0.9, 0, 0.5, 0); P.box(B.br, w + 0.06, 0.05, 0.96, 0, 1.02, 0); P.box(B.iv, w, 1.4, 0.1, 0, 1.75, -0.4); for (const s of [-1, 1]) P.box(B.gn, 0.1, 2.5, 0.9, s * (w / 2 - 0.05), 1.25, 0); P.add(fab(o.c || 0x2c5a4e), new THREE.BoxGeometry(w + 0.5, 0.05, 1.4), mx(0, 2.56, 0.2, 0.2, 0, 0)); P.box(B.br, w + 0.5, 0.05, 0.05, 0, 2.43, 0.88);
    for (let j = 0; j < 3; j++) { P.add(m.dk, new THREE.BoxGeometry(w - 0.3, 0.02, 0.2), mx(0, 1.25 + j * 0.38, -0.3, 0.25, 0, 0)); for (let x = -w / 2 + 0.3; x < w / 2 - 0.25; x += 0.26) P.add(flat(cs[Math.floor(e.rnd() * cs.length)], 0.7, 0), new THREE.BoxGeometry(0.2, 0.28, 0.012), mx(x, 1.4 + j * 0.38, -0.29, -0.25, 0, 0)); }
    for (let x = -w / 2 + 0.3; x < w / 2 - 0.2; x += 0.2) { const hh = 0.14 + e.rnd() * 0.08; P.cyl(glow(['#f84', '#4cf', '#8f6', '#fd4'][Math.floor(e.rnd() * 4)], 0.9), 0.04, 0.045, hh, x, 1.05 + hh / 2, 0.25, 'y', 8); }
    P.box(m.bk, 0.5, 0.36, 0.3, w / 2 - 0.45, 1.23, -0.1); P.box(glow('#ffd27a', 1.6), 0.36, 0.12, 0.01, w / 2 - 0.45, 1.3, 0.055); for (const s of [-1, 0, 1]) P.sph(glow('#ffe2b0', 3), 0.06, s * (w / 2 - 0.4), 2.36, 0.7, 1, 1, 1, 8);
    e.rect(w, 0.95); e.light('#ffe2b0', 9, 2.0, 6); if (o.use) e.use(o.label || '売店', o.use, 2.4);
  },
  /** 壁の大型ホログラム広告 (走査線が流れる) */
  billboard(P, o, e) {
    const m = MM(), w = o.w || 5, h = o.h || 2.6, y = o.y || 4, c = o.c || '#ffd27a', lines = String(o.text || 'MEGATON').split('\n');
    const mt = printed('bb' + lines.join('|') + c + w + h, 512, Math.round(512 * h / w), (x, W, H) => { const g = x.createLinearGradient(0, 0, W, H); g.addColorStop(0, '#0c1612'); g.addColorStop(1, '#1a120a'); x.fillStyle = g; x.fillRect(0, 0, W, H);
      x.strokeStyle = c; x.globalAlpha = 0.35; for (let i = 0; i < 14; i++) { x.beginPath(); x.moveTo(W / 2, H * 1.2); x.lineTo(W / 2 + (i - 6.5) * W * 0.16, 0); x.stroke(); } x.globalAlpha = 1; x.lineWidth = 6; x.strokeRect(10, 10, W - 20, H - 20); x.lineWidth = 2; x.strokeRect(20, 20, W - 40, H - 40);
      lines.forEach((l, i) => { const fs = Math.min(H * 0.5 / lines.length, 84) * (i ? 0.62 : 1); x.font = `900 ${fs}px ${JP}`; x.textAlign = 'center'; x.textBaseline = 'middle'; x.shadowColor = c; x.shadowBlur = 18; x.fillStyle = c; x.fillText(l, W / 2, H * (0.36 + i * 0.3) + (lines.length === 1 ? H * 0.14 : 0), W - 60); x.shadowBlur = 0; }); });
    const em = basic('#fff', o.k || 1.5, { map: mt.map }); P.box(m.bk, w + 0.2, h + 0.2, 0.1, 0, y, 0.05); P.add(em, new THREE.PlaneGeometry(w, h), mx(0, y, 0.105), 0); P.box(glow(c, 2.4), w + 0.2, 0.04, 0.04, 0, y - h / 2 - 0.14, 0.1); P.box(glow(c, 2.4), w + 0.2, 0.04, 0.04, 0, y + h / 2 + 0.14, 0.1);
    e.dyn(new THREE.Mesh(new THREE.PlaneGeometry(w, h), holoMat(c, 0.12)), 0, y, 0.12); e.light(c, 8, Math.min(y, 3.5), 9);
  },
  /** 並び列の仕切り (真鍮の支柱とビロードの綱) */
  stanchion(P, o, e) {
    const B = BM(), n = o.n || 4, gap = o.gap || 1.5, R = fab(o.c || 0x8a2a20);
    for (let i = 0; i < n; i++) { const x = (i - (n - 1) / 2) * gap; P.cyl(B.br, 0.16, 0.19, 0.04, x, 0.02, 0, 'y', 14); P.cyl(B.br, 0.025, 0.025, 0.95, x, 0.5, 0, 'y', 8); P.sph(B.br, 0.05, x, 1.0, 0, 1, 1, 1, 10); e.col(0.16, x, 0);
      if (i < n - 1) for (let k = 0; k < 6; k++) { const t = (k + 0.5) / 6, sag = Math.sin(t * Math.PI) * 0.16; P.add(R, new THREE.CylinderGeometry(0.02, 0.02, gap / 6 + 0.02, 6), mx(x + t * gap, 0.92 - sag, 0, 0, 0, HP - Math.cos(t * Math.PI) * 0.33)); } }
    e.rect((n - 1) * gap, 0.12);
  },
  /** 旅行鞄の山 */
  luggage(P, o, e) {
    const m = MM(), B = BM(), cs = [0x6a3a20, 0x2c5a4e, 0x8a2a20, 0x2a3a6a, 0xc9a22e, 0x30343c], n = o.n || 4;
    for (let i = 0; i < n; i++) { const w = 0.5 + e.rnd() * 0.3, hh = 0.34 + e.rnd() * 0.26, d = 0.22 + e.rnd() * 0.1, lv = i > 1 && e.rnd() < 0.6 ? 1 : 0, x = (i % 2 ? 0.34 : -0.3) * (lv ? 0.2 : 1) + (e.rnd() - 0.5) * 0.2, z = (i < 2 ? 0 : 0.36) * (lv ? 0.3 : 1), y = lv ? 0.46 : 0, ry = (e.rnd() - 0.5) * 0.6, c = fab(cs[Math.floor(e.rnd() * cs.length)]);
      if (lv) { P.box(c, w, d, hh, x, y + d / 2, z, ry); P.box(B.br, 0.12, 0.02, 0.04, x, y + d + 0.01, z, ry); } else { P.box(c, w, hh, d, x, hh / 2, z, ry); P.box(B.br, w + 0.01, 0.03, d + 0.01, x, hh * 0.72, z, ry); P.add(m.bk, new THREE.TorusGeometry(0.06, 0.012, 4, 10, Math.PI), mx(x, hh + 0.0, z, 0, ry, 0)); } }
    e.col(0.6);
  },
  /** 案内柱 (四面に地図と時刻) */
  infopillar(P, o, e) {
    const m = MM(), B = BM(), c = o.c || e.th.trim; P.box(B.gn, 0.8, 0.3, 0.8, 0, 0.15, 0); P.box(m.dk, 0.66, 2.0, 0.66, 0, 1.3, 0); P.box(B.br, 0.74, 0.06, 0.74, 0, 2.33, 0); P.box(B.br, 0.74, 0.06, 0.74, 0, 0.33, 0); P.add(B.br, new THREE.ConeGeometry(0.4, 0.4, 4), mx(0, 2.56, 0, 0, 0.785, 0)); P.sph(glow(c, 3.4), 0.09, 0, 2.84, 0, 1, 1, 1, 10);
    for (let k = 0; k < 4; k++) P.add(screenMat(['orbit', 'data', 'radar', 'bars'][k], k % 2 ? '#9fe0ff' : c, ['路線図', '発着案内', '現在地', '混雑状況'][k], 1.5), new THREE.PlaneGeometry(0.56, 0.9), mx(Math.sin(k * HP) * 0.334, 1.55, Math.cos(k * HP) * 0.334, 0, k * HP, 0));
    e.col(0.5); e.light(c, 7, 1.8, 5); if (o.use) e.use(o.label || '案内柱', o.use, 2.2);
  },
  /** 花を生けた大きな壺 (台座つき) */
  vase(P, o, e) {
    const B = BM(), s = o.s || 1, c = o.c || 0x2c5a4e; P.cyl(B.st, 0.34 * s, 0.4 * s, 0.7 * s, 0, 0.35 * s, 0, 'y', 8); P.cyl(B.br, 0.37 * s, 0.37 * s, 0.04, 0, 0.72 * s, 0, 'y', 8);
    P.add(mat('flat', { color: c, rough: 0.16, metal: 0.3 }), new THREE.LatheGeometry([[0.08, 0], [0.2, 0.06], [0.28, 0.3], [0.22, 0.52], [0.1, 0.66], [0.13, 0.74]].map(([r, y]) => new THREE.Vector2(r * s, y * s)), 20), mx(0, 0.74 * s, 0), 0); P.tor(B.br, 0.13 * s, 0.012, 0, 1.48 * s, 0, HP, 0, 0, 16, 5); P.tor(B.br, 0.275 * s, 0.01, 0, 1.04 * s, 0, HP, 0, 0, 20, 5);
    for (let i = 0; i < 7; i++) { const a = i * 0.9, r = 0.16 + (i % 3) * 0.08, hh = 0.5 + (i % 4) * 0.12; P.add(MM().lf, new THREE.CylinderGeometry(0.006, 0.008, hh * s, 4), mx(Math.cos(a) * r * 0.4 * s, (1.48 + hh / 2) * s, Math.sin(a) * r * 0.4 * s, Math.sin(a) * 0.3, 0, -Math.cos(a) * 0.3)); P.sph(glow(['#ff7ab8', '#ffd23a', '#ffffff', '#ff9a5a'][i % 4], 1.1), 0.055 * s, Math.cos(a) * r * s, (1.5 + hh) * s, Math.sin(a) * r * s, 1, 0.8, 1, 8); }
    bush(P, e, 0.3 * s, 8, 0, 1.72 * s, 0, 0.8); e.col(0.42 * s);
  },
  /** 額装した絵 (アールデコの幾何学画)。kind で図柄が変わる */
  painting(P, o, e) {
    const B = BM(), w = o.w || 1.6, h = o.h || 1.1, y = o.y || 2.0, k = o.kind || 0;
    const mt = printed('art' + k, 384, 256, (x, W, H) => { const pal = [['#1e3a36', '#c8a04a', '#f0e8d4', '#8a2a20'], ['#16202e', '#ffb060', '#7fc8e8', '#f0e8d4'], ['#2a1a2e', '#b48cff', '#ffd27a', '#4dffd8'], ['#0e1a14', '#35ff8a', '#f0e8d4', '#ff7a2a']][k % 4]; x.fillStyle = pal[0]; x.fillRect(0, 0, W, H);
      if (k % 4 === 0) { for (let i = 0; i < 9; i++) { x.strokeStyle = pal[1 + (i % 3)]; x.lineWidth = 7; x.beginPath(); x.arc(W / 2, H * 1.1, 40 + i * 26, Math.PI, 0); x.stroke(); } x.fillStyle = pal[1]; x.beginPath(); x.arc(W / 2, H * 1.1, 34, 0, 7); x.fill(); }
      else if (k % 4 === 1) { x.fillStyle = pal[2]; x.beginPath(); x.arc(W * 0.66, H * 0.4, 62, 0, 7); x.fill(); x.strokeStyle = pal[1]; x.lineWidth = 5; for (let i = 0; i < 5; i++) { x.beginPath(); x.ellipse(W * 0.66, H * 0.4, 84 + i * 16, 18 + i * 5, -0.3, 0, 7); x.stroke(); } x.fillStyle = pal[3]; for (let i = 0; i < 40; i++) x.fillRect((i * 97) % W, (i * 53) % H, 2, 2); }
      else if (k % 4 === 2) { for (let i = 0; i < 12; i++) { x.fillStyle = pal[1 + (i % 3)]; x.globalAlpha = 0.85; x.beginPath(); x.moveTo(i * 34, H); x.lineTo(i * 34 + 17, H - 60 - ((i * 37) % 130)); x.lineTo(i * 34 + 34, H); x.fill(); } x.globalAlpha = 1; x.fillStyle = pal[2]; x.beginPath(); x.arc(W * 0.24, H * 0.26, 26, 0, 7); x.fill(); }
      else { x.strokeStyle = pal[1]; x.lineWidth = 6; x.beginPath(); x.arc(W / 2, H / 2, 84, 0, 7); x.stroke(); x.fillStyle = pal[1]; x.fillRect(W / 2 - 50, H / 2 - 13, 100, 26); x.fillRect(W / 2 - 13, H / 2 - 50, 26, 100); x.strokeStyle = pal[3]; x.lineWidth = 3; for (let i = 0; i < 3; i++) { x.beginPath(); x.ellipse(W / 2, H / 2, 112 + i * 14, 34 + i * 6, 0.4, 0, 7); x.stroke(); } } });
    P.box(B.br, w + 0.16, h + 0.16, 0.06, 0, y, 0.03); P.box(MM().bk, w + 0.04, h + 0.04, 0.02, 0, y, 0.062); P.add(mt, new THREE.PlaneGeometry(w, h), mx(0, y, 0.074), 0); P.box(B.br, 0.5, 0.06, 0.12, 0, y + h / 2 + 0.24, 0.08); P.add(glow('#ffe8c0', 2.6), new THREE.PlaneGeometry(0.4, 0.05).rotateX(HP), mx(0, y + h / 2 + 0.2, 0.1), 0);
  },
  /** 窓辺の厚いカーテン (両脇に束ねる) */
  curtain(P, o, e) {
    const B = BM(), w = o.w || 6, h = o.h || e.room.h - 0.6, c = fab(o.c || 0x6a1a2a);
    P.cyl(B.br, 0.03, 0.03, w + 0.4, 0, h + 0.1, 0.12, 'x', 8); for (const s of [-1, 1]) { P.sph(B.br, 0.07, s * (w / 2 + 0.2), h + 0.1, 0.12, 1, 1, 1, 8); for (let i = 0; i < 6; i++) P.cyl(c, 0.09, 0.07 + (i % 2) * 0.03, h, s * (w / 2 - 0.1 - i * 0.14), h / 2 + 0.05, 0.12 + (i % 2) * 0.05, 'y', 8); P.add(B.br, new THREE.TorusGeometry(0.2, 0.02, 5, 14), mx(s * (w / 2 - 0.45), h * 0.42, 0.15, HP, 0, 0)); }
    P.box(c, w + 0.3, 0.4, 0.16, 0, h - 0.05, 0.14);
  },
  /** 掲示板 (貼り紙・当番表) */
  bulletin(P, o, e) {
    const m = MM(), w = o.w || 2.2, h = o.h || 1.3, y = o.y || 1.75, heads = o.items || ['当番表', '避難経路', 'お知らせ', '今週の献立', '安全第一', '遺失物'];
    P.box(m.wd, w + 0.12, h + 0.12, 0.05, 0, y, 0.025); P.box(flat(0x8a6a48, 0.95, 0), w, h, 0.02, 0, y, 0.055);
    const cols = Math.max(2, Math.round(w / 0.62)), rows = 2; for (let j = 0; j < rows; j++) for (let i = 0; i < cols; i++) { const k = j * cols + i, pw = 0.46, ph = 0.5, px = -w / 2 + (i + 0.5) * w / cols, py = y + (j ? -1 : 1) * h * 0.24, tilt = ((k * 37) % 7 - 3) * 0.02, hd = heads[k % heads.length];
      P.add(printed('note' + hd + (k % 3), 184, 200, (x, W, H) => { x.fillStyle = ['#f4f0e4', '#fff6c8', '#e4f0f4'][k % 3]; x.fillRect(0, 0, W, H); txt(x, hd, W / 2, 28, 22, '#1c2026'); x.fillStyle = '#c8201e'; x.fillRect(16, 46, W - 32, 3); x.fillStyle = 'rgba(40,44,52,.55)'; for (let q = 0; q < 8; q++) x.fillRect(16, 62 + q * 16, (W - 32) * (0.5 + ((q * 53 + k * 17) % 50) / 100), 5); }), new THREE.PlaneGeometry(pw, ph), mx(px, py, 0.068, 0, 0, tilt), 0);
      P.sph(flat([0xc8201e, 0x2a6ab8, 0xc9a22e][k % 3], 0.4, 0.2), 0.02, px, py + ph / 2 - 0.04, 0.075, 1, 1, 0.6, 6); }
  },

  // ───────────────────────── ウェポン: 兵器まわり ─────────────────────────
  /** 蓄電器盤 (銅の母線でつないだ蓄電器の列。表示灯が脈打つ) */
  capbank(P, o, e) {
    const m = MM(), B = BM(), n = o.n || 4, c = o.c || '#8fe8ff', w = n * 0.5 + 0.3;
    P.box(m.dk, w, 2.3, 0.7, 0, 1.15, 0); P.box(B.yl, w, 0.1, 0.72, 0, 2.3, 0); P.box(m.bk, w - 0.2, 1.9, 0.02, 0, 1.2, 0.352);
    for (let j = 0; j < 3; j++) for (let i = 0; i < n; i++) { const x = (i - (n - 1) / 2) * 0.5, y = 0.55 + j * 0.62; P.cyl(B.gm, 0.17, 0.17, 0.4, x, y, 0.42, 'z', 14); P.cyl(B.cu, 0.19, 0.19, 0.05, x, y, 0.6, 'z', 14); P.cyl(B.cu, 0.03, 0.03, 0.08, x, y, 0.66, 'z', 8); if (i < n - 1) P.box(B.cu, 0.5, 0.05, 0.02, x + 0.25, y, 0.68); }
    for (let j = 0; j < 2; j++) P.box(B.cu, 0.05, 0.62, 0.02, (n - 1) * 0.25, 0.86 + j * 0.62, 0.69);
    const led = []; for (let i = 0; i < n; i++) { const q = e.dyn(new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.05, 0.02), basic(c, 3)), (i - (n - 1) / 2) * 0.5, 2.12, 0.365); led.push(q); }
    scr(P, 'bars', c, 'kV', 0.5, 0.2, -w / 2 + 0.4, 0.2, 0.365, 0, 1.4); P.cyl(m.bk, 0.06, 0.06, e.room.h - 2.3, w / 2 - 0.2, (e.room.h + 2.3) / 2, 0, 'y', 8); P.cyl(m.bk, 0.045, 0.045, e.room.h - 2.3, w / 2 - 0.36, (e.room.h + 2.3) / 2, 0, 'y', 8);
    P.add(mat('hazard', { rough: 0.7, metal: 0.2 }), new THREE.BoxGeometry(w + 0.5, 0.012, 0.36), mx(0, 0.011, 0.95)); e.anim((dt, t) => { led.forEach((q, i) => q.material.color.set(c).multiplyScalar(1 + 3.5 * Math.max(0, Math.sin(t * 2.2 - i * 0.7 + e.x)))); });
    e.rect(w, 0.9, 0, 0.1); e.light(c, 6, 1.6, 5);
  },
  /** 電纜の巻き枠 */
  cabledrum(P, o, e) { const m = MM(), s = o.s || 1; for (const z of [-0.34, 0.34]) P.cyl(m.wd, 0.7 * s, 0.7 * s, 0.07, 0, 0.7 * s, z * s, 'z', 20); P.cyl(m.bk, 0.44 * s, 0.44 * s, 0.6 * s, 0, 0.7 * s, 0, 'z', 16); for (let i = 0; i < 7; i++) P.tor(flat(o.c || 0xc8201e, 0.7, 0.1), 0.45 * s, 0.03 * s, 0, 0.7 * s, (-0.26 + i * 0.087) * s, 0, 0, 0, 20, 5); P.cyl(m.ch, 0.08 * s, 0.08 * s, 0.8 * s, 0, 0.7 * s, 0, 'z', 8); for (const sx of [-1, 1]) P.add(m.dk, new THREE.BoxGeometry(0.3, 0.14, 0.9 * s), mx(sx * 0.5 * s, 0.07, 0)); e.rect(1.4 * s, 0.8 * s); },
  /** 装甲板の試験台 (貫通痕と焼け跡のついた板) */
  platestand(P, o, e) {
    const m = MM(), B = BM(), w = o.w || 1.6, h = o.h || 1.6;
    for (const s of [-1, 1]) { P.box(m.dk, 0.1, h + 0.8, 0.1, s * (w / 2 + 0.1), (h + 0.8) / 2, 0); P.add(m.dk, new THREE.BoxGeometry(0.1, 1.2, 0.1), mx(s * (w / 2 + 0.1), 0.5, -0.4, 0.7, 0, 0)); P.box(m.dk, 0.3, 0.06, 1.2, s * (w / 2 + 0.1), 0.03, -0.2); }
    P.box(B.gm, w, h, 0.12, 0, 0.6 + h / 2, 0); P.box(B.yl, w, 0.08, 0.13, 0, 0.6 + h - 0.04, 0);
    for (let i = 0; i < (o.n || 5); i++) { const x = (e.rnd() - 0.5) * (w - 0.4), y = 0.75 + e.rnd() * (h - 0.4), r = 0.05 + e.rnd() * 0.07, through = i % 2 === 0;
      P.add(flat(0x0c0c0e, 0.9, 0.1), new THREE.CircleGeometry(r * 2.4, 14), mx(x, y, 0.062), 0); P.add(through ? MM().bk : glow('#ff7a2a', 1.2), new THREE.CircleGeometry(r, 12), mx(x, y, 0.064), 0); P.add(B.rl, new THREE.TorusGeometry(r * 1.2, r * 0.3, 5, 12), mx(x, y, 0.066), 0); }
    P.add(printed('plate-label' + (o.t || 'IV'), 256, 64, (x, W, H) => { x.fillStyle = '#f2b90a'; x.fillRect(0, 0, W, H); txt(x, `装甲等級 ${o.t || 'IV'} ─ 試験済`, W / 2, H / 2, 24); }), new THREE.PlaneGeometry(0.7, 0.17), mx(0, 0.72, 0.064), 0); e.rect(w + 0.3, 0.5, 0, -0.1);
  },
  /** 展示ケース (ガラスの中に小銃)。真鍮の銘板つき */
  guncase(P, o, e) {
    const m = MM(), B = BM(), w = o.w || 1.8, c = o.c || '#ffe14d';
    P.box(m.dk, w, 0.9, 0.6, 0, 0.45, 0); P.box(B.yl, w + 0.04, 0.04, 0.64, 0, 0.92, 0); P.box(fab(0x3a1a1a), w - 0.1, 0.03, 0.5, 0, 0.955, 0); P.add(glassMat(), new THREE.BoxGeometry(w, 0.6, 0.6), mx(0, 1.25, 0), 0); for (const [sx, sz] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) P.box(m.ch, 0.025, 0.6, 0.025, sx * w / 2, 1.25, sz * 0.3); P.box(m.ch, w, 0.025, 0.6, 0, 1.56, 0);
    P.add(B.gm, new THREE.BoxGeometry(0.95, 0.09, 0.07), mx(-0.05, 1.12, 0, 0, 0, 0.06)); P.add(m.bk, new THREE.CylinderGeometry(0.018, 0.02, 0.5, 8), mx(0.66, 1.16, 0, 0, 0, HP - 0.06)); P.add(m.wd, new THREE.BoxGeometry(0.34, 0.12, 0.06), mx(-0.66, 1.07, 0, 0, 0, 0.2)); P.add(m.bk, new THREE.BoxGeometry(0.06, 0.2, 0.05), mx(-0.18, 1.0, 0, 0, 0, 0.3)); P.add(m.bk, new THREE.BoxGeometry(0.07, 0.24, 0.05), mx(0.06, 0.98, 0, 0, 0, -0.1)); P.add(m.bk, new THREE.CylinderGeometry(0.03, 0.03, 0.26, 8), mx(0.0, 1.21, 0, 0, 0, HP)); for (const x of [-0.5, 0.5]) P.box(B.yl, 0.04, 0.14, 0.2, x, 1.03, 0);
    P.box(glow(c, 2.4), w - 0.2, 0.02, 0.03, 0, 1.54, 0.26); P.add(printed('gun' + (o.text || '試製 71 式 電磁小銃'), 320, 64, (x, W, H) => { x.fillStyle = '#c8a04a'; x.fillRect(0, 0, W, H); txt(x, o.text || '試製 71 式 電磁小銃', W / 2, H / 2, 22, '#2a1c08'); }), new THREE.PlaneGeometry(0.8, 0.16), mx(0, 0.6, 0.305), 0);
    e.rect(w, 0.62); e.light(c, 6, 1.5, 4);
  },
  /** 投射砲の弾体の断面模型 (芯が光る) */
  shelldisplay(P, o, e) {
    const m = MM(), B = BM(), c = o.c || '#8fe8ff';
    P.cyl(m.dk, 0.5, 0.6, 0.9, 0, 0.45, 0, 'y', 8); P.cyl(B.yl, 0.52, 0.52, 0.05, 0, 0.92, 0, 'y', 8); for (const x of [-0.5, 0.5]) { P.box(m.ch, 0.05, 0.4, 0.3, x, 1.14, 0); P.add(m.ch, new THREE.TorusGeometry(0.17, 0.02, 5, 14, Math.PI), mx(x, 1.34, 0, 0, HP, 0)); }
    const RL2 = mat('flat', { color: 0x8a929e, rough: 0.3, metal: 1, side: THREE.DoubleSide }), CU2 = mat('flat', { color: 0xc8743a, rough: 0.32, metal: 1, side: THREE.DoubleSide });
    P.add(RL2, new THREE.CylinderGeometry(0.16, 0.16, 1.2, 20, 1, false, 0, Math.PI).rotateZ(HP), mx(-0.05, 1.36, 0, -HP, 0, 0)); P.add(RL2, new THREE.CylinderGeometry(0.16, 0.012, 0.5, 20, 1, false, 0, Math.PI).rotateZ(HP), mx(-0.9, 1.36, 0, -HP, 0, 0)); P.add(CU2, new THREE.CylinderGeometry(0.175, 0.175, 0.12, 20, 1, false, 0, Math.PI).rotateZ(HP), mx(0.4, 1.36, 0, -HP, 0, 0));
    P.cyl(glow(c, 3), 0.05, 0.05, 1.1, -0.02, 1.36, 0, 'x', 10); P.cyl(B.cu, 0.09, 0.09, 0.9, -0.1, 1.36, 0, 'x', 10); P.add(printed('slug', 320, 64, (x, W, H) => { x.fillStyle = '#f2b90a'; x.fillRect(0, 0, W, H); txt(x, '880 口径 投射弾 ─ 断面', W / 2, H / 2, 22); }), new THREE.PlaneGeometry(0.76, 0.15), mx(0, 0.62, 0.56, -0.12, 0, 0), 0);
    e.col(0.75); e.light(c, 6, 1.6, 4);
  },
  /** 警告標識 (黄色い札)。壁に貼る */
  warnsign(P, o, e) {
    const w = o.w || 0.9, h = o.h || 0.6, y = o.y || 1.9, t = o.text || '高電圧\n立入禁止';
    P.add(printed('warn' + t, 300, 200, (x, W, H) => { x.fillStyle = '#f2b90a'; x.fillRect(0, 0, W, H); x.strokeStyle = '#16181c'; x.lineWidth = 10; x.strokeRect(8, 8, W - 16, H - 16); x.fillStyle = '#16181c'; x.beginPath(); x.moveTo(60, 36); x.lineTo(98, 104); x.lineTo(22, 104); x.fill(); x.fillStyle = '#f2b90a'; x.fillRect(56, 56, 8, 26); x.fillRect(56, 88, 8, 8);
      t.split('\n').forEach((l, i, a) => txt(x, l, 190, a.length > 1 ? 56 + i * 52 : 70, a.length > 1 ? 40 : 46)); x.fillStyle = '#16181c'; for (let i = 0; i < 9; i++) { x.beginPath(); x.moveTo(20 + i * 30, 180); x.lineTo(36 + i * 30, 180); x.lineTo(48 + i * 30, 150); x.lineTo(32 + i * 30, 150); x.fill(); } }), new THREE.PlaneGeometry(w, h), mx(0, y, 0.02), 0); P.box(MM().dk, w + 0.04, h + 0.04, 0.015, 0, y, 0.008);
  },
  /** 兵器の整備台 (分解した銃・万力・洗い矢・手元灯) */
  weaponbench(P, o, e) {
    const m = MM(), B = BM(), w = o.w || 2.6;
    P.box(m.st, w, 0.08, 0.9, 0, 0.92, 0); for (const [x, z] of [[-w / 2 + 0.1, -0.38], [w / 2 - 0.1, -0.38], [-w / 2 + 0.1, 0.38], [w / 2 - 0.1, 0.38]]) P.box(m.dk, 0.08, 0.9, 0.08, x, 0.45, z); P.box(m.dk, w - 0.2, 0.05, 0.8, 0, 0.3, 0); P.box(m.dk, w, 1.3, 0.05, 0, 1.65, -0.43); P.box(fab(0x2a3a2a), w - 0.4, 0.012, 0.6, -0.1, 0.966, 0.05);
    P.box(B.gm, 0.7, 0.07, 0.06, -0.5, 1.0, 0.1, 0.2); P.cyl(m.bk, 0.016, 0.018, 0.5, 0.1, 1.0, -0.05, 'x', 8); P.box(m.wd, 0.3, 0.05, 0.1, -0.2, 0.99, 0.3, -0.4); P.box(m.bk, 0.06, 0.16, 0.04, -0.75, 0.99, -0.12, 0.6, HP, 0); for (let i = 0; i < 5; i++) P.cyl(B.cu, 0.012, 0.012, 0.05, 0.4 + i * 0.05, 0.99, 0.3, 'y', 6);
    P.box(B.rd, 0.22, 0.2, 0.16, w / 2 - 0.4, 1.06, 0.2); P.box(m.ch, 0.26, 0.06, 0.05, w / 2 - 0.4, 1.19, 0.2); P.cyl(m.ch, 0.014, 0.014, 0.28, w / 2 - 0.4, 1.19, 0.34, 'x', 6); // 万力
    for (let i = 0; i < 6; i++) P.add(i % 2 ? m.ch : B.yl, new THREE.BoxGeometry(0.035, 0.4 + (i % 3) * 0.1, 0.03), mx(-w / 2 + 0.3 + i * 0.16, 1.7 + (i % 2) * 0.08, -0.39)); for (let i = 0; i < 3; i++) P.cyl(m.ch, 0.008, 0.008, 0.9, w / 2 - 0.5 - i * 0.1, 1.7, -0.39, 'y', 4);
    P.add(m.dk, new THREE.CylinderGeometry(0.012, 0.012, 0.6, 5), mx(-w / 2 + 0.3, 1.26, -0.3, 0.5, 0, 0.3)); P.add(m.dk, new THREE.ConeGeometry(0.1, 0.14, 10, 1, true), mx(-w / 2 + 0.4, 1.5, -0.14, 0.9, 0, 0), 0); P.sph(glow('#ffe6c0', 3), 0.04, -w / 2 + 0.42, 1.46, -0.11, 1, 1, 1, 8); P.box(crateM(0x4a5a3a), 0.5, 0.36, 0.4, w / 2 - 0.5, 0.5, 0);
    e.rect(w, 0.95); e.light('#ffe6c0', 8, 1.8, 5); if (o.use) e.use(o.label, o.use, 2.4);
  },
  /** 使い終えた標的紙の壁 */
  targetsheets(P, o, e) {
    const w = o.w || 3, y = o.y || 1.8, n = Math.max(2, Math.round(w / 0.75));
    for (let i = 0; i < n; i++) { const k = i % 3; P.add(printed('tgt' + k, 200, 240, (x, W, H) => { x.fillStyle = '#efe8d8'; x.fillRect(0, 0, W, H); x.strokeStyle = '#16181c'; x.lineWidth = 3; for (const r of [84, 62, 40, 18]) { x.beginPath(); x.arc(W / 2, H * 0.46, r, 0, 7); x.stroke(); } x.fillStyle = '#c8201e'; x.beginPath(); x.arc(W / 2, H * 0.46, 9, 0, 7); x.fill();
        x.fillStyle = '#0c0c0e'; for (let q = 0; q < 6 + k * 3; q++) { const a = (q * 2.4 + k) % 6.28, d = ((q * 37 + k * 11) % 70) * (k === 0 ? 0.4 : 1); x.beginPath(); x.arc(W / 2 + Math.cos(a) * d, H * 0.46 + Math.sin(a) * d, 4.5, 0, 7); x.fill(); } txt(x, ['95 点', '71 点', '48 点'][k], W / 2, H - 22, 22, k === 0 ? '#c8201e' : '#16181c'); }), new THREE.PlaneGeometry(0.6, 0.72), mx(-w / 2 + (i + 0.5) * w / n, y + ((i * 7) % 3 - 1) * 0.05, 0.02, 0, 0, ((i * 5) % 5 - 2) * 0.03), 0); }
  },
  /** 部隊旗 (壁に掛ける三角の旗) */
  pennant(P, o, e) {
    const m = MM(), y = o.y || 2.4, c = o.c || 0x8a1c1c, n = o.n || 3;
    for (let i = 0; i < n; i++) { const x = (i - (n - 1) / 2) * 0.75, sh = new THREE.Shape(); sh.moveTo(-0.26, 0); sh.lineTo(0.26, 0); sh.lineTo(0, -0.74); sh.closePath(); P.add(fab([c, 0x2a3a6a, 0x4a5a3a][i % 3]), new THREE.ShapeGeometry(sh), mx(x, y, 0.03), 0); P.box(flat(0xc8a04a, 0.3, 1), 0.6, 0.03, 0.03, x, y + 0.01, 0.03); P.add(glow(['#ffe14d', '#ffffff', '#ff5a3a'][i % 3], 1.2), new THREE.CircleGeometry(0.07, 5), mx(x, y - 0.24, 0.036), 0); }
  },
};
