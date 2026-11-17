// The ten supplied atlases follow the original sheets. Positions below are
// room-local metres. Each panel covers part of a surface or an existing prop.
import { T } from '../interior.js';

// tile, room, wall, distance along the wall, width, height, centre height
const wallPanels = [
  // Domestic finishes.
  [360, 'home-90', 'w', 2.85, 1.76, 1.54, 1.18],
  [361, 'home-98', 'e', 3.2, 1.72, 1.36, 1.32],
  [362, 'home-182', 'n', 2.56, 1.63, 1.16, 1.51],
  [363, 'home-162', 'n', 1.52, 1.91, 0.67, 1.28],
  [364, 'home-230', 'e', 2.02, 2.04, 0.67, 1.29],
  [365, 'home-256', 's', 2.57, 2.97, 1.76, 1.18],
  [366, 'home-176', 'w', 2.65, 2.06, 1.22, 0.77],
  [367, 'home-110', 'e', 2.63, 1.73, 1.31, 0.99],
  [368, 'home-100', 'w', 2.55, 1.63, 1.12, 0.88],
  // Scuffed, repaired and replaced passage liners.
  [369, 'run-1', 'n', 20.7, 2.67, 1.02, 0.56],
  [370, 'run-3', 's', 53.8, 1.56, 1.33, 0.95],
  [371, 'run-5', 's', 11.6, 1.9, 1.67, 1.13],
  [372, 'run-8', 'n', 17.8, 2.37, 1.93, 1.18],
  [373, 'run-15', 'n', 33.1, 2.09, 1.78, 1.16],
  [374, 'run-20', 'n', 33, 2.12, 1.44, 1.19],
  [375, 'return-18', 'w', 4.17, 0.93, 0.98, 0.58],
  [376, 'run-21', 'n', 22.9, 1.67, 1.4, 1.04],
  [377, 'run-23', 's', 40.2, 2.56, 1.06, 0.81],
  // Shared equipment and fittings represented on the wall.
  [409, 'home-230', 'n', 1.37, 0.85, 0.91, 1.5],
  [411, 'home-146', 's', 0.92, 0.76, 0.92, 0.58],
  [414, 'arrival', 'n', 1.47, 1.22, 1.45, 1.07],
  [416, 'run-3', 'n', 35.8, 0.57, 0.61, 1.24],
  [419, 'bypass-1-1', 'n', 11.1, 0.6, 0.72, 0.49],
  [420, 'shop-298', 'e', 1.42, 1.36, 1.2, 1.41],
  // Framed mementos and fabric hung away from pressure doors.
  [423, 'home-194', 'n', 4.65, 0.77, 0.68, 1.42],
  [424, 'service-地球側の片窓', 'w', 1.88, 0.89, 0.88, 1.59],
  [425, 'home-206', 'n', 3.65, 0.76, 0.71, 1.52],
  [426, 'home-256', 'e', 3.82, 0.63, 0.63, 1.74],
  [427, 'home-216', 'e', 1.41, 0.75, 0.75, 1.61],
  [428, 'home-204', 'e', 2.85, 0.83, 0.87, 1.47],
  [429, 'home-258', 'n', 2.6, 0.91, 0.88, 1.51],
  [430, 'home-96', 's', 4.81, 0.56, 0.56, 1.63],
  [431, 'home-130', 'e', 3.1, 0.67, 0.67, 1.57],
  [432, 'home-188', 's', 3.23, 1.19, 1.52, 1.35],
  [433, 'home-146', 'w', 3.36, 0.49, 0.66, 1.27],
  [438, 'home-230', 'w', 2.86, 0.6, 0.91, 1.49],
  [440, 'home-142', 'w', 3.19, 1.2, 1.59, 1.26],
];

// tile, room, centre x/z, width/depth, optional quarter turns about Y
const floors = [
  [378, 'home-90', 4.58, 1.64, 1.45, 2.33],
  [379, 'home-118', 2.68, 2.44, 2, 1.64],
  [380, 'home-96', 3.34, 2.58, 2.45, 1.92],
  [381, 'home-176', 2.52, 2.65, 2, 1.56],
  [382, 'home-204', 2.49, 2.36, 2.11, 1.83],
  [383, 'home-180', 2.13, 4.92, 2.47, 1.17],
  [384, 'home-104', 2.74, 0.7, 1.16, 0.7],
  [385, 'home-230', 4.12, 2.16, 1.6, 2.2],
  [386, 'home-120', 4.35, 2.87, 1.91, 1.56],
  [387, 'run-1', 29.72, 0.655, 0.9, 3.6, 1],
  [388, 'run-9', 23.63, 0.655, 0.49, 0.64],
  [389, 'bypass-21-1', 15.72, 0.655, 2.19, 0.9],
  [390, 'run-10', 18.3, 0.655, 1.14, 0.9],
  [391, 'shop-274', 3.74, 3.2, 3.07, 1.95],
  [392, 'shop-298', 2.5, 3.05, 2.28, 1.84],
  [393, 'shop-310', 6.91, 4.36, 2.63, 1.89],
  [394, 'shop-290', 2.56, 2.41, 3.35, 3.11],
  [395, 'shop-282', 5.86, 1.67, 2.71, 2.03],
];

const ceilings = [
  [396, 'home-94', 1.08, 1.75, 1.31, 1.92],
  [397, 'home-130', 4.93, 3.75, 1.2, 1.2],
  [398, 'home-92', 1.46, 3.91, 0.64, 0.64],
  [399, 'shop-274', 2.15, 3.51, 1.38, 1.36],
  [400, 'shop-298', 2.13, 3.46, 2.83, 2.34],
  [401, 'home-152', 4.85, 3.02, 1.31, 1.26],
  [402, 'run-5', 23.67, 0.655, 0.64, 0.66],
  [403, 'run-6', 19.56, 0.655, 0.94, 0.54],
  [404, 'run-24', 42.7, 0.655, 3.49, 0.88],
];

// tile, room, existing prop, face option, occurrence among props of that kind
const furniture = [
  [405, 'home-104', 'cabinet', 'frontTile'],
  [406, 'home-162', 'kitchen', 'frontTile'],
  [407, 'home-116', 'kitchen', 'topTile'],
  [408, 'home-100', 'cabinet', 'frontTile'],
  [410, 'home-184', 'havenFitting', 'frontTile'],
  [412, 'home-200', 'cabinet', 'frontTile'],
  [413, 'home-252', 'havenFitting', 'frontTile'],
  [415, 'shop-318', 'bookshelf', 'frontTile'],
  [417, 'service-リレー枝盤室', 'havenFitting', 'frontTile'],
  [418, 'shop-298', 'havenFitting', 'frontTile', 1],
  [421, 'shop-294', 'bookshelf', 'frontTile'],
  [422, 'shop-282', 'workbench', 'frontTile'],
  [434, 'home-124', 'sofa', 'topTile'],
  [435, 'home-130', 'bed', 'topTile'],
  [436, 'home-186', 'tablelong', 'topTile'],
  [437, 'home-118', 'bed', 'pillowTile'],
  [439, 'home-204', 'bunk', 'topTile'],
  [441, 'home-186', 'kitchen', 'topTile'],
  [442, 'shop-274', 'havenFitting', 'topTile'],
  [443, 'shop-294', 'havenFitting', 'topTile'],
  [444, 'shop-302', 'havenFitting', 'topTile'],
  [445, 'home-154', 'desk', 'topTile'],
  [446, 'home-122', 'workbench', 'topTile'],
  [447, 'shop-310', 'havenFitting', 'topTile'],
  [448, 'shop-318', 'havenFitting', 'topTile'],
  [449, 'shop-314', 'havenFitting', 'topTile'],
];

export function dressHaven(rooms) {
  const roomsById = new Map(rooms.map(room => [room.id, room]));
  const props = new Map();
  function propsFor(id) {
    if (!props.has(id)) {
      const room = roomsById.get(id);
      room.props = [...room.props];
      props.set(id, room.props);
    }
    return props.get(id);
  }

  for (const [tile, id, side, along, w, h, y] of wallPanels) {
    const room = roomsById.get(id);
    const [x, z, rot] = {
      n: [along, T, 0],
      s: [along, room.d - T, 2],
      w: [T, along, 1],
      e: [room.w - T, along, 3],
    }[side];
    propsFor(id).push(['havenPanel', x, z, rot, { tile, w, h, y }]);
  }

  for (const [tile, id, x, z, w, h, rot = 0] of floors) {
    propsFor(id).push(['havenPanel', x, z, rot, { tile, w, h, y: 0.004, plane: 'up' }]);
  }
  for (const [tile, id, x, z, w, h] of ceilings) {
    const y = roomsById.get(id).h - 0.004;
    propsFor(id).push(['havenPanel', x, z, 0, { tile, w, h, y, plane: 'down' }]);
  }

  for (const [tile, id, type, face, occurrence = 0] of furniture) {
    const fittings = propsFor(id);
    const prop = fittings.filter(([kind]) => kind === type)[occurrence];
    const [kind, x, z, rot, options] = prop;
    fittings[fittings.indexOf(prop)] = [kind, x, z, rot, { ...options, [face]: tile }];
  }
}
