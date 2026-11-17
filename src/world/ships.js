// 宇宙船モデル: 主人公機 3 隻 + 敵艦ジェネレータ (すべてプロシージャル)
import * as THREE from 'three';
import { Builder, loft, slab, mirrorX, mx } from '../gfx/builder.js';
import { mat, glow } from '../gfx/textures.js';
import { rng, rr } from '../core/util.js';
import { makePlume, makeGlowSprite } from '../gfx/fx.js';
import { hasImage, texSet } from '../gfx/materials.js';
import { ENEMY_CLASSES } from './defs.js';

const V = (x, y, z) => new THREE.Vector3(x, y, z);
const glassMat = () => { const m = new THREE.MeshStandardMaterial({ color: 0x06121f, roughness: 0.04, metalness: 1, envMapIntensity: 2.6 }); m.userData.uvs = 0; return m; };
let GLASS;

function nozzleBase(b, dark, glowM, x, y, z, r, len = 1) {
  dark = mat('nozzle-heat', { color: 0xb8bcc4, rough: 0.5, metal: 0.85 }); // 焼け色の付いたノズル
  b.cyl(dark, r * 0.9, r, len, x, y, z, 'z', 24, true);
  b.cyl(dark, r * 1.08, r * 1.02, len * 0.25, x, y, z - len * 0.4, 'z', 24);
  b.add(dark, new THREE.CylinderGeometry(r * 0.5, r * 0.92, len * 0.7, 24, 1, true), mx(x, y, z - len * 0.1, Math.PI / 2, 0, 0)); // 内側コーン
  b.add(glowM, new THREE.CircleGeometry(r * 0.72, 24), mx(x, y, z - len * 0.2), 0);
}
function gear(b, m, pts, h) {
  for (const [x, z] of pts) { b.cyl(m, 0.09, 0.12, h, x, -h / 2, z, 'y', 10); b.box(m, 0.5, 0.1, 0.8, x, -h, z); b.cyl(m, 0.05, 0.05, h * 0.8, x * 0.8, -h * 0.4, z + 0.3, 'y', 6); }
}
function finish(b, o) {
  const root = new THREE.Group(), tilt = new THREE.Group(); root.add(tilt);
  const body = b.build(); tilt.add(body);
  o.obj = root; o.tilt = tilt; o.body = body; o.plumes = []; o.glows = [];
  for (const e of o.engines) {
    const p = makePlume(e.r, o.glowColor, e.len ?? e.r * 9); p.position.copy(e.p); tilt.add(p); o.plumes.push(p);
    const s = makeGlowSprite(o.glowColor, e.r * 7); s.position.copy(e.p); tilt.add(s); o.glows.push(s);
  }
  if (o.gearB) { o.gear = o.gearB.build(); o.gear.position.y = o.gearY; o.gear.visible = false; tilt.add(o.gear); }
  if (o.spinB) { o.spin = o.spinB.build(); o.spin.position.copy(o.spinP); tilt.add(o.spin); }
  return o;
}

// ───────────────────────── ハヤテ (疾風) ─────────────────────────
function hayate() {
  const b = new Builder(), H = mat('hayate-hull', { color: 0xf2f4f8, rough: 0.62, metal: 0.25 }), A = mat('hull', { color: 0xff6a12, rough: 0.55, metal: 0.2 }), D = mat('carbon-fiber', { color: 0x6a6f78, rough: 0.8, metal: 0.6 });
  const GC = glow('#55c8ff', 7), GO = glow('#ff8a2a', 3);
  b.add(H, loft([{ z: -8.5, w: 0.04, t: 0.04, y: -0.05 }, { z: -7.6, w: 0.22, t: 0.18, b: 0.16, y: -0.04 }, { z: -6, w: 0.48, t: 0.38, b: 0.32 }, { z: -4.2, w: 0.78, t: 0.62, b: 0.48 }, { z: -2.2, w: 1.02, t: 0.86, b: 0.6 },
    { z: 0, w: 1.18, t: 0.92, b: 0.66 }, { z: 2.5, w: 1.3, t: 0.82, b: 0.68 }, { z: 5, w: 1.25, t: 0.7, b: 0.62 }, { z: 6.6, w: 1.0, t: 0.55, b: 0.5 }, { z: 7.2, w: 0.8, t: 0.42, b: 0.4 }].map((s) => ({ e: 2.6, ...s })), 40));
  b.add(GLASS, loft([{ z: -4.7, w: 0.05, t: 0.05, b: 0, y: 0.5 }, { z: -4, w: 0.36, t: 0.34, b: 0, y: 0.5 }, { z: -3, w: 0.5, t: 0.52, b: 0, y: 0.6 }, { z: -2, w: 0.52, t: 0.5, b: 0, y: 0.72 }, { z: -1.2, w: 0.4, t: 0.3, b: 0, y: 0.8 }, { z: -0.7, w: 0.1, t: 0.05, b: 0, y: 0.84 }], 24), null, 0);
  b.box(D, 0.06, 0.05, 3.6, 0, 1.2, -2.7); // キャノピーフレーム
  const wing = [[0.9, -2.2], [2.2, 0.6], [6.2, 3.6], [6.2, 5.0], [3.4, 5.4], [0.9, 5.6]];
  b.add(H, slab(wing, 0.18, 0.05), mx(0, -0.12, 0)); b.add(H, slab(mirrorX(wing), 0.18, 0.05), mx(0, -0.12, 0));
  const tipA = [[4.6, 2.4], [6.2, 3.6], [6.2, 5.0], [5.2, 5.15]];
  b.add(A, slab(tipA, 0.2, 0.05), mx(0, -0.11, 0)); b.add(A, slab(mirrorX(tipA), 0.2, 0.05), mx(0, -0.11, 0));
  const can = [[0.6, -5.2], [2.1, -3.9], [2.1, -3.4], [0.6, -3.6]];
  b.add(A, slab(can, 0.08, 0.02), mx(0, 0.05, 0)); b.add(A, slab(mirrorX(can), 0.08, 0.02), mx(0, 0.05, 0));
  for (const s of [-1, 1]) {
    b.add(D, loft([{ z: 1.6, w: 0.3, t: 0.3 }, { z: 2.4, w: 0.66, t: 0.62 }, { z: 5.5, w: 0.7, t: 0.66 }, { z: 7.2, w: 0.6, t: 0.58 }].map((q) => ({ ...q, x: s * 1.75, y: 0.05 })), 24));
    nozzleBase(b, D, GC, s * 1.75, 0.05, 7.6, 0.6, 1.0);
    b.add(H, slab([[0, 3.6], [0, 6.9], [2.1, 7.6], [2.1, 6.3]], 0.1, 0.03), mx(s * 1.75, 0.55, 0, 0, 0, s > 0 ? 1.22 : Math.PI - 1.22));
    b.cyl(D, 0.13, 0.15, 4.4, s * 6.2, -0.12, 2.2, 'z', 12); b.cyl(D, 0.2, 0.2, 1.4, s * 6.2, -0.12, 3.8, 'z', 12);
    b.cyl(GO, 0.08, 0.08, 0.1, s * 6.2, -0.12, -0.02, 'z', 10);
    b.box(GO, 0.05, 0.03, 2.4, s * 3.4, -0.01, 2.6, s * -0.75);
    b.sph(glow(s > 0 ? '#3f6' : '#f33', 5), 0.07, s * 6.3, -0.02, 4.9);
    b.box(D, 0.5, 0.36, 1.8, s * 0.95, -0.52, -1.6); // インテーク
  }
  b.box(D, 0.3, 0.16, 5, 0, 0.92, 2.4); b.box(A, 0.34, 0.05, 2.2, 0, 1.0, 3.6);
  b.cyl(D, 0.02, 0.02, 1.2, 0, 1.3, 4.6, 'y', 6); b.sph(glow('#fff', 6), 0.05, 0, 1.92, 4.6);
  const gb = new Builder(); gear(gb, D, [[0, -5], [-1.6, 3.4], [1.6, 3.4]], 1.1);
  return finish(b, { id: 'hayate', glowColor: '#55c8ff', engines: [{ p: V(-1.75, 0.05, 8.0), r: 0.5 }, { p: V(1.75, 0.05, 8.0), r: 0.5 }], guns: [V(-6.2, -0.12, -0.3), V(6.2, -0.12, -0.3)],
    gearB: gb, gearY: -0.6, bottom: 1.8, cam: { d: 26, h: 5.5 }, cockpit: V(0, 0.95, -2.8) });
}

// ───────────────────────── ライデン (雷電) ─────────────────────────
function raiden() {
  const b = new Builder(), H = mat('raiden-hull', { color: 0xc4cad2, rough: 0.6, metal: 0.4 }), A = mat('ablative', { color: 0xb81f1f, rough: 0.55, metal: 0.25 }), D = mat('blasted-steel', { color: 0x40454f, rough: 0.8, metal: 0.6 });
  const GE = glow('#ff9a3a', 7), GW = glow('#bfe8ff', 3.5), GR = glow('#ff3020', 4);
  const e = (a, ex = 6) => a.map((s) => ({ e: ex, ...s }));
  b.add(H, loft(e([{ z: -18, w: 0.6, t: 0.5, b: 0.6 }, { z: -16, w: 1.8, t: 1.1, b: 1.3 }, { z: -12, w: 3.0, t: 1.7, b: 1.9 }, { z: -6, w: 3.9, t: 2.2, b: 2.2 }, { z: 2, w: 4.3, t: 2.4, b: 2.3 }, { z: 10, w: 4.1, t: 2.3, b: 2.2 }, { z: 15, w: 3.4, t: 2.0, b: 1.9 }, { z: 17, w: 2.8, t: 1.6, b: 1.6 }], 5), 40));
  b.add(H, loft(e([{ z: -10.5, w: 0.9, t: 0.3, b: 0 }, { z: -8.6, w: 1.5, t: 1.3, b: 0 }, { z: -3.5, w: 1.7, t: 1.5, b: 0 }, { z: -1.2, w: 1.5, t: 1.0, b: 0 }, { z: 0.5, w: 1.0, t: 0.2, b: 0 }], 4).map((s) => ({ ...s, y: 2.1 })), 24)); // 艦橋
  b.box(GW, 2.2, 0.32, 0.08, 0, 3.05, -9.42, 0, 0.5); b.box(GW, 0.06, 0.3, 3.6, 1.68, 3.0, -6.2); b.box(GW, 0.06, 0.3, 3.6, -1.68, 3.0, -6.2);
  for (const s of [-1, 1]) {
    b.add(H, loft(e([{ z: -9, w: 0.7, t: 0.6 }, { z: -7, w: 1.3, t: 1.0 }, { z: 5, w: 1.4, t: 1.1 }, { z: 8, w: 0.9, t: 0.7 }], 5).map((q) => ({ ...q, x: s * 6.1, y: -0.3 })), 20)); // 武装ポッド
    b.add(D, slab([[3.6, -5], [5.2, -4], [5.2, 4], [3.6, 6]], 0.5, 0.1), mx(s > 0 ? 0 : 0, -0.3, 0, 0, 0, 0, s, 1, 1));
    for (const dy of [0.35, -0.45]) { b.cyl(D, 0.2, 0.24, 7.5, s * 6.1, -0.3 + dy, -11.5, 'z', 12); b.cyl(D, 0.3, 0.3, 0.8, s * 6.1, -0.3 + dy, -14.9, 'z', 12); b.cyl(GR, 0.1, 0.1, 0.06, s * 6.1, -0.3 + dy, -15.32, 'z', 8); }
    b.add(A, slab([[1.2, -14], [3.3, -9], [3.7, 1], [1.2, 1]], 0.25, 0.06), mx(0, 2.0, 0, 0, 0, s * -0.16, s, 1, 1)); // 上面装甲
    b.add(A, slab([[1.6, 3], [3.9, 3], [3.6, 13], [1.6, 14]], 0.25, 0.06), mx(0, 2.25, 0, 0, 0, s * -0.08, s, 1, 1));
    b.add(H, slab([[0, 9], [0, 16.5], [3.4, 18], [3.4, 14.5]], 0.22, 0.05), mx(s * 3.2, 1.6, 0, 0, 0, s > 0 ? 0.95 : Math.PI - 0.95)); // 尾翼
    for (const dy of [0.95, -0.95]) nozzleBase(b, D, GE, s * 1.75, dy - 0.05, 17.9, 0.92, 1.6);
    b.box(GR, 0.07, 0.1, 5, s * 4.28, 0.6, 3); b.sph(glow(s > 0 ? '#3f6' : '#f33', 5), 0.1, s * 7.5, -0.3, 2);
    b.box(D, 0.9, 1.3, 3.2, s * 3.9, -1.2, -9.5); // 下部インテーク
  }
  b.box(D, 3.0, 2.6, 2.2, 0, 0, 17.2);
  b.cyl(D, 1.1, 1.3, 0.7, 0, 2.75, 5, 'y', 16); b.box(D, 1.5, 0.6, 1.8, 0, 3.3, 4.6);
  for (const s of [-0.4, 0.4]) b.cyl(D, 0.14, 0.16, 4.2, s, 3.35, 2.0, 'z', 10);
  b.add(H, slab([[0, -4], [0, 10], [2.4, 9], [2.4, 2]], 0.3, 0.06), mx(0, -2.2, 0, 0, 0, -Math.PI / 2)); // 腹部キール
  b.cyl(D, 0.04, 0.04, 3.4, 1.2, 4.6, -4, 'y', 6); b.cyl(D, 0.9, 0.05, 0.4, -1.0, 3.9, -2.4, 'y', 16); b.sph(glow('#fff', 6), 0.07, 1.2, 6.3, -4);
  const gb = new Builder(); gear(gb, D, [[0, -11], [-3, 8], [3, 8], [-3, -2], [3, -2]], 1.6);
  return finish(b, { id: 'raiden', glowColor: '#ff9a3a', engines: [V(-1.75, 0.9, 18.9), V(1.75, 0.9, 18.9), V(-1.75, -1.0, 18.9), V(1.75, -1.0, 18.9)].map((p) => ({ p, r: 0.8 })),
    guns: [V(-6.1, 0.05, -15.5), V(6.1, 0.05, -15.5), V(-6.1, -0.75, -15.5), V(6.1, -0.75, -15.5)], gearB: gb, gearY: -2.2, bottom: 3.9, cam: { d: 50, h: 11 }, cockpit: V(0, 3.1, -8) });
}

// ───────────────────────── アマツ (天津) ─────────────────────────
function amatsu() {
  const b = new Builder(), H = mat('amatsu-hull', { color: 0xfaf7ee, rough: 0.55, metal: 0.2 }), A = new THREE.MeshStandardMaterial({ color: 0xd4a84a, roughness: 0.25, metalness: 1 }), D = mat('carbon-fiber', { color: 0x6a6f78, rough: 0.8, metal: 0.6 }), S = mat('solar', { rough: 1, metal: 0.9, env: 1.6 });
  A.userData.uvs = 0;
  const GE = glow('#40ffd8', 7), GW = glow('#ffe2a8', 3);
  b.add(H, loft([{ z: -26, w: 0.1, t: 0.1 }, { z: -24, w: 1.0, t: 0.9, b: 0.7 }, { z: -20, w: 2.2, t: 2.0, b: 1.3 }, { z: -14, w: 3.0, t: 2.4, b: 1.7 }, { z: -6, w: 3.2, t: 2.3, b: 1.9 }, { z: 4, w: 2.8, t: 2.1, b: 1.9 }, { z: 14, w: 2.4, t: 1.9, b: 1.8 }, { z: 22, w: 2.0, t: 1.6, b: 1.6 }, { z: 25, w: 1.5, t: 1.2, b: 1.2 }].map((s) => ({ e: 2.2, ...s })), 48));
  b.add(GLASS, loft([{ z: -23.6, w: 0.3, t: 0.2, b: 0 }, { z: -21, w: 1.7, t: 1.5, b: 0 }, { z: -17, w: 2.3, t: 2.0, b: 0 }, { z: -13, w: 2.2, t: 1.7, b: 0 }, { z: -11, w: 1.4, t: 0.6, b: 0 }].map((s) => ({ ...s, y: 0.75 })), 32), null, 0);
  for (const z of [-21, -19, -17, -15, -13]) b.tor(A, z < -19 ? 1.72 + (z + 21) * 0.27 : 2.3 - Math.abs(z + 16) * 0.06, 0.05, 0, 0.75, z, 0, 0, 0, 32, 6, Math.PI);
  b.box(A, 0.08, 0.08, 11, 0, 2.72, -17, 0, 0.13);
  for (const z of [-9, -1.5, 8.5, 20]) b.tor(A, z < 0 ? 3.05 : z < 10 ? 2.62 : 2.02, 0.09, 0, z < 10 ? 0.12 : 0, z, 0, 0, 0, 48, 8);
  for (let i = 0; i < 9; i++) for (const s of [-1, 1]) b.box(GW, 0.05, 0.22, 0.5, s * 3.1, 0.5, -9.5 + i * 1.3);
  // 回転居住環
  const sb = new Builder();
  sb.tor(H, 11, 1.25, 0, 0, 0, 0, 0, 0, 96, 14); sb.tor(A, 11, 1.32, 0, 0, 0, 0, 0, 0, 96, 4);
  sb.tor(GW, 12.22, 0.06, 0, 0, 0.5, 0, 0, 0, 96, 4); sb.tor(GW, 12.22, 0.06, 0, 0, -0.5, 0, 0, 0, 96, 4);
  for (let i = 0; i < 4; i++) { const a = i * Math.PI / 2 + 0.4; sb.add(H, new THREE.CylinderGeometry(0.4, 0.5, 8.4, 12), mx(Math.cos(a) * 6.2, Math.sin(a) * 6.2, 0, 0, 0, a - Math.PI / 2)); sb.add(D, new THREE.BoxGeometry(2.2, 1.4, 2.8), mx(Math.cos(a) * 11, Math.sin(a) * 11, 0, 0, 0, a)); }
  sb.cyl(D, 3.0, 3.0, 2.2, 0, 0, 0, 'z', 32);
  // 推進器 ×3
  const eng = [];
  for (let i = 0; i < 3; i++) {
    const a = Math.PI / 2 + i * 2.0944, x = Math.cos(a) * 3.3, y = Math.sin(a) * 3.3;
    b.add(H, loft([{ z: 11, w: 0.4, t: 0.4 }, { z: 13, w: 1.25, t: 1.25 }, { z: 21, w: 1.35, t: 1.35 }, { z: 24.5, w: 1.1, t: 1.1 }].map((q) => ({ ...q, x, y })), 28));
    b.tor(A, 1.33, 0.07, x, y, 15, 0, 0, 0, 32, 6); b.tor(A, 1.3, 0.07, x, y, 22, 0, 0, 0, 32, 6);
    nozzleBase(b, D, GE, x, y, 25.2, 1.0, 1.6); eng.push({ p: V(x, y, 26.2), r: 0.9 });
    b.add(H, slab([[0, 13], [0, 21], [1.6, 20], [1.6, 15]], 0.3, 0.08), mx(Math.cos(a) * 1.9, Math.sin(a) * 1.9, 0, 0, 0, a));
  }
  // 太陽電池翼
  for (const s of [-1, 1]) {
    b.box(D, 0.25, 0.25, 13, s * 3.2, 0, 14.5, 0, 0, 0); b.cyl(D, 0.14, 0.14, 12.5, s * 9.3, -0.6, 16, 'x', 8);
    for (let k = 0; k < 3; k++) { b.box(S, 3.7, 0.06, 7.5, s * (5.3 + k * 4.0), -0.6, 16); b.box(A, 3.8, 0.1, 0.12, s * (5.3 + k * 4.0), -0.6, 12.2); b.box(A, 3.8, 0.1, 0.12, s * (5.3 + k * 4.0), -0.6, 19.8); }
    b.sph(glow(s > 0 ? '#3f6' : '#f33', 5), 0.1, s * 15.4, -0.6, 16);
  }
  b.cyl(D, 0.09, 0.14, 9, 0, -1.0, -28.5, 'z', 8); b.cyl(A, 0.7, 0.05, 0.5, 0, -1.0, -33.2, 'z', 20); b.sph(glow('#fff', 6), 0.08, 0, 2.9, 22);
  const gb = new Builder(); gear(gb, D, [[0, -18], [-2.2, 12], [2.2, 12], [-2.2, -4], [2.2, -4]], 1.8);
  return finish(b, { id: 'amatsu', glowColor: '#40ffd8', engines: eng, guns: [V(-3.2, 0, -8), V(3.2, 0, -8)], gearB: gb, gearY: -1.8, bottom: 3.7, spinB: sb, spinP: V(0, 0, 4),
    cam: { d: 70, h: 15 }, cockpit: V(0, 2.4, -18) });
}

// ───────────────────────── 敵艦 (ヴォイド艦隊) ─────────────────────────
export function buildEnemy(def) {
  const r = rng(def.seed), b = new Builder(), sc = rr(r, 0.9, 1.2), C = def.cls ? ENEMY_CLASSES[def.cls] : null, has = (n) => hasImage('materials/' + n);
  const tint = new THREE.Color(def.glow).multiplyScalar(0.12).add(new THREE.Color(0x3a3c46));
  const H = C && has(C.hull) ? mat(C.hull, { rough: 0.5, metal: 0.55, uvs: 0.11 }) : mat('enemy-plating', { color: tint.getHex(), rough: 0.5, metal: 0.55 }), A = mat('hull', { color: new THREE.Color(def.glow).multiplyScalar(0.45).getHex(), rough: 0.5, metal: 0.4 }), D = C && has('en-scorched-metal') ? mat('en-scorched-metal', { color: 0x9a9ea6, rough: 0.6, metal: 0.8, uvs: 0.2 }) : mat('enemy-engine', { color: 0x5a5e66, rough: 0.8, metal: 0.7 });
  const noz = [], nozzle = (b2, d2, g2, x, y, z, rr2, len = 1) => { noz.push({ x, y, z, r: rr2, len }); nozzleBase(b2, d2, g2, x, y, z, rr2, len); }; // 艦種つきの艦は噴射口に絵を貼るので位置を覚える
  const GL = glow(def.glow, 5), GE = glow(def.glow, 8);
  const F = (secs, seg = 8) => loft(secs, seg, true);
  const engines = [], guns = [];
  let top = 2;
  const L = 34 * sc;
  if (def.arch === 0) { // ダガー: 楔形
    const w = rr(r, 4.5, 6) * sc, h = rr(r, 1.5, 2.1) * sc;
    b.add(H, F([{ z: -L / 2, w: 0.1, t: 0.1 }, { z: -L * 0.2, w: w * 0.45, t: h * 0.7 }, { z: L * 0.25, w, t: h }, { z: L / 2, w: w * 0.7, t: h * 0.8 }].map((s) => ({ e: 1, ...s }))));
    const bl = [[w * 0.5, -L * 0.1], [w * 2.0, L * 0.34], [w * 1.6, L * 0.45], [w * 0.6, L * 0.4]];
    b.add(A, slab(bl, 0.35, 0.1), mx(0, -0.2, 0)); b.add(A, slab(mirrorX(bl), 0.35, 0.1), mx(0, -0.2, 0));
    b.add(H, slab([[0, L * 0.05], [0, L * 0.45], [3.5 * sc, L * 0.5], [3.5 * sc, L * 0.3]], 0.3, 0.08), mx(0, h * 0.6, 0, 0, 0, Math.PI / 2));
    nozzle(b, D, GE, 0, 0, L / 2 + 0.6, 1.5 * sc, 1.8); engines.push({ p: V(0, 0, L / 2 + 1.6), r: 1.3 * sc });
    for (const s of [-1, 1]) { nozzle(b, D, GE, s * w * 0.5, 0, L / 2 + 0.3, 0.7 * sc, 1.2); engines.push({ p: V(s * w * 0.5, 0, L / 2 + 1), r: 0.6 * sc }); b.box(GL, 0.08, 0.12, L * 0.4, s * w * 0.42, h * 0.5, L * 0.12, s * -0.14); guns.push(V(s * w * 1.9, -0.2, L * 0.3)); b.cyl(D, 0.18, 0.22, 6, s * w * 1.9, -0.2, L * 0.3 + 1, 'z', 6); }
    top = h;
  } else if (def.arch === 1) { // クロー: 二股
    const g = rr(r, 2.6, 3.6) * sc;
    for (const s of [-1, 1]) {
      b.add(H, F([{ z: -L / 2, w: 0.15, t: 0.15 }, { z: -L * 0.3, w: 1.0 * sc, t: 0.9 * sc }, { z: 0, w: 1.5 * sc, t: 1.3 * sc }, { z: L * 0.15, w: 1.2 * sc, t: 1.1 * sc }].map((q) => ({ e: 1.2, ...q, x: s * g })), 6));
      b.box(GL, 0.08, 0.14, L * 0.3, s * (g - 1.1 * sc), 0, -L * 0.18); guns.push(V(s * g, 0, -L / 2));
      nozzle(b, D, GE, s * 2 * sc, 0, L / 2 + 0.4, 1.1 * sc, 1.6); engines.push({ p: V(s * 2 * sc, 0, L / 2 + 1.3), r: 1.0 * sc });
      b.add(A, slab([[g, L * 0.0], [g + 5 * sc, L * 0.3], [g + 4 * sc, L * 0.42], [g - 1, L * 0.3]], 0.3, 0.08), mx(0, 0.2, 0, 0, 0, 0, s, 1, 1));
    }
    b.add(H, F([{ z: -L * 0.12, w: 1.5 * sc, t: 1.0 * sc }, { z: L * 0.05, w: 4.4 * sc, t: 2.2 * sc }, { z: L * 0.38, w: 4.0 * sc, t: 2.0 * sc }, { z: L / 2, w: 3.2 * sc, t: 1.6 * sc }].map((q) => ({ e: 1.6, ...q })), 8));
    top = 2.2 * sc;
  } else if (def.arch === 2) { // マンタ: 扁平
    const w = rr(r, 9, 12) * sc;
    b.add(H, F([{ z: -L * 0.42, w: 0.2, t: 0.1 }, { z: -L * 0.15, w: w * 0.5, t: 1.0 * sc }, { z: L * 0.12, w, t: 1.4 * sc }, { z: L * 0.34, w: w * 0.75, t: 1.1 * sc }, { z: L * 0.42, w: w * 0.3, t: 0.7 * sc }].map((q) => ({ e: 1.1, ...q })), 8));
    b.add(A, F([{ z: -L * 0.2, w: 0.5, t: 0.4 }, { z: -L * 0.05, w: 2.2 * sc, t: 1.6 * sc }, { z: L * 0.2, w: 2.0 * sc, t: 1.5 * sc }, { z: L * 0.36, w: 1.0, t: 0.6 }].map((q) => ({ e: 1.4, ...q, y: 0.8 * sc })), 6));
    for (const s of [-1, 1]) {
      b.add(H, slab([[0, L * 0.02], [0, L * 0.3], [3.2 * sc, L * 0.38], [3.2 * sc, L * 0.2]], 0.25, 0.06), mx(s * w * 0.82, 0.3, 0, 0, 0, s > 0 ? 1.2 : Math.PI - 1.2));
      b.box(GL, w * 0.5, 0.1, 0.1, s * w * 0.45, 0.72 * sc, L * 0.14, s * -0.5); guns.push(V(s * w * 0.6, -0.4, -L * 0.05));
      nozzle(b, D, GE, s * w * 0.3, 0, L * 0.4, 0.9 * sc, 1.4); engines.push({ p: V(s * w * 0.3, 0, L * 0.4 + 1), r: 0.8 * sc });
    }
    nozzle(b, D, GE, 0, 0.2, L * 0.44, 1.2 * sc, 1.6); engines.push({ p: V(0, 0.2, L * 0.44 + 1.2), r: 1.1 * sc });
    top = 2.4 * sc;
  } else { // スパイン: 背骨と肋
    b.add(H, F([{ z: -L * 0.36, w: 1.0 * sc, t: 1.0 * sc }, { z: L * 0.3, w: 1.5 * sc, t: 1.5 * sc }, { z: L / 2, w: 2.4 * sc, t: 2.2 * sc }].map((q) => ({ e: 1.5, ...q })), 6));
    b.add(A, F([{ z: -L / 2, w: 3.0 * sc, t: 0.5 }, { z: -L * 0.42, w: 5.5 * sc, t: 1.5 * sc }, { z: -L * 0.3, w: 4.0 * sc, t: 1.2 * sc }, { z: -L * 0.24, w: 1.0, t: 0.8 }].map((q) => ({ e: 1.2, ...q })), 8));
    for (let i = 0; i < 5; i++) { const z = -L * 0.14 + i * L * 0.1, R = (3.4 + Math.sin(i * 1.3) * 0.8) * sc; b.tor(D, R, 0.28 * sc, 0, 0, z, 0, 0, Math.PI / 6, 6, 4); b.tor(GL, R + 0.3 * sc, 0.05, 0, 0, z, 0, 0, Math.PI / 6, 6, 4); for (let k = 0; k < 3; k++) { const a = k * 2.094 + 0.52; b.add(D, new THREE.BoxGeometry(0.3, R, 0.3), mx(Math.cos(a) * R / 2, Math.sin(a) * R / 2, z, 0, 0, a - Math.PI / 2)); } }
    for (const s of [-1, 1]) { guns.push(V(s * 4.6 * sc, 0, -L / 2)); b.cyl(D, 0.2, 0.25, 5, s * 4.6 * sc, 0, -L / 2 + 1.5, 'z', 6); for (const y of [-1, 1]) { nozzle(b, D, GE, s * 1.25 * sc, y * 1.15 * sc, L / 2 + 0.5, 0.75 * sc, 1.3); engines.push({ p: V(s * 1.25 * sc, y * 1.15 * sc, L / 2 + 1.3), r: 0.7 * sc }); } }
    top = 2.2 * sc;
  }
  // 艦橋の「眼」と接舷ポート
  b.box(GL, 1.6 * sc, 0.16, 0.1, 0, top * 0.55, def.arch === 3 ? -L * 0.47 : -L * 0.16, 0, 0.5);
  b.cyl(D, 1.5, 1.7, 0.6, 0, top + 0.2, L * 0.16, 'y', 12); b.tor(glow('#9ff', 3), 1.25, 0.07, 0, top + 0.55, L * 0.16, Math.PI / 2, 0, 0, 24, 6);
  const fx = C ? classParts(b, def, C, { r, L, sc, top, H, A, D, GL, GE, guns, engines, noz, has }) : null;
  const o = finish(b, { id: def.id, glowColor: def.glow, engines, guns, bottom: top + 1, cam: { d: 60, h: 12 } });
  o.radius = L * 0.62; o.len = L; o.port = { p: V(0, top + 0.6, L * 0.16), dir: V(0, 1, 0) };
  if (fx) fx(o);
  return o;
}

// ───────────────────────── 艦種ごとの艤装・塗装・効果 ─────────────────────────
const ADDM = (map, color, opacity = 1) => new THREE.MeshBasicMaterial({ map, color: new THREE.Color(color), transparent: true, opacity, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide, toneMapped: false });
/** 絵を 1 枚貼った板 (o.cut = 背景を抜いた絵、o.glow = 光らせる強さ)。画像が無ければ何もしない */
function pic(b, name, w, h, x, y, z, rx = 0, ry = 0, rz = 0, o = {}) {
  if (!hasImage('materials/' + name)) return false;
  const m = mat(name, { rough: o.rough ?? 0.5, metal: o.metal ?? 0.4, ...(o.cut ? { cut: 1 } : {}), ...(o.glow ? { emissive: '#ffffff', ei: o.glow, emap: 'materials/' + name + '/color' } : {}) });
  b.add(m, new THREE.PlaneGeometry(w, h), mx(x, y, z, rx, ry, rz), 0); return true;
}
/** 船体の形ごとの、側面の板 (紋章) と機首の板 (ノーズアート) の位置: [x, y, z, 高さ] */
function plates(arch, L, sc, top) {
  if (arch === 0) return { side: [2.6 * sc, 0, L * 0.18, 1.2 * sc], nose: [1.6 * sc, 0.1, -L * 0.2, 0.9 * sc] };
  if (arch === 1) return { side: [4.3 * sc, 0, L * 0.22, 1.5 * sc], nose: [4.6 * sc, 0, -L * 0.24, 0.9 * sc] };
  if (arch === 2) return { side: [2.2 * sc, 0.9 * sc, L * 0.08, 1.1 * sc], nose: [2.2 * sc, 0.9 * sc, -L * 0.08, 0.8 * sc] };
  return { side: [2.3 * sc, 0, L * 0.38, 1.4 * sc], nose: [5.6 * sc, 0, -L * 0.4, 0.9 * sc] };
}
function classParts(b, def, C, k) {
  const { L, sc, top, H, D, GL, guns, noz, has } = k, P = plates(def.arch, L, sc, top), parts = C.parts || [];
  // 側面の装甲板と紋章・機首のノーズアート (横長 3:1 の絵)
  const plate = ([x, y, z, h], img, glowK) => { for (const s of [-1, 1]) { b.box(H, 0.3, h * 1.1, h * 3.3, s * x, y, z); pic(b, img, h * 3, h, s * (x + 0.17), y, z, 0, s * Math.PI / 2, 0, { glow: glowK, metal: 0.3, cut: img !== 'en-noseart-fang' }); } }; // 紋章は背景を抜いた絵、牙のノーズアートは板ごと
  if (C.mark && has(C.mark)) plate(P.side, C.mark);
  if (C.nose && has(C.nose)) plate(P.nose, C.nose);
  if (parts.includes('lights') && has('en-id-lights')) { const [x, y, z, h] = P.side; for (const s of [-1, 1]) pic(b, 'en-id-lights', h * 2.4, h * 0.8, s * (x + 0.17), y - h * 1.0, z, 0, s * Math.PI / 2, 0, { glow: 1.6 }); }
  // 噴射口の絵 (噴射口の出口に、後ろ向きに貼る)
  for (const n of noz) pic(b, C.eng, n.r * 2.2, n.r * 2.2, n.x, n.y, n.z + n.len * 0.5 + 0.03, 0, 0, 0, { cut: 1, glow: C.eng === 'en-nozzle-inner' ? 0.25 : 1.4 });
  const M = (n, fb, o = {}) => (has(n) ? mat(n, { rough: o.rough ?? 0.5, metal: o.metal ?? 0.5 }) : fb);
  for (const p of parts) {
    if (p === 'dish') { b.cyl(D, 0.15, 0.2, 2.2 * sc, 0, top + 1.1 * sc, L * 0.05, 'y', 8); b.cyl(D, 1.6 * sc, 0.3, 0.8 * sc, 0, top + 2.5 * sc, L * 0.05, 'z', 20); pic(b, 'en-sensor-dish', 3.4 * sc, 3.4 * sc, 0, top + 2.6 * sc, L * 0.05 - 0.42 * sc, 0, Math.PI, 0, { cut: 1 }); }
    else if (p === 'tanks') { const T = M('en-fuel-tank', D); for (const s of [-1, 1]) { b.cyl(T, 1.5 * sc, 1.5 * sc, L * 0.5, s * 5.5 * sc, -0.8 * sc, L * 0.08, 'z', 20); b.sph(T, 1.5 * sc, s * 5.5 * sc, -0.8 * sc, L * 0.08 - L * 0.25, 1, 1, 0.5); b.sph(T, 1.5 * sc, s * 5.5 * sc, -0.8 * sc, L * 0.08 + L * 0.25, 1, 1, 0.5); } }
    else if (p === 'arms') { for (const s of [-1, 1]) { b.cyl(D, 0.35, 0.35, 6 * sc, s * 3 * sc, -1.2 * sc, -L * 0.35, 'z', 10); b.sph(D, 0.6 * sc, s * 3 * sc, -1.2 * sc, -L * 0.35 - 3 * sc); for (const t of [-1, 1]) b.box(H, 0.3, 0.3, 1.8 * sc, s * 3 * sc + t * 0.45 * sc, -1.2 * sc, -L * 0.35 - 3.9 * sc, t * 0.35); } }
    else if (p === 'guns') { for (const s of [-1, 1]) for (const y of [0.6, -0.8]) { b.cyl(D, 0.22, 0.3, 7 * sc, s * 3.4 * sc, y * sc, -L * 0.25, 'z', 8); guns.push(V(s * 3.4 * sc, y * sc, -L * 0.25 - 3.6 * sc)); } b.box(M('en-hull-scrap', H), 3 * sc, 1.2 * sc, 4 * sc, 0, top + 0.4, L * 0.25, 0.2); }
    else if (p === 'torpedo') { b.box(H, 4.4 * sc, 2.2 * sc, 6 * sc, 0, -1.6 * sc, -L * 0.28); pic(b, 'en-torpedo-tubes', 4.2 * sc, 2.1 * sc, 0, -1.6 * sc, -L * 0.28 - 3 * sc - 0.02, 0, Math.PI, 0); guns.length = 0; for (const x of [-1, 1]) guns.push(V(x * 1.1 * sc, -1.6 * sc, -L * 0.28 - 3.2 * sc)); }
    else if (p === 'mines') { for (const s of [-1, 1]) { b.box(D, 1.2 * sc, 3 * sc, 6 * sc, s * 4.6 * sc, -0.4 * sc, L * 0.22); pic(b, 'en-mine-rack', 6 * sc, 3 * sc, s * (4.6 * sc + 0.62 * sc), -0.4 * sc, L * 0.22, 0, s * Math.PI / 2, 0, { cut: 1 }); } for (let i = 0; i < 3; i++) { const z = L * 0.32 + i * 1.6 * sc; b.sph(D, 0.6 * sc, 0, -2.2 * sc, z); for (const [ax, ay] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) b.cyl(D, 0.02, 0.12, 0.6 * sc, ax * 0.75 * sc, -2.2 * sc + ay * 0.75 * sc, z, ax ? 'x' : 'y', 5); } }
    else if (p === 'ram') { const R = M('en-hull-ram', H); b.add(R, new THREE.ConeGeometry(2.6 * sc, 9 * sc, 6), mx(0, 0, -L * 0.5 - 2.5 * sc, -Math.PI / 2, 0, 0)); b.box(M('en-paint-stripes', R), 5.4 * sc, 0.25, 3 * sc, 0, top * 0.6, -L * 0.3); }
    else if (p === 'clamp') { b.tor(D, 2.2 * sc, 0.45 * sc, 0, 0, -L * 0.5 - 0.6, 0, 0, 0, 24, 8); pic(b, 'en-boarding-clamp', 5.6 * sc, 5.6 * sc, 0, 0, -L * 0.5 - 1.2, 0, Math.PI, 0, { cut: 1 }); }
    else if (p === 'radiators') { const F = M('en-radiator-fins', D, { metal: 0.7 }); for (const s of [-1, 1]) for (let i = 0; i < 4; i++) b.box(F, 3.2 * sc, 0.12, 2.4 * sc, s * (6 + i * 0.4) * sc, 1.0 + i * 0.5, L * (0.05 + i * 0.08), 0, 0, s * 0.35); for (const z of [-0.05, 0.12]) pic(b, 'en-reactor-vent', 2.4 * sc, 2.4 * sc, 0, 2.6 * sc, L * z, -Math.PI / 2, 0, 0, { cut: 1, glow: 1.2 }); }
    else if (p === 'cannon') { b.cyl(D, 1.6 * sc, 1.9 * sc, 1.2 * sc, 0, top + 0.6 * sc, -L * 0.05, 'y', 16); b.box(H, 2.6 * sc, 1.4 * sc, 3.6 * sc, 0, top + 1.6 * sc, -L * 0.05); b.cyl(D, 0.45 * sc, 0.55 * sc, 12 * sc, 0, top + 1.6 * sc, -L * 0.05 - 7.5 * sc, 'z', 12); guns.length = 0; guns.push(V(0, top + 1.6 * sc, -L * 0.05 - 13.6 * sc)); }
    else if (p === 'pods') { guns.length = 0; for (const s of [-1, 1]) { b.box(H, 3.4 * sc, 3.4 * sc, 5 * sc, s * 6.2 * sc, 0, -L * 0.05); pic(b, 'en-missile-pod', 3.3 * sc, 3.3 * sc, s * 6.2 * sc, 0, -L * 0.05 - 2.5 * sc - 0.02, 0, Math.PI, 0); for (const y of [-1, 1]) guns.push(V(s * 6.2 * sc, y * 0.8 * sc, -L * 0.05 - 2.8 * sc)); } }
    else if (p === 'bombbay') { b.box(H, 5 * sc, 1.6 * sc, 9 * sc, 0, -1.8 * sc, L * 0.05); pic(b, 'en-bomb-bay', 4.6 * sc, 8.4 * sc, 0, -2.62 * sc, L * 0.05, Math.PI / 2, 0, 0); guns.push(V(0, -2.8 * sc, -L * 0.05)); }
    else if (p === 'stealth') { for (const s of [-1, 1]) b.add(H, slab([[0, -L * 0.1], [5 * sc, L * 0.2], [4 * sc, L * 0.42], [0, L * 0.35]], 0.25, 0.04), mx(0, top * 0.9, 0, 0, 0, s * 0.18, s, 1, 1)); }
    else if (p === 'ew') { for (const ry of [0, Math.PI / 2]) pic(b, 'en-ew-array', 5 * sc, 5 * sc, 0, top + 2.6 * sc, L * 0.2, 0, ry, 0, { cut: 1 }); b.cyl(D, 0.25, 0.3, 1.2 * sc, 0, top + 0.6 * sc, L * 0.2, 'y', 8); }
    else if (p === 'rail') { const RC = M('en-rail-coils', D, { metal: 0.8 }); b.cyl(RC, 0.7 * sc, 0.7 * sc, L * 0.75, 0, -1.8 * sc, -L * 0.25, 'z', 16); b.cyl(D, 0.35 * sc, 0.35 * sc, 6 * sc, 0, -1.8 * sc, -L * 0.62 - 3 * sc, 'z', 10); guns.length = 0; guns.push(V(0, -1.8 * sc, -L * 0.62 - 6.2 * sc)); }
    else if (p === 'antennas') { for (const [x, z, h] of [[0, L * 0.25, 5], [1.6, L * 0.3, 3.4], [-1.6, L * 0.3, 3.4]]) { b.cyl(D, 0.06, 0.12, h * sc, x * sc, top + h * sc / 2, z, 'y', 6); b.sph(GL, 0.16, x * sc, top + h * sc, z); } }
    else if (p === 'coolant') { const CP = M('en-coolant-pipes', D, { metal: 0.6 }); for (const s of [-1, 1]) b.box(CP, 0.8 * sc, 1.6 * sc, L * 0.55, s * 4.6 * sc, -0.6 * sc, L * 0.1); }
    else if (p === 'dronebay') { for (const s of [-1, 1]) { b.box(H, 0.8 * sc, 3 * sc, 4.4 * sc, s * 4.4 * sc, 0, L * 0.12); pic(b, 'en-drone-bay', 4.2 * sc, 2.9 * sc, s * (4.4 * sc + 0.42 * sc), 0, L * 0.12, 0, s * Math.PI / 2, 0); } for (let i = 0; i < 4; i++) { const a = i * 1.57 + 0.4; b.add(D, new THREE.ConeGeometry(0.5 * sc, 1.6 * sc, 3), mx(Math.cos(a) * 9 * sc, Math.sin(a) * 3 * sc + 2, L * 0.1, -Math.PI / 2, 0, 0)); } }
  }
  // 宇宙での効果: 盾の泡 (六角の網)、アフターバーナーの炎、砲口の閃光。あとから o.tilt に付ける
  return (o) => {
    if (parts.includes('shield') && has('en-shield-hex')) { const t = texSet('en-shield-hex').map; t.repeat.set(6, 3); const sh = new THREE.Mesh(new THREE.SphereGeometry(L * 0.62, 32, 18), ADDM(t, def.glow, 0.16)); sh.renderOrder = 2; o.tilt.add(sh); o.bubble = sh; }
    if (C.eng === 'en-afterburner' && has('en-engine-plume')) { const pm = ADDM(texSet('en-engine-plume').map, '#ffffff', 0.85); for (const e of o.engines) for (const ry of [0, Math.PI / 2]) { const g = new THREE.PlaneGeometry(e.r * 2.6, e.r * 9); g.translate(0, -e.r * 4.5, 0); const m = new THREE.Mesh(g, pm); m.position.copy(e.p); m.rotation.set(-Math.PI / 2, ry, 0, 'XYZ'); o.tilt.add(m); } } // 炎の板を十字に 2 枚、後ろ (+Z) へ伸ばす
    if (has('en-muzzle-flash')) { const t = texSet('en-muzzle-flash').map; o.flashes = o.guns.map((gp) => { const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: t, color: new THREE.Color(def.glow).lerp(new THREE.Color('#ffffff'), 0.5), transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false })); sp.scale.setScalar(3.2 * sc); sp.position.copy(gp); sp.visible = false; o.tilt.add(sp); return sp; }); }
  };
}

const BUILD = { hayate, raiden, amatsu };
export function buildShip(id) {
  if (!GLASS) GLASS = glassMat();
  return BUILD[id]();
}
