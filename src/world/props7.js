// メガトン居住区の小道具: 住戸の家具・家電・水回り、通路の生活感 (表札・洗濯物・自転車・メーター)、商店・公共施設の備品
// 正面は +Z、原点は床の中心。面の絵 (mg-*) はパックに画像があるときだけ貼り、無ければ従来の作りにする
import * as THREE from 'three';
import { mx } from '../gfx/builder.js';
import { mat, glow } from '../gfx/textures.js';
import { hasImage } from '../gfx/materials.js';
import { MM, flat, fab, face } from './props.js';
import { glassMat } from './interior.js';

const HP = Math.PI / 2;
const has = (n) => hasImage('materials/' + n);
/** 画像があればその素材 (色は白)、無ければ代わりの素材に色を付ける */
export const tm = (name, fb, o = {}) => (has(name) ? mat(name, { rough: o.rough ?? 0.7, metal: o.metal ?? 0.05, color: o.ci ?? 0xffffff }) : mat(fb, o));
const wood = (c = 0xb08860) => mat('walnut', { color: c, rough: 0.7, metal: 0 });
const white = () => flat(0xf2f2ee, 0.35, 0.1);
/** 正面の絵。無ければ fb() で代わりの作りを足す */
const front = (P, name, w, h, x, y, z, o, fb) => { if (!face(P, name, w, h, x, y, z, o)) fb?.(); };
const COLORS = [0x3a6ea8, 0xb8452e, 0x3aa86a, 0xc9a22e, 0x8a4ab8, 0xd86a8a, 0x4a8a9a, 0x6a6a72];

export const PROPS7 = {
  // ───────── 家電・家具 ─────────
  fridge(P, o, e) { const W = o.w || 0.68, H = o.h || 1.75; P.box(white(), W, H, 0.64, 0, H / 2, 0);
    front(P, o.img || 'mg-fridge', W, H, 0, H / 2, 0.322, { rough: 0.35 }, () => { P.box(MM().bk, W - 0.02, 0.01, 0.01, 0, H * 0.62, 0.322); for (const y of [H * 0.8, H * 0.4]) P.box(MM().ch, 0.03, 0.3, 0.03, W / 2 - 0.08, y, 0.34); });
    e.rect(W, 0.64); },
  washer(P, o, e) { P.box(white(), 0.6, 0.85, 0.6, 0, 0.425, 0);
    front(P, 'mg-washer', 0.6, 0.85, 0, 0.425, 0.302, { rough: 0.35 }, () => { P.tor(MM().ch, 0.19, 0.025, 0, 0.42, 0.3, 0, 0, 0, 16, 4); P.add(glassMat(), new THREE.CircleGeometry(0.18, 14), mx(0, 0.42, 0.305), 0); P.box(MM().bk, 0.5, 0.08, 0.01, 0, 0.76, 0.302); });
    e.rect(0.6, 0.6); },
  tvset(P, o, e) { const w = o.w || 1.5; P.box(wood(o.c || 0x6a5040), w, 0.45, 0.42, 0, 0.225, 0); P.box(MM().bk, w * 0.78, 0.66, 0.05, 0, 0.9, -0.08); P.box(MM().bk, 0.3, 0.05, 0.2, 0, 0.475, -0.08);
    front(P, o.img || 'mg-tv', w * 0.74, 0.6, 0, 0.9, -0.054, { glow: o.img ? 0.9 : 0.7, rough: 0.2 }, () => P.add(glow(o.sc || '#9ad0ff', 0.9), new THREE.PlaneGeometry(w * 0.74, 0.6), mx(0, 0.9, -0.054), 0));
    e.rect(w, 0.42); },
  wardrobe(P, o, e) { const w = o.w || 1.2, H = o.h || 1.95; P.box(wood(o.c || 0xc8a880), w, H, 0.58, 0, H / 2, 0);
    front(P, o.img || 'mg-wardrobe', w, H, 0, H / 2, 0.292, {}, () => { P.box(MM().bk, 0.012, H - 0.1, 0.01, 0, H / 2, 0.292); for (const s of [-1, 1]) P.box(MM().ch, 0.02, 0.24, 0.03, s * 0.07, H * 0.52, 0.305); });
    e.rect(w, 0.58); },
  shoebox(P, o, e) { const w = o.w || 0.9; P.box(wood(o.c || 0xd0b890), w, 1.0, 0.36, 0, 0.5, 0); front(P, 'mg-shoebox', w, 1.0, 0, 0.5, 0.182, {}); P.box(flat(0x6a5a4a, 0.6, 0), w + 0.02, 0.03, 0.38, 0, 1.015, 0); if (o.vase !== false) P.cyl(flat(o.vc || 0x3a6ea8, 0.25, 0.1), 0.05, 0.06, 0.22, w * 0.3, 1.14, 0, 'y', 10); e.rect(w, 0.36); },
  aircon(P, o, e) { const y = o.y || 2.05; P.box(white(), 0.85, 0.28, 0.22, 0, y, 0.11); front(P, 'mg-aircon', 0.85, 0.28, 0, y, 0.222, {}, () => P.box(MM().bk, 0.7, 0.02, 0.01, 0, y - 0.1, 0.222)); },
  /** 住戸の「窓」: 外の景色を映す画面 (居住筒の内側に本物の窓は少ない) */
  vwindow(P, o, e) { const w = o.w || 1.6, h = o.h || 1.1, y = o.y || 1.5; P.box(white(), w + 0.12, h + 0.12, 0.06, 0, y, 0.03); P.box(white(), w + 0.2, 0.05, 0.16, 0, y - h / 2 - 0.06, 0.08);
    front(P, o.img || 'mg-vwindow', w, h, 0, y, 0.062, { glow: o.img === 'mg-shoji' ? 0.55 : 0.85, rough: 0.2, uv: o.uv }, () => { P.add(glow('#bfe2ff', 1.0), new THREE.PlaneGeometry(w, h * 0.6), mx(0, y + h * 0.2, 0.062), 0); P.add(glow('#e8f4ff', 1.1), new THREE.PlaneGeometry(w, h * 0.4), mx(0, y - h * 0.3, 0.062), 0); });
    P.box(white(), 0.04, h, 0.03, 0, y, 0.075); if (o.cur !== false) for (const s of [-1, 1]) P.box(tm(o.curtain || 'mg-curtain', 'cotton-cloth', { color: o.cc || 0xe8dcc8, rough: 0.95, metal: 0 }), 0.32, h + 0.4, 0.05, s * (w / 2 + 0.1), y + 0.05, 0.14);
    e.light('#e4f2ff', 3, y, 4); },
  homeshelf(P, o, e) { const w = o.w || 1.0, H = o.h || 1.8; P.box(wood(o.c || 0xb89870), w, H, 0.34, 0, H / 2, 0);
    front(P, o.img || 'mg-bookshelf', w - 0.04, H - 0.04, 0, H / 2, 0.172, {}, () => { for (let j = 0; j < 4; j++) { const y = 0.1 + j * (H - 0.2) / 4; P.box(MM().bk, w - 0.06, (H - 0.2) / 4 - 0.04, 0.02, 0, y + (H - 0.2) / 8, 0.165); let x = -w / 2 + 0.07; let i = 0; while (x < w / 2 - 0.2) { const bw = Math.min(w / 2 - 0.05 - x, 0.16 + ((i * 37 + j * 11) % 4) * 0.06); P.box(mat('book-spines', { color: COLORS[(i + j * 3) % 8], rough: 0.8, metal: 0 }), bw, 0.22 + ((i + j) % 3) * 0.03, 0.22, x + bw / 2, y + 0.14, 0.04); x += bw + 0.02; i++; } } });
    e.rect(w, 0.34); },
  bed2(P, o, e) { const m = MM(), w = o.w || 1.6; P.box(wood(o.wc || 0x8a6a4a), w, 0.32, 2.1, 0, 0.16, 0); P.box(tm('mg-bed-linen', 'bed-linen', { color: 0xf0eee8, rough: 0.9, metal: 0 }), w - 0.08, 0.16, 2.0, 0, 0.4, 0.02);
    P.box(tm(o.spread || 'mg-bedspread', 'blanket', { color: o.c || 0x6a8ab8, rough: 0.85, metal: 0 }), w - 0.04, 0.07, 1.35, 0, 0.5, 0.33); for (const s of (w > 1.3 ? [-1, 1] : [0])) P.box(flat(0xffffff, 0.9, 0), w > 1.3 ? 0.6 : 0.62, 0.11, 0.38, s * w / 4, 0.53, -0.76);
    P.box(wood(o.wc || 0x8a6a4a), w + 0.04, 0.9, 0.08, 0, 0.45, -1.06); e.rect(w, 2.15); if (o.use) e.use('ベッドで休む', 'rest', 2.2); },
  futon(P, o, e) { P.box(mat('bed-linen', { color: 0xf2efe6, rough: 0.95, metal: 0 }), 1.0, 0.1, 2.0, 0, 0.05, 0); P.box(tm('mg-futon', 'blanket', { color: o.c || 0x8a3a3a, rough: 0.9, metal: 0 }), 1.02, 0.08, 1.3, 0, 0.13, 0.32); P.box(flat(0xffffff, 0.9, 0), 0.55, 0.09, 0.32, 0, 0.14, -0.78); e.rect(1.0, 2.0); },
  dining(P, o, e) { const w = o.w || 1.4, d = o.d || 0.8, n = o.n ?? 4; P.box(wood(o.c || 0xa07850), w, 0.04, d, 0, 0.74, 0); for (const [x, z] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) P.box(wood(o.c || 0xa07850), 0.05, 0.72, 0.05, x * (w / 2 - 0.06), 0.36, z * (d / 2 - 0.06));
    face(P, 'mg-table-food', w * 0.8, d * 0.8, 0, 0.762, 0, { rx: -HP, rough: 0.5 });
    const sp = [[-w / 4, -d / 2 - 0.25, 0], [w / 4, -d / 2 - 0.25, 0], [-w / 4, d / 2 + 0.25, Math.PI], [w / 4, d / 2 + 0.25, Math.PI]]; for (let i = 0; i < n; i++) { const [x, z, r] = sp[i]; P.box(wood(o.cc || 0x7a5a3a), 0.42, 0.04, 0.42, x, 0.45, z); P.box(wood(o.cc || 0x7a5a3a), 0.4, 0.45, 0.04, x, 0.68, z + (r ? 0.2 : -0.2)); for (const [a, b] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) P.box(wood(o.cc || 0x7a5a3a), 0.03, 0.44, 0.03, x + a * 0.18, 0.22, z + b * 0.18); }
    e.rect(w, d + (n > 2 ? 0.9 : n ? 0.45 : 0)); },
  chair(P, o, e) { const c = o.c || 0x7a5a3a; P.box(wood(c), 0.44, 0.04, 0.44, 0, 0.45, 0); P.box(wood(c), 0.42, 0.45, 0.04, 0, 0.68, -0.2); for (const [a, b] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) P.box(wood(c), 0.03, 0.44, 0.03, a * 0.19, 0.22, b * 0.19); e.col(0.26); },
  lowtable(P, o, e) { const w = o.w || 1.0, d = o.d || 0.7; P.box(wood(o.c || 0x9a7048), w, 0.04, d, 0, 0.36, 0); for (const [x, z] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) P.box(wood(o.c || 0x9a7048), 0.05, 0.34, 0.05, x * (w / 2 - 0.06), 0.17, z * (d / 2 - 0.06));
    if (o.kotatsu) P.box(tm('mg-futon', 'blanket', { color: o.kc || 0xb8452e, rough: 0.95, metal: 0 }), w + 0.4, 0.3, d + 0.4, 0, 0.18, 0);
    const cu = tm('mg-cushion', 'velvet', { color: o.cc || 0x8a3a3a, rough: 0.9, metal: 0 }); for (const [x, z] of [[0, d / 2 + 0.45], [0, -d / 2 - 0.45], [w / 2 + 0.45, 0], [-w / 2 - 0.45, 0]].slice(0, o.n ?? 3)) P.box(cu, 0.5, 0.07, 0.5, x, 0.035, z);
    face(P, 'mg-table-food', w * 0.7, d * 0.7, 0, 0.382, 0, { rx: -HP, rough: 0.5 }); e.rect(w, d); },
  homesofa(P, o, e) { const f = tm(o.fab || 'mg-sofa', 'velvet', { color: o.c || 0x6a7a8a, rough: 0.85, metal: 0.02 }), w = o.w || 2.0; P.box(MM().dk, w, 0.12, 0.85, 0, 0.06, 0); P.box(f, w - 0.1, 0.28, 0.78, 0, 0.3, 0.02); P.box(f, w, 0.55, 0.2, 0, 0.6, -0.33); for (const s of [-1, 1]) P.box(f, 0.18, 0.4, 0.85, s * (w / 2 - 0.09), 0.38, 0);
    P.box(tm('mg-cushion', 'velvet', { color: o.cc || 0xd8b878, rough: 0.9, metal: 0 }), 0.4, 0.36, 0.12, -w / 2 + 0.45, 0.62, -0.18, 0.15); e.rect(w, 0.85); },
  homekit(P, o, e) { const w = o.w || 2.2; P.box(white(), w, 0.86, 0.62, 0, 0.43, 0); P.box(mat('quartz-countertop', { color: 0xd8d4cc, rough: 0.35, metal: 0.1 }), w + 0.02, 0.04, 0.64, 0, 0.88, 0); front(P, o.img || 'mg-kitchen', w, 0.82, 0, 0.43, 0.312, { uv: [0, 0, Math.max(1, Math.round(w / (o.img ? 1.6 : 0.95))), 1] }, () => { for (let x = -w / 2 + 0.3; x < w / 2 - 0.1; x += 0.6) P.box(MM().ch, 0.18, 0.02, 0.02, x, 0.78, 0.315); });
    if (!face(P, 'mg-stove-top', Math.min(w, 2.2), 0.6, w / 2 - Math.min(w, 2.2) / 2, 0.905, 0, { rx: -HP, rough: 0.3, metal: 0.5 })) { P.box(MM().ch, 0.5, 0.03, 0.38, -w / 4, 0.905, 0.02); P.box(MM().bk, 0.55, 0.02, 0.45, w / 4, 0.91, 0); for (const s of [-1, 1]) P.cyl(MM().ch, 0.08, 0.08, 0.012, w / 4 + s * 0.13, 0.925, 0, 'y', 12); } P.cyl(MM().ch, 0.012, 0.012, 0.28, w / 2 - 0.7, 1.04, -0.2, 'y', 6); // 天板 (コンロと流し) の絵
    if (o.upper !== false) { P.add(tm('mg-kitchen-tile', 'porcelain', { color: 0xf2f0ea, rough: 0.3, metal: 0 }), new THREE.PlaneGeometry(w, 0.66), mx(0, 1.25, -0.3)); P.box(white(), w, 0.62, 0.34, 0, 1.95, -0.14); face(P, 'mg-upper-cabinet', w, 0.62, 0, 1.95, 0.031, { uv: [0, 0, Math.max(1, Math.round(w / 1.2)), 1] }); P.box(glow('#fff0d8', 2), w - 0.2, 0.02, 0.04, 0, 1.63, -0.02); if (!has('mg-stove-top')) P.box(white(), 0.6, 0.4, 0.4, w / 4, 1.48, -0.12); }
    e.rect(w, 0.62); },
  homedesk(P, o, e) { const w = o.w || 1.2, c = o.c || 0xc8a880; P.box(wood(c), w, 0.04, 0.6, 0, 0.73, 0); for (const s of [-1, 1]) P.box(wood(c), 0.04, 0.71, 0.56, s * (w / 2 - 0.03), 0.355, 0); P.box(wood(c), w - 0.1, 0.4, 0.02, 0, 0.5, -0.27);
    if (!face(P, 'mg-desk-top', w - 0.06, 0.56, 0, 0.752, 0, { rx: -HP, rough: 0.6 })) { P.box(MM().bk, 0.34, 0.02, 0.24, -w * 0.12, 0.76, 0.02); P.box(MM().bk, 0.34, 0.22, 0.01, -w * 0.12, 0.88, -0.1, 0, -0.25); P.add(glow(o.sc || '#cfe6ff', 0.7), new THREE.PlaneGeometry(0.3, 0.19), mx(-w * 0.12, 0.88, -0.093, -0.25), 0); } // 机の上 (ノートと文具) の絵
    P.cyl(MM().ch, 0.01, 0.01, 0.4, w / 2 - 0.15, 0.95, -0.2, 'y', 4); P.cyl(flat(o.lc || 0xe8c060, 0.4, 0.2), 0.06, 0.1, 0.1, w / 2 - 0.2, 1.12, -0.14, 'y', 8, true); P.sph(glow('#fff0d0', 2), 0.03, w / 2 - 0.2, 1.06, -0.14, 1, 1, 1, 5);
    if (o.chair !== false) { P.box(fab(o.cc || 0x3a3f48), 0.44, 0.08, 0.44, 0, 0.46, 0.55); P.box(fab(o.cc || 0x3a3f48), 0.42, 0.45, 0.06, 0, 0.75, 0.75); P.cyl(MM().ch, 0.03, 0.03, 0.42, 0, 0.21, 0.55, 'y', 5); }
    e.rect(w, o.chair !== false ? 1.1 : 0.6, 0, o.chair !== false ? 0.25 : 0); },
  /** 上の階へ通じる扉 (閉鎖中)。o.y0 で踊り場の上に置く */
  fakedoor(P, o, e) { const w = o.w || 1.0; P.box(flat(0xe8e4dc, 0.5, 0.2), w + 0.16, 2.2, 0.06, 0, 1.1, 0.03); P.box(tm(o.mat || 'mg-door-home-a', 'door-slide', { color: 0xc8ccd0, rough: 0.5, metal: 0.3 }), w, 2.05, 0.05, 0, 1.03, 0.07); P.box(MM().ch, 0.12, 0.03, 0.03, w / 2 - 0.12, 1.0, 0.11);
    P.box(flat(0xe8c020, 0.5, 0.1), w * 0.9, 0.18, 0.02, 0, 1.4, 0.1); if (o.use !== false) e.use(o.label || '上の階への扉', 'talk:mgupper', 2.0); },
  // ───────── 水回り ─────────
  toilet(P, o, e) { const w = white(); P.cyl(w, 0.17, 0.13, 0.4, 0, 0.2, 0.05, 'y', 14); P.cyl(w, 0.2, 0.19, 0.04, 0, 0.42, 0.07, 'y', 16); P.box(w, 0.42, 0.42, 0.18, 0, 0.62, -0.2); P.box(MM().ch, 0.06, 0.02, 0.02, 0.14, 0.86, -0.12); e.rect(0.45, 0.65); },
  washbasin(P, o, e) { P.box(white(), 0.62, 0.8, 0.46, 0, 0.4, 0); P.cyl(MM().ch, 0.17, 0.12, 0.04, 0, 0.82, 0.02, 'y', 16); P.cyl(MM().ch, 0.015, 0.015, 0.18, 0, 0.92, -0.16, 'y', 6);
    front(P, 'mg-washbasin', 0.62, 0.44, 0, 1.4, -0.205, { rough: 0.15, metal: 0.4 }, () => { P.add(mat('stainless', { color: 0xe8eef4, rough: 0.05, metal: 1 }), new THREE.PlaneGeometry(0.56, 0.7), mx(0, 1.45, -0.205), 0); P.box(glow('#fff4e0', 2), 0.5, 0.04, 0.04, 0, 1.86, -0.18); });
    e.rect(0.62, 0.46); },
  shower(P, o, e) { P.box(white(), 0.9, 0.06, 0.9, 0, 0.03, 0); P.add(glassMat(), new THREE.BoxGeometry(0.02, 1.95, 0.9), mx(0.44, 1.0, 0), 0); P.add(glassMat(), new THREE.BoxGeometry(0.9, 1.95, 0.02), mx(0, 1.0, 0.44), 0); P.cyl(MM().ch, 0.012, 0.012, 1.1, -0.38, 1.45, -0.38, 'y', 6); P.cyl(MM().ch, 0.07, 0.07, 0.02, -0.3, 2.0, -0.3, 'y', 12); e.rect(0.9, 0.9); },
  bathtub(P, o, e) { const l = o.l || 1.5; face(P, 'mg-unit-bath', l + 0.3, 2.1, 0, 1.05, -0.37, { rough: 0.3 }); P.box(white(), l, 0.55, 0.75, 0, 0.275, 0); P.add(mat('flat', { color: 0x9fd8f0, rough: 0.05, metal: 0 }), new THREE.PlaneGeometry(l - 0.12, 0.63).rotateX(-HP), mx(0, 0.5, 0), 0); P.box(MM().ch, 0.03, 0.2, 0.03, -l / 2 + 0.1, 0.7, -0.3); e.rect(l, 0.75); }, // 後ろの壁にユニットバスの絵
  // ───────── 通路の生活感 ─────────
  /** 玄関まわり (通路側): 玄関マット・表札とインターホン・台所の小窓・傘や鉢など。o.w = 扉の幅、o.win = 小窓の位置 (扉の中心から, 0 = 無し) */
  homefront(P, o, e) { const dw = o.w || 1.15, s = o.hand || 1;
    if (!face(P, 'mg-doormat', 0.9, 0.55, 0, 0.008, 0.36, { rx: -HP, rough: 0.95 })) P.box(mat('felt', { color: o.mc || 0x6a5a4a, rough: 1, metal: 0 }), 0.9, 0.012, 0.55, 0, 0.006, 0.36);
    const nx = s * (dw / 2 + 0.28); if (!face(P, 'mg-nameplate', 0.24, 0.34, nx, 1.45, 0.012, { rough: 0.4 })) { P.box(flat(0xe8e0d0, 0.4, 0.1), 0.2, 0.08, 0.015, nx, 1.55, 0.008); P.box(MM().bk, 0.09, 0.13, 0.03, nx, 1.35, 0.015); P.sph(glow('#ffb84a', 1.4), 0.012, nx, 1.32, 0.03, 1, 1, 1, 6); }
    if (o.lamp !== false) { P.box(white(), 0.16, 0.16, 0.1, -s * (dw / 2 + 0.25), 2.15, 0.05); P.add(glow('#ffe8c8', 2.2), new THREE.PlaneGeometry(0.12, 0.12), mx(-s * (dw / 2 + 0.25), 2.15, 0.101), 0); }
    if (o.win) { const x = o.win; P.box(MM().st, 0.96, 0.66, 0.06, x, 1.45, 0.03); if (!face(P, 'mg-kitchen-window', 0.9, 0.6, x, 1.45, 0.062, { glow: 0.5 })) { P.add(glow('#fff2d6', 0.8), new THREE.PlaneGeometry(0.88, 0.58), mx(x, 1.45, 0.061), 0); for (let i = -3; i <= 3; i++) P.box(MM().st, 0.018, 0.62, 0.03, x + i * 0.12, 1.45, 0.09); } P.box(MM().st, 1.0, 0.04, 0.14, x, 1.11, 0.08); }
    const k = o.k || 0, kx = s * (dw / 2 + 0.45 + (o.kx || 0));
    if (k === 1) { P.cyl(mat('terracotta', { rough: 0.9, metal: 0 }), 0.16, 0.12, 0.28, kx, 0.14, 0.2, 'y', 10); P.add(MM().lf2, new THREE.IcosahedronGeometry(0.24, 0), mx(kx, 0.45, 0.2, 0, 0, 0, 1, 1.2, 1)); e.col(0.18, kx, 0.2); }
    else if (k === 2) { P.cyl(flat(0x3a3f48, 0.5, 0.3), 0.1, 0.09, 0.45, kx, 0.225, 0.14, 'y', 10); for (let i = 0; i < 3; i++) P.cyl(flat(COLORS[(i + (o.seed | 0)) % 8], 0.6, 0), 0.02, 0.04, 0.85, kx + (i - 1) * 0.04, 0.55, 0.14, 'y', 6); e.col(0.12, kx, 0.14); }
    else if (k === 3) { P.box(tm('mg-cardboard', 'plastic-crate', { color: 0xb08a5a, rough: 0.9, metal: 0 }), 0.5, 0.36, 0.4, kx, 0.18, 0.22); P.box(tm('mg-cardboard', 'plastic-crate', { color: 0xb08a5a, rough: 0.9, metal: 0 }), 0.4, 0.3, 0.34, kx + 0.02, 0.51, 0.22, 0.3); e.rect(0.5, 0.4, kx, 0.22); }
    else if (k === 4) { for (let i = 0; i < 3; i++) P.box(flat([0x3a3f48, 0x8a5a3a, 0xe8e8e8][i], 0.6, 0.1), 0.12, 0.08, 0.28, kx + (i - 1) * 0.15, 0.04, 0.24, (i - 1) * 0.3); }
  },
  bicycle(P, o, e) { const c = flat(o.c || COLORS[(o.seed | 0) % 8], 0.35, 0.4), t = MM().bk; for (const x of [-0.55, 0.55]) { P.tor(t, 0.33, 0.025, x, 0.34, 0, 0, 0, 0, 16, 4); P.cyl(MM().ch, 0.02, 0.02, 0.06, x, 0.34, 0, 'z', 6); }
    const bar = (x0, y0, x1, y1, m = c, r = 0.022) => { const l = Math.hypot(x1 - x0, y1 - y0); P.add(m, new THREE.CylinderGeometry(r, r, l, 6), mx((x0 + x1) / 2, (y0 + y1) / 2, 0, 0, 0, Math.atan2(x0 - x1, y1 - y0))); };
    bar(-0.55, 0.34, -0.05, 0.36); bar(-0.05, 0.36, 0.42, 0.82); bar(-0.55, 0.34, -0.12, 0.8); bar(-0.12, 0.8, 0.42, 0.82); bar(0.55, 0.34, 0.42, 0.82); bar(-0.05, 0.36, -0.15, 0.86); bar(0.42, 0.82, 0.45, 1.0, MM().ch);
    P.box(t, 0.24, 0.05, 0.1, -0.16, 0.9, 0); P.box(MM().ch, 0.05, 0.03, 0.5, 0.45, 1.0, 0); if (o.basket !== false) P.box(MM().ch, 0.3, 0.2, 0.32, 0.66, 0.86, 0); e.rect(1.5, 0.5); },
  /** 洗濯物の物干し (通路や住戸の窓辺) */
  laundry(P, o, e) { const w = o.w || 1.4, m = MM().ch; for (const s of [-1, 1]) { P.cyl(m, 0.012, 0.012, 1.5, s * w / 2, 0.75, 0, 'y', 6); P.box(m, 0.03, 0.02, 0.5, s * w / 2, 0.01, 0); } P.cyl(m, 0.01, 0.01, w, 0, 1.48, 0, 'x', 6); P.cyl(m, 0.01, 0.01, w, 0, 1.2, 0.18, 'x', 6);
    const n = Math.max(2, Math.round(w / 0.32)); for (let i = 0; i < n; i++) { const x = -w / 2 + 0.16 + i * (w - 0.32) / Math.max(1, n - 1), ht = 0.35 + ((i * 7 + (o.seed | 0)) % 4) * 0.12, row = i % 2; if (!face(P, 'mg-laundry', 0.28, ht, x, (row ? 1.2 : 1.48) - ht / 2, row ? 0.18 : 0, { uv: [(i % 4) / 4, 0, (i % 4 + 1) / 4, 1], rough: 0.95 })) P.add(flat(COLORS[(i * 3 + (o.seed | 0)) % 8], 0.95, 0), new THREE.PlaneGeometry(0.28, ht), mx(x, (row ? 1.2 : 1.48) - ht / 2, row ? 0.18 : 0), 0); }
    e.rect(w, 0.4); },
  trashbins(P, o, e) { const cs = [0x3a8a4a, 0x3a6ea8, 0xc9a22e, 0x8a8a92]; if (has('mg-trash-bin')) { const n = o.n || 3, w = n * 0.62; P.box(flat(0xc8ccd0, 0.5, 0.3), w, 0.95, 0.56, 0, 0.475, 0); face(P, 'mg-trash-bin', w, 0.95, 0, 0.475, 0.282, { uv: [0, 0, n / 3, 1] }); } else for (let i = 0; i < (o.n || 3); i++) { const x = (i - ((o.n || 3) - 1) / 2) * 0.62, m = flat(cs[i % 4], 0.5, 0.1); P.box(m, 0.56, 0.9, 0.56, x, 0.45, 0); P.box(flat(0x2a2c30, 0.5, 0.2), 0.58, 0.05, 0.58, x, 0.92, -0.02, 0, -0.15); }
    if (!face(P, 'mg-trash-sign', 1.2, 0.6, 0, 1.6, -0.27, {})) P.box(flat(0xf0f0ea, 0.6, 0), 1.1, 0.5, 0.02, 0, 1.6, -0.27); e.rect((o.n || 3) * 0.62, 0.56); },
  mailboxes(P, o, e) { const w = o.w || 1.6, h = o.h || 1.2; P.box(MM().st, w, h, 0.3, 0, 0.6 + h / 2, 0); front(P, 'mg-mailboxes', w, h, 0, 0.6 + h / 2, 0.152, { metal: 0.5 }, () => { const nx = Math.round(w / 0.32), ny = Math.round(h / 0.3); for (let i = 0; i < nx; i++) for (let j = 0; j < ny; j++) P.box(MM().dk, 0.28, 0.26, 0.01, -w / 2 + 0.16 + i * w / nx, 0.6 + 0.15 + j * h / ny, 0.152); }); e.rect(w, 0.3); },
  meterbox(P, o, e) { const y = o.y || 1.3; P.box(flat(0xd8d4c8, 0.6, 0.3), 0.6, 0.9, 0.22, 0, y, 0.11); front(P, 'mg-meterbox', 0.6, 0.9, 0, y, 0.222, { metal: 0.3 }, () => { P.add(glassMat(), new THREE.PlaneGeometry(0.2, 0.14), mx(0, y + 0.18, 0.222), 0); P.box(MM().bk, 0.5, 0.01, 0.01, 0, y - 0.1, 0.222); }); P.cyl(flat(0xc9a22e, 0.5, 0.3), 0.025, 0.025, Math.max(0.1, (o.h || 2.8) - y - 0.45), -0.18, (y + 0.45 + (o.h || 2.8)) / 2, 0.06, 'y', 6); },
  firehose(P, o, e) { const y = o.y || 1.1; P.box(flat(0xc8302a, 0.4, 0.3), 0.75, 1.0, 0.2, 0, y, 0.1); front(P, 'mg-firehose', 0.75, 1.0, 0, y, 0.202, { rough: 0.4 }, () => { P.add(glassMat(), new THREE.PlaneGeometry(0.5, 0.4), mx(0, y + 0.15, 0.202), 0); P.tor(flat(0xd8d4c8, 0.6, 0), 0.15, 0.04, 0, y + 0.15, 0.12, 0, 0, 0, 12, 4); }); P.sph(glow('#ff3020', 3), 0.05, 0, y + 0.64, 0.12, 1, 1, 1, 6); },
  exitsign(P, o, e) { const y = o.y || 2.2; if (has('mg-exit-sign')) { P.box(white(), 0.44, 0.3, 0.05, 0, y, 0.025); face(P, 'mg-exit-sign', 0.44, 0.3, 0, y, 0.052, { glow: 1.2 }); return; } P.box(white(), 0.46, 0.18, 0.06, 0, y, 0.03); P.add(glow('#3dff8a', 1.6), new THREE.PlaneGeometry(0.42, 0.15), mx(0, y, 0.062), 0); },
  addrplate(P, o, e) { const y = o.y || 2.0; if (!face(P, 'mg-address', 0.5, 0.18, 0, y, 0.012, { rough: 0.4 })) P.box(flat(0x2a5a9a, 0.4, 0.2), 0.5, 0.18, 0.02, 0, y, 0.01); },
  noticeboard(P, o, e) { const w = o.w || 1.3, h = o.h || 0.9, y = o.y || 1.5; P.box(wood(0x8a6a4a), w + 0.08, h + 0.08, 0.04, 0, y, 0.02); front(P, 'mg-noticeboard', w, h, 0, y, 0.042, {}, () => { P.add(mat('cork', { rough: 0.9, metal: 0 }), new THREE.PlaneGeometry(w, h), mx(0, y, 0.042)); for (let i = 0; i < 5; i++) P.add(flat([0xffffff, 0xffe8a0, 0xd8f0ff, 0xffd0d0, 0xe8ffe0][i], 0.9, 0), new THREE.PlaneGeometry(0.22, 0.3), mx(-w / 2 + 0.2 + i * (w - 0.4) / 4, y + (i % 2 ? 0.15 : -0.12), 0.046, 0, 0, (i % 3 - 1) * 0.06), 0); }); },
  posters(P, o, e) { const w = o.w || 1.2, h = o.h || 0.8, y = o.y || 1.6; front(P, 'mg-posters', w, h, 0, y, 0.01, { uv: o.uv }, () => { for (let i = 0; i < 3; i++) P.add(flat(COLORS[(i * 3 + (o.seed | 0)) % 8], 0.8, 0), new THREE.PlaneGeometry(w / 3 - 0.06, h * 0.9), mx(-w / 3 + i * w / 3, y, 0.01), 0); }); },
  elevator(P, o, e) { const y = 1.05; P.box(MM().st, 1.5, 2.4, 0.08, 0, 1.2, 0.04); front(P, 'mg-elevator', 1.1, 2.1, 0, y, 0.085, { metal: 0.6, rough: 0.3 }, () => { for (const s of [-1, 1]) P.box(mat('stainless', { color: 0xc8ccd0, rough: 0.25, metal: 1 }), 0.54, 2.1, 0.02, s * 0.28, y, 0.09); });
    P.box(MM().bk, 0.5, 0.14, 0.02, 0, 2.3, 0.09); P.add(glow('#ff9a3a', 1.6), new THREE.PlaneGeometry(0.3, 0.08), mx(0, 2.3, 0.101), 0); P.box(MM().bk, 0.08, 0.2, 0.03, 0.72, 1.2, 0.09); P.sph(glow('#ffe0a0', 2), 0.025, 0.72, 1.24, 0.11, 1, 1, 1, 6); if (o.use !== false) e.use(o.label || 'エレベーター', 'talk:mgelev', 2.0); },
  /** 上の階へ上がる階段 (立入禁止の札。居住筒の上階を感じさせる飾り) */
  stairup(P, o, e) { const w = o.w || 1.4, H = o.h || 2.8, n = Math.round(H / 0.18), run = 0.27, m = tm('mg-stair', 'tread', { color: 0xb8b4aa, rough: 0.7, metal: 0.3 }), rail = MM().ch;
    for (let i = 0; i < n; i++) P.box(m, w, (i + 1) * H / n, run, 0, (i + 1) * H / n / 2, n * run / 2 - (i + 0.5) * run);
    for (const s of [-1, 1]) { const l = Math.hypot(n * run, H); P.add(rail, new THREE.CylinderGeometry(0.025, 0.025, l, 6), mx(s * (w / 2 - 0.05), H / 2 + 0.9, 0, Math.atan2(n * run, H), 0, 0)); }
    P.box(flat(0xd8b830, 0.5, 0.2), w, 0.08, 0.04, 0, 1.0, n * run / 2 + 0.3); P.box(flat(0x2a2c30, 0.5, 0.2), w, 0.08, 0.04, 0, 0.6, n * run / 2 + 0.3); for (const s of [-1, 1]) P.box(flat(0xd8b830, 0.5, 0.2), 0.05, 1.05, 0.05, s * w / 2, 0.52, n * run / 2 + 0.3);
    e.rect(w, n * run + 0.7, 0, 0.3); if (o.use !== false) e.use(o.label || '上の階への階段', 'talk:mgstairs', 2.4); },
  /** 閉まった店のシャッター (路地の壁。昔の店の名残) */
  shutter(P, o, e) { const w = o.w || 2.4, h = o.h || 2.2; P.box(MM().st, w + 0.2, 0.3, 0.3, 0, h + 0.15, 0.15); for (const s of [-1, 1]) P.box(MM().st, 0.08, h, 0.1, s * (w / 2 + 0.04), h / 2, 0.05);
    P.add(tm('mg-shutter', 'zinc-roof', { color: 0xc8ccd0, rough: 0.5, metal: 0.5 }), new THREE.PlaneGeometry(w, h), mx(0, h / 2, 0.03), has('mg-shutter') ? 0 : undefined); P.box(MM().dk, w, 0.06, 0.06, 0, 0.05, 0.05); },
  /** 上の階の家並み (広場や大通りの壁の上部): 階ごとの床の帯、窓 (中の灯りとカーテン)、ベランダ (手すり・洗濯物・鉢)、室外機、縦の配管。区画の幅も灯りも不揃い */
  facade(P, o, e) {
    const W = o.w || 10, y0 = o.yb || 3.8, y1 = o.yt || 6, sh = o.story || 2.7, // yb〜yt = 家並みの下端と上端 (y0 は小道具全体を持ち上げる設定なので使わない)
      rnd = e.rnd, pick = (a) => a[Math.floor(rnd() * a.length)], band = flat(o.band || 0xd0cabe, 0.6, 0.2), fr = white(), rail = MM().ch;
    const img = has('mg-facade-window'); if (has('mg-facade-wall')) P.add(mat('mg-facade-wall', { rough: 0.7, metal: 0.05 }), new THREE.PlaneGeometry(W, y1 - y0 + 0.2), mx(0, (y0 + y1) / 2, 0.004)); // 上の階の外壁
    for (let y = y0; y + 1.5 <= y1; y += sh) {
      P.box(band, W, 0.22, 0.12, 0, y, 0.06); let x = -W / 2 + rnd() * 0.6;
      while (x < W / 2 - 1.6) {
        const bw = Math.min(W / 2 - x, 2.6 + rnd() * 2.4), cx = x + bw / 2, wh = Math.min(1.3, y1 - y - 0.45), wy = y + 0.4 + wh / 2, ww = Math.max(0.8, Math.min(bw - 0.8, 1.1 + rnd() * 1.0)); if (wh < 0.6) break;
        if (img) { face(P, 'mg-facade-window', ww + 0.5, wh + 0.4, cx, wy, 0.012, { glow: rnd() < 0.8 ? 0.55 : 0.12, rough: 0.4 }); } else {
        P.box(fr, ww + 0.12, wh + 0.12, 0.06, cx, wy, 0.03); const lit = rnd() < 0.78;
        P.add(glow(lit ? pick(['#ffe2b0', '#fff0d8', '#dceeff', '#ffd8a8']) : '#7a8a98', lit ? 1.05 : 0.45), new THREE.PlaneGeometry(ww, wh), mx(cx, wy, 0.065), 0);
        if (rnd() < 0.7) { const cc = flat(pick([0xe8dcc8, 0xc8d8e8, 0xf0d0c8, 0xd8e8c8, 0xe8e0f0]), 0.9, 0), k = 0.18 + rnd() * 0.22; P.box(cc, ww * k, wh, 0.03, cx - ww / 2 + ww * k / 2, wy, 0.08); P.box(cc, ww * 0.22, wh, 0.03, cx + ww / 2 - ww * 0.11, wy, 0.08); }
        P.box(fr, 0.03, wh, 0.05, cx, wy, 0.075); }
        const r1 = rnd(); if (r1 < 0.45) { // ベランダ
          const bd = 0.75, bl = bw - 0.3, n = Math.max(2, Math.round(bl / 0.5)); P.box(tm('mg-balcony-floor', 'flat', { color: 0xd0cabe, rough: 0.6, metal: 0.2 }), bl, 0.1, bd, cx, y + 0.05, bd / 2);
          if (!face(P, 'mg-balcony', bl, 1.05, cx, y + 0.6, bd, { rough: 0.3, metal: 0.3, uv: [0, 0, Math.max(1, Math.round(bl / 1.6)), 1] })) { P.box(rail, bl, 0.04, 0.04, cx, y + 1.0, bd - 0.02); for (let k = 0; k <= n; k++) P.box(rail, 0.025, 0.95, 0.025, cx - bl / 2 + k * bl / n, y + 0.55, bd - 0.02); } for (const s2 of [-1, 1]) P.box(rail, 0.04, 0.04, bd, cx + s2 * bl / 2, y + 1.0, bd / 2);
          const r2 = rnd(); if (r2 < 0.45 && y + 1.75 < y1) for (let k = 0; k < 3; k++) { const lh = 0.35 + rnd() * 0.25; P.add(flat(COLORS[Math.floor(rnd() * 8)], 0.95, 0), new THREE.PlaneGeometry(0.32, lh), mx(cx - 0.5 + k * 0.48, y + 1.55 - lh / 2, bd * 0.5), 0); }
          else if (r2 < 0.85) { const px = cx + (rnd() < 0.5 ? -1 : 1) * (bl / 2 - 0.35); P.cyl(mat('terracotta', { rough: 0.9, metal: 0 }), 0.14, 0.1, 0.22, px, y + 0.21, bd * 0.5, 'y', 8); P.add(MM().lf2, new THREE.IcosahedronGeometry(0.24, 0), mx(px, y + 0.5, bd * 0.5)); }
        } else if (r1 < 0.75) { const ax = cx + (rnd() < 0.5 ? -1 : 1) * (ww / 2 + 0.6); P.box(white(), 0.7, 0.48, 0.26, ax, y + 0.62, 0.13); face(P, 'mg-ac-outdoor', 0.7, 0.48, ax, y + 0.62, 0.262, {}); } // 室外機
        x += bw;
      }
      if (rnd() < 0.6) { const hh = Math.min(sh, y1 - y); P.cyl(flat(0xd8d0c0, 0.5, 0.3), 0.05, 0.05, hh, -W / 2 + 0.3 + rnd() * (W - 0.6), y + hh / 2, 0.08, 'y', 6); }
    }
  },
  /** 玄関の土間 (住戸の入口の内側): 石の床と上がり框、脱いだ靴 */
  genkan(P, o, e) { const w = o.w || 1.3, d = o.d || 0.95; P.add(tm('mg-genkan', 'granite-pavers', { color: 0x8a8680, rough: 0.6, metal: 0.05 }), new THREE.PlaneGeometry(w, d).rotateX(-HP), mx(0, 0.009, d / 2), 0.8); P.box(wood(o.c || 0x8a6a4a), w, 0.05, 0.07, 0, 0.025, d);
    if (o.shoes !== false) for (let i = 0; i < (o.n ?? 2); i++) { const x = -w / 2 + 0.25 + i * 0.32, c = flat([0x2a2c30, 0x6a4a30, 0xe8e8e4, 0x3a6ea8][(i + (o.seed | 0)) % 4], 0.6, 0.1); for (const s2 of [-0.06, 0.06]) P.box(c, 0.1, 0.07, 0.26, x + s2, 0.035, d * 0.5); } },
  /** 配管シャフト (通路の壁から張り出した、床から天井までの点検口つきの箱) */
  shaft(P, o, e) { const w = o.w || 0.9, dp = o.d || 0.42, h = o.h || 2.8; P.box(flat(o.c || 0xe0dcd2, 0.7, 0.2), w, h, dp, 0, h / 2, dp / 2); if (!face(P, 'mg-shaft-door', w * 0.7, 1.6, 0, 1.05, dp + 0.006, { rough: 0.5, metal: 0.3 })) { P.box(MM().st, w * 0.62, 1.5, 0.02, 0, 1.05, dp + 0.01); P.box(MM().ch, 0.12, 0.03, 0.03, w * 0.2, 1.05, dp + 0.03); } P.box(flat(0xe8c020, 0.5, 0.1), 0.24, 0.1, 0.01, 0, 1.95, dp + 0.012); e.rect(w, dp, 0, dp / 2); },
  /** 絵を正面に貼った箱 (パンのショーケース・薬の棚・乾燥機・和だんす・鏡台など)。画像が無ければ無地の箱 */
  picfurn(P, o, e) { const w = o.w || 1.2, H = o.h || 1.8, d = o.d || 0.5; P.box(o.metal ? MM().st : wood(o.c || 0xb89870), w, H, d, 0, H / 2, 0); front(P, o.img, w, H, 0, H / 2, d / 2 + 0.004, { glow: o.glow, rough: o.rough ?? 0.5, uv: o.uv }); e.rect(w, d); },
  /** 壁に貼る絵 (写真の額・カレンダー・子どもの絵・厨房の奥・電車の側面など)。床を占めない */
  picwall(P, o, e) { const w = o.w || 1.0, h = o.h || 0.8, y = o.y || 1.5; if (!has(o.img)) return; if (o.frame) P.box(wood(0x6a5040), w + 0.06, h + 0.06, 0.03, 0, y, 0.015); face(P, o.img, w, h, 0, y, o.frame ? 0.032 : 0.012, { glow: o.glow, rough: o.rough ?? 0.6, uv: o.uv }); },
  /** 丸い絵 (床の丸いラグ・マンホール・壁掛け時計)。o.floor で床に、無ければ壁に */
  roundpic(P, o, e) { if (!has(o.img)) return; const r = o.r || 0.5, m = mat(o.img, { rough: o.rough ?? 0.7, metal: o.metal ?? 0.05 }); if (o.floor) P.add(m, new THREE.CircleGeometry(r, 32).rotateX(-HP), mx(0, o.y || 0.008, 0), 0); else { P.cyl(wood(0x6a4a30), r + 0.02, r + 0.02, 0.04, 0, o.y || 2.0, 0.02, 'z', 24); P.add(m, new THREE.CircleGeometry(r, 32), mx(0, o.y || 2.0, 0.042), 0); } },
  /** 床に貼る四角い絵 (排水溝・子ども部屋のマット・駅のホームの縁)。o.rep で長手方向に繰り返す */
  floorpic(P, o, e) { const w = o.w || 1, d = o.d || 1; face(P, o.img, w, d, 0, o.y || 0.008, 0, { rx: -HP, rough: o.rough ?? 0.6, metal: o.metal ?? 0.05, uv: [0, 0, o.rep || 1, 1] }); },
  /** 刈り込んだ生け垣 */
  hedge(P, o, e) { const w = o.w || 2, h = o.h || 0.85, d = o.d || 0.6; P.box(tm('mg-hedge', 'leaves', { color: 0x3a7a3a, rough: 0.9, metal: 0 }), w, h, d, 0, h / 2, 0); P.box(tm('mg-soil', 'wet-mud', { color: 0x3a2a1a, rough: 1, metal: 0 }), w + 0.2, 0.04, d + 0.2, 0, 0.02, 0); e.rect(w, d); },
  /** 屋台 (壁際に置く木の屋台の正面の絵 + 台) */
  yatai(P, o, e) { const w = o.w || 2.2; P.box(wood(0x8a6a40), w, 0.9, 0.7, 0, 0.45, 0.1); if (!face(P, 'mg-stall-front', w, 2.4, 0, 1.2, -0.25, { rough: 0.7 })) P.box(fab(o.c || 0xb8452e), w, 0.05, 0.9, 0, 2.3, 0.1, 0, 0.2); e.rect(w, 0.9, 0, 0.05); if (o.use) e.use(o.label || '屋台', o.use, 2.4, o); },
  // ───────── 商店 ─────────
  shopcounter(P, o, e) { const w = o.w || 2.0; P.box(wood(o.c || 0xc8a070), w, 1.0, 0.6, 0, 0.5, 0); P.box(mat('quartz-countertop', { color: 0xe8e4dc, rough: 0.35, metal: 0.1 }), w + 0.06, 0.04, 0.66, 0, 1.02, 0);
    front(P, 'mg-register', w, 0.96, 0, 0.5, 0.302, {}); P.box(MM().bk, 0.36, 0.14, 0.3, w / 2 - 0.35, 1.11, -0.05); P.box(MM().bk, 0.26, 0.2, 0.03, w / 2 - 0.35, 1.28, -0.16, 0, -0.3); P.add(glow('#8adfff', 1.2), new THREE.PlaneGeometry(0.22, 0.14), mx(w / 2 - 0.35, 1.29, -0.145, -0.3), 0); e.rect(w, 0.6); if (o.use) e.use(o.label || 'カウンター', o.use, 2.4, o); },
  goodsshelf(P, o, e) { const w = o.w || 1.8, H = o.h || 1.8, dbl = o.dbl; P.box(MM().st, w, H, dbl ? 0.8 : 0.45, 0, H / 2, 0);
    for (const s of dbl ? [1, -1] : [1]) front(P, 'mg-shelf-goods', w, H - 0.1, 0, H / 2, s * (dbl ? 0.402 : 0.227), { ry: s < 0 ? Math.PI : 0, uv: o.uv }, () => { for (let j = 0; j < 4; j++) for (let i = 0; i < Math.round(w / 0.25); i++) P.box(flat(COLORS[(i * 5 + j * 3 + (o.seed | 0)) % 8], 0.5, 0.05), 0.2, 0.22 + (i % 3) * 0.04, 0.16, -w / 2 + 0.14 + i * 0.25, 0.25 + j * (H - 0.3) / 4 + 0.11, s * (dbl ? 0.3 : 0.12)); });
    e.rect(w, dbl ? 0.8 : 0.45); },
  drinkcase(P, o, e) { const w = o.w || 1.2; P.box(MM().dk, w, 2.0, 0.7, 0, 1.0, 0); front(P, 'mg-drinks', w - 0.08, 1.8, 0, 1.0, 0.352, { glow: 0.55 }, () => { P.add(glow('#e8f4ff', 1.0), new THREE.PlaneGeometry(w - 0.1, 1.8), mx(0, 1.0, 0.348), 0); for (let j = 0; j < 5; j++) for (let i = 0; i < Math.round(w / 0.12); i++) P.cyl(flat(COLORS[(i + j) % 8], 0.3, 0.1), 0.03, 0.03, 0.2, -w / 2 + 0.08 + i * 0.12, 0.25 + j * 0.34, 0.25, 'y', 6); });
    P.add(glassMat(), new THREE.PlaneGeometry(w - 0.04, 1.86), mx(0, 1.0, 0.356), 0); e.rect(w, 0.7); e.light('#e8f4ff', 3, 1.2, 4); },
  produce(P, o, e) { const w = o.w || 2.0; P.box(wood(0x8a6a40), w, 0.7, 1.0, 0, 0.35, 0); P.add(tm('mg-produce', 'plastic-crate', { color: 0x6a9a3a, rough: 0.8, metal: 0 }), new THREE.BoxGeometry(w, 0.06, 1.1), mx(0, 0.82, 0.05, 0.25), 0);
    if (!has('mg-produce')) for (let i = 0; i < Math.round(w * 6); i++) P.sph(flat([0xd83a2a, 0xf0a020, 0x6aaa3a, 0xe8d040, 0x8a3a8a][i % 5], 0.5, 0), 0.07, -w / 2 + 0.1 + (i % Math.round(w * 3)) * w / Math.round(w * 3), 0.92 + (i > w * 3 ? 0.1 : 0), (i > w * 3 ? -0.25 : 0.25), 1, 1, 1, 8);
    e.rect(w, 1.0); },
  noren(P, o, e) { const w = o.w || 1.4, y = o.y || 2.25; P.cyl(wood(0x5a4030), 0.02, 0.02, w + 0.2, 0, y, 0.08, 'x', 6); if (face(P, o.img || 'mg-noren', w, o.len || 0.62, 0, y - (o.len || 0.62) / 2, 0.085, { rough: 0.95, metal: 0 })) return; for (let i = 0; i < 3; i++) P.add(mat('cotton-cloth', { color: o.c || 0x2a3a6a, rough: 0.95, metal: 0 }), new THREE.PlaneGeometry(w / 3 - 0.03, 0.6), mx(-w / 3 + i * w / 3, y - 0.3, 0.08), 0); },
  menuboard(P, o, e) { const w = o.w || 1.8, y = o.y || 2.0; P.box(wood(0x5a4030), w + 0.06, 0.66, 0.04, 0, y, 0.02); front(P, 'mg-menu', w, 0.6, 0, y, 0.042, { uv: o.uv || [0, 0, Math.max(1, Math.round(w / 0.7)), 1] }, () => { for (let i = 0; i < Math.round(w / 0.16); i++) P.add(flat(0xe8dcc0, 0.8, 0), new THREE.PlaneGeometry(0.12, 0.5), mx(-w / 2 + 0.1 + i * 0.16, y, 0.042), 0); }); },
  awning(P, o, e) { const w = o.w || 2.4, y = o.y || 2.6; P.add(tm('mg-awning', 'technical-canvas', { color: o.c || 0xb8452e, rough: 0.9, metal: 0 }), new THREE.BoxGeometry(w, 0.03, 0.9), mx(0, y, 0.42, 0.35), 0); P.box(MM().dk, w, 0.04, 0.04, 0, y - 0.16, 0.84); },
  stool(P, o, e) { P.cyl(MM().ch, 0.025, 0.025, 0.7, 0, 0.35, 0, 'y', 6); P.cyl(MM().ch, 0.18, 0.2, 0.02, 0, 0.01, 0, 'y', 12); P.cyl(fab(o.c || 0xb8452e), 0.18, 0.18, 0.08, 0, 0.74, 0, 'y', 14); e.col(0.2); },
  barberchair(P, o, e) { const f = fab(o.c || 0x2a2c30); P.cyl(MM().ch, 0.25, 0.3, 0.3, 0, 0.15, 0, 'y', 14); P.box(f, 0.6, 0.18, 0.6, 0, 0.55, 0); P.box(f, 0.58, 0.8, 0.12, 0, 1.0, -0.28, 0, -0.15); for (const s of [-1, 1]) P.box(MM().ch, 0.06, 0.06, 0.5, s * 0.33, 0.78, 0); P.box(MM().ch, 0.4, 0.05, 0.3, 0, 0.3, 0.45, 0, 0.4);
    if (!face(P, 'mg-barber-mirror', 1.5, 1.6, 0, 1.25, -0.9, { rough: 0.2, metal: 0.3 })) { P.add(mat('stainless', { color: 0xe8eef4, rough: 0.05, metal: 1 }), new THREE.PlaneGeometry(0.9, 1.1), mx(0, 1.5, -0.9), 0); P.box(wood(0x6a5040), 1.0, 0.06, 0.3, 0, 0.95, -0.82); } e.rect(0.7, 0.7); },
  // ───────── 公共施設 ─────────
  blackboard(P, o, e) { const w = o.w || 3.6; P.box(wood(0x8a6a4a), w + 0.1, 1.3, 0.04, 0, 1.6, 0.02); front(P, 'mg-blackboard', w, 1.2, 0, 1.6, 0.042, { rough: 0.9 }, () => P.add(flat(0x1e3a2c, 0.9, 0), new THREE.PlaneGeometry(w, 1.2), mx(0, 1.6, 0.042))); P.box(wood(0x8a6a4a), w, 0.04, 0.1, 0, 0.98, 0.06); },
  schooldesks(P, o, e) { const nx = o.nx || 4, nz = o.nz || 4, gx = 1.1, gz = 1.2, c = o.c || 0xc8a070; for (let i = 0; i < nx; i++) for (let j = 0; j < nz; j++) { const x = (i - (nx - 1) / 2) * gx, z = (j - (nz - 1) / 2) * gz;
      P.box(wood(c), 0.62, 0.03, 0.44, x, 0.7, z); P.box(MM().st, 0.56, 0.2, 0.38, x, 0.58, z); for (const s of [-1, 1]) P.box(MM().st, 0.03, 0.68, 0.03, x + s * 0.28, 0.34, z - 0.18);
      P.box(wood(c), 0.38, 0.03, 0.36, x, 0.42, z + 0.42); P.box(wood(c), 0.36, 0.3, 0.03, x, 0.62, z + 0.6); for (const [a, b] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) P.box(MM().st, 0.025, 0.41, 0.025, x + a * 0.16, 0.2, z + 0.42 + b * 0.15); }
    e.rect(nx * gx, nz * gz + 0.4, 0, 0.2); },
  hospbed(P, o, e) { const m = MM(); P.box(m.st, 0.95, 0.5, 2.0, 0, 0.42, 0); P.box(mat('bed-linen', { color: 0xf4f6f8, rough: 0.9, metal: 0 }), 0.9, 0.14, 1.9, 0, 0.72, 0); P.box(mat('blanket', { color: 0xa8d0e0, rough: 0.9, metal: 0 }), 0.92, 0.05, 1.2, 0, 0.8, 0.3); P.box(flat(0xffffff, 0.9, 0), 0.6, 0.1, 0.34, 0, 0.83, -0.75);
    for (const s of [-1, 1]) P.box(m.ch, 0.03, 0.25, 1.0, s * 0.5, 0.95, 0.1); P.box(m.st, 0.95, 0.6, 0.05, 0, 0.95, -1.0); if (o.curtain !== false) P.add(tm('mg-hospital-curtain', 'cotton-cloth', { color: 0xc8e4d8, rough: 0.95, metal: 0 }), new THREE.BoxGeometry(0.03, 1.9, 2.4), mx(0.85, 1.2, 0), 0);
    e.rect(0.95, 2.0); if (o.use) e.use(o.label || '寝台で休む', o.use, 2.2); },
  reception(P, o, e) { const w = o.w || 3.0; P.box(white(), w, 1.05, 0.7, 0, 0.525, 0); P.box(wood(0xc8a070), w + 0.06, 0.04, 0.8, 0, 1.07, 0.04); front(P, 'mg-counter', w, 1.0, 0, 0.5, 0.352, { uv: [0, 0.03, Math.max(1, Math.round(w / 2.6)), 0.36] }); // 絵の下側 (窓口の台の前板) だけ
    P.box(MM().bk, 0.8, 0.3, 0.06, 0, 2.2, -0.3); P.add(glow('#ff6a3a', 1.6), new THREE.PlaneGeometry(0.7, 0.22), mx(0, 2.2, -0.268), 0); e.rect(w, 0.7); if (o.use) e.use(o.label || '窓口', o.use, 2.6, o); },
  bathmural(P, o, e) { const w = o.w || 8, h = o.h || 3, y = o.y || 2.4; front(P, 'mg-bath-mural', w, h, 0, y, 0.01, { rough: 0.5, uv: [0, 0, Math.max(1, Math.round(w / h / 1.3)), 1] }, () => { P.add(flat(0x8ac0e8, 0.5, 0), new THREE.PlaneGeometry(w, h * 0.6), mx(0, y + h * 0.2, 0.01), 0); P.add(flat(0xe8f0f8, 0.5, 0), new THREE.PlaneGeometry(w, h * 0.4), mx(0, y - h * 0.3, 0.01), 0); P.add(flat(0xd8a050, 0.4, 0.2), new THREE.CircleGeometry(h * 0.18, 24), mx(w * 0.25, y + h * 0.15, 0.012), 0); }); },
  bathpool(P, o, e) { const w = o.w || 5, d = o.d || 2.6, t = tm('mg-bath-tile', 'ceramic-cloth', { color: 0xe8f0f4, rough: 0.3, metal: 0 }); P.box(t, w, 0.55, 0.2, 0, 0.275, d / 2 - 0.1); P.box(t, w, 0.55, 0.2, 0, 0.275, -d / 2 + 0.1); for (const s of [-1, 1]) P.box(t, 0.2, 0.55, d, s * (w / 2 - 0.1), 0.275, 0);
    P.add(new THREE.MeshStandardMaterial({ color: 0x9fdcf0, roughness: 0.05, metalness: 0, transparent: true, opacity: 0.75 }), new THREE.PlaneGeometry(w - 0.4, d - 0.4).rotateX(-HP), mx(0, 0.45, 0), 0); P.add(mat('flat', { color: 0x6ac0e0, rough: 0.6, metal: 0 }), new THREE.PlaneGeometry(w - 0.4, d - 0.4).rotateX(-HP), mx(0, 0.02, 0), 0);
    if (has('mg-hinoki')) { const hk = mat('mg-hinoki', { rough: 0.5, metal: 0 }); P.box(hk, w + 0.04, 0.06, 0.26, 0, 0.58, d / 2 - 0.1); P.box(hk, w + 0.04, 0.06, 0.26, 0, 0.58, -d / 2 + 0.1); for (const s of [-1, 1]) P.box(hk, 0.26, 0.06, d, s * (w / 2 - 0.1), 0.58, 0); } // 縁は檜
    e.rect(w, d); if (o.use) e.use(o.label || '湯船につかる', o.use, Math.max(w, d) / 2 + 1, o); },
  washrow(P, o, e) { const n = o.n || 5; if (face(P, 'mg-bath-washplace', n * 1.0, 1.9, 0, 0.95, 0.01, { rough: 0.4, uv: [0, 0, n / 3, 1] })) { for (let i = 0; i < n; i++) P.cyl(flat(0xf0ead8, 0.4, 0), 0.15, 0.13, 0.3, (i - (n - 1) / 2) * 1.0, 0.15, 0.5, 'y', 12); e.rect(n, 0.4); return; } for (let i = 0; i < n; i++) { const x = (i - (n - 1) / 2) * 1.0; P.cyl(MM().ch, 0.02, 0.02, 0.5, x, 1.6, 0.05, 'y', 6); P.cyl(MM().ch, 0.05, 0.05, 0.02, x, 1.86, 0.1, 'y', 10); P.box(MM().ch, 0.18, 0.06, 0.08, x, 0.75, 0.06); P.add(mat('stainless', { color: 0xe8eef4, rough: 0.05, metal: 1 }), new THREE.PlaneGeometry(0.45, 0.5), mx(x, 1.2, 0.012), 0);
      P.cyl(flat(0xf0f0ea, 0.4, 0), 0.15, 0.13, 0.3, x, 0.15, 0.5, 'y', 12); P.cyl(flat(0xe8c060, 0.4, 0), 0.13, 0.1, 0.12, x + 0.3, 0.06, 0.5, 'y', 12); } e.rect(n, 0.4); },
  libshelf(P, o, e) { const w = o.w || 2.4, H = o.h || 2.2, dbl = o.dbl; P.box(wood(0xb89870), w, H, dbl ? 0.7 : 0.4, 0, H / 2, 0);
    for (const s of dbl ? [1, -1] : [1]) front(P, 'mg-library-shelf', w - 0.04, H - 0.06, 0, H / 2, s * (dbl ? 0.352 : 0.202), { ry: s < 0 ? Math.PI : 0 }, () => { for (let j = 0; j < 5; j++) P.box(mat('book-spines', { color: COLORS[(j * 3 + (o.seed | 0)) % 8], rough: 0.8, metal: 0 }), w - 0.1, 0.3, 0.02, 0, 0.25 + j * (H - 0.3) / 5, s * (dbl ? 0.352 : 0.202)); });
    e.rect(w, dbl ? 0.7 : 0.4); },
  playset(P, o, e) { const r = flat(0xd8402a, 0.4, 0.2), y = flat(0xe8c020, 0.4, 0.2), b = flat(0x2a6ab8, 0.4, 0.2);
    for (const [x, z] of [[-0.6, -0.6], [0.6, -0.6], [-0.6, 0.6], [0.6, 0.6]]) P.cyl(b, 0.05, 0.05, 1.6, x, 0.8, z - 1, 'y', 8); P.box(y, 1.4, 0.08, 1.4, 0, 1.4, -1); P.add(r, new THREE.BoxGeometry(0.7, 0.06, 2.3), mx(0, 0.72, 0.65, -0.6), 0); for (const s of [-1, 1]) P.add(r, new THREE.BoxGeometry(0.05, 0.2, 2.3), mx(s * 0.36, 0.82, 0.65, -0.6), 0);
    for (let i = 0; i < 5; i++) P.box(b, 0.7, 0.04, 0.06, 0, 0.25 + i * 0.27, -1.75); for (const s of [-1, 1]) P.box(b, 0.05, 1.5, 0.05, s * 0.36, 0.75, -1.75);
    // ぶらんこ
    for (const s of [-1, 1]) { P.cyl(y, 0.05, 0.05, 2.2, 2.0 + s * 1.2, 1.1, 0, 'y', 8); } P.cyl(y, 0.05, 0.05, 2.5, 2.0, 2.2, 0, 'x', 8); for (const s of [-1, 1]) { for (const q of [-0.2, 0.2]) P.cyl(MM().ch, 0.01, 0.01, 1.6, 2.0 + s * 0.55 + q, 1.4, 0, 'y', 4); P.box(r, 0.5, 0.04, 0.2, 2.0 + s * 0.55, 0.6, 0); }
    e.rect(2.0, 3.2, 0, -0.4); e.rect(2.6, 0.5, 2.0, 0); },
  shrine(P, o, e) { const v = tm('mg-torii', 'flat', { color: 0xd03a1e, rough: 0.5, metal: 0.1 }), k = flat(0x1a1a1e, 0.5, 0.1);
    for (const s of [-1, 1]) P.cyl(v, 0.08, 0.09, 2.4, s * 0.85, 1.2, 1.4, 'y', 10); P.box(k, 2.4, 0.14, 0.2, 0, 2.45, 1.4); P.box(v, 2.1, 0.1, 0.14, 0, 2.15, 1.4); P.box(v, 0.1, 0.3, 0.12, 0, 2.3, 1.4);
    P.box(wood(0x9a7048), 1.1, 0.5, 0.8, 0, 0.25, -0.2); P.box(wood(0xb8905a), 0.8, 0.8, 0.6, 0, 0.9, -0.2); P.add(wood(0x6a4a30), new THREE.ConeGeometry(0.75, 0.4, 4), mx(0, 1.5, -0.2, 0, Math.PI / 4, 0, 1, 1, 0.9));
    front(P, 'mg-shrine', 0.8, 0.8, 0, 0.9, 0.102, {}); P.box(wood(0x5a4030), 0.5, 0.3, 0.3, 0, 0.15, 0.5); P.sph(glow('#ffd27a', 2.2), 0.06, -0.3, 1.1, 0.2, 1, 1.3, 1, 8); P.sph(glow('#ffd27a', 2.2), 0.06, 0.3, 1.1, 0.2, 1, 1.3, 1, 8);
    e.rect(1.2, 1.0, 0, -0.2); e.col(0.12, -0.85, 1.4); e.col(0.12, 0.85, 1.4); e.use(o.label || '小さな祠', 'talk:mgshrine', 2.4); },
  boxes(P, o, e) { const m = tm('mg-cardboard', 'plastic-crate', { color: 0xb08a5a, rough: 0.9, metal: 0 }), n = o.n || 4; for (let i = 0; i < n; i++) { const s = 0.4 + ((i * 7 + (o.seed | 0)) % 4) * 0.08; P.box(m, s * 1.2, s, s, ((i % 3) - 1) * 0.55, (i > 2 ? s * 1.5 : s / 2), (i % 2) * 0.3 - 0.15, (i * 0.37) % 0.5); } e.rect(1.6, 0.8); },
  valvepanel(P, o, e) { const w = o.w || 1.4, y = o.y || 1.4; P.box(MM().st, w, 1.0, 0.1, 0, y, 0.05); front(P, 'mg-valve-panel', w, 1.0, 0, y, 0.102, { metal: 0.5 }, () => { for (let i = 0; i < 3; i++) { P.cyl(white(), 0.08, 0.08, 0.03, -w / 3 + i * w / 3, y + 0.25, 0.11, 'z', 14); P.cyl(flat(0x1a1a1e, 0.5, 0.2), 0.065, 0.065, 0.01, -w / 3 + i * w / 3, y + 0.25, 0.126, 'z', 14); } });
    P.tor(flat(0xc8302a, 0.4, 0.3), 0.14, 0.02, -w / 4, y - 0.22, 0.2, 0, 0, 0, 20, 6); P.tor(flat(0x2a6ab8, 0.4, 0.3), 0.12, 0.02, w / 4, y - 0.22, 0.2, 0, 0, 0, 20, 6); },
  breaker(P, o, e) { const y = o.y || 1.5; P.box(flat(0xd8d4c8, 0.5, 0.3), 0.7, 1.0, 0.16, 0, y, 0.08); front(P, 'mg-breaker', 0.66, 0.96, 0, y, 0.162, { metal: 0.3 }, () => { for (let j = 0; j < 3; j++) for (let i = 0; i < 6; i++) P.box(MM().bk, 0.06, 0.12, 0.02, -0.25 + i * 0.1, y + 0.25 - j * 0.25, 0.165); }); P.box(glow('#5dff8a', 2), 0.04, 0.02, 0.02, 0.28, y + 0.42, 0.17); },
  louver(P, o, e) { const w = o.w || 0.9, h = o.h || 0.5, y = o.y || 2.3; P.box(MM().st, w + 0.06, h + 0.06, 0.05, 0, y, 0.025); front(P, 'mg-louver', w, h, 0, y, 0.052, { metal: 0.5 }, () => { for (let i = 0; i < Math.round(h / 0.06); i++) P.box(MM().dk, w, 0.02, 0.04, 0, y - h / 2 + 0.03 + i * 0.06, 0.05, 0, 0.5); }); },
  districtmap(P, o, e) { const w = o.w || 2.0, h = o.h || 1.3, y = o.y || 1.6; P.box(MM().st, w + 0.12, h + 0.12, 0.08, 0, y, 0.04); front(P, 'mg-district-map', w, h, 0, y, 0.082, { glow: 0.35, uv: o.uv }, () => P.add(glow('#d8ecff', 0.8), new THREE.PlaneGeometry(w, h), mx(0, y, 0.082), 0)); if (o.use !== false) e.use(o.label || '区画の案内図', 'map', 2.4); },
  floorarrow(P, o, e) { const l = o.l || 4; if (!face(P, 'mg-floor-arrow', l, 0.5, 0, 0.007, 0, { rx: -HP, rough: 0.6, uv: [0, 0, Math.max(1, Math.round(l / 1.25)), 1] })) P.add(glow(o.c || '#ffd27a', 0.5), new THREE.PlaneGeometry(l, 0.12).rotateX(-HP), mx(0, 0.007, 0), 0); }, // 長さは x 方向
  pottree(P, o, e) { const s = o.s || 1; P.box(flat(0xd8d4c8, 0.6, 0.1), 0.7 * s, 0.6 * s, 0.7 * s, 0, 0.3 * s, 0); P.cyl(mat('tree-bark', { color: 0x6a4a30, rough: 0.9, metal: 0 }), 0.05 * s, 0.07 * s, 1.4 * s, 0, 1.2 * s, 0, 'y', 6); P.add(MM().lf, new THREE.IcosahedronGeometry(0.6 * s, 1), mx(0, 2.1 * s, 0, 0, 0, 0, 1, 0.8, 1)); P.add(MM().lf2, new THREE.IcosahedronGeometry(0.45 * s, 0), mx(0.25 * s, 2.35 * s, 0.1, 0.4, 0, 0)); e.col(0.38 * s); },
  pond(P, o, e) { const r = o.r || 2.5; P.add(mat('rock', { color: 0x8a8478, rough: 1, metal: 0 }), new THREE.TorusGeometry(r, 0.25, 6, 32).rotateX(HP), mx(0, 0.1, 0), 0.5); P.add(tm('mg-pond', 'water', { color: 0x4a8aa0, rough: 0.1, metal: 0 }), new THREE.CircleGeometry(r, 32).rotateX(-HP), mx(0, 0.06, 0), 0.3); e.col(r + 0.1); },
};
