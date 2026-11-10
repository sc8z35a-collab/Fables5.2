// 内装の設計図: ステーション 5 / 主人公機 3 / 惑星拠点 5 / 敵艦 (シード生成)
// 部屋: {id,x,z,w,d,h}  小道具: [種類, x, z, 向き(90°単位), オプション] (部屋の左上隅からの相対座標)
import * as THREE from 'three';
import { rng, rr, pick } from '../core/util.js';
import { mat, glow } from '../gfx/textures.js';

const T = (label, use, x, z, rot, o = {}) => ['terminal', x, z, rot, { label, use, ...o }];
const N = (label, use, x, z, rot, suit, o = {}) => ['npc', x, z, rot, { label, use, suit, ...o }];
const S = (text, x, z, rot, o = {}) => ['sign', x, z, rot, { text, ...o }];

// ───────────────────────── ステーション ─────────────────────────
const haven = () => ({
  name: 'ヘイヴン・リング', sub: '交易ハブ', seed: 11, spawn: [33, 23, -2.2], view: [-1, 0], music: 'interior',
  theme: { wall: ['wall', 0xdfe6ec, 0.7, 0.2], floor: ['tile', 0xf2f5f8, 0.22, 0.1], ceil: ['ceil', 0xaab4bd], trim: '#4de1ff', lamp: '#eaf6ff', frame: 0x3a4450, amb: [0xbfd8ff, 0x4a525c, 1.0], gloss: 0.9 },
  rooms: [
    { id: 'hangar', name: '第 1 格納庫', x: 0, z: 0, w: 44, d: 32, h: 16, floor: ['plate', 0xa4acb6, 0.5, 0.6], wall: ['wall', 0xb9c2cc, 0.75, 0.3], win: [['n', 6, 38, 2, 13]], li: 1.6,
      props: [['shipslot', 22, 15, 0, { r: 11 }], T('格納庫サービス', 'shipyard', 38, 27, 0), ['crate', 5, 5, 0, { n: 6 }], ['crate', 39, 6, 0, { n: 5 }], ['cargo', 5, 22, 0], ['barrel', 9, 28, 0], ['cargo', 40, 18, 1], S('HAVEN RING', 22, 31.7, 2, { h: 1.6, y: 9 }), S('第 1 格納庫', 22, 31.7, 2, { h: 0.8, y: 7.2, c: '#ffd27a' }), N('整備士', 'talk:mech', 30, 26, -1, 0xd08a2a)] },
    { id: 'prom', name: 'プロムナード', x: 15, z: 32, w: 14, d: 56, h: 9, sky: true,
      props: [['tree', 7, 9, 0], ['tree', 7, 23, 0, { s: 1.15 }], ['tree', 7, 37, 0], ['tree', 7, 49, 0, { s: 1.1 }], ['bench', 4.2, 16, 1], ['bench', 9.8, 16, 3], ['bench', 4.2, 43, 1], ['bench', 9.8, 43, 3],
        ['planter', 0.9, 6, 1, { w: 6, flowers: 1 }], ['planter', 13.1, 6, 1, { w: 6, flowers: 1 }], ['planter', 0.9, 30, 1, { w: 8, flowers: 1 }], ['planter', 13.1, 28, 1, { w: 8, flowers: 1 }],
        T('任務端末', 'missions', 2.2, 12.5, 1), T('星図', 'map', 11.8, 12.5, 3, { kind: 'orbit' }), S('交易市場 →', 13.7, 17, 3, { h: 0.6, y: 3.6, c: '#ffd27a' }), S('← カフェ', 0.3, 21, 1, { h: 0.6, y: 3.6, c: '#ff9ad8' }), S('展望デッキ', 7, 55.7, 2, { h: 0.7, y: 4.2 }),
        N('旅行者', 'talk:tourist', 5, 27, 0.6, 0x7a3a8a), N('商人', 'talk:trader', 10, 39, -1, 0x3a8a5a), ['vending', 13.3, 46, 3], ['lightcone', 7, 30, 0, { r: 3, k: 0.25 }]] },
    { id: 'market', name: '交易市場', x: 29, z: 38, w: 26, d: 22, h: 7,
      props: [T('交易市場', 'market', 5, 11, 1, { kind: 'bars' }), ['stall', 10, 4, 0, { c: 0xb8452e, use: 'market', label: '交易市場' }], ['stall', 17, 4, 0, { c: 0x2e7ab8 }], ['stall', 10, 18, 2, { c: 0xc9a22e }], ['stall', 17, 18, 2, { c: 0x3aa86a }],
        ['wallscreen', 25.7, 11, 3, { w: 7, h: 3, y: 3.6, kind: 'bars', title: '相場 MARKET' }], ['crate', 22, 5, 0, { n: 5 }], ['crate', 22, 17, 0, { n: 4 }], ['pillar', 13.5, 11, 0], ['plant', 2, 2, 0, { s: 1.3 }], ['plant', 2, 20, 0, { s: 1.3 }], N('仲買人', 'market', 12, 11, 1, 0xb8452e)] },
    { id: 'cafe', name: 'カフェ・テラ', x: -5, z: 44, w: 20, d: 18, h: 5.5, floor: ['wood', 0xffffff, 0.4, 0], win: [['w', 2, 16, 0.5, 4.8]], lamp: '#ffe8c8',
      props: [['barcounter', 12, 2.4, 0, { w: 6, c: '#ffb347' }], N('バリスタ', 'cafe', 12, 1.3, 0, 0x6a4a2a), ['table', 5, 6, 0, { wood: 1 }], ['table', 5, 12, 0, { wood: 1 }], ['table', 10.5, 9, 0, { wood: 1 }], ['sofa', 1.4, 5, 1, { c: 0x2e6a6a }], ['sofa', 1.4, 13, 1, { c: 0x2e6a6a }],
        ['plant', 18.5, 16.5, 0, { s: 1.4 }], ['plant', 1, 16.8, 0, { s: 1.2 }], ['aquarium', 14, 17.2, 2, { w: 4 }], S('CAFÉ TERRA', 12, 0.3, 0, { h: 0.6, y: 3.9, c: '#ffb347' })] },
    { id: 'deck', name: '展望デッキ', x: 9, z: 88, w: 26, d: 14, h: 8, win: [['s', 1.5, 24.5, 0.4, 7.2], ['w', 2, 12, 0.4, 7.2]], floor: ['carpet', 0x24486a, 1, 0],
      props: [['telescope', 13, 8, 2], ['sofa', 6, 10, 2], ['sofa', 20, 10, 2], ['plant', 1.5, 1.5, 0, { s: 1.5 }], ['plant', 24.5, 1.5, 0, { s: 1.5 }], ['holo', 21, 4, 0, { kind: 'planet', s: 0.8, c: '#4aa3ff' }], ['railing', 13, 12.4, 0, { w: 22 }]] },
  ],
  doors: [['hangar', 'prom', 22, 5, 4], ['prom', 'market', 49, 4, 3], ['prom', 'cafe', 53, 3, 2.6], ['prom', 'deck', 22, 4, 3]],
});

const vulcan = () => ({
  name: 'ヴァルカン造船廠', sub: '造船・改修', seed: 22, spawn: [31, 22, -2.2], view: [0, 1], music: 'interior',
  theme: { wall: ['wall', 0x8f887a, 0.8, 0.4], floor: ['plate', 0x8d8f94, 0.5, 0.7], ceil: ['rib', 0x4a4e55], trim: '#ffb347', lamp: '#ffe2b8', frame: 0x2a2c30, door: 0x7a6a50, amb: [0xffd9a8, 0x34322c, 0.8], gloss: 0.5 },
  rooms: [
    { id: 'hangar', name: '整備ドック', x: 0, z: 0, w: 40, d: 30, h: 15, li: 1.6, win: [['n', 6, 34, 2, 12]],
      props: [['shipslot', 20, 14, 0, { r: 11 }], T('造船廠ドック', 'yard', 35, 25, 0), ['cargo', 4, 6, 0, { c: 0xc9a22e }], ['cargo', 7.2, 6, 0, { c: 0xb8452e }], ['crate', 36, 5, 0, { n: 6 }], ['barrel', 4, 26, 0], ['barrel', 7, 27, 0], ['pipes', 39.5, 12, 3], ['pipes', 0.5, 16, 1],
        S('VULCAN DRYDOCK', 20, 29.7, 2, { h: 1.5, y: 9, c: '#ffb347' }), S('注意 溶接作業中', 20, 29.7, 2, { h: 0.6, y: 7.2, c: '#ff5a3a', flicker: 1 }), N('ドック長', 'talk:dock', 29, 25, -1, 0xd0a020), ['steam', 12, 20, 0], ['steam', 30, 8, 0]] },
    { id: 'shop', name: '工作室', x: 40, z: 4, w: 22, d: 18, h: 7,
      props: [['reactor', 11, 9, 0, { c: '#ff8a2a' }], T('改修工房', 'yard', 4, 15, 0), ['desk', 5, 3, 0, { kind: 'graph' }], ['rack', 19, 2, 0, { n: 3 }], ['pipes', 21.6, 9, 3, { c: 0xc9a22e }], ['crate', 18, 15, 0, { n: 5 }], ['weaponrack', 11, 0.25, 0, { c: '#ffb347' }], ['barrel', 2, 9, 0], ['steam', 16, 6, 0]] },
    { id: 'ctrl', name: '管制デッキ', x: 40, z: 22, w: 22, d: 14, h: 6, win: [['s', 1.5, 20.5, 0.8, 5.3]], floor: ['hex', 0x8a8478, 0.35, 0.5],
      props: [['console', 5, 10.5, 2, { tall: 1, kind: 'graph' }], ['console', 11, 10.5, 2, { tall: 1, kind: 'bars' }], ['console', 17, 10.5, 2, { tall: 1, kind: 'radar' }], ['seat', 5, 9, 0], ['seat', 11, 9, 0], ['seat', 17, 9, 0], ['holo', 11, 4, 0, { kind: 'ship', s: 0.9 }], T('任務端末', 'missions', 2, 3, 1), N('管制官', 'talk:ctrl', 19, 5, -1.4, 0x3a5a8a)] },
    { id: 'mess', name: '資材庫・食堂', x: 62, z: 4, w: 14, d: 14, h: 4.5,
      props: [['kitchen', 7, 0.6, 0, { w: 4, use: 'rest', label: '食事をとって休む' }], ['table', 4, 6, 0], ['table', 10, 6, 0], ['vending', 13.4, 10, 3], T('資材市場', 'market', 2, 11.5, 1), ['crate', 10, 11.5, 0, { n: 4 }], ['locker', 7, 13.5, 2, { n: 5 }]] },
  ],
  doors: [['hangar', 'shop', 13, 3, 2.8], ['shop', 'ctrl', 51, 2.4], ['shop', 'mess', 11, 2.2]],
  // 管制デッキの窓の外: 建造中の船体 (乾ドック)
  extra(B) {
    const Y = mat('hull', { color: 0xf0a020, rough: 0.6, metal: 0.3 }), H = mat('hull', { color: 0xc9b98f, rough: 0.7, metal: 0.35 }), RB = mat('rib', { color: 0x8a8f98, metal: 0.6 }), L = glow('#ffe2b0', 6);
    for (let i = 0; i < 9; i++) { const x = 15 + i * 9, R = 9 + Math.sin(i / 8 * Math.PI) * 13; B.tor(RB, R, 0.8, x, -6, 78, 0, Math.PI / 2, 0, 24, 6); if (i < 5) B.add(H, new THREE.CylinderGeometry(R + 0.9, R + 0.9, 8.6, 24, 1, true, 0, 3.6), new THREE.Matrix4().makeRotationZ(Math.PI / 2).setPosition(x, -6, 78)); }
    B.box(RB, 80, 2.5, 3, 51, -27, 78);
    for (const z of [50, 106]) { B.box(Y, 4, 70, 4, 8, -8, z); B.box(Y, 4, 70, 4, 94, -8, z); B.box(Y, 90, 4, 4, 51, 26, z); B.box(Y, 90, 4, 4, 51, -42, z); for (let i = 0; i < 6; i++) B.box(L, 2.4, 0.6, 0.6, 14 + i * 15, 23.6, z + (z < 78 ? 2.2 : -2.2)); }
    B.box(Y, 4, 4, 60, 8, 26, 78); B.box(Y, 4, 4, 60, 94, 26, 78); B.box(Y, 3, 3, 30, 40, 24, 64); B.box(Y, 2, 16, 2, 40, 16, 76);
  },
});

const aurora = () => ({
  name: 'オーロラ天文台', sub: '科学研究', seed: 33, spawn: [28, 21, -2.2], view: [-1, 0], music: 'interior',
  theme: { wall: ['wall', 0xf2f6fa, 0.5, 0.15], floor: ['hex', 0xe2ebf2, 0.28, 0.3], ceil: ['ceil', 0xc8d2dc], trim: '#8feaff', lamp: '#f2fbff', frame: 0x55606c, amb: [0xd8ecff, 0x56606a, 1.1], gloss: 1.0 },
  rooms: [
    { id: 'hangar', name: '到着ベイ', x: 0, z: 0, w: 36, d: 28, h: 14, li: 1.6, floor: ['tile', 0xc8d2dc, 0.3, 0.3], win: [['n', 5, 31, 2, 11]],
      props: [['shipslot', 18, 13, 0, { r: 10.5 }], T('格納庫サービス', 'shipyard', 31, 23.5, 0), ['crate', 4, 4, 0, { n: 4 }], ['rack', 2, 22, 1, { n: 3 }], S('AURORA OBSERVATORY', 18, 27.7, 2, { h: 1.2, y: 8.5 }), S('到着ベイ', 18, 27.7, 2, { h: 0.7, y: 7, c: '#ffffff' }), N('研究員', 'talk:sci', 25, 23, -1, 0xdfe8f0)] },
    { id: 'atrium', name: '星系儀アトリウム', x: 10, z: 28, w: 22, d: 22, h: 13, sky: true,
      props: [['holo', 11, 11, 0, { kind: 'system', s: 2.3, y: 4.2, use: 'map', label: '星系儀を見る' }], ['pillar', 3, 3, 0], ['pillar', 19, 3, 0], ['pillar', 3, 19, 0], ['pillar', 19, 19, 0], ['bench', 11, 4, 0], ['bench', 11, 18, 2],
        ['planter', 1, 11, 1, { w: 6 }], ['planter', 21, 16, 1, { w: 5 }], T('任務端末', 'missions', 17, 2, 0), ['lightcone', 11, 11, 0, { r: 4, k: 0.2, c: '#8feaff' }]] },
    { id: 'lab', name: '研究ラボ', x: 32, z: 30, w: 18, d: 16, h: 5,
      props: [T('研究ラボ', 'lab', 4, 12.5, 0, { kind: 'graph' }), ['tank', 5, 2, 0, { c: '#6fe' }], ['tank', 8, 2, 0, { c: '#f84' }], ['tank', 11, 2, 0, { c: '#c6f' }], ['tank', 14, 2, 0, { c: '#fd4' }], ['console', 14, 8, 3, { tall: 1, kind: 'graph' }], ['desk', 9, 9, 0, { kind: 'graph' }],
        ['medpod', 15.5, 13.5, 0], ['rack', 1, 6, 1, { n: 2 }], N('主任研究員', 'lab', 6, 9, 1.5, 0xf0f4f8)] },
    { id: 'obs', name: '大観測室', x: -12, z: 30, w: 22, d: 18, h: 9, win: [['w', 1.5, 16.5, 0.6, 7.8], ['n', 2, 14, 0.6, 7.8]], floor: ['carpet', 0x1a3048, 1, 0],
      props: [['telescope', 9, 9, 3], ['console', 15, 5, 3, { tall: 1, kind: 'orbit' }], ['console', 15, 13, 3, { tall: 1, kind: 'radar' }], ['sofa', 5, 15, 2, { c: 0x2a4a6a }], ['wallscreen', 21.7, 9, 3, { w: 6, h: 3, y: 4.2, kind: 'orbit', title: '深宇宙観測' }], ['holo', 4, 4, 0, { kind: 'planet', s: 0.7, c: '#bfe9ff' }]] },
    { id: 'hab', name: '居住区・水耕室', x: 12, z: 50, w: 18, d: 12, h: 4.5, lamp: '#ffeedd',
      props: [['hydro', 3, 1, 0, { w: 4 }], ['hydro', 9, 1, 0, { w: 4 }], ['bed', 16, 3, 0], ['kitchen', 14, 11.3, 2, { w: 3.4 }], ['table', 6, 7.5, 0], ['plant', 1.2, 10.8, 0, { s: 1.3 }], ['locker', 1, 5.5, 1, { n: 3 }]] },
  ],
  doors: [['hangar', 'atrium', 21, 4, 3.5], ['atrium', 'lab', 38, 2.4], ['atrium', 'obs', 39, 2.6, 2.8], ['atrium', 'hab', 21, 2.4]],
});

const bastion = () => ({
  name: 'バスティオン要塞', sub: '星系防衛軍', seed: 44, spawn: [31, 22, -2.2], view: [1, 0], music: 'interior',
  theme: { wall: ['wall', 0x5e646e, 0.75, 0.5], floor: ['plate', 0x5c6068, 0.45, 0.75], ceil: ['ceil', 0x30343a], trim: '#ff5a3a', lamp: '#ffd8c8', frame: 0x1c1e22, door: 0x4a3030, amb: [0xff9a80, 0x1c1c20, 0.6], gloss: 0.6 },
  rooms: [
    { id: 'hangar', name: '戦闘機格納庫', x: 0, z: 0, w: 40, d: 30, h: 14, li: 1.6, win: [['n', 6, 34, 2.5, 10]],
      props: [['shipslot', 20, 14, 0, { r: 11 }], T('格納庫サービス', 'shipyard', 35, 25, 0), ['cargo', 4, 6, 0, { c: 0x4a5a3a }], ['cargo', 4, 20, 0, { c: 0x4a5a3a }], ['crate', 36, 5, 0, { n: 6 }], ['weaponrack', 20, 29.7, 2], ['barrel', 9, 27, 0],
        S('BASTION', 20, 29.6, 2, { h: 1.7, y: 9, c: '#ff5a3a' }), S('星系防衛軍 第 7 艦隊', 20, 29.6, 2, { h: 0.7, y: 7.1, c: '#ffd0c0' }), N('衛兵', 'talk:guard', 37.5, 14, -1.57, 0x4a5a3a)] },
    { id: 'hall', name: '保安通路', x: 40, z: 10, w: 18, d: 5, h: 3.6, floor: ['grate', 0x8a8f96, 0.6, 0.7],
      props: [['locker', 5, 0.5, 0, { n: 4 }], ['pipes', 13, 0.4, 0], S('司令部 →', 14, 4.75, 2, { h: 0.4, y: 2.9 }), S('← 格納庫', 4, 4.75, 2, { h: 0.4, y: 2.9, c: '#ffd0c0' })] },
    { id: 'cmd', name: '戦術司令部', x: 58, z: 0, w: 24, d: 20, h: 7, win: [['e', 3, 17, 1.2, 6]], floor: ['hex', 0x4a4e56, 0.3, 0.6],
      props: [['holo', 12, 10, 0, { kind: 'fleet', s: 1.7, y: 2.6, c: '#ff5a3a', use: 'bounty', label: '戦術ホロ：敵艦隊' }], ['console', 6, 5, 0.5, { tall: 1, kind: 'radar' }], ['console', 18, 5, -0.5, { tall: 1, kind: 'graph' }], ['console', 6, 15, 1.5, { tall: 1, kind: 'bars' }], ['console', 18, 15, 2.5, { tall: 1, kind: 'orbit' }],
        ['wallscreen', 12, 0.3, 0, { w: 9, h: 3.4, y: 4.2, kind: 'radar', title: '星系監視網' }], T('任務端末', 'missions', 3, 17.5, 0), N('司令官', 'bounty', 12, 16, 2, 0x8a1c1c), ['seat', 12, 14, 2]] },
    { id: 'arm', name: '兵装庫', x: 40, z: 15, w: 18, d: 14, h: 4.5,
      props: [['weaponrack', 4, 0.25, 0], ['weaponrack', 9, 0.25, 0], ['weaponrack', 14, 0.25, 0], T('兵装整備', 'shipyard', 3, 11, 1), ['crate', 14, 10, 0, { n: 6 }], ['locker', 17.5, 6, 3, { n: 5 }], ['rack', 1, 5, 1, { n: 2 }], N('兵器係', 'talk:arm', 7, 8, 1.2, 0x5a5a5a)] },
    { id: 'brig', name: '営倉', x: 58, z: 20, w: 16, d: 10, h: 4,
      props: [['cell', 3, 2, 0], ['cell', 8, 2, 0], ['cell', 13, 2, 0], N('捕虜の海賊', 'talk:prisoner', 8, 1.6, 0, 0x5a2a6a, { visor: '#f4c' }), ['console', 13, 8, 2, { kind: 'data' }]] },
    { id: 'mess', name: '兵員室', x: 40, z: 29, w: 18, d: 9, h: 4,
      props: [['bunk', 2, 2.5, 0], ['bunk', 5, 2.5, 0], ['bunk', 8, 2.5, 0], ['kitchen', 14.5, 0.6, 0, { w: 3 }], ['table', 13, 6, 0], ['medpod', 2, 7, 1]] },
  ],
  doors: [['hangar', 'hall', 12.5, 2.4], ['hall', 'cmd', 12.5, 2.4], ['hall', 'arm', 49, 2.2], ['cmd', 'brig', 66, 2.2], ['arm', 'mess', 49, 2.2]],
});

const rogue = () => ({
  name: "ローグズ・デン", sub: '無法者の巣', seed: 55, spawn: [29, 21, -2.2], view: [1, 0], music: 'neon',
  theme: { wall: ['rock', 0x7a685c, 1, 0.05], floor: ['concrete', 0x5a5a62, 0.38, 0.25], ceil: ['rock', 0x3a3430], trim: '#ff4df0', lamp: '#ffd0f0', frame: 0x2a2228, door: 0x503848, amb: [0xa060c0, 0x241a24, 0.6], gloss: 1.1 },
  rooms: [
    { id: 'hangar', name: '洞窟ドック', x: 0, z: 0, w: 38, d: 28, h: 13, li: 1.5, win: [['n', 8, 30, 2.5, 9]],
      props: [['shipslot', 19, 13, 0, { r: 10.5 }], T('格納庫サービス', 'shipyard', 33, 23.5, 0, { c: '#4df0ff' }), ['cargo', 4, 6, 0], ['cargo', 4, 13, 0.1], ['crate', 34, 5, 0, { n: 6 }], ['barrel', 30, 3, 0], ['barrel', 5, 24, 0], ['crate', 9, 25, 0, { n: 4 }],
        S("ROGUE'S DEN", 19, 27.6, 2, { h: 1.6, y: 8.5, frame: 1 }), S('酒 · 賭場 · 闇市 →', 37.7, 11, 3, { h: 0.7, y: 4, c: '#4df0ff', flicker: 1 }), N('用心棒', 'talk:thug', 35, 14, -1.57, 0x3a2a2a, { visor: '#f43' }), ['steam', 12, 6, 0], ['steam', 26, 22, 0]] },
    { id: 'bar', name: 'バー「ネビュラ」', x: 38, z: 2, w: 22, d: 18, h: 5, floor: ['wood', 0x9a8a80, 0.3, 0.1], lamp: '#ff9ad8',
      props: [['barcounter', 11, 2.4, 0, { w: 8, c: '#ff4df0' }], N('バーテンダー', 'bar', 11, 1.3, 0, 0x2a2a3a, { visor: '#4df0ff' }), ['stage', 17.5, 13.5, 0, { c: '#4df0ff' }], ['table', 5, 8, 0, { wood: 1, c: '#ff4df0' }], ['table', 10, 12, 0, { wood: 1, c: '#4df0ff' }], ['table', 5, 14.5, 0, { wood: 1, c: '#ffe14d' }],
        ['sofa', 1.3, 11, 1, { c: 0x6a1a4a }], ['arcade', 21.4, 5, 3], ['arcade', 21.4, 7, 3, { c: '#f4c', title: 'NEON RUN' }], S('BAR NEBULA', 11, 0.3, 0, { h: 0.7, y: 4.1, frame: 1 }), S('酒', 21.7, 10, 3, { h: 1.2, y: 3.4, c: '#4df0ff', flicker: 1 }), N('常連客', 'talk:drunk', 6.5, 8, 2, 0x6a5a2a)] },
    { id: 'casino', name: 'カジノ', x: 60, z: 2, w: 16, d: 18, h: 5, floor: ['carpet', 0x6a1420, 1, 0], win: [['e', 3, 15, 1, 4.2]], trim: '#ffe14d', lamp: '#ffe8a0',
      props: [['slot', 3, 4, 0], ['slot', 5, 4, 0], ['slot', 7, 4, 0], ['slot', 3, 10, 2], ['slot', 5, 10, 2], ['slot', 7, 10, 2], ['pillar', 11, 7, 0, { c: '#ffe14d' }], ['sofa', 12, 15.5, 2, { c: 0x8a6a1a }], S('CASINO', 8, 0.3, 0, { h: 0.9, y: 3.9, c: '#ffe14d', frame: 1 }), N('ディーラー', 'talk:dealer', 5, 7, 0, 0x8a1420, { visor: '#ffe14d' }), ['plant', 14.5, 1.5, 0, { s: 1.3, dark: 1 }]] },
    { id: 'black', name: '闇市', x: 38, z: 20, w: 20, d: 12, h: 4, lamp: '#ffb080',
      props: [['stall', 5, 2.2, 0, { c: 0x5a2a6a, use: 'market', label: '闇市' }], ['stall', 12, 2.2, 0, { c: 0x2a5a6a }], ['stall', 16, 9, 2, { c: 0x6a5a2a }], ['crate', 3, 9, 0, { n: 5 }], N('情報屋', 'broker', 9.5, 8.5, 2.6, 0x2a2a2a, { visor: '#f43' }), T('任務端末', 'missions', 18, 4, 3, { c: '#4df0ff' }), S('闇市', 10, 11.7, 2, { h: 0.8, y: 3, c: '#ff5a3a', flicker: 1 }), ['locker', 0.6, 5, 1, { n: 4 }]] },
  ],
  doors: [['hangar', 'bar', 11, 3, 2.8], ['bar', 'casino', 11, 2.6], ['bar', 'black', 48, 2.4]],
});

// ───────────────────────── 主人公機の船内 ─────────────────────────
const hayate = () => ({
  name: 'ハヤテ 船内', sub: '高機動迎撃機', seed: 61, spawn: [2.5, 3.6, 0], view: [0, -1], music: 'interior',
  theme: { wall: ['wall', 0xb9c0c8, 0.7, 0.4], floor: ['plate', 0x7a8088, 0.5, 0.7], ceil: ['ceil', 0x6a7078], trim: '#ff8a2a', lamp: '#fff0e0', amb: [0xffe0c0, 0x34383c, 0.8], gloss: 0.5 },
  rooms: [
    { id: 'cockpit', name: 'コックピット', x: 0, z: 0, w: 5, d: 5, h: 2.5, win: [['n', 0.5, 4.5, 1.0, 2.2], ['w', 0.5, 3.6, 1.1, 2.15], ['e', 0.5, 3.6, 1.1, 2.15]],
      props: [['seat', 2.5, 2.2, 2, { use: 'pilot', label: '操縦席に座る', c: 0x3a2418 }], ['console', 2.5, 0.75, 0, { kind: 'radar' }], ['console', 0.75, 4.1, 1, { kind: 'graph' }], ['console', 4.25, 4.1, 3, { kind: 'bars' }]] },
    { id: 'cabin', name: 'キャビン', x: 0, z: 5, w: 5, d: 7, h: 2.5,
      props: [['bed', 0.9, 2.2, 0, { c: 0xc05a1a }], ['locker', 4.45, 1.6, 3, { n: 2 }], ['kitchen', 4.35, 4.2, 3, { w: 1.8 }], ['exit', 2.5, 6.8, 2, { label: 'エアロックから出る' }], T('船体状況', 'status', 1.0, 5.4, 1, { kind: 'graph' })] },
  ],
  doors: [['cockpit', 'cabin', 2.5, 1.5, 2.15]],
});

const raiden = () => ({
  name: 'ライデン 船内', sub: '重装ガンシップ', seed: 62, spawn: [4.5, 5, 0], view: [0, -1], music: 'interior',
  theme: { wall: ['wall', 0x4e545c, 0.75, 0.5], floor: ['grate', 0x8a8f96, 0.6, 0.7], ceil: ['rib', 0x34383e], trim: '#ff3b2a', lamp: '#ffc8b0', frame: 0x16181c, door: 0x4a2a2a, amb: [0xff8060, 0x18181c, 0.55], gloss: 0.35 },
  rooms: [
    { id: 'bridge', name: '艦橋', x: 0, z: 0, w: 9, d: 8, h: 3.2, floor: ['plate', 0x5a5e66, 0.45, 0.7], win: [['n', 1, 8, 1.1, 2.75], ['w', 1, 5, 1.3, 2.6], ['e', 1, 5, 1.3, 2.6]],
      props: [['seat', 4.5, 3.2, 2, { use: 'pilot', label: '操縦席に座る', c: 0x3a1414 }], ['console', 4.5, 1.0, 0, { tall: 0, kind: 'radar' }], ['console', 1.3, 4.2, 1, { tall: 1, kind: 'graph' }], ['console', 7.7, 4.2, 3, { tall: 1, kind: 'bars' }], ['seat', 2.4, 4.2, 3], ['seat', 6.6, 4.2, 1], T('星図', 'map', 7.8, 7, 3, { kind: 'orbit' })] },
    { id: 'hall', name: '中央通路', x: 3, z: 8, w: 3, d: 10, h: 2.8, props: [['pipes', 2.7, 5, 3]] },
    { id: 'arm', name: '兵装庫', x: -4, z: 9, w: 7, d: 7, h: 2.8,
      props: [['weaponrack', 3.5, 0.25, 0], ['weaponrack', 0.25, 3.5, 1], ['locker', 3.5, 6.5, 2, { n: 4 }], ['crate', 1.6, 5.2, 0, { n: 2 }], T('弾薬補給', 'ammo', 5.6, 1.4, 3)] },
    { id: 'crew', name: '兵員室', x: 6, z: 9, w: 7, d: 7, h: 2.8, lamp: '#ffe0c8',
      props: [['bunk', 5.9, 1.6, 0], ['bunk', 5.9, 5.2, 0, { use: false }], ['locker', 2.5, 0.5, 0, { n: 3 }], ['table', 2.6, 4.6, 0, { n: 3 }]] },
    { id: 'eng', name: '機関室', x: -2, z: 18, w: 13, d: 10, h: 6.5,
      props: [['reactor', 6.5, 5, 0, { c: '#ff9a3a' }], ['rack', 1, 2, 1, { n: 2 }], ['rack', 12, 2, 3, { n: 2 }], ['pipes', 0.4, 7, 1], ['pipes', 12.6, 7, 3], T('船体状況', 'status', 2.2, 8.4, 1, { kind: 'graph' })] },
    { id: 'cargo', name: '貨物室', x: -2, z: 28, w: 13, d: 9, h: 4.5, floor: ['plate', 0x6a6e76, 0.5, 0.7],
      props: [['cargo', 2, 4, 0, { c: 0x4a5a3a }], ['crate', 10.5, 2.4, 0, { n: 5 }], ['barrel', 10, 6.5, 0], ['exit', 6.5, 8.8, 2, { label: 'エアロックから出る', w: 2.6 }]] },
  ],
  doors: [['bridge', 'hall', 4.5, 1.8, 2.3], ['hall', 'arm', 12.5, 1.6, 2.2], ['hall', 'crew', 12.5, 1.6, 2.2], ['hall', 'eng', 4.5, 1.8, 2.3], ['eng', 'cargo', 4.5, 2.6, 2.5]],
});

const amatsu = () => ({
  name: 'アマツ 船内', sub: '長距離探査船', seed: 63, spawn: [6, 6.5, 0], view: [0, -1], music: 'interior',
  theme: { wall: ['wall', 0xf4f1ea, 0.5, 0.1], floor: ['wood', 0xffffff, 0.4, 0], ceil: ['ceil', 0xd8d4cc], trim: '#35e0c8', lamp: '#fff6e6', frame: 0x8a7a5a, door: 0xd8c8a8, amb: [0xfff0d8, 0x645c4c, 1.0], gloss: 0.7 },
  rooms: [
    { id: 'bridge', name: '展望艦橋', x: 0, z: 0, w: 12, d: 10, h: 4.5, sky: true, win: [['n', 1, 11, 0.7, 4], ['w', 1, 8.5, 0.7, 4], ['e', 1, 8.5, 0.7, 4]],
      props: [['seat', 6, 3.6, 2, { use: 'pilot', label: '操縦席に座る', c: 0xe8e0d0 }], ['console', 6, 1.5, 0, { kind: 'orbit' }], ['console', 2.4, 3, 0.6, { kind: 'graph' }], ['console', 9.6, 3, -0.6, { kind: 'radar' }], ['holo', 6, 7.4, 0, { kind: 'system', s: 0.75, y: 1.7, use: 'map', label: '星図を開く' }], ['plant', 1.1, 9, 0], ['plant', 10.9, 9, 0]] },
    { id: 'lounge', name: 'ラウンジ', x: 0, z: 10, w: 12, d: 12, h: 3.6,
      props: [['sofa', 6, 9.5, 2, { c: 0xd8c8a8, w: 3.4 }], ['sofa', 3.2, 7, 1, { c: 0xd8c8a8 }], ['table', 6, 7, 0, { wood: 1, n: 0 }], ['aquarium', 0.8, 3.5, 1, { w: 4 }], ['barcounter', 9.3, 2.2, 0, { w: 3.2, c: '#35e0c8' }], ['vending', 11.3, 8.5, 3, { label: 'ドリンクバー (20 Cr)' }], ['plant', 11, 11, 0, { s: 1.3 }], ['wallscreen', 6, 11.7, 2, { w: 3.6, h: 1.6, y: 2.2, kind: 'orbit', title: '航路' }]] },
    { id: 'garden', name: '船内庭園', x: 12, z: 8, w: 11, d: 14, h: 5.5, sky: true, floor: ['tile', 0xe6efe2, 0.35, 0.1], lamp: '#f4ffe8',
      props: [['tree', 5.5, 4, 0], ['tree', 6, 10.5, 0, { s: 0.9 }], ['planter', 10.3, 7, 1, { w: 9, flowers: 1 }], ['hydro', 2, 12.6, 2, { w: 3, use: 'harvest', label: '野菜を収穫する' }], ['bench', 2.2, 7, 1, { c: 0x6a8a4a }], ['steam', 8.5, 12, 0], ['lightcone', 5.5, 7, 0, { r: 3, k: 0.22 }]] },
    { id: 'lab', name: '分析室', x: -10, z: 10, w: 10, d: 9, h: 3.4, floor: ['hex', 0xe2ebf2, 0.28, 0.3],
      props: [['tank', 1.6, 1.5, 0, { c: '#6fe' }], ['tank', 3.6, 1.5, 0, { c: '#fd4' }], ['console', 7, 1.2, 0, { tall: 1, kind: 'graph' }], ['desk', 6.5, 6.5, 2], T('標本分析', 'lab', 1.5, 6.5, 1, { kind: 'graph' }), ['rack', 9.3, 4.5, 3, { n: 2 }]] },
    { id: 'cabin', name: '船長室', x: -10, z: 19, w: 10, d: 7, h: 3.2, floor: ['carpet', 0x2a4a5a, 1, 0],
      props: [['bed', 1.2, 3.6, 0, { c: 0x2a7a6a }], ['desk', 6.5, 1.2, 0, { wood: 1 }], ['plant', 9, 6, 0, { s: 1.2 }], ['locker', 9.4, 3.5, 3, { n: 2 }], ['wallscreen', 4.5, 6.75, 2, { w: 2.6, h: 1.3, y: 1.9, kind: 'orbit', title: '航海日誌' }], T('船体状況', 'status', 3.6, 1, 0, { kind: 'graph' })] },
    { id: 'cargo', name: '貨物室', x: 0, z: 22, w: 12, d: 9, h: 4.5, floor: ['plate', 0x9aa2ad, 0.5, 0.6],
      props: [['cargo', 2.2, 4, 0, { c: 0x2e7ab8 }], ['crate', 9.5, 2.5, 0, { n: 5 }], ['crate', 9.5, 6.5, 0, { n: 3 }], ['exit', 6, 8.8, 2, { label: 'エアロックから出る', w: 2.6, c: '#35e0c8' }]] },
  ],
  doors: [['bridge', 'lounge', 6, 2, 2.5], ['lounge', 'garden', 15, 2, 2.5], ['lounge', 'lab', 14, 1.8, 2.3], ['lab', 'cabin', -5, 1.6, 2.2], ['lounge', 'cargo', 6, 2.6, 2.5]],
});

// ───────────────────────── 惑星拠点 ─────────────────────────
const OUT = {
  terra: () => ({
    name: 'ネオン・ベイ・ターミナル', sub: '地球・宇宙港', seed: 71, spawn: [11, 12.5, 0], music: 'neon',
    theme: { wall: ['wall', 0x2c3444, 0.5, 0.6], floor: ['tile', 0x2c3038, 0.1, 0.5], ceil: ['ceil', 0x20242c], trim: '#ff3df0', lamp: '#cfe0ff', frame: 0x14161c, amb: [0x6080ff, 0x24182e, 0.75], gloss: 1.4 },
    rooms: [
      { id: 'lobby', name: '到着ロビー', x: 0, z: 0, w: 22, d: 16, h: 7, win: [['n', 2, 20, 0.5, 6.2]],
        props: [['barcounter', 5.5, 2.4, 0, { w: 5, c: '#ffb347' }], N('ラーメン屋の店主', 'ramen', 5.5, 1.3, 0, 0xc04a2a, { visor: '#ffb347' }), S('ラーメン', 5.5, 0.3, 0, { h: 0.8, y: 4.3, c: '#ffb347', frame: 1 }), S('NEON BAY', 15, 0.3, 0, { h: 1.0, y: 5.2, c: '#4df0ff', frame: 1 }), S('到着 ARRIVALS', 15, 0.3, 0, { h: 0.5, y: 4.0 }),
          T('交易所', 'market', 19.5, 6, 3, { c: '#4df0ff' }), ['table', 11, 8, 0, { c: '#ff3df0' }], ['table', 16, 11, 0, { c: '#4df0ff' }], ['bench', 2.5, 9, 1], ['vending', 21.3, 12, 3], ['vending', 21.3, 13.3, 3, { c: '#f4c', title: 'SNACK' }], ['pillar', 8, 12.5, 0], ['pillar', 14, 12.5, 0, { c: '#4df0ff' }],
          ['plant', 1.2, 14.6, 0, { s: 1.4, dark: 1 }], ['exit', 11, 15.8, 2, { label: '外へ出る', sign: '出口 EXIT', w: 3 }], N('旅行者', 'talk:tourist', 13, 5, 2.4, 0x3a6ea8)] },
      { id: 'shop', name: 'アーケード街', x: 22, z: 2, w: 12, d: 12, h: 5, trim: '#4df0ff',
        props: [['arcade', 2, 0.9, 0], ['arcade', 3.2, 0.9, 0, { c: '#f4c', title: 'NEON RUN' }], ['arcade', 4.4, 0.9, 0, { c: '#fd4', title: 'ASTRO' }], ['stall', 9, 2.2, 0, { c: 0x6a2a8a }], ['slot', 10.8, 8, 3], ['slot', 10.8, 9.2, 3], ['sofa', 5, 10.6, 2, { c: 0x5a1a6a }], S('GAME', 6, 0.3, 0, { h: 0.7, y: 3.8, c: '#4df0ff', flicker: 1 })] },
    ],
    doors: [['lobby', 'shop', 8, 2.6]],
  }),
  ignis: () => ({
    name: 'フォージ採掘基地', sub: 'イグニス・溶岩平原', seed: 72, spawn: [8, 9, 0], music: 'interior',
    theme: { wall: ['rib', 0x6a5648, 0.8, 0.6], floor: ['grate', 0x9a8a80, 0.6, 0.7], ceil: ['rock', 0x2a2420], trim: '#ff6a1e', lamp: '#ffc890', frame: 0x1c1614, door: 0x5a3a2a, amb: [0xff7040, 0x1c1410, 0.6], gloss: 0.4 },
    rooms: [
      { id: 'ctrl', name: '精錬管制室', x: 0, z: 0, w: 16, d: 12, h: 5, win: [['n', 2, 14, 1, 4.2]],
        props: [['console', 4, 1.6, 0, { tall: 1, kind: 'graph' }], ['console', 8, 1.6, 0, { tall: 1, kind: 'bars' }], ['console', 12, 1.6, 0, { tall: 1, kind: 'radar' }], T('鉱石取引所', 'market', 14, 7, 3), ['barrel', 1.5, 6, 0], ['pipes', 0.4, 9, 1, { c: 0xc9a22e }], ['crate', 3, 10, 0, { n: 3 }],
          ['exit', 8, 11.8, 2, { label: '外へ出る (耐熱服)', sign: '高温注意', c: '#ff6a1e' }], N('採掘班長', 'talk:miner', 11, 6, 2.6, 0xc06a1a, { visor: '#ff6a1e' }), ['steam', 6, 6, 0]] },
      { id: 'bunk', name: '仮眠室', x: 16, z: 0, w: 8, d: 8, h: 3.5, lamp: '#ffe0c0',
        props: [['bunk', 6.9, 2, 0], ['locker', 3, 0.5, 0, { n: 3 }], ['kitchen', 3.5, 7.4, 2, { w: 2.6 }], ['table', 3, 4, 0, { n: 2 }]] },
    ],
    doors: [['ctrl', 'bunk', 4, 2]],
  }),
  sahar: () => ({
    name: 'オアシス・コロニー', sub: 'サハル・居住ドーム', seed: 73, spawn: [9, 14.5, 0], music: 'interior',
    theme: { wall: ['concrete', 0xdcc8a4, 0.9, 0.05], floor: ['tile', 0xc8a070, 0.45, 0.1], ceil: ['wood', 0xffffff], trim: '#ffcf6a', lamp: '#fff0d0', frame: 0x6a5234, door: 0xa88a5a, amb: [0xffe8c0, 0x74603c, 1.15], gloss: 0.5 },
    rooms: [
      { id: 'dome', name: '緑のドーム', x: 0, z: 0, w: 18, d: 18, h: 9, sky: true,
        props: [['tree', 5, 5, 0, { s: 1.15 }], ['tree', 13, 6, 0], ['tree', 9, 11, 0, { s: 0.9 }], ['planter', 0.9, 9, 1, { w: 8, flowers: 1 }], ['planter', 17.1, 9, 1, { w: 8, flowers: 1 }], ['bench', 5, 9.5, 0, { c: 0xa85a2a }], ['bench', 13, 12, 2, { c: 0xa85a2a }],
          ['stall', 13, 2.2, 0, { c: 0xc9a22e, use: 'market', label: '香料市場' }], ['tank', 2, 2, 0, { c: '#4cf' }], ['exit', 9, 17.8, 2, { label: '外へ出る', sign: '砂嵐注意', c: '#ffcf6a', w: 2.6 }], N('入植者', 'talk:colonist', 7, 13, 2.5, 0xc8a070), N('香料商', 'market', 13, 3.6, 2, 0x8a5a2a), ['lightcone', 9, 9, 0, { r: 4, k: 0.3, c: '#fff0c0' }]] },
      { id: 'guest', name: '客室', x: 18, z: 4, w: 9, d: 9, h: 4, floor: ['carpet', 0x8a4a2a, 1, 0],
        props: [['bed', 7.4, 2.2, 0, { c: 0xc8782a }], ['sofa', 2.5, 7.8, 2, { c: 0xa85a2a }], ['table', 3, 3.5, 0, { wood: 1, n: 2 }], ['plant', 8, 8, 0, { s: 1.2 }]] },
    ],
    doors: [['dome', 'guest', 8.5, 2.2]],
  }),
  zephyr: () => ({
    name: 'クラウドデッキ', sub: 'ゼファー・雲海ラウンジ', seed: 74, spawn: [12, 11, 0], music: 'interior',
    theme: { wall: ['wall', 0x2c4a50, 0.5, 0.5], floor: ['hex', 0xd8c090, 0.22, 0.6], ceil: ['ceil', 0x1c3036], trim: '#ffd27a', lamp: '#fff0c8', frame: 0x8a6a2a, door: 0x3a5a5a, amb: [0xffe0a0, 0x243840, 0.95], gloss: 1.1 },
    rooms: [
      { id: 'lounge', name: 'スカイラウンジ', x: 0, z: 0, w: 24, d: 14, h: 7, win: [['n', 1.5, 22.5, 0.4, 6.3], ['w', 1.5, 12.5, 0.4, 6.3]],
        props: [['sofa', 6, 3.5, 0, { c: 0x1a5a5a, w: 3 }], ['sofa', 12, 3.5, 0, { c: 0x1a5a5a, w: 3 }], ['sofa', 18, 3.5, 0, { c: 0x1a5a5a, w: 3 }], ['table', 9, 6.5, 0, { c: '#ffd27a' }], ['table', 15, 6.5, 0, { c: '#ffd27a' }], ['pillar', 4, 9, 0, { c: '#ffd27a' }], ['pillar', 20, 9, 0, { c: '#ffd27a' }],
          ['barcounter', 19, 11.2, 2, { w: 5, c: '#ffd27a' }], N('バーテンダー', 'bar', 19, 12.3, 2, 0x1a3a3a, { visor: '#ffd27a' }), ['holo', 3, 11, 0, { kind: 'planet', s: 0.8, c: '#7fc8e8' }], T('希ガス取引所', 'market', 8, 12.6, 2), ['exit', 12.5, 13.8, 2, { label: 'デッキへ出る', sign: '展望デッキ', c: '#ffd27a', w: 2.6 }], ['plant', 22.8, 1.4, 0, { s: 1.4, dark: 1 }]] },
      { id: 'ref', name: '採取制御室', x: 24, z: 0, w: 10, d: 10, h: 5,
        props: [['tank', 2, 1.6, 0, { c: '#7fc8e8' }], ['tank', 4.2, 1.6, 0, { c: '#c6f' }], ['tank', 6.4, 1.6, 0, { c: '#fd4' }], ['console', 5, 7.5, 2, { tall: 1, kind: 'graph' }], ['pipes', 9.6, 5, 3], ['bunk', 1, 7, 0]] },
    ],
    doors: [['lounge', 'ref', 5, 2.2]],
  }),
  glacies: () => ({
    name: '氷床研究所', sub: 'グラキエス・観測拠点', seed: 75, spawn: [8, 9, 0], music: 'interior',
    theme: { wall: ['wood', 0xe8d8c0, 0.8, 0], floor: ['carpet', 0x7a3a2a, 1, 0], ceil: ['wood', 0xb89870], trim: '#a6f0ff', lamp: '#ffe8c8', frame: 0x5a4632, door: 0xa88a6a, amb: [0xffe0c0, 0x444c5c, 0.95], gloss: 0.2 },
    rooms: [
      { id: 'main', name: '観測室', x: 0, z: 0, w: 16, d: 12, h: 4.2, win: [['n', 2, 14, 0.9, 3.5], ['w', 2, 9, 0.9, 3.5]],
        props: [['desk', 4, 2, 0, { wood: 1, kind: 'graph' }], ['desk', 11, 2, 0, { wood: 1, kind: 'orbit' }], ['tank', 14.5, 5, 0, { c: '#a6f0ff' }], ['tank', 14.5, 7.2, 0, { c: '#6fe' }], ['sofa', 3, 9.8, 2, { c: 0x8a3a2a }], ['kitchen', 1, 6, 1, { w: 2.6 }], ['plant', 15, 10.8, 0, { s: 1.2 }],
          T('氷晶取引所', 'market', 11.5, 10.4, 2), ['wallscreen', 15.7, 2.5, 3, { w: 2.6, h: 1.4, y: 2.2, kind: 'graph', title: '気温 -142℃' }], ['exit', 8, 11.8, 2, { label: '外へ出る (防寒服)', sign: '極寒注意', c: '#a6f0ff' }], N('観測員', 'talk:ice', 8, 5, 2.8, 0x3a6a9a)] },
      { id: 'sleep', name: '寝室', x: 16, z: 2, w: 8, d: 8, h: 3.4,
        props: [['bunk', 6.9, 2, 0, { c: 0x2a4a7a }], ['locker', 3, 0.5, 0, { n: 3 }], ['rack', 1, 6, 1, { n: 1 }], ['plant', 7, 7, 0]] },
    ],
    doors: [['main', 'sleep', 6, 2]],
  }),
};

// ───────────────────────── 敵艦内 (シードから生成・20 隻すべて異なる) ─────────────────────────
function enemyBP(def) {
  const r = rng(def.seed * 7 + 3), gc = new THREE.Color(def.glow), dark = (k, base) => new THREE.Color(base).lerp(gc, k).getHex();
  const ws = pick(r, ['wall', 'rib', 'rock', 'wall']), fs = pick(r, ['grate', 'plate', 'hex', 'concrete']);
  const theme = { wall: [ws, dark(0.14, ws === 'rock' ? 0x5a4a50 : 0x4a4e58), 0.8, 0.5], floor: [fs, dark(0.08, 0x6a6e76), 0.45, 0.7], ceil: [pick(r, ['ceil', 'rib', 'rock']), dark(0.1, 0x2a2c32)], trim: def.glow, lamp: '#' + new THREE.Color(def.glow).lerp(new THREE.Color('#fff'), 0.55).getHexString(),
    frame: 0x121316, door: dark(0.3, 0x3a3a40), amb: [dark(0.6, 0x404050), 0x0c0c10, 0.42], gloss: 0.5 };
  const n = 2 + def.tier + (r() < 0.5 ? 1 : 0), cw = 3 + (r() < 0.4 ? 1 : 0), hw = cw / 2, kinds = ['barracks', 'armory', 'cargo', 'medbay', 'reactor', 'brig', 'lab'].sort(() => r() - 0.5).slice(0, n);
  const len = 4 + Math.ceil(n / 2) * 8, bw = rr(r, 10, 13), bd = rr(r, 8, 10), rooms = [], doors = [], drones = [];
  rooms.push({ id: 'lock', name: 'エアロック', x: -3, z: 0, w: 6, d: 5, h: 3, props: [['exit', 3, 4.8, 2, { label: '自船へ戻る', sign: 'AIRLOCK', c: def.glow }], ['locker', 0.5, 2.5, 1, { n: 3 }], ['crate', 4.8, 1.4, 0, { n: 2 }]] });
  rooms.push({ id: 'hall', name: '通路', x: -hw, z: -len, w: cw, d: len, h: rr(r, 2.8, 3.4), props: [] }); doors.push(['hall', 'lock', 0, 1.8, 2.3]);
  drones.push([0, -len * 0.5]);
  kinds.forEach((k, i) => {
    const west = i % 2 === 0, w = rr(r, 6.5, 9), d = 7, z = -(3 + Math.floor(i / 2) * 8) - d, x = west ? -hw - w : hw, h = k === 'reactor' ? 6 : rr(r, 2.9, 4), id = 'r' + i, P = [];
    const X = (v) => (west ? w - v : v), rot = (q) => (west ? (4 - q) % 4 : q); // 東西で鏡写し
    if (k === 'barracks') { P.push(['bunk', X(w - 1), 1.6, 0, { use: false }], ['bunk', X(w - 1), 5, 0, { use: false }], ['locker', X(w / 2), 0.5, 0, { n: 3 }], ['table', X(w / 2 - 0.5), 4.2, 0, { n: 3 }]); }
    else if (k === 'armory') { P.push(['weaponrack', w / 2, 0.25, 0, { c: def.glow }], ['weaponrack', X(w - 0.25), 3.5, rot(3), { c: def.glow }], ['crate', X(w - 1.8), 5.4, 0, { n: 4 }], ['locker', w / 2, 6.5, 2, { n: 3 }]); }
    else if (k === 'cargo') { P.push(['crate', X(w - 1.8), 1.8, 0, { n: 5 }], ['crate', X(w - 1.8), 5.2, 0, { n: 4 }], ['barrel', X(2.4), 5.6, 0], ['terminal', X(w / 2), 0.8, 0, { label: '貨物を略奪', use: 'loot', kind: 'bars', id: def.id + id }]); }
    else if (k === 'medbay') { P.push(['medpod', X(w - 1.2), 2, 0], ['tank', X(w - 1.2), 5.4, 0, { c: def.glow }], ['rack', w / 2, 0.6, 0, { n: 2 }]); }
    else if (k === 'reactor') { P.push(['reactor', X(w / 2 + 0.6), 3.5, 0, { c: def.glow }], ['pipes', X(w - 0.4), 1.2, rot(3)], ['rack', w / 2, 6.5, 2, { n: 2 }]); }
    else if (k === 'brig') { P.push(['cell', X(w - 1.9), 1.6, rot(3)], ['console', X(2.2), 5.6, 2, { kind: 'data' }]); }
    else { P.push(['tank', X(w - 1), 1.4, 0, { c: def.glow }], ['tank', X(w - 1), 3.5, 0, { c: '#6fe' }], ['tank', X(w - 1), 5.6, 0, { c: '#fd4' }], ['console', w / 2, 1, 0, { tall: 1, kind: 'graph' }]); }
    rooms.push({ id, name: { barracks: '兵員室', armory: '武器庫', cargo: '貨物室', medbay: '医務室', reactor: '機関室', brig: '営倉', lab: '実験室' }[k], x, z, w, d, h, props: P });
    doors.push(['hall', id, z + d / 2, 1.8, 2.3]); if (r() < 0.75 || k === 'reactor') drones.push([x + w / 2, z + d / 2]);
  });
  const bh = rr(r, 3.6, 4.8);
  rooms.push({ id: 'bridge', name: '敵艦橋', x: -bw / 2, z: -len - bd, w: bw, d: bd, h: bh, win: [['n', 1.2, bw - 1.2, 1.1, bh - 0.6]], floor: [pick(r, ['hex', 'plate']), dark(0.1, 0x50545c), 0.3, 0.7],
    props: [['core', bw / 2, bd * 0.42, 0, { c: def.glow }], ['console', bw / 2 - 2.6, 1.4, 0, { tall: 1, kind: 'radar', c: def.glow }], ['console', bw / 2 + 2.6, 1.4, 0, { tall: 1, kind: 'graph', c: def.glow }], ['console', 1.2, bd / 2, 1, { kind: 'bars', c: def.glow }], ['console', bw - 1.2, bd / 2, 3, { kind: 'data', c: def.glow }], ['seat', bw / 2, bd - 1.6, 2, { c: 0x1a1a1e }]] });
  doors.push(['bridge', 'hall', 0, 2, 2.4]);
  for (let i = 0; i < 1 + def.tier; i++) drones.push([(i - def.tier / 2) * 2.4, -len - bd * 0.5]);
  return { name: def.name, sub: '敵艦内 — 制御コアを掌握せよ', seed: def.seed, spawn: [0, 3.2, 0], view: [0, -1], music: 'hostile', hostile: true, theme, rooms, doors, drones };
}

const BP = { 'station:haven': haven, 'station:vulcan': vulcan, 'station:aurora': aurora, 'station:bastion': bastion, 'station:rogue': rogue, 'ship:hayate': hayate, 'ship:raiden': raiden, 'ship:amatsu': amatsu };
export function blueprint(type, id, def) {
  if (type === 'enemy') return enemyBP(def);
  if (type === 'outpost') return OUT[id]();
  return BP[type + ':' + id]();
}
