// 内装の設計図 v2: ステーション 5 (+ 追加の 4 基と救助船ミケーネは blueprints2.js) / 主人公機 3 / 惑星拠点 5 / 敵艦 (シード生成・3 種の間取り)
// 部屋: {id,x,z,w,d,h, shape:'round', ceil3:'vault|truss|coffer|rock|dome', lamps, deco[], plat[], rug[], win[]}
// 小道具: [種類, x, z, 向き(90°単位), オプション] (部屋の左上隅からの相対座標)  扉: [部屋A, 部屋B, 位置, 幅, 高さ, 種類]
import * as THREE from 'three';
import { rng, rr, pick, shuffled } from '../core/util.js';
import { mat, glow } from '../gfx/textures.js';
import { BP2, ALL2 } from './blueprints2.js';
import { ENEMY_CLASSES } from './defs.js';
import { hasImage } from '../gfx/materials.js';
import { haven } from './haven/interior.js'; // ヘイヴン・リングの内装 (約 1.5 km の居住デッキ)

const T = (label, use, x, z, rot, o = {}) => ['terminal', x, z, rot, { label, use, ...o }];
const N = (label, use, x, z, rot, suit, o = {}) => ['npc', x, z, rot, { label, use, suit, ...o }];
const S = (text, x, z, rot, o = {}) => ['sign', x, z, rot, { text, ...o }];

// ───────────────────────── 2. ヴァルカン造船廠: 重工業 (鉄骨トラス・クレーン・倉庫・現場事務所) ─────────────────────────
const vulcan = () => ({
  name: 'ヴァルカン造船廠', sub: '造船・改修', seed: 22, spawn: [31, 22], view: [0, 1], music: 'interior',
  theme: { wall: ['bulk', 0xa89a84, 0.8, 0.5], floor: ['plate', 0x8d8f94, 0.5, 0.7], ceil: ['rib', 0x4a4e55], trim: '#ffb347', lamp: '#ffe2b8', frame: 0x2a2c30, door: 0x7a6a50, amb: [0xffd9a8, 0x34322c, 0.72], gloss: 0.5, door3: 'blast', trims: 'low', lamps: 'pendant', cstyle: 'truss', truss: 0xc08a20 },
  rooms: [
    { id: 'hangar', name: '整備ドック', x: 0, z: 0, w: 40, d: 30, h: 15, li: 1.5, deco: ['ibeam', 'ducts', 'cables'], win: [['n', 6, 34, 2, 11]],
      props: [['shipslot', 20, 14, 0, { r: 11 }], ['gantry', 20, 4.5, 0, { w: 36, at: 9 }], T('造船廠ドック', 'yard', 35, 25, 0), ['cargo', 4, 7, 0, { c: 0xc9a22e }], ['cargo', 7.2, 7, 0, { c: 0xb8452e }], ['crate', 36, 5, 0, { n: 6 }], ['barrel', 4, 26, 0], ['barrel', 7, 27, 0], ['pipes', 39.5, 12, 3], ['pipes', 0.5, 17, 1], ['workbench', 12, 29.2, 2], ['toolcart', 28, 8, 0.4], ['toolcart', 10, 20, -0.3, { c: 0xc9a22e }],
        S('VULCAN DRYDOCK', 20, 29.7, 2, { h: 1.5, y: 9, c: '#ffb347' }), S('注意 溶接作業中', 20, 29.7, 2, { h: 0.6, y: 7.2, c: '#ff5a3a', flicker: 1 }), N('ドック長', 'talk:dock', 29, 25, -1, 0xd0a020), ['steam', 12, 20, 0], ['steam', 30, 8, 0]] },
    { id: 'shop', name: '工作室', x: 40, z: 4, w: 22, d: 18, h: 7, deco: ['ibeam', 'cables'], plat: [[12.6, 0.4, 9, 6, 0.9, 's', 0.35]],
      props: [['reactor', 6.5, 9.5, 0, { c: '#ff8a2a' }], T('改修工房', 'yard', 2.5, 15.5, 0), ['rack', 17, 1.2, 0, { n: 4, y0: 0.9 }], ['workbench', 17, 4.6, 2, { y0: 0.9 }], ['workbench', 13, 16.8, 2], ['crate', 18.5, 15, 0, { n: 5 }], ['weaponrack', 6, 0.25, 0, { c: '#ffb347' }], ['barrel', 1.6, 6, 0], ['toolcart', 11, 13, 0.2], ['steam', 9, 5, 0], ['fan', 16, 11, 0]] },
    { id: 'ctrl', name: '管制デッキ', x: 40, z: 22, w: 22, d: 14, h: 6, ceil3: 'coffer', lamps: 'spot', win: [['s', 1.5, 20.5, 0.8, 5.3]], floor: ['hex', 0x8a8478, 0.35, 0.5], wall: ['smooth', 0x8a8478, 0.6, 0.4], plat: [[3, 7.4, 16, 5.2, 0.45, 'n', 0.3]],
      props: [['console', 6, 11.2, 2, { kind: 'graph', y0: 0.45 }], ['console', 11, 11.2, 2, { kind: 'bars', y0: 0.45 }], ['console', 16, 11.2, 2, { kind: 'radar', y0: 0.45 }], ['seat', 6, 9.6, 0, { y0: 0.45 }], ['seat', 11, 9.6, 0, { y0: 0.45 }], ['seat', 16, 9.6, 0, { y0: 0.45 }], ['holo', 11, 3.6, 0, { kind: 'ship', s: 0.9 }], T('任務端末', 'missions', 2, 3, 1), N('管制官', 'talk:ctrl', 19.5, 4, -1.4, 0x3a5a8a), ['wallscreen', 21.7, 4, 3, { w: 4, h: 2, y: 2.6, kind: 'bars', title: '建造進捗' }]] },
    { id: 'mess', name: '食堂・資材市場', x: 62, z: 4, w: 14, d: 14, h: 4.5, ceil3: 'flat', lamps: 'tube', wall: ['plaster', 0xe8d8a8, 0.9, 0], floor: ['tile', 0xd8d0c0, 0.4, 0.1], ceil: ['ceil', 0x8a8478],
      props: [['kitchen', 7, 0.6, 0, { w: 5, use: 'rest', label: '食事をとって休む' }], ['tablelong', 4.5, 7, 1], ['tablelong', 9.5, 7, 1], ['vending', 13.4, 11.5, 3], T('資材市場', 'market', 1.8, 12.4, 1), ['fan', 7, 7, 0], ['poster', 13.75, 5, 3, { text: '本日の定食\nカレー', c: '#ffb347', h: 1.0 }], ['crate', 12, 12.4, 0, { n: 3 }]] },
    { id: 'office', name: '現場事務所', x: 62, z: 18, w: 10, d: 8, h: 3.6, ceil3: 'flat', wall: ['wood', 0xb89878, 0.8, 0], floor: ['carpet', 0x5a3a2a, 1, 0], ceil: ['plaster', 0xd8ccb8], deco: ['wains'], rug: [[2.5, 2.6, 5, 3, 'carpet', 0x8a2a20]],
      props: [['desk', 5, 2.6, 2, { wood: 1 }], N('設計主任', 'talk:design', 5, 1.2, 0, 0x8a6a3a), ['bookshelf', 8.6, 0.45, 0, { w: 2 }], ['bookshelf', 1.4, 0.45, 0, { w: 2 }], ['sofa', 5, 7.0, 2, { c: 0x5a3a2a }], ['poster', 9.75, 5, 3, { text: '安全第一', c: '#6dffb0', h: 0.9 }], ['floorlamp', 9.2, 7.2, 0], ['cabinet', 0.5, 5, 1, { w: 1.6 }]] },
    { id: 'ware', name: '部品倉庫', x: 40, z: -8, w: 18, d: 12, h: 8, deco: ['ibeam'], li: 0.8,
      props: [['rack', 3.5, 3.4, 1, { n: 4 }], ['rack', 7, 3.4, 1, { n: 4 }], ['rack', 10.5, 3.4, 1, { n: 4 }], ['rack', 3.5, 9, 1, { n: 3 }], ['rack', 7, 9, 1, { n: 3 }], ['cargo', 15.4, 5, 0, { c: 0x2e7ab8 }], ['crate', 12.6, 9.4, 0, { n: 6 }], ['barrel', 16.5, 10.4, 0], ['toolcart', 13.6, 2, 0]] },
  ],
  doors: [['hangar', 'shop', 13, 3, 2.8, 'blast'], ['shop', 'ctrl', 51, 2.4, 2.5, 'slide'], ['shop', 'mess', 11, 2.2, 2.5, 'slide'], ['shop', 'office', 20, 1.6, 2.3, 'wood'], ['shop', 'ware', 49, 3, 2.8, 'blast']],
  // 管制デッキの窓の外: 建造中の船体 (乾ドック)
  extra(B) {
    const Y = mat('hull', { color: 0xf0a020, rough: 0.6, metal: 0.3 }), H = mat('hull', { color: 0xc9b98f, rough: 0.7, metal: 0.35 }), RB = mat('rib', { color: 0x8a8f98, metal: 0.6 }), L = glow('#ffe2b0', 6);
    for (let i = 0; i < 9; i++) { const x = 15 + i * 9, R = 9 + Math.sin(i / 8 * Math.PI) * 13; B.tor(RB, R, 0.8, x, -6, 78, 0, Math.PI / 2, 0, 24, 6); if (i < 5) B.add(H, new THREE.CylinderGeometry(R + 0.9, R + 0.9, 8.6, 24, 1, true, 0, 3.6), new THREE.Matrix4().makeRotationZ(Math.PI / 2).setPosition(x, -6, 78)); }
    B.box(RB, 80, 2.5, 3, 51, -27, 78);
    for (const z of [50, 106]) { B.box(Y, 4, 70, 4, 8, -8, z); B.box(Y, 4, 70, 4, 94, -8, z); B.box(Y, 90, 4, 4, 51, 26, z); B.box(Y, 90, 4, 4, 51, -42, z); for (let i = 0; i < 6; i++) B.box(L, 2.4, 0.6, 0.6, 14 + i * 15, 23.6, z + (z < 78 ? 2.2 : -2.2)); }
    B.box(Y, 4, 4, 60, 8, 26, 78); B.box(Y, 4, 4, 60, 94, 26, 78); B.box(Y, 3, 3, 30, 40, 24, 64); B.box(Y, 2, 16, 2, 40, 16, 76);
  },
});

// ───────────────────────── 3. オーロラ天文台: 白い研究施設 (ヴォールト格納庫・円形アトリウム・プラネタリウム・図書室) ─────────────────────────
const aurora = () => ({
  name: 'オーロラ天文台', sub: '科学研究', seed: 33, spawn: [28, 21], view: [0, 1], music: 'interior',
  theme: { wall: ['smooth', 0xf2f6fa, 0.45, 0.1], floor: ['hex', 0xe2ebf2, 0.28, 0.3], ceil: ['ceil', 0xc8d2dc], trim: '#8feaff', lamp: '#f2fbff', frame: 0x55606c, amb: [0xd8ecff, 0x56606a, 1.0], gloss: 1.0, door3: 'glass', trims: 'both', ribs: false, lamps: 'panel' },
  rooms: [
    { id: 'hangar', name: '到着ベイ', x: 0, z: 0, w: 36, d: 28, h: 14, li: 1.5, ceil3: 'vault', floor: ['tile', 0xc8d2dc, 0.3, 0.3], win: [['n', 5, 31, 2, 7.5]],
      props: [['shipslot', 18, 13, 0, { r: 10.5 }], T('格納庫サービス', 'shipyard', 31, 23.5, 0), ['crate', 4, 4, 0, { n: 4 }], ['rack', 2, 22, 1, { n: 3 }], ['toolcart', 8, 24, 0.3, { c: 0x2a8ab8 }], S('AURORA OBSERVATORY', 18, 27.7, 2, { h: 1.1, y: 6.4 }), S('到着ベイ', 18, 27.7, 2, { h: 0.6, y: 5.2, c: '#ffffff' }), N('研究員', 'talk:sci', 25, 23, -1, 0xdfe8f0)] },
    { id: 'atrium', name: '星系儀アトリウム', x: 6, z: 28, w: 24, d: 24, h: 13, shape: 'round', sky: true, rug: [[12, 12, 0, 4.2, 'carpet', 0x1a3a5a]],
      props: [['holo', 12, 12, 0, { kind: 'system', s: 2.3, y: 4.4, use: 'map', label: '星系儀を見る' }], ['bench', 6.6, 6.6, 0.5], ['bench', 17.4, 6.6, -0.5], ['bench', 6.6, 17.4, 1.5], ['bench', 17.4, 17.4, 2.5], ['plant', 3.8, 9, 0, { s: 1.3 }], ['plant', 20.2, 15, 0, { s: 1.3 }], T('任務端末', 'missions', 17.6, 3.6, -0.4), ['lightcone', 12, 12, 0, { r: 4, k: 0.2, c: '#8feaff' }]] },
    { id: 'lab', name: '研究ラボ', x: 30, z: 32, w: 18, d: 16, h: 5, ceil3: 'coffer',
      props: [T('研究ラボ', 'lab', 4, 12.5, 0, { kind: 'graph' }), ['tank', 5, 2, 0, { c: '#6fe' }], ['tank', 8, 2, 0, { c: '#f84' }], ['tank', 11, 2, 0, { c: '#c6f' }], ['tank', 14, 2, 0, { c: '#fd4' }], ['console', 14, 8, 3, { tall: 1, kind: 'graph' }], ['desk', 9, 9, 0, { kind: 'graph' }],
        ['medpod', 15.5, 13.5, 0], ['rack', 1, 4, 1, { n: 2 }], N('主任研究員', 'lab', 6, 9, 1.5, 0xf0f4f8), ['workbench', 9, 15.2, 2]] },
    { id: 'planet', name: 'プラネタリウム', x: -12, z: 31, w: 18, d: 18, h: 9, shape: 'round', wall: ['smooth', 0x1c2436, 0.6, 0.3], ceil: ['flat', 0x060a16], floor: ['carpet', 0x141c30, 1, 0], li: 0.35, lamp: '#6a8aff', trim: '#4a6aff',
      props: [['holo', 9, 9, 0, { kind: 'planet', s: 1.5, y: 3.6, c: '#8fb8ff' }], ['seatrow', 9, 14, 2, { n: 6, c: 0x2a2a4a }], ['seatrow', 9, 4, 0, { n: 6, c: 0x2a2a4a }], ['seatrow', 4, 9, 1, { n: 5, c: 0x2a2a4a }], ['holo', 4.4, 4.4, 0, { kind: 'x', s: 0.5, y: 1.6, c: '#c6f' }], ['holo', 4.4, 13.6, 0, { kind: 'ship', s: 0.5, y: 1.6, c: '#6fe' }]] },
    { id: 'obs', name: '大観測室', x: 7, z: 52, w: 22, d: 18, h: 9, sky: true, win: [['s', 2, 20, 0.6, 7.8]], floor: ['carpet', 0x1a3048, 1, 0], plat: [[7, 5.5, 8, 7, 0.5, 'n', 0.4]],
      props: [['telescope', 11, 9.4, 2, { y0: 0.5 }], ['console', 3, 14.5, 1.5, { tall: 1, kind: 'orbit' }], ['console', 19, 14.5, 2.5, { tall: 1, kind: 'radar' }], ['sofa', 3.4, 3.6, 0, { c: 0x2a4a6a }], ['wallscreen', 21.7, 6, 3, { w: 5, h: 2.6, y: 4, kind: 'orbit', title: '深宇宙観測' }], ['holo', 18.5, 3.6, 0, { kind: 'planet', s: 0.7, c: '#bfe9ff' }]] },
    { id: 'lib', name: '図書室', x: 29, z: 54, w: 14, d: 10, h: 4.5, wall: ['plaster', 0xf0e8d8, 0.9, 0], floor: ['parquet', 0xf0e0c8, 0.5, 0], ceil: ['plaster', 0xe0d6c4], deco: ['beams', 'wains'], lamps: 'pendant', lamp: '#ffe2b8', trims: 'none', rug: [[4, 3.4, 6, 4, 'carpet', 0x6a2a2a]],
      props: [['bookshelf', 2.4, 0.45, 0], ['bookshelf', 4.8, 0.45, 0], ['bookshelf', 7.2, 0.45, 0], ['bookshelf', 9.6, 0.45, 0], ['bookshelf', 12, 0.45, 0, { w: 2 }], ['bookshelf', 13.55, 4, 3], ['bookshelf', 13.55, 6.6, 3], ['desk', 6, 5, 2, { wood: 1 }], ['sofa', 9.5, 8.9, 2, { c: 0x5a3a2a }], ['floorlamp', 12.6, 9, 0], ['floorlamp', 1, 9, 0], N('司書', 'talk:lib', 3, 6.5, 1.2, 0x6a4a6a)] },
    { id: 'hab', name: '居住区・水耕室', x: -11, z: 54, w: 18, d: 12, h: 4.5, lamp: '#ffeedd',
      props: [['hydro', 3, 1, 0, { w: 4 }], ['hydro', 9, 1, 0, { w: 4 }], ['bed', 16.6, 3, 0], ['kitchen', 14, 11.3, 2, { w: 3.4 }], ['table', 6, 7.5, 0], ['plant', 1.2, 10.8, 0, { s: 1.3 }], ['locker', 0.6, 5.5, 1, { n: 3 }], ['fan', 8, 6, 0]] },
  ],
  doors: [['hangar', 'atrium', 18, 4, 3.5, 'glass'], ['atrium', 'lab', 40, 2.6, 2.6, 'glass'], ['atrium', 'planet', 40, 2.4, 2.6, 'slide'], ['atrium', 'obs', 18, 3, 2.8, 'glass'], ['obs', 'lib', 59, 1.8, 2.3, 'wood'], ['obs', 'hab', 60, 2, 2.4, 'slide']],
});

// ───────────────────────── 4. バスティオン要塞: 軍事施設 (防爆扉・ヴォールト通路・円形司令部・ブリーフィング室) ─────────────────────────
const bastion = () => ({
  name: 'バスティオン要塞', sub: '星系防衛軍', seed: 44, spawn: [31, 22], view: [1, 0], music: 'interior',
  theme: { wall: ['bulk', 0x6a707a, 0.75, 0.6], floor: ['plate', 0x5c6068, 0.45, 0.75], ceil: ['rib', 0x30343a], trim: '#ff5a3a', lamp: '#ffd8c8', frame: 0x1c1e22, door: 0x4a3030, amb: [0xff9a80, 0x1c1c20, 0.55], gloss: 0.6, door3: 'blast', trims: 'low', lamps: 'tube' },
  rooms: [
    { id: 'hangar', name: '戦闘機格納庫', x: 0, z: 0, w: 40, d: 30, h: 14, li: 1.5, ceil3: 'truss', deco: ['ibeam', 'cables'], win: [['n', 6, 34, 2.5, 10]],
      props: [['shipslot', 20, 14, 0, { r: 11 }], ['gantry', 20, 4.5, 0, { w: 36, at: -10 }], T('格納庫サービス', 'shipyard', 35, 25, 0), ['cargo', 4, 6, 0, { c: 0x4a5a3a }], ['cargo', 4, 20, 0, { c: 0x4a5a3a }], ['crate', 36, 5, 0, { n: 6 }], ['weaponrack', 12, 29.7, 2], ['barrel', 9, 27, 0], ['toolcart', 27, 8, 0.2, { c: 0x4a5a3a }],
        S('BASTION', 20, 29.6, 2, { h: 1.7, y: 9, c: '#ff5a3a' }), S('星系防衛軍 第 7 艦隊', 20, 29.6, 2, { h: 0.7, y: 7.1, c: '#ffd0c0' }), N('衛兵', 'talk:guard', 37.5, 12, -1.57, 0x4a5a3a)] },
    { id: 'hall', name: '保安通路', x: 40, z: 13, w: 36, d: 4.4, h: 3.5, ceil3: 'vault', floor: ['grate', 0x8a8f96, 0.6, 0.7], deco: ['cables'],
      props: [S('兵装庫', 10, 0.26, 0, { h: 0.3, y: 2.75 }), S('作戦室', 27, 0.26, 0, { h: 0.3, y: 2.75 }), S('営倉', 10, 4.14, 2, { h: 0.3, y: 2.75, c: '#ffd0c0' }), S('兵員室', 28, 4.14, 2, { h: 0.3, y: 2.75, c: '#ffd0c0' }), S('司令部 →', 33.5, 0.26, 0, { h: 0.34, y: 2.2 })] },
    { id: 'cmd', name: '戦術司令部', x: 76, z: 3.2, w: 24, d: 24, h: 8, shape: 'round', floor: ['hex', 0x4a4e56, 0.3, 0.6], win: [[-44, 44, 1.2, 5.6]], rug: [[12, 12, 0, 4, 'carpet', 0x3a1a1a]],
      props: [['holo', 12, 12, 0, { kind: 'fleet', s: 1.7, y: 2.6, c: '#ff5a3a', use: 'bounty', label: '戦術ホロ：敵艦隊' }], ['console', 8.5, 18.06, 1.667, { tall: 1, kind: 'radar' }], ['console', 15.5, 18.06, -1.667, { tall: 1, kind: 'graph' }], ['console', 15.5, 5.94, -0.333, { tall: 1, kind: 'bars' }], ['console', 8.5, 5.94, 0.333, { tall: 1, kind: 'orbit' }],
        T('任務端末', 'missions', 12, 21, 2), N('司令官', 'bounty', 16.4, 12, -1, 0x8a1c1c), ['seat', 18, 12, -1]] },
    { id: 'arm', name: '兵装庫', x: 42, z: 1, w: 16, d: 12, h: 4.2, deco: ['cables'],
      props: [['weaponrack', 3, 0.25, 0], ['weaponrack', 6.5, 0.25, 0], ['weaponrack', 13, 0.25, 0], T('兵装整備', 'shipyard', 2, 9.5, 1), ['crate', 12, 9.4, 0, { n: 6 }], ['locker', 15.5, 5.5, 3, { n: 5 }], ['rack', 0.6, 4.5, 1, { n: 2 }], N('兵器係', 'talk:arm', 6, 6, 1.2, 0x5a5a5a), ['workbench', 5.5, 11.2, 2]] },
    { id: 'brief', name: 'ブリーフィング室', x: 60, z: 1, w: 14, d: 12, h: 4.5, ceil3: 'coffer', lamps: 'spot', floor: ['carpet', 0x2a2e38, 1, 0], wall: ['smooth', 0x4a505a, 0.6, 0.4], plat: [[2, 0.5, 10, 2.6, 0.3, 's', 0.5]],
      props: [['wallscreen', 7, 0.3, 0, { w: 8, h: 2.7, y: 2.4, kind: 'radar', title: '作戦概要 — ヴォイド艦隊掃討' }], ['seatrow', 7, 6, 2, { n: 8, c: 0x3a2a2a }], ['seatrow', 7, 8, 2, { n: 8, c: 0x3a2a2a }], ['seatrow', 7, 10, 2, { n: 8, c: 0x3a2a2a }], ['console', 11.5, 1.9, 2, { kind: 'data', y0: 0.3 }], N('作戦参謀', 'talk:staff', 4, 1.9, 2, 0x6a2a2a, { y0: 0.3 })] },
    { id: 'brig', name: '営倉', x: 42, z: 17.4, w: 16, d: 9, h: 3.6,
      props: [['cell', 3, 2, 0], ['cell', 8, 2, 0], ['cell', 13, 2, 0], N('捕虜の海賊', 'talk:prisoner', 8, 1.6, 0, 0x5a2a6a, { visor: '#f4c' }), ['console', 13, 7.2, 2, { kind: 'data' }], ['locker', 3, 8.5, 2, { n: 3 }]] },
    { id: 'mess', name: '兵員室', x: 60, z: 17.4, w: 16, d: 10, h: 4,
      props: [['bunk', 1.2, 2.2, 0], ['bunk', 3.6, 2.2, 0], ['bunk', 6, 2.2, 0], ['kitchen', 13, 0.6, 0, { w: 3.4 }], ['tablelong', 11, 6.4, 0, { w: 3.2 }], ['medpod', 1.6, 8, 1], ['fan', 8, 5, 0], ['poster', 15.75, 6, 3, { text: '星系を守れ', c: '#ff5a3a', h: 0.9 }]] },
  ],
  doors: [['hangar', 'hall', 15.2, 2.4, 2.6, 'blast'], ['hall', 'cmd', 15.2, 2.6, 2.6, 'blast'], ['hall', 'arm', 50, 2.2, 2.4, 'slide'], ['hall', 'brief', 67, 2.2, 2.4, 'slide'], ['hall', 'brig', 50, 2.2, 2.4, 'blast'], ['hall', 'mess', 68, 2.2, 2.4, 'slide']],
});

// ───────────────────────── 5. ローグズ・デン: 洞窟とネオン (岩肌・中二階のある酒場・円形カジノ・闇市の路地) ─────────────────────────
const rogue = () => ({
  name: 'ローグズ・デン', sub: '無法者の巣', seed: 55, spawn: [29, 21], view: [1, 0], music: 'neon',
  theme: { wall: ['rock', 0x7a685c, 1, 0.05], floor: ['concrete', 0x5a5a62, 0.38, 0.25], ceil: ['rock', 0x3a3430], trim: '#ff4df0', lamp: '#ffd0f0', frame: 0x2a2228, door: 0x503848, amb: [0xa060c0, 0x241a24, 0.6], gloss: 1.1, door3: 'hatch', trims: 'neon', ribs: false, lamps: 'bare', cstyle: 'rock', beam: 0x3a2a20 },
  rooms: [
    { id: 'hangar', name: '洞窟ドック', x: 0, z: 0, w: 38, d: 28, h: 13, li: 1.6, deco: ['boulders', 'stal'], win: [['n', 8, 30, 2.5, 8]],
      props: [['shipslot', 19, 13, 0, { r: 10.5 }], T('格納庫サービス', 'shipyard', 33, 23.5, 0, { c: '#4df0ff' }), ['cargo', 5, 7, 0], ['cargo', 5, 14, 0.1], ['crate', 33, 6, 0, { n: 6 }], ['barrel', 29, 4, 0], ['barrel', 6, 23, 0], ['crate', 10, 24, 0, { n: 4 }],
        S("ROGUE'S DEN", 19, 27.6, 2, { h: 1.6, y: 8.5, frame: 1 }), S('酒 · 賭場 · 闇市 →', 37.7, 15.5, 3, { h: 0.7, y: 4.2, c: '#4df0ff', flicker: 1 }), N('用心棒', 'talk:thug', 35, 14.5, -1.57, 0x3a2a2a, { visor: '#f43' }), ['steam', 12, 6, 0], ['steam', 26, 22, 0]] },
    { id: 'bar', name: 'バー「ネビュラ」', x: 38, z: 2, w: 22, d: 18, h: 5.5, wall: ['brick', 0x8a5a48, 1, 0], floor: ['wood', 0x8a7a70, 0.3, 0.1], ceil: ['wood', 0x4a3428], ceil3: 'flat', nobeam: 1, deco: ['beams', 'lanterns'], lamps: 'lantern', lamp: '#ff9ad8', plat: [[13.8, 10.2, 7.8, 7.4, 1.1, 'w', 0.4]],
      props: [['barcounter', 9, 2.4, 0, { w: 8, c: '#ff4df0' }], N('バーテンダー', 'bar', 9, 1.3, 0, 0x2a2a3a, { visor: '#4df0ff' }), ['stage', 4.4, 14, 0, { c: '#4df0ff' }], ['table', 4.6, 8, 0, { wood: 1, c: '#ff4df0' }], ['pooltable', 9.5, 10.5, 0], ['sofa', 20.4, 13.9, 3, { c: 0x6a1a4a, y0: 1.1 }], ['table', 17.4, 13.9, 0, { wood: 1, n: 0, c: '#ffe14d', y0: 1.1 }], ['floorlamp', 20.6, 16.6, 0, { c: '#ff4df0', y0: 1.1 }],
        ['arcade', 21.4, 4, 3], ['arcade', 21.4, 6, 3, { c: '#f4c', title: 'NEON RUN' }], S('BAR NEBULA', 9, 0.3, 0, { h: 0.7, y: 4.3, frame: 1 }), S('酒', 21.7, 8.6, 3, { h: 1.1, y: 3.6, c: '#4df0ff', flicker: 1 }), N('常連客', 'talk:drunk', 6.2, 8, 2, 0x6a5a2a), ['fan', 12, 9, 0, { wood: 1, sp: 1.2 }]] },
    { id: 'casino', name: 'カジノ', x: 60, z: 2, w: 18, d: 18, h: 7.5, shape: 'round', wall: ['padded', 0x7a1420, 0.9, 0], floor: ['casino-floor', 0xd8d0d0, 1, 0], ceil: ['flat', 0x3a2a14], lamps: 'chandelier', trim: '#ffe14d', lamp: '#ffe8a0', win: [[-36, 36, 1, 4.6]], rug: [[9, 9, 0, 3.4, 'carpet', 0x8a6a1a]],
      props: [['slot', 12, 14.2, -1.667], ['slot', 6, 14.2, 1.667], ['slot', 6, 3.8, 0.333], ['slot', 12, 3.8, -0.333], ['slot', 9, 15.2, 2], ['slot', 9, 2.8, 0], N('ディーラー', 'talk:dealer', 9, 9, -1, 0x8a1420, { visor: '#ffe14d' }), ['hoload', 9, 9, 1, { text: 'JACKPOT', c: '#ffe14d', y: 4.2, h: 0.8 }], ['plant', 14.6, 5, 0, { s: 1.2, dark: 1 }], ['plant', 14.6, 13, 0, { s: 1.2, dark: 1 }]] },
    { id: 'alley', name: '闇市の路地', x: 40, z: 20, w: 6, d: 22, h: 4.2, wall: ['brick', 0x5a4038, 1, 0], floor: ['cobble-fan', 0x9a9088, 0.85, 0], ceil3: 'flat', nobeam: 1, deco: ['lanterns', 'cables'], lamps: 'lantern', lamp: '#ffb080',
      props: [['stall', 1.2, 4.6, 1, { c: 0x5a2a6a, use: 'market', label: '闇市' }], ['stall', 1.2, 10, 1, { c: 0x2a5a6a }], ['stall', 1.2, 15.4, 1, { c: 0x6a5a2a }], ['crate', 4.8, 7.4, 0, { n: 3 }], ['barrel', 4.9, 13, 0], N('情報屋', 'broker', 3, 20.4, 2, 0x2a2a2a, { visor: '#f43' }), T('任務端末', 'missions', 5.2, 18, 3, { c: '#4df0ff' }), S('闇市', 3, 21.7, 2, { h: 0.8, y: 3.2, c: '#ff5a3a', flicker: 1 }), ['steam', 4.6, 3, 0]] },
    { id: 'hide', name: '隠れ家', x: 46, z: 30, w: 10, d: 9, h: 3.4, floor: ['carpet', 0x3a2a2a, 1, 0], deco: ['boulders'], nobeam: 1,
      props: [['bunk', 8.8, 2, 0], ['bunk', 8.8, 6, 0, { use: false }], ['table', 4, 5, 0, { wood: 1, n: 3 }], ['locker', 3.5, 0.5, 0, { n: 3 }], ['poster', 5, 8.75, 2, { text: 'WANTED\n賞金 50,000', c: '#ffe14d', h: 1.0 }], ['cabinet', 0.5, 6.5, 1, { w: 1.4 }], ['floorlamp', 1, 1.2, 0, { c: '#ff9ad8' }]] },
  ],
  doors: [['hangar', 'bar', 11, 3, 2.8, 'hatch'], ['bar', 'casino', 11, 2.6, 2.6, 'hatch'], ['bar', 'alley', 43, 2.2, 2.5, 'open'], ['alley', 'hide', 34.5, 1.8, 2.3, 'hatch']],
});

// ───────────────────────── 主人公機の船内 (3 隻とも構造が異なる) ─────────────────────────
const hayate = () => ({
  name: 'ハヤテ 船内', sub: '高機動迎撃機', seed: 61, spawn: [1.75, 3.5, 0], view: [0, -1], music: 'interior',
  theme: { wall: ['smooth', 0xc4cad2, 0.6, 0.3], floor: ['ship-floor', 0x9aa0a8, 0.5, 0.7], ceil: ['rib', 0x6a7078], trim: '#ff8a2a', lamp: '#fff0e0', amb: [0xffe0c0, 0x34383c, 0.8], gloss: 0.5, door3: 'hatch', trims: 'low', lamps: 'tube', deco: ['cables'] },
  rooms: [
    { id: 'cockpit', name: 'コックピット', x: 0, z: 0, w: 5, d: 5, h: 2.5, deco: [], win: [['n', 0.5, 4.5, 1.0, 2.2], ['w', 0.5, 3.6, 1.1, 2.15], ['e', 0.5, 3.6, 1.1, 2.15]],
      props: [['seat', 2.5, 2.2, 2, { use: 'pilot', label: '操縦席に座る', c: 0x3a2418 }], ['console', 2.5, 0.75, 0, { kind: 'radar' }], ['console', 0.75, 4.1, 1, { kind: 'graph' }], ['console', 4.25, 4.1, 3, { kind: 'bars' }]] },
    { id: 'cabin', name: 'キャビン', x: 0, z: 5, w: 5, d: 6.5, h: 2.5, wall: ['padded-wall', 0xe8e8e8, 0.8, 0.1], rug: [[1.6, 1.6, 1.8, 3.4, 'carpet', 0xc05a1a]],
      props: [['bed', 0.9, 2.2, 0, { c: 0xc05a1a }], ['locker', 4.45, 1.5, 3, { n: 2 }], ['kitchen', 4.35, 4.3, 3, { w: 1.8 }], T('船体状況', 'status', 1.0, 5.4, 1, { kind: 'graph' }), ['poster', 0.25, 4.3, 1, { text: '疾風', c: '#ff8a2a', h: 0.7, y: 1.7 }]] },
    { id: 'bay', name: '機材ベイ', x: 0, z: 11.5, w: 5, d: 4.5, h: 2.5, floor: ['grate', 0x8a8f96, 0.6, 0.7],
      props: [['rack', 0.6, 1.4, 1, { n: 1 }], ['pipes', 4.7, 1.6, 3], ['crate', 1.2, 3.4, 0, { n: 2 }], ['exit', 2.5, 4.3, 2, { label: 'エアロックから出る' }]] },
  ],
  doors: [['cockpit', 'cabin', 2.5, 1.5, 2.15], ['cabin', 'bay', 2.5, 1.5, 2.15]],
});

// ライデン (重装ガンシップ) の船内。広さは以前と同じ範囲 (x -4〜13, z 0〜37、北 = 機首)。設計図は docs/raiden-interior.md
// 部屋は 1 つずつ手で置いた: 機首のキャノピーと一段下がった艦橋、右舷の通信室は艦橋の横扉から、左舷の砲塔は梯子のある前室から入る。
// 中央通路は途中で東へ広がり、狭い洗面所や物置は角に押し込んだ。炉は機関室の右舷に別の区画として張り出す
const RM = (n, fb, c, r = 0.7, me = 0.4) => (hasImage('materials/' + n) ? [n, 0xffffff, r, me] : [fb, c, r, me]); // rd- の画像が無いあいだは代わりの素材
const raiden = () => ({
  name: 'ライデン 船内', sub: '重装ガンシップ', seed: 62, spawn: [4.6, 6.4, 0], view: [0, -1], music: 'interior',
  theme: { wall: RM('rd-corridor-wall', 'bulk', 0x565c64, 0.75, 0.6), floor: RM('rd-corridor-floor', 'grate', 0x8a8f96, 0.6, 0.7), ceil: RM('rd-corridor-ceil', 'rib', 0x34383e), trim: '#ff3b2a', lamp: '#ffc8b0', frame: 0x16181c, door: 0x4a2a2a, amb: [0xff8060, 0x18181c, 0.5], gloss: 0.35, door3: 'hatch', trims: 'low', lamps: 'tube' },
  rooms: [
    // 機首のキャノピー: 操縦席は中心線より左、右に副操縦の小卓。三方が窓
    { id: 'canopy', name: 'キャノピー', x: 2.2, z: 0, w: 4, d: 2.2, h: 2.7, floor: RM('rd-bridge-floor', 'ship-floor', 0x8a8e96, 0.45, 0.7), wall: RM('rd-canopy-frame', 'bulk', 0x3a3e46, 0.5, 0.7), ceil: RM('rd-ceiling-bridge', 'rib', 0x2c3036), lamps: 'spot', trims: 'low',
      win: [['n', 0.3, 3.7, 0.85, 2.4], ['w', 0.3, 1.9, 1.0, 2.3], ['e', 0.3, 1.9, 1.0, 2.3]],
      props: [['console', 1.5, 0.45, 0, { kind: 'radar' }], ['seat', 1.5, 1.35, 2, { use: 'pilot', label: '操縦席に座る', c: 0x3a1414 }], ['console', 3.25, 0.5, 0, { kind: 'bars', c: '#ff3b2a' }], ['picwall', 1.5, 0.08, 0, { img: 'rd-pilot-console', w: 1.6, h: 0.36, y: 0.5, glow: 0.6 }], ['picwall', 1.5, 0.3, 0, { img: 'rd-hud-glass', w: 0.8, h: 0.45, y: 1.5, glow: 0.9 }]] }, // 操縦席の前にヘッドアップディスプレイ
    // 艦橋: 右舷に兵装士官の壇、左舷に航法席、後ろ寄りに戦術台。南西の扉から前室へ、東の扉から通信室へ
    { id: 'bridge', name: '艦橋', x: 0, z: 2.2, w: 9, d: 5.2, h: 3.4, floor: RM('rd-bridge-floor', 'ship-floor', 0x8a8e96, 0.45, 0.7), wall: RM('rd-bridge-wall', 'bulk', 0x4a4f58, 0.6, 0.6), ceil: RM('rd-ceiling-bridge', 'rib', 0x2c3036), lamps: 'spot', trims: 'both',
      win: [['w', 0.4, 2.4, 1.2, 2.7]], plat: [[5.7, 0.35, 3.0, 2.2, 0.4, 'w', 0.8]],
      props: [['seat', 7.2, 1.55, 2, { c: 0x3a1414, y0: 0.4 }], ['console', 7.2, 0.7, 0, { kind: 'bars', c: '#ff3b2a', y0: 0.4 }], ['picwall', 8.8, 1.4, 3, { img: 'rd-gunner-console', w: 1.3, h: 0.85, y: 2.15, glow: 0.6 }],
        ['console', 0.75, 2.4, 1, { tall: 1, kind: 'radar' }], ['seat', 1.75, 2.4, 3, { c: 0x22262c }], T('星図', 'map', 0.3, 4.3, 1, { kind: 'orbit' }),
        ['holotable', 6.3, 3.7, 0, { r: 0.8, c: '#ff3b2a' }], ['pictop', 6.3, 3.7, 0, { img: 'rd-tactical-table', w: 1.1, d: 1.1, h: 1.0, glow: 0.7, only: 1 }],
        ['picwall', 4.6, 5.0, 2, { img: 'rd-warning-panel', w: 0.8, h: 0.6, y: 1.8, glow: 0.5 }], ['locker', 7.9, 4.95, 2, { n: 2 }]] },
    // 通信・電子戦室: 艦橋の東の扉から。細長く、東の壁に機器と小さな丸窓
    { id: 'ecm', name: '通信・電子戦室', x: 9, z: 3, w: 3.4, d: 6.2, h: 2.7, lamp: '#ffd0b8', lamps: 'spot', win: [['e', 0.7, 1.7, 1.3, 2.0]],
      props: [['rack', 3.05, 4.9, 3, { n: 1 }], ['console', 2.95, 3.0, 3, { kind: 'data', c: '#ff3b2a' }], ['seat', 2.05, 3.0, 1, { c: 0x22262c }], ['picwall', 3.2, 0.6, 3, { img: 'rd-target-screen', w: 0.9, h: 0.6, y: 1.9, glow: 0.8 }], ['picwall', 1.7, 6.0, 2, { img: 'rd-warning-panel', w: 0.7, h: 0.5, y: 1.8, glow: 0.5 }]] },
    // 前室: 艦橋の南西。背面上部の砲塔へ上る梯子、宇宙服のロッカー
    { id: 'vest', name: '前室', x: -1, z: 7.4, w: 4.6, d: 2.8, h: 3.6, ceil3: 'flat',
      props: [['ladder', 4.4, 1.0, 3], ['picwall', 4.4, 2.2, 3, { img: 'rd-ready-board', w: 0.9, h: 0.8, y: 1.6 }], ['locker', 0.7, 0.3, 0, { n: 1 }], ['floorpic', 1.0, 2.0, 0, { img: 'rd-hatch-floor', w: 0.9, d: 0.9, metal: 0.5 }]] },
    // 砲塔管制室: 前室の西。細長い部屋の奥に照準器、壁際に弾の送り込み装置
    { id: 'gun', name: '砲塔管制室', x: -3.6, z: 6, w: 2.6, d: 5.5, h: 2.6, wall: RM('rd-armory-wall', 'bulk', 0x50545c, 0.7, 0.6), floor: RM('rd-gunnery-floor', 'grate', 0x7a7e86, 0.6, 0.7), lamp: '#ff9a80', lamps: 'spot',
      props: [['console', 1.3, 0.5, 0, { kind: 'radar', c: '#ff3b2a' }], ['seat', 1.3, 1.45, 2, { c: 0x3a1414 }], ['picwall', 1.3, 0.2, 0, { img: 'rd-gun-sight', w: 1.4, h: 0.8, y: 1.9, glow: 1.0 }],
        ['picfurn', 0.4, 4.3, 1, { img: 'rd-shell-feed', w: 1.2, h: 1.8, d: 0.6, metal: 1 }], ['picwall', 1.3, 5.3, 2, { img: 'rd-turret-controls', w: 0.9, h: 0.9, y: 1.5, glow: 0.5 }], ['picwall', 0.2, 2.6, 1, { img: 'rd-target-screen', w: 1.0, h: 0.6, y: 1.8, glow: 0.7 }]] },
    // 中央通路 (前): 幅 2.4m の細い通路
    { id: 'spineA', name: '中央通路', x: 1.2, z: 10.2, w: 2.4, d: 5.8, h: 2.8, ceil3: 'vault', deco: ['cables'],
      props: [['band', 2.2, 4.2, 3, { img: 'rd-pipe-wall', w: 2.4, h: 0.9, y: 2.1, rep: 0.5 }], ['firstaid', 0.2, 5.0, 1]] },
    // 兵装庫: 通路の西。北と西の壁に銃架、南の壁際に弾薬箱と防弾服のロッカー
    { id: 'arm', name: '兵装庫', x: -3, z: 11.5, w: 4.2, d: 5.5, h: 2.7, wall: RM('rd-armory-wall', 'bulk', 0x50545c, 0.7, 0.6),
      props: [['weaponrack', 1.9, 0.25, 0], ['weaponrack', 0.25, 3.2, 1], ['picwall', 3.75, 0.2, 0, { img: 'rd-rifle-rack', w: 0.8, h: 1.1, y: 1.5 }], ['picfurn', 1.3, 5.05, 2, { img: 'rd-ammo-crates', w: 1.4, h: 0.9, d: 0.8, metal: 1 }],
        ['picfurn', 2.8, 5.2, 2, { img: 'rd-armor-locker', w: 0.9, h: 1.9, d: 0.5, metal: 1 }], T('弾薬補給', 'ammo', 3.9, 4.4, 3)] },
    // 兵員室: 天井の低い寝室。二段ベッドは南の壁に沿って横向き
    { id: 'crew', name: '兵員室', x: 3.6, z: 10.2, w: 5.8, d: 4.4, h: 2.5, lamp: '#ffe0c8', lamps: 'pendant', floor: ['ship-floor', 0x8a8e96, 0.5, 0.6], wall: RM('rd-crew-wall', 'padded-wall', 0xc8c8c8, 0.8, 0.1),
      props: [['bunk', 2.4, 3.6, 1, { fab: 'rd-bunk-blanket' }], ['bunk', 4.5, 3.6, 1, { use: false, fab: 'rd-bunk-blanket' }], ['picfurn', 3.0, 0.3, 0, { img: 'rd-crew-locker', w: 1.8, h: 1.9, d: 0.5, metal: 1 }], ['picwall', 1.1, 0.2, 0, { img: 'rd-patch-board', w: 0.8, h: 0.8, y: 1.6 }],
        ['poster', 4.9, 0.2, 0, { text: '雷電', c: '#ff3b2a', h: 0.5, y: 1.8 }], ['picwall', 0.2, 3.3, 1, { img: 'rd-crew-photo', w: 0.7, h: 0.5, y: 1.5, frame: 1 }]] },
    // 洗面所: 兵員室の奥 (東)
    { id: 'head', name: '洗面所', x: 9.4, z: 10.2, w: 3, d: 3.2, h: 2.4, wall: RM('mg-wall-bath', 'porcelain', 0xd8e8f0, 0.3, 0.1), floor: RM('mg-floor-bath', 'porcelain', 0xe0e6ea, 0.3, 0.1), lamps: 'spot', lamp: '#f4f8ff',
      props: [['washbasin', 1.3, 0.25, 0], ['shower', 2.45, 0.55, 0, { curtain: 1 }], ['toilet', 2.65, 2.6, 3]] },
    // 医務室: 広がった通路の西
    { id: 'med', name: '医務室', x: -2.2, z: 17, w: 3.4, d: 4.4, h: 3.0, wall: RM('rd-medbay-wall', 'padded-wall', 0xd8dde2, 0.6, 0.1), floor: ['ship-floor', 0xa8acb2, 0.4, 0.5], lamp: '#f0fff8',
      props: [['medpod', 1.5, 3.1, 0], ['firstaid', 1.7, 0.2, 0], ['tank', 0.55, 0.9, 0, { c: '#6dffb0' }], ['picfurn', 0.4, 2.0, 1, { img: 'rd-med-scanner', w: 1.0, h: 1.8, d: 0.6, metal: 1, glow: 0.4 }]] },
    // 中央通路 (後): 東へ 1.4m 広がり、壁際にベンチ。医務室・物置・食堂・機関室へ
    { id: 'spineB', name: '中央通路 (後部)', x: 1.2, z: 16, w: 3.8, d: 7.4, h: 3.2, ceil3: 'vault', deco: ['cables'],
      props: [['bench', 3.45, 1.4, 3, { c: 0x4a2a2a }], ['band', 0.2, 4.6, 1, { img: 'rd-power-conduit', w: 2.2, h: 0.8, y: 2.3, rep: 0.5 }], ['floorpic', 2.2, 6.6, 0, { img: 'rd-deck-marking', w: 1.4, d: 1.0, metal: 0.4 }], ['exitsign', 3.6, 7.2, 2]] },
    // 食堂: 通路から大きく開いた部屋。北の壁に厨房、真ん中に長机
    { id: 'mess', name: '食堂', x: 5, z: 15, w: 6.8, d: 6, h: 2.9, lamp: '#ffe0c8', lamps: 'pendant', wall: RM('rd-crew-wall', 'padded-wall', 0xc8c8c8, 0.8, 0.1),
      props: [['kitchen', 4.6, 0.4, 0, { w: 3.0 }], ['picwall', 4.6, 0.2, 0, { img: 'rd-galley', w: 3.0, h: 0.9, y: 2.0 }], ['tablelong', 3.6, 3.4, 0, { w: 3.0, bare: 1, topImg: 'rd-mess-table' }], ['vending', 6.45, 1.9, 3]] },
    // 物置: 通路の南西の角。予備の箱と非常用ロッカー
    { id: 'store', name: '物置', x: -1.4, z: 21.4, w: 2.6, d: 2, h: 2.3,
      props: [['boxes', 0.45, 0.95, 1, { n: 2 }], ['picfurn', 1.6, 0.25, 0, { img: 'rd-emergency-locker', w: 0.8, h: 1.6, d: 0.4, metal: 1 }]] },
    // 機関室: 左舷に 2 基のタービン、北東の角に計器の壇。東は炉の区画へ大きく開く
    { id: 'eng', name: '機関室', x: -3.6, z: 23.4, w: 12, d: 7.2, h: 6.6, deco: ['ibeam', 'cables'], floor: RM('rd-engine-floor', 'plate', 0x6a6e76, 0.5, 0.7), wall: RM('rd-engine-wall', 'engine-pipes', 0xb0b4ba, 0.8, 0.5), plat: [[8.6, 0.3, 3.2, 2.0, 0.9, 'w', 0.6]],
      props: [['picfurn', 0.8, 2.3, 1, { img: 'rd-turbine', w: 2.6, h: 2.8, d: 1.4, metal: 1 }], ['picfurn', 0.7, 5.4, 1, { img: 'rd-turbine', w: 2.0, h: 2.2, d: 1.2, metal: 1 }], ['console', 10.2, 0.75, 0, { kind: 'graph', y0: 0.9 }],
        ['band', 3.6, 0.2, 0, { img: 'rd-power-conduit', w: 3.6, h: 0.8, y: 3.4, rep: 0.5 }], ['picwall', 5.0, 0.2, 0, { img: 'rd-heat-vent', w: 1.4, h: 1.0, y: 5.2, glow: 1.0 }], ['picwall', 9.4, 7.0, 2, { img: 'rd-coolant-panel', w: 1.1, h: 0.9, y: 1.6, glow: 0.4 }],
        ['picwall', 10.9, 7.0, 2, { img: 'rd-engine-gauges', w: 1.2, h: 0.9, y: 1.7, glow: 0.5 }], T('船体状況', 'status', 2.4, 6.95, 2, { kind: 'graph' }), ['steam', 4.4, 4.0, 0], ['rack', 11.6, 3.0, 3, { n: 1 }]] },
    // 炉の区画: 機関室の東。高い天井の下に炉。南の壁に炉心の覗き窓
    { id: 'core', name: '炉区画', x: 8.4, z: 22.6, w: 4.6, d: 8, h: 7.2, deco: ['ibeam'], floor: RM('rd-catwalk-grate', 'grate', 0x6a6e76, 0.5, 0.7), wall: RM('rd-engine-wall', 'engine-pipes', 0xb0b4ba, 0.8, 0.5), lamp: '#ffb070',
      props: [['reactor', 2.3, 2.5, 0, { c: '#ff9a3a' }], ['picwall', 2.3, 7.8, 2, { img: 'rd-reactor-core', w: 2.0, h: 2.0, y: 3.2, glow: 0.9 }], ['picwall', 4.4, 6.2, 3, { img: 'rd-warning-panel', w: 0.7, h: 0.5, y: 1.7, glow: 0.5 }]] },
    // 格納庫: 機関室の南。入口は左寄り、出口のランプは右寄り。南の壁沿いにコンテナ
    { id: 'cargo', name: '格納庫', x: -2.4, z: 30.6, w: 13.6, d: 6.4, h: 4.6, floor: RM('rd-cargo-floor', 'plate', 0x6a6e76, 0.5, 0.7), wall: RM('rd-cargo-wall', 'cargo-net', 0xc8c8c8, 0.8, 0.4),
      props: [['cargo', 3.0, 5.1, 1, { c: 0x4a5a3a }], ['picfurn', 13.0, 1.4, 3, { img: 'rd-strap-crates', w: 2.0, h: 1.4, d: 1.2, metal: 0.6 }], ['crate', 12.6, 3.9, 0, { n: 4 }], ['barrel', 7.6, 0.9, 0], ['toolcart', 1.1, 1.0, 0.3],
        ['picfurn', 10.6, 0.5, 0, { img: 'rd-fuel-cells', w: 1.8, h: 1.6, d: 0.7, metal: 1, glow: 0.3 }], ['floorpic', 9.2, 3.6, 0, { img: 'rd-tie-down', w: 3.0, d: 2.0, metal: 0.5 }], ['picwall', 11.2, 6.2, 2, { img: 'rd-airlock-panel', w: 0.7, h: 0.9, y: 1.4, glow: 0.6 }], ['picwall', 0.2, 2.0, 1, { img: 'rd-cargo-net', w: 2.6, h: 2.2, y: 1.8 }], ['picwall', 7.6, 0.2, 0, { img: 'rd-loader-arm', w: 1.8, h: 1.6, y: 2.9 }],
        ['exit', 9.2, 6.2, 2, { label: 'エアロックから出る', w: 2.6, img: 'rd-ramp-door' }]] },
  ],
  doors: [['canopy', 'bridge', 4.6, 3.0, 2.4, 'open'], ['bridge', 'ecm', 5.6, 1.4, 2.2, 'slide'], ['bridge', 'vest', 1.6, 1.6, 2.3], ['vest', 'gun', 8.6, 1.4, 2.2], ['vest', 'spineA', 2.4, 2.0, 2.4, 'open'],
    ['spineA', 'arm', 13.0, 1.5, 2.2], ['spineA', 'crew', 11.6, 1.4, 2.2, 'slide'], ['crew', 'head', 12.4, 1.0, 2.1, 'slide'], ['spineA', 'spineB', 2.4, 2.2, 2.6, 'open'],
    ['spineB', 'med', 18.6, 1.6, 2.2, 'slide'], ['spineB', 'mess', 19.4, 1.8, 2.4, 'open'], ['spineB', 'store', 22.4, 1.0, 2.0], ['spineB', 'eng', 3.4, 1.8, 2.3, 'blast', { mat: 'rd-bulkhead-door' }], ['eng', 'core', 27.6, 3.0, 3.2, 'open'], ['eng', 'cargo', 1.6, 2.6, 2.5, 'blast', { mat: 'rd-bulkhead-door' }]],
});

const amatsu = () => ({
  name: 'アマツ 船内', sub: '長距離探査船', seed: 63, spawn: [6, 5.3, 0], view: [0, -1], music: 'interior',
  theme: { wall: ['smooth', 0xf4f1ea, 0.45, 0.1], floor: ['wood', 0xffffff, 0.4, 0], ceil: ['ceil', 0xd8d4cc], trim: '#35e0c8', lamp: '#fff6e6', frame: 0x8a7a5a, door: 0xd8c8a8, amb: [0xfff0d8, 0x645c4c, 0.95], gloss: 0.7, door3: 'glass', trims: 'low', ribs: false, lamps: 'pendant', shade: 0xd4a84a },
  rooms: [
    { id: 'bridge', name: '展望艦橋', x: 0, z: 0, w: 12, d: 10, h: 4.5, sky: true, lamps: 'panel', win: [['n', 1, 11, 0.7, 4], ['w', 1, 8.5, 0.7, 4], ['e', 1, 8.5, 0.7, 4]],
      props: [['seat', 6, 3.6, 2, { use: 'pilot', label: '操縦席に座る', c: 0xe8e0d0 }], ['console', 6, 1.5, 0, { kind: 'orbit' }], ['console', 2.4, 3, 0.6, { kind: 'graph' }], ['console', 9.6, 3, -0.6, { kind: 'radar' }], ['holo', 6, 7.4, 0, { kind: 'system', s: 0.75, y: 1.7, use: 'map', label: '星図を開く' }], ['plant', 1.1, 9, 0], ['plant', 10.9, 9, 0]] },
    { id: 'lounge', name: 'ラウンジ', x: 0, z: 10, w: 12, d: 12, h: 3.6, ceil3: 'coffer', lamps: 'spot', rug: [[3.4, 5.4, 5.6, 5, 'carpet', 0x2a6a6a]],
      props: [['sofa', 6, 9.8, 2, { c: 0xd8c8a8, w: 3.4 }], ['sofa', 3.0, 7.0, 1, { c: 0xd8c8a8 }], ['table', 6, 7.4, 0, { wood: 1, n: 0 }], ['aquarium', 0.8, 9.6, 1, { w: 3.4 }], ['barcounter', 8.6, 2.2, 0, { w: 3.2, c: '#35e0c8' }], ['piano', 9.6, 8, -0.4], ['floorlamp', 11, 11.2, 0], ['wallscreen', 4, 11.7, 2, { w: 3, h: 1.4, y: 2.2, kind: 'orbit', title: '航路' }]] },
    { id: 'garden', name: '船内庭園', x: 12, z: 8, w: 11, d: 14, h: 5.5, sky: true, lamps: 'panel', floor: ['grass', 0x8ac060, 1, 0], lamp: '#f4ffe8',
      props: [['tree', 3, 3.4, 0], ['tree', 7.6, 11, 0, { s: 0.9 }], ['fountain', 6, 7, 0, { r: 1.2 }], ['planter', 10.3, 5, 1, { w: 7, flowers: 1 }], ['hydro', 2.2, 12.6, 2, { w: 3, use: 'harvest', label: '野菜を収穫する' }], ['bench', 2.2, 8, 1, { c: 0x6a8a4a }], ['lightcone', 6, 7, 0, { r: 3, k: 0.22 }]] },
    { id: 'lab', name: '分析室', x: -10, z: 10, w: 10, d: 9, h: 3.4, floor: ['hex', 0xe2ebf2, 0.28, 0.3], lamps: 'panel',
      props: [['tank', 1.6, 1.5, 0, { c: '#6fe' }], ['tank', 3.6, 1.5, 0, { c: '#fd4' }], ['console', 7, 1.2, 0, { tall: 1, kind: 'graph' }], ['desk', 6.5, 6.5, 2], T('標本分析', 'lab', 1.5, 6.5, 1, { kind: 'graph' }), ['rack', 9.3, 7.6, 3, { n: 2 }]] },
    { id: 'cabin', name: '船長室', x: -10, z: 19, w: 10, d: 7, h: 3.2, floor: ['carpet', 0x2a4a5a, 1, 0], wall: ['wood', 0xd8c0a0, 0.7, 0], deco: ['wains'], lamp: '#ffe2b8',
      props: [['bed', 1.2, 3.6, 0, { c: 0x2a7a6a }], ['desk', 6.5, 1.3, 0, { wood: 1 }], ['bookshelf', 3.6, 0.45, 0, { w: 2 }], ['plant', 9, 6, 0, { s: 1.2 }], ['cabinet', 9.4, 3.6, 3], ['wallscreen', 4.5, 6.75, 2, { w: 2.6, h: 1.3, y: 1.9, kind: 'orbit', title: '航海日誌' }], T('船体状況', 'status', 0.9, 0.9, 0.5, { kind: 'graph' }), ['floorlamp', 2.6, 6.2, 0]] },
    { id: 'cargo', name: '貨物室', x: 0, z: 22, w: 12, d: 9, h: 4.5, floor: ['plate', 0x9aa2ad, 0.5, 0.6], wall: ['cargo-net', 0xc8ccd0, 0.7, 0.3], lamps: 'tube',
      props: [['cargo', 2.2, 4, 0, { c: 0x2e7ab8 }], ['crate', 9.5, 2.5, 0, { n: 5 }], ['crate', 9.5, 6.5, 0, { n: 3 }], ['exit', 6, 8.8, 2, { label: 'エアロックから出る', w: 2.6, c: '#35e0c8' }]] },
  ],
  doors: [['bridge', 'lounge', 6, 2, 2.5, 'glass'], ['lounge', 'garden', 15, 2, 2.5, 'glass'], ['lounge', 'lab', 14, 1.8, 2.3, 'glass'], ['lab', 'cabin', -5, 1.6, 2.2, 'wood'], ['lounge', 'cargo', 6, 2.6, 2.5, 'slide']],
});

// ───────────────────────── 惑星拠点 (5 か所とも様式が異なる) ─────────────────────────
const OUT = {
  terra: () => ({
    name: 'ネオン・ベイ・ターミナル', sub: '地球・宇宙港', seed: 71, spawn: [11, 12.5, 0], music: 'neon',
    theme: { wall: ['smooth', 0x2c3444, 0.4, 0.5], floor: ['tile', 0x2c3038, 0.1, 0.5], ceil: ['ceil', 0x20242c], trim: '#ff3df0', lamp: '#cfe0ff', frame: 0x14161c, amb: [0x6080ff, 0x24182e, 0.75], gloss: 1.4, door3: 'glass', trims: 'neon', ribs: false, lamps: 'spot', cstyle: 'coffer', col: 0x1a1e2a },
    rooms: [
      { id: 'lobby', name: '到着ロビー', x: 0, z: 0, w: 22, d: 16, h: 7, win: [['n', 2, 20, 0.5, 6.2]], deco: ['columns'],
        props: [T('交易所', 'market', 19.5, 3.5, 3, { c: '#4df0ff' }), ['seatrow', 7, 8, 0, { n: 5, c: 0x2a2a5a }], ['seatrow', 7, 9.2, 2, { n: 5, c: 0x2a2a5a }], ['seatrow', 15, 8, 0, { n: 5, c: 0x2a2a5a }], ['seatrow', 15, 9.2, 2, { n: 5, c: 0x2a2a5a }], ['vending', 21.3, 12, 3], ['vending', 21.3, 13.3, 3, { c: '#f4c', title: 'SNACK' }],
          ['hoload', 11, 4, 0, { text: '到着 ARRIVALS', c: '#4df0ff', y: 4.4, h: 0.9 }], S('NEON BAY', 11, 0.3, 0, { h: 0.9, y: 6.2, c: '#4df0ff', frame: 1 }), ['plant', 1.2, 14.6, 0, { s: 1.4, dark: 1 }], ['plant', 20.8, 14.8, 0, { s: 1.4, dark: 1 }], ['exit', 11, 15.8, 2, { label: '外へ出る', sign: '出口 EXIT', w: 3 }], N('旅行者', 'talk:tourist', 13, 5.6, 2.4, 0x3a6ea8), S('← ラーメン', 0.3, 12.4, 1, { h: 0.5, y: 3.2, c: '#ffb347' }), S('GAME →', 21.7, 4.8, 3, { h: 0.5, y: 3.2, c: '#4df0ff' })] },
      { id: 'ramen', name: 'ラーメン横丁', x: -9, z: 4, w: 9, d: 8, h: 3.2, wall: ['shoji', 0xfff0d8, 0.9, 0], floor: ['tatami', 0xf0f0f0, 0.9, 0], ceil: ['wood', 0x6a4a30], ceil3: 'flat', nobeam: 1, deco: ['beams', 'lanterns'], lamps: 'lantern', trims: 'none', lamp: '#ffb880',
        props: [['barcounter', 4.5, 2.3, 0, { w: 6, c: '#ffb347' }], N('ラーメン屋の店主', 'ramen', 4.5, 1.2, 0, 0xc04a2a, { visor: '#ffb347' }), S('ラーメン', 4.5, 0.3, 0, { h: 0.6, y: 2.75, c: '#ffb347', frame: 1 }), ['poster', 0.25, 5.4, 1, { text: '星屑\nトンコツ', c: '#ff5a3a', h: 1.1, y: 1.8 }], ['table', 2.4, 6, 0, { wood: 1, n: 3 }], ['barrel', 7.8, 7, 0]] },
      { id: 'shop', name: 'アーケード街', x: 22, z: 2, w: 12, d: 12, h: 5, trim: '#4df0ff', floor: ['carpet', 0x2a1a4a, 1, 0], wall: ['neon-wall', 0xd0d0d8, 0.6, 0.4], ceil3: 'flat', nobeam: 1, deco: ['lanterns'],
        props: [['arcade', 2, 0.9, 0], ['arcade', 3.2, 0.9, 0, { c: '#f4c', title: 'NEON RUN' }], ['arcade', 4.4, 0.9, 0, { c: '#fd4', title: 'ASTRO' }], ['stall', 9, 2.2, 0, { c: 0x6a2a8a }], ['slot', 10.8, 8, 3], ['slot', 10.8, 9.2, 3], ['sofa', 3, 10.8, 2, { c: 0x5a1a6a }], ['pooltable', 6.6, 6.6, 0], S('GAME CENTER', 6, 0.3, 0, { h: 0.6, y: 3.9, c: '#4df0ff', flicker: 1 })] },
    ],
    doors: [['lobby', 'ramen', 8, 3.2, 2.6, 'open'], ['lobby', 'shop', 8, 2.6, 2.6, 'glass']],
  }),
  ignis: () => ({
    name: 'フォージ採掘基地', sub: 'イグニス・溶岩平原', seed: 72, spawn: [8, 9, 0], music: 'interior',
    theme: { wall: ['bulk', 0x8a6450, 0.8, 0.6], floor: ['grate', 0x9a8a80, 0.6, 0.7], ceil: ['rib', 0x3a2c24], trim: '#ff6a1e', lamp: '#ffc890', frame: 0x1c1614, door: 0x5a3a2a, amb: [0xff7040, 0x1c1410, 0.6], gloss: 0.4, door3: 'blast', trims: 'low', lamps: 'pendant', deco: ['ducts', 'cables'] },
    rooms: [
      { id: 'ctrl', name: '精錬管制室', x: 0, z: 0, w: 16, d: 12, h: 5, win: [['n', 2, 14, 1, 4.2]],
        props: [['console', 4, 1.6, 0, { tall: 0, kind: 'graph' }], ['console', 8, 1.6, 0, { tall: 0, kind: 'bars' }], ['console', 12, 1.6, 0, { tall: 0, kind: 'radar' }], T('鉱石取引所', 'market', 14, 7, 3), ['barrel', 1.5, 6, 0], ['pipes', 0.4, 9, 1, { c: 0xc9a22e }], ['crate', 3, 10, 0, { n: 3 }], ['workbench', 12.5, 11.2, 2], ['tank', 1.6, 2.6, 0, { c: '#ff6a1e' }],
          ['exit', 8, 11.8, 2, { label: '外へ出る (耐熱服)', sign: '高温注意', c: '#ff6a1e' }], N('採掘班長', 'talk:miner', 10.5, 6, 2.6, 0xc06a1a, { visor: '#ff6a1e' }), ['steam', 6, 6, 0]] },
      { id: 'bunk', name: '仮眠室', x: 16, z: 0, w: 8, d: 8, h: 3.5, lamp: '#ffe0c0', deco: ['cables'], lamps: 'bare', wall: ['rib', 0x6a5648, 0.8, 0.5],
        props: [['bunk', 6.9, 2, 0], ['locker', 3, 0.5, 0, { n: 3 }], ['kitchen', 3.5, 7.4, 2, { w: 2.6 }], ['table', 3, 4, 0, { n: 2 }], ['fan', 4, 4, 0]] },
    ],
    doors: [['ctrl', 'bunk', 4, 2, 2.4, 'hatch']],
  }),
  sahar: () => ({
    name: 'オアシス・コロニー', sub: 'サハル・居住ドーム', seed: 73, spawn: [10, 16.4, 0], music: 'interior',
    theme: { wall: ['plaster', 0xe8d4b0, 0.9, 0.02], floor: ['tile', 0xc8a070, 0.45, 0.1], ceil: ['plaster', 0xf0e4cc], trim: '#ffcf6a', lamp: '#fff0d0', frame: 0x6a5234, door: 0xa88a5a, amb: [0xffe8c0, 0x74603c, 1.1], gloss: 0.5, door3: 'wood', trims: 'none', ribs: false, lamps: 'lantern', beam: 0x8a6a48 },
    rooms: [
      { id: 'dome', name: '緑のドーム', x: 0, z: 0, w: 20, d: 20, h: 9, shape: 'round', sky: true, rug: [[10, 10, 0, 4.4, 'grass', 0x8ac060]],
        props: [['fountain', 10, 10, 0, { r: 1.6, c: '#ffcf6a' }], ['tree', 5, 6, 0, { s: 1.1 }], ['tree', 15, 6.4, 0], ['tree', 6, 14.4, 0, { s: 0.9 }], ['bench', 10, 6.4, 0, { c: 0xa85a2a }], ['bench', 13.8, 12.6, 2.5, { c: 0xa85a2a }],
          ['stall', 10, 3, 0, { c: 0xc9a22e, use: 'market', label: '香料市場' }], N('香料商', 'market', 12.4, 4, 2, 0x8a5a2a), ['exit', 10, 19.4, 2, { label: '外へ出る', sign: '砂嵐注意', c: '#ffcf6a', w: 2.6 }], N('入植者', 'talk:colonist', 6.6, 11, 1.5, 0xc8a070), ['lightcone', 10, 10, 0, { r: 4, k: 0.3, c: '#fff0c0' }]] },
      { id: 'guest', name: '客室', x: 20, z: 5.5, w: 9, d: 9, h: 4, floor: ['carpet', 0x8a4a2a, 1, 0], deco: ['beams', 'wains'], rug: [[2, 3, 4.4, 3.4, 'carpet', 0xc8782a]],
        props: [['bed', 7.5, 2.2, 0, { c: 0xc8782a }], ['sofa', 3, 7.9, 2, { c: 0xa85a2a }], ['table', 4, 4.6, 0, { wood: 1, n: 2 }], ['plant', 8, 8, 0, { s: 1.2 }], ['floorlamp', 0.8, 8, 0], ['bookshelf', 3.4, 0.45, 0, { w: 2 }], ['fan', 4.5, 4.5, 0, { wood: 1 }]] },
    ],
    doors: [['dome', 'guest', 10, 2, 2.4, 'wood']],
  }),
  zephyr: () => ({
    name: 'クラウドデッキ', sub: 'ゼファー・雲海ラウンジ', seed: 74, spawn: [12, 11, 0], music: 'interior',
    theme: { wall: ['padded', 0x1c5058, 0.85, 0.05], floor: ['marble', 0xe8d8b0, 0.15, 0.1], ceil: ['ceil', 0x1c3036], trim: '#ffd27a', lamp: '#fff0c8', frame: 0x8a6a2a, door: 0x3a5a5a, amb: [0xffe0a0, 0x243840, 0.9], gloss: 1.2, door3: 'glass', trims: 'low', ribs: false, lamps: 'chandelier', cstyle: 'coffer', cofferC: 0x8a6a2a, col: 0xd4a84a },
    rooms: [
      { id: 'lounge', name: 'スカイラウンジ', x: 0, z: 0, w: 24, d: 14, h: 7, win: [['n', 1.5, 22.5, 0.4, 6.3], ['w', 1.5, 12.5, 0.4, 6.3]], deco: ['columns'], rug: [[7, 2, 10, 5.6, 'carpet', 0x1a4a50]],
        props: [['sofa', 9, 2.8, 0, { c: 0x1a5a5a, w: 3 }], ['sofa', 15, 2.8, 0, { c: 0x1a5a5a, w: 3 }], ['table', 12, 5.6, 0, { c: '#ffd27a', n: 0 }], ['piano', 4, 8.4, 0.4], ['barcounter', 19, 11.2, 2, { w: 5, c: '#ffd27a' }], N('バーテンダー', 'bar', 19, 12.3, 2, 0x1a3a3a, { visor: '#ffd27a' }),
          ['holo', 2.6, 2.6, 0, { kind: 'planet', s: 0.7, c: '#7fc8e8' }], T('希ガス取引所', 'market', 8, 12.6, 2), ['exit', 12.5, 13.8, 2, { label: 'デッキへ出る', sign: '展望デッキ', c: '#ffd27a', w: 2.6 }], ['plant', 22.8, 1.4, 0, { s: 1.4, dark: 1 }], ['floorlamp', 22.6, 8, 0], ['floorlamp', 1.2, 12.6, 0]] },
      { id: 'ref', name: '採取制御室', x: 24, z: 0, w: 10, d: 10, h: 5, wall: ['bulk', 0x4a5a5c, 0.75, 0.6], floor: ['plate', 0x6a7074, 0.5, 0.7], ceil3: 'flat', lamps: 'tube', deco: ['ducts'],
        props: [['tank', 2, 1.6, 0, { c: '#7fc8e8' }], ['tank', 4.2, 1.6, 0, { c: '#c6f' }], ['tank', 6.4, 1.6, 0, { c: '#fd4' }], ['console', 5, 7.5, 2, { tall: 1, kind: 'graph' }], ['pipes', 9.6, 5, 3], ['bunk', 1, 7, 0]] },
    ],
    doors: [['lounge', 'ref', 5, 2.2, 2.5, 'slide']],
  }),
  glacies: () => ({
    name: '氷床研究所', sub: 'グラキエス・観測拠点', seed: 75, spawn: [8, 9, 0], music: 'interior',
    theme: { wall: ['wood', 0xe0c8a8, 0.8, 0], floor: ['wood', 0x8a6a4a, 0.6, 0], ceil: ['wood', 0xb89870], trim: '#a6f0ff', lamp: '#ffe2b8', frame: 0x5a4632, door: 0xa88a6a, amb: [0xffe0c0, 0x444c5c, 0.85], gloss: 0.25, door3: 'wood', trims: 'none', ribs: false, lamps: 'pendant', deco: ['beams'], shade: 0x8a3a2a, beam: 0x5a4030 },
    rooms: [
      { id: 'main', name: '観測室', x: 0, z: 0, w: 16, d: 12, h: 4.2, win: [['n', 2, 14, 0.9, 3.5], ['w', 2, 9, 0.9, 3.5]], rug: [[8.6, 1.6, 4.6, 3.6, 'carpet', 0x8a2a20]],
        props: [['fireplace', 15.3, 3.4, 3], ['sofa', 10.4, 3.4, 1, { c: 0x8a3a2a }], ['desk', 4, 2, 0, { wood: 1, kind: 'graph' }], ['tank', 14.8, 10.9, 0, { c: '#a6f0ff' }], ['tank', 13.2, 11.1, 0, { c: '#6fe' }], ['kitchen', 0.6, 8.6, 1, { w: 2.6 }], ['plant', 1, 11, 0, { s: 1.2 }], ['bookshelf', 3.6, 11.55, 2], ['floorlamp', 9.2, 1, 0],
          T('氷晶取引所', 'market', 11.6, 10.4, 2), ['exit', 7.4, 11.8, 2, { label: '外へ出る (防寒服)', sign: '極寒注意', c: '#a6f0ff' }], N('観測員', 'talk:ice', 7, 5.4, 2.8, 0x3a6a9a)] },
      { id: 'sleep', name: '寝室', x: 16, z: 2, w: 8, d: 8, h: 3.4, rug: [[1.6, 2, 3.4, 4, 'carpet', 0x2a4a7a]],
        props: [['bunk', 6.9, 2, 0, { c: 0x2a4a7a }], ['locker', 3, 0.5, 0, { n: 3 }], ['cabinet', 0.5, 2.4, 1, { w: 1.4 }], ['plant', 7, 7, 0], ['floorlamp', 4.6, 7.2, 0]] },
    ],
    doors: [['main', 'sleep', 8.5, 1.8, 2.3, 'wood']],
  }),
};

// ───────────────────────── 敵艦内 (シードから生成: 20 隻すべて異なる様式・3 種の間取り) ─────────────────────────
function enemyBP(def) {
  const r = rng(def.seed * 7 + 3), gc = new THREE.Color(def.glow), dark = (k, base) => new THREE.Color(base).lerp(gc, k).getHex();
  const KW = (k) => (k === 'reactor' ? { wall: ['engine-pipes', 0xb0b4ba, 0.8, 0.5] } : k === 'brig' ? { wall: ['brig-bars', 0xb0b0b0, 0.8, 0.5] } : {}); // 機関室は配管の壁、営倉は鉄格子
  const ws0 = pick(r, ['bulk', 'rib', 'rock', 'enemy-wall', 'bulk']), ws = def.cls && ws0 === 'rock' ? 'enemy-wall' : ws0, fs = pick(r, ['grate', 'plate', 'hex', 'enemy-floor']), cave = ws === 'rock';
  const theme = { wall: [ws, dark(0.14, cave ? 0x5a4a50 : 0x50545e), 0.8, 0.5], floor: [fs, dark(0.08, 0x6a6e76), 0.45, 0.7], ceil: [cave ? 'rock' : pick(r, ['ceil', 'rib']), dark(0.1, 0x2a2c32)], trim: def.glow, lamp: '#' + new THREE.Color(def.glow).lerp(new THREE.Color('#fff'), 0.55).getHexString(),
    frame: 0x121316, door: dark(0.3, 0x3a3a40), amb: [dark(0.6, 0x404050), 0x0c0c10, 0.42], gloss: 0.5, door3: pick(r, ['hatch', 'blast', 'slide']), trims: pick(r, ['low', 'neon', 'both']), lamps: cave ? 'bare' : pick(r, ['tube', 'panel', 'pendant']), cstyle: cave ? 'rock' : 'flat', ribs: !cave, deco: cave ? ['stal'] : pick(r, [['cables'], ['ducts'], ['cables', 'ducts'], []]) };
  const CL = def.cls ? ENEMY_CLASSES[def.cls] : null, has = (n) => hasImage('materials/' + n), sm = (n, k = 0.7, me = 0.4) => [n, 0xffffff, k, me]; // 艦種つきの艦は艦内の素材と特別な部屋を艦種で変える
  if (CL) { if (CL.wall && has(CL.wall)) theme.wall = sm(CL.wall); if (CL.floor && has(CL.floor)) theme.floor = sm(CL.floor, 0.5, 0.6); if (CL.ceil && has(CL.ceil)) theme.ceil = sm(CL.ceil, 0.8, 0.4); }
  const topo = def.idx % 3, n = 2 + def.tier + (r() < 0.5 ? 1 : 0), base = shuffled(['barracks', 'armory', 'cargo', 'medbay', 'reactor', 'brig', 'lab'], r);
  const kinds = (CL ? [CL.room, 'mess', ...base] : base).slice(0, Math.min(n, topo === 1 ? 4 : 6));
  const NAME = { barracks: '兵員室', armory: '武器庫', cargo: '貨物室', medbay: '医務室', reactor: '機関室', brig: '営倉', lab: '実験室', mess: '乗員区画', sensor: 'センサー室', fuel: '燃料ポンプ室', workshop: '修理工場', holding: '捕虜区画', torpedo: '魚雷庫', mines: '機雷庫', barracks2: '突撃兵の待機室', boarding: '揚陸区画', reactor2: '主機関室', gunnery: '砲術室', missiles: 'ミサイル庫', bombs: '爆弾庫', ewroom: '電子戦室', capacitors: 'コンデンサー室', command: '作戦室', shieldgen: 'シールド発生室', drones: 'ドローン格納庫' }, rooms = [], doors = [], drones = [];
  const MON = (img, x, z, rot, w = 1.5) => ['picwall', x, z, rot, { img, w, h: w * 0.62, y: 1.85, frame: 1, glow: 0.7 }]; // 監視モニター (部屋を真上から見た絵)
  const WARN = (x, z, rot) => ['picwall', x, z, rot, { img: 'en-holo-warning', w: 0.7, h: 0.7, y: 2.0, glow: 1.4 }];
  /** 部屋の中身。flip=true で東西を鏡写し */
  const fill = (k, w, d, flip, id, ns) => { const X = (v) => (flip ? w - v : v), rot = (q) => (flip ? (4 - q) % 4 : q), P = [], C = ns ? w / 2 + 2.3 : w / 2;
    if (k === 'barracks') P.push(['bunk', X(w - 1), 1.6, 0, { use: false }], ['bunk', X(w - 1), d - 2, 0, { use: false }], ['locker', C, 0.5, 0, { n: 3 }], ['table', X(w / 2 - 0.5), d / 2 + (ns ? 0 : 0.6), 0, { n: 3 }]);
    else if (k === 'armory') P.push(['weaponrack', C, 0.25, 0, { c: def.glow }], ['weaponrack', X(w - 0.25), d / 2, rot(3), { c: def.glow }], ['crate', X(w - 1.8), d - 1.6, 0, { n: 4, ammo: 1 }], ['locker', C, d - 0.5, 2, { n: 3 }]);
    else if (k === 'cargo') { P.push(['crate', X(w - 1.8), 1.8, 0, { n: 5 }], ['crate', X(w - 1.8), d - 1.8, 0, { n: 4 }], ['barrel', X(2.4), d - 1.4, 0], ['terminal', ns ? C : X(w / 2), 0.8, 0, { label: '貨物を略奪', use: 'loot', kind: 'bars', id: def.id + id }]); if (CL) P.push(['picfurn', X(0.9), d / 2, rot(1), { img: 'en-cargo-crate', w: 1.4, h: 0.9, d: 0.9, metal: 1 }]); }
    else if (k === 'medbay') P.push(['medpod', X(w - 1.2), 2, 0], ['tank', X(w - 1.2), d - 1.6, 0, { c: def.glow }], ['rack', C, 0.6, 0, { n: 2 }]);
    else if (k === 'reactor') P.push(['reactor', X(w / 2 + 0.6), d / 2, 0, { c: def.glow }], ['pipes', X(w - 0.4), 1.2, rot(3)], ['rack', w / 2 - 1.6, d - 0.5, 2, { n: 1 }]);
    else if (k === 'brig') P.push(['cell', X(w - 1.9), 1.6, rot(3)], ['console', X(2.2), d - 1.4, 2, { kind: 'data' }]);
    else if (k === 'mess') P.push(['pictop', X(w / 2 + 0.4), d / 2 + (ns ? 0.6 : 0), 0, { img: 'en-mess-table', w: 1.4, d: 2.4, h: 0.76, metal: 1 }], ['picfurn', X(w - 0.35), d / 2, rot(3), { img: 'en-crew-lockers', w: 1.8, h: 1.9, d: 0.5, metal: 1 }], ['picwall', C, 0.2, 0, { img: 'en-propaganda', w: 0.9, h: 1.2, y: 1.6 }], ['picwall', C, d - 0.2, 2, { img: 'en-helmet-rack', w: 1.4, h: 1.4, y: 1.45 }], ['picwall', X(0.2), 1.6, rot(1), { img: 'en-hammocks', w: 1.6, h: 1.6, y: 1.2 }], ['bunk', X(1.0), d - 1.9, 0, { use: false, fab: 'en-uniform-fabric' }]);
    else if (k === 'barracks2') P.push(['bunk', X(w - 1), 1.6, 0, { use: false, fab: 'en-uniform-fabric' }], ['bunk', X(w - 1), d - 2, 0, { use: false, fab: 'en-uniform-fabric' }], ['picfurn', C, 0.45, 0, { img: 'en-weapon-locker', w: 2.4, h: 0.9, d: 0.6, metal: 1 }], ['picwall', C, d - 0.2, 2, { img: 'en-propaganda', w: 0.9, h: 1.2, y: 1.6 }], ['picwall', X(0.2), d / 2, rot(1), { img: 'en-sparks', w: 1.2, h: 1.2, y: 2.2, glow: 1.6 }]);
    else if (k === 'sensor' || k === 'ewroom') P.push(['rack', X(w - 0.6), d / 2, rot(3), { n: 2 }], MON(k === 'sensor' ? 'en-sensor-room' : 'en-ew-servers', C, 0.2, 0), ['picwall', C, d - 0.2, 2, { img: k === 'sensor' ? 'en-radar-scope' : 'en-tactical-display', w: 2.4, h: 0.8, y: 1.9, glow: 0.9 }], ['console', X(1.4), d / 2, rot(1), { tall: 1, kind: 'radar', c: def.glow }]);
    else if (k === 'fuel') P.push(['tank', X(w - 1.2), 1.6, 0, { c: '#ffb030' }], ['tank', X(w - 1.2), d - 1.6, 0, { c: '#ffb030' }], ['pipes', X(0.4), d / 2, rot(1), { c: 0xc9a22e }], MON('en-fuel-pumps', C, 0.2, 0), WARN(C, d - 0.2, 2));
    else if (k === 'workshop') P.push(['workbench', C, 0.6, 0], ['toolcart', X(w - 1.2), d - 1.2, 0], ['picwall', X(0.2), d / 2, rot(1), { img: 'mg-tool-wall', w: 1.8, h: 1.7, y: 1.4 }], MON('en-repair-shop', C, d - 0.2, 2));
    else if (k === 'holding') P.push(['cell', X(w - 1.9), 1.6, rot(3)], MON('en-holding-pods', C, d - 0.2, 2), WARN(X(0.2), d / 2, rot(1)));
    else if (k === 'boarding') P.push(['seatrow', C, 0.6, 0, { n: 4, c: 0x3a3c46 }], ['seatrow', C, d - 0.6, 2, { n: 4, c: 0x3a3c46 }], ['picfurn', X(w - 0.35), d / 2, rot(3), { img: 'en-weapon-locker', w: 2.4, h: 0.9, d: 0.6, metal: 1 }], MON('en-boarding-pod', X(0.2), d / 2, rot(1)));
    else if (k === 'reactor2' || k === 'shieldgen') P.push(['reactor', X(w / 2 + 0.6), d / 2, 0, { c: def.glow }], ['pipes', X(w - 0.4), 1.2, rot(3)], MON(k === 'shieldgen' ? 'en-shield-generator' : 'en-fuel-pumps', C, 0.2, 0), WARN(C, d - 0.2, 2));
    else if (k === 'torpedo' || k === 'mines' || k === 'missiles' || k === 'bombs' || k === 'drones' || k === 'capacitors' || k === 'gunnery') { const img = { torpedo: 'en-torpedo-rack', mines: 'en-mine-store', missiles: 'en-missile-magazine', bombs: 'en-bomb-rack', drones: 'en-drone-rack', capacitors: 'en-capacitor-bank', gunnery: 'en-ammo-conveyor' }[k];
      P.push(['picfurn', C, 0.55, 0, { img, w: 3.6, h: 1.2, d: 0.9, metal: 1 }], ['picfurn', C, d - 0.55, 2, { img, w: 3.6, h: 1.2, d: 0.9, metal: 1 }], ['picwall', X(0.2), d / 2, rot(1), { img: k === 'drones' ? 'en-drone-control' : 'en-weapon-panel', w: 2.1, h: 0.7, y: 1.8, glow: 0.9 }], ['floorpic', X(w / 2 + 0.4), d / 2, 0, { img: 'en-hazard-floor', w: 2.2, d: 1.4, metal: 0.5 }]);
      if (k === 'drones') P.push(MON('en-drone-control', X(w - 0.2), d / 2, rot(3))); if (k === 'capacitors') P.push(WARN(X(w - 0.2), d / 2, rot(3))); }
    else if (k === 'command') P.push(['pictop', X(w / 2 + 0.3), d / 2, 0, { img: 'en-war-table', w: 2.4, d: 1.6, h: 0.9, metal: 1, glow: 0.8 }], ['picwall', C, 0.2, 0, { img: 'en-star-chart', w: 2.6, h: 0.86, y: 1.9, glow: 0.8 }], ['picwall', C, d - 0.2, 2, { img: 'en-tactical-display', w: 2.6, h: 0.86, y: 1.9, glow: 0.8 }], ['picwall', X(0.2), d / 2, rot(1), { img: 'en-emblem-command', w: 2.1, h: 0.7, y: 2.1 }]);
    else P.push(['tank', X(w - 1), 1.4, 0, { c: def.glow }], ['tank', X(w - 1), d / 2, 0, { c: '#6fe' }], ['tank', X(w - 1), d - 1.4, 0, { c: '#fd4' }], ['console', C, 1, 0, { tall: 1, kind: 'graph' }]);
    return P; };
  const H = (k) => (k === 'reactor' ? 6 : rr(r, 2.9, 4));
  rooms.push({ id: 'lock', name: 'エアロック', x: -3, z: 0, w: 6, d: 5, h: 3, deco: [], ceil3: 'flat', props: [['exit', 3, 4.8, 2, { label: '自船へ戻る', sign: 'AIRLOCK', c: def.glow }], ['locker', 0.5, 2.5, 1, { n: 3 }], ['crate', 4.8, 1.4, 0, { n: 2 }],
    ...(CL ? [['cutpic', 5.75, 3.5, 3, { img: 'en-escape-pod', w: 1.0, h: 1.2, y: 0.4 }], ['floorpic', 3, 4.1, 0, { img: 'en-hazard-floor', w: 2.4, d: 0.8, metal: 0.5 }], ['picwall', 3, 0.2, 0, { img: CL.mark || 'en-emblem-void', w: 2.1, h: 0.7, y: 2.2 }]] : [])] }); // 艦種つきの艦: 脱出ポッド・黄黒の床・紋章
  const bw = rr(r, 10, 13), bd = rr(r, 8, 10), bh = rr(r, 3.6, 4.8);
  const bridge = (x, z, win, core) => ({ id: 'bridge', name: '敵艦橋', x, z, w: bw, d: bd, h: bh, win: [win], floor: [pick(r, ['hex', 'plate']), dark(0.1, 0x50545c), 0.3, 0.7], deco: [], ceil3: 'flat', plat: [[bw / 2 - 2, bd * 0.42 - 1.6, 4, 3.2, 0.3, 's', 0.7]],
    props: [['core', bw / 2, bd * 0.42, 0, { c: def.glow, y0: 0.3 }], ['console', bw / 2 - 3.6, 1.4, 0, { tall: 1, kind: 'radar', c: def.glow }], ['console', bw / 2 + 3.6, 1.4, 0, { tall: 1, kind: 'graph', c: def.glow }], ['console', 1.2, bd / 2 + 1, 1, { kind: 'bars', c: def.glow }], ['console', bw - 1.2, bd / 2 + 1, 3, { kind: 'data', c: def.glow }], ...(CL ? bridgeScreens(win[0]) : [])] });
  /** 艦種つきの艦の艦橋: 戦術画面・星図・レーダー・兵器管制の画面、艦内の監視モニター、窓の前の操舵卓 */
  function bridgeScreens(side) { const S2 = (img, x, z, rot, w = 2.6) => ['picwall', x, z, rot, { img, w, h: w / 3, y: 2.45, glow: 0.85 }], cams = ['en-ew-servers', 'en-drone-control', 'en-repair-shop', 'en-holding-pods'];
    if (side === 'n') return [['picfurn', bw / 2, 0.62, 0, { img: 'en-helm-console', w: 3.2, h: 1.05, d: 0.8, metal: 1, glow: 0.5 }], S2('en-tactical-display', 0.2, bd * 0.32, 1), S2('en-star-chart', bw - 0.2, bd * 0.32, 3), S2('en-radar-scope', bw / 2 - 3.1, bd - 0.2, 2, 2.2), S2('en-weapon-panel', bw / 2 + 3.1, bd - 0.2, 2, 2.2), MON(cams[def.idx % 4], 0.2, bd * 0.72, 1, 1.2), MON(cams[(def.idx + 1) % 4], bw - 0.2, bd * 0.72, 3, 1.2)];
    return [['picfurn', bw - 0.62, bd / 2, 3, { img: 'en-helm-console', w: 3.2, h: 1.05, d: 0.8, metal: 1, glow: 0.5 }], S2('en-tactical-display', bw * 0.32, 0.2, 0), S2('en-star-chart', bw * 0.32, bd - 0.2, 2), S2('en-radar-scope', 0.2, bd / 2 - 2.9, 1, 2.2), S2('en-weapon-panel', 0.2, bd / 2 + 2.9, 1, 2.2), MON(cams[def.idx % 4], bw * 0.72, 0.2, 0, 1.2), MON(cams[(def.idx + 1) % 4], bw * 0.72, bd - 0.2, 2, 1.2)]; }
  if (topo === 0) { // 背骨型: 直線通路の両側に部屋、突き当たりが艦橋
    const cw = 3 + (r() < 0.4 ? 1 : 0), hw = cw / 2, len = 4 + Math.ceil(kinds.length / 2) * 8;
    rooms.push({ id: 'hall', name: '通路', x: -hw, z: -len, w: cw, d: len, h: rr(r, 2.9, 3.5), ceil3: cave ? 'rock' : 'vault', props: [] }); doors.push(['hall', 'lock', 0, 1.8, 2.3]); drones.push([0, -len * 0.5]);
    kinds.forEach((k, i) => { const west = i % 2 === 0, w = rr(r, 6.5, 9), d = 7, z = -(3 + Math.floor(i / 2) * 8) - d, x = west ? -hw - w : hw, id = 'r' + i; rooms.push({ id, name: NAME[k], x, z, w, d, h: H(k), props: fill(k, w, d, west, id), ...KW(k) }); doors.push(['hall', id, z + d / 2, 1.8, 2.3]); if (r() < 0.75 || k === 'reactor') drones.push([x + w / 2, z + d / 2]); });
    rooms.push(bridge(-bw / 2, -len - bd, ['n', 1.2, bw - 1.2, 1.1, bh - 0.6])); doors.push(['bridge', 'hall', 0, 2, 2.4]);
    for (let i = 0; i < 1 + def.tier; i++) drones.push([(i - def.tier / 2) * 2.4, -len - bd * 0.72]);
  } else if (topo === 1) { // ハブ型: 円形ホールから放射状に部屋、北に艦橋
    rooms.push({ id: 'hall', name: '連絡通路', x: -1.5, z: -6, w: 3, d: 6, h: 3, props: [] }, { id: 'hub', name: '中央ホール', x: -7, z: -20, w: 14, d: 14, h: rr(r, 5, 6.5), shape: 'round', deco: [], props: [['holo', 7, 7, 0, { kind: 'x', s: 0.9, y: 2, c: def.glow }]] });
    doors.push(['hall', 'lock', 0, 1.8, 2.3], ['hall', 'hub', 0, 2, 2.4]); drones.push([2.5, -13], [-2.5, -15]);
    kinds.forEach((k, i) => { const west = i % 2 === 0, w = rr(r, 6.5, 8.5), id = 'r' + i; let x, z, d;
      if (i < 2) { d = 7; z = -16.5; x = west ? -7 - w : 7; doors.push(['hub', id, -13, 1.8, 2.3]); } else { d = 6; z = -6; x = west ? -1.5 - w : 1.5; doors.push(['hall', id, -3, 1.6, 2.2]); }
      rooms.push({ id, name: NAME[k], x, z, w, d, h: k === 'reactor' ? 5.5 : rr(r, 2.9, 3.8), props: fill(k, w, d, west, id), ...KW(k) }); if (r() < 0.7 || k === 'reactor') drones.push([x + w / 2, z + d / 2]); });
    rooms.push(bridge(-bw / 2, -20 - bd, ['n', 1.2, bw - 1.2, 1.1, bh - 0.6])); doors.push(['bridge', 'hub', 0, 2, 2.4]);
    for (let i = 0; i < 1 + def.tier; i++) drones.push([(i - def.tier / 2) * 2.4, -20 - bd * 0.72]);
  } else { // L 字型: 通路が直角に折れ、東端が艦橋
    const L2 = 2 + Math.ceil(kinds.length / 2) * 8.5;
    rooms.push({ id: 'hall', name: '通路 A', x: -1.5, z: -12, w: 3, d: 12, h: 3.1, ceil3: cave ? 'rock' : 'vault', props: [['pipes', 0.3, 5, 1]] }, { id: 'hall2', name: '通路 B', x: 1.5, z: -12, w: L2, d: 3, h: 3.1, ceil3: cave ? 'rock' : 'vault', props: [] });
    doors.push(['hall', 'lock', 0, 1.8, 2.3], ['hall', 'hall2', -10.5, 2.2, 2.5, 'open']); drones.push([0, -6], [1.5 + L2 * 0.5, -10.5]);
    kinds.forEach((k, i) => { const north = i % 2 === 0, w = 7.5, d = 7, x = 2.5 + Math.floor(i / 2) * 8.5, z = north ? -19 : -9, id = 'r' + i; rooms.push({ id, name: NAME[k], x, z, w, d, h: H(k), props: fill(k, w, d, i % 4 < 2, id, true), ...KW(k) }); doors.push(['hall2', id, x + w / 2, 1.8, 2.3]); if (r() < 0.75 || k === 'reactor') drones.push([x + w / 2, z + d / 2]); });
    const b = bridge(1.5 + L2, -10.5 - bd / 2, ['e', 1.2, bd - 1.2, 1.1, bh - 0.6]); rooms.push(b); doors.push(['hall2', 'bridge', -10.5, 2, 2.4]);
    for (let i = 0; i < 1 + def.tier; i++) drones.push([1.5 + L2 + bw * 0.72, -10.5 + (i - def.tier / 2) * 2.2]);
  }
  return { name: def.name, sub: '敵艦内 — 制御コアを掌握せよ', seed: def.seed, spawn: [0, 3.2, 0], view: [0, -1], music: 'hostile', hostile: true, theme, rooms, doors, drones };
}

const BP = { 'station:haven': haven, 'station:vulcan': vulcan, 'station:aurora': aurora, 'station:bastion': bastion, 'station:rogue': rogue, 'ship:hayate': hayate, 'ship:raiden': raiden, 'ship:amatsu': amatsu, ...BP2 };
export function blueprint(type, id, def) {
  if (type === 'enemy') return enemyBP(def);
  if (type === 'outpost') return OUT[id]();
  return BP[type + ':' + id]();
}
export const ALL_BLUEPRINTS = [['station', 'haven'], ['station', 'vulcan'], ['station', 'aurora'], ['station', 'bastion'], ['station', 'rogue'], ['ship', 'hayate'], ['ship', 'raiden'], ['ship', 'amatsu'], ['outpost', 'terra'], ['outpost', 'ignis'], ['outpost', 'sahar'], ['outpost', 'zephyr'], ['outpost', 'glacies'], ...ALL2];
