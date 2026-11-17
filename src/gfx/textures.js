// 画像ベースの PBR マテリアルと、文字・端末表示用のキャンバス
import * as THREE from 'three';
import { rng } from '../core/util.js';
import { MATERIAL_UVS, imageTex, setImageAniso, texSet, hasImage } from './materials.js';
export { imageTex, readyTextures, texSet } from './materials.js';

export const JP = '"Hiragino Kaku Gothic ProN","Hiragino Sans","Noto Sans JP","Noto Sans CJK JP","Yu Gothic","Meiryo","IPAGothic",sans-serif';
let ANISO = 8;
export const setAniso = (a) => { ANISO = a; setImageAniso(a); };
export function cv(w, h = w) { const c = document.createElement('canvas'); c.width = w; c.height = h; return c; }
export function ctex(c, srgb = false, rep = true) {
  const t = new THREE.CanvasTexture(c);
  t.wrapS = t.wrapT = rep ? THREE.RepeatWrapping : THREE.ClampToEdgeWrapping;
  t.anisotropy = ANISO;
  if (srgb) t.colorSpace = THREE.SRGBColorSpace;
  t.minFilter = THREE.LinearMipmapLinearFilter;
  return t;
}
const MATS = new Map();
/** PBR マテリアル。uvs = 1m あたりのテクスチャ繰り返し数 (Builder が参照) */
export function mat(style, o = {}) {
  const key = style + JSON.stringify(o);
  let m = MATS.get(key);
  if (m) return m;
  const p = { color: o.color ?? 0xffffff, roughness: o.rough ?? 1, metalness: o.metal ?? 0.5 };
  if (style !== 'flat') { const s = texSet(style); p.map = s.map; p.normalMap = s.normalMap; p.roughnessMap = s.roughnessMap; }
  m = new THREE.MeshStandardMaterial(p);
  if (m.normalMap) m.normalScale.setScalar(o.ns ?? 1);
  if (o.emissive != null) { m.emissive.set(o.emissive); m.emissiveIntensity = o.ei ?? 1; }
  if (o.transparent) { m.transparent = true; m.opacity = o.opacity ?? 0.5; m.depthWrite = false; }
  if (o.side) m.side = o.side;
  if (o.cut) { m.alphaTest = 0.5; m.side = THREE.DoubleSide; } // 切り抜きの絵 (背景が透明)
  if (o.emap) m.emissiveMap = imageTex(o.emap); // 発光マップ (窓の明かりなど)
  m.envMapIntensity = o.env ?? 1;
  m.userData.uvs = o.uvs ?? MATERIAL_UVS[style] ?? 0.25;
  MATS.set(key, m);
  return m;
}
/** 発光マップ付きの単色。画像があるときだけ withImg の設定と発光マップを使い、無ければ従来の単色 */
export const emissiveImg = (path, o, withImg = {}) => (hasImage(path) ? mat('flat', { ...o, ...withImg, emap: path }) : mat('flat', o));
/** 画像付きの発光 (天井の照明パネルなど)。画像が無いときは glow() と同じ */
export function glowMap(path, color, intensity = 3) {
  if (!hasImage(path)) return glow(color, intensity);
  const key = 'glowmap' + path + color + '_' + intensity; let m = MATS.get(key);
  if (!m) { m = new THREE.MeshBasicMaterial({ map: imageTex(path), color: new THREE.Color(color).multiplyScalar(intensity), toneMapped: false }); m.userData.uvs = 0; MATS.set(key, m); }
  return m;
}
/** 自発光 (ブルーム対象)。HDR 強度 */
export function glow(color, intensity = 3) {
  const key = 'glow' + color + '_' + intensity;
  let m = MATS.get(key);
  if (!m) { m = new THREE.MeshBasicMaterial({ color: new THREE.Color(color).multiplyScalar(intensity), toneMapped: false }); m.userData.uvs = 0; MATS.set(key, m); }
  return m;
}

// ── 発光テクスチャ ────────────────────────────────────────────
/** ステーション外壁用の窓明かり (エミッシブ) */
export function windowsTex() { return imageTex('effects/windows', { fill: [0, 0, 0, 255] }); }
export function glowTex() { return imageTex('effects/glow', { repeat: false, fill: [255, 255, 255, 0] }); }

/** ネオンサイン/ラベル。戻り値 {tex, aspect} */
export function signTex(text, color = '#3df', o = {}) {
  const fs = o.size ?? 120, font = `${o.weight ?? 900} ${fs}px ${o.mono ? 'monospace' : JP}`, m = cv(8).getContext('2d'); m.font = font;
  const lines = String(text).split('\n'), tw = Math.max(...lines.map((l) => m.measureText(l).width)), pad = fs * 0.5;
  const w = Math.ceil(tw + pad * 2), h = Math.ceil(fs * 1.25 * lines.length + pad * 2), c = cv(w, h), x = c.getContext('2d');
  if (o.bg) { x.fillStyle = o.bg; x.fillRect(0, 0, w, h); }
  if (o.frame) { x.strokeStyle = color; x.lineWidth = fs * 0.07; x.shadowColor = color; x.shadowBlur = fs * 0.3; x.strokeRect(pad * 0.35, pad * 0.35, w - pad * 0.7, h - pad * 0.7); }
  x.font = font; x.textAlign = 'center'; x.textBaseline = 'middle';
  lines.forEach((l, i) => {
    const y = pad + fs * 0.62 + i * fs * 1.25;
    x.shadowColor = color; x.shadowBlur = fs * 0.45; x.fillStyle = color; x.fillText(l, w / 2, y); x.fillText(l, w / 2, y);
    x.shadowBlur = fs * 0.08; x.fillStyle = o.core ?? '#fff'; x.globalAlpha = 0.85; x.fillText(l, w / 2, y); x.globalAlpha = 1;
  });
  const t = ctex(c, true, false);
  return { tex: t, aspect: w / h };
}
export function signMesh(text, color, height = 1, o = {}) {
  const { tex, aspect } = signTex(text, color, o);
  const m = new THREE.MeshBasicMaterial({ map: tex, transparent: !o.bg, toneMapped: false, side: o.double ? THREE.DoubleSide : THREE.FrontSide, depthWrite: !!o.bg, blending: o.bg ? THREE.NormalBlending : THREE.AdditiveBlending });
  m.color.setScalar(o.intensity ?? 2.2);
  const mesh = new THREE.Mesh(new THREE.PlaneGeometry(height * aspect, height), m);
  mesh.userData.w = height * aspect;
  return mesh;
}

// ── アニメーションする端末スクリーン ──────────────────────────
const SCREENS = [];
export function screenTex(kind = 'data', color = '#4df', title = '') {
  const c = cv(512, 320), x = c.getContext('2d'), t = ctex(c, true, false), rnd = rng(kind.length * 31 + color.length * 7 + title.length);
  const s = { c, x, t, kind, color, title, rnd, ph: rnd() * 10, bars: Array.from({ length: 16 }, () => rnd()) };
  t.userData.screen = s; SCREENS.push(s); drawScreen(s, 0);
  return t;
}
/** root の下で使われている端末スクリーンと、それを貼っているメッシュ (Map: screen → [mesh]) */
function screensIn(root) { const map = new Map(); root.traverse((o) => { const s = o.material?.map?.userData?.screen; if (s) { const L = map.get(s); if (L) L.push(o); else map.set(s, [o]); } }); return map; }
let ACTIVE = null; // null = すべて / [{ s, objs }]
/** いま見えている室内のスクリーンだけを再描画する (他の室内のぶんまで順番待ちにして、目の前の画面がほとんど動かなくなるのを防ぐ)。root=null で停止 */
export function activeScreens(root) { ACTIVE = root ? [...screensIn(root)].map(([s, objs]) => ({ s, objs })) : []; _scrIdx = 0; }
/** 破棄した室内のスクリーンを登録から外し、テクスチャを解放する */
export function dropScreens(root) { const set = screensIn(root); if (!set.size) return; for (let i = SCREENS.length - 1; i >= 0; i--) if (set.has(SCREENS[i])) { SCREENS[i].t.dispose(); SCREENS.splice(i, 1); } if (ACTIVE) ACTIVE = ACTIVE.filter((a) => !set.has(a.s)); }
/** メッシュが実際に描かれる状態か (自分と親がすべて表示中)。閉じた扉の向こうの部屋は非表示になっている */
const shown = (o) => { for (; o; o = o.parent) if (!o.visible) return false; return true; };
function drawScreen(s, time) {
  const { x, color, kind } = s, W = 512, Hh = 320;
  x.fillStyle = '#02060b'; x.fillRect(0, 0, W, Hh);
  x.strokeStyle = color; x.fillStyle = color; x.lineWidth = 2; x.globalAlpha = 0.9;
  x.strokeRect(8, 8, W - 16, Hh - 16); x.font = `bold 26px ${JP}`; x.textAlign = 'left'; x.textBaseline = 'alphabetic';
  x.fillText(s.title || kind.toUpperCase(), 22, 42); x.fillRect(22, 52, W - 44, 2);
  const t = time + s.ph;
  if (kind === 'graph') {
    x.beginPath(); for (let i = 0; i <= 60; i++) { const px = 24 + i * 7.7, py = 190 + Math.sin(i * 0.35 + t * 1.5) * 40 * Math.sin(i * 0.11 + t * 0.4) + Math.sin(i * 1.3 + t * 3) * 8; i ? x.lineTo(px, py) : x.moveTo(px, py); } x.stroke();
    x.globalAlpha = 0.25; for (let i = 0; i < 6; i++) x.fillRect(24, 90 + i * 40, W - 48, 1); x.globalAlpha = 0.9;
  } else if (kind === 'bars') {
    for (let i = 0; i < 16; i++) { const v = 0.15 + 0.85 * Math.abs(Math.sin(s.bars[i] * 9 + t * (0.5 + s.bars[i]))); x.globalAlpha = 0.35 + v * 0.6; x.fillRect(26 + i * 29, 290 - v * 210, 20, v * 210); } x.globalAlpha = 0.9;
  } else if (kind === 'radar') {
    x.beginPath(); x.arc(256, 185, 110, 0, 7); x.stroke(); x.beginPath(); x.arc(256, 185, 70, 0, 7); x.stroke(); x.beginPath(); x.arc(256, 185, 30, 0, 7); x.stroke();
    x.beginPath(); x.moveTo(256, 185); x.lineTo(256 + Math.cos(t * 2) * 110, 185 + Math.sin(t * 2) * 110); x.stroke();
    for (let i = 0; i < 6; i++) { const a = s.bars[i] * 7, d = 20 + s.bars[i + 6] * 85; x.globalAlpha = 0.4 + 0.6 * Math.max(0, Math.cos(t * 2 - a)); x.beginPath(); x.arc(256 + Math.cos(a) * d, 185 + Math.sin(a) * d, 4, 0, 7); x.fill(); } x.globalAlpha = 0.9;
  } else if (kind === 'orbit') {
    for (let i = 1; i < 5; i++) { x.globalAlpha = 0.4; x.beginPath(); x.ellipse(256, 185, i * 42, i * 22, 0, 0, 7); x.stroke(); x.globalAlpha = 0.95; const a = t * (1.2 / i) + i; x.beginPath(); x.arc(256 + Math.cos(a) * i * 42, 185 + Math.sin(a) * i * 22, 5, 0, 7); x.fill(); }
    x.beginPath(); x.arc(256, 185, 9, 0, 7); x.fill();
  } else {
    x.font = '17px monospace';
    for (let i = 0; i < 10; i++) { const w = 60 + ((s.bars[i] * 997 + Math.floor(t * 2 + i) * 131) % 320); x.globalAlpha = 0.25 + ((i + Math.floor(t * 3)) % 5 === 0 ? 0.7 : 0.3); x.fillRect(24, 74 + i * 23, w, 11); }
    x.globalAlpha = 0.9;
  }
  x.globalAlpha = 1;
  s.t.needsUpdate = true;
}
let _scrAcc = 0, _scrIdx = 0;
/** 毎フレーム呼ぶ。負荷分散のため少数ずつ再描画 */
export function updateScreens(dt, time) {
  const L = ACTIVE || SCREENS;
  _scrAcc += dt; if (_scrAcc < 0.12 || !L.length) return; _scrAcc = 0;
  // 見えている部屋の画面だけを順番に描き直す (1 枚 512×320 の転送を、閉じた扉の向こうの画面に使わない)
  for (let k = 0, tries = 0; k < 2 && tries < L.length; tries++) {
    _scrIdx = (_scrIdx + 1) % L.length; const a = L[_scrIdx];
    if (ACTIVE) { if (!a.objs.some(shown)) continue; drawScreen(a.s, time); } else drawScreen(a, time);
    k++;
  }
}
export function screenMat(kind, color, title, intensity = 1.6) {
  const m = new THREE.MeshBasicMaterial({ map: screenTex(kind, color, title), toneMapped: false });
  m.color.setScalar(intensity); m.userData.uvs = 0;
  return m;
}

// ── 接地影 / AO デカール ──
let _aoB, _aoE;
const aoMask = (kind) => imageTex('effects/ao-' + kind, { srgb: false, repeat: false, fill: [0, 0, 0, 255] });
/** 床に落ちる柔らかい影。kind: 'blob' (丸) | 'edge' (壁際) */
export function aoMat(kind = 'blob') {
  const mk = (t, o) => { const m = new THREE.MeshBasicMaterial({ color: 0x000000, alphaMap: t, transparent: true, opacity: o, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2, toneMapped: false }); m.userData.uvs = 0; return m; };
  if (kind === 'edge') return _aoE || (_aoE = mk(aoMask('edge'), 0.6));
  return _aoB || (_aoB = mk(aoMask('blob'), 0.62));
}
// ── 葉の房 (アルファ抜き) ──
const LEAFM = new Map();
function leafTex() { return imageTex('vegetation/interior', { repeat: false, fill: [0, 0, 0, 0] }); }
export function leafMat(tint = 0xffffff) {
  let m = LEAFM.get(tint); if (m) return m;
  m = new THREE.MeshStandardMaterial({ map: leafTex(), alphaTest: 0.45, side: THREE.DoubleSide, roughness: 0.7, metalness: 0, color: tint }); m.userData.uvs = 0; LEAFM.set(tint, m);
  return m;
}
/** 葉のカード n 枚からなる樹冠。法線は中心から外向き (柔らかい陰影) */
export function canopyGeo(R, n, rnd, flat = 0.8) {
  const pos = [], nor = [], uv = [], idx = [], q = new THREE.Quaternion(), e = new THREE.Euler(), v = new THREE.Vector3();
  for (let i = 0; i < n; i++) {
    const u = rnd() * 2 - 1, a = rnd() * 6.283, sn = Math.sqrt(1 - u * u), rad = R * (0.4 + 0.6 * Math.sqrt(rnd())), cx = sn * Math.cos(a) * rad, cy = u * rad * flat, cz = sn * Math.sin(a) * rad, size = R * (0.6 + rnd() * 0.55);
    e.set(rnd() * 3.14, rnd() * 6.28, rnd() * 3.14); q.setFromEuler(e); const b = pos.length / 3;
    for (const [px, py] of [[-1, -1], [1, -1], [1, 1], [-1, 1]]) { v.set(px * size / 2, py * size / 2, 0).applyQuaternion(q); const X = cx + v.x, Y = cy + v.y, Z = cz + v.z, l = Math.hypot(X, Y + R * 0.35, Z) || 1; pos.push(X, Y, Z); nor.push(X / l, (Y + R * 0.35) / l, Z / l); uv.push((px + 1) / 2, (py + 1) / 2); }
    idx.push(b, b + 1, b + 2, b, b + 2, b + 3);
  }
  const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setAttribute('normal', new THREE.Float32BufferAttribute(nor, 3)); g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2)); g.setIndex(idx);
  return g;
}
