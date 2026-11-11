// 惑星地表の環境: 地球 (earth.js) / 溶岩 / 砂漠 / 氷 / ガス巨星の雲海デッキ
import * as THREE from 'three';
import { Builder, mx, rockGeo } from '../gfx/builder.js';
import { mat, glow, texSet, signMesh, screenMat } from '../gfx/textures.js';
import { rng, rr, fbm, ridge, smooth, clamp, pick } from '../core/util.js';
import { fxTime, makeGlowSprite } from '../gfx/fx.js';
import { BASES } from './defs.js';
import { HP, V3, COL, N2, makeSky, gridTerrain, scatter, pad, node, beacon, forest, colorGeo, VegField, propGeo, craters, landmarks, scatterAt } from './surfkit.js';
import { terra } from './earth.js';

// ───────────────────────── 殺風景な場所をなくすための共通部品 ─────────────────────────
const pickPts = (r, n, r0, r1, ok) => { const L = []; for (let i = 0; i < n * 8 && L.length < n; i++) { const a = r() * 6.28, d = Math.sqrt(rr(r, (r0 / r1) ** 2, 1)) * r1, x = Math.cos(a) * d, z = Math.sin(a) * d; if (ok(x, z)) L.push([x, z]); } return L; };
const glowMat = (c, e = 1.4) => { const m = new THREE.MeshStandardMaterial({ color: COL(c).multiplyScalar(0.45), emissive: COL(c), emissiveIntensity: e, roughness: 0.18, metalness: 0.15 }); m.userData.uvs = 0; return m; };
const VCM = () => new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.75, metalness: 0.4 });
/** 尖塔・アーチ・台地 (上に着陸できる)・巨大結晶を全域に配置する */
function strew(env, r, hA, o) {
  const free = (x, z) => o.free(x, z, hA(x, z)), { spire, arch, butte, crys } = o;
  if (spire) for (const [gn, n] of [['spire', Math.round(spire.n * 0.6)], ['spire2', Math.round(spire.n * 0.4)]]) landmarks(env, propGeo(gn), spire.m, pickPts(r, n, spire.r0 || 140, 6900, (x, z) => free(x, z) && fbm(x * 0.0011, z * 0.0011, 2, 31) > (spire.clump ?? 0.4)).map(([x, z]) => { const hh = (spire.h0 || 5) + Math.pow(r(), 2.4) * (spire.h1 || 60), w = hh * rr(r, 0.7, 1.3); return [x, hA(x, z) - hh * 0.07, z, w, hh, r() * 6.28, rr(r, -0.16, 0.16)]; }), { solid: 0.2 });
  if (arch) landmarks(env, propGeo('arch'), arch.m, pickPts(r, arch.n, 180, 6800, free).map(([x, z]) => { const w = 14 + Math.pow(r(), 1.8) * (arch.w || 70), ry = r() * 6.28, c = Math.cos(ry) * w * 0.5, s2 = -Math.sin(ry) * w * 0.5, y = Math.min(hA(x + c, z + s2), hA(x - c, z - s2)) - w * 0.1; env.cols.push({ x: x + c, z: z + s2, r: w * 0.14 }, { x: x - c, z: z - s2, r: w * 0.14 }); return [x, y, z, w, w * rr(r, 0.8, 1.4), ry, 0]; }), {});
  if (butte) landmarks(env, propGeo('butte'), butte.m, pickPts(r, butte.n, 420, 6800, free).map(([x, z]) => { const w = 40 + r() * (butte.w || 130), hh = 26 + r() * (butte.h || 90); return [x, hA(x, z) - hh * 0.12, z, w, hh, r() * 6.28, 0]; }), { solid: 0.4, land: 1 });
  if (crys) landmarks(env, propGeo('crystal'), crys.m, pickPts(r, crys.n, 120, 6800, free).map(([x, z]) => { const hh = 4 + Math.pow(r(), 2) * (crys.h || 22); return [x, hA(x, z) - hh * 0.03, z, hh * rr(r, 0.8, 1.3), hh, r() * 6.28, rr(r, -0.12, 0.12)]; }), { solid: 0.12, shadow: false });
}
/** 足元を埋める岩場 (中型) と小石の層。dens(x,z,h,v,out) → out=[密度, 種類] */
function groundCover(grp, hA, sets, dens, o = {}) {
  const big = new VegField(grp, scatterAt(hA, dens, o.s0 ?? 0.5, o.s1 ?? 5.5), { sets, tile: 260, step: o.step ?? 15, range: o.range ?? 520, solid: 0.8 });
  const small = new VegField(grp, scatterAt(hA, (x, z, h, v, d) => { dens(x, z, h, v, d); d[0] = d[0] > 0 ? Math.min(0.75, d[0] * 1.6 + 0.2) : 0; }, 0.1, 0.55), { sets, tile: 84, step: 4.2, range: 118 });
  return [big, small];
}
/** 墜落した輸送船の残骸 (全長 1 の単位形状) */
const wreckGeo = () => colorGeo([[new THREE.CylinderGeometry(0.16, 0.2, 1, 10).rotateZ(HP), 0x4a4640, mx(0, 0.1, 0, 0, 0, 0.12)], [new THREE.BoxGeometry(0.5, 0.03, 0.34), 0x5a3a2a, mx(0.1, 0.12, 0.26, 0.5, 0, 0.1)], [new THREE.BoxGeometry(0.24, 0.3, 0.03), 0x3a3836, mx(-0.38, 0.26, 0, 0, 0, -0.4)], [new THREE.CylinderGeometry(0.12, 0.09, 0.2, 8).rotateZ(HP), 0x2a2a2e, mx(-0.56, 0.12, 0, 0, 0, 0.12)], [new THREE.BoxGeometry(0.2, 0.05, 0.5), 0x4a4640, mx(0.3, 0.03, -0.3, 0.2, 0.4, 0)], [new THREE.BoxGeometry(0.1, 0.1, 0.1), 0x6a4a38, mx(0.52, 0.02, 0.2, 0.4, 0.6, 0.3)]]);
/** 観測マスト (高さ 1) */
const mastGeo = () => colorGeo([[new THREE.CylinderGeometry(0.008, 0.014, 1, 6).translate(0, 0.5, 0), 0x8a9098], [new THREE.BoxGeometry(0.09, 0.07, 0.09).translate(0, 0.035, 0), 0x4a5058], [new THREE.CylinderGeometry(0.05, 0.05, 0.012, 10).translate(0, 0.62, 0), 0x9aa0a8], [new THREE.CylinderGeometry(0.035, 0.035, 0.012, 10).translate(0, 0.78, 0), 0x9aa0a8], [new THREE.BoxGeometry(0.13, 0.004, 0.06).translate(0.05, 0.4, 0).rotateZ(0.5), 0x1a2a4a]]);

// ───────────────────────── 溶岩の星 ─────────────────────────
const LAVA_FS = /* glsl */`
precision highp float;uniform float uTime;varying vec3 vW;
${N2}
void main(){vec2 p=vW.xz*.02;float n=fbm2(p+vec2(uTime*.02,0.)+fbm2(p*2.-uTime*.03)*1.2);float c=smoothstep(.35,.75,n);
  vec3 col=mix(vec3(.5,.04,0.),vec3(4.,1.1,.12),c)+vec3(6.,4.,1.5)*pow(c,6.);float crust=smoothstep(.42,.3,n);col=mix(col,vec3(.03,.02,.02),crust*.9);
  float d=length(vW-cameraPosition);col=mix(col,vec3(.16,.04,.02),1.-exp(-d*d*2.5e-7));gl_FragColor=vec4(col,1.);}`;
function ignis() {
  const r = rng(303), grp = new THREE.Group(), B = new Builder(), anim = [], cols = [], rects = [], items = [], beacons = [], sunDir = V3(0.4, 0.22, -0.6).normalize();
  const sky = makeSky({ sun: sunDir, zen: '#0a0302', hor: '#5a1608', ground: '#1a0502', sunCol: '#ff5a1e', cloudCol: '#3a1810', cloud: 0.7, stars: 0.2, haze: 1.2, sunSize: 0.9988 });
  const H0 = (x, z) => { const d = Math.hypot(x, z), flat = smooth(70, 240, d), riv = Math.abs(fbm(x * 0.0016 + 3, z * 0.0016, 4, 11) - 0.5), base = fbm(x * 0.0012, z * 0.0012, 5, 2) * 90 + ridge(x * 0.004, z * 0.004, 4, 5) * 34;
    const vol = Math.exp(-((x + 2600) ** 2 + (z + 1900) ** 2) / 1.3e6) * 1150 - Math.exp(-((x + 2600) ** 2 + (z + 1900) ** 2) / 6e4) * 330;
    return (base - smooth(0.085, 0.0, riv) * 70 - 18) * flat + 8 * (1 - flat) + vol; };
  // 起伏を強める: クレーター群 (底は溶岩湖)・鋸歯状の尾根・側火山
  const CONES = [[2900, 1800, 520, 430], [-900, 3700, 430, 340], [3900, -2700, 620, 540], [-4400, 900, 470, 390], [800, -4600, 560, 470]];
  const H = (x, z) => { const far = smooth(260, 800, Math.hypot(x, z)); let h = H0(x, z) + far * (craters(x, z, 1150, 3, 62, 0.42) + ridge(x * 0.0021, z * 0.0021, 3, 41) * 50 * smooth(0.42, 0.7, fbm(x * 0.0006, z * 0.0006, 2, 43)));
    for (const c of CONES) { const q = ((x - c[0]) ** 2 + (z - c[1]) ** 2) / (c[2] * c[2]); if (q < 9) h += c[3] * Math.exp(-q) - c[3] * 0.4 * Math.exp(-q * 22); } return h; };
  { const tm = gridTerrain(H, (x, z, h, sl, c) => { const n = fbm(x * 0.01, z * 0.01, 3, 8), hot = smooth(6, -6, h); c[0] = 0.05 + n * 0.05 + hot * 0.5 + sl * 0.03; c[1] = 0.04 + n * 0.035 + hot * 0.08; c[2] = 0.04 + n * 0.03; }, { size: 15000, seg: 250, rough: 0.75, metal: 0.25, ns: 1.8, env: 0.8 }); grp.add(tm); var TM = tm; }
  const lava = new THREE.Mesh(new THREE.PlaneGeometry(26000, 26000).rotateX(-HP), new THREE.ShaderMaterial({ uniforms: { uTime: fxTime }, vertexShader: 'varying vec3 vW;void main(){vec4 w=modelMatrix*vec4(position,1.);vW=w.xyz;gl_Position=projectionMatrix*viewMatrix*w;}', fragmentShader: LAVA_FS })); lava.position.y = -4; grp.add(lava);
  const RK = mat('rock', { color: 0x2a2220, rough: 0.8, metal: 0.2, uvs: 0, ns: 1.5 });
  grp.add(scatter(rockGeo(1, 2, 5, 0.45), RK, 420, (o) => { const a = r() * 6.28, d = rr(r, 90, 2600), x = Math.cos(a) * d, z = Math.sin(a) * d, h = H(x, z); if (h < 0) return false; const s = Math.pow(r(), 3) * 16 + 1.2; o.position.set(x, h - s * 0.3, z); o.rotation.set(r() * 6, r() * 6, r() * 6); o.scale.set(s, s * rr(r, 0.7, 1.6), s); if (s > 3 && d < 700) cols.push({ x, z, r: s * 0.8 }); }));
  // 精錬基地
  const D = mat('hull', { color: 0x3a3430, rough: 0.8, metal: 0.6 }), RB = mat('rib', { color: 0x7a5a48, metal: 0.5 }), W = mat('wall', { color: 0x6a5648, rough: 0.7, metal: 0.5 }), G = glow('#ff6a1e', 4);
  pad(B, 8.1, 32, '#ff8a2a');
  B.box(W, 34, 12, 22, 70, 14, -10); B.box(D, 36, 1.4, 24, 70, 20.6, -10); B.box(glow('#ffc890', 2), 0.3, 4, 14, 52.9, 13, -10); B.box(D, 2, 4.4, 5, 52.5, 10.2, -10); B.box(G, 34.2, 0.4, 22.2, 70, 19, -10);
  for (const [x, z, h] of [[82, -34, 46], [92, -30, 60], [74, -40, 34]]) { B.cyl(RB, 3, 4.5, h, x, 8 + h / 2, z, 'y', 14); B.cyl(G, 3.1, 3.1, 0.8, x, 8 + h - 1, z, 'y', 14, true); beacon(beacons, x, 8 + h + 2, z, '#ff8a2a', 16); }
  for (let i = 0; i < 4; i++) { B.sph(RB, 7, 100, 15, -2 + i * 15, 1, 1, 1, 18); B.cyl(D, 0.6, 0.6, 15, 100, 11, 6 + i * 15 - 8, 'z', 8); }
  B.box(D, 60, 8.2, 40, 76, 4, -4); rects.push([52, -22, 108, 52]); items.push({ x: 51, z: -10, r: 5, label: '精錬管制室に入る', act: 'outpost' });
  const s1 = signMesh('フォージ採掘基地', '#ff8a2a', 3.2, { double: true, intensity: 3 }); s1.position.set(52.6, 17.4, -10); s1.rotation.y = -HP; grp.add(s1);
  const nodes = []; for (let i = 0; i < 7; i++) { const a = i * 0.9 + 0.2, d = 110 + (i % 3) * 60; let x = Math.cos(a) * d - 30, z = Math.sin(a) * d; const n = node('#ff5a1e', 1.2, 60 + i); n.position.set(x, Math.max(H(x, z), -3), z); grp.add(n); nodes.push({ g: n, x, z, item: 'magma', label: 'マグマ晶を採取する' }); }
  // ── 全域を埋める: 黒曜石の尖塔・玄武岩のアーチと台地・マグマ結晶・噴気孔・放棄された採掘リグ・残骸 + 足元の岩場 ──
  const obbs = [], hA = TM.heightAt, env2 = { grp, obbs, cols }, OB = mat('rock', { color: 0x4a4450, rough: 0.28, metal: 0.6, uvs: 0, ns: 1.6 }).clone(), RK2 = mat('rock', { color: 0x7a5a4a, rough: 0.85, metal: 0.15, uvs: 0, ns: 1.4 }).clone(), MC = glowMat('#ff5a1e', 1.5); OB.emissive.set(0x5a1c0c); OB.emissiveIntensity = 0.55; RK2.emissive.set(0x4a1808); RK2.emissiveIntensity = 0.5; // 溶岩の照り返しで岩の形が読めるように // 暗い大地でも輪郭が分かる明るさにする
  const inBase = (x, z) => Math.hypot(x, z) < 125 || (x > 44 && x < 116 && z > -48 && z < 60);
  strew(env2, r, hA, { free: (x, z, h) => h > 1.5 && !inBase(x, z), spire: { n: 320, m: OB, h1: 66 }, arch: { n: 46, m: RK2, w: 80 }, butte: { n: 40, m: RK2 }, crys: { n: 70, m: MC } });
  for (const c of CONES) { const y = H(c[0], c[1]); B.cyl(G, c[2] * 0.17, c[2] * 0.17, 3, c[0], y + 4, c[1], 'y', 20); beacon(beacons, c[0], y + 30, c[1], '#ff6a1e', c[2] * 0.5); }
  for (const [x, z] of pickPts(r, 26, 200, 6000, (x, z) => hA(x, z) > 2 && !inBase(x, z))) { const y = hA(x, z), s = rr(r, 1, 2.6); B.cyl(RK, 1.2 * s, 3.6 * s, 4 * s, x, y + 1.6 * s, z, 'y', 10); B.cyl(G, 1.05 * s, 1.05 * s, 0.4, x, y + 3.62 * s, z, 'y', 10); beacon(beacons, x, y + 5 * s, z, '#ff7a2a', 10 * s); cols.push({ x, z, r: 3 * s }); }
  for (const [x, z] of pickPts(r, 8, 500, 5200, (x, z) => hA(x, z) > 4 && !inBase(x, z))) { const y = hA(x, z); B.box(D, 14, 2, 14, x, y + 1, z); for (const [dx, dz] of [[-5, -5], [5, -5], [-5, 5], [5, 5]]) B.box(RB, 0.9, 44, 0.9, x + dx * 0.55, y + 22, z + dz * 0.55, 0, dz * 0.022, -dx * 0.022); B.box(RB, 5, 1.2, 5, x, y + 44, z); B.cyl(D, 0.5, 0.5, 40, x, y + 20, z, 'y', 8); B.sph(RB, 5, x + 13, y + 5, z + 4, 1, 1, 1, 14); B.cyl(D, 0.5, 0.5, 14, x + 7, y + 4, z + 2, 'x', 8); beacon(beacons, x, y + 46, z, '#f33', 12, 0.5); obbs.push([x, z, 8, 8, 1, 0, y + 45, 1]); }
  landmarks(env2, wreckGeo(), VCM(), pickPts(r, 7, 400, 6000, (x, z) => hA(x, z) > 3 && !inBase(x, z)).map(([x, z]) => { const L = rr(r, 60, 130); return [x, hA(x, z) - L * 0.03, z, L, L, r() * 6.28, rr(r, -0.1, 0.1)]; }), { solid: 0.18 });
  const veg = groundCover(grp, hA, [{ g: propGeo('boulder'), m: OB, tumble: 1, sink: 0.3, key: 'a' }, { g: propGeo('boulder2'), m: RK2, tumble: 1, sink: 0.25, key: 'b' }, { g: propGeo('slab'), m: RK2, tumble: 0.12, sink: 0.3, key: 'c' }, { g: propGeo('crystal'), m: MC, sink: 0.03, key: 'd' }],
    (x, z, h, v, d) => { d[0] = h < 0.6 || Math.hypot(x, z) < 46 || (x > 46 && x < 114 && z > -46 && z < 58) ? 0 : 0.22 + 0.5 * smooth(0.35, 0.7, fbm(x * 0.006, z * 0.006, 2, 15)); d[1] = v < 0.34 ? 0 : v < 0.62 ? 1 : v < 0.82 ? 2 : 3; }, { s1: 7 }); // 暗い大地なので発光する結晶を多めに
  grp.add(B.build());
  return { id: 'ignis', group: grp, sky, H, heightAt: TM.heightAt, sunDir, sunCol: '#ff7a40', sunInt: 2.8, hemi: ['#8a3a20', '#5a1808', 2.0], fog: [COL('#2c0c06'), 0.00038], cols, rects, obbs, veg, items, anim, beacons, nodes, padY: 8.2, rain: [V3(3, 9, 1), 0.5, '#ff8a4a'], walkR: 3000, door: [49, -10, -HP], foot: [0, 40], look: [0.7, 0.95, 1.3], heat: 0.12, music: 'hostile', smoke: [-2600, 760, -1900], hazard: (x, z, h) => h < -2.5 };
}

// ───────────────────────── 砂漠の星 ─────────────────────────
function sahar() {
  const r = rng(404), grp = new THREE.Group(), B = new Builder(), anim = [], cols = [], rects = [], items = [], beacons = [], sunDir = V3(0.5, 0.52, 0.4).normalize();
  const sky = makeSky({ sun: sunDir, zen: '#3a6aa8', hor: '#e8b888', ground: '#b88a5a', sunCol: '#fff0d0', cloudCol: '#f4dcc0', cloud: 0.28, stars: 0, haze: 0.5, sunSize: 0.9994 });
  const H0 = (x, z) => { const d = Math.hypot(x, z), flat = smooth(60, 260, d), dune = Math.pow(Math.abs(Math.sin(x * 0.006 + fbm(x * 0.001, z * 0.001, 3, 4) * 6) ), 1.6) * 26 + fbm(x * 0.0007, z * 0.0007, 4, 9) * 60;
    const mesa = smooth(0.56, 0.62, fbm(x * 0.0006 + 9, z * 0.0006, 4, 21)) * (230 + fbm(x * 0.004, z * 0.004, 3, 2) * 50) * smooth(500, 1100, d);
    return (dune + mesa) * flat; };
  // 起伏を強める: 蛇行する峡谷・風食の畝 (ヤルダン)・クレーター・遠方ほど高い砂丘
  const H = (x, z) => { const far = smooth(300, 900, Math.hypot(x, z)); return H0(x, z) + far * (craters(x, z, 1500, 5, 44, 0.3) - smooth(0.05, 0, Math.abs(fbm(x * 0.00045 + 7, z * 0.00045, 3, 55) - 0.5)) * 115 + ridge(x * 0.0032, z * 0.0009, 3, 61) * 30 + Math.pow(Math.abs(Math.sin(x * 0.0023 + z * 0.0011 + fbm(x * 0.0008, z * 0.0008, 2, 63) * 5)), 2) * 34); };
  { const tm = gridTerrain(H, (x, z, h, sl, c) => { const n = fbm(x * 0.008, z * 0.008, 3, 6), rock = smooth(0.35, 0.9, sl) + smooth(120, 200, h) * 0.5; c[0] = 0.62 + n * 0.16 - rock * 0.3; c[1] = 0.36 + n * 0.1 - rock * 0.2; c[2] = 0.17 + n * 0.05 - rock * 0.07; if (h > 150 && sl < 0.3) { c[0] *= 0.8; c[1] *= 0.72; c[2] *= 0.7; } }, { size: 15000, seg: 250, rough: 1, ns: 0.8, uv: 0.06 }); grp.add(tm); var TM = tm; }
  const RK = mat('rock', { color: 0xb07048, rough: 1, metal: 0, uvs: 0 });
  grp.add(scatter(rockGeo(1, 2, 9, 0.4), RK, 360, (o) => { const a = r() * 6.28, d = rr(r, 80, 2400), x = Math.cos(a) * d, z = Math.sin(a) * d, s = Math.pow(r(), 3) * 12 + 0.8; o.position.set(x, H(x, z) - s * 0.3, z); o.rotation.set(r() * 6, r() * 6, r() * 6); o.scale.set(s, s * rr(r, 0.6, 1.8), s); if (s > 3 && d < 700) cols.push({ x, z, r: s * 0.8 }); }));
  // オアシス・コロニー (ドーム群)
  const Wt = mat('flat', { color: 0xeee4d0, rough: 0.6, metal: 0.05 }), D = mat('hull', { color: 0x6a5a48, rough: 0.8, metal: 0.4 }), S = mat('solar', { metal: 0.9, env: 1.6 }), GL = new THREE.MeshStandardMaterial({ color: 0x9fe0d0, transparent: true, opacity: 0.28, roughness: 0.05, metalness: 0.2, emissive: 0x3a8a6a, emissiveIntensity: 0.6, side: THREE.DoubleSide }); GL.userData.uvs = 0;
  pad(B, 0.1, 32, '#ffcf6a');
  B.add(GL, new THREE.SphereGeometry(22, 32, 16, 0, 6.2832, 0, HP), mx(80, 0, 0), 0); B.cyl(Wt, 22.6, 23.4, 3, 80, 1.5, 0, 'y', 32);
  for (let i = 0; i < 8; i++) B.add(Wt, new THREE.TorusGeometry(22.1, 0.25, 6, 24, Math.PI), mx(80, 0, 0, 0, i * Math.PI / 8, 0), 0);
  for (let i = 0; i < 9; i++) { const a = i * 0.7; B.add(mat('flat', { color: 0x2c7a31, rough: 0.9, metal: 0 }), rockGeo(rr(r, 2.4, 4.2), 1, i, 0.4), mx(80 + Math.cos(a) * rr(r, 3, 14), rr(r, 3, 8), Math.sin(a) * rr(r, 3, 14)), 0); }
  B.add(GL, new THREE.SphereGeometry(11, 24, 12, 0, 6.2832, 0, HP), mx(108, 0, 26), 0); B.cyl(Wt, 11.4, 12, 2.4, 108, 1.2, 26, 'y', 24); B.add(GL, new THREE.SphereGeometry(9, 24, 12, 0, 6.2832, 0, HP), mx(104, 0, -26), 0); B.cyl(Wt, 9.4, 10, 2.4, 104, 1.2, -26, 'y', 24);
  B.cyl(Wt, 3.4, 3.4, 4.6, 56, 2.3, 0, 'x', 16); B.box(D, 0.5, 4, 3, 54.2, 2, 0); B.box(glow('#ffcf6a', 3), 0.2, 0.3, 3.2, 54.1, 4.2, 0);
  for (let i = 0; i < 6; i++) { B.box(S, 9, 0.2, 5, 60 + (i % 3) * 11, 3.2, 44 + Math.floor(i / 3) * 8, 0, -0.5); B.cyl(D, 0.15, 0.15, 3, 60 + (i % 3) * 11, 1.5, 44 + Math.floor(i / 3) * 8, 'y', 6); }
  B.cyl(D, 0.3, 0.5, 34, 120, 17, -4, 'y', 8); beacon(beacons, 120, 35, -4, '#f33', 12, 0.6);
  cols.push({ x: 80, z: 0, r: 23.5 }, { x: 108, z: 26, r: 12 }, { x: 104, z: -26, r: 10 }); rects.push([56, 40, 90, 56]); items.push({ x: 53, z: 0, r: 5, label: 'コロニーのドームに入る', act: 'outpost' });
  const s1 = signMesh('オアシス・コロニー', '#ffcf6a', 2.6, { double: true, intensity: 2.6 }); s1.position.set(54, 6.6, 0); s1.rotation.y = -HP; grp.add(s1);
  const nodes = []; for (let i = 0; i < 7; i++) { const a = i * 0.9 + 1.2, d = 100 + (i % 3) * 70, x = Math.cos(a) * d - 30, z = Math.sin(a) * d, n = node('#ffb347', 1, 80 + i); n.position.set(x, H(x, z), z); grp.add(n); nodes.push({ g: n, x, z, item: 'spice', label: '砂漠香料を採取する' }); }
  // ── 全域を埋める: 奇岩の尖塔・天然のアーチ・卓状台地・ピラミッドと列柱・巨獣の骨・残骸・集水塔・オアシス + 足元の岩とサボテンと枯れ草 ──
  const obbs = [], tiles = [], hA = TM.heightAt, env2 = { grp, obbs, cols }, SS = mat('rock', { color: 0xc8845a, rough: 1, metal: 0, uvs: 0 }), SS2 = mat('rock', { color: 0xd8a070, rough: 0.95, metal: 0, uvs: 0.02 }), BONE = mat('flat', { color: 0xe8dcc4, rough: 0.7, metal: 0 });
  const inBase = (x, z) => Math.hypot(x, z) < 130 || (x > 40 && x < 130 && z > -46 && z < 66);
  strew(env2, r, hA, { free: (x, z) => !inBase(x, z), spire: { n: 280, m: SS, h1: 46, clump: 0.38 }, arch: { n: 54, m: SS, w: 76 }, butte: { n: 50, m: SS2, w: 170, h: 110 } });
  const PYR = [[-3100, -2400, 300, 190], [-3520, -2050, 190, 120], [3600, 2900, 260, 165]], pg = new THREE.ConeGeometry(0.7071, 1, 4, 1).rotateY(Math.PI / 4).translate(0, 0.5, 0);
  landmarks(env2, pg, SS2, PYR.map(([x, z, w, hh]) => [x, hA(x, z) - 6, z, w, hh, 0.2, 0]), { solid: 0.3 });
  { const cg = new THREE.CylinderGeometry(0.07, 0.085, 1, 10).translate(0, 0.5, 0), L = []; for (const [px, pz, w] of PYR) for (let i = 0; i < 26; i++) { const a = r() * 6.28, d = w * (0.75 + r() * 0.9), x = px + Math.cos(a) * d, z = pz + Math.sin(a) * d, hh = rr(r, 8, 26); L.push([x, hA(x, z) - 1, z, hh, hh * (r() < 0.4 ? 0.45 : 1), 0, r() < 0.2 ? rr(r, 0.3, 1.2) : 0]); cols.push({ x, z, r: hh * 0.09 }); } landmarks(env2, cg, SS2, L, {}); for (const [px, pz, w, hh] of PYR) beacon(beacons, px, hA(px, pz) + hh, pz, '#ffcf6a', 30); }
  for (const [x, z] of pickPts(r, 10, 300, 6200, (x, z) => !inBase(x, z))) { const y = hA(x, z), ry = r() * 6.28, R0 = rr(r, 14, 30), c = Math.cos(ry), s2 = Math.sin(ry); // 巨獣の骨: 背骨と肋骨
    for (let i = 0; i < 9; i++) { const R = R0 * (1 - Math.abs(i - 3.5) * 0.11), o2 = (i - 4) * R0 * 0.36; B.add(BONE, new THREE.TorusGeometry(R, R * 0.06, 6, 14, Math.PI), mx(x + c * o2, y - R * 0.12, z - s2 * o2, 0, ry + HP, 0), 0); }
    B.add(BONE, new THREE.CylinderGeometry(R0 * 0.07, R0 * 0.05, R0 * 3.4, 8).rotateZ(HP), mx(x, y + R0 * 0.86, z, 0, ry, 0), 0); B.add(BONE, rockGeo(R0 * 0.34, 1, 9, 0.25), mx(x + c * R0 * 1.95, y + R0 * 0.6, z - s2 * R0 * 1.95, 0, ry, 0, 1.5, 0.8, 0.9), 0); cols.push({ x, z, r: R0 * 0.3 }); }
  landmarks(env2, wreckGeo(), VCM(), pickPts(r, 8, 400, 6200, (x, z) => !inBase(x, z)).map(([x, z]) => { const L = rr(r, 60, 140); return [x, hA(x, z) - L * 0.04, z, L, L, r() * 6.28, rr(r, -0.12, 0.12)]; }), { solid: 0.18 });
  { const pts = pickPts(r, 22, 170, 4200, (x, z) => !inBase(x, z)); landmarks(env2, mastGeo(), VCM(), pts.map(([x, z]) => [x, hA(x, z), z, 26, 26, r() * 6.28, 0]), { shadow: true }); pts.forEach(([x, z], i) => { cols.push({ x, z, r: 1.4 }); if (i % 2 === 0) beacon(beacons, x, hA(x, z) + 26.6, z, i % 4 ? '#ffcf6a' : '#f33', 7, i % 4 ? 0 : 0.7); }); }
  { const WAT = mat('flat', { color: 0x1c5a6a, rough: 0.06, metal: 0.4, env: 2 }), palms = []; for (const [x, z] of pickPts(r, 7, 500, 5600, (x, z) => !inBase(x, z) && Math.abs(hA(x + 30, z) - hA(x - 30, z)) < 14)) { const y = hA(x, z); B.cyl(WAT, 30, 30, 0.5, x, y + 0.45, z, 'y', 28); for (let i = 0; i < 26; i++) { const a = r() * 6.28, d = rr(r, 30, 62), px = x + Math.cos(a) * d, pz = z + Math.sin(a) * d; palms.push([px, hA(px, pz) - 0.3, pz, 9 + r() * 6, 7 + r() * 3]); cols.push({ x: px, z: pz, r: 0.6 }); } beacon(beacons, x, y + 2, z, '#6fe8ff', 16); } tiles.push(...forest(grp, palms, 'palm', 1200, 5200)); }
  const cactus = colorGeo([[new THREE.CylinderGeometry(0.09, 0.11, 1, 8).translate(0, 0.5, 0), 0x3f7a3a], [new THREE.SphereGeometry(0.09, 8, 6).translate(0, 1, 0), 0x4a8a42], [new THREE.CylinderGeometry(0.055, 0.055, 0.26, 6).rotateZ(HP).translate(0.2, 0.46, 0), 0x3f7a3a], [new THREE.CylinderGeometry(0.055, 0.06, 0.32, 6).translate(0.33, 0.6, 0), 0x3f7a3a], [new THREE.SphereGeometry(0.055, 6, 5).translate(0.33, 0.76, 0), 0x4a8a42], [new THREE.CylinderGeometry(0.05, 0.05, 0.22, 6).rotateZ(HP).translate(-0.18, 0.62, 0), 0x3f7a3a], [new THREE.CylinderGeometry(0.05, 0.055, 0.24, 6).translate(-0.29, 0.72, 0), 0x3f7a3a]]);
  const veg = groundCover(grp, hA, [{ g: propGeo('boulder'), m: SS, tumble: 1, sink: 0.3, key: 'a' }, { g: propGeo('boulder2'), m: SS2, tumble: 1, sink: 0.25, key: 'b' }, { g: propGeo('slab'), m: SS, tumble: 0.12, sink: 0.3, key: 'c' }, { g: cactus, m: new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.8, metalness: 0 }), key: 'v' }],
    (x, z, h, v, d) => { d[0] = Math.hypot(x, z) < 50 || (x > 44 && x < 126 && z > -42 && z < 62) ? 0 : 0.07 + 0.36 * smooth(0.38, 0.72, fbm(x * 0.006, z * 0.006, 2, 15)); d[1] = v < 0.34 ? 0 : v < 0.58 ? 1 : v < 0.76 ? 2 : 3; });
  veg.push(new VegField(grp, (x, z, u, v, o) => { if (u > 0.2 || Math.hypot(x, z) < 50 || (x > 44 && x < 126 && z > -42 && z < 62)) return false; o[0] = 5; o[1] = 0.6 + v * 1.4; o[2] = 1 + v * 2.2; o[3] = hA(x, z) - 0.08; return true; }, { tile: 140, step: 7, range: 240, tint: [1.7, 1.3, 0.55], sway: 0.02 }));
  grp.add(B.build());
  return { id: 'sahar', group: grp, sky, H, heightAt: TM.heightAt, sunDir, sunCol: '#fff2dc', sunInt: 4.2, hemi: ['#9ab8e0', '#a87a4a', 1.0], fog: [COL('#d8b088'), 0.00022], cols, rects, obbs, tiles, veg, items, anim, beacons, nodes, padY: 0.2, rain: [V3(34, -1, 9), 0.35, '#f0d0a0'], walkR: 3000, door: [51, 0, -HP], foot: [0, 40], look: [0.5, 1.05, 1.0], music: 'surface' };
}

// ───────────────────────── 氷の星 ─────────────────────────
function glacies() {
  const r = rng(505), grp = new THREE.Group(), B = new Builder(), anim = [], cols = [], rects = [], items = [], beacons = [], sunDir = V3(-0.5, 0.1, -0.8).normalize();
  const sky = makeSky({ sun: sunDir, zen: '#01040e', hor: '#0e2a4a', ground: '#0a1420', sunCol: '#9fc8ff', cloudCol: '#5a7a9a', cloud: 0.2, stars: 1.6, aurora: 1.5, haze: 0.5, sunSize: 0.9997 });
  const H0 = (x, z) => { const d = Math.hypot(x, z), flat = smooth(60, 240, d), cr = Math.abs(fbm(x * 0.002 + 5, z * 0.002, 4, 13) - 0.5); return (fbm(x * 0.0009, z * 0.0009, 5, 7) * 110 + ridge(x * 0.003, z * 0.003, 4, 3) * 60 - smooth(0.03, 0.0, cr) * 46 + ridge(x * 0.0004, z * 0.0004, 3, 17) * 420 * smooth(1200, 3200, d)) * flat; };
  // 起伏を強める: 氷のクレーター・氷脈 (圧力で盛り上がった畝)・深い裂け目
  const H = (x, z) => { const far = smooth(280, 850, Math.hypot(x, z)); return H0(x, z) + far * (craters(x, z, 1300, 9, 52, 0.36) + ridge(x * 0.0045, z * 0.0013, 3, 71) * 36 - smooth(0.04, 0, Math.abs(fbm(x * 0.0007 + 2, z * 0.0007, 3, 73) - 0.5)) * 90); };
  { const tm = gridTerrain(H, (x, z, h, sl, c) => { const n = fbm(x * 0.006, z * 0.006, 3, 4), deep = smooth(0.2, 0.9, sl); c[0] = 0.62 + n * 0.2 - deep * 0.42; c[1] = 0.74 + n * 0.16 - deep * 0.3; c[2] = 0.86 + n * 0.1 - deep * 0.08; }, { size: 15000, seg: 250, rough: 0.38, metal: 0.1, ns: 0.9, env: 1.6, uv: 0.03 }); grp.add(tm); var TM = tm; }
  const ICE = new THREE.MeshStandardMaterial({ color: 0xbfe6ff, emissive: 0x16486a, emissiveIntensity: 0.35, roughness: 0.12, metalness: 0.05, normalMap: texSet('rock').normalMap, envMapIntensity: 1.4 }); ICE.normalScale.setScalar(0.6);
  grp.add(scatter(rockGeo(1, 2, 14, 0.5), ICE, 260, (o) => { const a = r() * 6.28, d = rr(r, 70, 2400), x = Math.cos(a) * d, z = Math.sin(a) * d, s = Math.pow(r(), 2.4) * 11 + 1.2; o.position.set(x, H(x, z) - s * 0.35, z); o.rotation.set(rr(r, -0.3, 0.3), r() * 6, rr(r, -0.3, 0.3)); o.scale.set(s, s * rr(r, 1.2, 3.2), s * rr(r, 0.7, 1.2)); if (d < 700 && s > 2) cols.push({ x, z, r: s * 0.8 }); }));
  const D = mat('hull', { color: 0x3a4048, rough: 0.7, metal: 0.6 }), Wd = mat('wood', { color: 0xc8a888, rough: 0.8, metal: 0 }), Wt = mat('flat', { color: 0xdfe8f0, rough: 0.5, metal: 0.1 }), WG = glow('#ffcf8a', 2.6);
  pad(B, 0.1, 30, '#a6f0ff');
  B.box(Wd, 26, 7, 16, 66, 4.5, 0); B.add(Wt, new THREE.CylinderGeometry(9.2, 9.2, 26.4, 20, 1, false, 0, Math.PI).rotateZ(HP), mx(66, 8, 0), 0.1); for (let i = 0; i < 5; i++) { B.box(WG, 0.2, 2, 2.6, 52.9, 4.6, -6 + i * 3); if (i !== 2) B.box(WG, 2.6, 2, 0.2, 58 + i * 4, 4.6, 8.05); }
  B.box(D, 1.6, 4.2, 3, 52.6, 3.1, 0); for (const [x, z] of [[55, -7], [77, -7], [55, 7], [77, 7]]) B.cyl(D, 0.4, 0.5, 2, x, 0.6, z, 'y', 8);
  B.cyl(D, 0.3, 0.4, 16, 84, 8, -10, 'y', 8); B.add(Wt, new THREE.SphereGeometry(5, 20, 12, 0, 6.2832, 0, 1.2), mx(84, 17, -10, -2.3, 0.4, 0), 0); B.cyl(D, 0.2, 0.3, 26, 88, 13, 12, 'y', 6); beacon(beacons, 88, 26.5, 12, '#f33', 10, 0.6); beacon(beacons, 52.6, 6.4, 0, '#ffcf8a', 7);
  rects.push([52, -9, 80, 9]); cols.push({ x: 84, z: -10, r: 1.2 }); items.push({ x: 51, z: 0, r: 5, label: '研究所に入る', act: 'outpost' });
  const s1 = signMesh('氷床研究所', '#a6f0ff', 2.2, { double: true, intensity: 2.6 }); s1.position.set(52.7, 9, 0); s1.rotation.y = -HP; grp.add(s1);
  const nodes = []; for (let i = 0; i < 7; i++) { const a = i * 0.9 + 2.2, d = 100 + (i % 3) * 65, x = Math.cos(a) * d - 30, z = Math.sin(a) * d, n = node('#6fe8ff', 1.3, 90 + i); n.position.set(x, H(x, z), z); grp.add(n); nodes.push({ g: n, x, z, item: 'ice', label: '氷晶を採取する' }); }
  // ── 全域を埋める: 氷の尖塔 (セラック)・氷のアーチ・卓状氷山・発光する氷晶・凍りついた残骸・観測マスト + 足元の氷塊 ──
  const obbs = [], hA = TM.heightAt, env2 = { grp, obbs, cols }, CY = glowMat('#5fe0ff', 1.3), DRK = mat('rock', { color: 0x3a4250, rough: 0.8, metal: 0.2, uvs: 0 }), ICE2 = ICE.clone(); ICE2.color.set(0xe4f4ff); ICE2.roughness = 0.3;
  const inBase = (x, z) => Math.hypot(x, z) < 120 || (x > 44 && x < 96 && z > -20 && z < 22);
  strew(env2, r, hA, { free: (x, z) => !inBase(x, z), spire: { n: 320, m: ICE, h1: 70 }, arch: { n: 44, m: ICE, w: 70 }, butte: { n: 40, m: ICE2, w: 150, h: 70 }, crys: { n: 90, m: CY, h: 26 } });
  landmarks(env2, wreckGeo(), VCM(), pickPts(r, 7, 400, 6200, (x, z) => !inBase(x, z)).map(([x, z]) => { const L = rr(r, 60, 130); return [x, hA(x, z) - L * 0.05, z, L, L, r() * 6.28, rr(r, -0.12, 0.12)]; }), { solid: 0.18 });
  { const pts = pickPts(r, 22, 170, 4600, (x, z) => !inBase(x, z)); landmarks(env2, mastGeo(), VCM(), pts.map(([x, z]) => [x, hA(x, z), z, 24, 24, r() * 6.28, 0]), {}); pts.forEach(([x, z], i) => { cols.push({ x, z, r: 1.3 }); if (i % 2 === 0) beacon(beacons, x, hA(x, z) + 24.6, z, i % 4 ? '#a6f0ff' : '#f33', 7, i % 4 ? 0 : 0.7); }); }
  const veg = groundCover(grp, hA, [{ g: propGeo('boulder'), m: ICE, tumble: 1, sink: 0.3, key: 'a' }, { g: propGeo('boulder2'), m: ICE2, tumble: 1, sink: 0.25, key: 'b' }, { g: propGeo('slab'), m: ICE, tumble: 0.2, sink: 0.25, key: 'c' }, { g: propGeo('crystal'), m: CY, sink: 0.03, key: 'd' }, { g: propGeo('boulder2'), m: DRK, tumble: 1, sink: 0.3, key: 'e' }],
    (x, z, h, v, d) => { d[0] = Math.hypot(x, z) < 44 || (x > 46 && x < 94 && z > -18 && z < 20) ? 0 : 0.12 + 0.46 * smooth(0.36, 0.7, fbm(x * 0.006, z * 0.006, 2, 15)); d[1] = v < 0.38 ? 0 : v < 0.64 ? 1 : v < 0.82 ? 2 : v < 0.92 ? 3 : 4; });
  grp.add(B.build());
  return { id: 'glacies', group: grp, sky, H, heightAt: TM.heightAt, sunDir, sunCol: '#a8c8ff', sunInt: 1.1, hemi: ['#2a5a8a', '#16263a', 1.5], fog: [COL('#0c1c30'), 0.00026], cols, rects, obbs, veg, items, anim, beacons, nodes, padY: 0.2, rain: [V3(4, -7, 2), 0.7, '#ffffff'], walkR: 3000, door: [50, 0, -HP], foot: [0, 38], look: [0.6, 1.0, 1.05], music: 'surface' };
}

// ───────────────────────── ガス巨星: 雲海デッキ ─────────────────────────
const CLOUD_FS = /* glsl */`
precision highp float;uniform float uTime;uniform vec3 uSun,uA,uB,uC;varying vec3 vW;
${N2}
float hgt(vec2 p){return fbm2(p*.0011+vec2(uTime*.006,0.))*.7+fbm2(p*.004-uTime*.01)*.3;}
void main(){vec2 p=vW.xz;float h=hgt(p),e=14.;vec3 n=normalize(vec3(hgt(p+vec2(e,0.))-h,.085,hgt(p+vec2(0.,e))-h)*vec3(-1.,1.,-1.));
  float l=max(dot(n,uSun),0.),v=smoothstep(.3,.75,h);vec3 col=mix(uB,uA,v)*(.35+l*1.25)+uC*pow(1.-v,2.)*.4;
  vec3 V=normalize(cameraPosition-vW);col+=uA*pow(1.-max(dot(n,V),0.),3.)*.35;
  float fl=step(.9965,fract(sin(floor(uTime*3.)*91.7)*4371.))*smoothstep(900.,0.,length(p-vec2(sin(floor(uTime*3.)*7.)*2600.,cos(floor(uTime*3.)*5.)*2600.)));col+=vec3(.8,.85,1.)*fl*6.;
  float d=length(vW-cameraPosition);col=mix(col,vec3(.86,.6,.42),1.-exp(-d*d*4.5e-8));gl_FragColor=vec4(col,1.);}`;
function zephyr() {
  const r = rng(606), grp = new THREE.Group(), B = new Builder(), anim = [], cols = [], rects = [], items = [], beacons = [], sunDir = V3(0.7, 0.2, -0.5).normalize();
  const sky = makeSky({ sun: sunDir, zen: '#1a2a5a', hor: '#f0a060', ground: '#c88a5a', sunCol: '#ffd9a0', cloudCol: '#ffd0b0', cloud: 0.35, stars: 0.35, ring: 1.3, ringN: V3(0.25, 0.42, 0.87), haze: 1.0, sunSize: 0.99965 });
  const R = 150, H = (x, z) => (Math.hypot(x, z) < R ? 0 : -400);
  const cu = { uTime: fxTime, uSun: { value: sunDir }, uA: { value: COL('#ffe0b8') }, uB: { value: COL('#6a4a7a') }, uC: { value: COL('#2a6a8a') } };
  const cl = new THREE.Mesh(new THREE.PlaneGeometry(40000, 40000).rotateX(-HP), new THREE.ShaderMaterial({ uniforms: cu, vertexShader: 'varying vec3 vW;void main(){vec4 w=modelMatrix*vec4(position,1.);vW=w.xyz;gl_Position=projectionMatrix*viewMatrix*w;}', fragmentShader: CLOUD_FS })); cl.position.y = -420; grp.add(cl);
  // 巨大デッキ
  const D = mat('hull', { color: 0x3a4a50, rough: 0.6, metal: 0.6 }), GD = mat('flat', { color: 0xd4a84a, rough: 0.25, metal: 1 }), P = mat('hex', { color: 0xd8c090, rough: 0.3, metal: 0.6, uvs: 0.12, floor: 1 }), Wt = mat('wall', { color: 0x2c4a50, rough: 0.5, metal: 0.5 }), GL = new THREE.MeshStandardMaterial({ color: 0xffe2a8, transparent: true, opacity: 0.25, roughness: 0.05, metalness: 0.3, emissive: 0xffb050, emissiveIntensity: 0.5, side: THREE.DoubleSide }); GL.userData.uvs = 0;
  B.cyl(P, R, R, 0.3, 0, -0.15, 0, 'y', 72); B.cyl(D, R + 2, R * 0.55, 34, 0, -17.4, 0, 'y', 72); B.cyl(D, R * 0.5, 8, 90, 0, -79, 0, 'y', 32); B.tor(GD, R + 1, 0.8, 0, 0.2, 0, HP, 0, 0, 96, 8); B.tor(glow('#ffd27a', 3), R - 0.5, 0.15, 0, 0.12, 0, HP, 0, 0, 96, 5);
  for (let i = 0; i < 48; i++) { const a = i * Math.PI / 24; B.cyl(GD, 0.12, 0.12, 1.3, Math.cos(a) * (R - 1.5), 0.65, Math.sin(a) * (R - 1.5), 'y', 6); }
  B.tor(GD, R - 1.5, 0.08, 0, 1.3, 0, HP, 0, 0, 96, 5);
  pad(B, 0.1, 34, '#ffd27a');
  // ラウンジ棟 (ガラスドーム)
  B.cyl(Wt, 26, 28, 9, 86, 4.5, 0, 'y', 40); B.add(GL, new THREE.SphereGeometry(26, 40, 16, 0, 6.2832, 0, HP), mx(86, 9, 0), 0); B.tor(GD, 26.2, 0.5, 86, 9, 0, HP, 0, 0, 64, 8);
  for (let i = 0; i < 10; i++) B.add(GD, new THREE.TorusGeometry(26.1, 0.2, 6, 24, Math.PI), mx(86, 9, 0, 0, i * Math.PI / 10, 0), 0);
  B.box(D, 1.2, 4.4, 3.4, 59.4, 2.2, 0); B.box(glow('#ffd27a', 3), 0.2, 0.3, 3.6, 59.3, 4.6, 0); cols.push({ x: 86, z: 0, r: 28.5 }); items.push({ x: 57.5, z: 0, r: 5, label: 'スカイラウンジに入る', act: 'outpost' });
  // 採取マスト & 気球
  for (let i = 0; i < 6; i++) { const a = i * 1.047 + 0.52, x = Math.cos(a) * 118, z = Math.sin(a) * 118; if (x > 60) continue; B.cyl(D, 1.2, 2, 70, x, 35, z, 'y', 10); B.sph(GD, 7, x, 74, z, 1, 1.25, 1, 20); B.tor(glow('#ffd27a', 3), 7.2, 0.15, x, 74, z, HP, 0, 0, 32, 5); B.cyl(D, 2.6, 2.6, 6, x, 3, z, 'y', 12); cols.push({ x, z, r: 3 }); beacon(beacons, x, 84, z, '#f33', 12, 0.6); }
  const bal = new THREE.InstancedMesh(new THREE.SphereGeometry(1, 16, 12), new THREE.MeshStandardMaterial({ color: 0xe8c890, roughness: 0.4, metalness: 0.5 }), 96), o3 = new THREE.Object3D(), bp = [];
  for (let i = 0; i < 96; i++) { const sp = i < 26 ? 1800 : 6600; bp.push([rr(r, -1, 1) * sp, rr(r, -120, i < 26 ? 380 : 900), rr(r, -1, 1) * sp, rr(r, 14, 46), r() * 6]); }
  bal.frustumCulled = false; grp.add(bal);
  anim.push((dt, t) => { bp.forEach(([x, y, z, s, ph], i) => { if (Math.hypot(x, z) < 320) x += 500; o3.position.set(x + Math.sin(t * 0.05 + ph) * 40, y + Math.sin(t * 0.2 + ph) * 8, z); o3.scale.set(s, s * 1.2, s); o3.updateMatrix(); bal.setMatrixAt(i, o3.matrix); }); bal.instanceMatrix.needsUpdate = true; });
  const s1 = signMesh('クラウドデッキ', '#ffd27a', 2.8, { double: true, intensity: 2.6 }); s1.position.set(59.2, 7.4, 0); s1.rotation.y = -HP; grp.add(s1);
  const nodes = []; for (let i = 0; i < 6; i++) { const a = i * 1.047, x = Math.cos(a) * 128 - (Math.cos(a) > 0.4 ? 40 : 0), z = Math.sin(a) * 128, n = node('#b58cff', 0.9, 120 + i); n.position.set(x, 0, z); grp.add(n); nodes.push({ g: n, x, z, item: 'gas', label: '希ガス凝縮体を採取する' }); }
  // ── 空を埋める: 積乱雲の塔・着陸できる小型プラットフォーム・飛行船・空を泳ぐ生き物 ──
  const obbs = [], env2 = { grp, obbs, cols };
  { const CL = new THREE.MeshStandardMaterial({ color: 0xffe6cc, roughness: 1, metalness: 0, emissive: 0x7a4634, emissiveIntensity: 0.5 }), L = [];
    for (const [x, z] of pickPts(r, 54, 750, 6900, () => true)) { const s = rr(r, 180, 460), n = 3 + Math.floor(r() * 4); for (let k = 0; k < n; k++) { const w = s * (1 - k * 0.13) * rr(r, 0.8, 1.1); L.push([x + rr(r, -0.3, 0.3) * s, -450 + k * s * 0.5, z + rr(r, -0.3, 0.3) * s, w, w * rr(r, 0.6, 0.85), r() * 6.28, 0]); } if (r() < 0.4) L.push([x, -450 + n * s * 0.5, z, s * 1.5, s * 0.28, r() * 6.28, 0]); }
    landmarks(env2, propGeo('blob'), CL, L, { shadow: false }); }
  { const PT = mat('plate', { color: 0xb8a070, rough: 0.5, metal: 0.6, uvs: 0.12 });
    for (const [x, z] of pickPts(r, 16, 420, 5600, () => true)) { const y = Math.round(rr(r, -160, 620)), rad = rr(r, 26, 58), a = r() * 6.28, tx = x + Math.cos(a) * rad * 0.62, tz = z + Math.sin(a) * rad * 0.62, ux = x - Math.cos(a) * rad * 0.58, uz = z - Math.sin(a) * rad * 0.58;
      B.cyl(PT, rad, rad, 0.4, x, y - 0.2, z, 'y', 40); B.cyl(D, rad + 1.2, rad * 0.45, rad * 0.32, x, y - 0.4 - rad * 0.16, z, 'y', 40); B.cyl(D, rad * 0.3, 1.6, rad * 1.1, x, y - rad * 0.86, z, 'y', 16); B.tor(GD, rad + 0.6, 0.5, x, y + 0.1, z, HP, 0, 0, 56, 6); B.tor(glow('#ffd27a', 3), rad - 0.6, 0.12, x, y + 0.08, z, HP, 0, 0, 56, 5);
      B.cyl(D, 0.8, 1.2, 26, tx, y + 13, tz, 'y', 8); B.sph(GD, 5, tx, y + 31, tz, 1, 1.25, 1, 16); B.cyl(Wt, 3.4, 3.4, 5, ux, y + 2.5, uz, 'y', 14); B.cyl(GD, 3.6, 3.6, 0.3, ux, y + 5.1, uz, 'y', 14);
      cols.push({ x: tx, z: tz, r: 1.6 }, { x: ux, z: uz, r: 3.8 }); beacon(beacons, tx, y + 38, tz, '#f33', 12, 0.6); beacon(beacons, x, y + 1.5, z, '#ffd27a', 10); obbs.push([x, z, rad * 0.7, rad * 0.7, 1, 0, y]); } }
  { const ag = colorGeo([[new THREE.SphereGeometry(1, 20, 14).scale(0.16, 0.16, 0.5), 0xd8c8a8], [new THREE.BoxGeometry(0.07, 0.05, 0.2).translate(0, -0.17, 0.04), 0x3a3a40], [new THREE.BoxGeometry(0.02, 0.16, 0.12).translate(0, 0.1, 0.42), 0xb8452e], [new THREE.BoxGeometry(0.3, 0.012, 0.1).translate(0, 0, 0.42), 0xb8452e], [new THREE.CylinderGeometry(0.163, 0.163, 0.03, 20).rotateX(HP).translate(0, 0, -0.1), 0xb8452e], [new THREE.CylinderGeometry(0.163, 0.163, 0.02, 20).rotateX(HP).translate(0, 0, 0.12), 0x8a6a4a]]);
    const NA = 11, air = new THREE.InstancedMesh(ag, VCM(), NA), al = [], oa = new THREE.Object3D(); for (let i = 0; i < NA; i++) al.push({ R: rr(r, 500, 3400), y: rr(r, 60, 900), sp: rr(r, 14, 26) * (r() < 0.5 ? 1 : -1), ph: r() * 6.28, L: rr(r, 80, 170), cx: rr(r, -2200, 2200), cz: rr(r, -2200, 2200) }); air.frustumCulled = false; grp.add(air);
    const bg = new THREE.BufferGeometry(); bg.setAttribute('position', new THREE.Float32BufferAttribute([0, 0, -0.5, -1.2, 0.1, 0.3, 0, 0, 0.5, 0, 0, -0.5, 0, 0, 0.5, 1.2, 0.1, 0.3], 3));
    const NM = 44, man = new THREE.InstancedMesh(bg, new THREE.MeshBasicMaterial({ color: 0x3a2a3a, side: THREE.DoubleSide }), NM), pods = [[900, 140, -700], [-1500, 320, 1200], [2400, 60, 2000], [-600, 500, -2600]]; man.frustumCulled = false; grp.add(man);
    anim.push((dt, t) => { for (let i = 0; i < NA; i++) { const a = al[i], an = a.ph + t * a.sp / a.R; oa.position.set(a.cx + Math.cos(an) * a.R, a.y + Math.sin(t * 0.2 + i) * 6, a.cz + Math.sin(an) * a.R); oa.rotation.set(0, a.sp > 0 ? Math.PI - an : -an, 0); oa.scale.setScalar(a.L); oa.updateMatrix(); air.setMatrixAt(i, oa.matrix); } air.instanceMatrix.needsUpdate = true;
      for (let i = 0; i < NM; i++) { const c = pods[i % 4], sg = (i % 4) % 2 ? 1 : -1, an = t * (0.05 + (i % 5) * 0.006) * sg + i * 0.7, rad = 150 + (i % 7) * 46; oa.position.set(c[0] + Math.cos(an) * rad, c[1] + Math.sin(t * 0.3 + i * 1.3) * 22 + (i % 6) * 14, c[2] + Math.sin(an) * rad); oa.rotation.set(0, sg > 0 ? Math.PI - an : -an, 0); const sc = 9 + (i % 5) * 2.2; oa.scale.set(sc, Math.sin(t * 1.5 + i * 1.7) * sc * 1.6, sc); oa.updateMatrix(); man.setMatrixAt(i, oa.matrix); } man.instanceMatrix.needsUpdate = true; }); }
  grp.add(B.build());
  return { id: 'zephyr', group: grp, sky, H, sunDir, obbs, sunCol: '#ffd8a8', sunInt: 3.6, hemi: ['#8aa0e0', '#c88a5a', 1.2], fog: [COL('#dc9a6a'), 0.00012], cols, rects, items, anim, beacons, nodes, padY: 0.2, rain: [V3(22, 2, 6), 0.25, '#ffe8c8'], walkR: 1e9, door: [56, 0, -HP], foot: [0, 42], look: [0.55, 1.05, 1.0], mirror: [P, 0.9], music: 'surface', floor: -420 };
}

const ENV = { terra, ignis, sahar, glacies, zephyr };
export function buildSurface(id) { const e = ENV[id](); e.name = BASES[id].name; e.sub = BASES[id].sub; return e; }
