// 地表モード: 大気圏内飛行 / 着陸 / 徒歩探索 / 資源採取
import * as THREE from 'three';
import { G, clamp, damp, smooth, fmtDist } from '../core/util.js';
import { buildSurface } from '../world/surface.js';
import { buildShip } from '../world/ships.js';
import { Mirror } from '../gfx/renderer.js';
import { Particles, Streaks, makeGlowSprite } from '../gfx/fx.js';
import { syncDamage, rayHit, applyDamage, logDamage, Debris } from '../gfx/damage.js';
import { SHIPS, BASES, body } from '../world/defs.js';
import { save, addCargo, event, remaining, commodity, rescueState, earn } from './state.js';
import { buildMycenae, cloneShared, makeBot } from '../world/rescue.js';
import { Builder, mx } from '../gfx/builder.js';
import { mat, glow, aoMat, signMesh } from '../gfx/textures.js';

const _a = new THREE.Vector3(), _b = new THREE.Vector3(), _c = new THREE.Vector3(), _q = new THREE.Quaternion(), _e = new THREE.Euler(0, 0, 0, 'YXZ'), _col = new THREE.Color();
const PAD_R = 34, CS = 64, gk = (x, z) => Math.floor(x / CS) * 4096 + Math.floor(z / CS);

export class SurfaceMode {
  constructor() {
    const s = (this.scene = new THREE.Scene()); this.camera = new THREE.PerspectiveCamera(64, G.W / G.H, 0.3, 30000); this.far = false;
    this.sun = new THREE.DirectionalLight(0xffffff, 3); s.add(this.sun, this.sun.target); this._shadow();
    s.add((this.hemi = new THREE.HemisphereLight(0xffffff, 0x222222, 1)));
    this.mirror = new Mirror(G.gfx, 0); this.parts = new Particles(900); this.streaks = new Streaks(900, 260); this.debris = new Debris(120); s.add(this.parts.obj, this.streaks.obj, this.debris.obj);
    this.models = {}; this.env = null; this.bodyId = null; this.time = 0;
    this.ship = { pos: new THREE.Vector3(), yaw: 0, pitch: 0, yawV: 0, speed: 0, vy: 0, landed: false, auto: null, camQ: new THREE.Quaternion(), q: new THREE.Quaternion(), view: 0 };
    this.foot = false; this.fp = new THREE.Vector3(); this.fyaw = 0; this.fpitch = 0; this.bob = 0; this.sprites = []; this.grid = new Map(); this.tick = 0; this.rainA = 0;
  }
  _shadow() { const q = G.gfx.q.shadow, l = this.sun; l.castShadow = q > 0; if (q) { const sh = l.shadow; sh.mapSize.setScalar(q); sh.map?.dispose(); sh.map = null; sh.bias = -0.0004; sh.normalBias = 0.5; const c = sh.camera; c.left = c.bottom = -150; c.right = c.top = 150; c.near = 50; c.far = 1400; c.updateProjectionMatrix(); } }
  onQuality() { this._shadow(); this._dist(); }
  /** 描画距離の設定を霧の濃さへ反映 (近い設定では霧を濃くして出現を目立たなくする) */
  _dist() { const e = this.env; if (!e || !this.scene.fog) return; const k = G.drawDist, f = k < 1 ? 1.45 : k > 1 ? 0.88 : 1; this.scene.fog.density = e.fog[1] * f; if (e.fogDen) e.fogDen.value = e.fog[1] * f; }
  skyMesh(id) { return this.env && this.env.id === id ? this.env.sky : null; }
  reclaimSky(m) { this.scene.add(m); }
  model(id) { if (!this.models[id]) { const m = buildShip(id); m.obj.traverse((o) => { if (o.isMesh && !o.userData.plume) o.castShadow = true; }); this.models[id] = m; } syncDamage(this.models[id], id); return this.models[id]; }
  dropShip(id) { const m = this.models[id]; if (m && this.ship.m !== m) m.obj.parent?.remove(m.obj); delete this.models[id]; }

  load(id) {
    if (this.env) { for (const v of this.env.veg || []) v.clear(); this.scene.remove(this.env.group, this.env.sky); this.env.group.traverse((o) => { o.geometry?.dispose(); if (o.isInstancedMesh) o.dispose(); }); for (const s of this.sprites) this.scene.remove(s); this.sprites = []; }
    const e = (this.env = buildSurface(id)); this.bodyId = id; this.scene.add(e.group, e.sky);
    this.sun.color.set(e.sunCol); this.sun.intensity = e.sunInt; this.hemi.color.set(e.hemi[0]); this.hemi.groundColor.set(e.hemi[1]); this.hemi.intensity = e.hemi[2];
    this.scene.fog = new THREE.FogExp2(e.fog[0], e.fog[1]);
    const tmp = new THREE.Scene(); tmp.add(e.sky); this.envRT?.dispose(); this.envRT = G.gfx.pmrem.fromScene(tmp, 0, 1, 20000); this.scene.environment = this.envRT.texture; this.scene.environmentIntensity = 0.9; this.scene.add(e.sky); // 前の星の環境マップは捨てる (着陸のたびに GPU メモリが増えないように)
    if (e.mirror && !e.mirror[0].userData.mir) { e.mirror[0].userData.mir = 1; this.mirror.apply(e.mirror[0], e.mirror[1]); }
    this.mirror.y = e.mirror ? 0.03 : -9999;
    for (const b of e.beacons) { const s = makeGlowSprite(b.c, b.s, 2.2); s.position.copy(b.p); s.userData.blink = b.blink; s.material.fog = false; this.scene.add(s); this.sprites.push(s); }
    this.streaks.u.uCol.value.set(e.rain[2]); this._rc = e.rain[2]; this.rainA = e.rain[1];
    for (const [i, n] of e.nodes.entries()) n.g.visible = G.p.flags[`n_${id}_${i}`] !== G.p.day;
    // 建物などの箱型障害物を格子に登録 (徒歩・飛行の当たり判定を近傍だけで済ませる)
    this.grid = new Map(); for (const b of e.obbs || []) { const rad = Math.hypot(b[2], b[3]) + 14; for (let i = Math.floor((b[0] - rad) / CS); i <= Math.floor((b[0] + rad) / CS); i++) for (let j = Math.floor((b[1] - rad) / CS); j <= Math.floor((b[1] + rad) / CS); j++) { const k = i * 4096 + j; let a = this.grid.get(k); if (!a) this.grid.set(k, (a = [])); a.push(b); } }
    this.camera.far = e.far || 30000; this._dist(); this._mk = null;
  }

  async enter(o = {}) {
    const s = this.ship;
    // 地表がまだ無い (または別の星の) まま「再開」で呼ばれたら、その星を生成して着陸パッドに駐機した状態から始める
    // (デバッグ用 URL で拠点や着陸中の救助船に直接入り、外へ出たときなど。以前は毎フレーム例外で止まっていた)
    if (o.resume && (!this.env || (o.body && o.body !== this.bodyId))) o = { ...o, resume: false, parked: true, body: o.body || this.bodyId || 'terra' };
    if (!o.resume) {
      if (this.bodyId !== o.body || !this.env) { G.hud.show(true); G.hud.banner('大気圏突入', `${body(o.body).name} の地表を展開中…`, 8); await new Promise((r) => setTimeout(r, 90)); this.load(o.body); } else for (const [i, n] of this.env.nodes.entries()) n.g.visible = G.p.flags[`n_${o.body}_${i}`] !== G.p.day;
      if (s.m) this.scene.remove(s.m.obj);
      s.m = this.model(G.p.ship); s.id = G.p.ship; this.scene.add(s.m.obj); if (s.m.gear) s.m.gear.visible = false; this._engines(true);
      s.clear = -(new THREE.Box3().setFromObject(s.m.gear || s.m.body).min.y - s.m.obj.position.y) + 0.05;
      s.pos.set(...(this.env.start || [260, 1250, 3700])); s.yaw = Math.atan2(s.pos.x, s.pos.z); s.pitch = -0.12; s.speed = 200; s.vy = 0; s.landed = false; s.auto = null; s.yawV = 0; this.foot = false;
      G.input.setThr(0.75); this._q(); s.camQ.copy(s.q);
      if (o.parked) { s.pos.set(0, this.env.padY + s.clear, 0); s.speed = 0; s.pitch = 0; s.landed = true; G.input.setThr(0); if (s.m.gear) s.m.gear.visible = true; this._engines(false); this._q(); s.camQ.copy(s.q); }
      else { const first = !G.p.stats.lands[o.body]; G.hud.banner(this.env.name, `${body(o.body).name} — ${this.env.sub}`, 4);
        setTimeout(() => G.hud.msg(first ? `${body(o.body).name} に初めて降り立つ。「オートランド」で着陸パッドへ自動着陸できる。` : '着陸パッドへ接近中。「オートランド」が使えます。', 'good', 8), 1500); }
    }
    if (o.resume || o.parked) {
      if (o.foot) { this.foot = true; const e = this.env; if (o.door) { this.fp.set(e.door[0], 0, e.door[1]); this.fp.y = this.ground(e.door[0], e.door[1], 3); this.fyaw = e.door[2] + Math.PI; } else if (o.at) { this.fp.set(o.at[0], 0, o.at[1]); this.fp.y = this.ground(o.at[0], o.at[1], 3); this.fyaw = o.at[2] ?? 0; } else if (!this._disembark()) this.foot = false; this.fpitch = 0; }
      else this.foot = false;
    }
    this._rescue();
    const e = this.env; G.gfx.look(...e.look); this.ex = null; G.gfx.fx.uHeat.value = e.heat || 0; G.gfx.fx.uWarp.value = 0; G.gfx.fx.uSun.value.z = 0; G.gfx.fx.uFlare.value = 0;
    this.camera.aspect = G.W / G.H; this.camera.updateProjectionMatrix();
    this._mode(); G.hud.show(true); G.hud.setTarget(null); this._mk = null; this._region();
    this._cam(0, true); this._cull(true);
  }
  exit() { G.gfx.fx.uHeat.value = 0; G.hud.setCtx([]); G.hud.setPrompt(''); G.audio?.engine(0, 0, 0); G.hud.damage(0); }

  // ───────────────────────── 救助船ミケーネ (地球の緊急着陸帯) ─────────────────────────
  /** 出動状況を地表へ反映する: 出動中の機数ぶん、都市の緊急着陸帯に機体・救難ボット・救護テントを置く */
  _rescue() {
    const e = this.env; if (!e || !e.rescueSites) return; const n = Math.min(rescueState().n, e.rescueSites.length), R = e.rs || (e.rs = { objs: [], n: -1 });
    if (R.n === n) return; R.n = n;
    e.cols = e.cols.filter((c) => !c.rs); e.items = e.items.filter((i) => i.act !== 'rescue'); for (const L of this.grid.values()) for (let i = L.length - 1; i >= 0; i--) if (L[i].rs) L.splice(i, 1);
    if (!this.myc) this.myc = buildMycenae({ landed: true });
    e.rescueSites.forEach((s, i) => {
      let o = R.objs[i]; const on = i < n; if (on && !o) o = R.objs[i] = this._rescueSite(s, i); if (o) o.g.visible = on; if (!on) return;
      const c = Math.cos(s.th), sn = Math.sin(s.th), W = (lx, lz) => [s.x + lx * c - lz * sn, s.z + lx * sn + lz * c];
      const b = [s.x, s.z, 3.7, 14, c, sn, s.y + 6.9]; b.rs = 1; const rad = Math.hypot(b[2], b[3]) + 14; // 胴体 = 飛行・徒歩の両方で障害物
      for (let u = Math.floor((b[0] - rad) / CS); u <= Math.floor((b[0] + rad) / CS); u++) for (let v = Math.floor((b[1] - rad) / CS); v <= Math.floor((b[1] + rad) / CS); v++) { const k = u * 4096 + v; let a = this.grid.get(k); if (!a) this.grid.set(k, (a = [])); a.push(b); }
      const [rx, rz] = W(0, 15.5); e.cols.push({ x: rx, z: rz, r: 2.3, rs: 1 }); for (const q of o.solid) e.cols.push({ x: q[0], z: q[1], r: q[2], rs: 1 });
      const [ix, iz] = W(0, 21.4); e.items.push({ x: ix, z: iz, r: 4.4, label: `ミケーネ ${i + 1} 号機に乗り込む`, act: 'rescue', idx: i, name: `救助船 ミケーネ ${String(i + 1).padStart(2, '0')}`, near: 700, wide: 1 });
    });
  }
  _rescueSite(s, i) {
    const g = new THREE.Group(), near = new THREE.Group(), botG = new THREE.Group(), c = Math.cos(s.th), sn = Math.sin(s.th), W = (lx, lz) => [s.x + lx * c - lz * sn, s.z + lx * sn + lz * c], y = s.y, solid = [];
    const ship = cloneShared(this.myc); ship.position.set(s.x, y + 3.7, s.z); ship.rotation.y = s.yaw; near.add(ship);
    const sh = new THREE.Mesh(new THREE.PlaneGeometry(27, 37).rotateX(-Math.PI / 2), aoMat('blob')); sh.position.set(s.x, y + 0.04, s.z); sh.rotation.y = s.yaw; sh.renderOrder = 2; near.add(sh);
    // 救護テント・救援物資・投光器・規制線 (静的。材質ごとに 1 メッシュ)
    const B = new Builder(), OR = mat('flat', { color: 0xff6a1e, rough: 0.8, metal: 0 }), WH = mat('flat', { color: 0xf0f2f0, rough: 0.8, metal: 0 }), DK = mat('hull', { color: 0x30353d, rough: 0.8, metal: 0.6 }), BL = mat('rib', { color: 0x2a6ab8, metal: 0.35, rough: 0.8 }), CR = mat('rib', { color: 0xf0f2f0, metal: 0.3, rough: 0.7 }), GX = glow('#35ff8a', 2), LW = glow('#fff2d8', 3.2);
    const P = (m, geo, lx, ly, lz, ry = 0, rx = 0) => { const [x, z] = W(lx, lz); B.add(m, geo, mx(x, y + ly, z, rx, s.yaw + ry, 0)); return [x, z]; };
    for (const sx of [-1, 1]) { // テント (両脇)
      const [tx, tz] = P(OR, new THREE.BoxGeometry(4.8, 2.5, 4.8), sx * 9.4, 1.25, 19); P(WH, new THREE.ConeGeometry(3.8, 1.6, 4), sx * 9.4, 3.3, 19, 0.785); P(DK, new THREE.BoxGeometry(1.7, 1.9, 0.06), sx * 9.4, 0.95, 16.585); P(LW, new THREE.BoxGeometry(1.5, 1.7, 0.04), sx * 9.4, 0.93, 16.555); // 明かりの漏れる入口
      P(GX, new THREE.BoxGeometry(0.5, 0.16, 0.05), sx * 9.4, 2.2, 16.57); P(GX, new THREE.BoxGeometry(0.16, 0.5, 0.05), sx * 9.4, 2.2, 16.565); solid.push([tx, tz, 3.2]);
      for (const [dx, dz] of [[-2.2, -2.2], [2.2, -2.2], [-2.2, 2.2], [2.2, 2.2]]) P(DK, new THREE.CylinderGeometry(0.05, 0.05, 2.6, 5), sx * 9.4 + dx, 1.3, 19 + dz);
      // 投光器 (三脚)
      const [fx, fz] = P(DK, new THREE.CylinderGeometry(0.05, 0.07, 3.4, 6), sx * 12.5, 1.7, 9); P(DK, new THREE.BoxGeometry(1.1, 0.7, 0.2), sx * 12.5, 3.5, 9, sx * -1.1, 0.3); P(LW, new THREE.BoxGeometry(0.95, 0.56, 0.05), sx * 12.5 - sx * 0.1, 3.47, 9.06, sx * -1.1, 0.3); for (let k = 0; k < 3; k++) P(DK, new THREE.CylinderGeometry(0.03, 0.03, 1.4, 5), sx * 12.5 + Math.cos(k * 2.094) * 0.4, 0.6, 9 + Math.sin(k * 2.094) * 0.4, 0, 0.5); solid.push([fx, fz, 0.5]);
    }
    for (const [lx, lz, sz, k] of [[-4.6, 21.2, 0.9, 0], [-5.4, 22.4, 0.8, 1], [-4.5, 22.5, 0.7, 0], [4.8, 22, 0.9, 1], [5.8, 21.1, 0.75, 0], [5.2, 23.1, 0.7, 0]]) { const [x, z] = P(CR, new THREE.BoxGeometry(sz, sz * 0.85, sz), lx, sz * 0.425, lz, k * 0.4); P(GX, new THREE.BoxGeometry(sz * 0.4, sz * 0.12, 0.02), lx, sz * 0.43, lz + sz / 2 + 0.012, 0); P(GX, new THREE.BoxGeometry(sz * 0.12, sz * 0.4, 0.02), lx, sz * 0.43, lz + sz / 2 + 0.012, 0); if (k === 0) solid.push([x, z, 0.75]); }
    for (const [lx, lz] of [[-6.6, 21.4], [-7.3, 21.9], [6.9, 22.6]]) { P(BL, new THREE.CylinderGeometry(0.3, 0.3, 0.9, 12), lx, 0.45, lz); P(DK, new THREE.CylinderGeometry(0.32, 0.32, 0.06, 12), lx, 0.7, lz); }
    P(WH, new THREE.BoxGeometry(0.7, 0.1, 1.9), -9.4, 0.5, 23.2); P(OR, new THREE.BoxGeometry(0.72, 0.06, 1.1), -9.4, 0.58, 23.5); for (const dz of [-0.8, 0.8]) P(DK, new THREE.BoxGeometry(0.6, 0.45, 0.05), -9.4, 0.23, 23.2 + dz); // 担架
    for (let k = 0; k < 14; k++) { const a = k / 14 * Math.PI * 2 + 0.2, lx = Math.cos(a) * 24, lz = Math.sin(a) * 24 + 3; P(OR, new THREE.ConeGeometry(0.2, 0.62, 8), lx, 0.31, lz); P(WH, new THREE.CylinderGeometry(0.13, 0.15, 0.1, 8), lx, 0.34, lz); P(DK, new THREE.BoxGeometry(0.44, 0.04, 0.44), lx, 0.02, lz); } // 規制コーン
    try { // 細部は未検証のため、失敗しても拠点そのものは建てる
      // ── 細部: 発電機と配線・給水タンク・受付の机・簡易ベッド・衛星通信・電球の列・規制テープ・避難者の列・立て看板 ──
      const YL = mat('flat', { color: 0xf2b90a, rough: 0.6, metal: 0.2 }), GN = mat('flat', { color: 0x2a8a5a, rough: 0.7, metal: 0.1 }), WD = mat('wood', { rough: 0.8, metal: 0 }), SK = mat('flat', { color: 0xe0b89a, rough: 0.8, metal: 0 }), LG = mat('flat', { color: 0x30343c, rough: 0.9, metal: 0 }), WB = glow('#ffd9a0', 3);
      const P2 = (m, geo, lx, ly, lz, ry = 0, rx = 0) => P(m, geo, lx, ly - (Math.hypot(lx, lz) > 21 ? 0.14 : 0), lz, ry, rx); // 着陸帯の舗装 (14cm) の外では地面まで下げる
      { const [gx, gz] = P(YL, new THREE.BoxGeometry(1.7, 1.0, 0.95), 14.6, 0.62, 10.6); P(DK, new THREE.BoxGeometry(1.8, 0.14, 1.05), 14.6, 0.07, 10.6); P(DK, new THREE.CylinderGeometry(0.05, 0.05, 0.7, 6), 15.2, 1.45, 10.3); P(LW, new THREE.BoxGeometry(0.3, 0.16, 0.02), 14.2, 0.8, 11.09); P(GX, new THREE.BoxGeometry(0.06, 0.06, 0.02), 14.75, 0.85, 11.09); solid.push([gx, gz, 1.1]);
        for (const [x0, z0, x1, z1] of [[14.2, 10.1, 12.6, 9.2], [14.0, 11.1, 9.6, 16.5], [13.7, 10.6, -12.4, 9.2]]) P(DK, new THREE.BoxGeometry(0.06, 0.04, Math.hypot(x1 - x0, z1 - z0)), (x0 + x1) / 2, 0.02, (z0 + z1) / 2, Math.atan2(x1 - x0, z1 - z0)); } // 発電機と地を這う配線
      { const [tx, tz] = P(WH, new THREE.CylinderGeometry(0.75, 0.75, 2.4, 16).rotateZ(Math.PI / 2), -14.8, 1.25, 10.4); P(BL, new THREE.CylinderGeometry(0.765, 0.765, 0.3, 16).rotateZ(Math.PI / 2), -14.8, 1.25, 10.4); for (const dx of [-0.8, 0.8]) P(DK, new THREE.BoxGeometry(0.12, 0.5, 1.5), -14.8 + dx, 0.25, 10.4);
        P(DK, new THREE.CylinderGeometry(0.03, 0.03, 0.3, 6), -14.8, 0.75, 11.2, 0, Math.PI / 2); P(glow('#7fd8ff', 2), new THREE.BoxGeometry(0.5, 0.14, 0.02), -14.8, 1.5, 11.16); solid.push([tx, tz, 1.3]); } // 給水タンク
      for (const sx of [-1, 1]) {
        const tx = sx * 11.6; P(WD, new THREE.BoxGeometry(2.1, 0.06, 0.8), tx, 0.76, 15.2); for (const [dx, dz] of [[-0.95, -0.32], [0.95, -0.32], [-0.95, 0.32], [0.95, 0.32]]) P(DK, new THREE.CylinderGeometry(0.025, 0.025, 0.75, 5), tx + dx, 0.375, 15.2 + dz);
        P(CR, new THREE.BoxGeometry(0.45, 0.3, 0.35), tx - 0.6, 0.94, 15.2); P(GN, new THREE.BoxGeometry(0.3, 0.2, 0.25), tx + 0.1, 0.89, 15.15); P(WB, new THREE.CylinderGeometry(0.06, 0.07, 0.16, 8), tx + 0.75, 0.87, 15.25); P(DK, new THREE.CylinderGeometry(0.075, 0.075, 0.03, 8), tx + 0.75, 0.965, 15.25); solid.push([...W(tx, 15.2), 1.1]); // 受付の机 (物資箱・救急箱・ランタン)
        for (let k = 0; k <= 8; k++) { const t = k / 8; P(k % 2 ? LW : WB, new THREE.BoxGeometry(0.09, 0.11, 0.09), sx * (7.2 + 5.3 * t), 2.6 + 0.7 * t - 0.5 * Math.sin(Math.PI * t), 16.8 - 7.8 * t); } // テントから投光器へ渡した電球
      }
      for (let k = 0; k <= 12; k++) { const t = k / 12; P2(k % 2 ? LW : WB, new THREE.BoxGeometry(0.09, 0.11, 0.09), -7 + 14 * t, 3.25 - 0.5 * Math.sin(Math.PI * t), 21.3); } // 2 張りのテントの間 (頭上を通る)
      for (let k = 0; k < 3; k++) { const cx = -12.9 - k * 1.2; P2(DK, new THREE.BoxGeometry(0.8, 0.05, 1.95), cx, 0.36, 18.2); for (const dz of [-0.7, 0.7]) P2(DK, new THREE.BoxGeometry(0.7, 0.34, 0.04), cx, 0.17, 18.2 + dz); P2(WH, new THREE.BoxGeometry(0.74, 0.08, 1.85), cx, 0.425, 18.2); P2(k % 2 ? OR : GN, new THREE.BoxGeometry(0.76, 0.05, 1.0), cx, 0.49, 18.6); P2(WH, new THREE.BoxGeometry(0.5, 0.09, 0.3), cx, 0.5, 17.45); } // 簡易ベッド
      { P2(DK, new THREE.CylinderGeometry(0.04, 0.05, 2.2, 6), 13.2, 1.1, 20.2); for (let k = 0; k < 3; k++) P2(DK, new THREE.CylinderGeometry(0.025, 0.025, 1.2, 5), 13.2 + Math.cos(k * 2.094) * 0.35, 0.5, 20.2 + Math.sin(k * 2.094) * 0.35, 0, 0.5); P2(WH, new THREE.ConeGeometry(0.7, 0.28, 16), 13.2, 2.45, 20.2, 0.6, 1.0); P2(GX, new THREE.BoxGeometry(0.08, 0.08, 0.08), 13.2, 2.2, 20.2); solid.push([...W(13.2, 20.2), 0.5]); } // 衛星通信アンテナ
      for (const [lx, lz] of [[-10.6, 23.6], [-10.2, 23.9]]) { P2(GN, new THREE.CylinderGeometry(0.11, 0.11, 0.9, 10), lx, 0.45, lz); P2(DK, new THREE.CylinderGeometry(0.04, 0.05, 0.12, 8), lx, 0.96, lz); } // 酸素ボンベ
      for (let k = 0; k < 14; k++) { // 規制テープ (後ろ側だけ出入り口を空ける)
        const a0 = k / 14 * Math.PI * 2 + 0.2, a1 = (k + 1) / 14 * Math.PI * 2 + 0.2; if (Math.abs((a0 + a1) / 2 - Math.PI / 2) < 0.3) continue;
        const x0 = Math.cos(a0) * 24, z0 = Math.sin(a0) * 24 + 3, x1 = Math.cos(a1) * 24, z1 = Math.sin(a1) * 24 + 3; P2(OR, new THREE.BoxGeometry(0.03, 0.07, Math.hypot(x1 - x0, z1 - z0)), (x0 + x1) / 2, 0.52, (z0 + z1) / 2, Math.atan2(x1 - x0, z1 - z0));
      }
      [0x3a6ea8, 0x8a4a6a, 0x4a7a4a, 0xb89a5a, 0x5a5a66].forEach((col, k) => { // 乗り込みを待つ避難者の列 (当たり判定なし)
        const lx = -1.7 + (k % 2) * 0.25, lz = 21.6 + k * 1.05, sc = k === 3 ? 0.68 : 1, cm = mat('flat', { color: col, rough: 0.85, metal: 0 });
        P2(cm, new THREE.CapsuleGeometry(0.19 * sc, 0.62 * sc, 4, 8), lx, 1.02 * sc, lz); P2(LG, new THREE.CylinderGeometry(0.15 * sc, 0.13 * sc, 0.62 * sc, 8), lx, 0.31 * sc, lz); P2(SK, new THREE.SphereGeometry(0.125 * sc, 10, 8), lx, 1.62 * sc, lz); if (k === 1) P2(OR, new THREE.CylinderGeometry(0.24, 0.27, 0.5, 8), lx, 1.2, lz);
      });
      for (const [text, col, lx, lz] of [['救護所 FIRST AID', '#35ff8a', -6.3, 15.8], ['避難者 受付 ▶ 機内へ', '#ffb060', 2.6, 20.4], [`着陸帯 ${i + 1} ─ MYCENAE ${String(i + 1).padStart(2, '0')}`, '#9fe8ff', 6.6, 25.2]]) { // 立て看板
        const off = Math.hypot(lx, lz) > 21 ? 0.14 : 0, sg = signMesh(text, col, 0.46, { bg: '#10141a', intensity: 1.5 }), [x, z] = W(lx, lz), w = sg.userData.w || 1.6;
        sg.position.set(x, y + 0.86 - off, z); sg.rotation.set(-0.16, s.yaw, 0, 'YXZ'); near.add(sg);
        P(DK, new THREE.BoxGeometry(w + 0.1, 0.56, 0.04), lx, 0.86 - off, lz - 0.035, 0, -0.16); for (const sx of [-1, 1]) { P(DK, new THREE.BoxGeometry(0.04, 1.16, 0.04), lx + sx * (w / 2), 0.57 - off, lz - 0.02, 0, -0.16); P(DK, new THREE.BoxGeometry(0.04, 1.16, 0.04), lx + sx * (w / 2), 0.57 - off, lz - 0.34, 0, 0.3); }
      }
    } catch (err) { console.warn('[救助拠点] 細部の設置に失敗:', err); }
    const st = B.build(); near.add(st);
    // 救難ボット 2 体 (誘導役と救護役)
    const bots = [[3.4, 22.6, 0, {}], [-5.8, 15.4, Math.PI / 2, { accent: 0x2a8a5a }]].map(([lx, lz, ry, o]) => { const bg = makeBot({ pose: 'stand', ph: i * 1.7 + lx, ...o }), [x, z] = W(lx, lz); bg.position.set(x, y, z); bg.rotation.y = s.yaw + ry; botG.add(bg); solid.push([x, z, 0.4]); return { g: bg, x, z, yaw: s.yaw + ry }; });
    // 屋根の警光灯 (赤・青が交互に閃く) と、遠くからでも見える緑の光柱
    const bl = [[-0.9, '#ff2a1e'], [0.9, '#2a6cff']].map(([lx, col]) => { const sp = makeGlowSprite(col, 9, 3); const [x, z] = W(lx, -6.55); sp.position.set(x, y + 6.9, z); sp.material.fog = false; g.add(sp); return sp; });
    if (!this.beamM) this.beamM = new THREE.ShaderMaterial({ uniforms: { uCol: { value: new THREE.Color('#35ff8a').multiplyScalar(0.55) } }, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide, fog: false,
      vertexShader: 'varying vec2 vUv;varying vec3 vN,vV;void main(){vUv=uv;vec4 mv=modelViewMatrix*vec4(position,1.);vN=normalize(normalMatrix*normal);vV=normalize(-mv.xyz);gl_Position=projectionMatrix*mv;}', fragmentShader: 'uniform vec3 uCol;varying vec2 vUv;varying vec3 vN,vV;void main(){float a=pow(abs(dot(vN,vV)),2.)*pow(1.-vUv.y,1.3);gl_FragColor=vec4(uCol*a,1.);}' });
    const beam = new THREE.Mesh(new THREE.CylinderGeometry(9, 2.2, 900, 16, 1, true), this.beamM); beam.position.set(s.x, y + 458, s.z); g.add(beam);
    g.add(near, botG); this.env.group.add(g);
    return { g, near, botG, bots, bl, solid, s };
  }
  _rescueTick(dt) {
    const R = this.env?.rs; if (!R || R.n <= 0) return; const p = this.foot ? this.fp : this.ship.pos, t = this.time;
    for (let i = 0; i < R.n; i++) { const o = R.objs[i]; if (!o) continue; const d = Math.hypot(o.s.x - p.x, o.s.z - p.z), nb = d < 180; o.near.visible = d < 1500 * G.drawDist; o.botG.visible = nb;
      const k = (t * 1.5 + i * 0.37) % 1; o.bl[0].material.opacity = k < 0.22 ? 1 : 0.04; o.bl[1].material.opacity = k > 0.5 && k < 0.72 ? 1 : 0.04;
      if (nb) for (const b of o.bots) { const dx = p.x - b.x, dz = p.z - b.z; let a = Math.atan2(dx, dz) - b.yaw; a = Math.atan2(Math.sin(a), Math.cos(a)); b.g.userData.tick(dt, t, this.foot ? a : null, Math.hypot(dx, dz)); } }
  }
  _mode() {
    if (this.foot) { G.hud.setMode('fps'); G.input.setButtons([{ id: 'run', label: '走る', cls: 'sm p-run', key: 'ShiftLeft,ShiftRight' }], 'fps'); }
    else { G.hud.setMode('atmo'); G.input.setButtons([{ id: 'boost', label: 'ブースト', cls: 'p-boost', key: 'ShiftLeft,ShiftRight' }, { id: 'up', label: '▲<br>上昇', cls: 'p-up', key: 'KeyR,Space' }, { id: 'dn', label: '▼<br>下降', cls: 'p-dn', key: 'KeyF,KeyC' }, { id: 'view', label: '視点', cls: 'sm p-view', key: 'KeyV' }], 'atmo'); }
  }
  _q() { const s = this.ship; s.q.setFromEuler(_e.set(s.pitch, s.yaw, 0)); return s.q; }
  /** 地形そのものの高さ (描画メッシュと一致) */
  terrain(x, z) { const e = this.env; return (e.heightAt || e.H)(x, z); }
  /** 地面の高さ: 地形・水面・パッド・桟橋に加え、足元 (y) より上にない屋上も含む */
  ground(x, z, y = 1e9) {
    const e = this.env; let h = this.terrain(x, z); if (e.water != null) h = Math.max(h, e.water); if (Math.hypot(x, z) < PAD_R + 1.5) h = Math.max(h, e.padY);
    if (e.decks) for (const d of e.decks) if (x > d[0] && x < d[2] && z > d[1] && z < d[3] && d[4] > h) h = d[4];
    const L = this.grid.get(gk(x, z)); if (L) for (const b of L) { if (b[6] <= h || b[6] > y + 1.6) continue; const dx = x - b[0], dz = z - b[1]; if (Math.abs(dx * b[4] + dz * b[5]) < b[2] && Math.abs(-dx * b[5] + dz * b[4]) < b[3]) h = b[6]; }
    return h;
  }
  /** (x,z) を含む箱型障害物のうち最も高いもの */
  _box(x, z, pad = 0) { const L = this.grid.get(gk(x, z)); let best = null; if (L) for (const b of L) { const dx = x - b[0], dz = z - b[1]; if (Math.abs(dx * b[4] + dz * b[5]) < b[2] + pad && Math.abs(-dx * b[5] + dz * b[4]) < b[3] + pad && (!best || b[6] > best[6])) best = b; } return best; }
  /** 水面か (桟橋・屋上・パッドの上は除く) */
  wet(x, z) { const e = this.env; return e.water != null && this.ground(x, z) <= e.water + 0.01; }
  /** 地域名・BGM (地球は場所によって変わる) */
  _region() { const e = this.env, p = this.foot ? this.fp : this.ship.pos; this.reg = e.region ? e.region(p.x, p.z) : e.sub; this.place = e.place ? e.place(p.x, p.z) : e.name; const mk = !e.region || this.reg === '巨大都市' || this.reg === '郊外' ? e.music : 'surface'; if (mk !== this._mk) { this._mk = mk; G.audio?.music(mk); } }
  /** 遠方のタイルを非表示にし、カメラ周辺の植生を生成する */
  _cull(prime) {
    const e = this.env, cp = this.camera.position, k = G.drawDist;
    if (e.tiles) for (const t of e.tiles) { const dx = t.x - cp.x, dz = t.z - cp.z, R = t.r * k; t.o.visible = dx * dx + dz * dz < R * R; }
    if (e.veg) for (const v of e.veg) { if (prime) { for (let i = 0; i < 40 && v.update(cp.x, cp.z, k, 6) > 6; i++); } else v.update(cp.x, cp.z, k, 2); }
  }

  update(dt) {
    this.time += dt; const e = this.env, s = this.ship, pl = G.space.pl;
    for (const f of e.anim) f(dt, this.time, this.camera.position);
    for (const sp of this.sprites) if (sp.userData.blink) sp.material.opacity = (this.time * sp.userData.blink) % 1 < 0.15 ? 1 : 0.05;
    if (this.dead) { const s0 = this.ship; if (!this.foot && !s0.landed) { s0.speed = damp(s0.speed, 0, 0.8, dt); s0.vy = damp(s0.vy, -20, 0.8, dt); s0.pos.addScaledVector(_a.set(0, 0, -1).applyQuaternion(this._q()), s0.speed * dt); s0.pos.y = Math.max(s0.pos.y + s0.vy * dt, this.ground(s0.pos.x, s0.pos.z) + s0.clear); } } // 船体喪失: 救難艇が回収に来るまで操縦できない
    else if (this.foot) this._walk(dt); else this._fly(dt);
    this._rescueTick(dt);
    this._cam(dt);
    // 降水・降灰・砂塵
    const cv = this._cv || (this._cv = new THREE.Vector3()), cp = this.camera.position; if (this._lp) cv.copy(cp).sub(this._lp).multiplyScalar(1 / Math.max(dt, 1e-3)); else this._lp = new THREE.Vector3(); this._lp.copy(cp);
    const zr = e.zone ? e.zone(cp.x, cp.z) : e.rain; this.rainA = e.zone ? damp(this.rainA, zr[1] * smooth(2600, 1500, cp.y), 2, dt) : zr[1]; if (zr[2] !== this._rc) { this._rc = zr[2]; this.streaks.u.uCol.value.set(zr[2]); }
    this.streaks.update(dt, _a.copy(cv).sub(zr[0]), 0.02, this.rainA, 3.2);
    if (++this.tick % 4 === 0) { this._cull(); if (this.tick % 20 === 0) this._region(); }
    if (e.expo) { const t = e.expo(cp.x, cp.z); this.ex = this.ex == null ? t : damp(this.ex, t, 0.35, dt); G.gfx.fx.uExposure.value = this.ex; } // 地域に合わせて露出をなめらかに変える
    if (e.smoke && Math.random() < dt * 40) this.parts.emit(e.smoke[0] + (Math.random() - 0.5) * 200, e.smoke[1], e.smoke[2] + (Math.random() - 0.5) * 200, (Math.random() - 0.5) * 60, 120 + Math.random() * 160, (Math.random() - 0.5) * 60, 3, 0.9, 0.2, 160 + Math.random() * 200, 5, 0.25, 12);
    this.parts.update(dt, G.gfx.ph / (2 * Math.tan(this.camera.fov * Math.PI / 360))); this.debris.update(dt, 9.8, (x, z) => this.ground(x, z));
    // 光源は対象に追従
    const t = this.foot ? this.fp : s.pos; this.sun.position.copy(t).addScaledVector(e.sunDir, 600); this.sun.target.position.copy(t); e.sky.position.copy(this.camera.position);
    pl.energy = Math.min(pl.st.energy, pl.energy + pl.st.energy * 0.1 * dt);
    this._hud(dt);
  }

  // ───────────────────────── 飛行 ─────────────────────────
  _fly(dt) {
    const s = this.ship, e = this.env, inp = G.input, ax = inp.axes(), pl = G.space.pl, st = pl.st;
    if (inp.hit('view')) s.view = (s.view + 1) % 2;
    if (inp.keys.KeyZ) inp.setThr(1); if (inp.keys.KeyX) inp.setThr(0);
    const gy = this.ground(s.pos.x, s.pos.z), alt = s.pos.y - gy - s.clear; s.alt = alt;
    if (s.landed) { s.speed = 0; s.vy = 0; if (e.hazard?.(s.pos.x, s.pos.z, this.ground(s.pos.x, s.pos.z, s.pos.y - s.clear + 1))) this._hull(12 * dt, '溶岩で船体が損傷中！ 離陸せよ'); G.audio?.engine(0.05, 0, 0); for (const p of s.m.plumes) p.material.uniforms.uPow.value = 0.05; return; }
    if (s.auto) return this._auto(dt, alt);
    s.yawV = damp(s.yawV, -ax.x * st.turn * 0.62, 5, dt); s.yaw += s.yawV * dt;
    s.pitch = clamp(s.pitch + ax.y * (G.p.invertY ? -1 : 1) * 0.85 * dt, -1.15, 1.15); if (Math.abs(ax.y) < 0.05 && s.speed < 60) s.pitch = damp(s.pitch, 0, 1.5, dt);
    const boost = inp.down('boost') && pl.energy > 4; if (boost) pl.energy -= 18 * dt;
    s.speed = damp(s.speed, inp.thr * (boost ? 430 : 250), boost ? 1.6 : 1.1, dt);
    s.vy = damp(s.vy, ((inp.down('up') ? 1 : 0) - (inp.down('dn') ? 1 : 0)) * 46, 3, dt);
    // 1 フレームで細いビルを飛び越えないよう、移動を 4m 以下に刻んで建物との当たりを調べる (高速・低フレームレート時のすり抜け対策)
    const fwd = _a.set(0, 0, -1).applyQuaternion(this._q()), mv = s.speed * dt, nSub = Math.min(12, Math.max(1, Math.ceil(mv / 4))); s.pos.y += s.vy * dt;
    for (let i = 0; i < nSub; i++) { s.pos.addScaledVector(fwd, mv / nSub); if (i < nSub - 1) this._bump(fwd); }
    s.m.tilt.rotation.z = damp(s.m.tilt.rotation.z, s.yawV * 0.55, 4, dt);
    this._bump(fwd);
    const vdown = -(fwd.y * s.speed + s.vy), g2 = this.ground(s.pos.x, s.pos.z) + s.clear;
    if (e.floor != null && s.pos.y < e.floor + 60) { s.pos.y = e.floor + 60; s.vy = 20; if (!this._w1) { this._w1 = 1; G.hud.msg('雲海の下は超高圧層です。上昇してください！', 'warn'); setTimeout(() => { this._w1 = 0; }, 5000); } }
    if (s.pos.y <= g2) {
      const X = s.pos.x, Z = s.pos.z, bx = this._box(X, Z), roof = !!bx && bx[6] + s.clear >= g2 - 0.01, onPad = Math.hypot(X, Z) < PAD_R, warn = (m) => { s.vy = 8; if (!this._w2) { this._w2 = 1; G.hud.msg(m, 'warn'); setTimeout(() => { this._w2 = 0; }, 4000); } };
      const sl = roof ? 0 : Math.abs(this.terrain(X + 6, Z) - this.terrain(X - 6, Z)) / 12 + Math.abs(this.terrain(X, Z + 6) - this.terrain(X, Z - 6)) / 12;
      s.pos.y = g2;
      if (s.speed > 55 || vdown > 16) { this._hull(s.speed * 0.25 + vdown * 1.5, '激しく接地した！'); this._crash(clamp((s.speed * 0.25 + vdown * 1.5) * 0.05, 1.4, 6)); s.vy = 14; s.speed *= 0.5; s.pitch = Math.max(s.pitch, 0.12); this.shake = 1; this.parts.burst(s.pos, 40, 30, _col.set('#ffd9a0'), 1.2, 0.8); G.audio?.sfx('hit'); }
      else if (roof && bx[7]) warn('ここには着陸できません。平らな場所かパッドへ。');
      else if (!onPad && !roof && this.wet(X, Z)) warn('水上には着陸できません。陸地かパッドへ。');
      else if (!onPad && sl > 0.45) warn('傾斜がきつくて着陸できません。平らな場所かパッドへ。');
      else if (s.speed < 55) this._landed();
    }
    // 離脱
    if (s.pos.y > 5200 || Math.hypot(s.pos.x, s.pos.z) > (e.bounds || 7000)) { if (!this.leaving) { this.leaving = true; G.hud.banner('軌道へ上昇', body(e.id).name + ' を離脱', 2.5); G.audio?.sfx('warp'); G.go('space', { orbit: e.id }, { flash: true }).then(() => { this.leaving = false; }); } }
    const pw = 0.15 + inp.thr * 0.85 + (boost ? 0.7 : 0); for (const p of s.m.plumes) { p.material.uniforms.uPow.value = damp(p.material.uniforms.uPow.value, pw, 6, dt); p.scale.z = 0.25 + p.material.uniforms.uPow.value * 0.9; }
    G.audio?.engine(inp.thr, boost ? 1 : 0, 0);
  }
  _auto(dt, alt) {
    const s = this.ship, e = this.env, a = s.auto, tx = 0, tz = 0, d = Math.hypot(s.pos.x - tx, s.pos.z - tz);
    if (G.input.axes().x ** 2 + G.input.axes().y ** 2 > 0.8) { s.auto = null; G.hud.msg('オートランドを中止 — 手動操縦'); return; }
    s.pitch = damp(s.pitch, 0, 2, dt); s.m.tilt.rotation.z = damp(s.m.tilt.rotation.z, 0, 3, dt);
    if (a.ph === 0) {
      const safe = e.safeAlt ? e.padY + e.safeAlt : null, low = safe != null && d > 300 && s.pos.y < safe - 80; // 高層ビル街は安全高度まで上がってから進入する
      // 進路の先 (最大 700m) の地形と建物を先読みし、山や塔より低いうちは減速して上昇を優先する (以前は巡航高度が固定で、山腹に突っ込んでいた)
      const ux = (tx - s.pos.x) / (d || 1), uz = (tz - s.pos.z) / (d || 1); let gA = this.ground(s.pos.x, s.pos.z); for (const k of [60, 150, 300, 500, 700]) { if (k > d) break; gA = Math.max(gA, this.ground(s.pos.x + ux * k, s.pos.z + uz * k)); }
      const clearY = gA + s.clear + 35, under = s.pos.y < clearY - 8;
      const sp = Math.min(safe != null ? 230 : 150, Math.max(8, d * 0.45)) * (low ? 0 : 1) * (under ? 0.15 : 1), want = Math.atan2(s.pos.x - tx, s.pos.z - tz); let dy = want - s.yaw; dy = Math.atan2(Math.sin(dy), Math.cos(dy)); if (d > 20) s.yaw += clamp(dy, -1.2 * dt, 1.2 * dt);
      s.speed = damp(s.speed, sp, 2, dt); s.pos.x += ux * s.speed * dt; s.pos.z += uz * s.speed * dt;
      const ty = safe != null ? (d > 40 ? safe : e.padY + s.clear + 60) : e.padY + s.clear + 55 + Math.min(d * 0.25, 500); s.pos.y = damp(s.pos.y, Math.max(ty, d > 40 ? clearY : 0, this.ground(s.pos.x, s.pos.z) + s.clear + 30), under ? 2.5 : 0.9, dt);
      s.pos.y = Math.max(s.pos.y, this.ground(s.pos.x, s.pos.z, s.pos.y) + s.clear + 2); // どんな場合も地面や屋上の下には入らない
      if (d < 3) { a.ph = 1; if (s.m.gear) s.m.gear.visible = true; G.hud.msg('パッド直上 — 降下開始'); }
    } else { s.speed = 0; const g = e.padY + s.clear; s.pos.y -= Math.max(2.2, Math.min(e.safeAlt ? 60 : 16, (s.pos.y - g) * 0.45)) * dt; if (s.pos.y <= g) { s.pos.y = g; this._landed(); } }
    for (const p of s.m.plumes) p.material.uniforms.uPow.value = 0.4; G.audio?.engine(0.4, 0, 0);
  }
  _landed() {
    const s = this.ship, e = this.env; s.landed = true; s.auto = null; s.speed = 0; s.vy = 0; s.pitch = 0; G.input.setThr(0); if (s.m.gear) s.m.gear.visible = true; s.m.tilt.rotation.set(0, 0, 0); this._engines(false);
    this.parts.burst(_a.copy(s.pos).setY(s.pos.y - s.clear + 0.3), 50, 14, _col.set('#cfd8e0'), 2.2, 1.0, null, 1.2); G.audio?.sfx('land'); this.shake = 0.4;
    const first = !G.p.stats.lands[e.id]; G.p.stats.lands[e.id] = (G.p.stats.lands[e.id] || 0) + 1; G.p.day++; save();
    this._region(); G.hud.banner('着陸完了', (this.place || e.name) + (first ? ' — 初到達' : '')); if (first) { earn(1500); G.hud.msg(`探査ボーナス：${body(e.id).name} 初着陸 +1,500 Cr`, 'good', 7); }
  }
  /** 箱型障害物 (ビルなど) の側面にぶつかったら押し戻し、壁に沿って滑らせる */
  _bump(fwd) {
    const s = this.ship, L = this.grid.get(gk(s.pos.x, s.pos.z)); if (!L) return; const sr = Math.min(SHIPS[s.id].radius * 0.3, 7), bot = s.pos.y - s.clear;
    for (const b of L) {
      if (bot >= b[6] - 3) continue; const dx = s.pos.x - b[0], dz = s.pos.z - b[1]; let lx = dx * b[4] + dz * b[5], lz = -dx * b[5] + dz * b[4]; const px = b[2] + sr - Math.abs(lx), pz = b[3] + sr - Math.abs(lz); if (px <= 0 || pz <= 0) continue;
      let nx, nz; if (px < pz) { const sg = lx < 0 ? -1 : 1; lx = sg * (b[2] + sr + 0.05); nx = sg * b[4]; nz = sg * b[5]; } else { const sg = lz < 0 ? -1 : 1; lz = sg * (b[3] + sr + 0.05); nx = -sg * b[5]; nz = sg * b[4]; }
      s.pos.x = b[0] + lx * b[4] - lz * b[5]; s.pos.z = b[1] + lx * b[5] + lz * b[4];
      const vn = -(fwd.x * nx + fwd.z * nz) * s.speed; if (vn <= 0) continue;
      const k = vn / Math.max(s.speed, 1), fx = fwd.x + nx * k, fz = fwd.z + nz * k; if (Math.hypot(fx, fz) > 0.05) s.yaw = Math.atan2(-fx, -fz);
      if (vn > 14) { s.speed *= 0.45; if (this.time - (this._bt || -9) > 0.5) { this._bt = this.time; this._hull(vn * 0.3, '建造物に衝突！'); this._crash(clamp(vn * 0.03, 1.4, 6), true); this.shake = 1; this.parts.burst(s.pos, 40, 30, _col.set('#ffd9a0'), 1.2, 0.8); G.audio?.sfx('hit'); } }
    }
  }
  /** 衝撃で機体が凹む (front: 機首, それ以外: 下面) */
  _crash(R, front) { const s = this.ship, o = front ? new THREE.Vector3((Math.random() - 0.5) * 3, (Math.random() - 0.5) * 1.2, -70) : new THREE.Vector3((Math.random() - 0.5) * 2, -40, (Math.random() - 0.5) * 6), up = front ? new THREE.Vector3(0, 0, 1) : new THREE.Vector3(0, 1, 0), l = rayHit(s.m, o, up, 140, 2.6); if (!l) return; applyDamage(s.m, l, up, R, R * 0.3); logDamage(s.id, l, up, R, R * 0.3); s.m.applied++; this.debris.burst(_b.copy(l).applyMatrix4(s.m.body.matrixWorld), 10, 16, 0.2, '#c8ccd4', null, up); }
  /** 駐機中はエンジンの噴射を止める */
  _engines(on) { const m = this.ship.m; for (const p of m.plumes) { p.visible = on; if (on) p.material.uniforms.uPow.value = 0.1; } for (const g of m.glows || []) if (g.isObject3D) g.visible = on; }
  takeoff() { const s = this.ship; s.landed = false; s.vy = 16; this._engines(true); s.pos.y += 0.5; G.input.setThr(0.15); if (s.m.gear) setTimeout(() => { if (!s.landed) s.m.gear.visible = false; }, 2500); G.audio?.sfx('undock'); G.hud.msg('離陸。高度 5km を超えると軌道へ離脱します。', 'good'); }
  _hull(d, msg) { const pl = G.space.pl; pl.hull -= d; pl.lastHit = G.space.time; G.p.ships[pl.id].hull = clamp(pl.hull / pl.st.hull, 0, 1); if (msg && !this._w3) { this._w3 = 1; G.hud.msg(msg, 'warn'); setTimeout(() => { this._w3 = 0; }, 3000); }
    if (pl.hull <= 0 && !this.dead) { this.dead = true; G.hud.banner('船体喪失', '救難艇が回収中…', 4); const fee = Math.round(G.p.credits * 0.1); G.audio?.sfx('boom'); setTimeout(() => { G.p.credits -= fee; G.p.ships[pl.id].hull = 1; this.dead = false; G.space.rebuildShip(); G.go('space', { docked: G.p.last }).then(() => G.hud.msg(`ステーションで修復されました (費用 ${fee.toLocaleString()} Cr)`, 'warn', 8)); }, 3000); } }

  // ───────────────────────── 徒歩 ─────────────────────────
  ok(x, z, y = this.fp.y) {
    const e = this.env, s = this.ship; if (Math.hypot(x, z) > e.walkR) return false;
    for (const c of e.cols) { const dx = x - c.x, dz = z - c.z, r = c.r + 0.4; if (dx * dx + dz * dz < r * r) return false; }
    for (const q of e.rects) if (x > q[0] - 0.4 && x < q[2] + 0.4 && z > q[1] - 0.4 && z < q[3] + 0.4) return false;
    const sr = Math.min(SHIPS[s.id].radius * 0.4, 8); if ((x - s.pos.x) ** 2 + (z - s.pos.z) ** 2 < sr * sr) return false;
    const L = this.grid.get(gk(x, z)); if (L) for (const b of L) { if (b[6] <= y + (b[7] ? 0.5 : 1.6)) continue; const dx = x - b[0], dz = z - b[1]; if (Math.abs(dx * b[4] + dz * b[5]) < b[2] + 0.4 && Math.abs(-dx * b[5] + dz * b[4]) < b[3] + 0.4) return false; }
    const g = this.ground(x, z, y); if (g < y - 3.2) return false; // 屋上や桟橋の縁からは落ちない
    if (e.water != null && g <= e.water + 0.01 && this.terrain(x, z) < e.water - 0.35 && Math.hypot(x, z) > PAD_R) return false;
    if (e.veg) for (const v of e.veg) if (v.solid && v.hit(x, z)) return false; // 木の幹・岩
    return true;
  }
  /** 船のそばで立てる場所を探し、徒歩の開始位置にする */
  _disembark() {
    const s = this.ship, y = s.pos.y - s.clear, r0 = Math.min(SHIPS[s.id].radius * 0.6 + 5, 22); // 機体の下ではなく、少し離れた場所に降り立つ
    for (let d = r0; d < r0 + 48; d += 2.4) for (let k = 0; k < 17; k++) { const a = (k % 2 ? -1 : 1) * Math.ceil(k / 2) * 0.39, x = s.pos.x + Math.sin(a) * d, z = s.pos.z + Math.cos(a) * d; if (!this.ok(x, z, y) || Math.abs(this.ground(x, z, y) - y) > 2.6) continue; this.fp.set(x, this.ground(x, z, y), z); this.fyaw = a; this.fpitch = 0; return true; }
    G.hud.msg('周囲に降りられる場所がない。別の場所に着陸しよう。', 'warn'); return false;
  }
  _walk(dt) {
    const inp = G.input, ax = inp.axes(), p = this.fp, e = this.env;
    this.fyaw -= inp.look.x * 0.0052; this.fpitch = clamp(this.fpitch - inp.look.y * 0.0052, -1.3, 1.3); if (inp.keys.KeyQ) this.fyaw += dt * 2;
    const sp = inp.down('run') ? 9.5 : 5.2, sn = Math.sin(this.fyaw), cs = Math.cos(this.fyaw), dx = (-sn * ax.y + cs * ax.x) * sp * dt, dz = (-cs * ax.y - sn * ax.x) * sp * dt;
    if (dx || dz) { if (this.ok(p.x + dx, p.z + dz, p.y)) { p.x += dx; p.z += dz; } else if (this.ok(p.x + dx, p.z, p.y)) p.x += dx; else if (this.ok(p.x, p.z + dz, p.y)) p.z += dz; else if (Math.hypot(p.x + dx, p.z + dz) > e.walkR && !this._w4) { this._w4 = 1; G.hud.msg('これ以上先は危険だ。船に戻ろう。', 'warn'); setTimeout(() => { this._w4 = 0; }, 5000); }
      const pb = this.bob; this.bob += Math.hypot(dx, dz) * 1.7; if (Math.floor(pb / Math.PI) !== Math.floor(this.bob / Math.PI)) G.audio?.sfx('step'); }
    p.y = damp(p.y, this.ground(p.x, p.z, p.y), 14, dt);
    if (e.hazard?.(p.x, p.z, this.ground(p.x, p.z, p.y))) /* 実際に立っている面 (台地・桟橋・パッドを含む) で判定 */ { G.p.hp -= 25 * dt; if (!this._w5) { this._w5 = 1; G.hud.msg('熱い！ 溶岩から離れろ！', 'warn'); G.audio?.sfx('hurt'); setTimeout(() => { this._w5 = 0; }, 2000); } if (G.p.hp <= 0) { G.p.hp = 50; this._disembark(); G.hud.msg('危ないところで船の近くへ退避した。', 'warn'); } }
    // インタラクション
    const s = this.ship, fx = -sn, fz = -cs; let best = null, bs = 1e9;
    const cand = [...e.items, { x: s.pos.x, z: s.pos.z, r: Math.min(SHIPS[s.id].radius * 0.4, 8) + 5, label: `${SHIPS[s.id].name} に乗る`, act: 'board', wide: 1 }];
    e.nodes.forEach((n, i) => { if (n.g.visible) cand.push({ x: n.x, z: n.z, r: 3.6, label: n.label, act: 'node', n, i }); });
    for (const i of cand) { const ddx = i.x - p.x, ddz = i.z - p.z, d = Math.hypot(ddx, ddz); if (d > i.r) continue; const dot = (ddx * fx + ddz * fz) / (d || 1); if (dot < (i.wide ? -0.3 : 0.2) && d > 1.5) continue; if (d < bs) { bs = d; best = i; } }
    G.hud.setCtx(best && !G.ui.isOpen ? [{ label: best.label, cls: best.act === 'node' ? '' : 'alt', fn: () => this.act(best) }] : []);
    if (best && (inp.key('KeyE') || inp.key('Enter'))) this.act(best);
  }
  act(i) {
    const e = this.env;
    if (i.act === 'outpost') return G.go('interior', { type: 'outpost', body: e.id });
    if (i.act === 'rescue') return G.ui.talk(`救助船 ミケーネ ${i.idx + 1} 号機`, '緊急着陸帯に降りた救助船。後部ランプが下り、救難ボットが避難してきた人々を機内へ誘導している。', [{ label: '機内に入る', cls: 'gold', fn: () => G.go('interior', { type: 'rescue', from: 'surface', idx: i.idx, back: [this.fp.x, this.fp.z, this.fyaw] }) }, { label: 'やめる' }]);
    if (i.act === 'rest') return G.ui.talk('雪見の里', '丸太小屋に囲まれた広場で、焚き火がぱちぱちと音を立てている。村人が温かいスープを差し出してくれた。', [{ label: '焚き火で暖まる (体力全快)', cls: 'gold', fn: () => { G.p.hp = 100; G.audio?.sfx('pickup'); G.hud.msg('体が芯から温まった。体力が全快した。', 'good'); save(); } }, { label: '立ち去る' }]);
    if (i.act === 'ruins') { const first = !G.p.flags.ruins, fresh = G.p.flags.ruinsDay !== G.p.day;
      return G.ui.talk('古代遺跡', first ? '苔むした石段の先で、翠色の紋様が脈打つように光っている。壁一面に、見たことのない星図が刻まれていた…。' : '翠色の紋様は今も静かに脈打っている。星図の刻印にはまだ読み解けていない部分がある。', [{ label: first ? '星図を記録する' : '刻印を調べる', cls: 'gold', fn: () => {
        if (!first && !fresh) return G.hud.msg('今日はもう新しい発見はなさそうだ。', 'warn');
        const n = addCargo('data', first ? 2 : 1); G.p.flags.ruins = 1; G.p.flags.ruinsDay = G.p.day; if (first) earn(3000); G.audio?.sfx('pickup'); event('sample', { body: e.id }); save();
        G.hud.msg(first ? `古代の星図を記録した！ 探査データ ×${n} / 発見ボーナス +3,000 Cr` : n ? '刻印の一部を解読した。探査データ ×1' : '解読できたが、貨物室がいっぱいでデータを持ち帰れない。', 'good', 7); } }, { label: '立ち去る' }]); }
    if (i.act === 'board') return G.ui.talk(SHIPS[this.ship.id].name, '着陸中の自機。', [{ label: '船内に入る', fn: () => G.go('interior', { type: 'ship', from: 'surface', body: e.id, via: 'airlock' }) }, { label: '操縦席へ', cls: 'gold', fn: () => { this.foot = false; this._mode(); this._cam(0, true); } }, { label: 'やめる' }]);
    if (i.act === 'node') {
      const n = addCargo(i.n.item, 1); if (!n) return G.hud.msg('貨物室がいっぱいで積めません', 'warn');
      i.n.g.visible = false; G.p.flags[`n_${e.id}_${i.i}`] = G.p.day; G.audio?.sfx('pickup'); this.parts.burst(_a.set(i.x, this.ground(i.x, i.z) + 1, i.z), 40, 6, _col.set('#ffffff'), 0.4, 0.9, null, 1);
      G.hud.msg(`${commodity(i.n.item).name} ×1 を採取した`, 'good'); event('sample', { body: e.id }); save();
    }
  }

  _cam(dt, snap) {
    const c = this.camera, s = this.ship, e = this.env;
    if (this.foot) { c.position.set(this.fp.x, this.fp.y + 1.68 + Math.sin(this.bob * 2) * 0.03, this.fp.z); c.rotation.set(this.fpitch, this.fyaw, 0, 'YXZ'); c.fov = 70; c.near = 0.22; if (G.hud.cockpit.style.display !== 'none') G.hud.cockpit.style.display = 'none'; }
    else {
      s.m.obj.position.copy(s.pos); s.m.obj.quaternion.copy(this._q()); c.near = s.view === 1 && !s.landed ? 1.2 : clamp(s.m.cam.d * 0.08, 0.5, 2.2); // 近クリップを遠ざけて遠景の深度精度を稼ぐ
      const ck = s.view === 1 && !s.landed ? 'block' : 'none'; if (G.hud.cockpit.style.display !== ck) G.hud.cockpit.style.display = ck; // 操縦席視点ではコックピットの枠を出す (宇宙と同じ)
      if (snap) s.camQ.copy(s.q); else s.camQ.slerp(s.q, 1 - Math.exp(-4 * dt));
      if (s.view === 1 && !s.landed) { c.position.copy(s.m.cockpit).applyQuaternion(s.q).add(s.pos); c.quaternion.copy(s.q); s.m.body.visible = false; }
      else { s.m.body.visible = true; const k = clamp(s.speed / 430, 0, 1), d = s.m.cam.d * (s.landed ? 1.25 : 1 + k * 0.2); c.position.set(0, s.m.cam.h * (s.landed ? 0.75 : 1), d).applyQuaternion(s.camQ).add(s.pos); c.quaternion.copy(s.camQ); c.rotateX(-0.07);
        const gy = this.ground(c.position.x, c.position.z) + 1.5; if (c.position.y < gy) c.position.y = gy;
        // 機体とカメラの間に建物があれば、カメラを建物の手前まで寄せる
        if (this.grid.size) { const sx = s.pos.x, sy = s.pos.y, sz = s.pos.z, dx = c.position.x - sx, dy = c.position.y - sy, dz = c.position.z - sz; let tmin = 1;
          for (let i = 1; i <= 12; i++) { const t = i / 12, x = sx + dx * t, y = sy + dy * t, z = sz + dz * t, b = this._box(x, z, 1.2); if (b && y < b[6] + 1) { tmin = Math.max(0.12, (i - 1) / 12); break; } }
          if (tmin < 1) c.position.set(sx + dx * tmin, Math.max(sy + dy * tmin, this.ground(sx + dx * tmin, sz + dz * tmin) + 1.5), sz + dz * tmin); } }
      c.fov = damp(c.fov, 64 + clamp(s.speed / 430, 0, 1) * 12, 4, dt || 1);
    }
    if (this.shake > 0.01) { this.shake *= Math.exp(-4 * (dt || 0.016)); c.position.x += (Math.random() - 0.5) * this.shake; c.position.y += (Math.random() - 0.5) * this.shake; }
    c.updateProjectionMatrix(); c.updateMatrixWorld();
    // 太陽の画面位置 (光条用)
    _a.copy(c.position).addScaledVector(e.sunDir, 5000).project(c); const u = G.gfx.fx.uSun.value; u.set(_a.x, _a.y, _a.z < 1 && Math.abs(_a.x) < 1.5 && Math.abs(_a.y) < 1.5 ? 1 : 0);
  }
  _hud(dt = 0) {
    const h = G.hud, s = this.ship, e = this.env, pl = G.space.pl, c = this.camera;
    h.begin(); h.setLoc(this.place || e.name, `${body(e.id).name} — ${this.reg || e.sub}`);
    const ms = G.p.missions.find((m) => m.type === 'survey' && m.body === e.id) || G.p.missions[0];
    h.setObj(`<b>ヴォイド艦隊</b> 残存 ${remaining()}/20${ms ? `<br>任務：${ms.title} (${ms.prog}/${ms.need})` : ''}`);
    if (this.foot) {
      h.bar('sh', 1); h.bar('hull', G.p.hp / 100); h.damage(G.p.hp < 35 ? 0.4 : 0); G.p.hp = Math.min(100, G.p.hp + HEAL * dt); // 毎秒の回復量 (フレームレートに依存しない)
      const sp = _a.copy(s.pos); let [x, y, f] = h.project(sp, c); h.marker(x, y, f, '#6fe8ff', SHIPS[s.id].name, fmtDist(Math.hypot(s.pos.x - this.fp.x, s.pos.z - this.fp.z)), 'diamond', 1.4);
      for (const it of e.items) { if (Math.hypot(it.x - this.fp.x, it.z - this.fp.z) > (it.near || 3500)) continue; const p = _b.set(it.x, this.ground(it.x, it.z) + 3, it.z); [x, y, f] = h.project(p, c); h.marker(x, y, f, '#ffd27a', it.name || BASES[e.id].name, fmtDist(Math.hypot(it.x - this.fp.x, it.z - this.fp.z)), 'diamond', 1.2); }
      for (const n of e.nodes) { if (!n.g.visible) continue; const d = Math.hypot(n.x - this.fp.x, n.z - this.fp.z); if (d > 420) continue; [x, y, f] = h.project(_b.set(n.x, this.ground(n.x, n.z) + 2.4, n.z), c); if (f) h.marker(x, y, f, '#6dffb0', d < 60 ? '資源' : '', fmtDist(d), 'circle', 0.9); }
      return;
    }
    h.bar('sh', pl.shield / pl.st.shield); h.bar('hull', pl.hull / pl.st.hull); h.bar('en', pl.energy / pl.st.energy); h.damage(pl.hull < pl.st.hull * 0.3 ? 0.4 : 0);
    h.setSpeed(`${Math.round(s.speed)} m/s`, s.landed ? 'LANDED' : s.auto ? 'AUTO LAND' : `高度 ${Math.max(0, s.alt || 0).toFixed(0)} m`);
    const pd = Math.hypot(s.pos.x, s.pos.z, s.pos.y - e.padY); let [x, y, f] = h.project(_a.set(0, e.padY + 2, 0), c);
    if (!s.landed && e.pois) for (const q of e.pois) { const [px, py, pf] = h.project(_b.set(q.x, q.y, q.z), c); if (pf) h.marker(px, py, pf, '#9fd0ff', q.name, fmtDist(Math.hypot(q.x - s.pos.x, q.z - s.pos.z)), 'circle', 1.0); }
    if (!s.landed && e.rs && e.rs.n > 0) for (let i = 0; i < e.rs.n; i++) { const q = e.rescueSites[i], d = Math.hypot(q.x - s.pos.x, q.z - s.pos.z); if (d > 3000) continue; const [px, py, pf] = h.project(_b.set(q.x, q.y + 12, q.z), c); if (pf) h.marker(px, py, pf, '#35ff8a', `ミケーネ ${String(i + 1).padStart(2, '0')}`, fmtDist(d), 'circle', 1.0); }
    if (!s.landed) { h.marker(x, y, f, '#ffd27a', '着陸パッド', fmtDist(pd), 'diamond', 1.8); if (s.view === 0) { [x, y, f] = h.project(_b.set(0, 0, -1).applyQuaternion(s.q).multiplyScalar(800).add(s.pos), c); if (f) h.reticle(x, y, '#6fe8ff', 0.8); } }
    if (s.pos.y > 3800 && !s.landed) h.text(`軌道離脱まで ${(5200 - s.pos.y).toFixed(0)} m`, G.W / 2, G.H * 0.26, '#8cf', 2.6, true);
    const L = [];
    if (this.dead) return h.setCtx(L); // 回収待ちの間は離陸・降機・船内移動をさせない
    if (s.landed) L.push({ label: '降りる', fn: () => { if (this._disembark()) { this.foot = true; this._mode(); } } }, { label: '船内へ', cls: 'alt', fn: () => G.go('interior', { type: 'ship', from: 'surface', body: e.id }) }, { label: '離陸', cls: 'bad', fn: () => this.takeoff() });
    else if (s.auto) L.push({ label: '中止', cls: 'bad', fn: () => { s.auto = null; } });
    else if (Math.hypot(s.pos.x, s.pos.z) < (e.safeAlt ? 6500 : 2600) && s.pos.y < (e.safeAlt ? 3200 : 2200)) L.push({ label: 'オートランド', fn: () => { s.auto = { ph: 0 }; G.audio?.sfx('nav'); G.hud.msg(`${e.name} 管制：着陸を許可。自動誘導を開始します。`, 'comm'); } });
    h.setCtx(L); if (L.length && G.input.key('Enter')) L[0].fn(); // PC: Enter で先頭の状況ボタン (オートランド・降りる など) を押す
  }
  render(dt) {
    const e = this.env, cp = this.camera.position; if (!e) return G.gfx.render(dt, this.scene, this.camera, null); // 地表の生成が終わるまでは空のシーンを描く
    if (e.mirror && (!e.mirrorOn || e.mirrorOn(cp.x, cp.y, cp.z))) this.mirror.render(this.scene, this.camera); else this.mirror.u.uMirrorOn.value = 0; // 路面が見えない場所では反射を描かない
    G.gfx.render(dt, this.scene, this.camera, null);
  }
}
const HEAL = 1.2; // 徒歩中の自然回復 (体力/秒)
