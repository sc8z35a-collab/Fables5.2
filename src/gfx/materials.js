import * as THREE from 'three';
import { G } from '../core/util.js';
import { TEXTURE_PACKS } from './texture-packs.js';
import { AI_TEXTURE_PACKS } from './texture-packs-ai.js';

// 1 m あたりの繰り返し数。すべての素材に色・法線・粗さの WebP がある。
export const MATERIAL_UVS = Object.freeze({
  hull: .11, wall: .25, plate: .5, grate: 1, hex: .5, tile: .5, carpet: 1, wood: .4,
  concrete: .25, rock: .2, solar: .25, rib: .5, ceil: .25, water: .05, bulk: .25,
  smooth: .25, padded: .5, brick: .5, plaster: .25, shoji: .5, marble: .33, grass: .33,
  deco: .25, armor: .25, lab: .25, terrazzo: .5, tread: 1, brassdeco: .25, hazard: .5, quilt: 1,
  titanium: .5, ablative: .55, 'oxidized-hull': .18, 'blasted-steel': .7, 'carbon-fiber': 2, verdigris: .45,
  'welded-steel': .3, 'anodized-aluminum': .75, stainless: .95, epoxy: .5, 'rubber-chips': .8,
  perforated: 1.25, felt: .85, 'medical-vinyl': .7, polycarbonate: .5,
  basalt: .18, 'snow-crust': .24, 'glacial-ice': .19, sandstone: .22, 'ripple-sand': .16,
  regolith: .15, 'moss-granite': .2, 'wet-mud': .4, gravel: .52,
  'wet-asphalt': .36, 'cracked-asphalt': .4, 'board-concrete': .3, 'granite-pavers': .6,
  'glazed-brick': .5, 'zinc-roof': .36, stucco: .35, facade: .45, corten: .35,
  'technical-canvas': 1, leather: .85, 'ceramic-cloth': .95, cork: .7, walnut: .45,
  porcelain: .55, laminate: .78,
});

const ROOT = new URL('../../assets/textures/', import.meta.url);
const textures = new Map();
const pending = new Set();
const packs = new Map();
const packByTexture = new Map();
// AI 生成のパック (.claude/skills/gpt-image-textures) は後から登録し、同じ名前の画像を置き換える。
for (const [name, paths] of Object.entries({ ...TEXTURE_PACKS, ...AI_TEXTURE_PACKS })) for (const path of paths) packByTexture.set(path, name);
let aniso = 1;

export function setImageAniso(value) { aniso = value; }

async function readPack(name) {
  const response = await fetch(new URL('packs/' + name + '.zip', ROOT));
  if (!response.ok) throw new Error('HTTP ' + response.status);
  const bytes = await response.arrayBuffer();
  const view = new DataView(bytes), decoder = new TextDecoder(), files = new Map();
  // WebP は圧縮済みなので ZIP のストア方式で格納し、ブラウザー側では画像データを切り出す。
  for (let pos = 0; pos + 30 <= view.byteLength && view.getUint32(pos, true) === 0x04034b50;) {
    const flags = view.getUint16(pos + 6, true);
    const size = view.getUint32(pos + 18, true);
    const nameLength = view.getUint16(pos + 26, true);
    const start = pos + 30 + nameLength + view.getUint16(pos + 28, true);
    if ((flags & 9) || view.getUint16(pos + 8, true) !== 0 || start + size > view.byteLength) {
      throw new Error('テクスチャの ZIP 形式が正しくありません');
    }
    const file = decoder.decode(new Uint8Array(bytes, pos + 30, nameLength));
    files.set(file, new Uint8Array(bytes, start, size));
    pos = start + size;
  }
  return files;
}

async function readImage(path) {
  const key = path.startsWith('materials/') ? path.slice(0, path.lastIndexOf('/')) : path;
  const name = packByTexture.get(key);
  if (!name) throw new Error('画像が登録されていません');
  if (!packs.has(name)) packs.set(name, readPack(name));
  const files = await packs.get(name), data = files.get(path + '.webp');
  if (!data) throw new Error('ZIP に画像がありません');
  const url = URL.createObjectURL(new Blob([data], { type: 'image/webp' }));
  try {
    const img = new Image();
    await new Promise((resolve, reject) => {
      img.onload = resolve;
      img.onerror = reject;
      img.src = url;
    });
    return img;
  } finally { URL.revokeObjectURL(url); }
}

export function imageTex(path, { srgb = true, repeat = true, fill = [255, 255, 255, 255] } = {}) {
  if (textures.has(path)) return textures.get(path);
  const tex = new THREE.Texture(new ImageData(new Uint8ClampedArray(fill), 1, 1));
  tex.name = path;
  tex.colorSpace = srgb ? THREE.SRGBColorSpace : THREE.NoColorSpace;
  tex.wrapS = tex.wrapT = repeat ? THREE.RepeatWrapping : THREE.ClampToEdgeWrapping;
  tex.minFilter = THREE.LinearMipmapLinearFilter;
  tex.anisotropy = aniso;
  tex.needsUpdate = true;
  textures.set(path, tex);
  const load = readImage(path).then((img) => {
    tex.image = img;
    tex.needsUpdate = true;
    G.dirty = true;
  }).catch((error) => console.warn('テクスチャを読み込めませんでした', path, error));
  pending.add(load);
  load.then(() => pending.delete(load));
  return tex;
}

export function readyTextures() { return Promise.all(pending); }

const SETS = new Map();
export function texSet(name) {
  if (SETS.has(name)) return SETS.get(name);
  const base = 'materials/' + name + '/';
  const set = {
    map: imageTex(base + 'color'),
    normalMap: imageTex(base + 'normal', { srgb: false, fill: [128, 128, 255, 255] }),
    roughnessMap: imageTex(base + 'roughness', { srgb: false }),
  };
  SETS.set(name, set);
  return set;
}

export function celestialTex(id) {
  return imageTex('celestial/' + id, {
    srgb: id !== 'clouds' && id !== 'rings',
    fill: id === 'clouds' || id === 'nebula' ? [0, 0, 0, 255] : [255, 255, 255, 255],
  });
}
