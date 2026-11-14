// 宇宙ステーション 9 基の外観 (それぞれ全く異なる構造)。追加の 4 基 (アトラス / メガトン / ファイザー / ウェポン) は stations2.js
import * as THREE from 'three';
import { Builder, mx, rockGeo, loft } from '../gfx/builder.js';
import { mat, glow } from '../gfx/textures.js';
import { rng, rr } from '../core/util.js';
import { V, winMat, port, done, sign, sdBox } from './stationkit.js';
import { BUILD2, SDF2 } from './stations2.js';

// ───────────────────────── 1. ヘイヴン・リング (交易ハブ) ─────────────────────────
function haven() {
  const b = new Builder(), H = mat('hull', { color: 0xdfe5ec, rough: 0.6, metal: 0.3 }), W = winMat(0xdfe5ec, 0xfff0d0), D = mat('hull', { color: 0x3a4049, rough: 0.8, metal: 0.6 }), S = mat('solar', { metal: 0.9, env: 1.6 });
  const C = glow('#4de1ff', 4), R = 250;
  b.tor(W, R, 24, 0, 0, 0, 0, 0, 0, 200, 8); // 居住リング
  b.tor(D, R + 23.5, 5, 0, 0, 0, 0, 0, 0, 200, 6); b.tor(D, R - 23.5, 4, 0, 0, 0, 0, 0, 0, 200, 6);
  for (const z of [-12, 12]) { b.tor(C, R + 27.6, 0.5, 0, 0, z, 0, 0, 0, 200, 5); b.tor(C, R - 26.6, 0.4, 0, 0, z, 0, 0, 0, 160, 5); }
  b.tor(H, R, 26.5, 0, 0, 0, 0, 0, 0, 200, 4, Math.PI * 2);
  for (let i = 0; i < 6; i++) {
    const a = i * Math.PI / 3;
    b.add(H, new THREE.CylinderGeometry(6, 8, R - 60, 14), mx(Math.cos(a) * (R / 2 + 16), Math.sin(a) * (R / 2 + 16), 0, 0, 0, a - Math.PI / 2));
    b.add(D, new THREE.BoxGeometry(22, 34, 30), mx(Math.cos(a) * (R - 30), Math.sin(a) * (R - 30), 0, 0, 0, a));
    b.add(W, new THREE.BoxGeometry(36, 16, 40), mx(Math.cos(a) * 105, Math.sin(a) * 105, 0, 0, 0, a));
    for (const s of [-1, 1]) b.add(D, new THREE.CylinderGeometry(1.2, 1.2, R - 70, 6), mx(Math.cos(a) * (R / 2 + 16) - Math.sin(a) * 11 * s, Math.sin(a) * (R / 2 + 16) + Math.cos(a) * 11 * s, s * 6, 0, 0, a - Math.PI / 2));
  }
  b.cyl(W, 46, 46, 110, 0, 0, 0, 'z', 40); b.cyl(D, 50, 50, 14, 0, 0, 30, 'z', 40); b.cyl(D, 50, 50, 14, 0, 0, -30, 'z', 40);
  b.cyl(H, 30, 46, 40, 0, 0, 75, 'z', 40); b.cyl(H, 46, 26, 50, 0, 0, -80, 'z', 40);
  b.tor(C, 47, 0.7, 0, 0, 55, 0, 0, 0, 80, 5); b.tor(C, 47, 0.7, 0, 0, -55, 0, 0, 0, 80, 5);
  const p = port(b, D, V(0, 0, 101), V(0, 0, 1));
  b.cyl(D, 5, 8, 120, 0, 0, -160, 'z', 16); b.cyl(D, 1, 1, 90, 0, 0, -260, 'z', 8);
  b.add(H, new THREE.CylinderGeometry(38, 4, 14, 32, 1, true), mx(0, 0, -224, Math.PI / 2, 0, 0)); // 通信ディッシュ
  for (let i = 0; i < 4; i++) { const a = i * Math.PI / 2 + Math.PI / 4, cx = Math.cos(a), cy = Math.sin(a); b.add(D, new THREE.CylinderGeometry(1.6, 1.6, 150, 8), mx(cx * 85, cy * 85, -150, 0, 0, a - Math.PI / 2)); b.add(S, new THREE.BoxGeometry(46, 1, 110), mx(cx * 105, cy * 105, -150, 0, 0, a)); }
  const lights = []; for (let i = 0; i < 12; i++) { const a = i * Math.PI / 6; lights.push({ p: V(Math.cos(a) * (R + 30), Math.sin(a) * (R + 30), 0), c: i % 2 ? '#f44' : '#fff', s: 26, blink: 0.6, ph: i / 12 }); }
  for (let i = 0; i < 6; i++) lights.push({ p: V(0, 0, 130 + i * 40), c: '#4f8', s: 14, blink: 1, ph: 1 - i / 6 });
  const o = done(b, { ports: [p], radius: 300, lights, signs: [sign('HAVEN RING', '#4de1ff', 16, 0, 62, 20, 0, 0), sign('ヘイヴン・リング 交易港', '#ffd27a', 9, 0, -62, 20, 0, 0)] });
  o.anim.push((t, dt) => { o.obj.rotation.z += dt * 0.035; });
  return o;
}

// ───────────────────────── 2. ヴァルカン造船廠 ─────────────────────────
function vulcan() {
  const b = new Builder(), H = mat('hull', { color: 0xc9b98f, rough: 0.7, metal: 0.35 }), Y = mat('hull', { color: 0xf0a020, rough: 0.6, metal: 0.3 }), D = mat('hull', { color: 0x363a42, rough: 0.85, metal: 0.6 }), W = winMat(0xb8b0a0, 0xffe0a0), RB = mat('rib', { color: 0x8a8f98, metal: 0.6 });
  const G = glow('#ffb347', 4), lights = [];
  b.box(D, 720, 14, 14, 0, 0, 0);
  for (let i = -8; i <= 8; i++) { b.box(H, 4, 22, 22, i * 44, 0, 0); for (const s of [-1, 1]) b.add(D, new THREE.CylinderGeometry(0.9, 0.9, 50, 6), mx(i * 44 + 22, 0, s * 9, 0, 0, Math.PI / 2 + s * 0.42)); }
  for (const s of [-1, 1]) { b.box(D, 720, 3, 3, 0, 12, s * 12); b.box(D, 720, 3, 3, 0, -12, s * 12); b.box(G, 700, 0.5, 0.5, 0, 14, s * 12); }
  const r = rng(31);
  for (let k = 0; k < 3; k++) {
    const x = (k - 1) * 215, len = 150, hw = 44;
    for (const s of [-1, 1]) {
      b.box(Y, 10, 120, 10, x - len / 2, -60, s * hw); b.box(Y, 10, 120, 10, x + len / 2, -60, s * hw); b.box(Y, len + 10, 8, 8, x, -120, s * hw); b.box(Y, len + 10, 6, 6, x, -10, s * hw);
      for (let i = 0; i < 5; i++) b.add(D, new THREE.CylinderGeometry(0.8, 0.8, 46, 6), mx(x - len / 2 + 18 + i * 30, -65 + (i % 2 ? 20 : -20), s * hw, 0, 0, i % 2 ? 0.7 : -0.7));
      b.box(D, 6, 6, 22, x + rr(r, -50, 50), -40 - k * 12, s * (hw - 14)); // クレーン腕
      for (let i = 0; i < 4; i++) lights.push({ p: V(x - len / 2 + i * len / 3, -8, s * hw), c: '#ffd9a0', s: 34, k: 1.6 });
    }
    b.box(Y, 8, 8, hw * 2, x - len / 2, -120, 0); b.box(Y, 8, 8, hw * 2, x + len / 2, -120, 0);
    // 建造中の船体骨格
    const prog = [0.35, 0.7, 1][k], n = 11;
    b.box(D, len * 0.9, 4, 5, x, -92, 0);
    for (let i = 0; i < n; i++) {
      const t = i / (n - 1), px = x - len * 0.42 + t * len * 0.84, R = (10 + Math.sin(t * Math.PI) * 17);
      b.tor(RB, R, 1.1, px, -66, 0, 0, Math.PI / 2, 0, 20, 6);
      if (t < prog) b.add(H, new THREE.CylinderGeometry(R + 1.2, R + 1.2, len * 0.084, 20, 1, true, 0, Math.PI * (1.2 + t)), mx(px, -66, 0, 0, 0, Math.PI / 2));
    }
    b.add(H, loft([{ z: -len * 0.42, w: 9, t: 9 }, { z: -len * 0.42 + len * 0.84 * prog * 0.5, w: 18, t: 18 }, { z: -len * 0.42 + len * 0.84 * prog * 0.72, w: 24, t: 24 }], 20), mx(x, -66, 0, 0, -Math.PI / 2, 0));
  }
  // 管制塔 + 燃料タンク
  b.box(W, 56, 90, 46, 392, 20, 0); b.box(D, 64, 8, 54, 392, 68, 0); b.box(W, 40, 30, 34, 392, 86, 0); b.cyl(D, 0.8, 0.8, 70, 392, 136, 0, 'y', 6);
  b.box(glow('#ffe6b0', 3), 57, 5, 47, 392, 50, 0);
  for (let i = 0; i < 4; i++) { b.sph(H, 22, -330 - (i % 2) * 48, 34 * (i < 2 ? 1 : -1), 0, 1, 1, 1, 24); b.tor(Y, 22.4, 1.2, -330 - (i % 2) * 48, 34 * (i < 2 ? 1 : -1), 0, Math.PI / 2, 0, 0, 32, 6); }
  b.box(D, 110, 6, 6, -350, 0, 0);
  const p = port(b, D, V(428, 10, 0), V(1, 0, 0), '#fc6');
  for (let i = 0; i < 6; i++) lights.push({ p: V(460 + i * 40, 10, 0), c: '#4f8', s: 14, blink: 1, ph: 1 - i / 6 });
  lights.push({ p: V(392, 172, 0), c: '#f33', s: 30, blink: 0.5, ph: 0 }, { p: V(-360, 0, 0), c: '#f33', s: 30, blink: 0.5, ph: 0.5 });
  return done(b, { ports: [p], radius: 480, lights, signs: [sign('VULCAN', '#ffb347', 20, 392, 20, 23.6), sign('造船廠', '#ffe0a0', 12, 392, -6, 23.6), sign('VULCAN', '#ffb347', 20, 392, 20, -23.6, Math.PI)] });
}

// ───────────────────────── 3. オーロラ天文台 ─────────────────────────
function aurora() {
  const b = new Builder(), H = mat('hull', { color: 0xf4f7fb, rough: 0.5, metal: 0.25 }), W = winMat(0xf0f4f8, 0xc8f0ff), D = mat('hull', { color: 0x40464f, rough: 0.8, metal: 0.6 }), S = mat('solar', { metal: 0.9, env: 1.6 });
  const A = new THREE.MeshStandardMaterial({ color: 0xd9b25a, roughness: 0.28, metalness: 1 }); A.userData.uvs = 0;
  const C = glow('#8feaff', 4), lights = [];
  b.sph(W, 58, 0, 0, 0, 1, 1, 1, 48); b.tor(D, 59, 3, 0, 0, 0, Math.PI / 2, 0, 0, 80, 8); b.tor(C, 62.5, 0.5, 0, 0, 0, Math.PI / 2, 0, 0, 80, 5);
  b.tor(H, 96, 5, 0, 0, 0, Math.PI / 2, 0, 0, 96, 10); b.tor(C, 101.4, 0.35, 0, 0, 0, Math.PI / 2, 0, 0, 96, 5);
  for (let i = 0; i < 8; i++) { const a = i * Math.PI / 4; b.add(D, new THREE.CylinderGeometry(1.4, 1.4, 38, 8), mx(Math.cos(a) * 77, 0, Math.sin(a) * 77, 0, -a, Math.PI / 2)); }
  // 大型望遠鏡 (金箔)
  b.cyl(A, 16, 16, 130, 0, 26, -110, 'z', 32, true); b.cyl(D, 17, 17, 8, 0, 26, -48, 'z', 32); b.cyl(D, 17.2, 17.2, 4, 0, 26, -172, 'z', 32, true);
  b.add(D, new THREE.CylinderGeometry(4, 4, 44, 12), mx(0, 26, -32, 0, 0, 0)); b.box(D, 12, 30, 12, 0, 12, -52);
  b.add(glow('#9fd0ff', 1.2), new THREE.CircleGeometry(15, 32), mx(0, 26, -150, 0, Math.PI, 0), 0);
  // パラボラアンテナ
  const dish = new THREE.LatheGeometry(Array.from({ length: 14 }, (_, i) => new THREE.Vector2(i * 7, (i * 7) ** 2 / 300)), 48);
  b.add(H, dish, mx(0, 96, 30, -0.5, 0, 0)); b.add(D, dish.clone().scale(1.01, 1.01, 1.01), mx(0, 95.4, 30.3, -0.5, 0, 0));
  b.cyl(D, 3, 5, 44, 0, 76, 20, 'y', 12); b.add(D, new THREE.CylinderGeometry(0.6, 0.6, 46, 6), mx(0, 116, 19, -0.5, 0, 0)); b.sph(C, 2, 0, 136, 8);
  // 太陽電池翼
  for (const s of [-1, 1]) {
    b.add(D, new THREE.CylinderGeometry(2, 2, 250, 10), mx(s * 215, 0, 0, 0, 0, Math.PI / 2));
    for (let k = 0; k < 4; k++) { b.box(S, 50, 0.8, 84, s * (132 + k * 55), 0, 0, 0, 0.5, 0); b.box(A, 51, 1.2, 1, s * (132 + k * 55), 20.2, -37, 0, 0.5, 0); }
    lights.push({ p: V(s * 345, 0, 0), c: s > 0 ? '#3f6' : '#f33', s: 22, blink: 0.7, ph: 0 });
  }
  for (let i = 0; i < 5; i++) { const a = i * 1.257 + 0.3; b.add(D, new THREE.CylinderGeometry(0.3, 0.6, 60, 6), mx(Math.cos(a) * 30, -74, Math.sin(a) * 30, Math.sin(a) * 0.3, 0, -Math.cos(a) * 0.3)); }
  b.cyl(H, 14, 20, 30, 0, -66, 0, 'y', 24);
  const p = port(b, D, V(0, -86, 0), V(0, -1, 0), '#8ef');
  for (let i = 0; i < 6; i++) lights.push({ p: V(0, -110 - i * 40, 0), c: '#4f8', s: 14, blink: 1, ph: 1 - i / 6 });
  const o = done(b, { ports: [p], radius: 360, lights, signs: [sign('AURORA', '#a6f0ff', 14, 0, 14, 59.5, 0, -0.2), sign('オーロラ天文台', '#ffffff', 7, 0, -4, 59.8)] });
  return o;
}

// ───────────────────────── 4. バスティオン要塞 ─────────────────────────
function bastion() {
  const b = new Builder(), H = mat('hull', { color: 0x6b727d, rough: 0.65, metal: 0.45 }), A = mat('hull', { color: 0x9c2a22, rough: 0.6, metal: 0.3 }), D = mat('hull', { color: 0x24272e, rough: 0.85, metal: 0.7 }), W = winMat(0x555b66, 0xffb090, 2);
  const G = glow('#ff5a3a', 4), O = glow('#ffa040', 5), lights = [];
  b.cyl(W, 130, 130, 70, 0, 0, 0, 'y', 6); b.cyl(H, 150, 130, 26, 0, 48, 0, 'y', 6); b.cyl(H, 130, 150, 26, 0, -48, 0, 'y', 6);
  b.cyl(D, 152, 152, 8, 0, 36, 0, 'y', 6); b.cyl(D, 152, 152, 8, 0, -36, 0, 'y', 6);
  b.cyl(H, 70, 96, 46, 0, 84, 0, 'y', 6); b.cyl(W, 44, 60, 40, 0, 126, 0, 'y', 6); b.cyl(D, 5, 8, 90, 0, 190, 0, 'y', 8); b.cyl(D, 74, 74, 5, 0, 108, 0, 'y', 6);
  b.cyl(H, 96, 60, 50, 0, -86, 0, 'y', 6); b.cyl(D, 30, 44, 30, 0, -126, 0, 'y', 6);
  for (let i = 0; i < 6; i++) {
    const a = i * Math.PI / 3 + Math.PI / 6, cx = Math.cos(a), cz = Math.sin(a), fa = i * Math.PI / 3, fx = Math.cos(fa), fz = Math.sin(fa);
    b.add(H, new THREE.CylinderGeometry(22, 26, 170, 6), mx(cx * 150, 0, cz * 150, 0, -a, 0)); b.add(A, new THREE.CylinderGeometry(27, 27, 12, 6), mx(cx * 150, 60, cz * 150, 0, -a, 0)); b.add(A, new THREE.CylinderGeometry(27, 27, 12, 6), mx(cx * 150, -60, cz * 150, 0, -a, 0));
    for (const s of [-1, 1]) { // 砲塔
      b.add(D, new THREE.CylinderGeometry(14, 17, 12, 12), mx(cx * 150, s * 91, cz * 150)); b.add(D, new THREE.SphereGeometry(11, 16, 10), mx(cx * 150, s * 99, cz * 150));
      for (const o of [-3.5, 3.5]) b.add(D, new THREE.CylinderGeometry(1.4, 1.8, 42, 8), mx(cx * 172 - cz * o, s * 100, cz * 172 + cx * o, 0, -a, Math.PI / 2));
    }
    b.add(G, new THREE.BoxGeometry(1, 150, 2), mx(cx * 173, 0, cz * 173, 0, -a, 0));
    // 格納庫スリット (フォースフィールド)
    b.add(D, new THREE.BoxGeometry(6, 34, 84), mx(fx * 112, 0, fz * 112, 0, -fa, 0)); b.add(O, new THREE.BoxGeometry(1, 20, 70), mx(fx * 115.2, 0, fz * 115.2, 0, -fa, 0), 0);
    b.add(A, new THREE.BoxGeometry(8, 8, 100), mx(fx * 114, 24, fz * 114, 0, -fa, 0)); b.add(A, new THREE.BoxGeometry(8, 8, 100), mx(fx * 114, -24, fz * 114, 0, -fa, 0));
    lights.push({ p: V(cx * 150, 112, cz * 150), c: '#f33', s: 26, blink: 0.5, ph: i / 6 });
  }
  // ドッキングアーム
  b.box(D, 18, 18, 110, 0, 0, 180); b.box(H, 30, 30, 26, 0, 0, 236);
  const p = port(b, D, V(0, 0, 254), V(0, 0, 1), '#f96');
  for (let i = 0; i < 6; i++) lights.push({ p: V(0, 0, 285 + i * 40), c: '#4f8', s: 14, blink: 1, ph: 1 - i / 6 });
  lights.push({ p: V(0, 238, 0), c: '#f33', s: 40, blink: 0.5, ph: 0 });
  return done(b, { ports: [p], radius: 300, lights, signs: [sign('BASTION', '#ff6b5a', 22, 0, 126, 53, 0, 0), sign('星系防衛軍', '#ffd0c0', 10, 0, 104, 78, 0, -0.5)] });
}

// ───────────────────────── 5. ローグズ・デン (小惑星基地) ─────────────────────────
function rogue() {
  const b = new Builder(), RK = mat('rock', { color: 0x6a5648, rough: 1, metal: 0.05, uvs: 0.012, ns: 1.6 }), D = mat('hull', { color: 0x2c2f36, rough: 0.85, metal: 0.6 }), W = winMat(0x5a5560, 0xff9ad8, 2.6), RB = mat('rib', { color: 0x9a5a3a, metal: 0.4 });
  const cols = [0xb8452e, 0x2e7ab8, 0xc9a22e, 0x3aa86a, 0x8a4ab8], r = rng(55), lights = [], signs = [];
  const rock = rockGeo(170, 6, 7, 0.42); rock.scale(1.25, 0.85, 1);
  b.add(RK, rock);
  for (let i = 0; i < 7; i++) { const g = rockGeo(rr(r, 12, 34), 3, 20 + i, 0.4), a = r() * 6.28, d = rr(r, 250, 400); b.add(RK, g, mx(Math.cos(a) * d, rr(r, -90, 90), Math.sin(a) * d)); }
  // 岩に食い込む居住モジュール & コンテナ街
  b.box(W, 70, 38, 60, 60, 132, 20, 0.3); b.box(W, 44, 60, 40, -40, 138, -30, -0.4); b.box(W, 50, 30, 50, 10, 150, 70, 0.8); b.cyl(W, 22, 22, 50, 110, 96, -40, 'y', 12);
  for (let i = 0; i < 26; i++) { const m = mat('rib', { color: cols[i % 5], metal: 0.3 }); b.box(m, 6, 6, 14, rr(r, -60, 90), 148 + Math.floor(r() * 3) * 6.2, rr(r, -70, 60), Math.floor(r() * 2) * Math.PI / 2 + rr(r, -0.1, 0.1)); }
  b.cyl(D, 3, 3, 90, -90, 150, 30, 'y', 8); b.add(D, new THREE.CylinderGeometry(26, 2, 10, 20, 1, true), mx(-90, 196, 30, 0.5, 0.4, 0));
  for (let i = 0; i < 5; i++) { const a = i * 1.3; b.add(RB, new THREE.CylinderGeometry(5, 5, 80, 10), mx(Math.cos(a) * 150, rr(r, -30, 60), Math.sin(a) * 120, r(), a, 1.2)); }
  // ドッキングアーム (岩から突き出す)
  b.add(RB, new THREE.CylinderGeometry(9, 9, 150, 12), mx(0, 30, 215, Math.PI / 2, 0, 0)); b.box(D, 34, 34, 30, 0, 30, 292);
  for (let i = 0; i < 4; i++) b.tor(glow('#ff4df0', 4), 10.5, 0.4, 0, 30, 160 + i * 34, 0, 0, 0, 24, 5);
  const p = port(b, D, V(0, 30, 312), V(0, 0, 1), '#f6f');
  for (let i = 0; i < 6; i++) lights.push({ p: V(0, 30, 340 + i * 40), c: '#f6f', s: 14, blink: 1, ph: 1 - i / 6 });
  for (let i = 0; i < 16; i++) { const a = i / 16 * 6.28; lights.push({ p: V(Math.cos(a) * 215, 18 + Math.sin(a * 3) * 12, Math.sin(a) * 172), c: i % 2 ? '#ff4df0' : '#4df0ff', s: 16, k: 1.8 }); }
  signs.push(sign("ROGUE'S DEN", '#ff4df0', 22, 60, 176, 52, 0.3, 0, { frame: true }), sign('酒 BAR', '#4df0ff', 14, -40, 184, -8, -0.4), sign('CASINO', '#ffe14d', 14, 10, 176, 96, 0.8, 0, { frame: true }), sign('闇市', '#ff5a3a', 18, 122, 132, -10, 1.2), sign("ROGUE'S DEN", '#ff4df0', 16, 18.5, 46, 292, Math.PI / 2, 0));
  const o = done(b, { ports: [p], radius: 420, lights, signs });
  return o;
}

const BUILD = { haven, vulcan, aurora, bastion, rogue, ...BUILD2 };
export function buildStation(def) { const o = BUILD[def.id](); o.def = def; return o; }

// ローグズ・デンの周囲の小岩: rogue() と同じ乱数列 (rng(55) の先頭から 4 回ずつ) で位置と大きさを再現する
const ROGUE_ROCKS = (() => { const r = rng(55), out = []; for (let i = 0; i < 7; i++) { const rad = rr(r, 12, 34), a = r() * 6.28, d = rr(r, 250, 400), y = rr(r, -90, 90); out.push([Math.cos(a) * d, y, Math.sin(a) * d, rad * 1.15]); } return out; })();
// ── 衝突判定用の近似距離関数 (ステーションのローカル座標) ──
const SDF = {
  haven: (x, y, z) => { // リングとハブに加え、スポーク 6 本・居住モジュール 6 基・後部マスト・通信ディッシュ・太陽電池パネル (以前は判定なし)
    const r = Math.hypot(x, y); let d = Math.min(Math.hypot(r - 250, z) - 28, Math.max(r - 50, Math.abs(z) - 100), Math.max(r - 8, Math.max(z + 100, -z - 305)), Math.max(r - 39, Math.abs(z + 224) - 7));
    for (let i = 0; i < 6; i++) { const a = i * Math.PI / 3, c = Math.cos(a), s = Math.sin(a), u = x * c + y * s, v = -x * s + y * c; d = Math.min(d, Math.hypot(Math.max(Math.abs(u - 141) - 95, 0), v, z) - 8.5, sdBox(u, v, z, 105, 0, 0, 18, 8, 20), sdBox(u, v, z, 220, 0, 0, 11, 17, 15)); }
    for (let i = 0; i < 4; i++) { const a = i * Math.PI / 2 + Math.PI / 4, c = Math.cos(a), s = Math.sin(a), u = x * c + y * s, v = -x * s + y * c; d = Math.min(d, sdBox(u, v, z, 105, 0, -150, 23, 1, 55), Math.hypot(Math.max(Math.abs(u - 85) - 75, 0), v, z + 150) - 2); }
    return d; },
  vulcan: (x, y, z) => Math.min(sdBox(x, y, z, 0, 0, 0, 362, 12, 14), sdBox(x, y, z, -215, -62, 0, 82, 64, 50), sdBox(x, y, z, 0, -62, 0, 82, 64, 50), sdBox(x, y, z, 215, -62, 0, 82, 64, 50), sdBox(x, y, z, 392, 40, 0, 32, 66, 26),
    Math.hypot(x + 330, Math.abs(y) - 34, z) - 23, Math.hypot(x + 378, Math.abs(y) - 34, z) - 23), // 球形燃料タンク 4 基 (以前は判定なし)
  aurora: (x, y, z) => { // 主球・リング・太陽電池翼・望遠鏡に加え、直径約 180m のパラボラアンテナと下部ハブ (以前は判定が無くすり抜けられた)
    const px = x, py = y - 96, pz = z - 30, h = py * 0.8776 - pz * 0.4794, rx = px, rz = py * 0.4794 + pz * 0.8776, rho = Math.hypot(rx, rz), dish = Math.max(rho - 92, (Math.abs(h - rho * rho / 300) - 2.5) / 1.2);
    return Math.min(Math.hypot(x, y, z) - 60, Math.hypot(Math.hypot(x, z) - 96, y) - 6, sdBox(x, y, z, 0, 0, 0, 345, 3, 44), Math.hypot(x, y - 26, Math.max(Math.abs(z + 110) - 65, 0)) - 17, dish, Math.max(Math.hypot(x, z - 20) - 5, Math.abs(y - 80) - 30), Math.max(Math.hypot(x, z) - 20, Math.abs(y + 68) - 16)); },
  bastion: (x, y, z) => { const r = Math.hypot(x, z); let d = Math.min(Math.max(r - 158, Math.abs(y) - 64), Math.max(r - 92, Math.abs(y - 84) - 24), Math.max(r - 60, Math.abs(y - 126) - 21), Math.max(r - 8, Math.abs(y - 190) - 46), sdBox(x, y, z, 0, 0, 190, 10, 10, 60), sdBox(x, y, z, 0, 0, 236, 15, 15, 13),
      Math.max(r - 94, Math.abs(y + 86) - 26), Math.max(r - 44, Math.abs(y + 126) - 16)); // 下部の円錐部と最下段 (以前は判定が無く、下半分をすり抜けられた)
    for (let i = 0; i < 6; i++) { const a = i * Math.PI / 3 + Math.PI / 6; d = Math.min(d, Math.max(Math.hypot(x - Math.cos(a) * 150, z - Math.sin(a) * 150) - 27, Math.abs(y) - 106)); } // 6 本の柱と上下の砲塔
    return d; },
  rogue: (x, y, z) => { let d = Math.min((Math.hypot(x / 212, y / 145, z / 170) - 1) * 145, Math.hypot(x, y - 30, Math.max(Math.abs(z - 235) - 66, 0)) - 12, sdBox(x, y, z, 25, 148, 20, 85, 22, 75), sdBox(x, y, z, 0, 30, 292, 17, 17, 15));
    for (const q of ROGUE_ROCKS) d = Math.min(d, Math.hypot(x - q[0], y - q[1], z - q[2]) - q[3]); return d; }, // 周囲の小岩 7 個と岩の上の居住区 (以前は判定なし)
};
Object.assign(SDF, SDF2);
export function stationSDF(id, x, y, z) { return SDF[id](x, y, z); }
