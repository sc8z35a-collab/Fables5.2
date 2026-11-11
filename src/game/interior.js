// 歩行モード (ステーション内・船内・敵艦内・惑星拠点): 一人称操作 / 照明 / 反射床 / 艦内戦闘
import * as THREE from 'three';
import { G, clamp, damp } from '../core/util.js';
import { buildInterior, walkable, roomAt, floorY } from '../world/interior.js';
import { blueprint } from '../world/blueprints.js';
import { makeDrone } from '../world/props.js';
import { buildShip } from '../world/ships.js';
import { Mirror } from '../gfx/renderer.js';
import { Particles, makeGlowSprite } from '../gfx/fx.js';
import { syncDamage } from '../gfx/damage.js';
import { mat, glow, aoMat } from '../gfx/textures.js';
import { ENEMIES, SHIPS, BASES, station, body } from '../world/defs.js';
import { stats, save, earn, addCargo, event, remaining } from './state.js';

const _a = new THREE.Vector3(), _b = new THREE.Vector3(), _c = new THREE.Vector3(), _q = new THREE.Quaternion();
const TALK = {
  mech: ['「機体の調子はどうだ？ 格納庫サービスの端末で、3 隻のどれにでも乗り換えられるぜ」', '「ミサイルは撃ったら補給を忘れるな。整備タブでやってやる」'],
  tourist: ['「展望デッキから見る地球は最高よ。あなたも見てきたら？」', '「ゼファーの雲海ラウンジに行くのが夢なの。黄金の環が空いっぱいに広がるんですって」'],
  trader: ['「ここで電子部品を仕入れて、ヴァルカンや天文台で売る。それだけで船が一隻買えるさ」', '「氷晶やマグマ晶は惑星に降りて自分で採るのが一番だ。元手いらずだからな」'],
  dock: ['「ヴァルカンへようこそ。ここの改修は他より 25% 安い。腕は保証する」', '「管制デッキの窓から、建造中の巡洋艦が見える。見ていけ」'],
  ctrl: ['「ヴォイド艦隊はサハル宙域に 4 隻。任務端末に討伐依頼が出ているぞ」'],
  sci: ['「惑星で採れたサンプルは研究ラボへ。解析すれば探査データになります」', '「星系儀アトリウムのホログラムは実際の軌道を映しています。触れると星図が開きますよ」'],
  guard: ['「司令部は通路の先だ。賞金首の情報が欲しければ司令官に聞け」'],
  arm: ['「敵のシールドを剥がしてから船体を削れ。動けなくなったら接舷のチャンスだ」', '「艦内戦では物陰を使え。ドローンの弾は遅い、見てから避けられる」'],
  prisoner: ['「へっ…ヴォイドの本隊はゼファーの環の陰にいる。5 隻だ。お前に落とせるかな」', '「オレたちの艦にはどれも制御コアがある。そいつを握られたら終わりさ」'],
  thug: ['「面倒は起こすなよ。ここじゃ金さえ払えば誰でも客だ」'],
  drunk: ['「うぃ〜…スロットで 7 が三つ揃ったことがあるんだ…ほんとだぞ…」', '「情報屋は闇市の奥だ…手負いの敵艦の場所を売ってくれる…」'],
  dealer: ['「運試しはいかが？ 当店のスロットは星系一の配当率でございます」'],
  miner: ['「外は灼熱だ。溶岩には近づくなよ。マグマ晶は光ってるからすぐ分かる」'],
  colonist: ['「このドームの木は、地球から運んだ苗を三世代かけて育てたものなんです」', '「砂漠香料は外の岩場に自生しています。採ってきたら香料市場へどうぞ」'],
  doc: ['「怪我をしたら医療ポッドへ。艦内戦のあとは必ず検査を受けてくださいね」', '「リングの人工重力は 0.9G。地球育ちには少し軽く感じるでしょう」'],
  design: ['「設計図は芸術だ。ハヤテの翼の曲線は、私が三年かけて描いたんだよ」', '「改修は工作室の端末で。エンジンと装甲、どちらを先に強化するかは腕の見せ所だ」'],
  lib: ['「ここには星系の航海記録がすべて残っています。静かにどうぞ」', '「グラキエスのオーロラは、地磁気ではなく氷床下の結晶が発光源だという説があるのですよ」'],
  staff: ['「ヴォイド艦隊は星ごとに小隊を置いている。脅威度の低い地球宙域から叩くのが定石だ」', '「敵艦を拿捕すれば賞金は二倍。制御コアは必ず艦橋の中央にある」'],
  ice: ['「今夜はオーロラが特に強い。外に出て空を見てごらん」', '「氷晶は青く光る柱だ。天文台のラボに持ち込めば喜ばれるよ」'],
};

export class InteriorMode {
  constructor() {
    const s = (this.scene = new THREE.Scene()); this.camera = new THREE.PerspectiveCamera(72, G.W / G.H, 0.08, 400); s.add(this.camera);
    s.add((this.hemi = new THREE.HemisphereLight(0xffffff, 0x222222, 1)));
    this.pool = []; for (let i = 0; i < (G.gfx.q.cap <= 1 ? 4 : 6); i++) { const l = new THREE.PointLight(0xffffff, 0, 24, 2); s.add(l); this.pool.push(l); }
    this.mirror = new Mirror(G.gfx, 0); this.parts = new Particles(500); s.add(this.parts.obj);
    this.cache = new Map(); this.cur = null; this.pos = new THREE.Vector3(); this.yaw = 0; this.pitch = 0; this.bob = 0; this.far = true;
    this.frameQ = new THREE.Quaternion(); this.farQ = new THREE.Quaternion(); this.camU = new THREE.Vector3(); this.ships = {};
    // 敵弾プール & 自弾トレーサー & 携行ブラスター
    this.shots = []; for (let i = 0; i < 20; i++) { const m = new THREE.Mesh(new THREE.SphereGeometry(0.09, 8, 6), glow('#ff4030', 6)); m.add(makeGlowSprite('#ff4030', 0.7, 1.5)); m.visible = false; s.add(m); this.shots.push({ m, v: new THREE.Vector3(), life: 0, dmg: 0 }); }
    this.tracer = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.012, 1, 5).rotateX(Math.PI / 2), new THREE.MeshBasicMaterial({ color: new THREE.Color(4, 8, 10), transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false })); this.tracer.visible = false; s.add(this.tracer);
    const gm = mat('flat', { color: 0x6a727c, rough: 0.35, metal: 0.9 }), gk = mat('flat', { color: 0x16181c, rough: 0.6, metal: 0.4 }), gun = (this.gun = new THREE.Group()), gp = (g, m, x, y, z) => { const o = new THREE.Mesh(g, m); o.position.set(x, y, z); gun.add(o); return o; };
    gp(new THREE.BoxGeometry(0.05, 0.075, 0.3), gm, 0, 0, 0); gp(new THREE.CylinderGeometry(0.016, 0.02, 0.2, 10).rotateX(Math.PI / 2), gk, 0, 0.012, -0.24); gp(new THREE.BoxGeometry(0.04, 0.13, 0.06), gk, 0, -0.09, 0.09).rotation.x = 0.25;
    gp(new THREE.BoxGeometry(0.056, 0.02, 0.16), gk, 0, 0.046, -0.02); gp(new THREE.BoxGeometry(0.008, 0.012, 0.18), glow('#4df0ff', 2.2), 0.029, 0.01, -0.03); gp(new THREE.BoxGeometry(0.008, 0.012, 0.18), glow('#4df0ff', 2.2), -0.029, 0.01, -0.03);
    gun.position.set(0.2, -0.17, -0.42); gun.visible = false; this.camera.add(gun);
    this.fireT = 0; this.suit = 60; this.lastHurt = -9; this.time = 0;
  }
  ship(id) { if (!this.ships[id]) { const m = buildShip(id); for (const p of m.plumes) p.visible = false; for (const g of m.glows) g.visible = false; if (m.gear) m.gear.visible = true; this.ships[id] = m; } syncDamage(this.ships[id], id); return this.ships[id]; }
  dropShip(id) { const m = this.ships[id]; if (m) { m.obj.parent?.remove(m.obj); delete this.ships[id]; } }

  async enter(o) {
    this.ctx = o; const id = o.type === 'ship' ? G.p.ship : o.id || o.body, key = o.type + ':' + id;
    if (this.cur) this.scene.remove(this.cur.group);
    let it = this.cache.get(key);
    if (!it) {
      const def = o.type === 'enemy' ? ENEMIES.find((e) => e.id === id) : null, bp = blueprint(o.type, id, def);
      it = buildInterior(bp); it.key = key; it.def = def;
      for (const m of it.floorMats) if (!m.userData.mir) { m.userData.mir = 1; this.mirror.apply(m, bp.theme.gloss ?? 0.6); }
      if (bp.drones) for (const [x, z] of bp.drones) { const g = makeDrone(def.glow); it.group.add(g); it.drones.push({ g, x, z, hx: x, hz: z, hp: 34 + def.tier * 16, alive: true, fireT: 1 + Math.random() * 2, ph: x * 3 + z, alert: false }); }
      if (o.type !== 'enemy') { this.cache.set(key, it); if (this.cache.size > 4) { const k = this.cache.keys().next().value, old = this.cache.get(k); this.cache.delete(k); old.group.traverse((n) => n.geometry?.dispose()); } }
    } else if (it.drones.length) for (const d of it.drones) { d.alive = true; d.g.visible = true; }
    this.cur = it; this.scene.add(it.group);
    const th = it.bp.theme; this.hemi.color.set(th.amb[0]); this.hemi.groundColor.set(th.amb[1]); this.hemi.intensity = th.amb[2];
    // 遠景の向き: 船内=実際の機首方向 / ステーション=主窓が惑星を向く
    const sp = G.space; this.far = true; this._sky?.(false);
    if (o.type === 'station') { const st = sp.station(id), b = body(st.def.body); this.camU.copy(st.uni); const v = it.bp.view || [0, -1]; this.frameQ.setFromUnitVectors(_a.set(v[0], 0, v[1]).normalize(), _b.fromArray(b.pos).sub(st.uni).normalize()); }
    else if (o.type === 'enemy') { const e = sp.enemies.find((x) => x.def.id === id); this.enemy = e; this.camU.copy(e.uni); this.frameQ.copy(e.quat); }
    else if (o.type === 'ship' && o.from !== 'surface') { sp.uni(sp.pl.pos, this.camU); this.frameQ.copy(sp.pl.quat); }
    else { this.far = false; this._sky?.(true, o.body || G.modes.surface.bodyId); }
    // 出現位置
    const s = o.at || it.bp.spawn; this.pos.set(s[0], 0, s[1]); this.yaw = s[2] ?? 0; this.pitch = 0;
    if (it.slot && !o.at) this.yaw = Math.atan2(s[0] - it.slot.x, s[1] - it.slot.z);
    if (o.type === 'ship' && o.via === 'airlock') { const ex = it.items.find((i) => i.act === 'exit'); if (ex) { const r = roomAt(it, ex.x, ex.z - 1.6); this.pos.set(ex.x, 0, ex.z - 1.8); this.yaw = 0; if (!r) this.pos.set(s[0], 0, s[1]); } }
    this.pos.y = floorY(it, this.pos.x, this.pos.z); this.lastRoom = null; this._vis(true);
    this._slot();
    // 反射プローブ (初回のみ)
    this._lights(0, true);
    if (!it.env) { const r = G.gfx.renderer, rt = new THREE.WebGLCubeRenderTarget(128, { type: THREE.HalfFloatType }), cc = new THREE.CubeCamera(0.1, 300, rt); cc.position.set(this.pos.x, 1.7, this.pos.z); this.scene.environment = null; this.mirror.u.uMirrorOn.value = 0; r.autoClear = true; cc.update(r, this.scene); r.autoClear = false; r.setRenderTarget(null); it.env = G.gfx.pmrem.fromCubemap(rt.texture).texture; rt.dispose(); }
    this.scene.environment = it.env; this.scene.environmentIntensity = 0.5; G.gfx.look(0.4, 1.15, 0.92);
    this.hostile = !!it.bp.hostile; this.gun.visible = this.hostile; this.suit = 60; for (const sh of this.shots) { sh.life = 0; sh.m.visible = false; }
    this.camera.aspect = G.W / G.H; this.camera.fov = 72; this.camera.updateProjectionMatrix();
    G.hud.setMode('fps'); G.hud.show(true); G.hud.setTarget(null); G.gfx.fx.uSun.value.z = 0; G.gfx.fx.uWarp.value = 0; G.gfx.fx.uHeat.value = 0;
    G.input.setButtons([{ id: 'run', label: '走る', cls: 'sm p-run', key: 'ShiftLeft,ShiftRight' }, ...(this.hostile ? [{ id: 'ffire', label: '射撃', cls: 'big p-ffire', key: 'Space' }] : [])], this.hostile ? 'fpsH' : 'fps');
    G.audio?.music(it.bp.music || 'interior'); G.audio?.engine(0, 0, 0);
    if (this.hostile) { G.hud.banner(it.bp.name, '艦橋の制御コアを掌握せよ', 3.5); G.hud.msg('警備ドローンが巡回中。「射撃」で撃破し、通路の奥の艦橋を目指せ。', 'warn', 8); }
    else G.hud.banner(it.bp.name, it.bp.sub, 2.6);
    this._cam(0); this._far(0);
  }
  exit() { G.hud.setPrompt(''); G.hud.setCtx([]); G.hud.damage(0); this._sky?.(false); }
  onQuality() { this.cache.forEach((it) => { it.env = null; }); }
  /** 惑星上では空ドームを背景に使う */
  /** 地上の建物・着陸中の船内: 窓の外に地表の空を描く。空の球 (半径 9000m) は室内カメラの描画距離 (400m) を超えて切り取られ窓が真っ黒になるので、室内では縮めて使う */
  _sky(on, bodyId) { const sm = G.modes.surface; if (!on) { if (this.skyM) { this.skyM.scale.setScalar(1); this.scene.remove(this.skyM); sm.reclaimSky(this.skyM); this.skyM = null; } return; } const m = sm?.skyMesh?.(bodyId); if (m) { m.scale.setScalar(0.03); this.scene.add(m); this.skyM = m; } }
  /** 格納庫に自機を置く */
  _slot() {
    const it = this.cur; if (this.shipObj) { this.shipObj.parent?.remove(this.shipObj); this.shipObj = null; }
    it.cols = it.cols.filter((c) => !c.ship); it.items = it.items.filter((i) => i.act !== 'ramp');
    if (!it.slot) return; const m = this.ship(G.p.ship), o = m.obj, r = SHIPS[G.p.ship].radius;
    const minY = new THREE.Box3().setFromObject(m.gear || m.body).min.y - o.position.y; o.position.set(it.slot.x, -minY, it.slot.z); o.rotation.set(0, Math.PI, 0); m.tilt.rotation.set(0, 0, 0);
    it.group.add(o); this.shipObj = o; it.cols.push({ x: it.slot.x, z: it.slot.z, r: Math.min(r * 0.42, 8), ship: 1 });
    if (!this.shipShadow) { this.shipShadow = new THREE.Mesh(new THREE.PlaneGeometry(1, 1).rotateX(-Math.PI / 2), aoMat('blob')); this.shipShadow.renderOrder = 2; }
    this.shipShadow.scale.set(r * 1.5, 1, SHIPS[G.p.ship].len * 1.25); this.shipShadow.position.set(it.slot.x, 0.02, it.slot.z); it.group.add(this.shipShadow);
    it.items.push({ x: it.slot.x, z: it.slot.z, y: 1.5, r: Math.min(r * 0.42, 8) + 4.5, label: `${SHIPS[G.p.ship].name} に乗船する`, act: 'ramp', wide: 1 });
  }
  refreshShip() { if (this.cur?.slot) this._slot(); }

  update(dt) {
    this.time += dt; const it = this.cur, inp = G.input, ax = inp.axes();
    this.yaw -= inp.look.x * 0.0052; this.pitch = clamp(this.pitch - inp.look.y * 0.0052, -1.3, 1.3);
    if (inp.keys.KeyQ) this.yaw += dt * 2; if (inp.keys.KeyE && false) this.yaw -= dt * 2;
    const sp = inp.down('run') ? 7.6 : 4.5, sn = Math.sin(this.yaw), cs = Math.cos(this.yaw);
    const dx = (-sn * ax.y + cs * ax.x) * sp * dt, dz = (-cs * ax.y - sn * ax.x) * sp * dt, p = this.pos;
    if (dx || dz) {
      const fy = floorY(it, p.x, p.z);
      if (walkable(it, p.x + dx, p.z + dz, fy)) { p.x += dx; p.z += dz; } else if (walkable(it, p.x + dx, p.z, fy)) p.x += dx; else if (walkable(it, p.x, p.z + dz, fy)) p.z += dz;
      const pb = this.bob; this.bob += Math.hypot(dx, dz) * 1.9; if (Math.floor(pb / Math.PI) !== Math.floor(this.bob / Math.PI)) G.audio?.sfx('step');
    }
    p.y = damp(p.y, floorY(it, p.x, p.z), 14, dt);
    // 扉
    for (const d of it.doors) { if (d.open) continue; const near = Math.hypot(d.x - p.x, d.z - p.z) < 3.2 || it.drones.some((q) => q.alive && Math.hypot(d.x - q.x, d.z - q.z) < 2.4); if (near !== d.was) { d.was = near; if (Math.hypot(d.x - p.x, d.z - p.z) < 12) G.audio?.sfx('door'); } d.k = damp(d.k, near ? 1 : 0, d.mode === 'y' ? 5 : 9, dt); if (d.mode === 'y') d.panels[0].position.y = d.k * d.dh * 0.97; else { d.panels[0].position.x = -(d.dw / 4 + d.k * d.dw * 0.49); d.panels[1].position.x = d.dw / 4 + d.k * d.dw * 0.49; } }
    this._vis();
    for (const f of it.anim) f(dt, this.time);
    for (const n of it.npcs) { const a = Math.atan2(p.x - n.x, p.z - n.z), d = Math.hypot(p.x - n.x, p.z - n.z); let da = (d < 7 ? a : n.yaw) - n.g.rotation.y; da = Math.atan2(Math.sin(da), Math.cos(da)); n.g.rotation.y += da * Math.min(1, dt * 3); n.g.position.y = Math.sin(this.time * 1.6 + n.ph) * 0.012; }
    if (this.hostile) this._combat(dt);
    this._cam(dt); this._lights(dt); this._far(dt); this._interact();
    this.parts.update(dt, G.gfx.ph / (2 * Math.tan(this.camera.fov * Math.PI / 360)));
    // HUD
    const rm = roomAt(it, p.x, p.z); G.hud.setLoc(it.bp.name, rm?.name || '');
    if (this.time - this.lastHurt > 3.5) this.suit = Math.min(60, this.suit + 14 * dt);
    G.hud.bar('sh', this.suit / 60); G.hud.bar('hull', G.p.hp / 100); G.hud.damage(G.p.hp < 35 ? 0.4 : 0);
    G.gfx.fx.uDamage.value = damp(G.gfx.fx.uDamage.value, this.time - this.lastHurt < 0.2 ? 1 : 0, 10, dt);
    const left = it.drones.filter((d) => d.alive).length;
    G.hud.setObj(this.hostile ? `<b>警備ドローン</b> 残り ${left}<br>艦橋の <b>制御コア</b> を掌握せよ` : `<b>ヴォイド艦隊</b> 残存 ${remaining()}/20${G.p.missions[0] ? `<br>任務：${G.p.missions[0].title} (${G.p.missions[0].prog}/${G.p.missions[0].need})` : ''}`);
    G.hud.begin();
  }
  idle(dt) { this._far(dt); }
  /** 見えない部屋は描かない: 現在の部屋 + 開いている扉の先だけを表示 */
  _vis(all) {
    const it = this.cur, p = this.pos; if (all) { for (const id in it.roomGroups) it.roomGroups[id].visible = true; return; }
    const rm = roomAt(it, p.x, p.z) || this.lastRoom; if (!rm) return; this.lastRoom = rm;
    const vis = new Set([rm.id]), add = (id, depth) => { for (const a of it.adj[id] || []) { const d = a.d; if (vis.has(a.to)) continue; if (d.open || d.k > 0.02 || Math.hypot(d.x - p.x, d.z - p.z) < 9) { vis.add(a.to); if (depth < 2 && (d.open || d.k > 0.5)) add(a.to, depth + 1); } } };
    add(rm.id, 0); for (const id in it.roomGroups) it.roomGroups[id].visible = vis.has(id);
  }
  _cam(dt) {
    const c = this.camera; c.position.set(this.pos.x, this.pos.y + 1.68 + Math.sin(this.bob * 2) * 0.03, this.pos.z); c.rotation.set(this.pitch, this.yaw, 0, 'YXZ'); c.updateMatrixWorld();
    if (this.gun.visible) { this.gun.position.z = damp(this.gun.position.z, -0.42, 14, dt || 0.016); this.gun.position.y = -0.17 + Math.sin(this.bob * 2) * 0.006; }
  }
  _far(dt) { if (!this.far) { if (this.skyM) this.skyM.position.copy(this.camera.position); return; } this.farQ.copy(this.frameQ).multiply(this.camera.quaternion); G.backdrop.update(this.camU, this.farQ, this.camera.fov, this.camera.aspect, dt, G.gfx.pxScale); }
  /** 近い論理ライトを実ライトのプールへ割り当てる (シェーダ再コンパイルなし) */
  _lights(dt, snap) {
    const L = this.cur.lights, p = this.pos; for (const l of L) l._d = (l.x - p.x) ** 2 + (l.z - p.z) ** 2;
    L.sort((a, b) => a._d - b._d);
    this.pool.forEach((pl, i) => { const l = L[i]; if (!l) { pl.intensity = 0; return; } const d = Math.sqrt(l._d), f = 1 - THREE.MathUtils.smoothstep(d, 18, 34); pl.position.set(l.x, l.y, l.z); pl.color.copy(l.c); pl.distance = l.d * 1.6; pl.intensity = snap ? l.i * f : damp(pl.intensity, l.i * f, 8, dt); });
  }
  _interact() {
    const it = this.cur, p = this.pos, fx = -Math.sin(this.yaw), fz = -Math.cos(this.yaw); let best = null, bs = 1e9;
    for (const i of it.items) { const dx = i.x - p.x, dz = i.z - p.z, d = Math.hypot(dx, dz); if (d > i.r) continue; const dot = d > 0.01 ? (dx * fx + dz * fz) / d : 1; if (dot < (i.wide ? -0.2 : 0.25) && d > 1.3) continue; const sc = d - dot * 1.5; if (sc < bs) { bs = sc; best = i; } }
    this.item = best; G.hud.setCtx(best && !G.ui.isOpen ? [{ label: best.label, cls: best.act === 'core' || best.act === 'exit' || best.act === 'ramp' ? 'alt' : '', fn: () => this.act(best) }] : []);
    if (best && (G.input.key('KeyE') || G.input.key('Enter'))) this.act(best);
  }

  // ───────────────────────── インタラクション ─────────────────────────
  act(i) {
    const c = this.ctx, sid = c.type === 'station' ? c.id : c.type === 'outpost' ? c.body : 'haven', ui = G.ui, a = i.act;
    if (a.startsWith('talk:')) { const L = TALK[a.slice(5)] || ['「……」']; return ui.talk(i.label, L[Math.floor(Math.random() * L.length)]); }
    switch (a) {
      case 'shipyard': return ui.shipyard(sid);
      case 'yard': return ui.shipyard(sid, 0.75);
      case 'market': return ui.market(sid, c.type === 'outpost' ? '現地取引所' : c.id === 'rogue' ? '闇市' : '交易市場');
      case 'missions': return ui.missions(sid);
      case 'map': return ui.map();
      case 'bounty': return ui.bounty();
      case 'bar': return ui.bar(sid);
      case 'casino': return ui.casino();
      case 'broker': return ui.broker();
      case 'lab': return ui.lab(c.type === 'station' ? sid : 'aurora');
      case 'status': return ui.status();
      case 'rest': return ui.rest();
      case 'cafe': return ui.talk('バリスタ', '「地球産の豆を使ったコーヒーはいかがですか？ ひと息つけば、航海日誌も記録しておきますよ」', [{ label: 'コーヒーで一服 (40 Cr)', fn: () => { if (G.p.credits < 40) return G.audio?.sfx('deny'); G.p.credits -= 40; G.p.hp = 100; G.p.day++; save(); G.audio?.sfx('reward'); G.hud.msg('香り高い一杯で体力が全快した。記録完了。', 'good'); } }, { label: 'また今度' }]);
      case 'ramen': return ui.talk('ラーメン屋の店主', '「へいらっしゃい！ ネオン・ベイ名物、星屑トンコツだよ！」', [{ label: '一杯たのむ (60 Cr)', fn: () => { if (G.p.credits < 60) return G.audio?.sfx('deny'); G.p.credits -= 60; G.p.hp = 100; G.p.day++; save(); G.audio?.sfx('reward'); G.hud.msg('五臓六腑に染みわたる…体力全快・記録完了。', 'good'); } }, { label: 'やめておく' }]);
      case 'heal': G.p.hp = 100; this.suit = 60; G.audio?.sfx('reward'); return G.hud.msg('医療ポッドで治療した。体力全快。', 'good');
      case 'vend': if (G.p.credits < 20) return G.audio?.sfx('deny'); G.p.credits -= 20; G.p.hp = Math.min(100, G.p.hp + 30); G.audio?.sfx('buy'); return G.hud.msg('エナジードリンクを飲んだ。体力 +30', 'good');
      case 'ammo': { const p = G.space.pl, f = stats().missiles; if (p.missiles >= f) return G.hud.msg('ミサイルは満載です。'); p.missiles = f; G.audio?.sfx('buy'); return G.hud.msg(`艦内備蓄からミサイルを補給した (${f} 発)`, 'good'); }
      case 'harvest': if (G.p.flags.harvest === G.p.day) return G.hud.msg('今日はもう収穫済み。作物が育つまで待とう。'); if (!addCargo('food', 3)) return G.hud.msg('貨物室に空きがありません', 'warn'); G.p.flags.harvest = G.p.day; G.audio?.sfx('pickup'); return G.hud.msg('新鮮な野菜を収穫した。食料 ×3 を貨物室へ。', 'good');
      case 'scope': return ui.talk('大望遠鏡', `深宇宙の闇に、星系の姿が浮かび上がる。<br>ヴォイド艦隊の残存は <b>${remaining()} 隻</b>。${['地球の雲がゆっくりと渦を巻いている。', 'ゼファーの環が陽光を受けて黄金に輝いている。', 'イグニスの夜側で、溶岩の河が赤く脈打っている。', 'グラキエスの極に、青緑のオーロラが揺れている。'][Math.floor(Math.random() * 4)]}`);
      case 'arcade': return ui.talk('アーケード筐体', ['ハイスコア 999,990 — 「AAA」。どうやっても抜けそうにない。', '画面の中でも宇宙船が戦っている。現実とあまり変わらないな。', '1 クレジット入れてみたが、3 秒で撃墜された。'][Math.floor(Math.random() * 3)]);
      case 'piano': G.audio?.sfx('reward'); return G.hud.msg(['静かな旋律がラウンジに響いた。', '思いつくままに鍵盤を叩く。悪くない。', '船の振動と不思議に調和する和音だ。'][Math.floor(Math.random() * 3)], 'good');
      case 'pilot': return this.toPilot();
      case 'exit': return this.exitDoor();
      case 'ramp': return ui.talk(SHIPS[G.p.ship].name, `${SHIPS[G.p.ship].cls}「${SHIPS[G.p.ship].name}」。いつでも発進できる。`, [{ label: '船内に入る', fn: () => G.go('interior', { type: 'ship', from: 'station', station: c.id, via: 'airlock' }) }, { label: '発進する', cls: 'gold', fn: () => G.go('space', { undock: c.id }) }, { label: 'やめる' }]);
      case 'core': return this.hack();
      case 'loot': { const k = 'l' + i.id; if (G.p.flags[k]) return G.hud.msg('ここはもう空っぽだ。'); G.p.flags[k] = 1; const cr = 900 + this.cur.def.tier * 500; earn(cr); const n = addCargo('salvage', 2); G.audio?.sfx('reward'); return G.hud.msg(`貨物を略奪した：${cr.toLocaleString()} Cr${n ? `／回収部品 ×${n}` : ''}`, 'good'); }
      default: return G.hud.msg('（反応がない）');
    }
  }
  toPilot() {
    const c = this.ctx;
    if (c.from === 'station') return G.go('space', { docked: c.station });
    if (c.from === 'surface') return G.go('surface', { resume: true });
    return G.go('space', { resume: true });
  }
  exitDoor() {
    const c = this.ctx, sp = G.space;
    if (c.type === 'enemy') return G.go('space', { resume: true });
    if (c.type === 'outpost') return G.go('surface', { resume: true, foot: true, door: true });
    if (c.from === 'station') return G.go('interior', { type: 'station', id: c.station });
    if (c.from === 'surface') return G.go('surface', { resume: true, foot: true });
    const d = sp.pl.docked;
    if (!d) return G.hud.msg('宇宙空間ではエアロックを開けられません。ステーションにドッキングするか、惑星に着陸してください。', 'warn');
    return G.go('interior', d.kind === 'station' ? { type: 'station', id: d.def.id } : { type: 'enemy', id: d.def.id });
  }
  hack() {
    const it = this.cur, e = this.enemy; if (it.drones.some((d) => d.alive && Math.hypot(d.x - this.pos.x, d.z - this.pos.z) < 16)) return G.hud.msg('警備ドローンが近くにいる。先に排除せよ。', 'warn');
    G.ui.hack(e, (kind, reward) => {
      earn(reward); G.p.done[e.def.id] = kind === 'capture' ? 'captured' : 'destroyed'; e.fate = kind;
      if (kind === 'capture') { G.p.stats.captures++; event('capture'); } else { G.p.stats.kills++; addCargo('salvage', 2 + e.def.tier); addCargo('contra', 1); event('kill'); }
      save(); G.audio?.sfx('reward'); G.hud.banner(kind === 'capture' ? '拿捕成功' : '略奪完了', `${e.def.name}　+${reward.toLocaleString()} Cr`, 4);
      setTimeout(() => G.go('space', { resume: true }).then(() => G.space.afterBoard(e)), 1800);
    });
  }

  // ───────────────────────── 艦内戦闘 ─────────────────────────
  rayClear(x0, z0, x1, z1) { const it = this.cur, d = Math.hypot(x1 - x0, z1 - z0), n = Math.ceil(d / 0.5); for (let i = 1; i < n; i++) { const t = i / n, x = x0 + (x1 - x0) * t, z = z0 + (z1 - z0) * t; let ok = false; for (const w of it.walk) if (x >= w[0] - 0.4 && x <= w[2] + 0.4 && z >= w[1] - 0.4 && z <= w[3] + 0.4) { ok = true; break; } if (!ok) return false; } return true; }
  hurt(dmg) {
    this.lastHurt = this.time; G.audio?.sfx('hurt'); if (this.suit > 0) { this.suit -= dmg; if (this.suit < 0) { G.p.hp += this.suit; this.suit = 0; } } else G.p.hp -= dmg;
    if (G.p.hp <= 0 && !this.dead) { this.dead = true; G.p.hp = 60; G.hud.banner('戦闘不能', '自船へ緊急転送…', 3); G.go('space', { resume: true }).then(() => { this.dead = false; G.hud.msg('艦内戦に敗れ、自船へ退却した。態勢を整えて再突入しよう。', 'warn', 8); }); }
  }
  _combat(dt) {
    const it = this.cur, p = this.pos, cam = this.camera, tier = it.def.tier;
    for (const d of it.drones) {
      if (!d.alive) continue; const dx = p.x - d.x, dz = p.z - d.z, dist = Math.hypot(dx, dz);
      if (!d.alert && dist < 15 && this.rayClear(d.x, d.z, p.x, p.z)) { d.alert = true; G.audio?.sfx('lock'); }
      let mx = 0, mz = 0;
      if (d.alert) {
        const want = 5.5, k = dist > want + 1 ? 1 : dist < want - 1 ? -1 : 0, st = Math.sin(this.time * 1.3 + d.ph) > 0 ? 1 : -1;
        mx = (dx / dist) * k * 2.6 + (-dz / dist) * st * 1.5; mz = (dz / dist) * k * 2.6 + (dx / dist) * st * 1.5;
        d.g.rotation.y = Math.atan2(dx, dz); d.fireT -= dt;
        if (d.fireT <= 0 && dist < 18 && this.rayClear(d.x, d.z, p.x, p.z)) {
          d.fireT = 1.5 - tier * 0.22 + Math.random() * 0.5; const s = this.shots.find((q) => q.life <= 0);
          if (s) { s.m.position.set(d.x, d.g.position.y, d.z); s.v.set(dx + (Math.random() - 0.5) * 1.2, 1.25 - d.g.position.y + (Math.random() - 0.5) * 0.5, dz + (Math.random() - 0.5) * 1.2).normalize().multiplyScalar(13 + tier * 2); s.life = 3; s.dmg = 7 + tier * 3; s.m.visible = true; G.audio?.sfx('elaser', clamp(1 - dist / 20, 0.2, 1)); }
        }
        if (dist > 30) d.alert = false;
      } else { const hx = d.hx + Math.cos(this.time * 0.4 + d.ph) * 1.5 - d.x, hz = d.hz + Math.sin(this.time * 0.4 + d.ph) * 1.5 - d.z; mx = hx; mz = hz; d.g.rotation.y += dt * 0.6; }
      const nx = d.x + mx * dt, nz = d.z + mz * dt; if (walkable(it, nx, nz)) { d.x = nx; d.z = nz; } else if (walkable(it, nx, d.z)) d.x = nx; else if (walkable(it, d.x, nz)) d.z = nz;
      d.g.position.set(d.x, 1.45 + Math.sin(this.time * 2 + d.ph) * 0.14, d.z);
    }
    for (const s of this.shots) {
      if (s.life <= 0) continue; s.life -= dt; const m = s.m.position; m.addScaledVector(s.v, dt);
      const hit = Math.hypot(m.x - p.x, m.z - p.z) < 0.5 && m.y > 0.2 && m.y < 1.9;
      let wall = true; for (const w of it.walk) if (m.x >= w[0] - 0.3 && m.x <= w[2] + 0.3 && m.z >= w[1] - 0.3 && m.z <= w[3] + 0.3) { wall = false; break; }
      if (hit) this.hurt(s.dmg);
      if (hit || wall || s.life <= 0 || m.y < 0.05) { s.life = 0; s.m.visible = false; if (!hit) this.parts.burst(m, 8, 3, _col.set('#ff7040'), 0.12, 0.3, null, 2); } // 自分への命中はカメラの中で火花が弾けるので出さない (被弾表示は画面の赤みで行う)
    }
    // 自分の射撃
    this.fireT -= dt; this.tracer.visible = this.tracer.visible && this.fireT > 0.14;
    if (G.input.down('ffire') && this.fireT <= 0) {
      this.fireT = 0.19; G.audio?.sfx('blaster'); this.gun.position.z = -0.36;
      const dir = _a.set(0, 0, -1).applyQuaternion(cam.quaternion), o = cam.position; let best = null, bt = 60;
      for (const d of it.drones) { if (!d.alive) continue; const to = _b.copy(d.g.position).sub(o), t = to.dot(dir); if (t < 0.3 || t > bt) continue; const off = Math.sqrt(Math.max(0, to.lengthSq() - t * t)); if (off < 0.5 + t * 0.045 && this.rayClear(o.x, o.z, d.x, d.z)) { best = d; bt = t; } }
      let end; if (best) end = _c.copy(best.g.position); else { let t = 0.6; while (t < 40) { const x = o.x + dir.x * t, z = o.z + dir.z * t, y = o.y + dir.y * t; let ok = y > 0 && y < 16; if (ok) { ok = false; for (const w of it.walk) if (x >= w[0] - 0.4 && x <= w[2] + 0.4 && z >= w[1] - 0.4 && z <= w[3] + 0.4) { ok = true; break; } } if (!ok) break; t += 0.5; } end = _c.copy(o).addScaledVector(dir, t); }
      const muz = _b.set(0.2, -0.16, -0.78).applyMatrix4(cam.matrixWorld), len = muz.distanceTo(end); this.tracer.position.copy(muz).lerp(end, 0.5); this.tracer.scale.set(1, 1, len); this.tracer.lookAt(end); this.tracer.visible = true;
      this.parts.burst(end, 10, 4, _col.set('#8fe8ff'), 0.14, 0.35, null, 2);
      if (best) { best.hp -= 15; best.alert = true; if (best.hp <= 0) { best.alive = false; best.g.visible = false; this.parts.burst(best.g.position, 60, 7, _col.set('#ffb060'), 0.35, 0.8, null, 1.5); this.parts.burst(best.g.position, 20, 2, _col.set('#ffffff'), 0.7, 0.3); G.audio?.sfx('boom', 0.5); earn(150); G.hud.msg('警備ドローン撃破 +150 Cr', 'good', 3); } }
    }
  }
  render(dt) {
    this.mirror.render(this.scene, this.camera);
    G.gfx.render(dt, this.scene, this.camera, this.far ? G.backdrop : null);
  }
}
const _col = new THREE.Color();
