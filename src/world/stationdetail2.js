// 追加ステーションの外装ディテール (2): ファイザー・ウェポン
//   本体の形は stations2.js。ここでは艤装・灯火群・行き交う小型船、それに試射に連動する演出を足す
import * as THREE from 'three';
import { Builder, mx, rockGeo } from '../gfx/builder.js';
import { mat, glow } from '../gfx/textures.js';
import { makeGlowSprite, fxTime } from '../gfx/fx.js';
import { rng, rr } from '../core/util.js';
import { V, sign } from './stationkit.js';
import { kit, at, wp, frame, signOn, rod, truss, dish, mast, rcs, hatch, buoy, gate, ringLights, shuttle, patrol, pod, craftOf, lightField, traffic, noShadow } from './stationparts.js';

const HP = Math.PI / 2, TAU = Math.PI * 2;
const ADD = { transparent: true, blending: THREE.AdditiveBlending, depthWrite: false };

// ───────────────────────── ファイザー ─────────────────────────
/** 回転する二重らせん (hb) の艤装。rungs: [{ a, c, mid, gc }] (gc = G-C 対)。戻り値 = らせんと一緒に回る灯火のリスト */
export function detailFizerHelix(hb, c) {
  const { H, D, hp, rungs } = c, F = [], up = V(0, 1, 0), GW = glow('#ffffff', 3.2), GV = glow('#b48cff', 3.4);
  for (const ph of [0, Math.PI]) {
    for (let k = 1; k < 27; k++) { const t = k / 27; at(hb, hp(t, ph), hp(t + 0.002, ph).sub(hp(t - 0.002, ph))).add(D, new THREE.TorusGeometry(9.3, 0.8, 5, 18).rotateX(HP)); } // 鎖の継手
    for (let i = 0; i < 54; i++) F.push({ p: hp((i + 0.5) / 54, ph, 68.5), c: ph ? '#c9a0ff' : '#4dffd8', s: 5, k: 2, blink: 0.4, ph: 1 - i / 54, duty: 0.25 }); // 鎖を昇っていく灯
  }
  for (const q of rungs) {
    const dir = q.c.clone().sub(q.a).normalize(), n = q.gc ? 3 : 2;
    // 水素結合の数 (A-T は 2 本、G-C は 3 本) を中央の円盤の縁に灯す
    for (const sg of [-1, 1]) for (let j = 0; j < n; j++) hb.box(GW, 0.7, 1, 0.7, q.mid.x + dir.x * sg * 15.7, q.mid.y + (j - (n - 1) / 2) * 1.5, q.mid.z + dir.z * sg * 15.7);
    // 各塩基の外側にドッキング口
    for (const [e, sg] of [[q.a, -1], [q.c, 1]]) { const out = dir.clone().multiplyScalar(sg), P = at(hb, e.clone().addScaledVector(out, 11.2), out, up); P.cyl(D, 3.6, 4.2, 2.4, 0, 1.2, 0, 'y', 12); P.cyl(H, 2.8, 2.8, 0.5, 0, 2.6, 0, 'y', 12); P.tor(GV, 3.2, 0.2, 0, 2.7, 0, HP, 0, 0, 16, 4); }
  }
  return F;
}

/** c: { H, D, VI, GDm, GV, GT, signs, NOISE, VS } */
export function detailFizer(b, c) {
  const { H, D, VI, GDm, GV, GT } = c, m = kit({ H, D, uvs: 0.04 }), F = [], up = V(0, 1, 0), dn = V(0, -1, 0), CY = 262, CR = 42, CL = 76, BY = -222, BRR = 96, Y0 = -170, Y1 = 170;
  const GRN = mat('flat', { color: 0x0c2a18, rough: 0.08, metal: 0.85, emissive: '#3aff8a', ei: 0.6 }), GWm = glow('#fff2d8', 2.6);
  // ── 中心の培養管: 案内レール ──
  for (let k = 0; k < 3; k++) { const a = k * TAU / 3 + 0.5; b.cyl(D, 0.5, 0.5, Y1 - Y0 + 22, Math.cos(a) * 13.3, 0, Math.sin(a) * 13.3, 'y', 5); }
  // ── カプセル居住棟: 観測ドーム・連絡艇の桟橋・姿勢制御・継ぎ目・窓の灯 ──
  { const P = at(b, V(-CL - CR + 2.5, CY, 0), V(-1, 0, 0), up); P.add(GRN, new THREE.SphereGeometry(16, 20, 9, 0, TAU, 0, HP)); P.tor(GDm, 16.3, 0.9, 0, 0.4, 0, HP, 0, 0, 32, 5); F.push({ p: wp(P, 0, 18.5, 0), c: '#8fffc0', s: 12, k: 1.4 }); }
  { const P = at(b, V(CL + CR - 1.5, CY, 0), V(1, 0, 0), up); hatch(P, m, 6, GV); dish(at(b, V(CL + 20, CY + 30, 0), V(0.75, 0.66, 0), up), m, 9, { el: 0.3, az: 0 }); F.push({ p: wp(P, 0, 6, 0), c: '#c9a0ff', s: 9, blink: 0.7, ph: 0.1 }); }
  for (const s of [-1, 1]) {
    const P = at(b, V(48, CY - 8, s * (CR - 1)), V(0, 0, s), V(1, 0, 0)); P.cyl(D, 3, 3.4, 11, 0, 5.5, 0, 'y', 12); P.tor(GV, 3.5, 0.25, 0, 10.4, 0, HP, 0, 0, 16, 4); P.box(D, 5, 1.4, 30, 0, 1, 0);
    shuttle(at(b, V(48, CY - 8, s * (CR + 13.6)), up, V(1, 0, 0)), m, VI);
    b.add(D, new THREE.TorusGeometry(CR + 0.3, 0.7, 5, 64).rotateY(HP), mx(s * CL, CY, 0));
    for (const sx of [-1, 1]) rcs(at(b, V(sx * 70, CY + s * (CR - 0.3), 0), V(0, s, 0), V(1, 0, 0)), m, 4);
    rod(b, D, V(0, CY + 10, s * 40), V(0, 233, s * 172), 0.5); rod(b, H, V(0, 200, s * 16), V(0, 228.5, s * 25), 2.2); rod(b, H, V(s * 16, 200, 0), V(s * 60, 221, 0), 2.2);
  }
  for (const x of [30, 56]) ringLights(F, frame(V(x, CY, 0), V(1, 0, 0)), CR + 1.2, 20, { c: '#e8d8ff', s: 4, k: 1.6, a0: x });
  // ── ベンゼン環の基部: タンクの配管・弁・銘板・結合部のバルブ・π電子の環 ──
  const LBL = ['T1 純水', 'T2 酸素', 'T3 窒素', 'T4 培地', 'T5 溶媒', 'T6 ヘリウム'];
  for (let k = 0; k < 6; k++) {
    const a = k * Math.PI / 3, ra = V(Math.cos(a), 0, Math.sin(a)), ta = V(-Math.sin(a), 0, Math.cos(a)), p0 = ra.clone().multiplyScalar(BRR).setY(BY), p1 = V(Math.cos(a + Math.PI / 3) * BRR, BY, Math.sin(a + Math.PI / 3) * BRR);
    for (const d of [0, HP]) b.add(D, new THREE.TorusGeometry(25.5, 0.8, 5, 40), mx(p0.x, p0.y, p0.z, 0, -a + d, 0));
    const T = at(b, p0.clone().setY(BY + 25), up, ra); T.cyl(D, 4.5, 5.5, 5, 0, 2, 0, 'y', 12); T.tor(GDm, 3.2, 0.5, 0, 5.6, 0, HP, 0, 0, 14, 5); T.cyl(D, 0.5, 0.5, 2, 0, 5, 0, 'y', 5);
    F.push({ p: wp(T, 0, 8.5, 0), c: k % 2 ? '#c9a0ff' : '#4dffd8', s: 7, blink: 0.6, ph: k / 6, duty: 0.3 });
    const Bm = at(b, p0.clone().setY(BY - 25), dn, ra); Bm.cyl(D, 3, 4.4, 6, 0, 2.6, 0, 'y', 10); Bm.cyl(H, 1.6, 1.6, 7, 0, 8, 0, 'y', 8);
    c.signs.push(signOn(LBL[k], k % 2 ? '#ffffff' : '#b48cff', 7, p0.clone().addScaledVector(ra, 24.3).setY(BY + 11), ta.clone().negate(), ra, { intensity: 2 }));
    const Mv = at(b, p0.clone().add(p1).multiplyScalar(0.5), up, p1.clone().sub(p0)), hh = k % 2 ? 18 : 12; Mv.box(D, 8, hh, 8, 0, 0, 0); Mv.tor(GDm, 3, 0.45, 0, hh / 2 + 1.6, 0, HP, 0, 0, 14, 5); Mv.cyl(D, 0.5, 0.5, 2, 0, hh / 2 + 0.8, 0, 'y', 5);
    b.sph(k % 2 ? VI : H, 5.6, ra.x * 54, BY, ra.z * 54, 1, 1, 1, 12); b.add(GDm, new THREE.TorusGeometry(5.8, 0.4, 5, 20), mx(ra.x * 54, BY, ra.z * 54, 0, -a + HP, 0));
    const Hf = at(b, ra.clone().multiplyScalar(29.6).setY(BY), ra, up); for (const s of [-1, 1]) Hf.box(GWm, 9, 0.3, 3, s * 10, 0.2, 5); Hf.box(GV, 26, 0.3, 0.5, 0, 0.2, -9);
  }
  b.tor(GT, 62, 0.7, 0, BY, 0, HP, 0, 0, 96, 5);
  b.tor(m.HZ, 12.5, 1, 0, BY - 18.2, 0, HP, 0, 0, 32, 5); ringLights(F, frame(V(0, BY - 20.5, 0), dn), 14, 12, { c: '#c9a0ff', s: 4, blink: 1.2, chase: 1, duty: 0.3 });
  // ── 進入ゲート (六角形) と航路ブイ ──
  for (let k = 0; k < 3; k++) for (const p of gate(b, m, V(0, BY - 80 - k * 70 - k * k * 6, 0), dn, 26 + k * 5, 6, 1.1)) F.push({ p, c: '#c9a0ff', s: 7, blink: 0.8, ph: k * 0.25, duty: 0.3 });
  for (let k = 0; k < 6; k++) { const a = k * Math.PI / 3 + 0.52; F.push({ p: buoy(b, m, V(Math.cos(a) * 430, 0, Math.sin(a) * 430), 3), c: k % 2 ? '#c9a0ff' : '#4dffd8', s: 11, blink: 0.5, ph: k / 6 }); }

  // ── 動くもの: 培養液の流れ・気泡・タンクの冷気・試料カプセル・連絡艇 ──
  return (o, helix) => {
    const obj = o.obj; noShadow(obj); noShadow(helix); obj.add(lightField(F));
    const fluid = new THREE.Mesh(new THREE.CylinderGeometry(7.6, 7.6, Y1 - Y0 + 20, 20, 1, true), new THREE.ShaderMaterial({ uniforms: { uTime: fxTime, uCol: { value: new THREE.Color('#4dffd8').multiplyScalar(1.6) } }, vertexShader: c.VS, ...ADD,
      fragmentShader: 'uniform float uTime;uniform vec3 uCol;varying vec3 vP;' + c.NOISE + 'void main(){float band=pow(.5+.5*sin(vP.y*.16-uTime*2.2),8.);float n=n3(vec3(vP.x*.5,vP.y*.22-uTime*1.5,vP.z*.5));gl_FragColor=vec4(uCol*(band*1.5+smoothstep(.55,.85,n)*1.3),1.);}' }));
    obj.add(fluid);
    const bub = Array.from({ length: 12 }, (_, i) => { const s = makeGlowSprite('#c8fff2', 2.2 + (i % 3) * 0.8, 1.8); obj.add(s); return { s, a: i * 2.4, sp: 9 + (i % 4) * 3, ph: i * 31 }; });
    const puffs = [0, 2, 4].map((k) => { const s = makeGlowSprite('#dff6ff', 16, 0.5), a = k * Math.PI / 3; s.position.set(Math.cos(a) * BRR, BY - 38, Math.sin(a) * BRR); obj.add(s); return s; });
    const pods = traffic(obj, craftOf((B) => pod(B, m)), 8, (i, t, P) => { const a = t * (0.16 + i * 0.013) * (i % 2 ? 1 : -1) + i * 0.8, R1 = 108 + (i % 4) * 14; P.set(Math.cos(a) * R1, -150 + i * 42 + Math.sin(a * 2 + i) * 10, Math.sin(a) * R1); return true; }, { glow: '#4dffd8', gs: 7, tail: 3.5 });
    const med = traffic(obj, craftOf((B) => shuttle(B, m, VI)), 2, (i, t, P) => { const s = i ? -1 : 1, u = t * 0.07 + i * 3; P.set(48 + 130 * Math.sin(u), CY + 22 + Math.sin(u * 2) * 6, s * (90 + 250 * (1 - Math.cos(u)))); return true; }, { glow: '#c9a0ff', gs: 14, tail: 13 });
    o.anim.push((t) => {
      for (const q of bub) { const y = (t * q.sp + q.ph) % 350; q.s.position.set(Math.cos(q.a + y * 0.05) * 9.8, Y0 - 5 + y, Math.sin(q.a + y * 0.05) * 9.8); }
      puffs.forEach((s, i) => { const k = (t * 0.25 + i * 0.37) % 1; s.material.opacity = k < 0.3 ? Math.sin(k / 0.3 * Math.PI) : 0; s.scale.setScalar(10 + k * 60); });
      pods(t); med(t);
    });
  };
}

// ───────────────────────── ウェポン ─────────────────────────
/** c: { H, D, Y, RL, CU, GR, RK, ZM, ZB, TZ, PERIOD, signs } */
export function detailWeapon(b, c) {
  const { H, D, Y, RL, CU, GR, RK, ZM, TZ, PERIOD } = c, m = kit({ H, D, Y, uvs: 0.05 }), r = rng(3141), F = [], up = V(0, 1, 0);
  const K = mat('flat', { color: 0x14171b, rough: 0.6, metal: 0.3 }), INS = mat('flat', { color: 0xe8e6e0, rough: 0.35, metal: 0.05 }), AR = mat('armor', { color: 0x596069, rough: 0.6, metal: 0.7, uvs: 0.07 }), GA = glow('#ffb060', 2);
  // ── 砲身: 給電ケーブル・冷却管・ボルト列・加速環の機器・安定翼・支持トラス ──
  for (const sx of [-1, 1]) for (const sy of [-1, 1]) {
    const pts = []; for (let j = -2; j <= 16; j++) { const sag = j % 2 ? 1.5 : 0; pts.push(V(sx * (24.3 + sag * 0.6), sy * (23.3 + sag * 0.6), -48 - j * 15)); }
    b.add(K, new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 72, 1.1, 6, false));
    for (let i = 0; i < 9; i++) b.box(D, 3.6, 3.6, 4, sx * 24.3, sy * 23.3, -48 - i * 30); // 環ごとの留め具
  }
  for (const s of [-1, 1]) { b.cyl(CU, 0.8, 0.8, 262, s * 6, 14.1, -167, 'z', 6); for (const y of [-6, 6]) for (let i = 0; i < 36; i++) b.box(RL, 0.5, 0.9, 0.9, s * 16.2, y, -36 - i * 7.5); }
  for (let i = 0; i < 9; i++) {
    const z = -48 - i * 30;
    for (const s of [-1, 1]) { b.box(H, 14, 5, 7, 0, s * 24.4, z); b.box(D, 10, 1.2, 8, 0, s * 27.4, z); if (i % 2) { b.box(H, 5, 14, 7, s * 25.4, 0, z); b.box(D, 1.2, 10, 8, s * 28.4, 0, z); } }
    F.push({ p: V(0, 29.5, z), c: '#ff3a2a', s: 6 }, { p: V(0, -29.5, z), c: '#ff3a2a', s: 6 });
    for (const s of [-1, 1]) F.push({ p: V(s * (i % 2 ? 30.5 : 36.5), 0, z), c: '#ffb060', s: 6, k: 2.2, blink: 0.6, ph: 1 - i / 9, duty: 0.22 });
  }
  for (const s of [-1, 1]) { b.box(H, 34, 1.4, 18, s * 34, 0, -153); b.box(D, 4, 3, 22, s * 51, 0, -153); b.box(Y, 34.4, 1.5, 2, s * 34, 0, -145); F.push({ p: V(s * 54.5, 0, -153), c: s > 0 ? '#3f6' : '#f33', s: 9, blink: 0.8, ph: 0.3 }); }
  truss(b, D, V(0, -32, -24), V(0, -32, -175), 6); rod(b, D, V(0, -32, -175), V(0, -13, -196), 1); for (let i = 0; i < 5; i++) b.box(D, 2, 3, 2, 0, -29, -48 - i * 30);
  // 砲口: 警戒帯・消炎器の爪と邪魔板
  b.box(m.HZ, 34.6, 34.6, 3, 0, 0, ZM + 3.4);
  for (const sx of [-1, 1]) for (const sy of [-1, 1]) b.box(D, 4, 4, 46, sx * 15, sy * 15, ZM - 31);
  for (const z of [ZM - 18, ZM - 32, ZM - 46]) for (const s of [-1, 1]) { b.box(D, 34, 3, 2.5, 0, s * 15.5, z); b.box(D, 3, 28, 2.5, s * 15.5, 0, z); }
  for (const s of [-1, 1]) F.push({ p: V(s * 18, 18, ZM - 54), c: '#ff3a2a', s: 8, blink: 1.2, ph: s * 0.25 + 0.5 });
  // ── 機関部: 駐退機・垂直発射筒・位相配列レーダー・アンテナ・装甲板・ハッチ・竜骨 ──
  for (const sx of [-1, 1]) for (const sy of [-1, 1]) { b.cyl(RL, 3.2, 3.2, 14, sx * 28, sy * 14, -44, 'z', 12); b.cyl(D, 4.6, 4.6, 8, sx * 28, sy * 14, -40, 'z', 12); }
  for (const s of [-1, 1]) {
    [23.5, 38.5, 53.5].forEach((z, zi) => {
      b.box(H, 18, 3, 10, s * 31, 36, z); b.box(Y, 18.4, 0.5, 0.6, s * 31, 37.6, z);
      for (let cx = -1; cx <= 1; cx++) for (const cz of [-1, 1]) {
        if (cx === 0 && cz === s && zi === 1) { b.box(GR, 4, 0.2, 3, s * 31, 37.55, z + cz * 2.4); b.box(D, 4.6, 0.3, 3.6, s * 31, 39.3, z + cz * 3.4, 0, cz * 1.1, 0); } // 開いたままの発射筒
        else b.box(D, 4.6, 0.3, 3.6, s * 31 + cx * 5.6, 37.7, z + cz * 2.4);
      }
    });
    const P = at(b, V(s * 20, 41, -17), V(0, 0.34, -0.94), up); P.box(D, 22, 1.6, 13, 0, 0.8, 0); for (let j = -2; j <= 2; j++) P.box(GA, 20, 0.2, 0.3, 0, 1.75, j * 2.6); b.box(D, 3, 8, 3, s * 20, 38, -14);
    for (const z of [-20, 84]) F.push({ p: mast(at(b, V(s * 45, 34, z), up), m, 18), c: '#ff3a2a', s: 6, blink: 0.9, ph: z > 0 ? 0.5 : 0 });
    b.box(AR, 1, 40, 11, s * 50.6, 0, -18.5); hatch(at(b, V(s * 50.1, -8, 81), V(s, 0, 0), up), m, 4, GR);
    b.box(D, 3, 54, 9, s * 40, 0, 93); b.box(D, 80, 3, 9, 0, s * 27, 93);
    for (const [x, y, z] of [[s * 34, 49.2, -2], [s * 34, 49.2, 72]]) F.push({ p: V(x, y, z), c: '#ff3a2a', s: 4 });
  }
  b.box(D, 3, 10, 40, 0, -80, 30); F.push({ p: V(0, -87, 30), c: '#ff3a2a', s: 12, blink: 0.6, ph: 0.6 });
  // ── 艦橋塔: 張り出し・ひさし・射撃指揮装置・対空レーダー ──
  for (const s of [-1, 1]) { b.box(D, 10, 1, 8, s * 23, 78.4, 36); b.box(GA, 9.6, 0.25, 0.25, s * 23, 79.6, 32.1); F.push({ p: V(s * 28.5, 80, 36), c: s > 0 ? '#3f6' : '#f33', s: 6 }); b.cyl(H, 3, 3.4, 4, s * 15, 80.5, 28, 'y', 12); b.sph(H, 3, s * 15, 83, 28, 1, 0.8, 1, 12); b.cyl(D, 0.5, 0.5, 6, s * 15, 83, 23.6, 'z', 6); }
  b.box(D, 24, 0.8, 3, 0, 87.2, 29.6); b.box(m.GR, 12, 7, 0.4, 0, 129.5, 49);
  // ── 蓄電器: 碍子・母線・端の鏡板 ──
  for (const s of [-1, 1]) {
    for (const z of [3, 30, 57]) { const P = at(b, V(s * 66, 16.6, z), up); P.cyl(INS, 2, 2, 9, 0, 4.5, 0, 'y', 10); for (let j = 0; j < 4; j++) P.cyl(INS, 3.4, 3.4, 0.7, 0, 1.6 + j * 2, 0, 'y', 12); P.sph(CU, 2.3, 0, 10.6, 0, 1, 1, 1, 10); rod(b, CU, V(s * 66, 27.2, z), V(s * 47.5, 33, z), 0.9); }
    for (const z of [-20.5, 80.5]) b.sph(D, 17, s * 66, 0, z, 1, 1, 0.35, 16);
  }
  // ── ドッキングアーム: トラス・警戒帯・係留中の哨戒艇 ──
  truss(b, D, V(108, -10, 30), V(160, -10, 30), 16, { bays: 4, r: 0.6 });
  for (const s of [-1, 1]) { b.box(m.HZ, 0.5, 22.4, 3, 182.2, -10, 30 + s * 9.6); b.box(D, 3, 3, 16, 135 + s * 7, -10, 44); F.push({ p: V(172, 2.5, 30 + s * 10), c: '#ffe14d', s: 5 }); }
  patrol(at(b, V(135, -10, 56), up, V(0, 0, 1)), m);
  // ── 試射場: 弾速計測ゲート・射線のブイと距離標・古い標的の残骸・観測台 ──
  for (const [z, name] of [[-620, 'CHRONO-1　弾速計測'], [-980, 'CHRONO-2　弾速計測']]) {
    for (let k = 0; k < 4; k++) { const a0 = k * HP + 0.785, a1 = a0 + HP, p = V(Math.cos(a0) * 64, Math.sin(a0) * 64, z), q = V(Math.cos(a1) * 64, Math.sin(a1) * 64, z); truss(b, D, p, q, 5, { up: V(0, 0, 1) }); b.sph(H, 4.5, p.x, p.y, p.z, 1, 1, 1, 12); rod(b, RL, p, p.clone().multiplyScalar(0.62).setZ(z), 0.5); F.push({ p: p.clone().multiplyScalar(1.1).setZ(z), c: '#8fe8ff', s: 9, k: 2 }); }
    c.signs.push(sign(name, '#8fe8ff', 9, 0, 54, z, 0, 0));
  }
  for (let i = 0; i < 5; i++) {
    const z = -500 - i * 200;
    for (const sx of [-1, 1]) for (const sy of [-1, 1]) F.push({ p: buoy(b, m, V(sx * 100, sy * 100, z), 3), c: '#ff3a2a', s: 10, blink: 0.5, ph: 1 - i / 5, duty: 0.2 });
    c.signs.push(sign((-z + ZM) + ' m', '#ff5a3a', 11, 100, 118, z, 0, 0));
  }
  for (let i = 0; i < 6; i++) { const a = i * 1.05 + 0.3, len = 8 + (i % 3) * 3; b.add(glow('#ff5a1e', 2.2), new THREE.BoxGeometry(len, 0.8, 0.5), mx(Math.cos(a) * len * 0.6, 2 + Math.sin(a) * len * 0.6, TZ + 56.4, 0, 0, a), 0); }
  b.add(RK, rockGeo(34, 3, 17, 0.45), mx(400, -160, -1390, 0.3, 0.5, 0, 1, 0.8, 0.6)); b.add(RK, rockGeo(30, 3, 23, 0.45), mx(452, -148, -1362, 1.1, 2.2, 0.4, 0.8, 0.9, 0.7));
  for (let i = 0; i < 8; i++) b.add(RK, rockGeo(rr(r, 2, 7), 2, 60 + i, 0.4), mx(426 + rr(r, -60, 60), -154 + rr(r, -50, 50), -1376 + rr(r, -50, 50)));
  for (let i = 0; i < 4; i++) F.push({ p: V(424 + i * 4, -155 + i * 3, -1378 + i * 2), c: '#ff5a1e', s: 16 + i * 4, k: 0.9, ph: i * 0.4 });
  for (const s of [-1, 1]) { const P = at(b, V(s * 300, 140, -1380), up); P.box(H, 12, 6, 12, 0, 3, 0); P.box(m.S, 36, 0.4, 9, 0, 3, 0); dish(at(b, V(s * 300, 146, -1380), up), m, 6, { el: 2.0, az: s > 0 ? -1.95 : 1.95 }); F.push({ p: V(s * 300, 158, -1380), c: '#fff2d8', s: 9, blink: 0.7, ph: s * 0.25 + 0.25 }); }

  // ── 動くもの: 回転レーダー・放熱フィンの赤熱・蓄電器の放電・計測ゲートの閃光・砲口の衝撃環・着弾の火の粉・哨戒艇 ──
  return (o) => {
    const obj = o.obj; noShadow(obj); obj.add(lightField(F));
    const rb = new Builder(); rb.box(D, 16, 1.6, 3, 0, 3, 0); rb.box(m.GR, 15, 5, 0.4, 0, 6, 0.8); rb.cyl(D, 1.2, 1.6, 3, 0, 1.5, 0, 'y', 8); const radar = rb.build({ shadow: false }); radar.position.set(0, 90, 38); obj.add(radar);
    const hotM = new THREE.MeshBasicMaterial({ color: 0x000000, toneMapped: false }), hb = new Builder(); for (const s of [-1, 1]) for (let i = 0; i < 9; i++) hb.box(hotM, 0.6, 0.5, 80, s * 107.3, -20 + i * 5, 30); obj.add(hb.build({ shadow: false }));
    const arcs = []; for (const s of [-1, 1]) for (const z of [3, 30, 57]) { const sp = makeGlowSprite('#9fd0ff', 9, 3); sp.position.set(s * 66, 28.8, z); obj.add(sp); arcs.push(sp); }
    const gf = [-620, -980].map((z) => { const sp = makeGlowSprite('#8fe8ff', 40, 3); sp.position.set(0, 0, z); obj.add(sp); return { sp, f0: 0.32 * (z - ZM) / (TZ + 58 - ZM) }; });
    const shock = new THREE.Mesh(new THREE.TorusGeometry(1, 0.06, 6, 40), new THREE.MeshBasicMaterial({ color: new THREE.Color(2, 4.5, 6), ...ADD, toneMapped: false })); shock.position.set(0, 0, ZM - 14); shock.visible = false; obj.add(shock);
    const emb = Array.from({ length: 10 }, (_, i) => { const sp = makeGlowSprite(i % 2 ? '#ffb060' : '#ff5a1e', 6, 3); sp.visible = false; obj.add(sp); return { sp, d: V(Math.cos(i * 2.2) * 0.8, Math.sin(i * 2.2) * 0.8, 0.6 + (i % 3) * 0.3).normalize(), v: 30 + (i % 4) * 16 }; });
    const thr = [[-26, 14], [26, 14], [-26, -14], [26, -14]].map(([x, y]) => { const sp = makeGlowSprite('#ffb070', 30, 3); sp.position.set(x, y, 106); obj.add(sp); return sp; });
    const pat = traffic(obj, craftOf((B) => patrol(B, m)), 2, (i, t, P) => { const a = t * 0.05 + i * Math.PI; P.set(Math.cos(a) * 420, 140 + Math.sin(a * 2) * 20, 60 + Math.sin(a) * 520); return true; }, { glow: '#ff8a3a', gs: 16, tail: 19 });
    const drones = traffic(obj, craftOf((B) => pod(B, m, '#ff5a3a')), 3, (i, t, P) => { const a = t * 0.12 + i * TAU / 3; P.set(Math.cos(a) * 150, Math.sin(a) * 150, TZ + 110 + Math.sin(a * 2 + i) * 14); return true; }, { glow: '#ff5a3a', gs: 7, tail: 3.5, up: V(0, 0, 1) });
    o.anim.push((t) => {
      const k = t % PERIOD, ch = k > PERIOD - 4 ? (k - (PERIOD - 4)) / 4 : 0, f = k < 2.5 ? k : -1, h = Math.exp(-k / 5); // k = 直前の発射からの秒数
      radar.rotation.y = t * 1.1; hotM.color.setRGB(0.08 + 4.5 * h, 0.02 + 1.3 * h * h, 0.25 * h * h * h);
      arcs.forEach((sp, i) => { const on = ch > 0 && Math.sin(t * 47 + i * 9) > 0.55 - ch; sp.material.opacity = on ? 1 : 0; sp.scale.setScalar(on ? 6 + 10 * ch + Math.sin(t * 91 + i) * 3 : 1); });
      for (const g of gf) { const d = f >= 0 ? f - g.f0 : -1; g.sp.material.opacity = d >= 0 ? Math.exp(-d * 7) : 0; g.sp.scale.setScalar(d >= 0 ? 40 + 160 * Math.exp(-d * 9) : 1); }
      shock.visible = f >= 0 && f < 1.2; if (shock.visible) { shock.scale.setScalar(16 + f * 160); shock.material.opacity = Math.exp(-f * 3.5); }
      const im = f >= 0.32 ? f - 0.32 : -1; for (const e of emb) { e.sp.visible = im >= 0; if (im >= 0) { e.sp.position.set(e.d.x * e.v * im, 2 + e.d.y * e.v * im, TZ + 60 + e.d.z * e.v * im); e.sp.material.opacity = Math.exp(-im * 1.6); } }
      for (const sp of thr) { sp.material.opacity = f >= 0 ? Math.exp(-f * 2.2) : 0.12; sp.scale.setScalar(f >= 0 ? 30 + 90 * Math.exp(-f * 3) : 18); }
      pat(t); drones(t);
    });
  };
}
