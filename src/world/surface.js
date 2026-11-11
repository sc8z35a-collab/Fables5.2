// 惑星地表の環境: 地球 (earth.js) / 溶岩 / 砂漠 / 氷 / ガス巨星の雲海デッキ
import * as THREE from 'three';
import { Builder, mx, rockGeo } from '../gfx/builder.js';
import { mat, glow, texSet, signMesh, screenMat } from '../gfx/textures.js';
import { rng, rr, fbm, ridge, smooth, clamp, pick } from '../core/util.js';
import { fxTime, makeGlowSprite } from '../gfx/fx.js';
import { BASES } from './defs.js';
import { HP, V3, COL, N2, makeSky, gridTerrain, scatter, pad, node, beacon } from './surfkit.js';
import { terra } from './earth.js';

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
  const H = (x, z) => { const d = Math.hypot(x, z), flat = smooth(70, 240, d), riv = Math.abs(fbm(x * 0.0016 + 3, z * 0.0016, 4, 11) - 0.5), base = fbm(x * 0.0012, z * 0.0012, 5, 2) * 90 + ridge(x * 0.004, z * 0.004, 4, 5) * 34;
    const vol = Math.exp(-((x + 2600) ** 2 + (z + 1900) ** 2) / 1.3e6) * 1150 - Math.exp(-((x + 2600) ** 2 + (z + 1900) ** 2) / 6e4) * 330;
    return (base - smooth(0.085, 0.0, riv) * 70 - 18) * flat + 8 * (1 - flat) + vol; };
  { const tm = gridTerrain(H, (x, z, h, sl, c) => { const n = fbm(x * 0.01, z * 0.01, 3, 8), hot = smooth(6, -6, h); c[0] = 0.05 + n * 0.05 + hot * 0.5 + sl * 0.03; c[1] = 0.04 + n * 0.035 + hot * 0.08; c[2] = 0.04 + n * 0.03; }, { rough: 0.75, metal: 0.25, ns: 1.8, env: 0.8 }); grp.add(tm); var TM = tm; }
  const lava = new THREE.Mesh(new THREE.PlaneGeometry(12000, 12000).rotateX(-HP), new THREE.ShaderMaterial({ uniforms: { uTime: fxTime }, vertexShader: 'varying vec3 vW;void main(){vec4 w=modelMatrix*vec4(position,1.);vW=w.xyz;gl_Position=projectionMatrix*viewMatrix*w;}', fragmentShader: LAVA_FS })); lava.position.y = -4; grp.add(lava);
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
  grp.add(B.build());
  return { id: 'ignis', group: grp, sky, H, heightAt: TM.heightAt, sunDir, sunCol: '#ff7a40', sunInt: 2.2, hemi: ['#6a2a18', '#3a0c04', 1.2], fog: [COL('#280a05'), 0.00042], cols, rects, items, anim, beacons, nodes, padY: 8.2, rain: [V3(3, 9, 1), 0.5, '#ff8a4a'], walkR: 900, door: [49, -10, -HP], foot: [0, 40], look: [0.7, 0.95, 1.0], heat: 0.12, music: 'hostile', smoke: [-2600, 760, -1900], hazard: (x, z, h) => h < -2.5 };
}

// ───────────────────────── 砂漠の星 ─────────────────────────
function sahar() {
  const r = rng(404), grp = new THREE.Group(), B = new Builder(), anim = [], cols = [], rects = [], items = [], beacons = [], sunDir = V3(0.5, 0.52, 0.4).normalize();
  const sky = makeSky({ sun: sunDir, zen: '#3a6aa8', hor: '#e8b888', ground: '#b88a5a', sunCol: '#fff0d0', cloudCol: '#f4dcc0', cloud: 0.28, stars: 0, haze: 0.5, sunSize: 0.9994 });
  const H = (x, z) => { const d = Math.hypot(x, z), flat = smooth(60, 260, d), dune = Math.pow(Math.abs(Math.sin(x * 0.006 + fbm(x * 0.001, z * 0.001, 3, 4) * 6) ), 1.6) * 26 + fbm(x * 0.0007, z * 0.0007, 4, 9) * 60;
    const mesa = smooth(0.56, 0.62, fbm(x * 0.0006 + 9, z * 0.0006, 4, 21)) * (230 + fbm(x * 0.004, z * 0.004, 3, 2) * 50) * smooth(500, 1100, d);
    return (dune + mesa) * flat; };
  { const tm = gridTerrain(H, (x, z, h, sl, c) => { const n = fbm(x * 0.008, z * 0.008, 3, 6), rock = smooth(0.35, 0.9, sl) + smooth(120, 200, h) * 0.5; c[0] = 0.62 + n * 0.16 - rock * 0.3; c[1] = 0.36 + n * 0.1 - rock * 0.2; c[2] = 0.17 + n * 0.05 - rock * 0.07; if (h > 150 && sl < 0.3) { c[0] *= 0.8; c[1] *= 0.72; c[2] *= 0.7; } }, { rough: 1, ns: 0.8, uv: 0.06 }); grp.add(tm); var TM = tm; }
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
  grp.add(B.build());
  return { id: 'sahar', group: grp, sky, H, heightAt: TM.heightAt, sunDir, sunCol: '#fff2dc', sunInt: 4.2, hemi: ['#9ab8e0', '#a87a4a', 1.0], fog: [COL('#d8b088'), 0.00022], cols, rects, items, anim, beacons, nodes, padY: 0.2, rain: [V3(34, -1, 9), 0.35, '#f0d0a0'], walkR: 900, door: [51, 0, -HP], foot: [0, 40], look: [0.5, 1.05, 1.0], music: 'surface' };
}

// ───────────────────────── 氷の星 ─────────────────────────
function glacies() {
  const r = rng(505), grp = new THREE.Group(), B = new Builder(), anim = [], cols = [], rects = [], items = [], beacons = [], sunDir = V3(-0.5, 0.1, -0.8).normalize();
  const sky = makeSky({ sun: sunDir, zen: '#01040e', hor: '#0e2a4a', ground: '#0a1420', sunCol: '#9fc8ff', cloudCol: '#5a7a9a', cloud: 0.2, stars: 1.6, aurora: 1.5, haze: 0.5, sunSize: 0.9997 });
  const H = (x, z) => { const d = Math.hypot(x, z), flat = smooth(60, 240, d), cr = Math.abs(fbm(x * 0.002 + 5, z * 0.002, 4, 13) - 0.5); return (fbm(x * 0.0009, z * 0.0009, 5, 7) * 110 + ridge(x * 0.003, z * 0.003, 4, 3) * 60 - smooth(0.03, 0.0, cr) * 46 + ridge(x * 0.0004, z * 0.0004, 3, 17) * 420 * smooth(1200, 3200, d)) * flat; };
  { const tm = gridTerrain(H, (x, z, h, sl, c) => { const n = fbm(x * 0.006, z * 0.006, 3, 4), deep = smooth(0.2, 0.9, sl); c[0] = 0.62 + n * 0.2 - deep * 0.42; c[1] = 0.74 + n * 0.16 - deep * 0.3; c[2] = 0.86 + n * 0.1 - deep * 0.08; }, { rough: 0.38, metal: 0.1, ns: 0.9, env: 1.6, uv: 0.03 }); grp.add(tm); var TM = tm; }
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
  grp.add(B.build());
  return { id: 'glacies', group: grp, sky, H, heightAt: TM.heightAt, sunDir, sunCol: '#a8c8ff', sunInt: 1.1, hemi: ['#2a5a8a', '#16263a', 1.5], fog: [COL('#0c1c30'), 0.00026], cols, rects, items, anim, beacons, nodes, padY: 0.2, rain: [V3(4, -7, 2), 0.7, '#ffffff'], walkR: 900, door: [50, 0, -HP], foot: [0, 38], look: [0.6, 1.0, 1.05], music: 'surface' };
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
  const bal = new THREE.InstancedMesh(new THREE.SphereGeometry(1, 16, 12), new THREE.MeshStandardMaterial({ color: 0xe8c890, roughness: 0.4, metalness: 0.5 }), 26), o3 = new THREE.Object3D(), bp = [];
  for (let i = 0; i < 26; i++) bp.push([rr(r, -1, 1) * 1800, rr(r, -120, 380), rr(r, -1, 1) * 1800, rr(r, 14, 46), r() * 6]);
  bal.frustumCulled = false; grp.add(bal);
  anim.push((dt, t) => { bp.forEach(([x, y, z, s, ph], i) => { if (Math.hypot(x, z) < 320) x += 500; o3.position.set(x + Math.sin(t * 0.05 + ph) * 40, y + Math.sin(t * 0.2 + ph) * 8, z); o3.scale.set(s, s * 1.2, s); o3.updateMatrix(); bal.setMatrixAt(i, o3.matrix); }); bal.instanceMatrix.needsUpdate = true; });
  const s1 = signMesh('クラウドデッキ', '#ffd27a', 2.8, { double: true, intensity: 2.6 }); s1.position.set(59.2, 7.4, 0); s1.rotation.y = -HP; grp.add(s1);
  const nodes = []; for (let i = 0; i < 6; i++) { const a = i * 1.047, x = Math.cos(a) * 128 - (Math.cos(a) > 0.4 ? 40 : 0), z = Math.sin(a) * 128, n = node('#b58cff', 0.9, 120 + i); n.position.set(x, 0, z); grp.add(n); nodes.push({ g: n, x, z, item: 'gas', label: '希ガス凝縮体を採取する' }); }
  grp.add(B.build());
  return { id: 'zephyr', group: grp, sky, H, sunDir, sunCol: '#ffd8a8', sunInt: 3.6, hemi: ['#8aa0e0', '#c88a5a', 1.2], fog: [COL('#dc9a6a'), 0.00012], cols, rects, items, anim, beacons, nodes, padY: 0.2, rain: [V3(22, 2, 6), 0.25, '#ffe8c8'], walkR: R - 2.5, door: [56, 0, -HP], foot: [0, 42], look: [0.55, 1.05, 1.0], mirror: [P, 0.9], music: 'surface', floor: -420 };
}

const ENV = { terra, ignis, sahar, glacies, zephyr };
export function buildSurface(id) { const e = ENV[id](); e.name = BASES[id].name; e.sub = BASES[id].sub; return e; }
