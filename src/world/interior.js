// 内装ジェネレータ v2: 設計図 (blueprint) から歩行可能な室内を構築する
// 部屋形状 (矩形/円形)・天井 (平/ヴォールト/ドーム/トラス/格天井/岩/ガラス)・照明器具・扉・段差・装飾を作り分ける
import * as THREE from 'three';
import { Builder, Placer, mx, rockGeo } from '../gfx/builder.js';
import { mat, glow, aoMat } from '../gfx/textures.js';
import { rng, vnoise } from '../core/util.js';
import { fxTime } from '../gfx/fx.js';
import { PROPS } from './props.js';
import { PROPS2 } from './props2.js';
import { PROPS3 } from './props3.js';
import '../gfx/textures2.js';

export const T = 0.2;      // 壁厚
export const PR = 0.35;    // プレイヤー半径
const HP = Math.PI / 2, TAU = Math.PI * 2;
let GLASS;
export const glassMat = () => GLASS || (GLASS = Object.assign(new THREE.MeshStandardMaterial({ color: 0x9fd0ff, transparent: true, opacity: 0.1, roughness: 0.02, metalness: 0, depthWrite: false, envMapIntensity: 1.6 }), { userData: { uvs: 0 } }));
const flat = (c, r = 0.5, m = 0.2) => mat('flat', { color: c, rough: r, metal: m });

export function holoMat(color, k = 1) {
  return new THREE.ShaderMaterial({
    uniforms: { uCol: { value: new THREE.Color(color).multiplyScalar(k) }, uTime: fxTime }, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide,
    vertexShader: 'varying vec3 vN,vV;varying float vY;void main(){vec4 w=modelMatrix*vec4(position,1.);vY=w.y;vec4 mv=viewMatrix*w;vN=normalize(normalMatrix*normal);vV=normalize(-mv.xyz);gl_Position=projectionMatrix*mv;}',
    fragmentShader: 'uniform vec3 uCol;uniform float uTime;varying vec3 vN,vV;varying float vY;void main(){float fr=pow(1.-abs(dot(vN,vV)),1.4);float sl=.55+.45*sin(vY*90.-uTime*5.);float fl=.92+.08*sin(uTime*41.);gl_FragColor=vec4(uCol*(fr*1.8+.2)*sl*fl,1.);}',
  });
}
/** 面を内向きにする (ドームやヴォールトの内側用) */
function inward(g0) {
  const g = g0.index ? g0.toNonIndexed() : g0, p = g.attributes.position.array, n = g.attributes.normal?.array, uv = g.attributes.uv?.array;
  for (let i = 0; i < p.length; i += 9) for (let k = 0; k < 3; k++) { const t = p[i + 3 + k]; p[i + 3 + k] = p[i + 6 + k]; p[i + 6 + k] = t; if (n) { const q = n[i + 3 + k]; n[i + 3 + k] = n[i + 6 + k]; n[i + 6 + k] = q; } }
  if (uv) for (let i = 0; i < uv.length; i += 6) for (let k = 0; k < 2; k++) { const t = uv[i + 2 + k]; uv[i + 2 + k] = uv[i + 4 + k]; uv[i + 4 + k] = t; }
  if (n) for (let i = 0; i < n.length; i++) n[i] = -n[i];
  return g;
}
function vaultGeo(len, half, rise, seg = 16) {
  const pos = [], idx = [];
  for (let i = 0; i <= seg; i++) { const a = Math.PI * i / seg, x = Math.cos(a) * half, y = Math.sin(a) * rise; pos.push(x, y, -len / 2, x, y, len / 2); }
  for (let i = 0; i < seg; i++) { const a = i * 2; idx.push(a, a + 2, a + 1, a + 1, a + 2, a + 3); }
  const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setIndex(idx); g.computeVertexNormals();
  return g.attributes.normal.getY(seg) > 0 ? inward(g) : g; // 頂部の法線が下向きになるように
}

// ───────────────────────── 扉 ─────────────────────────
function door(out, B, th, axis, line, pos, dw, dh, style = th.door3 || 'slide') {
  const DK = mat('hull', { color: th.frame ?? 0x2c3038, rough: 0.8, metal: 0.6 }), tr = glow(th.trim, 3), D = 2 * T + 0.14, heavy = style === 'blast' || style === 'hatch', pw = heavy ? 0.36 : 0.18, hh = heavy ? 0.4 : 0.25;
  const bx = (m, a, y, d, w, h, t = D) => (axis === 'z' ? B.box(m, t, h, w, line + d, y, a) : B.box(m, w, h, t, a, y, line + d));
  bx(DK, pos - dw / 2 - pw / 2, (dh + hh) / 2, 0, pw, dh + hh); bx(DK, pos + dw / 2 + pw / 2, (dh + hh) / 2, 0, pw, dh + hh); bx(DK, pos, dh + hh / 2, 0, dw + pw * 2, hh); bx(DK, pos, 0.015, 0, dw, 0.03);
  bx(style === 'blast' ? glow('#fc4', 2.4) : tr, pos, dh + 0.06, 0, dw * 0.6, 0.05, D + 0.02);
  if (style === 'hatch') for (const s of [-1, 1]) { const g = new THREE.BoxGeometry(axis === 'z' ? D : 0.5, 0.12, axis === 'z' ? 0.5 : D); B.add(DK, g, axis === 'z' ? mx(line, dh - 0.16, pos + s * (dw / 2 - 0.14), s * 0.785, 0, 0) : mx(pos + s * (dw / 2 - 0.14), dh - 0.16, line, 0, 0, -s * 0.785)); }
  const x = axis === 'z' ? line : pos, z = axis === 'z' ? pos : line;
  if (style === 'open') { out.doors.push({ x, z, dw, dh, k: 1, open: true, panels: [], mode: 'none' }); return out.doors[out.doors.length - 1]; }
  const g = new THREE.Group(), panels = []; let mode = 'x';
  if (style === 'blast') {
    const pb = new Builder(), pm = mat('bulk', { color: th.door ?? 0x5a5f68, rough: 0.7, metal: 0.7 }); pb.box(pm, dw, dh, 0.18, 0, dh / 2, 0);
    for (let i = 0; i < 7; i++) for (const s of [-1, 1]) pb.add(glow('#fc4', 1.3), new THREE.PlaneGeometry(0.2, 0.5), mx(-dw / 2 + 0.3 + i * (dw - 0.6) / 6, 0.35, s * 0.095, 0, s > 0 ? 0 : Math.PI, 0.5), 0);
    pb.box(DK, dw - 0.4, 0.16, 0.22, 0, dh * 0.5, 0); pb.box(glow('#f43', 3), 0.3, 0.08, 0.2, 0, dh * 0.72, 0);
    const p = pb.build({ shadow: false }); g.add(p); panels.push(p); mode = 'y';
  } else for (const s of [-1, 1]) {
    const pb = new Builder();
    if (style === 'glass') { pb.add(glassMat(), new THREE.BoxGeometry(dw / 2, dh, 0.04), mx(0, dh / 2, 0), 0); pb.box(DK, dw / 2, 0.08, 0.07, 0, 0.04, 0); pb.box(DK, dw / 2, 0.08, 0.07, 0, dh - 0.04, 0); pb.box(DK, 0.06, dh, 0.07, s * (dw / 4 - 0.03), dh / 2, 0); pb.box(tr, 0.03, dh * 0.5, 0.05, -s * (dw / 4 - 0.1), dh / 2, 0); }
    else { const pm = mat(style === 'hatch' ? 'bulk' : style === 'wood' ? 'wood' : 'wall', { color: th.door ?? 0x6a727c, rough: 0.6, metal: style === 'wood' ? 0 : 0.6 }); pb.box(pm, dw / 2, dh, 0.1, 0, dh / 2, 0); if (style === 'wood') pb.box(flat(0xc9a24a, 0.3, 1), 0.04, 0.3, 0.16, -s * (dw / 4 - 0.14), dh * 0.45, 0); else pb.box(tr, 0.05, dh * 0.7, 0.12, -s * (dw / 4 - 0.12), dh / 2, 0);
      if (style === 'hatch') { pb.add(DK, new THREE.TorusGeometry(0.24, 0.05, 6, 20), mx(0, dh * 0.62, 0), 0); pb.add(glassMat(), new THREE.CircleGeometry(0.22, 20), mx(0, dh * 0.62, 0.052), 0); } else pb.box(DK, dw / 2 - 0.2, 0.3, 0.13, 0, dh * 0.55, 0); }
    const p = pb.build({ shadow: false }); p.position.x = s * dw / 4; g.add(p); panels.push(p);
  }
  g.position.set(x, 0, z); if (axis === 'z') g.rotation.y = HP;
  out.group.add(g); const d = { g, panels, x, z, dw, dh, k: 0, was: false, mode }; out.doors.push(d);
  return d;
}

// ───────────────────────── 照明器具 ─────────────────────────
function lamps(B, out, r, th, pts, style) {
  const DK = mat('hull', { color: th.frame ?? 0x2c3038, rough: 0.8, metal: 0.6 }), c = r.lamp || th.lamp, LM = glow(c, 3.2), h = r.h, GD = flat(0xd4a84a, 0.25, 1);
  const light = (x, y, z, k = 1) => out.lights.push({ x, y: Math.min(y, 4.2 + h * 0.25), z, c: new THREE.Color(c), i: (r.li ?? 1) * (9 + h * 3) * k, d: Math.max(14, h * 3) });
  pts.forEach(([x, z, y, rot = 0], i) => {
    if (style === 'tube') { B.box(DK, 2.3, 0.1, 0.34, x, y - 0.05, z, rot); B.box(LM, 2.1, 0.04, 0.22, x, y - 0.12, z, rot); light(x, y - 0.6, z); } // 細い蛍光管は遠目に引っかき傷のように見えるので乳白カバー付きの照明器具に
    else if (style === 'pendant') { const ly = Math.max(2.5, Math.min(y - 1.0, 3.6)); B.cyl(DK, 0.012, 0.012, y - ly, x, (y + ly) / 2, z, 'y', 4); B.add(th.shade ? flat(th.shade, 0.6, 0.1) : DK, new THREE.CylinderGeometry(0.08, 0.36, 0.26, 16, 1, true), mx(x, ly + 0.05, z), 0); B.sph(glow(c, 4.5), 0.09, x, ly - 0.02, z, 1, 1, 1, 10); light(x, ly - 0.3, z); }
    else if (style === 'spot') { B.cyl(DK, 0.16, 0.16, 0.05, x, y - 0.025, z, 'y', 12); B.add(glow(c, 5), new THREE.CircleGeometry(0.11, 12).rotateX(HP), mx(x, y - 0.055, z), 0); light(x, y - 0.5, z, 0.8); }
    else if (style === 'lantern') { const ly = Math.max(2.5, Math.min(y - 0.9, 3.4)), lc = ['#ff5a3a', '#ffb347', '#ff7a5a'][i % 3]; B.cyl(DK, 0.01, 0.01, y - ly, x, (y + ly) / 2, z, 'y', 4); B.sph(glow(lc, 1.7), 0.26, x, ly - 0.25, z, 1, 1.2, 1, 12); B.cyl(DK, 0.1, 0.1, 0.05, x, ly + 0.06, z, 'y', 8); B.cyl(DK, 0.1, 0.1, 0.05, x, ly - 0.56, z, 'y', 8); out.lights.push({ x, y: ly - 0.4, z, c: new THREE.Color(lc), i: (r.li ?? 1) * (8 + h * 2.4), d: 13 }); }
    else if (style === 'chandelier') { const ly = Math.max(2.9, y - 1.6), R = Math.min(1.6, Math.min(r.w, r.d) * 0.12); B.cyl(GD, 0.03, 0.03, y - ly, x, (y + ly) / 2, z, 'y', 6); B.tor(GD, R, 0.04, x, ly, z, HP, 0, 0, 32, 6); B.tor(GD, R * 0.55, 0.03, x, ly + 0.3, z, HP, 0, 0, 24, 6);
      for (let k = 0; k < 10; k++) { const a = k * TAU / 10; B.sph(glow(c, 5), 0.06, x + Math.cos(a) * R, ly + 0.1, z + Math.sin(a) * R, 1, 1.4, 1, 8); if (k % 2) B.sph(glow(c, 5), 0.05, x + Math.cos(a) * R * 0.55, ly + 0.38, z + Math.sin(a) * R * 0.55, 1, 1.4, 1, 8); } light(x, ly - 0.3, z, 1.5); }
    else if (style === 'bare') { B.cyl(DK, 0.01, 0.01, 0.5, x, y - 0.25, z, 'y', 4); B.sph(glow(c, 5), 0.06, x, y - 0.54, z, 1, 1.3, 1, 8); light(x, y - 0.8, z, 0.8); }
    else if (style === 'strip') light(x, y - 0.5, z);
    else { B.box(DK, 2.0, 0.1, 0.6, x, y - 0.03, z, rot); B.box(LM, 1.8, 0.04, 0.42, x, y - 0.1, z, rot); light(x, y - 0.6, z); }
  });
}
const gridPts = (r, y, k = 7) => { const nx = Math.max(1, Math.round(r.w / k)), nz = Math.max(1, Math.round(r.d / k)), p = []; for (let i = 0; i < nx; i++) for (let j = 0; j < nz; j++) p.push([r.x + (i + 0.5) * r.w / nx, r.z + (j + 0.5) * r.d / nz, y]); return p; };

// ───────────────────────── 装飾 ─────────────────────────
function deco(B, r, th, out, kinds, rnd) {
  const x0 = r.x + T, z0 = r.z + T, x1 = r.x + r.w - T, z1 = r.z + r.d - T, h = r.h, cx = (x0 + x1) / 2, cz = (z0 + z1) / 2, long = r.w >= r.d, L = long ? r.w : r.d, DK = mat('hull', { color: th.frame ?? 0x2c3038, rough: 0.8, metal: 0.6 }), ST = mat('rib', { color: 0x8a9099, metal: 0.7, rough: 0.6 });
  const along = (t, off, y) => (long ? [x0 + t, y, cz + off] : [cx + off, y, z0 + t]);
  for (const k of kinds) {
    if (k === 'ducts') { const off = (long ? r.d : r.w) * 0.28; for (const s of [-1, 1]) { B.box(ST, long ? L - 1 : 0.7, 0.45, long ? 0.7 : L - 1, ...along(L / 2 - T, s * off, h - 0.45)); for (let t = 1.5; t < L - 1; t += 3) { const p = along(t, s * off, h - 0.45); B.box(DK, long ? 0.12 : 0.78, 0.53, long ? 0.78 : 0.12, ...p); if ((t / 3 | 0) % 2) B.box(DK, long ? 0.6 : 0.4, 0.04, long ? 0.4 : 0.6, p[0], h - 0.69, p[2]); } } }
    else if (k === 'cables') { for (const s of [-1, 1]) { const off = s * ((long ? r.d : r.w) / 2 - T - 0.22); B.box(DK, long ? L - 0.6 : 0.3, 0.04, long ? 0.3 : L - 0.6, ...along(L / 2 - T, off, h - 0.62)); for (let c = 0; c < 4; c++) B.add(flat([0x202226, 0x8a2a20, 0x2a5a8a, 0xc9a22e][c], 0.7, 0.1), new THREE.CylinderGeometry(0.025, 0.025, L - 0.7, 6), mx(...along(L / 2 - T, off + (c - 1.5) * 0.06, h - 0.57), long ? 0 : HP, 0, long ? HP : 0)); for (let t = 1; t < L - 0.5; t += 2.4) B.box(DK, 0.05, 0.6, 0.05, ...along(t, off, h - 0.3)); } }
    else if (k === 'beams') { const W = mat('wood', { color: th.beam ?? 0x7a5a3a, rough: 0.9, metal: 0 }); for (let t = 1.2; t < L - 0.6; t += 2.6) { const p = along(t, 0, h - 0.16); B.box(W, long ? 0.24 : r.w - 2 * T, 0.32, long ? r.d - 2 * T : 0.24, ...p); } B.box(W, long ? L - 2 * T : 0.3, 0.2, long ? 0.3 : L - 2 * T, cx, h - 0.42, cz); }
    else if (k === 'columns') { const CM = th.col ? flat(th.col, 0.3, 0.2) : mat('marble', { rough: 0.5, metal: 0.05 }), off = (long ? r.d : r.w) * 0.3, n = Math.max(2, Math.round(L / 6)); for (let i = 0; i < n; i++) for (const s of [-1, 1]) { const [x, , z] = along((i + 0.5) * (L - 2 * T) / n, s * off, 0); B.cyl(CM, 0.3, 0.34, h - 0.5, x, h / 2, z, 'y', 18); B.cyl(CM, 0.46, 0.5, 0.25, x, 0.125, z, 'y', 18); B.cyl(CM, 0.5, 0.36, 0.3, x, h - 0.15, z, 'y', 18); B.tor(glow(th.trim, 2.4), 0.36, 0.02, x, 0.36, z, HP, 0, 0, 24, 5); out.cols.push({ x, z, r: 0.42 }); } }
    else if (k === 'ibeam') { const off = (long ? r.d : r.w) / 2 - T - 0.2; for (let t = 2; t < L - 1.5; t += 4.5) for (const s of [-1, 1]) { const [x, , z] = along(t, s * off, 0); B.box(ST, 0.34, h, 0.05, x, h / 2, z, long ? 0 : HP); B.box(ST, 0.05, h, 0.3, x, h / 2, z, long ? 0 : HP); B.add(ST, new THREE.BoxGeometry(long ? 0.05 : 1.4, 0.3, long ? 1.4 : 0.05), mx(x - (long ? 0 : s * 0.6), h - 0.55, z - (long ? s * 0.6 : 0), long ? s * 0.6 : 0, 0, long ? 0 : -s * 0.6)); } }
    else if (k === 'banners') { const cs = [0xb8452e, 0x2e7ab8, 0xc9a22e, 0x3aa86a, 0x8a4ab8]; for (let t = 2.5, i = 0; t < L - 2; t += 4, i++) { const p = along(t, ((i % 3) - 1) * (long ? r.d : r.w) * 0.22, h - 1.3); B.box(mat('carpet', { color: cs[i % 5], rough: 1, metal: 0 }), long ? 0.04 : 1.3, 2.2, long ? 1.3 : 0.04, ...p); B.box(DK, long ? 0.06 : 1.5, 0.06, long ? 1.5 : 0.06, p[0], h - 0.18, p[2]); } }
    else if (k === 'lanterns') { const cs = ['#ff4df0', '#4df0ff', '#ffe14d', '#ff5a3a', '#6dffb0']; for (let row = 0; row < 3; row++) { const off = (row - 1) * (long ? r.d : r.w) * 0.3; for (let t = 0.8, i = 0; t < L - 0.6; t += 0.9, i++) { const sag = Math.sin((t / L) * Math.PI) * 0.7, p = along(t, off + Math.sin(i * 0.9 + row) * 0.25, h - 0.35 - sag); B.sph(glow(cs[(i + row) % 5], 2.2), 0.06, ...p, 1, 1.3, 1, 6); } B.add(DK, new THREE.CylinderGeometry(0.008, 0.008, L - 1, 4), mx(...along(L / 2 - T, off, h - 0.62), long ? 0 : HP, 0, long ? HP : 0)); } }
    else if (k === 'stal') { const RK = mat(th.wall[0], { color: th.wall[1], rough: 1, metal: 0.05 }); for (let i = 0; i < r.w * r.d / 14; i++) { const x = x0 + 0.5 + rnd() * (r.w - 1.4), z = z0 + 0.5 + rnd() * (r.d - 1.4), l = 0.4 + rnd() * rnd() * Math.min(2.2, h * 0.3); B.add(RK, new THREE.ConeGeometry(0.1 + l * 0.14, l, 6).rotateX(Math.PI), mx(x, h - l / 2 - 0.1, z)); } }
    else if (k === 'boulders') { const RK = mat('rock', { color: th.wall[1], rough: 1, metal: 0.05, uvs: 0.3 }); for (let i = 0; i < (r.w + r.d) * 0.55; i++) { const side = Math.floor(rnd() * 4), t = rnd(), s = 0.5 + rnd() * rnd() * 1.6; let x = side < 2 ? x0 + t * (r.w - 0.4) : side === 2 ? x0 + s * 0.3 : x1 - s * 0.3, z = side < 2 ? (side ? z1 - s * 0.3 : z0 + s * 0.3) : z0 + t * (r.d - 0.4);
        if (out.doors.some((d) => Math.hypot(d.x - x, d.z - z) < d.dw / 2 + s + 0.9) || (out.slot && Math.hypot(out.slot.x - x, out.slot.z - z) < 12)) continue; B.add(RK, rockGeo(s, 1, i * 7 + r.x, 0.4), mx(x, s * 0.3, z, rnd(), rnd() * 6, rnd(), 1, 0.6 + rnd() * 0.9, 1), 0.3); out.cols.push({ x, z, r: s * 0.8 }); } }
    else if (k === 'pilasters') { // 付け柱 (長辺の壁に並ぶ。柱頭と足元に灯り)
      const PM = th.col ? flat(th.col, 0.3, 0.3) : mat('marble', { rough: 0.4, metal: 0.05 }), GM = flat(th.gilt ?? 0xc8a04a, 0.3, 1), off = (long ? r.d : r.w) / 2 - T - 0.2, step = r.pstep || 6, tr = glow(r.trim || th.trim, 2.6), hr = r.h;
      const h = (r.ceil3 || th.cstyle) === 'gvault' ? hr - Math.min((long ? r.d : r.w) / 2 - T, hr * 0.42, hr - 2.65) : hr; // ガラスのヴォールトの下では壁の高さまで
      for (let t = step / 2; t < L - 1.5; t += step) for (const s of [-1, 1]) { const [x, , z] = along(t, s * off, 0); if (out.doors.some((d) => Math.hypot(d.x - x, d.z - z) < d.dw / 2 + 1.1)) continue;
        B.box(PM, long ? 0.9 : 0.4, h, long ? 0.4 : 0.9, x, h / 2, z); B.box(GM, long ? 1.1 : 0.5, 0.3, long ? 0.5 : 1.1, x, 0.15, z); B.box(GM, long ? 1.1 : 0.5, 0.22, long ? 0.5 : 1.1, x, h - 0.6, z); B.box(GM, long ? 1.3 : 0.6, 0.16, long ? 0.6 : 1.3, x, h - 0.38, z); B.box(GM, long ? 1.0 : 0.46, 0.08, long ? 0.46 : 1.0, x, 1.1, z);
        const ix = long ? x : x - s * 0.21, iz = long ? z - s * 0.21 : z; B.box(tr, long ? 0.1 : 0.03, Math.max(0.5, h - 2.6), long ? 0.03 : 0.1, ix, h / 2 + 0.2, iz); B.add(glow(r.lamp || th.lamp, 3), new THREE.BoxGeometry(long ? 0.5 : 0.1, 0.06, long ? 0.1 : 0.5), mx(ix, h - 0.78, iz), 0); } }
    else if (k === 'arches') { // 真鍮の大アーチ (部屋を横切る)。頂部に段飾り
      const GM = flat(th.gilt ?? 0xc8a04a, 0.3, 1), span = (long ? r.d : r.w) / 2 - T, rise = Math.min(span, h * 0.42, h - 2.65), hs = h - rise, step = r.astep || 9;
      for (let t = step / 2; t < L - 2; t += step) { const g = new THREE.TorusGeometry(1, 0.34 / span, 6, 40, Math.PI), p = along(t, 0, hs);
        B.add(GM, g, long ? mx(p[0], hs, p[2], 0, HP, 0, span * 0.97, rise * 0.97, span) : mx(p[0], hs, p[2], 0, 0, 0, span * 0.97, rise * 0.97, span), 0.25);
        for (let q = 0; q < 3; q++) B.box(GM, long ? 0.5 : 2.4 - q * 0.7, 0.26, long ? 2.4 - q * 0.7 : 0.5, p[0], h - 0.5 - q * 0.26, p[2]); B.sph(glow(r.lamp || th.lamp, 3.4), 0.3, p[0], h - 1.5, p[2], 1, 1.2, 1, 12); B.box(GM, 0.06, 0.5, 0.06, p[0], h - 1.2, p[2]);
        for (const s of [-1, 1]) { const q = along(t, s * (span - 0.25), 0); B.box(GM, long ? 0.6 : 0.5, hs, long ? 0.5 : 0.6, q[0], hs / 2, q[2]); B.box(DK, long ? 0.8 : 0.66, 0.5, long ? 0.66 : 0.8, q[0], 0.25, q[2]); } } }
    else if (k === 'girders') { // 重桁 (下面に警戒帯・赤色灯)
      const HZ = mat('hazard', { rough: 0.7, metal: 0.2 }), step = r.gstep || 6;
      for (let t = step / 2; t < L - 1; t += step) { const p = along(t, 0, h - 0.45); B.box(ST, long ? 0.5 : r.w - 2 * T, 0.9, long ? r.d - 2 * T : 0.5, ...p); B.box(DK, long ? 0.8 : r.w - 2 * T, 0.12, long ? r.d - 2 * T : 0.8, p[0], h - 0.94, p[2]); B.box(HZ, long ? 0.82 : r.w - 2 * T - 0.4, 0.03, long ? r.d - 2 * T - 0.4 : 0.82, p[0], h - 1.01, p[2]);
        for (const s of [-1, 1]) { const q = along(t, s * ((long ? r.d : r.w) / 2 - T - 0.6), h - 1.1); B.sph(glow('#ff3a2a', 3.2), 0.07, q[0], q[1], q[2], 1, 1, 1, 8); B.add(ST, new THREE.BoxGeometry(long ? 0.4 : 1.6, 0.12, long ? 1.6 : 0.4), long ? mx(q[0], h - 1.35, q[2] - s * 0.5, s * 0.7, 0, 0) : mx(q[0] - s * 0.5, h - 1.35, q[2], 0, 0, -s * 0.7)); } } }
    else if (k === 'floorlights') { // 壁際の床に埋めた誘導灯
      const tr = glow(r.trim || th.trim, 2.2);
      for (const s of [-1, 1]) { const off = s * ((long ? r.d : r.w) / 2 - T - 0.5); for (let t = 1; t < L - 1; t += 1.6) { const p = along(t, off, 0.012); if (out.doors.some((d) => Math.hypot(d.x - p[0], d.z - p[2]) < d.dw / 2 + 0.5)) continue; B.box(tr, long ? 0.9 : 0.07, 0.02, long ? 0.07 : 0.9, ...p); } } }
    else if (k === 'coves') { // 天井際の間接照明 (壁をなめる光の帯)
      const lm = glow(r.lamp || th.lamp, 2.4); B.box(DK, r.w - 2 * T, 0.12, 0.42, cx, h - 0.42, z0 + 0.21); B.box(DK, r.w - 2 * T, 0.12, 0.42, cx, h - 0.42, z1 - 0.21); B.box(DK, 0.42, 0.12, r.d - 2 * T, x0 + 0.21, h - 0.42, cz); B.box(DK, 0.42, 0.12, r.d - 2 * T, x1 - 0.21, h - 0.42, cz);
      B.box(lm, r.w - 2 * T - 0.9, 0.04, 0.1, cx, h - 0.34, z0 + 0.3); B.box(lm, r.w - 2 * T - 0.9, 0.04, 0.1, cx, h - 0.34, z1 - 0.3); B.box(lm, 0.1, 0.04, r.d - 2 * T - 0.9, x0 + 0.3, h - 0.34, cz); B.box(lm, 0.1, 0.04, r.d - 2 * T - 0.9, x1 - 0.3, h - 0.34, cz); }
    else if (k === 'wains') { const W = mat('wood', { color: th.beam ?? 0x7a5a3a, rough: 0.8, metal: 0 }); B.box(W, r.w - 2 * T, 0.07, 0.07, cx, 1.05, z0 + 0.035); B.box(W, r.w - 2 * T, 0.07, 0.07, cx, 1.05, z1 - 0.035); B.box(W, 0.07, 0.07, r.d - 2 * T, x0 + 0.035, 1.05, cz); B.box(W, 0.07, 0.07, r.d - 2 * T, x1 - 0.035, 1.05, cz); }
  }
}

// ───────────────────────── 天井 ─────────────────────────
function ceiling(B, r, th, CM, DK, out, rnd) {
  const x0 = r.x, z0 = r.z, h = r.h, cx = x0 + r.w / 2, cz = z0 + r.d / 2, st = r.ceil3 || (r.sky ? 'sky' : th.cstyle || 'flat'), GL = glassMat(), long = r.w >= r.d, tr = glow(r.trim || th.trim, 2.6);
  let pts = gridPts(r, h - 0.02), lst = r.lamps || th.lamps || 'panel';
  if (st === 'sky') {
    B.add(GL, new THREE.PlaneGeometry(r.w - 2 * T, r.d - 2 * T).rotateX(HP), mx(cx, h, cz), 0);
    for (let x = x0 + T; x <= x0 + r.w - T + 0.01; x += (r.w - 2 * T) / Math.max(1, Math.round(r.w / 3.2))) B.box(DK, 0.14, 0.2, r.d, x, h, cz);
    for (let z = z0 + T; z <= z0 + r.d - T + 0.01; z += (r.d - 2 * T) / Math.max(1, Math.round(r.d / 3.2))) B.box(DK, r.w, 0.24, 0.14, cx, h + 0.02, z);
    pts = gridPts(r, h - 0.55); for (const [x, z] of pts) { B.box(DK, 0.05, 0.6, 0.05, x - 0.8, h - 0.3, z); B.box(DK, 0.05, 0.6, 0.05, x + 0.8, h - 0.3, z); }
  } else if ((st === 'vault' || st === 'gvault') && Math.min((long ? r.d : r.w) / 2 - T, h * 0.42, h - 2.65) >= 0.35) {
    const half = (long ? r.d : r.w) / 2 - T, len = (long ? r.w : r.d) - 2 * T, rise = Math.min(half, h * 0.42, h - 2.65), hs = h - rise, gv = st === 'gvault';
    B.add(gv ? GL : CM, vaultGeo(len, half, rise, gv ? 28 : 16), mx(cx, hs, cz, 0, long ? HP : 0, 0), gv ? 0 : undefined);
    for (let t = 2; t < len - 1; t += gv ? 3.5 : 4) { const g = new THREE.TorusGeometry(1, (gv ? 0.16 : 0.09) / half, 6, gv ? 40 : 24, Math.PI); B.add(DK, g, long ? mx(x0 + T + t, hs, cz, 0, HP, 0, half * 0.985, rise * 0.985, half) : mx(cx, hs, z0 + T + t, 0, 0, 0, half * 0.985, rise * 0.985, half), 0.25); }
    if (gv) for (let i = 1; i < 12; i++) { const a = Math.PI * i / 12, o2 = Math.cos(a) * half * 0.985, y = hs + Math.sin(a) * rise * 0.985; B.box(DK, long ? len : 0.12, 0.12, long ? 0.12 : len, long ? cx : cx + o2, y, long ? cz + o2 : cz); } // 棟木 (ガラスを受ける縦通材)
    B.box(tr, long ? len : 0.05, 0.04, long ? 0.05 : len, cx, h - (gv ? 0.14 : 0.03), cz);
    const n = Math.max(1, Math.round(len / 6)); pts = []; for (let i = 0; i < n; i++) pts.push(long ? [x0 + T + (i + 0.5) * len / n, cz, h - 0.12, 0] : [cx, z0 + T + (i + 0.5) * len / n, h - 0.12, HP]);
    if (gv) { pts = gridPts(r, Math.min(hs, 9), 9); lst = 'strip'; } else if (lst === 'panel') lst = 'tube';
  } else if (st === 'truss') {
    B.add(CM, new THREE.PlaneGeometry(r.w, r.d).rotateX(HP), mx(cx, h, cz)); const ST = mat('rib', { color: r.truss ?? th.truss ?? 0x6a7078, metal: 0.7, rough: 0.6 }), span = long ? r.d : r.w, L = long ? r.w : r.d;
    for (let t = 2.5; t < L - 1.5; t += 5) { const p = long ? [x0 + t, cz] : [cx, z0 + t], bx = (w, hh, y, off = 0, rz = 0) => B.add(ST, new THREE.BoxGeometry(long ? 0.14 : w, hh, long ? w : 0.14), long ? mx(p[0], y, p[1] + off, rz, 0, 0) : mx(p[0] + off, y, p[1], 0, 0, -rz));
      bx(span - 2 * T, 0.16, h - 0.12); bx(span - 2 * T, 0.16, h - 1.1); const n = Math.max(2, Math.round(span / 2.2)); for (let i = 0; i <= n; i++) { const o = -span / 2 + T + i * (span - 2 * T) / n; bx(0.1, 0.98, h - 0.61, o); if (i < n) bx(1.0 + (span - 2 * T) / n * 0.5, 0.08, h - 0.61, o + (span - 2 * T) / n / 2, (i % 2 ? 1 : -1) * Math.atan2(0.98, (span - 2 * T) / n)); } }
    pts = gridPts(r, h - 1.15, 8); if (lst === 'panel') lst = 'pendant';
  } else if (st === 'coffer') {
    B.add(CM, new THREE.PlaneGeometry(r.w, r.d).rotateX(HP), mx(cx, h, cz)); const BM = th.cofferC ? flat(th.cofferC, 0.5, 0.2) : DK, nx = Math.max(2, Math.round(r.w / 2.6)), nz = Math.max(2, Math.round(r.d / 2.6));
    for (let i = 0; i <= nx; i++) B.box(BM, 0.22, 0.3, r.d - 2 * T, x0 + T + i * (r.w - 2 * T) / nx, h - 0.15, cz); for (let j = 0; j <= nz; j++) B.box(BM, r.w - 2 * T, 0.3, 0.22, cx, h - 0.15, z0 + T + j * (r.d - 2 * T) / nz);
    B.box(tr, r.w - 0.9, 0.03, 0.04, cx, h - 0.34, z0 + T + 0.14); B.box(tr, r.w - 0.9, 0.03, 0.04, cx, h - 0.34, z0 + r.d - T - 0.14); B.box(tr, 0.04, 0.03, r.d - 0.9, x0 + T + 0.14, h - 0.34, cz); B.box(tr, 0.04, 0.03, r.d - 0.9, x0 + r.w - T - 0.14, h - 0.34, cz);
    pts = []; for (let i = 0; i < nx; i += 2) for (let j = 0; j < nz; j += 2) pts.push([x0 + T + (i + 0.5) * (r.w - 2 * T) / nx, z0 + T + (j + 0.5) * (r.d - 2 * T) / nz, h - 0.01]); if (lst === 'panel') lst = 'spot';
  } else if (st === 'rock') {
    const nx = Math.max(4, Math.round(r.w / 1.4)), nz = Math.max(4, Math.round(r.d / 1.4)), g = new THREE.PlaneGeometry(r.w, r.d, nx, nz).rotateX(HP), p = g.attributes.position;
    for (let i = 0; i < p.count; i++) { const x = p.getX(i), z = p.getZ(i), e = Math.min(r.w / 2 - Math.abs(x), r.d / 2 - Math.abs(z)); p.setY(i, -(vnoise(x * 0.35 + r.x, z * 0.35 + r.z, 3) * 1.4 + vnoise(x * 1.1, z * 1.1, 9) * 0.5) * Math.min(1, e / 2) - Math.max(0, 1.2 - e) * 0.9); }
    g.computeVertexNormals(); B.add(CM, g, mx(cx, h, cz)); pts = gridPts(r, h - 1.3, 8); if (lst === 'panel') lst = 'bare';
  } else {
    B.add(CM, new THREE.PlaneGeometry(r.w, r.d).rotateX(HP), mx(cx, h, cz));
    if (h > 3.4 && !r.nobeam) for (let z = z0 + 2; z < z0 + r.d - 1; z += 4) B.box(DK, r.w - 2 * T, 0.3, 0.22, cx, h - 0.15, z);
  }
  if (lst === 'chandelier') { lamps(B, out, r, th, [[cx, cz, h - (st === 'coffer' ? 0.3 : 0.02)]], 'chandelier'); lamps(B, out, r, th, pts.filter(([x, z]) => Math.hypot(x - cx, z - cz) > 3), 'spot'); }
  else lamps(B, out, r, th, pts, lst);
}

// ───────────────────────── 段差 (壇・階段) ─────────────────────────
function platforms(B, r, th, FM, out) {
  const DK = mat('hull', { color: th.frame ?? 0x2c3038, rough: 0.8, metal: 0.6 }), tr = glow(r.trim || th.trim, 2.4), CH = flat(0xd0d5db, 0.15, 1);
  for (const [lx, lz, w, d, h, side = 's', sw = 0.6] of r.plat) {
    const x0 = r.x + lx, z0 = r.z + lz, x1 = x0 + w, z1 = z0 + d;
    B.box(DK, w, h, d, x0 + w / 2, h / 2, z0 + d / 2); B.add(FM, new THREE.PlaneGeometry(w, d).rotateX(-HP), mx(x0 + w / 2, h + 0.004, z0 + d / 2)); B.box(tr, w + 0.02, 0.03, d + 0.02, x0 + w / 2, h - 0.05, z0 + d / 2);
    out.heights.push({ x0, z0, x1, z1, h0: h, h1: h });
    const n = Math.ceil(h / 0.18), run = 0.3, hz = side === 'n' || side === 's', wd = (hz ? w : d) * sw, sgn = side === 's' || side === 'e' ? 1 : -1;
    for (let i = 0; i < n; i++) { const sh = h * (1 - (i + 1) / (n + 1)), c = (i + 0.5) * run; hz ? B.box(DK, wd, sh, run, x0 + w / 2, sh / 2, (sgn > 0 ? z1 : z0) + sgn * c) : B.box(DK, run, sh, wd, (sgn > 0 ? x1 : x0) + sgn * c, sh / 2, z0 + d / 2); }
    const len = n * run; out.heights.push(hz ? { x0: x0 + w / 2 - wd / 2, x1: x0 + w / 2 + wd / 2, z0: sgn > 0 ? z1 : z0 - len, z1: sgn > 0 ? z1 + len : z0, h0: sgn > 0 ? h : 0, h1: sgn > 0 ? 0 : h, ax: 'z' } : { z0: z0 + d / 2 - wd / 2, z1: z0 + d / 2 + wd / 2, x0: sgn > 0 ? x1 : x0 - len, x1: sgn > 0 ? x1 + len : x0, h0: sgn > 0 ? h : 0, h1: sgn > 0 ? 0 : h, ax: 'x' });
    // 手すり (階段側を除く)
    const rail = (ax, ay, bx2, by) => { const l = Math.hypot(bx2 - ax, by - ay), a = Math.atan2(by - ay, bx2 - ax); B.add(CH, new THREE.BoxGeometry(l, 0.05, 0.05), mx((ax + bx2) / 2, h + 1.0, (ay + by) / 2, 0, -a, 0)); B.add(glassMat(), new THREE.BoxGeometry(l, 0.8, 0.02), mx((ax + bx2) / 2, h + 0.52, (ay + by) / 2, 0, -a, 0), 0); };
    if (h >= 0.5) { const g0 = (hz ? w : d) * (1 - sw) / 2; for (const s of ['n', 's', 'w', 'e']) { if (s === 'n') side === 'n' ? (rail(x0, z0, x0 + g0, z0), rail(x1 - g0, z0, x1, z0)) : rail(x0, z0, x1, z0); if (s === 's') side === 's' ? (rail(x0, z1, x0 + g0, z1), rail(x1 - g0, z1, x1, z1)) : rail(x0, z1, x1, z1); if (s === 'w') side === 'w' ? (rail(x0, z0, x0, z0 + g0), rail(x0, z1 - g0, x0, z1)) : rail(x0, z0, x0, z1); if (s === 'e') side === 'e' ? (rail(x1, z0, x1, z0 + g0), rail(x1, z1 - g0, x1, z1)) : rail(x1, z0, x1, z1); } }
  }
}

// ───────────────────────── 部屋 (矩形) ─────────────────────────
function room(B, r, th, op, out, rnd) {
  const x0 = r.x, z0 = r.z, x1 = r.x + r.w, z1 = r.z + r.d, h = r.h, cx = (x0 + x1) / 2, cz = (z0 + z1) / 2;
  const ws = r.wall || th.wall, fs = r.floor || th.floor, cs = r.ceil || th.ceil;
  const WM = mat(ws[0], { color: ws[1], rough: ws[2] ?? 0.85, metal: ws[3] ?? 0.3 }), FM = mat(fs[0], { color: fs[1], rough: fs[2] ?? 0.6, metal: fs[3] ?? 0.35, floor: 1 }), CM = mat(cs[0], { color: cs[1], rough: 0.9, metal: 0.4 });
  const DK = mat('hull', { color: th.frame ?? 0x2c3038, rough: 0.8, metal: 0.6 }), trim = glow(r.trim || th.trim, 2.6), GL = glassMat(), tst = r.trims ?? th.trims ?? 'both', ribs = r.ribs ?? th.ribs ?? true;
  out.floorMats.add(FM);
  if (r.shape === 'round') return round(B, r, th, op, out, rnd, WM, FM, CM, DK, trim);
  B.add(FM, new THREE.PlaneGeometry(r.w, r.d).rotateX(-HP), mx(cx, 0, cz));
  ceiling(B, r, th, CM, DK, out, rnd);
  const gvR = (r.ceil3 || th.cstyle) === 'gvault' && !r.sky ? Math.min((r.w >= r.d ? r.d : r.w) / 2 - T, r.h * 0.42, r.h - 2.65) : 0;
  const wall = (side) => {
    const hz = side === 'n' || side === 's', lo = hz ? x0 : z0 + T, hi = hz ? x1 : z1 - T, dir = side === 'n' || side === 'w' ? 1 : -1, h = gvR >= 0.35 && hz === (r.w >= r.d) ? r.h - gvR : r.h;
    const fix = side === 'n' ? z0 + T / 2 : side === 's' ? z1 - T / 2 : side === 'w' ? x0 + T / 2 : x1 - T / 2, inner = fix + dir * T / 2;
    const box = (m, a, b, ya, yb, tk = T, off = 0, uvs) => { if (b - a < 0.02 || yb - ya < 0.02) return; const g = hz ? new THREE.BoxGeometry(b - a, yb - ya, tk) : new THREE.BoxGeometry(tk, yb - ya, b - a); B.add(m, g, hz ? mx((a + b) / 2, (ya + yb) / 2, fix + off) : mx(fix + off, (ya + yb) / 2, (a + b) / 2), uvs); };
    const strips = (a, b) => { if (b - a < 0.6) return; if (tst === 'both' || tst === 'low') box(trim, a + 0.12, b - 0.12, 0.09, 0.14, 0.03, dir * (T / 2 + 0.012)); if (tst === 'both' || tst === 'high') box(trim, a + 0.12, b - 0.12, h - 0.2, h - 0.16, 0.03, dir * (T / 2 + 0.012)); if (tst === 'neon') { box(trim, a + 0.4, b - 0.4, 2.55, 2.6, 0.04, dir * (T / 2 + 0.03)); } box(DK, a, b, 0, 0.07, 0.06, dir * (T / 2 + 0.03)); };
    const os = op[side].slice().sort((p, q) => p.a - q.a); let cur = lo;
    for (const o of os) {
      box(WM, cur, o.a, 0, h); strips(cur, o.a - (o.type === 'door' ? 0.2 : 0));
      box(WM, o.a, o.b, o.y1, h); box(WM, o.a, o.b, 0, o.y0);
      if (o.type === 'win') {
        box(GL, o.a, o.b, o.y0, o.y1, 0.04, 0, 0); box(DK, o.a - 0.06, o.b + 0.06, o.y0 - 0.1, o.y0, T + 0.12); box(DK, o.a - 0.06, o.b + 0.06, o.y1, o.y1 + 0.1, T + 0.12);
        const n = Math.max(1, Math.round((o.b - o.a) / 2.8)); for (let i = 0; i <= n; i++) { const p = o.a + (o.b - o.a) * i / n; box(DK, p - 0.05, p + 0.05, o.y0, o.y1, T + 0.12); }
        if (tst !== 'none') box(trim, o.a, o.b, o.y0 - 0.14, o.y0 - 0.11, 0.03, dir * (T / 2 + 0.07));
      }
      cur = o.b + (o.type === 'door' ? 0.2 : 0);
    }
    box(WM, Math.min(cur, hi), hi, 0, h); strips(cur, hi);
    if (ribs) for (let p = lo + 2; p < hi - 1; p += 4) { if (os.some((o) => p > o.a - 0.5 && p < o.b + 0.5)) continue; hz ? B.box(DK, 0.28, h, 0.14, p, h / 2, inner + dir * 0.07) : B.box(DK, 0.14, h, 0.28, inner + dir * 0.07, h / 2, p); }
  };
  ['n', 's', 'w', 'e'].forEach(wall);
  if (r.plat) platforms(B, r, th, FM, out);
  for (const [lx, lz, w, d, st = 'carpet', c = 0x7a2a2a] of r.rug || []) B.add(mat(st, { color: c, rough: st === 'carpet' ? 1 : 0.5, metal: 0 }), new THREE.PlaneGeometry(w, d).rotateX(-HP), mx(x0 + lx + w / 2, 0.006, z0 + lz + d / 2));
  if (r.deco || th.deco) deco(B, r, th, out, r.deco || th.deco, rnd);
  const AO = aoMat('edge'), aw = Math.min(1.3, Math.min(r.w, r.d) * 0.22);
  B.add(AO, new THREE.PlaneGeometry(r.w - 2 * T, aw).rotateX(-HP), mx(cx, 0.008, z0 + T + aw / 2), 0);
  B.add(AO, new THREE.PlaneGeometry(r.w - 2 * T, aw).rotateX(-HP), mx(cx, 0.008, z1 - T - aw / 2, 0, Math.PI, 0), 0);
  B.add(AO, new THREE.PlaneGeometry(r.d - 2 * T, aw).rotateX(-HP), mx(x0 + T + aw / 2, 0.008, cz, 0, HP, 0), 0);
  B.add(AO, new THREE.PlaneGeometry(r.d - 2 * T, aw).rotateX(-HP), mx(x1 - T - aw / 2, 0.008, cz, 0, -HP, 0), 0);
  out.walk.push([x0 + T + PR, z0 + T + PR, x1 - T - PR, z1 - T - PR]);
}

// ───────────────────────── 部屋 (円形・ドーム) ─────────────────────────
function round(B, r, th, op, out, rnd, WM, FM, CM, DK, trim) {
  const cx = r.x + r.w / 2, cz = r.z + r.d / 2, h = r.h, R = Math.min(r.w, r.d) / 2 - T / 2, N = Math.max(20, Math.round(R * 2.4)), GL = glassMat(), ch = 2 * R * Math.tan(Math.PI / N) + 0.03;
  B.add(FM, new THREE.CircleGeometry(R + 0.1, 64).rotateX(-HP), mx(cx, 0, cz));
  // 四隅の余白を埋める床 (矩形の外周まで)
  const gaps = [];
  for (const [side, ang] of [['e', 0], ['s', HP], ['w', Math.PI], ['n', -HP]]) for (const o of op[side]) if (o.type === 'door') gaps.push({ ang, half: Math.asin(Math.min(0.95, ((o.b - o.a) / 2 + 0.3) / R)), o, side });
  const wins = (r.win || []).filter((w) => typeof w[0] === 'number').map(([a, b, y0 = 0.9, y1 = h - 0.6]) => ({ a: a * Math.PI / 180, b: b * Math.PI / 180, y0, y1 }));
  const dAng = (a, b) => Math.abs(Math.atan2(Math.sin(a - b), Math.cos(a - b)));
  for (let i = 0; i < N; i++) {
    const am = (i + 0.5) * TAU / N, x = cx + Math.cos(am) * R, z = cz + Math.sin(am) * R, ry = -am + HP;
    if (gaps.some((g) => dAng(am, g.ang) < g.half)) continue;
    const w = wins.find((q) => dAng(am, (q.a + q.b) / 2) <= (q.b - q.a) / 2);
    if (w) { B.add(WM, new THREE.BoxGeometry(ch, w.y0, T), mx(x, w.y0 / 2, z, 0, ry, 0)); B.add(WM, new THREE.BoxGeometry(ch, h - w.y1, T), mx(x, (h + w.y1) / 2, z, 0, ry, 0)); B.add(GL, new THREE.BoxGeometry(ch, w.y1 - w.y0, 0.04), mx(x, (w.y0 + w.y1) / 2, z, 0, ry, 0), 0); B.add(DK, new THREE.BoxGeometry(0.08, w.y1 - w.y0, T + 0.1), mx(cx + Math.cos(i * TAU / N) * R, (w.y0 + w.y1) / 2, cz + Math.sin(i * TAU / N) * R, 0, -i * TAU / N + HP, 0)); B.add(DK, new THREE.BoxGeometry(ch, 0.1, T + 0.1), mx(x, w.y0, z, 0, ry, 0)); B.add(DK, new THREE.BoxGeometry(ch, 0.1, T + 0.1), mx(x, w.y1, z, 0, ry, 0)); }
    else { B.add(WM, new THREE.BoxGeometry(ch, h, T), mx(x, h / 2, z, 0, ry, 0)); B.add(trim, new THREE.BoxGeometry(ch - 0.1, 0.05, 0.03), mx(cx + Math.cos(am) * (R - T / 2 - 0.02), 0.11, cz + Math.sin(am) * (R - T / 2 - 0.02), 0, ry, 0), 0); if (i % 3 === 0) B.add(DK, new THREE.BoxGeometry(0.26, h, 0.16), mx(cx + Math.cos(i * TAU / N) * (R - 0.12), h / 2, cz + Math.sin(i * TAU / N) * (R - 0.12), 0, -i * TAU / N + HP, 0)); }
  }
  for (const g of gaps) { const dw = g.o.b - g.o.a, hz = g.side === 'n' || g.side === 's', ex = cx + Math.cos(g.ang) * (r.w / 2 - T / 2), ez = cz + Math.sin(g.ang) * (r.d / 2 - T / 2);
    B.add(WM, new THREE.BoxGeometry(hz ? dw + 1.2 : T, h - g.o.y1, hz ? T : dw + 1.2), mx(ex, (h + g.o.y1) / 2, ez));
    for (const s of [-1, 1]) B.add(WM, new THREE.BoxGeometry(hz ? 0.5 : 0.9, h, hz ? 0.9 : 0.5), mx(ex + (hz ? s * (dw / 2 + 0.45) : -Math.cos(g.ang) * 0.3), h / 2, ez + (hz ? -Math.sin(g.ang) * 0.3 : s * (dw / 2 + 0.45)))); }
  B.tor(trim, R - T / 2 - 0.03, 0.025, cx, h - 0.18, cz, HP, 0, 0, 96, 5);
  // ドーム天井
  const st = r.ceil3 || 'dome', rise = Math.min(R * 0.6, h * 0.45), top = r.sky ? 0.32 : 0;
  if (st === 'dome') {
    B.add(CM, inward(new THREE.SphereGeometry(R - 0.12, 48, 14, 0, TAU, top, HP - top)), mx(cx, h - rise, cz, 0, 0, 0, 1, rise / (R - 0.12), 1));
    B.tor(DK, R - 0.16, 0.24, cx, h - rise, cz, HP, 0, 0, 72, 8); B.tor(trim, R - 0.42, 0.03, cx, h - rise - 0.1, cz, HP, 0, 0, 72, 5);
    for (let i = 0; i < 12; i++) B.add(DK, new THREE.TorusGeometry(R * 0.995, 0.07, 5, 16, HP - top), mx(cx, h - rise, cz, 0, i * TAU / 12, 0, 1, rise / R, 1), 0.25);
    if (r.sky) { const or = R * Math.sin(top), oy = h - rise + rise * Math.cos(top); B.add(GL, new THREE.CircleGeometry(or, 32).rotateX(HP), mx(cx, oy, cz), 0); B.tor(DK, or, 0.12, cx, oy, cz, HP, 0, 0, 40, 6); B.tor(trim, or - 0.16, 0.03, cx, oy - 0.05, cz, HP, 0, 0, 40, 5); }
    const pts = []; for (let i = 0; i < 6; i++) { const a = i * TAU / 6 + 0.5; pts.push([cx + Math.cos(a) * R * 0.62, cz + Math.sin(a) * R * 0.62, h - rise + rise * 0.72]); }
    const ls = r.lamps || th.lamps || 'spot'; if (ls === 'chandelier') { lamps(B, out, r, th, [[cx, cz, h - 0.2]], 'chandelier'); lamps(B, out, r, th, pts, 'spot'); } else { lamps(B, out, r, th, pts, ls === 'panel' ? 'spot' : ls); if (!r.sky) lamps(B, out, r, th, [[cx, cz, h - 0.1]], 'spot'); }
  } else { B.add(CM, new THREE.CircleGeometry(R + 0.1, 48).rotateX(HP), mx(cx, h, cz)); lamps(B, out, r, th, gridPts(r, h - 0.02).filter(([x, z]) => Math.hypot(x - cx, z - cz) < R - 1), r.lamps || th.lamps || 'panel'); }
  if (r.plat) platforms(B, r, th, FM, out);
  for (const [lx, lz, w, d, s2 = 'carpet', c = 0x7a2a2a] of r.rug || []) B.add(mat(s2, { color: c, rough: 1, metal: 0 }), w ? new THREE.PlaneGeometry(w, d).rotateX(-HP) : new THREE.CircleGeometry(d, 40).rotateX(-HP), mx(r.x + lx + (w ? w / 2 : 0), 0.006, r.z + lz + (w ? d / 2 : 0)));
  out.walk.push([cx, cz, R - T / 2 - PR - 0.05, 'c']);
}

/** blueprint → 室内一式 */
export function buildInterior(bp) {
  const th = bp.theme, B = new Builder(), rnd = rng(bp.seed || 7), BR = {}, groups = {};
  const out = { bp, group: new THREE.Group(), walk: [], cols: [], rects: [], items: [], doors: [], lights: [], anim: [], npcs: [], drones: [], heights: [], hooks: [], floorMats: new Set(), slot: null, spawn: bp.spawn, rooms: bp.rooms, adj: {}, roomGroups: groups };
  const open = {}, R = (id) => bp.rooms.find((r) => r.id === id);
  for (const r of bp.rooms) { open[r.id] = { n: [], s: [], w: [], e: [] }; BR[r.id] = new Builder(); groups[r.id] = new THREE.Group(); out.group.add(groups[r.id]); out.adj[r.id] = []; }
  for (const r of bp.rooms) for (const w of r.win || []) { if (typeof w[0] !== 'string') continue; const [side, a, b, y0 = 0.9, y1 = r.h - 0.5] = w, base = side === 'n' || side === 's' ? r.x : r.z; open[r.id][side].push({ a: base + a, b: base + b, y0, y1, type: 'win' }); }
  for (const [ia, ib, pos, dw = 2.2, dh = 2.5, style] of bp.doors || []) {
    const A = R(ia), Bm = R(ib); let sa, sb, axis, line;
    if (Math.abs(A.x + A.w - Bm.x) < 0.01) { sa = 'e'; sb = 'w'; axis = 'z'; line = Bm.x; }
    else if (Math.abs(Bm.x + Bm.w - A.x) < 0.01) { sa = 'w'; sb = 'e'; axis = 'z'; line = A.x; }
    else if (Math.abs(A.z + A.d - Bm.z) < 0.01) { sa = 's'; sb = 'n'; axis = 'x'; line = Bm.z; }
    else if (Math.abs(Bm.z + Bm.d - A.z) < 0.01) { sa = 'n'; sb = 's'; axis = 'x'; line = A.z; }
    else { console.warn('door: 部屋が隣接していません', ia, ib); continue; }
    const o = { a: pos - dw / 2, b: pos + dw / 2, y0: 0, y1: dh, type: 'door' }; open[ia][sa].push(o); open[ib][sb].push({ ...o });
    const ext = T + PR + 0.75;
    out.walk.push(axis === 'z' ? [line - ext, pos - dw / 2 + PR, line + ext, pos + dw / 2 - PR] : [pos - dw / 2 + PR, line - ext, pos + dw / 2 - PR, line + ext]);
    const d = door(out, B, th, axis, line, pos, dw, dh, style); out.adj[ia].push({ to: ib, d }); out.adj[ib].push({ to: ia, d });
  }
  // 格納庫の位置は装飾 (岩など) より先に確定させる
  for (const r of bp.rooms) for (const pr of r.props || []) if (pr[0] === 'shipslot') out.slot = { x: r.x + pr[1], z: r.z + pr[2], ang: 0 };
  for (const r of bp.rooms) room(BR[r.id], r, th, open[r.id], out, rnd);
  // 小道具
  for (const r of bp.rooms) for (const pr of r.props || []) {
    const [type, lx, lz, rot = 0, o = {}] = pr, fn = PROPS[type] || PROPS2[type] || PROPS3[type]; if (!fn) { console.warn('未知の小道具', type); continue; }
    const wx = r.x + lx, wz = r.z + lz, ang = rot * HP, y0 = o.y0 || 0, base = mx(wx, y0, wz, 0, ang, 0), P = new Placer(BR[r.id], base), sw = Math.round(rot) % 2 !== 0;
    const env = {
      th, out, rnd, room: r, x: wx, z: wz, ang, y0,
      col: (rad, ox = 0, oz = 0) => { const v = new THREE.Vector3(ox, 0, oz).applyMatrix4(base); out.cols.push({ x: v.x, z: v.z, r: rad, y: y0 }); },
      rect: (w, d, ox = 0, oz = 0) => { const v = new THREE.Vector3(ox, 0, oz).applyMatrix4(base), hw = (sw ? d : w) / 2, hd = (sw ? w : d) / 2; out.rects.push([v.x - hw, v.z - hd, v.x + hw, v.z + hd, y0]); },
      use: (label, act, range = 2.4, extra = {}) => { const it = { x: wx, z: wz, y: 1.2 + y0, r: range, label, act, room: r.id, ...extra }; out.items.push(it); return it; },
      dyn: (obj, x = 0, y = 0, z = 0) => { obj.position.set(x, y, z).applyMatrix4(base); obj.rotation.y += ang; groups[r.id].add(obj); return obj; },
      light: (c, i, y = 2, d = 12) => out.lights.push({ x: wx, y: y + y0, z: wz, c: new THREE.Color(c), i, d }),
      anim: (f) => out.anim.push(f),
    };
    fn(P, o, env);
  }
  // 小道具の接地影
  const BL = aoMat('blob'), rb = (x, z) => BR[roomAt(out, x, z)?.id] || B;
  for (const c of out.cols) { const d = c.r * 2 + 1.0; rb(c.x, c.z).add(BL, new THREE.PlaneGeometry(d, d).rotateX(-HP), mx(c.x, (c.y || 0) + 0.014, c.z), 0); }
  for (const q of out.rects) { const w = q[2] - q[0], d = q[3] - q[1]; if (w < 0.35 || d < 0.35) continue; rb((q[0] + q[2]) / 2, (q[1] + q[3]) / 2).add(BL, new THREE.PlaneGeometry(w + 0.9, d + 0.9).rotateX(-HP), mx((q[0] + q[2]) / 2, (q[4] || 0) + 0.014, (q[1] + q[3]) / 2), 0); }
  bp.extra?.(B, out);
  for (const r of bp.rooms) groups[r.id].add(BR[r.id].build({ shadow: false }));
  out.group.add(B.build({ shadow: false }));
  let minX = 1e9, minZ = 1e9, maxX = -1e9, maxZ = -1e9; for (const r of bp.rooms) { minX = Math.min(minX, r.x); minZ = Math.min(minZ, r.z); maxX = Math.max(maxX, r.x + r.w); maxZ = Math.max(maxZ, r.z + r.d); }
  out.bounds = [minX, minZ, maxX, maxZ];
  return out;
}

/** 床の高さ (壇・階段) */
export function floorY(out, x, z) {
  let y = 0;
  for (const h of out.heights) { if (x < h.x0 || x > h.x1 || z < h.z0 || z > h.z1) continue; const v = h.ax === 'z' ? h.h0 + (h.h1 - h.h0) * (z - h.z0) / (h.z1 - h.z0) : h.ax === 'x' ? h.h0 + (h.h1 - h.h0) * (x - h.x0) / (h.x1 - h.x0) : h.h0; if (v > y) y = v; }
  return y;
}
/** 位置 (x,z) が歩行可能か。y は現在の足元の高さ */
export function walkable(out, x, z, y = 0) {
  let ok = false;
  for (const w of out.walk) { if (w[3] === 'c') { if ((x - w[0]) ** 2 + (z - w[1]) ** 2 <= w[2] * w[2]) { ok = true; break; } } else if (x >= w[0] && x <= w[2] && z >= w[1] && z <= w[3]) { ok = true; break; } }
  if (!ok) return false;
  if (out.heights.length && Math.abs(floorY(out, x, z) - y) > 0.45) return false;
  for (const c of out.cols) { if (Math.abs((c.y || 0) - y) > 1.2) continue; const dx = x - c.x, dz = z - c.z, rr = c.r + PR * 0.8; if (dx * dx + dz * dz < rr * rr) return false; }
  for (const q of out.rects) { if (Math.abs((q[4] || 0) - y) > 1.2) continue; if (x > q[0] - PR && x < q[2] + PR && z > q[1] - PR && z < q[3] + PR) return false; }
  return true;
}
export function roomAt(out, x, z) { for (const r of out.rooms) if (x >= r.x && x <= r.x + r.w && z >= r.z && z <= r.z + r.d) return r; return null; }
