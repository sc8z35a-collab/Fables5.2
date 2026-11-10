// 地表モード: 大気圏内飛行 / 着陸 / 徒歩探索 / 資源採取
import * as THREE from 'three';
import { G, clamp, damp, smooth, fmtDist } from '../core/util.js';
import { buildSurface } from '../world/surface.js';
import { buildShip } from '../world/ships.js';
import { Mirror } from '../gfx/renderer.js';
import { Particles, Streaks, makeGlowSprite } from '../gfx/fx.js';
import { SHIPS, BASES, body } from '../world/defs.js';
import { save, addCargo, event, remaining, commodity } from './state.js';

const _a = new THREE.Vector3(), _b = new THREE.Vector3(), _c = new THREE.Vector3(), _q = new THREE.Quaternion(), _e = new THREE.Euler(0, 0, 0, 'YXZ'), _col = new THREE.Color();
const PAD_R = 34;

export class SurfaceMode {
  constructor() {
    const s = (this.scene = new THREE.Scene()); this.camera = new THREE.PerspectiveCamera(64, G.W / G.H, 0.3, 30000); this.far = false;
    this.sun = new THREE.DirectionalLight(0xffffff, 3); s.add(this.sun, this.sun.target); this._shadow();
    s.add((this.hemi = new THREE.HemisphereLight(0xffffff, 0x222222, 1)));
    this.mirror = new Mirror(G.gfx, 0); this.parts = new Particles(900); this.streaks = new Streaks(900, 260); s.add(this.parts.obj, this.streaks.obj);
    this.models = {}; this.env = null; this.bodyId = null; this.time = 0;
    this.ship = { pos: new THREE.Vector3(), yaw: 0, pitch: 0, yawV: 0, speed: 0, vy: 0, landed: false, auto: null, camQ: new THREE.Quaternion(), q: new THREE.Quaternion(), view: 0 };
    this.foot = false; this.fp = new THREE.Vector3(); this.fyaw = 0; this.fpitch = 0; this.bob = 0; this.sprites = [];
  }
  _shadow() { const q = G.gfx.q.shadow, l = this.sun; l.castShadow = q > 0; if (q) { const sh = l.shadow; sh.mapSize.setScalar(q); sh.map?.dispose(); sh.map = null; sh.bias = -0.0004; sh.normalBias = 0.5; const c = sh.camera; c.left = c.bottom = -150; c.right = c.top = 150; c.near = 50; c.far = 1400; c.updateProjectionMatrix(); } }
  onQuality() { this._shadow(); }
  skyMesh(id) { return this.env && this.env.id === id ? this.env.sky : null; }
  reclaimSky(m) { this.scene.add(m); }
  model(id) { if (!this.models[id]) { const m = buildShip(id); m.obj.traverse((o) => { if (o.isMesh && !o.userData.plume) o.castShadow = true; }); this.models[id] = m; } return this.models[id]; }

  load(id) {
    if (this.env) { this.scene.remove(this.env.group, this.env.sky); this.env.group.traverse((o) => { o.geometry?.dispose(); }); for (const s of this.sprites) this.scene.remove(s); this.sprites = []; }
    const e = (this.env = buildSurface(id)); this.bodyId = id; this.scene.add(e.group, e.sky);
    this.sun.color.set(e.sunCol); this.sun.intensity = e.sunInt; this.hemi.color.set(e.hemi[0]); this.hemi.groundColor.set(e.hemi[1]); this.hemi.intensity = e.hemi[2];
    this.scene.fog = new THREE.FogExp2(e.fog[0], e.fog[1]);
    const tmp = new THREE.Scene(); tmp.add(e.sky); this.scene.environment = G.gfx.pmrem.fromScene(tmp, 0, 1, 20000).texture; this.scene.environmentIntensity = 0.9; this.scene.add(e.sky);
    if (e.mirror && !e.mirror[0].userData.mir) { e.mirror[0].userData.mir = 1; this.mirror.apply(e.mirror[0], e.mirror[1]); }
    this.mirror.y = e.mirror ? 0.03 : -9999;
    for (const b of e.beacons) { const s = makeGlowSprite(b.c, b.s, 2.2); s.position.copy(b.p); s.userData.blink = b.blink; s.material.fog = false; this.scene.add(s); this.sprites.push(s); }
    this.streaks.u.uCol.value.set(e.rain[2]);
    for (const [i, n] of e.nodes.entries()) n.g.visible = G.p.flags[`n_${id}_${i}`] !== G.p.day;
  }

  async enter(o = {}) {
    const s = this.ship;
    if (!o.resume) {
      if (this.bodyId !== o.body || !this.env) this.load(o.body); else for (const [i, n] of this.env.nodes.entries()) n.g.visible = G.p.flags[`n_${o.body}_${i}`] !== G.p.day;
      if (s.m) this.scene.remove(s.m.obj);
      s.m = this.model(G.p.ship); s.id = G.p.ship; this.scene.add(s.m.obj); if (s.m.gear) s.m.gear.visible = false;
      s.clear = -(new THREE.Box3().setFromObject(s.m.gear || s.m.body).min.y - s.m.obj.position.y) + 0.05;
      s.pos.set(260, 1250, 3700); s.yaw = Math.atan2(s.pos.x, s.pos.z); s.pitch = -0.12; s.speed = 200; s.vy = 0; s.landed = false; s.auto = null; s.yawV = 0; this.foot = false;
      G.input.setThr(0.75); this._q(); s.camQ.copy(s.q);
      const first = !G.p.stats.lands[o.body]; G.hud.banner(this.env.name, `${body(o.body).name} — ${this.env.sub}`, 4);
      setTimeout(() => G.hud.msg(first ? `${body(o.body).name} に初めて降り立つ。「オートランド」で着陸パッドへ自動着陸できる。` : '着陸パッドへ接近中。「オートランド」が使えます。', 'good', 8), 1500);
    } else {
      if (o.foot) { this.foot = true; const e = this.env; if (o.door) { this.fp.set(e.door[0], 0, e.door[1]); this.fyaw = e.door[2] + Math.PI; } else { this.fp.set(s.pos.x + e.foot[0] + SHIPS[s.id].radius * 0.2, 0, s.pos.z + Math.min(e.foot[1], SHIPS[s.id].radius * 0.6 + 6)); this.fyaw = 0; } this.fpitch = 0; }
      else this.foot = false;
    }
    const e = this.env; G.gfx.look(...e.look); G.gfx.fx.uHeat.value = e.heat || 0; G.gfx.fx.uWarp.value = 0; G.gfx.fx.uSun.value.z = 0;
    this.camera.aspect = G.W / G.H; this.camera.updateProjectionMatrix();
    this._mode(); G.hud.show(true); G.hud.setTarget(null); G.audio?.music(e.music);
    this._cam(0, true);
  }
  exit() { G.gfx.fx.uHeat.value = 0; G.hud.setCtx([]); G.hud.setPrompt(''); G.audio?.engine(0, 0, 0); G.hud.damage(0); }
  _mode() {
    if (this.foot) { G.hud.setMode('fps'); G.input.setButtons([{ id: 'run', label: '走る', cls: 'sm p-run', key: 'ShiftLeft,ShiftRight' }], 'fps'); }
    else { G.hud.setMode('atmo'); G.input.setButtons([{ id: 'boost', label: 'ブースト', cls: 'p-boost', key: 'ShiftLeft,ShiftRight' }, { id: 'up', label: '▲<br>上昇', cls: 'p-up', key: 'KeyR,Space' }, { id: 'dn', label: '▼<br>下降', cls: 'p-dn', key: 'KeyF,KeyC' }, { id: 'view', label: '視点', cls: 'sm p-view', key: 'KeyV' }], 'atmo'); }
  }
  _q() { const s = this.ship; s.q.setFromEuler(_e.set(s.pitch, s.yaw, 0)); return s.q; }
  /** 地面 (パッド・水面を含む) の高さ */
  ground(x, z) { const e = this.env; let h = e.H(x, z); if (e.water != null) h = Math.max(h, e.water); if (Math.hypot(x, z) < PAD_R + 1.5) h = Math.max(h, e.padY); return h; }

  update(dt) {
    this.time += dt; const e = this.env, s = this.ship, pl = G.space.pl;
    for (const f of e.anim) f(dt, this.time);
    for (const sp of this.sprites) if (sp.userData.blink) sp.material.opacity = (this.time * sp.userData.blink) % 1 < 0.15 ? 1 : 0.05;
    if (this.foot) this._walk(dt); else this._fly(dt);
    this._cam(dt);
    // 降水・降灰・砂塵
    const cv = this._cv || (this._cv = new THREE.Vector3()), cp = this.camera.position; if (this._lp) cv.copy(cp).sub(this._lp).multiplyScalar(1 / Math.max(dt, 1e-3)); else this._lp = new THREE.Vector3(); this._lp.copy(cp);
    this.streaks.update(dt, _a.copy(cv).sub(e.rain[0]), 0.02, e.rain[1], 3.2);
    if (e.smoke && Math.random() < dt * 40) this.parts.emit(e.smoke[0] + (Math.random() - 0.5) * 200, e.smoke[1], e.smoke[2] + (Math.random() - 0.5) * 200, (Math.random() - 0.5) * 60, 120 + Math.random() * 160, (Math.random() - 0.5) * 60, 3, 0.9, 0.2, 160 + Math.random() * 200, 5, 0.25, 12);
    this.parts.update(dt, G.gfx.ph / (2 * Math.tan(this.camera.fov * Math.PI / 360)));
    // 光源は対象に追従
    const t = this.foot ? this.fp : s.pos; this.sun.position.copy(t).addScaledVector(e.sunDir, 600); this.sun.target.position.copy(t); e.sky.position.copy(this.camera.position);
    pl.energy = Math.min(pl.st.energy, pl.energy + pl.st.energy * 0.1 * dt);
    this._hud();
  }

  // ───────────────────────── 飛行 ─────────────────────────
  _fly(dt) {
    const s = this.ship, e = this.env, inp = G.input, ax = inp.axes(), pl = G.space.pl, st = pl.st;
    if (inp.hit('view')) s.view = (s.view + 1) % 2;
    if (inp.keys.KeyZ) inp.setThr(1); if (inp.keys.KeyX) inp.setThr(0);
    const gy = this.ground(s.pos.x, s.pos.z), alt = s.pos.y - gy - s.clear; s.alt = alt;
    if (s.landed) { s.speed = 0; s.vy = 0; if (e.hazard?.(s.pos.x, s.pos.z, e.H(s.pos.x, s.pos.z))) this._hull(12 * dt, '溶岩で船体が損傷中！ 離陸せよ'); G.audio?.engine(0.05, 0, 0); for (const p of s.m.plumes) p.material.uniforms.uPow.value = 0.05; return; }
    if (s.auto) return this._auto(dt, alt);
    s.yawV = damp(s.yawV, -ax.x * st.turn * 0.62, 5, dt); s.yaw += s.yawV * dt;
    s.pitch = clamp(s.pitch + ax.y * (G.p.invertY ? -1 : 1) * 0.85 * dt, -1.15, 1.15); if (Math.abs(ax.y) < 0.05 && s.speed < 60) s.pitch = damp(s.pitch, 0, 1.5, dt);
    const boost = inp.down('boost') && pl.energy > 4; if (boost) pl.energy -= 18 * dt;
    s.speed = damp(s.speed, inp.thr * (boost ? 430 : 250), boost ? 1.6 : 1.1, dt);
    s.vy = damp(s.vy, ((inp.down('up') ? 1 : 0) - (inp.down('dn') ? 1 : 0)) * 46, 3, dt);
    const fwd = _a.set(0, 0, -1).applyQuaternion(this._q()); s.pos.addScaledVector(fwd, s.speed * dt); s.pos.y += s.vy * dt;
    s.m.tilt.rotation.z = damp(s.m.tilt.rotation.z, s.yawV * 0.55, 4, dt);
    const vdown = -(fwd.y * s.speed + s.vy), g2 = this.ground(s.pos.x, s.pos.z) + s.clear;
    if (e.floor != null && s.pos.y < e.floor + 60) { s.pos.y = e.floor + 60; s.vy = 20; if (!this._w1) { this._w1 = 1; G.hud.msg('雲海の下は超高圧層です。上昇してください！', 'warn'); setTimeout(() => { this._w1 = 0; }, 5000); } }
    if (s.pos.y <= g2) {
      const sl = Math.abs(e.H(s.pos.x + 6, s.pos.z) - e.H(s.pos.x - 6, s.pos.z)) / 12 + Math.abs(e.H(s.pos.x, s.pos.z + 6) - e.H(s.pos.x, s.pos.z - 6)) / 12, onPad = Math.hypot(s.pos.x, s.pos.z) < PAD_R;
      s.pos.y = g2;
      if (s.speed > 55 || vdown > 16) { this._hull(s.speed * 0.25 + vdown * 1.5, '激しく接地した！'); s.vy = 14; s.speed *= 0.5; s.pitch = Math.max(s.pitch, 0.12); this.shake = 1; this.parts.burst(s.pos, 40, 30, _col.set('#ffd9a0'), 1.2, 0.8); G.audio?.sfx('hit'); }
      else if (!onPad && sl > 0.45) { s.vy = 6; if (!this._w2) { this._w2 = 1; G.hud.msg('傾斜がきつくて着陸できません。平らな場所かパッドへ。', 'warn'); setTimeout(() => { this._w2 = 0; }, 4000); } }
      else if (s.speed < 55) this._landed();
    }
    // 離脱
    if (s.pos.y > 5200 || Math.hypot(s.pos.x, s.pos.z) > 7000) { if (!this.leaving) { this.leaving = true; G.hud.banner('軌道へ上昇', body(e.id).name + ' を離脱', 2.5); G.audio?.sfx('warp'); G.go('space', { orbit: e.id }, { flash: true }).then(() => { this.leaving = false; }); } }
    const pw = 0.15 + inp.thr * 0.85 + (boost ? 0.7 : 0); for (const p of s.m.plumes) { p.material.uniforms.uPow.value = damp(p.material.uniforms.uPow.value, pw, 6, dt); p.scale.z = 0.25 + p.material.uniforms.uPow.value * 0.9; }
    G.audio?.engine(inp.thr, boost ? 1 : 0, 0);
  }
  _auto(dt, alt) {
    const s = this.ship, e = this.env, a = s.auto, tx = 0, tz = 0, d = Math.hypot(s.pos.x - tx, s.pos.z - tz);
    if (G.input.axes().x ** 2 + G.input.axes().y ** 2 > 0.8) { s.auto = null; G.hud.msg('オートランドを中止 — 手動操縦'); return; }
    s.pitch = damp(s.pitch, 0, 2, dt); s.m.tilt.rotation.z = damp(s.m.tilt.rotation.z, 0, 3, dt);
    if (a.ph === 0) {
      const sp = Math.min(150, Math.max(8, d * 0.45)), want = Math.atan2(s.pos.x - tx, s.pos.z - tz); let dy = want - s.yaw; dy = Math.atan2(Math.sin(dy), Math.cos(dy)); if (d > 20) s.yaw += clamp(dy, -1.2 * dt, 1.2 * dt);
      s.speed = damp(s.speed, sp, 2, dt); s.pos.x += (tx - s.pos.x) / (d || 1) * s.speed * dt; s.pos.z += (tz - s.pos.z) / (d || 1) * s.speed * dt;
      const ty = e.padY + s.clear + 55 + Math.min(d * 0.25, 500); s.pos.y = damp(s.pos.y, Math.max(ty, this.ground(s.pos.x, s.pos.z) + s.clear + 30), 0.9, dt);
      if (d < 3) { a.ph = 1; if (s.m.gear) s.m.gear.visible = true; G.hud.msg('パッド直上 — 降下開始'); }
    } else { s.speed = 0; const g = e.padY + s.clear; s.pos.y -= Math.max(2.2, Math.min(16, (s.pos.y - g) * 0.45)) * dt; if (s.pos.y <= g) { s.pos.y = g; this._landed(); } }
    for (const p of s.m.plumes) p.material.uniforms.uPow.value = 0.4; G.audio?.engine(0.4, 0, 0);
  }
  _landed() {
    const s = this.ship, e = this.env; s.landed = true; s.auto = null; s.speed = 0; s.vy = 0; s.pitch = 0; G.input.setThr(0); if (s.m.gear) s.m.gear.visible = true; s.m.tilt.rotation.set(0, 0, 0);
    this.parts.burst(_a.copy(s.pos).setY(s.pos.y - s.clear + 0.3), 50, 14, _col.set('#cfd8e0'), 2.2, 1.0, null, 1.2); G.audio?.sfx('land'); this.shake = 0.4;
    const first = !G.p.stats.lands[e.id]; G.p.stats.lands[e.id] = (G.p.stats.lands[e.id] || 0) + 1; G.p.day++; save();
    G.hud.banner('着陸完了', e.name + (first ? ' — 初到達' : '')); if (first) { G.p.credits += 1500; G.hud.msg(`探査ボーナス：${body(e.id).name} 初着陸 +1,500 Cr`, 'good', 7); }
  }
  takeoff() { const s = this.ship; s.landed = false; s.vy = 16; s.pos.y += 0.5; G.input.setThr(0.15); if (s.m.gear) setTimeout(() => { if (!s.landed) s.m.gear.visible = false; }, 2500); G.audio?.sfx('undock'); G.hud.msg('離陸。高度 5km を超えると軌道へ離脱します。', 'good'); }
  _hull(d, msg) { const pl = G.space.pl; pl.hull -= d; pl.lastHit = G.space.time; G.p.ships[pl.id].hull = clamp(pl.hull / pl.st.hull, 0, 1); if (msg && !this._w3) { this._w3 = 1; G.hud.msg(msg, 'warn'); setTimeout(() => { this._w3 = 0; }, 3000); }
    if (pl.hull <= 0 && !this.dead) { this.dead = true; G.hud.banner('船体喪失', '救難艇が回収中…', 4); const fee = Math.round(G.p.credits * 0.1); G.audio?.sfx('boom'); setTimeout(() => { G.p.credits -= fee; G.p.ships[pl.id].hull = 1; this.dead = false; G.go('space', { docked: G.p.last }).then(() => G.hud.msg(`ステーションで修復されました (費用 ${fee.toLocaleString()} Cr)`, 'warn', 8)); }, 3000); } }

  // ───────────────────────── 徒歩 ─────────────────────────
  ok(x, z) {
    const e = this.env, s = this.ship; if (Math.hypot(x, z) > e.walkR) return false;
    for (const c of e.cols) { const dx = x - c.x, dz = z - c.z, r = c.r + 0.4; if (dx * dx + dz * dz < r * r) return false; }
    for (const q of e.rects) if (x > q[0] - 0.4 && x < q[2] + 0.4 && z > q[1] - 0.4 && z < q[3] + 0.4) return false;
    const sr = Math.min(SHIPS[s.id].radius * 0.4, 8); if ((x - s.pos.x) ** 2 + (z - s.pos.z) ** 2 < sr * sr) return false;
    const h = e.H(x, z); if (e.water != null && h < e.water - 0.2 && Math.hypot(x, z) > PAD_R) return false;
    return true;
  }
  _walk(dt) {
    const inp = G.input, ax = inp.axes(), p = this.fp, e = this.env;
    this.fyaw -= inp.look.x * 0.0052; this.fpitch = clamp(this.fpitch - inp.look.y * 0.0052, -1.3, 1.3); if (inp.keys.KeyQ) this.fyaw += dt * 2;
    const sp = inp.down('run') ? 9.5 : 5.2, sn = Math.sin(this.fyaw), cs = Math.cos(this.fyaw), dx = (-sn * ax.y + cs * ax.x) * sp * dt, dz = (-cs * ax.y - sn * ax.x) * sp * dt;
    if (dx || dz) { if (this.ok(p.x + dx, p.z + dz)) { p.x += dx; p.z += dz; } else if (this.ok(p.x + dx, p.z)) p.x += dx; else if (this.ok(p.x, p.z + dz)) p.z += dz; else if (Math.hypot(p.x + dx, p.z + dz) > e.walkR && !this._w4) { this._w4 = 1; G.hud.msg('これ以上先は危険だ。船に戻ろう。', 'warn'); setTimeout(() => { this._w4 = 0; }, 5000); }
      const pb = this.bob; this.bob += Math.hypot(dx, dz) * 1.7; if (Math.floor(pb / Math.PI) !== Math.floor(this.bob / Math.PI)) G.audio?.sfx('step'); }
    p.y = damp(p.y, this.ground(p.x, p.z), 14, dt);
    if (e.hazard?.(p.x, p.z, e.H(p.x, p.z))) { G.p.hp -= 25 * dt; if (!this._w5) { this._w5 = 1; G.hud.msg('熱い！ 溶岩から離れろ！', 'warn'); G.audio?.sfx('hurt'); setTimeout(() => { this._w5 = 0; }, 2000); } if (G.p.hp <= 0) { G.p.hp = 50; this.fp.set(this.ship.pos.x, 0, this.ship.pos.z + 14); G.hud.msg('危ないところで船の近くへ退避した。', 'warn'); } }
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
    if (i.act === 'board') return G.ui.talk(SHIPS[this.ship.id].name, '着陸中の自機。', [{ label: '船内に入る', fn: () => G.go('interior', { type: 'ship', from: 'surface', body: e.id, via: 'airlock' }) }, { label: '操縦席へ', cls: 'gold', fn: () => { this.foot = false; this._mode(); this._cam(0, true); } }, { label: 'やめる' }]);
    if (i.act === 'node') {
      const n = addCargo(i.n.item, 1); if (!n) return G.hud.msg('貨物室がいっぱいで積めません', 'warn');
      i.n.g.visible = false; G.p.flags[`n_${e.id}_${i.i}`] = G.p.day; G.audio?.sfx('pickup'); this.parts.burst(_a.set(i.x, this.ground(i.x, i.z) + 1, i.z), 40, 6, _col.set('#ffffff'), 0.4, 0.9, null, 1);
      G.hud.msg(`${commodity(i.n.item).name} ×1 を採取した`, 'good'); event('sample', { body: e.id }); save();
    }
  }

  _cam(dt, snap) {
    const c = this.camera, s = this.ship, e = this.env;
    if (this.foot) { c.position.set(this.fp.x, this.fp.y + 1.68 + Math.sin(this.bob * 2) * 0.03, this.fp.z); c.rotation.set(this.fpitch, this.fyaw, 0, 'YXZ'); c.fov = 70; c.near = 0.1; }
    else {
      s.m.obj.position.copy(s.pos); s.m.obj.quaternion.copy(this._q()); c.near = 0.5;
      if (snap) s.camQ.copy(s.q); else s.camQ.slerp(s.q, 1 - Math.exp(-4 * dt));
      if (s.view === 1 && !s.landed) { c.position.copy(s.m.cockpit).applyQuaternion(s.q).add(s.pos); c.quaternion.copy(s.q); s.m.body.visible = false; }
      else { s.m.body.visible = true; const k = clamp(s.speed / 430, 0, 1), d = s.m.cam.d * (s.landed ? 1.25 : 1 + k * 0.2); c.position.set(0, s.m.cam.h * (s.landed ? 0.75 : 1), d).applyQuaternion(s.camQ).add(s.pos); c.quaternion.copy(s.camQ); c.rotateX(-0.07);
        const gy = this.ground(c.position.x, c.position.z) + 1.5; if (c.position.y < gy) c.position.y = gy; }
      c.fov = damp(c.fov, 64 + clamp(s.speed / 430, 0, 1) * 12, 4, dt || 1);
    }
    if (this.shake > 0.01) { this.shake *= Math.exp(-4 * (dt || 0.016)); c.position.x += (Math.random() - 0.5) * this.shake; c.position.y += (Math.random() - 0.5) * this.shake; }
    c.updateProjectionMatrix(); c.updateMatrixWorld();
  }
  _hud() {
    const h = G.hud, s = this.ship, e = this.env, pl = G.space.pl, c = this.camera;
    h.begin(); h.setLoc(e.name, `${body(e.id).name} — ${e.sub}`);
    const ms = G.p.missions.find((m) => m.type === 'survey' && m.body === e.id) || G.p.missions[0];
    h.setObj(`<b>ヴォイド艦隊</b> 残存 ${remaining()}/20${ms ? `<br>任務：${ms.title} (${ms.prog}/${ms.need})` : ''}`);
    if (this.foot) {
      h.bar('sh', 1); h.bar('hull', G.p.hp / 100); h.damage(G.p.hp < 35 ? 0.4 : 0); G.p.hp = Math.min(100, G.p.hp + dtHeal);
      const sp = _a.copy(s.pos); let [x, y, f] = h.project(sp, c); h.marker(x, y, f, '#6fe8ff', SHIPS[s.id].name, fmtDist(Math.hypot(s.pos.x - this.fp.x, s.pos.z - this.fp.z)), 'diamond', 1.4);
      for (const it of e.items) { const p = _b.set(it.x, this.ground(it.x, it.z) + 3, it.z); [x, y, f] = h.project(p, c); h.marker(x, y, f, '#ffd27a', BASES[e.id].name, fmtDist(Math.hypot(it.x - this.fp.x, it.z - this.fp.z)), 'diamond', 1.2); }
      for (const n of e.nodes) { if (!n.g.visible) continue; const d = Math.hypot(n.x - this.fp.x, n.z - this.fp.z); if (d > 420) continue; [x, y, f] = h.project(_b.set(n.x, this.ground(n.x, n.z) + 2.4, n.z), c); if (f) h.marker(x, y, f, '#6dffb0', d < 60 ? '資源' : '', fmtDist(d), 'circle', 0.9); }
      return;
    }
    h.bar('sh', pl.shield / pl.st.shield); h.bar('hull', pl.hull / pl.st.hull); h.bar('en', pl.energy / pl.st.energy); h.damage(pl.hull < pl.st.hull * 0.3 ? 0.4 : 0);
    h.setSpeed(`${Math.round(s.speed)} m/s`, s.landed ? 'LANDED' : s.auto ? 'AUTO LAND' : `高度 ${Math.max(0, s.alt || 0).toFixed(0)} m`);
    const pd = Math.hypot(s.pos.x, s.pos.z, s.pos.y - e.padY); let [x, y, f] = h.project(_a.set(0, e.padY + 2, 0), c);
    if (!s.landed) { h.marker(x, y, f, '#ffd27a', '着陸パッド', fmtDist(pd), 'diamond', 1.8); if (s.view === 0) { [x, y, f] = h.project(_b.set(0, 0, -1).applyQuaternion(s.q).multiplyScalar(800).add(s.pos), c); if (f) h.reticle(x, y, '#6fe8ff', 0.8); } }
    if (s.pos.y > 3800 && !s.landed) h.text(`軌道離脱まで ${(5200 - s.pos.y).toFixed(0)} m`, G.W / 2, G.H * 0.26, '#8cf', 2.6, true);
    const L = [];
    if (s.landed) L.push({ label: '降りる', fn: () => { this.foot = true; this.fp.set(s.pos.x + SHIPS[s.id].radius * 0.2, s.pos.y - s.clear, s.pos.z + Math.min(SHIPS[s.id].radius * 0.6 + 6, 22)); this.fyaw = 0; this.fpitch = 0; this._mode(); } }, { label: '船内へ', cls: 'alt', fn: () => G.go('interior', { type: 'ship', from: 'surface', body: e.id }) }, { label: '離陸', cls: 'bad', fn: () => this.takeoff() });
    else if (s.auto) L.push({ label: '中止', cls: 'bad', fn: () => { s.auto = null; } });
    else if (Math.hypot(s.pos.x, s.pos.z) < 2600 && s.pos.y < 2200) L.push({ label: 'オートランド', fn: () => { s.auto = { ph: 0 }; G.audio?.sfx('nav'); G.hud.msg(`${e.name} 管制：着陸を許可。自動誘導を開始します。`, 'comm'); } });
    h.setCtx(L);
  }
  render(dt) {
    const e = this.env; if (e.mirror) { this.mirror.hide = this.foot ? [] : []; this.mirror.render(this.scene, this.camera); }
    G.gfx.render(dt, this.scene, this.camera, null);
  }
}
const dtHeal = 0.02;
