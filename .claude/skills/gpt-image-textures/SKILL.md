---
name: gpt-image-textures
description: Generate game textures for STARFABLE with OpenAI gpt-image-2.5-sunburst — one 1:1 image at the largest allowed size (2880x2880), quality "medium", laid out as a 3x3 grid that is cut into 9 seamless textures (albedo + normal + roughness, plant cut-outs, emissive windows) and wired into the game through src/gfx/texmanifest.js. Use when the user asks to generate, regenerate, add or replace textures/テクスチャ with GPT Image / gpt-image / サンバースト, or to finish the texture sheets that are still missing.
---

# gpt-image-textures — 1 枚の画像から 9 枚のテクスチャ

`gpt-image-2.5-sunburst` に **1:1・最大サイズ (2880×2880)・quality=medium** で 3×3 のテクスチャシートを描かせ、
1 枚あたり 9 枚のゲーム用テクスチャに切り分けて、ゲームにそのまま組み込む。

- 3840×3840 は「画素数の上限 (= 3840×2160 と同じ約 829 万画素)」を超えるので通らない。1:1 で通る最大は 2880×2880 (1 マス 960px)
- 1 枚の生成は 30 秒前後。料金は OpenAI の請求画面で確認すること (結果の `usage` は `assets/textures/sheets/<id>.json` に残る)

## 前提

- Python 3.9+ と `numpy`, `Pillow` (`pip install numpy pillow`)
- API キーは **環境変数 `OPENAI_API_KEY`** か `--key-file <ファイル>` で渡す。キーをリポジトリ内のファイル・コミット・チャットに書かない
- OpenAI のアカウントにクレジットが必要 (切れていると `credit_balance_exhausted` で止まる。再試行はしない)

## 手順 (リポジトリのルートで実行)

```bash
S=.claude/skills/gpt-image-textures
python3 $S/scripts/texgen.py prompt   $S/sheets/s2_interior.json   # 送るプロンプトの確認 (無料)
python3 $S/scripts/texgen.py generate $S/sheets/s2_interior.json   # 1 枚生成 (有料)。省略するとまだ無いシートを全部
python3 $S/scripts/texgen.py process  $S/sheets/s2_interior.json --preview /tmp/check   # 切り分け + マニフェスト更新
```

`generate` は `.cache/<id>.png` が既にあれば API を呼ばない (作り直しは `--force`)。生成後は必ず
`.cache/<id>.png` かプレビュー (`<id>_check.jpg`、タイルは 2×2 に並べて継ぎ目を確認できる) を目で見て、
マスがずれていないか・背景が指定どおりかを確認してから `process` の結果をコミットする。

`process` がすること:

| 種類 (`kind`) | 処理 | 出力 (`assets/textures/`) |
|---|---|---|
| `tile` | マスの外周 2.5% を捨てる → 撮影時の明暗むらを除去 → 重なり 192px を最小誤差の境界でつないで**継ぎ目なし** 1024px に → 彩度 (`sat`) と平均色 (`mean`) を既存テクスチャに合わせる → 高さから法線・粗さ | `<name>_a/_n/_r.webp` |
| `water` | 法線と粗さだけ | `<name>_n/_r.webp` |
| `emissive` | 黒背景の発光パターン (ステーションの窓) | `<name>_e.webp` |
| `cutout` | マゼンタ (#FF00FF) 背景を抜いてアルファ化。`role: side/top` は植物アトラス (左=側面・右=真上, 1024×512)、`top` が無い植物は側面から回転配置/散布で真上の姿を合成。`role: leaf` は葉の房 | `plant_<kind>.webp`, `<name>.webp` |

最後に `src/gfx/texmanifest.js` を書き直す。ゲームはここに載っている材質だけ画像を読み、載っていない材質は従来どおり手続き生成する。

## シート定義 (`sheets/*.json`)

1 シート = 9 マス。マスは左上から右へ、行ごとに並ぶ。

```json
{"name": "hull", "kind": "tile", "prompt": "Spaceship outer hull: ...", "mean": [183, 183, 183], "rough": 130, "sat": 0.15, "normal": 4.5}
```

- `mean` … 仕上がりの平均色 (0–255)。既存材質の置き換えでは**元の手続きテクスチャの平均に合わせる** (ゲーム側の `color` 指定がそのまま使えるように)
- `rough` … 粗さマップの平均 (0–255)。`sat` … 彩度 (0 = 灰色。ゲーム側で色を掛ける材質は低くする)
- `normal` … 法線の強さ。`hp` … 凹凸として拾う細かさ (px)。`uvs` … 1m あたりの繰り返し数 (新しい材質のみ)

| シート | 区分 | 中身 |
|---|---|---|
| `s1_metal` | 既存の置き換え | hull, wall, plate, grate, hex, rib, ceil, bulk, smooth |
| `s2_interior` | 既存の置き換え | tile, carpet, wood, concrete, padded, brick, plaster, shoji, marble |
| `s3_nature` | 既存の置き換え | rock, grass, water, solar, windows, 樹冠 (oak / jungle / pine / palm を真上から) |
| `s4_plants` | 既存の置き換え | 8 種の植物の側面 (oak, jungle, bush, pine, palm, wheat, corn, fern), 葉の房 |
| `s5_terrain` | 新規 | basalt, obsidian, dune_sand, sandstone, snowfield, glacier, asteroid, earth_ground, mossy_rock |
| `s6_architecture` | 新規 | asphalt, temple_stone, cobble, bark, log, terrazzo, tatami, leather, casino_carpet |
| `s7_industrial` | 新規 | container, hazard, armor, gold, brass_deck, circuit, rust, heat_tiles, carbon |

## 新しい材質をゲームで使う

1. シート JSON にマスを足して `generate` → `process`
2. 既存の材質で代用できるなら `src/gfx/textures.js` の `ALIAS` に「画像が無いときの代わり」を書く
3. 使う場所で `mat('<name>', { color, rough, metal })`。画像の有無で色の付け方を変えたいときは
   `aiMat('<name>', 画像ありの設定, '<代用材質>', 画像なしの設定)`、部屋の定義では `hasTex('<name>')` で分岐する
4. `python3 -m http.server` で起動し、`?auto=space` / `?auto=interior&type=station&id=haven` / `?auto=surface&body=terra` などで見た目とコンソールエラーを確認する
