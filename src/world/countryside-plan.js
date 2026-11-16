// 地球郊外の地理・道路網。地表座標はすべてメートル。
import { clamp, fbm, lerp, ridge, rng, rr, smooth } from '../core/util.js';

export const JOIN_X = 12000;
export const LAND_EAST = 142000;
export const SEA_LEVEL = -1.2;
export const TILE = 2048;
const INDEX_CELL = 512;
const ROAD_STEP = 24;
const km = (n) => n * 1000;

function shores(x) {
  const breadth = smooth(JOIN_X, 35200, x);
  return [
    -10100 - breadth * (39700 + 7200 * Math.sin(x / 17200) + 2900 * Math.sin(x / 5500)),
    1650 + 180 * Math.sin(x / 1900) + breadth * (22600 + 4300 * Math.sin(x / 16100 + 1) + 2600 * Math.sin(x / 7900)),
  ];
}

export function coastDistance(x, z) {
  const [north, south] = shores(x);
  const east = LAND_EAST - 1900 * (1 + Math.sin(z / 10000 - 0.8)) / 2;
  return Math.min(z - north, south - z, east - x);
}

export function countrysideFlight(x, z) {
  return x >= JOIN_X - 2000 && coastDistance(x, z) >= -10500;
}

// 岬の手前まで続く山並みと、南岸の独立した丘陵。平野との境界には緩い裾野を設ける。
export function upland(x, z) {
  const [north, south] = shores(x);
  const t = (z - north) / (south - north);
  const ridgeCenter = 0.181 + 0.028 * Math.sin(x / 9400) + 0.018 * Math.sin(x / 4800 + 0.5);
  const northBelt = 1 - Math.abs(t - ridgeCenter) / 0.123;
  const southHills = (1 - Math.abs(t - 0.894 - 0.016 * Math.sin(x / 6300)) / 0.062)
    * (0.64 + 0.36 * Math.sin(x / 9200 + 2));
  return Math.max(0, northBelt, southHills) * smooth(13900, 23500, x);
}

export const UPLAND_LIMIT = 0.3542;

export const RIVERS = [
  { x: 31800, source: -25000, phase: 0.7 },
  { x: 67300, source: -30600, phase: 2.4 },
  { x: 106800, source: -30600, phase: 4.8 },
].map((river) => ({ ...river, mouth: shores(river.x)[1] + 1050 }));

export function riverPoint(river, z) {
  const reach = smooth(river.source, river.mouth, z);
  const x = river.x + Math.sin(z / 2160 + river.phase) * 1020 + Math.sin(z / 690 + river.phase * 0.5) * 202;
  const half = lerp(26, 71, reach) * smooth(river.source - 100, river.source + 1400, z);
  const y = lerp(83, SEA_LEVEL, clamp((z - river.source) / (river.mouth - river.source - 1250), 0, 1));
  return { x, z, half, y };
}

export function riverNear(x, z) {
  for (const river of RIVERS) {
    if (Math.abs(x - river.x) > 2580 || z < river.source || z > river.mouth) continue;
    const point = riverPoint(river, z);
    const distance = Math.abs(x - point.x);
    if (distance < 1150) return { ...point, distance };
  }
  return null;
}

export function naturalHeight(x, z, river = riverNear(x, z), riverBed = true) {
  const shore = coastDistance(x, z);
  const coastalSlope = SEA_LEVEL + Math.max(-45, shore * 0.032);
  if (shore <= 0) return coastalSlope;

  const hills = upland(x, z);
  const plain = 18 + fbm(x / 6600, z / 7200, 3, 42) * 69
    + fbm(x / 2320, z / 1900, 3, 26) * 24 + fbm(x / 460, z / 390, 2, 87) * 3.4;
  const mountains = smooth(UPLAND_LIMIT - 0.12, 0.95, hills)
    * (245 + ridge(x / 3300, z / 2900, 4, 21) * 880 + fbm(x / 740, z / 910, 3, 14) * 115) * lerp(1, 0.36, smooth(-500, 3500, z));
  let height = lerp(coastalSlope, plain + mountains, smooth(0, 910, shore));
  if (river && river.half > 0) {
    const valley = river.y + 3.9 + 0.005 * river.distance;
    height = lerp(height, valley, smooth(1100, river.half + 45, river.distance));
    if (riverBed) height = lerp(river.y - 3.3, height, smooth(river.half * 0.48, river.half + 29, river.distance));
  }
  return height;
}

const CITY_X = 2230;
const CITY_Z = -300 + (CITY_X - 300) * Math.tan(0.55);
const MAIN_ANCHORS = [
  [CITY_X, CITY_Z], [2600, 1065], [4700, 575], [8000, 355], [12000, -1050],
  ...[[18, -4.3], [24, -12], [32, -19.5], [40, -12], [48, 1.2], [56, 7],
    [65, 1], [73, -12], [81, -19.2], [90, -12], [98, 1.5], [108, 9.5],
    [117, 3], [126, -10.5], [133, -12.5], [139, -7]].map(([x, z]) => [km(x), km(z) * 0.9304]),
];

const SIDE_ROADS = [
  // 始点・終点が数値だけの場合は幹線と接続する。
  ['果樹園環状線', 3.2, false, [13.5, [16, -6], [20, -10.8], [25, -15.5], 29]],
  ['堤防街道', 3.5, false, [24, [28, -4], [34, 2.5], [37, 5], 42]],
  ['北丘陵線', 2.9, true, [41.5, [45, -16], [52, -23], [58, -25]]],
  ['浜見環状線', 3.6, false, [47, [50, 6], [54, 10.5], [59, 12], [62, 8.5], 64]],
  ['渓谷環状線', 3.5, false, [65.5, [68, -10], [71, -21], [77, -25], [82, -25], 85]],
  ['水田連絡線', 3.2, false, [77.5, [80, -8], [83, 0], [87, 6], [92, 6.5], 96]],
  ['杉峠線', 2.8, true, [88, [91, -19], [96, -23.3], [101, -26.7], [105, -31.2]]],
  ['南原街道', 3.7, false, [99, [102, 13], [110, 15], [117, 13], 123]],
  ['東の森環状線', 3.4, false, [115.5, [118, -10], [124, -23], [132, -24], 138]],
];

function slope(anchors, i) {
  const a = anchors[Math.max(0, i - 1)], b = anchors[Math.min(i + 1, anchors.length - 1)];
  return (b[1] - a[1]) / (b[0] - a[0]);
}

// x が単調な経路の三次補間。曲がり角と接続点を含めて等間隔に近い折れ線へ落とす。
function sampleRoute(anchors, extraKnots = []) {
  const points = [];
  for (let i = 0; i < anchors.length - 1; i++) {
    const [x0, z0] = anchors[i], [x1, z1] = anchors[i + 1], width = x1 - x0;
    const m0 = i === 0 && x0 === CITY_X ? Math.tan(0.55) : slope(anchors, i);
    const m1 = slope(anchors, i + 1);
    const knots = [x0, ...extraKnots.filter((x) => x > x0 && x < x1), x1];
    for (let j = 1; j < knots.length; j++) {
      const from = knots[j - 1], to = knots[j];
      const count = Math.ceil((to - from) * Math.hypot(1, Math.max(Math.abs(m0), Math.abs(m1), Math.abs((z1 - z0) / width))) / ROAD_STEP);
      for (let k = 0; k < count; k++) {
        const x = lerp(from, to, k / count), t = (x - x0) / width, t2 = t * t, t3 = t2 * t;
        const z = (2 * t3 - 3 * t2 + 1) * z0 + (t3 - 2 * t2 + t) * m0 * width
          + (-2 * t3 + 3 * t2) * z1 + (t3 - t2) * m1 * width;
        points.push({ x, z });
      }
    }
  }
  const [x, z] = anchors.at(-1);
  points.push({ x, z });
  return points;
}

export function roadAtX(road, x) {
  const ps = road.points;
  let lo = 0, hi = ps.length - 1;
  while (hi - lo > 1) {
    const mid = (hi + lo) >> 1;
    if (x >= ps[mid].x) lo = mid;
    else hi = mid;
  }
  const a = ps[lo], b = ps[hi], t = clamp((x - a.x) / (b.x - a.x), 0, 1);
  return { x: lerp(a.x, b.x, t), y: lerp(a.y, b.y, t), z: lerp(a.z, b.z, t), nx: lerp(a.nx, b.nx, t), nz: lerp(a.nz, b.nz, t) };
}

function roadProfile(points, legacyHeight, joinStart, joinEnd) {
  const heights = points.map(({ x, z }) => {
    const dry = naturalHeight(x, z, riverNear(x, z), false);
    return x < JOIN_X ? lerp(legacyHeight(x, z), dry, smooth(9000, JOIN_X, x)) : dry;
  });
  let length = 0;
  points.forEach((point, i) => {
    let y = 0, weight = 0;
    for (let d = -4; d <= 4; d++) {
      const w = 5 - Math.abs(d);
      y += heights[clamp(i + d, 0, points.length - 1)] * w;
      weight += w;
    }
    point.y = y / weight + 0.46;
    if (joinStart && i < 12) point.y = lerp(joinStart.y, point.y, smooth(0, 11, i));
    if (joinEnd && points.length - 1 - i < 12) point.y = lerp(joinEnd.y, point.y, smooth(0, 11, points.length - 1 - i));
    const next = points[Math.min(i + 1, points.length - 1)], prev = points[Math.max(0, i - 1)];
    const dx = next.x - prev.x, dz = next.z - prev.z, n = Math.hypot(dx, dz);
    point.nx = -dz / n;
    point.nz = dx / n;
    const river = riverNear(point.x, point.z);
    point.bridge = !!river && river.distance < river.half + 38;
    if (i) length += Math.hypot(point.x - prev.x, point.z - prev.z, point.y - prev.y);
    point.s = length;
  });
  return length;
}

const HAMLETS = [
  ['風見の里', 1, 17.1], ['川霧の里', 2, 34.3], ['南浜の里', 4, 57.7],
  ['穂波の里', 6, 85.5], ['金梨の里', 8, 113.2], ['東野の里', 9, 129.4],
];

function placeHouses(roads) {
  const rand = rng(1729);
  return HAMLETS.map(([name, roadId, x], village) => {
    const road = roads[roadId];
    const center = roadAtX(road, km(x));
    const houses = [-133, -72, -20, 48, 116].map((offset, lot) => {
      const at = roadAtX(road, km(x) + offset + rr(rand, -10, 10));
      const side = (village + lot) % 2 === 0 ? 1 : -1;
      const setback = rr(rand, 20, 35);
      const fx = -side * at.nx, fz = -side * at.nz;
      return {
        id: village * 5 + lot + 1, style: (village + lot * 3) % 6,
        x: at.x - fx * setback, z: at.z - fz * setback, yaw: Math.atan2(fx, fz),
        driveX: at.x - fx * (road.half - 0.6), driveZ: at.z - fz * (road.half - 0.6),
        w: rr(rand, 9.5, 15.4), d: rr(rand, 7.4, 11.4), wall: rr(rand, 3.1, 4.0) + ((village + lot) % 3 === 2 ? 2.55 : 0),
        roof: rr(rand, 2.0, 3.4), garden: rr(rand, 9, 12),
      };
    });
    return { name, x: center.x, z: center.z, houses };
  });
}

const indexKey = (i, j) => i * 1024 + j;
const bounds = (a, b, cell, pad, origin = 0) => [
  Math.floor((Math.min(a, b) - origin - pad) / cell),
  Math.floor((Math.max(a, b) - origin + pad) / cell),
];

function addToIndex(index, key, record) {
  let list = index.get(key);
  if (!list) index.set(key, (list = []));
  list.push(record);
}

export function buildCountrysidePlan(legacyHeight) {
  const knots = SIDE_ROADS.flatMap(([, , , stops]) => stops.filter((p) => typeof p === 'number')).map(km).sort((a, b) => a - b);
  const main = { id: 0, name: 'ネオン・ベイ東部幹線', half: 4.55, gravel: false, points: sampleRoute(MAIN_ANCHORS, knots) };
  main.length = roadProfile(main.points, legacyHeight);
  const roads = [main, ...SIDE_ROADS.map(([name, half, gravel, stops], i) => {
    const connection = (x) => typeof x === 'number' ? roadAtX(main, km(x)) : null;
    const anchors = stops.map((stop) => typeof stop === 'number' ? [km(stop), connection(stop).z] : stop.map(km));
    const points = sampleRoute(anchors);
    const length = roadProfile(points, legacyHeight, connection(stops[0]), connection(stops.at(-1)));
    return { id: i + 1, name, half, gravel, points, length };
  })];

  const index = new Map(), tileRoads = new Map();
  for (const road of roads) {
    for (let i = 1; i < road.points.length; i++) {
      const a = road.points[i - 1], b = road.points[i], segment = { a, b, road };
      const [i0, i1] = bounds(a.x, b.x, INDEX_CELL, 105), [j0, j1] = bounds(a.z, b.z, INDEX_CELL, 105);
      for (let u = i0; u <= i1; u++) for (let v = j0; v <= j1; v++) addToIndex(index, indexKey(u, v), segment);
      const tileX = Math.floor(((a.x + b.x) * 0.5 - JOIN_X) / TILE);
      const tileZ = Math.floor((a.z + b.z) * 0.5 / TILE);
      addToIndex(tileRoads, indexKey(tileX, tileZ), segment);
    }
  }

  function nearest(x, z, radius = 104, out = {}) {
    const segments = index.get(indexKey(Math.floor(x / INDEX_CELL), Math.floor(z / INDEX_CELL)));
    let best = radius * radius, found = false;
    for (const s of segments || []) {
      const dx = s.b.x - s.a.x, dz = s.b.z - s.a.z;
      const t = clamp(((x - s.a.x) * dx + (z - s.a.z) * dz) / (dx * dx + dz * dz), 0, 1);
      const d2 = (x - s.a.x - dx * t) ** 2 + (z - s.a.z - dz * t) ** 2;
      if (d2 >= best) continue;
      best = d2;
      out.segment = s;
      out.t = t;
      found = true;
    }
    if (!found) return null;
    out.distance = Math.sqrt(best);
    return out;
  }

  const sample = {};
  function terrain(x, z, river = riverNear(x, z)) {
    const h = naturalHeight(x, z, river);
    const road = nearest(x, z, 92, sample);
    if (!road) return h;
    const { a, b, road: line } = road.segment;
    if (river && river.distance < river.half + 13 && (a.bridge || b.bridge)) return h;
    const grade = lerp(a.y, b.y, road.t) - 0.48;
    return lerp(h, grade, smooth(90, line.half + 21, road.distance));
  }

  const hamlets = placeHouses(roads);
  const tileHouses = new Map();
  for (const hamlet of hamlets) for (const house of hamlet.houses) {
    addToIndex(tileHouses, indexKey(Math.floor((house.x - JOIN_X) / TILE), Math.floor(house.z / TILE)), house);
  }

  return { roads, hamlets, nearest, terrain, indexKey, tileRoads, tileHouses };
}
