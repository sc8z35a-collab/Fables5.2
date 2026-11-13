// 追加ステーション用の小道具 (5): 各拠点の「主役」になる大物
//   アトラス: 慰霊碑・操縦シミュレーター ／ ファイザー: 培養槽・遠心分離機・電子顕微鏡
//   メガトン: 太陽系儀・発車標 ／ ウェポン: 訓練標的・試射監視卓
import * as THREE from 'three';
import { Builder, mx } from '../gfx/builder.js';
import { mat, glow, screenMat, cv, ctex, JP } from '../gfx/textures.js';
import { makeGlowSprite } from '../gfx/fx.js';
import { G, rng } from '../core/util.js';
import { glassMat } from './interior.js';
import { MM, fab, flat, scr } from './props.js';
import { basic, toPlayer } from './props2.js';
import { rod } from './stationparts.js';

const HP = Math.PI / 2, TAU = Math.PI * 2;
const ADD = { transparent: true, blending: THREE.AdditiveBlending, depthWrite: false };
/** 描き直せる発光面。fn(ctx, w, h) で描く。solid = 黒地の表示器 (加算合成にしない) */
function litCanvas(w, h, fn, k = 2, solid = false) {
  const c = cv(w, h), x = c.getContext('2d'), t = ctex(c, true, false); fn(x, w, h);
  const m = new THREE.MeshBasicMaterial({ map: t, toneMapped: false, ...(solid ? {} : ADD) }); m.color.setScalar(k); m.userData.uvs = 0;
  return { mat: m, redraw: () => { if (!solid) x.clearRect(0, 0, w, h); fn(x, w, h); t.needsUpdate = true; } };
}
const V3 = (x, y, z) => new THREE.Vector3(x, y, z);

export const PROPS6 = {
  // ───────────────────────── アトラス ─────────────────────────
  /** 慰霊碑: 黒い石板に灯る隊員の名、花輪、消えない灯 */
  memorial(P, o, e) {
    const m = MM(), w = o.w || 2.8, h = o.h || 3.3, r = rng(4117), SY = ['カ', 'シ', 'タ', 'ナ', 'ミ', 'ラ', 'ユ', 'ハ', 'ル', 'オ', 'ト', 'セ', 'リ', 'エ', 'コ', 'マ', 'ア', 'ン', 'ジ', 'ノ', 'ヒ', 'ケ', 'サ', 'ヤ'];
    const syl = (n) => { let s = ''; for (let i = 0; i < n; i++) s += SY[Math.floor(r() * SY.length)]; return s; }, nm = () => syl(2 + Math.floor(r() * 2)) + '・' + syl(2 + Math.floor(r() * 3));
    const L = litCanvas(768, 896, (x, W, H) => {
      x.textAlign = 'center'; x.textBaseline = 'middle'; x.fillStyle = '#ffe2b0'; x.font = `700 46px ${JP}`; x.fillText('星海に殉じた救難隊員', W / 2, 60); x.fillRect(W * 0.2, 100, W * 0.6, 3);
      x.font = `500 25px ${JP}`; x.fillStyle = '#e8c88a'; for (let i = 0; i < 3; i++) for (let j = 0; j < 18; j++) x.fillText(nm(), W * (0.2 + i * 0.3), 150 + j * 37);
      x.font = `500 24px ${JP}`; x.fillStyle = '#9fe8c8'; x.fillText('─ 彼らが運んだ命は、いまも灯りつづけている ─', W / 2, H - 46);
    }, 1.8);
    P.box(flat(0x15171b, 0.22, 0.4), w, h, 0.4, 0, h / 2 + 0.34, 0); P.box(flat(0x2a2d32, 0.45, 0.3), w + 0.9, 0.34, 1.3, 0, 0.17, 0); P.box(m.gd, w + 0.1, 0.05, 0.46, 0, h + 0.365, 0); for (const s of [-1, 1]) P.box(m.gd, 0.05, h, 0.42, s * (w / 2 + 0.025), h / 2 + 0.34, 0);
    P.add(L.mat, new THREE.PlaneGeometry(w - 0.3, (w - 0.3) * 896 / 768), mx(0, h / 2 + 0.36, 0.206), 0);
    P.add(m.lf, new THREE.TorusGeometry(0.3, 0.075, 8, 20), mx(-0.9, 0.7, 0.44, -0.3, 0, 0), 0); for (let i = 0; i < 7; i++) { const a = i * TAU / 7; P.sph(i % 2 ? m.wh : flat(0xff8a4a, 0.6, 0), 0.05, -0.9 + Math.cos(a) * 0.3, 0.7 + Math.sin(a) * 0.28, 0.5 - Math.sin(a) * 0.09, 1, 1, 1, 8); }
    P.cyl(m.gd, 0.16, 0.2, 0.12, 0, 0.4, 0.42, 'y', 14); P.cyl(m.dk, 0.13, 0.13, 0.02, 0, 0.465, 0.42, 'y', 14);
    const fl = e.dyn(makeGlowSprite('#ffd9a0', 0.55, 3), 0, 0.64, 0.42), fl2 = e.dyn(makeGlowSprite('#fff6e0', 0.2, 4), 0, 0.56, 0.42);
    e.anim((dt, t) => { const k = 0.85 + 0.15 * Math.sin(t * 9.1) * Math.sin(t * 5.3); fl.scale.set(0.4 * k, 0.62 * k, 1); fl2.scale.setScalar(0.2 * k); });
    e.light('#ffd9a0', 9, 1.4, 7); e.rect(w + 0.9, 1.3); if (o.use !== false) e.use(o.label || '碑文を読む', o.use || 'talk:memorial', 3);
  },
  /** ミケーネの操縦シミュレーター: 6 本の脚で揺れる訓練用キャビン */
  simpod(P, o, e) {
    const m = MM(), A = flat(0xff5412, 0.5, 0.2), WD = mat('flat', { color: 0xf2f3ef, rough: 0.4, metal: 0.2, side: THREE.DoubleSide }), g = new THREE.Group(), cab = new THREE.Group(), b = new Builder();
    P.cyl(m.dk, 1.55, 1.75, 0.16, 0, 0.08, 0, 'y', 24); P.tor(glow('#35ff8a', 2), 1.6, 0.02, 0, 0.17, 0, HP, 0, 0, 40, 5);
    for (let i = 0; i < 6; i++) { const a = i * TAU / 6 + 0.26; P.add(m.ch, new THREE.CylinderGeometry(0.035, 0.045, 0.82, 8), mx(Math.cos(a) * 1.0, 0.52, Math.sin(a) * 1.0, -Math.sin(a) * 0.45, 0, Math.cos(a) * 0.45)); P.sph(m.dk, 0.07, Math.cos(a) * 1.2, 0.2, Math.sin(a) * 1.2, 1, 1, 1, 8); }
    b.box(m.dk, 1.7, 0.12, 2.4, 0, 0.06, 0); b.add(WD, new THREE.SphereGeometry(1.2, 22, 14, 0, Math.PI), mx(0, 0.95, 0.1, 0, Math.PI, 0, 0.74, 0.9, 1.05), 0);
    b.box(fab(0x2a4a3a), 0.5, 0.1, 0.5, 0, 0.5, 0.35); b.box(fab(0x2a4a3a), 0.5, 0.75, 0.1, 0, 0.9, 0.62, 0, -0.12, 0); b.box(m.dk, 0.4, 0.4, 0.4, 0, 0.26, 0.4);
    b.box(m.bk, 1.25, 0.72, 0.05, 0, 1.22, -0.815); b.add(screenMat('radar', '#35ff8a', 'MYCENAE SIM', 1.7), new THREE.PlaneGeometry(1.15, 0.62), mx(0, 1.22, -0.78), 0);
    for (const s of [-1, 1]) { b.add(screenMat(s > 0 ? 'bars' : 'graph', '#ffb060', '', 1.5), new THREE.PlaneGeometry(0.5, 0.42), mx(s * 0.6, 1.1, -0.5, 0, -s * 0.9, 0), 0); b.box(A, 0.04, 0.5, 1.6, s * 0.86, 0.5, -0.1); b.box(glow('#35ff8a', 2), 0.03, 0.05, 0.8, s * 0.885, 0.9, 0.1); }
    b.box(m.dk, 1.2, 0.08, 0.36, 0, 0.82, -0.52, 0, 0.25, 0); b.cyl(m.bk, 0.02, 0.02, 0.26, 0, 0.92, -0.3, 'y', 6); b.box(m.bk, 0.26, 0.04, 0.04, 0, 1.05, -0.3);
    cab.add(b.build({ shadow: false })); cab.position.y = 0.95; g.add(cab); e.dyn(g, 0, 0, 0);
    e.anim((dt, t) => { cab.rotation.x = Math.sin(t * 0.9) * 0.06 + Math.sin(t * 2.3) * 0.015; cab.rotation.z = Math.sin(t * 0.7 + 1) * 0.07; cab.position.y = 0.95 + Math.sin(t * 1.3) * 0.035; });
    e.rect(3.2, 3.2); e.light('#35ff8a', 5, 1.8, 6); e.use(o.label || '操縦シミュレーター', o.use || 'talk:simpod', 2.9);
  },

  // ───────────────────────── ファイザー ─────────────────────────
  /** 培養槽: ガラスの大槽に光る培養液。撹拌翼が回り、気泡が昇る */
  bioreactor(P, o, e) {
    const m = MM(), h = o.h || 4.2, r = o.r || 1.1, c = o.c || '#5dff8a', st = m.ch, gh = h - 0.9;
    P.cyl(m.dk, r + 0.25, r + 0.35, 0.3, 0, 0.15, 0, 'y', 24); P.cyl(st, r + 0.06, r + 0.06, 0.16, 0, 0.38, 0, 'y', 24); P.cyl(st, r + 0.06, r + 0.06, 0.16, 0, h - 0.5, 0, 'y', 24);
    P.add(glassMat(), new THREE.CylinderGeometry(r, r, gh, 28, 1, true), mx(0, h / 2 - 0.06, 0), 0);
    P.add(basic(c, 0.55, { transparent: true, opacity: 0.5, depthWrite: false }), new THREE.CylinderGeometry(r - 0.04, r - 0.04, gh * 0.82, 24), mx(0, 0.46 + gh * 0.41, 0), 0);
    P.sph(st, r + 0.06, 0, h - 0.42, 0, 1, 0.42, 1, 24); P.cyl(m.dk, 0.22, 0.26, 0.5, 0, h + 0.2, 0, 'y', 12); P.cyl(st, 0.03, 0.03, h - 1.3, 0, h / 2, 0, 'y', 6);
    for (let k = 0; k < 4; k++) { const a = k * HP + 0.4; P.cyl(st, 0.045, 0.045, h - 0.5, Math.cos(a) * (r + 0.16), h / 2 - 0.05, Math.sin(a) * (r + 0.16), 'y', 8); }
    for (const [y, cc] of [[1.2, '#ffb060'], [2.0, '#6fe8ff'], [2.8, c]]) { P.cyl(st, 0.05, 0.05, 0.7, r + 0.4, y, 0, 'x', 8); P.box(m.dk, 0.16, 0.2, 0.16, r + 0.78, y, 0); P.box(glow(cc, 2.4), 0.03, 0.05, 0.05, r + 0.865, y + 0.05, 0); }
    P.box(m.dk, 0.7, 1.2, 0.4, -r - 0.75, 0.6, 0.5); scr(P, 'graph', c, '培養槽', 0.56, 0.36, -r - 0.75, 0.98, 0.705, 0);
    const imp = new THREE.Group(), ib = new Builder(); for (let k = 0; k < 3; k++) ib.box(st, 0.7, 0.02, 0.16, Math.cos(k * TAU / 3) * 0.35, 0, Math.sin(k * TAU / 3) * 0.35, -k * TAU / 3, 0.5, 0);
    imp.add(ib.build({ shadow: false })); const imp2 = imp.clone(); e.dyn(imp, 0, 0.9, 0); e.dyn(imp2, 0, 2.0, 0);
    const NB = 16, bub = new THREE.InstancedMesh(new THREE.SphereGeometry(0.045, 8, 6), basic('#eafff2', 1.6, { transparent: true, opacity: 0.7 }), NB), o3 = new THREE.Object3D(); bub.frustumCulled = false; e.dyn(bub, 0, 0, 0);
    e.anim((dt, t) => {
      imp.rotation.y = t * 2.2; imp2.rotation.y = -t * 1.7;
      for (let i = 0; i < NB; i++) { const k = (t * (0.22 + (i % 5) * 0.05) + i * 0.37) % 1, a = i * 2.4 + k * 3, rr1 = (r - 0.25) * (0.3 + (i % 4) * 0.2); o3.position.set(Math.cos(a) * rr1, 0.5 + k * gh * 0.8, Math.sin(a) * rr1); o3.scale.setScalar(0.6 + k * 0.9); o3.updateMatrix(); bub.setMatrixAt(i, o3.matrix); }
      bub.instanceMatrix.needsUpdate = true;
    });
    e.col(r + 0.4); e.rect(0.8, 0.5, -r - 0.75, 0.5); e.light(c, 10, 2.2, 8); if (o.use) e.use(o.label || '培養槽', o.use, r + 2.2);
  },
  /** 遠心分離機: 透明な蓋の下でローターが回っては止まる */
  centrifuge(P, o, e) {
    const m = MM(), c = o.c || '#6fe8ff', WD = mat('flat', { color: 0xe6eaef, rough: 0.3, metal: 0.1, side: THREE.DoubleSide });
    P.box(m.wh, 1.0, 0.9, 0.9, 0, 0.45, 0); P.box(m.dk, 1.02, 0.06, 0.92, 0, 0.03, 0); P.add(WD, new THREE.CylinderGeometry(0.46, 0.5, 0.42, 24, 1, true), mx(0, 1.11, 0)); P.cyl(m.dk, 0.45, 0.45, 0.02, 0, 0.99, 0, 'y', 24);
    P.add(glassMat(), new THREE.SphereGeometry(0.44, 20, 8, 0, TAU, 0, 1.1), mx(0, 1.14, 0, 0, 0, 0, 1, 0.6, 1), 0);
    P.tor(glow(c, 2.4), 0.47, 0.012, 0, 1.32, 0, HP, 0, 0, 32, 5); scr(P, 'bars', c, '', 0.34, 0.16, 0.2, 0.7, 0.455, 0, 1.4); P.box(glow('#35ff8a', 2.6), 0.04, 0.04, 0.01, -0.3, 0.74, 0.455);
    const rot = new THREE.Group(), rb = new Builder(); rb.cyl(m.ch, 0.3, 0.34, 0.1, 0, 0, 0, 'y', 16); rb.cyl(m.dk, 0.06, 0.06, 0.16, 0, 0.06, 0, 'y', 10);
    for (let k = 0; k < 8; k++) { const a = k * TAU / 8; rb.add(glow(k % 2 ? '#ff5a6a' : c, 1.6), new THREE.CylinderGeometry(0.03, 0.03, 0.09, 8), mx(Math.cos(a) * 0.22, 0.05, Math.sin(a) * 0.22, 0, -a, 0.6), 0); }
    rot.add(rb.build({ shadow: false })); e.dyn(rot, 0, 1.2, 0);
    let sp = 0; e.anim((dt, t) => { const want = (t * 0.05) % 1 < 0.7 ? 26 : 0; sp += (want - sp) * Math.min(1, dt * 0.6); rot.rotation.y += sp * dt; });
    e.rect(1.0, 0.9); if (o.use) e.use(o.label || '遠心分離機', o.use, 2.2);
  },
  /** 電子顕微鏡: 鏡筒と操作机。画面に細胞の像 */
  microscope(P, o, e) {
    const m = MM(), c = o.c || '#b48cff';
    P.box(m.wh, 1.1, 0.85, 1.0, -0.9, 0.425, 0); P.box(m.dk, 1.14, 0.05, 1.04, -0.9, 0.875, 0);
    P.cyl(m.wh, 0.2, 0.26, 0.5, -0.9, 1.15, 0, 'y', 20); P.cyl(m.ch, 0.15, 0.15, 0.9, -0.9, 1.85, 0, 'y', 20); P.cyl(m.wh, 0.2, 0.17, 0.3, -0.9, 2.45, 0, 'y', 20); P.cyl(m.dk, 0.09, 0.12, 0.3, -0.9, 2.75, 0, 'y', 14);
    for (const y of [1.5, 1.9, 2.25]) P.tor(m.dk, 0.16, 0.025, -0.9, y, 0, HP, 0, 0, 20, 6); P.tor(glow(c, 2.4), 0.21, 0.012, -0.9, 1.41, 0, HP, 0, 0, 24, 5);
    P.cyl(m.ch, 0.05, 0.05, 0.5, -0.55, 1.7, 0, 'x', 8); P.box(m.dk, 0.2, 0.22, 0.22, -0.3, 1.7, 0); P.cyl(m.ch, 0.04, 0.04, 0.9, -1.2, 1.6, -0.25, 'y', 8); P.cyl(m.wh, 0.16, 0.16, 0.5, -1.2, 2.3, -0.25, 'y', 14);
    P.box(m.wh, 1.5, 0.05, 0.8, 0.75, 0.76, 0); for (const [x, z] of [[0.1, -0.33], [1.4, -0.33], [0.1, 0.33], [1.4, 0.33]]) P.box(m.ch, 0.05, 0.74, 0.05, x, 0.37, z);
    P.box(m.bk, 0.86, 0.52, 0.04, 0.75, 1.2, -0.28); scr(P, 'data', c, '電子顕微鏡 ×80,000', 0.8, 0.46, 0.75, 1.2, -0.258, 0, 1.6); P.box(m.dk, 0.2, 0.3, 0.16, 0.75, 0.93, -0.28);
    P.box(m.bk, 0.5, 0.02, 0.18, 0.75, 0.795, 0.12); P.box(m.dk, 0.16, 0.05, 0.2, 1.2, 0.81, 0.1); P.cyl(m.bk, 0.035, 0.035, 0.06, 1.2, 0.86, 0.1, 'y', 10);
    e.rect(1.2, 1.1, -0.9, 0); e.rect(1.5, 0.8, 0.75, 0); e.light(c, 5, 1.6, 5); if (o.use) e.use(o.label || '電子顕微鏡', o.use, 2.4);
  },

  // ───────────────────────── メガトン ─────────────────────────
  /** 真鍮の太陽系儀: 惑星が腕に載って、それぞれの速さで巡る */
  orrery(P, o, e) {
    const br = flat(0xc8a04a, 0.28, 1), s = o.s || 1, R = 1.5 * s, PL = [[0.34, 0.05, 0xc8b48a, 4.2], [0.55, 0.075, 0x4a8fd8, 2.6], [0.78, 0.06, 0xd8a04a, 1.9], [1.02, 0.11, 0xe8d8a8, 1.2], [1.26, 0.07, 0x8fd0ff, 0.75], [1.44, 0.055, 0xff7a3a, 0.5]];
    P.cyl(mat('marble', { color: 0x2c5a4e, rough: 0.2, metal: 0.05 }), R * 0.62, R * 0.7, 0.5 * s, 0, 0.25 * s, 0, 'y', 8); P.cyl(br, R * 0.66, R * 0.66, 0.05, 0, 0.52 * s, 0, 'y', 8); P.cyl(br, 0.05 * s, 0.07 * s, 0.9 * s, 0, 0.98 * s, 0, 'y', 10);
    P.tor(br, R, 0.03 * s, 0, 1.2 * s, 0, HP, 0, 0, 64, 6);
    for (let i = 0; i < 4; i++) { const a = i * HP + 0.785, cs = Math.cos(a), sn = Math.sin(a); rod(P, br, V3(cs * R * 0.6, 0.54 * s, sn * R * 0.6), V3(cs * R, 1.2 * s, sn * R), 0.02 * s, 0.02 * s, 6, false); }
    for (let i = 0; i < 24; i++) { const a = i * TAU / 24; P.box(br, 0.012 * s, (i % 6 ? 0.04 : 0.08) * s, 0.012 * s, Math.cos(a) * R, 1.25 * s, Math.sin(a) * R); }
    const sun = e.dyn(new THREE.Mesh(new THREE.SphereGeometry(0.16 * s, 20, 14), basic('#ffd27a', 3)), 0, 1.5 * s, 0); sun.add(makeGlowSprite('#ffcf80', 1.3 * s, 1.4));
    const arms = PL.map(([d, pr, col, w], i) => {
      const g = new THREE.Group(), b = new Builder(), hy = (0.12 + i * 0.03) * s;
      b.box(br, d * s, 0.014 * s, 0.014 * s, d * s / 2, 0, 0); b.cyl(br, 0.008 * s, 0.008 * s, hy, d * s, hy / 2, 0, 'y', 5); b.sph(flat(col, 0.5, 0.1), pr * s, d * s, hy + pr * s, 0, 1, 1, 1, 14);
      if (i === 3) b.tor(br, pr * s * 1.7, 0.006 * s, d * s, hy + pr * s, 0, HP * 0.8, 0, 0, 24, 4);
      g.add(b.build({ shadow: false })); e.dyn(g, 0, (1.02 + i * 0.045) * s, 0); return { g, w, ph: i * 1.7 };
    });
    e.anim((dt, t) => { for (const q of arms) q.g.rotation.y = t * q.w * 0.12 + q.ph; });
    e.light('#ffd27a', 10, 1.6 * s, 6); e.col(R + 0.2); if (o.use) e.use(o.label || '太陽系儀', o.use, R + 1.6);
  },
  /** 発車標 (壁掛け): 行き先と発車までの時間が数秒ごとに繰り上がる */
  departures(P, o, e) {
    const m = MM(), br = flat(0xc8a04a, 0.28, 1), w = o.w || 5.2, h = w * 0.5, y = o.y || 3.4;
    const ROWS = o.rows || [['リング線', '前部リング', '2'], ['リング線', '後部リング', '1'], ['炉心線', '運休 ─ 点検中', '─'], ['ドック線', '第 7 ドック', '3'], ['庭園線', '空中庭園', '4'], ['連絡船', 'ヘイヴン・リング', 'A'], ['連絡船', 'ネオン・ベイ (地球)', 'B'], ['貨物便', 'ヴァルカン造船廠', 'C']];
    let tick = 0;
    const L = litCanvas(1024, 512, (x, W) => {
      x.fillStyle = '#0b0c0e'; x.fillRect(0, 0, W, 512); x.textBaseline = 'middle'; x.font = `800 40px ${JP}`; x.fillStyle = '#ffd27a'; x.textAlign = 'left'; x.fillText('発車案内 DEPARTURES', 28, 40);
      const d = new Date(); x.textAlign = 'right'; x.fillText(String(d.getHours()).padStart(2, '0') + ':' + String(d.getMinutes()).padStart(2, '0'), W - 28, 40); x.fillStyle = '#6a5226'; x.fillRect(20, 72, W - 40, 3); x.font = `700 34px ${JP}`;
      for (let i = 0; i < 6; i++) {
        const r0 = ROWS[(i + tick) % ROWS.length], yy = 112 + i * 64, stop = r0[1].startsWith('運休'), mins = 2 + ((i * 7 + tick * 3) % 5) + i * 6;
        x.fillStyle = '#16181c'; x.fillRect(20, yy - 26, W - 40, 52); x.fillStyle = stop ? '#ff5a3a' : '#ffe8c0'; x.textAlign = 'left'; x.fillText(r0[0], 36, yy); x.fillText(r0[1], 250, yy);
        x.textAlign = 'center'; x.fillStyle = '#8fe8ff'; x.fillText(r0[2] + ' 番線', W - 250, yy); x.textAlign = 'right'; x.fillStyle = i === 0 ? '#5dff8a' : '#ffd27a'; x.fillText(stop ? '──' : i === 0 ? 'まもなく' : mins + ' 分', W - 36, yy);
      }
    }, 1.6, true);
    P.box(m.bk, w + 0.16, h + 0.16, 0.12, 0, y, 0.06); P.box(br, w + 0.3, 0.07, 0.16, 0, y + h / 2 + 0.11, 0.08); P.box(br, w + 0.3, 0.07, 0.16, 0, y - h / 2 - 0.11, 0.08); for (const s of [-1, 1]) P.box(br, 0.07, h + 0.3, 0.16, s * (w / 2 + 0.115), y, 0.08);
    P.add(L.mat, new THREE.PlaneGeometry(w, h), mx(0, y, 0.125), 0);
    let acc = 0; e.anim((dt) => { acc += dt; if (acc > 5) { acc = 0; tick++; L.redraw(); } });
  },

  // ───────────────────────── ウェポン ─────────────────────────
  /** 訓練標的: ばね脚の人型。ときどき撃たれたように揺れる */
  dummy(P, o, e) {
    const m = MM(), yl = flat(0xf2b90a, 0.55, 0.3), body = flat(0x3a3f47, 0.7, 0.4), red = basic('#ff3a2a', 2.2), g = new THREE.Group(), tilt = new THREE.Group(), b = new Builder();
    P.cyl(m.dk, 0.34, 0.4, 0.1, 0, 0.05, 0, 'y', 16); P.tor(yl, 0.37, 0.02, 0, 0.1, 0, HP, 0, 0, 24, 5);
    for (let k = 0; k < 6; k++) b.tor(m.ch, 0.07, 0.014, 0, 0.14 + k * 0.05, 0, HP, 0, 0, 14, 5);
    b.cyl(m.dk, 0.04, 0.04, 0.5, 0, 0.66, 0, 'y', 8); b.add(body, new THREE.CapsuleGeometry(0.2, 0.42, 5, 14), mx(0, 1.24, 0, 0, 0, 0, 1.15, 1, 0.72), 0); b.sph(body, 0.15, 0, 1.78, 0, 1, 1.1, 0.95, 14);
    b.add(red, new THREE.RingGeometry(0.07, 0.1, 20), mx(0, 1.3, 0.152), 0); b.add(red, new THREE.CircleGeometry(0.03, 12), mx(0, 1.3, 0.153), 0); b.add(red, new THREE.RingGeometry(0.04, 0.055, 16), mx(0, 1.79, 0.146), 0);
    for (const [x, y, s] of [[0.09, 1.42, 0.035], [-0.11, 1.18, 0.05], [0.03, 1.08, 0.03]]) b.add(flat(0x0a0a0a, 1, 0), new THREE.CircleGeometry(s, 10), mx(x, y, 0.151), 0);
    b.box(yl, 0.34, 0.05, 0.02, 0, 0.98, 0.14);
    tilt.add(b.build({ shadow: false })); g.add(tilt); e.dyn(g, 0, 0, 0);
    const ph = e.rnd() * 10; e.anim((dt, t) => { const k = (t * 0.23 + ph) % 1, a = k < 0.35 ? Math.exp(-k * 9) * Math.sin(k * 60) * 0.3 : 0; tilt.rotation.x = -a; tilt.rotation.z = a * 0.4; });
    e.col(0.34); if (o.use) e.use(o.label || '訓練標的', o.use, 2);
  },
  /** 試射監視卓: 主砲の次の試射までの秒読みと状態を映す */
  firewatch(P, o, e) {
    const m = MM(), yl = flat(0xf2b90a, 0.55, 0.3), PERIOD = 22, state = () => { const k = (G.time || 0) % PERIOD; return { k, left: PERIOD - k, ch: k > PERIOD - 4 }; };
    const L = litCanvas(512, 272, (x, W) => {
      const s = state(), col = s.ch ? '#ff3a2a' : '#ffe14d'; x.fillStyle = '#0a0c0e'; x.fillRect(0, 0, W, 272); x.textAlign = 'center'; x.textBaseline = 'middle'; x.font = `800 30px ${JP}`; x.fillStyle = '#ffb060'; x.fillText('主砲 試射シーケンス', W / 2, 34);
      x.font = `900 120px ${JP}`; x.fillStyle = col; x.fillText(String(Math.ceil(s.left)).padStart(2, '0'), W / 2, 130); x.font = `700 26px ${JP}`; x.fillStyle = s.ch ? '#ff3a2a' : '#8fe8ff'; x.fillText(s.ch ? '充電中 ─ 射線から退避' : s.k < 2.5 ? '発射 ─ 着弾確認' : '冷却・再装填', W / 2, 214);
      x.fillStyle = '#20242a'; x.fillRect(40, 240, W - 80, 14); x.fillStyle = col; x.fillRect(40, 240, (W - 80) * (s.k / PERIOD), 14);
    }, 1.7, true);
    P.box(m.dk, 1.5, 0.95, 0.7, 0, 0.475, 0); P.box(yl, 1.52, 0.05, 0.72, 0, 0.975, 0); P.box(m.dk, 1.5, 0.9, 0.12, 0, 1.5, -0.26, 0, -0.18, 0);
    P.add(L.mat, new THREE.PlaneGeometry(1.3, 0.69), mx(0, 1.52, -0.19, -0.18, 0, 0), 0);
    for (let i = 0; i < 5; i++) P.box(glow(i === 2 ? '#ff3a2a' : '#ffb060', 2.2), 0.08, 0.03, 0.08, -0.5 + i * 0.25, 1.02, 0.18); P.cyl(flat(0xc8201e, 0.4, 0.3), 0.07, 0.07, 0.05, 0.55, 1.03, -0.02, 'y', 14);
    let acc = 0; e.anim((dt) => { acc += dt; if (acc > 0.5) { acc = 0; if (toPlayer(e.x, e.z, e.ang)[1] < 16) L.redraw(); } });
    e.rect(1.5, 0.7); e.light('#ffb060', 4, 1.6, 5); e.use(o.label || '試射監視卓', o.use || 'talk:firewatch', 2.4);
  },
};
