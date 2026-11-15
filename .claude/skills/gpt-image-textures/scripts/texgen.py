#!/usr/bin/env python3
"""gpt-image-2.5-sunburst で 3x3 のテクスチャシートを生成し、ゲーム用の 9 枚に切り分ける。

使い方 (リポジトリのルートで。SHEET.json を省くと sheets/*.json すべて):
  python3 .claude/skills/gpt-image-textures/scripts/texgen.py prompt   [SHEET.json]  # 送るプロンプトを表示 (無料)
  python3 .claude/skills/gpt-image-textures/scripts/texgen.py generate [SHEET.json]  # まだ無いシートを生成 (有料)
  python3 .claude/skills/gpt-image-textures/scripts/texgen.py process  [SHEET.json]  # 切り分け → assets/textures/packs/ai-*.zip
  python3 .claude/skills/gpt-image-textures/scripts/texgen.py manifest               # src/gfx/texture-packs-ai.js を作り直す

出力はゲームの画像パックと同じ形式 (無圧縮 ZIP の中に materials/<名前>/color|normal|roughness.webp など)。
src/gfx/materials.js は ai-*.zip を既存のパックより後に登録するので、同じ名前の画像を置き換える。

API キーは環境変数 OPENAI_API_KEY か --key-file で渡す (ファイルやコミットに書かない)。
依存: Python 3.9+, numpy, Pillow
"""
import argparse, base64, json, math, os, shutil, sys, time, urllib.error, urllib.request, zipfile
from pathlib import Path

import numpy as np
from PIL import Image

MODEL = 'gpt-image-2.5-sunburst'
SIZE = 2880          # 1:1 で通る最大サイズ (画素数の上限 = 3840x2160 と同じ 829 万画素、辺は 16 の倍数)
QUALITY = 'medium'
GRID = 3             # 3x3 = 1 枚あたり 9 テクスチャ
OUT_TILE = 1024      # 継ぎ目処理をする解像度
MAT_SIZE = 512       # ゲームに入れる色・法線マップの解像度 (粗さはこの半分)

SKILL = Path(__file__).resolve().parents[1]
ROOT = SKILL.parents[2]
SHEETS = SKILL / 'sheets'
CACHE = SKILL / '.cache'
TEX = ROOT / 'assets' / 'textures'
PACKS = TEX / 'packs'
STAGE = CACHE / 'stage'   # パックに詰める前の画像 (シートごと)
MANIFEST = ROOT / 'src' / 'gfx' / 'texture-packs-ai.js'

# ───────────────────────── プロンプト ─────────────────────────
HEAD = ('Video game texture atlas. One square image divided into an exact 3x3 grid of nine equal square cells '
        '(each cell exactly one third of the image width and height). No borders, no gaps, no gutters, no frames, '
        'no labels, no text, no numbers, no logos, no watermark. Photorealistic, very high detail, sharp focus. ')
TILE = ('TILE cells: a completely flat, orthographic, straight-on top-down photographic PBR albedo texture that fills '
        'the whole cell edge to edge; soft uniform shadowless lighting; no perspective, no vignette, no specular hot '
        'spots, no objects in front; detail evenly distributed so it can tile seamlessly. ')
CUT = ('CUTOUT cells: one isolated subject, fully visible, on a perfectly flat uniform pure magenta background '
       '(#FF00FF, RGB 255,0,255) that fills the rest of the cell; no ground, no pot, no shadow, no gradient on the '
       'background; crisp clean silhouette; keep a small magenta margin around the subject. ')
EMI = ('EMISSIVE cells: glowing elements on a pure black background (#000000); nothing else lit. ')


def build_prompt(sheet):
    kinds = {c['kind'] for c in sheet['cells']}
    p = HEAD + (sheet.get('style', '') + ' ' if sheet.get('style') else '')
    if kinds & {'tile', 'water'}: p += TILE
    if 'cutout' in kinds: p += CUT
    if 'emissive' in kinds: p += EMI
    p += 'Cells in reading order (left to right, top to bottom):\n'
    for i, c in enumerate(sheet['cells']):
        tag = {'tile': 'TILE', 'water': 'TILE', 'cutout': 'CUTOUT', 'emissive': 'EMISSIVE'}[c['kind']]
        p += f"{i + 1}. (row {i // 3 + 1}, column {i % 3 + 1}) [{tag}] {c['prompt']}\n"
    return p


# ───────────────────────── API ─────────────────────────
def api_key(args):
    if args.key_file: return Path(args.key_file).read_text().strip()
    k = os.environ.get('OPENAI_API_KEY', '').strip()
    if not k: sys.exit('OPENAI_API_KEY が設定されていません (--key-file でも指定可)')
    return k


def generate(sheet, args):
    CACHE.mkdir(parents=True, exist_ok=True); (TEX / 'sheets').mkdir(parents=True, exist_ok=True)
    raw = CACHE / f"{sheet['id']}.png"
    done = raw if raw.exists() else TEX / 'sheets' / f"{sheet['id']}.webp"
    if done.exists() and not args.force:
        print(f'{sheet["id"]}: {done.relative_to(ROOT)} がすでにあります (作り直すなら --force)'); return
    body = {'model': MODEL, 'prompt': build_prompt(sheet), 'size': f'{SIZE}x{SIZE}', 'quality': QUALITY, 'n': 1, 'output_format': 'png'}
    req = urllib.request.Request('https://api.openai.com/v1/images/generations', data=json.dumps(body).encode(),
                                 headers={'Authorization': f'Bearer {api_key(args)}', 'Content-Type': 'application/json'})
    t0 = time.time()
    for attempt in range(4):
        try:
            with urllib.request.urlopen(req, timeout=900) as r: res = json.load(r); break
        except urllib.error.HTTPError as e:
            msg = e.read().decode(errors='replace')
            if 'insufficient_quota' in msg or 'credit_balance' in msg:
                sys.exit(f"{sheet['id']}: OpenAI のクレジットが残っていません。https://platform.openai.com/settings/organization/billing/ で追加してから再実行してください")
            if e.code in (429, 500, 502, 503, 504) and attempt < 3: print(f'HTTP {e.code}, retrying…'); time.sleep(10 * (attempt + 1)); continue
            sys.exit(f'HTTP {e.code}: {msg}')
        except (urllib.error.URLError, TimeoutError) as e:
            if attempt < 3: print(f'{e}, retrying…'); time.sleep(10 * (attempt + 1)); continue
            raise
    raw.write_bytes(base64.b64decode(res['data'][0]['b64_json']))
    im = Image.open(raw).convert('RGB')
    im.save(TEX / 'sheets' / f"{sheet['id']}.webp", 'WEBP', quality=90, method=6)
    meta = {'id': sheet['id'], 'model': MODEL, 'size': f'{SIZE}x{SIZE}', 'quality': QUALITY, 'seconds': round(time.time() - t0, 1),
            'usage': res.get('usage'), 'created': res.get('created'), 'cells': [c['name'] for c in sheet['cells']]}
    (TEX / 'sheets' / f"{sheet['id']}.json").write_text(json.dumps(meta, indent=1, ensure_ascii=False))
    print(f"{sheet['id']}: {im.size[0]}x{im.size[1]} in {meta['seconds']}s usage={meta['usage']}")


def has_sheet_image(sheet):
    return (CACHE / f"{sheet['id']}.png").exists() or (TEX / 'sheets' / f"{sheet['id']}.webp").exists()


def load_sheet_image(sheet, required=True):
    raw = CACHE / f"{sheet['id']}.png"
    src = raw if raw.exists() else TEX / 'sheets' / f"{sheet['id']}.webp"
    if not src.exists():
        if not required: return None
        sys.exit(f"{sheet['id']}: シート画像がありません。先に generate を実行してください")
    return np.asarray(Image.open(src).convert('RGB'), dtype=np.float32) / 255.0


# ───────────────────────── 画像処理 ─────────────────────────
def gblur(a, sigma, wrap=True):
    """ガウスぼかし (FFT)。wrap=False のときは鏡像で拡張してから処理"""
    if sigma <= 0: return a
    pad = 0 if wrap else int(min(3 * sigma, min(a.shape[:2]) - 1))
    if pad: a = np.pad(a, ((pad, pad), (pad, pad)) + ((0, 0),) * (a.ndim - 2), mode='reflect')
    h, w = a.shape[:2]
    fy, fx = np.fft.fftfreq(h)[:, None], np.fft.rfftfreq(w)[None, :]
    k = np.exp(-2 * (math.pi * sigma) ** 2 * (fy ** 2 + fx ** 2))
    if a.ndim == 3: k = k[..., None]
    out = np.fft.irfft2(np.fft.rfft2(a, axes=(0, 1)) * k, s=(h, w), axes=(0, 1))
    return out[pad:h - pad, pad:w - pad] if pad else out


def lum(a): return a[..., 0] * 0.2126 + a[..., 1] * 0.7152 + a[..., 2] * 0.0722


def cell(img, i, inset):
    n = img.shape[0] // GRID; y, x = (i // GRID) * n, (i % GRID) * n; m = int(round(n * inset))
    return img[y + m:y + n - m, x + m:x + n - m]


def _cut_path(err, lo, hi):
    """err (H, W) の上から下への最小コスト経路 (隣接列への移動は ±1)"""
    H, W = err.shape; e = err.copy(); e[:, :lo] = 1e9; e[:, hi:] = 1e9
    E = e[0].copy(); back = np.zeros((H, W), np.int8)
    for y in range(1, H):
        l = np.r_[1e18, E[:-1]]; r = np.r_[E[1:], 1e18]; s = np.stack([l, E, r]); a = s.argmin(0)
        back[y] = a - 1; E = e[y] + s[a, np.arange(W)]
    p = np.zeros(H, int); p[-1] = int(E.argmin())
    for y in range(H - 1, 0, -1): p[y - 1] = p[y] + back[y, p[y]]
    return p


def wrap_x(img, ov):
    """横方向に継ぎ目なしにする (重なり領域を最小誤差の境界で切り替える)。幅は ov だけ縮む"""
    H, W = img.shape[:2]; M = W - ov; A, B = img[:, M:], img[:, :ov]
    err = ((A - B) ** 2).sum(-1); err = gblur(err, 1.5, wrap=False)
    p = _cut_path(err, 6, ov - 6)
    t = min(96, H // 4)  # 経路の末尾を先頭に合わせる (縦方向に繰り返したときも境界がつながるように)
    p[-t:] = np.round(np.linspace(p[-t], p[0], t)).astype(int)
    mask = (np.arange(ov)[None, :] < p[:, None]).astype(np.float32)
    mask = gblur(mask, 1.2, wrap=False)[..., None]
    out = img[:, :M].copy(); out[:, :ov] = A * mask + B * (1 - mask)
    return out


def seamless(img, size=OUT_TILE):
    ov = img.shape[1] - size
    img = wrap_x(img, ov)
    img = wrap_x(img.transpose(1, 0, 2), img.shape[0] - size).transpose(1, 0, 2)
    return np.ascontiguousarray(img)


def flatten_light(img, amount, sigma):
    """撮影時の明暗むら (低周波) を取り除く"""
    if amount <= 0: return img
    L = lum(img); low = gblur(L, sigma, wrap=False); g = (L.mean() / np.maximum(low, 1e-3)) ** amount
    return np.clip(img * g[..., None], 0, 1)


def match_mean(img, target):
    """平均色を target (0-255 の RGB) に合わせる。明るさはガンマで合わせて白飛びを防ぐ"""
    t = np.array(target, np.float32) / 255; tl = float(lum(t[None, None])[0, 0]); L = lum(img)
    lo, hi = 0.15, 6.0
    for _ in range(40):
        g = math.sqrt(lo * hi)
        if (L ** g).mean() > tl: lo = g
        else: hi = g
    out = img ** g
    gain = t / np.maximum(out.reshape(-1, 3).mean(0), 1e-4)
    return np.clip(out * gain, 0, 1)


def desat(img, s):
    L = lum(img)[..., None]; return np.clip(L + (img - L) * s, 0, 1)


def height_map(img, invert=False, hp=24):
    L = lum(img)
    if invert: L = 1 - L
    d = gblur(L, 1.4) - gblur(L, hp)  # 画素単位のノイズ (写真の粒子) を落とした帯域だけを凹凸にする: 細かすぎる凹凸は床のきらつきの原因
    return 0.5 + d / (4 * d.std() + 1e-6)


def normal_map(h, strength):
    """src/gfx/textures.js の normalFromHeight と同じ向きの法線マップ"""
    dx = (np.roll(h, -1, 1) - np.roll(h, 1, 1)) * strength
    dy = (np.roll(h, -1, 0) - np.roll(h, 1, 0)) * strength
    l = 1 / np.sqrt(dx * dx + dy * dy + 1)
    return np.stack([-dx * l * 0.5 + 0.5, dy * l * 0.5 + 0.5, l * 0.5 + 0.5], -1)


def rough_map(h, mean, var):
    r = mean / 255 + (0.5 - np.clip(h, 0, 1)) * var
    r = r - r.mean() + mean / 255
    return np.clip(r, 0.02, 1)


def u8(a): return Image.fromarray((np.clip(a, 0, 1) * 255 + 0.5).astype(np.uint8))


def save(a, path, q=86, size=None):
    im = u8(a)
    if size and im.size[0] != size: im = im.resize((size, size), Image.LANCZOS)
    im.save(path, 'WEBP', quality=q, method=6)


# ── 切り抜き (マゼンタ背景) ──
def key_magenta(c):
    rgb = c * 255; k = np.minimum(rgb[..., 0] - rgb[..., 1], rgb[..., 2] - rgb[..., 1])
    a = 1 - np.clip((k - 28) / (70 - 28), 0, 1)
    rgb2 = rgb.copy(); spill = np.clip(np.minimum(rgb[..., 0], rgb[..., 2]) - rgb[..., 1], 0, None)
    rgb2[..., 0] -= spill; rgb2[..., 2] -= spill
    a = np.where(gblur(a, 0.6, wrap=False) < 0.04, 0, a)
    return np.clip(rgb2 / 255, 0, 1), np.clip(a, 0, 1)


def match_cut(rgb, a, target):
    """切り抜きの不透明部分の明るさを target (0-255 RGB) に合わせる。色味は AI 画像のまま"""
    if not target or not (a > 0.5).any(): return rgb
    cur = float(lum(rgb[a > 0.5].mean(0)[None, None])[0, 0]); want = float(lum((np.array(target, np.float32) / 255)[None, None])[0, 0])
    return np.clip(rgb * np.clip(want / max(cur, 1e-4), 0.5, 2.0), 0, 1)


def bleed(rgb, a):
    """透明部分の色を周囲の不透明色で埋める (ミップマップで縁が黒ずまないように)"""
    m = (a > 0.5).astype(np.float32); out = rgb.copy(); filled = m.copy()
    for s in (1, 2, 4, 8, 16, 32, 64):
        num = gblur(out * filled[..., None], s, wrap=False); den = gblur(filled, s, wrap=False)
        take = (filled < 0.5) & (den > 0.02)
        out[take] = num[take] / den[take][:, None]; filled[take] = 1
    out[filled < 0.5] = rgb[a > 0.5].mean(0) if (a > 0.5).any() else 0.3
    return out


def fit(rgb, a, n, mode):
    """被写体の外接矩形を n×n に収める。mode='side' は下端揃え・左右中央、'top' は中央"""
    ys, xs = np.where(a > 0.35)
    if not len(ys): return np.zeros((n, n, 3), np.float32), np.zeros((n, n), np.float32)
    y0, y1, x0, x1 = ys.min(), ys.max() + 1, xs.min(), xs.max() + 1
    im = Image.fromarray((np.dstack([rgb, a]) * 255).astype(np.uint8), 'RGBA').crop((x0, y0, x1, y1))
    w, h = im.size; fill = 0.98 if mode == 'side' else 0.96; s = min(n * fill / w, n * fill / h)
    im = im.resize((max(1, round(w * s)), max(1, round(h * s))), Image.LANCZOS)
    can = Image.new('RGBA', (n, n), (0, 0, 0, 0))
    ox = (n - im.size[0]) // 2; oy = n - im.size[1] if mode == 'side' else (n - im.size[1]) // 2
    can.alpha_composite(im, (ox, oy)); arr = np.asarray(can, np.float32) / 255
    return arr[..., :3], arr[..., 3]


def rosette(rgb, a, n, copies, scale, part=1.0, jitter=0.0, seed=1):
    """横から見た切り抜きを中心のまわりに回転配置して「真上から見た姿」を作る"""
    rng = np.random.default_rng(seed)
    src = Image.fromarray((np.dstack([rgb, a]) * 255).astype(np.uint8), 'RGBA')
    if part < 1: src = src.crop((0, 0, src.size[0], int(src.size[1] * part)))
    can = Image.new('RGBA', (n * 2, n * 2), (0, 0, 0, 0)); L = int(n * scale)
    piece = src.resize((L, L), Image.LANCZOS)
    for i in range(copies):
        ang = 360 * i / copies + rng.uniform(-jitter, jitter) * 360 / copies
        big = Image.new('RGBA', (L * 2, L * 2), (0, 0, 0, 0)); big.alpha_composite(piece, (L // 2, 0))  # 根元を中心に
        rot = big.rotate(ang, resample=Image.BICUBIC)
        can.alpha_composite(rot, (n - L, n - L))
    can = can.resize((n, n), Image.LANCZOS); arr = np.asarray(can, np.float32) / 255
    return arr[..., :3], arr[..., 3]


def scatter(rgb, a, n, count, scale, part, seed=1):
    """切り抜きの一部 (穂先など) を散らして真上から見た密な群落を作る"""
    rng = np.random.default_rng(seed)
    src = Image.fromarray((np.dstack([rgb, a]) * 255).astype(np.uint8), 'RGBA')
    src = src.crop((0, 0, src.size[0], int(src.size[1] * part)))
    can = Image.new('RGBA', (n, n), (0, 0, 0, 0)); w = int(n * scale)
    piece = src.resize((w, max(1, int(w * src.size[1] / src.size[0]))), Image.LANCZOS)
    for _ in range(count):
        p = piece.rotate(rng.uniform(0, 360), expand=True, resample=Image.BICUBIC)
        can.alpha_composite(p, (int(rng.uniform(0, n - p.size[0])), int(rng.uniform(0, n - p.size[1]))))
    arr = np.asarray(can, np.float32) / 255
    return arr[..., :3], arr[..., 3]


def save_rgba(rgb, a, path, size=None):
    rgb = bleed(rgb, a); path.parent.mkdir(parents=True, exist_ok=True)
    im = Image.fromarray((np.dstack([np.clip(rgb, 0, 1), a]) * 255 + 0.5).astype(np.uint8), 'RGBA')
    if size and im.size != size: im = im.resize(size, Image.LANCZOS)
    im.save(path, 'WEBP', quality=90, method=6)


def save_normal(n, path, size):
    """法線マップを縮小してから長さ 1 に戻して保存"""
    im = np.asarray(u8(n).resize((size, size), Image.LANCZOS), np.float32) / 255 * 2 - 1
    im /= np.linalg.norm(im, axis=-1, keepdims=True) + 1e-6
    save(im * 0.5 + 0.5, path, q=90)


# ───────────────────────── 処理本体 ─────────────────────────
# 画像はまずシートごとの作業フォルダ (.cache/stage/<id>/) に、ゲームの中の名前で書き出す:
#   materials/<name>/color|normal|roughness.webp, vegetation/<kind>.webp, effects/windows.webp など
def process(sheet):
    img = load_sheet_image(sheet); out = STAGE / sheet['id']
    if out.exists(): shutil.rmtree(out)
    work = OUT_TILE + 192  # 継ぎ目処理の重なり幅 192px を足した作業サイズ (1 セル 960px - 余白 → 1216 に拡大)
    for i, c in enumerate(sheet['cells']):
        k, name = c['kind'], c['name']
        if k in ('tile', 'emissive'):
            src = cell(img, i, 0.025)
            if src.shape[0] != work: src = np.asarray(u8(src).resize((work, work), Image.LANCZOS), np.float32) / 255
            if k != 'emissive': src = flatten_light(src, c.get('flatten', 0.8), src.shape[0] / 7)
            t = seamless(src)
            if k == 'emissive':
                L = lum(t); t = t * np.clip((L - c.get('black', 0.12)) / 0.25, 0, 1)[..., None]
                t = np.clip(t * (np.mean(c['mean']) / 255 / max(t.mean(), 1e-4)), 0, 1)
                (out / c['path']).parent.mkdir(parents=True, exist_ok=True); save(t, out / f"{c['path']}.webp", q=88, size=MAT_SIZE); continue
            d = out / 'materials' / name; d.mkdir(parents=True, exist_ok=True)
            h = height_map(t, c.get('invert', False), c.get('hp', 24)); nm = normal_map(h, c.get('normal', 4.0))
            save_normal(nm, d / 'normal.webp', MAT_SIZE)
            if c.get('also'): (out / c['also']).parent.mkdir(parents=True, exist_ok=True); save_normal(nm, out / f"{c['also']}.webp", MAT_SIZE)
            save(rough_map(gblur(h, 2.5), c.get('rough', 150), c.get('rvar', 0.25)), d / 'roughness.webp', q=85, size=MAT_SIZE // 2)
            t = desat(t, c.get('sat', 1.0)); t = match_mean(t, c['mean'])
            save(t, d / 'color.webp', q=86, size=MAT_SIZE)
        elif k == 'cutout' and c.get('role') == 'leaf':
            rgb, a = key_magenta(cell(img, i, 0.012)); r2, a2 = fit(rgb, a, 512, 'top')
            save_rgba(match_cut(r2, a2, c.get('mean')), a2, out / f"{c['path']}.webp")
        # 植物の side / top は build_atlases でシートをまたいで組み立てる
    print(f"{sheet['id']}: processed")


def build_atlases(sheets):
    """side / top の切り抜きを組み合わせて vegetation/<kind>.webp (1024x512, 左=側面 / 右=真上) を作る"""
    side, top = {}, {}
    for sh in sheets:
        if not any(c['kind'] == 'cutout' and c.get('role') in ('side', 'top') for c in sh['cells']): continue
        img = load_sheet_image(sh, required=False)
        if img is None: continue
        for i, c in enumerate(sh['cells']):
            if c['kind'] != 'cutout' or c.get('role') not in ('side', 'top'): continue
            rgb, a = key_magenta(cell(img, i, 0.012))
            (side if c['role'] == 'side' else top)[c['plant']] = (rgb, a, c, sh['id'])
    for plant, (rgb, a, c, sid) in side.items():
        sr, sa = fit(rgb, a, 512, 'side'); sr = match_cut(sr, sa, c.get('mean'))
        if plant in top:
            tr, ta = fit(top[plant][0], top[plant][1], 512, 'top'); tr = match_cut(tr, ta, top[plant][2].get('mean'))
        else:
            how = c.get('top', {'mode': 'rosette'})
            if how['mode'] == 'scatter': tr, ta = scatter(sr, sa, 512, how.get('count', 40), how.get('scale', 0.3), how.get('part', 0.4), seed=len(plant))
            else: tr, ta = rosette(sr, sa, 512, how.get('copies', 6), how.get('scale', 0.5), how.get('part', 1.0), how.get('jitter', 0.2), seed=len(plant))
        save_rgba(np.concatenate([sr, tr], 1), np.concatenate([sa, ta], 1), STAGE / sid / 'vegetation' / f'{plant}.webp')
        print(f'vegetation/{plant}.webp (top: {"generated" if plant in top else "composited"})')


def write_packs():
    """作業フォルダを無圧縮 ZIP (ゲームの readPack が読める形式) にまとめる → assets/textures/packs/ai-<id>.zip"""
    PACKS.mkdir(parents=True, exist_ok=True)
    for d in sorted(p for p in STAGE.glob('*') if p.is_dir()):
        files = sorted(f for f in d.rglob('*.webp'))
        if not files: continue
        z = PACKS / f'ai-{d.name}.zip'
        with zipfile.ZipFile(z, 'w', zipfile.ZIP_STORED) as zf:
            for f in files:
                zi = zipfile.ZipInfo(f.relative_to(d).as_posix(), date_time=(2026, 1, 1, 0, 0, 0)); zi.compress_type = zipfile.ZIP_STORED
                zf.writestr(zi, f.read_bytes())
        print(f'{z.relative_to(ROOT)}: {len(files)} images, {z.stat().st_size // 1024} KB')


def make_preview(sheet, out):
    out = Path(out); out.mkdir(parents=True, exist_ok=True); ims = []; d = STAGE / sheet['id']
    for c in sheet['cells']:
        cand = [d / 'materials' / c['name'] / 'color.webp', d / f"{c.get('path', '-')}.webp", d / 'vegetation' / f"{c.get('plant', '-')}.webp"]
        for p in cand:
            if p.exists():
                im = Image.open(p).convert('RGBA'); bg = Image.new('RGBA', im.size, (60, 70, 60, 255)); bg.alpha_composite(im)
                im = bg.convert('RGB')
                if im.size[0] == im.size[1]: im = Image.fromarray(np.tile(np.asarray(im), (2, 2, 1)))  # 2x2 で並べて継ぎ目を確認
                im.thumbnail((512, 512)); box = Image.new('RGB', (512, 512), (20, 20, 20)); box.paste(im, ((512 - im.size[0]) // 2, (512 - im.size[1]) // 2)); ims.append(box); break
    W = 512 * 3; H = 512 * math.ceil(max(len(ims), 1) / 3); can = Image.new('RGB', (W, H), (20, 20, 20))
    for i, im in enumerate(ims): can.paste(im, ((i % 3) * 512, (i // 3) * 512))
    can.save(out / f"{sheet['id']}_check.jpg", quality=85)


# ───────────────────────── マニフェスト ─────────────────────────
def manifest():
    """assets/textures/packs/ai-*.zip の中身から src/gfx/texture-packs-ai.js を作る"""
    packs = {}
    for z in sorted(PACKS.glob('ai-*.zip')):
        keys = []
        with zipfile.ZipFile(z) as zf:
            for n in zf.namelist():
                k = n.rsplit('/', 1)[0] if n.startswith('materials/') else n[:-len('.webp')]
                if k not in keys: keys.append(k)
        packs[z.stem] = keys
    body = ''.join(f"  {json.dumps(k)}: [\n" + ''.join(f'    {json.dumps(v)},\n' for v in vs) + '  ],\n' for k, vs in packs.items())
    js = ('// 自動生成: .claude/skills/gpt-image-textures/scripts/texgen.py manifest (手で編集しない)\n'
          f'// {MODEL} ({SIZE}x{SIZE}, quality={QUALITY}) の 3x3 シートから切り出した画像のパック。\n'
          '// materials.js が TEXTURE_PACKS の後に登録するので、同じ名前の既存画像を置き換える。\n'
          'export const AI_TEXTURE_PACKS = {\n' + body + '};\n')
    MANIFEST.write_text(js)
    print(f'{MANIFEST.relative_to(ROOT)}: {len(packs)} packs, {sum(len(v) for v in packs.values())} textures')


def load_sheets(paths):
    if not paths: paths = sorted(SHEETS.glob('*.json'))
    return [json.loads(Path(p).read_text()) for p in paths]


def main():
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument('cmd', choices=['prompt', 'generate', 'process', 'manifest', 'all'])
    ap.add_argument('sheets', nargs='*', help='シート定義 JSON (省略時は sheets/*.json すべて)')
    ap.add_argument('--key-file'); ap.add_argument('--force', action='store_true'); ap.add_argument('--preview')
    args = ap.parse_args()
    sheets = load_sheets(args.sheets)
    for s in sheets:
        assert len(s['cells']) == GRID * GRID, f"{s['id']}: セルは 9 個必要です"
    if args.cmd == 'prompt':
        for s in sheets: print(f"=== {s['id']} ===\n{build_prompt(s)}")
    if args.cmd in ('generate', 'all'):
        for s in sheets: generate(s, args)
    if args.cmd in ('process', 'all'):
        everything = load_sheets([])  # パックは植物のようにシートをまたぐので、画像のあるシートは毎回すべて作り直す
        done = [s for s in everything if has_sheet_image(s)]
        for s in done: process(s)
        build_atlases(everything); write_packs()
        if args.preview:
            for s in done: make_preview(s, args.preview)
    if args.cmd in ('manifest', 'process', 'all'):
        manifest()


if __name__ == '__main__':
    main()
