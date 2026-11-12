// 救助船「ミケーネ」(アトラス救難基地所属・最大 15 機) と、それを操縦・運用する救難ボット
import * as THREE from 'three';
import { Builder, loft, slab, mirrorX, mx } from '../gfx/builder.js';
import { mat, glow, cv, ctex, JP } from '../gfx/textures.js';
import { G } from '../core/util.js';

const HP = Math.PI / 2, TAU = Math.PI * 2;
let _M;
const MM = () => _M || (_M = {
  H: mat('hull', { color: 0xf4f5f1, rough: 0.5, metal: 0.25 }),      // 白い外板
  A: mat('hull', { color: 0xff5412, rough: 0.5, metal: 0.2 }),       // インターナショナル・オレンジ
  D: mat('hull', { color: 0x30353d, rough: 0.8, metal: 0.6 }),       // 機械部
  K: mat('flat', { color: 0x14171b, rough: 0.5, metal: 0.55 }),      // 黒い樹脂・ゴム
  C: mat('flat', { color: 0xd4d9df, rough: 0.14, metal: 1 }),        // 磨いた金属
  W: mat('flat', { color: 0x241a10, rough: 0.2, metal: 0.3, emissive: '#ffcf90', ei: 1.5 }), // 室内灯のともる窓
  GL: Object.assign(new THREE.MeshStandardMaterial({ color: 0x06121f, roughness: 0.04, metalness: 1, envMapIntensity: 2.6 }), { userData: { uvs: 0 } }),
});
/** 機体に描かれた文字 (塗装)。発光しない */
const LIV = new Map();
function livery(text, color = '#e04a0c', w = 1024, h = 160, weight = 900) {
  const key = text + color; let m = LIV.get(key); if (m) return m;
  const c = cv(w, h), x = c.getContext('2d'); x.font = `${weight} ${h * 0.7}px ${JP}`; x.textAlign = 'center'; x.textBaseline = 'middle'; x.fillStyle = color;
  const tw = x.measureText(text).width; if (tw > w * 0.96) x.font = `${weight} ${h * 0.7 * w * 0.96 / tw}px ${JP}`; x.fillText(text, w / 2, h * 0.54);
  m = new THREE.MeshStandardMaterial({ map: ctex(c, true, false), alphaTest: 0.45, roughness: 0.55, metalness: 0.1, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2 }); m.userData.uvs = 0; LIV.set(key, m);
  return m;
}
function nozzle(b, dark, glowM, x, y, z, r, len = 1) {
  b.cyl(dark, r * 0.9, r, len, x, y, z, 'z', 20, true); b.cyl(dark, r * 1.08, r * 1.02, len * 0.25, x, y, z - len * 0.4, 'z', 20);
  b.add(dark, new THREE.CylinderGeometry(r * 0.5, r * 0.92, len * 0.7, 20, 1, true), mx(x, y, z - len * 0.1, HP, 0, 0)); b.add(glowM, new THREE.CircleGeometry(r * 0.72, 20), mx(x, y, z - len * 0.2), 0);
}
/** 揚力ファン (ダクテッドファン)。下面が発光する */
function duct(b, m, x, y, z, R, hh, fanGlow) {
  b.cyl(m.H, R, R * 0.96, hh, x, y, z, 'y', 28, true); b.cyl(m.K, R * 0.9, R * 0.9, hh * 0.98, x, y, z, 'y', 28, true); b.tor(m.A, R * 0.98, R * 0.06, x, y + hh / 2, z, HP, 0, 0, 36, 6); b.tor(m.D, R * 0.95, R * 0.05, x, y - hh / 2, z, HP, 0, 0, 36, 6);
  b.cyl(m.D, R * 0.2, R * 0.24, hh * 0.9, x, y, z, 'y', 12); b.sph(m.C, R * 0.2, x, y + hh * 0.45, z, 1, 0.6, 1, 12);
  for (let i = 0; i < 3; i++) b.box(m.D, R * 1.86, hh * 0.12, R * 0.1, x, y + hh * 0.2, z, i * Math.PI / 3);
  for (let i = 0; i < 7; i++) b.add(m.K, new THREE.BoxGeometry(R * 0.72, 0.03, R * 0.26), mx(x + Math.cos(i * TAU / 7) * R * 0.52, y - hh * 0.05, z + Math.sin(i * TAU / 7) * R * 0.52, 0.5, -i * TAU / 7, 0));
  b.add(fanGlow, new THREE.RingGeometry(R * 0.26, R * 0.86, 28).rotateX(HP), mx(x, y - hh * 0.36, z), 0);
}

/**
 * 救助船ミケーネ: 4 基の揚力ファンで垂直離着陸する箱型の救難輸送機。全長 27m。機首 = -Z、スキッドの接地面は y = -3.7
 * o.landed = 後部ランプを下ろした駐機姿
 */
export function buildMycenae(o = {}) {
  const m = MM(), b = new Builder(), GF = glow('#9fe8ff', 3.2), GE = glow('#7fd8ff', 6), GX = glow('#35ff8a', 1.5), E = 4.5;
  const fus = [{ z: -13.2, w: 1.6, t: 1.0, b: 1.2, y: -0.4 }, { z: -12.2, w: 2.6, t: 1.7, b: 1.7, y: -0.25 }, { z: -10.4, w: 3.15, t: 2.3, b: 2.1, y: -0.1 }, { z: -8, w: 3.35, t: 2.6, b: 2.3 }, { z: -5, w: 3.4, t: 2.7, b: 2.4 }, { z: 6, w: 3.4, t: 2.7, b: 2.4 }, { z: 9.5, w: 3.3, t: 2.7, b: 2.1 }, { z: 12, w: 2.95, t: 2.6, b: 1.4 }, { z: 13.4, w: 2.5, t: 2.4, b: 0.7, y: 0.1 }].map((s) => ({ e: E, ...s }));
  b.add(m.H, loft(fus, 32));
  // 風防 (機首を包む大きな曲面ガラス) と窓枠
  const can = [{ z: -13.0, w: 1.3, t: 0.45 }, { z: -12.2, w: 2.66, t: 1.42 }, { z: -10.4, w: 3.2, t: 2.2 }, { z: -8.6, w: 3.39, t: 2.5 }, { z: -7.6, w: 3.43, t: 2.57 }, { z: -7.25, w: 3.0, t: 2.2 }].map((s) => ({ ...s, b: 0.001, y: 0.15, e: E }));
  b.add(m.GL, loft(can, 32), null, 0);
  for (const [z, w, t] of [[-10.4, 3.2, 2.2], [-8.6, 3.39, 2.5]]) b.add(m.D, loft([{ z: z - 0.07, w: w + 0.03, t: t + 0.03, b: 0.001, y: 0.15, e: E }, { z: z + 0.07, w: w + 0.03, t: t + 0.03, b: 0.001, y: 0.15, e: E }], 32));
  b.add(m.D, new THREE.BoxGeometry(0.14, 0.1, 3.7), mx(0, 2.37, -10.45, -0.28, 0, 0)); b.add(m.D, new THREE.BoxGeometry(0.14, 0.1, 2.0), mx(0, 2.74, -8.0, -0.06, 0, 0));
  b.box(m.D, 6.9, 0.14, 5.6, 0, 0.13, -10.1);
  // 塗装: 機首下面・風防の後ろ・尾部はオレンジ
  b.add(m.A, loft([{ z: -13.26, w: 1.63, b: 1.23, y: -0.4 }, { z: -12.2, w: 2.63, b: 1.73, y: -0.25 }, { z: -10.4, w: 3.18, b: 2.13, y: -0.1 }, { z: -8, w: 3.38, b: 2.33, y: 0 }, { z: -7.3, w: 3.42, b: 2.36, y: 0 }].map((s) => ({ ...s, t: 0.02 - s.y, e: E })), 32));
  b.add(m.A, loft([{ z: -7.22, w: 3.42, t: 2.67, b: 2.36 }, { z: -6.6, w: 3.44, t: 2.72, b: 2.4 }, { z: -5.85, w: 3.44, t: 2.74, b: 2.43 }].map((s) => ({ ...s, e: E })), 32));
  b.add(m.A, loft([{ z: 9.3, w: 3.345, t: 2.74, b: 2.16 }, { z: 9.5, w: 3.34, t: 2.74, b: 2.14 }, { z: 12, w: 2.99, t: 2.64, b: 1.44 }, { z: 13.45, w: 2.54, t: 2.44, b: 0.74, y: 0.1 }].map((s) => ({ e: E, ...s })), 32));
  b.box(m.D, 5.6, 0.24, 17, 0, -2.32, 0.6); for (const z of [-5, -1, 3, 7]) b.box(m.K, 5.9, 0.3, 0.5, 0, -2.3, z);
  // 主翼 (高翼) と 4 基の揚力ファン
  const wing = [[0, -3.2], [3.4, -3.2], [10.0, -1.4], [10.0, 2.7], [3.4, 4.4], [0, 4.4]], tip = [[8.3, -1.92], [10.0, -1.4], [10.0, 2.7], [8.3, 3.14]];
  b.add(m.H, slab(wing, 0.5, 0.12), mx(0, 2.78, 0)); b.add(m.H, slab(mirrorX(wing), 0.5, 0.12), mx(0, 2.78, 0)); b.add(m.A, slab(tip, 0.54, 0.12), mx(0, 2.78, 0)); b.add(m.A, slab(mirrorX(tip), 0.54, 0.12), mx(0, 2.78, 0));
  b.box(m.D, 6.2, 0.2, 6.6, 0, 3.08, 0.6); b.box(GX, 3.2, 0.05, 0.95, 0, 3.2, 0.6); b.box(GX, 0.95, 0.05, 3.2, 0, 3.2, 0.6); // 屋根の緑十字 (上空から識別できる)
  for (const s of [-1, 1]) {
    duct(b, m, s * 11.5, 2.75, 0.65, 2.35, 1.5, GF);
    b.add(m.H, slab([[3.3, -6.4], [4.7, -6.2], [4.7, -4.3], [3.3, -3.9]], 0.34, 0.08), mx(0, 1.05, 0, 0, 0, 0, s, 1, 1)); duct(b, m, s * 5.95, 1.05, -5.25, 1.45, 1.1, GF);
    // 尾翼 (外に傾いた双垂直尾翼)
    b.add(m.H, slab([[0, 8.4], [0, 13.2], [3.7, 14.4], [3.7, 11.9]], 0.2, 0.05), mx(s * 2.5, 2.5, 0, 0, 0, s > 0 ? 1.28 : Math.PI - 1.28)); b.add(m.A, slab([[2.5, 10.75], [2.5, 14.0], [3.7, 14.4], [3.7, 11.9]], 0.24, 0.05), mx(s * 2.5, 2.5, 0, 0, 0, s > 0 ? 1.28 : Math.PI - 1.28));
    nozzle(b, m.D, GE, s * 2.25, 1.35, 13.75, 0.82, 1.5); b.add(m.D, loft([{ z: 9.6, w: 0.4, t: 0.4 }, { z: 11, w: 0.95, t: 0.9 }, { z: 13.2, w: 0.92, t: 0.9 }].map((q) => ({ ...q, x: s * 2.25, y: 1.35 })), 20));
    // 窓 (室内灯がともる)・側面の緑十字・文字
    for (let i = 0; i < 4; i++) { b.box(m.K, 0.1, 1.06, 1.56, s * 3.39, 1.12, 2.5 + i * 1.95); b.box(m.W, 0.12, 0.84, 1.34, s * 3.4, 1.12, 2.5 + i * 1.95); }
    b.box(GX, 0.06, 0.62, 1.9, s * 3.43, 0.65, -0.15); b.box(GX, 0.06, 1.9, 0.62, s * 3.43, 0.65, -0.15);
    b.add(livery('RESCUE 救難'), new THREE.PlaneGeometry(6.6, 1.03), mx(s * 3.436, -0.78, 5.4, 0, s * HP, 0), 0);
    b.add(livery('MYCENAE　ミケーネ ─ ATLAS RESCUE FLEET', '#3a4048', 1024, 64, 700), new THREE.PlaneGeometry(7.4, 0.46), mx(s * 3.432, 2.06, 5.4, 0, s * HP, 0), 0);
    // 側面扉 (左舷は乗降扉、右舷はホイスト扉)
    for (const [dy, dz, hh, ww] of [[0.35, -5.55, 3.4, 0.08], [0.35, -2.55, 3.4, 0.08], [2.02, -4.05, 0.08, 3.08], [-1.32, -4.05, 0.08, 3.08]]) b.box(m.D, 0.07, hh, ww, s * 3.415, dy, dz);
    b.box(m.K, 0.1, 0.9, 1.5, s * 3.39, 1.12, -4.05); b.box(m.W, 0.12, 0.7, 1.3, s * 3.4, 1.12, -4.05); b.box(m.C, 0.08, 0.1, 0.5, s * 3.44, 0.1, -3.0);
    b.box(glow('#ffd23a', 1.4), 0.05, 0.12, 2.9, s * 3.44, -1.5, -4.05);
    // スキッド
    b.cyl(m.C, 0.15, 0.15, 15.5, s * 2.95, -3.55, -0.6, 'z', 10); b.add(m.C, new THREE.CylinderGeometry(0.15, 0.15, 1.5, 10), mx(s * 2.95, -3.28, -8.95, HP - 0.42, 0, 0)); b.add(m.C, new THREE.SphereGeometry(0.16, 10, 8), mx(s * 2.95, -2.96, -9.63));
    for (const z of [-6.4, -0.6, 5.2]) { b.add(m.D, new THREE.CylinderGeometry(0.11, 0.13, 1.5, 8), mx(s * 2.72, -2.92, z, 0, 0, s * -0.32)); b.box(m.K, 0.5, 0.16, 0.9, s * 2.95, -3.5, z); }
    b.sph(glow(s > 0 ? '#3f6' : '#f33', 5), 0.12, s * 13.86, 2.75, 0.65, 1, 1, 1, 8);
    // 機首下の探照灯
    b.add(m.D, new THREE.CylinderGeometry(0.34, 0.3, 0.5, 14), mx(s * 1.35, -1.72, -11.75, 1.1, 0, 0)); b.add(glow('#fff6e0', 7), new THREE.CircleGeometry(0.26, 14), mx(s * 1.35, -1.83, -11.98, 1.1 - HP + Math.PI, 0, 0), 0);
  }
  // 屋根: 警光灯バー・衛星通信ドーム・アンテナ・ホイスト
  b.box(m.K, 3.3, 0.2, 0.62, 0, 2.86, -6.55); b.box(glow('#ff2a1e', 4), 1.3, 0.24, 0.5, -0.9, 2.99, -6.55); b.box(glow('#2a6cff', 4), 1.3, 0.24, 0.5, 0.9, 2.99, -6.55); b.box(glow('#ffffff', 3), 0.34, 0.22, 0.5, 0, 2.99, -6.55);
  b.sph(m.H, 0.95, 0, 3.15, 5.4, 1, 0.55, 1, 20); b.cyl(m.D, 1.0, 1.05, 0.14, 0, 3.12, 5.4, 'y', 20); b.cyl(m.D, 0.025, 0.025, 2.4, 1.6, 4.25, 7.4, 'y', 5); b.cyl(m.D, 0.025, 0.025, 1.6, -1.6, 3.85, 7.4, 'y', 5); b.sph(glow('#fff', 6), 0.07, 1.6, 5.5, 7.4, 1, 1, 1, 6);
  b.box(m.D, 0.55, 0.5, 2.3, 3.62, 2.55, -4.05); b.box(m.A, 2.1, 0.26, 0.34, 4.6, 2.62, -4.05); b.cyl(m.K, 0.25, 0.25, 0.4, 5.5, 2.62, -4.05, 'z', 12); b.cyl(m.K, 0.018, 0.018, 1.5, 5.5, 1.75, -4.05, 'y', 4); b.add(m.C, new THREE.TorusGeometry(0.13, 0.035, 6, 14, Math.PI * 1.5), mx(5.5, 0.9, -4.05, 0, 0, -0.8));
  // 尾部: 貨物扉の開口部とランプ
  b.box(m.K, 4.5, 3.0, 0.3, 0, -0.1, 13.28); b.box(glow('#ffe2b0', 2.2), 3.8, 0.08, 0.06, 0, 1.3, 13.45); b.box(glow('#ff2a1e', 4), 0.5, 0.2, 0.06, -2.05, 0.2, 13.5); b.box(glow('#ff2a1e', 4), 0.5, 0.2, 0.06, 2.05, 0.2, 13.5);
  if (o.landed) {
    b.add(m.D, new THREE.BoxGeometry(4.3, 0.2, 6.6), mx(0, -2.58, 15.75, 0.375, 0, 0)); b.add(mat('grate', { color: 0x8a9096, rough: 0.6, metal: 0.7 }), new THREE.BoxGeometry(3.7, 0.04, 6.4), mx(0, -2.46, 15.8, 0.375, 0, 0));
    for (const s of [-1, 1]) { b.add(glow('#ffd23a', 1.6), new THREE.BoxGeometry(0.16, 0.05, 6.4), mx(s * 2.0, -2.45, 15.8, 0.375, 0, 0)); b.add(m.C, new THREE.CylinderGeometry(0.06, 0.06, 3.5, 6), mx(s * 2.2, -1.0, 14.6, -0.75, 0, 0)); }
  } else b.add(m.A, new THREE.BoxGeometry(4.3, 0.2, 3.6), mx(0, 0.0, 13.75, 1.38, 0, 0));
  const g = b.build(); g.userData.engines = [new THREE.Vector3(-2.25, 1.35, 14.6), new THREE.Vector3(2.25, 1.35, 14.6)]; g.userData.clear = 3.7;
  return g;
}

/** 船内の窓から見える自機の主翼と揚力ファン (内装用) */
export function wingOutside(b, cx, y, z) {
  const m = MM(), GF = glow('#9fe8ff', 3.2);
  b.box(m.H, 20.4, 0.5, 7.4, cx, y, z); b.box(m.D, 20.6, 0.12, 0.5, cx, y - 0.3, z - 3.4); b.box(m.D, 20.6, 0.12, 0.5, cx, y - 0.3, z + 3.4);
  for (const s of [-1, 1]) { b.box(m.A, 3.2, 0.54, 7.44, cx + s * 8.7, y, z); duct(b, m, cx + s * 11.6, y - 0.05, z + 0.6, 2.35, 1.5, GF); duct(b, m, cx + s * 6.1, y - 1.25, z - 7.2, 1.45, 1.1, GF); b.box(m.H, 1.6, 0.34, 2.2, cx + s * 4.4, y - 1.25, z - 7.2); b.box(glow(s > 0 ? '#3f6' : '#f33', 5), 0.2, 0.2, 0.2, cx + s * 14.0, y, z + 0.6);
    for (let k = 0; k < 4; k++) b.box(glow('#ffd23a', 1.4), 0.5, 0.03, 0.12, cx + s * (4.4 + k * 1.3), y - 0.262, z + 2.9); }
}
/** Builder で作った機体を n 機ぶん InstancedMesh にまとめる (マテリアルごとに 1 ドローコール) */
export function instanced(group, n) {
  const g = new THREE.Group(), list = [];
  group.traverse((o) => { if (!o.isMesh) return; const im = new THREE.InstancedMesh(o.geometry, o.material, n); im.frustumCulled = false; im.castShadow = im.receiveShadow = false; g.add(im); list.push(im); });
  g.userData.set = (i, mtx) => { for (const im of list) im.setMatrixAt(i, mtx); };
  g.userData.commit = () => { for (const im of list) im.instanceMatrix.needsUpdate = true; };
  return g;
}
/** 同じジオメトリを共有する複製 (個別に表示・非表示を切り替えたいとき用) */
export function cloneShared(group) { const g = new THREE.Group(); group.traverse((o) => { if (o.isMesh) { const m = new THREE.Mesh(o.geometry, o.material); m.castShadow = true; m.receiveShadow = true; g.add(m); } }); return g; }

// ───────────────────────── 救難ボット ─────────────────────────
/**
 * 人型の救難ボット。pose: 'sit' (操縦席) | 'stand'。role で配色が変わる
 * 戻り値の userData.tick(dt, t, yawToPlayer, dist) で頭・腕・目が動く
 */
export function makeBot(o = {}) {
  const m = MM(), sit = o.pose === 'sit', acc = o.accent || 0xff5412, eyeC = o.eye || '#6fe8ff', A = mat('flat', { color: acc, rough: 0.45, metal: 0.25 }), Wm = mat('flat', { color: o.body || 0xf2f3f0, rough: 0.4, metal: 0.2 });
  const g = new THREE.Group(), b = new Builder(), cap = (B, mt, r, l, x, y, z, rx = 0, rz = 0) => B.add(mt, new THREE.CapsuleGeometry(r, l, 4, 12), mx(x, y, z, rx, 0, rz), 0);
  const y0 = sit ? -0.4 : 0; // 上半身の高さ
  // 胴体
  b.add(Wm, new THREE.CapsuleGeometry(0.19, 0.26, 5, 16), mx(0, 1.3 + y0, 0, 0, 0, 0, 1.28, 1, 1), 0); b.box(m.K, 0.36, 0.2, 0.24, 0, 0.98 + y0, 0); b.add(m.D, new THREE.CylinderGeometry(0.12, 0.15, 0.14, 12), mx(0, 1.08 + y0, 0));
  b.box(A, 0.34, 0.2, 0.05, 0, 1.38 + y0, 0.185); b.box(glow('#35ff8a', 2.4), 0.11, 0.035, 0.012, 0, 1.38 + y0, 0.212); b.box(glow('#35ff8a', 2.4), 0.035, 0.11, 0.012, 0, 1.38 + y0, 0.212);
  b.box(m.D, 0.32, 0.38, 0.13, 0, 1.33 + y0, -0.21); for (const s of [-1, 1]) { b.add(A, new THREE.CylinderGeometry(0.05, 0.05, 0.3, 10), mx(s * 0.09, 1.33 + y0, -0.3)); b.add(A, new THREE.SphereGeometry(0.095, 12, 10), mx(s * 0.31, 1.5 + y0, 0), 0); }
  b.add(m.K, new THREE.CylinderGeometry(0.055, 0.07, 0.1, 10), mx(0, 1.6 + y0, 0)); b.box(glow(eyeC, 1.6), 0.2, 0.02, 0.012, 0, 1.2 + y0, 0.212);
  // 脚
  for (const s of [-1, 1]) {
    if (sit) { cap(b, Wm, 0.075, 0.3, s * 0.11, 0.58, 0.2, HP); b.add(m.K, new THREE.SphereGeometry(0.08, 10, 8), mx(s * 0.11, 0.58, 0.43), 0); cap(b, A, 0.065, 0.3, s * 0.11, 0.32, 0.45); b.box(m.K, 0.13, 0.08, 0.28, s * 0.11, 0.07, 0.5); }
    else { cap(b, Wm, 0.075, 0.3, s * 0.11, 0.72, 0); b.add(m.K, new THREE.SphereGeometry(0.08, 10, 8), mx(s * 0.11, 0.5, 0), 0); cap(b, A, 0.065, 0.3, s * 0.11, 0.27, 0); b.box(m.K, 0.13, 0.08, 0.28, s * 0.11, 0.04, 0.05); }
  }
  g.add(b.build({ shadow: false }));
  // 頭 (首振り)
  const head = new THREE.Group(), hb = new Builder(), eyeM = new THREE.MeshBasicMaterial({ color: new THREE.Color(eyeC).multiplyScalar(4.5), toneMapped: false }), tipM = new THREE.MeshBasicMaterial({ color: new THREE.Color('#ff3a2a').multiplyScalar(4), toneMapped: false });
  hb.add(Wm, new THREE.SphereGeometry(0.165, 20, 14), mx(0, 0, 0, 0, 0, 0, 1.12, 0.96, 1.04), 0); hb.add(m.GL, new THREE.SphereGeometry(0.15, 18, 12, 0, Math.PI, 0.75, 1.25).rotateY(-HP), mx(0, 0.0, 0.035, 0, 0, 0, 1.12, 1, 1), 0);
  for (const s of [-1, 1]) { hb.add(A, new THREE.CylinderGeometry(0.052, 0.052, 0.05, 12).rotateZ(HP), mx(s * 0.185, 0, 0)); hb.add(eyeM, new THREE.CircleGeometry(0.03, 12), mx(s * 0.062, 0.012, 0.184), 0); }
  hb.add(m.K, new THREE.CylinderGeometry(0.007, 0.007, 0.24, 4), mx(0.185, 0.14, 0)); hb.add(tipM, new THREE.SphereGeometry(0.02, 8, 6), mx(0.185, 0.27, 0), 0); hb.box(A, 0.07, 0.03, 0.2, 0, 0.158, 0.0);
  head.add(hb.build({ shadow: false })); head.position.set(0, 1.76 + y0, 0); g.add(head);
  // 腕 (肩と肘で曲がる)
  const arm = (s) => { const sh = new THREE.Group(), ab = new Builder(), fo = new THREE.Group(), fb = new Builder();
    cap(ab, Wm, 0.055, 0.2, 0, -0.16, 0); ab.add(m.K, new THREE.SphereGeometry(0.062, 10, 8), mx(0, -0.32, 0), 0); sh.add(ab.build({ shadow: false }));
    cap(fb, A, 0.05, 0.2, 0, -0.16, 0); fb.box(m.K, 0.075, 0.09, 0.05, 0, -0.34, 0); for (let i = 0; i < 3; i++) fb.box(m.K, 0.018, 0.07, 0.022, (i - 1) * 0.026, -0.41, 0.012);
    fo.add(fb.build({ shadow: false })); fo.position.y = -0.32; sh.add(fo); sh.position.set(s * 0.31, 1.5 + y0, 0); sh.userData.fo = fo; g.add(sh); return sh; };
  const aL = arm(-1), aR = arm(1), ph = (o.ph ?? Math.random()) * 10;
  let hy = 0, wave = 0;
  g.userData.tick = (dt, t, yaw = null, dist = 99) => {
    const T = t + ph, near = yaw != null && dist < 6;
    // 頭: 近くに来た相手を見る。いないときは計器や周囲を見回す
    const want = near ? Math.max(-1.25, Math.min(1.25, yaw)) : Math.sin(T * 0.37) * 0.5 + Math.sin(T * 0.83) * 0.18; hy += (want - hy) * Math.min(1, dt * 4); head.rotation.y = hy; head.rotation.x = near ? -0.08 : Math.sin(T * 0.53) * 0.1 + (sit ? 0.14 : 0);
    const bl = (T * 0.31) % 1; eyeM.color.set(eyeC).multiplyScalar(bl > 0.97 ? 0.3 : 4.5 + Math.sin(T * 3) * 0.6); tipM.color.setScalar((T * 0.8) % 1 < 0.14 ? 5 : 0.25);
    if (sit) { // 操縦: 両手は操縦桿と推力レバー。ときどき頭上のスイッチへ手を伸ばす
      const k = (T * 0.12) % 1, up = k > 0.86 ? Math.sin((k - 0.86) / 0.14 * Math.PI) : 0;
      aL.rotation.x = -0.95 + Math.sin(T * 1.1) * 0.05; aL.userData.fo.rotation.x = -0.75 + Math.sin(T * 1.7) * 0.07; aL.rotation.z = 0.1;
      aR.rotation.x = -0.95 - up * 1.55 + Math.sin(T * 0.9 + 1) * 0.04; aR.userData.fo.rotation.x = -0.75 + up * 0.55 + Math.sin(T * 2.3) * 0.05; aR.rotation.z = -0.1 - up * 0.1;
    } else { // 立ち姿: 近づくと手を振る
      wave += ((near && dist < 4.2 ? 1 : 0) - wave) * Math.min(1, dt * 5);
      aL.rotation.x = Math.sin(T * 0.6) * 0.05; aL.rotation.z = -0.07; aL.userData.fo.rotation.x = -0.22;
      aR.rotation.z = 0.07 + wave * 2.5; aR.rotation.x = Math.sin(T * 0.6 + 2) * 0.05; aR.userData.fo.rotation.x = -0.22 - wave * 0.4; aR.userData.fo.rotation.z = wave * Math.sin(T * 8) * 0.45;
    }
  };
  g.userData.tick(0.016, 0);
  return g;
}

/** 浮遊型の医療ボット: 白い球体に緑十字の環。2 本の細い腕で処置をする */
export function makeMedBot() {
  const m = MM(), g = new THREE.Group(), b = new Builder(), GX = glow('#35ff8a', 3);
  b.add(mat('flat', { color: 0xf4f6f4, rough: 0.3, metal: 0.2 }), new THREE.SphereGeometry(0.3, 24, 16), null, 0); b.tor(GX, 0.305, 0.022, 0, 0, 0, HP, 0, 0, 32, 6); b.add(m.GL, new THREE.SphereGeometry(0.2, 16, 10, 0, Math.PI, 0.9, 0.9).rotateY(-HP), mx(0, 0.05, 0.13), 0);
  b.box(GX, 0.14, 0.04, 0.01, 0, -0.1, 0.285); b.box(GX, 0.04, 0.14, 0.01, 0, -0.1, 0.285); b.cyl(m.D, 0.16, 0.1, 0.12, 0, -0.32, 0, 'y', 14); b.add(glow('#9fe8ff', 4), new THREE.CircleGeometry(0.09, 14).rotateX(HP), mx(0, -0.385, 0), 0);
  b.cyl(m.K, 0.01, 0.01, 0.16, 0, 0.37, 0, 'y', 4);
  g.add(b.build({ shadow: false }));
  const eyeM = new THREE.MeshBasicMaterial({ color: new THREE.Color('#6fe8ff').multiplyScalar(4), toneMapped: false }); for (const s of [-1, 1]) { const e = new THREE.Mesh(new THREE.CircleGeometry(0.032, 12), eyeM); e.position.set(s * 0.07, 0.07, 0.298); g.add(e); }
  const tip = new THREE.Mesh(new THREE.SphereGeometry(0.022, 8, 6), new THREE.MeshBasicMaterial({ color: new THREE.Color('#35ff8a').multiplyScalar(4), toneMapped: false })); tip.position.y = 0.46; g.add(tip);
  const arms = [-1, 1].map((s) => { const a = new THREE.Group(), ab = new Builder(); ab.add(m.C, new THREE.CylinderGeometry(0.014, 0.014, 0.34, 6), mx(0, -0.17, 0)); ab.add(m.K, new THREE.SphereGeometry(0.03, 8, 6), mx(0, -0.34, 0), 0);
    const f = new THREE.Group(), fb = new Builder(); fb.add(m.C, new THREE.CylinderGeometry(0.011, 0.011, 0.3, 6), mx(0, -0.15, 0)); fb.add(s > 0 ? glow('#9fe8ff', 5) : m.C, new THREE.ConeGeometry(0.02, 0.07, 8), mx(0, -0.33, 0, Math.PI, 0, 0), 0); f.add(fb.build({ shadow: false })); f.position.y = -0.34; a.add(ab.build({ shadow: false }), f); a.position.set(s * 0.27, -0.1, 0.05); a.userData.f = f; g.add(a); return a; });
  g.userData.tick = (dt, t) => { arms.forEach((a, i) => { a.rotation.x = -0.9 + Math.sin(t * 1.6 + i * 2) * 0.25; a.rotation.z = (i ? -1 : 1) * (0.25 + Math.sin(t * 1.1 + i) * 0.12); a.userData.f.rotation.x = -0.5 + Math.sin(t * 2.4 + i * 1.3) * 0.3; }); eyeM.color.set('#6fe8ff').multiplyScalar((t * 0.27) % 1 > 0.96 ? 0.3 : 4); tip.material.color.set('#35ff8a').multiplyScalar((t * 1.1) % 1 < 0.2 ? 5 : 0.4); };
  return g;
}

/** 荷役ボット: 履帯で走る箱型の機体に 2 本のフォーク腕。回転灯つき */
export function makeLoaderBot() {
  const m = MM(), g = new THREE.Group(), b = new Builder(), Y = mat('flat', { color: 0xffb21a, rough: 0.5, metal: 0.3 });
  for (const s of [-1, 1]) { b.box(m.K, 0.3, 0.42, 1.5, s * 0.55, 0.21, 0); for (const z of [-0.6, 0, 0.6]) b.add(m.D, new THREE.CylinderGeometry(0.17, 0.17, 0.32, 12).rotateZ(HP), mx(s * 0.55, 0.2, z)); b.box(m.D, 0.34, 0.06, 1.3, s * 0.55, 0.44, 0); }
  b.box(Y, 0.86, 0.6, 1.2, 0, 0.72, -0.05); b.box(m.D, 0.9, 0.1, 1.26, 0, 1.06, -0.05); b.box(m.K, 0.7, 0.36, 0.06, 0, 0.8, 0.565); b.box(glow('#6fe8ff', 3), 0.42, 0.07, 0.02, 0, 0.86, 0.6); b.box(glow('#ffd23a', 1.4), 0.88, 0.07, 0.02, 0, 0.5, 0.56);
  b.cyl(m.D, 0.05, 0.05, 0.3, 0.3, 1.26, -0.4, 'y', 8);
  for (let i = 0; i < 5; i++) b.add(m.K, new THREE.PlaneGeometry(0.1, 0.5), mx(-0.4 + i * 0.2, 0.74, -0.652, 0, Math.PI, 0.6), 0);
  g.add(b.build({ shadow: false }));
  const lamp = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.07, 0.1, 12), new THREE.MeshBasicMaterial({ color: new THREE.Color('#ffb21a').multiplyScalar(4), toneMapped: false })); lamp.position.set(0.3, 1.45, -0.4); g.add(lamp);
  const lift = new THREE.Group(), lb = new Builder(); for (const s of [-1, 1]) { lb.box(m.D, 0.08, 1.5, 0.1, s * 0.3, 0.75, 0.66); lb.box(m.C, 0.1, 0.05, 0.9, s * 0.26, 0.06, 1.12); lb.box(m.C, 0.1, 0.4, 0.05, s * 0.26, 0.24, 0.7); } lb.box(m.D, 0.76, 0.1, 0.1, 0, 0.3, 0.68);
  const fork = lb.build({ shadow: false }); lift.add(fork); g.add(lift);
  const crate = new THREE.Mesh(new THREE.BoxGeometry(0.7, 0.55, 0.7), mat('rib', { color: 0xf0f2f0, metal: 0.3, rough: 0.7 })); crate.position.set(0, 0.36, 1.1); lift.add(crate);
  const cx = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.09, 0.01), glow('#35ff8a', 2)), cy2 = new THREE.Mesh(new THREE.BoxGeometry(0.09, 0.3, 0.01), glow('#35ff8a', 2)); cx.position.set(0, 0.36, 1.456); cy2.position.set(0, 0.36, 1.456); lift.add(cx, cy2);
  g.userData.tick = (dt, t) => { lift.position.y = 0.12 + (0.5 + 0.5 * Math.sin(t * 0.5)) * 0.5; lamp.material.color.set('#ffb21a').multiplyScalar(2.5 + 2.5 * Math.max(0, Math.sin(t * 6))); };
  return g;
}

/** 救助船の出動状況 (セーブデータ) */
export const rescueState = () => (G.p.flags.rescue || (G.p.flags.rescue = { n: 0, day: 0 }));
export const rescueN = () => G.p?.flags.rescue?.n || 0;
