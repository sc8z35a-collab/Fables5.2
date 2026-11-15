// ステーション外観の共通部品: 窓明かり付き外壁・ドッキングポート・航行灯・看板
import * as THREE from 'three';
import { glow, texSet, windowsTex, signMesh } from '../gfx/textures.js';
import { makeGlowSprite } from '../gfx/fx.js';

export const V = (x, y, z) => new THREE.Vector3(x, y, z);
const WM = new Map();
/** uvs = 1m あたりの繰り返し数。大型構造物では小さくして、外板と窓を実寸に近づける (0.03 で窓の段が約 3.5m 間隔) */
export function winMat(color = 0xd4dae2, glowCol = 0xffffff, k = 2.4, uvs = 0.09) {
  const key = color + '_' + glowCol + '_' + k + '_' + uvs; let m = WM.get(key); if (m) return m;
  const s = texSet('hull'), e = windowsTex().clone(); e.repeat.set(0.3, 0.3); e.needsUpdate = true;
  m = new THREE.MeshStandardMaterial({ color, map: s.map, normalMap: s.normalMap, roughnessMap: s.roughnessMap, roughness: 0.65, metalness: 0.3, emissiveMap: e, emissive: glowCol, emissiveIntensity: k });
  m.userData.uvs = uvs; WM.set(key, m);
  return m;
}
/** ドッキングポート (襟 + 誘導灯)。dir は外向き単位ベクトル */
export function port(b, D, p, dir, col = '#6ff') {
  const q = new THREE.Quaternion().setFromUnitVectors(V(0, 1, 0), dir), M = (g, off) => b.add(g[0], g[1], new THREE.Matrix4().compose(p.clone().addScaledVector(dir, off), q, V(1, 1, 1)), g[2]);
  M([D, new THREE.CylinderGeometry(7, 9, 6, 24, 1, true)], -3); M([D, new THREE.CylinderGeometry(9.6, 9.6, 1.2, 24)], -5.5);
  M([glow(col, 4), new THREE.TorusGeometry(7.4, 0.25, 6, 40).rotateX(Math.PI / 2), 0], 0.1);
  M([glow(col, 2), new THREE.TorusGeometry(5.2, 0.12, 6, 32).rotateX(Math.PI / 2), 0], -1.5);
  M([D, new THREE.CylinderGeometry(5, 5, 0.4, 24)], -4);
  return { p: p.clone(), dir: dir.clone() };
}
export function done(b, o) {
  const obj = new THREE.Group(); obj.add(b.build());
  o.obj = obj; o.anim = o.anim || [];
  for (const l of o.lights || []) { const s = makeGlowSprite(l.c, l.s, l.k ?? 2); s.position.copy(l.p); (l.parent || obj).add(s); if (l.blink) o.anim.push((t) => { s.material.opacity = (t * l.blink + l.ph) % 1 < 0.12 ? 1 : 0.04; }); }
  for (const s of o.signs || []) obj.add(s);
  return o;
}
export const sign = (text, color, h, x, y, z, ry = 0, rx = 0, o = {}) => { const m = signMesh(text, color, h, { double: true, intensity: 2.6, ...o }); m.position.set(x, y, z); m.rotation.set(rx, ry, 0, 'YXZ'); return m; };

export const sdBox = (x, y, z, cx, cy, cz, hx, hy, hz) => { const dx = Math.abs(x - cx) - hx, dy = Math.abs(y - cy) - hy, dz = Math.abs(z - cz) - hz; return Math.hypot(Math.max(dx, 0), Math.max(dy, 0), Math.max(dz, 0)) + Math.min(Math.max(dx, dy, dz), 0); };
