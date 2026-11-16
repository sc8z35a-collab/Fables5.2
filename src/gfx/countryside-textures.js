// 3×3 の画像生成シートを 1 枚のレイヤーテクスチャへ展開する。
// レイヤーごとにミップマップが生成されるので、遠景でも隣の素材の色がにじまない。
import * as THREE from 'three';
import { fxTime } from './fx.js';

const SHEETS = ['fields', 'water-verges', 'uplands', 'roads', 'house-shells', 'house-details'];
const SIDE = 139;
const COUNT = SHEETS.length * 9;

export const CT = Object.freeze({
  WHEAT: 0, RICE: 1, RAPESEED: 2, POTATO: 3, STUBBLE: 4, FURROWS: 5, MEADOW: 6, PASTURE: 7, CLOVER: 8,
  ORCHARD: 9, HEDGEROW: 10, EARTH: 11, RIVER_GRAVEL: 12, LEAF_LITTER: 13, REEDS: 14, WATER: 15, WET_CLAY: 16, VERGE: 17,
  SPRUCE: 18, DECIDUOUS: 19, SCRUB: 20, SCREE: 21, GRANITE: 22, STRATA: 23, MOSS_ROCK: 24, TALUS: 25, ALPINE: 26,
  HIGHWAY: 27, ASPHALT: 28, ROAD_GRAVEL: 29, DRIVEWAY: 30, WHITE_PAINT: 31, OCHRE: 32, ZINC: 33, RETAINING: 34, BRIDGE: 35,
  PLASTER: 36, CEDAR: 37, SLATE: 38, TERRACOTTA: 39, SEAM_ROOF: 40, BRICK: 41, SIDING: 42, RUBBLE: 43, CERAMIC: 44,
  DOOR: 45, GLASS: 46, TIMBER: 47, CORRUGATED: 48, FOUNDATION: 49, PAVERS: 50, GARDEN_GRAVEL: 51, HEDGE: 52, FENCE: 53,
});

const COLORS = [
  0xb19546, 0x829942, 0xb79e39, 0x566744, 0x9c8458, 0x766148, 0x668043, 0x7a8550, 0x607b41,
  0x536b39, 0x475d33, 0x89745f, 0x88837b, 0x765e49, 0x6c783b, 0x365656, 0x6b6255, 0x728154,
  0x465a3a, 0x5f723c, 0x676846, 0x757981, 0x8c8981, 0x766c5c, 0x6c7358, 0x8e805d, 0x727a4d,
  0x46474a, 0x656362, 0x8b8372, 0x8a8780, 0xd1cec6, 0xd8a638, 0x888f92, 0x9a9484, 0x888782,
  0xdbcab1, 0x81614b, 0x48535d, 0xa25942, 0x526653, 0x865a49, 0xacaaa1, 0x7d786c, 0x55585b,
  0x836240, 0x4e626a, 0x564336, 0x797e7d, 0x86847d, 0x6d4f43, 0xa49983, 0x455d30, 0x645449,
];

function texture(data, size) {
  const tex = new THREE.DataArrayTexture(data, size, size, COUNT);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  tex.magFilter = THREE.LinearFilter;
  tex.minFilter = size > 1 ? THREE.LinearMipmapLinearFilter : THREE.LinearFilter;
  tex.generateMipmaps = size > 1;
  tex.needsUpdate = true;
  return tex;
}

async function readSheet(name) {
  const image = new Image();
  image.src = new URL('../../assets/countryside/' + name + '.webp', import.meta.url).href;
  await image.decode();
  const size = SIDE * 3;
  if (image.width !== size || image.height !== size) throw new Error('Unexpected countryside image size: ' + name);
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = size;
  const ctx = canvas.getContext('2d', { willReadFrequently: true });
  ctx.drawImage(image, 0, 0);
  return ctx.getImageData(0, 0, size, size).data;
}

export function countrysideTextures() {
  const colors = new Uint8Array(COUNT * 4);
  for (const [i, color] of COLORS.entries()) {
    colors.set([(color >> 16) & 255, (color >> 8) & 255, color & 255, 255], i * 4);
  }
  const uniform = { value: texture(colors, 1) };
  let disposed = false, pending = false, retryAt = 0;
  return {
    uniform,
    load() {
      if (disposed || pending || uniform.value.image.width === SIDE || performance.now() < retryAt) return;
      pending = true;
      Promise.all(SHEETS.map(readSheet)).then((sheets) => {
        if (disposed) return;
        const data = new Uint8Array(SIDE * SIDE * COUNT * 4);
        sheets.forEach((sheet, n) => {
          for (let tile = 0; tile < 9; tile++) {
            const sx = (tile % 3) * SIDE, sy = Math.floor(tile / 3) * SIDE;
            const dest = (n * 9 + tile) * SIDE * SIDE * 4;
            for (let y = 0; y < SIDE; y++) {
              const start = ((sy + SIDE - 1 - y) * SIDE * 3 + sx) * 4;
              data.set(sheet.subarray(start, start + SIDE * 4), dest + y * SIDE * 4);
            }
          }
        });
        const old = uniform.value;
        uniform.value = texture(data, SIDE);
        old.dispose();
      }).catch((error) => {
        retryAt = performance.now() + 15000;
        console.warn('郊外テクスチャの読み込みを再試行します', error);
      }).finally(() => { pending = false; });
    },
    dispose() {
      disposed = true;
      uniform.value.dispose();
    },
  };
}

const SAMPLE = /* glsl */`
uniform highp sampler2DArray uCountry;
vec3 countrySample(float index, vec2 uv) {
  return texture(uCountry, vec3(uv, index)).rgb;
}
`;

const LAYERS = Object.entries(CT).map(([key, value]) => 'const float CT_' + key + ' = ' + value + '.;').join('\n');

export const COUNTRY_TERRAIN = SAMPLE + LAYERS + /* glsl */`
float countryHash(vec2 v) {
  vec3 p = fract(vec3(v.xyx) * vec3(.1031, .11369, .13787));
  p += dot(p, p.yzx + 19.19);
  return fract((p.x + p.y) * p.z);
}
float countryDistrict(vec2 p) {
  vec2 cell = floor(p), f = fract(p);
  vec2 u = f * f * (3. - 2. * f);
  return mix(mix(countryHash(cell), countryHash(cell + vec2(1., 0.)), u.x),
    mix(countryHash(cell + vec2(0., 1.)), countryHash(cell + 1.), u.x), u.y);
}
vec3 countryTerrain(vec3 world, vec3 climate, vec3 n) {
  vec2 p = world.xz;
  vec2 field = mat2(.946, -.324, .324, .946) * p;
  field += vec2(172. * sin(p.y * .00057) + 62. * sin(p.x * .0014),
    118. * sin(p.x * .00069) + 33. * sin((p.x + p.y) * .0019));
  vec2 zone = field / vec2(239., 167.);
  zone.y += .19 * sin(zone.y * 1.6);
  float row = floor(zone.y);
  zone.x += .75 * countryHash(vec2(21., row)) + .27 * sin(zone.x * 1.55 + row * 1.8);
  vec2 q = fract(zone);
  vec2 margin = min(q, 1. - q) * vec2(239., 167.);
  float edge = min(margin.x, margin.y);
  float fieldType = countryHash(floor(zone));
  float patchId = countryHash(floor(p / 510.));
  float district = countryDistrict(p / 4400.);
  float crop = floor(clamp(.63 * fieldType + .37 * district, 0., .999) * 10.);
  float slot = crop;
  if (district > .68 && climate.y > 230.) slot = fieldType > .90 ? CT_ORCHARD : fieldType > .52 ? CT_PASTURE : CT_MEADOW;
  if (district < .24 && climate.y > 510. && fieldType > .75) slot = CT_CLOVER;
  vec2 uv = field / (slot < CT_MEADOW ? 12. : 18.);
  if (climate.y < 540. && fieldType < .36) {
    slot = CT_RICE;
    uv = field / 12.;
  }
  if (edge < 4.8) {
    slot = fieldType < .18 ? CT_HEDGEROW : fieldType < .35 ? CT_EARTH : CT_VERGE;
    uv = p / 14.;
  }
  float bank = climate.y + 12. * sin(p.y * .043) + 8. * sin((p.x + p.y) * .027);
  if (bank < 147.) {
    if (bank < 52.) slot = CT_RIVER_GRAVEL;
    else if (bank < 88.) slot = patchId < .46 ? CT_WET_CLAY : CT_RIVER_GRAVEL;
    else slot = patchId < .68 ? CT_REEDS : CT_WET_CLAY;
    uv = p / 13.;
  } else if (climate.z < 100.) {
    slot = climate.z < 25. ? CT_RIVER_GRAVEL : patchId < .53 ? CT_REEDS : CT_PASTURE;
    uv = p / 16.;
  }
  vec3 lowland = countrySample(slot, uv);
  float mountain = smoothstep(.23, .44, climate.x);
  if (mountain < .01) return lowland;
  float sl = 1. - n.y;
  float alt = world.y;
  float cover = alt > 610. ? CT_ALPINE : alt > 300. ? CT_SPRUCE : CT_DECIDUOUS;
  if (patchId < .20 && alt < 500.) cover = CT_SCRUB;
  if (patchId > .88 && alt < 420.) cover = CT_LEAF_LITTER;
  if (sl > .035 && patchId < .44) cover = CT_TALUS;
  if (sl > .086) cover = patchId < .50 ? CT_SCREE : CT_MOSS_ROCK;
  if (sl > .19) cover = alt > 330. && patchId > .28 ? CT_GRANITE : CT_STRATA;
  vec2 rockUv = mix(p, vec2(abs(n.z) > abs(n.x) ? p.x : p.y, world.y), smoothstep(.1, .53, sl));
  vec3 hill = countrySample(cover, rockUv / (cover < CT_SCREE ? 38. : 19.));
  return mix(lowland, hill, mountain);
}
`;

export function countryGroundMaterial(textures) {
  const material = new THREE.MeshStandardMaterial({ roughness: 0.97, envMapIntensity: 0.24 });
  material.onBeforeCompile = (shader) => {
    shader.uniforms.uCountry = textures.uniform;
    shader.vertexShader = shader.vertexShader
      .replace('#include <common>', '#include <common>\nattribute vec3 countryClimate; varying vec3 vCountryClimate, vCountryWorld, vCountryNormal;')
      .replace('#include <project_vertex>', '#include <project_vertex>\nvCountryWorld = (modelMatrix * vec4(transformed, 1.)).xyz; vCountryClimate = countryClimate; vCountryNormal = objectNormal;');
    shader.fragmentShader = shader.fragmentShader
      .replace('#include <common>', '#include <common>\nvarying vec3 vCountryClimate, vCountryWorld, vCountryNormal;\n' + COUNTRY_TERRAIN)
      .replace('#include <map_fragment>', '#include <map_fragment>\ndiffuseColor.rgb *= countryTerrain(vCountryWorld, vCountryClimate, normalize(vCountryNormal));');
  };
  material.customProgramCacheKey = () => 'countryside-ground';
  return material;
}

export function countrySurfaceMaterial(textures, water = false) {
  const material = new THREE.MeshStandardMaterial({
    roughness: water ? 0.34 : 0.91,
    metalness: water ? 0.12 : 0,
    envMapIntensity: water ? 0.56 : 0.32,
    polygonOffset: true,
    polygonOffsetFactor: -1,
    polygonOffsetUnits: -1,
  });
  material.onBeforeCompile = (shader) => {
    shader.uniforms.uCountry = textures.uniform;
    shader.uniforms.uCountryTime = fxTime;
    shader.vertexShader = shader.vertexShader
      .replace('#include <common>', '#include <common>\nattribute float countryLayer; varying vec2 vCountryUv; flat varying float vCountryLayer;')
      .replace('#include <uv_vertex>', '#include <uv_vertex>\nvCountryUv = uv; vCountryLayer = countryLayer;');
    const coords = water ? 'vCountryUv + vec2(uCountryTime * .009, uCountryTime * .017)' : 'vCountryUv';
    shader.fragmentShader = shader.fragmentShader
      .replace('#include <common>', '#include <common>\nuniform float uCountryTime; varying vec2 vCountryUv; flat varying float vCountryLayer;\n' + SAMPLE)
      .replace('#include <map_fragment>', '#include <map_fragment>\ndiffuseColor.rgb *= countrySample(vCountryLayer, ' + coords + ');');
  };
  material.customProgramCacheKey = () => water ? 'countryside-water' : 'countryside-surfaces';
  return material;
}
