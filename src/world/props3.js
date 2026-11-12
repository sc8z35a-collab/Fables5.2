// 追加ステーション用の大道具 (2): メガトン (巨大軌道都市)・ウェポン (兵器試験場)
import * as THREE from 'three';
import { Builder, mx, rockGeo } from '../gfx/builder.js';
import { mat, glow, screenMat, cv, ctex, JP } from '../gfx/textures.js';
import { fxTime, makeGlowSprite } from '../gfx/fx.js';
import { G } from '../core/util.js';
import { holoMat, glassMat } from './interior.js';
import { MM, fab, crateM, flat, scr, blob, bush } from './props.js';
import { basic, W2, item } from './props2.js';
import { NOISE, VS } from './stations2.js';

const HP = Math.PI / 2, TAU = Math.PI * 2;
const ADD = { transparent: true, blending: THREE.AdditiveBlending, depthWrite: false };
let _B;
const BM = () => _B || (_B = {
  br: mat('flat', { color: 0xc8a04a, rough: 0.3, metal: 1 }),   // 真鍮
  cu: mat('flat', { color: 0xc8743a, rough: 0.32, metal: 1 }),  // 銅
  rl: mat('flat', { color: 0x8a929e, rough: 0.3, metal: 1 }),   // 研磨鋼
  gm: mat('flat', { color: 0x4a505a, rough: 0.5, metal: 0.65 }), // 砲金
  yl: mat('flat', { color: 0xf2b90a, rough: 0.55, metal: 0.3 }), // 警戒色
  iv: mat('flat', { color: 0xf0e8d4, rough: 0.35, metal: 0.15 }), // 象牙色
  gn: mat('marble', { color: 0x2c5a4e, rough: 0.2, metal: 0.05 }), // 濃緑の大理石
  st: mat('marble', { color: 0xe8e0cc, rough: 0.3, metal: 0.05 }),
});
const _y = new THREE.Vector3(0, 1, 0), _q = new THREE.Quaternion(), _one = new THREE.Vector3(1, 1, 1);
/** 2 点を結ぶ円柱 */
const strut = (P, m, a, c, r0, r1 = r0, seg = 8) => { const A = new THREE.Vector3(...a), C = new THREE.Vector3(...c), d = C.clone().sub(A), len = d.length(); _q.setFromUnitVectors(_y, d.multiplyScalar(1 / len)); P.add(m, new THREE.CylinderGeometry(r1, r0, len, seg), new THREE.Matrix4().compose(A.add(C).multiplyScalar(0.5), _q, _one)); };
/** 水面 (噴水・池) */
const waterMat = (c = 0x2a6a8a) => { const wm = new THREE.MeshStandardMaterial({ color: c, roughness: 0.04, metalness: 0.6, normalMap: mat('water').normalMap.clone(), transparent: true, opacity: 0.86, envMapIntensity: 2 }); wm.normalMap.needsUpdate = true; wm.normalMap.repeat.set(2, 2); return wm; };
/** モノレールの車両 (n 両編成)。進行方向 = ローカル X */
function trainCars(n, c = '#ffd27a') {
  const b = new Builder(), m = MM(), B2 = BM(), W = mat('flat', { color: 0x241a10, rough: 0.2, metal: 0.3, emissive: '#ffd9a0', ei: 1.5 }), CL = 9.2;
  for (let i = 0; i < n; i++) { const x = (i - (n - 1) / 2) * CL, head = i === n - 1, tail = i === 0;
    b.box(B2.iv, 8.2, 2.5, 2.8, x, 1.75, 0); b.add(B2.iv, new THREE.CylinderGeometry(1.4, 1.4, 8.2, 20, 1, false, 0, Math.PI).rotateZ(HP), mx(x, 3.0, 0, 0, 0, 0, 1, 0.42, 1)); // 丸屋根 (半円筒)
    for (const s of [-1, 1]) { b.box(W, 7.0, 0.95, 0.06, x, 2.15, s * 1.41); for (let k = -3; k <= 3; k++) b.box(m.dk, 0.09, 0.99, 0.08, x + k * 1.0, 2.15, s * 1.415); b.box(B2.br, 8.24, 0.1, 0.05, x, 1.5, s * 1.415); b.box(B2.gn, 8.22, 0.6, 0.04, x, 1.05, s * 1.41); b.box(glow(c, 2.2), 8.0, 0.04, 0.04, x, 0.72, s * 1.42);
      for (const dxx of [-2.6, 2.6]) { b.box(m.dk, 1.1, 2.0, 0.05, x + dxx, 1.7, s * 1.42); b.box(W, 0.9, 1.1, 0.06, x + dxx, 2.1, s * 1.425); } }
    b.box(m.dk, 7.6, 0.9, 2.2, x, 0.25, 0); b.box(m.dk, 3.0, 0.3, 1.6, x, 3.66, 0); b.box(m.st, 2.2, 0.16, 1.0, x - 2.4, 3.62, 0);
    for (const e2 of [-1, 1]) { const end = (e2 > 0 && head) || (e2 < 0 && tail); if (end) { b.add(B2.iv, new THREE.SphereGeometry(1.4, 20, 12, 0, Math.PI), mx(x + e2 * 4.1, 1.75, 0, 0, e2 > 0 ? HP : -HP, 0, 1, 0.9, 1.25), 0); b.add(mat('flat', { color: 0x06121f, rough: 0.04, metal: 1, env: 2.4 }), new THREE.SphereGeometry(1.42, 18, 8, 0.5, Math.PI - 1.0, 0.9, 0.7), mx(x + e2 * 4.12, 1.9, 0, 0, e2 > 0 ? HP : -HP, 0, 1, 0.9, 1.22), 0);
        for (const s of [-1, 1]) b.sph(glow(e2 > 0 ? '#fff6e0' : '#ff3a2a', 5), 0.14, x + e2 * 5.36, 1.15, s * 0.7, 1, 1, 1, 8); } else b.box(m.bk, 0.9, 2.2, 2.2, x + e2 * 4.5, 1.7, 0); }
  }
  return b.build({ shadow: false });
}
const SHOPS = ['珈琲 KAFFEE', '星屑堂書店', 'NOVA MODE', '麺処 メガ', 'ORBIT BAR', '宝飾 AURUM', '電脳市場', 'ZEPHYR TEA', '重力ジム', '花 FLORA', 'CINEMA 7', '薬 PHARMA', 'TOYS 月兎', '銀河銀行', 'SKY SUSHI', '眼鏡 LENS', '靴 STRIDE', 'ARCADE Ω', '天麩羅 環', 'GAS & GEAR', '写真館 光', 'BAKERY 麦', '仕立 ATELIER', '茶房 雲海'];
const NEON = ['#ffd9a0', '#9fe0ff', '#ff9ad8', '#b8ffb0', '#ffe14d', '#ffb080', '#c9a0ff'];

export const PROPS3 = {
  // ───────────────────────── メガトン ─────────────────────────
  /** メガトン炉: 18 基のコイルに囲まれた核融合プラズマの環 */
  megacore(P, o, e) {
    const m = MM(), B2 = BM(), c = o.c || '#ffb060', RT = o.R || 7.2, rt = 2.3, y = o.y || 6.6, h = e.room.h, NC = 18;
    // 基壇と手すり
    P.cyl(m.dk, RT + 3.5, RT + 3.9, 0.7, 0, 0.35, 0, 'y', 64); P.cyl(mat('grate', { color: 0x8a9096, rough: 0.6, metal: 0.7 }), RT + 3.3, RT + 3.3, 0.05, 0, 0.72, 0, 'y', 64); P.tor(glow(c, 3.4), RT + 3.62, 0.05, 0, 0.74, 0, HP, 0, 0, 96, 6); P.tor(B2.br, RT + 3.86, 0.06, 0, 0.36, 0, HP, 0, 0, 96, 6);
    P.tor(m.ch, RT + 4.5, 0.035, 0, 1.06, 0, HP, 0, 0, 96, 6); P.add(glassMat(), new THREE.CylinderGeometry(RT + 4.5, RT + 4.5, 0.82, 64, 1, true), mx(0, 0.56, 0), 0);
    for (let i = 0; i < 32; i++) { const a = i * TAU / 32; P.cyl(m.ch, 0.03, 0.03, 1.06, Math.cos(a) * (RT + 4.5), 0.53, Math.sin(a) * (RT + 4.5), 'y', 6); if (i % 4 === 0) P.sph(glow('#ffb030', 3), 0.07, Math.cos(a) * (RT + 3.7), 0.82, Math.sin(a) * (RT + 3.7), 1, 1, 1, 8); }
    // トロイダル磁場コイル (D 形の環) と支持脚
    for (let i = 0; i < NC; i++) { const a = i * TAU / NC, cx = Math.cos(a), cz = Math.sin(a);
      P.add(m.st, new THREE.TorusGeometry(rt + 0.5, 0.27, 8, 30), mx(cx * RT, y, cz * RT, 0, -a, 0, 0.9, 1.06, 1)); P.add(B2.cu, new THREE.TorusGeometry(rt + 0.5, 0.11, 6, 30), mx(cx * RT, y, cz * RT, 0, -a, 0, 0.9, 1.06, 1.9));
      P.add(B2.br, new THREE.BoxGeometry(0.5, 0.34, 0.7), mx(cx * (RT + rt * 0.9 + 0.5), y, cz * (RT + rt * 0.9 + 0.5), 0, -a, 0)); P.add(m.dk, new THREE.BoxGeometry(0.44, 0.44, 0.6), mx(cx * RT, y + (rt + 0.5) * 1.06 + 0.1, cz * RT, 0, -a, 0));
      strut(P, m.dk, [cx * (RT + 2.0), 0.7, cz * (RT + 2.0)], [cx * (RT + 0.9), y - rt * 0.9, cz * (RT + 0.9)], 0.13, 0.1); if (i % 3 === 0) strut(P, m.bk, [cx * RT, y + (rt + 0.5) * 1.06 + 0.3, cz * RT], [cx * (RT * 0.82), h - 0.9, cz * (RT * 0.82)], 0.07, 0.07, 6); }
    // ポロイダル磁場コイル (水平の銅環)・真空容器 (ガラス)
    for (const [R2, yy, t] of [[RT + rt + 0.95, y, 0.22], [RT + 1.5, y + rt + 0.95, 0.2], [RT + 1.5, y - rt - 0.95, 0.2], [RT - 1.5, y + rt + 0.9, 0.18], [RT - 1.5, y - rt - 0.9, 0.18]]) { P.tor(B2.cu, R2, t, 0, yy, 0, HP, 0, 0, 96, 8); P.tor(m.dk, R2, t * 0.55, 0, yy + t * 0.8, 0, HP, 0, 0, 96, 6); }
    P.add(glassMat(), new THREE.TorusGeometry(RT, rt * 0.84, 18, 80).rotateX(HP), mx(0, y, 0), 0);
    // 中心ソレノイド
    P.cyl(m.dk, 1.5, 1.7, y * 2 + 0.6, 0, y + 1.0, 0, 'y', 28); for (let yy = 1.4; yy < y * 2 + 1; yy += 0.9) P.tor(B2.cu, 1.62, 0.1, 0, yy, 0, HP, 0, 0, 32, 6); P.cyl(B2.br, 1.9, 1.5, 0.5, 0, y * 2 + 1.55, 0, 'y', 28); P.sph(glow('#9fe8ff', 3), 0.3, 0, y * 2 + 1.95, 0, 1, 1, 1, 14);
    // 冷却配管 (天井へ)・天井の集電環
    for (let k = 0; k < 4; k++) { const a = k * HP + 0.785, cx = Math.cos(a) * (RT + rt + 1.9), cz = Math.sin(a) * (RT + rt + 1.9); P.cyl(m.st, 0.34, 0.34, h - y + 0.4, cx, (h + y) / 2 - 0.2, cz, 'y', 14); P.cyl(m.st, 0.34, 0.34, 1.3, Math.cos(a) * (RT + rt + 1.3), y - 0.4, Math.sin(a) * (RT + rt + 1.3), k % 2 ? 'x' : 'z', 12);
      for (const yy of [y + 1.2, (h + y) / 2, h - 1.6]) { P.cyl(B2.br, 0.4, 0.4, 0.14, cx, yy, cz, 'y', 14); } P.tor(glow('#6fe8ff', 2.6), 0.36, 0.03, cx, y + 2.0, cz, HP, 0, 0, 20, 5); P.tor(crateM(0xc02020), 0.3, 0.045, cx + 0.5, y + 2.6, cz, 0, HP, 0, 16, 6); }
    P.tor(m.dk, RT * 0.82, 0.5, 0, h - 0.8, 0, HP, 0, 0, 64, 8); P.tor(glow(c, 2.6), RT * 0.82, 0.07, 0, h - 1.36, 0, HP, 0, 0, 64, 5);
    // プラズマ (流れる光の環)
    const pm = new THREE.ShaderMaterial({ uniforms: { uTime: fxTime }, vertexShader: VS, fragmentShader: 'uniform float uTime;varying vec3 vP,vN,vV;varying vec2 vUv;' + NOISE + /* glsl */`
void main(){float a=vUv.x*6.2832+uTime*.9,b=vUv.y*6.2832;vec3 p=vec3(cos(a)*2.4,sin(a)*2.4,0.)+vec3(cos(b)*cos(a),cos(b)*sin(a),sin(b))*1.1;
  float n=fbm3(p*1.7+vec3(0.,0.,uTime*.35)),s=fbm3(vec3(cos(a)*9.,sin(a)*9.,b*1.5-uTime*1.6));float v=smoothstep(.28,.8,n*.6+s*.62);float fr=pow(1.-abs(dot(vN,vV)),1.3);
  vec3 col=mix(vec3(1.,.3,.06),vec3(1.,.92,.66),v)*(1.5+v*4.2)+vec3(.74,.36,1.)*fr*2.2;gl_FragColor=vec4(col,1.);}` });
    const plasma = e.dyn(new THREE.Mesh(new THREE.TorusGeometry(RT, rt * 0.6, 22, 110).rotateX(HP), pm), 0, y, 0), halo = e.dyn(makeGlowSprite(c, RT * 5, 0.5), 0, y, 0);
    // 放電 (ソレノイドの頂部からコイルへ)
    const arcs = [0, 1, 2].map(() => { const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.BufferAttribute(new Float32Array(14 * 3), 3)); const l = new THREE.Line(g, new THREE.LineBasicMaterial({ color: new THREE.Color(3, 6, 9), ...ADD, toneMapped: false })); l.frustumCulled = false; e.dyn(l, 0, 0, 0); return l; });
    const Ls = [0, 1, 2].map((k) => { const [x, z] = W2(e, Math.cos(k * 2.094) * (RT + 5.5), Math.sin(k * 2.094) * (RT + 5.5)), L = { x, y: 4.5, z, c: new THREE.Color(c), i: 60, d: 26 }; e.out.lights.push(L); return L; });
    let next = 0;
    e.anim((dt, t) => { plasma.rotation.y += dt * 0.25; halo.material.opacity = 0.42 + 0.1 * Math.sin(t * 3.1); Ls.forEach((L, k) => { L.i = 54 + 14 * Math.sin(t * 2.3 + k * 2); });
      if (t > next) { next = t + 0.07; arcs.forEach((l, k) => { const on = Math.sin(t * 1.7 + k * 2.1) > 0.55, p = l.geometry.attributes.position, a0 = Math.floor(t * 0.9 + k * 6) * 2.4 + k, ex = Math.cos(a0) * RT, ez = Math.sin(a0) * RT; l.visible = on; if (!on) return;
        for (let i = 0; i < 14; i++) { const q = i / 13, j = i && i < 13 ? 0.5 : 0; p.setXYZ(i, ex * q + (Math.random() - 0.5) * j, y * 2 + 1.95 + (y + rt * 1.06 + 0.9 - y * 2 - 1.95) * q + Math.sin(q * Math.PI) * 1.4 + (Math.random() - 0.5) * j, ez * q + (Math.random() - 0.5) * j); } p.needsUpdate = true; }); } });
    e.light(c, 150, y, 34); e.col(RT + 4.65); if (o.use) e.use(o.label || 'メガトン炉', o.use, RT + 8);
  },
  /** 高架の連絡列車: 室内の両端の駅を往復する。線路 = ローカル X 方向 */
  monorail(P, o, e) {
    const m = MM(), B2 = BM(), L = o.l || 60, y = o.y || 9, c = o.c || e.th.trim, n = o.n || 2;
    P.box(m.dk, L, 0.8, 1.2, 0, y - 0.4, 0); P.box(m.st, L, 0.14, 0.5, 0, y + 0.07, 0); for (const s of [-1, 1]) { P.box(glow(c, 2), L - 1, 0.05, 0.04, 0, y - 0.62, s * 0.62); P.box(B2.br, L, 0.08, 0.06, 0, y - 0.1, s * 0.62); }
    for (let x = -L / 2 + 5; x <= L / 2 - 4; x += o.step || 13) { P.box(m.dk, 0.9, y - 0.8, 0.9, x, (y - 0.8) / 2, 0); P.cyl(B2.br, 0.75, 0.6, 0.3, x, 0.15, 0, 'y', 4); P.box(B2.br, 1.0, 0.16, 1.0, x, y * 0.42, 0); P.add(m.dk, new THREE.CylinderGeometry(1.5, 0.64, 1.6, 4, 1), mx(x, y - 1.6, 0, 0, 0.785, 0)); for (const s of [-1, 1]) P.box(glow(c, 2.2), 0.06, y * 0.34, 0.06, x + s * 0.46, y * 0.2, 0.46); e.col(0.75, x, 0); }
    // 両端の駅 (乗降デッキと庇)
    for (const s of [-1, 1]) { const x = s * (L / 2 - 2.6); P.box(m.dk, 5.2, 0.3, 4.6, x, y - 0.15, 2.4); P.box(B2.br, 5.3, 0.08, 0.08, x, y + 0.02, 4.72); P.box(m.ch, 5.0, 0.05, 0.05, x, y + 1.05, 4.66); P.add(glassMat(), new THREE.BoxGeometry(5.0, 0.9, 0.03), mx(x, y + 0.55, 4.66), 0);
      P.box(B2.gn, 5.6, 0.2, 6.2, x, y + 3.9, 1.6); P.box(B2.br, 5.7, 0.08, 6.3, x, y + 3.76, 1.6); P.box(glow('#ffe8c0', 2.6), 4.6, 0.04, 0.3, x, y + 3.7, 2.4); for (const zz of [0.9, 4.5]) for (const dx of [-2.4, 2.4]) P.cyl(B2.br, 0.07, 0.07, 3.8, x + dx, y + 1.9, zz, 'y', 8);
      P.box(m.dk, 0.9, y - 0.3, 0.9, x, (y - 0.3) / 2, 3.4); e.col(0.75, x, 3.4); }
    const tr = e.dyn(trainCars(n, c), 0, y + 0.1, 0), p0 = tr.position.clone(), dx = Math.cos(e.ang), dz = -Math.sin(e.ang), span = Math.max(1, L / 2 - n * 4.6 - 3.4);
    e.anim((dt, t) => { const k = (t * (o.sp || 0.045) + (o.ph || 0)) % 1, tri = k < 0.5 ? k * 2 : 2 - k * 2, s = Math.min(1, Math.max(0, (tri - 0.12) / 0.76)), q = s * s * (3 - 2 * s), d = (q * 2 - 1) * span; tr.position.set(p0.x + dx * d, p0.y, p0.z + dz * d); });
  },
  /** 停車中の列車 (駅のホーム用) */
  train(P, o, e) { const n = o.n || 3, g = e.dyn(trainCars(n, o.c || e.th.trim), 0, o.y || 0.3, 0); P.box(MM().dk, n * 9.2 + 2, 0.5, 1.2, 0, 0.25, 0); e.rect(n * 9.2 + 0.4, 3.0); e.light('#ffd9a0', 22, 2.6, 12); return g; },
  /** 吹き抜けの壁に並ぶ商店街の正面 (多層)。看板は 1 枚のテクスチャにまとめる */
  shopfront(P, o, e) {
    const m = MM(), B2 = BM(), w = o.w || 12, nf = o.floors || 3, fh = o.fh || 4.4, ns = o.shops || Math.max(2, Math.round(w / 4.2)), sw = w / ns, seed = Math.abs(Math.round(e.x * 3 + e.z * 7)) + (o.seed || 0);
    const c = cv(1024, 128 * nf), x = c.getContext('2d'), tex = ctex(c, true, false), SM = basic('#fff', 2.2, { map: tex, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false });
    x.textAlign = 'center'; x.textBaseline = 'middle';
    for (let k = 0; k < nf; k++) {
      const y0 = k * fh;
      // 床スラブと張り出し通路 (2 階以上)・手すり
      if (k > 0) { P.box(m.dk, w, 0.3, 2.1, 0, y0 - 0.15, 0.55); P.box(B2.br, w, 0.08, 0.06, 0, y0 - 0.02, 1.6); P.box(B2.br, w, 0.06, 0.06, 0, y0 - 0.26, 1.6); P.box(m.ch, w, 0.05, 0.05, 0, y0 + 1.02, 1.54); P.add(glassMat(), new THREE.BoxGeometry(w, 0.88, 0.03), mx(0, y0 + 0.5, 1.54), 0);
        for (let xx = -w / 2 + 0.6; xx < w / 2; xx += 1.5) P.add(glow('#ffe8c0', 3.2), new THREE.CircleGeometry(0.09, 10).rotateX(HP), mx(xx, y0 - 0.305, 0.9), 0); }
      P.box(m.bk, w, fh, 0.12, 0, y0 + fh / 2, -0.5);
      for (let i = 0; i < ns; i++) {
        const cx = -w / 2 + (i + 0.5) * sw, id = (seed + k * 5 + i * 3) % SHOPS.length, col = NEON[(seed + k * 2 + i) % NEON.length], gw = sw - 0.7, gh = fh - 1.75;
        // 店内の明かり・棚や人の影・ガラスの正面
        P.add(glow(col, 0.9 + ((seed + i + k) % 3) * 0.25), new THREE.PlaneGeometry(gw, gh), mx(cx, y0 + gh / 2 + 0.2, -0.42), 0);
        for (let q = 0; q < 3; q++) { const bw = 0.3 + ((seed + i * 7 + q * 3 + k) % 5) * 0.14, bh = 0.7 + ((seed * 3 + i + q * 5 + k) % 6) * 0.26; P.box(m.bk, bw, bh, 0.1, cx - gw / 2 + 0.4 + q * (gw - 0.8) / 2, y0 + 0.2 + bh / 2, -0.3); }
        P.box(m.bk, gw * 0.9, 0.06, 0.24, cx, y0 + gh * 0.58, -0.3); P.add(glassMat(), new THREE.BoxGeometry(gw, gh, 0.03), mx(cx, y0 + gh / 2 + 0.2, 0), 0);
        for (const s of [-1, 1]) P.box(B2.br, 0.07, gh + 0.2, 0.09, cx + s * gw / 2, y0 + gh / 2 + 0.2, 0); P.box(B2.br, gw + 0.14, 0.07, 0.09, cx, y0 + gh + 0.22, 0); P.box(B2.br, 0.05, gh, 0.07, cx, y0 + gh / 2 + 0.2, 0); P.box(m.dk, gw + 0.14, 0.2, 0.14, cx, y0 + 0.1, 0);
        if (k === 0) { P.add(fab([0x2c5a4e, 0x8a2a20, 0x2a4a7a, 0x6a5a2a][(seed + i) % 4]), new THREE.BoxGeometry(gw + 0.3, 0.06, 1.3), mx(cx, y0 + gh + 0.05, 0.6, 0.32, 0, 0)); P.box(B2.br, gw + 0.3, 0.05, 0.05, cx, y0 + gh - 0.16, 1.22); }
        // 看板 (ネオン文字)
        x.font = `900 60px ${JP}`; const tw = x.measureText(SHOPS[id]).width, fs = Math.min(60, 60 * (1024 / ns - 30) / tw); x.font = `900 ${fs}px ${JP}`; const tx = (i + 0.5) * 1024 / ns, ty = k * 128 + 66;
        x.shadowColor = col; x.shadowBlur = 22; x.fillStyle = col; x.fillText(SHOPS[id], tx, ty); x.fillText(SHOPS[id], tx, ty); x.shadowBlur = 4; x.fillStyle = '#fff'; x.globalAlpha = 0.8; x.fillText(SHOPS[id], tx, ty); x.globalAlpha = 1;
      }
      // 欄間 (看板の帯) と柱
      P.box(m.dk, w, 1.25, 0.5, 0, y0 + fh - 0.78, 0.0); P.box(B2.br, w, 0.07, 0.52, 0, y0 + fh - 1.4, 0.0); P.box(B2.br, w, 0.07, 0.52, 0, y0 + fh - 0.17, 0.0);
      const pg = new THREE.PlaneGeometry(w, 0.86), uv = pg.attributes.uv; for (let i = 0; i < uv.count; i++) uv.setY(i, 1 - (k + 1 - uv.getY(i)) / nf); P.add(SM, pg, mx(0, y0 + fh - 0.78, 0.262), 0);
      for (let i = 0; i <= ns; i++) { const px = -w / 2 + i * sw; P.box(B2.gn, 0.42, fh, 0.6, px, y0 + fh / 2, 0.02); P.box(B2.br, 0.5, 0.12, 0.68, px, y0 + 0.36, 0.02); P.box(B2.br, 0.5, 0.12, 0.68, px, y0 + fh - 1.5, 0.02); P.box(glow('#ffe8c0', 2.4), 0.06, fh - 2.4, 0.04, px, y0 + fh / 2 - 0.5, 0.33); }
    }
    tex.needsUpdate = true; P.box(m.dk, w, 0.5, 0.9, 0, nf * fh + 0.25, 0.1); P.box(B2.br, w, 0.1, 1.0, 0, nf * fh + 0.52, 0.1);
    e.rect(w, 0.75, 0, -0.1); e.light(NEON[seed % NEON.length], 12, 2.4, 9);
  },
  /** 原子の彫刻: 噴水の上で真鍮の軌道環が回り、核が輝く */
  atomsculpt(P, o, e) {
    const m = MM(), B2 = BM(), R = o.r || 3.6, y = o.y || 7, c = o.c || '#ffb060';
    P.cyl(B2.st, R, R + 0.2, 0.62, 0, 0.31, 0, 'y', 48); P.cyl(B2.gn, R + 0.24, R + 0.3, 0.14, 0, 0.07, 0, 'y', 48); P.tor(B2.br, R + 0.02, 0.05, 0, 0.63, 0, HP, 0, 0, 72, 6); P.tor(glow(c, 2.6), R - 0.14, 0.025, 0, 0.58, 0, HP, 0, 0, 72, 5);
    P.cyl(B2.gn, 0.9, 1.2, 1.1, 0, 0.55, 0, 'y', 8); P.cyl(B2.br, 0.36, 0.8, 2.6, 0, 2.4, 0, 'y', 8); P.cyl(B2.br, 1.05, 0.36, 0.3, 0, 3.85, 0, 'y', 24); P.tor(glow(c, 3), 1.0, 0.03, 0, 4.02, 0, HP, 0, 0, 40, 5);
    const wm = waterMat(); e.dyn(new THREE.Mesh(new THREE.CircleGeometry(R - 0.08, 48).rotateX(-HP), wm), 0, 0.56, 0);
    for (let i = 0; i < 8; i++) { const a = i * TAU / 8, j = e.dyn(new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.06, 2.0, 6, 1, true), holoMat('#cfefff', 0.5)), Math.cos(a) * (R - 1.1), 1.3, Math.sin(a) * (R - 1.1)); j.rotation.set(0, 0, 0); j.rotation.z = Math.cos(a + e.ang) * 0.5; j.rotation.x = -Math.sin(a + e.ang) * 0.5; }
    const g = e.dyn(new THREE.Group(), 0, y, 0), nb = new Builder(); nb.add(glow(c, 4.5), new THREE.SphereGeometry(0.55, 24, 16), null, 0); for (let i = 0; i < 3; i++) nb.add(B2.br, new THREE.TorusGeometry(0.9, 0.035, 6, 40), mx(0, 0, 0, i * 1.047, i * 0.9, 0)); for (let i = 0; i < 7; i++) { const a = i * 2.4, b = i * 1.3; nb.add(glow(i % 2 ? '#ff7a5a' : '#9fe8ff', 3.4), new THREE.SphereGeometry(0.2, 12, 10), mx(Math.cos(a) * Math.cos(b) * 0.34, Math.sin(b) * 0.34, Math.sin(a) * Math.cos(b) * 0.34), 0); }
    g.add(nb.build({ shadow: false })); g.add(makeGlowSprite(c, 5.5, 0.9));
    const rings = [[2.3, 0.5, 0.2, 0.9], [2.75, -0.7, 0.9, -0.7], [3.2, 0.2, -1.1, 0.55]].map(([rr, tx, tz, sp]) => { const tilt = new THREE.Group(), spin = new THREE.Group(), rb = new Builder(); rb.add(B2.br, new THREE.TorusGeometry(rr, 0.045, 8, 80).rotateX(HP), null, 0); rb.add(glow('#9fe8ff', 5), new THREE.SphereGeometry(0.16, 12, 10), mx(rr, 0, 0), 0); rb.add(glow('#9fe8ff', 5), new THREE.SphereGeometry(0.12, 10, 8), mx(-rr, 0, 0), 0); spin.add(rb.build({ shadow: false })); tilt.rotation.set(tx, 0, tz); tilt.add(spin); g.add(tilt); return [spin, sp]; });
    const beam = e.dyn(new THREE.Mesh(new THREE.CylinderGeometry(0.5, 0.95, y - 4.1, 20, 1, true), holoMat(c, 0.16)), 0, 4.05 + (y - 4.1) / 2, 0);
    e.anim((dt, t) => { for (const [s, sp] of rings) s.rotation.y += dt * sp; g.position.y = e.y0 + y + Math.sin(t * 0.7) * 0.12; wm.normalMap.offset.set(t * 0.03, t * 0.05); beam.rotation.y += dt * 0.3; });
    e.light(c, 46, Math.min(y, 5), 16); e.col(R + 0.3); if (o.use) e.use(o.label, o.use, R + 2.6);
  },
  /** 相場の電光帯 (環状に流れる) */
  ticker(P, o, e) {
    const m = MM(), B2 = BM(), R = o.r || 3.4, y = o.y || 5.2, hh = o.h || 0.9, c = cv(2048, 128), x = c.getContext('2d'), L = ['合金 ▲162', '燃料電池 ▼118', '希ガス ▲311', 'マグマ晶 ▲492', '氷晶 ▼351', '医薬品 ▲267', '電子部品 ▼318', '贅沢品 ▲548', '砂漠香料 ▲421', '探査データ ▲655'];
    x.fillStyle = '#04080c'; x.fillRect(0, 0, 2048, 128); x.font = `900 62px ${JP}`; x.textBaseline = 'middle'; let px = 20; for (const s of L) { if (px > 2048 - 60) break; x.fillStyle = s.includes('▲') ? '#5dff8a' : '#ff5a4a'; x.fillText(s, px, 68); px += x.measureText(s).width + 70; }
    const t1 = ctex(c, true), t2 = ctex(c, true); t1.repeat.set(2, 1); t2.repeat.set(-2, 1);
    e.dyn(new THREE.Mesh(new THREE.CylinderGeometry(R, R, hh, 64, 1, true), basic('#fff', 1.7, { map: t1 })), 0, y, 0); e.dyn(new THREE.Mesh(new THREE.CylinderGeometry(R - 0.06, R - 0.06, hh, 64, 1, true), basic('#fff', 1.7, { map: t2, side: THREE.BackSide })), 0, y, 0);
    for (const s of [-1, 1]) { P.tor(B2.br, R + 0.02, 0.06, 0, y + s * (hh / 2 + 0.05), 0, HP, 0, 0, 64, 6); P.tor(glow(o.c || e.th.trim, 2.6), R + 0.02, 0.02, 0, y + s * (hh / 2 + 0.13), 0, HP, 0, 0, 64, 5); }
    for (let i = 0; i < 4; i++) { const a = i * HP + 0.785; P.cyl(m.dk, 0.025, 0.025, e.room.h - y - hh / 2, Math.cos(a) * R, (e.room.h + y + hh / 2) / 2, Math.sin(a) * R, 'y', 5); }
    e.anim((dt) => { t1.offset.x += dt * 0.035; t2.offset.x -= dt * 0.035; }); e.light('#5dff8a', 12, y - 1, 10);
  },
  /** 取引卓 (八角に並ぶ端末) */
  tradepit(P, o, e) {
    const m = MM(), B2 = BM(), R = o.r || 2.6, c = o.c || e.th.trim;
    for (let k = 1; k < 8; k++) { const a = k * TAU / 8 + HP, cx = Math.cos(a) * R, cz = Math.sin(a) * R, M = (mt, w, hh, d, y, off = 0, uv) => P.add(mt, new THREE.BoxGeometry(w, hh, d), mx(Math.cos(a) * (R + off), y, Math.sin(a) * (R + off), 0, -a + HP, 0), uv);
      M(B2.gn, 2.0, 1.0, 0.62, 0.5); M(B2.br, 2.06, 0.05, 0.7, 1.03); M(B2.br, 2.04, 0.05, 0.03, 0.2, 0.32); M(m.bk, 0.8, 0.5, 0.05, 1.32, 0.1); P.add(glow(k % 2 ? '#5dff8a' : c, 1.5), new THREE.PlaneGeometry(0.72, 0.42), mx(Math.cos(a) * (R + 0.13), 1.32, Math.sin(a) * (R + 0.13), 0, -a + HP, 0), 0);
      for (let q = 0; q < 4; q++) P.add(m.bk, new THREE.BoxGeometry(0.5 - q * 0.08, 0.02, 0.004), mx(Math.cos(a) * (R + 0.135), 1.2 + q * 0.07, Math.sin(a) * (R + 0.135), 0, -a + HP, 0));
      P.cyl(fab(0x2c5a4e), 0.2, 0.18, 0.08, Math.cos(a) * (R + 0.95), 0.7, Math.sin(a) * (R + 0.95), 'y', 12); P.cyl(B2.br, 0.03, 0.03, 0.68, Math.cos(a) * (R + 0.95), 0.34, Math.sin(a) * (R + 0.95), 'y', 6); P.cyl(B2.br, 0.18, 0.2, 0.03, Math.cos(a) * (R + 0.95), 0.015, Math.sin(a) * (R + 0.95), 'y', 12); e.col(0.55, cx, cz); }
    P.cyl(B2.gn, 0.7, 0.8, 1.2, 0, 0.6, 0, 'y', 8); P.cyl(B2.br, 0.75, 0.75, 0.05, 0, 1.22, 0, 'y', 8); P.box(m.dk, 0.92, 0.72, 0.92, 0, 1.72, 0); P.box(B2.br, 0.98, 0.05, 0.98, 0, 2.1, 0);
    for (let k = 0; k < 4; k++) P.add(screenMat(['graph', 'bars', 'data', 'graph'][k], k % 2 ? '#5dff8a' : c, ['ZEPHYR-X', '出来高', '注文板', 'MEGA 225'][k], 1.5), new THREE.PlaneGeometry(0.84, 0.56), mx(Math.sin(k * HP) * 0.47, 1.72, Math.cos(k * HP) * 0.47, 0, k * HP, 0));
    e.col(0.9); e.light(c, 16, 2.2, 8); if (o.use) e.use(o.label, o.use, R + 2.4);
  },
  /** 池と灯籠 (空中庭園) */
  pond(P, o, e) {
    const m = MM(), R = o.r || 3.2, RK = mat('rock', { color: 0x8a8478, rough: 1, metal: 0.05, uvs: 0.3 }), STN = mat('concrete', { color: 0xa8a49a, rough: 0.9, metal: 0 });
    const wm = waterMat(0x1e5a6a); const w = e.dyn(new THREE.Mesh(new THREE.CircleGeometry(R, 40).rotateX(-HP), wm), 0, 0.05, 0); w.scale.set(1.45, 1, 1);
    for (let i = 0; i < 22; i++) { const a = i * TAU / 22 + e.rnd() * 0.2, s = 0.28 + e.rnd() * 0.42; blob(P, RK, s, Math.cos(a) * R * 1.47, s * 0.3, Math.sin(a) * R * 1.02, i * 3 + 1, 0.7); }
    for (let i = 0; i < 7; i++) { const a = e.rnd() * TAU, d = e.rnd() * R * 0.7; P.add(m.lf2, new THREE.CircleGeometry(0.22 + e.rnd() * 0.16, 10, 0.3, TAU - 0.6).rotateX(-HP), mx(Math.cos(a) * d * 1.4, 0.065, Math.sin(a) * d, 0, e.rnd() * 6, 0), 0); if (i % 3 === 0) P.sph(glow('#ff9ad8', 1.2), 0.07, Math.cos(a) * d * 1.4, 0.12, Math.sin(a) * d, 1, 0.7, 1, 8); }
    for (let i = 0; i < 14; i++) { const a = 2.2 + e.rnd() * 1.6; P.add(m.lf, new THREE.CylinderGeometry(0.008, 0.02, 0.9 + e.rnd() * 0.7, 4), mx(Math.cos(a) * R * 1.3 + (e.rnd() - 0.5) * 0.5, 0.5, Math.sin(a) * R * 0.92 + (e.rnd() - 0.5) * 0.4, (e.rnd() - 0.5) * 0.3, 0, (e.rnd() - 0.5) * 0.3)); }
    // 石灯籠
    const lx = R * 1.55, lz = -R * 0.75; P.cyl(STN, 0.34, 0.42, 0.16, lx, 0.08, lz, 'y', 6); P.cyl(STN, 0.12, 0.15, 0.9, lx, 0.6, lz, 'y', 8); P.cyl(STN, 0.36, 0.18, 0.14, lx, 1.12, lz, 'y', 6); P.box(glow('#ffcf90', 2.6), 0.3, 0.3, 0.3, lx, 1.36, lz); for (const [dx, dz] of [[-0.17, -0.17], [0.17, -0.17], [-0.17, 0.17], [0.17, 0.17]]) P.box(STN, 0.06, 0.34, 0.06, lx + dx, 1.36, lz + dz); P.add(STN, new THREE.ConeGeometry(0.52, 0.34, 6), mx(lx, 1.72, lz)); P.sph(STN, 0.07, lx, 1.94, lz, 1, 1.3, 1, 8); e.col(0.4, lx, lz);
    const fish = []; for (let i = 0; i < 6; i++) { const f = e.dyn(new THREE.Mesh(new THREE.SphereGeometry(0.09, 8, 6).scale(2.4, 0.6, 0.8), glow(['#ff8a3a', '#ffffff', '#ffb040', '#ff5a3a'][i % 4], 1.8)), 0, 0.03, 0); fish.push([f, f.position.clone(), i]); }
    const ca = Math.cos(e.ang), sa = Math.sin(e.ang);
    e.anim((dt, t) => { wm.normalMap.offset.set(t * 0.02, t * 0.03); for (const [f, p0, i] of fish) { const a = t * (0.25 + i * 0.05) * (i % 2 ? 1 : -1) + i * 1.1, rr = R * (0.3 + (i % 3) * 0.2), lx2 = Math.cos(a) * rr * 1.4, lz2 = Math.sin(a) * rr; f.position.set(p0.x + lx2 * ca + lz2 * sa, p0.y, p0.z - lx2 * sa + lz2 * ca); f.rotation.y = -a + (i % 2 ? -HP : HP) + e.ang; } });
    e.col(R * 0.95); e.col(R * 0.72, R * 0.72, 0); e.col(R * 0.72, -R * 0.72, 0); e.light('#ffcf90', 9, 1.4, 6);
  },
  /** アールデコの街灯 */
  streetlamp(P, o, e) {
    const m = MM(), B2 = BM(), h = o.h || 4.4, c = o.c || '#ffe2b0';
    P.cyl(B2.gn, 0.2, 0.28, 0.5, 0, 0.25, 0, 'y', 8); P.cyl(m.dk, 0.07, 0.11, h - 0.5, 0, 0.5 + (h - 0.5) / 2, 0, 'y', 8); for (const y of [0.56, h * 0.5, h - 0.3]) P.cyl(B2.br, 0.13, 0.13, 0.08, 0, y, 0, 'y', 8);
    for (const s of [-1, 1]) { P.add(B2.br, new THREE.TorusGeometry(0.42, 0.025, 6, 16, HP), mx(s * 0.42, h - 0.3, 0, 0, s > 0 ? Math.PI : 0, 0)); P.sph(glow(c, 3.6), 0.2, s * 0.42, h + 0.3, 0, 1, 1.15, 1, 14); P.cyl(B2.br, 0.1, 0.06, 0.08, s * 0.42, h + 0.08, 0, 'y', 8); P.cyl(B2.br, 0.03, 0.08, 0.1, s * 0.42, h + 0.56, 0, 'y', 8); }
    P.sph(glow(c, 3.6), 0.16, 0, h + 0.2, 0, 1, 1.2, 1, 12); e.col(0.24); e.light(c, 15, h - 0.4, 11);
  },
  /** ガラス張りの昇降機 (籠が上下する) */
  lift(P, o, e) {
    const m = MM(), B2 = BM(), H = Math.min(e.room.h - 0.6, o.h || 18), S = 1.4;
    for (const [x, z] of [[-S, -S], [S, -S], [-S, S], [S, S]]) P.box(B2.br, 0.14, H, 0.14, x, H / 2, z); for (let y = 3.2; y < H; y += 3.2) { for (const s of [-1, 1]) { P.box(B2.br, 2 * S, 0.08, 0.08, 0, y, s * S); P.box(B2.br, 0.08, 0.08, 2 * S, s * S, y, 0); } }
    P.add(glassMat(), new THREE.BoxGeometry(2 * S, H, 0.03), mx(0, H / 2, -S), 0); for (const s of [-1, 1]) P.add(glassMat(), new THREE.BoxGeometry(0.03, H, 2 * S), mx(s * S, H / 2, 0), 0); P.box(m.dk, 2 * S + 0.4, 0.5, 2 * S + 0.4, 0, H + 0.25, 0); P.box(B2.br, 2 * S + 0.5, 0.08, 2 * S + 0.5, 0, H - 0.02, 0); P.box(m.dk, 0.3, H, 0.1, 0, H / 2, -S + 0.1);
    P.box(B2.gn, 2 * S + 0.3, 0.12, 0.5, 0, 0.06, S + 0.3); P.box(B2.br, 0.1, 2.5, 0.12, -1.0, 1.25, S); P.box(B2.br, 0.1, 2.5, 0.12, 1.0, 1.25, S); P.box(B2.br, 2.1, 0.12, 0.12, 0, 2.5, S); P.box(glow(o.c || e.th.trim, 2.6), 0.3, 0.08, 0.02, 0, 2.5, S + 0.07);
    const cab = new THREE.Group(), cb = new Builder(); cb.box(m.dk, 2 * S - 0.3, 0.14, 2 * S - 0.3, 0, 0.07, 0); cb.box(m.dk, 2 * S - 0.3, 0.14, 2 * S - 0.3, 0, 2.6, 0); cb.box(glow('#ffe8c0', 2.8), 2 * S - 0.9, 0.03, 2 * S - 0.9, 0, 2.52, 0); cb.box(B2.br, 2 * S - 0.3, 0.06, 0.06, 0, 1.05, S - 0.2); for (const [x, z] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) cb.box(B2.br, 0.07, 2.5, 0.07, x * (S - 0.2), 1.35, z * (S - 0.2));
    cb.add(glassMat(), new THREE.BoxGeometry(2 * S - 0.34, 2.4, 2 * S - 0.34), mx(0, 1.35, 0), 0); for (const dx of [-0.4, 0.3]) { cb.add(flat(0x1c2026, 0.8, 0.1), new THREE.CapsuleGeometry(0.2, 0.9, 4, 10), mx(dx, 0.95, -0.3 + dx * 0.4), 0); cb.add(flat(0x1c2026, 0.8, 0.1), new THREE.SphereGeometry(0.14, 10, 8), mx(dx, 1.72, -0.3 + dx * 0.4), 0); }
    cab.add(cb.build({ shadow: false })); e.dyn(cab, 0, 0.1, 0); const cw = e.dyn(new THREE.Mesh(new THREE.BoxGeometry(0.5, 1.4, 0.16), m.dk), 0, H - 2, -S + 0.24);
    e.anim((dt, t) => { const k = (t * 0.035 + e.x * 0.1) % 1, tri = k < 0.5 ? k * 2 : 2 - k * 2, s = Math.min(1, Math.max(0, (tri - 0.15) / 0.7)), q = s * s * (3 - 2 * s); cab.position.y = e.y0 + 0.1 + q * (H - 3.2); cw.position.y = e.y0 + H - 1.2 - q * (H - 3.2); });
    e.rect(2 * S + 0.3, 2 * S + 0.3); e.light('#ffe8c0', 10, 2.2, 7);
  },
  /** カプセルホテル (2 段の寝台) */
  capsule(P, o, e) {
    const m = MM(), B2 = BM(), n = o.n || 4, c = o.c || e.th.trim;
    for (let i = 0; i < n; i++) for (let k = 0; k < 2; k++) { const x = (i - (n - 1) / 2) * 1.32, y = 0.2 + k * 1.28, shut = (i * 3 + k * 2) % 5 === 0;
      P.box(B2.iv, 1.26, 1.2, 2.2, x, y + 0.6, -1.1); P.box(m.bk, 1.04, 0.98, 0.06, x, y + 0.6, -0.02); P.add(glow('#ffd9a0', shut ? 0.25 : 1.3), new THREE.PlaneGeometry(0.98, 0.92), mx(x, y + 0.6, 0.012), 0);
      P.box(flat(0xf0f0ea, 0.9, 0), 0.9, 0.12, 0.3, x, y + 0.2, 0.03); P.box(fab([0x2c5a4e, 0x8a3a2a, 0x2a4a7a][(i + k) % 3]), 0.9, 0.16, 0.2, x, y + 0.34, 0.035); if (shut) P.box(flat(0x3a3f48, 0.8, 0.1), 0.98, 0.6, 0.03, x, y + 0.78, 0.03);
      P.box(glow(shut ? '#ff5a4a' : '#5dff8a', 2.4), 0.1, 0.04, 0.02, x + 0.5, y + 1.14, 0.02); P.box(B2.br, 1.06, 0.03, 0.04, x, y + 1.1, 0.02); P.box(B2.br, 1.06, 0.03, 0.04, x, y + 0.1, 0.02); }
    for (let i = 0; i <= n; i++) { const x = (i - n / 2) * 1.32; for (let q = 0; q < 6; q++) if (i % 2 === 1) P.box(m.ch, 0.26, 0.03, 0.03, x, 0.3 + q * 0.3, 0.1); if (i % 2 === 1) for (const s of [-1, 1]) P.box(m.ch, 0.03, 2.0, 0.03, x + s * 0.13, 1.1, 0.1); }
    P.box(m.dk, n * 1.32 + 0.1, 0.2, 2.3, 0, 0.1, -1.1); P.box(m.dk, n * 1.32 + 0.1, 0.12, 2.3, 0, 2.82, -1.1); P.box(glow(c, 2.4), n * 1.32, 0.03, 0.03, 0, 2.74, 0.03);
    e.rect(n * 1.32 + 0.1, 2.3, 0, -1.1); e.light('#ffd9a0', 9, 1.6, 6); e.use(o.label || 'カプセルで休む', o.use || 'rest', 2.4);
  },
  /** 大時計 (実時刻を指す) */
  clock(P, o, e) {
    const m = MM(), B2 = BM(), R = o.r || 1.7, y = o.y || 6;
    P.add(B2.gn, new THREE.CylinderGeometry(R, R, 0.16, 48).rotateX(HP), mx(0, y, 0.08)); P.add(B2.br, new THREE.TorusGeometry(R, 0.1, 8, 64), mx(0, y, 0.16)); P.add(B2.br, new THREE.TorusGeometry(R * 0.72, 0.025, 6, 64), mx(0, y, 0.165));
    for (let i = 0; i < 12; i++) { const a = i * TAU / 12; P.add(i % 3 ? B2.br : glow('#ffe2a8', 2.4), new THREE.BoxGeometry(0.07, i % 3 ? 0.22 : 0.36, 0.04), mx(Math.sin(a) * R * 0.85, y + Math.cos(a) * R * 0.85, 0.19, 0, 0, -a)); }
    for (let i = 0; i < 16; i++) { const a = i * TAU / 16; P.add(B2.br, new THREE.BoxGeometry(0.05, R * 0.5, 0.03), mx(Math.sin(a) * R * 1.32, y + Math.cos(a) * R * 1.32, 0.06, 0, 0, -a)); }
    const hand = (l, w, mt) => { const g = new THREE.Group(), q = new THREE.Mesh(new THREE.BoxGeometry(w, l, 0.03).translate(0, l / 2 - 0.12, 0), mt); g.add(q); return e.dyn(g, 0, y, 0.24); }, hh = hand(R * 0.5, 0.11, B2.br), mh = hand(R * 0.76, 0.07, B2.br), sh = hand(R * 0.8, 0.025, glow('#ff5a3a', 3));
    P.add(B2.br, new THREE.CylinderGeometry(0.12, 0.12, 0.1, 16).rotateX(HP), mx(0, y, 0.26));
    e.anim(() => { const d = new Date(), s = d.getSeconds() + d.getMilliseconds() / 1000, mi = d.getMinutes() + s / 60, hr = (d.getHours() % 12) + mi / 60; hh.rotation.z = -hr * TAU / 12; mh.rotation.z = -mi * TAU / 60; sh.rotation.z = -Math.floor(s) * TAU / 60; });
  },

  // ───────────────────────── 重工 (メガトンの鋳造区画) ─────────────────────────
  /** 取鍋から溶けた金属を鋳型へ注ぐ */
  ladle(P, o, e) {
    const m = MM(), B2 = BM(), hy = Math.min(e.room.h - 1.6, o.h || 8.5);
    for (const s of [-1, 1]) { P.box(B2.yl, 0.5, hy, 0.5, s * 3.4, hy / 2, 0); P.box(m.dk, 1.0, 0.2, 1.0, s * 3.4, 0.1, 0); for (let k = 0; k < 5; k++) P.add(m.bk, new THREE.BoxGeometry(0.02, 0.36, 0.5), mx(s * 3.4 + 0.26, 0.4 + k * 0.5, 0, 0.6, 0, 0)); }
    P.box(B2.yl, 7.4, 0.7, 0.6, 0, hy + 0.1, 0); P.box(m.dk, 1.6, 0.5, 1.0, 0, hy - 0.45, 0); for (const s of [-1, 1]) { P.cyl(m.dk, 0.03, 0.03, hy - 4.0, s * 1.15, (hy + 3.6) / 2 - 0.35, 0, 'y', 5); P.box(m.dk, 0.16, 1.0, 0.3, s * 1.15, 3.3, 0); }
    const lad = new THREE.Group(), lb = new Builder(); lb.add(m.dk, new THREE.CylinderGeometry(1.05, 0.82, 1.7, 24, 1, true), null); lb.add(m.dk, new THREE.CylinderGeometry(0.82, 0.82, 0.1, 24), mx(0, -0.85, 0)); lb.add(B2.gm, new THREE.TorusGeometry(1.06, 0.07, 6, 28).rotateX(HP), mx(0, 0.85, 0)); lb.add(B2.gm, new THREE.TorusGeometry(0.96, 0.06, 6, 28).rotateX(HP), mx(0, 0, 0)); lb.add(glow('#ff9a2a', 5), new THREE.CircleGeometry(0.98, 24).rotateX(-HP), mx(0, 0.55, 0), 0); lb.add(m.dk, new THREE.BoxGeometry(0.4, 0.14, 0.5), mx(0, 0.82, 1.1, -0.3, 0, 0));
    for (const s of [-1, 1]) lb.add(B2.gm, new THREE.CylinderGeometry(0.1, 0.1, 0.3, 10).rotateZ(HP), mx(s * 1.15, 0.2, 0)); lad.add(lb.build({ shadow: false })); e.dyn(new THREE.Group(), 0, 3.0, 0).add(lad);
    // 鋳型の列 (手前へ流れていく)
    P.box(m.dk, 1.6, 0.4, 7.0, 0, 0.2, 3.9); for (const s of [-1, 1]) P.box(m.st, 0.08, 0.1, 7.0, s * 0.72, 0.45, 3.9);
    const NM = 6, molds = new THREE.InstancedMesh(new THREE.BoxGeometry(1.0, 0.3, 0.7), B2.gm, NM), ing = new THREE.InstancedMesh(new THREE.BoxGeometry(0.7, 0.1, 0.42), new THREE.MeshBasicMaterial({ toneMapped: false }), NM), o3 = new THREE.Object3D(), col = new THREE.Color(); molds.frustumCulled = ing.frustumCulled = false; e.dyn(molds, 0, 0.6, 0); e.dyn(ing, 0, 0.72, 0);
    const stream = e.dyn(new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.09, 1, 8), basic('#ffb040', 7)), 0, 2, 1.25), sparks = [0, 1, 2, 3].map(() => e.dyn(makeGlowSprite('#ffd9a0', 0.3, 3), 0, 0.9, 1.25)), sp0 = sparks[0].position.clone(), Lt = { x: W2(e, 0, 1.3)[0], y: 1.6, z: W2(e, 0, 1.3)[1], c: new THREE.Color('#ff8a2a'), i: 30, d: 16 }; e.out.lights.push(Lt);
    e.anim((dt, t) => { const k = (t * 0.16) % 1, pour = k > 0.25 && k < 0.8, tilt = 0.28 + (pour ? 0.5 * Math.sin((k - 0.25) / 0.55 * Math.PI) ** 0.5 : 0); lad.rotation.x = tilt; const on = tilt > 0.6;
      stream.visible = on; if (on) { stream.scale.set(1 + Math.sin(t * 31) * 0.2, 1.9, 1 + Math.cos(t * 27) * 0.2); stream.position.y = e.y0 + 1.75; }
      sparks.forEach((s, i) => { s.visible = on; if (on) { const q = (t * 3 + i * 0.25) % 1; s.position.set(sp0.x + Math.sin(i * 2.4 + t * 9) * q * 0.9, sp0.y + q * (1.2 - q) * 2.2, sp0.z + Math.cos(i * 1.7 + t * 7) * q * 0.9); s.material.opacity = 1 - q; } });
      Lt.i = on ? 80 + 30 * Math.sin(t * 23) : 26; const sh = (t * 0.16 * 1.15) % 1;
      for (let i = 0; i < NM; i++) { const z = 1.25 + ((i + sh) % NM) * 1.1, heat = Math.max(0, 1 - ((i + sh) % NM) / (NM - 1)); o3.position.set(0, 0, z); o3.updateMatrix(); molds.setMatrixAt(i, o3.matrix); ing.setMatrixAt(i, o3.matrix); ing.setColorAt(i, col.setRGB(0.25 + heat * 5.5, 0.05 + heat * heat * 2.4, 0.02 + heat ** 3 * 0.5)); }
      molds.instanceMatrix.needsUpdate = ing.instanceMatrix.needsUpdate = true; if (ing.instanceColor) ing.instanceColor.needsUpdate = true; });
    e.rect(7.6, 1.2); e.rect(1.8, 7.2, 0, 3.9);
  },
  /** 産業用ロボットアーム (溶接作業) */
  robotarm(P, o, e) {
    const m = MM(), B2 = BM(), Y = o.c ? flat(o.c, 0.5, 0.3) : B2.yl;
    P.cyl(m.dk, 0.62, 0.7, 0.3, 0, 0.15, 0, 'y', 20); P.cyl(m.dk, 0.42, 0.5, 0.3, 0, 0.45, 0, 'y', 20); for (let i = 0; i < 6; i++) P.cyl(m.ch, 0.04, 0.04, 0.06, Math.cos(i * 1.047) * 0.56, 0.32, Math.sin(i * 1.047) * 0.56, 'y', 6);
    const g1 = new THREE.Group(), g2 = new THREE.Group(), g3 = new THREE.Group(), b1 = new Builder(), b2 = new Builder(), b3 = new Builder();
    b1.box(Y, 0.6, 0.5, 0.7, 0, 0.25, 0); b1.add(m.dk, new THREE.CylinderGeometry(0.24, 0.24, 0.84, 14).rotateZ(HP), mx(0, 0.45, 0)); g1.add(b1.build({ shadow: false }));
    b2.box(Y, 0.26, 1.7, 0.3, 0, 0.85, 0); b2.box(m.bk, 0.3, 0.5, 0.34, 0, 0.5, 0); b2.add(m.dk, new THREE.CylinderGeometry(0.2, 0.2, 0.5, 14).rotateZ(HP), mx(0, 1.7, 0)); b2.add(m.ch, new THREE.CylinderGeometry(0.035, 0.035, 1.2, 6), mx(0, 0.9, -0.2)); g2.add(b2.build({ shadow: false })); g2.position.y = 0.45;
    b3.box(Y, 0.2, 1.4, 0.22, 0, 0.7, 0); b3.add(m.dk, new THREE.CylinderGeometry(0.12, 0.14, 0.26, 12), mx(0, 1.5, 0)); b3.add(m.ch, new THREE.CylinderGeometry(0.02, 0.04, 0.3, 8), mx(0, 1.76, 0)); g3.add(b3.build({ shadow: false })); g3.position.y = 1.7;
    const spark = makeGlowSprite('#cfe8ff', 0.7, 5); spark.position.y = 1.94; g3.add(spark); g2.add(g3); g1.add(g2); e.dyn(g1, 0, 0.6, 0);
    const [lx, lz] = W2(e, 0, 1.6), Lt = { x: lx, y: 1.6, z: lz, c: new THREE.Color('#bfe0ff'), i: 0, d: 9 }, ph = e.x * 1.3 + e.z, y0 = g1.rotation.y; e.out.lights.push(Lt);
    e.anim((dt, t) => { const T = t + ph; g1.rotation.y = y0 + Math.sin(T * 0.45) * 0.9; g2.rotation.x = 0.55 + Math.sin(T * 0.8) * 0.3; g3.rotation.x = 1.25 + Math.sin(T * 1.1) * 0.4; const w = Math.sin(T * 0.8) > 0.2 && Math.sin(T * 37) > -0.3; spark.visible = w; spark.scale.setScalar(0.4 + Math.random() * 0.6); Lt.i = w ? 22 + Math.random() * 18 : 0; });
    e.col(0.75);
  },
  /** ベルトコンベア (品物が流れる)。item: 'ingot' | 'crate' | 'shell' */
  conveyor(P, o, e) {
    const m = MM(), B2 = BM(), L = o.l || 8, kind = o.item || 'crate';
    P.box(m.bk, L, 0.08, 0.9, 0, 0.8, 0); for (const s of [-1, 1]) { P.box(m.st, L, 0.16, 0.06, 0, 0.84, s * 0.48); P.box(glow('#ffd23a', 1.2), L, 0.03, 0.02, 0, 0.7, s * 0.5); P.cyl(m.ch, 0.1, 0.1, 0.96, s * L / 2, 0.8, 0, 'z', 12); } for (let x = -L / 2 + 0.5; x < L / 2; x += 1.5) { P.box(m.dk, 0.1, 0.76, 0.9, x, 0.38, 0); P.cyl(m.ch, 0.05, 0.05, 0.92, x + 0.7, 0.74, 0, 'z', 8); }
    const n = Math.max(2, Math.floor(L / 1.5)), geo = kind === 'ingot' ? new THREE.BoxGeometry(0.6, 0.16, 0.3) : kind === 'shell' ? new THREE.CylinderGeometry(0.11, 0.11, 0.8, 12).rotateX(HP) : new THREE.BoxGeometry(0.56, 0.5, 0.56), mt = kind === 'ingot' ? basic('#ff8a2a', 2.6) : kind === 'shell' ? B2.rl : crateM(o.c || 0xc9a22e), im = new THREE.InstancedMesh(geo, mt, n), o3 = new THREE.Object3D(); im.frustumCulled = false; e.dyn(im, 0, kind === 'crate' ? 1.09 : 0.93, 0);
    e.anim((dt, t) => { for (let i = 0; i < n; i++) { const k = ((i / n) + t * (o.sp || 0.05)) % 1; o3.position.set((k - 0.5) * (L - 0.7), 0, 0); o3.rotation.y = kind === 'crate' ? i * 0.4 : 0; o3.updateMatrix(); im.setMatrixAt(i, o3.matrix); } im.instanceMatrix.needsUpdate = true; });
    e.rect(L, 1.0);
  },

  // ───────────────────────── ウェポン ─────────────────────────
  /** 電磁投射砲の機関部: 2 本のレールと加速環。試射すると光が砲口へ走り、砲尾が後座する。砲口 = ローカル +Z */
  railgun(P, o, e) {
    const m = MM(), B2 = BM(), L = o.l || 30, c = o.c || '#8fe8ff', yc = 2.35, h = e.room.h, K = m.dk, z0 = -L / 2;
    // 架台と警戒帯
    P.box(K, 3.4, 0.9, L, 0, 0.45, 0); P.box(m.st, 3.0, 0.56, L - 1, 0, 1.18, 0); P.box(mat('hazard', { rough: 0.7, metal: 0.2 }), 3.44, 0.34, L, 0, 0.72, 0);
    for (const s of [-1, 1]) { P.cyl(crateM(0x2a6ab8), 0.11, 0.11, L - 2, s * 1.52, 1.25, 0, 'z', 10); P.cyl(crateM(0xb8452e), 0.08, 0.08, L - 2, s * 1.55, 1.0, 0, 'z', 8); for (let z = z0 + 2; z < L / 2 - 1; z += 3.2) P.box(K, 0.1, 0.5, 0.2, s * 1.56, 1.12, z); }
    // レールと銅のライナー・絶縁支持
    for (const s of [-1, 1]) { P.box(B2.rl, 0.56, 1.02, L, s * 0.72, yc, 0); P.box(B2.cu, 0.08, 0.72, L - 0.4, s * 0.42, yc, 0); P.box(K, 0.22, 1.34, L - 1, s * 1.1, yc, 0); for (let z = z0 + 1.2; z < L / 2; z += 1.3) P.cyl(m.ch, 0.05, 0.05, 0.06, s * 1.22, yc, z, 'x', 8); }
    for (const s of [-1, 1]) P.box(flat(0xe8e0cc, 0.6, 0), 1.9, 0.2, L - 1, 0, yc + s * 0.74, 0);
    for (let z = z0 + 0.8; z < L / 2; z += 1.6) { strut(P, m.st, [-1.0, 1.46, z], [-1.0, yc - 0.84, z], 0.08); strut(P, m.st, [1.0, 1.46, z], [1.0, yc - 0.84, z], 0.08); }
    // 加速環 (発光部はシェーダで光の波を送る)
    const [ax, az] = W2(e, 0, z0), dir = new THREE.Vector3(Math.sin(e.ang), 0, Math.cos(e.ang));
    const rm = new THREE.ShaderMaterial({ uniforms: { uA: { value: new THREE.Vector3(ax, 0, az) }, uD: { value: dir }, uCol: { value: new THREE.Color(c) }, uWave: { value: -99 }, uBase: { value: 0.4 }, uFlash: { value: 0 } },
      vertexShader: 'uniform vec3 uA,uD;varying float vS;void main(){vec4 w=modelMatrix*vec4(position,1.);vS=dot(w.xyz-uA,uD);gl_Position=projectionMatrix*viewMatrix*w;}',
      fragmentShader: 'uniform vec3 uCol;uniform float uWave,uBase,uFlash;varying float vS;void main(){float d=(vS-uWave)*.42;gl_FragColor=vec4(uCol*(uBase+uFlash+6.5*exp(-d*d)),1.);}' }); rm.userData.uvs = 0;
    const NR = Math.max(4, Math.floor((L - 6) / 2.7));
    for (let i = 0; i < NR; i++) { const z = z0 + 4.6 + i * (L - 7.4) / (NR - 1);
      for (const s of [-1, 1]) { P.box(K, 0.5, 3.5, 0.72, s * 1.62, yc, z); P.box(K, 3.74, 0.5, 0.72, 0, yc + s * 1.52, z); P.box(B2.yl, 0.54, 0.6, 0.76, s * 1.62, yc + 1.2, z); P.box(B2.yl, 0.54, 0.6, 0.76, s * 1.62, yc - 1.2, z); P.box(rm, 0.07, 2.5, 0.5, s * 1.34, yc, z); P.box(rm, 2.6, 0.07, 0.5, 0, yc + s * 1.24, z); }
      for (const [dx, dy] of [[-1.62, 1.52], [1.62, 1.52], [-1.62, -1.52], [1.62, -1.52]]) P.cyl(B2.br, 0.09, 0.09, 0.78, dx, yc + dy, z, 'z', 8);
      if (i % 2 === 0) { P.cyl(m.bk, 0.1, 0.1, Math.max(0.2, h - yc - 1.8), 0.9, (h + yc + 1.8) / 2, z, 'y', 8); P.cyl(m.bk, 0.07, 0.07, Math.max(0.2, h - yc - 1.8), -0.9, (h + yc + 1.8) / 2, z, 'y', 8); P.box(K, 2.4, 0.3, 0.5, 0, yc + 1.9, z); }
      else for (const s of [-1, 1]) { P.cyl(B2.cu, 0.34, 0.34, 0.9, s * 2.15, yc, z, 'x', 14); P.cyl(K, 0.4, 0.4, 0.12, s * 2.62, yc, z, 'x', 14); P.tor(rm, 0.36, 0.03, s * 2.2, yc, z, 0, HP, 0, 20, 5); } }
    // 砲口側: 壁を貫く襟
    P.box(K, 4.2, 4.2, 0.7, 0, yc, L / 2 - 0.35); P.box(B2.yl, 4.3, 0.4, 0.74, 0, yc + 2.0, L / 2 - 0.35); P.box(B2.yl, 4.3, 0.4, 0.74, 0, yc - 2.0, L / 2 - 0.35); P.add(m.bk, new THREE.CircleGeometry(1.25, 28), mx(0, yc, L / 2 - 0.72, 0, Math.PI, 0), 0); P.add(rm, new THREE.TorusGeometry(1.3, 0.05, 6, 36), mx(0, yc, L / 2 - 0.74), 0);
    // 砲尾 (後座する)
    const br = new THREE.Group(), bb = new Builder(); bb.box(B2.gm, 3.2, 3.0, 3.4, 0, yc, 1.3); bb.box(K, 3.4, 0.5, 3.6, 0, yc + 1.6, 1.3); bb.box(K, 3.4, 0.5, 3.6, 0, yc - 1.6, 1.3); bb.box(B2.yl, 3.24, 0.3, 0.3, 0, yc + 1.2, 3.02); bb.box(B2.yl, 3.24, 0.3, 0.3, 0, yc - 1.2, 3.02);
    bb.add(K, new THREE.CylinderGeometry(0.9, 0.9, 0.5, 20).rotateX(HP), mx(0, yc, -0.5)); bb.add(B2.rl, new THREE.CylinderGeometry(0.55, 0.55, 0.3, 20).rotateX(HP), mx(0, yc, -0.82)); for (let i = 0; i < 8; i++) bb.add(m.ch, new THREE.CylinderGeometry(0.07, 0.07, 0.14, 8).rotateX(HP), mx(Math.cos(i * 0.785) * 0.74, yc + Math.sin(i * 0.785) * 0.74, -0.8));
    for (const [dx, dy] of [[-1.25, 1.1], [1.25, 1.1], [-1.25, -1.1], [1.25, -1.1]]) bb.add(m.ch, new THREE.CylinderGeometry(0.13, 0.13, 2.2, 12).rotateX(HP), mx(dx, yc + dy, -1.3)); bb.box(glow('#ff3a2a', 4), 0.3, 0.12, 0.05, 1.2, yc + 0.9, 3.03); bb.box(glow(c, 3), 1.6, 0.06, 0.05, 0, yc, 3.03);
    br.add(bb.build({ shadow: false })); e.dyn(br, 0, 0, z0); const bp0 = br.position.clone();
    P.box(K, 3.6, 3.6, 0.6, 0, yc, z0 - 2.2); for (const [dx, dy] of [[-1.25, 1.1], [1.25, 1.1], [-1.25, -1.1], [1.25, -1.1]]) P.cyl(K, 0.2, 0.2, 1.6, dx, yc + dy, z0 - 1.3, 'z', 12);
    // 装填台と弾体
    P.box(m.st, 1.2, 0.1, 3.0, -2.9, 1.5, z0 + 1.4); for (const dz of [-1.2, 1.2]) P.box(K, 0.1, 1.5, 0.1, -2.9, 0.75, z0 + 1.4 + dz); for (let i = 0; i < 3; i++) { const z = z0 + 0.5 + i * 0.95; P.cyl(B2.rl, 0.15, 0.15, 0.9, -2.9, 1.72, z, 'x', 14); P.cyl(B2.rl, 0.15, 0.02, 0.4, -2.26, 1.72, z, 'x', 14); P.cyl(B2.cu, 0.17, 0.17, 0.14, -3.2, 1.72, z, 'x', 14); }
    // 制御卓 (試射ボタン)
    P.box(K, 0.6, 1.0, 1.2, 3.2, 0.5, z0 + 5.4); P.add(K, new THREE.BoxGeometry(0.8, 0.08, 1.3), mx(3.24, 1.08, z0 + 5.4, 0, 0, -0.3)); P.box(K, 0.06, 0.62, 1.04, 2.98, 1.78, z0 + 5.4); P.box(K, 0.08, 0.5, 0.1, 2.98, 1.3, z0 + 5.4);
    P.add(screenMat('bars', c, 'CHARGE', 1.5), new THREE.PlaneGeometry(0.96, 0.54), mx(3.015, 1.78, z0 + 5.4, 0, HP, 0)); P.cyl(B2.yl, 0.14, 0.16, 0.06, 3.3, 1.1, z0 + 5.4, 'y', 14); P.cyl(glow('#ff3a2a', 4), 0.1, 0.1, 0.06, 3.3, 1.16, z0 + 5.4, 'y', 14); for (const dz of [-0.36, 0.36]) P.box(glow(c, 2.4), 0.12, 0.03, 0.12, 3.3, 1.1, z0 + 5.4 + dz);
    // 弾体・閃光・蒸気
    const slug = e.dyn(new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.2, 2.6, 10).rotateX(HP), basic('#dff6ff', 9)), 0, yc, z0), s0 = slug.position.clone(); slug.visible = false;
    const [mxw, mzw] = W2(e, 0, 0), Lt = { x: mxw, y: yc + 0.6, z: mzw, c: new THREE.Color(c), i: 10, d: 26 }, steam = [0, 1, 2, 3].map((i) => e.dyn(makeGlowSprite('#e8f4ff', 1.6, 0.2), (i % 2 ? 1 : -1) * 2.0, 1.4, z0 + 2 + i * (L - 4) / 3)), st0 = steam.map((s) => s.position.clone()); e.out.lights.push(Lt);
    const S = { ph: 'idle', t: 0, next: 14 + (e.x % 7) }, u = rm.uniforms;
    const fire = () => { if (S.ph !== 'idle') return G.hud?.msg('蓄電中…次の試射まで待て。', 'warn'); S.ph = 'charge'; S.t = 0; G.audio?.sfx('charge'); G.hud?.msg('主砲 蓄電開始 — 加速環が順に励起していく。', 'good'); };
    e.anim((dt, t) => { S.t += dt; for (const s of steam) s.material.opacity = 0;
      if (S.ph === 'idle') { u.uWave.value = -99; u.uBase.value = 0.38 + 0.08 * Math.sin(t * 2); u.uFlash.value *= Math.exp(-3 * dt); Lt.i = 9 + 2 * Math.sin(t * 2); if (S.t > S.next) { S.ph = 'charge'; S.t = 0; } }
      else if (S.ph === 'charge') { const k = S.t / 2.8; u.uWave.value = ((S.t * 2.2) % 1) * L * Math.min(1, k * 1.4); u.uBase.value = 0.4 + k * 1.4; Lt.i = 10 + k * 40; if (S.t > 2.8) { S.ph = 'fire'; S.t = 0; slug.visible = true; if (G.modes?.interior?.cur === e.out) G.audio?.sfx('boom', 0.9); } }
      else { const f = S.t; u.uWave.value = Math.min(1, f / 0.12) * (L + 8); u.uFlash.value = 6 * Math.exp(-f * 3.5); u.uBase.value = 0.4 + 1.4 * Math.exp(-f * 2); Lt.i = 10 + 320 * Math.exp(-f * 5);
        slug.visible = f < 0.12; if (slug.visible) slug.position.set(s0.x + dir.x * (3 + f / 0.12 * (L - 3)), s0.y, s0.z + dir.z * (3 + f / 0.12 * (L - 3)));
        const rc = 0.6 * Math.exp(-f * 2.4) * Math.min(1, f * 30); br.position.set(bp0.x - dir.x * rc, bp0.y, bp0.z - dir.z * rc);
        steam.forEach((s, i) => { const q = f * 0.5 - i * 0.04; if (q > 0 && q < 1) { s.material.opacity = (1 - q) * 0.5; s.scale.setScalar(1.2 + q * 4); s.position.y = st0[i].y + q * 2.4; } });
        if (f > 3.2) { S.ph = 'idle'; S.t = 0; S.next = 26 + (e.z % 9); br.position.copy(bp0); } } });
    item(e, 3.9, z0 + 5.4, 2.3, '主砲を試射する', 'fn', { fn: fire });
    e.rect(5.5, L); e.rect(1.4, 3.2, -2.9, z0 + 1.4); e.rect(0.8, 1.3, 3.2, z0 + 5.4); e.rect(3.8, 2.6, 0, z0 - 1.4);
  },
  /** 整備架に立つ強化外骨格 (機動兵) */
  mech(P, o, e) {
    const m = MM(), B2 = BM(), s = o.s || 0.8, H = B2.gm, Y = o.c ? flat(o.c, 0.55, 0.3) : B2.yl, K = m.dk, bx = (mt, w, h, d, x, y, z, ry = 0, rx = 0, rz = 0) => P.box(mt, w * s, h * s, d * s, x * s, y * s, z * s, ry, rx, rz), cy = (mt, r1, r2, h, x, y, z, ax = 'y', seg = 12) => P.cyl(mt, r1 * s, r2 * s, h * s, x * s, y * s, z * s, ax, seg);
    for (const q of [-1, 1]) {
      bx(K, 0.62, 0.3, 1.05, q * 0.6, 0.15, 0.1); bx(Y, 0.64, 0.14, 0.32, q * 0.6, 0.2, 0.52); bx(H, 0.5, 1.12, 0.56, q * 0.6, 0.86, 0); bx(Y, 0.56, 0.42, 0.3, q * 0.6, 1.46, 0.26); cy(K, 0.2, 0.2, 0.62, q * 0.6, 1.42, 0, 'x', 12);
      bx(K, 0.44, 0.92, 0.5, q * 0.56, 1.92, -0.02); cy(m.ch, 0.05, 0.05, 0.8, q * 0.56, 1.9, -0.3); bx(H, 0.5, 0.4, 0.54, q * 0.56, 2.2, 0.04);
      bx(Y, 0.82, 0.72, 0.92, q * 1.36, 3.78, 0); bx(K, 0.86, 0.12, 0.96, q * 1.36, 4.16, 0); cy(K, 0.26, 0.26, 0.9, q * 1.02, 3.7, 0, 'x', 12); bx(K, 0.4, 0.92, 0.46, q * 1.4, 2.96, 0); cy(K, 0.18, 0.18, 0.5, q * 1.4, 2.5, 0, 'x', 10);
      for (let k = 0; k < 3; k++) bx(m.bk, 0.02, 0.2, 0.5, q * 1.78, 3.6 + k * 0.14, 0, 0, 0.6, 0);
    }
    bx(H, 1.5, 0.52, 0.82, 0, 2.48, 0); bx(K, 0.5, 0.4, 0.6, 0, 2.3, 0.06); bx(H, 1.92, 1.32, 1.2, 0, 3.36, 0); bx(Y, 1.5, 0.72, 0.12, 0, 3.5, 0.62); bx(K, 1.06, 0.42, 0.1, 0, 3.74, 0.68); bx(glow(o.eye || '#6fe8ff', 3.6), 0.92, 0.14, 0.04, 0, 3.76, 0.74);
    for (const q of [-1, 1]) { for (let k = 0; k < 4; k++) bx(m.bk, 0.3, 0.05, 0.03, q * 0.5, 3.0 + k * 0.1, 0.61); bx(K, 0.08, 1.0, 0.06, q * 0.8, 3.4, 0.62); }
    bx(K, 0.52, 0.36, 0.52, 0, 4.2, 0.12); bx(glow('#ff3a2a', 4), 0.3, 0.06, 0.03, 0, 4.22, 0.39); cy(K, 0.012, 0.012, 0.7, 0.22, 4.7, 0, 'y', 4); bx(K, 1.32, 1.12, 0.52, 0, 3.4, -0.86); for (const q of [-1, 1]) { cy(K, 0.22, 0.16, 0.7, q * 0.4, 3.2, -1.2, 'y', 12); P.add(glow('#ff8a3a', 1.4), new THREE.CircleGeometry(0.15 * s, 12).rotateX(HP), mx(q * 0.4 * s, 2.84 * s, -1.2 * s), 0); }
    // 右腕: 3 連装砲 / 左腕: 把持爪
    bx(H, 0.52, 0.52, 1.34, 1.4, 2.3, 0.36); for (let k = 0; k < 3; k++) { cy(K, 0.07, 0.07, 0.95, 1.4 + Math.cos(k * 2.094) * 0.14, 2.3 + Math.sin(k * 2.094) * 0.14, 1.4, 'z', 8); } cy(K, 0.26, 0.26, 0.16, 1.4, 2.3, 1.0, 'z', 12); bx(Y, 0.56, 0.12, 0.5, 1.4, 2.6, 0.2);
    bx(H, 0.5, 1.02, 0.5, -1.4, 2.2, 0.1); for (let k = 0; k < 3; k++) P.add(m.ch, new THREE.BoxGeometry(0.07 * s, 0.5 * s, 0.1 * s), mx((-1.4 + Math.cos(k * 2.094) * 0.2) * s, 1.5 * s, (0.1 + Math.sin(k * 2.094) * 0.2) * s, Math.sin(k * 2.094) * 0.35, 0, Math.cos(k * 2.094) * -0.35));
    // 整備架
    for (const q of [-1, 1]) { bx(m.st, 0.16, 5.0, 0.16, q * 2.1, 2.5, -0.9); bx(m.st, 0.6, 0.12, 0.12, q * 1.82, 3.9, -0.9); bx(B2.yl, 0.2, 0.3, 0.2, q * 1.56, 3.9, -0.9); }
    bx(m.st, 4.4, 0.18, 0.18, 0, 5.0, -0.9); bx(K, 4.6, 0.1, 2.6, 0, 0.05, 0); P.add(mat('hazard', { rough: 0.7, metal: 0.2 }), new THREE.BoxGeometry(4.7 * s, 0.03, 0.3 * s), mx(0, 0.105 * s, 1.2 * s)); for (let k = 0; k < 3; k++) cy(m.bk, 0.04, 0.04, 1.4, -0.6 + k * 0.6, 4.3, -1.0, 'y', 6);
    P.box(K, 0.5, 1.1, 0.4, 2.5 * s, 0.55, 0.6); P.box(K, 0.52, 0.4, 0.06, 2.5 * s, 1.32, 0.76); scr(P, 'data', o.eye || '#6fe8ff', 'UNIT-' + (o.id || '07'), 0.44, 0.32, 2.5 * s, 1.32, 0.795);
    e.col(1.75 * s); e.col(0.4, 2.5 * s, 0.6); e.light(o.eye || '#6fe8ff', 9, 3.2 * s, 7); if (o.use) e.use(o.label || '強化外骨格', o.use, 2.4 + 1.6 * s);
  },
  /** ミサイル架 (3 段 × 2 発) */
  missilerack(P, o, e) {
    const m = MM(), B2 = BM(), RD = flat(0xb8252a, 0.5, 0.2), WH = flat(0xd8dce0, 0.4, 0.3);
    for (const sx of [-1.45, 1.45]) for (const z of [-0.45, 0.45]) P.box(m.st, 0.08, 2.3, 0.08, sx, 1.15, z); for (const s of [-1, 1]) P.box(m.st, 3.0, 0.08, 0.08, 0, 2.3, s * 0.45);
    for (let k = 0; k < 3; k++) { const y = 0.42 + k * 0.66; for (const sx of [-1.0, 1.0]) P.box(m.dk, 0.12, 0.08, 1.0, sx, y - 0.2, 0);
      for (const z of [-0.24, 0.24]) { P.cyl(WH, 0.16, 0.16, 1.9, 0.05, y, z, 'x', 14); P.cyl(RD, 0.16, 0.02, 0.52, 1.26, y, z, 'x', 14); P.cyl(m.dk, 0.14, 0.16, 0.3, -1.05, y, z, 'x', 14); P.cyl(B2.yl, 0.165, 0.165, 0.1, 0.5, y, z, 'x', 14); P.cyl(m.bk, 0.165, 0.165, 0.04, -0.4, y, z, 'x', 14);
        for (let q = 0; q < 4; q++) P.add(m.dk, new THREE.BoxGeometry(0.3, 0.2, 0.02), mx(-1.0, y + Math.sin(q * HP + 0.785) * 0.2, z + Math.cos(q * HP + 0.785) * 0.2, q * HP + 0.785, 0, 0)); P.add(glow('#ff8a3a', 1.2), new THREE.CircleGeometry(0.1, 10), mx(-1.205, y, z, 0, -HP, 0), 0); } }
    P.box(glow('#ff3a2a', 2.6), 0.5, 0.05, 0.02, 0, 2.2, 0.5); P.box(B2.yl, 3.0, 0.14, 0.03, 0, 0.14, 0.5); e.rect(3.1, 1.05);
  },
  /** 投射砲の弾体の架 */
  shellrack(P, o, e) {
    const m = MM(), B2 = BM(), n = o.n || 6;
    P.box(m.dk, n * 0.46 + 0.2, 0.36, 0.6, 0, 0.18, 0); P.box(m.dk, n * 0.46 + 0.2, 2.0, 0.08, 0, 1.0, -0.28); P.box(B2.yl, n * 0.46 + 0.2, 0.1, 0.03, 0, 0.3, 0.31); P.box(glow(o.c || '#8fe8ff', 2.4), n * 0.46, 0.03, 0.02, 0, 1.96, -0.23);
    for (let i = 0; i < n; i++) { const x = (i - (n - 1) / 2) * 0.46; P.cyl(m.dk, 0.16, 0.18, 0.12, x, 0.42, 0, 'y', 12); P.cyl(B2.rl, 0.115, 0.115, 0.95, x, 0.95, 0, 'y', 14); P.cyl(B2.rl, 0.012, 0.115, 0.42, x, 1.63, 0, 'y', 14); P.cyl(B2.cu, 0.13, 0.13, 0.1, x, 0.62, 0, 'y', 14); P.cyl(B2.cu, 0.13, 0.13, 0.06, x, 1.3, 0, 'y', 14); P.box(m.st, 0.3, 0.04, 0.2, x, 1.5, -0.18); }
    e.rect(n * 0.46 + 0.2, 0.62);
  },
  /** 射撃試験場: 射座と、左右に動く標的。標的が正面に来た瞬間に撃つと命中。射撃方向 = ローカル +Z */
  range(P, o, e) {
    const m = MM(), B2 = BM(), d = o.d || 15, n = o.n || 2, w = o.w || 3.2, h = e.room.h, c = o.c || '#ff5a3a', tg = [];
    for (let i = 0; i < n; i++) { const x = (i - (n - 1) / 2) * w;
      P.box(m.dk, w - 0.5, 1.05, 0.55, x, 0.52, 0.2); P.box(m.st, w - 0.4, 0.05, 0.65, x, 1.07, 0.2); P.box(B2.yl, w - 0.5, 0.1, 0.02, x, 0.16, 0.48);
      P.box(B2.gm, 0.95, 0.09, 0.08, x - 0.2, 1.16, 0.2, 0.2); P.cyl(m.bk, 0.02, 0.022, 0.5, x + 0.34, 1.16, 0.1, 'x', 8); P.box(m.bk, 0.06, 0.16, 0.1, x - 0.44, 1.07, 0.26, 0.2); P.cyl(m.bk, 0.035, 0.035, 0.24, x - 0.1, 1.24, 0.19, 'x', 8); for (const s of [-1, 1]) P.cyl(fab(0x8a2a20), 0.07, 0.07, 0.05, x + 0.9 + s * 0.09, 1.14, 0.3, 'x', 10);
      P.box(m.dk, 0.66, 0.44, 0.05, x + w / 2 - 0.5, 2.0, 0.42); P.add(screenMat('bars', c, 'LANE ' + (i + 1), 1.5), new THREE.PlaneGeometry(0.6, 0.38), mx(x + w / 2 - 0.5, 2.0, 0.39, 0, Math.PI, 0)); P.box(m.dk, 0.06, 0.3, 0.06, x + w / 2 - 0.5, 2.36, 0.42);
      P.box(m.dk, 0.2, 0.2, d + 1.4, x, h - 0.3, d / 2 + 0.4); for (let z = 5; z < d; z += 5) { P.box(glow('#ffd23a', 1.3), w - 0.3, 0.02, 0.1, x, 0.012, z); }
      // 標的 (同心円の光輪)
      const g = new THREE.Group(), tb = new Builder(), hit = basic(c, 3); for (const [r, col] of [[0.6, c], [0.42, '#ffffff'], [0.24, c]]) tb.add(glow(col, 2.6), new THREE.TorusGeometry(r, 0.025, 6, 36), null, 0); tb.add(m.dk, new THREE.CylinderGeometry(0.02, 0.02, h - 2.2, 5), mx(0, (h - 2.2) / 2 + 0.6, 0)); tb.add(m.dk, new THREE.BoxGeometry(0.5, 0.2, 0.3), mx(0, h - 1.75, 0));
      g.add(tb.build({ shadow: false })); const dot = new THREE.Mesh(new THREE.CircleGeometry(0.1, 16), hit), disc = new THREE.Mesh(new THREE.CircleGeometry(0.62, 28), holoMat(c, 0.35)); disc.rotation.y = Math.PI; dot.rotation.y = Math.PI; g.add(dot, disc); e.dyn(g, x, 1.45, d); tg.push({ g, p0: g.position.clone(), hit, flash: 0, x });
    }
    for (let i = 0; i <= n; i++) { const x = (i - n / 2) * w; P.box(m.dk, 0.08, 2.3, 1.6, x, 1.15, 0.3); P.add(glassMat(), new THREE.BoxGeometry(0.03, 1.2, 1.5), mx(x, 1.7, 0.3), 0); }
    // 弾止め (傾けた鋼板) と警告灯
    for (let k = 0; k < 4; k++) P.add(B2.gm, new THREE.BoxGeometry(n * w, 1.2, 0.12), mx(0, 0.55 + k * 1.0, d + 1.9 - k * 0.12, -0.5, 0, 0)); P.box(m.bk, n * w, 0.5, 1.4, 0, 0.25, d + 1.5);
    for (const s of [-1, 1]) P.sph(glow('#ff3a2a', 4), 0.1, s * (n * w / 2 - 0.3), h - 0.5, d + 1.2, 1, 1, 1, 8);
    const tracer = e.dyn(new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.012, 1, 5).rotateX(HP), basic('#9fe8ff', 8, ADD)), 0, 1.3, 0), ca = Math.cos(e.ang), sa = Math.sin(e.ang), tp0 = tracer.position.clone(); tracer.visible = false;
    let score = 0, shots = 0, tt = 0, time = 0;
    const off = (i, t) => Math.sin(t * (1.1 + i * 0.37) + i * 1.9) * (w / 2 - 0.75);
    const fire = () => { const pp = G.modes.interior.pos; let li = 0, bd = 1e9; tg.forEach((q, i) => { const [wx, wz] = W2(e, q.x, 0.2), dd = Math.hypot(pp.x - wx, pp.z - wz); if (dd < bd) { bd = dd; li = i; } });
      const q = tg[li], o2 = off(li, time), ok = Math.abs(o2) < 0.24, bull = Math.abs(o2) < 0.09; shots++; G.audio?.sfx('blaster'); tt = 0.14; tracer.visible = true; tracer.scale.set(1, 1, d - 0.6);
      const lx = q.x, lz = 0.6 + (d - 0.6) / 2; tracer.position.set(tp0.x + lx * ca + lz * sa, tp0.y, tp0.z - lx * sa + lz * ca);
      if (ok) { score += bull ? 10 : 5; q.flash = 1; G.audio?.sfx(bull ? 'reward' : 'pickup'); G.hud.msg(bull ? `中心に命中！ +10　(${score} 点 / ${shots} 発)` : `命中 +5　(${score} 点 / ${shots} 発)`, 'good', 3); } else G.hud.msg(`外れ — 標的が正面に来た瞬間を狙え　(${score} 点 / ${shots} 発)`, '', 3); };
    e.anim((dt, t) => { time = t; tt -= dt; if (tt <= 0) tracer.visible = false; tg.forEach((q, i) => { const o2 = off(i, t); q.g.position.set(q.p0.x + o2 * ca, q.p0.y, q.p0.z - o2 * sa); q.flash *= Math.exp(-5 * dt); q.hit.color.set(c).multiplyScalar(3 + q.flash * 14); q.g.scale.setScalar(1 + q.flash * 0.25); }); });
    item(e, 0, -0.5, Math.max(2.4, n * w / 2 + 0.6), '標的を撃つ', 'fn', { fn: fire, wide: 1 });
    e.rect(o.block || n * w, 0.7, 0, 0.25); e.light(c, 10, 2, 8);
    { const [lx, lz] = W2(e, 0, d - 1); e.out.lights.push({ x: lx, y: 2.2, z: lz, c: new THREE.Color('#ffd9c0'), i: 22, d: 14 }); }
  },
  /** 試験台の近接防御砲 (首を振り、砲身が回る) */
  turret(P, o, e) {
    const m = MM(), B2 = BM(), c = o.c || '#ff3a2a';
    P.cyl(m.dk, 0.9, 1.05, 0.8, 0, 0.4, 0, 'y', 6); P.cyl(B2.yl, 0.94, 0.94, 0.1, 0, 0.74, 0, 'y', 6); P.cyl(m.st, 0.5, 0.6, 0.3, 0, 0.95, 0, 'y', 16);
    const head = new THREE.Group(), hb = new Builder(); hb.box(B2.gm, 1.0, 0.72, 1.4, 0, 0.36, 0); hb.box(m.dk, 1.06, 0.1, 1.46, 0, 0.74, 0); hb.box(m.bk, 0.5, 0.3, 0.06, 0, 0.42, 0.71); hb.box(glow(c, 4), 0.3, 0.06, 0.03, 0, 0.44, 0.745); hb.box(B2.yl, 0.36, 0.5, 0.9, 0.7, 0.36, -0.1); hb.add(m.dk, new THREE.CylinderGeometry(0.2, 0.2, 0.5, 12).rotateZ(HP), mx(-0.66, 0.4, 0.1));
    head.add(hb.build({ shadow: false })); const guns = [-0.3, 0.3].map((dx) => { const g = new THREE.Group(), gb = new Builder(); for (let k = 0; k < 6; k++) gb.add(m.dk, new THREE.CylinderGeometry(0.03, 0.03, 1.5, 6).rotateX(HP), mx(Math.cos(k * 1.047) * 0.09, Math.sin(k * 1.047) * 0.09, 0.75)); gb.add(B2.rl, new THREE.CylinderGeometry(0.13, 0.13, 0.1, 12).rotateX(HP), mx(0, 0, 0.5)); gb.add(B2.rl, new THREE.CylinderGeometry(0.13, 0.13, 0.1, 12).rotateX(HP), mx(0, 0, 1.4)); g.add(gb.build({ shadow: false })); g.position.set(dx, 0.36, 0.7); head.add(g); return g; });
    e.dyn(head, 0, 1.1, 0); const y0 = head.rotation.y, ph = e.x + e.z;
    e.anim((dt, t) => { head.rotation.y = y0 + Math.sin(t * 0.5 + ph) * 0.9; const spin = Math.sin(t * 0.5 + ph) > 0.4 ? 26 : 2; guns.forEach((g, i) => { g.rotation.z += dt * spin * (i ? -1 : 1); }); });
    e.col(1.1); e.light(c, 6, 1.8, 5);
  },
  /** 戦術ホログラム卓 (惑星の弧と敵味方の光点) */
  holotable(P, o, e) {
    const m = MM(), B2 = BM(), R = o.r || 1.7, c = o.c || e.th.trim, ec = '#ff5a4a';
    P.cyl(m.dk, R * 0.5, R * 0.7, 0.84, 0, 0.42, 0, 'y', 8); P.cyl(m.dk, R, R, 0.14, 0, 0.9, 0, 'y', 8); P.cyl(m.bk, R - 0.14, R - 0.14, 0.04, 0, 0.98, 0, 'y', 8); P.tor(glow(c, 3.4), R - 0.07, 0.025, 0, 0.99, 0, HP, 0, 0, 8, 5); P.cyl(B2.yl, R + 0.02, R + 0.02, 0.05, 0, 0.84, 0, 'y', 8);
    P.add(glow(c, 0.7), new THREE.CircleGeometry(R - 0.2, 8).rotateX(-HP), mx(0, 1.003, 0, 0, 0.3927, 0), 0);
    const g = e.dyn(new THREE.Group(), 0, 1.5, 0), hm = holoMat(c), LM = new THREE.LineBasicMaterial({ color: new THREE.Color(c).multiplyScalar(1.6), transparent: true, opacity: 0.5, blending: THREE.AdditiveBlending, depthWrite: false });
    const pl = new THREE.Mesh(new THREE.SphereGeometry(R * 1.6, 28, 10, 0, TAU, 0, 0.5), holoMat('#ff8a3a', 0.9)); pl.position.y = -R * 1.6 - 0.2; g.add(pl, new THREE.LineSegments(new THREE.WireframeGeometry(new THREE.SphereGeometry(R * 1.62, 18, 5, 0, TAU, 0, 0.5)), LM)); g.children[1].position.y = -R * 1.6 - 0.2;
    for (const rr of [0.5, 0.85]) g.add(new THREE.Mesh(new THREE.TorusGeometry(R * rr, 0.006, 4, 64).rotateX(HP), hm));
    const st = new THREE.Mesh(new THREE.OctahedronGeometry(0.09), basic('#ffe14d', 4)); st.position.set(0, 0.25, 0); g.add(st);
    const blips = []; for (let i = 0; i < 6; i++) { const b = new THREE.Mesh(new THREE.TetrahedronGeometry(0.06), basic(i < 4 ? ec : '#5dff8a', 4)); g.add(b); blips.push(b); }
    const cone = e.dyn(new THREE.Mesh(new THREE.CylinderGeometry(R * 0.95, R * 0.8, 1.1, 8, 1, true), holoMat(c, 0.07)), 0, 1.55, 0);
    e.anim((dt, t) => { g.rotation.y += dt * 0.12; st.rotation.y += dt * 2; blips.forEach((b, i) => { const a = t * (0.2 + i * 0.05) * (i % 2 ? 1 : -1) + i * 1.3, rr = R * (0.35 + (i % 3) * 0.2); b.position.set(Math.cos(a) * rr, 0.2 + Math.sin(t * 0.8 + i) * 0.14, Math.sin(a) * rr); b.rotation.x += dt * 2; }); cone.rotation.y -= dt * 0.1; });
    e.col(R + 0.1); e.light(c, 20, 1.8, 9); if (o.use) e.use(o.label, o.use, R + 2.4);
  },
  /** 回転警告灯 */
  alarm(P, o, e) {
    const m = MM(), c = o.c || '#ff3a2a', y = o.y || 2.7; P.box(m.dk, 0.3, 0.3, 0.12, 0, y, 0.06); P.cyl(m.dk, 0.11, 0.13, 0.06, 0, y - 0.02, 0.22, 'y', 12);
    const lamp = e.dyn(new THREE.Mesh(new THREE.SphereGeometry(0.1, 12, 8, 0, TAU, 0, HP), basic(c, 4)), 0, y + 0.01, 0.22), L = { x: W2(e, 0, 0.4)[0], y: y - 0.2, z: W2(e, 0, 0.4)[1], c: new THREE.Color(c), i: 8, d: 9 }, ph = e.x * 0.7 + e.z * 0.3; e.out.lights.push(L);
    e.anim((dt, t) => { const k = Math.max(0, Math.sin(t * (o.sp || 3.4) + ph)); lamp.material.color.set(c).multiplyScalar(0.8 + k * 6); L.i = 3 + k * 16; });
  },
  /** 弾薬箱の山 */
  ammobox(P, o, e) {
    const m = MM(), B2 = BM(), n = o.n || 5, OL = crateM(o.c || 0x4a5a3a);
    for (let i = 0; i < n; i++) { const a = i < 3 ? i * 2.1 : e.rnd() * 6, d = i === 0 ? 0 : 0.5 + e.rnd() * 0.5, lv = i > 2 ? 1 : 0, x = Math.cos(a) * d * (lv ? 0.3 : 1), z = Math.sin(a) * d * (lv ? 0.3 : 1), y = 0.24 + lv * 0.5, ry = e.rnd() * 0.5;
      P.box(OL, 0.95, 0.46, 0.5, x, y, z, ry); P.box(B2.yl, 0.97, 0.08, 0.52, x, y + 0.1, z, ry); P.box(m.bk, 0.3, 0.12, 0.52, x, y - 0.08, z, ry); for (const s of [-1, 1]) P.box(m.ch, 0.04, 0.1, 0.54, x + s * 0.3 * Math.cos(ry), y + 0.2, z - s * 0.3 * Math.sin(ry), ry); }
    e.col(n > 2 ? 1.15 : 0.7);
  },
  /** 床の警戒帯 (黄と黒の斜線) */
  hazard(P, o, e) { const w = o.w || 4, d = o.d || 0.5; P.add(mat('hazard', { rough: 0.7, metal: 0.2 }), new THREE.BoxGeometry(w, 0.012, d), mx(0, 0.011, 0)); },
};
