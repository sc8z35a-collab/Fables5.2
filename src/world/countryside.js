// 拡張地形は固定サイズの区画で読み込み、視点が近い区画だけ細かくする。
import * as THREE from 'three';
import { countryGroundMaterial, countrySurfaceMaterial } from '../gfx/countryside-textures.js';
import { clamp, lerp, smooth } from '../core/util.js';
import { coastDistance, JOIN_X, LAND_EAST, RIVERS, riverNear, riverPoint, SEA_LEVEL, TILE, UPLAND_LIMIT, upland } from './countryside-plan.js';
import { makeHouses, makeRiver, makeRoads, makeTreeTile, prepareHouses, treeModels } from './countryside-meshes.js';

const STEPS = [32, 128, 256];
const EDGE_STEP = STEPS.at(-1), RIVER_STEP = 64;

function gridSample(ix, iz, fx, fz, height) {
  const b = height(ix + 1, iz), c = height(ix, iz + 1);
  if (fx + fz <= 1) {
    const a = height(ix, iz);
    return a + (b - a) * fx + (c - a) * fz;
  }
  const d = height(ix + 1, iz + 1);
  return d + (c - d) * (1 - fx) + (b - d) * (1 - fz);
}

function terrainMesh(i, j, step, altitude, material) {
  const x0 = JOIN_X + i * TILE, z0 = j * TILE, size = TILE / step, count = size + 1;
  const height = new Float32Array(count * count);
  const pos = new Float32Array(height.length * 3), climate = new Float32Array(pos.length);
  const idx = new Uint16Array(size * size * 6);
  for (let v = 0; v < count; v++) for (let u = 0; u < count; u++) {
    const x = x0 + u * step, z = z0 + v * step, k = v * count + u, l = k * 3;
    const river = riverNear(x, z);
    height[k] = altitude(x, z, river);
    pos.set([u * step, height[k], v * step], l);
    climate.set([upland(x, z), river?.distance ?? 1150, clamp(coastDistance(x, z), -1100, 1100)], l);
  }
  let k = 0;
  for (let v = 0; v < size; v++) for (let u = 0; u < size; u++) {
    const a = v * count + u, b = a + 1, c = a + count, d = c + 1;
    idx[k++] = a; idx[k++] = c; idx[k++] = b;
    idx[k++] = b; idx[k++] = c; idx[k++] = d;
  }
  const geo = new THREE.BufferGeometry();
  geo.setIndex(new THREE.BufferAttribute(idx, 1));
  geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  geo.setAttribute('countryClimate', new THREE.BufferAttribute(climate, 3));
  geo.computeVertexNormals();
  const mesh = new THREE.Mesh(geo, material);
  mesh.position.set(x0, 0, z0);
  mesh.receiveShadow = true;
  return { mesh, height, stride: count };
}

export function countryside(plan, legacyGround, textures, obbs) {
  const group = new THREE.Group();
  group.name = '地球東部郊外';
  const chunks = new Map(), riverTiles = new Set();
  for (const river of RIVERS) for (let z = river.source; z <= river.mouth; z += RIVER_STEP) {
    const { x } = riverPoint(river, z), j = Math.floor(z / TILE);
    const first = Math.floor((x - JOIN_X - 380) / TILE), last = Math.floor((x - JOIN_X + 380) / TILE);
    for (let i = first; i <= last; i++) riverTiles.add(plan.indexKey(i, j));
  }
  const landMaterial = countryGroundMaterial(textures);
  const surfaceMaterial = countrySurfaceMaterial(textures);
  const riverMaterial = countrySurfaceMaterial(textures, true);
  const trees = treeModels();
  const roadQuery = {};
  const junctions = plan.roads.slice(1).flatMap((road) => [road.points[0].x, road.points.at(-1).x]);

  function seamlessHeight(x, z, river) {
    const expansion = plan.terrain(x, z, river);
    if (x >= JOIN_X + 320) return expansion;
    return lerp(legacyGround(JOIN_X - 0.001, z), expansion, smooth(JOIN_X, JOIN_X + 320, x));
  }

  // 区画の縁は粗い格子に合わせ、LOD が異なる隣の区画とも連続させる。
  function altitude(x, z, river) {
    if (x === JOIN_X) return legacyGround(JOIN_X - 0.001, z);
    const crossingX = (x - JOIN_X) % TILE === 0, crossingZ = z % TILE === 0;
    if (!crossingX && !crossingZ) return seamlessHeight(x, z, river);
    const i = Math.floor((x - JOIN_X) / TILE), j = Math.floor(z / TILE);
    const waterway = crossingX ? riverTiles.has(plan.indexKey(i - 1, j)) && riverTiles.has(plan.indexKey(i, j))
      : riverTiles.has(plan.indexKey(i, j - 1)) && riverTiles.has(plan.indexKey(i, j));
    const step = waterway ? RIVER_STEP : EDGE_STEP;
    if (crossingX && z % step !== 0) {
      const a = Math.floor(z / step) * step;
      return lerp(seamlessHeight(x, a), seamlessHeight(x, a + step), (z - a) / step);
    }
    if (crossingZ && (x - JOIN_X) % step !== 0) {
      const a = JOIN_X + Math.floor((x - JOIN_X) / step) * step;
      return lerp(seamlessHeight(a, z), seamlessHeight(a + step, z), (x - a) / step);
    }
    return seamlessHeight(x, z, river);
  }

  function terrain(x, z) {
    if (x < JOIN_X) return legacyGround(x, z);
    const i = Math.floor((x - JOIN_X) / TILE), j = Math.floor(z / TILE);
    const x0 = JOIN_X + i * TILE, z0 = j * TILE, step = STEPS[0];
    const tx = (x - x0) / step, tz = (z - z0) / step, ix = Math.floor(tx), iz = Math.floor(tz);
    const chunk = chunks.get(plan.indexKey(i, j));
    const read = chunk?.level === 0
      ? (u, v) => chunk.height[v * chunk.stride + u]
      : (u, v) => Math.fround(altitude(x0 + u * step, z0 + v * step));
    return gridSample(ix, iz, tx - ix, tz - iz, read);
  }
  prepareHouses(plan.hamlets, terrain, obbs);

  function heightAt(x, z) {
    const ground = terrain(x, z);
    const found = plan.nearest(x, z, 6, roadQuery);
    if (!found || found.distance > found.segment.road.half + 0.08) return ground;
    if (x < JOIN_X) return ground + 0.12;
    return Math.max(ground + 0.15, lerp(found.segment.a.y, found.segment.b.y, found.t) - (found.segment.road.id ? 0.032 : 0));
  }

  function waterAt(x, z) {
    if (x < JOIN_X) return SEA_LEVEL;
    const river = riverNear(x, z);
    return river && river.distance < river.half + 14 ? river.y : SEA_LEVEL;
  }

  function drop(chunk) {
    for (const mesh of chunk.objects) {
      group.remove(mesh);
      if (mesh.isInstancedMesh) mesh.dispose();
      else mesh.geometry.dispose();
    }
  }

  function build(i, j, level, key) {
    const x = JOIN_X + (i + 0.5) * TILE, z = (j + 0.5) * TILE;
    const roads = plan.tileRoads.get(key) || [];
    const homes = plan.tileHouses.get(key) || [];
    const chunk = { i, j, level, objects: [] };
    chunks.set(key, chunk);
    if (i >= 0 && coastDistance(x, z) > -TILE * 0.84) {
      const step = riverTiles.has(key) ? Math.min(STEPS[level], RIVER_STEP) : STEPS[level];
      const tile = terrainMesh(i, j, step, altitude, landMaterial);
      chunk.height = tile.height;
      chunk.stride = tile.stride;
      chunk.objects.push(tile.mesh);
      const water = makeRiver(i, j, riverMaterial);
      if (water) chunk.objects.push(water);
    }
    if (roads.length) chunk.objects.push(makeRoads(roads, surfaceMaterial, terrain, level === 0, junctions));
    if (homes.length && level < 2) chunk.objects.push(makeHouses(homes, surfaceMaterial, terrain));
    if (i >= 0 && level === 0 && coastDistance(x, z) > -TILE * 0.72) {
      chunk.objects.push(...makeTreeTile(i, j, trees, surfaceMaterial, terrain, plan.nearest, homes));
    }
    group.add(...chunk.objects);
  }

  function update(cx, cz, scale = 1, prime = false) {
    if (cx > -3000 && Math.abs(cz) < 70000) textures.load();
    if (cx < 1500 - 5000 || Math.abs(cz) > 75000) {
      if (chunks.size) {
        for (const chunk of chunks.values()) drop(chunk);
        chunks.clear();
      }
      return;
    }
    const range = scale < 1 ? 9400 : scale > 1 ? 17800 : 13000;
    const near = scale < 1 ? 1050 : 1500;
    const medium = scale < 1 ? 3800 : 5600;
    const from = Math.max(Math.floor((cx - range - JOIN_X) / TILE), -5);
    const to = Math.min(Math.floor((cx + range - JOIN_X) / TILE), Math.floor((LAND_EAST - JOIN_X) / TILE) + 1);
    const need = [];
    const marked = new Set();
    for (let i = from; i <= to; i++) for (let j = Math.floor((cz - range) / TILE); j <= Math.floor((cz + range) / TILE); j++) {
      const x = JOIN_X + (i + 0.5) * TILE, z = (j + 0.5) * TILE;
      const dx = Math.max(0, Math.abs(cx - x) - TILE * 0.5), dz = Math.max(0, Math.abs(cz - z) - TILE * 0.5);
      const d = Math.hypot(dx, dz);
      if (d > range) continue;
      const key = plan.indexKey(i, j);
      if (i < 0 ? !plan.tileRoads.has(key) : coastDistance(x, z) <= -TILE * 0.84) continue;
      const chunk = chunks.get(key);
      const level = d < near + (chunk?.level === 0 ? 390 : 0) ? 0 : d < medium + (chunk?.level === 1 ? 420 : 0) ? 1 : 2;
      marked.add(key);
      if (chunk?.level !== level) need.push({ i, j, key, level, d, chunk });
    }
    for (const [key, chunk] of chunks) {
      if (marked.has(key)) continue;
      drop(chunk);
      chunks.delete(key);
    }
    need.sort((a, b) => a.d - b.d);
    let budget = prime ? Infinity : 5;
    for (const { i, j, key, level, chunk } of need) {
      const cost = level === 0 ? 4 : riverTiles.has(key) || level === 1 ? 2 : 1;
      if (cost > budget) break;
      budget -= cost;
      if (chunk) drop(chunk);
      build(i, j, level, key);
    }
  }

  function region(x, z) {
    if (x < JOIN_X) return null;
    if (coastDistance(x, z) <= 0) return '大洋';
    return upland(x, z) >= UPLAND_LIMIT ? '東部丘陵・山地' : '東部田園地帯';
  }

  function place(x, z) {
    const area = region(x, z);
    if (!area || area === '大洋') return area;
    for (const hamlet of plan.hamlets) {
      if (Math.hypot(hamlet.x - x, hamlet.z - z) < 770) return hamlet.name;
    }
    const found = plan.nearest(x, z, 65, roadQuery);
    return found ? found.segment.road.name : area;
  }

  return {
    group, heightAt, waterAt, place, region, update,
    keepLegacyVeg: (x, z) => x < JOIN_X + 1700 && Math.abs(z) < 13900,
    pois: [
      { x: plan.roads[0].points[0].x + 750, z: plan.roads[0].points.find((p) => p.x >= 2980).z, name: '東部幹線入口', range: 12000 },
      ...plan.hamlets.map(({ x, z, name }) => ({ x, z, name, range: 23000 })),
      { x: plan.roads[0].points.at(-1).x, z: plan.roads[0].points.at(-1).z, name: '東岬・幹線終点', range: 20000 },
    ].map((p) => ({ ...p, y: heightAt(p.x, p.z) + 18 })),
    dispose() {
      for (const c of chunks.values()) drop(c);
      chunks.clear();
      for (const m of [landMaterial, surfaceMaterial, riverMaterial]) m.dispose();
      for (const model of trees) model.dispose();
      textures.dispose();
    },
  };
}
