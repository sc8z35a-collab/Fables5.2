// 歩行モード (ステーション内・船内・敵艦内・惑星拠点): 一人称操作 / 照明 / 反射床 / 艦内戦闘
import * as THREE from 'three';
import { G, clamp, damp } from '../core/util.js';
import { buildInterior, walkable, roomAt, floorY } from '../world/interior.js';
import { blueprint } from '../world/blueprints.js';
import { makeDrone } from '../world/props.js';
import { buildShip } from '../world/ships.js';
import { Mirror } from '../gfx/renderer.js';
import { Particles, makeGlowSprite } from '../gfx/fx.js';
import { syncDamage } from '../gfx/damage.js';
import { mat, glow, aoMat, activeScreens, dropScreens } from '../gfx/textures.js';
import { ENEMIES, SHIPS, station, body } from '../world/defs.js';
import { stats, save, earn, addCargo, event, remaining, rescueState, disaster, objective } from './state.js';

const _a = new THREE.Vector3(), _b = new THREE.Vector3(), _c = new THREE.Vector3();
export const LOW_HP = '体力が少ない。医療ポッド・休憩・食事で回復しよう。';
const TALK = {
  mech: ['「機体の調子はどうだ？ 格納庫サービスの端末で、3 隻のどれにでも乗り換えられるぜ」', '「ミサイルは撃ったら補給を忘れるな。整備タブでやってやる」'],
  tourist: ['「展望デッキから見る地球は最高よ。あなたも見てきたら？」', '「ゼファーの雲海ラウンジに行くのが夢なの。黄金の環が空いっぱいに広がるんですって」'],
  trader: ['「ここで電子部品を仕入れて、ヴァルカンや天文台で売る。それだけで船が一隻買えるさ」', '「氷晶やマグマ晶は惑星に降りて自分で採るのが一番だ。元手いらずだからな」'],
  dock: ['「ヴァルカンへようこそ。ここの改修は他より 25% 安い。腕は保証する」', '「管制デッキの窓から、建造中の巡洋艦が見える。見ていけ」'],
  ctrl: ['「ヴォイド艦隊はサハル宙域に 4 隻。任務端末に討伐依頼が出ているぞ」'],
  sci: ['「惑星で採れたサンプルは研究ラボへ。解析すれば探査データになります」', '「星系儀アトリウムのホログラムは実際の軌道を映しています。触れると星図が開きますよ」'],
  guard: ['「司令部は通路の先だ。賞金首の情報が欲しければ司令官に聞け」'],
  arm: ['「敵のシールドを剥がしてから船体を削れ。動けなくなったら接舷のチャンスだ」', '「艦内戦では物陰を使え。ドローンの弾は遅い、見てから避けられる」'],
  prisoner: ['「へっ…ヴォイドの本隊はゼファーの環の陰にいる。5 隻だ。お前に落とせるかな」', '「オレたちの艦にはどれも制御コアがある。そいつを握られたら終わりさ」'],
  thug: ['「面倒は起こすなよ。ここじゃ金さえ払えば誰でも客だ」'],
  drunk: ['「うぃ〜…スロットで 7 が三つ揃ったことがあるんだ…ほんとだぞ…」', '「情報屋は闇市の奥だ…手負いの敵艦の場所を売ってくれる…」'],
  dealer: ['「運試しはいかが？ 当店のスロットは星系一の配当率でございます」'],
  miner: ['「外は灼熱だ。溶岩には近づくなよ。マグマ晶は光ってるからすぐ分かる」'],
  colonist: ['「このドームの木は、地球から運んだ苗を三世代かけて育てたものなんです」', '「砂漠香料は外の岩場に自生しています。採ってきたら香料市場へどうぞ」'],
  doc: ['「怪我をしたら医療ポッドへ。艦内戦のあとは必ず検査を受けてくださいね」', '「リングの人工重力は 0.9G。地球育ちには少し軽く感じるでしょう」'],
  design: ['「設計図は芸術だ。ハヤテの翼の曲線は、私が三年かけて描いたんだよ」', '「改修は工作室の端末で。エンジンと装甲、どちらを先に強化するかは腕の見せ所だ」'],
  lib: ['「ここには星系の航海記録がすべて残っています。静かにどうぞ」', '「グラキエスのオーロラは、地磁気ではなく氷床下の結晶が発光源だという説があるのですよ」'],
  staff: ['「ヴォイド艦隊は星ごとに小隊を置いている。脅威度の低い地球宙域から叩くのが定石だ」', '「敵艦を拿捕すれば賞金は二倍。制御コアは必ず艦橋の中央にある」'],
  ice: ['「今夜はオーロラが特に強い。外に出て空を見てごらん」', '「氷晶は青く光る柱だ。天文台のラボに持ち込めば喜ばれるよ」'],
  // ── アトラス救難基地 ──
  atlasmech: ['「ようこそアトラスへ。うちは戦う基地じゃない、助ける基地だ。奥の大格納庫に救助船が 15 機並んでる。見ていけ」', '「ミケーネは 4 基の揚力ファンで、ビルの谷間にも垂直に降りられる。操縦は全部ボット任せさ」'],
  guidebot: ['「アトラス救難基地 ヘ ヨウコソ。ホールノ天球儀ヲ中心ニ、東ガ指令室、西ガ救命救急センター、南ガ ミケーネ格納庫 デス」', '「救助船ハ 最大 15 機マデ 同時ニ出動デキマス。発令ハ 指令室ノ 司令ニ オ申シ付ケクダサイ」'],
  rescuer: ['「出動がかかれば 7 分で発進、15 分でネオン・ベイに降りる。それが俺たちの誇りだ」', '「地球に降りたら、広場に描かれた緑の十字を探してみな。あれが俺たちの緊急着陸帯だ。街じゅうに 15 か所ある」'],
  atlasglobe: ['黄金の腕に支えられた地球のホログラム。軌道の環を回る緑の光点が、待機中の救助船ミケーネだ。出動すると、光点は橙色に変わって都市の上で瞬く。', '神話の巨人アトラスは天球を肩に担いだ。この基地が担いでいるのは、足もとの地球に暮らす人々の命だ。'],
  atlasops: ['「地球の災害は気象・地殻・交通を 24 時間監視しています。警報が出たら、司令が出動機数を決めます」', '「東の窓から地球が見えるでしょう。あの夜側の灯りのひとつひとつに、人が暮らしているんです」'],
  atlasdoc: ['「重傷者は船内の救護室で応急処置をして、ここへ運ぶ。手術台のロボットアームは 0.1 ミリの精度で動くよ」', '「怪我をしているなら医療ポッドへ。遠慮はいらない、ここは誰でも診る」'],
  scan: ['全身スキャナが静かに回っている。寝台に横たわれば、数秒で骨の一本一本まで映し出されるという。'],
  quarter: ['「水、食料、毛布、医薬品。出動のたびにミケーネ 1 機あたり 2 トン積み込むんだ。余ってる物資があれば高く買い取るよ」', '「医薬品はサハル軌道のファイザーが安い。向こうで仕入れてここへ運べば、人助けと商売が両立するぞ」'],
  offduty: ['「非番でも呼び出しはかかる。だから飯は食えるときに食う。あんたも食っていけ」', '「前回は豪雨の浸水だった。屋上に取り残された人を、ホイストで 40 人吊り上げたよ」'],
  atlasbrief: ['「ネオン・ベイには緊急着陸帯が 15 か所。出動機数が多いほど、広い範囲を一度に救える」', '「災害警報が出ているときは、必要な機数を揃えて 1 日以上活動させること。早すぎる帰還では収拾にならない」'],
  baybot: ['「格納庫管制 デス。全機ノ 推進剤・医療資材・避難者用座席ヲ 常時 点検シテイマス」', () => (rescueState().n ? `「現在 ${rescueState().n} 機ガ 地球ニ 出動中。残リノ機体ハ 予備トシテ 待機シテイマス」` : '「全 15 機、発進準備 完了。発令ガ アレバ A 列カラ 順ニ 発進シマス」')],
  baybot2: ['「揚力ファン ノ 軸受ケ、異常ナシ」', '「後部ランプ カラ 機内ニ 入レマス。操縦室ニハ ミケ ト ネア ガ 座ッテイマス」', '「探照灯ノ 光軸調整、完了。夜ノ 街デモ 要救助者ヲ 見逃シマセン」'],
  rescuechief: ['「ミケーネ隊の隊長だ。機体は 15、操縦はボット、だが行くと決めるのは人間だ」', '「機内を見たければ好きな機体のランプから入れ。救護室と避難者キャビン、どれも実戦仕様だ」'],
  // ── 救助船ミケーネ ──
  pilotbot: [() => (G.modes.interior.ctx.from === 'surface' ? '「操縦ボット ミケ デス。現在 ネオン・ベイ ノ 緊急着陸帯ニ 着陸中。揚力ファン ハ 即時再始動 デキル状態デ 待機シテイマス」' : '「操縦ボット ミケ デス。アトラス格納庫デ 待機中。発令カラ 7 分デ 発進シマス」'), '「コノ機体ハ 全長 27 メートル、避難者 16 名ト 重傷者 4 名ヲ 同時ニ 運ベマス」', '「操縦桿ハ 私ガ 握ッテイマス。ドウゾ 安心シテ オ乗リクダサイ」'],
  copilot: [() => `「副操縦ボット ネア デス。現在ノ 出動機数ハ ${rescueState().n} / 15。${disaster() && !disaster().done ? `警報：${disaster().name}` : '災害警報ハ 出テイマセン'}」`, '「航法ト 通信ハ 私ノ 担当デス。着陸帯ノ 緑ノ十字ヲ 見ツケタラ、ミケ ガ 垂直ニ 降ロシマス」', '「頭上ノ スイッチハ 触ラナイデ クダサイネ」'],
  medbot: ['「医療ボット デス。脈拍・血圧・体温、スベテ 正常。……アナタハ 健康デス」', '「止血、点滴、除細動。応急処置ハ 飛行中デモ 可能デス」'],
  loader: ['「荷役ボット。水 400 リットル、食料 300 食、毛布 120 枚。積ミ込ミ 完了」', '「ランプ付近デハ 足元ニ ゴ注意クダサイ」'],
  bot: ['「救難ボット デス。何カ オ困リデスカ」'],
  evacuee: ['「家の一階が水に浸かって…このボットたちが屋上まで迎えに来てくれたんです」', '「アトラスって、空のあの光ですよね。ずっと見守られていたなんて」'],
  evacuee2: ['「子どもたちは先に運んでもらいました。本当に助かりました」'],
  evacuee3: ['「毛布と温かい飲み物をもらった。ロボットなのに、手つきがやさしいんだ」'],
  // ── メガトン ──
  megadock: ['「メガトンへようこそ。全長 3 キロ、人口は百万。迷ったらアトリウムの案内係に聞け」', '「ここの合金と燃料電池は星系一安い。代わりに食料と水はいつも足りない。運んでくれば儲かるぞ」'],
  megaguide: ['「ここはグランド・アトリウム。ガラスの天井の向こうは宇宙でございます。東に取引所と駅とホテル、西に空中庭園と重工区画、突き当たりがメガトン炉でございます」', '「頭上を走っているのは連絡列車です。吹き抜けの端から端まで、およそ 10 秒で結んでおります」'],
  megacitizen: ['「生まれも育ちもメガトンさ。地球？ 行ったことはないけど、空が青いんだって？」', '「炉が止まった日は一度もない。あの音が聞こえないと、かえって眠れないよ」'],
  megacitizen2: ['「庭園の池の鯉、もう三代目なんですよ。ゼファーの環を眺めながら餌をやるのが日課で」', '「アペックスの展望ラウンジには行きました？ 環が窓いっぱいに広がるんです」'],
  megatrader: ['「取引所の電光掲示を見たか。希ガスは今が買いだ…いや、売りか？」', '「ゼファーの雲海で採れた希ガスを、ここが星系じゅうに流している。メガトンは巨大な心臓さ」'],
  megaeng: ['「これがメガトン炉。18 基の超伝導コイルで、1 億度のプラズマを宙に浮かせている。居住筒もリングも、全部この炉の電力で回っているんだ」', '「環の中を流れる光が見えるだろう。あれが止まれば百万人が凍える。だから私たちは交代で、ひと晩じゅう見ている」'],
  megaeng2: ['「重工区画では、船の竜骨になる合金を鋳込んでいる。熱いから近寄りすぎるなよ」'],
  megastudent: ['「工学院の課題で、採光ミラーの角度を計算してるんです。1 枚が 1 キロ以上あるんですよ」'],
  megacore: ['真鍮と銅のコイルに抱かれて、光の環がゆっくりと流れている。足もとの床が、かすかに震えている。', '中心の柱の頂から、ときおり青白い放電がコイルへ走る。星ひとつぶんの熱が、ここに閉じ込められている。'],
  corestat: ['炉心温度 1.02 億 K ／ 閉じ込め時間 定格 ／ 出力 4.8 GW。表示はすべて緑だ。', '冷却材流量 正常。次回の定期点検まで 312 日。'],
  megabroker: ['「いらっしゃいませ。卓の端末でご注文を。メガトンは合金・電子部品・燃料電池が安うございます」'],
  megatycoon: ['「金は巡るものだ。地球の食料をここへ、ここの合金を造船廠へ。君の船倉も、巡りのひとつにすぎんよ」', '「メガトンの株主は星系じゅうにいる。この窓の景色が、その配当というわけだ」'],
  megagardener: ['「この木は種から育てて 40 年。回転重力でも、ちゃんと上へ伸びるんです」', '「池の灯籠は、地球の古い様式を真似たものでね。夜の照明に切り替わると、いちばん綺麗ですよ」'],
  megastation: ['「2 番線はリング線、前部リング行きです。炉心線は点検のため運休しております」'],
  megaforge: ['「取鍋ひとつで 30 トン。注ぎ損ねたら床が抜ける。だからロボットより先に、人間が腹を決めるんだ」', '「船の改修なら、そこの端末で受けるぞ。材料は目の前で鋳込んでる」'],
  megamusician: ['「一曲いかがです？ ピアノはご自由に。ここの客は、環を見ながら聴くのが好きでね」'],
  megahotel: ['「いらっしゃいませ。カプセルは 32 室、灯りが緑の部屋が空いております」'],
  maneki: ['三毛の招き猫が、前足でゆっくり手招きしている。操縦ボット「ミケ」の名は、どうやらこの猫からもらったらしい。', '首の鈴に、小さく「全員無事帰還」と彫ってある。'],
  memorial: ['黒い石板に、数えきれない名前が淡く灯っている。足もとの小さな灯は、基地ができた日から一度も消えていないという。', '銘 ─「彼らが運んだ命は、いまも灯りつづけている」。花輪は今朝、誰かが取り替えたばかりだ。'],
  simpod: ['訓練用のキャビンが、6 本の脚の上でゆっくり揺れている。画面には、煙の上がる街と 15 の着陸帯。', '「横風 18 メートル、視界 300。着陸帯 7 へ進入せよ」─ 無人のキャビンで、訓練シナリオだけが流れ続けている。'],
  orrery: ['真鍮の腕に載った惑星が、それぞれの速さで灯のまわりを巡る。2 番目の青い球がテラ、輪のある 4 番目がゼファー、いちばん外の白い球がグラキエスだ。', '台座の銘 ─「この灯のもとに集う、すべての世界のために」。歯車の音が、かすかに聞こえる。'],
  centrifuge: ['透明な蓋の下で、ローターがうなりを上げては、ゆっくり止まる。赤と青の試料管が、交互に並んでいる。'],
  microscope: ['画面いっぱいに、細胞の断面が映っている。8 万倍。膜のひだの一枚まで数えられそうだ。', '鏡筒の横で、液体窒素の管に白い霜がついている。'],
  bioreactor: ['ガラスの大槽の中で、翼がゆっくり培養液を混ぜている。気泡が昇るたび、緑の光が揺れる。', '表示 ─「BR-1 ／ 37.0 ℃ ／ pH 7.2 ／ 培養 112 時間」。ここで育ったものが、やがて薬になる。'],
  firewatch: [() => { const k = (G.time || 0) % 22, left = Math.ceil(22 - k); return k > 18 ? `「充電中だ。あと ${left} 秒で撃つ。射線の外にいろ」と卓が赤く告げている。` : `主砲の次の試射まで、あと ${left} 秒。加速環の充電は、発射の 4 秒前から始まる。`; }, '卓には、標的の小惑星までの距離 1,142 m と、前回の着弾のずれ 0.4 m が表示されている。'],
  megamodel: ['真鍮とガラスで組まれた、メガトンの 500 分の 1 模型。居住筒がゆっくり回り、3 枚の採光ミラーが小さな光を窓へ落としている。', '銘板 ─「全長 3,300 m ／ 居住筒直径 500 m ／ 人口 1,004,812 名。いま君が立っているのは、この筒の先端だ」'],
  atom: ['真鍮の軌道環が、輝く核のまわりを音もなく回っている。台座の銘板 ─「力は、人を暖めるために」。'],
  // ── ファイザー ──
  fizerquar: ['「ようこそ。ここから先は清浄区画です。除染ゲートで紫外線と薬霧を浴びてからお進みください」', '「靴の裏まで滅菌されますから、ご心配なく」'],
  fizerbot: ['「除染ボット デス。微生物 検出数 0。通過ヲ 許可シマス」'],
  fizerrecept: ['「ファイザーは星系の医薬品のほとんどを作っています。東が創薬ラボ、西が培養ドーム、南が診療室です」', '「中央の像は生命の設計図、二重らせんです。10 塩基でひと回りするのも本物と同じなんですよ」'],
  dna: ['白い二本の鎖が、4 色の塩基対でつながれて、ゆっくりと回っている。下から見上げると、どこまでも続くはしごのようだ。'],
  fizersci: ['「サハルの砂漠香料から、新しい鎮痛成分が見つかったんです。持っていたら高く買い取りますよ」', '「標本槽のクラゲは、グラキエスの氷の下の海で採れたものです。光るのは求愛のためらしい」'],
  fizerpharm: ['「1 分間に 1,200 錠。打錠、検査、包装まで人の手は触れません。医薬品はここで買うのが一番安いですよ」', '「アトラスの救難隊が、いつも大量に持っていきます。災害の多い時期は生産が追いつかなくて」'],
  fizerbotan: ['「紫の光は、薬草がいちばん育つ波長なんです。人間の目には少し落ち着かないけれど」'],
  specimen: ['円筒の水槽の中を、淡く光るクラゲがゆっくりと昇り降りしている。傘が閉じるたび、光が脈打つ。'],
  fizerdoc: ['「手術台へどうぞ。アームが 3 本、麻酔も自動です。傷は残りません」', '「全身スキャナで健康診断もできますよ。宇宙線を浴びる仕事でしょう？」'],
  cryotech: ['「ここで眠っているのは、治療法を待つ患者さんたちです。温度はマイナス 196 度。起こすときは、三日かけてゆっくり温めます」', '「静かにお願いします。…いえ、聞こえはしませんが、気持ちの問題で」'],
  // ── ウェポン ──
  weapondeck: ['「ここは兵器試験場ウェポン。ステーション全体が一門の砲だ。試射の間隔は 20 秒ちょっと。外では絶対に射線へ入るなよ」', '「砲身に沿って飛ぶと、加速環が順に光るのが見える。見物するなら真横からにしろ」'],
  weaponarm: ['「ミサイルならいくらでも持っていけ。試験の余りだ。そこの端末で満載にしてやる」', '「架に立っているのは強化外骨格の試作機だ。動かすには免許がいる。触るなよ」'],
  weaponsgt: ['「標的は左右に動く。正面に来た瞬間に引き金を絞れ。早撃ちより、待てる奴が当てる」', '「中心に当てれば 10 点、輪に当たれば 5 点だ。腕に覚えがあるなら撃っていけ」'],
  weaponcmd: ['「ヴォイド艦隊の動きは、この卓ですべて追っている。賞金首の位置が知りたければ、ホロに触れろ」', '「我々の砲は 1,500 メートル先の標的を外さない。問題は、敵がじっとしていてくれないことだ」'],
  weaponeng: ['「2 本のレールに 600 万アンペア。弾体は 0.1 秒でこの部屋を駆け抜ける。試射したければ、そこの制御卓の赤いボタンだ」', '「撃った直後は砲尾が後座する。警戒線の内側には立つなよ」'],
  weaponoff: ['「砲声が腹に響くだろ。慣れると、あれがないと飯がうまくないんだ」'],
};

export class InteriorMode {
  constructor() {
    const s = (this.scene = new THREE.Scene()); this.camera = new THREE.PerspectiveCamera(72, G.W / G.H, 0.08, 400); s.add(this.camera);
    s.add((this.hemi = new THREE.HemisphereLight(0xffffff, 0x222222, 1)));
    this.pool = []; this._pool();
    this.mirror = new Mirror(G.gfx, 0); this.parts = new Particles(500); s.add(this.parts.obj);
    this.cache = new Map(); this.cur = null; this.pos = new THREE.Vector3(); this.yaw = 0; this.pitch = 0; this.bob = 0; this.far = true;
    this.frameQ = new THREE.Quaternion(); this.farQ = new THREE.Quaternion(); this.camU = new THREE.Vector3(); this.ships = {};
    // 敵弾プール & 自弾トレーサー & 携行ブラスター
    this.shots = []; for (let i = 0; i < 20; i++) { const m = new THREE.Mesh(new THREE.SphereGeometry(0.09, 8, 6), glow('#ff4030', 6)); m.add(makeGlowSprite('#ff4030', 0.7, 1.5)); m.visible = false; s.add(m); this.shots.push({ m, v: new THREE.Vector3(), life: 0, dmg: 0 }); }
    this.tracer = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.012, 1, 5).rotateX(Math.PI / 2), new THREE.MeshBasicMaterial({ color: new THREE.Color(4, 8, 10), transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false })); this.tracer.visible = false; s.add(this.tracer);
    const gm = mat('flat', { color: 0x6a727c, rough: 0.35, metal: 0.9 }), gk = mat('flat', { color: 0x16181c, rough: 0.6, metal: 0.4 }), gun = (this.gun = new THREE.Group()), gp = (g, m, x, y, z) => { const o = new THREE.Mesh(g, m); o.position.set(x, y, z); gun.add(o); return o; };
    gp(new THREE.BoxGeometry(0.05, 0.075, 0.3), gm, 0, 0, 0); gp(new THREE.CylinderGeometry(0.016, 0.02, 0.2, 10).rotateX(Math.PI / 2), gk, 0, 0.012, -0.24); gp(new THREE.BoxGeometry(0.04, 0.13, 0.06), gk, 0, -0.09, 0.09).rotation.x = 0.25;
    gp(new THREE.BoxGeometry(0.056, 0.02, 0.16), gk, 0, 0.046, -0.02); gp(new THREE.BoxGeometry(0.008, 0.012, 0.18), glow('#4df0ff', 2.2), 0.029, 0.01, -0.03); gp(new THREE.BoxGeometry(0.008, 0.012, 0.18), glow('#4df0ff', 2.2), -0.029, 0.01, -0.03);
    gun.position.set(0.2, -0.17, -0.42); gun.visible = false; this.camera.add(gun);
    this.fireT = 0; this.suit = 60; this.lastHurt = -9; this.time = 0;
  }
  ship(id) { if (!this.ships[id]) { const m = buildShip(id); for (const p of m.plumes) p.visible = false; for (const g of m.glows) g.visible = false; if (m.gear) m.gear.visible = true; this.ships[id] = m; } syncDamage(this.ships[id], id); return this.ships[id]; }
  dropShip(id) { const m = this.ships[id]; if (m) { m.obj.parent?.remove(m.obj); delete this.ships[id]; } }

  async enter(o) {
    if (typeof o.at === 'string') o.at = o.at.split(',').map(Number); if (o.type === 'rescue') { o.id = o.from === 'surface' ? 'mycenae-d' : 'mycenae'; if (o.from !== 'surface') o.from = 'station'; }
    this.ctx = o; const id = o.type === 'ship' ? G.p.ship : o.id || o.body, key = o.type + ':' + id;
    if (this.cur) { this.scene.remove(this.cur.group); if (this.cache.get(this.cur.key) !== this.cur) this._dispose(this.cur); } // キャッシュしない室内 (敵艦) は出るときに解放する
    let it = this.cache.get(key);
    if (it) { this.cache.delete(key); this.cache.set(key, it); } // 最近使った順に並べ直す (よく行く室内ほど捨てられにくい LRU。以前は作った順に捨てていた)
    if (!it) {
      const def = o.type === 'enemy' ? ENEMIES.find((e) => e.id === id) : null, bp = blueprint(o.type, id, def);
      it = buildInterior(bp); it.key = key; it.def = def;
      for (const m of it.floorMats) if (!m.userData.mir) { m.userData.mir = 1; this.mirror.apply(m, bp.theme.gloss ?? 0.6); }
      if (bp.drones) for (const [x, z] of bp.drones) { const g = makeDrone(def.glow); it.group.add(g); it.drones.push({ g, x, z, hx: x, hz: z, hp: 34 + def.tier * 16, alive: true, fireT: 1 + Math.random() * 2, ph: x * 3 + z, alert: false }); }
      if (o.type !== 'enemy') { this.cache.set(key, it); if (this.cache.size > 4) { const k = this.cache.keys().next().value, old = this.cache.get(k); this.cache.delete(k); this._dispose(old); } }
    } else if (it.drones.length) for (const d of it.drones) { d.alive = true; d.g.visible = true; }
    this.cur = it; this.scene.add(it.group); activeScreens(it.group); for (const f of it.hooks || []) { try { f(); } catch (err) { console.warn('[内装] hook:', err); } } // 出動状況などを反映
    const th = it.bp.theme; this.hemi.color.set(th.amb[0]); this.hemi.groundColor.set(th.amb[1]); this.hemi.intensity = th.amb[2];
    // 遠景の向き: 船内=実際の機首方向 / ステーション=主窓が惑星を向く
    const sp = G.space; this.far = true; this._sky?.(false);
    if (o.type === 'station') { const st = sp.station(id), b = body(st.def.body); this.camU.copy(st.uni); const v = it.bp.view || [0, -1]; this.frameQ.setFromUnitVectors(_a.set(v[0], 0, v[1]).normalize(), _b.fromArray(b.pos).sub(st.uni).normalize()); }
    else if (o.type === 'enemy') { const e = sp.enemies.find((x) => x.def.id === id); this.enemy = e; this.camU.copy(e.uni); this.frameQ.copy(e.quat); }
    else if (o.type === 'ship' && o.from !== 'surface') { sp.uni(sp.pl.pos, this.camU); this.frameQ.copy(sp.pl.quat); }
    else if (o.type === 'rescue' && o.from !== 'surface') { const st = sp.station('atlas'), b = body('terra'); this.camU.copy(st.uni); const v = it.bp.view || [0, -1]; this.frameQ.setFromUnitVectors(_a.set(v[0], 0, v[1]).normalize(), _b.fromArray(b.pos).sub(st.uni).normalize()); } // 格納庫の発進口の先に地球
    else { this.far = false; this._sky?.(true, o.body || G.modes.surface.bodyId); }
    // 出現位置
    const s = o.at || it.bp.spawn; this.pos.set(s[0], 0, s[1]); this.yaw = s[2] ?? 0; this.pitch = 0;
    if (it.slot && !o.at) this.yaw = Math.atan2(s[0] - it.slot.x, s[1] - it.slot.z);
    if (o.type === 'ship' && o.via === 'airlock') { const ex = it.items.find((i) => i.act === 'exit'); if (ex) { const r = roomAt(it, ex.x, ex.z - 1.6); this.pos.set(ex.x, 0, ex.z - 1.8); this.yaw = 0; if (!r) this.pos.set(s[0], 0, s[1]); } }
    this.pos.y = floorY(it, this.pos.x, this.pos.z); this.lastRoom = null; this._vis(true);
    this._slot();
    // 反射プローブ (初回のみ)
    this._lights(0, true);
    if (!it.env) { const r = G.gfx.renderer, rt = new THREE.WebGLCubeRenderTarget(128, { type: THREE.HalfFloatType }), cc = new THREE.CubeCamera(0.1, 300, rt); cc.position.set(this.pos.x, 1.7, this.pos.z); this.scene.environment = null; this.mirror.u.uMirrorOn.value = 0; r.autoClear = true; cc.update(r, this.scene); r.autoClear = false; r.setRenderTarget(null); it.envRT?.dispose(); it.envRT = G.gfx.pmrem.fromCubemap(rt.texture); it.env = it.envRT.texture; rt.dispose(); }
    this.scene.environment = it.env; this.scene.environmentIntensity = 0.5; G.gfx.look(0.4, 1.15, 0.92);
    this.hostile = !!it.bp.hostile; this.gun.visible = this.hostile; this.suit = 60; for (const sh of this.shots) { sh.life = 0; sh.m.visible = false; }
    this.camera.aspect = G.W / G.H; this.camera.fov = 72; this.camera.updateProjectionMatrix();
    G.hud.setMode('fps'); G.hud.showBar('sh', this.hostile); G.hud.show(true); G.hud.setTarget(null); /* 防護服 (SUIT) が減るのは敵艦の中だけ */ G.gfx.fx.uSun.value.z = 0; G.gfx.fx.uWarp.value = 0; G.gfx.fx.uHeat.value = 0;
    G.input.setButtons([{ id: 'run', label: '走る', cls: 'sm p-run', key: 'ShiftLeft,ShiftRight' }, ...(this.hostile ? [{ id: 'ffire', label: '射撃', cls: 'big p-ffire', key: 'Space' }] : [])], this.hostile ? 'fpsH' : 'fps');
    G.audio?.music(it.bp.music || 'interior'); G.audio?.engine(0, 0, 0);
    if (this.hostile) { G.hud.banner(it.bp.name, '艦橋の制御コアを掌握せよ', 3.5); G.hud.msg('警備ドローンが巡回中。「射撃」で撃破し、通路の奥の艦橋を目指せ。', 'warn', 8); }
    else G.hud.banner(o.type === 'rescue' && o.idx != null ? `${it.bp.name} ${o.idx + 1} 号機` : it.bp.name, it.bp.sub, 2.6);
    if (o.type === 'station' && id === 'atlas') { const dz = disaster(), st = rescueState(); if (dz && !dz.done) G.hud.once('dz', `災害警報：${dz.name}。${st.n >= dz.need ? `ミケーネ ${st.n} 機が対応中。` : `指令室から救助船 ${dz.need} 機を出動させよ。`}`, 'warn', 60, 9); }
    this._cam(0); this._far(0);
  }
  exit() { G.hud.setPrompt(''); G.hud.setCtx([]); G.hud.damage(0); this._sky?.(false); activeScreens(null); }
  onQuality() { this.cache.forEach((it) => { if (it !== this.cur) { it.envRT?.dispose(); it.envRT = null; } it.env = null; }); this._pool(); }
  /** 実ライトの数を画質に合わせる (ロー: 4 灯 / それ以上: 6 灯)。以前は起動時の画質のまま変わらなかった */
  _pool() {
    const n = G.gfx.q.cap <= 1 ? 4 : 6;
    while (this.pool.length < n) { const l = new THREE.PointLight(0xffffff, 0, 24, 2); this.scene.add(l); this.pool.push(l); }
    while (this.pool.length > n) { const l = this.pool.pop(); this.scene.remove(l); l.dispose(); }
  }
  /** 室内一式を GPU から解放する (形状・反射プローブ・端末スクリーン)。自機のモデルと接地影は別の室内でも使うので外してから */
  _dispose(it) {
    if (this.shipObj?.parent === it.group) { it.group.remove(this.shipObj); this.shipObj = null; } if (this.shipShadow?.parent === it.group) it.group.remove(this.shipShadow);
    dropScreens(it.group); it.group.traverse((n) => n.geometry?.dispose()); it.envRT?.dispose(); it.envRT = null; it.env = null;
  }
  /** 惑星上では空ドームを背景に使う */
  /** 地上の建物・着陸中の船内: 窓の外に地表の空を描く。空の球 (半径 9000m) は室内カメラの描画距離 (400m) を超えて切り取られ窓が真っ黒になるので、室内では縮めて使う */
  _sky(on, bodyId) { const sm = G.modes.surface; if (!on) { if (this.skyM) { this.skyM.scale.setScalar(1); this.scene.remove(this.skyM); sm.reclaimSky(this.skyM); this.skyM = null; } return; } const m = sm?.skyMesh?.(bodyId); if (m) { m.scale.setScalar(0.03); this.scene.add(m); this.skyM = m; } }
  /** 格納庫に自機を置く */
  _slot() {
    const it = this.cur; if (this.shipObj) { this.shipObj.parent?.remove(this.shipObj); this.shipObj = null; }
    it.cols = it.cols.filter((c) => !c.ship); it.items = it.items.filter((i) => i.act !== 'ramp');
    if (!it.slot) return; const m = this.ship(G.p.ship), o = m.obj, r0 = SHIPS[G.p.ship].radius;
    // 格納庫に収まる縮尺で置く: ライデン (37m) やアマツ (59m) は多くの格納庫 (奥行き 28〜34m) より長く、そのままでは壁を突き抜けて隣の通路にはみ出していた
    o.scale.setScalar(1); o.rotation.set(0, Math.PI, 0); m.tilt.rotation.set(0, 0, 0); o.position.set(it.slot.x, 0, it.slot.z); o.updateMatrixWorld(true);
    const bb = new THREE.Box3().setFromObject(m.body), rm = roomAt(it, it.slot.x, it.slot.z); let k = 1;
    if (rm) { const pad = 1.5, sx = it.slot.x, sz = it.slot.z, f = (room, ext) => (ext > 1e-3 ? room / ext : 1);
      k = Math.max(0.25, Math.min(1, f(sx - rm.x - pad, sx - bb.min.x), f(rm.x + rm.w - pad - sx, bb.max.x - sx), f(sz - rm.z - pad, sz - bb.min.z), f(rm.z + rm.d - pad - sz, bb.max.z - sz), f(rm.h - 1, bb.max.y - bb.min.y))); }
    o.scale.setScalar(k); o.updateMatrixWorld(true); const r = r0 * k;
    const minY = new THREE.Box3().setFromObject(m.gear || m.body).min.y - o.position.y; o.position.y = -minY;
    it.group.add(o); this.shipObj = o; it.cols.push({ x: it.slot.x, z: it.slot.z, r: Math.min(r * 0.42, 8), ship: 1 });
    if (!this.shipShadow) { this.shipShadow = new THREE.Mesh(new THREE.PlaneGeometry(1, 1).rotateX(-Math.PI / 2), aoMat('blob')); this.shipShadow.renderOrder = 2; }
    this.shipShadow.scale.set(r * 1.5, 1, SHIPS[G.p.ship].len * 1.25 * k); this.shipShadow.position.set(it.slot.x, 0.02, it.slot.z); it.group.add(this.shipShadow);
    it.items.push({ x: it.slot.x, z: it.slot.z, y: 1.5, r: Math.min(r * 0.42, 8) + 4.5, label: `${SHIPS[G.p.ship].name} に乗船する`, act: 'ramp', wide: 1 });
  }
  refreshShip() { if (this.cur?.slot) this._slot(); }

  update(dt) {
    this.time += dt; const it = this.cur, inp = G.input, ax = inp.axes(true), sens = G.p.sens || 1;
    this.yaw -= inp.look.x * 0.0052 * sens; this.pitch = clamp(this.pitch - inp.look.y * 0.0052 * sens, -1.3, 1.3);
    this.yaw += inp.turn() * dt * 2; // キーボード: ← / Q で左、→ で右を向く
    const sp = inp.down('run') ? 7.6 : 4.5, sn = Math.sin(this.yaw), cs = Math.cos(this.yaw);
    const dx = (-sn * ax.y + cs * ax.x) * sp * dt, dz = (-cs * ax.y - sn * ax.x) * sp * dt, p = this.pos;
    if (dx || dz) {
      const fy = floorY(it, p.x, p.z);
      if (walkable(it, p.x + dx, p.z + dz, fy)) { p.x += dx; p.z += dz; } else if (walkable(it, p.x + dx, p.z, fy)) p.x += dx; else if (walkable(it, p.x, p.z + dz, fy)) p.z += dz;
      const pb = this.bob; this.bob += Math.hypot(dx, dz) * 1.9; if (Math.floor(pb / Math.PI) !== Math.floor(this.bob / Math.PI)) G.audio?.sfx('step');
    }
    p.y = damp(p.y, floorY(it, p.x, p.z), 14, dt);
    // 扉
    for (const d of it.doors) { if (d.open) continue; const near = Math.hypot(d.x - p.x, d.z - p.z) < 3.2 || it.drones.some((q) => q.alive && Math.hypot(d.x - q.x, d.z - q.z) < 2.4); if (near !== d.was) { d.was = near; if (Math.hypot(d.x - p.x, d.z - p.z) < 12) G.audio?.sfx('door'); } d.k = damp(d.k, near ? 1 : 0, d.mode === 'y' ? 5 : 9, dt); if (d.mode === 'y') d.panels[0].position.y = d.k * d.dh * 0.97; else { d.panels[0].position.x = -(d.dw / 4 + d.k * d.dw * 0.49); d.panels[1].position.x = d.dw / 4 + d.k * d.dw * 0.49; } }
    this._vis();
    for (const f of it.anim) if (!f.room || f.room.visible) f(dt, this.time); // 閉じた扉の向こう (非表示の部屋) の小道具は動かさない
    for (const n of it.npcs) { const a = Math.atan2(p.x - n.x, p.z - n.z), d = Math.hypot(p.x - n.x, p.z - n.z); let da = (d < 7 ? a : n.yaw) - n.g.rotation.y; da = Math.atan2(Math.sin(da), Math.cos(da)); n.g.rotation.y += da * Math.min(1, dt * 3); n.g.position.y = (n.y || 0) + Math.sin(this.time * 1.6 + n.ph) * 0.012; } // 台の上の人物が床まで沈まないよう足元の高さを保つ
    if (this.hostile) this._combat(dt);
    this._cam(dt); this._lights(dt); this._far(dt); this._interact();
    this.parts.update(dt, G.gfx.ph / (2 * Math.tan(this.camera.fov * Math.PI / 360)));
    // HUD
    const rm = roomAt(it, p.x, p.z); G.hud.setLoc(it.bp.name, rm?.name || '');
    if (this.time - this.lastHurt > 3.5) this.suit = Math.min(60, this.suit + 14 * dt);
    G.hud.bar('sh', this.suit / 60); G.hud.bar('hull', G.p.hp / 100); G.hud.damage(G.p.hp < 35 ? 0.4 : 0); if (G.p.hp < 35 && !this.dead) G.hud.once('lowhp', LOW_HP, 'warn', 45);
    G.gfx.fx.uDamage.value = damp(G.gfx.fx.uDamage.value, this.time - this.lastHurt < 0.2 ? 1 : 0, 10, dt);
    let left = 0; for (const d of it.drones) if (d.alive) left++;
    G.hud.setObj(this.hostile ? `<b>警備ドローン</b> 残り ${left}<br>艦橋の <b>制御コア</b> を掌握せよ` : objective());
    G.hud.begin();
  }
  idle(dt) { this._far(dt); }
  /** 見えない部屋は描かない: 現在の部屋 + 開いている扉の先だけを表示 */
  _vis(all) {
    const it = this.cur, p = this.pos; if (all) { for (const id in it.roomGroups) it.roomGroups[id].visible = true; return; }
    const rm = roomAt(it, p.x, p.z) || this.lastRoom; if (!rm) return; this.lastRoom = rm;
    const vis = this._visSet || (this._visSet = new Set()); vis.clear(); vis.add(rm.id); this._visAdd(rm.id, 0); // 集合は毎フレーム作らず使い回す
    for (const id in it.roomGroups) it.roomGroups[id].visible = vis.has(id);
  }
  /** 扉が開いている (または近い) 隣の部屋を見える部屋に加える。開け放した扉の先は 2 部屋先まで */
  _visAdd(id, depth) {
    const it = this.cur, p = this.pos, vis = this._visSet;
    for (const a of it.adj[id] || []) { const d = a.d; if (vis.has(a.to)) continue; if (d.open || d.k > 0.02 || Math.hypot(d.x - p.x, d.z - p.z) < 9) { vis.add(a.to); if (depth < 2 && (d.open || d.k > 0.5)) this._visAdd(a.to, depth + 1); } }
  }
  _cam(dt) {
    const c = this.camera; c.position.set(this.pos.x, this.pos.y + 1.68 + Math.sin(this.bob * 2) * 0.03, this.pos.z); c.rotation.set(this.pitch, this.yaw, 0, 'YXZ'); c.updateMatrixWorld();
    if (this.gun.visible) { this.gun.position.z = damp(this.gun.position.z, -0.42, 14, dt || 0.016); this.gun.position.y = -0.17 + Math.sin(this.bob * 2) * 0.006; }
  }
  _far(dt) { if (!this.far) { if (this.skyM) this.skyM.position.copy(this.camera.position); return; } this.farQ.copy(this.frameQ).multiply(this.camera.quaternion); G.backdrop.update(this.camU, this.farQ, this.camera.fov, this.camera.aspect, dt, G.gfx.pxScale); }
  /** 近い論理ライトを実ライトのプールへ割り当てる (シェーダ再コンパイルなし) */
  _lights(dt, snap) {
    // 全ライトを毎フレーム並べ替えず、近い順に必要な数 (4〜6 灯) だけを選ぶ
    const L = this.cur.lights, p = this.pos, n = this.pool.length, near = this._near || (this._near = []); near.length = 0;
    for (const l of L) {
      const d = (l.x - p.x) ** 2 + (l.z - p.z) ** 2; l._d = d; if (near.length === n && d >= near[n - 1]._d) continue;
      let i = near.length < n ? near.length : n - 1; while (i > 0 && near[i - 1]._d > d) { near[i] = near[i - 1]; i--; } near[i] = l;
    }
    for (let i = 0; i < n; i++) { const pl = this.pool[i], l = near[i]; if (!l) { pl.intensity = 0; continue; } const d = Math.sqrt(l._d), f = 1 - THREE.MathUtils.smoothstep(d, 18, 34); pl.position.set(l.x, l.y, l.z); pl.color.copy(l.c); pl.distance = l.d * 1.6; pl.intensity = snap ? l.i * f : damp(pl.intensity, l.i * f, 8, dt); }
  }
  _interact() {
    const it = this.cur, p = this.pos, fx = -Math.sin(this.yaw), fz = -Math.cos(this.yaw); let best = null, bs = 1e9;
    for (const i of it.items) { const dx = i.x - p.x, dz = i.z - p.z, d = Math.hypot(dx, dz); if (d > i.r) continue; const dot = d > 0.01 ? (dx * fx + dz * fz) / d : 1; if (dot < (i.wide ? -0.2 : 0.25) && d > 1.3) continue; const sc = d - dot * 1.5; if (sc < bs) { bs = sc; best = i; } }
    this.item = best; G.hud.setCtx(best && !G.ui.isOpen ? [{ label: best.label, cls: best.act === 'core' || best.act === 'exit' || best.act === 'ramp' ? 'alt' : '', fn: () => this.act(best) }] : []);
    if (best && (G.input.key('KeyE') || G.input.key('Enter'))) this.act(best);
  }

  // ───────────────────────── インタラクション ─────────────────────────
  act(i) {
    const c = this.ctx, sid = c.type === 'station' ? c.id : c.type === 'outpost' ? c.body : c.type === 'rescue' ? 'atlas' : 'haven', ui = G.ui, a = i.act;
    if (typeof i.fn === 'function') { try { return i.fn(i); } catch (err) { console.warn('[内装] item.fn:', err); return undefined; } } // 小道具が自前の動作を持つ場合 (試射・射撃など)
    if (a.startsWith('talk:')) { const L = TALK[a.slice(5)] || ['「……」'], q = L[Math.floor(Math.random() * L.length)]; return ui.talk(i.label, typeof q === 'function' ? q() : q); }
    switch (a) {
      case 'shipyard': return ui.shipyard(sid);
      case 'yard': return ui.shipyard(sid, 0.75);
      case 'market': return ui.market(sid, c.type === 'outpost' ? '現地取引所' : c.id === 'rogue' ? '闇市' : '交易市場');
      case 'missions': return ui.missions(sid);
      case 'map': return ui.map();
      case 'bounty': return ui.bounty();
      case 'bar': return ui.bar(sid);
      case 'casino': return ui.casino();
      case 'broker': return ui.broker();
      case 'lab': return ui.lab(c.type === 'station' ? sid : 'aurora');
      case 'status': return ui.status();
      case 'rest': return ui.rest();
      case 'cafe': return meal('バリスタ', '「地球産の豆を使ったコーヒーはいかがですか？ ひと息つけば、航海日誌も記録しておきますよ」', 'コーヒーで一服', 40, '香り高い一杯で体力が全快した。記録完了。', 'また今度');
      case 'ramen': return meal('ラーメン屋の店主', '「へいらっしゃい！ ネオン・ベイ名物、星屑トンコツだよ！」', '一杯たのむ', 60, '五臓六腑に染みわたる…体力全快・記録完了。', 'やめておく');
      case 'heal': G.p.hp = 100; this.suit = 60; G.audio?.sfx('reward'); return G.hud.msg('医療ポッドで治療した。体力全快。', 'good');
      case 'vend': if (G.p.credits < 20) return G.audio?.sfx('deny'); G.p.credits -= 20; G.p.hp = Math.min(100, G.p.hp + 30); G.audio?.sfx('buy'); return G.hud.msg('エナジードリンクを飲んだ。体力 +30', 'good');
      case 'ammo': return rearm((f) => `艦内備蓄からミサイルを補給した (${f} 発)`);
      case 'harvest': { if (G.p.flags.harvest === G.p.day) return G.hud.msg('今日はもう収穫済み。作物が育つまで待とう。'); const n = addCargo('food', 3); if (!n) return G.hud.msg('貨物室に空きがありません', 'warn'); G.p.flags.harvest = G.p.day; G.audio?.sfx('pickup'); return G.hud.msg(`新鮮な野菜を収穫した。食料 ×${n} を貨物室へ。${n < 3 ? '（貨物室がいっぱいで残りは積めなかった）' : ''}`, 'good'); }
      case 'scope': return ui.talk('大望遠鏡', `深宇宙の闇に、星系の姿が浮かび上がる。<br>ヴォイド艦隊の残存は <b>${remaining()} 隻</b>。${['地球の雲がゆっくりと渦を巻いている。', 'ゼファーの環が陽光を受けて黄金に輝いている。', 'イグニスの夜側で、溶岩の河が赤く脈打っている。', 'グラキエスの極に、青緑のオーロラが揺れている。'][Math.floor(Math.random() * 4)]}`);
      case 'arcade': return ui.talk('アーケード筐体', ['ハイスコア 999,990 — 「AAA」。どうやっても抜けそうにない。', '画面の中でも宇宙船が戦っている。現実とあまり変わらないな。', '1 クレジット入れてみたが、3 秒で撃墜された。'][Math.floor(Math.random() * 3)]);
      case 'piano': G.audio?.sfx('reward'); return G.hud.msg(['静かな旋律がラウンジに響いた。', '思いつくままに鍵盤を叩く。悪くない。', '船の振動と不思議に調和する和音だ。'][Math.floor(Math.random() * 3)], 'good');
      case 'pilot': return this.toPilot();
      case 'exit': return this.exitDoor();
      case 'ramp': return ui.talk(SHIPS[G.p.ship].name, `${SHIPS[G.p.ship].cls}「${SHIPS[G.p.ship].name}」。いつでも発進できる。`, [{ label: '船内に入る', fn: () => G.go('interior', { type: 'ship', from: 'station', station: c.id, via: 'airlock' }) }, { label: '発進する', cls: 'gold', fn: () => G.go('space', { undock: c.id }) }, { label: 'やめる' }]);
      case 'core': return this.hack();
      case 'rescue': return ui.rescue();
      case 'water': G.p.hp = Math.min(100, G.p.hp + 10); G.audio?.sfx('pickup'); return G.hud.msg('冷たい水を一杯飲んだ。体力 +10', 'good');
      case 'mycenae': return ui.talk(`救助船 ミケーネ ${i.idx + 1} 号機`, '後部ランプが下りている。機内では救難ボットが発進に備えて待機している。', [{ label: '機内に入る', cls: 'gold', fn: () => G.go('interior', { type: 'rescue', from: 'station', idx: i.idx, back: [i.x, i.z, Math.PI] }) }, { label: 'やめる' }]);
      case 'rearm': return rearm((f) => `兵装庫の試験弾でミサイルを満載にした (${f} 発)。代金は不要だ。`);
      case 'checkup': G.p.hp = 100; this.suit = 60; G.audio?.sfx('reward'); return ui.talk('全身スキャナ', `走査完了。骨格・循環器・神経、すべて異常なし。体力が全快した。<br>被曝線量：年間許容値の ${12 + (G.p.day * 7) % 30}%　／　撃沈 ${G.p.stats.kills} ・拿捕 ${G.p.stats.captures} の戦歴にしては、驚くほど健康だ。`);
      case 'loot': { const k = 'l' + i.id; if (G.p.flags[k]) return G.hud.msg('ここはもう空っぽだ。'); G.p.flags[k] = 1; const cr = 900 + this.cur.def.tier * 500; earn(cr); const n = addCargo('salvage', 2); G.audio?.sfx('reward'); return G.hud.msg(`貨物を略奪した：${cr.toLocaleString('ja-JP')} Cr${n ? `／回収部品 ×${n}` : ''}`, 'good'); }
      default: return G.hud.msg('（反応がない）');
    }
  }
  toPilot() {
    const c = this.ctx;
    if (c.from === 'station') return G.go('space', { docked: c.station });
    if (c.from === 'surface') return G.go('surface', { resume: true, body: c.body });
    return G.go('space', { resume: true });
  }
  exitDoor() {
    const c = this.ctx, sp = G.space;
    if (c.type === 'rescue') return c.from === 'surface' ? G.go('surface', { resume: true, foot: true, at: c.back, body: 'terra' }) : G.go('interior', { type: 'station', id: 'atlas', at: c.back });
    if (c.type === 'enemy') return G.go('space', { resume: true });
    if (c.type === 'outpost') return G.go('surface', { resume: true, foot: true, door: true, body: c.body });
    if (c.from === 'station') return G.go('interior', { type: 'station', id: c.station });
    if (c.from === 'surface') return G.go('surface', { resume: true, foot: true, body: c.body });
    const d = sp.pl.docked;
    if (!d) return G.hud.msg('宇宙空間ではエアロックを開けられません。ステーションにドッキングするか、惑星に着陸してください。', 'warn');
    return G.go('interior', d.kind === 'station' ? { type: 'station', id: d.def.id } : { type: 'enemy', id: d.def.id });
  }
  hack() {
    const it = this.cur, e = this.enemy; if (G.p.done[e.def.id] || e.fate) return G.hud.msg('制御コアは既に掌握済みだ。まもなく自船へ戻る。'); // 退艦までの間に二重に報酬を得られないように
    if (it.drones.some((d) => d.alive && Math.hypot(d.x - this.pos.x, d.z - this.pos.z) < 16)) return G.hud.msg('警備ドローンが近くにいる。先に排除せよ。', 'warn');
    G.ui.hack(e, (kind, reward) => {
      if (G.p.done[e.def.id] || e.fate) return;
      earn(reward); G.p.done[e.def.id] = kind === 'capture' ? 'captured' : 'destroyed'; e.fate = kind;
      if (kind === 'capture') { G.p.stats.captures++; event('capture'); } else { G.p.stats.kills++; addCargo('salvage', 2 + e.def.tier); addCargo('contra', 1); event('kill'); }
      save(); G.audio?.sfx('reward'); G.hud.banner(kind === 'capture' ? '拿捕成功' : '略奪完了', `${e.def.name}　+${reward.toLocaleString('ja-JP')} Cr`, 4);
      setTimeout(() => G.go('space', { resume: true }).then(() => G.space.afterBoard(e)), 1800);
    });
  }

  // ───────────────────────── 艦内戦闘 ─────────────────────────
  /** (x,z) が歩行範囲の中か。矩形 [x0,z0,x1,z1] と円形の部屋 [cx,cz,r,'c'] の両方を扱う (pad = 外側の余白) */
  inWalk(x, z, pad = 0) {
    for (const w of this.cur.walk) {
      if (w[3] === 'c') { const r = w[2] + pad; if ((x - w[0]) ** 2 + (z - w[1]) ** 2 <= r * r) return true; }
      else if (x >= w[0] - pad && x <= w[2] + pad && z >= w[1] - pad && z <= w[3] + pad) return true;
    }
    return false;
  }
  rayClear(x0, z0, x1, z1) { const d = Math.hypot(x1 - x0, z1 - z0), n = Math.ceil(d / 0.5); for (let i = 1; i < n; i++) { const t = i / n; if (!this.inWalk(x0 + (x1 - x0) * t, z0 + (z1 - z0) * t, 0.4)) return false; } return true; }
  hurt(dmg) {
    this.lastHurt = this.time; G.audio?.sfx('hurt'); if (this.suit > 0) { this.suit -= dmg; if (this.suit < 0) { G.p.hp += this.suit; this.suit = 0; } } else G.p.hp -= dmg;
    if (G.p.hp <= 0 && !this.dead) { this.dead = true; G.p.hp = 60; G.hud.banner('戦闘不能', '自船へ緊急転送…', 3); G.go('space', { resume: true }).then(() => { this.dead = false; G.hud.msg('艦内戦に敗れ、自船へ退却した。態勢を整えて再突入しよう。', 'warn', 8); }); }
  }
  _combat(dt) {
    const it = this.cur, p = this.pos, cam = this.camera, tier = it.def.tier;
    for (const d of it.drones) {
      if (!d.alive) continue; const dx = p.x - d.x, dz = p.z - d.z, dist = Math.hypot(dx, dz);
      if (!d.alert && dist < 15 && this.rayClear(d.x, d.z, p.x, p.z)) { d.alert = true; G.audio?.sfx('lock'); }
      let mx = 0, mz = 0;
      if (d.alert) {
        const want = 5.5, k = dist > want + 1 ? 1 : dist < want - 1 ? -1 : 0, st = Math.sin(this.time * 1.3 + d.ph) > 0 ? 1 : -1;
        mx = (dx / dist) * k * 2.6 + (-dz / dist) * st * 1.5; mz = (dz / dist) * k * 2.6 + (dx / dist) * st * 1.5;
        d.g.rotation.y = Math.atan2(dx, dz); d.fireT -= dt;
        if (d.fireT <= 0 && dist < 18 && this.rayClear(d.x, d.z, p.x, p.z)) {
          d.fireT = 1.5 - tier * 0.22 + Math.random() * 0.5; const s = this.shots.find((q) => q.life <= 0);
          if (s) { s.m.position.set(d.x, d.g.position.y, d.z); s.v.set(dx + (Math.random() - 0.5) * 1.2, 1.25 - d.g.position.y + (Math.random() - 0.5) * 0.5, dz + (Math.random() - 0.5) * 1.2).normalize().multiplyScalar(13 + tier * 2); s.life = 3; s.dmg = 7 + tier * 3; s.m.visible = true; G.audio?.sfx('elaser', clamp(1 - dist / 20, 0.2, 1)); }
        }
        if (dist > 30) d.alert = false;
      } else { const hx = d.hx + Math.cos(this.time * 0.4 + d.ph) * 1.5 - d.x, hz = d.hz + Math.sin(this.time * 0.4 + d.ph) * 1.5 - d.z; mx = hx; mz = hz; d.g.rotation.y += dt * 0.6; }
      const nx = d.x + mx * dt, nz = d.z + mz * dt; if (walkable(it, nx, nz)) { d.x = nx; d.z = nz; } else if (walkable(it, nx, d.z)) d.x = nx; else if (walkable(it, d.x, nz)) d.z = nz;
      d.g.position.set(d.x, 1.45 + Math.sin(this.time * 2 + d.ph) * 0.14, d.z);
    }
    for (const s of this.shots) {
      if (s.life <= 0) continue; s.life -= dt; const m = s.m.position; m.addScaledVector(s.v, dt);
      const hit = Math.hypot(m.x - p.x, m.z - p.z) < 0.5 && m.y > 0.2 && m.y < 1.9;
      const wall = !this.inWalk(m.x, m.z, 0.3);
      if (hit) this.hurt(s.dmg);
      if (hit || wall || s.life <= 0 || m.y < 0.05) { s.life = 0; s.m.visible = false; if (!hit) this.parts.burst(m, 8, 3, _col.set('#ff7040'), 0.12, 0.3, null, 2); } // 自分への命中はカメラの中で火花が弾けるので出さない (被弾表示は画面の赤みで行う)
    }
    // 自分の射撃
    this.fireT -= dt; this.tracer.visible = this.tracer.visible && this.fireT > 0.14;
    if (G.input.down('ffire') && this.fireT <= 0) {
      this.fireT = 0.19; G.audio?.sfx('blaster'); this.gun.position.z = -0.36;
      const dir = _a.set(0, 0, -1).applyQuaternion(cam.quaternion), o = cam.position; let best = null, bt = 60;
      for (const d of it.drones) { if (!d.alive) continue; const to = _b.copy(d.g.position).sub(o), t = to.dot(dir); if (t < 0.3 || t > bt) continue; const off = Math.sqrt(Math.max(0, to.lengthSq() - t * t)); if (off < 0.5 + t * 0.045 && this.rayClear(o.x, o.z, d.x, d.z)) { best = d; bt = t; } }
      let end; if (best) end = _c.copy(best.g.position); else { let t = 0.6; while (t < 40) { const x = o.x + dir.x * t, z = o.z + dir.z * t, y = o.y + dir.y * t; const ok = y > 0 && y < 16 && this.inWalk(x, z, 0.4); if (!ok) break; t += 0.5; } end = _c.copy(o).addScaledVector(dir, t); }
      const muz = _b.set(0.2, -0.16, -0.78).applyMatrix4(cam.matrixWorld), len = muz.distanceTo(end); this.tracer.position.copy(muz).lerp(end, 0.5); this.tracer.scale.set(1, 1, len); this.tracer.lookAt(end); this.tracer.visible = true;
      this.parts.burst(end, 10, 4, _col.set('#8fe8ff'), 0.14, 0.35, null, 2);
      if (best) { best.hp -= 15; best.alert = true; if (best.hp <= 0) { best.alive = false; best.g.visible = false; this.parts.burst(best.g.position, 60, 7, _col.set('#ffb060'), 0.35, 0.8, null, 1.5); this.parts.burst(best.g.position, 20, 2, _col.set('#ffffff'), 0.7, 0.3); G.audio?.sfx('boom', 0.5); earn(150); G.hud.msg('警備ドローン撃破 +150 Cr', 'good', 3); } }
    }
  }
  render(dt) {
    this.mirror.render(this.scene, this.camera);
    G.gfx.render(dt, this.scene, this.camera, this.far ? G.backdrop : null);
  }
}
const _col = new THREE.Color();
/** 飲食店: 代金を払うと体力全快 + 1 日進めて保存 (カフェ・ラーメン屋で共通) */
function meal(who, line, label, cost, done, no) {
  return G.ui.talk(who, line, [{ label: `${label} (${cost} Cr)`, fn: () => { if (G.p.credits < cost) return G.audio?.sfx('deny'); G.p.credits -= cost; G.p.hp = 100; G.p.day++; save(); G.audio?.sfx('reward'); G.hud.msg(done, 'good'); } }, { label: no }]);
}
/** ミサイルを満載にする (艦内備蓄・兵装庫で共通)。text(f) は補給後のメッセージ */
function rearm(text) {
  const p = G.space.pl, f = stats().missiles; if (p.missiles >= f) return G.hud.msg('ミサイルは満載です。');
  p.missiles = f; G.audio?.sfx('buy'); return G.hud.msg(text(f), 'good');
}
