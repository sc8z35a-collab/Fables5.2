// STARFABLE — 起動・メインループ・モード遷移
import * as THREE from 'three';
import { G, clamp } from './core/util.js';
import { Gfx, QUALITY, DIST } from './gfx/renderer.js';
import { Backdrop } from './gfx/planets.js';
import { fxTime } from './gfx/fx.js';
import { updateScreens } from './gfx/textures.js';
import { BODIES } from './world/defs.js';
import { Input } from './ui/input.js';
import { Hud } from './ui/hud.js';
import { UI } from './ui/panels.js';
import { AudioSys } from './core/audio.js';
import { SpaceMode } from './game/space.js';
import { InteriorMode } from './game/interior.js';
import { SurfaceMode } from './game/surface.js';
import { newGame, load, save, earn, remaining } from './game/state.js';

const app = document.getElementById('app'), canvas = document.getElementById('gl');
const Q = new URLSearchParams(location.search);
const bootEl = document.getElementById('boot'), bootFill = document.getElementById('boot-fill'), bootText = document.getElementById('boot-text');
window.G = G; G.modes = {}; G.time = 0; G.tip = '';

function layout() {
  const w = window.innerWidth, h = window.innerHeight, portrait = h > w, W = portrait ? h : w, H = portrait ? w : h;
  Object.assign(G, { W, H, portrait, vw: w });
  app.style.width = W + 'px'; app.style.height = H + 'px';
  app.style.transform = portrait ? `translateX(${w}px) rotate(90deg)` : 'none';
  app.style.setProperty('--u', H / 100 + 'px');
  G.gfx?.resize(W, H); G.hud?.resize();
  for (const m of Object.values(G.modes)) if (m.camera) { m.camera.aspect = W / H; m.camera.updateProjectionMatrix(); }
}
/** 画面座標 → 横向きレイアウト座標 (縦持ち時は 90° 回転して常に横画面で表示する) */
G.toLocal = (x, y) => (G.portrait ? [y, G.vw - x] : [x, y]);
G.fullscreen = (force) => {
  if (!force && !(navigator.maxTouchPoints > 0)) return;
  try {
    const d = document.documentElement, rq = d.requestFullscreen || d.webkitRequestFullscreen;
    const lock = () => { try { screen.orientation?.lock?.('landscape')?.catch?.(() => {}); } catch (e) { /* 非対応 */ } };
    if (rq && !(document.fullscreenElement || document.webkitFullscreenElement)) { const r = rq.call(d, { navigationUI: 'hide' }); if (r?.then) r.then(lock).catch(() => {}); else lock(); } else lock();
  } catch (e) { /* 全画面 API 非対応端末 */ }
};
const tweens = [];
G.tween = (dur, fn) => new Promise((res) => tweens.push({ t: 0, dur, fn, res }));
G.fade = (to, dur = 0.4, flash = false) => { const u = flash ? G.gfx.fx.uFlash : G.gfx.fx.uFade, from = u.value, tgt = flash ? 1 - to : to; return G.tween(dur, (k) => { u.value = from + (tgt - from) * k; }); };
G.go = async (name, params = {}, o = {}) => {
  if (G.busy) return; G.busy = true; G.ui.close();
  await G.fade(0, o.flash ? 1.0 : 0.35, o.flash);
  G.mode?.exit?.(name);
  if (o.flash) { G.gfx.fx.uFade.value = 0; }
  G.mode = G.modes[name]; G.modeName = name; G.hud.begin(); G.hud.setCtx([]);
  try { await G.mode.enter(params); } catch (e) { console.error(e); }
  G.busy = false;
  if (o.flash) { G.gfx.fx.uFade.value = 1; await G.fade(1, 0.9, true); } else await G.fade(1, 0.5);
};
G.setQuality = (name) => { if (G.p) { G.p.quality = name; if (!G.titleOn) save(); else try { localStorage.setItem('starfable-quality', name); } catch (e) { /* noop */ } } G.gfx.setQuality(name); for (const m of Object.values(G.modes)) m.onQuality?.(); };
G.setRes = (r) => { if (G.p) G.p.res = r; try { localStorage.setItem('starfable-res', r); } catch (e) { /* noop */ } G.gfx.setRes(r); G.hud?.resize(); };
G.setDist = (d) => { if (G.p) G.p.dist = d; try { localStorage.setItem('starfable-dist', d); } catch (e) { /* noop */ } G.drawDist = DIST[d][1]; G.distName = d; for (const m of Object.values(G.modes)) m.onQuality?.(); };
G.drawDist = 1; G.distName = 'mid';
G.checkVictory = () => { if (remaining() === 0 && !G.p.flags.won) { G.p.flags.won = 1; earn(50000); save(); setTimeout(() => { G.hud.banner('星系解放', 'ヴォイド艦隊 全艦無力化', 5); setTimeout(() => G.ui.victory(), 4000); }, 2500); } };
G.start = (fresh) => {
  G.titleOn = false;
  if (G.p.quality && G.p.quality !== G.gfx.qName) G.setQuality(G.p.quality);
  G.audio.setOn(G.p.sound !== false);
  if (fresh) {
    G.tip = '▶ <b>ドッキング要請</b>でヘイヴン・リングに入港しよう';
    G.go('space', { near: 'haven' }).then(() => {
      G.hud.banner('STARFABLE', '星海の果て — 地球軌道', 4);
      setTimeout(() => G.hud.msg('ヘイヴン管制：「ようこそ、パイロット。前方のリングが我々の港だ」', 'comm', 8), 1500);
      setTimeout(() => G.hud.msg('左スティックで旋回、右のスライダーで推力。近づいて「ドッキング要請」を押そう。', 'good', 10), 5000);
      setTimeout(() => G.hud.msg('「星図」で目的地を選び「自動航行」を使えば、どこへでも飛べる。', 'good', 10), 14000);
    });
  } else G.go('space', { docked: G.p.last || 'haven' }).then(() => G.hud.banner('おかえりなさい', G.space.station(G.p.last || 'haven').def.name, 3));
};

const tick = () => new Promise((r) => requestAnimationFrame(() => r()));
async function boot() {
  const prog = async (k, text) => { bootFill.style.width = k * 100 + '%'; bootText.textContent = text; await tick(); await tick(); };
  layout();
  const gl2 = (() => { try { return !!document.createElement('canvas').getContext('webgl2'); } catch (e) { return false; } })();
  if (!gl2) { bootText.textContent = 'この端末は WebGL2 に対応していません。最新のブラウザでお試しください。'; return; }
  G.gfx = new Gfx(canvas);
  let q = Q.get('q') || load()?.quality; if (!q) { try { q = localStorage.getItem('starfable-quality'); } catch (e) { /* noop */ } }
  if (q && QUALITY[q]) G.gfx.setQuality(q, true);
  { let r = Q.get('res'), d = Q.get('dist'); try { r = r ?? localStorage.getItem('starfable-res'); d = d ?? localStorage.getItem('starfable-dist'); } catch (e) { /* noop */ } if (r != null && !isNaN(+r)) G.gfx.res = +r; if (d && DIST[d]) { G.drawDist = DIST[d][1]; G.distName = d; } }
  layout();
  G.input = new Input(app); G.hud = new Hud(app); G.ui = new UI(app); G.audio = new AudioSys();
  G.hud.show(false);
  await prog(0.06, '星図を生成中…');
  G.backdrop = new Backdrop(G.gfx.renderer, BODIES, G.gfx.q);
  await prog(0.2, '惑星を形成中…');
  const terra = BODIES.find((b) => b.id === 'terra');
  G.backdrop.update(new THREE.Vector3(terra.pos[0], terra.pos[1] + terra.R * 1.4, terra.pos[2]), new THREE.Quaternion(), 60, 1, 0, 1);
  let n = 0; while (G.backdrop.bakeNext()) await prog(0.2 + ++n * 0.07, '惑星を形成中… ' + n + '/5');
  await prog(0.6, '環境光を計算中…');
  G.env = G.gfx.envFromScene(G.backdrop.envScene());
  G.p = load() || newGame(); G.p.quality = G.gfx.qName;
  await prog(0.66, '艦隊を配備中…');
  G.space = G.modes.space = new SpaceMode();
  n = 0; while (G.space.buildStations()) await prog(0.66 + ++n * 0.029, 'ステーションを建造中… ' + n + '/9');
  await prog(0.93, '各施設を準備中…');
  G.modes.interior = new InteriorMode(); G.modes.surface = new SurfaceMode();
  await prog(1, '発進準備完了');
  window.addEventListener('resize', layout); window.addEventListener('orientationchange', () => setTimeout(layout, 250));
  document.addEventListener('visibilitychange', () => { const c = G.audio.ctx; if (c) document.hidden ? c.suspend() : c.resume(); last = performance.now(); });
  // 起動: タイトル or デバッグ用の直接開始
  G.mode = G.space; G.modeName = 'space';
  const auto = Q.get('auto');
  if (auto) {
    G.p = newGame(Q.get('ship') || 'hayate'); G.p.quality = G.gfx.qName; G.dev = true;
    const params = Object.fromEntries(Q.entries());
    await G.mode.enter(auto === 'space' ? params : { near: 'haven' });
    if (auto !== 'space') { G.mode.exit(); G.mode = G.modes[auto]; G.modeName = auto; await G.mode.enter(params); }
  } else { G.titleOn = true; G.space.enter({ title: true }); G.ui.title(); }
  bootEl.style.opacity = 0; setTimeout(() => bootEl.remove(), 900);
  requestAnimationFrame(frame);
}

let last = performance.now(), frames = 0;
function frame(now) {
  requestAnimationFrame(frame);
  const dt = clamp((now - last) / 1000, 0.001, 0.05); last = now; G.time += dt; fxTime.value = G.time % 3600;
  for (let i = tweens.length - 1; i >= 0; i--) { const t = tweens[i]; t.t += dt; const k = Math.min(1, t.t / t.dur); t.fn(k); if (k >= 1) { tweens.splice(i, 1); t.res(); } }
  const m = G.mode; if (!m) return;
  if (!G.busy && !(G.ui.isOpen && !G.titleOn)) m.update(dt);
  else if (G.busy) m.idle?.(dt);
  G.hud.update(dt); G.audio.update(dt); updateScreens(dt, G.time);
  if (m.render) m.render(dt); else G.gfx.render(dt, m.scene, m.camera, m.far === false ? null : G.backdrop);
  G.input.endFrame();
  if (++frames === 20) window.__ready = true;
}
boot().catch((e) => { console.error(e); bootText.textContent = '起動に失敗しました：' + e.message; });
