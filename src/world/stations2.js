// 追加の宇宙ステーション 4 基の外観
//   アトラス  : 天球を担ぐ救難基地。肩の甲板に救助船ミケーネ 15 機を係留し、緊急時に地球へ発進させる
//   メガトン  : 全長 3.3km の回転居住筒 (巨大規模)。窓の奥に街明かり、後端に核融合炉
//   ファイザー: 二重らせん型の創薬研究ステーション (中規模)
//   ウェポン  : ステーションそのものが電磁投射砲 (小規模)。定期的に標的へ試射する
import * as THREE from 'three';
import { Builder, mx, rockGeo } from '../gfx/builder.js';
import { mat, glow, cv, ctex } from '../gfx/textures.js';
import { makeGlowSprite, fxTime } from '../gfx/fx.js';
import { G, rng, rr } from '../core/util.js';
import { V, winMat, port, done, sign, sdBox } from './stationkit.js';
import { buildMycenae, instanced, rescueN } from './rescue.js';
import { body, station } from './defs.js';
import { detailAtlas, detailMegaton, detailMegaRing } from './stationdetail.js';
import { detailFizer, detailFizerHelix, detailWeapon } from './stationdetail2.js';
import { lightField } from './stationparts.js';

const HP = Math.PI / 2, TAU = Math.PI * 2, RAD = Math.PI / 180;
export const NOISE = /* glsl */`
float h3(vec3 p){return fract(sin(dot(p,vec3(127.1,311.7,74.7)))*43758.5453);}
float n3(vec3 p){vec3 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);
  return mix(mix(mix(h3(i),h3(i+vec3(1,0,0)),f.x),mix(h3(i+vec3(0,1,0)),h3(i+vec3(1,1,0)),f.x),f.y),mix(mix(h3(i+vec3(0,0,1)),h3(i+vec3(1,0,1)),f.x),mix(h3(i+vec3(0,1,1)),h3(i+vec3(1,1,1)),f.x),f.y),f.z);}
float fbm3(vec3 p){float a=.5,t=0.;for(int i=0;i<4;i++){t+=a*n3(p);p*=2.03;a*=.5;}return t;}`;
export const VS = 'varying vec3 vP,vN,vV;varying vec2 vUv;void main(){vP=position;vUv=uv;vec4 mv=modelViewMatrix*vec4(position,1.);vN=normalize(normalMatrix*normal);vV=normalize(-mv.xyz);gl_Position=projectionMatrix*mv;}';
const ADD = { transparent: true, blending: THREE.AdditiveBlending, depthWrite: false };
const metal = (c, r = 0.28) => { const m = new THREE.MeshStandardMaterial({ color: c, roughness: r, metalness: 1 }); m.userData.uvs = 0; return m; };
/** 2 点を結ぶ円柱 (トラスや支柱) */
const _y = new THREE.Vector3(0, 1, 0), _q = new THREE.Quaternion(), _s = new THREE.Vector3(1, 1, 1);
function strut(b, m, a, c, r0, r1 = r0, seg = 8) { const d = c.clone().sub(a), len = d.length(); _q.setFromUnitVectors(_y, d.multiplyScalar(1 / len)); b.add(m, new THREE.CylinderGeometry(r1, r0, len, seg), new THREE.Matrix4().compose(a.clone().add(c).multiplyScalar(0.5), _q, _s)); }
/** 任意の向きの看板。X = 文字の進む向き, Z = 面の法線 */
function signOn(text, color, h, pos, X, Z, o = {}) { const m = sign(text, color, h, 0, 0, 0, 0, 0, o), y = Z.clone().cross(X); m.quaternion.setFromRotationMatrix(new THREE.Matrix4().makeBasis(X, y, Z)); m.position.copy(pos); return m; }
const spr = (obj, c, s, k, x, y, z) => { const p = makeGlowSprite(c, s, k); p.position.set(x, y, z); obj.add(p); return p; };

// ───────────────────────── 6. アトラス救難基地 ─────────────────────────
/** ホログラムの地球儀: 大陸・経緯線・都市の灯 */
export function globeMat() {
  return new THREE.ShaderMaterial({ uniforms: { uTime: fxTime, uCol: { value: new THREE.Color(0.22, 0.7, 1.0) }, uLand: { value: new THREE.Color(0.2, 1.0, 0.55) } }, vertexShader: VS, ...ADD,
    fragmentShader: 'uniform float uTime;uniform vec3 uCol,uLand;varying vec3 vP,vN,vV;' + NOISE + /* glsl */`
void main(){vec3 d=normalize(vP);float land=smoothstep(.5,.535,fbm3(d*2.3+3.7));
  float lat=asin(clamp(d.y,-1.,1.)),lon=atan(d.z,d.x);
  float grid=max(smoothstep(.985,1.,cos(lat*18.)),smoothstep(.985,1.,cos(lon*12.))*smoothstep(1.5,1.3,abs(lat)));
  float fr=pow(1.-abs(dot(vN,vV)),2.2);float city=step(.9,n3(d*46.))*land;
  float scan=.82+.18*sin(vP.y*.5-uTime*2.5);
  vec3 col=uCol*(.07+grid*.6+fr*1.9)+uLand*land*(.5+.3*n3(d*11.))+vec3(1.,.82,.5)*city*1.6;
  gl_FragColor=vec4(col*scan*1.25,1.);}` });
}
const beamMat = (c, k = 1) => new THREE.ShaderMaterial({ uniforms: { uCol: { value: new THREE.Color(c).multiplyScalar(k) }, uTime: fxTime }, vertexShader: VS, ...ADD, side: THREE.DoubleSide,
  fragmentShader: 'uniform vec3 uCol;uniform float uTime;varying vec3 vN,vV;varying vec2 vUv;void main(){float a=pow(abs(dot(vN,vV)),1.5)*(1.-vUv.y)*(.75+.25*sin(vUv.y*40.-uTime*4.));gl_FragColor=vec4(uCol*a,1.);}' });

function atlas() {
  const U = 0.03, b = new Builder(), H = mat('hull', { color: 0xf2f3ef, rough: 0.55, metal: 0.25, uvs: U }), W = winMat(0xe6e8e4, 0xfff0d0, 2.6, U), A = mat('hull', { color: 0xff5412, rough: 0.55, metal: 0.2, uvs: U }), D = mat('hull', { color: 0x363b44, rough: 0.82, metal: 0.6, uvs: U });
  const PL = mat('plate', { color: 0x6c727c, rough: 0.6, metal: 0.6, uvs: 0.05 }), GD = metal(0xd9b25a, 0.26), GX = glow('#35ff8a', 2.2), GO = glow('#ffb060', 3), GC = glow('#8fe8ff', 3), GWh = glow('#fff2d8', 3), lights = [], signs = [];
  // ── 発進甲板 (アトラスの「肩」): 縁に 15 基の係留クレードル ──
  b.cyl(W, 236, 236, 26, 0, 0, 0, 'y', 90); b.cyl(PL, 241, 241, 4, 0, 15, 0, 'y', 90); b.cyl(D, 241, 238, 4, 0, -15, 0, 'y', 90); b.cyl(A, 239.5, 239.5, 7, 0, 0, 0, 'y', 90, true);
  for (const y of [-9, 9]) b.tor(GX, 240.4, 0.4, 0, y, 0, HP, 0, 0, 180, 5);
  b.cyl(W, 150, 190, 12, 0, 23, 0, 'y', 60); b.cyl(PL, 152, 152, 1.2, 0, 29.4, 0, 'y', 60); b.tor(GO, 196, 0.6, 0, 17.6, 0, HP, 0, 0, 120, 5); b.tor(D, 120, 3, 0, 30, 0, HP, 0, 0, 90, 6); b.tor(GX, 146, 0.45, 0, 30.2, 0, HP, 0, 0, 120, 5);
  // 甲板上: 管制棟・格納庫の出入口・給油塔・誘導灯
  for (let i = 0; i < 15; i++) {
    const a = i * 24 * RAD, c = Math.cos(a), s = Math.sin(a), M = (m, w, h, d, rad, y, lat = 0, uv) => b.add(m, new THREE.BoxGeometry(w, h, d), mx(c * rad - s * lat, y, s * rad + c * lat, 0, -a, 0), uv);
    if (i % 3 === 0) { M(W, 30, 12, 20, 212, 23); M(D, 32, 1.4, 22, 212, 29.6); M(GWh, 0.5, 2.4, 14, 227.2, 21); b.cyl(D, 0.5, 0.8, 16, c * 206, 38, s * 206, 'y', 6); lights.push({ p: V(c * 206, 47, s * 206), c: '#f33', s: 12, blink: 0.8, ph: i / 15 }); }
    else if (i % 3 === 1) { b.cyl(H, 7, 7, 13, c * 214, 23.5, s * 214, 'y', 16); b.sph(H, 7, c * 214, 30, s * 214, 1, 0.6, 1, 16); b.tor(A, 7.2, 0.7, c * 214, 24, s * 214, HP, 0, 0, 20, 6); M(D, 14, 5, 5, 203, 19.5); }
    else { M(D, 24, 7, 15, 211, 20.5); M(glow('#ffd23a', 1.3), 0.4, 4, 12, 223.2, 20); M(PL, 26, 1, 17, 211, 24.4); for (const lat of [-5, 5]) M(GC, 20, 0.3, 0.4, 211, 25.1, lat); }
    for (let k = 0; k < 6; k++) for (const lat of [-11, 11]) { const a2 = (i * 24 + 12) * RAD, c2 = Math.cos(a2), s2 = Math.sin(a2), rad = 178 + k * 10; b.box(k % 2 ? GWh : GX, 0.9, 0.5, 0.9, c2 * rad - s2 * lat, 17.3, s2 * rad + c2 * lat); }
  }
  for (let i = 0; i < 60; i++) { const a = i * 6 * RAD; b.box(i % 5 ? GWh : GO, 1.1, 1.1, 1.1, Math.cos(a) * 238.5, 17.4, Math.sin(a) * 238.5); }
  const N = 15, cradle = [];
  for (let i = 0; i < N; i++) {
    const a = (i * 24 + 12) * RAD, c = Math.cos(a), s = Math.sin(a), M = (m, w, h, d, rad, y, lat = 0) => b.add(m, new THREE.BoxGeometry(w, h, d), mx(c * rad - s * lat, y, s * rad + c * lat, 0, -a, 0));
    for (const side of [-1, 1]) { M(D, 40, 3.2, 2.6, 256, -4.2, side * 3.0); M(A, 6, 4, 4, 276, -3.8, side * 3.0); M(D, 3, 9, 2.4, 240, 0.5, side * 9); M(glow('#ffd23a', 1.6), 30, 0.25, 0.5, 258, -2.5, side * 3.0); }
    M(D, 6, 12, 24, 238.5, 2, 0); M(H, 10, 5, 12, 240, 10.5, 0); M(GC, 0.6, 2, 9, 242, 4, 0); M(D, 62, 0.8, 5, 205, 17.3, 0); M(GO, 56, 0.3, 0.8, 205, 17.75, 0);
    cradle.push({ a, c, s, p: V(c * 256, 1.25, s * 256), out: V(c, 0, s) });
  }
  // ── 胴体 (甲板の下): 救命病棟 4 棟とドッキングアーム ──
  b.cyl(W, 150, 122, 50, 0, -41, 0, 'y', 64); b.cyl(D, 126, 126, 6, 0, -67, 0, 'y', 64); b.cyl(H, 120, 86, 50, 0, -95, 0, 'y', 64); b.cyl(A, 88, 88, 6, 0, -122, 0, 'y', 64); b.cyl(W, 84, 68, 36, 0, -143, 0, 'y', 48); b.cyl(D, 62, 40, 30, 0, -176, 0, 'y', 32);
  b.cyl(D, 5, 1.2, 90, 0, -236, 0, 'y', 8); b.tor(D, 30, 2.2, 0, -200, 0, HP, 0, 0, 48, 6); b.tor(GX, 33, 0.5, 0, -200, 0, HP, 0, 0, 48, 5);
  for (let k = 0; k < 4; k++) {
    const a = (45 + k * 90) * RAD, c = Math.cos(a), s = Math.sin(a), M = (m, w, h, d, rad, y, lat = 0) => b.add(m, new THREE.BoxGeometry(w, h, d), mx(c * rad - s * lat, y, s * rad + c * lat, 0, -a, 0));
    M(W, 74, 36, 50, 162, -42); M(D, 78, 4, 54, 162, -22); M(D, 78, 4, 54, 162, -62); M(A, 2, 30, 51, 199.6, -42);
    M(GX, 1.2, 22, 6.5, 200.9, -42); M(GX, 1.2, 6.5, 22, 200.9, -42); // 緑十字
    for (const lat of [-18, 18]) M(glow('#fff2d8', 3), 1, 2, 9, 200.8, -30, lat);
    lights.push({ p: V(c * 204, -20, s * 204), c: '#f33', s: 20, blink: 0.6, ph: k / 4 });
  }
  b.box(D, 20, 20, 160, 0, -42, 222); b.box(H, 36, 36, 30, 0, -42, 306); b.box(A, 37, 5, 31, 0, -26, 306); for (const z of [170, 215, 260]) b.box(H, 24, 24, 6, 0, -42, z);
  for (const s of [-1, 1]) b.box(GX, 0.6, 0.6, 150, s * 10.4, -31.6, 222);
  const p = port(b, D, V(0, -42, 324), V(0, 0, 1), '#7fffc0');
  for (let i = 0; i < 6; i++) lights.push({ p: V(0, -42, 355 + i * 40), c: '#4f8', s: 14, blink: 1, ph: 1 - i / 6 });
  // ── 司令塔と投影機 ──
  b.cyl(H, 60, 78, 30, 0, 42, 0, 'y', 48); b.cyl(W, 44, 56, 50, 0, 82, 0, 'y', 48); b.cyl(D, 60, 60, 4, 0, 108, 0, 'y', 48); b.tor(GX, 61, 0.5, 0, 108, 0, HP, 0, 0, 72, 5); b.cyl(H, 26, 40, 56, 0, 138, 0, 'y', 36);
  b.cyl(D, 48, 26, 16, 0, 174, 0, 'y', 36); b.add(glow('#5fd8ff', 1.6), new THREE.CircleGeometry(44, 48).rotateX(-HP), mx(0, 182.5, 0), 0); b.tor(GC, 47, 0.8, 0, 183, 0, HP, 0, 0, 64, 5);
  // ── 天球儀: 黄金の環で組んだ籠。南極を塔が、赤道を 4 本の腕が支える ──
  const CY = 262, SR = 200;
  b.tor(GD, SR, 5.5, 0, CY, 0, HP, 0, 0, 160, 10);
  for (let k = 0; k < 3; k++) b.add(GD, new THREE.TorusGeometry(SR, 4.5, 8, 160), mx(0, CY, 0, 0, k * Math.PI / 3, 0));
  for (const s of [-1, 1]) { b.tor(GD, SR * Math.cos(0.62), 3, 0, CY + s * SR * Math.sin(0.62), 0, HP, 0, 0, 120, 8); b.cyl(GD, 9, 16, 14, 0, CY + s * (SR + 3), 0, 'y', 20); }
  b.cyl(D, 2, 2, 40, 0, CY + SR + 28, 0, 'y', 6); lights.push({ p: V(0, CY + SR + 50, 0), c: '#fff', s: 40, blink: 0.5, ph: 0 });
  for (let k = 0; k < 4; k++) {
    const a = (45 + k * 90) * RAD, c = Math.cos(a), s = Math.sin(a), pts = [[150, 14], [214, 60], [252, 150], [236, 226], [SR + 2, CY]].map(([r, y]) => V(c * r, y, s * r));
    b.add(H, new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 40, 8, 12, false)); b.add(A, new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts.slice(2)), 24, 8.5, 12, false));
    b.sph(A, 15, c * 150, 16, s * 150, 1, 0.7, 1, 16); b.sph(GD, 14, c * (SR + 2), CY, s * (SR + 2), 1, 1, 1, 16); b.sph(D, 11, pts[2].x, pts[2].y, pts[2].z, 1, 1, 1, 12);
    lights.push({ p: V(c * (SR + 18), CY, s * (SR + 18)), c: k % 2 ? '#3f6' : '#f33', s: 26, blink: 0.7, ph: k / 4 });
  }
  signs.push(sign('ATLAS', '#5dffa8', 13, 0, -24, 147.5), sign('アトラス救難基地', '#ffe6c8', 6.5, 0, -24, -147.5, Math.PI), sign('ATLAS', '#5dffa8', 13, 147.5, -24, 0, HP), sign('RESCUE', '#ffb060', 13, -147.5, -24, 0, -HP), sign('救難', '#5dffa8', 5, 0, -31, 321.6, 0, 0));
  const live = detailAtlas(b, { H, A, D, GD, signs }); // 艤装・灯火・交通 (stationdetail.js)
  const o = done(b, { ports: [p], radius: 480, lights, signs }), obj = o.obj;
  // 黄道環 (ゆっくり回る) と星
  const eb = new Builder(); eb.tor(GD, 216, 3.4, 0, 0, 0, HP, 0, 0, 160, 8); for (let i = 0; i < 12; i++) { const a = i * TAU / 12; eb.add(GD, new THREE.BoxGeometry(9, 9, 5), mx(Math.cos(a) * 216, 0, Math.sin(a) * 216, 0, -a, 0)); eb.add(glow(i % 3 ? '#ffe6a8' : '#8fe8ff', 4), new THREE.SphereGeometry(1.6, 8, 6), mx(Math.cos(a) * 222, 0, Math.sin(a) * 222), 0); }
  const ecl = eb.build(); ecl.position.y = CY; ecl.rotation.z = 0.41; obj.add(ecl);
  // ホログラムの地球儀
  const core = new THREE.Mesh(new THREE.SphereGeometry(60, 48, 32), new THREE.MeshBasicMaterial({ color: 0x010409 })), globe = new THREE.Mesh(new THREE.SphereGeometry(63, 64, 40), globeMat()), axis = new THREE.Group(); axis.position.y = CY; axis.rotation.z = 0.41; axis.add(core, globe); obj.add(axis);
  const cone = new THREE.Mesh(new THREE.CylinderGeometry(58, 42, 64, 40, 1, true), beamMat('#5fd8ff', 0.5)); cone.position.y = 213; obj.add(cone); spr(obj, '#5fc8ff', 420, 0.5, 0, CY, 0);
  // 救助船ミケーネ 15 機 (係留 / 発進 / 出動中)
  const fleet = instanced(buildMycenae(), N), M4 = new THREE.Matrix4(), Z0 = new THREE.Matrix4().makeScale(0, 0, 0), P = new THREE.Vector3(), P2 = new THREE.Vector3(), E = new THREE.Vector3(), up = V(0, 1, 0), tmp = new THREE.Object3D(); obj.add(fleet);
  const stat = cradle.map((c) => spr(obj, '#35ff8a', 13, 2.2, c.c * 281, 1.5, c.s * 281)), jets = cradle.map(() => { const s = spr(obj, '#9fe0ff', 30, 3, 0, 0, 0); s.visible = false; return s; });
  const home = cradle.map((c) => { tmp.position.copy(c.p); tmp.rotation.set(0, Math.atan2(-c.c, -c.s), 0); tmp.updateMatrix(); return tmp.matrix.clone(); });
  const path = (c, s, out) => out.copy(c.p).addScaledVector(c.out, 70 * (1 - Math.exp(-s / 2.2)) + s * 4).addScaledVector(up, 14 * (1 - Math.exp(-s / 3))).addScaledVector(E, s > 2.5 ? (s - 2.5) ** 2 * 7 : 0);
  let last = -1;
  o.anim.push((t) => {
    const n = rescueN(), T0 = G.space?.rescueT0 ?? -1e9, flying = t - T0 < 70 && n > 0; if (!flying && n === last) { for (let i = 0; i < N; i++) stat[i].material.opacity = i < n ? ((t * 1.2 + i * 0.13) % 1 < 0.3 ? 1 : 0.08) : 1; return; }
    last = flying ? -1 : n; const st = station('atlas'), bd = body('terra'); E.set(bd.pos[0] - st.pos[0], bd.pos[1] - st.pos[1], bd.pos[2] - st.pos[2]).normalize();
    for (let i = 0; i < N; i++) {
      const c = cradle[i], s = t - T0 - i * 1.1, out = i < n; stat[i].material.color.set(out ? '#ffb030' : '#35ff8a').multiplyScalar(2.2); jets[i].visible = false;
      if (!out || s < 0) fleet.userData.set(i, home[i]);
      else if (s > 48 || !flying) fleet.userData.set(i, Z0);
      else { path(c, s, P); path(c, s + 0.05, P2); tmp.position.copy(P); tmp.up.set(0, 1, 0); tmp.lookAt(P.x * 2 - P2.x, P.y * 2 - P2.y, P.z * 2 - P2.z); tmp.updateMatrix(); fleet.userData.set(i, tmp.matrix); // 機首 (-Z) を進行方向へ
        jets[i].visible = true; jets[i].position.copy(P).addScaledVector(P2.sub(P).normalize(), -15); jets[i].scale.setScalar(26 + Math.min(s, 20) * 5); }
    }
    fleet.userData.commit();
  });
  o.anim.push((t, dt) => { ecl.rotation.y += dt * 0.03; globe.rotation.y += dt * 0.06; });
  live(o);
  return o;
}

// ───────────────────────── 7. メガトン (巨大軌道都市) ─────────────────────────
/** 居住筒の窓の奥に見える街明かり */
function cityGlass() {
  const s = 1024, c = cv(s), x = c.getContext('2d'), r = rng(909); x.fillStyle = '#000'; x.fillRect(0, 0, s, s);
  const den = (i, j) => 0.5 + 0.5 * Math.sin(i * 0.41 + 1.3) * Math.cos(j * 0.33 + 0.7) + 0.35 * Math.sin(i * 0.13 - j * 0.19);
  for (let i = 0; i < 64; i++) for (let j = 0; j < 64; j++) {
    const d = den(i, j); if (d < 0.22) continue; const n = Math.floor(d * 9 + r() * 3);
    for (let k = 0; k < n; k++) { const v = 0.35 + r() * 0.65, t = r(); x.fillStyle = t < 0.72 ? `rgba(255,${190 + r() * 40 | 0},${110 + r() * 50 | 0},${v})` : t < 0.9 ? `rgba(170,225,255,${v})` : `rgba(255,90,220,${v})`; x.fillRect(i * 16 + 2 + r() * 11, j * 16 + 2 + r() * 11, 1 + r() * 2.2, 1 + r() * 2.2); }
  }
  x.globalAlpha = 0.55; for (let i = 0; i < 8; i++) { x.fillStyle = '#ffd9a0'; for (let k = 0; k < 128; k++) { x.fillRect(i * 128 + 62, k * 8 + 2, 3, 3); x.fillRect(k * 8 + 2, i * 128 + 62, 3, 3); } } x.globalAlpha = 1;
  const t = ctex(c, true); t.repeat.set(1, 8);
  const m = new THREE.MeshStandardMaterial({ color: 0x0a1626, roughness: 0.07, metalness: 1, envMapIntensity: 2.2, emissiveMap: t, emissive: 0xffffff, emissiveIntensity: 2.6 }); m.userData.uvs = 0;
  return m;
}
function radiatorMat() {
  const c = cv(512, 64), x = c.getContext('2d'), g = x.createLinearGradient(0, 0, 512, 0); g.addColorStop(0, '#ffb060'); g.addColorStop(0.25, '#ff5a1a'); g.addColorStop(0.65, '#8a1c08'); g.addColorStop(1, '#200604'); x.fillStyle = g; x.fillRect(0, 0, 512, 64);
  x.fillStyle = 'rgba(0,0,0,.75)'; for (let i = 0; i < 26; i++) x.fillRect(i * 20, 0, 3, 64); for (let j = 0; j < 4; j++) x.fillRect(0, j * 16, 512, 2);
  const m = new THREE.MeshStandardMaterial({ color: 0x1a1210, roughness: 0.7, metalness: 0.5, emissiveMap: ctex(c, true, false), emissive: 0xffffff, emissiveIntensity: 2.4 }); m.userData.uvs = 0; return m;
}
export const plasmaMat = () => new THREE.ShaderMaterial({ uniforms: { uTime: fxTime }, vertexShader: VS, fragmentShader: 'uniform float uTime;varying vec3 vP,vN,vV;' + NOISE + /* glsl */`
void main(){vec3 d=normalize(vP);float t=uTime*.1;float a=fbm3(d*3.+vec3(0.,t,t*.7));float b=fbm3(d*7.-vec3(t*1.3,0.,t)+a*2.);
  float v=smoothstep(.3,.8,a*.6+b*.6);float fr=pow(1.-abs(dot(vN,vV)),1.6);
  vec3 col=mix(vec3(1.,.24,.03),vec3(1.,.85,.45),v)*(1.1+v*3.4)+vec3(1.,.55,.2)*fr*2.6;gl_FragColor=vec4(col,1.);}` });

function megaton() {
  const U = 0.014, b = new Builder(), r = rng(4242), H = mat('hull', { color: 0x9aa0a8, rough: 0.62, metal: 0.45, uvs: U }), D = mat('hull', { color: 0x2a2e36, rough: 0.85, metal: 0.65, uvs: U }), W = winMat(0x7d838c, 0xffd9a0, 2.8, U), W2 = winMat(0xb4b8be, 0xcfe8ff, 2.4, U), WT = winMat(0x8a9098, 0xffd9a0, 2.8, 0.035), WT2 = winMat(0xaab0b8, 0xcfe8ff, 2.6, 0.035);
  const BR = metal(0xc8a04a, 0.3), MIR = Object.assign(new THREE.MeshStandardMaterial({ color: 0xd6dfee, roughness: 0.05, metalness: 1, envMapIntensity: 2.4 }), { userData: { uvs: 0 } }), CG = cityGlass(), RDM = radiatorMat(), Y = glow('#ffd27a', 4), O = glow('#ff9a3a', 4);
  const L = 2200, R = 250, WIN = [0, 120, 240].map((d) => d * RAD), LAND = [60, 180, 300].map((d) => d * RAD), lights = [], signs = [];
  const er = (a) => V(Math.cos(a), Math.sin(a), 0), et = (a) => V(-Math.sin(a), Math.cos(a), 0), ez = V(0, 0, 1);
  // ── 居住筒: 陸地 3 条と窓 3 条。窓の奥に街明かり ──
  for (let k = 0; k < 6; k++) b.add(k % 2 ? CG : W, new THREE.CylinderGeometry(R, R, L, 14, 1, true, k * Math.PI / 3, Math.PI / 3), mx(0, 0, 0, HP, 0, 0), k % 2 ? 0 : undefined);
  for (let i = 0; i <= 16; i++) b.tor(D, R + 2, 4.5, 0, 0, -L / 2 + i * L / 16, 0, 0, 0, 72, 6);
  for (const a of WIN) { for (const d of [-30, 30]) { const p = er(a + d * RAD).multiplyScalar(R + 3); b.add(D, new THREE.BoxGeometry(15, 15, L), mx(p.x, p.y, 0, 0, 0, a + d * RAD)); b.add(BR, new THREE.BoxGeometry(3, 3, L), mx(p.x * 1.035, p.y * 1.035, 0, 0, 0, a + d * RAD)); } for (const d of [-10, 10]) { const p = er(a + d * RAD).multiplyScalar(R + 1); b.add(D, new THREE.BoxGeometry(5, 5, L), mx(p.x, p.y, 0, 0, 0, a + d * RAD)); } }
  // 陸地の外壁に張り付く「外郭街」: 窓のともる塔と工場群
  for (const a0 of LAND) for (let i = 0; i < 84; i++) {
    const a = a0 + rr(r, -25, 25) * RAD, z = rr(r, -1040, 1040), tall = r() < 0.12, w = rr(r, 14, 44), d = rr(r, 16, 64), h = tall ? rr(r, 44, 96) : rr(r, 8, 28), p = er(a).multiplyScalar(R + h / 2 - 3);
    if (Math.abs(a - a0) < 22 * RAD && Math.abs(z) < 350) continue; // 巨大な船名と背板の場所は空けておく
    b.add(r() < 0.72 ? WT : r() < 0.5 ? WT2 : D, new THREE.BoxGeometry(w, h, d), mx(p.x, p.y, z, 0, 0, a - HP));
    if (h > 18) { const q = er(a).multiplyScalar(R + h - 1); b.add(D, new THREE.BoxGeometry(w * 0.5, 4, d * 0.45), mx(q.x, q.y, z, 0, 0, a - HP)); } // 屋上の機械室
    if (tall) { const nc = glow(['#4de1ff', '#ff5ad2', '#ffd27a'][i % 3], 2.6); for (const s of [-1, 1]) { const q = er(a).multiplyScalar(R + h * 0.5 - 3).addScaledVector(et(a), s * (w / 2 + 0.3)); b.add(nc, new THREE.BoxGeometry(0.7, h * 0.86, 0.7), mx(q.x, q.y, z + s * (d / 2 + 0.3), 0, 0, a - HP)); } } // 塔の角のネオン
    if (tall) { const q = er(a).multiplyScalar(R + h + 8); b.add(D, new THREE.CylinderGeometry(0.8, 0.8, 22, 5), mx(q.x, q.y, z, 0, 0, a - HP)); lights.push({ p: V(q.x * 1.03, q.y * 1.03, z), c: '#f33', s: 22, blink: 0.5, ph: r() }); }
  }
  for (const a0 of LAND) for (const d of [-27, 27]) { const p = er(a0 + d * RAD).multiplyScalar(R + 4); b.add(H, new THREE.CylinderGeometry(5, 5, L - 60, 10), mx(p.x, p.y, 0, HP, 0, 0)); b.add(Y, new THREE.BoxGeometry(1.2, 1.2, L - 80), mx(p.x * 1.03, p.y * 1.03, 0)); }
  LAND.forEach((a, i) => { const X = ez.clone().multiplyScalar(er(a).cross(ez).y > 0 ? 1 : -1), pl = er(a).multiplyScalar(R + 4); // 文字の上が +Y 側を向くように
    b.add(D, new THREE.BoxGeometry(170, 7, 640), mx(pl.x, pl.y, 0, 0, 0, a - HP)); for (const s of [-1, 1]) b.add(BR, new THREE.BoxGeometry(170, 9, 5), mx(pl.x, pl.y, s * 322, 0, 0, a - HP));
    signs.push(signOn(i === 1 ? 'メ ガ ト ン' : 'MEGATON', '#ffd27a', i === 1 ? 120 : 136, er(a).multiplyScalar(R + 12), X, er(a), { intensity: 3 })); });
  // ── 両端の蓋 ──
  b.cyl(H, 112, R, 130, 0, 0, L / 2 + 65, 'z', 72); b.cyl(H, R, 112, 130, 0, 0, -L / 2 - 65, 'z', 72); b.tor(BR, R - 6, 5, 0, 0, L / 2 + 8, 0, 0, 0, 72, 6); b.tor(BR, R - 6, 5, 0, 0, -L / 2 - 8, 0, 0, 0, 72, 6);
  // ── 採光ミラー 3 枚 (窓の上に開く巨大な鏡) ──
  const TH = 28 * RAD, LM = 1150;
  for (const a of WIN) {
    const l = er(a).multiplyScalar(Math.sin(TH)).addScaledVector(ez, -Math.cos(TH)), n = er(a).multiplyScalar(Math.cos(TH)).addScaledVector(ez, Math.sin(TH)), t = et(a), hinge = er(a).multiplyScalar(R + 14).addScaledVector(ez, 780), c = hinge.clone().addScaledVector(l, LM / 2), B4 = new THREE.Matrix4().makeBasis(t, n, l);
    b.add(MIR, new THREE.BoxGeometry(214, 4, LM), B4.clone().setPosition(c), 0);
    for (const s of [-1, 1]) b.add(D, new THREE.BoxGeometry(9, 9, LM), B4.clone().setPosition(c.clone().addScaledVector(n, 7).addScaledVector(t, s * 100)));
    for (let i = 0; i <= 8; i++) b.add(D, new THREE.BoxGeometry(214, 7, 7), B4.clone().setPosition(hinge.clone().addScaledVector(l, i * LM / 8).addScaledVector(n, 6)));
    for (const s of [-1, 1]) for (const [zh, k] of [[420, 0.42], [-60, 0.82]]) strut(b, D, er(a).multiplyScalar(R).addScaledVector(ez, zh).addScaledVector(t, s * 80), hinge.clone().addScaledVector(l, LM * k).addScaledVector(t, s * 96), 4.5);
    b.add(H, new THREE.CylinderGeometry(10, 10, 230, 12), new THREE.Matrix4().makeBasis(n, t, l.clone().negate()).setPosition(hinge));
    lights.push({ p: hinge.clone().addScaledVector(l, LM + 6), c: '#f33', s: 46, blink: 0.45, ph: a }, { p: hinge.clone().addScaledVector(l, LM + 6).addScaledVector(t, 100), c: '#fff', s: 30, blink: 0.9, ph: a + 0.3 }, { p: hinge.clone().addScaledVector(l, LM + 6).addScaledVector(t, -100), c: '#fff', s: 30, blink: 0.9, ph: a + 0.6 });
  }
  // ── 前端: ドッキング塔と港湾ホイール ──
  b.cyl(W2, 56, 66, 300, 0, 0, 1380, 'z', 40); b.cyl(D, 70, 70, 10, 0, 0, 1245, 'z', 40); b.cyl(D, 40, 58, 22, 0, 0, 1541, 'z', 32); b.tor(Y, 59, 0.9, 0, 0, 1528, 0, 0, 0, 64, 5);
  b.tor(H, 176, 15, 0, 0, 1330, 0, 0, 0, 96, 10); b.tor(Y, 192, 1, 0, 0, 1330, 0, 0, 0, 96, 5);
  for (let i = 0; i < 6; i++) { const a = i * Math.PI / 3 + 0.3, e = er(a); strut(b, H, e.clone().multiplyScalar(60).setZ(1330), e.clone().multiplyScalar(164).setZ(1330), 7); const p = e.clone().multiplyScalar(196);
    b.add(WT, new THREE.BoxGeometry(44, 30, 56), mx(p.x, p.y, 1330, 0, 0, a - HP)); b.add(D, new THREE.BoxGeometry(48, 4, 60), mx(p.x * 1.085, p.y * 1.085, 1330, 0, 0, a - HP));
    if (i % 2 === 0) { const q = e.clone().multiplyScalar(232); b.add(H, new THREE.BoxGeometry(26, 18, 92), mx(q.x, q.y, 1352, 0, 0, a - HP)); b.add(D, new THREE.BoxGeometry(30, 10, 30), mx(q.x * 1.05, q.y * 1.05, 1320, 0, 0, a - HP)); for (const k of [-1, 1]) b.add(BR, new THREE.BoxGeometry(11, 13, 24), mx(q.x + et(a).x * k * 8, q.y + et(a).y * k * 8, 1404, 0, 0, a - HP)); b.add(O, new THREE.BoxGeometry(18, 8, 1), mx(q.x, q.y, 1306.4, 0, 0, a - HP)); } // 係留中の貨物船
    lights.push({ p: V(p.x * 1.12, p.y * 1.12, 1330), c: i % 2 ? '#f33' : '#fff', s: 26, blink: 0.6, ph: i / 6 }); }
  b.add(H, new THREE.CylinderGeometry(46, 6, 18, 28, 1, true), mx(0, 120, 1470, 0.5, 0, 0)); strut(b, D, V(0, 60, 1450), V(0, 112, 1466), 4);
  const p = port(b, D, V(0, 0, 1556), V(0, 0, 1), '#ffd27a');
  for (let i = 0; i < 8; i++) lights.push({ p: V(0, 0, 1590 + i * 45), c: '#4f8', s: 18, blink: 1, ph: 1 - i / 8 });
  signs.push(sign('MEGATON 第 7 ドック', '#ffd27a', 16, 0, 78, 1400, HP, 0), sign('MEGATON 第 7 ドック', '#ffd27a', 16, 0, -78, 1400, -HP, 0));
  // ── 後端: 放熱板とメガトン炉 ──
  b.cyl(D, 62, 62, 200, 0, 0, -1330, 'z', 32); for (let i = 0; i < 4; i++) { const e = er(i * HP + 0.785).multiplyScalar(88); b.add(H, new THREE.CylinderGeometry(15, 15, 250, 14), mx(e.x, e.y, -1345, HP, 0, 0)); for (const z of [-1250, -1340, -1430]) b.tor(BR, 16, 2.4, e.x, e.y, z, 0, 0, 0, 20, 6); }
  for (const [len, ang] of [[800, 0], [800, Math.PI], [520, HP], [520, -HP]]) {
    b.add(RDM, new THREE.BoxGeometry(len, 5, 300).translate(len / 2 + 86, 0, 0).rotateZ(ang), mx(0, 0, -1320), 0);
    for (const y of [-5.5, 5.5]) b.add(D, new THREE.BoxGeometry(len, 6, 9).translate(len / 2 + 86, y, 0).rotateZ(ang), mx(0, 0, -1320)); for (const z of [-148, 148]) b.add(D, new THREE.BoxGeometry(len, 8, 8).translate(len / 2 + 86, 0, z).rotateZ(ang), mx(0, 0, -1320));
    b.add(D, new THREE.BoxGeometry(8, 9, 300).translate(len + 86, 0, 0).rotateZ(ang), mx(0, 0, -1320)); const tp = V(len + 96, 0, 0).applyAxisAngle(ez, ang); lights.push({ p: V(tp.x, tp.y, -1320), c: '#f33', s: 40, blink: 0.5, ph: ang });
  }
  const Z0 = -1600, RR = 168;
  for (let k = 0; k < 4; k++) b.add(D, new THREE.TorusGeometry(RR + 13, 8.5, 8, 96).rotateY(HP), mx(0, 0, Z0, 0, 0, k * Math.PI / 4));
  b.tor(D, RR + 14, 10, 0, 0, Z0, 0, 0, 0, 96, 8); for (const s of [-1, 1]) { b.tor(D, Math.sqrt((RR + 14) ** 2 - 96 ** 2), 9, 0, 0, Z0 + s * 96, 0, 0, 0, 80, 8); b.tor(O, Math.sqrt((RR + 14) ** 2 - 96 ** 2) + 10, 1.2, 0, 0, Z0 + s * 96, 0, 0, 0, 80, 5); }
  b.add(D, new THREE.SphereGeometry(RR + 18, 40, 10, 0, TAU, 0, 0.62).rotateX(HP), mx(0, 0, Z0)); b.add(D, new THREE.SphereGeometry(RR + 18, 40, 10, 0, TAU, 0, 0.5).rotateX(-HP), mx(0, 0, Z0));
  b.cyl(D, 62, 96, 70, 0, 0, Z0 - RR - 40, 'z', 40, true); b.cyl(H, 97, 102, 12, 0, 0, Z0 - RR - 78, 'z', 40, true); b.tor(O, 100, 1.6, 0, 0, Z0 - RR - 84, 0, 0, 0, 64, 5);
  b.tor(BR, RR + 30, 3.5, 0, 0, Z0, 0, 0, 0, 96, 6);
  for (let i = 0; i < 6; i++) { const e = er(i * Math.PI / 3 + 0.26); lights.push({ p: e.clone().multiplyScalar(RR + 40).setZ(Z0), c: '#fa4', s: 34, blink: 0.4, ph: i / 6 }); }
  // ── 両端の回転居住リング (互いに逆回転) ──
  const rings = [940, -940].map((z, ri) => {
    const rb = new Builder(), RG = 640;
    rb.tor(ri ? W2 : W, RG, 46, 0, 0, 0, 0, 0, 0, 220, 14); rb.tor(D, RG + 43, 13, 0, 0, 0, 0, 0, 0, 220, 6); rb.tor(D, RG - 43, 10, 0, 0, 0, 0, 0, 0, 180, 6);
    for (const dz of [-20, 20]) { rb.tor(Y, RG + 55, 1.5, 0, 0, dz, 0, 0, 0, 220, 5); rb.tor(Y, RG - 52, 1.2, 0, 0, dz, 0, 0, 0, 180, 5); }
    rb.cyl(D, R + 14, R + 14, 84, 0, 0, 0, 'z', 72, true); rb.cyl(BR, R + 16, R + 16, 8, 0, 0, 36, 'z', 72, true); rb.cyl(BR, R + 16, R + 16, 8, 0, 0, -36, 'z', 72, true);
    for (let i = 0; i < 6; i++) { const a = i * Math.PI / 3, e = er(a); rb.add(H, new THREE.CylinderGeometry(15, 20, 336, 14), mx(e.x * 430, e.y * 430, 0, 0, 0, a - HP)); rb.add(WT, new THREE.BoxGeometry(36, 52, 36), mx(e.x * 500, e.y * 500, 0, 0, 0, a - HP)); rb.add(D, new THREE.BoxGeometry(60, 70, 64), mx(e.x * 598, e.y * 598, 0, 0, 0, a - HP));
      for (const s of [-1, 1]) strut(rb, D, e.clone().multiplyScalar(R + 12).addScaledVector(et(a), s * 60), e.clone().multiplyScalar(590).addScaledVector(et(a), s * 12), 3); }
    const RF = detailMegaRing(rb, { D, WT, BR, R, er, et, ez });
    const g = rb.build(); g.position.z = z; g.add(lightField(RF));
    for (let i = 0; i < 12; i++) { const e = er(i * Math.PI / 6 + 0.26); lights.push({ p: e.multiplyScalar(RG + 62), c: i % 2 ? '#f44' : '#fff', s: 44, blink: 0.5, ph: i / 12, parent: g }); }
    return g;
  });
  const live = detailMegaton(b, { H, D, WT, BR, Y, L, R, WIN, LAND, er, et, ez }); // 艤装・灯火・交通 (stationdetail.js)
  const o = done(b, { ports: [p], radius: 1800, reach: 2700, dockR: 4600, lights, signs }), obj = o.obj; obj.add(...rings);
  const core = new THREE.Mesh(new THREE.SphereGeometry(RR, 64, 40), plasmaMat()); core.position.z = Z0; obj.add(core); spr(obj, '#ff8a2a', 1500, 0.55, 0, 0, Z0); spr(obj, '#ffd9a0', 620, 0.7, 0, 0, Z0);
  // 筒の周りを行き交う連絡艇の灯
  const cars = []; for (let i = 0; i < 16; i++) cars.push({ s: spr(obj, i % 3 ? '#ffe2b0' : '#9fe0ff', 20, 2.2, 0, 0, 0), a: WIN[i % 3] + rr(r, -0.4, 0.4), rad: R + rr(r, 60, 150), sp: rr(r, 50, 120) * (i % 2 ? 1 : -1), ph: r() * 2600 });
  o.anim.push((t, dt) => { rings[0].rotation.z += dt * 0.018; rings[1].rotation.z -= dt * 0.018; core.rotation.z += dt * 0.02;
    for (const c of cars) { const z = ((((t * c.sp + c.ph) % 2600) + 2600) % 2600) - 1300; c.s.position.set(Math.cos(c.a) * c.rad, Math.sin(c.a) * c.rad, z); } });
  live(o, rings, core);
  return o;
}

// ───────────────────────── 8. ファイザー (二重らせんの創薬研究ステーション) ─────────────────────────
function fizer() {
  const U = 0.04, b = new Builder(), H = mat('hull', { color: 0xf4f6f8, rough: 0.5, metal: 0.25, uvs: U }), W = winMat(0xeef1f4, 0xd8f0ff, 2.4, U), D = mat('hull', { color: 0x3c4250, rough: 0.8, metal: 0.6, uvs: U }), VI = mat('hull', { color: 0x9a6cf4, rough: 0.4, metal: 0.4, uvs: U }), S = mat('solar', { metal: 0.9, env: 1.6 });
  const GDm = metal(0xd9b25a, 0.26), GV = glow('#b48cff', 3.4), GT = glow('#4dffd8', 2.6), lights = [], signs = [];
  const GLS = Object.assign(new THREE.MeshStandardMaterial({ color: 0x9fe0ff, roughness: 0.04, metalness: 0.2, transparent: true, opacity: 0.22, depthWrite: false, envMapIntensity: 2.2 }), { userData: { uvs: 0 } });
  const RH = 58, PITCH = 150, Y0 = -170, Y1 = 170, TURN = (Y1 - Y0) / PITCH * TAU, hp = (t, ph, rad = RH) => V(Math.cos(t * TURN + ph) * rad, Y0 + (Y1 - Y0) * t, Math.sin(t * TURN + ph) * rad);
  // ── 二重らせん (回転する): 2 本の居住鎖と、4 色の塩基対を模した連絡橋 ──
  const hb = new Builder(), PAIR = [['#ff5a6a', '#4de1ff'], ['#ffd23a', '#5dff8a'], ['#4de1ff', '#ff5a6a'], ['#5dff8a', '#ffd23a']], rnd = rng(77);
  class Helix extends THREE.Curve { constructor(ph) { super(); this.ph = ph; } getPoint(t, o = new THREE.Vector3()) { return o.copy(hp(t, this.ph)); } }
  const LEN = Math.hypot(TAU * RH, PITCH) * (Y1 - Y0) / PITCH;
  for (const ph of [0, Math.PI]) {
    const g = new THREE.TubeGeometry(new Helix(ph), 240, 8.5, 14, false), uv = g.attributes.uv; for (let i = 0; i < uv.count; i++) uv.setXY(i, uv.getX(i) * LEN * U, uv.getY(i) * 53 * U); hb.add(W, g, null, 0);
    for (const t of [0, 1]) { const e = hp(t, ph); hb.sph(H, 12, e.x, e.y, e.z, 1, 1, 1, 18); hb.sph(GV, 2.2, e.x * 1.2, e.y + (t ? 9 : -9), e.z * 1.2, 1, 1, 1, 8); }
  }
  const NR = 27, rungs = [];
  for (let i = 0; i < NR; i++) {
    const t = (i + 0.5) / NR, a = hp(t, 0), c = hp(t, Math.PI), mid = a.clone().add(c).multiplyScalar(0.5), pi = Math.floor(rnd() * 4), pr = PAIR[pi], ang = t * TURN; rungs.push({ a, c, mid, gc: pi % 2 === 1 });
    strut(hb, glow(pr[0], 1.7), a.clone().lerp(mid, 0.16), mid.clone().lerp(a, 0.24), 3.1, 3.1, 10); strut(hb, glow(pr[1], 1.7), c.clone().lerp(mid, 0.16), mid.clone().lerp(c, 0.24), 3.1, 3.1, 10);
    for (const e of [a, c]) { hb.add(W, new THREE.SphereGeometry(11.5, 16, 12), mx(e.x, e.y, e.z)); hb.add(D, new THREE.CylinderGeometry(4.2, 4.2, 8, 10), new THREE.Matrix4().makeRotationY(-ang).multiply(new THREE.Matrix4().makeRotationZ(HP)).setPosition(e.clone().lerp(mid, 0.14))); }
    hb.add(D, new THREE.CylinderGeometry(15.5, 15.5, 5, 20), mx(0, mid.y, 0));
  }
  const HF = detailFizerHelix(hb, { H, D, hp, rungs }); // 鎖の継手・ドッキング口・水素結合の灯 (stationdetail2.js)
  const helix = hb.build(); helix.add(lightField(HF));
  // ── 中心の培養管 (ガラスの塔に光る培養液) ──
  b.cyl(GT, 6.5, 6.5, Y1 - Y0 + 20, 0, 0, 0, 'y', 16); b.add(GLS, new THREE.CylinderGeometry(12.5, 12.5, Y1 - Y0 + 24, 28, 1, true), null, 0);
  for (let y = Y0 - 10; y <= Y1 + 10; y += 34) b.cyl(D, 13.4, 13.4, 2.2, 0, y, 0, 'y', 28);
  // ── 上: カプセル型の居住棟 (白と紫のツートン) ──
  const CY = 262, CR = 42, CL = 76;
  b.cyl(D, 17, 20, 40, 0, 198, 0, 'y', 20); b.cyl(H, 30, 24, 10, 0, 220, 0, 'y', 28); b.tor(GV, 31, 0.7, 0, 224, 0, HP, 0, 0, 48, 5);
  b.add(W, new THREE.CylinderGeometry(CR, CR, CL, 48, 1, true), mx(-CL / 2, CY, 0, 0, 0, HP)); b.add(H, new THREE.SphereGeometry(CR, 48, 20, 0, TAU, 0, HP), mx(-CL, CY, 0, 0, 0, HP));
  b.add(VI, new THREE.CylinderGeometry(CR, CR, CL, 48, 1, true), mx(CL / 2, CY, 0, 0, 0, HP)); b.add(VI, new THREE.SphereGeometry(CR, 48, 20, 0, TAU, 0, HP), mx(CL, CY, 0, 0, 0, -HP));
  b.add(GDm, new THREE.CylinderGeometry(CR + 1.2, CR + 1.2, 5, 48, 1, true), mx(0, CY, 0, 0, 0, HP)); for (const x of [-3.4, 3.4]) b.add(GV, new THREE.TorusGeometry(CR + 1.6, 0.5, 5, 72).rotateY(HP), mx(x, CY, 0));
  for (const x of [22, 44, 66]) b.add(glow('#e8d8ff', 2.6), new THREE.TorusGeometry(CR + 0.5, 0.9, 5, 72, Math.PI * 0.6).rotateY(HP), mx(x, CY, 0, 0.94, 0, 0)); // 紫側の展望窓の帯
  for (const s of [-1, 1]) { b.box(GV, 16, 4.6, 0.8, -64, CY, s * (CR + 0.3)); b.box(GV, 4.6, 16, 0.8, -64, CY, s * (CR + 0.3)); } // 側面の十字
  for (const s of [-1, 1]) { b.add(D, new THREE.CylinderGeometry(1.8, 1.8, 150, 8), mx(0, 232, s * 100, HP, 0, 0)); for (let k = 0; k < 3; k++) { b.box(S, 62, 0.8, 40, 0, 232, s * (60 + k * 44), 0, 0.42 * s, 0); b.box(GDm, 63, 1.2, 1, 0, 232 - s * 0, s * (40.4 + k * 44)); } lights.push({ p: V(0, 232, s * 180), c: s > 0 ? '#3f6' : '#f33', s: 20, blink: 0.7, ph: 0 }); }
  b.cyl(D, 1, 1, 46, 30, CY + CR + 20, 0, 'y', 6); b.add(H, new THREE.CylinderGeometry(15, 2, 7, 20, 1, true), mx(-52, CY + CR + 8, 0, 0.3, 0, 0.3)); lights.push({ p: V(30, CY + CR + 45, 0), c: '#fff', s: 26, blink: 0.5, ph: 0.3 });
  // ── 下: ベンゼン環の基部 (6 基の球形タンク) ──
  const BY = -222, BRR = 96;
  b.cyl(D, 20, 17, 34, 0, -196, 0, 'y', 20); b.cyl(H, 34, 34, 30, 0, BY, 0, 'y', 6); b.cyl(D, 36, 36, 5, 0, BY + 16, 0, 'y', 6); b.cyl(D, 36, 36, 5, 0, BY - 16, 0, 'y', 6);
  for (let k = 0; k < 6; k++) {
    const a = k * Math.PI / 3, a2 = a + Math.PI / 3, p0 = V(Math.cos(a) * BRR, BY, Math.sin(a) * BRR), p1 = V(Math.cos(a2) * BRR, BY, Math.sin(a2) * BRR);
    b.sph(k % 2 ? VI : H, 25, p0.x, p0.y, p0.z, 1, 1, 1, 28); b.tor(GDm, 25.4, 1.3, p0.x, p0.y, p0.z, HP, 0, 0, 36, 6); b.tor(k % 2 ? glow('#e8d8ff', 2.4) : GT, 25.9, 0.4, p0.x, p0.y + 4, p0.z, HP, 0, 0, 36, 5);
    strut(b, D, V(0, BY, 0), p0, 3.6);
    if (k % 2) { const off = V(0, 5, 0); strut(b, H, p0.clone().add(off), p1.clone().add(off), 3.2); strut(b, H, p0.clone().sub(off), p1.clone().sub(off), 3.2); } else strut(b, H, p0, p1, 5); // 交互に二重結合
    lights.push({ p: V(p0.x * 1.3, BY, p0.z * 1.3), c: k % 2 ? '#c9a0ff' : '#4dffd8', s: 18, k: 1.8 });
  }
  const p = port(b, D, V(0, BY - 21, 0), V(0, -1, 0), '#c9a0ff');
  for (let i = 0; i < 6; i++) lights.push({ p: V(0, BY - 50 - i * 40, 0), c: '#4f8', s: 14, blink: 1, ph: 1 - i / 6 });
  signs.push(sign('FIZER', '#c9a0ff', 20, -30, CY + 12, CR + 1.4, 0, 0), sign('ファイザー 医療・創薬研究', '#ffffff', 6.5, -30, CY - 13, CR + 1.2, 0, 0), sign('FIZER', '#c9a0ff', 20, -30, CY + 12, -CR - 1.4, Math.PI, 0), sign('ファイザー 医療・創薬研究', '#ffffff', 6.5, -30, CY - 13, -CR - 1.2, Math.PI, 0));
  const live = detailFizer(b, { H, D, VI, GDm, GV, GT, signs, NOISE, VS }); // 艤装・灯火・交通 (stationdetail2.js)
  const o = done(b, { ports: [p], radius: 330, lights, signs }); o.obj.add(helix); spr(o.obj, '#4dffd8', 300, 0.35, 0, 0, 0);
  o.anim.push((t, dt) => { helix.rotation.y -= dt * 0.045; });
  live(o, helix);
  return o;
}

// ───────────────────────── 9. ウェポン (電磁投射砲) ─────────────────────────
function weapon() {
  const U = 0.05, b = new Builder(), r = rng(1337), H = mat('hull', { color: 0x4a505a, rough: 0.6, metal: 0.6, uvs: U }), D = mat('hull', { color: 0x1e2127, rough: 0.82, metal: 0.7, uvs: U }), Y = mat('hull', { color: 0xf2b90a, rough: 0.55, metal: 0.3, uvs: U }), W = winMat(0x40454e, 0xffd0a0, 2.2, U), RL = metal(0x8a929e, 0.34), CU = metal(0xc8743a, 0.32);
  const GR = glow('#ff3a2a', 4), lights = [], signs = [];
  // ── 砲身: 2 本のレールと 9 基の加速環 ──
  const ZM = -300, ZB = -30, NRING = 9, PERIOD = 22, ringM = [];
  for (const s of [-1, 1]) { b.box(RL, 7, 13, ZB - ZM, s * 9.5, 0, (ZM + ZB) / 2); b.box(D, 3, 17, ZB - ZM - 6, s * 14.5, 0, (ZM + ZB) / 2); b.box(CU, 1.2, 9, ZB - ZM - 4, s * 5.6, 0, (ZM + ZB) / 2); b.box(Y, 7.2, 13.2, 9, s * 9.5, 0, ZM + 4.5); }
  for (const y of [-1, 1]) { b.box(D, 22, 3, ZB - ZM - 10, 0, y * 10.5, (ZM + ZB) / 2 + 4); for (let z = ZM + 16; z < ZB; z += 18) b.box(H, 26, 1.6, 5, 0, y * 12.6, z); }
  const rg = new THREE.Group();
  for (let i = 0; i < NRING; i++) {
    const z = ZB - 18 - i * (ZB - ZM - 30) / (NRING - 1), m = new THREE.MeshBasicMaterial({ color: new THREE.Color('#8fe8ff').multiplyScalar(0.4), toneMapped: false }); ringM.push({ m, z });
    for (const s of [-1, 1]) { b.box(D, 6, 44, 9, s * 20, 0, z); b.box(D, 46, 6, 9, 0, s * 19, z); b.box(Y, 6.4, 8, 9.4, s * 20, 14, z); b.box(Y, 6.4, 8, 9.4, s * 20, -14, z); }
    for (const [w, h, x, y] of [[1.2, 30, 16.6, 0], [1.2, 30, -16.6, 0], [30, 1.2, 0, 15.6], [30, 1.2, 0, -15.6]]) { const q = new THREE.Mesh(new THREE.BoxGeometry(w, h, 7), m); q.position.set(x, y, z); rg.add(q); }
    if (i % 2 === 0) for (const s of [-1, 1]) { b.add(CU, new THREE.CylinderGeometry(5, 5, 12, 14), mx(s * 28, 0, z, 0, 0, HP)); b.add(D, new THREE.CylinderGeometry(6, 6, 2, 14), mx(s * 34, 0, z, 0, 0, HP)); }
  }
  b.box(D, 34, 34, 14, 0, 0, ZM - 2); b.box(Y, 36, 4, 14.4, 0, 19, ZM - 2); b.box(Y, 36, 4, 14.4, 0, -19, ZM - 2); for (const s of [-1, 1]) b.box(H, 5, 26, 30, s * 22, 0, ZM - 14);
  // ── 機関部 (装甲ブロック) ──
  b.box(H, 92, 60, 112, 0, 0, 32); b.box(D, 98, 8, 118, 0, 30, 32); b.box(D, 98, 8, 118, 0, -30, 32); b.box(D, 70, 44, 20, 0, 0, -28);
  for (const s of [-1, 1]) { b.box(D, 6, 48, 100, s * 47, 0, 32); for (let i = 0; i < 6; i++) b.box(Y, 0.8, 5, 8, s * 50.2, -16, -8 + i * 16, 0, 0, 0.6 * s); b.box(GR, 0.6, 1.2, 96, s * 50.2, 21, 32); }
  for (let i = 0; i < 7; i++) b.box(D, 84, 3, 4, 0, 35.5, -14 + i * 15);
  // 艦橋塔・索敵マスト
  b.box(W, 30, 40, 34, 0, 54, 44); b.box(D, 36, 5, 40, 0, 76, 44); b.box(W, 22, 12, 26, 0, 84, 44); b.box(glow('#ffe6c0', 2.4), 22.4, 3, 20, 0, 85, 40); b.cyl(D, 1.2, 2, 46, 0, 112, 50, 'y', 6); b.add(RL, new THREE.CylinderGeometry(15, 2, 6, 20, 1, true), mx(-9, 96, 54, 0.3, 0.5, 0.4)); b.box(D, 14, 2, 3, 0, 124, 50);
  lights.push({ p: V(0, 136, 50), c: '#f33', s: 30, blink: 0.5, ph: 0 });
  // 蓄電器 (両舷)・冷却フィン
  for (const s of [-1, 1]) {
    b.cyl(H, 17, 17, 96, s * 66, 0, 30, 'z', 24); b.cyl(D, 18.5, 18.5, 5, s * 66, 0, -16, 'z', 24); b.cyl(D, 18.5, 18.5, 5, s * 66, 0, 76, 'z', 24);
    for (let i = 0; i < 6; i++) { b.tor(CU, 18, 1.6, s * 66, 0, -4 + i * 13.5, 0, 0, 0, 28, 6); }
    for (let i = 0; i < 9; i++) b.box(D, 22, 0.8, 80, s * 96, -20 + i * 5, 30, 0, 0, s * 0.0);
    b.box(D, 16, 46, 6, s * 90, 0, 30);
  }
  // 弾倉ドラム (下面)・近接防御砲
  b.cyl(H, 27, 27, 74, 0, -48, 30, 'z', 12); b.cyl(D, 29, 29, 6, 0, -48, -8, 'z', 12); b.cyl(D, 29, 29, 6, 0, -48, 68, 'z', 12);
  for (let i = 0; i < 8; i++) { const a = i * TAU / 8; b.add(D, new THREE.CylinderGeometry(5.5, 5.5, 4, 12), mx(Math.cos(a) * 17, -48 + Math.sin(a) * 17, -11.5, HP, 0, 0)); b.add(GR, new THREE.CircleGeometry(3.8, 12), mx(Math.cos(a) * 17, -48 + Math.sin(a) * 17, -13.6, 0, Math.PI, 0), 0); }
  for (const [x, y, z] of [[-34, 38, -2], [34, 38, -2], [-34, 38, 72], [34, 38, 72]]) { b.cyl(D, 6, 7.5, 6, x, y, z, 'y', 12); b.sph(H, 5.6, x, y + 4, z, 1, 1, 1, 14); for (const o2 of [-1.4, 1.4]) b.add(D, new THREE.CylinderGeometry(0.6, 0.8, 18, 6), mx(x + o2, y + 5, z - 10, HP, 0, 0)); }
  // 反動相殺スラスター (後面)
  for (const [x, y] of [[-26, 14], [26, 14], [-26, -14], [26, -14]]) { b.cyl(D, 11, 9, 16, x, y, 96, 'z', 20, true); b.add(D, new THREE.CylinderGeometry(4, 9, 12, 20, 1, true), mx(x, y, 94, HP, 0, 0)); b.add(glow('#ff8a3a', 1.6), new THREE.CircleGeometry(7.4, 20), mx(x, y, 92, 0, 0, 0), 0); }
  b.box(Y, 30, 6, 2, 0, 0, 89);
  // ドッキングアーム (右舷)
  b.box(D, 78, 12, 12, 130, -10, 30); b.box(H, 20, 22, 22, 172, -10, 30); b.box(Y, 21, 3, 23, 172, 1.5, 30);
  const p = port(b, D, V(183, -10, 30), V(1, 0, 0), '#ffe14d');
  for (let i = 0; i < 6; i++) lights.push({ p: V(212 + i * 40, -10, 30), c: '#4f8', s: 14, blink: 1, ph: 1 - i / 6 });
  for (const s of [-1, 1]) lights.push({ p: V(s * 24, 0, ZM - 12), c: '#f33', s: 20, blink: 1.2, ph: s * 0.25 });
  // 標的の小惑星 (砲口の先 1.5km)。命中痕が赤熱している
  const TZ = -1500, RK = mat('rock', { color: 0x5a4a40, rough: 1, metal: 0.05, uvs: 0.012, ns: 1.6 });
  b.add(RK, rockGeo(60, 4, 91, 0.4), mx(0, 0, TZ)); for (let i = 0; i < 9; i++) b.add(RK, rockGeo(rr(r, 3, 12), 2, 40 + i, 0.4), mx(rr(r, -150, 150), rr(r, -110, 110), TZ + rr(r, -60, 140)));
  b.add(glow('#ff5a1e', 2.6), new THREE.CircleGeometry(15, 20), mx(0, 2, TZ + 55.5), 0); b.add(glow('#ffd9a0', 5), new THREE.CircleGeometry(5, 14), mx(0, 2, TZ + 55.8), 0);
  signs.push(sign('WEAPON', '#ffe14d', 14, 50.8, 7, 32, HP, 0), sign('WEAPON', '#ffe14d', 14, -50.8, 7, 32, -HP, 0), sign('兵器試験場', '#ffd0a0', 5.5, 50.8, -5, 32, HP, 0), sign('兵器試験場', '#ffd0a0', 5.5, -50.8, -5, 32, -HP, 0), sign('WEAPON', '#ffe14d', 12, 0, 60, 61.4, 0, 0), sign('⚠ 射線注意 FIRING LINE', '#ff5a3a', 7, 0, 30, ZM - 9.4, Math.PI, 0));
  const live = detailWeapon(b, { H, D, Y, RL, CU, GR, RK, ZM, TZ, PERIOD, signs }); // 艤装・灯火・試射の演出 (stationdetail2.js)
  const o = done(b, { ports: [p], radius: 330, reach: 1700, lights, signs }), obj = o.obj; obj.add(rg);
  // 試射: 加速環が順に点灯 → 弾体が砲口から飛び出し、標的に着弾
  const beam = new THREE.Mesh(new THREE.CylinderGeometry(1.6, 1.6, 1, 8, 1, true).rotateX(HP), new THREE.MeshBasicMaterial({ color: new THREE.Color(3, 6, 8), ...ADD, toneMapped: false, side: THREE.DoubleSide })), slug = spr(obj, '#cfefff', 60, 5, 0, 0, 0), muzzle = spr(obj, '#9fe0ff', 10, 4, 0, 0, ZM - 12), hit = spr(obj, '#ffb060', 10, 4, 0, 2, TZ + 60), heat = spr(obj, '#ff7a2a', 70, 0.7, 0, 2, TZ + 58);
  beam.visible = slug.visible = false; obj.add(beam); const D0 = TZ + 58 - ZM;
  let fired = false;
  o.anim.push((t) => {
    const k = t % PERIOD, ch = k > PERIOD - 4 ? (k - (PERIOD - 4)) / 4 : 0, f = k < 2.5 ? k : -1; // 充電 4 秒 → 発射
    ringM.forEach((q, i) => { const on = ch > 0 ? Math.max(0, Math.min(1, ch * NRING * 1.15 - i)) : f >= 0 ? Math.max(0, 1 - f * 1.4) : 0; q.m.color.set('#8fe8ff').multiplyScalar(0.35 + on * 6 + (ch > 0.9 ? Math.sin(t * 60) * 1.5 : 0)); });
    muzzle.scale.setScalar(f >= 0 ? 30 + 380 * Math.exp(-f * 5) : 10 + ch * 60); muzzle.material.opacity = f >= 0 ? Math.exp(-f * 2.5) : ch;
    const sl = f >= 0 && f < 0.32; slug.visible = sl; if (sl) slug.position.set(0, 0, ZM + D0 * (f / 0.32));
    beam.visible = f >= 0 && f < 1.8; if (beam.visible) { const d = Math.min(1, f / 0.32) * D0; beam.scale.set(1 + f * 2.5, 1 + f * 2.5, Math.max(1, -d)); beam.position.set(0, 0, ZM + d / 2); beam.material.opacity = Math.exp(-f * 2.6); }
    const im = f >= 0.32 ? f - 0.32 : -1; hit.scale.setScalar(im >= 0 ? 60 + 700 * Math.exp(-im * 3.5) : 1); hit.material.opacity = im >= 0 ? Math.exp(-im * 1.8) : 0; heat.material.opacity = 0.5 + (im >= 0 ? Math.exp(-im * 0.6) * 0.5 : 0);
    // 射線に入った機体は巻き込まれる
    if (f >= 0 && !fired) { fired = true; const sp = G.space, pl = sp?.pl; if (pl && !pl.docked && G.mode === sp) { const l = pl.pos.clone().sub(obj.position); if (Math.hypot(l.x, l.y) < 26 && l.z < ZM && l.z > TZ) { sp.damagePlayer(140, null, false); G.hud.msg('ウェポン管制：「射線上に立ち入るな！」— 試射に巻き込まれた', 'warn', 7); } else if (l.length() < 4000) G.audio?.sfx('boom', Math.max(0.15, 1 - l.length() / 4000)); } }
    if (f < 0) fired = false;
  });
  live(o);
  return o;
}

export const BUILD2 = { atlas, megaton, fizer, weapon };

// ── 衝突判定用の近似距離関数 ──
const cylY = (x, y, z, R, y0, y1) => Math.max(Math.hypot(x, z) - R, Math.abs(y - (y0 + y1) / 2) - (y1 - y0) / 2);
const cylZ = (x, y, z, R, z0, z1) => Math.max(Math.hypot(x, y) - R, Math.abs(z - (z0 + z1) / 2) - (z1 - z0) / 2);
const MER = [0, 1, 2].map((k) => [Math.cos(k * Math.PI / 3), Math.sin(k * Math.PI / 3)]);
export const SDF2 = {
  atlas: (x, y, z) => { const cy = y - 262; let d = Math.min(cylY(x, y, z, 276, -17, 17), cylY(x, y, z, 152, -66, -14), cylY(x, y, z, 205, -64, -20) + 0, cylY(x, y, z, 120, -190, -66), cylY(x, y, z, 80, 14, 182), Math.hypot(x, cy, z) - 65, Math.hypot(Math.hypot(x, z) - 200, cy) - 8, sdBox(x, y, z, 0, -42, 232, 12, 12, 92), sdBox(Math.abs(x), y, z, 188, -140, 0, 78, 14, 30));
    for (const [c, s] of MER) d = Math.min(d, Math.hypot(Math.hypot(x * c - z * s, cy) - 200, x * s + z * c) - 7); return d; },
  megaton: (x, y, z) => { const r = Math.hypot(x, y); let d = Math.min(Math.max(r - 268, Math.abs(z) - 1104), Math.max(r - 190, Math.abs(z) - 1232), Math.hypot(r - 640, Math.abs(z) - 940) - 60, Math.hypot(x, y, z + 1600) - 196, cylZ(x, y, z, 70, 1230, 1556), Math.hypot(r - 176, z - 1330) - 40, cylZ(x, y, z, 108, -1440, -1230), sdBox(x, y, z, 0, 0, -1320, 890, 8, 152), sdBox(x, y, z, 0, 0, -1320, 8, 610, 152));
    for (let k = 0; k < 3; k++) { const a = k * 2.0944, c = Math.cos(a), s = Math.sin(a), rho = x * c + y * s, tau = -x * s + y * c, u = (rho - 264) * 0.4695 - (z - 780) * 0.8829, v = (rho - 264) * 0.8829 + (z - 780) * 0.4695; d = Math.min(d, sdBox(u, v, tau, 575, 4, 0, 578, 9, 108)); } return d; },
  fizer: (x, y, z) => Math.min(cylY(x, y, z, 70, -186, 186), Math.hypot(Math.max(Math.abs(x) - 76, 0), y - 262, z) - 44, Math.hypot(Math.hypot(x, z) - 96, y + 222) - 28, cylY(x, y, z, 36, -240, -196), cylY(x, y, z, 24, 180, 222), sdBox(x, y, z, 0, 232, 0, 32, 3, 172)),
  weapon: (x, y, z) => Math.min(sdBox(x, y, z, 0, 0, 32, 50, 36, 60), sdBox(x, y, z, 0, 0, -165, 24, 24, 146), sdBox(x, y, z, 0, 62, 44, 18, 30, 20), sdBox(x, y, z, 81, 0, 30, 28, 24, 50), sdBox(x, y, z, -81, 0, 30, 28, 24, 50), sdBox(x, y, z, 0, -48, 30, 28, 28, 40), sdBox(x, y, z, 140, -10, 30, 45, 12, 12), Math.hypot(x, y, z + 1500) - 62, sdBox(x, y, z, 0, 0, -153, 52, 3, 10), Math.hypot(x - 426, y + 154, z + 1376) - 44),
};
