// プロシージャル PBR テクスチャ & マテリアル生成（外部画像を一切使わない）
import * as THREE from 'three';
import { rng, pick } from '../core/util.js';

export const JP = '"Hiragino Kaku Gothic ProN","Hiragino Sans","Noto Sans JP","Noto Sans CJK JP","Yu Gothic","Meiryo","IPAGothic",sans-serif';
let ANISO = 8;
export const setAniso = (a) => { ANISO = a; };
export function cv(w, h = w) { const c = document.createElement('canvas'); c.width = w; c.height = h; return c; }
export function ctex(c, srgb = false, rep = true) {
  const t = new THREE.CanvasTexture(c);
  t.wrapS = t.wrapT = rep ? THREE.RepeatWrapping : THREE.ClampToEdgeWrapping;
  t.anisotropy = ANISO;
  if (srgb) t.colorSpace = THREE.SRGBColorSpace;
  t.minFilter = THREE.LinearMipmapLinearFilter;
  return t;
}
export const g = (v) => { v = v | 0; return `rgb(${v},${v},${v})`; };

export function normalFromHeight(hc, strength = 2) {
  const w = hc.width, h = hc.height, src = hc.getContext('2d').getImageData(0, 0, w, h).data;
  const out = cv(w, h), octx = out.getContext('2d'), img = octx.createImageData(w, h), d = img.data;
  for (let y = 0; y < h; y++) {
    const ym = ((y - 1 + h) % h) * w, yp = ((y + 1) % h) * w, y0 = y * w;
    for (let x = 0; x < w; x++) {
      const xm = (x - 1 + w) % w, xp = (x + 1) % w;
      const dx = (src[(y0 + xp) * 4] - src[(y0 + xm) * 4]) / 255 * strength;
      const dy = (src[(yp + x) * 4] - src[(ym + x) * 4]) / 255 * strength;
      const l = 1 / Math.hypot(dx, dy, 1), i = (y0 + x) * 4;
      d[i] = (-dx * l * 0.5 + 0.5) * 255; d[i + 1] = (dy * l * 0.5 + 0.5) * 255; d[i + 2] = (l * 0.5 + 0.5) * 255; d[i + 3] = 255;
    }
  }
  octx.putImageData(img, 0, 0);
  return out;
}

function tileNoise(size, period, seed, oct = 4) {
  const r = rng(seed), out = new Float32Array(size * size);
  let amp = 0.5, tot = 0;
  for (let o = 0; o < oct; o++) {
    const P = period << o, gr = new Float32Array(P * P);
    for (let i = 0; i < gr.length; i++) gr[i] = r();
    const f = P / size;
    for (let y = 0; y < size; y++) {
      const fy = y * f, y0 = Math.floor(fy), ty = fy - y0, sy = ty * ty * (3 - 2 * ty), ya = (y0 % P) * P, yb = ((y0 + 1) % P) * P;
      for (let x = 0; x < size; x++) {
        const fx = x * f, x0 = Math.floor(fx), tx = fx - x0, sx = tx * tx * (3 - 2 * tx), xa = x0 % P, xb = (x0 + 1) % P;
        const a = gr[ya + xa], b = gr[ya + xb], c = gr[yb + xa], d = gr[yb + xb];
        out[y * size + x] += amp * (a + (b - a) * sx + (c - a) * sy + (a - b - c + d) * sx * sy);
      }
    }
    tot += amp; amp *= 0.5;
  }
  for (let i = 0; i < out.length; i++) out[i] /= tot;
  return out;
}
export function noiseCanvas(size, period, seed, oct, lo = 0, hi = 255, fn) {
  const n = tileNoise(size, period, seed, oct), c = cv(size), x = c.getContext('2d'), im = x.createImageData(size, size);
  for (let i = 0; i < n.length; i++) {
    const t = fn ? fn(n[i]) : n[i], v = lo + (hi - lo) * t;
    im.data[i * 4] = im.data[i * 4 + 1] = im.data[i * 4 + 2] = v; im.data[i * 4 + 3] = 255;
  }
  x.putImageData(im, 0, 0);
  return c;
}
export function three(size, ab = 200, hb = 128, rb = 128) {
  const A = cv(size), H = cv(size), R = cv(size), a = A.getContext('2d'), h = H.getContext('2d'), r = R.getContext('2d');
  a.fillStyle = g(ab); a.fillRect(0, 0, size, size); h.fillStyle = g(hb); h.fillRect(0, 0, size, size); r.fillStyle = g(rb); r.fillRect(0, 0, size, size);
  return [A, H, R, a, h, r];
}
export function grime(a, r, size, seed, amt = 1) {
  const n = noiseCanvas(256, 4, seed, 5, 140, 255);
  a.globalCompositeOperation = 'multiply'; a.globalAlpha = 0.6 * amt; a.drawImage(n, 0, 0, size, size);
  a.globalCompositeOperation = 'source-over'; a.globalAlpha = 1;
  const n2 = noiseCanvas(256, 8, seed + 5, 4, 70, 190);
  r.globalAlpha = 0.35 * amt; r.drawImage(n2, 0, 0, size, size); r.globalAlpha = 1;
}
export function finish(A, H, R, ns = 2.5) { return { map: ctex(A, true), normalMap: ctex(normalFromHeight(H, ns)), roughnessMap: ctex(R) }; }
export function dot3(h, a, x, y, rad = 2) { h.fillStyle = g(255); h.beginPath(); h.arc(x, y, rad, 0, 7); h.fill(); a.fillStyle = 'rgba(235,235,240,.8)'; a.beginPath(); a.arc(x, y, rad * 0.8, 0, 7); a.fill(); }

// ── 宇宙船・ステーション外装パネル ─────────────────────────────
function hullSet(seed = 1, size = 1024) {
  const [A, H, R, a, h, r] = three(size, 225, 150, 120), rnd = rng(seed), P = [];
  (function sp(x, y, w, hh, d) {
    const mn = size / 14;
    if (d < 7 && (w > mn * 2 || hh > mn * 2) && (d < 2 || rnd() > 0.12)) {
      if (w > hh * (0.6 + rnd() * 0.8)) { const s = Math.round(w * (0.3 + rnd() * 0.4) / 8) * 8; sp(x, y, s, hh, d + 1); sp(x + s, y, w - s, hh, d + 1); }
      else { const s = Math.round(hh * (0.3 + rnd() * 0.4) / 8) * 8; sp(x, y, w, s, d + 1); sp(x, y + s, w, hh - s, d + 1); }
    } else P.push([x, y, w, hh]);
  })(0, 0, size, size, 0);
  for (const [x, y, w, hh] of P) {
    a.fillStyle = g(212 + rnd() * 40); a.fillRect(x, y, w, hh);
    h.fillStyle = g(150 + rnd() * 50); h.fillRect(x, y, w, hh);
    r.fillStyle = g(90 + rnd() * 75); r.fillRect(x, y, w, hh);
    h.strokeStyle = g(95); h.lineWidth = 7; h.strokeRect(x, y, w, hh); h.strokeStyle = g(15); h.lineWidth = 2.5; h.strokeRect(x, y, w, hh);
    a.strokeStyle = 'rgba(18,20,24,.8)'; a.lineWidth = 2; a.strokeRect(x, y, w, hh);
    r.strokeStyle = g(215); r.lineWidth = 3; r.strokeRect(x, y, w, hh);
    const t = rnd();
    if (t < 0.14 && w > 50 && hh > 30) {
      const n = Math.floor((hh - 16) / 7);
      for (let i = 0; i < n; i++) { const yy = y + 10 + i * 7; h.fillStyle = g(30); h.fillRect(x + 10, yy, w - 20, 3); a.fillStyle = 'rgba(8,8,10,.85)'; a.fillRect(x + 10, yy, w - 20, 3); }
    } else if (t < 0.25 && w > 40 && hh > 40) {
      const m = 8; a.strokeStyle = 'rgba(30,32,36,.7)'; a.lineWidth = 2; a.strokeRect(x + m, y + m, w - 2 * m, hh - 2 * m);
      h.strokeStyle = g(60); h.lineWidth = 3; h.strokeRect(x + m, y + m, w - 2 * m, hh - 2 * m);
      for (const [cx, cy] of [[x + m + 5, y + m + 5], [x + w - m - 5, y + m + 5], [x + m + 5, y + hh - m - 5], [x + w - m - 5, y + hh - m - 5]]) dot3(h, a, cx, cy, 2.5);
    } else if (t < 0.31 && w > 60) { a.fillStyle = 'rgba(55,60,70,.5)'; a.fillRect(x + 2, y + 2, w - 4, hh - 4); }
    else if (t < 0.35 && w > 80 && hh > 24) {
      a.save(); a.beginPath(); a.rect(x + 4, y + 4, w - 8, 10); a.clip();
      for (let i = -20; i < w; i += 16) { a.fillStyle = 'rgba(215,170,40,.9)'; a.beginPath(); a.moveTo(x + i, y + 14); a.lineTo(x + i + 8, y + 14); a.lineTo(x + i + 18, y + 4); a.lineTo(x + i + 10, y + 4); a.fill(); }
      a.restore();
    } else if (t < 0.43 && w > 70 && hh > 26) {
      a.fillStyle = 'rgba(40,44,50,.75)'; a.font = `bold ${Math.min(18, hh * 0.5) | 0}px monospace`;
      a.fillText(pick(rnd, ['A-', 'B-', 'K-', 'SX', 'NV', 'Z-']) + ((rnd() * 90 + 10) | 0), x + 8, y + hh - 8);
    }
    if (rnd() < 0.5) { const n = Math.floor(w / 22); for (let i = 1; i < n; i++) dot3(h, a, x + i * 22, y + 5, 1.6); }
  }
  for (let i = 0; i < 240; i++) {
    const x = rnd() * size, y = rnd() * size, l = 20 + rnd() * 140, gr = a.createLinearGradient(0, y, 0, y + l);
    gr.addColorStop(0, 'rgba(15,12,10,.2)'); gr.addColorStop(1, 'rgba(15,12,10,0)'); a.fillStyle = gr; a.fillRect(x, y, 1 + rnd() * 4, l);
  }
  for (let i = 0; i < 320; i++) { r.strokeStyle = g(40 + rnd() * 60); r.lineWidth = 0.6; r.beginPath(); const x = rnd() * size, y = rnd() * size; r.moveTo(x, y); r.lineTo(x + (rnd() - 0.5) * 60, y + (rnd() - 0.5) * 60); r.stroke(); }
  grime(a, r, size, seed + 3);
  return finish(A, H, R, 3);
}

// ── 室内の壁パネル（1リピート=4m 四方） ───────────────────────
function wallSet(seed = 2, size = 1024) {
  const [A, H, R, a, h, r] = three(size, 198, 170, 125), rnd = rng(seed), u = size / 4;
  const panel = (x, y, w, hh, v = 0) => {
    a.fillStyle = g(190 + v + rnd() * 14); a.fillRect(x, y, w, hh); h.fillStyle = g(175 + rnd() * 30); h.fillRect(x, y, w, hh);
    r.fillStyle = g(105 + rnd() * 50); r.fillRect(x, y, w, hh);
    h.strokeStyle = g(100); h.lineWidth = 8; h.strokeRect(x, y, w, hh); h.strokeStyle = g(10); h.lineWidth = 3; h.strokeRect(x, y, w, hh);
    a.strokeStyle = 'rgba(14,16,20,.85)'; a.lineWidth = 2.5; a.strokeRect(x, y, w, hh); r.strokeStyle = g(220); r.lineWidth = 3; r.strokeRect(x, y, w, hh);
  };
  // 上段 (y=2.6〜4m)
  for (let i = 0; i < 4; i++) {
    const x = i * u; panel(x, 0, u, u * 1.4, -6);
    if (i % 2 === 0) for (let k = 0; k < 9; k++) { const yy = 40 + k * 14; h.fillStyle = g(25); h.fillRect(x + 36, yy, u - 72, 6); a.fillStyle = 'rgba(6,6,8,.9)'; a.fillRect(x + 36, yy, u - 72, 6); }
    else { a.strokeStyle = 'rgba(40,44,50,.6)'; a.lineWidth = 2; a.strokeRect(x + 30, 40, u - 60, u * 1.4 - 80); h.strokeStyle = g(120); h.lineWidth = 4; h.strokeRect(x + 30, 40, u - 60, u * 1.4 - 80); }
  }
  // 配管帯
  h.fillStyle = g(235); h.fillRect(0, u * 1.4 - 10, size, 20); a.fillStyle = g(140); a.fillRect(0, u * 1.4 - 10, size, 20); r.fillStyle = g(70); r.fillRect(0, u * 1.4 - 10, size, 20);
  // 中段 (1.0〜2.6m)
  for (let i = 0; i < 2; i++) {
    const x = i * u * 2; panel(x, u * 1.4 + 10, u * 2, u * 1.6 - 10, 8);
    a.fillStyle = 'rgba(255,255,255,.05)'; a.fillRect(x + 24, u * 1.4 + 34, u * 2 - 48, u * 1.6 - 58);
    h.strokeStyle = g(140); h.lineWidth = 5; h.strokeRect(x + 24, u * 1.4 + 34, u * 2 - 48, u * 1.6 - 58);
    for (const cx of [x + 14, x + u * 2 - 14]) for (let k = 0; k < 5; k++) dot3(h, a, cx, u * 1.4 + 40 + k * (u * 1.6 - 70) / 4, 3);
    if (rnd() < 0.8) { a.fillStyle = 'rgba(30,34,40,.7)'; a.font = 'bold 20px monospace'; a.fillText(pick(rnd, ['SEC-', 'DECK ', 'LV.', 'BLK-']) + ((rnd() * 9 + 1) | 0), x + 40, u * 1.4 + 70); }
  }
  // 下段 (0〜1.0m) キックプレート
  for (let i = 0; i < 4; i++) { const x = i * u; panel(x, u * 3, u, u, -34); a.fillStyle = 'rgba(0,0,0,.18)'; a.fillRect(x, u * 3, u, u); }
  for (let i = 0; i < 8; i++) { a.fillStyle = 'rgba(215,170,40,.55)'; a.fillRect(i * u / 2 + 6, size - 22, u / 2 - 40, 8); }
  for (let i = 0; i < 160; i++) { const x = rnd() * size, y = rnd() * size, l = 20 + rnd() * 100, gr = a.createLinearGradient(0, y, 0, y + l); gr.addColorStop(0, 'rgba(10,10,10,.14)'); gr.addColorStop(1, 'rgba(10,10,10,0)'); a.fillStyle = gr; a.fillRect(x, y, 1 + rnd() * 3, l); }
  // 擬似AO: 床際と天井際を暗く
  let gr = a.createLinearGradient(0, size - 90, 0, size); gr.addColorStop(0, 'rgba(0,0,0,0)'); gr.addColorStop(1, 'rgba(0,0,0,.55)'); a.fillStyle = gr; a.fillRect(0, size - 90, size, 90);
  grime(a, r, size, seed + 3, 0.7);
  return finish(A, H, R, 3);
}

// ── 床: 縞鋼板 (1リピート=2m) ─────────────────────────────────
function plateSet(seed = 3, size = 1024) {
  const [A, H, R, a, h, r] = three(size, 150, 120, 110), rnd = rng(seed), u = size / 2;
  for (let ty = 0; ty < 2; ty++) for (let tx = 0; tx < 2; tx++) {
    const x = tx * u, y = ty * u;
    a.fillStyle = g(140 + rnd() * 26); a.fillRect(x, y, u, u); r.fillStyle = g(85 + rnd() * 40); r.fillRect(x, y, u, u);
    h.fillStyle = g(120); h.fillRect(x, y, u, u);
    for (let j = 0; j < 14; j++) for (let i = 0; i < 14; i++) {
      const cx = x + 28 + i * 33, cy = y + 28 + j * 33, rot = (i + j) % 2 ? 0.785 : -0.785;
      h.save(); h.translate(cx, cy); h.rotate(rot); h.fillStyle = g(215); h.beginPath(); h.ellipse(0, 0, 11, 3.2, 0, 0, 7); h.fill(); h.restore();
      a.save(); a.translate(cx, cy); a.rotate(rot); a.fillStyle = 'rgba(255,255,255,.07)'; a.beginPath(); a.ellipse(0, 0, 11, 3.2, 0, 0, 7); a.fill(); a.restore();
    }
    h.strokeStyle = g(10); h.lineWidth = 5; h.strokeRect(x, y, u, u); a.strokeStyle = 'rgba(8,8,10,.9)'; a.lineWidth = 4; a.strokeRect(x, y, u, u); r.strokeStyle = g(230); r.lineWidth = 5; r.strokeRect(x, y, u, u);
    for (const [cx, cy] of [[x + 12, y + 12], [x + u - 12, y + 12], [x + 12, y + u - 12], [x + u - 12, y + u - 12]]) dot3(h, a, cx, cy, 4);
  }
  for (let i = 0; i < 500; i++) { r.strokeStyle = g(30 + rnd() * 50); r.lineWidth = 0.8; r.beginPath(); const x = rnd() * size, y = rnd() * size; r.moveTo(x, y); r.lineTo(x + (rnd() - 0.5) * 90, y + (rnd() - 0.5) * 90); r.stroke(); }
  grime(a, r, size, seed + 9, 1.1);
  return finish(A, H, R, 2.6);
}

// ── 床: グレーチング (1リピート=1m) ───────────────────────────
function grateSet(seed = 4, size = 512) {
  const [A, H, R, a, h, r] = three(size, 16, 0, 230), n = 16, s = size / n;
  for (let i = 0; i < n; i++) {
    a.fillStyle = g(150); a.fillRect(i * s + s * 0.3, 0, s * 0.4, size); h.fillStyle = g(230); h.fillRect(i * s + s * 0.3, 0, s * 0.4, size); r.fillStyle = g(90); r.fillRect(i * s + s * 0.3, 0, s * 0.4, size);
  }
  for (let j = 0; j < 4; j++) { const y = j * size / 4 + size / 8 - 6; a.fillStyle = g(165); a.fillRect(0, y, size, 12); h.fillStyle = g(255); h.fillRect(0, y, size, 12); r.fillStyle = g(80); r.fillRect(0, y, size, 12); }
  a.strokeStyle = g(120); a.lineWidth = 10; a.strokeRect(0, 0, size, size); h.strokeStyle = g(255); h.lineWidth = 10; h.strokeRect(0, 0, size, size);
  grime(a, r, size, seed, 0.6);
  return finish(A, H, R, 4);
}

// ── 床: 六角タイル (1リピート=2m) ─────────────────────────────
function hexSet(seed = 5, size = 1024) {
  const [A, H, R, a, h, r] = three(size, 30, 20, 220), rnd = rng(seed), cols = 8, hw = size / cols, hr = hw / Math.sqrt(3), rows = Math.round(size / (hr * 1.5));
  const hrY = size / rows / 1.5;
  for (let j = -1; j <= rows; j++) for (let i = -1; i <= cols; i++) {
    const cx = i * hw + (j & 1 ? hw / 2 : 0), cy = j * hrY * 1.5, v = rnd();
    const path = (c, k) => { c.beginPath(); for (let q = 0; q < 6; q++) { const an = Math.PI / 6 + q * Math.PI / 3, px = cx + Math.cos(an) * hr * k, py = cy + Math.sin(an) * hrY * k; q ? c.lineTo(px, py) : c.moveTo(px, py); } c.closePath(); };
    path(a, 0.93); a.fillStyle = g(150 + v * 50); a.fill(); path(h, 0.93); h.fillStyle = g(170 + v * 30); h.fill(); path(h, 0.8); h.fillStyle = g(205 + v * 30); h.fill();
    path(r, 0.93); r.fillStyle = g(50 + rnd() * 60); r.fill();
    if (v > 0.9) { path(a, 0.5); a.strokeStyle = 'rgba(0,0,0,.35)'; a.lineWidth = 3; a.stroke(); }
  }
  grime(a, r, size, seed, 0.7);
  return finish(A, H, R, 2.4);
}

// ── 床: 大判タイル (1リピート=2m) ─────────────────────────────
function tileSet(seed = 6, size = 1024) {
  const [A, H, R, a, h, r] = three(size, 225, 200, 40), rnd = rng(seed), n = 2, s = size / n;
  for (let j = 0; j < n; j++) for (let i = 0; i < n; i++) {
    a.fillStyle = g(215 + rnd() * 22); a.fillRect(i * s, j * s, s, s); r.fillStyle = g(30 + rnd() * 30); r.fillRect(i * s, j * s, s, s);
    h.strokeStyle = g(60); h.lineWidth = 6; h.strokeRect(i * s, j * s, s, s); a.strokeStyle = 'rgba(60,64,70,.9)'; a.lineWidth = 3; a.strokeRect(i * s, j * s, s, s); r.strokeStyle = g(200); r.lineWidth = 4; r.strokeRect(i * s, j * s, s, s);
  }
  const n2 = noiseCanvas(256, 3, seed + 2, 5, 200, 255); a.globalCompositeOperation = 'multiply'; a.drawImage(n2, 0, 0, size, size); a.globalCompositeOperation = 'source-over';
  const n3 = noiseCanvas(256, 6, seed + 4, 4, 0, 120); r.globalAlpha = 0.5; r.drawImage(n3, 0, 0, size, size); r.globalAlpha = 1;
  return finish(A, H, R, 1.5);
}

function carpetSet(seed = 7, size = 512) {
  const [A, H, R, a, h, r] = three(size, 200, 128, 245), rnd = rng(seed);
  const im = a.getImageData(0, 0, size, size), hm = h.getImageData(0, 0, size, size);
  for (let i = 0; i < size * size; i++) { const v = 170 + rnd() * 70, w = rnd() * 255; im.data[i * 4] = im.data[i * 4 + 1] = im.data[i * 4 + 2] = v; hm.data[i * 4] = hm.data[i * 4 + 1] = hm.data[i * 4 + 2] = w; }
  a.putImageData(im, 0, 0); h.putImageData(hm, 0, 0);
  a.strokeStyle = 'rgba(0,0,0,.25)'; a.lineWidth = 6; for (let i = 0; i < 4; i++) { a.strokeRect(i * size / 4, 0, size / 4, size); }
  a.strokeStyle = 'rgba(255,255,255,.12)'; a.lineWidth = 2; for (let i = 0; i < 8; i++) { a.beginPath(); a.moveTo(0, i * size / 8 + 20); a.lineTo(size, i * size / 8 + 20); a.stroke(); }
  return finish(A, H, R, 1.2);
}

function woodSet(seed = 8, size = 1024) {
  const [A, H, R, a, h, r] = three(size, 170, 128, 120), rnd = rng(seed), rows = 8, s = size / rows;
  for (let j = 0; j < rows; j++) {
    let x = -rnd() * 300;
    while (x < size) {
      const w = 260 + rnd() * 300, v = rnd(), col = `rgb(${150 + v * 60 | 0},${105 + v * 45 | 0},${62 + v * 30 | 0})`;
      a.fillStyle = col; a.fillRect(x, j * s, w, s); h.fillStyle = g(150 + rnd() * 30); h.fillRect(x, j * s, w, s);
      for (let k = 0; k < 26; k++) { a.strokeStyle = `rgba(60,34,14,${0.08 + rnd() * 0.16})`; a.lineWidth = 0.6 + rnd() * 1.6; a.beginPath(); const yy = j * s + rnd() * s; a.moveTo(x, yy); a.bezierCurveTo(x + w * 0.3, yy + (rnd() - 0.5) * 8, x + w * 0.6, yy + (rnd() - 0.5) * 8, x + w, yy + (rnd() - 0.5) * 6); a.stroke(); }
      h.strokeStyle = g(30); h.lineWidth = 3; h.strokeRect(x, j * s, w, s); a.strokeStyle = 'rgba(25,14,6,.8)'; a.lineWidth = 1.5; a.strokeRect(x, j * s, w, s);
      x += w;
    }
  }
  const n = noiseCanvas(256, 8, seed, 4, 60, 150); r.drawImage(n, 0, 0, size, size);
  return finish(A, H, R, 1.6);
}

function concreteSet(seed = 9, size = 1024) {
  const [A, H, R, a, h, r] = three(size, 150, 128, 210), rnd = rng(seed);
  a.drawImage(noiseCanvas(512, 4, seed, 6, 110, 190), 0, 0, size, size); h.drawImage(noiseCanvas(512, 16, seed + 1, 5, 90, 170), 0, 0, size, size);
  r.drawImage(noiseCanvas(256, 8, seed + 2, 4, 150, 245), 0, 0, size, size);
  for (let i = 0; i < 4; i++) { h.fillStyle = g(40); h.fillRect(0, i * size / 4, size, 4); h.fillRect(i * size / 4, 0, 4, size); a.fillStyle = 'rgba(20,20,22,.6)'; a.fillRect(0, i * size / 4, size, 3); a.fillRect(i * size / 4, 0, 3, size); }
  for (let i = 0; i < 14; i++) { let x = rnd() * size, y = rnd() * size; a.strokeStyle = 'rgba(15,15,18,.55)'; h.strokeStyle = g(20); a.lineWidth = h.lineWidth = 1.5; a.beginPath(); h.beginPath(); a.moveTo(x, y); h.moveTo(x, y); for (let k = 0; k < 10; k++) { x += (rnd() - 0.5) * 60; y += rnd() * 40; a.lineTo(x, y); h.lineTo(x, y); } a.stroke(); h.stroke(); }
  for (let i = 0; i < 90; i++) { const x = rnd() * size, y = rnd() * size, l = 40 + rnd() * 200, gr = a.createLinearGradient(0, y, 0, y + l); gr.addColorStop(0, 'rgba(10,10,12,.2)'); gr.addColorStop(1, 'rgba(10,10,12,0)'); a.fillStyle = gr; a.fillRect(x, y, 2 + rnd() * 8, l); }
  return finish(A, H, R, 2.2);
}

function rockSet(seed = 10, size = 1024) {
  const [A, H, R, a, h, r] = three(size, 150, 128, 230);
  h.drawImage(noiseCanvas(512, 4, seed, 7, 0, 255, (t) => { const q = 1 - Math.abs(t * 2 - 1); return q * q * 0.6 + t * 0.4; }), 0, 0, size, size);
  a.drawImage(noiseCanvas(512, 6, seed + 1, 6, 95, 215), 0, 0, size, size);
  a.globalCompositeOperation = 'multiply'; a.drawImage(noiseCanvas(512, 24, seed + 2, 3, 170, 255), 0, 0, size, size); a.globalCompositeOperation = 'source-over';
  r.drawImage(noiseCanvas(256, 8, seed + 3, 4, 170, 250), 0, 0, size, size);
  return finish(A, H, R, 5);
}

function solarSet(seed = 11, size = 512) {
  const [A, H, R, a, h, r] = three(size, 20, 128, 50), n = 4, s = size / n;
  for (let j = 0; j < n; j++) for (let i = 0; i < n; i++) {
    const gr = a.createLinearGradient(i * s, j * s, i * s + s, j * s + s); gr.addColorStop(0, '#0a1c4a'); gr.addColorStop(1, '#122a6e'); a.fillStyle = gr; a.fillRect(i * s, j * s, s, s);
    a.strokeStyle = 'rgba(190,200,220,.9)'; a.lineWidth = 3; a.strokeRect(i * s, j * s, s, s); h.strokeStyle = g(230); h.lineWidth = 4; h.strokeRect(i * s, j * s, s, s);
    a.strokeStyle = 'rgba(150,170,220,.35)'; a.lineWidth = 1; for (let k = 1; k < 8; k++) { a.beginPath(); a.moveTo(i * s + k * s / 8, j * s); a.lineTo(i * s + k * s / 8, j * s + s); a.stroke(); }
    r.strokeStyle = g(120); r.lineWidth = 4; r.strokeRect(i * s, j * s, s, s);
  }
  return finish(A, H, R, 1.5);
}

function ribSet(seed = 12, size = 512) {
  const [A, H, R, a, h, r] = three(size, 190, 128, 120), n = 16, s = size / n;
  for (let i = 0; i < n; i++) {
    const gr = h.createLinearGradient(i * s, 0, i * s + s, 0); gr.addColorStop(0, g(40)); gr.addColorStop(0.5, g(240)); gr.addColorStop(1, g(40)); h.fillStyle = gr; h.fillRect(i * s, 0, s, size);
    const g2 = a.createLinearGradient(i * s, 0, i * s + s, 0); g2.addColorStop(0, g(130)); g2.addColorStop(0.5, g(205)); g2.addColorStop(1, g(130)); a.fillStyle = g2; a.fillRect(i * s, 0, s, size);
  }
  h.fillStyle = g(250); h.fillRect(0, 0, size, 14); h.fillRect(0, size / 2, size, 14); a.fillStyle = g(150); a.fillRect(0, 0, size, 14); a.fillRect(0, size / 2, size, 14);
  grime(a, r, size, seed, 1);
  return finish(A, H, R, 3);
}

// 天井パネル (1リピート=4m)
function ceilSet(seed = 13, size = 1024) {
  const [A, H, R, a, h, r] = three(size, 150, 150, 150), rnd = rng(seed), u = size / 4;
  for (let j = 0; j < 4; j++) for (let i = 0; i < 4; i++) {
    const x = i * u, y = j * u; a.fillStyle = g(130 + rnd() * 30); a.fillRect(x, y, u, u); h.fillStyle = g(150 + rnd() * 40); h.fillRect(x, y, u, u);
    h.strokeStyle = g(20); h.lineWidth = 8; h.strokeRect(x, y, u, u); a.strokeStyle = 'rgba(8,8,10,.9)'; a.lineWidth = 5; a.strokeRect(x, y, u, u);
    if ((i + j) % 3 === 0) { for (let k = 0; k < 12; k++) { h.fillStyle = g(30); h.fillRect(x + 30, y + 34 + k * 16, u - 60, 7); a.fillStyle = 'rgba(5,5,6,.9)'; a.fillRect(x + 30, y + 34 + k * 16, u - 60, 7); } }
    else if ((i + j) % 3 === 1) { h.strokeStyle = g(230); h.lineWidth = 10; h.beginPath(); h.moveTo(x + 20, y + u / 2); h.lineTo(x + u - 20, y + u / 2); h.stroke(); a.strokeStyle = g(100); a.lineWidth = 9; a.beginPath(); a.moveTo(x + 20, y + u / 2); a.lineTo(x + u - 20, y + u / 2); a.stroke(); }
  }
  grime(a, r, size, seed, 1);
  return finish(A, H, R, 3);
}

// 水面ノーマル
function waterSet(seed = 14, size = 512) {
  const H = noiseCanvas(size, 6, seed, 6, 0, 255);
  const A = cv(8), R = cv(8); A.getContext('2d').fillStyle = '#fff'; A.getContext('2d').fillRect(0, 0, 8, 8); R.getContext('2d').fillStyle = g(20); R.getContext('2d').fillRect(0, 0, 8, 8);
  return { map: ctex(A, true), normalMap: ctex(normalFromHeight(H, 6)), roughnessMap: ctex(R) };
}

// ── 追加の壁・床 (拠点ごとの作り分け用) ──
// リベット打ちの隔壁 (1リピート=4m)
function bulkSet(seed = 21, size = 1024) {
  const [A, H, R, a, h, r] = three(size, 150, 150, 150), rnd = rng(seed), u = size / 4;
  for (let j = 0; j < 4; j++) for (let i = 0; i < 2; i++) {
    const x = i * u * 2 + (j % 2 ? u : 0), y = j * u, w = u * 2;
    for (const ox of [0, -size]) { a.fillStyle = g(120 + rnd() * 40); a.fillRect(x + ox, y, w, u); h.fillStyle = g(150 + rnd() * 40); h.fillRect(x + ox, y, w, u); r.fillStyle = g(120 + rnd() * 70); r.fillRect(x + ox, y, w, u);
      h.strokeStyle = g(40); h.lineWidth = 7; h.strokeRect(x + ox, y, w, u); h.strokeStyle = g(240); h.lineWidth = 2; h.strokeRect(x + ox + 6, y + 6, w - 12, u - 12); a.strokeStyle = 'rgba(10,10,12,.85)'; a.lineWidth = 3; a.strokeRect(x + ox, y, w, u);
      for (let k = 0; k < 13; k++) { dot3(h, a, x + ox + 22 + k * (w - 44) / 12, y + 20, 4.5); dot3(h, a, x + ox + 22 + k * (w - 44) / 12, y + u - 20, 4.5); }
      for (let k = 1; k < 5; k++) { dot3(h, a, x + ox + 20, y + 20 + k * (u - 40) / 5, 4.5); dot3(h, a, x + ox + w - 20, y + 20 + k * (u - 40) / 5, 4.5); } }
  }
  for (let i = 0; i < 120; i++) { const x = rnd() * size, y = rnd() * size, l = 30 + rnd() * 160, gr = a.createLinearGradient(0, y, 0, y + l); gr.addColorStop(0, 'rgba(60,30,10,.22)'); gr.addColorStop(1, 'rgba(60,30,10,0)'); a.fillStyle = gr; a.fillRect(x, y, 2 + rnd() * 6, l); }
  let gr = a.createLinearGradient(0, size - 80, 0, size); gr.addColorStop(0, 'rgba(0,0,0,0)'); gr.addColorStop(1, 'rgba(0,0,0,.5)'); a.fillStyle = gr; a.fillRect(0, size - 80, size, 80);
  grime(a, r, size, seed + 3, 1.2);
  return finish(A, H, R, 3.2);
}
// 滑らかな複合材パネル (1リピート=4m)
function smoothSet(seed = 22, size = 1024) {
  const [A, H, R, a, h, r] = three(size, 232, 190, 70), rnd = rng(seed), u = size / 2;
  for (let j = 0; j < 2; j++) for (let i = 0; i < 2; i++) { const x = i * u, y = j * u; a.fillStyle = g(224 + rnd() * 16); a.fillRect(x, y, u, u); r.fillStyle = g(50 + rnd() * 40); r.fillRect(x, y, u, u);
    h.strokeStyle = g(70); h.lineWidth = 5; h.strokeRect(x, y, u, u); a.strokeStyle = 'rgba(70,76,84,.8)'; a.lineWidth = 2; a.strokeRect(x, y, u, u); }
  a.fillStyle = 'rgba(40,46,54,.9)'; a.fillRect(0, u - 26, size, 52); h.fillStyle = g(120); h.fillRect(0, u - 26, size, 52); r.fillStyle = g(160); r.fillRect(0, u - 26, size, 52);
  for (let i = 0; i < 4; i++) { const x = 60 + i * 250; a.fillStyle = 'rgba(30,34,40,.75)'; a.fillRect(x, 60, 90, 44); h.fillStyle = g(110); h.fillRect(x, 60, 90, 44); for (let k = 0; k < 5; k++) { h.fillStyle = g(30); h.fillRect(x + 8, 66 + k * 8, 74, 3); } }
  a.fillStyle = 'rgba(60,66,74,.9)'; a.fillRect(0, size - 60, size, 60); h.fillStyle = g(230); h.fillRect(0, size - 60, size, 60); r.fillStyle = g(130); r.fillRect(0, size - 60, size, 60);
  let gr = a.createLinearGradient(0, size - 110, 0, size); gr.addColorStop(0, 'rgba(0,0,0,0)'); gr.addColorStop(1, 'rgba(0,0,0,.42)'); a.fillStyle = gr; a.fillRect(0, size - 110, size, 110);
  const n = noiseCanvas(256, 3, seed, 4, 225, 255); a.globalCompositeOperation = 'multiply'; a.drawImage(n, 0, 0, size, size); a.globalCompositeOperation = 'source-over';
  return finish(A, H, R, 2);
}
// キルティング張り (高級ラウンジ, 1リピート=2m)
function paddedSet(seed = 23, size = 512) {
  const [A, H, R, a, h, r] = three(size, 150, 60, 190), n = 4, s = size / n;
  for (let j = -1; j <= n * 2; j++) for (let i = -1; i <= n; i++) { const cx = i * s + (j & 1 ? s / 2 : 0), cy = j * s / 2, gr = h.createRadialGradient(cx, cy, 0, cx, cy, s * 0.62); gr.addColorStop(0, g(255)); gr.addColorStop(0.7, g(150)); gr.addColorStop(1, g(40));
    h.fillStyle = gr; h.beginPath(); h.moveTo(cx, cy - s / 2); h.lineTo(cx + s / 2, cy); h.lineTo(cx, cy + s / 2); h.lineTo(cx - s / 2, cy); h.fill();
    const g2 = a.createRadialGradient(cx - s * 0.1, cy - s * 0.1, 0, cx, cy, s * 0.6); g2.addColorStop(0, g(215)); g2.addColorStop(1, g(120)); a.fillStyle = g2; a.beginPath(); a.moveTo(cx, cy - s / 2); a.lineTo(cx + s / 2, cy); a.lineTo(cx, cy + s / 2); a.lineTo(cx - s / 2, cy); a.fill(); }
  for (let j = 0; j <= n * 2; j++) for (let i = 0; i <= n; i++) { const cx = i * s + (j & 1 ? 0 : s / 2), cy = j * s / 2; h.fillStyle = g(10); h.beginPath(); h.arc(cx, cy, 7, 0, 7); h.fill(); a.fillStyle = g(235); a.beginPath(); a.arc(cx, cy, 5, 0, 7); a.fill(); r.fillStyle = g(40); r.beginPath(); r.arc(cx, cy, 5, 0, 7); r.fill(); }
  return finish(A, H, R, 3.4);
}
// レンガ (1リピート=2m)
function brickSet(seed = 24, size = 1024) {
  const [A, H, R, a, h, r] = three(size, 90, 40, 235), rnd = rng(seed), rows = 24, bh = size / rows, bw = size / 8;
  for (let j = 0; j < rows; j++) for (let i = -1; i < 8; i++) { const x = i * bw + (j & 1 ? bw / 2 : 0) + 3, y = j * bh + 3, v = rnd(); a.fillStyle = g(150 + v * 80); a.fillRect(x, y, bw - 6, bh - 6); h.fillStyle = g(190 + rnd() * 50); h.fillRect(x, y, bw - 6, bh - 6); r.fillStyle = g(170 + rnd() * 60); r.fillRect(x, y, bw - 6, bh - 6);
    if (rnd() < 0.2) { a.fillStyle = 'rgba(0,0,0,.25)'; a.fillRect(x, y, bw - 6, bh - 6); } }
  grime(a, r, size, seed, 1.1);
  return finish(A, H, R, 3);
}
// 漆喰 (1リピート=4m)
function plasterSet(seed = 25, size = 512) {
  const [A, H, R, a, h, r] = three(size, 225, 128, 225);
  a.drawImage(noiseCanvas(256, 4, seed, 5, 205, 250), 0, 0, size, size); h.drawImage(noiseCanvas(256, 16, seed + 1, 5, 80, 180), 0, 0, size, size); r.drawImage(noiseCanvas(256, 8, seed + 2, 4, 190, 250), 0, 0, size, size);
  let gr = a.createLinearGradient(0, size - 70, 0, size); gr.addColorStop(0, 'rgba(0,0,0,0)'); gr.addColorStop(1, 'rgba(0,0,0,.4)'); a.fillStyle = gr; a.fillRect(0, size - 70, size, 70);
  return finish(A, H, R, 1.3);
}
// 障子・格子 (1リピート=2m)
function shojiSet(seed = 26, size = 512) {
  const [A, H, R, a, h, r] = three(size, 238, 120, 200), n = 4, s = size / n;
  a.drawImage(noiseCanvas(256, 8, seed, 4, 225, 250), 0, 0, size, size);
  for (let i = 0; i <= n; i++) { a.fillStyle = g(52); h.fillStyle = g(240); r.fillStyle = g(120); const w = i % 2 ? 10 : 20; a.fillRect(i * s - w / 2, 0, w, size); h.fillRect(i * s - w / 2, 0, w, size); r.fillRect(i * s - w / 2, 0, w, size); }
  for (let j = 0; j <= n * 2; j++) { a.fillStyle = g(52); h.fillStyle = g(240); const w = j % 4 ? 8 : 20; a.fillRect(0, j * s / 2 - w / 2, size, w); h.fillRect(0, j * s / 2 - w / 2, size, w); }
  return finish(A, H, R, 2);
}
// 大理石 (1リピート=3m)
function marbleSet(seed = 27, size = 1024) {
  const [A, H, R, a, h, r] = three(size, 235, 128, 30);
  a.drawImage(noiseCanvas(512, 3, seed, 6, 150, 255, (t) => { const v = 1 - Math.abs(t * 2 - 1); return 1 - Math.pow(v, 9) * 0.85; }), 0, 0, size, size);
  a.globalCompositeOperation = 'multiply'; a.drawImage(noiseCanvas(512, 6, seed + 3, 5, 200, 255, (t) => { const v = 1 - Math.abs(t * 2 - 1); return 1 - Math.pow(v, 14) * 0.6; }), 0, 0, size, size); a.globalCompositeOperation = 'source-over';
  for (let i = 0; i <= 2; i++) { a.fillStyle = 'rgba(40,40,44,.55)'; a.fillRect(i * size / 2 - 1.5, 0, 3, size); a.fillRect(0, i * size / 2 - 1.5, size, 3); h.fillStyle = g(60); h.fillRect(i * size / 2 - 2, 0, 4, size); h.fillRect(0, i * size / 2 - 2, size, 4); }
  r.drawImage(noiseCanvas(256, 6, seed + 5, 3, 15, 60), 0, 0, size, size);
  return finish(A, H, R, 0.8);
}
// 草地 (1リピート=3m)
function grassSet(seed = 28, size = 512) {
  const [A, H, R, a, h, r] = three(size, 150, 128, 240), rnd = rng(seed);
  a.drawImage(noiseCanvas(256, 6, seed, 5, 110, 230), 0, 0, size, size); h.drawImage(noiseCanvas(256, 32, seed + 1, 3, 40, 220), 0, 0, size, size);
  for (let i = 0; i < 5000; i++) { const x = rnd() * size, y = rnd() * size, v = 120 + rnd() * 130; a.strokeStyle = `rgba(${v | 0},${v | 0},${v | 0},.5)`; a.lineWidth = 1; a.beginPath(); a.moveTo(x, y); a.lineTo(x + (rnd() - 0.5) * 5, y - 4 - rnd() * 7); a.stroke(); }
  return finish(A, H, R, 2.4);
}
const BUILDERS = { bulk: bulkSet, smooth: smoothSet, padded: paddedSet, brick: brickSet, plaster: plasterSet, shoji: shojiSet, marble: marbleSet, grass: grassSet, hull: hullSet, wall: wallSet, plate: plateSet, grate: grateSet, hex: hexSet, tile: tileSet, carpet: carpetSet, wood: woodSet, concrete: concreteSet, rock: rockSet, solar: solarSet, rib: ribSet, ceil: ceilSet, water: waterSet };
const UVS = { bulk: 0.25, smooth: 0.25, padded: 0.5, brick: 0.5, plaster: 0.25, shoji: 0.5, marble: 0.33, grass: 0.33, hull: 0.11, wall: 0.25, plate: 0.5, grate: 1, hex: 0.5, tile: 0.5, carpet: 1, wood: 0.4, concrete: 0.25, rock: 0.2, solar: 0.25, rib: 0.5, ceil: 0.25, water: 0.05 };
const SETS = {};
export function texSet(name) { return SETS[name] || (SETS[name] = BUILDERS[name]()); }
/** 追加のテクスチャ様式を登録する (textures2.js から)。uvs = 1m あたりの繰り返し数 */
export function registerTex(name, builder, uvs = 0.25) { BUILDERS[name] = builder; UVS[name] = uvs; }

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
  m.envMapIntensity = o.env ?? 1;
  m.userData.uvs = o.uvs ?? UVS[style] ?? 0.25;
  MATS.set(key, m);
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
let _win;
/** ステーション外壁用の窓明かり (エミッシブ) */
export function windowsTex() {
  if (_win) return _win;
  const s = 1024, c = cv(s), x = c.getContext('2d'), rnd = rng(77); x.fillStyle = '#000'; x.fillRect(0, 0, s, s);
  for (let j = 0; j < 32; j++) {
    if (rnd() < 0.25) continue;
    const cols = pick(rnd, [24, 32, 48]), w = s / cols, warm = rnd() < 0.7;
    for (let i = 0; i < cols; i++) {
      if (rnd() < 0.45) continue;
      const v = 0.5 + rnd() * 0.5;
      x.fillStyle = warm ? `rgba(${255 * v | 0},${205 * v | 0},${130 * v | 0},1)` : `rgba(${150 * v | 0},${215 * v | 0},${255 * v | 0},1)`;
      x.fillRect(i * w + w * 0.2, j * 32 + 9, w * 0.6, 12);
    }
  }
  return (_win = ctex(c, true));
}
let _glow;
export function glowTex() {
  if (_glow) return _glow;
  const s = 128, c = cv(s), x = c.getContext('2d'), gr = x.createRadialGradient(s / 2, s / 2, 0, s / 2, s / 2, s / 2);
  gr.addColorStop(0, 'rgba(255,255,255,1)'); gr.addColorStop(0.2, 'rgba(255,255,255,.55)'); gr.addColorStop(0.5, 'rgba(255,255,255,.14)'); gr.addColorStop(1, 'rgba(255,255,255,0)');
  x.fillStyle = gr; x.fillRect(0, 0, s, s);
  return (_glow = ctex(c, true, false));
}

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
  SCREENS.push(s); drawScreen(s, 0);
  return t;
}
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
  _scrAcc += dt; if (_scrAcc < 0.12 || !SCREENS.length) return; _scrAcc = 0;
  for (let k = 0; k < 2; k++) { _scrIdx = (_scrIdx + 1) % SCREENS.length; drawScreen(SCREENS[_scrIdx], time); }
}
export function screenMat(kind, color, title, intensity = 1.6) {
  const m = new THREE.MeshBasicMaterial({ map: screenTex(kind, color, title), toneMapped: false });
  m.color.setScalar(intensity); m.userData.uvs = 0;
  return m;
}

// ── 接地影 / AO デカール ──
let _sh, _ed, _aoB, _aoE;
function shadowTex() {
  if (_sh) return _sh; const s = 128, c = cv(s), x = c.getContext('2d'), gr = x.createRadialGradient(s / 2, s / 2, 0, s / 2, s / 2, s / 2);
  gr.addColorStop(0, '#fff'); gr.addColorStop(0.5, '#8a8a8a'); gr.addColorStop(0.8, '#2a2a2a'); gr.addColorStop(1, '#000'); x.fillStyle = gr; x.fillRect(0, 0, s, s);
  return (_sh = ctex(c, false, false));
}
function edgeTex() {
  if (_ed) return _ed; const c = cv(8, 128), x = c.getContext('2d'), gr = x.createLinearGradient(0, 0, 0, 128);
  gr.addColorStop(0, '#fff'); gr.addColorStop(0.18, '#9a9a9a'); gr.addColorStop(0.5, '#333'); gr.addColorStop(1, '#000'); x.fillStyle = gr; x.fillRect(0, 0, 8, 128);
  return (_ed = ctex(c, false, false));
}
/** 床に落ちる柔らかい影。kind: 'blob' (丸) | 'edge' (壁際) */
export function aoMat(kind = 'blob') {
  const mk = (t, o) => { const m = new THREE.MeshBasicMaterial({ color: 0x000000, alphaMap: t, transparent: true, opacity: o, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2, toneMapped: false }); m.userData.uvs = 0; return m; };
  if (kind === 'edge') return _aoE || (_aoE = mk(edgeTex(), 0.6));
  return _aoB || (_aoB = mk(shadowTex(), 0.62));
}
// ── 葉の房 (アルファ抜き) ──
let _leaf; const LEAFM = new Map();
function leafTex() {
  if (_leaf) return _leaf; const s = 256, c = cv(s), x = c.getContext('2d'), r = rng(321);
  for (let i = 0; i < 70; i++) {
    const px = 30 + r() * (s - 60), py = 30 + r() * (s - 60), len = 26 + r() * 22, w = len * (0.3 + r() * 0.14), a = r() * 6.283, v = i / 70;
    x.save(); x.translate(px, py); x.rotate(a);
    const gr = x.createLinearGradient(-len, 0, len, 0); gr.addColorStop(0, `rgb(${30 + v * 40 | 0},${88 + v * 70 | 0},${28 + v * 30 | 0})`); gr.addColorStop(1, `rgb(${52 + v * 60 | 0},${120 + v * 80 | 0},${38 + v * 34 | 0})`);
    x.fillStyle = gr; x.beginPath(); x.moveTo(-len, 0); x.quadraticCurveTo(0, -w * 1.5, len, 0); x.quadraticCurveTo(0, w * 1.5, -len, 0); x.fill();
    x.strokeStyle = `rgba(${150 + v * 60 | 0},${200 + v * 40 | 0},${110 + v * 40 | 0},.55)`; x.lineWidth = 1.2; x.beginPath(); x.moveTo(-len * 0.9, 0); x.lineTo(len * 0.9, 0); x.stroke();
    x.restore();
  }
  return (_leaf = ctex(c, true, false));
}
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
