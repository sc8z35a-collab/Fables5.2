// ステーション外装の艤装キット: 局所座標フレーム・トラス・アンテナ・タンク・貨物・投光器・進入ゲート・小型船・灯火群・交通
import * as THREE from 'three';
import { Builder, Placer, mx, loft } from '../gfx/builder.js';
import { mat, glow } from '../gfx/textures.js';
import '../gfx/textures2.js';
import { makeGlowSprite, fxTime } from '../gfx/fx.js';
import { G } from '../core/util.js';
import { V, sign } from './stationkit.js';
import { instanced } from './rescue.js';

const HP = Math.PI / 2, TAU = Math.PI * 2;
const ADD = { transparent: true, blending: THREE.AdditiveBlending, depthWrite: false };

// ───────────────────────── 座標フレーム ─────────────────────────
/** 面に貼り付く局所座標 (原点 p, Y = 外向き法線 n, Z = 接線 f)。右手系 */
export function frame(p, n, f) {
  const y = n.clone().normalize(), z = f ? f.clone() : Math.abs(y.y) < 0.9 ? V(0, 1, 0) : V(1, 0, 0); z.addScaledVector(y, -z.dot(y)).normalize();
  return new THREE.Matrix4().makeBasis(y.clone().cross(z), y, z).setPosition(p);
}
/** p に据え付けた Placer (以後の部品は Y = 法線の局所座標で書ける) */
export const at = (b, p, n, f) => new Placer(b, frame(p, n, f));
const full = (P) => (P.base ? (P.b && P.b.base ? full(P.b).multiply(P.base) : P.base.clone()) : new THREE.Matrix4());
/** Placer の局所座標 → ステーション座標 */
export const wp = (P, x, y, z) => V(x, y, z).applyMatrix4(full(P));
/** 任意の向きの看板。X = 文字の進む向き, Z = 面の法線 (どちらも単位ベクトルで直交) */
export function signOn(text, color, h, pos, X, Z, o = {}) { const m = sign(text, color, h, 0, 0, 0, 0, 0, o), y = Z.clone().cross(X); m.quaternion.setFromRotationMatrix(new THREE.Matrix4().makeBasis(X, y, Z)); m.position.copy(pos); return m; }

// ───────────────────────── マテリアル ─────────────────────────
const MC = new Map();
export function metal(c, r = 0.28) { const k = c + '_' + r; let m = MC.get(k); if (!m) { m = new THREE.MeshStandardMaterial({ color: c, roughness: r, metalness: 1 }); m.userData.uvs = 0; MC.set(k, m); } return m; }
let _gl;
const glass = () => _gl || (_gl = Object.assign(new THREE.MeshStandardMaterial({ color: 0x06121f, roughness: 0.05, metalness: 1, envMapIntensity: 2.4 }), { userData: { uvs: 0 } }));
/** 艤装用マテリアル一式。o で H (外板) / D (機械部) などを上書きする */
export function kit(o = {}) {
  const u = o.uvs ?? 0.04;
  return { H: mat('hull', { color: 0xe6e9ee, rough: 0.55, metal: 0.3, uvs: u }), D: mat('hull', { color: 0x30353d, rough: 0.82, metal: 0.6, uvs: u }), Y: mat('hull', { color: 0xf2b90a, rough: 0.55, metal: 0.3, uvs: u }), A: mat('hull', { color: 0xff5412, rough: 0.55, metal: 0.2, uvs: u }),
    DS: mat('hull', { color: 0xe4e7ec, rough: 0.5, metal: 0.45, uvs: u, side: THREE.DoubleSide }), DD: mat('hull', { color: 0x1c1e22, rough: 0.8, metal: 0.7, uvs: u, side: THREE.DoubleSide }),
    S: mat('solar', { metal: 0.9, env: 1.6 }), GL: glass(), HZ: mat('hazard', { rough: 0.6, metal: 0.3, uvs: 0.08 }), GR: mat('grate', { color: 0x8a9096, rough: 0.6, metal: 0.7, uvs: 0.25 }), CU: metal(0xc8743a, 0.32), ...o };
}
const BM = new Map();
/** 光錐 (投光器・探照灯)。UV の v = 0 が光源側 */
export function beamMat(c, k = 1) {
  const key = c + '_' + k; let m = BM.get(key); if (m) return m;
  m = new THREE.ShaderMaterial({ uniforms: { uCol: { value: new THREE.Color(c).multiplyScalar(k) }, uTime: fxTime }, ...ADD, side: THREE.DoubleSide,
    vertexShader: 'varying vec3 vN,vV;varying vec2 vUv;void main(){vUv=uv;vec4 mv=modelViewMatrix*vec4(position,1.);vN=normalize(normalMatrix*normal);vV=normalize(-mv.xyz);gl_Position=projectionMatrix*mv;}',
    fragmentShader: 'uniform vec3 uCol;uniform float uTime;varying vec3 vN,vV;varying vec2 vUv;void main(){float a=pow(abs(dot(vN,vV)),1.6)*pow(1.-vUv.y,1.5)*(.9+.1*sin(uTime*3.+vUv.y*9.));gl_FragColor=vec4(uCol*a,1.);}' });
  m.userData.uvs = 0; BM.set(key, m); return m;
}

// ───────────────────────── 構造材 ─────────────────────────
const _y = V(0, 1, 0), _q = new THREE.Quaternion(), _s = V(1, 1, 1);
/** 2 点を結ぶ棒 (既定は両端の蓋なし) */
export function rod(b, m, a, c, r0, r1 = r0, seg = 6, open = true) {
  const d = c.clone().sub(a), len = d.length(); if (len < 1e-4) return;
  _q.setFromUnitVectors(_y, d.multiplyScalar(1 / len)); b.add(m, new THREE.CylinderGeometry(r1, r0, len, seg, 1, open), new THREE.Matrix4().compose(a.clone().add(c).multiplyScalar(0.5), _q, _s));
}
/** 箱形断面のラチストラス (幅 w) */
export function truss(b, m, a, c, w, o = {}) {
  const d = c.clone().sub(a), len = d.length(), z = d.clone().multiplyScalar(1 / len), up = o.up || (Math.abs(z.y) < 0.9 ? V(0, 1, 0) : V(1, 0, 0)), x = up.clone().cross(z).normalize(), y = z.clone().cross(x), n = o.bays || Math.max(2, Math.round(len / (w * 1.3))), h = w / 2, r = o.r || w * 0.06;
  const cor = (k, t) => a.clone().addScaledVector(z, len * t).addScaledVector(x, k & 1 ? h : -h).addScaledVector(y, k & 2 ? h : -h), E = [[0, 1], [1, 3], [3, 2], [2, 0]];
  for (let k = 0; k < 4; k++) rod(b, m, cor(k, 0), cor(k, 1), r, r, 5);
  for (let i = 0; i <= n; i++) { for (const [p, q] of E) rod(b, m, cor(p, i / n), cor(q, i / n), r * 0.7, r * 0.7, 4); if (i < n) for (const [p, q] of E) rod(b, m, cor(i % 2 ? q : p, i / n), cor(i % 2 ? p : q, (i + 1) / n), r * 0.6, r * 0.6, 4); }
}

// ───────────────────────── 艤装品 (P = at(...) で据え付ける。Y が設置面の法線) ─────────────────────────
/** パラボラアンテナ (半径 r)。el = 仰角の倒し, az = 方位。戻り値 = 給電部の位置 */
export function dish(P, m, r, o = {}) {
  const el = o.el ?? 0.7, az = o.az ?? 0, pts = []; for (let i = 0; i <= 7; i++) { const t = i / 7; pts.push(new THREE.Vector2(r * (0.08 + 0.92 * t), r * 0.32 * t * t)); }
  P.cyl(m.D, r * 0.1, r * 0.16, r * 0.8, 0, r * 0.4, 0, 'y', 8); P.cyl(m.D, r * 0.3, r * 0.36, r * 0.12, 0, r * 0.06, 0, 'y', 10); P.box(m.D, r * 0.5, r * 0.24, r * 0.3, 0, r * 0.8, 0, az);
  const Q = new Placer(P, mx(0, r * 0.92, 0, el, az, 0));
  Q.add(m.DS, new THREE.LatheGeometry(pts, 20)); Q.cyl(m.D, r * 0.09, r * 0.09, r * 0.1, 0, r * 0.02, 0, 'y', 8);
  for (let k = 0; k < 3; k++) { const a = k * TAU / 3 + 0.5; rod(Q, m.D, V(Math.cos(a) * r * 0.9, r * 0.27, Math.sin(a) * r * 0.9), V(0, r * 0.66, 0), r * 0.018, r * 0.018, 4); }
  Q.cyl(m.D, r * 0.05, r * 0.08, r * 0.14, 0, r * 0.66, 0, 'y', 8);
  return wp(Q, 0, r * 0.76, 0);
}
/** アンテナマスト (高さ h)。戻り値 = 先端の位置 (航空障害灯用) */
export function mast(P, m, h, o = {}) {
  const r = o.r ?? Math.max(0.3, h * 0.022); P.cyl(m.D, r * 0.45, r, h, 0, h / 2, 0, 'y', 6); P.cyl(m.D, r * 2, r * 2.4, h * 0.05, 0, h * 0.025, 0, 'y', 8);
  for (const [t, w] of [[0.5, 0.3], [0.68, 0.22], [0.84, 0.14]]) { P.box(m.D, h * w, r * 0.6, r * 0.6, 0, h * t, 0); P.box(m.D, r * 0.6, r * 0.6, h * w, 0, h * t, 0); }
  if (o.pod) P.sph(m.H, r * 3, 0, h * 0.34, 0, 1, 1.3, 1, 10);
  return wp(P, 0, h + r, 0);
}
/** Z 方向に寝かせたカプセルタンク (鞍 2 基) */
export function tank(P, m, r, len, M = m.H) {
  P.add(M, new THREE.CapsuleGeometry(r, len, 5, 14), mx(0, r * 1.2, 0, HP, 0, 0));
  for (const t of [-0.32, 0.32]) { P.tor(m.D, r * 1.03, r * 0.07, 0, r * 1.2, t * len, 0, 0, 0, 18, 5); P.box(m.D, r * 1.5, r * 0.5, r * 0.34, 0, r * 0.25, t * len); }
  P.cyl(m.D, r * 0.16, r * 0.16, r * 0.4, 0, r * 2.3, 0, 'y', 8);
}
/** 球形タンク (4 本脚) */
export function ball(P, m, r, M = m.H) {
  P.sph(M, r, 0, r * 1.25, 0, 1, 1, 1, 18); P.tor(m.D, r * 1.02, r * 0.05, 0, r * 1.25, 0, HP, 0, 0, 24, 5);
  for (let k = 0; k < 4; k++) { const a = k * HP + 0.785; P.cyl(m.D, r * 0.07, r * 0.07, r * 1.3, Math.cos(a) * r * 0.8, r * 0.65, Math.sin(a) * r * 0.8, 'y', 6); }
  P.cyl(m.D, r * 0.18, r * 0.22, r * 0.3, 0, r * 2.3, 0, 'y', 8);
}
export const CCOL = [0xc8442a, 0x2a6fc8, 0xd8a020, 0x3a9a5a, 0xe4e6e8, 0x7a4ac8, 0x30343c, 0xd86a1e];
const cmat = (c) => mat('rib', { color: c, rough: 0.7, metal: 0.4, uvs: 0.16 });
/** 貨物コンテナの山。局所 X に長辺 (l)、Z に短辺 (w)、Y に積む。pal = 色の候補 */
export function containers(P, r, nx, ny, nz, o = {}) {
  const L = o.l ?? 12, W = o.w ?? 5, H = o.h ?? 5, pal = o.pal || CCOL;
  for (let i = 0; i < nx; i++) for (let k = 0; k < nz; k++) { const n = o.full ? ny : 1 + Math.floor(r() * ny); for (let j = 0; j < n; j++) P.box(cmat(pal[Math.floor(r() * pal.length)]), L * 0.96, H * 0.94, W * 0.92, (i - (nx - 1) / 2) * L, H * (j + 0.5), (k - (nz - 1) / 2) * W); }
}
/** 姿勢制御スラスター (5 方向のノズル) */
export function rcs(P, m, s = 4) {
  P.box(m.D, s, s * 0.6, s, 0, s * 0.3, 0);
  for (const [x, z, rx, rz] of [[1, 0, 0, -1], [-1, 0, 0, 1], [0, 1, 1, 0], [0, -1, -1, 0]]) P.add(m.D, new THREE.CylinderGeometry(s * 0.34, s * 0.15, s * 0.5, 10), mx(x * s * 0.72, s * 0.32, z * s * 0.72, rx * HP, 0, rz * HP));
  P.add(m.D, new THREE.CylinderGeometry(s * 0.34, s * 0.15, s * 0.5, 10), mx(0, s * 0.84, 0));
}
/** 門型クレーン (局所 X に跨ぎ、Z に走る)。tx = 横行台車の位置 (-0.5..0.5) */
export function gantry(P, m, w, h, d, tx = 0.2) {
  const t = Math.max(0.6, w * 0.045);
  for (const s of [-1, 1]) { for (const k of [-1, 1]) P.box(m.Y, t, h, t, s * w / 2, h / 2, k * d / 2); P.box(m.Y, t, t, d + t, s * w / 2, h * 0.55, 0); P.box(m.D, t * 2.2, t * 0.8, d * 1.25, s * w / 2, t * 0.4, 0); }
  for (const k of [-1, 1]) P.box(m.Y, w + t * 2, t * 1.4, t, 0, h, k * d / 2);
  P.box(m.D, w * 0.16, t * 1.6, d + t * 2, tx * w, h + t * 0.2, 0); P.cyl(m.D, t * 0.12, t * 0.12, h * 0.5, tx * w, h * 0.74, 0, 'y', 4); P.box(m.Y, t * 1.6, t * 1.2, t * 1.6, tx * w, h * 0.47, 0);
}
/** 丸いハッチ (半径 r)。G1 = 縁の灯 */
export function hatch(P, m, r, G1) { P.cyl(m.D, r, r * 1.08, r * 0.3, 0, r * 0.15, 0, 'y', 14); P.cyl(m.H, r * 0.8, r * 0.8, r * 0.12, 0, r * 0.34, 0, 'y', 14); P.tor(G1, r * 0.9, r * 0.05, 0, r * 0.33, 0, HP, 0, 0, 20, 4); P.box(m.D, r * 0.9, r * 0.1, r * 0.12, 0, r * 0.44, 0); }
/** 投光器: 灯体 + 光錐 (p から dir へ len だけ照らす。r1 = 先端の半径) */
export function flood(b, m, p, dir, len, r1, c = '#fff2d8', k = 0.3) {
  const P = at(b, p, dir); P.cyl(m.D, 1.3, 0.9, 1.6, 0, -0.6, 0, 'y', 10); P.add(glow(c, 5), new THREE.CircleGeometry(1.1, 12).rotateX(-HP), mx(0, 0.25, 0), 0);
  P.add(beamMat(c, k), new THREE.CylinderGeometry(r1, 1.0, len, 18, 1, true), mx(0, len / 2 + 0.3, 0), 0);
}
/** 航路ブイ */
export function buoy(b, m, p, s = 3) { const P = at(b, p, V(0, 1, 0)); P.add(m.Y, new THREE.OctahedronGeometry(s, 0), mx(0, 0, 0, 0, 0.6, 0, 1, 1.5, 1)); P.cyl(m.D, s * 0.1, s * 0.1, s * 4, 0, 0, 0, 'y', 5); P.box(m.S, s * 2.6, s * 0.08, s * 0.9, 0, -s * 0.2, 0); P.box(m.S, s * 0.9, s * 0.08, s * 2.6, 0, -s * 0.2, 0); return V(p.x, p.y + s * 2.3, p.z); }
/** 進入ゲート: dir 軸に垂直な n 角形の枠 (半径 R)。戻り値 = 頂点位置 (灯火用) */
export function gate(b, m, p, dir, R, n = 8, t = 1.4) {
  const M = frame(p, dir), pts = []; for (let i = 0; i < n; i++) { const a = (i + 0.5) * TAU / n; pts.push(V(Math.cos(a) * R, 0, Math.sin(a) * R).applyMatrix4(M)); }
  for (let i = 0; i < n; i++) { rod(b, m.D, pts[i], pts[(i + 1) % n], t, t, 6); b.sph(m.Y, t * 1.9, pts[i].x, pts[i].y, pts[i].z, 1, 1, 1, 8); }
  return pts;
}
/** 円周上に灯を並べる。M = frame(...) (Y が軸)。o.chase を与えると光が円周を走る */
export function ringLights(F, M, R, n, o = {}) { for (let i = 0; i < n; i++) { const a = i * TAU / n + (o.a0 || 0); F.push({ ...o, p: V(Math.cos(a) * R, 0, Math.sin(a) * R).applyMatrix4(M), ph: o.chase ? (i / n) * o.chase : o.ph ?? 0 }); } }

// ───────────────────────── 小型船 (機首 = -Z。B は Builder でも Placer でもよい) ─────────────────────────
/** 室内灯のともる窓 */
export const warmWin = () => mat('flat', { color: 0x1a1410, rough: 0.2, metal: 0.3, emissive: '#ffd9a0', ei: 1.6 });
/** 貨物船 (全長 86m)。コンテナを竜骨の両舷に抱える */
export function freighter(B, r, m) {
  const W = warmWin();
  B.box(m.H, 13, 9, 12, 0, 1, -32); B.box(m.D, 14, 2, 13, 0, 6.2, -32); B.box(W, 11, 1.6, 0.3, 0, 3.4, -38.1); B.box(W, 0.3, 1.6, 8, 6.6, 3.4, -33); B.box(W, 0.3, 1.6, 8, -6.6, 3.4, -33); B.box(m.H, 9, 5, 5, 0, -1, -40);
  B.box(m.D, 5, 5, 56, 0, 0, 2);
  for (let i = 0; i < 5; i++) for (const s of [-1, 1]) for (const y of [-1, 1]) { if (r() < 0.12) continue; B.box(cmat(CCOL[Math.floor(r() * CCOL.length)]), 8.4, 6.6, 9.4, s * 6.9, y * 3.6, -20 + i * 10.2); }
  for (let i = 0; i < 6; i++) B.box(m.D, 20, 15.5, 0.6, 0, 0, -25.1 + i * 10.2);
  B.box(m.H, 18, 13, 12, 0, 0, 33); B.box(m.D, 20, 3, 9, 0, 7.5, 33);
  for (const s of [-1, 1]) { B.cyl(m.D, 4.4, 3.4, 7, s * 5, 0, 41.5, 'z', 14); B.add(glow('#7fd8ff', 5), new THREE.CircleGeometry(3.4, 14), mx(s * 5, 0, 45.1), 0); B.box(m.D, 1, 6, 10, s * 10.5, 0, 34); }
  B.cyl(m.D, 0.2, 0.2, 10, 3, 11, -32, 'y', 4); B.sph(glow('#f33', 5), 0.5, -7.6, 6, 30, 1, 1, 1, 6); B.sph(glow('#3f6', 5), 0.5, 7.6, 6, 30, 1, 1, 1, 6);
}
/** 作業艇・曳船 (全長 16m) */
export function tug(B, m) {
  B.box(m.Y, 6, 4.4, 9, 0, 0, 0); B.box(m.D, 6.6, 1, 9.6, 0, -2.6, 0); B.box(m.GL, 5, 1.8, 2.6, 0, 1.2, -4.2); B.box(m.D, 7.4, 2.4, 1.2, 0, -0.6, -5.2);
  for (const s of [-1, 1]) { B.cyl(m.D, 1.9, 1.5, 5, s * 2.2, 0, 6.6, 'z', 12); B.add(glow('#ffb060', 5), new THREE.CircleGeometry(1.4, 12), mx(s * 2.2, 0, 9.15), 0); B.box(m.D, 0.5, 0.5, 6, s * 3.6, 2.6, -1); }
  B.cyl(m.D, 0.12, 0.12, 4, 0, 4.2, 2, 'y', 4); B.sph(glow('#ffb21a', 5), 0.4, 0, 6.3, 2, 1, 1, 1, 6);
}
/** 連絡艇・救急艇 (全長 24m のカプセル型)。acc = 帯の色 */
export function shuttle(B, m, acc = m.A) {
  B.add(m.H, new THREE.CapsuleGeometry(3.6, 15, 6, 16), mx(0, 0, 0, HP, 0, 0)); B.add(acc, new THREE.CylinderGeometry(3.66, 3.66, 2.4, 16, 1, true), mx(0, 0, 3, HP, 0, 0)); B.add(m.GL, new THREE.SphereGeometry(3.3, 14, 10, 0, TAU, 0, 1.0), mx(0, 0.5, -8.6, -HP + 0.5, 0, 0), 0);
  for (const s of [-1, 1]) { B.box(m.H, 6, 0.5, 6, s * 5.5, -0.6, 4, 0, 0, s * -0.12); B.cyl(m.D, 1.5, 1.2, 5, s * 3.0, -0.4, 10.6, 'z', 12); B.add(glow('#9fe8ff', 5), new THREE.CircleGeometry(1.15, 12), mx(s * 3.0, -0.4, 13.15), 0); for (const z of [-2, 0.4]) B.box(glow('#fff2d8', 3), 0.1, 0.9, 1.4, s * 3.62, 0.6, z); }
  B.box(m.H, 0.4, 3.4, 4, 0, 4.4, 8, 0, 0.35, 0);
}
/** 哨戒艇 (全長 36m のくさび形) */
export function patrol(B, m) {
  B.add(m.H, loft([{ z: -16, w: 0.8, t: 0.6 }, { z: -9, w: 3.2, t: 1.6 }, { z: 0, w: 4.6, t: 2.4 }, { z: 9, w: 4.4, t: 2.6 }, { z: 15, w: 3.4, t: 2.2 }].map((s) => ({ e: 3.2, ...s })), 20, false, 2.5));
  B.add(m.GL, loft([{ z: -9.5, w: 1.5, t: 0.5 }, { z: -6, w: 2.2, t: 1.5 }, { z: -2, w: 2.0, t: 1.2 }].map((s) => ({ ...s, b: 0.01, y: 1.4, e: 2.6 })), 16, false, 2), null, 0);
  for (const s of [-1, 1]) { B.box(m.D, 9, 0.6, 8, s * 6.5, -0.4, 6, 0, 0, s * 0.18); B.box(m.Y, 9.1, 0.64, 1.2, s * 6.5, -0.4, 9.2, 0, 0, s * 0.18); B.cyl(m.D, 2, 1.6, 6, s * 2.4, 0.2, 16.5, 'z', 12); B.add(glow('#ff8a3a', 5), new THREE.CircleGeometry(1.5, 12), mx(s * 2.4, 0.2, 19.55), 0); B.cyl(m.D, 0.35, 0.35, 9, s * 4.6, -1.2, -9, 'z', 6); B.box(m.D, 0.8, 4, 5, s * 3.4, 3.6, 11, 0, 0.3, s * -0.4); }
  B.sph(glow('#f33', 5), 0.4, 0, 3.2, 4, 1, 1, 1, 6);
}
/** 外周トラム (3 両編成・全長 48m)。Y = 軌道面の法線 */
export function tram(B, m) {
  const W = warmWin();
  for (let i = 0; i < 3; i++) { const z = (i - 1) * 16.4; B.box(m.H, 7, 6, 15, 0, 3.6, z); B.box(W, 7.1, 1.8, 13, 0, 4.4, z); B.box(m.D, 7.4, 0.8, 15.4, 0, 6.9, z); B.box(m.D, 3, 1.2, 4, 0, 0.3, z); }
  for (const z of [-8.2, 8.2]) B.box(m.D, 5, 4.4, 1.6, 0, 3.4, z);
  B.box(glow('#fff2d8', 5), 4, 1, 0.2, 0, 2, -24.05); B.box(glow('#f33', 4), 4, 0.6, 0.2, 0, 2, 24.05);
}
/** 試料カプセル・観測ドローン (全長 6m) */
export function pod(B, m, c = '#4dffd8') { B.add(m.H, new THREE.CapsuleGeometry(1.5, 3, 5, 12), mx(0, 0, 0, HP, 0, 0)); B.tor(glow(c, 3.4), 1.56, 0.14, 0, 0, 0, 0, 0, 0, 16, 5); B.box(m.S, 7, 0.1, 2, 0, 0, 0.6); B.cyl(m.D, 0.9, 0.6, 1, 0, 0, 2.9, 'z', 8); }
/** 部品関数から単独の機体 (Group) を作る */
export const craftOf = (fn) => { const b = new Builder(); fn(b); return b.build({ shadow: false }); };

// ───────────────────────── 灯火群・交通 ─────────────────────────
/**
 * 灯火群: 何百もの航行灯・誘導灯・電飾を 1 ドローコールで描く
 * list: [{ p, c, s (直径 m), k (輝度), blink (Hz, 0 = 常時点灯), ph (位相 0..1), duty (点灯率) }]
 */
export function lightField(list) {
  const n = list.length, pos = new Float32Array(n * 3), col = new Float32Array(n * 3), dat = new Float32Array(n * 4), c = new THREE.Color();
  list.forEach((l, i) => { pos[i * 3] = l.p.x; pos[i * 3 + 1] = l.p.y; pos[i * 3 + 2] = l.p.z; c.set(l.c).multiplyScalar(l.k ?? 2.5); col[i * 3] = c.r; col[i * 3 + 1] = c.g; col[i * 3 + 2] = c.b; dat[i * 4] = l.s ?? 6; dat[i * 4 + 1] = l.blink ?? 0; dat[i * 4 + 2] = l.ph ?? 0; dat[i * 4 + 3] = l.duty ?? 0.14; });
  const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.BufferAttribute(pos, 3)); g.setAttribute('aColor', new THREE.BufferAttribute(col, 3)); g.setAttribute('aData', new THREE.BufferAttribute(dat, 4));
  const u = { uTime: fxTime, uScale: { value: 900 } };
  const pts = new THREE.Points(g, new THREE.ShaderMaterial({ uniforms: u, ...ADD,
    vertexShader: 'attribute vec3 aColor;attribute vec4 aData;uniform float uTime,uScale;varying vec3 vC;void main(){vec4 mv=modelViewMatrix*vec4(position,1.);gl_Position=projectionMatrix*mv;float on=aData.y>0.?mix(.05,1.,step(fract(uTime*aData.y+aData.z),aData.w)):.85+.15*sin(uTime*1.7+aData.z*37.);float px=aData.x*uScale/max(-mv.z,1.);vC=aColor*on*clamp(px*.5,.1,1.);gl_PointSize=clamp(px,2.,220.);}',
    fragmentShader: 'varying vec3 vC;void main(){vec2 p=gl_PointCoord*2.-1.;float d=dot(p,p);if(d>1.)discard;gl_FragColor=vec4(vC*(exp(-d*5.5)+.6*exp(-d*60.)),1.);}' }));
  pts.onBeforeRender = (rd, sc, cam) => { u.uScale.value = (G.gfx?.ph || 1080) / (2 * Math.tan((cam.fov || 60) * Math.PI / 360)); };
  return pts;
}
/**
 * 小型船の編隊: craft を n 機インスタンス化し、path(i, t, out) の軌道に沿って機首を進行方向へ向ける
 * path の戻り値: false = 非表示 / true = 表示 / 数値 = 縮尺 (遠ざかって消える演出用)。戻り値 = 毎フレーム呼ぶ関数 (t)
 */
export function traffic(obj, craft, n, path, o = {}) {
  const fleet = instanced(craft, n), tmp = new THREE.Object3D(), P = new THREE.Vector3(), Q = new THREE.Vector3(), Z0 = new THREE.Matrix4().makeScale(0, 0, 0), up = o.up || V(0, 1, 0), gs = o.gs || 16;
  const gl = o.glow ? Array.from({ length: n }, () => { const s = makeGlowSprite(o.glow, gs, 2.2); s.visible = false; obj.add(s); return s; }) : null; obj.add(fleet);
  return (t) => {
    for (let i = 0; i < n; i++) {
      const k = path(i, t, P); if (!k) { fleet.userData.set(i, Z0); if (gl) gl[i].visible = false; continue; }
      const sc = k === true ? 1 : k; path(i, t + 0.1, Q); tmp.position.copy(P); tmp.up.copy(up); tmp.scale.setScalar(sc); tmp.lookAt(P.x * 2 - Q.x, P.y * 2 - Q.y, P.z * 2 - Q.z); tmp.updateMatrix(); fleet.userData.set(i, tmp.matrix);
      if (gl) { Q.sub(P); const d = Q.length(); gl[i].visible = true; gl[i].position.copy(P); if (d > 1e-5) gl[i].position.addScaledVector(Q, -(o.tail || 8) / d); gl[i].scale.setScalar(gs * sc); }
    }
    fleet.userData.commit();
  };
}
/** 透明・加算合成のメッシュが影を落とさないようにする (光錐やガラス) */
export function noShadow(obj) { obj.traverse((o) => { if (o.isMesh && (o.material.transparent || o.material.isShaderMaterial)) { o.castShadow = false; o.receiveShadow = false; } }); }
