// 精密な船体破壊: 被弾・衝突した箇所だけを凹ませ、装甲を剥ぎ、焦がす。破片も飛ばす
import * as THREE from 'three';

const DM = new Map();
/** 損傷表現用のマテリアル (頂点カラーで焦げ、裏面=船体内部は暗く) */
function damageMat(m) {
  if (!m.isMeshStandardMaterial) return m;
  let c = DM.get(m.uuid);
  if (!c) {
    c = m.clone(); c.vertexColors = true; c.side = THREE.DoubleSide; c.userData = { ...m.userData };
    c.onBeforeCompile = (sh) => { sh.fragmentShader = sh.fragmentShader.replace('#include <color_fragment>', '#include <color_fragment>\nif(!gl_FrontFacing)diffuseColor.rgb*=vec3(.07,.055,.05);'); };
    c.customProgramCacheKey = () => 'dmg'; DM.set(m.uuid, c);
  }
  return c;
}
/** 船モデルを破壊可能にする */
export function enableDamage(model) {
  if (model.dmg) return model; model.dmg = []; model.wounds = []; model.applied = 0;
  model.body.traverse((o) => {
    if (!o.isMesh || o.geometry.index) return; const g = o.geometry, n = g.attributes.position.count;
    if (o.material.isMeshStandardMaterial) { if (!g.attributes.color) g.setAttribute('color', new THREE.BufferAttribute(new Float32Array(n * 3).fill(1), 3)); o.material = damageMat(o.material); }
    g.attributes.position.setUsage(THREE.DynamicDrawUsage); g.computeBoundingSphere();
    model.dmg.push({ g, p: g.attributes.position.array, n: g.attributes.normal.array, c: g.attributes.color ? g.attributes.color.array : null, bs: g.boundingSphere, std: o.material.isMeshStandardMaterial });
  });
  return model;
}
/** 船体ローカル座標のレイが実際の外板に当たる位置を探す (当たらなければ null) */
export function rayHit(model, o, d, maxT, thr = 0.85) {
  let best = null, bt = maxT; const t2 = thr * thr;
  for (const m of model.dmg) {
    if (!m.std) continue; const p = m.p;
    for (let i = 0; i < p.length; i += 3) {
      const vx = p[i] - o.x, vy = p[i + 1] - o.y, vz = p[i + 2] - o.z, t = vx * d.x + vy * d.y + vz * d.z; if (t < 0 || t >= bt) continue;
      if (vx * vx + vy * vy + vz * vz - t * t < t2) { bt = t; best = best || new THREE.Vector3(); best.set(p[i], p[i + 1], p[i + 2]); }
    }
  }
  return best;
}
const hsh = (x, y, z, s) => { const n = Math.sin(Math.round(x * 500) * 0.012989 + Math.round(y * 500) * 0.078233 + Math.round(z * 500) * 0.037719 + s) * 43758.5453; return n - Math.floor(n); };
/**
 * 局所破壊。P: 着弾点, D: 進入方向 (単位ベクトル), R: 影響半径, depth: 凹みの深さ (いずれも船体ローカル)
 * 中心付近の外板は剥がれ落ち (欠け)、周囲は押し潰されて焦げる。戻り値 = 剥がれた面の数
 */
export function applyDamage(model, P, D, R, depth) {
  const R2 = R * R, r0 = R * 0.45, r02 = r0 * r0; let chips = 0;
  for (const m of model.dmg) {
    const bs = m.bs, dx0 = bs.center.x - P.x, dy0 = bs.center.y - P.y, dz0 = bs.center.z - P.z, br = bs.radius + R; if (dx0 * dx0 + dy0 * dy0 + dz0 * dz0 > br * br) continue;
    const p = m.p, n = m.n, c = m.c; let touched = false;
    for (let i = 0; i < p.length; i += 9) {
      let any = false, cx = 0, cy = 0, cz = 0; const d2 = [0, 0, 0];
      for (let k = 0; k < 3; k++) { const j = i + k * 3, dx = p[j] - P.x, dy = p[j + 1] - P.y, dz = p[j + 2] - P.z; d2[k] = dx * dx + dy * dy + dz * dz; if (d2[k] < R2) any = true; cx += p[j]; cy += p[j + 1]; cz += p[j + 2]; }
      if (!any) continue; touched = true; cx /= 3; cy /= 3; cz /= 3;
      const cd2 = (cx - P.x) ** 2 + (cy - P.y) ** 2 + (cz - P.z) ** 2;
      if (m.std && cd2 < r02 && (p[i] !== p[i + 3] || p[i + 1] !== p[i + 4] || p[i + 2] !== p[i + 5])) { // 外板が剥がれる
        const ix = cx + D.x * depth * 0.6, iy = cy + D.y * depth * 0.6, iz = cz + D.z * depth * 0.6;
        for (let k = 0; k < 3; k++) { const j = i + k * 3; p[j] = ix; p[j + 1] = iy; p[j + 2] = iz; if (c) { c[j] = c[j + 1] = c[j + 2] = 0.03; } }
        chips++; continue;
      }
      for (let k = 0; k < 3; k++) {
        if (d2[k] >= R2) continue; const j = i + k * 3; let f = 1 - Math.sqrt(d2[k]) / R; f = f * f * (3 - 2 * f);
        const jx = hsh(p[j], p[j + 1], p[j + 2], 1) - 0.5, jy = hsh(p[j], p[j + 1], p[j + 2], 2) - 0.5, jz = hsh(p[j], p[j + 1], p[j + 2], 3) - 0.5, w = depth * f;
        p[j] += D.x * w + jx * w * 0.32; p[j + 1] += D.y * w + jy * w * 0.32; p[j + 2] += D.z * w + jz * w * 0.32;
        if (c) { const fs = Math.max(0, (f - 0.35) / 0.65), k2 = 1 - 0.8 * fs * fs; c[j] *= k2; c[j + 1] *= k2 * 0.97; c[j + 2] *= k2 * 0.94; }
      }
      // 潰れた面は面法線に (ひしゃげた金属の陰影)
      const ax = p[i + 3] - p[i], ay = p[i + 4] - p[i + 1], az = p[i + 5] - p[i + 2], bx = p[i + 6] - p[i], by = p[i + 7] - p[i + 1], bz = p[i + 8] - p[i + 2];
      let nx = ay * bz - az * by, ny = az * bx - ax * bz, nz = ax * by - ay * bx; const l = Math.hypot(nx, ny, nz);
      if (l > 1e-9) { nx /= l; ny /= l; nz /= l; for (let k = 0; k < 3; k++) { const j = i + k * 3; n[j] = n[j] * 0.35 + nx * 0.65; n[j + 1] = n[j + 1] * 0.35 + ny * 0.65; n[j + 2] = n[j + 2] * 0.35 + nz * 0.65; } }
    }
    if (touched) { m.g.attributes.position.needsUpdate = true; m.g.attributes.normal.needsUpdate = true; if (c) m.g.attributes.color.needsUpdate = true; }
  }
  model.wounds.push({ p: P.clone(), t: 0, k: Math.min(1, R / 4) }); if (model.wounds.length > 8) model.wounds.shift();
  return chips;
}
// 機体ごとの損傷履歴 (別モードの同型モデルにも同じ傷を再現する)
const LOG = {};
export function logDamage(id, P, D, R, depth) { (LOG[id] || (LOG[id] = [])).push([P.x, P.y, P.z, D.x, D.y, D.z, R, depth]); }
export function clearDamage(id) { delete LOG[id]; }
export const damageCount = (id) => (LOG[id] ? LOG[id].length : 0);
const _p = new THREE.Vector3(), _d = new THREE.Vector3();
/** 履歴に追いつくまで model に損傷を適用 */
export function syncDamage(model, id) {
  enableDamage(model); const L = LOG[id] || [];
  for (; model.applied < L.length; model.applied++) { const e = L[model.applied]; applyDamage(model, _p.set(e[0], e[1], e[2]), _d.set(e[3], e[4], e[5]), e[6], e[7]); }
  model.wounds.length = 0;
}

// ───────────────────────── 破片 ─────────────────────────
const _m = new THREE.Matrix4(), _q = new THREE.Quaternion(), _e = new THREE.Euler(), _s = new THREE.Vector3(), _c = new THREE.Color();
export class Debris {
  constructor(max = 220) {
    this.max = max; this.items = []; const g = new THREE.TetrahedronGeometry(1, 0); g.scale(1, 0.35, 0.7);
    this.obj = new THREE.InstancedMesh(g, new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.5, metalness: 0.6 }), max);
    this.obj.instanceMatrix.setUsage(THREE.DynamicDrawUsage); this.obj.frustumCulled = false; this.obj.count = 0; this.obj.setColorAt(0, _c.set(1, 1, 1)); this.obj.castShadow = false;
  }
  /** pos から n 個の破片を飛ばす。base: 元の速度, dir: 主な飛散方向 */
  burst(pos, n, speed, size, color, base, dir) {
    for (let i = 0; i < n; i++) {
      if (this.items.length >= this.max) this.items.shift();
      const v = new THREE.Vector3(Math.random() - 0.5, Math.random() - 0.5, Math.random() - 0.5).normalize().multiplyScalar(speed * (0.3 + Math.random() * 0.7)); if (dir) v.addScaledVector(dir, speed * 0.6); if (base) v.add(base);
      this.items.push({ p: pos.clone().add(new THREE.Vector3(Math.random() - 0.5, Math.random() - 0.5, Math.random() - 0.5).multiplyScalar(size * 2)), v, r: new THREE.Vector3(Math.random() * 6, Math.random() * 6, Math.random() * 6), w: new THREE.Vector3((Math.random() - 0.5) * 8, (Math.random() - 0.5) * 8, (Math.random() - 0.5) * 8), s: size * (0.4 + Math.random() * 1.1), life: 5 + Math.random() * 5, c: new THREE.Color(color).multiplyScalar(0.35 + Math.random() * 0.5) });
    }
  }
  update(dt, grav = 0, groundY = null) {
    const L = this.items; for (let i = L.length - 1; i >= 0; i--) { const d = L[i]; d.life -= dt; if (d.life <= 0) { L.splice(i, 1); continue; } d.v.y -= grav * dt; d.p.addScaledVector(d.v, dt); d.r.addScaledVector(d.w, dt); if (groundY != null && d.p.y < groundY(d.p.x, d.p.z) + 0.1) { d.p.y = groundY(d.p.x, d.p.z) + 0.1; d.v.multiplyScalar(0.4); d.v.y = Math.abs(d.v.y) * 0.3; d.w.multiplyScalar(0.5); } }
    const n = (this.obj.count = L.length);
    for (let i = 0; i < n; i++) { const d = L[i], k = Math.min(1, d.life); _q.setFromEuler(_e.set(d.r.x, d.r.y, d.r.z)); _m.compose(d.p, _q, _s.setScalar(d.s * k)); this.obj.setMatrixAt(i, _m); this.obj.setColorAt(i, d.c); }
    this.obj.instanceMatrix.needsUpdate = true; if (this.obj.instanceColor) this.obj.instanceColor.needsUpdate = true;
  }
  shift(v) { for (const d of this.items) d.p.sub(v); }
  clear() { this.items.length = 0; this.obj.count = 0; }
}
