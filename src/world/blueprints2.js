// 追加の内装設計図: アトラス救難基地 / メガトン (巨大) / ファイザー / ウェポン (小) / 救助船ミケーネ
// 書式は blueprints.js と同じ。部屋は左上隅 (x,z) と幅・奥行き、小道具は部屋の左上隅からの相対座標
import * as THREE from 'three';
import { mat, glow } from '../gfx/textures.js';
import { rng } from '../core/util.js';
import { winMat } from './stationkit.js';
import { buildMycenae, cloneShared, wingOutside } from './rescue.js';
import { glassMat } from './interior.js';
import { megatonPlan } from './megaton.js';
import { hasImage } from '../gfx/materials.js';

const HP = Math.PI / 2;
const T = (label, use, x, z, rot, o = {}) => ['terminal', x, z, rot, { label, use, ...o }];
const N = (label, use, x, z, rot, suit, o = {}) => ['npc', x, z, rot, { label, use, suit, ...o }];
const S = (text, x, z, rot, o = {}) => ['sign', x, z, rot, { text, ...o }];

// ───────────────────────── 6. アトラス救難基地: 白と橙と緑。天球儀のホール、指令室、救助船 15 機の大格納庫 ─────────────────────────
const atlas = () => ({
  name: 'アトラス救難基地', sub: '救難・災害対応', seed: 66, spawn: [35, 26], view: [0, 1], music: 'interior',
  theme: { wall: ['lab', 0xeef2ee, 0.5, 0.12], floor: ['terrazzo', 0xf2f4f0, 0.2, 0.05], ceil: ['ceil', 0xc4ccc8], trim: '#35ff8a', lamp: '#f2fff6', frame: 0x505a56, door: 0xe86a1e, amb: [0xd8f0e2, 0x4a5650, 0.95], gloss: 0.9, door3: 'glass', trims: 'low', ribs: false, lamps: 'panel', col: 0xf2f4f0, gilt: 0xb8863a },
  rooms: [
    { id: 'hangar', name: '到着ベイ', x: 0, z: 0, w: 46, d: 34, h: 17, floor: ['plate', 0x9aa4a8, 0.5, 0.6], wall: ['wall', 0xc0cac6, 0.75, 0.3], ceil: ['rib', 0x56605c], ceil3: 'truss', lamps: 'spot', ribs: true, trims: 'both', deco: ['ibeam', 'ducts'], win: [['n', 6, 40, 2, 13]], li: 1.5,
      props: [['shipslot', 23, 16, 0, { r: 12 }], T('格納庫サービス', 'shipyard', 40.5, 29, 0), ['gantry', 23, 5, 0, { w: 42, at: -14 }], ['crate', 5, 5, 0, { n: 6 }], ['crate', 41, 6, 0, { n: 5 }], ['cargo', 5, 25, 0, { c: 0xf0f2f0 }], ['barrel', 9.5, 30, 0], ['toolcart', 33, 8, 0.3, { c: 0xff6a1e }], ['toolcart', 12, 24, -0.4, { c: 0x2a8a5a }], ['workbench', 9, 33.2, 2],
        ['supplyrack', 1.0, 6, 1, { w: 4 }], ['supplyrack', 1.0, 11, 1, { w: 4 }], ['hazard', 23, 32.6, 0, { w: 7, d: 0.5 }], ['suitlocker', 44.9, 12, 3, { n: 4 }], ['loaderbot', 10, 19.5, 1, { l: 7 }],
        S('ATLAS', 23, 33.7, 2, { h: 1.8, y: 10.2 }), S('到着ベイ ─ 救難基地', 23, 33.7, 2, { h: 0.8, y: 8, c: '#ffb060' }), N('整備主任', 'talk:atlasmech', 31, 29, -1, 0xff6a1e, { visor: '#35ff8a' }), ['bot', 15.5, 29, 0.5, { label: '誘導ボット', use: 'talk:guidebot' }], ['steam', 36, 9, 0], ['alarm', 0.3, 20, 1, { c: '#ffb030' }]] },
    { id: 'hall', name: 'アトラス・ホール', x: 8, z: 34, w: 30, d: 30, h: 15, shape: 'round', sky: true, rug: [[15, 15, 0, 5.4, 'carpet', 0x1e4a3a]],
      props: [['earthholo', 15, 15, 0, { use: 'talk:atlasglobe', label: '天球儀' }], ['bench', 8.4, 8.4, 0.5], ['bench', 21.6, 8.4, -0.5], ['bench', 8.4, 21.6, 1.5], ['bench', 21.6, 21.6, 2.5], ['plant', 4.2, 11, 0, { s: 1.4 }], ['plant', 25.8, 19, 0, { s: 1.4 }], ['plant', 4.2, 19, 0, { s: 1.4 }], ['plant', 25.8, 11, 0, { s: 1.4 }],
        T('任務端末', 'missions', 21.6, 4.4, -0.5), T('星図', 'map', 8.4, 4.4, 0.5, { kind: 'orbit' }), N('救難隊員', 'talk:rescuer', 8.6, 23.6, 1.2, 0xff6a1e, { visor: '#35ff8a' }), N('見学者', 'talk:tourist', 22, 23.2, -2.2, 0x3a6ea8),
        ['bot', 19.8, 7.6, -0.6, { label: '案内ボット', use: 'talk:guidebot', accent: 0x2a8a5a }], ['hoload', 15, 4.2, 0, { text: 'ATLAS RESCUE', c: '#35ff8a', y: 6.4, h: 1.1 }], ['hoload', 15, 25.8, 2, { text: 'ミケーネ格納庫 ↓', c: '#ffb060', y: 5.2, h: 0.8 }], ['lightcone', 15, 15, 0, { r: 4.6, k: 0.18, c: '#8fffd0' }]] },
    { id: 'ops', name: '救難指令室', x: 38, z: 38, w: 26, d: 22, h: 8, ceil3: 'coffer', lamps: 'spot', floor: ['hex', 0x8a9690, 0.3, 0.5], wall: ['smooth', 0x36423e, 0.6, 0.4], ceil: ['ceil', 0x202824], win: [['e', 3, 19, 1.4, 6.6]], plat: [[5, 12.4, 16, 7.4, 0.5, 'n', 0.35]], li: 0.85, deco: ['floorlights'],
      props: [['statusboard', 13, 0.3, 0, { w: 10, h: 4, y: 4.8 }], ['wallscreen', 3.6, 0.3, 0, { w: 4.6, h: 2.6, y: 4.3, kind: 'radar', title: '地球 災害監視' }], ['wallscreen', 22.4, 0.3, 0, { w: 4.6, h: 2.6, y: 4.3, kind: 'orbit', title: '軌道投入経路' }],
        T('緊急出動指令', 'rescue', 13, 8.6, 0, { c: '#ff5a3a', kind: 'radar' }), ['console', 9, 14.2, 0, { kind: 'radar', y0: 0.5 }], ['console', 13, 14.2, 0, { kind: 'graph', y0: 0.5 }], ['console', 17, 14.2, 0, { kind: 'bars', y0: 0.5 }], ['seat', 9, 15.8, 2, { y0: 0.5 }], ['seat', 13, 15.8, 2, { y0: 0.5 }], ['seat', 17, 15.8, 2, { y0: 0.5 }],
        N('救難司令', 'rescue', 13, 18.2, 2, 0xff6a1e, { visor: '#35ff8a', y0: 0.5 }), N('通信士', 'talk:atlasops', 4.4, 16.4, 1, 0x2a6a5a), ['console', 2.2, 5.4, 1, { tall: 1, kind: 'data' }], ['console', 2.2, 16.4, 1, { tall: 1, kind: 'graph' }], ['earthholo', 21.6, 7.2, 0, { s: 0.42, y: 2.3 }],
        ['alarm', 0.3, 2.4, 1, { c: '#ffb030' }], ['alarm', 0.3, 19.6, 1, { c: '#ffb030' }], ['rack', 24.6, 20.6, 2, { n: 2 }], S('RESCUE COMMAND ─ 救難指令室', 13, 21.7, 2, { h: 0.5, y: 6.6 })] },
    { id: 'bay', name: 'ミケーネ格納庫', x: -57, z: 64, w: 160, d: 130, h: 22, floor: ['concrete', 0x8a9490, 0.42, 0.3], wall: ['welded-steel', 0xb4beba, 0.75, 0.3], ceil: ['rib', 0x4a5450], ceil3: 'truss', lamps: 'spot', ribs: true, trims: 'both', li: 1.7,
      win: [['s', 6, 34, 1.2, 19], ['s', 36, 64, 1.2, 19], ['s', 66, 94, 1.2, 19], ['s', 96, 124, 1.2, 19], ['s', 126, 154, 1.2, 19]], plat: [[52, 2, 14, 7.4, 1.4, 'e', 0.42]],
      props: [['mycenaebay', 80, 40, 0], T('救難艇管制', 'rescue', 86.5, 5.4, 0, { c: '#ff5a3a', kind: 'radar' }), S('MYCENAE BAY', 80, 0.3, 0, { h: 2.6, y: 14 }), S('ミケーネ格納庫 ─ 多目的救助船 15 機', 80, 0.3, 0, { h: 1.1, y: 11.2, c: '#ffb060' }),
        ['gantry', 80, 27, 0, { w: 150, at: 34 }], ['gantry', 80, 98, 0, { w: 150, at: -42 }], ['console', 56, 5.4, 0, { kind: 'radar', y0: 1.4 }], ['console', 60.5, 5.4, 0, { kind: 'bars', y0: 1.4 }], ['bot', 58.4, 7.2, 2, { label: '格納庫管制ボット', use: 'talk:baybot', y0: 1.4, accent: 0x2a6ab8 }],
        ['bot', 72.5, 12, 0.6, { label: '整備ボット', use: 'talk:baybot2' }], ['bot', 96, 16.5, -0.9, { label: '整備ボット', use: 'talk:baybot2', accent: 0x2a8a5a }], ['bot', 38, 20, 1.2, { label: '整備ボット', use: 'talk:baybot2' }], ['bot', 124, 20, -1.3, { label: '整備ボット', use: 'talk:baybot2', accent: 0x2a6ab8 }],
        N('飛行隊長', 'talk:rescuechief', 83.5, 10.5, 2.4, 0xff6a1e, { visor: '#35ff8a' }), ['loaderbot', 66, 15, 1, { l: 12 }], ['loaderbot', 102, 54.8, 1, { l: 22 }], ['loaderbot', 44, 90.8, 1, { l: 20 }],
        ['supplyrack', 22, 1.0, 0, { w: 6 }], ['supplyrack', 30, 1.0, 0, { w: 6 }], ['supplyrack', 122, 1.0, 0, { w: 6 }], ['supplyrack', 130, 1.0, 0, { w: 6 }], ['supplyrack', 138, 1.0, 0, { w: 6 }], ['cargo', 6, 8, 0, { c: 0xf0f2f0 }], ['cargo', 10, 8, 0, { c: 0xff6a1e }], ['cargo', 152, 9, 0, { c: 0xf0f2f0 }],
        ['crate', 104, 5, 0, { n: 6 }], ['crate', 112, 6, 0, { n: 5 }], ['crate', 42, 5, 0, { n: 6 }], ['barrel', 16, 5, 0], ['barrel', 146, 5, 0], ['toolcart', 70, 20, 0.4, { c: 0xff6a1e }], ['toolcart', 91, 21, -0.3, { c: 0x2a8a5a }], ['toolcart', 34, 58, 0.2], ['toolcart', 126, 92, 0.7, { c: 0xff6a1e }],
        ['workbench', 114, 0.7, 0], ['workbench', 48, 0.7, 0], ['suitlocker', 96, 0.5, 0, { n: 5 }], ['pipes', 0.5, 30, 1], ['pipes', 159.5, 30, 3], ['pipes', 0.5, 96, 1], ['pipes', 159.5, 96, 3], ['steam', 20, 30, 0], ['steam', 140, 64, 0],
        ['hazard', 80, 2.6, 0, { w: 7, d: 0.6 }], ['alarm', 0.3, 60, 1, { c: '#ffb030' }], ['alarm', 159.7, 60, 3, { c: '#ffb030' }], ['lightcone', 80, 12, 0, { r: 7, k: 0.14 }], ['lightcone', 50, 56, 0, { r: 7, k: 0.1 }], ['lightcone', 110, 92, 0, { r: 7, k: 0.1 }]] },
    { id: 'med', name: '救命救急センター', x: -20, z: 36, w: 28, d: 26, h: 5, floor: ['porcelain', 0xf0f6f4, 0.2, 0.1], lamp: '#f4fffa', deco: ['coves', 'floorlights'],
      props: [['surgery', 6, 6, 0, { use: 'heal', label: '手術台で処置を受ける' }], ['railing', 6, 11.6, 0, { w: 9 }], ['railing', 11.4, 4.2, 1, { w: 7 }], ['mri', 20.5, 5.6, 0, { use: 'talk:scan' }], ['medpod', 4, 22.6, 2], ['medpod', 7, 22.6, 2], ['medpod', 10, 22.6, 2], ['medpod', 13, 22.6, 2],
        ['stretcher', 18.5, 21.4, 0.3], ['stretcher', 21.6, 22.2, -0.2, { c: 0x2a8a5a }], ['medbot', 9.5, 16, 0, { r: 1.6 }], ['medbot', 20, 13.4, 0, { r: 1.2 }], N('救急医', 'talk:atlasdoc', 15.4, 13, -1.2, 0xf0f6f4, { visor: '#35ff8a' }), ['desk', 24.8, 9.6, 3, { kind: 'graph', c: '#35ff8a' }],
        ['tank', 26.6, 20, 0, { c: '#35ff8a' }], ['tank', 26.6, 22.6, 0, { c: '#6fe8ff' }], ['rack', 27.3, 9.6, 3, { n: 3 }], ['cabinet', 1.4, 15.5, 1, { metal: 1, w: 2.4 }], ['cabinet', 16, 0.5, 0, { metal: 1, w: 2.2 }], ['seatrow', 24.6, 18, 3, { n: 3, c: 0x2a6a5a }],
        ['wallscreen', 16, 25.7, 2, { w: 5, h: 1.8, y: 2.9, kind: 'graph', title: '患者モニター' }], S('救命救急 TRAUMA CENTER', 14, 0.3, 0, { h: 0.5, y: 4.1 }), S('手術室 OR-1', 0.3, 6, 1, { h: 0.34, y: 3.6, c: '#ffb060' }), ['plant', 26.6, 1.4, 0, { s: 1.2 }]] },
    { id: 'supply', name: '救援物資庫', x: -22, z: 4, w: 22, d: 26, h: 9, floor: ['concrete', 0x8a9490, 0.5, 0.3], wall: ['welded-steel', 0xb4beba, 0.75, 0.3], ceil: ['rib', 0x4a5450], ribs: true, trims: 'both', deco: ['ibeam'], lamps: 'tube', li: 0.9,
      props: [['supplyrack', 4, 6, 1, { w: 6.4 }], ['supplyrack', 9, 6, 1, { w: 6.4 }], ['supplyrack', 14, 6, 1, { w: 6.4 }], ['supplyrack', 4, 19, 1, { w: 6.4 }], ['supplyrack', 9, 19, 1, { w: 6.4 }], ['cargo', 19.4, 5, 0, { c: 0xf0f2f0 }], ['crate', 15, 23, 0, { n: 6 }], ['barrel', 1.6, 12.4, 0], ['barrel', 20.4, 9.6, 0],
        ['loaderbot', 11, 12.5, 1, { l: 12 }], T('救援物資の取引', 'market', 14.6, 17.4, -0.4), N('補給係', 'talk:quarter', 17.2, 20.6, -1.5, 0x2a6a5a), ['suitlocker', 21.5, 21, 3, { n: 3 }], S('救援物資庫', 11, 0.3, 0, { h: 0.8, y: 5.8 }), ['toolcart', 18.6, 16.6, 0.6, { c: 0x2a8a5a }], ['alarm', 21.7, 10.4, 3, { c: '#ffb030' }]] },
    { id: 'crew', name: '隊員ラウンジ', x: 46, z: 8, w: 20, d: 20, h: 4.6, floor: ['walnut', 0xe8d8c0, 0.45, 0], wall: ['plaster', 0xf0ece0, 0.9, 0], ceil: ['plaster', 0xe4e0d4], deco: ['wains', 'coves'], lamps: 'pendant', lamp: '#ffe6c0', trims: 'none', win: [['e', 2, 18, 0.8, 3.8]], rug: [[6.5, 7.5, 8, 6, 'carpet', 0x2a5a4a]],
      props: [['kitchen', 10, 0.6, 0, { w: 5.4, use: 'rest', label: '食事をとって休む' }], ['table', 7, 5.2, 0, { wood: 1 }], ['table', 12.6, 5.2, 0, { wood: 1 }], ['sofa', 15.4, 8, 1, { c: 0x2a6a5a, w: 3 }], ['sofa', 15.4, 12.4, 1, { c: 0x2a6a5a, w: 3 }], ['table', 17.6, 10.2, 0, { wood: 1, n: 0 }],
        ['bunk', 1.2, 16.6, 0], ['bunk', 3.6, 16.6, 0, { use: false }], ['bunk', 6, 16.6, 0, { use: false }], ['suitlocker', 3, 0.5, 0, { n: 3 }], ['bookshelf', 9.6, 19.55, 2, { w: 2.4 }], ['aquarium', 14.4, 19.2, 2, { w: 3.4 }], ['vending', 0.6, 5.6, 1], ['arcade', 0.6, 3.6, 1, { title: 'RESCUE 9' }],
        ['plant', 18.8, 1.4, 0, { s: 1.3 }], ['plant', 18.8, 18.6, 0, { s: 1.3 }], ['floorlamp', 18.8, 14.8, 0], ['poster', 5.6, 0.25, 0, { text: '七分で発進\n十五分で現着', c: '#35ff8a', h: 0.9 }], ['fan', 10, 10, 0, { wood: 1 }], N('非番の隊員', 'talk:offduty', 9.8, 8.8, 2.4, 0xff6a1e)] },
    { id: 'brief', name: 'ブリーフィング室', x: 46, z: 28, w: 18, d: 10, h: 4.2, ceil3: 'coffer', lamps: 'spot', floor: ['felt', 0x24382f, 1, 0], wall: ['smooth', 0x3e4a46, 0.6, 0.4], plat: [[13.6, 1, 4, 8, 0.3, 'w', 0.5]],
      props: [['wallscreen', 17.7, 5, 3, { w: 7, h: 2.8, y: 2.5, kind: 'radar', title: '出動計画 ─ ネオン・ベイ 15 着陸帯' }], ['seatrow', 4.4, 5, 1, { n: 7, c: 0x2a4a3a }], ['seatrow', 6.8, 5, 1, { n: 7, c: 0x2a4a3a }], ['seatrow', 9.2, 5, 1, { n: 7, c: 0x2a4a3a }],
        ['console', 15.4, 8.3, 3, { kind: 'data', y0: 0.3 }], N('作戦主任', 'talk:atlasbrief', 15.6, 2.4, 3, 0x2a6a5a, { visor: '#35ff8a', y0: 0.3 }), ['holo', 1.9, 1.9, 0, { kind: 'planet', s: 0.5, c: '#4aa3ff' }], ['plant', 1.2, 8.8, 0, { dark: 1 }]] },
  ],
  doors: [['hangar', 'hall', 23, 5, 4, 'blast'], ['hall', 'ops', 49, 3, 2.8, 'glass'], ['hall', 'med', 49, 3, 2.8, 'glass'], ['hall', 'bay', 23, 7, 5, 'blast'], ['hangar', 'supply', 17, 3.2, 3, 'blast'], ['hangar', 'crew', 18, 2.2, 2.5, 'slide'], ['ops', 'brief', 55, 2, 2.4, 'slide']],
});

// ───────────────────────── 7. メガトン (巨大): 第 7 居住甲板。本通り・8 つの街区・300 戸を超える住戸は megaton.js が組み立てる ─────────────────────────
const megaton = () => megatonPlan(hasImage);

// ───────────────────────── 8. ファイザー: 白と紫の創薬研究所。除染ゲート、二重らせんの吹き抜け、創薬ラボ、製剤ライン、冷凍保管庫 ─────────────────────────
const fizer = () => ({
  name: 'ファイザー', sub: '医療・創薬研究', seed: 88, spawn: [30, 24], view: [1, 0], music: 'interior',
  theme: { wall: ['lab', 0xf6f8fb, 0.42, 0.1], floor: ['epoxy', 0xf0f3f7, 0.2, 0.15], ceil: ['ceil', 0xd4dae2], trim: '#b48cff', lamp: '#f6f2ff', frame: 0x586274, door: 0xd8d0f0, amb: [0xe6e2ff, 0x565c6c, 1.0], gloss: 1.05, door3: 'glass', trims: 'both', ribs: false, lamps: 'panel', col: 0xf0f0f6, gilt: 0x9a8ad8 },
  rooms: [
    { id: 'hangar', name: '滅菌ドック', x: 0, z: 0, w: 38, d: 30, h: 13, li: 1.5, ceil3: 'vault', floor: ['tile', 0xd0d6de, 0.3, 0.3], win: [['n', 5, 33, 2, 8]],
      props: [['shipslot', 19, 14, 0, { r: 10.5 }], T('格納庫サービス', 'shipyard', 33, 25.5, 0), ['crate', 4, 4, 0, { n: 4 }], ['rack', 2, 23, 1, { n: 3 }], ['toolcart', 8, 25.6, 0.3, { c: 0x8a5ce8 }], ['tank', 35.6, 4, 0, { c: '#b48cff' }], ['tank', 35.6, 6.6, 0, { c: '#4dffd8' }], ['hazard', 19, 28.7, 0, { w: 6, d: 0.5 }],
        S('FIZER', 19, 29.7, 2, { h: 1.5, y: 7.2 }), S('滅菌ドック ─ 除染を受けてから入室', 19, 29.7, 2, { h: 0.55, y: 5.6, c: '#ffffff' }), N('検疫官', 'talk:fizerquar', 26, 25, -1, 0xf0f0f6, { visor: '#b48cff' }), ['bot', 12.4, 25.6, 0.5, { accent: 0x8a5ce8, eye: '#b48cff', label: '除染ボット', use: 'talk:fizerbot' }], ['steam', 16, 26.6, 0], ['steam', 22, 26.6, 0]] },
    { id: 'decon', name: '除染ゲート', x: 15.5, z: 30, w: 7, d: 16, h: 3.6, ceil3: 'flat', nobeam: 1, lamps: 'tube', floor: ['grate', 0x9aa2ae, 0.6, 0.7], wall: ['polycarbonate', 0xe8ecf4, 0.4, 0.2], deco: ['floorlights'],
      props: [['uvarch', 3.5, 3.6, 0, { w: 6.1 }], ['uvarch', 3.5, 8, 0, { w: 6.1 }], ['uvarch', 3.5, 12.4, 0, { w: 6.1 }], ['steam', 1.2, 5.8, 0, { c: '#e8e0ff' }], ['steam', 5.8, 10.2, 0, { c: '#e8e0ff' }]] },
    { id: 'helix', name: 'ヘリックス・ホール', x: 6, z: 46, w: 26, d: 26, h: 14, shape: 'round', sky: true, rug: [[13, 13, 0, 4.6, 'carpet', 0x3a2a6a]],
      props: [['dnahelix', 13, 13, 0, { use: 'talk:dna', label: '二重らせんの像' }], ['bench', 7, 7, 0.5, { c: 0x6a4ac8 }], ['bench', 19, 7, -0.5, { c: 0x6a4ac8 }], ['bench', 7, 19, 1.5, { c: 0x6a4ac8 }], ['bench', 19, 19, 2.5, { c: 0x6a4ac8 }], ['plant', 3.6, 9.4, 0, { s: 1.3 }], ['plant', 22.4, 16.6, 0, { s: 1.3 }],
        T('任務端末', 'missions', 18.8, 3.8, -0.45), T('星図', 'map', 7.2, 3.8, 0.45, { kind: 'orbit' }), N('受付', 'talk:fizerrecept', 8, 21.6, 1.3, 0xf0f0f6, { visor: '#b48cff' }), ['hoload', 13, 21.8, 2, { text: 'FIZER\nLIFE SCIENCE', c: '#b48cff', y: 6, h: 1.3 }],
        ['hoload', 20.6, 13, 3, { text: '創薬ラボ →', c: '#4dffd8', y: 4.2, h: 0.6 }], ['hoload', 5.4, 13, 1, { text: '← 培養ドーム', c: '#8aff9a', y: 4.2, h: 0.6 }]] },
    { id: 'lab', name: '創薬ラボ', x: 32, z: 48, w: 24, d: 22, h: 5.2, deco: ['coves'], win: [['e', 3, 19, 0.9, 4.2]],
      props: [['labbench', 7, 6.4, 0, { w: 3.6 }], ['labbench', 12.6, 6.4, 0, { w: 3.6 }], ['labbench', 7, 13.4, 2, { w: 3.6 }], ['labbench', 12.6, 13.4, 2, { w: 3.6 }], ['fumehood', 4.4, 0.66, 0], ['fumehood', 7, 0.66, 0], ['fumehood', 9.6, 0.66, 0], ['specimen', 20.4, 4.6, 0, { r: 0.95, h: 4.2, n: 2 }],
        ['wallscreen', 15.6, 0.3, 0, { w: 5.2, h: 2.2, y: 3, kind: 'graph', title: '分子動力学シミュレーション' }], T('研究ラボ', 'lab', 19.6, 17.4, -0.6, { kind: 'graph' }), N('主任研究員', 'lab', 16.6, 18, -1.2, 0xf0f0f6, { visor: '#b48cff' }), N('研究員', 'talk:fizersci', 3.6, 8.2, 1, 0xdfe8f0, { visor: '#4dffd8' }),
        ['tank', 3, 20.4, 0, { c: '#4dffd8' }], ['tank', 5.4, 20.4, 0, { c: '#ff7ab8' }], ['tank', 7.8, 20.4, 0, { c: '#ffd23a' }], ['rack', 1, 15.6, 1, { n: 2 }], ['console', 21.4, 12, 3, { tall: 1, kind: 'graph' }], ['medbot', 10, 10, 0, { r: 1.1, y: 1.9, use: false }], ['desk', 14.4, 19.6, 2, { kind: 'data' }]] },
    { id: 'pharma', name: '製剤ライン', x: 32, z: 70, w: 28, d: 20, h: 7.5, floor: ['hex', 0xe2e6f0, 0.28, 0.3], deco: ['ducts', 'coves'], li: 1.1,
      props: [['pillline', 13.6, 6.6, 0, { l: 11 }], ['pillline', 13.6, 14, 0, { l: 11, c: '#4dffd8' }], T('薬局・医薬品取引', 'market', 24.6, 3.2, -0.5), N('薬剤主任', 'talk:fizerpharm', 23.4, 9.8, -1.4, 0xf0f0f6, { visor: '#4dffd8' }), ['conveyor', 23.6, 17.6, 0, { l: 7, item: 'crate', c: 0xf0f2f0 }], ['robotarm', 22.4, 13.6, 2, { c: 0xf0f0f6 }],
        ['cargo', 3.2, 4.6, 0, { c: 0xf0f2f0 }], ['crate', 3.4, 16.6, 0, { n: 5 }], ['rack', 27.3, 13, 3, { n: 3 }], ['wallscreen', 27.7, 6.4, 3, { w: 4.4, h: 2.2, y: 3.6, kind: 'bars', title: '本日の生産量' }], ['loaderbot', 4.4, 10.4, 0, { l: 5 }], S('製剤ライン ─ GMP 区画', 13.6, 0.3, 0, { h: 0.55, y: 5.8 })] },
    { id: 'bio', name: '培養ドーム', x: -18, z: 47, w: 24, d: 24, h: 11, shape: 'round', sky: true, lamp: '#f0e0ff', rug: [[12, 12, 0, 9.6, 'grass', 0x8ac060]],
      props: [['specimen', 12, 12, 0, { r: 1.5, h: 7, n: 4, use: 'talk:specimen', label: '標本槽' }], ['hydrotower', 6, 6, 0], ['hydrotower', 18, 6, 0], ['hydrotower', 6, 18, 0], ['hydrotower', 18, 18, 0], ['hydrotower', 12, 4, 0], ['hydrotower', 4, 12, 0], ['hydrotower', 8.4, 20.4, 0],
        ['tree', 16.4, 14.4, 0, { s: 0.8 }], ['planter', 8.4, 15.6, 0.7, { w: 3, flowers: 1 }], ['planter', 15.6, 8.4, 0.7, { w: 3, flowers: 1 }], N('植物学者', 'talk:fizerbotan', 8.6, 9.2, 0.9, 0x3a7a4a, { visor: '#8aff9a' }), ['bench', 19.6, 17, 3, { c: 0x6a8a4a }], ['lightcone', 12, 12, 0, { r: 3.4, k: 0.2, c: '#e0c8ff' }]] },
    { id: 'clinic', name: '診療・手術室', x: 7, z: 72, w: 24, d: 18, h: 4.6, floor: ['medical-vinyl', 0xf4f8f8, 0.2, 0.1], deco: ['coves', 'floorlights'],
      props: [['surgery', 5.4, 6, 0, { use: 'heal', label: '手術台で処置を受ける' }], ['railing', 10.4, 5.4, 1, { w: 8 }], ['mri', 18, 5.8, 0, { use: 'checkup', label: '全身スキャナで健康診断', c: '#b48cff' }], ['medpod', 3, 15.4, 2], ['medpod', 6, 15.4, 2], ['medpod', 9, 15.4, 2], ['stretcher', 15, 14.6, 0.2, { c: 0x8a5ce8 }],
        N('医師', 'talk:fizerdoc', 13.4, 10.4, -0.6, 0xf0f0f6, { visor: '#b48cff' }), ['desk', 21.4, 12.6, 3, { kind: 'graph' }], ['cabinet', 23.4, 16, 3, { metal: 1, w: 2.2 }], ['medbot', 14.6, 8.2, 0, { r: 0.9 }], ['seatrow', 19, 17.3, 2, { n: 4, c: 0x6a4ac8 }], S('診療室 CLINIC', 12, 0.3, 0, { h: 0.4, y: 3.8 })] },
    { id: 'cryo', name: '冷凍保管庫', x: -16, z: 71, w: 22, d: 16, h: 5.5, wall: ['smooth', 0x1e2a3c, 0.5, 0.4], floor: ['hex', 0x3a4658, 0.25, 0.6], ceil: ['flat', 0x0c1220], li: 0.38, lamp: '#7fd8ff', trim: '#7fd8ff', deco: ['floorlights'], lamps: 'spot',
      props: [['cryopod', 11, 14.7, 2, { n: 9 }], ['cryopod', 1.4, 7.6, 1, { n: 5 }], ['cryopod', 20.6, 7.6, 3, { n: 5 }], N('低温技師', 'talk:cryotech', 13.6, 7, -2.6, 0x2a4a6a, { visor: '#7fd8ff' }), ['console', 11, 6.4, 0, { tall: 1, kind: 'graph', c: '#7fd8ff' }], ['tank', 4.6, 2, 0, { c: '#7fd8ff' }], ['tank', 17.4, 2, 0, { c: '#7fd8ff' }],
        ['steam', 6, 11, 0, { c: '#bfe8ff' }], ['steam', 16, 11, 0, { c: '#bfe8ff' }], ['steam', 11, 3.4, 0, { c: '#bfe8ff' }], S('CRYO VAULT ─ 冷凍保管庫', 15.6, 0.3, 0, { h: 0.4, y: 4.2 })] },
  ],
  doors: [['hangar', 'decon', 19, 3, 2.8, 'glass'], ['decon', 'helix', 19, 3, 2.8, 'glass'], ['helix', 'lab', 59, 2.6, 2.6, 'glass'], ['helix', 'bio', 59, 2.6, 2.6, 'glass'], ['helix', 'clinic', 19, 2.6, 2.6, 'glass'], ['lab', 'pharma', 44, 2.6, 2.6, 'slide'], ['bio', 'cryo', -6, 2.2, 2.5, 'blast']],
});

// ───────────────────────── 9. ウェポン (小): 黒鋼と警戒色。主砲の機関部が艦内を貫く ─────────────────────────
const weapon = () => ({
  name: 'ウェポン', sub: '兵器試験場', seed: 99, spawn: [26, 21], view: [0, -1], music: 'interior',
  theme: { wall: ['armor', 0x9aa0a8, 0.7, 0.6], floor: ['plate', 0x4e5258, 0.45, 0.75], ceil: ['rib', 0x1e2024], trim: '#ffe14d', lamp: '#ffe6c0', frame: 0x121316, door: 0x6a5c1e, amb: [0xffc890, 0x18181a, 0.52], gloss: 0.55, door3: 'blast', trims: 'low', lamps: 'tube', deco: ['cables'] },
  rooms: [
    { id: 'hangar', name: '装甲ドック', x: 0, z: 0, w: 34, d: 28, h: 12, li: 1.5, ceil3: 'truss', truss: 0x8a7a1e, deco: ['ibeam', 'cables'], win: [['n', 5, 29, 2.5, 8.5]],
      props: [['shipslot', 17, 13, 0, { r: 10 }], T('格納庫サービス', 'shipyard', 29.6, 23.6, 0), ['gantry', 17, 4.5, 0, { w: 30, at: 8 }], ['cargo', 4, 6, 0, { c: 0x4a5a3a }], ['ammobox', 30, 5, 0, { n: 5 }], ['ammobox', 5, 19, 0, { n: 4 }], ['weaponrack', 10, 27.7, 2, { c: '#ffe14d' }], ['turret', 4.4, 23.6, 0.6],
        ['alarm', 0.3, 12, 1], ['alarm', 33.7, 12, 3], ['hazard', 16, 26.8, 0, { w: 5, d: 0.5 }], ['toolcart', 25, 8, 0.2, { c: 0x4a5a3a }], ['barrel', 8.6, 24.6, 0], S('WEAPON', 20, 27.7, 2, { h: 1.6, y: 7.6 }), S('兵器試験場 ─ 無許可の撮影を禁ず', 20, 27.7, 2, { h: 0.5, y: 6, c: '#ff5a3a' }),
        N('甲板長', 'talk:weapondeck', 24.6, 23.4, -1, 0x4a5a3a, { visor: '#ffe14d' }), ['steam', 12, 8, 0]] },
    { id: 'spine', name: '中央通路', x: 13, z: 28, w: 6, d: 28, h: 3.5, ceil3: 'vault', floor: ['grate', 0x8a8f96, 0.6, 0.7], deco: ['cables', 'floorlights'],
      props: [['alarm', 5.7, 4, 3], ['alarm', 0.3, 15, 1], ['alarm', 5.7, 25, 3], S('兵装庫', 0.26, 5.4, 1, { h: 0.3, y: 2.2 }), S('射撃試験場', 0.26, 18.2, 1, { h: 0.3, y: 2.2 }), S('戦闘指揮所', 3, 27.74, 2, { h: 0.24, y: 3.12, c: '#ff5a3a' }), ['pipes', 5.6, 12, 3, { c: 0xc9a22e }]] },
    { id: 'armory', name: '兵装庫', x: -7, z: 28, w: 20, d: 16, h: 5.6, deco: ['girders', 'cables'],
      props: [['mech', 4, 3.4, 0, { s: 0.8 }], ['mech', 9.6, 3.4, 0, { s: 0.8, eye: '#ff5a3a', id: '12' }], ['weaponrack', 0.25, 8.6, 1, { c: '#ffe14d' }], ['weaponrack', 0.25, 12, 1, { c: '#ffe14d' }], ['missilerack', 5, 14.6, 2], ['missilerack', 9, 14.6, 2], ['shellrack', 14.6, 15.2, 2, { n: 6 }],
        T('兵装整備・補給', 'rearm', 16.4, 4.2, -0.8, { c: '#ff5a3a' }), N('兵器廠長', 'talk:weaponarm', 15.4, 11.8, -1.2, 0x5a5a5a, { visor: '#ffe14d' }), ['ammobox', 13.6, 1.6, 0, { n: 4 }], ['weaponbench', 17, 0.7, 0], ['locker', 19.5, 12.6, 3, { n: 3 }], ['alarm', 19.7, 2.4, 3]] },
    { id: 'range', name: '射撃試験場', x: -11, z: 45, w: 24, d: 9, h: 4.6, deco: ['cables'], li: 0.8,
      props: [['range', 19, 4.5, 3, { d: 14.5, n: 2, w: 3.2, block: 8.6 }], N('射撃教官', 'talk:weaponsgt', 22.2, 1.5, 2.6, 0x4a5a3a, { visor: '#ff5a3a' }), ['weaponrack', 23.75, 6.6, 3, { c: '#ff5a3a' }], ['ammobox', 21.6, 7.9, 0, { n: 2 }], S('射撃試験場 RANGE', 21.6, 0.3, 0, { h: 0.3, y: 3.6, c: '#ff5a3a' })] },
    { id: 'cic', name: '戦闘指揮所', x: 7, z: 56, w: 18, d: 18, h: 6.5, shape: 'round', floor: ['hex', 0x3a3e46, 0.3, 0.6], wall: ['smooth', 0x2a2e36, 0.6, 0.4], ceil: ['flat', 0x101216], li: 0.5, lamp: '#ffb890', trim: '#ff5a3a', rug: [[9, 9, 0, 3.4, 'carpet', 0x2a1a1a]],
      props: [['holotable', 9, 9, 0, { r: 1.7, c: '#ff5a3a', use: 'bounty', label: '戦術ホロ：ヴォイド艦隊' }], ['console', 4.6, 13.4, 1.5, { tall: 1, kind: 'radar', c: '#ff5a3a' }], ['console', 13.4, 13.4, -1.5, { tall: 1, kind: 'graph', c: '#ff5a3a' }], ['console', 13.4, 4.6, -0.5, { tall: 1, kind: 'bars', c: '#ff5a3a' }], ['console', 4.6, 4.6, 0.5, { tall: 1, kind: 'orbit', c: '#ff5a3a' }],
        T('任務端末', 'missions', 9, 15.4, 2, { c: '#ffe14d' }), N('司令', 'talk:weaponcmd', 12.6, 11.4, -2.3, 0x2a2a2e, { visor: '#ffe14d' })] },
    { id: 'breech', name: '主砲機関部', x: 25, z: 34, w: 16, d: 48, h: 12, deco: ['girders'], li: 0.9, win: [['e', 6, 42, 6.4, 10]],
      props: [['railgun', 8, 27.6, 0, { l: 40 }], ['shellrack', 15.3, 12, 3, { n: 6 }], ['shellrack', 15.3, 16, 3, { n: 6 }], ['ammobox', 13.6, 20.4, 0, { n: 4 }], ['alarm', 15.7, 6, 3], ['alarm', 0.3, 20, 1], ['alarm', 15.7, 40, 3], ['alarm', 0.3, 42, 1], ['pipes', 15.5, 3, 3, { c: 0x2a6ab8 }],
        N('砲術長', 'talk:weaponeng', 13, 9.6, -1.57, 0x4a5a3a, { visor: '#8fe8ff' }), ['wallscreen', 15.7, 27, 3, { w: 6, h: 2.6, y: 3.6, kind: 'graph', title: '蓄電器 充電曲線', c: '#8fe8ff' }], ['console', 13.8, 32, 3, { tall: 1, kind: 'bars', c: '#8fe8ff' }], ['rack', 15.3, 36.4, 3, { n: 2 }],
        ['hazard', 11.0, 27.6, 1, { w: 40, d: 0.4 }], ['hazard', 5.0, 30.4, 1, { w: 34, d: 0.4 }], ['steam', 2.4, 16, 0], ['steam', 12, 44, 0], S('MAIN GUN ─ 主砲機関部', 8, 0.3, 0, { h: 0.7, y: 8.6 }), S('射撃中は警戒線の内側に立ち入るな', 15.7, 20.6, 3, { h: 0.3, y: 2.9, c: '#ff5a3a' })] },
    { id: 'mag', name: '弾薬庫', x: -7, z: 58, w: 14, d: 14, h: 4.6, deco: ['girders'], li: 0.7,
      props: [['shellrack', 3.4, 0.6, 0, { n: 6 }], ['shellrack', 8, 0.6, 0, { n: 6 }], ['missilerack', 3, 13.2, 2], ['missilerack', 7.4, 13.2, 2], ['ammobox', 2, 4.6, 0, { n: 5 }], ['ammobox', 2.2, 9, 0, { n: 4 }], ['cargo', 11.4, 3.4, 0, { c: 0x4a5a3a }], ['conveyor', 6.4, 7.6, 0, { l: 6, item: 'shell' }],
        ['alarm', 0.3, 7, 1], ['hazard', 12.8, 7, 1, { w: 4, d: 0.5 }], S('弾薬庫 ─ 火気厳禁', 7, 13.74, 2, { h: 0.34, y: 3.7, c: '#ff5a3a' })] },
    { id: 'bunk', name: '兵員区画', x: 34, z: 6, w: 12, d: 16, h: 3.6, lamp: '#ffe6c8', wall: ['bulk', 0x6a6e76, 0.75, 0.6], deco: ['cables'],
      props: [['bunk', 10.9, 2, 0], ['bunk', 10.9, 6, 0, { use: false }], ['bunk', 10.9, 10, 0, { use: false }], ['locker', 5, 0.5, 0, { n: 4 }], ['kitchen', 6, 15.4, 2, { w: 3.6, use: 'rest', label: '食事をとって休む' }], ['tablelong', 6, 8, 1, { w: 3.2 }], ['vending', 0.6, 13.4, 1],
        ['poster', 11.75, 13.6, 3, { text: '一発必中', c: '#ffe14d', h: 0.8 }], ['fan', 5, 8, 0], N('非番の砲手', 'talk:weaponoff', 3.4, 4.4, 1.2, 0x4a5a3a)] },
  ],
  doors: [['hangar', 'spine', 16, 2.6, 2.7, 'blast'], ['spine', 'armory', 36, 2.2, 2.5, 'blast'], ['spine', 'range', 49, 2.2, 2.5, 'slide'], ['spine', 'cic', 16, 2.4, 2.4, 'blast'], ['cic', 'breech', 65, 2.6, 2.7, 'blast'], ['cic', 'mag', 65, 2.2, 2.5, 'blast'], ['hangar', 'bunk', 14, 1.8, 2.3, 'slide']],
});

// ───────────────────────── 救助船ミケーネの船内 (操縦室にボット 2 体) ─────────────────────────
/** 窓の外: 自機の主翼・揚力ファンと、格納庫 (待機中) または都市 (出動中) */
function mycenaeOutside(B, out, deployed) {
  const D = mat('hull', { color: 0x30353d, rough: 0.8, metal: 0.6 }), FY = -1.6;
  wingOutside(B, 3.5, 3.7, 17);
  if (!deployed) { // アトラスの格納庫
    const FL = mat('concrete', { color: 0x8a9490, rough: 0.42, metal: 0.3 }), WL = mat('wall', { color: 0xb4beba, rough: 0.75, metal: 0.3 }), CL = mat('rib', { color: 0x4a5450, rough: 0.9, metal: 0.4 }), YL = glow('#ffd23a', 1.2), LG = glow('#f2fff6', 4);
    B.add(FL, new THREE.PlaneGeometry(150, 170).rotateX(-HP), new THREE.Matrix4().makeTranslation(3.5, FY, 40)); B.add(CL, new THREE.PlaneGeometry(150, 170).rotateX(HP), new THREE.Matrix4().makeTranslation(3.5, FY + 22, 40));
    for (const s of [-1, 1]) { B.box(WL, 0.6, 22, 170, 3.5 + s * 75, FY + 11, 40); B.box(glow('#35ff8a', 2), 0.1, 0.12, 160, 3.5 + s * 74.6, FY + 3, 40); }
    B.box(WL, 150, 22, 0.6, 3.5, FY + 11, 125);
    // 発進口 (ガラスの大扉の向こうに地球)
    for (let k = -2; k <= 3; k++) B.box(D, 2.4, 22, 2.4, 3.5 - 15 + k * 30, FY + 11, -42); B.box(D, 150, 3, 2.4, 3.5, FY + 20.5, -42); B.box(D, 150, 1.2, 2.4, 3.5, FY + 0.6, -42);
    B.add(glassMat(), new THREE.PlaneGeometry(150, 18), new THREE.Matrix4().makeTranslation(3.5, FY + 10, -42), 0); for (let x = -70; x <= 76; x += 2.8) B.box(D, 0.1, 18, 0.14, x, FY + 10, -41.9);
    for (let k = -2; k <= 2; k++) { const x = 3.5 + k * 30; for (const s of [-1, 1]) B.box(YL, 0.16, 0.02, 34, x + s * 13.6, FY + 0.012, 15); B.box(YL, 27.4, 0.02, 0.16, x, FY + 0.012, -2); B.box(YL, 27.4, 0.02, 0.16, x, FY + 0.012, 32); for (let q = 0; q < 6; q++) B.box(glow(q % 2 ? '#7fe8ff' : '#35ff8a', 1.7), 0.22, 0.03, 1.5, x, FY + 0.014, -5 - q * 2.6); }
    for (let x = -62; x <= 70; x += 12) for (let z = -30; z <= 110; z += 14) { B.box(D, 0.4, 0.14, 0.4, x, FY + 20.8, z); B.box(LG, 0.3, 0.04, 0.3, x, FY + 20.7, z); }
    for (let z = -30; z <= 120; z += 10) B.box(CL, 150, 1.1, 0.3, 3.5, FY + 21.2, z);
    // 両隣に待機する僚機
    const ship = buildMycenae({ landed: true }); for (const dx of [-30, 30, -60, 60]) { const c = cloneShared(ship); c.position.set(3.5 + dx, FY + 3.7, 15); out.group.add(c); }
    out.lights.push({ x: 3.5, y: 6, z: -8, c: new THREE.Color('#f2fff6'), i: 60, d: 40 });
  } else { // 出動先: ネオン・ベイの広場。雨に濡れた路面と、窓明かりのともるビル街
    const RD = mat('concrete', { color: 0x30323a, rough: 0.45, metal: 0.3 }), W1 = winMat(0x39404c, 0xffd9a0, 2.6, 0.035), W2m = winMat(0x2c3444, 0xbfe0ff, 2.4, 0.035), r = rng(4711), GX = glow('#35ff8a', 2.2);
    B.add(RD, new THREE.CircleGeometry(250, 48).rotateX(-HP), new THREE.Matrix4().makeTranslation(3.5, FY, 15));
    B.tor(GX, 17, 0.14, 3.5, FY + 0.03, 15, HP, 0, 0, 72, 5); B.tor(glow('#ffffff', 2), 20, 0.08, 3.5, FY + 0.03, 15, HP, 0, 0, 72, 5); B.box(GX, 9, 0.03, 2.6, 3.5, FY + 0.02, -14); B.box(GX, 2.6, 0.03, 9, 3.5, FY + 0.02, -14);
    for (let i = 0; i < 46; i++) { const a = i / 46 * Math.PI * 2 + r() * 0.1, d = 62 + r() * 150, w = 16 + r() * 26, dd = 16 + r() * 26, h = 24 + r() * r() * 190, x = 3.5 + Math.cos(a) * d, z = 15 + Math.sin(a) * d; B.box(i % 3 ? W1 : W2m, w, h, dd, x, FY + h / 2, z, r() * 3); if (h > 120) B.box(glow(['#ff3df0', '#4df0ff', '#ffe14d'][i % 3], 2.4), w * 0.7, 2.2, 0.4, x - Math.cos(a) * (dd / 2 + 1), FY + h * 0.62, z - Math.sin(a) * (dd / 2 + 1), -a + HP); }
    for (let i = 0; i < 16; i++) { const a = i / 16 * Math.PI * 2, x = 3.5 + Math.cos(a) * 34, z = 15 + Math.sin(a) * 34; B.box(D, 0.24, 8, 0.24, x, FY + 4, z); B.box(glow('#ffe6c8', 5), 0.9, 0.12, 0.4, x - Math.cos(a) * 0.8, FY + 7.9, z - Math.sin(a) * 0.8, -a); }
    for (const [x, z] of [[-9, -6], [16, -8], [-12, 30], [19, 34]]) { B.box(mat('ripstop-tent', { color: 0xff6a1e, rough: 0.8, metal: 0 }), 4.4, 2.6, 4.4, x, FY + 1.3, z); B.add(mat('ripstop-tent', { color: 0xf0f2f0, rough: 0.8, metal: 0 }), new THREE.ConeGeometry(3.4, 1.4, 4), new THREE.Matrix4().makeRotationY(0.785).setPosition(x, FY + 3.3, z)); B.box(glow('#fff2d8', 2.4), 1.2, 1.6, 0.06, x, FY + 1.0, z + 2.22); } // 救護テント
    out.lights.push({ x: 3.5, y: 5, z: -6, c: new THREE.Color('#bfd0ff'), i: 40, d: 36 });
  }
}
const mycenae = (deployed) => () => ({
  name: '救助船 ミケーネ', sub: deployed ? '出動中 ─ 地球・ネオン・ベイ' : '待機中 ─ アトラス格納庫', seed: 81, spawn: [3.5, 28.6, 0], view: [0, -1], music: 'interior', rescue: true,
  theme: { wall: ['smooth', 0xeef0ec, 0.5, 0.2], floor: ['tread', 0xb4bcc0, 0.75, 0.2], ceil: ['ceil', 0xc8ccd0], trim: '#ff7a2a', lamp: '#f4fff4', frame: 0x3a4048, door: 0xff6a1e, amb: [0xe0f0e8, 0x3c4440, 0.85], gloss: 0.3, door3: 'slide', trims: 'both', ribs: true, lamps: 'tube', deco: ['cables'] },
  rooms: [
    { id: 'cockpit', name: '操縦室', x: 0, z: 0, w: 7, d: 6, h: 2.8, deco: [], floor: ['plate', 0x6a7078, 0.5, 0.6], win: [['n', 0.6, 6.4, 0.95, 2.5], ['w', 0.5, 4.4, 1.0, 2.4], ['e', 0.5, 4.4, 1.0, 2.4]],
      props: [['pilotbot', 2.1, 2.7, 2, { label: '操縦ボット「ミケ」', use: 'talk:pilotbot' }], ['pilotbot', 4.9, 2.7, 2, { label: '副操縦ボット「ネア」', use: 'talk:copilot', accent: 0x2a6ab8, eye: '#35ff8a' }], ['console', 2.1, 0.78, 0, { kind: 'radar' }], ['console', 4.9, 0.78, 0, { kind: 'orbit', c: '#35ff8a' }],
        ['console', 0.75, 5.0, 1, { tall: 1, kind: 'graph' }], ['console', 6.25, 5.0, 3, { tall: 1, kind: 'bars', c: '#35ff8a' }], ['overhead', 3.5, 2.3, 0], ['pedestal', 3.5, 2.3, 0]] },
    { id: 'triage', name: '救護室', x: 0, z: 6, w: 7, d: 9.5, h: 2.8, floor: ['tile', 0xe8eeee, 0.25, 0.1], lamp: '#f4fffa', win: [['w', 1.5, 8, 1.0, 2.2], ['e', 1.5, 8, 1.0, 2.2]],
      props: [['medpod', 0.95, 2.6, 0], ['medpod', 0.95, 6.4, 0], ['stretcher', 6.0, 2.7, 0], ['stretcher', 6.0, 6.3, 0, { c: 0x2a8a5a }], ['medbot', 1.3, 4.5, 0, { r: 0.35, y: 1.8 }], ['tank', 6.1, 8.7, 0, { c: '#35ff8a' }], ['cabinet', 0.5, 8.7, 1, { metal: 1, w: 1.2 }],
        S('救護室 TRIAGE', 3.5, 0.26, 0, { h: 0.2, y: 2.6, c: '#35ff8a' })] },
    { id: 'cabin', name: '避難者キャビン', x: 0, z: 15.5, w: 7, d: 9, h: 2.8, wall: ['quilt', 0xf0f0e8, 0.85, 0.02], win: [['w', 1, 8, 1.1, 2.2], ['e', 1, 8, 1.1, 2.2]], rug: [[2.4, 0.6, 2.2, 7.8, 'carpet', 0x8a3a1a]],
      props: [['evacseats', 0.62, 2.5, 1, { n: 4 }], ['evacseats', 0.62, 6.4, 1, { n: 4 }], ['evacseats', 6.38, 2.5, 3, { n: 4 }], ['evacseats', 6.38, 6.4, 3, { n: 4 }], ['poster', 0.25, 4.45, 1, { text: '落ち着いて着席を', c: '#35ff8a', h: 0.34, y: 2.46 }], ['poster', 6.75, 4.45, 3, { text: 'まもなく安全な場所へ', c: '#ffb060', h: 0.34, y: 2.46 }],
        ...(deployed ? [N('避難した市民', 'talk:evacuee', 1.7, 2.5, 1, 0x3a6ea8), N('避難した市民', 'talk:evacuee2', 5.3, 6.4, 3, 0x8a4a6a), N('避難した市民', 'talk:evacuee3', 1.7, 6.9, 1, 0x4a7a4a)] : [])] },
    { id: 'cargo', name: '物資庫・後部ランプ', x: 0, z: 24.5, w: 7, d: 6.5, h: 3.3, floor: ['plate', 0x6a7078, 0.5, 0.6], deco: ['cables'],
      props: [['supplyrack', 6.2, 2.5, 3, { w: 3.6 }], ['hazard', 3.5, 5.7, 0, { w: 3, d: 0.4 }], ['exit', 3.5, 6.3, 2, { label: '後部ランプから降りる', sign: 'RAMP', c: '#ff7a2a', w: 2.6 }], S('物資庫 CARGO', 3.5, 0.26, 0, { h: 0.24, y: 2.9 })] },
  ],
  doors: [['cockpit', 'triage', 3.5, 1.5, 2.0, 'hatch'], ['triage', 'cabin', 3.5, 1.8, 2.3, 'slide'], ['cabin', 'cargo', 3.5, 2.2, 2.4, 'slide']],
  extra(B, out) { mycenaeOutside(B, out, deployed); },
});

// ───────────────────────── 細部の作り込み: 壁の設備・掲示物・備品を部屋ごとに足す ─────────────────────────
// 壁付けの小道具は壁から 0.22m の位置に、向き 0 = 北壁 / 1 = 西壁 / 2 = 南壁 / 3 = 東壁 で置く
const DRESS = {
  atlas: {
    hangar: [['firstaid', 0.22, 22.6, 1], ['extinguisher', 0.22, 24.8, 1], ['wallpanel', 45.78, 7, 3, { text: '格納庫 電源' }], ['dronerack', 45.3, 24, 3, { n: 3 }], ['vent', 45.78, 29, 3, { y: 3.2, w: 1.4 }], ['cylinders', 14, 33.4, 2, { n: 5 }], ['gearwall', 30, 33.76, 2, { w: 3.2 }], ['floorhatch', 38, 20, 0], ['cabledrum', 6.4, 19.4, 0.4],
      ['warnsign', 0.22, 2.4, 1, { text: '発進時\n退避' }], ['tally', 36.6, 33.76, 2, { w: 2.6, h: 1.3, y: 2.6 }]],
    ops: [['mapwall', 13, 21.78, 2, { w: 7.4, h: 3.5, y: 2.9 }], ['tally', 0.22, 6.4, 1, { w: 2.4, h: 1.2, y: 2.5 }], ['extinguisher', 0.22, 13.6, 1], ['wallpanel', 25.78, 21, 3, { w: 1.2, h: 1.0, text: '非常電源' }], ['firstaid', 0.22, 20.8, 1]],
    bay: [['gearwall', 90.6, 0.24, 0, { w: 3.2 }], ['tally', 86.6, 0.22, 0, { w: 2.6, h: 1.3, y: 2.7 }], ['dronerack', 70, 0.62, 0, { n: 4 }], ['dronerack', 117.2, 0.62, 0, { n: 3 }], ['cylinders', 74.6, 0.45, 0, { n: 4 }], ['extinguisher', 75.9, 0.22, 0, { y: 1.1 }], ['firstaid', 84.2, 0.22, 0],
      ['wallpanel', 0.22, 44, 1, { w: 2.2, h: 1.5, text: '西壁 配電' }], ['wallpanel', 159.78, 44, 3, { w: 2.2, h: 1.5, text: '東壁 配電' }], ['cylinders', 0.5, 70, 1, { n: 6 }], ['cylinders', 159.5, 70, 3, { n: 6, k: 1 }], ['vent', 0.22, 52, 1, { y: 4, w: 2 }], ['vent', 159.78, 52, 3, { y: 4, w: 2 }],
      ['floorhatch', 30, 26, 0], ['floorhatch', 130, 26, 0], ['cabledrum', 14, 16, 0.3], ['cabledrum', 150, 16, 1.2], ['warnsign', 0.22, 20, 1, { text: '発進口\n噴流注意', w: 1.4, h: 0.9, y: 2.4 }], ['warnsign', 159.78, 20, 3, { text: '発進口\n噴流注意', w: 1.4, h: 0.9, y: 2.4 }],
      ['mapwall', 62, 0.22, 0, { w: 5.2, h: 2.6, y: 4.6 }], ['bulletin', 100.4, 0.22, 0, { w: 2.4, items: ['整備当番', '発進順 A→C', '点検記録', '燃料補給表', '安全第一', '訓練日程'] }]],
    med: [['firstaid', 0.22, 19.6, 1], ['extinguisher', 27.78, 16.2, 3], ['cylinders', 22.6, 0.45, 0, { n: 4 }], ['stretcherrack', 27.0, 4.6, 2], ['wallpanel', 27.78, 23.8, 3, { w: 1.4, h: 1.1, text: '医療ガス' }], ['glassshelf', 23.6, 25.55, 2, { w: 2.4 }], ['incubator', 13.2, 0.62, 0, { c: '#35ff8a' }], ['dispenser', 26.9, 11.4, 3]],
    supply: [['bulletin', 21.78, 4.4, 3, { w: 2, items: ['在庫表', '出庫記録', '賞味期限', '積込手順', '安全第一', '当番表'] }], ['extinguisher', 21.78, 17.4, 3], ['cylinders', 2, 25.5, 2, { n: 5 }], ['wallpanel', 0.22, 12.6, 1, { text: '冷蔵庫 電源' }], ['warnsign', 11, 25.78, 2, { text: '荷役中\n通行注意', w: 1.2, h: 0.8, y: 2.6 }]],
    crew: [['painting', 16, 0.22, 0, { kind: 3, y: 2.2 }], ['bulletin', 4, 19.78, 2, { w: 2.4 }], ['firstaid', 0.22, 13, 1], ['extinguisher', 0.22, 14.6, 1], ['dispenser', 6.9, 0.45, 0], ['pennant', 13.6, 0.22, 0, { n: 3, y: 3.6, c: 0xc8501e }]],
    brief: [['bulletin', 0.22, 5, 1, { w: 2.4, items: ['出動手順', '着陸帯 一覧', '気象通報', '無線符号', '訓練日程', '表彰'] }], ['painting', 6.4, 0.22, 0, { kind: 3, w: 1.4, h: 1.0 }]],
  },
  fizer: {
    hangar: [['garmentrack', 3.4, 13, 1, { n: 5 }], ['cylinders', 37.5, 12, 3, { n: 5 }], ['wallpanel', 37.78, 18, 3, { text: '滅菌 制御盤' }], ['extinguisher', 37.78, 21.5, 3], ['firstaid', 0.22, 18, 1], ['warnsign', 22.8, 29.78, 2, { text: '清浄区画\n要除染' }], ['floorhatch', 30, 6, 0], ['vent', 0.22, 8, 1, { y: 3, w: 1.6 }]],
    decon: [['warnsign', 0.22, 5.8, 1, { text: '紫外線\n直視禁止', w: 0.8, h: 0.52, y: 1.7 }], ['warnsign', 6.78, 10.2, 3, { text: '薬霧噴射\n立ち止まるな', w: 0.8, h: 0.52, y: 1.7 }], ['vent', 0.22, 14.4, 1, { y: 2.6, w: 0.8, h: 0.4 }]],
    lab: [['incubator', 17.4, 21.3, 2], ['incubator', 18.6, 21.3, 2, { c: '#b48cff' }], ['freezer', 21.4, 21.3, 2, { n: 2 }], ['sequencer', 1.0, 5.4, 1], ['pipettebot', 1.1, 18.6, 1], ['glassshelf', 11.75, 0.4, 0, { w: 2.2 }], ['firstaid', 0.22, 13.6, 1], ['extinguisher', 0.22, 8.4, 1], ['bulletin', 23.78, 20.6, 3, { w: 1.6, items: ['実験予定', '廃液処理', '当番表', '安全第一'] }]],
    pharma: [['freezer', 0.7, 12, 1, { n: 3 }], ['wallpanel', 0.22, 9, 1, { text: '製剤 制御盤' }], ['glassshelf', 6.5, 19.6, 2, { w: 3 }], ['extinguisher', 27.78, 17, 3], ['warnsign', 20, 0.22, 0, { text: '無塵衣\n着用区域' }], ['garmentrack', 26.6, 1.0, 0, { n: 3 }], ['floorhatch', 22, 10.4, 0]],
    clinic: [['glassshelf', 0.4, 11.4, 1, { w: 2.4 }], ['firstaid', 23.78, 3, 3], ['cylinders', 23.5, 9.4, 3, { n: 3 }], ['dispenser', 22.6, 17.4, 2], ['painting', 6, 17.78, 2, { kind: 2, w: 1.4, h: 0.9, y: 2.6 }]],
    cryo: [['warnsign', 6.6, 0.22, 0, { text: '極低温\n素手厳禁' }], ['cylinders', 20, 1.0, 0, { n: 3, k: 1 }], ['wallpanel', 2, 0.22, 0, { w: 1.4, h: 1.1, text: '液体窒素' }]],
    bio: [['incubator', 3.4, 7.4, 0.8, { c: '#8aff9a' }]],
  },
  weapon: {
    hangar: [['warnsign', 0.22, 9.6, 1, { text: '射線注意\n試射 22 秒毎', w: 1.3, h: 0.85, y: 2.4 }], ['wallpanel', 0.22, 16, 1, { w: 2, h: 1.4, text: '装甲ドック 配電' }], ['extinguisher', 0.22, 20, 1], ['cabledrum', 30, 9.6, 0.4], ['pennant', 26.6, 27.78, 2, { n: 3, y: 4.6 }], ['capbank', 33.2, 21, 3, { n: 3 }], ['floorhatch', 8, 12, 0], ['firstaid', 33.78, 17.4, 3]],
    spine: [['extinguisher', 5.78, 20, 3], ['wallpanel', 5.78, 8, 3, { w: 1.2, h: 1.0, y: 1.5, text: '区画 B' }], ['warnsign', 5.78, 16, 3, { text: '走るな', w: 0.6, h: 0.4, y: 1.8 }], ['floorhatch', 3, 14, 0, { w: 1.0 }]],
    armory: [['guncase', 6.6, 9.4, 0], ['guncase', 11, 9.4, 0, { text: '65 式 重粒子銃' }], ['platestand', 18.2, 15.0, 2, { w: 1.6, h: 1.5, n: 6, t: 'IV' }], ['warnsign', 19.78, 5.2, 3, { text: '実弾保管\n火気厳禁' }], ['pennant', 6.8, 0.22, 0, { n: 5, y: 5.0 }], ['shelldisplay', 13.2, 6.2, 0], ['extinguisher', 19.78, 10.4, 3]],
    range: [['targetsheets', 21.6, 8.78, 2, { w: 3 }], ['extinguisher', 23.78, 1.2, 3], ['warnsign', 20.4, 0.22, 0, { text: '実射中\n耳栓着用', w: 0.8, h: 0.52, y: 2.6 }]],
    breech: [['capbank', 15.2, 7.4, 3, { n: 4 }], ['capbank', 15.2, 43.6, 3, { n: 4 }], ['cabledrum', 2, 4, 0.3], ['cabledrum', 13.4, 2.2, 1.2, { c: 0x2a6ab8 }], ['warnsign', 0.22, 26, 1, { text: '強磁場\n金属持込禁止', w: 1.3, h: 0.85, y: 2.2 }], ['warnsign', 0.22, 36, 1, { text: '耳栓着用\n試射区画', w: 1.3, h: 0.85, y: 2.2 }],
      ['wallpanel', 0.22, 12.6, 1, { w: 2.2, h: 1.5, text: '主砲 配電' }], ['extinguisher', 0.22, 33.6, 1], ['ladder', 0.3, 46, 1], ['platestand', 13, 46.6, 2, { w: 1.8, h: 1.8, n: 7, t: 'VI' }], ['floorhatch', 13, 38, 0]],
    mag: [['warnsign', 13.78, 10.6, 3, { text: '火気厳禁' }], ['extinguisher', 13.78, 12, 3], ['wallpanel', 11.4, 13.78, 2, { w: 1.2, h: 1.0, text: '換気' }]],
    bunk: [['bulletin', 8.4, 0.22, 0, { w: 2.2, items: ['当直表', '試射予定', '射撃成績', '食堂献立', '消灯 22 時', '郵便'] }], ['pennant', 6, 15.78, 2, { n: 3, y: 3.25 }], ['dispenser', 0.5, 2.2, 1], ['firstaid', 0.22, 5, 1], ['targetsheets', 0.22, 11.4, 1, { w: 1.6, y: 1.9 }]],
  },
  mycenae: {
    triage: [['wallpanel', 6.78, 0.9, 3, { w: 0.9, h: 0.8, y: 1.6, text: '医療電源' }], ['cylinders', 0.85, 0.45, 0, { n: 3 }], ['handrail', 3.5, 9.26, 2, { w: 1.6, y: 2.45 }]],
    cabin: [['oxygenmasks', 3.5, 4.5, 1, { w: 8, n: 10 }], ['dispenser', 6.5, 8.55, 3], ['extinguisher', 0.22, 8.6, 1]],
    cargo: [['winch', 1.2, 0.9, 0], ['gearwall', 0.24, 4.9, 1, { w: 2.4 }], ['firstaid', 6.78, 5.4, 3], ['cylinders', 5.4, 6.05, 2, { n: 2 }], ['floorhatch', 3.5, 2.6, 0, { w: 1.4 }], ['dronerack', 6.36, 5.4, 3, { n: 1 }]],
    cockpit: [['extinguisher', 3.5, 5.78, 2, { y: 0.9 }]],
  },
};
// 各拠点の主役になる大物 (props6.js): 慰霊碑・操縦シミュレーター・培養槽・遠心機・電子顕微鏡・太陽系儀・発車標・訓練標的・試射監視卓
const HERO = {
  atlas: { hall: [['memorial', 9.8, 26.4, 1.73]], bay: [['simpod', 26, 12.6, 0], S('訓練コーナー ─ 操縦シミュレーター', 26, 0.3, 0, { h: 0.5, y: 6.2, c: '#35ff8a' })] },
  fizer: { lab: [['centrifuge', 15.4, 0.75, 0, { use: 'talk:centrifuge' }], ['microscope', 19.4, 8.6, 0, { use: 'talk:microscope' }]], pharma: [['bioreactor', 19.4, 2.5, 0, { use: 'talk:bioreactor', label: '培養槽 BR-1' }]] },
  weapon: { range: [['dummy', 6.5, 1.3, 1], ['dummy', 9.5, 7.7, 1], ['dummy', 3.4, 7.6, 1]], cic: [['firewatch', 11.4, 15.6, 2.22]] },
  mycenae: { cockpit: [['cockpitkit', 3.5, 0, 0]] },
};
const dress = (bp, k) => { for (const r of bp.rooms) { if (DRESS[k]?.[r.id]) r.props.push(...DRESS[k][r.id]); if (HERO[k]?.[r.id]) r.props.push(...HERO[k][r.id]); } return bp; };

export const BP2 = { 'station:atlas': () => dress(atlas(), 'atlas'), 'station:megaton': () => megaton(), 'station:fizer': () => dress(fizer(), 'fizer'), 'station:weapon': () => dress(weapon(), 'weapon'), 'rescue:mycenae': () => dress(mycenae(false)(), 'mycenae'), 'rescue:mycenae-d': () => dress(mycenae(true)(), 'mycenae') };
export const ALL2 = [['station', 'atlas'], ['station', 'megaton'], ['station', 'fizer'], ['station', 'weapon'], ['rescue', 'mycenae'], ['rescue', 'mycenae-d']];
