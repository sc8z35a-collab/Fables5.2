// 追加の手続きテクスチャ: 新ステーション 4 基と救助船の内装用 (アルベド / 法線 / ラフネスの 3 枚組)
//   deco      … アールデコの象嵌床 (メガトン)          armor   … 重装甲の壁板 (ウェポン)
//   lab       … クリーンルームの壁パネル (ファイザー)   terrazzo … 人造大理石の床 (アトラス)
//   tread     … 滑り止めのゴム床 (ミケーネ)            brassdeco … 真鍮の縦溝壁 (メガトン)
//   hazard    … 警戒帯の床 (ウェポン)                   quilt   … 断熱キルトの内張り (ミケーネ)
import { rng, pick } from '../core/util.js';
import { three, grime, finish, dot3, g, noiseCanvas, registerTex, JP } from './textures.js';

const TAU = Math.PI * 2;
/** 継ぎ目なく並ぶように、端にかかる図形は反対側にも描く */
const wrap = (size, x, y, m, fn) => { for (const ox of x < m ? [0, size] : x > size - m ? [0, -size] : [0]) for (const oy of y < m ? [0, size] : y > size - m ? [0, -size] : [0]) fn(x + ox, y + oy); };

// ── アールデコの象嵌床 (1 リピート = 4m。クリーム色の大理石に濃緑の縁取りと真鍮の象嵌) ──
function decoSet(seed = 41, size = 1024) {
  const [A, H, R, a, h, r] = three(size, 236, 128, 26), rnd = rng(seed), u = size / 2, GOLD = 'rgb(216,172,80)', GOLD2 = 'rgb(240,206,120)', GRN = 'rgb(28,60,52)', BLK = 'rgb(18,20,22)';
  a.fillStyle = 'rgb(238,230,212)'; a.fillRect(0, 0, size, size);
  for (let i = 0; i < 90; i++) { let x = rnd() * size, y = rnd() * size; a.strokeStyle = `rgba(${130 + rnd() * 40 | 0},${112 + rnd() * 30 | 0},${84 + rnd() * 30 | 0},${0.05 + rnd() * 0.14})`; a.lineWidth = 0.6 + rnd() * 2.4; a.beginPath(); a.moveTo(x, y); for (let k = 0; k < 7; k++) { x += (rnd() - 0.3) * 90; y += (rnd() - 0.5) * 70; a.lineTo(x, y); } a.stroke(); }
  const inlay = (fn, w = 4) => { a.strokeStyle = GOLD; a.lineWidth = w; fn(a); a.strokeStyle = GOLD2; a.lineWidth = w * 0.34; fn(a); h.strokeStyle = g(178); h.lineWidth = w; fn(h); r.strokeStyle = g(74); r.lineWidth = w; fn(r); };
  for (let ty = 0; ty < 2; ty++) for (let tx = 0; tx < 2; tx++) {
    const x = tx * u, y = ty * u, cx = x + u / 2, cy = y + u / 2, B = 44;
    // 濃緑の大理石の縁取り
    a.fillStyle = GRN; a.fillRect(x, y, u, B); a.fillRect(x, y + u - B, u, B); a.fillRect(x, y, B, u); a.fillRect(x + u - B, y, B, u);
    for (let i = 0; i < 26; i++) { a.strokeStyle = `rgba(150,200,170,${0.05 + rnd() * 0.12})`; a.lineWidth = 0.6 + rnd() * 1.4; a.beginPath(); const s = Math.floor(rnd() * 4), t = rnd() * u, q = rnd() * B; const px = s < 2 ? x + t : s === 2 ? x + q : x + u - q, py = s < 2 ? (s ? y + q : y + u - q) : y + t; a.moveTo(px, py); a.lineTo(px + (rnd() - 0.5) * 60, py + (rnd() - 0.5) * 22); a.stroke(); }
    r.fillStyle = g(18); r.fillRect(x, y, u, B); r.fillRect(x, y + u - B, u, B); r.fillRect(x, y, B, u); r.fillRect(x + u - B, y, B, u);
    inlay((c) => c.strokeRect(x + B, y + B, u - 2 * B, u - 2 * B), 5); inlay((c) => c.strokeRect(x + B + 14, y + B + 14, u - 2 * B - 28, u - 2 * B - 28), 2);
    if ((tx + ty) % 2 === 0) { // 日輪 (サンバースト)
      a.fillStyle = BLK; a.beginPath(); a.arc(cx, cy, 34, 0, TAU); a.fill(); r.fillStyle = g(14); r.beginPath(); r.arc(cx, cy, 34, 0, TAU); r.fill();
      for (let i = 0; i < 24; i++) { const an = i * TAU / 24, r0 = 40, r1 = i % 2 ? 132 : 178; inlay((c) => { c.beginPath(); c.moveTo(cx + Math.cos(an) * r0, cy + Math.sin(an) * r0); c.lineTo(cx + Math.cos(an) * r1, cy + Math.sin(an) * r1); c.stroke(); }, i % 2 ? 2.4 : 4); }
      for (const rad of [34, 96, 184]) inlay((c) => { c.beginPath(); c.arc(cx, cy, rad, 0, TAU); c.stroke(); }, rad === 184 ? 5 : 3);
      for (let i = 0; i < 12; i++) { const an = (i + 0.5) * TAU / 12; a.fillStyle = GRN; a.beginPath(); a.moveTo(cx + Math.cos(an) * 104, cy + Math.sin(an) * 104); a.lineTo(cx + Math.cos(an - 0.1) * 150, cy + Math.sin(an - 0.1) * 150); a.lineTo(cx + Math.cos(an) * 172, cy + Math.sin(an) * 172); a.lineTo(cx + Math.cos(an + 0.1) * 150, cy + Math.sin(an + 0.1) * 150); a.fill(); }
    } else { // 入れ子の八角と山形 (シェブロン)
      const oct = (c, rad) => { c.beginPath(); for (let q = 0; q < 8; q++) { const an = q * TAU / 8 + TAU / 16, px = cx + Math.cos(an) * rad, py = cy + Math.sin(an) * rad; q ? c.lineTo(px, py) : c.moveTo(px, py); } c.closePath(); };
      a.fillStyle = GRN; oct(a, 178); a.fill(); r.fillStyle = g(18); oct(r, 178); r.fill(); a.fillStyle = 'rgb(238,230,212)'; oct(a, 132); a.fill(); r.fillStyle = g(26); oct(r, 132); r.fill(); a.fillStyle = BLK; oct(a, 58); a.fill();
      for (const rad of [178, 132, 96, 58]) inlay((c) => { oct(c, rad); c.stroke(); }, rad === 178 ? 5 : 3);
      for (let q = 0; q < 4; q++) { const an = q * TAU / 4; for (const k of [0, 1, 2]) inlay((c) => { const d0 = 68 + k * 12, w = 18 - k * 3; c.beginPath(); c.moveTo(cx + Math.cos(an) * d0 - Math.sin(an) * w, cy + Math.sin(an) * d0 + Math.cos(an) * w); c.lineTo(cx + Math.cos(an) * (d0 + 12), cy + Math.sin(an) * (d0 + 12)); c.lineTo(cx + Math.cos(an) * d0 + Math.sin(an) * w, cy + Math.sin(an) * d0 - Math.cos(an) * w); c.stroke(); }, 2.2); }
    }
    // 四隅の黒御影の菱形と目地
    for (const [px, py] of [[x + B, y + B], [x + u - B, y + B], [x + B, y + u - B], [x + u - B, y + u - B]]) { a.fillStyle = BLK; a.beginPath(); a.moveTo(px, py - 16); a.lineTo(px + 16, py); a.lineTo(px, py + 16); a.lineTo(px - 16, py); a.fill(); inlay((c) => { c.beginPath(); c.moveTo(px, py - 16); c.lineTo(px + 16, py); c.lineTo(px, py + 16); c.lineTo(px - 16, py); c.closePath(); c.stroke(); }, 2); }
    h.strokeStyle = g(52); h.lineWidth = 3; h.strokeRect(x, y, u, u); a.strokeStyle = 'rgba(10,12,12,.85)'; a.lineWidth = 2; a.strokeRect(x, y, u, u); r.strokeStyle = g(150); r.lineWidth = 3; r.strokeRect(x, y, u, u);
  }
  const n = noiseCanvas(256, 4, seed + 2, 5, 214, 255); a.globalCompositeOperation = 'multiply'; a.drawImage(n, 0, 0, size, size); a.globalCompositeOperation = 'source-over';
  r.globalAlpha = 0.35; r.drawImage(noiseCanvas(256, 6, seed + 4, 4, 0, 110), 0, 0, size, size); r.globalAlpha = 1;
  return finish(A, H, R, 1.3);
}

// ── 重装甲の壁板 (1 リピート = 4m。鋲打ちの厚板・溶接痕・下端に警戒帯) ──
function armorSet(seed = 42, size = 1024) {
  const [A, H, R, a, h, r] = three(size, 150, 150, 120), rnd = rng(seed), u = size / 2;
  const plate = (x, y, w, hh, v = 0) => {
    a.fillStyle = g(138 + v + rnd() * 18); a.fillRect(x, y, w, hh); h.fillStyle = g(172 + rnd() * 22); h.fillRect(x, y, w, hh); r.fillStyle = g(105 + rnd() * 55); r.fillRect(x, y, w, hh);
    h.strokeStyle = g(96); h.lineWidth = 12; h.strokeRect(x, y, w, hh); h.strokeStyle = g(14); h.lineWidth = 3.5; h.strokeRect(x, y, w, hh); a.strokeStyle = 'rgba(8,9,11,.9)'; a.lineWidth = 3; a.strokeRect(x, y, w, hh); r.strokeStyle = g(226); r.lineWidth = 4; r.strokeRect(x, y, w, hh);
    for (let px = x + 22; px < x + w - 10; px += 44) { dot3(h, a, px, y + 16, 4.2); dot3(h, a, px, y + hh - 16, 4.2); } for (let py = y + 60; py < y + hh - 40; py += 44) { dot3(h, a, x + 16, py, 4.2); dot3(h, a, x + w - 16, py, 4.2); }
  };
  const Y0 = 0, Y1 = Math.round(size * 0.34), Y2 = Math.round(size * 0.77);
  for (let i = 0; i < 2; i++) { // 上段: 横長の板。通気スリットか銘板
    const x = i * u; plate(x, Y0, u, Y1 - Y0, -8);
    if (i === 0) for (let k = 0; k < 11; k++) { const yy = Y0 + 70 + k * 20; h.fillStyle = g(22); h.fillRect(x + 70, yy, u - 140, 9); a.fillStyle = 'rgba(4,4,6,.92)'; a.fillRect(x + 70, yy, u - 140, 9); h.fillStyle = g(215); h.fillRect(x + 70, yy + 9, u - 140, 3); }
    else { a.strokeStyle = 'rgba(30,32,36,.75)'; a.lineWidth = 3; a.strokeRect(x + 60, Y0 + 64, u - 120, Y1 - 128); h.strokeStyle = g(120); h.lineWidth = 6; h.strokeRect(x + 60, Y0 + 64, u - 120, Y1 - 128);
      a.fillStyle = 'rgba(232,236,240,.5)'; a.font = `900 54px ${JP}`; a.textAlign = 'center'; a.fillText('CAL-880', x + u / 2, Y0 + 170); a.font = `700 24px ${JP}`; a.fillText('MASS DRIVER  電磁投射砲', x + u / 2, Y0 + 222); a.textAlign = 'left'; }
  }
  for (let i = 0; i < 2; i++) { // 中段: 大板の上にさらに増加装甲
    const x = i * u; plate(x, Y1, u, Y2 - Y1, 6);
    const m = 54; a.fillStyle = 'rgba(255,255,255,.045)'; a.fillRect(x + m, Y1 + m, u - 2 * m, Y2 - Y1 - 2 * m); h.fillStyle = g(205); h.fillRect(x + m, Y1 + m, u - 2 * m, Y2 - Y1 - 2 * m); h.strokeStyle = g(120); h.lineWidth = 8; h.strokeRect(x + m, Y1 + m, u - 2 * m, Y2 - Y1 - 2 * m); a.strokeStyle = 'rgba(10,11,13,.7)'; a.lineWidth = 2.5; a.strokeRect(x + m, Y1 + m, u - 2 * m, Y2 - Y1 - 2 * m);
    for (const [cx, cy] of [[x + m + 22, Y1 + m + 22], [x + u - m - 22, Y1 + m + 22], [x + m + 22, Y2 - m - 22], [x + u - m - 22, Y2 - m - 22]]) { dot3(h, a, cx, cy, 8); h.fillStyle = g(40); h.fillRect(cx - 5, cy - 1, 10, 2); }
    if (i === 0) { // 警告の三角標識
      const cx = x + u / 2, cy = Y1 + 190; a.fillStyle = 'rgba(226,176,22,.92)'; a.beginPath(); a.moveTo(cx, cy - 62); a.lineTo(cx + 62, cy + 46); a.lineTo(cx - 62, cy + 46); a.fill(); a.fillStyle = 'rgba(12,12,14,.95)'; a.beginPath(); a.moveTo(cx, cy - 40); a.lineTo(cx + 42, cy + 34); a.lineTo(cx - 42, cy + 34); a.fill();
      a.fillStyle = 'rgba(226,176,22,.95)'; a.beginPath(); a.moveTo(cx + 6, cy - 22); a.lineTo(cx - 12, cy + 6); a.lineTo(cx + 2, cy + 6); a.lineTo(cx - 6, cy + 28); a.lineTo(cx + 14, cy - 2); a.lineTo(cx, cy - 2); a.fill();
      a.font = `900 26px ${JP}`; a.textAlign = 'center'; a.fillText('高電圧 危険', cx, cy + 84); a.textAlign = 'left';
    } else { a.fillStyle = 'rgba(232,236,240,.42)'; a.font = `900 30px ${JP}`; a.fillText('SEC-' + pick(rnd, ['07', '12', '19']), x + m + 26, Y1 + m + 58); a.font = `700 19px ${JP}`; a.fillText('装甲等級 IV', x + m + 26, Y1 + m + 88);
      for (let k = 0; k < 6; k++) { a.fillStyle = 'rgba(8,8,10,.85)'; a.fillRect(x + u - m - 150, Y1 + m + 40 + k * 15, 110, 7); h.fillStyle = g(30); h.fillRect(x + u - m - 150, Y1 + m + 40 + k * 15, 110, 7); } }
    for (let k = 0; k < 16; k++) { a.strokeStyle = `rgba(215,220,226,${0.1 + rnd() * 0.2})`; a.lineWidth = 0.7 + rnd(); a.beginPath(); const px = x + rnd() * u, py = Y1 + rnd() * (Y2 - Y1); a.moveTo(px, py); a.lineTo(px + (rnd() - 0.5) * 90, py + (rnd() - 0.5) * 50); a.stroke(); }
  }
  // 溶接ビード (段の境)
  for (const yy of [Y1, Y2]) for (let x = 0; x < size; x += 9) { h.fillStyle = g(220 + rnd() * 35); h.beginPath(); h.ellipse(x + 4, yy, 5.5, 3.6, 0, 0, TAU); h.fill(); a.fillStyle = `rgba(${90 + rnd() * 40 | 0},${84 + rnd() * 30 | 0},${80 + rnd() * 30 | 0},.9)`; a.beginPath(); a.ellipse(x + 4, yy, 5.5, 3.6, 0, 0, TAU); a.fill(); }
  // 下段: 警戒帯 (黄と黒の斜線) と蹴込み板
  plate(0, Y2, size, size - Y2, -40); a.save(); a.beginPath(); a.rect(0, Y2 + 26, size, 64); a.clip(); a.fillStyle = 'rgb(14,14,16)'; a.fillRect(0, Y2 + 26, size, 64);
  for (let i = -3; i < 20; i++) { a.fillStyle = 'rgb(226,172,18)'; a.beginPath(); a.moveTo(i * 64, Y2 + 90); a.lineTo(i * 64 + 32, Y2 + 90); a.lineTo(i * 64 + 96, Y2 + 26); a.lineTo(i * 64 + 64, Y2 + 26); a.fill(); } a.restore();
  r.fillStyle = g(150); r.fillRect(0, Y2 + 26, size, 64); for (let k = 0; k < 7; k++) { h.fillStyle = g(215); h.fillRect(0, Y2 + 112 + k * 14, size, 6); a.fillStyle = 'rgba(255,255,255,.05)'; a.fillRect(0, Y2 + 112 + k * 14, size, 6); }
  // 油じみ・錆だれ
  for (let i = 0; i < 150; i++) { const x = rnd() * size, y = rnd() * size, l = 30 + rnd() * 150, gr = a.createLinearGradient(0, y, 0, y + l), rust = rnd() < 0.35; gr.addColorStop(0, rust ? 'rgba(120,58,22,.28)' : 'rgba(6,6,8,.26)'); gr.addColorStop(1, 'rgba(10,8,6,0)'); a.fillStyle = gr; a.fillRect(x, y, 1 + rnd() * 5, l); }
  const gr = a.createLinearGradient(0, size - 80, 0, size); gr.addColorStop(0, 'rgba(0,0,0,0)'); gr.addColorStop(1, 'rgba(0,0,0,.5)'); a.fillStyle = gr; a.fillRect(0, size - 80, size, 80);
  grime(a, r, size, seed + 3, 1.0);
  return finish(A, H, R, 3.4);
}

// ── クリーンルームの壁パネル (1 リピート = 4m。白い大判パネル・微細孔の吸音面・点検口) ──
function labSet(seed = 43, size = 1024) {
  const [A, H, R, a, h, r] = three(size, 238, 190, 62), rnd = rng(seed), u = size / 4, YS = Math.round(size * 0.63), YB = Math.round(size * 0.67);
  const rr = (c, x, y, w, hh, rad) => { c.beginPath(); c.moveTo(x + rad, y); c.lineTo(x + w - rad, y); c.quadraticCurveTo(x + w, y, x + w, y + rad); c.lineTo(x + w, y + hh - rad); c.quadraticCurveTo(x + w, y + hh, x + w - rad, y + hh); c.lineTo(x + rad, y + hh); c.quadraticCurveTo(x, y + hh, x, y + hh - rad); c.lineTo(x, y + rad); c.quadraticCurveTo(x, y, x + rad, y); c.closePath(); };
  for (let i = 0; i < 4; i++) {
    const x = i * u;
    a.fillStyle = g(234 + rnd() * 10); a.fillRect(x, 0, u, YS); h.fillStyle = g(196); h.fillRect(x, 0, u, YS); r.fillStyle = g(52 + rnd() * 20); r.fillRect(x, 0, u, YS);
    rr(h, x + 16, 16, u - 32, YS - 32, 22); h.fillStyle = g(214); h.fill(); h.strokeStyle = g(150); h.lineWidth = 4; h.stroke(); rr(a, x + 16, 16, u - 32, YS - 32, 22); a.strokeStyle = 'rgba(120,132,146,.3)'; a.lineWidth = 2; a.stroke();
    if (i % 2 === 0) { // 微細孔 (吸音)
      for (let py = 60; py < YS * 0.52; py += 11) for (let px = x + 44; px < x + u - 40; px += 11) { h.fillStyle = g(120); h.fillRect(px, py, 3, 3); a.fillStyle = 'rgba(70,80,92,.42)'; a.fillRect(px, py, 3, 3); }
    } else { // 点検口と銘板
      rr(h, x + 62, 70, u - 124, 150, 14); h.fillStyle = g(180); h.fill(); h.strokeStyle = g(80); h.lineWidth = 5; h.stroke(); rr(a, x + 62, 70, u - 124, 150, 14); a.strokeStyle = 'rgba(70,80,92,.7)'; a.lineWidth = 2.5; a.stroke();
      for (const [cx, cy] of [[x + 78, 86], [x + u - 78, 86], [x + 78, 204], [x + u - 78, 204]]) dot3(h, a, cx, cy, 3.4);
      a.fillStyle = 'rgba(70,80,96,.72)'; a.font = `700 20px ${JP}`; a.fillText(pick(rnd, ['ISO-5', 'BSL-2', 'GMP-A']), x + 80, 150); a.font = `700 14px ${JP}`; a.fillText(pick(rnd, ['滅菌済', '陽圧区画', '清浄度 5']), x + 80, 174);
    }
    // 腰の金属帯 → 下段パネル → 巾木
    a.fillStyle = g(168); a.fillRect(x, YS, u, YB - YS); h.fillStyle = g(232); h.fillRect(x, YS, u, YB - YS); r.fillStyle = g(86); r.fillRect(x, YS, u, YB - YS); for (let k = 0; k < 3; k++) { a.fillStyle = 'rgba(40,46,56,.4)'; a.fillRect(x, YS + 6 + k * 12, u, 1.5); }
    a.fillStyle = g(226 + rnd() * 10); a.fillRect(x, YB, u, size - YB); h.fillStyle = g(190); h.fillRect(x, YB, u, size - YB); r.fillStyle = g(58 + rnd() * 20); r.fillRect(x, YB, u, size - YB);
    rr(h, x + 16, YB + 14, u - 32, size - YB - 70, 18); h.fillStyle = g(206); h.fill(); h.strokeStyle = g(150); h.lineWidth = 4; h.stroke();
    a.fillStyle = g(118); a.fillRect(x, size - 44, u, 44); h.fillStyle = g(150); h.fillRect(x, size - 44, u, 44); r.fillStyle = g(120); r.fillRect(x, size - 44, u, 44);
    a.strokeStyle = 'rgba(86,96,110,.6)'; a.lineWidth = 2; a.strokeRect(x, 0, u, size); h.strokeStyle = g(56); h.lineWidth = 3; h.strokeRect(x, 0, u, size); r.strokeStyle = g(190); r.lineWidth = 3; r.strokeRect(x, 0, u, size);
  }
  const gr = a.createLinearGradient(0, size - 70, 0, size); gr.addColorStop(0, 'rgba(0,0,0,0)'); gr.addColorStop(1, 'rgba(0,0,0,.34)'); a.fillStyle = gr; a.fillRect(0, size - 70, size, 70);
  grime(a, r, size, seed + 3, 0.28);
  return finish(A, H, R, 1.8);
}

// ── テラゾー (人造大理石) の床 (1 リピート = 2m。色石の破片と真鍮の目地) ──
function terrazzoSet(seed = 44, size = 1024) {
  const [A, H, R, a, h, r] = three(size, 226, 128, 34), rnd = rng(seed), CH = [[250, 250, 246], [150, 156, 160], [92, 100, 108], [202, 174, 130], [116, 152, 138], [232, 150, 96], [64, 70, 78]];
  a.fillStyle = 'rgb(228,226,218)'; a.fillRect(0, 0, size, size);
  for (let i = 0; i < 3000; i++) {
    const x = rnd() * size, y = rnd() * size, s = 2 + rnd() * rnd() * 11, c = CH[Math.floor(rnd() * rnd() * CH.length * 0.999 + (rnd() < 0.3 ? 2 : 0)) % CH.length], n = 4 + Math.floor(rnd() * 3), an0 = rnd() * 7, rs = Array.from({ length: n }, () => 0.5 + rnd() * 0.6);
    wrap(size, x, y, 16, (px, py) => { a.fillStyle = `rgba(${c[0]},${c[1]},${c[2]},.9)`; a.beginPath(); for (let k = 0; k < n; k++) { const an = an0 + k * TAU / n, qx = px + Math.cos(an) * s * rs[k], qy = py + Math.sin(an) * s * rs[k]; k ? a.lineTo(qx, qy) : a.moveTo(qx, qy); } a.fill(); });
  }
  for (const p of [0, size / 2]) { a.fillStyle = 'rgb(206,166,84)'; a.fillRect(p - 2.5, 0, 5, size); a.fillRect(0, p - 2.5, size, 5); a.fillRect(size - 2.5, 0, 2.5, size); a.fillRect(0, size - 2.5, size, 2.5); h.fillStyle = g(150); h.fillRect(p - 2.5, 0, 5, size); h.fillRect(0, p - 2.5, size, 5); r.fillStyle = g(84); r.fillRect(p - 2.5, 0, 5, size); r.fillRect(0, p - 2.5, size, 5); }
  r.globalAlpha = 0.4; r.drawImage(noiseCanvas(256, 8, seed + 4, 4, 0, 110), 0, 0, size, size); r.globalAlpha = 1;
  const n = noiseCanvas(256, 3, seed + 2, 5, 216, 255); a.globalCompositeOperation = 'multiply'; a.drawImage(n, 0, 0, size, size); a.globalCompositeOperation = 'source-over';
  return finish(A, H, R, 0.7);
}

// ── 滑り止めのゴム床 (1 リピート = 1m。丸い突起) ──
function treadSet(seed = 45, size = 512) {
  const [A, H, R, a, h, r] = three(size, 78, 96, 205), n = 10, s = size / n;
  for (let j = 0; j < n; j++) for (let i = 0; i < n; i++) { const cx = (i + 0.5) * s, cy = (j + 0.5) * s;
    h.fillStyle = g(205); h.beginPath(); h.arc(cx, cy, s * 0.3, 0, TAU); h.fill(); h.fillStyle = g(240); h.beginPath(); h.arc(cx, cy, s * 0.2, 0, TAU); h.fill();
    a.fillStyle = 'rgba(255,255,255,.085)'; a.beginPath(); a.arc(cx, cy, s * 0.3, 0, TAU); a.fill(); r.fillStyle = g(150); r.beginPath(); r.arc(cx, cy, s * 0.3, 0, TAU); r.fill(); }
  h.strokeStyle = g(30); h.lineWidth = 5; h.strokeRect(0, 0, size, size); a.strokeStyle = 'rgba(0,0,0,.6)'; a.lineWidth = 4; a.strokeRect(0, 0, size, size);
  grime(a, r, size, seed, 0.9);
  return finish(A, H, R, 2.6);
}

// ── 真鍮の縦溝壁 (1 リピート = 4m。上部に山形と段飾り、腰から下は黒御影) ──
function brassSet(seed = 46, size = 1024) {
  const [A, H, R, a, h, r] = three(size, 180, 128, 78), rnd = rng(seed), u = size / 4, YT = Math.round(size * 0.24), YB = Math.round(size * 0.76);
  a.fillStyle = 'rgb(178,136,64)'; a.fillRect(0, 0, size, size);
  // 縦溝 (フルーティング)
  for (let i = 0; i < 32; i++) { const x = i * size / 32, w = size / 32, gh = h.createLinearGradient(x, 0, x + w, 0), ga = a.createLinearGradient(x, 0, x + w, 0);
    gh.addColorStop(0, g(210)); gh.addColorStop(0.5, g(70)); gh.addColorStop(1, g(210)); h.fillStyle = gh; h.fillRect(x, YT, w, YB - YT);
    ga.addColorStop(0, 'rgba(255,226,150,.26)'); ga.addColorStop(0.5, 'rgba(40,24,6,.34)'); ga.addColorStop(1, 'rgba(255,226,150,.26)'); a.fillStyle = ga; a.fillRect(x, YT, w, YB - YT); }
  // 上部: 山形 (シェブロン) の帯と段飾り (ジッグラト)
  a.fillStyle = 'rgb(150,112,48)'; a.fillRect(0, 0, size, YT); h.fillStyle = g(150); h.fillRect(0, 0, size, YT);
  for (let k = 0; k < 4; k++) { const yy = 34 + k * 26; for (const [c, col, lw] of [[a, k % 2 ? 'rgb(236,198,112)' : 'rgb(74,52,20)', 6], [h, g(k % 2 ? 230 : 60), 7]]) { c.strokeStyle = col; c.lineWidth = lw; c.beginPath(); for (let i = 0; i <= 16; i++) { const px = i * size / 16, py = yy + (i % 2 ? 22 : 0); i ? c.lineTo(px, py) : c.moveTo(px, py); } c.stroke(); } }
  for (let i = 0; i < 4; i++) { const cx = i * u + u / 2; for (let k = 0; k < 5; k++) { const w = 150 - k * 28, yy = YT - 24 - k * 0 + k * -0; a.fillStyle = k % 2 ? 'rgb(226,186,100)' : 'rgb(116,84,34)'; a.fillRect(cx - w / 2, 150 + k * 18, w, 18); h.fillStyle = g(120 + k * 28); h.fillRect(cx - w / 2, 150 + k * 18, w, 18); } }
  for (const yy of [8, YT - 8]) { a.fillStyle = 'rgb(240,206,120)'; a.fillRect(0, yy - 4, size, 8); h.fillStyle = g(240); h.fillRect(0, yy - 4, size, 8); r.fillStyle = g(40); r.fillRect(0, yy - 4, size, 8); }
  // 腰から下: 黒御影に真鍮の見切り
  a.fillStyle = 'rgb(24,26,28)'; a.fillRect(0, YB, size, size - YB); h.fillStyle = g(150); h.fillRect(0, YB, size, size - YB); r.fillStyle = g(22); r.fillRect(0, YB, size, size - YB);
  for (let i = 0; i < 70; i++) { a.fillStyle = `rgba(${150 + rnd() * 80 | 0},${150 + rnd() * 80 | 0},${150 + rnd() * 80 | 0},${0.1 + rnd() * 0.3})`; a.fillRect(rnd() * size, YB + rnd() * (size - YB), 1 + rnd() * 3, 1 + rnd() * 3); }
  for (const yy of [YB + 5, YB + 28, size - 30]) { a.fillStyle = 'rgb(226,186,100)'; a.fillRect(0, yy - 3, size, 6); h.fillStyle = g(232); h.fillRect(0, yy - 3, size, 6); r.fillStyle = g(50); r.fillRect(0, yy - 3, size, 6); }
  // パネルの割り付けと中央の飾り鋲
  for (let i = 0; i < 4; i++) { const x = i * u; a.fillStyle = 'rgb(70,50,20)'; a.fillRect(x - 3, YT, 6, YB - YT); h.fillStyle = g(26); h.fillRect(x - 3, YT, 6, YB - YT); if (i === 0) { a.fillRect(size - 3, YT, 3, YB - YT); h.fillRect(size - 3, YT, 3, YB - YT); }
    a.fillStyle = 'rgb(240,206,120)'; a.beginPath(); a.arc(x + u / 2, (YT + YB) / 2, 13, 0, TAU); a.fill(); h.fillStyle = g(250); h.beginPath(); h.arc(x + u / 2, (YT + YB) / 2, 13, 0, TAU); h.fill(); r.fillStyle = g(30); r.beginPath(); r.arc(x + u / 2, (YT + YB) / 2, 13, 0, TAU); r.fill(); }
  const gr = a.createLinearGradient(0, size - 70, 0, size); gr.addColorStop(0, 'rgba(0,0,0,0)'); gr.addColorStop(1, 'rgba(0,0,0,.45)'); a.fillStyle = gr; a.fillRect(0, size - 70, size, 70);
  grime(a, r, size, seed + 3, 0.45);
  return finish(A, H, R, 2.6);
}

// ── 警戒帯の床 (1 リピート = 2m。黄と黒の斜線) ──
function hazardSet(seed = 47, size = 512) {
  const [A, H, R, a, h, r] = three(size, 20, 128, 150), rnd = rng(seed);
  a.fillStyle = 'rgb(16,16,18)'; a.fillRect(0, 0, size, size);
  for (let i = -4; i < 8; i++) { a.fillStyle = 'rgb(228,174,20)'; a.beginPath(); a.moveTo(i * 128, size); a.lineTo(i * 128 + 64, size); a.lineTo(i * 128 + 64 + size, 0); a.lineTo(i * 128 + size, 0); a.fill(); }
  for (let i = 0; i < 260; i++) { a.strokeStyle = `rgba(10,10,12,${0.2 + rnd() * 0.4})`; a.lineWidth = 0.8 + rnd() * 2.2; a.beginPath(); const x = rnd() * size, y = rnd() * size; a.moveTo(x, y); a.lineTo(x + (rnd() - 0.5) * 70, y + (rnd() - 0.5) * 70); a.stroke(); }
  h.drawImage(noiseCanvas(256, 16, seed + 1, 4, 100, 160), 0, 0, size, size);
  grime(a, r, size, seed + 2, 1.1);
  return finish(A, H, R, 1.4);
}

// ── 断熱キルトの内張り (1 リピート = 1m。菱形の縫い目) ──
function quiltSet(seed = 48, size = 512) {
  const [A, H, R, a, h, r] = three(size, 226, 128, 215), n = 4, s = size / n;
  for (let j = -1; j <= n; j++) for (let i = -1; i <= n; i++) for (const o of [0, 0.5]) { const cx = (i + o + 0.5) * s, cy = (j + o + 0.5) * s, gh = h.createRadialGradient(cx, cy, 0, cx, cy, s * 0.52);
    gh.addColorStop(0, g(236)); gh.addColorStop(0.75, g(150)); gh.addColorStop(1, g(60)); h.fillStyle = gh; h.beginPath(); h.moveTo(cx, cy - s / 2); h.lineTo(cx + s / 2, cy); h.lineTo(cx, cy + s / 2); h.lineTo(cx - s / 2, cy); h.fill(); }
  a.strokeStyle = 'rgba(96,104,112,.5)'; a.lineWidth = 2; a.setLineDash([7, 5]);
  for (let i = -n; i <= n * 2; i++) { a.beginPath(); a.moveTo(i * s, 0); a.lineTo(i * s + size, size); a.stroke(); a.beginPath(); a.moveTo(i * s, 0); a.lineTo(i * s - size, size); a.stroke(); } a.setLineDash([]);
  for (let j = 0; j <= n * 2; j++) for (let i = 0; i <= n * 2; i++) if ((i + j) % 2 === 0) dot3(h, a, i * s / 2, j * s / 2, 3.2);
  grime(a, r, size, seed, 0.35);
  return finish(A, H, R, 2.4);
}

registerTex('deco', decoSet, 0.25); registerTex('armor', armorSet, 0.25); registerTex('lab', labSet, 0.25); registerTex('terrazzo', terrazzoSet, 0.5);
registerTex('tread', treadSet, 1); registerTex('brassdeco', brassSet, 0.25); registerTex('hazard', hazardSet, 0.5); registerTex('quilt', quiltSet, 1);
