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

## 新しい素材を足すとき

1. シート JSON に新しい `name` のマスを書いて `generate` → `process`
2. `src/gfx/materials.js` の `MATERIAL_UVS` に 1m あたりの繰り返し数を足す
3. 使う場所で `mat('<name>', { color, rough, metal })`

## 確認

`python3 -m http.server` で配信し、`?auto=space` / `?auto=interior&type=station&id=haven` / `?auto=surface&body=terra` などを開いて、見た目とコンソールのエラーを確かめる。
既存画像との比較は、`src/gfx/texture-packs-ai.js` を一時的に `export const AI_TEXTURE_PACKS = {};` にして同じ画面を見ればよい。
