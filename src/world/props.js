// 内装の小道具ライブラリ。各関数は (P: Placer, o: オプション, e: 環境) を受け取る
import * as THREE from 'three';
import { Builder, mx, rockGeo } from '../gfx/builder.js';
import { mat, glow, screenMat, signMesh, leafMat, canopyGeo } from '../gfx/textures.js';
import { fxTime, makeGlowSprite } from '../gfx/fx.js';
import { holoMat, glassMat } from './interior.js';

const HP = Math.PI / 2;
let _M;
export const MM = () => _M || (_M = {
  dk: mat('hull', { color: 0x30343c, rough: 0.8, metal: 0.6 }), st: mat('rib', { color: 0x9aa2ad, metal: 0.7, rough: 0.7 }), wh: mat('flat', { color: 0xe6eaef, rough: 0.3, metal: 0.1 }),
  bk: mat('flat', { color: 0x0e1014, rough: 0.4, metal: 0.5 }), ch: mat('flat', { color: 0xd0d5db, rough: 0.12, metal: 1 }), gd: mat('flat', { color: 0xd4a84a, rough: 0.25, metal: 1 }),
  wd: mat('wood', { rough: 0.75, metal: 0 }), lf: mat('flat', { color: 0x256b2a, rough: 0.85, metal: 0 }), lf2: mat('flat', { color: 0x4f9a3a, rough: 0.85, metal: 0 }), tr: mat('flat', { color: 0x4a3524, rough: 0.9, metal: 0 }),
  so: mat('flat', { color: 0x2a1e14, rough: 1, metal: 0 }),
});
export const fab = (c) => mat('padded', { color: c, rough: 0.8, metal: 0.02 }); // 椅子・ソファの張り地 (絨毯の細かい粒状模様だと砂のように見えるため)
export const crateM = (c) => mat('rib', { color: c, metal: 0.35, rough: 0.8 });
export const flat = (c, r = 0.5, m = 0.2) => mat('flat', { color: c, rough: r, metal: m });
export const CRATE = [0xb8452e, 0x2e7ab8, 0xc9a22e, 0x3aa86a, 0x7a808a, 0x8a4ab8];
export const scr = (P, kind, c, title, w, h, x, y, z, rx = 0, k = 1.5) => P.add(screenMat(kind, c, title, k), new THREE.PlaneGeometry(w, h), mx(x, y, z, rx, 0, 0));
export const blob = (P, m, r, x, y, z, seed, sy = 1) => P.add(m, rockGeo(r, 1, seed, 0.45), mx(x, y, z, 0, seed, 0, 1, sy, 1), 0);
const LEAF = [0xffffff, 0xd8f0c0, 0xb0d890];
/** 葉カードの茂み (中に暗い芯を入れて透けを防ぐ) */
export const bush = (P, e, R, n, x, y, z, flat = 0.8) => { P.add(leafMat(LEAF[Math.floor(e.rnd() * 3)]), canopyGeo(R, n, e.rnd, flat), mx(x, y, z), 0); P.add(mat('flat', { color: 0x163a18, rough: 0.9, metal: 0 }), rockGeo(R * 0.5, 1, x * 7 + z, 0.3), mx(x, y, z, 0, 0, 0, 1, flat, 1), 0); };

// ── ホログラム ──
export function makeHolo(kind, color, s = 1) {
  const g = new THREE.Group(), hm = holoMat(color), wire = (geo) => new THREE.LineSegments(new THREE.WireframeGeometry(geo), new THREE.LineBasicMaterial({ color: new THREE.Color(color).multiplyScalar(1.6), transparent: true, opacity: 0.55, blending: THREE.AdditiveBlending, depthWrite: false }));
  const parts = [];
  if (kind === 'system') {
    g.add(new THREE.Mesh(new THREE.SphereGeometry(0.22 * s, 20, 12), glow('#ffd27a', 4)));
    [0.5, 0.8, 1.1, 1.5, 1.9].forEach((r, i) => { const pv = new THREE.Group(); pv.add(new THREE.Mesh(new THREE.TorusGeometry(r * s, 0.006 * s, 4, 64).rotateX(HP), hm)); const p = new THREE.Mesh(new THREE.SphereGeometry((i === 3 ? 0.13 : 0.07) * s, 14, 10), hm); p.position.x = r * s; pv.add(p); if (i === 3) { const rg = new THREE.Mesh(new THREE.TorusGeometry(0.2 * s, 0.02 * s, 4, 32).rotateX(HP), hm); rg.position.x = r * s; pv.add(rg); } pv.rotation.y = i * 1.7; g.add(pv); parts.push([pv, 0.5 / (r * r + 0.3)]); });
    g.rotation.x = 0.22;
  } else if (kind === 'planet') {
    const p = new THREE.Mesh(new THREE.SphereGeometry(0.7 * s, 32, 20), hm); g.add(p, wire(new THREE.SphereGeometry(0.72 * s, 16, 10))); parts.push([g, 0.25]);
    const rg = new THREE.Mesh(new THREE.TorusGeometry(1.05 * s, 0.01 * s, 4, 64).rotateX(HP * 0.85), hm); g.add(rg);
  } else if (kind === 'ship') {
    const b = new THREE.Mesh(new THREE.ConeGeometry(0.22 * s, 1.5 * s, 6).rotateX(-HP), hm), w = new THREE.Mesh(new THREE.BoxGeometry(1.4 * s, 0.03 * s, 0.5 * s), hm); w.position.z = 0.3 * s; g.add(b, w, wire(new THREE.ConeGeometry(0.24 * s, 1.55 * s, 6).rotateX(-HP))); parts.push([g, 0.4]);
  } else if (kind === 'fleet') {
    for (let i = 0; i < 20; i++) { const m = new THREE.Mesh(new THREE.TetrahedronGeometry(0.07 * s), hm); m.position.set(((i % 5) - 2) * 0.36 * s, (Math.floor(i / 5) - 1.5) * 0.3 * s, Math.sin(i * 2.3) * 0.2 * s); m.userData.idx = i; g.add(m); }
    g.add(wire(new THREE.BoxGeometry(2 * s, 1.4 * s, 0.8 * s))); parts.push([g, 0.15]);
  } else if (kind === 'dancer') {
    const cap = (r, l, x, y, z, rz = 0) => { const m = new THREE.Mesh(new THREE.CapsuleGeometry(r * s, l * s, 4, 10), hm); m.position.set(x * s, y * s, z * s); m.rotation.z = rz; g.add(m); return m; };
    cap(0.16, 0.45, 0, 1.25, 0); cap(0.11, 0.02, 0, 1.78, 0); const a1 = cap(0.05, 0.5, 0.33, 1.45, 0, -0.9), a2 = cap(0.05, 0.5, -0.33, 1.45, 0, 0.9); cap(0.07, 0.7, 0.12, 0.5, 0, 0.08); cap(0.07, 0.7, -0.12, 0.5, 0, -0.08);
    g.userData.wave = (t) => { a1.rotation.z = -0.9 + Math.sin(t * 2.2) * 0.7; a2.rotation.z = 0.9 + Math.sin(t * 2.2 + 1.5) * 0.7; g.position.y = (g.userData.y0 ?? 0) + Math.abs(Math.sin(t * 2.2)) * 0.06; }; parts.push([g, 0.8]);
  } else { g.add(wire(new THREE.IcosahedronGeometry(0.7 * s, 1)), new THREE.Mesh(new THREE.OctahedronGeometry(0.35 * s), hm)); parts.push([g, 0.5]); }
  g.userData.tick = (dt, t) => { for (const [o, sp] of parts) o.rotation.y += dt * sp; g.userData.wave?.(t); };
  return g;
}

// ── 人物 (宇宙服の NPC) ──
export function makeNPC(color = 0x3a6ea8, visor = '#6fe8ff') {
  const b = new Builder(), suit = flat(color, 0.6, 0.2), dk = flat(0x1c1f25, 0.5, 0.5), wh = flat(0xdfe4ea, 0.4, 0.2), cap = (m, r, l, x, y, z, rz = 0, rx = 0) => b.add(m, new THREE.CapsuleGeometry(r, l, 4, 12), mx(x, y, z, rx, 0, rz), 0);
  cap(suit, 0.21, 0.42, 0, 1.2, 0); cap(dk, 0.2, 0.12, 0, 0.92, 0); b.add(wh, new THREE.SphereGeometry(0.155, 20, 14), mx(0, 1.68, 0), 0);
  b.add(glow(visor, 2.2), new THREE.SphereGeometry(0.13, 16, 10, 0, Math.PI, 0.9, 1.0).rotateY(-HP), mx(0, 1.7, 0.05), 0);
  b.box(dk, 0.3, 0.42, 0.16, 0, 1.27, -0.22); b.add(wh, new THREE.TorusGeometry(0.17, 0.035, 6, 20).rotateX(HP), mx(0, 1.52, 0), 0);
  for (const s of [-1, 1]) { cap(suit, 0.075, 0.5, s * 0.3, 1.15, 0.02, s * 0.12); cap(wh, 0.085, 0.06, s * 0.27, 1.42, 0); cap(suit, 0.095, 0.62, s * 0.11, 0.45, 0); b.box(dk, 0.16, 0.12, 0.3, s * 0.11, 0.06, 0.04); b.add(dk, new THREE.SphereGeometry(0.07, 8, 6), mx(s * 0.34, 0.82, 0.03), 0); }
  b.box(glow(visor, 2), 0.1, 0.03, 0.02, 0, 1.3, 0.21);
  return b.build({ shadow: false });
}
// ── 警備ドローン (敵艦内) ──
export function makeDrone(color = '#ff3020') {
  const b = new Builder(), dk = flat(0x202228, 0.4, 0.8), gm = glow(color, 5);
  b.add(dk, new THREE.SphereGeometry(0.34, 20, 14), null, 0); b.add(gm, new THREE.SphereGeometry(0.13, 14, 10), mx(0, 0, 0.27), 0);
  b.tor(dk, 0.46, 0.04, 0, 0, 0, HP, 0, 0, 28, 6); b.tor(gm, 0.46, 0.012, 0, 0.045, 0, HP, 0, 0, 28, 4);
  for (const s of [-1, 1]) { b.box(dk, 0.1, 0.1, 0.5, s * 0.4, -0.08, 0.1); b.box(gm, 0.03, 0.03, 0.06, s * 0.4, -0.08, 0.37); }
  const g = b.build({ shadow: false }); g.add(makeGlowSprite(color, 1.5, 1.2));
  return g;
}

export const PROPS = {
  console(P, o, e) {
    const m = MM(), c = o.c || e.th.trim;
    P.box(m.dk, 1.5, 0.82, 0.7, 0, 0.41, 0); P.add(m.dk, new THREE.BoxGeometry(1.6, 0.08, 0.95), mx(0, 0.9, 0.06, 0.6));
    scr(P, o.kind || 'data', c, o.title, 1.36, 0.74, 0, 0.937, 0.086, 0.6 - HP);
    P.box(glow(c, 2), 1.5, 0.03, 0.03, 0, 0.84, 0.36); P.box(m.bk, 1.3, 0.5, 0.02, 0, 0.42, 0.36);
    if (o.tall) { P.box(m.dk, 1.6, 1.0, 0.08, 0, 1.85, -0.34); scr(P, o.kind2 || 'graph', c, '', 1.46, 0.86, 0, 1.85, -0.29); P.box(m.dk, 0.12, 0.5, 0.12, 0, 1.15, -0.34); }
    e.rect(1.5, 0.8); if (o.use) e.use(o.label, o.use, 2.4, o);
  },
  terminal(P, o, e) {
    const m = MM(), c = o.c || e.th.trim;
    P.box(m.dk, 0.56, 1.05, 0.3, 0, 0.52, 0); P.box(m.ch, 0.6, 0.05, 0.34, 0, 0.03, 0); P.add(m.dk, new THREE.BoxGeometry(0.86, 0.06, 0.6), mx(0, 1.18, 0.1, 0.75));
    scr(P, o.kind || 'bars', c, o.title || o.label, 0.78, 0.5, 0, 1.213, 0.132, 0.75 - HP); P.box(glow(c, 3), 0.04, 0.9, 0.31, 0.3, 0.55, 0); P.box(glow(c, 3), 0.04, 0.9, 0.31, -0.3, 0.55, 0);
    const s = signMesh(o.label, c, 0.26, { double: true, intensity: 2.4 }); e.dyn(s, 0, 2.2, 0); e.anim((dt, t) => { s.position.y = 2.2 + Math.sin(t * 2 + e.x) * 0.04; });
    e.col(0.42); e.use(o.label, o.use, 2.5, o);
  },
  wallscreen(P, o, e) {
    const m = MM(), w = o.w || 3, h = o.h || 1.7, y = o.y || 2.1; P.box(m.bk, w + 0.16, h + 0.16, 0.08, 0, y, 0.04); scr(P, o.kind || 'graph', o.c || e.th.trim, o.title, w, h, 0, y, 0.09, 0, o.k || 1.3);
    P.box(glow(o.c || e.th.trim, 2), w + 0.16, 0.03, 0.03, 0, y - h / 2 - 0.12, 0.09);
  },
  holo(P, o, e) {
    const m = MM(), c = o.c || e.th.trim, s = o.s || 1;
    P.cyl(m.dk, 1.1 * s, 1.3 * s, 0.5, 0, 0.25, 0, 'y', 24); P.cyl(m.bk, 0.95 * s, 0.95 * s, 0.06, 0, 0.53, 0, 'y', 24); P.tor(glow(c, 4), 1.02 * s, 0.03, 0, 0.55, 0, HP, 0, 0, 40, 6); P.add(glow(c, 1.2), new THREE.CircleGeometry(0.8 * s, 32).rotateX(-HP), mx(0, 0.565, 0), 0);
    const h = e.dyn(makeHolo(o.kind || 'planet', c, s), 0, o.y || 1.9, 0); h.userData.y0 = h.position.y; e.anim((dt, t) => h.userData.tick(dt, t));
    const cone = new THREE.Mesh(new THREE.CylinderGeometry(1.1 * s, 0.75 * s, (o.y || 1.9) - 0.5, 24, 1, true), holoMat(c, 0.12)); e.dyn(cone, 0, 0.55 + ((o.y || 1.9) - 0.5) / 2, 0);
    e.light(c, 16, 1.6, 8); e.col(1.3 * s); if (o.use) e.use(o.label, o.use, 2.6 + s, o); e.out.holo = h;
  },
  crate(P, o, e) {
    const n = o.n || 4; for (let i = 0; i < n; i++) { const s = 0.8 + e.rnd() * 0.5, a = i < 3 ? i * 2.1 : e.rnd() * 6, d = i === 0 ? 0 : 0.5 + e.rnd() * 0.6, lv = i > 2 && e.rnd() < 0.6 ? 1 : 0;
      P.add(crateM(CRATE[Math.floor(e.rnd() * CRATE.length)]), new THREE.BoxGeometry(s, s * 0.85, s), mx(Math.cos(a) * d * (lv ? 0.3 : 1), s * 0.425 + lv * 0.95, Math.sin(a) * d * (lv ? 0.3 : 1), 0, e.rnd() * 0.5, 0)); }
    e.col(n > 2 ? 1.25 : 0.75);
  },
  barrel(P, o, e) { const m = MM(); for (const [x, z] of [[0, 0], [0.75, 0.1], [0.35, 0.68]]) { P.cyl(crateM(CRATE[Math.floor(e.rnd() * 4)]), 0.33, 0.33, 1.0, x, 0.5, z, 'y', 14); P.cyl(m.dk, 0.35, 0.35, 0.06, x, 0.3, z, 'y', 14); P.cyl(m.dk, 0.35, 0.35, 0.06, x, 0.75, z, 'y', 14); } e.col(0.85, 0.35, 0.25); },
  cargo(P, o, e) { const m = MM(), c = crateM(o.c || CRATE[Math.floor(e.rnd() * 5)]); P.box(c, 2.4, 2.6, 6, 0, 1.3, 0); P.box(m.dk, 2.5, 0.12, 6.1, 0, 0.06, 0); P.box(m.dk, 2.5, 0.12, 6.1, 0, 2.6, 0); for (const s of [-1, 1]) P.box(m.st, 0.06, 2.3, 0.06, s * 0.5, 1.3, 3.03); e.rect(2.4, 6); },
  bench(P, o, e) { const m = MM(); P.box(fab(o.c || 0x2e5a7a), 2.0, 0.12, 0.5, 0, 0.47, 0); P.box(fab(o.c || 0x2e5a7a), 2.0, 0.5, 0.1, 0, 0.8, -0.24); for (const s of [-0.85, 0.85]) P.box(m.ch, 0.06, 0.45, 0.45, s, 0.22, 0); e.rect(2, 0.55); },
  sofa(P, o, e) { const m = MM(), f = fab(o.c || 0x8a4b3a), w = o.w || 2.4; P.box(m.dk, w, 0.2, 0.95, 0, 0.1, 0); P.box(f, w - 0.1, 0.3, 0.85, 0, 0.36, 0.02); P.box(f, w, 0.75, 0.22, 0, 0.6, -0.38); for (const s of [-1, 1]) P.box(f, 0.22, 0.55, 0.95, s * (w / 2 - 0.1), 0.48, 0); e.rect(w, 0.95); },
  table(P, o, e) { const m = MM(); P.cyl(o.wood ? m.wd : m.wh, 0.72, 0.72, 0.06, 0, 0.76, 0, 'y', 28); P.cyl(m.ch, 0.06, 0.06, 0.72, 0, 0.38, 0, 'y', 10); P.cyl(m.ch, 0.36, 0.4, 0.04, 0, 0.02, 0, 'y', 20); P.cyl(glow(o.c || e.th.trim, 1.5), 0.1, 0.1, 0.02, 0, 0.8, 0, 'y', 12);
    for (let i = 0; i < (o.n ?? 4); i++) { const a = i * HP + 0.6; P.cyl(fab(o.fc || 0x30363e), 0.22, 0.2, 0.08, Math.cos(a) * 1.08, 0.46, Math.sin(a) * 1.08, 'y', 14); P.cyl(m.ch, 0.04, 0.04, 0.44, Math.cos(a) * 1.08, 0.22, Math.sin(a) * 1.08, 'y', 8); } e.col(1.05); },
  bed(P, o, e) { const m = MM(); P.box(m.dk, 1.05, 0.34, 2.15, 0, 0.17, 0); P.box(flat(0xe8e8e2, 0.9, 0), 0.95, 0.16, 2.0, 0, 0.42, 0); P.box(fab(o.c || 0x35507a), 0.97, 0.06, 1.3, 0, 0.52, 0.3); P.box(flat(0xffffff, 0.9, 0), 0.6, 0.1, 0.36, 0, 0.55, -0.74); P.box(m.dk, 1.05, 0.7, 0.08, 0, 0.6, -1.06); P.box(glow(e.th.trim, 2), 0.8, 0.03, 0.03, 0, 0.9, -1.01);
    e.rect(1.05, 2.15); e.use(o.label || '寝台で休む', 'rest', 2.2); },
  bunk(P, o, e) { const m = MM(); for (const y of [0.3, 1.5]) { P.box(m.st, 0.95, 0.08, 2.0, 0, y, 0); P.box(flat(0xdcdcd6, 0.9, 0), 0.85, 0.12, 1.9, 0, y + 0.1, 0); P.box(fab(o.c || 0x5a2a2a), 0.87, 0.05, 1.1, 0, y + 0.18, 0.35); } for (const [x, z] of [[-0.46, -0.98], [0.46, -0.98], [-0.46, 0.98], [0.46, 0.98]]) P.box(m.dk, 0.06, 2.1, 0.06, x, 1.05, z); for (let i = 0; i < 4; i++) P.box(m.st, 0.04, 0.04, 0.4, 0.5, 0.5 + i * 0.3, 0.75); e.rect(1, 2.05); if (o.use !== false) e.use('寝台で休む', 'rest', 2.2); },
  locker(P, o, e) { const m = MM(), n = o.n || 3; for (let i = 0; i < n; i++) { const x = (i - (n - 1) / 2) * 0.62; P.box(m.st, 0.6, 2.0, 0.5, x, 1.0, 0); P.box(m.dk, 0.5, 0.25, 0.02, x, 1.6, 0.255); P.box(glow(i % 2 ? '#6f6' : e.th.trim, 2), 0.06, 0.03, 0.02, x + 0.2, 1.1, 0.256); } e.rect(n * 0.62, 0.5); },
  plant(P, o, e) { const m = MM(), s = o.s || 1; P.cyl(o.dark ? m.dk : m.wh, 0.3 * s, 0.22 * s, 0.45 * s, 0, 0.225 * s, 0, 'y', 16); P.cyl(m.so, 0.27 * s, 0.27 * s, 0.03, 0, 0.44 * s, 0, 'y', 12);
    for (let i = 0; i < 3; i++) P.add(m.tr, new THREE.CylinderGeometry(0.015 * s, 0.03 * s, 0.75 * s, 5), mx((i - 1) * 0.06 * s, 0.8 * s, 0, (i - 1) * 0.25, i * 2, (i - 1) * 0.3));
    bush(P, e, 0.46 * s, 18, 0, 1.18 * s, 0, 0.95); e.col(0.36 * s); },
  tree(P, o, e) { const m = MM(), s = o.s || 1, bark = mat('wood', { color: 0x6a4a32, rough: 0.95, metal: 0, uvs: 1.4 });
    P.cyl(m.wh, 1.0, 1.0, 0.45, 0, 0.225, 0, 'y', 24); P.cyl(m.so, 0.9, 0.9, 0.04, 0, 0.45, 0, 'y', 20); P.tor(glow(e.th.trim, 2), 1.02, 0.025, 0, 0.1, 0, HP, 0, 0, 40, 5);
    P.cyl(bark, 0.1 * s, 0.2 * s, 2.5 * s, 0, 0.45 + 1.25 * s, 0, 'y', 9);
    for (const [x, y, z, rx, rz, l] of [[0.34, 2.5, 0.1, 0.1, -0.75, 1.3], [-0.3, 2.7, -0.12, 0.2, 0.7, 1.2], [0.05, 2.9, 0.3, 0.8, 0.05, 1.1], [0, 3.1, -0.28, -0.7, 0, 1.0]]) P.add(bark, new THREE.CylinderGeometry(0.035 * s, 0.085 * s, l * s, 6), mx(x * s, y * s, z * s, rx, 0, rz));
    bush(P, e, 1.35 * s, 46, 0, 3.75 * s, 0, 0.75); bush(P, e, 0.9 * s, 22, 0.9 * s, 3.2 * s, 0.3 * s); bush(P, e, 0.85 * s, 22, -0.8 * s, 3.3 * s, -0.4 * s); bush(P, e, 0.8 * s, 18, 0.1 * s, 3.1 * s, 0.9 * s);
    for (let i = 0; i < 5; i++) bush(P, e, 0.24, 5, Math.cos(i * 1.3) * 0.62, 0.62, Math.sin(i * 1.3) * 0.62); e.col(1.05); },
  planter(P, o, e) { const m = MM(), w = o.w || 4; P.box(m.wh, w, 0.5, 0.8, 0, 0.25, 0); P.box(m.so, w - 0.12, 0.04, 0.68, 0, 0.5, 0); P.box(glow(e.th.trim, 2), w, 0.03, 0.03, 0, 0.08, 0.41);
    for (let x = -w / 2 + 0.45; x < w / 2 - 0.25; x += 0.62) bush(P, e, 0.36 + e.rnd() * 0.12, 9, x, 0.82 + e.rnd() * 0.1, (e.rnd() - 0.5) * 0.14, 0.85);
    if (o.flowers) for (let x = -w / 2 + 0.4; x < w / 2; x += 0.5) P.sph(glow(['#f6a', '#fd6', '#a8f', '#fff'][Math.floor(e.rnd() * 4)], 1.2), 0.045, x, 1.08 + e.rnd() * 0.12, 0.1 + (e.rnd() - 0.5) * 0.3, 1, 1, 1, 6); e.rect(w, 0.8); },
  pipes(P, o, e) { const m = MM(), h = e.room.h; for (let i = 0; i < 5; i++) { const r = 0.07 + (i % 3) * 0.04, x = (i - 2) * 0.34; P.cyl(i % 2 ? m.st : crateM(o.c || 0xb8452e), r, r, h, x, h / 2, 0, 'y', 10); for (const y of [0.6, h * 0.5, h - 0.6]) P.cyl(m.dk, r + 0.04, r + 0.04, 0.08, x, y, 0, 'y', 10); } P.tor(crateM(0xc02020), 0.16, 0.025, 0.34, 1.25, 0.2, 0, 0, 0, 16, 6); P.box(glow('#6f6', 2.5), 0.08, 0.08, 0.02, -0.34, 1.5, 0.18); e.rect(1.8, 0.4); },
  reactor(P, o, e) {
    const m = MM(), c = o.c || '#4df0ff', h = Math.min(e.room.h, 6);
    P.cyl(m.dk, 1.9, 2.1, 0.5, 0, 0.25, 0, 'y', 28); P.cyl(m.dk, 2.0, 1.8, 0.4, 0, h - 0.2, 0, 'y', 28); P.tor(glow(c, 4), 1.95, 0.04, 0, 0.52, 0, HP, 0, 0, 48, 6);
    for (let i = 0; i < 4; i++) { const a = i * HP + 0.78; P.box(m.st, 0.3, h, 0.3, Math.cos(a) * 1.6, h / 2, Math.sin(a) * 1.6); P.box(glow(c, 2.5), 0.05, h - 1, 0.31, Math.cos(a) * 1.6, h / 2, Math.sin(a) * 1.6, 0); }
    P.add(glassMat(), new THREE.CylinderGeometry(1.2, 1.2, h - 0.9, 28, 1, true), mx(0, h / 2, 0), 0);
    const core = e.dyn(new THREE.Mesh(new THREE.CylinderGeometry(0.42, 0.42, h - 1.2, 20), new THREE.MeshBasicMaterial({ color: new THREE.Color(c).multiplyScalar(4), toneMapped: false })), 0, h / 2, 0);
    const r1 = e.dyn(new THREE.Mesh(new THREE.TorusGeometry(0.9, 0.05, 8, 40), glow(c, 5)), 0, h / 2, 0), r2 = e.dyn(new THREE.Mesh(new THREE.TorusGeometry(0.75, 0.04, 8, 40), glow('#fff', 4)), 0, h / 2, 0);
    e.anim((dt, t) => { r1.rotation.x += dt * 1.6; r1.rotation.y += dt * 0.9; r2.rotation.z += dt * 2.2; r2.rotation.x -= dt * 1.1; const k = 3.4 + Math.sin(t * 5) * 0.8; core.material.color.set(c).multiplyScalar(k); core.scale.x = core.scale.z = 1 + Math.sin(t * 9) * 0.05; });
    e.light(c, 70, h / 2, 16); e.col(2.15); if (o.use) e.use(o.label, o.use, 3.6, o);
  },
  rack(P, o, e) { const m = MM(), n = o.n || 1; for (let k = 0; k < n; k++) { const x = (k - (n - 1) / 2) * 0.85; P.box(m.bk, 0.8, 2.1, 0.7, x, 1.05, 0); for (let i = 0; i < 7; i++) P.box(glow(['#4f8', '#fb4', e.th.trim][(i + k) % 3], 2.2), 0.5 * (0.4 + e.rnd() * 0.6), 0.025, 0.02, x - 0.1, 0.35 + i * 0.25, 0.355); P.box(m.ch, 0.82, 0.04, 0.72, x, 2.1, 0); } e.rect(n * 0.85, 0.7); },
  barcounter(P, o, e) {
    const m = MM(), w = o.w || 5, c = o.c || e.th.trim;
    P.box(m.wd, w, 1.0, 0.7, 0, 0.5, 0); P.box(m.bk, w + 0.2, 0.06, 0.9, 0, 1.03, 0); P.box(glow(c, 3), w, 0.04, 0.03, 0, 0.96, 0.37); P.box(m.ch, w, 0.04, 0.06, 0, 0.25, 0.4);
    P.box(m.dk, w, 2.4, 0.3, 0, 1.2, -1.45); P.add(glow(c, 0.9), new THREE.PlaneGeometry(w - 0.3, 1.3), mx(0, 1.65, -1.29), 0);
    for (const y of [1.15, 1.75]) { P.box(m.bk, w - 0.2, 0.04, 0.26, 0, y, -1.3); for (let x = -w / 2 + 0.3; x < w / 2 - 0.2; x += 0.24) { const hh = 0.22 + e.rnd() * 0.16; P.cyl(glow(['#f84', '#4cf', '#8f6', '#f4c', '#fd4'][Math.floor(e.rnd() * 5)], 0.9 + e.rnd()), 0.035, 0.045, hh, x, y + 0.02 + hh / 2, -1.28, 'y', 8); } }
    for (let x = -w / 2 + 0.6; x < w / 2 - 0.3; x += 1.0) { P.cyl(fab(0x7a2a2a), 0.2, 0.18, 0.08, x, 0.74, 0.85, 'y', 14); P.cyl(m.ch, 0.035, 0.035, 0.72, x, 0.36, 0.85, 'y', 8); P.cyl(m.ch, 0.2, 0.22, 0.03, x, 0.015, 0.85, 'y', 14); }
    e.rect(w, 0.75); e.rect(w, 0.3, 0, -1.45); e.light(c, 22, 2.2, 9);
  },
  vending(P, o, e) { const m = MM(), c = o.c || '#4cf'; P.box(m.dk, 1.0, 2.0, 0.7, 0, 1.0, 0); P.add(glow(c, 1.3), new THREE.PlaneGeometry(0.6, 1.3), mx(-0.14, 1.15, 0.355), 0); scr(P, 'bars', c, o.title || 'DRINK', 0.26, 0.4, 0.33, 1.45, 0.356); for (let i = 0; i < 4; i++) P.box(m.bk, 0.6, 0.02, 0.02, -0.14, 0.65 + i * 0.32, 0.36); P.box(m.bk, 0.6, 0.2, 0.02, -0.14, 0.3, 0.36); e.rect(1, 0.7); e.use(o.label || '自販機 (20 Cr)', 'vend', 2.2); },
  medpod(P, o, e) { const m = MM(); P.box(m.wh, 1.0, 0.5, 2.2, 0, 0.25, 0); P.box(flat(0xdfe8ee, 0.8, 0), 0.8, 0.1, 1.9, 0, 0.55, 0); P.add(glassMat(), new THREE.CylinderGeometry(0.5, 0.5, 2.1, 20, 1, true, -HP, Math.PI).rotateX(HP), mx(0, 0.5, 0), 0); P.box(glow('#6fe', 2.5), 0.9, 0.03, 0.03, 0, 0.5, 1.1); P.box(m.dk, 1.0, 0.9, 0.2, 0, 0.45, -1.2); scr(P, 'graph', '#6fe', 'VITAL', 0.8, 0.5, 0, 1.25, -1.09); P.box(m.dk, 0.9, 0.6, 0.06, 0, 1.25, -1.13);
    e.rect(1.05, 2.3); e.use(o.label || '医療ポッドで治療', 'heal', 2.3); e.light('#6fe', 10, 1.5, 6); },
  weaponrack(P, o, e) { const m = MM(); P.box(m.dk, 2.4, 1.5, 0.08, 0, 1.4, 0.04); P.box(glow(o.c || '#f53', 2.5), 2.3, 0.03, 0.03, 0, 2.18, 0.09); for (let i = 0; i < 4; i++) { const y = 0.9 + i * 0.32; P.box(m.bk, 0.9, 0.09, 0.05, -0.2, y, 0.12); P.box(m.st, 0.3, 0.16, 0.05, -0.8, y - 0.03, 0.12); P.cyl(m.ch, 0.02, 0.02, 0.6, 0.5, y + 0.01, 0.12, 'x', 6); P.box(glow(o.c || '#f53', 2), 0.12, 0.02, 0.055, -0.1, y, 0.125); } if (o.use) e.use(o.label, o.use, 2.4, o); },
  seat(P, o, e) { const m = MM(), f = fab(o.c || 0x22262c); P.cyl(m.ch, 0.12, 0.3, 0.4, 0, 0.2, 0, 'y', 12); P.box(f, 0.62, 0.14, 0.62, 0, 0.5, 0); P.box(f, 0.6, 0.95, 0.14, 0, 1.0, -0.3); P.box(f, 0.34, 0.2, 0.16, 0, 1.55, -0.3); for (const s of [-1, 1]) { P.box(m.dk, 0.09, 0.07, 0.5, s * 0.36, 0.72, 0); P.box(glow(e.th.trim, 2), 0.02, 0.8, 0.02, s * 0.3, 1.0, -0.225); } e.col(0.42); if (o.use) e.use(o.label, o.use, 2.2, o); },
  pillar(P, o, e) { const m = MM(), h = e.room.h, r = o.r || 0.38; P.cyl(m.dk, r, r, h, 0, h / 2, 0, 'y', 16); P.cyl(m.ch, r + 0.1, r + 0.14, 0.3, 0, 0.15, 0, 'y', 16); P.cyl(m.ch, r + 0.14, r + 0.1, 0.3, 0, h - 0.15, 0, 'y', 16); for (const y of [1.1, h / 2, h - 1.1]) P.tor(glow(o.c || e.th.trim, 3), r + 0.02, 0.025, 0, y, 0, HP, 0, 0, 24, 5); e.col(r + 0.1); },
  railing(P, o, e) { const m = MM(), w = o.w || 4; P.box(m.ch, w, 0.05, 0.05, 0, 1.05, 0); P.add(glassMat(), new THREE.BoxGeometry(w, 0.85, 0.02), mx(0, 0.55, 0), 0); for (let x = -w / 2; x <= w / 2 + 0.01; x += w / Math.max(1, Math.round(w / 1.6))) P.box(m.ch, 0.05, 1.05, 0.05, x, 0.52, 0); e.rect(w, 0.15); },
  sign(P, o, e) { const s = signMesh(o.text, o.c || e.th.trim, o.h || 0.6, { double: !!o.double, frame: o.frame, intensity: o.k || 2.4 }); e.dyn(s, 0, o.y || 2.6, 0.03); if (o.flicker) e.anim((dt, t) => { s.material.color.setScalar((o.k || 2.4) * (Math.sin(t * 13 + e.x) > 0.93 ? 0.35 : 1)); }); },
  npc(P, o, e) {
    const g = e.dyn(makeNPC(o.suit, o.visor || e.th.trim)); const n = { g, x: e.x, z: e.z, yaw: e.ang, ph: e.x * 3 + e.z, walk: o.walk, t: 0 }; e.out.npcs.push(n);
    e.col(0.4); if (o.use) e.use(o.label, o.use, 2.6, o);
  },
  slot(P, o, e) { const m = MM(), c = o.c || '#fd4'; P.box(flat(0x8a1420, 0.35, 0.4), 0.8, 1.7, 0.7, 0, 0.85, 0); scr(P, 'bars', c, '777', 0.62, 0.5, 0, 1.25, 0.356); P.box(m.gd, 0.84, 0.1, 0.74, 0, 1.7, 0); P.box(glow(c, 3), 0.7, 0.16, 0.04, 0, 1.56, 0.36); P.box(m.gd, 0.6, 0.06, 0.2, 0, 0.9, 0.42); P.cyl(m.ch, 0.025, 0.025, 0.5, 0.46, 1.25, 0.1, 'y', 6); P.sph(glow('#f33', 2), 0.06, 0.46, 1.52, 0.1); e.rect(0.85, 0.7); e.use(o.label || 'スロットで遊ぶ', 'casino', 2.3); },
  arcade(P, o, e) { const m = MM(), c = o.c || '#4cf'; P.box(flat(0x1a2a5a, 0.4, 0.3), 0.8, 1.8, 0.8, 0, 0.9, 0); scr(P, 'radar', c, o.title || 'STAR RAID', 0.66, 0.5, 0, 1.4, 0.41, -0.2); P.add(m.bk, new THREE.BoxGeometry(0.78, 0.05, 0.4), mx(0, 1.0, 0.45, 0.3)); P.sph(glow('#f33', 2), 0.04, -0.15, 1.06, 0.5); P.box(glow(c, 3), 0.7, 0.14, 0.03, 0, 1.75, 0.41); e.rect(0.85, 0.85); e.use(o.label || 'アーケード筐体', 'arcade', 2.2); },
  aquarium(P, o, e) {
    const m = MM(), w = o.w || 3; P.box(m.dk, w + 0.1, 0.7, 0.9, 0, 0.35, 0); P.box(m.dk, w + 0.1, 0.1, 0.9, 0, 1.95, 0); P.add(glassMat(), new THREE.BoxGeometry(w, 1.2, 0.8), mx(0, 1.3, 0), 0);
    const water = new THREE.Mesh(new THREE.BoxGeometry(w - 0.06, 1.14, 0.74), new THREE.MeshBasicMaterial({ color: new THREE.Color(0.05, 0.3, 0.5), transparent: true, opacity: 0.45, depthWrite: false, toneMapped: false })); e.dyn(water, 0, 1.3, 0);
    for (let i = 0; i < 4; i++) blob(P, i % 2 ? MM().lf : MM().lf2, 0.14, -w / 2 + 0.4 + i * (w - 0.8) / 3, 0.86, 0.1, i + 9, 2.2);
    const fish = []; for (let i = 0; i < 7; i++) { const f = e.dyn(new THREE.Mesh(new THREE.SphereGeometry(0.06, 8, 6).scale(2.2, 1, 0.6), glow(['#fa4', '#f6a', '#6ff', '#ff6'][i % 4], 2.6)), 0, 1.3, 0); fish.push([f, f.position.clone(), i]); }
    const dir = new THREE.Vector3(1, 0, 0).applyAxisAngle(new THREE.Vector3(0, 1, 0), e.ang);
    e.anim((dt, t) => { for (const [f, p0, i] of fish) { const s = Math.sin(t * (0.3 + i * 0.07) + i * 2) * (w / 2 - 0.3); f.position.copy(p0).addScaledVector(dir, s); f.position.y = p0.y + Math.sin(t * 0.7 + i) * 0.4; f.scale.x = Math.cos(t * (0.3 + i * 0.07) + i * 2) > 0 ? 1 : -1; } });
    e.rect(w + 0.1, 0.9); e.light('#3cf', 20, 1.4, 8);
  },
  telescope(P, o, e) { const m = MM(); P.cyl(m.dk, 0.9, 1.1, 0.5, 0, 0.25, 0, 'y', 20); P.box(m.st, 0.5, 1.6, 0.5, 0, 1.3, 0); P.add(m.wh, new THREE.CylinderGeometry(0.55, 0.62, 4.2, 24), mx(0, 2.7, -0.5, -0.95)); P.add(m.gd, new THREE.CylinderGeometry(0.66, 0.66, 0.2, 24), mx(0, 3.72, -1.92, -0.95)); P.add(m.gd, new THREE.CylinderGeometry(0.66, 0.66, 0.2, 24), mx(0, 2.0, 0.48, -0.95)); P.add(m.dk, new THREE.CylinderGeometry(0.12, 0.12, 0.7, 10), mx(0, 1.55, 1.2, -0.95)); P.tor(glow(e.th.trim, 3), 0.95, 0.03, 0, 0.52, 0, HP, 0, 0, 32, 5);
    e.col(1.2); e.use(o.label || '大望遠鏡をのぞく', 'scope', 2.8); },
  shipslot(P, o, e) { e.out.slot = { x: e.x, z: e.z, ang: e.ang }; const c = glow('#fc4', 2.2), r = o.r || 9;
    P.add(c, new THREE.RingGeometry(r - 0.18, r, 64).rotateX(-HP), mx(0, 0.012, 0), 0); P.add(c, new THREE.RingGeometry(r * 0.55 - 0.1, r * 0.55, 48).rotateX(-HP), mx(0, 0.012, 0), 0);
    for (let i = 0; i < 12; i++) { const a = i * Math.PI / 6; P.box(i % 3 ? glow('#4f8', 3) : glow('#fff', 4), 0.16, 0.05, 0.16, Math.cos(a) * (r + 0.5), 0.03, Math.sin(a) * (r + 0.5)); } for (const a of [0, HP, Math.PI, -HP]) P.add(c, new THREE.PlaneGeometry(0.25, r * 0.4).rotateX(-HP), mx(Math.cos(a) * r * 0.76, 0.012, Math.sin(a) * r * 0.76, 0, -a + HP, 0), 0); },
  lightcone(P, o, e) { const h = e.room.h, c = new THREE.Mesh(new THREE.CylinderGeometry(0.25, o.r || 2.2, h, 24, 1, true), new THREE.ShaderMaterial({ uniforms: { uCol: { value: new THREE.Color(o.c || e.th.lamp).multiplyScalar(o.k || 0.5) } }, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide,
    vertexShader: 'varying vec2 vUv;varying vec3 vN,vV;void main(){vUv=uv;vec4 mv=modelViewMatrix*vec4(position,1.);vN=normalize(normalMatrix*normal);vV=normalize(-mv.xyz);gl_Position=projectionMatrix*mv;}', fragmentShader: 'uniform vec3 uCol;varying vec2 vUv;varying vec3 vN,vV;void main(){float a=pow(abs(dot(vN,vV)),2.)*pow(vUv.y,1.5);gl_FragColor=vec4(uCol*a,1.);}' })); e.dyn(c, 0, h / 2, 0); },
  cell(P, o, e) { const m = MM(), c = o.c || '#f43'; P.box(m.dk, 0.15, 2.6, 2.6, -1.5, 1.3, 0); P.box(m.dk, 0.15, 2.6, 2.6, 1.5, 1.3, 0); P.box(m.dk, 3.15, 0.15, 2.6, 0, 2.65, 0); P.box(m.st, 0.9, 0.1, 2.0, -0.9, 0.4, 0); for (let x = -1.3; x <= 1.31; x += 0.325) P.box(glow(c, 2.4), 0.03, 2.55, 0.03, x, 1.3, 1.28);
    const f = new THREE.Mesh(new THREE.PlaneGeometry(2.9, 2.55), holoMat(c, 0.5)); e.dyn(f, 0, 1.3, 1.28); e.rect(3.2, 0.2, 0, 1.28); e.rect(0.2, 2.6, -1.5, 0); e.rect(0.2, 2.6, 1.5, 0); e.light(c, 10, 2, 6); },
  core(P, o, e) { const m = MM(), c = o.c || '#f43'; P.cyl(m.dk, 0.7, 0.95, 1.0, 0, 0.5, 0, 'y', 8); P.cyl(m.bk, 0.5, 0.5, 0.08, 0, 1.04, 0, 'y', 8); P.tor(glow(c, 4), 0.62, 0.03, 0, 1.02, 0, HP, 0, 0, 8, 5);
    const k = e.dyn(new THREE.Mesh(new THREE.IcosahedronGeometry(0.34, 0), glow(c, 5)), 0, 1.75, 0), w = e.dyn(new THREE.LineSegments(new THREE.WireframeGeometry(new THREE.IcosahedronGeometry(0.55, 1)), new THREE.LineBasicMaterial({ color: new THREE.Color(c).multiplyScalar(2), transparent: true, opacity: 0.7, blending: THREE.AdditiveBlending })), 0, 1.75, 0);
    e.anim((dt, t) => { k.rotation.y += dt * 1.3; k.rotation.x += dt * 0.7; w.rotation.y -= dt * 0.5; k.position.y = 1.75 + Math.sin(t * 2) * 0.06; }); e.light(c, 30, 1.8, 9); e.col(0.95); e.use(o.label || '制御コアを掌握する', 'core', 2.8); },
  exit(P, o, e) { const m = MM(), c = o.c || '#4f8', w = o.w || 2.0; P.box(m.dk, w + 0.5, 2.9, 0.16, 0, 1.45, 0.08); P.box(m.st, w, 2.5, 0.08, 0, 1.25, 0.17); for (let i = 0; i < 6; i++) P.add(glow('#fc4', 1.2), new THREE.PlaneGeometry(0.16, 0.5), mx(-w / 2 + 0.2 + i * (w - 0.4) / 5, 0.32, 0.215, 0, 0, 0.5), 0);
    P.add(m.bk, new THREE.CylinderGeometry(0.42, 0.42, 0.06, 20).rotateX(HP), mx(0, 1.5, 0.22)); P.add(glassMat(), new THREE.CircleGeometry(0.36, 20), mx(0, 1.5, 0.26), 0); P.box(glow(c, 4), w + 0.4, 0.06, 0.04, 0, 2.82, 0.18);
    const s = signMesh(o.sign || 'EXIT', c, 0.3, { intensity: 2.4 }); e.dyn(s, 0, 3.15, 0.1); e.use(o.label || 'エアロック', o.use || 'exit', 2.6, o); },
  hydro(P, o, e) { const m = MM(), w = o.w || 2.6; for (const y of [0.4, 1.1, 1.8]) { P.box(m.wh, w, 0.14, 0.7, 0, y, 0); P.box(m.so, w - 0.1, 0.03, 0.6, 0, y + 0.08, 0); P.box(glow('#c06aff', 3), w - 0.2, 0.03, 0.05, 0, y + 0.62, 0); for (let x = -w / 2 + 0.25; x < w / 2 - 0.1; x += 0.36) blob(P, e.rnd() < 0.5 ? m.lf : m.lf2, 0.14 + e.rnd() * 0.07, x, y + 0.24, (e.rnd() - 0.5) * 0.2, x * 5 + y, 1.1); }
    for (const s of [-1, 1]) P.box(m.ch, 0.05, 2.5, 0.7, s * w / 2, 1.25, 0); e.rect(w, 0.7); e.light('#c06aff', 9, 1.6, 6); if (o.use) e.use(o.label, o.use, 2.3, o); },
  desk(P, o, e) { const m = MM(); P.box(o.wood ? m.wd : m.wh, 1.8, 0.06, 0.85, 0, 0.75, 0); for (const [x, z] of [[-0.82, -0.36], [0.82, -0.36], [-0.82, 0.36], [0.82, 0.36]]) P.box(m.ch, 0.05, 0.74, 0.05, x, 0.37, z); P.box(m.bk, 0.7, 0.44, 0.04, 0.1, 1.08, -0.22); scr(P, o.kind || 'data', o.c || e.th.trim, '', 0.64, 0.38, 0.1, 1.08, -0.195); P.box(m.bk, 0.06, 0.12, 0.06, 0.1, 0.84, -0.24);
    P.box(fab(0x2a2e36), 0.5, 0.1, 0.5, 0, 0.48, 0.85); P.box(fab(0x2a2e36), 0.5, 0.6, 0.08, 0, 0.84, 1.08); P.cyl(m.ch, 0.04, 0.04, 0.44, 0, 0.22, 0.85, 'y', 8); e.rect(1.8, 0.85); e.col(0.3, 0, 0.85); if (o.use) e.use(o.label, o.use, 2.3, o); },
  kitchen(P, o, e) { const m = MM(), w = o.w || 3; P.box(m.wh, w, 0.9, 0.65, 0, 0.45, 0); P.box(m.bk, w + 0.04, 0.05, 0.7, 0, 0.92, 0); P.box(m.wh, w, 0.7, 0.36, 0, 2.0, -0.14); P.box(glow('#ffe2b0', 2.5), w - 0.2, 0.02, 0.05, 0, 1.63, -0.1); P.box(m.ch, 0.5, 0.04, 0.4, -w / 4, 0.95, 0.02); P.cyl(m.ch, 0.015, 0.015, 0.3, -w / 4, 1.1, -0.2, 'y', 6); P.box(m.bk, 0.5, 0.3, 0.3, w / 4, 1.1, -0.1); P.box(glow('#fb4', 1.6), 0.3, 0.14, 0.01, w / 4, 1.1, 0.055);
    e.rect(w, 0.65); if (o.use) e.use(o.label || '食事をとる', o.use, 2.3, o); },
  monolith(P, o, e) { const c = o.c || e.th.trim; P.box(flat(0x08090c, 0.15, 0.8), 1.0, 3.2, 0.35, 0, 1.6, 0); for (let i = 0; i < 6; i++) P.box(glow(c, 3), 0.5 - (i % 3) * 0.12, 0.03, 0.01, (i % 2 ? 0.1 : -0.1), 0.8 + i * 0.36, 0.18); P.cyl(MM().dk, 0.9, 1.0, 0.2, 0, 0.1, 0, 'y', 6); e.col(0.8); e.light(c, 12, 1.6, 7); if (o.use) e.use(o.label, o.use, 2.6, o); },
  stage(P, o, e) { const m = MM(), c = o.c || '#f4c'; P.cyl(m.bk, 1.6, 1.7, 0.4, 0, 0.2, 0, 'y', 28); P.tor(glow(c, 4), 1.62, 0.04, 0, 0.41, 0, HP, 0, 0, 48, 6); P.add(glow(c, 0.8), new THREE.CircleGeometry(1.3, 32).rotateX(-HP), mx(0, 0.405, 0), 0);
    const h = e.dyn(makeHolo('dancer', c, 1.15), 0, 0.42, 0); h.userData.y0 = h.position.y; e.anim((dt, t) => h.userData.tick(dt, t)); e.light(c, 26, 2.2, 10); e.col(1.75); },
  stall(P, o, e) { const m = MM(), c = o.c || 0xb8452e; P.box(m.wd, 2.6, 0.9, 1.0, 0, 0.45, 0); for (const s of [-1.25, 1.25]) P.box(m.st, 0.06, 2.6, 0.06, s, 1.3, -0.45); P.add(fab(c), new THREE.BoxGeometry(2.9, 0.05, 1.5), mx(0, 2.55, 0.1, 0.22)); P.box(glow(e.th.trim, 2.5), 2.6, 0.03, 0.03, 0, 0.92, 0.5);
    for (let i = 0; i < 9; i++) P.box(glow(['#f84', '#4cf', '#8f6', '#f4c', '#fd4'][i % 5], 0.7), 0.2, 0.16 + (i % 3) * 0.06, 0.2, -1.0 + (i % 5) * 0.5, 1.0, -0.2 + Math.floor(i / 5) * 0.4); for (const s of [-0.9, 0, 0.9]) P.sph(glow('#fc6', 3), 0.07, s, 2.2, 0.6, 1, 1, 1, 8); e.rect(2.6, 1.0); e.light('#fc6', 10, 2.0, 6); if (o.use) e.use(o.label, o.use, 2.6, o); },
  tank(P, o, e) { const m = MM(), c = o.c || '#6fe'; P.cyl(m.dk, 0.55, 0.62, 0.4, 0, 0.2, 0, 'y', 20); P.cyl(m.dk, 0.6, 0.55, 0.3, 0, 2.55, 0, 'y', 20); P.add(glassMat(), new THREE.CylinderGeometry(0.5, 0.5, 2.1, 24, 1, true), mx(0, 1.45, 0), 0); P.tor(glow(c, 3), 0.56, 0.02, 0, 0.42, 0, HP, 0, 0, 28, 5);
    const liquid = e.dyn(new THREE.Mesh(new THREE.CylinderGeometry(0.47, 0.47, 2.0, 20), new THREE.MeshBasicMaterial({ color: new THREE.Color(c).multiplyScalar(0.35), transparent: true, opacity: 0.4, depthWrite: false, toneMapped: false })), 0, 1.45, 0);
    const sp = e.dyn(new THREE.Mesh(rockGeo(0.22, 2, e.x * 3 + 1, 0.5), glow(c, 2.2)), 0, 1.45, 0), y0 = sp.position.y; e.anim((dt, t) => { sp.position.y = y0 + Math.sin(t * 0.9 + e.x) * 0.3; sp.rotation.y += dt * 0.4; liquid.visible = true; }); e.col(0.62); e.light(c, 8, 1.5, 5); },
  steam(P, o, e) { const s = e.dyn(makeGlowSprite(o.c || '#fff', 1.6, 0.25), 0, o.y || 0.4, 0), y0 = s.position.y; e.anim((dt, t) => { const k = (t * 0.6 + e.x) % 1; s.position.y = y0 + k * 1.8; s.scale.setScalar(0.6 + k * 2.2); s.material.opacity = (1 - k) * 0.5; }); },
  // ── 追加の小道具 (拠点ごとの作り込み用) ──
  bookshelf(P, o, e) { const m = MM(), w = o.w || 2.2, hh = o.h || 2.3, cs = [0x8a2a20, 0x2a5a8a, 0xc9a22e, 0x3a7a4a, 0x6a4a8a, 0xd8d0c0, 0x30343c];
    P.box(m.wd, w, hh, 0.06, 0, hh / 2, -0.17); P.box(m.wd, 0.06, hh, 0.4, -w / 2, hh / 2, 0); P.box(m.wd, 0.06, hh, 0.4, w / 2, hh / 2, 0);
    for (let j = 0; j < 6; j++) { const y = 0.05 + j * (hh - 0.1) / 5; P.box(m.wd, w, 0.05, 0.4, 0, y, 0); if (j === 5) break; let x = -w / 2 + 0.1; while (x < w / 2 - 0.15) { const bw = 0.04 + e.rnd() * 0.06, bh = 0.24 + e.rnd() * 0.14; if (e.rnd() < 0.86) P.add(flat(cs[Math.floor(e.rnd() * cs.length)], 0.8, 0), new THREE.BoxGeometry(bw, bh, 0.26), mx(x + bw / 2, y + 0.03 + bh / 2, 0, 0, 0, e.rnd() < 0.1 ? 0.2 : 0)); x += bw + 0.008; } }
    e.rect(w, 0.42); },
  fountain(P, o, e) { const m = MM(), R = o.r || 1.7, st = mat('marble', { rough: 0.35, metal: 0.05 }), c = o.c || e.th.trim;
    P.cyl(st, R, R + 0.15, 0.55, 0, 0.275, 0, 'y', 40); P.cyl(st, 0.5, 0.7, 1.2, 0, 0.6, 0, 'y', 20); P.cyl(st, 0.95, 0.35, 0.22, 0, 1.3, 0, 'y', 28); P.tor(glow(c, 2.5), R - 0.1, 0.025, 0, 0.5, 0, HP, 0, 0, 56, 5);
    const wm = new THREE.MeshStandardMaterial({ color: 0x2a6a8a, roughness: 0.04, metalness: 0.6, normalMap: mat('water').normalMap, transparent: true, opacity: 0.85, envMapIntensity: 2 }); wm.normalMap = wm.normalMap.clone(); wm.normalMap.needsUpdate = true; wm.normalMap.repeat.set(2, 2);
    e.dyn(new THREE.Mesh(new THREE.CircleGeometry(R - 0.08, 40).rotateX(-HP), wm), 0, 0.5, 0); e.dyn(new THREE.Mesh(new THREE.CircleGeometry(0.9, 28).rotateX(-HP), wm), 0, 1.4, 0);
    const jet = e.dyn(new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.14, 1.3, 10, 1, true), holoMat('#cfefff', 0.5)), 0, 2.05, 0), fall = e.dyn(new THREE.Mesh(new THREE.CylinderGeometry(0.93, 0.98, 0.88, 28, 1, true), holoMat('#cfefff', 0.16)), 0, 0.95, 0);
    e.anim((dt, t) => { wm.normalMap.offset.set(t * 0.03, t * 0.05); jet.scale.y = 1 + Math.sin(t * 3) * 0.08; fall.rotation.y += dt * 0.4; }); e.col(R + 0.15); e.light(c, 14, 1.4, 8); },
  poster(P, o, e) { const s = signMesh(o.text || 'STARFABLE', o.c || e.th.trim, o.h || 1.1, { bg: o.bg || '#0c1018', frame: true, intensity: o.k || 1.3 }); e.dyn(s, 0, o.y || 1.9, 0.04); P.box(MM().bk, (s.userData.w || 1.6) + 0.1, (o.h || 1.1) + 0.1, 0.04, 0, o.y || 1.9, 0.015); },
  fan(P, o, e) { const m = MM(), h = e.room.h, g = new THREE.Group(); P.cyl(m.dk, 0.03, 0.03, 0.5, 0, h - 0.25, 0, 'y', 6); P.cyl(m.dk, 0.14, 0.14, 0.12, 0, h - 0.54, 0, 'y', 12);
    for (let i = 0; i < 4; i++) { const b = new THREE.Mesh(new THREE.BoxGeometry(1.3, 0.02, 0.2), o.wood ? m.wd : m.st); b.position.set(Math.cos(i * HP) * 0.75, 0, Math.sin(i * HP) * 0.75); b.rotation.set(0.18, -i * HP, 0, 'YXZ'); g.add(b); } e.dyn(g, 0, h - 0.56, 0); e.anim((dt) => { g.rotation.y += dt * (o.sp || 2.4); }); },
  fireplace(P, o, e) { const m = MM(), bk = mat('brick', { color: o.c || 0x8a7a70, rough: 1, metal: 0 }), h = Math.min(e.room.h, 3.6);
    P.box(bk, 2.6, h, 0.7, 0, h / 2, 0.05); P.box(m.bk, 1.5, 1.1, 0.5, 0, 0.6, 0.2); P.box(m.wd, 2.9, 0.12, 0.9, 0, 1.45, 0.08); P.box(bk, 3.0, 0.12, 1.3, 0, 0.06, 0.3);
    for (let i = 0; i < 3; i++) P.add(m.tr, new THREE.CylinderGeometry(0.08, 0.09, 1.0, 7).rotateZ(HP), mx((i - 1) * 0.05, 0.2 + i * 0.09, 0.25 + (i % 2) * 0.12, 0, i * 0.5, 0));
    const fl = []; for (let i = 0; i < 5; i++) { const f = e.dyn(new THREE.Mesh(new THREE.ConeGeometry(0.16 + (i % 2) * 0.06, 0.7, 7, 1, true), new THREE.MeshBasicMaterial({ color: new THREE.Color(i % 2 ? '#ffb040' : '#ff6a1e').multiplyScalar(2.6), transparent: true, opacity: 0.8, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide, toneMapped: false })), (i - 2) * 0.2, 0.62, 0.3); fl.push(f); }
    const L = { x: e.x, y: 0.9 + e.y0, z: e.z, c: new THREE.Color('#ff9a4a'), i: 30, d: 12 }; e.out.lights.push(L);
    e.anim((dt, t) => { fl.forEach((f, i) => { f.scale.set(1 + Math.sin(t * 9 + i * 2) * 0.2, 0.8 + Math.sin(t * 13 + i * 1.7) * 0.3 + Math.sin(t * 5.3 + i) * 0.15, 1); }); L.i = 26 + Math.sin(t * 11) * 5 + Math.sin(t * 23) * 3; }); e.rect(3, 1.3, 0, 0.3); },
  hoload(P, o, e) { const c = o.c || e.th.trim, s = signMesh(o.text || 'SALE', c, o.h || 0.9, { double: true, intensity: 2.2, frame: true }); e.dyn(s, 0, o.y || 2.8, 0); const pl = new THREE.Mesh(new THREE.PlaneGeometry((s.userData.w || 2) + 0.4, (o.h || 0.9) + 0.4), holoMat(c, 0.25)); e.dyn(pl, 0, o.y || 2.8, -0.02); const y0 = s.position.y;
    P.cyl(MM().dk, 0.25, 0.32, 0.12, 0, 0.06, 0, 'y', 12); P.add(glow(c, 2), new THREE.CircleGeometry(0.2, 12).rotateX(-HP), mx(0, 0.125, 0), 0); e.anim((dt, t) => { s.position.y = pl.position.y = y0 + Math.sin(t * 1.3 + e.x) * 0.06; }); },
  workbench(P, o, e) { const m = MM(); P.box(m.st, 2.4, 0.08, 0.9, 0, 0.92, 0); for (const [x, z] of [[-1.1, -0.38], [1.1, -0.38], [-1.1, 0.38], [1.1, 0.38]]) P.box(m.dk, 0.08, 0.9, 0.08, x, 0.45, z); P.box(m.dk, 2.2, 0.05, 0.8, 0, 0.3, 0); P.box(m.dk, 2.4, 1.2, 0.05, 0, 1.6, -0.43);
    for (let i = 0; i < 9; i++) P.add(i % 3 ? m.ch : flat(0xb8452e, 0.6, 0.3), new THREE.BoxGeometry(0.05, 0.3 + (i % 4) * 0.1, 0.03), mx(-1 + i * 0.25, 1.6 + (i % 2) * 0.12, -0.39, 0, 0, (i % 3 - 1) * 0.3));
    P.box(flat(0xb8452e, 0.5, 0.4), 0.3, 0.22, 0.26, 0.8, 1.07, 0.1); P.box(m.ch, 0.5, 0.06, 0.3, -0.5, 0.99, 0.05); P.add(glow('#ffe2b0', 3), new THREE.CylinderGeometry(0.03, 0.03, 1.6, 6).rotateZ(HP), mx(0, 2.15, -0.3), 0); P.box(crateM(0x2e7ab8), 0.5, 0.4, 0.4, -0.7, 0.53, 0); e.rect(2.4, 0.95); e.light('#ffe2b0', 8, 2, 5); if (o.use) e.use(o.label, o.use, 2.4, o); },
  gantry(P, o, e) { const Y = mat('hull', { color: 0xe8a020, rough: 0.6, metal: 0.4 }), m = MM(), w = o.w || 30, h = e.room.h - 2.2; P.box(Y, w, 0.9, 0.5, 0, h, -0.9); P.box(Y, w, 0.9, 0.5, 0, h, 0.9); P.box(m.dk, 2.2, 0.7, 2.6, o.at || 3, h + 0.1, 0); P.cyl(m.dk, 0.03, 0.03, 4, o.at || 3, h - 2.2, 0, 'y', 6); P.add(m.st, new THREE.TorusGeometry(0.28, 0.07, 6, 14, Math.PI * 1.4), mx(o.at || 3, h - 4.45, 0, 0, 0, -0.6));
    for (let i = 0; i < 8; i++) P.add(glow('#fc4', 1.2), new THREE.PlaneGeometry(0.3, 0.7), mx(-w / 2 + 2 + i * (w - 4) / 7, h, 1.155, 0, 0, 0.5), 0); for (const s of [-1, 1]) P.box(m.dk, 0.5, 0.5, 3, s * (w / 2 - 0.3), h + 0.5, 0); },
  seatrow(P, o, e) { const m = MM(), n = o.n || 4, f = fab(o.c || 0x2a3a5a); for (let i = 0; i < n; i++) { const x = (i - (n - 1) / 2) * 0.62; P.box(f, 0.54, 0.1, 0.5, x, 0.46, 0); P.box(f, 0.54, 0.6, 0.09, x, 0.82, -0.24); P.box(m.ch, 0.04, 0.1, 0.5, x - 0.29, 0.6, 0); } P.box(m.dk, n * 0.62, 0.06, 0.4, 0, 0.38, 0); for (const s of [-1, 1]) P.box(m.ch, 0.06, 0.38, 0.4, s * (n * 0.31 - 0.1), 0.19, 0); e.rect(n * 0.62, 0.55); },
  tablelong(P, o, e) { const m = MM(), w = o.w || 3.6, top = o.wood ? m.wd : m.st; P.box(top, w, 0.06, 0.85, 0, 0.76, 0); for (const s of [-1, 1]) { P.box(m.dk, 0.08, 0.74, 0.7, s * (w / 2 - 0.3), 0.37, 0); P.box(top, w - 0.2, 0.05, 0.32, 0, 0.45, s * 0.78); P.box(m.dk, 0.06, 0.44, 0.28, w / 2 - 0.4, 0.22, s * 0.78); P.box(m.dk, 0.06, 0.44, 0.28, -w / 2 + 0.4, 0.22, s * 0.78); }
    for (let i = 0; i < 5; i++) P.cyl(i % 2 ? m.wh : flat(0xb8452e, 0.5, 0.1), 0.05, 0.04, 0.1, -w / 2 + 0.5 + i * (w - 1) / 4, 0.84, (i % 2 - 0.5) * 0.3, 'y', 8); e.rect(w, 1.9); },
  toolcart(P, o, e) { const m = MM(), c = flat(o.c || 0xb8252a, 0.5, 0.4); P.box(c, 0.8, 0.75, 0.5, 0, 0.5, 0); for (let i = 0; i < 4; i++) { P.box(m.bk, 0.72, 0.01, 0.02, 0, 0.25 + i * 0.17, 0.255); P.box(m.ch, 0.3, 0.02, 0.03, 0, 0.3 + i * 0.17, 0.265); } P.box(m.st, 0.84, 0.03, 0.54, 0, 0.89, 0); for (const [x, z] of [[-0.3, -0.18], [0.3, -0.18], [-0.3, 0.18], [0.3, 0.18]]) P.cyl(m.bk, 0.06, 0.06, 0.05, x, 0.06, z, 'x', 8); e.col(0.5); },
  floorlamp(P, o, e) { const m = MM(), c = o.c || '#ffd9a0'; P.cyl(m.ch, 0.16, 0.2, 0.03, 0, 0.015, 0, 'y', 14); P.cyl(m.ch, 0.015, 0.015, 1.6, 0, 0.8, 0, 'y', 6); P.add(flat(0xe8dcc8, 0.9, 0), new THREE.CylinderGeometry(0.16, 0.24, 0.34, 16, 1, true), mx(0, 1.72, 0), 0); P.sph(glow(c, 3), 0.07, 0, 1.68, 0, 1, 1.3, 1, 8); e.col(0.22); e.light(c, 10, 1.6, 7); },
  cabinet(P, o, e) { const m = MM(), w = o.w || 1.4, hh = o.h || 2.0; P.box(o.metal ? m.st : m.wd, w, hh, 0.5, 0, hh / 2, 0); P.box(m.bk, 0.012, hh - 0.1, 0.01, 0, hh / 2, 0.252); for (const s of [-1, 1]) P.box(m.ch, 0.02, 0.2, 0.03, s * 0.07, hh * 0.52, 0.265); e.rect(w, 0.5); },
  piano(P, o, e) { const b = flat(0x08080a, 0.08, 0.6), m = MM(); P.box(b, 1.5, 0.3, 1.9, 0, 0.85, -0.2); P.box(b, 1.5, 0.12, 0.5, 0, 0.72, 0.95); P.box(flat(0xf2f2ee, 0.3, 0), 1.3, 0.03, 0.16, 0, 0.8, 1.0); for (let i = 0; i < 10; i++) P.box(b, 0.05, 0.02, 0.1, -0.56 + i * 0.125, 0.825, 0.97); P.add(b, new THREE.BoxGeometry(1.45, 0.03, 1.8), mx(0.1, 1.3, -0.25, 0, 0, 0.5)); P.box(m.gd, 0.02, 0.7, 0.02, 0.4, 1.2, 0.2); for (const [x, z] of [[-0.6, 0.9], [0.6, 0.9], [0, -1.0]]) P.cyl(b, 0.05, 0.04, 0.72, x, 0.36, z, 'y', 8);
    P.box(fab(0x2a2a2e), 0.7, 0.1, 0.36, 0, 0.5, 1.6); P.box(b, 0.6, 0.48, 0.3, 0, 0.24, 1.6); e.rect(1.6, 2.1, 0, -0.1); e.col(0.4, 0, 1.6); if (o.use !== false) e.use('ピアノを弾く', 'piano', 2.4); },
  pooltable(P, o, e) { const m = MM(); P.box(m.wd, 2.6, 0.25, 1.4, 0, 0.75, 0); P.box(flat(0x1a6a3a, 0.95, 0), 2.36, 0.02, 1.16, 0, 0.885, 0); for (const [x, z] of [[-1.1, -0.5], [1.1, -0.5], [-1.1, 0.5], [1.1, 0.5]]) P.box(m.wd, 0.16, 0.65, 0.16, x, 0.32, z); for (let i = 0; i < 7; i++) P.sph(glow(['#fd4', '#f43', '#4cf', '#fff', '#6f6', '#f6a', '#fa4'][i], 0.9), 0.035, -0.6 + (i % 4) * 0.42, 0.93, -0.3 + Math.floor(i / 4) * 0.5 + (i % 2) * 0.1, 1, 1, 1, 8);
    P.add(MM().dk, new THREE.BoxGeometry(1.6, 0.06, 0.5), mx(0, e.room.h > 4 ? 2.3 : e.room.h - 0.4, 0)); P.add(glow('#d8ffd0', 3), new THREE.PlaneGeometry(1.4, 0.36).rotateX(HP), mx(0, (e.room.h > 4 ? 2.3 : e.room.h - 0.4) - 0.035, 0), 0); e.rect(2.6, 1.4); e.light('#d8ffd0', 9, 2, 5); },
};
