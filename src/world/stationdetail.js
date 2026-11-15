// 追加ステーションの外装ディテール (1): アトラス救難基地・メガトン
//   本体の形は stations2.js。ここでは艤装 (配管・アンテナ・タンク・貨物・係留船・進入ゲート)、灯火群、行き交う小型船を足す
//   どの関数も「静的な部品を Builder に追加 → 動く部品を後から載せる関数を返す」という 2 段構え
import * as THREE from 'three';
import { Builder, mx } from '../gfx/builder.js';
import { mat, glow } from '../gfx/textures.js';
import { makeGlowSprite } from '../gfx/fx.js';
import { rng } from '../core/util.js';
import { V } from './stationkit.js';
import { cloneShared, instanced } from './rescue.js';
import { kit, at, wp, frame, signOn, beamMat, rod, truss, dish, mast, tank, ball, containers, rcs, gantry, flood, buoy, gate, ringLights, freighter, tug, shuttle, tram, craftOf, warmWin, lightField, traffic, noShadow } from './stationparts.js';

const HP = Math.PI / 2, TAU = Math.PI * 2, RAD = Math.PI / 180;
const ADD = { transparent: true, blending: THREE.AdditiveBlending, depthWrite: false };
const RELIEF = [0xf2f3ef, 0xf2f3ef, 0xff5412, 0x3a9a5a, 0xe4e6e8]; // 救援物資コンテナの色

// ───────────────────────── アトラス救難基地 ─────────────────────────
/** c: { H, A, D, GD, signs } */
export function detailAtlas(b, c) {
  const m = kit({ H: c.H, D: c.D, A: c.A, uvs: 0.03 }), r = rng(5150), F = [], up = V(0, 1, 0), dn = V(0, -1, 0), GD = c.GD, radars = [];
  const GX = glow('#35ff8a', 2.2), GO = glow('#ffb060', 3), GWh = glow('#fff2d8', 3), GC = glow('#8fe8ff', 3);
  const SKY = mat('flat', { color: 0x2a2014, rough: 0.1, metal: 0.6, emissive: '#ffd9a0', ei: 0.9 }), BL = mat('hull', { color: 0x4a8fd8, rough: 0.5, metal: 0.3, uvs: 0.03 });
  const pol = (a, R, y) => V(Math.cos(a) * R, y, Math.sin(a) * R), rad = (a) => V(Math.cos(a), 0, Math.sin(a)), tan = (a) => V(-Math.sin(a), 0, Math.cos(a));

  // ── 発進甲板: 係留クレードルまわり (局所 X = 接線, Z = 半径方向, 原点 = 甲板面) ──
  for (let i = 0; i < 15; i++) {
    const a = (i * 24 + 12) * RAD, P = at(b, pol(a, 0, 17), up, rad(a));
    c.signs.push(signOn('M-' + String(i + 1).padStart(2, '0'), '#ffb060', 9, pol(a, 213, 17.5).addScaledVector(tan(a), 21), V(Math.sin(a), 0, -Math.cos(a)), up, { intensity: 2.2 }));
    P.box(m.HZ, 26, 0.3, 4.6, 0, 0.3, 233);                                                    // 縁のゼブラ帯
    for (let k = 0; k < 4; k++) for (const s of [-1, 1]) P.box(GO, 5.4, 0.2, 0.7, s * 2.3, 0.45, 193 + k * 10, s * 0.6); // 発進方向のシェブロン
    for (const s of [-1, 1]) {
      P.box(m.Y, 5, 3, 7, s * 17, 2.1, 229); P.box(m.D, 5.4, 0.8, 7.4, s * 17, 0.5, 229); P.cyl(m.D, 1.6, 1.6, 2.4, s * 17, 4.5, 229, 'x', 12); P.box(GWh, 0.3, 0.8, 4, s * 14.3, 2.4, 229); // 給油車
      for (const z of [246.8, 266.4]) P.box(m.Y, 3.4, 1.7, 1.6, s * 3, -19.3, z);              // スキッド止め
      rod(P, m.D, V(s * 9, -12.4, 241), V(s * 4.6, -15.2, 249.5), 0.45);                       // 給油アーム
      rod(P, m.D, V(s * 3, -23, 270), V(s * 3, -33.4, 236.5), 0.7);                            // クレードルの方杖
      P.box(GX, 0.5, 0.5, 0.5, s * 6.2, -18.9, 276);
    }
    F.push({ p: wp(P, 0, -24.6, 258), c: '#ff4030', s: 5 }, { p: wp(P, 0, 1.2, 236), c: '#ffd23a', s: 5, blink: 1.1, ph: i / 15, duty: 0.3 });
  }
  // ── 発進甲板: 建屋まわり・縁の艤装・投光マスト ──
  for (let i = 0; i < 15; i++) {
    const a = i * 24 * RAD, ra = rad(a), ta = tan(a), P = at(b, pol(a, 0, 17), up, ra);
    P.box(m.GR, 44, 0.4, 7, 0, -3.6, 245); P.box(m.D, 44, 1.1, 0.3, 0, -2.8, 248.4); for (const s of [-1, 1]) rod(P, m.D, V(s * 20, -3.8, 248), V(s * 20, -14, 240.6), 0.4); // 縁のキャットウォーク
    rcs(at(b, pol(a, 239.3, -2), ra), m, 5);
    F.push({ p: mast(at(b, pol(a, 191.5, 17), up, ra), m, 26, { r: 0.7 }), c: '#ff4030', s: 7, blink: 0.7, ph: i / 15 });
    for (const s of [-1, 1]) flood(b, m, pol(a, 192.5, 41).addScaledVector(ta, s * 1.8), V(0, -1, 0).addScaledVector(ra, 0.75).addScaledVector(ta, s * 0.9), 46, 15, '#fff2d8', 0.2);
    if (i % 3 === 0) {          // 管制棟の屋上: パラボラ・空調・回転レーダー
      dish(at(b, pol(a, 219, 30.3).addScaledVector(ta, -5), up, ra), m, 3.6, { el: 0.6, az: i }); P.box(m.D, 6, 2.2, 4, 6, 14.4, 213); P.box(m.D, 3, 1.4, 3, -6, 14, 204); radars.push(pol(a, 222, 30.3).addScaledVector(ta, 5));
    } else if (i % 3 === 1) {   // 給油塔: 燃料タンクと弁
      for (const s of [-1, 1]) { tank(at(b, pol(a, 212, 17).addScaledVector(ta, s * 15), up, ra), m, 3.2, 12, s > 0 ? m.A : m.H); rod(P, m.A, V(s * 7.2, 1, 214), V(s * 12.4, 1, 214), 0.5); }
      P.box(m.D, 18, 1.6, 2.4, 0, 1.1, 226); P.box(GO, 16, 0.3, 0.5, 0, 2.05, 226);
    } else {                    // 格納庫口: 救援物資の山と門型クレーン
      for (const s of [-1, 1]) containers(at(b, pol(a, 209, 17).addScaledVector(ta, s * 17), up, ra), r, 1, 2, 3, { l: 7, w: 3.2, h: 3.2, pal: RELIEF });
      gantry(at(b, pol(a, 229.5, 17), up, ta), m, 9, 11, 18, r() * 0.5 - 0.25);
    }
  }
  // ── 甲板の縁と下面: 控え壁・桁・環状配管・吊り下げ燃料タンク ──
  for (let i = 0; i < 60; i++) { if (i % 4 === 2) continue; const a = i * 6 * RAD; b.add(m.D, new THREE.BoxGeometry(2.4, 19, 2.6), mx(Math.cos(a) * 237.5, 0, Math.sin(a) * 237.5, 0, -a, 0)); }
  for (let i = 0; i < 30; i++) { const a = (i * 12 + 6) * RAD; b.add(m.D, new THREE.BoxGeometry(84, 5, 3.4), mx(Math.cos(a) * 196, -19.5, Math.sin(a) * 196, 0, -a, 0)); }
  for (const [R1, t] of [[172, 1.5], [200, 1.8], [226, 1.5]]) b.tor(m.D, R1, t, 0, -21, 0, HP, 0, 0, 120, 6);
  b.tor(GO, 213, 0.35, 0, -22.2, 0, HP, 0, 0, 120, 4);
  for (let i = 0; i < 15; i++) { const a = (i * 24 + 12) * RAD; tank(at(b, pol(a, 212, -17), dn, tan(a)), m, 5, 22, i % 2 ? m.A : m.H); F.push({ p: pol(a, 212, -30.5), c: '#fff2d8', s: 5 }); }
  // ── 胴体: 縦リブ・脱出ポッド・水タンク・通信ディッシュ ──
  for (let k = 0; k < 8; k++) { const a = (22.5 + k * 45) * RAD; b.add(m.D, new THREE.BoxGeometry(3.5, 56, 3), mx(Math.cos(a) * 137.6, -41, Math.sin(a) * 137.6, 0, -a, -0.51)); }
  for (let k = 0; k < 24; k++) {
    const a = (k * 15 + 7.5) * RAD, P = at(b, pol(a, 110.3, -84), rad(a).multiplyScalar(0.827).setY(-0.563), up);
    P.box(m.D, 7.4, 1, 13, 0, 0.3, 0); P.add(k % 4 ? m.H : m.A, new THREE.CapsuleGeometry(2.5, 6.4, 4, 10), mx(0, 1.1, 0, HP, 0, 0)); P.box(m.A, 5.2, 2.2, 1.4, 0, 1.2, -4.6); P.box(GX, 1.2, 0.3, 1.2, 0, 3.65, 1.4);
  }
  for (let k = 0; k < 8; k++) { const a = (k * 45 + 22.5) * RAD; ball(at(b, pol(a, 53.5, -172), rad(a), up), m, 8, k % 2 ? BL : m.H); }
  for (let k = 0; k < 3; k++) { const a = (30 + k * 120) * RAD; dish(at(b, pol(a, 75, -143), rad(a).setY(-0.45), up), m, 13, { el: 0.35, az: k * 2 }); }
  // ── 太陽電池翼 (±X に 150m) ──
  for (const s of [-1, 1]) {
    truss(b, m.D, V(s * 74, -140, 0), V(s * 112, -140, 0), 6);
    const P = at(b, V(s * 112, -140, 0), V(0, Math.cos(0.4), Math.sin(0.4) * s), V(s, 0, 0));
    P.box(GD, 1.6, 1.6, 154, 0, 0, 77); P.box(m.D, 60, 1, 1.2, 0, -0.3, 153.5);
    for (let j = 0; j < 5; j++) { for (const q of [-1, 1]) P.box(m.S, 27, 0.7, 28, q * 15.5, 0, 16 + j * 30.5); P.box(m.D, 60, 1, 1.2, 0, -0.3, 1 + j * 30.5); }
    for (const q of [-1, 1]) { P.box(GD, 0.8, 1, 153, q * 29.5, 0, 77); F.push({ p: wp(P, q * 30, 1, 154), c: s * q > 0 ? '#3f6' : '#f33', s: 8, blink: 0.8, ph: 0.2 }); }
  }
  // ── キール: 観測ゴンドラとセンサー腕 ──
  b.sph(m.H, 7, 0, -206, 0, 1, 0.8, 1, 16); b.tor(GC, 7.1, 0.3, 0, -206, 0, HP, 0, 0, 28, 4);
  for (const [y, R1] of [[-218, 9], [-236, 6.5], [-254, 4.5]]) {
    b.tor(m.D, R1, 0.7, 0, y, 0, HP, 0, 0, 24, 5);
    for (let k = 0; k < 4; k++) { const a = k * HP + y; rod(b, m.D, V(0, y, 0), pol(a, R1 * 2.6, y - 3), 0.35); b.sph(k % 2 ? m.A : m.H, 1.3, Math.cos(a) * R1 * 2.6, y - 3, Math.sin(a) * R1 * 2.6, 1, 1, 1, 8); }
  }
  F.push({ p: V(0, -283, 0), c: '#ff4030', s: 16, blink: 0.6, ph: 0.4 });
  // ── 救命病棟 4 棟: 病棟名・非常口・窓帯・キャットウォーク・支柱・救急艇 ──
  for (let k = 0; k < 4; k++) {
    const a = (45 + k * 90) * RAD, ra = rad(a), ta = tan(a);
    c.signs.push(signOn('第 ' + (k + 1) + ' 病棟', '#5dffa8', 4.4, pol(a, 201.4, -56.6), V(Math.sin(a), 0, -Math.cos(a)), ra));
    for (const s of [-1, 1]) {
      const P = at(b, pol(a, 162, -42).addScaledVector(ta, s * 25.2), ta.clone().multiplyScalar(s), up); // 側面: 局所 X = 半径方向, Z = 上
      for (const x of [-22, 0, 22]) { P.box(m.D, 7, 0.6, 9, x, 0.2, -8); P.box(GX, 5, 0.3, 0.5, x, 0.45, -2.9); P.box(GWh, 2.4, 0.3, 3, x, 0.42, -7); }
      P.box(GWh, 62, 0.3, 1.6, 0, 0.25, 10); P.box(GWh, 62, 0.3, 0.8, 0, 0.25, 5);
      P.box(m.GR, 66, 5, 0.4, 0, 2.6, -13.4); P.box(m.D, 66, 0.3, 1.2, 0, 5, -12.8);
      rod(b, m.D, pol(a, 190, -64).addScaledVector(ta, s * 18), pol(a, 111, -100).addScaledVector(ta, s * 10), 1.6);
    }
    if (k % 2 === 0) { // 接舷中の救急艇
      const q = pol(a, 0, -52).addScaledVector(ta, -17); rod(b, m.D, q.clone().addScaledVector(ra, 200), q.clone().addScaledVector(ra, 212), 3, 3, 12, false);
      shuttle(at(b, q.clone().addScaledVector(ra, 223), up, ra), m, c.A); F.push({ p: q.clone().addScaledVector(ra, 236).setY(-47), c: '#35ff8a', s: 6, blink: 1, ph: k / 4 });
    }
  }
  // ── ドッキングアーム: 配管・救援物資・タンク・クレーン・進入ゲート ──
  for (const x of [-5, 0, 5]) b.cyl(x ? m.A : m.H, 0.9, 0.9, 148, x, -30.9, 222, 'z', 6);
  for (const [z0, n] of [[192.5, 8], [237.5, 8], [277, 6]]) for (const s of [-1, 1]) containers(at(b, V(s * 10.2, -42, z0), V(s, 0, 0), V(0, 0, 1)), r, 2, 2, n, { l: 7.5, w: 3.4, h: 3.2, pal: RELIEF });
  for (const z0 of [192, 237]) for (const s of [-1, 1]) tank(at(b, V(s * 5, -52, z0), dn, V(0, 0, 1)), m, 3.6, 20, s > 0 ? m.H : BL);
  { const P = at(b, V(-8, -32, 250), up, V(0, 0, 1)); P.box(m.Y, 2.4, 9, 2.4, 0, 4.5, 0); P.box(m.Y, 1.6, 1.6, 30, 0, 9.6, 10); P.box(m.D, 3.4, 3, 5, 0, 9.8, -6); P.cyl(m.D, 0.15, 0.15, 7, 0, 5.6, 23, 'y', 4); P.box(m.Y, 1.6, 1.2, 1.6, 0, 1.8, 23); }
  for (let i = 0; i < 16; i++) for (const s of [-1, 1]) F.push({ p: V(s * 10.6, -30.6, 148 + i * 10), c: '#fff2d8', s: 4 });
  for (const s of [-1, 1]) { b.box(m.HZ, 3, 28, 0.6, s * 16.5, -45, 321.3); F.push({ p: V(s * 19, -24, 322), c: '#ff4030', s: 9, blink: 1.2, ph: s * 0.25 + 0.25 }); flood(b, m, V(s * 15, -22.5, 320), V(s * 0.25, -0.25, 1), 70, 16, '#dfffee', 0.16); }
  b.box(m.HZ, 36, 3, 0.6, 0, -58.5, 321.3);
  for (let k = 0; k < 4; k++) for (const p of gate(b, m, V(0, -42, 392 + k * 84 + k * k * 4), V(0, 0, 1), 30 + k * 4, 8, 1.2)) F.push({ p, c: '#5dffa8', s: 8, blink: 0.8, ph: k * 0.22, duty: 0.3 });
  // ── 司令塔: 控え壁・回廊・艦橋の窓帯・レーダー面・投影機の柱・アンテナ ──
  for (let k = 0; k < 8; k++) { const a = (k * 45 + 22.5) * RAD; b.add(m.D, new THREE.BoxGeometry(5, 34, 2.4), mx(Math.cos(a) * 71, 42, Math.sin(a) * 71, 0, -a, 0.54)); }
  for (const [y, R1] of [[72, 54.4], [92, 49.6]]) { b.tor(m.D, R1, 1.2, 0, y, 0, HP, 0, 0, 72, 6); b.tor(GX, R1 + 1.3, 0.25, 0, y + 0.6, 0, HP, 0, 0, 72, 4); }
  b.cyl(GWh, 46.2, 46.7, 2.6, 0, 100, 0, 'y', 64, true); b.cyl(m.D, 47.6, 47.6, 0.8, 0, 102, 0, 'y', 64);
  for (let k = 0; k < 48; k++) { const a = k * TAU / 48; b.add(m.D, new THREE.BoxGeometry(1.2, 3.4, 0.5), mx(Math.cos(a) * 46.8, 100, Math.sin(a) * 46.8, 0, -a, 0)); }
  for (let k = 0; k < 4; k++) { const a = (45 + k * 90) * RAD, P = at(b, pol(a, 33.6, 138), rad(a), up); P.box(m.D, 16, 1.4, 22, 0, 1.4, 0); P.box(m.D, 3, 2.4, 3, 0, 0, 0); for (let j = -2; j <= 2; j++) P.box(GC, 14, 0.2, 0.4, 0, 2.2, j * 4.4); }
  for (let k = 0; k < 8; k++) { const a = k * TAU / 8 + 0.39; b.add(m.D, new THREE.BoxGeometry(3, 10, 3), mx(Math.cos(a) * 50, 186, Math.sin(a) * 50, 0, -a, 0)); b.add(GC, new THREE.BoxGeometry(1.6, 2.4, 1.6), mx(Math.cos(a) * 49.4, 192, Math.sin(a) * 49.4, 0, -a, 0)); }
  for (let k = 0; k < 6; k++) { const a = (k * 60 + 10) * RAD; F.push({ p: mast(at(b, pol(a, 57, 110), up, rad(a)), m, 20 + (k % 2) * 8), c: k % 2 ? '#ff4030' : '#fff2d8', s: 6, blink: k % 2 ? 0.9 : 0, ph: k / 6 }); }
  for (const d of [100, 280]) dish(at(b, pol(d * RAD, 56, 110), up, rad(d * RAD)), m, 7, { el: 0.8, az: d * RAD });
  // ── 上段デッキ (司令塔の足もと): 溝・天窓ドーム・機器 ──
  for (let k = 0; k < 12; k++) { const a = k * TAU / 12; b.add(m.D, new THREE.BoxGeometry(34, 1, 3), mx(Math.cos(a) * 101, 30.2, Math.sin(a) * 101, 0, -a, 0)); }
  for (let k = 0; k < 6; k++) {
    const a = k * 60 * RAD, p = pol(a, 134, 29.8), q = pol(a + 0.52, 134, 30); b.sph(SKY, 8, p.x, p.y, p.z, 1, 0.45, 1, 16); b.tor(GD, 8.1, 0.5, p.x, 30.2, p.z, HP, 0, 0, 24, 5);
    if (k % 2) dish(at(b, q, up, rad(a)), m, 7, { el: 0.5, az: k }); else { b.box(m.D, 9, 4, 7, q.x, 32, q.z, -a); b.box(m.GR, 7, 0.4, 5, q.x, 34.1, q.z, -a); }
  }
  // ── 天球儀: 赤道環の目盛り・経線と回帰線の灯・腕の継手と流れる灯 ──
  const CY = 262, SR = 200, TY = SR * Math.sin(0.62), TR = SR * Math.cos(0.62);
  for (let i = 0; i < 72; i++) { const a = i * 5 * RAD, big = i % 6 === 0; b.add(GD, new THREE.BoxGeometry(big ? 5 : 2.4, big ? 4.4 : 2.2, 1.2), mx(Math.cos(a) * SR, CY + 5.2 + (big ? 2 : 1), Math.sin(a) * SR, 0, -a, 0)); if (big) F.push({ p: pol(a, SR + 8, CY), c: '#ffe6a8', s: 7 }); }
  for (let k = 0; k < 3; k++) {
    const d = V(Math.cos(k * Math.PI / 3), 0, -Math.sin(k * Math.PI / 3));
    for (let j = 0; j < 24; j++) { const ph = (j + 0.5) * TAU / 24; if (Math.abs(Math.cos(ph)) > 0.985 || Math.sin(ph) < -0.95) continue; F.push({ p: d.clone().multiplyScalar(Math.cos(ph) * (SR + 6)).setY(CY + Math.sin(ph) * (SR + 6)), c: '#ffe6a8', s: 5, ph: j * 0.13 }); }
  }
  for (const s of [-1, 1]) ringLights(F, frame(V(0, CY + s * TY, 0), up), TR + 5, 18, { c: '#8fe8ff', s: 5, k: 2 });
  for (let k = 0; k < 4; k++) {
    const a = (45 + k * 90) * RAD, cs = Math.cos(a), sn = Math.sin(a), cur = new THREE.CatmullRomCurve3([[150, 14], [214, 60], [252, 150], [236, 226], [SR + 2, CY]].map(([R1, y]) => V(cs * R1, y, sn * R1)));
    for (let j = 1; j <= 8; j++) { const t = j / 9; at(b, cur.getPoint(t), cur.getTangent(t)).add(j > 4 ? m.H : GD, new THREE.TorusGeometry(9.6, 1.1, 5, 20).rotateX(HP)); }
    for (let j = 0; j < 16; j++) F.push({ p: cur.getPoint((j + 0.5) / 16).addScaledVector(rad(a), 10.5), c: '#8fe8ff', s: 5, blink: 0.45, ph: 1 - j / 16, duty: 0.3 });
  }

  // ── 動くもの: 回転レーダー・回帰線を巡る観測台車・探照灯・作業艇・救急艇 ──
  return (o) => {
    const obj = o.obj; noShadow(obj); obj.add(lightField(F));
    const rb = new Builder(); rb.box(m.D, 9, 1, 2.4, 0, 2.6, 0); rb.box(m.D, 1, 2.4, 1, 0, 1.2, 0); rb.box(GC, 8.4, 0.2, 0.3, 0, 2.6, 1.3);
    const rg = rb.build({ shadow: false }), spin = radars.map((p) => { const g = cloneShared(rg); g.position.copy(p); obj.add(g); return g; });
    const cb = new Builder(); cb.box(GD, 7, 4, 10, 0, 0, 0); cb.box(m.D, 8, 1.2, 4, 0, -2.4, 0); cb.sph(GC, 1.6, 0, 3.2, 0, 1, 1, 1, 10);
    const cg = cb.build({ shadow: false }), carts = [0, 1, 2].map(() => { const g = cloneShared(cg); g.add(makeGlowSprite('#8fe8ff', 26, 1.6)); obj.add(g); return g; });
    const sl = [0, 1].map(() => { const g = new THREE.Group(), arm = new THREE.Group(), cone = new THREE.Mesh(new THREE.CylinderGeometry(34, 1.2, 520, 24, 1, true), beamMat('#dff4ff', 0.2)); cone.position.y = 260; arm.rotation.z = -1.1; arm.add(cone); g.add(arm); g.position.set(0, 108, 0); obj.add(g); return g; });
    const tugs = traffic(obj, craftOf((B) => tug(B, m)), 5, (i, t, P) => { const a = t * (0.05 + i * 0.006) * (i % 2 ? 1 : -1) + i * 1.3, R1 = 330 + i * 22; P.set(Math.cos(a) * R1, -95 - i * 28 + Math.sin(a * 2 + i) * 20, Math.sin(a) * R1); return true; }, { glow: '#ffb060', gs: 12, tail: 9 });
    const amb = traffic(obj, craftOf((B) => shuttle(B, m, c.A)), 2, (i, t, P) => { const a = (135 + i * 180) * RAD, u = t * 0.06 + i * 2.4; P.set(0, -52 + Math.sin(u * 2) * 8, 0).addScaledVector(rad(a), 570 + 345 * Math.cos(u)).addScaledVector(tan(a), 160 * Math.sin(u) - 17); return true; }, { glow: '#9fe8ff', gs: 14, tail: 13 });
    o.anim.push((t) => {
      for (let i = 0; i < spin.length; i++) spin[i].rotation.y = t * 1.4 + i;
      carts.forEach((g, i) => { const a = t * 0.05 * (i === 2 ? -1 : 1) + i * 2.1; g.position.set(Math.cos(a) * (TR + 8.5), CY + (i === 2 ? -TY : TY), Math.sin(a) * (TR + 8.5)); g.rotation.y = -a; });
      sl[0].rotation.y = t * 0.11; sl[1].rotation.y = t * 0.11 + Math.PI; tugs(t); amb(t);
    });
  };
}

// ───────────────────────── メガトン ─────────────────────────
/** 回転居住リング (rb) の艤装。戻り値 = リングと一緒に回る灯火のリスト */
export function detailMegaRing(rb, c) {
  const { D, WT, BR, R, er, et, ez } = c, RG = 640, F = [], GRN = mat('flat', { color: 0x0c2a18, rough: 0.08, metal: 0.85, emissive: '#3aff8a', ei: 0.55 });
  for (let i = 0; i < 36; i++) {
    const a = i * TAU / 36 + 0.05, e = er(a);
    rb.add(D, new THREE.TorusGeometry(48.5, 2.4, 5, 28).rotateX(HP), mx(e.x * RG, e.y * RG, 0, 0, 0, a)); // 環に被さるフープ
    if (i % 6 === 0) continue;                                                                            // スポークの付け根は空けておく
    if (i % 3 === 0) { const P = at(rb, e.clone().multiplyScalar(RG - 56), e.clone().negate(), ez); P.add(GRN, new THREE.SphereGeometry(21, 18, 8, 0, TAU, 0, HP)); P.tor(BR, 21.4, 1.2, 0, 0.6, 0, HP, 0, 0, 28, 5); F.push({ p: e.clone().multiplyScalar(RG - 80), c: '#8fffc0', s: 12, k: 1.4 }); } // 温室ドーム
    else rb.add(i % 2 ? WT : D, new THREE.BoxGeometry(i % 2 ? 36 : 26, 16, i % 2 ? 46 : 64), mx(e.x * (RG + 52), e.y * (RG + 52), 0, 0, 0, a - HP)); // 外周の増設区画
    for (const s of [-1, 1]) F.push({ p: e.clone().multiplyScalar(RG + 4).setZ(s * 49), c: i % 2 ? '#ffe2b0' : '#bfe6ff', s: 8, k: 1.6, ph: i * 0.37 });
  }
  for (let i = 0; i < 6; i++) {
    const a = i * Math.PI / 3, e = er(a), t = et(a);
    for (const s of [-1, 1]) rod(rb, D, e.clone().multiplyScalar(R + 15).setZ(s * 38), e.clone().multiplyScalar(RG - 50), 1.6, 1.6, 5); // 控え索
    rod(rb, BR, e.clone().multiplyScalar(R + 30).addScaledVector(t, 21), e.clone().multiplyScalar(560).addScaledVector(t, 21), 1.2, 1.2, 5); // 昇降機の軌条
  }
  return F;
}

/** c: { H, D, WT, BR, Y, L, R, WIN, LAND, er, et, ez } */
export function detailMegaton(b, c) {
  const { D, H, WT, BR, Y, L, R, WIN, LAND, er, et, ez } = c, m = kit({ H, D, uvs: 0.014 }), r = rng(8080), F = [], TH = 28 * RAD, LM = 1150, Z0 = -1600, RR = 168;
  // ── 居住筒: 窓の格子・配管のポンプ・トラム駅・船名板の電飾 ──
  for (const a of WIN) {
    for (let i = 0; i < 16; i++) b.tor(D, R + 0.6, 1.5, 0, 0, -L / 2 + (i + 0.5) * L / 16, 0, 0, a - 30 * RAD, 14, 5, 60 * RAD);
    for (const d of [-20, 0, 20]) { const p = er(a + d * RAD).multiplyScalar(R + 0.8); b.add(D, new THREE.BoxGeometry(2.6, 2.6, L), mx(p.x, p.y, 0, 0, 0, a + d * RAD)); }
    for (const d of [-30, 30]) for (const s of [-1, 1]) { const e = er(a + d * RAD), P = at(b, e.clone().multiplyScalar(R + 10.5).setZ(s * 905), e, ez); P.box(WT, 15, 9, 44, 0, 4.5, 0); P.box(D, 17, 1.4, 46, 0, 9.6, 0); P.box(glow('#fff2d8', 3), 15.3, 0.6, 40, 0, 2.2, 0); F.push({ p: wp(P, 0, 13, 0), c: '#4de1ff', s: 9, blink: 0.6, ph: d > 0 ? 0 : 0.5, duty: 0.4 }); }
  }
  for (const a0 of LAND) for (const d of [-27, 27]) for (let i = 0; i < 8; i++) { const p = er(a0 + d * RAD).multiplyScalar(R + 6); b.add(BR, new THREE.BoxGeometry(13, 10, 20), mx(p.x, p.y, -1031.25 + i * 275, 0, 0, (a0 + d * RAD) - HP)); }
  LAND.forEach((a, si) => {
    const t = et(a), base = er(a).multiplyScalar(R + 9.5); let idx = 0;
    const put = (u, z) => F.push({ p: base.clone().addScaledVector(t, u).setZ(z), c: '#ffd27a', s: 9, k: 2.2, blink: 0.7, ph: ((idx++ % 4) / 4 + si * 0.13) % 1, duty: 0.5 });
    for (let z = -320; z <= 320; z += 20) { put(-88, z); put(88, z); }
    for (let u = -68; u <= 68; u += 17) { put(u, -326); put(u, 326); }
  });
  // ── 両端の蓋: 光の環・放射状のフィン・姿勢制御ノズル・前部の連絡管 ──
  for (const s of [-1, 1]) {
    const z0 = s * L / 2;
    for (const [R1, dz] of [[220, 28.3], [180, 65.9], [140, 103.6]]) b.tor(Y, R1 + 1.6, 0.9, 0, 0, z0 + s * dz, 0, 0, 0, 96, 4);
    for (let k = 0; k < 12; k++) { const e = er(k * TAU / 12 + 0.26); rod(b, D, e.clone().multiplyScalar(249).setZ(z0 + s * 3), e.clone().multiplyScalar(116).setZ(z0 + s * 127), 3.4, 3.4, 4, false); }
  }
  for (let k = 0; k < 6; k++) {
    const e = er(k * Math.PI / 3 + 0.26 + Math.PI / 12), P = at(b, e.clone().multiplyScalar(214).setZ(-L / 2 - 40), V(0, 0, -1), e);
    P.cyl(m.DD, 17, 9, 26, 0, 13, 0, 'y', 18, true); P.cyl(D, 11, 11, 10, 0, -2, 0, 'y', 14); P.add(glow('#ff9a3a', 1.3), new THREE.CircleGeometry(10.5, 18).rotateX(-HP), mx(0, 7, 0), 0); P.tor(BR, 17.2, 0.9, 0, 26, 0, HP, 0, 0, 24, 5);
  }
  for (let i = 0; i < 6; i++) { const e = er(i * Math.PI / 3 + 0.3 + Math.PI / 6); rod(b, H, e.clone().multiplyScalar(150).setZ(L / 2 + 92), e.clone().multiplyScalar(168).setZ(1320), 5, 5, 10, false); b.tor(BR, 6, 1.2, e.x * 159, e.y * 159, 1256, 0, 0, 0, 14, 5); }
  // ── 採光ミラー: 裏の筋交い・鏡面の目地・油圧シリンダー・縁の灯 ──
  for (const a of WIN) {
    const l = er(a).multiplyScalar(Math.sin(TH)).addScaledVector(ez, -Math.cos(TH)), n = er(a).multiplyScalar(Math.cos(TH)).addScaledVector(ez, Math.sin(TH)), t = et(a), hinge = er(a).multiplyScalar(R + 14).addScaledVector(ez, 780), B4 = new THREE.Matrix4().makeBasis(t, n, l);
    const on = (i, s, k) => hinge.clone().addScaledVector(l, i).addScaledVector(t, s).addScaledVector(n, k);
    for (let i = 0; i < 8; i++) for (const s of [-1, 1]) rod(b, D, on(i * LM / 8, s * 100, 6), on((i + 1) * LM / 8, -s * 100, 6), 2.2, 2.2, 5);
    for (let j = 1; j < 24; j++) b.add(D, new THREE.BoxGeometry(214, 0.5, 1.4), B4.clone().setPosition(on(j * LM / 24, 0, -2.2)));
    for (const s of [-53.5, 0, 53.5]) b.add(D, new THREE.BoxGeometry(1.4, 0.5, LM), B4.clone().setPosition(on(LM / 2, s, -2.2)));
    for (const s of [-1, 1]) {
      const A0 = er(a).multiplyScalar(R + 2).addScaledVector(ez, 690).addScaledVector(t, s * 70), A1 = on(150, s * 70, -2); rod(b, D, A0, A0.clone().lerp(A1, 0.55), 6, 6, 10, false); rod(b, BR, A0.clone().lerp(A1, 0.5), A1, 3.2, 3.2, 8, false);
      for (let i = 0; i <= 10; i++) F.push({ p: on(i * LM / 10, s * 108, 2), c: '#dfeaff', s: 7, k: 1.8, ph: i * 0.21 });
    }
  }
  // ── 前端の港: コンテナ帯・燃料タンク・接岸中の貨物船・アンテナ・進入ゲートと航路ブイ ──
  for (let i = 0; i < 30; i++) { const e = er(i * TAU / 30); containers(at(b, e.clone().multiplyScalar(64.6).setZ(1272), e, ez), r, 1, 2, 4, { l: 12, w: 10, h: 6 }); }
  for (let i = 0; i < 6; i++) {
    const a = i * Math.PI / 3 + 0.3, e = er(a), e2 = er(a + Math.PI / 6);
    tank(at(b, e2.clone().multiplyScalar(160).setZ(1330), e2.clone().negate(), ez), m, 9, 30, i % 2 ? m.A : H);
    if (i % 2) { freighter(at(b, e.clone().multiplyScalar(236).setZ(1340), e, ez), r, m); rod(b, D, e.clone().multiplyScalar(214).setZ(1330), e.clone().multiplyScalar(229).setZ(1330), 3, 3, 8, false); }
    F.push({ p: mast(at(b, e2.clone().multiplyScalar(57).setZ(1526), e2, ez), m, 30), c: i % 2 ? '#ff4030' : '#fff2d8', s: 9, blink: 0.8, ph: i / 6 });
  }
  for (let k = 0; k < 5; k++) {
    const z = 1650 + k * 130 + k * k * 12; for (const p of gate(b, m, V(0, 0, z), ez, 46 + k * 6, 8, 1.8)) F.push({ p, c: '#ffd27a', s: 11, blink: 0.8, ph: k * 0.18, duty: 0.3 });
    for (const s of [-1, 1]) F.push({ p: buoy(b, m, V(s * 150, 0, z + 60), 4), c: s > 0 ? '#3f6' : '#f33', s: 12, blink: 0.5, ph: k * 0.2 });
  }
  // ── 後端: 放熱板の母管と控え索・冷却管・炉の磁場コイル ──
  for (const [len, ang] of [[800, 0], [800, Math.PI], [520, HP], [520, -HP]]) {
    const e = er(ang), nn = et(ang), q = (rad, off, z) => e.clone().multiplyScalar(rad).addScaledVector(nn, off).setZ(z);
    for (const s of [-1, 1]) { rod(b, BR, q(92, s * 7, -1468), q(92, s * 7, -1172), 3.4, 3.4, 8); rod(b, BR, q(96, s * 9, -1400), q(150, s * 9, -1498), 4, 4, 8); rod(b, D, q(30, s * 56, -1320), q(len + 82, s * 4, -1320), 1.3, 1.3, 5); }
    for (let i = 0; i <= Math.round(len / 100); i++) for (const z of [-1168, -1472]) F.push({ p: q(90 + i * 100, 0, z), c: '#ff5a3a', s: 7, k: 1.6, ph: i * 0.3 });
  }
  for (let k = 0; k < 8; k++) for (const [zz, R1] of [[0, RR + 14], [96, 154.6], [-96, 154.6]]) {
    const p = er(k * Math.PI / 4).multiplyScalar(R1).setZ(Z0 + zz), nrm = p.clone().sub(V(0, 0, Z0)).normalize(), P = at(b, p.clone().addScaledVector(nrm, 7), nrm, ez);
    P.cyl(m.CU, 15, 15, 12, 0, 6, 0, 'y', 16); P.cyl(D, 17, 17, 3, 0, 1.5, 0, 'y', 16); P.cyl(D, 17, 17, 3, 0, 10.5, 0, 'y', 16); P.cyl(D, 6, 8, 8, 0, 16, 0, 'y', 10);
    F.push({ p: wp(P, 0, 23, 0), c: '#ffb060', s: 11, blink: 0.35, ph: (k / 8 + (zz ? 0.5 : 0)) % 1, duty: 0.5 });
  }

  // ── 動くもの: 外周トラム・貨物船の航路・港の曳船・スポークの昇降機・炉のプロミネンスと排気 ──
  return (o, rings, core) => {
    const obj = o.obj; noShadow(obj); obj.add(lightField(F));
    const tr = instanced(craftOf((B) => tram(B, m)), 12), M4 = new THREE.Matrix4(), X = new THREE.Vector3(), Zv = new THREE.Vector3(), beams = WIN.flatMap((a) => [a - 30 * RAD, a + 30 * RAD]); obj.add(tr);
    const conv = traffic(obj, craftOf((B) => freighter(B, rng(77), m)), 8, (i, t, P) => { const lane = i % 2, z = (((t * 55 + i * 1310) % 10400) - 5200) * (lane ? -1 : 1), k = Math.min(1, (5200 - Math.abs(z)) / 500); P.set(lane ? -1050 : 1050, lane ? -420 : 380, z); return k > 0.02 ? k : false; }, { glow: '#7fd8ff', gs: 60, tail: 46 });
    const tugs = traffic(obj, craftOf((B) => tug(B, m)), 5, (i, t, P) => { const a = t * (0.07 + i * 0.01) * (i % 2 ? 1 : -1) + i * 1.9, R1 = 300 + i * 26; P.set(Math.cos(a) * R1, Math.sin(a) * R1, 1420 + i * 22 + Math.sin(a * 3 + i) * 18); return true; }, { glow: '#ffb060', gs: 12, tail: 9, up: V(0, 0, 1) });
    // スポークの昇降機 (リングと一緒に回る)
    const carG = craftOf((B) => { B.box(H, 8, 14, 8, 0, 0, 0); B.box(warmWin(), 8.2, 3, 6, 0, 2, 0); B.box(D, 9, 1, 9, 0, 7.5, 0); B.box(D, 9, 1, 9, 0, -7.5, 0); }), cars = [];
    rings.forEach((g, ri) => { noShadow(g); for (let i = 0; i < 6; i++) { const car = cloneShared(carG), a = i * Math.PI / 3; car.rotation.z = a - HP; g.add(car); cars.push({ car, e: er(a), t: et(a), ph: i * 1.7 + ri * 0.9 }); } });
    // 炉: プロミネンス (プラズマの弧) と後方へ流れる排気
    const flares = [];
    if (core) for (let i = 0; i < 5; i++) {
      const d = V(Math.cos(i * 2.4) * Math.cos(i * 0.9 - 1), Math.sin(i * 2.4) * Math.cos(i * 0.9 - 1), Math.sin(i * 0.9 - 1)).normalize(), g = new THREE.Group(), fm = new THREE.MeshBasicMaterial({ color: new THREE.Color(4.2, 1.5, 0.35), ...ADD, toneMapped: false }), arc = new THREE.Mesh(new THREE.TorusGeometry(18 + i * 2.5, 2.2, 6, 28, Math.PI), fm);
      g.matrixAutoUpdate = false; g.matrix.copy(frame(d.clone().multiplyScalar(RR * 0.94), d)); g.add(arc); core.add(g); flares.push({ arc, fm, ph: i * 1.9 });
    }
    const plume = new THREE.Mesh(new THREE.CylinderGeometry(26, 90, 900, 32, 1, true), beamMat('#ff9a4a', 0.5)); plume.rotation.x = -HP; plume.position.z = Z0 - RR - 84 - 450; obj.add(plume);
    o.anim.push((t) => {
      for (let i = 0; i < 12; i++) { const u = ((t * 36 / 3500 + i * 0.137 + (i >= 6 ? 0.5 : 0)) % 1 + 1) % 1, fwd = u < 0.5, z = 875 * (fwd ? 4 * u - 1 : 3 - 4 * u), e = er(beams[i % 6]); Zv.set(0, 0, fwd ? -1 : 1); X.crossVectors(e, Zv); M4.makeBasis(X, e, Zv).setPosition(e.x * 264, e.y * 264, z); tr.userData.set(i, M4); }
      tr.userData.commit(); conv(t); tugs(t);
      for (const q of cars) { const rad = 310 + (0.5 + 0.5 * Math.sin(t * 0.1 + q.ph)) * 250; q.car.position.set(q.e.x * rad + q.t.x * 25, q.e.y * rad + q.t.y * 25, 0); }
      for (const f of flares) { const k = 0.5 + 0.5 * Math.sin(t * 0.5 + f.ph); f.fm.opacity = 0.25 + 0.6 * k; f.arc.scale.set(1, 0.6 + 0.7 * k, 1); }
    });
  };
}
