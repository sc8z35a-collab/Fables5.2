// 世界定義: 天体・ステーション・艦船・交易品
import * as THREE from 'three';
import { rng } from '../core/util.js';

const orbit = (r, a, y = 0) => [r * Math.cos(a), y, r * Math.sin(a)];

export const BODIES = [
  { id: 'sun', name: 'ソル', type: 'sun', R: 1.2e6, pos: [0, 0, 0] },
  { id: 'ignis', name: 'イグニス', sub: '灼熱の溶岩星', type: 'lava', R: 34e3, pos: orbit(1.15e7, 2.3, 2e5), seed: 3.1, spin: 0.006, atmoAlt: 2600, color: '#ff5a1e',
    desc: '地殻の裂け目から溶岩が噴き出す灼熱の星。希少鉱石「マグマ晶」の産地。' },
  { id: 'terra', name: '地球', sub: '人類の故郷', type: 'earth', R: 60e3, pos: orbit(2.2e7, 0.35, 0), seed: 1.7, spin: 0.004, atmoAlt: 4200, color: '#4aa3ff',
    desc: '青い海と巨大都市ネオン・ベイを擁する母星。交易と文化の中心。' },
  { id: 'sahar', name: 'サハル', sub: '赤錆の砂漠星', type: 'desert', R: 44e3, pos: orbit(3.3e7, -0.9, -4e5), seed: 5.3, spin: 0.005, atmoAlt: 3000, color: '#e08a4a',
    desc: '大峡谷と砂丘が続く乾いた星。オアシス・コロニーと軌道造船廠がある。' },
  { id: 'zephyr', name: 'ゼファー', sub: '環を持つガス巨星', type: 'gas', R: 230e3, pos: orbit(5.4e7, 1.4, 6e5), seed: 7.9, spin: 0.012, atmoAlt: 9000, color: '#7fc8e8',
    ring: [300e3, 540e3], tilt: 0.12, desc: '黄金の環をまとう巨大ガス惑星。雲海に浮かぶ採取プラットフォームに着艦できる。' },
  { id: 'glacies', name: 'グラキエス', sub: '氷とオーロラの星', type: 'ice', R: 38e3, pos: orbit(7.2e7, 3.5, -3e5), seed: 9.4, spin: 0.005, atmoAlt: 2800, color: '#bfe9ff',
    desc: '氷床に覆われた極寒の星。夜空をオーロラが彩る研究拠点。' },
];
const BODY_BY = Object.fromEntries(BODIES.map((b) => [b.id, b]));
export const body = (id) => BODY_BY[id]; // HUD などから毎フレーム引くので id → 定義の表で引く

const V = (a) => new THREE.Vector3().fromArray(a);
/** 惑星の昼側・やや斜め上空の位置を返す */
function orbitPos(b, alt, yaw, pitch) {
  const p = V(b.pos), toSun = p.clone().negate().normalize();
  const d = toSun.applyAxisAngle(new THREE.Vector3(0, 1, 0), yaw); d.y += pitch; d.normalize();
  return p.add(d.multiplyScalar(b.R + alt));
}

export const STATIONS = [
  { id: 'haven', name: 'ヘイヴン・リング', sub: '交易ハブ', body: 'terra', kind: 'ring', alt: 26e3, yaw: 0.9, pitch: 0.25, color: '#4de1ff',
    desc: '地球軌道上の回転居住リング。星系最大の市場。' },
  { id: 'vulcan', name: 'ヴァルカン造船廠', sub: '造船・改修', body: 'sahar', kind: 'yard', alt: 20e3, yaw: -0.8, pitch: 0.2, color: '#ffb347',
    desc: '艦船の建造と改修を担う軌道ドック。' },
  { id: 'aurora', name: 'オーロラ天文台', sub: '科学研究', body: 'glacies', kind: 'science', alt: 17e3, yaw: 0.7, pitch: 0.35, color: '#a6f0ff',
    desc: '深宇宙観測と惑星研究の拠点。探査データを買い取る。' },
  { id: 'bastion', name: 'バスティオン要塞', sub: '星系防衛軍', body: 'zephyr', kind: 'fort', alt: 150e3, yaw: 0.6, pitch: 0.16, color: '#ff6b5a',
    desc: 'ゼファーの環を見下ろす軍事要塞。賞金首の情報が集まる。' },
  { id: 'rogue', name: 'ローグズ・デン', sub: '無法者の巣', body: 'ignis', kind: 'pirate', alt: 21e3, yaw: -1.0, pitch: 0.3, color: '#ff4df0',
    desc: '小惑星をくり抜いた闇市とカジノ。何でも売り買いできる。' },
  // ── 追加の 4 基 (既存の 5 基より後ろに置くこと: 敵艦の配置は各惑星の「最初の」ステーションを基準にしている) ──
  { id: 'atlas', name: 'アトラス救難基地', sub: '救難・災害対応', body: 'terra', kind: 'rescue', alt: 30e3, yaw: -0.62, pitch: 0.32, color: '#5dffa8',
    desc: '天球を担ぐ巨人の名を持つ救難拠点。救助船「ミケーネ」15 機を地球の都市へ緊急出動させる。' },
  { id: 'megaton', name: 'メガトン', sub: '巨大軌道都市', body: 'zephyr', kind: 'mega', alt: 135e3, yaw: -0.55, pitch: 0.2, color: '#ffd27a',
    desc: '全長 3km を超える星系最大の建造物。核融合炉「メガトン炉」と百万都市を抱える回転居住筒。' },
  { id: 'fizer', name: 'ファイザー', sub: '医療・創薬研究', body: 'sahar', kind: 'medical', alt: 26e3, yaw: 0.7, pitch: 0.34, color: '#b48cff',
    desc: '二重らせんの形をした創薬研究ステーション。星系の医薬品はここで作られる。' },
  { id: 'weapon', name: 'ウェポン', sub: '兵器試験場', body: 'ignis', kind: 'arsenal', alt: 27e3, yaw: 0.75, pitch: 0.22, color: '#ffe14d',
    desc: 'ステーションそのものが一門の巨大電磁投射砲。定期的に標的小惑星へ試射を行う。' },
].map((s) => { const b = body(s.body); return { ...s, pos: orbitPos(b, s.alt, s.yaw, s.pitch).toArray() }; });
const STATION_BY = Object.fromEntries(STATIONS.map((s) => [s.id, s]));
export const station = (id) => STATION_BY[id];

// 主人公機 3 隻
export const SHIPS = {
  hayate: { id: 'hayate', name: 'ハヤテ', kanji: '疾風', cls: '高機動迎撃機', len: 17, radius: 9, maxSpeed: 460, boost: 2.5, accel: 2.6, turn: 2.0, hull: 110, shield: 110, energy: 100, cargo: 8, guns: 2, dmg: 10, rof: 9, missiles: 6, color: '#ff8a2a',
    desc: '星系最速の単座迎撃機。旋回性能と加速に優れる。' },
  raiden: { id: 'raiden', name: 'ライデン', kanji: '雷電', cls: '重装ガンシップ', len: 36, radius: 19, maxSpeed: 330, boost: 2.0, accel: 1.5, turn: 1.25, hull: 280, shield: 220, energy: 160, cargo: 24, guns: 4, dmg: 13, rof: 7, missiles: 14, color: '#ff3b3b',
    desc: '重装甲と四連装砲を備えた強襲艦。正面火力は随一。' },
  amatsu: { id: 'amatsu', name: 'アマツ', kanji: '天津', cls: '長距離探査船', len: 52, radius: 27, maxSpeed: 380, boost: 2.2, accel: 1.8, turn: 1.1, hull: 190, shield: 260, energy: 220, cargo: 60, guns: 2, dmg: 11, rof: 6, missiles: 8, color: '#35e0c8',
    desc: '回転居住環と庭園を持つ優美な探査船。大容量の貨物室を備える。' },
};

export const COMMODITIES = [
  { id: 'food', name: '食料', base: 40 }, { id: 'water', name: '水', base: 25 }, { id: 'ore', name: '鉱石', base: 70 }, { id: 'alloy', name: '合金', base: 160 },
  { id: 'elec', name: '電子部品', base: 320 }, { id: 'med', name: '医薬品', base: 260 }, { id: 'cell', name: '燃料電池', base: 120 }, { id: 'lux', name: '贅沢品', base: 540 },
  { id: 'magma', name: 'マグマ晶', base: 480 }, { id: 'ice', name: '氷晶', base: 360 }, { id: 'spice', name: '砂漠香料', base: 420 }, { id: 'gas', name: '希ガス', base: 300 },
  { id: 'data', name: '探査データ', base: 650 }, { id: 'contra', name: '密輸品', base: 900 }, { id: 'salvage', name: '回収部品', base: 380 },
];
// 各拠点の価格係数 (1 未満=安い=買い時, 1 超=高い=売り時)
export const PRICES = {
  haven: { food: 0.8, water: 0.8, ore: 1.3, alloy: 1.2, elec: 0.85, med: 0.9, cell: 1.0, lux: 0.8, magma: 1.5, ice: 1.4, spice: 1.4, gas: 1.3, data: 1.0, salvage: 1.0 },
  vulcan: { food: 1.3, water: 1.5, ore: 1.2, alloy: 0.75, elec: 1.25, med: 1.2, cell: 0.8, lux: 1.2, magma: 1.3, ice: 1.2, spice: 0.7, gas: 1.2, salvage: 1.4 },
  aurora: { food: 1.4, water: 0.6, ore: 1.0, alloy: 1.2, elec: 1.4, med: 0.8, cell: 1.3, lux: 1.3, magma: 1.6, ice: 0.6, spice: 1.3, gas: 1.1, data: 1.6 },
  bastion: { food: 1.2, water: 1.2, ore: 0.9, alloy: 1.4, elec: 1.2, med: 1.5, cell: 1.2, lux: 1.0, gas: 0.6, salvage: 1.2, data: 1.2 },
  rogue: { food: 1.5, water: 1.6, ore: 0.7, alloy: 1.0, elec: 1.1, med: 1.6, cell: 1.1, lux: 1.6, magma: 0.6, contra: 1.0, salvage: 1.6, spice: 1.6, ice: 1.5 },
  atlas: { food: 1.3, water: 1.35, med: 1.5, cell: 1.25, elec: 1.15, alloy: 1.1, lux: 0.85, salvage: 1.15, data: 1.1 },
  megaton: { food: 1.5, water: 1.45, ore: 1.45, alloy: 0.7, elec: 0.75, cell: 0.55, lux: 0.9, gas: 1.5, magma: 1.4, ice: 1.3, spice: 1.35, med: 1.2, salvage: 1.3, data: 1.1 },
  fizer: { med: 0.5, spice: 1.65, ice: 1.55, water: 1.3, food: 1.3, elec: 1.25, data: 1.35, gas: 1.2, cell: 1.1 },
  weapon: { alloy: 1.5, magma: 1.55, elec: 1.35, cell: 1.3, ore: 1.2, salvage: 0.6, food: 1.4, med: 1.4, gas: 1.25 },
};
// 惑星拠点の現地価格 (特産品が安い)
Object.assign(PRICES, {
  terra: { food: 0.7, water: 0.75, elec: 0.8, med: 0.85, lux: 0.7, cell: 1.0, ore: 1.35, alloy: 1.25, magma: 1.6, ice: 1.5, spice: 1.5, gas: 1.35 },
  ignis: { magma: 0.45, ore: 0.55, alloy: 0.8, food: 1.6, water: 1.8, med: 1.5, cell: 1.2 },
  sahar: { spice: 0.45, food: 1.5, water: 1.9, ore: 0.9, lux: 1.4, elec: 1.3, med: 1.3 },
  zephyr: { gas: 0.45, cell: 0.7, food: 1.4, lux: 1.5, elec: 1.2, water: 1.2 },
  glacies: { ice: 0.45, water: 0.4, food: 1.6, med: 1.2, elec: 1.4, cell: 1.4, lux: 1.3 },
});
export const UPGRADES = [
  { id: 'laser', name: 'レーザー出力', desc: '主砲の威力 +18%/Lv', base: 900 },
  { id: 'shield', name: 'シールド発生器', desc: 'シールド容量 +20%/Lv', base: 800 },
  { id: 'armor', name: '複合装甲', desc: '船体耐久 +20%/Lv', base: 700 },
  { id: 'engine', name: '推進機関', desc: '最高速と加速 +10%/Lv', base: 1000 },
  { id: 'cargo', name: '貨物拡張', desc: '積載量 +30%/Lv', base: 600 },
  { id: 'missile', name: 'ミサイルラック', desc: '搭載数 +4/Lv', base: 750 },
];

// 小型敵戦艦 40 隻 (ヴォイド艦隊)。前半 20 隻は形だけの汎用艦、後半 20 隻は艦種つき (ENEMY_CLASSES)
/**
 * 艦種: name = 艦種名、code = 艦名、arch = 船体の基本形 (0 ダガー / 1 クロー / 2 マンタ / 3 スパイン)、glow = 灯りの色、tier = 宙域の脅威度への加減
 * hull = 外装の素材 (en-hull-*)、mark = 側面の紋章、nose = 機首の絵、parts = 艤装 (ships.js の CLASS_PARTS)、eng = 噴射口の絵
 * k = 強さの倍率 (hull 装甲 / shield シールド / dmg 威力 / speed 速さ / turn 旋回 / rate 連射 / range 射程 / bolt 弾速 / size 弾の太さ / aggro 気付く距離 / regen シールド回復 / bounty 賞金)
 * room = 艦内の特別な部屋、wall / floor / ceil = 艦内の素材 (en-*)
 */
export const ENEMY_CLASSES = {
  scout: { name: '偵察艇', code: 'アイズ', arch: 0, glow: '#7dff2a', hull: 'en-hull-camo', mark: 'en-emblem-void', parts: ['dish'], eng: 'en-nozzle-inner', k: { hull: 0.7, shield: 0.8, dmg: 0.7, speed: 1.35, turn: 1.3, aggro: 1.4, bounty: 0.8 }, room: 'sensor', wall: 'en-bridge-wall', floor: 'en-floor-mat' },
  tanker: { name: '補給艇', code: 'オアシス', arch: 2, glow: '#ff8a1e', hull: 'en-hull-industrial', mark: 'en-emblem-void', parts: ['tanks'], eng: 'en-nozzle-inner', k: { hull: 1.5, shield: 0.7, dmg: 0.6, speed: 0.8, turn: 0.8, rate: 0.7, bounty: 1.1 }, room: 'fuel', floor: 'en-floor-mat' },
  repair: { name: '工作艇', code: 'レンチ', arch: 1, glow: '#ffd23a', hull: 'en-hull-industrial', mark: 'en-emblem-void', parts: ['arms'], eng: 'en-nozzle-inner', k: { hull: 1.3, shield: 1.1, dmg: 0.7, regen: 2.5, speed: 0.9 }, room: 'workshop', floor: 'en-hazard-floor' },
  pirate: { name: '海賊改造艇', code: 'ジャンク', arch: 1, glow: '#ff2a2a', hull: 'en-hull-scrap', mark: 'en-emblem-pirate', nose: 'en-noseart-fang', parts: ['guns'], eng: 'en-afterburner', k: { hull: 1.1, shield: 0.5, dmg: 1.2, rate: 1.2, speed: 1.1, bounty: 1.2 }, room: 'holding', wall: 'en-wall-scrap', floor: 'en-floor-mat' },
  torpedo: { name: '魚雷艇', code: 'ランス', arch: 0, glow: '#ff2ad4', hull: 'en-hull-hex', mark: 'en-emblem-void', parts: ['torpedo'], eng: 'en-nozzle-inner', k: { dmg: 2.2, rate: 0.45, bolt: 0.75, size: 2.2, range: 1.2 }, room: 'torpedo', floor: 'en-hazard-floor' },
  mine: { name: '機雷敷設艇', code: 'スパイク', arch: 2, glow: '#ff8a1e', hull: 'en-hull-hex', mark: 'en-emblem-void', parts: ['mines'], eng: 'en-nozzle-inner', k: { hull: 1.2, dmg: 1.4, rate: 0.6, size: 1.6, speed: 0.85 }, room: 'mines' },
  ram: { name: '突撃艇', code: 'ブル', arch: 0, glow: '#ff2a2a', hull: 'en-hull-ram', mark: 'en-emblem-void', nose: 'en-noseart-fang', parts: ['ram'], eng: 'en-afterburner', k: { hull: 1.6, shield: 0.8, speed: 1.4, turn: 1.1, range: 0.7, bounty: 1.1 }, room: 'barracks2', wall: 'en-battle-damage' },
  boarding: { name: '強襲揚陸艇', code: 'クラッチ', arch: 3, glow: '#ff2ad4', hull: 'en-hull-hex', mark: 'en-emblem-void', parts: ['clamp'], eng: 'en-nozzle-inner', k: { hull: 1.3, speed: 1.15 }, room: 'boarding', floor: 'en-hazard-floor' },
  magma: { name: '溶岩艇', code: 'ヴォルカ', arch: 2, glow: '#ff6a1e', hull: 'en-hull-ceramic', mark: 'en-emblem-void', parts: ['radiators'], eng: 'en-afterburner', k: { hull: 1.3, dmg: 1.2, speed: 1.05 }, room: 'reactor2', wall: 'en-wall-padded', floor: 'en-floor-hot' },
  gunboat: { name: '砲艇', code: 'ハンマー', arch: 3, glow: '#ffd23a', hull: 'en-hull-hex', mark: 'en-emblem-void', nose: 'en-noseart-bolt', parts: ['cannon'], eng: 'en-nozzle-inner', k: { hull: 1.2, dmg: 1.8, rate: 0.6, size: 1.8, bolt: 0.9 }, room: 'gunnery' },
  missile: { name: 'ミサイル艇', code: 'ヴォレー', arch: 1, glow: '#ff2a2a', hull: 'en-hull-camo', mark: 'en-emblem-void', parts: ['pods'], eng: 'en-nozzle-inner', k: { dmg: 0.8, rate: 1.6, spread: 2.2, range: 1.25 }, room: 'missiles', floor: 'en-hazard-floor' },
  bomber: { name: '爆撃艇', code: 'アンヴィル', arch: 2, glow: '#ff8a1e', hull: 'en-hull-industrial', mark: 'en-emblem-void', nose: 'en-noseart-bolt', parts: ['bombbay'], eng: 'en-afterburner', k: { hull: 1.4, dmg: 2.4, rate: 0.35, size: 2.6, bolt: 0.6, speed: 0.85, turn: 0.8 }, room: 'bombs', floor: 'en-hazard-floor' },
  stealth: { name: 'ステルス艇', code: 'シャドウ', arch: 0, glow: '#a04dff', hull: 'en-hull-stealth', parts: ['stealth'], eng: 'en-ion-core', k: { hull: 0.8, dmg: 1.3, speed: 1.25, turn: 1.2, aggro: 0.55, bounty: 1.3 }, room: 'ewroom', wall: 'en-wall-stealth', floor: 'en-bridge-floor', ceil: 'en-ceil-grate' },
  ew: { name: '電子戦艇', code: 'ノイズ', arch: 3, glow: '#2ad4ff', hull: 'en-hull-camo', mark: 'en-emblem-void', parts: ['ew'], eng: 'en-ion-core', k: { shield: 1.4, dmg: 0.8, spread: 0.5, range: 1.3, bounty: 1.2 }, room: 'ewroom', wall: 'en-wall-stealth', ceil: 'en-ceil-grate' },
  sniper: { name: '狙撃艇', code: 'ニードル', arch: 3, glow: '#2ad4ff', hull: 'en-hull-stealth', mark: 'en-emblem-void', parts: ['rail'], eng: 'en-ion-core', k: { hull: 0.8, dmg: 2.6, rate: 0.35, range: 1.8, bolt: 1.7, spread: 0.2, speed: 0.9 }, room: 'capacitors', ceil: 'en-ceil-lit' },
  command: { name: '指揮艇', code: 'クラウン', arch: 2, glow: '#ffd23a', hull: 'en-hull-command', mark: 'en-emblem-command', parts: ['antennas', 'lights'], eng: 'en-ion-core', k: { hull: 1.5, shield: 1.5, dmg: 1.2, bounty: 1.8 }, room: 'command', wall: 'en-wall-command', floor: 'en-bridge-floor', ceil: 'en-ceil-lit' },
  frost: { name: '氷結艇', code: 'グレイシャー', arch: 1, glow: '#9adfff', hull: 'en-hull-frost', mark: 'en-emblem-void', parts: ['coolant'], eng: 'en-ion-core', k: { hull: 1.3, shield: 1.2, speed: 0.95 }, room: 'reactor2', wall: 'en-wall-frost', floor: 'en-floor-mat' },
  guard: { name: '護衛艇', code: 'イージス', arch: 2, glow: '#2ad4ff', hull: 'en-hull-hex', mark: 'en-emblem-void', parts: ['shield'], eng: 'en-nozzle-inner', k: { hull: 1.1, shield: 2.4, regen: 2.0, dmg: 0.9 }, room: 'shieldgen', wall: 'en-wall-padded' },
  drone: { name: 'ドローン母艇', code: 'ハイヴ', arch: 3, glow: '#7dff2a', hull: 'en-hull-hex', mark: 'en-emblem-void', parts: ['dronebay'], eng: 'en-nozzle-inner', k: { hull: 1.2, dmg: 0.6, rate: 2.0, spread: 1.8 }, room: 'drones', floor: 'en-hazard-floor' },
  carrier: { name: '迎撃機母艇', code: 'ワスプ', arch: 1, glow: '#ff2ad4', hull: 'en-hull-command', mark: 'en-emblem-void', parts: ['dronebay', 'lights'], eng: 'en-afterburner', k: { hull: 1.3, shield: 1.2, dmg: 0.7, rate: 1.8, speed: 1.1, bounty: 1.4 }, room: 'drones', ceil: 'en-ceil-lit' },
};
/** 艦種つきの艦の配置: [惑星, その宙域の脅威度, 艦種] */
const CLASS_PLAN = [['terra', 1, ['scout', 'tanker', 'repair', 'pirate']], ['sahar', 2, ['torpedo', 'mine', 'ram', 'boarding']], ['ignis', 2, ['magma', 'gunboat', 'missile', 'bomber']],
  ['zephyr', 3, ['stealth', 'ew', 'sniper', 'command']], ['glacies', 3, ['frost', 'guard', 'drone', 'carrier']]];
const NAMES = ['ファング', 'クロウ', 'レイス', 'ヴァイパー', 'シェイド', 'タロン', 'スコーピオ', 'ハウンド', 'リーパー', 'ゴースト', 'ヴェノム', 'ラプター', 'バラクーダ', 'マンティス', 'ケルベロス', 'ヘルハウンド', 'ナイトメア', 'スペクター', 'バジリスク', 'ドレッド'];
const GLOWS = ['#ff2a2a', '#ff2ad4', '#7dff2a', '#ff8a1e', '#a04dff'];
export const ENEMIES = (() => {
  const out = [], plan = [['terra', 3, 1], ['sahar', 4, 2], ['ignis', 4, 2], ['zephyr', 5, 3], ['glacies', 4, 3]], r = rng(9001);
  let i = 0;
  for (const [bid, n, tier] of plan) {
    const b = body(bid), st = STATIONS.find((s) => s.body === bid), base = V(st.pos), up = base.clone().sub(V(b.pos)).normalize();
    const side = new THREE.Vector3(0, 1, 0).cross(up).normalize(), fw = up.clone().cross(side);
    for (let k = 0; k < n; k++, i++) {
      const g = Math.floor(k / 2), a = (g * 2.1 + 0.8) + r() * 0.4, d = 38e3 + g * 26e3 + r() * 8e3;
      const p = base.clone().addScaledVector(side, Math.cos(a) * d).addScaledVector(fw, Math.sin(a) * d).addScaledVector(up, (r() - 0.3) * 12e3 + 4e3);
      p.x += (k % 2) * 700; p.y += (k % 2) * 300;
      out.push({ id: 'e' + i, idx: i, name: 'ヴォイド・' + NAMES[i] + '-' + String(11 + ((i * 37) % 88)).padStart(2, '0'), arch: i % 4, seed: 1000 + i * 77, tier, body: bid,
        glow: GLOWS[(i + tier) % GLOWS.length], pos: p.toArray(), hull: 90 + tier * 55, shield: 60 + tier * 45, dmg: 5 + tier * 2.5, bounty: 1200 + tier * 900 });
    }
  }
  // 艦種つきの小型戦艦 20 隻 (各惑星の宙域に 4 隻ずつ、既存の艦とは駅を挟んだ反対側)
  const r2 = rng(9002);
  for (const [bid, tier, ids] of CLASS_PLAN) {
    const b = body(bid), st = STATIONS.find((s) => s.body === bid), base = V(st.pos), up = base.clone().sub(V(b.pos)).normalize();
    const side = new THREE.Vector3(0, 1, 0).cross(up).normalize(), fw = up.clone().cross(side);
    ids.forEach((cid, k) => {
      const c = ENEMY_CLASSES[cid], g = Math.floor(k / 2), a = Math.PI + (g * 1.9 + 0.5) + (k % 2) * 0.45 + r2() * 0.3, d = 46e3 + g * 24e3 + r2() * 8e3;
      const p = base.clone().addScaledVector(side, Math.cos(a) * d).addScaledVector(fw, Math.sin(a) * d).addScaledVector(up, (r2() - 0.3) * 12e3 + 5e3);
      const t = Math.max(1, Math.min(3, tier + (c.tier || 0))), K = c.k || {};
      out.push({ id: 'e' + i, idx: i, cls: cid, name: `ヴォイド${c.name}「${c.code}」-${String(11 + ((i * 41) % 88)).padStart(2, '0')}`, arch: c.arch, seed: 1000 + i * 77, tier: t, body: bid,
        glow: c.glow, pos: p.toArray(), hull: Math.round((90 + t * 55) * (K.hull || 1)), shield: Math.round((60 + t * 45) * (K.shield || 1)), dmg: +((5 + t * 2.5) * (K.dmg || 1)).toFixed(1), bounty: Math.round((1200 + t * 900) * (K.bounty || 1) / 100) * 100 });
      i++;
    });
  }
  return out;
})();

/** 着陸拠点 (各惑星 1 箇所) */
export const BASES = {
  terra: { name: 'ネオン・ベイ宇宙港', sub: '巨大都市' }, ignis: { name: 'フォージ採掘基地', sub: '溶岩平原' }, sahar: { name: 'オアシス・コロニー', sub: '砂漠の居住区' },
  zephyr: { name: 'クラウドデッキ', sub: '雲海採取プラットフォーム' }, glacies: { name: '氷床研究所', sub: 'オーロラ観測拠点' },
};

/** アトラス所属の救助船「ミケーネ」: 最大 15 機を地球の都市へ出動できる */
export const RESCUE = { max: 15, name: 'ミケーネ', cls: '多目的救助船' };
/** 地球で起こる災害 (日替わり)。need = 収拾に必要な救助船の数 */
export const DISASTERS = [
  { name: 'ネオン・ベイ湾岸部の高潮', need: 5 }, { name: '市街中心部の大規模停電', need: 10 }, { name: 'ネオン・ベイ全域の豪雨浸水', need: 15 },
  { name: 'モノレール高架の崩落事故', need: 5 }, { name: '港湾コンテナ火災', need: 10 }, { name: '軌道デブリの落下', need: 15 },
];
