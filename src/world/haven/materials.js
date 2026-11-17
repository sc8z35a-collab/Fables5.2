// WebP sheets are cropped and reduced at build time. Extracting an independent
// image for each tile keeps repeating UVs and mipmaps inside its own material.
import * as THREE from 'three';

const loader = new THREE.ImageLoader();
const sheets = new Map();
const images = new Map();
const materials = new Map();

function loadTile(tile) {
  if (images.has(tile)) return images.get(tile);
  const sheetIndex = Math.floor(tile / 9), cell = tile % 9;
  if (!sheets.has(sheetIndex)) {
    const file = 'sheet-' + String(sheetIndex).padStart(2, '0') + '.webp';
    const url = new URL('../../../assets/haven/' + file, import.meta.url);
    sheets.set(sheetIndex, loader.loadAsync(url.href));
  }
  const ready = sheets.get(sheetIndex).then((image) => {
    const side = image.width / 3;
    // Sheet 35 combines full-size shop surfaces and two small fitting labels.
    const size = tile === 322 || tile === 323 ? Math.round(side / 2) : side;
    const canvas = document.createElement('canvas');
    canvas.width = canvas.height = size;
    canvas.getContext('2d').drawImage(image, cell % 3 * side, Math.floor(cell / 3) * side, size, size, 0, 0, size, size);
    return canvas;
  });
  images.set(tile, ready);
  return ready;
}

export function havenMaterial(tile, use = 'surface') {
  const key = tile + ':' + use;
  if (materials.has(key)) return materials.get(key);

  const map = new THREE.Texture();
  map.colorSpace = THREE.SRGBColorSpace;
  if (use !== 'panel') map.wrapS = map.wrapT = THREE.RepeatWrapping;
  map.anisotropy = 2;
  loadTile(tile).then((image) => {
    map.image = image;
    map.needsUpdate = true;
  }).catch((error) => {
    console.error('Haven Ring texture', tile, error);
  });

  const exterior = use === 'hull';
  const material = new THREE.MeshStandardMaterial({
    map,
    roughness: exterior ? 0.66 : 0.88,
    metalness: exterior ? 0.34 : 0.05,
  });
  material.userData.uvs = exterior ? 0.033 : use === 'panel' ? 0 : 0.42;
  material.userData.havenTile = tile;
  materials.set(key, material);
  return material;
}
