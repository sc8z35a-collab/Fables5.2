// ヘイヴン・リングの外観 (全幅 約 500 m)。リング半径 222 m、回転するのはリング・スポーク・ハブの軸受けリング。
// ハブ (接舷口・太陽電池・放熱板) は回らない。居住区の 5 区画は内装 (haven/interior.js) と同じ角度の範囲にあり、
// 区画の境 (隔壁) にはリングを締める帯を巻いてある。区画・スポーク・帯は 1 つずつ角度と太さを決めてある。
import * as THREE from 'three';
import { mx } from '../../gfx/builder.js';
import { glow } from '../../gfx/textures.js';
import { havenMaterial } from './materials.js';

const R = 222;
export const havenRadius = 262;
export const havenDockZ = 52;

// 気密殻: [始まりの角度, 終わりの角度, 太さ (半径 m), 外板の素材, 窓の帯の色]
// 0.263〜1.118 が内装の居住デッキ (港区 / 古町 / 職人街 / 藻場区 / 後部)。その先は内装の無い区画。
const districts = [
  [0.263, 0.400, 15, 26, '#ffe6bc'], [0.400, 0.588, 17, 74, '#ffd9a4'], [0.588, 0.745, 16, 56, '#ffe0a0'],
  [0.745, 0.958, 18, 9, '#c8ffb8'], [0.958, 1.118, 15, 3, '#e2eeff'],
  [1.240, 2.310, 11, 17, null], [2.430, 3.380, 13, 25, null], [3.520, 4.120, 12, 83, '#ffd8a8'],
  [4.710, 5.660, 14, 320, '#b8ffcc'], [5.800, 6.120, 10, 293, null],
];
// 隔壁の帯: [角度, 帯の半径, 帯の太さ, 素材]
const collars = [
  [0.263, 16.2, 1.1, 78], [0.400, 18.2, 0.9, 6], [0.588, 17.6, 1.2, 78], [0.745, 19.3, 1.0, 6], [0.958, 18.8, 0.9, 78],
  [1.118, 16.4, 1.3, 6], [1.240, 12.1, 0.8, 314], [2.310, 12.3, 0.9, 314], [2.430, 14.1, 0.8, 314], [3.380, 14.4, 1.0, 314],
  [3.520, 13.2, 0.9, 78], [4.710, 15.1, 1.1, 78], [5.660, 15.3, 0.9, 78], [5.800, 11.0, 0.8, 314], [6.120, 11.2, 0.9, 314],
];
// 建設中の区画 (4.12〜4.58) は外板を張らず、輪の骨組みだけ: [角度, 骨の太さ]
const ribs = [[4.16, 0.7], [4.23, 0.55], [4.31, 0.7], [4.38, 0.6], [4.46, 0.7], [4.53, 0.55]];
// スポーク (回る): [角度, 種類, 素材]。A = 昇降機の角柱 (到着ロビーへ降りる)、B = トラス、C = 窓のある与圧筒
const spokes = [[0.30, 'lift', 50], [2.55, 'truss', 314], [4.40, 'tube', 357]];
// 外に吊った設備 (回る): [角度, 半径, 幅, 高さ, 奥行き, z, 素材]
const pods = [
  [1.55, 238, 22, 6, 30, 0, 35], [1.92, 237, 18, 5, 26, 0, 35], [2.15, 236, 12, 5, 22, 0, 41],
  [2.70, 238, 16, 9, 12, 9, 25], [2.86, 239, 10, 8, 12, -8, 60], [3.10, 238, 14, 9, 12, 7, 25],
  [5.92, 233, 8, 6, 9, 6, 87],
];

function rim(b, material, radius, tube, z, start, end, detail = 10) {
  const geometry = new THREE.TorusGeometry(radius, tube, detail, Math.max(3, Math.ceil((end - start) * 52)), end - start);
  b.add(material, geometry, mx(0, 0, z, 0, 0, start));
}
// リングの管の周りに巻く帯。軸を接線の向きに合わせるので、形の方を先に 90° 起こしておく
function collar(b, material, angle, radius, tube) {
  b.add(material, new THREE.TorusGeometry(radius, tube, 6, 28).rotateX(Math.PI / 2), mx(Math.cos(angle) * R, Math.sin(angle) * R, 0, 0, 0, angle));
}

export function buildHavenHull(hub, b) {
  const surface = (id) => havenMaterial(id, 'hull');
  const glows = new Map(), lit = (c) => glows.get(c) || glows.set(c, glow(c, 2.4)).get(c);
  // リング
  rim(b, surface(314), R, 4.2, 0, 0, 2 * Math.PI, 8); // 全周を通す保守用の背骨
  for (const [start, end, tube, tile, windows] of districts) {
    rim(b, surface(tile), R, tube, 0, start, end, 14);
    if (windows) for (const side of [-1, 1]) rim(b, lit(windows), R + tube * 0.45, 0.42, side * tube * 0.88, start + 0.006, end - 0.006, 4);
  }
  for (const [angle, radius, tube, tile] of collars) collar(b, surface(tile), angle, radius, tube);
  for (const [angle, tube] of ribs) collar(b, surface(17), angle, 12, tube);
  b.add(surface(17), new THREE.BoxGeometry(2, 2, 24), mx(Math.cos(4.345) * (R + 10), Math.sin(4.345) * (R + 10), 0, 0, 0, 4.345)); // 骨組みの上を走る足場
  rim(b, surface(25), R + 11, 0.8, 9, 4.12, 4.58, 4); rim(b, surface(25), R + 11, 0.8, -9, 4.12, 4.58, 4);
  for (const [angle, radius, w, h, d, z, tile] of pods) b.add(surface(tile), new THREE.BoxGeometry(h, w, d), mx(Math.cos(angle) * radius, Math.sin(angle) * radius, z, 0, 0, angle));

  // ハブの軸受けリング (回る) とスポーク
  b.tor(surface(357), 34, 3.2, 0, 0, 0, 0, 0, 0, 40, 10);
  for (const [angle, kind, tile] of spokes) {
    const c = Math.cos(angle), s = Math.sin(angle), inner = 36, outer = R - 10, mid = (inner + outer) / 2, len = outer - inner;
    if (kind === 'lift') {
      b.add(surface(tile), new THREE.BoxGeometry(len, 9, 9), mx(c * mid, s * mid, 0, 0, 0, angle));
      b.add(surface(48), new THREE.BoxGeometry(len - 20, 2.4, 3), mx(c * mid - s * 5.6, s * mid + c * 5.6, 2.5, 0, 0, angle)); // 昇降機の配管
      b.add(lit('#ffe6bc'), new THREE.BoxGeometry(len - 30, 0.5, 0.6), mx(c * mid + s * 4.6, s * mid - c * 4.6, 0, 0, 0, angle));
    } else if (kind === 'truss') {
      for (const z of [-3.5, 3.5]) b.add(surface(tile), new THREE.CylinderGeometry(1.4, 1.4, len, 10).rotateZ(Math.PI / 2), mx(c * mid, s * mid, z, 0, 0, angle));
      for (const t of [0.18, 0.43, 0.71, 0.9]) { const r = inner + len * t; b.add(surface(tile), new THREE.BoxGeometry(1.2, 1.2, 8), mx(c * r, s * r, 0, 0, 0, angle)); }
    } else {
      b.add(surface(tile), new THREE.CylinderGeometry(4.6, 4.6, len, 18).rotateZ(Math.PI / 2), mx(c * mid, s * mid, 0, 0, 0, angle));
      b.add(lit('#d8ecff'), new THREE.BoxGeometry(len - 16, 0.5, 0.5), mx(c * mid, s * mid, 4.5, 0, 0, angle));
    }
  }

  // 回らないハブ: 胴・前の接舷筒・後ろの機械区画・マスト・太陽電池・放熱板・アンテナ
  hub.cyl(surface(357), 30, 30, 44, 0, 0, 0, 'z', 40);
  hub.cyl(surface(344), 12, 19, 18, 0, 0, 31, 'z', 32);
  hub.cyl(surface(6), 8, 8, 10, 0, 0, 45, 'z', 24);
  hub.cyl(surface(87), 22, 26, 20, 0, 0, -32, 'z', 32);
  hub.cyl(surface(17), 3, 3, 78, 0, 0, -81, 'z', 12);
  hub.tor(glow('#9ff6ff', 2.6), 30.4, 0.5, 0, 0, 14, 0, 0, 0, 56, 6);
  hub.tor(glow('#ffd9a4', 2.2), 19.4, 0.4, 0, 0, 23, 0, 0, 0, 40, 6);
  for (const [z, tile] of [[-96, 4], [-114, 60]]) for (const side of [-1, 1]) {
    hub.box(surface(tile), 214, 1.2, 30, side * 124, 0, z);
    hub.box(surface(17), 18, 2, 2, side * 12, 0, z);
  }
  hub.box(surface(35), 2, 132, 22, 0, 0, -62);
  hub.box(surface(41), 96, 2, 18, 0, 0, -68);
  hub.add(surface(26), new THREE.CylinderGeometry(9, 1.2, 3, 24, 1, true), mx(0, 33, 27));
  hub.cyl(surface(17), 0.6, 0.6, 8, 0, 30, 27, 'y', 6);
}

function boxDistance(x, y, z, hx, hy, hz) {
  const dx = Math.abs(x) - hx, dy = Math.abs(y) - hy, dz = Math.abs(z) - hz;
  return Math.hypot(Math.max(dx, 0), Math.max(dy, 0), Math.max(dz, 0)) + Math.min(Math.max(dx, dy, dz), 0);
}

// 当たり判定用の距離。spin = リングの回転角
export function havenHullDistance(x, y, z, spin = 0) {
  const radial = Math.hypot(x, y), c = Math.cos(spin), s = Math.sin(spin);
  const rx = x * c + y * s, ry = y * c - x * s, angle = Math.atan2(ry, rx);
  const arcDistance = (radius, tube, zz, start, end) => {
    const relative = angle - (start + end) / 2, delta = Math.abs(Math.atan2(Math.sin(relative), Math.cos(relative)));
    const miss = Math.max(delta - (end - start) / 2, 0);
    return Math.sqrt((radial - radius) ** 2 + 4 * radial * radius * Math.sin(miss / 2) ** 2 + (z - zz) ** 2) - tube;
  };
  let d = Math.min(
    Math.max(radial - 30, Math.abs(z) - 22), Math.max(radial - 19, Math.abs(z - 31) - 9), Math.max(radial - 8, Math.abs(z - 45) - 5),
    Math.max(radial - 26, Math.abs(z + 32) - 10), Math.max(radial - 3, Math.abs(z + 81) - 39),
    boxDistance(Math.abs(x) - 124, y, z + 96, 107, 0.6, 15), boxDistance(Math.abs(x) - 124, y, z + 114, 107, 0.6, 15),
    boxDistance(x, y, z + 62, 1, 66, 11), boxDistance(x, y, z + 68, 48, 1, 9),
    Math.hypot(radial - 34, z) - 3.2, Math.hypot(radial - R, z) - 4.2,
  );
  for (const [start, end, tube] of districts) d = Math.min(d, arcDistance(R, tube, 0, start, end));
  for (const [a, radius, w, h, dd, zz] of pods) {
    const ca = Math.cos(a), sa = Math.sin(a);
    d = Math.min(d, boxDistance(rx * ca + ry * sa - radius, ry * ca - rx * sa, z - zz, h / 2, w / 2, dd / 2));
  }
  for (const [a, kind] of spokes) {
    const ca = Math.cos(a), sa = Math.sin(a), along = rx * ca + ry * sa, across = ry * ca - rx * sa, mid = (36 + R - 10) / 2, half = (R - 46) / 2;
    const thick = kind === 'lift' ? 4.5 : kind === 'tube' ? 4.6 : 4.8;
    d = Math.min(d, boxDistance(along - mid, across, z, half, thick, kind === 'truss' ? 4.9 : thick));
  }
  return d;
}
