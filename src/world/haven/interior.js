// ヘイヴン・リングの居住デッキ (約 190 m × 34 m)。通路 13 本・住戸 112 軒・商店 14 軒・設備室 12 室。
// 部屋と扉の数字はすべて plan.js / homes.js / shops.js に手で書いてあり、ここでは部屋の形に組み立てるだけ。
// 設計図: docs/haven-ring-interior.md
import { PR } from '../interior.js';
import { halls, joints, arrival, services } from './plan.js';
import { homes } from './homes.js';
import { shops } from './shops.js';

const CLEAR = 2 * PR * 1.3; // 通路と扉の内法 = プレイヤーの幅 1.3 人分 (0.91 m)

export function haven() {
  const rooms = [{ ...arrival, kind: 'service' }], doors = [['arrival', 'c1', -2.2, CLEAR, 2.12, 'slide']];
  for (const [id, name, x, z, w, d, h, tiles, lamp, lamps, lampPoints, props, win] of halls) {
    const turn = w < d ? 1.571 : 0; // 縦向きの通路では蛍光灯も縦に
    rooms.push({ id, kind: 'passage', name, x, z, w, d, h, tiles, lamp, lamps, li: 0.3, flush: true, props, win,
      lampPoints: lampPoints.map(([px, pz]) => [px, pz, turn]) });
  }
  for (const [a, b, pos, style] of joints) doors.push([a, b, pos, CLEAR, style === 'hatch' ? 2.08 : 2.16, style]);

  const side = (kind, id, name, hall, x, z, w, d, door, h, tiles, lamp, lampPoints, props, win) => {
    rooms.push({ id, kind, name, x, z, w, d, h, tiles, lamp, props, win, lampPoints,
      lamps: kind === 'shop' ? 'panel' : 'spot', li: kind === 'home' ? 0.72 : 0.78 });
    doors.push([hall, id, door, CLEAR, kind === 'home' ? 2.04 : 2.1, kind === 'home' ? 'wood' : kind === 'shop' ? 'glass' : 'slide']);
  };
  for (const [id, name, hall, x, z, w, d, door, h, tiles, lamp, lights, props, win] of homes) side('home', id, name, hall, x, z, w, d, door, h, tiles, lamp, lights, props, win);
  for (const [id, name, hall, x, z, w, d, door, h, tiles, lamp, lights, props, win] of shops) side('shop', id, name, hall, x, z, w, d, door, h, tiles, lamp, lights, props, win);
  for (const [id, name, hall, x, z, w, d, door, h, tiles, lamp, props, win] of services) side('service', id, name, hall, x, z, w, d, door, h, tiles, lamp, [[w / 2, d / 2]], props, win);

  return {
    name: 'ヘイヴン・リング', sub: '地球軌道港・居住区', seed: 317, spawn: [-3, -3, -Math.PI / 2], view: [0, 1], music: 'interior',
    reflect: false, tightPassages: true,
    theme: { wall: ['plaster', 0xd8ccb8], floor: ['grate', 0xa8a698], ceil: ['ceil', 0xe2e0d8], trim: '#f2dcb4', lamp: '#fff0d6',
      frame: 0x7a7468, door: 0xb8a284, amb: [0xf6f2ea, 0xa89a84, 1.2], cstyle: 'flat', ribs: false, trims: 'none' },
    rooms, doors,
  };
}
