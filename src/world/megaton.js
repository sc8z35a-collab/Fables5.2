// メガトン船内「第 7 居住甲板」: 港 (第 7 ドック) から本通りが東へ延び、そのまわりに 8 つの街区が張りついた百万都市のひとかけら
//   錨町 (いちばん古い路地の町) / 展望町 (外壁の窓に面した住宅) / 市場 / 緑ヶ丘団地 / 学校通り / 鋳物町 (工員寮と工場) / 第 9 区 (中庭を囲む新しい街) / 港町 (倉庫と長屋)
// 通路は区間ごとに幅・天井の高さ・継ぎ目のずれが違う手描きの折れ線。住戸は通路沿いに、間口も奥行きも揃わない区画を 1 戸ずつ詰めて作り、
// 間取り (1 室 / 台所 + 和室 / LDK + 寝室 + 浴室)・扉の位置・家具・玄関先の私物も戸ごとに変える (同じ形の繰り返しにしない)
// THREE を使わない純粋なデータ生成なので、node でも検証できる (validate)
import { rng } from '../core/util.js';

const T = 0.2, HP = Math.PI / 2;
const q = (v) => Math.round(v * 100) / 100, q5 = (v) => Math.round(v * 20) / 20; // 区画は 5 cm 単位 (丸め誤差で重ならないように)
const S = (text, x, z, rot, o = {}) => ['sign', x, z, rot, { text, ...o }];
const N = (label, use, x, z, rot, suit, o = {}) => ['npc', x, z, rot, { label, use, suit, ...o }];
const TM = (label, use, x, z, rot, o = {}) => ['terminal', x, z, rot, { label, use, ...o }];
const SURN = ['佐藤', '鈴木', '高橋', '田中', '伊藤', '渡辺', '山本', '中村', '小林', '加藤', '吉田', '山田', '佐々木', '山口', '松本', '井上', '木村', '林', '斎藤', '清水', '山崎', '森', '池田', '橋本', '阿部', '石川', '前田', '藤田', '小川', '岡田', '後藤', '長谷川', '村上', '近藤', '石井', '坂本', '遠藤', '青木', '藤井', '西村', '福田', '太田', '三浦', '岡本', '松田', '中川', '中野', '原田', '小野', '田村', '竹内', '金子', '和田', '中山', '石田', '上田', '森田', '原', '柴田', '酒井', '工藤', '横山', '宮崎', '宮本', '内田', '高木', '安藤', '谷口', '大野', '丸山', '今井', '河野', '藤原', '村田', '武田', '上野', '杉山', '増田', '平野', '大塚', '千葉', '久保', '松井', '小島', '岩崎', '桜井', '野口', '松尾', '野村', '木下', '菊地', '佐野', '大西', '杉本', '新井', '浜田', '市川', '古川', '水野', '小松', '島田', '星野', '月岡', '天野', '北村', '南', '東', '西田',
  'ガルシア', 'リー', 'チェン', 'コワルスキ', 'オコンクォ', 'シン', 'ペトロフ', 'ノヴァク', 'スミス', 'ミュラー', 'ロッシ', 'キム', 'パク', 'グエン', 'サントス', 'ハッサン', 'ヨハンソン', 'デュボワ', 'アフマド', 'ロペス'];
const SUIT = [0x3a6ea8, 0x8a3a3a, 0x3a8a6a, 0x6a4a8a, 0xc9a22e, 0x4a4a52, 0xd86a8a, 0x2c5a4e, 0x8a6a2a, 0x5a7a9a];
const BLANK = [0x35507a, 0x8a3a3a, 0x3a7a5a, 0xc9a22e, 0x6a4a8a, 0xd8a0a0, 0x4a8a9a, 0xe8e0d0, 0x2c4a6a, 0xa86a3a];
const WOOD = [0xc8a880, 0xb08860, 0x8a6a4a, 0xd8c0a0, 0x6a5040, 0xe0d0b8];
const CLOTH = ['mg-clothes-denim', 'mg-clothes-flower', 'mg-clothes-work', 'mg-cloth-check', 'mg-cloth-knit', 'mg-clothes-denim', 'mg-clothes-flower', 'mg-cloth-check', 'mg-cloth-suit', 'mg-cloth-yukata', undefined]; // 住人の服 (undefined = 作業服)

// ───────────────────────── 街区ごとの区画の作り方 ─────────────────────────
// f = 間口、d = 奥行き (m)、h = 天井高、shop / svc = 店・共用室になる割合、gap = 区画の間に壁だけの区間を空ける割合
const DIST = {
  main: { name: '本通り', f: [6.5, 11], d: [5, 11], h: [4.2, 4.8], shop: 1, gap: 0.08, g: [1, 2.5] },
  market: { name: '市場通り', f: [3.6, 6.2], d: [4.6, 8], h: [3.2, 3.6], shop: 0.92, gap: 0.08, g: [0.8, 2] },
  old: { name: '錨町', nook: 0.05, f: [2.9, 5.2], d: [4.0, 7.8], h: [2.45, 2.7], shop: 0.16, svc: 0.05, gap: 0.12, g: [0.5, 2.2] },
  view: { name: '展望町', nook: 0.05, f: [7.2, 11.5], d: [8, 12.5], h: [2.8, 3.0], shop: 0.04, svc: 0.08, gap: 0.12, g: [1.2, 3] },
  green: { name: '緑ヶ丘', nook: 0.06, f: [5.6, 9], d: [5.6, 11.5], h: [2.55, 2.7], shop: 0.05, svc: 0.12, gap: 0.1, g: [1, 2.6] },
  ninth: { name: '第 9 区', nook: 0.06, f: [5.2, 8.6], d: [6, 10], h: [2.6, 2.75], shop: 0.05, svc: 0.1, gap: 0.08, g: [1, 2.4] },
  dorm: { name: '鋳物町', nook: 0.05, f: [3.3, 4.6], d: [4.2, 6.4], h: [2.5, 2.6], shop: 0.05, svc: 0.1, gap: 0.1, g: [0.8, 2] },
  port: { name: '港町', nook: 0.05, f: [3.8, 6.2], d: [5, 9], h: [2.5, 2.7], shop: 0.1, svc: 0.12, gap: 0.12, g: [1, 2.6] },
  crew: { name: '船員街', nook: 0.05, f: [3.1, 5.6], d: [4.2, 8], h: [2.45, 2.65], shop: 0.12, svc: 0.06, gap: 0.12, g: [0.6, 2.2] },
  hikari: { name: 'ひかり台', nook: 0.06, f: [5.0, 8.4], d: [5.6, 9.8], h: [2.55, 2.7], shop: 0.06, svc: 0.1, gap: 0.08, g: [1, 2.4] },
};
/** 新しい 2 街区は、家具・小物・照明の選び方を似た街区から借りる */
const LIKE = { crew: 'port', hikari: 'green' };
const like = (d) => LIKE[d] || d;

/** 素材: 画像 (mg-*) があればそれを白で、無ければ既存の素材に色を付けて使う */
function palette(has) {
  const m = (n, fb, c, r = 0.6, me = 0.2) => (has('materials/' + n) ? [n, 0xffffff, r, me] : [fb, c, r, me]);
  return {
    old: { floor: m('mg-floor-old', 'tread', 0xb8b2a6, 0.55, 0.35), wall: m('mg-wall-old', 'welded-steel', 0xece2c8, 0.7, 0.25), ceil: m('mg-ceil-pipes', 'ceil', 0xe2ded6) },
    main: { floor: m('mg-floor-main', 'granite-pavers', 0xe4e0d8, 0.35, 0.05), wall: m('mg-wall-main', 'glazed-brick', 0xf2eee6, 0.5, 0.05), ceil: m('mg-ceil-panel', 'ceil', 0xf4f4f0) },
    market: { floor: m('mg-floor-market', 'board-concrete', 0xc8c4bc, 0.45, 0.05), wall: m('mg-wall-main', 'glazed-brick', 0xf0e8dc, 0.5, 0.05), ceil: m('mg-ceil-pipes', 'ceil', 0xe8e4dc) },
    green: { floor: m('mg-floor-danchi', 'rubber-chips', 0xa8c4b0, 0.6, 0.05), wall: m('mg-wall-danchi', 'lab', 0xf2f0e8, 0.8, 0.05), ceil: m('mg-ceil-panel', 'ceil', 0xf4f4f0) },
    view: { floor: m('mg-floor-view', 'marble', 0xe8e2d8, 0.25, 0.05), wall: m('mg-wall-view', 'walnut', 0xd8c0a0, 0.6, 0.05), ceil: m('mg-ceil-panel', 'plaster', 0xf6f4f0) },
    dorm: { floor: m('mg-floor-foundry', 'tread', 0x9a9a92, 0.55, 0.5), wall: m('mg-wall-foundry', 'welded-steel', 0xc8d0c4, 0.65, 0.4), ceil: m('mg-ceil-pipes', 'rib', 0xc8ccd0) },
    ninth: { floor: m('mg-floor-ninth', 'terrazzo', 0xf0eee8, 0.3, 0.05), wall: m('mg-wall-ninth', 'lab', 0xf6f6f2, 0.5, 0.1), ceil: m('mg-ceil-panel', 'ceil', 0xf6f6f4) },
    port: { floor: m('mg-floor-port', 'board-concrete', 0xb8b4ac, 0.6, 0.1), wall: m('mg-wall-port', 'zinc-roof', 0xd0d4d0, 0.6, 0.4), ceil: m('mg-ceil-pipes', 'rib', 0xc8ccd0) },
    crew: { floor: m('mg-floor-crew', 'walnut', 0xb89a78, 0.7, 0.05), wall: m('mg-wall-port', 'zinc-roof', 0xd8dcd4, 0.6, 0.4), ceil: m('mg-ceil-pipes', 'rib', 0xd0d2d4) },
    hikari: { floor: m('mg-floor-hikari', 'rubber-chips', 0xb8c8d8, 0.6, 0.05), wall: m('mg-wall-ninth', 'lab', 0xf4f2ec, 0.5, 0.1), ceil: m('mg-ceil-panel', 'ceil', 0xf6f6f4) },
    civic: { floor: m('mg-floor-civic', 'terrazzo', 0xeeeae2, 0.3, 0.05), wall: m('mg-wall-civic', 'lab', 0xf4f2ec, 0.8, 0.05), ceil: m('mg-ceil-panel', 'ceil', 0xf6f6f4) },
    svc: { floor: m('mg-floor-foundry', 'tread', 0xa8a8a0, 0.55, 0.5), wall: m('mg-wall-foundry', 'welded-steel', 0xd0d4cc, 0.65, 0.4), ceil: m('mg-ceil-pipes', 'rib', 0xc8ccd0) },
    home: {
      oak: m('mg-floor-oak', 'wood', 0xd8b890, 0.5, 0), tatami: m('mg-tatami', 'shoji', 0xc8c890, 0.9, 0), vinyl: m('mg-floor-cushion', 'laminate', 0xe0d0b8, 0.45, 0), carpet: m('mg-floor-carpet', 'carpet', 0x8a9aa8, 0.95, 0), bathf: m('mg-floor-bath', 'porcelain', 0xe8eef0, 0.3, 0),
      paper: m('mg-wallpaper', 'cotton-cloth', 0xf8f4ec, 0.85, 0), pattern: m('mg-wallpaper-kids', 'cotton-cloth', 0xf4e4e0, 0.85, 0), panel: m('mg-wall-wood', 'walnut', 0xd8c0a0, 0.6, 0), batht: m('mg-wall-bath', 'porcelain', 0xd8e8f0, 0.3, 0),
      ceil: m('mg-ceil-home', 'flat', 0xf4f2ee, 0.9, 0),
      dark: m('mg-floor-dark', 'walnut', 0x6a4a30, 0.5, 0), herring: m('mg-floor-herringbone', 'wood', 0xc89868, 0.5, 0), tilew: m('mg-floor-tile-white', 'porcelain', 0xf0f0ec, 0.35, 0),
      flower: m('mg-wallpaper-flower', 'cotton-cloth', 0xf6eee6, 0.85, 0), stripe: m('mg-wallpaper-stripe', 'cotton-cloth', 0xeef2f4, 0.85, 0), greenw: m('mg-wallpaper-green', 'cotton-cloth', 0xd8e8c8, 0.85, 0), sand: m('mg-wall-sand', 'stucco', 0xd8c8a0, 0.9, 0),
      ceilwood: m('mg-ceil-wood', 'wood', 0xd8b890, 0.7, 0), ceilsao: m('mg-ceil-sao', 'wood', 0xd8c0a0, 0.7, 0),
      parquet: m('mg-floor-parquet', 'wood', 0xc8985a, 0.5, 0), vwood: m('mg-floor-vinyl-wood', 'laminate', 0xd0b890, 0.45, 0), tatamiOld: m('mg-floor-tatami-old', 'shoji', 0xc8b880, 0.9, 0), shikkui: m('mg-wall-shikkui', 'stucco', 0xf4f2ee, 0.85, 0), coffer: m('mg-ceil-coffer', 'wood', 0x8a6a40, 0.7, 0),
    },
    big: { lobbyF: m('mg-lobby-floor', 'marble', 0xe8e4dc, 0.25, 0.05), lobbyW: m('mg-lobby-wall', 'stainless', 0xd8d8d4, 0.4, 0.6), stationW: m('mg-station-wall', 'glazed-brick', 0xf0ece0, 0.4, 0.05), exchF: m('mg-exchange-floor', 'deco', 0xffffff, 0.2, 0.05), loungeW: m('mg-lounge-wall', 'padded', 0x1e4a44, 0.85, 0.05), forgeF: m('mg-forge-floor', 'plate', 0x8a8e92, 0.5, 0.6), coreF: m('mg-core-floor', 'hex', 0x4a4e52, 0.3, 0.6), dockF: m('mg-dock-floor', 'plate', 0x9a9c9e, 0.5, 0.5), checkerF: m('mg-checker-floor', 'tile', 0xe8e8e8, 0.35, 0.05), kitchenF: m('mg-kitchen-floor', 'tile', 0xb04a30, 0.6, 0.05), classF: m('mg-classroom-floor', 'wood', 0xc89868, 0.5, 0), libF: m('mg-library-carpet', 'carpet', 0x2a3a6a, 0.95, 0), terrazzoF: m('mg-floor-terrazzo', 'terrazzo', 0x6a9a7a, 0.35, 0.05), rubberF: m('mg-floor-rubber', 'rubber-chips', 0x3a6ab8, 0.8, 0), cobbleF: m('mg-floor-cobble', 'granite-pavers', 0x8a8a84, 0.8, 0), brickF: m('mg-floor-brick', 'glazed-brick', 0xa85a40, 0.75, 0), meshF: m('mg-floor-mesh', 'perforated', 0x8a8e92, 0.5, 0.7), marbleF: m('mg-floor-black-marble', 'marble', 0x2a2a2c, 0.2, 0.1),
      yakisugiW: m('mg-wall-yakisugi', 'walnut', 0x2a2420, 0.8, 0), tinW: m('mg-wall-tin', 'corten', 0x8a6a50, 0.7, 0.4), concW: m('mg-wall-concrete', 'board-concrete', 0xa8a8a4, 0.85, 0), brickW: m('mg-wall-red-brick', 'glazed-brick', 0xa85a40, 0.8, 0), gtileW: m('mg-wall-green-tile', 'porcelain', 0x3a8a4a, 0.3, 0), mosaicW: m('mg-wall-blue-mosaic', 'porcelain', 0x3a6ab8, 0.3, 0), corkW: m('mg-wall-cork', 'cork', 0xc89060, 0.9, 0), pegW: m('mg-wall-pegboard', 'perforated', 0xd8b890, 0.7, 0),
      ductC: m('mg-ceil-ducts', 'ceil', 0x8a8e92, 0.6, 0.5), tinC: m('mg-ceil-tin', 'brassdeco', 0xd8d0b8, 0.5, 0.4) },
    park: { grass: m('mg-park-grass', 'grass', 0x8ac060, 1, 0), path: has('materials/mg-park-path') ? 'mg-park-path' : 'concrete', play: has('materials/mg-play-floor') ? 'mg-play-floor' : 'rubber-chips' },
    clinic: m('mg-clinic-floor', 'medical-vinyl', 0xeef2f0, 0.35, 0.05), gym: m('mg-gym-floor', 'wood', 0xd8b880, 0.4, 0),
    shop: { floor: m('mg-floor-main', 'terrazzo', 0xe8e4dc, 0.35, 0.05), wall: m('mg-wall-shop', 'lab', 0xf6f2ea, 0.6, 0.05) },
  };
}

// ───────────────────────── 通路 (手描き): [id, 通りの名前, 街区, x0, z0, x1, z1, 天井高, その他] ─────────────────────────
const CORR = [
  // 本通り: 入港ロビーから東口まで。区間ごとに幅と中心線が少しずつずれる
  ['bv1', '本通り 一丁目', 'main', 90, 22, 126, 32, 6.2, { st: '本通り', mid: 1 }],
  ['bv2', '本通り 二丁目', 'main', 126, 20, 150, 31, 6.2, { mid: 1 }],
  ['bv3', '本通り 三丁目', 'main', 182, 24, 212, 34, 6.2, { mid: 1 }],
  // 錨町: いちばん古い路地。狭く、低く、折れ曲がる
  ['o1', '錨町 一番横丁', 'old', 99.7, 4, 102.3, 22, 2.9, { st: '一番横丁' }], ['o1b', '錨町 一番横丁', 'old', 99.5, -8, 101.9, 4, 2.7],
  ['o2', '錨町 西横丁', 'old', 68, -14.2, 95, -11.8, 2.8, { st: '西横丁' }],
  ['o2n1', '錨町 北小路', 'old', 76, -28, 78.4, -14.2, 2.7, { st: '北小路' }], ['o2n2', '錨町 北小路', 'old', 75.6, -44, 78, -28, 2.7],
  ['o2s', '錨町 裏小路', 'old', 68, -11.8, 70.4, 2, 2.7, { st: '裏小路' }], ['o2s2', '錨町 裏小路', 'old', 68.4, 2, 70.8, 16, 2.7],
  ['o3', '錨町 東横丁', 'old', 106, -14, 130, -11.6, 2.8, { st: '東横丁' }], ['o3b', '錨町 東横丁', 'old', 130, -14.6, 141, -12, 2.8],
  ['o4a', '灯籠小路', 'old', 138, 6, 140.4, 20, 2.9, { st: '灯籠小路', lamps: 'lantern' }], ['o4m', '灯籠小路の溜まり', 'old', 136.5, -2, 142, 6, 3.2, { lamps: 'lantern', nolot: 1 }], ['o4b', '灯籠小路', 'old', 138.3, -12, 140.5, -2, 2.8, { lamps: 'lantern' }],
  ['o5', '錨町 北裏通り', 'old', 75.2, -46.4, 118, -44, 2.8, { st: '北裏通り' }], ['o5b', '錨町 北裏通り', 'old', 115.6, -44, 118, -30, 2.7], ['o5c', '錨町 北裏通り', 'old', 116, -30, 118.2, -14, 2.7],
  ['o6', '錨町 中横丁', 'old', 78.4, -27.4, 96, -25.2, 2.6, { st: '中横丁' }], ['o6b', '錨町 中横丁', 'old', 93.8, -25.2, 96, -19, 2.6],
  ['o7', '見晴らし小路', 'old', 96, -60, 98.2, -46.4, 2.7, { st: '見晴らし小路' }],
  // 中央区 (役所・図書館・保育園) と展望町 (外壁の窓に面した住宅地)
  ['c1', '役所通り', 'civic', 179, -40, 182, 0, 3.6, { st: '役所通り', lot: 0 }],
  ['vw1a', '展望通り', 'view', 179, -44, 206, -40, 3.2, { st: '展望通り' }], ['vw1b', '展望通り', 'view', 206, -45.5, 236, -41.5, 3.2],
  ['vw2a', '展望東小路', 'view', 226, -41.5, 229.4, -20, 3.0, { st: '展望東小路' }], ['vw2b', '展望東小路', 'view', 226.5, -8, 229.5, 18, 3.0],
  ['vw3a', '展望西小路', 'view', 196, -40, 199, -24, 3.0, { st: '展望西小路' }], ['vw3b', '展望西小路', 'view', 197, -24, 200, -6, 3.0],
  ['vw4', '展望中通り', 'view', 182, -6, 226.5, -3, 3.2, { st: '展望中通り' }],
  // 市場と緑ヶ丘団地
  ['ms', '市場通り', 'market', 104, 32, 110, 58, 4.4, { st: '市場通り' }], ['ms2', '市場通り', 'market', 105, 58, 110, 72, 4.0],
  ['am', '入港南通路', 'port', 70, 44, 73, 72.8, 3.2, { st: '入港南通路' }],
  ['gm1', '緑ヶ丘通り', 'green', 62, 72.8, 102, 76.4, 3.4, { st: '緑ヶ丘通り', shop: 0.4 }], ['gm2', '緑ヶ丘通り', 'green', 102, 72, 130, 75.6, 3.4, { shop: 0.4 }], ['gm3', '緑ヶ丘通り', 'green', 130, 72.6, 150, 76, 3.4, { shop: 0.3 }],
  ['g1', '一号棟廊下', 'green', 74, 76.4, 76.8, 112, 2.8, { st: '一号棟廊下' }], ['g1b', '一号棟廊下', 'green', 74, 112, 96, 114.8, 2.8],
  ['g2', '二号棟廊下', 'green', 90, 76.4, 92.6, 100, 2.8, { st: '二号棟廊下' }],
  ['g3', '三号棟廊下', 'green', 114, 75.6, 117, 96, 2.9, { st: '三号棟廊下' }], ['g3b', '三号棟廊下', 'green', 115, 96, 118, 124, 2.9], ['g3c', '三号棟廊下', 'green', 96, 124, 118, 127, 2.9],
  ['g4', '四号棟廊下', 'green', 93.4, 114.8, 96, 127, 2.8, { st: '四号棟廊下' }],
  ['g0', '緑ヶ丘西通路', 'port', 62, 76.4, 64.6, 112, 2.9, { st: '緑ヶ丘西通路' }],
  // 学校通り・第 9 区・鋳物町・機関通路
  ['sv1a', '学校通り', 'civic', 172, 46, 175.5, 70, 3.6, { st: '学校通り', lot: 0 }], ['sv1b', '学校通り', 'civic', 171, 70, 174.6, 100, 3.6, { lot: 0 }], ['sv1c', '学校通り', 'ninth', 171.5, 100, 175, 112, 3.6],
  ['sc', '校舎廊下', 'civic', 150, 74, 171, 77, 3.2, { st: '校舎廊下', lot: 0 }],
  ['n9', '第 9 区 環状通路', 'ninth', 166, 112, 202, 116, 3.2, { st: '第 9 区 環状通路' }], ['w9', '第 9 区 環状通路', 'ninth', 166, 116, 170, 152, 3.2], ['e9', '第 9 区 環状通路', 'ninth', 198, 116, 202, 152, 3.2], ['s9', '第 9 区 環状通路', 'ninth', 166, 152, 202, 156, 3.2],
  ['p9', '中庭小路', 'ninth', 182, 116, 184.5, 124, 3.0, { st: '中庭小路' }],
  ['p9w', '公園東通路', 'ninth', 146, 118, 166, 121, 3.2, { st: '公園東通路' }],
  ['fd1', '鋳物町 中通り', 'dorm', 218, 40, 222, 76, 4.0, { st: '鋳物町 中通り' }], ['fd1b', '鋳物町 中通り', 'dorm', 219, 76, 223, 106, 4.0],
  ['fd2', '寮通路', 'dorm', 196, 58, 218, 60.6, 2.8, { st: '寮通路' }], ['fd2b', '寮通路', 'dorm', 175.5, 58.6, 196, 61.2, 2.8],
  ['svc', '機関通路', 'svc', 196, 106, 240, 109, 3.2, { st: '機関通路', lot: 0 }], ['svc2', '機関通路', 'svc', 236.5, 109, 239.5, 130, 3.2, { lot: 0 }],
  ['p9b', '第 9 区 連絡口', 'svc', 199, 109, 202, 112, 3.2, { lot: 0 }],
  // 港町: 倉庫と長屋
  ['pt1', '港町 倉庫通り', 'port', 40, 60, 45, 90, 5.0, { st: '港町 倉庫通り' }], ['pt1b', '港町 倉庫通り', 'port', 41, 90, 46, 124, 4.5],
  ['pt2', '長屋通路', 'port', 10, 96, 41, 98.6, 2.8, { st: '長屋通路' }],
  ['pt3', '港町 裏通り', 'port', 46, 112, 66, 114.6, 2.9, { st: '港町 裏通り' }],
  ['pt4', '長屋小路', 'port', 10, 98.6, 12.6, 130, 2.7, { st: '長屋小路' }], ['pt5', '長屋小路', 'port', 12.6, 120, 41, 122.6, 2.7],
  // 船員街: 第 7 ドックの北。船乗りと港湾作業員の古い下宿街 (西横丁の西の端から入る)
  ['k1', '船員街 表通り', 'crew', 30, -14.2, 68, -11.8, 2.8, { st: '船員街 表通り' }],
  ['k2', '船員街 坂下小路', 'crew', 50, -40, 52.6, -14.2, 2.7, { st: '坂下小路' }], ['k2b', '船員街 坂下小路', 'crew', 49.6, -58, 52.2, -40, 2.7],
  ['k3', '船員街 裏通り', 'crew', 14, -31.4, 50, -29, 2.7, { st: '船員街 裏通り' }], ['k3b', '船員街 裏通り', 'crew', 14, -29, 16.4, -4, 2.6],
  ['k4', '船員街 錨小路', 'crew', 16.4, -6.4, 36, -4, 2.6, { st: '錨小路' }], ['k5', '船員街 錨小路', 'crew', 33.6, -11.8, 36, -6.4, 2.6],
  ['k6', '船員街 北の小路', 'crew', 20, -51.4, 49.6, -49, 2.6, { st: '北の小路' }], ['k6b', '船員街 北の小路', 'crew', 20, -62, 22.4, -51.4, 2.6],
  ['k7', '船員街 東の袋小路', 'crew', 52.2, -45, 64, -42.6, 2.6, { st: '東の袋小路' }],
  // ひかり台: 緑ヶ丘の南に新しく延ばした団地 (三号棟廊下の南から入り、第 9 区の環状通路へ抜ける)
  ['h1', 'ひかり台 中央通路', 'hikari', 104, 127, 107, 172, 3.0, { st: 'ひかり台 中央通路' }],
  ['h2', 'ひかり台 西通路', 'hikari', 70, 140, 104, 142.6, 2.8, { st: 'ひかり台 西通路' }], ['h6', 'ひかり台 西通路', 'hikari', 70, 142.6, 72.6, 172, 2.8],
  ['h7', 'ひかり台 南通路', 'hikari', 72.6, 165, 104, 167.6, 2.8, { st: 'ひかり台 南通路' }],
  ['h3', 'ひかり台 東通路', 'hikari', 107, 149, 140, 151.6, 2.8, { st: 'ひかり台 東通路' }], ['h3b', 'ひかり台 東通路', 'hikari', 140, 140, 142.6, 176, 2.8],
  ['h8', 'ひかり台 南通路', 'hikari', 107, 170, 140, 172.6, 2.8],
  ['h5', 'ひかり台 連絡通路', 'hikari', 142.6, 146, 166, 148.6, 3.0, { st: 'ひかり台 連絡通路' }],
];
// 継ぎ目の扉を開け放しにしない所 (街区の境の気密扉など): 'a|b' → [様式, 幅, 高さ]
const JOINT = { 'gate|fd1': ['blast', 3.4, 3.6, { mat: 'mg-bulkhead' }], 'p9b|svc': ['blast', 2.6, 2.9, { mat: 'mg-bulkhead' }], 'n9|p9b': ['slide', 2.4, 2.6], 'o7|o7end': ['open', 1.6, 2.3] };

// ───────────────────────── 生成 ─────────────────────────
export function megatonPlan(has = () => false) {
  const rnd = rng(7007), Rn = (a, b) => a + rnd() * (b - a), pick = (a) => a[Math.floor(rnd() * a.length)], chance = (p) => rnd() < p;
  const shuffle = (a) => { for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(rnd() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };
  const PAL = palette(has), rooms = [], doors = [], byId = {}, stats = { homes: 0, homeRooms: 0, shops: 0, services: 0, corridors: new Set(), public: 0 };
  const add = (r) => { r.props = r.props || []; rooms.push(r); byId[r.id] = r; return r; };
  const rect = (x0, z0, x1, z1) => ({ x: q(x0), z: q(z0), w: q(x1 - x0), d: q(z1 - z0) });
  const link = (a, b, pos, w, h, style, o) => doors.push([a, b, q(pos), q(w), q(h), style, o || {}]);

  // ── 1. 固定の部屋 (港・広場・公共施設・大きな店) ──
  const F = facilities(PAL, rnd);
  for (const f of F.rooms) add(f);
  for (const d of F.doors) link(...d);
  // ── 2. 通路 ──
  for (const [id, name, dist, x0, z0, x1, z1, h, o = {}] of structuredClone(CORR)) { // 写しを使う: 部屋の設定はゲーム側で書き換わることがあり、次に作るときに結果が変わってしまう
    const pal = PAL[dist] || PAL.civic;
    add({ ...rect(x0, z0, x1, z1), id, name, h, dist, corr: 1, o, floor: pal.floor, wall: pal.wall, ceil: pal.ceil, trims: 'low', ribs: false, lamps: o.lamps || ({ old: 'bare', main: 'panel', market: 'tube', view: 'spot', green: 'panel', ninth: 'panel', dorm: 'tube', port: 'pendant', svc: 'tube', civic: 'panel', crew: 'bare', hikari: 'panel' })[dist], li: (dist === 'old' || dist === 'crew' ? 0.95 : 0.85) * (Math.min(x1 - x0, z1 - z0) < 3.2 && dist !== 'old' && dist !== 'crew' ? 0.8 : 1), ld: q(Math.max(8, h * 3.2)) }); // 白い壁の狭い廊下は少し控えめに
    stats.corridors.add(name.replace(/の溜まり$/, '').replace(/ [一二三]丁目$/, ''));
  }
  // ── 3. 通路どうしの継ぎ目 (触れ合う通路・広場を開口でつなぐ) ──
  const joinable = rooms.filter((r) => r.corr || r.join);
  for (let i = 0; i < joinable.length; i++) for (let j = i + 1; j < joinable.length; j++) {
    const A = joinable[i], B = joinable[j], e = edge(A, B); if (!e || e.hi - e.lo < 1.5) continue;
    const key = structuredClone(JOINT[A.id + '|' + B.id] || JOINT[B.id + '|' + A.id]), cap = Math.min(A.jcap ?? 8, B.jcap ?? 8), w = key ? key[1] : Math.min(e.hi - e.lo - 0.5, cap), h = key ? key[2] : Math.min(A.h, B.h, 4.4) - 0.25;
    link(A.id, B.id, (e.lo + e.hi) / 2, w, h, key ? key[0] : 'open', { plain: !key, ...(key?.[3] || {}) });
  }
  // ── 4. 通路沿いの区画 (住戸・店・共用室) ──
  const BX = (r) => r.x + r.w, BZ = (r) => r.z + r.d;
  const inBounds = (c) => c.x >= -2 && BX(c) <= 262 && BZ(c) <= 180 && c.z >= (BX(c) > 178 ? -56 : -66);
  const free = (c) => inBounds(c) && !rooms.some((r) => c.x < BX(r) - 0.01 && BX(c) > r.x + 0.01 && c.z < BZ(r) - 0.01 && BZ(c) > r.z + 0.01);
  const order = ['main', 'market', 'old', 'view', 'green', 'ninth', 'dorm', 'port', 'crew', 'hikari'];
  const segs = rooms.filter((r) => r.corr && r.o.lot !== 0 && !r.o.nolot).sort((a, b) => order.indexOf(a.dist) - order.indexOf(b.dist));
  let unitNo = 0; const blockNo = {};
  const lotRect = (s, side, t, f, d) => (side === 'n' ? { x: s.x + t, z: s.z - d, w: f, d } : side === 's' ? { x: s.x + t, z: BZ(s), w: f, d } : side === 'w' ? { x: s.x - d, z: s.z + t, w: d, d: f } : { x: BX(s), z: s.z + t, w: d, d: f });
  const lots = [];
  for (const s of segs) {
    const P = { ...DIST[s.dist], ...(s.o.shop != null ? { shop: s.o.shop } : {}) }, long = s.w >= s.d, L = long ? s.w : s.d, sides = shuffle(long ? ['n', 's'] : ['w', 'e']);
    blockNo[s.dist] = (blockNo[s.dist] || 0) + 1; const blk = blockNo[s.dist];
    // 行き止まりの奥にも 1 戸
    for (const end of long ? ['w', 'e'] : ['n', 's']) {
      const touching = rooms.some((r) => r !== s && edge(s, r) && (edge(s, r).sa === end) && edge(s, r).hi - edge(s, r).lo > 0.3); if (touching || s.dist === 'main') continue;
      const W = long ? s.d : s.w, ex = q5(Rn(0, 1.2)), f = q5(W + ex + Rn(0, 1.2)), d = q5(Rn(P.d[0], P.d[1])), off = -ex;
      for (let dd = d; dd >= P.d[0]; dd = q5(dd - 0.5)) { const c = end === 'w' ? { x: s.x - dd, z: s.z + off, w: dd, d: f } : end === 'e' ? { x: BX(s), z: s.z + off, w: dd, d: f } : end === 'n' ? { x: s.x + off, z: s.z - dd, w: f, d: dd } : { x: s.x + off, z: BZ(s), w: f, d: dd };
        if (free(c)) { lots.push(makeLot(c, s, end, (long ? s.z : s.x) + W / 2, blk)); break; } }
    }
    for (const side of sides) {
      let t = Rn(0, 0.5), prevDoorEnd = false;
      while (t < L - 2.4) {
        if (chance(P.gap)) { t += Rn(P.g[0], P.g[1]); continue; }
        if (P.nook && chance(P.nook) && t + 3 < L - 0.5) { // 通路の溜まり (浅い凹み。ベンチや自販機のある休憩の場所)
          const f2 = q5(Math.min(L - 0.5 - t, Rn(2.6, 4.6))), d2 = q5(Rn(1.6, 2.8)), cc = lotRect(s, side, q5(t), f2, d2);
          if (free(cc)) { const lot = makeLot(cc, s, side, (long ? s.x : s.z) + t + f2 / 2, blk); lot.pre = 'nook'; lots.push(lot); t += f2; continue; } }
        let f = Rn(P.f[0], P.f[1]); if (P.f[0] < 4 && chance(0.4)) f = Rn(P.f[0], (P.f[0] + P.f[1]) / 2); // 小さい区画を多めに
        if (t + f > L - 0.1) { f = L - 0.1 - t; if (f < Math.max(2.6, P.f[0] * 0.7)) break; }
        t = q5(t); f = q5(f); let c = null; for (let d = q5(Rn(P.d[0], P.d[1])); d >= P.d[0] - 1e-6; d = q5(d - 0.4)) { const cc = lotRect(s, side, t, f, d); if (free(cc)) { c = cc; break; } }
        if (!c) { t += 0.7; continue; }
        // 扉の位置: 隣と玄関を寄せ合う (2 戸ずつ並ぶ) ことが多い。店は中央寄り
        const lo = Math.max(t + 0.85, T + 0.85), hi = Math.min(t + f - 0.85, L - T - 0.85); if (hi < lo) { t += f; continue; }
        const near = prevDoorEnd ? lo : hi, along = chance(0.62) ? near : chance(0.5) ? Rn(lo, hi) : (lo + hi) / 2;
        const lot = makeLot(c, s, side, (long ? s.x : s.z) + along, blk); lots.push(lot);
        prevDoorEnd = along >= (lo + hi) / 2; t += f;
      }
    }
  }
  function makeLot(c, s, side, dpos, blk) {
    const r = add({ ...rect(c.x, c.z, c.x + c.w, c.z + c.d), id: 'l' + (++unitNo), dist: s.dist, seg: s.id, side, blk, lot: 1 });
    r.dpos = q(dpos); return r;
  }
  // ── 5. 区画の用途と間取り ──
  const SHOPS = shopTypes(), forced = { main: ['hotel', 'conv', 'cafe', 'bank', 'electric', 'books', 'arcade', 'bakery', 'drug', 'cloth', 'realty', 'travel', 'bar'], market: ['grocer', 'fish', 'butcher', 'sweets', 'tea', 'flower', 'tools', 'diner'], old: ['diner', 'ramen', 'sweets', 'repair', 'barber', 'bar'], green: ['conv', 'laundry', 'barber', 'drug', 'bakery', 'diner'], port: ['bar', 'tools', 'diner'], ninth: ['cafe', 'conv'], view: ['cafe'], dorm: ['diner', 'laundry'], crew: ['bar', 'diner', 'repair', 'laundry'], hikari: ['conv', 'bakery', 'barber'] };
  const used = new Set(), names = new Set();
  for (const r of lots) {
    const P = DIST[r.dist], s = byId[r.seg], sh = s.o.shop ?? P.shop, area = r.w * r.d;
    const lw = r.side === 'n' || r.side === 's' ? r.w : r.d; // 間口
    let kind = 'home';
    if (r.pre === 'nook') { r.kind = 'svc'; r.svc = 'nook'; r.h = s.h; continue; }
    if (r.dist === 'main' || r.dist === 'market') kind = area > 14 ? 'shop' : 'svc';
    else if (chance(sh) && lw >= 3.4) kind = 'shop';
    else if (chance(P.svc || 0)) kind = 'svc';
    else if (chance(0.05)) kind = 'vacant';
    r.kind = kind; r.h = q(Rn(P.h[0], P.h[1]));
    if (kind === 'shop') { const f = forced[r.dist]?.find((t) => !used.has(r.dist + t)); const type = f || pick(SHOPS.pool[like(r.dist)] || SHOPS.pool.old); used.add(r.dist + type); r.shop = type; r.h = Math.max(r.h, r.dist === 'main' ? r.h : 2.8);
      const ns = SHOPS.def[type].names, free2 = ns.filter((n) => !names.has(n)); let nm = free2.length ? pick(free2) : `${pick(ns)} ${DIST[r.dist].name}店`; if (names.has(nm)) nm += ' 2 号店'; names.add(nm); r.shopName = nm; }
    if (kind === 'svc') r.svc = (r.dist === 'main' || r.dist === 'market' ? ['trash', 'storage', 'pump'] : area >= 18 && lw >= 3 && (r.side === 'n' || r.side === 's' ? r.d : r.w) >= 7.4 && r.dist !== 'old' ? pick(['stairs', 'stairs', 'elev', 'laundry', 'meeting', 'bikes']) : pick(['trash', 'storage', 'bikes', 'pump', 'laundry']));
  }
  // 住戸の間取り: 通路側に玄関の部屋、奥に寝室・浴室
  const homes = [];
  for (const r of lots) {
    if (r.kind !== 'home' && r.kind !== 'vacant') continue;
    const fam = pick(SURN), front = r.side, deep = front === 'n' || front === 's' ? r.d : r.w, wide = front === 'n' || front === 's' ? r.w : r.d;
    let plan = 'one', d1 = deep;
    if (r.dist === 'old' || like(r.dist) === 'port') { if (deep >= 6.6 && wide >= 3.8 && chance(0.72)) { plan = 'two'; d1 = Rn(2.8, Math.min(3.6, deep - 3.0)); } }
    else if (r.dist === 'dorm') plan = 'one';
    else if (deep >= 7.2 && wide >= 5) { plan = 'family'; d1 = Rn(r.dist === 'view' ? 5 : 4.2, Math.min(r.dist === 'view' ? 6.4 : 5.4, deep - 2.8)); }
    else if (deep >= 6.4 && wide >= 3.8 && chance(0.6)) { plan = 'two'; d1 = Rn(3.4, deep - 2.8); }
    r.fam = fam; r.plan = plan; r.vacant = r.kind === 'vacant'; homes.push(r); stats.homes++;
    const nk = 'n' + r.dist + r.blk; blockNo[nk] = (blockNo[nk] || 0) + 1; const num = String(blockNo[nk]).padStart(2, '0');
    const label = `${DIST[r.dist].name} ${r.blk}-${num}`, owner = r.vacant ? `${label} (空き部屋)` : `${label} ${fam}さん宅`;
    r.name = owner;
    // 玄関の部屋を切り出す
    if (plan !== 'one') {
      const cut = q(d1), back = splitDeep(r, front, cut);
      r.sub = r.vacant ? 'empty' : plan === 'two' ? (r.dist === 'old' || like(r.dist) === 'port' ? 'lk' : 'ldk1') : 'ldk';
      // 奥の部屋: 浴室 + 寝室 1〜2
      const bw = front === 'n' || front === 's' ? back.w : back.d, parts = [];
      if (plan === 'family') {
        let rest = bw; const bath = chance(0.85) ? q(Rn(2.1, 2.6)) : 0; if (bath) rest -= bath;
        const beds = rest >= 6.2 ? 2 : 1, cut2 = beds === 2 ? q(rest * Rn(0.42, 0.58)) : rest; const seq = [];
        if (bath) seq.push(['bath', bath]); seq.push(['bed', beds === 2 ? cut2 : rest]); if (beds === 2) seq.push([chance(0.5) ? 'kids' : 'bed', q(rest - cut2)]);
        if (chance(0.5)) seq.reverse(); let o = 0; for (const [k, w] of seq) { parts.push([k, o, w]); o += w; }
      } else parts.push([r.vacant ? 'empty' : r.dist === 'old' || like(r.dist) === 'port' ? 'tatami' : 'bed', 0, bw]);
      for (const [k, o, w] of parts) {
        const c = front === 'n' ? { x: back.x + o, z: back.z, w, d: back.d } : front === 's' ? { x: back.x + o, z: back.z, w, d: back.d } : front === 'w' ? { x: back.x, z: back.z + o, w: back.w, d: w } : { x: back.x, z: back.z + o, w: back.w, d: w };
        const sub = add({ ...rect(c.x, c.z, c.x + c.w, c.z + c.d), id: r.id + k[0] + Math.round(o * 10), dist: r.dist, h: r.h, home: r.id, sub: r.vacant ? 'empty' : k, name: `${r.vacant ? label : fam + 'さん宅'} ${({ bath: '浴室', bed: '寝室', kids: '子ども部屋', tatami: '和室', empty: '奥の間' })[k] || '部屋'}` });
        // 寝室への扉: 玄関の部屋との境の、寝室の幅の中ほど (浴室は端寄り)
        const e = edge(r, sub); const lo = e.lo + 0.7, hi = e.hi - 0.7; if (hi < lo) continue;
        if (k === 'tatami' && chance(0.55)) { const pos = Rn(lo, hi); link(r.id, sub.id, pos, 1.0, 2.05, 'open', { plain: 1, frame: 0xa88050, vr: 6 }); r.noren = q(pos); } // 台所と和室の間はのれんだけ
        else link(r.id, sub.id, k === 'bath' ? (chance(0.5) ? lo : hi) : Rn(lo, hi), k === 'bath' ? 0.9 : 1.0, 2.05, 'inner', { r: 1.3, vr: 2.4, hand: chance(0.5) ? 1 : -1, mat: k === 'bath' ? 'mg-door-bath' : 'mg-door-inner' });
        stats.homeRooms++;
      }
    } else r.sub = r.vacant ? 'empty' : r.dist === 'dorm' ? 'dorm' : 'studio';
    stats.homeRooms++;
  }
  // 玄関・店・共用室の扉
  const DMAT = ['mg-door-home-a', 'mg-door-home-b', 'mg-door-home-c', 'mg-door-home-d', 'mg-door-home-e', 'mg-door-home-f', 'mg-door-home-g'], DCOL = [0xd8d4cc, 0x8a6a4a, 0x2c3a5a, 0x6a7a6a, 0xb8452e, 0xe8e2d4];
  for (const r of lots) {
    const s = byId[r.seg], e = edge(s, r); if (!e) continue;
    const at = (w) => { const lo = e.lo + w / 2 + 0.3, hi = e.hi - w / 2 - 0.3; return hi < lo ? (e.lo + e.hi) / 2 : Math.min(Math.max(r.dpos, lo), hi); }, dh = Math.min(2.2, s.h - 0.6);
    if (r.kind === 'shop') { const wide = Math.min(e.hi - e.lo - 1.0, r.dist === 'main' ? 4.2 : 3.2), open = SHOPS.open.has(r.shop) && wide >= 2.2, w = open ? wide : r.dist === 'main' ? 2.4 : 1.6, p2 = open ? (e.lo + e.hi) / 2 : at(w);
      r.doorW = w; r.doorH = r.dist === 'main' ? 3.0 : dh; link(s.id, r.id, p2, w, r.doorH, open ? 'open' : 'glass', open ? { vr: 18, frame: 0x6a5a4a } : { r: 2.2, vr: 5 }); r.dpos = q(p2); stats.shops++; }
    else if (r.svc === 'nook') { r.doorW = q(Math.min(e.hi - e.lo - 0.6, 4)); r.doorH = q(Math.min(s.h - 0.3, 2.6)); link(s.id, r.id, (e.lo + e.hi) / 2, r.doorW, r.doorH, 'open', { vr: 14, plain: 1, frame: 0xe0dcd4 }); stats.nooks = (stats.nooks || 0) + 1; }
    else if (r.kind === 'svc') { const big = r.svc === 'stairs' || r.svc === 'elev'; r.doorW = big ? 1.8 : 1.3; r.doorH = dh; link(s.id, r.id, at(r.doorW), r.doorW, dh, big ? 'open' : 'slide', big ? { vr: 10, frame: 0xd8d4cc } : { r: 2.0, vr: 3 }); stats.services++; }
    else { r.doorW = 1.15; r.doorH = Math.min(2.15, s.h - 0.45); r.hand = chance(0.5) ? 1 : -1; const p = at(1.15); r.dpos = q(p); link(s.id, r.id, p, 1.15, r.doorH, 'home', { r: 1.7, vr: 2.6, hand: r.hand, mat: pick(DMAT), c: pick(DCOL) }); }
  }
  // 外壁に面した部屋 (展望町の北側・錨町の最北) には本物の窓
  for (const r of rooms) if ((r.lot || r.home) && r.kind !== 'svc' && r.z <= -51.5 && !rooms.some((o) => { const e = o !== r && edge(r, o); return e && e.sa === 'n' && e.hi - e.lo > 0.1; })) r.win = [['n', 0.6, r.w - 0.6, 0.85, Math.min(r.h - 0.35, 2.3)]];

  // 店の飾り窓: 通りに面した壁の、扉の脇の広いほうにガラス (店の中が通りから見える)
  for (const r of lots) { if (r.kind !== 'shop' || SHOPS.open.has(r.shop) && r.doorW >= 2.2) continue; const s = byId[r.seg], e = edge(s, r); if (!e || s.h < 3) continue;
    const dl = r.dpos - r.doorW / 2 - 0.45, dr = r.dpos + r.doorW / 2 + 0.45, L0 = [e.lo + 0.45, dl], L1 = [dr, e.hi - 0.45], [a, b] = L0[1] - L0[0] >= L1[1] - L1[0] ? L0 : L1; if (b - a < 1.2) continue;
    const y1 = q(Math.min(2.6, r.h - 0.5, s.h - 0.6)), loc = (R) => (e.axis === 'x' ? R.x : R.z); r.win = [...(r.win || []), [e.sb, q(a - loc(r)), q(b - loc(r)), 0.55, y1]]; s.win = [...(s.win || []), [e.sa, q(a - loc(s)), q(b - loc(s)), 0.55, y1]];
    const dI = doors.findIndex((d) => d[0] === s.id && d[1] === r.id); if (dI >= 0) doors[dI][6] = { ...doors[dI][6], vr: 16 }; } // 窓から見えるので、店の中を早めに描く
  // ── 6. 開口の一覧 (家具と通路の小物を扉の前に置かないため) ──
  for (const r of rooms) r.opens = [];
  for (const [a, b, pos, w] of doors) { const A = byId[a], B = byId[b], e = edge(A, B); if (!e) continue;
    const loc = (R, side) => ({ side, a: q(pos - w / 2 - (side === 'n' || side === 's' ? R.x : R.z)), b: q(pos + w / 2 - (side === 'n' || side === 's' ? R.x : R.z)), to: R === A ? b : a });
    A.opens.push(loc(A, e.sa)); B.opens.push(loc(B, e.sb)); }
  for (const r of rooms) for (const w of r.win || []) r.opens.push({ side: w[0], a: w[1], b: w[2], win: 1 });

  // ── 7. 家具・店の備品・共用室 ──
  byIdOf = (id) => byId[id];
  for (const r of rooms) {
    if (r.sub || r.lot) furnishHome(r, PAL, rnd);
  }
  // ── 8. 通路の照明と生活の小物 ──
  const DH = new Map(); for (const d of doors) { DH.set(d[0] + '|' + d[1], d[4]); DH.set(d[1] + '|' + d[0], d[4]); } doorsH = (a, b) => DH.get(a + '|' + b);
  for (const r of rooms) if (r.corr) r.street = r.name.replace(/の溜まり$/, '').replace(/ [一二三]丁目$/, '');
  for (const r of rooms) if (r.corr) dressCorridor(r, rooms, byId, rnd);
  // 公園の木の皮・上から見た花壇・待合の青い長椅子・黄黒の縞を、メガトン全体の小道具に付ける
  const VIEWS = ['mg-view-earth', 'mg-view-stars', 'mg-view-ring', 'mg-view-port', 'mg-view-sun', 'mg-view-city', 'mg-view-greenhouse', 'mg-view-nebula', 'mg-view-moon'], FOOD = ['mg-dinner-set', 'mg-nabe', 'mg-oden', 'mg-fruit-bowl', 'mg-bento', 'mg-breakfast', 'mg-birthday-cake'];
  const dr = rng(91), dp = (a) => a[Math.floor(dr() * a.length)]; // 窓の外の景色・食卓の料理・路地の床 (配置とは別の乱数)
  for (const r of rooms) if (r.corr && Math.min(r.w, r.d) < 3) { const k = dr(); if (r.dist === 'old' && k < 0.35) r.floor = PAL.big.cobbleF; else if ((r.dist === 'market' || r.dist === 'view') && k < 0.25) r.floor = PAL.big.brickF; }
  for (const r of rooms) for (const p of r.props) { const o = p[4] || (p[4] = {});
    if (p[0] === 'vwindow' && !o.img && dr() < 0.6) o.img = dp(VIEWS); else if ((p[0] === 'dining' || p[0] === 'lowtable') && (r.lot || r.sub) && dr() < 0.75) o.food = p[0] === 'lowtable' ? dp(['mg-nabe', 'mg-oden', 'mg-dinner-set', 'mg-fruit-bowl']) : dp(FOOD); if (p.length < 4) p[3] = 0; if (p[0] === 'tree') o.bark = 1; else if (p[0] === 'planter' && o.flowers) o.bed = 1; else if (p[0] === 'seatrow' && !o.img) o.img = 'mg-bench-vinyl'; else if (p[0] === 'hazard') o.img = 'mg-hazard-stripe'; }
  // 小道具の形は、その部屋を近くで初めて見たときに作る (画面の絵を描く小道具を含む部屋は除く: 2 回作ると無駄な画面が残るため)
  for (const r of rooms) r.lazy = r.props.length > 0 && r.props.every((p) => LAZY_OK.has(p[0])) ? 1 : 0;
  stats.corridors = stats.corridors.size; stats.public = F.publicCount; stats.rooms = rooms.length; stats.doors = doors.length;

  return {
    name: 'メガトン', sub: '第 7 居住甲板', seed: 77, spawn: [45, 47], view: [0, -1], music: 'interior', visDepth: 6, stats,
    theme: { wall: PAL.civic.wall, floor: PAL.civic.floor, ceil: PAL.civic.ceil, trim: '#ffd9a8', lamp: '#fff3e0', frame: 0x8a8478, frameC: 0xd0ccc4, door: 0xd8d4cc, amb: [0xfff6ea, 0xb4ac9c, 1.12], gloss: 0.4, door3: 'slide', trims: 'low', ribs: false, lamps: 'panel', col: 0xe8e4dc, gilt: 0xc8a04a, shade: 0xf0ece4 },
    rooms: rooms.map(clean), doors,
  };

  // ───── 住戸・店・共用室の中身 ─────
  function splitDeep(r, front, cut) {
    // r を通路側 (玄関の部屋) と奥に分け、奥の矩形を返す。r 自身は玄関の部屋に縮める
    let back;
    if (front === 'n') { back = { x: r.x, z: r.z, w: r.w, d: q(r.d - cut) }; r.z = q(r.z + r.d - cut); r.d = cut; } // 通路は南 (区画の下端)
    else if (front === 's') { back = { x: r.x, z: q(r.z + cut), w: r.w, d: q(r.d - cut) }; r.d = cut; }
    else if (front === 'w') { back = { x: r.x, z: r.z, w: q(r.w - cut), d: r.d }; r.x = q(r.x + r.w - cut); r.w = cut; }
    else { back = { x: q(r.x + cut), z: r.z, w: q(r.w - cut), d: r.d }; r.w = cut; }
    return back;
  }
}

const LAZY_OK = new Set(['ceilpic', 'pictop', 'band', 'cutpic', 'kasa', 'steeltank', 'pergola', 'groundpic', 'picfurn', 'picwall', 'roundpic', 'floorpic', 'hedge', 'yatai', 'noren', 'facade', 'genkan', 'shaft', 'shutter', 'fridge', 'washer', 'tvset', 'wardrobe', 'shoebox', 'aircon', 'vwindow', 'homeshelf', 'bed2', 'futon', 'dining', 'chair', 'lowtable', 'homesofa', 'homekit', 'homedesk', 'fakedoor', 'toilet', 'washbasin', 'shower', 'bathtub', 'homefront', 'bicycle', 'laundry', 'trashbins', 'mailboxes', 'meterbox', 'firehose', 'exitsign', 'addrplate', 'noticeboard', 'posters', 'elevator', 'stairup',
  'shopcounter', 'goodsshelf', 'drinkcase', 'produce', 'noren', 'menuboard', 'awning', 'stool', 'barberchair', 'blackboard', 'schooldesks', 'hospbed', 'reception', 'bathmural', 'bathpool', 'washrow', 'libshelf', 'playset', 'shrine', 'boxes', 'valvepanel', 'breaker', 'louver', 'districtmap', 'floorarrow', 'pottree', 'pond',
  'plant', 'bunk', 'locker', 'bench', 'table', 'tablelong', 'npc', 'sign', 'planter', 'streetlamp', 'tree', 'crate', 'pipes', 'tank', 'cylinders', 'newsstand', 'garmentrack', 'glassshelf', 'workbench', 'toolcart', 'barcounter', 'capsule', 'seatrow', 'luggage']);
/** 2 つの部屋の接する辺 (エンジンの扉判定と同じ順で調べる) */
export function edge(A, B) {
  const e = 0.01;
  if (Math.abs(A.x + A.w - B.x) < e) return { sa: 'e', sb: 'w', axis: 'z', line: B.x, lo: Math.max(A.z, B.z), hi: Math.min(A.z + A.d, B.z + B.d) };
  if (Math.abs(B.x + B.w - A.x) < e) return { sa: 'w', sb: 'e', axis: 'z', line: A.x, lo: Math.max(A.z, B.z), hi: Math.min(A.z + A.d, B.z + B.d) };
  if (Math.abs(A.z + A.d - B.z) < e) return { sa: 's', sb: 'n', axis: 'x', line: B.z, lo: Math.max(A.x, B.x), hi: Math.min(A.x + A.w, B.x + B.w) };
  if (Math.abs(B.z + B.d - A.z) < e) return { sa: 'n', sb: 's', axis: 'x', line: A.z, lo: Math.max(A.x, B.x), hi: Math.min(A.x + A.w, B.x + B.w) };
  return null;
}
const clean = (r) => { const o = { ...r }; delete o.opens; delete o.o; delete o.dpos; return o; };

// ───────────────────────── 家具の置き方 ─────────────────────────
/** 部屋の中で、扉の前と扉どうしを結ぶ動線を避けて、壁際・中央・壁掛けに物を置く道具 */
function layout(r, rnd) {
  const W = r.w, D = r.d, occ = [], tallW = { n: [], s: [], w: [], e: [] }, P = r.props;
  const ins = (s, a, b) => (s === 'n' ? [a, T, b, T + 1.2] : s === 's' ? [a, D - T - 1.2, b, D - T] : s === 'w' ? [T, a, T + 1.2, b] : [W - T - 1.2, a, W - T, b]);
  const inner = (o) => { const c = (o.a + o.b) / 2; return o.side === 'n' ? [c, T + 0.7] : o.side === 's' ? [c, D - T - 0.7] : o.side === 'w' ? [T + 0.7, c] : [W - T - 0.7, c]; };
  const doorsIn = r.opens.filter((o) => !o.win);
  for (const o of doorsIn) occ.push(ins(o.side, o.a - 0.3, o.b + 0.3));
  for (let i = 0; i < doorsIn.length; i++) for (let j = i + 1; j < doorsIn.length; j++) { const [ax, az] = inner(doorsIn[i]), [bx, bz] = inner(doorsIn[j]); occ.push([Math.min(ax, bx) - 0.45, az - 0.45, Math.max(ax, bx) + 0.45, az + 0.45], [bx - 0.45, Math.min(az, bz) - 0.45, bx + 0.45, Math.max(az, bz) + 0.45]); }
  const hit = (x0, z0, x1, z1) => x0 < T - 1e-6 || z0 < T - 1e-6 || x1 > W - T + 1e-6 || z1 > D - T + 1e-6 || occ.some(([a, b, c, d]) => x0 < c - 1e-6 && x1 > a + 1e-6 && z0 < d - 1e-6 && z1 > b + 1e-6);
  const SIDES = ['n', 's', 'w', 'e'], mix = () => { const a = SIDES.slice(); for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(rnd() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; }; // 壁の順を混ぜる (sort に乱数の比較を渡すとブラウザの最適化で結果が変わるので使わない)
  const wall = (kind, fw, fd, o = {}, sides, tall) => {
    const ss = sides ? sides.slice() : mix();
    for (const s of ss) {
      const len = s === 'n' || s === 's' ? W : D, n = Math.max(1, Math.floor((len - 2 * T - fw) / 0.15)), st = Math.floor(rnd() * (n + 1)), corner = rnd() < 0.5;
      for (let k = 0; k <= n; k++) {
        const i = corner ? (k % 2 ? n - (k >> 1) : k >> 1) : (st + k) % (n + 1), p = T + 0.02 + i * 0.15; if (p + fw > len - T - 0.01) continue;
        const rc = s === 'n' ? [p, T, p + fw, T + fd] : s === 's' ? [p, D - T - fd, p + fw, D - T] : s === 'w' ? [T, p, T + fd, p + fw] : [W - T - fd, p, W - T, p + fw];
        if (hit(...rc)) continue;
        if (tall && r.opens.some((o) => o.win && o.side === s && p < o.b && p + fw > o.a)) continue;
        occ.push([rc[0] - 0.04, rc[1] - 0.04, rc[2] + 0.04, rc[3] + 0.04]); if (tall) tallW[s].push([p, p + fw]);
        const sh = o._sh || 0, nx = s === 'w' ? sh : s === 'e' ? -sh : 0, nz = s === 'n' ? sh : s === 's' ? -sh : 0; // _sh: 原点が占有範囲の中心より手前にある小道具 (カプセル・バーカウンター)
        P.push([kind, q((rc[0] + rc[2]) / 2 + nx), q((rc[1] + rc[3]) / 2 + nz), { n: 0, s: 2, w: 1, e: 3 }[s], o]); return s;
      }
    }
    return null;
  };
  const center = (kind, fw, fd, o = {}, rot = 0) => {
    const sw = rot % 2 ? [fd, fw] : [fw, fd];
    for (let k = 0; k < 14; k++) { const cx = W / 2 + (rnd() - 0.5) * Math.max(0, W - sw[0] - 1.6) * (k / 14 + 0.3), cz = D / 2 + (rnd() - 0.5) * Math.max(0, D - sw[1] - 1.6) * (k / 14 + 0.3), rc = [cx - sw[0] / 2, cz - sw[1] / 2, cx + sw[0] / 2, cz + sw[1] / 2];
      if (hit(rc[0] - 0.5, rc[1] - 0.5, rc[2] + 0.5, rc[3] + 0.5)) continue; occ.push(rc); P.push([kind, q(cx), q(cz), rot, o]); return [cx, cz]; }
    return null;
  };
  /** 壁掛け (床を占めない)。o.y で高さ。背の高い家具や窓・扉と重ならない場所 */
  const mount = (kind, w, o = {}, sides) => {
    for (const s of sides || mix()) { const len = s === 'n' || s === 's' ? W : D;
      for (let k = 0; k < 12; k++) { const p = T + 0.2 + rnd() * Math.max(0, len - 2 * T - 0.4 - w); if (r.opens.some((op) => op.side === s && p < op.b + 0.2 && p + w > op.a - 0.2) || tallW[s].some(([a, b]) => p < b && p + w > a)) continue;
        tallW[s].push([p, p + w]); const c = p + w / 2; P.push([kind, q(s === 'n' || s === 's' ? c : s === 'w' ? T : W - T), q(s === 'n' ? T : s === 's' ? D - T : c), { n: 0, s: 2, w: 1, e: 3 }[s], o]); return s; } }
    return null;
  };
  return { wall, center, mount, W, D, occ, free: (rc) => !hit(...rc) };
}

function furnishHome(r, PAL, rnd) {
  const L = layout(r, rnd), H = PAL.home, pick = (a) => a[Math.floor(rnd() * a.length)], ch = (p) => rnd() < p, Rn = (a, b) => a + rnd() * (b - a);
  const blank = pick(BLANK), wood = pick(WOOD), dist = like(r.dist);
  r.trims = 'none'; r.ribs = false; r.ceil = H.ceil; r.li = 0.7; r.ld = 7;
  const homeWall = dist === 'view' ? (ch(0.5) ? H.panel : H.paper) : dist === 'old' || dist === 'port' ? (ch(0.4) ? PAL.old.wall : H.paper) : dist === 'dorm' ? PAL.dorm.wall : H.paper;
  r.lamps = ({ old: pick(['bare', 'pendant']), port: pick(['bare', 'pendant']), dorm: 'panel', view: pick(['spot', 'pendant']), ninth: pick(['panel', 'spot']), green: pick(['panel', 'pendant']) })[dist] || 'panel';
  const S = r.sub;
  if (r.kind === 'shop') return furnishShop(r, PAL, rnd, L);
  if (r.kind === 'svc') return furnishSvc(r, PAL, rnd, L);
  const npc = (p) => { if (!ch(p) || r.vacant) return; const c = L.center('npc', 0.8, 0.8, { label: `${(r.fam || r.name.split(' ')[0].replace('さん宅', ''))}さん`, use: pick(['talk:mgres', 'talk:mgres', 'talk:mgres', 'talk:mgres2', 'talk:mgres3']), suit: pick(SUIT), cloth: pick(CLOTH) }, Math.floor(rnd() * 4)); return c; };
  // 床・壁・天井は戸ごと・部屋ごとに選ぶ (隣の家と同じ内装の繰り返しにしない)
  if (S === 'studio' || S === 'empty' || S === 'dorm') r.floor = dist === 'old' ? pick([H.tatami, H.tatamiOld, H.vinyl, H.oak, H.dark]) : dist === 'dorm' ? pick([H.vinyl, H.vwood, PAL.dorm.floor]) : pick([H.oak, H.vinyl, H.carpet, H.dark, H.herring, H.parquet, H.vwood]);
  if (S === 'lk' || S === 'ldk' || S === 'ldk1') r.floor = pick([H.oak, H.oak, H.vinyl, H.dark, H.herring, H.tilew, H.parquet, H.vwood]);
  if (S === 'tatami') { r.floor = dist === 'old' && ch(0.5) ? H.tatamiOld : H.tatami; r.wall = ch(0.7) ? (ch(0.6) ? H.sand : H.shikkui) : H.paper; r.ceil = ch(0.7) ? (ch(0.85) ? H.ceilsao : H.coffer) : H.ceil; } if (S === 'bed' || S === 'kids') r.floor = pick([H.oak, H.carpet, H.dark, H.herring, H.parquet]); if (S === 'bath') { r.floor = H.bathf; r.wall = H.batht; r.lamps = 'spot'; }
  if (!r.ceil || r.ceil === H.ceil) r.ceil = (S === 'ldk' || S === 'bed') && ch(0.18) ? H.ceilwood : H.ceil;
  r.wall = r.wall || (S === 'kids' ? H.pattern : dist === 'dorm' ? homeWall : ch(0.45) ? pick([H.flower, H.stripe, H.greenw, H.paper, H.shikkui]) : homeWall);
  const ent = r.lot && r.opens.find((o) => !o.win && o.to === r.seg); // 玄関 (通路への扉) の内側に土間
  if (ent) { const c = (ent.a + ent.b) / 2, at = ent.side === 'n' ? [c, T, 0] : ent.side === 's' ? [c, r.d - T, 2] : ent.side === 'w' ? [T, c, 1] : [r.w - T, c, 3]; r.props.push(['genkan', q(at[0]), q(at[1]), at[2], { w: 1.4, d: Math.min(1.0, (ent.side === 'n' || ent.side === 's' ? r.d : r.w) * 0.3), n: r.vacant ? 0 : 1 + Math.floor(rnd() * 3), seed: Math.floor(rnd() * 9), shoes: !r.vacant }]); }
  if (S === 'empty') { if (ch(0.7)) L.center('boxes', 1.6, 0.8, { n: 3 + Math.floor(rnd() * 3), seed: Math.floor(rnd() * 9) }, Math.floor(rnd() * 2)); if (ch(0.5)) L.wall('boxes', 1.6, 0.8, { n: 2 + Math.floor(rnd() * 3), seed: 3 }); return; }
  const fam = r.home ? { kitchen: null } : r; // 住戸ごとの好み (台所と冷蔵庫の色など) は玄関の部屋に持たせる
  const kimg = ch(0.35) ? 'mg-kitchen-wood' : undefined, fimg = ch(0.3) ? 'mg-fridge-black' : undefined;
  const kitchen = (w) => { const s = L.wall('homekit', w, 0.62, { w, upper: r.h > 2.45, img: kimg }, null, true); if (s) { L.wall('fridge', 0.68, 0.66, { img: fimg }, [s], true) || L.wall('fridge', 0.68, 0.66, { img: fimg }, null, true); } return s; };
  const spread = () => pick(['mg-bedspread', 'mg-bedspread', 'mg-bedspread-stripe', 'mg-bedspread-grey']);
  const sleep = (dbl) => (dist === 'old' && ch(0.55) && S !== 'bed' ? L.wall('futon', 1.0, 2.0, { c: blank }) : L.wall('bed2', dbl ? 1.5 : 1.0, 2.15, { c: blank, w: dbl ? 1.5 : 1.0, wc: wood, spread: spread() }));
  const tv = () => L.wall('tvset', 1.4, 0.45, { w: 1.4, c: wood, img: ch(0.65) ? 'mg-tv-on' : undefined });
  const shelf = (w, o = {}) => L.wall('homeshelf', w, 0.34, { w, c: wood, img: ch(0.7) ? 'mg-bookshelf-full' : undefined, ...o }, null, true);
  const curtain = pick(['mg-curtain', 'mg-curtain-blue', 'mg-curtain-check']);
  const deco = () => { if (ch(0.55)) L.mount('aircon', 0.9, { y: Math.min(2.1, r.h - 0.35) }); if (ch(0.55) && r.h >= 2.5) L.mount('vwindow', 1.7, S === 'tatami' ? { w: Math.min(1.6, r.w - 1.4), h: 1.1, y: 1.45, img: 'mg-shoji', cur: false } : { w: Math.min(1.6, r.w - 1.4), h: 1.0, y: 1.5, curtain, cc: pick([0xe8dcc8, 0xc8d8e8, 0xd8e8c8, 0xf0d0c8]) });
    if (ch(0.3)) L.mount('posters', 1.0, { w: 0.9, h: 0.6, y: 1.6, seed: Math.floor(rnd() * 9) }); if (ch(0.3)) L.mount('picwall', 1.0, { img: 'mg-photo-wall', w: 0.95, h: 0.85, y: 1.6 }); if (ch(0.35)) L.mount('roundpic', 0.4, { img: 'mg-clock', r: 0.17, y: Math.min(2.05, r.h - 0.4) }); if (ch(0.3)) L.mount('picwall', 0.4, { img: 'mg-calendar', w: 0.34, h: 0.46, y: 1.55 }); };
  void fam;
  if (S === 'studio') {
    sleep(false); kitchen(Rn(1.5, 2.1)); if (ch(0.7)) L.wall('homedesk', 1.1, 1.1, { w: 1.1, c: wood, chair: true, sc: pick(['#cfe6ff', '#ffe0b0', '#d8ffd8']) }) || L.center('lowtable', 1.0, 0.7, { cc: pick(BLANK), n: 2 });
    if (ch(0.7)) L.wall('wardrobe', 1.0, 0.58, { w: 1.0, c: wood }, null, true); if (ch(0.6)) L.wall('shoebox', 0.8, 0.36, { w: 0.8, c: wood, vc: pick(BLANK) }); if (ch(0.5)) tv(); if (ch(0.5)) shelf(0.9); if (ch(0.35)) L.wall('plant', 0.6, 0.6, { s: 0.65 });
    if (ch(0.35)) L.wall('washer', 0.6, 0.6, {}); deco(); npc(0.1);
  } else if (S === 'dorm') {
    const n = r.w * r.d > 21 ? 2 : 1; for (let i = 0; i < n; i++) L.wall('bunk', 1.0, 2.05, { c: pick(BLANK), use: false });
    L.wall('locker', 1.24, 0.5, { n: 2 }, null, true); if (ch(0.7)) L.wall('homedesk', 1.0, 1.1, { w: 1.0, c: wood }); if (ch(0.5)) L.wall('laundry', 1.2, 0.4, { w: 1.2, seed: Math.floor(rnd() * 9) }); if (ch(0.4)) L.wall('fridge', 0.6, 0.6, { w: 0.6, h: 0.9 }); deco(); npc(0.18);
  } else if (S === 'lk' || S === 'ldk1') {
    kitchen(Rn(1.8, 2.6)); if (S === 'ldk1' && ch(0.6)) L.center('dining', 1.2, 0.8, { w: 1.2, n: 2, c: wood }) || L.center('lowtable', 1.0, 0.7, { n: 3 }); else L.center('lowtable', 1.0, 0.7, { n: 3, kotatsu: ch(0.4), kc: pick(BLANK) });
    if (ch(0.7)) L.wall('shoebox', 0.9, 0.36, { c: wood }); if (ch(0.6)) L.wall('washer', 0.6, 0.6, {}); if (ch(0.5)) tv(); if (ch(0.4)) shelf(1.0); if (r.noren) { const o = r.opens.find((op) => !op.win && Math.abs((op.a + op.b) / 2 - (r.noren - (op.side === 'n' || op.side === 's' ? r.x : r.z))) < 0.05); if (o) { const c = (o.a + o.b) / 2, at = o.side === 'n' ? [c, T, 0] : o.side === 's' ? [c, r.d - T, 2] : o.side === 'w' ? [T, c, 1] : [r.w - T, c, 3]; r.props.push(['noren', q(at[0]), q(at[1]), at[2], { img: 'mg-noren-room', w: 1.0, y: 2.02, len: 1.0 }]); } } deco(); npc(0.12); // 和室の入口ののれん
  } else if (S === 'ldk') {
    kitchen(Rn(2.2, 3.0)); L.center('dining', 1.4, 0.8, { w: 1.4, n: ch(0.6) ? 4 : 3, c: wood, cc: pick(WOOD) }); if (ch(0.85)) L.wall('homesofa', 2.0, 0.85, { c: pick(BLANK), w: 2.0, fab: pick(['mg-sofa', 'mg-sofa-green', 'mg-sofa-leather']) }); tv();
    if (ch(0.8)) L.wall('shoebox', 0.9, 0.36, { c: wood }); if (ch(0.6)) shelf(1.0); if (ch(0.5)) L.wall('plant', 0.6, 0.6, { s: 0.75 }); if (ch(0.4)) L.wall('pottree', 0.7, 0.7, { s: 0.75 });
    const rr = rnd(); if (rr < 0.35) r.rug = [[q(L.W / 2 - 1.2), q(L.D / 2 - 0.8), 2.4, 1.6, 'carpet', pick(BLANK)]]; else if (rr < 0.65) r.props.push(['roundpic', q(L.W / 2 + Rn(-0.5, 0.5)), q(L.D / 2 + Rn(-0.5, 0.5)), 0, { img: 'mg-rug-round', r: 0.85, floor: 1, y: 0.009 }]); deco(); npc(0.14);
  } else if (S === 'bed' || S === 'tatami') {
    sleep(S === 'bed' && r.w * r.d > 9 && ch(0.6)); if (S === 'tatami') { if (ch(0.4)) L.mount('picwall', 0.7, { img: 'mg-tsukimi', w: 0.5, h: 0.62, y: 1.55, frame: 1 }); L.mount('picwall', 1.9, { img: 'mg-fusuma', w: 1.8, h: 1.8, y: 0.92 }); if (ch(0.6)) L.wall('picfurn', 1.0, 0.45, { img: 'mg-tansu', w: 1.0, h: 1.1, d: 0.45, c: 0x6a3a28 }, null, false); } // 和室: 押し入れのふすまと和だんす
    else if (ch(0.8)) L.wall('wardrobe', 1.2, 0.58, { c: wood }, null, true);
    if (S === 'bed' && ch(0.3)) L.wall('picfurn', 1.0, 0.45, { img: 'mg-dresser', w: 1.0, h: 1.45, d: 0.45, c: 0x6a4a30 }, null, true); if (ch(0.4)) L.wall('homedesk', 1.1, 1.1, { w: 1.1, c: wood }); if (S === 'tatami' && ch(0.5)) L.center('lowtable', 0.9, 0.6, { w: 0.9, d: 0.6, n: 2 }); if (ch(0.3)) L.wall('laundry', 1.2, 0.4, { w: 1.2, seed: Math.floor(rnd() * 9) }); deco();
  } else if (S === 'kids') {
    L.wall(ch(0.5) ? 'bunk' : 'bed2', 1.0, 2.15, { c: pick(BLANK), w: 1.0, use: false, spread: spread() }); L.wall('homedesk', 1.0, 1.1, { w: 1.0, c: pick(WOOD), lc: pick([0xd8402a, 0x2a6ab8, 0xe8c020]) }); L.wall('homeshelf', 1.0, 0.34, { c: pick(WOOD), img: 'mg-toy-shelf', h: 1.2 }, null, false); if (ch(0.6)) L.center('boxes', 0.8, 0.6, { n: 2, seed: 5 });
    r.props.push(ch(0.4) ? ['groundpic', q(L.W / 2), q(L.D / 2), 0, { img: 'mg-foam-mat', w: 1.8, d: 1.8, y: 0.009, tile: 0.9 }] : ['floorpic', q(L.W / 2), q(L.D / 2), 0, { img: 'mg-rug-kids', w: 1.6, d: 1.6, y: 0.009 }]); L.mount('picwall', 0.6, { img: 'mg-kids-drawing', w: 0.55, h: 0.42, y: 1.4 }); if (ch(0.7)) L.wall('cutpic', 0.5, 0.25, { img: 'mg-backpack', w: 0.4, h: 0.46, z: -0.05 }); deco(); if (ch(0.2)) L.center('npc', 0.8, 0.8, { label: '子ども', use: 'talk:mgkid', suit: pick(SUIT) });
  } else if (S === 'bath') {
    L.wall('toilet', 0.45, 0.66, {}) ; L.wall('washbasin', 0.62, 0.46, {}, null, true); if (r.w * r.d > 5.6 && ch(0.6)) L.wall('bathtub', 1.5, 0.75, { l: 1.5 }) || L.wall('shower', 0.9, 0.9, {}); else L.wall('shower', 0.9, 0.9, {}); if (ch(0.4)) L.wall('washer', 0.6, 0.6, {});
  }
}

function furnishShop(r, PAL, rnd, L) {
  const pick = (a) => a[Math.floor(rnd() * a.length)], ch = (p) => rnd() < p, t = r.shop, SH = shopTypes().def[t] || shopTypes().def.conv;
  r.floor = r.dist === 'main' ? PAL.main.floor : PAL.shop.floor; r.wall = PAL.shop.wall; r.trims = 'none'; r.ribs = false; r.lamps = SH.lamps || 'panel'; const ar = r.w * r.d; r.li = ar < 25 ? 0.4 : ar < 40 ? 0.55 : ar < 60 ? 0.75 : 0.9; r.ld = ar < 40 ? 7 : 9; r.name = r.shopName || SH.names[0]; // 小さな店ほど灯りを弱く (白い壁が近いと白飛びする)
  if (SH.floor) r.floor = SH.floor(PAL);
  if (t === 'cafe' && ch(0.6)) r.floor = PAL.big.checkerF; else if ((t === 'ramen' || t === 'diner' || t === 'butcher' || t === 'fish') && ch(0.55)) r.floor = PAL.big.kitchenF; // 喫茶の市松の床、厨房のある店の赤いタイル
  { const B = PAL.big, wv = { bar: [B.yakisugiW, B.brickW, null], cafe: [B.brickW, B.concW, null, null], ramen: [B.gtileW, null], diner: [B.gtileW, null, null], tools: [B.pegW, null], repair: [B.pegW, B.concW, null], laundry: [B.mosaicW, null], bakery: [B.brickW, null, null], tea: [PAL.home.shikkui, null] }[t]; if (wv) { const w = pick(wv); if (w) r.wall = w; } // 店の種類に合う壁 (焼き杉・れんが・緑のタイル・有孔ボードなど)
    if ((t === 'bar' || t === 'diner' || t === 'ramen') && ch(0.4)) r.ceil = B.tinC; if (t === 'bank') r.floor = B.marbleF; else if (t === 'cafe' && r.floor !== B.checkerF && ch(0.5)) r.floor = PAL.home.parquet; }
  for (const [k, fw, fd, o, mode, n = 1] of SH.items) for (let i = 0; i < n; i++) { if (mode === 'c') L.center(k, fw, fd, { ...o }, o.rot || 0); else if (mode === 'm') L.mount(k, fw, { ...o }); else L.wall(k, fw, fd, { ...o, seed: Math.floor(rnd() * 9) }, null, mode === 't'); }
  if (SH.npc) L.center('npc', 0.8, 0.8, { label: SH.npc[0], use: SH.npc[1], suit: pick(SUIT), visor: '#ffd27a', cloth: SH.npc[2] }, Math.floor(rnd() * 4));
  if (ch(0.3)) L.center('npc', 0.8, 0.8, { label: '客', use: 'talk:mgres', suit: pick(SUIT), cloth: pick(CLOTH) }, Math.floor(rnd() * 4));
}

let byIdOf = () => null;
function furnishSvc(r, PAL, rnd, L) {
  const pick = (a) => a[Math.floor(rnd() * a.length)], ch = (p) => rnd() < p, s = r.svc, base = PAL[r.dist] || PAL.civic;
  r.floor = base.floor; r.wall = base.wall; r.trims = 'none'; r.ribs = false; r.li = 0.8; r.ld = 8; r.lamps = 'panel';
  if (s === 'pump') r.floor = PAL.big.meshF; else if ((s === 'trash' || s === 'storage' || s === 'bike') && ['port', 'dorm', 'old', 'crew'].includes(r.dist)) r.wall = PAL.big.tinW; else if (s === 'stairs' || s === 'storage') r.wall = PAL.big.concW; // ポンプ室は金網の床、港や寮の物置はトタン、階段室は打ち放し
  if (s === 'nook') { // 通路と同じ床・壁・天井のまま、少し広がった場所
    const c = byIdOf(r.seg); r.floor = c.floor; r.wall = c.wall; r.ceil = c.ceil; r.lamps = c.lamps; r.trims = c.trims; r.name = c.name;
    L.wall(pick(['bench', 'bench', 'vending']), 2.0, 0.65, { c: pick(SUIT) }, null, false) || L.wall('plant', 0.6, 0.6, { s: 0.7 }); if (ch(0.6)) L.wall(pick(['plant', 'pottree', 'trashbins']), 1.2, 0.6, { s: 0.7, n: 2 }); if (ch(0.6)) L.mount(pick(['noticeboard', 'posters', 'vwindow']), 1.4, { w: 1.2, h: 0.8, y: 1.5, cur: false, seed: Math.floor(rnd() * 9) }); if (ch(0.3)) L.center('npc', 0.8, 0.8, { label: '休んでいる住人', use: 'talk:mgres3', suit: pick(SUIT) }, Math.floor(rnd() * 4)); return; }
  const nm = { stairs: '階段室', elev: 'エレベーターホール', laundry: '共同洗濯室', meeting: '集会所', bikes: '自転車置き場', trash: 'ゴミ置き場', storage: '倉庫', pump: 'ポンプ室' };
  r.name = `${DIST[r.dist].name} ${nm[s]}`; const base2 = PAL[r.dist] || base; r.floor = base2.floor; r.wall = base2.wall;
  if (s === 'stairs') { r.stairM = 'mg-stair';
    // 歩いて上れる階段と踊り場 (上の階の扉は閉鎖中)
    r.h = 5.6; const front = r.side, deep = front === 'n' || front === 's' ? r.d : r.w, wide = front === 'n' || front === 's' ? r.w : r.d, H = 2.6, run = Math.ceil(H / 0.18) * 0.3, lw = Math.min(1.6, wide - 0.8);
    if (deep - 2 * T - 1.4 - run < 1.3 || wide < 2.6) { r.svc = 'bikes'; r.h = 2.7; return furnishSvc(r, PAL, rnd, L); }
    const land = 1.4, side = (r.dpos ?? 0) < (front === 'n' || front === 's' ? r.x + r.w / 2 : r.z + r.d / 2) ? 1 : 0; // 階段は玄関と反対の側に寄せる
    const a0 = (len) => q(side ? len - T - lw - 0.1 : T + 0.1); // 横方向の位置
    if (front === 's') { const x = a0(r.w); r.plat = [[x, q(r.d - T - land), q(lw), land, H, 'n', 1]]; r.props.push(['fakedoor', q(x + lw / 2), q(r.d - T), 2, { y0: H }]); } // 玄関は北の壁、踊り場は南の奥
    else if (front === 'n') { const x = a0(r.w); r.plat = [[x, T, q(lw), land, H, 's', 1]]; r.props.push(['fakedoor', q(x + lw / 2), T, 0, { y0: H }]); }
    else if (front === 'w') { const z = a0(r.d); r.plat = [[T, z, land, q(lw), H, 'e', 1]]; r.props.push(['fakedoor', T, q(z + lw / 2), 1, { y0: H }]); }
    else { const z = a0(r.d); r.plat = [[q(r.w - T - land), z, land, q(lw), H, 'w', 1]]; r.props.push(['fakedoor', q(r.w - T), q(z + lw / 2), 3, { y0: H }]); }
    L.mount('noticeboard', 1.2, { y: 1.5 }); L.mount('exitsign', 0.5, { y: 2.3 }); if (ch(0.5)) L.mount('firehose', 0.8, { y: 1.0 }); return;
  }
  if (s === 'elev') { L.wall('elevator', 1.5, 0.12, {}, null, true); if (r.w * r.d > 14) L.wall('elevator', 1.5, 0.12, {}, null, true); L.wall('mailboxes', 1.6, 0.3, { w: 1.6 }, null, true); L.mount('noticeboard', 1.3, {}); if (ch(0.6)) L.wall('pottree', 0.7, 0.7, { s: 0.8 }); L.mount('exitsign', 0.5, { y: 2.3 }); return; }
  if (s === 'laundry') { r.name = `${DIST[r.dist].name} コインランドリー`; L.wall('picfurn', 1.9, 0.7, { img: 'mg-dryers', w: 1.9, h: 1.9, d: 0.7, metal: 1 }, null, true); for (let i = 0; i < 4; i++) L.wall('washer', 0.62, 0.62, {}); L.wall('bench', 2.0, 0.6, { c: pick(SUIT) }); L.mount('noticeboard', 1.0, { w: 0.9, h: 0.7 }); if (ch(0.5)) L.wall('vending', 1.0, 0.7, {}); return; }
  if (s === 'meeting') { L.center('tablelong', 3.0, 0.85, { w: 3.0, wood: 1 }); for (let i = 0; i < 4; i++) L.wall('chair', 0.5, 0.5, { c: pick(WOOD) }); L.mount('noticeboard', 1.4, {}); L.mount('posters', 1.2, { seed: 4 }); L.wall('homeshelf', 1.0, 0.34, {}, null, true); if (ch(0.5)) L.center('npc', 0.8, 0.8, { label: '自治会長', use: 'talk:mgchair', suit: pick(SUIT) }); return; }
  if (s === 'bikes') { for (let i = 0; i < 4; i++) L.wall('bicycle', 1.5, 0.55, { seed: Math.floor(rnd() * 9) }); L.mount('addrplate', 0.6, {}); return; }
  if (s === 'trash') { L.wall('trashbins', 1.9, 0.6, { n: 3 }); if (ch(0.6)) L.wall('trashbins', 1.3, 0.6, { n: 2 }); L.wall('boxes', 1.6, 0.8, { n: 3, seed: 2 }); return; }
  if (s === 'storage') { L.wall('boxes', 1.6, 0.8, { n: 5, seed: 1 }); L.wall('homeshelf', 1.0, 0.34, {}, null, true); L.wall('boxes', 1.6, 0.8, { n: 3, seed: 6 }); return; }
  if (s === 'pump') { r.deco = ['mgpipes']; L.wall('steeltank', 1.6, 1.6, { r: 0.75, h: 2.0 }) || L.wall('tank', 1.3, 1.3, { c: '#8adfff' }); L.wall('picfurn', 1.6, 0.9, { img: 'mg-pump', w: 1.6, h: 1.4, d: 0.9, metal: 1 }); L.mount('valvepanel', 1.4, {}); L.mount('breaker', 0.8, {}); L.mount('picwall', 0.7, { img: 'mg-emergency-light', w: 0.55, h: 0.34, y: 2.3, glow: 1.2 }); L.wall('pipes', 1.0, 0.6, { c: 0x6a9a7a }); return; }
}

/** 店の種類: 名前・照明・備品 [小道具, 幅, 奥行き, 設定, 置き方 (w=壁際 t=背の高い壁際 c=中央 m=壁掛け), 個数] */
function shopTypes() {
  const def = {
    hotel: { names: ['カプセルホテル 星雲', 'カプセルホテル 軌道'], lamps: 'pendant', items: [['capsule', 5.4, 2.4, { n: 4, _sh: 1.1 }, 't'], ['capsule', 4.1, 2.4, { n: 3, _sh: 1.1 }, 't'], ['shopcounter', 2.0, 0.6, { use: 'rest', label: 'カプセルに泊まる (休む)' }, 'w'], ['locker', 1.9, 0.5, { n: 3 }, 't']], npc: ['フロント係', 'talk:megahotel'] },
    conv: { names: ['メガマート', 'デイリー 7', 'ステラ商店', 'ほしぞらマート'], items: [['goodsshelf', 2.0, 0.8, { w: 2.0, dbl: 1 }, 'c', 2], ['drinkcase', 1.2, 0.7, { w: 1.2 }, 't', 2], ['shopcounter', 2.0, 0.6, { w: 2.0 }, 'w'], ['goodsshelf', 1.8, 0.45, { w: 1.8 }, 't'], ['picfurn', 1.2, 0.45, { img: 'mg-magazine-rack', w: 1.2, h: 1.4, d: 0.45, c: 0x6a4a30 }, 'w'], ['vending', 1.0, 0.7, {}, 'w']], npc: ['店員', 'talk:mgshop'] },
    cafe: { names: ['喫茶 リング', 'カフェ ミルキーウェイ', '珈琲 半径', '茶房 雲海'], lamps: 'pendant', items: [['shopcounter', 2.4, 0.6, { w: 2.4 }, 'w'], ['table', 1.6, 1.6, { wood: 1, n: 2, dish: 'mg-coffee-set' }, 'c', 2], ['menuboard', 1.6, 0, { w: 1.6 }, 'm'], ['picfurn', 1.4, 0.6, { img: 'mg-cake-case', w: 1.4, h: 1.3, d: 0.6, metal: 1 }, 'w'], ['pottree', 0.7, 0.7, { s: 0.8 }, 'w']], npc: ['マスター', 'cafe', 'mg-cloth-apron'] },
    bank: { names: ['メガトン信用金庫', '星系銀行 メガトン支店'], items: [['reception', 3.0, 0.7, { w: 3.0 }, 'w'], ['seatrow', 2.4, 0.6, { n: 4 }, 'w'], ['vending', 1.0, 0.7, { title: 'ATM', c: '#8adfff', label: 'ATM (残高照会)' }, 'w'], ['pottree', 0.7, 0.7, {}, 'w']], npc: ['行員', 'talk:mgbank'] },
    electric: { names: ['電器 メガボルト', 'でんき館 オーム'], items: [['tvset', 1.5, 0.45, { w: 1.5, sc: '#a8d8ff' }, 'w', 2], ['picfurn', 1.8, 0.45, { img: 'mg-appliance-shelf', w: 1.8, h: 1.9, d: 0.45, c: 0x6a4a30 }, 't'], ['goodsshelf', 2.0, 0.8, { w: 2.0, dbl: 1, img: 'mg-appliance-shelf' }, 'c'], ['washer', 0.6, 0.6, {}, 'w', 2], ['fridge', 0.7, 0.66, {}, 't'], ['shopcounter', 1.8, 0.6, { w: 1.8 }, 'w']], npc: ['店員', 'talk:mgshop'] },
    books: { names: ['書店 星図堂', '古本 ページ', 'まちの本屋'], items: [['libshelf', 2.4, 0.4, { w: 2.4 }, 't', 3], ['libshelf', 2.0, 0.7, { w: 2.0, dbl: 1 }, 'c'], ['pictop', 1.6, 1.0, { img: 'mg-books-table', w: 1.6, d: 1.0, h: 0.8, c: 0x6a4a30 }, 'c'], ['picfurn', 1.4, 0.45, { img: 'mg-magazine-rack', w: 1.4, h: 1.5, d: 0.45, c: 0x6a4a30 }, 'w'], ['shopcounter', 1.6, 0.6, { w: 1.6 }, 'w']], npc: ['店主', 'talk:mgbooks'] },
    arcade: { names: ['ゲームセンター ネオ', 'アミューズ 777'], lamps: 'spot', items: [['arcade', 0.85, 0.85, {}, 'w', 4], ['slot', 0.85, 0.75, {}, 'w', 2]], npc: null },
    bakery: { names: ['パン工房 ドーム', 'ベーカリー 小麦星'], items: [['picfurn', 1.8, 0.6, { img: 'mg-bakery-case', w: 1.8, h: 1.3, d: 0.6, c: 0x8a5a30 }, 'w'], ['shopcounter', 1.8, 0.6, { w: 1.8 }, 'w'], ['homekit', 2.4, 0.62, { w: 2.4 }, 't']], npc: ['パン職人', 'talk:mgbakery', 'mg-cloth-apron'] },
    drug: { names: ['くすりのメガ', '薬局 ハーブ堂'], items: [['goodsshelf', 1.8, 0.8, { w: 1.8, dbl: 1, img: 'mg-pharmacy-shelf' }, 'c', 2], ['picfurn', 1.8, 0.42, { img: 'mg-pharmacy-shelf', w: 1.8, h: 1.95, d: 0.42, metal: 1 }, 't'], ['shopcounter', 1.8, 0.6, { w: 1.8 }, 'w'], ['pictop', 1.0, 0.6, { img: 'mg-medicine-packs', w: 1.0, d: 0.6, h: 0.9, c: 0xe8e8e4 }, 'w']], npc: ['薬剤師', 'talk:mgdrug'] },
    cloth: { names: ['古着 ルナ', '作業服の店 タフ', '洋品店 リボン'], items: [['picfurn', 2.0, 0.6, { img: 'mg-clothes-rack', w: 2.0, h: 1.9, d: 0.6, c: 0x6a5040 }, 't'], ['garmentrack', 2.4, 0.5, { n: 4 }, 'w'], ['garmentrack', 1.8, 0.5, { n: 3 }, 'c'], ['shopcounter', 1.6, 0.6, { w: 1.6 }, 'w']], npc: ['店主', 'talk:mgshop'] },
    realty: { names: ['不動産 メガトン住宅', '住まいの窓口'], items: [['homedesk', 1.2, 1.1, { w: 1.2 }, 'w', 2], ['noticeboard', 1.6, 0, { w: 1.5 }, 'm', 2], ['seatrow', 1.9, 0.6, { n: 3 }, 'w']], npc: ['不動産屋', 'talk:mgrealty'] },
    travel: { names: ['旅行社 ステラツアー', '星めぐり観光'], items: [['homedesk', 1.2, 1.1, { w: 1.2 }, 'w'], ['districtmap', 2.0, 0, { w: 1.8, h: 1.2, use: false }, 'm'], ['posters', 1.4, 0, { w: 1.4, seed: 7 }, 'm'], ['picwall', 1.2, 0, { img: 'mg-fireworks', w: 1.0, h: 1.0, y: 1.6, frame: 1 }, 'm'], ['seatrow', 1.9, 0.6, { n: 3 }, 'w']], npc: ['案内係', 'talk:tourist'] },
    bar: { names: ['立ち飲み 重力', 'バー 無重量', '居酒屋 炉ばた', 'スナック 月影'], lamps: 'pendant', items: [['barcounter', 4.0, 2.0, { w: 3.6, _sh: 0.62 }, 'w'], ['stool', 0.5, 0.5, { c: 0x8a2a20 }, 'c', 2], ['table', 1.6, 1.6, { wood: 1, n: 3 }, 'c'], ['picfurn', 1.8, 0.4, { img: 'mg-sake-shelf', w: 1.8, h: 1.9, d: 0.4, c: 0x5a3a20 }, 't'], ['pictop', 1.2, 0.6, { img: 'mg-yakitori', w: 1.2, d: 0.6, h: 0.95, glow: 0.45, metal: 1 }, 'w']], npc: ['店主', 'bar'] },
    diner: { names: ['食堂 まるいち', '大衆食堂 錨亭', 'めし処 ほしぞら', '定食 かもめ'], lamps: 'pendant', items: [['shopcounter', 2.4, 0.6, { w: 2.4 }, 'w'], ['menuboard', 1.8, 0, { w: 1.8 }, 'm'], ['table', 1.6, 1.6, { wood: 1, n: 3, dish: 'mg-curry' }, 'c', 2], ['homekit', 2.0, 0.62, { w: 2.0 }, 't'], ['picwall', 2.4, 0, { img: 'mg-ramen-kitchen', w: 2.3, h: 1.5, y: 1.45 }, 'm']], npc: ['店主', 'ramen', 'mg-cloth-apron'] },
    ramen: { names: ['ラーメン 星屑', '中華そば 軌道軒'], lamps: 'pendant', items: [['shopcounter', 3.0, 0.6, { w: 3.0, dish: 'mg-ramen-bowl' }, 'w'], ['picfurn', 0.72, 0.5, { img: 'mg-ticket-machine', w: 0.72, h: 1.6, d: 0.5, metal: 1 }, 'w'], ['stool', 0.5, 0.5, {}, 'c', 3], ['menuboard', 2.0, 0, { w: 2.0 }, 'm'], ['homekit', 2.0, 0.62, { w: 2.0 }, 't'], ['picwall', 2.4, 0, { img: 'mg-ramen-kitchen', w: 2.3, h: 1.5, y: 1.45 }, 'm']], npc: ['大将', 'ramen', 'mg-cloth-apron'] },
    sweets: { names: ['駄菓子 ほしの', 'おかし屋 こんぺいとう'], items: [['picfurn', 1.6, 0.45, { img: 'mg-candy-shelf', w: 1.6, h: 1.8, d: 0.45, c: 0x6a4a30 }, 't', 2], ['glassshelf', 1.6, 0.6, { w: 1.6 }, 'w'], ['shopcounter', 1.4, 0.6, { w: 1.4 }, 'w']], npc: ['おばあちゃん', 'talk:mgsweets', 'mg-cloth-knit'] },
    repair: { names: ['修理 なんでも屋', '電子修理 ボルト', '時計と機械の店'], items: [['workbench', 2.4, 0.9, {}, 'w'], ['toolcart', 0.8, 0.5, {}, 'w'], ['homeshelf', 1.0, 0.34, {}, 't', 2], ['boxes', 1.6, 0.8, { n: 3 }, 'w']], npc: ['修理屋', 'talk:mgrepair'] },
    barber: { names: ['理容 カット 7', 'バーバー 回転', '美容室 ひかり'], items: [['barberchair', 0.8, 1.6, { _sh: 0.16 }, 'w', 2], ['seatrow', 1.3, 0.6, { n: 2 }, 'w']], npc: ['理容師', 'talk:mgbarber'] },
    grocer: { names: ['八百屋 緑果', '青果 ハイドロ', '水耕野菜の店'], items: [['produce', 2.0, 1.0, { w: 2.0 }, 'w', 2], ['produce', 1.6, 1.0, { w: 1.6 }, 'c'], ['shopcounter', 1.4, 0.6, { w: 1.4 }, 'w']], npc: ['八百屋', 'market', 'mg-cloth-apron'] },
    fish: { names: ['鮮魚 ナガレ', '培養魚の店 しおさい'], items: [['aquarium', 2.2, 0.9, { w: 2.0 }, 'w'], ['pictop', 2.0, 1.0, { img: 'mg-fish-ice', w: 2.0, d: 1.0, h: 0.85, metal: 1 }, 'c'], ['drinkcase', 1.2, 0.7, { w: 1.2 }, 't']], npc: ['魚屋', 'market', 'mg-cloth-apron'] },
    butcher: { names: ['肉の大和', '精肉 プロテイン'], items: [['picfurn', 2.0, 0.8, { img: 'mg-meat-case', w: 2.0, h: 1.25, d: 0.8, metal: 1 }, 'w'], ['drinkcase', 1.2, 0.7, { w: 1.2 }, 't'], ['shopcounter', 2.0, 0.6, { w: 2.0 }, 'w'], ['homekit', 2.0, 0.62, { w: 2.0 }, 't']], npc: ['肉屋', 'market', 'mg-cloth-apron'] },
    tea: { names: ['茶舗 雲海', 'お茶と海苔の店'], items: [['picfurn', 1.6, 0.4, { img: 'mg-tea-cans', w: 1.6, h: 1.8, d: 0.4, c: 0x5a3a20 }, 't', 2], ['shopcounter', 1.8, 0.6, { w: 1.8 }, 'w'], ['lowtable', 1.0, 0.7, { n: 2 }, 'c']], npc: ['茶屋', 'cafe', 'mg-cloth-yukata'] },
    flower: { names: ['花屋 ハナミズキ', 'フラワー 温室'], items: [['picfurn', 1.8, 0.6, { img: 'mg-flower-buckets', w: 1.8, h: 1.3, d: 0.6, metal: 1 }, 'w'], ['plant', 0.6, 0.6, { s: 0.8 }, 'w', 2], ['pottree', 0.7, 0.7, { s: 0.9 }, 'w', 2], ['shopcounter', 1.4, 0.6, { w: 1.4 }, 'w']], npc: ['花屋', 'talk:mgflower', 'mg-cloth-apron'] },
    tools: { names: ['金物 鋳物屋', '工具の店 スパナ'], items: [['picwall', 2.0, 0, { img: 'mg-tool-wall', w: 2.0, h: 1.9, y: 1.35 }, 'm'], ['homeshelf', 1.0, 0.34, {}, 't', 2], ['toolcart', 0.8, 0.5, {}, 'w', 2], ['shopcounter', 1.6, 0.6, { w: 1.6 }, 'w'], ['boxes', 1.6, 0.8, { n: 3 }, 'w']], npc: ['金物屋', 'talk:mgshop'] },
    laundry: { names: ['コインランドリー'], items: [['picfurn', 1.9, 0.7, { img: 'mg-dryers', w: 1.9, h: 1.9, d: 0.7, metal: 1 }, 't'], ['washer', 0.62, 0.62, {}, 'w', 3], ['bench', 2.0, 0.6, {}, 'w']], npc: null },
  };
  const pool = { main: ['conv', 'cafe', 'bank', 'electric', 'books', 'bakery', 'drug', 'cloth', 'realty', 'travel', 'bar', 'diner', 'flower'], market: ['grocer', 'fish', 'butcher', 'sweets', 'tea', 'flower', 'tools', 'diner', 'ramen', 'bakery'], old: ['diner', 'ramen', 'sweets', 'repair', 'barber', 'bar', 'tools', 'cloth'], green: ['conv', 'laundry', 'barber', 'drug', 'bakery', 'diner', 'cafe', 'flower', 'books'], view: ['cafe', 'flower', 'books'], ninth: ['cafe', 'conv', 'laundry', 'bakery'], dorm: ['diner', 'laundry', 'tools', 'bar'], port: ['bar', 'tools', 'diner', 'repair', 'ramen'] };
  return { def, pool, open: new Set(['grocer', 'fish', 'butcher', 'sweets', 'tea', 'flower', 'diner', 'ramen', 'tools', 'books', 'cloth', 'bakery']) };
}

// ───────────────────────── 通路の照明・生活の小物 ─────────────────────────
let doorsH = () => null;
function dressCorridor(c, rooms, byId, rnd) {
  const pick = (a) => a[Math.floor(rnd() * a.length)], ch = (p) => rnd() < p, Rn = (a, b) => a + rnd() * (b - a);
  const long = c.w >= c.d, L = long ? c.w : c.d, W = long ? c.d : c.w, Wi = W - 2 * T, d = like(c.dist), P = c.props;
  // 照明: 中心線に不揃いな間隔で。広い通りは左右に振る
  const pts = []; for (let t = Rn(1, 2.6); t < L - 0.8; t += Rn(3.4, 5.8)) { const off = W > 5 ? (ch(0.5) ? -1 : 1) * W * Rn(0.15, 0.28) : 0; pts.push(long ? [q(t), q(W / 2 + off), 0] : [q(W / 2 + off), q(t), HP]); }
  c.lampPts = pts;
  c.deco = ({ old: ch(0.7) ? ['mgpipes'] : ['mgpipes', 'cables'], main: ['frames', 'tray'], market: ['frames', 'mgpipes'], green: ['rail'], view: ['coves'], ninth: ['frames'], dorm: ['mgpipes', 'tray'], port: ['mgpipes', 'frames'], svc: ['mgpipes', 'tray', 'frames', 'floorlights'], civic: ['rail'] })[d];
  if (c.h >= 2.75 && d !== 'main' && d !== 'view' && ch(0.6)) c.deco = [...c.deco, 'soffit']; // ダクトを包んだ下がり天井 (所々)
  // 壁ぞいの空き区間
  const sidesL = long ? ['n', 's'] : ['w', 'e'], floorItems = [], endOpen = (long ? ['w', 'e'] : ['n', 's']).map((e) => c.opens.some((o) => o.side === e));
  const nearOpen = (t, k) => c.opens.some((o) => sidesL.includes(o.side) && t > o.a - k && t < o.b + k) || (endOpen[0] && t < 2.2) || (endOpen[1] && t > L - 2.2);
  const lane = (side, a, b, dep) => { const other = floorItems.filter((f) => f.side !== side && f.a < b && f.b > a).reduce((m, f) => Math.max(m, f.dep), 0), mine = floorItems.filter((f) => f.side === side && f.a < b + 0.15 && f.b > a - 0.15).length; return !mine && Wi - dep - other >= 1.15; };
  const at = (side, t, dep = 0) => (side === 'n' ? [t, T + dep / 2, 0] : side === 's' ? [t, W - T - dep / 2, 2] : side === 'w' ? [T + dep / 2, t, 1] : [W - T - dep / 2, t, 3]); // 床置き: 中心 / 壁掛け: dep = 0
  const off = (side, t, k) => { const [x, z, rot] = at(side, t, 0); return [q(x + (side === 'w' ? k : side === 'e' ? -k : 0)), q(z + (side === 'n' ? k : side === 's' ? -k : 0)), rot]; };
  const put = (kind, side, t, dep, o = {}, w = 0.6) => { const [x, z, rot] = at(side, t, dep); P.push([kind, q(x), q(z), rot, o]); if (dep) floorItems.push({ side, a: t - w / 2, b: t + w / 2, dep }); };
  // 玄関まわり (住戸の扉ごと)
  for (const o of c.opens) { const R = byId[o.to]; if (!R || !sidesL.includes(o.side)) continue; const mid = (o.a + o.b) / 2;
    if (R.kind === 'home' || R.kind === 'vacant') { const lw = o.side === 'n' || o.side === 's' ? R.w : R.d, lot0 = o.side === 'n' || o.side === 's' ? R.x - c.x : R.z - c.z, hand = R.hand || 1;
      // 台所の小窓: 扉の脇 (蝶番と反対側) に余地があれば
      const wpos = -hand * (0.575 + 0.75), wabs = mid + wpos, winOK = !R.vacant && R.sub !== 'dorm' && wabs - 0.55 > lot0 + 0.15 && wabs + 0.55 < lot0 + lw - 0.15 && !c.opens.some((p) => p !== o && p.side === o.side && wabs + 0.55 > p.a - 0.2 && wabs - 0.55 < p.b + 0.2);
      const k = R.vacant ? (ch(0.5) ? 3 : 0) : pick([0, 0, 1, 1, 2, 4, 0, 1]), kx = 0; const clutter = k && lane(o.side, mid + hand * 1.0 - 0.3, mid + hand * 1.0 + 0.3, 0.45);
      put('homefront', o.side, mid, 0, { w: 1.15, hand: o.side === 'n' || o.side === 'e' ? hand : -hand, win: winOK ? (o.side === 'n' || o.side === 'e' ? wpos : -wpos) : 0, k: clutter ? k : 0, kx, seed: Math.floor(rnd() * 9), mc: pick([0x6a5a4a, 0x4a5a6a, 0x8a3a3a, 0x3a6a4a]), lamp: d !== 'old' || ch(0.6) });
      if (clutter) floorItems.push({ side: o.side, a: mid + hand * 1.0 - 0.3, b: mid + hand * 1.0 + 0.3, dep: 0.45 });
      { const ks = mid - hand * 1.05; if (!R.vacant && W >= 2.4 && ch(0.09) && lane(o.side, ks - 0.32, ks + 0.32, 0.5)) { put('kasa', o.side, ks, 0, { r: 0.42 }); floorItems.push({ side: o.side, a: ks - 0.32, b: ks + 0.32, dep: 0.5 }); } } // 開いて干した傘
    } else if (R.kind === 'shop') {
      const [x, z, rot] = off(o.side, mid, 0.09), y = Math.min(c.h - 0.22, (R.doorH || 2.2) + 0.42); P.push(S(R.name, x, z, rot, { h: 0.3, y: q(y), c: pick(['#ffe2b8', '#fff4dc', '#c8f0ff', '#ffd0e0']), frame: 1, k: 1.7, size: 64, board: ['old', 'port', 'market', 'dorm'].includes(d) ? 'mg-signboard-wood' : 'mg-signboard-metal' })); // 看板板の上に店名
      if (['diner', 'ramen', 'tea', 'sweets'].includes(R.shop)) put('noren', o.side, mid, 0, { w: Math.min(1.8, o.b - o.a - 0.2), y: Math.min(2.3, c.h - 0.4), c: pick([0x2a3a6a, 0x8a2a20, 0x2c5a4e]) });
      if (['grocer', 'fish', 'flower', 'bakery', 'tools', 'cloth', 'books', 'butcher'].includes(R.shop) && c.h >= 3.2) put('awning', o.side, mid, 0, { w: o.b - o.a + 0.6, y: Math.min(2.9, c.h - 0.4), c: pick([0xb8452e, 0x2e7ab8, 0x3aa86a, 0xc9a22e]) });
    } else if (R.kind === 'svc') { const [x, z, rot] = off(o.side, mid, 0.09); P.push(S(R.name.split(' ').slice(-1)[0], x, z, rot, { h: 0.22, y: q(Math.min(c.h - 0.2, (R.doorH || 2.2) + 0.35)), c: '#e8f4ff', frame: 1, k: 1.4, size: 56 })); }
  }
  // 壁だけの区間に、街区らしい物を
  const ITEMS = {
    old: [['shutter', 2.6, 0], ['shaft', 0.9, 0.42], ['meterbox', 0.6, 0], ['bicycle', 1.5, 0.5], ['laundry', 1.3, 0.4], ['plant', 0.6, 0.5], ['trashbins', 1.3, 0.56, { n: 2 }], ['posters', 1.2, 0], ['louver', 0.9, 0], ['breaker', 0.7, 0], ['firehose', 0.8, 0], ['boxes', 1.2, 0.6, { n: 2 }]],
    main: [['bench', 2.0, 0.6, { wood: 1 }], ['vending', 1.0, 0.7], ['pottree', 0.7, 0.7], ['districtmap', 2.0, 0, { use: false }], ['posters', 1.4, 0], ['firehose', 0.8, 0], ['newsstand', 1.4, 0.7]],
    market: [['shutter', 2.6, 0], ['produce', 2.0, 1.0], ['boxes', 1.6, 0.8], ['vending', 1.0, 0.7], ['trashbins', 1.9, 0.56], ['posters', 1.2, 0]],
    green: [['shaft', 1.0, 0.42], ['noticeboard', 1.3, 0], ['bicycle', 1.5, 0.5], ['plant', 0.6, 0.5], ['firehose', 0.8, 0], ['meterbox', 0.6, 0], ['bench', 2.0, 0.6, { wood: 1 }], ['exitsign', 0.5, 0], ['mailboxes', 1.4, 0.3, { w: 1.4 }]],
    view: [['pottree', 0.7, 0.7], ['bench', 2.0, 0.6, { wood: 1 }], ['posters', 1.2, 0, { w: 1.0, h: 0.7, seed: 6 }], ['firehose', 0.8, 0], ['exitsign', 0.5, 0]],
    ninth: [['shaft', 1.0, 0.4], ['pottree', 0.7, 0.7], ['bench', 2.0, 0.6, { wood: 1 }], ['noticeboard', 1.3, 0], ['bicycle', 1.5, 0.5], ['vending', 1.0, 0.7], ['firehose', 0.8, 0], ['exitsign', 0.5, 0]],
    dorm: [['shaft', 0.9, 0.45], ['laundry', 1.3, 0.4], ['meterbox', 0.6, 0], ['breaker', 0.7, 0], ['valvepanel', 1.4, 0], ['boxes', 1.2, 0.6, { n: 2 }], ['vending', 1.0, 0.7], ['bicycle', 1.5, 0.5], ['firehose', 0.8, 0]],
    port: [['shutter', 2.6, 0], ['shaft', 0.9, 0.42], ['boxes', 1.6, 0.8], ['meterbox', 0.6, 0], ['bicycle', 1.5, 0.5], ['trashbins', 1.9, 0.56], ['laundry', 1.3, 0.4], ['valvepanel', 1.4, 0], ['firehose', 0.8, 0], ['vending', 1.0, 0.7]],
    svc: [['valvepanel', 1.4, 0], ['breaker', 0.7, 0], ['louver', 0.9, 0], ['firehose', 0.8, 0], ['exitsign', 0.5, 0], ['cylinders', 1.4, 0.5, { n: 3 }]],
    civic: [['noticeboard', 1.3, 0], ['pottree', 0.7, 0.7], ['bench', 2.0, 0.6, { wood: 1 }], ['firehose', 0.8, 0], ['exitsign', 0.5, 0], ['posters', 1.2, 0, { seed: 3 }]],
  }[d] || [];
  for (const side of sidesL) {
    const ops = c.opens.filter((o) => o.side === side).sort((a, b) => a.a - b.a), m = 0.75; let cur = endOpen[0] ? 1.9 : 0.6; const spans = []; // 扉・継ぎ目の前は空けておく
    for (const o of ops) { if (o.a - m - cur > 0.8) spans.push([cur, o.a - m]); cur = Math.max(cur, o.b + m); }
    const last = L - (endOpen[1] ? 1.9 : 0.6); if (last - cur > 0.8) spans.push([cur, last]);
    for (const [a0, b0] of spans) { let t = a0 + Rn(0, 0.4);
      while (t < b0 - 0.6) { if (!ch(d === 'old' || d === 'port' || d === 'dorm' ? 0.55 : 0.4)) { t += Rn(0.8, 2.2); continue; }
        const [k, w, dep, o = {}] = pick(ITEMS); if (t + w > b0) { t += 0.5; continue; }
        if (dep && !lane(side, t, t + w, dep)) { t += 0.6; continue; }
        const mid = t + w / 2, oo = { ...o, seed: Math.floor(rnd() * 9), ...(k === 'shaft' ? { h: c.h, w, c: pick([0xe0dcd2, 0xd8d4c8, 0xc8d0c8]) } : {}) };
        if (k === 'bicycle' || k === 'bench' || k === 'laundry' || k === 'trashbins' || k === 'boxes' || k === 'produce' || k === 'cylinders') put(k, side, mid, dep, oo, w); // 長手方向に沿って置く
        else if (dep) put(k, side, mid, dep, oo, w); else put(k, side, mid, 0, { ...oo, y: k === 'louver' ? Math.min(c.h - 0.45, 2.3) : k === 'exitsign' ? Math.min(c.h - 0.3, 2.3) : oo.y });
        t += w + Rn(0.3, 1.6); }
    }
  }
  // 行き止まり: 景色の画面か植木
  for (const end of long ? ['w', 'e'] : ['n', 's']) { if (c.opens.some((o) => o.side === end)) continue;
    const mid = W / 2, pos = end === 'w' ? [T, mid, 1] : end === 'e' ? [L - T, mid, 3] : end === 'n' ? [mid, T, 0] : [mid, L - T, 2]; if (Wi >= 1.6) P.push(['vwindow', q(pos[0]), q(pos[1]), pos[2], { w: Math.min(1.4, Wi - 0.4), h: 0.9, y: 1.5, cur: false }]); }
  // 上の階の家並み (天井の高い大通りの壁の上部)
  if (c.h >= 5.5) for (const side of sidesL) { const [x, z, rot] = at(side, L / 2, 0); P.push(['facade', q(x), q(z), rot, { w: q(L - 1.4), yb: 3.75, yt: q(c.h - 0.15), story: 2.6 }]); }
  // 行き先の札 (別の通りへの継ぎ目の上に、その通りの名前)
  for (const o of c.opens) { const R = byId[o.to]; if (!R || !R.corr || R.street === c.street) continue; const dd = doorsH(c.id, R.id); if (dd == null || c.h - dd < 0.42) continue;
    const mid = (o.a + o.b) / 2, side = o.side, pos = side === 'n' ? [mid, T + 0.08, 0] : side === 's' ? [mid, (long ? W : L) - T - 0.08, 2] : side === 'w' ? [T + 0.08, mid, 1] : [(long ? L : W) - T - 0.08, mid, 3];
    P.push(S(`→ ${R.street}`, q(pos[0]), q(pos[1]), pos[2], { h: 0.22, y: q(Math.min(c.h - 0.17, dd + 0.3)), c: '#e8f6ff', frame: 1, k: 1.35, size: 56 })); }
  // 番地札 (区間ごとに 1 枚)
  { const side = sidesL[1], t = Math.min(L - 0.5, Math.max(0.5, L * Rn(0.25, 0.6))); if (!nearOpen(t, 0.5)) { const [x, z, rot] = at(side, t, 0); P.push(['addrplate', q(x), q(z), rot, { y: Math.min(c.h - 0.4, 2.1) }]); } }
  // 通りの名札 (最初の区間の入口近くに)
  if (c.o.st) { const side = sidesL[0], t = Math.min(2.2, L / 3), [x, z, rot] = at(side, t, 0); P.push(S(c.o.st, q(x + (side === 'w' ? 0.03 : 0)), q(z + (side === 'n' ? 0.03 : 0)), rot, { h: 0.26, y: q(Math.min(c.h - 0.3, 2.35)), c: '#fff2d8', frame: 1, k: 1.5, size: 64 })); }
  // 本通りの中央: 植え込み・ベンチ・街灯を不揃いに (両端の継ぎ目の前は空ける)
  if (c.o.mid) for (let t = Rn(6.5, 9); t < L - 6.5; t += Rn(7, 12)) { const cz = W / 2 + Rn(-0.6, 0.6), kind = pick(['planter', 'planter', 'streetlamp', 'kiosk']); if (kind === 'planter') { P.push(['planter', q(long ? t : cz), q(long ? cz : t), long ? 0 : 1, { w: Rn(3, 5), flowers: 1 }]); P.push(['bench', q(long ? t : cz + 1.1), q(long ? cz + 1.1 : t), long ? 0 : 1, { c: 0x5a6a7a }]); } else if (kind === 'streetlamp') P.push(['streetlamp', q(long ? t : cz), q(long ? cz : t), 0]); else P.push(['pottree', q(long ? t : cz), q(long ? cz : t), 0, { s: 1.1 }]); }
  // 人通り
  const npcs = Wi < 2.9 ? 0 : d === 'main' ? 2 : d === 'market' ? 2 : ch(0.4) ? 1 : 0; for (let i = 0; i < npcs; i++) { let t = Rn(1.5, L - 1.5); for (let k = 0; k < 12 && nearOpen(t, 1.4); k++) t = Rn(1.5, L - 1.5); if (nearOpen(t, 1.4)) continue; const off = (ch(0.5) ? -1 : 1) * (Wi / 2 - 0.55); const lb = pick(['住人', '通行人', '買い物客', '配達員', '学生']); P.push(['npc', q(long ? t : W / 2 + off), q(long ? W / 2 + off : t), Math.floor(rnd() * 4), { label: lb, use: pick(['talk:mgres', 'talk:mgres2', 'talk:mgres3', 'talk:megacitizen', 'talk:megacitizen2']), suit: pick(SUIT), cloth: lb === '学生' ? 'mg-cloth-school' : d === 'dorm' ? 'mg-clothes-work' : pick(CLOTH), bag: lb === '学生' || lb === '配達員' ? 1 : 0 }]); }
  // マンホールと排水溝 (広い通りの床に、扉の前を避けて)
  if (W >= 3 && ch(d === 'main' || d === 'market' || d === 'svc' || d === 'port' || d === 'dorm' ? 0.75 : 0.35)) { let t = Rn(2, L - 2); for (let k = 0; k < 8 && nearOpen(t, 1.2); k++) t = Rn(2, L - 2); P.push(['roundpic', q(long ? t : W / 2 + Rn(-0.4, 0.4)), q(long ? W / 2 + Rn(-0.4, 0.4) : t), 0, { img: 'mg-manhole', r: 0.36, floor: 1, rough: 0.6, metal: 0.5 }]); }
  if (['market', 'dorm', 'port', 'svc'].includes(d) && ch(0.6)) { const side = sidesL[Math.floor(rnd() * 2)], t = Rn(1.5, L - 1.5), [x, z] = at(side, t, 0.5); P.push(['floorpic', q(x), q(z), 0, { img: 'mg-drain', w: 0.45, d: 0.45, metal: 0.6 }]); }
}

// ───────────────────────── 固定の部屋 (港・ロビー・広場・公共施設・大きな店) ─────────────────────────
function facilities(PAL, rnd) {
  const rooms = [], doors = [], R = (id, name, x0, z0, x1, z1, h, o = {}) => { const r = { id, name, x: q(x0), z: q(z0), w: q(x1 - x0), d: q(z1 - z0), h, ...o, props: o.props || [] }; rooms.push(r); return r; };
  const D = (...a) => doors.push(a); let pub = 0; const P = (r) => { pub++; return r; };
  const C = PAL.civic, M = PAL.main, G = PAL.green;
  // 第 7 ドック (港)
  R('hangar', '第 7 ドック', 0, 0, 60, 60, 20, { floor: PAL.big.dockF, wall: ['bulk', 0xc8c4b8, 0.75, 0.4], ceil: ['rib', 0x8a8880], ceil3: 'truss', truss: 0xd8a830, ribs: true, trims: 'both', deco: ['ibeam', 'ducts', 'cables'], win: [['n', 8, 52, 2.5, 16]], li: 1.8, lamps: 'spot',
    props: [['shipslot', 30, 28, 0, { r: 13 }], TM('第 7 ドック管理', 'shipyard', 52.5, 53.5, 0), ['gantry', 30, 6, 0, { w: 56, at: 16 }], ['gantry', 30, 50, 0, { w: 56, at: -18 }], ['cargo', 5, 8, 0, { c: 0xc9a22e }], ['cargo', 8.4, 8, 0, { c: 0x2c5a4e }], ['cargo', 5, 16, 0, { c: 0xb8452e }], ['cargo', 55, 9, 0, { c: 0x2e7ab8 }], ['cargo', 55, 17, 0, { c: 0xc9a22e }],
      ['crate', 50, 26, 0, { n: 6 }], ['crate', 8, 40, 0, { n: 6 }], ['crate', 13, 44, 0, { n: 5 }], ['barrel', 5, 52, 0], ['barrel', 9, 54, 0], ['pipes', 59.5, 12, 3], ['pipes', 0.5, 30, 1, { c: 0xc9a22e }], ['workbench', 14, 59.2, 2], ['toolcart', 40, 12, 0.4, { c: 0xc9a22e }], ['toolcart', 18, 30, -0.3],
      ['conveyor', 7, 30, 1, { l: 10, item: 'crate' }], ['loaderbot', 20, 50, 1, { l: 10 }], ['robotarm', 10.6, 36, 3], S('MEGATON', 30, 59.7, 2, { h: 2.4, y: 14, c: '#ffd27a' }), S('第 7 ドック ─ 入港ロビー →', 59.7, 22, 3, { h: 0.8, y: 6.2, c: '#ffe8c0' }), S('港町 倉庫通り ↓', 42.5, 59.7, 2, { h: 0.6, y: 5.2, c: '#ffe8c0' }),
      N('港湾係官', 'talk:megadock', 37.5, 54, -1, 0x2c5a4e, { visor: '#ffd27a' }), ['steam', 14, 12, 0], ['steam', 48, 34, 0], ['alarm', 0.3, 46, 1, { c: '#ffb030' }], ['alarm', 59.7, 46, 3, { c: '#ffb030' }], ['hazard', 30, 58.5, 0, { w: 8, d: 0.6 }],
      ['wallpanel', 0.22, 38, 1, { w: 2.4, h: 1.5, text: '第 7 ドック 配電' }], ['cylinders', 0.5, 24, 1, { n: 6 }], ['firstaid', 59.78, 40.4, 3], ['extinguisher', 59.78, 42.4, 3], ['cabledrum', 22, 8, 0.5], ['cabledrum', 24.4, 9.6, 1.4, { c: 0x2a6ab8 }],
      ['billboard', 0.22, 12, 1, { w: 7, h: 3.2, y: 7.4, text: 'ZEPHYR GAS\n希ガスはメガトンへ', c: '#7fc8e8' }], ['billboard', 59.78, 50, 3, { w: 7, h: 3.2, y: 8, text: 'WELCOME TO MEGATON\n第 7 居住甲板', c: '#ffd27a' }], ['floorhatch', 16, 20, 0], ['warnsign', 22, 59.78, 2, { text: '荷役中\n頭上注意', w: 1.3, h: 0.85, y: 2.5 }]] });
  // 入港ロビー
  P(R('arrival', 'メガトン 入港ロビー', 60, 16, 90, 44, 6, { join: 1, floor: PAL.big.lobbyF, wall: PAL.big.lobbyW, ceil: C.ceil, ceil3: 'coffer', cofferC: 0xe8e4dc, lamps: 'panel', deco: ['coves'], li: 1.25,
    props: [['megamodel', 19, 17, 0, { use: 'talk:megamodel', label: 'メガトンの模型' }], ['reception', 4.6, 1.2, 0, { w: 3.0 }], N('案内係', 'talk:megaguide', 4.6, 0.6, 0, 0x2c5a4e, { visor: '#ffd27a' }), TM('任務端末', 'missions', 26.4, 3, -0.4), TM('星図', 'map', 26.4, 25, -2.6, { kind: 'orbit' }),
      ['districtmap', 15, 0.2, 0, { w: 3.2, h: 1.9, y: 2.3, label: '第 7 居住甲板 案内図' }], ['seatrow', 9, 20.5, 0, { n: 5, c: 0x2c5a4e }], ['seatrow', 9, 21.7, 2, { n: 5, c: 0x2c5a4e }], ['seatrow', 24, 21, 0, { n: 4, c: 0x2c5a4e }], ['locker', 29.55, 22, 3, { n: 4 }], ['vending', 22, 27.45, 2], ['vending', 23.1, 27.45, 2, { c: '#ffd27a', title: 'TEA' }],
      ['pottree', 1.2, 26.6, 0, { s: 1.2 }], ['pottree', 28.6, 1.2, 0, { s: 1.2 }], ['pottree', 1.2, 8, 0], ['picwall', 29.8, 16, 3, { img: 'mg-aed-wall', w: 1.0, h: 0.75, y: 1.4 }], ['floorarrow', 15, 11, 0, { l: 24 }], ['newsstand', 14, 26.9, 2], ['luggage', 6, 25.5, 0, { n: 4 }],
      S('本通り →', 29.7, 11, 3, { h: 0.5, y: 4.9 }), S('← 第 7 ドック', 0.3, 14, 1, { h: 0.5, y: 5.1 }), S('錨町 ↑', 9.8, 0.3, 0, { h: 0.4, y: 3.1 }), S('緑ヶ丘・港町 ↓', 11.5, 27.7, 2, { h: 0.4, y: 3.4 }), S('MEGATON ─ 入港ロビー', 21, 27.7, 2, { h: 0.6, y: 4.6, c: '#ffd27a' }),
      N('旅行者', 'talk:tourist', 12, 14, 1.2, 0x3a6ea8, { cloth: 'mg-cloth-knit', bag: 1 }), N('市民', 'talk:megacitizen', 20, 23, -2, 0x6a4a8a)] }));
  D('hangar', 'arrival', 30, 6, 4.5, 'blast', { mat: 'mg-bulkhead' });
  // 中央広場 (人工の空)
  P(R('plaza', 'メガトン 中央広場', 150, 0, 182, 46, 11, { join: 1, ceil3: 'skyceil', floor: M.floor, wall: M.wall, li: 1.2, lamps: 'strip',
    props: [['atomsculpt', 16, 18.5, 0, { use: 'talk:atom', label: '原子の像' }], ['fountain', 16, 9.5, 0, { r: 2.6, c: '#9ad8ff', stone: 'mg-fountain-stone' }], ['hedge', 4.5, 44.6, 0, { w: 6 }], ['hedge', 27.5, 44.6, 0, { w: 6 }], ['hedge', 31.1, 4, 1, { w: 4.5 }], ['yatai', 2.5, 28.5, 1, { use: 'ramen', label: '屋台のおでん' }], ['roundpic', 12, 26, 0, { img: 'mg-manhole', r: 0.4, floor: 1, metal: 0.5 }], ['roundpic', 21, 31, 0, { img: 'mg-manhole', r: 0.4, floor: 1, metal: 0.5 }], ['tree', 5, 5, 0, { s: 1.1 }], ['tree', 27, 5.5, 0], ['tree', 5, 40, 0, { s: 1.15 }], ['tree', 26.5, 40.5, 0, { s: 1.1 }], ['tree', 9, 35, 0], ['tree', 24, 14.5, 0, { s: 0.9 }],
      ['bench', 10.5, 15.5, 0, { c: 0x5a6a7a, wood: 1 }], ['bench', 21.5, 15.5, 0, { c: 0x5a6a7a, wood: 1 }], ['bench', 13, 35, 2, { c: 0x5a6a7a, wood: 1 }], ['bench', 22, 35.5, 2, { c: 0x5a6a7a, wood: 1 }], ['streetlamp', 9, 9, 0], ['streetlamp', 23, 9, 0], ['streetlamp', 9, 38.5, 0], ['streetlamp', 23, 38.5, 0],
      ['planter', 16, 39.5, 0, { w: 6, flowers: 1 }], ['planter', 3, 13, 1, { w: 5, flowers: 1 }], ['stall', 27, 21.5, 3, { c: 0x3a6ea8, use: 'cafe', label: '屋台コーヒー' }], ['newsstand', 2.2, 35, 0], ['infopillar', 12, 41.5, 0], ['vending', 31.4, 43.5, 3], ['vending', 31.4, 42.3, 3, { c: '#ffd27a', title: 'TEA' }],
      ['clock', 16, 0.3, 0, { r: 1.6, y: 7.6 }], ['hoload', 16, 4, 0, { text: 'MEGATON\n中央広場', c: '#ffd27a', y: 8.4, h: 1.6 }], ['bicycle', 31.5, 17, 3, { seed: 2 }], ['bicycle', 31.5, 18.7, 3, { seed: 5 }], ['playset', 5.5, 36.5, 0], ['cutpic', 11, 28, 0, { img: 'mg-xmas-tree', w: 2.2, h: 3.2, x: 1, col: 0.5 }], ['cutpic', 0.6, 20, 1, { img: 'mg-goldfish-scoop', w: 2.2, h: 2.2 }],
      S('区役所', 15, 0.3, 0, { h: 0.5, y: 3.5, c: '#fff2d8' }), S('診療所', 8, 45.7, 2, { h: 0.45, y: 3.3, c: '#c8f0ff' }), S('交番', 31.7, 10, 3, { h: 0.45, y: 3.2, c: '#ff8a7a' }), S('郵便局', 0.3, 6.5, 1, { h: 0.4, y: 3.1 }), S('取引所', 0.3, 42, 1, { h: 0.4, y: 3.4 }), S('学校通り ↓', 23.75, 45.7, 2, { h: 0.4, y: 3.6 }),
      ['facade', 6.75, 0.2, 0, { w: 12.5, yb: 4.6, yt: 10.8 }], ['facade', 25.25, 0.2, 0, { w: 12.5, yb: 4.6, yt: 10.8 }], ['facade', 16, 45.8, 2, { w: 31, yb: 4.6, yt: 10.8 }], ['facade', 0.2, 23, 1, { w: 45, yb: 4.6, yt: 10.8 }], ['facade', 31.8, 23, 3, { w: 45, yb: 4.6, yt: 10.8 }],
      N('市民', 'talk:megacitizen2', 12.5, 19, 0.8, 0x8a3a3a), N('子ども', 'talk:mgkid', 8, 33, 2, 0xd86a8a), N('老人', 'talk:mgres3', 21.5, 37, -2.4, 0x6a6a72), N('楽士', 'talk:megamusician', 19, 41.5, 3, 0x1c1c22), N('学生', 'talk:megastudent', 25, 12, -1, 0x4a6ac8, { cloth: 'mg-cloth-school', bag: 1 })] }));
  // 東口広場 (鋳物町と展望町への分かれ道)
  P(R('gate', '東口広場', 212, 18, 232, 40, 7, { join: 1, floor: M.floor, wall: PAL.svc.wall, ceil: C.ceil, deco: ['frames', 'mgpipes'], lamps: 'panel',
    props: [S('東ゲート ─ EAST GATE', 10, 21.7, 2, { h: 0.7, y: 5.2, c: '#ffd27a' }), S('鋳物町 ↓', 8, 21.7, 2, { h: 0.4, y: 4.2 }), S('展望町 ↑', 16, 0.3, 0, { h: 0.4, y: 3.4 }), ['pennant', 10, 0.22, 0, { n: 4, y: 5.4 }], ['bench', 4, 3, 0, { c: 0x5a6a7a }], ['vending', 19.4, 10, 3], ['pottree', 1.2, 1.2, 0, { s: 1.1 }], ['districtmap', 0.2, 3.5, 1, { w: 2, h: 1.3 }],
      N('警備員', 'talk:mgguard', 11.5, 17, 2.6, 0x2c3a5a, { visor: '#8adfff' }), ['firehose', 19.8, 15, 3], ['exitsign', 0.2, 19, 1, { y: 2.4 }]] }));
  // 錨町の辻・銭湯・見晴らし
  P(R('tsuji', '錨町の辻', 95, -17, 106, -8, 3.6, { join: 1, floor: PAL.old.floor, wall: PAL.old.wall, ceil: PAL.old.ceil, lamps: 'lantern', deco: ['mgpipes'],
    props: [['shrine', 5.5, 2.2, 0], ['bench', 2.2, 7.6, 2, { c: 0x6a5040 }], ['pottree', 9.8, 1.2, 0, { s: 0.9 }], ['plant', 1.2, 1.2, 0, { s: 0.7 }], N('おばあさん', 'talk:mgres3', 8.5, 6.5, 3.2, 0x6a5a7a), ['noticeboard', 9.5, 0.2, 0, { w: 1.2, y: 1.5 }], ['picwall', 7.9, 0.2, 0, { img: 'mg-stone-lantern', w: 1.5, h: 1.5, y: 0.77 }], ['cutpic', 4.2, 3.5, 0, { img: 'mg-kadomatsu', w: 0.7, h: 1.05 }], ['cutpic', 6.8, 3.5, 0, { img: 'mg-kadomatsu', w: 0.7, h: 1.05 }], ['cutpic', 2.4, 0.25, 0, { img: 'mg-festival-lanterns', w: 1.4, h: 1.4, y: 1.2 }], S('錨町の辻', 3, 0.3, 0, { h: 0.3, y: 2.9, c: '#ffe2b8', frame: 1 })] }));
  P(R('bath1', '錨湯 脱衣所', 80, -11.8, 95, -6, 3, { floor: PAL.home.tatami, wall: PAL.home.panel, ceil: PAL.home.ceil, lamps: 'pendant', trims: 'none', ribs: false,
    props: [['locker', 3.2, 5.35, 2, { n: 4 }], ['reception', 2.2, 1.2, 0, { w: 2.2 }], N('番台', 'talk:mgbath', 2.2, 0.6, 0, 0x8a6a2a), ['bench', 11.5, 4.9, 2, { c: 0x6a5040 }], ['fridge', 14.2, 2.4, 3, { w: 0.7 }], ['fan', 12.5, 1.0, 0], ['washbasin', 14.4, 4.2, 3], ['posters', 0.2, 3.4, 1, { w: 1.2, h: 0.8, seed: 1 }]] }));
  P(R('bath2', '錨湯 浴場', 80, -6, 95, 4, 3.4, { floor: [PAL.home.bathf[0], PAL.home.bathf[1], 0.25, 0], wall: PAL.home.batht, ceil: PAL.home.ceil, lamps: 'panel', li: 1.3, trims: 'none', ribs: false,
    props: [['bathmural', 7.5, 9.8, 2, { w: 7, h: 2.6, y: 1.95 }], ['bathpool', 7.5, 7.6, 0, { w: 9, d: 3, use: 'rest', label: '湯船につかる (休む)' }], ['washrow', 0.25, 3.6, 1, { n: 4 }], ['washrow', 14.75, 3.6, 3, { n: 4 }], N('常連さん', 'talk:mgbath2', 12, 3.6, -1.5, 0xe8d0b8)] }));
  D('o2', 'bath1', 87.5, 2.2, 2.4, 'open', { frame: 0x6a5040 }); D('bath1', 'bath2', 87.5, 2.0, 2.3, 'inner', { mat: 'mg-door-bath', r: 1.6, hand: 1 });
  R('o7end', '錨町の見晴らし窓', 94, -64, 100, -60, 2.8, { join: 1, floor: PAL.old.floor, wall: PAL.old.wall, ceil: PAL.old.ceil, lamps: 'bare', win: [['n', 0.6, 5.4, 0.7, 2.4]], props: [['bench', 4.3, 0.75, 0, { c: 0x6a5040 }], N('老人', 'talk:mglook', 1.2, 1.4, 0, 0x5a5a62)] });
  // 中央区: 区役所・図書館・保育園・郵便局・交番・取引所・診療所・駅
  P(R('office', 'メガトン 第 7 区役所', 152, -18, 179, 0, 4.5, { floor: C.floor, wall: C.wall, ceil: C.ceil, lamps: 'square', deco: ['coves'],
    props: [['reception', 5, 1.2, 0, { w: 3.6 }], ['reception', 12, 1.2, 0, { w: 3.6 }], ['reception', 19, 1.2, 0, { w: 3.6, use: 'missions', label: '仕事の依頼 (任務)' }], N('窓口係', 'talk:mgclerk', 5, 0.55, 0, 0x2c5a4e, { cloth: 'mg-cloth-suit' }), N('窓口係', 'talk:mgclerk', 12, 0.55, 0, 0x2c5a4e, { cloth: 'mg-cloth-suit' }), N('依頼係', 'missions', 19, 0.55, 0, 0xc9a22e, { visor: '#ffd27a' }),
      ['seatrow', 8, 8, 0, { n: 6, c: 0x3a6ea8 }], ['seatrow', 8, 10.4, 0, { n: 6, c: 0x3a6ea8 }], ['seatrow', 17, 8, 0, { n: 5, c: 0x3a6ea8 }], ['noticeboard', 0.2, 6, 1, { w: 2, h: 1.2 }], ['posters', 0.2, 11, 1, { w: 1.6, seed: 2 }], ['pottree', 1.2, 16.6, 0], ['pottree', 25.6, 16.6, 0], ['vending', 25.4, 14, 3], ['picwall', 0.2, 14.5, 1, { img: 'mg-aed-wall', w: 1.0, h: 0.75, y: 1.4 }], ['picfurn', 7, 17.58, 2, { img: 'mg-file-shelf', w: 2.0, h: 2.0, d: 0.44, metal: 1 }], ['picfurn', 9.1, 17.58, 2, { img: 'mg-file-shelf', w: 2.0, h: 2.0, d: 0.44, metal: 1 }],
      S('第 7 区役所 ─ 住民課 / 福祉課 / 仕事の依頼', 13.5, 0.3, 0, { h: 0.4, y: 3.3, c: '#fff2d8' }), N('住民', 'talk:mgres', 10, 12, 0, 0x8a6a2a), N('住民', 'talk:mgres3', 18, 9.2, 0, 0x6a4a8a)] }));
  D('plaza', 'office', 165, 2.4, 2.6, 'glass'); D('c1', 'office', -9, 2.0, 2.4, 'glass');
  P(R('library', 'メガトン 第 7 図書館', 158, -38, 179, -20, 4.2, { floor: PAL.big.libF, wall: PAL.home.panel, ceil: C.ceil, lamps: 'pendant', deco: ['coves'],
    props: [['libshelf', 4, 4, 0, { w: 4, dbl: 1 }], ['libshelf', 4, 8, 0, { w: 4, dbl: 1, seed: 3 }], ['libshelf', 4, 12, 0, { w: 4, dbl: 1, seed: 5 }], ['libshelf', 10, 0.4, 0, { w: 6 }], ['libshelf', 17, 0.4, 0, { w: 5, seed: 2 }], ['tablelong', 12, 9, 0, { w: 3.6, wood: 1 }], ['tablelong', 12, 13, 0, { w: 3.6, wood: 1 }],
      ['homedesk', 16, 16.9, 2, { w: 1.6 }], N('司書', 'talk:lib', 16, 17.4, 2, 0x6a4a8a), N('読書する人', 'talk:mgres', 11, 10.2, 2, 0x3a6ea8), ['pottree', 1.2, 16.6, 0], ['floorlamp', 19.6, 14, 0],
      ['picfurn', 20.55, 4, 3, { img: 'mg-card-catalog', w: 1.4, h: 1.3, d: 0.5, c: 0x6a4a30 }], ['picfurn', 20.6, 6.0, 3, { img: 'mg-magazine-rack', w: 1.4, h: 1.5, d: 0.4, c: 0x6a4a30 }], ['picfurn', 20.5, 10.8, 3, { img: 'mg-museum-case', w: 1.4, h: 1.9, d: 0.6, c: 0x5a3a20 }], ['picfurn', 8, 17.6, 2, { img: 'mg-picture-books', w: 1.6, h: 1.3, d: 0.4, c: 0xb08860 }],
      ['picwall', 12, 17.8, 2, { img: 'mg-landscape-painting', w: 1.6, h: 1.1, y: 1.75 }], ['cutpic', 15.4, 16.95, 2, { img: 'mg-globe', w: 0.4, h: 0.5, y: 0.75 }], ['cutpic', 11, 9, 0, { img: 'mg-reading-lamp', w: 0.34, h: 0.42, y: 0.79 }], ['cutpic', 13, 13, 0, { img: 'mg-reading-lamp', w: 0.34, h: 0.42, y: 0.79 }], ['ceilpic', 12, 11, 0, { img: 'mg-skylight', w: 3, d: 3, glow: 0.6 }]] }));
  D('c1', 'library', -29, 2.0, 2.4, 'glass');
  P(R('nursery', 'ほしのこ保育園', 182, -30, 194, -18, 3.2, { rug: [[3.6, 3.6, 5, 5, PAL.park.play, 0xe8c020]], floor: PAL.big.rubberF, wall: PAL.home.pattern, ceil: PAL.home.ceil, lamps: 'square',
    props: [['playset', 6, 7, 0], ['boxes', 10.6, 1, 0, { n: 4, seed: 6 }], ['lowtable', 3, 3, 0, { n: 4, cc: 0xd86a8a }], ['futon', 10.8, 9.5, 3, { c: 0x6aa8d8 }], N('保育士', 'talk:mgnursery', 4.5, 9, 1, 0xd86a8a, { cloth: 'mg-cloth-apron' }), N('子ども', 'talk:mgkid', 3, 5, 2, 0xe8c020, { cloth: 'mg-cloth-check' }), ['posters', 0.2, 9, 1, { w: 1.4, seed: 8 }], ['picwall', 5, 0.2, 0, { img: 'mg-nursery-mural', w: 4.6, h: 2.0, y: 1.15 }], ['picwall', 11.8, 5, 3, { img: 'mg-chalk-wall', w: 3, h: 1.4, y: 1.3 }], ['picfurn', 3, 11.6, 2, { img: 'mg-picture-books', w: 1.6, h: 1.2, d: 0.4, c: 0xb08860 }], ['cutpic', 1.2, 1.2, 0, { img: 'mg-tanabata', w: 1.1, h: 1.7, x: 1, col: 0.3 }], ['cutpic', 8.5, 11.55, 2, { img: 'mg-hina-dolls', w: 1.4, h: 1.25 }]] }));
  D('c1', 'nursery', -24, 1.6, 2.3, 'glass');
  P(R('post', 'メガトン 郵便局', 143, 0, 150, 10, 3.4, { floor: PAL.big.terrazzoF, wall: C.wall, ceil: C.ceil, lamps: 'square', props: [['reception', 2.4, 3.6, 1, { w: 4 }], N('郵便局員', 'talk:mgpost', 1.0, 3.6, 1, 0x2a6ab8), ['picfurn', 0.4, 3.6, 1, { img: 'mg-parcel-shelf', w: 2.0, h: 1.9, d: 0.4, metal: 1 }], ['mailboxes', 3.5, 9.65, 2, { w: 2.4 }], ['seatrow', 5.4, 2, 2, { n: 2 }]] }));
  D('plaza', 'post', 6.5, 1.6, 2.4, 'glass');
  P(R('police', 'メガトン中央交番', 182, 6, 190, 14, 3.2, { floor: C.floor, wall: C.wall, ceil: C.ceil, lamps: 'square', props: [['homedesk', 4.5, 1.1, 0, { w: 1.6 }], N('巡査', 'talk:mgpolice', 4.5, 2.4, 2, 0x2a3a6a, { visor: '#8adfff' }), TM('賞金首の手配書', 'bounty', 7.2, 6.4, -1.2, { c: '#ff8a7a' }), ['noticeboard', 7.8, 3.4, 3, { w: 1.6 }], ['locker', 5, 7.55, 2, { n: 3 }], ['picwall', 0.2, 6.4, 1, { img: 'mg-wanted-board', w: 1.4, h: 1.25, y: 1.6 }]] }));
  D('plaza', 'police', 10, 1.6, 2.4, 'glass');
  P(R('exchange', 'メガトン 中央取引所', 128, 31, 150, 53, 9, { shape: 'round', lamps: 'chandelier', floor: PAL.big.exchF, wall: ['brassdeco', 0xffffff, 0.42, 0.75], rug: [[11, 11, 0, 5, 'carpet', 0x2c4a44]],
    props: [['tradepit', 11, 11, 0, { r: 2.3, use: 'market', label: '中央取引所' }], ['ticker', 11, 11, 0, { r: 3.8, y: 5.6 }], N('仲買人', 'talk:megabroker', 16, 7.4, -1.9, 0x2c5a4e, { visor: '#ffd27a' }), N('相場師', 'market', 5.6, 14, 1.1, 0x8a6a2a), N('投資家', 'talk:megatycoon', 15.4, 16, -2.4, 0x4a4a52, { cloth: 'mg-cloth-suit' }), ['picfurn', 11, 6.2, 2, { img: 'mg-control-screen', w: 1.5, h: 1.3, d: 0.16, glow: 0.8, metal: 1 }], ['picfurn', 11, 15.8, 0, { img: 'mg-control-screen', w: 1.5, h: 1.3, d: 0.16, glow: 0.8, metal: 1 }],
      ['bench', 11, 3.2, 0, { c: 0x2c5a4e }], ['bench', 11, 18.8, 2, { c: 0x2c5a4e }], ['plant', 5, 5, 0, { s: 1.3, dark: 1 }], ['plant', 17, 5, 0, { s: 1.3, dark: 1 }], ['plant', 5, 17, 0, { s: 1.3, dark: 1 }], ['plant', 17, 17, 0, { s: 1.3, dark: 1 }], TM('任務端末', 'missions', 3.2, 11, 1.1)] }));
  D('bv2', 'exchange', 139, 4, 3.6, 'open'); D('plaza', 'exchange', 42, 3, 3.2, 'glass');
  P(R('clinic', 'メガトン第 7 診療所 待合', 152, 46, 164, 62, 3.6, { floor: PAL.clinic, wall: C.wall, ceil: C.ceil, lamps: 'square', deco: ['rail'],
    props: [['reception', 6, 15.1, 2, { w: 3.2 }], N('受付', 'talk:mgnurse', 6, 15.6, 2, 0xe8f0f8, { visor: '#8adfff' }), ['picwall', 6, 15.8, 2, { img: 'mg-clinic-files', w: 2.8, h: 1.75, y: 1.75 }], ['seatrow', 3.4, 6, 1, { n: 5, c: 0x6aa8a0 }], ['seatrow', 8.6, 6, 3, { n: 5, c: 0x6aa8a0 }], ['pottree', 1.2, 1.2, 0], ['vending', 11.4, 2.4, 3, { title: 'WATER', c: '#8adfff' }], ['noticeboard', 0.2, 12, 1, { w: 1.4 }], N('患者', 'talk:mgres3', 3.4, 8.5, 1, 0x6a6a72), ['picwall', 11.8, 11, 3, { img: 'mg-eye-chart', w: 0.7, h: 1.1, y: 1.5 }], ['cutpic', 11.55, 13.6, 3, { img: 'mg-wheelchair', w: 0.75, h: 0.95 }], ['picwall', 0.2, 9, 1, { img: 'mg-aed-wall', w: 1.0, h: 0.75, y: 1.4 }]] }));
  P(R('clinic2', 'メガトン第 7 診療所 処置室', 164, 46, 172, 62, 3.6, { floor: PAL.clinic, wall: C.wall, ceil: C.ceil, lamps: 'panel', li: 1.3,
    props: [['medpod', 2.2, 3.8, 0], ['medpod', 5.6, 3.8, 0, { label: '医療ポッドで治療' }], ['hospbed', 2.0, 11.6, 0, { use: 'heal', label: '診察を受ける (治療)' }], ['hospbed', 5.6, 11.6, 0], N('医師', 'talk:doc', 4, 8, 3, 0xf0f2f4, { visor: '#8adfff' }), ['picfurn', 7.55, 8, 3, { img: 'mg-medicine-cabinet', w: 1.6, h: 1.9, d: 0.45, metal: 1 }], ['firstaid', 7.78, 14.4, 3], ['picwall', 4, 0.2, 0, { img: 'mg-xray-viewer', w: 1.4, h: 1.0, y: 1.7, glow: 0.9 }], ['picwall', 4, 15.8, 2, { img: 'mg-ward-window', w: 1.8, h: 1.7, y: 1.55 }], ['cutpic', 3.2, 12.7, 2, { img: 'mg-iv-stand', w: 0.42, h: 1.7 }], ['cutpic', 6.8, 12.7, 2, { img: 'mg-iv-stand', w: 0.42, h: 1.7 }], ['cutpic', 0.3, 14, 1, { img: 'mg-stretcher', w: 1.9, h: 0.95 }]] }));
  D('plaza', 'clinic', 158, 2.4, 2.4, 'glass'); D('clinic', 'clinic2', 54, 1.6, 2.4, 'slide', { r: 2 }); D('sv1a', 'clinic2', 56, 1.8, 2.4, 'slide', { r: 2 });
  P(R('transit', 'メガトン中央駅', 184, 34, 210, 48, 8, { floor: ['tile', 0xe8e0d0, 0.3, 0.1], wall: PAL.big.stationW, deco: ['coves'], lamps: 'tube', li: 1.2,
    props: [['train', 13, 11.4, 0, { n: 2, skin: 'mg-train' }], ['floorpic', 13, 9.0, 0, { img: 'mg-platform-edge', w: 25.4, d: 1.1, rep: 18 }], ['ticketgate', 13, 3.3, 0, { n: 3 }], ['bench', 4, 7.6, 0, { c: 0x2c5a4e }], ['bench', 22, 7.6, 0, { c: 0x2c5a4e }], ['departures', 6, 0.22, 0, { w: 4.4, y: 3.2 }], ['clock', 20, 0.3, 0, { r: 0.9, y: 5 }],
      S('メガトン中央駅 ─ MEGATON CENTRAL', 13, 0.3, 0, { h: 0.5, y: 5.6 }), ['vending', 25.3, 3, 3], ['vending', 25.3, 4.2, 3, { c: '#ffd27a', title: 'EKIBEN' }], N('駅員', 'talk:megastation', 17, 5, 2, 0x2c5a4e, { visor: '#ffd27a' }), N('通勤客', 'talk:megacitizen', 8, 6.6, 2.4, 0x4a4a52), ['hoload', 13, 6.6, 0, { text: '2 番線 リング線 発車', c: '#ffd27a', y: 5.4, h: 0.6 }]] }));
  D('bv3', 'transit', 197, 4, 3.6, 'glass');
  // 市場ホール・フードコート
  P(R('market', '市場ホール', 110, 38, 126, 62, 6, { floor: PAL.market.floor, wall: PAL.market.wall, ceil: PAL.market.ceil, ceil3: 'truss', truss: 0xc8c4bc, lamps: 'pendant', li: 1.2,
    props: [['stall', 4, 4, 0, { c: 0xb8452e }], ['stall', 12, 4, 0, { c: 0x2e7ab8 }], ['stall', 4, 20, 2, { c: 0x3aa86a }], ['stall', 12, 20, 2, { c: 0xc9a22e }], ['produce', 6, 12, 1, { w: 2.4 }], ['produce', 10, 12, 3, { w: 2.4 }], ['aquarium', 15.2, 12, 3, { w: 2.6 }],
      N('八百屋', 'market', 4, 2.7, 0, 0x3a7a4a), N('魚屋', 'market', 12, 2.7, 0, 0x2a5a8a), N('乾物屋', 'talk:mgshop', 4, 21.3, 2, 0x8a6a2a), N('買い物客', 'talk:mgres', 8, 16, 1, 0xd86a8a, { cloth: 'mg-clothes-flower' }), ['cutpic', 8.55, 16.35, 1, { img: 'mg-shopping-bag', w: 0.42, h: 0.47 }], ['pictop', 15.2, 16, 3, { img: 'mg-fish-ice', w: 2.0, d: 1.0, h: 0.85, metal: 1 }], N('魚屋', 'market', 16.2, 16, 3, 0x2a5a8a, { cloth: 'mg-cloth-apron' }), ['yatai', 8, 23.2, 2, { use: 'market', label: '乾物の屋台' }], ['floorpic', 8, 8, 0, { img: 'mg-drain', w: 0.45, d: 0.45, metal: 0.6 }], ['floorpic', 8, 18, 0, { img: 'mg-drain', w: 0.45, d: 0.45, metal: 0.6 }], S('市場ホール', 0.3, 12, 1, { h: 0.5, y: 4.2, c: '#ffe2b8' })] }));
  D('ms', 'market', 50, 5, 3.6, 'open', { vr: 30 });
  P(R('foodcourt', 'フードコート', 90, 40, 104, 58, 4.5, { floor: PAL.market.floor, wall: M.wall, ceil: C.ceil, lamps: 'pendant', li: 1.2,
    props: [['shopcounter', 3, 0.6, 0, { w: 3.6, dish: 'mg-ramen-bowl' }], ['menuboard', 3, 0.2, 0, { w: 3.4, y: 2.9 }], ['picwall', 8.5, 0.2, 0, { img: 'mg-ramen-kitchen', w: 3, h: 1.9, y: 1.4 }], N('ラーメン屋', 'ramen', 3, 0.3, 0, 0x8a2a20), ['shopcounter', 0.6, 9, 1, { w: 3.2, dish: 'mg-curry' }], ['menuboard', 0.2, 9, 1, { w: 3, y: 2.6 }], N('カレー屋', 'cafe', 0.3, 9, 1, 0xc9a22e, { label: 'カレー屋' }), ['shopcounter', 3, 17.4, 2, { w: 3.6 }], N('定食屋', 'ramen', 3, 17.7, 2, 0x2c5a4e),
      ['table', 8, 4.5, 0, { wood: 1, n: 3, dish: 'mg-ramen-bowl' }], ['table', 10.5, 9, 0, { wood: 1, dish: 'mg-curry' }], ['table', 7, 13, 0, { wood: 1, n: 2, dish: 'mg-coffee-set' }], ['table', 10.5, 15, 0, { wood: 1, n: 3, dish: 'mg-curry' }], N('家族連れ', 'talk:mgres2', 7.2, 9.3, 1, 0xd86a8a), N('作業員', 'talk:mgworker', 9.6, 4.2, 2, 0xc9a22e), ['trashbins', 13.4, 2, 3, { n: 2 }]] }));
  D('ms', 'foodcourt', 49, 4, 3.6, 'open', { vr: 30 });
  // 展望ラウンジ・展望の庭
  P(R('apex', '展望ラウンジ「アペックス」', 214, -60, 240, -45.5, 4.2, { ceil3: 'coffer', cofferC: 0x8a6a2a, lamps: 'chandelier', floor: ['carpet', 0x1e3a36, 1, 0], wall: PAL.big.loungeW, deco: ['coves'], win: [['n', 1, 25, 0.5, 3.6], ['e', 1, 13.5, 0.5, 3.6]], rug: [[8, 5, 10, 6, 'carpet', 0x8a6a2a]],
    props: [['barcounter', 2.6, 7.2, 1, { w: 6, c: '#ffd27a' }], N('バーテンダー', 'bar', 1.75, 7.2, 1, 0x1a3a3a, { visor: '#ffd27a' }), ['piano', 21, 11, 2.5], ['sofa', 12, 3, 0, { c: 0x2c5a4e, w: 3.2 }], ['sofa', 17, 3, 0, { c: 0x2c5a4e, w: 3.2 }], ['table', 14.5, 5.4, 0, { c: '#ffd27a', n: 0 }], ['orrery', 13, 9.6, 0, { use: 'talk:orrery', label: '太陽系儀' }],
      ['telescope', 23.6, 3, 1], ['aquarium', 25.0, 9, 3, { w: 3 }], ['slot', 5.2, 13.6, 2], ['slot', 6.6, 13.6, 2], ['plant', 1.4, 1.4, 0, { s: 1.4, dark: 1 }], N('実業家', 'talk:megatycoon', 16, 7, 1.2, 0x4a4a52), N('楽士', 'talk:megamusician', 19.6, 11.6, 2.6, 0x1c1c22), S('APEX LOUNGE', 0.3, 3, 1, { h: 0.5, y: 3.3, frame: 1 })] }));
  D('vw1b', 'apex', 226, 2.4, 2.6, 'glass');
  P(R('vw2m', '展望の庭', 222, -20, 234, -8, 4.5, { join: 1, jcap: 3, ceil3: 'skyceil', floor: PAL.park.grass, wall: PAL.view.wall, rug: [[5, 0, 2.6, 12, PAL.park.path, 0xd8d0c0]], props: [['tree', 2.6, 2.6, 0], ['tree', 9.4, 9.2, 0, { s: 0.9 }], ['bench', 9.6, 3, 3, { c: 0x6a8a4a, wood: 1 }], ['bench', 2.4, 9, 1, { c: 0x6a8a4a, wood: 1 }], ['pond', 9.4, 3.2, 0, { r: 1.3 }], ['planter', 2.4, 5.6, 1, { w: 2.6, flowers: 1 }]] }));
  // 緑ヶ丘: 公園と光庭
  P(R('park', '緑ヶ丘公園', 118, 96, 146, 122, 7, { join: 1, jcap: 4, ceil3: 'skyceil', floor: PAL.park.grass, wall: G.wall, rug: [[0, 11.5, 28, 3, PAL.park.path, 0xd8d0c0], [12.5, 0, 3, 26, PAL.park.path, 0xd8d0c0], [17.2, 1.4, 5.6, 6.4, PAL.park.play, 0xd86a4a]],
    props: [['pond', 6, 6, 0, { r: 3 }], ['playset', 20, 5, 0], ['tree', 3, 20, 0, { s: 1.2 }], ['tree', 9, 22, 0], ['tree', 24, 21, 0, { s: 1.15 }], ['tree', 21, 17, 0, { s: 0.9 }], ['tree', 3, 2.5, 0], ['tree', 25.5, 10, 0], ['bench', 9, 10.4, 0, { c: 0x6a8a4a, wood: 1 }], ['bench', 18, 10.4, 0, { c: 0x6a8a4a, wood: 1 }], ['bench', 11.4, 19, 1, { c: 0x6a8a4a, wood: 1 }],
      ['streetlamp', 11.6, 9.6, 0], ['streetlamp', 16.4, 15.6, 0], ['planter', 20, 24.8, 0, { w: 6, flowers: 1 }], ['hedge', 6, 10.6, 0, { w: 5 }], ['hedge', 22, 15.4, 0, { w: 5 }], ['hedge', 11.6, 21, 1, { w: 4 }], N('庭師', 'talk:megagardener', 5, 10, 1, 0x3a7a4a, { cloth: 'mg-clothes-work' }), ['pergola', 6.5, 17.6, 0, { w: 4, d: 2.6, h: 2.7 }], ['bench', 6.5, 17.2, 2, { c: 0x6a8a4a, wood: 1 }], ['groundpic', 10.8, 6, 0, { img: 'mg-stepping-stones', w: 3.2, d: 1.1, tile: 1.1 }], ['groundpic', 24, 21, 0, { img: 'mg-leaves', w: 4, d: 4, tile: 2 }],
      ['groundpic', 26.6, 4, 0, { img: 'mg-moss', w: 2.4, d: 2.6, tile: 1.3 }], ['picwall', 27.8, 4, 3, { img: 'mg-stone-lantern', w: 2.6, h: 2.6, y: 1.32 }], ['band', 6, 0.2, 0, { img: 'mg-bamboo-fence', w: 9, h: 1.8, y: 0.9, rep: 0.6 }], ['cutpic', 26.8, 24.9, 2, { img: 'mg-koinobori', w: 2.2, h: 3.2 }], ['floorpic', 23.2, 9.0, 0, { img: 'mg-sandbox', w: 1.8, d: 1.6, y: 0.012 }], ['floorpic', 24, 13, 1, { img: 'mg-hopscotch', w: 1.0, d: 2.2, y: 0.012 }], ['facade', 14, 0.2, 0, { w: 27, yb: 3.7, yt: 6.85 }], ['facade', 14, 25.8, 2, { w: 27, yb: 3.7, yt: 6.85 }], ['facade', 27.8, 13, 3, { w: 25, yb: 3.7, yt: 6.85 }], ['facade', 0.2, 13, 1, { w: 25, yb: 3.7, yt: 6.85 }], N('子ども', 'talk:mgkid', 19, 8.6, 2, 0xe8c020), N('子ども', 'talk:mgkid', 22, 7.4, -2, 0x3a8ae8), N('ご隠居', 'talk:mgres3', 9.4, 11.2, 2, 0x6a6a72, { cloth: 'mg-cloth-knit' }), S('緑ヶ丘公園', 0.3, 13, 1, { h: 0.4, y: 3.4, c: '#bfffc8' })] }));
  P(R('court1', '一号棟・二号棟の光庭', 86, 100, 98, 112, 4, { join: 1, jcap: 3, ceil3: 'skyceil', floor: PAL.park.grass, wall: G.wall, rug: [[4.7, 0, 2.6, 12, PAL.park.path, 0xd8d0c0]], props: [['tree', 2.6, 3, 0], ['tree', 9.4, 8.8, 0, { s: 0.95 }], ['bench', 9.6, 3, 3, { c: 0x6a8a4a, wood: 1 }], ['laundry', 2.4, 9.4, 1, { w: 1.8, seed: 3 }], ['bicycle', 10.6, 6, 1, { seed: 4 }], ['planter', 2.4, 6.2, 1, { w: 2.4, flowers: 1 }]] }));
  P(R('court9', '第 9 区 中庭', 176, 124, 192, 144, 5, { join: 1, jcap: 2.4, ceil3: 'skyceil', floor: PAL.park.grass, wall: PAL.ninth.wall, rug: [[6.7, 0, 2.6, 20, PAL.park.path, 0xd8d0c0], [9.4, 3, 5.2, 4.2, PAL.park.play, 0x4a8ad8]], props: [['tree', 3, 4, 0, { s: 1.1 }], ['tree', 13, 15, 0], ['tree', 3, 16, 0, { s: 0.9 }], ['playset', 12, 5, 3], ['bench', 4.6, 10, 1, { c: 0x6a8a4a, wood: 1 }], ['bench', 11.4, 10, 3, { c: 0x6a8a4a, wood: 1 }], ['pond', 12.6, 17.2, 0, { r: 1.4 }], ['planter', 8, 19.4, 0, { w: 4, flowers: 1 }], N('子ども', 'talk:mgkid', 10, 7, 1, 0x3a8ae8), N('住人', 'talk:mgres2', 5.5, 13, 1.4, 0x8a6a2a)] }));
  // 船員会館・ひかり台集会所
  P(R('seamen', '船員会館', 38, -29, 50, -21, 3.0, { floor: PAL.home.oak, wall: PAL.home.panel, ceil: PAL.home.ceil, lamps: 'pendant', props: [['barcounter', 6, 6.4, 2, { w: 5, c: '#ffd27a' }], N('会館の主人', 'bar', 6, 7.3, 2, 0x2c5a4e, { visor: '#ffd27a' }), ['seatrow', 2.2, 4, 1, { n: 3, c: 0x8a3a3a }], ['noticeboard', 0.2, 1.6, 1, { w: 1.4 }], ['table', 9.2, 3, 0, { wood: 1, n: 3 }], N('老水夫', 'talk:mgsailor', 9.5, 5.4, 2.4, 0x2a3a6a), ['posters', 11.8, 4, 3, { w: 1.2, seed: 5 }]] }));
  D('k3', 'seamen', 44, 2.2, 2.4, 'wood');
  P(R('hall2', 'ひかり台 集会所', 107, 151.6, 120, 160, 3.0, { floor: PAL.home.oak, wall: PAL.ninth.wall, ceil: PAL.home.ceil, lamps: 'panel', props: [['tablelong', 6.5, 4.4, 0, { w: 4, wood: 1 }], ['homekit', 10, 7.9, 2, { w: 2.4 }], ['noticeboard', 12.8, 3, 3, { w: 1.6 }], ['posters', 1.8, 0.2, 0, { w: 1.4, seed: 2 }], N('自治会長', 'talk:mgchair', 4, 5.6, 1, 0x8a6a2a), ['homeshelf', 0.4, 6, 1, { w: 1.2 }]] }));
  D('h3', 'hall2', 112, 2.0, 2.4, 'slide', { r: 2 }); D('h1', 'hall2', 156, 1.6, 2.4, 'slide', { r: 2 });
  // 学校
  P(R('class1', '第 7 学校 1 年教室', 150, 64, 160.5, 74, 3.2, { floor: PAL.big.classF, wall: C.wall, ceil: C.ceil, lamps: 'square', props: [['blackboard', 5.25, 0.2, 0, { w: 4 }], ['schooldesks', 5.25, 5.6, 0, { nx: 4, nz: 3 }], ['homedesk', 8.6, 1.5, 2, { w: 1.2, chair: false }], N('先生', 'talk:mgteacher', 3, 1.4, 0, 0x6a4a8a, { cloth: 'mg-cloth-suit' }), N('生徒', 'talk:megastudent', 4.7, 6.2, 2, 0x4a6ac8, { cloth: 'mg-cloth-school', bag: 1 }), ['picwall', 8.3, 9.8, 2, { img: 'mg-class-board', w: 3.0, h: 1.45, y: 1.75 }]] }));
  P(R('class2', '第 7 学校 2 年教室', 160.5, 64, 171, 74, 3.2, { floor: PAL.big.classF, wall: C.wall, ceil: C.ceil, lamps: 'square', props: [['blackboard', 5.25, 0.2, 0, { w: 4 }], ['schooldesks', 5.25, 5.6, 0, { nx: 4, nz: 3, c: 0xb89870 }], ['posters', 0.2, 5, 1, { w: 1.4, seed: 8 }], N('生徒', 'talk:mgkid', 6.9, 7.4, 2, 0xd86a8a, { cloth: 'mg-cloth-school' }), ['picwall', 8.5, 9.8, 2, { img: 'mg-class-board', w: 3.0, h: 1.45, y: 1.75 }]] }));
  P(R('staff', '第 7 学校 職員室', 150, 77, 158, 85, 3.2, { floor: PAL.home.vwood, wall: PAL.big.corkW, ceil: C.ceil, lamps: 'square', props: [['homedesk', 2, 2, 2, { w: 1.2 }], ['homedesk', 5.6, 2, 2, { w: 1.2 }], ['homedesk', 2, 5.4, 0, { w: 1.2 }], ['picfurn', 7.58, 5, 3, { img: 'mg-file-shelf', w: 1.8, h: 1.9, d: 0.44, metal: 1 }], ['noticeboard', 0.2, 4, 1, { w: 1.6 }], N('教頭先生', 'talk:mgteacher', 5.6, 5.6, 0, 0x4a4a52, { cloth: 'mg-cloth-suit' })] }));
  P(R('class3', '第 7 学校 理科室', 158, 77, 171, 88, 3.2, { floor: PAL.home.vwood, wall: C.wall, ceil: C.ceil, lamps: 'square', props: [['blackboard', 6.5, 10.8, 2, { w: 4 }], ['labbench', 4, 4.6, 0], ['labbench', 9, 4.6, 0], ['glassshelf', 12.6, 5, 3, { w: 2 }], ['microscope', 4, 7.4, 2], N('理科の先生', 'talk:megastudent', 9, 7.6, 2, 0xf0f2f4)] }));
  P(R('gym', '第 7 学校 体育館', 150, 88, 171, 104, 7, { floor: PAL.gym, wall: C.wall, ceil: C.ceil, ceil3: 'truss', truss: 0xe8e4dc, lamps: 'pendant', li: 1.3, props: [['pennant', 10.5, 0.22, 0, { n: 5, y: 5.2 }], ['seatrow', 10.5, 15.2, 2, { n: 8 }], ['boxes', 1.2, 14.8, 0, { n: 4, seed: 4 }], N('体育の先生', 'talk:mgteacher', 12, 8, 2, 0x2a6ab8), N('生徒', 'talk:mgkid', 8, 6, 1, 0xd8402a), N('生徒', 'talk:mgkid', 15, 9, -1, 0x3aa86a), ['picwall', 0.2, 4.5, 1, { img: 'mg-wall-bars', w: 3.2, h: 2.9, y: 1.47 }], ['picwall', 0.2, 8.0, 1, { img: 'mg-wall-bars', w: 3.2, h: 2.9, y: 1.47 }]] }));
  D('sc', 'class1', 155, 1.4, 2.3, 'slide', { r: 2 }); D('sc', 'class2', 166, 1.4, 2.3, 'slide', { r: 2 }); D('sc', 'staff', 154, 1.4, 2.3, 'slide', { r: 2 }); D('sc', 'class3', 164, 1.4, 2.3, 'slide', { r: 2 }); D('sv1b', 'gym', 96, 2.4, 2.6, 'slide');
  // 鋳物町: 工場・社員食堂・空調機械室・炉心
  P(R('forge', '鋳物町 鋳造工場', 222, 48, 256, 76, 12, { floor: PAL.big.forgeF, wall: ['bulk', 0xb8b0a0, 0.8, 0.5], ceil: ['rib', 0x6a6660], ceil3: 'truss', truss: 0xd8a830, ribs: true, trims: 'both', lamps: 'spot', deco: ['ibeam', 'cables'], lamp: '#ffe0b0', li: 1.25,
    props: [['ladle', 10, 8, 0], ['robotarm', 22, 9, 1], ['robotarm', 22, 15, 1, { c: 0x2a6ab8 }], ['conveyor', 25, 13, 1, { l: 14, item: 'ingot' }], ['conveyor', 14, 22, 0, { l: 14, item: 'crate' }], ['gantry', 17, 18, 0, { w: 30, at: 8 }],
      TM('重工ドック (改修)', 'shipyard', 30, 4.6, -0.6, { c: '#ffb060' }), N('鋳造工長', 'talk:megaforge', 28, 10, -1.5, 0xd0a020, { visor: '#ffb060' }), ['workbench', 30, 27.2, 2], ['workbench', 25.6, 27.2, 2], ['toolcart', 28, 18, 0.3, { c: 0xc9a22e }], ['cargo', 31.6, 21, 0, { c: 0xc9a22e }], ['barrel', 2, 24, 0], ['barrel', 2.4, 26, 0],
      ['pipes', 33.5, 4, 3, { c: 0xc9a22e }], ['steam', 6, 14, 0], ['steam', 16, 20, 0], ['alarm', 33.7, 10, 3, { c: '#ffb030' }], ['crate', 31, 25, 0, { n: 5 }], ['rack', 33.3, 16, 3, { n: 3 }], S('鋳物町 鋳造工場', 17, 0.3, 0, { h: 0.8, y: 7.4, c: '#ffb060' }),
      ['capbank', 33.0, 22.6, 3, { n: 4, c: '#ffb060' }], ['warnsign', 0.22, 9, 1, { text: '高温注意\n溶融金属', w: 1.3, h: 0.85, y: 2.4 }], ['wallpanel', 33.78, 6.4, 3, { w: 2, h: 1.4, text: '鋳造 制御盤' }], ['floorhatch', 16, 24, 0], N('工員', 'talk:mgworker', 13, 12, 0.5, 0xc9a22e)] }));
  D('fd1', 'forge', 62, 4.5, 4.4, 'blast', { mat: 'mg-bulkhead' });
  P(R('canteen', '鋳物町 社員食堂', 206, 64, 218, 76, 3.4, { floor: PAL.dorm.floor, wall: C.wall, ceil: C.ceil, lamps: 'tube', li: 1.2, props: [['shopcounter', 6, 1.8, 0, { w: 4 }], ['homekit', 6, 0.52, 0, { w: 3.6, upper: false }], N('食堂のおばちゃん', 'ramen', 6, 1.15, 0, 0xe8e2d4, { cloth: 'mg-cloth-apron' }), ['tablelong', 6, 5, 0, { w: 4.4 }], ['tablelong', 6, 8.6, 0, { w: 4.4 }], N('工員', 'talk:mgworker', 4, 6.2, 2, 0xc9a22e), N('工員', 'talk:mgworker', 8, 7.4, 0, 0x8a6a2a), ['vending', 0.55, 10, 1]] }));
  D('fd1', 'canteen', 70, 2.4, 2.4, 'open', { vr: 20 });
  P(R('mech1', '空調機械室', 223, 86, 243, 104, 5, { floor: PAL.svc.floor, wall: PAL.svc.wall, ceil: PAL.big.ductC, lamps: 'tube', deco: ['mgpipes', 'tray'], props: [['tank', 5, 4, 0, { c: '#8adfff' }], ['tank', 8, 4, 0, { c: '#8adfff' }], ['tank', 11, 4, 0, { c: '#a8f0c8' }], ['valvepanel', 19.8, 9, 3, { w: 2 }], ['breaker', 19.8, 13, 3], ['rack', 15, 16.4, 2, { n: 3 }], ['pipes', 0.5, 14, 1, { c: 0x6a9a7a }], N('設備員', 'talk:mgmech', 10, 10, 2, 0x3a8a6a, { visor: '#8adfff' }), ['fan', 16, 3, 0], ['steeltank', 3.2, 14.6, 0, { r: 1.0, h: 2.6 }], ['picfurn', 7.5, 17.3, 2, { img: 'mg-pump', w: 1.8, h: 1.6, d: 1.0, metal: 1 }], ['picfurn', 11.4, 17.1, 2, { img: 'mg-boiler', w: 2.2, h: 2.4, d: 1.4, metal: 1 }],
      ['band', 8, 0.2, 0, { img: 'mg-big-pipe', w: 12, h: 1.3, y: 3.75, rep: 0.4 }], ['band', 19.8, 4.2, 3, { img: 'mg-cables', w: 5, h: 0.6, y: 4.2, rep: 0.6 }], ['picwall', 19.8, 6.6, 3, { img: 'mg-control-screen', w: 1.3, h: 1.0, y: 1.7, glow: 0.8 }], ['picwall', 0.2, 4, 1, { img: 'mg-emergency-light', w: 0.6, h: 0.37, y: 3.3, glow: 1.2 }]] }));
  D('fd1b', 'mech1', 95, 2.4, 2.8, 'slide');
  P(R('core', 'メガトン炉心 見学デッキ', 216, 130, 260, 174, 24, { shape: 'round', floor: PAL.big.coreF, wall: ['bulk', 0x6a7278, 0.7, 0.6], ceil: ['rib', 0x2c3034], li: 0.75, lamp: '#ffd0a0', trim: '#ffb060',
    props: [['megacore', 22, 22, 0, { use: 'talk:megacore', label: 'メガトン炉' }], N('炉心技師', 'talk:megaeng', 18, 9, 0.5, 0xd0a020, { visor: '#ffb060' }), TM('炉心監視盤', 'talk:corestat', 15.4, 6.4, 0.4, { kind: 'graph', c: '#ffb060' }), TM('電力取引', 'market', 28.6, 6.4, -0.4, { c: '#ffb060' }),
      ['console', 5.2, 16, 0.78, { tall: 1, kind: 'graph', c: '#ffb060' }], ['console', 5.2, 28, 1.22, { tall: 1, kind: 'bars', c: '#ffb060' }], ['console', 38.8, 16, -0.78, { tall: 1, kind: 'radar', c: '#ffb060' }], ['console', 38.8, 28, -1.22, { tall: 1, kind: 'data', c: '#ffb060' }],
      ['tank', 9.4, 36, 0, { c: '#6fe8ff' }], ['tank', 34.6, 36, 0, { c: '#6fe8ff' }], ['alarm', 22, 43.6, 2, { c: '#ffb030', y: 3.4 }], ['steam', 8, 22, 0], ['steam', 36, 22, 0], ['capbank', 22, 40.9, 2, { n: 4, c: '#ffb060' }]] }));
  D('svc2', 'core', 238, 2.6, 2.9, 'blast', { mat: 'mg-bulkhead' });
  // 港町: 倉庫
  P(R('ware1', '港町 第 1 倉庫', 45, 62, 60, 86, 7, { floor: PAL.port.floor, wall: PAL.port.wall, ceil: PAL.port.ceil, ceil3: 'truss', lamps: 'pendant', deco: ['ibeam'], props: [['cargo', 4, 4, 0, { c: 0xc9a22e }], ['cargo', 11, 4, 0, { c: 0x2e7ab8 }], ['cargo', 4, 18, 0, { c: 0xb8452e }], ['crate', 11, 13, 0, { n: 6 }], ['crate', 11, 19, 0, { n: 5 }], ['loaderbot', 8, 10, 1, { l: 6 }], ['boxes', 13.4, 22, 3, { n: 5 }], N('倉庫番', 'talk:mgporter', 3, 7.6, 1, 0xc9a22e)] }));
  P(R('ware2', '港町 第 2 倉庫', 20, 62, 40, 80, 7, { floor: PAL.port.floor, wall: PAL.port.wall, ceil: PAL.port.ceil, ceil3: 'truss', lamps: 'pendant', deco: ['ibeam'], props: [['cargo', 5, 4, 0, { c: 0x3aa86a }], ['cargo', 12, 4, 0, { c: 0xc9a22e }], ['crate', 6, 12, 0, { n: 6 }], ['barrel', 14, 14, 0], ['barrel', 15, 15.4, 0], ['boxes', 3, 16, 0, { n: 4 }], N('荷役', 'talk:mgporter', 15, 9, -1, 0x8a6a2a)] }));
  D('pt1', 'ware1', 74, 3.5, 3.4, 'slide'); D('pt1', 'ware2', 70, 3.5, 3.4, 'slide'); D('hangar', 'pt1', 42.5, 4, 4, 'slide');
  // 扉の位置 (D の 3 番目) は、2 部屋が接する辺に沿った絶対座標 (縦の辺なら z、横の辺なら x)
  return { rooms, doors: doors.map((d) => [d[0], d[1], d[2], d[3], d[4], d[5], d[6]]), publicCount: pub };
}

/** 検証: 部屋の重なり・扉の隣接・つながり (node 用) */
export function validate(bp) {
  const err = [], byId = Object.fromEntries(bp.rooms.map((r) => [r.id, r]));
  for (let i = 0; i < bp.rooms.length; i++) for (let j = i + 1; j < bp.rooms.length; j++) { const a = bp.rooms[i], b = bp.rooms[j]; if (a.x < b.x + b.w - 0.01 && a.x + a.w > b.x + 0.01 && a.z < b.z + b.d - 0.01 && a.z + a.d > b.z + 0.01) err.push(`重なり ${a.id} ${b.id}`); }
  const adj = {}; for (const r of bp.rooms) adj[r.id] = [];
  for (const [a, b, pos, w] of bp.doors) { const A = byId[a], B = byId[b]; if (!A || !B) { err.push(`扉の部屋が無い ${a} ${b}`); continue; } const e = edge(A, B); if (!e) { err.push(`隣接していない扉 ${a} ${b}`); continue; } if (pos - w / 2 < e.lo - 0.01 || pos + w / 2 > e.hi + 0.01) err.push(`扉が辺からはみ出す ${a} ${b} ${pos} ${w} [${e.lo},${e.hi}]`); adj[a].push(b); adj[b].push(a); }
  const seen = new Set(['hangar']), st = ['hangar']; while (st.length) { const x = st.pop(); for (const y of adj[x]) if (!seen.has(y)) { seen.add(y); st.push(y); } }
  for (const r of bp.rooms) if (!seen.has(r.id)) err.push(`つながっていない部屋 ${r.id} ${r.name}`);
  for (const r of bp.rooms) if (r.w < 1.6 || r.d < 1.6) err.push(`小さすぎる部屋 ${r.id} ${r.w}x${r.d}`);
  return err;
}
