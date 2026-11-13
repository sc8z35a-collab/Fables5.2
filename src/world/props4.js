// 追加ステーション用の小道具 (3): 細部の作り込み用。壁の設備・救難用具・研究機器・兵器まわり・駅や街の小物
import * as THREE from 'three';
import { Builder, mx } from '../gfx/builder.js';
import { mat, glow, screenMat, cv, ctex, JP } from '../gfx/textures.js';
import { makeGlowSprite } from '../gfx/fx.js';
import { G } from '../core/util.js';
import { holoMat, glassMat } from './interior.js';
import { MM, fab, crateM, flat, scr } from './props.js';
import { basic, W2 } from './props2.js';
import { rescueN } from './rescue.js';
import { RESCUE } from './defs.js';

const HP = Math.PI / 2, TAU = Math.PI * 2;
const ADD = { transparent: true, blending: THREE.AdditiveBlending, depthWrite: false };
let _B;
const BM = () => _B || (_B = { br: mat('flat', { color: 0xc8a04a, rough: 0.3, metal: 1 }), cu: mat('flat', { color: 0xc8743a, rough: 0.32, metal: 1 }), rl: mat('flat', { color: 0x8a929e, rough: 0.3, metal: 1 }), gm: mat('flat', { color: 0x4a505a, rough: 0.5, metal: 0.65 }), yl: mat('flat', { color: 0xf2b90a, rough: 0.55, metal: 0.3 }),
  or: mat('flat', { color: 0xff6a1e, rough: 0.6, metal: 0.1 }), rd: mat('flat', { color: 0xc8201e, rough: 0.45, metal: 0.3 }), gn: mat('marble', { color: 0x2c5a4e, rough: 0.2, metal: 0.05 }), iv: mat('flat', { color: 0xf0e8d4, rough: 0.35, metal: 0.15 }) });
const GX = () => glow('#35ff8a', 2.2);
const LIQ = ['#4dffd8', '#b48cff', '#ff7ab8', '#ffd23a', '#6fe8ff', '#8aff6a'];
/** 文字入りの小さな銘板 (発光しない塗装)。同じ文字は使い回す */
const PL = new Map();
function plate(text, fg = '#16181c', bg = '#f2b90a', w = 256, h = 96) {
  const key = text + fg + bg + w; let m = PL.get(key); if (m) return m;
  const c = cv(w, h), x = c.getContext('2d'); x.fillStyle = bg; x.fillRect(0, 0, w, h); x.strokeStyle = fg; x.lineWidth = 6; x.strokeRect(5, 5, w - 10, h - 10); x.fillStyle = fg; x.textAlign = 'center'; x.textBaseline = 'middle';
  const lines = String(text).split('\n'); let fs = Math.min(h * 0.62 / lines.length, 60); x.font = `900 ${fs}px ${JP}`; const tw = Math.max(...lines.map((l) => x.measureText(l).width)); if (tw > w - 26) { fs *= (w - 26) / tw; x.font = `900 ${fs}px ${JP}`; }
  lines.forEach((l, i) => x.fillText(l, w / 2, h / 2 + (i - (lines.length - 1) / 2) * fs * 1.12));
  m = new THREE.MeshStandardMaterial({ map: ctex(c, true, false), roughness: 0.6, metalness: 0.1 }); m.userData.uvs = 0; PL.set(key, m); return m;
}
const label = (P, text, w, h, x, y, z, fg, bg) => P.add(plate(text, fg, bg, Math.round(256 * Math.max(1, w / h / 2.6)), 96), new THREE.PlaneGeometry(w, h), mx(x, y, z), 0);

export const PROPS4 = {
  // ───────────────────────── 壁の設備 (どの拠点でも) ─────────────────────────
  /** 消火器 (壁掛け) */
  extinguisher(P, o, e) {
    const m = MM(), B = BM(), y = o.y || 1.0;
    P.box(m.dk, 0.34, 0.9, 0.04, 0, y + 0.1, 0.02); P.cyl(B.rd, 0.085, 0.085, 0.5, 0, y, 0.13, 'y', 14); P.sph(B.rd, 0.085, 0, y + 0.25, 0.13, 1, 0.6, 1, 12); P.cyl(m.ch, 0.03, 0.04, 0.08, 0, y + 0.33, 0.13, 'y', 8); P.box(m.bk, 0.14, 0.03, 0.03, 0.05, y + 0.38, 0.13); P.box(m.bk, 0.02, 0.12, 0.02, 0.1, y + 0.32, 0.13);
    P.add(m.bk, new THREE.TorusGeometry(0.1, 0.014, 5, 14, Math.PI), mx(-0.06, y + 0.2, 0.15, 0, HP, 0)); P.box(m.ch, 0.22, 0.03, 0.12, 0, y - 0.06, 0.09); P.box(m.ch, 0.22, 0.03, 0.12, 0, y + 0.18, 0.09);
    label(P, '消火器', 0.3, 0.11, 0, y + 0.66, 0.045, '#ffffff', '#c8201e');
  },
  /** 救急箱と自動除細動器 (壁掛け) */
  firstaid(P, o, e) {
    const m = MM(), y = o.y || 1.5; P.box(m.wh, 0.5, 0.42, 0.14, 0, y, 0.07); P.box(m.ch, 0.52, 0.02, 0.15, 0, y + 0.21, 0.075); P.box(GX(), 0.2, 0.06, 0.01, 0, y, 0.146); P.box(GX(), 0.06, 0.2, 0.01, 0, y, 0.146); P.box(m.ch, 0.03, 0.08, 0.02, 0.21, y, 0.15);
    P.box(BM().or, 0.34, 0.3, 0.12, 0.6, y, 0.06); P.add(glassMat(), new THREE.BoxGeometry(0.28, 0.24, 0.01), mx(0.6, y, 0.126), 0); P.box(glow('#35ff8a', 2.6), 0.04, 0.04, 0.01, 0.72, y + 0.1, 0.122); label(P, 'AED', 0.2, 0.08, 0.6, y + 0.21, 0.065, '#ffffff', '#1e8a4a');
  },
  /** 配電・計器盤 (壁の設備): スイッチ列・丸形計器・表示灯・配管 */
  wallpanel(P, o, e) {
    const m = MM(), B = BM(), w = o.w || 1.6, h = o.h || 1.3, y = o.y || 1.5, c = o.c || e.th.trim, n = Math.max(2, Math.round(w / 0.42));
    P.box(m.dk, w, h, 0.1, 0, y, 0.05); P.box(m.st, w - 0.1, h - 0.1, 0.02, 0, y, 0.105); for (const [sx, sy] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) P.cyl(m.ch, 0.018, 0.018, 0.02, sx * (w / 2 - 0.06), y + sy * (h / 2 - 0.06), 0.12, 'z', 6);
    for (let i = 0; i < n; i++) { const x = -w / 2 + (i + 0.5) * w / n; // 上段: 丸形計器
      P.cyl(m.bk, 0.13, 0.13, 0.03, x, y + h * 0.26, 0.125, 'z', 20); P.add(flat(0xe8e4d8, 0.6, 0), new THREE.CircleGeometry(0.11, 20), mx(x, y + h * 0.26, 0.142), 0); P.add(m.ch, new THREE.TorusGeometry(0.125, 0.012, 5, 20), mx(x, y + h * 0.26, 0.14), 0);
      const a = -2.2 + ((i * 37 + Math.round(e.x * 3)) % 9) * 0.5; P.add(B.rd, new THREE.BoxGeometry(0.012, 0.1, 0.006), mx(x + Math.sin(a) * 0.045, y + h * 0.26 + Math.cos(a) * 0.045, 0.147, 0, 0, -a), 0); P.cyl(m.bk, 0.014, 0.014, 0.012, x, y + h * 0.26, 0.15, 'z', 8);
      for (let j = 0; j < 3; j++) { const yy = y - h * 0.08 - j * 0.14, on = (i + j * 2 + Math.round(e.z)) % 3; P.box(m.bk, 0.07, 0.09, 0.02, x - 0.08, yy, 0.12); P.box(on ? m.ch : B.rd, 0.025, 0.05, 0.03, x - 0.08, yy + (on ? 0.02 : -0.02), 0.135, 0, on ? -0.4 : 0.4, 0); P.sph(glow(on === 1 ? '#35ff8a' : on === 2 ? c : '#ff3a2a', on ? 2.6 : 1.2), 0.02, x + 0.06, yy, 0.125, 1, 1, 0.5, 8); } }
    P.cyl(crateM(0x2a6ab8), 0.035, 0.035, 1.2, -w / 2 - 0.1, y - h / 2 - 0.5, 0.06, 'y', 8); P.cyl(crateM(0xc9a22e), 0.03, 0.03, 1.2, -w / 2 - 0.19, y - h / 2 - 0.5, 0.06, 'y', 8); P.box(m.dk, 0.3, 0.08, 0.12, -w / 2 - 0.14, y - h / 2 - 0.02, 0.06);
    if (o.text) label(P, o.text, Math.min(w - 0.3, 0.9), 0.12, 0, y + h / 2 - 0.1, 0.118, '#16181c', '#d8dce0');
  },
  /** 換気口 (ルーバー) */
  vent(P, o, e) { const m = MM(), w = o.w || 1.0, h = o.h || 0.5, y = o.y || 2.4; P.box(m.dk, w, h, 0.06, 0, y, 0.03); for (let i = 0; i < Math.round(h / 0.07); i++) P.add(m.st, new THREE.BoxGeometry(w - 0.1, 0.012, 0.07), mx(0, y - h / 2 + 0.06 + i * 0.07, 0.06, 0.6, 0, 0)); },
  /** 壁の手すり (黄色い握り棒) */
  handrail(P, o, e) { const m = MM(), w = o.w || 3, y = o.y || 1.05, B = BM(); P.cyl(o.c ? flat(o.c, 0.5, 0.3) : B.yl, 0.025, 0.025, w, 0, y, 0.1, 'x', 8); for (let x = -w / 2 + 0.15; x <= w / 2 - 0.1; x += Math.max(0.6, (w - 0.3) / Math.max(1, Math.round(w / 1.2)))) { P.cyl(m.ch, 0.014, 0.014, 0.1, x, y, 0.05, 'z', 6); P.cyl(m.ch, 0.03, 0.03, 0.012, x, y, 0.006, 'z', 8); } },
  /** 天井へのはしごと点検ハッチ */
  ladder(P, o, e) { const m = MM(), h = e.room.h, B = BM(); for (const s of [-1, 1]) P.box(m.ch, 0.04, h - 0.1, 0.04, s * 0.22, h / 2, 0.14); for (let y = 0.35; y < h - 0.2; y += 0.3) P.cyl(m.ch, 0.016, 0.016, 0.44, 0, y, 0.14, 'x', 6); P.box(m.dk, 0.8, 0.06, 0.8, 0, h - 0.04, 0.42); P.box(B.yl, 0.82, 0.02, 0.06, 0, h - 0.075, 0.82); P.box(B.yl, 0.82, 0.02, 0.06, 0, h - 0.075, 0.02); P.cyl(m.ch, 0.1, 0.1, 0.03, 0, h - 0.09, 0.42, 'y', 12); },
  /** 床の点検ハッチ (警戒色の縁) */
  floorhatch(P, o, e) { const m = MM(), w = o.w || 1.2; P.box(m.dk, w, 0.02, w, 0, 0.012, 0); P.add(mat('hazard', { rough: 0.7, metal: 0.2 }), new THREE.BoxGeometry(w + 0.24, 0.012, w + 0.24), mx(0, 0.007, 0)); P.box(m.st, w - 0.16, 0.014, w - 0.16, 0, 0.022, 0); for (const s of [-1, 1]) P.box(m.ch, 0.2, 0.02, 0.04, s * (w / 2 - 0.22), 0.034, 0); },
  /** ガスボンベの列 (酸素・窒素) とマニホールド */
  cylinders(P, o, e) {
    const m = MM(), n = o.n || 4, cs = [0x2a8a5a, 0x2a6ab8, 0xd8dce0, 0xc9a22e];
    for (let i = 0; i < n; i++) { const x = (i - (n - 1) / 2) * 0.34, c = crateM(cs[(i + (o.k || 0)) % 4]); P.cyl(c, 0.13, 0.13, 1.3, x, 0.69, 0, 'y', 14); P.sph(c, 0.13, x, 1.34, 0, 1, 0.7, 1, 12); P.cyl(m.ch, 0.035, 0.045, 0.1, x, 1.46, 0, 'y', 8); P.cyl(m.bk, 0.05, 0.05, 0.03, x, 1.53, 0, 'y', 8); P.cyl(m.dk, 0.14, 0.14, 0.04, x, 0.05, 0, 'y', 14); P.cyl(m.ch, 0.012, 0.012, 0.2, x, 1.6, -0.06, 'y', 5); }
    P.cyl(m.ch, 0.02, 0.02, n * 0.34, 0, 1.7, -0.06, 'x', 6); P.box(m.dk, n * 0.34 + 0.1, 0.05, 0.06, 0, 0.9, -0.16); P.box(m.dk, n * 0.34 + 0.1, 0.05, 0.06, 0, 0.4, -0.16); P.cyl(m.bk, 0.06, 0.06, 0.03, n * 0.17 + 0.02, 1.7, -0.03, 'z', 12); P.add(flat(0xe8e4d8, 0.6, 0), new THREE.CircleGeometry(0.05, 12), mx(n * 0.17 + 0.02, 1.7, -0.012), 0);
    e.rect(n * 0.34 + 0.1, 0.36);
  },

  // ───────────────────────── 救難 (アトラス・ミケーネ) ─────────────────────────
  /** 救難用具の壁: ヘルメット・ロープ・斧・油圧カッター・手持ち灯 */
  gearwall(P, o, e) {
    const m = MM(), B = BM(), w = o.w || 3.2, y = 1.55;
    P.box(m.dk, w, 1.7, 0.06, 0, y, 0.03); P.box(B.or, w, 0.08, 0.07, 0, y + 0.85, 0.035); P.box(B.or, w, 0.08, 0.07, 0, y - 0.85, 0.035); let x = -w / 2 + 0.35;
    for (let i = 0; i < 3 && x < w / 2 - 0.3; i++, x += 0.42) { P.cyl(m.ch, 0.012, 0.012, 0.14, x, y + 0.55, 0.1, 'z', 5); P.sph(i % 2 ? m.wh : B.or, 0.15, x, y + 0.5, 0.2, 1, 0.82, 1.05, 16); P.add(mat('flat', { color: 0x1a1206, rough: 0.05, metal: 1, env: 2 }), new THREE.SphereGeometry(0.13, 12, 8, 0, Math.PI, 1.0, 0.7).rotateY(-HP), mx(x, y + 0.5, 0.235), 0); P.box(glow('#fff6e0', 3), 0.05, 0.03, 0.02, x, y + 0.6, 0.345); }
    for (let i = 0; i < 2 && x < w / 2 - 0.3; i++, x += 0.44) { P.cyl(m.ch, 0.012, 0.012, 0.16, x, y + 0.5, 0.11, 'z', 5); for (let k = 0; k < 4; k++) P.add(k % 2 ? B.or : B.yl, new THREE.TorusGeometry(0.15 - k * 0.012, 0.022, 6, 20), mx(x, y + 0.28, 0.1 + k * 0.03), 0); }
    // 下段: 斧・油圧カッター・手持ち灯
    P.add(flat(0x8a6a3a, 0.8, 0), new THREE.CylinderGeometry(0.018, 0.022, 0.8, 8), mx(-w / 2 + 0.5, y - 0.4, 0.1, 0, 0, 0.9)); P.add(B.rd, new THREE.BoxGeometry(0.2, 0.14, 0.03), mx(-w / 2 + 0.5 + 0.33, y - 0.19, 0.1, 0, 0, 0.9)); P.add(m.ch, new THREE.BoxGeometry(0.06, 0.16, 0.012), mx(-w / 2 + 0.5 + 0.4, y - 0.26, 0.1, 0, 0, 0.9));
    P.box(B.yl, 0.5, 0.14, 0.12, 0.1, y - 0.42, 0.12); P.box(m.bk, 0.16, 0.18, 0.1, -0.16, y - 0.42, 0.12); for (const s of [-1, 1]) P.add(m.ch, new THREE.BoxGeometry(0.3, 0.035, 0.03), mx(0.48, y - 0.42 + s * 0.035, 0.12, 0, 0, s * 0.16)); P.cyl(m.bk, 0.012, 0.012, 0.5, 0.0, y - 0.62, 0.1, 'x', 5);
    for (let i = 0; i < 2; i++) { const lx = w / 2 - 0.4 - i * 0.34; P.cyl(B.yl, 0.045, 0.045, 0.26, lx, y - 0.4, 0.1, 'y', 10); P.cyl(m.bk, 0.07, 0.05, 0.08, lx, y - 0.24, 0.1, 'y', 10); P.add(glow('#fff6e0', 2.4), new THREE.CircleGeometry(0.055, 10).rotateX(-HP), mx(lx, y - 0.198, 0.1), 0); }
    label(P, '救難用具', 0.5, 0.12, 0, y + 0.76, 0.064, '#ffffff', '#c8501e');
  },
  /** 救難ホイスト (巻き上げ機): 索・フック・吊り上げ用の担架かご */
  winch(P, o, e) {
    const m = MM(), B = BM(), h = Math.min(e.room.h - 0.2, 3.0);
    P.box(m.dk, 0.9, 0.5, 0.7, 0, h - 0.25, 0); P.cyl(B.or, 0.26, 0.26, 0.5, 0, h - 0.55, 0, 'x', 16); for (const s of [-1, 1]) P.cyl(m.dk, 0.32, 0.32, 0.04, s * 0.27, h - 0.55, 0, 'x', 16); for (let i = 0; i < 7; i++) P.tor(m.bk, 0.265, 0.014, -0.2 + i * 0.066, h - 0.55, 0, 0, HP, 0, 16, 4);
    P.box(B.or, 0.16, 0.16, 1.4, 0, h - 0.12, 0.7); P.cyl(m.ch, 0.07, 0.07, 0.12, 0, h - 0.24, 1.36, 'x', 12); P.cyl(m.bk, 0.012, 0.012, h - 1.75, 0, (h - 0.3 + 1.45) / 2, 1.36, 'y', 4); P.add(m.ch, new THREE.TorusGeometry(0.07, 0.02, 6, 12, Math.PI * 1.5), mx(0, 1.38, 1.36, 0, 0, -0.8)); P.box(B.yl, 0.1, 0.12, 0.06, 0, 1.5, 1.36);
    // 吊り上げ用のかご (床置き)
    for (const s of [-1, 1]) { P.cyl(B.or, 0.02, 0.02, 2.0, s * 0.3, 0.42, 1.36, 'z', 6); P.cyl(B.or, 0.02, 0.02, 2.0, s * 0.3, 0.14, 1.36, 'z', 6); } for (let k = 0; k < 6; k++) { const z = 1.36 - 0.95 + k * 0.38; P.add(B.or, new THREE.TorusGeometry(0.3, 0.016, 5, 12, Math.PI), mx(0, 0.42, z, Math.PI, 0, 0)); }
    P.box(fab(0xe8e4d8), 0.5, 0.05, 1.8, 0, 0.16, 1.36); P.box(glow('#ff7a2a', 2.2), 0.3, 0.06, 0.02, 0.2, h - 0.3, 0.36); scr(P, 'bars', '#ff7a2a', 'HOIST', 0.36, 0.22, -0.2, h - 0.72, 0.38, 0, 1.4); P.box(m.dk, 0.42, 0.28, 0.05, -0.2, h - 0.72, 0.35);
    e.rect(0.7, 2.1, 0, 1.36);
  },
  /** 捜索ドローンの充電架 (小型の 4 発機が並ぶ) */
  dronerack(P, o, e) {
    const m = MM(), B = BM(), n = o.n || 3;
    P.box(m.dk, n * 0.9 + 0.2, 0.08, 0.8, 0, 0.9, 0); P.box(m.dk, n * 0.9 + 0.2, 0.08, 0.8, 0, 1.7, 0); for (const s of [-1, 1]) for (const z of [-0.36, 0.36]) P.box(m.st, 0.06, 2.3, 0.06, s * (n * 0.45 + 0.07), 1.15, z); P.box(m.dk, n * 0.9 + 0.2, 2.3, 0.04, 0, 1.15, -0.4); P.box(B.or, n * 0.9 + 0.2, 0.06, 0.82, 0, 2.3, 0);
    for (let k = 0; k < 2; k++) for (let i = 0; i < n; i++) { const x = (i - (n - 1) / 2) * 0.9, y = 0.98 + k * 0.8, lit = (i + k) % 3;
      P.box(m.wh, 0.3, 0.1, 0.36, x, y + 0.08, 0); P.box(B.or, 0.3, 0.03, 0.12, x, y + 0.14, 0.12); P.sph(glow('#6fe8ff', 3), 0.035, x, y + 0.07, 0.19, 1, 1, 0.6, 8);
      for (const [dx, dz] of [[-0.24, -0.2], [0.24, -0.2], [-0.24, 0.2], [0.24, 0.2]]) { P.box(m.dk, Math.abs(dx) * 1.1, 0.025, 0.03, x + dx / 2, y + 0.09, dz * 0.9, Math.atan2(-dz, dx) * 0); P.cyl(m.bk, 0.1, 0.1, 0.02, x + dx, y + 0.12, dz, 'y', 12); P.cyl(m.dk, 0.02, 0.02, 0.05, x + dx, y + 0.09, dz, 'y', 6); }
      P.box(glow(lit ? '#35ff8a' : '#ffb030', 2.6), 0.2, 0.02, 0.02, x, y - 0.03, 0.4); }
    label(P, '捜索ドローン', 0.6, 0.12, 0, 2.18, 0.42, '#ffffff', '#c8501e'); e.rect(n * 0.9 + 0.2, 0.82); e.light('#6fe8ff', 5, 1.4, 4);
  },
  /** 避難者用の座席列 (壁際): 橙の 4 点式ベルト・頭上の荷物棚と握り棒 */
  evacseats(P, o, e) {
    const m = MM(), B = BM(), n = o.n || 4, f = fab(o.c || 0x3a4048), h = Math.min(e.room.h, 2.9);
    for (let i = 0; i < n; i++) { const x = (i - (n - 1) / 2) * 0.62;
      P.box(m.dk, 0.56, 0.06, 0.5, x, 0.42, 0.06); P.box(f, 0.54, 0.1, 0.48, x, 0.5, 0.06); P.box(f, 0.54, 0.78, 0.1, x, 0.93, -0.2); P.box(f, 0.3, 0.2, 0.12, x, 1.44, -0.2); P.box(m.ch, 0.03, 0.42, 0.03, x - 0.26, 0.21, 0.26); P.box(m.ch, 0.03, 0.42, 0.03, x + 0.26, 0.21, 0.26);
      for (const s of [-1, 1]) { P.add(B.or, new THREE.BoxGeometry(0.045, 0.74, 0.012), mx(x + s * 0.13, 0.95, -0.142, 0, 0, s * 0.1)); P.add(B.or, new THREE.BoxGeometry(0.045, 0.3, 0.012), mx(x + s * 0.2, 0.56, 0.1, 1.2, 0, s * 0.5)); } P.cyl(m.ch, 0.035, 0.035, 0.02, x, 0.62, 0.12, 'z', 10); }
    // 頭上: 荷物棚 (扉つき)・握り棒・読書灯
    P.box(m.wh, n * 0.62 + 0.1, 0.36, 0.5, 0, h - 0.34, 0.0); P.box(m.dk, n * 0.62 + 0.1, 0.03, 0.52, 0, h - 0.535, 0.0); for (let i = 0; i < n; i++) { const x = (i - (n - 1) / 2) * 0.62; P.box(m.bk, 0.006, 0.3, 0.01, x - 0.31, h - 0.34, 0.252); P.box(m.ch, 0.12, 0.02, 0.02, x, h - 0.46, 0.258); P.add(glow('#fff6e0', 2.6), new THREE.CircleGeometry(0.03, 8).rotateX(HP), mx(x, h - 0.553, 0.12), 0); }
    P.cyl(B.yl, 0.022, 0.022, n * 0.62, 0, h - 0.62, 0.34, 'x', 8); for (const s of [-1, 1]) P.cyl(m.ch, 0.012, 0.012, 0.1, s * (n * 0.31 - 0.08), h - 0.57, 0.34, 'y', 5);
    e.rect(n * 0.62, 0.6, 0, 0.02);
  },
  /** 天井の酸素マスク収納 (いくつかは下りている) */
  oxygenmasks(P, o, e) {
    const m = MM(), B = BM(), h = e.room.h, n = o.n || 6, w = o.w || 4;
    P.box(m.dk, w, 0.07, 0.4, 0, h - 0.04, 0); for (let i = 0; i < n; i++) { const x = -w / 2 + (i + 0.5) * w / n, down = (i * 5 + 2) % 4 === 0; P.box(m.wh, w / n - 0.08, 0.02, 0.3, x, h - 0.085, 0); P.box(glow(down ? '#ffb030' : '#35ff8a', 2), 0.04, 0.012, 0.04, x + w / n / 2 - 0.1, h - 0.098, 0.12);
      if (down) { P.cyl(m.bk, 0.004, 0.004, 0.5, x, h - 0.35, 0, 'y', 3); P.add(B.yl, new THREE.CylinderGeometry(0.03, 0.06, 0.07, 10, 1, true), mx(x, h - 0.63, 0), 0); P.add(glassMat(), new THREE.SphereGeometry(0.05, 8, 6), mx(x, h - 0.7, 0), 0); } }
  },
  /** 壁掛けの担架棚 (2 段) と点滴・生体モニター */
  stretcherrack(P, o, e) {
    const m = MM(), B = BM();
    for (let k = 0; k < 2; k++) { const y = 0.55 + k * 0.9; P.box(m.ch, 0.06, 0.06, 2.1, -0.34, y, 0); P.box(m.ch, 0.06, 0.06, 2.1, 0.34, y, 0); P.box(flat(0xf0f2f0, 0.9, 0), 0.62, 0.08, 1.9, 0, y + 0.06, 0); P.box(fab(k ? 0x2a8a5a : 0xff7a2a), 0.64, 0.05, 1.1, 0, y + 0.12, 0.3); P.box(flat(0xffffff, 0.9, 0), 0.4, 0.07, 0.28, 0, y + 0.13, -0.72);
      for (const z of [-0.9, 0.9]) P.add(m.dk, new THREE.BoxGeometry(0.5, 0.05, 0.05), mx(-0.6, y - 0.12, z, 0, 0, 0.5)); for (const z of [-0.5, 0.5]) P.add(B.or, new THREE.BoxGeometry(0.66, 0.03, 0.05), mx(0, y + 0.15, z)); }
    P.box(m.dk, 0.06, 2.0, 2.2, -0.74, 1.0, 0); P.cyl(m.ch, 0.012, 0.012, 0.5, 0.2, 2.0, -0.9, 'y', 5); P.add(glassMat(), new THREE.BoxGeometry(0.1, 0.18, 0.04), mx(0.2, 1.72, -0.9), 0); P.box(glow('#6fe8ff', 1.4), 0.08, 0.1, 0.03, 0.2, 1.7, -0.9);
    scr(P, 'graph', '#35ff8a', 'VITAL', 0.44, 0.28, -0.7, 1.9, 0.5, 0, 1.5); P.box(m.dk, 0.5, 0.34, 0.06, -0.71, 1.9, 0.47);
    e.rect(0.85, 2.2, -0.1, 0); if (o.use) e.use(o.label || '担架棚', o.use, 2.2);
  },
  /** 給水器 (温水・冷水) と紙コップ */
  dispenser(P, o, e) {
    const m = MM(); P.box(m.wh, 0.42, 1.0, 0.4, 0, 0.5, 0); P.add(glassMat(), new THREE.CylinderGeometry(0.16, 0.16, 0.4, 16), mx(0, 1.24, 0), 0); P.cyl(glow('#6fe8ff', 0.7), 0.145, 0.145, 0.3, 0, 1.2, 0, 'y', 14); P.sph(m.wh, 0.16, 0, 1.44, 0, 1, 0.5, 1, 14); P.box(m.dk, 0.3, 0.14, 0.04, 0, 0.82, 0.205);
    P.box(glow('#ff5a4a', 2.4), 0.05, 0.05, 0.03, -0.07, 0.84, 0.23); P.box(glow('#6fe8ff', 2.4), 0.05, 0.05, 0.03, 0.07, 0.84, 0.23); P.box(m.st, 0.3, 0.02, 0.14, 0, 0.66, 0.24); for (let i = 0; i < 3; i++) P.cyl(m.wh, 0.035, 0.025, 0.08, 0.3, 1.04 + i * 0.012, 0.05, 'y', 8);
    e.rect(0.45, 0.42); e.use(o.label || '水を飲む', o.use || 'water', 2.0);
  },
  /** 都市図 (壁の大型地図): ネオン・ベイの街路と 15 か所の緊急着陸帯。出動中の着陸帯は橙に点灯する */
  mapwall(P, o, e) {
    const m = MM(), w = o.w || 6, h = o.h || 3.4, y = o.y || 2.6, c = cv(1024, 580), x = c.getContext('2d'), tex = ctex(c, true, false), N = RESCUE.max, pts = [];
    for (let i = 0; i < N; i++) { const a = i * 2.39996 + 0.6, r = 0.16 + 0.3 * Math.sqrt((i + 0.6) / N); pts.push([512 + Math.cos(a) * r * 880, 300 + Math.sin(a) * r * 430]); }
    const base = cv(1024, 580), bx = base.getContext('2d'); let baked = false;
    const bake = (x) => { x.fillStyle = '#04100c'; x.fillRect(0, 0, 1024, 580); x.strokeStyle = 'rgba(53,255,138,.16)'; x.lineWidth = 1;
      for (let i = 0; i < 40; i++) { x.beginPath(); for (let k = 0; k <= 20; k++) { const px = 30 + k * 48.2, py = 46 + i * 13.4 + Math.sin(k * 0.6 + i * 0.3) * 6; k ? x.lineTo(px, py) : x.moveTo(px, py); } x.stroke(); } for (let k = 0; k < 44; k++) { x.beginPath(); for (let i = 0; i <= 20; i++) { const px = 30 + k * 22.4 + Math.sin(i * 0.5 + k * 0.2) * 6, py = 46 + i * 26.2; i ? x.lineTo(px, py) : x.moveTo(px, py); } x.stroke(); }
      x.strokeStyle = 'rgba(111,232,255,.55)'; x.lineWidth = 9; x.beginPath(); x.moveTo(330, 46); x.bezierCurveTo(300, 200, 380, 380, 350, 570); x.stroke(); x.fillStyle = 'rgba(111,232,255,.2)'; x.fillRect(30, 500, 964, 70); // 川と海
      x.strokeStyle = 'rgba(255,210,122,.5)'; x.lineWidth = 4; x.beginPath(); x.moveTo(60, 430); x.lineTo(960, 120); x.stroke(); x.fillStyle = '#4de1ff'; x.beginPath(); x.arc(512, 300, 9, 0, 7); x.fill(); x.font = `700 17px ${JP}`; x.textAlign = 'left'; x.fillText('宇宙港', 526, 306); };
    const draw = (n, t) => { if (!baked) { baked = true; bake(bx); } x.drawImage(base, 0, 0);
      x.textAlign = 'center'; for (let i = 0; i < N; i++) { const [px, py] = pts[i], out = i < n, col = out ? '#ffb030' : '#35ff8a'; x.strokeStyle = col; x.fillStyle = col; x.lineWidth = 2.5; x.beginPath(); x.arc(px, py, out ? 11 + 4 * Math.sin(t * 4 + i) : 8, 0, 7); x.stroke(); x.fillRect(px - 5, py - 1.5, 10, 3); x.fillRect(px - 1.5, py - 5, 3, 10); x.font = `900 15px ${JP}`; x.fillText(String(i + 1).padStart(2, '0'), px, py - 16); }
      x.fillStyle = '#35ff8a'; x.font = `900 26px ${JP}`; x.textAlign = 'left'; x.fillText('NEON BAY ─ 緊急着陸帯 15', 34, 30); x.textAlign = 'right'; x.fillStyle = n ? '#ffb030' : '#35ff8a'; x.fillText(n ? `展開中 ${n}` : '全帯 空き', 990, 30); tex.needsUpdate = true; };
    P.box(m.bk, w + 0.2, h + 0.2, 0.08, 0, y, 0.04); P.box(glow('#35ff8a', 2.2), w + 0.2, 0.035, 0.035, 0, y - h / 2 - 0.14, 0.08); P.add(basic('#fff', 1.4, { map: tex }), new THREE.PlaneGeometry(w, h), mx(0, y, 0.09), 0);
    let acc = 9, first = true; e.anim((dt, t) => { acc += dt; if (acc < 0.5) return; acc = 0; const p = G.modes?.interior?.pos; if (!first && p && Math.hypot(p.x - e.x, p.z - e.z) > 30) return; first = false; draw(rescueN(), t); });
  },
  /** 救助実績の表示板 (出動日数・搬送人数の概算) */
  tally(P, o, e) {
    const m = MM(), w = o.w || 2.6, h = o.h || 1.3, y = o.y || 2.3, c = cv(512, 256), x = c.getContext('2d'), tex = ctex(c, true, false); let last = '';
    P.box(m.bk, w + 0.14, h + 0.14, 0.06, 0, y, 0.03); P.add(basic('#fff', 1.4, { map: tex }), new THREE.PlaneGeometry(w, h), mx(0, y, 0.065), 0);
    e.anim(() => { const p = G.p; if (!p) return; const st = p.flags.rescue || { n: 0, day: 0 }, res = Object.keys(p.flags).filter((k) => k.startsWith('dz')).length, key = st.n + '_' + p.day + '_' + res; if (key === last) return; last = key;
      x.fillStyle = '#04100c'; x.fillRect(0, 0, 512, 256); x.strokeStyle = '#35ff8a'; x.lineWidth = 4; x.strokeRect(6, 6, 500, 244); x.fillStyle = '#35ff8a'; x.textAlign = 'center'; x.font = `900 30px ${JP}`; x.fillText('救助実績', 256, 44);
      x.textAlign = 'left'; x.font = `700 24px ${JP}`; x.fillStyle = '#cfe'; x.fillText('収拾した災害', 34, 104); x.fillText('現在の出動', 34, 152); x.fillText('無事故継続', 34, 200); x.textAlign = 'right'; x.fillStyle = '#ffd27a'; x.font = `900 34px ${JP}`; x.fillText(`${res} 件`, 478, 106); x.fillText(`${st.n} 機`, 478, 154); x.fillText(`${p.day} 日`, 478, 202); tex.needsUpdate = true; });
  },

  // ───────────────────────── 研究・医療 (ファイザー) ─────────────────────────
  /** 培養器 (ガラス扉の奥に光る培地の棚) */
  incubator(P, o, e) {
    const m = MM(), c = o.c || '#ffb060', w = o.w || 1.0;
    P.box(m.wh, w, 1.9, 0.75, 0, 0.95, 0); P.box(m.bk, w - 0.16, 1.4, 0.04, 0, 1.05, 0.36); P.add(glow(c, 0.9), new THREE.PlaneGeometry(w - 0.2, 1.34), mx(0, 1.05, 0.34), 0); P.add(glassMat(), new THREE.BoxGeometry(w - 0.12, 1.44, 0.03), mx(0, 1.05, 0.39), 0); P.box(m.ch, 0.03, 0.5, 0.04, w / 2 - 0.1, 1.05, 0.42);
    for (let j = 0; j < 4; j++) { const y = 0.5 + j * 0.34; P.box(m.ch, w - 0.2, 0.012, 0.3, 0, y, 0.2); for (let i = 0; i < Math.round((w - 0.2) / 0.17); i++) { const x = -w / 2 + 0.2 + i * 0.17; P.cyl(glassMat(), 0.06, 0.06, 0.02, x, y + 0.02, 0.22, 'y', 10); P.cyl(glow(LIQ[(i + j * 2) % 6], 1.4), 0.045, 0.045, 0.012, x, y + 0.018, 0.22, 'y', 10); } }
    scr(P, 'graph', c, '37.0℃', w - 0.3, 0.2, 0, 1.78, 0.377, 0, 1.4); P.box(glow('#35ff8a', 2.4), 0.05, 0.03, 0.02, -w / 2 + 0.1, 0.22, 0.38); P.box(m.dk, w, 0.08, 0.77, 0, 0.04, 0); e.rect(w, 0.78); e.light(c, 5, 1.2, 4);
  },
  /** 遺伝子解析機 (塩基の並びが流れる表示) */
  sequencer(P, o, e) {
    const m = MM(), c = cv(256, 128), x = c.getContext('2d'), tex = ctex(c, true, false), col = { A: '#5dff8a', C: '#4de1ff', G: '#ffd23a', T: '#ff5a6a' }, seq = Array.from({ length: 220 }, (_, i) => 'ACGT'[(i * 7 + (i >> 2) * 5 + (i % 5) * 3) % 4]);
    P.box(m.wh, 1.5, 0.95, 0.8, 0, 0.47, 0); P.box(m.dk, 1.54, 0.05, 0.84, 0, 0.97, 0); P.box(m.wh, 1.5, 0.75, 0.5, 0, 1.36, -0.15); P.add(m.wh, new THREE.BoxGeometry(1.5, 0.05, 0.42), mx(0, 1.13, 0.2, 0.5, 0, 0)); P.add(basic('#fff', 1.5, { map: tex }), new THREE.PlaneGeometry(0.9, 0.44), mx(-0.2, 1.42, 0.104), 0); P.box(m.bk, 0.96, 0.5, 0.03, -0.2, 1.42, 0.086);
    P.add(glassMat(), new THREE.BoxGeometry(0.36, 0.3, 0.3), mx(0.52, 1.24, 0.14), 0); for (let i = 0; i < 8; i++) P.cyl(glow(LIQ[i % 6], 1.6), 0.012, 0.012, 0.1, 0.4 + (i % 4) * 0.08, 1.16, 0.08 + Math.floor(i / 4) * 0.1, 'y', 6); P.box(glow(o.c || e.th.trim, 2.4), 1.5, 0.025, 0.02, 0, 0.92, 0.405); for (let i = 0; i < 4; i++) P.box(m.bk, 0.012, 0.8, 0.01, -0.56 + i * 0.37, 0.47, 0.403);
    let acc = 9, off = 0; e.anim((dt) => { acc += dt; if (acc < 0.16) return; acc = 0; off = (off + 1) % seq.length; x.fillStyle = '#03070c'; x.fillRect(0, 0, 256, 128); x.font = 'bold 15px monospace'; x.textAlign = 'center';
      for (let r = 0; r < 6; r++) for (let k = 0; k < 16; k++) { const b = seq[(off + r * 16 + k) % seq.length]; x.fillStyle = col[b]; x.globalAlpha = r === 5 ? 1 : 0.4 + r * 0.1; x.fillText(b, 12 + k * 15.4, 22 + r * 19); } x.globalAlpha = 1; x.fillStyle = col.C; x.fillRect(8, 118, 60 + ((off * 7) % 180), 4); tex.needsUpdate = true; });
    e.rect(1.55, 0.85); if (o.use) e.use(o.label || '遺伝子解析機', o.use, 2.4);
  },
  /** 超低温フリーザー (霜のついた扉と温度表示) */
  freezer(P, o, e) {
    const m = MM(), n = o.n || 2; for (let i = 0; i < n; i++) { const x = (i - (n - 1) / 2) * 0.92; P.box(m.wh, 0.88, 2.05, 0.8, x, 1.03, 0); P.box(flat(0xdfeaf2, 0.35, 0.3), 0.8, 1.7, 0.04, x, 1.1, 0.41); P.box(m.ch, 0.05, 0.9, 0.06, x + 0.32, 1.1, 0.45); P.box(m.bk, 0.3, 0.14, 0.02, x - 0.2, 1.86, 0.435); P.box(glow('#6fe8ff', 2.6), 0.24, 0.08, 0.012, x - 0.2, 1.86, 0.447);
      P.add(basic('#dff6ff', 0.5, { ...ADD }), new THREE.PlaneGeometry(0.76, 0.5), mx(x, 0.5, 0.434), 0); P.box(m.dk, 0.88, 0.1, 0.8, x, 0.05, 0); P.box(glow('#35ff8a', 2.4), 0.04, 0.04, 0.012, x + 0.05, 1.86, 0.447); }
    const mist = e.dyn(makeGlowSprite('#dff6ff', 1.4, 0.2), 0, 0.2, 0.6), p0 = mist.position.clone(); e.anim((dt, t) => { const k = (t * 0.2 + e.x) % 1; mist.position.y = p0.y + k * 0.5; mist.scale.setScalar(1 + k * 1.6); mist.material.opacity = 0.3 * Math.sin(k * Math.PI); }); e.rect(n * 0.92, 0.82);
  },
  /** ガラス棚 (試薬瓶・標本瓶が並ぶ) */
  glassshelf(P, o, e) {
    const m = MM(), w = o.w || 2.4, h = o.h || 2.2; for (const s of [-1, 1]) P.box(m.ch, 0.04, h, 0.36, s * w / 2, h / 2, 0); P.add(glassMat(), new THREE.BoxGeometry(w, h, 0.02), mx(0, h / 2, 0.17), 0); P.box(m.wh, w, h, 0.03, 0, h / 2, -0.17); P.box(glow('#f6f2ff', 2.2), w - 0.2, 0.02, 0.04, 0, h - 0.06, 0.1);
    for (let j = 0; j < 5; j++) { const y = 0.12 + j * (h - 0.3) / 4; P.add(glassMat(), new THREE.BoxGeometry(w - 0.06, 0.016, 0.32), mx(0, y, 0), 0); let x = -w / 2 + 0.16; while (x < w / 2 - 0.12) { const t = e.rnd(), r = 0.045 + e.rnd() * 0.035, hh = 0.12 + e.rnd() * 0.16, c = LIQ[Math.floor(e.rnd() * 6)];
        if (t < 0.6) { P.add(glassMat(), new THREE.CylinderGeometry(r, r, hh, 10, 1, true), mx(x, y + hh / 2 + 0.01, 0), 0); P.cyl(glow(c, 1.0 + e.rnd() * 0.8), r * 0.86, r * 0.86, hh * (0.4 + e.rnd() * 0.4), x, y + hh * 0.3 + 0.01, 0, 'y', 8); P.cyl(m.bk, r * 0.6, r * 0.6, 0.03, x, y + hh + 0.02, 0, 'y', 8); }
        else if (t < 0.85) { P.box(m.wh, r * 2.2, hh * 0.8, 0.14, x, y + hh * 0.4 + 0.01, 0); P.box(glow(c, 1.2), r * 1.6, 0.03, 0.01, x, y + hh * 0.5, 0.072); } x += r * 2 + 0.05 + e.rnd() * 0.06; } }
    e.rect(w, 0.38);
  },
  /** 分注ロボット (96 穴プレートの上を、ヘッドが縦横に動く) */
  pipettebot(P, o, e) {
    const m = MM(), c = o.c || e.th.trim;
    P.box(m.wh, 1.7, 0.86, 0.9, 0, 0.43, 0); P.box(flat(0x23272e, 0.25, 0.4), 1.74, 0.05, 0.94, 0, 0.885, 0); for (const s of [-1, 1]) { P.box(m.ch, 0.06, 0.9, 0.06, s * 0.8, 1.36, -0.4); P.box(m.ch, 0.06, 0.9, 0.06, s * 0.8, 1.36, 0.4); P.box(m.ch, 0.06, 0.06, 0.86, s * 0.8, 1.8, 0); } P.add(glassMat(), new THREE.BoxGeometry(1.66, 0.86, 0.02), mx(0, 1.36, 0.43), 0); P.box(glow(c, 2.4), 1.7, 0.025, 0.02, 0, 0.84, 0.455);
    for (const px of [-0.45, 0.05, 0.5]) { P.box(m.bk, 0.38, 0.03, 0.26, px, 0.925, 0.05); for (let i = 0; i < 8; i++) for (let j = 0; j < 5; j++) P.cyl(glow(LIQ[(i + j + Math.round(px * 4)) % 6], 1.5), 0.012, 0.012, 0.012, px - 0.15 + i * 0.043, 0.945, -0.04 + j * 0.045, 'y', 5); }
    const bar = e.dyn(new THREE.Mesh(new THREE.BoxGeometry(0.07, 0.07, 0.82), m.dk), 0, 1.76, 0), head = new THREE.Group(), hb = new Builder(); hb.box(m.wh, 0.2, 0.3, 0.16, 0, -0.16, 0); for (let i = 0; i < 4; i++) hb.add(m.ch, new THREE.CylinderGeometry(0.006, 0.003, 0.22, 5), mx(-0.06 + i * 0.04, -0.42, 0)); hb.box(glow(c, 3), 0.12, 0.02, 0.01, 0, -0.1, 0.082); head.add(hb.build({ shadow: false })); const hg = e.dyn(new THREE.Group(), 0, 1.76, 0); hg.add(head);
    const p0 = bar.position.clone(), ca = Math.cos(e.ang), sa = Math.sin(e.ang);
    e.anim((dt, t) => { const lx = Math.sin(t * 0.5 + e.x) * 0.6, lz = Math.sin(t * 1.3 + e.z) * 0.24, dip = Math.max(0, Math.sin(t * 2.6)) * 0.22; bar.position.set(p0.x + lx * ca, p0.y, p0.z - lx * sa); hg.position.set(p0.x + lx * ca + lz * sa, p0.y - dip, p0.z - lx * sa + lz * ca); });
    e.rect(1.75, 0.95);
  },
  /** 無塵服の吊り棚 (白い防護服とフード) */
  garmentrack(P, o, e) {
    const m = MM(), n = o.n || 4, w = n * 0.56; P.cyl(m.ch, 0.02, 0.02, w + 0.2, 0, 1.95, 0, 'x', 8); for (const s of [-1, 1]) { P.cyl(m.ch, 0.02, 0.02, 1.95, s * (w / 2 + 0.1), 0.975, 0, 'y', 8); P.box(m.ch, 0.06, 0.03, 0.5, s * (w / 2 + 0.1), 0.015, 0); }
    for (let i = 0; i < n; i++) { const x = (i - (n - 1) / 2) * 0.56, S = flat(i % 3 === 1 ? 0xd8d0f4 : 0xf4f6fa, 0.9, 0); P.add(m.ch, new THREE.TorusGeometry(0.03, 0.006, 4, 10, Math.PI * 1.5), mx(x, 1.99, 0, 0, HP, 0)); P.add(S, new THREE.CapsuleGeometry(0.19, 0.6, 4, 12), mx(x, 1.38, 0, 0, 0, 0, 1, 1, 0.42), 0); for (const s of [-1, 1]) { P.add(S, new THREE.CapsuleGeometry(0.07, 0.6, 4, 8), mx(x + s * 0.24, 1.36, 0, 0, 0, s * 0.14, 1, 1, 0.5), 0); P.add(S, new THREE.CapsuleGeometry(0.085, 0.7, 4, 8), mx(x + s * 0.1, 0.56, 0, 0, 0, 0, 1, 1, 0.5), 0); }
      P.add(S, new THREE.SphereGeometry(0.14, 12, 10), mx(x, 1.88, 0, 0, 0, 0, 1, 1.1, 0.5), 0); P.add(glassMat(), new THREE.PlaneGeometry(0.16, 0.1), mx(x, 1.9, 0.075), 0); }
    e.rect(w + 0.2, 0.5);
  },
};
