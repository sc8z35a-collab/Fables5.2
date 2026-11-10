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
export const body = (id) => BODIES.find((b) => b.id === id);

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
].map((s) => { const b = body(s.body); return { ...s, pos: orbitPos(b, s.alt, s.yaw, s.pitch).toArray() }; });
export const station = (id) => STATIONS.find((s) => s.id === id);

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

// 小型敵戦艦 20 隻 (ヴォイド艦隊)
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
  return out;
})();

/** 着陸拠点 (各惑星 1 箇所) */
export const BASES = {
  terra: { name: 'ネオン・ベイ宇宙港', sub: '巨大都市' }, ignis: { name: 'フォージ採掘基地', sub: '溶岩平原' }, sahar: { name: 'オアシス・コロニー', sub: '砂漠の居住区' },
  zephyr: { name: 'クラウドデッキ', sub: '雲海採取プラットフォーム' }, glacies: { name: '氷床研究所', sub: 'オーロラ観測拠点' },
};
