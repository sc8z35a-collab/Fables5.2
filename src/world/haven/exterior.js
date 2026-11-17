// The inhabited quarter runs along the rim. A non-rotating dock at the hub
// transfers crew to the residential deck by a pressurized spoke.
import * as THREE from 'three';
import { mx } from '../../gfx/builder.js';
import { glow } from '../../gfx/textures.js';
import { havenMaterial } from './materials.js';

const R = 958;
export const havenRadius = 1000;
export const havenDockZ = 169;

// Independently sectioned pressure shells. Begin/end angles read around the rim.
const districts = [
  [-0.26, 0.28, 36, 0], [0.28, 0.94, 40, 3], [0.94, 1.41, 31, 7],
  [1.41, 2.18, 42, 13], [2.18, 3.06, 28, 8], [3.06, 4.09, 39, 2],
  [4.09, 5.26, 33, 17], [5.26, 2 * Math.PI - 0.26, 38, 16],
];
const spokes = [
  [0.30, 97, 929, 12, 17, 5], [1.46, 126, 941, 19, 8, 3],
  [2.78, 112, 930, 9, -18, 7], [4.16, 100, 936, 16, 26, 17],
  [5.45, 125, 928, 11, 3, 6],
];

const externalServices = [
  [17, 927, 6.6, -5, 0, 2 * Math.PI],
  [13, 965, 3, 32, -0.18, 1.34],
  [15, 961, 2.4, 35, 0.26, 0.77],
  [15, 961, 2.4, 35, 0.89, 1.20],
  [10, 933, 6, -22, 1.43, 2.21],
  [1, 956, 9, -41, 2.45, 3.13],
  [5, 954, 11, -46, 3.34, 4.02],
  [11, 967, 6, 40, 4.29, 4.91],
];

function rim(b, material, radius, tube, z, start, end, detail = 8) {
  const geometry = new THREE.TorusGeometry(radius, tube, detail, Math.ceil((end - start) * 46), end - start);
  b.add(material, geometry, mx(0, 0, z, 0, 0, start));
}

export function buildHavenHull(hub, b) {
  const surface = (id) => havenMaterial(id, 'hull');
  const ice = glow('#adf8fd', 2.8), amber = glow('#ffb46c', 2.6);
  for (const [start, end, thickness, tile] of districts) rim(b, surface(tile), R, thickness, 0, start, end, 12);
  for (const [tile, radius, tube, z, start, end] of externalServices) rim(b, surface(tile), radius, tube, z, start, end);
  rim(b, ice, 975, 1.2, 22, -0.18, 0.081);
  rim(b, ice, 976, 1, 29, 0.98, 1.37);
  rim(b, amber, 979, 1.2, -24, 3.22, 3.78);
  rim(b, ice, 976, 0.8, 12, 4.77, 5.25);

  for (const [angle, inner, outer, size, z, tile] of spokes) {
    const x = Math.cos(angle), y = Math.sin(angle), center = (outer + inner) / 2;
    b.add(surface(tile), new THREE.BoxGeometry(outer - inner, size * 2, size * 1.8), mx(x * center, y * center, z, 0, 0, angle));
    b.add(surface(7), new THREE.BoxGeometry(outer - inner - 36, 3, 4), mx(x * center - y * size, y * center + x * size, z + size, 0, 0, angle));
  }

  hub.cyl(surface(8), 133, 108, 79, 0, 0, -43, 'z', 36);
  hub.cyl(surface(0), 117, 125, 65, 0, 0, 29, 'z', 36);
  hub.cyl(surface(16), 76, 110, 32, 0, 0, 75, 'z', 28);
  hub.cyl(surface(14), 74, 74, 44, 0, 0, 110, 'z', 32);
  hub.cyl(surface(9), 32, 46, 35, 0, 0, 143, 'z', 24);
  hub.cyl(surface(6), 13, 25, 12, 0, 0, 161, 'z', 24);
  hub.tor(ice, 76, 1.3, 0, 0, 108, 0, 0, 0, 56, 6);
  hub.add(surface(12), new THREE.BoxGeometry(103, 34, 12), mx(1, 99, 77));
  hub.add(surface(6), new THREE.BoxGeometry(49, 30, 29), mx(112, -38, -30, 0, 0, -0.4));

  hub.box(surface(17), 510, 8, 12, -311, -29, -127);
  hub.box(surface(4), 182, 4, 144, -327, -22, -127);
  hub.box(surface(4), 125, 4, 144, -496, -22, -127);
  hub.add(surface(11), new THREE.BoxGeometry(375, 9, 13), mx(259, 35, -108, 0, 0, 0.24));
  hub.add(surface(4), new THREE.BoxGeometry(206, 4, 108), mx(331, 58, -109, 0, 0, 0.24));
  hub.add(surface(5), new THREE.BoxGeometry(154, 5, 75), mx(281, -181, -71, 0, 0, -0.61));
  hub.add(surface(1), new THREE.CylinderGeometry(48, 8, 20, 32, 1, true), mx(7, -21, -105, -Math.PI / 2, 0, 0));
}

function boxDistance(x, y, z, hx, hy, hz) {
  const dx = Math.abs(x) - hx, dy = Math.abs(y) - hy, dz = Math.abs(z) - hz;
  return Math.hypot(Math.max(dx, 0), Math.max(dy, 0), Math.max(dz, 0)) + Math.min(Math.max(dx, dy, dz), 0);
}

export function havenHullDistance(x, y, z, spin = 0) {
  const radial = Math.hypot(x, y), c = Math.cos(spin), s = Math.sin(spin);
  const rx = x * c + y * s, ry = y * c - x * s;
  const angle = Math.atan2(ry, rx);
  const arcDistance = (radius, tube, zz, start, end) => {
    const middle = (start + end) / 2;
    const relative = angle - middle;
    const delta = Math.abs(Math.atan2(Math.sin(relative), Math.cos(relative)));
    const miss = Math.max(delta - (end - start) / 2, 0);
    return Math.sqrt((radial - radius) ** 2 + 4 * radial * radius * Math.sin(miss / 2) ** 2 + (z - zz) ** 2) - tube;
  };
  let d = Math.min(
    Math.max(radial - 128, Math.abs(z + 9) - 73),
    Math.max(radial - 78, Math.abs(z - 104) - 28),
    Math.max(radial - 48, Math.abs(z - 149) - 20),
    boxDistance(x + 417, y + 22, z + 127, 147, 7, 72),
    boxDistance(x + 311, y + 29, z + 127, 255, 4, 6)
  );
  for (const [start, end, tube] of districts) d = Math.min(d, arcDistance(R, tube, 0, start, end));
  for (const [, radius, tube, zz, start, end] of externalServices) d = Math.min(d, arcDistance(radius, tube, zz, start, end));
  for (const [a, inner, outer, size, zz] of spokes) {
    const ca = Math.cos(a), sa = Math.sin(a);
    d = Math.min(d, boxDistance(rx * ca + ry * sa - (outer + inner) / 2, ry * ca - rx * sa, z - zz, (outer - inner) / 2, size, size * 0.9));
  }
  return Math.min(
    d,
    boxDistance((x - 259) * 0.97134 + (y - 35) * 0.23770, (y - 35) * 0.97134 - (x - 259) * 0.23770, z + 108, 187.5, 4.5, 6.5),
    boxDistance((x - 331) * 0.97134 + (y - 58) * 0.23770, (y - 58) * 0.97134 - (x - 331) * 0.23770, z + 109, 103, 2, 54),
    boxDistance((x - 281) * 0.81965 - (y + 181) * 0.57287, (y + 181) * 0.81965 + (x - 281) * 0.57287, z + 71, 77, 2.5, 37.5)
  );
}
