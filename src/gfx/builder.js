// ジオメトリ合成ヘルパー: マテリアル単位でマージして描画コールを最小化する
import * as THREE from 'three';
import { mergeGeometries, mergeVertices } from 'three/addons/utils/BufferGeometryUtils.js';

const _q = new THREE.Quaternion(), _e = new THREE.Euler(), _p = new THREE.Vector3(), _s = new THREE.Vector3(1, 1, 1);
export function mx(x = 0, y = 0, z = 0, rx = 0, ry = 0, rz = 0, sx = 1, sy = sx, sz = sx) {
  _e.set(rx, ry, rz, 'YXZ'); _q.setFromEuler(_e); _p.set(x, y, z); _s.set(sx, sy, sz);
  return new THREE.Matrix4().compose(_p, _q, _s);
}

/** 面法線の主軸で箱投影 UV を付ける (非インデックス前提) */
export function boxUV(geo, s = 1) {
  const p = geo.attributes.position, n = p.count, a = p.array, uv = new Float32Array(n * 2);
  for (let i = 0; i < n; i += 3) {
    const o = i * 3, ax = a[o], ay = a[o + 1], az = a[o + 2], bx = a[o + 3] - ax, by = a[o + 4] - ay, bz = a[o + 5] - az, cx = a[o + 6] - ax, cy = a[o + 7] - ay, cz = a[o + 8] - az;
    const nx = Math.abs(by * cz - bz * cy), ny = Math.abs(bz * cx - bx * cz), nz = Math.abs(bx * cy - by * cx);
    for (let k = 0; k < 3; k++) {
      const x = a[o + k * 3], y = a[o + k * 3 + 1], z = a[o + k * 3 + 2];
      let u, v;
      if (nx >= ny && nx >= nz) { u = z; v = y; } else if (ny >= nz) { u = x; v = z; } else { u = x; v = y; }
      uv[(i + k) * 2] = u * s; uv[(i + k) * 2 + 1] = v * s;
    }
  }
  geo.setAttribute('uv', new THREE.BufferAttribute(uv, 2));
  return geo;
}

function norm(geo) {
  let gq = geo.index ? geo.toNonIndexed() : geo;
  for (const k of Object.keys(gq.attributes)) if (k !== 'position' && k !== 'normal' && k !== 'uv') gq.deleteAttribute(k);
  if (!gq.attributes.normal) gq.computeVertexNormals();
  if (!gq.attributes.uv) gq.setAttribute('uv', new THREE.BufferAttribute(new Float32Array(gq.attributes.position.count * 2), 2));
  gq.morphAttributes = {};
  return gq;
}

export class Builder {
  constructor() { this.m = new Map(); }
  /** uvs: undefined→マテリアル既定, 0→元のUVを保持 */
  add(mat, geo, matrix, uvs) {
    const gq = norm(geo);
    if (matrix) {
      gq.applyMatrix4(matrix);
      if (matrix.determinant() < 0) { // 鏡像: 面の向きを反転
        for (const k of Object.keys(gq.attributes)) {
          const at = gq.attributes[k], a = at.array, n = at.itemSize;
          for (let i = 0; i < at.count; i += 3) for (let c = 0; c < n; c++) { const t = a[(i + 1) * n + c]; a[(i + 1) * n + c] = a[(i + 2) * n + c]; a[(i + 2) * n + c] = t; }
        }
      }
    }
    const s = uvs ?? mat.userData.uvs ?? 0.25;
    if (s) boxUV(gq, s);
    let arr = this.m.get(mat);
    if (!arr) this.m.set(mat, (arr = []));
    arr.push(gq);
    return this;
  }
  box(mat, w, h, d, x = 0, y = 0, z = 0, ry = 0, rx = 0, rz = 0) { return this.add(mat, new THREE.BoxGeometry(w, h, d), mx(x, y, z, rx, ry, rz)); }
  /** Y 軸に沿った円柱。axis: 'x'|'y'|'z' */
  cyl(mat, rt, rb, h, x = 0, y = 0, z = 0, axis = 'y', seg = 20, open = false) {
    const m = mx(x, y, z, axis === 'z' ? Math.PI / 2 : 0, 0, axis === 'x' ? Math.PI / 2 : 0);
    return this.add(mat, new THREE.CylinderGeometry(rt, rb, h, seg, 1, open), m);
  }
  sph(mat, r, x = 0, y = 0, z = 0, sx = 1, sy = 1, sz = 1, seg = 24) { return this.add(mat, new THREE.SphereGeometry(r, seg, Math.max(8, seg * 0.6 | 0)), mx(x, y, z, 0, 0, 0, sx, sy, sz)); }
  tor(mat, R, r, x = 0, y = 0, z = 0, rx = 0, ry = 0, rz = 0, ts = 48, rs = 10, arc = Math.PI * 2) { return this.add(mat, new THREE.TorusGeometry(R, r, rs, ts, arc), mx(x, y, z, rx, ry, rz)); }
  build(o = {}) {
    const grp = new THREE.Group();
    for (const [mat, gs] of this.m) {
      const geo = gs.length > 1 ? mergeGeometries(gs, false) : gs[0];
      for (const q of gs) if (q !== geo) q.dispose();
      const mesh = new THREE.Mesh(geo, mat);
      mesh.castShadow = o.shadow ?? true; mesh.receiveShadow = o.shadow ?? true;
      grp.add(mesh);
    }
    this.m.clear();
    return grp;
  }
}

/** 基準行列を掛けてから親 Builder に追加する (小道具の配置用) */
export class Placer extends Builder {
  constructor(b, base) { super(); this.b = b; this.base = base; }
  add(mat, geo, matrix, uvs) { this.b.add(mat, geo, matrix ? new THREE.Matrix4().multiplyMatrices(this.base, matrix) : this.base.clone(), uvs); return this; }
}

/**
 * 断面ロフト。secs: [{z, w, t, b, y, e}]  w=半幅 t=上半高 b=下半高 e=スーパー楕円指数
 * 前方 = -Z。滑らかな機体外皮を作る。
 */
export function loft(secs0, seg = 36, flat = false, maxStep = 0.9) {
  // 断面間を Catmull-Rom で滑らかに補間して細分化 (滑らかな外皮 + 局所破壊の粒度向上)
  const secs = [], K = ['w', 't', 'b', 'y', 'x', 'e'], val = (s, k) => (k === 't' ? s.t ?? s.w : k === 'b' ? s.b ?? s.t ?? s.w : k === 'e' ? s.e ?? 2.4 : s[k] ?? 0);
  for (let i = 0; i < secs0.length - 1; i++) {
    const p0 = secs0[Math.max(0, i - 1)], p1 = secs0[i], p2 = secs0[i + 1], p3 = secs0[Math.min(secs0.length - 1, i + 2)], m = Math.max(1, Math.ceil(Math.abs(p2.z - p1.z) / maxStep));
    for (let j = 0; j < m; j++) { const t = j / m, o = { z: p1.z + (p2.z - p1.z) * t };
      for (const k of K) { const a = val(p0, k), b2 = val(p1, k), c = val(p2, k), d = val(p3, k); let v = 0.5 * (2 * b2 + (c - a) * t + (2 * a - 5 * b2 + 4 * c - d) * t * t + (3 * b2 - a - 3 * c + d) * t * t * t); const lo = Math.min(b2, c), hi = Math.max(b2, c), pad = (hi - lo) * 0.12; v = Math.min(hi + pad, Math.max(lo - pad, v)); o[k] = k === 'w' || k === 't' ? Math.max(v, 0.005) : k === 'b' ? Math.max(v, 0) : v; }
      secs.push(o); }
  }
  { const l = secs0[secs0.length - 1], o = { z: l.z }; for (const k of K) o[k] = val(l, k); secs.push(o); }
  const pos = [], idx = [], n = secs.length;
  for (const s of secs) {
    const ex = 2 / (s.e ?? 2.4), t = s.t ?? s.w, b = s.b ?? t, y0 = s.y ?? 0, x0 = s.x ?? 0;
    for (let j = 0; j < seg; j++) {
      const a = j / seg * Math.PI * 2, c = Math.cos(a), sn = Math.sin(a);
      pos.push(x0 + s.w * Math.sign(c) * Math.pow(Math.abs(c), ex), y0 + (sn >= 0 ? t : b) * Math.sign(sn) * Math.pow(Math.abs(sn), ex), s.z);
    }
  }
  for (let i = 0; i < n - 1; i++) for (let j = 0; j < seg; j++) {
    const a = i * seg + j, b = i * seg + (j + 1) % seg, c = a + seg, d = b + seg;
    idx.push(a, b, c, b, d, c);
  }
  const cap = (i, flip) => {
    const s = secs[i], ci = pos.length / 3; pos.push(s.x ?? 0, (s.y ?? 0) + ((s.t ?? s.w) - (s.b ?? s.t ?? s.w)) * 0.5, s.z);
    for (let j = 0; j < seg; j++) { const a = i * seg + j, b = i * seg + (j + 1) % seg; flip ? idx.push(ci, b, a) : idx.push(ci, a, b); }
  };
  cap(0, true); cap(n - 1, false);
  let geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  geo.setIndex(idx);
  if (flat) { geo = geo.toNonIndexed(); }
  geo.computeVertexNormals();
  return geo;
}

/** XZ 平面の輪郭 [[x,z],...] を厚み t で押し出した板 (翼・装甲板)。ベベル付き */
export function slab(pts, t = 0.2, bevel = 0.05) {
  const sh = new THREE.Shape();
  pts.forEach(([x, z], i) => (i ? sh.lineTo(x, -z) : sh.moveTo(x, -z)));
  sh.closePath();
  const geo = new THREE.ExtrudeGeometry(sh, { depth: t, bevelEnabled: bevel > 0, bevelThickness: bevel, bevelSize: bevel, bevelSegments: 2, steps: 1 });
  geo.translate(0, 0, -t / 2);
  geo.rotateX(-Math.PI / 2); // XY→XZ, 押し出し方向 = Y
  return geo;
}
export const mirrorX = (pts) => pts.map(([x, z]) => [-x, z]).reverse();

/** 凹凸を付けた岩塊ジオメトリ */
export function rockGeo(r = 1, detail = 2, seed = 1, rough = 0.35) {
  let geo = new THREE.IcosahedronGeometry(r, detail); geo.deleteAttribute('normal'); geo.deleteAttribute('uv'); geo = mergeVertices(geo);
  const p = geo.attributes.position, v = new THREE.Vector3();
  const hsh = (x, y, z) => { const n = Math.sin(x * 12.9898 + y * 78.233 + z * 37.719 + seed * 3.17) * 43758.5453; return n - Math.floor(n); };
  const ns = (x, y, z) => { const xi = Math.floor(x), yi = Math.floor(y), zi = Math.floor(z), xf = x - xi, yf = y - yi, zf = z - zi; const l = (a, b, t) => a + (b - a) * t; return l(l(l(hsh(xi, yi, zi), hsh(xi + 1, yi, zi), xf), l(hsh(xi, yi + 1, zi), hsh(xi + 1, yi + 1, zi), xf), yf), l(l(hsh(xi, yi, zi + 1), hsh(xi + 1, yi, zi + 1), xf), l(hsh(xi, yi + 1, zi + 1), hsh(xi + 1, yi + 1, zi + 1), xf), yf), zf); };
  for (let i = 0; i < p.count; i++) {
    v.fromBufferAttribute(p, i).normalize();
    const d = 1 + rough * ((ns(v.x * 1.7 + 5, v.y * 1.7, v.z * 1.7) - 0.5) * 1.6 + (ns(v.x * 4.1, v.y * 4.1 + 9, v.z * 4.1) - 0.5) * 0.6 + (ns(v.x * 9, v.y * 9, v.z * 9 + 3) - 0.5) * 0.25);
    v.multiplyScalar(r * d); p.setXYZ(i, v.x, v.y, v.z);
  }
  geo.computeVertexNormals();
  return geo;
}
