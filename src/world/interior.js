// 内装ジェネレータ: 設計図 (blueprint) から歩行可能な室内を構築する
import * as THREE from 'three';
import { Builder, Placer, mx } from '../gfx/builder.js';
import { mat, glow } from '../gfx/textures.js';
import { rng } from '../core/util.js';
import { fxTime } from '../gfx/fx.js';
import { PROPS } from './props.js';

export const T = 0.2;      // 壁厚
export const PR = 0.35;    // プレイヤー半径
const HP = Math.PI / 2;
let GLASS;
export const glassMat = () => GLASS || (GLASS = Object.assign(new THREE.MeshStandardMaterial({ color: 0x9fd0ff, transparent: true, opacity: 0.1, roughness: 0.02, metalness: 0, depthWrite: false, envMapIntensity: 1.6 }), { userData: { uvs: 0 } }));

export function holoMat(color, k = 1) {
  return new THREE.ShaderMaterial({
    uniforms: { uCol: { value: new THREE.Color(color).multiplyScalar(k) }, uTime: fxTime }, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide,
    vertexShader: 'varying vec3 vN,vV;varying float vY;void main(){vec4 w=modelMatrix*vec4(position,1.);vY=w.y;vec4 mv=viewMatrix*w;vN=normalize(normalMatrix*normal);vV=normalize(-mv.xyz);gl_Position=projectionMatrix*mv;}',
    fragmentShader: 'uniform vec3 uCol;uniform float uTime;varying vec3 vN,vV;varying float vY;void main(){float fr=pow(1.-abs(dot(vN,vV)),1.4);float sl=.55+.45*sin(vY*90.-uTime*5.);float fl=.92+.08*sin(uTime*41.);gl_FragColor=vec4(uCol*(fr*1.8+.2)*sl*fl,1.);}',
  });
}

function door(out, B, th, axis, line, pos, dw, dh) {
  const DK = mat('hull', { color: th.frame ?? 0x2c3038, rough: 0.8, metal: 0.6 }), tr = glow(th.trim, 3), D = 2 * T + 0.14;
  const post = (p) => (axis === 'z' ? B.box(DK, D, dh + 0.25, 0.18, line, (dh + 0.25) / 2, p) : B.box(DK, 0.18, dh + 0.25, D, p, (dh + 0.25) / 2, line));
  post(pos - dw / 2 - 0.08); post(pos + dw / 2 + 0.08);
  if (axis === 'z') { B.box(DK, D, 0.25, dw + 0.34, line, dh + 0.125, pos); B.box(tr, D + 0.02, 0.05, dw * 0.6, line, dh + 0.06, pos); B.box(DK, D, 0.03, dw, line, 0.015, pos); }
  else { B.box(DK, dw + 0.34, 0.25, D, pos, dh + 0.125, line); B.box(tr, dw * 0.6, 0.05, D + 0.02, pos, dh + 0.06, line); B.box(DK, dw, 0.03, D, pos, 0.015, line); }
  const g = new THREE.Group(), pm = mat('wall', { color: th.door ?? 0x6a727c, rough: 0.6, metal: 0.6 }), panels = [];
  for (const s of [-1, 1]) {
    const pb = new Builder(); pb.box(pm, dw / 2, dh, 0.1, 0, dh / 2, 0); pb.box(tr, 0.05, dh * 0.7, 0.12, -s * (dw / 4 - 0.12), dh / 2, 0); pb.box(DK, dw / 2 - 0.2, 0.3, 0.13, 0, dh * 0.55, 0);
    const p = pb.build({ shadow: false }); p.position.x = s * dw / 4; g.add(p); panels.push(p);
  }
  g.position.set(axis === 'z' ? line : pos, 0, axis === 'z' ? pos : line); if (axis === 'z') g.rotation.y = HP;
  out.group.add(g); out.doors.push({ g, panels, x: g.position.x, z: g.position.z, dw, k: 0, was: false });
}

function room(B, r, th, op, out) {
  const x0 = r.x, z0 = r.z, x1 = r.x + r.w, z1 = r.z + r.d, h = r.h, cx = (x0 + x1) / 2, cz = (z0 + z1) / 2;
  const ws = r.wall || th.wall, fs = r.floor || th.floor, cs = r.ceil || th.ceil;
  const WM = mat(ws[0], { color: ws[1], rough: ws[2] ?? 0.85, metal: ws[3] ?? 0.3 }), FM = mat(fs[0], { color: fs[1], rough: fs[2] ?? 0.6, metal: fs[3] ?? 0.35, floor: 1 }), CM = mat(cs[0], { color: cs[1], rough: 0.9, metal: 0.4 });
  const DK = mat('hull', { color: th.frame ?? 0x2c3038, rough: 0.8, metal: 0.6 }), trim = glow(r.trim || th.trim, 2.6), GL = glassMat();
  out.floorMats.add(FM);
  B.add(FM, new THREE.PlaneGeometry(r.w, r.d).rotateX(-HP), mx(cx, 0, cz));
  if (r.sky) { // ガラス天井 (宇宙が見える)
    B.add(GL, new THREE.PlaneGeometry(r.w - 2 * T, r.d - 2 * T).rotateX(HP), mx(cx, h, cz), 0);
    for (let x = x0 + T; x <= x1 - T + 0.01; x += (r.w - 2 * T) / Math.max(1, Math.round(r.w / 3.2))) B.box(DK, 0.14, 0.2, r.d, x, h, cz);
    for (let z = z0 + T; z <= z1 - T + 0.01; z += (r.d - 2 * T) / Math.max(1, Math.round(r.d / 3.2))) B.box(DK, r.w, 0.24, 0.14, cx, h + 0.02, z);
  } else {
    B.add(CM, new THREE.PlaneGeometry(r.w, r.d).rotateX(HP), mx(cx, h, cz));
    if (h > 3.4) for (let z = z0 + 2; z < z1 - 1; z += 4) B.box(DK, r.w - 2 * T, 0.3, 0.22, cx, h - 0.15, z); // 梁
  }
  const wall = (side) => {
    const hz = side === 'n' || side === 's', lo = hz ? x0 : z0 + T, hi = hz ? x1 : z1 - T, dir = side === 'n' || side === 'w' ? 1 : -1;
    const fix = side === 'n' ? z0 + T / 2 : side === 's' ? z1 - T / 2 : side === 'w' ? x0 + T / 2 : x1 - T / 2, inner = fix + dir * T / 2;
    const box = (m, a, b, ya, yb, tk = T, off = 0, uvs) => { if (b - a < 0.02 || yb - ya < 0.02) return; const g = hz ? new THREE.BoxGeometry(b - a, yb - ya, tk) : new THREE.BoxGeometry(tk, yb - ya, b - a); B.add(m, g, hz ? mx((a + b) / 2, (ya + yb) / 2, fix + off) : mx(fix + off, (ya + yb) / 2, (a + b) / 2), uvs); };
    const strips = (a, b) => { if (b - a < 0.6) return; box(trim, a + 0.12, b - 0.12, 0.09, 0.14, 0.03, dir * (T / 2 + 0.012)); box(trim, a + 0.12, b - 0.12, h - 0.2, h - 0.16, 0.03, dir * (T / 2 + 0.012)); box(DK, a, b, 0, 0.07, 0.06, dir * (T / 2 + 0.03)); };
    const os = op[side].slice().sort((p, q) => p.a - q.a); let cur = lo;
    for (const o of os) {
      box(WM, cur, o.a, 0, h); strips(cur, o.a - (o.type === 'door' ? 0.2 : 0));
      box(WM, o.a, o.b, o.y1, h); box(WM, o.a, o.b, 0, o.y0);
      if (o.type === 'win') {
        box(GL, o.a, o.b, o.y0, o.y1, 0.04, 0, 0); box(DK, o.a - 0.06, o.b + 0.06, o.y0 - 0.1, o.y0, T + 0.12); box(DK, o.a - 0.06, o.b + 0.06, o.y1, o.y1 + 0.1, T + 0.12);
        const n = Math.max(1, Math.round((o.b - o.a) / 2.8)); for (let i = 0; i <= n; i++) { const p = o.a + (o.b - o.a) * i / n; box(DK, p - 0.05, p + 0.05, o.y0, o.y1, T + 0.12); }
        box(trim, o.a, o.b, o.y0 - 0.14, o.y0 - 0.11, 0.03, dir * (T / 2 + 0.07));
      }
      cur = o.b + (o.type === 'door' ? 0.2 : 0);
    }
    box(WM, Math.min(cur, hi), hi, 0, h); strips(cur, hi);
    for (let p = lo + 2; p < hi - 1; p += 4) { if (os.some((o) => p > o.a - 0.5 && p < o.b + 0.5)) continue; hz ? B.box(DK, 0.28, h, 0.14, p, h / 2, inner + dir * 0.07) : B.box(DK, 0.14, h, 0.28, inner + dir * 0.07, h / 2, p); }
  };
  ['n', 's', 'w', 'e'].forEach(wall);
  // 照明器具 + 論理ライト
  const lampC = r.lamp || th.lamp, LM = glow(lampC, 3.2), nx = Math.max(1, Math.round(r.w / 7)), nz = Math.max(1, Math.round(r.d / 7)), ly = r.sky ? h - 0.6 : h - 0.05;
  for (let i = 0; i < nx; i++) for (let j = 0; j < nz; j++) {
    const lx = x0 + (i + 0.5) * r.w / nx, lz = z0 + (j + 0.5) * r.d / nz;
    B.box(DK, 2.0, 0.1, 0.6, lx, ly + 0.02, lz); B.box(LM, 1.8, 0.04, 0.42, lx, ly - 0.05, lz);
    if (r.sky) { B.box(DK, 0.05, 0.6, 0.05, lx - 0.8, h - 0.3, lz); B.box(DK, 0.05, 0.6, 0.05, lx + 0.8, h - 0.3, lz); }
    out.lights.push({ x: lx, y: Math.min(ly - 0.5, 4.2 + h * 0.25), z: lz, c: new THREE.Color(lampC), i: (r.li ?? 1) * (9 + h * 3), d: Math.max(14, h * 3) });
  }
  out.walk.push([x0 + T + PR, z0 + T + PR, x1 - T - PR, z1 - T - PR]);
}

/** blueprint → 室内一式 */
export function buildInterior(bp) {
  const th = bp.theme, B = new Builder(), rnd = rng(bp.seed || 7);
  const out = { bp, group: new THREE.Group(), walk: [], cols: [], rects: [], items: [], doors: [], lights: [], anim: [], npcs: [], drones: [], floorMats: new Set(), slot: null, spawn: bp.spawn, rooms: bp.rooms };
  const open = {}, R = (id) => bp.rooms.find((r) => r.id === id);
  for (const r of bp.rooms) open[r.id] = { n: [], s: [], w: [], e: [] };
  for (const r of bp.rooms) for (const [side, a, b, y0 = 0.9, y1 = r.h - 0.5] of r.win || []) { const base = side === 'n' || side === 's' ? r.x : r.z; open[r.id][side].push({ a: base + a, b: base + b, y0, y1, type: 'win' }); }
  for (const [ia, ib, pos, dw = 2.2, dh = 2.5] of bp.doors || []) {
    const A = R(ia), Bm = R(ib); let sa, sb, axis, line;
    if (Math.abs(A.x + A.w - Bm.x) < 0.01) { sa = 'e'; sb = 'w'; axis = 'z'; line = Bm.x; }
    else if (Math.abs(Bm.x + Bm.w - A.x) < 0.01) { sa = 'w'; sb = 'e'; axis = 'z'; line = A.x; }
    else if (Math.abs(A.z + A.d - Bm.z) < 0.01) { sa = 's'; sb = 'n'; axis = 'x'; line = Bm.z; }
    else if (Math.abs(Bm.z + Bm.d - A.z) < 0.01) { sa = 'n'; sb = 's'; axis = 'x'; line = A.z; }
    else { console.warn('door: 部屋が隣接していません', ia, ib); continue; }
    const o = { a: pos - dw / 2, b: pos + dw / 2, y0: 0, y1: dh, type: 'door' }; open[ia][sa].push(o); open[ib][sb].push({ ...o });
    const ext = T + PR + 0.12;
    out.walk.push(axis === 'z' ? [line - ext, pos - dw / 2 + PR, line + ext, pos + dw / 2 - PR] : [pos - dw / 2 + PR, line - ext, pos + dw / 2 - PR, line + ext]);
    door(out, B, th, axis, line, pos, dw, dh);
  }
  for (const r of bp.rooms) room(B, r, th, open[r.id], out);
  // 小道具
  for (const r of bp.rooms) for (const pr of r.props || []) {
    const [type, lx, lz, rot = 0, o = {}] = pr, fn = PROPS[type]; if (!fn) { console.warn('未知の小道具', type); continue; }
    const wx = r.x + lx, wz = r.z + lz, ang = rot * HP, base = mx(wx, 0, wz, 0, ang, 0), P = new Placer(B, base);
    const sw = Math.round(rot) % 2 !== 0;
    const env = {
      th, out, rnd, room: r, x: wx, z: wz, ang,
      col: (rad, ox = 0, oz = 0) => { const v = new THREE.Vector3(ox, 0, oz).applyMatrix4(base); out.cols.push({ x: v.x, z: v.z, r: rad }); },
      rect: (w, d, ox = 0, oz = 0) => { const v = new THREE.Vector3(ox, 0, oz).applyMatrix4(base), hw = (sw ? d : w) / 2, hd = (sw ? w : d) / 2; out.rects.push([v.x - hw, v.z - hd, v.x + hw, v.z + hd]); },
      use: (label, act, range = 2.4, extra = {}) => { const it = { x: wx, z: wz, y: 1.2, r: range, label, act, room: r.id, ...extra }; out.items.push(it); return it; },
      dyn: (obj, x = 0, y = 0, z = 0) => { obj.position.set(x, y, z).applyMatrix4(base); obj.rotation.y += ang; out.group.add(obj); return obj; },
      light: (c, i, y = 2, d = 12) => out.lights.push({ x: wx, y, z: wz, c: new THREE.Color(c), i, d }),
      anim: (f) => out.anim.push(f),
    };
    fn(P, o, env);
  }
  bp.extra?.(B, out);
  const mesh = B.build({ shadow: false }); out.group.add(mesh);
  let minX = 1e9, minZ = 1e9, maxX = -1e9, maxZ = -1e9; for (const r of bp.rooms) { minX = Math.min(minX, r.x); minZ = Math.min(minZ, r.z); maxX = Math.max(maxX, r.x + r.w); maxZ = Math.max(maxZ, r.z + r.d); }
  out.bounds = [minX, minZ, maxX, maxZ];
  return out;
}

/** 位置 (x,z) が歩行可能か */
export function walkable(out, x, z) {
  let ok = false; for (const w of out.walk) if (x >= w[0] && x <= w[2] && z >= w[1] && z <= w[3]) { ok = true; break; }
  if (!ok) return false;
  for (const c of out.cols) { const dx = x - c.x, dz = z - c.z, rr = c.r + PR * 0.8; if (dx * dx + dz * dz < rr * rr) return false; }
  for (const q of out.rects) if (x > q[0] - PR && x < q[2] + PR && z > q[1] - PR && z < q[3] + PR) return false;
  return true;
}
export function roomAt(out, x, z) { for (const r of out.rooms) if (x >= r.x && x <= r.x + r.w && z >= r.z && z <= r.z + r.d) return r; return null; }
