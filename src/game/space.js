// 宇宙モード: 操縦 / 戦闘 / 敵 AI / ドッキング / 超巡航 / 大気圏突入
import * as THREE from 'three';
import { G, clamp, damp, lerp, smooth, fmtDist, fmtSpeed, rng, rr } from '../core/util.js';
import { BODIES, STATIONS, ENEMIES } from '../world/defs.js';
import { buildShip, buildEnemy } from '../world/ships.js';
import { buildStation, stationSDF } from '../world/stations.js';
import { enableDamage, rayHit, applyDamage, logDamage, clearDamage, syncDamage, Debris } from '../gfx/damage.js';
import { Particles, Bolts, Shocks, ShieldFX, Streaks, makeGlowSprite } from '../gfx/fx.js';
import { rockGeo } from '../gfx/builder.js';
import { mat } from '../gfx/textures.js';
import { stats, save, earn, addCargo, event, remaining } from './state.js';

const V = (x = 0, y = 0, z = 0) => new THREE.Vector3(x, y, z);
const _a = V(), _b = V(), _c = V(), _d = V(), _q = new THREE.Quaternion(), _q2 = new THREE.Quaternion(), _m = new THREE.Matrix4(), _e = new THREE.Euler();
const FWD = V(0, 0, -1), UP = V(0, 1, 0), ZUP = V(0, 0, 1), C = (c) => new THREE.Color(c), _hp = V(), _hd = V(), _w1 = V(), _w2 = V(), _w3 = V();
const WHITE = C('#fff'), ORANGE = C('#ffb060'), SPARK = C('#ffd9a0');

export class SpaceMode {
  constructor() {
    const s = (this.scene = new THREE.Scene()); s.environment = G.env; s.environmentIntensity = 1.0;
    this.camera = new THREE.PerspectiveCamera(62, G.W / G.H, 0.3, 9e4);
    this.sun = new THREE.DirectionalLight(0xfff2dc, 4.4); s.add(this.sun, this.sun.target); this._shadow();
    this.shine = new THREE.DirectionalLight(0x6699ff, 0); s.add(this.shine, this.shine.target);
    s.add((this.amb = new THREE.HemisphereLight(0x3d4c62, 0x0c0e14, 0.55)));
    this.origin = V();
    this.parts = new Particles(3500); this.bolts = new Bolts(360); this.shocks = new Shocks(12); this.shield = new ShieldFX(8); this.streaks = new Streaks(800, 700);
    this.debris = new Debris(260);
    s.add(this.parts.obj, this.bolts.obj, this.shocks.obj, this.shield.obj, this.streaks.obj, this.debris.obj);
    this.flash = new THREE.PointLight(0xffb060, 0, 600, 1.6); s.add(this.flash);
    this.bodies = BODIES.filter((b) => b.type !== 'sun').map((b) => ({ def: b, uni: V(...b.pos), R: b.R }));
    this.stations = STATIONS.map((def) => ({ def, uni: V(...def.pos), m: null, kind: 'station' }));
    this.enemies = ENEMIES.map((def) => ({ def, kind: 'enemy', uni: V(...def.pos), anchor: V(...def.pos), quat: new THREE.Quaternion(), vel: V(), m: null, state: 'idle', hull: def.hull, maxHull: def.hull, shield: def.shield, maxShield: def.shield,
      fireT: 2, burst: 0, breakT: 0, breakDir: V(), gi: 0, ph: def.idx * 1.7, dis: 90, lastHit: -99, dist: 1e9 }));
    this.missiles = []; this.misPool = [];
    for (let i = 0; i < 8; i++) { const g = new THREE.Group(), b = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.22, 2.4, 8).rotateX(Math.PI / 2), mat('hull', { color: 0xdddddd, metal: 0.3, rough: 0.6 })); const gs = makeGlowSprite('#ffb060', 5, 4); gs.position.set(0, 0, 1.6); g.add(b, gs); g.visible = false; s.add(g); this.misPool.push(g); }
    this.pl = { m: null, id: null, vel: V(), av: V(), thr: 0.5, sc: { on: false, speed: 0, charge: 0 }, auto: null, docked: null, gi: 0, fireT: 0, lastHit: -99, view: 0, camQ: new THREE.Quaternion(), target: null, misT: 0, shake: 0 };
    this.nav = null; this.time = 0; this.title = false; this.heat = 0; this.warp = 0; this.said = {};
    this._asteroids();
  }
  _asteroids() {
    const st = this.stations.find((x) => x.def.id === 'rogue'), r = rng(808), n = 260;
    const im = new THREE.InstancedMesh(rockGeo(1, 2, 3, 0.4), mat('rock', { color: 0x6a5648, metal: 0.05, uvs: 0, ns: 1.4 }), n), o = new THREE.Object3D();
    for (let i = 0; i < n; i++) {
      const a = r() * 6.283, d = rr(r, 900, 5200), s = Math.pow(r(), 2.5) * 46 + 4;
      o.position.set(Math.cos(a) * d, rr(r, -700, 700), Math.sin(a) * d); o.rotation.set(r() * 6, r() * 6, r() * 6); o.scale.set(s, s * rr(r, 0.6, 1), s * rr(r, 0.7, 1.1)); o.updateMatrix(); im.setMatrixAt(i, o.matrix); (this.rockList || (this.rockList = [])).push([o.position.x, o.position.y, o.position.z, s * 0.82]);
    }
    im.frustumCulled = false; im.castShadow = im.receiveShadow = false; this.rocks = new THREE.Group(); this.rocks.add(im); this.rocksAt = st; this.scene.add(this.rocks);
  }
  /** 画質設定の影を反映する (設定画面で画質を変えたときにも呼ばれる) */
  _shadow() {
    const q = G.gfx.q.shadow, l = this.sun; l.castShadow = q > 0; if (!q) return;
    const sh = l.shadow; if (sh.mapSize.x !== q) { sh.mapSize.setScalar(q); sh.map?.dispose(); sh.map = null; }
    sh.bias = -0.0005; sh.normalBias = 0.06; sh.camera.near = 20; sh.camera.far = 700; sh.camera.updateProjectionMatrix();
  }
  onQuality() { this._shadow(); }
  station(id) { return this.stations.find((s) => s.def.id === id); }
  buildStations(onStep) { for (const s of this.stations) if (!s.m) { s.m = buildStation(s.def); s.m.obj.visible = false; this.scene.add(s.m.obj); onStep?.(); return true; } return false; }

  setShip(id) {
    const p = this.pl; if (p.id === id && p.m) return;
    const old = p.m, pos = old ? old.obj.position.clone() : V(), quat = old ? old.obj.quaternion.clone() : new THREE.Quaternion();
    if (old) this.scene.remove(old.obj);
    p.m = buildShip(id); syncDamage(p.m, id); p.id = id; p.pos = p.m.obj.position.copy(pos); p.quat = p.m.obj.quaternion.copy(quat); this.scene.add(p.m.obj);
    p.st = stats(id); p.hull = p.st.hull * G.p.ships[id].hull; p.shield = p.st.shield; p.energy = p.st.energy; p.missiles = p.st.missiles;
    const r = p.st.radius * 1.5, sc = this.sun.shadow.camera; sc.left = -r; sc.right = r; sc.top = r; sc.bottom = -r; sc.updateProjectionMatrix();
  }
  /** 修理後: 傷のない新しいモデルに作り直す */
  rebuildShip() { const p = this.pl, id = p.id, pos = p.pos.clone(), q = p.quat.clone(), gear = p.m.gear?.visible; clearDamage(id); this.scene.remove(p.m.obj); p.m = null; p.id = null; this.setShip(id); p.pos.copy(pos); p.quat.copy(q); if (p.m.gear) p.m.gear.visible = !!gear; G.modes.interior?.dropShip?.(id); G.modes.surface?.dropShip?.(id); }
  refit() { const p = this.pl; p.st = stats(p.id); p.hull = p.st.hull * G.p.ships[p.id].hull; p.shield = p.st.shield; p.energy = p.st.energy; p.missiles = p.st.missiles; }
  uni(pos, out = V()) { return out.copy(pos).add(this.origin); }
  /** ドッキングポートのシーン座標と外向き方向 */
  portOf(t, P = _a, D = _b) {
    const o = t.m.obj; o.updateMatrixWorld();
    const pt = t.kind === 'station' ? t.m.ports[0] : t.m.port;
    P.copy(pt.p).applyMatrix4(o.matrixWorld); D.copy(pt.dir).transformDirection(o.matrixWorld);
    return [P, D];
  }
  placeDocked(t) {
    const p = this.pl; this._sync(t);
    const [P, D] = this.portOf(t), len = p.st.len / 2 + 3;
    p.pos.copy(P).addScaledVector(D, len); _c.copy(p.pos).sub(D);
    _m.lookAt(p.pos, _c, Math.abs(D.y) > 0.9 ? _d.set(0, 0, 1) : UP); p.quat.setFromRotationMatrix(_m);
    p.vel.set(0, 0, 0); p.av.set(0, 0, 0); p.docked = t; p.auto = null; p.sc.on = false; p.sc.speed = 0; p.sc.charge = 0; p.thr = 0; G.input.setThr(0); p.camQ.copy(p.quat);
  }
  _sync(e) { if (e.kind === 'enemy') this._ensure(e); e.m.obj.position.subVectors(e.uni, this.origin); if (e.kind === 'enemy') e.m.obj.quaternion.copy(e.quat); e.m.obj.updateMatrixWorld(true); }
  _ensure(e) { if (!e.m) { e.m = enableDamage(buildEnemy(e.def)); this.scene.add(e.m.obj); if (!e.quat.lengthSq()) e.quat.identity(); } }

  enter(o = {}) {
    const p = this.pl; this.title = !!o.title;
    for (const e of this.enemies) if (G.p.done[e.def.id] && e.state !== 'gone' && !e.fate) { e.state = 'gone'; if (e.m) e.m.obj.visible = false; }
    if (!o.resume) {
      const mis = o.orbit ? p.missiles : null; // 惑星から軌道へ戻るときは残弾を引き継ぐ (補給はステーションで)
      this.setShip(G.p.ship); this.refit(); syncDamage(p.m, p.id); if (mis != null) p.missiles = Math.min(mis, p.st.missiles);
      this.bolts.clear(); this.parts.clear(); p.auto = null; p.docked = null; p.dead = false; p.target = null; p.sc.on = false; p.sc.speed = 0; p.sc.charge = 0;
      this.heat = 0; this.warp = 0; // 大気圏突入時の熱を持ち越さない (軌道に戻った直後に「⚠ 大気圏突入」と熱のゆらぎが出ていた)
      if (o.docked || o.undock) {
        const t = this.station(o.docked || o.undock); this.origin.copy(t.uni); p.pos.set(0, 0, 0); this.placeDocked(t);
        if (o.undock) this.undock();
      } else if (o.board) {
        const t = this.enemies.find((e) => e.def.id === o.board); this.origin.copy(t.uni); this.placeDocked(t);
      } else if (o.orbit) {
        const b = this.bodies.find((x) => x.def.id === o.orbit), st = this.stations.find((x) => x.def.body === o.orbit);
        const dir = _a.copy(st.uni).sub(b.uni).normalize(); this.origin.copy(b.uni).addScaledVector(dir, b.R + b.def.atmoAlt * 3.2);
        p.pos.set(0, 0, 0); _c.copy(st.uni).sub(this.origin); _m.lookAt(p.pos, _c, dir); p.quat.setFromRotationMatrix(_m);
        p.vel.copy(FWD).applyQuaternion(p.quat).multiplyScalar(180); p.thr = 0.5; G.input.setThr(0.5); p.camQ.copy(p.quat);
      } else {
        const t = this.station(o.near || G.p.last || 'haven'); this.origin.copy(t.uni); this._sync(t);
        const [P, D] = this.portOf(t); p.pos.copy(P).addScaledVector(D, 1500).addScaledVector(_c.set(D.y, D.z, D.x), 420);
        _m.lookAt(p.pos, P, UP); p.quat.setFromRotationMatrix(_m); p.vel.copy(FWD).applyQuaternion(p.quat).multiplyScalar(60); p.thr = 0.3; G.input.setThr(0.3); p.camQ.copy(p.quat);
      }
    }
    if (o.resume) syncDamage(p.m, p.id);
    if (G.rescueLaunch) { G.rescueLaunch = false; this.rescueT0 = this.time + 2.5; } // アトラスから救助船が順に発進する
    this.camera.aspect = G.W / G.H; this.camera.updateProjectionMatrix();
    G.hud.setMode(this.title ? 'title' : 'space'); G.hud.show(!this.title); G.gfx.look(0.62, 1.0, 1); G.gfx.fx.uFlare.value = 1;
    this._buttons(); this._cam(1, true);
    G.audio?.music('space');
  }
  exit() { G.gfx.fx.uWarp.value = 0; G.gfx.fx.uHeat.value = 0; G.hud.damage(0); G.audio?.engine(0, 0, 0); }
  _buttons() {
    if (this.title) return G.input.setButtons([], 'none');
    G.input.setButtons([
      { id: 'fire', label: '発射', cls: 'big p-fire', key: 'Space' }, { id: 'mis', label: 'ミサイル', cls: 'p-mis', key: 'KeyF' }, { id: 'boost', label: 'ブースト', cls: 'p-boost', key: 'ShiftLeft,ShiftRight' },
      { id: 'tgt', label: '照準<br>切替', cls: 'sm p-tgt', key: 'KeyT' }, { id: 'rl', label: '⟲', cls: 'sm p-rl', key: 'KeyQ' }, { id: 'rr', label: '⟳', cls: 'sm p-rr', key: 'KeyE' },
      { id: 'sc', label: '超巡航', cls: 'sm p-sc', key: 'KeyJ' }, { id: 'ap', label: '自動<br>航行', cls: 'sm p-ap', key: 'KeyG' }, { id: 'view', label: '視点', cls: 'sm p-view', key: 'KeyV' },
    ], 'flight');
  }

  // ───────────────────────── 更新 ─────────────────────────
  update(dt) {
    this.time += dt; const p = this.pl, inp = G.input;
    if (this.title) { this._title(dt); return; }
    if (inp.hit('tgt')) this.cycleTarget();
    if (inp.hit('view')) p.view = (p.view + 1) % 2; // コックピットの枠は _cam で実際の視点に合わせて出し入れする
    if (inp.hit('sc')) this.toggleSC();
    if (inp.hit('ap')) this.toggleAP();
    if (inp.key('KeyX')) inp.setThr(0); if (inp.key('KeyZ')) inp.setThr(1);
    if (inp.keys.KeyR) inp.setThr(clamp(inp.thr + dt * 0.7, 0, 1)); if (inp.keys.KeyC) inp.setThr(clamp(inp.thr - dt * 0.7, 0, 1));
    if (!p.dead) {
      if (p.docked) this._dockedUpdate(dt);
      else if (p.auto?.type === 'dock') this._autoDock(dt);
      else if (p.auto?.type === 'push') this._push(dt);
      else this._fly(dt);
    }
    // 浮動原点の再設定
    if (p.pos.lengthSq() > 4e6 || p.sc.on) this._rebase();
    this._world(dt); this._enemies(dt); this._combat(dt); this._collide(); this._cam(dt);
    this._fx(dt); this._hud(); this._context();
    // 回復
    if (this.time - p.lastHit > 4 && !p.dead) p.shield = Math.min(p.st.shield, p.shield + p.st.shield * 0.09 * dt);
    p.energy = Math.min(p.st.energy, p.energy + p.st.energy * 0.11 * dt);
  }
  _rebase() {
    const d = _d.copy(this.pl.pos); this.origin.add(d); this.pl.pos.set(0, 0, 0); this.camera.position.sub(d);
    this.parts.shift(d); this.bolts.shift(d); this.shocks.shift(d); this.debris.shift(d); for (const m of this.missiles) m.g.position.sub(d);
  }
  _title(dt) {
    const p = this.pl, t = this.time * 0.12; p.thr = 0.35;
    this._world(dt);
    const d = p.m.cam.d * 0.95; this.camera.position.set(p.pos.x + Math.cos(t) * d, p.pos.y + d * 0.28 + Math.sin(t * 0.7) * d * 0.1, p.pos.z + Math.sin(t) * d);
    this.camera.lookAt(p.pos); this.camera.fov = 50; this.camera.updateProjectionMatrix(); this.camera.updateMatrixWorld();
    this._backdrop(dt); this._fx(dt); G.hud.begin();
  }

  _fly(dt) {
    const p = this.pl, st = p.st, inp = G.input, ax = inp.axes();
    let pitch = ax.y * (G.p.invertY ? -1 : 1), yaw = -ax.x, roll = (inp.down('rr') ? 1 : 0) - (inp.down('rl') ? 1 : 0);
    const fwd = _a.copy(FWD).applyQuaternion(p.quat);
    if (p.auto?.type === 'nav') {
      const r = this._navSteer(fwd); if (r) { pitch = r[0]; yaw = r[1]; roll = 0; }
      if (Math.abs(ax.x) + Math.abs(ax.y) > 0.5) { p.auto = null; G.hud.msg('自動航行を解除'); }
    }
    const boost = inp.down('boost') && p.energy > 4 && !p.sc.on;
    const turn = st.turn * (p.sc.on ? 0.5 : boost ? 0.7 : 1);
    p.av.x = damp(p.av.x, pitch * turn, 7, dt); p.av.y = damp(p.av.y, yaw * turn, 7, dt); p.av.z = damp(p.av.z, -roll * turn * 1.5, 7, dt);
    _q.setFromEuler(_e.set(p.av.x * dt, p.av.y * dt, p.av.z * dt)); p.quat.multiply(_q).normalize();
    p.m.tilt.rotation.z = damp(p.m.tilt.rotation.z, p.av.y * 0.32, 5, dt); p.m.tilt.rotation.x = damp(p.m.tilt.rotation.x, p.av.x * 0.08, 5, dt);
    p.thr = inp.thr; fwd.copy(FWD).applyQuaternion(p.quat);
    // 最寄り天体までの高度
    const B = this.nearBody(); this.nb = B;
    if (p.sc.charge > 0) { p.sc.charge -= dt; p.thr = 1; if (p.sc.charge <= 0) { p.sc.on = true; p.sc.speed = Math.max(p.vel.length(), 800); G.hud.banner('超巡航', 'SUPERCRUISE ENGAGED', 2); G.audio?.sfx('warp'); } }
    if (p.sc.on) {
      let dm = B.alt - B.b.def.atmoAlt * 2.2; const sd = _b.copy(this.origin).add(p.pos).length() - 1.2e6 * 1.5; dm = Math.min(dm, sd);
      if (this.nav) dm = Math.min(dm, this.navDist() - (this.nav.type === 'body' ? this.nav.ref.R + this.nav.ref.def.atmoAlt * 2.6 : 3500));
      const vT = clamp(dm * 0.42, 600, 4.2e6) * (0.25 + 0.75 * p.thr);
      p.sc.speed = damp(p.sc.speed, vT, vT > p.sc.speed ? 0.9 : 3.2, dt);
      p.vel.copy(fwd).multiplyScalar(p.sc.speed);
      if (B.alt < B.b.def.atmoAlt * 3) this.dropSC(`${B.b.def.name} の重力圏に進入 — 巡航を解除`);
      else if (sd < 0) this.dropSC('恒星に接近しすぎです — 巡航を解除');
      else if (this.nav && this.nav.type !== 'body' && this.navDist() < 5200) this.dropSC(`${this.nav.name} に到着`);
    } else {
      if (boost) p.energy -= 20 * dt; p.boosting = boost;
      const ms = st.maxSpeed * (boost ? st.boost : 1), tv = _b.copy(fwd).multiplyScalar(p.thr * ms);
      p.vel.lerp(tv, 1 - Math.exp(-st.accel * (boost ? 1.6 : 1) * dt));
    }
    p.pos.addScaledVector(p.vel, dt);
    // 大気圏突入
    const aa = B.b.def.atmoAlt; this.heat = damp(this.heat, smooth(aa * 2.4, aa * 1.05, B.alt), 3, dt);
    if (B.alt < aa && !this.landing) { this.landing = true; G.hud.banner('大気圏突入', B.b.def.name, 2.5); G.audio?.sfx('entry'); G.go('surface', { body: B.b.def.id }, { flash: true }).then(() => { this.landing = false; }); }
    else if (B.alt < aa * 2.2 && !this.said['e' + B.b.def.id]) { this.said['e' + B.b.def.id] = 1; G.hud.msg(`${B.b.def.name} の大気圏に接近。このまま降下すると地表へ向かいます。`, 'good'); setTimeout(() => { this.said['e' + B.b.def.id] = 0; }, 30000); }
    const sunD = _b.copy(this.origin).add(p.pos).length();
    if (sunD < 1.2e6 * 1.35) { this.heat = 1; this.damagePlayer(30 * dt, null, true); if (!this.said.sun) { this.said.sun = 1; G.hud.msg('警告：恒星の熱で船体が損傷しています！', 'warn'); setTimeout(() => { this.said.sun = 0; }, 6000); } }
    // 主砲
    p.fireT -= dt;
    if (inp.down('fire') && p.fireT <= 0 && !p.sc.on && p.energy > 2) this._firePlayer(fwd);
    p.misT -= dt; if (inp.hit('mis') && !p.sc.on) this._fireMissile(fwd);
  }
  nearBody() {
    let best = null; const u = this.uni(this.pl.pos, _c);
    for (const b of this.bodies) { const alt = u.distanceTo(b.uni) - b.R; if (!best || alt < best.alt) best = { b, alt }; }
    return best;
  }
  navPos(out = _c) { const n = this.nav; return out.copy(n.ref.uni).sub(this.origin); }
  navDist() { return this.navPos(_d).distanceTo(this.pl.pos); }
  setNav(type, id) {
    const ref = type === 'station' ? this.station(id) : type === 'body' ? this.bodies.find((b) => b.def.id === id) : this.enemies.find((e) => e.def.id === id);
    if (!ref) { this.nav = null; return; }
    this.nav = { type, id, ref, name: ref.def.name }; G.hud.msg(`航路設定：${ref.def.name}`, 'good'); G.audio?.sfx('nav');
  }
  /** 自動航行: 目標方向への操舵量 [pitch, yaw] を返す。必要なら超巡航も管理 */
  _navSteer(fwd) {
    const p = this.pl; if (!this.nav) { p.auto = null; return null; }
    const tp = this.navPos(_c), to = _b.copy(tp).sub(p.pos), dist = to.length(); to.multiplyScalar(1 / dist);
    // 天体を避ける (太陽も含める: 以前は惑星だけを避け、太陽をはさんだ星どうしの航行で恒星に突っ込んで撃墜されていた)
    const avoid = this._avoid || (this._avoid = [...this.bodies.map((b) => ({ b, uni: b.uni, need: b.R * 1.5 })), { b: null, uni: V(0, 0, 0), need: 1.2e6 * 2.4 }]);
    for (const { b, uni, need } of avoid) {
      if (b && this.nav.ref === b) continue;
      const v = _d.copy(uni).sub(this.origin).sub(p.pos), t = v.dot(to); if (t <= 0 || t > dist) continue;
      const perp = v.addScaledVector(to, -t), dp = perp.length();
      if (dp < need) { to.multiplyScalar(t).addScaledVector(perp, -(need - dp) / (dp || 1)).normalize(); }
    }
    const loc = to.applyQuaternion(_q.copy(p.quat).invert());
    const yaw = clamp(-loc.x * 3, -1, 1) * (loc.z > 0 ? 1 : 1), pitch = clamp(loc.y * 3, -1, 1);
    const aligned = loc.z < -0.985, stop = this.nav.type === 'body' ? this.nav.ref.R + this.nav.ref.def.atmoAlt * 3.4 : this.nav.type === 'enemy' ? 2500 : 1800;
    if (!p.sc.on) {
      if (dist < stop) { G.input.setThr(0.15); p.auto = null; G.hud.msg(`${this.nav.name} に到着 — 自動航行を終了`, 'good'); G.audio?.sfx('nav'); return [0, 0]; }
      if (dist > 22000 && aligned && p.sc.charge <= 0 && this.canSC(true)) { p.sc.charge = 1.6; G.audio?.sfx('charge'); }
      G.input.setThr(aligned ? (dist > 6000 ? 1 : clamp((dist - stop) / 5000, 0.25, 1)) : 0.35);
    } else G.input.setThr(aligned ? 1 : 0.4);
    return [loc.z > 0 ? (pitch >= 0 ? 1 : -1) : pitch, yaw];
  }
  canSC(silent) {
    const p = this.pl, B = this.nearBody();
    if (B.alt < B.b.def.atmoAlt * 3.2) { if (!silent) G.hud.msg('惑星に近すぎて超巡航を起動できません。上昇してください。', 'warn'); return false; }
    for (const e of this.enemies) if (e.state === 'attack' && e.dist < 3000) { if (!silent) G.hud.msg('敵艦が近すぎて超巡航を起動できません。', 'warn'); return false; }
    return !p.docked && !p.dead;
  }
  toggleSC() {
    const p = this.pl; if (p.docked || p.auto?.type === 'dock') return;
    if (p.sc.on) return this.dropSC('超巡航を解除');
    if (p.sc.charge > 0) { p.sc.charge = 0; return; }
    if (this.canSC()) { p.sc.charge = 1.6; G.hud.msg('超巡航ドライブ充填中…'); G.audio?.sfx('charge'); }
  }
  dropSC(msg) { const p = this.pl; if (!p.sc.on) return; p.sc.on = false; p.vel.setLength(Math.min(p.st.maxSpeed * 0.8, 320)); p.sc.speed = 0; if (msg) G.hud.msg(msg, 'good'); G.audio?.sfx('drop'); this.shocks.spawn(_a.copy(FWD).applyQuaternion(p.quat).multiplyScalar(60).add(p.pos), '#8cf', 120, 0.7); }
  toggleAP() {
    const p = this.pl; if (p.docked) return;
    if (p.auto?.type === 'nav') { p.auto = null; G.hud.msg('自動航行を解除'); return; }
    if (p.auto?.type === 'dock') return;
    if (!this.nav) { G.hud.msg('目的地が未設定です。「星図」から航路を設定してください。', 'warn'); return; }
    p.auto = { type: 'nav' }; G.hud.msg(`自動航行：${this.nav.name} へ`, 'good');
  }

  // ── ドッキング ──
  requestDock(t) {
    const p = this.pl; if (p.sc.on) this.dropSC(); p.sc.charge = 0; p.boosting = false; // 充填中の超巡航やブーストの状態は取り消す (発進直後に勝手に作動しないように)
    p.auto = { type: 'dock', t, ph: 0 }; p.target = null;
    G.hud.msg(t.kind === 'station' ? `${t.def.name} 管制：ドッキングを許可します。自動誘導を開始。` : `${t.def.name} へ接舷シーケンス開始`, 'comm'); G.audio?.sfx('nav');
  }
  _autoDock(dt) {
    const p = this.pl, a = p.auto, t = a.t; if (t.kind === 'enemy' && t.state !== 'disabled') { p.auto = null; return; }
    const [P, D] = this.portOf(t), len = p.st.len / 2 + 3, A = _c.copy(P).addScaledVector(D, len + 240), Dk = _d.copy(P).addScaledVector(D, len);
    p.sc.on = false; p.m.tilt.rotation.z = damp(p.m.tilt.rotation.z, 0, 4, dt); p.m.tilt.rotation.x = damp(p.m.tilt.rotation.x, 0, 4, dt);
    // dir に _a/_b を渡されても壊れないよう、注視点は別の一時ベクトルで作る (以前は dir を上書きして、機体が浮動原点から見た自分の位置の方向を向いていた = 後ろ向きに接近していた)
    const face = (dir, rate) => { const up = Math.abs(dir.y) > 0.9 ? ZUP : UP; _m.lookAt(p.pos, _hp.copy(p.pos).add(dir), up); _q.setFromRotationMatrix(_m); p.quat.rotateTowards(_q, rate * dt); return p.quat.angleTo(_q); };
    if (a.ph === 0) {
      // 進入点 A までの直線がステーション本体を貫くときは、外周の中継点へ回り込む (以前は船体の中を突き抜けていた)
      const dA = p.pos.distanceTo(A), detour = t.kind === 'station' && dA > 60 && this._blocked(t, p.pos, A), T = detour ? this._detour(t, p.pos, A, _w1) : A;
      const to = _a.copy(T).sub(p.pos), d = to.length(), sp = detour ? 170 : Math.min(170, Math.max(14, d * 0.55)); to.multiplyScalar(1 / (d || 1));
      p.vel.lerp(_b.copy(to).multiplyScalar(sp), 1 - Math.exp(-2.5 * dt)); p.pos.addScaledVector(p.vel, dt);
      if (d > 60) face(to, 1.2); if (!detour && dA < 14) a.ph = 1; p.thr = clamp(sp / 170, 0.15, 0.8);
    } else if (a.ph === 1) {
      p.vel.multiplyScalar(Math.exp(-3 * dt)); p.pos.lerp(A, 1 - Math.exp(-1.5 * dt)); p.thr = 0.1;
      if (face(_a.copy(D).negate(), 0.9) < 0.02) { a.ph = 2; if (p.m.gear) p.m.gear.visible = true; G.hud.msg('進入路に整列 — 最終アプローチ'); }
    } else {
      const to = _a.copy(Dk).sub(p.pos), d = to.length(), sp = Math.min(28, Math.max(2.5, d * 0.5));
      p.pos.addScaledVector(to.multiplyScalar(1 / (d || 1)), Math.min(d, sp * dt)); p.vel.copy(to).multiplyScalar(sp); face(_b.copy(D).negate(), 2); p.thr = 0.08;
      if (d < 0.4) this._docked(t);
    }
    if (G.input.axes().x ** 2 + G.input.axes().y ** 2 > 0.8) { p.auto = null; if (p.m.gear) p.m.gear.visible = false; G.hud.msg('自動誘導を中止 — 手動操縦'); }
  }
  /** 線分 a→b がステーション s の本体 (衝突判定用の距離関数) に触れるか */
  _blocked(s, a, b) {
    const c = s.m.obj.position, id = s.def.id, n = Math.min(120, Math.ceil(a.distanceTo(b) / 15)), cl = this.pl.st.radius * 0.5 + 8;
    for (let i = 1; i < n; i++) { const k = i / n; if (stationSDF(id, a.x + (b.x - a.x) * k - c.x, a.y + (b.y - a.y) * k - c.y, a.z + (b.z - a.z) * k - c.z) < cl) return true; }
    return false;
  }
  /** 回り込みの中継点: 中心から見た自機と進入点の方向の中間で、本体の外接球より十分外側 */
  _detour(s, p, A, out) {
    const c = s.m.obj.position, u = _w2.copy(p).sub(c), du = u.length(), v = _w3.copy(A).sub(c), dv = v.length(); u.multiplyScalar(1 / (du || 1)); v.multiplyScalar(1 / (dv || 1));
    const w = out.copy(u).add(v); if (w.lengthSq() < 1e-4) w.crossVectors(u, Math.abs(u.y) < 0.9 ? UP : ZUP); w.normalize();
    return w.multiplyScalar(Math.max(s.m.radius * 1.45, Math.min(du, dv))).add(c);
  }
  _docked(t) {
    const p = this.pl; this.placeDocked(t); G.audio?.sfx('dock'); p.shake = 0.5;
    this.parts.burst(this.portOf(t)[0], 40, 8, C('#bfefff'), 1.2, 0.8);
    if (t.kind === 'station') {
      G.p.last = t.def.id; G.p.stats.docks[t.def.id] = (G.p.stats.docks[t.def.id] || 0) + 1; G.p.day++; G.tip = ''; // 入港したら「ドッキング要請で入港しよう」の案内は役目を終える
      G.hud.banner('ドッキング完了', t.def.name); event('dock', { station: t.def.id });
      this.refit(); p.hull = p.st.hull * G.p.ships[p.id].hull; save();
    } else G.hud.banner('接舷完了', t.def.name + ' — 乗り込み可能');
  }
  _dockedUpdate(dt) {
    const p = this.pl, t = p.docked; if (t.kind === 'enemy' && t.state === 'gone') { p.docked = null; return; }
    this._sync(t); const [P, D] = this.portOf(t); p.pos.copy(P).addScaledVector(D, p.st.len / 2 + 3); p.vel.set(0, 0, 0); p.thr = 0;
  }
  undock() {
    const p = this.pl, t = p.docked; if (!t) return;
    const [, D] = this.portOf(t); p.docked = null; p.vel.copy(D).multiplyScalar(40); p.thr = 0.2; G.input.setThr(0.2);
    if (p.m.gear) p.m.gear.visible = false; G.audio?.sfx('undock'); G.hud.msg(t.kind === 'station' ? `${t.def.name} 管制：発進を確認。良い航海を。` : '離脱しました', 'comm');
    p.auto = { type: 'push', t: 4, dir: D.clone() }; p.thr = 0; G.input.setThr(0); // 港から外向きに後退しながら機首を外へ回し、向き終えたら操縦を渡す (_push)
  }

  /** 発進直後: 係留中は機首が港を向いているので、そのまま推力を入れるとステーションに突っ込む。
   *  外向きに後退しながら機首を外へ回し、向き終えて港から離れたら操縦を渡す */
  _push(dt) {
    const p = this.pl, a = p.auto, D = a.dir; this.nb = this.nearBody();
    _m.lookAt(p.pos, _hp.copy(p.pos).add(D), Math.abs(D.y) > 0.9 ? ZUP : UP); _q.setFromRotationMatrix(_m); p.quat.rotateTowards(_q, 1.7 * dt);
    p.vel.copy(D).multiplyScalar(45); p.pos.addScaledVector(p.vel, dt); p.thr = 0; p.av.set(0, 0, 0);
    p.m.tilt.rotation.z = damp(p.m.tilt.rotation.z, 0, 4, dt); p.m.tilt.rotation.x = damp(p.m.tilt.rotation.x, 0, 4, dt);
    a.moved = (a.moved || 0) + 45 * dt; if (p.quat.angleTo(_q) < 0.06 && a.moved > 70) this._endPush();
  }
  _endPush() { const p = this.pl; if (p.auto?.type !== 'push') return; p.auto = null; G.input.setThr(0.3); }

  // ── 戦闘 ──
  cycleTarget() {
    const p = this.pl, L = this.enemies.filter((e) => e.state !== 'gone' && e.dist < 25000).sort((a, b) => a.dist - b.dist);
    if (!L.length) { p.target = null; G.hud.msg('射程内に敵影なし'); return; }
    p.target = L[(L.indexOf(p.target) + 1) % L.length]; G.audio?.sfx('lock');
  }
  _firePlayer(fwd) {
    const p = this.pl, st = p.st, g = p.m.guns; p.fireT = 1 / st.rof; p.energy -= 1.6;
    const gp = _b.copy(g[p.gi++ % g.length]).applyMatrix4(p.m.tilt.matrixWorld), dir = _c.copy(fwd), t = p.target;
    if (t && t.state !== 'gone') { // 照準補正: 目標のリード位置が前方 7° 以内なら収束
      const tp = _d.subVectors(t.uni, this.origin), d = tp.distanceTo(gp), lead = tp.addScaledVector(t.vel, d / 1500).addScaledVector(p.vel, -d / 1500).sub(gp).normalize();
      if (lead.dot(fwd) > 0.992) dir.copy(lead);
    }
    this.bolts.fire(gp, dir, 1500, p.m.boltColor || (p.m.boltColor = C(p.m.glowColor).multiplyScalar(5)), st.dmg, 'p', 2.2, 18, 0.3, p.vel);
    G.audio?.sfx('laser');
  }
  _fireMissile(fwd) {
    const p = this.pl;
    if (p.missiles <= 0) return G.hud.msg('ミサイル残弾なし。ステーションで補給できます。', 'warn');
    if (!p.target || p.target.state === 'gone') return G.hud.msg('ミサイル：目標をロックしてください (照準切替)', 'warn');
    if (p.misT > 0 || !this.misPool.length) return;
    p.misT = 0.7; p.missiles--; const g = this.misPool.pop(); g.visible = true;
    g.position.copy(p.pos).addScaledVector(_b.set(0, -1, 0).applyQuaternion(p.quat), p.m.bottom * 0.6);
    this.missiles.push({ g, vel: p.vel.clone().addScaledVector(fwd, 120), dir: fwd.clone(), t: p.target, life: 10, sp: p.vel.length() + 150 }); G.audio?.sfx('missile');
  }
  /** 船体ローカルの着弾点を求める。シールドが生きていれば球面で受け止める */
  _precise(m, from, dir, shieldUp, maxT) {
    if (shieldUp) return { shield: true };
    const b = m.body; b.updateWorldMatrix(true, false); const inv = _m.copy(b.matrixWorld).invert(), o = _hp.copy(from).applyMatrix4(inv), d = _hd.copy(dir).transformDirection(inv), l = rayHit(m, o, d, maxT);
    return l ? { l, d: d.clone(), w: l.clone().applyMatrix4(b.matrixWorld) } : null;
  }
  /** 着弾点の外板を凹ませ・剥がし、破片と火花を散らす */
  _wound(m, h, R, depth, vel, color, id) {
    const chips = applyDamage(m, h.l, h.d, R, depth); if (id) { logDamage(id, h.l, h.d, R, depth); m.applied++; }
    const out = _hd.copy(h.d).transformDirection(m.body.matrixWorld).negate();
    this.debris.burst(h.w, Math.min(16, 2 + chips * 2 + Math.round(R)), 14 + R * 6, 0.1 + R * 0.07, color, vel, out);
    this.parts.burst(h.w, 8 + Math.round(R * 4), 26 + R * 12, SPARK, 0.35 + R * 0.12, 0.6, vel, 1.2); this.parts.burst(h.w, 2, 4, ORANGE, 0.8 + R * 0.5, 0.25, vel, 2);
  }
  damagePlayer(dmg, from, quiet, h, R = 1.5) {
    const p = this.pl; if (p.dead || p.docked) return; p.lastHit = this.time;
    if (p.shield > 0) { p.shield -= dmg; if (!quiet) { this.shield.hit(p.m.obj, p.st.radius * 0.75, from ? _b.copy(from).sub(p.pos) : FWD, '#5cf'); G.audio?.sfx('shield'); } if (p.shield < 0) { p.hull += p.shield; p.shield = 0; } }
    else { p.hull -= dmg; if (!quiet) { p.shake = Math.min(1, p.shake + 0.5); G.audio?.sfx('hit'); if (h && h.l) this._wound(p.m, h, R, R * 0.28, p.vel, '#c8ccd4', p.id); else this.parts.burst(p.pos, 14, 40, SPARK, 1.4, 0.6, p.vel); } }
    G.p.ships[p.id].hull = clamp(p.hull / p.st.hull, 0, 1);
    if (p.hull <= 0) this._die();
  }
  _die() {
    const p = this.pl; p.dead = true; p.auto = null; p.sc.on = false; this.explode(p.pos, p.st.radius * 2.2, p.vel); this.debris.burst(p.pos, 50, 60, p.st.radius * 0.06, '#c8ccd4', p.vel); p.m.obj.visible = false;
    G.hud.banner('船体喪失', '救難艇が回収中…', 4); const fee = Math.round(G.p.credits * 0.1);
    setTimeout(() => { G.p.credits -= fee; G.p.ships[p.id].hull = 1; this.rebuildShip(); p.m.obj.visible = true; G.go('space', { docked: G.p.last }).then(() => G.hud.msg(`${this.station(G.p.last).def.name} で修復されました (費用 ${fee.toLocaleString()} Cr)`, 'warn', 8)); }, 3200);
  }
  explode(pos, size, vel) {
    this.parts.burst(pos, 160, size * 9, ORANGE, size * 0.5, 1.6, vel, 0.9); this.parts.burst(pos, 60, size * 3, WHITE, size * 1.3, 0.7, vel, 1.5); this.parts.burst(pos, 90, size * 16, SPARK, size * 0.14, 2.4, vel, 0.3);
    this.shocks.spawn(pos, '#ffd0a0', size * 6, 0.9); this.shocks.spawn(pos, '#fff2d0', size * 5, 0.35, 1);
    this.flash.position.copy(pos); this.flash.intensity = 9000; this.flash.distance = size * 40;
    G.audio?.sfx('boom', clamp(1 - pos.distanceTo(this.pl.pos) / 6000, 0.15, 1)); if (pos.distanceTo(this.pl.pos) < 600) this.pl.shake = 1;
  }
  hitEnemy(e, dmg, pos, h, R = 1.5) {
    e.lastHit = this.time; if (e.state === 'idle') e.state = 'attack';
    const wound = () => { if (h && h.l) this._wound(e.m, h, R, R * 0.3, e.vel, e.def.glow); else this.parts.burst(pos, 12, 60, SPARK, 1.8, 0.7, e.vel); };
    if (e.state === 'disabled') { e.dis -= dmg; wound(); if (e.dis <= 0) this._kill(e); return; }
    if (e.shield > 0) { e.shield -= dmg; this.shield.hit(e.m.obj, e.m.radius * 0.8, _b.copy(pos).sub(e.m.obj.position), e.def.glow); if (e.shield < 0) { e.hull += e.shield; e.shield = 0; } }
    else { e.hull -= dmg; wound(); }
    if (e.hull <= e.maxHull * 0.18) {
      if (e.hull < -25) return this._kill(e);
      e.state = 'disabled'; e.hull = Math.max(e.hull, 1); e.shield = 0; for (const pl of e.m.plumes) pl.visible = false; for (const s of e.m.glows) s.visible = false;
      this.parts.burst(pos, 80, 90, ORANGE, 2.2, 1.2, e.vel); this.shocks.spawn(pos, e.def.glow, 90, 0.6);
      G.hud.msg(`${e.def.name} を航行不能にした！ 接舷して乗り込むか、撃沈できます。`, 'good', 7); G.audio?.sfx('disable');
    }
  }
  _kill(e) {
    this.explode(e.m.obj.position, e.m.radius, e.vel); this.debris.burst(e.m.obj.position, 60, e.m.radius * 3.4, e.m.radius * 0.05, e.def.glow, e.vel); e.state = 'gone'; e.m.obj.visible = false; G.p.done[e.def.id] = 'destroyed'; G.p.stats.kills++;
    if (this.pl.target === e) this.pl.target = null; if (this.nav?.ref === e) this.nav = null; if (this.pl.docked === e) this.pl.docked = null;
    earn(e.def.bounty); const sal = addCargo('salvage', 1 + e.def.tier);
    G.hud.msg(`${e.def.name} 撃沈　賞金 ${e.def.bounty.toLocaleString()} Cr${sal ? `／回収部品 ×${sal}` : ''}　残存 ${remaining()} 隻`, 'good', 7);
    event('kill'); save(); G.checkVictory?.();
  }
  /** 乗り込み後: 拿捕なら曳航 (ワープアウト)、略奪なら自沈 */
  afterBoard(e) {
    const p = this.pl; if (p.docked === e) this.undock();
    setTimeout(() => {
      const pos = e.m.obj.position;
      if (e.fate === 'capture') { this.shocks.spawn(pos, '#8cf', e.m.radius * 6, 0.9, 1); this.parts.burst(pos, 90, 70, C('#9fe8ff'), 2.2, 1.1); G.audio?.sfx('warp'); G.hud.msg(`${e.def.name} は防衛軍の回収艇に曳航されていった。残存 ${remaining()} 隻`, 'good', 7); }
      else { this.explode(pos, e.m.radius, e.vel); G.hud.msg(`${e.def.name} は自沈した。残存 ${remaining()} 隻`, 'good', 7); }
      e.state = 'gone'; e.fate = null; e.m.obj.visible = false; if (p.target === e) p.target = null; if (this.nav?.ref === e) this.nav = null; if (p.docked === e) p.docked = null;
      G.checkVictory?.();
    }, 2800);
  }
  _combat(dt) {
    const p = this.pl, ppos = p.pos, pr = p.st.radius * 0.75;
    this.bolts.update(dt, (prev, b) => {
      if (b.owner === 'p') {
        for (const e of this.enemies) { if (e.state === 'gone' || e.dist > 6000 || !e.m) continue; if (segSphere(prev, b.p, e.m.obj.position, e.m.radius * 0.75)) { const h = this._precise(e.m, prev, b.d, e.shield > 0, prev.distanceTo(b.p) + e.m.radius * 1.6); if (h) { this.hitEnemy(e, b.dmg, h.w || b.p, h, 1.1 + b.dmg * 0.045); return true; } } }
      } else if (!p.dead && !p.docked && segSphere(prev, b.p, ppos, pr)) { const h = this._precise(p.m, prev, b.d, p.shield > 0, prev.distanceTo(b.p) + p.st.radius * 1.6); if (h) { this.damagePlayer(b.dmg, prev, false, h, 1.0 + b.dmg * 0.06); return true; } }
      return false;
    });
    for (let i = this.missiles.length - 1; i >= 0; i--) {
      const m = this.missiles[i], t = m.t; m.life -= dt; let boom = m.life <= 0;
      if (t && t.state !== 'gone') {
        const tp = _a.subVectors(t.uni, this.origin), to = _b.copy(tp).sub(m.g.position), d = to.length(); to.addScaledVector(t.vel, d / m.sp).normalize();
        _q.setFromUnitVectors(m.dir, to); const ang = 2 * Math.acos(clamp(_q.w, -1, 1)); if (ang > 1e-4) m.dir.applyQuaternion(_q2.identity().slerp(_q, Math.min(1, 2.6 * dt / ang))).normalize();
        if (d < 16) { const h = this._precise(t.m, _c.copy(m.g.position).addScaledVector(m.dir, -t.m.radius), m.dir, t.shield > 0, t.m.radius * 3); this.hitEnemy(t, 75, m.g.position, h, 4.6); boom = true; }
      }
      m.sp = Math.min(1100, m.sp + 500 * dt); m.vel.copy(m.dir).multiplyScalar(m.sp); m.g.position.addScaledVector(m.vel, dt); m.g.quaternion.setFromUnitVectors(_c.set(0, 0, -1), m.dir);
      this.parts.emit(m.g.position.x, m.g.position.y, m.g.position.z, 0, 0, 0, 1, 0.7, 0.35, 2.2, 0.45, 1);
      if (boom) { this.parts.burst(m.g.position, 50, 70, ORANGE, 2.5, 0.8); this.shocks.spawn(m.g.position, '#ffc890', 50, 0.5); G.audio?.sfx('boom', 0.5); m.g.visible = false; this.misPool.push(m.g); this.missiles.splice(i, 1); }
    }
    this.flash.intensity *= Math.exp(-6 * dt);
  }

  // ── 敵 AI ──
  _enemies(dt) {
    const p = this.pl, active = !p.docked && !p.dead && !p.sc.on && !this.title;
    for (const e of this.enemies) {
      if (e.state === 'gone') continue;
      e.dist = _a.subVectors(e.uni, this.origin).distanceTo(p.pos);
      if (e.dist > 70000) { if (e.m) e.m.obj.visible = false; continue; }
      this._ensure(e); const o = e.m.obj; o.visible = !G.backdrop.occluded(this.uni(this.camera.position, _b), e.uni, e.m.radius);
      const fwd = _b.copy(FWD).applyQuaternion(e.quat); let want = null, speed = 0;
      if (e.state === 'disabled') {
        e.vel.multiplyScalar(Math.exp(-0.5 * dt));
        if (Math.random() < dt * 3 && e.dist < 3000) { _c.set(rr(Math.random, -1, 1), rr(Math.random, -1, 1), rr(Math.random, -1, 1)).multiplyScalar(e.m.radius * 0.5).add(o.position); this.parts.burst(_c, 6, 25, SPARK, 1.1, 0.5, e.vel); }
      } else if (e.state === 'idle') {
        const a = this.time * 0.05 + e.ph; _c.copy(e.anchor).add(_d.set(Math.cos(a) * 1400, Math.sin(a * 1.7) * 300, Math.sin(a) * 1400));
        want = _c.sub(e.uni).normalize(); speed = 110;
        if (active && e.dist < 9500) { e.state = 'attack'; if (!this.said['a' + e.def.body] && (this.said['a' + e.def.body] = 1)) { G.hud.msg(`${e.def.name}：「獲物だ。逃がすな」`, 'comm'); G.hud.msg('警告：ヴォイド艦隊が接近中！', 'warn'); setTimeout(() => { this.said['a' + e.def.body] = 0; }, 60000); } if (!p.target) p.target = e; G.audio?.music('battle'); }
      } else {
        if (!active || e.dist > 18000) { e.state = 'idle'; continue; }
        const tier = e.def.tier, tp = _c.subVectors(this.uni(p.pos, _d), e.uni), d = tp.length();
        tp.addScaledVector(p.vel, d / 950).addScaledVector(e.vel, -d / 950).normalize();
        if (e.breakT > 0) { e.breakT -= dt; want = e.breakDir; speed = 300 + tier * 30; }
        else if (d < 320 || (this.time - e.lastHit < 0.4 && Math.random() < dt * 0.6)) {
          e.breakT = 2.2 + Math.random() * 2.2; e.breakDir.set(Math.random() - 0.5, Math.random() - 0.5, Math.random() - 0.5).cross(tp).normalize().addScaledVector(tp, d < 320 ? -0.3 : 0.4).normalize(); want = e.breakDir; speed = 320;
        } else { want = tp; speed = clamp(d * 0.35, 150, 260 + tier * 40); }
        e.fireT -= dt;
        if (e.breakT <= 0 && e.fireT <= 0 && d < 2600 && fwd.dot(tp) > 0.994) {
          const g = e.m.guns, gp = _d.copy(g[e.gi++ % g.length]).applyMatrix4(o.matrixWorld), sp = (0.035 - tier * 0.007);
          // 砲口から狙う: 砲は機体の中心線から最大 13m 横に付いているので、中心からの向きのまま撃つと弾が平行に目標の横を素通りしていた
          const aim = _hp.copy(p.pos).addScaledVector(p.vel, d / 950).addScaledVector(e.vel, -d / 950).sub(gp).normalize();
          _a.set(Math.random() - 0.5, Math.random() - 0.5, Math.random() - 0.5).multiplyScalar(sp).add(aim).normalize(); // ばらつき用に tp (=_c, 向きの目標) を上書きしない
          this.bolts.fire(gp, _a, 950, e.bc || (e.bc = C(e.def.glow).multiplyScalar(5)), e.def.dmg, 'e', 3, 20, 0.34, e.vel); G.audio?.sfx('elaser', clamp(1 - d / 3000, 0.1, 1));
          e.burst++; e.fireT = e.burst % (3 + tier) === 0 ? 1.5 - tier * 0.25 : 0.16;
        }
        if (e.shield < e.maxShield && this.time - e.lastHit > 5) e.shield = Math.min(e.maxShield, e.shield + e.maxShield * 0.05 * dt);
      }
      if (want) {
        _m.lookAt(_a.set(0, 0, 0), want, _d.copy(UP).applyQuaternion(e.quat)); _q.setFromRotationMatrix(_m); e.quat.rotateTowards(_q, (0.7 + e.def.tier * 0.18) * dt);
        e.vel.lerp(_a.copy(FWD).applyQuaternion(e.quat).multiplyScalar(speed), 1 - Math.exp(-1.6 * dt));
        for (const pl of e.m.plumes) { pl.material.uniforms.uPow.value = 0.4 + speed / 300; pl.scale.z = 0.5 + speed / 250; }
      }
      e.uni.addScaledVector(e.vel, dt); o.position.subVectors(e.uni, this.origin); o.quaternion.copy(e.quat);
    }
    if (p.target && (p.target.state === 'gone' || p.target.dist > 40000)) p.target = null;
  }

  // ── 世界 (ステーション・光源・背景) ──
  _world(dt) {
    const p = this.pl, camU = this.uni(this.camera.position, _c);
    for (const s of this.stations) {
      if (!s.m) continue; const o = s.m.obj; o.position.subVectors(s.uni, this.origin); s.dist = o.position.distanceTo(p.pos);
      o.visible = s.dist < 85000 && !G.backdrop.occluded(camU, s.uni, s.m.radius);
      if (o.visible) for (const f of s.m.anim) f(this.time, dt);
    }
    this.rocks.position.subVectors(this.rocksAt.uni, this.origin); this.rocks.visible = this.rocks.position.lengthSq() < 9e9;
    if (p.auto?.type === 'push') { p.auto.t -= dt; if (p.auto.t <= 0) this._endPush(); }
    if (p.m.spin) p.m.spin.rotation.z += dt * 0.25;
    const pw = p.sc.on ? 1.6 : p.docked ? 0.05 : 0.15 + p.thr * 0.85 + (p.boosting ? 0.7 : 0);
    for (const pl of p.m.plumes) { pl.material.uniforms.uPow.value = damp(pl.material.uniforms.uPow.value, pw, 6, dt); pl.scale.z = 0.25 + pl.material.uniforms.uPow.value * 0.9; }
    for (const g of p.m.glows) g.material.opacity = 0.35 + pw * 0.5;
    G.audio?.engine(p.docked ? 0 : p.thr, p.boosting ? 1 : 0, p.sc.on ? 1 : 0);
  }
  _backdrop(dt) {
    const p = this.pl, cam = this.camera, bd = G.backdrop, camU = this.uni(cam.position, _c);
    bd.update(camU, cam.quaternion, cam.fov, cam.aspect, dt, G.gfx.pxScale);
    this.sun.intensity = 4.4 * (0.04 + 0.96 * bd.sunVis); this.sun.position.copy(p.pos).addScaledVector(bd.sunDir, 300); this.sun.target.position.copy(p.pos);
    // 惑星照り返し
    const nb = bd.near, ps = this.shine; _a.copy(nb.pos).sub(camU); const d = _a.length(); _a.multiplyScalar(1 / d);
    const phase = 0.5 + 0.5 * _b.copy(nb.pos).normalize().negate().dot(_d.copy(_a).negate());
    ps.color.set(nb.def.color); ps.intensity = clamp((nb.R / d) ** 2 * 2.2, 0, 1.6) * (0.15 + 0.85 * phase); ps.position.copy(p.pos).addScaledVector(_a, 300); ps.target.position.copy(p.pos);
    G.gfx.fx.uSun.value.copy(bd.sunScreen);
  }
  _cam(dt, snap) {
    const p = this.pl, cam = this.camera, m = p.m;
    if (snap) p.camQ.copy(p.quat); else p.camQ.slerp(p.quat, 1 - Math.exp(-(p.docked || p.auto?.type === 'dock' ? 2 : 4.5) * dt));
    const sp = p.vel.length(), k = p.sc.on ? 1 : clamp(sp / (p.st.maxSpeed * p.st.boost), 0, 1);
    this.warp = damp(this.warp, p.sc.on ? clamp(p.sc.speed / 60000, 0.25, 1) : p.sc.charge > 0 ? 0.3 : 0, 2.5, dt);
    const ck = p.view === 1 && !p.docked && !this.title ? 'block' : 'none'; if (G.hud.cockpit.style.display !== ck) G.hud.cockpit.style.display = ck; // モード切替後やドッキング中も視点と枠を一致させる
    if (p.view === 1 && !p.docked) { cam.position.copy(m.cockpit).applyQuaternion(p.quat).add(p.pos); cam.quaternion.copy(p.quat); m.body.visible = false; }
    else {
      m.body.visible = true; const dd = m.cam.d * (1 + k * 0.22) * (p.auto?.type === 'dock' || p.docked ? 1.5 : 1);
      cam.position.set(0, m.cam.h, dd).applyQuaternion(p.camQ).add(p.pos); cam.quaternion.copy(p.camQ);
      cam.rotateX(-0.06);
    }
    if (p.shake > 0.01) { p.shake *= Math.exp(-4 * dt); const s = p.shake * 0.9; cam.position.x += (Math.random() - 0.5) * s; cam.position.y += (Math.random() - 0.5) * s; cam.rotateZ((Math.random() - 0.5) * s * 0.02); }
    const fov = 62 + k * 9 + this.warp * 22; if (Math.abs(cam.fov - fov) > 0.05) { cam.fov = damp(cam.fov, fov, 4, dt || 1); cam.updateProjectionMatrix(); }
    cam.updateMatrixWorld(); this._backdrop(dt);
  }
  _fx(dt) {
    const p = this.pl, f = G.gfx.fx;
    this.parts.update(dt, G.gfx.ph / (2 * Math.tan(this.camera.fov * Math.PI / 360))); this.shocks.update(dt, this.camera.quaternion); this.shield.update(dt); this.debris.update(dt);
    this._smoke(p.m, p.vel, dt, p.hull < p.st.hull * 0.35); for (const e of this.enemies) if (e.m && e.state !== 'gone' && e.dist < 4000 && e.m.wounds.length) this._smoke(e.m, e.vel, dt, e.state === 'disabled');
    const sp = p.vel.length(); this.streaks.update(dt, p.sc.on ? _a.copy(p.vel).setLength(4000) : p.vel, p.sc.on ? 0.02 : 0.035, p.sc.on ? 1.6 : clamp(sp / 250, 0, 1) * 0.8, p.sc.on ? 90 : 26);
    f.uWarp.value = this.warp; f.uHeat.value = this.heat; G.hud.damage(p.hull < p.st.hull * 0.3 && !p.dead ? 0.35 + 0.2 * Math.sin(this.time * 5) : 0);
    f.uDamage.value = damp(f.uDamage.value, this.time - p.lastHit < 0.25 ? 1 : 0, 10, dt);
  }

  /** 傷口から火花と燃えさしを噴く */
  _smoke(m, vel, dt, heavy) {
    for (const w of m.wounds) { w.t += dt; if (w.t > (heavy ? 1e9 : 9) || Math.random() > dt * (heavy ? 9 : 14 * w.k * Math.exp(-w.t * 0.4))) continue; _hp.copy(w.p).applyMatrix4(m.body.matrixWorld); this.parts.emit(_hp.x, _hp.y, _hp.z, vel.x * 0.6 + (Math.random() - 0.5) * 8, vel.y * 0.6 + (Math.random() - 0.5) * 8, vel.z * 0.6 + (Math.random() - 0.5) * 8, 1, 0.5, 0.18, 0.4 + Math.random() * 0.7 * w.k, 0.7, 0.8); }
  }
  /** 衝突: 敵艦・小惑星・ステーション。ぶつかった所だけが壊れる */
  _collide() {
    const p = this.pl, sr = p.st.radius * 0.36; if (p.docked || p.dead || p.auto?.type === 'dock' || p.auto?.type === 'push' || p.sc.on) return;
    const bump = (n, depth, ov, label) => {
      const vn = p.vel.x * n.x + p.vel.y * n.y + p.vel.z * n.z - (ov ? ov.dot(n) : 0); p.pos.addScaledVector(n, depth + 0.05); if (vn >= 0) return 0;
      p.vel.addScaledVector(n, -vn * 1.55); const imp = -vn; if (imp < 8) return imp;
      const h = this._precise(p.m, _a.copy(p.pos).addScaledVector(n, -p.st.radius * 1.6), n, false, p.st.radius * 3.2), R = clamp(imp * 0.045, 1.2, 7);
      p.lastHit = this.time; p.shake = Math.min(1, 0.3 + imp / 120); G.audio?.sfx('hit'); const dmg = imp * 0.42;
      if (p.shield > 0) { p.shield -= dmg * 0.5; if (p.shield < 0) p.shield = 0; } p.hull -= dmg * (p.shield > 0 ? 0.5 : 1);
      if (h) this._wound(p.m, h, R, R * 0.3, p.vel, '#c8ccd4', p.id);
      G.p.ships[p.id].hull = clamp(p.hull / p.st.hull, 0, 1); if (imp > 40 && !this.said.col) { this.said.col = 1; G.hud.msg(`${label}に衝突！ 船体が損傷した`, 'warn'); setTimeout(() => { this.said.col = 0; }, 3000); }
      if (p.hull <= 0) this._die(); return imp;
    };
    for (const e of this.enemies) { if (e.state === 'gone' || !e.m || e.dist > 400) continue; const o = e.m.obj.position, R = sr + e.m.radius * 0.36, d = o.distanceTo(p.pos); if (d >= R || d < 1e-3) continue;
      const n = _b.subVectors(p.pos, o).multiplyScalar(1 / d), imp = bump(n, R - d, e.vel, e.def.name); if (imp > 8) { const h = this._precise(e.m, _a.copy(o).addScaledVector(n, e.m.radius * 1.6), _c.copy(n).negate(), false, e.m.radius * 3.2); if (h) this._wound(e.m, h, clamp(imp * 0.045, 1.2, 6), 0.6, e.vel, e.def.glow); e.vel.addScaledVector(n, -imp * 0.4); this.hitEnemy(e, imp * 0.3, p.pos); } }
    if (this.rocks.visible && this.rocks.position.distanceToSquared(p.pos) < 4.3e7) { const g = this.rocks.position; for (const r of this.rockList) { const dx = p.pos.x - g.x - r[0], dy = p.pos.y - g.y - r[1], dz = p.pos.z - g.z - r[2], R = r[3] + sr, d2 = dx * dx + dy * dy + dz * dz; if (d2 >= R * R) continue; const d = Math.sqrt(d2) || 1; bump(_b.set(dx / d, dy / d, dz / d), R - d, null, '小惑星'); } }
    for (const s of this.stations) { if (!s.m || s.dist > (s.m.reach || s.m.radius * 1.4) + 200) continue; const o = s.m.obj, l = _a.copy(p.pos).sub(o.position), f = (x, y, z) => stationSDF(s.def.id, x, y, z), d = f(l.x, l.y, l.z); if (d >= sr) continue;
      const n = _b.set(f(l.x + 1, l.y, l.z) - f(l.x - 1, l.y, l.z), f(l.x, l.y + 1, l.z) - f(l.x, l.y - 1, l.z), f(l.x, l.y, l.z + 1) - f(l.x, l.y, l.z - 1)); if (n.lengthSq() < 1e-8) n.copy(l); n.normalize(); bump(n, sr - d, null, s.def.name); }
  }
  // ── HUD ──
  _hud() {
    const p = this.pl, h = G.hud, cam = this.camera, st = p.st;
    h.bar('sh', p.shield / st.shield); h.bar('hull', p.hull / st.hull); h.bar('en', p.energy / st.energy);
    const sp = p.vel.length();
    h.setSpeed(fmtSpeed(sp), p.sc.on ? 'SUPERCRUISE' : p.docked ? 'DOCKED' : p.auto?.type === 'dock' ? 'AUTO DOCK' : p.auto?.type === 'nav' ? 'AUTOPILOT' : `MSL ${p.missiles}`);
    const nb = (this.nb = p.docked || !this.nb ? this.nearBody() : this.nb); // ドッキング中は飛行処理が走らないのでここで更新
    h.setLoc(nb.alt < nb.b.R * 6 ? `${nb.b.def.name} 軌道` : '惑星間空間', nb.alt < nb.b.R * 6 ? `高度 ${fmtDist(nb.alt)}` : 'DEEP SPACE');
    G.input.active('sc', p.sc.on || p.sc.charge > 0); G.input.active('ap', p.auto?.type === 'nav');
    { const fly = !p.docked; for (const id of ['fire', 'mis', 'boost', 'tgt', 'rl', 'rr', 'sc', 'ap']) G.input.show(id, fly); G.input.thrEl.style.visibility = fly ? '' : 'hidden'; } // ドッキング中は操縦ボタンを隠す
    h.begin();
    const fwd = _a.copy(FWD).applyQuaternion(p.quat);
    if (!p.docked) { const [rx, ry, rf] = h.project(_b.copy(p.pos).addScaledVector(fwd, 2000), cam); if (rf) h.reticle(rx, ry, '#6fe8ff'); }
    // 航路目標
    if (this.nav) {
      const np = this.navPos(_c), d = np.distanceTo(p.pos), [x, y, f] = h.project(np, cam);
      h.marker(x, y, f, '#ffd27a', this.nav.name, fmtDist(Math.max(0, d - (this.nav.type === 'body' ? this.nav.ref.R : 0))) + (p.sc.on ? `  ${Math.ceil(d / Math.max(sp, 1))}s` : ''), 'diamond', 2);
    }
    for (const s of this.stations) {
      if (!s.m || s.dist > 4e5 || this.nav?.ref === s) continue;
      const [x, y, f] = h.project(s.m.obj.position, cam); if (!f) continue;
      h.marker(x, y, f, s.def.color, s.dist < 60000 ? s.def.name : '', s.dist < 60000 ? fmtDist(s.dist) : '', 'diamond', 1.2);
    }
    const contacts = [], inv = _q.copy(p.quat).invert();
    for (const s of this.stations) if (s.m && s.dist < 60000) { const l = _d.copy(s.m.obj.position).sub(p.pos).applyQuaternion(inv); contacts.push({ x: l.x, y: l.y, z: l.z, color: '#6dffb0' }); }
    for (const e of this.enemies) {
      if (e.state === 'gone' || e.dist > 40000 || !e.m) continue;
      const pos = e.m.obj.position, [x, y, f] = h.project(pos, cam), dis = e.state === 'disabled', col = dis ? '#ffd27a' : '#ff5a4a';
      if (e === p.target) {
        h.marker(x, y, f, col, e.def.name + (dis ? ' [航行不能]' : ''), fmtDist(e.dist), 'bracket', clamp(e.m.radius / e.dist * G.H * 0.9 / this.u(), 2.4, 12));
        if (!dis && e.dist < 4000 && !p.docked) { const lp = _d.copy(pos).addScaledVector(e.vel, e.dist / 1500).addScaledVector(p.vel, -e.dist / 1500), [lx, ly, lf] = h.project(lp, cam); if (lf) h.lead(lx, ly, fwd.dot(_b.copy(lp).sub(p.pos).normalize()) > 0.992); }
      } else if (e.dist < 20000 && this.nav?.ref !== e) h.marker(x, y, f, col, '', '', 'bracket', 1.5);
      const l = _d.copy(pos).sub(p.pos).applyQuaternion(inv); contacts.push({ x: l.x, y: l.y, z: l.z, color: col });
    }
    for (const b of this.bolts.list) if (b.owner === 'e') { /* 省略: 弾はレーダー非表示 */ break; }
    if (!p.sc.on) h.radar(contacts);
    h.setTarget(p.target ? { name: p.target.def.name, shield: p.target.shield / p.target.maxShield, hull: p.target.hull / p.target.maxHull } : null);
    // ドッキング誘導リング
    if (p.auto?.type === 'dock') {
      const [P, D] = this.portOf(p.auto.t, _c, _d);
      for (let i = 0; i < 6; i++) { const q = _b.copy(P).addScaledVector(D, 30 + i * 45), [x, y, f] = h.project(q, cam); if (f) h.ring(x, y, 900 / Math.max(q.distanceTo(cam.position), 10) * this.u() * 2, '#6dffb0', 0.75 - i * 0.08); }
    }
    if (p.sc.charge > 0) h.text('超巡航ドライブ充填中 ' + '■'.repeat(Math.ceil((1.6 - p.sc.charge) * 5)), G.W / 2, G.H * 0.3, '#8cf', 2.8, true);
    if (this.heat > 0.3) h.text('⚠ 大気圏突入', G.W / 2, G.H * 0.24, '#ffb060', 3, true);
    const left = remaining(), ms = G.p.missions[0];
    h.setObj(`<b>ヴォイド艦隊</b> 残存 ${left}/20${ms ? `<br>任務：${ms.title} (${ms.prog}/${ms.need})` : ''}${G.tip ? `<br>${G.tip}` : ''}`);
  }
  u() { return G.H / 100; }
  _context() {
    const p = this.pl, L = [];
    if (p.dead) return G.hud.setCtx(L);
    if (p.docked) {
      const t = p.docked;
      if (t.kind === 'station') L.push({ label: 'ステーションへ', fn: () => G.go('interior', { type: 'station', id: t.def.id }) }, { label: '船内へ', cls: 'alt', fn: () => G.go('interior', { type: 'ship', from: 'space' }) }, { label: '発進', cls: 'bad', fn: () => this.undock() });
      else L.push({ label: '敵艦に突入', cls: 'bad', fn: () => G.go('interior', { type: 'enemy', id: t.def.id }) }, { label: '船内へ', cls: 'alt', fn: () => G.go('interior', { type: 'ship', from: 'space' }) }, { label: '離脱', fn: () => this.undock() });
    } else if (p.auto?.type === 'dock') L.push({ label: '誘導を中止', cls: 'bad', fn: () => { p.auto = null; if (p.m.gear) p.m.gear.visible = false; } });
    else if (!p.sc.on) {
      const hostile = this.enemies.some((e) => e.state === 'attack' && e.dist < 6000);
      const st = this.stations.filter((s) => s.m && s.dist < (s.m.dockR || 3500)).sort((a, b) => a.dist - b.dist)[0];
      const dis = this.enemies.filter((e) => e.state === 'disabled' && e.dist < 1500).sort((a, b) => a.dist - b.dist)[0];
      if (st) L.push({ label: 'ドッキング要請', fn: () => this.requestDock(st) });
      if (dis) L.push({ label: '接舷する', cls: 'alt', fn: () => this.requestDock(dis) });
      if (!hostile && !st && !dis && p.vel.length() < 600) L.push({ label: '席を立つ', cls: 'alt', fn: () => G.go('interior', { type: 'ship', from: 'space' }) });
    }
    // 戦闘曲は敵が離れたら戻す (ドッキング中・自動誘導中・超巡航中も含めて判定する)
    if (G.music === 'battle' && !this.enemies.some((e) => e.state === 'attack' && e.dist < 6000)) G.audio?.music('space');
    G.hud.setCtx(L); if (L.length && G.input.key('Enter')) L[0].fn(); // PC: Enter で先頭の状況ボタン (ドッキング要請など) を押す
  }
}

function segSphere(a, b, c, r) {
  const abx = b.x - a.x, aby = b.y - a.y, abz = b.z - a.z, acx = c.x - a.x, acy = c.y - a.y, acz = c.z - a.z, l2 = abx * abx + aby * aby + abz * abz;
  let t = l2 > 0 ? (acx * abx + acy * aby + acz * abz) / l2 : 0; t = t < 0 ? 0 : t > 1 ? 1 : t;
  const dx = acx - abx * t, dy = acy - aby * t, dz = acz - abz * t;
  return dx * dx + dy * dy + dz * dz < r * r;
}
