// 道路、河川、住宅のタイル内ジオメトリ。素材番号を頂点に持たせて一括描画する。
import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { boxUV, mx } from '../gfx/builder.js';
import { CT } from '../gfx/countryside-textures.js';
import { clamp, lerp, rng, rr } from '../core/util.js';
import { coastDistance, JOIN_X, RIVERS, riverNear, riverPoint, SEA_LEVEL, TILE, upland } from './countryside-plan.js';

class Batch {
  constructor() {
    this.positions = [];
    this.uvs = [];
    this.layers = [];
    this.parts = [];
  }

  face(vertices, uvs, layer) {
    const order = vertices.length === 4 ? [0, 1, 2, 2, 1, 3] : [0, 1, 2];
    for (const i of order) {
      this.positions.push(...vertices[i]);
      this.uvs.push(...uvs[i]);
      this.layers.push(layer);
    }
  }

  add(geometry, transform, layer, scale) {
    const g = geometry.index ? geometry.toNonIndexed() : geometry;
    if (g !== geometry) geometry.dispose();
    if (scale) boxUV(g, scale);
    g.applyMatrix4(transform);
    const ids = new Float32Array(g.attributes.position.count).fill(layer);
    g.setAttribute('countryLayer', new THREE.BufferAttribute(ids, 1));
    this.parts.push(g);
  }

  geometry() {
    if (this.layers.length) {
      const g = new THREE.BufferGeometry();
      g.setAttribute('position', new THREE.Float32BufferAttribute(this.positions, 3));
      g.setAttribute('uv', new THREE.Float32BufferAttribute(this.uvs, 2));
      g.setAttribute('countryLayer', new THREE.Float32BufferAttribute(this.layers, 1));
      g.computeVertexNormals();
      this.parts.push(g);
    }
    if (this.parts.length < 2) return this.parts[0];
    const merged = mergeGeometries(this.parts);
    for (const part of this.parts) part.dispose();
    return merged;
  }

  mesh(material, castShadow = false) {
    const geometry = this.geometry();
    if (!geometry) return null;
    const result = new THREE.Mesh(geometry, material);
    result.castShadow = castShadow;
    result.receiveShadow = true;
    return result;
  }
}

function section(a, b, t) {
  return {
    x: lerp(a.x, b.x, t), y: lerp(a.y, b.y, t), z: lerp(a.z, b.z, t), s: lerp(a.s, b.s, t),
    nx: lerp(a.nx, b.nx, t), nz: lerp(a.nz, b.nz, t),
  };
}

function roadVertex(p, offset, land, profile = 0, yOffset = 0) {
  const x = p.x + p.nx * offset, z = p.z + p.nz * offset;
  let y = Math.max(p.y + profile, land(x, z) + 0.15);
  if (x < JOIN_X) y = land(x, z) + 0.12 + profile;
  return [x, y + yOffset, z];
}

export function makeRoads(segments, material, ground, detail, junctions) {
  const batch = new Batch();
  for (const { a, b, road } of segments) {
    const bridge = a.bridge || b.bridge;
    const half = road.half;
    const grade = road.id === 0 ? 0 : -0.032;
    const layer = bridge ? CT.BRIDGE : road.id === 0 ? CT.HIGHWAY : road.gravel ? CT.ROAD_GRAVEL : CT.ASPHALT;
    const lc = road.id === 0 ? 7.8 : 6.0;
    const aL = roadVertex(a, -half, ground, grade), aR = roadVertex(a, half, ground, grade);
    const bL = roadVertex(b, -half, ground, grade), bR = roadVertex(b, half, ground, grade);
    const strip = (left, right, start, end, id, offset) => {
      const at = section(a, b, start), endAt = section(a, b, end);
      batch.face([roadVertex(at, left, ground, grade, offset), roadVertex(at, right, ground, grade, offset),
        roadVertex(endAt, left, ground, grade, offset), roadVertex(endAt, right, ground, grade, offset)],
        [[left / lc, at.s / lc], [right / lc, at.s / lc], [left / lc, endAt.s / lc], [right / lc, endAt.s / lc]], id);
    };
    batch.face([aL, aR, bL, bR], [[-half / lc, a.s / lc], [half / lc, a.s / lc],
      [-half / lc, b.s / lc], [half / lc, b.s / lc]], layer);
    if (!detail) continue;
    if (b === road.points.at(-1) && (!road.id || road.gravel)) {
      const radius = road.id ? 7 : 10;
      const center = [b.x, ground(b.x, b.z) + 0.09, b.z];
      const at = (angle) => {
        const x = b.x + Math.cos(angle) * radius, z = b.z + Math.sin(angle) * radius;
        return [x, ground(x, z) + 0.09, z];
      };
      for (let i = 0; i < 16; i++) {
        const vertices = [center, at((i + 1) * Math.PI / 8), at(i * Math.PI / 8)];
        batch.face(vertices, vertices.map(([x, , z]) => [x / 5.2, z / 5.2]), CT.ROAD_GRAVEL);
      }
    }

    for (const side of [-1, 1]) {
      const offset = side * (half + (bridge ? 0.05 : 1.1));
      const x1 = a.x + a.nx * offset, z1 = a.z + a.nz * offset;
      const x2 = b.x + b.nx * offset, z2 = b.z + b.nz * offset;
      const outerA = [x1, bridge ? (side < 0 ? aL : aR)[1] - 0.8 : ground(x1, z1) + 0.035, z1];
      const outerB = [x2, bridge ? (side < 0 ? bL : bR)[1] - 0.8 : ground(x2, z2) + 0.035, z2];
      const edgeA = side < 0 ? aL : aR, edgeB = side < 0 ? bL : bR;
      batch.face(side < 0 ? [outerA, edgeA, outerB, edgeB] : [edgeA, outerA, edgeB, outerB],
        [[0, a.s / 7], [1, a.s / 7], [0, b.s / 7], [1, b.s / 7]], bridge ? CT.RETAINING : CT.ROAD_GRAVEL);
      if (bridge) {
        const railA = [x1, edgeA[1] + 0.69, z1], railB = [x2, edgeB[1] + 0.69, z2];
        const lowA = [x1, edgeA[1] + 0.48, z1], lowB = [x2, edgeB[1] + 0.48, z2];
        const uv = [[0, a.s / 3], [1, a.s / 3], [0, b.s / 3], [1, b.s / 3]];
        batch.face([lowA, railA, lowB, railB], uv, CT.ZINC);
        batch.face([railA, lowA, railB, lowB], uv, CT.ZINC);
        for (let s = Math.ceil(a.s / 9.5) * 9.5; s < b.s; s += 9.5) {
          const t = (s - a.s) / (b.s - a.s), y = lerp(edgeA[1], edgeB[1], t);
          batch.add(new THREE.BoxGeometry(0.12, 0.76, 0.12), mx(lerp(x1, x2, t), y + 0.38, lerp(z1, z2, t)), CT.ZINC, 0.7);
        }
      }
    }
    if (bridge) {
      const pos = a.s + (b.s - a.s) * 0.5;
      const mid = section(a, b, 0.5), y = ground(mid.x, mid.z);
      if (Math.abs(pos - Math.round(pos / 27) * 27) < (b.s - a.s) * 0.5 && mid.y - y > 1.5) {
        batch.add(new THREE.BoxGeometry(1.9, mid.y - y + 0.2, 2.1), mx(mid.x, (mid.y + y) / 2, mid.z), CT.RETAINING, 0.36);
      }
    }

    const nearJunction = road.id === 0
      ? junctions.some((x) => Math.abs((a.x + b.x) * 0.5 - x) < 23)
      : a.s < 18 || b.s > road.length - 18;
    if (road.gravel || nearJunction) continue;
    if (!road.id) {
      strip(-half + 0.54, -half + 0.66, 0, 1, CT.WHITE_PAINT, 0.034);
      strip(half - 0.66, half - 0.54, 0, 1, CT.WHITE_PAINT, 0.034);
    }
    if (bridge) {
      strip(-0.073, 0.073, 0, 1, CT.OCHRE, 0.04);
    } else {
      for (let s = Math.floor(a.s / 13) * 13; s < b.s; s += 13) {
        const from = Math.max(a.s, s), to = Math.min(b.s, s + 4.8);
        if (to > from) strip(-0.076, 0.076, (from - a.s) / (b.s - a.s), (to - a.s) / (b.s - a.s), CT.WHITE_PAINT, 0.04);
      }
    }
  }
  return batch.mesh(material);
}

const HOUSE = [
  [CT.PLASTER, CT.CERAMIC, CT.RUBBLE], [CT.CEDAR, CT.SLATE, CT.FOUNDATION],
  [CT.SIDING, CT.SEAM_ROOF, CT.FOUNDATION], [CT.BRICK, CT.TERRACOTTA, CT.RUBBLE],
  [CT.PLASTER, CT.SEAM_ROOF, CT.FOUNDATION], [CT.CEDAR, CT.CERAMIC, CT.RUBBLE],
];

export function prepareHouses(hamlets, terrain, obbs) {
  for (const hamlet of hamlets) for (const h of hamlet.houses) {
    const cs = Math.cos(h.yaw), sn = Math.sin(h.yaw), lows = [];
    for (const x of [-h.w * 0.5, h.w * 0.5]) for (const z of [-h.d * 0.5, h.d * 0.5]) {
      lows.push(terrain(h.x + x * cs + z * sn, h.z - x * sn + z * cs));
    }
    h.floor = Math.max(...lows) + 0.31;
    h.bottom = Math.min(...lows) - 0.24;
    obbs.push([h.x, h.z, h.w * 0.5, h.d * 0.5, cs, -sn, h.floor + h.wall + h.roof, 1]);
  }
}

export function makeHouses(houses, material, terrain) {
  const batch = new Batch();
  for (const h of houses) {
    const [wall, roof, base] = HOUSE[h.style];
    const w = h.w, d = h.d, high = h.wall, rise = h.roof;
    const cos = Math.cos(h.yaw), sin = Math.sin(h.yaw);
    const world = ([x, y, z]) => [h.x + x * cos + z * sin, h.floor + y, h.z - x * sin + z * cos];
    const box = (layer, width, height, depth, x, y, z, sample = 0.42) => {
      const at = world([x, y, z]);
      batch.add(new THREE.BoxGeometry(width, height, depth), mx(at[0], at[1], at[2], 0, h.yaw), layer, sample);
    };
    const face = (id, vertices, uv) => batch.face(vertices.map(world), uv, id);
    box(base, w + 0.36, h.floor - h.bottom, d + 0.34, 0, (h.bottom - h.floor) / 2, 0);
    box(wall, w, high, d, 0, high / 2, 0, 0.38);

    const gableUv = [[0, 0], [d / 2.6, 0], [d / 5.2, rise / 2.6]];
    face(wall, [[-w / 2, high, -d / 2], [-w / 2, high, d / 2], [-w / 2, high + rise, 0]], gableUv);
    face(wall, [[w / 2, high, d / 2], [w / 2, high, -d / 2], [w / 2, high + rise, 0]], gableUv);
    const ex = w / 2 + 0.64, ez = d / 2 + 0.62;
    const outerY = high - 0.62 * rise / (d * 0.5);
    const roofUv = [[0, 0], [2 * ex / 2.4, 0], [0, ez / 2.4], [2 * ex / 2.4, ez / 2.4]];
    face(roof, [[-ex, outerY, ez], [ex, outerY, ez], [-ex, high + rise, 0], [ex, high + rise, 0]], roofUv);
    face(roof, [[ex, outerY, -ez], [-ex, outerY, -ez], [ex, high + rise, 0], [-ex, high + rise, 0]], roofUv);
    box(CT.TIMBER, ex * 2, 0.20, 0.14, 0, outerY - 0.08, ez);
    box(CT.TIMBER, ex * 2, 0.20, 0.14, 0, outerY - 0.08, -ez);
    box(roof, ex * 2, 0.19, 0.31, 0, high + rise, 0);
    const doorX = -w * 0.19;
    box(CT.TIMBER, 1.46, 2.37, 0.14, doorX, 1.16, d / 2 + 0.055);
    box(CT.DOOR, 1.19, 2.15, 0.08, doorX, 1.09, d / 2 + 0.14, 0.46);
    box(CT.RETAINING, 1.65, 0.24, 0.67, doorX, -0.10, d / 2 + 0.31);
    const rows = high > 5 ? [1.65, high - 1.25] : [1.65];
    for (const y of rows) {
      for (const x of [-w * 0.34, w * 0.21, w * 0.36]) {
        box(CT.TIMBER, 1.51, 1.26, 0.13, x, y, d / 2 + 0.045);
        box(CT.GLASS, 1.28, 1.04, 0.07, x, y, d / 2 + 0.13);
        box(CT.TIMBER, 0.036, 1.06, 0.033, x, y, d / 2 + 0.18);
      }
      for (const side of [-1, 1]) {
        box(CT.TIMBER, 0.14, 1.23, 1.58, side * (w / 2 + 0.04), y, -d * 0.08);
        box(CT.GLASS, 0.06, 1.02, 1.37, side * (w / 2 + 0.12), y, -d * 0.08);
      }
      box(CT.GLASS, 1.38, 1.1, 0.07, w * 0.22, y, -d / 2 - 0.06);
    }
    if (h.style === 1 || h.style === 5) {
      box(CT.CORRUGATED, w * .42, 2.28, 3.5, w * .2, 1.12, -d / 2 - 1.62);
      box(CT.SEAM_ROOF, w * .45, 0.12, 3.7, w * .2, 2.31, -d / 2 - 1.7);
    }

    const yard = (u, v) => {
      const [x, , z] = world([lerp(-w / 2 - 3, w / 2 + 3, u), 0, lerp(-d / 2 - 5, d / 2 + h.garden + 3, v)]);
      return [x, terrain(x, z) + 0.033, z];
    };
    const yardLayer = h.id % 5 === 0 ? CT.CLOVER : CT.VERGE;
    for (let u = 0; u < 4; u++) for (let v = 0; v < 5; v++) {
      const quad = [yard(u / 4, v / 5), yard(u / 4, (v + 1) / 5), yard((u + 1) / 4, v / 5), yard((u + 1) / 4, (v + 1) / 5)];
      batch.face(quad, quad.map(([x, , z]) => [x / 5, z / 5]), yardLayer);
    }

    const [doorWX, , doorWZ] = world([doorX, 0, d / 2 + 0.73]);
    const driveLayer = [CT.GARDEN_GRAVEL, CT.DRIVEWAY, CT.PAVERS][h.id % 3];
    const driveDistance = Math.hypot(doorWX - h.driveX, doorWZ - h.driveZ);
    const dx = (h.driveZ - doorWZ) / driveDistance * 1.45, dz = (doorWX - h.driveX) / driveDistance * 1.45;
    const point = (step, side) => {
      const x = lerp(h.driveX, doorWX, step) + side * dx, z = lerp(h.driveZ, doorWZ, step) + side * dz;
      return [x, terrain(x, z) + 0.10, z];
    };
    for (let i = 0; i < 7; i++) {
      const uv0 = i * driveDistance / 18, uv1 = (i + 1) * driveDistance / 18;
      batch.face([point(i / 7, -1), point(i / 7, 1), point((i + 1) / 7, -1), point((i + 1) / 7, 1)],
        [[0, uv0], [1, uv0], [0, uv1], [1, uv1]], driveLayer);
    }

    const gardenLayer = h.id % 3 === 0 ? CT.HEDGE : CT.FENCE;
    for (const side of [-1, 1]) {
      for (let i = 0; i < 5; i++) {
        const x = side * (w / 2 + 2.3), z = d / 2 + h.garden - 2.7 * i;
        const [px, , pz] = world([x, 0, z]);
        const y = terrain(px, pz) - h.floor;
        box(gardenLayer, gardenLayer === CT.HEDGE ? 0.62 : 0.13, 0.92, 2.76, x, y + 0.40, z);
      }
    }
  }
  return batch.mesh(material, true);
}

export function makeRiver(i, j, material) {
  const batch = new Batch(), xMin = JOIN_X + i * TILE, zMin = j * TILE;
  for (const r of RIVERS) {
    if (xMin > r.x + 1380 || xMin + TILE < r.x - 1380) continue;
    const z0 = Math.max(zMin, r.source), z1 = Math.min(zMin + TILE, r.mouth - 1250);
    for (let z = z0; z < z1; z += 24) {
      const a = riverPoint(r, z), b = riverPoint(r, Math.min(z + 24, z1));
      const mid = (a.x + b.x) * 0.5;
      if (mid < xMin || mid >= xMin + TILE) continue;
      const leftA = a.x - a.half - 14, rightA = a.x + a.half + 14;
      const leftB = b.x - b.half - 14, rightB = b.x + b.half + 14;
      batch.face([[rightA, a.y, a.z], [leftA, a.y, a.z], [rightB, b.y, b.z], [leftB, b.y, b.z]],
        [[rightA / 19, a.z / 22], [leftA / 19, a.z / 22], [rightB / 19, b.z / 22], [leftB / 19, b.z / 22]], CT.WATER);
    }
  }
  return batch.mesh(material);
}

export function treeModels() {
  return [CT.ORCHARD, CT.DECIDUOUS, CT.SPRUCE].map((layer, i) => {
    const b = new Batch();
    b.add(new THREE.CylinderGeometry(0.12, 0.22, 3.7, 5), mx(0, 1.7, 0), CT.TIMBER, 0.6);
    if (i === 2) {
      for (let n = 0; n < 3; n++) {
        b.add(new THREE.ConeGeometry(2.7 - n * 0.53, 4.4 - n * 0.45, 7), mx(0, 3.2 + n * 1.65, 0, 0, n * 0.41), layer);
      }
    } else {
      b.add(new THREE.IcosahedronGeometry(2.65, 1), mx(0, 4.7, 0, 0, 0.3, 0, 1.15, i ? 1.0 : 0.7, 1), layer);
      b.add(new THREE.IcosahedronGeometry(1.66, 0), mx(1.37, 3.7, 0.88, 0, 0.1, 0, 1.1, 0.86, 1), layer);
    }
    return b.geometry();
  });
}

export function makeTreeTile(i, j, geometries, material, terrain, nearest, houses) {
  const rand = rng((i + 41) * 74389 + (j + 51) * 123923);
  const batches = [[], [], []], side = TILE / 28;
  const testRoad = {};
  for (let a = 0; a < 28; a++) for (let b = 0; b < 28; b++) {
    const x = JOIN_X + i * TILE + (a + rand()) * side, z = j * TILE + (b + rand()) * side;
    const hill = upland(x, z), stream = riverNear(x, z);
    const random = rand();
    let density = hill > 0.37 ? 0.48 : 0.048;
    if (stream) density += stream.distance > stream.half + 25 && stream.distance < 255 ? 0.36 : 0;
    if (random > density || coastDistance(x, z) < 90 || nearest(x, z, 17, testRoad)
      || houses.some((h) => Math.hypot(h.x - x, h.z - z) < 25)) continue;
    if (stream && stream.distance < stream.half + 23) continue;
    const y = terrain(x, z);
    if (y < SEA_LEVEL + 1 || y > 840) continue;
    const type = hill > 0.37 ? (y > 260 ? 2 : 1) : random < 0.024 ? 0 : 1;
    const scale = rr(rand, 0.62, 1.9);
    batches[type].push({ x, z, y, scale, turn: rand() * 6.28 });
  }
  return batches.flatMap((data, type) => {
    if (!data.length) return [];
    const im = new THREE.InstancedMesh(geometries[type], material, data.length);
    data.forEach((t, n) => im.setMatrixAt(n, mx(t.x, t.y, t.z, 0, t.turn, 0, t.scale)));
    im.computeBoundingSphere();
    return [im];
  });
}
