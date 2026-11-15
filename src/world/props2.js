// 追加ステーション用の大道具 (1): アトラス救難基地・救助船ミケーネ・医療 / 創薬 (ファイザー)
import * as THREE from 'three';
import { Builder, mx } from '../gfx/builder.js';
import { mat, glow, aoMat, cv, ctex, JP } from '../gfx/textures.js';
import { makeGlowSprite } from '../gfx/fx.js';
import { G } from '../core/util.js';
import { holoMat, glassMat } from './interior.js';
import { MM, fab, crateM, flat, scr, blob, bush } from './props.js';
import { buildMycenae, instanced, makeBot, makeMedBot, makeLoaderBot, rescueN } from './rescue.js';
import { globeMat } from './stations2.js';
import { RESCUE } from './defs.js';

const HP = Math.PI / 2, TAU = Math.PI * 2;
export const basic = (c, k = 1, o = {}) => new THREE.MeshBasicMaterial({ color: new THREE.Color(c).multiplyScalar(k), toneMapped: false, ...o });
const ADD = { transparent: true, blending: THREE.AdditiveBlending, depthWrite: false };
/** プレイヤーへの向き (相手の正面基準の角度) と距離 */
export const toPlayer = (x, z, yaw) => { const p = G.modes?.interior?.pos; if (!p) return [null, 99]; const dx = p.x - x, dz = p.z - z; let a = Math.atan2(dx, dz) - yaw; a = Math.atan2(Math.sin(a), Math.cos(a)); return [a, Math.hypot(dx, dz)]; };
/** 小道具のローカル座標 → ワールド座標 */
export const W2 = (e, ox, oz) => [e.x + ox * Math.cos(e.ang) + oz * Math.sin(e.ang), e.z - ox * Math.sin(e.ang) + oz * Math.cos(e.ang)];
export const item = (e, ox, oz, r, label, act, extra = {}) => { const [x, z] = W2(e, ox, oz), it = { x, z, y: 1.2 + e.y0, r, label, act, room: e.room.id, ...extra }; e.out.items.push(it); return it; };
/** 液体の入ったガラス器具 */
const flask = (P, x, y, z, s, c) => { const g = glassMat(), l = glow(c, 1.6); P.add(g, new THREE.CylinderGeometry(0.03 * s, 0.11 * s, 0.2 * s, 12, 1, true), mx(x, y + 0.1 * s, z), 0); P.add(g, new THREE.CylinderGeometry(0.03 * s, 0.03 * s, 0.1 * s, 10, 1, true), mx(x, y + 0.25 * s, z), 0); P.add(l, new THREE.CylinderGeometry(0.062 * s, 0.1 * s, 0.1 * s, 12), mx(x, y + 0.055 * s, z), 0); };
const beaker = (P, x, y, z, s, c) => { P.add(glassMat(), new THREE.CylinderGeometry(0.07 * s, 0.07 * s, 0.18 * s, 12, 1, true), mx(x, y + 0.09 * s, z), 0); P.add(glow(c, 1.5), new THREE.CylinderGeometry(0.062 * s, 0.062 * s, 0.1 * s, 12), mx(x, y + 0.052 * s, z), 0); };
const LIQ = ['#4dffd8', '#b48cff', '#ff7ab8', '#ffd23a', '#6fe8ff', '#8aff6a'];

export const PROPS2 = {
  // ───────────────────────── 救難ボット ─────────────────────────
  /** 操縦席に座って機体を操縦するボット (座席・操縦桿・推力レバーつき) */
  pilotbot(P, o, e) {
    const m = MM(), f = fab(0x2a2e36), A = flat(0xff5412, 0.55, 0.15);
    P.cyl(m.ch, 0.14, 0.34, 0.36, 0, 0.18, 0, 'y', 14); P.box(m.dk, 0.72, 0.1, 0.7, 0, 0.4, 0.02); P.box(f, 0.66, 0.12, 0.64, 0, 0.5, 0.02); P.box(f, 0.64, 1.02, 0.14, 0, 1.03, -0.32); P.box(fab(0x3a3f48), 0.4, 0.26, 0.17, 0, 1.64, -0.32); P.box(m.dk, 0.7, 1.1, 0.05, 0, 1.0, -0.41);
    for (const s of [-1, 1]) { P.box(m.dk, 0.1, 0.07, 0.6, s * 0.4, 0.74, 0.06); P.box(m.dk, 0.08, 0.3, 0.08, s * 0.4, 0.58, -0.18); P.add(A, new THREE.BoxGeometry(0.05, 0.62, 0.02), mx(s * 0.15, 1.2, -0.235, 0, 0, s * 0.1)); P.box(glow('#35ff8a', 2), 0.02, 0.6, 0.02, s * 0.33, 1.05, -0.245); }
    // 操縦桿 (中央)・サイドスティック・推力レバー・ペダル
    P.add(m.dk, new THREE.CylinderGeometry(0.03, 0.045, 0.66, 8), mx(0, 0.5, 0.74, -0.4, 0, 0)); P.add(m.bk, new THREE.TorusGeometry(0.15, 0.022, 6, 16, Math.PI * 1.25), mx(0, 0.86, 0.6, -0.4, 0, Math.PI * 0.375 + HP * 3)); P.box(m.dk, 0.12, 0.06, 0.06, 0, 0.8, 0.615);
    P.box(m.dk, 0.16, 0.5, 0.5, -0.56, 0.5, 0.3); for (const dx of [-0.04, 0.04]) { P.add(m.ch, new THREE.CylinderGeometry(0.012, 0.012, 0.3, 6), mx(-0.56 + dx, 0.86, 0.3, -0.4, 0, 0)); P.sph(glow(dx < 0 ? '#ff7a2a' : '#6fe8ff', 2.4), 0.03, -0.56 + dx, 0.99, 0.24, 1, 1, 1, 8); }
    P.add(m.bk, new THREE.CylinderGeometry(0.02, 0.026, 0.2, 8), mx(0.4, 0.86, 0.3, -0.2, 0, 0)); P.sph(m.bk, 0.035, 0.4, 0.96, 0.28, 1, 1.3, 1, 8);
    for (const s of [-1, 1]) P.add(m.ch, new THREE.BoxGeometry(0.14, 0.03, 0.22), mx(s * 0.13, 0.14, 0.66, -0.5, 0, 0));
    const bot = e.dyn(makeBot({ pose: 'sit', accent: o.accent, eye: o.eye, body: o.body, ph: e.x * 0.37 + e.z }), 0, 0.02, 0), yaw = bot.rotation.y;
    e.anim((dt, t) => { const [a, d] = toPlayer(e.x, e.z, yaw); bot.userData.tick(dt, t, a, d); });
    e.col(0.5); e.use(o.label || 'ボットに話しかける', o.use || 'talk:pilotbot', 2.3);
  },
  /** 立っている救難ボット。近づくと手を振る */
  bot(P, o, e) {
    const bot = e.dyn(makeBot({ pose: 'stand', accent: o.accent, eye: o.eye, body: o.body, ph: e.x * 0.53 + e.z }), 0, 0, 0), yaw = bot.rotation.y;
    e.anim((dt, t) => { const [a, d] = toPlayer(e.x, e.z, yaw); bot.userData.tick(dt, t, a, d); bot.position.y = e.y0 + Math.sin(t * 1.3 + e.x) * 0.006; });
    e.col(0.36); if (o.use !== false) e.use(o.label || '救難ボット', o.use || 'talk:bot', 2.4);
  },
  /** 浮遊する医療ボット (ゆっくり巡回する) */
  medbot(P, o, e) {
    const g = e.dyn(makeMedBot(), 0, o.y || 1.45, 0), p0 = g.position.clone(), R = o.r ?? 1.2, y0 = g.rotation.y, s = makeGlowSprite('#35ff8a', 0.9, 0.5); g.add(s); s.position.y = -0.5;
    e.anim((dt, t) => { const a = t * 0.35 + e.x; g.position.set(p0.x + Math.cos(a) * R, p0.y + Math.sin(t * 1.7 + e.z) * 0.07, p0.z + Math.sin(a) * R * 0.6); const [pa, d] = toPlayer(g.position.x, g.position.z, 0); g.rotation.y = d < 4 ? pa : y0 + Math.sin(t * 0.5) * 0.8; g.userData.tick(dt, t); });
    e.light('#35ff8a', 5, 1.2, 5); if (o.use !== false) e.use(o.label || '医療ボット', o.use || 'talk:medbot', 2.6);
  },
  /** 荷役ボット (直線を往復する) */
  loaderbot(P, o, e) {
    const g = e.dyn(makeLoaderBot(), 0, 0, 0), p0 = g.position.clone(), L = o.l ?? 6, dx = Math.sin(e.ang), dz = Math.cos(e.ang), yaw = g.rotation.y;
    e.anim((dt, t) => { const k = Math.sin(t * 0.22 + e.x), v = Math.cos(t * 0.22 + e.x); g.position.set(p0.x + dx * k * L / 2, 0, p0.z + dz * k * L / 2); g.rotation.y = yaw + (v < 0 ? Math.PI : 0); g.userData.tick(dt, t); });
    if (o.use !== false) e.use(o.label || '荷役ボット', o.use || 'talk:loader', L / 2 + 2.4);
  },

  // ───────────────────────── アトラス ─────────────────────────
  /** 救助船ミケーネ 15 機の駐機場。出動中の機体は消え、看板と当たり判定も切り替わる。向き = 0 で置くこと */
  mycenaebay(P, o, e) {
    const m = MM(), cols = o.cols || 5, dx = o.dx || 30, dz = o.dz || 36, N = RESCUE.max, out = e.out, Yg = glow('#ffd23a', 1.2), Cg = glow('#7fe8ff', 1.7), Gg = glow('#35ff8a', 1.6), h = e.room.h;
    const pos = (i) => [((i % cols) - (cols - 1) / 2) * dx, (Math.ceil(N / cols) - 1 - Math.floor(i / cols)) * dz];
    const fleet = e.dyn(instanced(buildMycenae({ landed: true }), N), 0, 0, 0), sh = new THREE.InstancedMesh(new THREE.PlaneGeometry(1, 1).rotateX(-HP), aoMat('blob'), N); sh.frustumCulled = false; sh.renderOrder = 2; fleet.add(sh);
    const tmp = new THREE.Object3D(), Z = new THREE.Matrix4().makeScale(0, 0, 0), home = [], shm = [];
    for (let i = 0; i < N; i++) {
      const [x, z] = pos(i); tmp.position.set(x, 3.7, z); tmp.rotation.set(0, Math.PI, 0); tmp.scale.setScalar(1); tmp.updateMatrix(); home.push(tmp.matrix.clone()); tmp.position.set(x, 0.022, z - 1); tmp.rotation.set(0, 0, 0); tmp.scale.set(26, 1, 36); tmp.updateMatrix(); shm.push(tmp.matrix.clone());
      // 駐機枠・発進誘導線・番号札の吊り下げ
      for (const s of [-1, 1]) { P.box(Yg, 0.16, 0.02, 34, x + s * 13.6, 0.012, z - 2); P.box(Yg, 27.4, 0.02, 0.16, x, 0.012, z - 2 + s * 17); }
      for (let k = 0; k < 6; k++) P.box(k % 2 ? Cg : Gg, 0.22, 0.03, 1.5, x, 0.014, z + 15.5 + k * 2.6);
      for (const s of [-1, 1]) { P.box(m.dk, 0.06, h - 12.2, 0.06, x + s * 3.0, (h + 12.2) / 2, z - 21); P.box(Gg, 0.5, 0.05, 0.5, x + s * 13.6, 0.03, z - 19); }
      P.box(m.dk, 6.9, 0.14, 0.2, x, 12.2, z - 21); P.box(m.dk, 6.9, 0.14, 0.2, x, 8.84, z - 21);
    }
    // 番号札 (15 枚を 1 枚のテクスチャにまとめる)
    const CW = 256, CH = 128, rows = Math.ceil(N / cols), c = cv(CW * cols, CH * rows), x2 = c.getContext('2d'), tex = ctex(c, true, false), P3 = [], UV = [], IX = [];
    for (let i = 0; i < N; i++) { const [x, z] = pos(i), u0 = (i % cols) / cols, u1 = u0 + 1 / cols, v1 = 1 - Math.floor(i / cols) / rows, v0 = v1 - 1 / rows;
      for (const s of [-1, 1]) { const b0 = P3.length / 3, zz = z - 21 + s * 0.12; P3.push(x - 3.2 * s, 9, zz, x + 3.2 * s, 9, zz, x + 3.2 * s, 12.1, zz, x - 3.2 * s, 12.1, zz); UV.push(u0, v0, u1, v0, u1, v1, u0, v1); IX.push(b0, b0 + 1, b0 + 2, b0, b0 + 2, b0 + 3); } }
    const sg = new THREE.BufferGeometry(); sg.setAttribute('position', new THREE.Float32BufferAttribute(P3, 3)); sg.setAttribute('uv', new THREE.Float32BufferAttribute(UV, 2)); sg.setIndex(IX);
    const board = new THREE.Mesh(sg, basic('#fff', 1.7, { map: tex })); board.frustumCulled = false; fleet.add(board);
    const draw = (n) => { x2.clearRect(0, 0, c.width, c.height); x2.textAlign = 'center'; x2.textBaseline = 'middle';
      for (let i = 0; i < N; i++) { const X = (i % cols) * CW, Y = Math.floor(i / cols) * CH, outb = i < n, col = outb ? '#ffb030' : '#35ff8a'; x2.fillStyle = 'rgba(3,10,12,.92)'; x2.fillRect(X + 4, Y + 4, CW - 8, CH - 8); x2.strokeStyle = col; x2.lineWidth = 5; x2.strokeRect(X + 6, Y + 6, CW - 12, CH - 12);
        x2.fillStyle = col; x2.font = `900 78px ${JP}`; x2.fillText(String(i + 1).padStart(2, '0'), X + 62, Y + 68); x2.font = `700 21px ${JP}`; x2.fillStyle = '#dff'; x2.fillText('MYCENAE', X + 176, Y + 34); x2.fillStyle = col; x2.font = `900 27px ${JP}`; x2.fillText(outb ? '出動中' : '待機中', X + 176, Y + 68); x2.font = `700 17px ${JP}`; x2.fillText(outb ? 'DEPLOYED' : 'STANDBY', X + 176, Y + 100); }
      tex.needsUpdate = true; };
    // 当たり判定と乗り込み口 (機体があるときだけ有効)
    const solid = [], hide = (q, on, src) => { if (on) { q[0] = src[0]; q[2] = src[2]; } else { q[0] = 1e9; q[2] = 1e9; } };
    for (let i = 0; i < N; i++) { const [lx, lz] = pos(i), x = e.x + lx, z = e.z + lz, A = [x - 3.7, z - 13.7, x + 3.7, z + 13.7, 0], B2 = [x - 2.3, z - 17.2, x + 2.3, z - 13.7, 0];
      solid.push({ r: [A.slice(), B2.slice()], s: [A, B2], it: { x, z: z - 21.3, y: 1.2, r: 3.4, label: `ミケーネ ${i + 1} 号機に乗り込む`, act: 'mycenae', idx: i, room: e.room.id, wide: 1 } }); }
    let init = false, last = -1;
    const apply = () => { const n = rescueN(); if (!init) { init = true; for (const q of solid) out.rects.push(q.r[0], q.r[1]); } if (n === last) return; last = n;
      for (let i = 0; i < N; i++) { const here = i >= n, q = solid[i]; fleet.userData.set(i, here ? home[i] : Z); sh.setMatrixAt(i, here ? shm[i] : Z); hide(q.r[0], here, q.s[0]); hide(q.r[1], here, q.s[1]); const k = out.items.indexOf(q.it); if (here && k < 0) out.items.push(q.it); else if (!here && k >= 0) out.items.splice(k, 1); }
      fleet.userData.commit(); sh.instanceMatrix.needsUpdate = true; draw(n); };
    (out.hooks || (out.hooks = [])).push(apply);
  },
  /** ホログラムの地球儀 (アトラスの象徴)。救助船の位置を光点で示す */
  earthholo(P, o, e) {
    const m = MM(), s = o.s || 1, R = 2.2 * s, y = o.y || 4.6 * s, BZ = mat('flat', { color: 0xb8863a, rough: 0.32, metal: 1 });
    P.cyl(m.dk, 3.0 * s, 3.3 * s, 0.5, 0, 0.25, 0, 'y', 40); P.cyl(m.bk, 2.7 * s, 2.7 * s, 0.08, 0, 0.54, 0, 'y', 40); P.tor(glow('#35ff8a', 3), 2.85 * s, 0.035, 0, 0.56, 0, HP, 0, 0, 64, 6); P.add(glow('#5fd8ff', 1.1), new THREE.CircleGeometry(2.3 * s, 40).rotateX(-HP), mx(0, 0.585, 0), 0);
    for (let k = 0; k < 4; k++) { const a = k * HP + 0.785, c = Math.cos(a), sn = Math.sin(a), pts = [[2.2, 0.5], [3.0, 1.4], [3.35, 2.9], [3.05, 4.0], [2.62, 4.6]].map(([r, yy]) => new THREE.Vector3(c * r * s, yy * s * (y / (4.6 * s)), sn * r * s));
      P.add(BZ, new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 28, 0.11 * s, 10, false), null, 0); P.sph(BZ, 0.2 * s, pts[4].x, pts[4].y, pts[4].z, 1, 1, 1, 12); P.sph(BZ, 0.17 * s, pts[0].x, pts[0].y, pts[0].z, 1, 0.7, 1, 12); }
    P.tor(BZ, 2.62 * s, 0.07 * s, 0, y, 0, HP, 0, 0, 80, 8);
    const g0 = e.dyn(new THREE.Group(), 0, y, 0), g = new THREE.Group(), core = new THREE.Mesh(new THREE.SphereGeometry(R * 0.955, 40, 26), new THREE.MeshBasicMaterial({ color: 0x010409 })), globe = new THREE.Mesh(new THREE.SphereGeometry(R, 56, 36), globeMat()); g.rotation.z = 0.41; g0.add(g); g.add(core, globe);
    const ring = new THREE.Mesh(new THREE.TorusGeometry(R * 1.34, 0.012 * s, 4, 96).rotateX(HP), holoMat('#5fd8ff', 0.9)); g.add(ring);
    const N = RESCUE.max, dots = []; for (let i = 0; i < N; i++) { const d = new THREE.Mesh(new THREE.SphereGeometry(0.045 * s, 8, 6), basic('#35ff8a', 5)); g.add(d); dots.push(d); }
    const cone = e.dyn(new THREE.Mesh(new THREE.CylinderGeometry(R * 0.9, 2.3 * s, y - R * 0.5 - 0.6, 32, 1, true), holoMat('#5fd8ff', 0.1)), 0, 0.6 + (y - R * 0.5 - 0.6) / 2, 0);
    const v = new THREE.Vector3(), UPY = new THREE.Vector3(0, 1, 0), city = new THREE.Vector3(0.62, 0.48, 0.62).normalize();
    e.anim((dt, t) => { globe.rotation.y += dt * 0.12; cone.rotation.y -= dt * 0.2; const n = rescueN();
      for (let i = 0; i < N; i++) { const d = dots[i];
        if (i < n) { const a = i * 2.4, rr = 0.1 + (i % 5) * 0.035; v.copy(city); v.x += Math.cos(a) * rr; v.z += Math.sin(a) * rr; v.normalize().multiplyScalar(R * 1.02).applyAxisAngle(UPY, globe.rotation.y); d.position.copy(v); d.material.color.set('#ffb030').multiplyScalar(3 + 3 * Math.max(0, Math.sin(t * 5 + i))); } // 出動中: 都市の上で点滅
        else { const a = t * 0.25 + i * TAU / N; d.position.set(Math.cos(a) * R * 1.34, 0, Math.sin(a) * R * 1.34); d.material.color.set('#35ff8a').multiplyScalar(5); } } }); // 待機中: 軌道環を周回
    e.light('#5fd8ff', 46, Math.min(y, 4), 16); e.col(3.35 * s); if (o.use) e.use(o.label, o.use, 4.6 * s + 1);
  },
  /** 壁の出動状況ボード (ミケーネ 01〜15) */
  statusboard(P, o, e) {
    const m = MM(), w = o.w || 8, h = o.h || 3.2, y = o.y || 3, c = cv(1024, 410), x = c.getContext('2d'), tex = ctex(c, true, false), N = RESCUE.max;
    P.box(m.bk, w + 0.24, h + 0.24, 0.1, 0, y, 0.05); P.box(glow('#35ff8a', 2.4), w + 0.24, 0.04, 0.04, 0, y - h / 2 - 0.16, 0.1); P.add(basic('#fff', 1.5, { map: tex }), new THREE.PlaneGeometry(w, h), mx(0, y, 0.11), 0);
    let last = -1;
    const draw = (n) => { x.fillStyle = '#02080a'; x.fillRect(0, 0, 1024, 410); x.fillStyle = '#35ff8a'; x.font = `900 34px ${JP}`; x.textAlign = 'left'; x.textBaseline = 'middle'; x.fillText('MYCENAE FLEET — ミケーネ出動状況', 24, 34);
      x.textAlign = 'right'; x.fillStyle = n ? '#ffb030' : '#35ff8a'; x.fillText(n ? `出動中 ${n} / ${N}` : `全機待機 ${N} / ${N}`, 1000, 34); x.fillStyle = '#35ff8a'; x.fillRect(24, 60, 976, 3); x.textAlign = 'center';
      for (let i = 0; i < N; i++) { const X = 24 + (i % 5) * 196, Y = 78 + Math.floor(i / 5) * 108, outb = i < n, col = outb ? '#ffb030' : '#35ff8a'; x.strokeStyle = col; x.lineWidth = 3; x.strokeRect(X, Y, 186, 96); x.fillStyle = outb ? 'rgba(255,176,48,.14)' : 'rgba(53,255,138,.1)'; x.fillRect(X, Y, 186, 96);
        x.fillStyle = col; x.font = `900 50px ${JP}`; x.fillText(String(i + 1).padStart(2, '0'), X + 46, Y + 50); x.font = `900 22px ${JP}`; x.fillText(outb ? '出動中' : '待機中', X + 128, Y + 36); x.font = `700 15px ${JP}`; x.fillStyle = '#cfe'; x.fillText(outb ? 'NEON BAY' : 'BAY ' + 'ABC'[Math.floor(i / 5)] + '-' + (i % 5 + 1), X + 128, Y + 66); }
      tex.needsUpdate = true; };
    e.anim(() => { const n = rescueN(); if (n !== last) { last = n; draw(n); } });
  },
  /** 救援物資の棚 (緑十字の箱・水タンク・毛布) */
  supplyrack(P, o, e) {
    const m = MM(), w = o.w || 3.2, G2 = glow('#35ff8a', 1.6), WB = crateM(0xf0f2f0), BL = crateM(0x2a6ab8), OR = fab(0xff7a2a);
    for (const s of [-1, 1]) for (const z of [-0.45, 0.45]) P.box(m.st, 0.07, 3.0, 0.07, s * w / 2, 1.5, z);
    for (let k = 0; k < 4; k++) { const y = 0.12 + k * 0.92; P.box(m.dk, w, 0.06, 1.0, 0, y, 0); let x = -w / 2 + 0.45;
      while (x < w / 2 - 0.3) { const t = e.rnd();
        if (t < 0.5) { const s = 0.5 + e.rnd() * 0.16; P.box(WB, s, s * 0.9, 0.7, x, y + 0.03 + s * 0.45, 0); P.box(G2, 0.2, 0.06, 0.01, x, y + 0.03 + s * 0.45, 0.356); P.box(G2, 0.06, 0.2, 0.01, x, y + 0.03 + s * 0.45, 0.356); x += s + 0.1; }
        else if (t < 0.75) { P.cyl(BL, 0.24, 0.24, 0.66, x, y + 0.36, 0, 'y', 14); P.cyl(m.dk, 0.25, 0.25, 0.05, x, y + 0.6, 0, 'y', 14); x += 0.58; }
        else { for (let j = 0; j < 3; j++) P.add(OR, new THREE.CylinderGeometry(0.11, 0.11, 0.7, 10), mx(x + (j - 1) * 0.2, y + 0.14 + (j === 1 ? 0.17 : 0), 0, HP, 0, 0)); x += 0.72; } } }
    e.rect(w, 1.0);
  },
  /** 救難服ロッカー (橙の与圧服とヘルメット) */
  suitlocker(P, o, e) {
    const m = MM(), n = o.n || 3, A = flat(0xff6a1e, 0.6, 0.1);
    for (let i = 0; i < n; i++) { const x = (i - (n - 1) / 2) * 0.9; P.box(m.st, 0.86, 2.3, 0.06, x, 1.15, -0.27); P.box(m.st, 0.05, 2.3, 0.6, x - 0.43, 1.15, 0); P.box(m.st, 0.05, 2.3, 0.6, x + 0.43, 1.15, 0); P.box(m.st, 0.9, 0.05, 0.6, x, 2.3, 0); P.box(glow('#fff2d8', 2.2), 0.6, 0.03, 0.05, x, 2.22, 0.1);
      P.add(A, new THREE.CapsuleGeometry(0.2, 0.5, 4, 12), mx(x, 1.35, -0.02, 0, 0, 0, 1.2, 1, 0.8), 0); for (const s of [-1, 1]) { P.add(A, new THREE.CapsuleGeometry(0.08, 0.55, 4, 8), mx(x + s * 0.3, 1.3, -0.02, 0, 0, s * 0.1), 0); P.add(A, new THREE.CapsuleGeometry(0.095, 0.6, 4, 8), mx(x + s * 0.12, 0.55, -0.02), 0); P.box(m.bk, 0.16, 0.12, 0.3, x + s * 0.12, 0.08, 0.02); }
      P.sph(m.wh, 0.19, x, 1.98, 0, 1, 1, 1, 16); P.add(mat('flat', { color: 0x1a1206, rough: 0.05, metal: 1, env: 2 }), new THREE.SphereGeometry(0.16, 14, 10, 0, Math.PI, 0.8, 1.1).rotateY(-HP), mx(x, 1.99, 0.05), 0); P.box(glow('#35ff8a', 2), 0.1, 0.03, 0.01, x, 1.45, 0.145); P.box(glow('#35ff8a', 2), 0.03, 0.1, 0.01, x, 1.45, 0.145); }
    e.rect(n * 0.9, 0.6);
  },
  /** 車輪つき担架 */
  stretcher(P, o, e) {
    const m = MM(); P.box(m.ch, 0.72, 0.05, 2.0, 0, 0.78, 0); P.box(flat(0xf0f2f0, 0.9, 0), 0.66, 0.1, 1.9, 0, 0.86, 0); P.box(fab(o.c || 0xff7a2a), 0.68, 0.06, 1.15, 0, 0.93, 0.32); P.box(flat(0xffffff, 0.9, 0), 0.44, 0.09, 0.3, 0, 0.94, -0.72);
    for (const [x, z] of [[-0.3, -0.85], [0.3, -0.85], [-0.3, 0.85], [0.3, 0.85]]) { P.add(m.ch, new THREE.CylinderGeometry(0.02, 0.02, 0.72, 6), mx(x, 0.42, z * 0.8, z > 0 ? 0.25 : -0.25, 0, 0)); P.cyl(m.bk, 0.07, 0.07, 0.04, x, 0.07, z, 'x', 10); }
    for (const s of [-1, 1]) P.box(m.ch, 0.03, 0.2, 1.1, s * 0.36, 0.96, 0.2);
    P.cyl(m.ch, 0.012, 0.012, 1.1, 0.33, 1.45, -0.85, 'y', 5); P.box(m.ch, 0.2, 0.012, 0.012, 0.33, 2.0, -0.85); P.add(glassMat(), new THREE.BoxGeometry(0.1, 0.18, 0.04), mx(0.4, 1.88, -0.85), 0); P.box(glow('#6fe8ff', 1.4), 0.08, 0.1, 0.03, 0.4, 1.85, -0.85);
    e.rect(0.8, 2.1); if (o.use) e.use(o.label || '担架', o.use, 2.2);
  },

  // ───────────────────────── 医療 ─────────────────────────
  /** 手術台とロボット手術アーム */
  surgery(P, o, e) {
    const m = MM(), GR = flat(0x2a8a78, 0.9, 0), h = Math.min(e.room.h, 4.2);
    P.box(m.dk, 0.5, 0.74, 0.6, 0, 0.37, 0); P.box(m.ch, 0.9, 0.05, 0.9, 0, 0.03, 0); P.box(m.wh, 0.8, 0.1, 2.1, 0, 0.82, 0); P.box(flat(0x1c1f25, 0.6, 0.2), 0.74, 0.06, 2.0, 0, 0.9, 0);
    P.add(GR, new THREE.CapsuleGeometry(0.2, 1.1, 4, 14), mx(0, 1.0, 0.2, HP, 0, 0, 1.5, 1, 0.75), 0); P.sph(m.wh, 0.12, 0, 1.04, -0.78, 1, 1, 1.1, 14); P.box(GR, 0.5, 0.02, 0.4, 0, 0.94, -0.78);
    // 無影灯
    P.cyl(m.dk, 0.05, 0.05, h - 2.75, 0, (h + 2.75) / 2, 0, 'y', 8); P.cyl(m.wh, 0.55, 0.48, 0.14, 0, 2.68, 0, 'y', 28); P.add(glow('#ffffff', 4.5), new THREE.CircleGeometry(0.2, 20).rotateX(HP), mx(0, 2.6, 0), 0);
    for (let i = 0; i < 6; i++) P.add(glow('#f4fbff', 4), new THREE.CircleGeometry(0.1, 12).rotateX(HP), mx(Math.cos(i * 1.047) * 0.34, 2.6, Math.sin(i * 1.047) * 0.34), 0);
    // 麻酔器・器械台
    P.box(m.wh, 0.6, 1.3, 0.5, -1.25, 0.65, -0.8); scr(P, 'graph', '#35ff8a', 'VITAL', 0.52, 0.34, -1.25, 1.52, -0.54); P.box(m.bk, 0.58, 0.4, 0.05, -1.25, 1.52, -0.58); P.cyl(crateM(0x2a6ab8), 0.09, 0.09, 0.7, -1.62, 0.36, -0.8, 'y', 10); P.cyl(crateM(0x3aa86a), 0.09, 0.09, 0.7, -1.62, 0.36, -0.58, 'y', 10);
    P.box(m.ch, 0.7, 0.03, 0.44, 1.2, 0.92, 0.5); P.cyl(m.ch, 0.02, 0.02, 0.9, 1.2, 0.46, 0.5, 'y', 6); P.cyl(m.ch, 0.26, 0.28, 0.03, 1.2, 0.015, 0.5, 'y', 12); for (let i = 0; i < 6; i++) P.box(m.ch, 0.02, 0.012, 0.16 + (i % 3) * 0.04, 0.95 + i * 0.1, 0.945, 0.5, (i % 2) * 0.3);
    // ロボットアーム 3 本 (天井のレールから)
    P.box(m.dk, 2.6, 0.1, 0.16, 0, h - 0.4, 0.5); const arms = [];
    for (let i = 0; i < 3; i++) { const g = new THREE.Group(), b = new Builder(), f = new THREE.Group(), fb = new Builder(), tip = new THREE.Mesh(new THREE.SphereGeometry(0.02, 8, 6), basic(i === 1 ? '#6fe8ff' : '#ffffff', i === 1 ? 6 : 2));
      b.add(m.wh, new THREE.CylinderGeometry(0.05, 0.06, 0.95, 10), mx(0, -0.47, 0)); b.add(m.dk, new THREE.SphereGeometry(0.08, 10, 8), mx(0, -0.95, 0), 0); b.add(m.dk, new THREE.CylinderGeometry(0.09, 0.09, 0.12, 10), mx(0, -0.02, 0)); g.add(b.build({ shadow: false }));
      fb.add(m.wh, new THREE.CylinderGeometry(0.035, 0.045, 0.8, 10), mx(0, -0.4, 0)); fb.add(m.ch, new THREE.CylinderGeometry(0.008, 0.012, 0.22, 6), mx(0, -0.9, 0)); f.add(fb.build({ shadow: false })); tip.position.y = -1.02; f.add(tip); f.position.y = -0.95; g.add(f); e.dyn(new THREE.Group(), (i - 1) * 0.95, h - 0.45, 0.5).add(g); arms.push([g, f, tip, i]); }
    e.anim((dt, t) => { for (const [g, f, tip, i] of arms) { g.rotation.x = -0.35 + Math.sin(t * 0.7 + i * 2) * 0.1; g.rotation.z = (1 - i) * 0.42 + Math.sin(t * 0.9 + i) * 0.07; f.rotation.x = 0.55 + Math.sin(t * 1.3 + i * 1.7) * 0.16; if (i === 1) tip.material.color.set('#6fe8ff').multiplyScalar(3 + 4 * Math.abs(Math.sin(t * 17))); } });
    e.rect(0.9, 2.2); e.col(0.4, -1.25, -0.8); e.col(0.35, 1.2, 0.5); e.light('#f4fbff', 34, 2.4, 9); if (o.use) e.use(o.label || '手術台', o.use, 2.6);
  },
  /** 全身スキャナ (ドーナツ型の検査装置) */
  mri(P, o, e) {
    const m = MM(), c = o.c || '#6fe8ff';
    P.cyl(m.wh, 1.3, 1.3, 1.5, 0, 1.3, 0, 'z', 44); P.tor(m.ch, 1.28, 0.05, 0, 1.3, 0.75, 0, 0, 0, 44, 6); P.tor(m.ch, 1.28, 0.05, 0, 1.3, -0.75, 0, 0, 0, 44, 6); P.box(m.wh, 2.2, 0.5, 1.5, 0, 0.25, 0);
    for (const s of [-1, 1]) { P.add(m.bk, new THREE.CircleGeometry(0.56, 32), mx(0, 1.3, s * 0.752, 0, s > 0 ? 0 : Math.PI, 0), 0); P.tor(glow(c, 3.4), 0.58, 0.025, 0, 1.3, s * 0.755, 0, 0, 0, 40, 6); }
    P.box(m.dk, 0.5, 0.8, 0.5, 0, 0.4, 1.9); P.box(m.wh, 0.62, 0.1, 2.4, 0, 0.9, 1.7); P.box(flat(0x1c1f25, 0.6, 0.2), 0.56, 0.05, 2.3, 0, 0.97, 1.7); P.box(flat(0xffffff, 0.9, 0), 0.4, 0.08, 0.28, 0, 1.0, 2.6);
    P.box(glow(c, 2.4), 0.5, 0.06, 0.02, -0.7, 2.0, 0.76); scr(P, 'data', c, 'SCAN', 0.5, 0.3, 0.72, 2.0, 0.765);
    const ring = e.dyn(new THREE.Mesh(new THREE.TorusGeometry(0.5, 0.045, 6, 24, 1.3), basic(c, 5)), 0, 1.3, 0.2);
    e.anim((dt, t) => { ring.rotateZ(dt * 3.2); ring.position.y = 1.3 + e.y0; });
    e.rect(2.7, 1.6); e.rect(0.7, 2.5, 0, 1.8); e.light(c, 12, 1.5, 6); if (o.use) e.use(o.label || '全身スキャナ', o.use, 2.8);
  },

  // ───────────────────────── ファイザー (創薬) ─────────────────────────
  /** 回転する二重らせんの彫像 (吹き抜けの象徴) */
  dnahelix(P, o, e) {
    const m = MM(), H = o.h || Math.min(e.room.h - 3.4, 9), R = o.r || 1.25, y0 = 1.25, turns = H / 3.4, c = o.c || e.th.trim, WH = flat(0xf6f8fb, 0.14, 0.35), VI = mat('flat', { color: 0x8a5ce8, rough: 0.25, metal: 0.7 });
    P.cyl(m.dk, R + 0.9, R + 1.15, 0.5, 0, 0.25, 0, 'y', 36); P.cyl(m.bk, R + 0.7, R + 0.7, 0.07, 0, 0.535, 0, 'y', 36); P.tor(glow(c, 3.4), R + 0.8, 0.035, 0, 0.56, 0, HP, 0, 0, 56, 6); P.add(glow(c, 0.9), new THREE.CircleGeometry(R + 0.55, 36).rotateX(-HP), mx(0, 0.575, 0), 0);
    P.cyl(m.ch, 0.07, 0.07, y0 - 0.5, 0, (y0 + 0.5) / 2, 0, 'y', 8);
    const g = e.dyn(new THREE.Group(), 0, y0, 0), b = new Builder(), PAIR = [['#ff5a6a', '#4de1ff'], ['#ffd23a', '#5dff8a'], ['#4de1ff', '#ff5a6a'], ['#5dff8a', '#ffd23a']];
    class Hx extends THREE.Curve { constructor(ph) { super(); this.ph = ph; } getPoint(t, v = new THREE.Vector3()) { const a = t * turns * TAU + this.ph; return v.set(Math.cos(a) * R, t * H, Math.sin(a) * R); } }
    for (const ph of [0, Math.PI]) b.add(WH, new THREE.TubeGeometry(new Hx(ph), Math.round(turns * 44), 0.1, 10, false), null, 0);
    const NR = Math.round(turns * 10), up = new THREE.Vector3(0, 1, 0), q = new THREE.Quaternion(), one = new THREE.Vector3(1, 1, 1);
    for (let i = 0; i < NR; i++) { const t = (i + 0.5) / NR, a = t * turns * TAU, y = t * H, c2 = Math.cos(a), s2 = Math.sin(a), pr = PAIR[(i * 7) % 4];
      for (const s of [-1, 1]) { const d = new THREE.Vector3(c2 * s, 0, s2 * s); q.setFromUnitVectors(up, d); b.add(glow(pr[s > 0 ? 0 : 1], 2.1), new THREE.CylinderGeometry(0.045, 0.045, R * 0.84, 8), new THREE.Matrix4().compose(d.clone().multiplyScalar(R * 0.5).setY(y), q, one), 0); b.add(VI, new THREE.SphereGeometry(0.15, 12, 10), mx(c2 * R * s, y, s2 * R * s), 0); }
      b.add(m.ch, new THREE.SphereGeometry(0.07, 8, 6), mx(0, y, 0), 0); }
    g.add(b.build({ shadow: false }));
    const beam = e.dyn(new THREE.Mesh(new THREE.CylinderGeometry(R + 0.5, R + 0.6, H + 0.9, 28, 1, true), holoMat(c, 0.07)), 0, y0 + H / 2, 0);
    e.anim((dt) => { g.rotation.y += dt * 0.32; beam.rotation.y -= dt * 0.1; });
    e.light(c, 40, 2.6, 14); e.light('#4dffd8', 18, Math.min(H, 5.5), 12); e.col(R + 1.15); if (o.use) e.use(o.label, o.use, R + 3.4);
  },
  /** 実験台 (フラスコ・ビーカー・顕微鏡・遠心機) */
  labbench(P, o, e) {
    const m = MM(), w = o.w || 3.2, c = o.c || e.th.trim;
    P.box(m.wh, w, 0.86, 0.72, 0, 0.43, 0); P.box(flat(0x23272e, 0.25, 0.4), w + 0.06, 0.05, 0.8, 0, 0.885, 0); P.box(glow(c, 2.2), w, 0.025, 0.02, 0, 0.84, 0.365);
    for (let x = -w / 2 + 0.4; x < w / 2 - 0.2; x += 0.8) { P.box(m.bk, 0.012, 0.7, 0.01, x - 0.4 + 0.02, 0.45, 0.362); P.box(m.ch, 0.2, 0.025, 0.03, x, 0.66, 0.375); }
    P.box(m.wh, w, 0.05, 0.26, 0, 1.42, -0.23); P.box(m.wh, 0.05, 0.56, 0.26, -w / 2 + 0.03, 1.16, -0.23); P.box(m.wh, 0.05, 0.56, 0.26, w / 2 - 0.03, 1.16, -0.23); P.box(glow('#f6f2ff', 2.4), w - 0.3, 0.02, 0.05, 0, 1.385, -0.18);
    for (let x = -w / 2 + 0.22; x < w / 2 - 0.15; x += 0.21) { const hh = 0.14 + e.rnd() * 0.12; P.cyl(glow(LIQ[Math.floor(e.rnd() * 6)], 0.8 + e.rnd() * 0.7), 0.04, 0.05, hh, x, 1.445 + hh / 2, -0.23, 'y', 8); P.cyl(m.bk, 0.022, 0.022, 0.03, x, 1.46 + hh, -0.23, 'y', 6); }
    let x = -w / 2 + 0.35; const y = 0.91;
    flask(P, x, y, 0.08, 1.5, LIQ[0]); flask(P, x + 0.34, y, -0.12, 1.1, LIQ[1]); beaker(P, x + 0.62, y, 0.14, 1.3, LIQ[2]); x += 1.05;
    // 試験管立て
    P.box(m.wd, 0.5, 0.04, 0.14, x, y + 0.12, 0.1); P.box(m.wd, 0.5, 0.03, 0.14, x, y + 0.015, 0.1); for (let i = 0; i < 6; i++) { P.add(glassMat(), new THREE.CylinderGeometry(0.018, 0.018, 0.2, 8, 1, true), mx(x - 0.2 + i * 0.08, y + 0.12, 0.1), 0); P.cyl(glow(LIQ[i % 6], 1.8), 0.014, 0.014, 0.1, x - 0.2 + i * 0.08, y + 0.07, 0.1, 'y', 6); } x += 0.62;
    if (x < w / 2 - 0.5) { // 顕微鏡
      P.box(m.bk, 0.22, 0.04, 0.3, x, y + 0.02, 0); P.add(m.wh, new THREE.BoxGeometry(0.07, 0.36, 0.08), mx(x, y + 0.2, -0.1, 0.2, 0, 0)); P.add(m.ch, new THREE.CylinderGeometry(0.03, 0.035, 0.24, 10), mx(x, y + 0.34, 0.02, 0.5, 0, 0)); P.box(m.bk, 0.16, 0.015, 0.16, x, y + 0.14, 0.04); P.box(glow('#fff', 3), 0.04, 0.01, 0.04, x, y + 0.155, 0.04); x += 0.6; }
    if (x < w / 2 - 0.4) { // 遠心機
      P.box(m.wh, 0.5, 0.3, 0.5, x + 0.05, y + 0.15, 0); P.cyl(m.bk, 0.2, 0.2, 0.03, x + 0.05, y + 0.31, 0, 'y', 20); P.box(glow(c, 2.4), 0.14, 0.05, 0.01, x + 0.05, y + 0.14, 0.255); }
    e.rect(w, 0.8); if (o.use) e.use(o.label, o.use, 2.5);
  },
  /** ドラフトチャンバー (排気つき実験フード) */
  fumehood(P, o, e) {
    const m = MM(), w = o.w || 1.9, h = e.room.h, c = o.c || e.th.trim;
    P.box(m.wh, w, 0.9, 0.85, 0, 0.45, 0); P.box(m.wh, w, 0.5, 0.85, 0, 2.3, 0); P.box(m.wh, 0.07, 1.2, 0.85, -w / 2 + 0.035, 1.5, 0); P.box(m.wh, 0.07, 1.2, 0.85, w / 2 - 0.035, 1.5, 0); P.box(m.wh, w, 1.2, 0.05, 0, 1.5, -0.4);
    P.box(flat(0x23272e, 0.25, 0.4), w - 0.14, 0.04, 0.8, 0, 0.92, 0); P.add(glassMat(), new THREE.BoxGeometry(w - 0.14, 0.75, 0.03), mx(0, 1.66, 0.4), 0); P.box(m.ch, w - 0.14, 0.04, 0.05, 0, 1.28, 0.4); P.box(glow('#f6f2ff', 3), w - 0.3, 0.03, 0.3, 0, 2.03, 0); P.box(glow(c, 2.2), 0.3, 0.05, 0.01, w / 2 - 0.3, 2.3, 0.43);
    flask(P, -0.4, 0.94, -0.05, 1.7, LIQ[3]); beaker(P, 0.1, 0.94, 0.05, 1.5, LIQ[4]); flask(P, 0.5, 0.94, -0.1, 1.2, LIQ[5]);
    P.cyl(m.st, 0.2, 0.2, Math.max(0.1, h - 2.55), 0, (h + 2.55) / 2, -0.1, 'y', 14); e.rect(w, 0.85); e.light('#f6f2ff', 7, 1.6, 5);
  },
  /** 製剤ライン: ホッパー → 打錠機 → コンベア (カプセルが流れる) → 包装機 */
  pillline(P, o, e) {
    const m = MM(), L = o.l || 9, c = o.c || e.th.trim, x0 = -L / 2, BL = flat(0x16181c, 0.7, 0.2);
    // 原料タンク 2 基とホッパー
    for (const [dx, col] of [[0.55, '#b48cff'], [1.75, '#4dffd8']]) { P.cyl(m.dk, 0.5, 0.56, 0.3, x0 + dx, 0.15, -1.1, 'y', 20); P.add(glassMat(), new THREE.CylinderGeometry(0.46, 0.46, 1.8, 24, 1, true), mx(x0 + dx, 1.2, -1.1), 0); P.cyl(glow(col, 0.8), 0.43, 0.43, 1.2, x0 + dx, 0.9, -1.1, 'y', 20); P.cyl(m.dk, 0.5, 0.46, 0.2, x0 + dx, 2.2, -1.1, 'y', 20); P.add(m.st, new THREE.CylinderGeometry(0.06, 0.06, 1.3, 8), mx(x0 + dx, 2.6, -0.55, 1.0, 0, 0)); }
    P.add(m.ch, new THREE.CylinderGeometry(0.7, 0.14, 0.8, 20, 1, true), mx(x0 + 1.1, 2.55, 0), 0); P.cyl(m.ch, 0.72, 0.72, 0.05, x0 + 1.1, 2.95, 0, 'y', 20); for (const s of [-1, 1]) for (const z of [-0.5, 0.5]) P.box(m.st, 0.06, 2.2, 0.06, x0 + 1.1 + s * 0.6, 1.1, z);
    // 打錠機 (ピストンが上下する)
    P.box(m.wh, 1.4, 0.9, 1.1, x0 + 1.1, 0.45, 0); P.box(m.dk, 1.4, 0.16, 1.1, x0 + 1.1, 2.08, 0); P.add(glassMat(), new THREE.BoxGeometry(1.3, 1.02, 1.0), mx(x0 + 1.1, 1.46, 0), 0); P.box(glow(c, 2.4), 1.4, 0.03, 0.03, x0 + 1.1, 0.92, 0.56); scr(P, 'bars', c, 'PRESS', 0.5, 0.32, x0 + 1.1, 0.5, 0.556);
    const pist = [-0.3, 0.3].map((dx) => e.dyn(new THREE.Mesh(new THREE.CylinderGeometry(0.11, 0.11, 0.6, 12), m.ch), x0 + 1.1 + dx, 1.7, 0));
    // コンベア
    const bl = L - 4.4, bx = x0 + 2.0 + bl / 2; P.box(BL, bl, 0.06, 0.62, bx, 0.93, 0); P.box(m.st, bl, 0.1, 0.05, bx, 0.98, 0.34); P.box(m.st, bl, 0.1, 0.05, bx, 0.98, -0.34); for (let x = -bl / 2 + 0.3; x < bl / 2; x += 1.3) { P.box(m.dk, 0.08, 0.9, 0.6, bx + x, 0.45, 0); } for (const s of [-1, 1]) P.cyl(m.ch, 0.09, 0.09, 0.66, bx + s * bl / 2, 0.93, 0, 'z', 12);
    P.box(glow(c, 1.6), bl, 0.02, 0.02, bx, 0.86, 0.33);
    const NC = 54, caps = new THREE.InstancedMesh(new THREE.CapsuleGeometry(0.034, 0.07, 3, 8).rotateZ(HP), new THREE.MeshStandardMaterial({ roughness: 0.25, metalness: 0.1 }), NC), o3 = new THREE.Object3D(), cc = new THREE.Color(); caps.frustumCulled = false;
    for (let i = 0; i < NC; i++) caps.setColorAt(i, cc.set(['#ffffff', '#b48cff', '#4dffd8', '#ff7ab8'][i % 4])); e.dyn(caps, bx, 0.995, 0);
    // 検査アーチと包装機
    P.box(m.dk, 0.1, 0.7, 0.1, bx + 0.6, 1.3, 0.4); P.box(m.dk, 0.1, 0.7, 0.1, bx + 0.6, 1.3, -0.4); P.box(m.dk, 0.16, 0.12, 0.9, bx + 0.6, 1.66, 0); P.box(glow('#ff5a6a', 3), 0.03, 0.02, 0.6, bx + 0.6, 1.59, 0);
    const px = x0 + L - 1.2; P.box(m.wh, 2.0, 1.5, 1.2, px, 0.75, 0); P.box(m.dk, 2.0, 0.1, 1.2, px, 1.55, 0); P.box(m.bk, 0.5, 0.22, 0.7, px - 1.0, 1.05, 0); scr(P, 'graph', c, 'PACK', 0.7, 0.44, px + 0.3, 1.02, 0.606); P.box(glow(c, 2.4), 2.0, 0.03, 0.03, px, 1.48, 0.61);
    for (let i = 0; i < 5; i++) P.box(i % 2 ? m.ch : flat(0xe8e0ff, 0.2, 0.6), 0.5, 0.012, 0.3, px + 0.5, 1.61 + i * 0.014, 0.1, i * 0.1);
    P.box(crateM(0xf0f2f0), 0.7, 0.5, 0.7, px + 1.5, 0.25, 0.3); P.box(crateM(0xf0f2f0), 0.7, 0.5, 0.7, px + 1.55, 0.75, 0.25, 0.2); P.box(glow('#b48cff', 1.6), 0.24, 0.07, 0.01, px + 1.5, 0.25, 0.656); P.box(glow('#b48cff', 1.6), 0.07, 0.24, 0.01, px + 1.5, 0.25, 0.656);
    const dirx = Math.cos(e.ang), dirz = -Math.sin(e.ang), base = caps.position.clone();
    e.anim((dt, t) => { pist.forEach((p, i) => { p.position.y = e.y0 + 1.72 + Math.max(0, Math.sin(t * 5 + i * Math.PI)) * 0.28; });
      for (let i = 0; i < NC; i++) { const k = (((i / NC) + t * 0.045) % 1), lx = (k - 0.5) * bl * 0.96; o3.position.set(lx, 0, ((i * 37) % 9 - 4) * 0.05); o3.rotation.y = i * 1.3; o3.updateMatrix(); caps.setMatrixAt(i, o3.matrix); } caps.instanceMatrix.needsUpdate = true; });
    e.rect(L, 1.25); e.rect(1.7, 1.1, x0 + 1.15, -1.1); e.light(c, 12, 2.2, 8); if (o.use) e.use(o.label, o.use, 3);
  },
  /** 冷凍睡眠ポッドの列 (霜のついたガラス越しに人影) */
  cryopod(P, o, e) {
    const m = MM(), n = o.n || 3, c = o.c || '#7fd8ff', FR = Object.assign(new THREE.MeshStandardMaterial({ color: 0xcdeeff, roughness: 0.35, metalness: 0.1, transparent: true, opacity: 0.34, depthWrite: false, envMapIntensity: 1.5 }), { userData: { uvs: 0 } }), SIL = flat(0x1c2c3c, 0.9, 0);
    for (let i = 0; i < n; i++) { const x = (i - (n - 1) / 2) * 1.35;
      P.cyl(m.dk, 0.52, 0.6, 0.34, x, 0.17, 0, 'y', 20); P.cyl(m.dk, 0.56, 0.5, 0.3, x, 2.45, 0, 'y', 20); P.box(m.dk, 0.9, 2.3, 0.2, x, 1.3, -0.45); P.tor(glow(c, 3), 0.5, 0.02, x, 0.36, 0, HP, 0, 0, 28, 5); P.tor(glow(c, 3), 0.5, 0.02, x, 2.28, 0, HP, 0, 0, 28, 5);
      P.add(SIL, new THREE.CapsuleGeometry(0.17, 0.95, 4, 10), mx(x, 1.2, -0.05), 0); P.sph(SIL, 0.12, x, 2.0, -0.05, 1, 1, 1, 10); P.cyl(glow(c, 0.5), 0.4, 0.4, 1.9, x, 1.32, -0.03, 'y', 16);
      P.add(FR, new THREE.CylinderGeometry(0.45, 0.45, 1.92, 22, 1, true), mx(x, 1.32, 0), 0);
      P.box(m.bk, 0.3, 0.2, 0.04, x, 0.72, 0.5, 0, -0.3, 0); P.box(glow(i % 3 === 1 ? '#ffb030' : '#35ff8a', 2.4), 0.2, 0.05, 0.01, x, 0.74, 0.525, 0, -0.3, 0); }
    const mist = e.dyn(makeGlowSprite('#bfe8ff', 2.4, 0.22), 0, 0.3, 0.7), p0 = mist.position.clone(); e.anim((dt, t) => { const k = (t * 0.13 + e.x) % 1; mist.position.x = p0.x + Math.sin(t * 0.3 + e.z) * n * 0.5; mist.scale.setScalar(2 + k * 2.4); mist.material.opacity = 0.35 * Math.sin(k * Math.PI); });
    e.rect(n * 1.35, 1.1, 0, -0.1); e.light(c, 12, 1.5, 7); if (o.use) e.use(o.label || '冷凍睡眠ポッド', o.use, 2.6);
  },
  /** 水耕栽培の塔 (紫の育成灯) */
  hydrotower(P, o, e) {
    const m = MM(), h = o.h || 2.9; P.cyl(m.dk, 0.42, 0.5, 0.36, 0, 0.18, 0, 'y', 18); P.cyl(m.wh, 0.14, 0.14, h, 0, h / 2 + 0.3, 0, 'y', 12); P.tor(glow('#4dffd8', 2.4), 0.46, 0.02, 0, 0.38, 0, HP, 0, 0, 24, 5);
    for (let k = 0; k < 4; k++) { const y = 0.75 + k * 0.62; P.tor(m.wh, 0.36, 0.09, 0, y, 0, HP, 0, 0, 22, 8); P.tor(glow('#c06aff', 2.8), 0.5, 0.014, 0, y + 0.46, 0, HP, 0, 0, 24, 4); for (let i = 0; i < 5; i++) { const a = i * 1.257 + k; bush(P, e, 0.2, 5, Math.cos(a) * 0.36, y + 0.2, Math.sin(a) * 0.36, 0.9); } }
    e.col(0.55); e.light('#c06aff', 7, 1.8, 5);
  },
  /** 除染ゲート: 紫外線の走査光が上下し、霧が噴き出す */
  uvarch(P, o, e) {
    const m = MM(), w = o.w || 5.2, h = Math.min(e.room.h - 0.3, 3.2), c = '#a070ff';
    for (const s of [-1, 1]) { P.box(m.dk, 0.24, h, 0.36, s * w / 2, h / 2, 0); P.box(glow(c, 3), 0.03, h - 0.4, 0.1, s * (w / 2 - 0.135), h / 2, 0); for (let k = 0; k < 4; k++) P.cyl(m.ch, 0.035, 0.05, 0.1, s * (w / 2 - 0.16), 0.5 + k * 0.7, 0.1, 'x', 8); }
    P.box(m.dk, w + 0.24, 0.26, 0.36, 0, h, 0); P.box(glow(c, 3), w - 0.4, 0.03, 0.1, 0, h - 0.145, 0);
    const bar = e.dyn(new THREE.Mesh(new THREE.BoxGeometry(w - 0.3, 0.025, 0.05), basic(c, 6)), 0, 1, 0), sheet = e.dyn(new THREE.Mesh(new THREE.PlaneGeometry(w - 0.3, 0.7), basic(c, 0.35, { ...ADD, side: THREE.DoubleSide })), 0, 1, 0);
    const L = { x: e.x, y: 1.5, z: e.z, c: new THREE.Color(c), i: 16, d: 7 }; e.out.lights.push(L);
    const mist = [-1, 1].map((s) => e.dyn(makeGlowSprite('#e8e0ff', 1.2, 0.2), s * (w / 2 - 0.5), 1.2, 0.1));
    e.anim((dt, t) => { const y = 0.25 + (0.5 + 0.5 * Math.sin(t * 1.1 + e.z)) * (h - 0.6); bar.position.y = e.y0 + y; sheet.position.y = e.y0 + y; L.y = e.y0 + y; L.i = 12 + 6 * Math.sin(t * 9);
      mist.forEach((s, i) => { const k = (t * 0.5 + i * 0.5 + e.z) % 1; s.scale.setScalar(0.5 + k * 1.8); s.material.opacity = (1 - k) * 0.4; s.position.y = e.y0 + 0.6 + i * 1.2 + k * 0.3; }); });
    e.col(0.2, -w / 2, 0); e.col(0.2, w / 2, 0);
  },
  /** 大型の標本槽 (発光クラゲが漂う) */
  specimen(P, o, e) {
    const m = MM(), R = o.r || 1.25, h = Math.min(e.room.h - 0.9, o.h || 5), c = o.c || '#4dffd8', jc = o.jc || '#ff7ab8';
    P.cyl(m.dk, R + 0.2, R + 0.35, 0.5, 0, 0.25, 0, 'y', 32); P.cyl(m.dk, R + 0.3, R + 0.15, 0.45, 0, h - 0.22, 0, 'y', 32); P.tor(glow(c, 3.2), R + 0.12, 0.03, 0, 0.52, 0, HP, 0, 0, 48, 6); P.tor(glow(c, 3.2), R + 0.12, 0.03, 0, h - 0.46, 0, HP, 0, 0, 48, 6);
    P.add(glassMat(), new THREE.CylinderGeometry(R, R, h - 0.95, 36, 1, true), mx(0, h / 2 + 0.02, 0), 0);
    e.dyn(new THREE.Mesh(new THREE.CylinderGeometry(R - 0.04, R - 0.04, h - 1.0, 28), new THREE.MeshBasicMaterial({ color: new THREE.Color(c).multiplyScalar(0.22), transparent: true, opacity: 0.38, depthWrite: false, toneMapped: false })), 0, h / 2 + 0.02, 0);
    const jel = []; for (let k = 0; k < (o.n || 3); k++) { const g = new THREE.Group(), bm = basic(k % 2 ? '#b48cff' : jc, 2.2, { ...ADD, side: THREE.DoubleSide }), bell = new THREE.Mesh(new THREE.SphereGeometry(0.3, 18, 10, 0, TAU, 0, HP * 1.15), bm), ten = [];
      g.add(bell, new THREE.Mesh(new THREE.SphereGeometry(0.13, 10, 8), basic('#ffffff', 2.4, ADD)));
      for (let i = 0; i < 7; i++) { const tn = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.004, 0.8, 4).translate(0, -0.4, 0), bm); tn.position.set(Math.cos(i * 0.9) * 0.2, -0.04, Math.sin(i * 0.9) * 0.2); g.add(tn); ten.push(tn); }
      e.dyn(g, 0, h / 2, 0); jel.push([g, ten, k, g.position.clone()]); }
    const bub = []; for (let i = 0; i < 5; i++) bub.push(e.dyn(makeGlowSprite('#dffcff', 0.1, 1.2), Math.cos(i * 2.2) * R * 0.6, 1, Math.sin(i * 2.2) * R * 0.6));
    e.anim((dt, t) => { for (const [g, ten, k, p0] of jel) { const a = t * 0.2 + k * 2.1, pulse = Math.sin(t * 1.6 + k * 2); g.position.set(p0.x + Math.cos(a) * R * 0.45, p0.y + Math.sin(t * 0.33 + k * 1.9) * (h * 0.22), p0.z + Math.sin(a * 1.3) * R * 0.45); g.scale.set(1 + pulse * 0.12, 1 - pulse * 0.14, 1 + pulse * 0.12); ten.forEach((tn, i) => { tn.rotation.x = Math.sin(t * 1.4 + i + k) * 0.25; tn.rotation.z = Math.cos(t * 1.1 + i * 2 + k) * 0.25; }); }
      bub.forEach((s, i) => { const k = (t * (0.18 + i * 0.03) + i * 0.21) % 1; s.position.y = e.y0 + 0.6 + k * (h - 1.3); s.material.opacity = Math.sin(k * Math.PI) * 0.8; }); });
    e.col(R + 0.35); e.light(c, 26, h / 2, 11); if (o.use) e.use(o.label, o.use, R + 2.6);
  },
  /** 操縦室の頭上盤 (天井のスイッチ列・警告灯・非常灯) */
  overhead(P, o, e) {
    const m = MM(), h = e.room.h, w = o.w || 3.0, d = o.d || 1.5, cs = ['#ff7a2a', '#35ff8a', '#6fe8ff', '#ffd23a', '#ff3a2a'];
    P.box(m.dk, w, 0.16, d, 0, h - 0.1, 0); P.box(m.bk, w - 0.16, 0.02, d - 0.16, 0, h - 0.19, 0); P.box(m.ch, w + 0.06, 0.03, 0.05, 0, h - 0.2, d / 2); P.box(m.ch, w + 0.06, 0.03, 0.05, 0, h - 0.2, -d / 2);
    for (let j = 0; j < 5; j++) for (let i = 0; i < 16; i++) { const x = -w / 2 + 0.2 + i * (w - 0.4) / 15, z = -d / 2 + 0.2 + j * (d - 0.4) / 4, k = (i * 7 + j * 5) % 11;
      if (k < 6) P.box(glow(cs[(i + j * 2) % 5], k < 2 ? 3 : 1.1), 0.05, 0.012, 0.05, x, h - 0.205, z); else if (k < 9) { P.cyl(m.ch, 0.012, 0.012, 0.06, x, h - 0.225, z, 'y', 5); P.sph(m.bk, 0.018, x, h - 0.26, z, 1, 1, 1, 6); } else P.box(m.st, 0.1, 0.012, 0.06, x, h - 0.2, z); }
    for (const s of [-1, 1]) { P.cyl(m.dk, 0.05, 0.07, 0.05, s * (w / 2 - 0.25), h - 0.21, 0, 'y', 10); P.add(glow('#fff2d8', 3), new THREE.CircleGeometry(0.045, 10).rotateX(HP), mx(s * (w / 2 - 0.25), h - 0.24, 0), 0); }
    scr(P, 'data', '#ff7a2a', 'SYS', 0.5, 0.26, 0, h - 0.34, d / 2 + 0.02, 0.5, 1.4); P.add(m.dk, new THREE.BoxGeometry(0.56, 0.32, 0.04), mx(0, h - 0.34, d / 2 + 0.0, 0.5, 0, 0));
    const lamp = e.dyn(new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.02, 0.12), basic('#ff3a2a', 3)), w / 2 - 0.5, h - 0.21, -d / 2 + 0.2); e.anim((dt, t) => { lamp.material.color.set('#ff3a2a').multiplyScalar((t * 0.7) % 1 < 0.5 ? 4 : 0.4); });
    e.light('#ffd9c0', 4, h - 0.6, 4);
  },
  /** 操縦席のあいだの中央制御台 (推力レバー・航法画面・非常用ハンドル) */
  pedestal(P, o, e) {
    const m = MM(), A = flat(0xff5412, 0.55, 0.15);
    P.box(m.dk, 0.56, 0.66, 2.3, 0, 0.33, 0); P.add(m.dk, new THREE.BoxGeometry(0.6, 0.06, 2.34), mx(0, 0.69, 0, 0.06, 0, 0)); P.box(glow('#ff7a2a', 2), 0.02, 0.02, 2.2, 0.29, 0.6, 0); P.box(glow('#ff7a2a', 2), 0.02, 0.02, 2.2, -0.29, 0.6, 0);
    P.add(m.bk, new THREE.BoxGeometry(0.44, 0.02, 0.5), mx(0, 0.73, 0.7, 0.06, 0, 0)); scr(P, 'orbit', '#35ff8a', 'NAV', 0.4, 0.3, 0, 0.745, 0.7, 0.06 - HP, 1.5);
    for (const dx of [-0.13, 0.0, 0.13]) { P.add(m.ch, new THREE.CylinderGeometry(0.012, 0.012, 0.24, 6), mx(dx, 0.84, -0.15, 0.5, 0, 0)); P.box(dx ? m.bk : A, 0.07, 0.06, 0.05, dx, 0.94, -0.21); P.box(m.bk, 0.02, 0.01, 0.3, dx, 0.725, -0.1); }
    for (let i = 0; i < 4; i++) for (let j = 0; j < 3; j++) P.box(glow(['#6fe8ff', '#35ff8a', '#ffd23a'][(i + j) % 3], 1.6), 0.05, 0.012, 0.05, -0.15 + i * 0.1, 0.728 - (-0.75 - j * 0.09) * 0.06, -0.75 - j * 0.09);
    P.add(A, new THREE.TorusGeometry(0.07, 0.016, 6, 14), mx(0.2, 0.8, -1.02, HP, 0, 0)); P.cyl(m.ch, 0.012, 0.012, 0.1, 0.2, 0.75, -1.02, 'y', 5); P.box(glow('#ff3a2a', 2.4), 0.3, 0.012, 0.08, -0.08, 0.725, -1.0);
    e.rect(0.6, 2.3);
  },
};
