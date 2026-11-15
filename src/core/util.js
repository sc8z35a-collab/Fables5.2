// 共有ユーティリティ
export const G = {}; // グローバルなゲーム状態レジストリ（循環依存の回避用）

export const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
export const lerp = (a, b, t) => a + (b - a) * t;
export const damp = (a, b, l, dt) => a + (b - a) * (1 - Math.exp(-l * dt));
export const smooth = (a, b, x) => { x = clamp((x - a) / (b - a), 0, 1); return x * x * (3 - 2 * x); };
export const TAU = Math.PI * 2;

export function rng(seed) {
  let s = (seed >>> 0) || 1;
  return () => {
    s = (s + 0x6D2B79F5) | 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
export const pick = (r, arr) => arr[Math.floor(r() * arr.length) % arr.length];
export const rr = (r, a, b) => a + (b - a) * r();

function h2(x, y, s) { const n = Math.sin(x * 127.1 + y * 311.7 + s * 74.7) * 43758.5453; return n - Math.floor(n); }
export function vnoise(x, y, s = 0) {
  const xi = Math.floor(x), yi = Math.floor(y), xf = x - xi, yf = y - yi;
  const u = xf * xf * (3 - 2 * xf), v = yf * yf * (3 - 2 * yf);
  return lerp(lerp(h2(xi, yi, s), h2(xi + 1, yi, s), u), lerp(h2(xi, yi + 1, s), h2(xi + 1, yi + 1, s), u), v);
}
export function fbm(x, y, o = 5, s = 0) {
  let a = 0.5, f = 1, t = 0;
  for (let i = 0; i < o; i++) { t += a * vnoise(x * f, y * f, s + i * 13); a *= 0.5; f *= 2.03; }
  return t;
}
export function ridge(x, y, o = 5, s = 0) {
  let a = 0.5, f = 1, t = 0;
  for (let i = 0; i < o; i++) { const n = 1 - Math.abs(vnoise(x * f, y * f, s + i * 17) * 2 - 1); t += a * n * n; a *= 0.5; f *= 2.07; }
  return t;
}

// 単位の切り替えは「丸めた後の値」で判定する (以前は 999.6 m が "1000 m"、999.97 km が "1000.0 km" と表示されていた)
export function fmtDist(m) {
  if (m < 999.5) return m.toFixed(0) + ' m';
  if (m < 999950) return (m / 1000).toFixed(m < 9995 ? 2 : 1) + ' km';
  return (m / 1e6).toFixed(m < 9.995e6 ? 2 : 1) + ' Mm';
}
export function fmtSpeed(v) {
  if (v < 1999.5) return v.toFixed(0) + ' m/s';
  if (v < 999950) return (v / 1000).toFixed(1) + ' km/s';
  return (v / 1e6).toFixed(2) + ' Mm/s';
}
/** 秒 → "m:ss" / "h:mm:ss" (到着予想時刻などの表示用) */
export function fmtTime(s) {
  s = Math.max(0, Math.ceil(s)); const h = Math.floor(s / 3600), m = Math.floor(s / 60) % 60, ss = String(s % 60).padStart(2, '0');
  return h ? `${h}:${String(m).padStart(2, '0')}:${ss}` : `${m}:${ss}`;
}
export const fmtCr = (n) => Math.round(n).toLocaleString('ja-JP') + ' Cr';

export function el(tag, cls, html, parent) {
  const e = document.createElement(tag);
  if (cls) e.className = cls;
  if (html != null) e.innerHTML = html;
  if (parent) parent.appendChild(e);
  return e;
}
