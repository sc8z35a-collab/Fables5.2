---
name: gpt-image-textures
description: Generate game textures for STARFABLE with OpenAI gpt-image-2.5-sunburst — one 1:1 image at the largest allowed size (2880x2880), quality "medium", laid out as a 3x3 grid that is cut into 9 seamless textures (color + normal + roughness, plant cut-outs, emissive windows) and packed as assets/textures/packs/ai-*.zip, which override the game's existing images of the same name. Use when the user asks to generate, regenerate, add or replace textures/テクスチャ with GPT Image / gpt-image / サンバースト, or to finish the texture sheets that are still missing.
---

# gpt-image-textures — 1 枚の画像から 9 枚のテクスチャ

`gpt-image-2.5-sunburst` に **1:1・最大サイズ (2880×2880)・quality=medium** で 3×3 のテクスチャシートを描かせ、
1 枚あたり 9 枚のゲーム用テクスチャに切り分けて、ゲームの画像パックとして組み込む。

- 3840×3840 は「画素数の上限 (= 3840×2160 と同じ約 829 万画素)」を超えるので通らない。1:1 で通る最大は 2880×2880 (1 マス 960px)
- 1 枚の生成は 30 秒前後。料金は OpenAI の請求画面で確認すること (`usage` は `assets/textures/sheets/<id>.json` に残る)

## 前提

- Python 3.9+ と `numpy`, `Pillow` (`pip install numpy pillow`)
- API キーは **環境変数 `OPENAI_API_KEY`** か `--key-file <ファイル>` で渡す。キーをリポジトリ内のファイル・コミット・チャットに書かない
- OpenAI のアカウントにクレジットが必要 (切れていると `credit_balance_exhausted` で止まる。再試行はしない)

## 手順 (リポジトリのルートで実行)

```bash
S=.claude/skills/gpt-image-textures
python3 $S/scripts/texgen.py prompt   $S/sheets/s2_interior.json   # 送るプロンプトの確認 (無料)
python3 $S/scripts/texgen.py generate $S/sheets/s2_interior.json   # 1 枚生成 (有料)。シートを省くと、まだ無いシートを全部
python3 $S/scripts/texgen.py process --preview /tmp/check          # 切り分け → パック → texture-packs-ai.js
```

- 自分で作った 3×3 の画像を使うときは `assets/textures/sheets/<id>.webp` に置いてシート JSON を書けば、`generate` は飛ばされて `process` で切り分けられる (大きさは自由)
- `generate` は、そのシートの画像 (`.cache/<id>.png` か `assets/textures/sheets/<id>.webp`) があれば API を呼ばない。作り直すときは `--force`
- `process` は画像のあるシートを毎回すべて作り直す (植物はシート 3 と 4 にまたがるため)
- 生成後は `.cache/<id>.png` かプレビュー `<id>_check.jpg` (タイルは 2×2 に並べて継ぎ目を確認できる) を目で見て、マスがずれていないか・背景が指定どおりかを確かめてからコミットする

## 何が作られるか

ゲームの画像はすべて `assets/textures/packs/*.zip` (無圧縮 ZIP の中に WebP) にあり、`src/gfx/materials.js` がパック名と画像名の表 (`src/gfx/texture-packs.js`) で引く。
このスキルは `ai-<シート id>.zip` を作り、表 `src/gfx/texture-packs-ai.js` を書き直す。materials.js は AI の表を後から登録するので、**同じ名前の既存画像が置き換わる** (コードの変更は要らない)。

| 種類 (`kind`) | 処理 | パックの中の名前 |
|---|---|---|
| `tile` | マスの外周 2.5% を捨てる → 撮影時の明暗むらを除去 → 重なり 192px を最小誤差の境界でつないで**継ぎ目なし**に → 彩度 (`sat`) と平均色 (`mean`) を既存画像に合わせる → 高さから法線・粗さ。色と法線は 512px、粗さは 256px | `materials/<name>/color.webp` `normal.webp` `roughness.webp`。`also` があればその名前にも法線を書く (水 → `environment/water-ripples`) |
| `emissive` | 黒背景の発光パターン | `path` (ステーションの窓 = `effects/windows`) |
| `cutout` + `role: side/top` | マゼンタ (#FF00FF) 背景を抜いてアルファ化し、植物アトラス (左=側面・右=真上, 1024×512) にする。`top` のマスが無い植物は、側面を回転配置 (`rosette`) か散布 (`scatter`) して真上の姿を作る | `vegetation/<plant>.webp` |
| `cutout` + `role: leaf` | 葉の房 (室内の植木) | `path` (`vegetation/interior`) |
| `image` | 1 枚の画像 (惑星の地図・雲・星雲・環・太陽・森の樹冠)。`seam` で継ぎ目処理の向き (`xy` / 経度方向だけの `x` / なし)、`ov` で重なり幅、`size` で解像度 | `path` (`celestial/earth` など) |

## シート定義 (`sheets/*.json`)

1 シート = 9 マス。マスは左上から右へ、行ごとに並ぶ。

```json
{"name": "hull", "kind": "tile", "prompt": "Spaceship outer hull: ...", "mean": [163, 164, 168], "rough": 125, "sat": 0.15, "normal": 4.5}
```

- `name` … ゲームの素材名 (`materials/<name>`)。既存と同じ名前にすると置き換え、新しい名前にするとパックに追加される
- `mean` … 仕上がりの平均色 (0–255)。置き換えでは**既存画像の平均に合わせる** (ゲーム側の `color` 指定がそのまま使える)
- `rough` … 粗さ画像の平均 (0–255)。`sat` … 彩度 (0 = 灰色)。`normal` … 法線の強さ。`hp` … 凹凸として拾う細かさ (px)

| シート | 中身 |
|---|---|
| `s1_metal` | hull, wall, plate, grate, hex, rib, ceil, bulk, smooth |
| `s2_interior` | tile, carpet, wood, concrete, padded, brick, plaster, shoji, marble |
| `s3_nature` | rock, grass, water, solar, 窓, 樹冠 (oak / jungle / pine / palm を真上から) |
| `s4_plants` | 植物 8 種の側面 (oak, jungle, bush, pine, palm, wheat, corn, fern), 葉の房 |
| `s5_terrain` | basalt, snow-crust, glacial-ice, sandstone, ripple-sand, regolith, moss-granite, wet-mud, gravel |
| `s6_urban` | wet-asphalt, cracked-asphalt, board-concrete, granite-pavers, glazed-brick, zinc-roof, technical-canvas, walnut, medical-vinyl |
| `s7_space` | lab, hazard, blasted-steel, welded-steel, armor, carbon-fiber, oxidized-hull, ablative, anodized-aluminum |
| `s8_materials` | deco, terrazzo, tread, brassdeco, quilt, titanium, verdigris, stainless, epoxy |
| `s9_materials` | rubber-chips, perforated, felt, polycarbonate, stucco, facade, corten, leather, ceramic-cloth |
| `s10_mixed` | cork, porcelain, laminate, 地球の森の樹冠 (`environment/foliage`), メガトンの街明かり (`effects/city-lights`), 低木・とうもろこし・シダ・麦の真上の姿 |
| `s11_space` | 惑星 (earth, desert, ice, lava, gas), 雲, 星雲, 環, 太陽 (`celestial/*`) |
| `s12_obj_basic` 〜 `s17_obj_gear` | **物の質感 54 種** (新規)。白/黒の樹脂、塗装、金属、布、家具、機械、地球の乗り物・建物、ロボット、断熱材、テントなど。使っている場所は下の表 |
| `s18_effects` 〜 `s22_ground` | ユーザーが別に生成した 1254×1254 の画像。使わないマスは `"skip": true` と理由 (`why`) を書いてある。`image` で `mean` を省くと明るさを変えない。発光マップは `emissiveImg(path, 単色の設定, 画像があるときの設定)` (`textures.js`) で付ける |
| `s23_stations` 〜 `s27_farm` | ユーザーが別に生成した画像 (45 マスすべて使用)。扉・敷物・着陸パッドのように面に 1 枚の絵として貼るものは `"seam": ""` で継ぎ目処理をせず、コード側で元の UV (Builder の `uvs` = 0) のまま貼る |
| `s33_mg_streets` 〜 `s43_mg_public` | **メガトン船内の改修用 99 枚** (ユーザーが別に生成した画像、すべて使用)。1 枚の絵のマスは `crop: [左, 上, 右, 下]` (マスに対する割合) で白い背景などの余白を切り落としてから縮小する。名前はすべて `mg-` で始まり、`src/world/megaton.js` (床・壁・天井・扉)、`props7.js` (家具・家電・通路の小物・店・公共施設)、`interior.js` (配管 `mg-pipe`・ケーブルラック `mg-cable-tray`・骨組み `mg-frame`・人工の空 `mg-sky`) が使う。画像が無いあいだは既存の素材に色を付けて代用する (`palette()` の `m(名前, 代わりの素材, 色)`、`props7.js` の `tm()`、正面の絵は `face()` が false を返して従来の作り)。`seam: ""` のマスは 1 枚の絵で、`prompt` では `[PICTURE]` (継ぎ目なしにしない) として頼む |
| `s44_mg_facade` 〜 `s52_mg_life` | **メガトンの追加 81 枚** (ユーザーが別に生成した画像、すべて使用)。上の階の窓・ベランダ・看板板・土間・階段、住戸の細部と色違い (床・壁紙・天井・扉・カーテン・寝具・家具・家電)、店と銭湯の細部、広場と路地 (噴水・生け垣・屋台・マンホール)、大きな施設の床と壁、駅の電車、住人の服。ユーザーの画像の色を保つため、継ぎ目なしのマスも `mean` を付けず `sat: 1.0`。1 枚の絵は `props7.js` の `picfurn` (家具の正面)・`picwall` (壁の絵)・`roundpic` (時計・丸い敷物・マンホール)・`floorpic` (床の絵) で貼る |
| `s53_mg_goods` 〜 `s58_mg_people` | **メガトンの追加 54 枚** (ユーザーが別に生成した画像、すべて使用)。店の品物・料理・学校と役所の備品・機械室・公園・住人の服と持ち物。白い背景の上の 1 枚の絵 (リュック・傘・買い物袋) は `"key": "white"` で外周につながる背景を透明にし (`tol` = 背景とみなす色の差、`flatten: 0` で明暗むらの補正を止める)、ゲームでは `mat(name, { cut: 1 })` / `face(..., { cut: 1 })` で切り抜きとして貼る |
| `s59_mg_home4` 〜 `s64_mg_port2` | 計画だけ (54 枚、**画像はまだ無い**) |
| `s65_mg_hospital2` 〜 `s73_mg_home_food` | ユーザーが別に生成した画像 (使える 67 マスを使用、残りは `skip` と理由)。`s71`〜`s73` は 9 シートの一覧画像から切り出して 1254 px に拡大したもの (1 マス約 136 px)。立体の遊具や背景付きの小物のように 1 枚の板にすると不自然なものは使わない |
| `s74_mg_shops3` 〜 `s79_mg_animals` | 計画だけ (54 枚、**画像はまだ無い**)。`"key": "white"` のマスは白い背景の上に物だけを描いてもらい、切り抜きにする |
| `s28_shop` 〜 `s32_ship` | ユーザーが別に生成した画像 (45 マス中 35 を使用)。機械や店の正面の絵は `props.js` の `face(P, 名前, 幅, 高さ, x, y, z, { uv, glow, rx, ry })` で面に 1 枚貼る (画像が無ければ false を返し、従来の作りになる) |

### 物の質感 (シート 12〜17) を使っている場所

| 場所 | 素材 |
|---|---|
| `props.js` の共通材質 `MM()` | white-plastic (wh), black-plastic (bk), gold-leaf (gd), leaves (lf, lf2), tree-bark (tr) |
| `props.js` の `flat(色, 粗さ, 金属度)` | 金属度 ≥ 0.8 → brushed-metal、粗さ ≤ 0.3 → gloss-paint、金属度 ≥ 0.3 → painted-metal、粗い布 → cotton-cloth、それ以外 → matte-plastic |
| `props.js` の `crateM()` | plastic-crate |
| `props.js` の家具・機械 | pool-felt, piano-lacquer, bed-linen, velvet (sofa), seat-fabric (seat), mahogany (barcounter), book-spines, terracotta (plant), stage-boards, locker-steel, server-rack (rack), vent-grille (vending), pipe-insulation (pipes), control-panel (console), reactor-shell, column-cladding (pillar), arcade-cabinet, polished-granite (monolith), machined-steel (workbench, toolcart), shipping-container (cargo), terminal-casing, olive-drab (weaponrack), quartz-countertop (kitchen) |
| `props3/4/5.js` の `BM()` | brass, copper, chrome, gunmetal, safety-yellow, ivory-enamel, orange-paint, red-paint |
| 地球 (`earth.js`、頂点色 × 質感の `vcMat`) | train-livery (モノレール), clothing-fabric (歩行者), weathered-paint (農場), house-siding (住宅), boat-gelcoat (船), marine-paint (灯台), turbine-composite (風車) |
| その他 | robot-shell (救助ボット), mli-blanket・black-plastic (ステーションの艤装), ripstop-tent (救護テント), prefab-panel (地表基地の壁), leaves (オアシスの茂み), gold-leaf (ガス巨星の装飾), gun-finish (船内の銃) |

## 新しい素材を足すとき

1. シート JSON に新しい `name` のマスを書く。`uvs` (1m あたりの繰り返し数) も書くと `texture-packs-ai.js` の `AI_MATERIAL_UVS` 経由で `MATERIAL_UVS` に入る
2. `generate` → `process`
3. 使う場所で `mat('<name>', { color, rough, metal })`。頂点色のメッシュには `vcMat('<name>')` (`surfkit.js`)。色で塗り分ける素材は `mean` を明るい灰色 (228 前後)、粗さの平均 `rough` を高め (235 前後) にしておくと、`color` と `rough` の指定がほぼそのまま効く
4. 画像がまだ無い素材は 1×1 の白で代用されるだけなので (単色の見た目)、先にコードを書いてもゲームは壊れない

## 確認

`python3 -m http.server` で配信し、`?auto=space` / `?auto=interior&type=station&id=haven` / `?auto=surface&body=terra` などを開いて、見た目とコンソールのエラーを確かめる。
既存画像との比較は、`src/gfx/texture-packs-ai.js` を一時的に `export const AI_TEXTURE_PACKS = {};` にして同じ画面を見ればよい。
